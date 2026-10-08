import { Pool, PoolClient } from "pg";

export interface WaitlistVariantRow {
  id: number;
  price: string;
  stock_quantity: number;
  availability_status: string;
  can_join_waitlist: boolean;
}

export interface WaitlistEntryRow {
  id: string;
  product_variant_id: number;
  user_id: number;
  queue_position: string;
  status: "WAITING" | "OFFERED" | "CONVERTED" | "EXPIRED" | "CANCELLED";
  claim_token: string | null;
  offer_expires_at: Date | null;
  offered_at: Date | null;
  offer_is_valid?: boolean;
  created_at?: Date;
}

export interface WaitlistNotificationRow {
  outbox_id: string;
  waitlist_id: string;
  full_name: string;
  email: string | null;
  line_user_id: string | null;
  product_variant_id: number;
  price: string;
  claim_token: string;
  offer_expires_at: Date;
  attempts: number;
}

export class WaitlistRepository {
  constructor(readonly pool: Pool) {}

  async lockVariant(
    client: PoolClient,
    productVariantId: number,
  ): Promise<WaitlistVariantRow | null> {
    const result = await client.query<WaitlistVariantRow>(
      `SELECT
         variant.id,
         variant.price,
         variant.stock_quantity,
         variant.availability_status,
         (
           variant.stock_quantity <= 0
           OR variant.availability_status IN ('OUT_OF_STOCK', 'PREORDER_CLOSED')
           OR EXISTS (
             SELECT 1
             FROM preorders AS preorder
             WHERE preorder.product_variant_id = variant.id
               AND (
                 CURRENT_TIMESTAMP > preorder.end_date
                 OR (
                   preorder.preorder_deadline IS NOT NULL
                   AND CURRENT_TIMESTAMP >= preorder.preorder_deadline
                 )
                 OR (
                   preorder.quota_limit IS NOT NULL
                   AND preorder.booked_count >= preorder.quota_limit
                 )
               )
           )
         ) AS can_join_waitlist
       FROM product_variants AS variant
       WHERE variant.id = $1
       FOR UPDATE OF variant`,
      [productVariantId],
    );
    return result.rows[0] ?? null;
  }

  async addWaitingEntry(
    client: PoolClient,
    productVariantId: number,
    userId: number,
  ): Promise<WaitlistEntryRow | null> {
    const result = await client.query<WaitlistEntryRow>(
      `WITH next_position AS (
         SELECT COALESCE(MAX(queue_position), 0) + 1 AS position
         FROM product_waitlists
         WHERE product_variant_id = $1
       )
       INSERT INTO product_waitlists (
         product_variant_id,
         user_id,
         queue_position,
         status
       )
       SELECT $1, $2, next_position.position, 'WAITING'
       FROM next_position
       ON CONFLICT (product_variant_id, user_id) DO NOTHING
       RETURNING
         id::text,
         product_variant_id,
         user_id,
         queue_position::text,
         status,
         claim_token::text,
         offer_expires_at,
         offered_at,
         created_at`,
      [productVariantId, userId],
    );
    return result.rows[0] ?? null;
  }

  async getEntryByIdForUpdate(
    client: PoolClient,
    waitlistId: string,
  ): Promise<WaitlistEntryRow | null> {
    const result = await client.query<WaitlistEntryRow>(
      `SELECT
         id::text,
         product_variant_id,
         user_id,
         queue_position::text,
         status,
         claim_token::text,
         offer_expires_at,
         offered_at,
         offer_expires_at > CURRENT_TIMESTAMP AS offer_is_valid
       FROM product_waitlists
       WHERE id = $1
       FOR UPDATE`,
      [waitlistId],
    );
    return result.rows[0] ?? null;
  }

  async findVariantIdForClaimToken(token: string): Promise<number | null> {
    const result = await this.pool.query<{ product_variant_id: number }>(
      `SELECT product_variant_id
       FROM product_waitlists
       WHERE claim_token = $1
         AND status = 'OFFERED'`,
      [token],
    );
    return result.rows[0]?.product_variant_id ?? null;
  }

  async getEntryByClaimTokenForUpdate(
    client: PoolClient,
    token: string,
  ): Promise<WaitlistEntryRow | null> {
    const result = await client.query<WaitlistEntryRow>(
      `SELECT
         id::text,
         product_variant_id,
         user_id,
         queue_position::text,
         status,
         claim_token::text,
         offer_expires_at,
         offered_at,
         created_at,
         offer_expires_at > CURRENT_TIMESTAMP AS offer_is_valid
       FROM product_waitlists
       WHERE claim_token = $1
       FOR UPDATE`,
      [token],
    );
    return result.rows[0] ?? null;
  }

  async takeNextWaitingEntry(
    client: PoolClient,
    productVariantId: number,
  ): Promise<WaitlistEntryRow | null> {
    const result = await client.query<WaitlistEntryRow>(
      `SELECT
         id::text,
         product_variant_id,
         user_id,
         queue_position::text,
         status,
         claim_token::text,
         offer_expires_at,
         offered_at,
         created_at
       FROM product_waitlists
       WHERE product_variant_id = $1
         AND status = 'WAITING'
       ORDER BY created_at, id
       LIMIT 1
       FOR UPDATE SKIP LOCKED`,
      [productVariantId],
    );
    return result.rows[0] ?? null;
  }

  async offerEntry(
    client: PoolClient,
    waitlistId: string,
    claimToken: string,
  ): Promise<WaitlistEntryRow> {
    const result = await client.query<WaitlistEntryRow>(
      `UPDATE product_waitlists
       SET status = 'OFFERED',
           claim_token = $2,
           offered_at = CURRENT_TIMESTAMP,
           offer_expires_at = CURRENT_TIMESTAMP + INTERVAL '24 hours'
       WHERE id = $1
         AND status = 'WAITING'
       RETURNING
         id::text,
         product_variant_id,
         user_id,
         queue_position::text,
         status,
         claim_token::text,
         offer_expires_at,
         offered_at`,
      [waitlistId, claimToken],
    );
    const entry = result.rows[0];
    if (!entry) {
      throw new Error(`Waitlist entry ${waitlistId} could not be offered.`);
    }

    await client.query(
      `INSERT INTO waitlist_notification_outbox (waitlist_id)
       VALUES ($1)
       ON CONFLICT (waitlist_id) DO NOTHING`,
      [waitlistId],
    );
    return entry;
  }

  async getExpiredOfferIds(
    client: PoolClient,
    batchSize: number,
  ): Promise<Array<{ id: string; product_variant_id: number }>> {
    const result = await client.query<{ id: string; product_variant_id: number }>(
      `SELECT id::text, product_variant_id
       FROM product_waitlists
       WHERE status = 'OFFERED'
         AND offer_expires_at <= CURRENT_TIMESTAMP
       ORDER BY product_variant_id, offer_expires_at, id
       LIMIT $1`,
      [batchSize],
    );
    return result.rows;
  }

  async getDueNotifications(
    client: PoolClient,
    batchSize: number,
  ): Promise<WaitlistNotificationRow[]> {
    const result = await client.query<WaitlistNotificationRow>(
      `SELECT
         outbox.id::text AS outbox_id,
         entry.id::text AS waitlist_id,
         customer.full_name,
         customer.email,
         customer.line_user_id,
         entry.product_variant_id,
         COALESCE(preorder.full_price, variant.price)::text AS price,
         entry.claim_token::text AS claim_token,
         entry.offer_expires_at,
         outbox.attempts
       FROM waitlist_notification_outbox AS outbox
       INNER JOIN product_waitlists AS entry
         ON entry.id = outbox.waitlist_id
       INNER JOIN users AS customer
         ON customer.id = entry.user_id
       INNER JOIN product_variants AS variant
         ON variant.id = entry.product_variant_id
       LEFT JOIN preorders AS preorder
         ON preorder.product_variant_id = variant.id
       WHERE entry.status = 'OFFERED'
         AND entry.offer_expires_at > CURRENT_TIMESTAMP
         AND (
           (outbox.status = 'PENDING' AND outbox.next_attempt_at <= CURRENT_TIMESTAMP)
           OR
           (outbox.status = 'PROCESSING' AND outbox.locked_until <= CURRENT_TIMESTAMP)
         )
       ORDER BY outbox.next_attempt_at, outbox.id
       LIMIT $1
       FOR UPDATE OF outbox SKIP LOCKED`,
      [batchSize],
    );
    return result.rows;
  }
}

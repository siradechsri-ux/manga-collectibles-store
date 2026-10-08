import { randomUUID } from "node:crypto";
import { Pool, PoolClient } from "pg";
import { z } from "zod";
import {
  WaitlistEntryRow,
  WaitlistRepository,
} from "./waitlist.repository";

const positiveIdSchema = z.number().int().positive().safe();

export const claimWaitlistSchema = z
  .object({
    claimToken: z.string().uuid(),
    carrier: z.enum(["FLASH", "THAI_POST"]),
    serviceAreaCode: z.string().trim().min(1).max(50),
    shippingPolicy: z.string().trim().min(1).max(100),
  })
  .strict();

export type ClaimWaitlistInput = z.infer<typeof claimWaitlistSchema>;

export interface JoinWaitlistResponse {
  waitlistId: string;
  productVariantId: number;
  queuePosition: string;
  status: "WAITING";
  createdAt: string;
}

export interface ClaimWaitlistResponse {
  waitlistId: string;
  orderId: string;
  orderNumber: string;
  productVariantId: number;
  quantity: 1;
  unitPrice: string;
  shippingFee: string;
  totalAmount: string;
  paymentStatus: "UNPAID";
  orderStatus: "pending";
}

export interface WaitlistMaintenanceResponse {
  expiredOffers: number;
  reofferedUnits: number;
  releasedUnitsToPublicStock: number;
}

export interface WaitlistOfferNotice {
  waitlistId: string;
  productVariantId: number;
  customerName: string;
  customerEmail: string | null;
  lineUserId: string | null;
  price: string;
  claimUrl: string;
  expiresAt: string;
}

export interface WaitlistOfferNotifier {
  sendWaitlistOffer(notice: WaitlistOfferNotice): Promise<void>;
}

export class WaitlistError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidWaitlistRequestError extends WaitlistError {
  constructor(message: string) {
    super(400, "INVALID_WAITLIST_REQUEST", message);
  }
}

export class WaitlistProductNotFoundError extends WaitlistError {
  constructor(productVariantId: number) {
    super(404, "PRODUCT_NOT_FOUND", `ไม่พบสินค้า variant ${productVariantId}`);
  }
}

export class WaitlistNotEligibleError extends WaitlistError {
  constructor() {
    super(
      409,
      "WAITLIST_NOT_AVAILABLE",
      "สินค้านี้ยังเปิดพรีออเดอร์หรือมีสินค้าพร้อมส่ง จึงยังไม่เปิดคิวของหลุดจอง",
    );
  }
}

export class AlreadyJoinedWaitlistError extends WaitlistError {
  constructor() {
    super(409, "ALREADY_JOINED_WAITLIST", "คุณลงชื่อรอสินค้ารุ่นนี้ไปแล้ว");
  }
}

export class WaitlistEntryNotFoundError extends WaitlistError {
  constructor() {
    super(404, "WAITLIST_ENTRY_NOT_FOUND", "ไม่พบสิทธิ์หรือรายการคิวนี้");
  }
}

export class WaitlistOfferUnavailableError extends WaitlistError {
  constructor(message = "สิทธิ์รับซื้อหมดอายุหรือไม่พร้อมใช้งานแล้ว") {
    super(409, "WAITLIST_OFFER_UNAVAILABLE", message);
  }
}

export class WaitlistOfferNotOwnedError extends WaitlistError {
  constructor() {
    super(404, "WAITLIST_ENTRY_NOT_FOUND", "ไม่พบสิทธิ์หรือรายการคิวนี้");
  }
}

export class WaitlistShippingRateError extends WaitlistError {
  constructor() {
    super(422, "WAITLIST_SHIPPING_RATE_NOT_FOUND", "ไม่พบเรตค่าจัดส่งสำหรับรายการนี้");
  }
}

export class WaitlistShippingDataError extends WaitlistError {
  constructor(productVariantId: number) {
    super(
      422,
      "WAITLIST_SHIPPING_DATA_INVALID",
      `ข้อมูลน้ำหนักหรือขนาดกล่องของสินค้า ${productVariantId} ไม่ครบถ้วน`,
    );
  }
}

interface ClaimFigureRow {
  id: number;
  full_price: string;
  actual_weight_kg: string | null;
  box_width_cm: string | null;
  box_length_cm: string | null;
  box_height_cm: string | null;
}

interface ShippingRateRow {
  shipping_fee: string;
}

interface CreatedOrderRow {
  id: string;
}

interface NotificationOutboxRow {
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

function parsePositiveId(value: number, field: string): number {
  const parsed = positiveIdSchema.safeParse(value);
  if (!parsed.success) {
    throw new InvalidWaitlistRequestError(`${field} ต้องเป็นจำนวนเต็มบวก`);
  }
  return parsed.data;
}

function amountToCents(value: string): bigint {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) {
    throw new WaitlistError(500, "INVALID_DATABASE_AMOUNT", "ข้อมูลราคาสินค้าไม่ถูกต้อง");
  }
  return BigInt(match[1]) * 100n + BigInt((match[2] ?? "").padEnd(2, "0") || "0");
}

function centsToAmount(cents: bigint): string {
  return `${cents / 100n}.${String(cents % 100n).padStart(2, "0")}`;
}

function positiveDatabaseNumber(
  value: string | null,
  productVariantId: number,
): number {
  const parsed = value === null ? Number.NaN : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new WaitlistShippingDataError(productVariantId);
  }
  return parsed;
}

function calculateBillableWeightKg(
  actualWeightKg: number,
  widthCm: number,
  lengthCm: number,
  heightCm: number,
): number {
  return Math.max(actualWeightKg, (widthCm * lengthCm * heightCm) / 5_000);
}

async function beginTransaction(client: PoolClient): Promise<void> {
  await client.query("BEGIN");
}

async function rollbackTransaction(client: PoolClient, started: boolean): Promise<void> {
  if (!started) {
    return;
  }
  try {
    await client.query("ROLLBACK");
  } catch (rollbackError) {
    console.error("Failed to roll back waitlist transaction.", rollbackError);
  }
}

export class WaitlistService {
  constructor(private readonly repository: WaitlistRepository) {}

  async joinWaitlist(userIdInput: number, productVariantIdInput: number): Promise<JoinWaitlistResponse> {
    const userId = parsePositiveId(userIdInput, "userId");
    const productVariantId = parsePositiveId(productVariantIdInput, "productVariantId");
    const client = await this.repository.pool.connect();
    let transactionStarted = false;

    try {
      await beginTransaction(client);
      transactionStarted = true;
      const variant = await this.repository.lockVariant(client, productVariantId);
      if (!variant) {
        throw new WaitlistProductNotFoundError(productVariantId);
      }
      if (!variant.can_join_waitlist) {
        throw new WaitlistNotEligibleError();
      }

      const entry = await this.repository.addWaitingEntry(client, productVariantId, userId);
      if (!entry) {
        throw new AlreadyJoinedWaitlistError();
      }
      if (!entry.created_at) {
        throw new Error("Database did not return the waitlist creation timestamp.");
      }

      await client.query("COMMIT");
      transactionStarted = false;
      return {
        waitlistId: entry.id,
        productVariantId,
        queuePosition: entry.queue_position,
        status: "WAITING",
        createdAt: entry.created_at.toISOString(),
      };
    } catch (error) {
      await rollbackTransaction(client, transactionStarted);
      throw error;
    } finally {
      client.release();
    }
  }

  async releaseForfeitedStock(
    client: PoolClient,
    productVariantIdInput: number,
    quantityInput: number,
  ): Promise<{ offeredUnits: number; publicStockUnits: number }> {
    const productVariantId = parsePositiveId(productVariantIdInput, "productVariantId");
    if (!Number.isSafeInteger(quantityInput) || quantityInput < 1) {
      throw new InvalidWaitlistRequestError("จำนวนสินค้าที่คืนต้องเป็นจำนวนเต็มบวก");
    }

    const variant = await this.repository.lockVariant(client, productVariantId);
    if (!variant) {
      throw new WaitlistProductNotFoundError(productVariantId);
    }
    await client.query(
      `UPDATE product_variants
       SET stock_quantity = stock_quantity + $2,
           availability_status = 'IN_STOCK'
       WHERE id = $1`,
      [productVariantId, quantityInput],
    );

    let offeredUnits = 0;
    for (let unit = 0; unit < quantityInput; unit += 1) {
      const waitingEntry = await this.repository.takeNextWaitingEntry(client, productVariantId);
      if (!waitingEntry) {
        break;
      }

      const stockUpdate = await client.query(
        `UPDATE product_variants
         SET stock_quantity = stock_quantity - 1,
             availability_status = CASE
               WHEN stock_quantity - 1 > 0 THEN 'IN_STOCK'
               ELSE 'OUT_OF_STOCK'
             END
         WHERE id = $1
           AND stock_quantity > 0`,
        [productVariantId],
      );
      if (stockUpdate.rowCount !== 1) {
        throw new Error(`Released inventory for variant ${productVariantId} was not available.`);
      }

      await this.repository.offerEntry(client, waitingEntry.id, randomUUID());
      offeredUnits += 1;
    }

    const remaining = await client.query<{ stock_quantity: number }>(
      `UPDATE product_variants
       SET availability_status = CASE
         WHEN stock_quantity > 0 THEN 'IN_STOCK'
         ELSE 'OUT_OF_STOCK'
       END
       WHERE id = $1
       RETURNING stock_quantity`,
      [productVariantId],
    );
    return {
      offeredUnits,
      publicStockUnits: remaining.rows[0]?.stock_quantity ?? 0,
    };
  }

  async claimOffer(
    userIdInput: number,
    rawInput: unknown,
  ): Promise<ClaimWaitlistResponse> {
    const userId = parsePositiveId(userIdInput, "userId");
    const parsed = claimWaitlistSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new InvalidWaitlistRequestError(
        parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "),
      );
    }
    const input = parsed.data;
    const variantId = await this.repository.findVariantIdForClaimToken(input.claimToken);
    if (variantId === null) {
      throw new WaitlistEntryNotFoundError();
    }

    const client = await this.repository.pool.connect();
    let transactionStarted = false;
    try {
      await beginTransaction(client);
      transactionStarted = true;
      const variant = await this.repository.lockVariant(client, variantId);
      if (!variant) {
        throw new WaitlistProductNotFoundError(variantId);
      }
      const entry = await this.repository.getEntryByClaimTokenForUpdate(
        client,
        input.claimToken,
      );
      this.assertClaimable(entry, userId);
      const lockedEntry = entry;

      const figureResult = await client.query<ClaimFigureRow>(
        `SELECT
           variant.id,
           COALESCE(preorder.full_price, variant.price)::text AS full_price,
           figure.actual_weight_kg::text AS actual_weight_kg,
           figure.box_width_cm::text AS box_width_cm,
           figure.box_length_cm::text AS box_length_cm,
           figure.box_height_cm::text AS box_height_cm
         FROM product_variants AS variant
         INNER JOIN figures_metadata AS figure
           ON figure.product_id = variant.product_id
         LEFT JOIN preorders AS preorder
           ON preorder.product_variant_id = variant.id
         WHERE variant.id = $1
         FOR UPDATE OF variant, figure`,
        [variantId],
      );
      const figure = figureResult.rows[0];
      if (!figure) {
        throw new WaitlistProductNotFoundError(variantId);
      }

      const actualWeightKg = positiveDatabaseNumber(figure.actual_weight_kg, variantId);
      const widthCm = positiveDatabaseNumber(figure.box_width_cm, variantId);
      const lengthCm = positiveDatabaseNumber(figure.box_length_cm, variantId);
      const heightCm = positiveDatabaseNumber(figure.box_height_cm, variantId);
      const billableWeightKg = calculateBillableWeightKg(
        actualWeightKg,
        widthCm,
        lengthCm,
        heightCm,
      );
      if (!Number.isFinite(billableWeightKg)) {
        throw new WaitlistShippingDataError(variantId);
      }

      const shippingResult = await client.query<ShippingRateRow>(
        `SELECT shipping_fee::text
         FROM shipping_rates
         WHERE carrier = $1
           AND service_area_code = $2
           AND is_active = TRUE
           AND effective_from <= CURRENT_TIMESTAMP
           AND (effective_until IS NULL OR CURRENT_TIMESTAMP < effective_until)
           AND min_billable_weight_kg <= $3
           AND (max_billable_weight_kg IS NULL OR $3 < max_billable_weight_kg)
         FOR SHARE`,
        [input.carrier, input.serviceAreaCode, billableWeightKg],
      );
      if (shippingResult.rowCount !== 1) {
        throw new WaitlistShippingRateError();
      }

      const priceCents = amountToCents(figure.full_price);
      const shippingCents = amountToCents(shippingResult.rows[0].shipping_fee);
      const totalCents = priceCents + shippingCents;
      const orderNumber = `WAI-${randomUUID()}`;
      const totalAmount = centsToAmount(totalCents);
      const orderResult = await client.query<CreatedOrderRow>(
        `INSERT INTO orders (
           user_id,
           order_number,
           total_amount,
           shipping_fee,
           shipping_policy,
           order_status,
           payment_status,
           payment_type,
           amount_due_now,
           remaining_balance,
           balance_paid_status,
           balance_due_date,
           immediate_amount,
           remaining_balance_amount,
           settlement_status
         )
         VALUES ($1, $2, $3, $4, $5, 'pending', 'UNPAID', 'FULL', $3, 0, 'PAID', NULL, $3, 0, 'NOT_REQUIRED')
         RETURNING id::text`,
        [
          userId,
          orderNumber,
          totalAmount,
          centsToAmount(shippingCents),
          `${input.shippingPolicy}:${input.carrier}:${input.serviceAreaCode}`,
        ],
      );
      const order = orderResult.rows[0];
      if (!order) {
        throw new Error("Database did not return the waitlist order.");
      }

      await client.query(
        `INSERT INTO order_items (
           order_id,
           product_variant_id,
           quantity,
           unit_price,
           is_preorder,
           payment_type,
           remaining_balance,
           balance_paid_status,
           balance_due_date,
           balance_amount,
           settlement_status
         )
         VALUES ($1, $2, 1, $3, FALSE, 'FULL', 0, 'PAID', NULL, 0, 'NOT_REQUIRED')`,
        [order.id, variantId, centsToAmount(priceCents)],
      );

      await client.query(
        `UPDATE product_waitlists
         SET status = 'CONVERTED',
             claim_token = NULL,
             offer_expires_at = NULL,
             converted_at = CURRENT_TIMESTAMP
         WHERE id = $1
           AND status = 'OFFERED'`,
        [lockedEntry.id],
      );
      await client.query(
        `UPDATE waitlist_notification_outbox
         SET status = 'CANCELLED',
             locked_until = NULL
         WHERE waitlist_id = $1
           AND status <> 'SENT'`,
        [lockedEntry.id],
      );

      await client.query("COMMIT");
      transactionStarted = false;
      return {
        waitlistId: lockedEntry.id,
        orderId: order.id,
        orderNumber,
        productVariantId: variantId,
        quantity: 1,
        unitPrice: centsToAmount(priceCents),
        shippingFee: centsToAmount(shippingCents),
        totalAmount,
        paymentStatus: "UNPAID",
        orderStatus: "pending",
      };
    } catch (error) {
      await rollbackTransaction(client, transactionStarted);
      throw error;
    } finally {
      client.release();
    }
  }

  async cancelEntry(
    userIdInput: number,
    waitlistIdInput: string,
  ): Promise<{ waitlistId: string; status: "CANCELLED" }> {
    const userId = parsePositiveId(userIdInput, "userId");
    const waitlistId = z.string().regex(/^[1-9]\d*$/).safeParse(waitlistIdInput);
    if (!waitlistId.success) {
      throw new InvalidWaitlistRequestError("หมายเลขคิวไม่ถูกต้อง");
    }

    const initial = await this.repository.pool.query<{ product_variant_id: number }>(
      `SELECT product_variant_id
       FROM product_waitlists
       WHERE id = $1`,
      [waitlistId.data],
    );
    const variantId = initial.rows[0]?.product_variant_id;
    if (!variantId) {
      throw new WaitlistEntryNotFoundError();
    }

    const client = await this.repository.pool.connect();
    let transactionStarted = false;
    try {
      await beginTransaction(client);
      transactionStarted = true;
      await this.repository.lockVariant(client, variantId);
      const entry = await this.repository.getEntryByIdForUpdate(client, waitlistId.data);
      if (!entry || entry.user_id !== userId) {
        throw new WaitlistOfferNotOwnedError();
      }
      if (entry.status !== "WAITING" && entry.status !== "OFFERED") {
        throw new WaitlistOfferUnavailableError("รายการคิวนี้ไม่สามารถยกเลิกได้แล้ว");
      }

      await client.query(
        `UPDATE product_waitlists
         SET status = 'CANCELLED',
             claim_token = NULL,
             offer_expires_at = NULL
         WHERE id = $1`,
        [entry.id],
      );
      await client.query(
        `UPDATE waitlist_notification_outbox
         SET status = 'CANCELLED',
             locked_until = NULL
         WHERE waitlist_id = $1
           AND status <> 'SENT'`,
        [entry.id],
      );
      if (entry.status === "OFFERED") {
        await this.reallocateHeldUnit(client, variantId);
      }
      await client.query("COMMIT");
      transactionStarted = false;
      return { waitlistId: entry.id, status: "CANCELLED" };
    } catch (error) {
      await rollbackTransaction(client, transactionStarted);
      throw error;
    } finally {
      client.release();
    }
  }

  async expireOffers(batchSize = 100): Promise<WaitlistMaintenanceResponse> {
    if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 1_000) {
      throw new InvalidWaitlistRequestError("batchSize ต้องอยู่ระหว่าง 1 ถึง 1000");
    }
    const client = await this.repository.pool.connect();
    let transactionStarted = false;
    try {
      await beginTransaction(client);
      transactionStarted = true;
      const candidates = await this.repository.getExpiredOfferIds(client, batchSize);
      let expiredOffers = 0;
      let reofferedUnits = 0;
      let releasedUnitsToPublicStock = 0;

      for (const candidate of candidates) {
        await this.repository.lockVariant(client, candidate.product_variant_id);
        const entry = await this.repository.getEntryByIdForUpdate(client, candidate.id);
        if (
            !entry ||
            entry.status !== "OFFERED" ||
            !entry.offer_expires_at ||
            entry.offer_is_valid !== false
        ) {
          continue;
        }
        await client.query(
          `UPDATE product_waitlists
           SET status = 'EXPIRED',
               claim_token = NULL,
               offer_expires_at = NULL
           WHERE id = $1
             AND status = 'OFFERED'`,
          [entry.id],
        );
        await client.query(
          `UPDATE waitlist_notification_outbox
           SET status = 'CANCELLED',
               locked_until = NULL
           WHERE waitlist_id = $1
             AND status <> 'SENT'`,
          [entry.id],
        );
        expiredOffers += 1;
        const disposition = await this.reallocateHeldUnit(
          client,
          candidate.product_variant_id,
        );
        if (disposition === "OFFERED") {
          reofferedUnits += 1;
        } else {
          releasedUnitsToPublicStock += 1;
        }
      }

      await client.query("COMMIT");
      transactionStarted = false;
      return { expiredOffers, reofferedUnits, releasedUnitsToPublicStock };
    } catch (error) {
      await rollbackTransaction(client, transactionStarted);
      throw error;
    } finally {
      client.release();
    }
  }

  async deliverPendingNotifications(
    notifier: WaitlistOfferNotifier,
    applicationBaseUrl: string,
    batchSize = 100,
  ): Promise<{ sent: number; failed: number }> {
    if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 1_000) {
      throw new InvalidWaitlistRequestError("batchSize ต้องอยู่ระหว่าง 1 ถึง 1000");
    }
    const baseUrl = new URL(applicationBaseUrl);
    if (baseUrl.protocol !== "https:" && baseUrl.hostname !== "localhost") {
      throw new TypeError("Waitlist application URL must use HTTPS outside localhost.");
    }

    const client = await this.repository.pool.connect();
    let transactionStarted = false;
    let notifications: NotificationOutboxRow[] = [];
    try {
      await beginTransaction(client);
      transactionStarted = true;
      notifications = await this.repository.getDueNotifications(client, batchSize);
      for (const notification of notifications) {
        await client.query(
          `UPDATE waitlist_notification_outbox
           SET status = 'PROCESSING',
               attempts = attempts + 1,
               locked_until = CURRENT_TIMESTAMP + INTERVAL '5 minutes',
               last_error = NULL
           WHERE id = $1`,
          [notification.outbox_id],
        );
      }
      await client.query("COMMIT");
      transactionStarted = false;
    } catch (error) {
      await rollbackTransaction(client, transactionStarted);
      throw error;
    } finally {
      client.release();
    }

    let sent = 0;
    let failed = 0;
    for (const notification of notifications) {
      try {
        const claimUrl = new URL("/waitlist/claim", baseUrl);
        claimUrl.searchParams.set("token", notification.claim_token);
        await notifier.sendWaitlistOffer({
          waitlistId: notification.waitlist_id,
          productVariantId: notification.product_variant_id,
          customerName: notification.full_name,
          customerEmail: notification.email,
          lineUserId: notification.line_user_id,
          price: notification.price,
          claimUrl: claimUrl.toString(),
          expiresAt: notification.offer_expires_at.toISOString(),
        });
        const update = await this.repository.pool.query(
          `UPDATE waitlist_notification_outbox
           SET status = 'SENT',
               sent_at = CURRENT_TIMESTAMP,
               locked_until = NULL,
               last_error = NULL
           WHERE id = $1
             AND status = 'PROCESSING'`,
          [notification.outbox_id],
        );
        if (update.rowCount !== 1) {
          throw new Error(`Waitlist notification ${notification.outbox_id} was not marked sent.`);
        }
        sent += 1;
      } catch (error) {
        failed += 1;
        const attempts = notification.attempts + 1;
        const backoffSeconds = Math.min(3_600, 30 * 2 ** Math.min(attempts - 1, 7));
        const message =
          error instanceof Error ? error.message.slice(0, 2_000) : "Unknown notification error";
        await this.repository.pool.query(
          `UPDATE waitlist_notification_outbox
           SET status = 'PENDING',
               next_attempt_at = CURRENT_TIMESTAMP + ($2 * INTERVAL '1 second'),
               locked_until = NULL,
               last_error = $3
           WHERE id = $1
             AND status = 'PROCESSING'`,
          [notification.outbox_id, backoffSeconds, message],
        );
        console.error("Waitlist offer notification delivery failed.", {
          waitlistId: notification.waitlist_id,
          error,
        });
      }
    }
    return { sent, failed };
  }

  private assertClaimable(entry: WaitlistEntryRow | null, userId: number): asserts entry is WaitlistEntryRow {
    if (!entry) {
      throw new WaitlistEntryNotFoundError();
    }
    if (entry.user_id !== userId) {
      throw new WaitlistOfferNotOwnedError();
    }
    if (
      entry.status !== "OFFERED" ||
      !entry.offer_expires_at ||
      entry.offer_is_valid !== true
    ) {
      throw new WaitlistOfferUnavailableError();
    }
  }

  private async reallocateHeldUnit(
    client: PoolClient,
    productVariantId: number,
  ): Promise<"OFFERED" | "PUBLIC"> {
    const nextEntry = await this.repository.takeNextWaitingEntry(client, productVariantId);
    if (nextEntry) {
      await this.repository.offerEntry(client, nextEntry.id, randomUUID());
      return "OFFERED";
    }
    await client.query(
      `UPDATE product_variants
       SET stock_quantity = stock_quantity + 1,
           availability_status = 'IN_STOCK'
       WHERE id = $1`,
      [productVariantId],
    );
    return "PUBLIC";
  }
}

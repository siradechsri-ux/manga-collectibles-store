import { Pool } from "pg";
import { WaitlistRepository } from "./waitlist.repository";
import { WaitlistService } from "./waitlist.service";

export interface MarkFigureArrivedResponse {
  productVariantId: number;
  warehouseStatus: "ARRIVED_IN_WAREHOUSE";
  arrivedAt: string;
  balanceDueDate: string | null;
  affectedOrders: number;
  affectedOrderItems: number;
}

export interface SettleOrderBalanceResponse {
  orderId: number;
  paymentStatus: "PAID";
  settlementStatus: "READY_TO_PACK";
  settledAmount: string;
  paymentReference: string;
  alreadySettled: boolean;
}

export interface ExpiredBalanceSettlementResponse {
  processedOrders: number;
  forfeitedItems: number;
  releasedQuotaUnits: number;
}

interface ArrivedFigureRow {
  arrived_at: Date;
}

interface AffectedOrderRow {
  order_id: number;
  balance_due_date: Date | null;
  remaining_balance_amount: string;
  all_balances_awaiting: boolean;
  deadline_passed: boolean;
}

interface LockedOrderRow {
  id: number;
  user_id: number;
  remaining_balance_amount: string;
  balance_due_date: Date | null;
  payment_status: string;
  settlement_status: string;
  balance_payment_reference: string | null;
  all_balances_awaiting: boolean;
}

interface ExpiredOrderRow {
  id: number;
}

interface ForfeitedItemRow {
  product_variant_id: number;
  quantity: number;
}

interface QuotaReleaseRow {
  product_variant_id: number;
  released_quantity: string;
}

export class BalanceSettlementError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidBalanceSettlementRequestError extends BalanceSettlementError {
  constructor(message: string) {
    super(400, "INVALID_SETTLEMENT_REQUEST", message);
  }
}

export class FigureVariantNotFoundError extends BalanceSettlementError {
  constructor(variantId: number) {
    super(404, "FIGURE_VARIANT_NOT_FOUND", `ไม่พบ Figure variant ${variantId}`);
  }
}

export class OrderNotFoundError extends BalanceSettlementError {
  constructor() {
    super(404, "ORDER_NOT_FOUND", "ไม่พบคำสั่งซื้อ");
  }
}

export class OrderNotOwnedError extends BalanceSettlementError {
  constructor() {
    super(404, "ORDER_NOT_FOUND", "ไม่พบคำสั่งซื้อ");
  }
}

export class BalanceNotReadyError extends BalanceSettlementError {
  constructor(message: string) {
    super(409, "BALANCE_NOT_READY", message);
  }
}

export class BalanceDeadlinePassedError extends BalanceSettlementError {
  constructor() {
    super(409, "BALANCE_DEADLINE_PASSED", "เลยกำหนดชำระยอดคงเหลือแล้ว");
  }
}

export class BalancePaymentNotVerifiedError extends BalanceSettlementError {
  constructor() {
    super(402, "BALANCE_PAYMENT_NOT_VERIFIED", "ยังไม่ได้รับการยืนยันการชำระเงิน");
  }
}

export class BalancePaymentAmountMismatchError extends BalanceSettlementError {
  constructor() {
    super(
      409,
      "BALANCE_PAYMENT_AMOUNT_MISMATCH",
      "ยอดชำระที่ยืนยันจากผู้ให้บริการไม่ตรงกับยอดค้างชำระ",
    );
  }
}

export class BalancePaymentReferenceConflictError extends BalanceSettlementError {
  constructor() {
    super(
      409,
      "BALANCE_PAYMENT_REFERENCE_CONFLICT",
      "เลขอ้างอิงธุรกรรมนี้ถูกใช้กับคำสั่งซื้ออื่นแล้ว",
    );
  }
}

function amountToCents(value: string): bigint {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) {
    throw new BalanceSettlementError(
      500,
      "INVALID_DATABASE_AMOUNT",
      "ยอดเงินในฐานข้อมูลไม่ถูกต้อง",
    );
  }
  return BigInt(match[1]) * 100n + BigInt((match[2] ?? "").padEnd(2, "0") || "0");
}

function centsToAmount(cents: bigint): string {
  return `${cents / 100n}.${String(cents % 100n).padStart(2, "0")}`;
}

function validatePositiveId(id: number, fieldName: string): void {
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new InvalidBalanceSettlementRequestError(`${fieldName} ไม่ถูกต้อง`);
  }
}

export class BalanceSettlementService {
  private readonly waitlistService: WaitlistService;

  constructor(
    private readonly pool: Pool,
    waitlistService?: WaitlistService,
  ) {
    this.waitlistService =
      waitlistService ?? new WaitlistService(new WaitlistRepository(pool));
  }

  async markFigureArrived(variantId: number): Promise<MarkFigureArrivedResponse> {
    validatePositiveId(variantId, "variantId");
    const client = await this.pool.connect();
    let transactionStarted = false;

    try {
      await client.query("BEGIN");
      transactionStarted = true;

      await client.query(
        `SELECT order_record.id
         FROM orders AS order_record
         WHERE EXISTS (
           SELECT 1
           FROM order_items AS item
           WHERE item.order_id = order_record.id
             AND item.product_variant_id = $1
             AND item.payment_type = 'DEPOSIT'
             AND item.balance_amount > 0
         )
         ORDER BY order_record.id
         FOR UPDATE OF order_record`,
        [variantId],
      );

      const figureResult = await client.query<ArrivedFigureRow>(
        `UPDATE figures_metadata
         SET warehouse_status = 'ARRIVED_IN_WAREHOUSE',
             arrived_at = COALESCE(arrived_at, CURRENT_TIMESTAMP),
             updated_at = CURRENT_TIMESTAMP
         WHERE product_id = (
           SELECT product_id
           FROM product_variants
           WHERE id = $1
         )
         RETURNING arrived_at`,
        [variantId],
      );
      const figure = figureResult.rows[0];
      if (!figure) {
        throw new FigureVariantNotFoundError(variantId);
      }

      const releaseUpdate = await client.query(
        `UPDATE preorders
         SET release_status = 'Arrived'
         WHERE product_variant_id = $1`,
        [variantId],
      );
      if (releaseUpdate.rowCount === 0) {
        throw new BalanceNotReadyError(
          `Figure variant ${variantId} ไม่มีข้อมูล Pre-order สำหรับปิดรอบรับสินค้า`,
        );
      }

      const dueDateResult = await client.query<{ balance_due_date: Date }>(
        `UPDATE order_items
         SET balance_due_date = $2::timestamptz + INTERVAL '14 days',
             settlement_status = 'AWAITING_BALANCE_PAYMENT'
         WHERE product_variant_id = $1
           AND payment_type = 'DEPOSIT'
           AND balance_amount > 0
           AND settlement_status = 'WAITING_FOR_ARRIVAL'
         RETURNING balance_due_date`,
        [variantId, figure.arrived_at],
      );

      const affectedOrdersResult = await client.query<AffectedOrderRow>(
        `WITH changed_orders AS (
           SELECT DISTINCT order_id
           FROM order_items
           WHERE product_variant_id = $1
             AND payment_type = 'DEPOSIT'
             AND settlement_status = 'AWAITING_BALANCE_PAYMENT'
         ),
         order_due_dates AS (
           SELECT
             item.order_id,
             MAX(item.balance_due_date) AS balance_due_date,
             SUM(item.balance_amount) AS remaining_balance_amount,
             BOOL_AND(
               item.settlement_status IN (
                 'AWAITING_BALANCE_PAYMENT',
                 'PAID',
                 'DEPOSIT_FORFEITED'
               )
             ) AS all_balances_awaiting,
             order_record.balance_due_date IS NULL
               OR order_record.balance_due_date < CURRENT_TIMESTAMP AS deadline_passed
           FROM order_items AS item
           INNER JOIN changed_orders AS changed
             ON changed.order_id = item.order_id
           INNER JOIN orders AS order_record
             ON order_record.id = item.order_id
           WHERE item.payment_type = 'DEPOSIT'
           GROUP BY item.order_id, order_record.balance_due_date
         )
         UPDATE orders AS order_record
         SET balance_due_date = due.balance_due_date,
             remaining_balance = due.remaining_balance_amount,
             remaining_balance_amount = due.remaining_balance_amount,
             settlement_status = CASE
               WHEN due.all_balances_awaiting THEN 'AWAITING_BALANCE_PAYMENT'
               ELSE 'WAITING_FOR_ARRIVAL'
             END
         FROM order_due_dates AS due
         WHERE order_record.id = due.order_id
           AND order_record.payment_status = 'DEPOSIT_PAID'
         RETURNING
           order_record.id AS order_id,
           order_record.balance_due_date,
           order_record.remaining_balance_amount,
           (order_record.settlement_status = 'AWAITING_BALANCE_PAYMENT')
             AS all_balances_awaiting`,
        [variantId],
      );

      await client.query("COMMIT");
      transactionStarted = false;

      const dueDates = dueDateResult.rows.map((row) => row.balance_due_date.getTime());
      const affectedDueDates = affectedOrdersResult.rows
        .map((row) => row.balance_due_date?.getTime())
        .filter((timestamp): timestamp is number => timestamp !== undefined);
      const nextBalanceDueDate =
        affectedDueDates.length > 0
          ? new Date(Math.max(...affectedDueDates)).toISOString()
          : dueDates.length > 0
            ? new Date(Math.max(...dueDates)).toISOString()
            : null;

      return {
        productVariantId: variantId,
        warehouseStatus: "ARRIVED_IN_WAREHOUSE",
        arrivedAt: figure.arrived_at.toISOString(),
        balanceDueDate: nextBalanceDueDate,
        affectedOrders: affectedOrdersResult.rowCount ?? 0,
        affectedOrderItems: dueDateResult.rowCount ?? 0,
      };
    } catch (error) {
      if (transactionStarted) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          console.error("Failed to roll back figure arrival transaction.", rollbackError);
        }
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async settleOrderBalance(
    orderId: number,
    userId: number,
    payment: {
      verified: boolean;
      transactionId: string;
      amount: string;
      currency: string;
    },
  ): Promise<SettleOrderBalanceResponse> {
    validatePositiveId(orderId, "orderId");
    validatePositiveId(userId, "userId");

    if (
      !payment.verified ||
      payment.currency !== "THB" ||
      !payment.transactionId.trim()
    ) {
      throw new BalancePaymentNotVerifiedError();
    }

    const normalizedAmount = amountToCents(payment.amount);
    const client = await this.pool.connect();
    let transactionStarted = false;

    try {
      await client.query("BEGIN");
      transactionStarted = true;

      const orderResult = await client.query<LockedOrderRow>(
        `SELECT
           order_record.id,
           order_record.user_id,
           order_record.remaining_balance_amount,
           order_record.balance_due_date,
           order_record.payment_status,
           order_record.settlement_status,
           order_record.balance_payment_reference,
           NOT EXISTS (
             SELECT 1
             FROM order_items AS item
             WHERE item.order_id = order_record.id
               AND item.payment_type = 'DEPOSIT'
               AND item.balance_amount > 0
               AND item.settlement_status <> 'AWAITING_BALANCE_PAYMENT'
           ) AS all_balances_awaiting
         FROM orders AS order_record
         WHERE order_record.id = $1
           AND order_record.user_id = $2
         FOR UPDATE`,
        [orderId, userId],
      );
      const order = orderResult.rows[0];
      if (!order) {
        throw new OrderNotOwnedError();
      }

      if (order.payment_status === "PAID" && order.remaining_balance_amount === "0.00") {
        if (order.balance_payment_reference === payment.transactionId) {
          await client.query("COMMIT");
          transactionStarted = false;
          return {
            orderId,
            paymentStatus: "PAID",
            settlementStatus: "READY_TO_PACK",
            settledAmount: "0.00",
            paymentReference: payment.transactionId,
            alreadySettled: true,
          };
        }
        throw new BalanceNotReadyError("คำสั่งซื้อนี้ชำระยอดคงเหลือแล้ว");
      }

      if (
        order.payment_status !== "DEPOSIT_PAID" ||
        order.settlement_status !== "AWAITING_BALANCE_PAYMENT" ||
        !order.all_balances_awaiting
      ) {
        throw new BalanceNotReadyError(
          "สินค้ายังมาไม่ครบหรือคำสั่งซื้อนี้ไม่มียอดคงเหลือที่พร้อมชำระ",
        );
      }
      if (!order.balance_due_date || order.deadline_passed) {
        throw new BalanceDeadlinePassedError();
      }

      const amountDueCents = amountToCents(order.remaining_balance_amount);
      if (amountDueCents <= 0n) {
        throw new BalanceNotReadyError("คำสั่งซื้อนี้ไม่มียอดคงเหลือที่ต้องชำระ");
      }
      if (normalizedAmount !== amountDueCents) {
        throw new BalancePaymentAmountMismatchError();
      }

      const itemUpdate = await client.query(
        `UPDATE order_items
         SET balance_amount = 0,
             remaining_balance = 0,
             balance_paid_status = 'PAID',
             settlement_status = 'PAID'
         WHERE order_id = $1
           AND payment_type = 'DEPOSIT'
           AND settlement_status = 'AWAITING_BALANCE_PAYMENT'
           AND balance_amount > 0`,
        [orderId],
      );
      if (itemUpdate.rowCount === 0) {
        throw new BalanceNotReadyError("ไม่พบรายการสินค้าที่รอชำระยอดคงเหลือ");
      }

      await client.query(
        `UPDATE orders
         SET remaining_balance = 0,
             remaining_balance_amount = 0,
             balance_paid_status = 'PAID',
             payment_status = 'PAID',
             settlement_status = 'READY_TO_PACK',
             balance_payment_reference = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
           AND payment_status = 'DEPOSIT_PAID'
           AND remaining_balance_amount = $3`,
        [orderId, payment.transactionId, order.remaining_balance_amount],
      );

      await client.query("COMMIT");
      transactionStarted = false;

      return {
        orderId,
        paymentStatus: "PAID",
        settlementStatus: "READY_TO_PACK",
        settledAmount: centsToAmount(amountDueCents),
        paymentReference: payment.transactionId,
        alreadySettled: false,
      };
    } catch (error) {
      if (transactionStarted) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          console.error("Failed to roll back balance payment transaction.", rollbackError);
        }
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async forfeitExpiredBalances(batchSize = 100): Promise<ExpiredBalanceSettlementResponse> {
    if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 1_000) {
      throw new InvalidBalanceSettlementRequestError(
        "batchSize ต้องอยู่ระหว่าง 1 ถึง 1000",
      );
    }

    const client = await this.pool.connect();
    let transactionStarted = false;

    try {
      await client.query("BEGIN");
      transactionStarted = true;

      const expiredOrdersResult = await client.query<ExpiredOrderRow>(
        `SELECT order_record.id
         FROM orders AS order_record
         WHERE order_record.payment_status = 'DEPOSIT_PAID'
           AND order_record.settlement_status = 'AWAITING_BALANCE_PAYMENT'
           AND order_record.remaining_balance_amount > 0
           AND order_record.balance_due_date <= CURRENT_TIMESTAMP
         ORDER BY order_record.balance_due_date, order_record.id
         LIMIT $1
         FOR UPDATE OF order_record SKIP LOCKED`,
        [batchSize],
      );

      const quotaReleaseMap = new Map<number, number>();
      let forfeitedItems = 0;
      let releasedQuotaUnits = 0;

      for (const order of expiredOrdersResult.rows) {
        const itemResult = await client.query<ForfeitedItemRow>(
          `UPDATE order_items
           SET balance_amount = 0,
               remaining_balance = 0,
               balance_paid_status = 'PENDING',
               settlement_status = 'DEPOSIT_FORFEITED'
           WHERE order_id = $1
             AND payment_type = 'DEPOSIT'
             AND settlement_status = 'AWAITING_BALANCE_PAYMENT'
             AND balance_amount > 0
           RETURNING product_variant_id, quantity`,
          [order.id],
        );

        for (const item of itemResult.rows) {
          quotaReleaseMap.set(
            item.product_variant_id,
            (quotaReleaseMap.get(item.product_variant_id) ?? 0) + item.quantity,
          );
        }
        forfeitedItems += itemResult.rowCount ?? 0;

        await client.query(
          `UPDATE orders
           SET remaining_balance = 0,
               remaining_balance_amount = 0,
               balance_paid_status = 'PENDING',
               payment_status = 'DEPOSIT_FORFEITED',
               settlement_status = 'DEPOSIT_FORFEITED',
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1
             AND payment_status = 'DEPOSIT_PAID'
             AND settlement_status = 'AWAITING_BALANCE_PAYMENT'`,
          [order.id],
        );
      }

      for (const [variantId, quantity] of quotaReleaseMap.entries()) {
        const releaseResult = await client.query<QuotaReleaseRow>(
          `UPDATE preorders
           SET booked_count = GREATEST(booked_count - $2, 0)
           WHERE product_variant_id = $1
           RETURNING product_variant_id, $2::text AS released_quantity`,
          [variantId, quantity],
        );
        if (releaseResult.rowCount !== 1) {
          throw new BalanceSettlementError(
            500,
            "PREORDER_QUOTA_RELEASE_FAILED",
            `ไม่สามารถคืนโควตาของ product variant ${variantId} ได้`,
          );
        }
        releasedQuotaUnits += Number(releaseResult.rows[0].released_quantity);
        await this.waitlistService.releaseForfeitedStock(
          client,
          variantId,
          quantity,
        );
      }

      await client.query("COMMIT");
      transactionStarted = false;

      return {
        processedOrders: expiredOrdersResult.rowCount ?? 0,
        forfeitedItems,
        releasedQuotaUnits,
      };
    } catch (error) {
      if (transactionStarted) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          console.error("Failed to roll back expired balance forfeiture.", rollbackError);
        }
      }
      throw error;
    } finally {
      client.release();
    }
  }
}

import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { z } from "zod";

const positiveIntegerSchema = z.number().int().positive().safe();

export const figureCheckoutRequestSchema = z
  .object({
    userId: positiveIntegerSchema,
    items: z
      .array(
        z
          .object({
            productVariantId: positiveIntegerSchema,
            quantity: positiveIntegerSchema,
          })
          .strict(),
      )
      .min(1, "ต้องมีสินค้าอย่างน้อย 1 รายการ"),
    paymentType: z.enum(["FULL", "DEPOSIT"]),
    carrier: z.enum(["FLASH", "THAI_POST"]),
    serviceAreaCode: z.string().trim().min(1).max(50),
    chargeShippingNow: z.boolean().default(true),
    balanceDueDate: z.string().datetime({ offset: true }).optional(),
  })
  .strict();

export type FigureCheckoutRequest = z.infer<typeof figureCheckoutRequestSchema>;
export type FigurePaymentType = FigureCheckoutRequest["paymentType"];
export type FigureShippingCarrier = FigureCheckoutRequest["carrier"];

export interface FigureCheckoutItemResponse {
  productVariantId: number;
  quantity: number;
  unitPrice: string;
  amountChargedNow: string;
  remainingBalance: string;
  billableWeightKg: number;
}

export interface FigureCheckoutResponse {
  orderId: number | string;
  orderNumber: string;
  orderStatus: "Deposit_Paid" | "Pending_Payment";
  paymentStatus: "UNPAID";
  paymentType: FigurePaymentType;
  carrier: FigureShippingCarrier;
  billableWeightKg: number;
  shippingFee: string;
  chargedNow: string;
  remainingBalance: string;
  balanceDueDate: string | null;
  items: FigureCheckoutItemResponse[];
}

export class FigureCheckoutError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidFigureCheckoutRequestError extends FigureCheckoutError {
  constructor(message: string) {
    super(400, "INVALID_FIGURE_CHECKOUT_REQUEST", message);
  }
}

export class FigureNotFoundError extends FigureCheckoutError {
  constructor(productVariantId: number) {
    super(
      404,
      "FIGURE_NOT_FOUND",
      `ไม่พบสินค้า Figure สำหรับ productVariantId ${productVariantId}`,
    );
  }
}

export class PreorderClosedError extends FigureCheckoutError {
  constructor(productVariantId: number) {
    super(
      409,
      "PREORDER_CLOSED",
      `ปิดรับสั่งจองสินค้ารายการ ${productVariantId} แล้ว`,
    );
  }
}

export class QuotaExceededError extends FigureCheckoutError {
  constructor(productVariantId: number) {
    super(
      409,
      "PREORDER_QUOTA_EXCEEDED",
      `โควตาสั่งจองสินค้ารายการ ${productVariantId} ไม่เพียงพอ`,
    );
  }
}

export class DepositNotAllowedError extends FigureCheckoutError {
  constructor(productVariantId: number) {
    super(
      409,
      "DEPOSIT_NOT_ALLOWED",
      `สินค้ารายการ ${productVariantId} ไม่รองรับการชำระแบบมัดจำ`,
    );
  }
}

export class FigureShippingRateNotFoundError extends FigureCheckoutError {
  constructor(carrier: FigureShippingCarrier, serviceAreaCode: string, weight: number) {
    super(
      422,
      "SHIPPING_RATE_NOT_FOUND",
      `ไม่พบเรตค่าส่งของ ${carrier} พื้นที่ ${serviceAreaCode} สำหรับน้ำหนัก ${weight} กก.`,
    );
  }
}

export class AmbiguousFigureShippingRateError extends FigureCheckoutError {
  constructor(carrier: FigureShippingCarrier, serviceAreaCode: string) {
    super(
      500,
      "AMBIGUOUS_SHIPPING_RATES",
      `พบเรตค่าส่งซ้อนกันสำหรับ ${carrier} พื้นที่ ${serviceAreaCode}; โปรดตรวจสอบข้อมูล shipping_rates`,
    );
  }
}

export class FigureShippingDataError extends FigureCheckoutError {
  constructor(productVariantId: number) {
    super(
      422,
      "INVALID_FIGURE_SHIPPING_DATA",
      `ข้อมูลน้ำหนักหรือขนาดกล่องของสินค้ารายการ ${productVariantId} ไม่ครบถ้วน`,
    );
  }
}

interface FigureVariantRow {
  id: number;
  box_width_cm: string | null;
  box_length_cm: string | null;
  box_height_cm: string | null;
  actual_weight_kg: string | null;
}

interface PreorderRow {
  allow_deposit: boolean;
  deposit_amount: string | null;
  full_price: string;
  preorder_is_open: boolean;
  quota_limit: string | null;
  booked_count: string;
}

interface ShippingRateRow {
  shipping_fee: string;
}

interface CreatedOrderRow {
  id: number | string;
}

interface NormalizedFigureItem {
  productVariantId: number;
  quantity: number;
}

interface PreparedFigureItem extends FigureCheckoutItemResponse {
  fullPriceCents: bigint;
  amountChargedNowCents: bigint;
  remainingBalanceCents: bigint;
}

function amountToCents(value: string, fieldName: string): bigint {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) {
    throw new FigureCheckoutError(
      500,
      "INVALID_DATABASE_AMOUNT",
      `ค่าฐานข้อมูล ${fieldName} ไม่ใช่จำนวนเงินที่ถูกต้อง`,
    );
  }

  const whole = BigInt(match[1]);
  const fraction = BigInt((match[2] ?? "").padEnd(2, "0") || "0");
  return whole * 100n + fraction;
}

function centsToAmount(cents: bigint): string {
  return `${cents / 100n}.${String(cents % 100n).padStart(2, "0")}`;
}

function positiveDatabaseNumber(
  value: string | null,
  productVariantId: number,
): number {
  const parsedValue = value === null ? Number.NaN : Number(value);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    throw new FigureShippingDataError(productVariantId);
  }
  return parsedValue;
}

function normalizeItems(items: FigureCheckoutRequest["items"]): NormalizedFigureItem[] {
  const quantities = new Map<number, number>();

  for (const item of items) {
    const nextQuantity = (quantities.get(item.productVariantId) ?? 0) + item.quantity;
    if (!Number.isSafeInteger(nextQuantity)) {
      throw new InvalidFigureCheckoutRequestError(
        "จำนวนสินค้ารวมของแต่ละเล่มต้องไม่เกินค่าจำนวนเต็มที่รองรับ",
      );
    }
    quantities.set(item.productVariantId, nextQuantity);
  }

  return [...quantities.entries()]
    .map(([productVariantId, quantity]) => ({ productVariantId, quantity }))
    .sort((left, right) => left.productVariantId - right.productVariantId);
}

export function calculateBillableWeightKg(
  actualWeightKg: number,
  widthCm: number,
  lengthCm: number,
  heightCm: number,
): number {
  if (
    !Number.isFinite(actualWeightKg) ||
    !Number.isFinite(widthCm) ||
    !Number.isFinite(lengthCm) ||
    !Number.isFinite(heightCm) ||
    actualWeightKg <= 0 ||
    widthCm <= 0 ||
    lengthCm <= 0 ||
    heightCm <= 0
  ) {
    throw new FigureCheckoutError(
      422,
      "INVALID_SHIPPING_DIMENSIONS",
      "น้ำหนักจริงและขนาดกล่องต้องเป็นค่ามากกว่าศูนย์",
    );
  }

  return Math.max(actualWeightKg, (widthCm * lengthCm * heightCm) / 5_000);
}

export class FigureCheckoutService {
  constructor(private readonly pool: Pool) {}

  async createOrder(input: unknown): Promise<FigureCheckoutResponse> {
    const parsedRequest = figureCheckoutRequestSchema.safeParse(input);
    if (!parsedRequest.success) {
      const details = parsedRequest.error.issues
        .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
        .join("; ");
      throw new InvalidFigureCheckoutRequestError(details);
    }

    const request = parsedRequest.data;
    const items = normalizeItems(request.items);
    const client = await this.pool.connect();
    let transactionStarted = false;

    try {
      await client.query("BEGIN");
      transactionStarted = true;

      const preparedItems: PreparedFigureItem[] = [];
      let totalBillableWeightKg = 0;

      for (const item of items) {
        const variantResult = await client.query<FigureVariantRow>(
          `SELECT
             pv.id,
             fm.box_width_cm,
             fm.box_length_cm,
             fm.box_height_cm,
             fm.actual_weight_kg
           FROM product_variants AS pv
           INNER JOIN figures_metadata AS fm
             ON fm.product_id = pv.product_id
           WHERE pv.id = $1
           FOR UPDATE OF pv, fm`,
          [item.productVariantId],
        );

        const figure = variantResult.rows[0];
        if (!figure) {
          throw new FigureNotFoundError(item.productVariantId);
        }

        const preorderResult = await client.query<PreorderRow>(
          `SELECT
             allow_deposit,
             deposit_amount,
             full_price,
             preorder_deadline IS NOT NULL
               AND CURRENT_TIMESTAMP < preorder_deadline AS preorder_is_open,
             quota_limit,
             booked_count
           FROM preorders
           WHERE product_variant_id = $1
           FOR UPDATE`,
          [item.productVariantId],
        );

        const preorder = preorderResult.rows[0];
        if (!preorder) {
          throw new PreorderClosedError(item.productVariantId);
        }
        if (!preorder.preorder_is_open) {
          throw new PreorderClosedError(item.productVariantId);
        }
        if (request.paymentType === "DEPOSIT" && !preorder.allow_deposit) {
          throw new DepositNotAllowedError(item.productVariantId);
        }

        const fullPriceCents = amountToCents(preorder.full_price, "preorders.full_price");
        const depositAmountCents =
          preorder.deposit_amount === null
            ? null
            : amountToCents(preorder.deposit_amount, "preorders.deposit_amount");

        if (
          request.paymentType === "DEPOSIT" &&
          (depositAmountCents === null ||
            depositAmountCents <= 0n ||
            depositAmountCents >= fullPriceCents)
        ) {
          throw new FigureCheckoutError(
            500,
            "INVALID_DEPOSIT_CONFIGURATION",
            `ข้อมูลเงินมัดจำของสินค้ารายการ ${item.productVariantId} ไม่ถูกต้อง`,
          );
        }

        const actualWeightKg = positiveDatabaseNumber(
          figure.actual_weight_kg,
          item.productVariantId,
        );
        const widthCm = positiveDatabaseNumber(
          figure.box_width_cm,
          item.productVariantId,
        );
        const lengthCm = positiveDatabaseNumber(
          figure.box_length_cm,
          item.productVariantId,
        );
        const heightCm = positiveDatabaseNumber(
          figure.box_height_cm,
          item.productVariantId,
        );
        const billableWeightPerUnit = calculateBillableWeightKg(
          actualWeightKg,
          widthCm,
          lengthCm,
          heightCm,
        );

        const amountChargedPerUnit =
          request.paymentType === "DEPOSIT"
            ? (depositAmountCents ?? fullPriceCents)
            : fullPriceCents;
        const remainingPerUnit =
          request.paymentType === "DEPOSIT"
            ? fullPriceCents - amountChargedPerUnit
            : 0n;

        preparedItems.push({
          productVariantId: item.productVariantId,
          quantity: item.quantity,
          unitPrice: centsToAmount(fullPriceCents),
          amountChargedNow: centsToAmount(amountChargedPerUnit * BigInt(item.quantity)),
          remainingBalance: centsToAmount(remainingPerUnit * BigInt(item.quantity)),
          billableWeightKg: billableWeightPerUnit * item.quantity,
          fullPriceCents,
          amountChargedNowCents: amountChargedPerUnit * BigInt(item.quantity),
          remainingBalanceCents: remainingPerUnit * BigInt(item.quantity),
        });

        const itemBillableWeightKg = billableWeightPerUnit * item.quantity;
        if (!Number.isFinite(itemBillableWeightKg)) {
          throw new InvalidFigureCheckoutRequestError(
            "น้ำหนักรวมของสินค้าเกินค่าที่ระบบรองรับ",
          );
        }
        totalBillableWeightKg += itemBillableWeightKg;
      }
      if (!Number.isFinite(totalBillableWeightKg)) {
        throw new InvalidFigureCheckoutRequestError(
          "น้ำหนักรวมของสินค้าเกินค่าที่ระบบรองรับ",
        );
      }

      const rateResult = await client.query<ShippingRateRow>(
        `SELECT id, shipping_fee
         FROM shipping_rates
         WHERE carrier = $1
           AND service_area_code = CASE
             WHEN EXISTS (
               SELECT 1
               FROM shipping_rates AS exact_rate
               WHERE exact_rate.carrier = $1
                 AND exact_rate.service_area_code = $2
                 AND exact_rate.is_active = TRUE
                 AND exact_rate.effective_from <= CURRENT_TIMESTAMP
                 AND (
                   exact_rate.effective_until IS NULL
                   OR CURRENT_TIMESTAMP < exact_rate.effective_until
                 )
                 AND exact_rate.min_billable_weight_kg <= $3
                 AND (
                   exact_rate.max_billable_weight_kg IS NULL
                   OR $3 < exact_rate.max_billable_weight_kg
                 )
             ) THEN $2
             ELSE '*'
           END
           AND is_active = TRUE
           AND effective_from <= CURRENT_TIMESTAMP
           AND (effective_until IS NULL OR CURRENT_TIMESTAMP < effective_until)
           AND min_billable_weight_kg <= $3
           AND (max_billable_weight_kg IS NULL OR $3 < max_billable_weight_kg)
         FOR SHARE`,
        [request.carrier, request.serviceAreaCode, totalBillableWeightKg],
      );

      if (rateResult.rowCount === 0) {
        throw new FigureShippingRateNotFoundError(
          request.carrier,
          request.serviceAreaCode,
          totalBillableWeightKg,
        );
      }
      if (rateResult.rowCount !== 1) {
        throw new AmbiguousFigureShippingRateError(
          request.carrier,
          request.serviceAreaCode,
        );
      }

      const shippingFeeCents = amountToCents(
        rateResult.rows[0].shipping_fee,
        "shipping_rates.shipping_fee",
      );
      const merchandiseTotalCents = preparedItems.reduce(
        (total, item) => total + item.fullPriceCents * BigInt(item.quantity),
        0n,
      );
      const chargedDepositTotalCents = preparedItems.reduce(
        (total, item) => total + item.amountChargedNowCents,
        0n,
      );
      const productBalanceCents = preparedItems.reduce(
        (total, item) => total + item.remainingBalanceCents,
        0n,
      );
      const chargedShippingCents = request.chargeShippingNow ? shippingFeeCents : 0n;
      const deferredShippingCents = request.chargeShippingNow ? 0n : shippingFeeCents;
      const chargedNowCents = chargedDepositTotalCents + chargedShippingCents;
      const remainingBalanceCents = productBalanceCents + deferredShippingCents;
      const totalAmountCents = merchandiseTotalCents + shippingFeeCents;
      const paymentType = request.paymentType;
      const paymentStatus = "UNPAID" as const;
      const orderStatus =
        paymentType === "DEPOSIT" ? "Deposit_Paid" : "Pending_Payment";
      const balancePaidStatus =
        remainingBalanceCents === 0n ? "PAID" : "PENDING";
      const requestedBalanceDueDate = request.balanceDueDate
        ? new Date(request.balanceDueDate)
        : null;
      const balanceDueDate =
        remainingBalanceCents > 0n ? requestedBalanceDueDate : null;
      const orderNumber = `FIG-${randomUUID()}`;
      const shippingPolicy = `${request.carrier}:${request.serviceAreaCode}`;

      for (const item of items) {
        const reservationResult = await client.query(
          `UPDATE preorders
           SET booked_count = booked_count + $2
           WHERE product_variant_id = $1
             AND preorder_deadline IS NOT NULL
             AND CURRENT_TIMESTAMP < preorder_deadline
             AND (quota_limit IS NULL OR booked_count + $2 <= quota_limit)
           RETURNING product_variant_id`,
          [item.productVariantId, item.quantity],
        );

        if (reservationResult.rowCount !== 1) {
          const currentPreorderResult = await client.query<{ is_open: boolean }>(
            `SELECT
               preorder_deadline IS NOT NULL
                 AND CURRENT_TIMESTAMP < preorder_deadline AS is_open
             FROM preorders
             WHERE product_variant_id = $1`,
            [item.productVariantId],
          );

          if (!currentPreorderResult.rows[0]?.is_open) {
            throw new PreorderClosedError(item.productVariantId);
          }
          throw new QuotaExceededError(item.productVariantId);
        }
      }

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
           immediate_amount,
           remaining_balance,
           remaining_balance_amount,
           balance_paid_status,
           balance_due_date,
           settlement_status
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         RETURNING id`,
        [
          request.userId,
          orderNumber,
          centsToAmount(totalAmountCents),
          centsToAmount(shippingFeeCents),
          shippingPolicy,
          orderStatus,
          paymentStatus,
          paymentType,
          centsToAmount(chargedNowCents),
          centsToAmount(chargedNowCents),
          centsToAmount(remainingBalanceCents),
          centsToAmount(remainingBalanceCents),
          balancePaidStatus,
          balanceDueDate,
          remainingBalanceCents > 0n ? "WAITING_FOR_ARRIVAL" : "NOT_REQUIRED",
        ],
      );

      const order = orderResult.rows[0];
      if (!order) {
        throw new Error("The database did not return the created figure order.");
      }

      for (const item of preparedItems) {
        const itemBalanceStatus = item.remainingBalanceCents === 0n ? "PAID" : "PENDING";
        await client.query(
          `INSERT INTO order_items (
             order_id,
             product_variant_id,
             quantity,
             unit_price,
             is_preorder,
             payment_type,
             remaining_balance,
             balance_amount,
             balance_paid_status,
             balance_due_date,
             settlement_status
           )
           VALUES ($1, $2, $3, $4, TRUE, $5, $6, $7, $8, $9, $10)`,
          [
            order.id,
            item.productVariantId,
            item.quantity,
            item.unitPrice,
            paymentType,
            item.remainingBalance,
            item.remainingBalance,
            itemBalanceStatus,
            item.remainingBalanceCents > 0n ? balanceDueDate : null,
            item.remainingBalanceCents > 0n
              ? "WAITING_FOR_ARRIVAL"
              : "NOT_REQUIRED",
          ],
        );
      }

      await client.query("COMMIT");
      transactionStarted = false;

      return {
        orderId: order.id,
        orderNumber,
        orderStatus,
        paymentStatus,
        paymentType,
        carrier: request.carrier,
        billableWeightKg: totalBillableWeightKg,
        shippingFee: centsToAmount(shippingFeeCents),
        chargedNow: centsToAmount(chargedNowCents),
        remainingBalance: centsToAmount(remainingBalanceCents),
        balanceDueDate: balanceDueDate?.toISOString() ?? null,
        items: preparedItems.map((item) => ({
          productVariantId: item.productVariantId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amountChargedNow: item.amountChargedNow,
          remainingBalance: item.remainingBalance,
          billableWeightKg: item.billableWeightKg,
        })),
      };
    } catch (error) {
      if (transactionStarted) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          console.error("Failed to roll back figure checkout transaction.", rollbackError);
        }
      }
      throw error;
    } finally {
      client.release();
    }
  }
}

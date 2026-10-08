import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { z } from "zod";
import { taxInvoiceRequestSchema } from "../tax/taxInvoice.schemas";

const positiveInteger = z.number().int().positive().safe();

export const unifiedCheckoutPayloadSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            productVariantId: positiveInteger,
            quantity: positiveInteger,
            productType: z.enum([
              "MANGA_INSTOCK",
              "MANGA_PREORDER",
              "FIGURE_FULL",
              "FIGURE_DEPOSIT",
            ]),
          })
          .strict(),
      )
      .min(1, "ตะกร้าต้องมีสินค้าอย่างน้อย 1 รายการ")
      .max(100, "ตะกร้ามีสินค้าได้ไม่เกิน 100 รายการ"),
    carrier: z.enum(["FLASH", "THAI_POST"]),
    serviceAreaCode: z.string().trim().min(1).max(50),
    shippingPolicy: z.string().trim().min(1).max(100),
    balanceDueDate: z.string().datetime({ offset: true }).optional(),
    shippingAddress: z
      .object({
        recipientName: z.string().trim().min(2).max(150),
        recipientPhone: z
          .string()
          .trim()
          .min(8)
          .max(30)
          .regex(/^[0-9+(). -]+$/),
        addressLine: z.string().trim().min(1).max(300),
        addressVillage: z.string().trim().max(100).optional(),
        street: z.string().trim().max(150).optional(),
        subdistrict: z.string().trim().min(1).max(120),
        district: z.string().trim().min(1).max(120),
        province: z.string().trim().min(1).max(120),
        postalCode: z.string().trim().regex(/^\d{5}$/),
      })
      .strict()
      .optional(),
    taxInvoiceRequest: taxInvoiceRequestSchema.optional(),
  })
  .strict();

export type UnifiedCheckoutPayload = z.infer<typeof unifiedCheckoutPayloadSchema>;
export type MixedCartProductType = UnifiedCheckoutPayload["items"][number]["productType"];
export type UnifiedPaymentStatus = "UNPAID" | "PAID" | "DEPOSIT_PAID";
export type UnifiedPaymentType = "FULL" | "DEPOSIT";

export interface UnifiedCheckoutItemResponse {
  productVariantId: number;
  productType: MixedCartProductType;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  paymentType: UnifiedPaymentType;
  balanceAmount: string;
  isPreorder: boolean;
}

export interface UnifiedCheckoutResponse {
  orderId: number | string;
  orderNumber: string;
  totalAmount: string;
  shippingFee: string;
  immediateAmount: string;
  remainingBalanceAmount: string;
  paymentStatus: UnifiedPaymentStatus;
  paymentQrCodeDataUrl?: string;
  paymentQrError?: string;
  billableWeightKg: number;
  shippingCarrier: "FLASH" | "THAI_POST";
  items: UnifiedCheckoutItemResponse[];
}

export class UnifiedCheckoutError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidCheckoutPayloadError extends UnifiedCheckoutError {
  constructor(message: string) {
    super(400, "INVALID_CHECKOUT_PAYLOAD", message);
  }
}

export class CheckoutProductNotFoundError extends UnifiedCheckoutError {
  constructor(productVariantId: number) {
    super(
      404,
      "PRODUCT_NOT_FOUND",
      `ไม่พบสินค้ารายการ ${productVariantId}`,
    );
  }
}

export class ProductTypeMismatchError extends UnifiedCheckoutError {
  constructor(productVariantId: number, requestedType: MixedCartProductType) {
    super(
      409,
      "PRODUCT_TYPE_MISMATCH",
      `ประเภทสินค้ารายการ ${productVariantId} ไม่ตรงกับ ${requestedType}`,
    );
  }
}

export class OutOfStockError extends UnifiedCheckoutError {
  constructor(productVariantId: number) {
    super(409, "OUT_OF_STOCK", `สินค้ารายการ ${productVariantId} หมด`);
  }
}

export class PreorderClosedError extends UnifiedCheckoutError {
  constructor(productVariantId: number) {
    super(
      409,
      "PREORDER_CLOSED",
      `สินค้ารายการ ${productVariantId} อยู่นอกช่วงเวลาสั่งจอง`,
    );
  }
}

export class PreorderQuotaExceededError extends UnifiedCheckoutError {
  constructor(productVariantId: number) {
    super(
      409,
      "PREORDER_QUOTA_EXCEEDED",
      `โควตาสั่งจองของสินค้ารายการ ${productVariantId} ไม่เพียงพอ`,
    );
  }
}

export class DepositNotAvailableError extends UnifiedCheckoutError {
  constructor(productVariantId: number) {
    super(
      409,
      "DEPOSIT_NOT_AVAILABLE",
      `สินค้าฟิกเกอร์รายการ ${productVariantId} ไม่รองรับการวางมัดจำ`,
    );
  }
}

export class InvalidProductShippingDataError extends UnifiedCheckoutError {
  constructor(productVariantId: number) {
    super(
      422,
      "INVALID_PRODUCT_SHIPPING_DATA",
      `ข้อมูลน้ำหนักหรือขนาดจัดส่งของสินค้ารายการ ${productVariantId} ไม่ครบถ้วน`,
    );
  }
}

export class ShippingRateNotFoundError extends UnifiedCheckoutError {
  constructor(carrier: string, area: string, weight: number) {
    super(
      422,
      "SHIPPING_RATE_NOT_FOUND",
      `ไม่พบเรตค่าจัดส่งของ ${carrier} พื้นที่ ${area} สำหรับน้ำหนัก ${weight} กก.`,
    );
  }
}

export class AmbiguousShippingRateError extends UnifiedCheckoutError {
  constructor(carrier: string, area: string) {
    super(
      500,
      "AMBIGUOUS_SHIPPING_RATE",
      `ข้อมูลเรตค่าจัดส่งของ ${carrier} พื้นที่ ${area} ซ้ำซ้อน`,
    );
  }
}

interface ProductVariantRow {
  price: string;
  weight_grams: string | null;
  is_figure: boolean;
  box_width_cm: string | null;
  box_length_cm: string | null;
  box_height_cm: string | null;
  actual_weight_kg: string | null;
}

interface PreorderRow {
  allow_deposit: boolean;
  deposit_amount: string | null;
  full_price: string;
  is_open: boolean;
}

interface ShippingRateRow {
  shipping_fee: string;
}

interface OrderRow {
  id: number | string;
}

interface NormalizedCheckoutItem {
  productVariantId: number;
  quantity: number;
  productType: MixedCartProductType;
}

interface PreparedCheckoutItem extends UnifiedCheckoutItemResponse {
  balanceAmountCents: bigint;
}

function amountToCents(value: string, fieldName: string): bigint {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) {
    throw new UnifiedCheckoutError(
      500,
      "INVALID_DATABASE_AMOUNT",
      `ค่าฐานข้อมูล ${fieldName} ไม่ใช่จำนวนเงินที่ถูกต้อง`,
    );
  }

  return (
    BigInt(match[1]) * 100n +
    BigInt((match[2] ?? "").padEnd(2, "0") || "0")
  );
}

function centsToAmount(cents: bigint): string {
  return `${cents / 100n}.${String(cents % 100n).padStart(2, "0")}`;
}

function readPositiveNumber(value: string | null, productVariantId: number): number {
  const parsedValue = value === null ? Number.NaN : Number(value);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    throw new InvalidProductShippingDataError(productVariantId);
  }
  return parsedValue;
}

function normalizeItems(
  items: UnifiedCheckoutPayload["items"],
): NormalizedCheckoutItem[] {
  const itemsByVariant = new Map<number, NormalizedCheckoutItem>();

  for (const item of items) {
    const current = itemsByVariant.get(item.productVariantId);
    if (current && current.productType !== item.productType) {
      throw new InvalidCheckoutPayloadError(
        `สินค้า variant ${item.productVariantId} ถูกระบุด้วยประเภทที่ขัดแย้งกัน`,
      );
    }

    const quantity = (current?.quantity ?? 0) + item.quantity;
    if (!Number.isSafeInteger(quantity)) {
      throw new InvalidCheckoutPayloadError(
        `จำนวนสินค้ารายการ ${item.productVariantId} มากเกินกว่าระบบรองรับ`,
      );
    }

    itemsByVariant.set(item.productVariantId, {
      productVariantId: item.productVariantId,
      quantity,
      productType: item.productType,
    });
  }

  return [...itemsByVariant.values()].sort(
    (left, right) => left.productVariantId - right.productVariantId,
  );
}

function isFigureType(productType: MixedCartProductType): boolean {
  return productType === "FIGURE_FULL" || productType === "FIGURE_DEPOSIT";
}

function calculateFigureBillableWeight(
  actualWeightKg: number,
  widthCm: number,
  lengthCm: number,
  heightCm: number,
): number {
  return Math.max(actualWeightKg, (widthCm * lengthCm * heightCm) / 5_000);
}

export class UnifiedCheckoutService {
  constructor(private readonly pool: Pool) {}

  async createOrder(userId: number, input: unknown): Promise<UnifiedCheckoutResponse> {
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      throw new UnifiedCheckoutError(
        401,
        "UNAUTHENTICATED",
        "ต้องเข้าสู่ระบบก่อนสั่งซื้อ",
      );
    }

    const parsed = unifiedCheckoutPayloadSchema.safeParse(input);
    if (!parsed.success) {
      const message = parsed.error.issues
        .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
        .join("; ");
      throw new InvalidCheckoutPayloadError(message);
    }

    const payload = parsed.data;
    const items = normalizeItems(payload.items);
    const client = await this.pool.connect();
    let transactionStarted = false;

    try {
      await client.query("BEGIN");
      transactionStarted = true;

      const preparedItems: PreparedCheckoutItem[] = [];
      let totalBillableWeightKg = 0;
      let merchandiseImmediateCents = 0n;
      let totalBalanceCents = 0n;
      let containsDeposit = false;

      for (const item of items) {
        const variantResult = await client.query<ProductVariantRow>(
          `SELECT
             pv.price,
             pv.weight_grams,
             (fm.product_id IS NOT NULL) AS is_figure,
             fm.box_width_cm,
             fm.box_length_cm,
             fm.box_height_cm,
             fm.actual_weight_kg
           FROM product_variants AS pv
           LEFT JOIN figures_metadata AS fm
             ON fm.product_id = pv.product_id
           WHERE pv.id = $1
           FOR UPDATE OF pv`,
          [item.productVariantId],
        );

        const variant = variantResult.rows[0];
        if (!variant) {
          throw new CheckoutProductNotFoundError(item.productVariantId);
        }

        const expectedFigure = isFigureType(item.productType);
        if (variant.is_figure !== expectedFigure) {
          throw new ProductTypeMismatchError(item.productVariantId, item.productType);
        }

        const preorderResult = await client.query<PreorderRow>(
          `SELECT
             allow_deposit,
             deposit_amount,
             full_price,
             CURRENT_TIMESTAMP >= start_date
               AND CURRENT_TIMESTAMP <= end_date
               AND (
                 $2 = FALSE
                 OR (
                   preorder_deadline IS NOT NULL
                   AND CURRENT_TIMESTAMP < preorder_deadline
                 )
               )
               AS is_open
           FROM preorders
           WHERE product_variant_id = $1
           FOR UPDATE`,
          [item.productVariantId, isFigureType(item.productType)],
        );
        const preorder = preorderResult.rows[0];
        const preorderIsOpen = Boolean(preorder?.is_open);
        const requiresPreorder =
          item.productType === "MANGA_PREORDER" ||
          item.productType === "FIGURE_DEPOSIT" ||
          (item.productType === "FIGURE_FULL" && preorderIsOpen);

        if (
          (item.productType === "MANGA_PREORDER" ||
            item.productType === "FIGURE_DEPOSIT") &&
          !preorder
        ) {
          throw new PreorderClosedError(item.productVariantId);
        }
        if (
          (item.productType === "MANGA_PREORDER" ||
            item.productType === "FIGURE_DEPOSIT") &&
          !preorderIsOpen
        ) {
          throw new PreorderClosedError(item.productVariantId);
        }

        if (item.productType === "FIGURE_DEPOSIT" && preorder && !preorder.allow_deposit) {
          throw new DepositNotAvailableError(item.productVariantId);
        }

        let unitPriceCents: bigint;
        let immediateUnitPriceCents: bigint;
        let balancePerUnitCents = 0n;
        let paymentType: UnifiedPaymentType = "FULL";
        let isPreorder = requiresPreorder;
        let billableWeightKg: number;

        if (item.productType === "FIGURE_DEPOSIT") {
          if (!preorder) {
            throw new PreorderClosedError(item.productVariantId);
          }
          const depositCents = amountToCents(
            preorder.deposit_amount ?? "0",
            "preorders.deposit_amount",
          );
          const fullPriceCents = amountToCents(
            preorder.full_price,
            "preorders.full_price",
          );
          if (depositCents <= 0n || depositCents >= fullPriceCents) {
            throw new UnifiedCheckoutError(
              500,
              "INVALID_DEPOSIT_CONFIGURATION",
              `ข้อมูลยอดมัดจำของสินค้ารายการ ${item.productVariantId} ไม่ถูกต้อง`,
            );
          }
          unitPriceCents = fullPriceCents;
          immediateUnitPriceCents = depositCents;
          balancePerUnitCents = fullPriceCents - depositCents;
          paymentType = "DEPOSIT";
          containsDeposit = true;
        } else if (item.productType === "FIGURE_FULL" && requiresPreorder && preorder) {
          unitPriceCents = amountToCents(preorder.full_price, "preorders.full_price");
          immediateUnitPriceCents = unitPriceCents;
        } else {
          unitPriceCents = amountToCents(variant.price, "product_variants.price");
          immediateUnitPriceCents = unitPriceCents;
          isPreorder = false;
        }

        if (isFigureType(item.productType)) {
          const actualWeightKg = readPositiveNumber(
            variant.actual_weight_kg,
            item.productVariantId,
          );
          const widthCm = readPositiveNumber(
            variant.box_width_cm,
            item.productVariantId,
          );
          const lengthCm = readPositiveNumber(
            variant.box_length_cm,
            item.productVariantId,
          );
          const heightCm = readPositiveNumber(
            variant.box_height_cm,
            item.productVariantId,
          );
          billableWeightKg = calculateFigureBillableWeight(
            actualWeightKg,
            widthCm,
            lengthCm,
            heightCm,
          );
        } else {
          const weightGrams = readPositiveNumber(
            variant.weight_grams,
            item.productVariantId,
          );
          billableWeightKg = weightGrams / 1_000;
        }

        const lineTotalCents = unitPriceCents * BigInt(item.quantity);
        const lineImmediateCents = immediateUnitPriceCents * BigInt(item.quantity);
        const balanceAmountCents = balancePerUnitCents * BigInt(item.quantity);

        if (requiresPreorder) {
          const reservationResult = await client.query(
            `UPDATE preorders
             SET booked_count = booked_count + $2
             WHERE product_variant_id = $1
               AND start_date <= CURRENT_TIMESTAMP
               AND CURRENT_TIMESTAMP <= end_date
               AND (
                 $3 = FALSE
                 OR (
                   preorder_deadline IS NOT NULL
                   AND CURRENT_TIMESTAMP < preorder_deadline
                 )
               )
               AND (quota_limit IS NULL OR booked_count + $2 <= quota_limit)
             RETURNING product_variant_id`,
            [item.productVariantId, item.quantity, isFigureType(item.productType)],
          );

          if (reservationResult.rowCount !== 1) {
            const currentResult = await client.query<{ is_open: boolean }>(
              `SELECT
                 start_date <= CURRENT_TIMESTAMP
                   AND CURRENT_TIMESTAMP <= end_date
                   AND (
                     $2 = FALSE
                     OR (
                       preorder_deadline IS NOT NULL
                       AND CURRENT_TIMESTAMP < preorder_deadline
                     )
                   )
                   AS is_open
               FROM preorders
               WHERE product_variant_id = $1`,
              [item.productVariantId, isFigureType(item.productType)],
            );
            if (!currentResult.rows[0]?.is_open) {
              throw new PreorderClosedError(item.productVariantId);
            }
            throw new PreorderQuotaExceededError(item.productVariantId);
          }
        } else {
          const stockResult = await client.query(
            `UPDATE product_variants
             SET stock_quantity = stock_quantity - $2,
                 availability_status = CASE
                   WHEN stock_quantity - $2 > 0 THEN 'IN_STOCK'
                   ELSE 'OUT_OF_STOCK'
                 END
             WHERE id = $1
               AND stock_quantity >= $2
             RETURNING id`,
            [item.productVariantId, item.quantity],
          );
          if (stockResult.rowCount !== 1) {
            throw new OutOfStockError(item.productVariantId);
          }
        }

        merchandiseImmediateCents += lineImmediateCents;
        totalBalanceCents += balanceAmountCents;
        totalBillableWeightKg += billableWeightKg * item.quantity;

        if (!Number.isFinite(totalBillableWeightKg)) {
          throw new InvalidCheckoutPayloadError("น้ำหนักพัสดุรวมเกินค่าที่ระบบรองรับ");
        }

        preparedItems.push({
          productVariantId: item.productVariantId,
          productType: item.productType,
          quantity: item.quantity,
          unitPrice: centsToAmount(unitPriceCents),
          lineTotal: centsToAmount(lineTotalCents),
          paymentType,
          balanceAmount: centsToAmount(balanceAmountCents),
          isPreorder,
          balanceAmountCents,
        });
      }

      const shippingRateResult = await client.query<ShippingRateRow>(
        `SELECT shipping_fee
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
        [payload.carrier, payload.serviceAreaCode, totalBillableWeightKg],
      );

      if (shippingRateResult.rowCount === 0) {
        throw new ShippingRateNotFoundError(
          payload.carrier,
          payload.serviceAreaCode,
          totalBillableWeightKg,
        );
      }
      if (shippingRateResult.rowCount !== 1) {
        throw new AmbiguousShippingRateError(payload.carrier, payload.serviceAreaCode);
      }

      const shippingFeeCents = amountToCents(
        shippingRateResult.rows[0].shipping_fee,
        "shipping_rates.shipping_fee",
      );
      const immediateAmountCents = merchandiseImmediateCents + shippingFeeCents;
      const totalAmountCents = immediateAmountCents + totalBalanceCents;
      const paymentStatus: UnifiedPaymentStatus = "UNPAID";
      const orderNumber = `MIX-${randomUUID()}`;
      const balanceDueDate =
        totalBalanceCents > 0n && payload.balanceDueDate
          ? new Date(payload.balanceDueDate)
          : null;

      const orderResult = await client.query<OrderRow>(
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
           settlement_status,
           shipping_recipient_name,
           shipping_recipient_phone,
           shipping_address_line,
           shipping_address_village,
           shipping_street,
           shipping_subdistrict,
           shipping_district,
           shipping_province,
           shipping_postal_code
         )
         VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
           $16, $17, $18, $19, $20, $21, $22, $23, $24
         )
         RETURNING id`,
        [
          userId,
          orderNumber,
          centsToAmount(totalAmountCents),
          centsToAmount(shippingFeeCents),
          `${payload.shippingPolicy}:${payload.carrier}:${payload.serviceAreaCode}`,
          "pending",
          paymentStatus,
          containsDeposit ? "DEPOSIT" : "FULL",
          centsToAmount(immediateAmountCents),
          centsToAmount(totalBalanceCents),
          totalBalanceCents > 0n ? "PENDING" : "PAID",
          balanceDueDate,
          centsToAmount(immediateAmountCents),
          centsToAmount(totalBalanceCents),
          totalBalanceCents > 0n ? "WAITING_FOR_ARRIVAL" : "NOT_REQUIRED",
          payload.shippingAddress?.recipientName ?? null,
          payload.shippingAddress?.recipientPhone ?? null,
          payload.shippingAddress?.addressLine ?? null,
          payload.shippingAddress?.addressVillage || null,
          payload.shippingAddress?.street || null,
          payload.shippingAddress?.subdistrict ?? null,
          payload.shippingAddress?.district ?? null,
          payload.shippingAddress?.province ?? null,
          payload.shippingAddress?.postalCode ?? null,
        ],
      );

      const order = orderResult.rows[0];
      if (!order) {
        throw new Error("Database did not return the created mixed-cart order.");
      }

      if (payload.taxInvoiceRequest) {
        const taxRequest = payload.taxInvoiceRequest;
        const branchType =
          taxRequest.entityType === "CORPORATION" ? taxRequest.branchType ?? null : null;
        const branchCode =
          taxRequest.entityType === "CORPORATION" ? taxRequest.branchCode ?? null : null;
        await client.query(
          `INSERT INTO order_tax_invoice_requests (
             order_id,
             user_id,
             entity_type,
             tax_id,
             company_or_name,
             branch_type,
             branch_code,
             address_line,
             address_village,
             street,
             subdistrict,
             district,
             province,
             postal_code,
             contact_email,
             contact_phone,
             save_for_next_time
           )
           VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8, $9,
             $10, $11, $12, $13, $14, $15, $16, $17
           )`,
          [
            order.id,
            userId,
            taxRequest.entityType,
            taxRequest.taxId,
            taxRequest.companyOrName,
            branchType,
            branchCode,
            taxRequest.addressLine,
            taxRequest.addressVillage || null,
            taxRequest.street || null,
            taxRequest.subdistrict,
            taxRequest.district,
            taxRequest.province,
            taxRequest.postalCode,
            taxRequest.contactEmail,
            taxRequest.contactPhone,
            taxRequest.saveForNextTime,
          ],
        );
      }

      for (const item of preparedItems) {
        const itemBalanceStatus = item.balanceAmountCents > 0n ? "PENDING" : "PAID";
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
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            order.id,
            item.productVariantId,
            item.quantity,
            item.unitPrice,
            item.isPreorder,
            item.paymentType,
            item.balanceAmount,
            itemBalanceStatus,
            item.balanceAmountCents > 0n ? balanceDueDate : null,
            item.balanceAmount,
            item.balanceAmountCents > 0n
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
        totalAmount: centsToAmount(totalAmountCents),
        shippingFee: centsToAmount(shippingFeeCents),
        immediateAmount: centsToAmount(immediateAmountCents),
        remainingBalanceAmount: centsToAmount(totalBalanceCents),
        paymentStatus,
        billableWeightKg: totalBillableWeightKg,
        shippingCarrier: payload.carrier,
        items: preparedItems.map((item) => ({
          productVariantId: item.productVariantId,
          productType: item.productType,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
          paymentType: item.paymentType,
          balanceAmount: item.balanceAmount,
          isPreorder: item.isPreorder,
        })),
      };
    } catch (error) {
      if (transactionStarted) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          console.error("Failed to roll back unified checkout transaction.", rollbackError);
        }
      }
      throw error;
    } finally {
      client.release();
    }
  }
}

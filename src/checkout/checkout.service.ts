import { randomUUID } from "node:crypto";
import { Pool } from "pg";

export interface CreateOrderItemRequest {
  productVariantId: number;
  quantity: number;
}

export interface CreateOrderRequest {
  userId: number;
  items: CreateOrderItemRequest[];
  shippingFee: number | string;
  shippingPolicy: string;
}

export interface OrderItemResponseDTO {
  productVariantId: number;
  quantity: number;
  unitPrice: string;
  isPreorder: boolean;
}

export interface CreateOrderResponseDTO {
  id: number | string;
  orderNumber: string;
  userId: number;
  totalAmount: string;
  shippingFee: string;
  shippingPolicy: string;
  orderStatus: "pending";
  paymentStatus: "UNPAID";
  items: OrderItemResponseDTO[];
}

export class CheckoutError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "CheckoutError";
  }
}

interface ProductVariantRow {
  id: number;
  price: string;
  stock_quantity: number;
}

interface PreorderRow {
  is_open: boolean;
  quota_limit: string | null;
  booked_count: string;
}

interface OrderRow {
  id: number | string;
}

interface NormalizedOrderItem {
  productVariantId: number;
  quantity: number;
}

const ORDER_STATUS = "pending";
const PAYMENT_STATUS = "UNPAID";

function toCents(value: number | string, fieldName: string): bigint {
  const normalizedValue = String(value).trim();
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalizedValue);
  if (!match) {
    throw new CheckoutError(
      400,
      "INVALID_AMOUNT",
      `${fieldName} must be a non-negative amount with at most 2 decimal places.`,
    );
  }

  const whole = BigInt(match[1]);
  const fraction = BigInt((match[2] ?? "").padEnd(2, "0") || "0");
  return whole * 100n + fraction;
}

function fromCents(cents: bigint): string {
  return `${cents / 100n}.${String(cents % 100n).padStart(2, "0")}`;
}

function normalizeItems(items: CreateOrderItemRequest[]): NormalizedOrderItem[] {
  if (!Array.isArray(items) || items.length === 0) {
    throw new CheckoutError(400, "EMPTY_ORDER", "At least one order item is required.");
  }

  const quantities = new Map<number, number>();
  for (const item of items) {
    if (
      !item ||
      !Number.isSafeInteger(item.productVariantId) ||
      item.productVariantId <= 0 ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity <= 0
    ) {
      throw new CheckoutError(
        400,
        "INVALID_ORDER_ITEM",
        "Each item must have a positive productVariantId and quantity.",
      );
    }

    const combinedQuantity = (quantities.get(item.productVariantId) ?? 0) + item.quantity;
    if (!Number.isSafeInteger(combinedQuantity)) {
      throw new CheckoutError(400, "INVALID_ORDER_ITEM", "The requested quantity is too large.");
    }
    quantities.set(item.productVariantId, combinedQuantity);
  }

  return [...quantities.entries()]
    .map(([productVariantId, quantity]) => ({ productVariantId, quantity }))
    .sort((left, right) => left.productVariantId - right.productVariantId);
}

export class CheckoutService {
  constructor(private readonly pool: Pool) {}

  async createOrder(input: CreateOrderRequest): Promise<CreateOrderResponseDTO> {
    if (!Number.isSafeInteger(input.userId) || input.userId <= 0) {
      throw new CheckoutError(401, "UNAUTHENTICATED", "A valid authenticated user is required.");
    }
    if (typeof input.shippingPolicy !== "string" || input.shippingPolicy.trim().length === 0) {
      throw new CheckoutError(400, "INVALID_SHIPPING_POLICY", "A shipping policy is required.");
    }

    const shippingPolicy = input.shippingPolicy.trim();
    const shippingFeeCents = toCents(input.shippingFee, "shippingFee");
    const items = normalizeItems(input.items);
    const client = await this.pool.connect();
    let transactionStarted = false;

    try {
      await client.query("BEGIN");
      transactionStarted = true;

      const reservedItems: OrderItemResponseDTO[] = [];
      let merchandiseTotalCents = 0n;

      for (const item of items) {
        const variantResult = await client.query<ProductVariantRow>(
          `SELECT id, price, stock_quantity
           FROM product_variants
           WHERE id = $1
           FOR UPDATE`,
          [item.productVariantId],
        );

        const variant = variantResult.rows[0];
        if (!variant) {
          throw new CheckoutError(
            404,
            "PRODUCT_VARIANT_NOT_FOUND",
            `Product variant ${item.productVariantId} was not found.`,
          );
        }

        const preorderResult = await client.query<PreorderRow>(
          `SELECT
             start_date <= CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP <= end_date AS is_open,
             start_date,
             end_date,
             quota_limit,
             booked_count
           FROM preorders
           WHERE product_variant_id = $1
           FOR UPDATE`,
          [item.productVariantId],
        );

        const preorder = preorderResult.rows[0];
        if (preorder) {
          if (!preorder.is_open) {
            throw new CheckoutError(
              409,
              "PREORDER_NOT_OPEN",
              `Pre-order for product variant ${item.productVariantId} is not currently open.`,
            );
          }

          if (
            preorder.quota_limit !== null &&
            BigInt(preorder.booked_count) + BigInt(item.quantity) > BigInt(preorder.quota_limit)
          ) {
            throw new CheckoutError(
              409,
              "PREORDER_QUOTA_EXCEEDED",
              `Pre-order quota for product variant ${item.productVariantId} is full.`,
            );
          }

          const reservation = await client.query(
            `UPDATE preorders
             SET booked_count = booked_count + $2
             WHERE product_variant_id = $1
               AND (quota_limit IS NULL OR booked_count + $2 <= quota_limit)
             RETURNING product_variant_id`,
            [item.productVariantId, item.quantity],
          );

          if (reservation.rowCount !== 1) {
            throw new CheckoutError(
              409,
              "PREORDER_QUOTA_EXCEEDED",
              `Pre-order quota for product variant ${item.productVariantId} is full.`,
            );
          }
        } else {
          const reservation = await client.query(
            `UPDATE product_variants
             SET stock_quantity = stock_quantity - $2,
                 availability_status = CASE
                   WHEN stock_quantity - $2 > 0 THEN 'IN_STOCK'
                   ELSE 'OUT_OF_STOCK'
                 END
             WHERE id = $1 AND stock_quantity >= $2
             RETURNING id`,
            [item.productVariantId, item.quantity],
          );

          if (reservation.rowCount !== 1) {
            throw new CheckoutError(
              409,
              "OUT_OF_STOCK",
              `Insufficient stock for product variant ${item.productVariantId}.`,
            );
          }
        }

        const unitPriceCents = toCents(variant.price, "product price");
        merchandiseTotalCents += unitPriceCents * BigInt(item.quantity);
        reservedItems.push({
          productVariantId: item.productVariantId,
          quantity: item.quantity,
          unitPrice: fromCents(unitPriceCents),
          isPreorder: Boolean(preorder),
        });
      }

      const totalAmount = fromCents(merchandiseTotalCents + shippingFeeCents);
      const shippingFee = fromCents(shippingFeeCents);
      const orderNumber = `MNG-${randomUUID()}`;
      const orderResult = await client.query<OrderRow>(
        `INSERT INTO orders (
           user_id,
           order_number,
           total_amount,
           shipping_fee,
           shipping_policy,
           order_status,
           payment_status,
           immediate_amount,
           remaining_balance_amount
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0)
         RETURNING id`,
        [
          input.userId,
          orderNumber,
          totalAmount,
          shippingFee,
          shippingPolicy,
          ORDER_STATUS,
          PAYMENT_STATUS,
          totalAmount,
        ],
      );

      const order = orderResult.rows[0];
      if (!order) {
        throw new Error("The database did not return the created order.");
      }

      for (const item of reservedItems) {
        await client.query(
          `INSERT INTO order_items (
             order_id,
             product_variant_id,
             quantity,
             unit_price,
             is_preorder
           )
           VALUES ($1, $2, $3, $4, $5)`,
          [
            order.id,
            item.productVariantId,
            item.quantity,
            item.unitPrice,
            item.isPreorder,
          ],
        );
      }

      await client.query("COMMIT");
      transactionStarted = false;

      return {
        id: order.id,
        orderNumber,
        userId: input.userId,
        totalAmount,
        shippingFee,
        shippingPolicy,
        orderStatus: ORDER_STATUS,
        paymentStatus: PAYMENT_STATUS,
        items: reservedItems,
      };
    } catch (error) {
      if (transactionStarted) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          console.error("Failed to roll back checkout transaction.", rollbackError);
        }
      }
      throw error;
    } finally {
      client.release();
    }
  }
}

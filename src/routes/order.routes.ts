import { Request, Response, Router } from "express";
import { Pool } from "pg";
import { z } from "zod";
import {
  listMockOrders,
  getMockOrder,
  saveMockOrder,
  cancelMockOrder,
  rejectMockOrderPayment,
  approveMockOrderPaymentReview,
  advanceMockShipmentStatus,
  markMockOrderShipped,
} from "../mocks/storage.mock";
import { generatePromptPayQrDataUrl } from "../services/paymentQr.service";
import { AuthService } from "../auth/auth.service";

const positiveIntegerSchema = z
  .string()
  .regex(/^[1-9]\d*$/, "ต้องเป็นเลขจำนวนเต็มบวก")
  .transform(Number);

export function createOrderRouter(pool: Pool, _authService: AuthService): Router {
  const router = Router();

  /**
   * GET /api/orders
   * Retrieves orders list (optionally filtered by userId).
   */
  router.get("/", async (request: Request, response: Response): Promise<void> => {
    try {
      const queryUserId = request.query.userId ? Number(request.query.userId) : undefined;
      const callerUserId = request.user?.id;
      const targetUserId = queryUserId ?? callerUserId;

      // Try database query first
      try {
        const queryText = targetUserId
          ? `SELECT
               id,
               user_id,
               order_number,
               total_amount::text AS total_amount,
               shipping_fee::text AS shipping_fee,
               order_status,
               payment_status,
               created_at
             FROM orders
             WHERE user_id = $1
             ORDER BY created_at DESC`
          : `SELECT
               id,
               user_id,
               order_number,
               total_amount::text AS total_amount,
               shipping_fee::text AS shipping_fee,
               order_status,
               payment_status,
               created_at
             FROM orders
             ORDER BY created_at DESC`;

        const queryParams = targetUserId ? [targetUserId] : [];
        const result = await pool.query(queryText, queryParams);

        if (result.rows.length > 0) {
          const dbOrders = result.rows.map((row) => ({
            detail: {
              id: Number(row.id),
              orderNumber: row.order_number,
              createdAt: row.created_at.toISOString(),
              status: row.order_status,
              paymentStatus: row.payment_status,
              totalAmount: Number(row.total_amount),
              paidAmount: row.payment_status === "PAID" ? Number(row.total_amount) : 0,
              remainingBalance: 0,
              items: [],
            },
          }));
          response.json({ success: true, orders: dbOrders });
          return;
        }
      } catch (dbErr) {
        console.warn("DB orders query unavailable, using stored orders fallback:", dbErr);
      }

      // Memory/Mock store fallback
      const orders = listMockOrders(targetUserId);
      response.json({ success: true, orders });
    } catch (error) {
      console.error("Failed to list orders:", error);
      response.status(500).json({ success: false, error: { message: "ไม่สามารถโหลดรายการคำสั่งซื้อได้" } });
    }
  });

  /**
   * GET /api/orders/:orderId
   * Retrieves single order by ID.
   */
  router.get("/:orderId", async (request: Request, response: Response): Promise<void> => {
    const parsedId = positiveIntegerSchema.safeParse(request.params.orderId);
    if (!parsedId.success) {
      response.status(400).json({ success: false, error: { message: "หมายเลขคำสั่งซื้อไม่ถูกต้อง" } });
      return;
    }

    const orderId = parsedId.data;

    // Try database first
    try {
      const result = await pool.query(
        `SELECT
           id,
           user_id,
           order_number,
           total_amount::text AS total_amount,
           shipping_fee::text AS shipping_fee,
           order_status,
           payment_status,
           created_at
         FROM orders
         WHERE id = $1`,
        [orderId],
      );

      if (result.rows.length > 0) {
        const row = result.rows[0];
        const itemsResult = await pool.query(
          `SELECT
             item.id,
             item.product_variant_id,
             item.quantity,
             item.unit_price::text AS unit_price,
             item.is_preorder,
             variant.option_name,
             product.name AS product_name
           FROM order_items AS item
           LEFT JOIN product_variants AS variant ON variant.id = item.product_variant_id
           LEFT JOIN products AS product ON product.id = variant.product_id
           WHERE item.order_id = $1`,
          [orderId],
        );

        const order = {
          detail: {
            id: Number(row.id),
            orderNumber: row.order_number,
            createdAt: row.created_at.toISOString(),
            status: row.order_status,
            paymentStatus: row.payment_status,
            totalAmount: Number(row.total_amount),
            paidAmount: row.payment_status === "PAID" ? Number(row.total_amount) : 0,
            remainingBalance: 0,
            items: itemsResult.rows.map((item) => ({
              id: String(item.id),
              productVariantId: Number(item.product_variant_id),
              title: item.product_name || item.option_name || "สินค้า",
              productType: "MANGA",
              quantity: item.quantity,
              unitPrice: Number(item.unit_price),
              totalPrice: item.quantity * Number(item.unit_price),
              isPreorder: item.is_preorder,
            })),
          },
        };

        response.json({ success: true, order });
        return;
      }
    } catch (dbErr) {
      console.warn("DB getOrderById query fallback:", dbErr);
    }

    const order = getMockOrder(orderId);
    if (!order) {
      response.status(404).json({ success: false, error: { message: "ไม่พบคำสั่งซื้อ" } });
      return;
    }

    response.json({ success: true, order });
  });

  /**
   * POST /api/orders
   * Saves or persists order.
   */
  router.post("/", (request: Request, response: Response): void => {
    try {
      const order = request.body;
      if (!order?.detail?.id) {
        response.status(400).json({ success: false, error: { message: "ข้อมูลคำสั่งซื้อไม่ครบถ้วน" } });
        return;
      }
      saveMockOrder(order);
      response.status(201).json({ success: true, order });
    } catch (error) {
      response.status(500).json({ success: false, error: { message: "ไม่สามารถบันทึกคำสั่งซื้อได้" } });
    }
  });

  /**
   * POST /api/orders/:orderId/cancel
   */
  router.post("/:orderId/cancel", (request: Request, response: Response): void => {
    const parsedId = positiveIntegerSchema.safeParse(request.params.orderId);
    if (!parsedId.success) {
      response.status(400).json({ success: false, error: { message: "หมายเลขคำสั่งซื้อไม่ถูกต้อง" } });
      return;
    }

    try {
      const ownerUserId = request.body.ownerUserId ?? request.user?.id ?? 9001;
      const order = cancelMockOrder(parsedId.data, ownerUserId);
      response.json({ success: true, order });
    } catch (error) {
      const message = error instanceof Error ? error.message : "ไม่สามารถยกเลิกคำสั่งซื้อได้";
      response.status(400).json({ success: false, error: { message } });
    }
  });

  /**
   * POST /api/orders/:orderId/slip/approve
   */
  router.post("/:orderId/slip/approve", (request: Request, response: Response): void => {
    const parsedId = positiveIntegerSchema.safeParse(request.params.orderId);
    if (!parsedId.success) {
      response.status(400).json({ success: false, error: { message: "หมายเลขคำสั่งซื้อไม่ถูกต้อง" } });
      return;
    }

    try {
      const order = approveMockOrderPaymentReview(parsedId.data);
      response.json({ success: true, order });
    } catch (error) {
      const message = error instanceof Error ? error.message : "ไม่สามารถอนุมัติสลิปได้";
      response.status(400).json({ success: false, error: { message } });
    }
  });

  /**
   * POST /api/orders/:orderId/slip/reject
   */
  router.post("/:orderId/slip/reject", (request: Request, response: Response): void => {
    const parsedId = positiveIntegerSchema.safeParse(request.params.orderId);
    if (!parsedId.success) {
      response.status(400).json({ success: false, error: { message: "หมายเลขคำสั่งซื้อไม่ถูกต้อง" } });
      return;
    }

    try {
      const reason = request.body.reason;
      if (!reason) {
        response.status(400).json({ success: false, error: { message: "กรุณาระบุเหตุผลการปฏิเสธ" } });
        return;
      }
      const order = rejectMockOrderPayment(parsedId.data, reason);
      response.json({ success: true, order });
    } catch (error) {
      const message = error instanceof Error ? error.message : "ไม่สามารถปฏิเสธสลิปได้";
      response.status(400).json({ success: false, error: { message } });
    }
  });

  /**
   * POST /api/orders/:orderId/shipment/advance
   */
  router.post("/:orderId/shipment/advance", (request: Request, response: Response): void => {
    const parsedId = positiveIntegerSchema.safeParse(request.params.orderId);
    if (!parsedId.success) {
      response.status(400).json({ success: false, error: { message: "หมายเลขคำสั่งซื้อไม่ถูกต้อง" } });
      return;
    }

    try {
      const order = advanceMockShipmentStatus(parsedId.data);
      response.json({ success: true, order });
    } catch (error) {
      const message = error instanceof Error ? error.message : "ไม่สามารถอัปเดตสถานะจัดส่งได้";
      response.status(400).json({ success: false, error: { message } });
    }
  });

  /**
   * POST /api/orders/:orderId/shipment/ship
   */
  router.post("/:orderId/shipment/ship", (request: Request, response: Response): void => {
    const parsedId = positiveIntegerSchema.safeParse(request.params.orderId);
    if (!parsedId.success) {
      response.status(400).json({ success: false, error: { message: "หมายเลขคำสั่งซื้อไม่ถูกต้อง" } });
      return;
    }

    try {
      const carrier = request.body.carrier === "THAI_POST" ? "THAI_POST" : "FLASH";
      const order = markMockOrderShipped(parsedId.data, carrier);
      response.json({ success: true, order });
    } catch (error) {
      const message = error instanceof Error ? error.message : "ไม่สามารถอัปเดตสถานะจัดส่งได้";
      response.status(400).json({ success: false, error: { message } });
    }
  });

  /**
   * GET /api/orders/:orderId/payment-qr
   * Generates dynamic PromptPay QR code for this order.
   */
  router.get("/:orderId/payment-qr", async (request: Request, response: Response): Promise<void> => {
    const parsedId = positiveIntegerSchema.safeParse(request.params.orderId);
    if (!parsedId.success) {
      response.status(400).json({ success: false, error: { message: "หมายเลขคำสั่งซื้อไม่ถูกต้อง" } });
      return;
    }

    try {
      const order = getMockOrder(parsedId.data);
      const amount = order?.detail ? (order.detail.remainingBalance > 0 && order.detail.status === "AWAITING_BALANCE_PAYMENT" ? order.detail.remainingBalance : order.detail.totalAmount) : 100;
      const qrDataUrl = await generatePromptPayQrDataUrl(amount);
      response.json({ success: true, data: { qrDataUrl, amount } });
    } catch (error) {
      console.error("Failed to generate QR:", error);
      response.status(500).json({ success: false, error: { message: "ไม่สามารถสร้าง PromptPay QR ได้" } });
    }
  });

  return router;
}

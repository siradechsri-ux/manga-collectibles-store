import { Request, Response, Router } from "express";
import { Pool } from "pg";
import { z } from "zod";
import {
  getOrderSnapshotFromDb,
  listOrderSnapshotsFromDb,
  saveOrderSnapshotToDb,
} from "../db/database";
import { generatePromptPayQrDataUrl } from "../services/paymentQr.service";
import { AuthService } from "../auth/auth.service";

const positiveIntegerSchema = z
  .string()
  .regex(/^[1-9]\d*$/, "ต้องเป็นเลขจำนวนเต็มบวก")
  .transform(Number);

function generateTrackingNumber(carrier: "FLASH" | "THAI_POST", orderId: number): string {
  const suffix = String(orderId).padStart(6, "0").slice(-6);
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return carrier === "THAI_POST" ? `EF${suffix}${rand}TH` : `TH${suffix}${rand}`;
}

export function createOrderRouter(pool: Pool, _authService: AuthService): Router {
  const router = Router();

  /**
   * GET /api/orders
   * Retrieves orders list from PostgreSQL (optionally filtered by userId).
   */
  router.get("/", async (request: Request, response: Response): Promise<void> => {
    try {
      const queryUserId = request.query.userId ? Number(request.query.userId) : undefined;
      const callerUserId =
        request.user?.role === "CUSTOMER" ? request.user.id : undefined;
      const targetUserId = queryUserId ?? callerUserId;

      const orders = await listOrderSnapshotsFromDb(pool, targetUserId);
      response.json({ success: true, orders });
    } catch (error) {
      console.error("Failed to list orders:", error);
      response
        .status(500)
        .json({ success: false, error: { message: "ไม่สามารถโหลดรายการคำสั่งซื้อได้" } });
    }
  });

  /**
   * POST /api/orders/arrive-all
   * Marks all DEPOSIT_PAID orders as arrived in Thailand (AWAITING_BALANCE_PAYMENT).
   */
  router.post("/arrive-all", async (_request: Request, response: Response): Promise<void> => {
    try {
      const allOrders = await listOrderSnapshotsFromDb(pool);
      const arrivedAt = new Date();
      const dueDate = new Date(arrivedAt.getTime() + 14 * 24 * 60 * 60 * 1000);
      const updatedOrders = [];

      for (const order of allOrders) {
        if (
          order.detail.paymentStatus !== "DEPOSIT_PAID" ||
          order.detail.remainingBalance <= 0 ||
          order.detail.status === "AWAITING_BALANCE_PAYMENT"
        ) {
          continue;
        }
        const updated = {
          ...order,
          detail: {
            ...order.detail,
            status: "AWAITING_BALANCE_PAYMENT" as const,
            timelineStage: "ARRIVED_IN_THAILAND" as const,
            balanceDueDate: dueDate.toISOString(),
            timeline: order.detail.timeline.map((event) =>
              event.stage === "ARRIVED_IN_THAILAND"
                ? {
                    ...event,
                    label: "สินค้าเข้าคลังไทยแล้ว",
                    occurredAt: arrivedAt.toISOString(),
                  }
                : event,
            ),
          },
        };
        await pool.query(
          `UPDATE orders
           SET order_status = 'AWAITING_BALANCE_PAYMENT',
               settlement_status = 'AWAITING_BALANCE_PAYMENT',
               balance_due_date = $2,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [order.detail.id, dueDate.toISOString()],
        );
        await saveOrderSnapshotToDb(pool, updated);
        updatedOrders.push(updated);
      }

      response.json({
        success: true,
        data: { updatedOrders, updatedCount: updatedOrders.length },
      });
    } catch (error) {
      console.error("Failed to mark deposit orders arrived:", error);
      response
        .status(500)
        .json({ success: false, error: { message: "ไม่สามารถอัปเดตสถานะสินค้าเข้าคลังได้" } });
    }
  });

  /**
   * GET /api/orders/:orderId
   * Retrieves single order by ID from PostgreSQL.
   */
  router.get("/:orderId", async (request: Request, response: Response): Promise<void> => {
    const parsedId = positiveIntegerSchema.safeParse(request.params.orderId);
    if (!parsedId.success) {
      response
        .status(400)
        .json({ success: false, error: { message: "หมายเลขคำสั่งซื้อไม่ถูกต้อง" } });
      return;
    }

    const orderId = parsedId.data;
    try {
      const order = await getOrderSnapshotFromDb(pool, orderId);
      if (!order) {
        response.status(404).json({ success: false, error: { message: "ไม่พบคำสั่งซื้อ" } });
        return;
      }
      response.json({ success: true, order });
    } catch (error) {
      console.error("Failed to load order:", error);
      response
        .status(500)
        .json({ success: false, error: { message: "ไม่สามารถโหลดข้อมูลคำสั่งซื้อได้" } });
    }
  });

  /**
   * POST /api/orders
   * Saves or persists order into PostgreSQL.
   */
  router.post("/", async (request: Request, response: Response): Promise<void> => {
    try {
      const order = request.body;
      if (!order?.detail?.id) {
        response
          .status(400)
          .json({ success: false, error: { message: "ข้อมูลคำสั่งซื้อไม่ครบถ้วน" } });
        return;
      }
      await saveOrderSnapshotToDb(pool, order);
      response.status(201).json({ success: true, order });
    } catch (error) {
      console.error("Failed to save order:", error);
      response
        .status(500)
        .json({ success: false, error: { message: "ไม่สามารถบันทึกคำสั่งซื้อได้" } });
    }
  });

  /**
   * POST /api/orders/:orderId/cancel
   */
  router.post("/:orderId/cancel", async (request: Request, response: Response): Promise<void> => {
    const parsedId = positiveIntegerSchema.safeParse(request.params.orderId);
    if (!parsedId.success) {
      response
        .status(400)
        .json({ success: false, error: { message: "หมายเลขคำสั่งซื้อไม่ถูกต้อง" } });
      return;
    }

    try {
      const orderId = parsedId.data;
      const existing = await getOrderSnapshotFromDb(pool, orderId);
      if (!existing) {
        response.status(404).json({ success: false, error: { message: "ไม่พบคำสั่งซื้อในระบบ" } });
        return;
      }
      if (
        existing.detail.status !== "UNPAID" ||
        existing.detail.paymentStatus !== "UNPAID"
      ) {
        response
          .status(400)
          .json({ success: false, error: { message: "ยกเลิกได้เฉพาะคำสั่งซื้อที่ยังไม่ชำระเงิน" } });
        return;
      }

      // Restore stock in PostgreSQL
      if (existing.inventoryReserved) {
        for (const item of existing.detail.items) {
          if (!item.productVariantId) continue;
          if (item.isPreorder) {
            await pool.query(
              `UPDATE preorders SET booked_count = GREATEST(booked_count - $2, 0) WHERE product_variant_id = $1`,
              [item.productVariantId, item.quantity],
            );
          } else {
            await pool.query(
              `UPDATE product_variants SET stock_quantity = stock_quantity + $2, availability_status = 'IN_STOCK' WHERE id = $1`,
              [item.productVariantId, item.quantity],
            );
          }
        }
      }

      const cancelledOrder = {
        ...existing,
        inventoryReserved: false,
        detail: {
          ...existing.detail,
          status: "CANCELLED" as const,
        },
      };

      await pool.query(
        `UPDATE orders SET order_status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [orderId],
      );
      await saveOrderSnapshotToDb(pool, cancelledOrder);
      response.json({ success: true, order: cancelledOrder });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "ไม่สามารถยกเลิกคำสั่งซื้อได้";
      response.status(400).json({ success: false, error: { message } });
    }
  });

  /**
   * POST /api/orders/:orderId/slip/approve
   */
  router.post(
    "/:orderId/slip/approve",
    async (request: Request, response: Response): Promise<void> => {
      const parsedId = positiveIntegerSchema.safeParse(request.params.orderId);
      if (!parsedId.success) {
        response
          .status(400)
          .json({ success: false, error: { message: "หมายเลขคำสั่งซื้อไม่ถูกต้อง" } });
        return;
      }

      try {
        const orderId = parsedId.data;
        const existing = await getOrderSnapshotFromDb(pool, orderId);
        if (!existing) {
          response.status(404).json({ success: false, error: { message: "ไม่พบคำสั่งซื้อ" } });
          return;
        }

        const isBalanceReview = existing.detail.paymentReviewStage === "BALANCE";
        const hasRemainingDeposit =
          !isBalanceReview && existing.detail.remainingBalance > 0;
        const nextPaymentStatus = hasRemainingDeposit ? ("DEPOSIT_PAID" as const) : ("PAID" as const);
        const nextStatus = hasRemainingDeposit ? ("DEPOSIT_PAID" as const) : ("PAID" as const);
        const approvedAt = new Date().toISOString();

        const updatedOrder = {
          ...existing,
          detail: {
            ...existing.detail,
            status: nextStatus,
            paymentStatus: nextPaymentStatus,
            timelineStage: "DEPOSIT_PAID" as const,
            paidAmount: hasRemainingDeposit
              ? Number(existing.immediateAmount)
              : existing.detail.totalAmount,
            remainingBalance: hasRemainingDeposit
              ? existing.detail.remainingBalance
              : 0,
            ...(hasRemainingDeposit ? {} : { balanceDueDate: null }),
            paymentRejectionReason: null,
            timeline: existing.detail.timeline.map((event) =>
              event.stage === "DEPOSIT_PAID"
                ? {
                    ...event,
                    label: "ฝ่ายการเงินอนุมัติสลิปแล้ว",
                    occurredAt: approvedAt,
                  }
                : event,
            ),
          },
        };

        await pool.query(
          `UPDATE orders
           SET order_status = $2,
               payment_status = $3,
               settlement_status = $4,
               remaining_balance = $5,
               remaining_balance_amount = $5,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [
            orderId,
            nextStatus,
            nextPaymentStatus,
            hasRemainingDeposit ? "WAITING_FOR_ARRIVAL" : "READY_TO_PACK",
            updatedOrder.detail.remainingBalance.toFixed(2),
          ],
        );
        await saveOrderSnapshotToDb(pool, updatedOrder);
        response.json({ success: true, order: updatedOrder });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "ไม่สามารถอนุมัติสลิปได้";
        response.status(400).json({ success: false, error: { message } });
      }
    },
  );

  /**
   * POST /api/orders/:orderId/slip/reject
   */
  router.post(
    "/:orderId/slip/reject",
    async (request: Request, response: Response): Promise<void> => {
      const parsedId = positiveIntegerSchema.safeParse(request.params.orderId);
      if (!parsedId.success) {
        response
          .status(400)
          .json({ success: false, error: { message: "หมายเลขคำสั่งซื้อไม่ถูกต้อง" } });
        return;
      }

      try {
        const reason = request.body.reason;
        if (!reason) {
          response
            .status(400)
            .json({ success: false, error: { message: "กรุณาระบุเหตุผลการปฏิเสธ" } });
          return;
        }
        const orderId = parsedId.data;
        const existing = await getOrderSnapshotFromDb(pool, orderId);
        if (!existing) {
          response.status(404).json({ success: false, error: { message: "ไม่พบคำสั่งซื้อ" } });
          return;
        }

        const updatedOrder = {
          ...existing,
          detail: {
            ...existing.detail,
            status: "PAYMENT_REJECTED" as const,
            paymentRejectionReason: String(reason),
          },
        };

        await pool.query(
          `UPDATE orders SET order_status = 'PAYMENT_REJECTED', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [orderId],
        );
        await saveOrderSnapshotToDb(pool, updatedOrder);
        response.json({ success: true, order: updatedOrder });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "ไม่สามารถปฏิเสธสลิปได้";
        response.status(400).json({ success: false, error: { message } });
      }
    },
  );

  /**
   * POST /api/orders/:orderId/slip/resubmit
   */
  router.post(
    "/:orderId/slip/resubmit",
    async (request: Request, response: Response): Promise<void> => {
      const parsedId = positiveIntegerSchema.safeParse(request.params.orderId);
      if (!parsedId.success) {
        response
          .status(400)
          .json({ success: false, error: { message: "หมายเลขคำสั่งซื้อไม่ถูกต้อง" } });
        return;
      }

      try {
        const orderId = parsedId.data;
        const existing = await getOrderSnapshotFromDb(pool, orderId);
        if (!existing) {
          response.status(404).json({ success: false, error: { message: "ไม่พบคำสั่งซื้อ" } });
          return;
        }

        const fileName = String(request.body.fileName || "resubmitted_slip.jpg");
        const updatedOrder = {
          ...existing,
          detail: {
            ...existing.detail,
            status: "PAYMENT_REVIEW_PENDING" as const,
            paymentRejectionReason: null,
            paymentSlipFileName: fileName,
          },
        };

        await pool.query(
          `UPDATE orders SET order_status = 'PAYMENT_REVIEW_PENDING', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [orderId],
        );
        await saveOrderSnapshotToDb(pool, updatedOrder);
        response.json({ success: true, order: updatedOrder });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "ไม่สามารถส่งสลิปใหม่ได้";
        response.status(400).json({ success: false, error: { message } });
      }
    },
  );

  /**
   * POST /api/orders/:orderId/arrive
   */
  router.post(
    "/:orderId/arrive",
    async (request: Request, response: Response): Promise<void> => {
      const parsedId = positiveIntegerSchema.safeParse(request.params.orderId);
      if (!parsedId.success) {
        response
          .status(400)
          .json({ success: false, error: { message: "หมายเลขคำสั่งซื้อไม่ถูกต้อง" } });
        return;
      }

      try {
        const orderId = parsedId.data;
        const existing = await getOrderSnapshotFromDb(pool, orderId);
        if (!existing) {
          response.status(404).json({ success: false, error: { message: "ไม่พบคำสั่งซื้อ" } });
          return;
        }
        const arrivedAt = new Date();
        const dueDate = new Date(arrivedAt.getTime() + 14 * 24 * 60 * 60 * 1000);
        const updatedOrder = {
          ...existing,
          detail: {
            ...existing.detail,
            status: "AWAITING_BALANCE_PAYMENT" as const,
            timelineStage: "ARRIVED_IN_THAILAND" as const,
            balanceDueDate: dueDate.toISOString(),
            timeline: existing.detail.timeline.map((event) =>
              event.stage === "ARRIVED_IN_THAILAND"
                ? {
                    ...event,
                    label: "สินค้าเข้าคลังไทยแล้ว",
                    occurredAt: arrivedAt.toISOString(),
                  }
                : event,
            ),
          },
        };

        await pool.query(
          `UPDATE orders
           SET order_status = 'AWAITING_BALANCE_PAYMENT',
               settlement_status = 'AWAITING_BALANCE_PAYMENT',
               balance_due_date = $2,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [orderId, dueDate.toISOString()],
        );
        await saveOrderSnapshotToDb(pool, updatedOrder);
        response.json({ success: true, order: updatedOrder });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "ไม่สามารถอัปเดตสถานะสินค้าเข้าคลังได้";
        response.status(400).json({ success: false, error: { message } });
      }
    },
  );

  /**
   * POST /api/orders/:orderId/shipment/advance
   */
  router.post(
    "/:orderId/shipment/advance",
    async (request: Request, response: Response): Promise<void> => {
      const parsedId = positiveIntegerSchema.safeParse(request.params.orderId);
      if (!parsedId.success) {
        response
          .status(400)
          .json({ success: false, error: { message: "หมายเลขคำสั่งซื้อไม่ถูกต้อง" } });
        return;
      }

      try {
        const orderId = parsedId.data;
        const existing = await getOrderSnapshotFromDb(pool, orderId);
        if (!existing) {
          response.status(404).json({ success: false, error: { message: "ไม่พบคำสั่งซื้อ" } });
          return;
        }

        const nowIso = new Date().toISOString();
        let nextOrderStatus = existing.detail.status;
        let nextTimelineStage = existing.detail.timelineStage;

        if (existing.detail.status === "PAID" || existing.detail.status === "DEPOSIT_PAID") {
          nextOrderStatus = "PACKING";
        } else if (existing.detail.status === "PACKING") {
          nextOrderStatus = "SHIPPED";
          nextTimelineStage = "SHIPPED";
        } else if (existing.detail.status === "SHIPPED") {
          nextOrderStatus = "DELIVERED";
          nextTimelineStage = "SHIPPED";
        }

        const updatedShipments = existing.detail.shipments.map((s) => {
          if (nextOrderStatus === "SHIPPED" && s.status === "PREPARING") {
            return {
              ...s,
              status: "SHIPPED" as const,
              trackingStatus: "IN_TRANSIT" as const,
              carrier: s.carrier ?? ("FLASH" as const),
              trackingNumber:
                s.trackingNumber ?? generateTrackingNumber(s.carrier ?? "FLASH", orderId),
              shippedAt: s.shippedAt ?? nowIso,
            };
          }
          if (nextOrderStatus === "DELIVERED") {
            return {
              ...s,
              status: "DELIVERED" as const,
              trackingStatus: "DELIVERED" as const,
            };
          }
          return s;
        });

        const updatedOrder = {
          ...existing,
          detail: {
            ...existing.detail,
            status: nextOrderStatus,
            timelineStage: nextTimelineStage,
            shipments: updatedShipments,
            timeline: existing.detail.timeline.map((ev) =>
              ev.stage === "SHIPPED" &&
              (nextOrderStatus === "SHIPPED" || nextOrderStatus === "DELIVERED")
                ? {
                    ...ev,
                    label: nextOrderStatus === "DELIVERED" ? "จัดส่งสำเร็จ" : "จัดส่งแล้ว",
                    occurredAt: ev.occurredAt ?? nowIso,
                  }
                : ev,
            ),
          },
        };

        await pool.query(
          `UPDATE orders SET order_status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [orderId, nextOrderStatus],
        );
        await saveOrderSnapshotToDb(pool, updatedOrder);
        response.json({ success: true, order: updatedOrder });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "ไม่สามารถอัปเดตสถานะจัดส่งได้";
        response.status(400).json({ success: false, error: { message } });
      }
    },
  );

  /**
   * POST /api/orders/:orderId/shipment/ship
   */
  router.post(
    "/:orderId/shipment/ship",
    async (request: Request, response: Response): Promise<void> => {
      const parsedId = positiveIntegerSchema.safeParse(request.params.orderId);
      if (!parsedId.success) {
        response
          .status(400)
          .json({ success: false, error: { message: "หมายเลขคำสั่งซื้อไม่ถูกต้อง" } });
        return;
      }

      try {
        const orderId = parsedId.data;
        const carrier: "FLASH" | "THAI_POST" =
          request.body.carrier === "THAI_POST" ? "THAI_POST" : "FLASH";
        const existing = await getOrderSnapshotFromDb(pool, orderId);
        if (!existing) {
          response.status(404).json({ success: false, error: { message: "ไม่พบคำสั่งซื้อ" } });
          return;
        }

        const shippedAt = new Date().toISOString();
        const trackingNumber = generateTrackingNumber(carrier, orderId);
        const updatedShipments = existing.detail.shipments.map((shipment) => ({
          ...shipment,
          status: "SHIPPED" as const,
          trackingStatus: "IN_TRANSIT" as const,
          carrier,
          trackingNumber: shipment.trackingNumber ?? trackingNumber,
          shippedAt: shipment.shippedAt ?? shippedAt,
        }));

        const updatedOrder = {
          ...existing,
          detail: {
            ...existing.detail,
            status: "SHIPPED" as const,
            timelineStage: "SHIPPED" as const,
            shipments: updatedShipments,
            timeline: existing.detail.timeline.map((ev) =>
              ev.stage === "SHIPPED"
                ? {
                    ...ev,
                    label: `จัดส่งแล้ว (${carrier} · ${trackingNumber})`,
                    occurredAt: shippedAt,
                  }
                : ev,
            ),
          },
        };

        await pool.query(
          `UPDATE orders SET order_status = 'SHIPPED', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [orderId],
        );
        await saveOrderSnapshotToDb(pool, updatedOrder);
        response.json({ success: true, order: updatedOrder });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "ไม่สามารถอัปเดตสถานะจัดส่งได้";
        response.status(400).json({ success: false, error: { message } });
      }
    },
  );

  /**
   * GET /api/orders/:orderId/payment-qr
   * Generates dynamic PromptPay QR code for this order.
   */
  router.get(
    "/:orderId/payment-qr",
    async (request: Request, response: Response): Promise<void> => {
      const parsedId = positiveIntegerSchema.safeParse(request.params.orderId);
      if (!parsedId.success) {
        response
          .status(400)
          .json({ success: false, error: { message: "หมายเลขคำสั่งซื้อไม่ถูกต้อง" } });
        return;
      }

      try {
        const order = await getOrderSnapshotFromDb(pool, parsedId.data);
        const amount = order?.detail
          ? order.detail.remainingBalance > 0 &&
            order.detail.status === "AWAITING_BALANCE_PAYMENT"
            ? order.detail.remainingBalance
            : order.detail.totalAmount
          : 100;
        const qrDataUrl = await generatePromptPayQrDataUrl(amount);
        response.json({ success: true, data: { qrDataUrl, amount } });
      } catch (error) {
        console.error("Failed to generate QR:", error);
        response
          .status(500)
          .json({ success: false, error: { message: "ไม่สามารถสร้าง PromptPay QR ได้" } });
      }
    },
  );

  return router;
}

import fs from "node:fs";
import path from "node:path";
import { Request, Response, Router } from "express";
import { Pool } from "pg";
import { z } from "zod";
import {
  getOrderSnapshotFromDb,
  listOrderSnapshotsFromDb,
  saveOrderSnapshotToDb,
  recordAuditLog,
} from "../db/database";
import { generatePromptPayQrDataUrl } from "../services/paymentQr.service";
import { AuthService } from "../auth/auth.service";

const SLIPS_UPLOAD_DIR = path.resolve(process.cwd(), "uploads", "slips");

function saveDataUrlSlipToDisk(orderId: number, dataUrl: string): string | null {
  const match = /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/i.exec(
    dataUrl.trim(),
  );
  if (!match) return null;
  const rawExt = match[1].toLowerCase();
  const ext = rawExt === "jpeg" ? "jpg" : rawExt;
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length === 0 || buffer.length > 5 * 1024 * 1024) return null;
  fs.mkdirSync(SLIPS_UPLOAD_DIR, { recursive: true });
  const timestamp = Date.now();
  const filePath = path.join(SLIPS_UPLOAD_DIR, `order-${orderId}-${timestamp}.${ext}`);
  fs.writeFileSync(filePath, buffer);
  return `/api/orders/${orderId}/slip-image?v=${timestamp}`;
}

function findLatestSlipImageFile(orderId: number): { filePath: string; contentType: string } | null {
  if (!fs.existsSync(SLIPS_UPLOAD_DIR)) return null;
  const prefix = `order-${orderId}-`;
  const candidates = fs
    .readdirSync(SLIPS_UPLOAD_DIR)
    .filter((name) => name.startsWith(prefix))
    .map((name) => {
      const fullPath = path.join(SLIPS_UPLOAD_DIR, name);
      const stat = fs.statSync(fullPath);
      return { name, fullPath, mtimeMs: stat.mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
  const latest = candidates[0];
  if (!latest) return null;
  const lower = latest.name.toLowerCase();
  const contentType = lower.endsWith(".png")
    ? "image/png"
    : lower.endsWith(".webp")
      ? "image/webp"
      : "image/jpeg";
  return { filePath: latest.fullPath, contentType };
}

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
   * GET /api/orders/:orderId/slip-image
   * Serves the actual uploaded payment slip image for Finance review.
   */
  router.get(
    "/:orderId/slip-image",
    async (request: Request, response: Response): Promise<void> => {
      const parsedId = positiveIntegerSchema.safeParse(request.params.orderId);
      if (!parsedId.success) {
        response.status(400).json({ success: false, error: { message: "หมายเลขคำสั่งซื้อไม่ถูกต้อง" } });
        return;
      }
      const orderId = parsedId.data;
      try {
        const diskFile = findLatestSlipImageFile(orderId);
        if (diskFile) {
          response.setHeader("Content-Type", diskFile.contentType);
          response.setHeader("Cache-Control", "no-store");
          response.sendFile(diskFile.filePath);
          return;
        }
        const snap = await getOrderSnapshotFromDb(pool, orderId);
        const dataUrl = snap?.detail?.paymentSlipImageUrl;
        if (typeof dataUrl === "string" && dataUrl.startsWith("data:image/")) {
          const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
          if (match) {
            response.setHeader("Content-Type", match[1]);
            response.setHeader("Cache-Control", "no-store");
            response.send(Buffer.from(match[2], "base64"));
            return;
          }
        }
        response.status(404).json({ success: false, error: { message: "ยังไม่มีภาพสลิปสำหรับคำสั่งซื้อนี้" } });
      } catch (error) {
        console.error("Failed to serve slip image:", error);
        response.status(500).json({ success: false, error: { message: "ไม่สามารถโหลดภาพสลิปได้" } });
      }
    },
  );

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
      await recordAuditLog(pool, {
        performedByUserId: request.user?.id ?? 9001,
        action: "ORDER_CANCEL",
        resourceType: "order",
        resourceId: orderId,
        oldValues: { status: existing.detail.status },
        newValues: { status: "CANCELLED" },
        ipAddress: request.ip,
      });
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
            financeApproved: true,
            financeApprovedAt: approvedAt,
            timelineStage: "DEPOSIT_PAID" as const,
            paidAmount: hasRemainingDeposit
              ? Number(existing.immediateAmount)
              : existing.detail.totalAmount,
            remainingBalance: hasRemainingDeposit
              ? existing.detail.remainingBalance
              : 0,
            ...(hasRemainingDeposit ? {} : { balanceDueDate: null }),
            ...(isBalanceReview
              ? {
                  items: existing.detail.items.map((item) => ({
                    ...item,
                    remainingBalance: 0,
                  })),
                }
              : {}),
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

        if (isBalanceReview) {
          await pool.query(
            `UPDATE order_items
             SET balance_amount = 0,
                 remaining_balance = 0,
                 balance_paid_status = 'PAID',
                 settlement_status = 'PAID'
             WHERE order_id = $1`,
            [orderId],
          );
        }

        await pool.query(
          `UPDATE orders
           SET order_status = $2,
               payment_status = $3,
               settlement_status = $4,
               remaining_balance = $5,
               remaining_balance_amount = $5,
               balance_paid_status = $6,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [
            orderId,
            nextStatus,
            nextPaymentStatus,
            hasRemainingDeposit ? "WAITING_FOR_ARRIVAL" : "READY_TO_PACK",
            updatedOrder.detail.remainingBalance.toFixed(2),
            hasRemainingDeposit ? "PENDING" : "PAID",
          ],
        );
        await saveOrderSnapshotToDb(pool, updatedOrder);

        // Award loyalty points upon Finance approval (idempotent by tx id)
        try {
          const customerId = existing.ownerUserId;
          const paidAmount = updatedOrder.detail.paidAmount;
          const earnedPoints = Math.floor(Math.max(0, paidAmount) / 50);
          if (customerId && earnedPoints > 0) {
            const txId = `tx-earn-order-${orderId}`;
            const existingTx = await pool.query(
              `SELECT id FROM points_ledger WHERE id = $1`,
              [txId],
            );
            if (existingTx.rows.length === 0) {
              await pool.query(
                `INSERT INTO user_points (user_id, points) VALUES ($1, 0) ON CONFLICT (user_id) DO NOTHING`,
                [customerId],
              );
              const ptsRes = await pool.query<{ points: number }>(
                `UPDATE user_points
                 SET points = points + $2, updated_at = CURRENT_TIMESTAMP
                 WHERE user_id = $1
                 RETURNING points`,
                [customerId, earnedPoints],
              );
              const nextBalance = Number(ptsRes.rows[0]?.points ?? earnedPoints);
              await pool.query(
                `INSERT INTO points_ledger (id, user_id, tx_type, amount, balance_after, description, reference_id)
                 VALUES ($1, $2, 'EARN_ORDER', $3, $4, $5, $6)
                 ON CONFLICT (id) DO NOTHING`,
                [
                  txId,
                  customerId,
                  earnedPoints,
                  nextBalance,
                  `รับแต้มจากคำสั่งซื้อ ${updatedOrder.detail.orderNumber} (อนุมัติโดยฝ่ายการเงิน)`,
                  String(orderId),
                ],
              );
            }
          }
        } catch (pointsErr) {
          console.warn("Could not credit earned points on slip approval:", pointsErr);
        }
        await recordAuditLog(pool, {
          performedByUserId: request.user?.id ?? 9004,
          action: "MANUAL_SLIP_APPROVE",
          resourceType: "order",
          resourceId: orderId,
          oldValues: { status: existing.detail.status, paymentStatus: existing.detail.paymentStatus },
          newValues: { status: nextStatus, paymentStatus: nextPaymentStatus },
          ipAddress: request.ip,
        });
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
            paymentStatus:
              existing.detail.paymentReviewStage === "BALANCE"
                ? ("DEPOSIT_PAID" as const)
                : ("UNPAID" as const),
            financeApproved: false,
            paymentRejectionReason: String(reason),
          },
        };

        await pool.query(
          `UPDATE orders SET order_status = 'PAYMENT_REJECTED', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [orderId],
        );
        await saveOrderSnapshotToDb(pool, updatedOrder);
        await recordAuditLog(pool, {
          performedByUserId: request.user?.id ?? 9004,
          action: "SLIP_REJECT",
          resourceType: "order",
          resourceId: orderId,
          oldValues: { status: existing.detail.status },
          newValues: { status: "PAYMENT_REJECTED", reason },
          ipAddress: request.ip,
        });
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
        const slipImageDataUrl =
          typeof request.body.slipImageDataUrl === "string"
            ? request.body.slipImageDataUrl
            : null;
        const savedSlipImageUrl = slipImageDataUrl
          ? saveDataUrlSlipToDisk(orderId, slipImageDataUrl)
          : null;

        const updatedOrder = {
          ...existing,
          detail: {
            ...existing.detail,
            status: "PAYMENT_REVIEW_PENDING" as const,
            financeApproved: false,
            paymentRejectionReason: null,
            paymentSlipFileName: fileName,
            ...(savedSlipImageUrl ? { paymentSlipImageUrl: savedSlipImageUrl } : {}),
          },
        };

        await pool.query(
          `UPDATE orders SET order_status = 'PAYMENT_REVIEW_PENDING', settlement_status = 'PAYMENT_REVIEW_PENDING', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [orderId],
        );
        await saveOrderSnapshotToDb(pool, updatedOrder);
        await recordAuditLog(pool, {
          performedByUserId: request.user?.id ?? 9001,
          action: "SLIP_RESUBMIT",
          resourceType: "order",
          resourceId: orderId,
          oldValues: { status: existing.detail.status },
          newValues: { status: "PAYMENT_REVIEW_PENDING", fileName },
          ipAddress: request.ip,
        });
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
        await recordAuditLog(pool, {
          performedByUserId: request.user?.id ?? 9003,
          action: "FIGURE_ARRIVED",
          resourceType: "order",
          resourceId: orderId,
          oldValues: { status: existing.detail.status },
          newValues: { status: "AWAITING_BALANCE_PAYMENT", balanceDueDate: dueDate.toISOString() },
          ipAddress: request.ip,
        });
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
        await recordAuditLog(pool, {
          performedByUserId: request.user?.id ?? 9003,
          action: "SHIPMENT_ADVANCE",
          resourceType: "order",
          resourceId: orderId,
          oldValues: { status: existing.detail.status },
          newValues: { status: nextOrderStatus },
          ipAddress: request.ip,
        });
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
        await recordAuditLog(pool, {
          performedByUserId: request.user?.id ?? 9003,
          action: "ORDER_SHIPPED",
          resourceType: "order",
          resourceId: orderId,
          oldValues: { status: existing.detail.status },
          newValues: { status: "SHIPPED", trackingNumber, carrier },
          ipAddress: request.ip,
        });
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

  /**
   * PATCH /api/orders/:orderId/shipping-address
   * Updates shipping address for preorder before packing stage (TC-ADR-09).
   */
  router.patch(
    "/:orderId/shipping-address",
    async (request: Request, response: Response): Promise<void> => {
      const parsedId = positiveIntegerSchema.safeParse(request.params.orderId);
      if (!parsedId.success) {
        response
          .status(400)
          .json({ success: false, error: { message: "หมายเลขคำสั่งซื้อไม่ถูกต้อง" } });
        return;
      }

      const orderId = parsedId.data;
      const existing = await getOrderSnapshotFromDb(pool, orderId);
      if (!existing) {
        response
          .status(404)
          .json({ success: false, error: { code: "NOT_FOUND", message: "ไม่พบคำสั่งซื้อ" } });
        return;
      }

      const status = existing.detail.status;
      // TC-ADR-09: If ready to pack, shipped, delivered, or cancelled, reject with CANNOT_CHANGE_ADDRESS
      if (
        status === "READY_TO_PACK" ||
        status === "SHIPPED" ||
        status === "DELIVERED" ||
        status === "CANCELLED"
      ) {
        response.status(400).json({
          success: false,
          error: {
            code: "CANNOT_CHANGE_ADDRESS",
            message: "ไม่สามารถแก้ไขที่อยู่ได้เนื่องจากคำสั่งซื้ออยู่ในขั้นตอนการแพ็คหรือจัดส่งแล้ว",
          },
        });
        return;
      }

      const newAddress = request.body.shippingAddress || request.body;
      if (!newAddress || !newAddress.recipientName || !newAddress.addressLine) {
        response.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "ข้อมูลที่อยู่จัดส่งไม่ครบถ้วน" },
        });
        return;
      }

      const updatedOrder = {
        ...existing,
        detail: {
          ...existing.detail,
          shippingAddress: {
            ...existing.detail.shippingAddress,
            ...newAddress,
          },
        },
      };

      await saveOrderSnapshotToDb(pool, updatedOrder);
      await recordAuditLog(pool, {
        performedByUserId: request.user?.id ?? 9001,
        action: "UPDATE_SHIPPING_ADDRESS",
        resourceType: "order",
        resourceId: orderId,
        oldValues: { shippingAddress: existing.detail.shippingAddress },
        newValues: { shippingAddress: updatedOrder.detail.shippingAddress },
        ipAddress: request.ip,
      });

      response.json({ success: true, order: updatedOrder });
    },
  );

  /**
   * GET /api/orders/:orderId/shipments
   * Retrieves shipment records and tracking numbers.
   */
  router.get(
    "/:orderId/shipments",
    async (request: Request, response: Response): Promise<void> => {
      const parsedId = positiveIntegerSchema.safeParse(request.params.orderId);
      if (!parsedId.success) {
        response
          .status(400)
          .json({ success: false, error: { message: "หมายเลขคำสั่งซื้อไม่ถูกต้อง" } });
        return;
      }

      const order = await getOrderSnapshotFromDb(pool, parsedId.data);
      if (!order) {
        response
          .status(404)
          .json({ success: false, error: { code: "NOT_FOUND", message: "ไม่พบคำสั่งซื้อ" } });
        return;
      }

      response.json({
        success: true,
        data: {
          orderId: order.detail.id,
          shipments: order.detail.shipments || [],
        },
      });
    },
  );

  /**
   * POST /api/orders/admin/preorders/cancel-batch
   * Manufacturer cancellation: cancel batch preorders and mark for 100% refund (TC-PRE-08, FR-10.1, FR-10.2).
   */
  router.post(
    "/admin/preorders/cancel-batch",
    async (request: Request, response: Response): Promise<void> => {
      try {
        const {
          variantId,
          cancellationReason = "ผู้ผลิตประกาศยกเลิกการผลิตฟิกเกอร์ (Cancelled by Manufacturer)",
        } = request.body;
        const allOrders = await listOrderSnapshotsFromDb(pool);
        let cancelledCount = 0;
        const affectedOrderIds: number[] = [];

        for (const order of allOrders) {
          const hasTargetVariant = variantId
            ? order.detail.items.some(
                (item) => item.variantId === variantId || (item as any).id === variantId,
              )
            : order.detail.isPreorder;

          if (
            hasTargetVariant &&
            order.detail.status !== "CANCELLED" &&
            order.detail.status !== "REFUNDED"
          ) {
            const oldStatus = order.detail.status;
            const updatedOrder = {
              ...order,
              detail: {
                ...order.detail,
                status: "REFUND_PENDING" as any,
                cancellationReason,
                timeline: [
                  ...order.detail.timeline,
                  {
                    status: "REFUND_PENDING",
                    label: `ยกเลิกโดยผู้ผลิต - รอคืนเงินมัดจำ 100% (${cancellationReason})`,
                    occurredAt: new Date().toISOString(),
                  },
                ],
              },
            };
            await saveOrderSnapshotToDb(pool, updatedOrder);
            await pool.query(
              `UPDATE orders SET order_status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
              [order.detail.id],
            );
            affectedOrderIds.push(order.detail.id);
            cancelledCount++;

            await recordAuditLog(pool, {
              performedByUserId: request.user?.id ?? 9002,
              action: "MANUFACTURER_CANCEL_BATCH",
              resourceType: "order",
              resourceId: order.detail.id,
              oldValues: { status: oldStatus },
              newValues: { status: "REFUND_PENDING", reason: cancellationReason },
              ipAddress: request.ip,
            });
          }
        }

        response.json({
          success: true,
          data: {
            cancelledCount,
            affectedOrderIds,
            status: "REFUND_PENDING",
            refundPolicy: "FULL_REFUND_100_PERCENT",
          },
        });
      } catch (error) {
        console.error("Failed to cancel preorder batch:", error);
        response.status(500).json({
          success: false,
          error: { message: "ไม่สามารถยกเลิกคำสั่งซื้อพรีออเดอร์แบบกลุ่มได้" },
        });
      }
    },
  );


  return router;
}

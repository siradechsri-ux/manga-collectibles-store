import { NextFunction, Request, RequestHandler, Response, Router } from "express";
import { Pool } from "pg";
import { z } from "zod";
import {
  createSlipUploadController,
  SlipUploadResponseLocals,
} from "../controllers/slipUpload.controller";
import { SlipVerificationService } from "../checkout/slipVerificationService";
import { uploadSingleSlip } from "../middlewares/upload.middleware";

interface OrderOwnerRow {
  id: number;
  user_id: number;
}

const orderIdParamsSchema = z
  .object({
    orderId: z
      .string()
      .regex(/^[1-9]\d*$/, "หมายเลขคำสั่งซื้อต้องเป็นจำนวนเต็มบวก")
      .transform(Number)
      .refine(Number.isSafeInteger, "หมายเลขคำสั่งซื้อเกินค่าที่ระบบรองรับ"),
  })
  .strict();

function sendAuthorizationError(
  response: Response,
  status: number,
  code: string,
  message: string,
): void {
  response.status(status).json({
    success: false,
    error: { code, message },
  });
}

export function authorizeOrderOwnerOrAdmin(pool: Pool): RequestHandler {
  return async (
    request: Request,
    response: Response<unknown, SlipUploadResponseLocals>,
    next: NextFunction,
  ): Promise<void> => {
    const user = request.user;
    if (!user || !Number.isSafeInteger(user.id) || user.id <= 0) {
      sendAuthorizationError(response, 401, "UNAUTHENTICATED", "กรุณาเข้าสู่ระบบ");
      return;
    }

    const parsedParams = orderIdParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      sendAuthorizationError(response, 400, "INVALID_ORDER_ID", "หมายเลขคำสั่งซื้อไม่ถูกต้อง");
      return;
    }

    try {
      const result = await pool.query<OrderOwnerRow>(
        `SELECT id, user_id
         FROM orders
         WHERE id = $1`,
        [parsedParams.data.orderId],
      );
      const order = result.rows[0];
      if (!order) {
        sendAuthorizationError(response, 404, "ORDER_NOT_FOUND", "ไม่พบคำสั่งซื้อ");
        return;
      }

      const isAdmin = user.role === "ADMIN";
      if (!isAdmin && order.user_id !== user.id) {
        sendAuthorizationError(
          response,
          403,
          "ORDER_ACCESS_FORBIDDEN",
          "คุณไม่มีสิทธิ์ส่งสลิปสำหรับคำสั่งซื้อนี้",
        );
        return;
      }

      response.locals.authorizedOrderOwnerId = order.user_id;
      response.locals.isOrderOwnerAdmin = isAdmin;
      next();
    } catch (error) {
      console.error("Failed to authorize order slip upload.", error);
      sendAuthorizationError(
        response,
        500,
        "ORDER_AUTHORIZATION_FAILED",
        "ไม่สามารถตรวจสอบสิทธิ์คำสั่งซื้อได้ในขณะนี้",
      );
    }
  };
}

export interface PaymentRouteMiddleware {
  authenticateToken: RequestHandler;
}

export function createPaymentRouter(
  pool: Pool,
  slipVerificationService: SlipVerificationService,
  middleware: PaymentRouteMiddleware,
): Router {
  const router = Router();
  router.post(
    "/api/orders/:orderId/slip",
    middleware.authenticateToken,
    authorizeOrderOwnerOrAdmin(pool),
    uploadSingleSlip,
    createSlipUploadController(slipVerificationService),
  );
  return router;
}

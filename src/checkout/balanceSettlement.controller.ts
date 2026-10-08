import { Request, RequestHandler, Response, Router } from "express";
import { z } from "zod";
import {
  BalanceSettlementError,
  BalanceSettlementService,
  SettleOrderBalanceResponse,
  MarkFigureArrivedResponse,
} from "./balanceSettlementService";

export interface BalanceSettlementUser {
  id: number;
}

export interface VerifiedBalancePayment {
  verified: boolean;
  transactionId: string;
  amount: string;
  currency: string;
}

interface BalanceSettlementResponseLocals {
  paymentConfirmation?: VerifiedBalancePayment;
}

interface AuthenticatedBalanceRequest extends Request {
  user?: BalanceSettlementUser;
}

export interface BalanceSettlementSuccessResponse<T> {
  success: true;
  data: T;
}

export interface BalanceSettlementErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

const numericRouteIdSchema = z
  .string()
  .regex(/^[1-9]\d*$/, "ต้องเป็นเลขจำนวนเต็มบวก")
  .transform(Number)
  .refine(Number.isSafeInteger, "หมายเลขเกินค่าที่ระบบรองรับ");

function sendError(
  response: Response<
    BalanceSettlementSuccessResponse<
      MarkFigureArrivedResponse | SettleOrderBalanceResponse
    > | BalanceSettlementErrorResponse
  >,
  error: unknown,
): void {
  if (error instanceof BalanceSettlementError) {
    response.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  console.error("Balance settlement request failed.", error);
  response.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "ไม่สามารถดำเนินการยอดคงเหลือได้ในขณะนี้",
    },
  });
}

export function createMarkFigureArrivedController(
  settlementService: BalanceSettlementService,
): RequestHandler {
  return async (request, response): Promise<void> => {
    const parsedVariantId = numericRouteIdSchema.safeParse(request.params.variantId);
    if (!parsedVariantId.success) {
      response.status(400).json({
        success: false,
        error: {
          code: "INVALID_VARIANT_ID",
          message: "หมายเลข variant ไม่ถูกต้อง",
        },
      });
      return;
    }

    try {
      const data = await settlementService.markFigureArrived(parsedVariantId.data);
      response.status(200).json({ success: true, data });
    } catch (error) {
      sendError(response, error);
    }
  };
}

export function createPayOrderBalanceController(
  settlementService: BalanceSettlementService,
): RequestHandler {
  return async (request, response): Promise<void> => {
    const req = request as AuthenticatedBalanceRequest;
    if (!req.user || !Number.isSafeInteger(req.user.id) || req.user.id <= 0) {
      response.status(401).json({
        success: false,
        error: {
          code: "UNAUTHENTICATED",
          message: "กรุณาเข้าสู่ระบบก่อนชำระยอดคงเหลือ",
        },
      });
      return;
    }

    const parsedOrderId = numericRouteIdSchema.safeParse(request.params.orderId);
    if (!parsedOrderId.success) {
      response.status(400).json({
        success: false,
        error: {
          code: "INVALID_ORDER_ID",
          message: "หมายเลขคำสั่งซื้อไม่ถูกต้อง",
        },
      });
      return;
    }

    const responseWithLocals = response as Response<
      BalanceSettlementSuccessResponse<SettleOrderBalanceResponse> |
        BalanceSettlementErrorResponse,
      BalanceSettlementResponseLocals
    >;
    const payment = responseWithLocals.locals.paymentConfirmation;
    if (!payment?.verified) {
      response.status(402).json({
        success: false,
        error: {
          code: "BALANCE_PAYMENT_NOT_VERIFIED",
          message: "ยังไม่ได้รับการยืนยันการชำระเงินจากผู้ให้บริการ",
        },
      });
      return;
    }

    try {
      const data = await settlementService.settleOrderBalance(
        parsedOrderId.data,
        req.user.id,
        payment,
      );
      response.status(200).json({ success: true, data });
    } catch (error) {
      sendError(response, error);
    }
  };
}

export interface BalanceSettlementRouteMiddleware {
  requireCustomerAuthentication: RequestHandler;
  requireAdminAuthentication: RequestHandler;
  requireVerifiedBalancePayment: RequestHandler;
}

export function createBalanceSettlementRouter(
  settlementService: BalanceSettlementService,
  middleware: BalanceSettlementRouteMiddleware,
): Router {
  const router = Router();

  router.patch(
    "/api/admin/figures/:variantId/mark-arrived",
    middleware.requireAdminAuthentication,
    createMarkFigureArrivedController(settlementService),
  );

  router.post(
    "/api/orders/:orderId/pay-balance",
    middleware.requireCustomerAuthentication,
    middleware.requireVerifiedBalancePayment,
    createPayOrderBalanceController(settlementService),
  );

  return router;
}

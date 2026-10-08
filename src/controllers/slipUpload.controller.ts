import { Request, RequestHandler, Response } from "express";
import { z } from "zod";
import {
  DuplicateSlipError,
  InvalidSlipError,
  SlipVerificationError,
  SlipVerificationResponse,
  SlipVerificationService,
} from "../checkout/slipVerificationService";

export interface SlipUploadSuccessResponse {
  success: true;
  data: {
    orderId: number;
    paymentStage: "INITIAL" | "BALANCE";
    paymentStatus: "PAID" | "DEPOSIT_PAID";
    transactionRef: string;
    verifiedAmount: string;
    verifiedAt: string;
    settlementStatus: string;
    message: string;
  };
}

export interface SlipUploadFailureResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type SlipUploadResponse =
  | SlipUploadSuccessResponse
  | SlipUploadFailureResponse;

export interface SlipUploadResponseLocals {
  authorizedOrderOwnerId?: number;
  isOrderOwnerAdmin?: boolean;
}

const orderParamsSchema = z
  .object({
    orderId: z
      .string()
      .regex(/^[1-9]\d*$/, "orderId ต้องเป็นเลขจำนวนเต็มบวก")
      .transform(Number)
      .refine(Number.isSafeInteger, "orderId เกินค่าที่ระบบรองรับ"),
  })
  .strict();

function paymentMessage(result: SlipVerificationResponse): string {
  if (result.paymentStage === "BALANCE") {
    return "ยืนยันการชำระยอดคงเหลือแล้ว คำสั่งซื้อพร้อมเข้าสู่กระบวนการจัดส่ง";
  }
  if (result.paymentStatus === "DEPOSIT_PAID") {
    return "ยืนยันการชำระมัดจำแล้ว";
  }
  return "ยืนยันการชำระเงินแล้ว";
}

function sendVerificationError(
  response: Response<SlipUploadResponse>,
  error: unknown,
): void {
  if (error instanceof SlipVerificationError) {
    const isBadSlip =
      error instanceof InvalidSlipError ||
      error instanceof DuplicateSlipError ||
      error.code === "UNSUPPORTED_SLIP_TYPE";
    response.status(isBadSlip ? 400 : error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  console.error("Slip verification request failed.", error);
  response.status(500).json({
    success: false,
    error: {
      code: "SLIP_VERIFICATION_FAILED",
      message: "ไม่สามารถตรวจสอบสลิปได้ในขณะนี้",
    },
  });
}

export function createSlipUploadController(
  slipVerificationService: SlipVerificationService,
): RequestHandler {
  return async (
    request: Request,
    response: Response<SlipUploadResponse, SlipUploadResponseLocals>,
  ): Promise<void> => {
    const parsedParams = orderParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      response.status(400).json({
        success: false,
        error: {
          code: "INVALID_ORDER_ID",
          message: "หมายเลขคำสั่งซื้อไม่ถูกต้อง",
        },
      });
      return;
    }

    const file = request.file;
    if (!file) {
      response.status(400).json({
        success: false,
        error: {
          code: "SLIP_FILE_REQUIRED",
          message: "กรุณาแนบไฟล์สลิปในช่อง slip",
        },
      });
      return;
    }

    const userId =
      response.locals.isOrderOwnerAdmin === true
        ? response.locals.authorizedOrderOwnerId
        : request.user?.id;
    if (!Number.isSafeInteger(userId) || userId === undefined || userId <= 0) {
      response.status(401).json({
        success: false,
        error: {
          code: "UNAUTHENTICATED",
          message: "กรุณาเข้าสู่ระบบก่อนส่งสลิป",
        },
      });
      return;
    }

    try {
      const result = await slipVerificationService.verifyAndApplyPayment({
        orderId: parsedParams.data.orderId,
        userId,
        file,
      });
      response.status(200).json({
        success: true,
        data: {
          ...result,
          message: paymentMessage(result),
        },
      });
    } catch (error) {
      sendVerificationError(response, error);
    }
  };
}

import fs from "node:fs";
import path from "node:path";
import { Request, RequestHandler, Response } from "express";
import { z } from "zod";
import {
  DuplicateSlipError,
  InvalidSlipError,
  SlipVerificationError,
  SlipVerificationResponse,
  SlipVerificationService,
} from "../checkout/slipVerificationService";
import { getOrderSnapshotFromDb, saveOrderSnapshotToDb } from "../db/database";

const SLIPS_UPLOAD_DIR = path.resolve(process.cwd(), "uploads", "slips");

function extensionForMime(mimeType: string): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

function saveSlipImageToDisk(orderId: number, file: Express.Multer.File): string {
  fs.mkdirSync(SLIPS_UPLOAD_DIR, { recursive: true });
  const timestamp = Date.now();
  const ext = extensionForMime(file.mimetype);
  const fileName = `order-${orderId}-${timestamp}.${ext}`;
  const fullPath = path.join(SLIPS_UPLOAD_DIR, fileName);
  fs.writeFileSync(fullPath, file.buffer);
  return `/api/orders/${orderId}/slip-image?v=${timestamp}`;
}

export interface SlipUploadSuccessResponse {
  success: true;
  data: {
    orderId: number;
    paymentStage: "INITIAL" | "BALANCE";
    paymentStatus: "PAID" | "DEPOSIT_PAID" | "PENDING_REVIEW";
    orderStatus: "PAYMENT_REVIEW_PENDING";
    transactionRef: string;
    verifiedAmount: string;
    verifiedAt: string;
    settlementStatus: string;
    slipImageUrl: string;
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
    return "ส่งสลิปชำระยอดคงเหลือเรียบร้อยแล้ว อยู่ระหว่างรอฝ่ายการเงินตรวจสอบ";
  }
  return "ส่งสลิปเรียบร้อยแล้ว อยู่ระหว่างรอฝ่ายการเงินตรวจสอบ";
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

      const slipImageUrl = saveSlipImageToDisk(parsedParams.data.orderId, file);

      // Synchronize order_snapshots in PostgreSQL -> send to Finance in PAYMENT_REVIEW_PENDING
      try {
        const existingSnap = await getOrderSnapshotFromDb(
          slipVerificationService.pool,
          parsedParams.data.orderId,
        );
        if (existingSnap) {
          const isBalance = result.paymentStage === "BALANCE";
          const updatedSnap = {
            ...existingSnap,
            detail: {
              ...existingSnap.detail,
              status: "PAYMENT_REVIEW_PENDING" as const,
              paymentStatus: isBalance
                ? ("DEPOSIT_PAID" as const)
                : ("UNPAID" as const),
              paymentReviewStage: result.paymentStage,
              financeApproved: false,
              paymentRejectionReason: null,
              paymentSlipFileName: file.originalname || "uploaded_slip.jpg",
              paymentSlipImageUrl: slipImageUrl,
              timeline: existingSnap.detail.timeline.map((event) =>
                event.stage === "ORDER_PLACED"
                  ? {
                      ...event,
                      label: "ส่งสลิปแล้ว · รอฝ่ายการเงินตรวจสอบ",
                      occurredAt: event.occurredAt ?? result.verifiedAt,
                    }
                  : event,
              ),
            },
          };
          await saveOrderSnapshotToDb(slipVerificationService.pool, updatedSnap);
        }
      } catch (snapErr) {
        console.warn("Could not update order snapshot after slip upload:", snapErr);
      }

      response.status(200).json({
        success: true,
        data: {
          ...result,
          orderStatus: "PAYMENT_REVIEW_PENDING",
          slipImageUrl,
          message: paymentMessage(result),
        },
      });
    } catch (error) {
      sendVerificationError(response, error);
    }
  };
}

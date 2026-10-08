import { Request, RequestHandler, Response } from "express";
import {
  UnifiedCheckoutError,
  UnifiedCheckoutResponse,
  UnifiedCheckoutService,
} from "./unifiedCheckoutService";
import { generatePromptPayQrDataUrl } from "../services/paymentQr.service";

export interface CheckoutAuthenticatedUser {
  id: number;
}

export interface UnifiedCheckoutSuccessResponse {
  success: true;
  data: UnifiedCheckoutResponse;
}

export interface UnifiedCheckoutFailureResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

type UnifiedCheckoutRequest = Request<
  Record<string, never>,
  UnifiedCheckoutSuccessResponse | UnifiedCheckoutFailureResponse,
  unknown
> & {
  user?: CheckoutAuthenticatedUser;
};

export function createUnifiedCheckoutController(
  checkoutService: UnifiedCheckoutService,
  createPaymentQr: (amount: number) => Promise<string> = generatePromptPayQrDataUrl,
): RequestHandler {
  return async (request, response: Response): Promise<void> => {
    const req = request as UnifiedCheckoutRequest;
    if (!req.user || !Number.isSafeInteger(req.user.id) || req.user.id <= 0) {
      response.status(401).json({
        success: false,
        error: {
          code: "UNAUTHENTICATED",
          message: "ต้องเข้าสู่ระบบก่อนสั่งซื้อ",
        },
      });
      return;
    }

    try {
      const data = await checkoutService.createOrder(req.user.id, req.body);
      try {
        const immediateAmount = Number(data.immediateAmount);
        data.paymentQrCodeDataUrl = await createPaymentQr(immediateAmount);
      } catch (error) {
        console.error(
          `Order ${data.orderNumber} was created, but its PromptPay QR could not be generated.`,
          error,
        );
        data.paymentQrError =
          "สร้างคำสั่งซื้อสำเร็จ แต่ไม่สามารถสร้าง QR ชำระเงินได้ กรุณาติดต่อร้านค้าพร้อมเลขคำสั่งซื้อ";
      }
      response.status(201).json({ success: true, data });
    } catch (error) {
      if (error instanceof UnifiedCheckoutError) {
        response.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        });
        return;
      }

      console.error("Failed to create unified mixed-cart checkout.", error);
      response.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "ไม่สามารถดำเนินการสั่งซื้อได้ในขณะนี้",
        },
      });
    }
  };
}

import { Request, RequestHandler, Response, Router } from "express";
import { z } from "zod";
import {
  ClaimWaitlistResponse,
  JoinWaitlistResponse,
  WaitlistError,
  WaitlistService,
} from "./waitlist.service";

export interface WaitlistSuccessResponse<T> {
  success: true;
  data: T;
}

export interface WaitlistFailureResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

type WaitlistResponseBody =
  | WaitlistSuccessResponse<JoinWaitlistResponse | ClaimWaitlistResponse | {
      waitlistId: string;
      status: "CANCELLED";
    }>
  | WaitlistFailureResponse;

const routeIdSchema = z
  .string()
  .regex(/^[1-9]\d*$/, "หมายเลขต้องเป็นจำนวนเต็มบวก")
  .transform(Number)
  .refine(Number.isSafeInteger, "หมายเลขเกินค่าที่ระบบรองรับ");

function sendWaitlistError(response: Response<WaitlistResponseBody>, error: unknown): void {
  if (error instanceof WaitlistError) {
    response.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  console.error("Waitlist request failed.", error);
  response.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "ไม่สามารถดำเนินการคิวสินค้าหลุดจองได้ในขณะนี้",
    },
  });
}

function authenticatedUserId(request: Request, response: Response): number | null {
  const userId = request.user?.id;
  if (!Number.isSafeInteger(userId) || userId === undefined || userId <= 0) {
    response.status(401).json({
      success: false,
      error: {
        code: "UNAUTHENTICATED",
        message: "กรุณาเข้าสู่ระบบก่อนใช้งานคิวสินค้าหลุดจอง",
      },
    });
    return null;
  }
  return userId;
}

export function createJoinWaitlistController(service: WaitlistService): RequestHandler {
  return async (request, response: Response<WaitlistResponseBody>): Promise<void> => {
    const userId = authenticatedUserId(request, response);
    if (userId === null) {
      return;
    }
    const parsedVariantId = routeIdSchema.safeParse(request.params.variantId);
    if (!parsedVariantId.success) {
      response.status(400).json({
        success: false,
        error: {
          code: "INVALID_VARIANT_ID",
          message: "หมายเลขสินค้าไม่ถูกต้อง",
        },
      });
      return;
    }

    try {
      const data = await service.joinWaitlist(userId, parsedVariantId.data);
      response.status(201).json({ success: true, data });
    } catch (error) {
      sendWaitlistError(response, error);
    }
  };
}

export function createClaimWaitlistController(service: WaitlistService): RequestHandler {
  return async (request, response: Response<WaitlistResponseBody>): Promise<void> => {
    const userId = authenticatedUserId(request, response);
    if (userId === null) {
      return;
    }

    try {
      const data = await service.claimOffer(userId, request.body);
      response.status(201).json({ success: true, data });
    } catch (error) {
      sendWaitlistError(response, error);
    }
  };
}

export function createCancelWaitlistController(service: WaitlistService): RequestHandler {
  return async (request, response: Response<WaitlistResponseBody>): Promise<void> => {
    const userId = authenticatedUserId(request, response);
    if (userId === null) {
      return;
    }

    try {
      const data = await service.cancelEntry(userId, request.params.waitlistId);
      response.status(200).json({ success: true, data });
    } catch (error) {
      sendWaitlistError(response, error);
    }
  };
}

export interface WaitlistRouteMiddleware {
  requireCustomerAuthentication: RequestHandler;
}

export function createWaitlistRouter(
  service: WaitlistService,
  middleware: WaitlistRouteMiddleware,
): Router {
  const router = Router();
  router.post(
    "/api/figures/:variantId/waitlist",
    middleware.requireCustomerAuthentication,
    createJoinWaitlistController(service),
  );
  router.post(
    "/api/waitlist/claim",
    middleware.requireCustomerAuthentication,
    createClaimWaitlistController(service),
  );
  router.post(
    "/api/waitlist/:waitlistId/cancel",
    middleware.requireCustomerAuthentication,
    createCancelWaitlistController(service),
  );
  return router;
}

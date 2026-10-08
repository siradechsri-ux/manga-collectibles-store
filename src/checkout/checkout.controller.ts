import { Request, RequestHandler, Response } from "express";
import {
  CheckoutError,
  CheckoutService,
  CreateOrderResponseDTO,
} from "./checkout.service";

export interface CreateOrderRequestBody {
  items: Array<{
    productVariantId: number;
    quantity: number;
  }>;
  shippingFee: number | string;
  shippingPolicy: string;
}

export interface AuthenticatedUser {
  id: number;
}

export interface CreateOrderSuccessResponse {
  success: true;
  data: CreateOrderResponseDTO;
}

export interface CreateOrderErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

type AuthenticatedRequest = Request<
  Record<string, never>,
  CreateOrderSuccessResponse | CreateOrderErrorResponse,
  CreateOrderRequestBody
> & {
  user?: AuthenticatedUser;
};

export function createCheckoutController(checkoutService: CheckoutService): RequestHandler {
  return async (request, response: Response): Promise<void> => {
    const req = request as AuthenticatedRequest;
    if (!req.user || !Number.isSafeInteger(req.user.id) || req.user.id <= 0) {
      response.status(401).json({
        success: false,
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication is required to create an order.",
        },
      });
      return;
    }

    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      response.status(400).json({
        success: false,
        error: {
          code: "INVALID_REQUEST_BODY",
          message: "A JSON request body is required.",
        },
      });
      return;
    }

    try {
      const data = await checkoutService.createOrder({
        userId: req.user.id,
        items: req.body.items,
        shippingFee: req.body.shippingFee,
        shippingPolicy: req.body.shippingPolicy,
      });

      response.status(201).json({ success: true, data });
    } catch (error) {
      if (error instanceof CheckoutError) {
        response.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        });
        return;
      }

      console.error("Failed to create checkout order.", error);
      response.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to create the order at this time.",
        },
      });
    }
  };
}

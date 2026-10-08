import { Request, RequestHandler, Response, Router } from "express";
import {
  TaxInvoiceError,
  TaxInvoiceResponse,
  TaxInvoiceService,
  TaxProfileResponse,
} from "./taxInvoice.service";
import {
  taxInvoiceOrderParamsSchema,
} from "./taxInvoice.schemas";

export interface TaxInvoiceSuccessResponse<T> {
  success: true;
  data: T;
}

export interface TaxInvoiceFailureResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

type TaxInvoiceJsonResponse =
  | TaxInvoiceSuccessResponse<TaxInvoiceResponse | TaxProfileResponse | null>
  | TaxInvoiceFailureResponse;

function sendTaxInvoiceError(
  response: Response<TaxInvoiceJsonResponse | Buffer>,
  error: unknown,
): void {
  if (error instanceof TaxInvoiceError) {
    response.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }
  console.error("Tax invoice request failed.", error);
  response.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "ไม่สามารถดำเนินการใบกำกับภาษีได้ในขณะนี้",
    },
  });
}

function getAuthenticatedUserId(request: Request, response: Response): number | null {
  const userId = request.user?.id;
  if (!Number.isSafeInteger(userId) || userId === undefined || userId <= 0) {
    response.status(401).json({
      success: false,
      error: {
        code: "UNAUTHENTICATED",
        message: "กรุณาเข้าสู่ระบบก่อนทำรายการ",
      },
    });
    return null;
  }
  return userId;
}

export function createTaxInvoiceController(service: TaxInvoiceService): RequestHandler {
  return async (request, response: Response<TaxInvoiceJsonResponse>): Promise<void> => {
    const userId = getAuthenticatedUserId(request, response);
    if (userId === null) {
      return;
    }
    const parsedParams = taxInvoiceOrderParamsSchema.safeParse(request.params);
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

    try {
      const invoice = await service.createTaxInvoice(
        parsedParams.data.orderId,
        userId,
        request.body,
      );
      const pdfFileUrl = await service.generateInvoicePdf(Number(invoice.taxInvoiceId));
      response.status(201).json({
        success: true,
        data: { ...invoice, pdfFileUrl },
      });
    } catch (error) {
      sendTaxInvoiceError(response, error);
    }
  };
}

export function downloadTaxInvoiceController(service: TaxInvoiceService): RequestHandler {
  return async (
    request,
    response: Response<TaxInvoiceJsonResponse | Buffer>,
  ): Promise<void> => {
    const userId = getAuthenticatedUserId(request, response);
    if (userId === null) {
      return;
    }
    const parsedParams = taxInvoiceOrderParamsSchema.safeParse(request.params);
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

    try {
      const file = await service.downloadTaxInvoice(parsedParams.data.orderId, userId);
      response
        .status(200)
        .type("application/pdf")
        .setHeader("Content-Disposition", `attachment; filename="${file.fileName}"`)
        .setHeader("Content-Length", String(file.contents.byteLength))
        .send(file.contents);
    } catch (error) {
      sendTaxInvoiceError(response, error);
    }
  };
}

export function getSavedTaxProfileController(service: TaxInvoiceService): RequestHandler {
  return async (
    request,
    response: Response<TaxInvoiceJsonResponse>,
  ): Promise<void> => {
    const userId = getAuthenticatedUserId(request, response);
    if (userId === null) {
      return;
    }
    try {
      const profile = await service.getSavedTaxProfile(userId);
      response.status(200).json({ success: true, data: profile });
    } catch (error) {
      sendTaxInvoiceError(response, error);
    }
  };
}

export interface TaxInvoiceRouteMiddleware {
  requireCustomerAuthentication: RequestHandler;
}

export function createTaxInvoiceRouter(
  service: TaxInvoiceService,
  middleware: TaxInvoiceRouteMiddleware,
): Router {
  const router = Router();
  router.get(
    "/api/me/tax-profile",
    middleware.requireCustomerAuthentication,
    getSavedTaxProfileController(service),
  );
  router.post(
    "/api/orders/:orderId/tax-invoice",
    middleware.requireCustomerAuthentication,
    createTaxInvoiceController(service),
  );
  router.get(
    "/api/orders/:orderId/tax-invoice/download",
    middleware.requireCustomerAuthentication,
    downloadTaxInvoiceController(service),
  );
  return router;
}

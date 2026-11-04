import { Request, RequestHandler, Response } from "express";
import {
  UnifiedCheckoutError,
  UnifiedCheckoutResponse,
  UnifiedCheckoutService,
} from "./unifiedCheckoutService";
import { generatePromptPayQrDataUrl } from "../services/paymentQr.service";
import { findAdminCheckoutVariant } from "../mocks/admin-products.mock";
import {
  makeShipments,
  makeTimeline,
  saveOrderSnapshotToDb,
} from "../db/database";
import type { OrderTrackingLineItem } from "../components/OrderDetailView";
import type { MockStoredOrder } from "../mocks/storage.mock";

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

function mapProductCategory(
  productType: string,
): "MANGA" | "FIGURE" | "LIGHT_NOVEL" | "GOODS" | "PLAMO" | "ACCESSORY" {
  if (productType.startsWith("MANGA")) return "MANGA";
  if (productType.startsWith("LIGHT_NOVEL")) return "LIGHT_NOVEL";
  if (productType.startsWith("FIGURE")) return "FIGURE";
  if (productType.startsWith("PLAMO")) return "PLAMO";
  if (productType.startsWith("GOODS")) return "GOODS";
  return "ACCESSORY";
}

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

      // Persist rich order snapshot into PostgreSQL order_snapshots table
      try {
        const bodyObj = (req.body && typeof req.body === "object" ? req.body : {}) as Record<string, any>;
        const createdAt = new Date().toISOString();
        const orderIdNum = Number(data.orderId);
        const lineItems: OrderTrackingLineItem[] = data.items.map((item, idx) => {
          const catalogInfo = findAdminCheckoutVariant(item.productVariantId);
          return {
            id: `${orderIdNum}-${idx + 1}`,
            productVariantId: item.productVariantId,
            title: catalogInfo?.title ?? `สินค้า #${item.productVariantId}`,
            productType: catalogInfo?.productType ?? mapProductCategory(item.productType),
            ...(catalogInfo?.volumeNumber
              ? {
                  volumeLabel: `เล่ม ${catalogInfo.volumeNumber}${
                    catalogInfo.variantLabel ? ` · ${catalogInfo.variantLabel}` : ""
                  }`,
                }
              : {}),
            quantity: item.quantity,
            paymentType: item.paymentType,
            lineTotal: Number(item.lineTotal),
            remainingBalance: Number(item.balanceAmount),
            isPreorder: item.isPreorder,
          };
        });

        let mangaVatExempt = 0;
        let vatableGross = Number(data.shippingFee);
        for (const li of lineItems) {
          if (li.productType === "MANGA" || li.productType === "LIGHT_NOVEL") {
            mangaVatExempt += li.lineTotal;
          } else {
            vatableGross += li.lineTotal;
          }
        }
        const vatBase = vatableGross / 1.07;
        const vatAmount = vatableGross - vatBase;

        const taxReq = bodyObj.taxInvoiceRequest;
        const storedOrder: MockStoredOrder = {
          ownerUserId: req.user.id,
          detail: {
            id: orderIdNum,
            orderNumber: data.orderNumber,
            createdAt,
            status: "UNPAID",
            timelineStage: "ORDER_PLACED",
            paymentStatus: "UNPAID",
            totalAmount: Number(data.totalAmount),
            paidAmount: 0,
            remainingBalance: Number(data.remainingBalanceAmount),
            balanceDueDate: null,
            items: lineItems,
            timeline: makeTimeline(createdAt),
            shipments: makeShipments(lineItems),
          },
          paymentQrCodeDataUrl:
            data.paymentQrCodeDataUrl ||
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
          inventoryReserved: true,
          ...(bodyObj.shippingAddress ? { shippingAddress: bodyObj.shippingAddress } : {}),
          immediateAmount: data.immediateAmount,
          taxSummary: {
            mangaVatExemptAmount: mangaVatExempt.toFixed(2),
            figureAndShippingTaxableGross: vatableGross.toFixed(2),
            vatBaseAmount: vatBase.toFixed(2),
            vatAmount: vatAmount.toFixed(2),
            taxInvoiceRequested: Boolean(taxReq),
            ...(taxReq
              ? {
                  taxInvoiceCustomer: {
                    entityType: taxReq.entityType,
                    companyOrName: taxReq.companyOrName,
                    maskedTaxId: taxReq.taxId,
                    address: `${taxReq.addressLine} ${taxReq.subdistrict} ${taxReq.district} ${taxReq.province} ${taxReq.postalCode}`,
                  },
                }
              : {}),
          },
        };

        await saveOrderSnapshotToDb(checkoutService.pool, storedOrder);
      } catch (snapErr) {
        console.warn("Could not save order snapshot to PostgreSQL:", snapErr);
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

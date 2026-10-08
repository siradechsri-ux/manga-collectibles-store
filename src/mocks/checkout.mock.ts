import { randomInt } from "node:crypto";
import { z } from "zod";
import { generateMockQrDataUrl } from "./qr.mock";
import { findMockVariant } from "./products.mock";
import type { MockCatalogVariant } from "./products.mock";
import { findAdminCheckoutVariant } from "./admin-products.mock";

const taxInvoiceRequestSchema = z
  .object({
    entityType: z.enum(["INDIVIDUAL", "CORPORATION"]),
    taxId: z.string().trim().min(10).max(20),
    companyOrName: z.string().trim().min(1).max(200),
    branchType: z.enum(["HEAD_OFFICE", "BRANCH"]).optional(),
    branchCode: z.string().max(20).optional(),
    addressLine: z.string().trim().min(1).max(300),
    addressVillage: z.string().max(100),
    street: z.string().max(150),
    subdistrict: z.string().trim().min(1).max(120),
    district: z.string().trim().min(1).max(120),
    province: z.string().trim().min(1).max(120),
    postalCode: z.string().regex(/^\d{5}$/),
    contactEmail: z.string().email().or(z.literal("")),
    contactPhone: z.string().max(30),
    saveForNextTime: z.boolean(),
  })
  .strict();

const catalogSnapshotSchema = z.array(
  z
    .object({
      productVariantId: z.number().int().positive().safe(),
      productType: z.enum(["MANGA", "FIGURE"]),
      title: z.string().min(1),
      volumeNumber: z.number().int().positive().optional(),
      variantLabel: z.string().optional(),
      price: z.number().finite().positive(),
      weightGrams: z.number().int().nonnegative(),
      isPreorder: z.boolean(),
      stockOrQuotaRemaining: z.number().int().nonnegative(),
      figure: z
        .object({
          fullPrice: z.number().finite().positive(),
          depositAmount: z.number().finite().nonnegative(),
          boxDimensions: z
            .object({
              widthCm: z.number().positive(),
              lengthCm: z.number().positive(),
              heightCm: z.number().positive(),
            })
            .strict(),
        })
        .strict()
        .optional(),
    })
    .strict(),
);

const checkoutInputSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            productVariantId: z.number().int().positive().safe(),
            quantity: z.number().int().positive().max(99),
            productType: z.enum([
              "MANGA_INSTOCK",
              "MANGA_PREORDER",
              "FIGURE_FULL",
              "FIGURE_DEPOSIT",
            ]),
          })
          .strict(),
      )
      .min(1)
      .max(100),
    carrier: z.enum(["FLASH", "THAI_POST"]),
    serviceAreaCode: z.string().trim().min(1).max(50),
    shippingPolicy: z.string().trim().min(1).max(100),
    shippingAddress: z
      .object({
        recipientName: z.string().trim().min(2).max(150),
        recipientPhone: z.string().trim().min(8).max(30),
        addressLine: z.string().trim().min(1).max(300),
        addressVillage: z.string().trim().max(100).optional(),
        street: z.string().trim().max(150).optional(),
        subdistrict: z.string().trim().min(1).max(120),
        district: z.string().trim().min(1).max(120),
        province: z.string().trim().min(1).max(120),
        postalCode: z.string().trim().regex(/^\d{5}$/),
      })
      .strict(),
    taxInvoiceRequest: taxInvoiceRequestSchema.optional(),
    catalogSnapshot: catalogSnapshotSchema.optional(),
  })
  .strict();

export interface MockCheckoutItem {
  productVariantId: number;
  productType: "MANGA_INSTOCK" | "MANGA_PREORDER" | "FIGURE_FULL" | "FIGURE_DEPOSIT";
  title: string;
  volumeNumber?: number;
  variantLabel?: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  paymentType: "FULL" | "DEPOSIT";
  balanceAmount: string;
  isPreorder: boolean;
  productCategory: "MANGA" | "FIGURE";
}

export interface MockCheckoutResponse {
  orderId: number;
  orderNumber: string;
  totalAmount: string;
  shippingFee: string;
  immediateAmount: string;
  remainingBalanceAmount: string;
  paymentStatus: "UNPAID";
  paymentQrCodeDataUrl: string;
  taxSummary: {
    mangaVatExemptAmount: string;
    figureAndShippingTaxableGross: string;
    vatBaseAmount: string;
    vatAmount: string;
    taxInvoiceRequested: boolean;
    taxInvoiceCustomer?: {
      entityType: "INDIVIDUAL" | "CORPORATION";
      companyOrName: string;
      maskedTaxId: string;
      address: string;
    };
  };
  items: MockCheckoutItem[];
  shippingAddress: z.infer<typeof checkoutInputSchema>["shippingAddress"];
  carrier: "FLASH" | "THAI_POST";
  shippingPolicy: string;
  createdAt: string;
}

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

function fromCents(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

export class MockCheckoutError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export async function createMockCheckout(input: unknown): Promise<MockCheckoutResponse> {
  const parsed = checkoutInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new MockCheckoutError(
      400,
      parsed.error.issues.map((issue) => issue.message).join("; "),
    );
  }

  const normalizedItems = new Map<
    number,
    (typeof parsed.data.items)[number]
  >();
  for (const item of parsed.data.items) {
    const existing = normalizedItems.get(item.productVariantId);
    if (existing && existing.productType !== item.productType) {
      throw new MockCheckoutError(400, "ประเภทสินค้าในรายการเดียวกันไม่ตรงกัน");
    }
    normalizedItems.set(item.productVariantId, {
      ...item,
      quantity: (existing?.quantity ?? 0) + item.quantity,
    });
  }

  let fullMerchandiseCents = 0;
  let immediateMerchandiseCents = 0;
  let remainingBalanceCents = 0;
  let mangaTaxExemptCents = 0;
  let figureTaxableGrossCents = 0;
  let billableWeightGrams = 0;
  const items: MockCheckoutItem[] = [];

  for (const item of normalizedItems.values()) {
    const snapshotVariant = parsed.data.catalogSnapshot?.find(
      (candidate) => candidate.productVariantId === item.productVariantId,
    );
    const variant: MockCatalogVariant | null = snapshotVariant
      ? {
          productType: snapshotVariant.productType,
          title: snapshotVariant.title,
          ...(snapshotVariant.volumeNumber
            ? { volumeNumber: snapshotVariant.volumeNumber }
            : {}),
          ...(snapshotVariant.variantLabel
            ? { variantLabel: snapshotVariant.variantLabel }
            : {}),
          price: snapshotVariant.price,
          weightGrams: snapshotVariant.weightGrams,
          isPreorder: snapshotVariant.isPreorder,
          stockOrQuotaRemaining: snapshotVariant.stockOrQuotaRemaining,
          ...(snapshotVariant.figure
            ? {
                figure: {
                  id: String(snapshotVariant.productVariantId),
                  slug: String(snapshotVariant.productVariantId),
                  name: snapshotVariant.title,
                  series: "",
                  character: "",
                  manufacturer: "",
                  scale: "",
                  heightMm: 0,
                  janCode: "",
                  images: [],
                  fullPrice: snapshotVariant.figure.fullPrice,
                  depositAmount: snapshotVariant.figure.depositAmount,
                  preorderDeadline: "",
                  releaseMonthYear: "",
                  status: snapshotVariant.isPreorder
                    ? "PREORDER_OPEN"
                    : "IN_STOCK",
                  stockOrQuotaRemaining: snapshotVariant.stockOrQuotaRemaining,
                  boxDimensions: snapshotVariant.figure.boxDimensions,
                },
              }
            : {}),
        }
      : process.env.NEXT_PUBLIC_USE_MOCK === "true"
        ? findAdminCheckoutVariant(item.productVariantId) ??
          findMockVariant(item.productVariantId)
        : findMockVariant(item.productVariantId);
    if (!variant) {
      throw new MockCheckoutError(404, `ไม่พบสินค้า variant ${item.productVariantId}`);
    }
    const expectedProductType =
      item.productType === "MANGA_INSTOCK" || item.productType === "MANGA_PREORDER"
        ? "MANGA"
        : "FIGURE";
    if (variant.productType !== expectedProductType) {
      throw new MockCheckoutError(409, `ประเภทสินค้า variant ${item.productVariantId} ไม่ตรงกัน`);
    }
    if (
      (item.productType === "MANGA_PREORDER" || item.productType === "FIGURE_DEPOSIT") &&
      !variant.isPreorder
    ) {
      throw new MockCheckoutError(409, "สินค้านี้ไม่เปิดรับพรีออเดอร์แล้ว");
    }
    if (
      item.productType === "MANGA_INSTOCK" &&
      (variant.isPreorder || variant.stockOrQuotaRemaining < item.quantity)
    ) {
      throw new MockCheckoutError(409, "สินค้าพร้อมส่งมีจำนวนไม่เพียงพอ");
    }
    if (
      item.productType === "FIGURE_DEPOSIT" &&
      (!variant.figure ||
        variant.figure.depositAmount <= 0 ||
        variant.figure.depositAmount >= variant.figure.fullPrice)
    ) {
      throw new MockCheckoutError(409, "สินค้านี้ไม่รองรับการวางมัดจำ");
    }
    if (
      variant.isPreorder &&
      variant.stockOrQuotaRemaining < item.quantity
    ) {
      throw new MockCheckoutError(409, "โควตาพรีออเดอร์ไม่เพียงพอ");
    }
    if (
      item.productType === "FIGURE_FULL" &&
      !variant.isPreorder &&
      variant.stockOrQuotaRemaining < item.quantity
    ) {
      throw new MockCheckoutError(409, "สินค้าฟิกเกอร์มีจำนวนไม่เพียงพอ");
    }

    const fullUnitCents = toCents(variant.price);
    const depositUnitCents =
      item.productType === "FIGURE_DEPOSIT" && variant.figure
        ? toCents(variant.figure.depositAmount)
        : fullUnitCents;
    const balanceUnitCents =
      item.productType === "FIGURE_DEPOSIT"
        ? fullUnitCents - depositUnitCents
        : 0;
    const lineFullCents = fullUnitCents * item.quantity;
    const lineImmediateCents = depositUnitCents * item.quantity;
    const lineBalanceCents = balanceUnitCents * item.quantity;
    const unitPriceCents =
      item.productType === "FIGURE_DEPOSIT" ? fullUnitCents : fullUnitCents;
    const title = `${variant.title}${
      variant.volumeNumber ? ` เล่ม ${variant.volumeNumber}` : ""
    }${variant.variantLabel ? ` (${variant.variantLabel})` : ""}`;

    fullMerchandiseCents += lineFullCents;
    immediateMerchandiseCents += lineImmediateCents;
    remainingBalanceCents += lineBalanceCents;
    if (variant.productType === "MANGA") {
      mangaTaxExemptCents += lineFullCents;
    } else {
      figureTaxableGrossCents += lineFullCents;
    }
    if (variant.figure) {
      const dimensions = variant.figure.boxDimensions;
      const volumetricWeightGrams =
        (dimensions.widthCm * dimensions.lengthCm * dimensions.heightCm * 1_000) /
        5_000;
      billableWeightGrams +=
        Math.max(variant.weightGrams, volumetricWeightGrams) * item.quantity;
    } else {
      billableWeightGrams += variant.weightGrams * item.quantity;
    }

    items.push({
      productVariantId: item.productVariantId,
      productType: item.productType,
      title,
      ...(variant.volumeNumber ? { volumeNumber: variant.volumeNumber } : {}),
      ...(variant.variantLabel ? { variantLabel: variant.variantLabel } : {}),
      quantity: item.quantity,
      unitPrice: fromCents(unitPriceCents),
      lineTotal: fromCents(lineFullCents),
      paymentType: item.productType === "FIGURE_DEPOSIT" ? "DEPOSIT" : "FULL",
      balanceAmount: fromCents(lineBalanceCents),
      isPreorder: variant.isPreorder,
      productCategory: variant.productType,
    });
  }

  const shippingFeeCents =
    billableWeightGrams <= 500
      ? 4_000
      : billableWeightGrams <= 1_000
        ? 6_000
        : billableWeightGrams <= 2_000
          ? 8_000
          : 12_000;
  const immediateAmountCents = immediateMerchandiseCents + shippingFeeCents;
  const totalAmountCents = fullMerchandiseCents + shippingFeeCents;
  const taxGrossCents = figureTaxableGrossCents + shippingFeeCents;
  const vatAmountCents = Math.round((taxGrossCents * 7) / 107);
  const taxInvoiceRequest = parsed.data.taxInvoiceRequest;
  const orderId = randomInt(100_000_000, 999_999_999);
  const orderNumber = `DEMO-${Date.now().toString(36).toUpperCase()}-${orderId}`;
  const createdAt = new Date().toISOString();
  const paymentQrCodeDataUrl = await generateMockQrDataUrl({
    orderId,
    orderNumber,
    amount: fromCents(immediateAmountCents),
  });

  return {
    orderId,
    orderNumber,
    totalAmount: fromCents(totalAmountCents),
    shippingFee: fromCents(shippingFeeCents),
    immediateAmount: fromCents(immediateAmountCents),
    remainingBalanceAmount: fromCents(remainingBalanceCents),
    paymentStatus: "UNPAID",
    paymentQrCodeDataUrl,
    taxSummary: {
      mangaVatExemptAmount: fromCents(mangaTaxExemptCents),
      figureAndShippingTaxableGross: fromCents(taxGrossCents),
      vatBaseAmount: fromCents(taxGrossCents - vatAmountCents),
      vatAmount: fromCents(vatAmountCents),
      taxInvoiceRequested: taxInvoiceRequest !== undefined,
      ...(taxInvoiceRequest
        ? {
            taxInvoiceCustomer: {
              entityType: taxInvoiceRequest.entityType,
              companyOrName: taxInvoiceRequest.companyOrName,
              maskedTaxId: `${"*".repeat(
                Math.max(0, taxInvoiceRequest.taxId.length - 4),
              )}${taxInvoiceRequest.taxId.slice(-4)}`,
              address: [
                taxInvoiceRequest.addressLine,
                taxInvoiceRequest.addressVillage,
                taxInvoiceRequest.street,
                taxInvoiceRequest.subdistrict,
                taxInvoiceRequest.district,
                taxInvoiceRequest.province,
                taxInvoiceRequest.postalCode,
              ]
                .filter(Boolean)
                .join(" "),
            },
          }
        : {}),
    },
    items,
    shippingAddress: parsed.data.shippingAddress,
    carrier: parsed.data.carrier,
    shippingPolicy: parsed.data.shippingPolicy,
    createdAt,
  };
}

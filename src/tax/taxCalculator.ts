export type TaxableProductCategory = "BOOK" | "FIGURE";

export interface TaxOrderLine {
  description: string;
  quantity: number;
  unitPrice: string;
  category: TaxableProductCategory;
  productVariantId: number;
}

export interface TaxCalculationInput {
  items: readonly TaxOrderLine[];
  shippingFee: string;
}

export interface TaxInvoiceLineCalculation {
  description: string;
  quantity: number;
  unitPrice: string;
  grossAmount: string;
  productVariantId: number | null;
  vatCategory: "VAT_EXEMPT" | "VAT_7";
}

export interface TaxCalculationResult {
  lines: TaxInvoiceLineCalculation[];
  nonVatAmount: string;
  vatableAmount: string;
  vatableNetAmount: string;
  vatAmount: string;
  shippingFee: string;
  totalAmount: string;
}

function parseCents(value: string, fieldName: string): bigint {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) {
    throw new TypeError(`${fieldName} ต้องเป็นจำนวนเงินที่มีทศนิยมไม่เกิน 2 ตำแหน่ง`);
  }
  return BigInt(match[1]) * 100n + BigInt((match[2] ?? "").padEnd(2, "0") || "0");
}

function formatCents(value: bigint): string {
  if (value < 0n) {
    throw new RangeError("Tax amounts cannot be negative.");
  }
  return `${value / 100n}.${String(value % 100n).padStart(2, "0")}`;
}

export function calculateMixedTax(input: TaxCalculationInput): TaxCalculationResult {
  if (!input.items.length) {
    throw new TypeError("ไม่พบรายการสินค้าในคำสั่งซื้อ");
  }
  const shippingCents = parseCents(input.shippingFee, "ค่าจัดส่ง");
  const lines: TaxInvoiceLineCalculation[] = [];
  let nonVatCents = 0n;
  let figureGrossCents = 0n;

  for (const item of input.items) {
    if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
      throw new TypeError("จำนวนสินค้าในคำสั่งซื้อต้องเป็นจำนวนเต็มบวก");
    }
    const unitPriceCents = parseCents(item.unitPrice, "ราคาสินค้า");
    const grossCents = unitPriceCents * BigInt(item.quantity);
    const vatCategory = item.category === "BOOK" ? "VAT_EXEMPT" : "VAT_7";
    if (item.category === "BOOK") {
      nonVatCents += grossCents;
    } else {
      figureGrossCents += grossCents;
    }

    lines.push({
      description: item.description,
      quantity: item.quantity,
      unitPrice: formatCents(unitPriceCents),
      grossAmount: formatCents(grossCents),
      productVariantId: item.productVariantId,
      vatCategory,
    });
  }

  lines.push({
    description: "ค่าจัดส่ง",
    quantity: 1,
    unitPrice: formatCents(shippingCents),
    grossAmount: formatCents(shippingCents),
    productVariantId: null,
    vatCategory: "VAT_7",
  });

  const vatableGrossCents = figureGrossCents + shippingCents;
  const vatableNetCents = (vatableGrossCents * 100n + 53n) / 107n;
  const vatCents = vatableGrossCents - vatableNetCents;
  const totalCents = nonVatCents + vatableGrossCents;

  return {
    lines,
    nonVatAmount: formatCents(nonVatCents),
    vatableAmount: formatCents(vatableGrossCents),
    vatableNetAmount: formatCents(vatableNetCents),
    vatAmount: formatCents(vatCents),
    shippingFee: formatCents(shippingCents),
    totalAmount: formatCents(totalCents),
  };
}

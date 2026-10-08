import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import ThaiBahtText from "thai-baht-text";

export type TaxInvoicePdfEntityType = "INDIVIDUAL" | "CORPORATION";
export type TaxInvoicePdfBranchType = "HEAD_OFFICE" | "BRANCH";
export type TaxInvoicePdfVatCategory = "VAT_EXEMPT" | "VAT_7";

export interface TaxInvoicePdfSeller {
  legalName: string;
  address: string;
  taxId: string;
  branchType: TaxInvoicePdfBranchType;
  branchCode: string;
  phone: string;
  email: string;
}

export interface TaxInvoicePdfBuyer {
  entityType: TaxInvoicePdfEntityType;
  name: string;
  taxId: string;
  branchType: TaxInvoicePdfBranchType | null;
  branchCode: string | null;
  addressLine: string;
  addressVillage?: string | null;
  street?: string | null;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
  phone: string;
  email: string;
}

export interface TaxInvoicePdfLineItem {
  description: string;
  quantity: number;
  unitPrice: string;
  grossAmount: string;
  vatCategory: TaxInvoicePdfVatCategory;
}

export interface TaxInvoicePdfTaxSummary {
  nonVatAmount: string;
  vatableGrossAmount: string;
  vatableNetAmount: string;
  vatRate: "7%";
  vatAmount: string;
  grandTotal: string;
}

export interface TaxInvoicePdfDocumentProps {
  seller: TaxInvoicePdfSeller;
  buyer: TaxInvoicePdfBuyer;
  invoiceNumber: string;
  invoiceDate: Date | string;
  orderReference: string;
  items: readonly TaxInvoicePdfLineItem[];
  taxSummary: TaxInvoicePdfTaxSummary;
  paymentStatus: "PAID" | "DEPOSIT_PAID";
  currency?: "THB";
}

const sarabunRegular = "/fonts/Sarabun-Regular.ttf";
const sarabunBold = "/fonts/Sarabun-Bold.ttf";
const sarabunItalic = "/fonts/Sarabun-Italic.ttf";
const sarabunBoldItalic = "/fonts/Sarabun-BoldItalic.ttf";

Font.register({
  family: "Sarabun",
  fonts: [
    { src: sarabunRegular, fontWeight: "normal", fontStyle: "normal" },
    { src: sarabunBold, fontWeight: "bold", fontStyle: "normal" },
    { src: sarabunItalic, fontWeight: "normal", fontStyle: "italic" },
    { src: sarabunBoldItalic, fontWeight: "bold", fontStyle: "italic" },
  ],
});

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingRight: 30,
    paddingBottom: 30,
    paddingLeft: 30,
    fontFamily: "Sarabun",
    fontSize: 9,
    color: "#172033",
    backgroundColor: "#ffffff",
    lineHeight: 1.35,
  },
  text: {
    fontFamily: "Sarabun",
    fontSize: 9,
    color: "#172033",
    lineHeight: 1.35,
  },
  mutedText: {
    fontFamily: "Sarabun",
    fontSize: 8,
    color: "#64748b",
    lineHeight: 1.3,
  },
  boldText: {
    fontFamily: "Sarabun",
    fontWeight: "bold",
    fontSize: 9,
    color: "#172033",
    lineHeight: 1.35,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 13,
    borderBottomWidth: 1.5,
    borderBottomColor: "#334155",
  },
  sellerBlock: {
    width: "55%",
    paddingRight: 12,
  },
  documentBlock: {
    width: "45%",
    alignItems: "flex-end",
  },
  titleThai: {
    fontFamily: "Sarabun",
    fontWeight: "bold",
    fontSize: 17,
    color: "#0f172a",
    textAlign: "right",
  },
  titleEnglish: {
    fontFamily: "Sarabun",
    fontWeight: "bold",
    fontSize: 9,
    color: "#475569",
    textAlign: "right",
    marginTop: 1,
  },
  sellerName: {
    fontFamily: "Sarabun",
    fontWeight: "bold",
    fontSize: 13,
    color: "#0f172a",
    marginBottom: 3,
  },
  sellerDetail: {
    fontFamily: "Sarabun",
    fontSize: 8,
    color: "#334155",
    lineHeight: 1.4,
  },
  metaPanel: {
    marginTop: 10,
    padding: 9,
    backgroundColor: "#f8fafc",
    borderWidth: 0.7,
    borderColor: "#cbd5e1",
    borderRadius: 3,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  parties: {
    flexDirection: "row",
    marginTop: 12,
    gap: 10,
  },
  partyCard: {
    width: "50%",
    padding: 9,
    borderWidth: 0.7,
    borderColor: "#cbd5e1",
    borderRadius: 3,
    minHeight: 115,
  },
  sectionTitle: {
    fontFamily: "Sarabun",
    fontWeight: "bold",
    fontSize: 10,
    color: "#0f172a",
    marginBottom: 5,
  },
  partyDetail: {
    fontFamily: "Sarabun",
    fontSize: 8,
    color: "#334155",
    marginBottom: 2,
    lineHeight: 1.35,
  },
  table: {
    marginTop: 14,
    borderWidth: 0.7,
    borderColor: "#94a3b8",
    borderRadius: 2,
  },
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 5,
    paddingRight: 5,
    backgroundColor: "#eaf0f6",
    borderBottomWidth: 0.7,
    borderBottomColor: "#94a3b8",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    minHeight: 25,
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 5,
    paddingRight: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
  },
  tableFooterRow: {
    flexDirection: "row",
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 5,
    paddingRight: 5,
    backgroundColor: "#f8fafc",
    borderTopWidth: 0.6,
    borderTopColor: "#cbd5e1",
  },
  columnHeader: {
    fontFamily: "Sarabun",
    fontWeight: "bold",
    fontSize: 8,
    color: "#334155",
  },
  cell: {
    fontFamily: "Sarabun",
    fontSize: 8,
    color: "#172033",
    lineHeight: 1.3,
  },
  cellMuted: {
    fontFamily: "Sarabun",
    fontSize: 7,
    color: "#64748b",
    lineHeight: 1.25,
  },
  colIndex: { width: "7%" },
  colDescription: { width: "42%", paddingRight: 5 },
  colQuantity: { width: "11%", textAlign: "right" },
  colUnitPrice: { width: "18%", textAlign: "right" },
  colTotal: { width: "22%", textAlign: "right" },
  exemptTag: {
    fontFamily: "Sarabun",
    fontStyle: "italic",
    fontSize: 7,
    color: "#9a3412",
    marginTop: 2,
  },
  summaryArea: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    gap: 12,
  },
  wordsBox: {
    width: "43%",
    padding: 8,
    borderWidth: 0.7,
    borderColor: "#cbd5e1",
    borderRadius: 3,
    minHeight: 66,
  },
  taxTable: {
    width: "57%",
    borderWidth: 0.7,
    borderColor: "#94a3b8",
    borderRadius: 3,
  },
  taxRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 7,
    paddingRight: 7,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 7,
    paddingBottom: 7,
    paddingLeft: 7,
    paddingRight: 7,
    backgroundColor: "#eaf0f6",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 22,
    minHeight: 92,
  },
  noteBlock: {
    width: "54%",
    paddingRight: 12,
  },
  signatureBlock: {
    width: "30%",
    alignItems: "center",
    justifyContent: "flex-end",
    minHeight: 75,
  },
  signatureLine: {
    width: "100%",
    borderBottomWidth: 0.7,
    borderBottomColor: "#64748b",
    marginBottom: 5,
  },
  stamp: {
    position: "absolute",
    left: 0,
    bottom: 15,
    width: 82,
    height: 82,
    borderWidth: 1.5,
    borderColor: "#b91c1c",
    borderRadius: 41,
    alignItems: "center",
    justifyContent: "center",
    transform: "rotate(-12deg)",
  },
  stampText: {
    fontFamily: "Sarabun",
    fontWeight: "bold",
    fontSize: 9,
    color: "#b91c1c",
    textAlign: "center",
    lineHeight: 1.25,
  },
  watermark: {
    position: "absolute",
    top: 26,
    right: 30,
    paddingTop: 3,
    paddingBottom: 3,
    paddingLeft: 7,
    paddingRight: 7,
    borderWidth: 0.7,
    borderColor: "#15803d",
    borderRadius: 2,
  },
  watermarkText: {
    fontFamily: "Sarabun",
    fontWeight: "bold",
    fontSize: 7,
    color: "#15803d",
  },
  footer: {
    position: "absolute",
    left: 30,
    right: 30,
    bottom: 14,
    paddingTop: 5,
    borderTopWidth: 0.5,
    borderTopColor: "#cbd5e1",
    textAlign: "center",
  },
});

function formatAmount(amount: string, currency: "THB"): string {
  const parsed = Number(amount);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new TypeError(`Invalid ${currency} amount in invoice PDF.`);
  }
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parsed);
}

function formatInvoiceDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new TypeError("Invoice date must be a valid date.");
  }
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "long",
    timeZone: "Asia/Bangkok",
  }).format(date);
}

function fullAddress(buyer: TaxInvoicePdfBuyer): string {
  return [
    buyer.addressLine,
    buyer.addressVillage ? `หมู่ ${buyer.addressVillage}` : null,
    buyer.street ? `ถนน${buyer.street}` : null,
    `ตำบล/แขวง ${buyer.subdistrict}`,
    `อำเภอ/เขต ${buyer.district}`,
    buyer.province,
    buyer.postalCode,
  ]
    .filter((part): part is string => part !== null && part.length > 0)
    .join(" ");
}

function branchLabel(
  entityType: TaxInvoicePdfEntityType,
  branchType: TaxInvoicePdfBranchType | null,
  branchCode: string | null,
): string {
  if (entityType === "INDIVIDUAL") {
    return "บุคคลธรรมดา";
  }
  if (branchType === "HEAD_OFFICE") {
    return "สำนักงานใหญ่";
  }
  return `สาขาที่ ${branchCode ?? "ไม่ระบุ"}`;
}

function amountInBahtText(amount: string, currency: "THB"): string {
  const parsed = Number(amount);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > Number.MAX_SAFE_INTEGER) {
    throw new TypeError(`Invalid ${currency} amount for Thai amount-in-words.`);
  }
  return ThaiBahtText(parsed);
}

function amountToCents(amount: string, field: string): bigint {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(amount);
  if (!match) {
    throw new TypeError(`${field} must be a non-negative amount with up to two decimals.`);
  }
  return BigInt(match[1]) * 100n + BigInt((match[2] ?? "").padEnd(2, "0") || "0");
}

function validateDocumentTotals(
  items: readonly TaxInvoicePdfLineItem[],
  summary: TaxInvoicePdfTaxSummary,
): void {
  let exemptGrossCents = 0n;
  let taxableGrossCents = 0n;
  for (const item of items) {
    if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
      throw new TypeError("Invoice item quantity must be a positive integer.");
    }
    const lineTotalCents = amountToCents(item.grossAmount, "Item gross amount");
    if (item.vatCategory === "VAT_EXEMPT") {
      exemptGrossCents += lineTotalCents;
    } else {
      taxableGrossCents += lineTotalCents;
    }
  }
  const exemptSummaryCents = amountToCents(summary.nonVatAmount, "Non-VAT amount");
  const taxableSummaryCents = amountToCents(
    summary.vatableGrossAmount,
    "Vatable gross amount",
  );
  const taxableNetCents = amountToCents(summary.vatableNetAmount, "Vatable net amount");
  const vatCents = amountToCents(summary.vatAmount, "VAT amount");
  const grandTotalCents = amountToCents(summary.grandTotal, "Grand total");

  if (
    exemptGrossCents !== exemptSummaryCents ||
    taxableGrossCents !== taxableSummaryCents ||
    taxableNetCents + vatCents !== taxableSummaryCents ||
    exemptSummaryCents + taxableSummaryCents !== grandTotalCents
  ) {
    throw new TypeError("Invoice line items and mixed VAT summary do not reconcile.");
  }
}

export function TaxInvoicePdfDocument({
  seller,
  buyer,
  invoiceNumber,
  invoiceDate,
  orderReference,
  items,
  taxSummary,
  paymentStatus,
  currency = "THB",
}: TaxInvoicePdfDocumentProps) {
  const paidLabel = paymentStatus === "PAID" ? "ชำระเงินแล้ว" : "ได้รับชำระมัดจำแล้ว";
  validateDocumentTotals(items, taxSummary);

  return (
    <Document
      title={`ใบกำกับภาษี ${invoiceNumber}`}
      author={seller.legalName}
      subject="ใบกำกับภาษี / ใบเสร็จรับเงิน"
      language="th-TH"
    >
      <Page size="A4" orientation="portrait" style={styles.page} wrap>
        <View style={styles.header}>
          <View style={styles.sellerBlock}>
            <Text style={styles.sellerName}>{seller.legalName}</Text>
            <Text style={styles.sellerDetail}>{seller.address}</Text>
            <Text style={styles.sellerDetail}>เลขประจำตัวผู้เสียภาษี {seller.taxId}</Text>
            <Text style={styles.sellerDetail}>
              {seller.branchType === "HEAD_OFFICE"
                ? "สำนักงานใหญ่"
                : `สาขาที่ ${seller.branchCode}`}
            </Text>
            <Text style={styles.sellerDetail}>
              โทร. {seller.phone} · {seller.email}
            </Text>
          </View>
          <View style={styles.documentBlock}>
            <Text style={styles.titleThai}>ใบกำกับภาษี / ใบเสร็จรับเงิน</Text>
            <Text style={styles.titleEnglish}>TAX INVOICE / RECEIPT</Text>
            <Text style={[styles.text, { marginTop: 5 }]}>{paidLabel}</Text>
          </View>
        </View>

        <View style={styles.metaPanel}>
          <View style={styles.metaRow}>
            <Text style={styles.boldText}>เลขที่ใบกำกับภาษี (Invoice No.)</Text>
            <Text style={styles.text}>{invoiceNumber}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.boldText}>วันที่ออกเอกสาร</Text>
            <Text style={styles.text}>{formatInvoiceDate(invoiceDate)}</Text>
          </View>
          <View style={[styles.metaRow, { marginBottom: 0 }]}>
            <Text style={styles.boldText}>เลขที่คำสั่งซื้ออ้างอิง (Order Ref.)</Text>
            <Text style={styles.text}>{orderReference}</Text>
          </View>
        </View>

        <View style={styles.parties}>
          <View style={styles.partyCard}>
            <Text style={styles.sectionTitle}>ผู้ขาย (Seller)</Text>
            <Text style={styles.partyDetail}>{seller.legalName}</Text>
            <Text style={styles.partyDetail}>เลขประจำตัวผู้เสียภาษี {seller.taxId}</Text>
            <Text style={styles.partyDetail}>
              {seller.branchType === "HEAD_OFFICE"
                ? "สำนักงานใหญ่"
                : `สาขาที่ ${seller.branchCode}`}
            </Text>
            <Text style={styles.partyDetail}>{seller.address}</Text>
          </View>
          <View style={styles.partyCard}>
            <Text style={styles.sectionTitle}>ผู้ซื้อ (Buyer)</Text>
            <Text style={styles.partyDetail}>{buyer.name}</Text>
            <Text style={styles.partyDetail}>เลขประจำตัวผู้เสียภาษี {buyer.taxId}</Text>
            <Text style={styles.partyDetail}>
              {branchLabel(buyer.entityType, buyer.branchType, buyer.branchCode)}
            </Text>
            <Text style={styles.partyDetail}>{fullAddress(buyer)}</Text>
            <Text style={styles.partyDetail}>โทร. {buyer.phone} · {buyer.email}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader} fixed>
            <Text style={[styles.columnHeader, styles.colIndex]}>ลำดับ</Text>
            <Text style={[styles.columnHeader, styles.colDescription]}>รายการสินค้า / บริการ</Text>
            <Text style={[styles.columnHeader, styles.colQuantity]}>จำนวน</Text>
            <Text style={[styles.columnHeader, styles.colUnitPrice]}>ราคาต่อหน่วย</Text>
            <Text style={[styles.columnHeader, styles.colTotal]}>จำนวนเงิน</Text>
          </View>
          {items.map((item, index) => (
            <View style={styles.tableRow} key={`${item.description}-${index}`} wrap={false}>
              <Text style={[styles.cell, styles.colIndex]}>{index + 1}</Text>
              <View style={styles.colDescription}>
                <Text style={styles.cell}>{item.description}</Text>
                {item.vatCategory === "VAT_EXEMPT" ? (
                  <Text style={styles.exemptTag}>* ยกเว้นภาษีมูลค่าเพิ่ม</Text>
                ) : null}
              </View>
              <Text style={[styles.cell, styles.colQuantity]}>{item.quantity}</Text>
              <Text style={[styles.cell, styles.colUnitPrice]}>
                {formatAmount(item.unitPrice, currency)}
              </Text>
              <Text style={[styles.cell, styles.colTotal]}>
                {formatAmount(item.grossAmount, currency)}
              </Text>
            </View>
          ))}
          {items.length === 0 ? (
            <View style={styles.tableRow}>
              <Text style={styles.cell}>ไม่มีรายการสินค้า</Text>
            </View>
          ) : null}
          <View style={styles.tableFooterRow}>
            <Text style={[styles.boldText, { width: "60%" }]}>จำนวนรายการ</Text>
            <Text style={[styles.boldText, { width: "40%", textAlign: "right" }]}>
              {items.length} รายการ
            </Text>
          </View>
        </View>

        <View style={styles.summaryArea} wrap={false}>
          <View style={styles.wordsBox}>
            <Text style={styles.boldText}>จำนวนเงินตัวอักษร</Text>
            <Text style={[styles.text, { marginTop: 5 }]}>
              ({amountInBahtText(taxSummary.grandTotal, currency)})
            </Text>
            <Text style={[styles.mutedText, { marginTop: 5 }]}>{paidLabel}</Text>
          </View>
          <View style={styles.taxTable}>
            <View style={styles.taxRow}>
              <Text style={styles.text}>มูลค่าสินค้ายกเว้นภาษี *</Text>
              <Text style={styles.text}>
                {formatAmount(taxSummary.nonVatAmount, currency)}
              </Text>
            </View>
            <View style={styles.taxRow}>
              <Text style={styles.text}>มูลค่าก่อนภาษี (ฐานภาษี 7%)</Text>
              <Text style={styles.text}>
                {formatAmount(taxSummary.vatableNetAmount, currency)}
              </Text>
            </View>
            <View style={styles.taxRow}>
              <Text style={styles.text}>ภาษีมูลค่าเพิ่ม {taxSummary.vatRate}</Text>
              <Text style={styles.text}>{formatAmount(taxSummary.vatAmount, currency)}</Text>
            </View>
            <View style={styles.taxRow}>
              <Text style={styles.text}>ยอดรวมส่วนที่เสียภาษี (รวม VAT)</Text>
              <Text style={styles.text}>
                {formatAmount(taxSummary.vatableGrossAmount, currency)}
              </Text>
            </View>
            <View style={styles.grandTotalRow}>
              <Text style={styles.boldText}>ยอดรวมสุทธิ</Text>
              <Text style={styles.boldText}>
                {formatAmount(taxSummary.grandTotal, currency)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomRow} wrap={false}>
          <View style={styles.noteBlock}>
            <Text style={styles.boldText}>หมายเหตุ</Text>
            <Text style={styles.mutedText}>
              * รายการหนังสือ/มังงะเป็นรายการยกเว้นภาษีมูลค่าเพิ่ม
            </Text>
            <Text style={styles.mutedText}>
              ฟิกเกอร์ ของสะสม และค่าจัดส่งรวมภาษีมูลค่าเพิ่มในราคาแล้ว
            </Text>
            <Text style={styles.mutedText}>
              ออกเอกสารอิเล็กทรอนิกส์เมื่อรายการชำระเงินผ่านการยืนยัน
            </Text>
          </View>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.text}>ผู้รับเงิน / ผู้มีอำนาจลงนาม</Text>
            <Text style={styles.mutedText}>{seller.legalName}</Text>
          </View>
        </View>

        <View style={styles.stamp}>
          <Text style={styles.stampText}>เอกสาร{`\n`}อิเล็กทรอนิกส์</Text>
        </View>
        <View style={styles.watermark}>
          <Text style={styles.watermarkText}>ต้นฉบับ</Text>
        </View>
        <Text style={styles.footer} fixed>
          เอกสารนี้จัดทำในรูปแบบอิเล็กทรอนิกส์ · {invoiceNumber}
        </Text>
      </Page>
    </Document>
  );
}

export default TaxInvoicePdfDocument;

import PDFDocument from "pdfkit";
import { TaxCalculationResult } from "./taxCalculator";
import { isValidThaiTaxId } from "./thaiTaxValidator";

export interface TaxInvoiceSeller {
  name: string;
  taxId: string;
  address: string;
  email: string;
  phone: string;
}

export interface TaxInvoicePdfLine {
  description: string;
  quantity: number;
  unitPrice: string;
  grossAmount: string;
  vatCategory: "VAT_EXEMPT" | "VAT_7";
}

export interface TaxInvoicePdfData {
  invoiceNumber: string;
  issuedAt: Date;
  entityType: "INDIVIDUAL" | "CORPORATION";
  taxId: string;
  companyOrName: string;
  branchType: "HEAD_OFFICE" | "BRANCH" | null;
  branchCode: string | null;
  addressLine: string;
  addressVillage: string | null;
  street: string | null;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
  contactEmail: string;
  contactPhone: string;
  lines: TaxInvoicePdfLine[];
  calculation: TaxCalculationResult;
}

const thDateFormatter = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "long",
  timeZone: "Asia/Bangkok",
});

const thCurrencyFormatter = new Intl.NumberFormat("th-TH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatAmount(value: string): string {
  return thCurrencyFormatter.format(Number(value));
}

function customerAddress(data: TaxInvoicePdfData): string {
  return [
    data.addressLine,
    data.addressVillage ? `หมู่ ${data.addressVillage}` : null,
    data.street ? `ถนน${data.street}` : null,
    `ตำบล/แขวง ${data.subdistrict}`,
    `อำเภอ/เขต ${data.district}`,
    data.province,
    data.postalCode,
  ]
    .filter((part): part is string => part !== null)
    .join(" ");
}

export async function renderTaxInvoicePdf(
  data: TaxInvoicePdfData,
  seller: TaxInvoiceSeller,
  thaiFontPath: string,
): Promise<Buffer> {
  if (!isValidThaiTaxId(seller.taxId)) {
    throw new TypeError("Configured seller tax ID is invalid.");
  }
  if (!thaiFontPath.trim()) {
    throw new TypeError("A Thai-capable TrueType/OpenType font path is required.");
  }

  return new Promise<Buffer>((resolve, reject) => {
    const document = new PDFDocument({
      size: "A4",
      margins: { top: 42, bottom: 42, left: 42, right: 42 },
      info: {
        Title: `ใบกำกับภาษี ${data.invoiceNumber}`,
        Author: seller.name,
        Subject: "ใบกำกับภาษี / ใบเสร็จรับเงิน",
      },
    });
    const chunks: Buffer[] = [];
    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("error", reject);
    document.on("end", () => resolve(Buffer.concat(chunks)));

    try {
      document.font(thaiFontPath);
      document.fillColor("#111827");
      document.fontSize(17).text("ใบกำกับภาษี / ใบเสร็จรับเงิน", { align: "center" });
      document.moveDown(0.4);
      document.fontSize(13).text(seller.name, { align: "center" });
      document.fontSize(9).text(`เลขประจำตัวผู้เสียภาษี ${seller.taxId}`, { align: "center" });
      document.text(seller.address, { align: "center", width: 500 });
      document.text(`โทร. ${seller.phone} · ${seller.email}`, { align: "center" });
      document.moveDown(0.6);

      const left = 42;
      const right = 553;
      let y = document.y;
      document.strokeColor("#334155").lineWidth(0.8).moveTo(left, y).lineTo(right, y).stroke();
      y += 12;
      document.fontSize(10).text(`เลขที่เอกสาร: ${data.invoiceNumber}`, left, y);
      document.text(`วันที่ออก: ${thDateFormatter.format(data.issuedAt)}`, 330, y);
      y += 20;
      document.fontSize(10).text(`ชื่อผู้ซื้อ: ${data.companyOrName}`, left, y, { width: 500 });
      y += 17;
      document.text(`เลขประจำตัวผู้เสียภาษี: ${data.taxId}`, left, y);
      document.text(
        data.entityType === "CORPORATION"
          ? data.branchType === "HEAD_OFFICE"
            ? "สำนักงานใหญ่ (00000)"
            : `สาขา ${data.branchCode ?? ""}`
          : "บุคคลธรรมดา",
        330,
        y,
      );
      y += 17;
      document.text(`ที่อยู่: ${customerAddress(data)}`, left, y, { width: 500 });
      y += 34;
      document.text(`อีเมล: ${data.contactEmail}    โทรศัพท์: ${data.contactPhone}`, left, y);
      y += 20;

      document.fillColor("#f1f5f9").rect(left, y, right - left, 22).fill();
      document.fillColor("#111827").fontSize(9);
      document.text("รายการ", left + 5, y + 6, { width: 230 });
      document.text("จำนวน", left + 240, y + 6, { width: 45, align: "right" });
      document.text("ราคาต่อหน่วย", left + 292, y + 6, { width: 82, align: "right" });
      document.text("จำนวนเงิน", left + 380, y + 6, { width: 82, align: "right" });
      y += 28;

      for (const line of data.lines) {
        const label =
          line.vatCategory === "VAT_EXEMPT"
            ? `${line.description} *`
            : line.description;
        const descriptionHeight = document.heightOfString(label, { width: 225 });
        if (y + Math.max(24, descriptionHeight) > 720) {
          document.addPage();
          y = 42;
          document.fontSize(10).text(`ใบกำกับภาษี ${data.invoiceNumber} (ต่อ)`, left, y);
          y += 25;
        }
        document.fontSize(9).text(label, left + 5, y, { width: 225 });
        document.text(String(line.quantity), left + 240, y, { width: 45, align: "right" });
        document.text(formatAmount(line.unitPrice), left + 292, y, {
          width: 82,
          align: "right",
        });
        document.text(formatAmount(line.grossAmount), left + 380, y, {
          width: 82,
          align: "right",
        });
        y += Math.max(24, descriptionHeight + 8);
        document.strokeColor("#e2e8f0").lineWidth(0.4).moveTo(left, y).lineTo(right, y).stroke();
      }

      y += 12;
      document.fontSize(9).text("* รายการที่ได้รับยกเว้นภาษีมูลค่าเพิ่ม", left, y, {
        width: 260,
      });
      const summaryX = 290;
      y += 8;
      document.fontSize(9).text("ยอดยกเว้นภาษีมูลค่าเพิ่ม", summaryX, y, { width: 170 });
      document.text(formatAmount(data.calculation.nonVatAmount), 465, y, {
        width: 85,
        align: "right",
      });
      y += 17;
      document.text("มูลค่าสินค้า/บริการที่รวม VAT", summaryX, y, { width: 170 });
      document.text(formatAmount(data.calculation.vatableAmount), 465, y, {
        width: 85,
        align: "right",
      });
      y += 17;
      document.text("มูลค่าก่อนภาษี (VAT 7%)", summaryX, y, { width: 170 });
      document.text(formatAmount(data.calculation.vatableNetAmount), 465, y, {
        width: 85,
        align: "right",
      });
      y += 17;
      document.text("ภาษีมูลค่าเพิ่ม 7%", summaryX, y, { width: 170 });
      document.text(formatAmount(data.calculation.vatAmount), 465, y, {
        width: 85,
        align: "right",
      });
      y += 20;
      document.strokeColor("#334155").lineWidth(0.8).moveTo(summaryX, y).lineTo(right, y).stroke();
      y += 8;
      document.fontSize(12).text("ยอดรวมสุทธิ", summaryX, y, { width: 170 });
      document.text(formatAmount(data.calculation.totalAmount), 455, y, {
        width: 95,
        align: "right",
      });
      y += 45;

      if (y > 745) {
        document.addPage();
        y = 80;
      }
      document.fontSize(9).text("ผู้รับเงิน / ผู้มีอำนาจลงนาม", 335, y, {
        width: 210,
        align: "center",
      });
      document.moveTo(345, y + 38).lineTo(535, y + 38).stroke();
      document.fontSize(8).text("ออกโดยระบบอิเล็กทรอนิกส์", 345, y + 43, {
        width: 190,
        align: "center",
      });
      document.save();
      document
        .circle(115, y + 23, 35)
        .lineWidth(1.5)
        .strokeColor("#b91c1c")
        .stroke();
      document
        .fillColor("#b91c1c")
        .fontSize(8)
        .text("เอกสารอิเล็กทรอนิกส์", 83, y + 19, { width: 64, align: "center" });
      document.restore();
      document.fontSize(8).fillColor("#475569").text(
        "เอกสารฉบับนี้จัดทำในรูปแบบอิเล็กทรอนิกส์ โปรดเก็บรักษาไฟล์ต้นฉบับ",
        left,
        790,
        { width: 500, align: "center" },
      );
      document.end();
    } catch (error) {
      document.destroy();
      reject(error);
    }
  });
}

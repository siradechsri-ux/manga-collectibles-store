"use client";

import { Check, CheckCircle2, Download, Printer, QrCode, ShieldCheck, X } from "lucide-react";
import type { OrderTrackingDetail } from "./OrderDetailView";

interface TaxInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderTrackingDetail;
}

const moneyFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  minimumFractionDigits: 2,
});

export default function TaxInvoiceModal({
  isOpen,
  onClose,
  order,
}: TaxInvoiceModalProps) {
  if (!isOpen) return null;

  // Calculate VAT 0% vs VAT 7%
  // Books (MANGA, LIGHT_NOVEL) are VAT 0% exempt under Section 81(1)(ฉ) of the Thai Revenue Code
  // Collectibles (FIGURE, PLAMO, GOODS, ACCESSORY) are subject to 7% VAT (inclusive)
  const vat0Items = order.items.filter(
    (item) => item.productType === "MANGA" || item.productType === "LIGHT_NOVEL",
  );
  const vat7Items = order.items.filter(
    (item) => item.productType !== "MANGA" && item.productType !== "LIGHT_NOVEL",
  );

  const vat0Total = vat0Items.reduce((acc, i) => acc + i.lineTotal, 0);
  const vat7TotalGross = vat7Items.reduce((acc, i) => acc + i.lineTotal, 0);

  // VAT 7% inclusive formula: Base = Gross * 100 / 107; Tax = Gross - Base
  const vat7Base = vat7TotalGross > 0 ? (vat7TotalGross * 100) / 107 : 0;
  const vat7Amount = vat7TotalGross > 0 ? vat7TotalGross - vat7Base : 0;
  const grandTotal = order.totalAmount;

  const handlePrint = () => {
    window.print();
  };

  const invoiceNumber = `TAX-2026-${order.orderNumber}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-8 text-zinc-900 shadow-2xl my-8 dark:bg-zinc-900 dark:text-zinc-100 max-h-[92vh] overflow-y-auto">
        {/* Modal Controls (Hidden in Print) */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-6 print:hidden">
          <div className="flex items-center gap-2">
            <Printer size={18} className="text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-bold">
              ใบเสร็จรับเงิน / ใบกำกับภาษีอิเล็กทรอนิกส์ (e-Tax Invoice)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700 active:scale-95"
            >
              <Printer size={13} aria-hidden="true" />
              <span>สั่งพิมพ์ / บันทึก PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-200 p-1.5 text-zinc-400 hover:text-zinc-600 dark:border-zinc-700 dark:hover:text-zinc-200"
              aria-label="ปิดหน้าต่าง"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Printable Invoice Sheet */}
        <div className="border border-zinc-200 dark:border-zinc-700 rounded-2xl p-6 sm:p-8 bg-white dark:bg-zinc-950 text-xs">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
            <div>
              <p className="text-base font-black tracking-tight text-blue-900 dark:text-blue-400">
                บริษัท มังงะ คอลเลกทิเบิลส์ สโตร์ (ประเทศไทย) จำกัด
              </p>
              <p className="mt-1 text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                123 อาคารสยามสแควร์วัน ชั้น 3 ถนนพระรามที่ 1 แขวงปทุมวัน เขตปทุมวัน กรุงเทพมหานคร 10330
              </p>
              <p className="text-[11px] font-bold text-zinc-800 dark:text-zinc-300 mt-1">
                เลขประจำตัวผู้เสียภาษีอากร: 0-1055-67012-34-5 (สำนักงานใหญ่)
              </p>
            </div>

            <div className="sm:text-right shrink-0">
              <span className="inline-block rounded-md bg-zinc-900 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-white dark:bg-zinc-100 dark:text-zinc-950">
                ใบเสร็จรับเงิน / ใบกำกับภาษีเต็มรูป
              </span>
              <p className="mt-2 text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100">
                เลขที่: {invoiceNumber}
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                วันที่ออก: {new Date(order.createdAt).toLocaleDateString("th-TH")}
              </p>
            </div>
          </div>

          {/* Customer & Order Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-b border-zinc-200 dark:border-zinc-800 text-[11px]">
            <div>
              <span className="font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                ข้อมูลลูกค้าผู้ซื้อสินค้า:
              </span>
              <p className="font-bold text-zinc-900 dark:text-zinc-100">
                ลูกค้าสมาชิก (Manga Member)
              </p>
              <p className="text-zinc-600 dark:text-zinc-400">
                ที่อยู่จัดส่งตามระบบคำสั่งซื้อ
              </p>
            </div>

            <div className="sm:text-right">
              <span className="font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                อ้างอิงคำสั่งซื้อ:
              </span>
              <p className="font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                {order.orderNumber}
              </p>
              <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 mt-1">
                <Check size={10} aria-hidden="true" />
                <span>ชำระเงินเรียบร้อยแล้ว (PAID)</span>
              </span>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="py-4 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 font-bold uppercase tracking-wider">
                  <th className="pb-2 w-10">ลำดับ</th>
                  <th className="pb-2">รายการสินค้า</th>
                  <th className="pb-2 text-center w-16">ประเภทภาษี</th>
                  <th className="pb-2 text-center w-16">จำนวน</th>
                  <th className="pb-2 text-right w-24">จำนวนเงิน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-[11px]">
                {order.items.map((item, idx) => {
                  const isBook = item.productType === "MANGA" || item.productType === "LIGHT_NOVEL";
                  return (
                    <tr key={item.id} className="py-2.5">
                      <td className="py-2 text-zinc-500">{idx + 1}</td>
                      <td className="py-2 font-medium text-zinc-900 dark:text-zinc-100">
                        {item.title}
                        {item.volumeLabel ? ` (${item.volumeLabel})` : ""}
                      </td>
                      <td className="py-2 text-center font-bold text-zinc-500">
                        {isBook ? (
                          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] dark:bg-zinc-800">
                            ยกเว้น VAT
                          </span>
                        ) : (
                          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[9px] text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            VAT 7%
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-center text-zinc-600 dark:text-zinc-400">
                        {item.quantity}
                      </td>
                      <td className="py-2 text-right font-bold text-zinc-900 dark:text-zinc-100">
                        {moneyFormatter.format(item.lineTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Tax Breakdown Summary */}
          <div className="border-t-2 border-zinc-200 dark:border-zinc-800 pt-4 flex flex-col sm:flex-row justify-between gap-6 text-[11px]">
            <div className="max-w-xs space-y-1 text-zinc-500 dark:text-zinc-400">
              <p className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1">
                <ShieldCheck size={13} className="text-blue-600 dark:text-blue-400" />
                <span>หมายเหตุกฎหมายสรรพากร:</span>
              </p>
              <p className="leading-relaxed">
                หนังสือและสิ่งพิมพ์มังงะได้รับการยกเว้นภาษีมูลค่าเพิ่มตาม ม.81(1)(ฉ) แห่งประมวลรัษฎากร
              </p>
              <p className="text-[10px] text-zinc-400">
                เอกสารนี้สร้างขึ้นโดยระบบอัตโนมัติของ ChanSasom Store
              </p>
            </div>

            <div className="sm:w-72 space-y-2 border-t sm:border-t-0 pt-3 sm:pt-0">
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>มูลค่ายกเว้นภาษี (VAT 0%):</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">
                  {moneyFormatter.format(vat0Total)}
                </span>
              </div>
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>มูลค่าฐานภาษี (ก่อน VAT 7%):</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">
                  {moneyFormatter.format(vat7Base)}
                </span>
              </div>
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>ภาษีมูลค่าเพิ่ม (VAT 7%):</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {moneyFormatter.format(vat7Amount)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-black text-zinc-900 dark:text-zinc-50 border-t border-zinc-200 dark:border-zinc-700 pt-2">
                <span>ยอดรวมสุทธิทั้งสิ้น:</span>
                <span className="text-blue-600 dark:text-blue-400">
                  {moneyFormatter.format(grandTotal)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

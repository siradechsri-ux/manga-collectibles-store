"use client";

import {
  ArrowDownToLine,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Boxes,
  Building2,
  Calendar,
  CheckCircle2,
  Eye,
  FileSpreadsheet,
  FileText,
  Loader2,
  Package,
  Printer,
  QrCode,
  Receipt,
  Search,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { OrderService } from "../../../services/order.service";
import {
  MOCK_ORDERS_UPDATED_EVENT,
  type MockStoredOrder,
} from "../../../mocks/storage.mock";

export default function FinanceTaxPage() {
  const { user, isLoading } = useAuth();
  const [orders, setOrders] = useState<MockStoredOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<MockStoredOrder | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const refreshOrders = useCallback((): void => {
    if (user?.role === "FINANCE" || user?.role === "ADMIN") {
      void OrderService.getOrders().then((data) => {
        setOrders(data);
      });
    }
  }, [user?.role]);

  useEffect(() => {
    refreshOrders();
    window.addEventListener(MOCK_ORDERS_UPDATED_EVENT, refreshOrders);
    window.addEventListener("storage", refreshOrders);
    return () => {
      window.removeEventListener(MOCK_ORDERS_UPDATED_EVENT, refreshOrders);
      window.removeEventListener("storage", refreshOrders);
    };
  }, [refreshOrders]);

  useEffect(() => {
    if (!selectedInvoiceOrder) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedInvoiceOrder(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedInvoiceOrder]);

  // Valid orders with confirmed payment
  const paidOrders = orders.filter(
    (order) =>
      order.detail.status !== "PAYMENT_REVIEW_PENDING" &&
      order.detail.status !== "PAYMENT_REJECTED" &&
      order.detail.status !== "UNPAID" &&
      order.detail.status !== "CANCELLED" &&
      (order.detail.paymentStatus === "PAID" ||
        order.detail.paymentStatus === "DEPOSIT_PAID" ||
        order.detail.status === "PACKING" ||
        order.detail.status === "SHIPPED" ||
        order.detail.status === "DELIVERED"),
  );

  // Orders that requested e-Tax full invoice
  const eTaxOrders = orders.filter(
    (order) =>
      order.taxSummary?.taxInvoiceRequested === true ||
      order.detail.paymentStatus === "PAID" ||
      order.detail.status === "PACKING" ||
      order.detail.status === "SHIPPED",
  );

  // 1. KPI Calculations
  const grossRevenue = paidOrders.reduce((sum, order) => sum + order.detail.totalAmount, 0);

  const taxExemptBase = paidOrders.reduce((sum, order) => {
    const rawVal = order.taxSummary?.mangaVatExemptAmount;
    if (rawVal) return sum + Number(rawVal);
    // Fallback: sum manga & light novel items
    const bookSum = order.detail.items
      .filter((i) => i.productType === "MANGA" || i.productType === "LIGHT_NOVEL")
      .reduce((s, i) => s + i.lineTotal, 0);
    return sum + bookSum;
  }, 0);

  const taxableBase = paidOrders.reduce((sum, order) => {
    const rawVal = order.taxSummary?.vatBaseAmount;
    if (rawVal) return sum + Number(rawVal);
    // Fallback: calculate base of taxable gross
    const nonBookSum = order.detail.items
      .filter((i) => i.productType !== "MANGA" && i.productType !== "LIGHT_NOVEL")
      .reduce((s, i) => s + i.lineTotal, 0);
    const vat = Math.round((nonBookSum * 7 * 100) / 107) / 100;
    return sum + (nonBookSum - vat);
  }, 0);

  const totalOutputVat = paidOrders.reduce((sum, order) => {
    const rawVal = order.taxSummary?.vatAmount;
    if (rawVal) return sum + Number(rawVal);
    const nonBookSum = order.detail.items
      .filter((i) => i.productType !== "MANGA" && i.productType !== "LIGHT_NOVEL")
      .reduce((s, i) => s + i.lineTotal, 0);
    return sum + Math.round((nonBookSum * 7 * 100) / 107) / 100;
  }, 0);

  // Filtered e-Tax records
  const filteredETaxOrders = eTaxOrders.filter((order) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    const invNumber = `inv-2026-${String(order.detail.id).slice(-4)}`.toLowerCase();
    const orderNumber = order.detail.orderNumber.toLowerCase();
    const taxpayer = (
      order.taxSummary?.taxInvoiceCustomer?.companyOrName ??
      order.shippingAddress?.recipientName ??
      ""
    ).toLowerCase();
    const taxId = (order.taxSummary?.taxInvoiceCustomer?.maskedTaxId ?? "").toLowerCase();
    return (
      invNumber.includes(query) ||
      orderNumber.includes(query) ||
      taxpayer.includes(query) ||
      taxId.includes(query)
    );
  });

  // Action: Export Output VAT Report to CSV
  function handleExportCsv(): void {
    const headers = [
      "ลำดับ",
      "วันที่",
      "เลขที่ใบกำกับภาษี",
      "เลขที่คำสั่งซื้อ",
      "ชื่อผู้ซื้อสินค้า/บริการ",
      "เลขประจำตัวผู้เสียภาษี",
      "ประเภทผู้เสียภาษี",
      "มูลค่ายกเว้นภาษี (VAT 0%)",
      "ฐานภาษี (VAT 7%)",
      "ภาษีมูลค่าเพิ่ม 7%",
      "ยอดรวมสุทธิ",
    ];

    const rows = filteredETaxOrders.map((order, index) => {
      const invNumber = `INV-2026-${String(order.detail.id).slice(-4)}`;
      const date = new Date(order.detail.createdAt).toLocaleDateString("th-TH");
      const name =
        order.taxSummary?.taxInvoiceCustomer?.companyOrName ??
        order.shippingAddress?.recipientName ??
        "ลูกค้าทั่วไป";
      const taxId = order.taxSummary?.taxInvoiceCustomer?.maskedTaxId ?? "1-1002-00345-67-8";
      const entity =
        order.taxSummary?.taxInvoiceCustomer?.entityType === "CORPORATION"
          ? "นิติบุคคล"
          : "บุคคลธรรมดา";
      const exempt = Number(order.taxSummary?.mangaVatExemptAmount ?? 0).toFixed(2);
      const base = Number(order.taxSummary?.vatBaseAmount ?? 0).toFixed(2);
      const vat = Number(order.taxSummary?.vatAmount ?? 0).toFixed(2);
      const total = order.detail.totalAmount.toFixed(2);

      return [
        index + 1,
        date,
        invNumber,
        order.detail.orderNumber,
        `"${name.replace(/"/g, '""')}"`,
        `"${taxId}"`,
        entity,
        exempt,
        base,
        vat,
        total,
      ].join(",");
    });

    // UTF-8 BOM for Thai language support in MS Excel
    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `output_vat_report_2026_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportNotice(
      `ส่งออกรายงานภาษีขายสำเร็จ (${filteredETaxOrders.length} รายการ)`,
    );
  }

  if (isLoading) {
    return (
      <main className="flex min-h-[65vh] items-center justify-center px-4">
        <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-500 dark:text-zinc-400">
          <Loader2 size={18} className="animate-spin text-emerald-600" />
          <span>กำลังตรวจสอบสิทธิ์ฝ่ายการเงิน...</span>
        </div>
      </main>
    );
  }

  if (user?.role !== "FINANCE" && user?.role !== "ADMIN") {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400">
          <ShieldAlert size={28} aria-hidden="true" />
        </div>
        <p className="mt-4 text-xs font-black uppercase tracking-wider text-red-600 dark:text-red-400">
          HTTP 403 · เข้าถึงไม่ได้
        </p>
        <h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-zinc-50">
          เฉพาะฝ่ายการเงิน (FINANCE) และผู้ดูแลระบบ
        </h1>
        <p className="mt-2 text-xs text-slate-600 dark:text-zinc-400">
          บัญชีของคุณไม่มีสิทธิ์เข้าถึงหน้ารายงานภาษีและใบกำกับภาษีอิเล็กทรอนิกส์ กรุณาสลับบทบาทเป็น FINANCE หรือ ADMIN ผ่านตัวสลับบทบาทมุมขวาล่าง
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          กลับสู่หน้าหลัก
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-[75vh] max-w-6xl px-4 py-8 pb-28 sm:px-6 lg:px-8">
      {/* Page Header */}
      <header className="border-b border-slate-200 pb-6 dark:border-zinc-800">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <TrendingUp size={11} aria-hidden="true" />
                FINANCE • TAX & E-INVOICE
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl dark:text-zinc-50">
              รายงานภาษีและใบกำกับภาษีเต็มรูป
            </h1>
            <p className="mt-1 text-xs text-slate-600 sm:text-sm dark:text-zinc-400">
              สรุปฐานภาษีแยกตามประเภทสินค้า และรายการขอใบกำกับภาษี e-Tax ตามมาตรฐานกรมสรรพากร
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2 sm:pt-0">
            <Link
              href="/finance/slips"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs transition hover:border-emerald-500 hover:text-emerald-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-emerald-600 dark:hover:text-emerald-400"
            >
              <Receipt size={14} aria-hidden="true" />
              <span>ไปยังหน้าตรวจสอบสลิป</span>
              <ArrowRight size={13} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      {/* Export Notice Notification */}
      {exportNotice ? (
        <div
          role="status"
          className="mt-5 flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
            <span>{exportNotice}</span>
          </div>
          <button type="button" onClick={() => setExportNotice(null)} aria-label="ปิดแจ้งเตือน">
            <X size={14} />
          </button>
        </div>
      ) : null}

      {/* ===================== [KPI Summary Cards (4 Cards)] ===================== */}
      <section aria-label="กล่องสรุปสถิติภาษี" className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Gross Revenue */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              ยอดขายรวมทั้งหมด
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300">
              <Receipt size={15} aria-hidden="true" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-950 dark:text-zinc-50">
            ฿{grossRevenue.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-zinc-400">
            Gross Revenue (ออเดอร์ที่ชำระแล้ว {paidOrders.length} รายการ)
          </p>
        </div>

        {/* Card 2: VAT 0% Exempt Base */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              ฐานภาษี VAT 0%
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <BookOpen size={15} aria-hidden="true" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-blue-700 dark:text-blue-400">
            ฿{taxExemptBase.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
          </p>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
              หนังสือ / มังงะ / โนเวล
            </p>
            <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[9px] font-black text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
              ม.81(1)(ฉ)
            </span>
          </div>
        </div>

        {/* Card 3: Taxable Base */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              ฐานภาษี VAT 7%
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
              <Boxes size={15} aria-hidden="true" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-purple-700 dark:text-purple-400">
            ฿{taxableBase.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
          </p>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
              ฟิกเกอร์ / กู้ดส์ / ค่าส่ง
            </p>
            <span className="rounded-md bg-purple-50 px-1.5 py-0.5 text-[9px] font-black text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
              Taxable Base
            </span>
          </div>
        </div>

        {/* Card 4: Output VAT 7% */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              ภาษีนำส่ง 7%
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <TrendingUp size={15} aria-hidden="true" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-700 dark:text-emerald-400">
            ฿{totalOutputVat.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
          </p>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
              ภาษีขายนำส่ง ภ.พ.30
            </p>
            <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-black text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              Output VAT
            </span>
          </div>
        </div>
      </section>

      {/* ===================== [e-Tax Request Records Table] ===================== */}
      <section aria-labelledby="tax-table-heading" className="mt-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="tax-table-heading" className="text-lg font-black text-slate-950 dark:text-zinc-50">
              รายการขอใบกำกับภาษีอิเล็กทรอนิกส์ (e-Tax Request Records)
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
              บันทึกการขอใบกำกับภาษีเต็มรูปพร้อมข้อมูลผู้เสียภาษี 13 หลัก
            </p>
          </div>

          {/* Action buttons & Search */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาใบกำกับ, คำสั่งซื้อ, เลข 13 หลัก..."
                className="h-9 w-60 rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
              />
            </div>

            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              <ArrowDownToLine size={13} aria-hidden="true" />
              <span>ส่งออกรายงานภาษีขาย (Export CSV)</span>
            </button>
          </div>
        </div>

        {/* Table Container */}
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th scope="col" className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider py-3.5 px-4 text-left">เลขที่ใบกำกับ</th>
                  <th scope="col" className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider py-3.5 px-4 text-left">เลขอ้างอิงออเดอร์</th>
                  <th scope="col" className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider py-3.5 px-4 text-left">ผู้เสียภาษี / บริษัท</th>
                  <th scope="col" className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider py-3.5 px-4 text-left">เลข 13 หลัก</th>
                  <th scope="col" className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider py-3.5 px-4 text-right">ยอดก่อน VAT</th>
                  <th scope="col" className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider py-3.5 px-4 text-right">ภาษี 7%</th>
                  <th scope="col" className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider py-3.5 px-4 text-right">ยอดรวมสุทธิ</th>
                  <th scope="col" className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider py-3.5 px-4 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {filteredETaxOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500 dark:text-zinc-400">
                      ไม่พบข้อมูลรายการขอใบกำกับภาษีที่ตรงกับคำค้นหา
                    </td>
                  </tr>
                ) : (
                  filteredETaxOrders.map((order) => {
                    const invNumber = `INV-2026-${String(order.detail.id).slice(-4)}`;
                    const taxpayerName =
                      order.taxSummary?.taxInvoiceCustomer?.companyOrName ??
                      order.shippingAddress?.recipientName ??
                      "สมชาย รักการ์ตูน";
                    const isCorporate =
                      order.taxSummary?.taxInvoiceCustomer?.entityType === "CORPORATION";
                    const taxId =
                      order.taxSummary?.taxInvoiceCustomer?.maskedTaxId ?? "1-1002-00345-67-8";
                    const baseAmount = Number(order.taxSummary?.vatBaseAmount ?? 0);
                    const vatAmount = Number(order.taxSummary?.vatAmount ?? 0);

                    return (
                      <tr
                        key={order.detail.id}
                        className="transition hover:bg-slate-50/70 dark:hover:bg-zinc-900/50"
                      >
                        <td className="whitespace-nowrap px-4 py-3.5 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          {invNumber}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 font-mono text-slate-600 dark:text-zinc-400">
                          {order.detail.orderNumber}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            {isCorporate ? (
                              <Building2 size={13} className="text-purple-600 shrink-0" />
                            ) : (
                              <User size={13} className="text-slate-400 shrink-0" />
                            )}
                            <span className="font-bold text-slate-900 dark:text-zinc-100 truncate max-w-[180px]">
                              {taxpayerName}
                            </span>
                            {isCorporate && (
                              <span className="rounded-md bg-purple-100 px-1.5 py-0.2 text-[9px] font-black text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                                นิติบุคคล
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 font-mono text-slate-600 dark:text-zinc-400">
                          {taxId}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-right font-medium text-slate-700 dark:text-zinc-300">
                          ฿{baseAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-right font-medium text-emerald-700 dark:text-emerald-400">
                          ฿{vatAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-right font-black text-slate-950 dark:text-zinc-50">
                          ฿{order.detail.totalAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedInvoiceOrder(order)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-2xs transition hover:border-emerald-500 hover:text-emerald-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:border-emerald-600"
                          >
                            <Eye size={12} aria-hidden="true" />
                            <span>ดูตัวอย่างใบกำกับภาษี</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ===================== [e-Tax Invoice Full Preview Modal] ===================== */}
      {selectedInvoiceOrder ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-4 backdrop-blur-xs print:static print:bg-transparent print:p-0"
          role="dialog"
          aria-modal="true"
          aria-labelledby="invoice-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedInvoiceOrder(null);
            }
          }}
        >
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 print:max-h-none print:max-w-none print:w-full print:rounded-none print:border-none print:bg-white print:text-black print:shadow-none print:overflow-visible">
            {/* Modal Actions Bar */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/95 print:hidden">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="text-emerald-600" size={18} />
                <h3 id="invoice-modal-title" className="text-sm font-black text-slate-900 dark:text-zinc-100">
                  ตัวอย่างใบกำกับภาษีเต็มรูป (e-Tax Invoice Preview)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-750"
                >
                  <Printer size={13} aria-hidden="true" />
                  <span>พิมพ์ / PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceOrder(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
                  aria-label="ปิดหน้าต่างตัวอย่างใบกำกับภาษี"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Tax Document Paper Content */}
            <div id="etax-invoice-paper" className="p-6 sm:p-8 space-y-6">
              {/* Document Header */}
              <div className="border-b border-slate-200 pb-5 dark:border-zinc-800">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <h4 className="text-lg font-black text-slate-900 dark:text-zinc-50">
                      บริษัท มังงะ แอนด์ คอลเลกทิเบิลส์ สโตร์ จำกัด (สำนักงานใหญ่)
                    </h4>
                    <p className="mt-1 text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                      99/8 อาคารสยามสแควร์ ชั้น 4 ถนนพระราม 1 แขวงปทุมวัน เขตปทุมวัน กรุงเทพฯ 10330<br />
                      เลขประจำตัวผู้เสียภาษีอากร: <span className="font-mono font-bold">0-1055-67012-34-5</span>
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="inline-block rounded-md bg-emerald-100 px-2.5 py-1 text-[11px] font-black uppercase text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      ใบกำกับภาษี / ใบเสร็จรับเงิน
                    </span>
                    <p className="mt-1 font-mono text-xs font-black text-slate-950 dark:text-zinc-100">
                      INV-2026-{String(selectedInvoiceOrder.detail.id).slice(-4)}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                      วันที่: {new Date(selectedInvoiceOrder.detail.createdAt).toLocaleDateString("th-TH")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Customer Box */}
              <div className="bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  ข้อมูลผู้ซื้อ / ผู้รับบริการ
                </p>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">ชื่อ: </span>
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {selectedInvoiceOrder.taxSummary?.taxInvoiceCustomer?.companyOrName ??
                        selectedInvoiceOrder.shippingAddress?.recipientName ??
                        "สมชาย รักการ์ตูน"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">เลขประจำตัวผู้เสียภาษี: </span>
                    <span className="text-sm font-mono text-zinc-700 dark:text-zinc-300">
                      {selectedInvoiceOrder.taxSummary?.taxInvoiceCustomer?.maskedTaxId ?? "1-1002-00345-67-8"}
                    </span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">ที่อยู่: </span>
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">
                      {selectedInvoiceOrder.taxSummary?.taxInvoiceCustomer?.address ??
                        selectedInvoiceOrder.shippingAddress?.addressLine ??
                        "123/45 ถนนสุขุมวิท 71 แขวงพระโขนงเหนือ เขตวัฒนา กรุงเทพมหานคร 10110"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Invoice Items Table */}
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-zinc-800">
                <table className="w-full text-xs">
                  <thead className="bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="p-2.5 text-center w-12">ลำดับ</th>
                      <th className="p-2.5 text-left">รายการสินค้า</th>
                      <th className="p-2.5 text-center">ประเภทภาษี</th>
                      <th className="p-2.5 text-center w-16">จำนวน</th>
                      <th className="p-2.5 text-right w-24">ยอดเงิน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                    {selectedInvoiceOrder.detail.items.map((item, idx) => {
                      const isExempt = item.productType === "MANGA" || item.productType === "LIGHT_NOVEL";
                      return (
                        <tr key={item.id}>
                          <td className="p-2.5 text-center text-slate-400">{idx + 1}</td>
                          <td className="p-2.5 font-medium text-slate-900 dark:text-zinc-100">
                            {item.title}
                          </td>
                          <td className="p-2.5 text-center">
                            <span
                              className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                                isExempt
                                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                  : "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                              }`}
                            >
                              {isExempt ? "ยกเว้นภาษี (0%)" : "ภาษี 7%"}
                            </span>
                          </td>
                          <td className="p-2.5 text-center text-slate-700 dark:text-zinc-300">
                            {item.quantity}
                          </td>
                          <td className="p-2.5 text-right font-bold text-slate-900 dark:text-zinc-100">
                            ฿{item.lineTotal.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Breakdown Calculation Totals */}
              <div className="flex flex-col sm:flex-row justify-between gap-4 border-t border-slate-200 pt-4 dark:border-zinc-800">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    <ShieldCheck size={16} />
                    <span>e-Tax Invoice by Time Stamp Certified</span>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-zinc-500 leading-relaxed">
                    เอกสารนี้ได้รับการลงลายมือชื่อดิจิทัลและประทับรับรองเวลาตามมาตรฐาน สพธอ. (ETDA) และกรมสรรพากร
                  </p>
                </div>

                <div className="w-full sm:w-72 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-zinc-400">
                    <span>มูลค่ายกเว้นภาษี (VAT 0%):</span>
                    <span className="font-medium text-slate-900 dark:text-zinc-100">
                      ฿{Number(selectedInvoiceOrder.taxSummary?.mangaVatExemptAmount ?? 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-zinc-400">
                    <span>ฐานภาษีมูลค่าเพิ่ม (VAT 7%):</span>
                    <span className="font-medium text-slate-900 dark:text-zinc-100">
                      ฿{Number(selectedInvoiceOrder.taxSummary?.vatBaseAmount ?? 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-zinc-400">
                    <span>ภาษีมูลค่าเพิ่ม 7%:</span>
                    <span className="font-medium text-emerald-700 dark:text-emerald-400">
                      ฿{Number(selectedInvoiceOrder.taxSummary?.vatAmount ?? 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-black text-slate-950 dark:border-zinc-800 dark:text-zinc-50">
                    <span>ยอดรวมสุทธิทั้งสิ้น:</span>
                    <span>
                      ฿{selectedInvoiceOrder.detail.totalAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {selectedInvoiceOrder ? (
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden !important;
            }
            #etax-invoice-paper,
            #etax-invoice-paper * {
              visibility: visible !important;
            }
            #etax-invoice-paper {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              color: #000 !important;
              background: #fff !important;
              border: none !important;
              box-shadow: none !important;
              padding: 24px !important;
              margin: 0 !important;
            }
            #etax-invoice-paper * {
              color: #000 !important;
              border-color: #cbd5e1 !important;
            }
            #etax-invoice-paper table thead {
              background-color: #f1f5f9 !important;
            }
            #etax-invoice-paper .bg-zinc-100,
            #etax-invoice-paper [class*="bg-zinc"] {
              background-color: #f8fafc !important;
              border-color: #e2e8f0 !important;
            }
          }
        `}</style>
      ) : null}
    </main>
  );
}

"use client";

import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  FileText,
  Loader2,
  Package,
  QrCode,
  Receipt,
  ReceiptText,
  ShieldAlert,
  User,
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { OrderService } from "../../../services/order.service";
import {
  canRejectMockOrderPayment,
  MOCK_ORDERS_UPDATED_EVENT,
  MOCK_PAYMENT_REJECTION_REASONS,
  type MockPaymentRejectionReason,
  type MockStoredOrder,
} from "../../../mocks/storage.mock";

type SlipTab = "PENDING" | "APPROVED" | "REJECTED";

export default function FinanceSlipsPage() {
  const { user, isLoading } = useAuth();
  const [orders, setOrders] = useState<MockStoredOrder[]>([]);
  const [activeTab, setActiveTab] = useState<SlipTab>("PENDING");
  const [selectedSlipOrder, setSelectedSlipOrder] = useState<MockStoredOrder | null>(null);
  const [rejectionTarget, setRejectionTarget] = useState<MockStoredOrder | null>(null);
  const [rejectionReason, setRejectionReason] =
    useState<MockPaymentRejectionReason>(MOCK_PAYMENT_REJECTION_REASONS[0]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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

  async function handleApprove(order: MockStoredOrder): Promise<void> {
    setActionError(null);
    setActionNotice(null);
    try {
      await OrderService.approveSlip(order.detail.id);
      refreshOrders();
      setSelectedSlipOrder(null);
      setActionNotice(`อนุมัติสลิปคำสั่งซื้อ ${order.detail.orderNumber} สำเร็จ และส่งต่อให้ฝ่ายคลังแพ็กของแล้ว`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "อนุมัติสลิปไม่สำเร็จ");
    }
  }

  async function handleReject(): Promise<void> {
    if (!rejectionTarget) return;
    setActionError(null);
    setActionNotice(null);
    try {
      await OrderService.rejectSlip(rejectionTarget.detail.id, rejectionReason);
      refreshOrders();
      setActionNotice(`ปฏิเสธสลิปคำสั่งซื้อ ${rejectionTarget.detail.orderNumber} เรียบร้อยแล้ว (เหตุผล: ${rejectionReason})`);
      setRejectionTarget(null);
      setSelectedSlipOrder(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "ปฏิเสธสลิปไม่สำเร็จ");
    }
  }

  // Filter orders by tab status
  const pendingOrders = orders.filter(
    (order) => order.detail.status === "PAYMENT_REVIEW_PENDING",
  );

  const approvedOrders = orders.filter(
    (order) =>
      order.detail.status !== "PAYMENT_REVIEW_PENDING" &&
      order.detail.status !== "PAYMENT_REJECTED" &&
      order.detail.status !== "UNPAID" &&
      order.detail.status !== "CANCELLED" &&
      (order.detail.paymentStatus === "PAID" ||
        order.detail.paymentStatus === "DEPOSIT_PAID" ||
        order.detail.status === "PACKING" ||
        order.detail.status === "SHIPPED"),
  );

  const rejectedOrders = orders.filter(
    (order) => order.detail.status === "PAYMENT_REJECTED",
  );

  const currentTabOrders =
    activeTab === "PENDING"
      ? pendingOrders
      : activeTab === "APPROVED"
        ? approvedOrders
        : rejectedOrders;

  const filteredOrders = currentTabOrders.filter((order) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    const orderNumber = order.detail.orderNumber.toLowerCase();
    const customer = (order.shippingAddress?.recipientName ?? "").toLowerCase();
    const items = order.detail.items.map((i) => i.title.toLowerCase()).join(" ");
    return orderNumber.includes(query) || customer.includes(query) || items.includes(query);
  });

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
          บัญชีของคุณไม่มีสิทธิ์เข้าถึงระบบตรวจสอบสลิปโอนเงิน กรุณาสลับบทบาทเป็น FINANCE หรือ ADMIN ผ่านตัวสลับบทบาทมุมขวาล่าง
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
                <Receipt size={11} aria-hidden="true" />
                FINANCE • SLIP VERIFICATION
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl dark:text-zinc-50">
              ตรวจสอบสลิปโอนเงิน
            </h1>
            <p className="mt-1 text-xs text-slate-600 sm:text-sm dark:text-zinc-400">
              ตรวจสอบสลิปการโอนเงินจากลูกค้า อนุมัติเพื่อส่งต่อให้คลังแพ็กของ หรือปฏิเสธกรณีสลิปไม่ถูกต้อง
            </p>
          </div>
          <div className="flex items-center gap-2 pt-2 sm:pt-0">
            <Link
              href="/finance/tax"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs transition hover:border-emerald-500 hover:text-emerald-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-emerald-600 dark:hover:text-emerald-400"
            >
              <FileText size={14} aria-hidden="true" />
              <span>ไปยังรายงานภาษี & e-Tax</span>
              <ArrowRight size={13} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      {/* Notifications */}
      {actionError ? (
        <div
          role="alert"
          className="mt-5 flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
        >
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError(null)} aria-label="ปิดแจ้งเตือน">
            <X size={14} />
          </button>
        </div>
      ) : null}

      {actionNotice ? (
        <div
          role="status"
          className="mt-5 flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
            <span>{actionNotice}</span>
          </div>
          <button type="button" onClick={() => setActionNotice(null)} aria-label="ปิดแจ้งเตือน">
            <X size={14} />
          </button>
        </div>
      ) : null}

      {/* Status Tabs Bar */}
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-100/70 p-1.5 dark:border-zinc-800 dark:bg-zinc-900/80">
          <button
            type="button"
            onClick={() => setActiveTab("PENDING")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === "PENDING"
                ? "bg-white text-amber-700 shadow-xs dark:bg-zinc-800 dark:text-amber-400"
                : "text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <Clock size={14} aria-hidden="true" />
            <span>รอตรวจสอบ (Pending)</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                activeTab === "PENDING"
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                  : "bg-slate-200 text-slate-700 dark:bg-zinc-700 dark:text-zinc-300"
              }`}
            >
              {pendingOrders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("APPROVED")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === "APPROVED"
                ? "bg-white text-emerald-700 shadow-xs dark:bg-zinc-800 dark:text-emerald-400"
                : "text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <BadgeCheck size={14} aria-hidden="true" />
            <span>อนุมัติแล้ว (Approved)</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                activeTab === "APPROVED"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  : "bg-slate-200 text-slate-700 dark:bg-zinc-700 dark:text-zinc-300"
              }`}
            >
              {approvedOrders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("REJECTED")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === "REJECTED"
                ? "bg-white text-red-700 shadow-xs dark:bg-zinc-800 dark:text-red-400"
                : "text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <XCircle size={14} aria-hidden="true" />
            <span>ปฏิเสธ (Rejected)</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                activeTab === "REJECTED"
                  ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                  : "bg-slate-200 text-slate-700 dark:bg-zinc-700 dark:text-zinc-300"
              }`}
            >
              {rejectedOrders.length}
            </span>
          </button>
        </div>

        {/* Quick Search */}
        <div className="w-full sm:w-64">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาเลขออเดอร์, ชื่อลูกค้า..."
            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
          />
        </div>
      </div>

      {/* Orders List Content */}
      {filteredOrders.length === 0 ? (
        <section className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-zinc-800 dark:text-zinc-500">
            <ReceiptText size={24} aria-hidden="true" />
          </div>
          <h2 className="mt-4 font-bold text-slate-900 dark:text-zinc-100">
            {activeTab === "PENDING"
              ? "ไม่มีรายการสลิปที่รอตรวจสอบ"
              : activeTab === "APPROVED"
                ? "ยังไม่มีรายการสลิปที่อนุมัติแล้ว"
                : "ไม่มีรายการสลิปที่ถูกปฏิเสธ"}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
            {activeTab === "PENDING"
              ? "เมื่อมีลูกค้าทำรายการสั่งซื้อและแจ้งชำระเงิน รายการจะแสดงขึ้นที่แท็บนี้โดยอัตโนมัติ"
              : "รายการจะถูกจัดเก็บประวัติแยกตามสถานะการตรวจสอบสลิป"}
          </p>
        </section>
      ) : (
        <div className="mt-6 space-y-3.5">
          {filteredOrders.map((order) => {
            const customerName =
              order.shippingAddress?.recipientName ??
              order.taxSummary?.taxInvoiceCustomer?.companyOrName ??
              "ลูกค้าทั่วไป (Prototype)";
            const customerPhone = order.shippingAddress?.recipientPhone ?? "081-xxx-xxxx";
            const itemCount = order.detail.items.reduce((sum, item) => sum + item.quantity, 0);
            const isPending = order.detail.status === "PAYMENT_REVIEW_PENDING";
            const isApproved =
              order.detail.paymentStatus === "PAID" || order.detail.paymentStatus === "DEPOSIT_PAID";
            const isRejected = order.detail.status === "PAYMENT_REJECTED";

            return (
              <article
                key={order.detail.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs transition hover:border-slate-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  {/* Left info column */}
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-black text-slate-950 dark:text-zinc-50">
                        {order.detail.orderNumber}
                      </span>
                      <span className="text-[11px] text-slate-400 dark:text-zinc-500">•</span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-zinc-400">
                        <Calendar size={12} aria-hidden="true" />
                        {new Date(order.detail.createdAt).toLocaleDateString("th-TH", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>

                      {/* Status Badges */}
                      {isPending && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          <Clock size={10} aria-hidden="true" />
                          รอตรวจสอบสลิป
                        </span>
                      )}
                      {isApproved && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          <BadgeCheck size={10} aria-hidden="true" />
                          อนุมัติแล้ว • ส่งคลังแพ็กของ
                        </span>
                      )}
                      {isRejected && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-black text-red-800 dark:bg-red-950 dark:text-red-300">
                          <XCircle size={10} aria-hidden="true" />
                          ปฏิเสธสลิป: {order.detail.paymentRejectionReason ?? "สลิปไม่ถูกต้อง"}
                        </span>
                      )}
                    </div>

                    {/* Customer & Items line */}
                    <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-zinc-300">
                        <User size={13} className="text-slate-400 dark:text-zinc-500 shrink-0" />
                        <span className="font-bold">{customerName}</span>
                        <span className="text-slate-400 dark:text-zinc-500">({customerPhone})</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-zinc-400">
                        <Package size={13} className="text-slate-400 dark:text-zinc-500 shrink-0" />
                        <span className="truncate">
                          {order.detail.items.map((i) => `${i.title} (${i.quantity})`).join(", ")}
                        </span>
                        <span className="shrink-0 text-slate-400 dark:text-zinc-500">[{itemCount} ชิ้น]</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Amount & Actions column */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 lg:border-t-0 lg:pt-0 sm:justify-end">
                    <div className="text-left sm:text-right">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                        ยอดเงินที่ต้องชำระ
                      </p>
                      <p className="text-lg font-black text-slate-950 dark:text-zinc-50">
                        ฿{order.detail.totalAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* View Slip Modal Button */}
                      <button
                        type="button"
                        onClick={() => setSelectedSlipOrder(order)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 shadow-2xs transition hover:border-emerald-500 hover:text-emerald-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:border-emerald-600"
                      >
                        <Eye size={13} aria-hidden="true" />
                        <span>ดูรูปสลิป</span>
                      </button>

                      {/* Pending Actions */}
                      {isPending && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleApprove(order)}
                            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                          >
                            <Check size={14} aria-hidden="true" />
                            <span>อนุมัติสลิป</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectionReason(MOCK_PAYMENT_REJECTION_REASONS[0]);
                              setRejectionTarget(order);
                            }}
                            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-red-300 bg-white px-3 text-xs font-bold text-red-600 transition hover:bg-red-50 dark:border-red-800/80 dark:bg-zinc-800 dark:text-red-400 dark:hover:bg-red-950/40"
                          >
                            <X size={14} aria-hidden="true" />
                            <span>ปฏิเสธสลิป</span>
                          </button>
                        </>
                      )}

                      {/* Link to Order detail */}
                      <Link
                        href={`/orders/${order.detail.id}`}
                        className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 px-2.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                        title="ดูหน้ารายละเอียดคำสั่งซื้อ"
                      >
                        <ArrowRight size={13} />
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ===================== [Slip Preview Modal] ===================== */}
      {selectedSlipOrder ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="slip-preview-title"
        >
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Receipt className="text-emerald-600 dark:text-emerald-400" size={18} />
                <h3 id="slip-preview-title" className="text-sm font-black text-slate-900 dark:text-zinc-100">
                  สลิปโอนเงินจำลอง (Mock Slip)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSlipOrder(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-zinc-800"
                aria-label="ปิดหน้าต่างสลิป"
              >
                <X size={16} />
              </button>
            </div>

            {/* Mock Slip Graphic Card */}
            <div className="p-5">
              <div className="rounded-2xl border border-emerald-100 bg-gradient-to-b from-emerald-50/60 to-white p-5 shadow-xs dark:border-emerald-950/50 dark:from-emerald-950/30 dark:to-zinc-900">
                {/* Bank Header */}
                <div className="flex items-center justify-between border-b border-emerald-100/80 pb-3 dark:border-emerald-950/80">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white font-black text-xs">
                      KB
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900 dark:text-zinc-100">
                        ธนาคารกสิกรไทย (K-Plus)
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-zinc-400">
                        โอนเงินสำเร็จ • PromptPay
                      </p>
                    </div>
                  </div>
                  <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[9px] font-black text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    MATCHED
                  </span>
                </div>

                {/* Amount */}
                <div className="my-4 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                    จำนวนเงินที่โอน
                  </p>
                  <p className="text-3xl font-black text-emerald-700 dark:text-emerald-400">
                    ฿{selectedSlipOrder.detail.totalAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-400 dark:text-zinc-500">
                    {new Date(selectedSlipOrder.detail.createdAt).toLocaleDateString("th-TH", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })} น.
                  </p>
                </div>

                {/* Sender & Receiver Info */}
                <div className="space-y-2.5 rounded-xl bg-slate-50/80 p-3 text-xs dark:bg-zinc-800/60">
                  <div className="flex items-start justify-between">
                    <span className="text-slate-500 dark:text-zinc-400">ผู้โอน:</span>
                    <span className="font-bold text-slate-800 dark:text-zinc-200 text-right">
                      {selectedSlipOrder.shippingAddress?.recipientName ?? "ลูกค้าทั่วไป"} (xxx-xxx-1234)
                    </span>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-slate-500 dark:text-zinc-400">ผู้รับเงิน:</span>
                    <span className="font-bold text-slate-800 dark:text-zinc-200 text-right">
                      บจก. มังงะ แอนด์ คอลเลกทิเบิลส์
                    </span>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-slate-500 dark:text-zinc-400">เลขที่รายการ:</span>
                    <span className="font-mono text-[11px] text-slate-600 dark:text-zinc-400">
                      20261012{String(selectedSlipOrder.detail.id).slice(-4)}8904
                    </span>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-slate-500 dark:text-zinc-400">เลขอ้างอิงออเดอร์:</span>
                    <span className="font-mono text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                      {selectedSlipOrder.detail.orderNumber}
                    </span>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-slate-500 dark:text-zinc-400">ชื่อไฟล์สลิป:</span>
                    <span className="font-mono text-[10px] text-slate-500 dark:text-zinc-400 truncate max-w-[180px]">
                      {selectedSlipOrder.detail.paymentSlipFileName ?? "slip_kbank_transfer.jpg"}
                    </span>
                  </div>
                </div>

                {/* Footer verification note */}
                <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] font-medium text-slate-400 dark:text-zinc-500">
                  <QrCode size={12} />
                  <span>สแกน QR Code ตรวจสอบข้อมูลในระบบธนาคารแล้ว</span>
                </div>
              </div>

              {/* Action Buttons inside Modal for Pending orders */}
              {selectedSlipOrder.detail.status === "PAYMENT_REVIEW_PENDING" ? (
                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRejectionReason(MOCK_PAYMENT_REJECTION_REASONS[0]);
                      setRejectionTarget(selectedSlipOrder);
                    }}
                    className="flex-1 rounded-xl border border-red-300 py-2.5 text-xs font-bold text-red-600 transition hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    ปฏิเสธสลิป
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprove(selectedSlipOrder)}
                    className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                  >
                    อนุมัติสลิปทันที
                  </button>
                </div>
              ) : (
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedSlipOrder(null)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    ปิดหน้าต่าง
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* ===================== [Rejection Reason Modal] ===================== */}
      {rejectionTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-slip-title"
        >
          <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400">
              <XCircle size={22} aria-hidden="true" />
            </div>
            <h2 id="reject-slip-title" className="mt-3 text-base font-black text-slate-900 dark:text-zinc-100">
              ปฏิเสธสลิป • {rejectionTarget.detail.orderNumber}
            </h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-zinc-400">
              เลือกสาเหตุเพื่อส่งการแจ้งเตือนไปยังลูกค้า และให้ลูกค้าอัปโหลดสลิปที่ถูกต้องเข้ามาใหม่
            </p>

            <fieldset className="mt-4 space-y-2">
              <legend className="sr-only">เลือกสาเหตุการปฏิเสธสลิป</legend>
              {MOCK_PAYMENT_REJECTION_REASONS.map((reason) => (
                <label
                  key={reason}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-xs font-bold transition ${
                    rejectionReason === reason
                      ? "border-red-400 bg-red-50/70 text-red-900 dark:border-red-800/80 dark:bg-red-950/40 dark:text-red-200"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  <input
                    type="radio"
                    name="slip-rejection-reason"
                    value={reason}
                    checked={rejectionReason === reason}
                    onChange={() => setRejectionReason(reason)}
                    className="accent-red-600"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </fieldset>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectionTarget(null)}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleReject}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500"
              >
                ยืนยันปฏิเสธสลิป
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

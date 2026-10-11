"use client";

import {
  AlertTriangle,
  BadgeCheck,
  Check,
  ReceiptText,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import {
  listMockOrders,
  approveMockOrderPaymentReview,
  MOCK_ORDERS_UPDATED_EVENT,
  MOCK_PAYMENT_REJECTION_REASONS,
  rejectMockOrderPayment,
  type MockPaymentRejectionReason,
  type MockStoredOrder,
} from "../../../mocks/storage.mock";

export default function FinanceSlipsPage() {
  const { user, isLoading } = useAuth();
  const [orders, setOrders] = useState<MockStoredOrder[]>([]);
  const [shoppingDisabledNotice, setShoppingDisabledNotice] = useState(false);
  const [rejectionTarget, setRejectionTarget] = useState<MockStoredOrder | null>(null);
  const [rejectionReason, setRejectionReason] =
    useState<MockPaymentRejectionReason>(MOCK_PAYMENT_REJECTION_REASONS[0]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const refreshOrders = useCallback((): void => {
    if (user?.role === "FINANCE" || user?.role === "ADMIN") {
      setOrders(
        listMockOrders().filter(
          (order) =>
            order.detail.paymentStatus === "PAID" ||
            order.detail.paymentStatus === "DEPOSIT_PAID" ||
            order.detail.status === "PAYMENT_REVIEW_PENDING" ||
            order.detail.status === "PAYMENT_REJECTED",
        ),
      );
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

  function approveSlip(order: MockStoredOrder): void {
    setActionError(null);
    setActionNotice(null);
    try {
      approveMockOrderPaymentReview(order.detail.id);
      refreshOrders();
      setActionNotice(`อนุมัติสลิปคำสั่งซื้อ ${order.detail.orderNumber} แล้ว`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "อนุมัติสลิปไม่สำเร็จ");
    }
  }

  function rejectSlip(): void {
    if (!rejectionTarget) return;
    setActionError(null);
    setActionNotice(null);
    try {
      rejectMockOrderPayment(rejectionTarget.detail.id, rejectionReason);
      refreshOrders();
      setActionNotice(`ปฏิเสธสลิปคำสั่งซื้อ ${rejectionTarget.detail.orderNumber} แล้ว`);
      setRejectionTarget(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "ปฏิเสธสลิปไม่สำเร็จ");
    }
  }

  useEffect(() => {
    setShoppingDisabledNotice(
      new URLSearchParams(window.location.search).get("notice") ===
        "shopping-disabled",
    );
  }, []);

  if (isLoading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4">
        <p role="status" className="text-sm text-slate-500">
          กำลังตรวจสอบสิทธิ์ฝ่ายการเงิน...
        </p>
      </main>
    );
  }

  if (user?.role !== "FINANCE" && user?.role !== "ADMIN") {
    return (
      <main className="mx-auto flex min-h-[65vh] max-w-xl flex-col items-center justify-center px-5 text-center">
        <AlertTriangle size={34} className="text-red-600" aria-hidden="true" />
        <p className="mt-4 text-sm font-bold uppercase tracking-wider text-red-700">
          HTTP 403 · Finance Only
        </p>
        <h1 className="mt-2 text-2xl font-extrabold text-slate-950">
          ไม่มีสิทธิ์เข้าถึงรายการตรวจสอบยอดเงิน
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          ต้องเป็น FINANCE หรือ ADMIN เพื่อเข้าถึงรายการตรวจสอบการชำระเงิน
        </p>
        <Link href="/" className="mt-5 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white">
          กลับหน้าร้าน
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-[70vh] max-w-6xl px-4 py-8 pb-28 sm:px-6 lg:px-8">
      {shoppingDisabledNotice ? (
        <p
          role="status"
          className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900"
        >
          บัญชีเจ้าหน้าที่ไม่สามารถทำรายการสั่งซื้อได้
        </p>
      ) : null}
      <header className="border-b border-slate-200 pb-6">
        <p className="text-sm font-extrabold text-emerald-700">FINANCE · SLIP REVIEW</p>
        <h1 className="mt-1 text-3xl font-extrabold text-slate-950">
          ตรวจสอบยอดเงิน
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          รายงานรายการชำระเงินจำลองที่ผ่านการยืนยันใน Prototype
        </p>
      </header>
      {actionError ? (
        <p role="alert" className="mt-5 rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {actionError}
        </p>
      ) : null}
      {actionNotice ? (
        <p role="status" className="mt-5 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          {actionNotice}
        </p>
      ) : null}

      {orders.length === 0 ? (
        <section className="mt-7 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <ReceiptText className="mx-auto h-10 w-10 text-slate-400" aria-hidden="true" />
          <h2 className="mt-3 font-bold text-slate-900">ยังไม่มีรายการชำระที่ตรวจสอบแล้ว</h2>
          <p className="mt-1 text-sm text-slate-500">
            เมื่อมีการจำลองชำระเงิน รายการจะแสดงในรายงานนี้
          </p>
        </section>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="divide-y divide-slate-100">
            {orders.map((order) => (
              <article
                key={order.detail.id}
                className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 rounded-xl bg-emerald-50 p-2 text-emerald-700">
                    <BadgeCheck size={20} aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="font-bold text-slate-950">
                      {order.detail.orderNumber}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {order.detail.items.map((item) => item.title).join(", ")}
                    </p>
                    <p className={`mt-1 text-xs font-semibold ${
                      order.detail.status === "PAYMENT_REVIEW_PENDING"
                        ? "text-amber-700 dark:text-amber-300"
                        : order.detail.status === "PAYMENT_REJECTED"
                          ? "text-red-700 dark:text-red-300"
                          : "text-emerald-800 dark:text-emerald-300"
                    }`}>
                      {order.detail.status === "PAYMENT_REVIEW_PENDING"
                        ? `รอตรวจสอบสลิป${order.detail.paymentSlipFileName ? ` · ${order.detail.paymentSlipFileName}` : ""}`
                        : order.detail.status === "PAYMENT_REJECTED"
                          ? `ปฏิเสธแล้ว · ${order.detail.paymentRejectionReason ?? "ไม่มีเหตุผลระบุ"}`
                          : order.detail.paymentStatus === "DEPOSIT_PAID"
                            ? "ยืนยันยอดมัดจำ"
                            : "ยืนยันชำระเต็มจำนวน"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
                  <p className="text-sm font-extrabold text-slate-950">
                    ฿{order.detail.paidAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                  </p>
                  {order.detail.status === "PAYMENT_REVIEW_PENDING" ? (
                    <button
                      type="button"
                      onClick={() => approveSlip(order)}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800"
                    >
                      <Check size={15} aria-hidden="true" />
                      อนุมัติ
                    </button>
                  ) : null}
                  {order.detail.status !== "PAYMENT_REJECTED" ? (
                    <button
                      type="button"
                      onClick={() => {
                        setRejectionReason(MOCK_PAYMENT_REJECTION_REASONS[0]);
                        setRejectionTarget(order);
                      }}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-red-400 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
                    >
                      <X size={15} aria-hidden="true" />
                      ปฏิเสธสลิป
                    </button>
                  ) : null}
                  <Link
                    href={`/orders/${order.detail.id}`}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    เปิด Order
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
      {rejectionTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-slip-title"
        >
          <section className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
            <h2 id="reject-slip-title" className="text-lg font-extrabold text-zinc-950 dark:text-zinc-100">
              ปฏิเสธสลิป · {rejectionTarget.detail.orderNumber}
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              เลือกเหตุผลเพื่อแจ้งให้ลูกค้าทราบและส่งหลักฐานใหม่
            </p>
            <fieldset className="mt-4 space-y-2">
              <legend className="sr-only">เหตุผลการปฏิเสธ</legend>
              {MOCK_PAYMENT_REJECTION_REASONS.map((reason) => (
                <label
                  key={reason}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 p-3 text-sm font-medium text-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
                >
                  <input
                    type="radio"
                    name="slip-rejection-reason"
                    value={reason}
                    checked={rejectionReason === reason}
                    onChange={() => setRejectionReason(reason)}
                    className="accent-red-600"
                  />
                  {reason}
                </label>
              ))}
            </fieldset>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectionTarget(null)}
                className="min-h-10 rounded-lg border border-zinc-300 px-4 text-sm font-semibold text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={rejectSlip}
                className="min-h-10 rounded-lg bg-red-700 px-4 text-sm font-bold text-white hover:bg-red-800"
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

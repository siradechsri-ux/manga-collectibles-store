"use client";

import {
  AlertCircle,
  ArrowRight,
  PackageX,
  ShoppingBag,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { cancelMockOrder, MOCK_ORDERS_UPDATED_EVENT } from "../../../mocks/storage.mock";
import { useAuth } from "../../../contexts/AuthContext";
import {
  listMockOrders,
  type MockStoredOrder,
} from "../../../mocks/storage.mock";

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    UNPAID: "รอชำระเงิน",
    ORDER_PLACED: "ได้รับคำสั่งซื้อ",
    DEPOSIT_PAID: "ชำระมัดจำแล้ว",
    AWAITING_BALANCE_PAYMENT: "รอชำระยอดคงเหลือ",
    PAID: "ชำระเงินแล้ว",
    PACKING: "กำลังแพ็กสินค้า",
    SHIPPED: "จัดส่งแล้ว",
    DELIVERED: "จัดส่งสำเร็จ",
    DEPOSIT_FORFEITED: "หมดสิทธิ์มัดจำ",
    CANCELLED: "ยกเลิกแล้ว",
  };
  return labels[status] ?? status;
}

export default function CustomerOrdersPage() {
  const { user, isLoading } = useAuth();
  const [orders, setOrders] = useState<MockStoredOrder[]>([]);
  const [cancelTarget, setCancelTarget] = useState<MockStoredOrder | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const refreshOrders = useCallback((): void => {
    if (user?.role === "CUSTOMER") {
      setOrders(
        listMockOrders(user.id).sort(
          (left, right) =>
            new Date(right.detail.createdAt).getTime() -
            new Date(left.detail.createdAt).getTime(),
        ),
      );
    } else {
      setOrders([]);
    }
  }, [user?.id, user?.role]);

  useEffect(() => {
    refreshOrders();
    window.addEventListener(MOCK_ORDERS_UPDATED_EVENT, refreshOrders);
    window.addEventListener("storage", refreshOrders);
    return () => {
      window.removeEventListener(MOCK_ORDERS_UPDATED_EVENT, refreshOrders);
      window.removeEventListener("storage", refreshOrders);
    };
  }, [refreshOrders]);

  function confirmCancellation(): void {
    if (!cancelTarget || !user) return;
    setCancelError(null);
    try {
      cancelMockOrder(cancelTarget.detail.id, user.id);
      setCancelTarget(null);
      refreshOrders();
    } catch (error) {
      setCancelError(
        error instanceof Error ? error.message : "ยกเลิกคำสั่งซื้อไม่สำเร็จ",
      );
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4">
        <p role="status" className="text-sm text-slate-500">
          กำลังโหลดคำสั่งซื้อ...
        </p>
      </main>
    );
  }

  if (user?.role !== "CUSTOMER") {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center">
        <AlertCircle className="h-9 w-9 text-amber-600" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-extrabold text-slate-950">
          หน้านี้สำหรับลูกค้าเท่านั้น
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          สลับ Role เป็น CUSTOMER เพื่อดูคำสั่งซื้อของบัญชีทดสอบนี้
        </p>
        <Link href="/" className="mt-5 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white">
          กลับหน้าร้าน
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-[70vh] max-w-5xl bg-zinc-50 px-4 py-8 pb-28 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 sm:px-6 lg:px-8">
    <header className="flex items-end justify-between gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <div>
          <p className="text-sm font-bold text-orange-700">CUSTOMER ACCOUNT</p>
          <h1 className="mt-1 text-3xl font-extrabold text-slate-950">
            คำสั่งซื้อของฉัน
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            แสดงเฉพาะ Mock Order ของ {user.fullName}
          </p>
        </div>
        <span className="hidden rounded-xl bg-orange-50 p-3 text-orange-700 sm:inline-flex">
          <ShoppingBag size={23} aria-hidden="true" />
        </span>
      </header>

      {orders.length === 0 ? (
        <section className="mt-8 rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <PackageX className="mx-auto h-10 w-10 text-zinc-400" aria-hidden="true" />
          <h2 className="mt-3 font-bold text-zinc-900 dark:text-zinc-100">ยังไม่มีประวัติการสั่งซื้อ</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            เมื่อคุณสั่งซื้อสินค้า รายการและสถานะคำสั่งซื้อจะแสดงที่นี่
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-orange-600 px-5 text-sm font-bold text-white hover:bg-orange-700"
          >
            เริ่มต้นสั่งซื้อสินค้า
          </Link>
        </section>
      ) : (
        <div className="mt-6 space-y-4">
          {orders.map((order) => (
            <article
              key={order.detail.id}
              className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-extrabold text-zinc-950 dark:text-zinc-100">
                      {order.detail.orderNumber}
                    </h2>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      order.detail.status === "CANCELLED"
                        ? "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        : "bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300"
                    }`}>
                      {statusLabel(order.detail.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {new Intl.DateTimeFormat("th-TH", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(order.detail.createdAt))}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-300">
                    {order.detail.items
                      .map((item) => `${item.title} × ${item.quantity}`)
                      .join(" · ")}
                  </p>
                  <p className="mt-2 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    ยอดรวม ฿{order.detail.totalAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                    {order.detail.remainingBalance > 0
                      ? ` · คงเหลือ ฿${order.detail.remainingBalance.toLocaleString("th-TH", { minimumFractionDigits: 2 })}`
                      : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                {order.detail.status === "UNPAID" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCancelError(null);
                      setCancelTarget(order);
                    }}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-300 bg-white px-4 text-sm font-bold text-red-700 transition hover:bg-red-50 dark:border-red-900 dark:bg-zinc-900 dark:text-red-300 dark:hover:bg-red-950/40"
                  >
                    <XCircle size={17} aria-hidden="true" />
                    ยกเลิกคำสั่งซื้อ
                  </button>
                ) : null}
                <Link
                  href={`/orders/${order.detail.id}`}
                  className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-bold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                >
                  ดูรายละเอียด
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {cancelTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="cancel-order-title">
          <section className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <h2 id="cancel-order-title" className="text-lg font-extrabold text-zinc-900 dark:text-zinc-100">ยืนยันการยกเลิกคำสั่งซื้อ</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              คุณต้องการยกเลิกคำสั่งซื้อหมายเลข #{cancelTarget.detail.id} ใช่หรือไม่? สินค้าในรายการจะถูกส่งคืนกลับเข้าสู่สต็อก
            </p>
            {cancelError ? <p role="alert" className="mt-3 text-sm font-semibold text-red-700 dark:text-red-300">{cancelError}</p> : null}
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setCancelTarget(null)} className="min-h-10 rounded-lg border border-zinc-300 px-4 text-sm font-semibold text-zinc-700 dark:border-zinc-700 dark:text-zinc-200">กลับ</button>
              <button type="button" onClick={confirmCancellation} className="min-h-10 rounded-lg bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-700">ยืนยันยกเลิก</button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

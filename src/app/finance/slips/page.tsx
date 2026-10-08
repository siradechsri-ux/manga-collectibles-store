"use client";

import { AlertTriangle, BadgeCheck, ReceiptText } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import {
  listMockOrders,
  type MockStoredOrder,
} from "../../../mocks/storage.mock";

export default function FinanceSlipsPage() {
  const { user, isLoading } = useAuth();
  const [orders, setOrders] = useState<MockStoredOrder[]>([]);
  const [shoppingDisabledNotice, setShoppingDisabledNotice] = useState(false);

  const refreshOrders = useCallback((): void => {
    if (user?.role === "FINANCE") {
      setOrders(
        listMockOrders().filter(
          (order) =>
            order.detail.paymentStatus === "PAID" ||
            order.detail.paymentStatus === "DEPOSIT_PAID",
        ),
      );
    }
  }, [user?.role]);

  useEffect(() => {
    refreshOrders();
  }, [refreshOrders]);

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
                    <p className="mt-1 text-xs font-semibold text-emerald-800">
                      {order.detail.paymentStatus === "DEPOSIT_PAID"
                        ? "ยืนยันยอดมัดจำ"
                        : "ยืนยันชำระเต็มจำนวน"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <p className="text-sm font-extrabold text-slate-950">
                    ฿{order.detail.paidAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                  </p>
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
    </main>
  );
}

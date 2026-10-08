"use client";

import {
  AlertTriangle,
  BellRing,
  Clock3,
  PackageCheck,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  listMockOrders,
  markAllMockDepositOrdersArrived,
  type MockStoredOrder,
  type MockWaitlistEntry,
  getMockWaitlistEntries,
  MOCK_WAITLIST_UPDATED_EVENT,
} from "../../mocks/storage.mock";

export default function AdminDashboardPage() {
  const { user, isLoading } = useAuth();
  const [orders, setOrders] = useState<MockStoredOrder[]>([]);
  const [waitlist, setWaitlist] = useState<MockWaitlistEntry[]>([]);
  const [shoppingDisabledNotice, setShoppingDisabledNotice] = useState(false);
  const [isTriggeringArrival, setIsTriggeringArrival] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshDashboard = useCallback((): void => {
    setOrders(listMockOrders());
    setWaitlist(getMockWaitlistEntries());
  }, []);

  useEffect(() => {
    refreshDashboard();
    window.addEventListener(MOCK_WAITLIST_UPDATED_EVENT, refreshDashboard);
    window.addEventListener("storage", refreshDashboard);
    return () => {
      window.removeEventListener(MOCK_WAITLIST_UPDATED_EVENT, refreshDashboard);
      window.removeEventListener("storage", refreshDashboard);
    };
  }, [refreshDashboard]);

  useEffect(() => {
    setShoppingDisabledNotice(
      new URLSearchParams(window.location.search).get("notice") ===
        "shopping-disabled",
    );
  }, []);

  function triggerArrival(): void {
    setError(null);
    setNotice(null);
    setIsTriggeringArrival(true);
    try {
      const result = markAllMockDepositOrdersArrived();
      refreshDashboard();
      setNotice(
        result.updatedCount > 0
          ? `จำลองสินค้าเข้าไทยแล้ว ${result.updatedCount} คำสั่งซื้อ กำหนดชำระอีก 14 วัน`
          : "ไม่พบคำสั่งซื้อที่ชำระมัดจำและยังรอสินค้าเข้าไทย",
      );
    } catch (arrivalError) {
      setError(
        arrivalError instanceof Error
          ? arrivalError.message
          : "อัปเดตสถานะสินค้าไม่สำเร็จ",
      );
    } finally {
      setIsTriggeringArrival(false);
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-6xl items-center justify-center px-4">
        <p role="status" className="text-sm text-slate-500">
          กำลังตรวจสอบสิทธิ์ผู้ดูแลระบบ...
        </p>
      </main>
    );
  }

  if (user?.role !== "ADMIN") {
    return (
      <main className="mx-auto flex min-h-[65vh] max-w-xl flex-col items-center justify-center px-5 text-center">
        <AlertTriangle size={34} className="text-red-600" aria-hidden="true" />
        <p className="mt-4 text-sm font-bold uppercase tracking-wider text-red-700">
          HTTP 403 · Admin Only
        </p>
        <h1 className="mt-2 text-2xl font-extrabold text-slate-950">
          ไม่มีสิทธิ์เข้าถึงระบบจัดการ
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          สลับ Role เป็น ADMIN ผ่านแถบสลับบทบาททดสอบเพื่อเปิดหน้าจำลองนี้
        </p>
        <Link href="/" className="mt-5 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white">
          กลับหน้าร้าน
        </Link>
      </main>
    );
  }

  const depositOrders = orders.filter(
    (order) =>
      order.detail.paymentStatus === "DEPOSIT_PAID" &&
      order.detail.remainingBalance > 0,
  );
  const awaitingBalanceOrders = orders.filter(
    (order) => order.detail.status === "AWAITING_BALANCE_PAYMENT",
  );

  return (
    <main className="mx-auto min-h-[75vh] max-w-7xl px-4 py-8 pb-28 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-extrabold tracking-wide text-violet-700">
            ADMIN · STORE CONTROL
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950">
            ระบบจัดการหลังบ้าน
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            สินค้าพรีออเดอร์, คำสั่งซื้อที่รอชำระยอดคงเหลือ และคิว Waitlist
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl bg-violet-50 px-4 py-3">
            <p className="text-2xl font-extrabold text-violet-900">
              {depositOrders.length}
            </p>
            <p className="text-xs font-semibold text-violet-700">รอสินค้าเข้าไทย</p>
          </div>
          <div className="rounded-xl bg-red-50 px-4 py-3">
            <p className="text-2xl font-extrabold text-red-900">
              {awaitingBalanceOrders.length}
            </p>
            <p className="text-xs font-semibold text-red-700">รอจ่ายยอดคงเหลือ</p>
          </div>
        </div>
      </header>

      {error ? (
        <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-800">
          {error}
        </p>
      ) : null}
      {shoppingDisabledNotice ? (
        <p
          role="status"
          className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900"
        >
          บัญชีเจ้าหน้าที่ไม่สามารถทำรายการสั่งซื้อได้
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          {notice}
        </p>
      ) : null}

      <Link
        href="/admin/products"
        className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-800 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-orange-800 dark:hover:bg-zinc-800"
      >
        <PackageCheck size={17} aria-hidden="true" />
        จัดการสินค้าและสต็อก
      </Link>

      <section className="mt-7 rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-950 via-violet-900 to-indigo-900 p-6 text-white shadow-lg sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-violet-100 ring-1 ring-white/15">
              <PackageCheck size={15} aria-hidden="true" />
              PRE-ORDER · GOOD SMILE COMPANY
            </span>
            <h2 className="mt-4 text-2xl font-extrabold sm:text-3xl">
              Nendoroid Gojo Satoru
            </h2>
            <p className="mt-2 text-sm leading-6 text-violet-100">
              ราคาเต็ม ฿1,850 · มัดจำ ฿500 · โควตาจำลอง 50 ตัว
            </p>
            <p className="mt-1 text-sm text-violet-200">
              กด Trigger Arrival เพื่อเปิดหน้าต่างชำระยอดคงเหลือ 14 วัน
              ให้ทุกคำสั่งซื้อที่ชำระมัดจำแล้ว
            </p>
          </div>
          <button
            type="button"
            onClick={triggerArrival}
            disabled={isTriggeringArrival || depositOrders.length === 0}
            className="inline-flex min-h-14 shrink-0 items-center justify-center gap-2 rounded-2xl bg-orange-400 px-6 py-4 text-sm font-extrabold text-slate-950 shadow-lg transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <BellRing size={19} aria-hidden="true" />
            {isTriggeringArrival
              ? "กำลังอัปเดตคำสั่งซื้อ..."
              : "บันทึกสินค้าถึงคลังปลายทาง"}
          </button>
        </div>
      </section>

      <div className="mt-7 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-slate-950">
                คำสั่งซื้อพรีออเดอร์
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                ตรวจสถานะมัดจำและการเรียกเก็บยอดรอบสอง
              </p>
            </div>
            <Clock3 className="text-violet-700" aria-hidden="true" />
          </div>
          {orders.length === 0 ? (
            <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
              ยังไม่มีคำสั่งซื้อจำลอง สั่งซื้อสินค้าด้วยบัญชีลูกค้าเพื่อเริ่มทดสอบ
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {orders.map((order) => (
                <article
                  key={order.detail.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link
                      href={`/orders/${order.detail.id}`}
                      className="font-bold text-slate-900 underline decoration-slate-300 underline-offset-4 hover:text-violet-800"
                    >
                      {order.detail.orderNumber}
                    </Link>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                      {order.detail.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {order.detail.items.map((item) => item.title).join(", ")}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    มัดจำแล้ว ฿{order.detail.paidAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                    {" · "}คงเหลือ ฿{order.detail.remainingBalance.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-slate-950">
                คิว Waitlist · ของหลุดจอง
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                รายชื่อจำลองเรียงตามลำดับคิวของสินค้า
              </p>
            </div>
            <UsersRound className="text-violet-700" aria-hidden="true" />
          </div>
          <div className="mt-5 space-y-3">
            {waitlist.map((entry) => (
              <article
                key={entry.id}
                className="flex items-start gap-3 rounded-xl border border-slate-200 p-4"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-extrabold text-violet-900">
                  #{entry.queuePosition}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold text-slate-900">{entry.customerName}</p>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
                        entry.status === "OFFERED"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {entry.status}
                    </span>
                  </div>
                  <p className="mt-1 break-all text-xs text-slate-500">
                    {entry.customerEmail}
                  </p>
                  <p className="mt-1 text-xs text-violet-800">{entry.productName}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

"use client";

import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BellRing,
  Boxes,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  Download,
  Eye,
  FileCheck,
  Loader2,
  PackageCheck,
  Percent,
  Receipt,
  Search,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  listMockOrders,
  markAllMockDepositOrdersArrived,
  type MockStoredOrder,
  type MockWaitlistEntry,
  getMockWaitlistEntries,
  MOCK_WAITLIST_UPDATED_EVENT,
  MOCK_ORDERS_UPDATED_EVENT,
} from "../../mocks/storage.mock";
import { listAdminProducts } from "../../mocks/admin-products.mock";

const PAGE_SIZE = 5;

export default function AdminDashboardPage() {
  const { user, isLoading } = useAuth();
  const [orders, setOrders] = useState<MockStoredOrder[]>([]);
  const [waitlist, setWaitlist] = useState<MockWaitlistEntry[]>([]);
  const [shoppingDisabledNotice, setShoppingDisabledNotice] = useState(false);
  const [isTriggeringArrival, setIsTriggeringArrival] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Search and Pagination states
  const [searchQuery, setSearchQuery] = useState("");
  const [ordersPage, setOrdersPage] = useState(1);
  const [waitlistPage, setWaitlistPage] = useState(1);

  const refreshDashboard = useCallback((): void => {
    setOrders(listMockOrders());
    setWaitlist(getMockWaitlistEntries());
  }, []);

  useEffect(() => {
    refreshDashboard();
    window.addEventListener(MOCK_WAITLIST_UPDATED_EVENT, refreshDashboard);
    window.addEventListener(MOCK_ORDERS_UPDATED_EVENT, refreshDashboard);
    window.addEventListener("storage", refreshDashboard);
    return () => {
      window.removeEventListener(MOCK_WAITLIST_UPDATED_EVENT, refreshDashboard);
      window.removeEventListener(MOCK_ORDERS_UPDATED_EVENT, refreshDashboard);
      window.removeEventListener("storage", refreshDashboard);
    };
  }, [refreshDashboard]);

  useEffect(() => {
    setShoppingDisabledNotice(
      new URLSearchParams(window.location.search).get("notice") ===
        "shopping-disabled",
    );
  }, []);

  async function triggerArrival(): Promise<void> {
    setError(null);
    setNotice(null);
    setIsTriggeringArrival(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
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

  // 4 Primary KPI Calculations
  const totalSales = useMemo(() => {
    return orders.reduce((sum, order) => sum + (order.detail.totalAmount || 0), 0);
  }, [orders]);

  const totalOrdersCount = orders.length;

  const pendingSlipsCount = useMemo(() => {
    return orders.filter(
      (order) => order.detail.status === "PAYMENT_REVIEW_PENDING",
    ).length;
  }, [orders]);

  const lowStockCount = useMemo(() => {
    try {
      const products = listAdminProducts();
      return products.filter((p: any) => {
        const stock =
          typeof p.stock === "number"
            ? p.stock
            : typeof p.stockOrQuotaRemaining === "number"
              ? p.stockOrQuotaRemaining
              : 0;
        return stock <= 5;
      }).length;
    } catch {
      return 0;
    }
  }, []);

  // Pre-order filters
  const depositOrders = useMemo(() => {
    return orders.filter(
      (order) =>
        order.detail.paymentStatus === "DEPOSIT_PAID" &&
        order.detail.remainingBalance > 0,
    );
  }, [orders]);

  const awaitingBalanceOrders = useMemo(() => {
    return orders.filter(
      (order) => order.detail.status === "AWAITING_BALANCE_PAYMENT",
    );
  }, [orders]);

  // Recent 5 Orders (Chronological descending)
  const recentOrders = useMemo(() => {
    return [...orders]
      .sort(
        (a, b) =>
          new Date(b.detail.createdAt).getTime() -
          new Date(a.detail.createdAt).getTime(),
      )
      .slice(0, 5);
  }, [orders]);

  // Search filtering
  const query = searchQuery.trim().toLowerCase();

  const filteredOrders = useMemo(() => {
    if (!query) return orders;
    return orders.filter((order) => {
      const orderNum = order.detail.orderNumber.toLowerCase();
      const status = order.detail.status.toLowerCase();
      const itemsMatch = order.detail.items.some((item) =>
        item.title.toLowerCase().includes(query),
      );
      const customerMatch =
        order.shippingAddress?.recipientName?.toLowerCase().includes(query);
      return (
        orderNum.includes(query) ||
        status.includes(query) ||
        itemsMatch ||
        Boolean(customerMatch)
      );
    });
  }, [orders, query]);

  const filteredWaitlist = useMemo(() => {
    if (!query) return waitlist;
    return waitlist.filter((entry) => {
      const name = entry.customerName.toLowerCase();
      const email = entry.customerEmail.toLowerCase();
      const product = entry.productName.toLowerCase();
      const status = entry.status.toLowerCase();
      return (
        name.includes(query) ||
        email.includes(query) ||
        product.includes(query) ||
        status.includes(query)
      );
    });
  }, [waitlist, query]);

  // Pagination calculations (5 items per page)
  const totalOrdersPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const totalWaitlistPages = Math.max(1, Math.ceil(filteredWaitlist.length / PAGE_SIZE));

  const currentOrdersPage = Math.min(ordersPage, totalOrdersPages);
  const currentWaitlistPage = Math.min(waitlistPage, totalWaitlistPages);

  const paginatedOrders = useMemo(() => {
    const start = (currentOrdersPage - 1) * PAGE_SIZE;
    return filteredOrders.slice(start, start + PAGE_SIZE);
  }, [filteredOrders, currentOrdersPage]);

  const paginatedWaitlist = useMemo(() => {
    const start = (currentWaitlistPage - 1) * PAGE_SIZE;
    return filteredWaitlist.slice(start, start + PAGE_SIZE);
  }, [filteredWaitlist, currentWaitlistPage]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setOrdersPage(1);
    setWaitlistPage(1);
  };

  const exportOrdersToCsv = () => {
    const headers = [
      "ลำดับ",
      "วันที่สั่งซื้อ",
      "เลขที่คำสั่งซื้อ",
      "ลูกค้า",
      "สถานะ",
      "สถานะการชำระเงิน",
      "รายการสินค้า",
      "ยอดมัดจำที่ชำระ (บาท)",
      "ยอดคงเหลือ (บาท)",
      "ยอดรวมสุทธิ (บาท)",
    ];

    const rows = filteredOrders.map((order, index) => {
      const date = new Date(order.detail.createdAt).toLocaleDateString("th-TH");
      const customer = order.shippingAddress?.recipientName || "ลูกค้าทั่วไป";
      const itemNames = order.detail.items
        .map((i) => `${i.title} x${i.quantity}`)
        .join("; ");
      return [
        index + 1,
        date,
        order.detail.orderNumber,
        `"${customer.replace(/"/g, '""')}"`,
        order.detail.status,
        order.detail.paymentStatus,
        `"${itemNames.replace(/"/g, '""')}"`,
        order.detail.paidAmount.toFixed(2),
        order.detail.remainingBalance.toFixed(2),
        order.detail.totalAmount.toFixed(2),
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `orders_report_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-6xl items-center justify-center px-4">
        <p role="status" className="text-sm text-slate-500 dark:text-zinc-400">
          กำลังตรวจสอบสิทธิ์ผู้ดูแลระบบ...
        </p>
      </main>
    );
  }

  if (user?.role !== "ADMIN") {
    return (
      <main className="mx-auto flex min-h-[65vh] max-w-xl flex-col items-center justify-center px-5 text-center">
        <AlertTriangle size={34} className="text-red-600" aria-hidden="true" />
        <p className="mt-4 text-sm font-bold uppercase tracking-wider text-red-700 dark:text-red-400">
          HTTP 403 · Admin Only
        </p>
        <h1 className="mt-2 text-2xl font-extrabold text-slate-950 dark:text-zinc-50">
          ไม่มีสิทธิ์เข้าถึงระบบจัดการ
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
          สลับ Role เป็น ADMIN ผ่านแถบสลับบทบาททดสอบเพื่อเปิดหน้าจำลองนี้
        </p>
        <Link
          href="/"
          className="mt-5 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white dark:bg-zinc-100 dark:text-zinc-950"
        >
          กลับหน้าร้าน
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-[75vh] max-w-7xl px-4 py-8 pb-28 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between dark:border-zinc-800">
        <div>
          <p className="text-sm font-extrabold tracking-wide text-orange-600 dark:text-orange-400">
            ADMIN · STORE OVERVIEW
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950 dark:text-zinc-50">
            ระบบจัดการหลังบ้าน
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
            ภาพรวมยอดขาย, คำสั่งซื้อ, สต็อกสินค้า และระบบบริหารจัดการร้านค้า
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-violet-50 px-3.5 py-2.5 text-center dark:bg-violet-950/50">
            <p className="text-xl font-extrabold text-violet-900 dark:text-violet-100">
              {depositOrders.length}
            </p>
            <p className="text-[11px] font-semibold text-violet-700 dark:text-violet-300">
              รอสินค้าเข้าไทย
            </p>
          </div>
          <div className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-center dark:bg-rose-950/40">
            <p className="text-xl font-extrabold text-rose-900 dark:text-rose-200">
              {awaitingBalanceOrders.length}
            </p>
            <p className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">
              รอจ่ายคงเหลือ
            </p>
          </div>
        </div>
      </header>

      {/* Notifications & Banners */}
      {error ? (
        <p
          role="alert"
          className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-800 dark:bg-red-950/40 dark:text-red-200"
        >
          {error}
        </p>
      ) : null}
      {shoppingDisabledNotice ? (
        <p
          role="status"
          className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
        >
          บัญชีเจ้าหน้าที่ไม่สามารถทำรายการสั่งซื้อได้
        </p>
      ) : null}
      {notice ? (
        <p
          role="status"
          className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
        >
          {notice}
        </p>
      ) : null}

      {/* ===================== [1. 4 Primary KPI Cards] ===================== */}
      <section
        aria-label="Key Performance Indicators"
        className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {/* KPI 1: Total Sales */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs transition hover:border-emerald-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-700">
          <div className="flex items-center justify-between">
            <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <TrendingUp size={22} aria-hidden="true" />
            </span>
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
              คำนวณจากทุกออเดอร์
            </span>
          </div>
          <p className="mt-4 text-xs font-bold text-zinc-500 dark:text-zinc-400">
            ยอดขายรวม (Total Sales)
          </p>
          <p className="mt-1 text-2xl font-black text-zinc-950 dark:text-zinc-100">
            ฿{totalSales.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        {/* KPI 2: Total Orders */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs transition hover:border-blue-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-blue-700">
          <div className="flex items-center justify-between">
            <span className="rounded-xl bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Receipt size={22} aria-hidden="true" />
            </span>
            <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400">
              ออเดอร์ทั้งหมด
            </span>
          </div>
          <p className="mt-4 text-xs font-bold text-zinc-500 dark:text-zinc-400">
            จำนวนคำสั่งซื้อ (Total Orders)
          </p>
          <p className="mt-1 text-2xl font-black text-zinc-950 dark:text-zinc-100">
            {totalOrdersCount} <span className="text-sm font-semibold text-zinc-500">รายการ</span>
          </p>
        </div>

        {/* KPI 3: Pending Slips */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs transition hover:border-amber-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-amber-700">
          <div className="flex items-center justify-between">
            <span className="rounded-xl bg-amber-50 p-2.5 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <FileCheck size={22} aria-hidden="true" />
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                pendingSlipsCount > 0
                  ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300"
                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              {pendingSlipsCount > 0 ? "ต้องตรวจสอบ" : "ปกติ"}
            </span>
          </div>
          <p className="mt-4 text-xs font-bold text-zinc-500 dark:text-zinc-400">
            สลิปรอตรวจสอบ (Pending Slips)
          </p>
          <p className="mt-1 text-2xl font-black text-zinc-950 dark:text-zinc-100">
            {pendingSlipsCount} <span className="text-sm font-semibold text-zinc-500">รายการ</span>
          </p>
        </div>

        {/* KPI 4: Low Stock Alert */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs transition hover:border-rose-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-rose-700">
          <div className="flex items-center justify-between">
            <span className="rounded-xl bg-rose-50 p-2.5 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
              <Boxes size={22} aria-hidden="true" />
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                lowStockCount > 0
                  ? "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-300"
                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              {lowStockCount > 0 ? "สต็อกเหลือน้อย" : "พร้อมจำหน่าย"}
            </span>
          </div>
          <p className="mt-4 text-xs font-bold text-zinc-500 dark:text-zinc-400">
            สินค้าใกล้หมดสต็อก (Low Stock Alert)
          </p>
          <p className="mt-1 text-2xl font-black text-zinc-950 dark:text-zinc-100">
            {lowStockCount} <span className="text-sm font-semibold text-zinc-500">รายการ</span>
          </p>
        </div>
      </section>

      {/* Subsystem Navigation Shortcut Buttons */}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/admin/products"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-800 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-orange-800 dark:hover:bg-zinc-800"
        >
          <PackageCheck size={17} aria-hidden="true" />
          <span>จัดการสินค้าและสต็อก</span>
        </Link>
        <Link
          href="/admin/calendar"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-800 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-orange-800 dark:hover:bg-zinc-800"
        >
          <CalendarDays size={17} className="text-orange-600 dark:text-orange-400" aria-hidden="true" />
          <span>จัดการตารางวางจำหน่าย</span>
        </Link>
        <Link
          href="/admin/kuji"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-800 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-amber-800 dark:hover:bg-zinc-800"
        >
          <Sparkles size={17} className="text-amber-500" aria-hidden="true" />
          <span>จัดการตู้จับฉลาก Kuji</span>
        </Link>
        <Link
          href="/admin/promotions"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-800 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-rose-800 dark:hover:bg-zinc-800"
        >
          <Percent size={17} className="text-rose-600 dark:text-rose-400" aria-hidden="true" />
          <span>จัดการโปรโมชั่น & แฟลชเซลล์</span>
        </Link>
        <button
          type="button"
          onClick={exportOrdersToCsv}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-900 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200 dark:hover:bg-emerald-900/60"
        >
          <Download size={17} aria-hidden="true" />
          <span>ส่งออกรายงานยอดขาย (CSV)</span>
        </button>
      </div>

      {/* ===================== [2. Recent Orders Table (5 Latest Orders)] ===================== */}
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 dark:text-zinc-100">
                คำสั่งซื้อล่าสุด (Recent Orders)
              </h2>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-black text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                5 รายการล่าสุด
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
              รายการคำสั่งซื้อ 5 ออเดอร์ล่าสุดในระบบ พร้อมสถานะ ลูกค้า และยอดชำระ
            </p>
          </div>

          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            ทั้งหมด {orders.length} คำสั่งซื้อ
          </span>
        </div>

        {recentOrders.length === 0 ? (
          <p className="mt-6 rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500 dark:bg-zinc-800 dark:text-zinc-400">
            ยังไม่มีคำสั่งซื้อในระบบ สั่งซื้อสินค้าผ่านหน้าร้านเพื่อเริ่มต้นทดสอบ
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
                  <th scope="col" className="py-2.5 px-3 font-bold">เลขที่คำสั่งซื้อ</th>
                  <th scope="col" className="py-2.5 px-3 font-bold">วันที่</th>
                  <th scope="col" className="py-2.5 px-3 font-bold">ลูกค้า</th>
                  <th scope="col" className="py-2.5 px-3 font-bold">สรุปสินค้า</th>
                  <th scope="col" className="py-2.5 px-3 font-bold">ยอดสุทธิ</th>
                  <th scope="col" className="py-2.5 px-3 font-bold">สถานะ</th>
                  <th scope="col" className="py-2.5 px-3 text-right font-bold">ดูรายละเอียด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {recentOrders.map((order) => {
                  const customer =
                    order.shippingAddress?.recipientName || "ลูกค้าทั่วไป";
                  const itemsSummary = order.detail.items
                    .map((item) => `${item.title} x${item.quantity}`)
                    .join(", ");
                  const dateStr = new Date(order.detail.createdAt).toLocaleDateString(
                    "th-TH",
                    {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    },
                  );

                  return (
                    <tr
                      key={order.detail.id}
                      className="hover:bg-zinc-50/70 transition dark:hover:bg-zinc-800/40"
                    >
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-zinc-100">
                        <Link
                          href={`/orders/${order.detail.id}`}
                          className="hover:text-orange-600 dark:hover:text-orange-400 underline decoration-slate-300 underline-offset-2"
                        >
                          {order.detail.orderNumber}
                        </Link>
                      </td>
                      <td className="py-3 px-3 text-zinc-600 dark:text-zinc-400">
                        {dateStr}
                      </td>
                      <td className="py-3 px-3 font-semibold text-zinc-900 dark:text-zinc-100">
                        {customer}
                      </td>
                      <td className="py-3 px-3 max-w-xs">
                        <p className="line-clamp-1 text-zinc-600 dark:text-zinc-400">
                          {itemsSummary}
                        </p>
                      </td>
                      <td className="py-3 px-3 font-black text-zinc-950 dark:text-zinc-100 whitespace-nowrap">
                        ฿{order.detail.totalAmount.toLocaleString("th-TH", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            order.detail.status === "PAID"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : order.detail.status === "DEPOSIT_PAID"
                                ? "bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300"
                                : order.detail.status === "PAYMENT_REVIEW_PENDING"
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                  : order.detail.status === "AWAITING_BALANCE_PAYMENT"
                                    ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                                    : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                          }`}
                        >
                          {order.detail.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          href={`/orders/${order.detail.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-750 transition"
                        >
                          <Eye size={13} aria-hidden="true" />
                          <span>ดูออเดอร์</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Search Input Bar */}
      <div className="mt-7 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-900">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="ค้นหาเลขออเดอร์, ชื่อสินค้า, หรือคิว Waitlist..."
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 text-sm text-slate-900 transition placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-200 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:border-orange-400 dark:focus:ring-orange-950"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => handleSearchChange("")}
              aria-label="ล้างคำค้นหา"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300"
            >
              <X size={16} aria-hidden="true" />
            </button>
          ) : null}
        </div>
        {searchQuery ? (
          <p className="shrink-0 text-xs text-slate-500 dark:text-zinc-400">
            พบคำสั่งซื้อ {filteredOrders.length} รายการ · คิว {filteredWaitlist.length} รายการ
          </p>
        ) : null}
      </div>

      {/* Pre-order Simulation Card */}
      <section className="mt-7 rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-950 via-violet-900 to-indigo-900 p-6 text-white shadow-lg sm:p-8 dark:border-violet-800">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-violet-100 ring-1 ring-white/15">
              <PackageCheck size={15} aria-hidden="true" />
              <span>PRE-ORDER · GOOD SMILE COMPANY</span>
            </span>
            <h2 className="mt-4 text-2xl font-extrabold sm:text-3xl">
              Nendoroid Gojo Satoru
            </h2>
            <p className="mt-2 text-sm leading-6 text-violet-100">
              ราคาเต็ม ฿1,850 · มัดจำ ฿500 · โควตาจำลอง 50 ตัว
            </p>
            <p className="mt-1 text-sm text-violet-200">
              กดปุ่มจำลองสินค้าถึงคลังเพื่อเปิดหน้าต่างชำระยอดคงเหลือ 14 วัน
              ให้ทุกคำสั่งซื้อที่ชำระมัดจำแล้ว
            </p>
          </div>
          <button
            type="button"
            onClick={triggerArrival}
            disabled={isTriggeringArrival || depositOrders.length === 0}
            className="inline-flex min-h-14 shrink-0 items-center justify-center gap-2 rounded-2xl bg-orange-400 px-6 py-4 text-sm font-extrabold text-slate-950 shadow-lg transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isTriggeringArrival ? (
              <Loader2 size={19} className="animate-spin text-slate-950" aria-hidden="true" />
            ) : (
              <BellRing size={19} aria-hidden="true" />
            )}
            <span>
              {isTriggeringArrival
                ? "กำลังบันทึกสินค้าถึงคลัง..."
                : "บันทึกสินค้าถึงคลังปลายทาง"}
            </span>
          </button>
        </div>
      </section>

      {/* Pre-order Orders & Waitlist Grids */}
      <div className="mt-7 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        {/* Pre-order Orders Table with 5 items/page pagination */}
        <section className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-slate-950 dark:text-zinc-50">
                  คำสั่งซื้อพรีออเดอร์
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
                  ตรวจสถานะมัดจำและการเรียกเก็บยอดรอบสอง (แสดงหน้าละ {PAGE_SIZE} รายการ)
                </p>
              </div>
              <Clock3 className="text-violet-700 dark:text-violet-300" aria-hidden="true" />
            </div>

            {filteredOrders.length === 0 ? (
              <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-zinc-800 dark:text-zinc-400">
                {searchQuery
                  ? "ไม่พบคำสั่งซื้อที่ตรงกับคำค้นหา"
                  : "ยังไม่มีคำสั่งซื้อจำลอง สั่งซื้อสินค้าด้วยบัญชีลูกค้าเพื่อเริ่มทดสอบ"}
              </p>
            ) : (
              <div className="mt-5 space-y-3">
                {paginatedOrders.map((order) => (
                  <article
                    key={order.detail.id}
                    className="rounded-xl border border-slate-200 p-4 transition hover:border-violet-300 dark:border-zinc-800 dark:hover:border-violet-700"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link
                        href={`/orders/${order.detail.id}`}
                        className="font-bold text-slate-900 underline decoration-slate-300 underline-offset-4 hover:text-violet-800 dark:text-zinc-100 dark:decoration-zinc-600 dark:hover:text-violet-300"
                      >
                        {order.detail.orderNumber}
                      </Link>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-zinc-800 dark:text-zinc-200">
                        {order.detail.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
                      {order.detail.items.map((item) => item.title).join(", ")}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-zinc-100">
                      มัดจำแล้ว ฿{order.detail.paidAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                      {" · "}คงเหลือ ฿{order.detail.remainingBalance.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>

          {/* Pagination Controls for Orders */}
          {filteredOrders.length > 0 ? (
            <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setOrdersPage((p) => Math.max(1, p - 1))}
                disabled={currentOrdersPage <= 1}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                <ChevronLeft size={15} aria-hidden="true" />
                ย้อนกลับ
              </button>
              <span className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
                หน้า {currentOrdersPage} จาก {totalOrdersPages} ({filteredOrders.length} รายการ)
              </span>
              <button
                type="button"
                onClick={() => setOrdersPage((p) => Math.min(totalOrdersPages, p + 1))}
                disabled={currentOrdersPage >= totalOrdersPages}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                ถัดไป
                <ChevronRight size={15} aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </section>

        {/* Waitlist Queue Table with 5 items/page pagination */}
        <section className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-slate-950 dark:text-zinc-50">
                  คิว Waitlist · ของหลุดจอง
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
                  รายชื่อจำลองเรียงตามลำดับคิว (แสดงหน้าละ {PAGE_SIZE} รายการ)
                </p>
              </div>
              <UsersRound className="text-violet-700 dark:text-violet-300" aria-hidden="true" />
            </div>

            {filteredWaitlist.length === 0 ? (
              <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-zinc-800 dark:text-zinc-400">
                {searchQuery
                  ? "ไม่พบคิว Waitlist ที่ตรงกับคำค้นหา"
                  : "ยังไม่มีรายการในคิว Waitlist"}
              </p>
            ) : (
              <div className="mt-5 space-y-3">
                {paginatedWaitlist.map((entry) => (
                  <article
                    key={entry.id}
                    className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-violet-300 dark:border-zinc-800 dark:hover:border-violet-700"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-extrabold text-violet-900 dark:bg-violet-950 dark:text-violet-200">
                      #{entry.queuePosition}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-bold text-slate-900 dark:text-zinc-100">{entry.customerName}</p>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
                            entry.status === "OFFERED"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                              : "bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300"
                          }`}
                        >
                          {entry.status}
                        </span>
                      </div>
                      <p className="mt-1 break-all text-xs text-slate-500 dark:text-zinc-400">
                        {entry.customerEmail}
                      </p>
                      <p className="mt-1 text-xs text-violet-800 dark:text-violet-300">{entry.productName}</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          {/* Pagination Controls for Waitlist */}
          {filteredWaitlist.length > 0 ? (
            <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setWaitlistPage((p) => Math.max(1, p - 1))}
                disabled={currentWaitlistPage <= 1}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                <ChevronLeft size={15} aria-hidden="true" />
                ย้อนกลับ
              </button>
              <span className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
                หน้า {currentWaitlistPage} จาก {totalWaitlistPages} ({filteredWaitlist.length} รายการ)
              </span>
              <button
                type="button"
                onClick={() => setWaitlistPage((p) => Math.min(totalWaitlistPages, p + 1))}
                disabled={currentWaitlistPage >= totalWaitlistPages}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                ถัดไป
                <ChevronRight size={15} aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

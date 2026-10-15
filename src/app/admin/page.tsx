"use client";

import {
  AlertTriangle,
  BellRing,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Loader2,
  PackageCheck,
  Plus,
  Power,
  Search,
  Tag,
  Trash2,
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
  simulateMock14DayExpiry,
  MOCK_WAITLIST_UPDATED_EVENT,
} from "../../mocks/storage.mock";
import {
  type PromoCoupon,
  listPromoCodes,
  savePromoCode,
  deletePromoCode,
  togglePromoCodeStatus,
  MOCK_PROMO_CODES_UPDATED_EVENT,
} from "../../utils/promo";

const PAGE_SIZE = 5;

export default function AdminDashboardPage() {
  const { user, isLoading } = useAuth();
  const [orders, setOrders] = useState<MockStoredOrder[]>([]);
  const [waitlist, setWaitlist] = useState<MockWaitlistEntry[]>([]);
  const [coupons, setCoupons] = useState<PromoCoupon[]>([]);
  const [shoppingDisabledNotice, setShoppingDisabledNotice] = useState(false);
  const [isTriggeringArrival, setIsTriggeringArrival] = useState(false);
  const [isSimulatingExpiry, setIsSimulatingExpiry] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Search and Pagination states
  const [searchQuery, setSearchQuery] = useState("");
  const [ordersPage, setOrdersPage] = useState(1);
  const [waitlistPage, setWaitlistPage] = useState(1);
  const [couponsPage, setCouponsPage] = useState(1);

  // Create Coupon Modal/Form state
  const [isCreateCouponOpen, setIsCreateCouponOpen] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponTitle, setCouponTitle] = useState("");
  const [couponDesc, setCouponDesc] = useState("");
  const [couponType, setCouponType] = useState<"PERCENTAGE" | "FIXED" | "FREE_SHIPPING">("PERCENTAGE");
  const [couponValue, setCouponValue] = useState<number>(10);
  const [couponMinSpend, setCouponMinSpend] = useState<number>(0);
  const [couponExpiresAt, setCouponExpiresAt] = useState<string>("");

  const refreshDashboard = useCallback((): void => {
    setOrders(listMockOrders());
    setWaitlist(getMockWaitlistEntries());
    setCoupons(listPromoCodes());
  }, []);

  useEffect(() => {
    refreshDashboard();
    window.addEventListener(MOCK_WAITLIST_UPDATED_EVENT, refreshDashboard);
    window.addEventListener(MOCK_PROMO_CODES_UPDATED_EVENT, refreshDashboard);
    window.addEventListener("storage", refreshDashboard);
    return () => {
      window.removeEventListener(MOCK_WAITLIST_UPDATED_EVENT, refreshDashboard);
      window.removeEventListener(MOCK_PROMO_CODES_UPDATED_EVENT, refreshDashboard);
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

  async function simulateFourteenDays(): Promise<void> {
    setError(null);
    setNotice(null);
    setIsSimulatingExpiry(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const result = simulateMock14DayExpiry();
      refreshDashboard();
      const summary = `ปรับสถานะออเดอร์หมดอายุแล้ว ${result.expiredCount} รายการ และโอนสิทธิ์ให้คิว Waitlist ลำดับถัดไปสำเร็จ ${result.waitlistTransfers} รายการ`;
      setNotice(summary);
      window.alert(summary);
    } catch (simulationError) {
      setError(
        simulationError instanceof Error
          ? simulationError.message
          : "จำลองวันหมดอายุและจัดสรรคิว Waitlist ไม่สำเร็จ",
      );
    } finally {
      setIsSimulatingExpiry(false);
    }
  }

  const depositOrders = orders.filter(
    (order) =>
      order.detail.paymentStatus === "DEPOSIT_PAID" &&
      order.detail.remainingBalance > 0,
  );
  const awaitingBalanceOrders = orders.filter(
    (order) => order.detail.status === "AWAITING_BALANCE_PAYMENT",
  );

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

  const filteredCoupons = useMemo(() => {
    if (!query) return coupons;
    return coupons.filter((coupon) => {
      const code = coupon.code.toLowerCase();
      const title = coupon.title.toLowerCase();
      const desc = coupon.description.toLowerCase();
      return code.includes(query) || title.includes(query) || desc.includes(query);
    });
  }, [coupons, query]);

  // Pagination calculations (5 items per page)
  const totalOrdersPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const totalWaitlistPages = Math.max(1, Math.ceil(filteredWaitlist.length / PAGE_SIZE));
  const totalCouponsPages = Math.max(1, Math.ceil(filteredCoupons.length / PAGE_SIZE));

  const currentOrdersPage = Math.min(ordersPage, totalOrdersPages);
  const currentWaitlistPage = Math.min(waitlistPage, totalWaitlistPages);
  const currentCouponsPage = Math.min(couponsPage, totalCouponsPages);

  const paginatedOrders = useMemo(() => {
    const start = (currentOrdersPage - 1) * PAGE_SIZE;
    return filteredOrders.slice(start, start + PAGE_SIZE);
  }, [filteredOrders, currentOrdersPage]);

  const paginatedWaitlist = useMemo(() => {
    const start = (currentWaitlistPage - 1) * PAGE_SIZE;
    return filteredWaitlist.slice(start, start + PAGE_SIZE);
  }, [filteredWaitlist, currentWaitlistPage]);

  const paginatedCoupons = useMemo(() => {
    const start = (currentCouponsPage - 1) * PAGE_SIZE;
    return filteredCoupons.slice(start, start + PAGE_SIZE);
  }, [filteredCoupons, currentCouponsPage]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setOrdersPage(1);
    setWaitlistPage(1);
    setCouponsPage(1);
  };

  const formatExpiryThai = (isoDate: string) => {
    try {
      const date = new Date(isoDate);
      return date.toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoDate;
    }
  };

  const isCouponExpired = (isoDate: string) => {
    return new Date() > new Date(isoDate);
  };

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) {
      setError("กรุณากรอกรหัสโค้ดส่วนลด เช่น SUMMER20");
      return;
    }
    try {
      const expDate = couponExpiresAt
        ? new Date(couponExpiresAt).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      savePromoCode({
        code: couponCode.trim().toUpperCase(),
        title: couponTitle.trim() || `ส่วนลด ${couponCode.trim().toUpperCase()}`,
        description:
          couponDesc.trim() ||
          (couponType === "FREE_SHIPPING"
            ? "ฟรีค่าจัดส่งพัสดุทั่วไทย"
            : couponType === "PERCENTAGE"
              ? `รับส่วนลด ${couponValue}% สำหรับยอดสินค้า`
              : `รับส่วนลดทันที ฿${couponValue}`),
        type: couponType,
        value: Number(couponValue) || 0,
        minSpend: Number(couponMinSpend) || 0,
        expiresAt: expDate,
        isActive: true,
      });
      refreshDashboard();
      setNotice(`บันทึกโค้ดส่วนลด "${couponCode.trim().toUpperCase()}" เรียบร้อยแล้ว`);
      setIsCreateCouponOpen(false);
      setCouponCode("");
      setCouponTitle("");
      setCouponDesc("");
      setCouponValue(10);
      setCouponMinSpend(0);
      setCouponExpiresAt("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "สร้างโค้ดไม่สำเร็จ");
    }
  };

  const handleDeleteCoupon = (code: string) => {
    if (confirm(`คุณต้องการลบโค้ด "${code}" ใช่หรือไม่?`)) {
      deletePromoCode(code);
      refreshDashboard();
      setNotice(`ลบโค้ด "${code}" เรียบร้อยแล้ว`);
    }
  };

  const handleToggleCoupon = (code: string) => {
    togglePromoCodeStatus(code);
    refreshDashboard();
    setNotice(`สลับสถานะเปิด/ปิด โค้ด "${code}" สำเร็จ`);
  };

  const handleQuickAddPreset = (presetType: "NEW_15" | "EXPIRED_TEST") => {
    if (presetType === "NEW_15") {
      const code = `VIP${Math.floor(100 + Math.random() * 900)}`;
      const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      savePromoCode({
        code,
        title: "ส่วนลด VIP 15%",
        description: "ส่วนลดพิเศษ 15% (หมดเขตใน 7 วัน)",
        type: "PERCENTAGE",
        value: 15,
        minSpend: 500,
        expiresAt: in7Days,
        isActive: true,
      });
      refreshDashboard();
      setNotice(`สร้างโค้ดทดสอบ "${code}" (อายุ 7 วัน) สำเร็จ`);
    } else {
      const code = `OLD${Math.floor(100 + Math.random() * 900)}`;
      const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      savePromoCode({
        code,
        title: "โค้ดหมดอายุ (สำหรับทดสอบ)",
        description: "โค้ดหมดเขตแล้ว 2 วันที่ผ่านมา เพื่อทดสอบระบบแจ้งเตือน",
        type: "FIXED",
        value: 100,
        minSpend: 0,
        expiresAt: pastDate,
        isActive: true,
      });
      refreshDashboard();
      setNotice(`สร้างโค้ดทดสอบหมดอายุ "${code}" สำเร็จ`);
    }
  };

  const exportOrdersToCsv = () => {
    const headers = [
      "ลำดับ",
      "วันที่สั่งซื้อ",
      "เลขที่คำสั่งซื้อ",
      "สถานะ",
      "สถานะการชำระเงิน",
      "รายการสินค้า",
      "ยอดมัดจำที่ชำระ (บาท)",
      "ยอดคงเหลือ (บาท)",
      "ยอดรวมสุทธิ (บาท)",
    ];

    const rows = filteredOrders.map((order, index) => {
      const date = new Date(order.detail.createdAt).toLocaleDateString("th-TH");
      const itemNames = order.detail.items
        .map((i) => `${i.title} x${i.quantity}`)
        .join("; ");
      return [
        index + 1,
        date,
        order.detail.orderNumber,
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
        <Link href="/" className="mt-5 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white dark:bg-zinc-100 dark:text-zinc-950">
          กลับหน้าร้าน
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-[75vh] max-w-7xl px-4 py-8 pb-28 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between dark:border-zinc-800">
        <div>
          <p className="text-sm font-extrabold tracking-wide text-violet-700 dark:text-violet-300">
            ADMIN · STORE CONTROL
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950 dark:text-zinc-50">
            ระบบจัดการหลังบ้าน
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
            สินค้าพรีออเดอร์, คำสั่งซื้อที่รอชำระยอดคงเหลือ และคิว Waitlist
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl bg-violet-50 px-4 py-3 dark:bg-violet-950/50">
            <p className="text-2xl font-extrabold text-violet-900 dark:text-violet-100">
              {depositOrders.length}
            </p>
            <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">รอสินค้าเข้าไทย</p>
          </div>
          <div className="rounded-xl bg-red-50 px-4 py-3 dark:bg-red-950/40">
            <p className="text-2xl font-extrabold text-red-900 dark:text-red-200">
              {awaitingBalanceOrders.length}
            </p>
            <p className="text-xs font-semibold text-red-700 dark:text-red-300">รอจ่ายยอดคงเหลือ</p>
          </div>
        </div>
      </header>

      {error ? (
        <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-800 dark:bg-red-950/40 dark:text-red-200">
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
        <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          {notice}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/admin/products"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-800 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-orange-800 dark:hover:bg-zinc-800"
        >
          <PackageCheck size={17} aria-hidden="true" />
          จัดการสินค้าและสต็อก
        </Link>
        <button
          type="button"
          onClick={exportOrdersToCsv}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-900 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200 dark:hover:bg-emerald-900/60"
        >
          <Download size={17} aria-hidden="true" />
          ส่งออกรายงานยอดขาย (CSV)
        </button>
        <button
          type="button"
          onClick={simulateFourteenDays}
          disabled={isSimulatingExpiry}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-violet-300 bg-violet-50 px-4 py-2.5 text-sm font-bold text-violet-900 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-200 dark:hover:bg-violet-900/60"
        >
          {isSimulatingExpiry ? (
            <Loader2 size={17} className="animate-spin text-violet-700 dark:text-violet-300" aria-hidden="true" />
          ) : (
            <Clock3 size={17} aria-hidden="true" />
          )}
          <span>{isSimulatingExpiry ? "กำลังจำลองเวลา 14 วัน..." : "จำลองเวลา: ผ่านไป 14 วัน"}</span>
        </button>
      </div>

      {/* Search Input Bar */}
      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-900">
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
            placeholder="ค้นหาเลขออเดอร์, ชื่อสินค้า, คิว Waitlist, หรือโค้ดส่วนลด..."
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 text-sm text-slate-900 transition placeholder:text-slate-400 focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-200 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:border-violet-400 dark:focus:ring-violet-950"
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

      <section className="mt-7 rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-950 via-violet-900 to-indigo-900 p-6 text-white shadow-lg sm:p-8 dark:border-violet-800">
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

      {/* ===================== [Promo Code & Coupon Management Section] ===================== */}
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400">
              <Tag size={20} aria-hidden="true" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-zinc-100">
                  จัดการโค้ดส่วนลด & โปรโมชัน (Promo Coupons)
                </h2>
                <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-black text-orange-800 dark:bg-orange-950 dark:text-orange-300">
                  {filteredCoupons.length} โค้ด
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
                เพิ่ม ลบ สลับสถานะ และกำหนดวันหมดอายุของโค้ดส่วนลด (แสดงหน้าละ {PAGE_SIZE} รายการ)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleQuickAddPreset("NEW_15")}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50/70 px-3 py-1.5 text-xs font-bold text-orange-800 transition hover:bg-orange-100 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-300"
            >
              <Plus size={14} aria-hidden="true" />
              เพิ่มโค้ด VIP 15% (7 วัน)
            </button>
            <button
              type="button"
              onClick={() => handleQuickAddPreset("EXPIRED_TEST")}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-1.5 text-xs font-bold text-rose-800 transition hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
            >
              <Clock3 size={14} aria-hidden="true" />
              เพิ่มโค้ดทดสอบหมดอายุ
            </button>
            <button
              type="button"
              onClick={() => setIsCreateCouponOpen((prev) => !prev)}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-orange-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-orange-700"
            >
              <Plus size={14} aria-hidden="true" />
              {isCreateCouponOpen ? "ปิดฟอร์ม" : "สร้างโค้ดใหม่"}
            </button>
          </div>
        </div>

        {/* Create Coupon Form Drawer / Collapse */}
        {isCreateCouponOpen && (
          <form
            onSubmit={handleCreateCoupon}
            className="mt-6 rounded-xl border border-orange-200 bg-orange-50/30 p-5 dark:border-orange-900/60 dark:bg-orange-950/20"
          >
            <h3 className="text-sm font-bold text-orange-950 dark:text-orange-200">
              สร้างโค้ดโปรโมชันใหม่
            </h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300">
                  รหัสโค้ดส่วนลด (Code) *
                </label>
                <input
                  type="text"
                  required
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="เช่น SUMMER25"
                  className="mt-1 min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold uppercase tracking-wider text-slate-900 placeholder:normal-case placeholder:font-normal placeholder:tracking-normal focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300">
                  ชื่อโปรโมชัน (Title)
                </label>
                <input
                  type="text"
                  value={couponTitle}
                  onChange={(e) => setCouponTitle(e.target.value)}
                  placeholder="เช่น ส่วนลดพิเศษฤดูร้อน 25%"
                  className="mt-1 min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300">
                  ประเภทส่วนลด (Type) *
                </label>
                <select
                  value={couponType}
                  onChange={(e) =>
                    setCouponType(
                      e.target.value as "PERCENTAGE" | "FIXED" | "FREE_SHIPPING",
                    )
                  }
                  className="mt-1 min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="PERCENTAGE">เปอร์เซ็นต์ (%)</option>
                  <option value="FIXED">จำนวนเงินคงที่ (฿)</option>
                  <option value="FREE_SHIPPING">ฟรีค่าจัดส่งพัสดุ</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300">
                  มูลค่าส่วนลด (Value) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={couponValue}
                  onChange={(e) => setCouponValue(Number(e.target.value))}
                  placeholder={couponType === "PERCENTAGE" ? "เช่น 15 (ลด 15%)" : "เช่น 50 (ลด 50 บาท)"}
                  disabled={couponType === "FREE_SHIPPING"}
                  className="mt-1 min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 focus:border-orange-500 focus:outline-none disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300">
                  ยอดสั่งซื้อขั้นต่ำ (บาท)
                </label>
                <input
                  type="number"
                  min="0"
                  value={couponMinSpend}
                  onChange={(e) => setCouponMinSpend(Number(e.target.value))}
                  placeholder="0 = ไม่มีขั้นต่ำ"
                  className="mt-1 min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300">
                  วันและเวลาหมดอายุ (Expires At)
                </label>
                <input
                  type="datetime-local"
                  value={couponExpiresAt}
                  onChange={(e) => setCouponExpiresAt(e.target.value)}
                  className="mt-1 min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
                <span className="mt-1 block text-[10px] text-slate-500 dark:text-zinc-400">
                  หากไม่ระบุ ระบบจะกำหนดให้อัตโนมัติเป็น 30 วันนับจากปัจจุบัน
                </span>
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300">
                  คำอธิบายเงื่อนไข (Description)
                </label>
                <input
                  type="text"
                  value={couponDesc}
                  onChange={(e) => setCouponDesc(e.target.value)}
                  placeholder="เช่น ส่วนลดต้อนรับสมาชิกใหม่ เมื่อซื้อสินค้าครบ 300 บาท"
                  className="mt-1 min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-3 border-t border-orange-200/60 pt-4 dark:border-orange-900/40">
              <button
                type="button"
                onClick={() => setIsCreateCouponOpen(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-orange-700"
              >
                <Check size={14} aria-hidden="true" />
                บันทึกและเปิดใช้งานโค้ด
              </button>
            </div>
          </form>
        )}

        {/* Coupons List / Table */}
        {filteredCoupons.length === 0 ? (
          <p className="mt-6 rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500 dark:bg-zinc-800 dark:text-zinc-400">
            {searchQuery
              ? `ไม่พบโค้ดส่วนลดที่ตรงกับคำค้นหา "${searchQuery}"`
              : "ยังไม่มีโค้ดส่วนลดในระบบ กดปุ่ม 'สร้างโค้ดใหม่' เพื่อเริ่มใช้งาน"}
          </p>
        ) : (
          <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 dark:border-zinc-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
                  <tr>
                    <th scope="col" className="px-4 py-3">รหัสโค้ด (Code)</th>
                    <th scope="col" className="px-4 py-3">ส่วนลด</th>
                    <th scope="col" className="px-4 py-3">เงื่อนไขยอดสั่งซื้อ</th>
                    <th scope="col" className="px-4 py-3">วันและเวลาหมดอายุ</th>
                    <th scope="col" className="px-4 py-3">สถานะ</th>
                    <th scope="col" className="px-4 py-3 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
                  {paginatedCoupons.map((coupon) => {
                    const expired = isCouponExpired(coupon.expiresAt);
                    return (
                      <tr
                        key={coupon.code}
                        className="transition hover:bg-slate-50/70 dark:hover:bg-zinc-800/50"
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-extrabold text-slate-900 dark:text-zinc-100">
                              {coupon.code}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-zinc-400">
                            {coupon.title}
                          </p>
                        </td>

                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 font-bold ${
                              coupon.type === "FREE_SHIPPING"
                                ? "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300"
                                : coupon.type === "PERCENTAGE"
                                  ? "bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300"
                                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                            }`}
                          >
                            {coupon.type === "FREE_SHIPPING"
                              ? "ส่งฟรี"
                              : coupon.type === "PERCENTAGE"
                                ? `ลด ${coupon.value}%`
                                : `ลด ฿${coupon.value}`}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 font-semibold text-slate-700 dark:text-zinc-300">
                          {coupon.minSpend && coupon.minSpend > 0
                            ? `ขั้นต่ำ ฿${coupon.minSpend.toLocaleString("th-TH")}`
                            : "ไม่มีขั้นต่ำ"}
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-zinc-300">
                            <Calendar size={13} className="text-slate-400 dark:text-zinc-500" aria-hidden="true" />
                            <span>{formatExpiryThai(coupon.expiresAt)}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          {!coupon.isActive ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-zinc-800 dark:text-zinc-400">
                              ปิดใช้งาน
                            </span>
                          ) : expired ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                              หมดอายุแล้ว
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                              ใช้งานได้
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleToggleCoupon(coupon.code)}
                              title={coupon.isActive ? "ปิดการใช้งานโค้ด" : "เปิดการใช้งานโค้ด"}
                              aria-label={coupon.isActive ? `ปิดใช้งาน ${coupon.code}` : `เปิดใช้งาน ${coupon.code}`}
                              className={`rounded-lg p-1.5 transition ${
                                coupon.isActive
                                  ? "text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950"
                                  : "text-slate-400 hover:bg-slate-100 dark:text-zinc-500 dark:hover:bg-zinc-800"
                              }`}
                            >
                              <Power size={15} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCoupon(coupon.code)}
                              title="ลบโค้ด"
                              aria-label={`ลบโค้ด ${coupon.code}`}
                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:text-zinc-500 dark:hover:bg-rose-950/60 dark:hover:text-rose-400"
                            >
                              <Trash2 size={15} aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination Controls for Coupons */}
        {filteredCoupons.length > 0 ? (
          <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setCouponsPage((p) => Math.max(1, p - 1))}
              disabled={currentCouponsPage <= 1}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
              <ChevronLeft size={15} aria-hidden="true" />
              ย้อนกลับ
            </button>
            <span className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
              หน้า {currentCouponsPage} จาก {totalCouponsPages} ({filteredCoupons.length} โค้ด)
            </span>
            <button
              type="button"
              onClick={() => setCouponsPage((p) => Math.min(totalCouponsPages, p + 1))}
              disabled={currentCouponsPage >= totalCouponsPages}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
              ถัดไป
              <ChevronRight size={15} aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarClock,
  CalendarDays,
  Check,
  Clock3,
  Heart,
  Minus,
  PackageCheck,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useWishlist } from "../contexts/WishlistContext";
import { joinMockWaitlist } from "../mocks/storage.mock";
import { canShop } from "../utils/permissions";

export interface FigureProduct {
  id: string;
  name: string;
  series: string;
  character: string;
  manufacturer: string;
  scale: string;
  heightMm: number;
  janCode: string;
  images: string[];
  fullPrice: number;
  depositAmount: number;
  preorderDeadline: string;
  releaseMonthYear: string;
  status: "PREORDER_OPEN" | "PREORDER_CLOSED" | "IN_STOCK";
  stockOrQuotaRemaining: number;
  slug?: string;
  category?: "FIGURE" | "PLAMO" | "GOODS" | "ACCESSORY" | string;
  boxDimensions: {
    widthCm: number;
    lengthCm: number;
    heightCm: number;
  };
}

export type FigurePaymentOption = "FULL" | "DEPOSIT";

export interface FigurePurchaseRequest {
  product: FigureProduct;
  quantity: number;
  paymentOption: FigurePaymentOption;
}

export interface FigureDetailCardProps {
  product: FigureProduct;
  onPreorder: (request: FigurePurchaseRequest) => void;
  onAddToCart: (request: FigurePurchaseRequest) => void;
  onNotifyWhenAvailable: (product: FigureProduct) => void;
}

interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const currencyFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const thaiMonthFormatter = new Intl.DateTimeFormat("th-TH", {
  month: "short",
  year: "numeric",
});

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

function formatReleaseMonth(value: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) {
    return value;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    return value;
  }

  return thaiMonthFormatter.format(new Date(year, month - 1, 1));
}

function getCountdownParts(deadline: number, now: number): CountdownParts | null {
  const remainingMilliseconds = deadline - now;
  if (remainingMilliseconds <= 0) {
    return null;
  }

  const totalSeconds = Math.floor(remainingMilliseconds / 1000);
  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
  };
}

function formatTwoDigits(value: number): string {
  return String(value).padStart(2, "0");
}

function getValidPrice(value: number): number {
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

export default function FigureDetailCard({
  product,
  onPreorder,
  onAddToCart,
  onNotifyWhenAvailable,
}: FigureDetailCardProps) {
  const { user } = useAuth();
  const userCanShop = canShop(user?.role);
  const { isInWishlist, toggleWishlist } = useWishlist();
  const [paymentOption, setPaymentOption] = useState<FigurePaymentOption>("FULL");
  const [quantity, setQuantity] = useState(1);
  const [now, setNow] = useState(() => Date.now());
  const [waitlistFeedback, setWaitlistFeedback] = useState<{
    message: string;
    isError: boolean;
  } | null>(null);
  const [imageError, setImageError] = useState(false);

  const figureItemType = (product.category as any) || "FIGURE";
  const isWishlisted = isInWishlist(product.id, figureItemType);

  function handleToggleWishlist(): void {
    toggleWishlist({
      id: product.id,
      itemType: figureItemType,
      title: product.name,
      price:
        product.status === "PREORDER_OPEN" && product.depositAmount > 0
          ? product.depositAmount
          : product.fullPrice,
      imageUrl: product.images?.[0] || null,
      url: `/figures/${encodeURIComponent(product.slug || product.id)}`,
      category: product.category,
      isPreorder: product.status === "PREORDER_OPEN",
    });
  }

  const deadlineTimestamp = new Date(product.preorderDeadline).getTime();
  const hasValidDeadline = Number.isFinite(deadlineTimestamp);
  const countdown = hasValidDeadline
    ? getCountdownParts(deadlineTimestamp, now)
    : null;
  const depositIsAvailable =
    Number.isFinite(product.depositAmount) &&
    product.depositAmount > 0 &&
    product.depositAmount < product.fullPrice;
  const fullPrice = getValidPrice(product.fullPrice);
  const depositAmount = getValidPrice(product.depositAmount);
  const remainingPerUnit = Math.max(0, fullPrice - depositAmount);
  const itemCountIsLimited =
    Number.isFinite(product.stockOrQuotaRemaining) &&
    product.stockOrQuotaRemaining > 0;
  const maxQuantity = Math.max(
    0,
    Math.floor(
      Number.isFinite(product.stockOrQuotaRemaining)
        ? product.stockOrQuotaRemaining
        : 0,
    ),
  );
  const preorderIsOrderable =
    product.status === "PREORDER_OPEN" &&
    itemCountIsLimited &&
    hasValidDeadline &&
    deadlineTimestamp > now;
  const canPurchase =
    (product.status === "IN_STOCK" && itemCountIsLimited) ||
    preorderIsOrderable;
  const waitlistRequired =
    product.status === "PREORDER_CLOSED" ||
    product.stockOrQuotaRemaining <= 0;
  const selectedTotalPerUnit =
    paymentOption === "DEPOSIT" && depositIsAvailable ? depositAmount : fullPrice;
  const deadlineText = hasValidDeadline
    ? formatDate(product.preorderDeadline)
    : "ยังไม่ระบุ";

  useEffect(() => {
    if (!hasValidDeadline || deadlineTimestamp <= Date.now()) {
      return;
    }

    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [deadlineTimestamp, hasValidDeadline]);

  useEffect(() => {
    setQuantity(1);
    setPaymentOption("FULL");
  }, [product.id]);

  useEffect(() => {
    if (paymentOption === "DEPOSIT" && !depositIsAvailable) {
      setPaymentOption("FULL");
    }
  }, [depositIsAvailable, paymentOption]);

  function decreaseQuantity() {
    setQuantity((currentQuantity) => Math.max(1, currentQuantity - 1));
  }

  function increaseQuantity() {
    setQuantity((currentQuantity) => Math.min(maxQuantity, currentQuantity + 1));
  }

  function joinWaitlist(): void {
    setWaitlistFeedback(null);
    if (!user || user.role !== "CUSTOMER") {
      setWaitlistFeedback({
        message: "กรุณาเข้าสู่ระบบบัญชีลูกค้าเพื่อลงชื่อเข้าคิว",
        isError: true,
      });
      return;
    }
    try {
      const entry = joinMockWaitlist({
        productId: `figure-${product.id}`,
        productName: product.name,
        customerName: user.fullName,
        customerEmail: user.email,
        userId: user.id,
      });
      setWaitlistFeedback({
        message: `ลงชื่อสำเร็จ ลำดับคิวที่ ${entry.queuePosition}`,
        isError: false,
      });
    } catch (error) {
      setWaitlistFeedback({
        message:
          error instanceof Error ? error.message : "ลงชื่อเข้าคิวไม่สำเร็จ",
        isError: true,
      });
    }
  }

  function submitPurchase(action: "PREORDER" | "CART") {
    const request: FigurePurchaseRequest = {
      product,
      quantity,
      paymentOption:
        paymentOption === "DEPOSIT" && depositIsAvailable ? "DEPOSIT" : "FULL",
    };

    if (action === "PREORDER") {
      onPreorder(request);
      return;
    }

    onAddToCart(request);
  }

  return (
    <article className="mx-auto w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-1 lg:grid-cols-2">
        <section
          className="bg-slate-50 p-4 sm:p-6 lg:p-8 dark:bg-zinc-900/60"
          aria-label="ข้อมูลจำลองสินค้า"
        >
          <div className="relative flex aspect-square flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200/90 bg-white dark:border-zinc-800 dark:bg-zinc-900 shadow-xs">
            {product.images?.[0] && !imageError ? (
              <div className="relative h-full w-full overflow-hidden flex items-center justify-center p-4 sm:p-6 bg-zinc-50 dark:bg-zinc-900/80">
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="h-full w-full object-contain transition-transform duration-300 hover:scale-105"
                  onError={() => setImageError(true)}
                  loading="lazy"
                />
                <div className="absolute top-4 left-4">
                  <span className="rounded-md bg-orange-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-xs">
                    OFFICIAL COLLECTIBLE
                  </span>
                </div>
                {userCanShop ? (
                  <button
                    type="button"
                    onClick={handleToggleWishlist}
                    aria-label={isWishlisted ? "นำออกจากรายการที่ถูกใจ" : "เพิ่มในรายการที่ถูกใจ"}
                    className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-zinc-600 shadow-sm backdrop-blur-xs transition hover:scale-110 hover:text-red-600 dark:bg-zinc-800/90 dark:text-zinc-300 dark:hover:text-red-400"
                  >
                    <Heart
                      size={18}
                      className={isWishlisted ? "fill-red-500 text-red-500" : ""}
                      aria-hidden="true"
                    />
                  </button>
                ) : null}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-xl bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-xs">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck size={16} className="text-emerald-400" aria-hidden="true" />
                    <span>ของแท้ 100% ลิขสิทธิ์ถูกต้อง</span>
                  </div>
                  <span>VAT 7%</span>
                </div>
              </div>
            ) : (
              <div className="flex h-full w-full flex-col justify-between p-6 text-zinc-900 dark:text-zinc-100 sm:p-8 bg-gradient-to-br from-zinc-50 via-zinc-100/70 to-orange-50/40 dark:from-zinc-900 dark:via-zinc-850 dark:to-zinc-950">
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-orange-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-orange-800 dark:bg-orange-950 dark:text-orange-300">
                    OFFICIAL COLLECTIBLE
                  </span>
                  <div className="flex items-center gap-2">
                    {userCanShop ? (
                      <button
                        type="button"
                        onClick={handleToggleWishlist}
                        aria-label={isWishlisted ? "นำออกจากรายการที่ถูกใจ" : "เพิ่มในรายการที่ถูกใจ"}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/80 text-zinc-600 shadow-xs backdrop-blur-xs transition hover:text-red-600 dark:bg-zinc-800 dark:text-zinc-300"
                      >
                        <Heart
                          size={16}
                          className={isWishlisted ? "fill-red-500 text-red-500" : ""}
                          aria-hidden="true"
                        />
                      </button>
                    ) : null}
                    <div className="rounded-xl bg-white/80 p-2 text-orange-600 shadow-xs backdrop-blur-xs dark:bg-zinc-800 dark:text-orange-400">
                      <PackageCheck size={22} aria-hidden="true" />
                    </div>
                  </div>
                </div>

                <div className="my-auto py-4 text-center">
                  <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 shadow-sm dark:bg-orange-950 dark:text-orange-400">
                    <PackageCheck size={36} strokeWidth={1.5} aria-hidden="true" />
                  </div>
                  <h2 className="text-lg font-black leading-tight text-zinc-950 dark:text-zinc-50 sm:text-xl">
                    {product.name}
                  </h2>
                  <p className="mt-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400 sm:text-sm">
                    ตัวละคร: {product.character} · {product.series}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <span className="rounded-lg bg-zinc-200/80 px-2.5 py-1 text-xs font-bold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                      {product.manufacturer}
                    </span>
                    <span className="rounded-lg bg-zinc-200/80 px-2.5 py-1 text-xs font-bold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                      {product.scale}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-black/5 pt-3 text-xs font-semibold text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    <span>ของแท้ 100% ลิขสิทธิ์ถูกต้อง</span>
                  </div>
                  <span>VAT 7%</span>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="flex flex-col p-5 sm:p-7 lg:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                product.status === "PREORDER_OPEN"
                  ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                  : product.status === "PREORDER_CLOSED"
                    ? "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-400"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/80 dark:bg-emerald-950/60 dark:text-emerald-300"
              }`}
            >
              {product.status === "PREORDER_OPEN"
                ? "เปิดรับสั่งจองล่วงหน้า"
                : product.status === "PREORDER_CLOSED"
                  ? "ปิดรับจองแล้ว"
                  : "สินค้าพร้อมส่ง"}
            </span>
            {product.status === "IN_STOCK" ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 dark:border-orange-800 dark:bg-orange-950/50 dark:text-orange-300">
                <Sparkles size={14} aria-hidden="true" />
                กล่องคมกริบ
              </span>
            ) : null}
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="mt-4 text-sm font-medium text-slate-500">
                {product.series}
              </p>
              <h1 className="mt-1 text-2xl font-bold leading-tight tracking-tight text-slate-950 sm:text-3xl">
                {product.name}
              </h1>
            </div>
            {userCanShop ? (
              <button
                type="button"
                onClick={handleToggleWishlist}
                aria-label={isWishlisted ? "นำออกจากรายการที่ถูกใจ" : "เพิ่มในรายการที่ถูกใจ"}
                className="mt-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-xs transition hover:scale-105 hover:border-red-200 hover:text-red-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              >
                <Heart
                  size={20}
                  className={isWishlisted ? "fill-red-500 text-red-500" : ""}
                  aria-hidden="true"
                />
              </button>
            ) : null}
          </div>
          <p className="mt-2 text-base text-slate-600">
            ตัวละคร: <span className="font-semibold text-slate-800">{product.character}</span>
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
              <p className="text-xs text-slate-500">ค่ายผู้ผลิต</p>
              <p className="mt-1 font-semibold text-slate-900">{product.manufacturer}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
              <p className="text-xs text-slate-500">สเกล / ประเภท</p>
              <p className="mt-1 font-semibold text-slate-900">{product.scale}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
              <p className="text-xs text-slate-500">ความสูง</p>
              <p className="mt-1 font-semibold text-slate-900">
                {product.heightMm > 0
                  ? `${(product.heightMm / 10).toFixed(1)} ซม. (${product.heightMm} มม.)`
                  : "ไม่ระบุ"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
              <p className="text-xs text-slate-500">กำหนดสินค้าออก</p>
              <p className="mt-1 font-semibold text-slate-900">
                {formatReleaseMonth(product.releaseMonthYear)}
              </p>
            </div>
          </div>

          {product.status !== "IN_STOCK" ? (
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <CalendarClock
                  size={20}
                  className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-300"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                    ปิดจอง: {deadlineText}
                  </p>
                  {countdown ? (
                    <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-amber-800 dark:text-amber-300">
                      <Clock3 size={14} aria-hidden="true" />
                      เหลือเวลา {countdown.days} วัน{" "}
                      {formatTwoDigits(countdown.hours)}:
                      {formatTwoDigits(countdown.minutes)}:
                      {formatTwoDigits(countdown.seconds)}
                    </p>
                  ) : hasValidDeadline ? (
                    <p className="mt-1 text-xs font-medium text-slate-600">
                      ถึงกำหนดปิดรับจองแล้ว
                    </p>
                  ) : (
                    <p className="mt-1 text-xs font-medium text-amber-800 dark:text-amber-300">
                      ยังไม่มีข้อมูลเวลานับถอยหลัง
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
                <CalendarDays size={16} aria-hidden="true" />
                สินค้าออก {formatReleaseMonth(product.releaseMonthYear)}
              </div>
            </div>
          ) : null}

          {userCanShop ? (
            <>
              {waitlistFeedback ? (
                <p
                  role={waitlistFeedback.isError ? "alert" : "status"}
                  className={`mt-2 text-center text-sm font-semibold ${
                    waitlistFeedback.isError ? "text-red-700 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"
                  }`}
                >
                  {waitlistFeedback.message}
                </p>
              ) : null}

              <div className="mt-6">
                <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100">เลือกวิธีชำระเงิน</h2>
                <div className="mt-3 grid grid-cols-1 gap-3">
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                      paymentOption === "FULL"
                        ? "border-orange-500 bg-orange-50 ring-2 ring-orange-100 dark:bg-orange-950/20 dark:ring-orange-950"
                        : "border-slate-200 hover:border-slate-300 dark:border-zinc-700 dark:hover:border-zinc-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`figure-payment-${product.id}`}
                      value="FULL"
                      checked={paymentOption === "FULL"}
                      onChange={() => setPaymentOption("FULL")}
                      className="mt-1 h-4 w-4 accent-orange-600"
                    />
                    <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                      <span>
                        <span className="block text-sm font-semibold text-slate-900 dark:text-zinc-100">
                          จ่ายเต็มจำนวน
                        </span>
                        <span className="mt-1 block text-xs text-slate-500 dark:text-zinc-400">
                          ชำระราคาสินค้าเต็มจำนวน
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-bold text-slate-900 dark:text-zinc-100">
                        {currencyFormatter.format(fullPrice)}
                      </span>
                    </span>
                  </label>

                  <label
                    className={`flex items-start gap-3 rounded-2xl border p-4 transition ${
                      depositIsAvailable
                        ? paymentOption === "DEPOSIT"
                          ? "cursor-pointer border-orange-500 bg-orange-50 ring-2 ring-orange-100 dark:bg-orange-950/20 dark:ring-orange-950"
                          : "cursor-pointer border-slate-200 hover:border-slate-300 dark:border-zinc-700 dark:hover:border-zinc-600"
                        : "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60 dark:border-zinc-700 dark:bg-zinc-800"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`figure-payment-${product.id}`}
                      value="DEPOSIT"
                      checked={paymentOption === "DEPOSIT"}
                      onChange={() => setPaymentOption("DEPOSIT")}
                      disabled={!depositIsAvailable}
                      className="mt-1 h-4 w-4 accent-orange-600"
                    />
                    <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                      <span>
                        <span className="block text-sm font-semibold text-slate-900 dark:text-zinc-100">
                          วางมัดจำ
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-zinc-400">
                          (ยอดคงเหลือ{" "}
                          {currencyFormatter.format(remainingPerUnit)} ชำระเมื่อสินค้าเข้าไทย)
                        </span>
                        {!depositIsAvailable ? (
                          <span className="mt-1 block text-xs text-slate-500 dark:text-zinc-400">
                            สินค้านี้ไม่รองรับการวางมัดจำ
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 text-sm font-bold text-orange-700 dark:text-orange-400">
                        {currencyFormatter.format(depositAmount)}
                      </span>
                    </span>
                  </label>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">จำนวน</p>
                  <div className="mt-1 inline-flex items-center rounded-xl border border-slate-200 dark:border-zinc-700">
                    <button
                      type="button"
                      onClick={decreaseQuantity}
                      disabled={quantity <= 1}
                      aria-label="ลดจำนวน"
                      className="inline-flex h-10 w-10 items-center justify-center text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      <Minus size={16} aria-hidden="true" />
                    </button>
                    <span
                      className="min-w-9 text-center text-sm font-semibold text-slate-900 dark:text-zinc-100"
                      aria-live="polite"
                    >
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={increaseQuantity}
                      disabled={quantity >= maxQuantity || !itemCountIsLimited}
                      aria-label="เพิ่มจำนวน"
                      className="inline-flex h-10 w-10 items-center justify-center text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      <Plus size={16} aria-hidden="true" />
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                    {product.status === "IN_STOCK" ? "พร้อมส่ง" : "โควตาคงเหลือ"}{" "}
                    {Math.max(0, product.stockOrQuotaRemaining)} ชิ้น
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 dark:text-zinc-400">ยอดชำระค่าสินค้ารอบนี้</p>
                  <p className="mt-1 text-xl font-extrabold text-slate-950 dark:text-zinc-100">
                    {currencyFormatter.format(selectedTotalPerUnit * quantity)}
                  </p>
                  {paymentOption === "DEPOSIT" && depositIsAvailable ? (
                    <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                      ยอดคงเหลือสินค้า{" "}
                      {currencyFormatter.format(remainingPerUnit * quantity)}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3">
                {waitlistRequired ? (
                  <button
                    type="button"
                    onClick={joinWaitlist}
                    className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                  >
                    <Bell size={18} aria-hidden="true" />
                    ลงชื่อเข้าคิวรับสิทธิ์ (Waitlist)
                  </button>
                ) : product.status === "PREORDER_OPEN" ? (
                  <button
                    type="button"
                    onClick={() => submitPurchase("PREORDER")}
                    disabled={!canPurchase}
                    className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-zinc-800"
                  >
                    <Check size={18} aria-hidden="true" />
                    {preorderIsOrderable
                      ? "สั่งจองล่วงหน้า (Pre-order)"
                      : product.stockOrQuotaRemaining <= 0
                        ? "โควตาสั่งจองเต็มแล้ว"
                        : "ปิดรับจองแล้ว"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => submitPurchase("CART")}
                    disabled={!canPurchase}
                    className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-orange-600 dark:hover:text-white dark:disabled:bg-zinc-800"
                  >
                    <ShoppingBag size={18} aria-hidden="true" />
                    {canPurchase ? "หยิบใส่ตะกร้า" : "สินค้าหมด"}
                  </button>
                )}

                {userCanShop ? (
                  <button
                    type="button"
                    onClick={handleToggleWishlist}
                    aria-label={isWishlisted ? "นำออกจากรายการที่ถูกใจ" : "เพิ่มในรายการที่ถูกใจ"}
                    className={`inline-flex min-h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition hover:scale-105 ${
                      isWishlisted
                        ? "border-red-200 bg-red-50 text-red-600 dark:border-red-900/60 dark:bg-red-950/40"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-red-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    }`}
                  >
                    <Heart
                      size={20}
                      className={isWishlisted ? "fill-red-500 text-red-500" : ""}
                      aria-hidden="true"
                    />
                  </button>
                ) : null}
              </div>
            </>
          ) : (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-zinc-400">ราคาสินค้า</span>
                <span className="text-xl font-bold text-slate-900 dark:text-zinc-100">
                  {currencyFormatter.format(fullPrice)}
                </span>
              </div>
              {depositIsAvailable ? (
                <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 pt-3 text-xs text-slate-500 dark:border-zinc-800 dark:text-zinc-400">
                  <span>ยอดมัดจำ (Pre-order)</span>
                  <span className="font-semibold text-orange-600 dark:text-orange-400">
                    {currencyFormatter.format(depositAmount)}
                  </span>
                </div>
              ) : null}
              <div className="mt-2 flex items-center justify-between border-t border-slate-200/60 pt-2 text-xs text-slate-500 dark:border-zinc-800 dark:text-zinc-400">
                <span>{product.status === "IN_STOCK" ? "สต็อกพร้อมส่ง" : "โควตาคงเหลือ"}</span>
                <span className="font-semibold text-slate-700 dark:text-zinc-300">
                  {Math.max(0, product.stockOrQuotaRemaining)} ชิ้น
                </span>
              </div>
            </div>
          )}

          <p className="mt-3 text-center text-xs text-slate-500">
            รหัสสินค้า JAN: {product.janCode || "ไม่ระบุ"}
          </p>
        </section>
      </div>
    </article>
  );
}

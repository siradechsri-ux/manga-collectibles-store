"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Flame,
  Heart,
  ShoppingBag,
  Sparkles,
  Tag,
  Timer,
} from "lucide-react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../contexts/AuthContext";
import { useWishlist } from "../contexts/WishlistContext";
import { canShop } from "../utils/permissions";
import {
  DEFAULT_FLASH_DEALS,
  getFlashSaleDeals,
  subscribeFlashSaleDeals,
  type FlashSaleItem,
  type FlashSaleSchedule,
} from "../services/flash-sale.service";
import {
  getPromotionSettings,
  subscribePromotionSettings,
} from "../services/promotion-settings.service";

export type { FlashSaleItem };

function getTimeRemaining() {
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const diff = Math.max(0, endOfDay.getTime() - now.getTime());
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { hours, minutes, seconds };
}

export default function FlashSaleBanner() {
  const { addItem } = useCart();
  const { user } = useAuth();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const userCanShop = canShop(user?.role);

  const [deals, setDeals] = useState<FlashSaleItem[]>(DEFAULT_FLASH_DEALS);
  const [selectedSchedule, setSelectedSchedule] = useState<FlashSaleSchedule>("TODAY");
  const [isActive, setIsActive] = useState<boolean>(
    () => getPromotionSettings().isFlashSaleActive,
  );
  const [timeLeft, setTimeLeft] = useState(getTimeRemaining);
  const [addedNotice, setAddedNotice] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeRemaining());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setDeals(getFlashSaleDeals());
    setIsActive(getPromotionSettings().isFlashSaleActive);

    const unsubDeals = subscribeFlashSaleDeals((newDeals) => {
      setDeals(newDeals);
    });

    const unsubSettings = subscribePromotionSettings((settings) => {
      setIsActive(settings.isFlashSaleActive);
    });

    return () => {
      unsubDeals();
      unsubSettings();
    };
  }, []);

  const todayDeals = useMemo(
    () => deals.filter((d) => d.isActive && (d.schedule === "TODAY" || !d.schedule)),
    [deals],
  );
  const tomorrowDeals = useMemo(
    () => deals.filter((d) => d.isActive && d.schedule === "TOMORROW"),
    [deals],
  );
  const displayDeals = selectedSchedule === "TODAY" ? todayDeals : tomorrowDeals;

  if (!isActive || (todayDeals.length === 0 && tomorrowDeals.length === 0)) {
    return null;
  }

  const handleAddToCart = (item: FlashSaleItem, e?: React.MouseEvent) => {
    if (!userCanShop) return;

    if (item.kind === "MANGA") {
      addItem(
        {
          kind: "MANGA",
          id: item.id,
          title: item.title,
          volume: item.volume ?? 1,
          price: item.salePrice,
          image: item.imageUrl,
          coverImage: item.imageUrl,
          imageUrl: item.imageUrl,
          isPreorder: false,
          quantity: 1,
        },
        e,
      );
    } else if (item.kind === "FIGURE") {
      addItem(
        {
          kind: "FIGURE",
          id: item.id,
          name: item.title,
          fullPrice: item.salePrice,
          depositAmount: 0,
          selectedPaymentType: "FULL",
          quantity: 1,
          image: item.imageUrl,
          coverImage: item.imageUrl,
          imageUrl: item.imageUrl,
          boxDimensions: { widthCm: 20, lengthCm: 14, heightCm: 12 },
        },
        e,
      );
    } else {
      addItem(
        {
          kind: "ACCESSORY",
          id: item.id,
          name: item.title,
          fullPrice: item.salePrice,
          quantity: 1,
          image: item.imageUrl,
          coverImage: item.imageUrl,
          imageUrl: item.imageUrl,
        },
        e,
      );
    }

    setAddedNotice(`เพิ่ม ${item.title} ในราคา Flash Sale ลงตะกร้าแล้ว`);
    setTimeout(() => {
      setAddedNotice(null);
    }, 3500);
  };

  return (
    <section
      aria-labelledby="flash-sale-heading"
      className="overflow-hidden rounded-3xl border border-rose-200/80 bg-gradient-to-br from-rose-50 via-orange-50/60 to-white p-6 shadow-md dark:border-rose-950/60 dark:from-rose-950/30 dark:via-zinc-900 dark:to-zinc-950 sm:p-8"
    >
      {/* Header and Countdown */}
      <div className="flex flex-col gap-4 border-b border-rose-100 pb-5 dark:border-zinc-800 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-300/80 bg-rose-100/80 px-3 py-1 text-xs font-black uppercase tracking-wider text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/80 dark:text-rose-300">
            <Flame size={14} className="text-rose-600 dark:text-rose-400" aria-hidden="true" />
            <span>FLASH SALE · ลดพิเศษจำกัดเวลา</span>
          </div>
          <h2
            id="flash-sale-heading"
            className="mt-2 text-2xl font-black tracking-tight text-zinc-950 dark:text-zinc-100 sm:text-3xl"
          >
            ดีลเด็ดลดราคาสูงสุด 20%
          </h2>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 sm:text-sm">
            {selectedSchedule === "TODAY"
              ? "สินค้าแท้ตรงรุ่น จำนวนจำกัดต่อรอบ รีบช้อปก่อนหมดเวลาเที่ยงคืน"
              : "พรีวิวดีลพิเศษรอบวันพรุ่งนี้ ล็อกเป้าหมายและบันทึกใส่ Wishlist ไว้ได้เลย"}
          </p>
        </div>

        {/* Live Digital Countdown Clock (Today) or Tomorrow Schedule Badge */}
        {selectedSchedule === "TODAY" ? (
          <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-3 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
            <Timer size={20} className="shrink-0 text-rose-600 dark:text-rose-400" aria-hidden="true" />
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              <span className="hidden sm:inline">สิ้นสุดใน:</span>
              <div suppressHydrationWarning className="flex items-center gap-1">
                <span suppressHydrationWarning className="flex min-w-8 items-center justify-center rounded-lg bg-zinc-950 px-2 py-1 text-sm font-black tabular-nums text-white dark:bg-zinc-100 dark:text-zinc-950">
                  {String(timeLeft.hours).padStart(2, "0")}
                </span>
                <span className="font-bold text-zinc-950 dark:text-zinc-100">:</span>
                <span suppressHydrationWarning className="flex min-w-8 items-center justify-center rounded-lg bg-zinc-950 px-2 py-1 text-sm font-black tabular-nums text-white dark:bg-zinc-100 dark:text-zinc-950">
                  {String(timeLeft.minutes).padStart(2, "0")}
                </span>
                <span className="font-bold text-zinc-950 dark:text-zinc-100">:</span>
                <span suppressHydrationWarning className="flex min-w-8 items-center justify-center rounded-lg bg-rose-600 px-2 py-1 text-sm font-black tabular-nums text-white shadow-xs">
                  {String(timeLeft.seconds).padStart(2, "0")}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-xs font-bold text-amber-900 shadow-xs dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
            <Calendar size={18} className="text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-black">เปิดจำหน่ายพรุ่งนี้ 00:00 น.</p>
              <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">เตรียมตัวให้พร้อม จำกัดจำนวนโควตาต่อท่าน</p>
            </div>
          </div>
        )}
      </div>

      {/* Schedule Tabs Switcher */}
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setSelectedSchedule("TODAY")}
          className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition shadow-xs ${
            selectedSchedule === "TODAY"
              ? "bg-rose-600 text-white shadow-rose-600/20"
              : "bg-white text-zinc-700 hover:bg-zinc-50 border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300"
          }`}
        >
          <Flame size={14} className={selectedSchedule === "TODAY" ? "text-white" : "text-rose-600"} />
          <span>ดีลวันนี้ (กำลังลดราคา)</span>
          <span
            suppressHydrationWarning
            className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
              selectedSchedule === "TODAY"
                ? "bg-white/25 text-white"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            {todayDeals.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedSchedule("TOMORROW")}
          className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition shadow-xs ${
            selectedSchedule === "TOMORROW"
              ? "bg-amber-600 text-white shadow-amber-600/20"
              : "bg-white text-zinc-700 hover:bg-zinc-50 border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300"
          }`}
        >
          <Calendar size={14} className={selectedSchedule === "TOMORROW" ? "text-white" : "text-amber-500"} />
          <span>ดีลวันพรุ่งนี้ (Upcoming)</span>
          <span
            suppressHydrationWarning
            className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
              selectedSchedule === "TOMORROW"
                ? "bg-white/25 text-white"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            {tomorrowDeals.length}
          </span>
        </button>
      </div>

      {/* Added Toast Notification */}
      {addedNotice ? (
        <div
          role="status"
          className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-900 shadow-xs dark:border-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <span>{addedNotice}</span>
          </div>
          <Link
            href="/checkout"
            className="shrink-0 underline decoration-emerald-500 underline-offset-4 hover:text-emerald-700"
          >
            ไปที่ตะกร้า
          </Link>
        </div>
      ) : null}

      {/* Flash Sale Grid */}
      {displayDeals.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white/50 p-8 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
          <Calendar size={32} className="text-zinc-400" />
          <p className="mt-2 text-sm font-bold text-zinc-700 dark:text-zinc-300">
            ยังไม่มีรายการดีลในรอบนี้
          </p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            โปรดติดตามอัปเดตแคมเปญ Flash Sale รอบถัดไปได้เร็วๆ นี้
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {displayDeals.map((deal) => {
            const inWishlist = isInWishlist(deal.id);
            return (
              <article
                key={deal.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-3.5 shadow-xs transition hover:border-rose-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-rose-900/60"
              >
                {/* Image Container with Badges */}
                <Link
                  href={deal.href}
                  className="relative aspect-square w-full overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800 block cursor-pointer"
                  aria-label={deal.title}
                >
                  <img
                    src={deal.imageUrl}
                    alt={deal.title}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-2 py-0.5 text-[11px] font-black text-white shadow-xs">
                      <Tag size={11} aria-hidden="true" />
                      -{deal.discountPercent}%
                    </span>
                    {selectedSchedule === "TOMORROW" ? (
                      <span className="rounded-md bg-amber-500 px-1.5 py-0.5 text-[10px] font-black text-white shadow-xs">
                        พรุ่งนี้
                      </span>
                    ) : null}
                  </div>
                  <span className="absolute bottom-2.5 left-2.5 rounded-md bg-zinc-950/80 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
                    {deal.categoryLabel}
                  </span>
                </Link>

                {/* Info */}
                <div className="mt-3 flex flex-1 flex-col justify-between">
                  <div>
                    <h3 className="line-clamp-2 text-sm font-bold text-zinc-900 transition group-hover:text-rose-600 dark:text-zinc-100 dark:group-hover:text-rose-400">
                      <Link href={deal.href}>{deal.title}</Link>
                    </h3>

                    {/* Price Display */}
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-lg font-black text-rose-600 dark:text-rose-400">
                        ฿{deal.salePrice.toLocaleString("th-TH")}
                      </span>
                      <span className="text-xs font-semibold text-zinc-400 line-through">
                        ฿{deal.originalPrice.toLocaleString("th-TH")}
                      </span>
                    </div>

                    {/* Stock Progress Bar / Quota Note */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
                        <span>{deal.stockNote}</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div
                          className={`h-full rounded-full ${
                            selectedSchedule === "TODAY"
                              ? "bg-gradient-to-r from-orange-500 to-rose-600"
                              : "bg-gradient-to-r from-amber-400 to-amber-600"
                          }`}
                          style={{ width: `${Math.max(selectedSchedule === "TOMORROW" ? 15 : 0, deal.soldPercent)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action Button: Today = AddToCart, Tomorrow = Wishlist Toggle */}
                  {selectedSchedule === "TODAY" ? (
                    userCanShop ? (
                      <button
                        type="button"
                        onClick={(e) => handleAddToCart(deal, e)}
                        className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 px-3 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-rose-600 dark:hover:text-white"
                      >
                        <ShoppingBag size={14} aria-hidden="true" />
                        <span>ใส่ตะกร้าทันที</span>
                      </button>
                    ) : (
                      <div className="mt-4 flex min-h-10 w-full items-center justify-center rounded-xl bg-zinc-100 px-3 py-2 text-center text-[11px] font-bold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                        <span>เฉพาะบัญชีลูกค้าสำหรับสั่งซื้อ</span>
                      </div>
                    )
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        toggleWishlist({
                          id: deal.id,
                          itemType: deal.kind === "MANGA" ? "MANGA" : deal.kind === "FIGURE" ? "FIGURE" : "ACCESSORY",
                          title: deal.title,
                          price: deal.salePrice,
                          imageUrl: deal.imageUrl,
                          category: deal.categoryLabel,
                          url: deal.href,
                          stock: Math.max(0, (deal.quota ?? 20) - (deal.soldCount ?? 0)),
                        });
                      }}
                      className={`mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition shadow-xs ${
                        inWishlist
                          ? "bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300"
                          : "bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
                      }`}
                    >
                      <Heart size={14} className={inWishlist ? "fill-rose-600 text-rose-600 dark:fill-rose-400 dark:text-rose-400" : ""} />
                      <span>{inWishlist ? "บันทึกใน Wishlist แล้ว" : "บันทึกใส่ Wishlist รอช้อป"}</span>
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

"use client";

import {
  ArrowRight,
  Award,
  Flame,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { CatalogData } from "../lib/catalog-client";
import { BestSellerProductItem } from "../lib/manga-genres";
import {
  getEffectiveBestSellers,
  getBestSellerSettings,
  subscribeBestSellerSettings,
  getEffectiveAllTimeBestSellers,
  getEffectiveNewArrivalsList,
} from "../services/best-seller-settings.service";
import {
  getWeeklyNewArrivals,
  type NewArrivalProductItem,
} from "../services/new-arrivals.service";
import { getMockCatalog } from "../mocks/products.mock";
import { ProductService } from "../services/product.service";

export type ShowcaseTab = "all-time" | "weekly" | "new-arrivals";

export interface AllTimeBestSellerItem {
  id: string;
  rank: number;
  title: string;
  subtitle: string;
  priceFormatted: string;
  numericPrice: number;
  imageUrl: string;
  salesMilestone: string;
  salesRecord: string;
  rating: number;
  reviewCount: number;
  href: string;
  categoryTab: "manga" | "figure";
}

export const ALL_TIME_BEST_SELLERS: AllTimeBestSellerItem[] = [
  {
    id: "alltime-op",
    rank: 1,
    title: "วันพีซ (One Piece: Egghead Arc)",
    subtitle: "Siam Inter Comics · Eiichiro Oda",
    priceFormatted: "เริ่มต้น ฿95",
    numericPrice: 95,
    imageUrl: "/images/products/onepiece-vol-105.jpg",
    salesMilestone: "516,000,000+ เล่ม",
    salesRecord: "ยอดขายทะลุ 516 ล้านเล่มทั่วโลก",
    rating: 5.0,
    reviewCount: 980,
    href: "/manga/one-piece",
    categoryTab: "manga",
  },
  {
    id: "alltime-jjk",
    rank: 2,
    title: "มหาเวทย์ผนึกมาร (Jujutsu Kaisen)",
    subtitle: "Siam Inter Comics · Gege Akutami",
    priceFormatted: "เริ่มต้น ฿95",
    numericPrice: 95,
    imageUrl: "/images/products/jjk-vol-01.jpg",
    salesMilestone: "100,000,000+ เล่ม",
    salesRecord: "ยอดพิมพ์สะสมทะลุ 100 ล้านเล่ม",
    rating: 4.9,
    reviewCount: 750,
    href: "/manga/jujutsu-kaisen",
    categoryTab: "manga",
  },
  {
    id: "alltime-aot",
    rank: 3,
    title: "ผ่าพิภพไททัน (Attack on Titan)",
    subtitle: "Vibulkij · Hajime Isayama",
    priceFormatted: "เริ่มต้น ฿95",
    numericPrice: 95,
    imageUrl: "/images/products/aot-vol-01.jpg",
    salesMilestone: "140,000,000+ เล่ม",
    salesRecord: "ปรากฏการณ์มังงะระดับโลก 34 เล่มจบ",
    rating: 4.9,
    reviewCount: 620,
    href: "/manga/attack-on-titan",
    categoryTab: "manga",
  },
  {
    id: "alltime-frieren",
    rank: 4,
    title: "คำอธิษฐานในวันที่จากลา (Frieren)",
    subtitle: "Siam Inter Comics · Kanehito Yamada",
    priceFormatted: "เริ่มต้น ฿95",
    numericPrice: 95,
    imageUrl: "/images/products/frieren-vol-01.jpg",
    salesMilestone: "22,000,000+ เล่ม",
    salesRecord: "การันตีรางวัล Manga Taisho อันดับ 1",
    rating: 5.0,
    reviewCount: 540,
    href: "/manga/frieren",
    categoryTab: "manga",
  },
  {
    id: "alltime-gojo",
    rank: 5,
    title: "Nendoroid Satoru Gojo: JJK 0 Ver.",
    subtitle: "Good Smile Company · ของแท้ล็อต JP",
    priceFormatted: "฿1,850",
    numericPrice: 1850,
    imageUrl: "/images/products/figure-2001.jpg",
    salesMilestone: "อันดับ #1 ยอดจองฟิกเกอร์",
    salesRecord: "เนนโดรอยด์ยอดสั่งจองสูงสุดตลอดกาล",
    rating: 5.0,
    reviewCount: 410,
    href: "/figures/2001",
    categoryTab: "figure",
  },
];

function WeeklyRankMedalBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-400 px-2.5 py-1 text-[11px] font-black text-amber-950 shadow-xs">
        <Trophy size={12} aria-hidden="true" />
        <span>อันดับ #1</span>
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 bg-zinc-200 px-2.5 py-1 text-[11px] font-black text-zinc-800 shadow-xs dark:bg-zinc-300">
        <Award size={12} aria-hidden="true" />
        <span>อันดับ #2</span>
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg border border-amber-400/60 bg-amber-600 px-2.5 py-1 text-[11px] font-black text-white shadow-xs">
        <Sparkles size={12} aria-hidden="true" />
        <span>อันดับ #3</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white/95 px-2 py-0.5 text-[10px] font-bold text-zinc-700 shadow-2xs backdrop-blur-xs dark:border-zinc-700 dark:bg-zinc-800/95 dark:text-zinc-300">
      <TrendingUp size={11} aria-hidden="true" />
      <span>อันดับ #{rank}</span>
    </span>
  );
}

function AllTimeMedalBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-400 px-2.5 py-1 text-[11px] font-black text-amber-950 shadow-xs">
        <Trophy size={12} aria-hidden="true" />
        <span>ตลอดกาล #1</span>
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 bg-zinc-200 px-2.5 py-1 text-[11px] font-black text-zinc-800 shadow-xs dark:bg-zinc-300">
        <Award size={12} aria-hidden="true" />
        <span>ตลอดกาล #2</span>
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg border border-amber-400/60 bg-amber-600 px-2.5 py-1 text-[11px] font-black text-white shadow-xs">
        <Sparkles size={12} aria-hidden="true" />
        <span>ตลอดกาล #3</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-white/95 px-2 py-0.5 text-[10px] font-bold text-amber-900 shadow-2xs backdrop-blur-xs dark:border-amber-900/60 dark:bg-zinc-800/95 dark:text-amber-300">
      <Trophy size={10} aria-hidden="true" />
      <span>ตลอดกาล #{rank}</span>
    </span>
  );
}

export default function FeaturedShowcaseSection() {
  const [activeTab, setActiveTab] = useState<ShowcaseTab>("weekly");
  const [allTimeBestSellers, setAllTimeBestSellers] = useState<AllTimeBestSellerItem[]>(ALL_TIME_BEST_SELLERS);
  const [newArrivals, setNewArrivals] = useState<NewArrivalProductItem[]>([]);
  const [bestSellers, setBestSellers] = useState<BestSellerProductItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let cachedCatalog: CatalogData | null = null;

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      const hash = window.location.hash;
      if (tabParam === "new-arrivals" || hash === "#new-arrivals" || hash === "#new") {
        setActiveTab("new-arrivals");
      } else if (tabParam === "all-time" || hash === "#all-time" || hash === "#halloffame") {
        setActiveTab("all-time");
      } else if (tabParam === "weekly" || hash === "#weekly" || hash === "#best-sellers") {
        setActiveTab("weekly");
      }
    }

    const refreshData = (catalog: CatalogData) => {
      const currentSettings = getBestSellerSettings();
      setAllTimeBestSellers(getEffectiveAllTimeBestSellers(catalog, currentSettings).slice(0, 5));
      setBestSellers(getEffectiveBestSellers(catalog, currentSettings).slice(0, 5));
      setNewArrivals(getEffectiveNewArrivalsList(catalog, currentSettings).slice(0, 5));
      setLoading(false);
    };

    // Immediate initial load to prevent blank or delayed content
    try {
      const initCatalog = getMockCatalog();
      cachedCatalog = initCatalog;
      refreshData(initCatalog);
    } catch {
      setNewArrivals(getWeeklyNewArrivals());
    }

    ProductService.getProducts()
      .then((catalog: CatalogData) => {
        if (mounted) {
          cachedCatalog = catalog;
          refreshData(catalog);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    const unsubscribe = subscribeBestSellerSettings(() => {
      if (cachedCatalog) {
        refreshData(cachedCatalog);
      } else {
        try {
          const cat = getMockCatalog();
          cachedCatalog = cat;
          refreshData(cat);
        } catch {}
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return (
    <section
      id="featured-showcase"
      aria-labelledby="featured-showcase-heading"
      className="mt-14 scroll-mt-24"
    >
      <div className="rounded-3xl border border-zinc-200/90 bg-white p-5 sm:p-7 shadow-xs dark:border-zinc-850 dark:bg-zinc-900/90">
        {/* Header and Segmented Tab Switcher */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-zinc-100 pb-5 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold border transition ${
                  activeTab === "all-time"
                    ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800/80 dark:bg-amber-950/60 dark:text-amber-300"
                    : activeTab === "weekly"
                      ? "border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-800/80 dark:bg-orange-950/60 dark:text-orange-300"
                      : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/80 dark:bg-emerald-950/60 dark:text-emerald-300"
                }`}
              >
                {activeTab === "all-time" ? (
                  <Trophy size={12} className="text-amber-600 dark:text-amber-400" />
                ) : activeTab === "weekly" ? (
                  <Flame size={12} className="text-orange-600 dark:text-orange-400" />
                ) : (
                  <Sparkles size={12} className="text-emerald-600 dark:text-emerald-400" />
                )}
                <span>
                  {activeTab === "all-time"
                    ? "ALL-TIME LEGENDS · ยอดนิยมตลอดกาล"
                    : activeTab === "weekly"
                      ? "WEEKLY TOP CHARTS · ยอดนิยมประจำสัปดาห์"
                      : "NEW ARRIVALS · ประจำสัปดาห์นี้"}
                </span>
              </span>
            </div>

            <h2
              id="featured-showcase-heading"
              className="mt-2 text-2xl font-black text-zinc-950 dark:text-zinc-100 sm:text-3xl"
            >
              {activeTab === "all-time"
                ? "สินค้าขายดีตลอดกาล"
                : activeTab === "weekly"
                  ? "ขายดีประจำสัปดาห์"
                  : "สินค้าใหม่"}
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-xl">
              {activeTab === "all-time"
                ? "ผลงานและของสะสมระดับปรากฏการณ์ที่มียอดจำหน่ายสูงสุดตลอดกาล มาสเตอร์พีซที่แฟนพันธุ์แท้ต้องมี"
                : activeTab === "weekly"
                  ? "มังงะและของสะสมที่มียอดสั่งซื้อสูงสุดในรอบสัปดาห์ การันตีความนิยมจากนักอ่านทั่วประเทศ"
                  : "มังงะ ไลท์โนเวล ฟิกเกอร์ และกันพลาที่เพิ่งวางแผงและเติมสต็อกล่าสุดในสัปดาห์นี้"}
            </p>
          </div>

          {/* Interactive Tab Switcher Segmented Control */}
          <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-zinc-200 bg-zinc-100/90 p-1 shadow-2xs dark:border-zinc-800 dark:bg-zinc-800/80 self-start sm:self-auto">
            {/* 1. สินค้าขายดีตลอดกาล */}
            <button
              type="button"
              onClick={() => setActiveTab("all-time")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition ${
                activeTab === "all-time"
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-xs scale-102"
                  : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              <Trophy
                size={14}
                className={activeTab === "all-time" ? "text-white" : "text-amber-600 dark:text-amber-400"}
              />
              <span>สินค้าขายดีตลอดกาล</span>
            </button>

            {/* 2. ขายดีประจำสัปดาห์ */}
            <button
              type="button"
              onClick={() => setActiveTab("weekly")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition ${
                activeTab === "weekly"
                  ? "bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-xs scale-102"
                  : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              <Flame
                size={14}
                className={activeTab === "weekly" ? "text-white" : "text-orange-600 dark:text-orange-400"}
              />
              <span>ขายดีประจำสัปดาห์</span>
            </button>

            {/* 3. สินค้าใหม่ */}
            <button
              type="button"
              onClick={() => setActiveTab("new-arrivals")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition ${
                activeTab === "new-arrivals"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs scale-102"
                  : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              <Zap
                size={14}
                className={activeTab === "new-arrivals" ? "text-white" : "text-emerald-600 dark:text-emerald-400"}
              />
              <span>สินค้าใหม่</span>
            </button>
          </div>
        </div>

        {/* Product Grid Showcase */}
        {loading ? (
          <div className="mt-6 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5 sm:gap-4">
            {[0, 1, 2, 3, 4].map((idx) => (
              <div
                key={idx}
                className="h-72 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800"
              />
            ))}
          </div>
        ) : activeTab === "all-time" ? (
          /* ================= Tab 1: สินค้าขายดีตลอดกาล (All-Time Best Sellers) ================= */
          <div className="mt-6 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5 sm:gap-4">
            {allTimeBestSellers.slice(0, 5).map((item, idx) => (
              <Link
                key={item.id}
                href={item.href}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-amber-200/90 bg-white p-3 shadow-xs transition duration-300 hover:-translate-y-1.5 hover:border-amber-400 hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-850 dark:hover:border-amber-500"
              >
                <div>
                  <div className="relative mb-2.5 aspect-[3/4] w-full overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute left-2 top-2 z-10">
                      <AllTimeMedalBadge rank={idx + 1} />
                    </div>
                  </div>

                  <p className="line-clamp-1 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
                    {item.subtitle}
                  </p>

                  <h3 className="mt-1 line-clamp-2 min-h-[2.5rem] sm:min-h-[2.75rem] text-xs sm:text-sm font-black text-zinc-900 group-hover:text-amber-600 dark:text-zinc-100 dark:group-hover:text-amber-400 leading-snug">
                    {item.title}
                  </h3>

                  <p className="mt-1 line-clamp-1 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                    {item.salesRecord}
                  </p>
                </div>

                <div className="mt-3 border-t border-zinc-100 pt-2 dark:border-zinc-800">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-black text-zinc-900 dark:text-zinc-100">
                      {item.priceFormatted}
                    </p>
                    <div className="flex items-center gap-0.5 text-[10px] font-bold text-amber-500">
                      <Star size={10} className="fill-amber-400 text-amber-400" />
                      <span>{item.rating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : activeTab === "weekly" ? (
          /* ================= Tab 2: ขายดีประจำสัปดาห์ (Weekly Best Sellers) ================= */
          <div className="mt-6 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5 sm:gap-4">
            {bestSellers.slice(0, 5).map((item, idx) => (
              <Link
                key={item.id}
                href={item.href}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-3 shadow-xs transition duration-300 hover:-translate-y-1.5 hover:border-orange-400 hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-850 dark:hover:border-orange-500"
              >
                <div>
                  <div className="relative mb-2.5 aspect-[3/4] w-full overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute left-2 top-2 z-10">
                      <WeeklyRankMedalBadge rank={idx + 1} />
                    </div>
                  </div>

                  <p className="line-clamp-1 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
                    {item.subtitle}
                  </p>

                  <h3 className="mt-1 line-clamp-2 min-h-[2.5rem] sm:min-h-[2.75rem] text-xs sm:text-sm font-black text-zinc-900 group-hover:text-orange-600 dark:text-zinc-100 dark:group-hover:text-orange-400 leading-snug">
                    {item.title}
                  </h3>

                  <p className="mt-1 line-clamp-1 text-[10px] font-bold text-orange-700 dark:text-orange-400">
                    {item.salesText}
                  </p>
                </div>

                <div className="mt-3 border-t border-zinc-100 pt-2 dark:border-zinc-800">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-black text-zinc-900 dark:text-zinc-100">
                      {item.priceFormatted}
                    </p>
                    <div className="flex items-center gap-0.5 text-[10px] font-bold text-amber-500">
                      <Star size={10} className="fill-amber-400 text-amber-400" />
                      <span>{typeof item.rating === "number" ? item.rating.toFixed(1) : item.rating}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          /* ================= Tab 3: สินค้าใหม่ (New Arrivals) ================= */
          <div className="mt-6 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5 sm:gap-4">
            {newArrivals.slice(0, 5).map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-3 shadow-xs transition duration-300 hover:-translate-y-1.5 hover:border-emerald-400 hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-850 dark:hover:border-emerald-500"
              >
                <div>
                  <div className="relative mb-2.5 aspect-[3/4] w-full overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute left-2 top-2 z-10">
                      <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white shadow-2xs">
                        <Sparkles size={10} aria-hidden="true" />
                        <span>{item.badgeText}</span>
                      </span>
                    </div>
                  </div>

                  <p className="line-clamp-1 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
                    {item.subtitle}
                  </p>

                  <h3 className="mt-1 line-clamp-2 min-h-[2.5rem] sm:min-h-[2.75rem] text-xs sm:text-sm font-black text-zinc-900 group-hover:text-emerald-600 dark:text-zinc-100 dark:group-hover:text-emerald-400 leading-snug">
                    {item.title}
                  </h3>

                  <p className="mt-1 line-clamp-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                    {item.releaseDateText}
                  </p>
                </div>

                <div className="mt-3 border-t border-zinc-100 pt-2 dark:border-zinc-800">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-black text-zinc-900 dark:text-zinc-100">
                      {item.priceFormatted}
                    </p>
                    <div className="flex items-center gap-0.5 text-[10px] font-bold text-amber-500">
                      <Star size={10} className="fill-amber-400 text-amber-400" />
                      <span>{typeof item.rating === "number" ? item.rating.toFixed(1) : item.rating}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Bottom Action Footer */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {activeTab === "all-time"
              ? "ต้องการค้นหาซีรีส์ระดับตำนานและผลงานยอดนิยมตลอดกาลทั้งหมด?"
              : activeTab === "weekly"
                ? "ต้องการค้นหาหรือกรองตามอันดับยอดขายประจำสัปดาห์เพิ่มเติม?"
                : "ต้องการดูตารางกำหนดการวางจำหน่ายมังงะและของสะสมตลอดทั้งเดือน?"}
          </p>

          <Link
            href={
              activeTab === "all-time"
                ? "/collections/manga"
                : activeTab === "weekly"
                  ? "/collections/manga?filter=best-seller"
                  : "/calendar"
            }
            className={`inline-flex items-center gap-1.5 text-xs font-bold transition hover:underline ${
              activeTab === "all-time"
                ? "text-amber-600 hover:text-amber-700 dark:text-amber-400"
                : activeTab === "weekly"
                  ? "text-orange-600 hover:text-orange-700 dark:text-orange-400"
                  : "text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
            }`}
          >
            <span>
              {activeTab === "all-time"
                ? "เลือกดูซีรีส์ยอดฮิตทั้งหมดในร้าน"
                : activeTab === "weekly"
                  ? "ดูสินค้าขายดีประจำสัปดาห์ทั้งหมด (เปิดตัวกรอง)"
                  : "ดูตารางออกใหม่และสินค้าเข้าใหม่ทั้งหมด"}
            </span>
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

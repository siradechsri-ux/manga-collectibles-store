"use client";

import type { CatalogData } from "../lib/catalog-client";
import {
  getAllBestSellers,
  getRecommendedProducts,
  BestSellerProductItem,
  RecommendedProductItem,
  MANGA_SERIES_GENRE_MAP,
  COLLECTIBLE_BEST_SELLER_MAP,
} from "../lib/manga-genres";
import {
  getWeeklyNewArrivals,
  type NewArrivalProductItem,
} from "./new-arrivals.service";

export type BestSellerCalculationMode = "HYBRID" | "AUTO" | "MANUAL";

export interface PinnedBestSeller {
  id: string; // product id (e.g. "jjk", "frieren", "2001")
  type: "MANGA" | "COLLECTIBLE";
  rank: number;
  salesTextOverride?: string;
  badgeOverride?: string;
}

export interface PinnedRecommended {
  id: string;
  type: "MANGA" | "COLLECTIBLE";
  highlightText: string;
  badgeText: string;
}

export interface PinnedAllTimeBestSeller {
  id: string;
  type: "MANGA" | "COLLECTIBLE";
  rank: number;
  salesMilestone?: string;
  salesRecord: string;
}

export interface PinnedNewArrival {
  id: string;
  type: "MANGA" | "LIGHT_NOVEL" | "FIGURE" | "PLAMO" | "GOODS";
  badgeText: string;
  releaseDateText: string;
}

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

export interface BestSellerSettings {
  mode: BestSellerCalculationMode;
  autoTimeWindowDays: 7 | 14 | 30 | 90;
  hideOutOfStock: boolean;
  pinnedBestSellers: PinnedBestSeller[];
  pinnedAllTime: PinnedAllTimeBestSeller[];
  pinnedNewArrivals: PinnedNewArrival[];
  pinnedRecommended: PinnedRecommended[];
  updatedAt: string;
}

export const TOP_ITEMS_LIMIT = 5;
export const STORAGE_VERSION = "v7_strict_top5_clean";
const STORAGE_KEY = `manga_store_best_seller_settings_${STORAGE_VERSION}`;
export const BEST_SELLER_SETTINGS_CHANGED_EVENT = "manga_store_best_seller_changed";

export function cleanProductId(id: string | number): string {
  if (!id) return "";
  let clean = String(id).trim().toLowerCase();
  clean = clean.replace(/^(manga-|collectible-|rec-manga-|rec-col-|fig-|figure-|plamo-|gunpla-|goods-|acc-|accessory-|alltime-|new-)/, "");
  if (clean === "jjk" || clean === "jujutsu") return "jujutsu-kaisen";
  if (clean === "kaiju8" || clean === "kaiju") return "kaiju-no-8";
  if (clean === "op" || clean === "onepiece") return "one-piece";
  if (clean === "spy" || clean === "spyfamily" || clean === "spyxfamily" || clean === "spy-family") return "spy-x-family";
  if (clean === "csm" || clean === "chainsaw") return "chainsaw-man";
  if (clean === "aot") return "attack-on-titan";
  if (clean === "gojo" || clean === "gojo-nendoroid" || clean === "fig-gojo") return "2001";
  return clean;
}

export const DEFAULT_SETTINGS: BestSellerSettings = {
  mode: "HYBRID",
  autoTimeWindowDays: 30,
  hideOutOfStock: true,
  pinnedBestSellers: [
    { id: "jujutsu-kaisen", type: "MANGA", rank: 1, salesTextOverride: "ยอดขายสะสม 25,000+ เล่ม" },
    { id: "frieren", type: "MANGA", rank: 2, salesTextOverride: "ยอดขายสะสม 18,500+ เล่ม" },
    { id: "one-piece", type: "MANGA", rank: 3, salesTextOverride: "ยอดขายสะสม 22,000+ เล่ม" },
    { id: "2001", type: "COLLECTIBLE", rank: 4, salesTextOverride: "ยอดสั่งจอง 1,200+ กล่อง" },
    { id: "kaiju-no-8", type: "MANGA", rank: 5, salesTextOverride: "ยอดพิมพ์สะสม 13 ล้านเล่ม" },
  ],
  pinnedAllTime: [
    { id: "one-piece", type: "MANGA", rank: 1, salesRecord: "ยอดขายทะลุ 516 ล้านเล่มทั่วโลก", salesMilestone: "516,000,000+ เล่ม" },
    { id: "jujutsu-kaisen", type: "MANGA", rank: 2, salesRecord: "ยอดพิมพ์สะสมทะลุ 100 ล้านเล่ม", salesMilestone: "100,000,000+ เล่ม" },
    { id: "attack-on-titan", type: "MANGA", rank: 3, salesRecord: "ปรากฏการณ์มังงะระดับโลก 34 เล่มจบ", salesMilestone: "140,000,000+ เล่ม" },
    { id: "frieren", type: "MANGA", rank: 4, salesRecord: "การันตีรางวัล Manga Taisho อันดับ 1", salesMilestone: "22,000,000+ เล่ม" },
    { id: "2001", type: "COLLECTIBLE", rank: 5, salesRecord: "เนนโดรอยด์ยอดสั่งจองสูงสุดตลอดกาล", salesMilestone: "อันดับ #1 ยอดจอง" },
  ],
  pinnedNewArrivals: [
    { id: "jujutsu-kaisen", type: "MANGA", badgeText: "NEW สัปดาห์นี้", releaseDateText: "เล่ม 27 ออกใหม่ล่าสุด · พร้อมส่ง" },
    { id: "frieren", type: "MANGA", badgeText: "NEW สัปดาห์นี้", releaseDateText: "เล่ม 13 ฉบับพิมพ์ใหม่ · พร้อมส่ง" },
    { id: "spy-x-family", type: "MANGA", badgeText: "NEW สัปดาห์นี้", releaseDateText: "เล่ม 14 พร้อมของแถมลิขสิทธิ์" },
    { id: "konosuba-novel", type: "LIGHT_NOVEL", badgeText: "NEW สัปดาห์นี้", releaseDateText: "ไลท์โนเวลฉบับพิมพ์ใหม่" },
    { id: "2002", type: "FIGURE", badgeText: "NEW เข้าใหม่", releaseDateText: "ล็อตใหม่ล่าสุด · พร้อมส่ง" },
  ],
  pinnedRecommended: [
    {
      id: "frieren",
      type: "MANGA",
      highlightText: "รางวัล Manga Taisho อันดับ 1",
      badgeText: "MUST READ · มาสเตอร์พีซ",
    },
    {
      id: "2001",
      type: "COLLECTIBLE",
      highlightText: "Nendoroid ลิขสิทธิ์ Good Smile แท้",
      badgeText: "STAFF PICK · ยอดฮิต",
    },
    {
      id: "solo-leveling",
      type: "MANGA",
      highlightText: "ยอดอ่านทั่วโลกกว่าพันล้านครั้ง",
      badgeText: "HIT ANIME · สุดมันส์",
    },
    {
      id: "6001",
      type: "COLLECTIBLE",
      highlightText: "RG Hi-Nu ดีเทลขั้นสุดยอด",
      badgeText: "GUNPLA · พรีเมียม",
    },
  ],
  updatedAt: new Date().toISOString(),
};

export function getBestSellerSettings(): BestSellerSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    // If current storage key is missing, purge legacy caches to reset to strict Top 5
    if (!raw) {
      for (let i = 1; i <= 6; i++) {
        localStorage.removeItem(`manga_store_best_seller_settings_v${i}`);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    }

    const parsed = JSON.parse(raw) as BestSellerSettings;

    // Enforce strict Top 5 and sequential ranks (1 to 5)
    if (Array.isArray(parsed.pinnedBestSellers)) {
      parsed.pinnedBestSellers = parsed.pinnedBestSellers
        .slice(0, TOP_ITEMS_LIMIT)
        .map((item, idx) => ({ ...item, rank: idx + 1 }));
    } else {
      parsed.pinnedBestSellers = DEFAULT_SETTINGS.pinnedBestSellers;
    }

    if (Array.isArray(parsed.pinnedAllTime)) {
      parsed.pinnedAllTime = parsed.pinnedAllTime
        .slice(0, TOP_ITEMS_LIMIT)
        .map((item, idx) => ({ ...item, rank: idx + 1 }));
    } else {
      parsed.pinnedAllTime = DEFAULT_SETTINGS.pinnedAllTime;
    }

    if (Array.isArray(parsed.pinnedNewArrivals)) {
      parsed.pinnedNewArrivals = parsed.pinnedNewArrivals.slice(0, TOP_ITEMS_LIMIT);
    } else {
      parsed.pinnedNewArrivals = DEFAULT_SETTINGS.pinnedNewArrivals;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    return parsed;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveBestSellerSettings(settings: Partial<BestSellerSettings>): BestSellerSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  const current = getBestSellerSettings();
  const updated: BestSellerSettings = {
    ...current,
    ...settings,
    updatedAt: new Date().toISOString(),
  };

  // Enforce strict Top 5 and sequential ranks (1 to 5)
  if (Array.isArray(updated.pinnedBestSellers)) {
    updated.pinnedBestSellers = updated.pinnedBestSellers
      .slice(0, TOP_ITEMS_LIMIT)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));
  }
  if (Array.isArray(updated.pinnedAllTime)) {
    updated.pinnedAllTime = updated.pinnedAllTime
      .slice(0, TOP_ITEMS_LIMIT)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));
  }
  if (Array.isArray(updated.pinnedNewArrivals)) {
    updated.pinnedNewArrivals = updated.pinnedNewArrivals.slice(0, TOP_ITEMS_LIMIT);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent(BEST_SELLER_SETTINGS_CHANGED_EVENT, { detail: updated }));
  return updated;
}

export function subscribeBestSellerSettings(
  callback: (settings: BestSellerSettings) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => {
    callback(getBestSellerSettings());
  };
  window.addEventListener(BEST_SELLER_SETTINGS_CHANGED_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(BEST_SELLER_SETTINGS_CHANGED_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

/**
 * Returns the effective Best Sellers list based on the active mode:
 * - AUTO: 100% computed from sales stats/catalog
 * - MANUAL: only admin pinned items
 * - HYBRID: pinned items take precedence, remaining slots filled from auto-calculated items
 */
export function getEffectiveBestSellers(
  catalog: CatalogData,
  settings: BestSellerSettings = getBestSellerSettings(),
): BestSellerProductItem[] {
  const autoList = getAllBestSellers(catalog);

  // If AUTO mode: return purely auto-calculated list
  if (settings.mode === "AUTO") {
    return autoList
      .slice(0, TOP_ITEMS_LIMIT)
      .map((item, idx) => ({
        ...item,
        rank: idx + 1,
        badgeText: `อันดับ #${idx + 1} สินค้าขายดี`,
      }));
  }

  // If MANUAL mode: return only items explicitly pinned by admin
  if (settings.mode === "MANUAL") {
    const result: BestSellerProductItem[] = [];
    for (const pinned of settings.pinnedBestSellers) {
      const match = autoList.find(
        (item) => cleanProductId(item.id) === cleanProductId(pinned.id),
      );
      if (match) {
        result.push({
          ...match,
          rank: pinned.rank,
          salesText: pinned.salesTextOverride || match.salesText,
          badgeText: `อันดับ #${pinned.rank} ขายดี (ปักหมุด)`,
        });
      } else if (pinned.type === "MANGA") {
        const series = [...catalog.mangaSeries, ...(catalog.lightNovelSeries ?? [])].find(
          (s) => cleanProductId(s.id) === cleanProductId(pinned.id) || s.id === pinned.id,
        );
        if (series) {
          const minPrice = series.volumes.length
            ? Math.min(...series.volumes.map((v) => v.price))
            : 95;
          result.push({
            id: `manga-${series.id}`,
            type: "MANGA",
            rank: pinned.rank,
            title: series.title,
            subtitle: `${series.publisher} · ${series.volumes.length} เล่ม`,
            priceFormatted: `เริ่มต้น ฿${minPrice.toLocaleString("th-TH")}`,
            numericPrice: minPrice,
            imageUrl:
              series.coverUrl ||
              series.coverImage ||
              series.volumes[0]?.coverUrl ||
              "/images/products/jjk-vol-01.jpg",
            badgeText: `อันดับ #${pinned.rank} ขายดี (ปักหมุด)`,
            salesText: pinned.salesTextOverride || "สินค้าขายดี",
            rating: 4.8,
            reviewCount: 350,
            href: `/manga/${encodeURIComponent(series.id)}`,
            categoryTab: "manga",
          });
        }
      } else if (pinned.type === "COLLECTIBLE") {
        const fig = [...catalog.figures, ...catalog.plamo, ...catalog.goods].find(
          (f) => String(f.id) === cleanProductId(pinned.id) || f.slug === cleanProductId(pinned.id),
        );
        if (fig) {
          result.push({
            id: `collectible-${fig.id}`,
            type: "COLLECTIBLE",
            rank: pinned.rank,
            title: fig.name,
            subtitle: `${fig.series || fig.manufacturer} · ของแท้ลิขสิทธิ์`,
            priceFormatted: `฿${fig.fullPrice.toLocaleString("th-TH")}`,
            numericPrice: fig.fullPrice,
            imageUrl: fig.coverUrl || fig.coverImage || fig.images[0] || "",
            badgeText: `อันดับ #${pinned.rank} ขายดี (ปักหมุด)`,
            salesText: pinned.salesTextOverride || "สินค้าขายดี",
            rating: 4.9,
            reviewCount: 280,
            href: `/figures/${encodeURIComponent(fig.slug)}`,
            categoryTab: "figure",
          });
        }
      }
    }
    return result
      .sort((a, b) => a.rank - b.rank)
      .slice(0, TOP_ITEMS_LIMIT)
      .map((item, idx) => ({
        ...item,
        rank: idx + 1,
        badgeText: `อันดับ #${idx + 1} ขายดี (ปักหมุด)`,
      }));
  }

  // If HYBRID mode: (Default)
  // 1. Map pinned items with their explicit ranks
  const hybridMap = new Map<number, BestSellerProductItem>();
  const pinnedCleanIds = new Set<string>();

  for (const pinned of settings.pinnedBestSellers) {
    const match = autoList.find(
      (item) => cleanProductId(item.id) === cleanProductId(pinned.id),
    );
    if (match) {
      pinnedCleanIds.add(cleanProductId(match.id));
      hybridMap.set(pinned.rank, {
        ...match,
        rank: pinned.rank,
        salesText: pinned.salesTextOverride || match.salesText,
        badgeText: `อันดับ #${pinned.rank} สินค้าขายดี`,
      });
    } else if (pinned.type === "MANGA") {
      const series = [...catalog.mangaSeries, ...(catalog.lightNovelSeries ?? [])].find(
        (s) => cleanProductId(s.id) === cleanProductId(pinned.id) || s.id === pinned.id,
      );
      if (series) {
        const minPrice = series.volumes.length
          ? Math.min(...series.volumes.map((v) => v.price))
          : 95;
        const fallbackManga: BestSellerProductItem = {
          id: `manga-${series.id}`,
          type: "MANGA",
          rank: pinned.rank,
          title: series.title,
          subtitle: `${series.publisher} · ${series.volumes.length} เล่ม`,
          priceFormatted: `เริ่มต้น ฿${minPrice.toLocaleString("th-TH")}`,
          numericPrice: minPrice,
          imageUrl:
            series.coverUrl ||
            series.coverImage ||
            series.volumes[0]?.coverUrl ||
            "/images/products/jjk-vol-01.jpg",
          badgeText: `อันดับ #${pinned.rank} สินค้าขายดี`,
          salesText: pinned.salesTextOverride || "สินค้าขายดี",
          rating: 4.8,
          reviewCount: 350,
          href: `/manga/${encodeURIComponent(series.id)}`,
          categoryTab: "manga",
        };
        pinnedCleanIds.add(cleanProductId(fallbackManga.id));
        hybridMap.set(pinned.rank, fallbackManga);
      }
    } else if (pinned.type === "COLLECTIBLE") {
      const fig = [...catalog.figures, ...catalog.plamo, ...catalog.goods].find(
        (f) => String(f.id) === cleanProductId(pinned.id) || f.slug === cleanProductId(pinned.id),
      );
      if (fig) {
        const fallbackItem: BestSellerProductItem = {
          id: `collectible-${fig.id}`,
          type: "COLLECTIBLE",
          rank: pinned.rank,
          title: fig.name,
          subtitle: `${fig.series || fig.manufacturer} · ของแท้ลิขสิทธิ์`,
          priceFormatted: `฿${fig.fullPrice.toLocaleString("th-TH")}`,
          numericPrice: fig.fullPrice,
          imageUrl: fig.coverUrl || fig.coverImage || fig.images[0] || "",
          badgeText: `อันดับ #${pinned.rank} สินค้าขายดี`,
          salesText: pinned.salesTextOverride || "สินค้าขายดี",
          rating: 4.9,
          reviewCount: 280,
          href: `/figures/${encodeURIComponent(fig.slug)}`,
          categoryTab: "figure",
        };
        pinnedCleanIds.add(cleanProductId(fallbackItem.id));
        hybridMap.set(pinned.rank, fallbackItem);
      }
    }
  }

  // 2. Fill unfilled slots from auto-calculated items
  let nextRank = 1;
  for (const autoItem of autoList) {
    if (pinnedCleanIds.has(cleanProductId(autoItem.id))) continue;
    while (hybridMap.has(nextRank)) {
      nextRank++;
    }
    hybridMap.set(nextRank, {
      ...autoItem,
      rank: nextRank,
      badgeText: `อันดับ #${nextRank} สินค้าขายดี`,
    });
    nextRank++;
  }

  return Array.from(hybridMap.values())
    .sort((a, b) => a.rank - b.rank)
    .slice(0, TOP_ITEMS_LIMIT)
    .map((item, idx) => ({
      ...item,
      rank: idx + 1,
      badgeText: `อันดับ #${idx + 1} สินค้าขายดี`,
    }));
}

/**
 * Returns the effective Recommended list based on settings
 */
export function getEffectiveRecommended(
  catalog: CatalogData,
  settings: BestSellerSettings = getBestSellerSettings(),
): RecommendedProductItem[] {
  const defaultList = getRecommendedProducts(catalog);

  if (settings.mode === "AUTO") {
    return defaultList;
  }

  // In MANUAL or HYBRID: apply any custom highlights
  return defaultList.map((item) => {
    const cleanId = cleanProductId(item.id);
    const pinned = settings.pinnedRecommended.find(
      (p) => cleanProductId(p.id) === cleanId,
    );
    if (pinned) {
      return {
        ...item,
        highlightText: pinned.highlightText || item.highlightText,
        badgeText: pinned.badgeText || item.badgeText,
      };
    }
    return item;
  });
}

/**
 * Returns the effective All-Time Best Sellers list based on admin settings
 */
export function getEffectiveAllTimeBestSellers(
  catalog: CatalogData,
  settings: BestSellerSettings = getBestSellerSettings(),
): AllTimeBestSellerItem[] {
  const list = settings.pinnedAllTime && settings.pinnedAllTime.length > 0
    ? settings.pinnedAllTime
    : DEFAULT_SETTINGS.pinnedAllTime;

  const result: AllTimeBestSellerItem[] = [];

  for (const item of list) {
    const cleanId = cleanProductId(item.id);
    if (item.type === "MANGA") {
      const series = [...catalog.mangaSeries, ...(catalog.lightNovelSeries ?? [])].find(
        (s) => cleanProductId(s.id) === cleanId || s.id === item.id || (s as any).slug === cleanId,
      );
      if (series) {
        const minPrice = series.volumes.length
          ? Math.min(...series.volumes.map((v) => v.price))
          : 95;
        result.push({
          id: `alltime-${series.id}`,
          rank: item.rank,
          title: series.title,
          subtitle: `${series.publisher} · ${series.author || "ลิขสิทธิ์แท้"}`,
          priceFormatted: `เริ่มต้น ฿${minPrice.toLocaleString("th-TH")}`,
          numericPrice: minPrice,
          imageUrl:
            series.coverUrl ||
            series.coverImage ||
            series.volumes[0]?.coverUrl ||
            "",
          salesMilestone: "มาสเตอร์พีซตลอดกาล",
          salesRecord: item.salesRecord || "ยอดขายสูงสุดตลอดกาล",
          rating: 5.0,
          reviewCount: 650,
          href: `/manga/${encodeURIComponent(series.id)}`,
          categoryTab: "manga",
        });
      }
    } else {
      const fig = [
        ...catalog.figures,
        ...catalog.plamo,
        ...catalog.goods,
        ...catalog.accessories,
      ].find(
        (f) => String(f.id) === cleanId || String(f.id) === item.id || f.slug === cleanId,
      );
      if (fig) {
        result.push({
          id: `alltime-${fig.id}`,
          rank: item.rank,
          title: fig.name,
          subtitle: `${fig.series || fig.manufacturer} · ของแท้ล็อต JP`,
          priceFormatted: `฿${fig.fullPrice.toLocaleString("th-TH")}`,
          numericPrice: fig.fullPrice,
          imageUrl: fig.coverUrl || fig.coverImage || fig.images[0] || "",
          salesMilestone: "ของสะสมยอดนิยมตลอดกาล",
          salesRecord: item.salesRecord || "ยอดสั่งจองอันดับ 1 ของร้าน",
          rating: 5.0,
          reviewCount: 410,
          href: `/figures/${encodeURIComponent(fig.slug || fig.id)}`,
          categoryTab: "figure",
        });
      }
    }
  }

  // Fallback defaults to ensure 5 complete cards even if custom items fail to resolve
  if (result.length < TOP_ITEMS_LIMIT) {
    const fallbacks: AllTimeBestSellerItem[] = [
      { id: "alltime-op", rank: 1, title: "วันพีซ (One Piece: Egghead Arc)", subtitle: "Siam Inter Comics · Eiichiro Oda", priceFormatted: "เริ่มต้น ฿95", numericPrice: 95, imageUrl: "/images/products/onepiece-vol-105.jpg", salesMilestone: "516,000,000+ เล่ม", salesRecord: "ยอดขายทะลุ 516 ล้านเล่มทั่วโลก", rating: 5.0, reviewCount: 980, href: "/manga/one-piece", categoryTab: "manga" },
      { id: "alltime-jjk", rank: 2, title: "มหาเวทย์ผนึกมาร (Jujutsu Kaisen)", subtitle: "Siam Inter Comics · Gege Akutami", priceFormatted: "เริ่มต้น ฿95", numericPrice: 95, imageUrl: "/images/products/jjk-vol-01.jpg", salesMilestone: "100,000,000+ เล่ม", salesRecord: "ยอดพิมพ์สะสมทะลุ 100 ล้านเล่ม", rating: 4.9, reviewCount: 750, href: "/manga/jujutsu-kaisen", categoryTab: "manga" },
      { id: "alltime-aot", rank: 3, title: "ผ่าพิภพไททัน (Attack on Titan)", subtitle: "Vibulkij · Hajime Isayama", priceFormatted: "เริ่มต้น ฿95", numericPrice: 95, imageUrl: "/images/products/aot-vol-01.jpg", salesMilestone: "140,000,000+ เล่ม", salesRecord: "ปรากฏการณ์มังงะระดับโลก 34 เล่มจบ", rating: 4.9, reviewCount: 620, href: "/manga/attack-on-titan", categoryTab: "manga" },
      { id: "alltime-frieren", rank: 4, title: "คำอธิษฐานในวันที่จากลา (Frieren)", subtitle: "Siam Inter Comics · Kanehito Yamada", priceFormatted: "เริ่มต้น ฿95", numericPrice: 95, imageUrl: "/images/products/frieren-vol-01.jpg", salesMilestone: "22,000,000+ เล่ม", salesRecord: "การันตีรางวัล Manga Taisho อันดับ 1", rating: 5.0, reviewCount: 540, href: "/manga/frieren", categoryTab: "manga" },
      { id: "alltime-gojo", rank: 5, title: "Nendoroid Satoru Gojo: JJK 0 Ver.", subtitle: "Good Smile Company · ของแท้ล็อต JP", priceFormatted: "฿1,850", numericPrice: 1850, imageUrl: "/images/products/figure-2001.jpg", salesMilestone: "อันดับ #1 ยอดจอง", salesRecord: "เนนโดรอยด์ยอดสั่งจองสูงสุดตลอดกาล", rating: 5.0, reviewCount: 410, href: "/figures/2001", categoryTab: "figure" },
    ];
    for (const fb of fallbacks) {
      if (!result.some((r) => r.rank === fb.rank || r.id === fb.id)) {
        result.push(fb);
        if (result.length >= TOP_ITEMS_LIMIT) break;
      }
    }
  }

  return result
    .sort((a, b) => a.rank - b.rank)
    .slice(0, TOP_ITEMS_LIMIT)
    .map((item, idx) => ({ ...item, rank: idx + 1 }));
}

/**
 * Returns the effective New Arrivals list based on admin settings
 */
export function getEffectiveNewArrivalsList(
  catalog: CatalogData,
  settings: BestSellerSettings = getBestSellerSettings(),
): NewArrivalProductItem[] {
  const defaultList = getWeeklyNewArrivals(catalog);
  if (!settings.pinnedNewArrivals || settings.pinnedNewArrivals.length === 0) {
    return defaultList.slice(0, TOP_ITEMS_LIMIT);
  }

  const result: NewArrivalProductItem[] = [];

  for (const item of settings.pinnedNewArrivals) {
    const cleanId = cleanProductId(item.id);
    if (item.type === "MANGA" || item.type === "LIGHT_NOVEL") {
      const series = [...catalog.mangaSeries, ...(catalog.lightNovelSeries ?? [])].find(
        (s) => cleanProductId(s.id) === cleanId || s.id === item.id || (s as any).slug === cleanId,
      );
      if (series) {
        const lastVol = series.volumes[series.volumes.length - 1];
        const minPrice = lastVol?.price ?? (series.volumes.length ? Math.min(...series.volumes.map((v) => v.price)) : 95);
        result.push({
          id: `new-${series.id}`,
          type: item.type,
          title: `${series.title}${lastVol ? ` เล่ม ${lastVol.volumeNumber}` : ""}`,
          subtitle: `${series.publisher} · เล่มออกใหม่ล่าสุด`,
          priceFormatted: `฿${minPrice.toLocaleString("th-TH")}`,
          numericPrice: minPrice,
          imageUrl:
            lastVol?.coverUrl ||
            series.coverUrl ||
            series.coverImage ||
            series.volumes[0]?.coverUrl ||
            "",
          badgeText: item.badgeText || "NEW สัปดาห์นี้",
          releaseDateText: item.releaseDateText || "วางแผงสัปดาห์นี้ · พร้อมส่ง",
          rating: 4.9,
          reviewCount: 300,
          href: `/manga/${encodeURIComponent(series.id)}`,
          categoryTab: item.type === "LIGHT_NOVEL" ? "novel" : "manga",
          isLatestVolume: true,
        });
      }
    } else {
      const fig = [
        ...catalog.figures,
        ...catalog.plamo,
        ...catalog.goods,
        ...catalog.accessories,
      ].find(
        (f) => String(f.id) === cleanId || String(f.id) === item.id || f.slug === cleanId,
      );
      if (fig) {
        result.push({
          id: `new-${fig.id}`,
          type: (fig.category as any) ?? "FIGURE",
          title: fig.name,
          subtitle: `${fig.series || fig.manufacturer} · ล็อตใหม่ล่าสุด`,
          priceFormatted: `฿${fig.fullPrice.toLocaleString("th-TH")}`,
          numericPrice: fig.fullPrice,
          imageUrl: fig.coverUrl || fig.coverImage || fig.images[0] || "",
          badgeText: item.badgeText || "NEW เข้าใหม่",
          releaseDateText: item.releaseDateText || "ล็อตใหม่ล่าสุด · พร้อมส่ง",
          rating: 5.0,
          reviewCount: 220,
          href: `/figures/${encodeURIComponent(fig.slug || fig.id)}`,
          categoryTab: (fig.category?.toLowerCase() as any) ?? "figure",
        });
      }
    }
  }

  // Fill up to TOP_ITEMS_LIMIT from defaultList if needed
  if (result.length < TOP_ITEMS_LIMIT) {
    for (const def of defaultList) {
      if (!result.some((r) => r.id === def.id || r.href === def.href)) {
        result.push(def);
        if (result.length >= TOP_ITEMS_LIMIT) break;
      }
    }
  }

  return result.slice(0, TOP_ITEMS_LIMIT);
}

/**
 * Resolves the real-time effective Best Seller rank and sales text for any product
 * by checking admin pinned settings first, then the auto rankings.
 */
export function getProductEffectiveBestSellerRank(
  productId: string | number,
  category?: string,
  settings: BestSellerSettings = getBestSellerSettings(),
): { rank: number; salesText: string; isPinned: boolean } | null {
  if (!productId) return null;
  const rawId = String(productId);
  const cleanId = cleanProductId(productId);

  // 1. Check pinned items first (Admin overrides)
  const pinned = settings.pinnedBestSellers?.find(
    (p) =>
      cleanProductId(p.id) === cleanId ||
      String(p.id) === rawId ||
      String(p.id).toLowerCase() === rawId.toLowerCase() ||
      cleanProductId(p.id) === rawId.toLowerCase(),
  );
  if (pinned) {
    return {
      rank: pinned.rank,
      salesText: pinned.salesTextOverride || "สินค้าขายดียอดนิยม",
      isPinned: true,
    };
  }

  // In MANUAL mode, only admin pinned items have rank
  if (settings.mode === "MANUAL") {
    return null;
  }

  // 2. Check manga metadata
  const mangaMeta =
    MANGA_SERIES_GENRE_MAP[cleanId] ||
    MANGA_SERIES_GENRE_MAP[rawId];
  if (mangaMeta?.bestSellerRank && mangaMeta.bestSellerRank <= 10) {
    return {
      rank: mangaMeta.bestSellerRank,
      salesText: mangaMeta.salesText || "สินค้าขายดี",
      isPinned: false,
    };
  }

  // 3. Check collectible metadata
  const colMeta =
    COLLECTIBLE_BEST_SELLER_MAP[cleanId] ||
    COLLECTIBLE_BEST_SELLER_MAP[rawId];
  if (colMeta?.bestSellerRank && colMeta.bestSellerRank <= 10) {
    return {
      rank: colMeta.bestSellerRank,
      salesText: colMeta.salesText || "สินค้าขายดี",
      isPinned: false,
    };
  }

  return null;
}

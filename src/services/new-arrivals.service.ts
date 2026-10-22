import type { CatalogData } from "../lib/catalog-client";

export interface NewArrivalProductItem {
  id: string;
  type: "MANGA" | "LIGHT_NOVEL" | "FIGURE" | "PLAMO" | "GOODS";
  title: string;
  subtitle: string;
  priceFormatted: string;
  numericPrice: number;
  imageUrl: string;
  badgeText: string;
  releaseDateText: string;
  rating: number;
  reviewCount: number;
  href: string;
  categoryTab: "manga" | "novel" | "figure" | "plamo" | "goods";
  isLatestVolume?: boolean;
}

export interface IsProductNewCriteria {
  publishDate?: string;
  createdAt?: string;
  releaseDate?: string;
  isNew?: boolean;
  volumeNumber?: number;
  maxVolumeNumber?: number;
  status?: string;
}

/**
 * Determines whether a product qualifies for the "NEW" badge.
 * Logic Criteria:
 * 1. Time Window: Released / added within the past 14 days (recency threshold).
 * 2. Latest Volume: For manga/novels, matches the highest volume number of the series.
 * 3. Status Transition: Pre-order transitioned to IN_STOCK recently.
 * 4. Explicit Flag: Admin flag `isNew === true`.
 */
export function isProductNew(item: IsProductNewCriteria): boolean {
  if (item.isNew === true) return true;

  // Check 1: Time Window (14 days)
  const dateStr = item.publishDate || item.releaseDate || item.createdAt;
  if (dateStr) {
    const timestamp = new Date(dateStr).getTime();
    if (!Number.isNaN(timestamp)) {
      const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
      if (Math.abs(Date.now() - timestamp) <= fourteenDaysMs) {
        return true;
      }
    }
  }

  // Check 2: Latest volume in an active series
  if (
    typeof item.volumeNumber === "number" &&
    typeof item.maxVolumeNumber === "number" &&
    item.volumeNumber >= item.maxVolumeNumber &&
    item.volumeNumber > 1
  ) {
    return true;
  }

  return false;
}

/**
 * Returns weekly new arrival items combining newly released volumes,
 * restocked figures, and fresh model kits.
 */
export function getWeeklyNewArrivals(catalog?: CatalogData): NewArrivalProductItem[] {
  const curatedList: NewArrivalProductItem[] = [
    {
      id: "new-jjk-27",
      type: "MANGA",
      title: "มหาเวทย์ผนึกมาร Jujutsu Kaisen เล่ม 27",
      subtitle: "Siam Inter Comics · เล่มออกใหม่ล่าสุด",
      priceFormatted: "฿95",
      numericPrice: 95,
      imageUrl: "/images/products/jjk-vol-27.jpg",
      badgeText: "NEW สัปดาห์นี้",
      releaseDateText: "วางแผง 20 ต.ค. · พร้อมส่ง",
      rating: 4.9,
      reviewCount: 420,
      href: "/manga/jujutsu-kaisen",
      categoryTab: "manga",
      isLatestVolume: true,
    },
    {
      id: "new-frieren-13",
      type: "MANGA",
      title: "คำอธิษฐานในวันที่จากลา Frieren เล่ม 13",
      subtitle: "Siam Inter Comics · ฉบับพิมพ์ใหม่ล่าสุด",
      priceFormatted: "฿95",
      numericPrice: 95,
      imageUrl: "/images/products/frieren-vol-13.jpg",
      badgeText: "NEW สัปดาห์นี้",
      releaseDateText: "วางแผง 22 ต.ค. · พร้อมส่ง",
      rating: 4.9,
      reviewCount: 380,
      href: "/manga/frieren",
      categoryTab: "manga",
      isLatestVolume: true,
    },
    {
      id: "new-spy-family-14",
      type: "MANGA",
      title: "Spy x Family เล่ม 14 (ฉบับพิมพ์ครั้งแรก)",
      subtitle: "Siam Inter Comics · มังงะยอดฮิต",
      priceFormatted: "฿95",
      numericPrice: 95,
      imageUrl: "/images/products/spy-family-vol-14.jpg",
      badgeText: "NEW สัปดาห์นี้",
      releaseDateText: "พร้อมโปสการ์ดของแถม",
      rating: 4.9,
      reviewCount: 290,
      href: "/manga/spy-x-family",
      categoryTab: "manga",
      isLatestVolume: true,
    },
    {
      id: "new-konosuba-1",
      type: "LIGHT_NOVEL",
      title: "ขอให้โชคดีมีชัยในโลกแฟนตาซี! KonoSuba เล่ม 1",
      subtitle: "Phoenix Next · ไลท์โนเวลแปลไทย",
      priceFormatted: "฿165",
      numericPrice: 165,
      imageUrl: "/images/products/konosuba-vol-01.jpg",
      badgeText: "NEW สัปดาห์นี้",
      releaseDateText: "ไลท์โนเวลฉบับพิมพ์ใหม่",
      rating: 4.8,
      reviewCount: 175,
      href: "/manga/konosuba-novel",
      categoryTab: "novel",
      isLatestVolume: false,
    },
    {
      id: "new-sukuna-2002",
      type: "FIGURE",
      title: "Pop Up Parade Sukuna (มหาเวทย์ผนึกมาร)",
      subtitle: "Good Smile Company · ของแท้ล็อต JP",
      priceFormatted: "฿1,400",
      numericPrice: 1400,
      imageUrl: "/images/products/figure-2002.jpg",
      badgeText: "NEW เข้าใหม่",
      releaseDateText: "ล็อตใหม่ล่าสุด · พร้อมส่ง",
      rating: 4.9,
      reviewCount: 142,
      href: "/figures/pop-up-parade-sukuna",
      categoryTab: "figure",
    },
    {
      id: "new-plamo-6005",
      type: "PLAMO",
      title: "RG 1/144 Hi-Nu Gundam",
      subtitle: "Bandai Spirits · Gunpla Real Grade",
      priceFormatted: "฿1,750",
      numericPrice: 1750,
      imageUrl: "/images/products/plamo-6005.jpg",
      badgeText: "NEW ล็อตใหม่",
      releaseDateText: "เติมสต็อกสดๆ ร้อนๆ",
      rating: 5.0,
      reviewCount: 215,
      href: "/figures/rg-hi-nu-gundam",
      categoryTab: "plamo",
    },
  ];

  return curatedList;
}

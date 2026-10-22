import type {
  CatalogData,
  CatalogFigure,
  CatalogMangaSeries,
  CatalogVolume,
} from "../lib/catalog-client";
import {
  rawAccessories,
  rawFigures,
  rawGoods,
  rawLightNovelSeries,
  rawMangaSeries,
  rawPlamo,
  buildCatalogData,
} from "./data/products.data";

export type MasterCategory =
  | "MANGA"
  | "LIGHT_NOVEL"
  | "FIGURE"
  | "PLAMO"
  | "GOODS"
  | "ACCESSORY";

export interface MasterVolumeItem {
  id: number;
  volumeNumber: number;
  title: string;
  coverUrl: string;
  price: number;
  stock: number;
  taxRate: 0;
  status: "IN_STOCK" | "PREORDER" | "OUT_OF_STOCK";
  variantLabel?: string;
  isbn?: string;
}

export interface MasterProductItem {
  id: string;
  slug: string;
  title: string;
  category: MasterCategory;
  price: number;
  coverImage: string;
  imageUrl: string;
  stock: number;
  taxRate: number; // 0 for books, 0.07 for collectibles
  volumes?: MasterVolumeItem[]; // For manga & light novels
  series?: string;
  character?: string;
  manufacturer?: string;
  publisher?: string;
  scale?: string;
  grade?: string;
  depositAmount?: number;
  status?: string;
  boxDimensions?: {
    widthCm: number;
    lengthCm: number;
    heightCm: number;
  };
  janCode?: string;
  altTitles?: string[];
  aliases?: string[];
  description?: string;
}

export const STORAGE_VERSION = "v5_fully_synced_master";
export const STORAGE_VERSION_KEY = "manga_store_master_version";

/**
 * Initializes and synchronizes client cache.
 * If outdated cache version is detected, clears localStorage to remove
 * legacy broken IDs/URLs and starts with clean Master Data.
 */
export function initializeMasterStorage(): void {
  if (typeof window === "undefined") return;
  try {
    const currentVersion = window.localStorage.getItem(STORAGE_VERSION_KEY);
    if (currentVersion !== STORAGE_VERSION) {
      // Clear legacy broken cached entries
      window.localStorage.clear();
      window.localStorage.setItem(STORAGE_VERSION_KEY, STORAGE_VERSION);
    }
  } catch (error) {
    console.error("[Storage] Failed to initialize master cache", error);
  }
}

// Master Products List covering all 6 categories
export const MASTER_PRODUCTS: MasterProductItem[] = [
  // ----------------------------------------------------
  // 1. MANGA (VAT 0%)
  // ----------------------------------------------------
  {
    id: "manga-jjk-01",
    slug: "jujutsu-kaisen",
    title: "มหาเวทย์ผนึกมาร (Jujutsu Kaisen)",
    category: "MANGA",
    price: 95,
    coverImage: "/images/products/jjk-vol-01.jpg",
    imageUrl: "/images/products/jjk-vol-01.jpg",
    stock: 50,
    taxRate: 0,
    publisher: "Siam Inter Comics",
    aliases: ["jjk", "jujutsu", "jujutsu-kaisen", "manga-jjk"],
    volumes: Array.from({ length: 25 }, (_, i) => ({
      id: 1001 + i,
      volumeNumber: i + 1,
      title: `มหาเวทย์ผนึกมาร เล่ม ${i + 1}`,
      coverUrl: `/images/products/jjk-vol-${String(i + 1).padStart(2, "0")}.jpg`,
      price: 95,
      stock: 50,
      taxRate: 0,
      status: "IN_STOCK",
    })),
  },
  {
    id: "manga-spy-family-01",
    slug: "spy-x-family",
    title: "SPY x FAMILY",
    category: "MANGA",
    price: 95,
    coverImage: "/images/products/spy-family-vol-01.jpg",
    imageUrl: "/images/products/spy-family-vol-01.jpg",
    stock: 45,
    taxRate: 0,
    publisher: "Siam Inter Comics",
    aliases: ["spy-family", "spyxfamily", "spy-x-family"],
    volumes: Array.from({ length: 14 }, (_, i) => ({
      id: 1051 + i,
      volumeNumber: i + 1,
      title: `SPY x FAMILY เล่ม ${i + 1}`,
      coverUrl: `/images/products/spy-family-vol-${String(i + 1).padStart(2, "0")}.jpg`,
      price: 95,
      stock: 40,
      taxRate: 0,
      status: "IN_STOCK",
    })),
  },
  {
    id: "manga-csm-01",
    slug: "chainsaw-man",
    title: "มนุษย์เลื่อยยนต์ (Chainsaw Man)",
    category: "MANGA",
    price: 95,
    coverImage: "/images/products/chainsaw-vol-01.jpg",
    imageUrl: "/images/products/chainsaw-vol-01.jpg",
    stock: 40,
    taxRate: 0,
    publisher: "Siam Inter Comics",
    aliases: ["chainsaw", "csm", "chainsaw-man"],
    volumes: Array.from({ length: 19 }, (_, i) => ({
      id: 1101 + i,
      volumeNumber: i + 1,
      title: `มนุษย์เลื่อยยนต์ เล่ม ${i + 1}`,
      coverUrl: `/images/products/chainsaw-vol-${String(i + 1).padStart(2, "0")}.jpg`,
      price: 95,
      stock: 35,
      taxRate: 0,
      status: "IN_STOCK",
    })),
  },
  {
    id: "manga-frieren-01",
    slug: "frieren",
    title: "คำอธิษฐานในวันที่จากลา (Frieren: Beyond Journey's End)",
    category: "MANGA",
    price: 95,
    coverImage: "/images/products/frieren-vol-01.jpg",
    imageUrl: "/images/products/frieren-vol-01.jpg",
    stock: 60,
    taxRate: 0,
    publisher: "Siam Inter Comics",
    aliases: ["frieren", "frieren-beyond-journeys-end"],
    volumes: Array.from({ length: 14 }, (_, i) => ({
      id: 1151 + i,
      volumeNumber: i + 1,
      title: `คำอธิษฐานในวันที่จากลา เล่ม ${i + 1}`,
      coverUrl: `/images/products/frieren-vol-${String(i + 1).padStart(2, "0")}.jpg`,
      price: 95,
      stock: 45,
      taxRate: 0,
      status: "IN_STOCK",
    })),
  },
  {
    id: "manga-aot-01",
    slug: "attack-on-titan",
    title: "ผ่าพิภพไททัน (Attack on Titan)",
    category: "MANGA",
    price: 95,
    coverImage: "/images/products/aot-vol-01.jpg",
    imageUrl: "/images/products/aot-vol-01.jpg",
    stock: 30,
    taxRate: 0,
    publisher: "Vibulkij",
    aliases: ["aot", "attack-on-titan", "shingeki"],
    volumes: Array.from({ length: 34 }, (_, i) => ({
      id: 1201 + i,
      volumeNumber: i + 1,
      title: `ผ่าพิภพไททัน เล่ม ${i + 1}`,
      coverUrl: `/images/products/aot-vol-${String(i + 1).padStart(2, "0")}.jpg`,
      price: 95,
      stock: 30,
      taxRate: 0,
      status: "IN_STOCK",
    })),
  },
  {
    id: "manga-solo-01",
    slug: "solo-leveling",
    title: "Solo Leveling (มันฮวาฉบับพิมพ์สี)",
    category: "MANGA",
    price: 295,
    coverImage: "/images/products/sololeveling-vol-01.jpg",
    imageUrl: "/images/products/sololeveling-vol-01.jpg",
    stock: 25,
    taxRate: 0,
    publisher: "Phoenix Next",
    aliases: ["solo-leveling", "sololeveling"],
    volumes: Array.from({ length: 12 }, (_, i) => ({
      id: 1301 + i,
      volumeNumber: i + 1,
      title: `Solo Leveling เล่ม ${i + 1}`,
      coverUrl: `/images/products/sololeveling-vol-${String(i + 1).padStart(2, "0")}.jpg`,
      price: 295,
      stock: 25,
      taxRate: 0,
      status: "IN_STOCK",
    })),
  },
  {
    id: "manga-op-01",
    slug: "one-piece",
    title: "วันพีซ (One Piece: Egghead Arc)",
    category: "MANGA",
    price: 95,
    coverImage: "/images/products/onepiece-vol-105.jpg",
    imageUrl: "/images/products/onepiece-vol-105.jpg",
    stock: 60,
    taxRate: 0,
    publisher: "Siam Inter Comics",
    aliases: ["one-piece", "onepiece", "op", "manga-op"],
    volumes: Array.from({ length: 108 }, (_, i) => ({
      id: 1401 + i,
      volumeNumber: i + 1,
      title: `วันพีซ เล่ม ${i + 1}`,
      coverUrl: `/images/products/onepiece-vol-105.jpg`,
      price: 95,
      stock: 50,
      taxRate: 0,
      status: "IN_STOCK",
    })),
  },
  {
    id: "manga-kaiju-01",
    slug: "kaiju-no-8",
    title: "ไคจูหมายเลข 8 (Kaiju No. 8)",
    category: "MANGA",
    price: 95,
    coverImage: "/images/products/kaiju-vol-01.jpg",
    imageUrl: "/images/products/kaiju-vol-01.jpg",
    stock: 45,
    taxRate: 0,
    publisher: "Siam Inter Comics",
    aliases: ["kaiju-no-8", "kaiju8", "kaiju", "manga-kaiju8"],
    volumes: Array.from({ length: 15 }, (_, i) => ({
      id: 1501 + i,
      volumeNumber: i + 1,
      title: `ไคจูหมายเลข 8 เล่ม ${i + 1}`,
      coverUrl: `/images/products/kaiju-vol-01.jpg`,
      price: 95,
      stock: 40,
      taxRate: 0,
      status: "IN_STOCK",
    })),
  },

  // ----------------------------------------------------
  // 2. LIGHT NOVEL (VAT 0%)
  // ----------------------------------------------------
  {
    id: "novel-konosuba-01",
    slug: "konosuba-novel",
    title: "ขอให้โชคดีมีชัยในโลกแฟนตาซี! (KonoSuba)",
    category: "LIGHT_NOVEL",
    price: 165,
    coverImage: "/images/products/konosuba-vol-01.jpg",
    imageUrl: "/images/products/konosuba-vol-01.jpg",
    stock: 35,
    taxRate: 0,
    publisher: "Phoenix Next",
    aliases: ["konosuba", "konosuba-novel"],
    volumes: Array.from({ length: 17 }, (_, i) => ({
      id: 3001 + i,
      volumeNumber: i + 1,
      title: `ขอให้โชคดีมีชัยในโลกแฟนตาซี! เล่ม ${i + 1}`,
      coverUrl: `/images/products/konosuba-vol-${String(i + 1).padStart(2, "0")}.jpg`,
      price: 165,
      stock: 35,
      taxRate: 0,
      status: "IN_STOCK",
    })),
  },
  {
    id: "novel-cote-01",
    slug: "classroom-elite-novel",
    title: "ขอต้อนรับสู่ห้องเรียนนิยมเฉพาะยอดคน (Classroom of the Elite)",
    category: "LIGHT_NOVEL",
    price: 185,
    coverImage: "/images/products/cote-vol-01.jpg",
    imageUrl: "/images/products/cote-vol-01.jpg",
    stock: 40,
    taxRate: 0,
    publisher: "Phoenix Next",
    aliases: ["cote", "classroom-elite", "classroom-elite-novel"],
    volumes: Array.from({ length: 11 }, (_, i) => ({
      id: 3101 + i,
      volumeNumber: i + 1,
      title: `ห้องเรียนนิยมเฉพาะยอดคน เล่ม ${i + 1}`,
      coverUrl: `/images/products/cote-vol-${String(i + 1).padStart(2, "0")}.jpg`,
      price: 185,
      stock: 40,
      taxRate: 0,
      status: "IN_STOCK",
    })),
  },
  {
    id: "novel-slime-01",
    slug: "slime-novel",
    title: "เกิดใหม่ทั้งทีก็เป็นสไลม์ไปซะแล้ว (That Time I Got Reincarnated as a Slime)",
    category: "LIGHT_NOVEL",
    price: 220,
    coverImage: "/images/products/slime-vol-01.jpg",
    imageUrl: "/images/products/slime-vol-01.jpg",
    stock: 30,
    taxRate: 0,
    publisher: "First Page Pro",
    aliases: ["slime", "slime-novel", "ten-sura"],
    volumes: Array.from({ length: 20 }, (_, i) => ({
      id: 3201 + i,
      volumeNumber: i + 1,
      title: `เกิดใหม่ทั้งทีก็เป็นสไลม์ฯ เล่ม ${i + 1}`,
      coverUrl: `/images/products/slime-vol-${String(i + 1).padStart(2, "0")}.jpg`,
      price: 220,
      stock: 30,
      taxRate: 0,
      status: "IN_STOCK",
    })),
  },

  // ----------------------------------------------------
  // 3. FIGURE (VAT 7%)
  // ----------------------------------------------------
  {
    id: "fig-gojo-nendoroid",
    slug: "nendoroid-gojo-satoru",
    title: "Nendoroid Gojo Satoru (มหาเวทย์ผนึกมาร)",
    category: "FIGURE",
    price: 1850,
    coverImage: "/images/products/figure-2001.jpg",
    imageUrl: "/images/products/figure-2001.jpg",
    stock: 50,
    taxRate: 0.07,
    manufacturer: "Good Smile Company",
    series: "มหาเวทย์ผนึกมาร (Jujutsu Kaisen)",
    character: "Gojo Satoru",
    scale: "Non-scale",
    depositAmount: 500,
    status: "PREORDER_OPEN",
    aliases: ["2001", "fig-gojo", "gojo-nendoroid", "nendoroid-gojo"],
    boxDimensions: { widthCm: 14, lengthCm: 18, heightCm: 9 },
  },
  {
    id: "fig-sukuna-pup",
    slug: "pop-up-parade-sukuna",
    title: "Pop Up Parade Sukuna (มหาเวทย์ผนึกมาร)",
    category: "FIGURE",
    price: 1400,
    coverImage: "/images/products/figure-2002.jpg",
    imageUrl: "/images/products/figure-2002.jpg",
    stock: 35,
    taxRate: 0.07,
    manufacturer: "Good Smile Company",
    series: "มหาเวทย์ผนึกมาร (Jujutsu Kaisen)",
    character: "Ryomen Sukuna",
    scale: "Non-scale",
    depositAmount: 0,
    status: "IN_STOCK",
    aliases: ["2002", "fig-sukuna", "sukuna-pup", "pop-up-parade-sukuna"],
    boxDimensions: { widthCm: 15, lengthCm: 15, heightCm: 22 },
  },
  {
    id: "fig-frieren-nendoroid",
    slug: "nendoroid-frieren",
    title: "Nendoroid Frieren (คำอธิษฐานในวันที่จากลา)",
    category: "FIGURE",
    price: 1950,
    coverImage: "/images/products/figure-2003.jpg",
    imageUrl: "/images/products/figure-2003.jpg",
    stock: 25,
    taxRate: 0.07,
    manufacturer: "Good Smile Company",
    series: "คำอธิษฐานในวันที่จากลา (Frieren)",
    character: "Frieren",
    scale: "Non-scale",
    depositAmount: 500,
    status: "PREORDER_OPEN",
    aliases: ["2003", "frieren-nendoroid", "nendoroid-frieren"],
    boxDimensions: { widthCm: 14, lengthCm: 18, heightCm: 9 },
  },
  {
    id: "fig-tanjiro-nendoroid",
    slug: "nendoroid-tanjiro-kamado",
    title: "Nendoroid Tanjiro Kamado (ดาบพิฆาตอสูร)",
    category: "FIGURE",
    price: 1890,
    coverImage: "/images/products/figure-2004.jpg",
    imageUrl: "/images/products/figure-2004.jpg",
    stock: 15,
    taxRate: 0.07,
    manufacturer: "Good Smile Company",
    series: "ดาบพิฆาตอสูร (Demon Slayer)",
    character: "Tanjiro Kamado",
    scale: "Non-scale",
    depositAmount: 500,
    status: "IN_STOCK",
    aliases: ["2004", "nendoroid-tanjiro", "tanjiro-nendoroid"],
    boxDimensions: { widthCm: 14, lengthCm: 18, heightCm: 9 },
  },

  // ----------------------------------------------------
  // 4. PLAMO (Gunpla / Model Kits - VAT 7%)
  // ----------------------------------------------------
  {
    id: "gunpla-rx78-2",
    slug: "rg-rx78-2-ver2",
    title: "RG 1/144 RX-78-2 Gundam Ver.2.0",
    category: "PLAMO",
    price: 1350,
    coverImage: "/images/products/plamo-6001.jpg",
    imageUrl: "/images/products/plamo-6001.jpg",
    stock: 30,
    taxRate: 0.07,
    manufacturer: "Bandai Spirits",
    series: "Mobile Suit Gundam",
    grade: "RG 1/144",
    status: "IN_STOCK",
    aliases: ["6001", "gunpla-rx78-2", "rg-rx78-2"],
    boxDimensions: { widthCm: 31, lengthCm: 20, heightCm: 11 },
  },
  {
    id: "gunpla-hinu-rg",
    slug: "rg-hi-nu-gundam",
    title: "RG 1/144 Hi-Nu Gundam",
    category: "PLAMO",
    price: 1750,
    coverImage: "/images/products/plamo-6005.jpg",
    imageUrl: "/images/products/plamo-6005.jpg",
    stock: 22,
    taxRate: 0.07,
    manufacturer: "Bandai Spirits",
    series: "Mobile Suit Gundam: Char's Counterattack",
    grade: "RG 1/144",
    status: "IN_STOCK",
    aliases: ["6005", "plamo-hinu", "hi-nu-gundam", "rg-hi-nu-gundam"],
    boxDimensions: { widthCm: 39, lengthCm: 31, heightCm: 11 },
  },

  // ----------------------------------------------------
  // 5. GOODS (Official Goods - VAT 7%)
  // ----------------------------------------------------
  {
    id: "goods-gojo-acrylic",
    slug: "goods-7001",
    title: "อะคริลิกสแตนดี้ โกโจ & เกะโท (Jujutsu Kaisen)",
    category: "GOODS",
    price: 490,
    coverImage: "/images/products/goods-7001.jpg",
    imageUrl: "/images/products/goods-7001.jpg",
    stock: 60,
    taxRate: 0.07,
    manufacturer: "Movic",
    series: "มหาเวทย์ผนึกมาร (Jujutsu Kaisen)",
    status: "IN_STOCK",
    aliases: ["7001", "goods-7001", "goods-standee"],
    boxDimensions: { widthCm: 15, lengthCm: 20, heightCm: 2 },
  },
  {
    id: "goods-frieren-keychain",
    slug: "goods-7002",
    title: "พวงกุญแจอะคริลิก ฟรีเรน & เฟิร์น",
    category: "GOODS",
    price: 290,
    coverImage: "/images/products/goods-7002.jpg",
    imageUrl: "/images/products/goods-7002.jpg",
    stock: 80,
    taxRate: 0.07,
    manufacturer: "Ensky",
    series: "คำอธิษฐานในวันที่จากลา (Frieren)",
    status: "IN_STOCK",
    aliases: ["7002", "goods-7002"],
    boxDimensions: { widthCm: 10, lengthCm: 12, heightCm: 1 },
  },

  // ----------------------------------------------------
  // 6. ACCESSORY (Care & Protection - VAT 7%)
  // ----------------------------------------------------
  {
    id: "acc-manga-sleeve-100",
    slug: "acc-8001",
    title: "ซองใสพรีเมียมถนอมหนังสือมังงะ (Pack 100 แผ่น)",
    category: "ACCESSORY",
    price: 120,
    coverImage: "/images/products/acc-8001.jpg",
    imageUrl: "/images/products/acc-8001.jpg",
    stock: 200,
    taxRate: 0.07,
    manufacturer: "Chansasom Protect",
    status: "IN_STOCK",
    aliases: ["8001", "acc-8001"],
    boxDimensions: { widthCm: 15, lengthCm: 22, heightCm: 3 },
  },
  {
    id: "acc-uv-case",
    slug: "acc-8002",
    title: "กล่องอะคริลิกโชว์ฟิกเกอร์เกรดพรีเมียมกันฝุ่น UV",
    category: "ACCESSORY",
    price: 650,
    coverImage: "/images/products/acc-8002.jpg",
    imageUrl: "/images/products/acc-8002.jpg",
    stock: 50,
    taxRate: 0.07,
    manufacturer: "ModuCase",
    status: "IN_STOCK",
    aliases: ["8002", "acc-8002"],
    boxDimensions: { widthCm: 20, lengthCm: 20, heightCm: 30 },
  },
];

/**
 * Builds standard CatalogData combining existing raw collections with Master definitions.
 */
export function getMasterCatalog(): CatalogData {
  return buildCatalogData();
}

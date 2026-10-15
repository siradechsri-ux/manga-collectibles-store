"use client";

import { z } from "zod";
import type {
  CatalogData,
  CatalogFigure,
  CatalogMangaSeries,
  CatalogVolume,
} from "../lib/catalog-client";
import type { MockCatalogVariant, ProductType } from "./products.mock";
import {
  BOOK_COVER_ADDON_UNIT_PRICE,
  BOOK_COVER_ADDON_VARIANT_ID,
  getMockCatalog,
} from "./products.mock";
import {
  findRewardCheckoutVariant,
  getRewardNumericId,
  listRewards,
} from "./rewards.mock";

const dimensionsSchema = z
  .object({
    widthCm: z.number().positive(),
    lengthCm: z.number().positive(),
    heightCm: z.number().positive(),
  })
  .strict();

const mangaProductSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal("MANGA"),
    seriesId: z.string().min(1),
    title: z.string().min(1),
    publisher: z.string().min(1),
    volumeNumber: z.number().int().positive(),
    isbn: z.string().optional().default(""),
    synopsis: z.string().optional().default(""),
    coverStyle: z.enum(["STANDARD", "LIMITED_SET"]).default("STANDARD"),
    variantLabel: z.string().optional(),
    price: z.number().positive(),
    stock: z.number().int().nonnegative(),
    status: z.enum(["IN_STOCK", "PREORDER", "OUT_OF_STOCK"]),
    preorderDeadline: z.string().optional().default(""),
    expectedShippingDate: z.string().optional().default(""),
    weightGrams: z.number().int().nonnegative(),
    images: z.array(z.string()),
    coverImage: z.string().nullable().optional(),
    imageUrl: z.string().nullable().optional(),
    coverUrl: z.string().nullable().optional(),
  })
  .strict();

const lightNovelProductSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal("LIGHT_NOVEL"),
    seriesId: z.string().min(1),
    title: z.string().min(1),
    publisher: z.string().min(1),
    volumeNumber: z.number().int().positive(),
    isbn: z.string().optional().default(""),
    synopsis: z.string().optional().default(""),
    format: z.enum(["REGULAR", "SPECIAL_SET"]).default("REGULAR"),
    variantLabel: z.string().optional(),
    price: z.number().positive(),
    stock: z.number().int().nonnegative(),
    status: z.enum(["IN_STOCK", "PREORDER", "OUT_OF_STOCK"]),
    preorderDeadline: z.string().optional().default(""),
    expectedShippingDate: z.string().optional().default(""),
    weightGrams: z.number().int().nonnegative(),
    images: z.array(z.string()),
    coverImage: z.string().nullable().optional(),
    imageUrl: z.string().nullable().optional(),
    coverUrl: z.string().nullable().optional(),
  })
  .strict();

const figureProductSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal("FIGURE"),
    slug: z.string().min(1),
    name: z.string().min(1),
    series: z.string(),
    character: z.string(),
    manufacturer: z.string().min(1),
    scale: z.string().min(1),
    description: z.string().optional().default(""),
    fullPrice: z.number().positive(),
    depositAmount: z.number().nonnegative(),
    preorderDeadline: z.string().optional().default(""),
    releaseMonthYear: z.string().optional().default(""),
    status: z.enum(["PREORDER_OPEN", "PREORDER_CLOSED", "IN_STOCK"]),
    stockOrQuotaRemaining: z.number().int().nonnegative(),
    boxDimensions: dimensionsSchema,
    weightGrams: z.number().int().nonnegative().optional().default(500),
    heightMm: z.number().int().nonnegative().optional().default(100),
    janCode: z.string().optional().default(""),
    images: z.array(z.string()),
    coverImage: z.string().nullable().optional(),
    imageUrl: z.string().nullable().optional(),
    coverUrl: z.string().nullable().optional(),
  })
  .strict();

const plamoProductSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal("PLAMO"),
    slug: z.string().min(1),
    name: z.string().min(1),
    series: z.string(),
    manufacturer: z.string().min(1),
    grade: z.string().min(1),
    description: z.string().optional().default(""),
    fullPrice: z.number().positive(),
    depositAmount: z.number().nonnegative(),
    preorderDeadline: z.string().optional().default(""),
    releaseMonthYear: z.string().optional().default(""),
    status: z.enum(["PREORDER_OPEN", "PREORDER_CLOSED", "IN_STOCK"]),
    stockOrQuotaRemaining: z.number().int().nonnegative(),
    boxDimensions: dimensionsSchema,
    weightGrams: z.number().int().nonnegative().optional().default(500),
    janCode: z.string().optional().default(""),
    images: z.array(z.string()),
    coverImage: z.string().nullable().optional(),
    imageUrl: z.string().nullable().optional(),
    coverUrl: z.string().nullable().optional(),
  })
  .strict();

const goodsProductSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal("GOODS"),
    slug: z.string().min(1),
    name: z.string().min(1),
    series: z.string(),
    subcategory: z.enum(["STANDY", "BADGE", "KEYCHAIN", "SHIKISHI", "OTHER"]).or(z.string()).default("OTHER"),
    description: z.string().optional().default(""),
    price: z.number().positive(),
    fullPrice: z.number().positive().optional(),
    stock: z.number().int().nonnegative(),
    status: z.enum(["IN_STOCK", "OUT_OF_STOCK"]),
    weightGrams: z.number().int().nonnegative(),
    images: z.array(z.string()),
    coverImage: z.string().nullable().optional(),
    imageUrl: z.string().nullable().optional(),
    coverUrl: z.string().nullable().optional(),
  })
  .strict();

const accessoryProductSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal("ACCESSORY"),
    slug: z.string().min(1),
    name: z.string().min(1),
    series: z.string(),
    subcategory: z.enum(["BOOK_COVER", "DISPLAY_BOX", "CARE_TOOL", "OTHER"]).or(z.string()).default("OTHER"),
    description: z.string().optional().default(""),
    price: z.number().positive(),
    fullPrice: z.number().positive().optional(),
    stock: z.number().int().nonnegative(),
    status: z.enum(["IN_STOCK", "OUT_OF_STOCK"]),
    weightGrams: z.number().int().nonnegative(),
    boxDimensions: dimensionsSchema.optional(),
    images: z.array(z.string()),
    coverImage: z.string().nullable().optional(),
    imageUrl: z.string().nullable().optional(),
    coverUrl: z.string().nullable().optional(),
  })
  .strict();

const adminProductSchema = z.discriminatedUnion("type", [
  mangaProductSchema,
  lightNovelProductSchema,
  figureProductSchema,
  plamoProductSchema,
  goodsProductSchema,
  accessoryProductSchema,
]);
const adminProductsSchema = z.array(adminProductSchema);

export type MangaProduct = z.infer<typeof mangaProductSchema>;
export type LightNovelProduct = z.infer<typeof lightNovelProductSchema>;
export type FigureProduct = z.infer<typeof figureProductSchema>;
export type PlamoProduct = z.infer<typeof plamoProductSchema>;
export type GoodsProduct = z.infer<typeof goodsProductSchema>;
export type AccessoryProduct = z.infer<typeof accessoryProductSchema>;
export type AdminProduct = z.infer<typeof adminProductSchema>;

export type AdminProductInput =
  | Omit<MangaProduct, "id">
  | Omit<LightNovelProduct, "id">
  | Omit<FigureProduct, "id">
  | Omit<PlamoProduct, "id">
  | Omit<GoodsProduct, "id">
  | Omit<AccessoryProduct, "id">;

export type ProductCategoryFilter =
  | "ALL"
  | "MANGA"
  | "LIGHT_NOVEL"
  | "FIGURE"
  | "PLAMO"
  | "GOODS"
  | "ACCESSORY";

export type ProductStatusFilter = "ALL" | "IN_STOCK" | "PREORDER" | "OUT_OF_STOCK";

export const MOCK_VERSION = "v9_100pct_accurate_images_verified";
export const MOCK_DATA_VERSION_KEY = "MOCK_DATA_VERSION";
export const STORAGE_VERSION = MOCK_VERSION;
export const STORAGE_VERSION_KEY = MOCK_DATA_VERSION_KEY;
export const ADMIN_PRODUCTS_STORAGE_KEY = "mock_products";
export const ADMIN_PRODUCTS_UPDATED_EVENT = "mock-products-updated";

export interface CheckoutInventorySnapshotItem {
  productVariantId: number;
  productType: ProductType;
  title: string;
  volumeNumber?: number;
  variantLabel?: string;
  price: number;
  weightGrams: number;
  isPreorder: boolean;
  stockOrQuotaRemaining: number;
  figure?: {
    fullPrice: number;
    depositAmount: number;
    boxDimensions: FigureProduct["boxDimensions"];
  };
}

function toIsoOrEmpty(value: string): string {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

function numericEntityId(slug: string, prefixSeed: number = 0): string {
  let hash = 2_166_136_261 ^ prefixSeed;
  for (const character of slug) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16_777_619);
  }
  return String((hash >>> 0) || 1);
}

function createInitialProducts(): AdminProduct[] {
  const catalog = getMockCatalog();
  const products: AdminProduct[] = [];

  // 1. MANGA
  for (const series of catalog.mangaSeries) {
    for (const volume of series.volumes) {
      products.push({
        id: `manga-${volume.id}`,
        type: "MANGA",
        seriesId: series.id,
        title: series.title,
        publisher: series.publisher,
        volumeNumber: volume.volumeNumber,
        isbn: volume.isbn ?? "",
        synopsis: "",
        coverStyle:
          volume.variantLabel?.toLowerCase().includes("limited") ||
          volume.variantLabel?.includes("พิเศษ")
            ? "LIMITED_SET"
            : "STANDARD",
        ...(volume.variantLabel ? { variantLabel: volume.variantLabel } : {}),
        price: volume.price,
        stock: volume.stock,
        status: volume.status,
        preorderDeadline: "",
        expectedShippingDate: volume.expectedShippingDate ?? "",
        weightGrams:
          volume.variantLabel === "Limited Set" || volume.variantLabel === "ฉบับพิเศษ"
            ? 450
            : 250,
        images: volume.coverUrl ? [volume.coverUrl] : (volume.images ?? []),
      });
    }
  }

  // 2. LIGHT NOVEL
  for (const series of catalog.lightNovelSeries) {
    for (const volume of series.volumes) {
      products.push({
        id: `lightnovel-${volume.id}`,
        type: "LIGHT_NOVEL",
        seriesId: series.id,
        title: series.title,
        publisher: series.publisher,
        volumeNumber: volume.volumeNumber,
        isbn: volume.isbn ?? "",
        synopsis: "",
        format:
          volume.variantLabel?.toLowerCase().includes("special") ||
          volume.variantLabel?.includes("พิเศษ")
            ? "SPECIAL_SET"
            : "REGULAR",
        ...(volume.variantLabel ? { variantLabel: volume.variantLabel } : {}),
        price: volume.price,
        stock: volume.stock,
        status: volume.status,
        preorderDeadline: "",
        expectedShippingDate: volume.expectedShippingDate ?? "",
        weightGrams: volume.variantLabel?.includes("Special") ? 420 : 280,
        images: volume.coverUrl ? [volume.coverUrl] : (volume.images ?? []),
      });
    }
  }

  // 3. FIGURE
  for (const figure of catalog.figures) {
    products.push({
      id: `figure-${figure.slug}`,
      type: "FIGURE",
      slug: figure.slug,
      name: figure.name,
      series: figure.series,
      character: figure.character,
      manufacturer: figure.manufacturer,
      scale: figure.scale,
      description: "",
      fullPrice: figure.fullPrice,
      depositAmount: figure.depositAmount,
      preorderDeadline: figure.preorderDeadline,
      releaseMonthYear: figure.releaseMonthYear,
      status: figure.status,
      stockOrQuotaRemaining: figure.stockOrQuotaRemaining,
      boxDimensions: { ...figure.boxDimensions },
      weightGrams: 500,
      heightMm: figure.heightMm,
      janCode: figure.janCode,
      images: [...figure.images],
    });
  }

  // 4. PLAMO
  for (const item of catalog.plamo) {
    products.push({
      id: `plamo-${item.slug}`,
      type: "PLAMO",
      slug: item.slug,
      name: item.name,
      series: item.series,
      manufacturer: item.manufacturer,
      grade: item.grade ?? item.scale,
      description: "",
      fullPrice: item.fullPrice,
      depositAmount: item.depositAmount,
      preorderDeadline: item.preorderDeadline,
      releaseMonthYear: item.releaseMonthYear,
      status: item.status,
      stockOrQuotaRemaining: item.stockOrQuotaRemaining,
      boxDimensions: { ...item.boxDimensions },
      weightGrams: item.scale.includes("1/100") ? 850 : 450,
      janCode: item.janCode,
      images: [...item.images],
    });
  }

  // 5. GOODS
  for (const item of catalog.goods) {
    products.push({
      id: `goods-${item.slug}`,
      type: "GOODS",
      slug: item.slug,
      name: item.name,
      series: item.series,
      subcategory: (item.subcategory as GoodsProduct["subcategory"]) ?? "OTHER",
      description: "",
      price: item.fullPrice,
      stock: item.stockOrQuotaRemaining,
      status: item.stockOrQuotaRemaining > 0 ? "IN_STOCK" : "OUT_OF_STOCK",
      weightGrams: item.subcategory === "BADGE" ? 45 : 100,
      images: [...item.images],
    });
  }

  // 6. ACCESSORIES
  for (const item of catalog.accessories) {
    products.push({
      id: `accessory-${item.slug}`,
      type: "ACCESSORY",
      slug: item.slug,
      name: item.name,
      series: item.series,
      subcategory:
        item.subcategory === "BOOK_COVER"
          ? "BOOK_COVER"
          : item.subcategory === "DISPLAY_BOX"
            ? "DISPLAY_BOX"
            : item.subcategory === "CARE_TOOL"
              ? "CARE_TOOL"
              : "OTHER",
      description: "",
      price: item.fullPrice,
      stock: item.stockOrQuotaRemaining,
      status: item.stockOrQuotaRemaining > 0 ? "IN_STOCK" : "OUT_OF_STOCK",
      weightGrams: item.subcategory === "DISPLAY_BOX" ? 400 : 80,
      boxDimensions: { ...item.boxDimensions },
      images: [...item.images],
      coverImage: item.coverImage ?? item.images[0] ?? null,
      imageUrl: item.coverUrl ?? item.images[0] ?? null,
    });
  }

  return products;
}

function readProducts(): AdminProduct[] {
  if (typeof window === "undefined") return createInitialProducts();
  try {
    const currentVersion = window.localStorage.getItem(MOCK_DATA_VERSION_KEY);
    if (currentVersion !== MOCK_VERSION) {
      window.localStorage.removeItem(ADMIN_PRODUCTS_STORAGE_KEY);
      window.localStorage.setItem(MOCK_DATA_VERSION_KEY, MOCK_VERSION);
      const initialProducts = adminProductsSchema.parse(createInitialProducts());
      window.localStorage.setItem(
        ADMIN_PRODUCTS_STORAGE_KEY,
        JSON.stringify(initialProducts),
      );
      return initialProducts;
    }

    const stored = window.localStorage.getItem(ADMIN_PRODUCTS_STORAGE_KEY);
    if (stored === null) {
      const initialProducts = adminProductsSchema.parse(createInitialProducts());
      window.localStorage.setItem(
        ADMIN_PRODUCTS_STORAGE_KEY,
        JSON.stringify(initialProducts),
      );
      return initialProducts;
    }
    const parsed: unknown = JSON.parse(stored);
    const validated = adminProductsSchema.parse(parsed);
    const initial = createInitialProducts();
    const initialMap = new Map(initial.map((item) => [item.id, item]));
    let hadMissingImages = false;
    const migrated = validated.map((product) => {
      const seedProduct = initialMap.get(product.id);
      if (product.images.length === 0) {
        if (seedProduct && seedProduct.images.length > 0) {
          hadMissingImages = true;
          return { ...product, images: [...seedProduct.images] };
        }
      }
      if (seedProduct && seedProduct.images.length > 0) {
        const hasOutdatedImage = product.images.some(
          (img) =>
            img.includes("1532012164546") ||
            img.includes("Konosuba_Volume_2_Cover.jpg") ||
            img.includes("Konosuba_Volume_3_Cover.jpg") ||
            img.includes("Konosuba_Volume_17_Cover.jpg") ||
            img.includes("LN_Vol_02_cover.jpg") ||
            img.includes("LN_2nd_Year_Vol") ||
            img.includes("Light_Novel_Volume_19_JP") ||
            img.includes("Light_Novel_Volume_20_JP"),
        );
        if (hasOutdatedImage) {
          hadMissingImages = true;
          return { ...product, images: [...seedProduct.images] };
        }
      }
      return product;
    });
    const existingIds = new Set(validated.map((product) => product.id));
    const missingSeedProducts = initial.filter((product) => !existingIds.has(product.id));
    if (missingSeedProducts.length > 0) {
      hadMissingImages = true;
      migrated.push(...missingSeedProducts);
    }
    if (hadMissingImages) {
      window.localStorage.setItem(
        ADMIN_PRODUCTS_STORAGE_KEY,
        JSON.stringify(migrated),
      );
      return migrated;
    }
    return validated;
  } catch (error) {
    console.error("Could not read mock product inventory.", error);
    const fallback = createInitialProducts();
    try {
      window.localStorage.setItem(ADMIN_PRODUCTS_STORAGE_KEY, JSON.stringify(fallback));
    } catch {
      // ignore
    }
    return fallback;
  }
}

function writeProducts(products: AdminProduct[]): void {
  const validated = adminProductsSchema.parse(products);
  try {
    window.localStorage.setItem(
      ADMIN_PRODUCTS_STORAGE_KEY,
      JSON.stringify(validated),
    );
    window.dispatchEvent(new CustomEvent(ADMIN_PRODUCTS_UPDATED_EVENT));
  } catch (error) {
    console.error("Could not save mock product inventory.", error);
    throw new Error("บันทึกข้อมูลสินค้าไม่สำเร็จ", { cause: error });
  }
}

function nextCatalogVariantId(products: AdminProduct[]): number {
  const maxMangaId = products.reduce((maximum, product) => {
    if (product.type === "MANGA") {
      return Math.max(maximum, Number(product.id.replace(/^manga-/, "")) || 0);
    }
    if (product.type === "LIGHT_NOVEL") {
      return Math.max(maximum, Number(product.id.replace(/^lightnovel-/, "")) || 0);
    }
    return maximum;
  }, 0);
  return Math.max(maxMangaId + 1, 50_000);
}

function productToCatalog(products: AdminProduct[]): CatalogData {
  const mangaSeriesMap = new Map<string, CatalogMangaSeries>();
  const lightNovelSeriesMap = new Map<string, CatalogMangaSeries>();
  const figures: CatalogFigure[] = [];
  const plamo: CatalogFigure[] = [];
  const goods: CatalogFigure[] = [];
  const accessories: CatalogFigure[] = [];

  for (const product of products) {
    if (product.type === "MANGA") {
      const volumeId = Number(product.id.replace(/^manga-/, ""));
      const coverUrl = product.images[0] ?? "";
      const volume: CatalogVolume = {
        id: Number.isSafeInteger(volumeId) && volumeId > 0 ? volumeId : 50_000,
        volumeNumber: product.volumeNumber,
        title: `${product.title} เล่ม ${product.volumeNumber}${product.variantLabel ? ` (${product.variantLabel})` : ""}`,
        ...(product.variantLabel ? { variantLabel: product.variantLabel } : {}),
        isbn: product.isbn,
        price: product.price,
        stock: product.stock,
        weightGrams: product.weightGrams,
        status: product.status,
        coverUrl,
        images: [...product.images],
        ...(product.expectedShippingDate
          ? { expectedShippingDate: toIsoOrEmpty(product.expectedShippingDate) }
          : {}),
      };
      const series = mangaSeriesMap.get(product.seriesId);
      if (series) {
        series.volumes.push(volume);
        if (!series.coverImage && coverUrl) {
          series.coverImage = coverUrl;
          series.coverUrl = coverUrl;
        }
      } else {
        mangaSeriesMap.set(product.seriesId, {
          id: product.seriesId,
          title: product.title,
          publisher: product.publisher,
          category: "MANGA",
          coverImage: coverUrl,
          coverUrl,
          images: coverUrl ? [coverUrl] : [],
          volumes: [volume],
        });
      }
      continue;
    }

    if (product.type === "LIGHT_NOVEL") {
      const volumeId = Number(product.id.replace(/^lightnovel-/, ""));
      const coverUrl = product.images[0] ?? "";
      const volume: CatalogVolume = {
        id: Number.isSafeInteger(volumeId) && volumeId > 0 ? volumeId : 50_000,
        volumeNumber: product.volumeNumber,
        title: `${product.title} เล่ม ${product.volumeNumber}${product.variantLabel ? ` (${product.variantLabel})` : ""}`,
        ...(product.variantLabel ? { variantLabel: product.variantLabel } : {}),
        isbn: product.isbn,
        price: product.price,
        stock: product.stock,
        weightGrams: product.weightGrams,
        status: product.status,
        coverUrl,
        images: [...product.images],
        ...(product.expectedShippingDate
          ? { expectedShippingDate: toIsoOrEmpty(product.expectedShippingDate) }
          : {}),
      };
      const series = lightNovelSeriesMap.get(product.seriesId);
      if (series) {
        series.volumes.push(volume);
        if (!series.coverImage && coverUrl) {
          series.coverImage = coverUrl;
          series.coverUrl = coverUrl;
        }
      } else {
        lightNovelSeriesMap.set(product.seriesId, {
          id: product.seriesId,
          title: product.title,
          publisher: product.publisher,
          category: "LIGHT_NOVEL",
          coverImage: coverUrl,
          coverUrl,
          images: coverUrl ? [coverUrl] : [],
          volumes: [volume],
        });
      }
      continue;
    }

    if (product.type === "FIGURE") {
      figures.push({
        id: numericEntityId(product.slug, 1),
        slug: product.slug,
        name: product.name,
        series: product.series,
        character: product.character,
        manufacturer: product.manufacturer,
        scale: product.scale,
        heightMm: product.heightMm,
        janCode: product.janCode,
        images: [...product.images],
        fullPrice: product.fullPrice,
        depositAmount: product.depositAmount,
        preorderDeadline: product.preorderDeadline ? toIsoOrEmpty(product.preorderDeadline) : "",
        releaseMonthYear: product.releaseMonthYear,
        status: product.status,
        stockOrQuotaRemaining: product.stockOrQuotaRemaining,
        boxDimensions: { ...product.boxDimensions },
        category: "FIGURE",
      });
      continue;
    }

    if (product.type === "PLAMO") {
      plamo.push({
        id: numericEntityId(product.slug, 2),
        slug: product.slug,
        name: product.name,
        series: product.series,
        character: product.name,
        manufacturer: product.manufacturer,
        scale: product.grade,
        heightMm: 150,
        janCode: product.janCode,
        images: [...product.images],
        fullPrice: product.fullPrice,
        depositAmount: product.depositAmount,
        preorderDeadline: product.preorderDeadline ? toIsoOrEmpty(product.preorderDeadline) : "",
        releaseMonthYear: product.releaseMonthYear,
        status: product.status,
        stockOrQuotaRemaining: product.stockOrQuotaRemaining,
        boxDimensions: { ...product.boxDimensions },
        category: "PLAMO",
        grade: product.grade,
      });
      continue;
    }

    if (product.type === "GOODS") {
      goods.push({
        id: numericEntityId(product.slug, 3),
        slug: product.slug,
        name: product.name,
        series: product.series,
        character: product.name,
        manufacturer: "Official Merchandise",
        scale: product.subcategory,
        heightMm: 100,
        janCode: "",
        images: [...product.images],
        fullPrice: product.price,
        depositAmount: 0,
        preorderDeadline: "",
        releaseMonthYear: "",
        status: product.stock > 0 ? "IN_STOCK" : "PREORDER_CLOSED",
        stockOrQuotaRemaining: product.stock,
        boxDimensions: { widthCm: 15, lengthCm: 20, heightCm: 2 },
        category: "GOODS",
        subcategory: product.subcategory,
      });
      continue;
    }

    if (product.type === "ACCESSORY") {
      accessories.push({
        id: numericEntityId(product.slug, 4),
        slug: product.slug,
        name: product.name,
        series: product.series,
        character: "อุปกรณ์ดูแลของสะสม",
        manufacturer: "Protection Master",
        scale: product.subcategory,
        heightMm: 100,
        janCode: "",
        images: [...product.images],
        fullPrice: product.price,
        depositAmount: 0,
        preorderDeadline: "",
        releaseMonthYear: "",
        status: product.stock > 0 ? "IN_STOCK" : "PREORDER_CLOSED",
        stockOrQuotaRemaining: product.stock,
        boxDimensions: product.boxDimensions ?? { widthCm: 15, lengthCm: 20, heightCm: 2 },
        category: "ACCESSORY",
        subcategory: product.subcategory,
      });
    }
  }

  return {
    mangaSeries: [...mangaSeriesMap.values()],
    lightNovelSeries: [...lightNovelSeriesMap.values()],
    figures,
    plamo,
    goods,
    accessories,
  };
}

export function listAdminProducts(): AdminProduct[] {
  return readProducts();
}

export function getAdminProduct(id: string): AdminProduct | null {
  return readProducts().find((product) => product.id === id) ?? null;
}

export function saveAdminProduct(
  input: AdminProductInput,
  id?: string,
): AdminProduct {
  const products = readProducts();
  const existingIndex = id
    ? products.findIndex((product) => product.id === id)
    : -1;
  if (id && existingIndex < 0) {
    throw new Error("ไม่พบสินค้าที่ต้องการแก้ไข");
  }

  let saved: AdminProduct;
  if (input.type === "MANGA") {
    const productId = id ?? `manga-${nextCatalogVariantId(products)}`;
    saved = mangaProductSchema.parse({ ...input, id: productId });
  } else if (input.type === "LIGHT_NOVEL") {
    const productId = id ?? `lightnovel-${nextCatalogVariantId(products)}`;
    saved = lightNovelProductSchema.parse({ ...input, id: productId });
  } else if (input.type === "FIGURE") {
    const slug = input.slug.trim().toLowerCase();
    saved = figureProductSchema.parse({
      ...input,
      id: id ?? `figure-${slug}`,
      slug,
    });
  } else if (input.type === "PLAMO") {
    const slug = input.slug.trim().toLowerCase();
    saved = plamoProductSchema.parse({
      ...input,
      id: id ?? `plamo-${slug}`,
      slug,
    });
  } else if (input.type === "GOODS") {
    const slug = input.slug.trim().toLowerCase();
    saved = goodsProductSchema.parse({
      ...input,
      id: id ?? `goods-${slug}`,
      slug,
    });
  } else {
    const slug = input.slug.trim().toLowerCase();
    saved = accessoryProductSchema.parse({
      ...input,
      id: id ?? `accessory-${slug}`,
      slug,
    });
  }

  if (existingIndex >= 0) {
    products[existingIndex] = saved;
  } else {
    products.push(saved);
  }
  writeProducts(products);
  return saved;
}

export function deleteAdminProduct(id: string): void {
  const products = readProducts();
  const nextProducts = products.filter((product) => product.id !== id);
  if (nextProducts.length === products.length) {
    throw new Error("ไม่พบสินค้าที่ต้องการลบ");
  }
  writeProducts(nextProducts);
}

export function adjustAdminProductStock(
  id: string,
  direction: "ADD" | "REMOVE",
  quantity: number,
): AdminProduct {
  const validQuantity = z.number().int().positive().safeParse(quantity);
  if (!validQuantity.success) {
    throw new Error("จำนวนสต็อกต้องเป็นจำนวนเต็มที่มากกว่า 0");
  }
  const products = readProducts();
  const index = products.findIndex((product) => product.id === id);
  if (index < 0) throw new Error("ไม่พบสินค้าที่ต้องการปรับสต็อก");
  const product = products[index];
  if (!product) throw new Error("ไม่พบข้อมูลสินค้า");

  const currentStock =
    product.type === "MANGA" || product.type === "LIGHT_NOVEL" || product.type === "GOODS" || product.type === "ACCESSORY"
      ? product.stock
      : product.stockOrQuotaRemaining;

  if (direction === "REMOVE" && quantity > currentStock) {
    throw new Error("จำนวนที่ตัดสต็อกต้องไม่มากกว่าสต็อกคงเหลือ");
  }
  const nextStock = currentStock + (direction === "ADD" ? quantity : -quantity);

  let updated: AdminProduct;
  if (product.type === "MANGA" || product.type === "LIGHT_NOVEL") {
    updated = {
      ...product,
      stock: nextStock,
      status:
        product.status === "PREORDER"
          ? "PREORDER"
          : nextStock === 0
            ? "OUT_OF_STOCK"
            : "IN_STOCK",
    };
  } else if (product.type === "GOODS" || product.type === "ACCESSORY") {
    updated = {
      ...product,
      stock: nextStock,
      status: nextStock === 0 ? "OUT_OF_STOCK" : "IN_STOCK",
    };
  } else {
    updated = {
      ...product,
      stockOrQuotaRemaining: nextStock,
      status:
        product.status === "PREORDER_OPEN" || product.status === "PREORDER_CLOSED"
          ? product.status
          : nextStock === 0
            ? "PREORDER_CLOSED"
            : "IN_STOCK",
    };
  }

  products[index] = updated;
  writeProducts(products);
  return updated;
}

export function getAdminProductsCatalog(): CatalogData {
  return productToCatalog(readProducts());
}

export function getCheckoutInventorySnapshot(): CheckoutInventorySnapshotItem[] {
  const snapshots: CheckoutInventorySnapshotItem[] = [
    {
      productVariantId: BOOK_COVER_ADDON_VARIANT_ID,
      productType: "ACCESSORY",
      title: "ปกพลาสติกสำเร็จรูปถนอมหนังสือ",
      price: BOOK_COVER_ADDON_UNIT_PRICE,
      weightGrams: 5,
      isPreorder: false,
      stockOrQuotaRemaining: 99_999,
    },
  ];

  for (const product of readProducts()) {
    if (product.type === "MANGA") {
      const productVariantId = Number(product.id.replace(/^manga-/, ""));
      if (Number.isSafeInteger(productVariantId) && productVariantId > 0) {
        snapshots.push({
          productVariantId,
          productType: "MANGA",
          title: product.title,
          volumeNumber: product.volumeNumber,
          ...(product.variantLabel ? { variantLabel: product.variantLabel } : {}),
          price: product.price,
          weightGrams: product.weightGrams,
          isPreorder: product.status === "PREORDER",
          stockOrQuotaRemaining: product.stock,
        });
      }
      continue;
    }

    if (product.type === "LIGHT_NOVEL") {
      const productVariantId = Number(product.id.replace(/^lightnovel-/, ""));
      if (Number.isSafeInteger(productVariantId) && productVariantId > 0) {
        snapshots.push({
          productVariantId,
          productType: "LIGHT_NOVEL",
          title: product.title,
          volumeNumber: product.volumeNumber,
          ...(product.variantLabel ? { variantLabel: product.variantLabel } : {}),
          price: product.price,
          weightGrams: product.weightGrams,
          isPreorder: product.status === "PREORDER",
          stockOrQuotaRemaining: product.stock,
        });
      }
      continue;
    }

    if (product.type === "FIGURE") {
      snapshots.push({
        productVariantId: Number(numericEntityId(product.slug, 1)),
        productType: "FIGURE",
        title: product.name,
        price: product.fullPrice,
        weightGrams: product.weightGrams,
        isPreorder: product.status === "PREORDER_OPEN",
        stockOrQuotaRemaining: product.stockOrQuotaRemaining,
        figure: {
          fullPrice: product.fullPrice,
          depositAmount: product.depositAmount,
          boxDimensions: { ...product.boxDimensions },
        },
      });
      continue;
    }

    if (product.type === "PLAMO") {
      snapshots.push({
        productVariantId: Number(numericEntityId(product.slug, 2)),
        productType: "PLAMO",
        title: product.name,
        price: product.fullPrice,
        weightGrams: product.weightGrams,
        isPreorder: product.status === "PREORDER_OPEN",
        stockOrQuotaRemaining: product.stockOrQuotaRemaining,
        figure: {
          fullPrice: product.fullPrice,
          depositAmount: product.depositAmount,
          boxDimensions: { ...product.boxDimensions },
        },
      });
      continue;
    }

    if (product.type === "GOODS") {
      snapshots.push({
        productVariantId: Number(numericEntityId(product.slug, 3)),
        productType: "GOODS",
        title: product.name,
        price: product.price,
        weightGrams: product.weightGrams,
        isPreorder: false,
        stockOrQuotaRemaining: product.stock,
      });
      continue;
    }

    if (product.type === "ACCESSORY") {
      snapshots.push({
        productVariantId: Number(numericEntityId(product.slug, 4)),
        productType: "ACCESSORY",
        title: product.name,
        price: product.price,
        weightGrams: product.weightGrams,
        isPreorder: false,
        stockOrQuotaRemaining: product.stock,
        ...(product.boxDimensions
          ? {
              figure: {
                fullPrice: product.price,
                depositAmount: 0,
                boxDimensions: { ...product.boxDimensions },
              },
            }
          : {}),
      });
    }
  }

  for (const reward of listRewards()) {
    snapshots.push({
      productVariantId: getRewardNumericId(reward.id),
      productType: "GOODS",
      title: `[รางวัลสะสมแต้ม] ${reward.title}`,
      price: 0,
      weightGrams: 50,
      isPreorder: false,
      stockOrQuotaRemaining: reward.stock,
    });
  }

  return snapshots;
}

export function deductAdminProductInventory(
  items: readonly { productVariantId: number; quantity: number }[],
): void {
  const products = readProducts();
  const nextProducts = products.map((product) => {
    let matchingQuantity = 0;
    for (const item of items) {
      if (item.productVariantId === BOOK_COVER_ADDON_VARIANT_ID) continue;
      if (product.type === "MANGA" && Number(product.id.replace(/^manga-/, "")) === item.productVariantId) {
        matchingQuantity += item.quantity;
      } else if (product.type === "LIGHT_NOVEL" && Number(product.id.replace(/^lightnovel-/, "")) === item.productVariantId) {
        matchingQuantity += item.quantity;
      } else if (product.type === "FIGURE" && Number(numericEntityId(product.slug, 1)) === item.productVariantId) {
        matchingQuantity += item.quantity;
      } else if (product.type === "PLAMO" && Number(numericEntityId(product.slug, 2)) === item.productVariantId) {
        matchingQuantity += item.quantity;
      } else if (product.type === "GOODS" && Number(numericEntityId(product.slug, 3)) === item.productVariantId) {
        matchingQuantity += item.quantity;
      } else if (product.type === "ACCESSORY" && Number(numericEntityId(product.slug, 4)) === item.productVariantId) {
        matchingQuantity += item.quantity;
      }
    }
    if (matchingQuantity === 0) return product;

    const currentStock =
      product.type === "MANGA" || product.type === "LIGHT_NOVEL" || product.type === "GOODS" || product.type === "ACCESSORY"
        ? product.stock
        : product.stockOrQuotaRemaining;

    if (currentStock < matchingQuantity) {
      const name = "title" in product ? product.title : product.name;
      throw new Error(`สต็อกสินค้า ${name} ไม่เพียงพอ`);
    }

    const nextStock = currentStock - matchingQuantity;
    if (product.type === "MANGA" || product.type === "LIGHT_NOVEL") {
      return {
        ...product,
        stock: nextStock,
        status: nextStock === 0 ? ("OUT_OF_STOCK" as const) : product.status,
      };
    }
    if (product.type === "GOODS" || product.type === "ACCESSORY") {
      return {
        ...product,
        stock: nextStock,
        status: nextStock === 0 ? ("OUT_OF_STOCK" as const) : ("IN_STOCK" as const),
      };
    }
    return {
      ...product,
      stockOrQuotaRemaining: nextStock,
      status:
        nextStock === 0 && product.status === "PREORDER_OPEN"
          ? ("PREORDER_CLOSED" as const)
          : product.status,
    };
  });

  if (nextProducts.some((product, index) => product !== products[index])) {
    writeProducts(nextProducts);
  }
}

export function restoreAdminProductInventory(
  items: readonly {
    productVariantId: number;
    quantity: number;
    isPreorder: boolean;
  }[],
): void {
  const products = readProducts();
  const nextProducts = products.map((product) => {
    let matchingQuantity = 0;
    let restoredAsPreorder = false;
    for (const item of items) {
      if (item.productVariantId === BOOK_COVER_ADDON_VARIANT_ID) continue;
      let matched = false;
      if (product.type === "MANGA" && Number(product.id.replace(/^manga-/, "")) === item.productVariantId) {
        matched = true;
      } else if (product.type === "LIGHT_NOVEL" && Number(product.id.replace(/^lightnovel-/, "")) === item.productVariantId) {
        matched = true;
      } else if (product.type === "FIGURE" && Number(numericEntityId(product.slug, 1)) === item.productVariantId) {
        matched = true;
      } else if (product.type === "PLAMO" && Number(numericEntityId(product.slug, 2)) === item.productVariantId) {
        matched = true;
      } else if (product.type === "GOODS" && Number(numericEntityId(product.slug, 3)) === item.productVariantId) {
        matched = true;
      } else if (product.type === "ACCESSORY" && Number(numericEntityId(product.slug, 4)) === item.productVariantId) {
        matched = true;
      }
      if (matched) {
        matchingQuantity += item.quantity;
        if (item.isPreorder) restoredAsPreorder = true;
      }
    }
    if (matchingQuantity === 0) return product;

    const currentStock =
      product.type === "MANGA" || product.type === "LIGHT_NOVEL" || product.type === "GOODS" || product.type === "ACCESSORY"
        ? product.stock
        : product.stockOrQuotaRemaining;
    const nextStock = currentStock + matchingQuantity;

    if (product.type === "MANGA" || product.type === "LIGHT_NOVEL") {
      return {
        ...product,
        stock: nextStock,
        status: restoredAsPreorder ? ("PREORDER" as const) : ("IN_STOCK" as const),
      };
    }
    if (product.type === "GOODS" || product.type === "ACCESSORY") {
      return {
        ...product,
        stock: nextStock,
        status: "IN_STOCK" as const,
      };
    }
    return {
      ...product,
      stockOrQuotaRemaining: nextStock,
      status: restoredAsPreorder ? ("PREORDER_OPEN" as const) : ("IN_STOCK" as const),
    };
  });

  if (nextProducts.some((product, index) => product !== products[index])) {
    writeProducts(nextProducts);
  }
}

export function findAdminCheckoutVariant(
  productVariantId: number,
): MockCatalogVariant | null {
  const rewardVariant = findRewardCheckoutVariant(productVariantId);
  if (rewardVariant) {
    return rewardVariant;
  }

  if (productVariantId === BOOK_COVER_ADDON_VARIANT_ID) {
    return {
      productType: "ACCESSORY",
      title: "ปกพลาสติกสำเร็จรูปถนอมหนังสือ",
      price: BOOK_COVER_ADDON_UNIT_PRICE,
      weightGrams: 5,
      isPreorder: false,
      stockOrQuotaRemaining: 99_999,
      subcategory: "BOOK_COVER",
    };
  }

  const products = readProducts();
  const product = products.find((candidate) => {
    if (candidate.type === "MANGA") {
      return Number(candidate.id.replace(/^manga-/, "")) === productVariantId;
    }
    if (candidate.type === "LIGHT_NOVEL") {
      return Number(candidate.id.replace(/^lightnovel-/, "")) === productVariantId;
    }
    if (candidate.type === "FIGURE") {
      return Number(numericEntityId(candidate.slug, 1)) === productVariantId;
    }
    if (candidate.type === "PLAMO") {
      return Number(numericEntityId(candidate.slug, 2)) === productVariantId;
    }
    if (candidate.type === "GOODS") {
      return Number(numericEntityId(candidate.slug, 3)) === productVariantId;
    }
    if (candidate.type === "ACCESSORY") {
      return Number(numericEntityId(candidate.slug, 4)) === productVariantId;
    }
    return false;
  });

  if (!product) return null;

  if (product.type === "MANGA") {
    return {
      productType: "MANGA",
      title: product.title,
      volumeNumber: product.volumeNumber,
      ...(product.variantLabel ? { variantLabel: product.variantLabel } : {}),
      price: product.price,
      weightGrams: product.weightGrams,
      isPreorder: product.status === "PREORDER",
      stockOrQuotaRemaining: product.stock,
    };
  }

  if (product.type === "LIGHT_NOVEL") {
    return {
      productType: "LIGHT_NOVEL",
      title: product.title,
      volumeNumber: product.volumeNumber,
      ...(product.variantLabel ? { variantLabel: product.variantLabel } : {}),
      price: product.price,
      weightGrams: product.weightGrams,
      isPreorder: product.status === "PREORDER",
      stockOrQuotaRemaining: product.stock,
    };
  }

  if (product.type === "FIGURE") {
    const figure: CatalogFigure = {
      id: String(productVariantId),
      slug: product.slug,
      name: product.name,
      series: product.series,
      character: product.character,
      manufacturer: product.manufacturer,
      scale: product.scale,
      heightMm: product.heightMm,
      janCode: product.janCode,
      images: [...product.images],
      fullPrice: product.fullPrice,
      depositAmount: product.depositAmount,
      preorderDeadline: product.preorderDeadline,
      releaseMonthYear: product.releaseMonthYear,
      status: product.status,
      stockOrQuotaRemaining: product.stockOrQuotaRemaining,
      boxDimensions: { ...product.boxDimensions },
      category: "FIGURE",
    };
    return {
      productType: "FIGURE",
      title: product.name,
      price: product.fullPrice,
      weightGrams: product.weightGrams,
      isPreorder: product.status === "PREORDER_OPEN",
      stockOrQuotaRemaining: product.stockOrQuotaRemaining,
      figure,
    };
  }

  if (product.type === "PLAMO") {
    const figure: CatalogFigure = {
      id: String(productVariantId),
      slug: product.slug,
      name: product.name,
      series: product.series,
      character: product.name,
      manufacturer: product.manufacturer,
      scale: product.grade,
      heightMm: 150,
      janCode: product.janCode,
      images: [...product.images],
      fullPrice: product.fullPrice,
      depositAmount: product.depositAmount,
      preorderDeadline: product.preorderDeadline,
      releaseMonthYear: product.releaseMonthYear,
      status: product.status,
      stockOrQuotaRemaining: product.stockOrQuotaRemaining,
      boxDimensions: { ...product.boxDimensions },
      category: "PLAMO",
      grade: product.grade,
    };
    return {
      productType: "PLAMO",
      title: product.name,
      price: product.fullPrice,
      weightGrams: product.weightGrams,
      isPreorder: product.status === "PREORDER_OPEN",
      stockOrQuotaRemaining: product.stockOrQuotaRemaining,
      figure,
    };
  }

  if (product.type === "GOODS") {
    return {
      productType: "GOODS",
      title: product.name,
      price: product.price,
      weightGrams: product.weightGrams,
      isPreorder: false,
      stockOrQuotaRemaining: product.stock,
      subcategory: product.subcategory,
    };
  }

  // ACCESSORY
  return {
    productType: "ACCESSORY",
    title: product.name,
    price: product.price,
    weightGrams: product.weightGrams,
    isPreorder: false,
    stockOrQuotaRemaining: product.stock,
    subcategory: product.subcategory,
    figure: product.boxDimensions
      ? {
          id: String(productVariantId),
          slug: product.slug,
          name: product.name,
          series: product.series,
          character: "อุปกรณ์ดูแล",
          manufacturer: "Protection Master",
          scale: product.subcategory,
          heightMm: 100,
          janCode: "",
          images: [...product.images],
          fullPrice: product.price,
          depositAmount: 0,
          preorderDeadline: "",
          releaseMonthYear: "",
          status: "IN_STOCK",
          stockOrQuotaRemaining: product.stock,
          boxDimensions: { ...product.boxDimensions },
          category: "ACCESSORY",
        }
      : undefined,
  };
}

export function resetAdminProducts(): void {
  writeProducts(createInitialProducts());
}

export function subscribeToAdminProducts(listener: () => void): () => void {
  const refresh = (): void => listener();
  window.addEventListener(ADMIN_PRODUCTS_UPDATED_EVENT, refresh);
  window.addEventListener("storage", refresh);
  return () => {
    window.removeEventListener(ADMIN_PRODUCTS_UPDATED_EVENT, refresh);
    window.removeEventListener("storage", refresh);
  };
}

export function getSeedProductsCatalog(): CatalogData {
  return getMockCatalog();
}

import { z } from "zod";
import type { FigureProduct } from "../components/FigureDetailCard";
import type { VolumeItem } from "../components/SeriesVolumeSelector";
import { getAdminProductsCatalog } from "../mocks/admin-products.mock";

const volumeSchema = z
  .object({
    id: z.number().int().positive().safe(),
    volumeNumber: z.number().int().positive().safe(),
    title: z.string().min(1),
    variantLabel: z.string().optional(),
    isbn: z.string().optional(),
    coverUrl: z.string().nullable().optional(),
    images: z.array(z.string()).optional(),
    price: z.number().finite().positive(),
    stock: z.number().int().nonnegative(),
    weightGrams: z.number().finite().nonnegative().optional(),
    status: z.enum(["IN_STOCK", "PREORDER", "OUT_OF_STOCK"]),
    expectedShippingDate: z.string().optional(),
    taxRate: z.number().finite().nonnegative().optional(),
  })
  .strict();

const mangaSeriesSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    publisher: z.string().min(1),
    author: z.string().optional(),
    altTitles: z.array(z.string()).optional(),
    category: z.enum(["MANGA", "LIGHT_NOVEL"]).optional(),
    coverImage: z.string().nullable().optional(),
    coverUrl: z.string().nullable().optional(),
    images: z.array(z.string()).optional(),
    taxRate: z.number().finite().nonnegative().optional(),
    volumes: z.array(volumeSchema),
    genres: z.array(z.string()).optional(),
    demographic: z.string().optional(),
    bestSellerRank: z.number().optional(),
    salesText: z.string().optional(),
  })
  .strict();

const figureSchema = z
  .object({
    id: z.string().regex(/^[1-9]\d*$/),
    slug: z.string().min(1),
    name: z.string().min(1),
    series: z.string(),
    character: z.string(),
    manufacturer: z.string().min(1),
    scale: z.string().min(1),
    heightMm: z.number().int().nonnegative(),
    janCode: z.string(),
    images: z.array(z.string()),
    coverImage: z.string().nullable().optional(),
    coverUrl: z.string().nullable().optional(),
    fullPrice: z.number().finite().positive(),
    depositAmount: z.number().finite().nonnegative(),
    preorderDeadline: z.string(),
    releaseMonthYear: z.string(),
    status: z.enum(["PREORDER_OPEN", "PREORDER_CLOSED", "IN_STOCK"]),
    stockOrQuotaRemaining: z.number().int().nonnegative(),
    boxDimensions: z
      .object({
        widthCm: z.number().finite().positive(),
        lengthCm: z.number().finite().positive(),
        heightCm: z.number().finite().positive(),
      })
      .strict(),
    weightGrams: z.number().int().nonnegative().optional(),
    taxRate: z.number().finite().nonnegative().optional(),
    altTitles: z.array(z.string()).optional(),
    category: z.enum(["FIGURE", "PLAMO", "GOODS", "ACCESSORY"]).optional(),
    subcategory: z.string().optional(),
    grade: z.string().optional(),
    bestSellerRank: z.number().optional(),
    salesText: z.string().optional(),
  })
  .strict();

export const catalogResponseSchema = z
  .object({
    success: z.literal(true),
    data: z
      .object({
        mangaSeries: z.array(mangaSeriesSchema),
        figures: z.array(figureSchema),
        lightNovelSeries: z.array(mangaSeriesSchema).optional().default([]),
        plamo: z.array(figureSchema).optional().default([]),
        goods: z.array(figureSchema).optional().default([]),
        accessories: z.array(figureSchema).optional().default([]),
      })
      .strict(),
  })
  .strict();

const catalogErrorSchema = z
  .object({
    success: z.literal(false),
    error: z
      .object({
        message: z.string().optional(),
      })
      .optional(),
  })
  .passthrough();

export type CatalogVolume = z.infer<typeof volumeSchema>;
export type CatalogMangaSeries = z.infer<typeof mangaSeriesSchema>;
export type CatalogFigure = z.infer<typeof figureSchema>;
export type StorefrontFigureProduct = FigureProduct & CatalogFigure;

export interface CatalogData {
  mangaSeries: CatalogMangaSeries[];
  figures: CatalogFigure[];
  lightNovelSeries: CatalogMangaSeries[];
  plamo: CatalogFigure[];
  goods: CatalogFigure[];
  accessories: CatalogFigure[];
}

export async function fetchCatalog(): Promise<CatalogData> {
  if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
    return getAdminProductsCatalog();
  }

  const response = await fetch("/api/catalog", {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error("เซิร์ฟเวอร์ส่งข้อมูลรายการสินค้าไม่ถูกต้อง");
  }

  const parsed = catalogResponseSchema.safeParse(body);
  if (!response.ok || !parsed.success) {
    const error = catalogErrorSchema.safeParse(body);
    throw new Error(
      error.success && error.data.error?.message
        ? error.data.error.message
        : "ไม่สามารถโหลดรายการสินค้าได้ในขณะนี้",
    );
  }
  return parsed.data.data;
}

export function asVolumeItem(volume: CatalogVolume): VolumeItem {
  return volume;
}

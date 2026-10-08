import { NextResponse } from "next/server";
import { Pool } from "pg";
import { z } from "zod";
import { getMockCatalog } from "../../../mocks/products.mock";

export const dynamic = "force-dynamic";

interface MangaVariantRow {
  series_slug: string;
  series_title: string;
  publisher_name: string;
  volume_number: number;
  variant_id: string;
  option_name: string;
  price: string;
  stock_quantity: number;
  preorder_open: boolean;
  preorder_end_date: Date | null;
  release_date: Date | null;
  release_month_year: string | null;
}

interface FigureVariantRow {
  slug: string;
  variant_id: string;
  name: string;
  series_name: string | null;
  character_name: string | null;
  manufacturer_name: string;
  scale: string;
  height_mm: number | null;
  jan_code: string | null;
  full_price: string;
  deposit_amount: string | null;
  preorder_deadline: Date | null;
  release_date: Date | null;
  release_month_year: string | null;
  variant_stock: number;
  quota_remaining: string | null;
  preorder_open: boolean;
  has_preorder: boolean;
  box_width_cm: string | null;
  box_length_cm: string | null;
  box_height_cm: string | null;
}

interface VolumeDto {
  id: number;
  volumeNumber: number;
  title: string;
  price: number;
  stock: number;
  status: "IN_STOCK" | "PREORDER" | "OUT_OF_STOCK";
  expectedShippingDate?: string;
}

interface MangaSeriesDto {
  id: string;
  title: string;
  publisher: string;
  volumes: VolumeDto[];
}

interface FigureDto {
  id: string;
  slug: string;
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
  boxDimensions: {
    widthCm: number;
    lengthCm: number;
    heightCm: number;
  };
}

const responseSchema = z
  .object({
    success: z.literal(true),
    data: z
      .object({
        mangaSeries: z.array(
          z.object({
            id: z.string(),
            title: z.string(),
            publisher: z.string(),
            volumes: z.array(
              z.object({
                id: z.number().int().positive().safe(),
                volumeNumber: z.number().int().positive().safe(),
                title: z.string(),
                price: z.number().positive(),
                stock: z.number().int().nonnegative(),
                status: z.enum(["IN_STOCK", "PREORDER", "OUT_OF_STOCK"]),
                expectedShippingDate: z.string().optional(),
              }),
            ),
          }),
        ),
        figures: z.array(
          z.object({
            id: z.string(),
            slug: z.string(),
            name: z.string(),
            series: z.string(),
            character: z.string(),
            manufacturer: z.string(),
            scale: z.string(),
            heightMm: z.number().int().nonnegative(),
            janCode: z.string(),
            images: z.array(z.string()),
            fullPrice: z.number().positive(),
            depositAmount: z.number().nonnegative(),
            preorderDeadline: z.string(),
            releaseMonthYear: z.string(),
            status: z.enum(["PREORDER_OPEN", "PREORDER_CLOSED", "IN_STOCK"]),
            stockOrQuotaRemaining: z.number().int().nonnegative(),
            boxDimensions: z.object({
              widthCm: z.number().positive(),
              lengthCm: z.number().positive(),
              heightCm: z.number().positive(),
            }),
          }),
        ),
      })
      .strict(),
  })
  .strict();

function databasePool(): Pool {
  const pool = globalThis as typeof globalThis & { mangaCatalogPool?: Pool };
  if (!pool.mangaCatalogPool) {
    pool.mangaCatalogPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
    });
  }
  return pool.mangaCatalogPool;
}

function safeId(value: string): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("A catalog product variant has an invalid ID.");
  }
  return id;
}

function requiredPositiveNumber(value: string | null, field: string): number {
  const number = value === null ? Number.NaN : Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new Error(`Catalog product is missing valid ${field} data.`);
  }
  return number;
}

export async function GET(): Promise<NextResponse> {
  if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
    return NextResponse.json(
      { success: true, data: getMockCatalog() },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const pool = databasePool();
    const [mangaResult, figureResult] = await Promise.all([
      pool.query<MangaVariantRow>(
        `SELECT
           series.slug AS series_slug,
           series.title AS series_title,
           publisher.name AS publisher_name,
           product.volume_number,
           variant.id::text AS variant_id,
           variant.option_name,
           variant.price::text AS price,
           variant.stock_quantity,
           COALESCE(
             preorder.start_date <= CURRENT_TIMESTAMP
             AND CURRENT_TIMESTAMP <= preorder.end_date
             AND (
               preorder.preorder_deadline IS NULL
               OR CURRENT_TIMESTAMP < preorder.preorder_deadline
             )
             AND (
               preorder.quota_limit IS NULL
               OR preorder.booked_count < preorder.quota_limit
             ),
             FALSE
           ) AS preorder_open,
           preorder.end_date AS preorder_end_date,
           preorder.release_date,
           preorder.release_month_year
         FROM products AS product
         INNER JOIN manga_series AS series ON series.id = product.series_id
         INNER JOIN publishers AS publisher ON publisher.id = product.publisher_id
         INNER JOIN product_variants AS variant ON variant.product_id = product.id
         LEFT JOIN preorders AS preorder
           ON preorder.product_variant_id = variant.id
         WHERE product.product_type = 'MANGA'
           AND product.is_active = TRUE
         ORDER BY series.title, product.volume_number, variant.id`,
      ),
      pool.query<FigureVariantRow>(
        `SELECT
           product.slug,
           variant.id::text AS variant_id,
           product.name,
           character.series_name,
           character.name AS character_name,
           manufacturer.name AS manufacturer_name,
           figure.scale,
           figure.height_mm,
           figure.jan_code,
           COALESCE(preorder.full_price, variant.price)::text AS full_price,
           preorder.deposit_amount::text AS deposit_amount,
           preorder.preorder_deadline,
           preorder.release_date,
           preorder.release_month_year,
           variant.stock_quantity AS variant_stock,
           CASE
             WHEN preorder.quota_limit IS NULL THEN NULL
             ELSE GREATEST(preorder.quota_limit - preorder.booked_count, 0)::text
           END AS quota_remaining,
           COALESCE(
             preorder.start_date <= CURRENT_TIMESTAMP
             AND CURRENT_TIMESTAMP <= preorder.end_date
             AND (
               preorder.preorder_deadline IS NULL
               OR CURRENT_TIMESTAMP < preorder.preorder_deadline
             )
             AND (
               preorder.quota_limit IS NULL
               OR preorder.booked_count < preorder.quota_limit
             ),
             FALSE
           ) AS preorder_open,
           preorder.product_variant_id IS NOT NULL AS has_preorder,
           figure.box_width_cm::text AS box_width_cm,
           figure.box_length_cm::text AS box_length_cm,
           figure.box_height_cm::text AS box_height_cm
         FROM products AS product
         INNER JOIN figures_metadata AS figure ON figure.product_id = product.id
         INNER JOIN manufacturers AS manufacturer
           ON manufacturer.id = figure.manufacturer_id
         LEFT JOIN characters AS character ON character.id = figure.character_id
         INNER JOIN product_variants AS variant ON variant.product_id = product.id
         LEFT JOIN preorders AS preorder
           ON preorder.product_variant_id = variant.id
         WHERE product.product_type = 'FIGURE'
           AND product.is_active = TRUE
         ORDER BY product.name`,
      ),
    ]);

    const mangaBySlug = new Map<string, MangaSeriesDto>();
    for (const row of mangaResult.rows) {
      const series =
        mangaBySlug.get(row.series_slug) ??
        ({
          id: row.series_slug,
          title: row.series_title,
          publisher: row.publisher_name,
          volumes: [],
        } satisfies MangaSeriesDto);
      const status: VolumeDto["status"] = row.preorder_open
        ? "PREORDER"
        : row.stock_quantity > 0
          ? "IN_STOCK"
          : "OUT_OF_STOCK";
      const volume: VolumeDto = {
        id: safeId(row.variant_id),
        volumeNumber: row.volume_number,
        title:
          row.option_name === "ปกติ"
            ? `${row.series_title} เล่ม ${row.volume_number}`
            : `${row.series_title} เล่ม ${row.volume_number} (${row.option_name})`,
        price: Number(row.price),
        stock: row.preorder_open ? 99 : row.stock_quantity,
        status,
        ...(row.preorder_open && (row.release_date ?? row.preorder_end_date)
          ? {
              expectedShippingDate: (
                row.release_date ?? row.preorder_end_date
              )!.toISOString(),
            }
          : {}),
      };
      series.volumes.push(volume);
      mangaBySlug.set(row.series_slug, series);
    }

    const figures: FigureDto[] = figureResult.rows.map((row) => {
      const fullPrice = Number(row.full_price);
      const depositAmount = Number(row.deposit_amount ?? 0);
      const stockOrQuotaRemaining = row.has_preorder
        ? row.quota_remaining === null
          ? 99
          : Number(row.quota_remaining)
        : row.variant_stock;
      const status: FigureDto["status"] = row.preorder_open
        ? "PREORDER_OPEN"
        : !row.has_preorder && row.variant_stock > 0
          ? "IN_STOCK"
          : "PREORDER_CLOSED";

      return {
        id: row.variant_id,
        slug: row.slug,
        name: row.name,
        series: row.series_name ?? "ของสะสม",
        character: row.character_name ?? "ไม่ระบุ",
        manufacturer: row.manufacturer_name,
        scale: row.scale,
        heightMm: row.height_mm ?? 0,
        janCode: row.jan_code ?? "",
        images: [],
        fullPrice,
        depositAmount,
        preorderDeadline:
          row.preorder_deadline?.toISOString() ??
          row.release_date?.toISOString() ??
          "",
        releaseMonthYear: row.release_month_year ?? "",
        status,
        stockOrQuotaRemaining,
        boxDimensions: {
          widthCm: requiredPositiveNumber(row.box_width_cm, "box width"),
          lengthCm: requiredPositiveNumber(row.box_length_cm, "box length"),
          heightCm: requiredPositiveNumber(row.box_height_cm, "box height"),
        },
      };
    });

    const data = {
      mangaSeries: [...mangaBySlug.values()],
      figures,
    };
    const parsed = responseSchema.safeParse({ success: true, data });
    if (!parsed.success) {
      console.error("Catalog database response failed schema validation.", parsed.error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_CATALOG_DATA",
            message: "ข้อมูลสินค้าในระบบไม่ถูกต้อง",
          },
        },
        { status: 500 },
      );
    }

    return NextResponse.json(parsed.data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Failed to load the product catalog.", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "CATALOG_UNAVAILABLE",
          message: "ไม่สามารถโหลดรายการสินค้าได้ในขณะนี้",
        },
      },
      { status: 503 },
    );
  }
}

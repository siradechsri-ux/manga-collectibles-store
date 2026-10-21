import { Request, Response, Router } from "express";
import { Pool } from "pg";
import { getAdminProductsCatalog } from "../mocks/admin-products.mock";
import { getMockCatalog } from "../mocks/products.mock";

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

export function createCatalogRouter(pool: Pool): Router {
  const router = Router();

  router.get("/", async (request: Request, response: Response): Promise<void> => {
    const category = typeof request.query.category === "string" ? request.query.category.toUpperCase() : null;

    try {
      const mangaResult = await pool.query<MangaVariantRow>(
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
         LEFT JOIN preorders AS preorder ON preorder.product_variant_id = variant.id
         WHERE product.product_type = 'MANGA'
           AND product.is_active = TRUE
         ORDER BY series.title, product.volume_number, variant.id`,
      );

      const figureResult = await pool.query<FigureVariantRow>(
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
         INNER JOIN manufacturers AS manufacturer ON manufacturer.id = figure.manufacturer_id
         LEFT JOIN characters AS character ON character.id = figure.character_id
         INNER JOIN product_variants AS variant ON variant.product_id = product.id
         LEFT JOIN preorders AS preorder ON preorder.product_variant_id = variant.id
         WHERE product.product_type = 'FIGURE'
           AND product.is_active = TRUE
         ORDER BY product.name, variant.id`,
      );

      // If DB returned rows, build DTOs from DB
      if (mangaResult.rows.length > 0 || figureResult.rows.length > 0) {
        const mangaSeriesMap = new Map<string, any>();
        for (const row of mangaResult.rows) {
          if (!mangaSeriesMap.has(row.series_slug)) {
            mangaSeriesMap.set(row.series_slug, {
              id: row.series_slug,
              title: row.series_title,
              publisher: row.publisher_name,
              volumes: [],
            });
          }
          const series = mangaSeriesMap.get(row.series_slug);
          series.volumes.push({
            id: Number(row.variant_id),
            volumeNumber: row.volume_number,
            title: row.option_name,
            price: Number(row.price),
            stock: row.stock_quantity,
            status: row.preorder_open ? "PREORDER" : row.stock_quantity > 0 ? "IN_STOCK" : "OUT_OF_STOCK",
            expectedShippingDate: row.release_month_year || undefined,
          });
        }

        const figures = figureResult.rows.map((row) => ({
          id: row.variant_id,
          slug: row.slug,
          name: row.name,
          series: row.series_name || "",
          character: row.character_name || "",
          manufacturer: row.manufacturer_name,
          scale: row.scale,
          heightMm: row.height_mm || 0,
          janCode: row.jan_code || "",
          images: [`/images/products/${row.slug}.jpg`],
          fullPrice: Number(row.full_price),
          depositAmount: Number(row.deposit_amount || 0),
          preorderDeadline: row.preorder_deadline?.toISOString() || "",
          releaseMonthYear: row.release_month_year || "",
          status: row.preorder_open ? "PREORDER_OPEN" : row.has_preorder ? "PREORDER_CLOSED" : "IN_STOCK",
          stockOrQuotaRemaining: row.quota_remaining ? Number(row.quota_remaining) : row.variant_stock,
          boxDimensions: {
            widthCm: Number(row.box_width_cm || 20),
            lengthCm: Number(row.box_length_cm || 20),
            heightCm: Number(row.box_height_cm || 30),
          },
        }));

        const catalog = getAdminProductsCatalog();
        response.json({
          success: true,
          data: {
            mangaSeries: Array.from(mangaSeriesMap.values()),
            figures,
            lightNovelSeries: catalog.lightNovelSeries ?? [],
            plamo: catalog.plamo ?? [],
            goods: catalog.goods ?? [],
            accessories: catalog.accessories ?? [],
          },
        });
        return;
      }
    } catch (dbError) {
      console.warn("Catalog DB query failed or empty; serving master seed catalog fallback:", dbError);
    }

    // Master seed catalog fallback
    const catalog = getAdminProductsCatalog();
    if (category === "MANGA") {
      response.json({
        success: true,
        data: {
          mangaSeries: catalog.mangaSeries,
          figures: [],
          lightNovelSeries: [],
          plamo: [],
          goods: [],
          accessories: [],
        },
      });
      return;
    }

    response.json({
      success: true,
      data: catalog,
    });
  });

  router.get("/search", (request: Request, response: Response): void => {
    const q = typeof request.query.q === "string" ? request.query.q.trim().toLowerCase() : "";
    const catalog = getAdminProductsCatalog();

    if (!q) {
      response.json({
        success: true,
        data: {
          manga: catalog.mangaSeries,
          lightNovels: catalog.lightNovelSeries ?? [],
          collectibles: [
            ...catalog.figures,
            ...(catalog.plamo ?? []),
            ...(catalog.goods ?? []),
            ...(catalog.accessories ?? []),
          ],
        },
      });
      return;
    }

    const manga = catalog.mangaSeries.filter((series) =>
      `${series.title} ${series.publisher} ${series.author ?? ""}`.toLowerCase().includes(q),
    );

    const lightNovels = (catalog.lightNovelSeries ?? []).filter((series) =>
      `${series.title} ${series.publisher} ${series.author ?? ""}`.toLowerCase().includes(q),
    );

    const allCollectibles = [
      ...catalog.figures,
      ...(catalog.plamo ?? []),
      ...(catalog.goods ?? []),
      ...(catalog.accessories ?? []),
    ];
    const collectibles = allCollectibles.filter((item) =>
      `${item.name} ${item.series} ${item.character} ${item.manufacturer}`.toLowerCase().includes(q),
    );

    response.json({
      success: true,
      data: { manga, lightNovels, collectibles },
    });
  });

  return router;
}

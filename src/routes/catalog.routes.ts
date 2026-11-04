import { Request, Response, Router } from "express";
import { Pool } from "pg";
import { getAdminProductsCatalog } from "../mocks/admin-products.mock";

interface VariantOverlayRow {
  variant_id: string;
  price: string;
  stock_quantity: number;
  availability_status: string;
  has_preorder: boolean;
  preorder_open: boolean;
  full_price: string | null;
  deposit_amount: string | null;
  quota_remaining: string | null;
}

export function createCatalogRouter(pool: Pool): Router {
  const router = Router();

  router.get("/", async (request: Request, response: Response): Promise<void> => {
    const category =
      typeof request.query.category === "string"
        ? request.query.category.toUpperCase()
        : null;

    const baseCatalog = getAdminProductsCatalog();

    try {
      const dbResult = await pool.query<VariantOverlayRow>(
        `SELECT
           variant.id::text AS variant_id,
           variant.price::text AS price,
           variant.stock_quantity,
           variant.availability_status,
           preorder.product_variant_id IS NOT NULL AS has_preorder,
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
             )
             AND preorder.status = 'PREORDER_OPEN',
             FALSE
           ) AS preorder_open,
           preorder.full_price::text AS full_price,
           preorder.deposit_amount::text AS deposit_amount,
           CASE
             WHEN preorder.quota_limit IS NULL THEN NULL
             ELSE GREATEST(preorder.quota_limit - preorder.booked_count, 0)::text
           END AS quota_remaining
         FROM product_variants AS variant
         LEFT JOIN preorders AS preorder ON preorder.product_variant_id = variant.id`,
      );

      if (dbResult.rows.length > 0) {
        const variantMap = new Map<number, VariantOverlayRow>();
        for (const row of dbResult.rows) {
          variantMap.set(Number(row.variant_id), row);
        }

        const applySeriesOverlay = (seriesList: typeof baseCatalog.mangaSeries) =>
          seriesList.map((series) => ({
            ...series,
            volumes: series.volumes.map((vol) => {
              const dbVar = variantMap.get(vol.id);
              if (!dbVar) return vol;
              const stock = dbVar.has_preorder
                ? dbVar.quota_remaining !== null
                  ? Number(dbVar.quota_remaining)
                  : vol.stock
                : dbVar.stock_quantity;
              const status: "IN_STOCK" | "PREORDER" | "OUT_OF_STOCK" = dbVar.has_preorder
                ? dbVar.preorder_open && stock > 0
                  ? "PREORDER"
                  : "OUT_OF_STOCK"
                : stock > 0
                  ? "IN_STOCK"
                  : "OUT_OF_STOCK";
              return {
                ...vol,
                price: Number(dbVar.price) || vol.price,
                stock,
                status,
              };
            }),
          }));

        const applyFigureOverlay = (figureList: typeof baseCatalog.figures) =>
          figureList.map((fig) => {
            const dbVar = variantMap.get(Number(fig.id));
            if (!dbVar) return fig;
            const stockOrQuotaRemaining = dbVar.has_preorder
              ? dbVar.quota_remaining !== null
                ? Number(dbVar.quota_remaining)
                : fig.stockOrQuotaRemaining
              : dbVar.stock_quantity;
            const status: "PREORDER_OPEN" | "PREORDER_CLOSED" | "IN_STOCK" = dbVar.has_preorder
              ? dbVar.preorder_open && stockOrQuotaRemaining > 0
                ? "PREORDER_OPEN"
                : "PREORDER_CLOSED"
              : "IN_STOCK";
            return {
              ...fig,
              fullPrice: Number(dbVar.full_price ?? dbVar.price) || fig.fullPrice,
              depositAmount:
                dbVar.deposit_amount !== null
                  ? Number(dbVar.deposit_amount)
                  : fig.depositAmount,
              stockOrQuotaRemaining,
              status,
            };
          });

        const enrichedCatalog = {
          mangaSeries: applySeriesOverlay(baseCatalog.mangaSeries),
          figures: applyFigureOverlay(baseCatalog.figures),
          lightNovelSeries: applySeriesOverlay(baseCatalog.lightNovelSeries ?? []),
          plamo: applyFigureOverlay(baseCatalog.plamo ?? []),
          goods: applyFigureOverlay(baseCatalog.goods ?? []),
          accessories: applyFigureOverlay(baseCatalog.accessories ?? []),
        };

        if (category === "MANGA") {
          response.json({
            success: true,
            data: {
              mangaSeries: enrichedCatalog.mangaSeries,
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
          data: enrichedCatalog,
        });
        return;
      }
    } catch (dbError) {
      console.warn(
        "Catalog DB query failed or empty; serving master seed catalog fallback:",
        dbError,
      );
    }

    if (category === "MANGA") {
      response.json({
        success: true,
        data: {
          mangaSeries: baseCatalog.mangaSeries,
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
      data: baseCatalog,
    });
  });

  router.get("/search", (request: Request, response: Response): void => {
    const q =
      typeof request.query.q === "string"
        ? request.query.q.trim().toLowerCase()
        : "";
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
      `${series.title} ${series.publisher} ${series.author ?? ""}`
        .toLowerCase()
        .includes(q),
    );

    const lightNovels = (catalog.lightNovelSeries ?? []).filter((series) =>
      `${series.title} ${series.publisher} ${series.author ?? ""}`
        .toLowerCase()
        .includes(q),
    );

    const allCollectibles = [
      ...catalog.figures,
      ...(catalog.plamo ?? []),
      ...(catalog.goods ?? []),
      ...(catalog.accessories ?? []),
    ];
    const collectibles = allCollectibles.filter((item) =>
      `${item.name} ${item.series} ${item.character} ${item.manufacturer}`
        .toLowerCase()
        .includes(q),
    );

    response.json({
      success: true,
      data: { manga, lightNovels, collectibles },
    });
  });

  return router;
}

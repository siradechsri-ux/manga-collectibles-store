import { IS_MOCK_MODE } from "../config/env";
import type {
  CatalogData,
  CatalogFigure,
  CatalogMangaSeries,
} from "../lib/catalog-client";
import { catalogResponseSchema } from "../lib/catalog-client";
import { getAdminProductsCatalog } from "../mocks/admin-products.mock";
import { getMockCatalog } from "../mocks/products.mock";

export class ProductService {
  /**
   * Retrieves the catalog containing manga, light novels, figures, plamo, goods, accessories.
   * In mock mode, pulls from local memory/localStorage; otherwise fetches the live API.
   */
  static async getProducts(): Promise<CatalogData> {
    if (IS_MOCK_MODE) {
      if (typeof window !== "undefined") {
        return getAdminProductsCatalog();
      }
      return getMockCatalog();
    }

    const response = await fetch("/api/catalog", {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`ไม่สามารถโหลดรายการสินค้าได้ (${response.statusText})`);
    }
    const json = await response.json();
    return json.data;
  }

  static async getMangaSeries(): Promise<CatalogMangaSeries[]> {
    if (IS_MOCK_MODE) {
      if (typeof window !== "undefined") {
        return getAdminProductsCatalog().mangaSeries;
      }
      return getMockCatalog().mangaSeries;
    }

    const response = await fetch("/api/catalog?category=MANGA", {
      headers: { Accept: "application/json" },
    });
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new Error("เซิร์ฟเวอร์ส่งข้อมูลมังงะไม่ถูกต้อง");
    }
    const parsed = catalogResponseSchema.safeParse(body);
    if (!response.ok || !parsed.success) {
      throw new Error("ไม่สามารถโหลดรายการมังงะได้");
    }
    return parsed.data.data.mangaSeries;
  }

  /**
   * Retrieves a manga or light novel series by series ID.
   */
  static async getMangaSeriesById(id: string): Promise<CatalogMangaSeries | null> {
    const catalog = await this.getProducts();
    const all = [...catalog.mangaSeries, ...(catalog.lightNovelSeries ?? [])];
    return all.find((series) => series.id === id) ?? null;
  }

  /**
   * Retrieves a collectible product (Figure, Plamo, Goods, Accessory) by ID or slug.
   */
  static async getFigureById(idOrSlug: string): Promise<CatalogFigure | null> {
    const catalog = await this.getProducts();
    const all: CatalogFigure[] = [
      ...catalog.figures,
      ...(catalog.plamo ?? []),
      ...(catalog.goods ?? []),
      ...(catalog.accessories ?? []),
    ];
    return all.find((item) => item.id === idOrSlug || item.slug === idOrSlug) ?? null;
  }

  /**
   * Searches the entire catalog by query string across title, altTitles, author, publisher, character, etc.
   */
  static async searchProducts(query: string): Promise<{
    manga: CatalogMangaSeries[];
    lightNovels: CatalogMangaSeries[];
    collectibles: CatalogFigure[];
  }> {
    const catalog = await this.getProducts();
    const q = query.trim().toLocaleLowerCase();

    if (!q) {
      return {
        manga: catalog.mangaSeries,
        lightNovels: catalog.lightNovelSeries ?? [],
        collectibles: [
          ...catalog.figures,
          ...(catalog.plamo ?? []),
          ...(catalog.goods ?? []),
          ...(catalog.accessories ?? []),
        ],
      };
    }

    const manga = catalog.mangaSeries.filter((series) => {
      const matchString = [
        series.title,
        series.publisher,
        series.author ?? "",
        ...(series.altTitles ?? []),
        ...series.volumes.map((v) => `${v.title} ${v.variantLabel ?? ""} ${v.isbn ?? ""}`),
      ]
        .join(" ")
        .toLocaleLowerCase();
      return matchString.includes(q);
    });

    const lightNovels = (catalog.lightNovelSeries ?? []).filter((series) => {
      const matchString = [
        series.title,
        series.publisher,
        series.author ?? "",
        ...(series.altTitles ?? []),
        ...series.volumes.map((v) => `${v.title} ${v.variantLabel ?? ""} ${v.isbn ?? ""}`),
      ]
        .join(" ")
        .toLocaleLowerCase();
      return matchString.includes(q);
    });

    const allCollectibles: CatalogFigure[] = [
      ...catalog.figures,
      ...(catalog.plamo ?? []),
      ...(catalog.goods ?? []),
      ...(catalog.accessories ?? []),
    ];
    const collectibles = allCollectibles.filter((item) => {
      const matchString = [
        item.name,
        item.series,
        item.character,
        item.manufacturer,
        item.janCode,
        item.grade ?? "",
        item.subcategory ?? "",
        ...(item.altTitles ?? []),
      ]
        .join(" ")
        .toLocaleLowerCase();
      return matchString.includes(q);
    });

    return { manga, lightNovels, collectibles };
  }
}

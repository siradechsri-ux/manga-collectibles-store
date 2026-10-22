import { IS_MOCK_MODE } from "../config/env";
import type {
  CatalogData,
  CatalogFigure,
  CatalogMangaSeries,
} from "../lib/catalog-client";
import { catalogResponseSchema } from "../lib/catalog-client";
import { getAdminProductsCatalog } from "../mocks/admin-products.mock";
import { getMockCatalog } from "../mocks/products.mock";
import {
  initializeMasterStorage,
  MASTER_PRODUCTS,
  STORAGE_VERSION,
} from "../mocks/master-products.mock";

export interface ResolvedProductResult {
  kind: "MANGA" | "LIGHT_NOVEL" | "FIGURE" | "PLAMO" | "GOODS" | "ACCESSORY";
  item: CatalogMangaSeries | CatalogFigure;
  url: string;
}

export class ProductService {
  /**
   * Retrieves the catalog containing manga, light novels, figures, plamo, goods, accessories.
   * In mock mode, pulls from local memory/localStorage; otherwise fetches the live API.
   */
  static async getProducts(): Promise<CatalogData> {
    if (IS_MOCK_MODE) {
      if (typeof window !== "undefined") {
        initializeMasterStorage();
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
        initializeMasterStorage();
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
   * Retrieves a manga or light novel series by ID or slug with robust decoding and alias normalization.
   */
  static async getMangaSeriesById(idOrSlug: string): Promise<CatalogMangaSeries | null> {
    if (!idOrSlug) return null;
    let decoded = "";
    try {
      decoded = decodeURIComponent(idOrSlug).trim().toLowerCase();
    } catch {
      decoded = idOrSlug.trim().toLowerCase();
    }

    // Strip common prefixes & volume suffixes if present
    const cleanKey = decoded
      .replace(/^(manga-|novel-|lightnovel-)/, "")
      .replace(/-vol-\d+$/, "");

    const catalog = await this.getProducts();
    const all = [...catalog.mangaSeries, ...(catalog.lightNovelSeries ?? [])];

    // 1. Exact match by series id
    let matched = all.find((series) => {
      const sId = series.id.toLowerCase();
      return sId === decoded || sId === cleanKey || series.id === idOrSlug;
    });
    if (matched) return matched;

    // 2. Canonical alias resolution
    const aliasMap: Record<string, string> = {
      jjk: "jujutsu-kaisen",
      jujutsu: "jujutsu-kaisen",
      chainsaw: "chainsaw-man",
      csm: "chainsaw-man",
      "spy-family": "spy-x-family",
      "spy-x-family": "spy-x-family",
      cote: "classroom-elite-novel",
      "classroom-elite": "classroom-elite-novel",
      slime: "slime-novel",
      konosuba: "konosuba-novel",
      mushoku: "mushoku-tensei-novel",
      rezero: "rezero-novel",
      aot: "attack-on-titan",
      op: "one-piece",
      onepiece: "one-piece",
      "one-piece": "one-piece",
      kaiju: "kaiju-no-8",
      kaiju8: "kaiju-no-8",
      "kaiju-no-8": "kaiju-no-8",
    };
    if (aliasMap[cleanKey] || aliasMap[decoded]) {
      const targetId = aliasMap[cleanKey] || aliasMap[decoded];
      matched = all.find((s) => s.id.toLowerCase() === targetId.toLowerCase());
      if (matched) return matched;
    }

    // 3. Match from master product catalog
    const masterMatch = MASTER_PRODUCTS.find(
      (m) =>
        (m.category === "MANGA" || m.category === "LIGHT_NOVEL") &&
        (m.id.toLowerCase() === decoded ||
          m.slug.toLowerCase() === decoded ||
          m.slug.toLowerCase() === cleanKey ||
          m.aliases?.some((a) => a.toLowerCase() === decoded || a.toLowerCase() === cleanKey)),
    );
    if (masterMatch) {
      matched = all.find((s) => s.id.toLowerCase() === masterMatch.slug.toLowerCase());
      if (matched) return matched;
    }

    // 4. Volume ID match (e.g. searching by volume number or volume ID)
    const numericId = Number(cleanKey.replace(/\D/g, ""));
    if (Number.isSafeInteger(numericId) && numericId > 0) {
      matched = all.find((s) => s.volumes.some((v) => v.id === numericId));
      if (matched) return matched;
    }

    // 5. Title substring search fallback
    matched = all.find(
      (s) =>
        s.title.toLowerCase().includes(cleanKey) ||
        s.altTitles?.some((a) => a.toLowerCase().includes(cleanKey)),
    );

    return matched ?? null;
  }

  /**
   * Retrieves a collectible product (Figure, Plamo, Goods, Accessory) by ID or slug.
   */
  static async getFigureById(idOrSlug: string): Promise<CatalogFigure | null> {
    if (!idOrSlug) return null;
    let decoded = "";
    try {
      decoded = decodeURIComponent(idOrSlug).trim().toLowerCase();
    } catch {
      decoded = idOrSlug.trim().toLowerCase();
    }

    const cleanKey = decoded.replace(
      /^(fig-|figure-|plamo-|gunpla-|goods-|acc-|accessory-)/,
      "",
    );

    const catalog = await this.getProducts();
    const all: CatalogFigure[] = [
      ...catalog.figures,
      ...(catalog.plamo ?? []),
      ...(catalog.goods ?? []),
      ...(catalog.accessories ?? []),
    ];

    // 1. Direct match by id or slug
    let matched = all.find((item) => {
      const itemId = item.id.toLowerCase();
      const itemSlug = item.slug.toLowerCase();
      return (
        itemId === decoded ||
        itemSlug === decoded ||
        itemId === cleanKey ||
        itemSlug === cleanKey ||
        item.id === idOrSlug ||
        item.slug === idOrSlug
      );
    });
    if (matched) return matched;

    // 2. Collectible Alias Resolution
    const aliasMap: Record<string, string> = {
      "nendoroid-tanjiro": "nendoroid-tanjiro-kamado",
      "tanjiro-nendoroid": "nendoroid-tanjiro-kamado",
      "gojo": "nendoroid-gojo-satoru",
      "gojo-nendoroid": "nendoroid-gojo-satoru",
      "sukuna": "pop-up-parade-sukuna",
      "sukuna-pup": "pop-up-parade-sukuna",
      "frieren": "nendoroid-frieren",
      "frieren-nendoroid": "nendoroid-frieren",
      "anya": "nendoroid-anya-forger",
      "anya-nendoroid": "nendoroid-anya-forger",
      "hinu": "rg-hi-nu-gundam",
      "hi-nu": "rg-hi-nu-gundam",
      "hi-nu-gundam": "rg-hi-nu-gundam",
      "plamo-hinu": "rg-hi-nu-gundam",
      "8001": "acc-8001",
      "8002": "acc-8002",
      "8003": "acc-8003",
      "8005": "acc-8005",
      "7001": "goods-7001",
      "goods-standee": "goods-7001",
    };
    if (aliasMap[cleanKey] || aliasMap[decoded]) {
      const targetSlug = aliasMap[cleanKey] || aliasMap[decoded];
      matched = all.find(
        (item) =>
          item.id.toLowerCase() === targetSlug.toLowerCase() ||
          item.slug.toLowerCase() === targetSlug.toLowerCase(),
      );
      if (matched) return matched;
    }

    // 3. Match from master product catalog
    const masterMatch = MASTER_PRODUCTS.find(
      (m) =>
        m.category !== "MANGA" &&
        m.category !== "LIGHT_NOVEL" &&
        (m.id.toLowerCase() === decoded ||
          m.slug.toLowerCase() === decoded ||
          m.slug.toLowerCase() === cleanKey ||
          m.aliases?.some((a) => a.toLowerCase() === decoded || a.toLowerCase() === cleanKey)),
    );
    if (masterMatch) {
      matched = all.find(
        (item) =>
          item.slug.toLowerCase() === masterMatch.slug.toLowerCase() ||
          masterMatch.aliases?.includes(item.id),
      );
      if (matched) return matched;
    }

    // 4. Numeric 4-digit code match (2001, 6001, 7001, 8001)
    const codeMatch = decoded.match(/\d{4}/)?.[0];
    if (codeMatch) {
      matched = all.find((item) => item.id === codeMatch || item.slug.includes(codeMatch));
      if (matched) return matched;
    }

    // 5. Name or slug substring fallback
    matched = all.find(
      (item) =>
        item.slug.toLowerCase().includes(cleanKey) ||
        item.name.toLowerCase().includes(cleanKey) ||
        item.altTitles?.some((a) => a.toLowerCase().includes(cleanKey)),
    );

    return matched ?? null;
  }

  /**
   * Unified Product Resolver: Finds any product across all 6 categories by ID or slug.
   * Returns item, category type, and canonical navigation path.
   */
  static async getProductById(idOrSlug: string): Promise<ResolvedProductResult | null> {
    const manga = await this.getMangaSeriesById(idOrSlug);
    if (manga) {
      const kind = manga.category === "LIGHT_NOVEL" ? "LIGHT_NOVEL" : "MANGA";
      return {
        kind,
        item: manga,
        url: `/manga/${encodeURIComponent(manga.id)}`,
      };
    }

    const figure = await this.getFigureById(idOrSlug);
    if (figure) {
      const kind = figure.category ?? "FIGURE";
      return {
        kind,
        item: figure,
        url: `/figures/${encodeURIComponent(figure.slug || figure.id)}`,
      };
    }

    return null;
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

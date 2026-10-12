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

export const JUJUTSU_COVERS: Record<number, string> = Object.fromEntries(
  Array.from({ length: 26 }, (_, i) => [
    i + 1,
    `/images/products/jjk-vol-${String(i + 1).padStart(2, "0")}.jpg`,
  ]),
);

export const mangaSeries: CatalogMangaSeries[] = rawMangaSeries;
export const lightNovelSeries: CatalogMangaSeries[] = rawLightNovelSeries;
export const figures: CatalogFigure[] = rawFigures;
export const plamo: CatalogFigure[] = rawPlamo;
export const goods: CatalogFigure[] = rawGoods;
export const accessories: CatalogFigure[] = rawAccessories;

export type ProductType =
  | "MANGA"
  | "FIGURE"
  | "LIGHT_NOVEL"
  | "GOODS"
  | "PLAMO"
  | "ACCESSORY";

export function isVatExemptProductType(type: ProductType): boolean {
  return type === "MANGA" || type === "LIGHT_NOVEL";
}

export interface MockCatalogVariant {
  productType: ProductType;
  title: string;
  volumeNumber?: number;
  variantLabel?: string;
  price: number;
  weightGrams: number;
  isPreorder: boolean;
  stockOrQuotaRemaining: number;
  figure?: CatalogFigure;
  subcategory?: string;
}

export const BOOK_COVER_ADDON_VARIANT_ID = 99_999;
export const BOOK_COVER_ADDON_UNIT_PRICE = 5;

export function getMockCatalog(): CatalogData {
  return buildCatalogData();
}

export function findMockVariant(productVariantId: number): MockCatalogVariant | null {
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

  for (const series of mangaSeries) {
    const volume = series.volumes.find((item) => item.id === productVariantId);
    if (volume) {
      return {
        productType: "MANGA",
        title: series.title,
        volumeNumber: volume.volumeNumber,
        ...(volume.variantLabel ? { variantLabel: volume.variantLabel } : {}),
        price: volume.price,
        weightGrams:
          volume.variantLabel === "Limited Set" ||
          volume.variantLabel?.includes("Boxset") ||
          volume.variantLabel === "ฉบับพิเศษ"
            ? 450
            : volume.volumeNumber === 26
              ? 400
              : 250,
        isPreorder: volume.status === "PREORDER",
        stockOrQuotaRemaining: volume.stock,
      };
    }
  }

  for (const series of lightNovelSeries) {
    const volume = series.volumes.find((item) => item.id === productVariantId);
    if (volume) {
      return {
        productType: "LIGHT_NOVEL",
        title: series.title,
        volumeNumber: volume.volumeNumber,
        ...(volume.variantLabel ? { variantLabel: volume.variantLabel } : {}),
        price: volume.price,
        weightGrams:
          volume.variantLabel?.includes("Set") || volume.variantLabel?.includes("Boxset")
            ? 420
            : 280,
        isPreorder: volume.status === "PREORDER",
        stockOrQuotaRemaining: volume.stock,
      };
    }
  }

  const allItems: CatalogFigure[] = [
    ...figures,
    ...plamo,
    ...goods,
    ...accessories,
  ];

  const matched = allItems.find((item) => Number(item.id) === productVariantId);
  if (!matched) {
    return null;
  }

  const category = (matched.category as ProductType) ?? "FIGURE";
  const weightGrams =
    matched.weightGrams ??
    (matched.category === "PLAMO"
      ? matched.scale?.includes("1/100")
        ? 850
        : 450
      : matched.category === "GOODS"
        ? 100
        : matched.category === "ACCESSORY"
          ? 200
          : 650);

  return {
    productType: category,
    title: matched.name,
    price: matched.fullPrice,
    weightGrams,
    isPreorder: matched.status === "PREORDER_OPEN",
    stockOrQuotaRemaining: matched.stockOrQuotaRemaining,
    subcategory: matched.subcategory,
    figure: {
      ...matched,
      images: [...matched.images],
      boxDimensions: { ...matched.boxDimensions },
    },
  };
}

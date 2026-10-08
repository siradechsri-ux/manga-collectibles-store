"use client";

import { z } from "zod";
import type {
  CatalogData,
  CatalogFigure,
  CatalogMangaSeries,
  CatalogVolume,
} from "../lib/catalog-client";
import type { MockCatalogVariant } from "./products.mock";
import { getMockCatalog } from "./products.mock";

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
    isbn: z.string(),
    synopsis: z.string(),
    coverStyle: z.enum(["STANDARD", "LIMITED_SET"]),
    variantLabel: z.string().optional(),
    price: z.number().positive(),
    stock: z.number().int().nonnegative(),
    status: z.enum(["IN_STOCK", "PREORDER", "OUT_OF_STOCK"]),
    preorderDeadline: z.string(),
    expectedShippingDate: z.string(),
    weightGrams: z.number().int().nonnegative(),
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
    description: z.string(),
    fullPrice: z.number().positive(),
    depositAmount: z.number().nonnegative(),
    preorderDeadline: z.string(),
    releaseMonthYear: z.string(),
    status: z.enum(["PREORDER_OPEN", "PREORDER_CLOSED", "IN_STOCK"]),
    stockOrQuotaRemaining: z.number().int().nonnegative(),
    boxDimensions: dimensionsSchema,
    weightGrams: z.number().int().nonnegative(),
    heightMm: z.number().int().nonnegative(),
    janCode: z.string(),
    images: z.array(z.string()),
  })
  .strict();

const adminProductSchema = z.discriminatedUnion("type", [
  mangaProductSchema,
  figureProductSchema,
]);
const adminProductsSchema = z.array(adminProductSchema);

export type MangaProduct = z.infer<typeof mangaProductSchema>;
export type FigureProduct = z.infer<typeof figureProductSchema>;
export type AdminProduct = z.infer<typeof adminProductSchema>;
export type AdminProductInput =
  | Omit<MangaProduct, "id">
  | Omit<FigureProduct, "id">;
export type ProductCategoryFilter = "ALL" | "MANGA" | "FIGURE";
export type ProductStatusFilter = "ALL" | "IN_STOCK" | "PREORDER" | "OUT_OF_STOCK";

export const ADMIN_PRODUCTS_STORAGE_KEY = "mock_products";
export const ADMIN_PRODUCTS_UPDATED_EVENT = "mock-products-updated";
export interface CheckoutInventorySnapshotItem {
  productVariantId: number;
  productType: "MANGA" | "FIGURE";
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

function createInitialProducts(): AdminProduct[] {
  const catalog = getMockCatalog();
  const products: AdminProduct[] = [];
  for (const series of catalog.mangaSeries) {
    for (const volume of series.volumes) {
      products.push({
        id: `manga-${volume.id}`,
        type: "MANGA",
        seriesId: series.id,
        title: series.title,
        publisher: series.publisher,
        volumeNumber: volume.volumeNumber,
        isbn: "",
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
      });
    }
  }
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
  return products;
}

function readProducts(): AdminProduct[] {
  if (typeof window === "undefined") return createInitialProducts();
  try {
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
    return adminProductsSchema.parse(parsed);
  } catch (error) {
    console.error("Could not read mock product inventory.", error);
    throw new Error("อ่านข้อมูลสินค้าไม่สำเร็จ กรุณาตรวจสอบข้อมูลในเบราว์เซอร์", {
      cause: error,
    });
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
  const maxMangaId = products.reduce(
    (maximum, product) =>
      product.type === "MANGA"
        ? Math.max(maximum, Number(product.id.replace(/^manga-/, "")) || 0)
        : maximum,
    0,
  );
  return Math.max(maxMangaId + 1, 50_000);
}

function numericFigureId(slug: string): string {
  let hash = 2_166_136_261;
  for (const character of slug) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16_777_619);
  }
  return String((hash >>> 0) || 1);
}

function productToCatalog(products: AdminProduct[]): CatalogData {
  const seriesMap = new Map<string, CatalogMangaSeries>();
  const figures: CatalogFigure[] = [];

  for (const product of products) {
    if (product.type === "MANGA") {
      const volumeId = Number(product.id.replace(/^manga-/, ""));
      const volume: CatalogVolume = {
        id: Number.isSafeInteger(volumeId) && volumeId > 0 ? volumeId : 50_000,
        volumeNumber: product.volumeNumber,
        title: `${product.title} เล่ม ${product.volumeNumber}${product.variantLabel ? ` (${product.variantLabel})` : ""}`,
        ...(product.variantLabel ? { variantLabel: product.variantLabel } : {}),
        isbn: product.isbn,
        price: product.price,
        stock: product.stock,
        status: product.status,
        ...(product.expectedShippingDate
          ? { expectedShippingDate: toIsoOrEmpty(product.expectedShippingDate) }
          : {}),
      };
      const series = seriesMap.get(product.seriesId);
      if (series) {
        series.volumes.push(volume);
      } else {
        seriesMap.set(product.seriesId, {
          id: product.seriesId,
          title: product.title,
          publisher: product.publisher,
          volumes: [volume],
        });
      }
      continue;
    }
    figures.push({
      id: numericFigureId(product.slug),
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
      preorderDeadline: product.preorderDeadline
        ? toIsoOrEmpty(product.preorderDeadline)
        : "",
      releaseMonthYear: product.releaseMonthYear,
      status:
        product.stockOrQuotaRemaining === 0 && product.status === "IN_STOCK"
          ? "PREORDER_CLOSED"
          : product.status,
      stockOrQuotaRemaining: product.stockOrQuotaRemaining,
      boxDimensions: { ...product.boxDimensions },
    });
  }

  return {
    mangaSeries: [...seriesMap.values()],
    figures,
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
    const productId =
      id ??
      `manga-${nextCatalogVariantId(products)}`;
    saved = mangaProductSchema.parse({ ...input, id: productId });
  } else {
    const slug = input.slug.trim().toLowerCase();
    if (
      products.some(
        (product) =>
          product.type === "FIGURE" &&
          product.slug === slug &&
          product.id !== id,
      )
    ) {
      throw new Error("URL สินค้านี้ถูกใช้แล้ว กรุณาเลือกชื่อสินค้าอื่น");
    }
    saved = figureProductSchema.parse({
      ...input,
      id: id ?? `figure-${slug}`,
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
    product.type === "MANGA" ? product.stock : product.stockOrQuotaRemaining;
  if (direction === "REMOVE" && quantity > currentStock) {
    throw new Error("จำนวนที่ตัดสต็อกต้องไม่มากกว่าสต็อกคงเหลือ");
  }
  const nextStock =
    currentStock + (direction === "ADD" ? quantity : -quantity);
  const updated: AdminProduct =
    product.type === "MANGA"
      ? {
          ...product,
          stock: nextStock,
          status:
            product.status === "PREORDER"
              ? "PREORDER"
              : nextStock === 0
                ? "OUT_OF_STOCK"
                : "IN_STOCK",
        }
      : {
          ...product,
          stockOrQuotaRemaining: nextStock,
          status:
            product.status === "PREORDER_OPEN" ||
            product.status === "PREORDER_CLOSED"
              ? product.status
              : "IN_STOCK",
        };
  products[index] = updated;
  writeProducts(products);
  return updated;
}

export function getAdminProductsCatalog(): CatalogData {
  return productToCatalog(readProducts());
}

export function getCheckoutInventorySnapshot(): CheckoutInventorySnapshotItem[] {
  return readProducts().map((product) => {
    if (product.type === "MANGA") {
      const productVariantId = Number(product.id.replace(/^manga-/, ""));
      if (!Number.isSafeInteger(productVariantId) || productVariantId <= 0) {
        throw new Error(`รหัส Variant ของสินค้า ${product.id} ไม่ถูกต้อง`);
      }
      return {
        productVariantId,
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
    return {
      productVariantId: Number(numericFigureId(product.slug)),
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
    };
  });
}

export function deductAdminProductInventory(
  items: readonly { productVariantId: number; quantity: number }[],
): void {
  const products = readProducts();
  const nextProducts = products.map((product) => {
    const matching = items.filter((item) => {
      if (product.type === "MANGA") {
        return Number(product.id.replace(/^manga-/, "")) === item.productVariantId;
      }
      return Number(numericFigureId(product.slug)) === item.productVariantId;
    });
    if (matching.length === 0) return product;
    const quantity = matching.reduce((sum, item) => sum + item.quantity, 0);
    const stock =
      product.type === "MANGA" ? product.stock : product.stockOrQuotaRemaining;
    if (stock < quantity) {
      throw new Error(`สต็อกสินค้า ${product.type === "MANGA" ? product.title : product.name} ไม่เพียงพอ`);
    }
    const nextStock = stock - quantity;
    if (product.type === "MANGA") {
      return {
        ...product,
        stock: nextStock,
        status: nextStock === 0 ? "OUT_OF_STOCK" as const : product.status,
      };
    }
    return {
      ...product,
      stockOrQuotaRemaining: nextStock,
      status:
        nextStock === 0 && product.status === "PREORDER_OPEN"
          ? "PREORDER_CLOSED" as const
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
    const matching = items.filter((item) => {
      if (product.type === "MANGA") {
        return Number(product.id.replace(/^manga-/, "")) === item.productVariantId;
      }
      return Number(numericFigureId(product.slug)) === item.productVariantId;
    });
    if (matching.length === 0) return product;
    const quantity = matching.reduce((sum, item) => sum + item.quantity, 0);
    const remaining = product.type === "MANGA"
      ? product.stock
      : product.stockOrQuotaRemaining;
    const nextStock = remaining + quantity;
    const restoredAsPreorder = matching.some((item) => item.isPreorder);
    if (product.type === "MANGA") {
      return {
        ...product,
        stock: nextStock,
        status: restoredAsPreorder ? "PREORDER" as const : "IN_STOCK" as const,
      };
    }
    return {
      ...product,
      stockOrQuotaRemaining: nextStock,
      status: restoredAsPreorder ? "PREORDER_OPEN" as const : "IN_STOCK" as const,
    };
  });
  if (nextProducts.some((product, index) => product !== products[index])) {
    writeProducts(nextProducts);
  }
}

export function findAdminCheckoutVariant(
  productVariantId: number,
): MockCatalogVariant | null {
  const product = readProducts().find((candidate) => {
    if (candidate.type === "MANGA") {
      return Number(candidate.id.replace(/^manga-/, "")) === productVariantId;
    }
    return Number(numericFigureId(candidate.slug)) === productVariantId;
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

export function resetAdminProducts(): void {
  writeProducts(createInitialProducts());
}

export function subscribeToAdminProducts(
  listener: () => void,
): () => void {
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

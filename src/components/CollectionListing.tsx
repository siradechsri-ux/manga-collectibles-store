"use client";

import {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  BookMarked,
  BookOpen,
  Boxes,
  Check,
  Filter,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Truck,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CollectibleProductCard, MangaSeriesCard } from "./ProductCard";
import { useCart } from "../context/CartContext";
import type { CartItem } from "../context/CartContext";
import type {
  CatalogData,
  CatalogFigure,
  CatalogMangaSeries,
} from "../lib/catalog-client";
import type { StoreCollection } from "../lib/store-collections";
import { ProductService } from "../services/product.service";
import { ADMIN_PRODUCTS_UPDATED_EVENT } from "../mocks/admin-products.mock";
import StockAlertModal from "./StockAlertModal";

type StoreStatus = "ALL" | "IN_STOCK" | "PREORDER";
type PriceRange = "ALL" | "UNDER_500" | "500_1500" | "1500_3000" | "OVER_3000";
type SortOption = "POPULAR" | "PRICE_ASC" | "PRICE_DESC" | "TITLE_ASC";

const statusOptions: readonly (readonly [StoreStatus, string])[] = [
  ["ALL", "ทุกสถานะ"],
  ["IN_STOCK", "พร้อมส่ง"],
  ["PREORDER", "เปิดพรีออเดอร์"],
];

const priceOptions: readonly (readonly [PriceRange, string])[] = [
  ["ALL", "ทุกช่วงราคา"],
  ["UNDER_500", "ต่ำกว่า ฿500"],
  ["500_1500", "฿500 - ฿1,500"],
  ["1500_3000", "฿1,500 - ฿3,000"],
  ["OVER_3000", "฿3,000 ขึ้นไป"],
];

const sortOptions: readonly (readonly [SortOption, string])[] = [
  ["POPULAR", "ยอดนิยม / แนะนำ"],
  ["PRICE_ASC", "ราคา: ต่ำไปสูง"],
  ["PRICE_DESC", "ราคา: สูงไปต่ำ"],
  ["TITLE_ASC", "ชื่อสินค้า: ก-ฮ (A-Z)"],
];

function isBookAvailable(series: CatalogMangaSeries): boolean {
  return series.volumes.some(
    (volume) => volume.status === "IN_STOCK" && volume.stock > 0,
  );
}

function isBookPreorder(series: CatalogMangaSeries): boolean {
  return series.volumes.some((volume) => volume.status === "PREORDER");
}

function matchesStatus(item: CatalogFigure, status: StoreStatus): boolean {
  if (status === "ALL") return true;
  if (status === "IN_STOCK") {
    return item.status === "IN_STOCK" && item.stockOrQuotaRemaining > 0;
  }
  return item.status === "PREORDER_OPEN" || item.status === "PREORDER_CLOSED";
}

function matchesBookStatus(
  series: CatalogMangaSeries,
  status: StoreStatus,
): boolean {
  if (status === "ALL") return true;
  return status === "IN_STOCK" ? isBookAvailable(series) : isBookPreorder(series);
}

function matchesPriceRange(price: number, range: PriceRange): boolean {
  if (range === "ALL") return true;
  if (range === "UNDER_500") return price < 500;
  if (range === "500_1500") return price >= 500 && price <= 1500;
  if (range === "1500_3000") return price > 1500 && price <= 3000;
  if (range === "OVER_3000") return price > 3000;
  return true;
}

export default function CollectionListing({
  collection,
  initialStatus = "ALL",
}: {
  collection: StoreCollection;
  initialStatus?: StoreStatus;
}) {
  const { addItem } = useCart();
  const [catalog, setCatalog] = useState<CatalogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StoreStatus>(initialStatus);
  const [selectedBrand, setSelectedBrand] = useState<string>("ALL");
  const [priceRange, setPriceRange] = useState<PriceRange>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("POPULAR");
  const [cartNotice, setCartNotice] = useState<string | null>(null);

  // Stock alert modal state
  const [stockAlertModal, setStockAlertModal] = useState<{
    open: boolean;
    productId: string | number;
    productTitle: string;
  }>({ open: false, productId: "", productTitle: "" });

  const loadCatalog = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      setCatalog(await ProductService.getProducts());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "ไม่สามารถโหลดรายการสินค้าได้",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  useEffect(() => {
    void loadCatalog();
    if (process.env.NEXT_PUBLIC_USE_MOCK !== "true") return;
    const refresh = (): void => {
      void loadCatalog();
    };
    window.addEventListener(ADMIN_PRODUCTS_UPDATED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(ADMIN_PRODUCTS_UPDATED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [loadCatalog]);

  const isBookCategory =
    collection.slug === "manga" || collection.slug === "light-novel";

  const bookSeries = useMemo(() => {
    if (!catalog) return [];
    return collection.slug === "manga"
      ? catalog.mangaSeries
      : collection.slug === "light-novel"
        ? catalog.lightNovelSeries
        : [];
  }, [catalog, collection.slug]);

  const collectibleItems = useMemo(() => {
    if (!catalog) return [];
    switch (collection.slug) {
      case "figures":
        return [...catalog.figures, ...catalog.plamo];
      case "goods":
        return catalog.goods;
      case "accessories":
        return catalog.accessories;
      default:
        return [];
    }
  }, [catalog, collection.slug]);

  // Extract unique brands / publishers
  const brandList = useMemo(() => {
    if (isBookCategory) {
      const pubs = new Set<string>();
      bookSeries.forEach((b) => {
        if (b.publisher) pubs.add(b.publisher);
      });
      return Array.from(pubs).sort();
    }
    const brands = new Set<string>();
    collectibleItems.forEach((c) => {
      if (c.manufacturer) brands.add(c.manufacturer);
    });
    return Array.from(brands).sort();
  }, [isBookCategory, bookSeries, collectibleItems]);

  // Filtered & Sorted Books
  const filteredBooks = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    let result = bookSeries.filter((series) => {
      const searchable = `${series.title} ${series.publisher} ${series.author ?? ""} ${(series.altTitles ?? []).join(" ")}`;
      const matchesQuery = searchable
        .toLocaleLowerCase()
        .includes(normalizedQuery);
      const matchesBrand =
        selectedBrand === "ALL" || series.publisher === selectedBrand;
      const startingPrice = series.volumes.length
        ? Math.min(...series.volumes.map((v) => v.price))
        : 0;
      const matchesPrice = matchesPriceRange(startingPrice, priceRange);

      return (
        matchesQuery &&
        matchesBookStatus(series, status) &&
        matchesBrand &&
        matchesPrice
      );
    });

    // Sorting
    if (sortBy === "PRICE_ASC") {
      result = [...result].sort((a, b) => {
        const minA = a.volumes.length ? Math.min(...a.volumes.map((v) => v.price)) : 0;
        const minB = b.volumes.length ? Math.min(...b.volumes.map((v) => v.price)) : 0;
        return minA - minB;
      });
    } else if (sortBy === "PRICE_DESC") {
      result = [...result].sort((a, b) => {
        const minA = a.volumes.length ? Math.min(...a.volumes.map((v) => v.price)) : 0;
        const minB = b.volumes.length ? Math.min(...b.volumes.map((v) => v.price)) : 0;
        return minB - minA;
      });
    } else if (sortBy === "TITLE_ASC") {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title, "th"));
    }

    return result;
  }, [bookSeries, query, status, selectedBrand, priceRange, sortBy]);

  // Filtered & Sorted Collectibles
  const filteredCollectibles = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    let result = collectibleItems.filter((item) => {
      const searchable = `${item.name} ${item.series} ${item.character} ${item.manufacturer} ${item.janCode} ${item.grade ?? ""} ${(item.altTitles ?? []).join(" ")}`;
      const matchesQuery = searchable
        .toLocaleLowerCase()
        .includes(normalizedQuery);
      const matchesBrand =
        selectedBrand === "ALL" || item.manufacturer === selectedBrand;
      const matchesPrice = matchesPriceRange(item.fullPrice, priceRange);

      return (
        matchesQuery &&
        matchesStatus(item, status) &&
        matchesBrand &&
        matchesPrice
      );
    });

    // Sorting
    if (sortBy === "PRICE_ASC") {
      result = [...result].sort((a, b) => a.fullPrice - b.fullPrice);
    } else if (sortBy === "PRICE_DESC") {
      result = [...result].sort((a, b) => b.fullPrice - a.fullPrice);
    } else if (sortBy === "TITLE_ASC") {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name, "th"));
    }

    return result;
  }, [collectibleItems, query, status, selectedBrand, priceRange, sortBy]);

  function addCollectibleToCart(item: CatalogFigure): void {
    const id = Number(item.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
      setCartNotice("รหัสสินค้าไม่ถูกต้อง ไม่สามารถเพิ่มลงตะกร้าได้");
      return;
    }

    const image = item.coverImage || item.images?.[0] || null;
    const boxDimensions = item.boxDimensions;
    if (item.category === "PLAMO") {
      addItem({
        kind: "PLAMO",
        id,
        name: item.name,
        image,
        coverImage: image,
        imageUrl: image,
        fullPrice: item.fullPrice,
        depositAmount: item.depositAmount,
        selectedPaymentType: "FULL",
        quantity: 1,
        boxDimensions,
        grade: item.grade,
      });
    } else if (item.category === "GOODS") {
      addItem({
        kind: "GOODS",
        id,
        name: item.name,
        image,
        coverImage: image,
        imageUrl: image,
        fullPrice: item.fullPrice,
        quantity: 1,
        subcategory: item.subcategory,
      });
    } else if (item.category === "ACCESSORY") {
      addItem({
        kind: "ACCESSORY",
        id,
        name: item.name,
        image,
        coverImage: image,
        imageUrl: image,
        fullPrice: item.fullPrice,
        quantity: 1,
        subcategory: item.subcategory,
        boxDimensions,
      });
    } else {
      addItem({
        kind: "FIGURE",
        id,
        name: item.name,
        image,
        coverImage: image,
        imageUrl: image,
        fullPrice: item.fullPrice,
        depositAmount: item.depositAmount,
        selectedPaymentType: "FULL",
        quantity: 1,
        boxDimensions,
      });
    }
    setCartNotice(`เพิ่ม “${item.name}” ลงในตะกร้าเรียบร้อยแล้ว`);
  }

  const hasActiveFilters =
    query.trim() !== "" ||
    status !== "ALL" ||
    selectedBrand !== "ALL" ||
    priceRange !== "ALL" ||
    sortBy !== "POPULAR";

  const clearAllFilters = () => {
    setQuery("");
    setStatus("ALL");
    setSelectedBrand("ALL");
    setPriceRange("ALL");
    setSortBy("POPULAR");
  };

  const productCount = isBookCategory
    ? filteredBooks.length
    : filteredCollectibles.length;
  const hasResults = productCount > 0;

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/"
          className="inline-flex min-h-9 items-center gap-2 text-sm font-semibold text-zinc-600 transition hover:text-blue-700 dark:text-zinc-300 dark:hover:text-blue-400"
        >
          <ArrowLeft size={17} aria-hidden="true" /> กลับหน้าหมวดหมู่
        </Link>

        <header className="mt-5 flex flex-wrap items-end justify-between gap-4 border-b border-zinc-200 pb-5 dark:border-zinc-800">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-400">
              {collection.subtitle}
            </p>
            <h1 className="mt-1 text-3xl font-black text-zinc-950 dark:text-zinc-100">
              {collection.title}
            </h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {collection.description}
            </p>
          </div>
          {!loading && !error ? (
            <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              {productCount.toLocaleString("th-TH")} รายการ
            </span>
          ) : null}
        </header>

        {cartNotice ? (
          <div
            role="status"
            className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
          >
            <span className="flex items-center gap-2">
              <Check size={16} aria-hidden="true" />
              {cartNotice}
            </span>
            <Link
              href="/checkout"
              className="inline-flex items-center gap-1 font-bold underline underline-offset-4"
            >
              ไปที่ตะกร้า <ArrowRight size={14} aria-hidden="true" />
            </Link>
            <button
              type="button"
              aria-label="ปิดการแจ้งเตือน"
              onClick={() => setCartNotice(null)}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        ) : null}

        {/* Filter & Search Bar */}
        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          {/* Search Input */}
          <label className="flex min-h-11 items-center gap-3 rounded-xl border border-zinc-300 px-3 text-zinc-500 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 dark:border-zinc-700 dark:text-zinc-400">
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ค้นหาชื่อเรื่อง ตัวละคร สำนักพิมพ์ ค่ายฟิกเกอร์ หรือรหัสสินค้า"
              aria-label="ค้นหาในหมวดสินค้า"
              className="min-w-0 flex-1 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="ล้างคำค้นหา"
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X size={16} aria-hidden="true" />
              </button>
            ) : null}
          </label>

          {/* Faceted Filter Options */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* 1. Status Filter */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                สถานะสต็อก
              </label>
              <div className="flex flex-wrap gap-1.5">
                {statusOptions.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={status === value}
                    onClick={() => setStatus(value)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                      status === value
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-750 dark:bg-zinc-800 dark:text-zinc-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Publisher / Brand Filter */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                {isBookCategory ? "สำนักพิมพ์" : "ผู้ผลิต / ค่าย"}
              </label>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 shadow-2xs focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              >
                <option value="ALL">
                  {isBookCategory ? "ทุกสำนักพิมพ์" : "ทุกผู้ผลิต / ค่าย"}
                </option>
                {brandList.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Price Range Filter */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                ช่วงราคา
              </label>
              <select
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value as PriceRange)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 shadow-2xs focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              >
                {priceOptions.map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Sorting Options */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                จัดเรียงลำดับ
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 shadow-2xs focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              >
                {sortOptions.map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Filter Tags & Reset */}
          {hasActiveFilters && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                ตัวกรองที่เลือก:
              </span>
              {query && (
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                  ค้นหา: “{query}”
                  <button type="button" onClick={() => setQuery("")}>
                    <X size={12} />
                  </button>
                </span>
              )}
              {status !== "ALL" && (
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                  {statusOptions.find((s) => s[0] === status)?.[1]}
                  <button type="button" onClick={() => setStatus("ALL")}>
                    <X size={12} />
                  </button>
                </span>
              )}
              {selectedBrand !== "ALL" && (
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                  {selectedBrand}
                  <button type="button" onClick={() => setSelectedBrand("ALL")}>
                    <X size={12} />
                  </button>
                </span>
              )}
              {priceRange !== "ALL" && (
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                  {priceOptions.find((p) => p[0] === priceRange)?.[1]}
                  <button type="button" onClick={() => setPriceRange("ALL")}>
                    <X size={12} />
                  </button>
                </span>
              )}
              {sortBy !== "POPULAR" && (
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                  เรียง: {sortOptions.find((s) => s[0] === sortBy)?.[1]}
                  <button type="button" onClick={() => setSortBy("POPULAR")}>
                    <X size={12} />
                  </button>
                </span>
              )}
              <button
                type="button"
                onClick={clearAllFilters}
                className="ml-auto text-xs font-bold text-red-600 hover:text-red-700 dark:text-red-400"
              >
                ล้างตัวกรองทั้งหมด
              </button>
            </div>
          )}
        </section>

        {loading ? (
          <div
            className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            aria-label="กำลังโหลดสินค้า"
          >
            {[0, 1, 2, 3, 4, 5].map((item) => (
              <div
                key={item}
                className="h-72 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-900"
              />
            ))}
          </div>
        ) : error ? (
          <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center dark:border-amber-900 dark:bg-amber-950/40">
            <p
              role="alert"
              className="font-semibold text-amber-950 dark:text-amber-100"
            >
              {error}
            </p>
            <button
              type="button"
              onClick={() => void loadCatalog()}
              className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-bold text-white dark:bg-zinc-100 dark:text-zinc-950"
            >
              <RefreshCw size={15} aria-hidden="true" /> ลองอีกครั้ง
            </button>
          </section>
        ) : hasResults ? (
          isBookCategory ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredBooks.map((series) => (
                <MangaSeriesCard
                  key={series.id}
                  series={series}
                  type={
                    collection.slug === "light-novel" ? "LIGHT_NOVEL" : "MANGA"
                  }
                  returnTo={`/collections/${collection.slug}`}
                />
              ))}
            </div>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCollectibles.map((item) => (
                <CollectibleProductCard
                  key={item.id}
                  item={item}
                  onAddToCart={addCollectibleToCart}
                  returnTo={`/collections/${collection.slug}`}
                />
              ))}
            </div>
          )
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center dark:border-zinc-700 dark:bg-zinc-900">
            <Package
              className="mx-auto text-zinc-400"
              size={36}
              aria-hidden="true"
            />
            <p className="mt-3 font-bold text-zinc-800 dark:text-zinc-200">
              {hasActiveFilters
                ? "ไม่พบสินค้าที่ตรงกับเงื่อนไขการค้นหาและตัวกรอง"
                : "ยังไม่มีสินค้าในหมวดนี้"}
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              ลองปรับเปลี่ยนคำค้นหา หรือกดล้างตัวกรองเพื่อดูรายการสินค้าทั้งหมด
            </p>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearAllFilters}
                className="mt-4 inline-flex min-h-9 items-center rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
              >
                ล้างตัวกรองทั้งหมด
              </button>
            ) : null}
          </div>
        )}
      </div>

      {/* Back in stock notification modal */}
      <StockAlertModal
        isOpen={stockAlertModal.open}
        onClose={() =>
          setStockAlertModal({ open: false, productId: "", productTitle: "" })
        }
        productId={stockAlertModal.productId}
        productTitle={stockAlertModal.productTitle}
      />
    </main>
  );
}
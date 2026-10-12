"use client";

import {
  ArrowLeft,
  ArrowRight,
  BookMarked,
  BookOpen,
  Boxes,
  Check,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
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

type StoreStatus = "ALL" | "IN_STOCK" | "PREORDER";

const statusOptions: readonly (readonly [StoreStatus, string])[] = [
  ["ALL", "ทุกสถานะ"],
  ["IN_STOCK", "พร้อมส่ง"],
  ["PREORDER", "เปิดพรีออเดอร์"],
];

function isBookAvailable(series: CatalogMangaSeries): boolean {
  return series.volumes.some((volume) => volume.status === "IN_STOCK" && volume.stock > 0);
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

function matchesBookStatus(series: CatalogMangaSeries, status: StoreStatus): boolean {
  if (status === "ALL") return true;
  return status === "IN_STOCK" ? isBookAvailable(series) : isBookPreorder(series);
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
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StoreStatus>(initialStatus);
  const [cartNotice, setCartNotice] = useState<string | null>(null);

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

  const filteredBooks = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return bookSeries.filter((series) => {
      const searchable = `${series.title} ${series.publisher} ${series.author ?? ""} ${(series.altTitles ?? []).join(" ")}`;
      const matchesQuery = searchable.toLocaleLowerCase().includes(normalizedQuery);
      return matchesQuery && matchesBookStatus(series, status);
    });
  }, [bookSeries, query, status]);

  const filteredCollectibles = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return collectibleItems.filter((item) => {
      const searchable = `${item.name} ${item.series} ${item.character} ${item.manufacturer} ${item.janCode} ${item.grade ?? ""} ${(item.altTitles ?? []).join(" ")}`;
      return (
        searchable.toLocaleLowerCase().includes(normalizedQuery) &&
        matchesStatus(item, status)
      );
    });
  }, [collectibleItems, query, status]);

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

  const productCount =
    collection.slug === "manga" || collection.slug === "light-novel"
      ? filteredBooks.length
      : filteredCollectibles.length;
  const hasResults =
    collection.slug === "manga" || collection.slug === "light-novel"
      ? filteredBooks.length > 0
      : filteredCollectibles.length > 0;

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/"
          className="inline-flex min-h-9 items-center gap-2 text-sm font-semibold text-zinc-600 transition hover:text-orange-700 dark:text-zinc-300 dark:hover:text-orange-400"
        >
          <ArrowLeft size={17} aria-hidden="true" /> กลับหน้าหมวดหมู่
        </Link>

        <header className="mt-5 flex flex-wrap items-end justify-between gap-4 border-b border-zinc-200 pb-5 dark:border-zinc-800">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-700 dark:text-orange-400">
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
          <div role="status" className="mt-5 flex items-center justify-between gap-3 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
            <span className="flex items-center gap-2"><Check size={16} aria-hidden="true" />{cartNotice}</span>
            <Link href="/checkout" className="inline-flex items-center gap-1 font-bold underline underline-offset-4">
              ไปที่ตะกร้า <ArrowRight size={14} aria-hidden="true" />
            </Link>
            <button type="button" aria-label="ปิดการแจ้งเตือน" onClick={() => setCartNotice(null)}>
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        ) : null}

        <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <label className="flex min-h-11 items-center gap-3 rounded-lg border border-zinc-300 px-3 text-zinc-500 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500 dark:border-zinc-700 dark:text-zinc-400">
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ค้นหาชื่อเรื่อง ตัวละคร สำนักพิมพ์ หรือผู้ผลิต"
              aria-label="ค้นหาในหมวดสินค้า"
              className="min-w-0 flex-1 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
            {query ? (
              <button type="button" onClick={() => setQuery("")} aria-label="ล้างคำค้นหา">
                <X size={16} aria-hidden="true" />
              </button>
            ) : null}
          </label>
          <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="กรองสถานะสินค้า">
            <span className="mr-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">สถานะ:</span>
            {statusOptions.map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={status === value}
                onClick={() => setStatus(value)}
                className={`min-h-8 rounded-full border px-3 text-xs font-bold transition ${
                  status === value
                    ? "border-orange-600 bg-orange-600 text-white"
                    : "border-zinc-300 text-zinc-700 hover:border-orange-400 dark:border-zinc-700 dark:text-zinc-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="กำลังโหลดสินค้า">
            {[0, 1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="h-72 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-900" />
            ))}
          </div>
        ) : error ? (
          <section className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-8 text-center dark:border-amber-900 dark:bg-amber-950/40">
            <p role="alert" className="font-semibold text-amber-950 dark:text-amber-100">{error}</p>
            <button type="button" onClick={() => void loadCatalog()} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-bold text-white dark:bg-zinc-100 dark:text-zinc-950">
              <RefreshCw size={15} aria-hidden="true" /> ลองอีกครั้ง
            </button>
          </section>
        ) : hasResults ? (
          collection.slug === "manga" || collection.slug === "light-novel" ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredBooks.map((series) => (
                <MangaSeriesCard
                  key={series.id}
                  series={series}
                  type={collection.slug === "light-novel" ? "LIGHT_NOVEL" : "MANGA"}
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
          <div className="mt-6 rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center dark:border-zinc-700 dark:bg-zinc-900">
            <Package className="mx-auto text-zinc-400" size={34} aria-hidden="true" />
            <p className="mt-3 font-semibold text-zinc-700 dark:text-zinc-300">
              {query || status !== "ALL" ? "ไม่พบสินค้าที่ตรงกับตัวกรอง" : "ยังไม่มีสินค้าในหมวดนี้"}
            </p>
            {query || status !== "ALL" ? (
              <button type="button" onClick={() => { setQuery(""); setStatus("ALL"); }} className="mt-4 min-h-10 rounded-lg border border-zinc-300 px-4 text-sm font-bold dark:border-zinc-700">
                ล้างตัวกรอง
              </button>
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}
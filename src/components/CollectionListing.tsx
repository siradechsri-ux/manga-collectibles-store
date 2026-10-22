"use client";

import {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  Award,
  BookMarked,
  BookOpen,
  Boxes,
  Check,
  ChevronDown,
  Compass,
  Dumbbell,
  Film,
  Filter,
  Flame,
  Layers,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Smile,
  Sparkles,
  Star,
  Swords,
  Tag,
  TrendingUp,
  Trophy,
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
import {
  MANGA_GENRES,
  filterMangaByGenre,
  getMangaGenreMeta,
  COLLECTIBLE_BEST_SELLER_MAP,
} from "../lib/manga-genres";
import {
  getProductEffectiveBestSellerRank,
  getBestSellerSettings,
  BEST_SELLER_SETTINGS_CHANGED_EVENT,
  type BestSellerSettings,
} from "../services/best-seller-settings.service";

type StoreStatus = "ALL" | "IN_STOCK" | "PREORDER";
type PriceRange = "ALL" | "UNDER_500" | "500_1500" | "1500_3000" | "OVER_3000";
type SortOption = "POPULAR" | "NEW_ARRIVALS" | "BEST_SELLER" | "PRICE_ASC" | "PRICE_DESC" | "TITLE_ASC";

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
  ["NEW_ARRIVALS", "สินค้าใหม่ประจำสัปดาห์ (New Arrivals)"],
  ["BEST_SELLER", "สินค้าขายดีที่สุด (อันดับ 1-10)"],
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

function GenreIcon({ name }: { name: string }) {
  switch (name) {
    case "Swords":
      return <Swords size={13} aria-hidden="true" />;
    case "ShieldAlert":
      return <ShieldAlert size={13} aria-hidden="true" />;
    case "Compass":
      return <Compass size={13} aria-hidden="true" />;
    case "Dumbbell":
      return <Dumbbell size={13} aria-hidden="true" />;
    case "Smile":
      return <Smile size={13} aria-hidden="true" />;
    case "Film":
      return <Film size={13} aria-hidden="true" />;
    default:
      return <BookOpen size={13} aria-hidden="true" />;
  }
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
  const [onlyBestSeller, setOnlyBestSeller] = useState(false);
  const [cartNotice, setCartNotice] = useState<string | null>(null);
  const [bsSettings, setBsSettings] = useState<BestSellerSettings>(getBestSellerSettings);

  useEffect(() => {
    const update = () => {
      setBsSettings(getBestSellerSettings());
    };
    update();
    window.addEventListener(BEST_SELLER_SETTINGS_CHANGED_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(BEST_SELLER_SETTINGS_CHANGED_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);

  // Manga Genre state (when collection.slug === 'manga')
  const [selectedGenre, setSelectedGenre] = useState<string>("all");

  // Sidebar Accordion States (BookWalker Style)
  const [specialOpen, setSpecialOpen] = useState(true);
  const [genreOpen, setGenreOpen] = useState(true);
  const [brandOpen, setBrandOpen] = useState(true);
  const [priceOpen, setPriceOpen] = useState(true);
  const [brandSearch, setBrandSearch] = useState("");

  // Desktop Sidebar Visible / Collapsed state
  const [desktopFilterOpen, setDesktopFilterOpen] = useState(true);

  // Mobile Filter Drawer
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

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

  // Read URL query params on load (genre, filter, sort)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const g = params.get("genre");
      if (g) setSelectedGenre(g);
      const f = params.get("filter");
      const bs = params.get("bestSeller");
      if (f === "best-seller" || bs === "true") {
        setOnlyBestSeller(true);
        setSortBy("BEST_SELLER");
      } else if (f === "new" || f === "new-arrivals") {
        setSortBy("NEW_ARRIVALS");
      }
      const s = params.get("sort");
      if (s === "best-seller" || s === "BEST_SELLER") {
        setSortBy("BEST_SELLER");
      } else if (s === "new" || s === "NEW_ARRIVALS" || s === "new-arrivals") {
        setSortBy("NEW_ARRIVALS");
      }
    }
  }, []);

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
  const isNovelCategory = collection.slug === "light-novel";

  // Base list of book series (before genre filter) to calculate counts and brands accurately
  const baseBookSeries = useMemo(() => {
    if (!catalog) return [];
    if (collection.slug === "manga") {
      return catalog.mangaSeries;
    }
    if (collection.slug === "light-novel") {
      return catalog.lightNovelSeries;
    }
    return [];
  }, [catalog, collection.slug]);

  // Filtered by selected genre
  const bookSeries = useMemo(() => {
    if (!catalog) return [];
    if (collection.slug === "manga") {
      return filterMangaByGenre(catalog.mangaSeries, selectedGenre);
    }
    if (collection.slug === "light-novel") {
      return catalog.lightNovelSeries;
    }
    return [];
  }, [catalog, collection.slug, selectedGenre]);

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
      baseBookSeries.forEach((b) => {
        if (b.publisher) pubs.add(b.publisher);
      });
      return Array.from(pubs).sort();
    }
    const brands = new Set<string>();
    collectibleItems.forEach((c) => {
      if (c.manufacturer) brands.add(c.manufacturer);
    });
    return Array.from(brands).sort();
  }, [isBookCategory, baseBookSeries, collectibleItems]);

  // Filtered Brand List for search box inside accordion
  const filteredBrandList = useMemo(() => {
    if (!brandSearch.trim()) return brandList;
    const q = brandSearch.trim().toLowerCase();
    return brandList.filter((b) => b.toLowerCase().includes(q));
  }, [brandList, brandSearch]);

  // Item counts for filter badges (BookWalker style)
  const counts = useMemo(() => {
    if (isBookCategory) {
      const bestSellerCount = baseBookSeries.filter((series) => {
        const rankInfo = getProductEffectiveBestSellerRank(
          series.id,
          isNovelCategory ? "LIGHT_NOVEL" : "MANGA",
          bsSettings,
        );
        return Boolean(rankInfo && rankInfo.rank <= 10);
      }).length;
      const inStockCount = baseBookSeries.filter((series) => isBookAvailable(series)).length;
      const preorderCount = baseBookSeries.filter((series) => isBookPreorder(series)).length;

      const genreCounts: Record<string, number> = {};
      for (const g of MANGA_GENRES) {
        genreCounts[g.key] = filterMangaByGenre(baseBookSeries, g.key).length;
      }

      const brandCounts: Record<string, number> = {};
      for (const series of baseBookSeries) {
        const pub = series.publisher || "อื่นๆ";
        brandCounts[pub] = (brandCounts[pub] || 0) + 1;
      }

      const priceCounts: Record<PriceRange, number> = {
        ALL: baseBookSeries.length,
        UNDER_500: 0,
        "500_1500": 0,
        "1500_3000": 0,
        OVER_3000: 0,
      };
      for (const series of baseBookSeries) {
        const startingPrice = series.volumes.length
          ? Math.min(...series.volumes.map((v) => v.price))
          : 0;
        if (startingPrice < 500) priceCounts.UNDER_500++;
        else if (startingPrice <= 1500) priceCounts["500_1500"]++;
        else if (startingPrice <= 3000) priceCounts["1500_3000"]++;
        else priceCounts.OVER_3000++;
      }

      return {
        total: baseBookSeries.length,
        bestSellerCount,
        inStockCount,
        preorderCount,
        genreCounts,
        brandCounts,
        priceCounts,
      };
    } else {
      const bestSellerCount = collectibleItems.filter((item) => {
        const rankInfo = getProductEffectiveBestSellerRank(
          item.id,
          item.category,
          bsSettings,
        );
        return Boolean(rankInfo && rankInfo.rank <= 10);
      }).length;
      const inStockCount = collectibleItems.filter(
        (item) => item.status === "IN_STOCK" && item.stockOrQuotaRemaining > 0,
      ).length;
      const preorderCount = collectibleItems.filter(
        (item) => item.status === "PREORDER_OPEN" || item.status === "PREORDER_CLOSED",
      ).length;

      const brandCounts: Record<string, number> = {};
      for (const item of collectibleItems) {
        const brand = item.manufacturer || "อื่นๆ";
        brandCounts[brand] = (brandCounts[brand] || 0) + 1;
      }

      const priceCounts: Record<PriceRange, number> = {
        ALL: collectibleItems.length,
        UNDER_500: 0,
        "500_1500": 0,
        "1500_3000": 0,
        OVER_3000: 0,
      };
      for (const item of collectibleItems) {
        const price = item.fullPrice;
        if (price < 500) priceCounts.UNDER_500++;
        else if (price <= 1500) priceCounts["500_1500"]++;
        else if (price <= 3000) priceCounts["1500_3000"]++;
        else priceCounts.OVER_3000++;
      }

      return {
        total: collectibleItems.length,
        bestSellerCount,
        inStockCount,
        preorderCount,
        genreCounts: {} as Record<string, number>,
        brandCounts,
        priceCounts,
      };
    }
  }, [baseBookSeries, collectibleItems, isBookCategory, isNovelCategory, bsSettings]);

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

      // Best Seller Filter condition
      const rankInfo = getProductEffectiveBestSellerRank(
        series.id,
        isNovelCategory ? "LIGHT_NOVEL" : "MANGA",
        bsSettings,
      );
      const matchesBestSeller = !onlyBestSeller || Boolean(rankInfo && rankInfo.rank <= 10);

      return (
        matchesQuery &&
        matchesBookStatus(series, status) &&
        matchesBrand &&
        matchesPrice &&
        matchesBestSeller
      );
    });

    // Book Series Sorting
    if (sortBy === "NEW_ARRIVALS") {
      result = [...result].sort((a, b) => (b.volumes.length || 0) - (a.volumes.length || 0));
    } else if (sortBy === "BEST_SELLER") {
      result = [...result].sort((a, b) => {
        const rankA =
          getProductEffectiveBestSellerRank(a.id, isNovelCategory ? "LIGHT_NOVEL" : "MANGA", bsSettings)?.rank ?? 999;
        const rankB =
          getProductEffectiveBestSellerRank(b.id, isNovelCategory ? "LIGHT_NOVEL" : "MANGA", bsSettings)?.rank ?? 999;
        return rankA - rankB;
      });
    } else if (sortBy === "PRICE_ASC") {
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
  }, [bookSeries, query, status, selectedBrand, priceRange, sortBy, onlyBestSeller, isNovelCategory, bsSettings]);

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

      // Best Seller Filter condition
      const rankInfo = getProductEffectiveBestSellerRank(
        item.id,
        item.category,
        bsSettings,
      );
      const matchesBestSeller = !onlyBestSeller || Boolean(rankInfo && rankInfo.rank <= 10);

      return (
        matchesQuery &&
        (status === "ALL"
          ? true
          : status === "IN_STOCK"
            ? item.status === "IN_STOCK" && item.stockOrQuotaRemaining > 0
            : item.status === "PREORDER_OPEN" || item.status === "PREORDER_CLOSED") &&
        matchesBrand &&
        matchesPrice &&
        matchesBestSeller
      );
    });

    // Collectible Sorting
    if (sortBy === "NEW_ARRIVALS") {
      result = [...result].sort((a, b) => {
        const dateA = a.releaseMonthYear || "";
        const dateB = b.releaseMonthYear || "";
        if (dateA !== dateB) return dateB.localeCompare(dateA);
        return Number(b.id) - Number(a.id);
      });
    } else if (sortBy === "BEST_SELLER") {
      result = [...result].sort((a, b) => {
        const rankA =
          getProductEffectiveBestSellerRank(a.id, a.category, bsSettings)?.rank ?? 999;
        const rankB =
          getProductEffectiveBestSellerRank(b.id, b.category, bsSettings)?.rank ?? 999;
        return rankA - rankB;
      });
    } else if (sortBy === "PRICE_ASC") {
      result = [...result].sort((a, b) => a.fullPrice - b.fullPrice);
    } else if (sortBy === "PRICE_DESC") {
      result = [...result].sort((a, b) => b.fullPrice - a.fullPrice);
    } else if (sortBy === "TITLE_ASC") {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name, "th"));
    }

    return result;
  }, [collectibleItems, query, status, selectedBrand, priceRange, sortBy, onlyBestSeller, bsSettings]);

  function addCollectibleToCart(item: CatalogFigure): void {
    const id = Number(item.id);
    const image = item.coverImage || item.coverUrl || item.images[0] || null;
    const boxDimensions = {
      widthCm: item.boxDimensions.widthCm,
      lengthCm: item.boxDimensions.lengthCm,
      heightCm: item.boxDimensions.heightCm,
    };

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

  const toggleBestSeller = () => {
    const nextVal = !onlyBestSeller;
    setOnlyBestSeller(nextVal);
    if (nextVal && sortBy === "POPULAR") {
      setSortBy("BEST_SELLER");
    }
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (nextVal) {
        url.searchParams.set("filter", "best-seller");
      } else {
        url.searchParams.delete("filter");
      }
      window.history.replaceState({}, "", url.toString());
    }
  };

  const handleSelectGenre = (genreKey: string) => {
    setSelectedGenre(genreKey);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (genreKey === "all") {
        url.searchParams.delete("genre");
      } else {
        url.searchParams.set("genre", genreKey);
      }
      window.history.replaceState({}, "", url.toString());
    }
  };

  const clearAllFilters = () => {
    setQuery("");
    setStatus("ALL");
    setSelectedBrand("ALL");
    setPriceRange("ALL");
    setSelectedGenre("all");
    setOnlyBestSeller(false);
    setSortBy("POPULAR");
    setBrandSearch("");
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("genre");
      url.searchParams.delete("filter");
      url.searchParams.delete("bestSeller");
      url.searchParams.delete("sort");
      window.history.replaceState({}, "", url.toString());
    }
  };

  const hasActiveFilters =
    query.trim() !== "" ||
    status !== "ALL" ||
    selectedBrand !== "ALL" ||
    priceRange !== "ALL" ||
    selectedGenre !== "all" ||
    onlyBestSeller ||
    sortBy !== "POPULAR";

  const activeFilterCount =
    (query.trim() !== "" ? 1 : 0) +
    (status !== "ALL" ? 1 : 0) +
    (selectedBrand !== "ALL" ? 1 : 0) +
    (priceRange !== "ALL" ? 1 : 0) +
    (selectedGenre !== "all" ? 1 : 0) +
    (onlyBestSeller ? 1 : 0) +
    (sortBy !== "POPULAR" ? 1 : 0);

  const productCount = isBookCategory
    ? filteredBooks.length
    : filteredCollectibles.length;

  const hasResults = productCount > 0;

  // Shared Filter Sections (BookWalker Sidebar Style)
  const renderFilterSections = (isMobile = false) => (
    <div className="space-y-4">
      {/* Sidebar Header (Desktop) */}
      {!isMobile && (
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200/80 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={15} className="text-orange-600 dark:text-orange-400" />
            <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-100">กรองผลลัพธ์</h2>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs font-bold text-red-600 hover:text-red-700 dark:text-red-400 hover:underline"
              >
                ล้างทั้งหมด
              </button>
            )}
            <button
              type="button"
              onClick={() => setDesktopFilterOpen(false)}
              className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition"
              title="ซ่อนแถบฟิลเตอร์"
              aria-label="ซ่อนแถบฟิลเตอร์"
            >
              <PanelLeftClose size={15} />
            </button>
          </div>
        </div>
      )}

      {/* 1. Special Options (ตัวเลือกพิเศษ) */}
      <div className="border-b border-zinc-100 pb-3 dark:border-zinc-800/80">
        <button
          type="button"
          onClick={() => setSpecialOpen((v) => !v)}
          className="flex w-full items-center justify-between py-1 text-xs font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200"
        >
          <span className="flex items-center gap-1.5">
            <Sparkles size={13} className="text-amber-500" />
            ตัวเลือกพิเศษ
          </span>
          <ChevronDown
            size={14}
            className={`text-zinc-400 transition-transform duration-200 ${specialOpen ? "rotate-180" : ""}`}
          />
        </button>

        {specialOpen && (
          <div className="mt-2 space-y-1.5 pt-1">
            {/* Best Seller Toggle Button */}
            <button
              type="button"
              onClick={toggleBestSeller}
              className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-bold transition ${
                onlyBestSeller
                  ? "bg-amber-500 text-white shadow-2xs"
                  : "bg-amber-50/70 text-amber-900 hover:bg-amber-100/70 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-950/70"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Flame size={13} className={onlyBestSeller ? "text-white" : "text-amber-600 dark:text-amber-400"} />
                <span>สินค้าขายดีติดอันดับ</span>
              </span>
              <span className={`text-[10px] ${onlyBestSeller ? "text-amber-100" : "text-amber-700/80 dark:text-amber-400"}`}>
                ({counts.bestSellerCount})
              </span>
            </button>

            {/* Status Options */}
            <div className="pt-1 space-y-1">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                สถานะสินค้า
              </span>
              {statusOptions.map(([val, label]) => {
                const isSelected = status === val;
                const count =
                  val === "ALL"
                    ? counts.total
                    : val === "IN_STOCK"
                      ? counts.inStockCount
                      : counts.preorderCount;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setStatus(val)}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                      isSelected
                        ? "bg-orange-50 font-black text-orange-700 dark:bg-orange-950/50 dark:text-orange-300"
                        : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isSelected ? "bg-orange-600" : "bg-zinc-300 dark:bg-zinc-700"
                        }`}
                      />
                      <span>{label}</span>
                    </span>
                    <span className="text-[10px] text-zinc-400">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 2. Manga Genres (ประเภทมังงะ - BookWalker style tag cloud) */}
      {collection.slug === "manga" && (
        <div className="border-b border-zinc-100 pb-3 dark:border-zinc-800/80">
          <button
            type="button"
            onClick={() => setGenreOpen((v) => !v)}
            className="flex w-full items-center justify-between py-1 text-xs font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200"
          >
            <span className="flex items-center gap-1.5">
              <Filter size={13} className="text-orange-600 dark:text-orange-400" />
              ประเภทมังงะ
            </span>
            <ChevronDown
              size={14}
              className={`text-zinc-400 transition-transform duration-200 ${genreOpen ? "rotate-180" : ""}`}
            />
          </button>

          {genreOpen && (
            <div className="mt-2 flex flex-wrap gap-1.5 pt-1">
              {MANGA_GENRES.map((g) => {
                const isSelected = selectedGenre === g.key;
                const count = counts.genreCounts[g.key] ?? 0;
                return (
                  <button
                    key={g.key}
                    type="button"
                    onClick={() => handleSelectGenre(g.key)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      isSelected
                        ? "bg-orange-600 text-white font-bold shadow-2xs"
                        : "border border-zinc-200/90 bg-zinc-50 text-zinc-700 hover:border-orange-300 hover:bg-orange-50/50 hover:text-orange-700 dark:border-zinc-750 dark:bg-zinc-850 dark:text-zinc-300 dark:hover:border-orange-800 dark:hover:text-orange-300"
                    }`}
                  >
                    <GenreIcon name={g.iconName} />
                    <span>{g.name}</span>
                    <span
                      className={`text-[10px] ${
                        isSelected ? "text-orange-100 font-normal" : "text-zinc-400 dark:text-zinc-500"
                      }`}
                    >
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. Publishers / Brands (สำนักพิมพ์ / ผู้ผลิต) */}
      <div className="border-b border-zinc-100 pb-3 dark:border-zinc-800/80">
        <button
          type="button"
          onClick={() => setBrandOpen((v) => !v)}
          className="flex w-full items-center justify-between py-1 text-xs font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200"
        >
          <span className="flex items-center gap-1.5">
            <BookMarked size={13} className="text-blue-600 dark:text-blue-400" />
            {isBookCategory ? "สำนักพิมพ์" : "ผู้ผลิต / ค่าย"}
          </span>
          <ChevronDown
            size={14}
            className={`text-zinc-400 transition-transform duration-200 ${brandOpen ? "rotate-180" : ""}`}
          />
        </button>

        {brandOpen && (
          <div className="mt-2 space-y-1 pt-1">
            {brandList.length > 4 && (
              <div className="relative mb-2">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={brandSearch}
                  onChange={(e) => setBrandSearch(e.target.value)}
                  placeholder={isBookCategory ? "ค้นหาสำนักพิมพ์..." : "ค้นหาค่าย..."}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-1 pl-8 pr-2.5 text-xs text-zinc-800 placeholder:text-zinc-400 focus:border-orange-500 focus:bg-white focus:outline-none dark:border-zinc-750 dark:bg-zinc-800 dark:text-zinc-200"
                />
              </div>
            )}

            <div className="max-h-48 space-y-0.5 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]">
              <button
                type="button"
                onClick={() => setSelectedBrand("ALL")}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                  selectedBrand === "ALL"
                    ? "bg-orange-50 font-black text-orange-700 dark:bg-orange-950/50 dark:text-orange-300"
                    : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                <span>{isBookCategory ? "ทุกสำนักพิมพ์" : "ทุกผู้ผลิต / ค่าย"}</span>
                <span className="text-[10px] text-zinc-400">({counts.total})</span>
              </button>

              {filteredBrandList.map((brand) => {
                const isSelected = selectedBrand === brand;
                const count = counts.brandCounts[brand] ?? 0;
                return (
                  <button
                    key={brand}
                    type="button"
                    onClick={() => setSelectedBrand(brand)}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                      isSelected
                        ? "bg-orange-50 font-black text-orange-700 dark:bg-orange-950/50 dark:text-orange-300"
                        : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <span className="truncate pr-2 text-left">{brand}</span>
                    <span className="shrink-0 text-[10px] text-zinc-400">({count})</span>
                  </button>
                );
              })}

              {filteredBrandList.length === 0 && (
                <p className="py-2 text-center text-xs text-zinc-400">ไม่พบสำนักพิมพ์ที่ค้นหา</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. Price Range (ช่วงราคา) */}
      <div>
        <button
          type="button"
          onClick={() => setPriceOpen((v) => !v)}
          className="flex w-full items-center justify-between py-1 text-xs font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200"
        >
          <span className="flex items-center gap-1.5">
            <TrendingUp size={13} className="text-emerald-600 dark:text-emerald-400" />
            ช่วงราคา
          </span>
          <ChevronDown
            size={14}
            className={`text-zinc-400 transition-transform duration-200 ${priceOpen ? "rotate-180" : ""}`}
          />
        </button>

        {priceOpen && (
          <div className="mt-2 space-y-0.5 pt-1">
            {priceOptions.map(([val, label]) => {
              const isSelected = priceRange === val;
              const count = counts.priceCounts[val] ?? 0;
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => setPriceRange(val)}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                    isSelected
                      ? "bg-orange-50 font-black text-orange-700 dark:bg-orange-950/50 dark:text-orange-300"
                      : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  <span>{label}</span>
                  <span className="text-[10px] text-zinc-400">({count})</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1440px]">
        {/* Navigation Breadcrumb */}
        <Link
          href="/"
          className="inline-flex min-h-9 items-center gap-2 text-sm font-semibold text-zinc-600 transition hover:text-orange-600 dark:text-zinc-300 dark:hover:text-orange-400"
        >
          <ArrowLeft size={17} aria-hidden="true" /> กลับหน้าแรก
        </Link>

        {/* Page Header */}
        <header className="mt-4 flex flex-wrap items-end justify-between gap-4 border-b border-zinc-200 pb-5 dark:border-zinc-800">
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

        {/* Main 2-Column Content Layout (BookWalker Style) */}
        <div className="mt-6 flex flex-col lg:flex-row items-start gap-6">
          {/* Left: Sticky Sidebar Filter for Desktop */}
          {desktopFilterOpen && (
            <aside className="hidden lg:block w-64 xl:w-72 shrink-0 sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto overscroll-contain rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900 pr-2 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-300 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-700">
              {renderFilterSections(false)}
            </aside>
          )}

          {/* Right: Main Product Listing & Controls Area */}
          <div className="flex-1 min-w-0 w-full">
            {/* Cart Notice Alert */}
            {cartNotice ? (
              <div
                role="status"
                className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
              >
                <span className="flex items-center gap-2">
                  <Check size={16} aria-hidden="true" />
                  {cartNotice}
                </span>
                <div className="flex items-center gap-3">
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
              </div>
            ) : null}

            {/* Top Search & Sort Control Bar */}
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-zinc-200/90 bg-white p-3.5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
              {/* Search Input */}
              <div className="relative flex-1 min-w-0 max-w-lg">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ค้นหาชื่อเรื่อง, ตัวละคร, สำนักพิมพ์ หรือ ISBN..."
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-8 text-xs font-medium text-zinc-900 shadow-2xs placeholder:text-zinc-400 focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500/30 dark:border-zinc-750 dark:bg-zinc-800 dark:text-zinc-100"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    aria-label="ล้างคำค้นหา"
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </div>

              {/* Right Controls: Filter Toggle & Sort Dropdown */}
              <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                {/* Desktop Filter Toggle Button */}
                <button
                  type="button"
                  onClick={() => setDesktopFilterOpen((prev) => !prev)}
                  className={`hidden lg:flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition shadow-2xs ${
                    desktopFilterOpen
                      ? "border border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-orange-300 hover:bg-zinc-100 dark:border-zinc-750 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-750"
                      : "border border-orange-500 bg-orange-600 text-white hover:bg-orange-700 dark:bg-orange-600 dark:border-orange-500 font-bold shadow-xs"
                  }`}
                  aria-label={desktopFilterOpen ? "ซ่อนตัวกรอง" : "เปิดตัวกรอง"}
                >
                  {desktopFilterOpen ? (
                    <>
                      <PanelLeftClose size={14} className="text-zinc-500 dark:text-zinc-400" />
                      <span>ซ่อนตัวกรอง</span>
                    </>
                  ) : (
                    <>
                      <PanelLeftOpen size={14} className="text-white" />
                      <span>เปิดตัวกรอง</span>
                      {activeFilterCount > 0 && (
                        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-white text-orange-600 px-1 text-[10px] font-black">
                          {activeFilterCount}
                        </span>
                      )}
                    </>
                  )}
                </button>

                {/* Mobile Filter Button */}
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(true)}
                  className="lg:hidden flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-bold text-zinc-800 hover:bg-zinc-100 dark:border-zinc-750 dark:bg-zinc-800 dark:text-zinc-200"
                >
                  <SlidersHorizontal size={13} className="text-orange-600 dark:text-orange-400" />
                  <span>ตัวกรอง</span>
                  {activeFilterCount > 0 && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-600 px-1 text-[10px] font-bold text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                {/* Sort Dropdown */}
                <div className="flex items-center gap-1.5">
                  <ArrowUpDown size={13} className="text-zinc-400 hidden sm:inline" />
                  <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 hidden sm:inline">เรียงตาม:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-bold text-zinc-800 shadow-2xs focus:border-orange-500 focus:bg-white focus:outline-none dark:border-zinc-750 dark:bg-zinc-800 dark:text-zinc-200"
                  >
                    {sortOptions.map(([val, label]) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Active Filters Chips Bar */}
            {hasActiveFilters && (
              <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/60">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mr-1">
                  ตัวกรองที่เลือก:
                </span>
                {onlyBestSeller && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                    <Flame size={12} className="text-amber-600 dark:text-amber-400" />
                    สินค้าขายดีติดอันดับ
                    <button type="button" onClick={toggleBestSeller} className="ml-1 hover:text-amber-700">
                      <X size={12} />
                    </button>
                  </span>
                )}
                {selectedGenre !== "all" && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-orange-100 px-2.5 py-1 text-xs font-bold text-orange-900 dark:bg-orange-950 dark:text-orange-300">
                    ประเภท: {MANGA_GENRES.find((g) => g.key === selectedGenre)?.name}
                    <button type="button" onClick={() => handleSelectGenre("all")} className="ml-1 hover:text-orange-700">
                      <X size={12} />
                    </button>
                  </span>
                )}
                {query && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-900 dark:bg-blue-950 dark:text-blue-300">
                    ค้นหา: “{query}”
                    <button type="button" onClick={() => setQuery("")} className="ml-1 hover:text-blue-700">
                      <X size={12} />
                    </button>
                  </span>
                )}
                {status !== "ALL" && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-900 dark:bg-blue-950 dark:text-blue-300">
                    {statusOptions.find((s) => s[0] === status)?.[1]}
                    <button type="button" onClick={() => setStatus("ALL")} className="ml-1 hover:text-blue-700">
                      <X size={12} />
                    </button>
                  </span>
                )}
                {selectedBrand !== "ALL" && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-900 dark:bg-blue-950 dark:text-blue-300">
                    {selectedBrand}
                    <button type="button" onClick={() => setSelectedBrand("ALL")} className="ml-1 hover:text-blue-700">
                      <X size={12} />
                    </button>
                  </span>
                )}
                {priceRange !== "ALL" && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-900 dark:bg-blue-950 dark:text-blue-300">
                    {priceOptions.find((p) => p[0] === priceRange)?.[1]}
                    <button type="button" onClick={() => setPriceRange("ALL")} className="ml-1 hover:text-blue-700">
                      <X size={12} />
                    </button>
                  </span>
                )}
                {sortBy !== "POPULAR" && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-900 dark:bg-blue-950 dark:text-blue-300">
                    เรียง: {sortOptions.find((s) => s[0] === sortBy)?.[1]}
                    <button type="button" onClick={() => setSortBy("POPULAR")} className="ml-1 hover:text-blue-700">
                      <X size={12} />
                    </button>
                  </span>
                )}
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="ml-auto text-xs font-bold text-red-600 hover:text-red-700 dark:text-red-400 hover:underline"
                >
                  ล้างตัวกรองทั้งหมด
                </button>
              </div>
            )}

            {/* Product Grid Area */}
            {loading ? (
              <div
                className={`grid gap-4 ${
                  desktopFilterOpen
                    ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
                    : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
                }`}
                aria-label="กำลังโหลดสินค้า"
              >
                {[0, 1, 2, 3, 4, 5, 6, 7].map((item) => (
                  <div
                    key={item}
                    className="h-80 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-900"
                  />
                ))}
              </div>
            ) : error ? (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center dark:border-amber-900 dark:bg-amber-950/40">
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
                <div
                  className={`grid gap-4 ${
                    desktopFilterOpen
                      ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
                      : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
                  }`}
                >
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
                <div
                  className={`grid gap-4 ${
                    desktopFilterOpen
                      ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
                      : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
                  }`}
                >
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
              <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center dark:border-zinc-700 dark:bg-zinc-900">
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
                  {onlyBestSeller
                    ? "ลองกดปิดตัวกรอง “สินค้าขายดีติดอันดับ” หรือปรับประเภทมังงะเพื่อดูสินค้าอื่น"
                    : "ลองปรับเปลี่ยนคำค้นหา หรือกดล้างตัวกรองเพื่อดูรายการสินค้าทั้งหมด"}
                </p>
                {hasActiveFilters ? (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="mt-4 inline-flex min-h-9 items-center rounded-xl bg-orange-600 px-4 text-xs font-bold text-white shadow-xs hover:bg-orange-700"
                  >
                    ล้างตัวกรองทั้งหมด
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Filter Drawer (Modal) */}
        {mobileFilterOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileFilterOpen(false)}
              aria-hidden="true"
            />

            {/* Drawer Content */}
            <div className="relative ml-auto flex h-full w-full max-w-xs flex-col bg-white shadow-2xl dark:bg-zinc-900">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3.5 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal size={16} className="text-orange-600 dark:text-orange-400" />
                  <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                    ตัวกรอง & จัดเรียง
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(false)}
                  className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Body (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 [scrollbar-width:thin]">
                {renderFilterSections(true)}
              </div>

              {/* Drawer Footer */}
              <div className="border-t border-zinc-200 p-3 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/90 flex gap-2">
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="rounded-xl border border-zinc-300 px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    ล้างทั้งหมด
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(false)}
                  className="flex-1 rounded-xl bg-orange-600 py-2 text-center text-xs font-black text-white shadow-xs hover:bg-orange-700"
                >
                  ดูผลลัพธ์ ({productCount.toLocaleString("th-TH")} รายการ)
                </button>
              </div>
            </div>
          </div>
        )}

        <StockAlertModal
          isOpen={stockAlertModal.open}
          productId={stockAlertModal.productId}
          productTitle={stockAlertModal.productTitle}
          onClose={() =>
            setStockAlertModal({
              open: false,
              productId: "",
              productTitle: "",
            })
          }
        />
      </div>
    </main>
  );
}

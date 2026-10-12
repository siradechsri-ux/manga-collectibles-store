"use client";

import {
  ArrowRight,
  BookMarked,
  BookOpen,
  Boxes,
  CalendarDays,
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
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useCart } from "../context/CartContext";
import {
  CatalogData,
  CatalogFigure,
  CatalogMangaSeries,
  fetchCatalog,
} from "../lib/catalog-client";
import { ProductService } from "../services/product.service";
import { ADMIN_PRODUCTS_UPDATED_EVENT } from "../mocks/admin-products.mock";
import { MangaSeriesCard, CollectibleProductCard } from "../components/ProductCard";

export type StoreCategory =
  | "ALL"
  | "MANGA"
  | "LIGHT_NOVEL"
  | "FIGURE"
  | "GOODS"
  | "ACCESSORY";

type StoreStatus = "ALL" | "IN_STOCK" | "PREORDER";

const CATEGORY_TABS: readonly (readonly [StoreCategory, string])[] = [
  ["ALL", "ทั้งหมด"],
  ["MANGA", "มังงะ"],
  ["LIGHT_NOVEL", "ไลท์โนเวล"],
  ["FIGURE", "Figure & โมเดล"],
  ["GOODS", "กู้ดส์ & ของสะสม"],
  ["ACCESSORY", "อุปกรณ์ดูแล"],
] as const;

const MANGA_FILTERS = [
  ["ALL", "ทั้งหมด"],
  ["ACTION", "แอ็กชัน / ต่อสู้"],
  ["FANTASY", "แฟนตาซี"],
  ["MYSTERY", "สืบสวน / ลึกลับ"],
  ["LIMITED", "เล่มพิเศษ / Limited"],
] as const;

const LIGHT_NOVEL_FILTERS = [
  ["ALL", "ทั้งหมด"],
  ["PHOENIX", "สำนักพิมพ์ Phoenix"],
  ["SIAM", "สำนักพิมพ์ Siam Inter"],
  ["REGULAR", "เล่มปกติ"],
  ["SPECIAL_SET", "Special Set / Boxset"],
] as const;

const FIGURE_FILTERS = [
  ["ALL", "ทั้งหมด"],
  ["SCALE", "Scale Figure"],
  ["NENDOROID", "Nendoroid"],
  ["GUNPLA", "Gunpla / พลาสติกโมเดล"],
] as const;

const GOODS_FILTERS = [
  ["ALL", "ทั้งหมด"],
  ["STANDY", "สแตนดี้อะคริลิก"],
  ["BADGE", "เข็มกลัด"],
  ["KEYCHAIN", "พวงกุญแจ"],
  ["SHIKISHI", "Shikishi & อาร์ตบอร์ด"],
] as const;

const ACCESSORY_FILTERS = [
  ["ALL", "ทั้งหมด"],
  ["BOOK_COVER", "ปกใสห่อการ์ตูน / โนเวล"],
  ["DISPLAY_BOX", "กล่องครอบอะคริลิก"],
] as const;

const ALL_SUB_FILTERS = [
  ["ALL", "รวมทุกประเภท"],
  ["MANGA", "มังงะ"],
  ["LIGHT_NOVEL", "ไลท์โนเวล"],
  ["FIGURE", "Figure"],
  ["PLAMO", "พลาสติกโมเดล"],
  ["GOODS", "กู้ดส์สะสม"],
  ["ACCESSORY", "อุปกรณ์ดูแล"],
] as const;

function matchesMangaSubcategory(
  series: CatalogMangaSeries,
  subcategory: string,
): boolean {
  if (subcategory === "ALL") return true;
  const searchable = `${series.title} ${series.publisher}`.toLocaleLowerCase();
  if (subcategory === "LIMITED") {
    return series.volumes.some((volume) =>
      `${volume.variantLabel ?? ""} ${volume.title}`
        .toLocaleLowerCase()
        .includes("limited") ||
      `${volume.variantLabel ?? ""} ${volume.title}`
        .toLocaleLowerCase()
        .includes("พิเศษ"),
    );
  }
  const keywordGroups: Record<string, readonly string[]> = {
    ACTION: ["action", "ต่อสู้", "ผจญภัย", "jujutsu", "jujutsu kaisen", "นักล่า"],
    FANTASY: ["fantasy", "แฟนตาซี", "เวทมนตร์", "มหาเวทย์", "ปีศาจ", "alchemist"],
    MYSTERY: ["mystery", "สืบสวน", "ลึกลับ", "นักสืบ", "ปริศนา", "เร้น"],
  };
  return (keywordGroups[subcategory] ?? []).some((keyword) =>
    searchable.includes(keyword.toLocaleLowerCase()),
  );
}

function matchesLightNovelSubcategory(
  series: CatalogMangaSeries,
  subcategory: string,
): boolean {
  if (subcategory === "ALL") return true;
  if (subcategory === "PHOENIX") {
    return series.publisher.toLocaleLowerCase().includes("phoenix");
  }
  if (subcategory === "SIAM") {
    return series.publisher.toLocaleLowerCase().includes("siam");
  }
  if (subcategory === "REGULAR") {
    return series.volumes.some(
      (volume) =>
        !volume.variantLabel ||
        volume.variantLabel.includes("ปกติ"),
    );
  }
  if (subcategory === "SPECIAL_SET") {
    return series.volumes.some((volume) =>
      `${volume.variantLabel ?? ""} ${volume.title}`
        .toLocaleLowerCase()
        .includes("special"),
    );
  }
  return true;
}

function matchesFigureModelSubcategory(
  item: CatalogFigure,
  subcategory: string,
): boolean {
  if (subcategory === "ALL") return true;
  const searchable = `${item.name} ${item.series} ${item.manufacturer} ${item.scale} ${item.category ?? ""} ${item.grade ?? ""}`
    .toLocaleLowerCase();
  if (subcategory === "GUNPLA") {
    return (
      item.category === "PLAMO" ||
      searchable.includes("gundam") ||
      searchable.includes("gunpla") ||
      Boolean(item.grade)
    );
  }
  if (subcategory === "NENDOROID") {
    return searchable.includes("nendoroid");
  }
  if (subcategory === "SCALE") {
    return (
      /scale|1\/\d+/i.test(searchable) &&
      item.category !== "PLAMO" &&
      !searchable.includes("gundam")
    );
  }
  return true;
}

function matchesGoodsSubcategory(
  item: CatalogFigure,
  subcategory: string,
): boolean {
  if (subcategory === "ALL") return true;
  const itemSubcategory = item.subcategory?.toLocaleUpperCase() ?? "";
  const searchable = `${item.name} ${item.series}`.toLocaleLowerCase();
  if (subcategory === "STANDY") {
    return itemSubcategory === "STANDY" || searchable.includes("สแตนดี้");
  }
  if (subcategory === "BADGE") {
    return itemSubcategory === "BADGE" || searchable.includes("เข็มกลัด");
  }
  if (subcategory === "KEYCHAIN") {
    return itemSubcategory === "KEYCHAIN" || searchable.includes("พวงกุญแจ");
  }
  if (subcategory === "SHIKISHI") {
    return itemSubcategory === "SHIKISHI" || searchable.includes("shikishi") || searchable.includes("แผ่นภาพ");
  }
  return true;
}

function matchesAccessorySubcategory(
  item: CatalogFigure,
  subcategory: string,
): boolean {
  if (subcategory === "ALL") return true;
  const itemSubcategory = item.subcategory?.toLocaleUpperCase() ?? "";
  const searchable = `${item.name} ${item.series}`.toLocaleLowerCase();
  if (subcategory === "BOOK_COVER") {
    return itemSubcategory === "BOOK_COVER" || searchable.includes("ปก");
  }
  if (subcategory === "DISPLAY_BOX") {
    return itemSubcategory === "DISPLAY_BOX" || searchable.includes("กล่อง");
  }
  return true;
}

function matchesSeriesStatus(
  series: CatalogMangaSeries,
  status: StoreStatus,
): boolean {
  if (status === "ALL") return true;
  return series.volumes.some((volume) =>
    status === "IN_STOCK"
      ? volume.status === "IN_STOCK" && volume.stock > 0
      : volume.status === "PREORDER",
  );
}

function matchesFigureStatus(
  figure: CatalogFigure,
  status: StoreStatus,
): boolean {
  if (status === "ALL") return true;
  return status === "IN_STOCK"
    ? figure.status === "IN_STOCK" && figure.stockOrQuotaRemaining > 0
    : figure.status === "PREORDER_OPEN" || figure.status === "PREORDER_CLOSED";
}

const moneyFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 0,
});

function getSeriesStartingPrice(series: CatalogMangaSeries): number | null {
  const available = series.volumes.filter(
    (volume) => volume.status !== "OUT_OF_STOCK",
  );
  return available.length > 0
    ? Math.min(...available.map((volume) => volume.price))
    : null;
}

function bookSeriesBadge(series: CatalogMangaSeries): {
  label: string;
  style: string;
} {
  if (series.volumes.some((volume) => volume.status === "PREORDER")) {
    return {
      label: "Pre-order",
      style:
        "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
    };
  }
  if (series.volumes.some((volume) => volume.status === "IN_STOCK")) {
    return {
      label: "In Stock",
      style:
        "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/80 dark:bg-emerald-950/60 dark:text-emerald-300",
    };
  }
  return {
    label: "สินค้าหมด",
    style:
      "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-400",
  };
}

function collectibleBadge(figure: CatalogFigure): {
  label: string;
  style: string;
} {
  if (figure.status === "PREORDER_OPEN" && figure.depositAmount > 0) {
    return {
      label: "เปิดรับมัดจำ",
      style:
        "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
    };
  }
  if (figure.status === "PREORDER_OPEN") {
    return {
      label: "Pre-order",
      style:
        "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
    };
  }
  if (figure.status === "IN_STOCK") {
    return {
      label: "พร้อมส่ง",
      style:
        "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/80 dark:bg-emerald-950/60 dark:text-emerald-300",
    };
  }
  return {
    label: "ปิดรับจอง",
    style:
      "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-400",
  };
}

function StorefrontHero({
  onBrowse,
}: {
  onBrowse: (category: StoreCategory) => void;
}) {
  return (
    <section className="relative isolate overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-12 text-white shadow-xl sm:px-10 sm:py-16 lg:px-14 lg:py-20">
      <div className="absolute -right-16 -top-24 -z-10 h-80 w-80 rounded-full bg-orange-500/30 blur-3xl" />
      <div className="absolute -bottom-36 left-1/3 -z-10 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-bold text-orange-200">
            <Sparkles size={14} aria-hidden="true" />
            มังงะ · ไลท์โนเวล · ฟิกเกอร์ · กันพลา · กู้ดส์ · อุปกรณ์ดูแล
          </span>
          <h1 className="mt-5 max-w-2xl text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            อ่านสนุก ครบทุกเรื่อง
            <br />
            <span className="text-orange-400">สะสมของแท้ ส่งถึงบ้าน</span>
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
            ศูนย์รวมมังงะ ไลท์โนเวลยกชุด ฟิกเกอร์แท้ พลาสติกโมเดลกันพลา
            สินค้าคาแรคเตอร์ และอุปกรณ์ถนอมหนังสือสะสม คิดภาษีถูกต้อง e-Tax พร้อมจัดส่ง
          </p>
          <div className="mt-8 flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => onBrowse("MANGA")}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-orange-400"
            >
              <BookOpen size={15} aria-hidden="true" /> มังงะ (VAT 0%)
            </button>
            <button
              type="button"
              onClick={() => onBrowse("LIGHT_NOVEL")}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/20"
            >
              <BookMarked size={15} aria-hidden="true" /> ไลท์โนเวล (VAT 0%)
            </button>
            <button
              type="button"
              onClick={() => onBrowse("FIGURE")}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/20"
            >
              <Boxes size={15} aria-hidden="true" /> Figure & กันพลา
            </button>
            <button
              type="button"
              onClick={() => onBrowse("GOODS")}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/20"
            >
              <ShoppingBag size={15} aria-hidden="true" /> กู้ดส์ & สแตนดี้
            </button>
            <button
              type="button"
              onClick={() => onBrowse("ACCESSORY")}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/20"
            >
              <ShieldCheck size={15} aria-hidden="true" /> ปกใส & กล่องครอบ
            </button>
          </div>
        </div>
        <div className="hidden lg:block">
          <div className="relative mx-auto flex h-72 max-w-md items-center justify-center">
            <div className="absolute h-60 w-60 rotate-[-10deg] rounded-3xl border border-white/15 bg-white/5 shadow-2xl backdrop-blur" />
            <div className="absolute ml-16 mt-6 h-60 w-48 rotate-[8deg] rounded-3xl border border-orange-300/30 bg-gradient-to-br from-orange-500/85 to-violet-800/85 p-5 shadow-2xl">
              <div className="flex h-full flex-col justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur">
                  <ShieldCheck size={22} aria-hidden="true" />
                </span>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">
                    CERTIFIED STORE
                  </span>
                  <p className="mt-1 text-sm font-black leading-tight text-white">
                    ของแท้ 100%
                    <br />
                    ห่อแน่นหนา ปลอดภัย
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function StorefrontPage() {
  return (
    <Suspense fallback={<StorefrontLoading />}>
      <StorefrontContent />
    </Suspense>
  );
}

function StorefrontContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isUnauthorized = searchParams.get("error") === "unauthorized";
  const rawCategory = searchParams.get("category");

  const category: StoreCategory =
    rawCategory === "MANGA"
      ? "MANGA"
      : rawCategory === "LIGHT_NOVEL"
        ? "LIGHT_NOVEL"
        : rawCategory === "FIGURE"
          ? "FIGURE"
          : rawCategory === "GOODS"
            ? "GOODS"
            : rawCategory === "ACCESSORY"
              ? "ACCESSORY"
              : rawCategory === "ALL"
                ? "ALL"
                : "ALL";

  const rawStatus = searchParams.get("status");
  const urlStatus: StoreStatus =
    rawStatus === "PREORDER"
      ? "PREORDER"
      : rawStatus === "IN_STOCK"
        ? "IN_STOCK"
        : "ALL";

  const [subcategory, setSubcategory] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<StoreStatus>(urlStatus);
  const [searchQuery, setSearchQuery] = useState("");
  const [catalog, setCatalog] = useState<CatalogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addNotice, setAddNotice] = useState<string | null>(null);

  const { addItem } = useCart();

  useEffect(() => {
    setStatusFilter(urlStatus);
  }, [urlStatus]);

  function handleStatusChange(nextStatus: StoreStatus): void {
    setStatusFilter(nextStatus);
    const params = new URLSearchParams(window.location.search);
    if (nextStatus === "ALL") {
      params.delete("status");
    } else {
      params.set("status", nextStatus);
    }
    const newQuery = params.toString();
    void router.replace(`/${newQuery ? `?${newQuery}` : ""}#browse-collection`, {
      scroll: false,
    });
  }

  function selectCategory(nextCategory: StoreCategory): void {
    setSubcategory("ALL");
    setSearchQuery("");
    const params = new URLSearchParams(window.location.search);
    if (nextCategory === "ALL") {
      params.delete("category");
    } else {
      params.set("category", nextCategory);
    }
    const newQuery = params.toString();
    void router.replace(`/${newQuery ? `?${newQuery}` : ""}#browse-collection`);
  }

  function browseCollection(nextCategory: StoreCategory): void {
    selectCategory(nextCategory);
    document.getElementById("browse-collection")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  async function loadCatalog(): Promise<void> {
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
  }

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
  }, []);

  function handleQuickAddToCart(item: CatalogFigure): void {
    try {
      const id = Number(item.id);
      const img = item.coverImage || item.images?.[0] || null;
      if (item.category === "PLAMO") {
        addItem({
          kind: "PLAMO",
          id,
          name: item.name,
          image: img,
          coverImage: img,
          imageUrl: img,
          fullPrice: item.fullPrice,
          depositAmount: item.depositAmount,
          selectedPaymentType: "FULL",
          quantity: 1,
          boxDimensions: item.boxDimensions,
          grade: item.grade,
        });
      } else if (item.category === "GOODS") {
        addItem({
          kind: "GOODS",
          id,
          name: item.name,
          image: img,
          coverImage: img,
          imageUrl: img,
          fullPrice: item.fullPrice,
          quantity: 1,
          subcategory: item.subcategory,
        });
      } else if (item.category === "ACCESSORY") {
        addItem({
          kind: "ACCESSORY",
          id,
          name: item.name,
          image: img,
          coverImage: img,
          imageUrl: img,
          fullPrice: item.fullPrice,
          quantity: 1,
          subcategory: item.subcategory,
          boxDimensions: item.boxDimensions,
        });
      } else {
        addItem({
          kind: "FIGURE",
          id,
          name: item.name,
          image: img,
          coverImage: img,
          imageUrl: img,
          fullPrice: item.fullPrice,
          depositAmount: item.depositAmount,
          selectedPaymentType: "FULL",
          quantity: 1,
          boxDimensions: item.boxDimensions,
        });
      }
      setAddNotice(`เพิ่ม "${item.name}" ลงในตะกร้าเรียบร้อยแล้ว`);
      setTimeout(() => setAddNotice(null), 4000);
    } catch (cartError) {
      setAddNotice(
        cartError instanceof Error ? cartError.message : "เพิ่มสินค้าไม่สำเร็จ",
      );
    }
  }

  // Filtered collections
  const filteredManga = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    return (catalog?.mangaSeries ?? []).filter((series) => {
      const queryMatches =
        query.length === 0 ||
        `${series.title} ${series.publisher} ${series.author ?? ""} ${(series.altTitles ?? []).join(" ")} ${series.volumes
          .map((v) => `${v.title} ${v.variantLabel ?? ""} ${v.isbn ?? ""}`)
          .join(" ")}`
          .toLocaleLowerCase()
          .includes(query);
      return (
        queryMatches &&
        matchesMangaSubcategory(series, subcategory) &&
        matchesSeriesStatus(series, statusFilter)
      );
    });
  }, [catalog, searchQuery, statusFilter, subcategory]);

  const filteredLightNovels = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    return (catalog?.lightNovelSeries ?? []).filter((series) => {
      const queryMatches =
        query.length === 0 ||
        `${series.title} ${series.publisher} ${series.author ?? ""} ${(series.altTitles ?? []).join(" ")} ${series.volumes
          .map((v) => `${v.title} ${v.variantLabel ?? ""} ${v.isbn ?? ""}`)
          .join(" ")}`
          .toLocaleLowerCase()
          .includes(query);
      return (
        queryMatches &&
        matchesLightNovelSubcategory(series, subcategory) &&
        matchesSeriesStatus(series, statusFilter)
      );
    });
  }, [catalog, searchQuery, statusFilter, subcategory]);

  const filteredFiguresAndModels = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    const combined = [
      ...(catalog?.figures ?? []),
      ...(catalog?.plamo ?? []),
    ];
    return combined.filter((item) => {
      const queryMatches =
        query.length === 0 ||
        `${item.name} ${item.series} ${item.character} ${item.manufacturer} ${item.janCode} ${item.grade ?? ""} ${(item.altTitles ?? []).join(" ")}`
          .toLocaleLowerCase()
          .includes(query);
      return (
        queryMatches &&
        matchesFigureModelSubcategory(item, subcategory) &&
        matchesFigureStatus(item, statusFilter)
      );
    });
  }, [catalog, searchQuery, statusFilter, subcategory]);

  const filteredGoods = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    return (catalog?.goods ?? []).filter((item) => {
      const queryMatches =
        query.length === 0 ||
        `${item.name} ${item.series} ${item.character} ${item.manufacturer} ${item.janCode} ${item.subcategory ?? ""} ${(item.altTitles ?? []).join(" ")}`
          .toLocaleLowerCase()
          .includes(query);
      return (
        queryMatches &&
        matchesGoodsSubcategory(item, subcategory) &&
        matchesFigureStatus(item, statusFilter)
      );
    });
  }, [catalog, searchQuery, statusFilter, subcategory]);

  const filteredAccessories = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    return (catalog?.accessories ?? []).filter((item) => {
      const queryMatches =
        query.length === 0 ||
        `${item.name} ${item.series} ${item.manufacturer} ${item.janCode} ${item.subcategory ?? ""} ${(item.altTitles ?? []).join(" ")}`
          .toLocaleLowerCase()
          .includes(query);
      return (
        queryMatches &&
        matchesAccessorySubcategory(item, subcategory) &&
        matchesFigureStatus(item, statusFilter)
      );
    });
  }, [catalog, searchQuery, statusFilter, subcategory]);

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        {isUnauthorized ? (
          <div
            role="alert"
            className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck size={18} className="shrink-0 text-red-600 dark:text-red-400" />
              <span>คุณไม่มีสิทธิ์เข้าถึงหน้าระบบดังกล่าว (ต้องใช้สิทธิ์ของเจ้าหน้าที่หรือผู้ดูแลระบบ)</span>
            </div>
            <button
              type="button"
              onClick={() => router.replace("/")}
              aria-label="ปิดการแจ้งเตือน"
              className="rounded-lg p-1 text-red-600 transition hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/50"
            >
              <X size={15} />
            </button>
          </div>
        ) : null}

        <StorefrontHero onBrowse={browseCollection} />

        {addNotice ? (
          <div
            role="status"
            className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200"
          >
            <span className="flex items-center gap-2">
              <Check size={16} aria-hidden="true" />
              {addNotice}
            </span>
            <Link
              href="/checkout"
              className="rounded-lg bg-emerald-600 px-3 py-1 text-xs text-white transition hover:bg-emerald-700"
            >
              ไปที่ตะกร้า
            </Link>
          </div>
        ) : null}

        <section
          id="browse-collection"
          className="mt-10 scroll-mt-24"
          aria-labelledby="catalog-heading"
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-400">
                Browse collection
              </p>
              <h2
                id="catalog-heading"
                className="mt-1 text-2xl font-black tracking-tight text-zinc-950 dark:text-zinc-100 sm:text-3xl"
              >
                เลือกดูตามหมวดสินค้า
              </h2>
            </div>
            <div
              className="flex flex-wrap gap-1 rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              role="tablist"
              aria-label="หมวดหมู่สินค้าหลัก"
            >
              {CATEGORY_TABS.map(([tabKey, tabLabel]) => {
                const isActive = category === tabKey;
                return (
                  <button
                    key={tabKey}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => selectCategory(tabKey)}
                    className={`rounded-xl px-3.5 py-2 text-xs font-bold transition sm:text-sm ${
                      isActive
                        ? "bg-zinc-950 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-950"
                        : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {tabLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filter Bar */}
          <div className="mt-5 space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <label className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-300 bg-white px-3 text-slate-500 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
              <Search size={18} aria-hidden="true" className="text-slate-400 dark:text-zinc-500" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="ค้นหาชื่อเรื่อง ตัวละคร สำนักพิมพ์ ผู้ผลิต หรือรหัสสินค้า"
                aria-label="ค้นหาสินค้า"
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="ล้างคำค้นหา"
                  className="rounded-md p-1 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
                >
                  <X size={17} aria-hidden="true" />
                </button>
              ) : null}
            </label>

            <div className="flex flex-wrap items-center gap-2 pt-1" aria-label="กรองสถานะสินค้า">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">สถานะสินค้า:</span>
              {(
                [
                  ["ALL", "ทุกสถานะ"],
                  ["IN_STOCK", "พร้อมส่ง"],
                  ["PREORDER", "เปิดพรีออเดอร์"],
                ] as const
              ).map(([value, label]) => {
                const isActive = statusFilter === value;
                return (
                  <button
                    type="button"
                    key={value}
                    aria-pressed={isActive}
                    onClick={() => handleStatusChange(value)}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
                      isActive
                        ? "border-orange-600 bg-orange-600 text-white shadow-xs dark:border-orange-500 dark:bg-orange-500"
                        : "border-zinc-300 bg-white text-zinc-700 hover:border-orange-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-orange-700"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grids Display */}
          {loading ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="h-72 animate-pulse rounded-2xl bg-white shadow-sm dark:bg-zinc-900"
                />
              ))}
            </div>
          ) : error ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-900 dark:bg-amber-950/40">
              <p
                className="font-semibold text-amber-950 dark:text-amber-100"
                role="alert"
              >
                {error}
              </p>
              <button
                type="button"
                onClick={() => void loadCatalog()}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white"
              >
                <RefreshCw size={15} aria-hidden="true" /> ลองโหลดอีกครั้ง
              </button>
            </div>
          ) : (
            <div className="mt-6 space-y-12">
              {/* Category: ALL */}
              {category === "ALL" && (
                <>
                  {subcategory === "ALL" || subcategory === "MANGA" ? (
                    <CategorySection
                      title="มังงะ (Manga Series)"
                      subtitle="ซีรีส์มังงะเรื่องดัง ได้รับยกเว้นภาษีมูลค่าเพิ่ม (VAT 0%)"
                      icon={<BookOpen size={20} />}
                      count={filteredManga.length}
                    >
                      {filteredManga.length > 0 ? (
                        <BookGrid series={filteredManga} type="MANGA" />
                      ) : (
                        <EmptyCatalog label="ไม่มีมังงะที่ตรงกับเงื่อนไข" />
                      )}
                    </CategorySection>
                  ) : null}

                  {subcategory === "ALL" || subcategory === "LIGHT_NOVEL" ? (
                    <CategorySection
                      title="ไลท์โนเวล (Light Novels)"
                      subtitle="นวนิยายภาพไลท์โนเวล เล่มเดี่ยว & Boxset ยกเว้นภาษี (VAT 0%)"
                      icon={<BookMarked size={20} />}
                      count={filteredLightNovels.length}
                    >
                      {filteredLightNovels.length > 0 ? (
                        <BookGrid series={filteredLightNovels} type="LIGHT_NOVEL" />
                      ) : (
                        <EmptyCatalog label="ไม่มีไลท์โนเวลที่ตรงกับเงื่อนไข" />
                      )}
                    </CategorySection>
                  ) : null}

                  {subcategory === "ALL" || subcategory === "FIGURE" || subcategory === "PLAMO" ? (
                    <CategorySection
                      title="Figure & พลาสติกโมเดลกันพลา"
                      subtitle="สเกลฟิกเกอร์ ด๋อย และกันพลาแท้จากญี่ปุ่น (คิดภาษี VAT 7%)"
                      icon={<Boxes size={20} />}
                      count={filteredFiguresAndModels.length}
                    >
                      {filteredFiguresAndModels.length > 0 ? (
                        <CollectibleGrid
                          items={filteredFiguresAndModels}
                          onAddToCart={handleQuickAddToCart}
                        />
                      ) : (
                        <EmptyCatalog label="ไม่มี Figure หรือโมเดลที่ตรงกับเงื่อนไข" />
                      )}
                    </CategorySection>
                  ) : null}

                  {subcategory === "ALL" || subcategory === "GOODS" ? (
                    <CategorySection
                      title="สินค้าคาแรคเตอร์ & กู้ดส์ (Character Goods)"
                      subtitle="สแตนดี้อะคริลิก เข็มกลัด พวงกุญแจ แผ่นภาพสะสมแท้ (คิดภาษี VAT 7%)"
                      icon={<ShoppingBag size={20} />}
                      count={filteredGoods.length}
                    >
                      {filteredGoods.length > 0 ? (
                        <CollectibleGrid
                          items={filteredGoods}
                          onAddToCart={handleQuickAddToCart}
                        />
                      ) : (
                        <EmptyCatalog label="ไม่มีสินค้ากู้ดส์ที่ตรงกับเงื่อนไข" />
                      )}
                    </CategorySection>
                  ) : null}

                  {subcategory === "ALL" || subcategory === "ACCESSORY" ? (
                    <CategorySection
                      title="อุปกรณ์ถนอมและปกป้องของสะสม (Care & Protection)"
                      subtitle="ปกพลาสติกห่อการ์ตูน/โนเวล กล่องครอบอะคริลิกกันฝุ่น (คิดภาษี VAT 7%)"
                      icon={<ShieldCheck size={20} />}
                      count={filteredAccessories.length}
                    >
                      {filteredAccessories.length > 0 ? (
                        <CollectibleGrid
                          items={filteredAccessories}
                          onAddToCart={handleQuickAddToCart}
                        />
                      ) : (
                        <EmptyCatalog label="ไม่มีอุปกรณ์ดูแลที่ตรงกับเงื่อนไข" />
                      )}
                    </CategorySection>
                  ) : null}
                </>
              )}

              {/* Category: MANGA */}
              {category === "MANGA" && (
                filteredManga.length > 0 ? (
                  <BookGrid series={filteredManga} type="MANGA" />
                ) : (
                  <EmptyCatalog
                    label="ไม่พบมังงะที่ตรงกับเงื่อนไข"
                    onAction={() => {
                      setSearchQuery("");
                      setSubcategory("ALL");
                      setStatusFilter("ALL");
                    }}
                  />
                )
              )}

              {/* Category: LIGHT_NOVEL */}
              {category === "LIGHT_NOVEL" && (
                filteredLightNovels.length > 0 ? (
                  <BookGrid series={filteredLightNovels} type="LIGHT_NOVEL" />
                ) : (
                  <EmptyCatalog
                    label="ไม่พบไลท์โนเวลที่ตรงกับเงื่อนไข"
                    onAction={() => {
                      setSearchQuery("");
                      setSubcategory("ALL");
                      setStatusFilter("ALL");
                    }}
                  />
                )
              )}

              {/* Category: FIGURE */}
              {category === "FIGURE" && (
                filteredFiguresAndModels.length > 0 ? (
                  <CollectibleGrid
                    items={filteredFiguresAndModels}
                    onAddToCart={handleQuickAddToCart}
                  />
                ) : (
                  <EmptyCatalog
                    label="ไม่พบ Figure หรือโมเดลที่ตรงกับเงื่อนไข"
                    onAction={() => {
                      setSearchQuery("");
                      setSubcategory("ALL");
                      setStatusFilter("ALL");
                    }}
                  />
                )
              )}

              {/* Category: GOODS */}
              {category === "GOODS" && (
                filteredGoods.length > 0 ? (
                  <CollectibleGrid
                    items={filteredGoods}
                    onAddToCart={handleQuickAddToCart}
                  />
                ) : (
                  <EmptyCatalog
                    label="ไม่พบสินค้ากู้ดส์ที่ตรงกับเงื่อนไข"
                    onAction={() => {
                      setSearchQuery("");
                      setSubcategory("ALL");
                      setStatusFilter("ALL");
                    }}
                  />
                )
              )}

              {/* Category: ACCESSORY */}
              {category === "ACCESSORY" && (
                filteredAccessories.length > 0 ? (
                  <CollectibleGrid
                    items={filteredAccessories}
                    onAddToCart={handleQuickAddToCart}
                  />
                ) : (
                  <EmptyCatalog
                    label="ไม่พบอุปกรณ์ดูแลของสะสมที่ตรงกับเงื่อนไข"
                    onAction={() => {
                      setSearchQuery("");
                      setSubcategory("ALL");
                      setStatusFilter("ALL");
                    }}
                  />
                )
              )}
            </div>
          )}
        </section>

        {/* Benefits bar */}
        <section className="mt-14 grid gap-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-3 sm:p-6">
          <StoreBenefit
            icon={<BookOpen size={20} aria-hidden="true" />}
            title="หนังสือยกเว้นภาษี (VAT 0%)"
            text="มังงะและไลท์โนเวลคิดอัตราภาษี 0% ตามประมวลรัษฎากร"
          />
          <StoreBenefit
            icon={<ShieldCheck size={20} aria-hidden="true" />}
            title="ปกป้องของสะสมสมบูรณ์แบบ"
            text="มี Add-on ปกพลาสติกถนอมหนังสือ และกล่องครอบอะคริลิกกันฝุ่น"
          />
          <StoreBenefit
            icon={<Truck size={20} aria-hidden="true" />}
            title="คำนวณน้ำหนักพัสดุแม่นยำ"
            text="รองรับ Volumetric Weight สำหรับกล่องโมเดลและกันพลาขนาดใหญ่"
          />
        </section>
      </div>
    </main>
  );
}

function CategorySection({
  title,
  subtitle,
  icon,
  count,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-zinc-200 pb-3 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300">
            {icon}
          </span>
          <div>
            <h3 className="text-lg font-black tracking-tight text-zinc-950 dark:text-zinc-100">
              {title}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {subtitle}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {count} รายการ
        </span>
      </div>
      {children}
    </div>
  );
}

function BookGrid({
  series,
  type,
}: {
  series: CatalogMangaSeries[];
  type: "MANGA" | "LIGHT_NOVEL";
}) {
  if (series.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {series.map((item) => (
        <MangaSeriesCard key={item.id} series={item} type={type} />
      ))}
    </div>
  );
}

function CollectibleGrid({
  items,
  onAddToCart,
}: {
  items: CatalogFigure[];
  onAddToCart: (item: CatalogFigure) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <CollectibleProductCard
          key={item.id}
          item={item}
          onAddToCart={onAddToCart}
        />
      ))}
    </div>
  );
}

function EmptyCatalog({
  label,
  actionLabel = "ล้างตัวกรองทั้งหมด",
  onAction,
}: {
  label: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center dark:border-zinc-700 dark:bg-zinc-900">
      <Boxes className="mx-auto text-zinc-400" size={34} aria-hidden="true" />
      <p
        className="mt-3 font-semibold text-zinc-700 dark:text-zinc-300"
        role="status"
      >
        {label}
      </p>
      {onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 min-h-10 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-bold text-zinc-800 transition hover:border-orange-400 hover:text-orange-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function StoreBenefit({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300">
        {icon}
      </span>
      <div>
        <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
          {title}
        </h4>
        <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
          {text}
        </p>
      </div>
    </div>
  );
}

function StorefrontLoading() {
  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-16 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl animate-pulse">
        <div className="h-72 rounded-[2rem] bg-zinc-200 dark:bg-zinc-900" />
        <div className="mt-10 h-10 w-64 rounded-xl bg-zinc-200 dark:bg-zinc-900" />
      </div>
    </main>
  );
}

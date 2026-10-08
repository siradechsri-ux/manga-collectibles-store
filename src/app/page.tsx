"use client";

import {
  ArrowRight,
  BookOpen,
  Boxes,
  CalendarDays,
  RefreshCw,
  Search,
  Sparkles,
  Truck,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CatalogData,
  CatalogFigure,
  CatalogMangaSeries,
  fetchCatalog,
} from "../lib/catalog-client";
import { ADMIN_PRODUCTS_UPDATED_EVENT } from "../mocks/admin-products.mock";

type StoreCategory = "MANGA" | "FIGURE";
type StoreStatus = "ALL" | "IN_STOCK" | "PREORDER";

const MANGA_FILTERS = [
  ["ALL", "ทั้งหมด"],
  ["ACTION", "แอ็กชัน / ต่อสู้"],
  ["FANTASY", "แฟนตาซี"],
  ["MYSTERY", "สืบสวน / ลึกลับ"],
  ["LIMITED", "เล่มพิเศษ / Limited"],
] as const;

const FIGURE_FILTERS = [
  ["ALL", "ทั้งหมด"],
  ["NENDOROID", "Nendoroid"],
  ["SCALE", "Scale Figure"],
  ["POP_UP_PARADE", "Pop Up Parade"],
] as const;

function matchesMangaSubcategory(
  series: CatalogMangaSeries,
  subcategory: string,
): boolean {
  if (subcategory === "ALL") return true;
  const searchable = `${series.title} ${series.publisher}`.toLocaleLowerCase();
  if (subcategory === "LIMITED") {
    return series.volumes.some((volume) =>
      `${volume.variantLabel ?? ""} ${volume.title}`.toLocaleLowerCase().includes("limited"),
    );
  }
  const keywordGroups: Record<string, readonly string[]> = {
    ACTION: ["action", "ต่อสู้", "ผจญภัย", "jujutsu", "jujutsu kaisen", "นักล่า"],
    FANTASY: ["fantasy", "แฟนตาซี", "เวทมนตร์", "เวทมนตร์", "มหาเวทย์", "ปีศาจ"],
    MYSTERY: ["mystery", "สืบสวน", "ลึกลับ", "นักสืบ", "ปริศนา"],
  };
  return (keywordGroups[subcategory] ?? []).some((keyword) =>
    searchable.includes(keyword.toLocaleLowerCase()),
  );
}

function matchesFigureSubcategory(figure: CatalogFigure, subcategory: string): boolean {
  if (subcategory === "ALL") return true;
  const searchable = `${figure.name} ${figure.series} ${figure.manufacturer} ${figure.scale}`
    .toLocaleLowerCase();
  if (subcategory === "NENDOROID") return searchable.includes("nendoroid");
  if (subcategory === "SCALE") return /scale|1\/\d+/i.test(searchable);
  return searchable.includes("pop up parade");
}

function matchesStatus(
  category: StoreCategory,
  item: CatalogMangaSeries | CatalogFigure,
  status: StoreStatus,
): boolean {
  if (status === "ALL") return true;
  if (category === "MANGA") {
    const series = item as CatalogMangaSeries;
    return series.volumes.some((volume) =>
      status === "IN_STOCK"
        ? volume.status === "IN_STOCK" && volume.stock > 0
        : volume.status === "PREORDER" && volume.stock > 0,
    );
  }
  const figure = item as CatalogFigure;
  return status === "IN_STOCK"
    ? figure.status === "IN_STOCK" && figure.stockOrQuotaRemaining > 0
    : figure.status === "PREORDER_OPEN" && figure.stockOrQuotaRemaining > 0;
}

const moneyFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 0,
});

function getSeriesPrice(series: CatalogMangaSeries): number | null {
  const available = series.volumes.filter((volume) => volume.status !== "OUT_OF_STOCK");
  return available.length > 0
    ? Math.min(...available.map((volume) => volume.price))
    : null;
}

function mangaBadge(series: CatalogMangaSeries): { label: string; style: string } {
  if (series.volumes.some((volume) => volume.status === "PREORDER")) {
    return { label: "Pre-order", style: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300" };
  }
  if (series.volumes.some((volume) => volume.status === "IN_STOCK")) {
    return { label: "In Stock", style: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/80 dark:bg-emerald-950/60 dark:text-emerald-300" };
  }
  return { label: "สินค้าหมด", style: "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-400" };
}

function figureBadge(figure: CatalogFigure): { label: string; style: string } {
  if (figure.status === "PREORDER_OPEN" && figure.depositAmount > 0) {
    return { label: "เปิดรับมัดจำ", style: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300" };
  }
  if (figure.status === "PREORDER_OPEN") {
    return { label: "Pre-order", style: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300" };
  }
  if (figure.status === "IN_STOCK") {
    return { label: "In Stock", style: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/80 dark:bg-emerald-950/60 dark:text-emerald-300" };
  }
  return { label: "ปิดรับจอง", style: "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-400" };
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
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-orange-100">
            <Sparkles size={14} aria-hidden="true" />
            คัดสรรเรื่องโปรดและของสะสมสำหรับคุณ
          </span>
          <h1 className="mt-5 max-w-2xl text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            เปิดโลกมังงะ
            <br />
            <span className="text-orange-400">สะสมทุกความชอบ</span>
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
            เลือกอ่านเล่มโปรด จองของสะสมรุ่นพิเศษ และช้อปได้สะดวกในที่เดียว
            พร้อมจัดส่งถึงบ้าน
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onBrowse("MANGA")}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-950/20 transition hover:bg-orange-400"
            >
              เลือกอ่านมังงะ <ArrowRight size={17} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onBrowse("FIGURE")}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              ดู Figure / ของสะสม
            </button>
          </div>
        </div>
        <div className="hidden lg:block">
          <div className="relative mx-auto flex h-72 max-w-md items-center justify-center">
            <div className="absolute h-56 w-56 rotate-[-12deg] rounded-3xl border border-white/15 bg-white/5 shadow-2xl backdrop-blur" />
            <div className="absolute ml-20 mt-8 h-56 w-44 rotate-[10deg] rounded-3xl border border-orange-300/30 bg-gradient-to-br from-orange-500/80 to-rose-700/80 shadow-2xl">
              <div className="flex h-full flex-col justify-between p-5">
                <Sparkles className="text-white/90" size={24} aria-hidden="true" />
                <span className="text-right text-xs font-black tracking-[0.25em] text-white/80">
                  COLLECT
                  <br />
                  YOUR STORY
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function StorefrontPage() {
  const [category, setCategory] = useState<StoreCategory>("MANGA");
  const [subcategory, setSubcategory] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<StoreStatus>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [catalog, setCatalog] = useState<CatalogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const filteredManga = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    return (catalog?.mangaSeries ?? []).filter((series) => {
      const queryMatches =
        query.length === 0 ||
        `${series.title} ${series.publisher} ${series.volumes
          .map((volume) => `${volume.title} ${volume.variantLabel ?? ""} ${volume.isbn ?? ""}`)
          .join(" ")}`
          .toLocaleLowerCase()
          .includes(query);
      return queryMatches &&
        matchesMangaSubcategory(series, subcategory) &&
        matchesStatus("MANGA", series, statusFilter);
    });
  }, [catalog, searchQuery, statusFilter, subcategory]);
  const filteredFigures = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    return (catalog?.figures ?? []).filter((figure) => {
      const queryMatches =
        query.length === 0 ||
        `${figure.name} ${figure.character} ${figure.series} ${figure.manufacturer} ${figure.janCode}`
          .toLocaleLowerCase()
          .includes(query);
      return queryMatches &&
        matchesFigureSubcategory(figure, subcategory) &&
        matchesStatus("FIGURE", figure, statusFilter);
    });
  }, [catalog, searchQuery, statusFilter, subcategory]);

  function browseCollection(nextCategory: StoreCategory): void {
    setCategory(nextCategory);
    setSubcategory("ALL");
    document.getElementById("browse-collection")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  async function loadCatalog(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      setCatalog(await fetchCatalog());
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

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <StorefrontHero onBrowse={browseCollection} />

        <section id="browse-collection" className="mt-10 scroll-mt-24" aria-labelledby="catalog-heading">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-700">
                Browse collection
              </p>
              <h2 id="catalog-heading" className="mt-1 text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-100 sm:text-3xl">
                เลือกสิ่งที่คุณชอบ
              </h2>
            </div>
            <div
              className="inline-flex w-fit rounded-xl border border-zinc-200 bg-white p-1 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              role="tablist"
              aria-label="หมวดหมู่สินค้า"
            >
              <button
                type="button"
                role="tab"
                aria-selected={category === "MANGA"}
                onClick={() => {
                  setCategory("MANGA");
                  setSubcategory("ALL");
                }}
                className={`rounded-lg px-4 py-2.5 text-sm font-bold transition ${
                  category === "MANGA"
                    ? "bg-zinc-950 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-950"
                    : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                มังงะทั้งหมด
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={category === "FIGURE"}
                onClick={() => {
                  setCategory("FIGURE");
                  setSubcategory("ALL");
                }}
                className={`rounded-lg px-4 py-2.5 text-sm font-bold transition ${
                  category === "FIGURE"
                    ? "bg-zinc-950 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-950"
                    : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                Figure / ของสะสม
              </button>
            </div>
          </div>

          <div className="mt-5 space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <label className="flex min-h-11 items-center gap-3 rounded-xl border border-zinc-300 bg-zinc-50 px-3 text-zinc-500 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400">
              <Search size={18} aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="ค้นหาชื่อเรื่อง ตัวละคร หรือรหัส ISBN"
                aria-label="ค้นหาสินค้า"
                className="min-w-0 flex-1 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-500 dark:text-zinc-100 dark:placeholder:text-zinc-500"
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
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2" aria-label="กรองประเภทย่อย">
                {(category === "MANGA" ? MANGA_FILTERS : FIGURE_FILTERS).map(
                  ([value, label]) => (
                    <button
                      type="button"
                      key={value}
                      aria-pressed={subcategory === value}
                      onClick={() => setSubcategory(value)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        subcategory === value
                          ? "border-orange-600 bg-orange-600 text-white"
                          : "border-zinc-300 bg-white text-zinc-700 hover:border-orange-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-orange-700"
                      }`}
                    >
                      {label}
                    </button>
                  ),
                )}
              </div>
              <div className="flex flex-wrap gap-2" aria-label="กรองสถานะสินค้า">
                {(
                  [
                    ["ALL", "ทุกสถานะ"],
                    ["IN_STOCK", "พร้อมส่ง"],
                    ["PREORDER", "เปิดพรีออเดอร์"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    aria-pressed={statusFilter === value}
                    onClick={() => setStatusFilter(value)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      statusFilter === value
                        ? "border-zinc-800 bg-zinc-800 text-white dark:border-zinc-200 dark:bg-zinc-200 dark:text-zinc-900"
                        : "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-72 animate-pulse rounded-2xl bg-white shadow-sm dark:bg-zinc-900" />
              ))}
            </div>
          ) : error ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-900 dark:bg-amber-950/40">
              <p className="font-semibold text-amber-950 dark:text-amber-100" role="alert">{error}</p>
              <button
                type="button"
                onClick={() => void loadCatalog()}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white"
              >
                <RefreshCw size={15} aria-hidden="true" /> ลองโหลดอีกครั้ง
              </button>
            </div>
          ) : category === "MANGA" ? (
            filteredManga.length > 0 ? (
              <MangaGrid series={filteredManga} />
            ) : (
              <EmptyCatalog
                label="ไม่พบสินค้าที่ตรงกับเงื่อนไขการค้นหา"
                actionLabel="ล้างตัวกรองทั้งหมด"
                onAction={() => {
                  setSearchQuery("");
                  setSubcategory("ALL");
                  setStatusFilter("ALL");
                }}
              />
            )
          ) : (
            filteredFigures.length > 0 ? (
              <FigureGrid figures={filteredFigures} />
            ) : (
              <EmptyCatalog
                label="ไม่พบสินค้าที่ตรงกับเงื่อนไขการค้นหา"
                actionLabel="ล้างตัวกรองทั้งหมด"
                onAction={() => {
                  setSearchQuery("");
                  setSubcategory("ALL");
                  setStatusFilter("ALL");
                }}
              />
            )
          )}
        </section>

        <section className="mt-10 grid gap-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-3 sm:p-6">
          <StoreBenefit
            icon={<BookOpen size={20} aria-hidden="true" />}
            title="เลือกซื้อได้ตามเล่ม"
            text="เลือกเล่มพร้อมส่งและพรีออเดอร์ในตะกร้าเดียว"
          />
          <StoreBenefit
            icon={<Boxes size={20} aria-hidden="true" />}
            title="ของสะสมคัดสรร"
            text="ดูราคาเต็มหรือเลือกวางมัดจำสินค้าพรีออเดอร์"
          />
          <StoreBenefit
            icon={<Truck size={20} aria-hidden="true" />}
            title="จัดส่งทั่วประเทศ"
            text="ติดตามสถานะจัดส่งได้จากหน้ารายละเอียดคำสั่งซื้อ"
          />
        </section>
      </div>
    </main>
  );
}

function MangaGrid({ series }: { series: CatalogMangaSeries[] }) {
  if (series.length === 0) {
    return <EmptyCatalog label="ยังไม่มีมังงะในร้าน" />;
  }

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {series.map((item) => {
        const badge = mangaBadge(item);
        const price = getSeriesPrice(item);
        const preorderVolume = item.volumes.find((volume) => volume.status === "PREORDER");
        return (
          <Link
            key={item.id}
            href={`/manga/${encodeURIComponent(item.id)}`}
            className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-orange-200 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-orange-800"
          >
            <div className="relative flex h-52 items-end overflow-hidden bg-gradient-to-br from-indigo-950 via-violet-900 to-slate-900 p-5">
              <div className="absolute -right-4 -top-8 h-40 w-40 rounded-full border-[18px] border-white/5" />
              <div className="absolute right-9 top-8 rotate-6 rounded-2xl border border-white/20 bg-white/10 p-4 text-white/70 backdrop-blur">
                <BookOpen size={42} strokeWidth={1.3} aria-hidden="true" />
              </div>
              <span className={`absolute left-4 top-4 rounded-full border px-3 py-1.5 text-xs font-semibold ${badge.style}`}>
                {badge.label}
              </span>
              <span className="relative text-xs font-bold uppercase tracking-[0.24em] text-violet-100/75">
                MANGA SERIES
              </span>
            </div>
            <div className="p-5">
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{item.publisher}</p>
              <h3 className="mt-1 line-clamp-2 min-h-12 text-lg font-extrabold leading-6 text-zinc-950 group-hover:text-orange-700 dark:text-zinc-100">
                {item.title}
              </h3>
              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <p                   className="text-xs text-zinc-500 dark:text-zinc-400">
                    {item.volumes.length} รายการเล่ม
                  </p>
                  <p className="mt-1 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {price === null ? "สินค้าหมด" : `เริ่มต้น ${moneyFormatter.format(price)}`}
                  </p>
                </div>
                {preorderVolume ? (
                  <span className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                    <CalendarDays size={14} aria-hidden="true" /> เล่มใหม่ Pre-order
                  </span>
                ) : null}
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-4 text-sm font-bold text-orange-700 dark:border-zinc-800">
                ดูรายละเอียดเรื่องนี้ <ArrowRight size={17} aria-hidden="true" />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function FigureGrid({ figures }: { figures: CatalogFigure[] }) {
  if (figures.length === 0) {
    return <EmptyCatalog label="ยังไม่มี Figure ในร้าน" />;
  }

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {figures.map((figure) => {
        const badge = figureBadge(figure);
        return (
          <Link
            key={figure.slug}
            href={`/figures/${encodeURIComponent(figure.slug)}`}
            className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-orange-200 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-orange-800"
          >
            <div className="relative flex h-52 items-center justify-center overflow-hidden bg-gradient-to-br from-orange-50 via-rose-50 to-violet-100">
              <div className="absolute h-36 w-36 rounded-full bg-white/70 shadow-inner" />
              <div className="relative flex h-28 w-24 items-center justify-center rounded-[1.7rem] border border-white bg-white/70 text-orange-600 shadow-lg backdrop-blur">
                <Sparkles size={46} strokeWidth={1.2} aria-hidden="true" />
              </div>
              <span className={`absolute left-4 top-4 rounded-full border px-3 py-1.5 text-xs font-semibold ${badge.style}`}>
                {badge.label}
              </span>
              <span className="absolute bottom-4 right-4 rounded-lg bg-white/85 px-2.5 py-1.5 text-xs font-bold text-zinc-600 dark:bg-zinc-950/80 dark:text-zinc-300">
                {figure.manufacturer}
              </span>
            </div>
            <div className="p-5">
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{figure.series}</p>
              <h3 className="mt-1 min-h-12 text-lg font-extrabold leading-6 text-zinc-950 group-hover:text-orange-700 dark:text-zinc-100">
                {figure.name}
              </h3>
              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {figure.status === "PREORDER_OPEN" && figure.depositAmount > 0
                      ? `มัดจำ ${moneyFormatter.format(figure.depositAmount)}`
                      : "ราคาเต็ม"}
                  </p>
                  <p className="mt-1 text-lg font-extrabold text-zinc-950 dark:text-zinc-100">
                    {moneyFormatter.format(
                      figure.status === "PREORDER_OPEN" && figure.depositAmount > 0
                        ? figure.depositAmount
                        : figure.fullPrice,
                    )}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-sm font-bold text-orange-700">
                  รายละเอียด <ArrowRight size={16} aria-hidden="true" />
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function EmptyCatalog({
  label,
  actionLabel,
  onAction,
}: {
  label: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center dark:border-zinc-700 dark:bg-zinc-900">
      <Boxes className="mx-auto text-zinc-400" size={34} aria-hidden="true" />
      <p className="mt-3 font-semibold text-zinc-700 dark:text-zinc-300" role="status">{label}</p>
      {actionLabel && onAction ? (
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
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">{text}</p>
      </div>
    </div>
  );
}

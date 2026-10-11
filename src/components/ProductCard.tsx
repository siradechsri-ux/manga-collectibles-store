"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookMarked,
  BookOpen,
  Boxes,
  CalendarDays,
  Layers,
  Package,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import type { CatalogFigure, CatalogMangaSeries } from "../lib/catalog-client";
import { useAuth } from "../contexts/AuthContext";
import { canShop } from "../utils/permissions";

const moneyFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 0,
});

export interface BookCoverFallbackProps {
  title: string;
  volumeNumber?: number | string;
  isNovel?: boolean;
  className?: string;
  compact?: boolean;
}

/**
 * Minimal Typography Card for Manga and Light Novels.
 * 100% clean UI, standard book aspect ratio (2:3 or 3:4), zero external images, zero emojis.
 */
export function BookCoverFallback({
  title,
  volumeNumber,
  isNovel = false,
  className = "",
  compact = false,
}: BookCoverFallbackProps) {
  const Icon = isNovel ? BookMarked : BookOpen;
  const categoryLabel = isNovel ? "LIGHT NOVEL" : "MANGA";

  return (
    <div
      className={`relative flex h-full w-full flex-col justify-between overflow-hidden rounded-xl border p-3 select-none transition-colors ${
        isNovel
          ? "border-amber-200/90 bg-gradient-to-br from-amber-50 via-stone-50 to-orange-100/50 text-stone-900 dark:border-amber-900/60 dark:from-stone-900 dark:via-zinc-900 dark:to-stone-950 dark:text-stone-100"
          : "border-zinc-200/90 bg-gradient-to-br from-zinc-100 via-stone-50 to-orange-50/40 text-zinc-900 dark:border-zinc-800 dark:from-zinc-900 dark:via-zinc-900/90 dark:to-zinc-950 dark:text-zinc-100"
      } ${className}`}
      aria-label={`การ์ดหนังสือ ${title}${volumeNumber ? ` เล่ม ${volumeNumber}` : ""}`}
    >
      {/* Subtle decorative spine stripe */}
      <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-orange-500/70 via-amber-500/50 to-orange-600/70 dark:from-orange-500/50 dark:to-orange-700/50" />

      {/* Top section: Category indicator & Lucide icon */}
      <div className="flex items-start justify-between gap-1 pl-1">
        <span className="rounded bg-black/5 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-stone-700 dark:bg-white/10 dark:text-stone-300">
          {categoryLabel}
        </span>
        <div className="rounded-lg bg-white/80 p-1.5 text-orange-700 shadow-xs backdrop-blur-xs dark:bg-zinc-800/90 dark:text-orange-400">
          <Icon size={compact ? 14 : 18} aria-hidden="true" />
        </div>
      </div>

      {/* Center section: Large volume number typography & Title */}
      <div className="my-auto py-1 pl-1">
        {volumeNumber !== undefined && volumeNumber !== null ? (
          <div className="inline-flex items-center gap-1 rounded-md border border-orange-300/70 bg-white/90 px-2 py-0.5 text-xs font-black text-orange-900 shadow-xs dark:border-orange-900/80 dark:bg-zinc-900 dark:text-orange-300">
            <span>เล่ม</span>
            <span className="text-sm font-black">{volumeNumber}</span>
          </div>
        ) : null}
        <p
          className={`mt-2 font-bold leading-tight line-clamp-3 text-zinc-900 dark:text-zinc-100 ${
            compact ? "text-xs" : "text-sm"
          }`}
          title={title}
        >
          {title}
        </p>
      </div>

      {/* Bottom section: Authenticity tag */}
      <div className="flex items-center justify-between border-t border-black/5 pt-1.5 pl-1 text-[9px] font-semibold text-stone-500 dark:border-white/10 dark:text-stone-400">
        <span>ฉบับลิขสิทธิ์</span>
        <span>VAT 0%</span>
      </div>
    </div>
  );
}

export interface BookCoverImageProps {
  src?: string | null;
  alt?: string;
  title: string;
  volumeNumber?: number | string;
  isNovel?: boolean;
  aspectRatio?: "2/3" | "3/4";
  className?: string;
  priority?: boolean;
}

/**
 * Standard Manga / Light Novel Minimal Typography Card.
 * Replaces external images with clean typography & aspect ratio 2:3 or 3:4.
 */
export function BookCoverImage({
  title,
  volumeNumber,
  isNovel = false,
  aspectRatio = "2/3",
  className = "",
}: BookCoverImageProps) {
  const ratioClass = aspectRatio === "3/4" ? "aspect-[3/4]" : "aspect-[2/3]";

  return (
    <div className={`relative ${ratioClass} w-full overflow-hidden rounded-xl ${className}`}>
      <BookCoverFallback
        title={title}
        volumeNumber={volumeNumber}
        isNovel={isNovel}
        compact
      />
    </div>
  );
}

export interface CollectibleCoverImageProps {
  src?: string | null;
  alt?: string;
  name: string;
  category?: string;
  scale?: string;
  className?: string;
}

/**
 * Minimal Typography Card for Collectibles (Figure, Plamo, Goods, Accessories).
 * Pure typography, no external network requests, clean Dark/Light styling.
 */
export function CollectibleCoverImage({
  name,
  category,
  scale,
  className = "",
}: CollectibleCoverImageProps) {
  const isPlamo = category === "PLAMO";
  const isGoods = category === "GOODS";
  const isAccessory = category === "ACCESSORY";

  const Icon = isPlamo
    ? Boxes
    : isGoods
      ? ShoppingBag
      : isAccessory
        ? ShieldCheck
        : Package;

  const categoryLabel = isPlamo
    ? "PLAMO"
    : isGoods
      ? "GOODS"
      : isAccessory
        ? "CARE & ACCESSORY"
        : "FIGURE";

  return (
    <div
      className={`relative flex aspect-square w-full flex-col justify-between overflow-hidden rounded-xl border border-zinc-200/90 bg-gradient-to-br from-zinc-50 via-zinc-100/70 to-orange-50/30 p-3 select-none text-zinc-900 transition-colors dark:border-zinc-800 dark:from-zinc-900 dark:via-zinc-850 dark:to-zinc-900 dark:text-zinc-100 ${className}`}
      aria-label={`การ์ดของสะสม ${name}`}
    >
      {/* Top section: Category badge & Icon */}
      <div className="flex items-start justify-between gap-1">
        <span className="rounded bg-black/5 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-stone-700 dark:bg-white/10 dark:text-stone-300">
          {categoryLabel}
        </span>
        <div className="rounded-lg bg-white/80 p-1.5 text-orange-700 shadow-xs backdrop-blur-xs dark:bg-zinc-800 dark:text-orange-400">
          <Icon size={18} aria-hidden="true" />
        </div>
      </div>

      {/* Center section: Product name & Scale/Grade */}
      <div className="my-auto py-2 text-center">
        <div className="mx-auto mb-1.5 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-700 shadow-xs dark:bg-orange-950/70 dark:text-orange-300">
          <Icon size={20} aria-hidden="true" />
        </div>
        <p className="line-clamp-2 text-xs font-bold leading-tight text-zinc-900 dark:text-zinc-100 sm:text-sm">
          {name}
        </p>
        {scale ? (
          <span className="mt-1 inline-block rounded-md bg-zinc-200/70 px-2 py-0.5 text-[10px] font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {scale}
          </span>
        ) : null}
      </div>

      {/* Bottom section: Authenticity tag & Tax */}
      <div className="flex items-center justify-between border-t border-black/5 pt-1.5 text-[9px] font-semibold text-zinc-500 dark:border-white/10 dark:text-zinc-400">
        <span>ของแท้ 100%</span>
        <span>VAT 7%</span>
      </div>
    </div>
  );
}

export interface MangaSeriesCardProps {
  series: CatalogMangaSeries;
  type: "MANGA" | "LIGHT_NOVEL";
}

/**
 * Modern Manga or Light Novel Series Card used in the storefront catalog.
 */
export function MangaSeriesCard({ series, type }: MangaSeriesCardProps) {
  const isNovel = type === "LIGHT_NOVEL";
  const startingPrice =
    series.volumes.length > 0
      ? Math.min(...series.volumes.map((v) => v.price))
      : null;
  const preorderVolume = series.volumes.find((v) => v.status === "PREORDER");

  return (
    <Link
      href={`/manga/${encodeURIComponent(series.id)}`}
      className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs transition hover:-translate-y-1 hover:border-orange-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-orange-800"
    >
      <div>
        <div className="flex gap-4">
          <div className="w-24 shrink-0 sm:w-28">
            <BookCoverImage
              title={series.title}
              volumeNumber={series.volumes[0]?.volumeNumber ?? 1}
              isNovel={isNovel}
              aspectRatio="2/3"
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="rounded bg-orange-100 px-2 py-0.5 text-[10px] font-extrabold text-orange-800 dark:bg-orange-950 dark:text-orange-300">
                  {isNovel ? "LIGHT NOVEL" : "MANGA"}
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                    preorderVolume
                      ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                      : series.volumes.some((v) => v.status === "IN_STOCK" && v.stock > 0)
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/80 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-400"
                  }`}
                >
                  {preorderVolume
                    ? "Pre-order"
                    : series.volumes.some((v) => v.status === "IN_STOCK" && v.stock > 0)
                      ? "พร้อมส่ง"
                      : "สินค้าหมด"}
                </span>
                <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                  VAT 0%
                </span>
              </div>
              <p className="mt-1.5 truncate text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                {series.publisher}
              </p>
              <h3 className="mt-1 line-clamp-2 text-sm font-extrabold text-zinc-950 group-hover:text-orange-700 dark:text-zinc-100 sm:text-base">
                {series.title}
              </h3>
            </div>

            <div className="mt-3">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {series.volumes.length} รายการเล่ม
              </p>
              <p className="mt-0.5 text-sm font-black text-zinc-900 dark:text-zinc-100">
                {startingPrice === null
                  ? "สินค้าหมด"
                  : `เริ่มต้น ${moneyFormatter.format(startingPrice)}`}
              </p>
            </div>
          </div>
        </div>

        {preorderVolume ? (
          <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
            <CalendarDays size={13} aria-hidden="true" />
            <span>เปิดรับจองเล่มล่าสุด</span>
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 text-xs font-bold text-orange-700 dark:border-zinc-800 dark:text-orange-400">
        <span>เลือกดูเล่มทั้งหมด</span>
        <ArrowRight size={15} aria-hidden="true" />
      </div>
    </Link>
  );
}

export interface CollectibleProductCardProps {
  item: CatalogFigure;
  onAddToCart?: (item: CatalogFigure) => void;
}

/**
 * Modern Collectible Product Card (Figure, Plamo, Goods, Accessory).
 */
export function CollectibleProductCard({
  item,
  onAddToCart,
}: CollectibleProductCardProps) {
  const { user } = useAuth();
  const userCanShop = canShop(user?.role);

  return (
    <div className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xs transition hover:-translate-y-1 hover:border-orange-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-orange-800">
      <div>
        <div className="relative p-3">
          <CollectibleCoverImage
            name={item.name}
            category={item.category}
            scale={item.scale}
          />

          <div className="absolute bottom-5 right-5 flex items-center gap-1.5">
            {item.grade ? (
              <span className="rounded-md bg-orange-600/90 px-2 py-0.5 text-[10px] font-black text-white shadow-xs">
                {item.grade}
              </span>
            ) : null}
            <span className="rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
              {item.manufacturer || "Official"}
            </span>
          </div>
        </div>

        <div className="px-5 pb-2">
          {/* Header Badges: Clean flex items-center gap-2 flex-wrap without overlapping */}
          <div className="mb-2 flex items-center gap-2 flex-wrap">
            <span className="rounded bg-orange-100 px-2 py-0.5 text-[10px] font-extrabold text-orange-800 dark:bg-orange-950 dark:text-orange-300">
              {item.category ?? "FIGURE"}
            </span>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                item.status === "PREORDER_OPEN"
                  ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                  : item.status === "IN_STOCK"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : "border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              {item.status === "PREORDER_OPEN"
                ? "Pre-order"
                : item.status === "IN_STOCK"
                  ? "พร้อมส่ง"
                  : "ปิดรับจอง"}
            </span>
            <span className="ml-auto text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
              VAT 7%
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              {item.series || "สินค้าสะสม"}
            </p>
          </div>
          <h3 className="mt-1 line-clamp-2 min-h-12 text-sm font-extrabold leading-tight text-zinc-950 group-hover:text-orange-700 dark:text-zinc-100 sm:text-base">
            {item.name}
          </h3>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {item.status === "PREORDER_OPEN" && item.depositAmount > 0
                  ? "เงินมัดจำสั่งจอง"
                  : "ราคา"}
              </p>
              <p className="text-lg font-black text-zinc-950 dark:text-zinc-100">
                {moneyFormatter.format(
                  item.status === "PREORDER_OPEN" && item.depositAmount > 0
                    ? item.depositAmount
                    : item.fullPrice,
                )}
              </p>
            </div>
            {item.scale ? (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {item.scale}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="border-t border-zinc-100 p-4 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Link
            href={`/figures/${encodeURIComponent(item.slug)}`}
            className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl border border-zinc-200 bg-white text-xs font-bold text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            รายละเอียด
          </Link>
          {userCanShop ? (
            item.stockOrQuotaRemaining > 0 && onAddToCart ? (
              <button
                type="button"
                onClick={() => onAddToCart(item)}
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-orange-600 px-3.5 text-xs font-bold text-white transition hover:bg-orange-700"
              >
                <ShoppingBag size={14} aria-hidden="true" />
                หยิบใส่ตะกร้า
              </button>
            ) : (
              <span className="inline-flex min-h-10 items-center justify-center rounded-xl bg-zinc-100 px-3 text-xs font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                สินค้าหมด
              </span>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function ProductCard(
  props:
    | ({ variant: "BOOK" } & MangaSeriesCardProps)
    | ({ variant: "COLLECTIBLE" } & CollectibleProductCardProps),
) {
  if (props.variant === "BOOK") {
    return <MangaSeriesCard series={props.series} type={props.type} />;
  }
  return <CollectibleProductCard item={props.item} onAddToCart={props.onAddToCart} />;
}

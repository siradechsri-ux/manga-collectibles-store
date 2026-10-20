"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  ArrowRight,
  BellRing,
  BookMarked,
  BookOpen,
  Boxes,
  CalendarDays,
  Heart,
  Layers,
  Package,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import type { CatalogFigure, CatalogMangaSeries } from "../lib/catalog-client";
import { useAuth } from "../contexts/AuthContext";
import { useWishlist } from "../contexts/WishlistContext";
import { useCompare } from "../contexts/CompareContext";
import BackInStockModal from "./BackInStockModal";
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
  const Icon = BookOpen;
  const categoryLabel = isNovel ? "NOVEL" : "MANGA";
  const formattedVol =
    volumeNumber !== undefined && volumeNumber !== null
      ? typeof volumeNumber === "number"
        ? `VOL. ${String(volumeNumber).padStart(2, "0")}`
        : `VOL. ${volumeNumber}`
      : null;

  return (
    <div
      className={`relative flex h-full w-full flex-col justify-between overflow-hidden rounded-xl border p-2.5 sm:p-3 select-none transition-all shadow-xs ${
        isNovel
          ? "border-amber-300/60 bg-gradient-to-br from-amber-50 via-stone-50 to-orange-100/60 text-stone-900 dark:border-amber-900/40 dark:from-stone-900 dark:via-zinc-900 dark:to-stone-950 dark:text-stone-100"
          : "border-zinc-200/90 bg-gradient-to-br from-zinc-50 via-stone-50 to-orange-50/70 text-zinc-900 dark:border-zinc-800 dark:from-zinc-900 dark:via-zinc-900/90 dark:to-zinc-950 dark:text-zinc-100"
      } ${className}`}
      aria-label={`การ์ดหนังสือ ${title}${formattedVol ? ` ${formattedVol}` : ""}`}
    >
      {/* Subtle decorative spine stripe */}
      <div className="absolute inset-y-0 left-0 w-2.5 bg-gradient-to-b from-orange-500 via-amber-500 to-orange-600 shadow-xs dark:from-orange-500/80 dark:to-orange-700/80" />
      <div className="absolute inset-y-0 left-2.5 w-px bg-black/10 dark:bg-white/10" />

      {/* Top section: Category indicator & Lucide icon */}
      <div className="flex items-start justify-between gap-1 pl-2">
        <span className="rounded bg-black/5 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-stone-700 dark:bg-white/10 dark:text-stone-300">
          {categoryLabel}
        </span>
        <div className="rounded-md bg-white/80 p-1 text-orange-600 shadow-2xs backdrop-blur-xs dark:bg-zinc-800/90 dark:text-orange-400">
          <Icon size={compact ? 12 : 14} aria-hidden="true" />
        </div>
      </div>

      {/* Center section: Large volume number typography & Title */}
      <div className="my-auto py-1 pl-2">
        {formattedVol ? (
          <div className="mb-0.5 text-base sm:text-lg font-black tracking-tight text-zinc-900 dark:text-zinc-100">
            {formattedVol}
          </div>
        ) : null}
        <p
          className={`font-bold leading-snug line-clamp-2 text-zinc-700 dark:text-zinc-300 ${
            compact ? "text-[10px]" : "text-xs"
          }`}
          title={title}
        >
          {title}
        </p>
      </div>

      {/* Bottom section: Authenticity tag */}
      <div className="mt-1 flex items-center justify-between gap-1.5 border-t border-black/10 pt-1.5 pl-2 text-[8px] sm:text-[8.5px] font-bold text-stone-600 dark:border-white/10 dark:text-stone-400">
        <span className="truncate">ฉบับลิขสิทธิ์</span>
        <span className="shrink-0 tracking-wider text-[7.5px] sm:text-[8px] font-black text-orange-700 dark:text-orange-400">OFFICIAL</span>
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
 * Standard Manga / Light Novel Cover Image with Clean Typography Fallback.
 */
export function BookCoverImage({
  src,
  alt,
  title,
  volumeNumber,
  isNovel = false,
  aspectRatio = "2/3",
  className = "",
}: BookCoverImageProps) {
  const [hasError, setHasError] = useState(false);
  const ratioClass = aspectRatio === "3/4" ? "aspect-[3/4]" : "aspect-[2/3]";

  return (
    <div
      className={`relative ${ratioClass} w-full overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800 ${className}`}
    >
      {src && !hasError ? (
        <img
          src={src}
          alt={alt || title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={() => setHasError(true)}
          loading="lazy"
        />
      ) : (
        <BookCoverFallback
          title={title}
          volumeNumber={volumeNumber}
          isNovel={isNovel}
          compact
        />
      )}
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
 * Collectible Image (Figure, Plamo, Goods, Accessories) with Clean Typography Fallback.
 */
export function CollectibleCoverImage({
  src,
  alt,
  name,
  category,
  scale,
  className = "",
}: CollectibleCoverImageProps) {
  const [hasError, setHasError] = useState(false);
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
    ? "GUNPLA / PLAMO"
    : isGoods
      ? "GOODS & MERCH"
      : isAccessory
        ? "CARE & ACCESSORY"
        : "FIGURE";

  const themeClass = isPlamo
    ? "border-sky-300/80 bg-gradient-to-br from-sky-50 via-zinc-50 to-blue-50/40 text-zinc-900 dark:border-sky-900/50 dark:from-zinc-900 dark:via-sky-950/30 dark:to-zinc-950 dark:text-zinc-100"
    : isGoods
      ? "border-violet-300/80 bg-gradient-to-br from-violet-50 via-zinc-50 to-purple-50/40 text-zinc-900 dark:border-violet-900/50 dark:from-zinc-900 dark:via-violet-950/30 dark:to-zinc-950 dark:text-zinc-100"
      : isAccessory
        ? "border-emerald-300/80 bg-gradient-to-br from-emerald-50 via-zinc-50 to-teal-50/40 text-zinc-900 dark:border-emerald-900/50 dark:from-zinc-900 dark:via-emerald-950/30 dark:to-zinc-950 dark:text-zinc-100"
        : "border-zinc-200/90 bg-gradient-to-br from-zinc-50 via-zinc-100/70 to-orange-50/30 text-zinc-900 dark:border-zinc-800 dark:from-zinc-900 dark:via-zinc-800 dark:to-zinc-900 dark:text-zinc-100";

  const iconContainerClass = isPlamo
    ? "bg-sky-100 text-sky-700 dark:bg-sky-950/80 dark:text-sky-300"
    : isGoods
      ? "bg-violet-100 text-violet-700 dark:bg-violet-950/80 dark:text-violet-300"
      : isAccessory
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300"
        : "bg-orange-100 text-orange-700 dark:bg-orange-950/70 dark:text-orange-300";

  const cornerIconClass = isPlamo
    ? "text-sky-700 dark:text-sky-400"
    : isGoods
      ? "text-violet-700 dark:text-violet-400"
      : isAccessory
        ? "text-emerald-700 dark:text-emerald-400"
        : "text-orange-700 dark:text-orange-400";

  return (
    <div
      className={`relative flex aspect-square w-full flex-col justify-between overflow-hidden rounded-xl border transition-colors ${src && !hasError ? "border-zinc-200/90 dark:border-zinc-800" : themeClass} ${className}`}
      aria-label={`การ์ดของสะสม ${name}`}
    >
      {src && !hasError ? (
        <div className="relative h-full w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
          <img
            src={src}
            alt={alt || name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setHasError(true)}
            loading="lazy"
          />
          <div className="absolute top-2 left-2 flex items-center gap-1">
            <span className="rounded bg-black/60 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white backdrop-blur-xs">
              {categoryLabel}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex h-full w-full flex-col justify-between p-3 select-none">
          {/* Top section: Category badge & Icon */}
          <div className="flex items-start justify-between gap-1">
            <span className="rounded bg-black/5 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-stone-700 dark:bg-white/10 dark:text-stone-300">
              {categoryLabel}
            </span>
            <div className={`rounded-lg bg-white/80 p-1.5 shadow-xs backdrop-blur-xs dark:bg-zinc-800 ${cornerIconClass}`}>
              <Icon size={18} aria-hidden="true" />
            </div>
          </div>

          {/* Center section: Product name & Scale/Grade */}
          <div className="my-auto py-2 text-center">
            <div className={`mx-auto mb-1.5 flex h-10 w-10 items-center justify-center rounded-xl shadow-xs ${iconContainerClass}`}>
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
      )}
    </div>
  );
}

export interface MangaSeriesCardProps {
  series: CatalogMangaSeries;
  type: "MANGA" | "LIGHT_NOVEL";
  returnTo?: string;
}

/**
 * Modern Manga or Light Novel Series Card used in the storefront catalog.
 */
export function MangaSeriesCard({ series, type, returnTo }: MangaSeriesCardProps) {
  const { user } = useAuth();
  const userCanShop = canShop(user?.role);
  const { isInWishlist, toggleWishlist } = useWishlist();
  const isNovel = type === "LIGHT_NOVEL";
  const startingPrice =
    series.volumes.length > 0
      ? Math.min(...series.volumes.map((v) => v.price))
      : null;
  const preorderVolume = series.volumes.find((v) => v.status === "PREORDER");
  const isWishlisted = isInWishlist(series.id, isNovel ? "LIGHT_NOVEL" : "MANGA");

  return (
    <Link
      href={`/manga/${encodeURIComponent(series.id)}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs transition hover:-translate-y-1 hover:border-orange-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-orange-800"
    >
      {userCanShop ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWishlist({
              id: series.id,
              itemType: isNovel ? "LIGHT_NOVEL" : "MANGA",
              title: series.title,
              price: startingPrice ?? 0,
              imageUrl:
                series.coverUrl ||
                series.coverImage ||
                series.images?.[0] ||
                series.volumes[0]?.coverUrl ||
                null,
              url: `/manga/${encodeURIComponent(series.id)}`,
              category: series.category,
              isPreorder: Boolean(preorderVolume),
            });
          }}
          aria-label={isWishlisted ? "นำออกจากรายการที่ถูกใจ" : "เพิ่มในรายการที่ถูกใจ"}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-zinc-600 shadow-sm backdrop-blur-xs transition hover:scale-110 hover:text-red-600 dark:bg-zinc-800/90 dark:text-zinc-300 dark:hover:text-red-400"
        >
          <Heart
            size={16}
            className={isWishlisted ? "fill-red-500 text-red-500" : ""}
            aria-hidden="true"
          />
        </button>
      ) : null}
      <div>
        <div className="flex gap-4">
          <div className="w-24 shrink-0 sm:w-28">
            <BookCoverImage
              src={
                series.coverUrl ||
                series.coverImage ||
                series.images?.[0] ||
                series.volumes[0]?.coverUrl
              }
              alt={series.title}
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

export function MangaShowcaseCard({ series }: { series: CatalogMangaSeries }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isCycling, setIsCycling] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const images = Array.from(
    new Set(
      [
        series.coverUrl,
        series.coverImage,
        ...(series.images ?? []),
        ...series.volumes.flatMap((volume) => [
          volume.coverUrl,
          ...(volume.images ?? []),
        ]),
      ].filter((image): image is string => Boolean(image)),
    ),
  );
  const hasMultipleImages = images.length > 1;
  const nextIndex = hasMultipleImages ? (activeIndex + 1) % images.length : activeIndex;
  const hasAvailableVolumes = series.volumes.some(
    (volume) => volume.status === "IN_STOCK" && volume.stock > 0,
  );
  const hasPreorderVolumes = series.volumes.some(
    (volume) => volume.status === "PREORDER",
  );
  const startingPrice = series.volumes.length
    ? Math.min(...series.volumes.map((volume) => volume.price))
    : null;

  useEffect(() => {
    if (!isCycling || !hasMultipleImages) return;
    let transitionTimeout: ReturnType<typeof setTimeout> | undefined;
    const interval = setInterval(() => {
      setIsFading(true);
      transitionTimeout = setTimeout(() => {
        setActiveIndex((current) => (current + 1) % images.length);
        setIsFading(false);
      }, 650);
    }, 2200);
    return () => {
      clearInterval(interval);
      if (transitionTimeout) clearTimeout(transitionTimeout);
    };
  }, [hasMultipleImages, images.length, isCycling]);

  useEffect(() => {
    setActiveIndex(0);
  }, [series.id]);

  const isNovel = series.category === "LIGHT_NOVEL";
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { user } = useAuth();
  const userCanShop = canShop(user?.role);
  const isWishlisted = isInWishlist(series.id, isNovel ? "LIGHT_NOVEL" : "MANGA");

  return (
    <Link
      href={`/manga/${encodeURIComponent(series.id)}`}
      onMouseEnter={() => setIsCycling(true)}
      onMouseLeave={() => { setIsCycling(false); setIsFading(false); }}
      onFocus={() => setIsCycling(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsCycling(false);
          setIsFading(false);
        }
      }}
      className="group flex h-full min-h-112 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-orange-300 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-orange-800"
    >
      <div className="relative h-80 shrink-0 overflow-hidden bg-zinc-100 dark:bg-zinc-800 sm:h-88">
        {images.length > 0 ? (
          <>
            <img
              src={images[activeIndex]}
              alt={`${series.title} ปกหนังสือ`}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              loading="lazy"
            />
            {hasMultipleImages ? (
              <img
                src={images[nextIndex]}
                alt={`${series.title} ภาพปกเพิ่มเติม`}
                aria-hidden="true"
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${isFading ? "opacity-100" : "opacity-0"}`}
                loading="lazy"
              />
            ) : null}
          </>
        ) : (
          <BookCoverFallback
            title={series.title}
            volumeNumber={series.volumes[0]?.volumeNumber}
            isNovel={isNovel}
          />
        )}
        <div className="absolute left-3 top-3 flex items-center gap-2">
          <span className="rounded bg-black/70 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
            {isNovel ? "LIGHT NOVEL" : "MANGA"}
          </span>
          <span className="rounded-full bg-black/65 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
            {hasPreorderVolumes ? "Pre-order" : hasAvailableVolumes ? "พร้อมส่ง" : "สินค้าหมด"}
          </span>
        </div>
        {userCanShop ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleWishlist({
                id: series.id,
                itemType: isNovel ? "LIGHT_NOVEL" : "MANGA",
                title: series.title,
                price: startingPrice ?? 0,
                imageUrl: images[0] ?? null,
                url: `/manga/${encodeURIComponent(series.id)}`,
                category: series.category,
                isPreorder: hasPreorderVolumes,
              });
            }}
            aria-label={isWishlisted ? "นำออกจากรายการที่ถูกใจ" : "เพิ่มในรายการที่ถูกใจ"}
            className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-zinc-600 shadow-sm backdrop-blur-xs transition hover:scale-110 hover:text-red-600 dark:bg-zinc-800/90 dark:text-zinc-300 dark:hover:text-red-400"
          >
            <Heart
              size={16}
              className={isWishlisted ? "fill-red-500 text-red-500" : ""}
              aria-hidden="true"
            />
          </button>
        ) : null}
        {hasMultipleImages ? (
          <span className="absolute bottom-3 right-3 rounded-full bg-black/65 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
            {activeIndex + 1} / {images.length}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col justify-between p-5">
        <div>
          <p className="truncate text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            {series.publisher}
          </p>
          <h2 className="mt-1 line-clamp-2 text-lg font-extrabold text-zinc-950 group-hover:text-orange-700 dark:text-zinc-100 dark:group-hover:text-orange-400">
            {series.title}
          </h2>
        </div>
        <div className="mt-4 flex items-end justify-between gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {series.volumes.length} รายการเล่ม
            </p>
            <p className="mt-0.5 text-base font-black text-zinc-900 dark:text-zinc-100">
              {startingPrice === null ? "สินค้าหมด" : `เริ่มต้น ${moneyFormatter.format(startingPrice)}`}
            </p>
          </div>
          <span className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-orange-600 px-3 text-xs font-bold text-white transition group-hover:bg-orange-700">
            เลือกดูเล่ม <ArrowRight size={15} aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export interface CollectibleProductCardProps {
  item: CatalogFigure;
  onAddToCart?: (item: CatalogFigure) => void;
  returnTo?: string;
}

/**
 * Modern Collectible Product Card (Figure, Plamo, Goods, Accessory).
 */
export function CollectibleProductCard({
  item,
  onAddToCart,
  returnTo,
}: CollectibleProductCardProps) {
  const { user } = useAuth();
  const userCanShop = canShop(user?.role);
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { isInCompare, addToCompare, removeFromCompare } = useCompare();
  const [isBackInStockOpen, setIsBackInStockOpen] = useState(false);
  const isWishlisted = isInWishlist(item.id, item.category);
  const isCompared = isInCompare(item.id);

  return (
    <>
      <div className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xs transition hover:-translate-y-1 hover:border-orange-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-orange-800">
        <div>
          <div className="relative p-3">
            <CollectibleCoverImage
              src={item.images?.[0]}
              alt={item.name}
              name={item.name}
              category={item.category}
              scale={item.scale}
            />

            {/* Top Right Action Icons: Compare & Wishlist */}
            <div className="absolute top-5 right-5 z-10 flex items-center gap-1.5">
              {/* Compare Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (isCompared) {
                    removeFromCompare(item.id);
                  } else {
                    addToCompare({
                      id: item.id,
                      name: item.name,
                      category: item.category ?? "FIGURE",
                      series: item.series,
                      price:
                        item.status === "PREORDER_OPEN" && item.depositAmount > 0
                          ? item.depositAmount
                          : item.fullPrice,
                      depositPrice: item.depositAmount,
                      imageUrl: item.images?.[0] ?? null,
                      url: `/figures/${encodeURIComponent(item.slug)}`,
                      scale: item.scale,
                      manufacturer: item.manufacturer,
                      status: item.status,
                      boxDimensions: item.boxDimensions,
                    });
                  }
                }}
                aria-label={isCompared ? "นำออกจากตารางเปรียบเทียบ" : "เพิ่มในตารางเปรียบเทียบ"}
                title={isCompared ? "อยู่ในตารางเปรียบเทียบแล้ว" : "เปรียบเทียบสเปก"}
                className={`flex h-8 w-8 items-center justify-center rounded-full shadow-sm backdrop-blur-xs transition hover:scale-110 ${
                  isCompared
                    ? "bg-orange-600 text-white"
                    : "bg-white/90 text-zinc-600 hover:text-orange-600 dark:bg-zinc-800/90 dark:text-zinc-300 dark:hover:text-orange-400"
                }`}
              >
                <ArrowLeftRight size={14} aria-hidden="true" />
              </button>

              {/* Wishlist Heart Toggle */}
              {userCanShop ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleWishlist({
                      id: item.id,
                      itemType: (item.category as any) ?? "FIGURE",
                      title: item.name,
                      price:
                        item.status === "PREORDER_OPEN" && item.depositAmount > 0
                          ? item.depositAmount
                          : item.fullPrice,
                      imageUrl: item.images?.[0] ?? null,
                      url: `/figures/${encodeURIComponent(item.slug)}`,
                      category: item.category,
                      isPreorder: item.status === "PREORDER_OPEN",
                    });
                  }}
                  aria-label={
                    isWishlisted ? "นำออกจากรายการที่ถูกใจ" : "เพิ่มในรายการที่ถูกใจ"
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-zinc-600 shadow-sm backdrop-blur-xs transition hover:scale-110 hover:text-red-600 dark:bg-zinc-800/90 dark:text-zinc-300 dark:hover:text-red-400"
                >
                  <Heart
                    size={16}
                    className={isWishlisted ? "fill-red-500 text-red-500" : ""}
                    aria-hidden="true"
                  />
                </button>
              ) : null}
            </div>

            {item.images?.[0] ? (
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
            ) : null}
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
              href={`/figures/${encodeURIComponent(item.slug)}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}
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
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex min-h-10 items-center justify-center rounded-xl bg-zinc-100 px-2.5 text-xs font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    สินค้าหมด
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsBackInStockOpen(true)}
                    title="แจ้งเตือนเมื่อสินค้าพร้อมจำหน่าย"
                    className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border border-amber-300 bg-amber-50 px-2.5 text-xs font-bold text-amber-800 transition hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                  >
                    <BellRing size={13} aria-hidden="true" />
                    แจ้งเตือน
                  </button>
                </div>
              )
            ) : null}
          </div>
        </div>
      </div>

      <BackInStockModal
        isOpen={isBackInStockOpen}
        onClose={() => setIsBackInStockOpen(false)}
        productId={item.id}
        productTitle={item.name}
        productCategory={item.category}
      />
    </>
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

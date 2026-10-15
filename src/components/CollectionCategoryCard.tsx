"use client";

import {
  ArrowRight,
  BookMarked,
  BookOpen,
  Boxes,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { StoreCollection } from "../lib/store-collections";

const categoryThemes = {
  manga: {
    icon: BookOpen,
    subtitle: "text-orange-600 dark:text-orange-400",
    hoverBorder: "hover:border-orange-400 dark:hover:border-orange-500",
    hoverText: "group-hover:text-orange-600 dark:group-hover:text-orange-400",
    actionText: "text-orange-600 dark:text-orange-400",
    badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800",
  },
  "light-novel": {
    icon: BookMarked,
    subtitle: "text-sky-600 dark:text-sky-400",
    hoverBorder: "hover:border-sky-400 dark:hover:border-sky-500",
    hoverText: "group-hover:text-sky-600 dark:group-hover:text-sky-400",
    actionText: "text-sky-600 dark:text-sky-400",
    badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800",
  },
  figures: {
    icon: Sparkles,
    subtitle: "text-emerald-600 dark:text-emerald-400",
    hoverBorder: "hover:border-emerald-400 dark:hover:border-emerald-500",
    hoverText: "group-hover:text-emerald-600 dark:group-hover:text-emerald-400",
    actionText: "text-emerald-600 dark:text-emerald-400",
    badgeBg: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800",
  },
  goods: {
    icon: ShoppingBag,
    subtitle: "text-rose-600 dark:text-rose-400",
    hoverBorder: "hover:border-rose-400 dark:hover:border-rose-500",
    hoverText: "group-hover:text-rose-600 dark:group-hover:text-rose-400",
    actionText: "text-rose-600 dark:text-rose-400",
    badgeBg: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800",
  },
  accessories: {
    icon: ShieldCheck,
    subtitle: "text-amber-600 dark:text-amber-400",
    hoverBorder: "hover:border-amber-400 dark:hover:border-amber-500",
    hoverText: "group-hover:text-amber-600 dark:group-hover:text-amber-400",
    actionText: "text-amber-600 dark:text-amber-400",
    badgeBg: "bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-800",
  },
} as const;

export default function CollectionCategoryCard({
  collection,
}: {
  collection: StoreCollection;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isImageVisible, setIsImageVisible] = useState(true);
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    collection.previewImages.forEach((image) => {
      const preload = new Image();
      preload.src = `/images/products/${image}`;
    });
  }, [collection.previewImages]);

  useEffect(() => {
    if (!isHovered || collection.previewImages.length < 2) return;
    let cycleTimeout: ReturnType<typeof setTimeout>;
    let swapTimeout: ReturnType<typeof setTimeout>;
    let showTimeout: ReturnType<typeof setTimeout>;

    const scheduleNext = (): void => {
      cycleTimeout = setTimeout(() => {
        setIsImageVisible(false);
        swapTimeout = setTimeout(() => {
          setActiveIndex((current) => (current + 1) % collection.previewImages.length);
          showTimeout = setTimeout(() => {
            setIsImageVisible(true);
            scheduleNext();
          }, 60);
        }, 280);
      }, 2500);
    };

    scheduleNext();
    return () => {
      clearTimeout(cycleTimeout);
      clearTimeout(swapTimeout);
      clearTimeout(showTimeout);
    };
  }, [collection.previewImages.length, isHovered]);

  useEffect(() => {
    setActiveIndex(0);
    setIsImageVisible(true);
  }, [collection.slug]);

  const theme = categoryThemes[collection.slug] ?? categoryThemes.manga;
  const CategoryIcon = theme.icon;

  return (
    <Link
      href={`/collections/${collection.slug}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setIsImageVisible(true); }}
      onFocus={() => setIsHovered(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsHovered(false);
          setIsImageVisible(true);
        }
      }}
      className={`group flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xs transition duration-300 hover:-translate-y-1.5 hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-900 ${theme.hoverBorder}`}
    >
      {/* Top Image Showcase Zone */}
      <div className="relative flex h-64 sm:h-72 w-full items-center justify-center overflow-hidden bg-gradient-to-b from-zinc-50 via-zinc-100/70 to-zinc-50 p-4 transition-colors dark:from-zinc-900 dark:via-zinc-850 dark:to-zinc-900">
        {/* Floating Feature Badge (Top-Left) */}
        <span
          className={`absolute left-3.5 top-3.5 z-10 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold shadow-2xs border ${theme.badgeBg}`}
        >
          {collection.featureBadge}
        </span>

        {/* Floating Item Count (Top-Right) */}
        <span className="absolute right-3.5 top-3.5 z-10 rounded-lg border border-zinc-200/90 bg-white/90 px-2 py-0.5 text-[11px] font-bold text-zinc-700 shadow-2xs backdrop-blur-xs dark:border-zinc-700/80 dark:bg-zinc-850/90 dark:text-zinc-300">
          {collection.itemCountText}
        </span>

        {/* Product Image Display */}
        <div className="relative flex h-full w-full items-center justify-center">
          {!hasImageError ? (
            <img
              src={`/images/products/${collection.previewImages[activeIndex]}`}
              alt={`${collection.title} ตัวอย่างสินค้า`}
              className={`max-h-52 sm:max-h-56 w-auto object-contain drop-shadow-md transition-all duration-400 ease-out group-hover:scale-105 ${
                isImageVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
              }`}
              loading="lazy"
              onError={() => setHasImageError(true)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 text-zinc-400">
              <CategoryIcon size={36} />
              <span className="text-xs font-bold">{collection.title}</span>
            </div>
          )}
        </div>

        {/* Multi-image indicators if multiple images */}
        {collection.previewImages.length > 1 && (
          <div className="absolute bottom-2.5 flex items-center gap-1 z-10">
            {collection.previewImages.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  activeIndex === idx
                    ? "w-4 bg-orange-600 dark:bg-orange-400"
                    : "w-1.5 bg-zinc-300 dark:bg-zinc-700"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Info Zone */}
      <div className="flex flex-1 flex-col justify-between p-5 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div>
          <div className="flex items-center justify-between gap-2">
            <span
              className={`flex items-center gap-1 text-[11px] font-black uppercase tracking-wider ${theme.subtitle}`}
            >
              <CategoryIcon size={13} aria-hidden="true" />
              <span>{collection.subtitle}</span>
            </span>
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
              {collection.statusText}
            </span>
          </div>

          <h3
            className={`mt-1.5 text-lg sm:text-xl font-black text-zinc-900 transition dark:text-zinc-100 ${theme.hoverText}`}
          >
            {collection.title}
          </h3>

          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
            {collection.description}
          </p>

          {/* Series Tags */}
          {collection.tags && collection.tags.length > 0 && (
            <div className="mt-3.5 flex flex-wrap gap-1.5">
              {collection.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action Link Footer */}
        <div
          className={`mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 text-xs font-bold transition dark:border-zinc-800 ${theme.actionText}`}
        >
          <span>เลือกดู{collection.title}</span>
          <ArrowRight
            size={15}
            className="transform transition duration-300 group-hover:translate-x-1.5"
            aria-hidden="true"
          />
        </div>
      </div>
    </Link>
  );
}
"use client";

import {
  ArrowRight,
  BookMarked,
  BookOpen,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { STORE_COLLECTIONS, StoreCollection } from "../lib/store-collections";

const editorialThemes = {
  manga: {
    accent: "text-orange-400",
    badge: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    borderHover: "hover:border-orange-500/80 hover:shadow-orange-500/15",
    icon: BookOpen,
  },
  "light-novel": {
    accent: "text-sky-400",
    badge: "bg-sky-500/20 text-sky-300 border-sky-500/30",
    borderHover: "hover:border-sky-500/80 hover:shadow-sky-500/15",
    icon: BookMarked,
  },
  figures: {
    accent: "text-emerald-400",
    badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    borderHover: "hover:border-emerald-500/80 hover:shadow-emerald-500/15",
    icon: Sparkles,
  },
  goods: {
    accent: "text-rose-400",
    badge: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    borderHover: "hover:border-rose-500/80 hover:shadow-rose-500/15",
    icon: ShoppingBag,
  },
  accessories: {
    accent: "text-amber-400",
    badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    borderHover: "hover:border-amber-500/80 hover:shadow-amber-500/15",
    icon: ShieldCheck,
  },
} as const;

function EditorialCard({ collection }: { collection: StoreCollection }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const theme = editorialThemes[collection.slug] ?? editorialThemes.manga;
  const CategoryIcon = theme.icon;

  useEffect(() => {
    if (!isHovered || collection.previewImages.length < 2) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % collection.previewImages.length);
    }, 2400);
    return () => clearInterval(interval);
  }, [isHovered, collection.previewImages.length]);

  return (
    <Link
      href={`/collections/${collection.slug}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setActiveIndex(0);
      }}
      className={`group relative isolate flex h-112 sm:h-120 flex-col justify-between overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-lg transition-all duration-500 hover:-translate-y-1.5 hover:shadow-2xl ${theme.borderHover}`}
    >
      {/* Full-bleed Background Image with blur depth */}
      <div className="absolute inset-0 -z-20 overflow-hidden bg-zinc-900">
        <img
          src={`/images/products/${collection.previewImages[activeIndex]}`}
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover opacity-30 blur-2xl scale-125 transition-transform duration-700 group-hover:scale-135"
        />
      </div>

      {/* Main Product Feature Image */}
      <div className="absolute inset-x-0 top-12 bottom-28 -z-10 flex items-center justify-center p-4">
        <img
          src={`/images/products/${collection.previewImages[activeIndex]}`}
          alt={collection.title}
          className="max-h-full max-w-full object-contain drop-shadow-2xl transition-all duration-700 ease-out group-hover:scale-110"
        />
      </div>

      {/* Smooth Gradient Scrim (No harsh floating box - purely smooth cinematic fade) */}
      <div className="absolute inset-0 -z-5 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none" />

      {/* Top Bar: Floating Badges */}
      <div className="flex items-center justify-between z-10">
        <span
          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-black uppercase tracking-wider backdrop-blur-md shadow-xs ${theme.badge}`}
        >
          <CategoryIcon size={14} aria-hidden="true" />
          <span>{collection.subtitle.split("·")[0]?.trim() || collection.subtitle}</span>
        </span>

        <span className="rounded-xl border border-white/15 bg-black/50 px-2.5 py-1 text-[11px] font-bold text-zinc-300 backdrop-blur-md shadow-xs">
          {collection.itemCountText}
        </span>
      </div>

      {/* Bottom Editorial Typography */}
      <div className="z-10 mt-auto">
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-black uppercase tracking-widest ${theme.accent}`}>
            {collection.statusText}
          </span>
          <span className="h-1 w-1 rounded-full bg-zinc-500" />
          <span className="text-[11px] font-semibold text-zinc-400">
            {collection.featureBadge}
          </span>
        </div>

        <h3 className="mt-1 text-2xl font-black text-white group-hover:text-white transition sm:text-3xl drop-shadow-md">
          {collection.title}
        </h3>

        <p className="mt-1.5 text-xs sm:text-sm text-zinc-300 line-clamp-2 leading-relaxed">
          {collection.description}
        </p>

        {/* Tag pills */}
        {collection.tags && collection.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {collection.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-zinc-300 backdrop-blur-xs"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* CTA bar */}
        <div
          className={`mt-4 flex items-center justify-between border-t border-white/15 pt-3 text-xs font-bold ${theme.accent}`}
        >
          <span>เปิดดูหมวดนี้</span>
          <div className="flex items-center gap-1">
            <span className="text-[11px] uppercase tracking-wider">Explore</span>
            <ArrowRight
              size={14}
              className="transform transition duration-300 group-hover:translate-x-1.5"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function EditorialCategoryGrid() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {STORE_COLLECTIONS.map((collection) => (
        <EditorialCard key={collection.slug} collection={collection} />
      ))}
    </div>
  );
}

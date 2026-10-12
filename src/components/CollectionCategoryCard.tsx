"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { StoreCollection } from "../lib/store-collections";

const categoryAccents = {
  manga: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  "light-novel": "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  figures: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  goods: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  accessories: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300",
} as const;

const categoryIcons = {
  manga: "M",
  "light-novel": "LN",
  figures: "F",
  goods: "G",
  accessories: "A",
} as const;

export default function CollectionCategoryCard({
  collection,
}: {
  collection: StoreCollection;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isImageVisible, setIsImageVisible] = useState(true);

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
        }, 400);
      }, 2600);
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

  const CategoryIcon = categoryIcons[collection.slug];

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
      className="group relative isolate flex h-full min-h-128 flex-col justify-end overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-900 shadow-sm transition hover:-translate-y-1 hover:border-orange-300 hover:shadow-lg dark:border-zinc-800 dark:hover:border-orange-800"
    >
      <div className="absolute inset-0 z-0 overflow-hidden bg-zinc-800 dark:bg-zinc-950">
        <img
          src={`/images/products/${collection.previewImages[activeIndex]}`}
          alt=""
          aria-hidden="true"
          className="h-full w-full scale-110 object-cover opacity-60 blur-xl"
          loading="lazy"
        />
      </div>
      <img
        src={`/images/products/${collection.previewImages[activeIndex]}`}
        alt={`${collection.title} ตัวอย่างสินค้า`}
        className={`absolute inset-0 z-10 h-full w-full object-contain p-2 transition-opacity duration-500 ease-in-out ${isImageVisible ? "opacity-100" : "opacity-0"}`}
        loading="lazy"
      />
      <div className="absolute inset-0 z-20 bg-linear-to-t from-black/75 via-black/10 to-black/10" />
      <span className="absolute left-4 top-4 z-30 rounded-md border border-white/20 bg-black/40 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-white shadow-sm backdrop-blur-md">
        {collection.badge}
      </span>
      <span className={`absolute right-4 top-4 z-30 flex h-10 min-w-10 items-center justify-center rounded-full border border-white/20 px-2 text-xs font-black text-white shadow-sm backdrop-blur-md ${categoryAccents[collection.slug]}`}>
        {CategoryIcon}
      </span>
      <div className="relative z-30 m-3 rounded-xl border border-white/25 bg-black/40 p-5 text-white shadow-lg backdrop-blur-xl sm:m-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-orange-300">
          {collection.subtitle}
        </p>
        <h2 className="mt-1 text-xl font-extrabold text-white">
          {collection.title}
        </h2>
        <p className="mt-1 text-sm text-white/80">
          {collection.description}
        </p>
        <div className="mt-4 flex min-h-10 items-center justify-between border-t border-white/20 pt-3 text-xs font-bold text-orange-200">
          <span>เลือกดูหมวดนี้ · รายละเอียด</span>
          <ArrowRight size={16} aria-hidden="true" />
        </div>
      </div>
    </Link>
  );
}
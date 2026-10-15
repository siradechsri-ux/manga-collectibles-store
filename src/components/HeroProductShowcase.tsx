"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export interface HeroFeaturedProduct {
  id: string;
  title: string;
  categoryLabel: string;
  price: number;
  image: string;
  href: string;
  glowColor: string;
}

const FEATURED_HERO_PRODUCTS: HeroFeaturedProduct[] = [
  {
    id: "fig-gojo",
    title: "Nendoroid Gojo Satoru",
    categoryLabel: "FIGURE",
    price: 1850,
    image: "/images/products/figure-2001.jpg",
    href: "/collections/figures",
    glowColor: "rgba(56, 189, 248, 0.45)", // Sky Blue Glow
  },
  {
    id: "jjk-01",
    title: "มหาเวทย์ผนึกมาร เล่ม 1",
    categoryLabel: "MANGA",
    price: 115,
    image: "/images/products/jjk-vol-01.jpg",
    href: "/collections/manga",
    glowColor: "rgba(249, 115, 22, 0.45)", // Orange Glow
  },
  {
    id: "plamo-hinu",
    title: "RG 1/144 Hi-Nu Gundam",
    categoryLabel: "GUNPLA",
    price: 2450,
    image: "/images/products/plamo-6001.jpg",
    href: "/collections/figures",
    glowColor: "rgba(99, 102, 241, 0.45)", // Indigo Glow
  },
  {
    id: "frieren-01",
    title: "คำอธิษฐานในวันที่จากลา เล่ม 1",
    categoryLabel: "MANGA",
    price: 125,
    image: "/images/products/frieren-vol-01.jpg",
    href: "/collections/manga",
    glowColor: "rgba(168, 85, 247, 0.45)", // Purple Glow
  },
  {
    id: "fig-sukuna",
    title: "Nendoroid Ryomen Sukuna",
    categoryLabel: "FIGURE",
    price: 1890,
    image: "/images/products/figure-2002.jpg",
    href: "/collections/figures",
    glowColor: "rgba(239, 68, 68, 0.45)", // Red Glow
  },
  {
    id: "mushoku-01",
    title: "เกิดชาตินี้พี่ต้องเทพ เล่ม 1",
    categoryLabel: "LIGHT NOVEL",
    price: 290,
    image: "/images/products/mushoku-vol-01.jpg",
    href: "/collections/light-novel",
    glowColor: "rgba(14, 165, 233, 0.45)", // Sky Glow
  },
  {
    id: "spy-01",
    title: "SPY x FAMILY เล่ม 1",
    categoryLabel: "MANGA",
    price: 95,
    image: "/images/products/spy-family-vol-01.jpg",
    href: "/collections/manga",
    glowColor: "rgba(16, 185, 129, 0.45)", // Emerald Glow
  },
  {
    id: "csm-01",
    title: "Chainsaw Man เล่ม 1",
    categoryLabel: "MANGA",
    price: 115,
    image: "/images/products/chainsaw-vol-01.jpg",
    href: "/collections/manga",
    glowColor: "rgba(244, 63, 94, 0.45)", // Rose Glow
  },
  {
    id: "goods-standee",
    title: "อะคริลิกสแตนดี้ โกโจ & เกะโท",
    categoryLabel: "OFFICIAL GOODS",
    price: 490,
    image: "/images/products/goods-7001.jpg",
    href: "/collections/goods",
    glowColor: "rgba(234, 179, 8, 0.45)", // Amber Glow
  },
  {
    id: "rezero-01",
    title: "Re:Zero รีเซทชีวิตฯ เล่ม 1",
    categoryLabel: "LIGHT NOVEL",
    price: 280,
    image: "/images/products/rezero-vol-01.jpg",
    href: "/collections/light-novel",
    glowColor: "rgba(217, 70, 239, 0.45)", // Fuchsia Glow
  },
];

export default function HeroProductShowcase() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentItem = FEATURED_HERO_PRODUCTS[currentIndex];

  // Preload images
  useEffect(() => {
    FEATURED_HERO_PRODUCTS.forEach((p) => {
      const img = new Image();
      img.src = p.image;
    });
  }, []);

  const nextProduct = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % FEATURED_HERO_PRODUCTS.length);
      setIsTransitioning(false);
    }, 280);
  };

  const prevProduct = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) =>
        prev === 0 ? FEATURED_HERO_PRODUCTS.length - 1 : prev - 1,
      );
      setIsTransitioning(false);
    }, 280);
  };

  // Auto rotate every 3.2 seconds (pauses on hover)
  useEffect(() => {
    if (isHovered) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      nextProduct();
    }, 3200);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isHovered, currentIndex]);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative flex h-[360px] sm:h-[420px] lg:h-[460px] w-full items-center justify-center select-none"
    >
      {/* 1. Large Ambient Backlight Glow (Dynamic spotlight behind the product) */}
      <div
        className="pointer-events-none absolute inset-0 m-auto h-72 sm:h-96 w-72 sm:w-96 rounded-full blur-[90px] opacity-80 transition-all duration-700 ease-out"
        style={{ backgroundColor: currentItem.glowColor }}
        aria-hidden="true"
      />

      {/* 2. Big Product Image Display (Heroic, Sharp & Clean) */}
      <Link
        href={currentItem.href}
        className="relative z-10 flex h-full w-full items-center justify-center p-2 sm:p-4 pb-12 sm:pb-14"
        aria-label={`${currentItem.title} (${currentItem.categoryLabel})`}
      >
        <img
          src={currentItem.image}
          alt={currentItem.title}
          className={`max-h-[300px] sm:max-h-[360px] lg:max-h-[400px] w-auto max-w-[95%] object-contain drop-shadow-[0_25px_45px_rgba(0,0,0,0.85)] transition-all duration-500 ease-out group-hover:scale-105 ${
            isTransitioning
              ? "opacity-0 scale-95 blur-xs"
              : "opacity-100 scale-100 blur-none"
          }`}
          loading="eager"
        />
      </Link>

      {/* 3. Minimal Floating Title & Price Pill (Clean & Non-intrusive) */}
      <div className="absolute bottom-2 sm:bottom-4 z-20 flex flex-col items-center gap-2">
        <Link
          href={currentItem.href}
          className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/60 px-4 py-1.5 backdrop-blur-md shadow-lg transition hover:bg-black/80 hover:scale-105"
        >
          <span className="text-[10px] font-black uppercase tracking-wider text-orange-400">
            {currentItem.categoryLabel}
          </span>
          <span className="h-1 w-1 rounded-full bg-white/40" />
          <span className="max-w-[180px] sm:max-w-xs truncate text-xs font-bold text-white">
            {currentItem.title}
          </span>
          <span className="text-xs font-black text-amber-300">
            ฿{currentItem.price.toLocaleString("th-TH")}
          </span>
        </Link>

        {/* 4. Sleek Dots Indicator */}
        <div className="flex items-center gap-1.5" role="tablist" aria-label="เลือกลำดับสินค้า">
          {FEATURED_HERO_PRODUCTS.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (idx !== currentIndex) {
                  setIsTransitioning(true);
                  setTimeout(() => {
                    setCurrentIndex(idx);
                    setIsTransitioning(false);
                  }, 200);
                }
              }}
              aria-label={`เลือกสินค้า ${item.title}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                currentIndex === idx
                  ? "w-6 bg-orange-400"
                  : "w-1.5 bg-white/30 hover:bg-white/60"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

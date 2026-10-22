"use client";

import Link from "next/link";

interface ChanSasomLogoProps {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  href?: string;
  className?: string;
}

export default function ChanSasomLogo({
  size = "md",
  showTagline = true,
  href,
  className = "",
}: ChanSasomLogoProps) {
  const iconDimensions = {
    sm: { container: "h-8 w-8 rounded-lg p-0.5", icon: 16, text: "text-xs", tag: "text-[9px]" },
    md: { container: "h-9 w-9 sm:h-10 sm:w-10 rounded-xl p-0.5", icon: 20, text: "text-base sm:text-lg", tag: "text-[10px]" },
    lg: { container: "h-14 w-14 rounded-2xl p-1", icon: 28, text: "text-2xl sm:text-3xl", tag: "text-xs" },
  }[size];

  const content = (
    <div className={`inline-flex shrink-0 items-center gap-2.5 transition select-none ${className}`}>
      {/* ================= Modern Collector's Shelf Icon Mark ================= */}
      <span
        className={`flex shrink-0 items-center justify-center bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-500 shadow-xs transition duration-300 group-hover:scale-105 group-hover:shadow-md ${iconDimensions.container}`}
      >
        <span className="flex h-full w-full items-center justify-center rounded-[9px] bg-zinc-950/90 transition dark:bg-zinc-900/90">
          <svg
            width={iconDimensions.icon}
            height={iconDimensions.icon}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="text-white drop-shadow-xs"
          >
            {/* Shelf Structure Bars */}
            <path
              d="M3.5 5H20.5V7H3.5V5Z"
              fill="currentColor"
              className="text-zinc-200 dark:text-zinc-100"
            />
            <path
              d="M3.5 11H20.5V13H3.5V11Z"
              fill="currentColor"
              className="text-zinc-200 dark:text-zinc-100"
            />
            <path
              d="M3.5 17H20.5V19H3.5V17Z"
              fill="currentColor"
              className="text-zinc-200 dark:text-zinc-100"
            />
            {/* Manga Spine Books on Middle Shelf */}
            <rect x="6" y="7" width="2.5" height="4" rx="0.5" fill="#f97316" />
            <rect x="9.5" y="7.5" width="2" height="3.5" rx="0.5" fill="#fb923c" />
            {/* Collectible Box / Figure Cube on Bottom Shelf */}
            <rect x="13" y="13" width="5.5" height="4" rx="0.75" fill="#f59e0b" />
          </svg>
        </span>
      </span>

      {/* ================= Dual-Tone Typography ================= */}
      <div className="shrink-0 flex flex-col justify-center leading-none">
        <div
          className={`font-black tracking-tight ${iconDimensions.text} text-zinc-950 dark:text-zinc-50`}
          style={{ fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" }}
        >
          <span>Chan</span>
          <span className="bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 bg-clip-text text-transparent">
            Sasom
          </span>
        </div>
        {showTagline && (
          <span
            className={`font-medium text-zinc-500 dark:text-zinc-400 mt-0.5 tracking-normal ${iconDimensions.tag} hidden sm:block`}
          >
            อ่านสนุก สะสมได้ ส่งถึงบ้าน
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} aria-label="ChanSasom Storefront Home" className="group flex items-center">
        {content}
      </Link>
    );
  }

  return content;
}

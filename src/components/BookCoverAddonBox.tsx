"use client";

import { ShieldCheck } from "lucide-react";
import { useCart } from "../context/CartContext";

export function BookCoverAddonBox({
  className = "",
}: {
  className?: string;
}) {
  const {
    hasBookItems,
    bookCount,
    bookCoverAddon,
    toggleBookCoverAddon,
    setBookCoverAddon,
  } = useCart();

  if (!hasBookItems) {
    return null;
  }

  const addonTotal = bookCount * 5;

  return (
    <div
      className={`rounded-2xl border transition-all ${
        bookCoverAddon
          ? "border-orange-500 bg-orange-50/70 ring-1 ring-orange-500/20 dark:border-orange-500 dark:bg-orange-950/30 dark:ring-orange-500/30"
          : "border-zinc-200 bg-zinc-50/60 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700"
      } p-3.5 sm:p-4 ${className}`}
    >
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={bookCoverAddon}
          onChange={(event) => setBookCoverAddon(event.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-300 accent-orange-600 focus:ring-orange-500 dark:border-zinc-700"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-950 dark:text-zinc-100 sm:text-sm">
              <ShieldCheck
                size={16}
                aria-hidden="true"
                className={bookCoverAddon ? "text-orange-600 dark:text-orange-400" : "text-zinc-500 dark:text-zinc-400"}
              />
              เพิ่มปกพลาสติกสำเร็จรูปถนอมหนังสือ (+5 บาท / เล่ม)
            </span>
            <span className="text-xs font-extrabold text-orange-700 dark:text-orange-300">
              +{addonTotal.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บ.
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
            ห่อปกใสสำเร็จรูปคุณภาพสูงสำหรับมังงะและไลท์โนเวล {bookCount} เล่ม ในตะกร้า
            เพื่อปกป้องหนังสือสะสมจากฝุ่นและรอยขีดข่วน
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-md border border-orange-200 bg-orange-100/60 px-2 py-0.5 text-[10px] font-bold text-orange-800 dark:border-orange-900/60 dark:bg-orange-950/60 dark:text-orange-300">
              {bookCount} เล่ม x 5 บาท
            </span>
            <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
              สินค้าเสริมคิดอัตราภาษี VAT 7%
            </span>
          </div>
        </div>
      </label>
    </div>
  );
}

export default BookCoverAddonBox;


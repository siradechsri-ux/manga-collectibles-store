"use client";

import { ArrowLeftRight, Scale, Trash2, X } from "lucide-react";
import { useCompare } from "../contexts/CompareContext";
import ProductCompareModal from "./ProductCompareModal";

export default function ProductCompareFloatingBar() {
  const { items, removeFromCompare, clearCompare, openCompare } = useCompare();

  if (items.length === 0) {
    return <ProductCompareModal />;
  }

  return (
    <>
      <aside
        aria-label="แถบเปรียบเทียบสินค้า"
        className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 w-[95%] max-w-2xl rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/95 transition-all duration-300"
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Left: Indicator & Thumbnails */}
          <div className="flex items-center gap-3 overflow-x-auto w-full sm:w-auto">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400">
              <Scale size={18} aria-hidden="true" />
            </div>
            <div className="shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                  เปรียบเทียบสินค้า
                </span>
                <span className="rounded-full bg-orange-600 px-2 py-0.2 text-[10px] font-black text-white">
                  {items.length}/4
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                เลือกได้สูงสุด 4 ชิ้น
              </p>
            </div>

            {/* Thumbnails */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-zinc-800">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="group relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-zinc-700 dark:bg-zinc-800"
                >
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[8px] text-slate-400">
                      -
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeFromCompare(item.id)}
                    aria-label={`ลบ ${item.name} ออกจากการเปรียบเทียบ`}
                    className="absolute inset-0 flex items-center justify-center bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={clearCompare}
              className="inline-flex items-center gap-1 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 transition"
              title="ล้างทั้งหมด"
            >
              <Trash2 size={13} aria-hidden="true" />
              <span className="hidden sm:inline">ล้าง</span>
            </button>
            <button
              type="button"
              onClick={openCompare}
              className="inline-flex min-h-9 flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-orange-700 transition"
            >
              <ArrowLeftRight size={14} aria-hidden="true" />
              <span>เปิดตารางเปรียบเทียบ</span>
            </button>
          </div>
        </div>
      </aside>

      <ProductCompareModal />
    </>
  );
}

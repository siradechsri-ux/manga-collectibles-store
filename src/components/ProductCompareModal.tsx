"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  ExternalLink,
  Scale,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import { useCompare } from "../contexts/CompareContext";
import { useCart } from "../context/CartContext";

const moneyFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 0,
});

export default function ProductCompareModal() {
  const {
    items,
    removeFromCompare,
    clearCompare,
    isCompareModalOpen,
    closeCompare,
  } = useCompare();

  const { addItem } = useCart();

  useEffect(() => {
    if (!isCompareModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeCompare();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCompareModalOpen, closeCompare]);

  if (!isCompareModalOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="compare-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-6xl flex-col rounded-3xl bg-white shadow-2xl dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400">
              <Scale size={20} aria-hidden="true" />
            </div>
            <div>
              <h2
                id="compare-modal-title"
                className="text-lg font-black text-slate-900 dark:text-zinc-100"
              >
                ตารางเปรียบเทียบสเปกสินค้า
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                เปรียบเทียบข้อมูลจำเพาะ ราคา ขนาด และรายละเอียดสินค้า ({items.length}/4 ชิ้น)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {items.length > 0 ? (
              <button
                type="button"
                onClick={clearCompare}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-red-600 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-red-400 transition"
              >
                <Trash2 size={13} aria-hidden="true" />
                ล้างทั้งหมด
              </button>
            ) : null}
            <button
              type="button"
              onClick={closeCompare}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition"
              aria-label="ปิดหน้าต่างเปรียบเทียบ"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-zinc-800">
                <ArrowLeftRight size={28} />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-800 dark:text-zinc-200">
                ยังไม่มีสินค้าในรายการเปรียบเทียบ
              </h3>
              <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-zinc-400">
                กดปุ่ม "เปรียบเทียบ" บนการ์ดสินค้าหรือหน้ารายละเอียด เพื่อนำสินค้ามาเปรียบเทียบสเปกได้สูงสุด 4 ชิ้น
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto pb-4">
              <table className="w-full min-w-[640px] border-collapse text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-zinc-800">
                    <th className="w-36 sm:w-44 p-3 font-bold text-slate-500 dark:text-zinc-400 bg-slate-50/50 dark:bg-zinc-800/40 rounded-l-xl">
                      ข้อมูลสินค้า
                    </th>
                    {items.map((item) => (
                      <th
                        key={item.id}
                        className="p-3 align-top min-w-[180px] max-w-[220px]"
                      >
                        <div className="relative flex flex-col items-center text-center">
                          <button
                            type="button"
                            onClick={() => removeFromCompare(item.id)}
                            className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:bg-zinc-800 dark:hover:bg-red-950/60 dark:hover:text-red-400 transition"
                            title="นำออกจากตารางเปรียบเทียบ"
                          >
                            <X size={12} />
                          </button>
                          <div className="h-28 w-28 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-zinc-700 dark:bg-zinc-800">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
                                ไม่มีรูปภาพ
                              </div>
                            )}
                          </div>
                          <span className="mt-2 line-clamp-2 font-bold text-slate-900 dark:text-zinc-100">
                            {item.name}
                          </span>
                        </div>
                      </th>
                    ))}
                    {Array.from({ length: Math.max(0, 4 - items.length) }).map(
                      (_, idx) => (
                        <th
                          key={`empty-${idx}`}
                          className="p-3 align-middle text-center min-w-[160px] opacity-40 border-dashed border-l border-slate-200 dark:border-zinc-800"
                        >
                          <div className="flex flex-col items-center justify-center py-8">
                            <span className="text-xs text-slate-400 dark:text-zinc-500">
                              ช่องว่าง {items.length + idx + 1}
                            </span>
                            <span className="mt-1 text-[11px] text-slate-400 dark:text-zinc-600">
                              (เพิ่มสินค้าได้)
                            </span>
                          </div>
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {/* ราคาเต็ม */}
                  <tr>
                    <td className="p-3 font-bold text-slate-700 dark:text-zinc-300 bg-slate-50/50 dark:bg-zinc-800/40">
                      ราคา
                    </td>
                    {items.map((item) => (
                      <td key={item.id} className="p-3 font-black text-orange-600 dark:text-orange-400">
                        {moneyFormatter.format(item.price)}
                        {item.depositPrice && item.depositPrice > 0 ? (
                          <span className="block text-[11px] font-normal text-slate-500 dark:text-zinc-400">
                            (มัดจำ {moneyFormatter.format(item.depositPrice)})
                          </span>
                        ) : null}
                      </td>
                    ))}
                    {Array.from({ length: Math.max(0, 4 - items.length) }).map((_, i) => (
                      <td key={i} className="p-3 text-slate-300 dark:text-zinc-700 text-center">-</td>
                    ))}
                  </tr>

                  {/* หมวดหมู่ */}
                  <tr>
                    <td className="p-3 font-bold text-slate-700 dark:text-zinc-300 bg-slate-50/50 dark:bg-zinc-800/40">
                      หมวดหมู่
                    </td>
                    {items.map((item) => (
                      <td key={item.id} className="p-3 text-slate-800 dark:text-zinc-200">
                        <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-zinc-800 dark:text-zinc-300">
                          {item.category}
                        </span>
                      </td>
                    ))}
                    {Array.from({ length: Math.max(0, 4 - items.length) }).map((_, i) => (
                      <td key={i} className="p-3 text-slate-300 dark:text-zinc-700 text-center">-</td>
                    ))}
                  </tr>

                  {/* ซีรีส์ / เรื่อง */}
                  <tr>
                    <td className="p-3 font-bold text-slate-700 dark:text-zinc-300 bg-slate-50/50 dark:bg-zinc-800/40">
                      ซีรีส์ / อนิเมะ
                    </td>
                    {items.map((item) => (
                      <td key={item.id} className="p-3 text-slate-800 dark:text-zinc-200 font-medium">
                        {item.series || "-"}
                      </td>
                    ))}
                    {Array.from({ length: Math.max(0, 4 - items.length) }).map((_, i) => (
                      <td key={i} className="p-3 text-slate-300 dark:text-zinc-700 text-center">-</td>
                    ))}
                  </tr>

                  {/* ผู้ผลิต / แบรนด์ */}
                  <tr>
                    <td className="p-3 font-bold text-slate-700 dark:text-zinc-300 bg-slate-50/50 dark:bg-zinc-800/40">
                      ผู้ผลิต
                    </td>
                    {items.map((item) => (
                      <td key={item.id} className="p-3 text-slate-800 dark:text-zinc-200">
                        {item.manufacturer || "Official License"}
                      </td>
                    ))}
                    {Array.from({ length: Math.max(0, 4 - items.length) }).map((_, i) => (
                      <td key={i} className="p-3 text-slate-300 dark:text-zinc-700 text-center">-</td>
                    ))}
                  </tr>

                  {/* สเกล / ขนาด */}
                  <tr>
                    <td className="p-3 font-bold text-slate-700 dark:text-zinc-300 bg-slate-50/50 dark:bg-zinc-800/40">
                      สเกล
                    </td>
                    {items.map((item) => (
                      <td key={item.id} className="p-3 text-slate-800 dark:text-zinc-200">
                        {item.scale || "Non-scale"}
                      </td>
                    ))}
                    {Array.from({ length: Math.max(0, 4 - items.length) }).map((_, i) => (
                      <td key={i} className="p-3 text-slate-300 dark:text-zinc-700 text-center">-</td>
                    ))}
                  </tr>

                  {/* ความสูง */}
                  <tr>
                    <td className="p-3 font-bold text-slate-700 dark:text-zinc-300 bg-slate-50/50 dark:bg-zinc-800/40">
                      ความสูง
                    </td>
                    {items.map((item) => (
                      <td key={item.id} className="p-3 text-slate-800 dark:text-zinc-200">
                        {item.height || "-"}
                      </td>
                    ))}
                    {Array.from({ length: Math.max(0, 4 - items.length) }).map((_, i) => (
                      <td key={i} className="p-3 text-slate-300 dark:text-zinc-700 text-center">-</td>
                    ))}
                  </tr>

                  {/* ขนาดกล่องพัสดุ */}
                  <tr>
                    <td className="p-3 font-bold text-slate-700 dark:text-zinc-300 bg-slate-50/50 dark:bg-zinc-800/40">
                      ขนาดกล่องพัสดุ (กxยxส)
                    </td>
                    {items.map((item) => (
                      <td key={item.id} className="p-3 text-slate-600 dark:text-zinc-400 text-xs">
                        {item.boxDimensions
                          ? `${item.boxDimensions.widthCm} x ${item.boxDimensions.lengthCm} x ${item.boxDimensions.heightCm} ซม.`
                          : "ขนาดมาตรฐาน"}
                      </td>
                    ))}
                    {Array.from({ length: Math.max(0, 4 - items.length) }).map((_, i) => (
                      <td key={i} className="p-3 text-slate-300 dark:text-zinc-700 text-center">-</td>
                    ))}
                  </tr>

                  {/* ภาษีมูลค่าเพิ่ม */}
                  <tr>
                    <td className="p-3 font-bold text-slate-700 dark:text-zinc-300 bg-slate-50/50 dark:bg-zinc-800/40">
                      ประเภทภาษี
                    </td>
                    {items.map((item) => (
                      <td key={item.id} className="p-3 text-xs text-slate-600 dark:text-zinc-400">
                        {item.category === "MANGA" || item.category === "LIGHT_NOVEL"
                          ? "ยกเว้นภาษี (VAT 0%)"
                          : "รวมภาษีแล้ว (VAT 7%)"}
                      </td>
                    ))}
                    {Array.from({ length: Math.max(0, 4 - items.length) }).map((_, i) => (
                      <td key={i} className="p-3 text-slate-300 dark:text-zinc-700 text-center">-</td>
                    ))}
                  </tr>

                  {/* การสั่งซื้อ / ลิงก์ */}
                  <tr>
                    <td className="p-3 font-bold text-slate-700 dark:text-zinc-300 bg-slate-50/50 dark:bg-zinc-800/40">
                      การดำเนินการ
                    </td>
                    {items.map((item) => (
                      <td key={item.id} className="p-3">
                        <div className="flex flex-col gap-2">
                          <Link
                            href={item.url}
                            onClick={closeCompare}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-orange-500 hover:text-orange-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:border-orange-500 transition"
                          >
                            <ExternalLink size={13} aria-hidden="true" />
                            ดูรายละเอียด
                          </Link>
                          {item.id && !isNaN(Number(item.id)) ? (
                            <button
                              type="button"
                              onClick={() => {
                                const variantId = Number(item.id);
                                if (item.category === "PLAMO" || item.category === "FIGURE") {
                                  addItem({
                                    kind: item.category === "PLAMO" ? "PLAMO" : "FIGURE",
                                    id: variantId,
                                    name: item.name,
                                    image: item.imageUrl ?? null,
                                    coverImage: item.imageUrl ?? null,
                                    imageUrl: item.imageUrl ?? null,
                                    fullPrice: item.price,
                                    depositAmount: item.depositPrice || 0,
                                    selectedPaymentType: item.depositPrice && item.depositPrice > 0 ? "DEPOSIT" : "FULL",
                                    quantity: 1,
                                    boxDimensions: item.boxDimensions || { widthCm: 18, lengthCm: 18, heightCm: 25 },
                                  });
                                } else if (item.category === "ACCESSORY") {
                                  addItem({
                                    kind: "ACCESSORY",
                                    id: variantId,
                                    name: item.name,
                                    image: item.imageUrl ?? null,
                                    coverImage: item.imageUrl ?? null,
                                    imageUrl: item.imageUrl ?? null,
                                    fullPrice: item.price,
                                    quantity: 1,
                                  });
                                } else {
                                  addItem({
                                    kind: "GOODS",
                                    id: variantId,
                                    name: item.name,
                                    image: item.imageUrl ?? null,
                                    coverImage: item.imageUrl ?? null,
                                    imageUrl: item.imageUrl ?? null,
                                    fullPrice: item.price,
                                    quantity: 1,
                                  });
                                }
                                closeCompare();
                              }}
                              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-orange-600 px-3 py-2 text-xs font-bold text-white hover:bg-orange-700 transition"
                            >
                              <ShoppingBag size={13} aria-hidden="true" />
                              ใส่ตะกร้า
                            </button>
                          ) : null}
                        </div>
                      </td>
                    ))}
                    {Array.from({ length: Math.max(0, 4 - items.length) }).map((_, i) => (
                      <td key={i} className="p-3 text-slate-300 dark:text-zinc-700 text-center">-</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

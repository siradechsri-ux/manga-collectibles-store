"use client";

import {
  ArrowRight,
  BookMarked,
  BookOpen,
  Boxes,
  Minus,
  Package,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { CartItem, useCart } from "../context/CartContext";
import BookCoverAddonBox from "./BookCoverAddonBox";

function itemIcon(kind: CartItem["kind"]) {
  switch (kind) {
    case "MANGA":
      return <BookOpen size={16} aria-hidden="true" />;
    case "LIGHT_NOVEL":
      return <BookMarked size={16} aria-hidden="true" />;
    case "FIGURE":
      return <Sparkles size={16} aria-hidden="true" />;
    case "PLAMO":
      return <Boxes size={16} aria-hidden="true" />;
    case "GOODS":
      return <ShoppingBag size={16} aria-hidden="true" />;
    case "ACCESSORY":
      return <ShieldCheck size={16} aria-hidden="true" />;
    default:
      return <Package size={16} aria-hidden="true" />;
  }
}

function itemKindLabel(item: CartItem): string {
  switch (item.kind) {
    case "MANGA":
      return item.isPreorder ? "มังงะ · พรีออเดอร์" : "มังงะ · พร้อมส่ง";
    case "LIGHT_NOVEL":
      return item.isPreorder ? "ไลท์โนเวล · พรีออเดอร์" : "ไลท์โนเวล · พร้อมส่ง";
    case "FIGURE":
      return item.selectedPaymentType === "DEPOSIT"
        ? "ฟิกเกอร์ · วางมัดจำ"
        : "ฟิกเกอร์ · ชำระเต็ม";
    case "PLAMO":
      return item.selectedPaymentType === "DEPOSIT"
        ? "พลาสติกโมเดล · วางมัดจำ"
        : "พลาสติกโมเดล · ชำระเต็ม";
    case "GOODS":
      return "กู้ดส์สะสม · พร้อมส่ง";
    case "ACCESSORY":
      return "อุปกรณ์ดูแล · พร้อมส่ง";
  }
}

function itemTitle(item: CartItem): string {
  if (item.kind === "MANGA" || item.kind === "LIGHT_NOVEL") {
    return `${item.title} เล่ม ${item.volume}${item.variantLabel ? ` (${item.variantLabel})` : ""}`;
  }
  return item.name;
}

function itemUnitPrice(item: CartItem): number {
  if (item.kind === "MANGA" || item.kind === "LIGHT_NOVEL") {
    return item.price;
  }
  if (
    (item.kind === "FIGURE" || item.kind === "PLAMO") &&
    item.selectedPaymentType === "DEPOSIT"
  ) {
    return item.depositAmount;
  }
  return item.fullPrice;
}

export default function CartDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const {
    items,
    itemCount,
    bookCount,
    hasBookItems,
    bookCoverAddon,
    bookCoverAddonPrice,
    immediateTotal,
    remainingBalanceTotal,
    updateQuantity,
    removeItem,
    updateFigurePaymentType,
  } = useCart();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="ตะกร้าสินค้า"
    >
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform dark:bg-zinc-950 sm:border-l sm:border-zinc-200 dark:sm:border-zinc-800">
        <header className="flex h-16 items-center justify-between border-b border-zinc-200 px-5 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300">
              <ShoppingBag size={18} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-zinc-950 dark:text-zinc-100">
                ตะกร้าสินค้า
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {itemCount} รายการในตะกร้า
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดตะกร้า"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-600">
                <ShoppingBag size={28} aria-hidden="true" />
              </span>
              <p className="mt-4 text-base font-bold text-zinc-900 dark:text-zinc-100">
                ไม่มีสินค้าในตะกร้า
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                เลือกดูมังงะ ไลท์โนเวล หรือของสะสมที่คุณชื่นชอบได้เลย
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-5 rounded-xl bg-zinc-950 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
              >
                เลือกดูสินค้า
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {items.map((item) => {
                  const unitPrice = itemUnitPrice(item);
                  const lineTotal = unitPrice * item.quantity;
                  return (
                    <article
                      key={`${item.kind}-${item.id}`}
                      className="flex gap-3 py-3.5 first:pt-0 last:pb-0"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {itemIcon(item.kind)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="line-clamp-2 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                            {itemTitle(item)}
                          </h3>
                          <button
                            type="button"
                            onClick={() => removeItem(item.kind, item.id)}
                            aria-label={`ลบ ${itemTitle(item)}`}
                            className="text-zinc-400 transition hover:text-red-600 dark:hover:text-red-400"
                          >
                            <Trash2 size={14} aria-hidden="true" />
                          </button>
                        </div>
                        <p className="mt-0.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                          {itemKindLabel(item)}
                        </p>
                        <div className="mt-2.5 flex items-center justify-between">
                          <div className="inline-flex items-center rounded-lg border border-zinc-200 dark:border-zinc-700">
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(
                                  item.kind,
                                  item.id,
                                  item.quantity - 1,
                                )
                              }
                              aria-label="ลดจำนวน"
                              className="p-1 text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
                            >
                              <Minus size={13} aria-hidden="true" />
                            </button>
                            <span className="min-w-6 text-center text-xs font-bold tabular-nums">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(
                                  item.kind,
                                  item.id,
                                  item.quantity + 1,
                                )
                              }
                              disabled={item.quantity >= 99}
                              aria-label="เพิ่มจำนวน"
                              className="p-1 text-zinc-600 hover:text-zinc-950 disabled:opacity-40 dark:text-zinc-300 dark:hover:text-white"
                            >
                              <Plus size={13} aria-hidden="true" />
                            </button>
                          </div>
                          <span className="text-xs font-extrabold text-zinc-950 dark:text-zinc-100">
                            {lineTotal.toLocaleString("th-TH", {
                              style: "currency",
                              currency: "THB",
                              maximumFractionDigits: 0,
                            })}
                          </span>
                        </div>
                        {(item.kind === "FIGURE" || item.kind === "PLAMO") &&
                        item.depositAmount > 0 &&
                        item.depositAmount < item.fullPrice ? (
                          <div className="mt-2 flex items-center justify-between text-[11px]">
                            <span className="text-zinc-500 dark:text-zinc-400">
                              รูปแบบชำระ
                            </span>
                            <select
                              value={item.selectedPaymentType}
                              onChange={(event) =>
                                updateFigurePaymentType(
                                  item.id,
                                  event.target.value as "FULL" | "DEPOSIT",
                                )
                              }
                              className="rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-semibold dark:border-zinc-700 dark:bg-zinc-900"
                            >
                              <option value="FULL">ชำระเต็ม</option>
                              <option value="DEPOSIT">วางมัดจำ</option>
                            </select>
                          </div>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>

              {hasBookItems ? (
                <div className="pt-2">
                  <BookCoverAddonBox />
                </div>
              ) : null}
            </div>
          )}
        </div>

        {items.length > 0 ? (
          <footer className="border-t border-zinc-200 bg-zinc-50/80 p-5 dark:border-zinc-800 dark:bg-zinc-900/60">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>ยอดสินค้า</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {(immediateTotal - bookCoverAddonPrice).toLocaleString(
                    "th-TH",
                    {
                      style: "currency",
                      currency: "THB",
                      maximumFractionDigits: 2,
                    },
                  )}
                </span>
              </div>
              {bookCoverAddon && bookCoverAddonPrice > 0 ? (
                <div className="flex justify-between text-orange-700 dark:text-orange-400">
                  <span>ค่าปกพลาสติกถนอมหนังสือ ({bookCount} เล่ม · VAT 7%)</span>
                  <span className="font-bold">
                    +{bookCoverAddonPrice.toLocaleString("th-TH", {
                      style: "currency",
                      currency: "THB",
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              ) : null}
              {remainingBalanceTotal > 0 ? (
                <div className="flex justify-between text-amber-700 dark:text-amber-400">
                  <span>ยอดค้างชำระเมื่อของถึงไทย</span>
                  <span className="font-semibold">
                    {remainingBalanceTotal.toLocaleString("th-TH", {
                      style: "currency",
                      currency: "THB",
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-zinc-200 pt-2 text-sm font-extrabold text-zinc-950 dark:border-zinc-700 dark:text-zinc-100">
                <span>ยอดชำระเบื้องต้น</span>
                <span className="text-base text-orange-600 dark:text-orange-400">
                  {immediateTotal.toLocaleString("th-TH", {
                    style: "currency",
                    currency: "THB",
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                ยังไม่รวมค่าจัดส่งตามจริง (คำนวณในขั้นตอนชำระเงิน)
              </p>
            </div>
            <Link
              href="/checkout"
              onClick={onClose}
              className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700"
            >
              ดำเนินการชำระเงิน <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </footer>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import {
  ArrowRight,
  BookMarked,
  BookOpen,
  Boxes,
  LogIn,
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
import { useEffect, useState } from "react";
import { CartItem, useCart } from "../context/CartContext";
import { useAuth } from "../contexts/AuthContext";
import BookCoverAddonBox from "./BookCoverAddonBox";

function CartItemThumbnail({ item }: { item: CartItem }) {
  const [hasError, setHasError] = useState(false);
  const src = item.image || item.coverImage || item.imageUrl;
  const isBook = item.kind === "MANGA" || item.kind === "LIGHT_NOVEL";

  if (src && !hasError) {
    return (
      <img
        src={src}
        alt={itemTitle(item)}
        className="h-16 w-12 shrink-0 rounded-md border border-zinc-200 object-cover shadow-xs dark:border-zinc-800"
        onError={() => setHasError(true)}
      />
    );
  }

  // Mini Spine Card for Manga / Light Novel without photo
  if (isBook) {
    const isNovel = item.kind === "LIGHT_NOVEL";
    const volNum =
      typeof item.volume === "number"
        ? String(item.volume).padStart(2, "0")
        : item.volume;

    return (
      <div
        className={`relative flex h-16 w-12 shrink-0 flex-col justify-between overflow-hidden rounded-md border p-1 select-none shadow-2xs transition-all ${
          isNovel
            ? "border-amber-300/70 bg-gradient-to-br from-amber-50 via-stone-50 to-orange-100/60 text-stone-900 dark:border-amber-900/50 dark:from-stone-900 dark:to-stone-950 dark:text-stone-100"
            : "border-zinc-200/90 bg-gradient-to-br from-zinc-50 via-stone-50 to-orange-50/70 text-zinc-900 dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-950 dark:text-zinc-100"
        }`}
        title={itemTitle(item)}
        aria-label={`Mini Spine Card ${itemTitle(item)}`}
      >
        {/* Decorative spine stripe */}
        <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-orange-500 to-amber-600 dark:from-orange-500/80 dark:to-orange-600/80" />

        <div className="pl-1 text-[8px] font-black tracking-tight text-orange-700 dark:text-orange-400">
          V.{volNum}
        </div>

        <div className="flex items-center justify-center pl-1 text-orange-600 dark:text-orange-400">
          <BookOpen size={13} aria-hidden="true" />
        </div>

        <div className="pl-1 text-[7px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
          {isNovel ? "NVL" : "MGA"}
        </div>
      </div>
    );
  }

  // Collectible fallback thumbnail
  const CollectibleIcon =
    item.kind === "FIGURE"
      ? Sparkles
      : item.kind === "PLAMO"
        ? Boxes
        : item.kind === "GOODS"
          ? ShoppingBag
          : item.kind === "ACCESSORY"
            ? ShieldCheck
            : Package;

  const collectibleTheme =
    item.kind === "PLAMO"
      ? "border-sky-300/80 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300"
      : item.kind === "GOODS"
        ? "border-violet-300/80 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300"
        : item.kind === "ACCESSORY"
          ? "border-emerald-300/80 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300";

  return (
    <div
      className={`flex h-16 w-12 shrink-0 flex-col items-center justify-center gap-1 rounded-md border shadow-2xs ${collectibleTheme}`}
      title={itemTitle(item)}
    >
      <CollectibleIcon size={16} aria-hidden="true" />
    </div>
  );
}

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
  const { user, isAuthenticated } = useAuth();
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
                      <CartItemThumbnail item={item} />
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
            {!isAuthenticated || !user ? (
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs font-semibold text-amber-850 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
                  <ShieldCheck size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>กรุณาเข้าสู่ระบบก่อนดำเนินการชำระเงิน</span>
                </div>
                <Link
                  href="/login?redirect=/checkout"
                  onClick={onClose}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-orange-500 dark:hover:text-white"
                >
                  <LogIn size={16} aria-hidden="true" />
                  เข้าสู่ระบบเพื่อดำเนินการชำระเงิน
                </Link>
              </div>
            ) : (
              <Link
                href="/checkout"
                onClick={onClose}
                className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700"
              >
                ดำเนินการชำระเงิน <ArrowRight size={16} aria-hidden="true" />
              </Link>
            )}
          </footer>
        ) : null}
      </div>
    </div>
  );
}

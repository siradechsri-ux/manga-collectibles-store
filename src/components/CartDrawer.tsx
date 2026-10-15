"use client";

import {
  AlertTriangle,
  ArrowRight,
  Award,
  BookMarked,
  BookOpen,
  Boxes,
  Check,
  LogIn,
  Minus,
  Package,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CartItem, useCart } from "../context/CartContext";
import { useAuth } from "../contexts/AuthContext";
import BookCoverAddonBox from "./BookCoverAddonBox";
import PointBadge from "./PointBadge";
import {
  listPromoCodes,
  MOCK_PROMO_CODES_UPDATED_EVENT,
  type PromoCoupon,
} from "../utils/promo";

interface DeleteConfirmTarget {
  type: "SINGLE" | "SELECTED" | "ALL";
  item?: CartItem;
  count?: number;
}

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

  const isReward = item.kind === "GOODS" && Boolean(item.isReward);

  // Collectible fallback thumbnail
  const CollectibleIcon =
    isReward
      ? Award
      : item.kind === "FIGURE"
        ? Sparkles
        : item.kind === "PLAMO"
          ? Boxes
          : item.kind === "GOODS"
            ? ShoppingBag
            : item.kind === "ACCESSORY"
              ? ShieldCheck
              : Package;

  const collectibleTheme =
    isReward
      ? "border-blue-300/80 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300"
      : item.kind === "PLAMO"
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
      return item.isReward ? "ของรางวัลสะสมแต้ม" : "กู้ดส์สะสม · พร้อมส่ง";
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

function cartItemKey(item: CartItem): string {
  return `${item.kind}-${item.id}`;
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
    selectedItems,
    selectedCartItemKeys,
    itemCount,
    selectedItemCount,
    bookCount,
    hasBookItems,
    bookCoverAddon,
    bookCoverAddonPrice,
    immediateTotal,
    remainingBalanceTotal,
    appliedPromoCode,
    promoDiscount,
    promoTitle,
    discountedImmediateTotal,
    updateQuantity,
    removeItem,
    updateFigurePaymentType,
    applyPromoCode,
    removePromoCode,
    clearCart,
    toggleItemSelection,
    selectAllItems,
    unselectAllItems,
    removeSelectedItems,
  } = useCart();
  const [promoInput, setPromoInput] = useState("");
  const [promoNotice, setPromoNotice] = useState<{ text: string; isError: boolean } | null>(null);
  const [availableCoupons, setAvailableCoupons] = useState<PromoCoupon[]>([]);

  useEffect(() => {
    function loadCoupons() {
      const now = new Date();
      const active = listPromoCodes().filter(
        (c) => c.isActive && new Date(c.expiresAt) > now,
      );
      setAvailableCoupons(active);
    }
    loadCoupons();
    window.addEventListener(MOCK_PROMO_CODES_UPDATED_EVENT, loadCoupons);
    window.addEventListener("storage", loadCoupons);
    return () => {
      window.removeEventListener(MOCK_PROMO_CODES_UPDATED_EVENT, loadCoupons);
      window.removeEventListener("storage", loadCoupons);
    };
  }, []);

  const allItemsSelected =
    items.length > 0 && selectedItems.length === items.length;

  const [deleteConfirmTarget, setDeleteConfirmTarget] =
    useState<DeleteConfirmTarget | null>(null);

  function handleConfirmDelete(): void {
    if (!deleteConfirmTarget) return;

    if (deleteConfirmTarget.type === "SINGLE" && deleteConfirmTarget.item) {
      removeItem(deleteConfirmTarget.item.kind, deleteConfirmTarget.item.id);
    } else if (deleteConfirmTarget.type === "SELECTED") {
      removeSelectedItems();
    } else if (deleteConfirmTarget.type === "ALL") {
      clearCart();
    }

    setDeleteConfirmTarget(null);
  }

  function handleDecreaseQuantity(item: CartItem): void {
    if (item.quantity <= 1) {
      setDeleteConfirmTarget({ type: "SINGLE", item });
    } else {
      updateQuantity(item.kind, item.id, item.quantity - 1);
    }
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        if (deleteConfirmTarget) {
          setDeleteConfirmTarget(null);
        } else {
          onClose();
        }
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
  }, [deleteConfirmTarget, isOpen, onClose]);

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
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() =>
                    allItemsSelected ? unselectAllItems() : selectAllItems()
                  }
                  aria-pressed={allItemsSelected}
                  className="text-xs font-semibold text-zinc-600 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
                >
                  {allItemsSelected ? "ยกเลิกเลือกทั้งหมด" : `เลือกสินค้าทั้งหมด (${items.length})`}
                </button>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setDeleteConfirmTarget({
                        type: "SELECTED",
                        count: selectedItems.length,
                      })
                    }
                    disabled={selectedItems.length === 0}
                    className="inline-flex min-h-8 items-center gap-1.5 text-xs font-bold text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-400"
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    ลบที่เลือก ({selectedItems.length})
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDeleteConfirmTarget({
                        type: "ALL",
                        count: items.length,
                      })
                    }
                    className="inline-flex min-h-8 items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    ลบทั้งหมด
                  </button>
                </div>
              </div>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {items.map((item) => {
                  const unitPrice = itemUnitPrice(item);
                  const lineTotal = unitPrice * item.quantity;
                  const itemKey = cartItemKey(item);
                  const isSelected = selectedCartItemKeys.includes(itemKey);
                  return (
                    <article
                      key={`${item.kind}-${item.id}`}
                      className="flex gap-3 py-3.5 first:pt-0 last:pb-0"
                    >
                      <button
                        type="button"
                        onClick={() => toggleItemSelection(itemKey)}
                        aria-label={`${isSelected ? "ยกเลิกเลือก" : "เลือก"} ${itemTitle(item)}`}
                        aria-pressed={isSelected}
                        className={`mt-5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
                          isSelected
                            ? "border-orange-600 bg-orange-600 text-white"
                            : "border-zinc-300 bg-white text-transparent hover:border-orange-500 dark:border-zinc-600 dark:bg-zinc-950"
                        }`}
                      >
                        <Check size={12} strokeWidth={3} aria-hidden="true" />
                      </button>
                      <CartItemThumbnail item={item} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="line-clamp-2 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                            {itemTitle(item)}
                          </h3>
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteConfirmTarget({ type: "SINGLE", item })
                            }
                            aria-label={`ลบ ${itemTitle(item)}`}
                            className="text-zinc-400 transition hover:text-red-600 dark:hover:text-red-400"
                          >
                            <Trash2 size={14} aria-hidden="true" />
                          </button>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                            {itemKindLabel(item)}
                          </p>
                          {item.kind === "GOODS" && item.isReward ? (
                            <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-extrabold text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800">
                              <PointBadge size="xs" />
                              <span>แลกด้วยแต้ม (฿0)</span>
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-2.5 flex items-center justify-between">
                          <div className="inline-flex items-center rounded-lg border border-zinc-200 dark:border-zinc-700">
                            <button
                              type="button"
                              onClick={() => handleDecreaseQuantity(item)}
                              disabled={item.kind === "GOODS" && Boolean(item.isReward)}
                              aria-label="ลดจำนวน"
                              className="p-1 text-zinc-600 hover:text-zinc-950 disabled:opacity-30 dark:text-zinc-300 dark:hover:text-white"
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
                              disabled={
                                (item.kind === "GOODS" && Boolean(item.isReward)) ||
                                item.quantity >= 99
                              }
                              aria-label="เพิ่มจำนวน"
                              className="p-1 text-zinc-600 hover:text-zinc-950 disabled:opacity-30 dark:text-zinc-300 dark:hover:text-white"
                            >
                              <Plus size={13} aria-hidden="true" />
                            </button>
                          </div>
                          {item.kind === "GOODS" && item.isReward ? (
                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                              แลกฟรี (0 บาท)
                            </span>
                          ) : (
                            <span className="text-xs font-extrabold text-zinc-950 dark:text-zinc-100">
                              {lineTotal.toLocaleString("th-TH", {
                                style: "currency",
                                currency: "THB",
                                maximumFractionDigits: 0,
                              })}
                            </span>
                          )}
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
            {/* Promo Code Engine */}
            <div className="mb-3 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                <Tag size={13} className="text-orange-600 dark:text-orange-400" aria-hidden="true" />
                <span>โค้ดส่วนลด / โปรโมชัน</span>
              </div>

              {appliedPromoCode ? (
                <div className="mt-2 flex items-center justify-between rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 dark:border-emerald-800 dark:bg-emerald-950/60">
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300 truncate">
                      {appliedPromoCode} · {promoTitle}
                    </p>
                    <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                      ลดทันที ฿{promoDiscount.toLocaleString("th-TH")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      removePromoCode();
                      setPromoNotice(null);
                    }}
                    className="ml-2 rounded-md p-1 text-emerald-700 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-900"
                    aria-label="ยกเลิกโค้ด"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <div className="mt-2 space-y-2">
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                      placeholder="เช่น WELCOME10, MANGA50"
                      className="min-h-9 flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 text-xs font-semibold text-zinc-900 uppercase placeholder:normal-case placeholder:font-normal placeholder:text-zinc-400 focus:border-orange-500 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-orange-400"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!promoInput.trim()) return;
                        const res = applyPromoCode(promoInput);
                        setPromoNotice({ text: res.message, isError: !res.success });
                        if (res.success) setPromoInput("");
                      }}
                      className="min-h-9 rounded-lg bg-zinc-900 px-3 text-xs font-bold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                    >
                      ใช้โค้ด
                    </button>
                  </div>
                  {/* Quick Suggestions from available active coupons */}
                  {availableCoupons.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                        แนะนำ:
                      </span>
                      {availableCoupons.slice(0, 4).map((c) => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => {
                            const res = applyPromoCode(c.code);
                            setPromoNotice({
                              text: res.message,
                              isError: !res.success,
                            });
                          }}
                          className="rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-bold text-zinc-700 hover:border-orange-300 hover:text-orange-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-orange-700 dark:hover:text-orange-400"
                        >
                          {c.code} (
                          {c.type === "FREE_SHIPPING"
                            ? "ส่งฟรี"
                            : c.type === "PERCENTAGE"
                              ? `-${c.value}%`
                              : `-฿${c.value}`}
                          )
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}

              {promoNotice ? (
                <p
                  role="status"
                  className={`mt-2 text-[11px] font-semibold ${
                    promoNotice.isError
                      ? "text-red-600 dark:text-red-400"
                      : "text-emerald-700 dark:text-emerald-400"
                  }`}
                >
                  {promoNotice.text}
                </p>
              ) : null}
            </div>

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
              {promoDiscount > 0 ? (
                <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                  <span className="font-semibold">ส่วนลดโปรโมชัน ({appliedPromoCode})</span>
                  <span className="font-bold">
                    -{promoDiscount.toLocaleString("th-TH", {
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
                <div className="text-right">
                  {promoDiscount > 0 ? (
                    <span className="mr-2 text-xs font-semibold text-zinc-400 line-through">
                      {immediateTotal.toLocaleString("th-TH", {
                        style: "currency",
                        currency: "THB",
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  ) : null}
                  <span className="text-base text-orange-600 dark:text-orange-400">
                    {discountedImmediateTotal.toLocaleString("th-TH", {
                      style: "currency",
                      currency: "THB",
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                ยังไม่รวมค่าจัดส่งตามจริง (คำนวณในขั้นตอนชำระเงิน)
              </p>
            </div>
            {selectedItems.length === 0 ? (
              <div className="mt-4">
                <button
                  type="button"
                  disabled
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-zinc-200 px-4 text-sm font-bold text-zinc-500 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-500"
                >
                  กรุณาเลือกสินค้าเพื่อชำระเงิน (0 รายการ)
                </button>
                <p className="mt-2 text-center text-[11px] text-zinc-500 dark:text-zinc-400">
                  แตะวงกลมหน้ารายการสินค้าเพื่อเลือกชิ้นที่ต้องการสั่งซื้อ
                </p>
              </div>
            ) : !isAuthenticated || !user ? (
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs font-semibold text-amber-850 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
                  <ShieldCheck size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>กรุณาเข้าสู่ระบบก่อนดำเนินการชำระเงิน ({selectedItems.length} รายการ)</span>
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
                ดำเนินการชำระเงิน ({selectedItems.length} รายการ) <ArrowRight size={16} aria-hidden="true" />
              </Link>
            )}
          </footer>
        ) : null}
      </div>

      {/* Delete Confirmation Popup Modal */}
      {deleteConfirmTarget ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          aria-describedby="delete-dialog-desc"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={() => setDeleteConfirmTarget(null)}
            aria-hidden="true"
          />

          {/* Modal Card */}
          <div className="relative w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-start gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-950/70 dark:text-red-400">
                <Trash2 size={20} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h3
                  id="delete-dialog-title"
                  className="text-base font-extrabold text-zinc-950 dark:text-zinc-100"
                >
                  {deleteConfirmTarget.type === "SINGLE"
                    ? "นำสินค้าออกจากตะกร้า"
                    : deleteConfirmTarget.type === "SELECTED"
                      ? "ลบสินค้าที่เลือก"
                      : "ลบสินค้าทั้งหมดในตะกร้า"}
                </h3>
                <p
                  id="delete-dialog-desc"
                  className="mt-1.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400"
                >
                  {deleteConfirmTarget.type === "SINGLE" && deleteConfirmTarget.item ? (
                    <>
                      คุณต้องการนำ{" "}
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        "{itemTitle(deleteConfirmTarget.item)}"
                      </span>{" "}
                      ออกจากตะกร้าสินค้าใช่หรือไม่?
                    </>
                  ) : deleteConfirmTarget.type === "SELECTED" ? (
                    <>
                      คุณต้องการนำสินค้าที่เลือกทั้งหมด{" "}
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        {deleteConfirmTarget.count ?? selectedItems.length} รายการ
                      </span>{" "}
                      ออกจากตะกร้าใช่หรือไม่?
                    </>
                  ) : (
                    "คุณต้องการลบสินค้าทั้งหมดออกจากตะกร้าใช่หรือไม่? รายการสินค้าทั้งหมดในตะกร้าจะถูกล้างออก"
                  )}
                </p>
              </div>
            </div>

            {/* If single item, show preview thumbnail */}
            {deleteConfirmTarget.type === "SINGLE" && deleteConfirmTarget.item ? (
              <div className="mt-3.5 flex items-center gap-2.5 rounded-xl border border-zinc-100 bg-zinc-50 p-2.5 dark:border-zinc-800 dark:bg-zinc-900">
                <CartItemThumbnail item={deleteConfirmTarget.item} />
                <div className="min-w-0 flex-1 text-xs">
                  <p className="line-clamp-1 font-bold text-zinc-900 dark:text-zinc-100">
                    {itemTitle(deleteConfirmTarget.item)}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    จำนวน {deleteConfirmTarget.item.quantity} ชิ้น · ฿
                    {(
                      itemUnitPrice(deleteConfirmTarget.item) *
                      deleteConfirmTarget.item.quantity
                    ).toLocaleString("th-TH")}
                  </p>
                </div>
              </div>
            ) : null}

            {/* Modal Action Buttons */}
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirmTarget(null)}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-red-700 active:scale-95"
              >
                <Trash2 size={14} aria-hidden="true" />
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

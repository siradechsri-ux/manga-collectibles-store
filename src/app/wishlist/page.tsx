"use client";

import {
  ArrowRight,
  Bookmark,
  BookOpen,
  Boxes,
  Heart,
  HeartOff,
  Package,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "../../context/CartContext";
import { useWishlist, WishlistItem } from "../../contexts/WishlistContext";
import { useAuth } from "../../contexts/AuthContext";
import { canShop, getRoleHomeUrl } from "../../utils/permissions";
import { getRewardNumericId } from "../../mocks/rewards.mock";
import PointBadge from "../../components/PointBadge";

const moneyFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 0,
});

function itemTypeThai(type: WishlistItem["itemType"]): string {
  switch (type) {
    case "MANGA":
      return "มังงะ";
    case "LIGHT_NOVEL":
      return "ไลท์โนเวล";
    case "FIGURE":
      return "ฟิกเกอร์";
    case "PLAMO":
      return "พลาโมเดล";
    case "GOODS":
      return "กู้ดส์";
    case "ACCESSORY":
      return "อุปกรณ์ดูแล";
    default:
      return "ของสะสม";
  }
}

export default function WishlistPage() {
  const { items, wishlistCount, removeFromWishlist, clearWishlist, isReady } =
    useWishlist();
  const { addItem } = useCart();
  const { user } = useAuth();
  const userCanShop = canShop(user?.role);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [addedItemNotice, setAddedItemNotice] = useState<string | null>(null);

  const filteredItems = items.filter((item) => {
    if (filterType === "ALL") return true;
    if (filterType === "BOOKS") {
      return item.itemType === "MANGA" || item.itemType === "LIGHT_NOVEL";
    }
    if (filterType === "FIGURES") {
      return item.itemType === "FIGURE" || item.itemType === "PLAMO";
    }
    return item.itemType === "GOODS" || item.itemType === "ACCESSORY";
  });

  const handleMoveToCart = (item: WishlistItem) => {
    const rawNum = Number(item.id);
    const safeNumericId = Number.isSafeInteger(rawNum) && rawNum > 0 ? rawNum : 1001;
    const img = item.imageUrl || null;

    if (item.itemType === "MANGA") {
      addItem({
        kind: "MANGA",
        id: safeNumericId,
        title: item.title,
        volume: 1,
        price: item.price,
        image: img,
        coverImage: img,
        imageUrl: img,
        isPreorder: Boolean(item.isPreorder),
        quantity: 1,
      });
    } else if (item.itemType === "LIGHT_NOVEL") {
      addItem({
        kind: "LIGHT_NOVEL",
        id: safeNumericId,
        title: item.title,
        volume: 1,
        price: item.price,
        image: img,
        coverImage: img,
        imageUrl: img,
        isPreorder: Boolean(item.isPreorder),
        quantity: 1,
      });
    } else if (item.itemType === "PLAMO") {
      addItem({
        kind: "PLAMO",
        id: safeNumericId,
        name: item.title,
        fullPrice: item.price,
        depositAmount: Math.round(item.price * 0.3),
        selectedPaymentType: "FULL",
        quantity: 1,
        boxDimensions: { widthCm: 25, lengthCm: 20, heightCm: 10 },
        image: img,
        coverImage: img,
        imageUrl: img,
      });
    } else if (item.itemType === "GOODS") {
      const parsedId = Number.isFinite(Number(item.id))
        ? Number(item.id)
        : getRewardNumericId(item.id);
      const isReward = item.price === 0;
      addItem({
        kind: "GOODS",
        id: parsedId,
        name: item.title,
        fullPrice: item.price,
        quantity: 1,
        image: img,
        coverImage: img,
        imageUrl: img,
        ...(isReward ? { isReward: true, pointsSpent: 0, subcategory: "REWARD" } : {}),
      });
    } else if (item.itemType === "ACCESSORY") {
      addItem({
        kind: "ACCESSORY",
        id: safeNumericId,
        name: item.title,
        fullPrice: item.price,
        quantity: 1,
        image: img,
        coverImage: img,
        imageUrl: img,
      });
    } else {
      // Default Figure
      addItem({
        kind: "FIGURE",
        id: safeNumericId,
        name: item.title,
        fullPrice: item.price,
        depositAmount: Math.round(item.price * 0.3),
        selectedPaymentType: "FULL",
        quantity: 1,
        boxDimensions: { widthCm: 20, lengthCm: 18, heightCm: 25 },
        image: img,
        coverImage: img,
        imageUrl: img,
      });
    }

    // Automatically remove from wishlist after moving to cart
    removeFromWishlist(item.id, item.itemType);
    setAddedItemNotice(`ย้าย "${item.title}" ลงในตะกร้าสินค้าเรียบร้อยแล้ว`);
    setTimeout(() => setAddedItemNotice(null), 3500);
  };

  if (!isReady) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center px-4">
        <p className="text-sm text-zinc-500">กำลังโหลดรายการสิ่งที่ชอบ...</p>
      </main>
    );
  }

  if (user && !userCanShop) {
    const roleLink =
      user.role === "ADMIN"
        ? "/admin"
        : user.role === "STAFF"
          ? "/staff/packing"
          : "/finance/slips";

    return (
      <main className="mx-auto flex min-h-[65vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
          <ShieldAlert size={32} aria-hidden="true" />
        </div>
        <p className="mt-4 text-xs font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
          HTTP 403 · Customer Feature Only
        </p>
        <h1 className="mt-2 text-2xl font-extrabold text-zinc-900 dark:text-zinc-50">
          ระบบรายการสิ่งที่ชอบ (Wishlist) สำหรับบัญชีลูกค้าเท่านั้น
        </h1>
        <p className="mt-2 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
          บัญชีของคุณเป็นประเภท {user.role} ซึ่งเป็นส่วนงานจัดการระบบหลังบ้าน ไม่มีสิทธิ์เข้าถึงฟังก์ชันรายการโปรดหรือสั่งซื้อสินค้าทั่วไป
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href={roleLink}
            className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-orange-700"
          >
            ไปยังหน้าจัดการ {user.role}
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
          >
            กลับหน้าแรก
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-[75vh] max-w-7xl px-4 py-8 pb-28 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:items-end sm:justify-between dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400">
              <Heart size={18} className="fill-red-500 text-red-500" aria-hidden="true" />
            </span>
            <p className="text-xs font-extrabold uppercase tracking-wider text-red-600 dark:text-red-400">
              MY WISHLIST · FAVORITES
            </p>
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
            รายการสิ่งที่ชอบ (My Wishlist)
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            มีทั้งหมด {wishlistCount} รายการที่คุณชื่นชอบ
          </p>
        </div>

        {wishlistCount > 0 ? (
          <button
            type="button"
            onClick={clearWishlist}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-red-800 dark:hover:bg-zinc-800"
          >
            <Trash2 size={14} aria-hidden="true" />
            ล้างรายการทั้งหมด
          </button>
        ) : null}
      </div>

      {addedItemNotice ? (
        <div
          role="status"
          className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 animate-in fade-in"
        >
          {addedItemNotice}
        </div>
      ) : null}

      {/* Filter Tabs */}
      {wishlistCount > 0 ? (
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilterType("ALL")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              filterType === "ALL"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950"
                : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            }`}
          >
            ทั้งหมด ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("BOOKS")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              filterType === "BOOKS"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950"
                : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            }`}
          >
            มังงะ & ไลท์โนเวล
          </button>
          <button
            type="button"
            onClick={() => setFilterType("FIGURES")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              filterType === "FIGURES"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950"
                : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            }`}
          >
            ฟิกเกอร์ & พลาโม
          </button>
          <button
            type="button"
            onClick={() => setFilterType("OTHER")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              filterType === "OTHER"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950"
                : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            }`}
          >
            กู้ดส์ & อุปกรณ์
          </button>
        </div>
      ) : null}

      {/* Grid or Empty State */}
      {filteredItems.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 bg-zinc-50/50 py-16 text-center dark:border-zinc-800 dark:bg-zinc-900/30">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
            <HeartOff size={28} aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">
            ยังไม่มีรายการสินค้าที่บันทึกไว้
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">
            กดไอคอนรูปหัวใจบนการ์ดสินค้าเพื่อบันทึกรายการที่คุณสนใจไว้ดูภายหลัง
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-orange-600 px-5 text-xs font-bold text-white shadow-xs transition hover:bg-orange-700"
          >
            <ShoppingBag size={15} aria-hidden="true" />
            ไปเลือกดูแคตตาล็อกสินค้า
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filteredItems.map((item) => (
            <article
              key={`${item.itemType}-${item.id}`}
              className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xs transition hover:-translate-y-1 hover:border-orange-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-orange-800"
            >
              <div>
                <div className="relative aspect-3/4 overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-zinc-400 dark:text-zinc-600">
                      <Package size={28} aria-hidden="true" />
                    </div>
                  )}

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => removeFromWishlist(item.id, item.itemType)}
                    aria-label={`ลบ ${item.title} ออกจากรายการสิ่งที่ชอบ`}
                    className="absolute right-2 top-2 rounded-lg bg-white/90 p-1.5 text-zinc-500 shadow-sm backdrop-blur-xs transition hover:bg-red-50 hover:text-red-600 dark:bg-zinc-800/90 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-red-400"
                    title="ลบออกจากสิ่งที่ชอบ"
                  >
                    <Trash2 size={13} aria-hidden="true" />
                  </button>

                  {/* Category Badge */}
                  <span className="absolute bottom-2 left-2 rounded-md bg-black/75 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-xs">
                    {itemTypeThai(item.itemType)}
                  </span>

                  {/* Stock Status */}
                  <span
                    className={`absolute top-2 left-2 rounded-md px-2 py-0.5 text-[9px] font-bold shadow-2xs backdrop-blur-xs ${
                      item.isPreorder
                        ? "bg-amber-100/90 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300/60"
                        : "bg-emerald-100/90 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300/60"
                    }`}
                  >
                    {item.isPreorder ? "Pre-order" : "พร้อมส่ง"}
                  </span>
                </div>

                <div className="p-3 sm:p-4">
                  <h3
                    className="line-clamp-2 text-xs sm:text-sm font-bold text-zinc-900 group-hover:text-orange-700 dark:text-zinc-100 dark:group-hover:text-orange-400"
                    title={item.title}
                  >
                    {item.title}
                  </h3>
                  {item.price === 0 ? (
                    <p className="mt-2 flex items-center gap-1.5 text-xs font-black text-blue-600 dark:text-blue-400">
                      <PointBadge size="xs" />
                      <span>ของรางวัลสะสมแต้ม</span>
                    </p>
                  ) : (
                    <p className="mt-2 text-sm sm:text-base font-extrabold text-zinc-950 dark:text-zinc-100">
                      {moneyFormatter.format(item.price)}
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t border-zinc-100 p-3 pt-2 dark:border-zinc-800">
                <div className="flex flex-col gap-1.5">
                  {userCanShop ? (
                    <button
                      type="button"
                      onClick={() => handleMoveToCart(item)}
                      className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-orange-600 px-3 text-xs font-bold text-white shadow-xs transition hover:bg-orange-700 active:scale-95"
                    >
                      <ShoppingBag size={13} aria-hidden="true" />
                      ย้ายลงตะกร้า
                    </button>
                  ) : null}
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={item.url}
                      className="inline-flex min-h-8 flex-1 items-center justify-center rounded-lg border border-zinc-200 bg-white text-[11px] font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      ดูรายละเอียด
                    </Link>
                    <button
                      type="button"
                      onClick={() => removeFromWishlist(item.id, item.itemType)}
                      aria-label="ลบออก"
                      className="inline-flex min-h-8 items-center justify-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 text-[11px] font-bold text-zinc-500 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-red-800 dark:hover:bg-zinc-800"
                      title="ลบออก"
                    >
                      <Trash2 size={12} aria-hidden="true" />
                      <span>ลบออก</span>
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

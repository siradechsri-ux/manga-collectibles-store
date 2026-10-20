"use client";

import { Check, CheckCircle2, Gift, Plus, ShoppingBag, Sparkles } from "lucide-react";
import { useState } from "react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../contexts/AuthContext";
import { canShop } from "../utils/permissions";

export interface BundleItemOption {
  id: number;
  kind: "MANGA" | "LIGHT_NOVEL" | "FIGURE" | "PLAMO" | "GOODS" | "ACCESSORY";
  title: string;
  price: number;
  imageUrl: string;
  defaultChecked?: boolean;
}

interface ProductBundleDealProps {
  mainProduct: {
    id: number;
    kind: "MANGA" | "LIGHT_NOVEL" | "FIGURE" | "PLAMO" | "GOODS" | "ACCESSORY";
    title: string;
    price: number;
    imageUrl: string;
  };
  companionItems: BundleItemOption[];
  discountPercent?: number; // e.g. 8 for 8%
}

export default function ProductBundleDeal({
  mainProduct,
  companionItems,
  discountPercent = 8,
}: ProductBundleDealProps) {
  const { addItem } = useCart();
  const { user } = useAuth();
  const userCanShop = canShop(user?.role);
  const [selectedIds, setSelectedIds] = useState<number[]>(
    companionItems.map((item) => item.id),
  );
  const [addedNotice, setAddedNotice] = useState<string | null>(null);

  const toggleItem = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  // Calculate prices
  const selectedCompanions = companionItems.filter((item) =>
    selectedIds.includes(item.id),
  );
  const rawTotal =
    mainProduct.price +
    selectedCompanions.reduce((acc, item) => acc + item.price, 0);

  const hasCompanionsSelected = selectedCompanions.length > 0;
  const bundleDiscount = hasCompanionsSelected
    ? Math.round(rawTotal * (discountPercent / 100))
    : 0;
  const finalTotal = rawTotal - bundleDiscount;

  const handleAddBundleToCart = (e?: React.MouseEvent) => {
    if (!userCanShop) return;
    const discountMultiplier = hasCompanionsSelected
      ? 1 - discountPercent / 100
      : 1;

    const addProduct = (
      product: BundleItemOption,
      volume = 1,
      triggerTarget?: React.MouseEvent | null,
    ) => {
      const discountedItemPrice = Math.round(product.price * discountMultiplier);

      if (product.kind === "MANGA" || product.kind === "LIGHT_NOVEL") {
        addItem(
          {
            kind: product.kind,
            id: product.id,
            title: product.title,
            volume,
            price: discountedItemPrice,
            imageUrl: product.imageUrl,
            image: product.imageUrl,
            coverImage: product.imageUrl,
            isPreorder: false,
            quantity: 1,
          },
          triggerTarget,
        );
      } else if (product.kind === "FIGURE" || product.kind === "PLAMO") {
        addItem({
          kind: product.kind,
          id: product.id,
          name: product.title,
          fullPrice: discountedItemPrice,
          depositAmount: 0,
          selectedPaymentType: "FULL",
          quantity: 1,
          imageUrl: product.imageUrl,
          image: product.imageUrl,
          coverImage: product.imageUrl,
          boxDimensions: { widthCm: 18, lengthCm: 18, heightCm: 25 },
        });
      } else if (product.kind === "ACCESSORY") {
        addItem({
          kind: "ACCESSORY",
          id: product.id,
          name: product.title,
          fullPrice: discountedItemPrice,
          quantity: 1,
          imageUrl: product.imageUrl,
          image: product.imageUrl,
          coverImage: product.imageUrl,
        });
      } else {
        addItem({
          kind: "GOODS",
          id: product.id,
          name: product.title,
          fullPrice: discountedItemPrice,
          quantity: 1,
          imageUrl: product.imageUrl,
          image: product.imageUrl,
          coverImage: product.imageUrl,
        });
      }
    };

    // Add main item with animation trigger
    addProduct(mainProduct, 1, e);

    // Add selected companions
    selectedCompanions.forEach((comp, idx) => {
      addProduct(comp, idx + 2);
    });

    setAddedNotice(
      `เพิ่มเซ็ตคอมโบ (${selectedCompanions.length + 1} ชิ้น) ลงในตะกร้าสินค้าเรียบร้อยแล้ว`,
    );
    setTimeout(() => setAddedNotice(null), 3500);
  };

  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/40">
            <Gift size={13} aria-hidden="true" />
            <span>BUNDLE COMBO DEAL · ลดพิเศษ {discountPercent}%</span>
          </div>
          <h2 className="mt-2 text-lg font-bold text-zinc-900 dark:text-zinc-100">
            สินค้าที่มักจะซื้อคู่กัน (Frequently Bought Together)
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            จับคู่ชิ้นที่จำเป็นพร้อมส่วนลดพิเศษ จบในคลิกเดียว
          </p>
        </div>

        {addedNotice && (
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={16} />
            <span>{addedNotice}</span>
          </div>
        )}
      </div>

      {/* Visual Product Formula: A + B + C = Total */}
      <div className="mt-6 flex flex-wrap items-center gap-4 sm:gap-6">
        {/* Main Product */}
        <div className="flex items-center gap-3 rounded-2xl border-2 border-blue-500/40 bg-blue-50/20 p-3 dark:border-blue-500/30 dark:bg-blue-950/20 max-w-xs">
          <div className="h-16 w-14 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
            <img
              src={mainProduct.imageUrl}
              alt={mainProduct.title}
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[9px] font-black text-white">
              ชิ้นหลัก
            </span>
            <p className="mt-1 text-xs font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">
              {mainProduct.title}
            </p>
            <p className="text-xs font-black text-blue-600 dark:text-blue-400">
              ฿{mainProduct.price.toLocaleString("th-TH")}
            </p>
          </div>
        </div>

        {companionItems.map((comp) => {
          const isSelected = selectedIds.includes(comp.id);
          return (
            <div key={comp.id} className="flex items-center gap-4">
              <span className="text-zinc-300 dark:text-zinc-700 font-bold text-xl">
                +
              </span>

              <button
                type="button"
                onClick={() => toggleItem(comp.id)}
                className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition max-w-xs ${
                  isSelected
                    ? "border-zinc-300 bg-white shadow-2xs dark:border-zinc-700 dark:bg-zinc-800"
                    : "border-zinc-200 bg-zinc-50/60 opacity-60 dark:border-zinc-800 dark:bg-zinc-900"
                }`}
              >
                <div className="h-16 w-14 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                  <img
                    src={comp.imageUrl}
                    alt={comp.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleItem(comp.id)}
                      className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                      เพิ่มชิ้นนี้
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                    {comp.title}
                  </p>
                  <p className="text-xs font-black text-zinc-900 dark:text-zinc-100">
                    ฿{comp.price.toLocaleString("th-TH")}
                  </p>
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* Action Footer */}
      <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-zinc-100 pt-5 dark:border-zinc-800">
        <div className="flex items-baseline gap-3">
          <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
            ราคารวมทั้งเซ็ต ({selectedCompanions.length + 1} ชิ้น):
          </span>
          <span className="text-2xl font-black text-zinc-950 dark:text-zinc-50">
            ฿{finalTotal.toLocaleString("th-TH")}
          </span>
          {bundleDiscount > 0 && (
            <span className="text-xs font-bold text-zinc-400 line-through">
              ฿{rawTotal.toLocaleString("th-TH")}
            </span>
          )}
          {bundleDiscount > 0 && (
            <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-black text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300">
              ประหยัดทันที ฿{bundleDiscount}
            </span>
          )}
        </div>

        {userCanShop ? (
          <button
            type="button"
            onClick={(e) => handleAddBundleToCart(e)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700 active:scale-95"
          >
            <ShoppingBag size={14} aria-hidden="true" />
            <span>เพิ่มทั้งเซ็ตลงตะกร้าในคลิกเดียว</span>
          </button>
        ) : (
          <div className="flex min-h-11 items-center justify-center rounded-xl bg-zinc-100 px-5 text-center text-xs font-bold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            <span>เฉพาะบัญชีลูกค้าสำหรับสั่งซื้อ</span>
          </div>
        )}
      </div>
    </section>
  );
}

"use client";

import {
  AlertCircle,
  ArrowRight,
  Bell,
  BookOpen,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  Package,
  ShoppingBag,
  Sparkles,
  Tag,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "../../context/CartContext";
import {
  MOCK_CALENDAR_RELEASES,
  type CalendarReleaseItem,
  type ReleaseCategory,
} from "../../mocks/release-calendar.mock";
import {
  getCalendarReleases,
  subscribeCalendarReleases,
} from "../../services/calendar.service";
import CartDrawer from "../../components/CartDrawer";
import StockAlertModal from "../../components/StockAlertModal";

export default function CalendarPage() {
  const { addItem } = useCart();
  const [releases, setReleases] = useState<CalendarReleaseItem[]>(() =>
    getCalendarReleases(),
  );
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [selectedPublisher, setSelectedPublisher] = useState<string>("ALL");
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    return subscribeCalendarReleases((items) => {
      setReleases(items);
    });
  }, []);

  // Stock alert modal
  const [stockModal, setStockModal] = useState<{
    open: boolean;
    productId: string;
    productTitle: string;
  }>({ open: false, productId: "", productTitle: "" });

  const publishers = Array.from(
    new Set(releases.map((r) => r.publisherOrBrand)),
  ).sort();

  const filteredItems = releases.filter((item) => {
    if (filterCategory !== "ALL" && item.category !== filterCategory) return false;
    if (selectedPublisher !== "ALL" && item.publisherOrBrand !== selectedPublisher)
      return false;
    return true;
  });

  const handlePreorder = (item: CalendarReleaseItem) => {
    if (item.category === "FIGURE") {
      addItem({
        kind: "FIGURE",
        id: 77000 + Math.floor(Math.random() * 1000),
        name: item.title,
        fullPrice: item.price,
        depositAmount: Math.round(item.price * 0.3),
        selectedPaymentType: "DEPOSIT",
        quantity: 1,
        imageUrl: item.imageUrl,
        image: item.imageUrl,
        coverImage: item.imageUrl,
        boxDimensions: { widthCm: 18, lengthCm: 18, heightCm: 25 },
      });
    } else {
      addItem({
        kind: item.category === "LIGHT_NOVEL" ? "LIGHT_NOVEL" : "MANGA",
        id: 66000 + Math.floor(Math.random() * 1000),
        title: item.title,
        volume: 1,
        price: item.price,
        quantity: 1,
        isPreorder: item.status === "PREORDER_OPEN",
        imageUrl: item.imageUrl,
        image: item.imageUrl,
        coverImage: item.imageUrl,
      });
    }

    setToastMessage(`เพิ่มรายการจองพรีออเดอร์ “${item.title}” ลงในตะกร้าแล้ว`);
    setCartDrawerOpen(true);
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <>
      <main className="min-h-screen bg-zinc-50/70 pb-16 pt-8 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav
            aria-label="Breadcrumb"
            className="mb-6 flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400"
          >
            <Link href="/" className="hover:text-blue-600 transition">
              หน้าแรก
            </Link>
            <span>/</span>
            <span className="text-zinc-900 dark:text-zinc-100">
              ตารางวางจำหน่ายสินค้าออกใหม่ (Release Schedule)
            </span>
          </nav>

          {/* Page Header */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-extrabold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/40">
                <Calendar size={13} aria-hidden="true" />
                <span>OFFICIAL RELEASE CALENDAR 2026</span>
              </div>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
                ตารางวางจำหน่ายมังงะและฟิกเกอร์ประจำเดือน
              </h1>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                อัปเดตวันวางขายหนังสือการ์ตูน ไลท์โนเวล และฟิกเกอร์ลิขสิทธิ์แท้ทุกสัปดาห์
              </p>
            </div>

            <button
              type="button"
              onClick={() => setCartDrawerOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 text-xs font-bold text-zinc-800 shadow-2xs transition hover:border-blue-500 hover:text-blue-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-blue-500"
            >
              <ShoppingBag size={15} aria-hidden="true" />
              <span>เปิดตะกร้าสินค้า</span>
            </button>
          </div>

          {/* Filter Bar */}
          <div className="mb-8 rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Category Pills */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mr-1">
                  หมวดหมู่:
                </span>
                {[
                  ["ALL", "ทั้งหมด"],
                  ["MANGA", "มังงะ"],
                  ["LIGHT_NOVEL", "ไลท์โนเวล"],
                  ["FIGURE", "ฟิกเกอร์"],
                ].map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setFilterCategory(val)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      filterCategory === val
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Publisher Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                  ค่าย / สำนักพิมพ์:
                </span>
                <select
                  value={selectedPublisher}
                  onChange={(e) => setSelectedPublisher(e.target.value)}
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 shadow-2xs focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                >
                  <option value="ALL">ทุกค่าย / ทุกสำนักพิมพ์</option>
                  {publishers.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Calendar Release Timeline List */}
          <div className="space-y-4">
            {filteredItems.length === 0 ? (
              <div className="py-16 text-center text-xs text-zinc-500 dark:text-zinc-400 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                ไม่พบรายการสินค้าที่วางขายตามเงื่อนไขที่เลือก
              </div>
            ) : (
              filteredItems.map((item) => (
                <article
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5 shadow-xs transition hover:border-blue-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex items-center gap-4">
                    {/* Date Badge */}
                    <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-blue-50 text-blue-700 border border-blue-200/80 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900/60">
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                        {item.dayLabel.split(" ")[1]}
                      </span>
                      <span className="text-xl font-black tabular-nums">
                        {item.dayLabel.split(" ")[0]}
                      </span>
                    </div>

                    {/* Thumbnail */}
                    <div className="h-20 w-16 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    {/* Info */}
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                          {item.publisherOrBrand}
                        </span>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            item.status === "IN_STOCK"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60"
                          }`}
                        >
                          {item.status === "IN_STOCK"
                            ? "วางขายแล้ว (พร้อมส่ง)"
                            : "เปิดสั่งจองล่วงหน้า (Pre-order)"}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                        {item.title}
                      </h3>
                      <p className="mt-0.5 text-xs font-extrabold text-blue-600 dark:text-blue-400">
                        ฿{item.price.toLocaleString("th-TH")}
                        {item.preorderDiscountPercent ? (
                          <span className="ml-2 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                            (จองล่วงหน้าลด {item.preorderDiscountPercent}%)
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-zinc-100 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => handlePreorder(item)}
                      className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700 active:scale-95"
                    >
                      <ShoppingBag size={13} aria-hidden="true" />
                      <span>
                        {item.status === "IN_STOCK" ? "สั่งซื้อทันที" : "จองพรีออเดอร์"}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setStockModal({
                          open: true,
                          productId: item.id,
                          productTitle: item.title,
                        })
                      }
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-500 hover:text-amber-600 dark:hover:text-amber-400 transition"
                    >
                      <Bell size={12} aria-hidden="true" />
                      <span>ตั้งแจ้งเตือน</span>
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Stock alert modal */}
      <StockAlertModal
        isOpen={stockModal.open}
        onClose={() => setStockModal({ open: false, productId: "", productTitle: "" })}
        productId={stockModal.productId}
        productTitle={stockModal.productTitle}
      />

      {/* Cart Drawer */}
      <CartDrawer isOpen={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />
    </>
  );
}

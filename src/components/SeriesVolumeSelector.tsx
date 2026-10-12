"use client";

import { useMemo, useState } from "react";
import {
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  PackageCheck,
  ShoppingCart,
  X,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
  joinMockWaitlist,
  type MockWaitlistEntry,
} from "../mocks/storage.mock";
import { canShop } from "../utils/permissions";
import { BookCoverImage } from "./ProductCard";

export interface VolumeItem {
  id: number;
  volumeNumber: number;
  title: string;
  variantLabel?: string;
  coverUrl?: string | null;
  price: number;
  weightGrams?: number;
  stock: number;
  status: "IN_STOCK" | "PREORDER" | "OUT_OF_STOCK";
  expectedShippingDate?: string;
}

export interface SeriesVolumeSelectorProps {
  volumes: VolumeItem[];
  onAddToCart: (volume: VolumeItem) => void;
  onCheckoutNow: (volumes: VolumeItem[]) => void;
  isNovel?: boolean;
}

const currencyFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function formatExpectedShippingDate(date: string | undefined): string {
  if (!date) {
    return "กำหนดวันจัดส่งภายหลัง";
  }

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return dateFormatter.format(parsedDate);
}

export default function SeriesVolumeSelector({
  volumes,
  onAddToCart,
  onCheckoutNow,
  isNovel = false,
}: SeriesVolumeSelectorProps) {
  const { user } = useAuth();
  const userCanShop = canShop(user?.role);
  const [selectedVolumeIds, setSelectedVolumeIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [waitlistFeedback, setWaitlistFeedback] = useState<{
    volumeId: number;
    message: string;
    isError: boolean;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const volumesPerPage = 9;
  const totalPages = Math.max(1, Math.ceil(volumes.length / volumesPerPage));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const visibleVolumes = useMemo(
    () =>
      volumes.slice(
        (validCurrentPage - 1) * volumesPerPage,
        validCurrentPage * volumesPerPage,
      ),
    [validCurrentPage, volumes],
  );

  const purchasableVolumes = useMemo(
    () =>
      volumes.filter(
        (volume) =>
          volume.status !== "OUT_OF_STOCK" && volume.stock > 0,
      ),
    [volumes],
  );
  const selectedVolumes = useMemo(
    () => purchasableVolumes.filter((volume) => selectedVolumeIds.has(volume.id)),
    [purchasableVolumes, selectedVolumeIds],
  );

  const selectedTotal = useMemo(
    () => selectedVolumes.reduce((total, volume) => total + volume.price, 0),
    [selectedVolumes],
  );

  const selectedWeightGrams = useMemo(
    () =>
      selectedVolumes.reduce(
        (total, volume) => total + (volume.weightGrams ?? 0),
        0,
      ),
    [selectedVolumes],
  );

  function toggleVolume(volumeId: number) {
    setSelectedVolumeIds((currentSelection) => {
      const nextSelection = new Set(currentSelection);
      if (nextSelection.has(volumeId)) {
        nextSelection.delete(volumeId);
      } else {
        nextSelection.add(volumeId);
      }
      return nextSelection;
    });
  }

  function selectAllInStock(): void {
    setSelectedVolumeIds(
      new Set(purchasableVolumes.map((volume) => volume.id)),
    );
  }

  function clearSelection(): void {
    setSelectedVolumeIds(new Set());
  }

  function addToWaitlist(volume: VolumeItem): void {
    setWaitlistFeedback(null);
    if (!user || user.role !== "CUSTOMER") {
      setWaitlistFeedback({
        volumeId: volume.id,
        message: "กรุณาเข้าสู่ระบบบัญชีลูกค้าเพื่อลงชื่อเข้าคิว",
        isError: true,
      });
      return;
    }
    try {
      const entry: MockWaitlistEntry = joinMockWaitlist({
        productId: `manga-${volume.id}`,
        productName: volume.title,
        customerName: user.fullName,
        customerEmail: user.email,
        userId: user.id,
      });
      setWaitlistFeedback({
        volumeId: volume.id,
        message: `ลงชื่อสำเร็จ ลำดับคิวที่ ${entry.queuePosition}`,
        isError: false,
      });
    } catch (error) {
      setWaitlistFeedback({
        volumeId: volume.id,
        message:
          error instanceof Error ? error.message : "ลงชื่อเข้าคิวไม่สำเร็จ",
        isError: true,
      });
    }
  }

  return (
    <section className="w-full" aria-labelledby="series-volumes-heading">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            id="series-volumes-heading"
            className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
          >
            เลือกเล่มที่ต้องการ
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            เลือกซื้อแยกเล่มหรือเลือกหลายเล่มพร้อมกันได้
          </p>
        </div>

      </div>
      {userCanShop ? (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={selectAllInStock}
            disabled={purchasableVolumes.length === 0}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-card-foreground transition hover:border-orange-300 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ListChecks size={16} aria-hidden="true" />
            เลือกทุกเล่มที่มีสินค้า
          </button>
          <button
            type="button"
            onClick={clearSelection}
            disabled={selectedVolumeIds.size === 0}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-card-foreground transition hover:border-slate-400 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={16} aria-hidden="true" />
            ล้างการเลือก
          </button>
        </div>
      ) : null}

      {volumes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
          <BookOpen className="mx-auto text-slate-400" size={32} aria-hidden="true" />
          <p className="mt-3 font-medium text-slate-700">ยังไม่มีข้อมูลเล่ม</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleVolumes.map((volume) => {
            const isOutOfStock =
              volume.status === "OUT_OF_STOCK" || volume.stock <= 0;
            const isPreorder = volume.status === "PREORDER";
            const isSelected = selectedVolumeIds.has(volume.id);

            return (
              <article
                key={volume.id}
                className={`relative flex min-w-0 gap-4 overflow-hidden rounded-2xl border border-border bg-card p-3 text-card-foreground shadow-sm transition sm:p-4 ${
                  isOutOfStock
                    ? "border-slate-200 opacity-55 grayscale"
                    : isSelected
                      ? "border-orange-400 ring-2 ring-orange-100"
                      : "border-slate-200 hover:border-orange-200 hover:shadow-md"
                }`}
              >
                {!isOutOfStock && userCanShop ? (
                  <label className="absolute left-3 top-3 z-10 flex h-6 w-6 cursor-pointer items-center justify-center rounded-md bg-card text-card-foreground shadow-sm ring-1 ring-border sm:left-4 sm:top-4">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleVolume(volume.id)}
                      className="h-4 w-4 cursor-pointer accent-orange-600"
                      aria-label={`เลือกมังงะเล่ม ${volume.volumeNumber}`}
                    />
                  </label>
                ) : null}

                <div className="w-24 shrink-0 sm:w-28">
                  <BookCoverImage
                    src={volume.coverUrl}
                    alt={`ปก ${volume.title}`}
                    title={volume.title}
                    volumeNumber={volume.volumeNumber}
                    isNovel={isNovel}
                    aspectRatio="2/3"
                  />
                </div>

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="mb-2 flex items-center gap-2 flex-wrap">
                    <span className="rounded bg-orange-100 px-2 py-0.5 text-[10px] font-extrabold text-orange-800 dark:bg-orange-950 dark:text-orange-300">
                      {isNovel ? "NOVEL" : "MANGA"}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                        isOutOfStock
                          ? "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-400"
                          : isPreorder
                            ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/80 dark:bg-emerald-950/60 dark:text-emerald-300"
                      }`}
                    >
                      {isOutOfStock
                        ? "สินค้าหมด"
                        : isPreorder
                          ? "Pre-order"
                          : "พร้อมส่ง"}
                    </span>
                    <span className="text-xs font-medium text-slate-500">
                      เล่มที่ {volume.volumeNumber}
                    </span>
                  </div>

                  <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-card-foreground sm:text-base">
                    {volume.title}
                  </h3>

                  {isPreorder ? (
                    <p className="mt-2 flex items-start gap-1.5 text-xs font-medium leading-5 text-amber-800 dark:text-amber-300">
                      <CalendarDays
                        size={15}
                        className="mt-0.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span>
                        จัดส่งประมาณ:{" "}
                        {formatExpectedShippingDate(volume.expectedShippingDate)}
                      </span>
                    </p>
                  ) : (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                      <PackageCheck size={15} aria-hidden="true" />
                      {isOutOfStock ? "รอสินค้าเข้าอีกครั้ง" : `คงเหลือ ${volume.stock} เล่ม`}
                    </p>
                  )}

                  <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-4">
                    <p className="font-bold text-foreground">
                      {currencyFormatter.format(volume.price)}
                    </p>
                    {userCanShop ? (
                      isOutOfStock ? (
                        <button
                          type="button"
                          onClick={() => addToWaitlist(volume)}
                          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-orange-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-orange-700"
                        >
                          <Bell size={14} aria-hidden="true" />
                          ลงชื่อเข้าคิวรับสิทธิ์
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onAddToCart(volume)}
                          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-orange-600 dark:hover:text-white"
                        >
                          <ShoppingCart size={15} aria-hidden="true" />
                          เพิ่มลงตะกร้า
                        </button>
                      )
                    ) : null}
                  </div>
                  {userCanShop && waitlistFeedback?.volumeId === volume.id ? (
                    <p
                      role={waitlistFeedback.isError ? "alert" : "status"}
                      className={`mt-2 text-xs font-semibold ${
                        waitlistFeedback.isError
                          ? "text-red-700 dark:text-red-400"
                          : "text-emerald-700 dark:text-emerald-400"
                      }`}
                    >
                      {waitlistFeedback.message}
                    </p>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {totalPages > 1 ? (
        <nav
          aria-label="แบ่งหน้ารายการเล่ม"
          className="mt-6 flex flex-wrap items-center justify-center gap-2"
        >
          <button
            type="button"
            onClick={() => setCurrentPage(validCurrentPage - 1)}
            disabled={validCurrentPage === 1}
            aria-label="หน้าก่อนหน้า"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-card-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
            <button
              key={page}
              type="button"
              onClick={() => setCurrentPage(page)}
              aria-label={`หน้า ${page}`}
              aria-current={validCurrentPage === page ? "page" : undefined}
              className={`h-10 min-w-10 rounded-lg border px-3 text-sm font-semibold ${
                validCurrentPage === page
                  ? "border-orange-600 bg-orange-600 text-white"
                  : "border-border bg-card text-card-foreground hover:border-orange-400"
              }`}
            >
              {page}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setCurrentPage(validCurrentPage + 1)}
            disabled={validCurrentPage === totalPages}
            aria-label="หน้าถัดไป"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-card-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </nav>
      ) : null}

      {userCanShop && selectedVolumes.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 text-card-foreground shadow-[0_-8px_30px_rgba(15,23,42,0.12)] backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground sm:text-base">
                เลือกแล้ว {selectedVolumes.length} เล่ม
              </p>
              <p className="text-sm font-bold text-orange-600 dark:text-orange-400">
                ยอดรวม {currencyFormatter.format(selectedTotal)}
              </p>
              <p className="text-xs text-muted-foreground">
                น้ำหนักรวม {selectedWeightGrams.toLocaleString("th-TH")} กรัม (
                {(selectedWeightGrams / 1_000).toFixed(2)} กก.)
              </p>
            </div>
            <button
              type="button"
              onClick={() => onCheckoutNow(selectedVolumes)}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 sm:px-6"
            >
              <ShoppingCart size={17} aria-hidden="true" />
              สั่งซื้อทันที
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

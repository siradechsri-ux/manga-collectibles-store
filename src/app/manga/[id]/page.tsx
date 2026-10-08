"use client";

import { AlertCircle, ArrowLeft, BookOpen, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import SeriesVolumeSelector, {
  VolumeItem,
} from "../../../components/SeriesVolumeSelector";
import { useCart } from "../../../context/CartContext";
import { CatalogMangaSeries, fetchCatalog } from "../../../lib/catalog-client";
import { ADMIN_PRODUCTS_UPDATED_EVENT } from "../../../mocks/admin-products.mock";

export default function MangaSeriesPage() {
  const params = useParams<{ id: string }>();
  const seriesId = Array.isArray(params.id) ? params.id[0] ?? "" : params.id;
  const router = useRouter();
  const { addItem } = useCart();
  const [series, setSeries] = useState<CatalogMangaSeries | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cartNotice, setCartNotice] = useState<string | null>(null);

  const loadSeries = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const catalog = await fetchCatalog();
      const selectedSeries = catalog.mangaSeries.find((item) => item.id === seriesId);
      if (!selectedSeries) {
        setSeries(null);
        setError("ไม่พบข้อมูลมังงะเรื่องนี้");
        return;
      }
      setSeries(selectedSeries);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "ไม่สามารถโหลดข้อมูลมังงะได้",
      );
    } finally {
      setLoading(false);
    }
  }, [seriesId]);

  useEffect(() => {
    void loadSeries();
    if (process.env.NEXT_PUBLIC_USE_MOCK !== "true") return;
    const refresh = (): void => {
      void loadSeries();
    };
    window.addEventListener(ADMIN_PRODUCTS_UPDATED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(ADMIN_PRODUCTS_UPDATED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [loadSeries]);

  function addVolume(volume: VolumeItem): void {
    try {
      addItem({
        kind: "MANGA",
        id: volume.id,
        title: series?.title ?? volume.title,
        volume: volume.volumeNumber,
        ...(volume.variantLabel ? { variantLabel: volume.variantLabel } : {}),
        price: volume.price,
        isPreorder: volume.status === "PREORDER",
        quantity: 1,
      });
      setCartNotice(`เพิ่ม ${volume.title} ลงตะกร้าแล้ว`);
    } catch (cartError) {
      setCartNotice(
        cartError instanceof Error ? cartError.message : "เพิ่มสินค้าลงตะกร้าไม่สำเร็จ",
      );
    }
  }

  function addSelectedVolumes(volumes: VolumeItem[]): void {
    try {
      for (const volume of volumes) {
        addItem({
          kind: "MANGA",
          id: volume.id,
          title: series?.title ?? volume.title,
          volume: volume.volumeNumber,
          ...(volume.variantLabel ? { variantLabel: volume.variantLabel } : {}),
          price: volume.price,
          isPreorder: volume.status === "PREORDER",
          quantity: 1,
        });
      }
      router.push("/checkout");
    } catch (cartError) {
      setCartNotice(
        cartError instanceof Error ? cartError.message : "เพิ่มสินค้าลงตะกร้าไม่สำเร็จ",
      );
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] px-4 py-7 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-orange-700"
        >
          <ArrowLeft size={17} aria-hidden="true" /> กลับไปหน้าร้าน
        </Link>

        {loading ? (
          <div className="mt-8 h-52 animate-pulse rounded-3xl bg-white" role="status">
            <span className="sr-only">กำลังโหลดข้อมูลมังงะ</span>
          </div>
        ) : error ? (
          <div className="mt-8 rounded-2xl border border-amber-200 bg-white p-8 text-center">
            <AlertCircle className="mx-auto text-amber-600" size={34} aria-hidden="true" />
            <h1 className="mt-3 text-lg font-bold text-slate-900">{error}</h1>
            <button
              type="button"
              onClick={() => void loadSeries()}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white"
            >
              <RefreshCw size={15} aria-hidden="true" /> โหลดอีกครั้ง
            </button>
          </div>
        ) : series ? (
          <>
            <section className="mt-6 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-violet-950 to-slate-950 p-6 text-white sm:p-10">
              <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-violet-100">
                    <BookOpen size={14} aria-hidden="true" /> มังงะ · {series.publisher}
                  </span>
                  <h1 className="mt-4 max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">
                    {series.title}
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                    เลือกเล่มที่ต้องการได้ทีละเล่มหรือเลือกหลายเล่มพร้อมกัน
                    สถานะสินค้าและราคาจะแสดงแยกตามแต่ละเล่ม
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                  <p className="text-xs text-slate-300">รายการเล่ม</p>
                  <p className="mt-1 text-2xl font-extrabold">{series.volumes.length} เล่ม</p>
                </div>
              </div>
            </section>

            {cartNotice ? (
              <div
                className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
                role="status"
              >
                <span>{cartNotice}</span>
                <Link href="/checkout" className="shrink-0 font-bold underline underline-offset-2">
                  ไปตะกร้า
                </Link>
              </div>
            ) : null}

            <div className="mt-8 pb-24">
              <SeriesVolumeSelector
                volumes={series.volumes}
                onAddToCart={addVolume}
                onCheckoutNow={addSelectedVolumes}
              />
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}

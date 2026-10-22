"use client";

import { AlertCircle, ArrowLeft, BookOpen, Flame, Heart, PackageSearch, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import SeriesVolumeSelector, {
  VolumeItem,
} from "../../../components/SeriesVolumeSelector";
import { useCart } from "../../../context/CartContext";
import { useAuth } from "../../../contexts/AuthContext";
import { useWishlist } from "../../../contexts/WishlistContext";
import { canShop } from "../../../utils/permissions";
import { CatalogMangaSeries } from "../../../lib/catalog-client";
import { ProductService } from "../../../services/product.service";
import { ADMIN_PRODUCTS_UPDATED_EVENT } from "../../../mocks/admin-products.mock";
import { getSafeCollectionReturnPath } from "../../../lib/collection-return";
import { getProductEffectiveBestSellerRank } from "../../../services/best-seller-settings.service";
import ProductReviews from "../../../components/ProductReviews";
import ProductBundleDeal from "../../../components/ProductBundleDeal";

export default function MangaSeriesPage() {
  const params = useParams<{ id: string }>();
  const seriesId = Array.isArray(params.id) ? params.id[0] ?? "" : params.id;
  const router = useRouter();
  const { addItem } = useCart();
  const { user } = useAuth();
  const userCanShop = canShop(user?.role);
  const { isInWishlist, toggleWishlist } = useWishlist();
  const [isNovel, setIsNovel] = useState(false);
  const [series, setSeries] = useState<CatalogMangaSeries | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cartNotice, setCartNotice] = useState<string | null>(null);
  const [returnPath, setReturnPath] = useState("/");

  const bestSellerInfo = series
    ? getProductEffectiveBestSellerRank(series.id, isNovel ? "LIGHT_NOVEL" : "MANGA")
    : null;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [params.id]);

  useEffect(() => {
    setReturnPath(
      getSafeCollectionReturnPath(
        new URLSearchParams(window.location.search).get("returnTo"),
      ),
    );
  }, []);

  const loadSeries = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const selectedSeries = await ProductService.getMangaSeriesById(seriesId);
      if (!selectedSeries) {
        // Cross-category check: was this a figure or collectible?
        const figure = await ProductService.getFigureById(seriesId);
        if (figure) {
          router.replace(`/figures/${encodeURIComponent(figure.slug || figure.id)}`);
          return;
        }
        setSeries(null);
        setError("ไม่พบข้อมูลสินค้าที่ระบุ");
        return;
      }
      const isLn = selectedSeries.category === "LIGHT_NOVEL";
      setIsNovel(isLn);
      setSeries(selectedSeries);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "ไม่สามารถโหลดข้อมูลหนังสือได้",
      );
    } finally {
      setLoading(false);
    }
  }, [seriesId, router]);

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
      const img = volume.coverUrl || series?.coverImage || series?.coverUrl || null;
      addItem({
        kind: isNovel ? "LIGHT_NOVEL" : "MANGA",
        id: volume.id,
        title: series?.title ?? volume.title,
        volume: volume.volumeNumber,
        ...(volume.variantLabel ? { variantLabel: volume.variantLabel } : {}),
        image: img,
        coverImage: img,
        imageUrl: img,
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

  function addMultipleVolumesToCart(volumes: VolumeItem[], discountRate = 0): void {
    try {
      for (const volume of volumes) {
        const img = volume.coverUrl || series?.coverImage || series?.coverUrl || null;
        const finalPrice =
          discountRate > 0
            ? Math.round(volume.price * (1 - discountRate))
            : volume.price;
        addItem({
          kind: isNovel ? "LIGHT_NOVEL" : "MANGA",
          id: volume.id,
          title: series?.title ?? volume.title,
          volume: volume.volumeNumber,
          ...(volume.variantLabel ? { variantLabel: volume.variantLabel } : {}),
          image: img,
          coverImage: img,
          imageUrl: img,
          price: finalPrice,
          isPreorder: volume.status === "PREORDER",
          quantity: 1,
        });
      }
      setCartNotice(
        `เพิ่ม ${volumes.length} เล่มลงตะกร้าแล้ว${
          discountRate > 0 ? ` (ส่วนลด ${Math.round(discountRate * 100)}%)` : ""
        }`,
      );
    } catch (cartError) {
      setCartNotice(
        cartError instanceof Error ? cartError.message : "เพิ่มสินค้าลงตะกร้าไม่สำเร็จ",
      );
    }
  }

  function addSelectedVolumes(volumes: VolumeItem[], discountRate = 0): void {
    try {
      for (const volume of volumes) {
        const img = volume.coverUrl || series?.coverImage || series?.coverUrl || null;
        const finalPrice =
          discountRate > 0
            ? Math.round(volume.price * (1 - discountRate))
            : volume.price;
        addItem({
          kind: isNovel ? "LIGHT_NOVEL" : "MANGA",
          id: volume.id,
          title: series?.title ?? volume.title,
          volume: volume.volumeNumber,
          ...(volume.variantLabel ? { variantLabel: volume.variantLabel } : {}),
          image: img,
          coverImage: img,
          imageUrl: img,
          price: finalPrice,
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
          href={returnPath}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-orange-700"
        >
          <ArrowLeft size={17} aria-hidden="true" />
          {returnPath.startsWith("/collections/") ? "กลับไปหน้าหมวดหมู่" : "กลับไปหน้าร้าน"}
        </Link>

        {loading ? (
          <div className="mt-8 h-52 animate-pulse rounded-3xl bg-white" role="status">
            <span className="sr-only">กำลังโหลดข้อมูลหนังสือ</span>
          </div>
        ) : error || !series ? (
          <div className="mt-8 flex min-h-[500px] flex-col items-center justify-center rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-zinc-100 text-zinc-500 shadow-inner dark:bg-zinc-800 dark:text-zinc-400">
              <PackageSearch size={44} aria-hidden="true" />
            </div>
            <h1 className="mt-5 text-xl font-black text-zinc-900 dark:text-zinc-100 sm:text-2xl">
              ไม่พบข้อมูลสินค้าที่ระบุ
            </h1>
            <p className="mt-2 max-w-md text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              ขออภัย ไม่พบหนังสือหรือมังงะที่คุณกำลังค้นหา รายการนี้อาจถูกย้าย สิ้นสุดการจำหน่าย หรือระบุรหัสสินค้าในลิงก์ไม่ถูกต้อง
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-orange-600 px-6 text-sm font-bold text-white shadow-xs transition hover:bg-orange-700 hover:shadow-md"
              >
                กลับสู่หน้าร้านค้า
              </Link>
            </div>
          </div>
        ) : series ? (
          <>
            <section className="mt-6 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-violet-950 to-slate-950 p-6 text-white sm:p-10">
              <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-violet-100">
                      <BookOpen size={14} aria-hidden="true" /> {isNovel ? "ไลท์โนเวล" : "มังงะ"} · {series.publisher}
                    </span>
                    {bestSellerInfo && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/50 bg-amber-500/25 px-3.5 py-1.5 text-xs font-black text-amber-200 backdrop-blur-xs shadow-xs">
                        <Flame size={13} className="text-amber-400" aria-hidden="true" />
                        <span>อันดับ #{bestSellerInfo.rank} ขายดี</span>
                        <span className="hidden sm:inline text-amber-300/80">· {bestSellerInfo.salesText}</span>
                      </span>
                    )}
                    {userCanShop ? (
                      <button
                        type="button"
                        onClick={() => {
                          const startingPrice = series.volumes.length
                            ? Math.min(...series.volumes.map((v) => v.price))
                            : 0;
                          toggleWishlist({
                            id: series.id,
                            itemType: isNovel ? "LIGHT_NOVEL" : "MANGA",
                            title: series.title,
                            price: startingPrice,
                            imageUrl:
                              series.coverUrl ||
                              series.coverImage ||
                              series.images?.[0] ||
                              series.volumes[0]?.coverUrl ||
                              null,
                            url: `/manga/${encodeURIComponent(series.id)}`,
                            category: series.category,
                            isPreorder: series.volumes.some((v) => v.status === "PREORDER"),
                          });
                        }}
                        aria-label={
                          isInWishlist(series.id, isNovel ? "LIGHT_NOVEL" : "MANGA")
                            ? "นำออกจากรายการที่ถูกใจ"
                            : "เพิ่มในรายการที่ถูกใจ"
                        }
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
                      >
                        <Heart
                          size={14}
                          className={
                            isInWishlist(series.id, isNovel ? "LIGHT_NOVEL" : "MANGA")
                              ? "fill-red-500 text-red-500"
                              : ""
                          }
                          aria-hidden="true"
                        />
                        <span>
                          {isInWishlist(series.id, isNovel ? "LIGHT_NOVEL" : "MANGA")
                            ? "บันทึกแล้ว"
                            : "สิ่งที่ชอบ"}
                        </span>
                      </button>
                    ) : null}
                  </div>
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

            <div className="mt-8">
              <SeriesVolumeSelector
                volumes={series.volumes}
                onAddToCart={addVolume}
                onAddMultipleToCart={addMultipleVolumesToCart}
                onCheckoutNow={addSelectedVolumes}
                isNovel={isNovel}
              />
            </div>

            <div className="mt-12">
              <ProductBundleDeal
                mainProduct={{
                  id: series.volumes[0]?.id || 1001,
                  kind: isNovel ? "LIGHT_NOVEL" : "MANGA",
                  title: `${series.title} เล่ม 1`,
                  price: series.volumes[0]?.price || 95,
                  imageUrl:
                    series.volumes[0]?.coverUrl ||
                    series.coverImage ||
                    series.coverUrl ||
                    "/images/products/jjk-v1.jpg",
                }}
                companionItems={[
                  {
                    id: series.volumes[1]?.id || 1002,
                    kind: isNovel ? "LIGHT_NOVEL" : "MANGA",
                    title: `${series.title} เล่ม 2`,
                    price: series.volumes[1]?.price || 95,
                    imageUrl:
                      series.volumes[1]?.coverUrl ||
                      series.coverImage ||
                      "/images/products/jjk-v1.jpg",
                  },
                  {
                    id: 8001,
                    kind: "ACCESSORY",
                    title: "ซองใสถนอมหนังสือมังงะ OPP หนาพิเศษ (Pack 10 แผ่น)",
                    price: 40,
                    imageUrl: "/images/rewards/reward-manga-sleeves.jpg",
                  },
                ]}
                discountPercent={8}
              />
            </div>

            <div className="mt-12 pb-24">
              <ProductReviews
                targetId={series.id}
                targetType={isNovel ? "LIGHT_NOVEL" : "MANGA"}
                targetTitle={series.title}
              />
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}

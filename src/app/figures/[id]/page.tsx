"use client";

import { AlertCircle, ArrowLeft, Bell, PackageSearch, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import FigureDetailCard, {
  FigurePurchaseRequest,
} from "../../../components/FigureDetailCard";
import { CartItem, useCart } from "../../../context/CartContext";
import { CatalogFigure } from "../../../lib/catalog-client";
import { ProductService } from "../../../services/product.service";
import { ADMIN_PRODUCTS_UPDATED_EVENT } from "../../../mocks/admin-products.mock";
import { getSafeCollectionReturnPath } from "../../../lib/collection-return";
import ProductReviews from "../../../components/ProductReviews";
import ProductBundleDeal from "../../../components/ProductBundleDeal";

export default function FigureProductPage() {
  const params = useParams<{ id: string }>();
  const slug = Array.isArray(params.id) ? params.id[0] ?? "" : params.id;
  const router = useRouter();
  const { addItem } = useCart();
  const [figure, setFigure] = useState<CatalogFigure | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [returnPath, setReturnPath] = useState("/");

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

  const loadFigure = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const selectedFigure = await ProductService.getFigureById(slug);
      if (!selectedFigure) {
        // Cross-category check: was this a manga series slug/ID?
        const manga = await ProductService.getMangaSeriesById(slug);
        if (manga) {
          router.replace(`/manga/${encodeURIComponent(manga.id)}`);
          return;
        }
        setFigure(null);
        setError("ไม่พบข้อมูลสินค้าที่ระบุ");
        return;
      }
      setFigure(selectedFigure);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "ไม่สามารถโหลดข้อมูลสินค้าได้",
      );
    } finally {
      setLoading(false);
    }
  }, [slug, router]);

  useEffect(() => {
    void loadFigure();
    if (process.env.NEXT_PUBLIC_USE_MOCK !== "true") return;
    const refresh = (): void => {
      void loadFigure();
    };
    window.addEventListener(ADMIN_PRODUCTS_UPDATED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(ADMIN_PRODUCTS_UPDATED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [loadFigure]);

  function makeCartItem(request: FigurePurchaseRequest): CartItem {
    const variantId = Number(request.product.id);
    if (!Number.isSafeInteger(variantId) || variantId <= 0) {
      throw new Error("รหัสสินค้าไม่ถูกต้อง ไม่สามารถเพิ่มลงตะกร้าได้");
    }
    const cat = figure?.category;
    const img = request.product.images?.[0] || figure?.images?.[0] || null;
    if (cat === "PLAMO" && figure) {
      return {
        kind: "PLAMO",
        id: variantId,
        name: request.product.name,
        image: img,
        coverImage: img,
        imageUrl: img,
        fullPrice: request.product.fullPrice,
        depositAmount: request.product.depositAmount,
        selectedPaymentType: request.paymentOption,
        quantity: request.quantity,
        boxDimensions: request.product.boxDimensions,
        grade: figure.grade,
      };
    }
    if (cat === "GOODS" && figure) {
      return {
        kind: "GOODS",
        id: variantId,
        name: request.product.name,
        image: img,
        coverImage: img,
        imageUrl: img,
        fullPrice: request.product.fullPrice,
        quantity: request.quantity,
        subcategory: figure.subcategory,
      };
    }
    if (cat === "ACCESSORY" && figure) {
      return {
        kind: "ACCESSORY",
        id: variantId,
        name: request.product.name,
        image: img,
        coverImage: img,
        imageUrl: img,
        fullPrice: request.product.fullPrice,
        quantity: request.quantity,
        subcategory: figure.subcategory,
        boxDimensions: request.product.boxDimensions,
      };
    }
    return {
      kind: "FIGURE",
      id: variantId,
      name: request.product.name,
      image: img,
      coverImage: img,
      imageUrl: img,
      fullPrice: request.product.fullPrice,
      depositAmount: request.product.depositAmount,
      selectedPaymentType: request.paymentOption,
      quantity: request.quantity,
      boxDimensions: request.product.boxDimensions,
    };
  }

  function addFigureToCart(request: FigurePurchaseRequest): void {
    try {
      addItem(makeCartItem(request));
      setNotice(`เพิ่ม ${request.product.name} ลงตะกร้าแล้ว`);
    } catch (cartError) {
      setNotice(
        cartError instanceof Error ? cartError.message : "เพิ่มสินค้าลงตะกร้าไม่สำเร็จ",
      );
    }
  }

  function preorderFigure(request: FigurePurchaseRequest): void {
    try {
      addItem(makeCartItem(request));
      router.push("/checkout");
    } catch (cartError) {
      setNotice(
        cartError instanceof Error ? cartError.message : "ไม่สามารถเตรียมรายการสั่งจองได้",
      );
    }
  }

  function notifyWhenAvailable(): void {
    setNotice("ระบบแจ้งเตือนสินค้าหลุดจองจะพร้อมใช้งานเมื่อเข้าสู่ระบบ");
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
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="aspect-square animate-pulse rounded-3xl bg-white" role="status">
              <span className="sr-only">กำลังโหลดข้อมูลสินค้า</span>
            </div>
            <div className="h-[34rem] animate-pulse rounded-3xl bg-white" />
          </div>
        ) : error || !figure ? (
          <div className="mt-8 flex min-h-[500px] flex-col items-center justify-center rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-zinc-100 text-zinc-500 shadow-inner dark:bg-zinc-800 dark:text-zinc-400">
              <PackageSearch size={44} aria-hidden="true" />
            </div>
            <h1 className="mt-5 text-xl font-black text-zinc-900 dark:text-zinc-100 sm:text-2xl">
              ไม่พบข้อมูลสินค้าที่ระบุ
            </h1>
            <p className="mt-2 max-w-md text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              ขออภัย ไม่พบสินค้าหรือของสะสมที่คุณกำลังค้นหา รายการนี้อาจถูกย้าย สิ้นสุดระยะเวลาจอง หรือระบุรหัสสินค้าในลิงก์ไม่ถูกต้อง
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
        ) : figure ? (
          <>
            {notice ? (
              <div
                className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
                role="status"
              >
                <span className="flex items-center gap-2">
                  {figure.status === "PREORDER_CLOSED" ? (
                    <Bell size={16} aria-hidden="true" />
                  ) : null}
                  {notice}
                </span>
                <Link href="/checkout" className="shrink-0 font-bold underline underline-offset-2">
                  ไปตะกร้า
                </Link>
              </div>
            ) : null}
            <div className="mt-6">
              <FigureDetailCard
                product={figure}
                onPreorder={preorderFigure}
                onAddToCart={addFigureToCart}
                onNotifyWhenAvailable={notifyWhenAvailable}
              />
            </div>

            <div className="mt-12">
              <ProductBundleDeal
                mainProduct={{
                  id: Number(figure.id) || 2001,
                  kind: figure.category === "PLAMO" ? "PLAMO" : figure.category === "GOODS" ? "GOODS" : "FIGURE",
                  title: figure.name,
                  price: figure.fullPrice,
                  imageUrl: figure.coverImage || figure.images?.[0] || "/images/products/figure-2001.jpg",
                }}
                companionItems={[
                  {
                    id: 8003,
                    kind: "ACCESSORY",
                    title: "กล่องอะคริลิกใสโชว์โมเดลกันฝุ่น (ขนาด 20x20x30 ซม.)",
                    price: 390,
                    imageUrl: "/images/products/acc-8003.jpg",
                  },
                  {
                    id: 8005,
                    kind: "ACCESSORY",
                    title: "แปรงปัดฝุ่นโมเดลไมโครไฟเบอร์นุ่มพิเศษ ถนอมผิวสี",
                    price: 120,
                    imageUrl: "/images/products/acc-8005.jpg",
                  },
                ]}
                discountPercent={10}
              />
            </div>

            <div className="mt-12 pb-24">
              <ProductReviews
                targetId={figure.id}
                targetType={figure.category === "PLAMO" ? "PLAMO" : figure.category === "GOODS" ? "GOODS" : "FIGURE"}
                targetTitle={figure.name}
              />
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}

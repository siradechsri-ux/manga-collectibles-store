"use client";

import { AlertCircle, ArrowLeft, Bell, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import FigureDetailCard, {
  FigurePurchaseRequest,
} from "../../../components/FigureDetailCard";
import { FigureCartItem, useCart } from "../../../context/CartContext";
import { CatalogFigure, fetchCatalog } from "../../../lib/catalog-client";
import { ADMIN_PRODUCTS_UPDATED_EVENT } from "../../../mocks/admin-products.mock";

export default function FigureProductPage() {
  const params = useParams<{ id: string }>();
  const slug = Array.isArray(params.id) ? params.id[0] ?? "" : params.id;
  const router = useRouter();
  const { addItem } = useCart();
  const [figure, setFigure] = useState<CatalogFigure | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadFigure = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const catalog = await fetchCatalog();
      const selectedFigure = catalog.figures.find((item) => item.slug === slug);
      if (!selectedFigure) {
        setFigure(null);
        setError("ไม่พบข้อมูลสินค้า Figure นี้");
        return;
      }
      setFigure(selectedFigure);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "ไม่สามารถโหลดข้อมูล Figure ได้",
      );
    } finally {
      setLoading(false);
    }
  }, [slug]);

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

  function makeCartItem(request: FigurePurchaseRequest): FigureCartItem {
    const variantId = Number(request.product.id);
    if (!Number.isSafeInteger(variantId) || variantId <= 0) {
      throw new Error("รหัสสินค้าไม่ถูกต้อง ไม่สามารถเพิ่มลงตะกร้าได้");
    }
    return {
      kind: "FIGURE",
      id: variantId,
      name: request.product.name,
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
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-orange-700"
        >
          <ArrowLeft size={17} aria-hidden="true" /> กลับไปหน้าร้าน
        </Link>

        {loading ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="aspect-square animate-pulse rounded-3xl bg-white" role="status">
              <span className="sr-only">กำลังโหลดข้อมูลสินค้า</span>
            </div>
            <div className="h-[34rem] animate-pulse rounded-3xl bg-white" />
          </div>
        ) : error ? (
          <div className="mt-8 rounded-2xl border border-amber-200 bg-white p-8 text-center">
            <AlertCircle className="mx-auto text-amber-600" size={34} aria-hidden="true" />
            <h1 className="mt-3 text-lg font-bold text-slate-900">{error}</h1>
            <button
              type="button"
              onClick={() => void loadFigure()}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white"
            >
              <RefreshCw size={15} aria-hidden="true" /> โหลดอีกครั้ง
            </button>
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
          </>
        ) : null}
      </div>
    </main>
  );
}

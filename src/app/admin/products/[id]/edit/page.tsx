"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import ProductEditorForm from "../../../../../components/admin/ProductEditorForm";
import { useAuth } from "../../../../../contexts/AuthContext";
import {
  getAdminProduct,
  type AdminProduct,
} from "../../../../../mocks/admin-products.mock";

export default function EditAdminProductPage() {
  const params = useParams<{ id: string }>();
  const { user, isLoading } = useAuth();
  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || user?.role !== "ADMIN") return;
    try {
      const productId = decodeURIComponent(params.id);
      setProduct(getAdminProduct(productId));
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "โหลดข้อมูลสินค้าไม่สำเร็จ",
      );
    } finally {
      setLoaded(true);
    }
  }, [isLoading, params.id, user?.role]);

  if (!isLoading && user?.role !== "ADMIN") {
    return <ProductEditorForm initialProduct={null} pageTitle="แก้ไขสินค้า" />;
  }
  if (isLoading || !loaded) {
    return <main className="flex min-h-[60vh] items-center justify-center px-4"><p role="status" className="text-sm text-zinc-500">กำลังโหลดข้อมูลสินค้า...</p></main>;
  }
  if (error || !product) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
        <AlertTriangle size={32} className="text-amber-600" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-bold">ไม่พบข้อมูลสินค้า</h1>
        <p role="alert" className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{error ?? "สินค้าอาจถูกลบไปแล้ว"}</p>
        <Link href="/admin/products" className="mt-5 rounded-xl bg-zinc-950 px-5 py-3 text-sm font-bold text-white dark:bg-zinc-100 dark:text-zinc-950">กลับรายการสินค้า</Link>
      </main>
    );
  }

  return <ProductEditorForm initialProduct={product} pageTitle="แก้ไขสินค้า" />;
}

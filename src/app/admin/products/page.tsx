"use client";

import {
  AlertTriangle,
  BookOpen,
  Boxes,
  CirclePlus,
  Edit3,
  Package,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import {
  adjustAdminProductStock,
  deleteAdminProduct,
  listAdminProducts,
  subscribeToAdminProducts,
  type AdminProduct,
  type ProductCategoryFilter,
  type ProductStatusFilter,
} from "../../../mocks/admin-products.mock";
import { resetMockCommerceData } from "../../../mocks/storage.mock";

function productName(product: AdminProduct): string {
  return product.type === "MANGA"
    ? `${product.title} · เล่ม ${product.volumeNumber}${product.variantLabel ? ` (${product.variantLabel})` : ""}`
    : product.name;
}

function productStock(product: AdminProduct): number {
  return product.type === "MANGA"
    ? product.stock
    : product.stockOrQuotaRemaining;
}

function productStatus(
  product: AdminProduct,
): Exclude<ProductStatusFilter, "ALL"> {
  if (product.type === "MANGA") {
    if (product.status === "OUT_OF_STOCK" || product.stock === 0) {
      return "OUT_OF_STOCK";
    }
    return product.status;
  }
  if (product.stockOrQuotaRemaining === 0 || product.status === "PREORDER_CLOSED") {
    return "OUT_OF_STOCK";
  }
  return product.status === "PREORDER_OPEN" ? "PREORDER" : "IN_STOCK";
}

function productPrice(product: AdminProduct): number {
  return product.type === "MANGA" ? product.price : product.fullPrice;
}

function productCode(product: AdminProduct): string {
  return product.type === "MANGA"
    ? product.isbn || product.id
    : product.id.replace(/^figure-/, "").toUpperCase();
}

function statusLabel(status: ProductStatusFilter): string {
  if (status === "ALL") return "ทุกสถานะ";
  if (status === "IN_STOCK") return "พร้อมส่ง";
  if (status === "PREORDER") return "เปิดพรีออเดอร์";
  return "สินค้าหมด";
}

export default function AdminProductsPage() {
  const { user, isLoading } = useAuth();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ProductCategoryFilter>("ALL");
  const [status, setStatus] = useState<ProductStatusFilter>("ALL");
  const [error, setError] = useState<string | null>(null);
  const [stockTarget, setStockTarget] = useState<AdminProduct | null>(null);
  const [stockDirection, setStockDirection] = useState<"ADD" | "REMOVE">("ADD");
  const [stockQuantity, setStockQuantity] = useState("1");
  const [deleteTarget, setDeleteTarget] = useState<AdminProduct | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const refreshProducts = useCallback((): void => {
    try {
      setProducts(listAdminProducts());
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "โหลดรายการสินค้าไม่สำเร็จ",
      );
    }
  }, []);

  useEffect(() => {
    if (user?.role !== "ADMIN") return;
    refreshProducts();
    return subscribeToAdminProducts(refreshProducts);
  }, [refreshProducts, user?.role]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return products.filter((product) => {
      if (category !== "ALL" && product.type !== category) return false;
      if (status !== "ALL" && productStatus(product) !== status) return false;
      if (!normalizedQuery) return true;
      const searchable =
        product.type === "MANGA"
          ? `${product.title} ${product.publisher} ${product.isbn} ${product.volumeNumber} ${product.id}`
          : `${product.name} ${product.series} ${product.manufacturer} ${product.janCode} ${product.id}`;
      return searchable.toLocaleLowerCase().includes(normalizedQuery);
    });
  }, [category, products, query, status]);

  if (isLoading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4">
        <p role="status" className="text-sm text-zinc-500">กำลังตรวจสอบสิทธิ์ผู้ดูแลระบบ...</p>
      </main>
    );
  }

  if (user?.role !== "ADMIN") {
    return (
      <main className="mx-auto flex min-h-[65vh] max-w-xl flex-col items-center justify-center px-5 text-center">
        <AlertTriangle size={36} className="text-red-600" aria-hidden="true" />
        <p className="mt-4 text-sm font-bold uppercase tracking-wider text-red-700">HTTP 403 · Admin Only</p>
        <h1 className="mt-2 text-2xl font-extrabold text-zinc-950 dark:text-zinc-100">ไม่มีสิทธิ์จัดการสินค้า</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">หน้านี้อนุญาตเฉพาะผู้ดูแลระบบ</p>
        <Link href="/" className="mt-5 rounded-xl bg-zinc-950 px-5 py-3 text-sm font-bold text-white dark:bg-zinc-100 dark:text-zinc-950">กลับหน้าร้าน</Link>
      </main>
    );
  }

  const lowStockCount = products.filter(
    (product) => productStock(product) > 0 && productStock(product) < 5,
  ).length;
  const preorderCount = products.filter(
    (product) => productStatus(product) === "PREORDER",
  ).length;

  function commitStockAdjustment(): void {
    if (!stockTarget) return;
    const quantity = Number(stockQuantity);
    try {
      adjustAdminProductStock(stockTarget.id, stockDirection, quantity);
      refreshProducts();
      setStockTarget(null);
      setStockQuantity("1");
    } catch (adjustError) {
      setError(
        adjustError instanceof Error ? adjustError.message : "ปรับสต็อกไม่สำเร็จ",
      );
    }
  }

  function commitDelete(): void {
    if (!deleteTarget) return;
    try {
      deleteAdminProduct(deleteTarget.id);
      refreshProducts();
      setDeleteTarget(null);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "ลบสินค้าไม่สำเร็จ",
      );
    }
  }

  function commitReset(): void {
    setError(null);
    try {
      resetMockCommerceData();
      window.location.reload();
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : "คืนค่าข้อมูล Mock ไม่สำเร็จ",
      );
      setResetConfirmOpen(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-700 dark:text-orange-300">Admin · Inventory</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight">สินค้าและสต็อก</h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">จัดการข้อมูลสินค้า หน้าร้าน และจำนวนคงเหลือ</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={() => setResetConfirmOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-50 dark:border-red-900 dark:bg-zinc-900 dark:text-red-300 dark:hover:bg-red-950/40">
              <Trash2 size={16} aria-hidden="true" /> คืนค่าข้อมูลเริ่มต้น
            </button>
            <Link href="/admin/products/new" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-orange-700">
              <CirclePlus size={17} aria-hidden="true" /> เพิ่มสินค้าใหม่
            </Link>
          </div>
        </header>

        {error ? <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{error}</p> : null}

        <section aria-label="สรุปสินค้า" className="mt-6 grid gap-4 sm:grid-cols-3">
          <MetricCard icon={<Boxes size={19} />} label="รายการสินค้าทั้งหมด" value={products.length} />
          <MetricCard icon={<AlertTriangle size={19} />} label="รายการสต็อกต่ำ" value={lowStockCount} accent="orange" />
          <MetricCard icon={<Package size={19} />} label="รายการเปิดพรีออเดอร์" value={preorderCount} accent="violet" />
        </section>

        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">ค้นหาสินค้า</span>
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาชื่อสินค้า เรื่อง ISBN หรือรหัสสินค้า" className="h-11 w-full rounded-xl border border-zinc-300 bg-white pl-10 pr-3 text-sm text-zinc-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-orange-950" />
            </label>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <select value={category} onChange={(event) => setCategory(event.target.value as ProductCategoryFilter)} aria-label="กรองตามประเภทสินค้า" className="h-11 rounded-xl border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950">
                <option value="ALL">ทุกประเภท</option>
                <option value="MANGA">มังงะ</option>
                <option value="FIGURE">ฟิกเกอร์ / ของสะสม</option>
              </select>
              <select value={status} onChange={(event) => setStatus(event.target.value as ProductStatusFilter)} aria-label="กรองตามสถานะสินค้า" className="h-11 rounded-xl border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950">
                <option value="ALL">ทุกสถานะ</option>
                <option value="IN_STOCK">พร้อมส่ง</option>
                <option value="PREORDER">เปิดพรีออเดอร์</option>
                <option value="OUT_OF_STOCK">สินค้าหมด</option>
              </select>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full min-w-[950px] border-collapse text-left text-sm">
              <thead className="bg-zinc-50 text-xs font-bold uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                <tr>
                  <th className="px-4 py-3">รหัสสินค้า</th>
                  <th className="px-4 py-3">ตัวอย่าง</th>
                  <th className="px-4 py-3">ชื่อสินค้า / เรื่อง</th>
                  <th className="px-4 py-3">ประเภท</th>
                  <th className="px-4 py-3 text-right">ราคา</th>
                  <th className="px-4 py-3 text-right">สต็อกคงเหลือ</th>
                  <th className="px-4 py-3">สถานะ</th>
                  <th className="px-4 py-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredProducts.map((product) => {
                  const state = productStatus(product);
                  const editUrl = `/admin/products/${encodeURIComponent(product.id)}/edit`;
                  return (
                    <tr key={product.id} className="align-middle hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40">
                      <td className="px-4 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">{productCode(product)}</td>
                      <td className="px-4 py-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
                          {product.type === "MANGA" ? <BookOpen size={18} /> : <Package size={18} />}
                        </span>
                      </td>
                      <td className="max-w-72 px-4 py-3">
                        <p className="line-clamp-2 font-semibold text-zinc-900 dark:text-zinc-100">{productName(product)}</p>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{product.type === "MANGA" ? product.publisher : `${product.series} · ${product.manufacturer}`}</p>
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{product.type === "MANGA" ? "มังงะ" : "ฟิกเกอร์"}</td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">{productPrice(product).toLocaleString("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 })}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <span className="font-semibold">{productStock(product)}</span>
                        {productStock(product) === 0 ? <span className="ml-2 rounded-full bg-red-100 px-2 py-1 text-[10px] font-bold text-red-800 dark:bg-red-950 dark:text-red-200">สินค้าหมด</span> : productStock(product) < 5 ? <span className="ml-2 rounded-full bg-orange-100 px-2 py-1 text-[10px] font-bold text-orange-800 dark:bg-orange-950 dark:text-orange-200">สต็อกต่ำ</span> : null}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={state} /></td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Link href={editUrl} aria-label={`แก้ไข ${productName(product)}`} title="แก้ไขสินค้า" className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 hover:text-orange-700 dark:text-zinc-300 dark:hover:bg-zinc-800"><Edit3 size={16} /></Link>
                          <button type="button" aria-label={`ปรับสต็อก ${productName(product)}`} title="ปรับสต็อก" onClick={() => { setStockTarget(product); setStockDirection("ADD"); setStockQuantity("1"); }} className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 hover:text-blue-700 dark:text-zinc-300 dark:hover:bg-zinc-800"><Package size={16} /></button>
                          <button type="button" aria-label={`ลบ ${productName(product)}`} title="ลบสินค้า" onClick={() => setDeleteTarget(product)} className="rounded-lg p-2 text-zinc-600 hover:bg-red-50 hover:text-red-700 dark:text-zinc-300 dark:hover:bg-red-950/40 dark:hover:text-red-300"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredProducts.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">ไม่พบสินค้าที่ตรงกับเงื่อนไข</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">แสดง {filteredProducts.length} จาก {products.length} รายการ</p>
        </section>
      </div>

      {stockTarget ? (
        <Dialog title="ปรับสต็อกสินค้า" onClose={() => setStockTarget(null)}>
          <p className="mb-4 text-sm font-semibold text-zinc-800 dark:text-zinc-200">{productName(stockTarget)}</p>
          <label className="mb-4 block text-sm font-medium">
            รายการปรับสต็อก
            <select value={stockDirection} onChange={(event) => setStockDirection(event.target.value as "ADD" | "REMOVE")} className="mt-1.5 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950">
              <option value="ADD">เพิ่มเข้าสต็อก</option>
              <option value="REMOVE">ตัดสต็อกออก</option>
            </select>
          </label>
          <label className="block text-sm font-medium">
            จำนวน
            <input type="number" min="1" step="1" value={stockQuantity} onChange={(event) => setStockQuantity(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950" />
          </label>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={() => setStockTarget(null)} className="min-h-10 rounded-lg border border-zinc-300 px-4 text-sm font-semibold dark:border-zinc-700">ยกเลิก</button>
            <button type="button" onClick={commitStockAdjustment} className="min-h-10 rounded-lg bg-orange-600 px-4 text-sm font-bold text-white hover:bg-orange-700">บันทึกการปรับ</button>
          </div>
        </Dialog>
      ) : null}

      {deleteTarget ? (
        <Dialog title="ยืนยันการลบสินค้า" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?</p>
          <p className="mt-2 font-semibold text-zinc-900 dark:text-zinc-100">{productName(deleteTarget)}</p>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={() => setDeleteTarget(null)} className="min-h-10 rounded-lg border border-zinc-300 px-4 text-sm font-semibold dark:border-zinc-700">ยกเลิก</button>
            <button type="button" onClick={commitDelete} className="min-h-10 rounded-lg bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-700">ลบสินค้า</button>
          </div>
        </Dialog>
      ) : null}
      {resetConfirmOpen ? (
        <Dialog title="ยืนยันการคืนค่าข้อมูลเริ่มต้น" onClose={() => setResetConfirmOpen(false)}>
          <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            การดำเนินการนี้จะลบสินค้าและคำสั่งซื้อที่สร้างระหว่างทดสอบ พร้อมล้างตะกร้าและคิว Waitlist แล้วคืนค่าข้อมูลตัวอย่างเริ่มต้น ไม่สามารถยกเลิกได้
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={() => setResetConfirmOpen(false)} className="min-h-10 rounded-lg border border-zinc-300 px-4 text-sm font-semibold dark:border-zinc-700">ยกเลิก</button>
            <button type="button" onClick={commitReset} className="min-h-10 rounded-lg bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-700">คืนค่าข้อมูลเริ่มต้น</button>
          </div>
        </Dialog>
      ) : null}
    </main>
  );
}

function MetricCard({
  icon,
  label,
  value,
  accent = "zinc",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: "zinc" | "orange" | "violet";
}) {
  const styles = {
    zinc: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
    orange: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
    violet: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
  }[accent];
  return (
    <article className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${styles}`} aria-hidden="true">{icon}</span>
      <div><p className="text-sm text-zinc-600 dark:text-zinc-400">{label}</p><p className="mt-0.5 text-2xl font-extrabold tabular-nums">{value}</p></div>
    </article>
  );
}

function StatusBadge({ status }: { status: Exclude<ProductStatusFilter, "ALL"> }) {
  const config = {
    IN_STOCK: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/80 dark:bg-emerald-950/60 dark:text-emerald-300",
    PREORDER: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
    OUT_OF_STOCK: "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-400",
  }[status];
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${config}`}>{statusLabel(status)}</span>;
}

function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="product-dialog-title" className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 id="product-dialog-title" className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="ปิดหน้าต่าง" className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X size={17} /></button>
        </div>
        {children}
      </section>
    </div>
  );
}

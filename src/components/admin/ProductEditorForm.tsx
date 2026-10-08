"use client";

import { AlertTriangle, ArrowLeft, BookOpen, Package, Save, X } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  saveAdminProduct,
  type AdminProduct,
  type AdminProductInput,
} from "../../mocks/admin-products.mock";

type ProductKind = "MANGA" | "FIGURE";

interface ProductDraft {
  title: string;
  publisher: string;
  seriesId: string;
  volumeNumber: string;
  isbn: string;
  synopsis: string;
  coverStyle: "STANDARD" | "LIMITED_SET";
  price: string;
  stock: string;
  mangaPreorder: boolean;
  preorderDeadline: string;
  expectedShippingDate: string;
  weightGrams: string;
  images: string[];
  name: string;
  slug: string;
  series: string;
  character: string;
  manufacturer: string;
  scale: string;
  description: string;
  fullPrice: string;
  depositAmount: string;
  figurePreorder: boolean;
  releaseMonthYear: string;
  widthCm: string;
  lengthCm: string;
  heightCm: string;
  heightMm: string;
  janCode: string;
}

const EMPTY_DRAFT: ProductDraft = {
  title: "",
  publisher: "",
  seriesId: "",
  volumeNumber: "1",
  isbn: "",
  synopsis: "",
  coverStyle: "STANDARD",
  price: "",
  stock: "0",
  mangaPreorder: false,
  preorderDeadline: "",
  expectedShippingDate: "",
  weightGrams: "250",
  images: [],
  name: "",
  slug: "",
  series: "",
  character: "",
  manufacturer: "",
  scale: "Non-scale",
  description: "",
  fullPrice: "",
  depositAmount: "0",
  figurePreorder: false,
  releaseMonthYear: "",
  widthCm: "10",
  lengthCm: "10",
  heightCm: "10",
  heightMm: "100",
  janCode: "",
};

function draftFromProduct(product: AdminProduct): ProductDraft {
  if (product.type === "MANGA") {
    return {
      ...EMPTY_DRAFT,
      title: product.title,
      publisher: product.publisher,
      seriesId: product.seriesId,
      volumeNumber: String(product.volumeNumber),
      isbn: product.isbn,
      synopsis: product.synopsis,
      coverStyle: product.coverStyle,
      price: String(product.price),
      stock: String(product.stock),
      mangaPreorder: product.status === "PREORDER",
      preorderDeadline: product.preorderDeadline.slice(0, 10),
      expectedShippingDate: product.expectedShippingDate.slice(0, 10),
      weightGrams: String(product.weightGrams),
      images: [...product.images],
    };
  }
  return {
    ...EMPTY_DRAFT,
    name: product.name,
    slug: product.slug,
    series: product.series,
    character: product.character,
    manufacturer: product.manufacturer,
    scale: product.scale,
    description: product.description,
    fullPrice: String(product.fullPrice),
    depositAmount: String(product.depositAmount),
    figurePreorder: product.status === "PREORDER_OPEN",
    stock: String(product.stockOrQuotaRemaining),
    preorderDeadline: product.preorderDeadline.slice(0, 10),
    releaseMonthYear: product.releaseMonthYear,
    widthCm: String(product.boxDimensions.widthCm),
    lengthCm: String(product.boxDimensions.lengthCm),
    heightCm: String(product.boxDimensions.heightCm),
    weightGrams: String(product.weightGrams),
    heightMm: String(product.heightMm),
    janCode: product.janCode,
    images: [...product.images],
  };
}

function numeric(value: string): number {
  return value.trim() === "" ? Number.NaN : Number(value);
}

function slugify(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[^\wก-๙]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function ProductEditorForm({
  initialProduct,
  pageTitle,
}: {
  initialProduct: AdminProduct | null;
  pageTitle: string;
}) {
  const { user, isLoading } = useAuth();
  const [kind, setKind] = useState<ProductKind>(initialProduct?.type ?? "MANGA");
  const [draft, setDraft] = useState<ProductDraft>(
    initialProduct ? draftFromProduct(initialProduct) : EMPTY_DRAFT,
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!initialProduct) return;
    setKind(initialProduct.type);
    setDraft(draftFromProduct(initialProduct));
  }, [initialProduct]);

  if (isLoading) {
    return <PageMessage text="กำลังตรวจสอบสิทธิ์ผู้ดูแลระบบ..." />;
  }
  if (user?.role !== "ADMIN") {
    return <AccessDenied />;
  }

  function update<K extends keyof ProductDraft>(field: K, value: ProductDraft[K]): void {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      let input: AdminProductInput;
      if (kind === "MANGA") {
        const title = draft.title.trim();
        const seriesId = initialProduct?.type === "MANGA"
          ? initialProduct.seriesId
          : draft.seriesId.trim() || slugify(title);
        const quantity = numeric(draft.stock);
        input = {
          type: "MANGA",
          title,
          publisher: draft.publisher.trim(),
          seriesId,
          volumeNumber: numeric(draft.volumeNumber),
          isbn: draft.isbn.trim(),
          synopsis: draft.synopsis.trim(),
          coverStyle: draft.coverStyle,
          ...(draft.coverStyle === "LIMITED_SET" ? { variantLabel: "Limited Set" } : {}),
          price: numeric(draft.price),
          stock: quantity,
          status: draft.mangaPreorder
            ? "PREORDER"
            : quantity > 0
              ? "IN_STOCK"
              : "OUT_OF_STOCK",
          preorderDeadline: draft.mangaPreorder ? draft.preorderDeadline : "",
          expectedShippingDate: draft.mangaPreorder ? draft.expectedShippingDate : "",
          weightGrams: numeric(draft.weightGrams),
          images: [...draft.images],
        };
      } else {
        const name = draft.name.trim();
        const quantity = numeric(draft.stock);
        input = {
          type: "FIGURE",
          slug: slugify(draft.slug || name),
          name,
          series: draft.series.trim(),
          character: draft.character.trim(),
          manufacturer: draft.manufacturer.trim(),
          scale: draft.scale.trim(),
          description: draft.description.trim(),
          fullPrice: numeric(draft.fullPrice),
          depositAmount: numeric(draft.depositAmount),
          preorderDeadline: draft.figurePreorder ? draft.preorderDeadline : "",
          releaseMonthYear: draft.releaseMonthYear,
          status: draft.figurePreorder ? "PREORDER_OPEN" : "IN_STOCK",
          stockOrQuotaRemaining: quantity,
          boxDimensions: {
            widthCm: numeric(draft.widthCm),
            lengthCm: numeric(draft.lengthCm),
            heightCm: numeric(draft.heightCm),
          },
          weightGrams: numeric(draft.weightGrams),
          heightMm: numeric(draft.heightMm),
          janCode: draft.janCode.trim(),
          images: [...draft.images],
        };
      }
      saveAdminProduct(input, initialProduct?.id);
      window.location.assign("/admin/products");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "บันทึกข้อมูลสินค้าไม่สำเร็จ",
      );
    } finally {
      setSaving(false);
    }
  }

  const fieldClass =
    "mt-1.5 min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-orange-950";

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/admin/products" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-orange-700 dark:text-zinc-400 dark:hover:text-orange-300">
          <ArrowLeft size={16} aria-hidden="true" /> กลับรายการสินค้า
        </Link>
        <header className="mt-5">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-700 dark:text-orange-300">Admin · Product editor</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{pageTitle}</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">ข้อมูลที่บันทึกจะถูกนำไปแสดงบนหน้าร้านในโหมด Mock</p>
        </header>

        {error ? <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{error}</p> : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {!initialProduct ? (
            <div role="tablist" aria-label="ประเภทสินค้า" className="grid grid-cols-2 gap-2 rounded-2xl border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900">
              {(["MANGA", "FIGURE"] as const).map((productType) => (
                <button key={productType} type="button" role="tab" aria-selected={kind === productType} onClick={() => setKind(productType)} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition ${kind === productType ? "bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950" : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"}`}>
                  {productType === "MANGA" ? <BookOpen size={17} /> : <Package size={17} />}
                  {productType === "MANGA" ? "มังงะ" : "ฟิกเกอร์"}
                </button>
              ))}
            </div>
          ) : null}

          {kind === "MANGA" ? (
            <>
              <FormSection title="ข้อมูลทั่วไป">
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField label="ชื่อเรื่อง" required value={draft.title} onChange={(value) => update("title", value)} className={fieldClass} />
                  <TextField label="สำนักพิมพ์" required value={draft.publisher} onChange={(value) => update("publisher", value)} className={fieldClass} />
                  {!initialProduct ? <TextField label="รหัสเรื่อง (สำหรับจัดกลุ่มเล่ม)" value={draft.seriesId} onChange={(value) => update("seriesId", value)} className={fieldClass} placeholder="เว้นว่างเพื่อสร้างจากชื่อเรื่อง" /> : null}
                  <TextField label="เล่มที่" required type="number" min="1" value={draft.volumeNumber} onChange={(value) => update("volumeNumber", value)} className={fieldClass} />
                  <TextField label="รหัส ISBN" value={draft.isbn} onChange={(value) => update("isbn", value)} className={fieldClass} />
                  <TextField label="น้ำหนักสินค้า (กรัม)" type="number" min="0" value={draft.weightGrams} onChange={(value) => update("weightGrams", value)} className={fieldClass} />
                  <TextField label="เรื่องย่อ" value={draft.synopsis} onChange={(value) => update("synopsis", value)} className={fieldClass} multiline />
                </div>
              </FormSection>
              <FormSection title="รูปแบบและสต็อก">
                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectField label="รูปแบบปก" value={draft.coverStyle} onChange={(value) => update("coverStyle", value as ProductDraft["coverStyle"])} className={fieldClass} options={[["STANDARD", "ปกธรรมดา"], ["LIMITED_SET", "Limited Set"]]} />
                  <TextField label="ราคาขาย (บาท)" required type="number" min="0.01" step="0.01" value={draft.price} onChange={(value) => update("price", value)} className={fieldClass} />
                  <TextField label="จำนวนสต็อก" required type="number" min="0" value={draft.stock} onChange={(value) => update("stock", value)} className={fieldClass} />
                  <ImageUploadField label="รูปภาพสินค้า" images={draft.images} onChange={(images) => update("images", images)} />
                </div>
              </FormSection>
              <FormSection title="การพรีออเดอร์">
                <ToggleField checked={draft.mangaPreorder} onChange={(checked) => update("mangaPreorder", checked)} label="เปิดรับพรีออเดอร์" />
                {draft.mangaPreorder ? <div className="mt-4 grid gap-4 sm:grid-cols-2"><TextField label="วันปิดรับพรีออเดอร์" type="date" required value={draft.preorderDeadline} onChange={(value) => update("preorderDeadline", value)} className={fieldClass} /><TextField label="วันที่คาดว่าจะจัดส่ง" type="date" required value={draft.expectedShippingDate} onChange={(value) => update("expectedShippingDate", value)} className={fieldClass} /></div> : null}
              </FormSection>
            </>
          ) : (
            <>
              <FormSection title="ข้อมูลทั่วไป">
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField label="ชื่อสินค้า" required value={draft.name} onChange={(value) => update("name", value)} className={fieldClass} />
                  <TextField label="URL สินค้า" value={draft.slug} onChange={(value) => update("slug", value)} className={fieldClass} placeholder="สร้างจากชื่อสินค้าอัตโนมัติเมื่อเว้นว่าง" />
                  <TextField label="ซีรีส์" value={draft.series} onChange={(value) => update("series", value)} className={fieldClass} />
                  <TextField label="ตัวละคร" value={draft.character} onChange={(value) => update("character", value)} className={fieldClass} />
                  <TextField label="ผู้ผลิต" required value={draft.manufacturer} onChange={(value) => update("manufacturer", value)} className={fieldClass} />
                  <TextField label="อัตราส่วน (Scale)" required value={draft.scale} onChange={(value) => update("scale", value)} className={fieldClass} />
                  <TextField label="รหัสสินค้า JAN" value={draft.janCode} onChange={(value) => update("janCode", value)} className={fieldClass} />
                  <TextField label="รายละเอียด" value={draft.description} onChange={(value) => update("description", value)} className={fieldClass} multiline />
                </div>
              </FormSection>
              <FormSection title="รูปแบบและสต็อก">
                <ImageUploadField label="รูปภาพสินค้า" images={draft.images} onChange={(images) => update("images", images)} />
              </FormSection>
              <FormSection title="ราคาและเงื่อนไข">
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField label="ราคาเต็ม (บาท)" required type="number" min="0.01" step="0.01" value={draft.fullPrice} onChange={(value) => update("fullPrice", value)} className={fieldClass} />
                  <TextField label="เงินมัดจำ (บาท)" type="number" min="0" step="0.01" value={draft.depositAmount} onChange={(value) => update("depositAmount", value)} className={fieldClass} />
                  <TextField label="เดือน/ปีคาดว่าจะวางจำหน่าย" type="month" value={draft.releaseMonthYear} onChange={(value) => update("releaseMonthYear", value)} className={fieldClass} />
                </div>
                <div className="mt-4"><ToggleField checked={draft.figurePreorder} onChange={(checked) => update("figurePreorder", checked)} label="เปิดรับพรีออเดอร์และมัดจำ" /></div>
                {draft.figurePreorder ? <div className="mt-4"><TextField label="วันปิดรับจอง" type="date" required value={draft.preorderDeadline} onChange={(value) => update("preorderDeadline", value)} className={fieldClass} /></div> : null}
              </FormSection>
              <FormSection title="ข้อมูลพัสดุและโควตา">
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField label="กว้าง (cm)" type="number" min="0.1" step="0.1" value={draft.widthCm} onChange={(value) => update("widthCm", value)} className={fieldClass} />
                  <TextField label="ยาว (cm)" type="number" min="0.1" step="0.1" value={draft.lengthCm} onChange={(value) => update("lengthCm", value)} className={fieldClass} />
                  <TextField label="สูง (cm)" type="number" min="0.1" step="0.1" value={draft.heightCm} onChange={(value) => update("heightCm", value)} className={fieldClass} />
                  <TextField label="น้ำหนัก (กรัม)" type="number" min="0" value={draft.weightGrams} onChange={(value) => update("weightGrams", value)} className={fieldClass} />
                  <TextField label="ความสูงสินค้า (mm)" type="number" min="0" value={draft.heightMm} onChange={(value) => update("heightMm", value)} className={fieldClass} />
                  <TextField label={draft.figurePreorder ? "โควตาเปิดรับจอง" : "จำนวนสต็อกพร้อมส่ง"} type="number" min="0" value={draft.stock} onChange={(value) => update("stock", value)} className={fieldClass} />
                </div>
              </FormSection>
            </>
          )}

          <div className="flex justify-end gap-3 pb-8">
            <Link href="/admin/products" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-zinc-300 px-4 text-sm font-semibold dark:border-zinc-700">ยกเลิก</Link>
            <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-50">
              <Save size={16} aria-hidden="true" /> {saving ? "กำลังบันทึก..." : "บันทึกสินค้า"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function PageMessage({ text }: { text: string }) {
  return <main className="flex min-h-[60vh] items-center justify-center px-4"><p role="status" className="text-sm text-zinc-500">{text}</p></main>;
}

function AccessDenied() {
  return (
    <main className="mx-auto flex min-h-[65vh] max-w-xl flex-col items-center justify-center px-5 text-center">
      <AlertTriangle size={36} className="text-red-600" aria-hidden="true" />
      <p className="mt-4 text-sm font-bold uppercase tracking-wider text-red-700">HTTP 403 · Admin Only</p>
      <h1 className="mt-2 text-2xl font-extrabold">ไม่มีสิทธิ์จัดการสินค้า</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">หน้านี้อนุญาตเฉพาะผู้ดูแลระบบ</p>
      <Link href="/" className="mt-5 rounded-xl bg-zinc-950 px-5 py-3 text-sm font-bold text-white dark:bg-zinc-100 dark:text-zinc-950">กลับหน้าร้าน</Link>
    </main>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6"><h2 className="mb-4 text-base font-bold">{title}</h2>{children}</section>;
}

function TextField({
  label,
  value,
  onChange,
  className,
  required = false,
  type = "text",
  min,
  step,
  placeholder,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className: string;
  required?: boolean;
  type?: string;
  min?: string;
  step?: string;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
      {label}{required ? <span className="ml-1 text-red-600">*</span> : null}
      {multiline ? <textarea required={required} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={3} className={`${className} resize-y`} /> : <input required={required} type={type} min={min} step={step} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={className} />}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  className,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className: string;
  options: readonly (readonly [string, string])[];
}) {
  return <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className={className}>{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>;
}

function ImageUploadField({
  label,
  images,
  onChange,
}: {
  label: string;
  images: string[];
  onChange: (images: string[]) => void;
}) {
  const MAX_IMAGE_SIZE = 3 * 1024 * 1024;
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setValidationError("请选择ไฟล์รูปภาพเท่านั้น");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setValidationError("รูปภาพต้องไม่เกิน 3 MB");
      return;
    }

    setValidationError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onChange([...images, reader.result]);
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="sm:col-span-2">
      <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}<span className="ml-1 text-red-600">*</span></span>
      <label htmlFor="product-image-upload" className="mt-1.5 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-5 text-center transition hover:border-orange-400 hover:bg-orange-50/40 dark:border-zinc-700 dark:bg-zinc-950/50 dark:hover:border-orange-600 dark:hover:bg-orange-950/20">
        <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">เลือกภาพสินค้า</span>
        <span className="mt-1 text-xs text-zinc-500">PNG, JPG หรือ GIF · ไม่เกิน 3 MB</span>
        <input id="product-image-upload" type="file" accept="image/*" className="sr-only" onChange={handleImageChange} />
      </label>
      {validationError ? <p role="alert" className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400">{validationError}</p> : null}
      {images.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((image, index) => (
            <div key={`${image}-${index}`} className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950">
              <img src={image} alt={`รูปสินค้า ${index + 1}`} className="aspect-square h-full w-full object-cover" />
              <button type="button" onClick={() => onChange(images.filter((_, imageIndex) => imageIndex !== index))} className="absolute bottom-2 right-2 rounded-full bg-red-600 p-2 text-white shadow-lg transition hover:bg-red-700" aria-label={`ลบรูปสินค้า ${index + 1}`}>
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ToggleField({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-orange-600" /><span>{label}</span></label>;
}

"use client";

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clipboard,
  CreditCard,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { useAuth } from "../../../contexts/AuthContext";
import {
  getMockOrder,
  updateMockOrderPayment,
} from "../../../mocks/storage.mock";

interface PaymentResult {
  orderId: number;
  orderNumber: string;
  paymentStatus: "PAID" | "DEPOSIT_PAID";
  paymentStage: "INITIAL" | "BALANCE";
  verifiedAmount: string;
  transactionRef: string;
  message: string;
}

const slipSuccessSchema = z
  .object({
    success: z.literal(true),
    data: z
      .object({
        orderId: z.number().int().positive().safe(),
        paymentStatus: z.enum(["PAID", "DEPOSIT_PAID"]),
        paymentStage: z.enum(["INITIAL", "BALANCE"]),
        verifiedAmount: z.string(),
        transactionRef: z.string(),
        message: z.string(),
      })
      .strict(),
  })
  .strict();

const slipFailureSchema = z
  .object({
    success: z.literal(false),
    error: z
      .object({
        message: z.string().optional(),
      })
      .optional(),
  })
  .passthrough();

const orderIdSchema = z.string().regex(/^[1-9]\d*$/);
const safeQrDataUrlSchema = z
  .string()
  .regex(
    /^(?:data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+|data:image\/svg\+xml;charset=utf-8,%3Csvg[\s\S]+)$/i,
  );

function getApiUrl(path: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, "");
  return `${baseUrl ?? ""}${path}`;
}

function formatBaht(value: string): string {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    return "฿—";
  }
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function CheckoutPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { authenticatedFetch, isAuthenticated, isLoading } = useAuth();
  const orderIdValue = searchParams.get("orderId") ?? "";
  const amount = searchParams.get("amount") ?? "";
  const orderNumber = searchParams.get("orderNumber") ?? "";
  const useMockMode = process.env.NEXT_PUBLIC_USE_MOCK === "true";
  const qrError = searchParams.get("qrError");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(amount);
  const [displayOrderNumber, setDisplayOrderNumber] = useState(orderNumber);
  const [mockOrderMissing, setMockOrderMissing] = useState(false);
  const [mockOrderCancelled, setMockOrderCancelled] = useState(false);
  const [mockPaymentStatus, setMockPaymentStatus] = useState<
    "PAID" | "DEPOSIT_PAID"
  >("PAID");
  const [qrWasUnavailable, setQrWasUnavailable] = useState(false);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const orderIdValid = orderIdSchema.safeParse(orderIdValue).success;

  useEffect(() => {
    if (!orderIdValid) {
      return;
    }
    if (useMockMode) {
      const mockOrder = getMockOrder(Number(orderIdValue));
      if (!mockOrder) {
        setMockOrderMissing(true);
        setQrWasUnavailable(true);
        return;
      }
      if (mockOrder.detail.status === "CANCELLED") {
        setMockOrderCancelled(true);
        setMockOrderMissing(false);
        setDisplayOrderNumber(mockOrder.detail.orderNumber);
        setQrWasUnavailable(true);
        return;
      }
      setMockOrderCancelled(false);
      setMockOrderMissing(false);
      setPaymentAmount(mockOrder.immediateAmount);
      setDisplayOrderNumber(mockOrder.detail.orderNumber);
      setMockPaymentStatus(
        mockOrder.detail.items.some((item) => item.paymentType === "DEPOSIT")
          ? "DEPOSIT_PAID"
          : "PAID",
      );
      const parsedQr = safeQrDataUrlSchema.safeParse(
        mockOrder.paymentQrCodeDataUrl,
      );
      if (parsedQr.success) {
        setQrDataUrl(parsedQr.data);
      } else {
        setQrWasUnavailable(true);
      }
      return;
    }

    try {
      const key = `checkout-payment-qr:${orderIdValue}`;
      const storedQr = window.sessionStorage.getItem(key);
      if (storedQr) {
        const parsed = safeQrDataUrlSchema.safeParse(storedQr);
        if (parsed.success) {
          setQrDataUrl(parsed.data);
        } else {
          setQrWasUnavailable(true);
        }
        window.sessionStorage.removeItem(key);
      } else {
        setQrWasUnavailable(true);
      }
    } catch (storageError) {
      console.error("Could not read the payment QR from this session.", storageError);
      setQrWasUnavailable(true);
    }
  }, [orderIdValid, orderIdValue, useMockMode]);

  async function submitSlip(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    if (!isAuthenticated && !useMockMode) {
      setError("กรุณาเข้าสู่ระบบใหม่ก่อนส่งสลิป");
      return;
    }
    if (!orderIdValid) {
      setError("หมายเลขคำสั่งซื้อไม่ถูกต้อง");
      return;
    }
    if (useMockMode) {
      const currentOrder = getMockOrder(Number(orderIdValue));
      if (!currentOrder || currentOrder.detail.status === "CANCELLED") {
        setMockOrderCancelled(true);
        setError("คำสั่งซื้อนี้ถูกยกเลิกแล้วและไม่สามารถส่งสลิปได้");
        return;
      }
    }
    if (!slipFile) {
      setError("กรุณาเลือกไฟล์สลิปก่อนส่ง");
      return;
    }
    if (slipFile.size > 5 * 1024 * 1024) {
      setError("ไฟล์สลิปต้องมีขนาดไม่เกิน 5 MB");
      return;
    }
    if (!slipFile.type.startsWith("image/")) {
      setError("กรุณาเลือกไฟล์รูปภาพสำหรับสลิป");
      return;
    }

    const formData = new FormData();
    formData.append("slip", slipFile);
    if (useMockMode) {
      formData.append("paymentStatus", mockPaymentStatus);
      formData.append("amount", paymentAmount);
      formData.append("paymentStage", "INITIAL");
    }
    setUploading(true);
    try {
      const requestOptions: RequestInit = {
        method: "POST",
        body: formData,
      };
      const response = useMockMode
        ? await fetch(`/api/orders/${orderIdValue}/slip`, requestOptions)
        : await authenticatedFetch(
            getApiUrl(`/api/orders/${orderIdValue}/slip`),
            requestOptions,
          );
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw new Error("เซิร์ฟเวอร์ส่งข้อมูลตอบกลับไม่ถูกต้อง");
      }

      const parsedSuccess = slipSuccessSchema.safeParse(body);
      if (!response.ok || !parsedSuccess.success) {
        const parsedFailure = slipFailureSchema.safeParse(body);
        throw new Error(
          parsedFailure.success && parsedFailure.data.error?.message
            ? parsedFailure.data.error.message
            : "ตรวจสอบสลิปไม่สำเร็จ",
        );
      }

      if (useMockMode) {
        updateMockOrderPayment(
          Number(orderIdValue),
          parsedSuccess.data.data.paymentStatus,
          parsedSuccess.data.data.transactionRef,
          parsedSuccess.data.data.paymentStage,
        );
      }
      if (useMockMode) {
        router.replace(`/orders/${orderIdValue}`);
        return;
      }
      setPaymentResult({
        ...parsedSuccess.data.data,
        orderNumber: displayOrderNumber,
      });
      setSlipFile(null);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "ส่งสลิปไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  }

  async function copyOrderNumber(): Promise<void> {
    try {
      await navigator.clipboard.writeText(displayOrderNumber || orderIdValue);
    } catch (clipboardError) {
      console.error("Could not copy the order reference.", clipboardError);
      setError("คัดลอกเลขอ้างอิงไม่สำเร็จ");
    }
  }

  if (isLoading && !useMockMode) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-4">
        <p className="text-sm text-slate-500" role="status">กำลังตรวจสอบสถานะผู้ใช้...</p>
      </main>
    );
  }

  if (!orderIdValid || (!paymentAmount && !mockOrderCancelled) || mockOrderMissing) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-4 text-center">
        <AlertCircle aria-hidden="true" className="h-10 w-10 text-red-500" />
        <h1 className="mt-4 text-xl font-bold text-slate-900">ข้อมูลการชำระเงินไม่ครบถ้วน</h1>
        <p className="mt-2 text-sm text-slate-500">กรุณากลับไปตรวจสอบคำสั่งซื้อในบัญชีของคุณ</p>
        <Link
          href={useMockMode ? "/" : "/account"}
          className="mt-5 font-semibold text-orange-700"
        >
          {mockOrderMissing ? "ไม่พบคำสั่งซื้อบนอุปกรณ์นี้" : "กลับไปหน้าร้าน"}
        </Link>
      </main>
    );
  }

  if (paymentResult) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-4 text-center">
        <span className="rounded-full bg-emerald-50 p-4 text-emerald-700">
          <CheckCircle2 aria-hidden="true" className="h-10 w-10" />
        </span>
        <h1 className="mt-5 text-2xl font-bold text-slate-900">ยืนยันการชำระเงินแล้ว</h1>
        <p className="mt-2 text-sm text-slate-600">{paymentResult.message}</p>
        <div className="mt-5 w-full rounded-2xl border border-slate-200 bg-white p-5 text-left">
          <p className="text-sm text-slate-500">คำสั่งซื้อ</p>
          <p className="mt-1 font-semibold text-slate-900">{paymentResult.orderNumber || `#${paymentResult.orderId}`}</p>
          <p className="mt-3 text-sm text-slate-500">ยอดที่ยืนยัน</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{formatBaht(paymentResult.verifiedAmount)}</p>
        </div>
        <Link
          href={
            useMockMode
              ? `/orders/${paymentResult.orderId}`
              : `/account/orders/${paymentResult.orderId}`
          }
          className="mt-6 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
        >
          ดูรายละเอียดคำสั่งซื้อ
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/checkout"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          กลับไปหน้าชำระเงิน
        </Link>
        <div className="mt-5 grid gap-6 md:grid-cols-[1fr_0.9fr]">
          {mockOrderCancelled ? (
            <section className="rounded-2xl border border-zinc-300 bg-zinc-100 p-6 dark:border-zinc-700 dark:bg-zinc-900 md:col-span-2">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-6 w-6 shrink-0 text-zinc-500" aria-hidden="true" />
                <div>
                  <h1 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">คำสั่งซื้อนี้ถูกยกเลิกแล้ว</h1>
                  <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                    ไม่สามารถชำระเงินหรือส่งสลิปสำหรับคำสั่งซื้อ {displayOrderNumber} ได้
                  </p>
                  <Link href="/account/orders" className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-zinc-900 px-4 text-sm font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                    ไปยังประวัติคำสั่งซื้อ
                  </Link>
                </div>
              </div>
            </section>
          ) : (
          <>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <span className="inline-flex rounded-xl bg-orange-50 p-3 text-orange-700">
              <CreditCard aria-hidden="true" className="h-6 w-6" />
            </span>
            <h1 className="mt-4 text-2xl font-bold text-slate-950">ชำระเงินด้วย QR</h1>
            <p className="mt-2 text-sm text-slate-500">
              คำสั่งซื้อ {displayOrderNumber || `#${orderIdValue}`}
            </p>
            {useMockMode ? (
              <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-900">
                โหมดสาธิตเท่านั้น: QR นี้ไม่ใช่ PromptPay และไม่สามารถรับเงินจริงได้
                กรุณาอย่าโอนเงินจริง
              </p>
            ) : null}
            <p className="mt-4 text-3xl font-bold text-slate-900">{formatBaht(paymentAmount)}</p>
            <div className="mt-6 flex min-h-64 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR Code สำหรับชำระคำสั่งซื้อ"
                  className="h-56 w-56 rounded-xl bg-white object-contain p-2"
                />
              ) : (
                <div className="max-w-sm text-center">
                  <AlertCircle aria-hidden="true" className="mx-auto h-8 w-8 text-amber-600" />
                  <p className="mt-3 text-sm font-semibold text-slate-900">
                    {qrWasUnavailable
                      ? "คำสั่งซื้อสร้างแล้ว แต่ยังไม่มี QR Code จากระบบชำระเงิน"
                      : "กำลังเตรียม QR Code"}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-600">
                    {qrError ??
                      "ไม่สามารถสร้าง QR สำหรับคำสั่งซื้อนี้ได้ กรุณาติดต่อร้านพร้อมเลขคำสั่งซื้อก่อนโอนเงิน"}
                  </p>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => void copyOrderNumber()}
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              <Clipboard aria-hidden="true" className="h-4 w-4" />
              คัดลอกเลขอ้างอิง
            </button>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">ส่งสลิปเพื่อยืนยัน</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              แนบสลิปหลังชำระแล้ว ระบบจะตรวจสอบยอดและบัญชีผู้รับให้โดยอัตโนมัติ
            </p>
            <form onSubmit={(event) => void submitSlip(event)} className="mt-5 space-y-4">
              <label
                htmlFor="payment-slip"
                className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center transition hover:border-orange-400 hover:bg-orange-50/40"
              >
                <Upload aria-hidden="true" className="h-7 w-7 text-slate-400" />
                <span className="mt-2 text-sm font-semibold text-slate-800">
                  {slipFile ? slipFile.name : "เลือกภาพสลิป"}
                </span>
                <span className="mt-1 text-xs text-slate-500">ไฟล์รูปภาพ · ไม่เกิน 5 MB</span>
                <input
                  id="payment-slip"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => {
                    setError(null);
                    setSlipFile(event.target.files?.[0] ?? null);
                  }}
                />
              </label>
              {error ? (
                <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">
                  {error}
                </p>
              ) : null}
              {!isAuthenticated && !useMockMode ? (
                <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                  กรุณาเข้าสู่ระบบด้วยบัญชีเจ้าของคำสั่งซื้อเพื่อส่งสลิป
                </p>
              ) : null}
              <button
                type="submit"
                disabled={uploading || (!isAuthenticated && !useMockMode)}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {uploading ? "กำลังตรวจสอบสลิป..." : "ส่งสลิปเพื่อตรวจสอบ"}
              </button>
            </form>
          </section>
          </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function CheckoutPaymentPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[70vh] items-center justify-center px-4">
          <p className="text-sm text-slate-500">กำลังโหลดข้อมูลการชำระเงิน...</p>
        </main>
      }
    >
      <CheckoutPaymentContent />
    </Suspense>
  );
}

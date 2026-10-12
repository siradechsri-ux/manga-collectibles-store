"use client";

import { AlertCircle, FileText, MapPin, ShieldCheck, XCircle } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import OrderDetailView from "../../../components/OrderDetailView";
import type {
  BalanceSlipUploadRequest,
  OrderTrackingDetail,
} from "../../../components/OrderDetailView";
import { useAuth } from "../../../contexts/AuthContext";
import {
  advanceMockShipmentStatus,
  getMockOrder,
  cancelMockOrder,
  markMockOrderArrived,
  resubmitMockOrderSlip,
  type MockStoredOrder,
  updateMockOrderPayment,
} from "../../../mocks/storage.mock";
import { OrderService } from "../../../services/order.service";

const orderIdSchema = z.string().regex(/^[1-9]\d*$/);
const slipResultSchema = z
  .object({
    success: z.literal(true),
    data: z
      .object({
        paymentStatus: z.enum(["PAID", "DEPOSIT_PAID"]),
        paymentStage: z.enum(["INITIAL", "BALANCE"]),
        transactionRef: z.string().min(1),
      })
      .passthrough(),
  })
  .passthrough();

function getApiErrorMessage(body: unknown): string {
  if (typeof body !== "object" || body === null || !("error" in body)) {
    return "ตรวจสอบสลิปจำลองไม่สำเร็จ";
  }
  const error = body.error;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return "ตรวจสอบสลิปจำลองไม่สำเร็จ";
}

export default function MockOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = Array.isArray(params.id) ? params.id[0] ?? "" : params.id;
  const { user, isLoading: isAuthLoading } = useAuth();
  const [storedOrder, setStoredOrder] = useState<MockStoredOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isMarkingArrived, setIsMarkingArrived] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [replacementSlip, setReplacementSlip] = useState<File | null>(null);
  const [replacementSlipError, setReplacementSlipError] = useState<string | null>(null);
  const [replacementSlipNotice, setReplacementSlipNotice] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (process.env.NEXT_PUBLIC_USE_MOCK !== "true") {
      setError("หน้ารายละเอียดนี้ใช้ได้เฉพาะในโหมด Prototype");
      setIsLoading(false);
      return;
    }
    if (!orderIdSchema.safeParse(orderId).success) {
      setError("หมายเลขคำสั่งซื้อไม่ถูกต้อง");
      setIsLoading(false);
      return;
    }

    void OrderService.getOrderById(Number(orderId))
      .then((order) => {
        if (!isMounted) return;
        if (!order) {
          setError("ไม่พบคำสั่งซื้อในอุปกรณ์นี้");
          setIsLoading(false);
          return;
        }
        setStoredOrder(order);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลดคำสั่งซื้อ");
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [orderId]);

  const uploadBalanceSlip = useCallback(
    async (request: BalanceSlipUploadRequest): Promise<void> => {
      if (process.env.NEXT_PUBLIC_USE_MOCK !== "true") {
        throw new Error("การชำระยอดคงเหลือจำลองใช้ได้เฉพาะโหมด Prototype");
      }
      const order = getMockOrder(request.orderId);
      if (
        !order ||
        (user?.role === "CUSTOMER" && order.ownerUserId !== user.id) ||
        (user?.role !== "CUSTOMER" &&
          user?.role !== "ADMIN" &&
          user?.role !== "STAFF" &&
          user?.role !== "FINANCE")
      ) {
        throw new Error("ไม่มีสิทธิ์เข้าถึงคำสั่งซื้อนี้");
      }
      if (!order || order.detail.status !== "AWAITING_BALANCE_PAYMENT") {
        throw new Error("ไม่พบคำสั่งซื้อหรือยังไม่เปิดรับชำระยอดคงเหลือ");
      }

      const formData = new FormData();
      formData.append("slip", request.file);
      formData.append("paymentStatus", "PAID");
      formData.append("paymentStage", "BALANCE");
      formData.append("amount", order.detail.remainingBalance.toFixed(2));
      const response = await fetch(`/api/orders/${request.orderId}/slip`, {
        method: "POST",
        body: formData,
      });
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw new Error("ระบบจำลองส่งข้อมูลตอบกลับไม่ถูกต้อง");
      }
      const parsed = slipResultSchema.safeParse(body);
      if (!response.ok || !parsed.success) {
        throw new Error(getApiErrorMessage(body));
      }

      const updatedOrder = updateMockOrderPayment(
        request.orderId,
        parsed.data.data.paymentStatus,
        parsed.data.data.transactionRef,
        parsed.data.data.paymentStage,
      );
      setStoredOrder(updatedOrder);
    },
    [],
  );

  const getBalanceQrCodeUrl = useCallback(
    async (amount: number): Promise<string> => {
      if (process.env.NEXT_PUBLIC_USE_MOCK !== "true") {
        throw new Error("QR จำลองใช้ได้เฉพาะโหมด Prototype");
      }
      const response = await fetch(
        `/api/orders/${orderId}/slip?amount=${encodeURIComponent(
          amount.toFixed(2),
        )}`,
        { cache: "no-store" },
      );
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw new Error("ระบบจำลองส่งข้อมูล QR ตอบกลับไม่ถูกต้อง");
      }
      const parsed = z
        .object({
          success: z.literal(true),
          data: z.object({ dataUrl: z.string().min(1) }).passthrough(),
        })
        .passthrough()
        .safeParse(body);
      if (!response.ok || !parsed.success) {
        throw new Error("ไม่สามารถสร้าง QR จำลองสำหรับยอดคงเหลือได้");
      }
      return parsed.data.data.dataUrl;
    },
    [orderId, user],
  );

  function handleMarkArrived(): void {
    setActionError(null);
    setIsMarkingArrived(true);
    try {
      setStoredOrder(markMockOrderArrived(Number(orderId)));
    } catch (markError) {
      setActionError(
        markError instanceof Error
          ? markError.message
          : "เปลี่ยนสถานะสินค้าไม่สำเร็จ",
      );
    } finally {
      setIsMarkingArrived(false);
    }
  }

  function handleCancelOrder(): void {
    setCancelError(null);
    if (!user || user.role !== "CUSTOMER") {
      setCancelError("เฉพาะเจ้าของคำสั่งซื้อที่เข้าสู่ระบบในฐานะลูกค้าเท่านั้นที่ยกเลิกได้");
      return;
    }
    try {
      setStoredOrder(cancelMockOrder(Number(orderId), user.id));
      setIsCancelDialogOpen(false);
    } catch (cancelFailure) {
      setCancelError(
        cancelFailure instanceof Error
          ? cancelFailure.message
          : "ยกเลิกคำสั่งซื้อไม่สำเร็จ",
      );
    }
  }

  function handleReplacementSlip(file: File | undefined): void {
    setReplacementSlipError(null);
    setReplacementSlipNotice(null);
    if (!file) {
      setReplacementSlip(null);
      return;
    }
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      setReplacementSlip(null);
      setReplacementSlipError("กรุณาเลือกไฟล์รูปภาพที่มีขนาดไม่เกิน 5 MB");
      return;
    }
    setReplacementSlip(file);
  }

  function submitReplacementSlip(): void {
    setReplacementSlipError(null);
    setReplacementSlipNotice(null);
    if (!user || user.role !== "CUSTOMER" || !replacementSlip) {
      setReplacementSlipError("กรุณาเข้าสู่ระบบในฐานะลูกค้าและเลือกไฟล์สลิป");
      return;
    }
    if (process.env.NEXT_PUBLIC_USE_MOCK !== "true") {
      setReplacementSlipError("การส่งสลิปใหม่ใช้ได้เฉพาะโหมด Prototype");
      return;
    }
    try {
      const updated = resubmitMockOrderSlip(
        Number(orderId),
        user.id,
        replacementSlip.name,
      );
      setStoredOrder(updated);
      setReplacementSlip(null);
      setReplacementSlipNotice("ส่งสลิปใหม่ให้ฝ่ายการเงินตรวจสอบแล้ว");
    } catch (submitError) {
      setReplacementSlipError(
        submitError instanceof Error ? submitError.message : "ส่งสลิปใหม่ไม่สำเร็จ",
      );
    }
  }

  function advanceShipment(): void {
    setActionError(null);
    try {
      setStoredOrder(advanceMockShipmentStatus(Number(orderId)));
    } catch (shipmentError) {
      setActionError(
        shipmentError instanceof Error
          ? shipmentError.message
          : "เปลี่ยนสถานะขนส่งไม่สำเร็จ",
      );
    }
  }

  if (isLoading || isAuthLoading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4">
        <p className="text-sm text-slate-500" role="status">
          กำลังโหลดรายละเอียดคำสั่งซื้อ...
        </p>
      </main>
    );
  }

  if (error || !storedOrder) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
        <AlertCircle aria-hidden="true" className="h-10 w-10 text-amber-600" />
        <h1 className="mt-4 text-xl font-bold text-slate-900">
          ไม่สามารถเปิดคำสั่งซื้อได้
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {error ?? "ไม่พบรายละเอียดคำสั่งซื้อ"}
        </p>
        <Link
          href="/"
          className="mt-5 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
        >
          กลับไปหน้าร้าน
        </Link>
      </main>
    );
  }

  const isStaffRole =
    user?.role === "STAFF" ||
    user?.role === "FINANCE" ||
    user?.role === "ADMIN";
  const isOwnerCustomer =
    user?.role === "CUSTOMER" && storedOrder.ownerUserId === user.id;

  if (!isAuthLoading && !isStaffRole && !isOwnerCustomer) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
        <AlertCircle aria-hidden="true" className="h-10 w-10 text-red-600" />
        <h1 className="mt-4 text-xl font-bold text-slate-900 dark:text-zinc-100">
          ไม่มีสิทธิ์ดูคำสั่งซื้อนี้
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
          {user?.role === "CUSTOMER"
            ? "ลูกค้าสามารถดูได้เฉพาะคำสั่งซื้อที่สร้างจากบัญชีของตนเอง"
            : "กรุณาเข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์เพื่อดูคำสั่งซื้อนี้"}
        </p>
        <Link
          href={user?.role === "CUSTOMER" ? "/account/orders" : "/"}
          className="mt-5 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {user?.role === "CUSTOMER" ? "กลับไปคำสั่งซื้อของฉัน" : "กลับสู่หน้าร้าน"}
        </Link>
      </main>
    );
  }

  const order: OrderTrackingDetail = storedOrder.detail;
  const canUseTestingToolbar =
    user?.role === "ADMIN" || user?.role === "STAFF";

  return (
    <>
      <div className="mx-auto max-w-6xl space-y-4 px-4 pt-6 sm:px-6">
        {isStaffRole ? (
          <div className="flex flex-col gap-2 rounded-2xl border border-sky-300 bg-sky-50 p-4 text-sky-950 sm:flex-row sm:items-center sm:justify-between dark:border-sky-850 dark:bg-sky-950/40 dark:text-sky-100">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden="true" />
              <div>
                <p className="font-bold">มุมมองเจ้าหน้าที่ตรวจสอบ (Staff/Finance View)</p>
                <p className="mt-0.5 text-xs text-sky-800 dark:text-sky-300">
                  กำลังตรวจสอบคำสั่งซื้อ #{order.orderNumber} ในฐานะ {user?.role}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-sky-200/70 px-2.5 py-1 text-xs font-bold text-sky-900 dark:bg-sky-900/60 dark:text-sky-200">
                สิทธิ์: {user?.role}
              </span>
            </div>
          </div>
        ) : null}
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          โหมดสาธิตเท่านั้น: สถานะและข้อมูลคำสั่งซื้อถูกเก็บไว้ในเบราว์เซอร์นี้
          ไม่มีการตัดเงินจริง
        </p>
        {canUseTestingToolbar ? (
          <section className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-extrabold text-violet-950">
                  Testing Toolbar · {user.role}
                </h2>
                <p className="mt-1 text-sm text-violet-800">
                  เครื่องมือจำลองนี้เปลี่ยนเฉพาะ Order ใน localStorage ของเบราว์เซอร์
                </p>
              </div>
              <button
                type="button"
                onClick={handleMarkArrived}
                disabled={
                  isMarkingArrived ||
                  order.status !== "DEPOSIT_PAID" ||
                  order.remainingBalance <= 0
                }
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-violet-700 px-4 py-2 text-sm font-bold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isMarkingArrived
                  ? "กำลังเปลี่ยนสถานะ..."
                  : "ทดสอบ: บันทึกฟิกเกอร์ถึงไทยแล้ว"}
              </button>
            </div>
            {actionError ? (
              <p role="alert" className="mt-3 text-sm font-semibold text-red-700">
                {actionError}
              </p>
            ) : null}
          </section>
        ) : null}
      </div>

      <section className="mx-auto mt-4 max-w-6xl px-4 sm:px-6">
        {order.status === "PAYMENT_REJECTED" && user?.role === "CUSTOMER" ? (
          <section className="mb-4 rounded-2xl border border-red-300 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700 dark:text-red-300" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <h2 className="font-bold text-red-900 dark:text-red-100">สลิปถูกปฏิเสธ</h2>
                <p className="mt-1 text-sm text-red-800 dark:text-red-200">
                  เหตุผล: {order.paymentRejectionReason ?? "กรุณาตรวจสอบรายละเอียดกับฝ่ายการเงิน"}
                </p>
                <label className="mt-4 block text-sm font-semibold text-red-950 dark:text-red-100" htmlFor="replacement-payment-slip">
                  แนบหลักฐานการชำระเงินใหม่
                </label>
                <input
                  id="replacement-payment-slip"
                  type="file"
                  accept="image/*"
                  onChange={(event) => handleReplacementSlip(event.currentTarget.files?.[0])}
                  className="mt-2 block w-full rounded-lg border border-red-300 bg-white p-2 text-sm text-slate-900 file:mr-3 file:rounded-md file:border-0 file:bg-red-100 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-red-800 dark:border-red-800 dark:bg-zinc-900 dark:text-zinc-100 dark:file:bg-red-950 dark:file:text-red-200"
                />
                {replacementSlip ? (
                  <p className="mt-2 text-xs text-red-800 dark:text-red-200">
                    ไฟล์ที่เลือก: {replacementSlip.name}
                  </p>
                ) : null}
                {replacementSlipError ? (
                  <p role="alert" className="mt-2 text-sm font-semibold text-red-700 dark:text-red-300">
                    {replacementSlipError}
                  </p>
                ) : null}
                {replacementSlipNotice ? (
                  <p role="status" className="mt-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                    {replacementSlipNotice}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={submitReplacementSlip}
                  disabled={!replacementSlip || process.env.NEXT_PUBLIC_USE_MOCK !== "true"}
                  className="mt-3 inline-flex min-h-10 items-center justify-center rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ยืนยันส่งตรวจอีกครั้ง
                </button>
              </div>
            </div>
          </section>
        ) : null}
        {order.status === "PAYMENT_REVIEW_PENDING" && user?.role === "CUSTOMER" ? (
          <p role="status" className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            ได้รับสลิปใหม่แล้ว กำลังรอฝ่ายการเงินตรวจสอบ
          </p>
        ) : null}
        {order.status === "UNPAID" && user?.role === "CUSTOMER" ? (
          <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-red-200 bg-white p-4 dark:border-red-900 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-bold text-zinc-900 dark:text-zinc-100">คำสั่งซื้อยังรอชำระเงิน</p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                หากไม่ต้องการดำเนินการต่อ สามารถยกเลิกและคืนสินค้าเข้าสต็อกได้
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setCancelError(null);
                setIsCancelDialogOpen(true);
              }}
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-red-300 px-4 text-sm font-bold text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
            >
              <XCircle size={17} aria-hidden="true" />
              ยกเลิกคำสั่งซื้อ
            </button>
          </div>
        ) : null}
        {cancelError ? <p role="alert" className="mb-4 text-sm font-semibold text-red-700 dark:text-red-300">{cancelError}</p> : null}
        {/* Shipping Address & Attached Slip */}
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Shipping Address */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
              <h2 className="font-bold text-slate-900 dark:text-zinc-50">ที่อยู่จัดส่งสินค้า</h2>
            </div>
            <div className="mt-3 text-sm text-slate-700 dark:text-zinc-300">
              {storedOrder.shippingAddress ? (
                <>
                  <p className="font-semibold text-slate-900 dark:text-zinc-100">
                    {storedOrder.shippingAddress.recipientName} ({storedOrder.shippingAddress.recipientPhone})
                  </p>
                  <p className="mt-1 leading-relaxed">
                    {[
                      storedOrder.shippingAddress.addressLine,
                      storedOrder.shippingAddress.addressVillage,
                      storedOrder.shippingAddress.street,
                      storedOrder.shippingAddress.subdistrict,
                      storedOrder.shippingAddress.district,
                      storedOrder.shippingAddress.province,
                      storedOrder.shippingAddress.postalCode,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  </p>
                </>
              ) : (
                <p className="text-slate-500 dark:text-zinc-400">
                  ไม่มีข้อมูลที่อยู่จัดส่งในคำสั่งซื้อนี้
                </p>
              )}
            </div>
          </div>

          {/* Attached Payment Slip */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <h2 className="font-bold text-slate-900 dark:text-zinc-50">หลักฐานการชำระเงินที่แนบมา (Attached Slip)</h2>
            </div>
            <div className="mt-3 text-sm">
              {storedOrder.detail.paymentSlipFileName ? (
                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-zinc-800/80">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-slate-500 dark:text-zinc-400" aria-hidden="true" />
                    <span className="truncate font-mono text-xs font-semibold text-slate-900 dark:text-zinc-100">
                      {storedOrder.detail.paymentSlipFileName}
                    </span>
                  </div>
                  <span className="shrink-0 rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    แนบแล้ว
                  </span>
                </div>
              ) : (
                <p className="text-slate-500 dark:text-zinc-400">
                  ไม่มีไฟล์สลิปแนบ (ชำระผ่าน PromptPay อัตโนมัติ หรือยังไม่ได้แนบหลักฐาน)
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="font-bold text-slate-900 dark:text-zinc-50">สรุปภาษีจำลอง</h2>
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <p className="text-slate-600 dark:text-zinc-400">
              มังงะยกเว้น VAT:{" "}
              <span className="font-semibold text-slate-900 dark:text-zinc-100">
                ฿{storedOrder.taxSummary?.mangaVatExemptAmount ?? "0.00"}
              </span>
            </p>
            <p className="text-slate-600 dark:text-zinc-400">
              ฐานภาษี Figure และค่าจัดส่ง:{" "}
              <span className="font-semibold text-slate-900 dark:text-zinc-100">
                ฿{storedOrder.taxSummary?.vatBaseAmount ?? "0.00"}
              </span>
            </p>
            <p className="text-slate-600 dark:text-zinc-400">
              VAT 7% (รวมในยอด):{" "}
              <span className="font-semibold text-slate-900 dark:text-zinc-100">
                ฿{storedOrder.taxSummary?.vatAmount ?? "0.00"}
              </span>
            </p>
            <p className="text-slate-600 dark:text-zinc-400">
              ใบกำกับภาษี:{" "}
              <span className="font-semibold text-slate-900 dark:text-zinc-100">
                {storedOrder.taxSummary?.taxInvoiceRequested
                  ? "ร้องขอแล้ว"
                  : "ไม่ได้ร้องขอ"}
              </span>
            </p>
          </div>
          {storedOrder.taxSummary?.taxInvoiceCustomer ? (
            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm dark:bg-zinc-800">
              <p className="font-semibold text-slate-900 dark:text-zinc-100">
                {storedOrder.taxSummary.taxInvoiceCustomer.companyOrName}
              </p>
              <p className="mt-1 text-slate-600 dark:text-zinc-400">
                เลขประจำตัวผู้เสียภาษี{" "}
                {storedOrder.taxSummary.taxInvoiceCustomer.maskedTaxId}
              </p>
              <p className="mt-1 text-slate-600 dark:text-zinc-400">
                {storedOrder.taxSummary.taxInvoiceCustomer.address}
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <OrderDetailView
        order={order}
        promptPayQrCodeUrl={storedOrder.paymentQrCodeDataUrl}
        getPaymentQrCodeUrl={getBalanceQrCodeUrl}
        onUploadBalanceSlip={uploadBalanceSlip}
        onAdvanceShipmentStatus={advanceShipment}
        isMockMode={process.env.NEXT_PUBLIC_USE_MOCK === "true"}
        hideCustomerActions={isStaffRole}
      />
      {isCancelDialogOpen && user?.role === "CUSTOMER" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="cancel-detail-order-title">
          <section className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <h2 id="cancel-detail-order-title" className="text-lg font-extrabold text-zinc-900 dark:text-zinc-100">ยืนยันการยกเลิกคำสั่งซื้อ</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              คุณต้องการยกเลิกคำสั่งซื้อหมายเลข #{order.id} ใช่หรือไม่? สินค้าในรายการจะถูกส่งคืนกลับเข้าสู่สต็อก
            </p>
            {cancelError ? <p role="alert" className="mt-3 text-sm font-semibold text-red-700 dark:text-red-300">{cancelError}</p> : null}
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setIsCancelDialogOpen(false)} className="min-h-10 rounded-lg border border-zinc-300 px-4 text-sm font-semibold text-zinc-700 dark:border-zinc-700 dark:text-zinc-200">กลับ</button>
              <button type="button" onClick={handleCancelOrder} className="min-h-10 rounded-lg bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-700">ยืนยันยกเลิก</button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

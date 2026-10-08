"use client";

import { AlertCircle, XCircle } from "lucide-react";
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
  getMockOrder,
  cancelMockOrder,
  markMockOrderArrived,
  type MockStoredOrder,
  updateMockOrderPayment,
} from "../../../mocks/storage.mock";

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

  useEffect(() => {
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

    const order = getMockOrder(Number(orderId));
    if (!order) {
      setError("ไม่พบคำสั่งซื้อในอุปกรณ์นี้");
      setIsLoading(false);
      return;
    }
    setStoredOrder(order);
    setIsLoading(false);
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
          user?.role !== "STAFF")
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

  if (
    !isAuthLoading &&
    (user?.role === "CUSTOMER"
      ? storedOrder.ownerUserId !== user.id
      : user?.role !== "ADMIN" && user?.role !== "STAFF")
  ) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
        <AlertCircle aria-hidden="true" className="h-10 w-10 text-red-600" />
        <h1 className="mt-4 text-xl font-bold text-slate-900">
          ไม่มีสิทธิ์ดูคำสั่งซื้อนี้
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          ลูกค้าสามารถดูได้เฉพาะคำสั่งซื้อที่สร้างจากบัญชีของตนเอง
        </p>
        <Link
          href="/account/orders"
          className="mt-5 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
        >
          กลับไปคำสั่งซื้อของฉัน
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
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-900">
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
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="font-bold text-slate-900">สรุปภาษีจำลอง</h2>
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <p className="text-slate-600">
              มังงะยกเว้น VAT:{" "}
              <span className="font-semibold text-slate-900">
                ฿{storedOrder.taxSummary?.mangaVatExemptAmount ?? "0.00"}
              </span>
            </p>
            <p className="text-slate-600">
              ฐานภาษี Figure และค่าจัดส่ง:{" "}
              <span className="font-semibold text-slate-900">
                ฿{storedOrder.taxSummary?.vatBaseAmount ?? "0.00"}
              </span>
            </p>
            <p className="text-slate-600">
              VAT 7% (รวมในยอด):{" "}
              <span className="font-semibold text-slate-900">
                ฿{storedOrder.taxSummary?.vatAmount ?? "0.00"}
              </span>
            </p>
            <p className="text-slate-600">
              ใบกำกับภาษี:{" "}
              <span className="font-semibold text-slate-900">
                {storedOrder.taxSummary?.taxInvoiceRequested
                  ? "ร้องขอแล้ว"
                  : "ไม่ได้ร้องขอ"}
              </span>
            </p>
          </div>
          {storedOrder.taxSummary?.taxInvoiceCustomer ? (
            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm">
              <p className="font-semibold text-slate-900">
                {storedOrder.taxSummary.taxInvoiceCustomer.companyOrName}
              </p>
              <p className="mt-1 text-slate-600">
                เลขประจำตัวผู้เสียภาษี{" "}
                {storedOrder.taxSummary.taxInvoiceCustomer.maskedTaxId}
              </p>
              <p className="mt-1 text-slate-600">
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
      />
      {isCancelDialogOpen ? (
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

"use client";

import { AlertTriangle, Check, PackageCheck, Printer, ScanLine } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import {
  listMockOrders,
  markMockOrderShipped,
  type MockStoredOrder,
} from "../../../mocks/storage.mock";

export default function StaffPackingPage() {
  const { user, isLoading } = useAuth();
  const [orders, setOrders] = useState<MockStoredOrder[]>([]);
  const [shoppingDisabledNotice, setShoppingDisabledNotice] = useState(false);
  const [scannedOrderIds, setScannedOrderIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [labelOrder, setLabelOrder] = useState<MockStoredOrder | null>(null);

  const refreshOrders = useCallback((): void => {
    if (user?.role === "STAFF") {
      setOrders(
        listMockOrders().filter(
          (order) =>
            order.detail.paymentStatus === "PAID" &&
            order.detail.status !== "SHIPPED" &&
            order.detail.status !== "DELIVERED",
        ),
      );
    }
  }, [user?.role]);

  useEffect(() => {
    refreshOrders();
  }, [refreshOrders]);

  useEffect(() => {
    setShoppingDisabledNotice(
      new URLSearchParams(window.location.search).get("notice") ===
        "shopping-disabled",
    );
  }, []);

  function scanOrder(orderId: number): void {
    setError(null);
    setNotice(null);
    setScannedOrderIds((current) =>
      current.includes(orderId) ? current : [...current, orderId],
    );
    setNotice(`สแกนบาร์โค้ดคำสั่งซื้อ #${orderId} ผ่านแล้ว`);
  }

  function printShippingLabel(order: MockStoredOrder): void {
    setError(null);
    setNotice(null);
    if (!scannedOrderIds.includes(order.detail.id)) {
      setError("กรุณาสแกนบาร์โค้ดให้ผ่านก่อนพิมพ์ใบปะหน้า");
      return;
    }
    setLabelOrder(order);
  }

  function shipOrder(orderId: number): void {
    setError(null);
    setNotice(null);
    if (!scannedOrderIds.includes(orderId)) {
      setError("ต้องสแกนบาร์โค้ดก่อนอัปเดตสถานะจัดส่ง");
      return;
    }
    try {
      const shippedOrder = markMockOrderShipped(orderId);
      setOrders((current) =>
        current.filter((order) => order.detail.id !== shippedOrder.detail.id),
      );
      setNotice(
        `อัปเดต ${shippedOrder.detail.orderNumber} เป็นจัดส่งแล้ว · Tracking ${
          shippedOrder.detail.shipments.find(
            (shipment) => shipment.status === "SHIPPED",
          )?.trackingNumber ?? "สร้างแล้ว"
        }`,
      );
    } catch (shipError) {
      setError(
        shipError instanceof Error
          ? shipError.message
          : "อัปเดตสถานะจัดส่งไม่สำเร็จ",
      );
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-5xl items-center justify-center px-4">
        <p role="status" className="text-sm text-slate-500">
          กำลังตรวจสอบสิทธิ์พนักงาน...
        </p>
      </main>
    );
  }

  if (user?.role !== "STAFF" && user?.role !== "ADMIN") {
    return (
      <main className="mx-auto flex min-h-[65vh] max-w-xl flex-col items-center justify-center px-5 text-center">
        <span className="rounded-2xl bg-red-50 p-4 text-red-700">
          <AlertTriangle size={32} aria-hidden="true" />
        </span>
        <p className="mt-5 text-sm font-bold uppercase tracking-wider text-red-700">
          HTTP 403 · Access Denied
        </p>
        <h1 className="mt-2 text-2xl font-extrabold text-slate-950">
          หน้านี้สำหรับพนักงานคลังสินค้าเท่านั้น
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          ต้องเป็น STAFF หรือ ADMIN เพื่อเข้าถึงหน้าจัดการคลังสินค้า
        </p>
        <Link href="/" className="mt-5 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white">
          กลับหน้าร้าน
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-[75vh] max-w-6xl px-4 py-8 pb-28 sm:px-6 lg:px-8">
      {shoppingDisabledNotice ? (
        <p
          role="status"
          className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900"
        >
          บัญชีเจ้าหน้าที่ไม่สามารถทำรายการสั่งซื้อได้
        </p>
      ) : null}
      <header className="flex flex-col gap-3 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold text-orange-700">STAFF · WAREHOUSE</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950">
            คลังสินค้าและจัดส่ง
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            รายการที่แสดงเป็น Mock Order ที่ชำระครบและรอแพ็กจัดส่ง
          </p>
        </div>
        <div className="rounded-xl bg-orange-50 px-4 py-3 text-sm font-bold text-orange-900">
          รอแพ็ก {orders.length} คำสั่งซื้อ
        </div>
      </header>

      {error ? (
        <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-800">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          {notice}
        </p>
      ) : null}

      {orders.length === 0 ? (
        <section className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <PackageCheck className="mx-auto h-10 w-10 text-slate-400" aria-hidden="true" />
          <h2 className="mt-3 font-bold text-slate-900">ไม่มีคำสั่งซื้อรอแพ็ก</h2>
          <p className="mt-1 text-sm text-slate-500">
            เมื่อมีคำสั่งซื้อที่ชำระครบ รายการจะแสดงในหน้านี้
          </p>
        </section>
      ) : (
        <div className="mt-6 space-y-4">
          {orders.map((order) => {
            const scanned = scannedOrderIds.includes(order.detail.id);
            return (
              <article
                key={order.detail.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-extrabold text-slate-950">
                        {order.detail.orderNumber}
                      </h2>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-extrabold text-emerald-800">
                        PAID
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      Order ID {order.detail.id} · {order.detail.items.length} รายการ
                    </p>
                    <ul className="mt-4 space-y-2">
                      {order.detail.items.map((item) => (
                        <li key={item.id} className="flex justify-between gap-4 text-sm">
                          <span className="text-slate-700">
                            {item.title} × {item.quantity}
                          </span>
                          <span className="shrink-0 font-semibold text-slate-900">
                            ฿{item.lineTotal.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-4 text-sm font-extrabold text-slate-950">
                      ยอดชำระแล้ว ฿{order.detail.paidAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="grid shrink-0 gap-2 sm:grid-cols-3 lg:w-[34rem]">
                    <button
                      type="button"
                      onClick={() => scanOrder(order.detail.id)}
                      disabled={scanned}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 text-sm font-bold text-orange-900 hover:bg-orange-100 disabled:border-emerald-200 disabled:bg-emerald-50 disabled:text-emerald-800"
                    >
                      {scanned ? <Check size={17} /> : <ScanLine size={17} />}
                      {scanned ? "สแกนผ่านแล้ว" : "สแกนบาร์โค้ดผ่าน"}
                    </button>
                    <button
                      type="button"
                      onClick={() => printShippingLabel(order)}
                      disabled={!scanned}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Printer size={17} />
                      พิมพ์ใบปะหน้า
                    </button>
                    <button
                      type="button"
                      onClick={() => shipOrder(order.detail.id)}
                      disabled={!scanned}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-950 px-3 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      อัปเดตเป็นจัดส่งแล้ว
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {labelOrder ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 print:static print:block print:bg-white print:p-0"
          role="dialog"
          aria-modal="true"
          aria-labelledby="shipping-label-title"
        >
          <section className="w-full max-w-xl rounded-2xl bg-white p-6 text-zinc-950 shadow-2xl print-label print:max-w-none print:rounded-none print:p-0 print:shadow-none">
            <header className="flex items-start justify-between border-b-2 border-zinc-950 pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em]">Shipping label</p>
                <h2 id="shipping-label-title" className="mt-1 text-xl font-extrabold">
                  ใบปะหน้าพัสดุ
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setLabelOrder(null)}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold print:hidden"
              >
                ปิด
              </button>
            </header>
            <div className="grid gap-5 py-5 sm:grid-cols-2">
              <div className="border-b border-zinc-300 pb-4 sm:border-b-0 sm:border-r sm:pr-4">
                <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-500">ผู้ส่ง</h3>
                <p className="mt-2 font-extrabold">Manga & Collectibles Store</p>
                <p className="text-sm">ฝ่ายคลังสินค้าและจัดส่ง</p>
              </div>
              <div className="pb-4">
                <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-500">ผู้รับ</h3>
                {labelOrder.shippingAddress ? (
                  <>
                    <p className="mt-2 font-extrabold">{labelOrder.shippingAddress.recipientName}</p>
                    <p className="text-sm">{labelOrder.shippingAddress.recipientPhone}</p>
                    <p className="mt-1 text-sm leading-6">
                      {[
                        labelOrder.shippingAddress.addressLine,
                        labelOrder.shippingAddress.addressVillage,
                        labelOrder.shippingAddress.street,
                        labelOrder.shippingAddress.subdistrict,
                        labelOrder.shippingAddress.district,
                        labelOrder.shippingAddress.province,
                        labelOrder.shippingAddress.postalCode,
                      ].filter(Boolean).join(" ")}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-zinc-600">
                    ไม่มีข้อมูลที่อยู่จัดส่งในคำสั่งซื้อนี้
                  </p>
                )}
              </div>
            </div>
            <div className="border-y-2 border-zinc-950 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">คำสั่งซื้อ</p>
              <p className="mt-1 text-lg font-extrabold">{labelOrder.detail.orderNumber}</p>
              <ul className="mt-3 space-y-1 text-sm">
                {labelOrder.detail.items.map((item) => (
                  <li key={item.id}>{item.title} × {item.quantity}</li>
                ))}
              </ul>
            </div>
            <div className="py-5 text-center">
              <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Barcode</p>
              <div
                aria-label={`Barcode จำลอง ${labelOrder.detail.orderNumber}`}
                className="mx-auto mt-2 h-16 w-64 max-w-full bg-[repeating-linear-gradient(90deg,#111_0px,#111_2px,transparent_2px,transparent_4px,#111_4px,#111_5px,transparent_5px,transparent_8px)]"
              />
              <p className="mt-1 font-mono text-sm font-bold">{labelOrder.detail.orderNumber}</p>
            </div>
            <footer className="flex justify-end gap-2 print:hidden">
              <button
                type="button"
                onClick={() => setLabelOrder(null)}
                className="min-h-10 rounded-lg border border-zinc-300 px-4 text-sm font-semibold"
              >
                ปิด
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-bold text-white"
              >
                <Printer size={16} aria-hidden="true" />
                พิมพ์เอกสาร
              </button>
            </footer>
          </section>
        </div>
      ) : null}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .print-label,
          .print-label * {
            visibility: visible !important;
          }
          .print-label {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            color: #000 !important;
            background: #fff !important;
            border: 1px solid #000 !important;
            padding: 24px !important;
          }
        }
      `}</style>
    </main>
  );
}

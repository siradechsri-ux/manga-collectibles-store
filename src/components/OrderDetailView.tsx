"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  CreditCard,
  Package,
  PackageCheck,
  QrCode,
  Truck,
  X,
} from "lucide-react";

export type OrderTrackingStatus =
  | "UNPAID"
  | "CANCELLED"
  | "ORDER_PLACED"
  | "DEPOSIT_PAID"
  | "AWAITING_BALANCE_PAYMENT"
  | "PAID"
  | "PACKING"
  | "SHIPPED"
  | "DELIVERED"
  | "DEPOSIT_FORFEITED";

export type OrderTimelineStage =
  | "ORDER_PLACED"
  | "DEPOSIT_PAID"
  | "ARRIVED_IN_THAILAND"
  | "SHIPPED";

export type ShipmentCarrier = "FLASH" | "THAI_POST";

export interface OrderTrackingLineItem {
  id: string;
  productVariantId?: number;
  title: string;
  productType: "MANGA" | "FIGURE";
  volumeLabel?: string;
  quantity: number;
  imageUrl?: string;
  paymentType: "FULL" | "DEPOSIT";
  lineTotal: number;
  remainingBalance: number;
  isPreorder: boolean;
}

export interface OrderTimelineEvent {
  stage: OrderTimelineStage;
  label: string;
  occurredAt: string | null;
}

export interface OrderShipment {
  id: string;
  label: string;
  shipmentType: "IN_STOCK" | "PREORDER";
  status: "PREPARING" | "SHIPPED" | "DELIVERED";
  carrier: ShipmentCarrier | null;
  trackingNumber: string | null;
  shippedAt: string | null;
  items: Array<{
    id: string;
    title: string;
    quantity: number;
  }>;
}

export interface OrderTrackingDetail {
  id: number;
  orderNumber: string;
  createdAt: string;
  status: OrderTrackingStatus;
  timelineStage: OrderTimelineStage;
  paymentStatus: "UNPAID" | "PAID" | "DEPOSIT_PAID" | "DEPOSIT_FORFEITED";
  totalAmount: number;
  paidAmount: number;
  remainingBalance: number;
  balanceDueDate: string | null;
  items: OrderTrackingLineItem[];
  timeline: OrderTimelineEvent[];
  shipments: OrderShipment[];
}

export interface BalanceSlipUploadRequest {
  orderId: number;
  paymentStage: "BALANCE";
  file: File;
}

export interface OrderDetailViewProps {
  order: OrderTrackingDetail;
  promptPayQrCodeUrl?: string;
  getPaymentQrCodeUrl?: (amount: number) => Promise<string>;
  onUploadBalanceSlip: (
    request: BalanceSlipUploadRequest,
  ) => Promise<void>;
}

interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const timelineSteps: Array<{
  stage: OrderTimelineStage;
  title: string;
  description: string;
}> = [
  {
    stage: "ORDER_PLACED",
    title: "สั่งซื้อแล้ว",
    description: "ได้รับคำสั่งซื้อเรียบร้อย",
  },
  {
    stage: "DEPOSIT_PAID",
    title: "รับยอดมัดจำ",
    description: "ยืนยันยอดชำระงวดแรกแล้ว",
  },
  {
    stage: "ARRIVED_IN_THAILAND",
    title: "สินค้าเข้าไทย",
    description: "สินค้าถึงคลังในประเทศไทย",
  },
  {
    stage: "SHIPPED",
    title: "จัดส่งแล้ว",
    description: "พัสดุอยู่ระหว่างจัดส่ง",
  },
];

const currencyFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 2,
});

const dateTimeFormatter = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDateTime(value: string | null): string {
  if (!value) {
    return "รอดำเนินการ";
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime())
    ? "วันเวลาไม่ถูกต้อง"
    : dateTimeFormatter.format(parsedDate);
}

function getCountdownParts(deadline: number, now: number): CountdownParts | null {
  const remainingMilliseconds = deadline - now;
  if (remainingMilliseconds <= 0) {
    return null;
  }

  const remainingSeconds = Math.floor(remainingMilliseconds / 1000);
  return {
    days: Math.floor(remainingSeconds / 86_400),
    hours: Math.floor((remainingSeconds % 86_400) / 3_600),
    minutes: Math.floor((remainingSeconds % 3_600) / 60),
    seconds: remainingSeconds % 60,
  };
}

function twoDigits(value: number): string {
  return String(value).padStart(2, "0");
}

function getTrackingUrl(
  carrier: ShipmentCarrier,
  trackingNumber: string,
): string {
  const encodedNumber = encodeURIComponent(trackingNumber);
  if (carrier === "FLASH") {
    return `https://www.flashexpress.com/fle/tracking?se=${encodedNumber}`;
  }
  return `https://track.thailandpost.co.th/?trackNumber=${encodedNumber}`;
}

function getCarrierName(carrier: ShipmentCarrier): string {
  return carrier === "FLASH" ? "Flash Express" : "ไปรษณีย์ไทย";
}

function getTimelineIndex(stage: OrderTimelineStage): number {
  return timelineSteps.findIndex((step) => step.stage === stage);
}

export default function OrderDetailView({
  order,
  promptPayQrCodeUrl,
  getPaymentQrCodeUrl,
  onUploadBalanceSlip,
}: OrderDetailViewProps) {
  const [now, setNow] = useState(() => Date.now());
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState<File | null>(null);
  const [isSubmittingSlip, setIsSubmittingSlip] = useState(false);
  const [modalQrCodeUrl, setModalQrCodeUrl] = useState<string | null>(
    promptPayQrCodeUrl ?? null,
  );
  const [isLoadingPaymentQr, setIsLoadingPaymentQr] = useState(false);
  const [slipError, setSlipError] = useState<string | null>(null);
  const [slipSuccess, setSlipSuccess] = useState<string | null>(null);
  const [copiedTrackingNumber, setCopiedTrackingNumber] = useState<string | null>(
    null,
  );
  const [copyError, setCopyError] = useState<string | null>(null);

  const dueDateTimestamp = order.balanceDueDate
    ? new Date(order.balanceDueDate).getTime()
    : Number.NaN;
  const hasValidDueDate = Number.isFinite(dueDateTimestamp);
  const countdown = hasValidDueDate
    ? getCountdownParts(dueDateTimestamp, now)
    : null;
  const isAwaitingBalance =
    order.status === "AWAITING_BALANCE_PAYMENT" &&
    order.remainingBalance > 0 &&
    hasValidDueDate;
  const currentTimelineIndex = getTimelineIndex(order.timelineStage);

  const mangaItems = useMemo(
    () => order.items.filter((item) => item.productType === "MANGA"),
    [order.items],
  );
  const figureItems = useMemo(
    () => order.items.filter((item) => item.productType === "FIGURE"),
    [order.items],
  );
  const inStockShipments = useMemo(
    () => order.shipments.filter((shipment) => shipment.shipmentType === "IN_STOCK"),
    [order.shipments],
  );
  const preorderShipments = useMemo(
    () => order.shipments.filter((shipment) => shipment.shipmentType === "PREORDER"),
    [order.shipments],
  );

  useEffect(() => {
    if (!hasValidDueDate || dueDateTimestamp <= Date.now()) {
      return;
    }

    const intervalId = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(intervalId);
  }, [dueDateTimestamp, hasValidDueDate]);

  useEffect(() => {
    setIsPaymentModalOpen(false);
    setSelectedSlip(null);
    setSlipError(null);
    setSlipSuccess(null);
  }, [order.id]);

  useEffect(() => {
    if (!isPaymentModalOpen) {
      return;
    }

    let active = true;
    if (getPaymentQrCodeUrl) {
      setModalQrCodeUrl(null);
      setIsLoadingPaymentQr(true);
      void getPaymentQrCodeUrl(order.remainingBalance)
        .then((url) => {
          if (active) {
            setModalQrCodeUrl(url);
          }
        })
        .catch((error: unknown) => {
          if (active) {
            setSlipError(
              error instanceof Error
                ? error.message
                : "ไม่สามารถเตรียม QR สำหรับยอดคงเหลือได้",
            );
          }
        })
        .finally(() => {
          if (active) {
            setIsLoadingPaymentQr(false);
          }
        });
    } else {
      setModalQrCodeUrl(promptPayQrCodeUrl ?? null);
    }
    return () => {
      active = false;
    };
  }, [
    getPaymentQrCodeUrl,
    isPaymentModalOpen,
    order.remainingBalance,
    promptPayQrCodeUrl,
  ]);

  useEffect(() => {
    if (!isPaymentModalOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmittingSlip) {
        setIsPaymentModalOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPaymentModalOpen, isSubmittingSlip]);

  async function copyTrackingNumber(trackingNumber: string) {
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(trackingNumber);
      setCopiedTrackingNumber(trackingNumber);
      window.setTimeout(() => setCopiedTrackingNumber(null), 2_000);
    } catch {
      setCopyError("คัดลอกเลขพัสดุไม่สำเร็จ กรุณาคัดลอกด้วยตนเอง");
    }
  }

  function handleSlipSelection(file: File | undefined) {
    setSlipError(null);
    setSlipSuccess(null);

    if (!file) {
      setSelectedSlip(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setSelectedSlip(null);
      setSlipError("กรุณาเลือกไฟล์รูปภาพสำหรับสลิป");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSelectedSlip(null);
      setSlipError("ไฟล์สลิปต้องมีขนาดไม่เกิน 5 MB");
      return;
    }

    setSelectedSlip(file);
  }

  async function handleSlipSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSlipError(null);
    setSlipSuccess(null);

    if (!selectedSlip) {
      setSlipError("กรุณาเลือกรูปสลิปก่อนยืนยัน");
      return;
    }
    if (!isAwaitingBalance) {
      setSlipError("คำสั่งซื้อนี้ยังไม่พร้อมรับชำระยอดคงเหลือ");
      return;
    }

    setIsSubmittingSlip(true);
    try {
      await onUploadBalanceSlip({
        orderId: order.id,
        paymentStage: "BALANCE",
        file: selectedSlip,
      });
      setSlipSuccess("ส่งสลิปตรวจสอบเรียบร้อยแล้ว");
      setSelectedSlip(null);
      setIsPaymentModalOpen(false);
    } catch (error) {
      setSlipError(
        error instanceof Error
          ? error.message
          : "ส่งสลิปไม่สำเร็จ กรุณาลองอีกครั้ง",
      );
    } finally {
      setIsSubmittingSlip(false);
    }
  }

  function renderShipmentCards(shipments: OrderShipment[]) {
    if (shipments.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
          ยังไม่มีข้อมูลการจัดส่ง
        </div>
      );
    }

    return shipments.map((shipment) => (
      <article
        key={shipment.id}
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                shipment.shipmentType === "IN_STOCK"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-violet-50 text-violet-700"
              }`}
            >
              {shipment.shipmentType === "IN_STOCK" ? (
                <PackageCheck size={20} aria-hidden="true" />
              ) : (
                <Package size={20} aria-hidden="true" />
              )}
            </span>
            <div>
              <h4 className="font-bold text-slate-900">{shipment.label}</h4>
              <p className="mt-1 text-xs text-slate-500">
                {shipment.shipmentType === "IN_STOCK"
                  ? "กล่องสินค้าพร้อมส่ง"
                  : "กล่องสินค้าพรีออเดอร์"}
              </p>
            </div>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
              shipment.status === "DELIVERED"
                ? "bg-emerald-100 text-emerald-800"
                : shipment.status === "SHIPPED"
                  ? "bg-sky-100 text-sky-800"
                  : "bg-amber-100 text-amber-800"
            }`}
          >
            {shipment.status === "DELIVERED"
              ? "จัดส่งสำเร็จ"
              : shipment.status === "SHIPPED"
                ? "กำลังจัดส่ง"
                : "กำลังเตรียมพัสดุ"}
          </span>
        </div>

        <ul className="mt-4 space-y-2 border-t border-slate-100 pt-3">
          {shipment.items.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 text-sm"
            >
              <span className="text-slate-700">{item.title}</span>
              <span className="shrink-0 text-slate-500">x{item.quantity}</span>
            </li>
          ))}
        </ul>

        {shipment.trackingNumber && shipment.carrier ? (
          <div className="mt-4 rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">
              {getCarrierName(shipment.carrier)} ·{" "}
              {formatDateTime(shipment.shippedAt)}
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <span className="break-all font-mono text-sm font-bold text-slate-900">
                {shipment.trackingNumber}
              </span>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => void copyTrackingNumber(shipment.trackingNumber!)}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-300"
                >
                  {copiedTrackingNumber === shipment.trackingNumber ? (
                    <Check size={14} aria-hidden="true" />
                  ) : (
                    <Copy size={14} aria-hidden="true" />
                  )}
                  {copiedTrackingNumber === shipment.trackingNumber
                    ? "คัดลอกแล้ว"
                    : "คัดลอก"}
                </button>
                <a
                  href={getTrackingUrl(shipment.carrier, shipment.trackingNumber)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white transition hover:bg-slate-700"
                >
                  ติดตามพัสดุ
                  <ArrowUpRight size={14} aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        ) : null}
      </article>
    ));
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-12 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">รายละเอียดคำสั่งซื้อ</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
            {order.orderNumber}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            สั่งซื้อเมื่อ {formatDateTime(order.createdAt)}
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
          <Clock3 size={16} aria-hidden="true" />
          {order.status === "AWAITING_BALANCE_PAYMENT"
            ? "รอชำระยอดคงเหลือ"
            : order.status === "DEPOSIT_FORFEITED"
              ? "หมดเขตชำระยอดคงเหลือ"
              : order.status === "DELIVERED"
                ? "จัดส่งสำเร็จ"
                : order.status === "SHIPPED"
                  ? "จัดส่งแล้ว"
                  : order.status === "PACKING"
                    ? "กำลังแพ็กสินค้า"
                    : order.status === "PAID"
                      ? "ชำระเงินแล้ว"
                      : order.status === "DEPOSIT_PAID"
                        ? "ชำระมัดจำแล้ว"
                        : order.status === "CANCELLED"
                          ? "ยกเลิกแล้ว"
                          : "ได้รับคำสั่งซื้อ"}
        </span>
      </header>

      {copyError ? (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {copyError}
        </p>
      ) : null}

      {order.status === "AWAITING_BALANCE_PAYMENT" ? (
        <section
          aria-labelledby="balance-payment-alert"
          className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 sm:p-5"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              className="mt-0.5 shrink-0 text-red-600"
              size={22}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <h2 id="balance-payment-alert" className="font-bold text-red-900">
                สินค้าถึงไทยแล้ว! กรุณาชำระยอดคงค้างภายใน{" "}
                {formatDateTime(order.balanceDueDate)}
              </h2>
              {countdown ? (
                <div className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-bold text-red-800 ring-1 ring-red-100">
                  <Clock3 size={16} aria-hidden="true" />
                  เหลือเวลา {countdown.days} วัน {twoDigits(countdown.hours)}:
                  {twoDigits(countdown.minutes)}:{twoDigits(countdown.seconds)}
                </div>
              ) : hasValidDueDate ? (
                <p className="mt-2 text-sm font-semibold text-red-700">
                  เลยกำหนดชำระยอดคงเหลือแล้ว
                </p>
              ) : (
                <p className="mt-2 text-sm text-red-700">
                  ไม่พบกำหนดชำระ กรุณาติดต่อฝ่ายบริการลูกค้า
                </p>
              )}
              {isAwaitingBalance ? (
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                >
                  <CreditCard size={17} aria-hidden="true" />
                  ชำระยอดคงเหลือ {currencyFormatter.format(order.remainingBalance)}
                </button>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
      {order.status === "CANCELLED" ? (
        <div
          role="status"
          className="mb-6 flex items-center gap-2 rounded-2xl border border-zinc-300 bg-zinc-100 p-4 text-sm font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        >
          <AlertTriangle size={18} aria-hidden="true" />
          คำสั่งซื้อนี้ถูกยกเลิกแล้ว
        </div>
      ) : null}

      <section
        aria-labelledby="order-progress-heading"
        className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
      >
        <h2 id="order-progress-heading" className="text-lg font-bold text-slate-900">
          ความคืบหน้าคำสั่งซื้อ
        </h2>
        <ol className="mt-6 grid grid-cols-1 gap-0 sm:grid-cols-4 sm:gap-2">
          {timelineSteps.map((step, index) => {
            const event = order.timeline.find((item) => item.stage === step.stage);
            const isComplete = index <= currentTimelineIndex;
            const isCurrent = index === currentTimelineIndex;

            return (
              <li key={step.stage} className="relative flex gap-3 pb-6 last:pb-0 sm:block sm:pb-0">
                {index < timelineSteps.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className={`absolute left-[15px] top-8 h-[calc(100%-1.25rem)] w-0.5 sm:left-8 sm:top-[15px] sm:h-0.5 sm:w-[calc(100%-2rem)] ${
                      index < currentTimelineIndex ? "bg-emerald-500" : "bg-slate-200"
                    }`}
                  />
                ) : null}
                <span
                  className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 sm:mx-auto ${
                    isComplete
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-slate-300 bg-white text-slate-400"
                  }`}
                >
                  {isComplete ? (
                    <Check size={15} strokeWidth={3} aria-hidden="true" />
                  ) : (
                    <span className="text-xs font-bold">{index + 1}</span>
                  )}
                </span>
                <div className="min-w-0 sm:mt-3 sm:text-center">
                  <p
                    className={`text-sm font-bold ${
                      isCurrent ? "text-emerald-800" : "text-slate-800"
                    }`}
                  >
                    {step.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{step.description}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {formatDateTime(event?.occurredAt ?? null)}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-6">
          <section
            aria-labelledby="order-items-heading"
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
          >
            <h2 id="order-items-heading" className="text-lg font-bold text-slate-900">
              รายการสินค้า
            </h2>

            {mangaItems.length > 0 ? (
              <div className="mt-5">
                <h3 className="mb-3 text-sm font-bold text-slate-700">มังงะ</h3>
                <ul className="space-y-3">
                  {mangaItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex gap-3 rounded-xl border border-slate-100 p-3"
                    >
                      <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-slate-400">
                            <Package size={22} aria-hidden="true" />
                          </div>
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 sm:flex-row sm:items-center">
                        <div>
                          <p className="font-semibold text-slate-900">{item.title}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {item.volumeLabel ? `${item.volumeLabel} · ` : ""}
                            {item.isPreorder ? "พรีออเดอร์" : "เล่มพร้อมส่ง"} · จำนวน{" "}
                            {item.quantity}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-bold text-slate-900">
                          {currencyFormatter.format(item.lineTotal)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {figureItems.length > 0 ? (
              <div className="mt-5">
                <h3 className="mb-3 text-sm font-bold text-slate-700">ฟิกเกอร์</h3>
                <ul className="space-y-3">
                  {figureItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex gap-3 rounded-xl border border-slate-100 p-3"
                    >
                      <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-slate-400">
                            <Package size={22} aria-hidden="true" />
                          </div>
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 sm:flex-row sm:items-center">
                        <div>
                          <p className="font-semibold text-slate-900">{item.title}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            จำนวน {item.quantity}
                          </p>
                          <span
                            className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              item.paymentType === "DEPOSIT"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-sky-100 text-sky-800"
                            }`}
                          >
                            {item.paymentType === "DEPOSIT"
                              ? `วางมัดจำ · คงเหลือ ${currencyFormatter.format(item.remainingBalance)}`
                              : "จ่ายเต็มจำนวน"}
                          </span>
                        </div>
                        <p className="shrink-0 text-sm font-bold text-slate-900">
                          {currencyFormatter.format(item.lineTotal)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <section
            aria-labelledby="shipments-heading"
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
          >
            <h2 id="shipments-heading" className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Truck size={20} aria-hidden="true" />
              การจัดส่ง
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-emerald-800">
                  <PackageCheck size={17} aria-hidden="true" />
                  กล่องสินค้าพร้อมส่ง
                </h3>
                <div className="space-y-3">{renderShipmentCards(inStockShipments)}</div>
              </div>
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-violet-800">
                  <Package size={17} aria-hidden="true" />
                  กล่องพรีออเดอร์
                </h3>
                <div className="space-y-3">{renderShipmentCards(preorderShipments)}</div>
              </div>
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold text-slate-900">สรุปคำสั่งซื้อ</h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">ยอดรวมสินค้า</dt>
              <dd className="font-semibold text-slate-900">
                {currencyFormatter.format(order.totalAmount)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">ชำระแล้ว</dt>
              <dd className="font-semibold text-slate-900">
                {currencyFormatter.format(order.paidAmount)}
              </dd>
            </div>
            <div className="border-t border-slate-100 pt-3">
              <div className="flex justify-between gap-4">
                <dt className="font-semibold text-slate-700">ยอดคงเหลือ</dt>
                <dd className="font-bold text-slate-900">
                  {currencyFormatter.format(order.remainingBalance)}
                </dd>
              </div>
            </div>
          </dl>

          {order.paymentStatus === "DEPOSIT_FORFEITED" ? (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              ยอดคงเหลือเลยกำหนดชำระและถูกริบมัดจำแล้ว
            </div>
          ) : null}
          {order.paymentStatus === "PAID" ? (
            <div className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
              <CheckCircle2 size={18} aria-hidden="true" />
              ชำระเงินครบแล้ว
            </div>
          ) : null}
        </aside>
      </div>

      {isPaymentModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSubmittingSlip) {
              setIsPaymentModalOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="balance-payment-modal-title"
            className="max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-orange-700">ชำระยอดคงเหลือ</p>
                <h2
                  id="balance-payment-modal-title"
                  className="mt-1 text-xl font-extrabold text-slate-950"
                >
                  {currencyFormatter.format(order.remainingBalance)}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                disabled={isSubmittingSlip}
                aria-label="ปิดหน้าต่างชำระเงิน"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
              >
                <X size={19} aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <QrCode size={19} className="text-orange-600" aria-hidden="true" />
                {getPaymentQrCodeUrl
                  ? "QR จำลองสำหรับทดสอบ (ไม่รองรับการชำระเงินจริง)"
                  : "สแกนจ่ายผ่าน PromptPay"}
              </div>
              {modalQrCodeUrl ? (
                <img
                  src={modalQrCodeUrl}
                  alt={
                    getPaymentQrCodeUrl
                      ? "QR จำลองสำหรับยอดคงเหลือ"
                      : "PromptPay QR Code สำหรับชำระยอดคงเหลือ"
                  }
                  className="mx-auto mt-4 aspect-square w-52 rounded-xl border border-slate-200 bg-white object-contain p-2"
                />
              ) : (
                <div className="mx-auto mt-4 flex aspect-square w-52 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-5 text-center text-sm text-slate-500">
                  <QrCode size={34} className="mb-2 text-slate-400" aria-hidden="true" />
                  {isLoadingPaymentQr
                    ? "กำลังสร้าง QR จำลอง..."
                    : "ยังไม่มี QR Code สำหรับคำสั่งซื้อนี้"}
                </div>
              )}
              {getPaymentQrCodeUrl ? (
                <p className="mt-3 rounded-lg bg-amber-50 p-2 text-center text-xs font-semibold leading-5 text-amber-900">
                  Prototype เท่านั้น: ห้ามใช้ QR นี้โอนเงินจริง
                </p>
              ) : null}
              <p className="mt-3 text-center text-xs text-slate-500">
                ตรวจสอบยอดและชื่อบัญชีก่อนยืนยันการโอนทุกครั้ง
              </p>
            </div>

            <form onSubmit={(event) => void handleSlipSubmit(event)} className="mt-5">
              <label
                htmlFor="balance-payment-slip"
                className="block text-sm font-bold text-slate-800"
              >
                อัปโหลดสลิปการโอน
              </label>
              <input
                id="balance-payment-slip"
                type="file"
                accept="image/*"
                onChange={(event) => handleSlipSelection(event.currentTarget.files?.[0])}
                disabled={isSubmittingSlip}
                className="mt-2 block w-full cursor-pointer rounded-xl border border-slate-200 bg-white text-sm text-slate-600 file:mr-4 file:min-h-11 file:border-0 file:bg-slate-100 file:px-4 file:font-semibold file:text-slate-700 hover:file:bg-slate-200 disabled:cursor-not-allowed"
              />
              <p className="mt-2 text-xs text-slate-500">
                รองรับรูปภาพขนาดไม่เกิน 5 MB
              </p>
              {selectedSlip ? (
                <p className="mt-2 break-all text-xs font-medium text-slate-700">
                  ไฟล์ที่เลือก: {selectedSlip.name}
                </p>
              ) : null}

              {slipError ? (
                <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {slipError}
                </p>
              ) : null}
              {slipSuccess ? (
                <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
                  {slipSuccess}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={!selectedSlip || isSubmittingSlip}
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isSubmittingSlip ? (
                  <>
                    <span
                      className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                      aria-hidden="true"
                    />
                    กำลังส่งสลิป...
                  </>
                ) : (
                  "ยืนยันและตรวจสอบสลิป"
                )}
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}

export const mockOrderTrackingDetail: OrderTrackingDetail = {
  id: 1042,
  orderNumber: "MIX-2026-001042",
  createdAt: "2026-10-01T09:30:00+07:00",
  status: "AWAITING_BALANCE_PAYMENT",
  timelineStage: "ARRIVED_IN_THAILAND",
  paymentStatus: "DEPOSIT_PAID",
  totalAmount: 3_450,
  paidAmount: 2_100,
  remainingBalance: 1_350,
  balanceDueDate: "2026-10-22T23:59:59+07:00",
  items: [
    {
      id: "manga-1042-1",
      title: "มหาศึกคนชนเทพ เล่ม 20",
      productType: "MANGA",
      volumeLabel: "เล่มปกติ",
      quantity: 1,
      paymentType: "FULL",
      lineTotal: 120,
      remainingBalance: 0,
      isPreorder: false,
    },
    {
      id: "figure-1042-1",
      title: "Nendoroid - ตัวละครตัวอย่าง",
      productType: "FIGURE",
      quantity: 1,
      paymentType: "DEPOSIT",
      lineTotal: 3_000,
      remainingBalance: 1_350,
      isPreorder: true,
    },
  ],
  timeline: [
    {
      stage: "ORDER_PLACED",
      label: "สั่งซื้อแล้ว",
      occurredAt: "2026-10-01T09:30:00+07:00",
    },
    {
      stage: "DEPOSIT_PAID",
      label: "รับยอดมัดจำ",
      occurredAt: "2026-10-01T09:40:00+07:00",
    },
    {
      stage: "ARRIVED_IN_THAILAND",
      label: "สินค้าเข้าไทย",
      occurredAt: "2026-10-08T10:00:00+07:00",
    },
    {
      stage: "SHIPPED",
      label: "จัดส่งแล้ว",
      occurredAt: null,
    },
  ],
  shipments: [
    {
      id: "shipment-1042-manga",
      label: "รอบจัดส่งที่ 1",
      shipmentType: "IN_STOCK",
      status: "SHIPPED",
      carrier: "FLASH",
      trackingNumber: "TH1234567890",
      shippedAt: "2026-10-02T14:15:00+07:00",
      items: [
        {
          id: "manga-1042-1",
          title: "มหาศึกคนชนเทพ เล่ม 20",
          quantity: 1,
        },
      ],
    },
    {
      id: "shipment-1042-figure",
      label: "รอบจัดส่งที่ 2",
      shipmentType: "PREORDER",
      status: "PREPARING",
      carrier: null,
      trackingNumber: null,
      shippedAt: null,
      items: [
        {
          id: "figure-1042-1",
          title: "Nendoroid - ตัวละครตัวอย่าง",
          quantity: 1,
        },
      ],
    },
  ],
};

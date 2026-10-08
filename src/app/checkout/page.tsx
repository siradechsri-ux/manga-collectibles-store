"use client";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CreditCard,
  MapPin,
  Minus,
  Package,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import {
  FigureCartItem,
  MangaCartItem,
  useCart,
} from "../../context/CartContext";
import {
  CheckoutTaxItem,
  ShippingAddress,
  TaxInvoiceForm,
  TaxInvoiceFormData,
} from "../../components/TaxInvoiceForm";
import { useAuth } from "../../contexts/AuthContext";
import {
  getUserProfile,
  listShippingAddresses,
  saveShippingAddress,
  setDefaultShippingAddress,
  type ShippingAddress as SavedShippingAddress,
} from "../../mocks/profile.mock";
import { saveMockOrder } from "../../mocks/storage.mock";
import { getCheckoutInventorySnapshot } from "../../mocks/admin-products.mock";

type ShipmentPolicy = "SHIP_TOGETHER" | "SPLIT_SHIPMENT";

interface ShippingFormValues {
  recipientName: string;
  recipientPhone: string;
  addressLine: string;
  addressVillage: string;
  street: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
}

const shippingAddressSchema = z
  .object({
    recipientName: z.string().trim().min(2, "กรุณากรอกชื่อผู้รับอย่างน้อย 2 ตัวอักษร").max(150),
    recipientPhone: z
      .string()
      .trim()
      .min(8, "กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง")
      .max(30)
      .regex(/^[0-9+(). -]+$/, "รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง"),
    addressLine: z.string().trim().min(1, "กรุณากรอกบ้านเลขที่/ที่อยู่").max(300),
    addressVillage: z.string().trim().max(100),
    street: z.string().trim().max(150),
    subdistrict: z.string().trim().min(1, "กรุณากรอกตำบล/แขวง").max(120),
    district: z.string().trim().min(1, "กรุณากรอกอำเภอ/เขต").max(120),
    province: z.string().trim().min(1, "กรุณากรอกจังหวัด").max(120),
    postalCode: z.string().trim().regex(/^\d{5}$/, "รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก"),
  })
  .strict();

const checkoutResponseSchema = z
  .object({
    success: z.literal(true),
    data: z
      .object({
        orderId: z.union([
          z.number().int().positive().safe(),
          z.string().regex(/^[1-9]\d*$/),
        ]),
        orderNumber: z.string().min(1),
        totalAmount: z.string().regex(/^\d+(?:\.\d{1,2})?$/),
        shippingFee: z.string().regex(/^\d+(?:\.\d{1,2})?$/),
        immediateAmount: z.string().regex(/^\d+(?:\.\d{1,2})?$/),
        remainingBalanceAmount: z.string().regex(/^\d+(?:\.\d{1,2})?$/),
        paymentStatus: z.enum(["UNPAID", "PAID", "DEPOSIT_PAID"]),
        paymentQrCodeDataUrl: z
          .string()
          .regex(
            /^(?:data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+|data:image\/svg\+xml;charset=utf-8,%3Csvg[\s\S]+)$/i,
          )
          .optional(),
        paymentQrError: z.string().optional(),
        paymentUrl: z.string().url().optional(),
      })
      .passthrough(),
  })
  .passthrough();

const errorResponseSchema = z
  .object({
    success: z.literal(false),
    error: z
      .object({
        message: z.string().optional(),
      })
      .optional(),
  })
  .passthrough();

const EMPTY_SHIPPING_ADDRESS: ShippingFormValues = {
  recipientName: "",
  recipientPhone: "",
  addressLine: "",
  addressVillage: "",
  street: "",
  subdistrict: "",
  district: "",
  province: "",
  postalCode: "",
};

const currencyFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function money(value: number): string {
  return currencyFormatter.format(value);
}

function getApiUrl(path: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, "");
  return `${baseUrl ?? ""}${path}`;
}

function itemTypeLabel(item: MangaCartItem | FigureCartItem): string {
  if (item.kind === "MANGA") {
    return item.isPreorder ? "มังงะ · สั่งจองล่วงหน้า" : "มังงะ · สินค้าพร้อมส่ง";
  }
  return item.selectedPaymentType === "DEPOSIT"
    ? "Figure · วางมัดจำ"
    : "Figure · ชำระเต็มจำนวน";
}

function cartItemTitle(item: MangaCartItem | FigureCartItem): string {
  if (item.kind === "MANGA") {
    return `${item.title} เล่ม ${item.volume}${
      item.variantLabel ? ` (${item.variantLabel})` : ""
    }`;
  }
  return item.name;
}

function taxInvoiceItems(items: readonly (MangaCartItem | FigureCartItem)[]): CheckoutTaxItem[] {
  return items.map((item) =>
    item.kind === "MANGA"
      ? {
          id: item.id,
          name: cartItemTitle(item),
          quantity: item.quantity,
          unitPrice: item.price,
          type: "MANGA",
        }
      : {
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.fullPrice,
          type: "FIGURE",
        },
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const {
    authenticatedFetch,
    isAuthenticated,
    isLoading: authLoading,
    user,
  } = useAuth();
  const {
    items,
    isReady: cartReady,
    itemCount,
    immediateTotal,
    remainingBalanceTotal,
    removeItem,
    updateQuantity,
    updateFigurePaymentType,
    clearCart,
  } = useCart();

  const [shippingAddress, setShippingAddress] =
    useState<ShippingFormValues>(EMPTY_SHIPPING_ADDRESS);
  const [savedAddresses, setSavedAddresses] = useState<SavedShippingAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [saveAddressForNextTime, setSaveAddressForNextTime] = useState(false);
  const [shipmentPolicy, setShipmentPolicy] =
    useState<ShipmentPolicy>("SPLIT_SHIPMENT");
  const [carrier, setCarrier] = useState<"FLASH" | "THAI_POST">("FLASH");
  const [taxInvoiceRequested, setTaxInvoiceRequested] = useState(false);
  const [taxInvoiceData, setTaxInvoiceData] = useState<TaxInvoiceFormData | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isStaffAccount =
    user?.role === "STAFF" ||
    user?.role === "FINANCE" ||
    user?.role === "ADMIN";

  useEffect(() => {
    if (!authLoading && isStaffAccount) {
      const destination =
        user.role === "ADMIN"
          ? "/admin"
          : user.role === "STAFF"
            ? "/staff/packing"
            : "/finance/slips";
      const redirectTimeout = window.setTimeout(() => {
        router.replace(`${destination}?notice=shopping-disabled`);
      }, 1_200);
      return () => window.clearTimeout(redirectTimeout);
    }
  }, [authLoading, isStaffAccount, router, user]);

  useEffect(() => {
    if (!user || user.role !== "CUSTOMER" || authLoading) {
      setSavedAddresses([]);
      setSelectedAddressId("");
      return;
    }
    if (process.env.NEXT_PUBLIC_USE_MOCK !== "true") {
      return;
    }
    try {
      const addresses = listShippingAddresses(user.id);
      setSavedAddresses(addresses);
      const defaultAddress =
        addresses.find((address) => address.isDefault) ?? addresses[0];
      const profile = getUserProfile(user);
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress.id);
        setShippingAddress({
          recipientName: defaultAddress.recipientName,
          recipientPhone: defaultAddress.recipientPhone,
          addressLine: defaultAddress.addressLine,
          addressVillage: defaultAddress.addressVillage,
          street: defaultAddress.street,
          subdistrict: defaultAddress.subdistrict,
          district: defaultAddress.district,
          province: defaultAddress.province,
          postalCode: defaultAddress.postalCode,
        });
      } else {
        setSelectedAddressId("");
        setShippingAddress((current) => ({
          ...current,
          recipientName: current.recipientName || profile.fullName,
          recipientPhone: current.recipientPhone || profile.phoneNumber,
        }));
      }
    } catch (addressError) {
      setCheckoutError(
        addressError instanceof Error
          ? addressError.message
          : "โหลดสมุดที่อยู่ไม่สำเร็จ",
      );
    }
  }, [authLoading, user]);

  const subtotal = immediateTotal;
  const taxItems = useMemo(() => taxInvoiceItems(items), [items]);
  const addressForTaxInvoice = useMemo<ShippingAddress>(
    () => ({
      addressLine: shippingAddress.addressLine,
      addressVillage: shippingAddress.addressVillage,
      street: shippingAddress.street,
      subdistrict: shippingAddress.subdistrict,
      district: shippingAddress.district,
      province: shippingAddress.province,
      postalCode: shippingAddress.postalCode,
    }),
    [shippingAddress],
  );

  function setAddressField<K extends keyof ShippingFormValues>(
    field: K,
    value: ShippingFormValues[K],
  ): void {
    setShippingAddress((current) => ({ ...current, [field]: value }));
    setFormErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function selectSavedAddress(addressId: string): void {
    setSelectedAddressId(addressId);
    const selected = savedAddresses.find((address) => address.id === addressId);
    if (!selected) {
      setShippingAddress(EMPTY_SHIPPING_ADDRESS);
      return;
    }
    setShippingAddress({
      recipientName: selected.recipientName,
      recipientPhone: selected.recipientPhone,
      addressLine: selected.addressLine,
      addressVillage: selected.addressVillage,
      street: selected.street,
      subdistrict: selected.subdistrict,
      district: selected.district,
      province: selected.province,
      postalCode: selected.postalCode,
    });
    setFormErrors({});
  }

  async function submitCheckout(): Promise<void> {
    setCheckoutError(null);
    const useMockMode = process.env.NEXT_PUBLIC_USE_MOCK === "true";
    if (isStaffAccount) {
      setCheckoutError("บัญชีเจ้าหน้าที่ไม่สามารถทำรายการสั่งซื้อได้");
      return;
    }
    if (!isAuthenticated && !useMockMode) {
      router.push("/login?redirect=/checkout");
      return;
    }
    if (items.length === 0) {
      setCheckoutError("ยังไม่มีสินค้าในตะกร้า");
      return;
    }
    if (taxInvoiceRequested && !taxInvoiceData) {
      setCheckoutError("กรุณากรอกและกดยืนยันข้อมูลใบกำกับภาษีก่อนดำเนินการต่อ");
      return;
    }

    const parsedAddress = shippingAddressSchema.safeParse(shippingAddress);
    if (!parsedAddress.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsedAddress.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string" && nextErrors[field] === undefined) {
          nextErrors[field] = issue.message;
        }
      }
      setFormErrors(nextErrors);
      setCheckoutError("กรุณาตรวจสอบข้อมูลที่อยู่จัดส่งให้ครบถ้วน");
      return;
    }
    if (
      saveAddressForNextTime &&
      user?.role === "CUSTOMER" &&
      useMockMode
    ) {
      try {
        let updatedAddresses = saveShippingAddress(
          user.id,
          {
            label: selectedAddressId
              ? savedAddresses.find((address) => address.id === selectedAddressId)
                  ?.label ?? "ที่อยู่จาก Checkout"
              : "ที่อยู่จาก Checkout",
            ...parsedAddress.data,
            addressVillage: parsedAddress.data.addressVillage ?? "",
            street: parsedAddress.data.street ?? "",
          },
          selectedAddressId || undefined,
        );
        const savedAddress =
          updatedAddresses.find((address) => address.id === selectedAddressId) ??
          updatedAddresses[updatedAddresses.length - 1];
        if (
          savedAddress &&
          (updatedAddresses.length === 1 ||
            !updatedAddresses.some((item) => item.isDefault))
        ) {
          updatedAddresses = setDefaultShippingAddress(user.id, savedAddress.id);
        }
        setSavedAddresses(updatedAddresses);
        if (savedAddress) {
          setSelectedAddressId(savedAddress.id);
        }
      } catch (addressError) {
        setCheckoutError(
          addressError instanceof Error
            ? `บันทึกที่อยู่ไม่สำเร็จ: ${addressError.message}`
            : "บันทึกที่อยู่ไม่สำเร็จ",
        );
        return;
      }
    }

    const payload = {
      items: items.map((item) => ({
        productVariantId: item.id,
        quantity: item.quantity,
        productType:
          item.kind === "MANGA"
            ? item.isPreorder
              ? "MANGA_PREORDER"
              : "MANGA_INSTOCK"
            : item.selectedPaymentType === "DEPOSIT"
              ? "FIGURE_DEPOSIT"
              : "FIGURE_FULL",
      })),
      carrier,
      serviceAreaCode: parsedAddress.data.postalCode,
      shippingPolicy: shipmentPolicy,
      shippingAddress: parsedAddress.data,
      ...(useMockMode
        ? { catalogSnapshot: getCheckoutInventorySnapshot() }
        : {}),
      ...(taxInvoiceData ? { taxInvoiceRequest: taxInvoiceData } : {}),
    };

    setIsSubmitting(true);
    try {
      const requestOptions: RequestInit = {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      };
      const response = useMockMode
        ? await fetch("/api/checkout/unified", requestOptions)
        : await authenticatedFetch(
            getApiUrl("/api/checkout/unified"),
            requestOptions,
          );
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw new Error("เซิร์ฟเวอร์ส่งข้อมูลตอบกลับไม่ถูกต้อง");
      }
      const parsedResponse = checkoutResponseSchema.safeParse(body);
      if (!response.ok || !parsedResponse.success) {
        const parsedError = errorResponseSchema.safeParse(body);
        throw new Error(
          parsedError.success && parsedError.data.error?.message
            ? parsedError.data.error.message
            : "ไม่สามารถสร้างคำสั่งซื้อได้ โปรดลองใหม่อีกครั้ง",
        );
      }

      const order = parsedResponse.data.data;
      if (useMockMode) {
        saveMockOrder(order, user?.id);
      }
      clearCart();
      const orderId = String(order.orderId);
      if (order.paymentUrl) {
        const paymentUrl = new URL(order.paymentUrl, window.location.origin);
        if (paymentUrl.origin !== window.location.origin) {
          throw new Error("ระบบชำระเงินส่งปลายทางที่ไม่ปลอดภัย");
        }
        router.replace(paymentUrl.pathname + paymentUrl.search);
        return;
      }
      const paymentQuery = new URLSearchParams({
        orderId,
        amount: order.immediateAmount,
        orderNumber: order.orderNumber,
      });
      if (order.paymentQrError) {
        paymentQuery.set("qrError", order.paymentQrError);
      }
      if (order.paymentQrCodeDataUrl) {
        try {
          window.sessionStorage.setItem(
            `checkout-payment-qr:${orderId}`,
            order.paymentQrCodeDataUrl,
          );
        } catch (storageError) {
          console.error("Could not retain the payment QR for this session.", storageError);
        }
      }
      router.replace(`/checkout/payment?${paymentQuery.toString()}`);
    } catch (error) {
      setCheckoutError(
        error instanceof Error ? error.message : "ไม่สามารถดำเนินการสั่งซื้อได้",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (
    authLoading || !cartReady
  ) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-6xl items-center justify-center px-4">
        <p className="text-sm text-slate-500" role="status">
          กำลังเตรียมข้อมูลชำระเงิน...
        </p>
      </main>
    );
  }

  if (isStaffAccount) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
        <ShieldCheck className="h-10 w-10 text-amber-600" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-extrabold text-slate-950">
          ไม่สามารถเข้าถึงหน้าสั่งซื้อได้
        </h1>
        <p role="status" className="mt-2 text-sm leading-6 text-slate-600">
          บัญชีเจ้าหน้าที่ไม่สามารถทำรายการสั่งซื้อ ระบบกำลังนำคุณไปยังหน้าทำงานที่ได้รับอนุญาต
        </p>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-4 text-center">
        <span className="rounded-2xl bg-zinc-100 p-4 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
          <ShoppingBag aria-hidden="true" className="h-8 w-8" />
        </span>
        <h1 className="mt-5 text-2xl font-bold text-zinc-900 dark:text-zinc-100">ไม่มีสินค้าในตะกร้าของคุณ</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          เลือกมังงะหรือของสะสมที่ต้องการ แล้วกลับมาชำระเงินได้เลย
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          เลือกซื้อสินค้า
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 pb-16 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            เลือกซื้อสินค้าต่อ
          </Link>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-100 sm:text-3xl">
            ชำระเงิน
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            ตรวจสอบรายการและกรอกข้อมูลจัดส่งก่อนยืนยันคำสั่งซื้อ
          </p>
        </div>

        <div>
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
            <div className="space-y-6">
              <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
                <div className="mb-5 flex items-center gap-3">
                  <span className="rounded-xl bg-zinc-100 p-2.5 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                    <MapPin aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">ที่อยู่จัดส่ง</h2>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">กรอกข้อมูลสำหรับจัดส่งพัสดุ</p>
                  </div>
                </div>

                {user?.role === "CUSTOMER" && savedAddresses.length > 0 ? (
                  <div className="mb-4">
                    <label
                      htmlFor="saved-address-select"
                      className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                    >
                      เลือกจากสมุดที่อยู่
                    </label>
                    <select
                      id="saved-address-select"
                      value={selectedAddressId}
                      onChange={(event) => selectSavedAddress(event.target.value)}
                      className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-orange-950 sm:max-w-md"
                    >
                      <option value="">กรอกที่อยู่ใหม่</option>
                      {savedAddresses.map((address) => (
                        <option key={address.id} value={address.id}>
                          {address.label}
                          {address.isDefault ? " · ที่อยู่เริ่มต้น" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="ชื่อผู้รับ"
                    value={shippingAddress.recipientName}
                    error={formErrors.recipientName}
                    autoComplete="name"
                    onChange={(value) => setAddressField("recipientName", value)}
                  />
                  <Field
                    label="เบอร์โทรศัพท์"
                    value={shippingAddress.recipientPhone}
                    error={formErrors.recipientPhone}
                    autoComplete="tel"
                    inputMode="tel"
                    onChange={(value) => setAddressField("recipientPhone", value)}
                  />
                  <Field
                    label="บ้านเลขที่ / อาคาร / หมู่บ้าน"
                    value={shippingAddress.addressLine}
                    error={formErrors.addressLine}
                    className="sm:col-span-2"
                    onChange={(value) => setAddressField("addressLine", value)}
                  />
                  <Field
                    label="หมู่ที่ (ถ้ามี)"
                    value={shippingAddress.addressVillage}
                    error={formErrors.addressVillage}
                    onChange={(value) => setAddressField("addressVillage", value)}
                  />
                  <Field
                    label="ถนน (ถ้ามี)"
                    value={shippingAddress.street}
                    error={formErrors.street}
                    onChange={(value) => setAddressField("street", value)}
                  />
                  <Field
                    label="ตำบล / แขวง"
                    value={shippingAddress.subdistrict}
                    error={formErrors.subdistrict}
                    onChange={(value) => setAddressField("subdistrict", value)}
                  />
                  <Field
                    label="อำเภอ / เขต"
                    value={shippingAddress.district}
                    error={formErrors.district}
                    onChange={(value) => setAddressField("district", value)}
                  />
                  <Field
                    label="จังหวัด"
                    value={shippingAddress.province}
                    error={formErrors.province}
                    onChange={(value) => setAddressField("province", value)}
                  />
                  <Field
                    label="รหัสไปรษณีย์"
                    value={shippingAddress.postalCode}
                    error={formErrors.postalCode}
                    inputMode="numeric"
                    maxLength={5}
                    onChange={(value) =>
                      setAddressField("postalCode", value.replace(/\D/g, "").slice(0, 5))
                    }
                  />
                </div>
                {user?.role === "CUSTOMER" ? (
                  <label className="mt-4 flex cursor-pointer items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                    <input
                      type="checkbox"
                      checked={saveAddressForNextTime}
                      onChange={(event) =>
                        setSaveAddressForNextTime(event.target.checked)
                      }
                      className="mt-0.5 h-4 w-4 accent-orange-600"
                    />
                    <span>บันทึกที่อยู่นี้ลงในสมุดที่อยู่สำหรับครั้งต่อไป</span>
                  </label>
                ) : null}
              </section>

              <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
                <div className="mb-5 flex items-center gap-3">
                  <span className="rounded-xl bg-blue-50 p-2.5 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                    <Truck aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">การจัดส่ง</h2>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">เลือกวิธีจัดส่งและบริษัทขนส่ง</p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <RadioCard
                    name="shipmentPolicy"
                    checked={shipmentPolicy === "SHIP_TOGETHER"}
                    onChange={() => setShipmentPolicy("SHIP_TOGETHER")}
                    title="รอส่งพร้อมกัน"
                    description="รวมส่งเมื่อสินค้าทุกรายการพร้อม"
                    icon={<Package aria-hidden="true" className="h-5 w-5" />}
                  />
                  <RadioCard
                    name="shipmentPolicy"
                    checked={shipmentPolicy === "SPLIT_SHIPMENT"}
                    onChange={() => setShipmentPolicy("SPLIT_SHIPMENT")}
                    title="แยกส่งเมื่อของถึง"
                    description="ส่งสินค้าพร้อมส่งและพรีออเดอร์แยกกัน"
                    icon={<Truck aria-hidden="true" className="h-5 w-5" />}
                  />
                </div>
                <div className="mt-4">
                  <label htmlFor="carrier" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    บริษัทขนส่ง
                  </label>
                  <select
                    id="carrier"
                    value={carrier}
                    onChange={(event) =>
                      setCarrier(event.target.value as "FLASH" | "THAI_POST")
                    }
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-orange-950 sm:max-w-sm"
                  >
                    <option value="FLASH">Flash Express</option>
                    <option value="THAI_POST">ไปรษณีย์ไทย</option>
                  </select>
                  <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                    ค่าจัดส่งจริงคำนวณตามน้ำหนักและพื้นที่ปลายทางหลังยืนยันคำสั่งซื้อ
                  </p>
                </div>
              </section>

              <TaxInvoiceForm
                items={taxItems}
                shippingFee={0}
                shippingAddress={addressForTaxInvoice}
                onEnabledChange={(enabled) => {
                  setTaxInvoiceRequested(enabled);
                  if (!enabled) {
                    setTaxInvoiceData(null);
                  }
                }}
                onSubmit={(data) => setTaxInvoiceData(data)}
                className="shadow-sm"
              />
              <p className="-mt-4 px-2 text-xs text-zinc-600 dark:text-zinc-400">
                สรุปภาษีในแบบฟอร์มยังไม่รวมค่าจัดส่ง ซึ่งระบบจะคำนวณตามพื้นที่และน้ำหนักจริง
              </p>

              {!isAuthenticated && process.env.NEXT_PUBLIC_USE_MOCK !== "true" ? (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
                  <p>
                    กรุณาเข้าสู่ระบบก่อนยืนยันคำสั่งซื้อ{" "}
                    <Link href="/login?redirect=/checkout" className="font-semibold underline">
                      เข้าสู่ระบบ
                    </Link>
                  </p>
                </div>
              ) : null}

              {checkoutError ? (
                <div
                  className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
                  role="alert"
                >
                  <AlertCircle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
                  <p>{checkoutError}</p>
                </div>
              ) : null}
            </div>

            <aside className="lg:sticky lg:top-6">
              <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="border-b border-zinc-100 p-5 dark:border-zinc-800">
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">สรุปคำสั่งซื้อ</h2>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{itemCount} ชิ้น</p>
                </div>
                <div className="max-h-[420px] space-y-4 overflow-y-auto p-5">
                  {items.map((item) => {
                    const fullUnitPrice =
                      item.kind === "MANGA" ? item.price : item.fullPrice;
                    const immediateUnitPrice =
                      item.kind === "FIGURE" && item.selectedPaymentType === "DEPOSIT"
                        ? item.depositAmount
                        : fullUnitPrice;
                    return (
                      <article
                        key={`${item.kind}-${item.id}`}
                        className="flex gap-3 border-b border-zinc-100 pb-4 last:border-0 last:pb-0 dark:border-zinc-800"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                          {item.kind === "MANGA" ? (
                            <BookOpen aria-hidden="true" className="h-5 w-5" />
                          ) : (
                            <Package aria-hidden="true" className="h-5 w-5" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="line-clamp-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                {item.kind === "MANGA"
                                  ? `${item.title} เล่ม ${item.volume}`
                                  : item.name}
                              </h3>
                              <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                                {itemTypeLabel(item)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeItem(item.kind, item.id)}
                              className="text-xs font-medium text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
                              aria-label="นำสินค้าออกจากตะกร้า"
                            >
                              ลบ
                            </button>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                            <div className="inline-flex items-center rounded-lg border border-zinc-200 dark:border-zinc-700">
                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(item.kind, item.id, item.quantity - 1)
                                }
                                className="p-1.5 text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
                                aria-label="ลดจำนวน"
                              >
                                <Minus aria-hidden="true" className="h-3.5 w-3.5" />
                              </button>
                              <span className="min-w-7 text-center text-xs font-semibold">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(item.kind, item.id, item.quantity + 1)
                                }
                                disabled={item.quantity >= 99}
                                className="p-1.5 text-zinc-600 hover:text-zinc-950 disabled:opacity-40 dark:text-zinc-300 dark:hover:text-white"
                                aria-label="เพิ่มจำนวน"
                              >
                                <Plus aria-hidden="true" className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            {item.kind === "FIGURE" ? (
                              <select
                                value={item.selectedPaymentType}
                                onChange={(event) =>
                                  updateFigurePaymentType(
                                    item.id,
                                    event.target.value as FigureCartItem["selectedPaymentType"],
                                  )
                                }
                                className="max-w-36 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                                aria-label="เลือกวิธีชำระ Figure"
                              >
                                <option value="FULL">จ่ายเต็ม</option>
                                <option
                                  value="DEPOSIT"
                                  disabled={
                                    item.depositAmount <= 0 ||
                                    item.depositAmount >= item.fullPrice
                                  }
                                >
                                  วางมัดจำ
                                </option>
                              </select>
                            ) : null}
                          </div>
                          <div className="mt-2 flex justify-between text-xs">
                            <span className="text-zinc-600 dark:text-zinc-400">
                              ชำระตอนนี้ {money(immediateUnitPrice * item.quantity)}
                            </span>
                            <span className="font-medium text-zinc-900 dark:text-zinc-100">
                              {money(fullUnitPrice * item.quantity)}
                            </span>
                          </div>
                          {item.kind === "FIGURE" &&
                          item.selectedPaymentType === "DEPOSIT" ? (
                            <p className="mt-1 text-right text-xs text-amber-700 dark:text-amber-300">
                              คงเหลือ {money((item.fullPrice - item.depositAmount) * item.quantity)}
                            </p>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className="space-y-3 border-t border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="flex justify-between text-sm text-zinc-600 dark:text-zinc-400">
                    <span>ยอดสินค้าที่ชำระวันนี้</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{money(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-zinc-600 dark:text-zinc-400">
                    <span>ค่าจัดส่ง</span>
                    <span className="text-xs text-zinc-600 dark:text-zinc-400">คำนวณตามพื้นที่</span>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/40">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-amber-950 dark:text-amber-200">
                        ยอดชำระทันที*
                      </span>
                      <span className="text-lg font-bold text-orange-700 dark:text-amber-400">{money(subtotal)}</span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-amber-900/80 dark:text-amber-300/80">
                      * ยอดนี้ยังไม่รวมค่าจัดส่ง ซึ่งระบบจะแจ้งยอดจริงเมื่อสร้างคำสั่งซื้อ
                    </p>
                  </div>
                  {remainingBalanceTotal > 0 ? (
                    <div className="flex justify-between gap-3 text-sm">
                      <span className="text-zinc-600 dark:text-zinc-400">ยอดคงค้างเมื่อ Figure ถึงไทย</span>
                      <span className="font-semibold text-amber-700 dark:text-amber-300">
                        {money(remainingBalanceTotal)}
                      </span>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void submitCheckout()}
                    disabled={isSubmitting || items.length === 0}
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CreditCard aria-hidden="true" className="h-4 w-4" />
                    {isSubmitting ? "กำลังสร้างคำสั่งซื้อ..." : "ยืนยันการสั่งซื้อและชำระเงิน"}
                    {!isSubmitting ? (
                      <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    ) : null}
                  </button>
                  <p className="flex items-center justify-center gap-1.5 text-center text-xs text-zinc-600 dark:text-zinc-400">
                    <Check aria-hidden="true" className="h-3.5 w-3.5 text-emerald-600" />
                    ชำระเงินอย่างปลอดภัย ข้อมูลของคุณได้รับการปกป้อง
                  </p>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}

interface FieldProps {
  label: string;
  value: string;
  error?: string;
  className?: string;
  autoComplete?: string;
  inputMode?: "text" | "numeric" | "tel";
  maxLength?: number;
  onChange: (value: string) => void;
}

function Field({
  label,
  value,
  error,
  className = "",
  autoComplete,
  inputMode = "text",
  maxLength,
  onChange,
}: FieldProps) {
  const id = `checkout-${label.replace(/[^a-zA-Z0-9ก-๙]+/g, "-")}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      <input
        id={id}
        value={value}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:ring-2 ${
          error
            ? "border-red-400 bg-white text-zinc-900 focus:border-red-500 focus:ring-red-100 dark:border-red-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-red-950"
            : "border-zinc-300 bg-white text-zinc-900 focus:border-orange-500 focus:ring-orange-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-orange-950"
        }`}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

interface RadioCardProps {
  name: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  description: string;
  icon: React.ReactNode;
}

function RadioCard({
  name,
  checked,
  onChange,
  title,
  description,
  icon,
}: RadioCardProps) {
  return (
    <label
      className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition ${
        checked
          ? "border-orange-500 bg-amber-50/60 ring-1 ring-orange-100 dark:border-orange-500 dark:bg-orange-950/20 dark:ring-orange-950"
          : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-700"
      }`}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="mt-1 accent-orange-600"
      />
      <span className="mt-0.5 text-zinc-600 dark:text-zinc-300">{icon}</span>
      <span>
        <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-zinc-600 dark:text-zinc-400">{description}</span>
      </span>
    </label>
  );
}

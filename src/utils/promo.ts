export interface PromoCoupon {
  code: string;
  title: string;
  description: string;
  type: "PERCENTAGE" | "FIXED" | "FREE_SHIPPING";
  value: number; // e.g. 10 for 10%, 50 for 50 THB, 100 for 100% shipping
  minSpend?: number;
  expiresAt: string; // ISO date string e.g. "2026-12-31T23:59:59.000Z"
  isActive: boolean;
  createdAt: string;
}

export const PROMO_STORAGE_KEY = "mock_store_promo_codes";
export const MOCK_PROMO_CODES_UPDATED_EVENT = "mock_promo_codes_updated";

export const DEFAULT_PROMO_CODES: PromoCoupon[] = [
  {
    code: "WELCOME10",
    title: "ส่วนลด 10%",
    description: "ส่วนลดต้อนรับสมาชิกใหม่ 10% สำหรับยอดสินค้า",
    type: "PERCENTAGE",
    value: 10,
    minSpend: 0,
    expiresAt: "2026-12-31T23:59:59.000Z",
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    code: "FREESHIP",
    title: "โค้ดส่งฟรี",
    description: "ฟรีค่าจัดส่งพัสดุทั่วไทย",
    type: "FREE_SHIPPING",
    value: 100,
    minSpend: 0,
    expiresAt: "2026-12-31T23:59:59.000Z",
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    code: "MANGA50",
    title: "ส่วนลด ฿50",
    description: "รับส่วนลดทันที 50 บาท เมื่อช้อปครบ 300 บาท",
    type: "FIXED",
    value: 50,
    minSpend: 300,
    expiresAt: "2026-12-31T23:59:59.000Z",
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    code: "EXPIRED30",
    title: "ส่วนลด 30% (หมดอายุแล้ว)",
    description: "โค้ดทดสอบกรณีหมดอายุ (หมดเขตเมื่อ 1 ต.ค. 2026)",
    type: "PERCENTAGE",
    value: 30,
    minSpend: 0,
    expiresAt: "2026-10-01T00:00:00.000Z",
    isActive: true,
    createdAt: "2026-09-01T00:00:00.000Z",
  },
];

export function listPromoCodes(): PromoCoupon[] {
  if (typeof window === "undefined") return DEFAULT_PROMO_CODES;
  try {
    const raw = localStorage.getItem(PROMO_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(PROMO_STORAGE_KEY, JSON.stringify(DEFAULT_PROMO_CODES));
      return DEFAULT_PROMO_CODES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_PROMO_CODES;
  } catch {
    return DEFAULT_PROMO_CODES;
  }
}

export function savePromoCode(coupon: Omit<PromoCoupon, "createdAt"> & { createdAt?: string }): void {
  const current = listPromoCodes();
  const normalizedCode = coupon.code.trim().toUpperCase();
  const index = current.findIndex((c) => c.code.toUpperCase() === normalizedCode);

  const entry: PromoCoupon = {
    ...coupon,
    code: normalizedCode,
    createdAt: coupon.createdAt || new Date().toISOString(),
  };

  let updated: PromoCoupon[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = entry;
  } else {
    updated = [entry, ...current];
  }

  if (typeof window !== "undefined") {
    localStorage.setItem(PROMO_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event(MOCK_PROMO_CODES_UPDATED_EVENT));
  }
}

export function deletePromoCode(code: string): void {
  const current = listPromoCodes();
  const normalized = code.trim().toUpperCase();
  const updated = current.filter((c) => c.code.toUpperCase() !== normalized);
  if (typeof window !== "undefined") {
    localStorage.setItem(PROMO_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event(MOCK_PROMO_CODES_UPDATED_EVENT));
  }
}

export function togglePromoCodeStatus(code: string): void {
  const current = listPromoCodes();
  const normalized = code.trim().toUpperCase();
  const updated = current.map((c) =>
    c.code.toUpperCase() === normalized ? { ...c, isActive: !c.isActive } : c,
  );
  if (typeof window !== "undefined") {
    localStorage.setItem(PROMO_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event(MOCK_PROMO_CODES_UPDATED_EVENT));
  }
}

export interface PromoValidationResult {
  valid: boolean;
  coupon?: PromoCoupon;
  discountAmount: number;
  freeShipping: boolean;
  errorMessage?: string;
}

export function validatePromoCode(
  inputCode: string,
  merchandiseTotal: number,
  shippingFee: number = 0,
): PromoValidationResult {
  const normalized = inputCode.trim().toUpperCase();
  if (!normalized) {
    return {
      valid: false,
      discountAmount: 0,
      freeShipping: false,
      errorMessage: "กรุณาระบุโค้ดส่วนลด",
    };
  }

  const coupons = listPromoCodes();
  const coupon = coupons.find((c) => c.code.toUpperCase() === normalized);

  if (!coupon) {
    return {
      valid: false,
      discountAmount: 0,
      freeShipping: false,
      errorMessage: `ไม่พบโค้ด "${normalized}" ในระบบ`,
    };
  }

  if (!coupon.isActive) {
    return {
      valid: false,
      discountAmount: 0,
      freeShipping: false,
      errorMessage: `โค้ด "${coupon.code}" ถูกระงับหรือปิดการใช้งานชั่วคราว`,
    };
  }

  // Check expiration date
  const expiryDate = new Date(coupon.expiresAt);
  const now = new Date();
  if (!Number.isNaN(expiryDate.getTime()) && now > expiryDate) {
    const formattedExpiry = expiryDate.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    return {
      valid: false,
      discountAmount: 0,
      freeShipping: false,
      errorMessage: `โค้ด "${coupon.code}" หมดอายุการใช้งานแล้วเมื่อ ${formattedExpiry}`,
    };
  }

  if (coupon.minSpend && merchandiseTotal < coupon.minSpend) {
    return {
      valid: false,
      discountAmount: 0,
      freeShipping: false,
      errorMessage: `ต้องมียอดสินค้าขั้นต่ำ ฿${coupon.minSpend.toLocaleString("th-TH")} สำหรับโค้ดนี้`,
    };
  }

  if (coupon.type === "FREE_SHIPPING") {
    return {
      valid: true,
      coupon,
      discountAmount: shippingFee,
      freeShipping: true,
    };
  }

  if (coupon.type === "PERCENTAGE") {
    const discount = Math.round((merchandiseTotal * coupon.value) / 100);
    return {
      valid: true,
      coupon,
      discountAmount: discount,
      freeShipping: false,
    };
  }

  // FIXED
  const discount = Math.min(coupon.value, merchandiseTotal);
  return {
    valid: true,
    coupon,
    discountAmount: discount,
    freeShipping: false,
  };
}

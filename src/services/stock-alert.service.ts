"use client";

export const MOCK_STOCK_ALERTS_STORAGE_KEY = "mock_stock_alert_subscriptions";
export const MOCK_STOCK_ALERTS_EVENT = "manga-collectibles-stock-alerts-updated";

export interface StockAlertSubscription {
  id: string;
  productId: string | number;
  productTitle: string;
  productType: string;
  userEmail: string;
  subscribedAt: string;
}

export function getStockAlertSubscriptions(): StockAlertSubscription[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(MOCK_STOCK_ALERTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isSubscribedStockAlert(productId: string | number): boolean {
  const subs = getStockAlertSubscriptions();
  const target = String(productId);
  return subs.some((s) => String(s.productId) === target);
}

export function subscribeStockAlert(
  productId: string | number,
  productTitle: string,
  productType: string,
  userEmail: string,
): { success: boolean; message: string } {
  if (typeof window === "undefined") {
    return { success: false, message: "ระบบยังไม่พร้อมทำงาน" };
  }

  const email = userEmail.trim();
  if (!email || !email.includes("@")) {
    return { success: false, message: "กรุณาระบุอีเมลที่ถูกต้อง" };
  }

  try {
    const subs = getStockAlertSubscriptions();
    const strId = String(productId);
    if (subs.some((s) => String(s.productId) === strId)) {
      return {
        success: true,
        message: "คุณได้ลงทะเบียนแจ้งเตือนสินค้านี้ไว้เรียบร้อยแล้ว",
      };
    }

    const newSub: StockAlertSubscription = {
      id: `alert-${Date.now()}`,
      productId: strId,
      productTitle,
      productType,
      userEmail: email,
      subscribedAt: new Date().toISOString(),
    };

    const updated = [newSub, ...subs];
    window.localStorage.setItem(
      MOCK_STOCK_ALERTS_STORAGE_KEY,
      JSON.stringify(updated),
    );

    window.dispatchEvent(new CustomEvent(MOCK_STOCK_ALERTS_EVENT));

    return {
      success: true,
      message: `บันทึกการแจ้งเตือนสำเร็จ! ระบบจะแจ้งเตือนไปยัง ${email} ทันทีเมื่อสินค้าเติมสต็อก`,
    };
  } catch {
    return { success: false, message: "เกิดข้อผิดพลาดในการบันทึกการแจ้งเตือน" };
  }
}

export function removeStockAlert(productId: string | number): void {
  if (typeof window === "undefined") return;
  try {
    const subs = getStockAlertSubscriptions();
    const strId = String(productId);
    const updated = subs.filter((s) => String(s.productId) !== strId);
    window.localStorage.setItem(
      MOCK_STOCK_ALERTS_STORAGE_KEY,
      JSON.stringify(updated),
    );
    window.dispatchEvent(new CustomEvent(MOCK_STOCK_ALERTS_EVENT));
  } catch {
    // Ignore
  }
}

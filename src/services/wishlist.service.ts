"use client";

export interface WishlistItem {
  id: string | number;
  itemType: "MANGA" | "FIGURE" | "LIGHT_NOVEL" | "GOODS" | "PLAMO" | "ACCESSORY";
  title: string;
  price: number;
  imageUrl?: string | null;
  url: string;
  category?: string;
  isPreorder?: boolean;
  stock?: number;
}

export const WISHLIST_STORAGE_KEY = "mock_user_wishlist";
export const LEGACY_WISHLIST_STORAGE_KEY = "mock_store_wishlist_items";
export const WISHLIST_CHANGE_EVENT = "mock_user_wishlist_changed";

/**
 * ดึงรายการของที่บันทึกไว้ทั้งหมดจาก LocalStorage
 */
export function getWishlist(): WishlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw =
      localStorage.getItem(WISHLIST_STORAGE_KEY) ??
      localStorage.getItem(LEGACY_WISHLIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch {
    return [];
  }
}

function notifyWishlistChanged(items: WishlistItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(
      new CustomEvent(WISHLIST_CHANGE_EVENT, { detail: { items } }),
    );
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

/**
 * ตรวจสอบว่าสินค้านี้อยู่ในสิ่งที่ชอบหรือไม่
 */
export function isInWishlist(productId: string | number, itemType?: string): boolean {
  const items = getWishlist();
  const targetId = String(productId);
  return items.some(
    (item) =>
      String(item.id) === targetId &&
      (!itemType || item.itemType === itemType),
  );
}

/**
 * สลับสถานะ (ถ้ามีให้ลบออก / ถ้าไม่มีให้เพิ่มเข้า) และส่งค่ากลับ
 * @returns true หากเพิ่มเข้า, false หากลบออก
 */
export function toggleWishlist(product: WishlistItem): boolean {
  const current = getWishlist();
  const exists = current.some(
    (i) =>
      String(i.id) === String(product.id) &&
      (!product.itemType || i.itemType === product.itemType),
  );

  if (exists) {
    const filtered = current.filter(
      (i) =>
        !(
          String(i.id) === String(product.id) &&
          (!product.itemType || i.itemType === product.itemType)
        ),
    );
    notifyWishlistChanged(filtered);
    if (process.env.NEXT_PUBLIC_USE_MOCK !== "true") {
      void fetch(`/api/wishlist/${encodeURIComponent(String(product.id))}`, {
        method: "DELETE",
        credentials: "include",
      }).catch(() => {});
    }
    return false;
  } else {
    const next = [...current, product];
    notifyWishlistChanged(next);
    if (process.env.NEXT_PUBLIC_USE_MOCK !== "true") {
      void fetch("/api/wishlist", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product),
      }).catch(() => {});
    }
    return true;
  }
}

/**
 * ลบสินค้าออกจากสิ่งที่ชอบ
 */
export function removeFromWishlist(productId: string | number, itemType?: string): void {
  const current = getWishlist();
  const targetId = String(productId);
  const filtered = current.filter(
    (i) =>
      !(
        String(i.id) === targetId &&
        (!itemType || i.itemType === itemType)
      ),
  );
  notifyWishlistChanged(filtered);
  if (process.env.NEXT_PUBLIC_USE_MOCK !== "true") {
    void fetch(`/api/wishlist/${encodeURIComponent(targetId)}`, {
      method: "DELETE",
      credentials: "include",
    }).catch(() => {});
  }
}

/**
 * ล้างรายการทั้งหมด
 */
export function clearWishlist(): void {
  const current = getWishlist();
  notifyWishlistChanged([]);
  if (process.env.NEXT_PUBLIC_USE_MOCK !== "true") {
    for (const item of current) {
      void fetch(`/api/wishlist/${encodeURIComponent(String(item.id))}`, {
        method: "DELETE",
        credentials: "include",
      }).catch(() => {});
    }
  }
}

/**
 * สมัครรับการแจ้งเตือนเมื่อสิ่งที่ชอบมีการเปลี่ยนแปลง
 */
export function subscribeWishlist(listener: (items: WishlistItem[]) => void): () => void {
  if (typeof window === "undefined") return () => {};

  if (process.env.NEXT_PUBLIC_USE_MOCK !== "true") {
    void fetch("/api/wishlist", { credentials: "include", cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((resData) => {
        const data = resData?.data ?? resData;
        if (data && Array.isArray(data.items)) {
          localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(data.items));
          listener(data.items);
        }
      })
      .catch(() => {});
  }

  const handleCustomEvent = (event: Event) => {
    const custom = event as CustomEvent<{ items: WishlistItem[] }>;
    if (custom.detail && Array.isArray(custom.detail.items)) {
      listener(custom.detail.items);
    } else {
      listener(getWishlist());
    }
  };

  const handleStorageEvent = (event: StorageEvent) => {
    if (
      event.key === WISHLIST_STORAGE_KEY ||
      event.key === LEGACY_WISHLIST_STORAGE_KEY
    ) {
      listener(getWishlist());
    }
  };

  window.addEventListener(WISHLIST_CHANGE_EVENT, handleCustomEvent);
  window.addEventListener("storage", handleStorageEvent);

  return () => {
    window.removeEventListener(WISHLIST_CHANGE_EVENT, handleCustomEvent);
    window.removeEventListener("storage", handleStorageEvent);
  };
}

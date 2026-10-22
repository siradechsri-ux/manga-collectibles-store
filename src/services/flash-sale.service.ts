export type FlashSaleSchedule = "TODAY" | "TOMORROW";

export interface FlashSaleItem {
  id: number;
  kind: "MANGA" | "FIGURE" | "ACCESSORY";
  title: string;
  categoryLabel: string;
  originalPrice: number;
  salePrice: number;
  discountPercent: number;
  imageUrl: string;
  volume?: number;
  quota: number; // โควตาสินค้าสำหรับรอบ Flash Sale (เช่น 20 ชิ้น)
  soldCount: number; // จำนวนที่ขายไปแล้ว (เช่น 16 ชิ้น)
  soldPercent: number; // คำนวณอัตโนมัติ: (soldCount / quota) * 100
  stockNote: string; // ข้อความคงเหลืออัตโนมัติ: "ขายแล้ว X% (เหลือ Y ชิ้น)"
  schedule: FlashSaleSchedule; // รอบวัน "TODAY" หรือ "TOMORROW"
  href: string;
  isActive: boolean;
}

export function calculateFlashSaleProgress(
  quota: number,
  soldCount: number,
  kind?: "MANGA" | "FIGURE" | "ACCESSORY",
): { soldPercent: number; remaining: number; stockNote: string } {
  const safeQuota = Math.max(1, Number(quota) || 1);
  const safeSold = Math.max(0, Math.min(safeQuota, Number(soldCount) || 0));
  const remaining = Math.max(0, safeQuota - safeSold);
  const soldPercent = Math.min(100, Math.round((safeSold / safeQuota) * 100));

  let unit = "ชิ้น";
  if (kind === "MANGA") unit = "เล่ม";
  else if (kind === "FIGURE") unit = "กล่อง";
  else if (kind === "ACCESSORY") unit = "แพ็ก";

  const stockNote = `ขายแล้ว ${soldPercent}% (เหลือ ${remaining} ${unit})`;
  return { soldPercent, remaining, stockNote };
}

export const FLASH_SALE_STORAGE_KEY = "mock_flash_sale_deals";
export const FLASH_SALE_UPDATED_EVENT = "mock_flash_sale_updated";

export const DEFAULT_FLASH_DEALS: FlashSaleItem[] = [
  // --- ดีลรอบวันนี้ (TODAY) ---
  {
    id: 2001,
    kind: "MANGA",
    title: "Chainsaw Man เล่ม 1 (ลิขสิทธิ์แท้)",
    categoryLabel: "มังงะลดพิเศษ",
    originalPrice: 95,
    salePrice: 76,
    discountPercent: 20,
    imageUrl: "/images/products/chainsaw-vol-01.jpg",
    volume: 1,
    quota: 50,
    soldCount: 44,
    soldPercent: 88,
    stockNote: "ขายแล้ว 88% (เหลือ 6 เล่ม)",
    schedule: "TODAY",
    href: "/manga/chainsaw-man",
    isActive: true,
  },
  {
    id: 2002,
    kind: "FIGURE",
    title: "Pop Up Parade Sukuna (มหาเวทย์ผนึกมาร)",
    categoryLabel: "ฟิกเกอร์ลดพิเศษ",
    originalPrice: 1400,
    salePrice: 1120,
    discountPercent: 20,
    imageUrl: "/images/products/figure-2002.jpg",
    quota: 25,
    soldCount: 23,
    soldPercent: 92,
    stockNote: "ขายแล้ว 92% (เหลือ 2 กล่อง)",
    schedule: "TODAY",
    href: "/figures/pop-up-parade-sukuna",
    isActive: true,
  },
  {
    id: 3001,
    kind: "MANGA",
    title: "Frieren: คำอธิษฐานในวันที่จากลา เล่ม 1",
    categoryLabel: "มังงะลดพิเศษ",
    originalPrice: 115,
    salePrice: 92,
    discountPercent: 20,
    imageUrl: "/images/products/frieren-vol-01.jpg",
    volume: 1,
    quota: 50,
    soldCount: 41,
    soldPercent: 82,
    stockNote: "ขายแล้ว 82% (เหลือ 9 เล่ม)",
    schedule: "TODAY",
    href: "/manga/frieren",
    isActive: true,
  },
  {
    id: 8001,
    kind: "ACCESSORY",
    title: "ซองใสพรีเมียมถนอมหนังสือมังงะ (Pack 100 แผ่น)",
    categoryLabel: "อุปกรณ์ถนอมหนังสือ",
    originalPrice: 120,
    salePrice: 96,
    discountPercent: 20,
    imageUrl: "/images/products/acc-8001.jpg",
    quota: 60,
    soldCount: 45,
    soldPercent: 75,
    stockNote: "ขายแล้ว 75% (เหลือ 15 แพ็ก)",
    schedule: "TODAY",
    href: "/figures/acc-8001",
    isActive: true,
  },

  // --- ดีลรอบวันถัดไป (TOMORROW / UPCOMING) ---
  {
    id: 2003,
    kind: "MANGA",
    title: "Jujutsu Kaisen มหาเวทผนึกมาร เล่ม 1",
    categoryLabel: "มังงะลดล่วงหน้า",
    originalPrice: 95,
    salePrice: 76,
    discountPercent: 20,
    imageUrl: "/images/products/jjk-vol-01.jpg",
    volume: 1,
    quota: 40,
    soldCount: 0,
    soldPercent: 0,
    stockNote: "ขายแล้ว 0% (โควตา 40 เล่ม)",
    schedule: "TOMORROW",
    href: "/manga/jujutsu-kaisen",
    isActive: true,
  },
  {
    id: 2004,
    kind: "FIGURE",
    title: "Nendoroid Tanjiro Kamado (ดาบพิฆาตอสูร)",
    categoryLabel: "ฟิกเกอร์ลดล่วงหน้า",
    originalPrice: 1890,
    salePrice: 1512,
    discountPercent: 20,
    imageUrl: "/images/products/figure-2004.jpg",
    quota: 15,
    soldCount: 0,
    soldPercent: 0,
    stockNote: "ขายแล้ว 0% (โควตา 15 กล่อง)",
    schedule: "TOMORROW",
    href: "/figures/nendoroid-tanjiro-kamado",
    isActive: true,
  },
  {
    id: 8002,
    kind: "ACCESSORY",
    title: "กล่องอะคริลิกโชว์ฟิกเกอร์เกรดพรีเมียมกันฝุ่น UV",
    categoryLabel: "อุปกรณ์ลดล่วงหน้า",
    originalPrice: 650,
    salePrice: 520,
    discountPercent: 20,
    imageUrl: "/images/products/acc-8002.jpg",
    quota: 20,
    soldCount: 0,
    soldPercent: 0,
    stockNote: "ขายแล้ว 0% (โควตา 20 ชิ้น)",
    schedule: "TOMORROW",
    href: "/figures/acc-8002",
    isActive: true,
  },
];

export function getFlashSaleDeals(): FlashSaleItem[] {
  if (typeof window === "undefined") return DEFAULT_FLASH_DEALS;
  try {
    const raw = localStorage.getItem(FLASH_SALE_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(FLASH_SALE_STORAGE_KEY, JSON.stringify(DEFAULT_FLASH_DEALS));
      return DEFAULT_FLASH_DEALS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(FLASH_SALE_STORAGE_KEY, JSON.stringify(DEFAULT_FLASH_DEALS));
      return DEFAULT_FLASH_DEALS;
    }

    // Auto-heal legacy broken routes and compute progress
    let needsUpdate = false;
    const sanitized = parsed.map((item: FlashSaleItem) => {
      let href = item.href;
      if (href === "/manga/chainsaw") {
        href = "/manga/chainsaw-man";
        needsUpdate = true;
      } else if (href === "/manga/jjk") {
        href = "/manga/jujutsu-kaisen";
        needsUpdate = true;
      } else if (href === "/figures/nendoroid-tanjiro") {
        href = "/figures/nendoroid-tanjiro-kamado";
        needsUpdate = true;
      } else if (href?.startsWith("/accessories/")) {
        href = href.replace("/accessories/", "/figures/");
        needsUpdate = true;
      }
      const quota = item.quota ?? 20;
      const soldCount = item.soldCount ?? Math.round(((item.soldPercent ?? 0) / 100) * quota);
      const { soldPercent, stockNote } = calculateFlashSaleProgress(quota, soldCount, item.kind);
      return {
        ...item,
        href,
        quota,
        soldCount,
        soldPercent: item.soldPercent ?? soldPercent,
        stockNote: item.stockNote ?? stockNote,
        schedule: item.schedule ?? "TODAY",
      };
    });

    if (needsUpdate) {
      localStorage.setItem(FLASH_SALE_STORAGE_KEY, JSON.stringify(sanitized));
    }

    return sanitized;
  } catch {
    return DEFAULT_FLASH_DEALS;
  }
}

export function saveFlashSaleDeal(item: FlashSaleItem): void {
  const current = getFlashSaleDeals();
  const index = current.findIndex((deal) => deal.id === item.id);
  let updated: FlashSaleItem[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = item;
  } else {
    updated = [item, ...current];
  }

  if (typeof window !== "undefined") {
    localStorage.setItem(FLASH_SALE_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event(FLASH_SALE_UPDATED_EVENT));
  }
}

export function toggleFlashSaleDealStatus(id: number): void {
  const current = getFlashSaleDeals();
  const updated = current.map((deal) =>
    deal.id === id ? { ...deal, isActive: !deal.isActive } : deal,
  );
  if (typeof window !== "undefined") {
    localStorage.setItem(FLASH_SALE_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event(FLASH_SALE_UPDATED_EVENT));
  }
}

export function deleteFlashSaleDeal(id: number): void {
  const current = getFlashSaleDeals();
  const updated = current.filter((deal) => deal.id !== id);
  if (typeof window !== "undefined") {
    localStorage.setItem(FLASH_SALE_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event(FLASH_SALE_UPDATED_EVENT));
  }
}

export function resetFlashSaleDeals(): FlashSaleItem[] {
  if (typeof window !== "undefined") {
    localStorage.setItem(FLASH_SALE_STORAGE_KEY, JSON.stringify(DEFAULT_FLASH_DEALS));
    window.dispatchEvent(new Event(FLASH_SALE_UPDATED_EVENT));
  }
  return DEFAULT_FLASH_DEALS;
}

export function subscribeFlashSaleDeals(
  callback: (deals: FlashSaleItem[]) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const handler = () => {
    callback(getFlashSaleDeals());
  };

  window.addEventListener(FLASH_SALE_UPDATED_EVENT, handler);
  window.addEventListener("storage", handler);

  return () => {
    window.removeEventListener(FLASH_SALE_UPDATED_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

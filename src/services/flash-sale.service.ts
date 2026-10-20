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
  soldPercent: number;
  stockNote: string;
  href: string;
  isActive: boolean;
}

export const FLASH_SALE_STORAGE_KEY = "mock_flash_sale_deals";
export const FLASH_SALE_UPDATED_EVENT = "mock_flash_sale_updated";

export const DEFAULT_FLASH_DEALS: FlashSaleItem[] = [
  {
    id: 2001,
    kind: "MANGA",
    title: "Chainsaw Man เล่ม 1 (ลิขสิทธิ์แท้)",
    categoryLabel: "มังงะ",
    originalPrice: 95,
    salePrice: 76,
    discountPercent: 20,
    imageUrl: "/images/products/chainsaw-vol-01.jpg",
    volume: 1,
    soldPercent: 88,
    stockNote: "ขายแล้ว 88% (เหลือ 6 เล่ม)",
    href: "/manga/chainsaw",
    isActive: true,
  },
  {
    id: 2002,
    kind: "FIGURE",
    title: "Pop Up Parade Sukuna (มหาเวทย์ผนึกมาร)",
    categoryLabel: "ฟิกเกอร์พร้อมส่ง",
    originalPrice: 1400,
    salePrice: 1120,
    discountPercent: 20,
    imageUrl: "/images/products/figure-2002.jpg",
    soldPercent: 92,
    stockNote: "ขายแล้ว 92% (เหลือ 2 กล่อง)",
    href: "/figures/pop-up-parade-sukuna",
    isActive: true,
  },
  {
    id: 3001,
    kind: "MANGA",
    title: "Frieren: คำอธิษฐานในวันที่จากลา เล่ม 1",
    categoryLabel: "มังงะ",
    originalPrice: 115,
    salePrice: 92,
    discountPercent: 20,
    imageUrl: "/images/products/frieren-vol-01.jpg",
    volume: 1,
    soldPercent: 82,
    stockNote: "ขายแล้ว 82% (เหลือ 9 เล่ม)",
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
    soldPercent: 74,
    stockNote: "ขายแล้ว 74% (เหลือ 15 แพ็ก)",
    href: "/accessories/acc-8001",
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
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_FLASH_DEALS;
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

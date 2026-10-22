import type { MockCatalogVariant } from "./products.mock";

export interface RewardItem {
  id: string;
  title: string;
  description: string;
  pointsRequired: number;
  stock: number;
  imageUrl: string;
  category: "BOOKMARK" | "POSTCARD" | "ACRYLIC" | "ACCESSORY" | "BADGE";
  badge?: string;
}

export type MockRewardItem = RewardItem;

export const MOCK_REWARDS: RewardItem[] = [
  {
    id: "rew-001",
    title: "ที่คั่นหนังสือโฮโลแกรม Jujutsu Kaisen Special Edition",
    description: "พิมพ์ฟอยล์สะท้อนแสงโฮโลแกรมแท้ ขนาด 5x15 ซม. ผลิตจำนวนจำกัด",
    pointsRequired: 50,
    stock: 25,
    imageUrl: "/images/rewards/reward-jjk-bookmark.jpg",
    category: "BOOKMARK",
    badge: "EXCLUSIVE REWARD",
  },
  {
    id: "rew-002",
    title: "โปสการ์ดฟอยล์ทอง Frieren & Fern Memorial Art",
    description: "ภาพพิมพ์กระดาษนำเข้า 350 แกรม เคลือบขอบทองพิเศษสำหรับนักสะสม",
    pointsRequired: 80,
    stock: 18,
    imageUrl: "/images/rewards/reward-frieren-postcard.jpg",
    category: "POSTCARD",
    badge: "EXCLUSIVE REWARD",
  },
  {
    id: "rew-003",
    title: "สแตนดี้อะคริลิกจิบิ Anya Forger Mini Stand (Spy x Family)",
    description: "อะคริลิกใสหนา 3 มม. ลายเส้นจิบิลิขสิทธิ์แท้พร้อมฐานเสียบ",
    pointsRequired: 150,
    stock: 12,
    imageUrl: "/images/rewards/reward-anya-standee.jpg",
    category: "ACRYLIC",
    badge: "EXCLUSIVE REWARD",
  },
  {
    id: "rew-004",
    title: "ซองใสถนอมหนังสือมังงะแบบมีแถบกาว Pack 10 แผ่น",
    description: "ซอง OPP เกรดพรีเมียม ป้องกันฝุ่นและความชื้น ไม่ดูดหมึกปกหนังสือ",
    pointsRequired: 40,
    stock: 50,
    imageUrl: "/images/rewards/reward-manga-sleeves.jpg",
    category: "ACCESSORY",
    badge: "EXCLUSIVE REWARD",
  },
  {
    id: "rew-005",
    title: "พวงกุญแจอะคริลิก Yoichi Isagi (Blue Lock)",
    description: "พวงกุญแจสองด้านพร้อมห่วงคล้องรมดำ แข็งแรง ทนทานต่อรอยขีดข่วน",
    pointsRequired: 120,
    stock: 15,
    imageUrl: "/images/rewards/reward-blue-lock-keychain.jpg",
    category: "ACRYLIC",
    badge: "EXCLUSIVE REWARD",
  },
  {
    id: "rew-006",
    title: "เข็มกลัดโลหะดาบพิฆาตอสูร Tanjiro Kamado Hanafuda Motif",
    description: "เข็มกลัดลงยาขัดเงาพิเศษ ขนาด 3.5 ซม. พร้อมการ์ดรองลายดาบพิฆาตอสูร",
    pointsRequired: 90,
    stock: 20,
    imageUrl: "/images/rewards/reward-tanjiro-badge.jpg",
    category: "BADGE",
    badge: "EXCLUSIVE REWARD",
  },
];

export const MOCK_REWARDS_CATALOG = MOCK_REWARDS;

export const REWARDS_STORAGE_KEY = "mock_rewards_catalog";
export const MOCK_REWARDS_UPDATED_EVENT = "mock_rewards_catalog_updated";

/**
 * แปลง string id เช่น 'rew-001' เป็นตัวเลขที่ปลอดภัยสำหรับตะกร้าและระบบ Checkout
 */
export function getRewardNumericId(rewardId: string | number): number {
  if (typeof rewardId === "number") return rewardId;
  const match = rewardId.match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    return 80000 + num;
  }
  return 80001;
}

export function listRewards(): RewardItem[] {
  if (typeof window === "undefined") return [...MOCK_REWARDS];
  try {
    const raw = localStorage.getItem(REWARDS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(REWARDS_STORAGE_KEY, JSON.stringify(MOCK_REWARDS));
      return [...MOCK_REWARDS];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return [...MOCK_REWARDS];
  } catch {
    return [...MOCK_REWARDS];
  }
}

export function findRewardItem(id: string | number): RewardItem | undefined {
  const strId = String(id);
  const numId = typeof id === "number" ? id : getRewardNumericId(id);
  const currentRewards = listRewards();
  return currentRewards.find(
    (item) => item.id === strId || getRewardNumericId(item.id) === numId,
  );
}

export function saveRewardItem(item: RewardItem): void {
  const current = listRewards();
  const index = current.findIndex((r) => r.id === item.id);
  let updated: RewardItem[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = item;
  } else {
    updated = [item, ...current];
  }

  if (typeof window !== "undefined") {
    localStorage.setItem(REWARDS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event(MOCK_REWARDS_UPDATED_EVENT));
  }
}

export function deleteRewardItem(id: string): void {
  const current = listRewards();
  const updated = current.filter((r) => r.id !== id);
  if (typeof window !== "undefined") {
    localStorage.setItem(REWARDS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event(MOCK_REWARDS_UPDATED_EVENT));
  }
}

export function resetRewardsCatalog(): RewardItem[] {
  if (typeof window !== "undefined") {
    localStorage.setItem(REWARDS_STORAGE_KEY, JSON.stringify(MOCK_REWARDS));
    window.dispatchEvent(new Event(MOCK_REWARDS_UPDATED_EVENT));
  }
  return [...MOCK_REWARDS];
}

export function subscribeRewards(callback: (rewards: RewardItem[]) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handler = () => {
    callback(listRewards());
  };

  window.addEventListener(MOCK_REWARDS_UPDATED_EVENT, handler);
  window.addEventListener("storage", handler);

  return () => {
    window.removeEventListener(MOCK_REWARDS_UPDATED_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

/**
 * แปลงรายการของรางวัลเป็น MockCatalogVariant สำหรับรองรับระบบ Checkout และตะกร้าสินค้า
 * กำหนด price: 0 เพื่อไม่คิดค่าใช้จ่าย และไม่กระทบฐานภาษี VAT
 */
export function findRewardCheckoutVariant(
  productVariantId: number,
): MockCatalogVariant | null {
  if (productVariantId >= 99000 && productVariantId < 99999) {
    return {
      productType: "GOODS",
      title: "รางวัลตู้จับฉลาก Ichiban Kuji",
      price: 0,
      weightGrams: 50,
      isPreorder: false,
      stockOrQuotaRemaining: 999,
      subcategory: "REWARD",
    };
  }
  const reward = findRewardItem(productVariantId);
  if (!reward) return null;

  return {
    productType: "GOODS",
    title: `[แลกแต้มฟรี] ${reward.title}`,
    price: 0,
    weightGrams: 50,
    isPreorder: false,
    stockOrQuotaRemaining: reward.stock,
    subcategory: "REWARD",
  };
}

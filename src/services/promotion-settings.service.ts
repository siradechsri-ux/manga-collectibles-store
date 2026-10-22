export interface PromotionSettings {
  freeShippingThreshold: number; // e.g. 800
  bonusGiftThreshold: number; // e.g. 1500
  bonusGiftTitle: string; // e.g. "ที่คั่นหนังสือโฮโลแกรม Limited Edition"
  tier1MinVolumes: number; // e.g. 3
  tier1DiscountPercent: number; // e.g. 5
  tier2MinVolumes: number; // e.g. 6
  tier2DiscountPercent: number; // e.g. 8
  tier3MinVolumes: number; // e.g. 10
  tier3DiscountPercent: number; // e.g. 10
  isFlashSaleActive: boolean;
  pointsRate: number; // แต้มที่ใช้ต่อ 1 บาท (มาตรฐาน: 10 แต้ม = 1 บาท)
  minPointsToRedeem: number; // ขั้นต่ำในการใช้แต้ม (เช่น 10 แต้ม)
  maxPointsDiscountPercent: number; // เพดานส่วนลดสูงสุดจากแต้มเทียบกับยอดสั่งซื้อ (%)
}

export const DEFAULT_PROMOTION_SETTINGS: PromotionSettings = {
  freeShippingThreshold: 800,
  bonusGiftThreshold: 1500,
  bonusGiftTitle: "ที่คั่นหนังสือโฮโลแกรม Limited Edition",
  tier1MinVolumes: 3,
  tier1DiscountPercent: 5,
  tier2MinVolumes: 6,
  tier2DiscountPercent: 8,
  tier3MinVolumes: 10,
  tier3DiscountPercent: 10,
  isFlashSaleActive: true,
  pointsRate: 10,
  minPointsToRedeem: 10,
  maxPointsDiscountPercent: 50,
};

export const PROMOTION_SETTINGS_STORAGE_KEY = "mock_promotion_settings";
export const PROMOTION_SETTINGS_UPDATED_EVENT = "mock_promotion_settings_updated";

export function getPromotionSettings(): PromotionSettings {
  if (typeof window === "undefined") return DEFAULT_PROMOTION_SETTINGS;
  try {
    const raw = localStorage.getItem(PROMOTION_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_PROMOTION_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PROMOTION_SETTINGS,
      ...parsed,
    };
  } catch {
    return DEFAULT_PROMOTION_SETTINGS;
  }
}

export function updatePromotionSettings(
  partial: Partial<PromotionSettings>,
): PromotionSettings {
  const current = getPromotionSettings();
  const next: PromotionSettings = {
    ...current,
    ...partial,
  };

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(PROMOTION_SETTINGS_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(PROMOTION_SETTINGS_UPDATED_EVENT));
    } catch (e) {
      console.error("Failed to save promotion settings:", e);
    }
  }

  return next;
}

export function resetPromotionSettings(): PromotionSettings {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(
        PROMOTION_SETTINGS_STORAGE_KEY,
        JSON.stringify(DEFAULT_PROMOTION_SETTINGS),
      );
      window.dispatchEvent(new Event(PROMOTION_SETTINGS_UPDATED_EVENT));
    } catch (e) {
      console.error("Failed to reset promotion settings:", e);
    }
  }
  return DEFAULT_PROMOTION_SETTINGS;
}

export function subscribePromotionSettings(
  callback: (settings: PromotionSettings) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const handler = () => {
    callback(getPromotionSettings());
  };

  window.addEventListener(PROMOTION_SETTINGS_UPDATED_EVENT, handler);
  window.addEventListener("storage", handler);

  return () => {
    window.removeEventListener(PROMOTION_SETTINGS_UPDATED_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

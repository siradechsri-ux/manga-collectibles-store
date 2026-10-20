"use client";

import { deductPoints, getUserPoints } from "./points.service";

export const MOCK_KUJI_STORAGE_KEY = "mock_kuji_history";
export const MOCK_KUJI_STOCK_KEY = "mock_kuji_remaining_tickets";
export const MOCK_KUJI_CONFIG_KEY = "mock_kuji_config";
export const MOCK_KUJI_PRIZES_KEY = "mock_kuji_prizes";
export const KUJI_UPDATED_EVENT = "manga-collectibles-kuji-updated";

export type KujiGrade = "A" | "B" | "C" | "D" | "E";

export interface KujiPrize {
  grade: KujiGrade;
  title: string;
  categoryName: string;
  description: string;
  imageUrl: string;
  valueBaht: number;
  weight: number; // น้ำหนักความน่าจะเป็น
  stockCount: number; // จำนวนชิ้นในตู้
  isDiscountCode?: boolean;
  discountCode?: string;
}

export interface KujiConfig {
  title: string;
  pointsPerDraw: number;
  totalTicketsBox: number;
  isActive: boolean;
}

export interface KujiDrawResult {
  id: string;
  prize: KujiPrize;
  ticketNumber: number;
  drawnAt: string;
  pointsSpent: number;
}

export const DEFAULT_KUJI_CONFIG: KujiConfig = {
  title: "Ichiban Kuji - All-Stars Anime Collection Vol.1",
  pointsPerDraw: 50,
  totalTicketsBox: 50,
  isActive: true,
};

export const DEFAULT_KUJI_PRIZES: KujiPrize[] = [
  {
    grade: "A",
    title: "ฟิกเกอร์สเกล 1/7 Satoru Gojo Shibuya Incident Ver. (งานแท้)",
    categoryName: "รางวัลระดับมาสเตอร์ (Master Scale Figure)",
    description: "ฟิกเกอร์ลงสีสำเร็จรูป สเกล 1/7 พร้อมเอฟเฟกต์อาณาจักรไร้มาตรการ กล่องแท้นำเข้าจากญี่ปุ่น",
    imageUrl: "/images/products/figure-2002.jpg",
    valueBaht: 2890,
    weight: 6,
    stockCount: 1,
  },
  {
    grade: "B",
    title: "สแตนดี้อะคริลิกจิบิ Anya Forger Mini Stand (Spy x Family)",
    categoryName: "สแตนดี้อะคริลิกพรีเมียม",
    description: "อะคริลิกใสหนา 3 มม. ลายเส้นจิบิลิขสิทธิ์แท้พร้อมฐานเสียบลายพิเศษ",
    imageUrl: "/images/rewards/reward-anya-standee.jpg",
    valueBaht: 450,
    weight: 14,
    stockCount: 2,
  },
  {
    grade: "C",
    title: "โปสการ์ดฟอยล์ทอง Frieren & Fern Memorial Art Collection",
    categoryName: "อาร์ตเวิร์กพิมพ์ฟอยล์ทอง",
    description: "ภาพพิมพ์กระดาษนำเข้า 350 แกรม เคลือบขอบทองพิเศษสำหรับนักสะสม",
    imageUrl: "/images/rewards/reward-frieren-postcard.jpg",
    valueBaht: 250,
    weight: 25,
    stockCount: 5,
  },
  {
    grade: "D",
    title: "พวงกุญแจอะคริลิกไดคัท Yoichi Isagi (Blue Lock)",
    categoryName: "พวงกุญแจอะคริลิกสองด้าน",
    description: "พวงกุญแจสองด้านพร้อมห่วงคล้องรมดำ แข็งแรง ทนทานต่อรอยขีดข่วน",
    imageUrl: "/images/rewards/reward-blue-lock-keychain.jpg",
    valueBaht: 180,
    weight: 30,
    stockCount: 12,
  },
  {
    grade: "E",
    title: "คูปองส่วนลดเงินสด ฿50 สำหรับคำสั่งซื้อถัดไป",
    categoryName: "โค้ดส่วนลดคำสั่งซื้อ",
    description: "ใช้เป็นส่วนลดท้ายบิลเมื่อสั่งซื้อมังงะและของสะสมครบ 200 บาท",
    imageUrl: "/images/rewards/reward-tanjiro-badge.jpg",
    valueBaht: 50,
    weight: 25,
    stockCount: 30,
    isDiscountCode: true,
    discountCode: "KUJI50",
  },
];

function notifyKujiChanged(): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent(KUJI_UPDATED_EVENT));
  } catch {
    // Ignore
  }
}

export function getKujiConfig(): KujiConfig {
  if (typeof window === "undefined") return { ...DEFAULT_KUJI_CONFIG };
  try {
    const raw = window.localStorage.getItem(MOCK_KUJI_CONFIG_KEY);
    if (!raw) {
      window.localStorage.setItem(
        MOCK_KUJI_CONFIG_KEY,
        JSON.stringify(DEFAULT_KUJI_CONFIG),
      );
      return { ...DEFAULT_KUJI_CONFIG };
    }
    return JSON.parse(raw);
  } catch {
    return { ...DEFAULT_KUJI_CONFIG };
  }
}

export function updateKujiConfig(updates: Partial<KujiConfig>): KujiConfig {
  const current = getKujiConfig();
  const next = { ...current, ...updates };
  try {
    window.localStorage.setItem(MOCK_KUJI_CONFIG_KEY, JSON.stringify(next));
    notifyKujiChanged();
  } catch {
    // Ignore
  }
  return next;
}

export function getKujiPrizes(): KujiPrize[] {
  if (typeof window === "undefined") return [...DEFAULT_KUJI_PRIZES];
  try {
    const raw = window.localStorage.getItem(MOCK_KUJI_PRIZES_KEY);
    if (!raw) {
      window.localStorage.setItem(
        MOCK_KUJI_PRIZES_KEY,
        JSON.stringify(DEFAULT_KUJI_PRIZES),
      );
      return [...DEFAULT_KUJI_PRIZES];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed
      : [...DEFAULT_KUJI_PRIZES];
  } catch {
    return [...DEFAULT_KUJI_PRIZES];
  }
}

export function updateKujiPrize(
  grade: KujiGrade,
  updates: Partial<KujiPrize>,
): KujiPrize[] {
  const prizes = getKujiPrizes();
  const index = prizes.findIndex((p) => p.grade === grade);
  if (index !== -1) {
    prizes[index] = { ...prizes[index], ...updates };
    try {
      window.localStorage.setItem(MOCK_KUJI_PRIZES_KEY, JSON.stringify(prizes));
      notifyKujiChanged();
    } catch {
      // Ignore
    }
  }
  return prizes;
}

export function resetKujiPrizes(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      MOCK_KUJI_PRIZES_KEY,
      JSON.stringify(DEFAULT_KUJI_PRIZES),
    );
    notifyKujiChanged();
  } catch {
    // Ignore
  }
}

export function getRemainingKujiTickets(): number {
  const config = getKujiConfig();
  if (typeof window === "undefined") return config.totalTicketsBox;
  try {
    const raw = window.localStorage.getItem(MOCK_KUJI_STOCK_KEY);
    if (!raw) {
      window.localStorage.setItem(MOCK_KUJI_STOCK_KEY, "28");
      return 28;
    }
    const parsed = parseInt(raw, 10);
    return Number.isNaN(parsed) || parsed < 0 ? 28 : parsed;
  } catch {
    return 28;
  }
}

export function getKujiHistory(): KujiDrawResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(MOCK_KUJI_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * สุ่มรางวัลตามน้ำหนักความน่าจะเป็น
 */
function pickRandomPrize(): KujiPrize {
  const prizes = getKujiPrizes();
  const totalWeight = prizes.reduce((acc, p) => acc + p.weight, 0);
  let random = Math.random() * totalWeight;
  for (const prize of prizes) {
    if (random < prize.weight) {
      return prize;
    }
    random -= prize.weight;
  }
  return prizes[prizes.length - 1];
}

/**
 * ดำเนินการจับฉลาก 1 ตั๋ว
 */
export function drawKujiTicket(): {
  success: boolean;
  result?: KujiDrawResult;
  message?: string;
} {
  if (typeof window === "undefined") {
    return { success: false, message: "ระบบยังไม่พร้อมทำงาน" };
  }

  const config = getKujiConfig();
  if (!config.isActive) {
    return { success: false, message: "ตู้จับฉลากปิดให้บริการชั่วคราวโดยผู้ดูแลระบบ" };
  }

  const remaining = getRemainingKujiTickets();
  if (remaining <= 0) {
    return { success: false, message: "ตั๋วในเซ็ตนี้หมดแล้ว กรุณารีเซ็ตกล่องใหม่" };
  }

  const userPoints = getUserPoints();
  if (userPoints < config.pointsPerDraw) {
    return {
      success: false,
      message: `แต้มสะสมไม่เพียงพอ (ต้องการ ${config.pointsPerDraw} P, คุณมี ${userPoints} P)`,
    };
  }

  // หักแต้ม
  const deducted = deductPoints(
    config.pointsPerDraw,
    `จับฉลากลุ้นรางวัล Ichiban Kuji (1 ตั๋ว / -${config.pointsPerDraw} P)`,
  );
  if (!deducted) {
    return { success: false, message: "ไม่สามารถหักแต้มสะสมได้" };
  }

  const prize = pickRandomPrize();
  const ticketNumber = config.totalTicketsBox - remaining + 1;
  const result: KujiDrawResult = {
    id: `kuji-${Date.now()}`,
    prize,
    ticketNumber,
    drawnAt: new Date().toISOString(),
    pointsSpent: config.pointsPerDraw,
  };

  try {
    // ลดจำนวนตั๋วคงเหลือ
    window.localStorage.setItem(
      MOCK_KUJI_STOCK_KEY,
      String(Math.max(0, remaining - 1)),
    );

    // บันทึกประวัติ
    const history = getKujiHistory();
    window.localStorage.setItem(
      MOCK_KUJI_STORAGE_KEY,
      JSON.stringify([result, ...history]),
    );
    notifyKujiChanged();
  } catch {
    // Ignore
  }

  return { success: true, result };
}

export function resetKujiBox(): void {
  const config = getKujiConfig();
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      MOCK_KUJI_STOCK_KEY,
      String(config.totalTicketsBox),
    );
    notifyKujiChanged();
  } catch {
    // Ignore
  }
}

export function subscribeKuji(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  window.addEventListener(KUJI_UPDATED_EVENT, listener);
  window.addEventListener("storage", listener);

  return () => {
    window.removeEventListener(KUJI_UPDATED_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

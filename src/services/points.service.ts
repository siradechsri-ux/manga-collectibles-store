"use client";

export const MOCK_POINTS_STORAGE_KEY = "mock_user_points";
export const MOCK_POINTS_LEDGER_STORAGE_KEY = "mock_user_points_ledger";
export const MOCK_POINTS_DEFAULT = 450;
export const MOCK_POINTS_UPDATED_EVENT = "manga-collectibles-points-updated";
export const MOCK_LEDGER_UPDATED_EVENT = "manga-collectibles-ledger-updated";

export type PointsTransactionType =
  | "EARN_ORDER"
  | "EARN_REVIEW"
  | "REDEEM_REWARD"
  | "DEV_BONUS"
  | "WELCOME_BONUS";

export interface PointsLedgerEntry {
  id: string;
  type: PointsTransactionType;
  amount: number; // บวกเมื่อได้รับ, ลบเมื่อใช้ไป
  balanceAfter: number;
  description: string;
  referenceId?: string;
  createdAt: string;
}

export type MemberTier = "MEMBER" | "SILVER" | "GOLD" | "PLATINUM";

export interface MemberTierInfo {
  tier: MemberTier;
  name: string;
  subname: string;
  badgeClass: string;
  multiplier: number;
  minPoints: number;
  nextTierMinPoints?: number;
  benefits: string[];
}

export const MEMBER_TIERS: Record<MemberTier, MemberTierInfo> = {
  MEMBER: {
    tier: "MEMBER",
    name: "สมาชิกทั่วไป",
    subname: "Regular Member",
    badgeClass:
      "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700",
    multiplier: 1.0,
    minPoints: 0,
    nextTierMinPoints: 500,
    benefits: [
      "รับ 1 แต้มทุก 50 บาทจากการสั่งซื้อเมื่อการเงินอนุมัติสลิป",
      "แลกรับของสะสมและอุปกรณ์ถนอมมังงะลิขสิทธิ์แท้",
      "บันทึกรายการสินค้าที่ชอบ (Wishlist) ได้ไม่จำกัด",
    ],
  },
  SILVER: {
    tier: "SILVER",
    name: "สมาชิกระดับเงิน",
    subname: "Silver Member",
    badgeClass:
      "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600",
    multiplier: 1.2,
    minPoints: 500,
    nextTierMinPoints: 1200,
    benefits: [
      "รับแต้มคูณ x1.2 ทุกคำสั่งซื้อสินค้าและของสะสม",
      "ส่วนลดค่าจัดส่ง 20 บาทอัตโนมัติทุกคำสั่งซื้อ",
      "สิทธิ์แลกรับของรางวัลพิเศษล่วงหน้าก่อนสมาชิกทั่วไป",
    ],
  },
  GOLD: {
    tier: "GOLD",
    name: "สมาชิกระดับทอง",
    subname: "Gold VIP",
    badgeClass:
      "bg-amber-50 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-700",
    multiplier: 1.5,
    minPoints: 1200,
    nextTierMinPoints: 2500,
    benefits: [
      "รับแต้มคูณ x1.5 สูงสุดสำหรับนักสะสมมังงะและฟิกเกอร์",
      "จัดส่งฟรีมาตรฐานทุกคำสั่งซื้อไม่มีขั้นต่ำ",
      "สิทธิ์จองฟิกเกอร์สเกลและพลาโมเดลโควตาพรีเมียม",
      "รับการ์ดขอบคุณและของขวัญวันเกิดประจำปี",
    ],
  },
  PLATINUM: {
    tier: "PLATINUM",
    name: "สมาชิกแพลทินัม",
    subname: "Platinum Legend",
    badgeClass:
      "bg-purple-50 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-300 dark:border-purple-700",
    multiplier: 2.0,
    minPoints: 2500,
    benefits: [
      "รับแต้มคูณ x2.0 เท่าตัวในทุกรายการสั่งซื้อ",
      "บริการห่อปกใสฟรีทุกเล่ม และแพ็กกล่องดามมุมหนา 4 ชั้น",
      "บริการประสานงานสั่งซื้อของสะสมหายากจากญี่ปุ่นโดยตรง",
      "สิทธิ์ร่วมงาน Meet & Greet และอีเวนต์พิเศษของทางร้าน",
    ],
  },
};

export function getUserTier(points?: number): MemberTierInfo {
  const p = typeof points === "number" ? points : getUserPoints();
  if (p >= 2500) return MEMBER_TIERS.PLATINUM;
  if (p >= 1200) return MEMBER_TIERS.GOLD;
  if (p >= 500) return MEMBER_TIERS.SILVER;
  return MEMBER_TIERS.MEMBER;
}

/**
 * คำนวณแต้มสะสมที่จะได้รับจากยอดสั่งซื้อ
 * - ทุก 50 บาท = 1 แต้มพื้นฐาน
 * - คูณด้วยตัวคูณตามระดับสมาชิก (Member x1.0, Silver x1.2, Gold x1.5, Platinum x2.0)
 */
export function calculateEarnedPoints(
  amount: number,
  currentPoints?: number,
): {
  basePoints: number;
  multiplier: number;
  totalEarnedPoints: number;
  tier: MemberTierInfo;
} {
  const tier = getUserTier(currentPoints);
  const validAmount = Number.isFinite(amount) && amount > 0 ? amount : 0;
  const basePoints = Math.floor(validAmount / 50);
  const totalEarnedPoints = Math.floor(basePoints * tier.multiplier);
  return {
    basePoints,
    multiplier: tier.multiplier,
    totalEarnedPoints,
    tier,
  };
}

const SEED_LEDGER_ENTRIES: PointsLedgerEntry[] = [
  {
    id: "tx-init-001",
    type: "WELCOME_BONUS",
    amount: 250,
    balanceAfter: 250,
    description: "โบนัสต้อนรับสมาชิกใหม่ ร้านสะสมมังงะและของสะสมแท้",
    createdAt: "2026-03-01T10:00:00Z",
  },
  {
    id: "tx-init-002",
    type: "EARN_ORDER",
    amount: 120,
    balanceAfter: 370,
    description: "รับแต้มจากคำสั่งซื้อ #1001 (Nendoroid Tanjiro Kamado)",
    referenceId: "1001",
    createdAt: "2026-03-10T14:30:00Z",
  },
  {
    id: "tx-init-003",
    type: "EARN_ORDER",
    amount: 70,
    balanceAfter: 440,
    description: "รับแต้มจากคำสั่งซื้อ #1002 (มังงะ Jujutsu Kaisen เล่ม 1-3)",
    referenceId: "1002",
    createdAt: "2026-03-25T16:15:00Z",
  },
  {
    id: "tx-init-004",
    type: "EARN_REVIEW",
    amount: 10,
    balanceAfter: 450,
    description: "รับแต้มพิเศษจากการเขียนรีวิวสินค้า 'มหาเวทผนึกมาร เล่ม 26'",
    referenceId: "rev-001",
    createdAt: "2026-04-02T11:20:00Z",
  },
];

/**
 * ดึงรายการประวัติการเคลื่อนไหวแต้มสะสม
 */
export function getPointsLedger(): PointsLedgerEntry[] {
  if (typeof window === "undefined") {
    return [...SEED_LEDGER_ENTRIES];
  }
  try {
    const raw = window.localStorage.getItem(MOCK_POINTS_LEDGER_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(
        MOCK_POINTS_LEDGER_STORAGE_KEY,
        JSON.stringify(SEED_LEDGER_ENTRIES),
      );
      return [...SEED_LEDGER_ENTRIES];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      window.localStorage.setItem(
        MOCK_POINTS_LEDGER_STORAGE_KEY,
        JSON.stringify(SEED_LEDGER_ENTRIES),
      );
      return [...SEED_LEDGER_ENTRIES];
    }
    return parsed;
  } catch {
    return [...SEED_LEDGER_ENTRIES];
  }
}

function notifyLedgerChanged(): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent(MOCK_LEDGER_UPDATED_EVENT));
  } catch {
    // Ignore
  }
}

function recordLedgerEntry(
  type: PointsTransactionType,
  amount: number,
  balanceAfter: number,
  description: string,
  referenceId?: string,
): void {
  if (typeof window === "undefined") return;
  const entry: PointsLedgerEntry = {
    id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type,
    amount,
    balanceAfter,
    description,
    referenceId,
    createdAt: new Date().toISOString(),
  };

  try {
    const currentList = getPointsLedger();
    const updated = [entry, ...currentList];
    window.localStorage.setItem(
      MOCK_POINTS_LEDGER_STORAGE_KEY,
      JSON.stringify(updated),
    );
    notifyLedgerChanged();
  } catch {
    // Ignore
  }
}

/**
 * ดึงแต้มสะสมปัจจุบันของผู้ใช้จาก LocalStorage (เริ่มต้น 450 แต้ม)
 */
export function getUserPoints(): number {
  if (typeof window === "undefined") {
    return MOCK_POINTS_DEFAULT;
  }
  try {
    const raw = window.localStorage.getItem(MOCK_POINTS_STORAGE_KEY);
    if (raw === null) {
      window.localStorage.setItem(
        MOCK_POINTS_STORAGE_KEY,
        String(MOCK_POINTS_DEFAULT),
      );
      return MOCK_POINTS_DEFAULT;
    }
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      window.localStorage.setItem(
        MOCK_POINTS_STORAGE_KEY,
        String(MOCK_POINTS_DEFAULT),
      );
      return MOCK_POINTS_DEFAULT;
    }
    return parsed;
  } catch {
    return MOCK_POINTS_DEFAULT;
  }
}

function notifyPointsChanged(points: number): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new CustomEvent(MOCK_POINTS_UPDATED_EVENT, { detail: { points } }),
    );
  } catch {
    // Graceful fallback
  }
}

/**
 * หักแต้มสะสมพร้อมบันทึกประวัติ
 */
export function deductPoints(
  amount: number,
  description = "ใช้แต้มแลกของรางวัลพรีเมียม",
  referenceId?: string,
): boolean {
  if (typeof window === "undefined") return false;
  if (!Number.isSafeInteger(amount) || amount <= 0) return false;

  const current = getUserPoints();
  if (current < amount) {
    return false;
  }

  const next = current - amount;
  try {
    window.localStorage.setItem(MOCK_POINTS_STORAGE_KEY, String(next));
    notifyPointsChanged(next);
    recordLedgerEntry(
      "REDEEM_REWARD",
      -amount,
      next,
      description,
      referenceId,
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * แลกของรางวัล ตรวจสอบแต้ม, หักแต้ม และบันทึกลง LocalStorage
 */
export function redeemReward(
  rewardId: string | number,
  cost: number,
  rewardTitle?: string,
): boolean {
  const desc = rewardTitle
    ? `แลกรับของรางวัล: ${rewardTitle}`
    : `แลกรับของรางวัลพรีเมียม #${rewardId}`;
  return deductPoints(cost, desc, String(rewardId));
}

/**
 * เติมแต้มสะสมจำลอง (สำหรับการทดสอบระบบหรือกิจกรรมพิเศษ)
 */
export function addPoints(
  amount: number,
  description = "โหมดทดสอบ: เติมแต้มสะสมจำลอง (+100 P)",
  type: PointsTransactionType = "DEV_BONUS",
  referenceId?: string,
): void {
  if (typeof window === "undefined") return;
  if (!Number.isSafeInteger(amount) || amount <= 0) return;

  const current = getUserPoints();
  const next = current + amount;
  try {
    window.localStorage.setItem(MOCK_POINTS_STORAGE_KEY, String(next));
    notifyPointsChanged(next);
    recordLedgerEntry(type, amount, next, description, referenceId);
  } catch {
    // Ignore storage errors in test mode
  }
}

/**
 * รีเซ็ตแต้มสะสมกลับเป็นค่าเริ่มต้น (450 แต้ม)
 */
export function resetPoints(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      MOCK_POINTS_STORAGE_KEY,
      String(MOCK_POINTS_DEFAULT),
    );
    window.localStorage.setItem(
      MOCK_POINTS_LEDGER_STORAGE_KEY,
      JSON.stringify(SEED_LEDGER_ENTRIES),
    );
    notifyPointsChanged(MOCK_POINTS_DEFAULT);
    notifyLedgerChanged();
  } catch {
    // Ignore storage errors in test mode
  }
}

/**
 * สมัครรับการแจ้งเตือนเมื่อแต้มมีการเปลี่ยนแปลงข้ามแท็บและข้ามคอมโพเนนต์
 */
export function subscribeUserPoints(
  listener: (points: number) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const handleCustomEvent = (event: Event) => {
    const custom = event as CustomEvent<{ points: number }>;
    if (custom.detail && typeof custom.detail.points === "number") {
      listener(custom.detail.points);
    } else {
      listener(getUserPoints());
    }
  };

  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key === MOCK_POINTS_STORAGE_KEY) {
      listener(getUserPoints());
    }
  };

  window.addEventListener(MOCK_POINTS_UPDATED_EVENT, handleCustomEvent);
  window.addEventListener("storage", handleStorageEvent);

  return () => {
    window.removeEventListener(MOCK_POINTS_UPDATED_EVENT, handleCustomEvent);
    window.removeEventListener("storage", handleStorageEvent);
  };
}

/**
 * สมัครรับการแจ้งเตือนเมื่อประวัติแต้มมีการเปลี่ยนแปลง
 */
export function subscribePointsLedger(
  listener: (entries: PointsLedgerEntry[]) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const handleCustomEvent = () => {
    listener(getPointsLedger());
  };

  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key === MOCK_POINTS_LEDGER_STORAGE_KEY) {
      listener(getPointsLedger());
    }
  };

  window.addEventListener(MOCK_LEDGER_UPDATED_EVENT, handleCustomEvent);
  window.addEventListener("storage", handleStorageEvent);

  return () => {
    window.removeEventListener(MOCK_LEDGER_UPDATED_EVENT, handleCustomEvent);
    window.removeEventListener("storage", handleStorageEvent);
  };
}

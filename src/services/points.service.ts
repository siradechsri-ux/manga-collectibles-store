"use client";

export const MOCK_POINTS_STORAGE_KEY = "mock_user_points";
export const MOCK_POINTS_DEFAULT = 450;
export const MOCK_POINTS_UPDATED_EVENT = "manga-collectibles-points-updated";

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
      window.localStorage.setItem(MOCK_POINTS_STORAGE_KEY, String(MOCK_POINTS_DEFAULT));
      return MOCK_POINTS_DEFAULT;
    }
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      window.localStorage.setItem(MOCK_POINTS_STORAGE_KEY, String(MOCK_POINTS_DEFAULT));
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
 * หักแต้มเมื่อแลกของรางวัล
 * @returns true หากหักแต้มสำเร็จ, false หากแต้มไม่พอ
 */
export function deductPoints(amount: number): boolean {
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
    return true;
  } catch {
    return false;
  }
}

/**
 * แลกของรางวัล ตรวจสอบแต้ม, หักแต้ม และบันทึกลง LocalStorage
 * @param rewardId รหัสของรางวัล
 * @param cost จำนวนแต้มที่ต้องใช้
 * @returns true หากแลกสำเร็จ
 */
export function redeemReward(rewardId: string | number, cost: number): boolean {
  return deductPoints(cost);
}

/**
 * เติมแต้มสะสมจำลอง (สำหรับการทดสอบระบบ)
 */
export function addPoints(amount: number): void {
  if (typeof window === "undefined") return;
  if (!Number.isSafeInteger(amount) || amount <= 0) return;

  const current = getUserPoints();
  const next = current + amount;
  try {
    window.localStorage.setItem(MOCK_POINTS_STORAGE_KEY, String(next));
    notifyPointsChanged(next);
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
    window.localStorage.setItem(MOCK_POINTS_STORAGE_KEY, String(MOCK_POINTS_DEFAULT));
    notifyPointsChanged(MOCK_POINTS_DEFAULT);
  } catch {
    // Ignore storage errors in test mode
  }
}

/**
 * สมัครรับการแจ้งเตือนเมื่อแต้มมีการเปลี่ยนแปลงข้ามแท็บและข้ามคอมโพเนนต์
 */
export function subscribeUserPoints(listener: (points: number) => void): () => void {
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

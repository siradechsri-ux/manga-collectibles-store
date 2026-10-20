"use client";

import { addPoints } from "./points.service";

export const MOCK_REVIEWS_STORAGE_KEY = "mock_product_reviews";
export const MOCK_REVIEWS_UPDATED_EVENT = "manga-collectibles-reviews-updated";

export interface ProductReview {
  id: string;
  targetId: string;
  targetType: "MANGA" | "LIGHT_NOVEL" | "FIGURE" | "PLAMO" | "GOODS" | "ACCESSORY";
  userName: string;
  userRole?: string;
  rating: number; // 1 to 5
  comment: string;
  isVerifiedPurchase: boolean;
  createdAt: string;
  likes: number;
}

const SEED_REVIEWS: ProductReview[] = [
  {
    id: "rev-jjk-01",
    targetId: "manga-1",
    targetType: "MANGA",
    userName: "ธีรภัทร (Collector_T)",
    rating: 5,
    comment:
      "เนื้อเรื่องเข้มข้นระดับตำนาน การแปลภาษาไทยลื่นไหล คมกริบมาก ตัวเล่มสภาพกริบ 100% สันไม่แตก ทางร้านแพ็กดามกระดาษแข็งประกบหน้าหลังมาอย่างดีครับ",
    isVerifiedPurchase: true,
    createdAt: "2026-03-12T14:20:00Z",
    likes: 14,
  },
  {
    id: "rev-jjk-02",
    targetId: "manga-1",
    targetType: "MANGA",
    userName: "นัทธมน P.",
    rating: 5,
    comment:
      "จัดส่งไวมาก สั่งวันเดียวของถึงมือ กระดาษถนอมสายตาคุณภาพดี แถมนั่งรอรับแต้มสะสม P ไว้แลกของรางวัล Exclusive ต่อ คุ้มค่าที่สุด!",
    isVerifiedPurchase: true,
    createdAt: "2026-03-20T09:45:00Z",
    likes: 8,
  },
  {
    id: "rev-frieren-01",
    targetId: "manga-2",
    targetType: "MANGA",
    userName: "Chayanon_M",
    rating: 5,
    comment:
      "ภาพสวยละมุนตามาก ความหมายลึกซึ้ง ของแถมและการ์ดสะสมในเล่มตรงปกแท้ไม่มีตำหนิ ใครลังเลอยู่แนะนำให้เก็บยกชุดเลยครับ",
    isVerifiedPurchase: true,
    createdAt: "2026-03-15T18:30:00Z",
    likes: 19,
  },
  {
    id: "rev-chainsaw-01",
    targetId: "manga-3",
    targetType: "MANGA",
    userName: "วรเมธ S.",
    rating: 5,
    comment:
      "เล่ม 1 เปิดหัวได้บ้าคลั่งตามสไตล์ อ.ฟูจิโมโตะ สันและมุมหนังสือคมกริบ ร้านแพ็กบับเบิ้ลหนาแน่นมาก ประทับใจการบริการครับ",
    isVerifiedPurchase: true,
    createdAt: "2026-03-18T16:10:00Z",
    likes: 11,
  },
  {
    id: "rev-fig-tanjiro-01",
    targetId: "fig-tanjiro-nendoroid",
    targetType: "FIGURE",
    userName: "กิตติพงษ์ K.",
    rating: 5,
    comment:
      "งานแท้ Good Smile Company 100% มีสติกเกอร์โฮโลแกรมลิขสิทธิ์ที่มุมกล่อง พาร์ทหน้าและเอฟเฟกต์ดาบคมสวยงามมาก กล่องไม่มีรอยยับแม้แต่นิดเดียว",
    isVerifiedPurchase: true,
    createdAt: "2026-03-08T11:00:00Z",
    likes: 23,
  },
  {
    id: "rev-fig-gojo-01",
    targetId: "fig-gojo-scale",
    targetType: "FIGURE",
    userName: "Pattaraphon_D",
    rating: 5,
    comment:
      "สเกล 1/7 ดีเทลตาและเอฟเฟกต์อาณาจักรไร้มาตรการทำออกมาได้สมบูรณ์แบบมาก ทางร้านห่อบับเบิ้ลหนา 4 ชั้นพร้อมกล่องสองชั้น มั่นใจได้เลยครับ",
    isVerifiedPurchase: true,
    createdAt: "2026-03-22T13:15:00Z",
    likes: 17,
  },
];

/**
 * ดึงรายการรีวิวทั้งหมดของสินค้ารายชิ้น
 */
export function getProductReviews(targetId: string): ProductReview[] {
  if (typeof window === "undefined") {
    return SEED_REVIEWS.filter(
      (r) => r.targetId === targetId || targetId.includes(r.targetId) || r.targetId.includes(targetId),
    );
  }

  try {
    const raw = window.localStorage.getItem(MOCK_REVIEWS_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(
        MOCK_REVIEWS_STORAGE_KEY,
        JSON.stringify(SEED_REVIEWS),
      );
      return SEED_REVIEWS.filter(
        (r) =>
          r.targetId === targetId ||
          targetId.includes(r.targetId) ||
          r.targetId.includes(targetId),
      );
    }
    const parsed: ProductReview[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      window.localStorage.setItem(
        MOCK_REVIEWS_STORAGE_KEY,
        JSON.stringify(SEED_REVIEWS),
      );
      return SEED_REVIEWS.filter(
        (r) =>
          r.targetId === targetId ||
          targetId.includes(r.targetId) ||
          r.targetId.includes(targetId),
      );
    }
    return parsed.filter(
      (r) =>
        r.targetId === targetId ||
        targetId.includes(r.targetId) ||
        r.targetId.includes(targetId),
    );
  } catch {
    return SEED_REVIEWS.filter(
      (r) =>
        r.targetId === targetId ||
        targetId.includes(r.targetId) ||
        r.targetId.includes(targetId),
    );
  }
}

function notifyReviewsChanged(): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent(MOCK_REVIEWS_UPDATED_EVENT));
  } catch {
    // Ignore
  }
}

export interface SubmitReviewInput {
  targetId: string;
  targetType: ProductReview["targetType"];
  targetTitle: string;
  userName: string;
  rating: number;
  comment: string;
}

/**
 * บันทึกรีวิวใหม่ พร้อมมอบแต้มโบนัสพิเศษ +10 P เข้ากระเป๋าแต้มสะสมทันที
 */
export function submitProductReview(input: SubmitReviewInput): {
  review: ProductReview;
  pointsAwarded: number;
} {
  const pointsAwarded = 10;
  const newReview: ProductReview = {
    id: `rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    targetId: input.targetId,
    targetType: input.targetType,
    userName: input.userName.trim() || "ลูกค้าสมาชิก",
    rating: Math.max(1, Math.min(5, Math.round(input.rating))),
    comment: input.comment.trim(),
    isVerifiedPurchase: true,
    createdAt: new Date().toISOString(),
    likes: 1,
  };

  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(MOCK_REVIEWS_STORAGE_KEY);
      const allReviews: ProductReview[] = raw ? JSON.parse(raw) : [...SEED_REVIEWS];
      const updated = [newReview, ...allReviews];
      window.localStorage.setItem(
        MOCK_REVIEWS_STORAGE_KEY,
        JSON.stringify(updated),
      );
      notifyReviewsChanged();

      // มอบแต้มสะสม +10 P พร้อมบันทึกลงใน Points Ledger
      addPoints(
        pointsAwarded,
        `รับแต้มพิเศษจากการเขียนรีวิว: ${input.targetTitle}`,
        "EARN_REVIEW",
        newReview.id,
      );
    } catch {
      // Ignore
    }
  }

  return { review: newReview, pointsAwarded };
}

/**
 * กดถูกใจ (Like) รีวิว
 */
export function likeProductReview(reviewId: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(MOCK_REVIEWS_STORAGE_KEY);
    const allReviews: ProductReview[] = raw ? JSON.parse(raw) : [...SEED_REVIEWS];
    const updated = allReviews.map((r) =>
      r.id === reviewId ? { ...r, likes: r.likes + 1 } : r,
    );
    window.localStorage.setItem(
      MOCK_REVIEWS_STORAGE_KEY,
      JSON.stringify(updated),
    );
    notifyReviewsChanged();
  } catch {
    // Ignore
  }
}

/**
 * สมัครรับการแจ้งเตือนเมื่อมีการอัปเดตรีวิว
 */
export function subscribeReviews(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  window.addEventListener(MOCK_REVIEWS_UPDATED_EVENT, listener);
  window.addEventListener("storage", listener);

  return () => {
    window.removeEventListener(MOCK_REVIEWS_UPDATED_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

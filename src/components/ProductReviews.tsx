"use client";

import {
  CheckCircle2,
  Heart,
  MessageSquare,
  Plus,
  Send,
  ShieldCheck,
  Star,
  ThumbsUp,
  User,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  getProductReviews,
  likeProductReview,
  submitProductReview,
  subscribeReviews,
  type ProductReview,
} from "../services/review.service";
import PointBadge from "./PointBadge";

interface ProductReviewsProps {
  targetId: string;
  targetType: "MANGA" | "LIGHT_NOVEL" | "FIGURE" | "PLAMO" | "GOODS" | "ACCESSORY";
  targetTitle: string;
}

function formatRelativeDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return isoString;
  }
}

export default function ProductReviews({
  targetId,
  targetType,
  targetTitle,
}: ProductReviewsProps) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [mounted, setMounted] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [submitSuccessNotice, setSubmitSuccessNotice] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setReviews(getProductReviews(targetId));

    const unsubscribe = subscribeReviews(() => {
      setReviews(getProductReviews(targetId));
    });

    return () => {
      unsubscribe();
    };
  }, [targetId]);

  useEffect(() => {
    if (user?.fullName) {
      setAuthorName(user.fullName);
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    const res = submitProductReview({
      targetId,
      targetType,
      targetTitle,
      userName: authorName.trim() || user?.fullName || "ลูกค้าสมาชิก",
      rating,
      comment,
    });

    setComment("");
    setFormOpen(false);
    setSubmitSuccessNotice(
      `ขอบคุณสำหรับรีวิวของคุณ! คุณได้รับโบนัสพิเศษ +${res.pointsAwarded} แต้ม (P) เรียบร้อยแล้ว`,
    );

    setTimeout(() => {
      setSubmitSuccessNotice(null);
    }, 5000);
  };

  const handleLike = (reviewId: string) => {
    likeProductReview(reviewId);
  };

  const averageRating =
    reviews.length > 0
      ? (
          reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
        ).toFixed(1)
      : "5.0";

  const starCounts = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: reviews.filter((r) => r.rating === stars).length,
    percentage:
      reviews.length > 0
        ? Math.round(
            (reviews.filter((r) => r.rating === stars).length / reviews.length) *
              100,
          )
        : 0,
  }));

  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-100 dark:border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <MessageSquare size={20} className="text-blue-600 dark:text-blue-400" />
              <span>รีวิวและความคิดเห็นจากผู้ซื้อจริง</span>
            </h2>
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {reviews.length} รีวิว
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            แชร์ประสบการณ์ความประทับใจเพื่อรับแต้มสะสมพิเศษ +10 P เข้าบัญชี
          </p>
        </div>

        <button
          type="button"
          onClick={() => setFormOpen((prev) => !prev)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700 active:scale-95"
        >
          <Plus size={14} aria-hidden="true" />
          <span>เขียนรีวิวสินค้านี้ (+10 P)</span>
        </button>
      </div>

      {/* Review Submission Notice */}
      {submitSuccessNotice && (
        <div
          role="status"
          className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-300 bg-emerald-50/80 p-4 text-xs text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          <CheckCircle2 size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="font-semibold">{submitSuccessNotice}</span>
        </div>
      )}

      {/* Interactive Review Form */}
      {formOpen && (
        <form
          onSubmit={handleSubmit}
          className="mt-6 rounded-2xl border border-blue-200 bg-blue-50/40 p-5 dark:border-blue-900/60 dark:bg-blue-950/20"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <span>เขียนรีวิวสำหรับ: {targetTitle}</span>
            </h3>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              aria-label="ปิดฟอร์ม"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                ระดับความพึงพอใจ (คะแนนดาว)
              </label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((s) => {
                  const active = (hoverRating || rating) >= s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onMouseEnter={() => setHoverRating(s)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(s)}
                      aria-label={`ให้คะแนน ${s} ดาว`}
                      className="p-1 transition hover:scale-110 focus:outline-none"
                    >
                      <Star
                        size={22}
                        className={
                          active
                            ? "fill-amber-400 text-amber-400"
                            : "text-zinc-300 dark:text-zinc-700"
                        }
                      />
                    </button>
                  );
                })}
                <span className="ml-2 text-xs font-black text-amber-600 dark:text-amber-400">
                  {rating} / 5 ดาว
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                ชื่อหรือนามแฝงของคุณ
              </label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="เช่น Collector_No1 หรือ นามแฝง"
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-900 shadow-2xs focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
              ความคิดเห็นของคุณเกี่ยวกับสินค้าและการจัดส่ง
            </label>
            <textarea
              required
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="บอกเล่าความประทับใจเกี่ยวกับคุณภาพสินค้า การแพ็กห่อ หรือความคุ้มค่า..."
              className="w-full rounded-xl border border-zinc-200 bg-white p-3 text-xs font-medium text-zinc-900 shadow-2xs focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-700 dark:text-blue-300">
              <PointBadge size="xs" />
              <span>ส่งรีวิวแล้วรับทันที +10 แต้มสะสม (P)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700"
              >
                <Send size={13} aria-hidden="true" />
                <span>ส่งรีวิว</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Review Score & Star Breakdown */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6 rounded-2xl bg-zinc-50/70 p-5 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
        <div className="flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-700/60 pb-4 md:pb-0">
          <p className="text-4xl font-black text-zinc-900 dark:text-zinc-100">
            {averageRating}
          </p>
          <div className="mt-2 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={16}
                className="fill-amber-400 text-amber-400"
                aria-hidden="true"
              />
            ))}
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            จากทั้งหมด {reviews.length} เสียงยืนยัน
          </p>
        </div>

        <div className="md:col-span-2 space-y-1.5">
          {starCounts.map((row) => (
            <div key={row.stars} className="flex items-center gap-3 text-xs">
              <span className="w-12 font-bold text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
                <span>{row.stars}</span>
                <Star size={11} className="fill-amber-400 text-amber-400" />
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all duration-300"
                  style={{ width: `${row.percentage}%` }}
                />
              </div>
              <span className="w-10 text-right text-[11px] font-semibold text-zinc-500 tabular-nums dark:text-zinc-400">
                {row.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Reviews List */}
      <div className="mt-8 space-y-4">
        {reviews.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-500 dark:text-zinc-400">
            ยังไม่มีความคิดเห็นสำหรับสินค้านี้ เป็นคนแรกที่ร่วมแชร์รีวิวเพื่อรับ +10 P!
          </div>
        ) : (
          reviews.map((r) => (
            <article
              key={r.id}
              className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-2xs transition dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 font-bold text-xs dark:bg-zinc-800 dark:text-zinc-200">
                    {r.userName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {r.userName}
                      </span>
                      {r.isVerifiedPurchase && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                          <ShieldCheck size={10} aria-hidden="true" />
                          <span>ผู้ซื้อจริง</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                      {formatRelativeDate(r.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={13}
                      className={
                        s <= r.rating
                          ? "fill-amber-400 text-amber-400"
                          : "text-zinc-200 dark:text-zinc-700"
                      }
                      aria-hidden="true"
                    />
                  ))}
                </div>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
                {r.comment}
              </p>

              <div className="mt-4 flex items-center justify-between border-t border-zinc-50 pt-3 text-[11px] text-zinc-500 dark:border-zinc-800/80 dark:text-zinc-400">
                <span className="text-[10px]">ตรวจสอบแล้วโดยระบบ ChanSasom Store</span>
                <button
                  type="button"
                  onClick={() => handleLike(r.id)}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <ThumbsUp size={12} aria-hidden="true" />
                  <span>มีประโยชน์ ({r.likes})</span>
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

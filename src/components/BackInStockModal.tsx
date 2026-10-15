"use client";

import { BellRing, Check, Mail, Package, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export interface BackInStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  productTitle: string;
  productId: string | number;
  productCategory?: string;
  variantLabel?: string;
}

const BACK_IN_STOCK_KEY = "mock_back_in_stock_notifications";

export default function BackInStockModal({
  isOpen,
  onClose,
  productTitle,
  productId,
  productCategory,
  variantLabel,
}: BackInStockModalProps) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user?.email]);

  useEffect(() => {
    if (isOpen) {
      setIsSubmitted(false);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("กรุณากรอกอีเมลให้ถูกต้อง");
      return;
    }

    try {
      const existingRaw = localStorage.getItem(BACK_IN_STOCK_KEY);
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      const newEntry = {
        id: Date.now(),
        productId,
        productTitle,
        productCategory,
        variantLabel,
        email: cleanEmail,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem(
        BACK_IN_STOCK_KEY,
        JSON.stringify([...existing, newEntry]),
      );
      setIsSubmitted(true);
      setError(null);
    } catch {
      setError("ไม่สามารถบันทึกคำขอได้ กรุณาลองใหม่อีกครั้ง");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <button
          type="button"
          onClick={onClose}
          aria-label="ปิดหน้าต่าง"
          className="absolute right-4 top-4 rounded-lg p-1 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
        >
          <X size={18} aria-hidden="true" />
        </button>

        {isSubmitted ? (
          <div className="py-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <Check size={28} strokeWidth={2.5} aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-lg font-extrabold text-zinc-950 dark:text-zinc-50">
              บันทึกการแจ้งเตือนสำเร็จ
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
              ระบบจะส่งข้อความแจ้งเตือนไปยัง{" "}
              <strong className="text-zinc-900 dark:text-zinc-100">{email}</strong>{" "}
              ทันทีที่สินค้า <span className="text-orange-600 dark:text-orange-400">{productTitle}</span> มีในสต็อกอีกครั้ง
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 w-full rounded-xl bg-zinc-900 py-3 text-sm font-bold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              รับทราบ
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400">
                <BellRing size={20} aria-hidden="true" />
              </div>
              <div>
                <h3
                  id="modal-title"
                  className="text-base font-extrabold text-zinc-950 dark:text-zinc-50"
                >
                  แจ้งเตือนเมื่อสินค้าพร้อมจำหน่าย
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  ลงทะเบียนอีเมลเพื่อรับสิทธิ์สั่งซื้อก่อนใคร
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-zinc-100 bg-zinc-50 p-3.5 dark:border-zinc-800 dark:bg-zinc-950/50">
              <div className="flex items-start gap-2.5">
                <Package size={16} className="mt-0.5 shrink-0 text-zinc-400" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                    {productTitle}
                  </p>
                  {variantLabel ? (
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      ตัวเลือก: {variantLabel}
                    </p>
                  ) : null}
                  <span className="mt-1 inline-block rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-950/60 dark:text-red-300">
                    สินค้าหมดชั่วคราว
                  </span>
                </div>
              </div>
            </div>

            {error ? (
              <p
                role="alert"
                className="mt-3 rounded-lg bg-red-50 p-2.5 text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300"
              >
                {error}
              </p>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="back-in-stock-email"
                  className="block text-xs font-bold text-zinc-700 dark:text-zinc-300"
                >
                  อีเมลสำหรับรับการแจ้งเตือน
                </label>
                <div className="relative mt-1.5">
                  <Mail
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
                    aria-hidden="true"
                  />
                  <input
                    id="back-in-stock-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="min-h-11 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-4 text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:ring-orange-950"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-10 rounded-xl px-4 text-xs font-bold text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-orange-600 px-5 text-xs font-bold text-white shadow-xs transition hover:bg-orange-700"
                >
                  <BellRing size={14} aria-hidden="true" />
                  ยืนยันการแจ้งเตือน
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

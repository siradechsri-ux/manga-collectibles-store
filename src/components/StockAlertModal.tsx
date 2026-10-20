"use client";

import { Bell, CheckCircle2, Mail, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { subscribeStockAlert } from "../services/stock-alert.service";

interface StockAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string | number;
  productTitle: string;
  productType?: string;
}

export default function StockAlertModal({
  isOpen,
  onClose,
  productId,
  productTitle,
  productType = "COLLECTIBLE",
}: StockAlertModalProps) {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email || "");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const res = subscribeStockAlert(
      productId,
      productTitle,
      productType,
      email,
    );

    if (res.success) {
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 2500);
    } else {
      setError(res.message);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 animate-in fade-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          aria-label="ปิดหน้าต่าง"
        >
          <X size={18} />
        </button>

        {submitted ? (
          <div className="py-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400">
              <CheckCircle2 size={32} aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-base font-bold text-zinc-900 dark:text-zinc-100">
              ลงทะเบียนแจ้งเตือนสำเร็จ
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
              ระบบจะส่งข้อความแจ้งเตือนไปยัง <span className="font-bold text-zinc-900 dark:text-zinc-100">{email}</span> ทันทีที่มีการเติมสต็อกสินค้า
            </p>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/60 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-900/60">
                <Bell size={20} aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  แจ้งเตือนเมื่อสินค้าเติมสต็อก
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  รับสิทธิ์ทราบข่าวก่อนใครเมื่อสินค้าพร้อมสั่งซื้อ
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-zinc-50 p-3 text-xs dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800">
              <span className="font-semibold text-zinc-500 dark:text-zinc-400 text-[11px] block">
                สินค้าที่ต้องการรับการแจ้งเตือน:
              </span>
              <span className="font-bold text-zinc-900 dark:text-zinc-100 line-clamp-2 mt-0.5">
                {productTitle}
              </span>
            </div>

            {error && (
              <p className="mt-3 text-xs font-semibold text-red-600 dark:text-red-400">
                {error}
              </p>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  อีเมลสำหรับรับการแจ้งเตือน
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
                    <Mail size={15} />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-9 pr-3 text-xs font-medium text-zinc-900 shadow-2xs focus:border-amber-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-amber-700"
                >
                  <Bell size={13} aria-hidden="true" />
                  <span>บันทึกการแจ้งเตือน</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

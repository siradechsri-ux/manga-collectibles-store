"use client";

import {
  AlertCircle,
  ArrowRight,
  Award,
  Bookmark,
  Boxes,
  Check,
  CheckCircle2,
  Clock,
  Edit2,
  Flame,
  Gift,
  HelpCircle,
  Layers,
  Percent,
  Plus,
  Power,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  Sliders,
  Sparkles,
  Tag,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PointBadge from "../../../components/PointBadge";
import { useAuth } from "../../../contexts/AuthContext";
import {
  listRewards,
  resetRewardsCatalog,
  saveRewardItem,
  subscribeRewards,
  type RewardItem,
} from "../../../mocks/rewards.mock";
import {
  deleteFlashSaleDeal,
  getFlashSaleDeals,
  resetFlashSaleDeals,
  saveFlashSaleDeal,
  subscribeFlashSaleDeals,
  toggleFlashSaleDealStatus,
  type FlashSaleItem,
} from "../../../services/flash-sale.service";
import {
  getPromotionSettings,
  resetPromotionSettings,
  subscribePromotionSettings,
  updatePromotionSettings,
  type PromotionSettings,
} from "../../../services/promotion-settings.service";
import {
  deletePromoCode,
  listPromoCodes,
  MOCK_PROMO_CODES_UPDATED_EVENT,
  savePromoCode,
  togglePromoCodeStatus,
  type PromoCoupon,
} from "../../../utils/promo";

type ActiveTab = "PROMO_CODES" | "FLASH_SALE" | "THRESHOLDS" | "REWARDS";

export default function AdminPromotionsPage() {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>("PROMO_CODES");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Data states
  const [coupons, setCoupons] = useState<PromoCoupon[]>([]);
  const [flashDeals, setFlashDeals] = useState<FlashSaleItem[]>([]);
  const [settings, setSettings] = useState<PromotionSettings>(getPromotionSettings);
  const [rewards, setRewards] = useState<RewardItem[]>([]);

  // Promo code filter & search
  const [promoSearch, setPromoSearch] = useState("");
  const [promoFilter, setPromoFilter] = useState<"ALL" | "ACTIVE" | "EXPIRED">("ALL");
  const [isCreatePromoOpen, setIsCreatePromoOpen] = useState(false);
  const [newPromoCode, setNewPromoCode] = useState("");
  const [newPromoTitle, setNewPromoTitle] = useState("");
  const [newPromoDesc, setNewPromoDesc] = useState("");
  const [newPromoType, setNewPromoType] = useState<"PERCENTAGE" | "FIXED" | "FREE_SHIPPING">("PERCENTAGE");
  const [newPromoValue, setNewPromoValue] = useState<number>(10);
  const [newPromoMinSpend, setNewPromoMinSpend] = useState<number>(0);
  const [newPromoExpiresAt, setNewPromoExpiresAt] = useState<string>("");

  // Flash Sale edit state
  const [editingDeal, setEditingDeal] = useState<FlashSaleItem | null>(null);

  // Settings form states
  const [formSettings, setFormSettings] = useState<PromotionSettings>(settings);

  // Reward edit state
  const [editingReward, setEditingReward] = useState<RewardItem | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    setCoupons(listPromoCodes());
    setFlashDeals(getFlashSaleDeals());
    setSettings(getPromotionSettings());
    setFormSettings(getPromotionSettings());
    setRewards(listRewards());

    const refreshCoupons = () => setCoupons(listPromoCodes());
    window.addEventListener(MOCK_PROMO_CODES_UPDATED_EVENT, refreshCoupons);
    window.addEventListener("storage", refreshCoupons);

    const unsubFlash = subscribeFlashSaleDeals((deals) => setFlashDeals(deals));
    const unsubSettings = subscribePromotionSettings((newSettings) => {
      setSettings(newSettings);
      setFormSettings(newSettings);
    });
    const unsubRewards = subscribeRewards((newRewards) => setRewards(newRewards));

    return () => {
      window.removeEventListener(MOCK_PROMO_CODES_UPDATED_EVENT, refreshCoupons);
      window.removeEventListener("storage", refreshCoupons);
      unsubFlash();
      unsubSettings();
      unsubRewards();
    };
  }, []);

  // Promo actions
  const handleSavePromoCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromoCode.trim()) return;

    const expiresAt = newPromoExpiresAt
      ? new Date(newPromoExpiresAt).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    savePromoCode({
      code: newPromoCode.trim().toUpperCase(),
      title: newPromoTitle.trim() || `ส่วนลด ${newPromoCode.trim().toUpperCase()}`,
      description: newPromoDesc.trim(),
      type: newPromoType,
      value: Number(newPromoValue) || 0,
      minSpend: Number(newPromoMinSpend) || 0,
      expiresAt,
      isActive: true,
    });

    setCoupons(listPromoCodes());
    setIsCreatePromoOpen(false);
    setNewPromoCode("");
    setNewPromoTitle("");
    setNewPromoDesc("");
    setNewPromoValue(10);
    setNewPromoMinSpend(0);
    setNewPromoExpiresAt("");
    showToast(`บันทึกโค้ดส่วนลด "${newPromoCode.trim().toUpperCase()}" เรียบร้อยแล้ว`);
  };

  const handleTogglePromo = (code: string) => {
    togglePromoCodeStatus(code);
    setCoupons(listPromoCodes());
    showToast(`ปรับสถานะโค้ด "${code}" แล้ว`);
  };

  const handleDeletePromo = (code: string) => {
    if (confirm(`คุณต้องการลบโค้ด "${code}" ใช่หรือไม่?`)) {
      deletePromoCode(code);
      setCoupons(listPromoCodes());
      showToast(`ลบโค้ด "${code}" เรียบร้อยแล้ว`);
    }
  };

  const handleQuickAddPreset = (preset: "NEW_15" | "EXPIRED_TEST") => {
    if (preset === "NEW_15") {
      const code = `VIP${Math.floor(100 + Math.random() * 900)}`;
      const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      savePromoCode({
        code,
        title: "ส่วนลด VIP 15%",
        description: "ส่วนลดพิเศษ 15% สำหรับสมาชิกระดับ VIP",
        type: "PERCENTAGE",
        value: 15,
        minSpend: 500,
        expiresAt: in7Days,
        isActive: true,
      });
      setCoupons(listPromoCodes());
      showToast(`สร้างโค้ดส่วนลด "${code}" สำเร็จ`);
    } else {
      const code = `EXP${Math.floor(100 + Math.random() * 900)}`;
      const past = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      savePromoCode({
        code,
        title: "โค้ดหมดอายุ (สำหรับทดสอบ)",
        description: "โค้ดทดสอบสถานะหมดอายุการใช้งาน",
        type: "FIXED",
        value: 50,
        minSpend: 0,
        expiresAt: past,
        isActive: true,
      });
      setCoupons(listPromoCodes());
      showToast(`สร้างโค้ดหมดอายุ "${code}" สำเร็จ`);
    }
  };

  // Flash Sale actions
  const handleToggleFlashDeal = (id: number) => {
    toggleFlashSaleDealStatus(id);
    showToast("ปรับสถานะสินค้า Flash Sale แล้ว");
  };

  const handleSaveDealEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDeal) return;
    saveFlashSaleDeal(editingDeal);
    setEditingDeal(null);
    showToast(`อัปเดตราคา Flash Sale ของ "${editingDeal.title}" แล้ว`);
  };

  const handleResetFlashDeals = () => {
    if (confirm("คุณต้องการรีเซ็ตรายการ Flash Sale เป็นค่าเริ่มต้นใช่หรือไม่?")) {
      resetFlashSaleDeals();
      showToast("รีเซ็ตรายการ Flash Sale เป็นค่าเริ่มต้นแล้ว");
    }
  };

  // Thresholds settings actions
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updatePromotionSettings(formSettings);
    showToast("บันทึกเกณฑ์ส่งฟรี, ของแถม และส่วนลดยกเซ็ตสำเร็จ");
  };

  const handleResetSettings = () => {
    if (confirm("คุณต้องการรีเซ็ตเกณฑ์ส่วนลดทั้งหมดเป็นค่าเริ่มต้นใช่หรือไม่?")) {
      resetPromotionSettings();
      showToast("รีเซ็ตเกณฑ์ส่วนลดเป็นค่าเริ่มต้นแล้ว");
    }
  };

  // Rewards catalog actions
  const handleSaveRewardEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReward) return;
    saveRewardItem(editingReward);
    setEditingReward(null);
    showToast(`อัปเดตของรางวัล "${editingReward.title}" สำเร็จ`);
  };

  const handleResetRewards = () => {
    if (confirm("คุณต้องการรีเซ็ตคลังของรางวัลแต้มสะสมเป็นค่าเริ่มต้นใช่หรือไม่?")) {
      resetRewardsCatalog();
      showToast("รีเซ็ตของรางวัลแต้มสะสมเป็นค่าเริ่มต้นแล้ว");
    }
  };

  // Filtered coupons
  const filteredCoupons = useMemo(() => {
    return coupons.filter((c) => {
      const matchText =
        c.code.toLowerCase().includes(promoSearch.toLowerCase()) ||
        c.title.toLowerCase().includes(promoSearch.toLowerCase());
      if (!matchText) return false;

      const isExpired = new Date() > new Date(c.expiresAt);
      if (promoFilter === "ACTIVE") return c.isActive && !isExpired;
      if (promoFilter === "EXPIRED") return isExpired;
      return true;
    });
  }, [coupons, promoSearch, promoFilter]);

  if (isLoading) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-6xl items-center justify-center px-4">
        <p role="status" className="text-sm font-semibold text-zinc-500">
          กำลังตรวจสอบสิทธิ์...
        </p>
      </main>
    );
  }

  if (user?.role !== "ADMIN") {
    return (
      <main className="mx-auto flex min-h-[65vh] max-w-xl flex-col items-center justify-center px-5 text-center">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 dark:border-rose-900 dark:bg-rose-950/40">
          <ShieldAlert size={36} className="mx-auto text-rose-600 dark:text-rose-400" />
          <h1 className="mt-3 text-lg font-bold text-zinc-900 dark:text-zinc-100">
            เฉพาะผู้ดูแลระบบ (Admin) เท่านั้น
          </h1>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            คุณเข้าสู่ระบบด้วยบทบาท {user?.role || "ผู้เยี่ยมชม"} ซึ่งไม่ได้รับอนุญาตให้จัดการระบบโปรโมชั่น
          </p>
          <div className="mt-5">
            <Link
              href="/"
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-zinc-950 px-5 text-xs font-bold text-white shadow-xs dark:bg-zinc-100 dark:text-zinc-950"
            >
              กลับสู่หน้าหลัก
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50/70 pb-20 pt-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="mb-4 flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400"
        >
          <Link href="/admin" className="hover:text-orange-600 transition">
            ระบบจัดการหลังบ้าน
          </Link>
          <span>/</span>
          <span className="text-zinc-900 dark:text-zinc-100">จัดการโปรโมชั่นและส่วนลด</span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-black tracking-wide text-orange-800 dark:border-orange-900/60 dark:bg-orange-950/60 dark:text-orange-300">
              <Percent size={13} aria-hidden="true" />
              <span>PROMOTION & MARKETING CENTER</span>
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-zinc-950 dark:text-zinc-100 sm:text-3xl">
              จัดการโปรโมชั่นและส่วนลดร้านค้า
            </h1>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 sm:text-sm">
              ตั้งค่าโค้ดส่วนลด, แฟลชเซลล์ประจำวัน, เกณฑ์ส่งฟรี, ของแถม และคะแนนของรางวัลสะสมแต้ม
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              target="_blank"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-700 shadow-2xs transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <span>ดูผลลัพธ์ที่หน้าร้าน</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div
            role="status"
            className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-900 shadow-xs dark:border-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
              <span>{toastMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-emerald-700 hover:text-emerald-900 dark:text-emerald-300"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mt-6 flex flex-wrap gap-2 border-b border-zinc-200 pb-2 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setActiveTab("PROMO_CODES")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === "PROMO_CODES"
                ? "bg-zinc-950 text-white shadow-xs dark:bg-zinc-100 dark:text-zinc-950"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
            }`}
          >
            <Tag size={15} />
            <span>โค้ดส่วนลด (Coupons)</span>
            <span className="rounded-full bg-zinc-200/80 px-2 py-0.5 text-[10px] font-black text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
              {coupons.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("FLASH_SALE")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === "FLASH_SALE"
                ? "bg-zinc-950 text-white shadow-xs dark:bg-zinc-100 dark:text-zinc-950"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
            }`}
          >
            <Flame size={15} className="text-rose-500" />
            <span>แฟลชเซลล์ประจำวัน (Flash Deals)</span>
            <span className="rounded-full bg-zinc-200/80 px-2 py-0.5 text-[10px] font-black text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
              {flashDeals.filter((d) => d.isActive).length}/{flashDeals.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("THRESHOLDS")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === "THRESHOLDS"
                ? "bg-zinc-950 text-white shadow-xs dark:bg-zinc-100 dark:text-zinc-950"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
            }`}
          >
            <Sliders size={15} className="text-blue-500" />
            <span>เกณฑ์ส่งฟรี & ส่วนลดยกเซ็ต</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("REWARDS")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === "REWARDS"
                ? "bg-zinc-950 text-white shadow-xs dark:bg-zinc-100 dark:text-zinc-950"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
            }`}
          >
            <Gift size={15} className="text-purple-500" />
            <span>ของรางวัลสะสมแต้ม (Rewards)</span>
            <span className="rounded-full bg-zinc-200/80 px-2 py-0.5 text-[10px] font-black text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
              {rewards.length}
            </span>
          </button>
        </div>

        {/* TAB 1: PROMO CODES */}
        {activeTab === "PROMO_CODES" && (
          <section className="mt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Search & Filter */}
              <div className="flex flex-1 flex-wrap items-center gap-3">
                <div className="relative min-w-[220px] max-w-sm flex-1">
                  <Search
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
                  />
                  <input
                    type="text"
                    value={promoSearch}
                    onChange={(e) => setPromoSearch(e.target.value)}
                    placeholder="ค้นหาโค้ด หรือชื่อแคมเปญ..."
                    className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-3 text-xs font-semibold text-zinc-900 shadow-2xs focus:border-orange-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div className="flex items-center rounded-xl border border-zinc-200 bg-white p-1 text-xs font-bold dark:border-zinc-800 dark:bg-zinc-900">
                  <button
                    type="button"
                    onClick={() => setPromoFilter("ALL")}
                    className={`rounded-lg px-3 py-1.5 transition ${
                      promoFilter === "ALL"
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950"
                        : "text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    ทั้งหมด
                  </button>
                  <button
                    type="button"
                    onClick={() => setPromoFilter("ACTIVE")}
                    className={`rounded-lg px-3 py-1.5 transition ${
                      promoFilter === "ACTIVE"
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950"
                        : "text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    ใช้งานได้
                  </button>
                  <button
                    type="button"
                    onClick={() => setPromoFilter("EXPIRED")}
                    className={`rounded-lg px-3 py-1.5 transition ${
                      promoFilter === "EXPIRED"
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950"
                        : "text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    หมดอายุ
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickAddPreset("NEW_15")}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-800 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-300"
                >
                  <Sparkles size={14} />
                  <span>+ สุ่มโค้ด VIP 15%</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatePromoOpen(true)}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-orange-700"
                >
                  <Plus size={15} />
                  <span>สร้างโค้ดส่วนลดใหม่</span>
                </button>
              </div>
            </div>

            {/* Promo Codes Table */}
            <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-zinc-200 bg-zinc-100/90 font-black text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                    <tr>
                      <th className="px-4 py-3.5">โค้ดส่วนลด</th>
                      <th className="px-4 py-3.5">ชื่อแคมเปญ / คำอธิบาย</th>
                      <th className="px-4 py-3.5">ประเภท & มูลค่า</th>
                      <th className="px-4 py-3.5">ยอดสั่งซื้อขั้นต่ำ</th>
                      <th className="px-4 py-3.5">วันหมดอายุ</th>
                      <th className="px-4 py-3.5 text-center">สถานะ</th>
                      <th className="px-4 py-3.5 text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {filteredCoupons.map((coupon) => {
                      const isExpired = new Date() > new Date(coupon.expiresAt);
                      const expiryFormatted = new Date(coupon.expiresAt).toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      return (
                        <tr
                          key={coupon.code}
                          className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50"
                        >
                          <td className="whitespace-nowrap px-4 py-3.5">
                            <span className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-100 px-2 py-1 font-mono text-xs font-black text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
                              <Tag size={12} className="text-orange-600" />
                              {coupon.code}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="font-bold text-zinc-900 dark:text-zinc-100">
                              {coupon.title}
                            </p>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                              {coupon.description}
                            </p>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 font-bold">
                            {coupon.type === "FREE_SHIPPING" ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                <Truck size={14} />
                                <span>ฟรีค่าจัดส่ง</span>
                              </span>
                            ) : coupon.type === "PERCENTAGE" ? (
                              <span className="text-orange-600 dark:text-orange-400">
                                ลด {coupon.value}%
                              </span>
                            ) : (
                              <span className="text-blue-600 dark:text-blue-400">
                                ลด ฿{coupon.value.toLocaleString("th-TH")}
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-zinc-700 dark:text-zinc-300">
                            {coupon.minSpend && coupon.minSpend > 0 ? (
                              <span>฿{coupon.minSpend.toLocaleString("th-TH")}</span>
                            ) : (
                              <span className="text-zinc-400">ไม่มีขั้นต่ำ</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1 font-semibold ${
                                isExpired
                                  ? "text-rose-600 dark:text-rose-400"
                                  : "text-zinc-700 dark:text-zinc-300"
                              }`}
                            >
                              <Clock size={12} />
                              <span>{expiryFormatted}</span>
                              {isExpired && (
                                <span className="ml-1 rounded bg-rose-100 px-1.5 py-0.5 text-[9px] font-black text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                  หมดอายุ
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleTogglePromo(coupon.code)}
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black transition ${
                                coupon.isActive
                                  ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300"
                                  : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-400"
                              }`}
                            >
                              <Power size={11} />
                              <span>{coupon.isActive ? "เปิดใช้งาน" : "ปิดชั่วคราว"}</span>
                            </button>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeletePromo(coupon.code)}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-300"
                            >
                              <Trash2 size={13} />
                              <span>ลบ</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredCoupons.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="py-12 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400"
                        >
                          ไม่พบรายการโค้ดส่วนลดที่ตรงกับการค้นหา
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal: Create Promo Code */}
            {isCreatePromoOpen && (
              <div
                role="dialog"
                aria-modal="true"
                className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-xs"
              >
                <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                    <h2 className="text-base font-black text-zinc-950 dark:text-zinc-100">
                      สร้างโค้ดส่วนลดใหม่
                    </h2>
                    <button
                      type="button"
                      onClick={() => setIsCreatePromoOpen(false)}
                      className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleSavePromoCode} className="mt-4 space-y-3 text-xs">
                    <div>
                      <label className="block font-bold text-zinc-700 dark:text-zinc-300">
                        รหัสโค้ด (Code):
                      </label>
                      <input
                        type="text"
                        required
                        value={newPromoCode}
                        onChange={(e) => setNewPromoCode(e.target.value.toUpperCase())}
                        placeholder="เช่น SPECIAL20, SHIPFREE"
                        className="mt-1 w-full rounded-xl border border-zinc-300 bg-white p-2.5 font-mono text-xs font-bold uppercase focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-zinc-700 dark:text-zinc-300">
                        ชื่อแคมเปญ (Title):
                      </label>
                      <input
                        type="text"
                        required
                        value={newPromoTitle}
                        onChange={(e) => setNewPromoTitle(e.target.value)}
                        placeholder="เช่น ส่วนลดพิเศษ 20% ประจำเดือน"
                        className="mt-1 w-full rounded-xl border border-zinc-300 bg-white p-2.5 font-semibold focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-zinc-700 dark:text-zinc-300">
                        คำอธิบายเงื่อนไข:
                      </label>
                      <input
                        type="text"
                        value={newPromoDesc}
                        onChange={(e) => setNewPromoDesc(e.target.value)}
                        placeholder="เช่น ใช้ได้กับสินค้าทุกหมวดหมู่ ยกเว้นพรีออเดอร์"
                        className="mt-1 w-full rounded-xl border border-zinc-300 bg-white p-2.5 font-semibold focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-zinc-700 dark:text-zinc-300">
                          ประเภทส่วนลด:
                        </label>
                        <select
                          value={newPromoType}
                          onChange={(e) =>
                            setNewPromoType(
                              e.target.value as "PERCENTAGE" | "FIXED" | "FREE_SHIPPING",
                            )
                          }
                          className="mt-1 w-full rounded-xl border border-zinc-300 bg-white p-2.5 font-bold focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        >
                          <option value="PERCENTAGE">เปอร์เซ็นต์ (%)</option>
                          <option value="FIXED">จำนวนเงินคงที่ (฿)</option>
                          <option value="FREE_SHIPPING">ฟรีค่าจัดส่ง</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-zinc-700 dark:text-zinc-300">
                          มูลค่าส่วนลด:
                        </label>
                        <input
                          type="number"
                          min="1"
                          disabled={newPromoType === "FREE_SHIPPING"}
                          value={newPromoValue}
                          onChange={(e) => setNewPromoValue(Number(e.target.value))}
                          className="mt-1 w-full rounded-xl border border-zinc-300 bg-white p-2.5 font-bold focus:border-orange-500 focus:outline-none disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-zinc-700 dark:text-zinc-300">
                          ยอดซื้อขั้นต่ำ (บาท):
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={newPromoMinSpend}
                          onChange={(e) => setNewPromoMinSpend(Number(e.target.value))}
                          placeholder="0 สำหรับไม่มีขั้นต่ำ"
                          className="mt-1 w-full rounded-xl border border-zinc-300 bg-white p-2.5 font-bold focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-zinc-700 dark:text-zinc-300">
                          วันหมดอายุ:
                        </label>
                        <input
                          type="datetime-local"
                          value={newPromoExpiresAt}
                          onChange={(e) => setNewPromoExpiresAt(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-zinc-300 bg-white p-2.5 font-bold focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                      <button
                        type="button"
                        onClick={() => setIsCreatePromoOpen(false)}
                        className="rounded-xl border border-zinc-200 px-4 py-2 font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="submit"
                        className="rounded-xl bg-orange-600 px-5 py-2 font-black text-white hover:bg-orange-700"
                      >
                        บันทึกโค้ด
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </section>
        )}

        {/* TAB 2: FLASH SALE DEALS */}
        {activeTab === "FLASH_SALE" && (
          <section className="mt-6">
            {/* Global Flash Sale Toggle Card */}
            <div className="flex flex-col gap-4 rounded-2xl border border-rose-200 bg-rose-50/60 p-5 dark:border-rose-950/60 dark:bg-rose-950/20 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase text-rose-800 dark:text-rose-300">
                  <Flame size={14} className="text-rose-600" />
                  <span>การแสดงผลแบนเนอร์ Flash Sale หน้าร้าน</span>
                </div>
                <h3 className="mt-1 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  เปิด/ปิด แบนเนอร์ Flash Sale ประจำวันบนหน้าแรกของสโตร์
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  สถานะปัจจุบัน:{" "}
                  <span
                    className={`font-black ${
                      settings.isFlashSaleActive
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-zinc-500"
                    }`}
                  >
                    {settings.isFlashSaleActive ? "เปิดแสดงผลอยู่" : "ปิดการแสดงผลชั่วคราว"}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    updatePromotionSettings({ isFlashSaleActive: !settings.isFlashSaleActive });
                    showToast(
                      `ปรับสถานะแบนเนอร์ Flash Sale เป็น ${
                        !settings.isFlashSaleActive ? "เปิดใช้งาน" : "ปิดชั่วคราว"
                      }`,
                    );
                  }}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-4 py-2 text-xs font-black shadow-xs transition ${
                    settings.isFlashSaleActive
                      ? "bg-rose-600 text-white hover:bg-rose-700"
                      : "bg-zinc-800 text-white hover:bg-zinc-900 dark:bg-zinc-200 dark:text-zinc-900"
                  }`}
                >
                  <Power size={14} />
                  <span>
                    {settings.isFlashSaleActive ? "ปิดแบนเนอร์ Flash Sale" : "เปิดแบนเนอร์ Flash Sale"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleResetFlashDeals}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                >
                  <RefreshCw size={13} />
                  <span>รีเซ็ตค่าเดิม</span>
                </button>
              </div>
            </div>

            {/* Flash Deals Grid */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {flashDeals.map((deal) => (
                <div
                  key={deal.id}
                  className={`flex flex-col justify-between rounded-2xl border p-4 shadow-2xs transition ${
                    deal.isActive
                      ? "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                      : "border-zinc-200 bg-zinc-50/70 opacity-60 dark:border-zinc-800 dark:bg-zinc-900/40"
                  }`}
                >
                  <div>
                    <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
                      <img
                        src={deal.imageUrl}
                        alt={deal.title}
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute left-2.5 top-2.5 rounded-md bg-rose-600 px-2 py-0.5 text-[11px] font-black text-white">
                        -{deal.discountPercent}%
                      </span>
                      <span className="absolute bottom-2.5 left-2.5 rounded-md bg-zinc-950/80 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
                        {deal.categoryLabel}
                      </span>
                    </div>

                    <h4 className="mt-3 text-xs font-bold text-zinc-900 line-clamp-2 dark:text-zinc-100">
                      {deal.title}
                    </h4>

                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-base font-black text-rose-600 dark:text-rose-400">
                        ฿{deal.salePrice.toLocaleString("th-TH")}
                      </span>
                      <span className="text-xs font-semibold text-zinc-400 line-through">
                        ฿{deal.originalPrice.toLocaleString("th-TH")}
                      </span>
                    </div>

                    <div className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                      <p className="font-semibold">{deal.stockNote}</p>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-orange-500 to-rose-600"
                          style={{ width: `${deal.soldPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => handleToggleFlashDeal(deal.id)}
                      className={`flex-1 rounded-xl px-2.5 py-1.5 text-xs font-bold transition ${
                        deal.isActive
                          ? "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                          : "bg-rose-100 text-rose-800 hover:bg-rose-200 dark:bg-rose-950/70 dark:text-rose-300"
                      }`}
                    >
                      {deal.isActive ? "ระงับชั่วคราว" : "เปิดแสดงผล"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingDeal(deal)}
                      className="rounded-xl border border-zinc-200 p-2 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      title="แก้ไขราคาและโควต้า"
                    >
                      <Edit2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal: Edit Flash Sale Deal */}
            {editingDeal && (
              <div
                role="dialog"
                aria-modal="true"
                className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-xs"
              >
                <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                    <h3 className="text-sm font-black text-zinc-950 dark:text-zinc-100">
                      แก้ไขดีล Flash Sale
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingDeal(null)}
                      className="text-zinc-400 hover:text-zinc-600"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <form onSubmit={handleSaveDealEdit} className="mt-4 space-y-3 text-xs">
                    <p className="font-bold text-zinc-900 dark:text-zinc-100">{editingDeal.title}</p>
                    <p className="text-[11px] text-zinc-500">
                      ราคาปกติ: ฿{editingDeal.originalPrice.toLocaleString("th-TH")}
                    </p>

                    <div>
                      <label className="block font-bold text-zinc-700 dark:text-zinc-300">
                        เปอร์เซ็นต์ส่วนลด (%):
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="90"
                        value={editingDeal.discountPercent}
                        onChange={(e) => {
                          const percent = Number(e.target.value);
                          const newSalePrice = Math.round(
                            editingDeal.originalPrice * (1 - percent / 100),
                          );
                          setEditingDeal({
                            ...editingDeal,
                            discountPercent: percent,
                            salePrice: newSalePrice,
                          });
                        }}
                        className="mt-1 w-full rounded-xl border border-zinc-300 bg-white p-2.5 font-bold focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-zinc-700 dark:text-zinc-300">
                        ราคาลดพิเศษ Flash Sale (บาท):
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={editingDeal.salePrice}
                        onChange={(e) => {
                          const price = Number(e.target.value);
                          const discount = Math.round(
                            ((editingDeal.originalPrice - price) / editingDeal.originalPrice) * 100,
                          );
                          setEditingDeal({
                            ...editingDeal,
                            salePrice: price,
                            discountPercent: Math.max(0, discount),
                          });
                        }}
                        className="mt-1 w-full rounded-xl border border-zinc-300 bg-white p-2.5 font-bold focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-zinc-700 dark:text-zinc-300">
                        เปอร์เซ็นต์ที่ขายแล้ว (%):
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editingDeal.soldPercent}
                        onChange={(e) =>
                          setEditingDeal({
                            ...editingDeal,
                            soldPercent: Number(e.target.value),
                          })
                        }
                        className="mt-1 w-full rounded-xl border border-zinc-300 bg-white p-2.5 font-bold focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-zinc-700 dark:text-zinc-300">
                        ข้อความระบุสต็อก:
                      </label>
                      <input
                        type="text"
                        value={editingDeal.stockNote}
                        onChange={(e) =>
                          setEditingDeal({
                            ...editingDeal,
                            stockNote: e.target.value,
                          })
                        }
                        className="mt-1 w-full rounded-xl border border-zinc-300 bg-white p-2.5 font-semibold focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                    </div>

                    <div className="mt-6 flex justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                      <button
                        type="button"
                        onClick={() => setEditingDeal(null)}
                        className="rounded-xl border border-zinc-200 px-4 py-2 font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="submit"
                        className="rounded-xl bg-rose-600 px-5 py-2 font-black text-white hover:bg-rose-700"
                      >
                        บันทึกการเปลี่ยนแปลง
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </section>
        )}

        {/* TAB 3: THRESHOLDS & VOLUME TIERS */}
        {activeTab === "THRESHOLDS" && (
          <section className="mt-6 max-w-4xl">
            <form onSubmit={handleSaveSettings} className="space-y-6">
              {/* Free Shipping & Gift Threshold Card */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
                  <Truck size={18} className="text-blue-600" />
                  <h3 className="text-sm font-black text-zinc-950 dark:text-zinc-100">
                    เกณฑ์ยอดจัดส่งฟรี และของแถมสมนาคุณ (Thresholds)
                  </h3>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      ยอดสั่งซื้อขั้นต่ำเพื่อรับส่งฟรี (บาท):
                    </label>
                    <div className="relative mt-1">
                      <input
                        type="number"
                        min="0"
                        value={formSettings.freeShippingThreshold}
                        onChange={(e) =>
                          setFormSettings({
                            ...formSettings,
                            freeShippingThreshold: Number(e.target.value),
                          })
                        }
                        className="w-full rounded-xl border border-zinc-300 bg-white p-2.5 font-bold focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                        THB
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      เมื่อยอดรวมสินค้าในตะกร้าถึงจำนวนนี้ ระบบจะปรับค่าจัดส่งเป็น ฿0 อัตโนมัติ
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      ยอดสั่งซื้อเพื่อรับของแถมสมนาคุณ (บาท):
                    </label>
                    <div className="relative mt-1">
                      <input
                        type="number"
                        min="0"
                        value={formSettings.bonusGiftThreshold}
                        onChange={(e) =>
                          setFormSettings({
                            ...formSettings,
                            bonusGiftThreshold: Number(e.target.value),
                          })
                        }
                        className="w-full rounded-xl border border-zinc-300 bg-white p-2.5 font-bold focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                        THB
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      แสดงแถบความคืบหน้า (Progress Bar) ปลดล็อกของแถมใน Cart Drawer
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    ชื่อของแถมพิเศษเมื่อช้อปครบเกณฑ์:
                  </label>
                  <input
                    type="text"
                    value={formSettings.bonusGiftTitle}
                    onChange={(e) =>
                      setFormSettings({
                        ...formSettings,
                        bonusGiftTitle: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-zinc-300 bg-white p-2.5 text-xs font-semibold focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>
              </div>

              {/* Volume Discount Tiers Card */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
                  <Layers size={18} className="text-orange-600" />
                  <h3 className="text-sm font-black text-zinc-950 dark:text-zinc-100">
                    ส่วนลดซื้อยกเซ็ตตามจำนวนเล่ม (Tiered Volume Discounts)
                  </h3>
                </div>
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  ส่วนลดแบบขั้นบันไดเมื่อลูกค้าเลือกซื้อหนังสือมังงะ/ไลท์โนเวลหลายเล่มในเรื่องเดียวกัน
                </p>

                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  {/* Tier 1 */}
                  <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
                    <span className="rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-black uppercase text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                      ระดับที่ 1 (เริ่มต้น)
                    </span>
                    <div className="mt-3">
                      <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400">
                        ขั้นต่ำ (เล่ม):
                      </label>
                      <input
                        type="number"
                        min="2"
                        value={formSettings.tier1MinVolumes}
                        onChange={(e) =>
                          setFormSettings({
                            ...formSettings,
                            tier1MinVolumes: Number(e.target.value),
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs font-bold dark:border-zinc-700 dark:bg-zinc-800"
                      />
                    </div>
                    <div className="mt-3">
                      <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400">
                        ส่วนลด (%):
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={formSettings.tier1DiscountPercent}
                        onChange={(e) =>
                          setFormSettings({
                            ...formSettings,
                            tier1DiscountPercent: Number(e.target.value),
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs font-bold text-orange-600 dark:border-zinc-700 dark:bg-zinc-800"
                      />
                    </div>
                  </div>

                  {/* Tier 2 */}
                  <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
                    <span className="rounded bg-orange-100 px-2 py-0.5 text-[10px] font-black uppercase text-orange-800 dark:bg-orange-950 dark:text-orange-300">
                      ระดับที่ 2 (ยอดนิยม)
                    </span>
                    <div className="mt-3">
                      <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400">
                        ขั้นต่ำ (เล่ม):
                      </label>
                      <input
                        type="number"
                        min="4"
                        value={formSettings.tier2MinVolumes}
                        onChange={(e) =>
                          setFormSettings({
                            ...formSettings,
                            tier2MinVolumes: Number(e.target.value),
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs font-bold dark:border-zinc-700 dark:bg-zinc-800"
                      />
                    </div>
                    <div className="mt-3">
                      <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400">
                        ส่วนลด (%):
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={formSettings.tier2DiscountPercent}
                        onChange={(e) =>
                          setFormSettings({
                            ...formSettings,
                            tier2DiscountPercent: Number(e.target.value),
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs font-bold text-orange-600 dark:border-zinc-700 dark:bg-zinc-800"
                      />
                    </div>
                  </div>

                  {/* Tier 3 */}
                  <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
                    <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-black uppercase text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                      ระดับที่ 3 (ยกเซ็ตใหญ่)
                    </span>
                    <div className="mt-3">
                      <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400">
                        ขั้นต่ำ (เล่ม):
                      </label>
                      <input
                        type="number"
                        min="6"
                        value={formSettings.tier3MinVolumes}
                        onChange={(e) =>
                          setFormSettings({
                            ...formSettings,
                            tier3MinVolumes: Number(e.target.value),
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs font-bold dark:border-zinc-700 dark:bg-zinc-800"
                      />
                    </div>
                    <div className="mt-3">
                      <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400">
                        ส่วนลด (%):
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={formSettings.tier3DiscountPercent}
                        onChange={(e) =>
                          setFormSettings({
                            ...formSettings,
                            tier3DiscountPercent: Number(e.target.value),
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs font-bold text-rose-600 dark:border-zinc-700 dark:bg-zinc-800"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleResetSettings}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                >
                  <RefreshCw size={14} />
                  <span>คืนค่าเริ่มต้นทั้งหมด</span>
                </button>

                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-6 py-2 text-xs font-black text-white shadow-xs transition hover:bg-blue-700"
                >
                  <Save size={15} />
                  <span>บันทึกการตั้งค่าเกณฑ์ส่วนลด</span>
                </button>
              </div>
            </form>
          </section>
        )}

        {/* TAB 4: REWARDS MANAGEMENT */}
        {activeTab === "REWARDS" && (
          <section className="mt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-black text-zinc-950 dark:text-zinc-100">
                  รายการของรางวัลสะสมแต้ม (Reward Items Catalog)
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  ปรับจำนวนแต้มที่ใช้แลก (P) และจำนวนสต็อกคงเหลือสำหรับแลกของรางวัล
                </p>
              </div>

              <button
                type="button"
                onClick={handleResetRewards}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
              >
                <RefreshCw size={13} />
                <span>รีเซ็ตของรางวัลเป็นค่าเริ่มต้น</span>
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rewards.map((reward) => (
                <div
                  key={reward.id}
                  className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                        <img
                          src={reward.imageUrl}
                          alt={reward.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          {reward.category}
                        </span>
                        <h4 className="mt-1 line-clamp-1 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                          {reward.title}
                        </h4>
                        <div className="mt-1 flex items-center gap-1.5">
                          <PointBadge size="xs" />
                          <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                            {reward.pointsRequired} P
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="mt-3 line-clamp-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                      {reward.description}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
                    <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                      คงเหลือ: <span className="font-black text-zinc-900 dark:text-zinc-100">{reward.stock}</span> ชิ้น
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingReward(reward)}
                      className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      <Edit2 size={12} />
                      <span>แก้ไขแต้ม/สต็อก</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal: Edit Reward Item */}
            {editingReward && (
              <div
                role="dialog"
                aria-modal="true"
                className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-xs"
              >
                <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                    <h3 className="text-sm font-black text-zinc-950 dark:text-zinc-100">
                      แก้ไขของรางวัลสะสมแต้ม
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingReward(null)}
                      className="text-zinc-400 hover:text-zinc-600"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <form onSubmit={handleSaveRewardEdit} className="mt-4 space-y-3 text-xs">
                    <div>
                      <label className="block font-bold text-zinc-700 dark:text-zinc-300">
                        ชื่อของรางวัล:
                      </label>
                      <input
                        type="text"
                        required
                        value={editingReward.title}
                        onChange={(e) =>
                          setEditingReward({ ...editingReward, title: e.target.value })
                        }
                        className="mt-1 w-full rounded-xl border border-zinc-300 bg-white p-2.5 font-bold focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-zinc-700 dark:text-zinc-300">
                        แต้มสะสมที่ต้องใช้ (P):
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={editingReward.pointsRequired}
                        onChange={(e) =>
                          setEditingReward({
                            ...editingReward,
                            pointsRequired: Number(e.target.value),
                          })
                        }
                        className="mt-1 w-full rounded-xl border border-zinc-300 bg-white p-2.5 font-black text-blue-600 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-zinc-700 dark:text-zinc-300">
                        จำนวนสต็อกคงเหลือ (ชิ้น):
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={editingReward.stock}
                        onChange={(e) =>
                          setEditingReward({
                            ...editingReward,
                            stock: Number(e.target.value),
                          })
                        }
                        className="mt-1 w-full rounded-xl border border-zinc-300 bg-white p-2.5 font-bold focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                    </div>

                    <div className="mt-6 flex justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                      <button
                        type="button"
                        onClick={() => setEditingReward(null)}
                        className="rounded-xl border border-zinc-200 px-4 py-2 font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="submit"
                        className="rounded-xl bg-blue-600 px-5 py-2 font-black text-white hover:bg-blue-700"
                      >
                        บันทึกของรางวัล
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

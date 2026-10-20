"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Award,
  Check,
  Edit3,
  Layers,
  Power,
  RefreshCw,
  Save,
  Sparkles,
  Ticket,
  Trophy,
  X,
} from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import {
  getKujiConfig,
  getKujiHistory,
  getKujiPrizes,
  getRemainingKujiTickets,
  resetKujiBox,
  resetKujiPrizes,
  subscribeKuji,
  updateKujiConfig,
  updateKujiPrize,
  type KujiConfig,
  type KujiDrawResult,
  type KujiGrade,
  type KujiPrize,
} from "../../../services/kuji.service";
import PointBadge from "../../../components/PointBadge";

function gradeBadgeColor(grade: string): string {
  switch (grade) {
    case "A":
      return "bg-amber-500 text-white shadow-xs";
    case "B":
      return "bg-rose-500 text-white shadow-xs";
    case "C":
      return "bg-purple-600 text-white shadow-xs";
    case "D":
      return "bg-blue-600 text-white shadow-xs";
    default:
      return "bg-emerald-600 text-white shadow-xs";
  }
}

export default function AdminKujiPage() {
  const { user, isLoading } = useAuth();
  const [config, setConfig] = useState<KujiConfig>(() => getKujiConfig());
  const [prizes, setPrizes] = useState<KujiPrize[]>(() => getKujiPrizes());
  const [remainingTickets, setRemainingTickets] = useState<number>(() =>
    getRemainingKujiTickets(),
  );
  const [history, setHistory] = useState<KujiDrawResult[]>(() => getKujiHistory());
  const [notice, setNotice] = useState<string | null>(null);

  // Form states for box settings
  const [titleInput, setTitleInput] = useState(config.title);
  const [pointsCostInput, setPointsCostInput] = useState(config.pointsPerDraw);
  const [isActiveInput, setIsActiveInput] = useState(config.isActive);

  // Prize editing modal state
  const [editingPrize, setEditingPrize] = useState<KujiPrize | null>(null);
  const [prizeForm, setPrizeForm] = useState<{
    title: string;
    description: string;
    valueBaht: number;
    weight: number;
    imageUrl: string;
    stockCount: number;
  }>({
    title: "",
    description: "",
    valueBaht: 0,
    weight: 10,
    imageUrl: "",
    stockCount: 1,
  });

  useEffect(() => {
    return subscribeKuji(() => {
      const cfg = getKujiConfig();
      setConfig(cfg);
      setTitleInput(cfg.title);
      setPointsCostInput(cfg.pointsPerDraw);
      setIsActiveInput(cfg.isActive);
      setPrizes(getKujiPrizes());
      setRemainingTickets(getRemainingKujiTickets());
      setHistory(getKujiHistory());
    });
  }, []);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleInput.trim()) {
      alert("กรุณากรอกชื่อตู้ Kuji");
      return;
    }
    if (pointsCostInput <= 0) {
      alert("แต้มต่อการจับต้องมากกว่า 0");
      return;
    }

    const updated = updateKujiConfig({
      title: titleInput.trim(),
      pointsPerDraw: pointsCostInput,
      isActive: isActiveInput,
    });
    setConfig(updated);
    setNotice("บันทึกการตั้งค่าตู้ Kuji เรียบร้อยแล้ว");
    setTimeout(() => setNotice(null), 3000);
  };

  const handleResetBox = () => {
    if (
      confirm(
        `คุณต้องการเปิดตู้ใหม่ (รีเซ็ตตั๋วเต็ม ${config.totalTicketsBox} ใบ) หรือไม่?`,
      )
    ) {
      resetKujiBox();
      setNotice(`เปิดตู้ใหม่สำเร็จ ตั๋วพร้อมสุ่ม ${config.totalTicketsBox} ใบ`);
      setTimeout(() => setNotice(null), 3000);
    }
  };

  const handleOpenEditPrize = (prize: KujiPrize) => {
    setEditingPrize(prize);
    setPrizeForm({
      title: prize.title,
      description: prize.description,
      valueBaht: prize.valueBaht,
      weight: prize.weight,
      imageUrl: prize.imageUrl,
      stockCount: prize.stockCount,
    });
  };

  const handleSavePrize = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPrize) return;

    updateKujiPrize(editingPrize.grade, prizeForm);
    setNotice(`อัปเดตรายละเอียดรางวัล Grade ${editingPrize.grade} สำเร็จ`);
    setEditingPrize(null);
    setTimeout(() => setNotice(null), 3000);
  };

  const handleResetPrizes = () => {
    if (confirm("ต้องการรีเซ็ตของรางวัลทั้งหมดกลับเป็นค่ามาตรฐานเริ่มต้นหรือไม่?")) {
      resetKujiPrizes();
      setNotice("รีเซ็ตของรางวัลกลับเป็นค่าเริ่มต้นแล้ว");
      setTimeout(() => setNotice(null), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-zinc-500">กำลังตรวจสอบสิทธิ์...</p>
      </div>
    );
  }

  if (user?.role !== "ADMIN") {
    return (
      <div className="mx-auto max-w-xl py-16 px-4 text-center">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          ต้องใช้สิทธิ์ผู้ดูแลระบบ (ADMIN)
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          คุณไม่มีสิทธิ์เข้าถึงหน้านี้ กรุณาสลับบทบาทเป็น ADMIN ผ่านเมนูด้านบน
        </p>
        <Link
          href="/"
          className="mt-4 inline-block font-semibold text-orange-600 hover:underline"
        >
          กลับสู่หน้าร้าน
        </Link>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb & Navigation */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-orange-600 transition"
          >
            <ArrowLeft size={14} />
            กลับสู่แดชบอร์ดแอดมิน
          </Link>
          <h1 className="mt-2 text-2xl font-black text-zinc-950 dark:text-zinc-50 sm:text-3xl flex items-center gap-2.5">
            <Sparkles className="text-amber-500" />
            จัดการตู้จับฉลาก Kuji (Lucky Draw Manager)
          </h1>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            ควบคุมระบบสุ่มรางวัลอิชิบังกุจิ ตั้งค่าราคาแต้ม รีเซ็ตตู้ และปรับแต่งของรางวัล Grade A-E
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/kuji"
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 transition"
          >
            เปิดดูหน้าสุ่มจริง
          </Link>
          <button
            type="button"
            onClick={handleResetBox}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-black text-zinc-950 shadow-sm hover:bg-amber-400 transition"
          >
            <RefreshCw size={14} />
            เปิดตู้ใหม่ (รีเซ็ต 50 ตั๋ว)
          </button>
        </div>
      </div>

      {notice ? (
        <div
          role="status"
          className="mb-6 flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300"
        >
          <Check size={16} />
          <span>{notice}</span>
        </div>
      ) : null}

      {/* Metric Cards Row */}
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">ตั๋วคงเหลือในตู้</p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-amber-500 tabular-nums">
              {remainingTickets}
            </span>
            <span className="text-xs font-bold text-zinc-400">
              / {config.totalTicketsBox} ตั๋ว
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">แต้มต่อ 1 ตั๋ว</p>
          <div className="mt-1 flex items-center gap-1.5">
            <PointBadge size="sm" />
            <span className="text-2xl font-black text-zinc-900 dark:text-zinc-100">
              {config.pointsPerDraw} P
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">สถานะเปิดให้บริการ</p>
          <span
            className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
              config.isActive
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                : "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
            }`}
          >
            <Power size={12} />
            {config.isActive ? "เปิดสุ่มปกติ" : "ปิดตู้ชั่วคราว"}
          </span>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">ประวัติสุ่มสะสม</p>
          <p className="mt-1 text-2xl font-black text-zinc-900 dark:text-zinc-100">
            {history.length} ครั้ง
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Box Configuration Panel */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-1 shadow-xs">
          <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
            <Ticket size={16} className="text-amber-500" />
            <span>ตั้งค่าตู้จับฉลาก</span>
          </h2>

          <form onSubmit={handleSaveConfig} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                ชื่อตู้ Kuji (Box Title)
              </label>
              <input
                type="text"
                required
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                className="mt-1 h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs font-semibold text-zinc-900 focus:border-amber-500 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                แต้มสะสมที่ใช้ต่อการสุ่ม 1 ครั้ง (Points)
              </label>
              <input
                type="number"
                min={1}
                max={1000}
                required
                value={pointsCostInput}
                onChange={(e) => setPointsCostInput(Number(e.target.value))}
                className="mt-1 h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs font-semibold text-zinc-900 focus:border-amber-500 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
              <p className="mt-1 text-[11px] text-zinc-400">ค่ามาตรฐานแนะนำ: 50 P</p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isActiveInput}
                  onChange={(e) => setIsActiveInput(e.target.checked)}
                  className="h-4 w-4 accent-amber-500"
                />
                <span>เปิดให้ลูกค้ากดสุ่มรางวัลในหน้าร้าน</span>
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900 py-2.5 text-xs font-bold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white transition"
              >
                <Save size={14} />
                บันทึกการตั้งค่าตู้
              </button>
            </div>
          </form>
        </div>

        {/* Prize Lineup Manager */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-2 shadow-xs">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
            <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Trophy size={16} className="text-amber-500" />
              <span>รายการของรางวัลในตู้ (Grade A - E)</span>
            </h2>
            <button
              type="button"
              onClick={handleResetPrizes}
              className="text-xs font-semibold text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition"
            >
              รีเซ็ตรางวัลเริ่มต้น
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {prizes.map((prize) => (
              <div
                key={prize.grade}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-zinc-100 bg-zinc-50/50 p-3 dark:border-zinc-800/80 dark:bg-zinc-800/30 hover:border-zinc-300 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-black text-sm ${gradeBadgeColor(
                      prize.grade,
                    )}`}
                  >
                    {prize.grade}
                  </span>
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
                    <img
                      src={prize.imageUrl}
                      alt={prize.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      {prize.title}
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      มูลค่า ฿{prize.valueBaht.toLocaleString("th-TH")} · สต็อก {prize.stockCount} ชิ้น · น้ำหนักสุ่ม: {prize.weight}%
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenEditPrize(prize)}
                    className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-bold text-zinc-700 hover:border-amber-400 hover:text-amber-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 transition"
                  >
                    <Edit3 size={13} />
                    แก้ไข
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Customer Draws History Table */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 shadow-xs">
        <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
          <Layers size={16} className="text-blue-500" />
          <span>บันทึกประวัติการสุ่มของลูกค้า (Customer Draw Logs)</span>
        </h2>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
              <tr>
                <th className="p-3 font-bold">ตั๋วที่</th>
                <th className="p-3 font-bold">เกรด</th>
                <th className="p-3 font-bold">ของรางวัลที่ได้รับ</th>
                <th className="p-3 font-bold">แต้มที่ใช้</th>
                <th className="p-3 font-bold">รหัสอ้างอิง / คูปอง</th>
                <th className="p-3 font-bold text-right">วันเวลาที่สุ่ม</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-400">
                    ยังไม่มีประวัติการสุ่มรางวัลในเซ็ตนี้
                  </td>
                </tr>
              ) : (
                history.map((record) => (
                  <tr key={record.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
                    <td className="p-3 font-black text-zinc-900 dark:text-zinc-100">
                      #{record.ticketNumber}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-md font-black text-xs ${gradeBadgeColor(
                          record.prize.grade,
                        )}`}
                      >
                        {record.prize.grade}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-zinc-800 dark:text-zinc-200">
                      {record.prize.title}
                    </td>
                    <td className="p-3 font-black text-blue-600 dark:text-blue-400">
                      -{record.pointsSpent} P
                    </td>
                    <td className="p-3 font-mono text-zinc-500">
                      {record.prize.discountCode || record.id}
                    </td>
                    <td className="p-3 text-right text-zinc-400">
                      {new Date(record.drawnAt).toLocaleString("th-TH")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Prize Modal */}
      {editingPrize ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-lg font-black text-xs ${gradeBadgeColor(
                    editingPrize.grade,
                  )}`}
                >
                  {editingPrize.grade}
                </span>
                <h2 className="text-base font-black text-zinc-900 dark:text-zinc-100">
                  แก้ไขรางวัล Grade {editingPrize.grade}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingPrize(null)}
                className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePrize} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  ชื่อของรางวัล
                </label>
                <input
                  type="text"
                  required
                  value={prizeForm.title}
                  onChange={(e) =>
                    setPrizeForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="mt-1 h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs font-semibold text-zinc-900 focus:border-amber-500 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  คำอธิบายของรางวัล
                </label>
                <textarea
                  rows={2}
                  value={prizeForm.description}
                  onChange={(e) =>
                    setPrizeForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-xs font-medium text-zinc-900 focus:border-amber-500 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    มูลค่า (บาท)
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={prizeForm.valueBaht}
                    onChange={(e) =>
                      setPrizeForm((prev) => ({
                        ...prev,
                        valueBaht: Number(e.target.value),
                      }))
                    }
                    className="mt-1 h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs font-semibold text-zinc-900 focus:border-amber-500 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    น้ำหนักสุ่ม (%)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={prizeForm.weight}
                    onChange={(e) =>
                      setPrizeForm((prev) => ({
                        ...prev,
                        weight: Number(e.target.value),
                      }))
                    }
                    className="mt-1 h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs font-semibold text-zinc-900 focus:border-amber-500 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    สต็อกในตู้ (ชิ้น)
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={prizeForm.stockCount}
                    onChange={(e) =>
                      setPrizeForm((prev) => ({
                        ...prev,
                        stockCount: Number(e.target.value),
                      }))
                    }
                    className="mt-1 h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs font-semibold text-zinc-900 focus:border-amber-500 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  พาธรูปภาพของรางวัล (Image URL)
                </label>
                <input
                  type="text"
                  required
                  value={prizeForm.imageUrl}
                  onChange={(e) =>
                    setPrizeForm((prev) => ({ ...prev, imageUrl: e.target.value }))
                  }
                  className="mt-1 h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs font-semibold text-zinc-900 focus:border-amber-500 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingPrize(null)}
                  className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-500 px-5 py-2 text-xs font-black text-zinc-950 hover:bg-amber-400 shadow-sm transition"
                >
                  บันทึกรางวัล
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}

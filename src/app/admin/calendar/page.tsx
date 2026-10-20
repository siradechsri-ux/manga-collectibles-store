"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Edit2,
  Filter,
  Image as ImageIcon,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import {
  CalendarReleaseItem,
  ReleaseCategory,
} from "../../../mocks/release-calendar.mock";
import {
  addCalendarRelease,
  deleteCalendarRelease,
  getCalendarReleases,
  resetCalendarReleases,
  subscribeCalendarReleases,
  updateCalendarRelease,
} from "../../../services/calendar.service";

const moneyFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 0,
});

const POPULAR_COVER_PRESETS = [
  { label: "Jujutsu Kaisen เล่ม 27", url: "/images/products/jjk-vol-27.jpg" },
  { label: "Frieren เล่ม 13", url: "/images/products/frieren-vol-13.jpg" },
  { label: "Chainsaw Man เล่ม 18", url: "/images/products/chainsaw-vol-18.jpg" },
  { label: "Solo Leveling เล่ม 1", url: "/images/products/sololeveling-vol-01.jpg" },
  { label: "Pop Up Sukuna", url: "/images/products/figure-2002.jpg" },
  { label: "Pop Up Eren", url: "/images/products/figure-2001.jpg" },
  { label: "Anya Standee", url: "/images/rewards/reward-anya-standee.jpg" },
  { label: "Blue Lock เล่ม 31", url: "/images/products/bluelock-vol-31.jpg" },
];

export default function AdminCalendarPage() {
  const { user, isLoading } = useAuth();
  const [items, setItems] = useState<CalendarReleaseItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [notice, setNotice] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setFormData((prev) => ({ ...prev, imageUrl: base64 }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CalendarReleaseItem | null>(null);
  const [formData, setFormData] = useState<{
    title: string;
    category: ReleaseCategory;
    publisherOrBrand: string;
    releaseDate: string;
    dayLabel: string;
    price: number;
    imageUrl: string;
    status: "IN_STOCK" | "PREORDER_OPEN";
    productUrl: string;
    preorderDiscountPercent?: number;
  }>({
    title: "",
    category: "MANGA",
    publisherOrBrand: "Siam Inter Comics",
    releaseDate: "2026-10-25",
    dayLabel: "25 ต.ค. 2026",
    price: 95,
    imageUrl: "/images/products/jjk-v1.jpg",
    status: "IN_STOCK",
    productUrl: "/manga/manga-1",
    preorderDiscountPercent: 0,
  });

  useEffect(() => {
    setItems(getCalendarReleases());
    return subscribeCalendarReleases((updated) => setItems(updated));
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filterCategory !== "ALL" && item.category !== filterCategory) return false;
      if (filterStatus !== "ALL" && item.status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchPublisher = item.publisherOrBrand.toLowerCase().includes(q);
        if (!matchTitle && !matchPublisher) return false;
      }
      return true;
    });
  }, [items, filterCategory, filterStatus, searchQuery]);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData({
      title: "",
      category: "MANGA",
      publisherOrBrand: "Siam Inter Comics",
      releaseDate: "2026-10-25",
      dayLabel: "25 ต.ค. 2026",
      price: 95,
      imageUrl: "/images/products/jjk-v1.jpg",
      status: "IN_STOCK",
      productUrl: "/manga/manga-1",
      preorderDiscountPercent: 0,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: CalendarReleaseItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      category: item.category,
      publisherOrBrand: item.publisherOrBrand,
      releaseDate: item.releaseDate,
      dayLabel: item.dayLabel,
      price: item.price,
      imageUrl: item.imageUrl,
      status: item.status,
      productUrl: item.productUrl,
      preorderDiscountPercent: item.preorderDiscountPercent || 0,
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert("กรุณากรอกชื่อสินค้า");
      return;
    }

    if (editingItem) {
      updateCalendarRelease(editingItem.id, formData);
      setNotice(`อัปเดตข้อมูล “${formData.title}” สำเร็จ`);
    } else {
      addCalendarRelease(formData);
      setNotice(`เพิ่ม “${formData.title}” ลงในตารางวางจำหน่ายสำเร็จ`);
    }

    setIsModalOpen(false);
    setTimeout(() => setNotice(null), 3000);
  };

  const handleDelete = (id: string, title: string) => {
    if (confirm(`คุณต้องการลบรายการ “${title}” ออกจากตารางวางจำหน่ายหรือไม่?`)) {
      deleteCalendarRelease(id);
      setNotice(`ลบรายการ “${title}” สำเร็จ`);
      setTimeout(() => setNotice(null), 3000);
    }
  };

  const handleToggleStatus = (item: CalendarReleaseItem) => {
    const nextStatus = item.status === "IN_STOCK" ? "PREORDER_OPEN" : "IN_STOCK";
    updateCalendarRelease(item.id, { status: nextStatus });
    setNotice(
      `ปรับสถานะ “${item.title}” เป็น ${nextStatus === "IN_STOCK" ? "พร้อมส่ง" : "Pre-order"} แล้ว`,
    );
    setTimeout(() => setNotice(null), 3000);
  };

  const handleReset = () => {
    if (confirm("คุณต้องการรีเซ็ตตารางวางจำหน่ายกลับเป็นค่าเริ่มต้นหรือไม่?")) {
      resetCalendarReleases();
      setNotice("รีเซ็ตตารางวางจำหน่ายกลับเป็นค่าเริ่มต้นเรียบร้อยแล้ว");
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
            <CalendarDays className="text-orange-600 dark:text-orange-400" />
            จัดการตารางวางจำหน่าย (Release Calendar)
          </h1>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            เพิ่ม ลบ แก้ไข กำหนดการออกมังงะ ไลท์โนเวล และฟิกเกอร์ประจำเดือน เชื่อมโยงกับหน้าร้านจริง
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 transition"
          >
            <RotateCcw size={13} />
            รีเซ็ตค่าเริ่มต้น
          </button>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-orange-700 transition"
          >
            <Plus size={15} />
            เพิ่มรายการออกใหม่
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

      {/* Metrics Row */}
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">รายการทั้งหมด</p>
          <p className="mt-1 text-2xl font-black text-zinc-950 dark:text-zinc-100">{items.length}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">มังงะ (Manga)</p>
          <p className="mt-1 text-2xl font-black text-zinc-950 dark:text-zinc-100">
            {items.filter((i) => i.category === "MANGA").length}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">ไลท์โนเวล (Novel)</p>
          <p className="mt-1 text-2xl font-black text-zinc-950 dark:text-zinc-100">
            {items.filter((i) => i.category === "LIGHT_NOVEL").length}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">ฟิกเกอร์ (Figure)</p>
          <p className="mt-1 text-2xl font-black text-zinc-950 dark:text-zinc-100">
            {items.filter((i) => i.category === "FIGURE").length}
          </p>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="relative flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อเรื่อง หรือสำนักพิมพ์/แบรนด์..."
            className="h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:border-orange-500 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-orange-400"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="h-9 rounded-xl border border-zinc-200 bg-white px-2.5 text-xs font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
          >
            <option value="ALL">ทุกหมวดหมู่</option>
            <option value="MANGA">มังงะ</option>
            <option value="LIGHT_NOVEL">ไลท์โนเวล</option>
            <option value="FIGURE">ฟิกเกอร์</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-9 rounded-xl border border-zinc-200 bg-white px-2.5 text-xs font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
          >
            <option value="ALL">ทุกสถานะ</option>
            <option value="IN_STOCK">พร้อมส่ง</option>
            <option value="PREORDER_OPEN">Pre-order</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
              <tr>
                <th className="p-3.5 font-bold">สินค้า</th>
                <th className="p-3.5 font-bold">หมวดหมู่</th>
                <th className="p-3.5 font-bold">ผู้ผลิต/สำนักพิมพ์</th>
                <th className="p-3.5 font-bold">กำหนดวางจำหน่าย</th>
                <th className="p-3.5 font-bold">ราคา</th>
                <th className="p-3.5 font-bold">สถานะ</th>
                <th className="p-3.5 font-bold text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-500 dark:text-zinc-400">
                    ไม่พบรายการตามเงื่อนไขที่ค้นหา
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition"
                  >
                    <td className="p-3.5 max-w-xs">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-10 shrink-0 overflow-hidden rounded-md border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="line-clamp-2 font-bold text-zinc-900 dark:text-zinc-100">
                            {item.title}
                          </p>
                          <Link
                            href={item.productUrl}
                            target="_blank"
                            className="text-[10px] text-zinc-400 hover:text-orange-600 transition"
                          >
                            เปิดดูหน้าร้าน
                          </Link>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {item.category}
                      </span>
                    </td>
                    <td className="p-3.5 font-medium text-zinc-600 dark:text-zinc-400">
                      {item.publisherOrBrand}
                    </td>
                    <td className="p-3.5 font-semibold text-zinc-800 dark:text-zinc-200">
                      {item.dayLabel}
                    </td>
                    <td className="p-3.5 font-black text-orange-600 dark:text-orange-400">
                      {moneyFormatter.format(item.price)}
                    </td>
                    <td className="p-3.5">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(item)}
                        title="คลิกเพื่อสลับสถานะ"
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition hover:opacity-80 ${
                          item.status === "IN_STOCK"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                        }`}
                      >
                        {item.status === "IN_STOCK" ? "พร้อมส่ง" : "Pre-order"}
                      </button>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(item)}
                          className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition"
                          title="แก้ไข"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id, item.title)}
                          className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 dark:text-zinc-400 dark:hover:text-red-400 transition"
                          title="ลบ"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <h2 className="text-base font-black text-zinc-900 dark:text-zinc-100">
                {editingItem ? "แก้ไขรายการวางจำหน่าย" : "เพิ่มรายการวางจำหน่ายใหม่"}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  ชื่อสินค้า / ชื่อเรื่อง
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="mt-1 h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs font-semibold text-zinc-900 focus:border-orange-500 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    หมวดหมู่
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        category: e.target.value as ReleaseCategory,
                      }))
                    }
                    className="mt-1 h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 text-xs font-semibold text-zinc-900 focus:border-orange-500 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    <option value="MANGA">มังงะ (Manga)</option>
                    <option value="LIGHT_NOVEL">ไลท์โนเวล (Light Novel)</option>
                    <option value="FIGURE">ฟิกเกอร์ (Figure)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    สำนักพิมพ์ / แบรนด์ผู้ผลิต
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.publisherOrBrand}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        publisherOrBrand: e.target.value,
                      }))
                    }
                    className="mt-1 h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs font-semibold text-zinc-900 focus:border-orange-500 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    วันที่วางจำหน่าย (YYYY-MM-DD)
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.releaseDate}
                    onChange={(e) => {
                      const d = e.target.value;
                      const parts = d.split("-");
                      const label = parts.length === 3 ? `${Number(parts[2])} ต.ค. ${parts[0]}` : d;
                      setFormData((prev) => ({
                        ...prev,
                        releaseDate: d,
                        dayLabel: label,
                      }));
                    }}
                    className="mt-1 h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs font-semibold text-zinc-900 focus:border-orange-500 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    ข้อความวันที่แสดง (Day Label)
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.dayLabel}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, dayLabel: e.target.value }))
                    }
                    className="mt-1 h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs font-semibold text-zinc-900 focus:border-orange-500 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    ราคาจำหน่าย (บาท)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formData.price}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        price: Number(e.target.value),
                      }))
                    }
                    className="mt-1 h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs font-semibold text-zinc-900 focus:border-orange-500 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    สถานะการจำหน่าย
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        status: e.target.value as "IN_STOCK" | "PREORDER_OPEN",
                      }))
                    }
                    className="mt-1 h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 text-xs font-semibold text-zinc-900 focus:border-orange-500 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    <option value="IN_STOCK">พร้อมส่ง (In Stock)</option>
                    <option value="PREORDER_OPEN">สั่งจองล่วงหน้า (Pre-order)</option>
                  </select>
                </div>
              </div>

              {/* Visual Image Placement Section */}
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-3.5 dark:border-zinc-800 dark:bg-zinc-800/40">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <ImageIcon size={14} className="text-orange-600" />
                    <span>รูปภาพสินค้าสำหรับตารางวางจำหน่าย (Product Image)</span>
                  </label>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-[11px] font-bold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                    <Upload size={12} />
                    <span>อัปโหลดจากเครื่อง</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Preview and Input Row */}
                <div className="mt-3 flex items-start gap-3">
                  <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                    {formData.imageUrl ? (
                      <img
                        src={formData.imageUrl}
                        alt="Preview"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/images/products/jjk-vol-01.jpg";
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-zinc-400">
                        <ImageIcon size={20} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      required
                      value={formData.imageUrl}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, imageUrl: e.target.value }))
                      }
                      placeholder="เช่น /images/products/jjk-vol-27.jpg หรือ URL"
                      className="h-9 w-full rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                    <p className="mt-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                      วิธีวางภาพ: วางพาธไฟล์ เช่น <code className="font-mono text-orange-600">/images/products/...</code>, วางลิงก์เว็บภายนอก, หรือกดปุ่มอัปโหลด
                    </p>
                  </div>
                </div>

                {/* Quick Presets Pills */}
                <div className="mt-3 border-t border-zinc-200/80 pt-2.5 dark:border-zinc-800">
                  <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-1 mb-1.5">
                    <Sparkles size={11} className="text-amber-500" />
                    <span>คลิกเลือกรูปภาพแนะนำด่วน:</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_COVER_PRESETS.map((preset) => (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, imageUrl: preset.url }))
                        }
                        className={`rounded-lg px-2 py-1 text-[10px] font-bold transition ${
                          formData.imageUrl === preset.url
                            ? "bg-orange-600 text-white shadow-2xs"
                            : "border border-zinc-200 bg-white text-zinc-700 hover:border-orange-300 hover:bg-orange-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-orange-600 px-5 py-2 text-xs font-bold text-white hover:bg-orange-700 shadow-sm transition"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}

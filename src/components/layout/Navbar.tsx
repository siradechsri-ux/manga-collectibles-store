"use client";

import {
  Boxes,
  ChevronDown,
  Layers,
  LogIn,
  LogOut,
  Menu,
  Package,
  Receipt,
  Search,
  ShieldCheck,
  ShoppingBag,
  Store,
  TrendingUp,
  Truck,
  User,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, FormEvent } from "react";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../contexts/AuthContext";
import CartDrawer from "../CartDrawer";
import DevRoleSwitcher from "../DevRoleSwitcher";
import ThemeToggle from "../ThemeToggle";

const ROLE_CONFIG = {
  CUSTOMER: {
    abbr: "ล",
    label: "ลูกค้า",
    sublabel: "Customer",
    badgeBg: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    icon: UserRound,
  },
  STAFF: {
    abbr: "พ",
    label: "เจ้าหน้าที่คลัง",
    sublabel: "Staff",
    badgeBg: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
    icon: Package,
  },
  FINANCE: {
    abbr: "ก",
    label: "ฝ่ายการเงิน",
    sublabel: "Finance",
    badgeBg: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    icon: Wallet,
  },
  ADMIN: {
    abbr: "ด",
    label: "ผู้ดูแลระบบ",
    sublabel: "Admin",
    badgeBg: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
    icon: ShieldCheck,
  },
} as const;

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { itemCount } = useCart();
  const { user, logout, isLoading } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const userMenuRef = useRef<HTMLDivElement>(null);
  const adminDropdownRef = useRef<HTMLDivElement>(null);

  // Sync search query from URL if available
  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const q = params.get("q") ?? params.get("search") ?? "";
      if (q) {
        setSearchQuery(q);
      }
    }
  }, []);

  // Handle clicking outside of dropdown menus
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(target)
      ) {
        setUserMenuOpen(false);
      }
      if (
        adminDropdownRef.current &&
        !adminDropdownRef.current.contains(target)
      ) {
        setAdminDropdownOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setUserMenuOpen(false);
        setAdminDropdownOpen(false);
        setMobileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    const query = searchQuery.trim();
    if (query) {
      router.push(`/?q=${encodeURIComponent(query)}#browse-collection`);
    } else {
      router.push(`/#browse-collection`);
    }
    setMobileMenuOpen(false);
  }

  async function handleLogout() {
    try {
      await logout();
      if (typeof window !== "undefined") {
        window.localStorage.setItem("mock_current_role", "GUEST");
      }
      setUserMenuOpen(false);
      setMobileMenuOpen(false);
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      } else {
        router.replace("/login");
      }
    } catch (err) {
      console.error("Logout failed:", err);
    }
  }

  const currentRole = mounted && user ? user.role : "CUSTOMER";
  const isCustomer = !user || currentRole === "CUSTOMER";
  const isStaff = currentRole === "STAFF";
  const isFinance = currentRole === "FINANCE";
  const isAdmin = currentRole === "ADMIN";

  const roleConfig = ROLE_CONFIG[currentRole] ?? ROLE_CONFIG.CUSTOMER;

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/95 text-zinc-900 backdrop-blur-md transition-colors dark:border-zinc-800 dark:bg-zinc-950/95 dark:text-zinc-100">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* ===================== [1. ฝั่งซ้าย - flex items-center shrink-0]: โลโก้ร้าน + เมนูลิงก์ ===================== */}
          <div className="flex shrink-0 items-center gap-4 lg:gap-6">
            <Link
              href="/"
              className="group inline-flex shrink-0 items-center gap-2.5 transition"
              aria-label="Manga & Collectibles Storefront Home"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-600 text-white shadow-xs transition group-hover:bg-orange-700">
                <Store aria-hidden="true" size={19} />
              </span>
              <span className="shrink-0">
                <span className="block truncate text-sm font-black tracking-tight text-zinc-950 dark:text-zinc-50">
                  MANGA & COLLECTIBLES
                </span>
                <span className="hidden text-[10px] font-medium text-zinc-500 dark:text-zinc-400 sm:block">
                  อ่านสนุก สะสมได้ ส่งถึงบ้าน
                </span>
              </span>
            </Link>

            {/* Menu Links by Role (gap-3 to gap-4, whitespace-nowrap) */}
            <nav
              aria-label="เมนูหลัก"
              className="hidden items-center gap-3 lg:flex xl:gap-4"
            >
              {isCustomer && (
                <>
                  <Link
                    href="/?category=ALL#browse-collection"
                    className="whitespace-nowrap shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100 hover:text-orange-700 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-orange-400"
                  >
                    แคตตาล็อกทั้งหมด
                  </Link>
                  <Link
                    href="/?category=MANGA#browse-collection"
                    className="whitespace-nowrap shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100 hover:text-orange-700 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-orange-400"
                  >
                    มังงะ & โนเวล
                  </Link>
                  <Link
                    href="/?category=FIGURE#browse-collection"
                    className="whitespace-nowrap shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100 hover:text-orange-700 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-orange-400"
                  >
                    ฟิกเกอร์ & โมเดล
                  </Link>
                  <Link
                    href="/?status=PREORDER#browse-collection"
                    className="whitespace-nowrap shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100 hover:text-orange-700 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-orange-400"
                  >
                    พรีออเดอร์
                  </Link>
                </>
              )}

              {isStaff && (
                <>
                  <Link
                    href="/staff/packing"
                    className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                      pathname === "/staff/packing" || pathname.startsWith("/staff/packing/")
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                        : "text-zinc-700 hover:bg-zinc-100 hover:text-indigo-700 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-indigo-400"
                    }`}
                  >
                    <Truck size={14} aria-hidden="true" />
                    <span>จัดเตรียมพัสดุ (Packing)</span>
                  </Link>
                  <Link
                    href="/admin/products"
                    className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                      pathname === "/admin/products" || pathname.startsWith("/admin/products/")
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                        : "text-zinc-700 hover:bg-zinc-100 hover:text-indigo-700 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-indigo-400"
                    }`}
                  >
                    <Boxes size={14} aria-hidden="true" />
                    <span>ตรวจเช็กสต็อกสินค้า</span>
                  </Link>
                </>
              )}

              {isFinance && (
                <>
                  <Link
                    href="/finance/slips"
                    className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                      pathname === "/finance/slips" || pathname.startsWith("/finance/slips/")
                        ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300"
                        : "text-zinc-700 hover:bg-zinc-100 hover:text-emerald-700 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-emerald-400"
                    }`}
                  >
                    <Receipt size={14} aria-hidden="true" />
                    <span>ตรวจสอบสลิปโอนเงิน (Slips)</span>
                  </Link>
                  <Link
                    href="/finance/tax"
                    className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                      pathname === "/finance/tax" || pathname.startsWith("/finance/tax/")
                        ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300"
                        : "text-zinc-700 hover:bg-zinc-100 hover:text-emerald-700 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-emerald-400"
                    }`}
                  >
                    <TrendingUp size={14} aria-hidden="true" />
                    <span>รายงานภาษี & e-Tax</span>
                  </Link>
                </>
              )}

              {isAdmin && (
                <>
                  <Link
                    href="/admin"
                    className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                      pathname === "/admin"
                        ? "bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300"
                        : "text-zinc-700 hover:bg-zinc-100 hover:text-orange-700 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-orange-400"
                    }`}
                  >
                    <Store size={14} aria-hidden="true" />
                    <span>แดชบอร์ดส่วนกลาง</span>
                  </Link>

                  <div className="relative shrink-0" ref={adminDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setAdminDropdownOpen((prev) => !prev)}
                      aria-expanded={adminDropdownOpen}
                      aria-haspopup="menu"
                      className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                        pathname.startsWith("/admin/products") ||
                        pathname.startsWith("/staff/packing") ||
                        pathname.startsWith("/finance/slips") ||
                        pathname.startsWith("/finance/tax")
                          ? "bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300"
                          : "text-zinc-700 hover:bg-zinc-100 hover:text-orange-700 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-orange-400"
                      }`}
                    >
                      <Layers size={14} aria-hidden="true" />
                      <span>ระบบงานหลังบ้าน</span>
                      <ChevronDown
                        size={13}
                        aria-hidden="true"
                        className={`transition-transform duration-200 ${adminDropdownOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    {adminDropdownOpen ? (
                      <div
                        role="menu"
                        aria-label="ระบบงานหลังบ้าน"
                        className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-56 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-xl shadow-zinc-900/10 dark:border-zinc-800 dark:bg-zinc-900"
                      >
                        <Link
                          href="/admin/products"
                          role="menuitem"
                          onClick={() => setAdminDropdownOpen(false)}
                          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                            pathname.startsWith("/admin/products")
                              ? "bg-orange-50 font-bold text-orange-700 dark:bg-orange-950/60 dark:text-orange-300"
                              : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                          }`}
                        >
                          <Boxes size={14} className="text-orange-600 dark:text-orange-400" />
                          <span>จัดการสินค้า (CRUD)</span>
                        </Link>
                        <Link
                          href="/staff/packing"
                          role="menuitem"
                          onClick={() => setAdminDropdownOpen(false)}
                          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                            pathname.startsWith("/staff/packing")
                              ? "bg-indigo-50 font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                              : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                          }`}
                        >
                          <Truck size={14} className="text-indigo-600 dark:text-indigo-400" />
                          <span>จัดเตรียมพัสดุ (Packing)</span>
                        </Link>
                        <Link
                          href="/finance/slips"
                          role="menuitem"
                          onClick={() => setAdminDropdownOpen(false)}
                          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                            pathname.startsWith("/finance/slips")
                              ? "bg-emerald-50 font-bold text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300"
                              : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                          }`}
                        >
                          <Receipt size={14} className="text-emerald-600 dark:text-emerald-400" />
                          <span>ตรวจสอบสลิป (Slips)</span>
                        </Link>
                        <Link
                          href="/finance/tax"
                          role="menuitem"
                          onClick={() => setAdminDropdownOpen(false)}
                          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                            pathname.startsWith("/finance/tax")
                              ? "bg-emerald-50 font-bold text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300"
                              : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                          }`}
                        >
                          <TrendingUp size={14} className="text-emerald-600 dark:text-emerald-400" />
                          <span>รายงานภาษี & e-Tax</span>
                        </Link>
                      </div>
                    ) : null}
                  </div>
                </>
              )}
            </nav>
          </div>

          {/* ===================== [2. ตรงกลาง - flex-1 max-w-md mx-4]: กล่องค้นหาสินค้า (CUSTOMER & ADMIN Only) ===================== */}
          {(isCustomer || isAdmin) ? (
            <div className="mx-4 hidden flex-1 max-w-md md:flex items-center">
              <form
                onSubmit={handleSearchSubmit}
                className="relative w-full"
                role="search"
              >
                <div className="relative flex items-center w-full">
                  <Search
                    size={15}
                    className="pointer-events-none absolute left-3 text-slate-400 dark:text-zinc-500"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ค้นหาสินค้า ชื่อเรื่อง หรือรหัส..."
                    aria-label="ค้นหาสินค้าในร้าน"
                    className="h-9 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-8 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                  />
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        router.push(`/#browse-collection`);
                      }}
                      aria-label="ล้างการค้นหา"
                      className="absolute right-2.5 text-slate-400 hover:text-slate-600 dark:text-zinc-400 dark:hover:text-zinc-200"
                    >
                      <X size={13} />
                    </button>
                  ) : null}
                </div>
              </form>
            </div>
          ) : (
            <div className="flex-1" />
          )}

          {/* ===================== [3. ฝั่งขวา - flex items-center shrink-0]: ตะกร้าสินค้า, สลับธีม, โปรไฟล์เดียว ===================== */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
            {/* Cart Drawer Trigger Button (CUSTOMER only) */}
            {isCustomer ? (
              <button
                type="button"
                onClick={() => setCartDrawerOpen(true)}
                aria-label={`เปิดตะกร้าสินค้า (${mounted ? itemCount : 0} ชิ้น)`}
                className="relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-800 shadow-2xs transition hover:border-orange-300 hover:bg-orange-50/50 hover:text-orange-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-orange-800 dark:hover:bg-zinc-850"
              >
                <ShoppingBag size={16} aria-hidden="true" />
                <span className="hidden sm:inline">ตะกร้า</span>
                {mounted && itemCount > 0 ? (
                  <span
                    className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-600 px-1 text-[10px] font-black text-white shadow-xs"
                    aria-hidden="true"
                  >
                    {itemCount}
                  </span>
                ) : null}
              </button>
            ) : null}

            {/* Theme Toggle (Light / Dark Mode) */}
            <div className="shrink-0">
              <ThemeToggle />
            </div>

            {/* ปุ่มโปรไฟล์เดียวทางขวาสุด (Consolidated Single Profile Button) */}
            {mounted && user ? (
              <div className="relative shrink-0" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((prev) => !prev)}
                  aria-expanded={userMenuOpen}
                  aria-haspopup="menu"
                  aria-label={`โปรไฟล์ผู้ใช้: ${roleConfig.label}`}
                  className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-800 shadow-2xs transition hover:border-orange-400 hover:bg-orange-50/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-orange-800 dark:hover:bg-zinc-800"
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs font-black shadow-2xs ${roleConfig.badgeBg}`}
                  >
                    {roleConfig.abbr}
                  </span>
                  <span className="hidden sm:inline font-bold">
                    {roleConfig.label}
                  </span>
                  <ChevronDown
                    size={13}
                    aria-hidden="true"
                    className={`transition-transform duration-200 ${userMenuOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {userMenuOpen ? (
                  <div
                    role="menu"
                    aria-label="เมนูผู้ใช้งาน"
                    className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-zinc-900/10 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    {/* Header info */}
                    <div className="border-b border-slate-100 px-3 py-2.5 dark:border-zinc-800">
                      <p className="truncate text-xs font-black text-slate-900 dark:text-zinc-100">
                        {user.fullName}
                      </p>
                      <p className="truncate text-[10px] text-slate-500 dark:text-zinc-400">
                        {user.email}
                      </p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-extrabold ${roleConfig.badgeBg}`}
                        >
                          <roleConfig.icon size={11} aria-hidden="true" />
                          <span>{roleConfig.label} ({roleConfig.sublabel})</span>
                        </span>
                      </div>
                    </div>

                    {/* Quick navigation links by role */}
                    <div className="py-1">
                      <Link
                        href="/profile"
                        role="menuitem"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        <User size={14} /> ข้อมูลโปรไฟล์
                      </Link>

                      {isCustomer && (
                        <Link
                          href="/orders"
                          role="menuitem"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                          <Package size={14} /> คำสั่งซื้อของฉัน
                        </Link>
                      )}

                      {isStaff && (
                        <>
                          <Link
                            href="/staff/packing"
                            role="menuitem"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950/40"
                          >
                            <Truck size={14} /> จัดเตรียมพัสดุ (Packing)
                          </Link>
                          <Link
                            href="/admin/products"
                            role="menuitem"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                          >
                            <Boxes size={14} /> ตรวจเช็กสต็อกสินค้า
                          </Link>
                        </>
                      )}

                      {isFinance && (
                        <>
                          <Link
                            href="/finance/slips"
                            role="menuitem"
                            onClick={() => setUserMenuOpen(false)}
                            className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                              pathname === "/finance/slips"
                                ? "bg-emerald-50 text-emerald-800 font-bold dark:bg-emerald-950/70 dark:text-emerald-300"
                                : "text-slate-700 hover:bg-slate-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            }`}
                          >
                            <Receipt size={14} /> ตรวจสอบสลิปโอนเงิน (Slips)
                          </Link>
                          <Link
                            href="/finance/tax"
                            role="menuitem"
                            onClick={() => setUserMenuOpen(false)}
                            className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                              pathname === "/finance/tax"
                                ? "bg-emerald-50 text-emerald-800 font-bold dark:bg-emerald-950/70 dark:text-emerald-300"
                                : "text-slate-700 hover:bg-slate-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            }`}
                          >
                            <TrendingUp size={14} /> รายงานภาษี & e-Tax
                          </Link>
                        </>
                      )}

                      {isAdmin && (
                        <>
                          <Link
                            href="/admin"
                            role="menuitem"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold text-orange-700 transition hover:bg-orange-50 dark:text-orange-300 dark:hover:bg-orange-950/40"
                          >
                            <Store size={14} /> แดชบอร์ดส่วนกลาง (/admin)
                          </Link>
                          <Link
                            href="/admin/products"
                            role="menuitem"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                          >
                            <Layers size={14} /> จัดการสินค้า (CRUD)
                          </Link>
                          <Link
                            href="/staff/packing"
                            role="menuitem"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                          >
                            <Truck size={14} /> จัดเตรียมพัสดุ
                          </Link>
                          <Link
                            href="/finance/slips"
                            role="menuitem"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                          >
                            <Receipt size={14} /> ตรวจสลิป
                          </Link>
                          <Link
                            href="/finance/tax"
                            role="menuitem"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                          >
                            <TrendingUp size={14} /> รายงานภาษี & e-Tax
                          </Link>
                        </>
                      )}

                      <div className="my-1 border-t border-slate-100 dark:border-zinc-800" />

                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => void handleLogout()}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                      >
                        <LogOut size={14} /> ออกจากระบบ
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : mounted && !isLoading ? (
              <Link
                href="/login"
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-slate-900 px-3 text-xs font-bold text-white transition hover:bg-orange-600 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-orange-500 dark:hover:text-white"
              >
                <LogIn size={14} aria-hidden="true" />
                <span>เข้าสู่ระบบ</span>
              </Link>
            ) : null}

            {/* Mobile Drawer Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? "ปิดเมนู" : "เปิดเมนูนำทาง"}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900 lg:hidden"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen ? (
          <div className="border-t border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 lg:hidden">
            {(isCustomer || isAdmin) ? (
              <form onSubmit={handleSearchSubmit} className="mb-4">
                <div className="relative flex items-center">
                  <Search size={15} className="absolute left-3 text-slate-400 dark:text-zinc-500" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ค้นหาสินค้า..."
                    aria-label="ค้นหาสินค้าในร้าน"
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-8 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                  />
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      aria-label="ล้างการค้นหา"
                      className="absolute right-2.5 text-slate-400 hover:text-slate-600 dark:text-zinc-400 dark:hover:text-zinc-200"
                    >
                      <X size={14} />
                    </button>
                  ) : null}
                </div>
              </form>
            ) : null}

            <nav className="flex flex-col gap-1 text-xs font-bold">
              {isCustomer && (
                <>
                  <Link
                    href="/?category=ALL#browse-collection"
                    onClick={() => setMobileMenuOpen(false)}
                    className="whitespace-nowrap shrink-0 rounded-xl px-3 py-2 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900"
                  >
                    แคตตาล็อกทั้งหมด
                  </Link>
                  <Link
                    href="/?category=MANGA#browse-collection"
                    onClick={() => setMobileMenuOpen(false)}
                    className="whitespace-nowrap shrink-0 rounded-xl px-3 py-2 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900"
                  >
                    มังงะ & โนเวล
                  </Link>
                  <Link
                    href="/?category=FIGURE#browse-collection"
                    onClick={() => setMobileMenuOpen(false)}
                    className="whitespace-nowrap shrink-0 rounded-xl px-3 py-2 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900"
                  >
                    ฟิกเกอร์ & โมเดล
                  </Link>
                  <Link
                    href="/?status=PREORDER#browse-collection"
                    onClick={() => setMobileMenuOpen(false)}
                    className="whitespace-nowrap shrink-0 rounded-xl px-3 py-2 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900"
                  >
                    พรีออเดอร์
                  </Link>
                  {user ? (
                    <Link
                      href="/orders"
                      onClick={() => setMobileMenuOpen(false)}
                      className="whitespace-nowrap shrink-0 rounded-xl px-3 py-2 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900"
                    >
                      ประวัติคำสั่งซื้อของฉัน
                    </Link>
                  ) : null}
                </>
              )}

              {isStaff && (
                <>
                  <Link
                    href="/staff/packing"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`whitespace-nowrap shrink-0 rounded-xl px-3 py-2 transition ${
                      pathname === "/staff/packing" || pathname.startsWith("/staff/packing/")
                        ? "bg-indigo-50 text-indigo-700 font-bold dark:bg-indigo-950/60 dark:text-indigo-300"
                        : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900"
                    }`}
                  >
                    จัดเตรียมพัสดุ (Packing)
                  </Link>
                  <Link
                    href="/admin/products"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`whitespace-nowrap shrink-0 rounded-xl px-3 py-2 transition ${
                      pathname === "/admin/products" || pathname.startsWith("/admin/products/")
                        ? "bg-indigo-50 text-indigo-700 font-bold dark:bg-indigo-950/60 dark:text-indigo-300"
                        : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900"
                    }`}
                  >
                    ตรวจเช็กสต็อกสินค้า
                  </Link>
                </>
              )}

              {isFinance && (
                <>
                  <Link
                    href="/finance/slips"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`whitespace-nowrap shrink-0 rounded-xl px-3 py-2 transition ${
                      pathname === "/finance/slips" || pathname.startsWith("/finance/slips/")
                        ? "bg-emerald-50 text-emerald-800 font-bold dark:bg-emerald-950/70 dark:text-emerald-300"
                        : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900"
                    }`}
                  >
                    ตรวจสอบสลิปโอนเงิน (Slips)
                  </Link>
                  <Link
                    href="/finance/tax"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`whitespace-nowrap shrink-0 rounded-xl px-3 py-2 transition ${
                      pathname === "/finance/tax" || pathname.startsWith("/finance/tax/")
                        ? "bg-emerald-50 text-emerald-800 font-bold dark:bg-emerald-950/70 dark:text-emerald-300"
                        : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900"
                    }`}
                  >
                    รายงานภาษี & e-Tax
                  </Link>
                </>
              )}

              {isAdmin && (
                <>
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`whitespace-nowrap shrink-0 rounded-xl px-3 py-2 transition ${
                      pathname === "/admin"
                        ? "bg-orange-50 text-orange-700 font-bold dark:bg-orange-950/60 dark:text-orange-300"
                        : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900"
                    }`}
                  >
                    แดชบอร์ดส่วนกลาง (/admin)
                  </Link>
                  <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
                  <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    ระบบงานหลังบ้าน
                  </p>
                  <Link
                    href="/admin/products"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`whitespace-nowrap shrink-0 rounded-xl px-3 py-2 transition ${
                      pathname === "/admin/products" || pathname.startsWith("/admin/products/")
                        ? "bg-orange-50 text-orange-700 font-bold dark:bg-orange-950/60 dark:text-orange-300"
                        : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900"
                    }`}
                  >
                    จัดการสินค้า (CRUD)
                  </Link>
                  <Link
                    href="/staff/packing"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`whitespace-nowrap shrink-0 rounded-xl px-3 py-2 transition ${
                      pathname === "/staff/packing" || pathname.startsWith("/staff/packing/")
                        ? "bg-indigo-50 text-indigo-700 font-bold dark:bg-indigo-950/60 dark:text-indigo-300"
                        : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900"
                    }`}
                  >
                    จัดเตรียมพัสดุ (Packing)
                  </Link>
                  <Link
                    href="/finance/slips"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`whitespace-nowrap shrink-0 rounded-xl px-3 py-2 transition ${
                      pathname === "/finance/slips" || pathname.startsWith("/finance/slips/")
                        ? "bg-emerald-50 text-emerald-800 font-bold dark:bg-emerald-950/70 dark:text-emerald-300"
                        : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900"
                    }`}
                  >
                    ตรวจสอบสลิป (Slips)
                  </Link>
                  <Link
                    href="/finance/tax"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`whitespace-nowrap shrink-0 rounded-xl px-3 py-2 transition ${
                      pathname === "/finance/tax" || pathname.startsWith("/finance/tax/")
                        ? "bg-emerald-50 text-emerald-800 font-bold dark:bg-emerald-950/70 dark:text-emerald-300"
                        : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900"
                    }`}
                  >
                    รายงานภาษี & e-Tax
                  </Link>
                </>
              )}

              <div className="my-2 border-t border-zinc-100 dark:border-zinc-800" />
              {user ? (
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="flex items-center gap-2 whitespace-nowrap shrink-0 rounded-xl px-3 py-2 text-left font-bold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  <LogOut size={15} /> ออกจากระบบ ({user.fullName})
                </button>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 whitespace-nowrap shrink-0 rounded-xl bg-slate-900 px-3 py-2 text-center font-bold text-white hover:bg-orange-600 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-orange-500 dark:hover:text-white"
                >
                  <LogIn size={15} /> เข้าสู่ระบบ
                </Link>
              )}
            </nav>
          </div>
        ) : null}
      </header>

      {/* Cart Drawer Component */}
      <CartDrawer
        isOpen={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
      />

      {/* Persistent Dev Role Switcher Floating Bar (bottom right) */}
      <DevRoleSwitcher />
    </>
  );
}

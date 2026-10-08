"use client";

import {
  BookOpen,
  ChevronDown,
  FlaskConical,
  LogIn,
  LogOut,
  Menu,
  Package,
  Settings,
  ShoppingBag,
  Sparkles,
  UserRound,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../contexts/AuthContext";
import ThemeToggle from "./ThemeToggle";

export default function StorefrontHeader() {
  const router = useRouter();
  const { itemCount } = useCart();
  const { user, logout, quickLogin, isLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [roleSwitchError, setRoleSwitchError] = useState<string | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent): void {
      if (
        userMenuRef.current &&
        event.target instanceof Node &&
        !userMenuRef.current.contains(event.target)
      ) {
        setUserMenuOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setUserMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  async function handleLogout(): Promise<void> {
    setLogoutError(null);
    try {
      await logout();
      setUserMenuOpen(false);
      setMobileMenuOpen(false);
      router.replace("/");
    } catch (error) {
      setLogoutError(
        error instanceof Error ? error.message : "ออกจากระบบไม่สำเร็จ",
      );
    }
  }

  async function handleRoleSwitch(
    role: "CUSTOMER" | "STAFF" | "FINANCE" | "ADMIN",
  ): Promise<void> {
    setRoleSwitchError(null);
    try {
      await quickLogin(role);
      setMobileMenuOpen(false);
      setRoleSwitcherOpen(false);
      const roleHome =
        role === "STAFF"
          ? "/staff/packing"
          : role === "FINANCE"
            ? "/finance/slips"
            : role === "ADMIN"
              ? "/admin"
              : "/";
      router.push(roleHome);
    } catch (error) {
      setRoleSwitchError(
        error instanceof Error ? error.message : "สลับบทบาทไม่สำเร็จ",
      );
    }
  }

  return (
    <>
    <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/95 text-zinc-900 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 dark:text-zinc-100">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex min-w-0 items-center gap-2.5"
          aria-label="Manga & Collectibles หน้าร้าน"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-600 text-white shadow-sm">
            <BookOpen aria-hidden="true" size={21} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-extrabold tracking-tight text-zinc-950 dark:text-zinc-100 sm:text-base">
              MANGA & COLLECTIBLES
            </span>
            <span className="hidden text-[11px] font-medium text-zinc-500 dark:text-zinc-400 sm:block">
              อ่านสนุก สะสมได้ ส่งถึงบ้าน
            </span>
          </span>
        </Link>

        <nav aria-label="เมนูหลัก" className="hidden items-center gap-7 md:flex">
          <Link href="/" className="text-sm font-semibold text-zinc-700 transition hover:text-orange-700 dark:text-zinc-300">
            หน้าร้าน
          </Link>
          <Link href="/#browse-collection" className="text-sm font-semibold text-zinc-700 transition hover:text-orange-700 dark:text-zinc-300">
            มังงะ
          </Link>
          <Link href="/#browse-collection" className="text-sm font-semibold text-zinc-700 transition hover:text-orange-700 dark:text-zinc-300">
            Figure / ของสะสม
          </Link>
          {user?.role === "STAFF" ? (
            <Link
              href="/staff/packing"
              className="inline-flex items-center gap-2 rounded-lg bg-orange-100 px-3 py-2 text-sm font-extrabold text-orange-800 transition hover:bg-orange-200 dark:bg-orange-950/60 dark:text-orange-200 dark:hover:bg-orange-900/70"
            >
              <Package size={16} aria-hidden="true" />
              คลังสินค้าและจัดส่ง
            </Link>
          ) : null}
          {user?.role === "FINANCE" ? (
            <Link
              href="/finance/slips"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-100 px-3 py-2 text-sm font-extrabold text-emerald-800 transition hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:hover:bg-emerald-900/70"
            >
              ตรวจสอบการชำระเงิน
            </Link>
          ) : null}
        </nav>

        <div className="flex items-center gap-2">
          {process.env.NEXT_PUBLIC_USE_MOCK === "true" ? (
            <div className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setRoleSwitcherOpen((open) => !open)}
                aria-expanded={roleSwitcherOpen}
                aria-haspopup="true"
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              >
                <FlaskConical size={15} aria-hidden="true" />
                โหมดทดสอบ
              </button>
              {roleSwitcherOpen ? (
                <div className="absolute right-0 top-[calc(100%+0.65rem)] z-50 w-72 rounded-2xl border border-zinc-200 bg-white p-3 shadow-xl shadow-zinc-900/15 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="mb-2 flex items-center justify-between px-1">
                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-100">
                      เลือกบทบาทสำหรับทดสอบ
                    </p>
                    <span className="rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-bold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
                      {user?.role ?? "GUEST"}
                    </span>
                  </div>
                  <div
                    className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800"
                    role="group"
                    aria-label="เลือกบทบาททดสอบ"
                  >
                    {(
                      [
                        ["CUSTOMER", "ลูกค้า"],
                        ["STAFF", "พนักงานคลัง"],
                        ["FINANCE", "ฝ่ายการเงิน"],
                        ["ADMIN", "ผู้ดูแลระบบ"],
                      ] as const
                    ).map(([role, label]) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => void handleRoleSwitch(role)}
                        aria-pressed={user?.role === role}
                        className={`min-h-10 rounded-lg px-2 text-xs font-semibold transition ${
                          user?.role === role
                            ? "bg-white text-zinc-950 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-700 dark:text-white dark:ring-zinc-600"
                            : "text-zinc-600 hover:bg-white/70 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-white"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {roleSwitchError ? (
                    <p className="mt-2 px-1 text-xs font-semibold text-red-700" role="alert">
                      {roleSwitchError}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
          <ThemeToggle />
          {user ? (
            <div className="relative hidden sm:block" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((open) => !open)}
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
                aria-controls="user-account-menu"
                className="inline-flex h-10 max-w-56 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-2.5 text-left transition hover:border-orange-300 hover:bg-orange-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-orange-800 dark:hover:bg-zinc-800"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-extrabold text-orange-800 dark:bg-orange-950 dark:text-orange-200">
                  {user.fullName.trim().slice(0, 1) || <UserRound size={17} />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    {user.fullName}
                  </span>
                  <span className="mt-0.5 inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-extrabold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {user.role}
                  </span>
                </span>
                <ChevronDown size={15} aria-hidden="true" className={`shrink-0 text-zinc-500 transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
              </button>
              {userMenuOpen ? (
                <div
                  id="user-account-menu"
                  role="menu"
                  aria-label="เมนูบัญชีผู้ใช้"
                  className="absolute right-0 top-[calc(100%+0.65rem)] z-50 w-72 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl shadow-zinc-900/15 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="px-3 py-3">
                    <p className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">{user.fullName}</p>
                    <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">{user.email}</p>
                    <span className="mt-2 inline-flex rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-extrabold text-violet-800 dark:bg-violet-950 dark:text-violet-200">
                      {user.role}
                    </span>
                  </div>
                  <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
                  <Link
                    href="/profile"
                    role="menuitem"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex min-h-10 items-center gap-2.5 rounded-xl px-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    <User size={16} aria-hidden="true" /> ข้อมูลโปรไฟล์
                  </Link>
                  {user.role === "CUSTOMER" ? (
                    <Link
                      href="/orders"
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex min-h-10 items-center gap-2.5 rounded-xl px-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      <Package size={16} aria-hidden="true" /> คำสั่งซื้อของฉัน
                    </Link>
                  ) : null}
                  <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => void handleLogout()}
                    className="flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    <LogOut size={16} aria-hidden="true" /> ออกจากระบบ
                  </button>
                </div>
              ) : null}
            </div>
          ) : !isLoading ? (
            <Link
              href="/login"
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 hover:border-orange-300 hover:text-orange-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
            >
              <LogIn size={16} aria-hidden="true" />
              <span className="hidden sm:inline">เข้าสู่ระบบ</span>
            </Link>
          ) : null}
          {user?.role === "ADMIN" ? (
            <Link
              href="/admin"
              className="hidden min-h-10 items-center gap-2 rounded-xl bg-zinc-950 px-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white lg:inline-flex"
            >
              <Settings size={16} aria-hidden="true" />
              จัดการระบบหลังบ้าน
            </Link>
          ) : null}
          {!user || user.role === "CUSTOMER" ? (
            <Link
              href="/checkout"
              className="relative inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-bold text-zinc-800 transition hover:border-orange-300 hover:bg-orange-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              aria-label={`ตะกร้าสินค้า ${itemCount} ชิ้น`}
            >
              <ShoppingBag aria-hidden="true" size={18} />
              <span className="hidden sm:inline">ตะกร้า</span>
              <span className="absolute -right-2 -top-2 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-orange-600 px-1 text-[11px] font-bold leading-none text-white">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "ปิดเมนู" : "เปิดเมนู"}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 text-zinc-700 dark:border-zinc-800 dark:text-zinc-200 md:hidden"
          >
            {mobileMenuOpen ? <X size={19} aria-hidden="true" /> : <Menu size={19} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {logoutError ? (
        <p
          role="alert"
          className="mx-auto max-w-7xl px-4 pb-2 text-xs text-red-700 sm:px-6 lg:px-8"
        >
          {logoutError}
        </p>
      ) : null}

      {mobileMenuOpen ? (
        <nav aria-label="เมนูมือถือ" className="border-t border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950 md:hidden">
          {process.env.NEXT_PUBLIC_USE_MOCK === "true" ? (
            <section className="mb-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="inline-flex items-center gap-2 text-xs font-bold text-zinc-700 dark:text-zinc-200">
                  <FlaskConical size={14} aria-hidden="true" />
                  เลือกบทบาททดสอบ
                </h2>
                <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                  {user?.role ?? "GUEST"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["CUSTOMER", "ลูกค้า"],
                    ["STAFF", "พนักงานคลัง"],
                    ["FINANCE", "ฝ่ายการเงิน"],
                    ["ADMIN", "ผู้ดูแลระบบ"],
                  ] as const
                ).map(([role, label]) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => void handleRoleSwitch(role)}
                    aria-pressed={user?.role === role}
                    className={`min-h-10 rounded-lg border px-3 py-2 text-xs font-semibold ${
                      user?.role === role
                        ? "border-zinc-400 bg-white text-zinc-950 shadow-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
                        : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {roleSwitchError ? (
                <p className="mt-2 text-xs font-semibold text-red-700" role="alert">
                  {roleSwitchError}
                </p>
              ) : null}
            </section>
          ) : null}
          {user ? (
            <section className="mb-2 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center gap-2.5 px-3 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-extrabold text-orange-800 dark:bg-orange-950 dark:text-orange-200">
                  {user.fullName.trim().slice(0, 1) || <UserRound size={17} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">{user.fullName}</span>
                  <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">{user.email}</span>
                </span>
                <span className="rounded-full bg-violet-100 px-2 py-1 text-[10px] font-extrabold text-violet-800 dark:bg-violet-950 dark:text-violet-200">{user.role}</span>
              </div>
              <div className="border-t border-zinc-100 p-2 dark:border-zinc-800">
                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  <User size={16} aria-hidden="true" /> ข้อมูลโปรไฟล์
                </Link>
                {user.role === "CUSTOMER" ? (
                  <Link
                    href="/orders"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    <Package size={16} aria-hidden="true" /> คำสั่งซื้อของฉัน
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  <LogOut size={16} aria-hidden="true" /> ออกจากระบบ
                </button>
              </div>
            </section>
          ) : !isLoading ? (
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="mb-2 flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-semibold text-orange-800 hover:bg-orange-50"
            >
              <LogIn size={17} aria-hidden="true" /> เข้าสู่ระบบ
            </Link>
          ) : null}
          {user?.role === "STAFF" ? (
            <Link
              href="/staff/packing"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-lg bg-orange-50 px-3 py-3 text-sm font-bold text-orange-800 hover:bg-orange-100 dark:bg-orange-950/50 dark:text-orange-200 dark:hover:bg-orange-900/50"
            >
              <Package size={17} aria-hidden="true" />
              คลังสินค้าและจัดส่ง
            </Link>
          ) : null}
          {user?.role === "FINANCE" ? (
            <Link
              href="/finance/slips"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-3 text-sm font-bold text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-200 dark:hover:bg-emerald-900/50"
            >
              ตรวจสอบการชำระเงิน
            </Link>
          ) : null}
          {user?.role === "ADMIN" ? (
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-lg bg-zinc-950 px-3 py-3 text-sm font-bold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
            >
              <Settings size={17} aria-hidden="true" />
              จัดการระบบหลังบ้าน
            </Link>
          ) : null}
          <Link
            href="/#browse-collection"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <BookOpen size={17} aria-hidden="true" /> มังงะทั้งหมด
          </Link>
          <Link
            href="/#browse-collection"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <Sparkles size={17} aria-hidden="true" /> Figure / ของสะสม
          </Link>
        </nav>
      ) : null}
    </header>
    </>
  );
}

"use client";

import {
  Award,
  Boxes,
  ChevronDown,
  Heart,
  Layers,
  LogIn,
  LogOut,
  Menu,
  Package,
  Receipt,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
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
import { useEffect, useRef, useState, FormEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../contexts/AuthContext";
import { useWishlist } from "../../contexts/WishlistContext";
import { getUserPoints, subscribeUserPoints } from "../../mocks/points.mock";
import type { CatalogData } from "../../lib/catalog-client";
import { ProductService } from "../../services/product.service";
import CartDrawer from "../CartDrawer";
import DevRoleSwitcher from "../DevRoleSwitcher";
import PointBadge from "../PointBadge";
import ThemeToggle from "../ThemeToggle";

interface SearchSuggestion {
  title: string;
  detail: string;
  image: string | null;
  href: string;
  category: string;
}

function findProductSuggestions(catalog: CatalogData, query: string): SearchSuggestion[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return [];

  const candidates: Array<{ suggestion: SearchSuggestion; searchable: string }> = [];

  for (const series of catalog.mangaSeries) {
    candidates.push({
      suggestion: {
        title: series.title,
        detail: `${series.publisher} · ${series.volumes.length} เล่ม`,
        image:
          series.coverUrl ||
          series.coverImage ||
          series.images?.[0] ||
          series.volumes[0]?.coverUrl ||
          series.volumes[0]?.images?.[0] ||
          null,
        href: `/manga/${encodeURIComponent(series.id)}`,
        category: "มังงะ",
      },
      searchable: [
        series.title,
        series.publisher,
        series.author ?? "",
        ...(series.altTitles ?? []),
        ...series.volumes.flatMap((volume) => [
          volume.title,
          volume.variantLabel ?? "",
          volume.isbn ?? "",
        ]),
      ].join(" ").toLocaleLowerCase(),
    });
  }

  for (const series of catalog.lightNovelSeries) {
    candidates.push({
      suggestion: {
        title: series.title,
        detail: `${series.publisher} · ${series.volumes.length} เล่ม`,
        image:
          series.coverUrl ||
          series.coverImage ||
          series.images?.[0] ||
          series.volumes[0]?.coverUrl ||
          series.volumes[0]?.images?.[0] ||
          null,
        href: `/manga/${encodeURIComponent(series.id)}`,
        category: "ไลท์โนเวล",
      },
      searchable: [
        series.title,
        series.publisher,
        series.author ?? "",
        ...(series.altTitles ?? []),
        ...series.volumes.flatMap((volume) => [
          volume.title,
          volume.variantLabel ?? "",
          volume.isbn ?? "",
        ]),
      ].join(" ").toLocaleLowerCase(),
    });
  }

  const collectibles = [
    ...catalog.figures,
    ...catalog.plamo,
    ...catalog.goods,
    ...catalog.accessories,
  ];
  for (const item of collectibles) {
    candidates.push({
      suggestion: {
        title: item.name,
        detail: item.series || item.manufacturer,
        image: item.coverImage || item.coverUrl || item.images[0] || null,
        href: `/figures/${encodeURIComponent(item.slug)}`,
        category:
          item.category === "PLAMO"
            ? "พลาสติกโมเดล"
            : item.category === "GOODS"
              ? "กู้ดส์"
              : item.category === "ACCESSORY"
                ? "อุปกรณ์ดูแล"
                : "ฟิกเกอร์",
      },
      searchable: [
        item.name,
        item.series,
        item.character,
        item.manufacturer,
        item.janCode,
        item.grade ?? "",
        item.subcategory ?? "",
        ...(item.altTitles ?? []),
      ].join(" ").toLocaleLowerCase(),
    });
  }

  return candidates
    .filter(({ searchable }) => searchable.includes(normalizedQuery))
    .sort((first, second) => {
      const firstStarts = first.suggestion.title.toLocaleLowerCase().startsWith(normalizedQuery);
      const secondStarts = second.suggestion.title.toLocaleLowerCase().startsWith(normalizedQuery);
      return Number(secondStarts) - Number(firstStarts);
    })
    .slice(0, 8)
    .map(({ suggestion }) => suggestion);
}

function SearchSuggestionList({
  id,
  query,
  suggestions,
  loading,
  activeIndex,
  open,
  onSelect,
}: {
  id: string;
  query: string;
  suggestions: SearchSuggestion[];
  loading: boolean;
  activeIndex: number;
  open: boolean;
  onSelect: (suggestion: SearchSuggestion) => void;
}) {
  if (!open || query.trim().length < 2) return null;

  return (
    <div id={id} className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
      {loading ? (
        <p className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">กำลังค้นหาสินค้า...</p>
      ) : suggestions.length > 0 ? (
        <ul role="listbox" aria-label="ผลการค้นหาสินค้า" className="max-h-96 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <li id={`${id}-option-${index}`} key={`${suggestion.href}-${suggestion.title}`} role="option" aria-selected={activeIndex === index}>
              <Link
                href={suggestion.href}
                onClick={() => onSelect(suggestion)}
                className={`flex items-center gap-3 px-3 py-2.5 transition ${
                  activeIndex === index
                    ? "bg-orange-50 dark:bg-zinc-800"
                    : "hover:bg-zinc-50 dark:hover:bg-zinc-800"
                }`}
              >
                {suggestion.image ? (
                  <img src={suggestion.image} alt="" className="h-11 w-9 shrink-0 rounded-md border border-zinc-200 object-cover dark:border-zinc-700" />
                ) : (
                  <span className="h-11 w-9 shrink-0 rounded-md bg-zinc-100 dark:bg-zinc-800" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">{suggestion.title}</span>
                  <span className="mt-0.5 block truncate text-xs text-zinc-500 dark:text-zinc-400">{suggestion.detail}</span>
                </span>
                <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">{suggestion.category}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">ไม่พบสินค้าที่ตรงกับ “{query.trim()}”</p>
      )}
    </div>
  );
}

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
  const { wishlistCount } = useWishlist();
  const { user, logout, isLoading } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [userPoints, setUserPoints] = useState<number>(450);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const adminDropdownRef = useRef<HTMLDivElement>(null);
  const searchCatalogRef = useRef<CatalogData | null>(null);
  const searchCatalogRequestRef = useRef<Promise<CatalogData> | null>(null);

  // Sync user points and search query from URL if available
  useEffect(() => {
    setMounted(true);
    setUserPoints(getUserPoints());
    const unsubscribe = subscribeUserPoints((points) => {
      setUserPoints(points);
    });

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const q = params.get("q") ?? params.get("search") ?? "";
      if (q) {
        setSearchQuery(q);
      }
    }

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const query = searchQuery.trim();
    if (!searchFocused || query.length < 2) {
      setSearchSuggestions([]);
      setSearchLoading(false);
      setActiveSuggestionIndex(-1);
      return;
    }

    let isCurrent = true;
    setSearchLoading(true);
    setActiveSuggestionIndex(-1);
    const timeout = setTimeout(() => {
      async function findSuggestions(): Promise<void> {
        try {
          let catalog = searchCatalogRef.current;
          if (!catalog) {
            searchCatalogRequestRef.current ??= ProductService.getProducts();
            catalog = await searchCatalogRequestRef.current;
            searchCatalogRef.current = catalog;
          }
          if (isCurrent) {
            setSearchSuggestions(findProductSuggestions(catalog, query));
          }
        } catch {
          if (isCurrent) setSearchSuggestions([]);
        } finally {
          if (isCurrent) setSearchLoading(false);
        }
      }
      void findSuggestions();
    }, 180);

    return () => {
      isCurrent = false;
      clearTimeout(timeout);
    };
  }, [searchFocused, searchQuery]);

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
    const suggestion = searchSuggestions[activeSuggestionIndex] ?? searchSuggestions[0];
    if (suggestion) router.push(suggestion.href);
    setSearchFocused(false);
    setMobileMenuOpen(false);
  }

  function handleSearchSuggestionKeyDown(event: ReactKeyboardEvent<HTMLInputElement>): void {
    if (event.key === "ArrowDown" && searchSuggestions.length > 0) {
      event.preventDefault();
      setActiveSuggestionIndex((current) =>
        current >= searchSuggestions.length - 1 ? 0 : current + 1,
      );
    } else if (event.key === "ArrowUp" && searchSuggestions.length > 0) {
      event.preventDefault();
      setActiveSuggestionIndex((current) =>
        current <= 0 ? searchSuggestions.length - 1 : current - 1,
      );
    } else if (event.key === "Escape") {
      setSearchFocused(false);
    }
  }

  function selectSearchSuggestion(suggestion: SearchSuggestion): void {
    setSearchQuery(suggestion.title);
    setSearchFocused(false);
    setMobileSearchOpen(false);
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
            <div className="mx-4 hidden min-w-0 flex-1 items-center md:flex">
              <form
                onSubmit={handleSearchSubmit}
                className="relative w-full"
                role="search"
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    setSearchFocused(false);
                  }
                }}
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
                    onFocus={() => setSearchFocused(true)}
                    onKeyDown={handleSearchSuggestionKeyDown}
                    placeholder="ค้นหาสินค้า ชื่อเรื่อง หรือรหัส..."
                    aria-label="ค้นหาสินค้าในร้าน"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={searchFocused && searchQuery.trim().length >= 2}
                    aria-controls="desktop-product-search-suggestions"
                    aria-activedescendant={activeSuggestionIndex >= 0 ? `desktop-product-search-suggestions-option-${activeSuggestionIndex}` : undefined}
                    className="h-9 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-8 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                  />
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                      }}
                      aria-label="ล้างการค้นหา"
                      className="absolute right-2.5 text-slate-400 hover:text-slate-600 dark:text-zinc-400 dark:hover:text-zinc-200"
                    >
                      <X size={13} />
                    </button>
                  ) : null}
                </div>
                <SearchSuggestionList
                  id="desktop-product-search-suggestions"
                  query={searchQuery}
                  suggestions={searchSuggestions}
                  loading={searchLoading}
                  activeIndex={activeSuggestionIndex}
                  open={searchFocused}
                  onSelect={selectSearchSuggestion}
                />
              </form>
            </div>
          ) : (
            <div className="flex-1" />
          )}

          {/* ===================== [3. ฝั่งขวา - flex items-center shrink-0]: ตะกร้าสินค้า, สลับธีม, โปรไฟล์เดียว ===================== */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
            {(isCustomer || isAdmin) ? (
              <button
                type="button"
                onClick={() => {
                  setMobileSearchOpen((current) => !current);
                  setMobileMenuOpen(false);
                  setSearchFocused(false);
                }}
                aria-label={mobileSearchOpen ? "ปิดการค้นหา" : "เปิดการค้นหา"}
                aria-expanded={mobileSearchOpen}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-300 text-slate-700 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-orange-800 dark:hover:bg-zinc-900 dark:hover:text-orange-400 md:hidden"
              >
                {mobileSearchOpen ? <X size={17} aria-hidden="true" /> : <Search size={17} aria-hidden="true" />}
              </button>
            ) : null}

            {/* Rewards Points Badge (CUSTOMER only) */}
            {isCustomer ? (
              <Link
                href="/rewards"
                aria-label={`แต้มสะสมสมาชิก (${mounted ? userPoints : 0} แต้ม)`}
                className={`relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-bold shadow-2xs transition ${
                  pathname === "/rewards"
                    ? "border-blue-500 bg-blue-50 text-blue-900 dark:border-blue-500 dark:bg-blue-950/70 dark:text-blue-300"
                    : "border-slate-300 bg-white text-slate-800 hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-blue-500 dark:hover:bg-zinc-850"
                }`}
              >
                <PointBadge size="sm" />
                <span className="hidden sm:inline">
                  {mounted ? userPoints.toLocaleString("th-TH") : 0} แต้ม
                </span>
              </Link>
            ) : null}

            {/* Wishlist Link Button (Customer only) */}
            {isCustomer ? (
              <Link
                href="/wishlist"
                aria-label={`รายการที่ถูกใจ (${mounted ? wishlistCount : 0} ชิ้น)`}
                className="relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-800 shadow-2xs transition hover:border-red-300 hover:bg-red-50/50 hover:text-red-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-red-800 dark:hover:bg-zinc-850"
              >
                <Heart
                  size={16}
                  className={mounted && wishlistCount > 0 ? "fill-red-500 text-red-500" : ""}
                  aria-hidden="true"
                />
                <span className="hidden sm:inline">สิ่งที่ชอบ</span>
                {mounted && wishlistCount > 0 ? (
                  <span
                    className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white shadow-xs"
                    aria-hidden="true"
                  >
                    {wishlistCount}
                  </span>
                ) : null}
              </Link>
            ) : null}

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
                          href="/wishlist"
                          role="menuitem"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center justify-between rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                          <span className="flex items-center gap-2">
                            <Heart size={14} className="text-red-500" />
                            <span>สิ่งที่ชอบ (Wishlist)</span>
                          </span>
                          {wishlistCount > 0 ? (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black text-red-700 dark:bg-red-950/60 dark:text-red-300">
                              {wishlistCount}
                            </span>
                          ) : null}
                        </Link>
                      )}

                      {isCustomer && (
                        <Link
                          href="/rewards"
                          role="menuitem"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center justify-between rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                          <span className="flex items-center gap-2">
                            <PointBadge size="xs" />
                            <span>สะสมแต้มแลกรางวัล</span>
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black text-blue-700 border border-blue-200/60 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900/60">
                            {userPoints.toLocaleString("th-TH")} แต้ม
                          </span>
                        </Link>
                      )}

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

        {mobileSearchOpen && (isCustomer || isAdmin) ? (
          <div className="border-t border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950 md:hidden">
            <form
              onSubmit={handleSearchSubmit}
              className="relative"
              role="search"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setSearchFocused(false);
                }
              }}
            >
              <div className="relative flex items-center">
                <Search size={15} className="pointer-events-none absolute left-3 text-slate-400 dark:text-zinc-500" aria-hidden="true" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onKeyDown={handleSearchSuggestionKeyDown}
                  placeholder="ค้นหาสินค้า ชื่อเรื่อง หรือรหัส..."
                  aria-label="ค้นหาสินค้าในร้าน"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={searchFocused && searchQuery.trim().length >= 2}
                  aria-controls="mobile-product-search-suggestions"
                  aria-activedescendant={activeSuggestionIndex >= 0 ? `mobile-product-search-suggestions-option-${activeSuggestionIndex}` : undefined}
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-9 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                />
                {searchQuery ? (
                  <button type="button" onClick={() => setSearchQuery("")} aria-label="ล้างการค้นหา" className="absolute right-2.5 text-slate-400 hover:text-slate-600 dark:text-zinc-400 dark:hover:text-zinc-200">
                    <X size={14} aria-hidden="true" />
                  </button>
                ) : null}
              </div>
              <SearchSuggestionList
                id="mobile-product-search-suggestions"
                query={searchQuery}
                suggestions={searchSuggestions}
                loading={searchLoading}
                activeIndex={activeSuggestionIndex}
                open={searchFocused}
                onSelect={selectSearchSuggestion}
              />
            </form>
          </div>
        ) : null}

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen ? (
          <div className="border-t border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 lg:hidden">
            <nav className="flex flex-col gap-1 text-xs font-bold">
              {isCustomer && user ? (
                <>
                  <Link
                    href="/rewards"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between whitespace-nowrap shrink-0 rounded-xl px-3 py-2 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900"
                  >
                    <span className="flex items-center gap-2">
                      <PointBadge size="xs" />
                      <span>สะสมแต้มแลกรางวัล</span>
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black text-blue-700 border border-blue-200/60 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900/60">
                      {userPoints.toLocaleString("th-TH")} แต้ม
                    </span>
                  </Link>
                  <Link
                    href="/orders"
                    onClick={() => setMobileMenuOpen(false)}
                    className="whitespace-nowrap shrink-0 rounded-xl px-3 py-2 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900"
                  >
                    ประวัติคำสั่งซื้อของฉัน
                  </Link>
                  <Link
                    href="/wishlist"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between whitespace-nowrap shrink-0 rounded-xl px-3 py-2 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900"
                  >
                    <span className="flex items-center gap-2">
                      <Heart size={14} className="text-red-500" />
                      สิ่งที่ชอบ (Wishlist)
                    </span>
                    {wishlistCount > 0 ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black text-red-700 dark:bg-red-950/60 dark:text-red-300">
                        {wishlistCount}
                      </span>
                    ) : null}
                  </Link>
                </>
              ) : null}

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

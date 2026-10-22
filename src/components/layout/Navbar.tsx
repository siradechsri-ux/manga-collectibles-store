"use client";

import ChanSasomLogo from "../brand/ChanSasomLogo";

import {
  Award,
  BookMarked,
  BookOpen,
  Boxes,
  CalendarDays,
  Check,
  ChevronDown,
  Flame,
  Heart,
  Layers,
  LogIn,
  LogOut,
  Menu,
  Package,
  Percent,
  Receipt,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Tag,
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

export type SearchCategoryFilter = "ALL" | "MANGA" | "NOVEL" | "FIGURE" | "GOODS";

export const SEARCH_CATEGORY_LABELS: Record<SearchCategoryFilter, string> = {
  ALL: "ทั้งหมด",
  MANGA: "มังงะ",
  NOVEL: "ไลท์โนเวล",
  FIGURE: "ฟิกเกอร์",
  GOODS: "ของสะสม",
};

const POPULAR_KEYWORDS = [
  "วันพีซ",
  "Frieren",
  "Jujutsu Kaisen",
  "Spy x Family",
  "Blue Lock",
  "Nendoroid",
  "กันพลา HG",
  "Flash Sale",
  "มีของแถม",
];

const RECENT_SEARCHES_KEY = "mock_recent_searches";

function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : ["Frieren", "วันพีซ", "Nendoroid"];
  } catch {
    return ["Frieren", "วันพีซ", "Nendoroid"];
  }
}

function addRecentSearch(term: string): void {
  if (typeof window === "undefined" || !term.trim()) return;
  try {
    const current = getRecentSearches();
    const updated = [term.trim(), ...current.filter((t) => t.toLowerCase() !== term.trim().toLowerCase())].slice(0, 6);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {
    // Ignore
  }
}

function clearRecentSearches(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    // Ignore
  }
}

function findProductSuggestions(
  catalog: CatalogData,
  query: string,
  categoryFilter: SearchCategoryFilter = "ALL",
): SearchSuggestion[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return [];

  const candidates: Array<{ suggestion: SearchSuggestion; searchable: string }> = [];

  if (categoryFilter === "ALL" || categoryFilter === "MANGA") {
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
  }

  if (categoryFilter === "ALL" || categoryFilter === "NOVEL") {
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
  }

  if (categoryFilter === "ALL" || categoryFilter === "FIGURE" || categoryFilter === "GOODS") {
    const collectibles = [
      ...(categoryFilter === "ALL" || categoryFilter === "FIGURE" ? [...catalog.figures, ...catalog.plamo] : []),
      ...(categoryFilter === "ALL" || categoryFilter === "GOODS" ? [...catalog.goods, ...catalog.accessories] : []),
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
  recentSearches,
  onSelectKeyword,
  onClearRecentSearches,
}: {
  id: string;
  query: string;
  suggestions: SearchSuggestion[];
  loading: boolean;
  activeIndex: number;
  open: boolean;
  onSelect: (suggestion: SearchSuggestion) => void;
  recentSearches: string[];
  onSelectKeyword: (keyword: string) => void;
  onClearRecentSearches: () => void;
}) {
  if (!open) return null;

  // When query is empty or less than 2 chars -> show Bookwalker Discovery Overlay (Popular & Recent searches)
  if (query.trim().length < 2) {
    return (
      <div
        id={id}
        className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
      >
        {/* Recent Searches Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-500 dark:text-zinc-400">
            <span>ค้นหาล่าสุด</span>
            {recentSearches.length > 0 && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onClearRecentSearches();
                }}
                className="text-[11px] font-semibold text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400"
              >
                ล้างทั้งหมด
              </button>
            )}
          </div>
          {recentSearches.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {recentSearches.map((item) => (
                <button
                  key={item}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelectKeyword(item);
                  }}
                  className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-700 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-orange-800 dark:hover:bg-zinc-800/80 dark:hover:text-orange-400"
                >
                  {item}
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-1.5 text-xs text-zinc-400 dark:text-zinc-500">ไม่มีประวัติการค้นหาล่าสุด</p>
          )}
        </div>

        {/* Popular Keywords Section (Bookwalker Style) */}
        <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-2">
            คีย์เวิร์ดยอดนิยม
          </div>
          <div className="flex flex-wrap gap-1.5">
            {POPULAR_KEYWORDS.map((kw) => (
              <button
                key={kw}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelectKeyword(kw);
                }}
                className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 shadow-2xs transition hover:border-orange-400 hover:bg-orange-50 hover:text-orange-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-orange-700 dark:hover:text-orange-300"
              >
                <Tag size={11} className="text-orange-500" />
                <span>{kw}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // When query has >= 2 characters -> show live product suggestions
  return (
    <div
      id={id}
      className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-zinc-200 bg-white py-1 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
    >
      {loading ? (
        <p className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">กำลังค้นหาสินค้า...</p>
      ) : suggestions.length > 0 ? (
        <ul role="listbox" aria-label="ผลการค้นหาสินค้า" className="max-h-96 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
          {suggestions.map((suggestion, index) => (
            <li
              id={`${id}-option-${index}`}
              key={`${suggestion.href}-${suggestion.title}`}
              role="option"
              aria-selected={activeIndex === index}
            >
              <Link
                href={suggestion.href}
                onClick={() => onSelect(suggestion)}
                className={`flex items-center gap-3 px-3.5 py-2.5 transition ${
                  activeIndex === index
                    ? "bg-orange-50 dark:bg-zinc-800"
                    : "hover:bg-zinc-50 dark:hover:bg-zinc-800"
                }`}
              >
                {suggestion.image ? (
                  <img
                    src={suggestion.image}
                    alt=""
                    className="h-12 w-9 shrink-0 rounded-md border border-zinc-200 object-cover dark:border-zinc-700"
                  />
                ) : (
                  <span className="h-12 w-9 shrink-0 rounded-md bg-zinc-100 dark:bg-zinc-800" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    {suggestion.title}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                    {suggestion.detail}
                  </span>
                </span>
                <span className="shrink-0 rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {suggestion.category}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">
          ไม่พบสินค้าที่ตรงกับ “{query.trim()}”
        </p>
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
  const [searchCategory, setSearchCategory] = useState<SearchCategoryFilter>("ALL");
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [searchCategoryMenuOpen, setSearchCategoryMenuOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const adminDropdownRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const searchCategoryMenuRef = useRef<HTMLDivElement>(null);
  const searchCatalogRef = useRef<CatalogData | null>(null);
  const searchCatalogRequestRef = useRef<Promise<CatalogData> | null>(null);

  // Sync user points and search query from URL if available
  useEffect(() => {
    setMounted(true);
    setUserPoints(getUserPoints());
    setRecentSearches(getRecentSearches());
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
            setSearchSuggestions(findProductSuggestions(catalog, query, searchCategory));
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
  }, [searchFocused, searchQuery, searchCategory]);

  // Handle clicking outside of dropdown menus
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
      if (adminDropdownRef.current && !adminDropdownRef.current.contains(target)) {
        setAdminDropdownOpen(false);
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(target)) {
        setCategoryDropdownOpen(false);
      }
      if (searchCategoryMenuRef.current && !searchCategoryMenuRef.current.contains(target)) {
        setSearchCategoryMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setUserMenuOpen(false);
        setAdminDropdownOpen(false);
        setCategoryDropdownOpen(false);
        setSearchCategoryMenuOpen(false);
        setMobileMenuOpen(false);
        setSearchFocused(false);
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
    if (!query) return;
    addRecentSearch(query);
    setRecentSearches(getRecentSearches());
    const suggestion = searchSuggestions[activeSuggestionIndex] ?? searchSuggestions[0];
    if (suggestion) {
      router.push(suggestion.href);
    } else {
      router.push(`/collections/manga?q=${encodeURIComponent(query)}`);
    }
    setSearchFocused(false);
    setMobileMenuOpen(false);
    setMobileSearchOpen(false);
  }

  function handleSelectKeyword(keyword: string): void {
    addRecentSearch(keyword);
    setRecentSearches(getRecentSearches());
    setSearchQuery(keyword);
    setSearchFocused(false);
    setMobileMenuOpen(false);
    setMobileSearchOpen(false);
    router.push(`/collections/manga?q=${encodeURIComponent(keyword)}`);
  }

  function handleClearRecentSearches(): void {
    clearRecentSearches();
    setRecentSearches([]);
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
    addRecentSearch(suggestion.title);
    setRecentSearches(getRecentSearches());
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
        {/* ===================== [ROW 1]: Main Header (Logo, Big Search Bar, Main Actions) ===================== */}
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:gap-6 lg:px-8">
          {/* Logo (Left) */}
          <div className="flex shrink-0 items-center">
            <ChanSasomLogo href="/" size="md" />
          </div>

          {/* Center: Large, Spacious Search Bar (Bookwalker Style) for Customer & Admin, or Role Header for Staff & Finance */}
          {(isCustomer || isAdmin) ? (
            <div className="hidden min-w-0 flex-1 max-w-2xl items-center md:flex">
              <form
                onSubmit={handleSearchSubmit}
                className="relative w-full"
                role="search"
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    setSearchFocused(false);
                    setSearchCategoryMenuOpen(false);
                  }
                }}
              >
                <div className="flex h-10 w-full items-center rounded-2xl border border-zinc-300 bg-white shadow-2xs transition focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 dark:border-zinc-700 dark:bg-zinc-900">
                  {/* Category Dropdown Prefix inside Search Bar */}
                  <div className="relative shrink-0 border-r border-zinc-200 dark:border-zinc-700" ref={searchCategoryMenuRef}>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchCategoryMenuOpen((prev) => {
                          const next = !prev;
                          if (next) setSearchFocused(false);
                          return next;
                        });
                      }}
                      className="flex h-9 items-center gap-1.5 pl-3 pr-2.5 text-xs font-bold text-zinc-700 hover:text-orange-600 dark:text-zinc-200 dark:hover:text-orange-400 transition"
                      aria-label="เลือกหมวดหมู่ค้นหา"
                      aria-expanded={searchCategoryMenuOpen}
                    >
                      <span>{SEARCH_CATEGORY_LABELS[searchCategory]}</span>
                      <ChevronDown
                        size={11}
                        className={`text-zinc-400 transition-transform duration-200 ${searchCategoryMenuOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    {searchCategoryMenuOpen && (
                      <div
                        role="menu"
                        className="absolute left-0 top-[calc(100%+0.35rem)] z-[60] w-36 overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
                      >
                        {(Object.keys(SEARCH_CATEGORY_LABELS) as SearchCategoryFilter[]).map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              setSearchCategory(cat);
                              setSearchCategoryMenuOpen(false);
                            }}
                            className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold transition ${
                              searchCategory === cat
                                ? "bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 font-black"
                                : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            }`}
                          >
                            <span>{SEARCH_CATEGORY_LABELS[cat]}</span>
                            {searchCategory === cat && (
                              <Check size={12} className="text-orange-600 dark:text-orange-400" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Search Input Field */}
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => {
                      setSearchFocused(true);
                      setSearchCategoryMenuOpen(false);
                    }}
                    onClick={() => setSearchCategoryMenuOpen(false)}
                    onKeyDown={handleSearchSuggestionKeyDown}
                    placeholder="ค้นหาชื่อเรื่อง, สินค้า, ตัวละคร หรือ ISBN..."
                    aria-label="ค้นหาสินค้าในร้าน"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={searchFocused && !searchCategoryMenuOpen}
                    aria-controls="desktop-product-search-suggestions"
                    aria-activedescendant={activeSuggestionIndex >= 0 ? `desktop-product-search-suggestions-option-${activeSuggestionIndex}` : undefined}
                    className="h-full flex-1 bg-transparent px-3 text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500"
                  />

                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      aria-label="ล้างการค้นหา"
                      className="px-2 text-zinc-400 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-200"
                    >
                      <X size={14} />
                    </button>
                  ) : null}

                  {/* Search Magnifier Button */}
                  <button
                    type="submit"
                    className="flex h-full items-center justify-center rounded-r-2xl px-3.5 text-zinc-500 hover:text-orange-600 dark:text-zinc-400 dark:hover:text-orange-400 transition"
                    aria-label="ค้นหา"
                  >
                    <Search size={16} />
                  </button>
                </div>

                <SearchSuggestionList
                  id="desktop-product-search-suggestions"
                  query={searchQuery}
                  suggestions={searchSuggestions}
                  loading={searchLoading}
                  activeIndex={activeSuggestionIndex}
                  open={searchFocused && !searchCategoryMenuOpen}
                  onSelect={selectSearchSuggestion}
                  recentSearches={recentSearches}
                  onSelectKeyword={handleSelectKeyword}
                  onClearRecentSearches={handleClearRecentSearches}
                />
              </form>
            </div>
          ) : isStaff ? (
            <div className="hidden min-w-0 flex-1 max-w-2xl items-center justify-center md:flex">
              <div className="flex items-center gap-2 rounded-xl border border-indigo-200/80 bg-indigo-50/80 px-3.5 py-1.5 text-xs font-black text-indigo-900 shadow-2xs dark:border-indigo-900/60 dark:bg-indigo-950/60 dark:text-indigo-300">
                <Truck size={15} className="text-indigo-600 dark:text-indigo-400" />
                <span>ระบบจัดการคลังและแพ็คสินค้า (Warehouse & Logistics Workspace)</span>
              </div>
            </div>
          ) : isFinance ? (
            <div className="hidden min-w-0 flex-1 max-w-2xl items-center justify-center md:flex">
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-3.5 py-1.5 text-xs font-black text-emerald-900 shadow-2xs dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300">
                <Receipt size={15} className="text-emerald-600 dark:text-emerald-400" />
                <span>ระบบตรวจสอบการเงินและภาษี (Finance & Slips Verification)</span>
              </div>
            </div>
          ) : (
            <div className="flex-1" />
          )}

          {/* Right Action Buttons */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {/* Mobile Search Button */}
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
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900 md:hidden"
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
                    : "border-zinc-200 bg-white text-zinc-800 hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-blue-500 dark:hover:bg-zinc-800"
                }`}
              >
                <PointBadge size="sm" />
                <span className="hidden xl:inline">
                  {mounted ? userPoints.toLocaleString("th-TH") : 0} P
                </span>
              </Link>
            ) : null}

            {/* Wishlist Link Button (Customer only) */}
            {isCustomer ? (
              <Link
                href="/wishlist"
                aria-label={`รายการที่ถูกใจ (${mounted ? wishlistCount : 0} ชิ้น)`}
                className="relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-2.5 text-xs font-bold text-zinc-800 shadow-2xs transition hover:border-rose-300 hover:bg-rose-50/50 hover:text-rose-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-rose-800 dark:hover:bg-zinc-800"
              >
                <Heart
                  size={16}
                  className={mounted && wishlistCount > 0 ? "fill-rose-500 text-rose-500" : ""}
                  aria-hidden="true"
                />
                <span className="hidden xl:inline">สิ่งที่ชอบ</span>
                {mounted && wishlistCount > 0 ? (
                  <span
                    className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-black text-white shadow-xs"
                    aria-hidden="true"
                  >
                    {wishlistCount}
                  </span>
                ) : null}
              </Link>
            ) : null}

            {/* Cart Button (CUSTOMER only) */}
            {isCustomer ? (
              <button
                id="navbar-cart-button"
                type="button"
                onClick={() => setCartDrawerOpen(true)}
                aria-label={`เปิดตะกร้าสินค้า (${mounted ? itemCount : 0} ชิ้น)`}
                className="relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-zinc-950 px-3 text-xs font-bold text-white shadow-xs transition hover:bg-orange-600 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-orange-500 dark:hover:text-white"
              >
                <ShoppingBag size={15} aria-hidden="true" />
                <span className="hidden sm:inline">ตะกร้า</span>
                {mounted && itemCount > 0 ? (
                  <span
                    className="flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-600 px-1 text-[9px] font-black text-white shadow-xs dark:bg-orange-500"
                    aria-hidden="true"
                  >
                    {itemCount}
                  </span>
                ) : null}
              </button>
            ) : null}

            {/* Theme Toggle */}
            <div className="shrink-0">
              <ThemeToggle />
            </div>

            {/* Single Profile Button / Login */}
            {mounted && user ? (
              <div className="relative shrink-0" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((prev) => !prev)}
                  aria-expanded={userMenuOpen}
                  aria-haspopup="menu"
                  aria-label={`โปรไฟล์ผู้ใช้: ${roleConfig.label}`}
                  className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-2.5 text-xs font-bold text-zinc-800 shadow-2xs transition hover:border-orange-400 hover:bg-orange-50/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-orange-800 dark:hover:bg-zinc-800"
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
                    size={12}
                    aria-hidden="true"
                    className={`transition-transform duration-200 ${userMenuOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {userMenuOpen ? (
                  <div
                    role="menu"
                    aria-label="เมนูผู้ใช้งาน"
                    className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-60 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-xl shadow-zinc-900/10 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    {/* Header info */}
                    <div className="border-b border-zinc-100 px-3 py-2.5 dark:border-zinc-800">
                      <p className="truncate text-xs font-black text-zinc-900 dark:text-zinc-100">
                        {user.fullName}
                      </p>
                      <p className="truncate text-[10px] text-zinc-500 dark:text-zinc-400">
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
                        className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        <User size={14} /> ข้อมูลโปรไฟล์
                      </Link>

                      {isCustomer && (
                        <Link
                          href="/wishlist"
                          role="menuitem"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center justify-between rounded-xl px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                          <span className="flex items-center gap-2">
                            <Heart size={14} className="text-rose-500" />
                            <span>สิ่งที่ชอบ (Wishlist)</span>
                          </span>
                          {wishlistCount > 0 ? (
                            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
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
                          className="flex items-center justify-between rounded-xl px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
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
                          href="/calendar"
                          role="menuitem"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                          <CalendarDays size={14} className="text-orange-600 dark:text-orange-400" />
                          <span>ตารางออกใหม่ประจำเดือน</span>
                        </Link>
                      )}

                      {isCustomer && (
                        <Link
                          href="/kuji"
                          role="menuitem"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                          <Sparkles size={14} className="text-amber-600 dark:text-amber-400" />
                          <span>จับฉลาก Kuji (ลุ้นรางวัล)</span>
                        </Link>
                      )}

                      {isCustomer && (
                        <Link
                          href="/orders"
                          role="menuitem"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
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
                            className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
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
                                : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
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
                                : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
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
                            className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                          >
                            <Boxes size={14} /> จัดการสินค้า (CRUD)
                          </Link>
                          <Link
                            href="/staff/packing"
                            role="menuitem"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                          >
                            <Truck size={14} /> จัดเตรียมพัสดุ
                          </Link>
                          <Link
                            href="/finance/slips"
                            role="menuitem"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                          >
                            <Receipt size={14} /> ตรวจสลิป
                          </Link>
                          <Link
                            href="/finance/tax"
                            role="menuitem"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                          >
                            <TrendingUp size={14} /> รายงานภาษี & e-Tax
                          </Link>
                          <Link
                            href="/admin/promotions"
                            role="menuitem"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/40"
                          >
                            <Percent size={14} /> โปรโมชั่น & แฟลชเซลล์
                          </Link>
                        </>
                      )}

                      <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />

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
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-zinc-950 px-3 text-xs font-bold text-white transition hover:bg-orange-600 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-orange-500 dark:hover:text-white"
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
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900 lg:hidden"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* ===================== [ROW 2]: Role-Based Sub-Navigation Bar ===================== */}
        <div className="relative border-t border-zinc-200/70 bg-zinc-50/80 dark:border-zinc-800/70 dark:bg-zinc-900/40">
          <div className="relative mx-auto flex min-h-10 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            {/* 1. CUSTOMER: Full Store Discovery Links & Activity Features */}
            {isCustomer && (
              <nav className="flex flex-1 items-center justify-between gap-2 py-1 text-xs font-bold text-zinc-700 dark:text-zinc-300 overflow-x-auto scrollbar-none">
                <div className="flex items-center gap-1 shrink-0">
                  {/* Manga */}
                  <Link
                    href="/collections/manga"
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 transition ${
                      pathname === "/collections/manga"
                        ? "bg-zinc-200/80 font-black text-zinc-950 dark:bg-zinc-800 dark:text-zinc-50"
                        : "hover:bg-zinc-200/60 hover:text-zinc-950 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100"
                    }`}
                  >
                    <BookOpen size={13} className="text-orange-600 dark:text-orange-400" />
                    <span>มังงะ</span>
                  </Link>

                  {/* Light Novel */}
                  <Link
                    href="/collections/light-novel"
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 transition ${
                      pathname === "/collections/light-novel"
                        ? "bg-zinc-200/80 font-black text-zinc-950 dark:bg-zinc-800 dark:text-zinc-50"
                        : "hover:bg-zinc-200/60 hover:text-zinc-950 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100"
                    }`}
                  >
                    <BookMarked size={13} className="text-sky-600 dark:text-sky-400" />
                    <span>ไลท์โนเวล</span>
                  </Link>

                  {/* Figures */}
                  <Link
                    href="/collections/figures"
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 transition ${
                      pathname === "/collections/figures"
                        ? "bg-zinc-200/80 font-black text-zinc-950 dark:bg-zinc-800 dark:text-zinc-50"
                        : "hover:bg-zinc-200/60 hover:text-zinc-950 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100"
                    }`}
                  >
                    <Boxes size={13} className="text-blue-600 dark:text-blue-400" />
                    <span>ฟิกเกอร์</span>
                  </Link>

                  {/* Plamo */}
                  <Link
                    href="/collections/plamo"
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 transition ${
                      pathname === "/collections/plamo"
                        ? "bg-zinc-200/80 font-black text-zinc-950 dark:bg-zinc-800 dark:text-zinc-50"
                        : "hover:bg-zinc-200/60 hover:text-zinc-950 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100"
                    }`}
                  >
                    <Layers size={13} className="text-indigo-600 dark:text-indigo-400" />
                    <span>กันพลา / พลาโม</span>
                  </Link>

                  {/* Goods */}
                  <Link
                    href="/collections/goods"
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 transition ${
                      pathname === "/collections/goods"
                        ? "bg-zinc-200/80 font-black text-zinc-950 dark:bg-zinc-800 dark:text-zinc-50"
                        : "hover:bg-zinc-200/60 hover:text-zinc-950 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100"
                    }`}
                  >
                    <Package size={13} className="text-emerald-600 dark:text-emerald-400" />
                    <span>ของสะสม</span>
                  </Link>

                  {/* Accessories */}
                  <Link
                    href="/collections/accessories"
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 transition ${
                      pathname === "/collections/accessories"
                        ? "bg-zinc-200/80 font-black text-zinc-950 dark:bg-zinc-800 dark:text-zinc-50"
                        : "hover:bg-zinc-200/60 hover:text-zinc-950 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100"
                    }`}
                  >
                    <Sparkles size={13} className="text-teal-600 dark:text-teal-400" />
                    <span>อุปกรณ์ดูแล</span>
                  </Link>

                  {/* Category Mega Dropdown Menu */}
                  <div className="relative shrink-0" ref={categoryDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setCategoryDropdownOpen((prev) => !prev)}
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                        categoryDropdownOpen
                          ? "bg-purple-100 text-purple-900 font-black dark:bg-purple-950/80 dark:text-purple-200 shadow-2xs"
                          : "text-zinc-700 hover:bg-zinc-200/60 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100"
                      }`}
                      aria-expanded={categoryDropdownOpen}
                      aria-haspopup="menu"
                    >
                      <Layers size={13} className="text-purple-600 dark:text-purple-400" />
                      <span>หมวดทั้งหมด</span>
                      <ChevronDown
                        size={11}
                        className={`transition-transform duration-200 ${categoryDropdownOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    {categoryDropdownOpen && (
                      <div
                        role="menu"
                        className="absolute left-0 top-full mt-2 z-50 w-80 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-3 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 animate-in fade-in zoom-in-95 duration-100"
                      >
                        <div className="grid gap-2.5 text-xs">
                          {/* Books & Manga */}
                          <div className="border-b border-zinc-100 pb-2 dark:border-zinc-800">
                            <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                              หนังสือ & มังงะ (Books & Comics)
                            </p>
                            <div className="mt-1.5 space-y-1">
                              <Link
                                href="/collections/manga"
                                onClick={() => setCategoryDropdownOpen(false)}
                                className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-zinc-700 hover:bg-orange-50 hover:text-orange-700 dark:text-zinc-200 dark:hover:bg-orange-950/40 dark:hover:text-orange-300 font-semibold transition"
                              >
                                <span className="flex items-center gap-2">
                                  <BookOpen size={13} className="text-orange-600" />
                                  <span>มังงะแปลไทยลิขสิทธิ์</span>
                                </span>
                                <span className="text-[10px] font-bold text-zinc-400">Manga</span>
                              </Link>
                              <Link
                                href="/collections/light-novel"
                                onClick={() => setCategoryDropdownOpen(false)}
                                className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-zinc-700 hover:bg-orange-50 hover:text-orange-700 dark:text-zinc-200 dark:hover:bg-orange-950/40 dark:hover:text-orange-300 font-semibold transition"
                              >
                                <span className="flex items-center gap-2">
                                  <BookOpen size={13} className="text-amber-600" />
                                  <span>ไลท์โนเวลแปลไทย</span>
                                </span>
                                <span className="text-[10px] font-bold text-zinc-400">Light Novel</span>
                              </Link>
                            </div>
                          </div>

                          {/* Figures & Hobby */}
                          <div className="border-b border-zinc-100 pb-2 dark:border-zinc-800">
                            <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                              ฟิกเกอร์ & ของสะสม (Figures & Goods)
                            </p>
                            <div className="mt-1.5 space-y-1">
                              <Link
                                href="/collections/figures"
                                onClick={() => setCategoryDropdownOpen(false)}
                                className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-zinc-700 hover:bg-blue-50 hover:text-blue-700 dark:text-zinc-200 dark:hover:bg-blue-950/40 dark:hover:text-blue-300 font-semibold transition"
                              >
                                <span className="flex items-center gap-2">
                                  <Boxes size={13} className="text-blue-600" />
                                  <span>สเกลฟิกเกอร์ & Nendoroid</span>
                                </span>
                                <span className="text-[10px] font-bold text-zinc-400">Figures</span>
                              </Link>
                              <Link
                                href="/collections/plamo"
                                onClick={() => setCategoryDropdownOpen(false)}
                                className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-zinc-700 hover:bg-blue-50 hover:text-blue-700 dark:text-zinc-200 dark:hover:bg-blue-950/40 dark:hover:text-blue-300 font-semibold transition"
                              >
                                <span className="flex items-center gap-2">
                                  <Layers size={13} className="text-indigo-600" />
                                  <span>กันพลา & พลาโมเดล</span>
                                </span>
                                <span className="text-[10px] font-bold text-zinc-400">Gunpla</span>
                              </Link>
                              <Link
                                href="/collections/goods"
                                onClick={() => setCategoryDropdownOpen(false)}
                                className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-zinc-700 hover:bg-emerald-50 hover:text-emerald-700 dark:text-zinc-200 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300 font-semibold transition"
                              >
                                <span className="flex items-center gap-2">
                                  <Package size={13} className="text-emerald-600" />
                                  <span>สแตนดี้ & พวงกุญแจกู๊ดส์</span>
                                </span>
                                <span className="text-[10px] font-bold text-zinc-400">Goods</span>
                              </Link>
                              <Link
                                href="/collections/accessories"
                                onClick={() => setCategoryDropdownOpen(false)}
                                className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-zinc-700 hover:bg-emerald-50 hover:text-emerald-700 dark:text-zinc-200 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300 font-semibold transition"
                              >
                                <span className="flex items-center gap-2">
                                  <Sparkles size={13} className="text-teal-600" />
                                  <span>ซองแก้ว & อุปกรณ์ถนอมมังงะ</span>
                                </span>
                                <span className="text-[10px] font-bold text-zinc-400">Care</span>
                              </Link>
                            </div>
                          </div>

                          {/* Best Sellers shortcut */}
                          <div>
                            <Link
                              href="/collections/manga?filter=best-seller"
                              onClick={() => setCategoryDropdownOpen(false)}
                              className="flex items-center justify-between rounded-lg bg-rose-50 px-2.5 py-2 font-bold text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/70 transition"
                            >
                              <span className="flex items-center gap-1.5">
                                <Flame size={14} className="text-rose-600 dark:text-rose-400" />
                                <span>ดูสินค้าขายดีติดอันดับทั้งหมด</span>
                              </span>
                              <span>→</span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                                  </div>

                {/* Right Feature Shortcuts */}
                <div className="flex items-center gap-1 shrink-0">
                  <span className="hidden h-3.5 w-px bg-zinc-300 dark:bg-zinc-700 sm:inline-block mx-0.5" />

                  {/* Best Sellers */}
                  <Link
                    href="/collections/manga?filter=best-seller"
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 transition ${
                      pathname.includes("filter=best-seller")
                        ? "bg-rose-100 text-rose-800 font-black dark:bg-rose-950/70 dark:text-rose-300"
                        : "hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                    }`}
                  >
                    <Flame size={13} className="text-rose-600 dark:text-rose-400" />
                    <span>สินค้าขายดี</span>
                  </Link>

                  {/* Release Calendar */}
                  <Link
                    href="/calendar"
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 transition ${
                      pathname === "/calendar"
                        ? "bg-orange-100 text-orange-800 font-black dark:bg-orange-950/70 dark:text-orange-300"
                        : "hover:bg-orange-50 hover:text-orange-700 dark:hover:bg-orange-950/40 dark:hover:text-orange-400"
                    }`}
                  >
                    <CalendarDays size={13} className="text-orange-600 dark:text-orange-400" />
                    <span>ตารางออกใหม่</span>
                  </Link>

                  {/* Kuji Lucky Draw */}
                  <Link
                    href="/kuji"
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 transition ${
                      pathname === "/kuji"
                        ? "bg-amber-100 text-amber-800 font-black dark:bg-amber-950/70 dark:text-amber-300"
                        : "hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950/40 dark:hover:text-amber-400"
                    }`}
                  >
                    <Sparkles size={13} className="text-amber-500" />
                    <span>จับฉลาก Kuji</span>
                  </Link>

                  {/* Rewards Points Redemption */}
                  <Link
                    href="/rewards"
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 transition ${
                      pathname === "/rewards"
                        ? "bg-blue-100 text-blue-800 font-black dark:bg-blue-950/70 dark:text-blue-300"
                        : "hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/40 dark:hover:text-blue-400"
                    }`}
                  >
                    <Award size={13} className="text-blue-600 dark:text-blue-400" />
                    <span>แลกของรางวัล</span>
                  </Link>
                </div>
              </nav>
            )}

            {/* 2. STAFF: Warehouse Operations Bar */}
            {isStaff && (
              <>
                <nav className="flex items-center gap-1 sm:gap-2 py-1 text-xs font-bold">
                  <Link
                    href="/staff/packing"
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 transition ${
                      pathname.startsWith("/staff/packing")
                        ? "bg-indigo-100 text-indigo-900 font-black dark:bg-indigo-950 dark:text-indigo-200"
                        : "text-zinc-700 hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    <Truck size={14} className="text-indigo-600 dark:text-indigo-400" />
                    <span>จัดเตรียมพัสดุ (Packing)</span>
                  </Link>
                  <Link
                    href="/admin/products"
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 transition ${
                      pathname.startsWith("/admin/products")
                        ? "bg-indigo-100 text-indigo-900 font-black dark:bg-indigo-950 dark:text-indigo-200"
                        : "text-zinc-700 hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    <Boxes size={14} className="text-indigo-600 dark:text-indigo-400" />
                    <span>ตรวจเช็กสต็อกสินค้า</span>
                  </Link>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/60 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/60 transition"
                  >
                    <Store size={14} />
                    <span>ดูหน้าเว็บไซต์ร้านค้า</span>
                  </Link>
                </nav>
                <div className="hidden lg:flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-black text-indigo-700 border border-indigo-200/60 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-900/60">
                  <Package size={12} />
                  <span>เจ้าหน้าที่คลังสินค้า (Staff Workspace)</span>
                </div>
              </>
            )}

            {/* 3. FINANCE: Slips & Tax Reports Bar */}
            {isFinance && (
              <>
                <nav className="flex items-center gap-1 sm:gap-2 py-1 text-xs font-bold">
                  <Link
                    href="/finance/slips"
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 transition ${
                      pathname.startsWith("/finance/slips")
                        ? "bg-emerald-100 text-emerald-900 font-black dark:bg-emerald-950 dark:text-emerald-200"
                        : "text-zinc-700 hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    <Receipt size={14} className="text-emerald-600 dark:text-emerald-400" />
                    <span>ตรวจสอบสลิปโอนเงิน (Slips)</span>
                  </Link>
                  <Link
                    href="/finance/tax"
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 transition ${
                      pathname.startsWith("/finance/tax")
                        ? "bg-emerald-100 text-emerald-900 font-black dark:bg-emerald-950 dark:text-emerald-200"
                        : "text-zinc-700 hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    <TrendingUp size={14} className="text-emerald-600 dark:text-emerald-400" />
                    <span>รายงานภาษี & e-Tax</span>
                  </Link>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/60 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/60 transition"
                  >
                    <Store size={14} />
                    <span>ดูหน้าเว็บไซต์ร้านค้า</span>
                  </Link>
                </nav>
                <div className="hidden lg:flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-black text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900/60">
                  <Wallet size={12} />
                  <span>ฝ่ายการเงินและบัญชี (Finance Workspace)</span>
                </div>
              </>
            )}

            {/* 4. ADMIN: Central Admin Management Bar */}
            {isAdmin && (
              <>
                <nav className="flex items-center gap-1 sm:gap-1.5 py-1 text-xs font-bold">
                  <Link
                    href="/admin"
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition ${
                      pathname === "/admin"
                        ? "bg-purple-100 text-purple-900 font-black dark:bg-purple-950 dark:text-purple-200"
                        : "text-zinc-700 hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    <Store size={13} className="text-purple-600 dark:text-purple-400" />
                    <span>แดชบอร์ด (/admin)</span>
                  </Link>

                  <Link
                    href="/admin/products"
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition ${
                      pathname.startsWith("/admin/products")
                        ? "bg-purple-100 text-purple-900 font-black dark:bg-purple-950 dark:text-purple-200"
                        : "text-zinc-700 hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    <Boxes size={13} className="text-orange-600 dark:text-orange-400" />
                    <span>จัดการสินค้า (CRUD)</span>
                  </Link>

                  <Link
                    href="/admin/promotions"
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition ${
                      pathname.startsWith("/admin/promotions")
                        ? "bg-rose-100 text-rose-900 font-black dark:bg-rose-950 dark:text-rose-200"
                        : "text-zinc-700 hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    <Percent size={13} className="text-rose-600 dark:text-rose-400" />
                    <span>โปรโมชั่น & แฟลชเซลล์</span>
                  </Link>

                  <Link
                    href="/admin/calendar"
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition ${
                      pathname.startsWith("/admin/calendar")
                        ? "bg-orange-100 text-orange-900 font-black dark:bg-orange-950 dark:text-orange-200"
                        : "text-zinc-700 hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    <CalendarDays size={13} className="text-orange-600 dark:text-orange-400" />
                    <span>จัดการตารางออกใหม่</span>
                  </Link>

                  <Link
                    href="/admin/kuji"
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition ${
                      pathname.startsWith("/admin/kuji")
                        ? "bg-amber-100 text-amber-900 font-black dark:bg-amber-950 dark:text-amber-200"
                        : "text-zinc-700 hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    <Sparkles size={13} className="text-amber-500" />
                    <span>จัดการตู้ Kuji</span>
                  </Link>

                  {/* Admin Backoffice Operations Dropdown */}
                  <div className="relative shrink-0" ref={adminDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setAdminDropdownOpen((prev) => !prev)}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold text-zinc-700 hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:bg-zinc-800/60 transition"
                      aria-expanded={adminDropdownOpen}
                      aria-haspopup="menu"
                    >
                      <Layers size={13} className="text-indigo-600 dark:text-indigo-400" />
                      <span>งานพัสดุ & บัญชี</span>
                      <ChevronDown size={11} className={`transition-transform duration-200 ${adminDropdownOpen ? "rotate-180" : ""}`} />
                    </button>

                    {adminDropdownOpen && (
                      <div
                        role="menu"
                        className="absolute left-0 top-full mt-2 z-50 w-56 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 animate-in fade-in zoom-in-95 duration-100"
                      >
                        <Link
                          href="/staff/packing"
                          role="menuitem"
                          onClick={() => setAdminDropdownOpen(false)}
                          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800 transition"
                        >
                          <Truck size={14} className="text-indigo-600 dark:text-indigo-400" />
                          <span>จัดเตรียมพัสดุ (Packing)</span>
                        </Link>
                        <Link
                          href="/finance/slips"
                          role="menuitem"
                          onClick={() => setAdminDropdownOpen(false)}
                          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800 transition"
                        >
                          <Receipt size={14} className="text-emerald-600 dark:text-emerald-400" />
                          <span>ตรวจสอบสลิป (Slips)</span>
                        </Link>
                        <Link
                          href="/finance/tax"
                          role="menuitem"
                          onClick={() => setAdminDropdownOpen(false)}
                          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800 transition"
                        >
                          <TrendingUp size={14} className="text-emerald-600 dark:text-emerald-400" />
                          <span>รายงานภาษี & e-Tax</span>
                        </Link>
                      </div>
                    )}
                  </div>

                  <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/60 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/60 transition"
                  >
                    <ShoppingBag size={13} />
                    <span>ไปหน้าร้านค้า</span>
                  </Link>
                </nav>

                <div className="hidden lg:flex items-center gap-1.5 rounded-full bg-purple-50 px-2.5 py-0.5 text-[11px] font-black text-purple-700 border border-purple-200/60 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-900/60">
                  <ShieldCheck size={12} />
                  <span>ผู้ดูแลระบบ (Admin)</span>
                </div>
              </>
            )}
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
                  aria-expanded={searchFocused}
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
                onSelect={(suggestion) => {
                  selectSearchSuggestion(suggestion);
                  setMobileSearchOpen(false);
                }}
                recentSearches={recentSearches}
                onSelectKeyword={(kw) => {
                  setSearchQuery(kw);
                  addRecentSearch(kw);
                  setRecentSearches(getRecentSearches());
                  setMobileSearchOpen(false);
                  router.push(`/collections/manga?search=${encodeURIComponent(kw)}`);
                }}
                onClearRecentSearches={() => {
                  clearRecentSearches();
                  setRecentSearches([]);
                }}
              />
            </form>
          </div>
        ) : null}

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen ? (
          <div className="border-t border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 lg:hidden">
            <nav className="flex flex-col gap-1 text-xs font-bold">
              {/* Quick Category Grid for Customer */}
              {isCustomer && (
                <>
                  <div className="grid grid-cols-2 gap-2 pb-2">
                    <Link
                      href="/collections/manga"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 rounded-xl bg-zinc-100 p-2.5 text-zinc-800 transition hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      <BookOpen size={14} className="text-orange-600" />
                      <span>มังงะ & LN</span>
                    </Link>
                    <Link
                      href="/collections/figures"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 rounded-xl bg-zinc-100 p-2.5 text-zinc-800 transition hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      <Boxes size={14} className="text-blue-600" />
                      <span>ฟิกเกอร์</span>
                    </Link>
                    <Link
                      href="/collections/goods"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 rounded-xl bg-zinc-100 p-2.5 text-zinc-800 transition hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      <Package size={14} className="text-emerald-600" />
                      <span>ของสะสม</span>
                    </Link>
                    <Link
                      href="/#flash-sale"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 rounded-xl bg-orange-500/10 p-2.5 font-black text-orange-600 transition hover:bg-orange-500/20 dark:bg-orange-950/40 dark:text-orange-400"
                    >
                      <Percent size={14} />
                      <span>โปรโมชัน</span>
                    </Link>
                  </div>
                  <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
                </>
              )}

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
                    href="/collections/manga?filter=best-seller"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 whitespace-nowrap shrink-0 rounded-xl px-3 py-2 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900 font-bold text-rose-700 dark:text-rose-400"
                  >
                    <Flame size={14} className="text-rose-600 dark:text-rose-400" />
                    <span>สินค้าขายดี</span>
                  </Link>
                  <Link
                    href="/calendar"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 whitespace-nowrap shrink-0 rounded-xl px-3 py-2 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900"
                  >
                    <CalendarDays size={14} className="text-orange-600 dark:text-orange-400" />
                    <span>ตารางออกใหม่ประจำเดือน</span>
                  </Link>
                  <Link
                    href="/kuji"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 whitespace-nowrap shrink-0 rounded-xl px-3 py-2 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900"
                  >
                    <Sparkles size={14} className="text-amber-600 dark:text-amber-400" />
                    <span>จับฉลาก Kuji (ลุ้นรางวัล)</span>
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
                  <Link
                    href="/admin/calendar"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`whitespace-nowrap shrink-0 rounded-xl px-3 py-2 transition ${
                      pathname === "/admin/calendar" || pathname.startsWith("/admin/calendar/")
                        ? "bg-orange-50 text-orange-700 font-bold dark:bg-orange-950/60 dark:text-orange-300"
                        : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900"
                    }`}
                  >
                    จัดการตารางออกใหม่
                  </Link>
                  <Link
                    href="/admin/kuji"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`whitespace-nowrap shrink-0 rounded-xl px-3 py-2 transition ${
                      pathname === "/admin/kuji" || pathname.startsWith("/admin/kuji/")
                        ? "bg-amber-50 text-amber-700 font-bold dark:bg-amber-950/60 dark:text-amber-300"
                        : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900"
                    }`}
                  >
                    จัดการตู้จับฉลาก Kuji
                  </Link>
                  <Link
                    href="/admin/promotions"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`whitespace-nowrap shrink-0 rounded-xl px-3 py-2 transition ${
                      pathname === "/admin/promotions" || pathname.startsWith("/admin/promotions/")
                        ? "bg-rose-50 text-rose-700 font-bold dark:bg-rose-950/60 dark:text-rose-300"
                        : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900"
                    }`}
                  >
                    จัดการโปรโมชั่น & แฟลชเซลล์
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

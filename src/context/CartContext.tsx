"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { z } from "zod";
import { validatePromoCode, type PromoCoupon } from "../utils/promo";
import { triggerFlyToCart } from "../utils/fly-to-cart";
import { AUTH_LOGOUT_EVENT, useAuth } from "../contexts/AuthContext";

export interface FigureBoxDimensions {
  widthCm: number;
  lengthCm: number;
  heightCm: number;
}

export interface MangaCartItem {
  kind: "MANGA";
  id: number;
  seriesId?: string;
  productUrl?: string;
  title: string;
  volume: number;
  variantLabel?: string;
  image?: string | null;
  coverImage?: string | null;
  imageUrl?: string | null;
  price: number;
  isPreorder: boolean;
  quantity: number;
}

export interface LightNovelCartItem {
  kind: "LIGHT_NOVEL";
  id: number;
  seriesId?: string;
  productUrl?: string;
  title: string;
  volume: number;
  variantLabel?: string;
  image?: string | null;
  coverImage?: string | null;
  imageUrl?: string | null;
  price: number;
  isPreorder: boolean;
  quantity: number;
}

export interface FigureCartItem {
  kind: "FIGURE";
  id: number;
  slug?: string;
  productUrl?: string;
  name: string;
  image?: string | null;
  coverImage?: string | null;
  imageUrl?: string | null;
  fullPrice: number;
  depositAmount: number;
  selectedPaymentType: "FULL" | "DEPOSIT";
  quantity: number;
  boxDimensions: FigureBoxDimensions;
  isReward?: boolean;
  pointsSpent?: number;
}

export interface PlamoCartItem {
  kind: "PLAMO";
  id: number;
  slug?: string;
  productUrl?: string;
  name: string;
  image?: string | null;
  coverImage?: string | null;
  imageUrl?: string | null;
  fullPrice: number;
  depositAmount: number;
  selectedPaymentType: "FULL" | "DEPOSIT";
  quantity: number;
  boxDimensions: FigureBoxDimensions;
  grade?: string;
  isReward?: boolean;
  pointsSpent?: number;
}

export interface GoodsCartItem {
  kind: "GOODS";
  id: number;
  slug?: string;
  productUrl?: string;
  name: string;
  image?: string | null;
  coverImage?: string | null;
  imageUrl?: string | null;
  fullPrice: number;
  quantity: number;
  subcategory?: string;
  isReward?: boolean;
  pointsSpent?: number;
}

export interface AccessoryCartItem {
  kind: "ACCESSORY";
  id: number;
  slug?: string;
  productUrl?: string;
  name: string;
  image?: string | null;
  coverImage?: string | null;
  imageUrl?: string | null;
  fullPrice: number;
  quantity: number;
  subcategory?: string;
  boxDimensions?: FigureBoxDimensions;
  isReward?: boolean;
  pointsSpent?: number;
}

export type CartItem =
  | MangaCartItem
  | LightNovelCartItem
  | FigureCartItem
  | PlamoCartItem
  | GoodsCartItem
  | AccessoryCartItem;

export interface CartSummary {
  itemCount: number;
  selectedItemCount: number;
  bookCount: number;
  hasBookItems: boolean;
  bookCoverAddon: boolean;
  bookCoverAddonPrice: number;
  merchandiseTotal: number;
  immediateTotal: number;
  remainingBalanceTotal: number;
  appliedPromoCode: string | null;
  appliedPromoType: PromoCoupon["type"] | null;
  promoDiscount: number;
  promoTitle: string | null;
  discountedImmediateTotal: number;
  isFreeShipping: boolean;
  isPromoFreeShipping: boolean;
}

export interface CartContextValue extends CartSummary {
  items: readonly CartItem[];
  selectedItems: readonly CartItem[];
  selectedCartItemKeys: readonly string[];
  isReady: boolean;
  addItem: (
    item: CartItem,
    triggerTarget?: React.MouseEvent | HTMLElement | { getBoundingClientRect: () => DOMRect } | null,
  ) => void;
  removeItem: (kind: CartItem["kind"], id: number) => void;
  updateQuantity: (kind: CartItem["kind"], id: number, quantity: number) => void;
  updateFigurePaymentType: (
    id: number,
    paymentType: "FULL" | "DEPOSIT",
  ) => void;
  setBookCoverAddon: (enabled: boolean) => void;
  toggleBookCoverAddon: () => void;
  applyPromoCode: (code: string) => { success: boolean; message: string };
  removePromoCode: () => void;
  clearCart: () => void;
  toggleItemSelection: (key: string) => void;
  selectAllItems: () => void;
  unselectAllItems: () => void;
  removeSelectedItems: () => void;
  removeCheckedOutItems: (keys?: string[]) => void;
  isItemSelected: (key: string) => boolean;
}

interface CartProviderProps {
  children: ReactNode;
}

const boxDimensionsSchema = z
  .object({
    widthCm: z.number().finite().positive(),
    lengthCm: z.number().finite().positive(),
    heightCm: z.number().finite().positive(),
  })
  .strict();

const mangaCartItemSchema = z
  .object({
    kind: z.literal("MANGA"),
    id: z.number().int().positive().safe(),
    seriesId: z.string().trim().min(1).max(200).optional(),
    productUrl: z.string().trim().min(1).max(300).optional(),
    title: z.string().trim().min(1).max(300),
    volume: z.number().int().positive().safe(),
    variantLabel: z.string().trim().min(1).max(150).optional(),
    image: z.string().nullable().optional(),
    coverImage: z.string().nullable().optional(),
    imageUrl: z.string().nullable().optional(),
    price: z.number().finite().positive(),
    isPreorder: z.boolean(),
    quantity: z.number().int().positive().safe(),
  })
  .strict();

const lightNovelCartItemSchema = z
  .object({
    kind: z.literal("LIGHT_NOVEL"),
    id: z.number().int().positive().safe(),
    seriesId: z.string().trim().min(1).max(200).optional(),
    productUrl: z.string().trim().min(1).max(300).optional(),
    title: z.string().trim().min(1).max(300),
    volume: z.number().int().positive().safe(),
    variantLabel: z.string().trim().min(1).max(150).optional(),
    image: z.string().nullable().optional(),
    coverImage: z.string().nullable().optional(),
    imageUrl: z.string().nullable().optional(),
    price: z.number().finite().positive(),
    isPreorder: z.boolean(),
    quantity: z.number().int().positive().safe(),
  })
  .strict();

const figureCartItemSchema = z
  .object({
    kind: z.literal("FIGURE"),
    id: z.number().int().positive().safe(),
    slug: z.string().trim().min(1).max(200).optional(),
    productUrl: z.string().trim().min(1).max(300).optional(),
    name: z.string().trim().min(1).max(300),
    image: z.string().nullable().optional(),
    coverImage: z.string().nullable().optional(),
    imageUrl: z.string().nullable().optional(),
    fullPrice: z.number().finite().nonnegative(),
    depositAmount: z.number().finite().nonnegative(),
    selectedPaymentType: z.enum(["FULL", "DEPOSIT"]),
    quantity: z.number().int().positive().safe(),
    boxDimensions: boxDimensionsSchema,
    isReward: z.boolean().optional(),
    pointsSpent: z.number().int().nonnegative().optional(),
  })
  .strict()
  .superRefine((item, context) => {
    if (!item.isReward && item.fullPrice <= 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fullPrice"],
        message: "ราคาสินค้าต้องมากกว่าศูนย์",
      });
    }
    if (
      item.selectedPaymentType === "DEPOSIT" &&
      (item.depositAmount <= 0 || item.depositAmount >= item.fullPrice)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["depositAmount"],
        message: "ยอดมัดจำต้องมากกว่าศูนย์และน้อยกว่าราคาเต็ม",
      });
    }
  });

const plamoCartItemSchema = z
  .object({
    kind: z.literal("PLAMO"),
    id: z.number().int().positive().safe(),
    slug: z.string().trim().min(1).max(200).optional(),
    productUrl: z.string().trim().min(1).max(300).optional(),
    name: z.string().trim().min(1).max(300),
    image: z.string().nullable().optional(),
    coverImage: z.string().nullable().optional(),
    imageUrl: z.string().nullable().optional(),
    fullPrice: z.number().finite().nonnegative(),
    depositAmount: z.number().finite().nonnegative(),
    selectedPaymentType: z.enum(["FULL", "DEPOSIT"]),
    quantity: z.number().int().positive().safe(),
    boxDimensions: boxDimensionsSchema,
    grade: z.string().optional(),
    isReward: z.boolean().optional(),
    pointsSpent: z.number().int().nonnegative().optional(),
  })
  .strict();

const goodsCartItemSchema = z
  .object({
    kind: z.literal("GOODS"),
    id: z.number().int().positive().safe(),
    slug: z.string().trim().min(1).max(200).optional(),
    productUrl: z.string().trim().min(1).max(300).optional(),
    name: z.string().trim().min(1).max(300),
    image: z.string().nullable().optional(),
    coverImage: z.string().nullable().optional(),
    imageUrl: z.string().nullable().optional(),
    fullPrice: z.number().finite().nonnegative(),
    quantity: z.number().int().positive().safe(),
    subcategory: z.string().optional(),
    isReward: z.boolean().optional(),
    pointsSpent: z.number().int().nonnegative().optional(),
  })
  .strict();

const accessoryCartItemSchema = z
  .object({
    kind: z.literal("ACCESSORY"),
    id: z.number().int().positive().safe(),
    slug: z.string().trim().min(1).max(200).optional(),
    productUrl: z.string().trim().min(1).max(300).optional(),
    name: z.string().trim().min(1).max(300),
    image: z.string().nullable().optional(),
    coverImage: z.string().nullable().optional(),
    imageUrl: z.string().nullable().optional(),
    fullPrice: z.number().finite().nonnegative(),
    quantity: z.number().int().positive().safe(),
    subcategory: z.string().optional(),
    boxDimensions: boxDimensionsSchema.optional(),
    isReward: z.boolean().optional(),
    pointsSpent: z.number().int().nonnegative().optional(),
  })
  .strict();

const cartItemSchema = z.discriminatedUnion("kind", [
  mangaCartItemSchema,
  lightNovelCartItemSchema,
  figureCartItemSchema,
  plamoCartItemSchema,
  goodsCartItemSchema,
  accessoryCartItemSchema,
]);

const storedCartSchema = z.array(cartItemSchema).max(100);
const CART_STORAGE_KEY = "manga-collectibles-cart-v2";
const LEGACY_CART_STORAGE_KEY = "manga-collectibles-cart-v1";
const ADDON_STORAGE_KEY = "manga-collectibles-book-cover-addon";
const SELECTED_ITEMS_STORAGE_KEY = "manga-collectibles-cart-selected-v1";
const APPLIED_PROMO_STORAGE_KEY = "manga-collectibles-cart-promo-v1";

function scopedStorageKey(base: string, scope: string): string {
  return `${base}:${scope}`;
}

function clearGuestAndLegacyCartStorage(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CART_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_CART_STORAGE_KEY);
    window.localStorage.removeItem(ADDON_STORAGE_KEY);
    window.localStorage.removeItem(SELECTED_ITEMS_STORAGE_KEY);
    window.localStorage.removeItem(APPLIED_PROMO_STORAGE_KEY);
    window.localStorage.removeItem(scopedStorageKey(CART_STORAGE_KEY, "guest"));
    window.localStorage.removeItem(scopedStorageKey(ADDON_STORAGE_KEY, "guest"));
    window.localStorage.removeItem(scopedStorageKey(SELECTED_ITEMS_STORAGE_KEY, "guest"));
    window.localStorage.removeItem(scopedStorageKey(APPLIED_PROMO_STORAGE_KEY, "guest"));
  } catch {
    // ignore storage errors
  }
}

export const BOOK_COVER_PRICE_PER_ITEM = 5;

export function getCartItemKey(item: { kind: CartItem["kind"]; id: number }): string {
  return `${item.kind}-${item.id}`;
}

export function getCartItemHref(item: CartItem): string {
  if (item.productUrl && item.productUrl.startsWith("/")) {
    return item.productUrl;
  }
  if (item.kind === "MANGA" || item.kind === "LIGHT_NOVEL") {
    return `/manga/${encodeURIComponent(item.seriesId || String(item.id))}`;
  }
  return `/figures/${encodeURIComponent(item.slug || String(item.id))}`;
}

export function isRewardCartItem(item: CartItem): boolean {
  return (
    (item.kind === "GOODS" ||
      item.kind === "FIGURE" ||
      item.kind === "PLAMO" ||
      item.kind === "ACCESSORY") &&
    Boolean(item.isReward)
  );
}

function isBookItem(item: CartItem): boolean {
  return item.kind === "MANGA" || item.kind === "LIGHT_NOVEL";
}

function getUnitFullPrice(item: CartItem): number {
  if (item.kind === "MANGA" || item.kind === "LIGHT_NOVEL") {
    return item.price;
  }
  return item.fullPrice;
}

function getUnitImmediatePrice(item: CartItem): number {
  if (item.kind === "FIGURE" || item.kind === "PLAMO") {
    if (item.selectedPaymentType === "DEPOSIT") {
      return item.depositAmount;
    }
  }
  return getUnitFullPrice(item);
}

function normalizeLegacyCartItem(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) {
    return raw;
  }
  const candidate = raw as Record<string, unknown>;
  if (candidate.kind === "MANGA") {
    const id = candidate.id;
    const title = String(candidate.title ?? "");
    if (id === 2001) {
      return { ...candidate, id: 50001 };
    }
    if (id === 2003) {
      return { ...candidate, id: 1001 };
    }
    if (id === 3001 && (title.includes("Frieren") || title.includes("คำอธิษฐาน"))) {
      return { ...candidate, id: 51001 };
    }
  }
  return raw;
}

function validateCartItem(item: CartItem): CartItem {
  const parsed = cartItemSchema.safeParse(normalizeLegacyCartItem(item));
  if (!parsed.success) {
    throw new TypeError(
      `ข้อมูลสินค้าในตะกร้าไม่ถูกต้อง: ${parsed.error.issues
        .map((issue) => issue.message)
        .join("; ")}`,
    );
  }
  return parsed.data;
}

export function CartProvider({ children }: CartProviderProps) {
  const { user, isLoading: authLoading } = useAuth();
  const activeScope = user ? `user-${user.id}` : "guest";
  const loadedScopeRef = useRef<string | null>(null);
  const prevScopeRef = useRef<string | null>(null);

  const [items, setItems] = useState<CartItem[]>([]);
  const [selectedCartItemKeys, setSelectedCartItemKeys] = useState<string[]>([]);
  const [bookCoverAddon, setBookCoverAddonState] = useState<boolean>(false);
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Immediately wipe active cart state and guest/legacy keys on logout
  useEffect(() => {
    const handleLogout = (): void => {
      clearGuestAndLegacyCartStorage();
      setItems([]);
      setSelectedCartItemKeys([]);
      setBookCoverAddonState(false);
      setAppliedPromoCode(null);
      loadedScopeRef.current = "guest";
      prevScopeRef.current = "guest";
    };
    window.addEventListener(AUTH_LOGOUT_EVENT, handleLogout);
    return () => {
      window.removeEventListener(AUTH_LOGOUT_EVENT, handleLogout);
    };
  }, []);

  useEffect(() => {
    if (authLoading) return;

    const prevScope = prevScopeRef.current;
    prevScopeRef.current = activeScope;

    // Transitioning from authenticated account to logged-out guest: clear cart immediately
    if (prevScope && prevScope.startsWith("user-") && activeScope === "guest") {
      clearGuestAndLegacyCartStorage();
      setItems([]);
      setSelectedCartItemKeys([]);
      setBookCoverAddonState(false);
      setAppliedPromoCode(null);
      loadedScopeRef.current = activeScope;
      setIsReady(true);
      return;
    }

    setIsReady(false);
    loadedScopeRef.current = null;

    try {
      // Remove legacy global unscoped keys so carts never leak between accounts
      window.localStorage.removeItem(CART_STORAGE_KEY);
      window.localStorage.removeItem(LEGACY_CART_STORAGE_KEY);
      window.localStorage.removeItem(SELECTED_ITEMS_STORAGE_KEY);
      window.localStorage.removeItem(ADDON_STORAGE_KEY);

      const savedCart = window.localStorage.getItem(
        scopedStorageKey(CART_STORAGE_KEY, activeScope),
      );
      let parsedItems: CartItem[] = [];
      if (savedCart) {
        const parsedJson: unknown = JSON.parse(savedCart);
        const normalizedJson = Array.isArray(parsedJson)
          ? parsedJson.map(normalizeLegacyCartItem)
          : parsedJson;
        const parsedCart = storedCartSchema.safeParse(normalizedJson);
        if (parsedCart.success) {
          parsedItems = parsedCart.data;
          setItems(parsedItems);
        } else {
          setItems([]);
        }
      } else {
        setItems([]);
      }

      const validItemKeys = new Set(parsedItems.map(getCartItemKey));
      const remapSelectedKey = (key: unknown): string | null => {
        if (typeof key !== "string") return null;
        if (key === "MANGA-2001" && validItemKeys.has("MANGA-50001")) {
          return "MANGA-50001";
        }
        if (key === "MANGA-2003" && validItemKeys.has("MANGA-1001")) {
          return "MANGA-1001";
        }
        if (key === "MANGA-3001" && validItemKeys.has("MANGA-51001")) {
          return "MANGA-51001";
        }
        return validItemKeys.has(key) ? key : null;
      };

      const savedSelected = window.localStorage.getItem(
        scopedStorageKey(SELECTED_ITEMS_STORAGE_KEY, activeScope),
      );
      if (savedSelected) {
        try {
          const parsed = JSON.parse(savedSelected);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const normalizedKeys = Array.from(
              new Set(
                parsed
                  .map(remapSelectedKey)
                  .filter((k): k is string => Boolean(k)),
              ),
            );
            setSelectedCartItemKeys(
              normalizedKeys.length > 0
                ? normalizedKeys
                : parsedItems.map(getCartItemKey),
            );
          } else if (parsedItems.length > 0) {
            setSelectedCartItemKeys(parsedItems.map(getCartItemKey));
          } else {
            setSelectedCartItemKeys([]);
          }
        } catch {
          setSelectedCartItemKeys(parsedItems.map(getCartItemKey));
        }
      } else if (parsedItems.length > 0) {
        setSelectedCartItemKeys(parsedItems.map(getCartItemKey));
      } else {
        setSelectedCartItemKeys([]);
      }

      const savedAddon = window.localStorage.getItem(
        scopedStorageKey(ADDON_STORAGE_KEY, activeScope),
      );
      setBookCoverAddonState(savedAddon === "true");

      const savedPromo = window.localStorage.getItem(
        scopedStorageKey(APPLIED_PROMO_STORAGE_KEY, activeScope),
      );
      setAppliedPromoCode(savedPromo && savedPromo.trim() ? savedPromo.trim().toUpperCase() : null);
    } catch (error) {
      console.error("Could not restore shopping cart.", error);
      setItems([]);
      setSelectedCartItemKeys([]);
      setBookCoverAddonState(false);
      setAppliedPromoCode(null);
    } finally {
      loadedScopeRef.current = activeScope;
      setIsReady(true);
    }
  }, [activeScope, authLoading]);

  useEffect(() => {
    if (!isReady || authLoading || loadedScopeRef.current !== activeScope) return;
    try {
      window.localStorage.setItem(
        scopedStorageKey(CART_STORAGE_KEY, activeScope),
        JSON.stringify(items),
      );
      window.localStorage.setItem(
        scopedStorageKey(ADDON_STORAGE_KEY, activeScope),
        String(bookCoverAddon),
      );
      window.localStorage.setItem(
        scopedStorageKey(SELECTED_ITEMS_STORAGE_KEY, activeScope),
        JSON.stringify(selectedCartItemKeys),
      );
      if (appliedPromoCode) {
        window.localStorage.setItem(
          scopedStorageKey(APPLIED_PROMO_STORAGE_KEY, activeScope),
          appliedPromoCode,
        );
      } else {
        window.localStorage.removeItem(
          scopedStorageKey(APPLIED_PROMO_STORAGE_KEY, activeScope),
        );
      }
    } catch (error) {
      console.error("Could not persist shopping cart.", error);
    }
  }, [activeScope, appliedPromoCode, authLoading, bookCoverAddon, isReady, items, selectedCartItemKeys]);

  const addItem = useCallback(
    (
      input: CartItem,
      triggerTarget?: React.MouseEvent | HTMLElement | { getBoundingClientRect: () => DOMRect } | null,
    ): void => {
      const item = validateCartItem(input);
      const itemKey = getCartItemKey(item);
      triggerFlyToCart(triggerTarget, item.image || item.imageUrl || item.coverImage);
      setItems((current) => {
      const index = current.findIndex(
        (candidate) =>
          candidate.kind === item.kind && candidate.id === item.id,
      );
      if (index === -1) {
        return [...current, item];
      }

      const existing = current[index];
      if (!existing) {
        return [...current, item];
      }
      const quantity = existing.quantity + item.quantity;
      if (!Number.isSafeInteger(quantity)) {
        throw new RangeError("จำนวนสินค้าในตะกร้าเกินค่าที่ระบบรองรับ");
      }
      const updated = [...current];
      if (
        (existing.kind === "FIGURE" && item.kind === "FIGURE") ||
        (existing.kind === "PLAMO" && item.kind === "PLAMO")
      ) {
        updated[index] = {
          ...existing,
          selectedPaymentType: item.selectedPaymentType,
          quantity,
        };
      } else {
        updated[index] = { ...existing, quantity };
      }
      return updated;
    });

    // Auto select newly added item
    setSelectedCartItemKeys((current) =>
      current.includes(itemKey) ? current : [...current, itemKey],
    );
  }, []);

  const removeItem = useCallback(
    (kind: CartItem["kind"], id: number): void => {
      const itemKey = `${kind}-${id}`;
      setItems((current) =>
        current.filter((item) => item.kind !== kind || item.id !== id),
      );
      setSelectedCartItemKeys((current) => current.filter((k) => k !== itemKey));
    },
    [],
  );

  const updateQuantity = useCallback(
    (kind: CartItem["kind"], id: number, quantity: number): void => {
      if (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > 99) {
        throw new RangeError("จำนวนสินค้าต้องอยู่ระหว่าง 0 ถึง 99");
      }
      const itemKey = `${kind}-${id}`;
      setItems((current) =>
        quantity === 0
          ? current.filter((item) => item.kind !== kind || item.id !== id)
          : current.map((item) =>
              item.kind === kind && item.id === id ? { ...item, quantity } : item,
            ),
      );
      if (quantity === 0) {
        setSelectedCartItemKeys((current) => current.filter((k) => k !== itemKey));
      }
    },
    [],
  );

  const updateFigurePaymentType = useCallback(
    (id: number, paymentType: "FULL" | "DEPOSIT"): void => {
      setItems((current) =>
        current.map((item) =>
          (item.kind === "FIGURE" || item.kind === "PLAMO") && item.id === id
            ? { ...item, selectedPaymentType: paymentType }
            : item,
        ),
      );
    },
    [],
  );

  const toggleItemSelection = useCallback((key: string): void => {
    setSelectedCartItemKeys((current) =>
      current.includes(key)
        ? current.filter((itemKey) => itemKey !== key)
        : [...current, key],
    );
  }, []);

  const selectAllItems = useCallback((): void => {
    setSelectedCartItemKeys(items.map(getCartItemKey));
  }, [items]);

  const unselectAllItems = useCallback((): void => {
    setSelectedCartItemKeys([]);
  }, []);

  const removeSelectedItems = useCallback((): void => {
    setItems((current) =>
      current.filter((item) => !selectedCartItemKeys.includes(getCartItemKey(item))),
    );
    setSelectedCartItemKeys([]);
  }, [selectedCartItemKeys]);

  const removeCheckedOutItems = useCallback((keys?: string[]): void => {
    setSelectedCartItemKeys((currentSelected) => {
      const targetKeys = keys ?? currentSelected;
      setItems((currentItems) =>
        currentItems.filter((item) => !targetKeys.includes(getCartItemKey(item))),
      );
      return currentSelected.filter((key) => !targetKeys.includes(key));
    });
    setAppliedPromoCode(null);
  }, []);

  const isItemSelected = useCallback(
    (key: string): boolean => selectedCartItemKeys.includes(key),
    [selectedCartItemKeys],
  );

  const setBookCoverAddon = useCallback((enabled: boolean): void => {
    setBookCoverAddonState(enabled);
  }, []);

  const toggleBookCoverAddon = useCallback((): void => {
    setBookCoverAddonState((current) => !current);
  }, []);

  const clearCart = useCallback((): void => {
    setItems([]);
    setSelectedCartItemKeys([]);
    setBookCoverAddonState(false);
    setAppliedPromoCode(null);
  }, []);

  const selectedItems = useMemo<CartItem[]>(() => {
    return items.filter((item) =>
      selectedCartItemKeys.includes(getCartItemKey(item)),
    );
  }, [items, selectedCartItemKeys]);

  const summary = useMemo<CartSummary>(() => {
    let totalCartItemCount = 0;
    for (const item of items) {
      totalCartItemCount += item.quantity;
    }

    let selectedItemCount = 0;
    let bookCount = 0;
    let baseMerchandiseTotal = 0;
    let baseImmediateTotal = 0;
    let remainingBalanceTotal = 0;

    for (const item of selectedItems) {
      selectedItemCount += item.quantity;
      if (isBookItem(item)) {
        bookCount += item.quantity;
      }
      const fullLine = getUnitFullPrice(item) * item.quantity;
      const immediateLine = getUnitImmediatePrice(item) * item.quantity;
      baseMerchandiseTotal += fullLine;
      baseImmediateTotal += immediateLine;
      remainingBalanceTotal += fullLine - immediateLine;
    }

    const hasBookItems = bookCount > 0;
    const bookCoverAddonPrice =
      bookCoverAddon && hasBookItems
        ? bookCount * BOOK_COVER_PRICE_PER_ITEM
        : 0;

    const merchandiseTotal =
      selectedItems.length === 0
        ? 0
        : Number((baseMerchandiseTotal + bookCoverAddonPrice).toFixed(2));
    const immediateTotal =
      selectedItems.length === 0
        ? 0
        : Number((baseImmediateTotal + bookCoverAddonPrice).toFixed(2));

    let promoDiscount = 0;
    let promoTitle: string | null = null;
    let appliedPromoType: PromoCoupon["type"] | null = null;
    let isPromoFreeShipping = false;
    let isFreeShipping = selectedItems.length > 0 && immediateTotal >= 800;
    if (appliedPromoCode && selectedItems.length > 0) {
      const res = validatePromoCode(appliedPromoCode, merchandiseTotal);
      if (res.valid) {
        promoDiscount = res.discountAmount;
        promoTitle = res.coupon?.title ?? null;
        appliedPromoType = res.coupon?.type ?? null;
        if (res.freeShipping) {
          isPromoFreeShipping = true;
          isFreeShipping = true;
        }
      }
    }

    const discountedImmediateTotal = Math.max(
      0,
      Number((immediateTotal - promoDiscount).toFixed(2)),
    );

    return {
      itemCount: totalCartItemCount,
      selectedItemCount,
      bookCount,
      hasBookItems,
      bookCoverAddon,
      bookCoverAddonPrice,
      merchandiseTotal,
      immediateTotal,
      remainingBalanceTotal:
        selectedItems.length === 0 ? 0 : Number(remainingBalanceTotal.toFixed(2)),
      appliedPromoCode,
      appliedPromoType,
      promoDiscount,
      promoTitle,
      discountedImmediateTotal,
      isFreeShipping,
      isPromoFreeShipping,
    };
  }, [appliedPromoCode, bookCoverAddon, items, selectedItems]);

  const applyPromoCode = useCallback(
    (code: string): { success: boolean; message: string } => {
      const res = validatePromoCode(code, summary.merchandiseTotal);
      if (!res.valid) {
        return {
          success: false,
          message: res.errorMessage || "โค้ดส่วนลดไม่ถูกต้อง",
        };
      }
      setAppliedPromoCode(code.trim().toUpperCase());
      return {
        success: true,
        message: `ใช้โค้ด ${res.coupon?.code} สำเร็จ (${res.coupon?.title})`,
      };
    },
    [summary.merchandiseTotal],
  );

  const removePromoCode = useCallback((): void => {
    setAppliedPromoCode(null);
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      selectedItems,
      selectedCartItemKeys,
      isReady,
      ...summary,
      addItem,
      removeItem,
      updateQuantity,
      updateFigurePaymentType,
      setBookCoverAddon,
      toggleBookCoverAddon,
      applyPromoCode,
      removePromoCode,
      clearCart,
      toggleItemSelection,
      selectAllItems,
      unselectAllItems,
      removeSelectedItems,
      removeCheckedOutItems,
      isItemSelected,
    }),
    [
      items,
      selectedItems,
      selectedCartItemKeys,
      isReady,
      summary,
      addItem,
      removeItem,
      updateQuantity,
      updateFigurePaymentType,
      setBookCoverAddon,
      toggleBookCoverAddon,
      applyPromoCode,
      removePromoCode,
      clearCart,
      toggleItemSelection,
      selectAllItems,
      unselectAllItems,
      removeSelectedItems,
      removeCheckedOutItems,
      isItemSelected,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider.");
  }
  return context;
}

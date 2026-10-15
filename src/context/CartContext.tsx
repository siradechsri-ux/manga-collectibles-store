"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { z } from "zod";
import { validatePromoCode } from "../utils/promo";

export interface FigureBoxDimensions {
  widthCm: number;
  lengthCm: number;
  heightCm: number;
}

export interface MangaCartItem {
  kind: "MANGA";
  id: number;
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
  name: string;
  image?: string | null;
  coverImage?: string | null;
  imageUrl?: string | null;
  fullPrice: number;
  depositAmount: number;
  selectedPaymentType: "FULL" | "DEPOSIT";
  quantity: number;
  boxDimensions: FigureBoxDimensions;
}

export interface PlamoCartItem {
  kind: "PLAMO";
  id: number;
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
}

export interface GoodsCartItem {
  kind: "GOODS";
  id: number;
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
  name: string;
  image?: string | null;
  coverImage?: string | null;
  imageUrl?: string | null;
  fullPrice: number;
  quantity: number;
  subcategory?: string;
  boxDimensions?: FigureBoxDimensions;
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
  promoDiscount: number;
  promoTitle: string | null;
  discountedImmediateTotal: number;
  isFreeShipping: boolean;
}

export interface CartContextValue extends CartSummary {
  items: readonly CartItem[];
  selectedItems: readonly CartItem[];
  selectedCartItemKeys: readonly string[];
  isReady: boolean;
  addItem: (item: CartItem) => void;
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
    name: z.string().trim().min(1).max(300),
    image: z.string().nullable().optional(),
    coverImage: z.string().nullable().optional(),
    imageUrl: z.string().nullable().optional(),
    fullPrice: z.number().finite().positive(),
    depositAmount: z.number().finite().nonnegative(),
    selectedPaymentType: z.enum(["FULL", "DEPOSIT"]),
    quantity: z.number().int().positive().safe(),
    boxDimensions: boxDimensionsSchema,
  })
  .strict()
  .superRefine((item, context) => {
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
    name: z.string().trim().min(1).max(300),
    image: z.string().nullable().optional(),
    coverImage: z.string().nullable().optional(),
    imageUrl: z.string().nullable().optional(),
    fullPrice: z.number().finite().positive(),
    depositAmount: z.number().finite().nonnegative(),
    selectedPaymentType: z.enum(["FULL", "DEPOSIT"]),
    quantity: z.number().int().positive().safe(),
    boxDimensions: boxDimensionsSchema,
    grade: z.string().optional(),
  })
  .strict();

const goodsCartItemSchema = z
  .object({
    kind: z.literal("GOODS"),
    id: z.number().int().positive().safe(),
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
    name: z.string().trim().min(1).max(300),
    image: z.string().nullable().optional(),
    coverImage: z.string().nullable().optional(),
    imageUrl: z.string().nullable().optional(),
    fullPrice: z.number().finite().positive(),
    quantity: z.number().int().positive().safe(),
    subcategory: z.string().optional(),
    boxDimensions: boxDimensionsSchema.optional(),
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

export const BOOK_COVER_PRICE_PER_ITEM = 5;

export function getCartItemKey(item: { kind: CartItem["kind"]; id: number }): string {
  return `${item.kind}-${item.id}`;
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

function validateCartItem(item: CartItem): CartItem {
  const parsed = cartItemSchema.safeParse(item);
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
  const [items, setItems] = useState<CartItem[]>([]);
  const [selectedCartItemKeys, setSelectedCartItemKeys] = useState<string[]>([]);
  const [bookCoverAddon, setBookCoverAddonState] = useState<boolean>(false);
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const savedCart =
        window.localStorage.getItem(CART_STORAGE_KEY) ??
        window.localStorage.getItem(LEGACY_CART_STORAGE_KEY);
      let parsedItems: CartItem[] = [];
      if (savedCart) {
        const parsedJson: unknown = JSON.parse(savedCart);
        const parsedCart = storedCartSchema.safeParse(parsedJson);
        if (parsedCart.success) {
          parsedItems = parsedCart.data;
          setItems(parsedItems);
        } else {
          setItems([]);
        }
      }

      const savedSelected = window.localStorage.getItem(SELECTED_ITEMS_STORAGE_KEY);
      if (savedSelected) {
        try {
          const parsed = JSON.parse(savedSelected);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSelectedCartItemKeys(parsed);
          } else if (parsedItems.length > 0) {
            // Default to all selected if empty
            setSelectedCartItemKeys(parsedItems.map(getCartItemKey));
          }
        } catch {
          setSelectedCartItemKeys(parsedItems.map(getCartItemKey));
        }
      } else if (parsedItems.length > 0) {
        setSelectedCartItemKeys(parsedItems.map(getCartItemKey));
      }

      const savedAddon = window.localStorage.getItem(ADDON_STORAGE_KEY);
      if (savedAddon === "true") {
        setBookCoverAddonState(true);
      }
    } catch (error) {
      console.error("Could not restore shopping cart.", error);
      setItems([]);
      setSelectedCartItemKeys([]);
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    if (!isReady) return;
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      window.localStorage.setItem(ADDON_STORAGE_KEY, String(bookCoverAddon));
      window.localStorage.setItem(
        SELECTED_ITEMS_STORAGE_KEY,
        JSON.stringify(selectedCartItemKeys),
      );
    } catch (error) {
      console.error("Could not persist shopping cart.", error);
    }
  }, [bookCoverAddon, isReady, items, selectedCartItemKeys]);

  const addItem = useCallback((input: CartItem): void => {
    const item = validateCartItem(input);
    const itemKey = getCartItemKey(item);
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
    let isFreeShipping = false;
    if (appliedPromoCode && selectedItems.length > 0) {
      const res = validatePromoCode(appliedPromoCode, merchandiseTotal);
      if (res.valid) {
        promoDiscount = res.discountAmount;
        promoTitle = res.coupon?.title ?? null;
        isFreeShipping = res.freeShipping;
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
      promoDiscount,
      promoTitle,
      discountedImmediateTotal,
      isFreeShipping,
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

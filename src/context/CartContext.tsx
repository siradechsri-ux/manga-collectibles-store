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
  price: number;
  isPreorder: boolean;
  quantity: number;
}

export interface FigureCartItem {
  kind: "FIGURE";
  id: number;
  name: string;
  fullPrice: number;
  depositAmount: number;
  selectedPaymentType: "FULL" | "DEPOSIT";
  quantity: number;
  boxDimensions: FigureBoxDimensions;
}

export type CartItem = MangaCartItem | FigureCartItem;

export interface CartSummary {
  itemCount: number;
  merchandiseTotal: number;
  immediateTotal: number;
  remainingBalanceTotal: number;
}

export interface CartContextValue extends CartSummary {
  items: readonly CartItem[];
  isReady: boolean;
  addItem: (item: CartItem) => void;
  removeItem: (kind: CartItem["kind"], id: number) => void;
  updateQuantity: (kind: CartItem["kind"], id: number, quantity: number) => void;
  updateFigurePaymentType: (
    id: number,
    paymentType: FigureCartItem["selectedPaymentType"],
  ) => void;
  clearCart: () => void;
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

const cartItemSchema = z.discriminatedUnion("kind", [
  mangaCartItemSchema,
  figureCartItemSchema,
]);

const storedCartSchema = z.array(cartItemSchema).max(100);
const CART_STORAGE_KEY = "manga-collectibles-cart-v1";

function getUnitFullPrice(item: CartItem): number {
  return item.kind === "MANGA" ? item.price : item.fullPrice;
}

function getUnitImmediatePrice(item: CartItem): number {
  if (item.kind === "MANGA" || item.selectedPaymentType === "FULL") {
    return getUnitFullPrice(item);
  }
  return item.depositAmount;
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
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const savedCart = window.localStorage.getItem(CART_STORAGE_KEY);
      if (!savedCart) {
        setIsReady(true);
        return;
      }
      const parsedJson: unknown = JSON.parse(savedCart);
      const parsedCart = storedCartSchema.safeParse(parsedJson);
      if (!parsedCart.success) {
        window.localStorage.removeItem(CART_STORAGE_KEY);
        setItems([]);
      } else {
        setItems(parsedCart.data);
      }
    } catch (error) {
      console.error("Could not restore the saved shopping cart.", error);
      setItems([]);
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error("Could not persist the shopping cart.", error);
    }
  }, [isReady, items]);

  const addItem = useCallback((input: CartItem): void => {
    const item = validateCartItem(input);
    setItems((current) => {
      const index = current.findIndex(
        (candidate) =>
          candidate.kind === item.kind &&
          candidate.id === item.id,
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
      updated[index] =
        existing.kind === "FIGURE" && item.kind === "FIGURE"
          ? { ...existing, selectedPaymentType: item.selectedPaymentType, quantity }
          : { ...existing, quantity };
      return updated;
    });
  }, []);

  const removeItem = useCallback(
    (kind: CartItem["kind"], id: number): void => {
      setItems((current) =>
        current.filter((item) => item.kind !== kind || item.id !== id),
      );
    },
    [],
  );

  const updateQuantity = useCallback(
    (kind: CartItem["kind"], id: number, quantity: number): void => {
      if (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > 99) {
        throw new RangeError("จำนวนสินค้าต้องอยู่ระหว่าง 0 ถึง 99");
      }
      setItems((current) =>
        quantity === 0
          ? current.filter((item) => item.kind !== kind || item.id !== id)
          : current.map((item) =>
              item.kind === kind && item.id === id ? { ...item, quantity } : item,
            ),
      );
    },
    [],
  );

  const updateFigurePaymentType = useCallback(
    (id: number, paymentType: FigureCartItem["selectedPaymentType"]): void => {
      setItems((current) =>
        current.map((item) =>
          item.kind === "FIGURE" && item.id === id
            ? { ...item, selectedPaymentType: paymentType }
            : item,
        ),
      );
    },
    [],
  );

  const clearCart = useCallback((): void => {
    setItems([]);
  }, []);

  const summary = useMemo<CartSummary>(() => {
    let itemCount = 0;
    let merchandiseTotal = 0;
    let immediateTotal = 0;
    let remainingBalanceTotal = 0;

    for (const item of items) {
      itemCount += item.quantity;
      const fullLine = getUnitFullPrice(item) * item.quantity;
      const immediateLine = getUnitImmediatePrice(item) * item.quantity;
      merchandiseTotal += fullLine;
      immediateTotal += immediateLine;
      remainingBalanceTotal += fullLine - immediateLine;
    }

    return {
      itemCount,
      merchandiseTotal: Number(merchandiseTotal.toFixed(2)),
      immediateTotal: Number(immediateTotal.toFixed(2)),
      remainingBalanceTotal: Number(remainingBalanceTotal.toFixed(2)),
    };
  }, [items]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      isReady,
      ...summary,
      addItem,
      removeItem,
      updateQuantity,
      updateFigurePaymentType,
      clearCart,
    }),
    [
      items,
      isReady,
      summary,
      addItem,
      removeItem,
      updateQuantity,
      updateFigurePaymentType,
      clearCart,
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

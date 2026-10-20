"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";

export interface CompareProductItem {
  id: string;
  name: string;
  category: string;
  series?: string;
  character?: string;
  price: number;
  depositPrice?: number;
  imageUrl?: string | null;
  url: string;
  scale?: string;
  height?: string;
  manufacturer?: string;
  material?: string;
  releaseDate?: string;
  status?: string;
  boxDimensions?: {
    widthCm: number;
    lengthCm: number;
    heightCm: number;
  };
}

interface CompareContextValue {
  items: CompareProductItem[];
  addToCompare: (item: CompareProductItem) => boolean;
  removeFromCompare: (id: string) => void;
  clearCompare: () => void;
  isInCompare: (id: string) => boolean;
  isCompareModalOpen: boolean;
  setIsCompareModalOpen: (open: boolean) => void;
  openCompare: () => void;
  closeCompare: () => void;
}

const STORAGE_KEY = "mock_compare_items";
const MAX_COMPARE_ITEMS = 4;

const CompareContext = createContext<CompareContextValue | null>(null);

function loadCompareFromStorage(): CompareProductItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCompareToStorage(items: CompareProductItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function CompareProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CompareProductItem[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setItems(loadCompareFromStorage());
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    saveCompareToStorage(items);
  }, [items, isHydrated]);

  const isInCompare = useCallback(
    (id: string) => items.some((i) => i.id === id),
    [items]
  );

  const addToCompare = useCallback(
    (item: CompareProductItem): boolean => {
      if (items.some((i) => i.id === item.id)) {
        return true;
      }
      if (items.length >= MAX_COMPARE_ITEMS) {
        return false;
      }
      setItems((prev) => [...prev, item]);
      return true;
    },
    [items]
  );

  const removeFromCompare = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clearCompare = useCallback(() => {
    setItems([]);
  }, []);

  const openCompare = useCallback(() => {
    setIsCompareModalOpen(true);
  }, []);

  const closeCompare = useCallback(() => {
    setIsCompareModalOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      items,
      addToCompare,
      removeFromCompare,
      clearCompare,
      isInCompare,
      isCompareModalOpen,
      setIsCompareModalOpen,
      openCompare,
      closeCompare,
    }),
    [
      items,
      addToCompare,
      removeFromCompare,
      clearCompare,
      isInCompare,
      isCompareModalOpen,
      openCompare,
      closeCompare,
    ]
  );

  return (
    <CompareContext.Provider value={value}>{children}</CompareContext.Provider>
  );
}

export function useCompare(): CompareContextValue {
  const context = useContext(CompareContext);
  if (!context) {
    throw new Error("useCompare must be used within a CompareProvider");
  }
  return context;
}

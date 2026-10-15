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
import {
  clearWishlist as clearWishlistService,
  getWishlist,
  isInWishlist as isInWishlistService,
  removeFromWishlist as removeFromWishlistService,
  subscribeWishlist,
  toggleWishlist as toggleWishlistService,
  type WishlistItem,
} from "../services/wishlist.service";
import { CheckCircle2, Heart, X } from "lucide-react";

export type { WishlistItem };

interface WishlistContextValue {
  items: WishlistItem[];
  wishlistCount: number;
  isReady: boolean;
  isInWishlist: (id: string | number, itemType?: string) => boolean;
  toggleWishlist: (item: WishlistItem) => boolean; // returns true if added, false if removed
  removeFromWishlist: (id: string | number, itemType?: string) => void;
  clearWishlist: () => void;
  showWishlistToast: (message: string) => void;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    setItems(getWishlist());
    setIsReady(true);

    const unsubscribe = subscribeWishlist((nextItems) => {
      setItems(nextItems);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const showWishlistToast = useCallback((message: string) => {
    setToastMessage(message);
  }, []);

  const isInWishlist = useCallback(
    (id: string | number, itemType?: string): boolean => {
      return isInWishlistService(id, itemType);
    },
    [],
  );

  const toggleWishlist = useCallback(
    (item: WishlistItem): boolean => {
      const added = toggleWishlistService(item);
      if (added) {
        setToastMessage(`เพิ่ม "${item.title}" ในรายการสิ่งที่ชอบแล้ว`);
      } else {
        setToastMessage(`นำ "${item.title}" ออกจากรายการสิ่งที่ชอบแล้ว`);
      }
      return added;
    },
    [],
  );

  const removeFromWishlist = useCallback(
    (id: string | number, itemType?: string) => {
      const current = items.find(
        (i) =>
          String(i.id) === String(id) && (!itemType || i.itemType === itemType),
      );
      removeFromWishlistService(id, itemType);
      if (current) {
        setToastMessage(`นำ "${current.title}" ออกจากรายการสิ่งที่ชอบแล้ว`);
      }
    },
    [items],
  );

  const clearWishlist = useCallback(() => {
    clearWishlistService();
    setToastMessage("ล้างรายการสิ่งที่ชอบทั้งหมดแล้ว");
  }, []);

  const value = useMemo<WishlistContextValue>(
    () => ({
      items,
      wishlistCount: items.length,
      isReady,
      isInWishlist,
      toggleWishlist,
      removeFromWishlist,
      clearWishlist,
      showWishlistToast,
    }),
    [
      items,
      isReady,
      isInWishlist,
      toggleWishlist,
      removeFromWishlist,
      clearWishlist,
      showWishlistToast,
    ],
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}

      {/* Floating Wishlist Toast Notification */}
      {toastMessage ? (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-6 z-50 flex max-w-sm items-center gap-2.5 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-xl shadow-zinc-950/10 dark:border-zinc-800 dark:bg-zinc-900 animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/80 dark:text-red-400">
            <Heart size={14} className="fill-red-500 text-red-500" aria-hidden="true" />
          </div>
          <p className="min-w-0 flex-1 text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
            {toastMessage}
          </p>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
            aria-label="ปิดการแจ้งเตือน"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </aside>
      ) : null}
    </WishlistContext.Provider>
  );
}

export function useWishlist(): WishlistContextValue {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}

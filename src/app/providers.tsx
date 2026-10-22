"use client";

import { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "../contexts/AuthContext";
import { CartProvider } from "../context/CartContext";
import { WishlistProvider } from "../contexts/WishlistContext";
import { CompareProvider } from "../contexts/CompareContext";
import ProductCompareFloatingBar from "../components/ProductCompareFloatingBar";


// Filter out React 19 false-positive warning for inline script tag from next-themes
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].includes("Encountered a script tag")) {
      return;
    }
    originalError.apply(console, args);
  };
}

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <CompareProvider>
              {children}
              <ProductCompareFloatingBar />
            </CompareProvider>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

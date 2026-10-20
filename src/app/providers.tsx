"use client";

import { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "../contexts/AuthContext";
import { CartProvider } from "../context/CartContext";
import { WishlistProvider } from "../contexts/WishlistContext";
import { CompareProvider } from "../contexts/CompareContext";
import ProductCompareFloatingBar from "../components/ProductCompareFloatingBar";

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

import type { Metadata } from "next";
import { ReactNode, Suspense } from "react";
import RouteGuard from "../components/auth/RouteGuard";
import Navbar from "../components/layout/Navbar";
import Providers from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Manga & Collectibles",
  description: "ร้านมังงะและของสะสมอนิเมะ",
  referrer: "no-referrer",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body>
        <Providers>
          <RouteGuard>
            <Suspense fallback={null}>
              <Navbar />
            </Suspense>
            {children}
          </RouteGuard>
        </Providers>
      </body>
    </html>
  );
}

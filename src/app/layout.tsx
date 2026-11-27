import type { Metadata } from "next";
import { ReactNode, Suspense } from "react";
import RouteGuard from "../components/auth/RouteGuard";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import FlyToCartOverlay from "../components/FlyToCartOverlay";
import Providers from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChanSasom | ร้านมังงะและของสะสมอนิเมะ",
  description: "ChanSasom ร้านมังงะและของสะสมอนิเมะ อ่านสนุก สะสมได้ ส่งถึงบ้าน",
  referrer: "no-referrer",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning>
            <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning className="flex min-h-screen flex-col">
        <Providers>
          <RouteGuard>
            <Suspense fallback={null}>
              <Navbar />
            </Suspense>
            <FlyToCartOverlay />
            <div className="flex-1">{children}</div>
            <Footer />
          </RouteGuard>
        </Providers>
      </body>
    </html>
  );
}

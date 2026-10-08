import type { Metadata } from "next";
import { ReactNode } from "react";
import StorefrontHeader from "../components/StorefrontHeader";
import Providers from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Manga & Collectibles",
  description: "ร้านมังงะและของสะสมอนิเมะ",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body>
        <Providers>
          <StorefrontHeader />
          {children}
        </Providers>
      </body>
    </html>
  );
}

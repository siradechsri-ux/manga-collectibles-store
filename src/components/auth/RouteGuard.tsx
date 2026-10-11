"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, ReactNode } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getRoleHomeUrl, isRouteAllowedForRole } from "../../utils/permissions";

export default function RouteGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || isLoading) return;

    const role = user?.role ?? "CUSTOMER";

    // 1. ป้องกันเส้นทางระบบหลังบ้าน (Admin, Staff, Finance)
    const isBackofficeRoute =
      pathname === "/admin" ||
      pathname.startsWith("/admin/") ||
      pathname === "/staff" ||
      pathname.startsWith("/staff/") ||
      pathname === "/finance" ||
      pathname.startsWith("/finance/");

    if (isBackofficeRoute) {
      if (!isRouteAllowedForRole(pathname, role)) {
        // ลูกค้าหรือบทบาทอื่นที่ไม่มีสิทธิ์ ให้ Redirect ไปที่หน้าแรก (/)
        router.replace("/?error=unauthorized");
        return;
      }
    }

    // 2. ป้องกันเส้นทางสั่งซื้อ (Checkout / Cart) สำหรับ Staff, Finance, Admin
    const isShoppingRoute =
      pathname === "/checkout" ||
      pathname.startsWith("/checkout/") ||
      pathname === "/cart";

    if (isShoppingRoute && role !== "CUSTOMER") {
      // ให้ Redirect ไปยังหน้าแรกของบทบาทตัวเองทันที
      const destination = getRoleHomeUrl(role);
      router.replace(destination);
      return;
    }
  }, [mounted, isLoading, user?.role, pathname, router]);

  return <>{children}</>;
}

import type { AuthRole } from "../contexts/AuthContext";

/**
 * Role-Based Access Control (RBAC) Permission Matrix
 * Roles: 'CUSTOMER' | 'STAFF' | 'FINANCE' | 'ADMIN'
 */

/**
 * สิทธิ์สั่งซื้อสินค้า (หยิบใส่ตะกร้า, สั่งซื้อทันที, ลง Waitlist):
 * จริงเฉพาะ 'CUSTOMER' (และผู้เยี่ยมชมหน้าร้านทั่วไป)
 */
export function canShop(role?: AuthRole | null): boolean {
  return role === "CUSTOMER" || !role;
}

/**
 * สิทธิ์จัดเตรียมและส่งพัสดุ (Packing & Shipping):
 * จริงเฉพาะ 'STAFF' และ 'ADMIN'
 */
export function canManagePacking(role?: AuthRole | null): boolean {
  return role === "STAFF" || role === "ADMIN";
}

/**
 * สิทธิ์ตรวจสอบสลิปโอนเงินและอนุมัติ (Finance Slips & Tax):
 * จริงเฉพาะ 'FINANCE' และ 'ADMIN'
 */
export function canVerifySlips(role?: AuthRole | null): boolean {
  return role === "FINANCE" || role === "ADMIN";
}

/**
 * สิทธิ์จัดการฐานข้อมูลสินค้าครบวงจร (Inventory CRUD):
 * จริงเฉพาะ 'ADMIN' (STAFF ดูสต็อกได้เท่านั้น)
 */
export function canManageInventory(role?: AuthRole | null): boolean {
  return role === "ADMIN";
}

/**
 * สิทธิ์ตรวจเช็กสต็อกสินค้าคงเหลือ:
 * จริงเฉพาะ 'STAFF' และ 'ADMIN'
 */
export function canViewStock(role?: AuthRole | null): boolean {
  return role === "STAFF" || role === "ADMIN";
}

/**
 * สิทธิ์รันเครื่องมือจำลองเวลา (Simulate 14-day expiry & waitlist transfers):
 * จริงเฉพาะ 'ADMIN'
 */
export function canRunSimulator(role?: AuthRole | null): boolean {
  return role === "ADMIN";
}

/**
 * สิทธิ์เข้าถึงแดชบอร์ดส่วนกลาง (/admin):
 * จริงเฉพาะ 'ADMIN'
 */
export function canAccessAdmin(role?: AuthRole | null): boolean {
  return role === "ADMIN";
}

/**
 * สิทธิ์ดูประวัติคำสั่งซื้อส่วนตัว (/orders):
 * จริงเฉพาะ 'CUSTOMER'
 */
export function canViewOrderHistory(role?: AuthRole | null): boolean {
  return role === "CUSTOMER";
}

/**
 * หาหน้าเริ่มต้น (Landing / Dashboard) สำหรับแต่ละบทบาท
 */
export function getRoleHomeUrl(role?: AuthRole | null): string {
  switch (role) {
    case "STAFF":
      return "/staff/packing";
    case "FINANCE":
      return "/finance/slips";
    case "ADMIN":
      return "/admin";
    case "CUSTOMER":
    default:
      return "/";
  }
}

/**
 * ตรวจสอบว่า Role ปัจจุบันได้รับอนุญาตให้เปิด Route นั้นๆ หรือไม่
 */
export function isRouteAllowedForRole(pathname: string, role?: AuthRole | null): boolean {
  // เส้นทาง Admin
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    // ยกเว้น /admin/products ที่ STAFF สามารถเปิดดูสต็อกได้
    if (pathname === "/admin/products" && role === "STAFF") {
      return true;
    }
    return role === "ADMIN";
  }

  // เส้นทาง Staff
  if (pathname === "/staff" || pathname.startsWith("/staff/")) {
    return role === "STAFF" || role === "ADMIN";
  }

  // เส้นทาง Finance
  if (pathname === "/finance" || pathname.startsWith("/finance/")) {
    return role === "FINANCE" || role === "ADMIN";
  }

  // เส้นทาง Checkout / Cart
  if (pathname === "/checkout" || pathname.startsWith("/checkout/") || pathname === "/cart") {
    // ไม่อนุญาตให้ STAFF, FINANCE, ADMIN เข้าช้อปปิ้ง
    return role === "CUSTOMER" || !role;
  }

  // เส้นทางดูประวัติคำสั่งซื้อ
  if (pathname === "/orders" || pathname === "/account/orders") {
    return role === "CUSTOMER";
  }

  // เส้นทางสะสมแต้มแลกของรางวัล (CUSTOMER เท่านั้น)
  if (pathname === "/rewards" || pathname.startsWith("/rewards/")) {
    return role === "CUSTOMER";
  }

  return true;
}

/**
 * สิทธิ์สะสมแต้มและแลกของรางวัล (/rewards):
 * จริงเฉพาะ 'CUSTOMER'
 */
export function canRedeemRewards(role?: AuthRole | null): boolean {
  return role === "CUSTOMER";
}

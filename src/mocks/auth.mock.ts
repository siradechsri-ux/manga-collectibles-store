import type { AuthRole, AuthUser } from "../contexts/AuthContext";

const MOCK_AUTH_STORAGE_KEY = "manga-collectibles-mock-user-v1";

const mockUsers: Record<"CUSTOMER" | "ADMIN" | "STAFF" | "FINANCE", AuthUser> = {
  CUSTOMER: {
    id: 9_001,
    email: "customer@test.com",
    fullName: "ลูกค้าทดสอบ",
    role: "CUSTOMER",
  },
  ADMIN: {
    id: 9_002,
    email: "admin@test.com",
    fullName: "ผู้ดูแลระบบ",
    role: "ADMIN",
  },
  STAFF: {
    id: 9_003,
    email: "staff@test.com",
    fullName: "พนักงานคลังสินค้า",
    role: "STAFF",
  },
  FINANCE: {
    id: 9_004,
    email: "finance@test.com",
    fullName: "เจ้าหน้าที่การเงิน",
    role: "FINANCE",
  },
};

function isMockUser(value: unknown): value is AuthUser {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<AuthUser>;
  return (
    typeof candidate.id === "number" &&
    Number.isSafeInteger(candidate.id) &&
    typeof candidate.email === "string" &&
    typeof candidate.fullName === "string" &&
    (candidate.role === "CUSTOMER" ||
      candidate.role === "ADMIN" ||
      candidate.role === "STAFF" ||
      candidate.role === "FINANCE")
  );
}

export function getMockUser(): AuthUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(MOCK_AUTH_STORAGE_KEY);
    if (!stored) {
      return null;
    }
    const parsed: unknown = JSON.parse(stored);
    if (!isMockUser(parsed)) {
      window.localStorage.removeItem(MOCK_AUTH_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch (error) {
    console.error("Could not read the Prototype user session.", error);
    window.localStorage.removeItem(MOCK_AUTH_STORAGE_KEY);
    return null;
  }
}

export function loginAsMockRole(
  role: "CUSTOMER" | "ADMIN" | "STAFF" | "FINANCE",
): AuthUser {
  const user = mockUsers[role];
  try {
    window.localStorage.setItem(MOCK_AUTH_STORAGE_KEY, JSON.stringify(user));
  } catch (error) {
    console.error("Could not persist the Prototype user session.", error);
    throw new Error("บันทึกบัญชีทดสอบไม่สำเร็จ", { cause: error });
  }
  return user;
}

export function updateMockUserDetails(fullName: string): AuthUser | null {
  const currentUser = getMockUser();
  if (!currentUser) {
    return null;
  }
  const updatedUser: AuthUser = { ...currentUser, fullName };
  try {
    window.localStorage.setItem(
      MOCK_AUTH_STORAGE_KEY,
      JSON.stringify(updatedUser),
    );
  } catch (error) {
    console.error("Could not update the Prototype user session.", error);
    throw new Error("อัปเดตข้อมูลบัญชีทดสอบไม่สำเร็จ", { cause: error });
  }
  return updatedUser;
}

export function loginMockUser(email: string): AuthUser {
  const normalizedEmail = email.trim().toLowerCase();
  const user = Object.values(mockUsers).find(
    (candidate) => candidate.email === normalizedEmail,
  );
  if (!user) {
    throw new Error(
      "โหมดทดสอบรองรับเฉพาะ customer@test.com, admin@test.com, staff@test.com และ finance@test.com",
    );
  }
  try {
    window.localStorage.setItem(MOCK_AUTH_STORAGE_KEY, JSON.stringify(user));
  } catch (error) {
    console.error("Could not persist the Prototype user session.", error);
    throw new Error("บันทึกบัญชีทดสอบไม่สำเร็จ", { cause: error });
  }
  return user;
}

export function logoutMockUser(): void {
  try {
    window.localStorage.removeItem(MOCK_AUTH_STORAGE_KEY);
  } catch (error) {
    console.error("Could not clear the Prototype user session.", error);
    throw new Error("ออกจากระบบทดสอบไม่สำเร็จ", { cause: error });
  }
}

export function isStaffMockRole(role: AuthRole): boolean {
  return role === "ADMIN" || role === "STAFF" || role === "FINANCE";
}

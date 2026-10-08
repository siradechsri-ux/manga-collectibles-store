import { z } from "zod";
import type { AuthRole, AuthUser } from "../contexts/AuthContext";

const PROFILE_STORAGE_KEY = "mock_user_profile";
const ADDRESS_STORAGE_KEY = "mock_addresses";

export interface ShippingAddress {
  id: string;
  label: string;
  recipientName: string;
  recipientPhone: string;
  addressLine: string;
  addressVillage: string;
  street: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SavedTaxProfile {
  entityType: "INDIVIDUAL" | "CORPORATION";
  taxId: string;
  companyOrName: string;
  branchType: "HEAD_OFFICE" | "BRANCH";
  branchCode: string;
  addressLine: string;
  addressVillage: string;
  street: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
  contactEmail: string;
  contactPhone: string;
}

export interface SecurityHistoryEntry {
  id: string;
  action: string;
  occurredAt: string;
  description: string;
}

export interface UserProfile {
  userId: number;
  role: AuthRole;
  fullName: string;
  email: string;
  phoneNumber: string;
  employeeCode: string | null;
  department: string | null;
  securityHistory: SecurityHistoryEntry[];
  savedTaxProfile: SavedTaxProfile | null;
  updatedAt: string;
}

const shippingAddressSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1).max(60),
    recipientName: z.string().min(1).max(150),
    recipientPhone: z.string().min(1).max(30),
    addressLine: z.string().min(1).max(300),
    addressVillage: z.string().max(100),
    street: z.string().max(150),
    subdistrict: z.string().min(1).max(120),
    district: z.string().min(1).max(120),
    province: z.string().min(1).max(120),
    postalCode: z.string().regex(/^\d{5}$/),
    isDefault: z.boolean(),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict();

const savedTaxProfileSchema = z
  .object({
    entityType: z.enum(["INDIVIDUAL", "CORPORATION"]),
    taxId: z.string().regex(/^\d{13}$/),
    companyOrName: z.string().min(1).max(200),
    branchType: z.enum(["HEAD_OFFICE", "BRANCH"]),
    branchCode: z.string().regex(/^\d{5}$/),
    addressLine: z.string().min(1).max(300),
    addressVillage: z.string().max(100),
    street: z.string().max(150),
    subdistrict: z.string().min(1).max(120),
    district: z.string().min(1).max(120),
    province: z.string().min(1).max(120),
    postalCode: z.string().regex(/^\d{5}$/),
    contactEmail: z.string().email(),
    contactPhone: z.string().min(8).max(30),
  })
  .strict();

const securityHistoryEntrySchema = z
  .object({
    id: z.string().min(1),
    action: z.string().min(1),
    occurredAt: z.string().datetime({ offset: true }),
    description: z.string().min(1),
  })
  .strict();

const userProfileSchema = z
  .object({
    userId: z.number().int().positive().safe(),
    role: z.enum(["CUSTOMER", "STAFF", "FINANCE", "ADMIN"]),
    fullName: z.string().min(1).max(150),
    email: z.string().email(),
    phoneNumber: z.string().max(30),
    employeeCode: z.string().nullable(),
    department: z.string().nullable(),
    securityHistory: z.array(securityHistoryEntrySchema),
    savedTaxProfile: savedTaxProfileSchema.nullable(),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict();

const profilesSchema = z.record(z.string(), userProfileSchema);
const addressesByUserSchema = z.record(
  z.string(),
  z.array(shippingAddressSchema),
);

export interface ProfileUpdate {
  fullName: string;
  phoneNumber: string;
}

export interface AddressInput {
  label: string;
  recipientName: string;
  recipientPhone: string;
  addressLine: string;
  addressVillage: string;
  street: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
}

function requireBrowserStorage(): Storage {
  if (typeof window === "undefined") {
    throw new Error("ข้อมูลโปรไฟล์จำลองใช้ได้เฉพาะในเบราว์เซอร์");
  }
  return window.localStorage;
}

function readProfiles(): Record<string, UserProfile> {
  const storage = requireBrowserStorage();
  const raw = storage.getItem(PROFILE_STORAGE_KEY);
  if (raw === null) {
    return {};
  }
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (error) {
    throw new Error("ข้อมูลโปรไฟล์ในเบราว์เซอร์เสียหาย", { cause: error });
  }
  const parsed = profilesSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error("รูปแบบข้อมูลโปรไฟล์ในเบราว์เซอร์ไม่ถูกต้อง", {
      cause: parsed.error,
    });
  }
  return parsed.data;
}

function writeProfiles(profiles: Record<string, UserProfile>): void {
  try {
    requireBrowserStorage().setItem(PROFILE_STORAGE_KEY, JSON.stringify(profiles));
  } catch (error) {
    throw new Error("บันทึกข้อมูลโปรไฟล์ไม่สำเร็จ", { cause: error });
  }
}

function readAddresses(): Record<string, ShippingAddress[]> {
  const storage = requireBrowserStorage();
  const raw = storage.getItem(ADDRESS_STORAGE_KEY);
  if (raw === null) {
    return {};
  }
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (error) {
    throw new Error("ข้อมูลสมุดที่อยู่ในเบราว์เซอร์เสียหาย", { cause: error });
  }
  const parsed = addressesByUserSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error("รูปแบบข้อมูลสมุดที่อยู่ในเบราว์เซอร์ไม่ถูกต้อง", {
      cause: parsed.error,
    });
  }
  return parsed.data;
}

function writeAddresses(addresses: Record<string, ShippingAddress[]>): void {
  try {
    requireBrowserStorage().setItem(ADDRESS_STORAGE_KEY, JSON.stringify(addresses));
  } catch (error) {
    throw new Error("บันทึกสมุดที่อยู่ไม่สำเร็จ", { cause: error });
  }
}

function createDefaultProfile(user: AuthUser): UserProfile {
  const isStaff = user.role !== "CUSTOMER";
  const departments: Record<Exclude<AuthRole, "CUSTOMER">, string> = {
    STAFF: "คลังสินค้าและจัดส่ง",
    FINANCE: "การเงินและตรวจสอบการชำระเงิน",
    ADMIN: "บริหารระบบ",
  };
  return {
    userId: user.id,
    role: user.role,
    fullName: user.fullName,
    email: user.email,
    phoneNumber: "",
    employeeCode: isStaff ? `EMP-${String(user.id).slice(-4)}` : null,
    department: isStaff ? departments[user.role as Exclude<AuthRole, "CUSTOMER">] : null,
    securityHistory: [
      {
        id: `session-${user.id}`,
        action: "เข้าสู่ระบบ",
        occurredAt: new Date().toISOString(),
        description: "เริ่มต้นใช้งานบัญชีบนอุปกรณ์นี้",
      },
    ],
    savedTaxProfile: null,
    updatedAt: new Date().toISOString(),
  };
}

export function getUserProfile(user: AuthUser): UserProfile {
  const profiles = readProfiles();
  const key = String(user.id);
  const existing = profiles[key];
  if (existing && existing.role === user.role && existing.email === user.email) {
    return existing;
  }
  const profile = createDefaultProfile(user);
  profiles[key] = profile;
  writeProfiles(profiles);
  return profile;
}

export function updateUserProfile(
  user: AuthUser,
  update: ProfileUpdate,
): UserProfile {
  const parsedUpdate = z
    .object({
      fullName: z.string().trim().min(2).max(150),
      phoneNumber: z.string().trim().max(30),
    })
    .strict()
    .safeParse(update);
  if (!parsedUpdate.success) {
    throw new TypeError("กรุณาตรวจสอบชื่อและเบอร์โทรศัพท์");
  }
  const profiles = readProfiles();
  const current = profiles[String(user.id)] ?? createDefaultProfile(user);
  const updated: UserProfile = {
    ...current,
    fullName: parsedUpdate.data.fullName,
    phoneNumber: parsedUpdate.data.phoneNumber,
    updatedAt: new Date().toISOString(),
  };
  profiles[String(user.id)] = updated;
  writeProfiles(profiles);
  return updated;
}

export function updateSavedTaxProfile(
  userId: number,
  taxProfile: SavedTaxProfile | null,
): UserProfile {
  const parsedTaxProfile =
    taxProfile === null
      ? null
      : savedTaxProfileSchema.parse(taxProfile);
  const profiles = readProfiles();
  const current = profiles[String(userId)];
  if (!current) {
    throw new Error("ไม่พบข้อมูลบัญชีผู้ใช้");
  }
  const updated = {
    ...current,
    savedTaxProfile: parsedTaxProfile,
    updatedAt: new Date().toISOString(),
  };
  profiles[String(userId)] = updated;
  writeProfiles(profiles);
  return updated;
}

export function appendSecurityHistory(
  user: AuthUser,
  action: string,
  description: string,
): UserProfile {
  const profiles = readProfiles();
  const current = profiles[String(user.id)] ?? createDefaultProfile(user);
  const updated: UserProfile = {
    ...current,
    securityHistory: [
      {
        id: `security-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        action,
        occurredAt: new Date().toISOString(),
        description,
      },
      ...current.securityHistory,
    ].slice(0, 20),
    updatedAt: new Date().toISOString(),
  };
  profiles[String(user.id)] = updated;
  writeProfiles(profiles);
  return updated;
}

export function listShippingAddresses(userId: number): ShippingAddress[] {
  return readAddresses()[String(userId)] ?? [];
}

export function saveShippingAddress(
  userId: number,
  input: AddressInput,
  addressId?: string,
): ShippingAddress[] {
  const parsed = z
    .object({
      label: z.string().trim().min(1).max(60),
      recipientName: z.string().trim().min(2).max(150),
      recipientPhone: z.string().trim().min(8).max(30),
      addressLine: z.string().trim().min(1).max(300),
      addressVillage: z.string().trim().max(100),
      street: z.string().trim().max(150),
      subdistrict: z.string().trim().min(1).max(120),
      district: z.string().trim().min(1).max(120),
      province: z.string().trim().min(1).max(120),
      postalCode: z.string().regex(/^\d{5}$/),
    })
    .strict()
    .safeParse(input);
  if (!parsed.success) {
    throw new TypeError(
      parsed.error.issues[0]?.message ?? "กรุณาตรวจสอบข้อมูลที่อยู่",
    );
  }

  const allAddresses = readAddresses();
  const key = String(userId);
  const current = allAddresses[key] ?? [];
  const now = new Date().toISOString();
  const existing = addressId
    ? current.find((address) => address.id === addressId)
    : undefined;
  if (addressId && !existing) {
    throw new Error("ไม่พบที่อยู่ที่ต้องการแก้ไข");
  }
  const address: ShippingAddress = {
    ...parsed.data,
    id: existing?.id ?? `address-${userId}-${Date.now()}`,
    isDefault: existing?.isDefault ?? current.length === 0,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  const next = existing
    ? current.map((item) => (item.id === address.id ? address : item))
    : [...current, address];
  allAddresses[key] = next;
  writeAddresses(allAddresses);
  return next;
}

export function setDefaultShippingAddress(
  userId: number,
  addressId: string,
): ShippingAddress[] {
  const allAddresses = readAddresses();
  const key = String(userId);
  const current = allAddresses[key] ?? [];
  if (!current.some((address) => address.id === addressId)) {
    throw new Error("ไม่พบที่อยู่ที่ต้องการตั้งเป็นค่าเริ่มต้น");
  }
  const now = new Date().toISOString();
  const updated = current.map((address) => ({
    ...address,
    isDefault: address.id === addressId,
    updatedAt: now,
  }));
  allAddresses[key] = updated;
  writeAddresses(allAddresses);
  return updated;
}

export function deleteShippingAddress(
  userId: number,
  addressId: string,
): ShippingAddress[] {
  const allAddresses = readAddresses();
  const key = String(userId);
  const current = allAddresses[key] ?? [];
  const target = current.find((address) => address.id === addressId);
  if (!target) {
    throw new Error("ไม่พบที่อยู่ที่ต้องการลบ");
  }
  const remaining = current.filter((address) => address.id !== addressId);
  if (target.isDefault && remaining.length > 0) {
    remaining[0] = {
      ...remaining[0],
      isDefault: true,
      updatedAt: new Date().toISOString(),
    };
  }
  allAddresses[key] = remaining;
  writeAddresses(allAddresses);
  return remaining;
}

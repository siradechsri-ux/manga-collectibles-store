"use client";

import {
  AlertCircle,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  MapPin,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import {
  appendSecurityHistory,
  deleteShippingAddress,
  getUserProfile,
  listShippingAddresses,
  saveShippingAddress,
  setDefaultShippingAddress,
  updateSavedTaxProfile,
  updateUserProfile,
  type AddressInput,
  type SavedTaxProfile,
  type SecurityHistoryEntry,
  type ShippingAddress,
  type UserProfile,
} from "../../mocks/profile.mock";
import { useAuth } from "../../contexts/AuthContext";

type CustomerTab = "ACCOUNT" | "ADDRESSES" | "TAX";

const emptyAddress: AddressInput = {
  label: "",
  recipientName: "",
  recipientPhone: "",
  addressLine: "",
  addressVillage: "",
  street: "",
  subdistrict: "",
  district: "",
  province: "",
  postalCode: "",
};

const emptyTaxProfile: SavedTaxProfile = {
  entityType: "INDIVIDUAL",
  taxId: "",
  companyOrName: "",
  branchType: "HEAD_OFFICE",
  branchCode: "00000",
  addressLine: "",
  addressVillage: "",
  street: "",
  subdistrict: "",
  district: "",
  province: "",
  postalCode: "",
  contactEmail: "",
  contactPhone: "",
};

const taxProfileFormSchema = z
  .object({
    entityType: z.enum(["INDIVIDUAL", "CORPORATION"]),
    taxId: z.string().regex(/^\d{13}$/, "กรุณากรอกเลขประจำตัวผู้เสียภาษี 13 หลัก"),
    companyOrName: z.string().trim().min(2, "กรุณากรอกชื่อผู้เสียภาษี").max(200),
    branchType: z.enum(["HEAD_OFFICE", "BRANCH"]),
    branchCode: z.string().regex(/^\d{5}$/, "รหัสสาขาต้องมี 5 หลัก"),
    addressLine: z.string().trim().min(1, "กรุณากรอกบ้านเลขที่/ที่อยู่").max(300),
    addressVillage: z.string().max(100),
    street: z.string().max(150),
    subdistrict: z.string().trim().min(1, "กรุณากรอกตำบล/แขวง").max(120),
    district: z.string().trim().min(1, "กรุณากรอกอำเภอ/เขต").max(120),
    province: z.string().trim().min(1, "กรุณากรอกจังหวัด").max(120),
    postalCode: z.string().regex(/^\d{5}$/, "รหัสไปรษณีย์ต้องมี 5 หลัก"),
    contactEmail: z.string().email("กรุณากรอกอีเมลที่ถูกต้อง"),
    contactPhone: z.string().min(8).max(30),
  })
  .strict();

const accountFormSchema = z
  .object({
    fullName: z.string().trim().min(2, "กรุณากรอกชื่ออย่างน้อย 2 ตัวอักษร").max(150),
    phoneNumber: z
      .string()
      .trim()
      .max(30)
      .regex(/^[0-9+(). -]*$/, "รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง"),
  })
  .strict();

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "ไม่ทราบวันเวลา";
  }
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function isValidThaiTaxId(value: string): boolean {
  if (!/^\d{13}$/.test(value)) {
    return false;
  }
  let sum = 0;
  for (let index = 0; index < 12; index += 1) {
    sum += Number(value[index]) * (13 - index);
  }
  return (11 - (sum % 11)) % 10 === Number(value[12]);
}

function roleLabel(role: UserProfile["role"]): string {
  const labels: Record<UserProfile["role"], string> = {
    CUSTOMER: "ลูกค้า",
    STAFF: "พนักงานคลังสินค้า",
    FINANCE: "ฝ่ายการเงิน",
    ADMIN: "ผู้ดูแลระบบ",
  };
  return labels[role];
}

export default function ProfilePage() {
  const { user, isLoading, updateUserDetails } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [tab, setTab] = useState<CustomerTab>("ACCOUNT");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [taxProfile, setTaxProfile] = useState<SavedTaxProfile>(emptyTaxProfile);
  const [addressDraft, setAddressDraft] = useState<AddressInput>(emptyAddress);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [makeAddressDefault, setMakeAddressDefault] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordFormOpen, setPasswordFormOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadProfile = useCallback((): void => {
    if (!user) {
      setProfile(null);
      setAddresses([]);
      return;
    }
    try {
      const nextProfile = getUserProfile(user);
      setProfile(nextProfile);
      setFullName(nextProfile.fullName);
      setPhoneNumber(nextProfile.phoneNumber);
      setTaxProfile(nextProfile.savedTaxProfile ?? emptyTaxProfile);
      setAddresses(
        user.role === "CUSTOMER" ? listShippingAddresses(user.id) : [],
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "โหลดข้อมูลโปรไฟล์ไม่สำเร็จ",
      );
    }
  }, [user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  function showMessage(value: string): void {
    setError(null);
    setMessage(value);
  }

  function showError(value: unknown, fallback: string): void {
    setMessage(null);
    setError(value instanceof Error ? value.message : fallback);
  }

  function handleSaveAccount(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!user || user.role !== "CUSTOMER") {
      return;
    }
    const parsed = accountFormSchema.safeParse({ fullName, phoneNumber });
    if (!parsed.success) {
      showError(
        new Error(parsed.error.issues[0]?.message ?? "ตรวจสอบข้อมูลบัญชี"),
        "ตรวจสอบข้อมูลบัญชี",
      );
      return;
    }
    setIsSaving(true);
    try {
      const updated = updateUserProfile(user, parsed.data);
      updateUserDetails(updated.fullName);
      setProfile(updated);
      showMessage("บันทึกข้อมูลบัญชีเรียบร้อยแล้ว");
    } catch (saveError) {
      showError(saveError, "บันทึกข้อมูลบัญชีไม่สำเร็จ");
    } finally {
      setIsSaving(false);
    }
  }

  function handleSavePassword(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!user) {
      return;
    }
    if (!currentPassword) {
      showError(new Error("กรุณากรอกรหัสผ่านปัจจุบัน"), "ตรวจสอบข้อมูล");
      return;
    }
    if (newPassword.length < 8) {
      showError(new Error("รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร"), "ตรวจสอบข้อมูล");
      return;
    }
    if (newPassword !== confirmPassword) {
      showError(new Error("ยืนยันรหัสผ่านใหม่ไม่ตรงกัน"), "ตรวจสอบข้อมูล");
      return;
    }
    try {
      const updated = appendSecurityHistory(
        user,
        "คำขอเปลี่ยนรหัสผ่าน",
        "บันทึกเหตุการณ์เปลี่ยนรหัสผ่านใน Mock Profile แล้ว บัญชี Quick Login ยังคงใช้วิธีเข้าสู่ระบบเดิม",
      );
      setProfile(updated);
      setPasswordFormOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showMessage(
        "บันทึกเหตุการณ์เปลี่ยนรหัสผ่านจำลองแล้ว ข้อมูลเข้าสู่ระบบทดสอบไม่ได้เปลี่ยนแปลง",
      );
    } catch (passwordError) {
      showError(passwordError, "บันทึกเหตุการณ์ไม่สำเร็จ");
    }
  }

  function openNewAddressForm(): void {
    setAddressDraft(emptyAddress);
    setEditingAddressId(null);
    setMakeAddressDefault(addresses.length === 0);
    setAddressModalOpen(true);
    setError(null);
  }

  function openEditAddressForm(address: ShippingAddress): void {
    const {
      id: _id,
      isDefault,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      ...draft
    } = address;
    setAddressDraft(draft);
    setEditingAddressId(address.id);
    setMakeAddressDefault(isDefault);
    setAddressModalOpen(true);
    setError(null);
  }

  function handleSaveAddress(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!user || user.role !== "CUSTOMER") {
      return;
    }
    setIsSaving(true);
    try {
      let updated = saveShippingAddress(
        user.id,
        addressDraft,
        editingAddressId ?? undefined,
      );
      const savedAddress = updated.find(
        (address) =>
          address.id === editingAddressId ||
          (!editingAddressId &&
            address.recipientName === addressDraft.recipientName &&
            address.label === addressDraft.label),
      );
      if (makeAddressDefault && savedAddress) {
        updated = setDefaultShippingAddress(user.id, savedAddress.id);
      }
      setAddresses(updated);
      setAddressModalOpen(false);
      showMessage(editingAddressId ? "แก้ไขที่อยู่เรียบร้อยแล้ว" : "เพิ่มที่อยู่เรียบร้อยแล้ว");
    } catch (saveError) {
      showError(saveError, "บันทึกที่อยู่ไม่สำเร็จ");
    } finally {
      setIsSaving(false);
    }
  }

  function handleSetDefault(addressId: string): void {
    if (!user) {
      return;
    }
    try {
      setAddresses(setDefaultShippingAddress(user.id, addressId));
      showMessage("ตั้งค่าที่อยู่เริ่มต้นเรียบร้อยแล้ว");
    } catch (defaultError) {
      showError(defaultError, "ตั้งค่าที่อยู่เริ่มต้นไม่สำเร็จ");
    }
  }

  function handleDeleteAddress(addressId: string): void {
    if (!user || !window.confirm("ยืนยันการลบที่อยู่นี้หรือไม่")) {
      return;
    }
    try {
      setAddresses(deleteShippingAddress(user.id, addressId));
      showMessage("ลบที่อยู่เรียบร้อยแล้ว");
    } catch (deleteError) {
      showError(deleteError, "ลบที่อยู่ไม่สำเร็จ");
    }
  }

  function handleSaveTaxProfile(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!user || user.role !== "CUSTOMER") {
      return;
    }
    const parsed = taxProfileFormSchema.safeParse(taxProfile);
    if (!parsed.success) {
      showError(
        new Error(parsed.error.issues[0]?.message ?? "ตรวจสอบข้อมูลผู้เสียภาษี"),
        "ตรวจสอบข้อมูลผู้เสียภาษี",
      );
      return;
    }
    if (!isValidThaiTaxId(parsed.data.taxId)) {
      showError(new Error("เลขประจำตัวผู้เสียภาษีไม่ถูกต้อง"), "ตรวจสอบข้อมูลผู้เสียภาษี");
      return;
    }
    if (
      parsed.data.entityType === "CORPORATION" &&
      parsed.data.branchType === "HEAD_OFFICE" &&
      parsed.data.branchCode !== "00000"
    ) {
      showError(new Error("สำนักงานใหญ่ใช้รหัสสาขา 00000"), "ตรวจสอบข้อมูลผู้เสียภาษี");
      return;
    }
    setIsSaving(true);
    try {
      const updated = updateSavedTaxProfile(user.id, parsed.data);
      setProfile(updated);
      showMessage("บันทึกข้อมูลผู้เสียภาษีเรียบร้อยแล้ว");
    } catch (saveError) {
      showError(saveError, "บันทึกข้อมูลผู้เสียภาษีไม่สำเร็จ");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4">
        <p role="status" className="text-sm text-slate-500">
          กำลังโหลดข้อมูลโปรไฟล์...
        </p>
      </main>
    );
  }

  if (!user || !profile) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
        <UserRound className="h-9 w-9 text-slate-400" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-extrabold text-slate-950">
          กรุณาเข้าสู่ระบบเพื่อดูโปรไฟล์
        </h1>
        <Link
          href="/login?redirect=/profile"
          className="mt-5 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
        >
          เข้าสู่ระบบ
        </Link>
      </main>
    );
  }

  const isCustomer = user.role === "CUSTOMER";

  return (
    <main className="min-h-[75vh] bg-slate-50 px-4 py-8 pb-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="rounded-3xl bg-slate-950 px-6 py-7 text-white shadow-sm sm:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
            Account Center
          </p>
          <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold sm:text-3xl">
                {isCustomer ? "โปรไฟล์ของฉัน" : "ข้อมูลเจ้าหน้าที่"}
              </h1>
              <p className="mt-1 text-sm text-slate-300">
                จัดการข้อมูลบัญชีและข้อมูลที่เกี่ยวข้อง
              </p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-sm font-bold ring-1 ring-white/15">
              <ShieldCheck size={16} aria-hidden="true" />
              {roleLabel(user.role)}
            </span>
          </div>
        </header>

        {error ? (
          <div role="alert" className="mt-5 flex gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-800">
            <AlertCircle size={18} className="shrink-0" aria-hidden="true" />
            {error}
          </div>
        ) : null}
        {message ? (
          <div role="status" className="mt-5 flex gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
            <CheckCircle2 size={18} className="shrink-0" aria-hidden="true" />
            {message}
          </div>
        ) : null}

        {isCustomer ? (
          <>
            <div
              className="mt-6 grid grid-cols-3 rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
              role="tablist"
              aria-label="ส่วนข้อมูลโปรไฟล์"
            >
              {(
                [
                  ["ACCOUNT", "ข้อมูลบัญชี"],
                  ["ADDRESSES", "สมุดที่อยู่จัดส่ง"],
                  ["TAX", "ข้อมูลผู้เสียภาษี"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={tab === value}
                  onClick={() => setTab(value)}
                  className={`min-h-11 rounded-lg px-2 text-xs font-bold transition sm:px-4 sm:text-sm ${
                    tab === value
                      ? "bg-slate-950 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === "ACCOUNT" ? (
              <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="mb-5">
                  <h2 className="text-lg font-extrabold text-slate-950">ข้อมูลบัญชี</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    ข้อมูลพื้นฐานสำหรับติดต่อและจัดส่งสินค้า
                  </p>
                </div>
                <form onSubmit={(event) => handleSaveAccount(event)} className="space-y-4">
                  <ProfileField
                    id="profile-name"
                    label="ชื่อ-นามสกุล"
                    value={fullName}
                    onChange={setFullName}
                    required
                  />
                  <ProfileField
                    id="profile-email"
                    label="อีเมล"
                    value={user.email}
                    onChange={() => undefined}
                    readOnly
                    type="email"
                  />
                  <ProfileField
                    id="profile-phone"
                    label="เบอร์โทรศัพท์"
                    value={phoneNumber}
                    onChange={setPhoneNumber}
                    type="tel"
                  />
                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      <Save size={16} aria-hidden="true" />
                      บันทึกข้อมูล
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPasswordFormOpen((open) => !open);
                        setError(null);
                      }}
                      className="min-h-11 rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                    >
                      เปลี่ยนรหัสผ่าน
                    </button>
                  </div>
                </form>
                {passwordFormOpen ? (
                  <form
                    onSubmit={(event) => handleSavePassword(event)}
                    className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3"
                  >
                    <ProfileField
                      id="current-password"
                      label="รหัสผ่านปัจจุบัน"
                      value={currentPassword}
                      onChange={setCurrentPassword}
                      type="password"
                      required
                    />
                    <ProfileField
                      id="new-password"
                      label="รหัสผ่านใหม่"
                      value={newPassword}
                      onChange={setNewPassword}
                      type="password"
                      required
                    />
                    <ProfileField
                      id="confirm-password"
                      label="ยืนยันรหัสผ่านใหม่"
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      type="password"
                      required
                    />
                    <p className="text-xs leading-5 text-amber-800 sm:col-span-3">
                      โหมด Prototype จะบันทึกประวัติการเปลี่ยนรหัสผ่านเท่านั้น
                      และไม่เปลี่ยนข้อมูล Quick Login
                    </p>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="min-h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50 sm:col-span-3 sm:justify-self-start"
                    >
                      บันทึกคำขอเปลี่ยนรหัสผ่าน
                    </button>
                  </form>
                ) : null}
              </section>
            ) : null}

            {tab === "ADDRESSES" ? (
              <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-950">
                      สมุดที่อยู่จัดส่ง
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      บันทึกที่อยู่ที่ใช้เป็นประจำและเลือกใช้ในหน้า Checkout
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={openNewAddressForm}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800"
                  >
                    <Plus size={17} aria-hidden="true" />
                    เพิ่มที่อยู่ใหม่
                  </button>
                </div>
                {addresses.length === 0 ? (
                  <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                    <MapPin className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
                    <p className="mt-3 text-sm font-semibold text-slate-800">
                      ยังไม่มีที่อยู่ที่บันทึกไว้
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      เพิ่มที่อยู่เพื่อกรอกข้อมูล Checkout ได้รวดเร็วขึ้น
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {addresses.map((address) => (
                      <article
                        key={address.id}
                        className={`rounded-xl border p-4 ${
                          address.isDefault
                            ? "border-orange-300 bg-orange-50/40"
                            : "border-slate-200"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-bold text-slate-950">{address.label}</h3>
                              {address.isDefault ? (
                                <span className="rounded-full bg-orange-100 px-2 py-1 text-[10px] font-bold text-orange-800">
                                  ที่อยู่เริ่มต้น
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-2 text-sm font-semibold text-slate-800">
                              {address.recipientName} · {address.recipientPhone}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-slate-600">
                              {formatAddress(address)}
                            </p>
                          </div>
                          <MapPin className="shrink-0 text-slate-400" size={18} aria-hidden="true" />
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                          {!address.isDefault ? (
                            <button
                              type="button"
                              onClick={() => handleSetDefault(address.id)}
                              className="rounded-lg bg-orange-50 px-3 py-2 text-xs font-bold text-orange-800 hover:bg-orange-100"
                            >
                              ตั้งเป็นที่อยู่เริ่มต้น
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => openEditAddressForm(address)}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                          >
                            แก้ไข
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAddress(address.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-100 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50"
                          >
                            <Trash2 size={13} aria-hidden="true" />
                            ลบ
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            ) : null}

            {tab === "TAX" ? (
              <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="mb-5">
                  <h2 className="text-lg font-extrabold text-slate-950">ข้อมูลผู้เสียภาษี</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    ระบบจะใช้ข้อมูลนี้เติมในแบบฟอร์มใบกำกับภาษีเมื่อ Checkout
                  </p>
                </div>
                <form onSubmit={(event) => handleSaveTaxProfile(event)} className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    ประเภทผู้เสียภาษี
                    <select
                      value={taxProfile.entityType}
                      onChange={(event) =>
                        setTaxProfile((current) => ({
                          ...current,
                          entityType: event.target.value as SavedTaxProfile["entityType"],
                        }))
                      }
                      className={fieldClass}
                    >
                      <option value="INDIVIDUAL">บุคคลธรรมดา</option>
                      <option value="CORPORATION">นิติบุคคล / บริษัท</option>
                    </select>
                  </label>
                  <ProfileField
                    id="tax-name"
                    label="ชื่อผู้เสียภาษี / ชื่อบริษัท"
                    value={taxProfile.companyOrName}
                    onChange={(value) =>
                      setTaxProfile((current) => ({ ...current, companyOrName: value }))
                    }
                    required
                  />
                  <ProfileField
                    id="tax-id"
                    label="เลขประจำตัวผู้เสียภาษี 13 หลัก"
                    value={taxProfile.taxId}
                    onChange={(value) =>
                      setTaxProfile((current) => ({
                        ...current,
                        taxId: value.replace(/\D/g, "").slice(0, 13),
                      }))
                    }
                    inputMode="numeric"
                    maxLength={13}
                    required
                  />
                  {taxProfile.entityType === "CORPORATION" ? (
                    <>
                      <label className="block text-sm font-semibold text-slate-700">
                        สาขา
                        <select
                          value={taxProfile.branchType}
                          onChange={(event) =>
                            setTaxProfile((current) => ({
                              ...current,
                              branchType: event.target.value as SavedTaxProfile["branchType"],
                              branchCode:
                                event.target.value === "HEAD_OFFICE"
                                  ? "00000"
                                  : current.branchCode === "00000"
                                    ? ""
                                    : current.branchCode,
                            }))
                          }
                          className={fieldClass}
                        >
                          <option value="HEAD_OFFICE">สำนักงานใหญ่</option>
                          <option value="BRANCH">สาขา</option>
                        </select>
                      </label>
                      <ProfileField
                        id="tax-branch-code"
                        label="รหัสสาขา 5 หลัก"
                        value={taxProfile.branchCode}
                        onChange={(value) =>
                          setTaxProfile((current) => ({
                            ...current,
                            branchCode: value.replace(/\D/g, "").slice(0, 5),
                          }))
                        }
                        inputMode="numeric"
                        maxLength={5}
                        required
                      />
                    </>
                  ) : null}
                  <ProfileField
                    id="tax-address"
                    label="บ้านเลขที่ / อาคาร"
                    value={taxProfile.addressLine}
                    onChange={(value) =>
                      setTaxProfile((current) => ({ ...current, addressLine: value }))
                    }
                    required
                    className="sm:col-span-2"
                  />
                  <ProfileField
                    id="tax-village"
                    label="หมู่ที่"
                    value={taxProfile.addressVillage}
                    onChange={(value) =>
                      setTaxProfile((current) => ({ ...current, addressVillage: value }))
                    }
                  />
                  <ProfileField
                    id="tax-street"
                    label="ถนน"
                    value={taxProfile.street}
                    onChange={(value) =>
                      setTaxProfile((current) => ({ ...current, street: value }))
                    }
                  />
                  <ProfileField
                    id="tax-subdistrict"
                    label="ตำบล / แขวง"
                    value={taxProfile.subdistrict}
                    onChange={(value) =>
                      setTaxProfile((current) => ({ ...current, subdistrict: value }))
                    }
                    required
                  />
                  <ProfileField
                    id="tax-district"
                    label="อำเภอ / เขต"
                    value={taxProfile.district}
                    onChange={(value) =>
                      setTaxProfile((current) => ({ ...current, district: value }))
                    }
                    required
                  />
                  <ProfileField
                    id="tax-province"
                    label="จังหวัด"
                    value={taxProfile.province}
                    onChange={(value) =>
                      setTaxProfile((current) => ({ ...current, province: value }))
                    }
                    required
                  />
                  <ProfileField
                    id="tax-postal"
                    label="รหัสไปรษณีย์"
                    value={taxProfile.postalCode}
                    onChange={(value) =>
                      setTaxProfile((current) => ({
                        ...current,
                        postalCode: value.replace(/\D/g, "").slice(0, 5),
                      }))
                    }
                    inputMode="numeric"
                    maxLength={5}
                    required
                  />
                  <ProfileField
                    id="tax-email"
                    label="อีเมลสำหรับรับเอกสาร"
                    value={taxProfile.contactEmail}
                    onChange={(value) =>
                      setTaxProfile((current) => ({ ...current, contactEmail: value }))
                    }
                    type="email"
                    required
                  />
                  <ProfileField
                    id="tax-phone"
                    label="เบอร์โทรศัพท์"
                    value={taxProfile.contactPhone}
                    onChange={(value) =>
                      setTaxProfile((current) => ({ ...current, contactPhone: value }))
                    }
                    type="tel"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50 sm:col-span-2 sm:justify-self-start"
                  >
                    <Save size={16} aria-hidden="true" />
                    บันทึกข้อมูลผู้เสียภาษี
                  </button>
                </form>
              </section>
            ) : null}
          </>
        ) : (
          <section className="mt-6 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="rounded-xl bg-slate-100 p-3 text-slate-700">
                  <BriefcaseBusiness size={21} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-extrabold text-slate-950">ข้อมูลเจ้าหน้าที่</h2>
                  <p className="text-sm text-slate-500">ข้อมูลสำหรับการใช้งานภายใน</p>
                </div>
              </div>
              <dl className="mt-6 space-y-4">
                <InfoRow label="รหัสพนักงาน" value={profile.employeeCode ?? "ไม่ระบุ"} />
                <InfoRow label="ชื่อ" value={profile.fullName} />
                <InfoRow label="อีเมล" value={profile.email} />
                <InfoRow label="แผนก" value={profile.department ?? "ไม่ระบุ"} />
                <InfoRow label="บทบาทหน้าที่" value={roleLabel(profile.role)} badge />
              </dl>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
                  <Clock3 size={21} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-extrabold text-slate-950">ประวัติความปลอดภัย</h2>
                  <p className="text-sm text-slate-500">กิจกรรมล่าสุดในบัญชีนี้</p>
                </div>
              </div>
              <SecurityHistory entries={profile.securityHistory} />
            </div>
          </section>
        )}
      </div>

      {addressModalOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 p-0 sm:items-center sm:p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setAddressModalOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="address-form-title"
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-7"
          >
            <h2 id="address-form-title" className="text-xl font-extrabold text-slate-950">
              {editingAddressId ? "แก้ไขที่อยู่จัดส่ง" : "เพิ่มที่อยู่จัดส่ง"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              กรอกข้อมูลที่อยู่ให้ครบถ้วนเพื่อใช้ในขั้นตอน Checkout
            </p>
            <form onSubmit={(event) => handleSaveAddress(event)} className="mt-5 grid gap-4 sm:grid-cols-2">
              <ProfileField
                id="address-label"
                label="ชื่อเรียกที่อยู่"
                value={addressDraft.label}
                onChange={(value) =>
                  setAddressDraft((current) => ({ ...current, label: value }))
                }
                placeholder="เช่น บ้าน, ที่ทำงาน"
                required
              />
              <ProfileField
                id="address-recipient"
                label="ชื่อผู้รับ"
                value={addressDraft.recipientName}
                onChange={(value) =>
                  setAddressDraft((current) => ({ ...current, recipientName: value }))
                }
                required
              />
              <ProfileField
                id="address-phone"
                label="เบอร์โทรศัพท์"
                value={addressDraft.recipientPhone}
                onChange={(value) =>
                  setAddressDraft((current) => ({ ...current, recipientPhone: value }))
                }
                type="tel"
                required
              />
              <ProfileField
                id="address-line"
                label="บ้านเลขที่ / อาคาร / หมู่บ้าน"
                value={addressDraft.addressLine}
                onChange={(value) =>
                  setAddressDraft((current) => ({ ...current, addressLine: value }))
                }
                className="sm:col-span-2"
                required
              />
              <ProfileField
                id="address-village"
                label="หมู่ที่"
                value={addressDraft.addressVillage}
                onChange={(value) =>
                  setAddressDraft((current) => ({ ...current, addressVillage: value }))
                }
              />
              <ProfileField
                id="address-street"
                label="ถนน"
                value={addressDraft.street}
                onChange={(value) =>
                  setAddressDraft((current) => ({ ...current, street: value }))
                }
              />
              <ProfileField
                id="address-subdistrict"
                label="ตำบล / แขวง"
                value={addressDraft.subdistrict}
                onChange={(value) =>
                  setAddressDraft((current) => ({ ...current, subdistrict: value }))
                }
                required
              />
              <ProfileField
                id="address-district"
                label="อำเภอ / เขต"
                value={addressDraft.district}
                onChange={(value) =>
                  setAddressDraft((current) => ({ ...current, district: value }))
                }
                required
              />
              <ProfileField
                id="address-province"
                label="จังหวัด"
                value={addressDraft.province}
                onChange={(value) =>
                  setAddressDraft((current) => ({ ...current, province: value }))
                }
                required
              />
              <ProfileField
                id="address-postal"
                label="รหัสไปรษณีย์"
                value={addressDraft.postalCode}
                onChange={(value) =>
                  setAddressDraft((current) => ({
                    ...current,
                    postalCode: value.replace(/\D/g, "").slice(0, 5),
                  }))
                }
                inputMode="numeric"
                maxLength={5}
                required
              />
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={makeAddressDefault}
                  onChange={(event) => setMakeAddressDefault(event.target.checked)}
                  className="h-4 w-4 accent-orange-600"
                />
                ตั้งเป็นที่อยู่เริ่มต้น
              </label>
              <div className="flex gap-3 pt-1 sm:col-span-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="min-h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {isSaving ? "กำลังบันทึก..." : "บันทึกที่อยู่"}
                </button>
                <button
                  type="button"
                  onClick={() => setAddressModalOpen(false)}
                  className="min-h-11 rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}

const fieldClass =
  "mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100";

function ProfileField({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
  readOnly = false,
  inputMode,
  maxLength,
  className = "",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  readOnly?: boolean;
  inputMode?: "text" | "numeric" | "tel" | "email";
  maxLength?: number;
  className?: string;
}) {
  return (
    <label htmlFor={id} className={`block text-sm font-semibold text-slate-700 ${className}`}>
      {label}
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        readOnly={readOnly}
        inputMode={inputMode}
        maxLength={maxLength}
        className={`${fieldClass} ${readOnly ? "bg-slate-50 text-slate-500" : ""}`}
      />
    </label>
  );
}

function InfoRow({
  label,
  value,
  badge = false,
}: {
  label: string;
  value: string;
  badge?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-b-0">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd
        className={
          badge
            ? "rounded-full bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-800"
            : "text-right text-sm font-semibold text-slate-900"
        }
      >
        {value}
      </dd>
    </div>
  );
}

function SecurityHistory({ entries }: { entries: SecurityHistoryEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
        ยังไม่มีประวัติความปลอดภัย
      </p>
    );
  }
  return (
    <ol className="mt-5 space-y-4">
      {entries.map((entry) => (
        <li key={entry.id} className="flex gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <ShieldCheck size={16} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900">{entry.action}</p>
            <p className="mt-0.5 text-xs leading-5 text-slate-600">{entry.description}</p>
            <p className="mt-1 text-[11px] text-slate-400">{formatDate(entry.occurredAt)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function formatAddress(address: ShippingAddress): string {
  return [
    address.addressLine,
    address.addressVillage ? `หมู่ ${address.addressVillage}` : "",
    address.street ? `ถนน${address.street}` : "",
    `ตำบล/แขวง${address.subdistrict}`,
    `อำเภอ/เขต${address.district}`,
    address.province,
    address.postalCode,
  ]
    .filter(Boolean)
    .join(" ");
}

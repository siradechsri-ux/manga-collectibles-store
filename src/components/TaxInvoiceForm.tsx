"use client";

import {
  AlertCircle,
  Building2,
  CheckCircle2,
  FileText,
  UserRound,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { useAuth } from "../contexts/AuthContext";
import {
  getUserProfile,
  updateSavedTaxProfile,
  type SavedTaxProfile,
} from "../mocks/profile.mock";

export type TaxInvoiceEntityType = "INDIVIDUAL" | "CORPORATION";
export type CheckoutTaxItemType = "MANGA" | "FIGURE";

export interface CheckoutTaxItem {
  id: string | number;
  name: string;
  quantity: number;
  unitPrice: number | string;
  type: CheckoutTaxItemType;
}

export interface ShippingAddress {
  addressLine: string;
  addressVillage?: string;
  street?: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
}

export interface TaxInvoiceFormData {
  entityType: TaxInvoiceEntityType;
  taxId: string;
  companyOrName: string;
  branchType?: "HEAD_OFFICE" | "BRANCH";
  branchCode?: string;
  addressLine: string;
  addressVillage: string;
  street: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
  contactEmail: string;
  contactPhone: string;
  saveForNextTime: boolean;
}

export interface TaxInvoiceFormProps {
  items: readonly CheckoutTaxItem[];
  shippingFee: number | string;
  shippingAddress?: ShippingAddress;
  onSubmit: (taxData: TaxInvoiceFormData | null) => void | Promise<void>;
  onEnabledChange?: (enabled: boolean) => void;
  className?: string;
}

interface FormValues {
  entityType: TaxInvoiceEntityType;
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
  saveForNextTime: boolean;
}

const savedProfileSchema = z
  .object({
    entityType: z.enum(["INDIVIDUAL", "CORPORATION"]),
    taxId: z.string(),
    companyOrName: z.string(),
    branchType: z.enum(["HEAD_OFFICE", "BRANCH"]).nullable(),
    branchCode: z.string().nullable(),
    addressLine: z.string(),
    addressVillage: z.string().nullable(),
    street: z.string().nullable(),
    subdistrict: z.string(),
    district: z.string(),
    province: z.string(),
    postalCode: z.string(),
    contactEmail: z.string(),
    contactPhone: z.string(),
  })
  .strict();

const DEFAULT_VALUES: FormValues = {
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
  saveForNextTime: false,
};

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

function parseCents(value: number | string): bigint {
  if (typeof value === "number" && (!Number.isFinite(value) || value < 0)) {
    throw new RangeError("Tax amount must be a finite, non-negative value.");
  }
  const normalized = typeof value === "number" ? value.toFixed(2) : value.trim();
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) {
    throw new TypeError("Tax amount must have no more than two decimal places.");
  }
  return BigInt(match[1]) * 100n + BigInt((match[2] ?? "").padEnd(2, "0") || "0");
}

function formatBaht(cents: bigint): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(cents) / 100);
}

function getApiUrl(path: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, "");
  return `${baseUrl ?? ""}${path}`;
}

function profileToForm(profile: z.infer<typeof savedProfileSchema>): FormValues {
  return {
    entityType: profile.entityType,
    taxId: profile.taxId,
    companyOrName: profile.companyOrName,
    branchType: profile.branchType ?? "HEAD_OFFICE",
    branchCode: profile.branchCode ?? "00000",
    addressLine: profile.addressLine,
    addressVillage: profile.addressVillage ?? "",
    street: profile.street ?? "",
    subdistrict: profile.subdistrict,
    district: profile.district,
    province: profile.province,
    postalCode: profile.postalCode,
    contactEmail: profile.contactEmail,
    contactPhone: profile.contactPhone,
    saveForNextTime: true,
  };
}

export function TaxInvoiceForm({
  items,
  shippingFee,
  shippingAddress,
  onSubmit,
  onEnabledChange,
  className = "",
}: TaxInvoiceFormProps) {
  const { authenticatedFetch, isAuthenticated, user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [values, setValues] = useState<FormValues>(DEFAULT_VALUES);
  const [submitted, setSubmitted] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const profileRequestRef = useRef(false);

  const summary = useMemo(() => {
    let nonVatCents = 0n;
    let figuresCents = 0n;
    for (const item of items) {
      if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
        throw new RangeError("Tax summary item quantity must be a positive integer.");
      }
      const lineCents = parseCents(item.unitPrice) * BigInt(item.quantity);
      if (item.type === "MANGA") {
        nonVatCents += lineCents;
      } else {
        figuresCents += lineCents;
      }
    }
    const shippingCents = parseCents(shippingFee);
    const vatableGrossCents = figuresCents + shippingCents;
    const vatableNetCents = (vatableGrossCents * 100n + 53n) / 107n;
    const vatCents = vatableGrossCents - vatableNetCents;
    return {
      nonVatCents,
      vatableNetCents,
      vatCents,
      totalCents: nonVatCents + vatableGrossCents,
    };
  }, [items, shippingFee]);

  const taxIdError = useMemo(() => {
    if (!values.taxId) {
      return null;
    }
    if (!/^\d{13}$/.test(values.taxId)) {
      return "กรอกเลขประจำตัวผู้เสียภาษี 13 หลัก";
    }
    return isValidThaiTaxId(values.taxId) ? null : "เลขประจำตัวผู้เสียภาษีไม่ถูกต้อง";
  }, [values.taxId]);

  const branchCodeError =
    values.entityType === "CORPORATION" &&
    (!/^\d{5}$/.test(values.branchCode) ||
      (values.branchType === "HEAD_OFFICE" && values.branchCode !== "00000") ||
      (values.branchType === "BRANCH" && values.branchCode === "00000"));

  const formErrors = useMemo(() => {
    const errors: string[] = [];
    if (!values.companyOrName.trim()) {
      errors.push("กรุณากรอกชื่อผู้เสียภาษี");
    }
    if (taxIdError) {
      errors.push(taxIdError);
    }
    if (branchCodeError) {
      errors.push(
        values.branchType === "HEAD_OFFICE"
          ? "สำนักงานใหญ่ใช้รหัสสาขา 00000"
          : "รหัสสาขาต้องเป็นเลข 5 หลัก และไม่ใช่ 00000",
      );
    }
    if (!values.addressLine.trim()) {
      errors.push("กรุณากรอกบ้านเลขที่/ที่อยู่");
    }
    if (!values.subdistrict.trim() || !values.district.trim() || !values.province.trim()) {
      errors.push("กรุณากรอกตำบล/แขวง อำเภอ/เขต และจังหวัด");
    }
    if (!/^\d{5}$/.test(values.postalCode)) {
      errors.push("รหัสไปรษณีย์ต้องเป็นเลข 5 หลัก");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.contactEmail)) {
      errors.push("กรุณากรอกอีเมลที่ถูกต้อง");
    }
    if (!/^[0-9+(). -]{8,30}$/.test(values.contactPhone)) {
      errors.push("กรุณากรอกเบอร์โทรศัพท์ที่ถูกต้อง");
    }
    return errors;
  }, [branchCodeError, taxIdError, values]);

  useEffect(() => {
    if (!enabled || profileLoaded || profileRequestRef.current) {
      return;
    }
    profileRequestRef.current = true;
    setProfileLoading(true);
    if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
      try {
        const savedTaxProfile = user ? getUserProfile(user).savedTaxProfile : null;
        if (savedTaxProfile) {
          const parsed = savedProfileSchema.safeParse(savedTaxProfile);
          if (!parsed.success) {
            throw new Error("ข้อมูลผู้เสียภาษีที่บันทึกไว้ไม่ถูกต้อง");
          }
          setValues(profileToForm(parsed.data));
        }
      } catch (error) {
        setProfileError(
          error instanceof Error
            ? error.message
            : "โหลดข้อมูลภาษีที่บันทึกไว้ไม่สำเร็จ",
        );
      } finally {
        setProfileLoading(false);
        setProfileLoaded(true);
      }
      return;
    }
    if (!isAuthenticated) {
      setProfileLoading(false);
      setProfileLoaded(true);
      return;
    }
    void authenticatedFetch(getApiUrl("/api/me/tax-profile"), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
      .then(async (response) => {
        let body: unknown;
        try {
          body = await response.json();
        } catch {
          throw new Error("ไม่สามารถอ่านข้อมูลโปรไฟล์ภาษีได้");
        }
        if (!response.ok) {
          throw new Error("ไม่สามารถโหลดข้อมูลภาษีที่บันทึกไว้ได้");
        }
        const responseSchema = z
          .object({
            success: z.literal(true),
            data: savedProfileSchema.nullable(),
          })
          .strict();
        const parsed = responseSchema.safeParse(body);
        if (!parsed.success) {
          throw new Error("ข้อมูลโปรไฟล์ภาษีจากเซิร์ฟเวอร์ไม่ถูกต้อง");
        }
        if (parsed.data.data) {
          setValues(profileToForm(parsed.data.data));
        }
      })
      .catch((error: unknown) => {
        setProfileError(
          error instanceof Error ? error.message : "โหลดข้อมูลภาษีไม่สำเร็จ",
        );
      })
      .finally(() => {
        setProfileLoading(false);
        setProfileLoaded(true);
      });
  }, [authenticatedFetch, enabled, isAuthenticated, profileLoaded, user]);

  function updateField<K extends keyof FormValues>(field: K, value: FormValues[K]): void {
    setValues((current) => ({ ...current, [field]: value }));
    setSubmitError(null);
    invalidateSubmittedData();
  }

  function invalidateSubmittedData(): void {
    setSaved(false);
    void Promise.resolve(onSubmit(null)).catch((error: unknown) => {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "ไม่สามารถอัปเดตข้อมูลใบกำกับภาษีได้",
      );
    });
  }

  function useShippingAddress(): void {
    if (!shippingAddress) {
      return;
    }
    setValues((current) => ({
      ...current,
      addressLine: shippingAddress.addressLine,
      addressVillage: shippingAddress.addressVillage ?? "",
      street: shippingAddress.street ?? "",
      subdistrict: shippingAddress.subdistrict,
      district: shippingAddress.district,
      province: shippingAddress.province,
      postalCode: shippingAddress.postalCode,
    }));
    invalidateSubmittedData();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitted(true);
    setSubmitError(null);
    if (formErrors.length > 0) {
      return;
    }

    const taxData: TaxInvoiceFormData = {
      entityType: values.entityType,
      taxId: values.taxId,
      companyOrName: values.companyOrName.trim(),
      ...(values.entityType === "CORPORATION"
        ? {
            branchType: values.branchType,
            branchCode: values.branchCode,
          }
        : {}),
      addressLine: values.addressLine.trim(),
      addressVillage: values.addressVillage.trim(),
      street: values.street.trim(),
      subdistrict: values.subdistrict.trim(),
      district: values.district.trim(),
      province: values.province.trim(),
      postalCode: values.postalCode,
      contactEmail: values.contactEmail.trim(),
      contactPhone: values.contactPhone.trim(),
      saveForNextTime: values.saveForNextTime,
    };

    try {
      await onSubmit(taxData);
      if (
        taxData.saveForNextTime &&
        process.env.NEXT_PUBLIC_USE_MOCK === "true" &&
        user
      ) {
        getUserProfile(user);
        const savedProfile: SavedTaxProfile = {
          entityType: taxData.entityType,
          taxId: taxData.taxId,
          companyOrName: taxData.companyOrName,
          branchType: taxData.branchType ?? "HEAD_OFFICE",
          branchCode: taxData.branchCode ?? "00000",
          addressLine: taxData.addressLine,
          addressVillage: taxData.addressVillage,
          street: taxData.street,
          subdistrict: taxData.subdistrict,
          district: taxData.district,
          province: taxData.province,
          postalCode: taxData.postalCode,
          contactEmail: taxData.contactEmail,
          contactPhone: taxData.contactPhone,
        };
        updateSavedTaxProfile(user.id, savedProfile);
      }
      setSaved(true);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "ไม่สามารถบันทึกข้อมูลใบกำกับภาษีได้",
      );
    }
  }

  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}
      aria-labelledby="tax-invoice-heading"
    >
      <div className="flex items-start gap-3 p-5 sm:p-6">
        <span className="rounded-xl bg-orange-50 p-2.5 text-orange-700">
          <FileText aria-hidden="true" className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="tax-invoice-heading" className="text-base font-semibold text-slate-900">
            ใบกำกับภาษี
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            ระบุข้อมูลผู้เสียภาษีเพื่อขอใบกำกับภาษีเต็มรูปแบบ
          </p>
        </div>
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={enabled}
            onChange={(event) => {
              const nextEnabled = event.target.checked;
              setEnabled(nextEnabled);
              onEnabledChange?.(nextEnabled);
              setSubmitted(false);
              setSaved(false);
              if (!nextEnabled) {
                setSubmitError(null);
                void Promise.resolve(onSubmit(null)).catch((error: unknown) => {
                  setSubmitError(
                    error instanceof Error
                      ? error.message
                      : "ไม่สามารถยกเลิกข้อมูลใบกำกับภาษีได้",
                  );
                });
              }
            }}
            aria-label="ต้องการใบกำกับภาษีเต็มรูปแบบ"
          />
          <span className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-orange-600 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-orange-600" />
          <span className="pointer-events-none absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
        </label>
      </div>

      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
          enabled ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          {enabled ? (
            <div className="border-t border-slate-100 px-5 pb-6 pt-5 sm:px-6">
              {profileLoading ? (
                <p className="mb-4 text-sm text-slate-500" role="status">
                  กำลังโหลดข้อมูลภาษีที่บันทึกไว้...
                </p>
              ) : null}
              {profileError ? (
                <div className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                  <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{profileError}</span>
                </div>
              ) : null}

              <form onSubmit={(event) => void handleSubmit(event)} noValidate>
                <fieldset className="mb-5">
                  <legend className="mb-2 text-sm font-medium text-slate-800">
                    ประเภทผู้เสียภาษี
                  </legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                        values.entityType === "INDIVIDUAL"
                          ? "border-orange-500 bg-orange-50/60"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="entityType"
                        value="INDIVIDUAL"
                        checked={values.entityType === "INDIVIDUAL"}
                        onChange={() => updateField("entityType", "INDIVIDUAL")}
                        className="accent-orange-600"
                      />
                      <UserRound aria-hidden="true" className="h-4 w-4 text-slate-500" />
                      <span className="text-sm font-medium text-slate-800">บุคคลธรรมดา</span>
                    </label>
                    <label
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                        values.entityType === "CORPORATION"
                          ? "border-orange-500 bg-orange-50/60"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="entityType"
                        value="CORPORATION"
                        checked={values.entityType === "CORPORATION"}
                        onChange={() => updateField("entityType", "CORPORATION")}
                        className="accent-orange-600"
                      />
                      <Building2 aria-hidden="true" className="h-4 w-4 text-slate-500" />
                      <span className="text-sm font-medium text-slate-800">
                        นิติบุคคล / บริษัท
                      </span>
                    </label>
                  </div>
                </fieldset>

                {values.entityType === "CORPORATION" ? (
                  <fieldset className="mb-5">
                    <legend className="mb-2 text-sm font-medium text-slate-800">
                      สาขา
                    </legend>
                    <div className="flex flex-wrap gap-4">
                      <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="radio"
                          name="branchType"
                          checked={values.branchType === "HEAD_OFFICE"}
                          onChange={() => {
                            setValues((current) => ({
                              ...current,
                              branchType: "HEAD_OFFICE",
                              branchCode: "00000",
                            }));
                            invalidateSubmittedData();
                          }}
                          className="accent-orange-600"
                        />
                        สำนักงานใหญ่
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="radio"
                          name="branchType"
                          checked={values.branchType === "BRANCH"}
                          onChange={() => {
                            setValues((current) => ({
                              ...current,
                              branchType: "BRANCH",
                              branchCode: current.branchCode === "00000" ? "" : current.branchCode,
                            }));
                            invalidateSubmittedData();
                          }}
                          className="accent-orange-600"
                        />
                        สาขา
                      </label>
                    </div>
                    {values.branchType === "BRANCH" ? (
                      <div className="mt-3 max-w-xs">
                        <label
                          htmlFor="tax-branch-code"
                          className="mb-1.5 block text-sm font-medium text-slate-700"
                        >
                          รหัสสาขา 5 หลัก
                        </label>
                        <input
                          id="tax-branch-code"
                          inputMode="numeric"
                          maxLength={5}
                          value={values.branchCode}
                          onChange={(event) =>
                            updateField("branchCode", event.target.value.replace(/\D/g, ""))
                          }
                          className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 ${
                            submitted && branchCodeError
                              ? "border-red-400 focus:ring-red-100"
                              : "border-slate-300 focus:border-orange-500 focus:ring-orange-100"
                          }`}
                        />
                      </div>
                    ) : null}
                  </fieldset>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="tax-company-name"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      {values.entityType === "CORPORATION" ? "ชื่อนิติบุคคล" : "ชื่อ-นามสกุล"}
                    </label>
                    <input
                      id="tax-company-name"
                      autoComplete="name"
                      value={values.companyOrName}
                      onChange={(event) => updateField("companyOrName", event.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="tax-id"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      เลขประจำตัวผู้เสียภาษี 13 หลัก
                    </label>
                    <input
                      id="tax-id"
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={13}
                      value={values.taxId}
                      onChange={(event) =>
                        updateField("taxId", event.target.value.replace(/\D/g, "").slice(0, 13))
                      }
                      aria-invalid={Boolean(taxIdError)}
                      aria-describedby={taxIdError ? "tax-id-error" : undefined}
                      className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 ${
                        taxIdError
                          ? "border-red-400 focus:ring-red-100"
                          : "border-slate-300 focus:border-orange-500 focus:ring-orange-100"
                      }`}
                    />
                    {taxIdError ? (
                      <p id="tax-id-error" className="mt-1.5 text-xs text-red-600" role="alert">
                        {taxIdError}
                      </p>
                    ) : values.taxId ? (
                      <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-emerald-700">
                        <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
                        เลขประจำตัวผ่านการตรวจสอบ
                      </p>
                    ) : null}
                  </div>

                  <div className="sm:col-span-2">
                    <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                      <label
                        htmlFor="tax-address-line"
                        className="text-sm font-medium text-slate-700"
                      >
                        ที่อยู่สำหรับออกใบกำกับภาษี
                      </label>
                      {shippingAddress ? (
                        <button
                          type="button"
                          onClick={useShippingAddress}
                          className="text-xs font-medium text-orange-700 underline decoration-orange-300 underline-offset-2 hover:text-orange-800"
                        >
                          ใช้ที่เดียวกับที่อยู่จัดส่ง
                        </button>
                      ) : null}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        id="tax-address-line"
                        value={values.addressLine}
                        onChange={(event) => updateField("addressLine", event.target.value)}
                        placeholder="เลขที่ / อาคาร / หมู่บ้าน"
                        className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      />
                      <input
                        value={values.addressVillage}
                        onChange={(event) => updateField("addressVillage", event.target.value)}
                        placeholder="หมู่ที่ (ถ้ามี)"
                        aria-label="หมู่ที่"
                        className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      />
                      <input
                        value={values.street}
                        onChange={(event) => updateField("street", event.target.value)}
                        placeholder="ถนน (ถ้ามี)"
                        aria-label="ถนน"
                        className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      />
                      <input
                        value={values.subdistrict}
                        onChange={(event) => updateField("subdistrict", event.target.value)}
                        placeholder="ตำบล / แขวง"
                        aria-label="ตำบลหรือแขวง"
                        className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      />
                      <input
                        value={values.district}
                        onChange={(event) => updateField("district", event.target.value)}
                        placeholder="อำเภอ / เขต"
                        aria-label="อำเภอหรือเขต"
                        className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      />
                      <input
                        value={values.province}
                        onChange={(event) => updateField("province", event.target.value)}
                        placeholder="จังหวัด"
                        aria-label="จังหวัด"
                        className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      />
                      <input
                        inputMode="numeric"
                        maxLength={5}
                        value={values.postalCode}
                        onChange={(event) =>
                          updateField("postalCode", event.target.value.replace(/\D/g, "").slice(0, 5))
                        }
                        placeholder="รหัสไปรษณีย์"
                        aria-label="รหัสไปรษณีย์"
                        className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="tax-email"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      อีเมลรับเอกสาร e-Tax
                    </label>
                    <input
                      id="tax-email"
                      type="email"
                      autoComplete="email"
                      value={values.contactEmail}
                      onChange={(event) => updateField("contactEmail", event.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="tax-phone"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      เบอร์โทรศัพท์
                    </label>
                    <input
                      id="tax-phone"
                      type="tel"
                      autoComplete="tel"
                      value={values.contactPhone}
                      onChange={(event) => updateField("contactPhone", event.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    />
                  </div>
                </div>

                <label className="mt-5 flex cursor-pointer items-start gap-2.5 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={values.saveForNextTime}
                    onChange={(event) => updateField("saveForNextTime", event.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-orange-600"
                  />
                  <span>บันทึกข้อมูลนี้ไว้ใช้ในการสั่งซื้อครั้งต่อไป</span>
                </label>

                {submitted && formErrors.length > 0 ? (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    <p className="font-medium">กรุณาตรวจสอบข้อมูลต่อไปนี้</p>
                    <ul className="mt-1 list-inside list-disc">
                      {formErrors.map((error) => (
                        <li key={error}>{error}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {submitError ? (
                  <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">
                    {submitError}
                  </p>
                ) : null}
                {saved ? (
                  <p className="mt-4 flex items-center gap-2 text-sm text-emerald-700" role="status">
                    <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                    บันทึกข้อมูลสำหรับคำสั่งซื้อนี้แล้ว
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={profileLoading}
                  className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  ใช้ข้อมูลใบกำกับภาษีนี้
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </div>

      <div className="border-t border-slate-100 px-5 py-4 sm:px-6">
        <h3 className="text-sm font-semibold text-slate-800">สรุปรายละเอียดภาษี</h3>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex items-center justify-between gap-4 text-slate-600">
            <dt>ยอดยกเว้นภาษี (หนังสือ/มังงะ)</dt>
            <dd className="font-medium text-slate-900">{formatBaht(summary.nonVatCents)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 text-slate-600">
            <dt>มูลค่าก่อนภาษี (ฟิกเกอร์/ค่าจัดส่ง)</dt>
            <dd className="font-medium text-slate-900">{formatBaht(summary.vatableNetCents)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 text-slate-600">
            <dt>ภาษีมูลค่าเพิ่ม 7%</dt>
            <dd className="font-medium text-slate-900">{formatBaht(summary.vatCents)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-3 text-base font-semibold text-slate-900">
            <dt>ยอดรวมสุทธิ</dt>
            <dd>{formatBaht(summary.totalCents)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          ค่าจัดส่งและสินค้าฟิกเกอร์คำนวณ VAT 7% แบบรวมภาษีแล้ว ส่วนหนังสือแสดงเป็นยอดยกเว้นภาษี
        </p>
      </div>
    </section>
  );
}

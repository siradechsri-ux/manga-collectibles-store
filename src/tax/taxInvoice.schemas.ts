import { z } from "zod";
import { isValidThaiTaxId } from "./thaiTaxValidator";

const taxIdSchema = z
  .string()
  .trim()
  .regex(/^\d{13}$/, "เลขประจำตัวผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก")
  .refine(isValidThaiTaxId, "เลขประจำตัวผู้เสียภาษีไม่ผ่านการตรวจสอบ");

const branchCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{5}$/, "รหัสสาขาต้องเป็นตัวเลข 5 หลัก");

export const taxInvoiceRequestSchema = z
  .object({
    entityType: z.enum(["INDIVIDUAL", "CORPORATION"]),
    taxId: taxIdSchema,
    companyOrName: z.string().trim().min(2).max(200),
    branchType: z.enum(["HEAD_OFFICE", "BRANCH"]).optional(),
    branchCode: branchCodeSchema.optional(),
    addressLine: z.string().trim().min(1).max(300),
    addressVillage: z.string().trim().max(100).optional().default(""),
    street: z.string().trim().max(150).optional().default(""),
    subdistrict: z.string().trim().min(1).max(120),
    district: z.string().trim().min(1).max(120),
    province: z.string().trim().min(1).max(120),
    postalCode: z.string().trim().regex(/^\d{5}$/, "รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก"),
    contactEmail: z.string().trim().email().max(320),
    contactPhone: z
      .string()
      .trim()
      .min(8)
      .max(30)
      .regex(/^[0-9+(). -]+$/, "รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง"),
    saveForNextTime: z.boolean().default(false),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.entityType === "INDIVIDUAL") {
      if (value.branchType !== undefined || value.branchCode !== undefined) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["branchType"],
          message: "บุคคลธรรมดาไม่ต้องระบุข้อมูลสาขา",
        });
      }
      return;
    }

    if (!value.branchType || !value.branchCode) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["branchCode"],
        message: "กรุณาระบุประเภทและรหัสสาขาของนิติบุคคล",
      });
      return;
    }
    if (value.branchType === "HEAD_OFFICE" && value.branchCode !== "00000") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["branchCode"],
        message: "สำนักงานใหญ่ใช้รหัสสาขา 00000",
      });
    }
    if (value.branchType === "BRANCH" && value.branchCode === "00000") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["branchCode"],
        message: "รหัส 00000 ใช้สำหรับสำนักงานใหญ่เท่านั้น",
      });
    }
  });

export const taxInvoiceOrderParamsSchema = z
  .object({
    orderId: z
      .string()
      .regex(/^[1-9]\d*$/, "หมายเลขคำสั่งซื้อต้องเป็นจำนวนเต็มบวก")
      .transform(Number)
      .refine(Number.isSafeInteger, "หมายเลขคำสั่งซื้อเกินค่าที่ระบบรองรับ"),
  })
  .strict();

export const taxInvoiceIdParamsSchema = z
  .object({
    taxInvoiceId: z
      .string()
      .regex(/^[1-9]\d*$/, "หมายเลขใบกำกับภาษีต้องเป็นจำนวนเต็มบวก")
      .transform(Number)
      .refine(Number.isSafeInteger, "หมายเลขใบกำกับภาษีเกินค่าที่ระบบรองรับ"),
  })
  .strict();

export type TaxInvoiceRequest = z.infer<typeof taxInvoiceRequestSchema>;

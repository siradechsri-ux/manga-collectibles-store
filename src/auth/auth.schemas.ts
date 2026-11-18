import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร")
  .max(72, "รหัสผ่านต้องไม่เกิน 72 ไบต์")
  .refine(
    (password) => Buffer.byteLength(password, "utf8") <= 72,
    "รหัสผ่านต้องไม่เกิน 72 ไบต์",
  );

const loginPasswordSchema = z
  .string()
  .min(1)
  .max(72)
  .refine(
    (password) => Buffer.byteLength(password, "utf8") <= 72,
    "รหัสผ่านต้องไม่เกิน 72 ไบต์",
  );

export const registerSchema = z
  .object({
    email: z.string().trim().email("รูปแบบอีเมลไม่ถูกต้อง").max(255),
    password: passwordSchema,
    full_name: z.string().trim().min(1).max(150),
    phone: z
      .preprocess(
        (v) => (typeof v === "string" ? v.replace(/\D/g, "") : v),
        z.string().regex(/^\d{10}$/, "เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก"),
      )
      .optional(),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().trim().email("รูปแบบอีเมลไม่ถูกต้อง").max(255),
    password: loginPasswordSchema,
  })
  .strict();

export type RegisterRequestBody = z.infer<typeof registerSchema>;
export type LoginRequestBody = z.infer<typeof loginSchema>;

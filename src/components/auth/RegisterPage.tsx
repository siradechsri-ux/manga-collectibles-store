"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import { z } from "zod";
import { useAuth } from "../../contexts/AuthContext";

const registerFormSchema = z
  .object({
    fullName: z.string().trim().min(1, "กรุณากรอกชื่อ-นามสกุล").max(150),
    email: z.string().trim().email("กรุณากรอกอีเมลให้ถูกต้อง").max(255),
    phoneNumber: z.string().trim().max(20, "เบอร์โทรศัพท์ยาวเกินไป"),
    password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร").max(72),
    confirmPassword: z.string(),
  })
  .strict()
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน",
  });

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const parsed = registerFormSchema.safeParse({
      fullName,
      email,
      phoneNumber,
      password,
      confirmPassword,
    });
    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? "กรุณาตรวจสอบข้อมูล");
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        phoneNumber: parsed.data.phoneNumber || undefined,
        password: parsed.data.password,
      });
      setSuccessMessage("สมัครสมาชิกเรียบร้อยแล้ว กำลังไปหน้าเข้าสู่ระบบ...");
      window.setTimeout(() => router.replace("/login"), 800);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-4 py-10">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-9">
        <div className="mb-7 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
            <BookOpen size={27} aria-hidden="true" />
          </div>
          <p className="mt-4 text-sm font-semibold tracking-wide text-orange-700">
            MANGA & COLLECTIBLES
          </p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">
            สมัครสมาชิก
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            สร้างบัญชีเพื่อสั่งซื้อและติดตามคอลเลกชันของคุณ
          </p>
        </div>

        {errorMessage ? (
          <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}
        {successMessage ? (
          <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </p>
        ) : null}

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div>
            <label htmlFor="register-full-name" className="text-sm font-semibold text-slate-700">
              ชื่อ-นามสกุล
            </label>
            <div className="relative mt-1.5">
              <UserRound
                size={18}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="register-full-name"
                type="text"
                autoComplete="name"
                required
                maxLength={150}
                value={fullName}
                onChange={(event) => setFullName(event.currentTarget.value)}
                placeholder="ชื่อ นามสกุล"
                className="min-h-12 w-full rounded-xl border border-slate-200 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
            </div>
          </div>

          <div>
            <label htmlFor="register-email" className="text-sm font-semibold text-slate-700">
              อีเมล
            </label>
            <div className="relative mt-1.5">
              <Mail
                size={18}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="register-email"
                type="email"
                autoComplete="email"
                required
                maxLength={255}
                value={email}
                onChange={(event) => setEmail(event.currentTarget.value)}
                placeholder="you@example.com"
                className="min-h-12 w-full rounded-xl border border-slate-200 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
            </div>
          </div>

          <div>
            <label htmlFor="register-phone" className="text-sm font-semibold text-slate-700">
              เบอร์โทรศัพท์ <span className="font-normal text-slate-400">(ไม่บังคับ)</span>
            </label>
            <input
              id="register-phone"
              type="tel"
              autoComplete="tel"
              maxLength={20}
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.currentTarget.value)}
              placeholder="08X-XXX-XXXX"
              className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />
          </div>

          <div>
            <label htmlFor="register-password" className="text-sm font-semibold text-slate-700">
              รหัสผ่าน
            </label>
            <div className="relative mt-1.5">
              <LockKeyhole
                size={18}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="register-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={72}
                value={password}
                onChange={(event) => setPassword(event.currentTarget.value)}
                placeholder="อย่างน้อย 8 ตัวอักษร"
                className="min-h-12 w-full rounded-xl border border-slate-200 pl-11 pr-12 text-sm outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                {showPassword ? (
                  <EyeOff size={18} aria-hidden="true" />
                ) : (
                  <Eye size={18} aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="register-confirm-password" className="text-sm font-semibold text-slate-700">
              ยืนยันรหัสผ่าน
            </label>
            <input
              id="register-confirm-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={72}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.currentTarget.value)}
              placeholder="กรอกรหัสผ่านอีกครั้ง"
              className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "กำลังสมัครสมาชิก..." : "สร้างบัญชี"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          มีบัญชีอยู่แล้ว?{" "}
          <Link href="/login" className="font-bold text-orange-700 hover:text-orange-800">
            เข้าสู่ระบบ
          </Link>
        </p>
      </section>
    </main>
  );
}

"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, Eye, EyeOff, LockKeyhole, Mail, ShieldAlert } from "lucide-react";
import { z } from "zod";
import { useAuth } from "../../contexts/AuthContext";

const loginFormSchema = z
  .object({
    email: z.string().trim().email("กรุณากรอกอีเมลให้ถูกต้อง"),
    password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"),
  })
  .strict();

const rememberEmailKey = "manga-store-remembered-email";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, quickLogin, isAuthenticated, isLoading } = useAuth();
  const isMockMode = process.env.NEXT_PUBLIC_USE_MOCK === "true";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const rememberedEmail = window.localStorage.getItem(rememberEmailKey);
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const redirectPath = searchParams.get("redirect");
      router.replace(redirectPath?.startsWith("/") ? redirectPath : "/account");
    }
  }, [isAuthenticated, isLoading, router, searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const parsed = loginFormSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? "กรุณาตรวจสอบข้อมูล");
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await login(parsed.data);
      if (rememberMe) {
        window.localStorage.setItem(rememberEmailKey, parsed.data.email);
      } else {
        window.localStorage.removeItem(rememberEmailKey);
      }

      const redirectPath = searchParams.get("redirect");
      const safeRedirect =
        redirectPath?.startsWith("/") && !redirectPath.startsWith("//")
          ? redirectPath
          : null;
      const defaultPath =
        user.role === "ADMIN"
          ? "/admin"
          : user.role === "STAFF"
            ? "/staff/packing"
            : user.role === "FINANCE"
              ? "/finance/slips"
              : "/account/orders";
      router.replace(
        isMockMode ? "/" : safeRedirect ?? defaultPath,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleQuickLogin(
    role: "CUSTOMER" | "ADMIN" | "STAFF" | "FINANCE",
  ) {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const user = await quickLogin(role);
      const redirectPath = searchParams.get("redirect");
      const safeRedirect =
        redirectPath?.startsWith("/") && !redirectPath.startsWith("//")
          ? redirectPath
          : null;
      const destination =
        user.role === "ADMIN"
          ? "/admin"
          : user.role === "STAFF"
            ? "/staff/packing"
            : user.role === "FINANCE"
              ? "/finance/slips"
              : "/account/orders";
      router.replace(isMockMode ? "/" : safeRedirect ?? destination);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "เข้าสู่ระบบทดสอบไม่สำเร็จ",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function showSocialSignInNotice(provider: "Google" | "LINE") {
    setErrorMessage(`การเข้าสู่ระบบด้วย ${provider} ยังไม่เปิดให้บริการ`);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-9">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
            <BookOpen size={27} aria-hidden="true" />
          </div>
          <p className="mt-4 text-sm font-semibold tracking-wide text-orange-700">
            MANGA & COLLECTIBLES
          </p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">
            ยินดีต้อนรับกลับมา
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            เข้าสู่ระบบเพื่อจัดการคำสั่งซื้อและรายการโปรด
          </p>
        </div>

        {searchParams.get("reason") === "forbidden" ? (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
          >
            <ShieldAlert size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
            บัญชีนี้ไม่มีสิทธิ์เข้าถึงหน้าเจ้าหน้าที่
          </div>
        ) : null}

        {errorMessage ? (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
          >
            {errorMessage}
          </div>
        ) : null}

        {isMockMode ? (
          <section
            aria-labelledby="quick-test-login-heading"
            className="mb-6 rounded-2xl border border-violet-200 bg-violet-50 p-4"
          >
            <h2
              id="quick-test-login-heading"
              className="text-sm font-extrabold text-violet-950"
            >
              เข้าสู่ระบบทดสอบ: ลูกค้า / ผู้ดูแลระบบ / พนักงาน
            </h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void handleQuickLogin("CUSTOMER")}
                className="min-h-10 rounded-xl border border-violet-200 bg-white px-3 text-sm font-bold text-violet-900 hover:bg-violet-100 disabled:opacity-50"
              >
                เข้าสู่ระบบเป็นลูกค้า
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void handleQuickLogin("ADMIN")}
                className="min-h-10 rounded-xl border border-violet-200 bg-white px-3 text-sm font-bold text-violet-900 hover:bg-violet-100 disabled:opacity-50"
              >
                เข้าสู่ระบบเป็น Admin
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void handleQuickLogin("STAFF")}
                className="min-h-10 rounded-xl border border-violet-200 bg-white px-3 text-sm font-bold text-violet-900 hover:bg-violet-100 disabled:opacity-50"
              >
                เข้าสู่ระบบเป็น Staff
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void handleQuickLogin("FINANCE")}
                className="min-h-10 rounded-xl border border-emerald-200 bg-white px-3 text-sm font-bold text-emerald-900 hover:bg-emerald-100 disabled:opacity-50 sm:col-span-2"
              >
                เข้าสู่ระบบเป็นฝ่ายการเงิน
              </button>
            </div>
          </section>
        ) : null}

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="text-sm font-semibold text-slate-700">
              อีเมล
            </label>
            <div className="relative mt-1.5">
              <Mail
                size={18}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="login-email"
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.currentTarget.value)}
                placeholder="you@example.com"
                className="min-h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" className="text-sm font-semibold text-slate-700">
              รหัสผ่าน
            </label>
            <div className="relative mt-1.5">
              <LockKeyhole
                size={18}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.currentTarget.value)}
                placeholder="กรอกรหัสผ่าน"
                className="min-h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                {showPassword ? (
                  <EyeOff size={18} aria-hidden="true" />
                ) : (
                  <Eye size={18} aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.currentTarget.checked)}
                className="h-4 w-4 rounded border-slate-300 accent-orange-600"
              />
              จดจำอีเมลของฉัน
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-slate-200" />
          <span className="text-xs font-medium text-slate-400">หรือเข้าสู่ระบบด้วย</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => showSocialSignInNotice("Google")}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <span className="font-extrabold text-base text-blue-600" aria-hidden="true">
              G
            </span>
            Google
          </button>
          <button
            type="button"
            onClick={() => showSocialSignInNotice("LINE")}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <span
              className="flex h-5 w-5 items-center justify-center rounded-md bg-[#06C755] text-[10px] font-extrabold text-white"
              aria-hidden="true"
            >
              L
            </span>
            LINE
          </button>
        </div>

        <p className="mt-7 text-center text-sm text-slate-500">
          ยังไม่มีบัญชี?{" "}
          <Link
            href="/register"
            className="font-bold text-orange-700 transition hover:text-orange-800"
          >
            สมัครสมาชิก
          </Link>
        </p>
      </section>
    </main>
  );
}

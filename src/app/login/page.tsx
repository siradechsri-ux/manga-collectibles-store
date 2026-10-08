import { Suspense } from "react";
import LoginPage from "../../components/auth/LoginPage";

export default function LoginRoutePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5]">
          <p className="text-sm text-slate-500">กำลังโหลดหน้าเข้าสู่ระบบ...</p>
        </main>
      }
    >
      <LoginPage />
    </Suspense>
  );
}

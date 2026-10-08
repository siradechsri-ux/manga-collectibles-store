import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function AccessDeniedPage() {
  return (
    <main className="mx-auto flex min-h-[65vh] max-w-xl flex-col items-center justify-center px-5 text-center">
      <span className="rounded-2xl bg-red-50 p-4 text-red-700">
        <ShieldAlert size={32} aria-hidden="true" />
      </span>
      <p className="mt-5 text-sm font-bold uppercase tracking-wider text-red-700">
        HTTP 403 · Access Denied
      </p>
      <h1 className="mt-2 text-2xl font-extrabold text-slate-950">
        ไม่มีสิทธิ์เข้าถึงหน้านี้
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        บทบาทของบัญชีนี้ไม่สามารถเปิดหน้านี้ได้ กรุณาเข้าสู่หน้าทำงานที่ได้รับอนุญาต
      </p>
      <Link
        href="/"
        className="mt-5 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
      >
        กลับหน้าร้าน
      </Link>
    </main>
  );
}

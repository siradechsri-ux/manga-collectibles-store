"use client";

import { Award, BookOpen, ShieldCheck, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import ChanSasomLogo from "../brand/ChanSasomLogo";

interface TeamMember {
  index: string;
  studentId: string;
  fullName: string;
}

const PROJECT_CREDITS: readonly TeamMember[] = [
  { index: "01", studentId: "67120669", fullName: "Siradech Srium" },
  { index: "02", studentId: "67107666", fullName: "Kittiwat Kudan" },
  { index: "03", studentId: "67125897", fullName: "Supavich Chuesathum" },
];

const QUICK_LINKS = [
  { href: "/collections/manga", label: "มังงะลิขสิทธิ์แท้" },
  { href: "/collections/light-novel", label: "ไลท์โนเวล" },
  { href: "/collections/figures", label: "ฟิกเกอร์ & โมเดล" },
  { href: "/collections/gunpla", label: "กันพลา / พลาโม" },
  { href: "/collections/goods", label: "กู้ดส์สะสม" },
  { href: "/kuji", label: "จับฉลาก Kuji" },
] as const;

export default function Footer() {
  return (
    <footer className="relative border-t border-zinc-200/80 bg-white text-zinc-700 transition-colors dark:border-zinc-800/90 dark:bg-zinc-950 dark:text-zinc-300 print:hidden">
      {/* Subtle Top Gradient Accent */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/60 to-transparent"
      />

      <div className="mx-auto max-w-7xl px-4 pt-10 pb-24 sm:px-6 lg:px-8 lg:pt-12 lg:pb-20">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
          {/* Column 1: Brand & Store Highlights */}
          <div className="lg:col-span-4 space-y-4">
            <ChanSasomLogo size="md" href="/" />
            <p className="max-w-sm text-xs leading-6 text-zinc-600 dark:text-zinc-400 sm:text-sm">
              ศูนย์รวมมังงะ ไลท์โนเวล ฟิกเกอร์สเกล กันพลา และของสะสมอนิเมะลิขสิทธิ์แท้
              พร้อมระบบพรีออเดอร์ สะสมแต้ม และจับฉลาก Ichiban Kuji ครบวงจร
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200/80 bg-orange-50 px-2.5 py-1 text-[11px] font-bold text-orange-800 dark:border-orange-900/60 dark:bg-orange-950/50 dark:text-orange-300">
                <ShieldCheck size={13} aria-hidden="true" />
                ของแท้ลิขสิทธิ์ 100%
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200/80 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-300">
                <BookOpen size={13} aria-hidden="true" />
                หนังสือยกเว้น VAT 0%
              </span>
            </div>
          </div>

          {/* Column 2: Quick Navigation */}
          <div className="lg:col-span-3">
            <h2 className="text-xs font-black uppercase tracking-[0.14em] text-zinc-900 dark:text-zinc-100">
              หมวดสินค้าหลัก
            </h2>
            <ul className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs font-semibold sm:text-sm lg:grid-cols-1">
              {QUICK_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex items-center gap-1.5 text-zinc-600 transition hover:text-orange-600 dark:text-zinc-400 dark:hover:text-orange-400"
                  >
                    <span
                      aria-hidden="true"
                      className="h-1 w-1 rounded-full bg-orange-500/70"
                    />
                    <span>{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Credits & License Card */}
          <div className="lg:col-span-5">
            <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-gradient-to-br from-zinc-50 via-white to-orange-50/40 p-4 shadow-2xs sm:p-5 dark:border-zinc-800 dark:from-zinc-900/90 dark:via-zinc-900 dark:to-orange-950/20">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200/70 pb-3 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-100 text-orange-700 dark:bg-orange-950/70 dark:text-orange-400">
                    <Users size={16} aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-sm font-black tracking-tight text-zinc-950 dark:text-zinc-50">
                      ผู้จัดทำ / License
                    </h2>
                    <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                      Project Credits & Contributors
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-orange-200/80 bg-orange-50 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/60 dark:text-orange-300">
                  <Award size={11} aria-hidden="true" />
                  Academic License
                </span>
              </div>

              <ul className="mt-3.5 space-y-2" aria-label="รายชื่อผู้จัดทำ">
                {PROJECT_CREDITS.map((member) => (
                  <li
                    key={member.studentId}
                    className="group flex items-center justify-between gap-3 rounded-xl border border-zinc-200/80 bg-white/90 px-3.5 py-2.5 transition hover:border-orange-300 hover:shadow-xs dark:border-zinc-800 dark:bg-zinc-950/70 dark:hover:border-orange-800/80"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-[11px] font-black text-orange-400 transition group-hover:bg-orange-600 group-hover:text-white dark:bg-zinc-800 dark:text-orange-400 dark:group-hover:bg-orange-500 dark:group-hover:text-zinc-950">
                        {member.index}
                      </span>
                      <span className="truncate text-xs font-extrabold text-zinc-900 sm:text-sm dark:text-zinc-100">
                        {member.fullName}
                      </span>
                    </div>
                    <span className="shrink-0 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-mono text-[11px] font-bold tracking-wide text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                      {member.studentId}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Copyright & License Bar */}
        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-zinc-200/80 pt-6 text-center text-xs text-zinc-500 sm:flex-row sm:text-left dark:border-zinc-800 dark:text-zinc-400">
          <p className="font-medium">
            © {new Date().getFullYear()} <span className="font-bold text-zinc-800 dark:text-zinc-200">ChanSasom</span> · Manga & Collectibles E-Commerce Platform
          </p>
          <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
            <Sparkles size={12} className="text-orange-500" aria-hidden="true" />
            <span>Licensed for Educational & Project Showcase Purposes</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

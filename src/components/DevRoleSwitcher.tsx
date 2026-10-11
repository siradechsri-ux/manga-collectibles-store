"use client";

import { useEffect, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  Loader2,
  Package,
  ShieldCheck,
  UserRound,
  Wallet,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const ROLES = [
  {
    key: "CUSTOMER" as const,
    label: "ลูกค้า",
    sublabel: "Customer",
    icon: UserRound,
  },
  {
    key: "STAFF" as const,
    label: "เจ้าหน้าที่คลัง",
    sublabel: "Staff",
    icon: Package,
  },
  {
    key: "FINANCE" as const,
    label: "ฝ่ายการเงิน",
    sublabel: "Finance",
    icon: Wallet,
  },
  {
    key: "ADMIN" as const,
    label: "ผู้ดูแลระบบ",
    sublabel: "Admin",
    icon: ShieldCheck,
  },
] as const;

const ROLE_LANDING_PAGES: Record<"CUSTOMER" | "STAFF" | "FINANCE" | "ADMIN", string> = {
  CUSTOMER: "/",
  STAFF: "/staff/packing",
  FINANCE: "/finance/slips",
  ADMIN: "/admin",
};

export default function DevRoleSwitcher({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const { user, quickLogin } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || process.env.NEXT_PUBLIC_USE_MOCK !== "true") {
    return null;
  }

  async function handleSwitch(role: "CUSTOMER" | "STAFF" | "FINANCE" | "ADMIN") {
    // ปิด Drawer / Dropdown ทันทีเมื่อคลิกเลือก
    setIsExpanded(false);
    setSwitching(true);

    try {
      // 1. บันทึกบทบาทลงใน localStorage
      if (typeof window !== "undefined") {
        window.localStorage.setItem("mock_current_role", role);
      }

      // 2. ล็อกอินเข้าสู่บทบาทจำลอง
      await quickLogin(role);

      // 3. กำหนดเวลา Transition นุ่มนวล 400ms ก่อนพาไปยังหน้าปลายทาง
      await new Promise((resolve) => setTimeout(resolve, 400));

      // 4. กำหนดเส้นทางหน้าเริ่มต้นตามบทบาท
      const targetPath = ROLE_LANDING_PAGES[role] ?? "/";

      // 5. Hard Refresh หน้าเว็บด้วย window.location.href เพื่อเคลียร์ State และโหลด Navbar ใหม่ 100%
      if (typeof window !== "undefined") {
        window.location.href = targetPath;
      }
    } catch (error) {
      console.error("Failed to switch mock role:", error);
      setSwitching(false);
    }
  }

  const currentRole = ROLES.find((r) => r.key === user?.role) ?? ROLES[0];
  const CurrentIcon = currentRole.icon;

  if (embedded) {
    return (
      <>
        <div className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900">
          {ROLES.map(({ key, label, icon: Icon }) => {
            const isActive = user?.role === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => void handleSwitch(key)}
                disabled={switching}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                  isActive
                    ? "bg-orange-600 text-white shadow-xs"
                    : "text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                }`}
              >
                <Icon size={13} aria-hidden="true" />
                <span>{label}</span>
                {isActive ? <Check size={12} aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
        {switching ? (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-orange-500" aria-hidden="true" />
            <p className="text-sm font-bold text-white tracking-wide">
              กำลังสลับบทบาทผู้ใช้...
            </p>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <>
      <aside
        aria-label="ตัวสลับบทบาทสำหรับทดสอบระบบ"
        className="fixed bottom-4 right-4 z-40 select-none shadow-2xl transition-all"
      >
      <div className="overflow-hidden rounded-2xl border border-zinc-300/80 bg-white/95 backdrop-blur-md shadow-xl dark:border-zinc-700/80 dark:bg-zinc-900/95">
        {/* Switcher Header Pill */}
        <div
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex cursor-pointer items-center justify-between gap-3 border-b border-zinc-100 px-3.5 py-2 hover:bg-zinc-50/50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
        >
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300">
              <FlaskConical size={14} aria-hidden="true" />
            </span>
            <span className="text-xs font-black tracking-tight text-zinc-900 dark:text-zinc-100">
              โหมดทดสอบบทบาท
            </span>
            {switching ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-800 dark:bg-orange-950 dark:text-orange-300">
                <Loader2 size={11} className="animate-spin" aria-hidden="true" />
                กำลังสลับบทบาท...
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-extrabold text-orange-800 dark:bg-orange-950 dark:text-orange-300">
                <CurrentIcon size={11} aria-hidden="true" />
                {currentRole.label}
              </span>
            )}
          </div>
          <button
            type="button"
            aria-label={isExpanded ? "ย่อแถบสลับบทบาท" : "ขยายแถบสลับบทบาท"}
            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>

        {/* Role buttons list when expanded */}
        {isExpanded ? (
          <div className="grid grid-cols-2 gap-1.5 p-2 sm:grid-cols-4">
            {ROLES.map(({ key, label, sublabel, icon: Icon }) => {
              const isActive = user?.role === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => void handleSwitch(key)}
                  disabled={switching}
                  className={`flex flex-col items-center justify-center gap-1 rounded-xl p-2 text-center transition ${
                    isActive
                      ? "border border-orange-500/50 bg-orange-50 font-black text-orange-900 ring-2 ring-orange-200 dark:bg-orange-950/60 dark:text-orange-200 dark:ring-orange-900/60"
                      : "border border-zinc-200/80 bg-zinc-50 font-semibold text-zinc-700 hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                      isActive
                        ? "bg-orange-600 text-white"
                        : "bg-white text-zinc-600 shadow-2xs dark:bg-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    <Icon size={14} aria-hidden="true" />
                  </div>
                  <span className="text-[11px] leading-none">{label}</span>
                  <span className="text-[9px] font-medium text-zinc-500 dark:text-zinc-400">
                    {sublabel}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
      </aside>
      {switching ? (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
          <Loader2 className="mb-3 h-8 w-8 animate-spin text-orange-500" aria-hidden="true" />
          <p className="text-sm font-bold text-white tracking-wide">
            กำลังสลับบทบาทผู้ใช้...
          </p>
        </div>
      ) : null}
    </>
  );
}

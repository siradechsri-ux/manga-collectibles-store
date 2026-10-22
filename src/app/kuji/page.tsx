"use client";

import {
  AlertCircle,
  ArrowRight,
  Award,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Gift,
  History,
  Layers,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Tag,
  Ticket,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../contexts/AuthContext";
import {
  drawKujiTicket,
  getKujiConfig,
  getKujiHistory,
  getKujiPrizes,
  getRemainingKujiTickets,
  resetKujiBox,
  subscribeKuji,
  type KujiConfig,
  type KujiDrawResult,
  type KujiPrize,
} from "../../services/kuji.service";
import { getUserPoints, subscribeUserPoints } from "../../services/points.service";
import CartDrawer from "../../components/CartDrawer";
import KujiTicketRevealModal from "../../components/KujiTicketRevealModal";
import PointBadge from "../../components/PointBadge";
import { canShop } from "../../utils/permissions";

function gradeBadgeColor(grade: string): string {
  switch (grade) {
    case "A":
      return "bg-amber-500 text-white shadow-sm ring-2 ring-amber-300";
    case "B":
      return "bg-rose-500 text-white shadow-sm ring-2 ring-rose-300";
    case "C":
      return "bg-purple-600 text-white shadow-sm ring-2 ring-purple-300";
    case "D":
      return "bg-blue-600 text-white shadow-sm ring-2 ring-blue-300";
    default:
      return "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300";
  }
}

export default function KujiPage() {
  const { user } = useAuth();
  const { items, addItem } = useCart();
  const [config, setConfig] = useState<KujiConfig>(() => getKujiConfig());
  const [prizes, setPrizes] = useState<KujiPrize[]>(() => getKujiPrizes());
  const [points, setPoints] = useState<number>(450);
  const [remainingTickets, setRemainingTickets] = useState<number>(28);
  const [history, setHistory] = useState<KujiDrawResult[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentWinResult, setCurrentWinResult] = useState<KujiDrawResult | null>(null);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    setPoints(getUserPoints());
    setConfig(getKujiConfig());
    setPrizes(getKujiPrizes());
    setRemainingTickets(getRemainingKujiTickets());
    setHistory(getKujiHistory());

    const unsubPoints = subscribeUserPoints((nextPoints) => {
      setPoints(nextPoints);
    });

    const unsubKuji = subscribeKuji(() => {
      setConfig(getKujiConfig());
      setPrizes(getKujiPrizes());
      setRemainingTickets(getRemainingKujiTickets());
      setHistory(getKujiHistory());
    });

    return () => {
      unsubPoints();
      unsubKuji();
    };
  }, []);

  const userCanShop = canShop(user?.role);

  const handleDraw = () => {
    setErrorMessage(null);
    if (!userCanShop) {
      setErrorMessage(
        user?.role === "ADMIN"
          ? "คุณเข้าสู่ระบบด้วยบัญชี Admin กรุณาไปที่ระบบจัดการตู้หลังบ้าน (/admin/kuji)"
          : "บัญชีเจ้าหน้าที่ (Staff/Finance) ไม่สามารถสุ่มตั๋วของลูกค้าได้",
      );
      return;
    }
    if (points < config.pointsPerDraw) {
      setErrorMessage(
        `คุณมีแต้มสะสมไม่เพียงพอ (ต้องการ ${config.pointsPerDraw} P, ปัจจุบันมี ${points} P)`,
      );
      return;
    }

    const res = drawKujiTicket();
    if (res.success && res.result) {
      setCurrentWinResult(res.result);
      setRemainingTickets(getRemainingKujiTickets());
      setHistory(getKujiHistory());
    } else {
      setErrorMessage(res.message || "เกิดข้อผิดพลาดในการเปิดตั๋ว");
    }
  };

  const handleClaimPrize = (prize: KujiPrize) => {
    if (prize.isDiscountCode) {
      if (prize.discountCode) {
        navigator.clipboard.writeText(prize.discountCode);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 3000);
      }
      return;
    }

    if (!userCanShop) {
      setErrorMessage("เฉพาะบัญชีลูกค้าเท่านั้นที่สามารถรับของรางวัลลงตะกร้าได้");
      return;
    }

    // Add winning merchandise to cart with price 0
    addItem({
      kind: "GOODS",
      id: 99000 + Math.floor(Math.random() * 1000),
      name: `[รางวัล Ichiban Kuji] ${prize.title}`,
      image: prize.imageUrl,
      coverImage: prize.imageUrl,
      imageUrl: prize.imageUrl,
      fullPrice: 0,
      quantity: 1,
      subcategory: "REWARD",
      isReward: true,
      pointsSpent: 0,
    });

    setCurrentWinResult(null);
    setCartDrawerOpen(true);
  };

  const handleResetBox = () => {
    if (user?.role !== "ADMIN") return;
    resetKujiBox();
    setRemainingTickets(config.totalTicketsBox);
  };

  return (
    <>
      <main className="min-h-screen bg-zinc-50/70 pb-16 pt-8 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav
            aria-label="Breadcrumb"
            className="mb-6 flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400"
          >
            <Link href="/" className="hover:text-blue-600 transition">
              หน้าแรก
            </Link>
            <span>/</span>
            <Link href="/rewards" className="hover:text-blue-600 transition">
              ระบบสมาชิก
            </Link>
            <span>/</span>
            <span className="text-zinc-900 dark:text-zinc-100">
              ตู้จับฉลากอิชิบังกุจิ (Ichiban Kuji)
            </span>
          </nav>

          {/* Hero Section */}
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950 p-6 sm:p-10 text-white shadow-xl mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-black tracking-wide text-amber-300">
                  <Ticket size={14} aria-hidden="true" />
                  <span>JAPAN ICHIBAN KUJI SPECIAL BOX</span>
                </div>
                <h1 className="mt-3 text-2xl sm:text-4xl font-black tracking-tight">
                  {config.title}
                </h1>
                <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                  ใช้เพียง {config.pointsPerDraw} P ต่อ 1 ตั๋ว ลุ้นรับฟิกเกอร์แท้สเกล 1/7,
                  สแตนดี้อะคริลิก และของสะสมลิขสิทธิ์แท้พร้อมส่งถึงบ้านทันที
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-4 text-xs font-bold">
                  <div className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 border border-white/15">
                    <PointBadge size="xs" />
                    <span>ค่าตั๋วสุ่ม: {config.pointsPerDraw} แต้ม / ครั้ง</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 rounded-xl bg-blue-500/20 px-3 py-2 border border-blue-400/30 text-blue-200">
                    <Trophy size={14} className="text-amber-400" />
                    <span>รางวัลการันตี 100% ไม่มีตั๋วเปล่า</span>
                  </div>
                </div>
              </div>

              {/* Draw Action Card */}
              <div className="rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur-md text-center max-w-sm w-full shrink-0">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  ตั๋วคงเหลือในตู้เซ็ตนี้
                </p>
                <div className="mt-1 flex items-baseline justify-center gap-1.5">
                  <span className="text-4xl font-black text-amber-400 tabular-nums">
                    {remainingTickets}
                  </span>
                  <span className="text-sm font-bold text-slate-300">
                    / {config.totalTicketsBox} ตั๋ว
                  </span>
                </div>

                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all duration-500"
                    style={{
                      width: `${(remainingTickets / config.totalTicketsBox) * 100}%`,
                    }}
                  />
                </div>

                <div className="mt-6">
                  {userCanShop ? (
                    <button
                      type="button"
                      disabled={isDrawing || remainingTickets <= 0}
                      onClick={handleDraw}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-xs sm:text-sm font-black text-zinc-950 shadow-lg shadow-amber-500/25 transition hover:bg-amber-400 active:scale-95 disabled:opacity-50"
                    >
                      {isDrawing ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          <span>กำลังเปิดตั๋วลุ้นรางวัล...</span>
                        </>
                      ) : (
                        <>
                          <Ticket size={16} />
                          <span>ฉีกตั๋วลุ้นรางวัล ({config.pointsPerDraw} P)</span>
                        </>
                      )}
                    </button>
                  ) : user?.role === "ADMIN" ? (
                    <Link
                      href="/admin/kuji"
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-xs sm:text-sm font-black text-zinc-950 shadow-lg shadow-amber-500/25 transition hover:bg-amber-400 active:scale-95"
                    >
                      <Sparkles size={16} />
                      <span>จัดการตู้ Kuji หลังบ้าน</span>
                    </Link>
                  ) : (
                    <div className="w-full rounded-xl bg-white/10 py-3 text-center text-xs font-bold text-slate-300">
                      <span>เฉพาะบัญชีลูกค้าสำหรับสุ่มรางวัล</span>
                    </div>
                  )}
                  <p className="mt-2 text-[11px] text-slate-400">
                    แต้มของคุณ: {points.toLocaleString("th-TH")} P
                  </p>
                </div>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="mb-8 flex items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
            >
              <div className="flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
              <button type="button" onClick={() => setErrorMessage(null)}>
                <X size={15} />
              </button>
            </div>
          )}

          {/* Section: Prize Showcase */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Award size={18} className="text-blue-600 dark:text-blue-400" />
                <span>รายการรางวัลในตู้เซ็ตนี้ (Prize Lineup)</span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                สุ่มได้ชิ้นใด ทางร้านจัดส่งพร้อมสินค้าในคำสั่งซื้อถัดไปของคุณ
              </p>
            </div>
            {user?.role === "ADMIN" && (
              <button
                type="button"
                onClick={handleResetBox}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-800 dark:text-amber-400"
              >
                <RefreshCw size={13} />
                <span>รีเซ็ตกล่อง (Admin Dev)</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {prizes.map((prize) => (
              <article
                key={prize.grade}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xs transition hover:border-blue-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div>
                  <div className="relative aspect-4/3 overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                    <img
                      src={prize.imageUrl}
                      alt={prize.title}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute left-3 top-3">
                      <span
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-xl font-black text-sm ${gradeBadgeColor(
                          prize.grade,
                        )}`}
                      >
                        {prize.grade}
                      </span>
                    </div>
                    <div className="absolute right-3 top-3">
                      <span className="rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
                        มูลค่า ฿{prize.valueBaht.toLocaleString("th-TH")}
                      </span>
                    </div>
                  </div>

                  <div className="p-4">
                    <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                      {prize.categoryName}
                    </p>
                    <h3 className="mt-1 text-sm font-bold text-zinc-900 dark:text-zinc-100 line-clamp-2">
                      {prize.title}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 line-clamp-3">
                      {prize.description}
                    </p>
                  </div>
                </div>

                <div className="border-t border-zinc-100 bg-zinc-50/50 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/50 flex items-center justify-between text-xs">
                  <span className="text-zinc-500 dark:text-zinc-400 font-medium">
                    โอกาสได้รับ:
                  </span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">
                    {prize.weight}%
                  </span>
                </div>
              </article>
            ))}
          </div>

          {/* Section: Your Draw History */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-4">
              <History size={16} className="text-blue-600 dark:text-blue-400" />
              <span>ประวัติการจับฉลากของคุณ ({history.length} รายการ)</span>
            </h3>

            {history.length === 0 ? (
              <p className="py-8 text-center text-xs text-zinc-400 dark:text-zinc-500">
                คุณยังไม่มีประวัติการเปิดตั๋วในเซ็ตนี้ กดปุ่ม &quot;ฉีกตั๋วลุ้นรางวัล&quot; ด้านบนเพื่อเริ่มลุ้นรางวัล!
              </p>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {history.map((item) => {
                  const isItemInCart = items.some((cartItem) => {
                    const itemName = "name" in cartItem ? cartItem.name : cartItem.title;
                    return itemName.includes(item.prize.title);
                  });
                  return (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-black text-xs ${gradeBadgeColor(
                            item.prize.grade,
                          )}`}
                        >
                          {item.prize.grade}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                            {item.prize.title}
                          </p>
                          <p className="text-[10px] text-zinc-400">
                            ตั๋วใบที่ #{item.ticketNumber} · {new Date(item.drawnAt).toLocaleString("th-TH")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                          มูลค่า ฿{item.prize.valueBaht.toLocaleString("th-TH")}
                        </span>
                        {!item.prize.isDiscountCode ? (
                          isItemInCart ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                              <Check size={12} aria-hidden="true" />
                              อยู่ในตะกร้า
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleClaimPrize(item.prize)}
                              className="inline-flex items-center gap-1 rounded-lg bg-orange-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs transition hover:bg-orange-700"
                            >
                              <ShoppingBag size={12} aria-hidden="true" />
                              ดึงลงตะกร้า (฿0)
                            </button>
                          )
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Animated Japanese Kuji Ticket Reveal Modal */}
      {currentWinResult && (
        <KujiTicketRevealModal
          result={currentWinResult}
          onClose={() => setCurrentWinResult(null)}
          onClaim={handleClaimPrize}
          onDrawAgain={() => {
            setCurrentWinResult(null);
            setTimeout(() => {
              handleDraw();
            }, 100);
          }}
          canDrawAgain={userCanShop && points >= config.pointsPerDraw && remainingTickets > 0}
          pointsPerDraw={config.pointsPerDraw}
          userPoints={points}
        />
      )}

      {/* Cart Drawer */}
      <CartDrawer isOpen={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />
    </>
  );
}

"use client";

import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Award,
  Bookmark,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Crown,
  Gift,
  Heart,
  History,
  Layers,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Tag,
  TrendingDown,
  TrendingUp,
  Truck,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../contexts/AuthContext";
import { useWishlist } from "../../contexts/WishlistContext";
import {
  addPoints,
  deductPoints,
  getPointsLedger,
  getUserPoints,
  getUserTier,
  MEMBER_TIERS,
  redeemReward,
  resetPoints,
  subscribePointsLedger,
  subscribeUserPoints,
  type MemberTier,
  type PointsLedgerEntry,
} from "../../services/points.service";
import {
  getRewardNumericId,
  listRewards,
  saveRewardItem,
  type RewardItem,
} from "../../mocks/rewards.mock";
import { canShop, getRoleHomeUrl } from "../../utils/permissions";
import CartDrawer from "../../components/CartDrawer";
import PointBadge from "../../components/PointBadge";

type RewardTab = "CATALOG" | "LEDGER" | "TIERS";
type LedgerFilter = "ALL" | "EARN" | "SPEND";

function categoryThai(category: RewardItem["category"]): string {
  switch (category) {
    case "BOOKMARK":
      return "ที่คั่นหนังสือ";
    case "POSTCARD":
      return "โปสการ์ด";
    case "ACRYLIC":
      return "อะคริลิก";
    case "ACCESSORY":
      return "อุปกรณ์";
    case "BADGE":
      return "เข็มกลัด";
    default:
      return "ของสะสม";
  }
}

function RewardCardIcon({ category }: { category: RewardItem["category"] }) {
  switch (category) {
    case "BOOKMARK":
      return (
        <Bookmark
          className="h-8 w-8 text-amber-600 dark:text-amber-400"
          aria-hidden="true"
        />
      );
    case "POSTCARD":
      return (
        <Gift
          className="h-8 w-8 text-rose-600 dark:text-rose-400"
          aria-hidden="true"
        />
      );
    case "ACRYLIC":
      return (
        <Award
          className="h-8 w-8 text-orange-600 dark:text-orange-400"
          aria-hidden="true"
        />
      );
    case "ACCESSORY":
      return (
        <ShieldCheck
          className="h-8 w-8 text-emerald-600 dark:text-emerald-400"
          aria-hidden="true"
        />
      );
    case "BADGE":
      return (
        <Tag
          className="h-8 w-8 text-blue-600 dark:text-blue-400"
          aria-hidden="true"
        />
      );
    default:
      return (
        <Sparkles
          className="h-8 w-8 text-purple-600 dark:text-purple-400"
          aria-hidden="true"
        />
      );
  }
}

function formatThaiDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

export default function RewardsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const userCanShop = canShop(user?.role);
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { addItem } = useCart();

  const [activeTab, setActiveTab] = useState<RewardTab>("CATALOG");
  const [ledgerFilter, setLedgerFilter] = useState<LedgerFilter>("ALL");
  const [points, setPoints] = useState<number>(450);
  const [ledger, setLedger] = useState<PointsLedgerEntry[]>([]);
  const [mounted, setMounted] = useState(false);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [rewardsList, setRewardsList] = useState<RewardItem[]>([]);

  // RBAC Route Protection: Redirect STAFF, FINANCE, ADMIN to their dedicated home
  useEffect(() => {
    if (authLoading) return;
    if (user && user.role !== "CUSTOMER") {
      router.replace(getRoleHomeUrl(user.role));
    }
  }, [authLoading, router, user]);

  // Sync points and rewards catalog & ledger
  useEffect(() => {
    setMounted(true);
    setPoints(getUserPoints());
    setLedger(getPointsLedger());
    setRewardsList(listRewards());

    const unsubPoints = subscribeUserPoints((nextPoints) => {
      setPoints(nextPoints);
    });

    const unsubLedger = subscribePointsLedger((nextLedger) => {
      setLedger(nextLedger);
    });

    return () => {
      unsubPoints();
      unsubLedger();
    };
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const currentTier = getUserTier(points);

  const handleRedeem = (reward: RewardItem) => {
    if (points < reward.pointsRequired) {
      return;
    }
    if (reward.stock <= 0) {
      return;
    }

    // Deduct points via service
    const success = redeemReward(
      reward.id,
      reward.pointsRequired,
      reward.title,
    );

    if (success) {
      // Add reward item to cart with price 0, isReward: true, and taxRate: 0
      addItem({
        kind: "GOODS",
        id: getRewardNumericId(reward.id),
        name: `[แลกแต้มฟรี] ${reward.title}`,
        image: reward.imageUrl,
        coverImage: reward.imageUrl,
        imageUrl: reward.imageUrl,
        fullPrice: 0,
        quantity: 1,
        subcategory: "REWARD",
        isReward: true,
        pointsSpent: reward.pointsRequired,
      });

      // Update local and persistent stock
      const newStock = Math.max(0, reward.stock - 1);
      saveRewardItem({ ...reward, stock: newStock });
      setRewardsList((current) =>
        current.map((item) =>
          item.id === reward.id
            ? { ...item, stock: newStock }
            : item,
        ),
      );

      setToastMessage("แลกของรางวัลสำเร็จ! เพิ่มลงในตะกร้าสินค้าแล้ว");
      setCartDrawerOpen(true);
    }
  };

  const handleAddPointsDev = () => {
    addPoints(100, "โหมดทดสอบ: เติมแต้มสะสมจำลอง (+100 P)", "DEV_BONUS");
    setToastMessage("เพิ่มแต้มจำลอง +100 P เรียบร้อยแล้ว");
  };

  const handleResetPointsDev = () => {
    resetPoints();
    setToastMessage("รีเซ็ตแต้มสะสมและประวัติกลับเป็นค่าเริ่มต้น (450 P) แล้ว");
  };

  const filteredLedger = ledger.filter((entry) => {
    if (ledgerFilter === "EARN") return entry.amount > 0;
    if (ledgerFilter === "SPEND") return entry.amount < 0;
    return true;
  });

  // Calculate progress to next tier
  const nextTierPoints = currentTier.nextTierMinPoints;
  const progressPercent = nextTierPoints
    ? Math.min(
        100,
        Math.round(
          ((points - currentTier.minPoints) /
            (nextTierPoints - currentTier.minPoints)) *
            100,
        ),
      )
    : 100;

  // If unauthorized user role (staff/finance/admin), show brief loader while redirecting
  if (!authLoading && user && user.role !== "CUSTOMER") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
          กำลังนำคุณไปยังหน้างานของระบบ...
        </p>
      </div>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-zinc-50/60 pb-16 pt-8 dark:bg-zinc-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb Navigation */}
          <nav
            aria-label="Breadcrumb"
            className="mb-6 flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400"
          >
            <Link
              href="/"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition"
            >
              หน้าแรก
            </Link>
            <span>/</span>
            <span className="text-zinc-900 dark:text-zinc-100">
              ระบบสมาชิกและของรางวัลสะสมแต้ม
            </span>
          </nav>

          {/* Page Header */}
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-extrabold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/40">
                <PointBadge size="xs" />
                <span>MEMBER REWARDS & LOYALTY PROGRAM</span>
              </div>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
                สะสมแต้มแลกของรางวัล (Member Rewards)
              </h1>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                ใช้แต้มสะสม (Blue P) แลกรับของสะสมลิขสิทธิ์แท้
                พร้อมระบบระดับสมาชิกและสิทธิพิเศษรอบด้าน
              </p>
            </div>

            <button
              type="button"
              onClick={() => setCartDrawerOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 text-xs font-bold text-zinc-800 shadow-2xs transition hover:border-blue-500 hover:text-blue-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-blue-500"
            >
              <ShoppingBag size={15} aria-hidden="true" />
              <span>เปิดตะกร้าสินค้า</span>
            </button>
          </div>

          {/* User Points Summary & Tier Card */}
          <div className="mb-8 overflow-hidden rounded-2xl border border-blue-100 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800 shadow-inner">
                  <PointBadge size="xl" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider dark:text-zinc-400">
                      แต้มสะสมปัจจุบันของคุณ
                    </p>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black tracking-wide ${currentTier.badgeClass}`}
                    >
                      <Crown size={12} aria-hidden="true" />
                      <span>
                        {currentTier.name} ({currentTier.subname}) · คูณแต้ม x
                        {currentTier.multiplier}
                      </span>
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-black tabular-nums text-blue-600 dark:text-blue-400">
                      {mounted ? points.toLocaleString("th-TH") : "..."}
                    </span>
                    <span className="inline-flex items-center gap-1 text-sm font-extrabold text-blue-600 dark:text-blue-400">
                      <PointBadge size="xs" /> แต้ม (Points)
                    </span>
                  </div>
                  {nextTierPoints ? (
                    <div className="mt-2 max-w-sm">
                      <div className="flex items-center justify-between text-[11px] font-bold text-zinc-500 dark:text-zinc-400 mb-1">
                        <span>
                          ความคืบหน้าสู่ระดับถัดไป (ต้องการอีก{" "}
                          {(nextTierPoints - points).toLocaleString("th-TH")}{" "}
                          แต้ม)
                        </span>
                        <span>{progressPercent}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-blue-600 transition-all duration-500"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                      <Star size={13} aria-hidden="true" />
                      <span>คุณอยู่ในระดับสูงสุด Platinum VIP แล้ว</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Dev Test Sandbox Controls */}
              <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-950/60">
                <div className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mr-1">
                  <Tag size={12} aria-hidden="true" />
                  <span>โหมดทดสอบ (Dev):</span>
                </div>
                <button
                  type="button"
                  onClick={handleAddPointsDev}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-bold text-zinc-800 shadow-2xs transition hover:border-blue-500 hover:text-blue-600 active:scale-95 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-blue-500"
                >
                  <PointBadge size="xs" />
                  <span>+100 แต้ม</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetPointsDev}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-bold text-zinc-800 shadow-2xs transition hover:border-zinc-400 hover:text-zinc-900 active:scale-95 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600"
                >
                  <RefreshCw size={13} aria-hidden="true" />
                  <span>รีเซ็ตแต้ม (450)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Navigation Tabs */}
          <div className="mb-6 flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("CATALOG")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
                activeTab === "CATALOG"
                  ? "bg-zinc-900 text-white shadow-xs dark:bg-zinc-100 dark:text-zinc-950"
                  : "bg-white text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800"
              }`}
            >
              <Gift size={15} aria-hidden="true" />
              <span>รายการของสะสมพร้อมแลก ({rewardsList.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("LEDGER")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
                activeTab === "LEDGER"
                  ? "bg-zinc-900 text-white shadow-xs dark:bg-zinc-100 dark:text-zinc-950"
                  : "bg-white text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800"
              }`}
            >
              <History size={15} aria-hidden="true" />
              <span>ประวัติแต้มสะสม ({ledger.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("TIERS")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
                activeTab === "TIERS"
                  ? "bg-zinc-900 text-white shadow-xs dark:bg-zinc-100 dark:text-zinc-950"
                  : "bg-white text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800"
              }`}
            >
              <Crown size={15} aria-hidden="true" />
              <span>ระดับสมาชิก & สิทธิพิเศษ VIP</span>
            </button>
          </div>

          {/* TAB 1: CATALOG CONTENT */}
          {activeTab === "CATALOG" && (
            <div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {rewardsList.map((reward) => {
                  const hasEnoughPoints =
                    mounted && points >= reward.pointsRequired;
                  const isOutOfStock = reward.stock <= 0;

                  return (
                    <article
                      key={reward.id}
                      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xs transition hover:border-blue-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-blue-800"
                    >
                      <div>
                        {/* Header Banner & Visual Product Image */}
                        <div className="relative flex h-52 w-full items-center justify-center overflow-hidden bg-gradient-to-br from-zinc-100 via-stone-50 to-blue-50/50 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-950">
                          {reward.imageUrl ? (
                            <img
                              src={reward.imageUrl}
                              alt={reward.title}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-zinc-200/80 bg-white shadow-xs transition group-hover:scale-105 group-hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
                              <RewardCardIcon category={reward.category} />
                            </div>
                          )}

                          {/* Top Badges */}
                          <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-md bg-black/75 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-2xs backdrop-blur-xs">
                              {reward.badge || "EXCLUSIVE REWARD"}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-md bg-white/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-800 shadow-2xs backdrop-blur-xs dark:bg-zinc-950/80 dark:text-zinc-200">
                              {categoryThai(reward.category)}
                            </span>
                          </div>

                          <div className="absolute right-3 top-3 flex items-center gap-1.5">
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold shadow-2xs backdrop-blur-xs ${
                                reward.stock > 5
                                  ? "bg-emerald-50/90 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/60"
                                  : reward.stock > 0
                                    ? "bg-amber-50/90 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/60"
                                    : "bg-red-50/90 text-red-800 dark:bg-red-950/80 dark:text-red-300 border border-red-200/60 dark:border-red-900/60"
                              }`}
                            >
                              {reward.stock > 0
                                ? `คงเหลือ ${reward.stock} ชิ้น`
                                : "สินค้าหมด"}
                            </span>

                            {userCanShop ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toggleWishlist({
                                    id: reward.id,
                                    itemType: "GOODS",
                                    title: reward.title,
                                    price: 0,
                                    imageUrl: reward.imageUrl,
                                    url: "/rewards",
                                    category: reward.category,
                                    isPreorder: false,
                                  });
                                }}
                                aria-label={
                                  isInWishlist(reward.id, "GOODS")
                                    ? "นำออกจากรายการที่ถูกใจ"
                                    : "เพิ่มในรายการที่ถูกใจ"
                                }
                                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-zinc-600 shadow-sm backdrop-blur-xs transition hover:scale-110 hover:text-red-600 dark:bg-zinc-800/90 dark:text-zinc-300 dark:hover:text-red-400"
                              >
                                <Heart
                                  size={14}
                                  className={
                                    isInWishlist(reward.id, "GOODS")
                                      ? "fill-red-500 text-red-500"
                                      : ""
                                  }
                                  aria-hidden="true"
                                />
                              </button>
                            ) : null}
                          </div>
                        </div>

                        {/* Content Section */}
                        <div className="p-5">
                          <h3 className="line-clamp-2 text-sm font-bold text-zinc-900 group-hover:text-blue-600 dark:text-zinc-100 dark:group-hover:text-blue-400 transition">
                            {reward.title}
                          </h3>
                          <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                            {reward.description}
                          </p>
                        </div>
                      </div>

                      {/* Card Action Footer */}
                      <div className="border-t border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/40">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                            แต้มที่ต้องใช้
                          </span>
                          <div className="flex items-center gap-1.5 text-sm font-black text-blue-600 dark:text-blue-400">
                            <PointBadge size="sm" />
                            <span>
                              {reward.pointsRequired.toLocaleString("th-TH")} แต้ม
                            </span>
                          </div>
                        </div>

                        {isOutOfStock ? (
                          <button
                            type="button"
                            disabled
                            className="w-full rounded-xl border border-zinc-200 bg-zinc-100 py-2.5 text-xs font-bold text-zinc-400 cursor-not-allowed dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500"
                          >
                            ของรางวัลหมดชั่วคราว
                          </button>
                        ) : hasEnoughPoints ? (
                          <button
                            type="button"
                            onClick={() => handleRedeem(reward)}
                            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-orange-600 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-orange-700 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
                          >
                            <Gift size={14} aria-hidden="true" />
                            <span>แลกรับของรางวัล</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="w-full rounded-xl border border-zinc-200 bg-zinc-100 py-2.5 text-xs font-bold text-zinc-400 cursor-not-allowed dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500"
                            title={`คุณต้องการอีก ${reward.pointsRequired - points} แต้ม`}
                          >
                            แต้มสะสมไม่เพียงพอ
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: POINTS LEDGER (HISTORY) CONTENT */}
          {activeTab === "LEDGER" && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <History size={16} className="text-blue-600 dark:text-blue-400" />
                    <span>ประวัติความเคลื่อนไหวแต้มสะสม (Points Ledger)</span>
                  </h2>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    บันทึกรายการได้รับแต้มจากการสั่งซื้อ, รีวิวสินค้า และการใช้แต้มแลกของรางวัล
                  </p>
                </div>

                {/* Filter Pills */}
                <div className="inline-flex rounded-xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-950">
                  <button
                    type="button"
                    onClick={() => setLedgerFilter("ALL")}
                    className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                      ledgerFilter === "ALL"
                        ? "bg-white text-zinc-900 shadow-2xs dark:bg-zinc-800 dark:text-zinc-100"
                        : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                    }`}
                  >
                    ทั้งหมด
                  </button>
                  <button
                    type="button"
                    onClick={() => setLedgerFilter("EARN")}
                    className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                      ledgerFilter === "EARN"
                        ? "bg-white text-emerald-700 shadow-2xs dark:bg-zinc-800 dark:text-emerald-300"
                        : "text-zinc-500 hover:text-emerald-700 dark:text-zinc-400"
                    }`}
                  >
                    ได้รับแต้ม (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLedgerFilter("SPEND")}
                    className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                      ledgerFilter === "SPEND"
                        ? "bg-white text-rose-700 shadow-2xs dark:bg-zinc-800 dark:text-rose-300"
                        : "text-zinc-500 hover:text-rose-700 dark:text-zinc-400"
                    }`}
                  >
                    ใช้แต้มแลก (-)
                  </button>
                </div>
              </div>

              {filteredLedger.length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-500 dark:text-zinc-400">
                  ไม่พบรายการในหมวดที่เลือก
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400">
                        <th className="pb-3 font-semibold">วันและเวลา</th>
                        <th className="pb-3 font-semibold">ประเภทรายการ</th>
                        <th className="pb-3 font-semibold">รายละเอียด</th>
                        <th className="pb-3 font-semibold text-right">จำนวนแต้ม</th>
                        <th className="pb-3 font-semibold text-right">แต้มคงเหลือ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                      {filteredLedger.map((tx) => {
                        const isPositive = tx.amount > 0;
                        return (
                          <tr key={tx.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition">
                            <td className="py-3.5 whitespace-nowrap text-zinc-500 dark:text-zinc-400 font-medium">
                              {formatThaiDate(tx.createdAt)}
                            </td>
                            <td className="py-3.5 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                  tx.type === "EARN_ORDER"
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                    : tx.type === "EARN_REVIEW"
                                      ? "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                                      : tx.type === "REDEEM_REWARD"
                                        ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                                        : "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                                }`}
                              >
                                {isPositive ? (
                                  <TrendingUp size={11} aria-hidden="true" />
                                ) : (
                                  <TrendingDown size={11} aria-hidden="true" />
                                )}
                                <span>
                                  {tx.type === "EARN_ORDER"
                                    ? "คำสั่งซื้อสำเร็จ"
                                    : tx.type === "EARN_REVIEW"
                                      ? "รีวิวสินค้า"
                                      : tx.type === "REDEEM_REWARD"
                                        ? "แลกของรางวัล"
                                        : tx.type === "WELCOME_BONUS"
                                          ? "โบนัสต้อนรับ"
                                          : "โหมดทดสอบ"}
                                </span>
                              </span>
                            </td>
                            <td className="py-3.5 text-zinc-800 dark:text-zinc-200 font-medium">
                              {tx.description}
                            </td>
                            <td className="py-3.5 text-right font-black whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 ${
                                  isPositive
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-rose-600 dark:text-rose-400"
                                }`}
                              >
                                {isPositive ? `+${tx.amount}` : tx.amount} P
                              </span>
                            </td>
                            <td className="py-3.5 text-right font-bold text-zinc-600 dark:text-zinc-400 tabular-nums">
                              {tx.balanceAfter.toLocaleString("th-TH")} P
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MEMBER TIERS CONTENT */}
          {activeTab === "TIERS" && (
            <div>
              <div className="mb-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Crown size={18} className="text-amber-500" />
                  <span>โปรแกรมระดับสมาชิกและสิทธิพิเศษ (Loyalty Tier Benefits)</span>
                </h2>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                  ยิ่งสั่งซื้อและสะสมแต้มมาก ยิ่งปลดล็อกตัวคูณคะแนนสะสม และสิทธิประโยชน์พิเศษเหนือระดับ
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {(Object.keys(MEMBER_TIERS) as MemberTier[]).map((tierKey) => {
                  const t = MEMBER_TIERS[tierKey];
                  const isCurrent = currentTier.tier === tierKey;

                  return (
                    <div
                      key={tierKey}
                      className={`relative flex flex-col justify-between rounded-2xl border p-5 shadow-xs transition ${
                        isCurrent
                          ? "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20 dark:border-blue-500 dark:bg-blue-950/20"
                          : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                      }`}
                    >
                      <div>
                        {/* Current Badge */}
                        {isCurrent && (
                          <span className="absolute -top-3 right-4 inline-flex items-center gap-1 rounded-full bg-blue-600 px-2.5 py-0.5 text-[10px] font-black text-white shadow-xs">
                            <Check size={11} aria-hidden="true" />
                            <span>ระดับของคุณ</span>
                          </span>
                        )}

                        <div className="flex items-center justify-between">
                          <span
                            className={`rounded-lg px-2.5 py-1 text-xs font-black uppercase tracking-wider ${t.badgeClass}`}
                          >
                            {t.name}
                          </span>
                          <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">
                            แต้ม x{t.multiplier}
                          </span>
                        </div>

                        <p className="mt-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                          {t.minPoints === 0
                            ? "สำหรับสมาชิกใหม่ทุกคน"
                            : `สะสมครบ ${t.minPoints.toLocaleString("th-TH")} แต้มขึ้นไป`}
                        </p>

                        <div className="mt-4 border-t border-zinc-100 dark:border-zinc-800 pt-4">
                          <p className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                            สิทธิประโยชน์ที่ได้รับ:
                          </p>
                          <ul className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                            {t.benefits.map((b, idx) => (
                              <li key={idx} className="flex items-start gap-1.5 leading-relaxed">
                                <CheckCircle2
                                  size={13}
                                  className="shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5"
                                  aria-hidden="true"
                                />
                                <span>{b}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-[11px]">
                        {isCurrent ? (
                          <div className="text-center font-bold text-blue-600 dark:text-blue-400 py-1">
                            ใช้งานสิทธิพิเศษอยู่ ณ ปัจจุบัน
                          </div>
                        ) : points < t.minPoints ? (
                          <div className="text-center font-medium text-zinc-400 dark:text-zinc-500 py-1">
                            ต้องการอีก {(t.minPoints - points).toLocaleString("th-TH")} แต้ม
                          </div>
                        ) : (
                          <div className="text-center font-bold text-emerald-600 dark:text-emerald-400 py-1">
                            ปลดล็อกแล้ว
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Guidelines Banner */}
          <div className="mt-12 rounded-2xl border border-zinc-200 bg-white p-5 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            <h4 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 mb-2">
              <ShieldCheck
                size={15}
                className="text-blue-600 dark:text-blue-400"
                aria-hidden="true"
              />
              <span>เงื่อนไขการสะสมแต้มและแลกรับของรางวัล</span>
            </h4>
            <ul className="list-disc pl-5 space-y-1 leading-relaxed">
              <li>
                ของรางวัลทุกชิ้นเป็นสินค้าของสะสมลิขสิทธิ์แท้ 100%
                จัดส่งพร้อมพัสดุในคำสั่งซื้อของคุณ
              </li>
              <li>
                ของรางวัลที่แลกรับมีมูลค่า ฿0.00 และไม่นำไปคิดรวมในฐานภาษีมูลค่าเพิ่ม
                (VAT 0%/7%)
              </li>
              <li>
                แต้มสะสมไม่มีวันหมดอายุ สามารถแลกรับของรางวัลและของแถมพรีเมียมได้ตลอดทั้งปี
              </li>
              <li>
                การเขียนรีวิวสินค้าที่เคยสั่งซื้อจริงจะได้รับแต้มโบนัสพิเศษ +10 P ทันที
              </li>
            </ul>
          </div>
        </div>
      </main>

      {/* Floating Notification Toast */}
      {toastMessage ? (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex max-w-md items-start gap-3 rounded-2xl border border-emerald-300 bg-white p-4 shadow-xl shadow-zinc-950/10 dark:border-emerald-800 dark:bg-zinc-900"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400">
            <CheckCircle2 size={16} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
              ทำรายการสำเร็จ
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
              {toastMessage}
            </p>
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setToastMessage(null);
                  setCartDrawerOpen(true);
                }}
                className="inline-flex items-center gap-1 text-xs font-extrabold text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                <span>เปิดดูตะกร้า</span>
                <ArrowRight size={12} aria-hidden="true" />
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
            aria-label="ปิดการแจ้งเตือน"
          >
            <X size={15} aria-hidden="true" />
          </button>
        </aside>
      ) : null}

      {/* Global Shopping Cart Drawer */}
      <CartDrawer
        isOpen={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
      />
    </>
  );
}

"use client";

import {
  AlertCircle,
  ArrowRight,
  Award,
  Bookmark,
  CheckCircle2,
  Gift,
  Heart,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Tag,
  X,
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
  getUserPoints,
  redeemReward,
  resetPoints,
  subscribeUserPoints,
} from "../../services/points.service";
import {
  getRewardNumericId,
  listRewards,
  type RewardItem,
} from "../../mocks/rewards.mock";
import { canShop, getRoleHomeUrl } from "../../utils/permissions";
import CartDrawer from "../../components/CartDrawer";
import PointBadge from "../../components/PointBadge";

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
      return <Bookmark className="h-8 w-8 text-amber-600 dark:text-amber-400" aria-hidden="true" />;
    case "POSTCARD":
      return <Gift className="h-8 w-8 text-rose-600 dark:text-rose-400" aria-hidden="true" />;
    case "ACRYLIC":
      return <Award className="h-8 w-8 text-orange-600 dark:text-orange-400" aria-hidden="true" />;
    case "ACCESSORY":
      return <ShieldCheck className="h-8 w-8 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />;
    case "BADGE":
      return <Tag className="h-8 w-8 text-blue-600 dark:text-blue-400" aria-hidden="true" />;
    default:
      return <Sparkles className="h-8 w-8 text-purple-600 dark:text-purple-400" aria-hidden="true" />;
  }
}

export default function RewardsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const userCanShop = canShop(user?.role);
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { addItem } = useCart();

  const [points, setPoints] = useState<number>(350);
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

  // Sync points and rewards catalog
  useEffect(() => {
    setMounted(true);
    setPoints(getUserPoints());
    setRewardsList(listRewards());

    const unsubscribe = subscribeUserPoints((nextPoints) => {
      setPoints(nextPoints);
    });

    return () => {
      unsubscribe();
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

  const handleRedeem = (reward: RewardItem) => {
    if (points < reward.pointsRequired) {
      return;
    }
    if (reward.stock <= 0) {
      return;
    }

    // Deduct points via service
    const success = redeemReward(reward.id, reward.pointsRequired);

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

      // Update local stock display
      setRewardsList((current) =>
        current.map((item) =>
          item.id === reward.id ? { ...item, stock: Math.max(0, item.stock - 1) } : item,
        ),
      );

      setToastMessage("แลกของรางวัลสำเร็จ! เพิ่มลงในตะกร้าสินค้าแล้ว");
      setCartDrawerOpen(true);
    }
  };

  const handleAddPointsDev = () => {
    addPoints(100);
  };

  const handleResetPointsDev = () => {
    resetPoints();
  };

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
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            <Link href="/" className="hover:text-orange-600 dark:hover:text-orange-400 transition">
              หน้าแรก
            </Link>
            <span>/</span>
            <span className="text-zinc-900 dark:text-zinc-100">ของรางวัลสะสมแต้ม</span>
          </nav>

          {/* Page Header */}
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-extrabold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/40">
                <PointBadge size="xs" />
                <span>MEMBER REWARDS PROGRAM</span>
              </div>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
                สะสมแต้มแลกของรางวัล (Member Rewards)
              </h1>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                ใช้แต้มสะสมจากการสั่งซื้อ แลกรับของสะสมและอุปกรณ์พรีเมียมรุ่นลิขสิทธิ์พิเศษ
              </p>
            </div>

            <button
              type="button"
              onClick={() => setCartDrawerOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 text-xs font-bold text-zinc-800 shadow-2xs transition hover:border-orange-500 hover:text-orange-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-orange-500"
            >
              <ShoppingBag size={15} aria-hidden="true" />
              <span>เปิดตะกร้าสินค้า</span>
            </button>
          </div>

          {/* User Points Summary & Dev Tools Card */}
          <div className="mb-8 overflow-hidden rounded-2xl border border-blue-100 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800 shadow-inner">
                  <PointBadge size="xl" />
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider dark:text-zinc-400">
                    แต้มสะสมปัจจุบันของคุณ
                  </p>
                  <div className="mt-0.5 flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-black tabular-nums text-blue-600 dark:text-blue-400">
                      {mounted ? points.toLocaleString("th-TH") : "..."}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-sm font-extrabold text-blue-600 dark:text-blue-400">
                      <PointBadge size="xs" /> แต้ม (Points)
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    ทุกการสั่งซื้อครบ 50 บาท รับ 1 แต้มสะสมเมื่อฝ่ายการเงินอนุมัติสลิป
                  </p>
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

          {/* Section Heading */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Gift size={16} className="text-orange-600 dark:text-orange-400" aria-hidden="true" />
              <span>รายการของสะสมลิขสิทธิ์แท้พร้อมแลก</span>
              <span className="rounded-full bg-zinc-200/70 px-2 py-0.5 text-xs font-extrabold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {rewardsList.length} รายการ
              </span>
            </h2>
          </div>

          {/* Rewards Grid */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rewardsList.map((reward) => {
              const hasEnoughPoints = mounted && points >= reward.pointsRequired;
              const isOutOfStock = reward.stock <= 0;

              return (
                <article
                  key={reward.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xs transition hover:border-orange-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-orange-800"
                >
                  <div>
                    {/* Header Banner & Visual Product Image */}
                    <div className="relative flex h-52 w-full items-center justify-center overflow-hidden bg-gradient-to-br from-zinc-100 via-stone-50 to-orange-50/50 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-850">
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
                          {reward.stock > 0 ? `คงเหลือ ${reward.stock} ชิ้น` : "สินค้าหมด"}
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
                      <h3 className="line-clamp-2 text-sm font-bold text-zinc-900 group-hover:text-orange-600 dark:text-zinc-100 dark:group-hover:text-orange-400 transition">
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
                        <span>{reward.pointsRequired.toLocaleString("th-TH")} แต้ม</span>
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

          {/* Guidelines Banner */}
          <div className="mt-12 rounded-2xl border border-zinc-200 bg-white p-5 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            <h4 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 mb-2">
              <ShieldCheck size={15} className="text-orange-600 dark:text-orange-400" aria-hidden="true" />
              <span>เงื่อนไขการสะสมแต้มและแลกรับของรางวัล</span>
            </h4>
            <ul className="list-disc pl-5 space-y-1 leading-relaxed">
              <li>ของรางวัลทุกชิ้นเป็นสินค้าของสะสมลิขสิทธิ์แท้ 100% จัดส่งพร้อมพัสดุในคำสั่งซื้อของคุณ</li>
              <li>ของรางวัลที่แลกรับมีมูลค่า ฿0.00 และไม่นำไปคิดรวมในฐานภาษีมูลค่าเพิ่ม (VAT 0%/7%)</li>
              <li>แต้มสะสมไม่มีวันหมดอายุ สามารถแลกรับของรางวัลและของแถมพรีเมียมได้ตลอดทั้งปี</li>
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
                className="inline-flex items-center gap-1 text-xs font-extrabold text-orange-600 hover:text-orange-700 dark:text-orange-400"
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
      <CartDrawer isOpen={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />
    </>
  );
}

"use client";

import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Award,
  Bookmark,
  Boxes,
  Check,
  CheckCircle2,
  Clock,
  Edit2,
  ExternalLink,
  Flame,
  Gift,
  HelpCircle,
  Layers,
  Percent,
  Plus,
  Power,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  ShieldAlert,
  Sliders,
  Sparkles,
  Tag,
  Trash2,
  Truck,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PointBadge from "../../../components/PointBadge";
import { useAuth } from "../../../contexts/AuthContext";
import {
  deleteRewardItem,
  listRewards,
  resetRewardsCatalog,
  saveRewardItem,
  subscribeRewards,
  type RewardItem,
} from "../../../mocks/rewards.mock";
import {
  calculateFlashSaleProgress,
  deleteFlashSaleDeal,
  getFlashSaleDeals,
  resetFlashSaleDeals,
  saveFlashSaleDeal,
  subscribeFlashSaleDeals,
  toggleFlashSaleDealStatus,
  type FlashSaleItem,
  type FlashSaleSchedule,
} from "../../../services/flash-sale.service";
import {
  getPromotionSettings,
  resetPromotionSettings,
  subscribePromotionSettings,
  updatePromotionSettings,
  type PromotionSettings,
} from "../../../services/promotion-settings.service";
import {
  getBestSellerSettings,
  saveBestSellerSettings,
  subscribeBestSellerSettings,
  getEffectiveBestSellers,
  getEffectiveRecommended,
  cleanProductId,
  DEFAULT_SETTINGS,
  TOP_ITEMS_LIMIT,
  type BestSellerSettings,
  type BestSellerCalculationMode,
  type PinnedBestSeller,
  type PinnedRecommended,
  type PinnedAllTimeBestSeller,
  type PinnedNewArrival,
} from "../../../services/best-seller-settings.service";
import { ProductService } from "../../../services/product.service";
import type { CatalogData } from "../../../lib/catalog-client";
import { getMockCatalog } from "../../../mocks/products.mock";
import {
  deletePromoCode,
  listPromoCodes,
  MOCK_PROMO_CODES_UPDATED_EVENT,
  savePromoCode,
  togglePromoCodeStatus,
  type PromoCoupon,
} from "../../../utils/promo";

type ActiveTab = "PROMO_CODES" | "FLASH_SALE" | "THRESHOLDS" | "REWARDS" | "BEST_SELLERS";

export default function AdminPromotionsPage() {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>("PROMO_CODES");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Data states
  const [coupons, setCoupons] = useState<PromoCoupon[]>([]);
  const [flashDeals, setFlashDeals] = useState<FlashSaleItem[]>([]);
  const [settings, setSettings] = useState<PromotionSettings>(getPromotionSettings);
  const [rewards, setRewards] = useState<RewardItem[]>([]);

  // Promo code filter & search
  const [promoSearch, setPromoSearch] = useState("");
  const [promoFilter, setPromoFilter] = useState<"ALL" | "ACTIVE" | "EXPIRED">("ALL");
  const [isCreatePromoOpen, setIsCreatePromoOpen] = useState(false);
  const [newPromoCode, setNewPromoCode] = useState("");
  const [newPromoTitle, setNewPromoTitle] = useState("");
  const [newPromoDesc, setNewPromoDesc] = useState("");
  const [newPromoType, setNewPromoType] = useState<"PERCENTAGE" | "FIXED" | "FREE_SHIPPING">("PERCENTAGE");
  const [newPromoValue, setNewPromoValue] = useState<number>(10);
  const [newPromoMinSpend, setNewPromoMinSpend] = useState<number>(0);
  const [newPromoExpiresAt, setNewPromoExpiresAt] = useState<string>("");

  // Flash Sale edit state
  const [editingDeal, setEditingDeal] = useState<FlashSaleItem | null>(null);

  // Settings form states
  const [formSettings, setFormSettings] = useState<PromotionSettings>(settings);

  // Reward edit state
  const [editingReward, setEditingReward] = useState<RewardItem | null>(null);

  // Rewards Create state
  const [isCreateRewardOpen, setIsCreateRewardOpen] = useState(false);
  const [newRewardProductId, setNewRewardProductId] = useState("");
  const [newRewardPoints, setNewRewardPoints] = useState<number>(50);
  const [newRewardStock, setNewRewardStock] = useState<number>(20);
  const [newRewardCategory, setNewRewardCategory] = useState<RewardItem["category"]>("BOOKMARK");
  const [newRewardTitle, setNewRewardTitle] = useState("");
  const [newRewardDescription, setNewRewardDescription] = useState("");
  const [newRewardBadge, setNewRewardBadge] = useState("EXCLUSIVE REWARD");

  // Best Seller & Showcase States
  const [bsSettings, setBsSettings] = useState<BestSellerSettings>(getBestSellerSettings);
  const [catalogData, setCatalogData] = useState<CatalogData | null>(() => {
    try {
      return getMockCatalog();
    } catch {
      return null;
    }
  });
  const [showcaseSubTab, setShowcaseSubTab] = useState<"WEEKLY" | "ALL_TIME" | "NEW_ARRIVALS">("WEEKLY");

  // Weekly Best Seller Pin States
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [editingWeeklyPin, setEditingWeeklyPin] = useState<PinnedBestSeller | null>(null);
  const [newPinProductId, setNewPinProductId] = useState("");
  const [newPinRank, setNewPinRank] = useState(1);
  const [newPinSalesText, setNewPinSalesText] = useState("");
  const [newPinType, setNewPinType] = useState<"MANGA" | "COLLECTIBLE">("MANGA");

  // All-Time Best Seller States
  const [isAddAllTimeOpen, setIsAddAllTimeOpen] = useState(false);
  const [editingAllTime, setEditingAllTime] = useState<PinnedAllTimeBestSeller | null>(null);
  const [newAllTimeProductId, setNewAllTimeProductId] = useState("");
  const [newAllTimeRank, setNewAllTimeRank] = useState(1);
  const [newAllTimeSalesRecord, setNewAllTimeSalesRecord] = useState("");
  const [newAllTimeSalesMilestone, setNewAllTimeSalesMilestone] = useState("");
  const [newAllTimeType, setNewAllTimeType] = useState<"MANGA" | "COLLECTIBLE">("MANGA");

  // New Arrivals States
  const [isAddNewArrivalOpen, setIsAddNewArrivalOpen] = useState(false);
  const [editingNewArrival, setEditingNewArrival] = useState<PinnedNewArrival | null>(null);
  const [newArrProductId, setNewArrProductId] = useState("");
  const [newArrBadgeText, setNewArrBadgeText] = useState("NEW สัปดาห์นี้");
  const [newArrReleaseDateText, setNewArrReleaseDateText] = useState("เล่มออกใหม่ล่าสุด · พร้อมส่ง");
  const [newArrType, setNewArrType] = useState<"MANGA" | "LIGHT_NOVEL" | "FIGURE" | "PLAMO" | "GOODS">("MANGA");

  // Recommended (Staff Picks) CRUD states
  const [isAddRecommendedOpen, setIsAddRecommendedOpen] = useState(false);
  const [newRecProductId, setNewRecProductId] = useState("");
  const [newRecBadgeText, setNewRecBadgeText] = useState("STAFF PICK · ยอดนิยม");
  const [newRecHighlightText, setNewRecHighlightText] = useState("");
  const [editingRec, setEditingRec] = useState<PinnedRecommended | null>(null);

  // Promo Code Edit state
  const [editingPromo, setEditingPromo] = useState<PromoCoupon | null>(null);

  // Flash Deal Create state
  const [isCreateDealOpen, setIsCreateDealOpen] = useState(false);
  const [newDealProductId, setNewDealProductId] = useState("");
  const [newDealDiscount, setNewDealDiscount] = useState<number>(20);
  const [newDealQuota, setNewDealQuota] = useState<number>(20);
  const [newDealSoldCount, setNewDealSoldCount] = useState<number>(0);
  const [newDealSchedule, setNewDealSchedule] = useState<FlashSaleSchedule>("TODAY");
  const [newDealStockNote, setNewDealStockNote] = useState("");
  const [flashTabFilter, setFlashTabFilter] = useState<"ALL" | "TODAY" | "TOMORROW">("ALL");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    setCoupons(listPromoCodes());
    setFlashDeals(getFlashSaleDeals());
    setSettings(getPromotionSettings());
    setFormSettings(getPromotionSettings());
    setRewards(listRewards());

    const refreshCoupons = () => setCoupons(listPromoCodes());
    ProductService.getProducts().then((cat) => setCatalogData(cat)).catch(() => {});
    const unsubBs = subscribeBestSellerSettings((updated) => setBsSettings(updated));
    window.addEventListener(MOCK_PROMO_CODES_UPDATED_EVENT, refreshCoupons);
    window.addEventListener("storage", refreshCoupons);

    const unsubFlash = subscribeFlashSaleDeals((deals) => setFlashDeals(deals));
    const unsubSettings = subscribePromotionSettings((newSettings) => {
      setSettings(newSettings);
      setFormSettings(newSettings);
    });
    const unsubRewards = subscribeRewards((newRewards) => setRewards(newRewards));

    return () => {
      window.removeEventListener(MOCK_PROMO_CODES_UPDATED_EVENT, refreshCoupons);
      window.removeEventListener("storage", refreshCoupons);
      unsubFlash();
      unsubSettings();
      unsubRewards();
    };
  }, []);

  // Promo actions
  const handleSavePromoCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromoCode.trim()) return;

    const expiresAt = newPromoExpiresAt
      ? new Date(newPromoExpiresAt).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    savePromoCode({
      code: newPromoCode.trim().toUpperCase(),
      title: newPromoTitle.trim() || `ส่วนลด ${newPromoCode.trim().toUpperCase()}`,
      description: newPromoDesc.trim(),
      type: newPromoType,
      value: Number(newPromoValue) || 0,
      minSpend: Number(newPromoMinSpend) || 0,
      expiresAt,
      isActive: true,
    });

    setCoupons(listPromoCodes());
    setIsCreatePromoOpen(false);
    setNewPromoCode("");
    setNewPromoTitle("");
    setNewPromoDesc("");
    setNewPromoValue(10);
    setNewPromoMinSpend(0);
    setNewPromoExpiresAt("");
    showToast(`บันทึกโค้ดส่วนลด "${newPromoCode.trim().toUpperCase()}" เรียบร้อยแล้ว`);
  };

  const handleTogglePromo = (code: string) => {
    togglePromoCodeStatus(code);
    setCoupons(listPromoCodes());
    showToast(`ปรับสถานะโค้ด "${code}" แล้ว`);
  };

  const handleDeletePromo = (code: string) => {
    if (confirm(`คุณต้องการลบโค้ด "${code}" ใช่หรือไม่?`)) {
      deletePromoCode(code);
      setCoupons(listPromoCodes());
      showToast(`ลบโค้ด "${code}" เรียบร้อยแล้ว`);
    }
  };

  const handleQuickAddPreset = (preset: "NEW_15" | "EXPIRED_TEST") => {
    if (preset === "NEW_15") {
      const code = `VIP${Math.floor(100 + Math.random() * 900)}`;
      const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      savePromoCode({
        code,
        title: "ส่วนลด VIP 15%",
        description: "ส่วนลดพิเศษ 15% สำหรับสมาชิกระดับ VIP",
        type: "PERCENTAGE",
        value: 15,
        minSpend: 500,
        expiresAt: in7Days,
        isActive: true,
      });
      setCoupons(listPromoCodes());
      showToast(`สร้างโค้ดส่วนลด "${code}" สำเร็จ`);
    } else {
      const code = `EXP${Math.floor(100 + Math.random() * 900)}`;
      const past = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      savePromoCode({
        code,
        title: "โค้ดหมดอายุ (สำหรับทดสอบ)",
        description: "โค้ดทดสอบสถานะหมดอายุการใช้งาน",
        type: "FIXED",
        value: 50,
        minSpend: 0,
        expiresAt: past,
        isActive: true,
      });
      setCoupons(listPromoCodes());
      showToast(`สร้างโค้ดหมดอายุ "${code}" สำเร็จ`);
    }
  };

  // Flash Sale actions
  const handleToggleFlashDeal = (id: number) => {
    toggleFlashSaleDealStatus(id);
    showToast("ปรับสถานะสินค้า Flash Sale แล้ว");
  };

  const handleSaveDealEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDeal) return;
    const quota = Math.max(1, Number(editingDeal.quota) || 20);
    const soldCount = Math.max(0, Math.min(quota, Number(editingDeal.soldCount) || 0));
    const autoProgress = calculateFlashSaleProgress(quota, soldCount, editingDeal.kind);
    const updatedDeal: FlashSaleItem = {
      ...editingDeal,
      quota,
      soldCount,
      soldPercent: autoProgress.soldPercent,
      stockNote: editingDeal.stockNote?.trim() ? editingDeal.stockNote : autoProgress.stockNote,
      schedule: editingDeal.schedule || "TODAY",
    };
    saveFlashSaleDeal(updatedDeal);
    setEditingDeal(null);
    showToast(`อัปเดตข้อมูล Flash Sale ของ "${updatedDeal.title}" เรียบร้อยแล้ว`);
  };

  const handleSavePromoEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPromo) return;
    savePromoCode(editingPromo);
    setEditingPromo(null);
    setCoupons(listPromoCodes());
    showToast(`อัปเดตข้อมูลโค้ดส่วนลด "${editingPromo.code}" สำเร็จ`);
  };

  const handleDeleteFlashDeal = (id: number) => {
    if (confirm("คุณต้องการนำสินค้านี้ออกจาก Flash Sale ใช่หรือไม่?")) {
      deleteFlashSaleDeal(id);
      showToast("นำสินค้าออกจาก Flash Sale เรียบร้อยแล้ว");
    }
  };

  const handleCreateFlashDeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catalogData || !newDealProductId) {
      alert("กรุณาเลือกสินค้า");
      return;
    }

    const manga = catalogData.mangaSeries.find((s) => s.id === newDealProductId);
    const collectible = [
      ...catalogData.figures,
      ...catalogData.plamo,
      ...catalogData.goods,
      ...catalogData.accessories,
    ].find((c) => String(c.id) === newDealProductId);

    const kind = manga ? "MANGA" : collectible?.category === "FIGURE" ? "FIGURE" : "ACCESSORY";
    const quota = Math.max(1, Number(newDealQuota) || 20);
    const soldCount = Math.max(0, Math.min(quota, Number(newDealSoldCount) || 0));
    const autoProgress = calculateFlashSaleProgress(quota, soldCount, kind);
    const stockNote = newDealStockNote.trim() || autoProgress.stockNote;

    let item: FlashSaleItem;
    const id = Date.now();

    if (manga) {
      const originalPrice = manga.volumes.length ? manga.volumes[0].price : 115;
      const salePrice = Math.round(originalPrice * (1 - newDealDiscount / 100));
      item = {
        id,
        kind: "MANGA",
        title: `${manga.title} เล่ม 1 (Flash Deal)`,
        categoryLabel: newDealSchedule === "TODAY" ? "มังงะลดพิเศษ" : "มังงะลดล่วงหน้า",
        originalPrice,
        salePrice,
        discountPercent: newDealDiscount,
        imageUrl:
          manga.coverUrl ||
          manga.coverImage ||
          manga.volumes[0]?.coverUrl ||
          "/images/products/frieren-vol-01.jpg",
        volume: 1,
        quota,
        soldCount,
        soldPercent: autoProgress.soldPercent,
        stockNote,
        schedule: newDealSchedule,
        href: `/manga/${encodeURIComponent(manga.id)}`,
        isActive: true,
      };
    } else if (collectible) {
      const originalPrice = collectible.fullPrice;
      const salePrice = Math.round(originalPrice * (1 - newDealDiscount / 100));
      item = {
        id,
        kind: collectible.category === "FIGURE" ? "FIGURE" : "ACCESSORY",
        title: `${collectible.name} (Flash Deal)`,
        categoryLabel:
          newDealSchedule === "TODAY"
            ? (collectible.category === "FIGURE" ? "ฟิกเกอร์ลดพิเศษ" : "ของสะสมลดพิเศษ")
            : (collectible.category === "FIGURE" ? "ฟิกเกอร์ลดล่วงหน้า" : "ของสะสมลดล่วงหน้า"),
        originalPrice,
        salePrice,
        discountPercent: newDealDiscount,
        imageUrl:
          collectible.coverUrl ||
          collectible.coverImage ||
          collectible.images[0] ||
          "",
        quota,
        soldCount,
        soldPercent: autoProgress.soldPercent,
        stockNote,
        schedule: newDealSchedule,
        href: `/figures/${encodeURIComponent(collectible.slug)}`,
        isActive: true,
      };
    } else {
      alert("ไม่พบข้อมูลสินค้า");
      return;
    }

    saveFlashSaleDeal(item);
    setIsCreateDealOpen(false);
    setNewDealProductId("");
    setNewDealDiscount(20);
    setNewDealQuota(20);
    setNewDealSoldCount(0);
    setNewDealSchedule("TODAY");
    setNewDealStockNote("");
    showToast(`เพิ่ม "${item.title}" ลงใน Flash Sale (${newDealSchedule === "TODAY" ? "รอบวันนี้" : "รอบพรุ่งนี้"}) เรียบร้อยแล้ว`);
  };

  const handleResetFlashDeals = () => {
    if (confirm("คุณต้องการรีเซ็ตรายการ Flash Sale เป็นค่าเริ่มต้นใช่หรือไม่?")) {
      resetFlashSaleDeals();
      showToast("รีเซ็ตรายการ Flash Sale เป็นค่าเริ่มต้นแล้ว");
    }
  };

  // Thresholds settings actions
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updatePromotionSettings(formSettings);
    showToast("บันทึกเกณฑ์ส่งฟรี, ของแถม และส่วนลดยกเซ็ตสำเร็จ");
  };

  const handleResetSettings = () => {
    if (confirm("คุณต้องการรีเซ็ตเกณฑ์ส่วนลดทั้งหมดเป็นค่าเริ่มต้นใช่หรือไม่?")) {
      resetPromotionSettings();
      showToast("รีเซ็ตเกณฑ์ส่วนลดเป็นค่าเริ่มต้นแล้ว");
    }
  };

  // Rewards catalog actions
  const handleSaveRewardEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReward) return;
    saveRewardItem(editingReward);
    setEditingReward(null);
    showToast(`อัปเดตของรางวัล "${editingReward.title}" สำเร็จ`);
  };

  const handleResetRewards = () => {
    if (confirm("คุณต้องการรีเซ็ตคลังของรางวัลแต้มสะสมเป็นค่าเริ่มต้นใช่หรือไม่?")) {
      resetRewardsCatalog();
      showToast("รีเซ็ตของรางวัลแต้มสะสมเป็นค่าเริ่มต้นแล้ว");
    }
  };

  // Reward Create & Delete actions
  const handleSelectRewardProduct = (productId: string) => {
    setNewRewardProductId(productId);
    if (!catalogData || !productId) return;

    const allCollectibles = [
      ...catalogData.goods,
      ...catalogData.accessories,
      ...catalogData.figures,
      ...catalogData.plamo,
    ];
    const collectible = allCollectibles.find((c) => String(c.id) === productId);
    const manga = catalogData.mangaSeries.find((m) => m.id === productId);

    if (collectible) {
      setNewRewardTitle(collectible.name);
      const nameLower = collectible.name.toLowerCase();
      if (nameLower.includes("คั่น") || nameLower.includes("bookmark")) {
        setNewRewardCategory("BOOKMARK");
        setNewRewardPoints(50);
      } else if (nameLower.includes("การ์ด") || nameLower.includes("postcard") || nameLower.includes("โปสเตอร์")) {
        setNewRewardCategory("POSTCARD");
        setNewRewardPoints(80);
      } else if (nameLower.includes("สแตนดี้") || nameLower.includes("อะคริลิก") || nameLower.includes("standee") || nameLower.includes("keychain") || nameLower.includes("กุญแจ")) {
        setNewRewardCategory("ACRYLIC");
        setNewRewardPoints(150);
      } else if (nameLower.includes("เข็มกลัด") || nameLower.includes("badge")) {
        setNewRewardCategory("BADGE");
        setNewRewardPoints(90);
      } else {
        setNewRewardCategory("ACCESSORY");
        setNewRewardPoints(100);
      }
      setNewRewardDescription(`ของสะสมลิขสิทธิ์แท้ ${collectible.name} ใช้แต้มสะสมแลกฟรี`);
    } else if (manga) {
      setNewRewardTitle(`${manga.title} (ของรางวัลพิเศษ)`);
      setNewRewardCategory("ACCESSORY");
      setNewRewardPoints(120);
      setNewRewardDescription(`มังงะ/ไอเทมพรีเมียมจากซีรีส์ ${manga.title} ลิขสิทธิ์แท้ ${manga.publisher}`);
    }
  };

  const handleCreateReward = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catalogData || !newRewardProductId) {
      alert("กรุณาเลือกสินค้าจากสต็อก");
      return;
    }

    const allCollectibles = [
      ...catalogData.goods,
      ...catalogData.accessories,
      ...catalogData.figures,
      ...catalogData.plamo,
    ];
    const collectible = allCollectibles.find((c) => String(c.id) === newRewardProductId);
    const manga = catalogData.mangaSeries.find((m) => m.id === newRewardProductId);

    let title = newRewardTitle.trim();
    let imageUrl = "";

    if (collectible) {
      if (!title) title = collectible.name;
      imageUrl =
        collectible.coverUrl ||
        collectible.coverImage ||
        collectible.images?.[0] ||
        "/images/rewards/reward-default.jpg";
    } else if (manga) {
      if (!title) title = `${manga.title} (ของรางวัลพิเศษ)`;
      imageUrl =
        manga.coverUrl ||
        manga.coverImage ||
        manga.volumes?.[0]?.coverUrl ||
        "/images/rewards/reward-default.jpg";
    } else {
      alert("ไม่พบข้อมูลสินค้าที่เลือก");
      return;
    }

    const newReward: RewardItem = {
      id: `rew-${Date.now()}`,
      title,
      description: newRewardDescription.trim() || `ของสะสมแท้ลิขสิทธิ์ ใช้แต้มสะสมแลกรับฟรี`,
      pointsRequired: Math.max(1, Number(newRewardPoints) || 50),
      stock: Math.max(0, Number(newRewardStock) || 10),
      imageUrl,
      category: newRewardCategory,
      badge: newRewardBadge.trim() || "EXCLUSIVE REWARD",
    };

    saveRewardItem(newReward);
    setIsCreateRewardOpen(false);
    setNewRewardProductId("");
    setNewRewardTitle("");
    setNewRewardDescription("");
    setNewRewardPoints(50);
    setNewRewardStock(20);
    showToast(`เพิ่มของรางวัล "${newReward.title}" สำเร็จแล้ว`);
  };

  const handleDeleteReward = (id: string, title: string) => {
    if (confirm(`คุณต้องการลบของรางวัล "${title}" ใช่หรือไม่?`)) {
      deleteRewardItem(id);
      showToast(`ลบของรางวัล "${title}" เรียบร้อยแล้ว`);
    }
  };

  // Product display helper for tables and modals
  const getProductDisplay = (id: string, type?: string) => {
    const cleanId = cleanProductId(id);
    const manga = catalogData?.mangaSeries?.find(
      (s) => cleanProductId(s.id) === cleanId || s.id === id || (s as any).slug === cleanId
    ) || catalogData?.lightNovelSeries?.find(
      (s) => cleanProductId(s.id) === cleanId || s.id === id || (s as any).slug === cleanId
    );
    if (manga) {
      const minPrice = manga.volumes?.length ? Math.min(...manga.volumes.map((v) => v.price)) : 95;
      return {
        title: manga.title,
        subtitle: `${manga.publisher} · ${manga.author || "มังงะลิขสิทธิ์"}`,
        imageUrl: manga.coverUrl || manga.coverImage || manga.volumes?.[0]?.coverUrl || "/images/products/jjk-vol-01.jpg",
        category: manga.category || "MANGA",
        priceFormatted: `เริ่มต้น ฿${minPrice.toLocaleString("th-TH")}`,
      };
    }
    const allFigs = [
      ...(catalogData?.figures || []),
      ...(catalogData?.plamo || []),
      ...(catalogData?.goods || []),
      ...(catalogData?.accessories || []),
    ];
    const fig = allFigs.find(
      (f) => String(f.id) === id || String(f.id) === cleanId || f.slug === id || f.slug === cleanId
    );
    if (fig) {
      return {
        title: fig.name,
        subtitle: `${fig.series || fig.manufacturer} · ของแท้ล็อต JP`,
        imageUrl: fig.coverUrl || fig.coverImage || fig.images?.[0] || "/images/products/figure-2001.jpg",
        category: fig.category || "FIGURE",
        priceFormatted: `฿${fig.fullPrice.toLocaleString("th-TH")}`,
      };
    }
    return {
      title: id,
      subtitle: "-",
      imageUrl: "/images/products/jjk-vol-01.jpg",
      category: type || "MANGA",
      priceFormatted: "-",
    };
  };

  // 1. Weekly Best Sellers Actions
  const handleSelectWeeklyProduct = (productId: string) => {
    setNewPinProductId(productId);
    const cleanId = cleanProductId(productId);
    const isManga = catalogData?.mangaSeries.some((s) => cleanProductId(s.id) === cleanId) ||
                    catalogData?.lightNovelSeries?.some((s) => cleanProductId(s.id) === cleanId);
    setNewPinType(isManga ? "MANGA" : "COLLECTIBLE");
    if (!newPinSalesText) {
      setNewPinSalesText(isManga ? "ยอดขายสะสม 15,000+ เล่ม" : "ยอดสั่งจองยอดนิยม");
    }
  };

  const handleSaveWeeklyPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (bsSettings.pinnedBestSellers.length >= TOP_ITEMS_LIMIT) {
      alert("จำกัดสินค้าขายดีประจำสัปดาห์สูงสุด 5 รายการเท่านั้น (หากต้องการเพิ่ม กรุณาลบหรือปรับอันดับรายการเดิมออกก่อน)");
      return;
    }
    if (!newPinProductId) {
      alert("กรุณาเลือกสินค้า");
      return;
    }
    const cleanId = cleanProductId(newPinProductId);
    const exists = bsSettings.pinnedBestSellers.some(
      (p) => cleanProductId(p.id) === cleanId
    );
    if (exists) {
      alert("สินค้านี้อยู่ในรายการปักหมุดแล้ว");
      return;
    }
    const next: PinnedBestSeller[] = [
      ...bsSettings.pinnedBestSellers,
      {
        id: cleanId,
        type: newPinType,
        rank: Number(newPinRank) || (bsSettings.pinnedBestSellers.length + 1),
        salesTextOverride: newPinSalesText.trim() || "สินค้าขายดียอดนิยม",
      },
    ].sort((a, b) => a.rank - b.rank);
    const updated = saveBestSellerSettings({ pinnedBestSellers: next });
    setBsSettings(updated);
    setIsPinModalOpen(false);
    setNewPinProductId("");
    setNewPinSalesText("");
    setNewPinRank(next.length + 1);
    showToast("ปักหมุดสินค้าขายดีเรียบร้อยแล้ว");
  };

  const handleEditWeeklyPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWeeklyPin) return;
    const next = bsSettings.pinnedBestSellers.map((p) =>
      cleanProductId(p.id) === cleanProductId(editingWeeklyPin.id) ? editingWeeklyPin : p
    ).sort((a, b) => a.rank - b.rank);
    const updated = saveBestSellerSettings({ pinnedBestSellers: next });
    setBsSettings(updated);
    setEditingWeeklyPin(null);
    showToast("บันทึกการแก้ไขสินค้าขายดีเรียบร้อยแล้ว");
  };

  const handleDeleteWeeklyPin = (id: string, name?: string) => {
    if (confirm(`คุณต้องการปลดหมุด "${name || id}" ใช่หรือไม่?`)) {
      const next = bsSettings.pinnedBestSellers.filter(
        (p) => cleanProductId(p.id) !== cleanProductId(id)
      );
      const updated = saveBestSellerSettings({ pinnedBestSellers: next });
      setBsSettings(updated);
      showToast("ปลดปักหมุดสินค้าขายดีแล้ว");
    }
  };

  const handleMoveWeeklyPin = (index: number, direction: "up" | "down") => {
    const list = [...bsSettings.pinnedBestSellers].sort((a, b) => a.rank - b.rank);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;
    const updatedList = list.map((item, idx) => ({ ...item, rank: idx + 1 }));
    const updated = saveBestSellerSettings({ pinnedBestSellers: updatedList });
    setBsSettings(updated);
    showToast("สลับอันดับสินค้าขายดีเรียบร้อยแล้ว");
  };

  const handleResetWeeklyDefaults = () => {
    if (confirm("ต้องการคืนค่ารายการสินค้าขายดีประจำสัปดาห์เป็นค่าเริ่มต้นของระบบ (5 อันดับ) ใช่หรือไม่?")) {
      const updated = saveBestSellerSettings({ pinnedBestSellers: DEFAULT_SETTINGS.pinnedBestSellers });
      setBsSettings(updated);
      showToast("คืนค่าสินค้าขายดีประจำสัปดาห์เป็นค่าเริ่มต้นแล้ว");
    }
  };

  // 2. All-Time Best Sellers Actions
  const handleSelectAllTimeProduct = (productId: string) => {
    setNewAllTimeProductId(productId);
    const cleanId = cleanProductId(productId);
    const isManga = catalogData?.mangaSeries.some((s) => cleanProductId(s.id) === cleanId) ||
                    catalogData?.lightNovelSeries?.some((s) => cleanProductId(s.id) === cleanId);
    setNewAllTimeType(isManga ? "MANGA" : "COLLECTIBLE");
    if (!newAllTimeSalesRecord) {
      setNewAllTimeSalesRecord(isManga ? "ยอดขายสะสมทะลุ 10 ล้านเล่ม" : "ยอดสั่งจองอันดับ 1 ของร้าน");
    }
    if (!newAllTimeSalesMilestone) {
      setNewAllTimeSalesMilestone(isManga ? "10,000,000+ เล่ม" : "ยอดฮิตตลอดกาล");
    }
  };

  const handleSaveAllTimeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (bsSettings.pinnedAllTime.length >= TOP_ITEMS_LIMIT) {
      alert("จำกัดสินค้าขายดีตลอดกาลสูงสุด 5 รายการเท่านั้น (หากต้องการเพิ่ม กรุณาลบหรือปรับอันดับรายการเดิมออกก่อน)");
      return;
    }
    if (!newAllTimeProductId) {
      alert("กรุณาเลือกสินค้า");
      return;
    }
    const cleanId = cleanProductId(newAllTimeProductId);
    const exists = bsSettings.pinnedAllTime.some(
      (p) => cleanProductId(p.id) === cleanId
    );
    if (exists) {
      alert("สินค้านี้อยู่ในรายการขายดีตลอดกาลแล้ว");
      return;
    }
    const next: PinnedAllTimeBestSeller[] = [
      ...bsSettings.pinnedAllTime,
      {
        id: cleanId,
        type: newAllTimeType,
        rank: Number(newAllTimeRank) || (bsSettings.pinnedAllTime.length + 1),
        salesRecord: newAllTimeSalesRecord.trim() || "ยอดขายสูงสุดตลอดกาล",
        salesMilestone: newAllTimeSalesMilestone.trim() || "มาสเตอร์พีซตลอดกาล",
      },
    ].sort((a, b) => a.rank - b.rank);
    const updated = saveBestSellerSettings({ pinnedAllTime: next });
    setBsSettings(updated);
    setIsAddAllTimeOpen(false);
    setNewAllTimeProductId("");
    setNewAllTimeSalesRecord("");
    setNewAllTimeSalesMilestone("");
    setNewAllTimeRank(next.length + 1);
    showToast("เพิ่มสินค้าขายดีตลอดกาลเรียบร้อยแล้ว");
  };

  const handleEditAllTimeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAllTime) return;
    const next = bsSettings.pinnedAllTime.map((p) =>
      cleanProductId(p.id) === cleanProductId(editingAllTime.id) ? editingAllTime : p
    ).sort((a, b) => a.rank - b.rank);
    const updated = saveBestSellerSettings({ pinnedAllTime: next });
    setBsSettings(updated);
    setEditingAllTime(null);
    showToast("บันทึกการแก้ไขสินค้าขายดีตลอดกาลเรียบร้อยแล้ว");
  };

  const handleDeleteAllTime = (id: string, name?: string) => {
    if (confirm(`คุณต้องการลบ "${name || id}" ออกจากสินค้าขายดีตลอดกาลใช่หรือไม่?`)) {
      const next = bsSettings.pinnedAllTime.filter(
        (p) => cleanProductId(p.id) !== cleanProductId(id)
      );
      const updated = saveBestSellerSettings({ pinnedAllTime: next });
      setBsSettings(updated);
      showToast("ลบสินค้าออกจากขายดีตลอดกาลแล้ว");
    }
  };

  const handleMoveAllTime = (index: number, direction: "up" | "down") => {
    const list = [...bsSettings.pinnedAllTime].sort((a, b) => a.rank - b.rank);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;
    const updatedList = list.map((item, idx) => ({ ...item, rank: idx + 1 }));
    const updated = saveBestSellerSettings({ pinnedAllTime: updatedList });
    setBsSettings(updated);
    showToast("สลับอันดับสินค้าขายดีตลอดกาลเรียบร้อยแล้ว");
  };

  const handleResetAllTimeDefaults = () => {
    if (confirm("ต้องการคืนค่ารายการสินค้าขายดีตลอดกาลเป็นค่าเริ่มต้นของระบบ (ตำนาน 5 เรื่อง) ใช่หรือไม่?")) {
      const updated = saveBestSellerSettings({ pinnedAllTime: DEFAULT_SETTINGS.pinnedAllTime });
      setBsSettings(updated);
      showToast("คืนค่าสินค้าขายดีตลอดกาลเป็นค่าเริ่มต้นแล้ว");
    }
  };

  // 3. New Arrivals Actions
  const handleSelectNewArrivalProduct = (productId: string) => {
    setNewArrProductId(productId);
    const cleanId = cleanProductId(productId);
    const isNovel = catalogData?.lightNovelSeries?.some((s) => cleanProductId(s.id) === cleanId);
    const isManga = catalogData?.mangaSeries.some((s) => cleanProductId(s.id) === cleanId);
    const isPlamo = catalogData?.plamo.some((p) => String(p.id) === cleanId || p.slug === cleanId);
    const isFig = catalogData?.figures.some((f) => String(f.id) === cleanId || f.slug === cleanId);
    
    if (isNovel) setNewArrType("LIGHT_NOVEL");
    else if (isManga) setNewArrType("MANGA");
    else if (isPlamo) setNewArrType("PLAMO");
    else if (isFig) setNewArrType("FIGURE");
    else setNewArrType("GOODS");

    if (isManga || isNovel) {
      setNewArrReleaseDateText("เล่มออกใหม่ล่าสุด · พร้อมส่ง");
      setNewArrBadgeText("NEW สัปดาห์นี้");
    } else {
      setNewArrReleaseDateText("ล็อตใหม่ล่าสุด · พร้อมส่ง");
      setNewArrBadgeText("NEW เข้าใหม่");
    }
  };

  const handleSaveNewArrivalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (bsSettings.pinnedNewArrivals.length >= TOP_ITEMS_LIMIT) {
      alert("จำกัดสินค้าใหม่สูงสุด 5 รายการเท่านั้น (หากต้องการเพิ่ม กรุณาลบหรือปรับอันดับรายการเดิมออกก่อน)");
      return;
    }
    if (!newArrProductId) {
      alert("กรุณาเลือกสินค้า");
      return;
    }
    const cleanId = cleanProductId(newArrProductId);
    const exists = bsSettings.pinnedNewArrivals.some(
      (p) => cleanProductId(p.id) === cleanId
    );
    if (exists) {
      alert("สินค้านี้อยู่ในรายการสินค้าใหม่แล้ว");
      return;
    }
    const next: PinnedNewArrival[] = [
      ...bsSettings.pinnedNewArrivals,
      {
        id: cleanId,
        type: newArrType,
        badgeText: newArrBadgeText.trim() || "NEW สัปดาห์นี้",
        releaseDateText: newArrReleaseDateText.trim() || "วางจำหน่ายสัปดาห์นี้ · พร้อมส่ง",
      },
    ];
    const updated = saveBestSellerSettings({ pinnedNewArrivals: next });
    setBsSettings(updated);
    setIsAddNewArrivalOpen(false);
    setNewArrProductId("");
    setNewArrBadgeText("NEW สัปดาห์นี้");
    setNewArrReleaseDateText("วางจำหน่ายสัปดาห์นี้ · พร้อมส่ง");
    showToast("เพิ่มสินค้าใหม่ประจำสัปดาห์เรียบร้อยแล้ว");
  };

  const handleEditNewArrivalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNewArrival) return;
    const next = bsSettings.pinnedNewArrivals.map((p) =>
      cleanProductId(p.id) === cleanProductId(editingNewArrival.id) ? editingNewArrival : p
    );
    const updated = saveBestSellerSettings({ pinnedNewArrivals: next });
    setBsSettings(updated);
    setEditingNewArrival(null);
    showToast("บันทึกการแก้ไขสินค้าใหม่เรียบร้อยแล้ว");
  };

  const handleDeleteNewArrival = (id: string, name?: string) => {
    if (confirm(`คุณต้องการลบ "${name || id}" ออกจากสินค้าใหม่ใช่หรือไม่?`)) {
      const next = bsSettings.pinnedNewArrivals.filter(
        (p) => cleanProductId(p.id) !== cleanProductId(id)
      );
      const updated = saveBestSellerSettings({ pinnedNewArrivals: next });
      setBsSettings(updated);
      showToast("ลบสินค้าออกจากรายการสินค้าใหม่แล้ว");
    }
  };

  const handleMoveNewArrival = (index: number, direction: "up" | "down") => {
    const list = [...bsSettings.pinnedNewArrivals];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;
    const updated = saveBestSellerSettings({ pinnedNewArrivals: list });
    setBsSettings(updated);
    showToast("สลับลำดับสินค้าใหม่เรียบร้อยแล้ว");
  };

  const handleResetNewArrivalsDefaults = () => {
    if (confirm("ต้องการคืนค่ารายการสินค้าใหม่เป็นค่าเริ่มต้นของระบบ (สินค้าใหม่ 5 รายการ) ใช่หรือไม่?")) {
      const updated = saveBestSellerSettings({ pinnedNewArrivals: DEFAULT_SETTINGS.pinnedNewArrivals });
      setBsSettings(updated);
      showToast("คืนค่าสินค้าใหม่เป็นค่าเริ่มต้นแล้ว");
    }
  };

  // Recommended (Staff Picks) actions
  const handleSelectRecProduct = (productId: string) => {
    setNewRecProductId(productId);
    if (!catalogData || !productId) return;

    const manga = catalogData.mangaSeries.find((s) => s.id === productId);
    const collectible = [
      ...catalogData.figures,
      ...catalogData.plamo,
      ...catalogData.goods,
      ...catalogData.accessories,
    ].find((c) => String(c.id) === productId);

    if (manga) {
      setNewRecBadgeText("MUST READ · มาสเตอร์พีซ");
      setNewRecHighlightText(`ผลงานระดับพรีเมียม ลิขสิทธิ์แท้ ${manga.publisher}`);
    } else if (collectible) {
      setNewRecBadgeText("STAFF PICK · ยอดฮิต");
      setNewRecHighlightText(`ฟิกเกอร์/ของสะสมลิขสิทธิ์แท้ ดีเทลคมชัด`);
    }
  };

  const handleAddRecommended = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catalogData || !newRecProductId) {
      alert("กรุณาเลือกสินค้า");
      return;
    }

    const isManga = catalogData.mangaSeries.some((s) => s.id === newRecProductId);
    const itemType: "MANGA" | "COLLECTIBLE" = isManga ? "MANGA" : "COLLECTIBLE";

    const exists = bsSettings.pinnedRecommended.some((r) => r.id === newRecProductId);
    if (exists) {
      alert("สินค้านี้อยู่ในรายการแนะนำแล้ว");
      return;
    }

    const newRec: PinnedRecommended = {
      id: newRecProductId,
      type: itemType,
      badgeText: newRecBadgeText.trim() || "STAFF PICK · ยอดนิยม",
      highlightText: newRecHighlightText.trim() || "แนะนำโดยทีมงานคัดสรร",
    };

    const updated = [...bsSettings.pinnedRecommended, newRec];
    saveBestSellerSettings({ pinnedRecommended: updated });
    setIsAddRecommendedOpen(false);
    setNewRecProductId("");
    setNewRecBadgeText("STAFF PICK · ยอดนิยม");
    setNewRecHighlightText("");
    showToast("เพิ่มสินค้าลงในรายการแนะนำพิเศษเรียบร้อยแล้ว");
  };

  const handleSaveRecommendedEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRec) return;

    const updated = bsSettings.pinnedRecommended.map((r) =>
      r.id === editingRec.id ? editingRec : r,
    );
    saveBestSellerSettings({ pinnedRecommended: updated });
    setEditingRec(null);
    showToast("อัปเดตข้อมูลสินค้าแนะนำเรียบร้อยแล้ว");
  };

  const handleDeleteRecommended = (id: string, name?: string) => {
    if (confirm(`คุณต้องการนำ "${name || id}" ออกจากรายการสินค้าแนะนำใช่หรือไม่?`)) {
      const updated = bsSettings.pinnedRecommended.filter((r) => r.id !== id);
      saveBestSellerSettings({ pinnedRecommended: updated });
      showToast("นำสินค้าออกจากรายการแนะนำแล้ว");
    }
  };

  // Filtered coupons
  const filteredCoupons = useMemo(() => {
    return coupons.filter((c) => {
      const matchText =
        c.code.toLowerCase().includes(promoSearch.toLowerCase()) ||
        c.title.toLowerCase().includes(promoSearch.toLowerCase());
      if (!matchText) return false;

      const isExpired = new Date() > new Date(c.expiresAt);
      if (promoFilter === "ACTIVE") return c.isActive && !isExpired;
      if (promoFilter === "EXPIRED") return isExpired;
      return true;
    });
  }, [coupons, promoSearch, promoFilter]);

  // Filtered Flash Deals by Schedule
  const filteredFlashDeals = useMemo(() => {
    if (flashTabFilter === "ALL") return flashDeals;
    return flashDeals.filter((d) => (d.schedule ?? "TODAY") === flashTabFilter);
  }, [flashDeals, flashTabFilter]);

  // Preview helper for creating new Flash Sale deal
  const newDealProductPreview = useMemo(() => {
    if (!catalogData || !newDealProductId) return null;
    const manga = catalogData.mangaSeries.find((s) => s.id === newDealProductId);
    if (manga) {
      const orig = manga.volumes.length ? manga.volumes[0].price : 115;
      const sale = Math.round(orig * (1 - newDealDiscount / 100));
      return {
        title: manga.title,
        kind: "MANGA" as const,
        originalPrice: orig,
        salePrice: sale,
        imageUrl: manga.coverUrl || manga.coverImage || manga.volumes[0]?.coverUrl || "",
      };
    }
    const collectible = [
      ...catalogData.figures,
      ...catalogData.plamo,
      ...catalogData.goods,
      ...catalogData.accessories,
    ].find((c) => String(c.id) === newDealProductId);
    if (collectible) {
      const orig = collectible.fullPrice;
      const sale = Math.round(orig * (1 - newDealDiscount / 100));
      return {
        title: collectible.name,
        kind: (collectible.category === "FIGURE" ? "FIGURE" : "ACCESSORY") as "FIGURE" | "ACCESSORY",
        originalPrice: orig,
        salePrice: sale,
        imageUrl: collectible.coverUrl || collectible.coverImage || collectible.images?.[0] || "",
      };
    }
    return null;
  }, [catalogData, newDealProductId, newDealDiscount]);

  if (isLoading) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-6xl items-center justify-center px-4">
        <p role="status" className="text-sm font-semibold text-zinc-500">
          กำลังตรวจสอบสิทธิ์...
        </p>
      </main>
    );
  }

  if (user?.role !== "ADMIN") {
    return (
      <main className="mx-auto flex min-h-[65vh] max-w-xl flex-col items-center justify-center px-5 text-center">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 dark:border-rose-900 dark:bg-rose-950/40">
          <ShieldAlert size={36} className="mx-auto text-rose-600 dark:text-rose-400" />
          <h1 className="mt-3 text-lg font-bold text-zinc-900 dark:text-zinc-100">
            เฉพาะผู้ดูแลระบบ (Admin) เท่านั้น
          </h1>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            คุณเข้าสู่ระบบด้วยบทบาท {user?.role || "ผู้เยี่ยมชม"} ซึ่งไม่ได้รับอนุญาตให้จัดการระบบโปรโมชั่น
          </p>
          <div className="mt-5">
            <Link
              href="/"
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-zinc-950 px-5 text-xs font-bold text-white shadow-xs dark:bg-zinc-100 dark:text-zinc-950"
            >
              กลับสู่หน้าหลัก
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50/70 pb-20 pt-10 sm:pt-14 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="mb-4 flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400"
        >
          <Link href="/admin" className="hover:text-orange-600 transition">
            ระบบจัดการหลังบ้าน
          </Link>
          <span>/</span>
          <span className="text-zinc-900 dark:text-zinc-100">จัดการโปรโมชั่นและส่วนลด</span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-black tracking-wide text-orange-800 dark:border-orange-900/60 dark:bg-orange-950/60 dark:text-orange-300">
              <Percent size={13} aria-hidden="true" />
              <span>PROMOTION & MARKETING CENTER</span>
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-zinc-950 dark:text-zinc-100 sm:text-3xl">
              จัดการโปรโมชั่นและส่วนลดร้านค้า
            </h1>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 sm:text-sm">
              ตั้งค่าโค้ดส่วนลด, แฟลชเซลล์ประจำวัน, เกณฑ์ส่งฟรี, ของแถม และคะแนนของรางวัลสะสมแต้ม
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              target="_blank"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-700 shadow-2xs transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <span>ดูผลลัพธ์ที่หน้าร้าน</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div
            role="status"
            className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-900 shadow-xs dark:border-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
              <span>{toastMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-emerald-700 hover:text-emerald-900 dark:text-emerald-300"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mt-6 flex flex-wrap gap-2 border-b border-zinc-200 pb-2 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setActiveTab("PROMO_CODES")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === "PROMO_CODES"
                ? "bg-zinc-950 text-white shadow-xs dark:bg-zinc-100 dark:text-zinc-950"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
            }`}
          >
            <Tag size={15} />
            <span>โค้ดส่วนลด (Coupons)</span>
            <span className="rounded-full bg-zinc-200/80 px-2 py-0.5 text-[10px] font-black text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
              {coupons.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("FLASH_SALE")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === "FLASH_SALE"
                ? "bg-zinc-950 text-white shadow-xs dark:bg-zinc-100 dark:text-zinc-950"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
            }`}
          >
            <Flame size={15} className="text-rose-500" />
            <span>แฟลชเซลล์ประจำวัน (Flash Deals)</span>
            <span className="rounded-full bg-zinc-200/80 px-2 py-0.5 text-[10px] font-black text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
              {flashDeals.filter((d) => d.isActive).length}/{flashDeals.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("THRESHOLDS")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === "THRESHOLDS"
                ? "bg-zinc-950 text-white shadow-xs dark:bg-zinc-100 dark:text-zinc-950"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
            }`}
          >
            <Sliders size={15} className="text-blue-500" />
            <span>เกณฑ์ส่งฟรี & ส่วนลดยกเซ็ต</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("BEST_SELLERS")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === "BEST_SELLERS"
                ? "bg-zinc-950 text-white shadow-xs dark:bg-zinc-100 dark:text-zinc-950"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
            }`}
          >
            <Trophy size={15} className="text-amber-500" />
            <span>สินค้าขายดี & แนะนำ (Best Sellers)</span>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-900 dark:bg-amber-950 dark:text-amber-300">
              {bsSettings.mode}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("REWARDS")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === "REWARDS"
                ? "bg-zinc-950 text-white shadow-xs dark:bg-zinc-100 dark:text-zinc-950"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
            }`}
          >
            <Gift size={15} className="text-purple-500" />
            <span>ของรางวัลสะสมแต้ม (Rewards)</span>
            <span className="rounded-full bg-zinc-200/80 px-2 py-0.5 text-[10px] font-black text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
              {rewards.length}
            </span>
          </button>
        </div>

        {/* TAB 1: PROMO CODES */}
        {activeTab === "PROMO_CODES" && (
          <section className="mt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Search & Filter */}
              <div className="flex flex-1 flex-wrap items-center gap-3">
                <div className="relative min-w-[220px] max-w-sm flex-1">
                  <Search
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
                  />
                  <input
                    type="text"
                    value={promoSearch}
                    onChange={(e) => setPromoSearch(e.target.value)}
                    placeholder="ค้นหาโค้ด หรือชื่อแคมเปญ..."
                    className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-3 text-xs font-semibold text-zinc-900 shadow-2xs focus:border-orange-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div className="flex items-center rounded-xl border border-zinc-200 bg-white p-1 text-xs font-bold dark:border-zinc-800 dark:bg-zinc-900">
                  <button
                    type="button"
                    onClick={() => setPromoFilter("ALL")}
                    className={`rounded-lg px-3 py-1.5 transition ${
                      promoFilter === "ALL"
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950"
                        : "text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    ทั้งหมด
                  </button>
                  <button
                    type="button"
                    onClick={() => setPromoFilter("ACTIVE")}
                    className={`rounded-lg px-3 py-1.5 transition ${
                      promoFilter === "ACTIVE"
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950"
                        : "text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    ใช้งานได้
                  </button>
                  <button
                    type="button"
                    onClick={() => setPromoFilter("EXPIRED")}
                    className={`rounded-lg px-3 py-1.5 transition ${
                      promoFilter === "EXPIRED"
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950"
                        : "text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    หมดอายุ
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickAddPreset("NEW_15")}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-800 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-300"
                >
                  <Sparkles size={14} />
                  <span>+ สุ่มโค้ด VIP 15%</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatePromoOpen(true)}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-orange-700"
                >
                  <Plus size={15} />
                  <span>สร้างโค้ดส่วนลดใหม่</span>
                </button>
              </div>
            </div>

            {/* Promo Codes Table */}
            <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-zinc-200 bg-zinc-100/90 font-black text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                    <tr>
                      <th className="px-4 py-3.5">โค้ดส่วนลด</th>
                      <th className="px-4 py-3.5">ชื่อแคมเปญ / คำอธิบาย</th>
                      <th className="px-4 py-3.5">ประเภท & มูลค่า</th>
                      <th className="px-4 py-3.5">ยอดสั่งซื้อขั้นต่ำ</th>
                      <th className="px-4 py-3.5">วันหมดอายุ</th>
                      <th className="px-4 py-3.5 text-center">สถานะ</th>
                      <th className="px-4 py-3.5 text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {filteredCoupons.map((coupon) => {
                      const isExpired = new Date() > new Date(coupon.expiresAt);
                      const expiryFormatted = new Date(coupon.expiresAt).toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      return (
                        <tr
                          key={coupon.code}
                          className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50"
                        >
                          <td className="whitespace-nowrap px-4 py-3.5">
                            <span className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-100 px-2 py-1 font-mono text-xs font-black text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
                              <Tag size={12} className="text-orange-600" />
                              {coupon.code}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="font-bold text-zinc-900 dark:text-zinc-100">
                              {coupon.title}
                            </p>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                              {coupon.description}
                            </p>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 font-bold">
                            {coupon.type === "FREE_SHIPPING" ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                <Truck size={14} />
                                <span>ฟรีค่าจัดส่ง</span>
                              </span>
                            ) : coupon.type === "PERCENTAGE" ? (
                              <span className="text-orange-600 dark:text-orange-400">
                                ลด {coupon.value}%
                              </span>
                            ) : (
                              <span className="text-blue-600 dark:text-blue-400">
                                ลด ฿{coupon.value.toLocaleString("th-TH")}
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-zinc-700 dark:text-zinc-300">
                            {coupon.minSpend && coupon.minSpend > 0 ? (
                              <span>฿{coupon.minSpend.toLocaleString("th-TH")}</span>
                            ) : (
                              <span className="text-zinc-400">ไม่มีขั้นต่ำ</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1 font-semibold ${
                                isExpired
                                  ? "text-rose-600 dark:text-rose-400"
                                  : "text-zinc-700 dark:text-zinc-300"
                              }`}
                            >
                              <Clock size={12} />
                              <span>{expiryFormatted}</span>
                              {isExpired && (
                                <span className="ml-1 rounded bg-rose-100 px-1.5 py-0.5 text-[9px] font-black text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                  หมดอายุ
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleTogglePromo(coupon.code)}
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black transition ${
                                coupon.isActive
                                  ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300"
                                  : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-400"
                              }`}
                            >
                              <Power size={11} />
                              <span>{coupon.isActive ? "เปิดใช้งาน" : "ปิดชั่วคราว"}</span>
                            </button>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEditingPromo(coupon)}
                                className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                                title="แก้ไขโค้ดส่วนลด"
                              >
                                <Edit2 size={13} />
                                <span>แก้ไข</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePromo(coupon.code)}
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-300"
                                title="ลบโค้ด"
                              >
                                <Trash2 size={13} />
                                <span>ลบ</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredCoupons.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="py-12 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400"
                        >
                          ไม่พบรายการโค้ดส่วนลดที่ตรงกับการค้นหา
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal: Create Promo Code */}
            {isCreatePromoOpen && (
              <div
                role="dialog"
                aria-modal="true"
                className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-xs"
              >
                <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                    <h2 className="text-base font-black text-zinc-950 dark:text-zinc-100">
                      สร้างโค้ดส่วนลดใหม่
                    </h2>
                    <button
                      type="button"
                      onClick={() => setIsCreatePromoOpen(false)}
                      className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleSavePromoCode} className="mt-4 space-y-3 text-xs">
                    <div>
                      <label className="block font-bold text-zinc-700 dark:text-zinc-300">
                        รหัสโค้ด (Code):
                      </label>
                      <input
                        type="text"
                        required
                        value={newPromoCode}
                        onChange={(e) => setNewPromoCode(e.target.value.toUpperCase())}
                        placeholder="เช่น SPECIAL20, SHIPFREE"
                        className="mt-1 w-full rounded-xl border border-zinc-300 bg-white p-2.5 font-mono text-xs font-bold uppercase focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-zinc-700 dark:text-zinc-300">
                        ชื่อแคมเปญ (Title):
                      </label>
                      <input
                        type="text"
                        required
                        value={newPromoTitle}
                        onChange={(e) => setNewPromoTitle(e.target.value)}
                        placeholder="เช่น ส่วนลดพิเศษ 20% ประจำเดือน"
                        className="mt-1 w-full rounded-xl border border-zinc-300 bg-white p-2.5 font-semibold focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-zinc-700 dark:text-zinc-300">
                        คำอธิบายเงื่อนไข:
                      </label>
                      <input
                        type="text"
                        value={newPromoDesc}
                        onChange={(e) => setNewPromoDesc(e.target.value)}
                        placeholder="เช่น ใช้ได้กับสินค้าทุกหมวดหมู่ ยกเว้นพรีออเดอร์"
                        className="mt-1 w-full rounded-xl border border-zinc-300 bg-white p-2.5 font-semibold focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-zinc-700 dark:text-zinc-300">
                          ประเภทส่วนลด:
                        </label>
                        <select
                          value={newPromoType}
                          onChange={(e) =>
                            setNewPromoType(
                              e.target.value as "PERCENTAGE" | "FIXED" | "FREE_SHIPPING",
                            )
                          }
                          className="mt-1 w-full rounded-xl border border-zinc-300 bg-white p-2.5 font-bold focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        >
                          <option value="PERCENTAGE">เปอร์เซ็นต์ (%)</option>
                          <option value="FIXED">จำนวนเงินคงที่ (฿)</option>
                          <option value="FREE_SHIPPING">ฟรีค่าจัดส่ง</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-zinc-700 dark:text-zinc-300">
                          มูลค่าส่วนลด:
                        </label>
                        <input
                          type="number"
                          min="1"
                          disabled={newPromoType === "FREE_SHIPPING"}
                          value={newPromoValue}
                          onChange={(e) => setNewPromoValue(Number(e.target.value))}
                          className="mt-1 w-full rounded-xl border border-zinc-300 bg-white p-2.5 font-bold focus:border-orange-500 focus:outline-none disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-zinc-700 dark:text-zinc-300">
                          ยอดซื้อขั้นต่ำ (บาท):
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={newPromoMinSpend}
                          onChange={(e) => setNewPromoMinSpend(Number(e.target.value))}
                          placeholder="0 สำหรับไม่มีขั้นต่ำ"
                          className="mt-1 w-full rounded-xl border border-zinc-300 bg-white p-2.5 font-bold focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-zinc-700 dark:text-zinc-300">
                          วันหมดอายุ:
                        </label>
                        <input
                          type="datetime-local"
                          value={newPromoExpiresAt}
                          onChange={(e) => setNewPromoExpiresAt(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-zinc-300 bg-white p-2.5 font-bold focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                      <button
                        type="button"
                        onClick={() => setIsCreatePromoOpen(false)}
                        className="rounded-xl border border-zinc-200 px-4 py-2 font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="submit"
                        className="rounded-xl bg-orange-600 px-5 py-2 font-black text-white hover:bg-orange-700"
                      >
                        บันทึกโค้ด
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Modal: Edit Promo Code */}
            {editingPromo && (
              <div
                role="dialog"
                aria-modal="true"
                className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-xs"
              >
                <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                    <h2 className="text-base font-black text-zinc-950 dark:text-zinc-100">
                      แก้ไขโค้ดส่วนลด: {editingPromo.code}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setEditingPromo(null)}
                      className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleSavePromoEdit} className="mt-4 space-y-3 text-xs">
                    <div>
                      <label className="block font-bold text-zinc-700 dark:text-zinc-300">
                        ชื่อแคมเปญ:
                      </label>
                      <input
                        type="text"
                        required
                        value={editingPromo.title}
                        onChange={(e) =>
                          setEditingPromo({ ...editingPromo, title: e.target.value })
                        }
                        className="mt-1 w-full rounded-xl border border-zinc-300 bg-white p-2.5 font-bold focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-zinc-700 dark:text-zinc-300">
                        คำอธิบาย / เงื่อนไข:
                      </label>
                      <input
                        type="text"
                        value={editingPromo.description}
                        onChange={(e) =>
                          setEditingPromo({ ...editingPromo, description: e.target.value })
                        }
                        className="mt-1 w-full rounded-xl border border-zinc-300 bg-white p-2.5 font-semibold focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-zinc-700 dark:text-zinc-300">
                          ประเภทส่วนลด:
                        </label>
                        <select
                          value={editingPromo.type}
                          onChange={(e) =>
                            setEditingPromo({
                              ...editingPromo,
                              type: e.target.value as any,
                            })
                          }
                          className="mt-1 w-full rounded-xl border border-zinc-300 bg-white p-2.5 font-bold focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        >
                          <option value="PERCENTAGE">เปอร์เซ็นต์ (%)</option>
                          <option value="FIXED">ลดเงินสดคงที่ (บาท)</option>
                          <option value="FREE_SHIPPING">ฟรีค่าจัดส่ง</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-zinc-700 dark:text-zinc-300">
                          มูลค่าส่วนลด:
                        </label>
                        <input
                          type="number"
                          min="1"
                          disabled={editingPromo.type === "FREE_SHIPPING"}
                          value={editingPromo.value}
                          onChange={(e) =>
                            setEditingPromo({
                              ...editingPromo,
                              value: Number(e.target.value),
                            })
                          }
                          className="mt-1 w-full rounded-xl border border-zinc-300 bg-white p-2.5 font-bold focus:border-orange-500 focus:outline-none disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-zinc-700 dark:text-zinc-300">
                          ยอดสั่งซื้อขั้นต่ำ (บาท):
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={editingPromo.minSpend || 0}
                          onChange={(e) =>
                            setEditingPromo({
                              ...editingPromo,
                              minSpend: Number(e.target.value),
                            })
                          }
                          className="mt-1 w-full rounded-xl border border-zinc-300 bg-white p-2.5 font-bold focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-zinc-700 dark:text-zinc-300">
                          วันหมดอายุ:
                        </label>
                        <input
                          type="datetime-local"
                          value={editingPromo.expiresAt ? editingPromo.expiresAt.substring(0, 16) : ""}
                          onChange={(e) =>
                            setEditingPromo({
                              ...editingPromo,
                              expiresAt: new Date(e.target.value).toISOString(),
                            })
                          }
                          className="mt-1 w-full rounded-xl border border-zinc-300 bg-white p-2.5 font-bold focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                      <button
                        type="button"
                        onClick={() => setEditingPromo(null)}
                        className="rounded-xl border border-zinc-200 px-4 py-2 font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="submit"
                        className="rounded-xl bg-orange-600 px-5 py-2 font-black text-white hover:bg-orange-700"
                      >
                        บันทึกการแก้ไข
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </section>
        )}

        {/* TAB 2: FLASH SALE DEALS */}
        {activeTab === "FLASH_SALE" && (
          <section className="mt-6">
            {/* Global Flash Sale Toggle Card */}
            <div className="flex flex-col gap-4 rounded-2xl border border-rose-200 bg-rose-50/60 p-5 dark:border-rose-950/60 dark:bg-rose-950/20 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase text-rose-800 dark:text-rose-300">
                  <Flame size={14} className="text-rose-600" />
                  <span>การแสดงผลแบนเนอร์ Flash Sale หน้าร้าน</span>
                </div>
                <h3 className="mt-1 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  เปิด/ปิด แบนเนอร์ Flash Sale ประจำวันบนหน้าแรกของสโตร์
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  สถานะปัจจุบัน:{" "}
                  <span
                    className={`font-black ${
                      settings.isFlashSaleActive
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-zinc-500"
                    }`}
                  >
                    {settings.isFlashSaleActive ? "เปิดแสดงผลอยู่" : "ปิดการแสดงผลชั่วคราว"}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    updatePromotionSettings({ isFlashSaleActive: !settings.isFlashSaleActive });
                    showToast(
                      `ปรับสถานะแบนเนอร์ Flash Sale เป็น ${
                        !settings.isFlashSaleActive ? "เปิดใช้งาน" : "ปิดชั่วคราว"
                      }`,
                    );
                  }}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-4 py-2 text-xs font-black shadow-xs transition ${
                    settings.isFlashSaleActive
                      ? "bg-rose-600 text-white hover:bg-rose-700"
                      : "bg-zinc-800 text-white hover:bg-zinc-900 dark:bg-zinc-200 dark:text-zinc-900"
                  }`}
                >
                  <Power size={14} />
                  <span>
                    {settings.isFlashSaleActive ? "ปิดแบนเนอร์ Flash Sale" : "เปิดแบนเนอร์ Flash Sale"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateDealOpen(true)}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-rose-700"
                >
                  <Plus size={15} />
                  <span>เพิ่มสินค้าลง Flash Sale ใหม่</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetFlashDeals}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                >
                  <RefreshCw size={13} />
                  <span>รีเซ็ตค่าเดิม</span>
                </button>
              </div>
            </div>

            {/* Schedule Filter Tabs */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-3 dark:border-zinc-800">
              <div className="inline-flex rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800/80">
                <button
                  type="button"
                  onClick={() => setFlashTabFilter("ALL")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    flashTabFilter === "ALL"
                      ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-zinc-100"
                      : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                  }`}
                >
                  ทั้งหมด ({flashDeals.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFlashTabFilter("TODAY")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    flashTabFilter === "TODAY"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                  }`}
                >
                  <Flame size={13} />
                  <span>รอบวันนี้ ({flashDeals.filter((d) => (d.schedule ?? "TODAY") === "TODAY").length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFlashTabFilter("TOMORROW")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    flashTabFilter === "TOMORROW"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                  }`}
                >
                  <Clock size={13} />
                  <span>รอบวันพรุ่งนี้ ({flashDeals.filter((d) => d.schedule === "TOMORROW").length})</span>
                </button>
              </div>

              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                {flashTabFilter === "TODAY" && "แสดงดีลที่กำลังเปิดขายและลดราคาอยู่ ณ วันนี้ (มีเคานต์ดาวน์และปุ่มสั่งซื้อ)"}
                {flashTabFilter === "TOMORROW" && "แสดงดีลรอบวันถัดไป (Upcoming) ที่ลูกค้าสามารถกดบันทึกใส่ Wishlist"}
                {flashTabFilter === "ALL" && "แสดงรายการดีลทั้งหมดทั้งรอบวันนี้และรอบวันพรุ่งนี้"}
              </div>
            </div>

            {/* Flash Deals Grid */}
            {filteredFlashDeals.length === 0 ? (
              <div className="mt-8 rounded-2xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-800">
                <Flame size={32} className="mx-auto text-zinc-300 dark:text-zinc-700" />
                <p className="mt-2 text-sm font-bold text-zinc-600 dark:text-zinc-400">
                  ไม่พบรายการสินค้า Flash Sale ในรอบนี้
                </p>
                <button
                  type="button"
                  onClick={() => setIsCreateDealOpen(true)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700"
                >
                  <Plus size={14} />
                  <span>เพิ่มสินค้าลงรอบนี้ทันที</span>
                </button>
              </div>
            ) : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {filteredFlashDeals.map((deal) => {
                  const quota = deal.quota ?? 20;
                  const sold = deal.soldCount ?? 0;
                  const isTomorrow = deal.schedule === "TOMORROW";

                  return (
                    <div
                      key={deal.id}
                      className={`flex flex-col justify-between rounded-2xl border p-4 shadow-2xs transition ${
                        deal.isActive
                          ? "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                          : "border-zinc-200 bg-zinc-50/70 opacity-60 dark:border-zinc-800 dark:bg-zinc-900/40"
                      }`}
                    >
                      <div>
                        {/* Image & Badges */}
                        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
                          <img
                            src={deal.imageUrl}
                            alt={deal.title}
                            className="h-full w-full object-cover"
                          />
                          <span className="absolute left-2.5 top-2.5 rounded-md bg-rose-600 px-2 py-0.5 text-[11px] font-black text-white shadow-xs">
                            -{deal.discountPercent}%
                          </span>
                          <span className="absolute bottom-2.5 left-2.5 rounded-md bg-zinc-950/80 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
                            {deal.categoryLabel}
                          </span>
                        </div>

                        {/* Schedule Badge */}
                        <div className="mt-2.5">
                          {isTomorrow ? (
                            <span className="inline-flex items-center gap-1 rounded-md border border-blue-500/20 bg-blue-50 px-2 py-0.5 text-[10px] font-black text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/60 dark:text-blue-300">
                              <Clock size={11} className="text-blue-600 dark:text-blue-400" />
                              <span>รอบวันพรุ่งนี้ (Upcoming)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/20 bg-rose-50 px-2 py-0.5 text-[10px] font-black text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/60 dark:text-rose-300">
                              <Flame size={11} className="text-rose-600 dark:text-rose-400" />
                              <span>รอบวันนี้ (ลดราคาอยู่)</span>
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h4 className="mt-1.5 text-xs font-bold text-zinc-900 line-clamp-2 dark:text-zinc-100">
                          {deal.title}
                        </h4>

                        {/* Pricing */}
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-base font-black text-rose-600 dark:text-rose-400">
                            ฿{deal.salePrice.toLocaleString("th-TH")}
                          </span>
                          <span className="text-xs font-semibold text-zinc-400 line-through">
                            ฿{deal.originalPrice.toLocaleString("th-TH")}
                          </span>
                        </div>

                        {/* Quota & Stock Progress */}
                        <div className="mt-2.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                          <div className="flex items-center justify-between font-semibold">
                            <span>{deal.stockNote}</span>
                            <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300">
                              โควต้า {sold}/{quota}
                            </span>
                          </div>
                          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isTomorrow
                                  ? "bg-gradient-to-r from-blue-500 to-indigo-600"
                                  : "bg-gradient-to-r from-orange-500 to-rose-600"
                              }`}
                              style={{ width: `${Math.min(100, deal.soldPercent)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="mt-4 flex items-center gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                        <button
                          type="button"
                          onClick={() => handleToggleFlashDeal(deal.id)}
                          className={`flex-1 rounded-xl px-2.5 py-1.5 text-xs font-bold transition ${
                            deal.isActive
                              ? "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                              : "bg-rose-100 text-rose-800 hover:bg-rose-200 dark:bg-rose-950/70 dark:text-rose-300"
                          }`}
                        >
                          {deal.isActive ? "ระงับชั่วคราว" : "เปิดแสดงผล"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingDeal(deal)}
                          className="rounded-xl border border-zinc-200 p-2 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          title="แก้ไขโควต้าและราคา Flash Sale"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteFlashDeal(deal.id)}
                          className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-rose-600 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-300"
                          title="ลบออกจาก Flash Sale"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Modal: Edit Flash Sale Deal */}
            {editingDeal && (() => {
              const currentQuota = editingDeal.quota ?? 20;
              const currentSoldCount = editingDeal.soldCount ?? 0;
              const previewProgress = calculateFlashSaleProgress(currentQuota, currentSoldCount, editingDeal.kind);
              const remaining = Math.max(0, currentQuota - currentSoldCount);

              return (
                <div
                  role="dialog"
                  aria-modal="true"
                  className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-xs"
                >
                  <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                      <h3 className="text-sm font-black text-zinc-950 dark:text-zinc-100 flex items-center gap-2">
                        <Edit2 size={16} className="text-rose-600" />
                        <span>แก้ไขดีล Flash Sale</span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => setEditingDeal(null)}
                        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <form onSubmit={handleSaveDealEdit} className="mt-4 space-y-4 text-xs">
                      {/* Product Header */}
                      <div className="flex items-center gap-3 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/60">
                        <img
                          src={editingDeal.imageUrl}
                          alt={editingDeal.title}
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-zinc-900 dark:text-zinc-100 truncate">{editingDeal.title}</p>
                          <p className="text-[11px] text-zinc-500">
                            ราคาตั้งต้น: ฿{editingDeal.originalPrice.toLocaleString("th-TH")}
                          </p>
                        </div>
                      </div>

                      {/* 1. Schedule Selection */}
                      <div>
                        <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                          รอบเวลาโปรโมชั่น (Schedule):
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingDeal({ ...editingDeal, schedule: "TODAY" })}
                            className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 font-bold transition ${
                              (editingDeal.schedule ?? "TODAY") === "TODAY"
                                ? "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                                : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                            }`}
                          >
                            <Flame size={14} className="text-rose-500" />
                            <span>รอบวันนี้ (Live Now)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingDeal({ ...editingDeal, schedule: "TOMORROW" })}
                            className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 font-bold transition ${
                              editingDeal.schedule === "TOMORROW"
                                ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                                : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                            }`}
                          >
                            <Clock size={14} className="text-blue-500" />
                            <span>รอบวันพรุ่งนี้ (Upcoming)</span>
                          </button>
                        </div>
                      </div>

                      {/* 2. Discount & Sale Price */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                            ส่วนลด (%):
                          </label>
                          <input
                            type="number"
                            min="5"
                            max="90"
                            value={editingDeal.discountPercent}
                            onChange={(e) => {
                              const percent = Number(e.target.value);
                              const newSalePrice = Math.round(
                                editingDeal.originalPrice * (1 - percent / 100),
                              );
                              setEditingDeal({
                                ...editingDeal,
                                discountPercent: percent,
                                salePrice: newSalePrice,
                              });
                            }}
                            className="w-full rounded-xl border border-zinc-300 bg-white p-2.5 font-bold text-rose-600 focus:border-rose-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                            ราคาลด Flash Sale (฿):
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={editingDeal.salePrice}
                            onChange={(e) => {
                              const price = Number(e.target.value);
                              const discount = Math.round(
                                ((editingDeal.originalPrice - price) / editingDeal.originalPrice) * 100,
                              );
                              setEditingDeal({
                                ...editingDeal,
                                salePrice: price,
                                discountPercent: Math.max(0, discount),
                              });
                            }}
                            className="w-full rounded-xl border border-zinc-300 bg-white p-2.5 font-bold text-zinc-900 focus:border-rose-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                          />
                        </div>
                      </div>

                      {/* 3. Automated Quota & Sold Calculation */}
                      <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-3.5 dark:border-amber-900/40 dark:bg-amber-950/20">
                        <div className="flex items-center gap-1.5 text-xs font-black text-amber-900 dark:text-amber-200 mb-2">
                          <Boxes size={14} className="text-amber-600" />
                          <span>ระบบคำนวณโควต้าและสต็อกอัตโนมัติ</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                              จำนวนโควต้าทั้งหมด:
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={currentQuota}
                              onChange={(e) => {
                                const q = Math.max(1, Number(e.target.value));
                                const s = Math.min(q, currentSoldCount);
                                const progress = calculateFlashSaleProgress(q, s, editingDeal.kind);
                                setEditingDeal({
                                  ...editingDeal,
                                  quota: q,
                                  soldCount: s,
                                  soldPercent: progress.soldPercent,
                                  stockNote: progress.stockNote,
                                });
                              }}
                              className="w-full rounded-xl border border-zinc-300 bg-white p-2 font-bold focus:border-amber-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                              ขายไปแล้ว (ชิ้น/เล่ม):
                            </label>
                            <input
                              type="number"
                              min="0"
                              max={currentQuota}
                              value={currentSoldCount}
                              onChange={(e) => {
                                const s = Math.max(0, Math.min(currentQuota, Number(e.target.value)));
                                const progress = calculateFlashSaleProgress(currentQuota, s, editingDeal.kind);
                                setEditingDeal({
                                  ...editingDeal,
                                  soldCount: s,
                                  soldPercent: progress.soldPercent,
                                  stockNote: progress.stockNote,
                                });
                              }}
                              className="w-full rounded-xl border border-zinc-300 bg-white p-2 font-bold focus:border-amber-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                            />
                          </div>
                        </div>

                        {/* Live Calculation Preview Card */}
                        <div className="mt-3 rounded-lg border border-amber-200 bg-white p-2.5 dark:border-amber-800 dark:bg-zinc-800/80">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-zinc-500 dark:text-zinc-400">
                              คำนวณอัตโนมัติ:
                            </span>
                            <span className="font-bold text-amber-700 dark:text-amber-300">
                              ขายแล้ว {previewProgress.soldPercent}% (เหลือ {remaining})
                            </span>
                          </div>
                          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-700">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-rose-600 transition-all duration-300"
                              style={{ width: `${previewProgress.soldPercent}%` }}
                            />
                          </div>
                          <p className="mt-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                            ข้อความแสดงหน้าร้าน: <span className="font-bold text-zinc-900 dark:text-zinc-100">"{editingDeal.stockNote?.trim() ? editingDeal.stockNote : previewProgress.stockNote}"</span>
                          </p>
                        </div>
                      </div>

                      {/* 4. Custom Stock Note Override (Optional) */}
                      <div>
                        <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                          ข้อความระบุสต็อก (ปรับแต่งเองได้ หากต้องการ):
                        </label>
                        <input
                          type="text"
                          value={editingDeal.stockNote}
                          placeholder={previewProgress.stockNote}
                          onChange={(e) =>
                            setEditingDeal({
                              ...editingDeal,
                              stockNote: e.target.value,
                            })
                          }
                          className="w-full rounded-xl border border-zinc-300 bg-white p-2.5 font-semibold text-zinc-800 focus:border-rose-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        />
                        <p className="mt-1 text-[10px] text-zinc-400">
                          *เว้นว่างไว้หากต้องการให้ระบบใช้ข้อความที่คำนวณให้อัตโนมัติ
                        </p>
                      </div>

                      <div className="mt-6 flex justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                        <button
                          type="button"
                          onClick={() => setEditingDeal(null)}
                          className="rounded-xl border border-zinc-200 px-4 py-2 font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
                        >
                          ยกเลิก
                        </button>
                        <button
                          type="submit"
                          className="rounded-xl bg-rose-600 px-5 py-2 font-black text-white hover:bg-rose-700 shadow-xs"
                        >
                          บันทึกการเปลี่ยนแปลง
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              );
            })()}

            {/* Modal: Create Flash Sale Deal */}
            {isCreateDealOpen && (() => {
              const previewKind = newDealProductPreview?.kind ?? "MANGA";
              const autoProgress = calculateFlashSaleProgress(newDealQuota, newDealSoldCount, previewKind);
              const remaining = Math.max(0, newDealQuota - newDealSoldCount);

              return (
                <div
                  role="dialog"
                  aria-modal="true"
                  className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-xs"
                >
                  <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                      <h3 className="text-sm font-black text-zinc-950 dark:text-zinc-100 flex items-center gap-2">
                        <Flame className="text-rose-600" size={16} />
                        <span>เพิ่มสินค้าลง Flash Sale ใหม่</span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => setIsCreateDealOpen(false)}
                        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <form onSubmit={handleCreateFlashDeal} className="mt-4 space-y-4 text-xs">
                      {/* 1. Schedule Selector */}
                      <div>
                        <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                          เลือกรอบเวลา Flash Sale (Schedule):
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setNewDealSchedule("TODAY")}
                            className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 font-bold transition ${
                              newDealSchedule === "TODAY"
                                ? "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                                : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                            }`}
                          >
                            <Flame size={14} className="text-rose-500" />
                            <span>รอบวันนี้ (Live Deal)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewDealSchedule("TOMORROW")}
                            className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 font-bold transition ${
                              newDealSchedule === "TOMORROW"
                                ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                                : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                            }`}
                          >
                            <Clock size={14} className="text-blue-500" />
                            <span>รอบวันพรุ่งนี้ (Upcoming)</span>
                          </button>
                        </div>
                        <p className="mt-1 text-[10px] text-zinc-500">
                          {newDealSchedule === "TODAY"
                            ? "*รอบวันนี้: แสดงราคาส่วนลดทันที พร้อมปุ่มใส่ตะกร้าและนับถอยหลัง"
                            : "*รอบวันพรุ่งนี้: แสดงตัวอย่างล่วงหน้า พร้อมปุ่มให้ลูกค้าบันทึก Wishlist รอช้อป"}
                        </p>
                      </div>

                      {/* 2. Product Picker from Catalog */}
                      <div>
                        <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                          เลือกสินค้าจากสต็อก / แคตตาล็อก:
                        </label>
                        <select
                          required
                          value={newDealProductId}
                          onChange={(e) => setNewDealProductId(e.target.value)}
                          className="w-full rounded-xl border border-zinc-300 bg-white p-2.5 font-semibold text-zinc-800 focus:border-rose-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        >
                          <option value="">-- กรุณาเลือกสินค้าที่มีในระบบ --</option>
                          <optgroup label="มังงะ (Manga)">
                            {catalogData?.mangaSeries.map((m) => (
                              <option key={m.id} value={m.id}>
                                [มังงะ] {m.title} (ปกติ ฿{m.volumes[0]?.price ?? 115})
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Figure & Gunpla & ของสะสม">
                            {catalogData?.figures.map((f) => (
                              <option key={f.id} value={String(f.id)}>
                                [Figure] {f.name} (ปกติ ฿{f.fullPrice})
                              </option>
                            ))}
                            {catalogData?.plamo.map((p) => (
                              <option key={p.id} value={String(p.id)}>
                                [Gunpla] {p.name} (ปกติ ฿{p.fullPrice})
                              </option>
                            ))}
                            {catalogData?.goods.map((g) => (
                              <option key={g.id} value={String(g.id)}>
                                [ของสะสม] {g.name}
                              </option>
                            ))}
                            {catalogData?.accessories.map((a) => (
                              <option key={a.id} value={String(a.id)}>
                                [อุปกรณ์] {a.name} (ปกติ ฿{a.fullPrice})
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </div>

                      {/* Selected Product Preview */}
                      {newDealProductPreview && (
                        <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 dark:border-zinc-800 dark:bg-zinc-800/50">
                          {newDealProductPreview.imageUrl && (
                            <img
                              src={newDealProductPreview.imageUrl}
                              alt=""
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-zinc-900 dark:text-zinc-100 truncate">
                              {newDealProductPreview.title}
                            </p>
                            <p className="text-[11px] text-zinc-500">
                              ราคาปกติ ฿{newDealProductPreview.originalPrice.toLocaleString("th-TH")} → ลดเหลือ{" "}
                              <span className="font-black text-rose-600">
                                ฿{newDealProductPreview.salePrice.toLocaleString("th-TH")}
                              </span>{" "}
                              (-{newDealDiscount}%)
                            </p>
                          </div>
                        </div>
                      )}

                      {/* 3. Discount Percent */}
                      <div>
                        <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                          เปอร์เซ็นต์ส่วนลด (%):
                        </label>
                        <input
                          type="number"
                          min="5"
                          max="90"
                          required
                          value={newDealDiscount}
                          onChange={(e) => setNewDealDiscount(Number(e.target.value))}
                          className="w-full rounded-xl border border-zinc-300 bg-white p-2.5 font-bold text-rose-600 focus:border-rose-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800"
                        />
                      </div>

                      {/* 4. Quota and Sold Count Inputs */}
                      <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-3.5 dark:border-amber-900/40 dark:bg-amber-950/20">
                        <div className="flex items-center gap-1.5 text-xs font-black text-amber-900 dark:text-amber-200 mb-2">
                          <Boxes size={14} className="text-amber-600" />
                          <span>ระบุจำนวนโควต้า & คำนวณสต็อกอัตโนมัติ</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                              จำนวนโควต้าจัดโปร:
                            </label>
                            <input
                              type="number"
                              min="1"
                              required
                              value={newDealQuota}
                              onChange={(e) => {
                                const q = Math.max(1, Number(e.target.value));
                                setNewDealQuota(q);
                                if (newDealSoldCount > q) setNewDealSoldCount(q);
                              }}
                              className="w-full rounded-xl border border-zinc-300 bg-white p-2 font-bold focus:border-amber-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                              ขายไปแล้วเริ่มต้น:
                            </label>
                            <input
                              type="number"
                              min="0"
                              max={newDealQuota}
                              required
                              value={newDealSoldCount}
                              onChange={(e) => setNewDealSoldCount(Math.max(0, Math.min(newDealQuota, Number(e.target.value))))}
                              className="w-full rounded-xl border border-zinc-300 bg-white p-2 font-bold focus:border-amber-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                            />
                          </div>
                        </div>

                        {/* Live Auto-Calculation Preview */}
                        <div className="mt-3 rounded-lg border border-amber-200 bg-white p-2.5 dark:border-amber-800 dark:bg-zinc-800/80">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-zinc-500 dark:text-zinc-400">
                              คำนวณอัตโนมัติ:
                            </span>
                            <span className="font-bold text-amber-700 dark:text-amber-300">
                              ขายแล้ว {autoProgress.soldPercent}% (เหลือ {remaining})
                            </span>
                          </div>
                          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-700">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-rose-600 transition-all duration-300"
                              style={{ width: `${autoProgress.soldPercent}%` }}
                            />
                          </div>
                          <p className="mt-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                            ข้อความที่จะแสดง: <span className="font-bold text-zinc-900 dark:text-zinc-100">"{newDealStockNote.trim() || autoProgress.stockNote}"</span>
                          </p>
                        </div>
                      </div>

                      {/* 5. Custom Stock Note Override */}
                      <div>
                        <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                          ข้อความระบุสต็อก / สิทธิ์ (ไม่บังคับ - ปล่อยว่างเพื่อใช้ค่าคำนวณ):
                        </label>
                        <input
                          type="text"
                          value={newDealStockNote}
                          onChange={(e) => setNewDealStockNote(e.target.value)}
                          placeholder={autoProgress.stockNote}
                          className="w-full rounded-xl border border-zinc-300 bg-white p-2.5 font-semibold text-zinc-800 focus:border-rose-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        />
                      </div>

                      <div className="mt-6 flex justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                        <button
                          type="button"
                          onClick={() => setIsCreateDealOpen(false)}
                          className="rounded-xl border border-zinc-200 px-4 py-2 font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
                        >
                          ยกเลิก
                        </button>
                        <button
                          type="submit"
                          className="rounded-xl bg-rose-600 px-5 py-2 font-black text-white hover:bg-rose-700 shadow-xs"
                        >
                          บันทึกดีล Flash Sale
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              );
            })()}
          </section>
        )}

        {/* TAB 3: THRESHOLDS & VOLUME TIERS */}
        {activeTab === "THRESHOLDS" && (
          <section className="mt-6 max-w-4xl">
            <form onSubmit={handleSaveSettings} className="space-y-6">
              {/* Free Shipping & Gift Threshold Card */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
                  <Truck size={18} className="text-blue-600" />
                  <h3 className="text-sm font-black text-zinc-950 dark:text-zinc-100">
                    เกณฑ์ยอดจัดส่งฟรี และของแถมสมนาคุณ (Thresholds)
                  </h3>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      ยอดสั่งซื้อขั้นต่ำเพื่อรับส่งฟรี (บาท):
                    </label>
                    <div className="relative mt-1">
                      <input
                        type="number"
                        min="0"
                        value={formSettings.freeShippingThreshold}
                        onChange={(e) =>
                          setFormSettings({
                            ...formSettings,
                            freeShippingThreshold: Number(e.target.value),
                          })
                        }
                        className="w-full rounded-xl border border-zinc-300 bg-white p-2.5 font-bold focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                        THB
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      เมื่อยอดรวมสินค้าในตะกร้าถึงจำนวนนี้ ระบบจะปรับค่าจัดส่งเป็น ฿0 อัตโนมัติ
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      ยอดสั่งซื้อเพื่อรับของแถมสมนาคุณ (บาท):
                    </label>
                    <div className="relative mt-1">
                      <input
                        type="number"
                        min="0"
                        value={formSettings.bonusGiftThreshold}
                        onChange={(e) =>
                          setFormSettings({
                            ...formSettings,
                            bonusGiftThreshold: Number(e.target.value),
                          })
                        }
                        className="w-full rounded-xl border border-zinc-300 bg-white p-2.5 font-bold focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                        THB
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      แสดงแถบความคืบหน้า (Progress Bar) ปลดล็อกของแถมใน Cart Drawer
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    ชื่อของแถมพิเศษเมื่อช้อปครบเกณฑ์:
                  </label>
                  <input
                    type="text"
                    value={formSettings.bonusGiftTitle}
                    onChange={(e) =>
                      setFormSettings({
                        ...formSettings,
                        bonusGiftTitle: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-zinc-300 bg-white p-2.5 text-xs font-semibold focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>
              </div>

              {/* Volume Discount Tiers Card */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
                  <Layers size={18} className="text-orange-600" />
                  <h3 className="text-sm font-black text-zinc-950 dark:text-zinc-100">
                    ส่วนลดซื้อยกเซ็ตตามจำนวนเล่ม (Tiered Volume Discounts)
                  </h3>
                </div>
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  ส่วนลดแบบขั้นบันไดเมื่อลูกค้าเลือกซื้อหนังสือมังงะ/ไลท์โนเวลหลายเล่มในเรื่องเดียวกัน
                </p>

                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  {/* Tier 1 */}
                  <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
                    <span className="rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-black uppercase text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                      ระดับที่ 1 (เริ่มต้น)
                    </span>
                    <div className="mt-3">
                      <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400">
                        ขั้นต่ำ (เล่ม):
                      </label>
                      <input
                        type="number"
                        min="2"
                        value={formSettings.tier1MinVolumes}
                        onChange={(e) =>
                          setFormSettings({
                            ...formSettings,
                            tier1MinVolumes: Number(e.target.value),
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs font-bold dark:border-zinc-700 dark:bg-zinc-800"
                      />
                    </div>
                    <div className="mt-3">
                      <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400">
                        ส่วนลด (%):
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={formSettings.tier1DiscountPercent}
                        onChange={(e) =>
                          setFormSettings({
                            ...formSettings,
                            tier1DiscountPercent: Number(e.target.value),
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs font-bold text-orange-600 dark:border-zinc-700 dark:bg-zinc-800"
                      />
                    </div>
                  </div>

                  {/* Tier 2 */}
                  <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
                    <span className="rounded bg-orange-100 px-2 py-0.5 text-[10px] font-black uppercase text-orange-800 dark:bg-orange-950 dark:text-orange-300">
                      ระดับที่ 2 (ยอดนิยม)
                    </span>
                    <div className="mt-3">
                      <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400">
                        ขั้นต่ำ (เล่ม):
                      </label>
                      <input
                        type="number"
                        min="4"
                        value={formSettings.tier2MinVolumes}
                        onChange={(e) =>
                          setFormSettings({
                            ...formSettings,
                            tier2MinVolumes: Number(e.target.value),
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs font-bold dark:border-zinc-700 dark:bg-zinc-800"
                      />
                    </div>
                    <div className="mt-3">
                      <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400">
                        ส่วนลด (%):
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={formSettings.tier2DiscountPercent}
                        onChange={(e) =>
                          setFormSettings({
                            ...formSettings,
                            tier2DiscountPercent: Number(e.target.value),
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs font-bold text-orange-600 dark:border-zinc-700 dark:bg-zinc-800"
                      />
                    </div>
                  </div>

                  {/* Tier 3 */}
                  <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
                    <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-black uppercase text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                      ระดับที่ 3 (ยกเซ็ตใหญ่)
                    </span>
                    <div className="mt-3">
                      <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400">
                        ขั้นต่ำ (เล่ม):
                      </label>
                      <input
                        type="number"
                        min="6"
                        value={formSettings.tier3MinVolumes}
                        onChange={(e) =>
                          setFormSettings({
                            ...formSettings,
                            tier3MinVolumes: Number(e.target.value),
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs font-bold dark:border-zinc-700 dark:bg-zinc-800"
                      />
                    </div>
                    <div className="mt-3">
                      <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400">
                        ส่วนลด (%):
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={formSettings.tier3DiscountPercent}
                        onChange={(e) =>
                          setFormSettings({
                            ...formSettings,
                            tier3DiscountPercent: Number(e.target.value),
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs font-bold text-rose-600 dark:border-zinc-700 dark:bg-zinc-800"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 4: Loyalty Points Redemption Settings */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center gap-2 border-b border-zinc-100 pb-4 dark:border-zinc-800">
                  <PointBadge size="sm" />
                  <div>
                    <h4 className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                      ตั้งค่าระบบแต้มสะสมแลกส่วนลด (Loyalty Points to Discount)
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      กำหนดอัตราแปลงแต้มสะสมเป็นเงินบาทส่วนลด ณ ขั้นตอนชำระเงิน (Checkout)
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      อัตราแลกแต้ม (แต้มต่อ 1 บาท):
                    </label>
                    <p className="mt-0.5 text-[10px] text-zinc-500">
                      ค่ามาตรฐานแนะนำ: 10 แต้ม = 1 บาท
                    </p>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={formSettings.pointsRate ?? 10}
                      onChange={(e) =>
                        setFormSettings({
                          ...formSettings,
                          pointsRate: Number(e.target.value),
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-zinc-300 bg-white p-2.5 text-xs font-black text-blue-600 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-blue-400"
                    />
                  </div>

                  <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      แต้มขั้นต่ำในการแลก (P):
                    </label>
                    <p className="mt-0.5 text-[10px] text-zinc-500">
                      เช่น 10 แต้ม เพื่อป้องกันเศษสตางค์
                    </p>
                    <input
                      type="number"
                      min="1"
                      value={formSettings.minPointsToRedeem ?? 10}
                      onChange={(e) =>
                        setFormSettings({
                          ...formSettings,
                          minPointsToRedeem: Number(e.target.value),
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-zinc-300 bg-white p-2.5 text-xs font-bold text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </div>

                  <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      เพดานส่วนลดสูงสุดจากยอดบิล (%):
                    </label>
                    <p className="mt-0.5 text-[10px] text-zinc-500">
                      ป้องกันการแลกฟรีทั้งบิล เช่น ไม่เกิน 50%
                    </p>
                    <input
                      type="number"
                      min="5"
                      max="100"
                      value={formSettings.maxPointsDiscountPercent ?? 50}
                      onChange={(e) =>
                        setFormSettings({
                          ...formSettings,
                          maxPointsDiscountPercent: Number(e.target.value),
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-zinc-300 bg-white p-2.5 text-xs font-bold text-emerald-600 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-emerald-400"
                    />
                  </div>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleResetSettings}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                >
                  <RefreshCw size={14} />
                  <span>คืนค่าเริ่มต้นทั้งหมด</span>
                </button>

                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-6 py-2 text-xs font-black text-white shadow-xs transition hover:bg-blue-700"
                >
                  <Save size={15} />
                  <span>บันทึกการตั้งค่าเกณฑ์ส่วนลด</span>
                </button>
              </div>
            </form>
          </section>
        )}

        {/* TAB 4: REWARDS MANAGEMENT */}
        {activeTab === "REWARDS" && (
          <section className="mt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-black text-zinc-950 dark:text-zinc-100">
                  รายการของรางวัลสะสมแต้ม (Reward Items Catalog)
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  ปรับจำนวนแต้มที่ใช้แลก (P) และจำนวนสต็อกคงเหลือสำหรับแลกของรางวัล
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateRewardOpen(true)}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700"
                >
                  <Plus size={15} />
                  <span>เพิ่มของรางวัลสะสมแต้ม</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetRewards}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                >
                  <RefreshCw size={13} />
                  <span>รีเซ็ตค่าเดิม</span>
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rewards.map((reward) => (
                <div
                  key={reward.id}
                  className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                        <img
                          src={reward.imageUrl}
                          alt={reward.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          {reward.category}
                        </span>
                        <h4 className="mt-1 line-clamp-1 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                          {reward.title}
                        </h4>
                        <div className="mt-1 flex items-center gap-1.5">
                          <PointBadge size="xs" />
                          <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                            {reward.pointsRequired} P
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="mt-3 line-clamp-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                      {reward.description}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
                    <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                      คงเหลือ: <span className="font-black text-zinc-900 dark:text-zinc-100">{reward.stock}</span> ชิ้น
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingReward(reward)}
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        <Edit2 size={12} />
                        <span>แก้ไข</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteReward(reward.id, reward.title)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 p-1 text-xs font-bold text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                        title="ลบของรางวัล"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal: Edit Reward Item */}
            {editingReward && (
              <div
                role="dialog"
                aria-modal="true"
                className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-xs"
              >
                <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                    <h3 className="text-sm font-black text-zinc-950 dark:text-zinc-100">
                      แก้ไขของรางวัลสะสมแต้ม
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingReward(null)}
                      className="text-zinc-400 hover:text-zinc-600"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <form onSubmit={handleSaveRewardEdit} className="mt-4 space-y-3 text-xs">
                    <div>
                      <label className="block font-bold text-zinc-700 dark:text-zinc-300">
                        ชื่อของรางวัล:
                      </label>
                      <input
                        type="text"
                        required
                        value={editingReward.title}
                        onChange={(e) =>
                          setEditingReward({ ...editingReward, title: e.target.value })
                        }
                        className="mt-1 w-full rounded-xl border border-zinc-300 bg-white p-2.5 font-bold focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-zinc-700 dark:text-zinc-300">
                        แต้มสะสมที่ต้องใช้ (P):
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={editingReward.pointsRequired}
                        onChange={(e) =>
                          setEditingReward({
                            ...editingReward,
                            pointsRequired: Number(e.target.value),
                          })
                        }
                        className="mt-1 w-full rounded-xl border border-zinc-300 bg-white p-2.5 font-black text-blue-600 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-zinc-700 dark:text-zinc-300">
                        จำนวนสต็อกคงเหลือ (ชิ้น):
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={editingReward.stock}
                        onChange={(e) =>
                          setEditingReward({
                            ...editingReward,
                            stock: Number(e.target.value),
                          })
                        }
                        className="mt-1 w-full rounded-xl border border-zinc-300 bg-white p-2.5 font-bold focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                    </div>

                    <div className="mt-6 flex justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                      <button
                        type="button"
                        onClick={() => setEditingReward(null)}
                        className="rounded-xl border border-zinc-200 px-4 py-2 font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="submit"
                        className="rounded-xl bg-blue-600 px-5 py-2 font-black text-white hover:bg-blue-700"
                      >
                        บันทึกของรางวัล
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Modal: Create Reward Item (Selected from Catalog Stock) */}
            {isCreateRewardOpen && (
              <div
                role="dialog"
                aria-modal="true"
                className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-xs"
              >
                <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                    <h3 className="text-sm font-black text-zinc-950 dark:text-zinc-100 flex items-center gap-2">
                      <Gift size={16} className="text-blue-600" />
                      <span>เพิ่มของรางวัลสะสมแต้ม (ดึงจากสต็อก)</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsCreateRewardOpen(false)}
                      className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <form onSubmit={handleCreateReward} className="mt-4 space-y-3.5 text-xs">
                    <div>
                      <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                        เลือกสินค้าจากสต็อก / แคตตาล็อก:
                      </label>
                      <select
                        required
                        value={newRewardProductId}
                        onChange={(e) => handleSelectRewardProduct(e.target.value)}
                        className="w-full rounded-xl border border-zinc-300 bg-white p-2.5 font-semibold text-zinc-800 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      >
                        <option value="">-- กรุณาเลือกสินค้าจากสต็อก --</option>
                        <optgroup label="ของสะสม & สแตนดี้ (Goods)">
                          {catalogData?.goods.map((g) => (
                            <option key={g.id} value={String(g.id)}>
                              [ของสะสม] {g.name} (คงเหลือ {g.stockOrQuotaRemaining} ชิ้น)
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="อุปกรณ์ & ที่คั่นหนังสือ (Accessories)">
                          {catalogData?.accessories.map((a) => (
                            <option key={a.id} value={String(a.id)}>
                              [อุปกรณ์] {a.name} (คงเหลือ {a.stockOrQuotaRemaining} ชิ้น)
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="มังงะ & ซีรีส์ (Manga Series)">
                          {catalogData?.mangaSeries.map((m) => (
                            <option key={m.id} value={m.id}>
                              [มังงะ] {m.title} ({m.publisher})
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="ฟิกเกอร์ & พลาโม (Figures / Plamo)">
                          {catalogData?.figures.map((f) => (
                            <option key={f.id} value={String(f.id)}>
                              [Figure] {f.name}
                            </option>
                          ))}
                          {catalogData?.plamo.map((p) => (
                            <option key={p.id} value={String(p.id)}>
                              [Gunpla] {p.name}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                        ชื่อของรางวัล:
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="ระบุชื่อของรางวัล"
                        value={newRewardTitle}
                        onChange={(e) => setNewRewardTitle(e.target.value)}
                        className="w-full rounded-xl border border-zinc-300 bg-white p-2.5 font-semibold text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                        คำอธิบายของรางวัล:
                      </label>
                      <textarea
                        rows={2}
                        placeholder="รายละเอียดหรือจุดเด่นของของรางวัล"
                        value={newRewardDescription}
                        onChange={(e) => setNewRewardDescription(e.target.value)}
                        className="w-full rounded-xl border border-zinc-300 bg-white p-2.5 font-medium text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                          แต้มสะสมที่ต้องใช้ (P):
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={newRewardPoints}
                          onChange={(e) => setNewRewardPoints(Number(e.target.value))}
                          className="w-full rounded-xl border border-zinc-300 bg-white p-2.5 font-black text-blue-600 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-blue-400"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                          โควตาสต็อกสำหรับแลก (ชิ้น):
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={newRewardStock}
                          onChange={(e) => setNewRewardStock(Number(e.target.value))}
                          className="w-full rounded-xl border border-zinc-300 bg-white p-2.5 font-bold text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                          หมวดหมู่ของรางวัล:
                        </label>
                        <select
                          value={newRewardCategory}
                          onChange={(e) =>
                            setNewRewardCategory(e.target.value as RewardItem["category"])
                          }
                          className="w-full rounded-xl border border-zinc-300 bg-white p-2.5 font-semibold text-zinc-800 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                        >
                          <option value="BOOKMARK">ที่คั่นหนังสือ (BOOKMARK)</option>
                          <option value="POSTCARD">โปสการ์ด (POSTCARD)</option>
                          <option value="ACRYLIC">สแตนดี้ / อะคริลิก (ACRYLIC)</option>
                          <option value="BADGE">เข็มกลัด (BADGE)</option>
                          <option value="ACCESSORY">อุปกรณ์อื่นๆ (ACCESSORY)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                          ป้ายกำกับ (Badge):
                        </label>
                        <input
                          type="text"
                          value={newRewardBadge}
                          onChange={(e) => setNewRewardBadge(e.target.value)}
                          className="w-full rounded-xl border border-zinc-300 bg-white p-2.5 font-semibold text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                      <button
                        type="button"
                        onClick={() => setIsCreateRewardOpen(false)}
                        className="rounded-xl border border-zinc-200 px-4 py-2 font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="submit"
                        className="rounded-xl bg-blue-600 px-5 py-2 font-black text-white hover:bg-blue-700"
                      >
                        เพิ่มของรางวัล
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </section>
        )}

        {/* TAB 5: STOREFRONT SHOWCASE & BEST SELLERS CENTER */}
        {activeTab === "BEST_SELLERS" && (
          <section className="mt-6 space-y-6">
            {/* Header Showcase Banner & Live Sync Status */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900 dark:border-amber-800/80 dark:bg-amber-950/60 dark:text-amber-300">
                      <Trophy size={13} className="text-amber-600 dark:text-amber-400" />
                      <span>ศูนย์จัดการไฮไลต์หน้าแรก (FEATURED SHOWCASE CENTER)</span>
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400" />
                      <span>ซิงค์ข้อมูลกับหน้าร้าน 100% เรียลไทม์</span>
                    </span>
                  </div>
                  <h2 className="mt-2 text-xl font-black text-zinc-950 dark:text-zinc-100">
                    จัดการสินค้าไฮไลต์ & ชาร์ตยอดนิยมหน้าแรก
                  </h2>
                  <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
                    ปรับแต่งและจัดอันดับสินค้าใน 3 แท็บไฮไลต์บนหน้าแรก (สินค้าขายดีตลอดกาล, ขายดีประจำสัปดาห์, สินค้าใหม่) ทุกการเปลี่ยนแปลงจะบันทึกและซิงค์ข้อมูลกับหน้าร้านโดยอัตโนมัติ
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
                  <Link
                    href="/#featured-showcase"
                    target="_blank"
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2 text-xs font-bold text-zinc-800 shadow-2xs hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-750 transition"
                  >
                    <ExternalLink size={14} />
                    <span>เปิดดูหน้าร้าน (Live Preview)</span>
                  </Link>
                </div>
              </div>

              {/* Showcase Sub-tabs Segmented Switcher */}
              <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowcaseSubTab("WEEKLY")}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition ${
                    showcaseSubTab === "WEEKLY"
                      ? "bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-xs"
                      : "border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-750"
                  }`}
                >
                  <Flame size={14} className={showcaseSubTab === "WEEKLY" ? "text-white" : "text-orange-500"} />
                  <span>1. ขายดีประจำสัปดาห์ (Weekly Best Sellers) 5 รายการ</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    showcaseSubTab === "WEEKLY" ? "bg-white/20 text-white" : "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200"
                  }`}>
                    {Math.min(bsSettings.pinnedBestSellers.length, 5)}/5
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowcaseSubTab("ALL_TIME")}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition ${
                    showcaseSubTab === "ALL_TIME"
                      ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-xs"
                      : "border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-750"
                  }`}
                >
                  <Trophy size={14} className={showcaseSubTab === "ALL_TIME" ? "text-white" : "text-amber-500"} />
                  <span>2. สินค้าขายดีตลอดกาล (All-Time Legends) 5 รายการ</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    showcaseSubTab === "ALL_TIME" ? "bg-white/20 text-white" : "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200"
                  }`}>
                    {Math.min(bsSettings.pinnedAllTime.length, 5)}/5
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowcaseSubTab("NEW_ARRIVALS")}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition ${
                    showcaseSubTab === "NEW_ARRIVALS"
                      ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs"
                      : "border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-750"
                  }`}
                >
                  <Zap size={14} className={showcaseSubTab === "NEW_ARRIVALS" ? "text-white" : "text-emerald-500"} />
                  <span>3. สินค้าใหม่ (New Arrivals) 5 รายการ</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    showcaseSubTab === "NEW_ARRIVALS" ? "bg-white/20 text-white" : "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200"
                  }`}>
                    {Math.min(bsSettings.pinnedNewArrivals.length, 5)}/5
                  </span>
                </button>
              </div>
            </div>

            {/* SUB-TAB 1: WEEKLY BEST SELLERS */}
            {showcaseSubTab === "WEEKLY" && (
              <div className="space-y-6">
                {/* Mode Selector Card */}
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-base font-black text-zinc-950 dark:text-zinc-100 flex items-center gap-2">
                        <Flame size={17} className="text-orange-500" />
                        <span>โหมดการคำนวณอันดับขายดีประจำสัปดาห์ (Calculation Mode)</span>
                      </h3>
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        เลือกระบบการจัดอันดับสินค้าขายดีประจำสัปดาห์ที่แสดงบนหน้าแรกและหน้ารวมสินค้า
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-bold text-orange-800 dark:border-orange-800/80 dark:bg-orange-950/60 dark:text-orange-300">
                      <Flame size={13} className="text-orange-600 dark:text-orange-400" />
                      <span>โหมดที่ใช้งาน: {bsSettings.mode}</span>
                    </span>
                  </div>

                  {/* 3 Interactive Mode Cards */}
                  <div className="mt-5 grid gap-4 sm:grid-cols-3">
                    <div
                      onClick={() => {
                        const updated = saveBestSellerSettings({ mode: "HYBRID" });
                        setBsSettings(updated);
                        showToast("เปลี่ยนเป็นโหมด Hybrid เรียบร้อยแล้ว");
                      }}
                      className={`cursor-pointer rounded-2xl border p-4 transition ${
                        bsSettings.mode === "HYBRID"
                          ? "border-orange-500 bg-orange-50/50 dark:border-orange-500 dark:bg-orange-950/30 ring-2 ring-orange-500/20"
                          : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="rounded-lg bg-orange-100 px-2 py-0.5 text-[10px] font-black text-orange-900 dark:bg-orange-950 dark:text-orange-300">
                          แนะนำ (RECOMMENDED)
                        </span>
                        <input
                          type="radio"
                          name="bsMode"
                          checked={bsSettings.mode === "HYBRID"}
                          onChange={() => {}}
                          className="text-orange-600 focus:ring-orange-500"
                        />
                      </div>
                      <h4 className="mt-2.5 font-black text-sm text-zinc-900 dark:text-zinc-100">
                        1. แบบไฮบริด (Hybrid)
                      </h4>
                      <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                        คำนวณจากยอดขายจริงอัตโนมัติเป็นฐาน และเปิดให้แอดมินปักหมุดสินค้าเพื่อแทรกหรือล็อคอันดับ 1-6 ได้ทุกเวลา
                      </p>
                    </div>

                    <div
                      onClick={() => {
                        const updated = saveBestSellerSettings({ mode: "AUTO" });
                        setBsSettings(updated);
                        showToast("เปลี่ยนเป็นโหมดอัตโนมัติ 100% เรียบร้อยแล้ว");
                      }}
                      className={`cursor-pointer rounded-2xl border p-4 transition ${
                        bsSettings.mode === "AUTO"
                          ? "border-blue-500 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-950/30 ring-2 ring-blue-500/20"
                          : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="rounded-lg bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-900 dark:bg-blue-950 dark:text-blue-300">
                          คำนวณตามยอดจริง
                        </span>
                        <input
                          type="radio"
                          name="bsMode"
                          checked={bsSettings.mode === "AUTO"}
                          onChange={() => {}}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                      </div>
                      <h4 className="mt-2.5 font-black text-sm text-zinc-900 dark:text-zinc-100">
                        2. อัตโนมัติ 100% (Auto)
                      </h4>
                      <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                        คำนวณตามสถิติยอดสั่งซื้อย้อนหลังใน Database เท่านั้น ไม่ต้องคอยจัดการเอง อัปเดตอันดับตามยอดขาย
                      </p>
                    </div>

                    <div
                      onClick={() => {
                        const updated = saveBestSellerSettings({ mode: "MANUAL" });
                        setBsSettings(updated);
                        showToast("เปลี่ยนเป็นโหมดกำหนดเอง 100% เรียบร้อยแล้ว");
                      }}
                      className={`cursor-pointer rounded-2xl border p-4 transition ${
                        bsSettings.mode === "MANUAL"
                          ? "border-purple-500 bg-purple-50/50 dark:border-purple-500 dark:bg-purple-950/30 ring-2 ring-purple-500/20"
                          : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="rounded-lg bg-purple-100 px-2 py-0.5 text-[10px] font-black text-purple-900 dark:bg-purple-950 dark:text-purple-300">
                          แอดมินกำหนดเอง
                        </span>
                        <input
                          type="radio"
                          name="bsMode"
                          checked={bsSettings.mode === "MANUAL"}
                          onChange={() => {}}
                          className="text-purple-600 focus:ring-purple-500"
                        />
                      </div>
                      <h4 className="mt-2.5 font-black text-sm text-zinc-900 dark:text-zinc-100">
                        3. แอดมินเลือกเอง 100% (Manual)
                      </h4>
                      <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                        แสดงเฉพาะสินค้าที่แอดมินเป็นคนกดปักหมุดไว้เท่านั้น ไม่นำยอดขายอื่นมาปน เหมาะกับแคมเปญเฉพาะกิจ
                      </p>
                    </div>
                  </div>

                  {/* Sub-settings */}
                  <div className="mt-5 grid gap-4 border-t border-zinc-100 pt-4 sm:grid-cols-2 dark:border-zinc-800">
                    <div className="flex items-center justify-between rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/60">
                      <div>
                        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                          กรอบเวลายอดขายย้อนหลัง
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          ใช้คำนวณยอดขายของระบบอัตโนมัติ
                        </p>
                      </div>
                      <select
                        value={bsSettings.autoTimeWindowDays}
                        onChange={(e) => {
                          const days = Number(e.target.value) as any;
                          const updated = saveBestSellerSettings({ autoTimeWindowDays: days });
                          setBsSettings(updated);
                          showToast(`อัปเดตกรอบเวลาเป็น ${days} วันแล้ว`);
                        }}
                        className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-xs font-bold text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                      >
                        <option value={7}>7 วันล่าสุด</option>
                        <option value={14}>14 วันล่าสุด</option>
                        <option value={30}>30 วันล่าสุด (มาตรฐาน)</option>
                        <option value={90}>90 วันล่าสุด</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/60">
                      <div>
                        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                          ซ่อนสินค้าที่หมดสต็อกอัตโนมัติ
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          ไม่นำสินค้าที่สต็อกเหลือ 0 มาแสดงในอันดับขายดี
                        </p>
                      </div>
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input
                          type="checkbox"
                          checked={bsSettings.hideOutOfStock}
                          onChange={(e) => {
                            const updated = saveBestSellerSettings({ hideOutOfStock: e.target.checked });
                            setBsSettings(updated);
                            showToast(e.target.checked ? "เปิดการซ่อนสินค้าหมดสต็อกแล้ว" : "ปิดการซ่อนสินค้าหมดสต็อกแล้ว");
                          }}
                          className="peer sr-only"
                        />
                        <div className="peer h-6 w-11 rounded-full bg-zinc-300 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-zinc-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-orange-600 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-zinc-700"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Pinned Best Sellers Manager */}
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
                    <div>
                      <h3 className="text-base font-black text-zinc-950 dark:text-zinc-100 flex items-center gap-2">
                        <Flame className="text-orange-500" size={18} />
                        <span>ชาร์ตสินค้าขายดีประจำสัปดาห์ ({Math.min(bsSettings.pinnedBestSellers.length, TOP_ITEMS_LIMIT)} รายการ)</span>
                      </h3>
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        จัดอันดับ #1 ถึง #5 ที่จะแสดงในแท็บ "ขายดีประจำสัปดาห์" บนหน้าแรกทันที
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleResetWeeklyDefaults}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-750 transition"
                      >
                        <RotateCcw size={14} />
                        <span>คืนค่าเริ่มต้น</span>
                      </button>

                      <button
                        type="button"
                        disabled={bsSettings.pinnedBestSellers.length >= TOP_ITEMS_LIMIT}
                        onClick={() => {
                          if (bsSettings.pinnedBestSellers.length >= TOP_ITEMS_LIMIT) {
                            alert("จำกัดสินค้าขายดีประจำสัปดาห์สูงสุด 5 รายการเท่านั้น");
                            return;
                          }
                          setNewPinRank(bsSettings.pinnedBestSellers.length + 1);
                          setIsPinModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition"
                      >
                        <Plus size={15} />
                        <span>{bsSettings.pinnedBestSellers.length >= TOP_ITEMS_LIMIT ? "ครบ 5 รายการแล้ว" : "ปักหมุดสินค้าเพิ่ม"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Table of pinned items */}
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
                          <th className="py-2.5 px-3 font-bold w-16">อันดับ</th>
                          <th className="py-2.5 px-3 font-bold">สินค้า & ซีรีส์</th>
                          <th className="py-2.5 px-3 font-bold">หมวดหมู่</th>
                          <th className="py-2.5 px-3 font-bold">ข้อความยอดขาย (Sales Text)</th>
                          <th className="py-2.5 px-3 text-center font-bold w-24">ย้ายอันดับ</th>
                          <th className="py-2.5 px-3 text-right font-bold w-28">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {bsSettings.pinnedBestSellers
                          .slice(0, TOP_ITEMS_LIMIT)
                          .sort((a, b) => a.rank - b.rank)
                          .map((item, idx) => {
                            const displayRank = idx + 1;
                            const info = getProductDisplay(item.id, item.type);
                            return (
                              <tr key={item.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition">
                                <td className="py-3 px-3">
                                  {displayRank === 1 ? (
                                    <span className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-400 px-2.5 py-1 text-[11px] font-black text-amber-950 shadow-2xs">
                                      <Trophy size={12} />
                                      #1
                                    </span>
                                  ) : displayRank === 2 ? (
                                    <span className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 bg-zinc-200 px-2 py-1 text-[11px] font-black text-zinc-800 shadow-2xs">
                                      <Award size={12} />
                                      #2
                                    </span>
                                  ) : displayRank === 3 ? (
                                    <span className="inline-flex items-center gap-1 rounded-lg border border-amber-500/60 bg-amber-600 px-2 py-1 text-[11px] font-black text-white shadow-2xs">
                                      <Sparkles size={12} />
                                      #3
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[11px] font-bold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                      #{displayRank}
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3">
                                  <div className="flex items-center gap-3">
                                    <div className="h-12 w-10 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                                      <img src={info.imageUrl} alt={info.title} className="h-full w-full object-cover" />
                                    </div>
                                    <div className="min-w-0 max-w-xs">
                                      <p className="line-clamp-1 font-bold text-zinc-900 dark:text-zinc-100">
                                        {info.title}
                                      </p>
                                      <p className="line-clamp-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                                        {info.subtitle} · {info.priceFormatted}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-3">
                                  <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-black text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                    {item.type}
                                  </span>
                                </td>
                                <td className="py-3 px-3 font-semibold text-orange-600 dark:text-orange-400">
                                  {item.salesTextOverride || "สินค้าขายดียอดนิยม"}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      type="button"
                                      disabled={idx === 0}
                                      onClick={() => handleMoveWeeklyPin(idx, "up")}
                                      className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
                                      title="เลื่อนขึ้น"
                                    >
                                      <ArrowUp size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={idx === bsSettings.pinnedBestSellers.length - 1}
                                      onClick={() => handleMoveWeeklyPin(idx, "down")}
                                      className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
                                      title="เลื่อนลง"
                                    >
                                      <ArrowDown size={14} />
                                    </button>
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <div className="inline-flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setEditingWeeklyPin(item)}
                                      className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                    >
                                      แก้ไข
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteWeeklyPin(item.id, info.title)}
                                      className="rounded-lg border border-red-200 p-1 text-xs font-bold text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                                      title="ปลดหมุด"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB 2: ALL-TIME BEST SELLERS (HALL OF FAME) */}
            {showcaseSubTab === "ALL_TIME" && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
                    <div>
                      <h3 className="text-base font-black text-zinc-950 dark:text-zinc-100 flex items-center gap-2">
                        <Trophy className="text-amber-500" size={18} />
                        <span>ชาร์ตสินค้าขายดีตลอดกาล (All-Time Legends / Hall of Fame) (5 รายการ)</span>
                      </h3>
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        จัดอันดับ #1 ถึง #5 ที่จะแสดงในแท็บ "สินค้าขายดีตลอดกาล" บนหน้าแรกทันที
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleResetAllTimeDefaults}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-750 transition"
                      >
                        <RotateCcw size={14} />
                        <span>คืนค่าเริ่มต้น</span>
                      </button>

                      <button
                        type="button"
                        disabled={bsSettings.pinnedAllTime.length >= TOP_ITEMS_LIMIT}
                        onClick={() => {
                          if (bsSettings.pinnedAllTime.length >= TOP_ITEMS_LIMIT) {
                            alert("จำกัดสินค้าขายดีตลอดกาลสูงสุด 5 รายการเท่านั้น");
                            return;
                          }
                          setNewAllTimeRank(bsSettings.pinnedAllTime.length + 1);
                          setIsAddAllTimeOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition"
                      >
                        <Plus size={15} />
                        <span>{bsSettings.pinnedAllTime.length >= TOP_ITEMS_LIMIT ? "ครบ 5 รายการแล้ว" : "เพิ่มสินค้าตลอดกาล"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Table of All-Time items */}
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
                          <th className="py-2.5 px-3 font-bold w-16">อันดับ</th>
                          <th className="py-2.5 px-3 font-bold">ซีรีส์ & ผลงาน</th>
                          <th className="py-2.5 px-3 font-bold">หมวดหมู่</th>
                          <th className="py-2.5 px-3 font-bold">สถิติยอดพิมพ์ / ยอดขายตลอดกาล</th>
                          <th className="py-2.5 px-3 font-bold min-w-[140px]">ไมล์สโตน</th>
                          <th className="py-2.5 px-3 text-center font-bold w-24">ย้ายอันดับ</th>
                          <th className="py-2.5 px-3 text-right font-bold w-28">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {bsSettings.pinnedAllTime
                          .slice(0, TOP_ITEMS_LIMIT)
                          .sort((a, b) => a.rank - b.rank)
                          .map((item, idx) => {
                            const displayRank = idx + 1;
                            const info = getProductDisplay(item.id, item.type);
                            return (
                              <tr key={item.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition">
                                <td className="py-3 px-3">
                                  {displayRank === 1 ? (
                                    <span className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-400 px-2.5 py-1 text-[11px] font-black text-amber-950 shadow-2xs">
                                      <Trophy size={12} />
                                      #1
                                    </span>
                                  ) : displayRank === 2 ? (
                                    <span className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 bg-zinc-200 px-2 py-1 text-[11px] font-black text-zinc-800 shadow-2xs">
                                      <Award size={12} />
                                      #2
                                    </span>
                                  ) : displayRank === 3 ? (
                                    <span className="inline-flex items-center gap-1 rounded-lg border border-amber-500/60 bg-amber-600 px-2 py-1 text-[11px] font-black text-white shadow-2xs">
                                      <Sparkles size={12} />
                                      #3
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[11px] font-bold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                      #{displayRank}
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3">
                                  <div className="flex items-center gap-3">
                                    <div className="h-12 w-10 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                                      <img src={info.imageUrl} alt={info.title} className="h-full w-full object-cover" />
                                    </div>
                                    <div className="min-w-0 max-w-xs">
                                      <p className="line-clamp-1 font-bold text-zinc-900 dark:text-zinc-100">
                                        {info.title}
                                      </p>
                                      <p className="line-clamp-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                                        {info.subtitle} · {info.priceFormatted}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-3">
                                  <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-black text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                    {item.type}
                                  </span>
                                </td>
                                <td className="py-3 px-3 font-semibold text-amber-700 dark:text-amber-400">
                                  {item.salesRecord || "ยอดขายสูงสุดตลอดกาล"}
                                </td>
                                <td className="py-3 px-3 text-zinc-600 dark:text-zinc-400 min-w-[140px]">
                                  <span className="inline-block whitespace-nowrap px-2.5 py-1 text-xs rounded-md font-medium bg-amber-50 text-amber-800 border border-amber-200/80 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                                    {item.salesMilestone || "มาสเตอร์พีซตลอดกาล"}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      type="button"
                                      disabled={idx === 0}
                                      onClick={() => handleMoveAllTime(idx, "up")}
                                      className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
                                      title="เลื่อนขึ้น"
                                    >
                                      <ArrowUp size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={idx === bsSettings.pinnedAllTime.length - 1}
                                      onClick={() => handleMoveAllTime(idx, "down")}
                                      className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
                                      title="เลื่อนลง"
                                    >
                                      <ArrowDown size={14} />
                                    </button>
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <div className="inline-flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setEditingAllTime(item)}
                                      className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                    >
                                      แก้ไข
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteAllTime(item.id, info.title)}
                                      className="rounded-lg border border-red-200 p-1 text-xs font-bold text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                                      title="ลบ"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB 3: NEW ARRIVALS */}
            {showcaseSubTab === "NEW_ARRIVALS" && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
                    <div>
                      <h3 className="text-base font-black text-zinc-950 dark:text-zinc-100 flex items-center gap-2">
                        <Zap className="text-emerald-500" size={18} />
                        <span>รายการสินค้าใหม่ประจำสัปดาห์ (New Arrivals Showcase) (5 รายการ)</span>
                      </h3>
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        จัดอันดับ #1 ถึง #5 ที่จะแสดงในแท็บ "สินค้าใหม่" บนหน้าแรกทันที
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleResetNewArrivalsDefaults}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-750 transition"
                      >
                        <RotateCcw size={14} />
                        <span>คืนค่าเริ่มต้น</span>
                      </button>

                      <button
                        type="button"
                        disabled={bsSettings.pinnedNewArrivals.length >= TOP_ITEMS_LIMIT}
                        onClick={() => {
                          if (bsSettings.pinnedNewArrivals.length >= TOP_ITEMS_LIMIT) {
                            alert("จำกัดสินค้าใหม่สูงสุด 5 รายการเท่านั้น");
                            return;
                          }
                          setIsAddNewArrivalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition"
                      >
                        <Plus size={15} />
                        <span>{bsSettings.pinnedNewArrivals.length >= TOP_ITEMS_LIMIT ? "ครบ 5 รายการแล้ว" : "เพิ่มสินค้าใหม่"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Table of New Arrivals items */}
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
                          <th className="py-2.5 px-3 font-bold w-14">ลำดับ</th>
                          <th className="py-2.5 px-3 font-bold">สินค้า & ซีรีส์</th>
                          <th className="py-2.5 px-3 font-bold">หมวดหมู่</th>
                          <th className="py-2.5 px-3 font-bold">ป้ายกำกับ (Badge)</th>
                          <th className="py-2.5 px-3 font-bold">กำหนดวางจำหน่าย / หมายเหตุ</th>
                          <th className="py-2.5 px-3 text-center font-bold w-24">สลับลำดับ</th>
                          <th className="py-2.5 px-3 text-right font-bold w-28">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {bsSettings.pinnedNewArrivals.slice(0, TOP_ITEMS_LIMIT).map((item, idx) => {
                          const info = getProductDisplay(item.id, item.type);
                          return (
                            <tr key={item.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition">
                              <td className="py-3 px-3">
                                <span className="inline-flex items-center justify-center h-6 w-6 rounded-lg bg-zinc-100 font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                  {idx + 1}
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-3">
                                  <div className="h-12 w-10 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                                    <img src={info.imageUrl} alt={info.title} className="h-full w-full object-cover" />
                                  </div>
                                  <div className="min-w-0 max-w-xs">
                                    <p className="line-clamp-1 font-bold text-zinc-900 dark:text-zinc-100">
                                      {info.title}
                                    </p>
                                    <p className="line-clamp-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                                      {info.subtitle} · {info.priceFormatted}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-black text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                  {item.type}
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-black text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                                  {item.badgeText}
                                </span>
                              </td>
                              <td className="py-3 px-3 font-semibold text-zinc-700 dark:text-zinc-300">
                                {item.releaseDateText}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() => handleMoveNewArrival(idx, "up")}
                                    className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
                                    title="เลื่อนขึ้น"
                                  >
                                    <ArrowUp size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx === bsSettings.pinnedNewArrivals.length - 1}
                                    onClick={() => handleMoveNewArrival(idx, "down")}
                                    className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
                                    title="เลื่อนลง"
                                  >
                                    <ArrowDown size={14} />
                                  </button>
                                </div>
                              </td>
                              <td className="py-3 px-3 text-right">
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setEditingNewArrival(item)}
                                    className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                  >
                                    แก้ไข
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteNewArrival(item.id, info.title)}
                                    className="rounded-lg border border-red-200 p-1 text-xs font-bold text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                                    title="ลบ"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Modal: Add Weekly Best Seller Pin */}
        {isPinModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                <h3 className="font-black text-sm text-zinc-950 dark:text-zinc-100 flex items-center gap-2">
                  <Flame size={16} className="text-orange-500" />
                  <span>ปักหมุดสินค้าขายดีประจำสัปดาห์</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsPinModalOpen(false)}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveWeeklyPinSubmit} className="mt-4 space-y-3.5 text-xs">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    เลือกสินค้าจากแคตตาล็อก:
                  </label>
                  <select
                    required
                    value={newPinProductId}
                    onChange={(e) => handleSelectWeeklyProduct(e.target.value)}
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  >
                    <option value="">-- กรุณาเลือกสินค้า --</option>
                    <optgroup label="มังงะ & ไลท์โนเวล">
                      {catalogData?.mangaSeries.map((s) => (
                        <option key={s.id} value={s.id}>
                          [มังงะ] {s.title} ({s.publisher})
                        </option>
                      ))}
                      {catalogData?.lightNovelSeries?.map((s) => (
                        <option key={s.id} value={s.id}>
                          [ไลท์โนเวล] {s.title}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Figure & ของสะสม">
                      {catalogData?.figures.map((f) => (
                        <option key={f.id} value={String(f.id)}>
                          [Figure] {f.name}
                        </option>
                      ))}
                      {catalogData?.plamo.map((p) => (
                        <option key={p.id} value={String(p.id)}>
                          [Gunpla] {p.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      อันดับที่ต้องการ (#)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={newPinRank}
                      onChange={(e) => setNewPinRank(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      ประเภทสินค้า
                    </label>
                    <select
                      value={newPinType}
                      onChange={(e) => setNewPinType(e.target.value as any)}
                      className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                    >
                      <option value="MANGA">มังงะ / โนเวล</option>
                      <option value="COLLECTIBLE">ของสะสม / ฟิกเกอร์</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    ข้อความสถิติยอดขาย (Sales Text):
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ยอดขายสะสม 25,000+ เล่ม"
                    value={newPinSalesText}
                    onChange={(e) => setNewPinSalesText(e.target.value)}
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-800 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  />
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {[
                      "ยอดขายสะสม 25,000+ เล่ม",
                      "ยอดขายสะสม 18,500+ เล่ม",
                      "ยอดสั่งจอง 1,200+ กล่อง",
                      "ยอดพิมพ์ทะลุ 13 ล้านเล่ม",
                      "สินค้าขายดียอดนิยม",
                    ].map((sample) => (
                      <button
                        key={sample}
                        type="button"
                        onClick={() => setNewPinSalesText(sample)}
                        className="rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-bold text-zinc-700 hover:border-orange-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      >
                        {sample}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-end gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsPinModalOpen(false)}
                    className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-orange-600 px-4 py-2 text-xs font-black text-white hover:bg-orange-700 shadow-xs"
                  >
                    บันทึกการปักหมุด
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Edit Weekly Best Seller Pin */}
        {editingWeeklyPin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                <h3 className="font-black text-sm text-zinc-950 dark:text-zinc-100 flex items-center gap-2">
                  <Edit2 size={16} className="text-orange-500" />
                  <span>แก้ไขสินค้าขายดีประจำสัปดาห์</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingWeeklyPin(null)}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleEditWeeklyPinSubmit} className="mt-4 space-y-3.5 text-xs">
                <div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">สินค้า:</p>
                  <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                    {getProductDisplay(editingWeeklyPin.id, editingWeeklyPin.type).title}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    อันดับ (#)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={editingWeeklyPin.rank}
                    onChange={(e) =>
                      setEditingWeeklyPin({ ...editingWeeklyPin, rank: Number(e.target.value) })
                    }
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    ข้อความสถิติยอดขาย (Sales Text):
                  </label>
                  <input
                    type="text"
                    required
                    value={editingWeeklyPin.salesTextOverride || ""}
                    onChange={(e) =>
                      setEditingWeeklyPin({ ...editingWeeklyPin, salesTextOverride: e.target.value })
                    }
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  />
                </div>

                <div className="mt-5 flex items-center justify-end gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setEditingWeeklyPin(null)}
                    className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-orange-600 px-4 py-2 text-xs font-black text-white hover:bg-orange-700 shadow-xs"
                  >
                    บันทึกการแก้ไข
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add All-Time Best Seller */}
        {isAddAllTimeOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                <h3 className="font-black text-sm text-zinc-950 dark:text-zinc-100 flex items-center gap-2">
                  <Trophy size={16} className="text-amber-500" />
                  <span>เพิ่มสินค้าขายดีตลอดกาล (All-Time Legend)</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddAllTimeOpen(false)}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveAllTimeSubmit} className="mt-4 space-y-3.5 text-xs">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    เลือกผลงาน / ซีรีส์ระดับตำนาน:
                  </label>
                  <select
                    required
                    value={newAllTimeProductId}
                    onChange={(e) => handleSelectAllTimeProduct(e.target.value)}
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 focus:border-amber-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  >
                    <option value="">-- กรุณาเลือกสินค้า --</option>
                    <optgroup label="มังงะ & ซีรีส์ยอดนิยม">
                      {catalogData?.mangaSeries.map((s) => (
                        <option key={s.id} value={s.id}>
                          [มังงะ] {s.title} ({s.publisher})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Figure & ของสะสมระดับมาสเตอร์พีซ">
                      {catalogData?.figures.map((f) => (
                        <option key={f.id} value={String(f.id)}>
                          [Figure] {f.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      อันดับตลอดกาล (#)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={newAllTimeRank}
                      onChange={(e) => setNewAllTimeRank(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      ประเภท
                    </label>
                    <select
                      value={newAllTimeType}
                      onChange={(e) => setNewAllTimeType(e.target.value as any)}
                      className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                    >
                      <option value="MANGA">มังงะ</option>
                      <option value="COLLECTIBLE">ของสะสม</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    สถิติยอดพิมพ์ / สถิติโลก (Sales Record):
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ยอดขายทะลุ 516 ล้านเล่มทั่วโลก"
                    value={newAllTimeSalesRecord}
                    onChange={(e) => setNewAllTimeSalesRecord(e.target.value)}
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-800 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  />
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {[
                      "ยอดขายทะลุ 516 ล้านเล่มทั่วโลก",
                      "ยอดพิมพ์สะสมทะลุ 100 ล้านเล่ม",
                      "ปรากฏการณ์มังงะระดับโลก 34 เล่มจบ",
                      "การันตีรางวัล Manga Taisho อันดับ 1",
                      "เนนโดรอยด์ยอดสั่งจองสูงสุดตลอดกาล",
                      "มันฮวายอดอ่านทั่วโลกกว่าพันล้านครั้ง",
                    ].map((sample) => (
                      <button
                        key={sample}
                        type="button"
                        onClick={() => setNewAllTimeSalesRecord(sample)}
                        className="rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-bold text-zinc-700 hover:border-amber-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      >
                        {sample}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    ไมล์สโตนยอดขาย (Milestone Tag):
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น 516,000,000+ เล่ม / อันดับ #1 ยอดจอง"
                    value={newAllTimeSalesMilestone}
                    onChange={(e) => setNewAllTimeSalesMilestone(e.target.value)}
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-800 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  />
                </div>

                <div className="mt-5 flex items-center justify-end gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsAddAllTimeOpen(false)}
                    className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-black text-white hover:bg-amber-700 shadow-xs"
                  >
                    บันทึกสินค้าตลอดกาล
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Edit All-Time Best Seller */}
        {editingAllTime && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                <h3 className="font-black text-sm text-zinc-950 dark:text-zinc-100 flex items-center gap-2">
                  <Edit2 size={16} className="text-amber-500" />
                  <span>แก้ไขสินค้าขายดีตลอดกาล</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingAllTime(null)}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleEditAllTimeSubmit} className="mt-4 space-y-3.5 text-xs">
                <div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">ผลงาน:</p>
                  <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                    {getProductDisplay(editingAllTime.id, editingAllTime.type).title}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    อันดับตลอดกาล (#)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={editingAllTime.rank}
                    onChange={(e) =>
                      setEditingAllTime({ ...editingAllTime, rank: Number(e.target.value) })
                    }
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    สถิติยอดพิมพ์ / สถิติโลก (Sales Record):
                  </label>
                  <input
                    type="text"
                    required
                    value={editingAllTime.salesRecord}
                    onChange={(e) =>
                      setEditingAllTime({ ...editingAllTime, salesRecord: e.target.value })
                    }
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    ไมล์สโตนยอดขาย (Milestone Tag):
                  </label>
                  <input
                    type="text"
                    value={editingAllTime.salesMilestone || ""}
                    onChange={(e) =>
                      setEditingAllTime({ ...editingAllTime, salesMilestone: e.target.value })
                    }
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  />
                </div>

                <div className="mt-5 flex items-center justify-end gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setEditingAllTime(null)}
                    className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-black text-white hover:bg-amber-700 shadow-xs"
                  >
                    บันทึกการแก้ไข
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add New Arrival */}
        {isAddNewArrivalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                <h3 className="font-black text-sm text-zinc-950 dark:text-zinc-100 flex items-center gap-2">
                  <Zap size={16} className="text-emerald-500" />
                  <span>เพิ่มสินค้าใหม่ประจำสัปดาห์ (New Arrival)</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddNewArrivalOpen(false)}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveNewArrivalSubmit} className="mt-4 space-y-3.5 text-xs">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    เลือกสินค้าจากแคตตาล็อก:
                  </label>
                  <select
                    required
                    value={newArrProductId}
                    onChange={(e) => handleSelectNewArrivalProduct(e.target.value)}
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  >
                    <option value="">-- กรุณาเลือกสินค้า --</option>
                    <optgroup label="มังงะ & ไลท์โนเวล">
                      {catalogData?.mangaSeries.map((s) => (
                        <option key={s.id} value={s.id}>
                          [มังงะ] {s.title} ({s.publisher})
                        </option>
                      ))}
                      {catalogData?.lightNovelSeries?.map((s) => (
                        <option key={s.id} value={s.id}>
                          [ไลท์โนเวล] {s.title}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Figure, Gunpla & Goods">
                      {catalogData?.figures.map((f) => (
                        <option key={f.id} value={String(f.id)}>
                          [Figure] {f.name}
                        </option>
                      ))}
                      {catalogData?.plamo.map((p) => (
                        <option key={p.id} value={String(p.id)}>
                          [Gunpla] {p.name}
                        </option>
                      ))}
                      {catalogData?.goods.map((g) => (
                        <option key={g.id} value={String(g.id)}>
                          [Goods] {g.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    หมวดหมู่สินค้า
                  </label>
                  <select
                    value={newArrType}
                    onChange={(e) => setNewArrType(e.target.value as any)}
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  >
                    <option value="MANGA">มังงะ (MANGA)</option>
                    <option value="LIGHT_NOVEL">ไลท์โนเวล (LIGHT_NOVEL)</option>
                    <option value="FIGURE">ฟิกเกอร์ (FIGURE)</option>
                    <option value="PLAMO">กันพลา / พลาโม (PLAMO)</option>
                    <option value="GOODS">ของสะสม (GOODS)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    ป้ายกำกับ (Badge Text):
                  </label>
                  <input
                    type="text"
                    required
                    value={newArrBadgeText}
                    onChange={(e) => setNewArrBadgeText(e.target.value)}
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  />
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {[
                      "NEW สัปดาห์นี้",
                      "NEW เข้าใหม่",
                      "PRE-ORDER",
                      "LIMITED SET",
                      "เติมสต็อก",
                    ].map((badge) => (
                      <button
                        key={badge}
                        type="button"
                        onClick={() => setNewArrBadgeText(badge)}
                        className="rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-bold text-zinc-700 hover:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      >
                        {badge}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    กำหนดวางจำหน่าย / หมายเหตุสถานะ (Release Date / Note):
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น เล่ม 27 ออกใหม่ล่าสุด · พร้อมส่ง"
                    value={newArrReleaseDateText}
                    onChange={(e) => setNewArrReleaseDateText(e.target.value)}
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  />
                </div>

                <div className="mt-5 flex items-center justify-end gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsAddNewArrivalOpen(false)}
                    className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-700 shadow-xs"
                  >
                    บันทึกสินค้าใหม่
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Edit New Arrival */}
        {editingNewArrival && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                <h3 className="font-black text-sm text-zinc-950 dark:text-zinc-100 flex items-center gap-2">
                  <Edit2 size={16} className="text-emerald-500" />
                  <span>แก้ไขสินค้าใหม่ประจำสัปดาห์</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingNewArrival(null)}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleEditNewArrivalSubmit} className="mt-4 space-y-3.5 text-xs">
                <div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">สินค้า:</p>
                  <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                    {getProductDisplay(editingNewArrival.id, editingNewArrival.type).title}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    ป้ายกำกับ (Badge Text):
                  </label>
                  <input
                    type="text"
                    required
                    value={editingNewArrival.badgeText}
                    onChange={(e) =>
                      setEditingNewArrival({ ...editingNewArrival, badgeText: e.target.value })
                    }
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  />
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {[
                      "NEW สัปดาห์นี้",
                      "NEW เข้าใหม่",
                      "PRE-ORDER",
                      "LIMITED SET",
                      "เติมสต็อก",
                    ].map((badge) => (
                      <button
                        key={badge}
                        type="button"
                        onClick={() =>
                          setEditingNewArrival({ ...editingNewArrival, badgeText: badge })
                        }
                        className="rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-bold text-zinc-700 hover:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      >
                        {badge}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    กำหนดวางจำหน่าย / หมายเหตุสถานะ:
                  </label>
                  <input
                    type="text"
                    required
                    value={editingNewArrival.releaseDateText}
                    onChange={(e) =>
                      setEditingNewArrival({ ...editingNewArrival, releaseDateText: e.target.value })
                    }
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  />
                </div>

                <div className="mt-5 flex items-center justify-end gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setEditingNewArrival(null)}
                    className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-700 shadow-xs"
                  >
                    บันทึกการแก้ไข
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add Recommended (Staff Pick) */}
        {isAddRecommendedOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                <h3 className="font-black text-sm text-zinc-950 dark:text-zinc-100 flex items-center gap-2">
                  <Sparkles size={16} className="text-orange-500" />
                  <span>เพิ่มสินค้าแนะนำพิเศษ (ดึงจากแคตตาล็อก)</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddRecommendedOpen(false)}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleAddRecommended} className="mt-4 space-y-3.5 text-xs">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    เลือกสินค้าจากแคตตาล็อก:
                  </label>
                  <select
                    required
                    value={newRecProductId}
                    onChange={(e) => handleSelectRecProduct(e.target.value)}
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  >
                    <option value="">-- กรุณาเลือกสินค้า --</option>
                    <optgroup label="มังงะ & ซีรีส์ยอดนิยม">
                      {catalogData?.mangaSeries.map((s) => (
                        <option key={s.id} value={s.id}>
                          [มังงะ] {s.title} ({s.publisher})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Figure & ของสะสม">
                      {catalogData?.figures.map((f) => (
                        <option key={f.id} value={String(f.id)}>
                          [Figure] {f.name}
                        </option>
                      ))}
                      {catalogData?.plamo.map((p) => (
                        <option key={p.id} value={String(p.id)}>
                          [Gunpla] {p.name}
                        </option>
                      ))}
                      {catalogData?.goods.map((g) => (
                        <option key={g.id} value={String(g.id)}>
                          [ของสะสม] {g.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    ป้ายกำกับสินค้า (Badge Text):
                  </label>
                  <input
                    type="text"
                    required
                    value={newRecBadgeText}
                    onChange={(e) => setNewRecBadgeText(e.target.value)}
                    placeholder="เช่น STAFF PICK · ยอดนิยม"
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {[
                      "STAFF PICK · ยอดนิยม",
                      "MUST READ · มาสเตอร์พีซ",
                      "HIT ANIME · สุดมันส์",
                      "COLLECTOR · พรีเมียม",
                      "LIMITED · ห้ามพลาด",
                    ].map((badge) => (
                      <button
                        key={badge}
                        type="button"
                        onClick={() => setNewRecBadgeText(badge)}
                        className="rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-bold text-zinc-700 hover:border-orange-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      >
                        {badge}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    ข้อความไฮไลต์ / เหตุผลที่แนะนำ:
                  </label>
                  <input
                    type="text"
                    required
                    value={newRecHighlightText}
                    onChange={(e) => setNewRecHighlightText(e.target.value)}
                    placeholder="เช่น รางวัล Manga Taisho อันดับ 1 / ดีเทลขั้นสุดยอด"
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>

                <div className="mt-6 flex justify-end gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsAddRecommendedOpen(false)}
                    className="rounded-xl border border-zinc-200 px-4 py-2 font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-orange-600 px-5 py-2 font-black text-white hover:bg-orange-700 shadow-xs"
                  >
                    เพิ่มสินค้าแนะนำ
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Edit Recommended (Staff Pick) */}
        {editingRec && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                <h3 className="font-black text-sm text-zinc-950 dark:text-zinc-100 flex items-center gap-2">
                  <Edit2 size={16} className="text-orange-500" />
                  <span>แก้ไขข้อมูลสินค้าแนะนำพิเศษ</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingRec(null)}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveRecommendedEdit} className="mt-4 space-y-3.5 text-xs">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    ป้ายกำกับสินค้า (Badge Text):
                  </label>
                  <input
                    type="text"
                    required
                    value={editingRec.badgeText}
                    onChange={(e) =>
                      setEditingRec({ ...editingRec, badgeText: e.target.value })
                    }
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {[
                      "STAFF PICK · ยอดนิยม",
                      "MUST READ · มาสเตอร์พีซ",
                      "HIT ANIME · สุดมันส์",
                      "COLLECTOR · พรีเมียม",
                      "LIMITED · ห้ามพลาด",
                    ].map((badge) => (
                      <button
                        key={badge}
                        type="button"
                        onClick={() =>
                          setEditingRec({ ...editingRec, badgeText: badge })
                        }
                        className="rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-bold text-zinc-700 hover:border-orange-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      >
                        {badge}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    ข้อความไฮไลต์ / จุดเด่น:
                  </label>
                  <input
                    type="text"
                    required
                    value={editingRec.highlightText}
                    onChange={(e) =>
                      setEditingRec({ ...editingRec, highlightText: e.target.value })
                    }
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>

                <div className="mt-6 flex justify-end gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setEditingRec(null)}
                    className="rounded-xl border border-zinc-200 px-4 py-2 font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-orange-600 px-5 py-2 font-black text-white hover:bg-orange-700 shadow-xs"
                  >
                    บันทึกการแก้ไข
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}

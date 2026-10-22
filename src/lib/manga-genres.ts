import type { CatalogFigure, CatalogMangaSeries, CatalogData } from "./catalog-client";

export interface MangaGenreItem {
  key: string;
  name: string;
  nameEn: string;
  shortDescription: string;
  longDescription: string;
  badgeClass: string;
  accentColor: string;
  iconName: "Swords" | "ShieldAlert" | "Compass" | "Dumbbell" | "Smile" | "Film" | "BookOpen" | "Sparkles";
  popularKeywords: string[];
}

export const MANGA_GENRES: readonly MangaGenreItem[] = [
  {
    key: "all",
    name: "ทั้งหมด",
    nameEn: "All Genres",
    shortDescription: "มังงะลิขสิทธิ์แท้ทุกหมวดหมู่",
    longDescription: "รวมหนังสือการ์ตูนมังงะลิขสิทธิ์แท้แปลไทยทุกสำนักพิมพ์ ครบทุกเล่ม ทุกซีรีส์",
    badgeClass: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700",
    accentColor: "text-zinc-600 dark:text-zinc-300",
    iconName: "BookOpen",
    popularKeywords: ["มังงะแปลไทย", "ลิขสิทธิ์แท้", "ออกใหม่ล่าสุด"],
  },
  {
    key: "shonen",
    name: "โชเน็น & แอ็กชัน",
    nameEn: "Shonen & Action",
    shortDescription: "ต่อสู้ มิตรภาพ การผจญภัยสุดมันส์",
    longDescription: "มังงะสายหลักยอดนิยม ดำเนินเรื่องด้วยพลังใจ มิตรภาพ การฝึกฝน และฉากต่อสู้สุดอลังการ",
    badgeClass: "bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-300 border-orange-200 dark:border-orange-800/80",
    accentColor: "text-orange-600 dark:text-orange-400",
    iconName: "Swords",
    popularKeywords: ["One Piece", "Jujutsu Kaisen", "Demon Slayer", "Sakamoto Days"],
  },
  {
    key: "dark-fantasy",
    name: "ดาร์กแฟนตาซี & ไซไฟ",
    nameEn: "Dark Fantasy & Sci-Fi",
    shortDescription: "เนื้อหาเข้มข้น ดิบ ลึกลับ เอาชีวิตรอด",
    longDescription: "พล็อตเข้มข้น ลุ้นระทึก สมจริง ปริศนาซ่อนเงื่อน และการต่อสู้เพื่อเอาชีวิตรอดในโลกอันโหดร้าย",
    badgeClass: "bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border-purple-200 dark:border-purple-800/80",
    accentColor: "text-purple-600 dark:text-purple-400",
    iconName: "ShieldAlert",
    popularKeywords: ["Attack on Titan", "Chainsaw Man", "Kaiju No. 8"],
  },
  {
    key: "fantasy",
    name: "แฟนตาซี & การเดินทาง",
    nameEn: "Fantasy & Adventure",
    shortDescription: "เวทมนตร์ ต่างโลก ดันเจี้ยน และการเดินทาง",
    longDescription: "โลกแฟนตาซีอันกว้างใหญ่ มนตร์เสน่ห์แห่งเวทมนตร์ การผจญภัยในดันเจี้ยน และเรื่องราวการเดินทางสุดประทับใจ",
    badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80",
    accentColor: "text-emerald-600 dark:text-emerald-400",
    iconName: "Compass",
    popularKeywords: ["Frieren", "Solo Leveling"],
  },
  {
    key: "sports",
    name: "กีฬา & ชิงไหวชิงพริบ",
    nameEn: "Sports & Battle of Wits",
    shortDescription: "การแข่งขันเดือด จิตวิทยา มุ่งสู่จุดสูงสุด",
    longDescription: "ความดุเดือดในสนามแข่งขัน การวางกลยุทธ์จิตวิทยา และจิตวิญญาณแห่งการเอาชนะขีดจำกัดตัวเอง",
    badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200 dark:border-blue-800/80",
    accentColor: "text-blue-600 dark:text-blue-400",
    iconName: "Dumbbell",
    popularKeywords: ["Blue Lock"],
  },
  {
    key: "comedy",
    name: "คอมเมดี้ & อบอุ่นหัวใจ",
    nameEn: "Comedy & Slice of Life",
    shortDescription: "ฮาเบาสมอง สายลับ ครอบครัว และมิตรภาพ",
    longDescription: "ความตลกขบขัน มิตรภาพแสนอบอุ่น เรื่องราวสายลับสุดป่วน และชีวิตประจำวันที่ชวนให้อมยิ้มทุกหน้า",
    badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800/80",
    accentColor: "text-amber-600 dark:text-amber-400",
    iconName: "Smile",
    popularKeywords: ["Spy x Family", "Dandadan"],
  },
  {
    key: "drama",
    name: "ดราม่า & วงการบันเทิง",
    nameEn: "Drama & Suspense",
    shortDescription: "เบื้องหลังวงการ เกิดใหม่ และการสืบสวน",
    longDescription: "เรื่องราวเจาะลึกเบื้องหลังวงการบันเทิง การแก้แค้น การเกิดใหม่ และปริศนาสืบสวนชวนติดตาม",
    badgeClass: "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-200 dark:border-rose-800/80",
    accentColor: "text-rose-600 dark:text-rose-400",
    iconName: "Film",
    popularKeywords: ["Oshi no Ko"],
  },
] as const;

export interface SeriesGenreMeta {
  genres: string[];
  primaryGenre: string;
  genreLabel: string;
  bestSellerRank?: number;
  salesText?: string;
  rating: number;
  reviewCount: number;
}

export const MANGA_SERIES_GENRE_MAP: Record<string, SeriesGenreMeta> = {
  "jujutsu-kaisen": {
    genres: ["shonen", "dark-fantasy"],
    primaryGenre: "shonen",
    genreLabel: "โชเน็น · ดาร์กแฟนตาซี",
    bestSellerRank: 1,
    salesText: "ยอดขาย 25,000+ เล่ม",
    rating: 4.9,
    reviewCount: 2340,
  },
  frieren: {
    genres: ["fantasy"],
    primaryGenre: "fantasy",
    genreLabel: "แฟนตาซี · การเดินทาง",
    bestSellerRank: 2,
    salesText: "ยอดขาย 18,500+ เล่ม (รางวัล Manga Taisho)",
    rating: 5.0,
    reviewCount: 1890,
  },
  "one-piece": {
    genres: ["shonen"],
    primaryGenre: "shonen",
    genreLabel: "โชเน็น · ผจญภัยระดับตำนาน",
    bestSellerRank: 3,
    salesText: "ยอดขายรวมอันดับ 1 ตลอดกาล",
    rating: 4.9,
    reviewCount: 3120,
  },
  "spy-x-family": {
    genres: ["comedy", "shonen"],
    primaryGenre: "comedy",
    genreLabel: "คอมเมดี้ · ครอบครัวสายลับ",
    bestSellerRank: 4,
    salesText: "ยอดขาย 15,200+ เล่ม",
    rating: 4.9,
    reviewCount: 1680,
  },
  "chainsaw-man": {
    genres: ["dark-fantasy", "shonen"],
    primaryGenre: "dark-fantasy",
    genreLabel: "ดาร์กแฟนตาซี · แอ็กชันปีศาจ",
    bestSellerRank: 5,
    salesText: "ยอดขาย 14,000+ เล่ม",
    rating: 4.8,
    reviewCount: 1450,
  },
  "blue-lock": {
    genres: ["sports"],
    primaryGenre: "sports",
    genreLabel: "กีฬา · แข่งขันเดือด",
    bestSellerRank: 6,
    salesText: "ยอดขาย 12,400+ เล่ม",
    rating: 4.8,
    reviewCount: 1120,
  },
  "demon-slayer": {
    genres: ["shonen"],
    primaryGenre: "shonen",
    genreLabel: "โชเน็น · ดาบพิฆาตอสูร",
    bestSellerRank: 7,
    salesText: "ยอดขาย 11,900+ เล่ม",
    rating: 4.9,
    reviewCount: 2100,
  },
  "solo-leveling": {
    genres: ["fantasy", "shonen"],
    primaryGenre: "fantasy",
    genreLabel: "แอ็กชันแฟนตาซี · ดันเจี้ยนฮันเตอร์",
    bestSellerRank: 8,
    salesText: "ยอดขาย 10,500+ เล่ม",
    rating: 4.8,
    reviewCount: 980,
  },
  "attack-on-titan": {
    genres: ["dark-fantasy"],
    primaryGenre: "dark-fantasy",
    genreLabel: "ดาร์กแฟนตาซี · เอาชีวิตรอด",
    bestSellerRank: 9,
    salesText: "มหากาพย์ระดับโลก",
    rating: 4.9,
    reviewCount: 2890,
  },
  "oshi-no-ko": {
    genres: ["drama"],
    primaryGenre: "drama",
    genreLabel: "ดราม่า · วงการบันเทิง",
    bestSellerRank: 10,
    salesText: "ยอดขายทะลักติดท็อปชาร์ต",
    rating: 4.7,
    reviewCount: 890,
  },
  "kaiju-no-8": {
    genres: ["dark-fantasy", "shonen"],
    primaryGenre: "dark-fantasy",
    genreLabel: "ไซไฟ-ไคจู · หน่วยกวาดล้าง",
    bestSellerRank: 11,
    salesText: "ยอดขายทะลุ 10 ล้านเล่มทั่วโลก",
    rating: 4.7,
    reviewCount: 760,
  },
  dandadan: {
    genres: ["shonen", "comedy"],
    primaryGenre: "shonen",
    genreLabel: "โชเน็น · สิ่งลี้ลับ & คอมเมดี้",
    bestSellerRank: 12,
    salesText: "อนิเมะกระแสแรงแห่งปี",
    rating: 4.8,
    reviewCount: 650,
  },
  "sakamoto-days": {
    genres: ["shonen", "comedy"],
    primaryGenre: "shonen",
    genreLabel: "แอ็กชันนักฆ่า · คอมเมดี้",
    bestSellerRank: 13,
    salesText: "ฉากต่อสู้ระดับมาสเตอร์พีซ",
    rating: 4.8,
    reviewCount: 540,
  },
};

export const COLLECTIBLE_BEST_SELLER_MAP: Record<
  string,
  { bestSellerRank: number; salesText: string; rating: number; reviewCount: number }
> = {
  "2002": {
    bestSellerRank: 1,
    salesText: "ยอดจองอันดับ 1 ฟิกเกอร์สเกลแท้",
    rating: 5.0,
    reviewCount: 320,
  },
  "2001": {
    bestSellerRank: 2,
    salesText: "ฟิกเกอร์ยอดนิยม ล็อตพิเศษพร้อมส่ง",
    rating: 4.9,
    reviewCount: 280,
  },
  "2003": {
    bestSellerRank: 3,
    salesText: "เนนโดรอยด์ขายดีต่อเนื่อง",
    rating: 4.9,
    reviewCount: 410,
  },
  "6001": {
    bestSellerRank: 4,
    salesText: "กันพลาขายดีอันดับ 1 HG Aerial",
    rating: 4.9,
    reviewCount: 530,
  },
  "7001": {
    bestSellerRank: 1,
    salesText: "สแตนดี้อะคริลิกขายดีอันดับ 1",
    rating: 4.9,
    reviewCount: 640,
  },
  "7004": {
    bestSellerRank: 2,
    salesText: "สแตนดี้ Anya ขายดีอันดับ 2",
    rating: 4.9,
    reviewCount: 510,
  },
  "8001": {
    bestSellerRank: 1,
    salesText: "ยอดขายมากกว่า 50,000+ ซอง",
    rating: 5.0,
    reviewCount: 1820,
  },
  "8003": {
    bestSellerRank: 2,
    salesText: "กล่องอะคริลิกกันฝุ่นอันดับ 1",
    rating: 4.8,
    reviewCount: 390,
  },
};

export function getMangaGenreMeta(seriesId: string): SeriesGenreMeta {
  return (
    MANGA_SERIES_GENRE_MAP[seriesId] ?? {
      genres: ["shonen"],
      primaryGenre: "shonen",
      genreLabel: "มังงะแปลไทยลิขสิทธิ์",
      rating: 4.8,
      reviewCount: 100,
    }
  );
}

export function filterMangaByGenre(
  seriesList: CatalogMangaSeries[],
  genreKey: string,
): CatalogMangaSeries[] {
  if (!genreKey || genreKey === "all") return seriesList;
  return seriesList.filter((series) => {
    const meta = MANGA_SERIES_GENRE_MAP[series.id];
    if (!meta) return genreKey === "shonen";
    return meta.genres.includes(genreKey);
  });
}

export interface BestSellerProductItem {
  id: string;
  type: "MANGA" | "COLLECTIBLE";
  rank: number;
  title: string;
  subtitle: string;
  priceFormatted: string;
  numericPrice: number;
  imageUrl: string;
  badgeText: string;
  salesText: string;
  rating: number;
  reviewCount: number;
  href: string;
  categoryTab: "manga" | "figure" | "goods";
}

export function getAllBestSellers(catalog: CatalogData): BestSellerProductItem[] {
  const items: BestSellerProductItem[] = [];

  // Manga best sellers
  for (const series of catalog.mangaSeries) {
    const meta = MANGA_SERIES_GENRE_MAP[series.id];
    if (meta?.bestSellerRank && meta.bestSellerRank <= 8) {
      const minPrice = series.volumes.length
        ? Math.min(...series.volumes.map((v) => v.price))
        : 95;
      items.push({
        id: `manga-${series.id}`,
        type: "MANGA",
        rank: meta.bestSellerRank,
        title: series.title,
        subtitle: `${series.publisher} · ${series.volumes.length} เล่ม · ${meta.genreLabel}`,
        priceFormatted: `เริ่มต้น ฿${minPrice.toLocaleString("th-TH")}`,
        numericPrice: minPrice,
        imageUrl:
          series.coverUrl ||
          series.coverImage ||
          series.volumes[0]?.coverUrl ||
          "/images/products/jjk-vol-01.jpg",
        badgeText: `อันดับ #${meta.bestSellerRank} มังงะขายดี`,
        salesText: meta.salesText || "สินค้าขายดี",
        rating: meta.rating,
        reviewCount: meta.reviewCount,
        href: `/manga/${encodeURIComponent(series.id)}`,
        categoryTab: "manga",
      });
    }
  }

  // Collectibles best sellers
  const allCollectibles = [
    ...catalog.figures,
    ...catalog.plamo,
    ...catalog.goods,
    ...catalog.accessories,
  ];

  for (const item of allCollectibles) {
    const meta =
      COLLECTIBLE_BEST_SELLER_MAP[item.id] ||
      (item.slug ? COLLECTIBLE_BEST_SELLER_MAP[item.slug] : undefined);
    if (meta) {
      const isFigureOrPlamo = item.category === "FIGURE" || item.category === "PLAMO";
      items.push({
        id: `collectible-${item.id}`,
        type: "COLLECTIBLE",
        rank: meta.bestSellerRank + (isFigureOrPlamo ? 0 : 2),
        title: item.name,
        subtitle: `${item.series || item.manufacturer} · ของแท้ลิขสิทธิ์`,
        priceFormatted: `฿${item.fullPrice.toLocaleString("th-TH")}`,
        numericPrice: item.fullPrice,
        imageUrl: item.coverUrl || item.coverImage || item.images[0] || "",
        badgeText: isFigureOrPlamo
          ? `อันดับ #${meta.bestSellerRank} ฟิกเกอร์/โมเดล`
          : `อันดับ #${meta.bestSellerRank} ของสะสม`,
        salesText: meta.salesText,
        rating: meta.rating,
        reviewCount: meta.reviewCount,
        href: `/figures/${encodeURIComponent(item.slug)}`,
        categoryTab: isFigureOrPlamo ? "figure" : "goods",
      });
    }
  }

  return items.sort((a, b) => a.rank - b.rank);
}

export interface RecommendedProductItem {
  id: string;
  type: "MANGA" | "COLLECTIBLE";
  title: string;
  subtitle: string;
  priceFormatted: string;
  numericPrice: number;
  imageUrl: string;
  badgeText: string;
  highlightText: string;
  rating: number;
  reviewCount: number;
  href: string;
  tagColor: string;
}

export function getRecommendedProducts(catalog: CatalogData): RecommendedProductItem[] {
  const items: RecommendedProductItem[] = [];

  // Curated Manga picks
  const recommendedMangaIds = [
    { id: "frieren", badge: "MUST READ · มาสเตอร์พีซ", highlight: "รางวัล Manga Taisho อันดับ 1", rating: 4.9, reviews: 340 },
    { id: "solo-leveling", badge: "HIT ANIME · สุดมันส์", highlight: "ยอดอ่านทั่วโลกกว่าพันล้านครั้ง", rating: 4.9, reviews: 290 },
    { id: "spy-family", badge: "STAFF PICK · สนุกอบอุ่น", highlight: "การันตีความนิยมยอดฮิต", rating: 4.8, reviews: 260 },
    { id: "chainsaw-man", badge: "DARK FANTASY · ดิบเดือด", highlight: "ฉากแอ็กชันสุดมันส์ไม่เหมือนใคร", rating: 4.8, reviews: 310 },
  ];

  for (const pick of recommendedMangaIds) {
    const series = catalog.mangaSeries.find((s) => s.id === pick.id);
    if (series) {
      const minPrice = series.volumes.length ? Math.min(...series.volumes.map((v) => v.price)) : 115;
      items.push({
        id: `rec-manga-${series.id}`,
        type: "MANGA",
        title: series.title,
        subtitle: `${series.publisher} · ${series.volumes.length} เล่ม`,
        priceFormatted: `เริ่มต้น ฿${minPrice.toLocaleString("th-TH")}`,
        numericPrice: minPrice,
        imageUrl: series.coverUrl || series.coverImage || series.volumes[0]?.coverUrl || "/images/products/frieren-vol-01.jpg",
        badgeText: pick.badge,
        highlightText: pick.highlight,
        rating: pick.rating,
        reviewCount: pick.reviews,
        href: `/manga/${encodeURIComponent(series.id)}`,
        tagColor: "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-800/80 dark:bg-orange-950/60 dark:text-orange-300",
      });
    }
  }

  // Curated Collectible picks
  const recommendedCollectibleIds = [
    { id: "2001", badge: "AUTHENTIC FIGURE · ยอดฮิต", highlight: "Nendoroid ลิขสิทธิ์ Good Smile แท้", rating: 4.9, reviews: 185 },
    { id: "6001", badge: "GUNPLA REAL GRADE · พรีเมียม", highlight: "RG Hi-Nu ดีเทลขั้นสุดยอด", rating: 4.9, reviews: 142 },
  ];

  for (const pick of recommendedCollectibleIds) {
    const figure = [...catalog.figures, ...catalog.plamo, ...catalog.goods].find((f) => String(f.id) === pick.id);
    if (figure) {
      items.push({
        id: `rec-col-${figure.id}`,
        type: "COLLECTIBLE",
        title: figure.name,
        subtitle: `${figure.manufacturer || "Official"} · ${figure.series || "Anime"}`,
        priceFormatted: `฿${figure.fullPrice.toLocaleString("th-TH")}`,
        numericPrice: figure.fullPrice,
        imageUrl: figure.coverUrl || figure.coverImage || figure.images[0] || "",
        badgeText: pick.badge,
        highlightText: pick.highlight,
        rating: pick.rating,
        reviewCount: pick.reviews,
        href: `/figures/${encodeURIComponent(figure.slug)}`,
        tagColor: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800/80 dark:bg-sky-950/60 dark:text-sky-300",
      });
    }
  }

  return items;
}

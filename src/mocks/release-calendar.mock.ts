export type ReleaseCategory = "MANGA" | "LIGHT_NOVEL" | "FIGURE";

export interface CalendarReleaseItem {
  id: string;
  title: string;
  category: ReleaseCategory;
  publisherOrBrand: string;
  releaseDate: string; // YYYY-MM-DD
  dayLabel: string;
  price: number;
  imageUrl: string;
  status: "IN_STOCK" | "PREORDER_OPEN";
  preorderDiscountPercent?: number;
  productUrl: string;
}

export const MOCK_CALENDAR_RELEASES: CalendarReleaseItem[] = [
  {
    id: "cal-01",
    title: "มหาเวทผนึกมาร Jujutsu Kaisen เล่ม 27 (ฉบับพิมพ์ครั้งแรกพร้อมโปสการ์ด)",
    category: "MANGA",
    publisherOrBrand: "Siam Inter Comics",
    releaseDate: "2026-10-20",
    dayLabel: "20 ต.ค. 2026",
    price: 95,
    imageUrl: "/images/products/jjk-vol-27.jpg",
    status: "IN_STOCK",
    productUrl: "/manga/manga-1",
  },
  {
    id: "cal-02",
    title: "คำอธิษฐานในวันที่จากลา Frieren เล่ม 13 (ฉบับปกติ)",
    category: "MANGA",
    publisherOrBrand: "Siam Inter Comics",
    releaseDate: "2026-10-22",
    dayLabel: "22 ต.ค. 2026",
    price: 95,
    imageUrl: "/images/products/frieren-vol-13.jpg",
    status: "IN_STOCK",
    productUrl: "/manga/manga-2",
  },
  {
    id: "cal-03",
    title: "Chainsaw Man เล่ม 18 (ภาคโรงเรียนมัธยม)",
    category: "MANGA",
    publisherOrBrand: "Siam Inter Comics",
    releaseDate: "2026-10-24",
    dayLabel: "24 ต.ค. 2026",
    price: 90,
    imageUrl: "/images/products/chainsaw-vol-18.jpg",
    status: "PREORDER_OPEN",
    preorderDiscountPercent: 5,
    productUrl: "/manga/manga-3",
  },
  {
    id: "cal-04",
    title: "ขอให้โชคดีมีชัยในโลกแฟนตาซี! KonoSuba เล่ม 1 (ฉบับพิมพ์ใหม่)",
    category: "LIGHT_NOVEL",
    publisherOrBrand: "Phoenix Next",
    releaseDate: "2026-10-26",
    dayLabel: "26 ต.ค. 2026",
    price: 165,
    imageUrl: "/images/products/konosuba-vol-01.jpg",
    status: "IN_STOCK",
    productUrl: "/manga/konosuba-novel",
  },
  {
    id: "cal-05",
    title: "Nendoroid Denji Chainsaw Man (Official Re-release Lot Japan)",
    category: "FIGURE",
    publisherOrBrand: "Good Smile Company",
    releaseDate: "2026-10-28",
    dayLabel: "28 ต.ค. 2026",
    price: 1890,
    imageUrl: "/images/products/figure-2002.jpg",
    status: "PREORDER_OPEN",
    preorderDiscountPercent: 10,
    productUrl: "/figures/pop-up-parade-sukuna",
  },
  {
    id: "cal-06",
    title: "POP UP PARADE Eren Yeager Attack on Titan Final Season Ver.",
    category: "FIGURE",
    publisherOrBrand: "Good Smile Company",
    releaseDate: "2026-10-30",
    dayLabel: "30 ต.ค. 2026",
    price: 1650,
    imageUrl: "/images/products/figure-2001.jpg",
    status: "PREORDER_OPEN",
    productUrl: "/figures/nendoroid-gojo-satoru",
  },
  {
    id: "cal-07",
    title: "Spy x Family เล่ม 14 (ฉบับพิมพ์ครั้งแรกพร้อมที่คั่น)",
    category: "MANGA",
    publisherOrBrand: "Siam Inter Comics",
    releaseDate: "2026-10-31",
    dayLabel: "31 ต.ค. 2026",
    price: 95,
    imageUrl: "/images/products/spy-family-vol-14.jpg",
    status: "IN_STOCK",
    productUrl: "/manga/spy-family",
  },
];

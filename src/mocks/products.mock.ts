import type {
  CatalogData,
  CatalogFigure,
  CatalogMangaSeries,
  CatalogVolume,
} from "../lib/catalog-client";

const RELEASE_DATE = "2026-11-15T00:00:00.000+07:00";
const PREORDER_DEADLINE = "2026-10-31T23:59:59.000+07:00";

// Jujutsu Kaisen authentic volume cover URLs (Volumes 1 to 26)
export const JUJUTSU_COVERS: Record<number, string> = {
  1: "https://static.wikia.nocookie.net/jujutsu-kaisen/images/0/0e/Volume_1.png/revision/latest",
  2: "https://static.wikia.nocookie.net/jujutsu-kaisen/images/2/2f/Volume_2.png/revision/latest",
  3: "https://static.wikia.nocookie.net/jujutsu-kaisen/images/7/75/Volume_3.png/revision/latest",
  4: "https://static.wikia.nocookie.net/jujutsu-kaisen/images/3/31/Volume_4.png/revision/latest",
  5: "https://static.wikia.nocookie.net/jujutsu-kaisen/images/8/8a/Volume_5.png/revision/latest",
  6: "https://static.wikia.nocookie.net/jujutsu-kaisen/images/f/fb/Volume_6.png/revision/latest",
  7: "https://static.wikia.nocookie.net/jujutsu-kaisen/images/2/24/Volume_7.png/revision/latest",
  8: "https://static.wikia.nocookie.net/jujutsu-kaisen/images/8/82/Volume_8.png/revision/latest",
  9: "https://static.wikia.nocookie.net/jujutsu-kaisen/images/7/79/Volume_9.png/revision/latest",
  10: "https://static.wikia.nocookie.net/jujutsu-kaisen/images/6/6b/Volume_10.png/revision/latest",
  11: "https://static.wikia.nocookie.net/jujutsu-kaisen/images/1/1b/Volume_11.png/revision/latest",
  12: "https://static.wikia.nocookie.net/jujutsu-kaisen/images/4/4e/Volume_12.png/revision/latest",
  13: "https://static.wikia.nocookie.net/jujutsu-kaisen/images/b/b6/Volume_13.png/revision/latest",
  14: "https://static.wikia.nocookie.net/jujutsu-kaisen/images/1/17/Volume_14.png/revision/latest",
  15: "https://static.wikia.nocookie.net/jujutsu-kaisen/images/4/4e/Volume_15.png/revision/latest",
  16: "https://static.wikia.nocookie.net/jujutsu-kaisen/images/4/45/Volume_16.png/revision/latest",
  17: "https://static.wikia.nocookie.net/jujutsu-kaisen/images/6/64/Volume_17.png/revision/latest",
  18: "https://static.wikia.nocookie.net/jujutsu-kaisen/images/a/a2/Volume_18.png/revision/latest",
  19: "https://static.wikia.nocookie.net/jujutsu-kaisen/images/c/c9/Volume_19.png/revision/latest",
  20: "https://static.wikia.nocookie.net/jujutsu-kaisen/images/3/32/Volume_20.png/revision/latest",
  21: "https://static.wikia.nocookie.net/jujutsu-kaisen/images/a/a6/Volume_21.png/revision/latest",
  22: "https://static.wikia.nocookie.net/jujutsu-kaisen/images/5/5e/Volume_22.png/revision/latest",
  23: "https://static.wikia.nocookie.net/jujutsu-kaisen/images/5/5d/Volume_23.png/revision/latest",
  24: "https://static.wikia.nocookie.net/jujutsu-kaisen/images/6/6a/Volume_24.png/revision/latest",
  25: "https://static.wikia.nocookie.net/jujutsu-kaisen/images/e/ef/Volume_25.png/revision/latest",
  26: "https://static.wikia.nocookie.net/jujutsu-kaisen/images/0/00/Volume_26.png/revision/latest",
};

const jujutsuVolumes: CatalogVolume[] = Array.from(
  { length: 25 },
  (_unused, index) => {
    const volumeNumber = index + 1;
    const coverUrl = JUJUTSU_COVERS[volumeNumber] ?? JUJUTSU_COVERS[1];
    return {
      id: 1_000 + volumeNumber,
      volumeNumber,
      title: `มหาเวทย์ผนึกมาร เล่ม ${volumeNumber}`,
      coverUrl,
      images: [coverUrl],
      price: 95,
      stock: volumeNumber <= 24 ? 50 : 20,
      status: "IN_STOCK",
    };
  },
);

const MOONLIT_CITY_COVERS: string[] = [
  "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
];

const TOWER_ALCHEMIST_COVERS: string[] = [
  "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1495640388908-05fa85288e61?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=600&auto=format&fit=crop&q=80",
];

const CHAINSAW_COVERS: string[] = [
  "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
];

const FRIEREN_COVERS: string[] = [
  "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80",
];

const OSHI_NO_KO_COVERS: string[] = [
  "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1582562124811-c09040d0a901?w=600&auto=format&fit=crop&q=80",
];

const BLUE_LOCK_COVERS: string[] = [
  "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
];

const SOLO_LEVELING_COVERS: string[] = [
  "https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80",
];

const MUSHOKU_COVERS: string[] = [
  "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80",
];

const SAO_COVERS: string[] = [
  "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=80",
];

const OVERLORD_COVERS: string[] = [
  "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&auto=format&fit=crop&q=80",
];


function createVolumes(
  firstId: number,
  firstVolume: number,
  count: number,
  title: string,
  price: number,
  stock: number,
  coverPool: string[] = MOONLIT_CITY_COVERS,
): CatalogVolume[] {
  return Array.from({ length: count }, (_unused, index) => {
    const volumeNumber = firstVolume + index;
    const coverUrl = coverPool[(volumeNumber - 1) % coverPool.length] ?? coverPool[0];
    return {
      id: firstId + index,
      volumeNumber,
      title: `${title} เล่ม ${volumeNumber}`,
      coverUrl,
      images: [coverUrl],
      price,
      stock,
      status: "IN_STOCK",
    };
  });
}

jujutsuVolumes.push(
  {
    id: 1_026,
    volumeNumber: 26,
    title: "มหาเวทย์ผนึกมาร เล่ม 26",
    variantLabel: "ปกติ",
    coverUrl: JUJUTSU_COVERS[26],
    images: [JUJUTSU_COVERS[26]],
    price: 95,
    stock: 50,
    status: "PREORDER",
    expectedShippingDate: RELEASE_DATE,
  },
  {
    id: 1_027,
    volumeNumber: 26,
    title: "มหาเวทย์ผนึกมาร เล่ม 26 (Limited Set)",
    variantLabel: "Limited Set",
    coverUrl: JUJUTSU_COVERS[26],
    images: [JUJUTSU_COVERS[26]],
    price: 350,
    stock: 30,
    status: "PREORDER",
    expectedShippingDate: RELEASE_DATE,
  },
);

const mangaSeries: CatalogMangaSeries[] = [
  {
    id: "jujutsu-kaisen",
    title: "มหาเวทย์ผนึกมาร (Jujutsu Kaisen)",
    publisher: "Siam Inter Comics",
    category: "MANGA",
    coverImage: JUJUTSU_COVERS[1],
    coverUrl: JUJUTSU_COVERS[1],
    images: [JUJUTSU_COVERS[1]],
    volumes: jujutsuVolumes,
  },
  {
    id: "moonlit-city",
    title: "นครเร้นจันทร์",
    publisher: "สำนักพิมพ์เมฆา",
    category: "MANGA",
    coverImage: MOONLIT_CITY_COVERS[0],
    coverUrl: MOONLIT_CITY_COVERS[0],
    images: [MOONLIT_CITY_COVERS[0]],
    volumes: [
      ...createVolumes(20_001, 1, 5, "นครเร้นจันทร์", 115, 18, MOONLIT_CITY_COVERS),
      {
        id: 20_006,
        volumeNumber: 6,
        title: "นครเร้นจันทร์ เล่ม 6",
        coverUrl: MOONLIT_CITY_COVERS[5] ?? MOONLIT_CITY_COVERS[0],
        images: [MOONLIT_CITY_COVERS[5] ?? MOONLIT_CITY_COVERS[0]],
        price: 125,
        stock: 40,
        status: "PREORDER",
        expectedShippingDate: "2026-12-10T00:00:00.000+07:00",
      },
      {
        id: 20_007,
        volumeNumber: 7,
        title: "นครเร้นจันทร์ เล่ม 7 (ฉบับพิเศษ)",
        variantLabel: "ฉบับพิเศษ",
        coverUrl: MOONLIT_CITY_COVERS[6] ?? MOONLIT_CITY_COVERS[0],
        images: [MOONLIT_CITY_COVERS[6] ?? MOONLIT_CITY_COVERS[0]],
        price: 290,
        stock: 12,
        status: "PREORDER",
        expectedShippingDate: "2027-01-20T00:00:00.000+07:00",
      },
    ],
  },
  {
    id: "tower-alchemist",
    title: "บันทึกนักปรุงยาแห่งหอคอย",
    publisher: "สำนักพิมพ์ดอกบัว",
    category: "MANGA",
    coverImage: TOWER_ALCHEMIST_COVERS[0],
    coverUrl: TOWER_ALCHEMIST_COVERS[0],
    images: [TOWER_ALCHEMIST_COVERS[0]],
    volumes: [
      ...createVolumes(30_001, 1, 4, "บันทึกนักปรุงยาแห่งหอคอย", 99, 25, TOWER_ALCHEMIST_COVERS),
      {
        id: 30_005,
        volumeNumber: 5,
        title: "บันทึกนักปรุงยาแห่งหอคอย เล่ม 5",
        coverUrl: TOWER_ALCHEMIST_COVERS[4] ?? TOWER_ALCHEMIST_COVERS[0],
        images: [TOWER_ALCHEMIST_COVERS[4] ?? TOWER_ALCHEMIST_COVERS[0]],
        price: 109,
        stock: 0,
        status: "OUT_OF_STOCK",
      },
      {
        id: 30_006,
        volumeNumber: 6,
        title: "บันทึกนักปรุงยาแห่งหอคอย เล่ม 6",
        coverUrl: TOWER_ALCHEMIST_COVERS[5] ?? TOWER_ALCHEMIST_COVERS[0],
        images: [TOWER_ALCHEMIST_COVERS[5] ?? TOWER_ALCHEMIST_COVERS[0]],
        price: 109,
        stock: 30,
        status: "PREORDER",
        expectedShippingDate: "2026-12-28T00:00:00.000+07:00",
      },
    ],
  },
  {
    id: "chainsaw-man",
    title: "มนุษย์เลื่อยยนต์ (Chainsaw Man)",
    publisher: "Siam Inter Comics",
    category: "MANGA",
    coverImage: CHAINSAW_COVERS[0],
    coverUrl: CHAINSAW_COVERS[0],
    images: [CHAINSAW_COVERS[0]],
    volumes: [
      ...createVolumes(50_001, 1, 15, "มนุษย์เลื่อยยนต์ (Chainsaw Man)", 95, 45, CHAINSAW_COVERS),
      {
        id: 50_016,
        volumeNumber: 16,
        title: "มนุษย์เลื่อยยนต์ เล่ม 16",
        coverUrl: CHAINSAW_COVERS[1] ?? CHAINSAW_COVERS[0],
        images: [CHAINSAW_COVERS[1] ?? CHAINSAW_COVERS[0]],
        price: 95,
        stock: 60,
        status: "PREORDER",
        expectedShippingDate: "2026-11-25T00:00:00.000+07:00",
      },
      {
        id: 50_017,
        volumeNumber: 16,
        title: "มนุษย์เลื่อยยนต์ เล่ม 16 (Limited Set + พวงกุญแจ)",
        variantLabel: "Limited Set",
        coverUrl: CHAINSAW_COVERS[2] ?? CHAINSAW_COVERS[0],
        images: [CHAINSAW_COVERS[2] ?? CHAINSAW_COVERS[0]],
        price: 320,
        stock: 25,
        status: "PREORDER",
        expectedShippingDate: "2026-11-25T00:00:00.000+07:00",
      },
    ],
  },
  {
    id: "frieren",
    title: "คำอธิษฐานในวันที่จากลา (Frieren: Beyond Journey's End)",
    publisher: "Siam Inter Comics",
    category: "MANGA",
    coverImage: FRIEREN_COVERS[0],
    coverUrl: FRIEREN_COVERS[0],
    images: [FRIEREN_COVERS[0]],
    volumes: [
      ...createVolumes(51_001, 1, 11, "คำอธิษฐานในวันที่จากลา (Frieren)", 115, 35, FRIEREN_COVERS),
      {
        id: 51_012,
        volumeNumber: 12,
        title: "คำอธิษฐานในวันที่จากลา เล่ม 12",
        coverUrl: FRIEREN_COVERS[1] ?? FRIEREN_COVERS[0],
        images: [FRIEREN_COVERS[1] ?? FRIEREN_COVERS[0]],
        price: 115,
        stock: 50,
        status: "PREORDER",
        expectedShippingDate: "2026-12-05T00:00:00.000+07:00",
      },
      {
        id: 51_013,
        volumeNumber: 12,
        title: "คำอธิษฐานในวันที่จากลา เล่ม 12 (Special Boxset + Postcards)",
        variantLabel: "Special Boxset",
        coverUrl: FRIEREN_COVERS[2] ?? FRIEREN_COVERS[0],
        images: [FRIEREN_COVERS[2] ?? FRIEREN_COVERS[0]],
        price: 450,
        stock: 20,
        status: "PREORDER",
        expectedShippingDate: "2026-12-05T00:00:00.000+07:00",
      },
    ],
  },
  {
    id: "oshi-no-ko",
    title: "เกิดใหม่เป็นลูกโอชิ (Oshi no Ko)",
    publisher: "Luckpim",
    category: "MANGA",
    coverImage: OSHI_NO_KO_COVERS[0],
    coverUrl: OSHI_NO_KO_COVERS[0],
    images: [OSHI_NO_KO_COVERS[0]],
    volumes: [
      ...createVolumes(52_001, 1, 13, "เกิดใหม่เป็นลูกโอชิ (Oshi no Ko)", 125, 40, OSHI_NO_KO_COVERS),
      {
        id: 52_014,
        volumeNumber: 14,
        title: "เกิดใหม่เป็นลูกโอชิ เล่ม 14",
        coverUrl: OSHI_NO_KO_COVERS[1] ?? OSHI_NO_KO_COVERS[0],
        images: [OSHI_NO_KO_COVERS[1] ?? OSHI_NO_KO_COVERS[0]],
        price: 125,
        stock: 45,
        status: "PREORDER",
        expectedShippingDate: "2026-12-18T00:00:00.000+07:00",
      },
      {
        id: 52_015,
        volumeNumber: 14,
        title: "เกิดใหม่เป็นลูกโอชิ เล่ม 14 (Special Set + Acrylic Stand)",
        variantLabel: "Special Set",
        coverUrl: OSHI_NO_KO_COVERS[2] ?? OSHI_NO_KO_COVERS[0],
        images: [OSHI_NO_KO_COVERS[2] ?? OSHI_NO_KO_COVERS[0]],
        price: 390,
        stock: 15,
        status: "PREORDER",
        expectedShippingDate: "2026-12-18T00:00:00.000+07:00",
      },
    ],
  },
  {
    id: "blue-lock",
    title: "ขังดวลแข้ง (Blue Lock)",
    publisher: "Vibulkij",
    category: "MANGA",
    coverImage: BLUE_LOCK_COVERS[0],
    coverUrl: BLUE_LOCK_COVERS[0],
    images: [BLUE_LOCK_COVERS[0]],
    volumes: [
      ...createVolumes(53_001, 1, 27, "ขังดวลแข้ง (Blue Lock)", 110, 40, BLUE_LOCK_COVERS),
      {
        id: 53_028,
        volumeNumber: 28,
        title: "ขังดวลแข้ง เล่ม 28",
        coverUrl: BLUE_LOCK_COVERS[1] ?? BLUE_LOCK_COVERS[0],
        images: [BLUE_LOCK_COVERS[1] ?? BLUE_LOCK_COVERS[0]],
        price: 110,
        stock: 60,
        status: "PREORDER",
        expectedShippingDate: "2026-11-30T00:00:00.000+07:00",
      },
    ],
  },
  {
    id: "solo-leveling",
    title: "Solo Leveling (มันฮวา ฉบับพิมพ์สีทั้งเล่ม)",
    publisher: "Phoenix Next",
    category: "MANGA",
    coverImage: SOLO_LEVELING_COVERS[0],
    coverUrl: SOLO_LEVELING_COVERS[0],
    images: [SOLO_LEVELING_COVERS[0]],
    volumes: [
      ...createVolumes(54_001, 1, 9, "Solo Leveling ฉบับพิมพ์สี", 295, 25, SOLO_LEVELING_COVERS),
      {
        id: 54_010,
        volumeNumber: 10,
        title: "Solo Leveling ฉบับพิมพ์สี เล่ม 10",
        coverUrl: SOLO_LEVELING_COVERS[1] ?? SOLO_LEVELING_COVERS[0],
        images: [SOLO_LEVELING_COVERS[1] ?? SOLO_LEVELING_COVERS[0]],
        price: 295,
        stock: 30,
        status: "PREORDER",
        expectedShippingDate: "2026-12-12T00:00:00.000+07:00",
      },
    ],
  },
];

const figures: CatalogFigure[] = [
  {
    id: "2001",
    slug: "nendoroid-gojo-satoru",
    name: "Nendoroid Gojo Satoru",
    series: "มหาเวทย์ผนึกมาร (Jujutsu Kaisen)",
    character: "Gojo Satoru",
    manufacturer: "Good Smile Company",
    scale: "Non-scale",
    heightMm: 100,
    janCode: "4580590123519",
    images: [
      "https://images.goodsmile.info/cgm/images/product/20201204/10491/78229/large/1f267b1880bfeb45f05a0559d0de81cb.jpg",
      "https://www.goodsmile.com/gsc-webrevo-sdk-storage-prd/product/image/product/20211124/12045/95227/large/f7ff4927ab5f6a7c551b2a406cf8ca7d.jpg",
    ],
    fullPrice: 1_850,
    depositAmount: 500,
    preorderDeadline: PREORDER_DEADLINE,
    releaseMonthYear: "2026-11",
    status: "PREORDER_OPEN",
    stockOrQuotaRemaining: 50,
    boxDimensions: {
      widthCm: 14,
      lengthCm: 18,
      heightCm: 9,
    },
    category: "FIGURE",
  },
  {
    id: "2002",
    slug: "pop-up-parade-sukuna",
    name: "Pop Up Parade Sukuna",
    series: "มหาเวทย์ผนึกมาร (Jujutsu Kaisen)",
    character: "Sukuna",
    manufacturer: "Good Smile Company",
    scale: "Non-scale",
    heightMm: 170,
    janCode: "4580416945110",
    images: [
      "https://images.goodsmile.info/cgm/images/product/20220520/12722/98987/large/58f84e8b6839ec50cd036f0caeeea8ed.jpg",
    ],
    fullPrice: 1_400,
    depositAmount: 0,
    preorderDeadline: "",
    releaseMonthYear: "2026-10",
    status: "IN_STOCK",
    stockOrQuotaRemaining: 5,
    boxDimensions: {
      widthCm: 20,
      lengthCm: 14,
      heightCm: 12,
    },
    category: "FIGURE",
  },
  {
    id: "2003",
    slug: "moonlit-city-guardian",
    name: "Moonlit City Guardian - Collector Figure",
    series: "นครเร้นจันทร์",
    character: "ผู้พิทักษ์นคร",
    manufacturer: "Mekha Hobby Works",
    scale: "1/8",
    heightMm: 220,
    janCode: "4580000002003",
    images: [
      "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80",
    ],
    fullPrice: 2_650,
    depositAmount: 800,
    preorderDeadline: "2026-11-20T23:59:59.000+07:00",
    releaseMonthYear: "2027-02",
    status: "PREORDER_OPEN",
    stockOrQuotaRemaining: 24,
    boxDimensions: {
      widthCm: 25,
      lengthCm: 22,
      heightCm: 30,
    },
    category: "FIGURE",
  },
  {
    id: "2004",
    slug: "tower-alchemist-mini-figure",
    name: "Tower Alchemist - Mini Figure",
    series: "บันทึกนักปรุงยาแห่งหอคอย",
    character: "นักปรุงยา",
    manufacturer: "Lotus Craft Studio",
    scale: "Non-scale",
    heightMm: 125,
    janCode: "4580000002004",
    images: [
      "https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80",
    ],
    fullPrice: 790,
    depositAmount: 0,
    preorderDeadline: "",
    releaseMonthYear: "2026-10",
    status: "IN_STOCK",
    stockOrQuotaRemaining: 16,
    boxDimensions: {
      widthCm: 12,
      lengthCm: 14,
      heightCm: 18,
    },
    category: "FIGURE",
  },
  {
    id: "2005",
    slug: "moonlit-city-acrylic-display",
    name: "Moonlit City - Acrylic Diorama",
    series: "นครเร้นจันทร์",
    character: "ฉากเมืองยามค่ำคืน",
    manufacturer: "Mekha Hobby Works",
    scale: "Display item",
    heightMm: 160,
    janCode: "4580000002005",
    images: [
      "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&auto=format&fit=crop&q=80",
    ],
    fullPrice: 520,
    depositAmount: 0,
    preorderDeadline: "",
    releaseMonthYear: "2026-10",
    status: "PREORDER_CLOSED",
    stockOrQuotaRemaining: 0,
    boxDimensions: {
      widthCm: 18,
      lengthCm: 8,
      heightCm: 18,
    },
    category: "FIGURE",
  },
  {
    id: "2006",
    slug: "nendoroid-frieren",
    name: "Nendoroid Frieren (คำอธิษฐานในวันที่จากลา)",
    series: "คำอธิษฐานในวันที่จากลา (Frieren)",
    character: "Frieren",
    manufacturer: "Good Smile Company",
    scale: "Non-scale",
    heightMm: 100,
    janCode: "4580590184206",
    images: [
      "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80",
    ],
    fullPrice: 1_950,
    depositAmount: 500,
    preorderDeadline: PREORDER_DEADLINE,
    releaseMonthYear: "2026-12",
    status: "PREORDER_OPEN",
    stockOrQuotaRemaining: 40,
    boxDimensions: {
      widthCm: 14,
      lengthCm: 18,
      heightCm: 9,
    },
    category: "FIGURE",
  },
  {
    id: "2007",
    slug: "nendoroid-fern",
    name: "Nendoroid Fern (คำอธิษฐานในวันที่จากลา)",
    series: "คำอธิษฐานในวันที่จากลา (Frieren)",
    character: "Fern",
    manufacturer: "Good Smile Company",
    scale: "Non-scale",
    heightMm: 100,
    janCode: "4580590184213",
    images: [
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80",
    ],
    fullPrice: 1_950,
    depositAmount: 500,
    preorderDeadline: PREORDER_DEADLINE,
    releaseMonthYear: "2027-01",
    status: "PREORDER_OPEN",
    stockOrQuotaRemaining: 35,
    boxDimensions: {
      widthCm: 14,
      lengthCm: 18,
      heightCm: 9,
    },
    category: "FIGURE",
  },
  {
    id: "2008",
    slug: "figma-denji",
    name: "Figma Denji (มนุษย์เลื่อยยนต์)",
    series: "มนุษย์เลื่อยยนต์ (Chainsaw Man)",
    character: "Denji",
    manufacturer: "Max Factory",
    scale: "Non-scale",
    heightMm: 150,
    janCode: "4545784068304",
    images: [
      "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80",
    ],
    fullPrice: 3_200,
    depositAmount: 0,
    preorderDeadline: "",
    releaseMonthYear: "2026-10",
    status: "IN_STOCK",
    stockOrQuotaRemaining: 8,
    boxDimensions: {
      widthCm: 19,
      lengthCm: 22,
      heightCm: 8,
    },
    category: "FIGURE",
  },
  {
    id: "2009",
    slug: "scale-hoshino-ai",
    name: "Scale 1/7 Ai Hoshino - B-Komachi Center (เกิดใหม่เป็นลูกโอชิ)",
    series: "เกิดใหม่เป็นลูกโอชิ (Oshi no Ko)",
    character: "Ai Hoshino",
    manufacturer: "Kadokawa",
    scale: "1/7",
    heightMm: 245,
    janCode: "4935228691029",
    images: [
      "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80",
    ],
    fullPrice: 6_500,
    depositAmount: 1_500,
    preorderDeadline: "2026-12-15T23:59:59.000+07:00",
    releaseMonthYear: "2027-03",
    status: "PREORDER_OPEN",
    stockOrQuotaRemaining: 20,
    boxDimensions: {
      widthCm: 26,
      lengthCm: 24,
      heightCm: 32,
    },
    category: "FIGURE",
  },
  {
    id: "2010",
    slug: "pop-up-parade-isagi",
    name: "Pop Up Parade Yoichi Isagi (ขังดวลแข้ง)",
    series: "ขังดวลแข้ง (Blue Lock)",
    character: "Yoichi Isagi",
    manufacturer: "Good Smile Company",
    scale: "Non-scale",
    heightMm: 170,
    janCode: "4580416947206",
    images: [
      "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80",
    ],
    fullPrice: 1_450,
    depositAmount: 0,
    preorderDeadline: "",
    releaseMonthYear: "2026-10",
    status: "IN_STOCK",
    stockOrQuotaRemaining: 12,
    boxDimensions: {
      widthCm: 15,
      lengthCm: 18,
      heightCm: 10,
    },
    category: "FIGURE",
  },
  {
    id: "2011",
    slug: "scale-frieren-staff",
    name: "Scale 1/7 Frieren - Grimoire & Staff Ver.",
    series: "คำอธิษฐานในวันที่จากลา (Frieren)",
    character: "Frieren",
    manufacturer: "Kotobukiya",
    scale: "1/7",
    heightMm: 235,
    janCode: "4934054048907",
    images: [
      "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80",
    ],
    fullPrice: 5_800,
    depositAmount: 1_500,
    preorderDeadline: "2026-11-30T23:59:59.000+07:00",
    releaseMonthYear: "2027-02",
    status: "PREORDER_OPEN",
    stockOrQuotaRemaining: 18,
    boxDimensions: {
      widthCm: 25,
      lengthCm: 22,
      heightCm: 30,
    },
    category: "FIGURE",
  },
];

const lightNovelSeries: CatalogMangaSeries[] = [
  {
    id: "konosuba-novel",
    title: "ขอให้โชคดีมีชัยในโลกแฟนตาซี! (KonoSuba)",
    publisher: "Phoenix Next",
    category: "LIGHT_NOVEL",
    coverImage:
      "https://static.wikia.nocookie.net/konosuba/images/e/e5/Konosuba_Volume_1_Cover.jpg/revision/latest",
    coverUrl:
      "https://static.wikia.nocookie.net/konosuba/images/e/e5/Konosuba_Volume_1_Cover.jpg/revision/latest",
    images: [
      "https://static.wikia.nocookie.net/konosuba/images/e/e5/Konosuba_Volume_1_Cover.jpg/revision/latest",
    ],
    volumes: [
      {
        id: 40_001,
        volumeNumber: 1,
        title: "ขอให้โชคดีมีชัยในโลกแฟนตาซี! เล่ม 1",
        coverUrl:
          "https://static.wikia.nocookie.net/konosuba/images/e/e5/Konosuba_Volume_1_Cover.jpg/revision/latest",
        images: [
          "https://static.wikia.nocookie.net/konosuba/images/e/e5/Konosuba_Volume_1_Cover.jpg/revision/latest",
        ],
        price: 185,
        stock: 35,
        status: "IN_STOCK",
      },
      {
        id: 40_002,
        volumeNumber: 2,
        title: "ขอให้โชคดีมีชัยในโลกแฟนตาซี! เล่ม 2",
        coverUrl:
          "https://static.wikia.nocookie.net/konosuba/images/b/b5/Konosuba_Volume_10_Cover.jpg/revision/latest",
        images: [
          "https://static.wikia.nocookie.net/konosuba/images/b/b5/Konosuba_Volume_10_Cover.jpg/revision/latest",
        ],
        price: 185,
        stock: 20,
        status: "IN_STOCK",
      },
      {
        id: 40_003,
        volumeNumber: 3,
        title: "ขอให้โชคดีมีชัยในโลกแฟนตาซี! เล่ม 3",
        coverUrl:
          "https://static.wikia.nocookie.net/konosuba/images/e/e4/Konosuba_Volume_12_Cover.jpg/revision/latest",
        images: [
          "https://static.wikia.nocookie.net/konosuba/images/e/e4/Konosuba_Volume_12_Cover.jpg/revision/latest",
        ],
        price: 185,
        stock: 18,
        status: "IN_STOCK",
      },
      {
        id: 40_017,
        volumeNumber: 17,
        title: "ขอให้โชคดีมีชัยในโลกแฟนตาซี! เล่ม 17 (เล่มจบ)",
        variantLabel: "ฉบับปกติ",
        coverUrl:
          "https://static.wikia.nocookie.net/konosuba/images/6/6c/Konosuba_Volume_17.jpg/revision/latest",
        images: [
          "https://static.wikia.nocookie.net/konosuba/images/6/6c/Konosuba_Volume_17.jpg/revision/latest",
        ],
        price: 195,
        stock: 45,
        status: "PREORDER",
        expectedShippingDate: RELEASE_DATE,
      },
      {
        id: 40_018,
        volumeNumber: 17,
        title: "ขอให้โชคดีมีชัยในโลกแฟนตาซี! เล่ม 17 (Special Set + Art Board)",
        variantLabel: "Special Set",
        coverUrl:
          "https://static.wikia.nocookie.net/konosuba/images/6/6c/Konosuba_Volume_17.jpg/revision/latest",
        images: [
          "https://static.wikia.nocookie.net/konosuba/images/6/6c/Konosuba_Volume_17.jpg/revision/latest",
        ],
        price: 495,
        stock: 25,
        status: "PREORDER",
        expectedShippingDate: RELEASE_DATE,
      },
    ],
  },
  {
    id: "classroom-elite-novel",
    title: "ขอต้อนรับสู่ห้องเรียนนิยม (เฉพาะ) ยอดคน (Classroom of the Elite)",
    publisher: "Phoenix Next",
    category: "LIGHT_NOVEL",
    coverImage:
      "https://static.wikia.nocookie.net/youkoso-jitsuryoku-shijou-shugi-no-kyoushitsu-e/images/c/c1/LN_Vol_01_cover.jpg/revision/latest",
    coverUrl:
      "https://static.wikia.nocookie.net/youkoso-jitsuryoku-shijou-shugi-no-kyoushitsu-e/images/c/c1/LN_Vol_01_cover.jpg/revision/latest",
    images: [
      "https://static.wikia.nocookie.net/youkoso-jitsuryoku-shijou-shugi-no-kyoushitsu-e/images/c/c1/LN_Vol_01_cover.jpg/revision/latest",
    ],
    volumes: [
      {
        id: 41_001,
        volumeNumber: 1,
        title: "ขอต้อนรับสู่ห้องเรียนนิยม (เฉพาะ) ยอดคน เล่ม 1",
        coverUrl:
          "https://static.wikia.nocookie.net/youkoso-jitsuryoku-shijou-shugi-no-kyoushitsu-e/images/c/c1/LN_Vol_01_cover.jpg/revision/latest",
        images: [
          "https://static.wikia.nocookie.net/youkoso-jitsuryoku-shijou-shugi-no-kyoushitsu-e/images/c/c1/LN_Vol_01_cover.jpg/revision/latest",
        ],
        price: 195,
        stock: 28,
        status: "IN_STOCK",
      },
      {
        id: 41_002,
        volumeNumber: 2,
        title: "ขอต้อนรับสู่ห้องเรียนนิยม (เฉพาะ) ยอดคน เล่ม 2",
        coverUrl:
          "https://static.wikia.nocookie.net/youkoso-jitsuryoku-shijou-shugi-no-kyoushitsu-e/images/c/c1/LN_Vol_01_cover.jpg/revision/latest",
        images: [
          "https://static.wikia.nocookie.net/youkoso-jitsuryoku-shijou-shugi-no-kyoushitsu-e/images/c/c1/LN_Vol_01_cover.jpg/revision/latest",
        ],
        price: 195,
        stock: 22,
        status: "IN_STOCK",
      },
      {
        id: 41_009,
        volumeNumber: 9,
        title: "ขอต้อนรับสู่ห้องเรียนนิยม (เฉพาะ) ยอดคน ปี 2 เล่ม 9.5",
        coverUrl:
          "https://static.wikia.nocookie.net/youkoso-jitsuryoku-shijou-shugi-no-kyoushitsu-e/images/c/c1/LN_Vol_01_cover.jpg/revision/latest",
        images: [
          "https://static.wikia.nocookie.net/youkoso-jitsuryoku-shijou-shugi-no-kyoushitsu-e/images/c/c1/LN_Vol_01_cover.jpg/revision/latest",
        ],
        price: 210,
        stock: 15,
        status: "IN_STOCK",
      },
      {
        id: 41_010,
        volumeNumber: 10,
        title: "ขอต้อนรับสู่ห้องเรียนนิยม (เฉพาะ) ยอดคน ปี 2 เล่ม 10",
        variantLabel: "ฉบับปกติ",
        coverUrl:
          "https://static.wikia.nocookie.net/youkoso-jitsuryoku-shijou-shugi-no-kyoushitsu-e/images/c/c1/LN_Vol_01_cover.jpg/revision/latest",
        images: [
          "https://static.wikia.nocookie.net/youkoso-jitsuryoku-shijou-shugi-no-kyoushitsu-e/images/c/c1/LN_Vol_01_cover.jpg/revision/latest",
        ],
        price: 210,
        stock: 50,
        status: "PREORDER",
        expectedShippingDate: "2026-12-15T00:00:00.000+07:00",
      },
      {
        id: 41_011,
        volumeNumber: 10,
        title: "ขอต้อนรับสู่ห้องเรียนนิยม (เฉพาะ) ยอดคน ปี 2 เล่ม 10 (Special Set)",
        variantLabel: "Special Set",
        coverUrl:
          "https://static.wikia.nocookie.net/youkoso-jitsuryoku-shijou-shugi-no-kyoushitsu-e/images/c/c1/LN_Vol_01_cover.jpg/revision/latest",
        images: [
          "https://static.wikia.nocookie.net/youkoso-jitsuryoku-shijou-shugi-no-kyoushitsu-e/images/c/c1/LN_Vol_01_cover.jpg/revision/latest",
        ],
        price: 590,
        stock: 20,
        status: "PREORDER",
        expectedShippingDate: "2026-12-15T00:00:00.000+07:00",
      },
    ],
  },
  {
    id: "slime-novel",
    title: "เกิดใหม่ทั้งทีก็เป็นสไลม์ไปซะแล้ว (That Time I Got Reincarnated as a Slime)",
    publisher: "Siam Inter Books",
    category: "LIGHT_NOVEL",
    coverImage:
      "https://static.wikia.nocookie.net/tensei-shitara-slime-datta-ken/images/7/71/Light_Novel_Volume_1_JP.jpg/revision/latest",
    coverUrl:
      "https://static.wikia.nocookie.net/tensei-shitara-slime-datta-ken/images/7/71/Light_Novel_Volume_1_JP.jpg/revision/latest",
    images: [
      "https://static.wikia.nocookie.net/tensei-shitara-slime-datta-ken/images/7/71/Light_Novel_Volume_1_JP.jpg/revision/latest",
    ],
    volumes: [
      {
        id: 42_001,
        volumeNumber: 1,
        title: "เกิดใหม่ทั้งทีก็เป็นสไลม์ไปซะแล้ว เล่ม 1",
        coverUrl:
          "https://static.wikia.nocookie.net/tensei-shitara-slime-datta-ken/images/7/71/Light_Novel_Volume_1_JP.jpg/revision/latest",
        images: [
          "https://static.wikia.nocookie.net/tensei-shitara-slime-datta-ken/images/7/71/Light_Novel_Volume_1_JP.jpg/revision/latest",
        ],
        price: 195,
        stock: 25,
        status: "IN_STOCK",
      },
      {
        id: 42_019,
        volumeNumber: 19,
        title: "เกิดใหม่ทั้งทีก็เป็นสไลม์ไปซะแล้ว เล่ม 19",
        coverUrl:
          "https://static.wikia.nocookie.net/tensei-shitara-slime-datta-ken/images/7/71/Light_Novel_Volume_1_JP.jpg/revision/latest",
        images: [
          "https://static.wikia.nocookie.net/tensei-shitara-slime-datta-ken/images/7/71/Light_Novel_Volume_1_JP.jpg/revision/latest",
        ],
        price: 220,
        stock: 16,
        status: "IN_STOCK",
      },
      {
        id: 42_020,
        volumeNumber: 20,
        title: "เกิดใหม่ทั้งทีก็เป็นสไลม์ไปซะแล้ว เล่ม 20 (Special Boxset)",
        variantLabel: "Special Set",
        coverUrl:
          "https://static.wikia.nocookie.net/tensei-shitara-slime-datta-ken/images/7/71/Light_Novel_Volume_1_JP.jpg/revision/latest",
        images: [
          "https://static.wikia.nocookie.net/tensei-shitara-slime-datta-ken/images/7/71/Light_Novel_Volume_1_JP.jpg/revision/latest",
        ],
        price: 550,
        stock: 18,
        status: "PREORDER",
        expectedShippingDate: "2026-12-20T00:00:00.000+07:00",
      },
    ],
  },
  {
    id: "mushoku-tensei-novel",
    title: "เกิดชาตินี้พี่ต้องเทพ (Mushoku Tensei)",
    publisher: "Dexpress",
    category: "LIGHT_NOVEL",
    coverImage: MUSHOKU_COVERS[0],
    coverUrl: MUSHOKU_COVERS[0],
    images: [MUSHOKU_COVERS[0]],
    volumes: [
      ...createVolumes(60_001, 1, 25, "เกิดชาตินี้พี่ต้องเทพ", 279, 20, MUSHOKU_COVERS),
      {
        id: 60_026,
        volumeNumber: 26,
        title: "เกิดชาตินี้พี่ต้องเทพ เล่ม 26 (เล่มจบ)",
        variantLabel: "ฉบับปกติ",
        coverUrl: MUSHOKU_COVERS[1] ?? MUSHOKU_COVERS[0],
        images: [MUSHOKU_COVERS[1] ?? MUSHOKU_COVERS[0]],
        price: 295,
        stock: 50,
        status: "PREORDER",
        expectedShippingDate: "2026-12-25T00:00:00.000+07:00",
      },
      {
        id: 60_027,
        volumeNumber: 26,
        title: "เกิดชาตินี้พี่ต้องเทพ เล่ม 26 (Special Complete Boxset)",
        variantLabel: "Special Boxset",
        coverUrl: MUSHOKU_COVERS[0],
        images: [MUSHOKU_COVERS[0]],
        price: 790,
        stock: 15,
        status: "PREORDER",
        expectedShippingDate: "2026-12-25T00:00:00.000+07:00",
      },
    ],
  },
  {
    id: "sword-art-online-novel",
    title: "Sword Art Online (ซอร์ดอาร์ตออนไลน์)",
    publisher: "Zenshu",
    category: "LIGHT_NOVEL",
    coverImage: SAO_COVERS[0],
    coverUrl: SAO_COVERS[0],
    images: [SAO_COVERS[0]],
    volumes: [
      ...createVolumes(61_001, 1, 27, "Sword Art Online", 240, 22, SAO_COVERS),
    ],
  },
  {
    id: "overlord-novel",
    title: "โอเวอร์ลอร์ด (Overlord)",
    publisher: "Dexpress",
    category: "LIGHT_NOVEL",
    coverImage: OVERLORD_COVERS[0],
    coverUrl: OVERLORD_COVERS[0],
    images: [OVERLORD_COVERS[0]],
    volumes: [
      ...createVolumes(62_001, 1, 16, "โอเวอร์ลอร์ด", 340, 18, OVERLORD_COVERS),
    ],
  },
];

const plamo: CatalogFigure[] = [
  {
    id: "6001",
    slug: "rg-rx-78-2-gundam-ver-2",
    name: "RG 1/144 RX-78-2 Gundam Ver.2.0",
    series: "Mobile Suit Gundam",
    character: "RX-78-2 Gundam",
    manufacturer: "Bandai Spirits",
    scale: "1/144 (Real Grade)",
    heightMm: 130,
    janCode: "4573102663047",
    images: [
      "https://static.wikia.nocookie.net/gunplabuilders/images/f/fa/RG-RX-78-2-Gundam-%282.0%29-box.jpg/revision/latest",
    ],
    fullPrice: 1_450,
    depositAmount: 400,
    preorderDeadline: "2026-11-15T23:59:59.000+07:00",
    releaseMonthYear: "2026-11",
    status: "PREORDER_OPEN",
    stockOrQuotaRemaining: 30,
    boxDimensions: {
      widthCm: 31,
      lengthCm: 19,
      heightCm: 8,
    },
    category: "PLAMO",
    grade: "RG",
  },
  {
    id: "6002",
    slug: "hg-gundam-aerial-rebuild",
    name: "HG 1/144 Gundam Aerial (Rebuild)",
    series: "Mobile Suit Gundam: The Witch from Mercury",
    character: "Gundam Aerial",
    manufacturer: "Bandai Spirits",
    scale: "1/144 (High Grade)",
    heightMm: 125,
    janCode: "4573102650962",
    images: [
      "https://images.unsplash.com/photo-1596727147705-61a532a659bd?w=800&auto=format&fit=crop&q=80",
    ],
    fullPrice: 680,
    depositAmount: 0,
    preorderDeadline: "",
    releaseMonthYear: "2026-10",
    status: "IN_STOCK",
    stockOrQuotaRemaining: 22,
    boxDimensions: {
      widthCm: 30,
      lengthCm: 19,
      heightCm: 6,
    },
    category: "PLAMO",
    grade: "HG",
  },
  {
    id: "6003",
    slug: "mg-freedom-gundam-ver-2",
    name: "MG 1/100 Freedom Gundam Ver.2.0",
    series: "Mobile Suit Gundam SEED",
    character: "ZGMF-X10A Freedom Gundam",
    manufacturer: "Bandai Spirits",
    scale: "1/100 (Master Grade)",
    heightMm: 180,
    janCode: "4573102635204",
    images: [
      "https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80",
    ],
    fullPrice: 1_950,
    depositAmount: 500,
    preorderDeadline: "2026-12-10T23:59:59.000+07:00",
    releaseMonthYear: "2026-12",
    status: "PREORDER_OPEN",
    stockOrQuotaRemaining: 15,
    boxDimensions: {
      widthCm: 39,
      lengthCm: 31,
      heightCm: 9,
    },
    category: "PLAMO",
    grade: "MG",
  },
  {
    id: "6004",
    slug: "mg-barbatos",
    name: "MG 1/100 Gundam Barbatos (Iron-Blooded Orphans)",
    series: "Mobile Suit Gundam: Iron-Blooded Orphans",
    character: "ASW-G-08 Gundam Barbatos",
    manufacturer: "Bandai Spirits",
    scale: "1/100 (Master Grade)",
    heightMm: 180,
    janCode: "4573102582225",
    images: [
      "https://images.unsplash.com/photo-1596727147705-61a532a659bd?w=800&auto=format&fit=crop&q=80",
    ],
    fullPrice: 1_850,
    depositAmount: 0,
    preorderDeadline: "",
    releaseMonthYear: "2026-10",
    status: "IN_STOCK",
    stockOrQuotaRemaining: 15,
    boxDimensions: {
      widthCm: 39,
      lengthCm: 31,
      heightCm: 9,
    },
    category: "PLAMO",
    grade: "MG",
  },
  {
    id: "6005",
    slug: "rg-hi-nu-gundam",
    name: "RG 1/144 Hi-Nu Gundam",
    series: "Mobile Suit Gundam: Char's Counterattack",
    character: "RX-93-v2 Hi-Nu Gundam",
    manufacturer: "Bandai Spirits",
    scale: "1/144 (Real Grade)",
    heightMm: 145,
    janCode: "4573102619150",
    images: [
      "https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80",
    ],
    fullPrice: 1_750,
    depositAmount: 400,
    preorderDeadline: "2026-11-20T23:59:59.000+07:00",
    releaseMonthYear: "2026-11",
    status: "PREORDER_OPEN",
    stockOrQuotaRemaining: 25,
    boxDimensions: {
      widthCm: 39,
      lengthCm: 31,
      heightCm: 11,
    },
    category: "PLAMO",
    grade: "RG",
  },
  {
    id: "6006",
    slug: "mgex-strike-freedom",
    name: "MGEX 1/100 Strike Freedom Gundam",
    series: "Mobile Suit Gundam SEED Destiny",
    character: "ZGMF-X20A Strike Freedom Gundam",
    manufacturer: "Bandai Spirits",
    scale: "1/100 (MGEX)",
    heightMm: 190,
    janCode: "4573102633712",
    images: [
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80",
    ],
    fullPrice: 5_200,
    depositAmount: 1_500,
    preorderDeadline: "2026-12-10T23:59:59.000+07:00",
    releaseMonthYear: "2026-12",
    status: "PREORDER_OPEN",
    stockOrQuotaRemaining: 10,
    boxDimensions: {
      widthCm: 45,
      lengthCm: 35,
      heightCm: 14,
    },
    category: "PLAMO",
    grade: "MGEX",
  },
  {
    id: "6007",
    slug: "hg-gundam-calibarn",
    name: "HG 1/144 Gundam Calibarn",
    series: "Mobile Suit Gundam: The Witch from Mercury",
    character: "X-EX01 Gundam Calibarn",
    manufacturer: "Bandai Spirits",
    scale: "1/144 (High Grade)",
    heightMm: 130,
    janCode: "4573102653192",
    images: [
      "https://images.unsplash.com/photo-1596727147705-61a532a659bd?w=800&auto=format&fit=crop&q=80",
    ],
    fullPrice: 720,
    depositAmount: 0,
    preorderDeadline: "",
    releaseMonthYear: "2026-10",
    status: "IN_STOCK",
    stockOrQuotaRemaining: 35,
    boxDimensions: {
      widthCm: 30,
      lengthCm: 19,
      heightCm: 6,
    },
    category: "PLAMO",
    grade: "HG",
  },
];

const goods: CatalogFigure[] = [
  {
    id: "7001",
    slug: "gojo-satoru-acrylic-stand",
    name: "สแตนดี้อะคริลิก โกโจ ซาโตรุ (Gojo Satoru Acrylic Stand 15cm)",
    series: "มหาเวทย์ผนึกมาร (Jujutsu Kaisen)",
    character: "Gojo Satoru",
    manufacturer: "Mappa / Toho Animation",
    scale: "15cm",
    heightMm: 150,
    janCode: "4580000000011",
    images: [
      "https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80",
    ],
    fullPrice: 390,
    depositAmount: 0,
    preorderDeadline: "",
    releaseMonthYear: "2026-10",
    status: "IN_STOCK",
    stockOrQuotaRemaining: 45,
    boxDimensions: {
      widthCm: 16,
      lengthCm: 22,
      heightCm: 1,
    },
    category: "GOODS",
    subcategory: "STANDY",
  },
  {
    id: "7002",
    slug: "sukuna-metal-badge",
    name: "เข็มกลัดโลหะเคลือบเงา เรียวเมน สุคุนะ (Sukuna Metal Badge)",
    series: "มหาเวทย์ผนึกมาร (Jujutsu Kaisen)",
    character: "Sukuna",
    manufacturer: "Mappa",
    scale: "75mm",
    heightMm: 75,
    janCode: "4580000000028",
    images: [
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
    ],
    fullPrice: 180,
    depositAmount: 0,
    preorderDeadline: "",
    releaseMonthYear: "2026-10",
    status: "IN_STOCK",
    stockOrQuotaRemaining: 80,
    boxDimensions: {
      widthCm: 8,
      lengthCm: 8,
      heightCm: 2,
    },
    category: "GOODS",
    subcategory: "BADGE",
  },
  {
    id: "7003",
    slug: "megumi-yuji-keychain",
    name: "พวงกุญแจอะคริลิก ยูจิ & เมกุมิ (Yuji & Megumi Acrylic Keychain)",
    series: "มหาเวทย์ผนึกมาร (Jujutsu Kaisen)",
    character: "Itadori Yuji & Fushiguro Megumi",
    manufacturer: "Mappa",
    scale: "70mm",
    heightMm: 70,
    janCode: "4580000000035",
    images: [
      "https://images.unsplash.com/photo-1582562124811-c09040d0a901?w=800&auto=format&fit=crop&q=80",
    ],
    fullPrice: 220,
    depositAmount: 0,
    preorderDeadline: "",
    releaseMonthYear: "2026-10",
    status: "IN_STOCK",
    stockOrQuotaRemaining: 60,
    boxDimensions: {
      widthCm: 8,
      lengthCm: 12,
      heightCm: 1,
    },
    category: "GOODS",
    subcategory: "KEYCHAIN",
  },
  {
    id: "7004",
    slug: "moonlit-city-mini-shikishi",
    name: "แผ่นภาพ Shikishi ลายเซ็นพิเศษ นครเร้นจันทร์ (Moonlit City Mini Shikishi Art Board)",
    series: "นครเร้นจันทร์",
    character: "ผู้พิทักษ์นคร",
    manufacturer: "Mekha Hobby Works",
    scale: "12x13.5cm",
    heightMm: 135,
    janCode: "4580000000042",
    images: [
      "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80",
    ],
    fullPrice: 250,
    depositAmount: 0,
    preorderDeadline: "",
    releaseMonthYear: "2026-10",
    status: "IN_STOCK",
    stockOrQuotaRemaining: 30,
    boxDimensions: {
      widthCm: 13,
      lengthCm: 15,
      heightCm: 1,
    },
    category: "GOODS",
    subcategory: "SHIKISHI",
  },
  {
    id: "7005",
    slug: "frieren-acrylic-stand-mimic",
    name: "สแตนดี้อะคริลิก ฟรีเรนกับหีบมิมิค (Frieren Mimic Acrylic Stand 14cm)",
    series: "คำอธิษฐานในวันที่จากลา (Frieren)",
    character: "Frieren & Mimic",
    manufacturer: "Movic",
    scale: "14cm",
    heightMm: 140,
    janCode: "4580000000103",
    images: [
      "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80",
    ],
    fullPrice: 380,
    depositAmount: 0,
    preorderDeadline: "",
    releaseMonthYear: "2026-10",
    status: "IN_STOCK",
    stockOrQuotaRemaining: 40,
    boxDimensions: {
      widthCm: 16,
      lengthCm: 20,
      heightCm: 1,
    },
    category: "GOODS",
    subcategory: "STANDY",
  },
  {
    id: "7006",
    slug: "chainsaw-man-pochita-plush",
    name: "ตุ๊กตาโพชิตะ นุ่มพิเศษ ขนาด 25 ซม. (Pochita Soft Plush Toy)",
    series: "มนุษย์เลื่อยยนต์ (Chainsaw Man)",
    character: "Pochita",
    manufacturer: "MAPPA / Movic",
    scale: "25cm",
    heightMm: 250,
    janCode: "4580000000110",
    images: [
      "https://images.unsplash.com/photo-1582562124811-c09040d0a901?w=800&auto=format&fit=crop&q=80",
    ],
    fullPrice: 650,
    depositAmount: 0,
    preorderDeadline: "",
    releaseMonthYear: "2026-10",
    status: "IN_STOCK",
    stockOrQuotaRemaining: 25,
    boxDimensions: {
      widthCm: 22,
      lengthCm: 25,
      heightCm: 18,
    },
    category: "GOODS",
    subcategory: "OTHER",
  },
  {
    id: "7007",
    slug: "oshi-no-ko-glow-stick",
    name: "แท่งไฟเชียร์ B-Komachi Official Concert Penlight",
    series: "เกิดใหม่เป็นลูกโอชิ (Oshi no Ko)",
    character: "B-Komachi",
    manufacturer: "Kadokawa",
    scale: "25cm",
    heightMm: 250,
    janCode: "4580000000127",
    images: [
      "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80",
    ],
    fullPrice: 890,
    depositAmount: 0,
    preorderDeadline: "",
    releaseMonthYear: "2026-10",
    status: "IN_STOCK",
    stockOrQuotaRemaining: 30,
    boxDimensions: {
      widthCm: 10,
      lengthCm: 28,
      heightCm: 5,
    },
    category: "GOODS",
    subcategory: "OTHER",
  },
  {
    id: "7008",
    slug: "blue-lock-chibi-badge-box",
    name: "บ็อกซ์เซ็ตเข็มกลัดจิบิ ขังดวลแข้ง (Blue Lock Chibi Badge Complete Box 8 ชิ้น)",
    series: "ขังดวลแข้ง (Blue Lock)",
    character: "Team Z & Rivals",
    manufacturer: "Bandai Namco",
    scale: "58mm",
    heightMm: 58,
    janCode: "4580000000134",
    images: [
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
    ],
    fullPrice: 1_200,
    depositAmount: 0,
    preorderDeadline: "",
    releaseMonthYear: "2026-10",
    status: "IN_STOCK",
    stockOrQuotaRemaining: 20,
    boxDimensions: {
      widthCm: 20,
      lengthCm: 25,
      heightCm: 4,
    },
    category: "GOODS",
    subcategory: "BADGE",
  },
];

const accessories: CatalogFigure[] = [
  {
    id: "8001",
    slug: "manga-cover-standard-pack",
    name: "ปกพลาสติกสำเร็จรูปถนอมหนังสือ ไซส์มาตรฐาน (Pack 10 ชิ้น)",
    series: "Care & Protection",
    character: "อุปกรณ์ดูแลหนังสือ",
    manufacturer: "Comic Shield Japan",
    scale: "ความสูง 17.5 - 18.2 cm",
    heightMm: 182,
    janCode: "4580000000059",
    images: [
      "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80",
    ],
    fullPrice: 50,
    depositAmount: 0,
    preorderDeadline: "",
    releaseMonthYear: "2026-10",
    status: "IN_STOCK",
    stockOrQuotaRemaining: 150,
    boxDimensions: {
      widthCm: 19,
      lengthCm: 25,
      heightCm: 2,
    },
    category: "ACCESSORY",
    subcategory: "BOOK_COVER",
  },
  {
    id: "8002",
    slug: "light-novel-cover-big-book-pack",
    name: "ปกพลาสติกสำเร็จรูปถนอมหนังสือ ไซส์ Big Book & Light Novel (Pack 10 ชิ้น)",
    series: "Care & Protection",
    character: "อุปกรณ์ดูแลหนังสือ",
    manufacturer: "Comic Shield Japan",
    scale: "ความสูง 18.5 - 21.0 cm",
    heightMm: 210,
    janCode: "4580000000066",
    images: [
      "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&auto=format&fit=crop&q=80",
    ],
    fullPrice: 65,
    depositAmount: 0,
    preorderDeadline: "",
    releaseMonthYear: "2026-10",
    status: "IN_STOCK",
    stockOrQuotaRemaining: 120,
    boxDimensions: {
      widthCm: 22,
      lengthCm: 28,
      heightCm: 2,
    },
    category: "ACCESSORY",
    subcategory: "BOOK_COVER",
  },
  {
    id: "8003",
    slug: "nendoroid-acrylic-display-case",
    name: "กล่องครอบอะคริลิกใสกันฝุ่นสำหรับ Nendoroid (Single Dustproof Display Case)",
    series: "Collector Protection",
    character: "กล่องครอบฟิกเกอร์",
    manufacturer: "Hobby Display Master",
    scale: "12x12x15 cm",
    heightMm: 150,
    janCode: "4580000000073",
    images: [
      "https://images.unsplash.com/photo-1584727638096-042c45049ebe?w=800&auto=format&fit=crop&q=80",
    ],
    fullPrice: 290,
    depositAmount: 0,
    preorderDeadline: "",
    releaseMonthYear: "2026-10",
    status: "IN_STOCK",
    stockOrQuotaRemaining: 35,
    boxDimensions: {
      widthCm: 14,
      lengthCm: 14,
      heightCm: 17,
    },
    category: "ACCESSORY",
    subcategory: "DISPLAY_BOX",
  },
  {
    id: "8004",
    slug: "scale-figure-acrylic-case-wood-base",
    name: "กล่องครอบอะคริลิกกันฝุ่นสำหรับสเกล 1/7 พร้อมฐานไม้ (Scale Display Box With Wooden Base)",
    series: "Collector Protection",
    character: "กล่องครอบฟิกเกอร์",
    manufacturer: "Hobby Display Master",
    scale: "25x25x35 cm",
    heightMm: 350,
    janCode: "4580000000080",
    images: [
      "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&auto=format&fit=crop&q=80",
    ],
    fullPrice: 890,
    depositAmount: 0,
    preorderDeadline: "",
    releaseMonthYear: "2026-10",
    status: "IN_STOCK",
    stockOrQuotaRemaining: 18,
    boxDimensions: {
      widthCm: 27,
      lengthCm: 27,
      heightCm: 37,
    },
    category: "ACCESSORY",
    subcategory: "DISPLAY_BOX",
  },
  {
    id: "8005",
    slug: "manga-shelf-divider-acrylic",
    name: "ที่กั้นหนังสืออะคริลิกใส หนาพิเศษ 4mm (Pack 2 ชิ้น)",
    series: "Care & Protection",
    character: "อุปกรณ์ดูแลหนังสือ",
    manufacturer: "Comic Shield Japan",
    scale: "15x20 cm",
    heightMm: 200,
    janCode: "4580000000141",
    images: [
      "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80",
    ],
    fullPrice: 160,
    depositAmount: 0,
    preorderDeadline: "",
    releaseMonthYear: "2026-10",
    status: "IN_STOCK",
    stockOrQuotaRemaining: 80,
    boxDimensions: {
      widthCm: 16,
      lengthCm: 22,
      heightCm: 4,
    },
    category: "ACCESSORY",
    subcategory: "BOOK_COVER",
  },
  {
    id: "8006",
    slug: "model-cleaning-soft-brush",
    name: "แปรงปัดฝุ่นขนนุ่มป้องกันไฟฟ้าสถิตสำหรับฟิกเกอร์และกันพลา (Anti-Static Dusting Brush)",
    series: "Collector Protection",
    character: "อุปกรณ์ดูแลโมเดล",
    manufacturer: "Hobby Master",
    scale: "16 cm",
    heightMm: 160,
    janCode: "4580000000158",
    images: [
      "https://images.unsplash.com/photo-1584727638096-042c45049ebe?w=800&auto=format&fit=crop&q=80",
    ],
    fullPrice: 120,
    depositAmount: 0,
    preorderDeadline: "",
    releaseMonthYear: "2026-10",
    status: "IN_STOCK",
    stockOrQuotaRemaining: 100,
    boxDimensions: {
      widthCm: 5,
      lengthCm: 20,
      heightCm: 2,
    },
    category: "ACCESSORY",
    subcategory: "CARE_TOOL",
  },
  {
    id: "8007",
    slug: "led-light-base-figure",
    name: "ฐานวางฟิกเกอร์ไฟ LED ระบบสัมผัส ปรับแสง 3 สี (Touch LED Base 15cm for Figures)",
    series: "Collector Protection",
    character: "ฐานไฟจัดแสดงฟิกเกอร์",
    manufacturer: "Hobby Display Master",
    scale: "15x15x2.5 cm",
    heightMm: 25,
    janCode: "4580000000165",
    images: [
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80",
    ],
    fullPrice: 350,
    depositAmount: 0,
    preorderDeadline: "",
    releaseMonthYear: "2026-10",
    status: "IN_STOCK",
    stockOrQuotaRemaining: 40,
    boxDimensions: {
      widthCm: 17,
      lengthCm: 17,
      heightCm: 4,
    },
    category: "ACCESSORY",
    subcategory: "DISPLAY_BOX",
  },
];

export type ProductType =
  | "MANGA"
  | "FIGURE"
  | "LIGHT_NOVEL"
  | "GOODS"
  | "PLAMO"
  | "ACCESSORY";

export function isVatExemptProductType(type: ProductType): boolean {
  return type === "MANGA" || type === "LIGHT_NOVEL";
}

export interface MockCatalogVariant {
  productType: ProductType;
  title: string;
  volumeNumber?: number;
  variantLabel?: string;
  price: number;
  weightGrams: number;
  isPreorder: boolean;
  stockOrQuotaRemaining: number;
  figure?: CatalogFigure;
  subcategory?: string;
}

export const BOOK_COVER_ADDON_VARIANT_ID = 99_999;
export const BOOK_COVER_ADDON_UNIT_PRICE = 5;

export function getMockCatalog(): CatalogData {
  return {
    mangaSeries: mangaSeries.map((series) => ({
      ...series,
      volumes: series.volumes.map((volume) => ({ ...volume })),
    })),
    lightNovelSeries: lightNovelSeries.map((series) => ({
      ...series,
      volumes: series.volumes.map((volume) => ({ ...volume })),
    })),
    figures: figures.map((figure) => ({
      ...figure,
      images: [...figure.images],
      boxDimensions: { ...figure.boxDimensions },
    })),
    plamo: plamo.map((item) => ({
      ...item,
      images: [...item.images],
      boxDimensions: { ...item.boxDimensions },
    })),
    goods: goods.map((item) => ({
      ...item,
      images: [...item.images],
      boxDimensions: { ...item.boxDimensions },
    })),
    accessories: accessories.map((item) => ({
      ...item,
      images: [...item.images],
      boxDimensions: { ...item.boxDimensions },
    })),
  };
}

export function findMockVariant(productVariantId: number): MockCatalogVariant | null {
  if (productVariantId === BOOK_COVER_ADDON_VARIANT_ID) {
    return {
      productType: "ACCESSORY",
      title: "ปกพลาสติกสำเร็จรูปถนอมหนังสือ",
      price: BOOK_COVER_ADDON_UNIT_PRICE,
      weightGrams: 5,
      isPreorder: false,
      stockOrQuotaRemaining: 99_999,
      subcategory: "BOOK_COVER",
    };
  }

  for (const series of mangaSeries) {
    const volume = series.volumes.find((item) => item.id === productVariantId);
    if (volume) {
      return {
        productType: "MANGA",
        title: series.title,
        volumeNumber: volume.volumeNumber,
        ...(volume.variantLabel ? { variantLabel: volume.variantLabel } : {}),
        price: volume.price,
        weightGrams:
          volume.variantLabel === "Limited Set" ||
          volume.variantLabel?.includes("Boxset") ||
          volume.variantLabel === "ฉบับพิเศษ"
            ? 450
            : volume.volumeNumber === 26
              ? 400
              : 250,
        isPreorder: volume.status === "PREORDER",
        stockOrQuotaRemaining: volume.stock,
      };
    }
  }

  for (const series of lightNovelSeries) {
    const volume = series.volumes.find((item) => item.id === productVariantId);
    if (volume) {
      return {
        productType: "LIGHT_NOVEL",
        title: series.title,
        volumeNumber: volume.volumeNumber,
        ...(volume.variantLabel ? { variantLabel: volume.variantLabel } : {}),
        price: volume.price,
        weightGrams:
          volume.variantLabel?.includes("Set") || volume.variantLabel?.includes("Boxset")
            ? 420
            : 280,
        isPreorder: volume.status === "PREORDER",
        stockOrQuotaRemaining: volume.stock,
      };
    }
  }

  const allItems: CatalogFigure[] = [
    ...figures,
    ...plamo,
    ...goods,
    ...accessories,
  ];

  const matched = allItems.find((item) => Number(item.id) === productVariantId);
  if (!matched) {
    return null;
  }

  const category = (matched.category as ProductType) ?? "FIGURE";
  const weightGrams =
    matched.category === "PLAMO"
      ? matched.scale?.includes("1/100")
        ? 850
        : 450
      : matched.category === "GOODS"
        ? 100
        : matched.category === "ACCESSORY"
          ? 200
          : matched.id === "2001"
            ? 350
            : matched.id === "2004"
              ? 250
              : matched.id === "2005"
                ? 180
                : 650;

  return {
    productType: category,
    title: matched.name,
    price: matched.fullPrice,
    weightGrams,
    isPreorder: matched.status === "PREORDER_OPEN",
    stockOrQuotaRemaining: matched.stockOrQuotaRemaining,
    subcategory: matched.subcategory,
    figure: {
      ...matched,
      images: [...matched.images],
      boxDimensions: { ...matched.boxDimensions },
    },
  };
}

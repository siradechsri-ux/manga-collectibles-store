import type {
  CatalogData,
  CatalogFigure,
  CatalogMangaSeries,
  CatalogVolume,
} from "../lib/catalog-client";

const RELEASE_DATE = "2026-11-15T00:00:00.000+07:00";
const PREORDER_DEADLINE = "2026-10-31T23:59:59.000+07:00";

const jujutsuVolumes: CatalogVolume[] = Array.from(
  { length: 25 },
  (_unused, index) => {
    const volumeNumber = index + 1;
    return {
      id: 1_000 + volumeNumber,
      volumeNumber,
      title: `มหาเวทย์ผนึกมาร เล่ม ${volumeNumber}`,
      price: 95,
      stock: volumeNumber <= 24 ? 50 : 20,
      status: "IN_STOCK",
    };
  },
);

function createVolumes(
  firstId: number,
  firstVolume: number,
  count: number,
  title: string,
  price: number,
  stock: number,
): CatalogVolume[] {
  return Array.from({ length: count }, (_unused, index) => {
    const volumeNumber = firstVolume + index;
    return {
      id: firstId + index,
      volumeNumber,
      title: `${title} เล่ม ${volumeNumber}`,
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
    volumes: jujutsuVolumes,
  },
  {
    id: "moonlit-city",
    title: "นครเร้นจันทร์",
    publisher: "สำนักพิมพ์เมฆา",
    volumes: [
      ...createVolumes(20_001, 1, 5, "นครเร้นจันทร์", 115, 18),
      {
        id: 20_006,
        volumeNumber: 6,
        title: "นครเร้นจันทร์ เล่ม 6",
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
    volumes: [
      ...createVolumes(30_001, 1, 4, "บันทึกนักปรุงยาแห่งหอคอย", 99, 25),
      {
        id: 30_005,
        volumeNumber: 5,
        title: "บันทึกนักปรุงยาแห่งหอคอย เล่ม 5",
        price: 109,
        stock: 0,
        status: "OUT_OF_STOCK",
      },
      {
        id: 30_006,
        volumeNumber: 6,
        title: "บันทึกนักปรุงยาแห่งหอคอย เล่ม 6",
        price: 109,
        stock: 30,
        status: "PREORDER",
        expectedShippingDate: "2026-12-28T00:00:00.000+07:00",
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
    janCode: "",
    images: [],
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
    janCode: "",
    images: [],
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
    janCode: "",
    images: [],
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
    janCode: "",
    images: [],
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
    janCode: "",
    images: [],
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
  },
];

export interface MockCatalogVariant {
  productType: "MANGA" | "FIGURE";
  title: string;
  volumeNumber?: number;
  variantLabel?: string;
  price: number;
  weightGrams: number;
  isPreorder: boolean;
  stockOrQuotaRemaining: number;
  figure?: CatalogFigure;
}

export function getMockCatalog(): CatalogData {
  return {
    mangaSeries: mangaSeries.map((series) => ({
      ...series,
      volumes: series.volumes.map((volume) => ({ ...volume })),
    })),
    figures: figures.map((figure) => ({
      ...figure,
      images: [...figure.images],
      boxDimensions: { ...figure.boxDimensions },
    })),
  };
}

export function findMockVariant(productVariantId: number): MockCatalogVariant | null {
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
          volume.variantLabel === "Limited Set" || volume.variantLabel === "ฉบับพิเศษ"
            ? 450
            : volume.volumeNumber === 26
              ? 400
              : 250,
        isPreorder: volume.status === "PREORDER",
        stockOrQuotaRemaining: volume.stock,
      };
    }
  }

  const figure = figures.find((item) => Number(item.id) === productVariantId);
  if (!figure) {
    return null;
  }

  return {
    productType: "FIGURE",
    title: figure.name,
    price: figure.fullPrice,
    weightGrams:
      figure.id === "2001"
        ? 350
        : figure.id === "2004"
          ? 250
          : figure.id === "2005"
            ? 180
            : 650,
    isPreorder: figure.status === "PREORDER_OPEN",
    stockOrQuotaRemaining: figure.stockOrQuotaRemaining,
    figure: {
      ...figure,
      images: [...figure.images],
      boxDimensions: { ...figure.boxDimensions },
    },
  };
}

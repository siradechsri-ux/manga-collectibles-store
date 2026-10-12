export const STORE_COLLECTIONS = [
  {
    slug: "manga",
    title: "มังงะ",
    subtitle: "MANGA",
    description: "รวมซีรีส์มังงะและเล่มโปรดของคุณ",
    badge: "VAT 0%",
    previewImages: ["jjk-vol-01.jpg", "jjk-vol-02.jpg", "spy-family-vol-01.jpg", "aot-vol-01.jpg"],
  },
  {
    slug: "light-novel",
    title: "ไลท์โนเวล",
    subtitle: "LIGHT NOVEL",
    description: "นิยายภาพ เล่มปกติ และชุดพิเศษ",
    badge: "VAT 0%",
    previewImages: ["konosuba-vol-01.jpg", "mushoku-vol-01.jpg", "overlord-vol-01.jpg", "rezero-vol-01.jpg"],
  },
  {
    slug: "figures",
    title: "Figure & โมเดล",
    subtitle: "FIGURE · PLAMO",
    description: "ฟิกเกอร์ โมเดล และของสะสมแท้",
    badge: "FIGURE & PLAMO",
    previewImages: ["figure-2001.jpg", "figure-2002.jpg", "plamo-6001.jpg", "plamo-6002.jpg"],
  },
  {
    slug: "goods",
    title: "กู้ดส์ & ของสะสม",
    subtitle: "GOODS",
    description: "สแตนดี้ เข็มกลัด พวงกุญแจ และอีกมากมาย",
    badge: "COLLECTIBLES",
    previewImages: ["goods-7001.jpg", "goods-7002.jpg", "goods-7003.jpg", "goods-7004.jpg"],
  },
  {
    slug: "accessories",
    title: "อุปกรณ์ดูแล",
    subtitle: "CARE & ACCESSORY",
    description: "ปกถนอมหนังสือและกล่องจัดแสดง",
    badge: "CARE & ACCESSORY",
    previewImages: ["acc-8001.jpg", "acc-8002.jpg", "acc-8003.jpg", "acc-8004.jpg"],
  },
] as const;

export type StoreCollection = (typeof STORE_COLLECTIONS)[number];
export type StoreCollectionSlug = StoreCollection["slug"];
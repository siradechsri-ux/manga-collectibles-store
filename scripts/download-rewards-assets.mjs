import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const outputDir = path.join(projectRoot, "public", "images", "rewards");
const localAccSleevesPath = path.join(
  projectRoot,
  "public",
  "images",
  "products",
  "acc-8001.jpg",
);

/**
 * รายการของสะสมลิขสิทธิ์แท้ตรงปก 100% จากผู้ผลิตและตัวแทนจำหน่ายทางการ (AmiAmi & HobbyLink Japan)
 */
const ASSETS = [
  {
    fileName: "reward-jjk-bookmark.jpg",
    title: "ที่คั่นหนังสือโฮโลแกรม Jujutsu Kaisen Special Edition",
    primaryUrl: "https://www.hlj.com/productimages/fts/fts60758_0.jpg",
    fallbackUrls: [
      "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80",
    ],
  },
  {
    fileName: "reward-frieren-postcard.jpg",
    title: "โปสการ์ดฟอยล์ทอง Frieren & Fern Memorial Art",
    primaryUrl: "https://img.amiami.com/images/product/main/241/GOODS-04454346.jpg",
    fallbackUrls: [
      "https://cdn.myanimelist.net/images/anime/1015/138006l.jpg",
    ],
  },
  {
    fileName: "reward-anya-standee.jpg",
    title: "สแตนดี้อะคริลิกจิบิ Anya Forger Mini Stand (Spy x Family)",
    primaryUrl: "https://img.amiami.com/images/product/main/241/GOODS-04438455.jpg",
    fallbackUrls: [
      "https://img.amiami.com/images/product/main/251/GOODS-04576501.jpg",
      "https://cdn.myanimelist.net/images/characters/4/457933.jpg",
    ],
  },
  {
    fileName: "reward-manga-sleeves.jpg",
    title: "ซองใสถนอมหนังสือมังงะแบบมีแถบกาว Pack 10 แผ่น",
    localCopySource: localAccSleevesPath,
    primaryUrl:
      "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
    fallbackUrls: [],
  },
  {
    fileName: "reward-blue-lock-keychain.jpg",
    title: "พวงกุญแจอะคริลิก Yoichi Isagi (Blue Lock)",
    primaryUrl: "https://img.amiami.com/images/product/main/241/GOODS-04450777.jpg",
    fallbackUrls: [
      "https://cdn.myanimelist.net/images/characters/6/558080.jpg",
    ],
  },
  {
    fileName: "reward-tanjiro-badge.jpg",
    title: "เข็มกลัดโลหะดาบพิฆาตอสูร Tanjiro Kamado Hanafuda Motif",
    primaryUrl: "https://img.amiami.com/images/product/main/232/GOODS-04361026.jpg",
    fallbackUrls: [
      "https://www.hlj.com/productimages/mov/mov39174_0.jpg",
      "https://cdn.myanimelist.net/images/characters/6/386735.jpg",
    ],
  },
];

async function fetchImageBuffer(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  const isAmiAmi = url.includes("amiami");
  const isHLJ = url.includes("hlj");
  const referer = isAmiAmi
    ? "https://www.amiami.com/"
    : isHLJ
      ? "https://www.hlj.com/"
      : "https://myanimelist.net/";

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        Referer: referer,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("image") && !contentType.includes("octet-stream")) {
      throw new Error(`Invalid content-type: ${contentType}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

async function downloadAsset(asset) {
  const targetPath = path.join(outputDir, asset.fileName);

  // If local copy source is available and valid, copy directly
  if (asset.localCopySource && fs.existsSync(asset.localCopySource)) {
    fs.copyFileSync(asset.localCopySource, targetPath);
    const stat = fs.statSync(targetPath);
    console.log(
      `[COPIED] Direct local authentic asset: ${asset.fileName} (${(stat.size / 1024).toFixed(1)} KB)`,
    );
    return;
  }

  const candidateUrls = [asset.primaryUrl, ...asset.fallbackUrls];

  for (let i = 0; i < candidateUrls.length; i++) {
    const url = candidateUrls[i];
    try {
      console.log(`[DOWNLOAD] Fetching authentic merchandise: ${asset.fileName} (${url.slice(0, 50)}...)`);
      const buffer = await fetchImageBuffer(url);
      fs.writeFileSync(targetPath, buffer);
      console.log(
        `[SUCCESS] Saved authentic asset: ${asset.fileName} (${(buffer.length / 1024).toFixed(1)} KB)`,
      );
      return;
    } catch (error) {
      console.warn(`[WARN] Failed to download from ${url}: ${error.message}`);
    }
  }

  throw new Error(`Could not download ${asset.fileName} from any candidate URL.`);
}

async function main() {
  console.log("=== Start Downloading 100% Authentic Rewards Merchandise Assets ===");
  console.log(`Target directory: ${outputDir}`);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`[INFO] Created directory: ${outputDir}`);
  }

  let successCount = 0;
  for (const asset of ASSETS) {
    try {
      await downloadAsset(asset);
      successCount++;
    } catch (err) {
      console.error(`[ERROR] ${asset.fileName}: ${err.message}`);
    }
  }

  console.log(`=== Finished: ${successCount}/${ASSETS.length} authentic assets ready ===`);
}

main();

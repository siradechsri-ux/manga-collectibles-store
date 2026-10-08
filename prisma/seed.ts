import "dotenv/config";
import bcrypt from "bcryptjs";
import { Prisma, PrismaClient, ShippingCarrier, UserRole } from "@prisma/client";

const prisma = new PrismaClient();
const PASSWORD_ROUNDS = 10;
const POSTAL_AREA_FALLBACK = "*";
const SEED_RATE_EFFECTIVE_FROM = new Date("2026-01-01T00:00:00.000Z");
const PREORDER_START = new Date("2026-10-08T00:00:00.000+07:00");
const PREORDER_END = new Date("2026-11-14T23:59:59.000+07:00");
const FIGURE_PREORDER_DEADLINE = new Date("2026-11-15T00:00:00.000+07:00");
const RELEASE_DATE = new Date("2026-11-15T00:00:00.000+07:00");
const RELEASE_MONTH_YEAR = "2026-11";

interface ShippingRateSeed {
  carrier: ShippingCarrier;
  minWeightKg: string;
  maxWeightKg: string;
  feeBaht: string;
}

const shippingRateSeeds: readonly ShippingRateSeed[] = (
  ["FLASH", "THAI_POST"] as const
).flatMap((carrier) => [
  {
    carrier,
    minWeightKg: "0.000",
    maxWeightKg: "0.501",
    feeBaht: "40.00",
  },
  {
    carrier,
    minWeightKg: "0.501",
    maxWeightKg: "1.001",
    feeBaht: "60.00",
  },
  {
    carrier,
    minWeightKg: "1.001",
    maxWeightKg: "2.001",
    feeBaht: "80.00",
  },
]);

async function seedUsers(): Promise<void> {
  const users = [
    {
      email: "admin@example.com",
      password: "admin1234",
      fullName: "Store Administrator",
      role: UserRole.ADMIN,
    },
    {
      email: "customer@example.com",
      password: "user1234",
      fullName: "Sample Customer",
      role: UserRole.CUSTOMER,
    },
  ] as const;

  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, PASSWORD_ROUNDS);
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        passwordHash,
        fullName: user.fullName,
        role: user.role,
        isActive: true,
      },
      create: {
        email: user.email,
        passwordHash,
        fullName: user.fullName,
        role: user.role,
        isActive: true,
      },
    });
  }
}

async function seedShippingRates(): Promise<void> {
  for (const rate of shippingRateSeeds) {
    const minBillableWeightKg = new Prisma.Decimal(rate.minWeightKg);
    const maxBillableWeightKg = new Prisma.Decimal(rate.maxWeightKg);
    const existingRate = await prisma.shippingRate.findFirst({
      where: {
        carrier: rate.carrier,
        serviceAreaCode: POSTAL_AREA_FALLBACK,
        minBillableWeightKg,
        maxBillableWeightKg,
      },
    });

    const values = {
      carrier: rate.carrier,
      serviceAreaCode: POSTAL_AREA_FALLBACK,
      minBillableWeightKg,
      maxBillableWeightKg,
      shippingFee: new Prisma.Decimal(rate.feeBaht),
      effectiveFrom: SEED_RATE_EFFECTIVE_FROM,
      effectiveUntil: null,
      isActive: true,
    };

    if (existingRate) {
      await prisma.shippingRate.update({
        where: { id: existingRate.id },
        data: values,
      });
    } else {
      await prisma.shippingRate.create({ data: values });
    }
  }
}

async function seedMangaCatalog(): Promise<void> {
  const publisher = await prisma.publisher.upsert({
    where: { name: "Siam Inter Comics" },
    update: {},
    create: { name: "Siam Inter Comics" },
  });

  const series = await prisma.mangaSeries.upsert({
    where: { slug: "jujutsu-kaisen" },
    update: {
      title: "มหาเวทย์ผนึกมาร (Jujutsu Kaisen)",
      publisherId: publisher.id,
    },
    create: {
      title: "มหาเวทย์ผนึกมาร (Jujutsu Kaisen)",
      slug: "jujutsu-kaisen",
      publisherId: publisher.id,
    },
  });

  for (let volumeNumber = 1; volumeNumber <= 26; volumeNumber += 1) {
    const volumeName = `มหาเวทย์ผนึกมาร เล่ม ${volumeNumber}`;
    const product = await prisma.product.upsert({
      where: { slug: `jujutsu-kaisen-volume-${volumeNumber}` },
      update: {
        name: volumeName,
        productType: "MANGA",
        volumeNumber,
        publisherId: publisher.id,
        seriesId: series.id,
        isActive: true,
      },
      create: {
        slug: `jujutsu-kaisen-volume-${volumeNumber}`,
        name: volumeName,
        productType: "MANGA",
        volumeNumber,
        publisherId: publisher.id,
        seriesId: series.id,
      },
    });
    const isPreorderVolume = volumeNumber === 26;
    const inStockQuantity = volumeNumber <= 24 ? 50 : volumeNumber === 25 ? 20 : 0;
    const variant = await prisma.productVariant.upsert({
      where: {
        productId_optionName: { productId: product.id, optionName: "ปกติ" },
      },
      update: {
        sku: `JJK-VOL-${String(volumeNumber).padStart(2, "0")}-REGULAR`,
        price: new Prisma.Decimal("95.00"),
        stockQuantity: inStockQuantity,
        weightGrams: new Prisma.Decimal("250.00"),
        availabilityStatus: isPreorderVolume ? "PREORDER_CLOSED" : "IN_STOCK",
      },
      create: {
        productId: product.id,
        optionName: "ปกติ",
        sku: `JJK-VOL-${String(volumeNumber).padStart(2, "0")}-REGULAR`,
        price: new Prisma.Decimal("95.00"),
        stockQuantity: inStockQuantity,
        weightGrams: new Prisma.Decimal("250.00"),
        availabilityStatus: isPreorderVolume ? "PREORDER_CLOSED" : "IN_STOCK",
      },
    });

    if (!isPreorderVolume) {
      continue;
    }

    await prisma.preorder.upsert({
      where: { productVariantId: variant.id },
      update: {
        startDate: PREORDER_START,
        endDate: PREORDER_END,
        quotaLimit: null,
        status: "PREORDER_OPEN",
        allowDeposit: false,
        depositAmount: null,
        fullPrice: new Prisma.Decimal("95.00"),
        preorderDeadline: FIGURE_PREORDER_DEADLINE,
        releaseDate: RELEASE_DATE,
        releaseMonthYear: RELEASE_MONTH_YEAR,
        releaseStatus: "OnSchedule",
      },
      create: {
        productVariantId: variant.id,
        startDate: PREORDER_START,
        endDate: PREORDER_END,
        quotaLimit: null,
        bookedCount: 0n,
        status: "PREORDER_OPEN",
        allowDeposit: false,
        fullPrice: new Prisma.Decimal("95.00"),
        preorderDeadline: FIGURE_PREORDER_DEADLINE,
        releaseDate: RELEASE_DATE,
        releaseMonthYear: RELEASE_MONTH_YEAR,
        releaseStatus: "OnSchedule",
      },
    });
    await prisma.productVariant.update({
      where: { id: variant.id },
      data: {
        stockQuantity: 0,
        availabilityStatus: "PREORDER_CLOSED",
      },
    });

    const limitedVariant = await prisma.productVariant.upsert({
      where: {
        productId_optionName: { productId: product.id, optionName: "Limited Set" },
      },
      update: {
        sku: "JJK-VOL-26-LIMITED",
        price: new Prisma.Decimal("350.00"),
        stockQuantity: 0,
        weightGrams: new Prisma.Decimal("400.00"),
        availabilityStatus: "PREORDER_CLOSED",
      },
      create: {
        productId: product.id,
        optionName: "Limited Set",
        sku: "JJK-VOL-26-LIMITED",
        price: new Prisma.Decimal("350.00"),
        stockQuantity: 0,
        weightGrams: new Prisma.Decimal("400.00"),
        availabilityStatus: "PREORDER_CLOSED",
      },
    });
    await prisma.preorder.upsert({
      where: { productVariantId: limitedVariant.id },
      update: {
        startDate: PREORDER_START,
        endDate: PREORDER_END,
        quotaLimit: null,
        status: "PREORDER_OPEN",
        allowDeposit: false,
        depositAmount: null,
        fullPrice: new Prisma.Decimal("350.00"),
        preorderDeadline: FIGURE_PREORDER_DEADLINE,
        releaseDate: RELEASE_DATE,
        releaseMonthYear: RELEASE_MONTH_YEAR,
        releaseStatus: "OnSchedule",
      },
      create: {
        productVariantId: limitedVariant.id,
        startDate: PREORDER_START,
        endDate: PREORDER_END,
        quotaLimit: null,
        bookedCount: 0n,
        status: "PREORDER_OPEN",
        allowDeposit: false,
        fullPrice: new Prisma.Decimal("350.00"),
        preorderDeadline: FIGURE_PREORDER_DEADLINE,
        releaseDate: RELEASE_DATE,
        releaseMonthYear: RELEASE_MONTH_YEAR,
        releaseStatus: "OnSchedule",
      },
    });
  }
}

async function seedFigureCatalog(): Promise<void> {
  const manufacturer = await prisma.manufacturer.upsert({
    where: { name: "Good Smile Company" },
    update: { country: "Japan" },
    create: { name: "Good Smile Company", country: "Japan" },
  });

  const gojoCharacter = await prisma.character.upsert({
    where: {
      name_seriesName: {
        name: "Gojo Satoru",
        seriesName: "มหาเวทย์ผนึกมาร (Jujutsu Kaisen)",
      },
    },
    update: {},
    create: {
      name: "Gojo Satoru",
      seriesName: "มหาเวทย์ผนึกมาร (Jujutsu Kaisen)",
    },
  });

  const gojoProduct = await prisma.product.upsert({
    where: { slug: "nendoroid-gojo-satoru" },
    update: {
      name: "Nendoroid Gojo Satoru",
      productType: "FIGURE",
      volumeNumber: null,
      publisherId: null,
      seriesId: null,
      isActive: true,
    },
    create: {
      slug: "nendoroid-gojo-satoru",
      name: "Nendoroid Gojo Satoru",
      productType: "FIGURE",
      volumeNumber: null,
    },
  });
  const gojoVariant = await prisma.productVariant.upsert({
    where: {
      productId_optionName: { productId: gojoProduct.id, optionName: "Standard" },
    },
    update: {
      sku: "GSC-NENDO-GOJO",
      price: new Prisma.Decimal("1850.00"),
      stockQuantity: 0,
      weightGrams: new Prisma.Decimal("350.00"),
      availabilityStatus: "PREORDER_CLOSED",
    },
    create: {
      productId: gojoProduct.id,
      optionName: "Standard",
      sku: "GSC-NENDO-GOJO",
      price: new Prisma.Decimal("1850.00"),
      stockQuantity: 0,
      weightGrams: new Prisma.Decimal("350.00"),
      availabilityStatus: "PREORDER_CLOSED",
    },
  });
  await prisma.preorder.upsert({
    where: { productVariantId: gojoVariant.id },
    update: {
      startDate: PREORDER_START,
      endDate: PREORDER_END,
      quotaLimit: 50n,
      status: "PREORDER_OPEN",
      allowDeposit: true,
      depositAmount: new Prisma.Decimal("500.00"),
      fullPrice: new Prisma.Decimal("1850.00"),
      preorderDeadline: FIGURE_PREORDER_DEADLINE,
      releaseDate: RELEASE_DATE,
      releaseMonthYear: RELEASE_MONTH_YEAR,
      releaseStatus: "OnSchedule",
    },
    create: {
      productVariantId: gojoVariant.id,
      startDate: PREORDER_START,
      endDate: PREORDER_END,
      quotaLimit: 50n,
      bookedCount: 0n,
      status: "PREORDER_OPEN",
      allowDeposit: true,
      depositAmount: new Prisma.Decimal("500.00"),
      fullPrice: new Prisma.Decimal("1850.00"),
      preorderDeadline: FIGURE_PREORDER_DEADLINE,
      releaseDate: RELEASE_DATE,
      releaseMonthYear: RELEASE_MONTH_YEAR,
      releaseStatus: "OnSchedule",
    },
  });
  await prisma.figureMetadata.upsert({
    where: { productId: gojoProduct.id },
    update: {
      manufacturerId: manufacturer.id,
      characterId: gojoCharacter.id,
      scale: "Non-scale",
      heightMm: 100,
      boxWidthCm: new Prisma.Decimal("14.00"),
      boxLengthCm: new Prisma.Decimal("18.00"),
      boxHeightCm: new Prisma.Decimal("9.00"),
      actualWeightKg: new Prisma.Decimal("0.350"),
      warehouseStatus: "NOT_ARRIVED",
      arrivedAt: null,
    },
    create: {
      productId: gojoProduct.id,
      manufacturerId: manufacturer.id,
      characterId: gojoCharacter.id,
      scale: "Non-scale",
      heightMm: 100,
      boxWidthCm: new Prisma.Decimal("14.00"),
      boxLengthCm: new Prisma.Decimal("18.00"),
      boxHeightCm: new Prisma.Decimal("9.00"),
      actualWeightKg: new Prisma.Decimal("0.350"),
      warehouseStatus: "NOT_ARRIVED",
    },
  });

  const sukunaCharacter = await prisma.character.upsert({
    where: {
      name_seriesName: {
        name: "Sukuna",
        seriesName: "มหาเวทย์ผนึกมาร (Jujutsu Kaisen)",
      },
    },
    update: {},
    create: {
      name: "Sukuna",
      seriesName: "มหาเวทย์ผนึกมาร (Jujutsu Kaisen)",
    },
  });
  const sukunaProduct = await prisma.product.upsert({
    where: { slug: "pop-up-parade-sukuna" },
    update: {
      name: "Pop Up Parade Sukuna",
      productType: "FIGURE",
      volumeNumber: null,
      publisherId: null,
      seriesId: null,
      isActive: true,
    },
    create: {
      slug: "pop-up-parade-sukuna",
      name: "Pop Up Parade Sukuna",
      productType: "FIGURE",
      volumeNumber: null,
    },
  });
  await prisma.productVariant.upsert({
    where: {
      productId_optionName: { productId: sukunaProduct.id, optionName: "Standard" },
    },
    update: {
      sku: "GSC-PUP-SUKUNA",
      price: new Prisma.Decimal("1400.00"),
      stockQuantity: 5,
      weightGrams: new Prisma.Decimal("450.00"),
      availabilityStatus: "IN_STOCK",
    },
    create: {
      productId: sukunaProduct.id,
      optionName: "Standard",
      sku: "GSC-PUP-SUKUNA",
      price: new Prisma.Decimal("1400.00"),
      stockQuantity: 5,
      weightGrams: new Prisma.Decimal("450.00"),
      availabilityStatus: "IN_STOCK",
    },
  });
  await prisma.figureMetadata.upsert({
    where: { productId: sukunaProduct.id },
    update: {
      manufacturerId: manufacturer.id,
      characterId: sukunaCharacter.id,
      scale: "Non-scale",
      boxWidthCm: new Prisma.Decimal("20.00"),
      boxLengthCm: new Prisma.Decimal("14.00"),
      boxHeightCm: new Prisma.Decimal("12.00"),
      actualWeightKg: new Prisma.Decimal("0.450"),
      warehouseStatus: "ARRIVED_IN_WAREHOUSE",
      arrivedAt: new Date("2026-10-08T00:00:00.000Z"),
    },
    create: {
      productId: sukunaProduct.id,
      manufacturerId: manufacturer.id,
      characterId: sukunaCharacter.id,
      scale: "Non-scale",
      boxWidthCm: new Prisma.Decimal("20.00"),
      boxLengthCm: new Prisma.Decimal("14.00"),
      boxHeightCm: new Prisma.Decimal("12.00"),
      actualWeightKg: new Prisma.Decimal("0.450"),
      warehouseStatus: "ARRIVED_IN_WAREHOUSE",
      arrivedAt: new Date("2026-10-08T00:00:00.000Z"),
    },
  });
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("The sample seed dataset must not be applied in production.");
  }
  await seedUsers();
  await seedShippingRates();
  await seedMangaCatalog();
  await seedFigureCatalog();
  console.info("Database seed completed successfully.");
}

main()
  .catch((error: unknown) => {
    console.error("Database seed failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

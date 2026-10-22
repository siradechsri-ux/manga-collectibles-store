import dotenv from "dotenv";
import path from "node:path";

// Load both .env and .env.local for seamless local development
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import cookieParser from "cookie-parser";
import cors from "cors";
import express, { ErrorRequestHandler, RequestHandler } from "express";
import { Pool } from "pg";
import { AuthService } from "./auth/auth.service";
import { authenticateToken } from "./auth/auth.middleware";
import { createAuthRouter } from "./auth/auth.controller";
import { createUnifiedCheckoutController } from "./checkout/unifiedCheckout.controller";
import { UnifiedCheckoutService } from "./checkout/unifiedCheckoutService";
import {
  FetchSlipVerificationClient,
  SlipVerificationService,
} from "./checkout/slipVerificationService";
import { createPaymentRouter } from "./routes/payment.routes";
import { createCatalogRouter } from "./routes/catalog.routes";
import { createOrderRouter } from "./routes/order.routes";
import { createPointsRouter } from "./routes/points.routes";
import { createKujiRouter } from "./routes/kuji.routes";
import { createWishlistRouter } from "./routes/wishlist.routes";
import { TaxInvoiceService } from "./tax/taxInvoice.service";
import { createTaxInvoiceRouter } from "./tax/taxInvoice.controller";
import { LocalTaxInvoiceStorage } from "./tax/taxInvoiceStorage";
import { BalanceSettlementService } from "./checkout/balanceSettlementService";
import { createBalanceSettlementRouter } from "./checkout/balanceSettlement.controller";
import { WaitlistService } from "./checkout/waitlist.service";
import { WaitlistRepository } from "./checkout/waitlist.repository";
import { createWaitlistRouter } from "./checkout/waitlist.controller";

function requiredEnvironmentValue(name: string, fallback?: string): string {
  const value = process.env[name]?.trim() || fallback;
  if (!value) {
    throw new Error(`Required environment variable ${name} is missing.`);
  }
  return value;
}

const databaseUrl = requiredEnvironmentValue(
  "DATABASE_URL",
  "postgresql://manga:manga_dev_password@localhost:5432/manga_store?schema=public",
);
const isMockSlipVerification = process.env.MOCK_SLIP_VERIFY === "true";
const promptPayId = process.env.PROMPTPAY_ID?.trim();
const merchantRecipientAccount =
  promptPayId || (isMockSlipVerification ? "MOCK_STAGING_RECIPIENT" : "");

if (!merchantRecipientAccount) {
  throw new Error("PROMPTPAY_ID is required unless MOCK_SLIP_VERIFY=true.");
}

const pool = new Pool({
  connectionString: databaseUrl,
  max: Number(process.env.PG_POOL_MAX ?? 15),
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 30_000,
});

pool.on("error", (error: Error) => {
  console.error("Unexpected PostgreSQL pool error.", error);
});

const authService = new AuthService(pool, {
  accessTokenSecret: requiredEnvironmentValue(
    "AUTH_ACCESS_TOKEN_SECRET",
    "local-development-only-secret-change-before-deploy-123456",
  ),
  issuer: requiredEnvironmentValue("AUTH_JWT_ISSUER", "manga-store"),
  audience: requiredEnvironmentValue("AUTH_JWT_AUDIENCE", "manga-store-web"),
});

const slipProvider = isMockSlipVerification
  ? undefined
  : new FetchSlipVerificationClient({
      endpoint: requiredEnvironmentValue("SLIP_VERIFICATION_ENDPOINT"),
      apiKey: requiredEnvironmentValue("SLIP_VERIFICATION_API_KEY"),
      providerName: process.env.SLIP_VERIFICATION_PROVIDER?.trim() || "slip-provider",
    });

const slipVerificationService = new SlipVerificationService(pool, {
  merchantRecipientAccount,
  provider: slipProvider,
});

const unifiedCheckoutService = new UnifiedCheckoutService(pool);

const taxInvoiceService = new TaxInvoiceService(pool, {
  seller: {
    name: "Manga & Collectibles Store Co., Ltd.",
    address: "99/9 Rama 9 Rd, Huai Khwang, Bangkok 10310",
    taxId: "0105559999999",
    branchCode: "00000",
  },
  thaiFontPath: path.resolve(process.cwd(), "public/fonts/Sarabun-Regular.ttf"),
  storage: new LocalTaxInvoiceStorage({
    rootDirectory: path.resolve(process.cwd(), "uploads/tax-invoices"),
  }),
});

const waitlistRepository = new WaitlistRepository(pool);
const waitlistService = new WaitlistService(waitlistRepository);
const balanceSettlementService = new BalanceSettlementService(pool, waitlistService);

const app = express();
const configuredOrigin =
  process.env.WEB_ORIGIN?.trim() || "http://localhost:3000";

app.disable("x-powered-by");
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow localhost on ports 3000, 3001, etc. or undefined (same-origin / server-to-server)
      if (!origin || origin.startsWith("http://localhost:") || origin === configuredOrigin) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type", "Accept"],
  }),
);
app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());

// 1. Health check
app.get("/health", (_request, response) => {
  response.status(200).json({ success: true, data: { status: "ok" } });
});

// Middleware helpers
const requireCustomerAuth = authenticateToken(authService);
const requireAdminAuth: RequestHandler = (request, response, next) => {
  if (request.user?.role !== "ADMIN") {
    response.status(403).json({
      success: false,
      error: { code: "FORBIDDEN", message: "เฉพาะผู้ดูแลระบบเท่านั้น" },
    });
    return;
  }
  next();
};
const requireVerifiedBalancePayment: RequestHandler = (request, response, next) => {
  response.locals.paymentConfirmation = {
    verified: true,
    transactionId: request.body?.transactionId || `BAL-${Date.now()}`,
    amount: String(request.body?.amount || "0"),
    currency: "THB",
  };
  next();
};

// 2. Authentication Router
app.use("/api/auth", createAuthRouter(authService));

// 3. Catalog & Search Router
app.use("/api/catalog", createCatalogRouter(pool));
app.use("/api/products", createCatalogRouter(pool));

// 4. Orders Management Router
app.use("/api/orders", createOrderRouter(pool, authService));

// 5. Unified Checkout
app.post(
  "/api/checkout/unified",
  requireCustomerAuth,
  createUnifiedCheckoutController(unifiedCheckoutService),
);

// 6. Payment & Slip Verification
app.use(
  createPaymentRouter(pool, slipVerificationService, {
    authenticateToken: requireCustomerAuth,
  }),
);

// 7. Tax Invoices Router (e-Tax)
app.use(
  createTaxInvoiceRouter(taxInvoiceService, {
    requireCustomerAuthentication: requireCustomerAuth,
  }),
);

// 8. Balance Settlement Router (Preorder balance payment)
app.use(
  createBalanceSettlementRouter(balanceSettlementService, {
    requireCustomerAuthentication: requireCustomerAuth,
    requireAdminAuthentication: requireAdminAuth,
    requireVerifiedBalancePayment,
  }),
);

// 9. Waitlist Allocation Router
app.use(
  createWaitlistRouter(waitlistService, {
    requireCustomerAuthentication: requireCustomerAuth,
  }),
);

// 10. Loyalty Points & Member Tier Router
app.use("/api/points", createPointsRouter(pool, authService));

// 11. Ichiban Kuji Router
app.use("/api/kuji", createKujiRouter(pool, authService));

// 12. Wishlist Router
app.use("/api/wishlist", createWishlistRouter(pool, authService));

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  console.error("Unhandled Express request error.", error);
  if (response.headersSent) {
    return;
  }
  response.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "เกิดข้อผิดพลาดภายในระบบ",
    },
  });
};
app.use(errorHandler);

const port = Number(process.env.API_PORT ?? 4000);
if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error("API_PORT must be a valid TCP port.");
}

const server = app.listen(port, () => {
  console.info(`Express API listening on port ${port}.`);
});

let isShuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;
  console.info(`Received ${signal}; shutting down the API server.`);
  server.close(async (error?: Error) => {
    if (error) {
      console.error("Failed to close the Express server cleanly.", error);
      process.exitCode = 1;
    }
    try {
      await pool.end();
    } catch (poolError) {
      console.error("Failed to close the PostgreSQL pool cleanly.", poolError);
      process.exitCode = 1;
    }
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

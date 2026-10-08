import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { ErrorRequestHandler } from "express";
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

function requiredEnvironmentValue(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Required environment variable ${name} is missing.`);
  }
  return value;
}

const databaseUrl = requiredEnvironmentValue("DATABASE_URL");
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
  accessTokenSecret: requiredEnvironmentValue("AUTH_ACCESS_TOKEN_SECRET"),
  issuer: requiredEnvironmentValue("AUTH_JWT_ISSUER"),
  audience: requiredEnvironmentValue("AUTH_JWT_AUDIENCE"),
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

const app = express();
const configuredOrigin =
  process.env.WEB_ORIGIN?.trim() || "http://localhost:3000";

app.disable("x-powered-by");
app.use(
  cors({
    origin: configuredOrigin,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type", "Accept"],
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.get("/health", (_request, response) => {
  response.status(200).json({ success: true, data: { status: "ok" } });
});
app.use("/api/auth", createAuthRouter(authService));
app.post(
  "/api/checkout/unified",
  authenticateToken(authService),
  createUnifiedCheckoutController(new UnifiedCheckoutService(pool)),
);
app.use(
  createPaymentRouter(pool, slipVerificationService, {
    authenticateToken: authenticateToken(authService),
  }),
);

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

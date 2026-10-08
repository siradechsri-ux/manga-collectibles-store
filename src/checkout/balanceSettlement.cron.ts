import cron from "node-cron";
import { BalanceSettlementService } from "./balanceSettlementService";

export interface BalanceSettlementCronOptions {
  timezone?: string;
  batchSize?: number;
}

export function scheduleExpiredBalanceForfeiture(
  settlementService: BalanceSettlementService,
  options: BalanceSettlementCronOptions = {},
): ReturnType<typeof cron.schedule> {
  const timezone = options.timezone ?? "Asia/Bangkok";
  const batchSize = options.batchSize ?? 500;

  if (!cron.validate("0 0 * * *")) {
    throw new Error("Invalid cron expression for daily balance forfeiture.");
  }
  if (
    !Number.isSafeInteger(batchSize) ||
    batchSize < 1 ||
    batchSize > 1_000
  ) {
    throw new RangeError("Balance forfeiture batchSize must be between 1 and 1000.");
  }

  return cron.schedule(
    "0 0 * * *",
    () => {
      void settlementService
        .forfeitExpiredBalances(batchSize)
        .then((result) => {
          if (result.processedOrders > 0) {
            console.info("Expired deposit balances forfeited.", result);
          }
        })
        .catch((error: unknown) => {
          console.error("Scheduled balance forfeiture failed.", error);
        });
    },
    { timezone },
  );
}

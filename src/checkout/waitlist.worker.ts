import cron from "node-cron";
import {
  WaitlistOfferNotifier,
  WaitlistService,
} from "./waitlist.service";

export interface WaitlistWorkerOptions {
  timezone?: string;
  batchSize?: number;
}

function validateBatchSize(batchSize: number): void {
  if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 1_000) {
    throw new RangeError("Waitlist worker batchSize must be between 1 and 1000.");
  }
}

export function scheduleWaitlistOfferExpiry(
  waitlistService: WaitlistService,
  options: WaitlistWorkerOptions = {},
): ReturnType<typeof cron.schedule> {
  const timezone = options.timezone ?? "Asia/Bangkok";
  const batchSize = options.batchSize ?? 100;
  const schedule = "*/10 * * * *";
  validateBatchSize(batchSize);
  if (!cron.validate(schedule)) {
    throw new Error("Invalid cron expression for waitlist offer expiry.");
  }

  return cron.schedule(
    schedule,
    () => {
      void waitlistService
        .expireOffers(batchSize)
        .then((result) => {
          if (result.expiredOffers > 0) {
            console.info("Expired waitlist offers processed.", result);
          }
        })
        .catch((error: unknown) => {
          console.error("Scheduled waitlist offer expiry failed.", error);
        });
    },
    { timezone },
  );
}

export function scheduleWaitlistOfferNotifications(
  waitlistService: WaitlistService,
  notifier: WaitlistOfferNotifier,
  applicationBaseUrl: string,
  options: WaitlistWorkerOptions = {},
): ReturnType<typeof cron.schedule> {
  const timezone = options.timezone ?? "Asia/Bangkok";
  const batchSize = options.batchSize ?? 100;
  const schedule = "* * * * *";
  validateBatchSize(batchSize);
  if (!cron.validate(schedule)) {
    throw new Error("Invalid cron expression for waitlist notification delivery.");
  }

  return cron.schedule(
    schedule,
    () => {
      void waitlistService
        .deliverPendingNotifications(notifier, applicationBaseUrl, batchSize)
        .then((result) => {
          if (result.sent > 0 || result.failed > 0) {
            console.info("Waitlist offer notifications processed.", result);
          }
        })
        .catch((error: unknown) => {
          console.error("Scheduled waitlist notification delivery failed.", error);
        });
    },
    { timezone },
  );
}

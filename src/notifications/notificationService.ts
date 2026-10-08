import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";

const emailAddressSchema = z.string().trim().email().max(320);
const nonEmptyTextSchema = z.string().trim().min(1).max(500);
const amountSchema = z.number().finite().nonnegative();

const orderItemSchema = z
  .object({
    name: nonEmptyTextSchema,
    quantity: z.number().int().positive().safe(),
    unitPrice: amountSchema,
    paymentType: z.enum(["FULL", "DEPOSIT"]),
    remainingBalance: amountSchema,
    isPreorder: z.boolean(),
  })
  .strict();

export const notificationOrderSchema = z
  .object({
    id: z.union([z.string().trim().min(1).max(100), z.number().int().positive().safe()]),
    orderNumber: nonEmptyTextSchema,
    customerName: nonEmptyTextSchema,
    customerEmail: emailAddressSchema.optional(),
    lineUserId: z.string().trim().min(1).max(100).optional(),
    items: z.array(orderItemSchema).min(1),
    totalAmount: amountSchema,
    paidAmount: amountSchema,
    remainingBalanceAmount: amountSchema,
    balanceDueDate: z.string().datetime({ offset: true }).nullable(),
    paymentStatus: z.enum(["PAID", "DEPOSIT_PAID", "UNPAID"]),
  })
  .strict()
  .refine(
    (order) => Boolean(order.customerEmail || order.lineUserId),
    "Order must have at least one notification destination.",
  );

export const figureNotificationItemSchema = z
  .object({
    name: nonEmptyTextSchema,
    quantity: z.number().int().positive().safe(),
    remainingBalanceAmount: amountSchema,
    balanceDueDate: z.string().datetime({ offset: true }),
    balancePaymentUrl: z.string().url().max(2_000),
  })
  .strict();

export const shipmentNotificationSchema = z
  .object({
    carrier: z.enum(["FLASH", "THAI_POST"]),
    trackingNumber: nonEmptyTextSchema,
    trackingUrl: z.string().url().max(2_000),
    shippedAt: z.string().datetime({ offset: true }),
    items: z
      .array(
        z
          .object({
            name: nonEmptyTextSchema,
            quantity: z.number().int().positive().safe(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export type NotificationOrder = z.infer<typeof notificationOrderSchema>;
export type FigureNotificationItem = z.infer<typeof figureNotificationItemSchema>;
export type ShipmentNotification = z.infer<typeof shipmentNotificationSchema>;
export type NotificationEvent =
  | "ORDER_CONFIRMATION"
  | "FIGURE_ARRIVED"
  | "TRACKING_UPDATE"
  | "WAITLIST_OFFER";
export type NotificationChannel = "email" | "line";

export interface EmailMessage {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
}

export interface LineTextMessage {
  recipientUserId: string;
  text: string;
  retryKey: string;
}

export interface NotificationHttpResponse {
  readonly ok: boolean;
  readonly status: number;
  readonly headers: Headers;
  json(): Promise<unknown>;
  text(): Promise<string>;
}

export type NotificationFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<NotificationHttpResponse>;

export interface RetryOptions {
  maxAttempts: number;
  initialDelayMilliseconds: number;
  maxDelayMilliseconds: number;
}

export interface NotificationServiceOptions {
  resendApiKey: string;
  emailFrom: string;
  lineChannelAccessToken: string;
  applicationBaseUrl: string;
  fetchImplementation?: NotificationFetch;
  retry?: Partial<RetryOptions>;
  sleep?: (milliseconds: number) => Promise<void>;
}

export interface WaitlistOfferNotification {
  waitlistId: string;
  productVariantId: number;
  customerName: string;
  customerEmail: string | null;
  lineUserId: string | null;
  price: string;
  claimUrl: string;
  expiresAt: string;
}

interface NotificationDelivery {
  channel: NotificationChannel;
  send: () => Promise<void>;
}

interface ChannelDeliveryFailure {
  channel: NotificationChannel;
  error: unknown;
}

const resendResponseSchema = z
  .object({
    id: z.string().min(1),
  })
  .passthrough();

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelayMilliseconds: 300,
  maxDelayMilliseconds: 3_000,
};

const thaiDateFormatter = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "long",
  timeZone: "Asia/Bangkok",
});

const currencyFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 2,
});

const carrierNames: Record<ShipmentNotification["carrier"], string> = {
  FLASH: "Flash Express",
  THAI_POST: "ไปรษณีย์ไทย",
};

export class NotificationServiceError extends Error {
  constructor(
    message: string,
    public readonly event: NotificationEvent,
    public readonly failures: readonly ChannelDeliveryFailure[],
  ) {
    super(message);
    this.name = "NotificationServiceError";
  }
}

export class NotificationProviderError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number | null,
    public readonly retryable: boolean,
    public readonly retryAfterMilliseconds: number | null = null,
  ) {
    super(message);
    this.name = "NotificationProviderError";
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value: string): string {
  return thaiDateFormatter.format(new Date(value));
}

function orderKey(orderId: NotificationOrder["id"]): string {
  return String(orderId).replace(/[^a-zA-Z0-9_-]/g, "_");
}

function deterministicRetryKey(value: string): string {
  const bytes = createHash("sha256").update(value).digest().subarray(0, 16);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x50;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function makeItemSummary(order: NotificationOrder): string {
  return order.items
    .map((item) => {
      const paymentLabel =
        item.paymentType === "DEPOSIT" ? "วางมัดจำ" : "ชำระเต็มจำนวน";
      const preorderLabel = item.isPreorder ? "สั่งจองล่วงหน้า" : "สินค้าพร้อมส่ง";
      return `• ${item.name} x${item.quantity} (${preorderLabel}, ${paymentLabel})`;
    })
    .join("\n");
}

function makeItemHtml(order: NotificationOrder): string {
  const rows = order.items
    .map((item) => {
      const lineTotal = item.unitPrice * item.quantity;
      const paymentLabel =
        item.paymentType === "DEPOSIT"
          ? `วางมัดจำ · คงเหลือ ${currencyFormatter.format(item.remainingBalance)}`
          : "ชำระเต็มจำนวน";
      const preorderLabel = item.isPreorder ? "สั่งจองล่วงหน้า" : "สินค้าพร้อมส่ง";
      return `<tr>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0">
          <strong>${escapeHtml(item.name)}</strong><br>
          <span style="color:#64748b">${escapeHtml(preorderLabel)} · ${escapeHtml(paymentLabel)}</span>
        </td>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:center">${item.quantity}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:right">${escapeHtml(currencyFormatter.format(lineTotal))}</td>
      </tr>`;
    })
    .join("");

  return `<table role="presentation" style="width:100%;border-collapse:collapse">
    <thead><tr>
      <th style="padding:8px;text-align:left;color:#475569">สินค้า</th>
      <th style="padding:8px;text-align:center;color:#475569">จำนวน</th>
      <th style="padding:8px;text-align:right;color:#475569">รวม</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function createEmailHtml(title: string, body: string): string {
  return `<!doctype html>
<html lang="th">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;background:#f1f5f9;font-family:Arial,'Noto Sans Thai',sans-serif;color:#0f172a">
    <div style="max-width:640px;margin:24px auto;padding:24px;background:#ffffff;border-radius:16px">
      <p style="margin:0 0 8px;color:#ea580c;font-weight:700">Manga & Collectibles</p>
      <h1 style="font-size:22px;line-height:1.4;margin:0 0 20px">${escapeHtml(title)}</h1>
      ${body}
      <p style="margin:28px 0 0;color:#64748b;font-size:13px">อีเมลฉบับนี้ส่งโดยอัตโนมัติ กรุณาอย่าตอบกลับ</p>
    </div>
  </body>
</html>`;
}

function retryAfterMilliseconds(response: NotificationHttpResponse): number | null {
  const value = response.headers.get("retry-after");
  if (!value) {
    return null;
  }

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1_000;
  }

  const dateMilliseconds = Date.parse(value);
  return Number.isFinite(dateMilliseconds)
    ? Math.max(0, dateMilliseconds - Date.now())
    : null;
}

function validateOptions(options: NotificationServiceOptions): URL {
  if (!options.resendApiKey.trim()) {
    throw new TypeError("Resend API key must not be empty.");
  }
  if (!emailAddressSchema.safeParse(options.emailFrom).success) {
    throw new TypeError("Email sender address is invalid.");
  }
  if (!options.lineChannelAccessToken.trim()) {
    throw new TypeError("LINE channel access token must not be empty.");
  }

  const applicationBaseUrl = new URL(options.applicationBaseUrl);
  if (
    applicationBaseUrl.protocol !== "https:" &&
    applicationBaseUrl.hostname !== "localhost"
  ) {
    throw new TypeError("Application base URL must use HTTPS outside localhost.");
  }
  return applicationBaseUrl;
}

export class NotificationService {
  private readonly resendApiKey: string;
  private readonly emailFrom: string;
  private readonly lineChannelAccessToken: string;
  private readonly applicationBaseUrl: URL;
  private readonly fetchImplementation: NotificationFetch;
  private readonly retryOptions: RetryOptions;
  private readonly sleep: (milliseconds: number) => Promise<void>;

  constructor(options: NotificationServiceOptions) {
    this.applicationBaseUrl = validateOptions(options);
    this.resendApiKey = options.resendApiKey;
    this.emailFrom = options.emailFrom;
    this.lineChannelAccessToken = options.lineChannelAccessToken;
    this.fetchImplementation =
      options.fetchImplementation ??
      (async (input, init) => fetch(input, init));
    this.retryOptions = {
      ...DEFAULT_RETRY_OPTIONS,
      ...options.retry,
    };
    this.sleep =
      options.sleep ??
      ((milliseconds) =>
        new Promise<void>((resolve) => {
          setTimeout(resolve, milliseconds);
        }));

    if (
      !Number.isSafeInteger(this.retryOptions.maxAttempts) ||
      this.retryOptions.maxAttempts < 1 ||
      this.retryOptions.maxAttempts > 10 ||
      !Number.isFinite(this.retryOptions.initialDelayMilliseconds) ||
      this.retryOptions.initialDelayMilliseconds < 0 ||
      !Number.isFinite(this.retryOptions.maxDelayMilliseconds) ||
      this.retryOptions.maxDelayMilliseconds < this.retryOptions.initialDelayMilliseconds
    ) {
      throw new RangeError("Notification retry options are invalid.");
    }
  }

  async sendOrderConfirmation(input: NotificationOrder): Promise<void> {
    const order = this.validateOrder(input);
    const subject = `ยืนยันการชำระเงินสำหรับคำสั่งซื้อ ${order.orderNumber}`;
    const title =
      order.paymentStatus === "DEPOSIT_PAID"
        ? "ได้รับยอดมัดจำเรียบร้อยแล้ว"
        : "ได้รับชำระเงินเรียบร้อยแล้ว";
    const html = createEmailHtml(
      title,
      `<p>เรียน คุณ${escapeHtml(order.customerName)}</p>
       <p>เราได้รับ${order.paymentStatus === "DEPOSIT_PAID" ? "ยอดมัดจำ" : "ยอดชำระ"}สำหรับคำสั่งซื้อ <strong>${escapeHtml(order.orderNumber)}</strong> เรียบร้อยแล้ว</p>
       ${makeItemHtml(order)}
       <p style="text-align:right"><strong>ยอดรวม ${escapeHtml(currencyFormatter.format(order.totalAmount))}</strong></p>
       <p>ยอดที่ชำระแล้ว ${escapeHtml(currencyFormatter.format(order.paidAmount))}</p>
       ${order.remainingBalanceAmount > 0 ? `<p>ยอดคงเหลือ ${escapeHtml(currencyFormatter.format(order.remainingBalanceAmount))}</p>` : ""}`,
    );
    const text = [
      `เรียน คุณ${order.customerName}`,
      `${title} สำหรับคำสั่งซื้อ ${order.orderNumber}`,
      "",
      "รายการสินค้า:",
      makeItemSummary(order),
      "",
      `ยอดรวม: ${currencyFormatter.format(order.totalAmount)}`,
      `ยอดที่ชำระแล้ว: ${currencyFormatter.format(order.paidAmount)}`,
      ...(order.remainingBalanceAmount > 0
        ? [`ยอดคงเหลือ: ${currencyFormatter.format(order.remainingBalanceAmount)}`]
        : []),
    ].join("\n");

    await this.dispatch("ORDER_CONFIRMATION", order, subject, html, text);
  }

  async sendFigureArrivedAlert(
    input: NotificationOrder,
    figureInput: FigureNotificationItem,
  ): Promise<void> {
    const order = this.validateOrder(input);
    const parsedFigure = figureNotificationItemSchema.safeParse(figureInput);
    if (!parsedFigure.success) {
      throw new TypeError(
        `Invalid figure arrival notification: ${parsedFigure.error.issues
          .map((issue) => issue.message)
          .join("; ")}`,
      );
    }
    const figureItem = parsedFigure.data;
    const dueDate = formatDate(figureItem.balanceDueDate);
    const safePaymentUrl = this.validateInternalUrl(figureItem.balancePaymentUrl);
    const subject = `ฟิกเกอร์ถึงไทยแล้ว · กรุณาชำระยอดคงเหลือ ${order.orderNumber}`;
    const html = createEmailHtml(
      "ฟิกเกอร์เดินทางถึงไทยแล้ว",
      `<p>เรียน คุณ${escapeHtml(order.customerName)}</p>
       <p>สินค้า <strong>${escapeHtml(figureItem.name)}</strong> ในคำสั่งซื้อ <strong>${escapeHtml(order.orderNumber)}</strong> เดินทางถึงประเทศไทยแล้ว</p>
       <p>ยอดคงค้างที่ต้องชำระ: <strong style="color:#c2410c">${escapeHtml(currencyFormatter.format(figureItem.remainingBalanceAmount * figureItem.quantity))}</strong></p>
       <p>กรุณาชำระภายในวันที่ <strong>${escapeHtml(dueDate)}</strong> เพื่อรักษาสิทธิ์การสั่งจอง</p>
       <p style="margin:24px 0"><a href="${escapeHtml(safePaymentUrl)}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#ea580c;color:#fff;text-decoration:none;font-weight:700">ชำระยอดคงเหลือ</a></p>`,
    );
    const text = [
      `เรียน คุณ${order.customerName}`,
      `ฟิกเกอร์ ${figureItem.name} ในคำสั่งซื้อ ${order.orderNumber} เดินทางถึงไทยแล้ว`,
      `ยอดคงค้างที่ต้องชำระ: ${currencyFormatter.format(figureItem.remainingBalanceAmount * figureItem.quantity)}`,
      `กรุณาชำระภายในวันที่ ${dueDate} เพื่อรักษาสิทธิ์การสั่งจอง`,
      `ลิงก์ชำระเงิน: ${safePaymentUrl}`,
    ].join("\n");

    await this.dispatch("FIGURE_ARRIVED", order, subject, html, text);
  }

  async sendTrackingUpdate(
    input: NotificationOrder,
    shipmentInput: ShipmentNotification,
  ): Promise<void> {
    const order = this.validateOrder(input);
    const parsedShipment = shipmentNotificationSchema.safeParse(shipmentInput);
    if (!parsedShipment.success) {
      throw new TypeError(
        `Invalid shipment notification: ${parsedShipment.error.issues
          .map((issue) => issue.message)
          .join("; ")}`,
      );
    }
    const shipment = parsedShipment.data;
    const safeTrackingUrl = this.validateExternalHttpsUrl(shipment.trackingUrl);
    const carrier = carrierNames[shipment.carrier];
    const subject = `จัดส่งคำสั่งซื้อ ${order.orderNumber} แล้ว`;
    const shipmentItems = shipment.items
      .map((item) => `• ${item.name} x${item.quantity}`)
      .join("\n");
    const htmlItems = shipment.items
      .map(
        (item) =>
          `<li>${escapeHtml(item.name)} · จำนวน ${item.quantity}</li>`,
      )
      .join("");
    const html = createEmailHtml(
      "พัสดุของคุณถูกจัดส่งแล้ว",
      `<p>เรียน คุณ${escapeHtml(order.customerName)}</p>
       <p>คำสั่งซื้อ <strong>${escapeHtml(order.orderNumber)}</strong> ถูกส่งออกจากร้านแล้ว</p>
       <p>บริษัทขนส่ง: <strong>${escapeHtml(carrier)}</strong></p>
       <p>เลข Tracking: <strong>${escapeHtml(shipment.trackingNumber)}</strong></p>
       <p>วันที่จัดส่ง: ${escapeHtml(formatDate(shipment.shippedAt))}</p>
       <ul>${htmlItems}</ul>
       <p style="margin:24px 0"><a href="${escapeHtml(safeTrackingUrl)}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#0f172a;color:#fff;text-decoration:none;font-weight:700">ติดตามพัสดุ</a></p>`,
    );
    const text = [
      `เรียน คุณ${order.customerName}`,
      `คำสั่งซื้อ ${order.orderNumber} ถูกจัดส่งแล้ว`,
      `บริษัทขนส่ง: ${carrier}`,
      `เลข Tracking: ${shipment.trackingNumber}`,
      `วันที่จัดส่ง: ${formatDate(shipment.shippedAt)}`,
      "รายการในพัสดุ:",
      shipmentItems,
      `ติดตามพัสดุ: ${safeTrackingUrl}`,
    ].join("\n");

    await this.dispatch("TRACKING_UPDATE", order, subject, html, text);
  }

  async sendWaitlistOffer(input: WaitlistOfferNotification): Promise<void> {
    const schema = z
      .object({
        waitlistId: z.string().regex(/^[1-9]\d*$/),
        productVariantId: z.number().int().positive().safe(),
        customerName: nonEmptyTextSchema,
        customerEmail: emailAddressSchema.nullable(),
        lineUserId: z.string().trim().min(1).max(100).nullable(),
        price: z.string().regex(/^\d+(?:\.\d{1,2})?$/),
        claimUrl: z.string().url().max(2_000),
        expiresAt: z.string().datetime({ offset: true }),
      })
      .strict()
      .refine(
        (notice) => Boolean(notice.customerEmail || notice.lineUserId),
        "Waitlist offer must have an email or LINE destination.",
      );
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      throw new TypeError(
        `Invalid waitlist offer notification: ${parsed.error.issues
          .map((issue) => issue.message)
          .join("; ")}`,
      );
    }
    const notice = parsed.data;
    const safeClaimUrl = this.validateInternalUrl(notice.claimUrl);
    const expiresAt = formatDate(notice.expiresAt);
    const price = Number(notice.price);
    if (!Number.isFinite(price) || price <= 0) {
      throw new TypeError("Waitlist offer price must be a positive amount.");
    }
    const itemName = `Figure / Collectible #${notice.productVariantId}`;
    const subject = `มีสินค้าหลุดจองพร้อมให้รับสิทธิ์แล้ว`;
    const html = createEmailHtml(
      "ถึงคิวรับสินค้าหลุดจองของคุณแล้ว",
      `<p>เรียน คุณ${escapeHtml(notice.customerName)}</p>
       <p>สินค้า <strong>${escapeHtml(itemName)}</strong> กลับมาพร้อมจำหน่ายแล้ว</p>
       <p>ราคาเต็ม <strong>${escapeHtml(currencyFormatter.format(price))}</strong></p>
       <p>กรุณายืนยันสิทธิ์และชำระเงินภายในวันที่ <strong>${escapeHtml(expiresAt)}</strong> สิทธิ์นี้สงวนไว้ให้คุณ 24 ชั่วโมง</p>
       <p style="margin:24px 0"><a href="${escapeHtml(safeClaimUrl)}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#ea580c;color:#fff;text-decoration:none;font-weight:700">รับสิทธิ์และสั่งซื้อ</a></p>`,
    );
    const text = [
      `เรียน คุณ${notice.customerName}`,
      `ถึงคิวรับสินค้า ${itemName} ของคุณแล้ว`,
      `ราคาเต็ม: ${currencyFormatter.format(price)}`,
      `กรุณายืนยันสิทธิ์ภายในวันที่ ${expiresAt} (สงวนสิทธิ์ 24 ชั่วโมง)`,
      `ลิงก์รับสิทธิ์: ${safeClaimUrl}`,
    ].join("\n");

    const deliveries: NotificationDelivery[] = [];
    if (notice.customerEmail) {
      deliveries.push({
        channel: "email",
        send: () =>
          this.retry(() =>
            this.sendEmail({
              from: this.emailFrom,
              to: notice.customerEmail as string,
              subject,
              html,
              text,
              idempotencyKey: `waitlist-offer-${notice.waitlistId}`,
            }),
          ),
      });
    }
    if (notice.lineUserId) {
      deliveries.push({
        channel: "line",
        send: () =>
          this.retry(() =>
            this.sendLine({
              recipientUserId: notice.lineUserId as string,
              text: text.slice(0, 5_000),
              retryKey: deterministicRetryKey(`waitlist-offer:${notice.waitlistId}`),
            }),
          ),
      });
    }
    const results = await Promise.allSettled(deliveries.map((delivery) => delivery.send()));
    const failures: ChannelDeliveryFailure[] = [];
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        failures.push({ channel: deliveries[index].channel, error: result.reason });
      }
    });
    if (failures.length > 0) {
      for (const failure of failures) {
        console.error("Waitlist offer notification delivery failed.", {
          waitlistId: notice.waitlistId,
          channel: failure.channel,
          error: failure.error,
        });
      }
      throw new NotificationServiceError(
        `ส่งการแจ้งเตือน WAITLIST_OFFER ไม่สำเร็จ ${failures.length} ช่องทาง`,
        "WAITLIST_OFFER",
        failures,
      );
    }
  }

  private validateOrder(input: NotificationOrder): NotificationOrder {
    const parsedOrder = notificationOrderSchema.safeParse(input);
    if (!parsedOrder.success) {
      throw new TypeError(
        `Invalid notification order: ${parsedOrder.error.issues
          .map((issue) => `${issue.path.join(".") || "order"} ${issue.message}`)
          .join("; ")}`,
      );
    }
    return parsedOrder.data;
  }

  private validateInternalUrl(value: string): string {
    const url = new URL(value);
    if (url.origin !== this.applicationBaseUrl.origin) {
      throw new TypeError("Balance payment URL must belong to the application origin.");
    }
    return url.toString();
  }

  private validateExternalHttpsUrl(value: string): string {
    const url = new URL(value);
    if (url.protocol !== "https:") {
      throw new TypeError("Tracking URL must use HTTPS.");
    }
    return url.toString();
  }

  private async dispatch(
    event: NotificationEvent,
    order: NotificationOrder,
    subject: string,
    html: string,
    text: string,
  ): Promise<void> {
    const deliveries: NotificationDelivery[] = [];
    if (order.customerEmail) {
      const recipientEmail = order.customerEmail;
      deliveries.push({
        channel: "email",
        send: () =>
          this.sendEmail({
            from: this.emailFrom,
            to: recipientEmail,
            subject,
            html,
            text,
            idempotencyKey: `${event.toLowerCase()}-${orderKey(order.id)}-email`,
          }),
      });
    }
    if (order.lineUserId) {
      const recipientUserId = order.lineUserId;
      const retryKey = randomUUID();
      deliveries.push({
        channel: "line",
        send: () =>
          this.sendLine({
            recipientUserId,
            text,
            retryKey,
          }),
      });
    }

    const results = await Promise.allSettled(
      deliveries.map((delivery) => this.retry(delivery.send)),
    );
    const failures: ChannelDeliveryFailure[] = [];
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        failures.push({
          channel: deliveries[index].channel,
          error: result.reason,
        });
      }
    });

    if (failures.length > 0) {
      for (const failure of failures) {
        console.error("Customer notification delivery failed.", {
          event,
          orderId: order.id,
          channel: failure.channel,
          error: failure.error,
        });
      }
      throw new NotificationServiceError(
        `ส่งการแจ้งเตือน ${event} ไม่สำเร็จ ${failures.length} ช่องทาง`,
        event,
        failures,
      );
    }
  }

  private async sendEmail(message: EmailMessage): Promise<void> {
    const response = await this.fetchImplementation("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.resendApiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": message.idempotencyKey,
      },
      body: JSON.stringify({
        from: message.from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const responseText = await response.text();
      throw new NotificationProviderError(
        `Resend rejected email delivery with HTTP ${response.status}: ${responseText.slice(0, 500)}`,
        response.status,
        response.status === 408 || response.status === 429 || response.status >= 500,
        retryAfterMilliseconds(response),
      );
    }

    let responseBody: unknown;
    try {
      responseBody = await response.json();
    } catch {
      throw new NotificationProviderError(
        "Resend returned an unreadable response.",
        response.status,
        false,
      );
    }
    const parsedResponse = resendResponseSchema.safeParse(responseBody);
    if (!parsedResponse.success) {
      throw new NotificationProviderError(
        "Resend response did not include a valid message identifier.",
        response.status,
        false,
      );
    }
  }

  private async sendLine(message: LineTextMessage): Promise<void> {
    const response = await this.fetchImplementation(
      "https://api.line.me/v2/bot/message/push",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.lineChannelAccessToken}`,
          "Content-Type": "application/json",
          "X-Line-Retry-Key": message.retryKey,
        },
        body: JSON.stringify({
          to: message.recipientUserId,
          messages: [
            {
              type: "text",
              text: message.text.slice(0, 5_000),
            },
          ],
        }),
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!response.ok) {
      const responseText = await response.text();
      throw new NotificationProviderError(
        `LINE Messaging API rejected delivery with HTTP ${response.status}: ${responseText.slice(0, 500)}`,
        response.status,
        response.status === 408 || response.status === 429 || response.status >= 500,
        retryAfterMilliseconds(response),
      );
    }
  }

  private async retry(operation: () => Promise<void>): Promise<void> {
    for (let attempt = 1; attempt <= this.retryOptions.maxAttempts; attempt += 1) {
      try {
        await operation();
        return;
      } catch (error) {
        const retryable =
          !(error instanceof NotificationProviderError) || error.retryable;
        if (!retryable || attempt === this.retryOptions.maxAttempts) {
          throw error;
        }

        const exponentialDelay = Math.min(
          this.retryOptions.initialDelayMilliseconds * 2 ** (attempt - 1),
          this.retryOptions.maxDelayMilliseconds,
        );
        const jitteredDelay = Math.round(exponentialDelay * (0.8 + Math.random() * 0.4));
        const providerDelay =
          error instanceof NotificationProviderError
            ? error.retryAfterMilliseconds
            : null;
        const retryDelay = Math.min(
          providerDelay ?? jitteredDelay,
          this.retryOptions.maxDelayMilliseconds,
        );
        await this.sleep(retryDelay);
      }
    }
  }
}

export function createBalancePaymentUrl(
  applicationBaseUrl: string,
  orderId: string | number,
): string {
  const baseUrl = new URL(applicationBaseUrl);
  const paymentUrl = new URL(`/orders/${encodeURIComponent(String(orderId))}`, baseUrl);
  paymentUrl.searchParams.set("payment", "balance");
  return paymentUrl.toString();
}

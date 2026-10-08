import { createHash, randomUUID } from "node:crypto";
import { Pool } from "pg";
import { z } from "zod";

const MAX_SLIP_SIZE_BYTES = 5 * 1024 * 1024;

export const slipVerificationRequestSchema = z
  .object({
    orderId: z
      .string()
      .regex(/^[1-9]\d*$/, "orderId ต้องเป็นเลขจำนวนเต็มบวก")
      .transform(Number)
      .refine(Number.isSafeInteger, "orderId เกินค่าที่ระบบรองรับ"),
  })
  .strict();

export type SlipPaymentStage = "INITIAL" | "BALANCE";
export type SlipOrderPaymentStatus = "PAID" | "DEPOSIT_PAID";

export interface SlipVerificationRequest {
  orderId: number;
  userId: number;
  file: Express.Multer.File;
}

export interface SlipVerificationResponse {
  orderId: number;
  paymentStage: SlipPaymentStage;
  paymentStatus: SlipOrderPaymentStatus;
  transactionRef: string;
  verifiedAmount: string;
  verifiedAt: string;
  settlementStatus: string;
}

export interface VerifiedBankSlip {
  transactionRef: string;
  receiverAccount: string;
  amount: string;
  transferredAt: string;
}

export interface SlipVerificationClient {
  readonly providerName: string;
  verifySlip(file: Express.Multer.File): Promise<VerifiedBankSlip>;
}

export interface FetchSlipVerificationClientOptions {
  endpoint: string;
  apiKey: string;
  providerName: string;
  fetchImplementation?: typeof fetch;
}

interface OrderPaymentRow {
  id: number;
  user_id: number;
  created_at: Date;
  payment_status: string;
  payment_type: string;
  immediate_amount: string;
  remaining_balance_amount: string;
  remaining_balance: string;
  balance_due_date: Date | null;
  settlement_status: string;
  has_preorder_items: boolean;
}

interface InsertedSlipRow {
  id: string;
  verified_at: Date;
}

interface AppliedPaymentRow {
  payment_status: SlipOrderPaymentStatus;
  settlement_status: string;
}

const normalizedVerificationResponseSchema = z
  .object({
    transactionRef: z.string().trim().min(1).max(200),
    receiverAccount: z.string().trim().min(1).max(64),
    amount: z.union([z.string(), z.number().finite().positive()]),
    transferredAt: z.string().datetime({ offset: true }),
  })
  .strict();

export class SlipVerificationError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidSlipError extends SlipVerificationError {
  constructor(message: string) {
    super(400, "INVALID_SLIP", message);
  }
}

export class UnsupportedSlipTypeError extends SlipVerificationError {
  constructor() {
    super(415, "UNSUPPORTED_SLIP_TYPE", "รองรับไฟล์สลิปเฉพาะ JPEG, PNG และ WEBP");
  }
}

export class SlipTooLargeError extends SlipVerificationError {
  constructor() {
    super(413, "SLIP_TOO_LARGE", "ไฟล์สลิปต้องมีขนาดไม่เกิน 5 MB");
  }
}

export class PaymentOrderNotFoundError extends SlipVerificationError {
  constructor() {
    super(404, "ORDER_NOT_FOUND", "ไม่พบคำสั่งซื้อ");
  }
}

export class PaymentOrderNotOwnedError extends SlipVerificationError {
  constructor() {
    super(404, "ORDER_NOT_FOUND", "ไม่พบคำสั่งซื้อ");
  }
}

export class OrderAlreadyPaidError extends SlipVerificationError {
  constructor() {
    super(409, "ORDER_ALREADY_PAID", "คำสั่งซื้อนี้ชำระเงินครบแล้ว");
  }
}

export class BalancePaymentExpiredError extends SlipVerificationError {
  constructor() {
    super(409, "BALANCE_PAYMENT_EXPIRED", "เลยกำหนดชำระยอดคงเหลือแล้ว");
  }
}

export class PaymentAmountMismatchError extends SlipVerificationError {
  constructor() {
    super(409, "PAYMENT_AMOUNT_MISMATCH", "ยอดเงินในสลิปไม่ตรงกับยอดที่ต้องชำระ");
  }
}

export class SlipRecipientMismatchError extends SlipVerificationError {
  constructor() {
    super(409, "SLIP_RECIPIENT_MISMATCH", "บัญชีผู้รับเงินในสลิปไม่ใช่บัญชีของร้านค้า");
  }
}

export class SlipOlderThanOrderError extends SlipVerificationError {
  constructor() {
    super(409, "SLIP_OLDER_THAN_ORDER", "วันเวลาที่โอนในสลิปเก่ากว่าวันที่สร้างคำสั่งซื้อ");
  }
}

export class SlipTransferTimeInvalidError extends SlipVerificationError {
  constructor() {
    super(409, "SLIP_TRANSFER_TIME_INVALID", "วันเวลาที่โอนในสลิปไม่ถูกต้องหรืออยู่ในอนาคต");
  }
}

export class DuplicateSlipError extends SlipVerificationError {
  constructor() {
    super(409, "DUPLICATE_SLIP", "สลิปหรือรายการโอนนี้ถูกใช้ไปแล้ว");
  }
}

export class SlipProviderError extends SlipVerificationError {
  constructor(message: string, statusCode = 502) {
    super(statusCode, "SLIP_PROVIDER_ERROR", message);
  }
}

export class SlipPaymentStateError extends SlipVerificationError {
  constructor(message: string) {
    super(409, "INVALID_PAYMENT_STATE", message);
  }
}

function normalizeAccountNumber(value: string): string {
  return value.replace(/[\s-]/g, "");
}

function amountToCents(value: string | number): bigint {
  const normalized = String(value).trim();
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) {
    throw new SlipProviderError("API ตรวจสลิปส่งยอดเงินในรูปแบบไม่ถูกต้อง");
  }
  return BigInt(match[1]) * 100n + BigInt((match[2] ?? "").padEnd(2, "0") || "0");
}

function centsToAmount(cents: bigint): string {
  return `${cents / 100n}.${String(cents % 100n).padStart(2, "0")}`;
}

function validateImage(file: Express.Multer.File): void {
  if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
    throw new InvalidSlipError("กรุณาแนบไฟล์ภาพสลิป");
  }
  if (file.size > MAX_SLIP_SIZE_BYTES || file.buffer.length > MAX_SLIP_SIZE_BYTES) {
    throw new SlipTooLargeError();
  }

  const isJpeg =
    file.mimetype === "image/jpeg" &&
    file.buffer.length >= 3 &&
    file.buffer[0] === 0xff &&
    file.buffer[1] === 0xd8 &&
    file.buffer[2] === 0xff;
  const isPng =
    file.mimetype === "image/png" &&
    file.buffer.length >= 8 &&
    file.buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
  const isWebp =
    file.mimetype === "image/webp" &&
    file.buffer.length >= 12 &&
    file.buffer.toString("ascii", 0, 4) === "RIFF" &&
    file.buffer.toString("ascii", 8, 12) === "WEBP";

  if (!isJpeg && !isPng && !isWebp) {
    throw new UnsupportedSlipTypeError();
  }
}

function determinePaymentStage(order: OrderPaymentRow): SlipPaymentStage {
  if (
    order.payment_status === "DEPOSIT_PAID" &&
    order.settlement_status === "AWAITING_BALANCE_PAYMENT"
  ) {
    return "BALANCE";
  }
  if (order.payment_status === "UNPAID") {
    return "INITIAL";
  }
  if (order.payment_status === "PAID") {
    throw new OrderAlreadyPaidError();
  }
  throw new SlipPaymentStateError("สถานะคำสั่งซื้อยังไม่สามารถรับชำระเงินได้");
}

function expectedAmountCents(order: OrderPaymentRow, stage: SlipPaymentStage): bigint {
  return amountToCents(
    stage === "INITIAL"
      ? order.immediate_amount
      : order.remaining_balance_amount,
  );
}

function assertSlipMatchesOrder(
  slip: VerifiedBankSlip,
  order: OrderPaymentRow,
  stage: SlipPaymentStage,
  merchantAccount: string,
  expectedAmount: bigint,
): Date {
  if (
    normalizeAccountNumber(slip.receiverAccount) !==
    normalizeAccountNumber(merchantAccount)
  ) {
    throw new SlipRecipientMismatchError();
  }
  if (amountToCents(slip.amount) !== expectedAmount) {
    throw new PaymentAmountMismatchError();
  }

  const transferredAt = new Date(slip.transferredAt);
  const transferTimestamp = transferredAt.getTime();
  if (!Number.isFinite(transferTimestamp) || transferTimestamp > Date.now()) {
    throw new SlipTransferTimeInvalidError();
  }
  if (transferTimestamp < order.created_at.getTime()) {
    throw new SlipOlderThanOrderError();
  }
  if (
    stage === "BALANCE" &&
    (!order.balance_due_date || transferTimestamp > order.balance_due_date.getTime())
  ) {
    throw new BalancePaymentExpiredError();
  }

  return transferredAt;
}

function assertPostgresUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }
  return error.code === "23505";
}

export class FetchSlipVerificationClient implements SlipVerificationClient {
  readonly providerName: string;
  private readonly endpoint: URL;
  private readonly apiKey: string;
  private readonly fetchImplementation: typeof fetch;

  constructor(options: FetchSlipVerificationClientOptions) {
    let endpoint: URL;
    try {
      endpoint = new URL(options.endpoint);
    } catch {
      throw new TypeError("Slip verification endpoint must be an absolute HTTPS URL.");
    }
    if (endpoint.protocol !== "https:") {
      throw new TypeError("Slip verification endpoint must use HTTPS.");
    }
    if (options.apiKey.trim().length === 0) {
      throw new TypeError("Slip verification API key must not be empty.");
    }
    if (options.providerName.trim().length === 0) {
      throw new TypeError("Slip verification provider name must not be empty.");
    }

    this.endpoint = endpoint;
    this.apiKey = options.apiKey;
    this.providerName = options.providerName.trim();
    this.fetchImplementation = options.fetchImplementation ?? fetch;
  }

  async verifySlip(file: Express.Multer.File): Promise<VerifiedBankSlip> {
    const encodedImage = file.buffer.toString("base64");

    let response: globalThis.Response;
    try {
      response = await this.fetchImplementation(this.endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          imageBase64: encodedImage,
          imageMimeType: file.mimetype,
        }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      console.error("Slip verification provider request failed.", error);
      throw new SlipProviderError("ไม่สามารถเชื่อมต่อบริการตรวจสอบสลิปได้", 503);
    }

    if (!response.ok) {
      throw new SlipProviderError(
        `บริการตรวจสอบสลิปตอบกลับด้วย HTTP ${response.status}`,
      );
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new SlipProviderError("บริการตรวจสอบสลิปส่งข้อมูลตอบกลับที่อ่านไม่ได้");
    }

    const parsedResponse = normalizedVerificationResponseSchema.safeParse(body);
    if (!parsedResponse.success) {
      throw new SlipProviderError("ข้อมูลจากบริการตรวจสอบสลิปไม่ตรงตามรูปแบบที่กำหนด");
    }

    return {
      transactionRef: parsedResponse.data.transactionRef,
      receiverAccount: parsedResponse.data.receiverAccount,
      amount: String(parsedResponse.data.amount),
      transferredAt: parsedResponse.data.transferredAt,
    };
  }
}

export interface SlipVerificationServiceOptions {
  merchantRecipientAccount: string;
  provider?: SlipVerificationClient;
  mockSlipVerification?: boolean;
}

export class SlipVerificationService {
  private readonly merchantRecipientAccount: string;
  private readonly provider: SlipVerificationClient | undefined;
  private readonly mockSlipVerification: boolean;

  constructor(
    private readonly pool: Pool,
    options: SlipVerificationServiceOptions,
  ) {
    if (normalizeAccountNumber(options.merchantRecipientAccount).length === 0) {
      throw new TypeError("Merchant recipient account must not be empty.");
    }
    this.mockSlipVerification =
      options.mockSlipVerification ?? process.env.MOCK_SLIP_VERIFY === "true";
    if (this.mockSlipVerification && process.env.NODE_ENV === "production") {
      throw new TypeError("MOCK_SLIP_VERIFY cannot be enabled in production.");
    }
    if (!this.mockSlipVerification && !options.provider) {
      throw new TypeError(
        "A slip verification provider is required when mock verification is disabled.",
      );
    }
    this.merchantRecipientAccount = options.merchantRecipientAccount;
    this.provider = options.provider;
  }

  async verifyAndApplyPayment(
    request: SlipVerificationRequest,
  ): Promise<SlipVerificationResponse> {
    if (!Number.isSafeInteger(request.orderId) || request.orderId <= 0) {
      throw new InvalidSlipError("หมายเลขคำสั่งซื้อไม่ถูกต้อง");
    }
    if (!Number.isSafeInteger(request.userId) || request.userId <= 0) {
      throw new SlipVerificationError(401, "UNAUTHENTICATED", "กรุณาเข้าสู่ระบบ");
    }
    validateImage(request.file);

    const orderResult = await this.pool.query<OrderPaymentRow>(
      `SELECT
         order_record.id,
         order_record.user_id,
         order_record.created_at,
         order_record.payment_status,
         order_record.payment_type,
         order_record.immediate_amount,
         order_record.remaining_balance_amount,
         order_record.remaining_balance,
         order_record.balance_due_date,
         order_record.settlement_status,
         EXISTS (
           SELECT 1
           FROM order_items AS item
           WHERE item.order_id = order_record.id
             AND item.is_preorder = TRUE
         ) AS has_preorder_items
       FROM orders AS order_record
       WHERE order_record.id = $1
         AND order_record.user_id = $2`,
      [request.orderId, request.userId],
    );
    const initialOrder = orderResult.rows[0];
    if (!initialOrder) {
      throw new PaymentOrderNotOwnedError();
    }

    const paymentStage = determinePaymentStage(initialOrder);
    const initialAmountCents = expectedAmountCents(initialOrder, paymentStage);
    if (initialAmountCents <= 0n) {
      throw new SlipPaymentStateError("คำสั่งซื้อนี้ไม่มียอดที่ต้องชำระ");
    }
    if (
      paymentStage === "BALANCE" &&
      (!initialOrder.balance_due_date ||
        initialOrder.balance_due_date.getTime() < Date.now())
    ) {
      throw new BalancePaymentExpiredError();
    }

    const slipHash = createHash("sha256").update(request.file.buffer).digest("hex");
    const verifiedSlip = this.mockSlipVerification
      ? {
          transactionRef: `MOCK-${randomUUID()}`,
          receiverAccount: this.merchantRecipientAccount,
          amount: centsToAmount(initialAmountCents),
          transferredAt: new Date().toISOString(),
        }
      : await this.requireProvider().verifySlip(request.file);
    const transferredAt = assertSlipMatchesOrder(
      verifiedSlip,
      initialOrder,
      paymentStage,
      this.merchantRecipientAccount,
      initialAmountCents,
    );
    const client = await this.pool.connect();
    let transactionStarted = false;

    try {
      await client.query("BEGIN");
      transactionStarted = true;

      const lockedOrderResult = await client.query<OrderPaymentRow>(
        `SELECT
           order_record.id,
           order_record.user_id,
           order_record.created_at,
           order_record.payment_status,
           order_record.payment_type,
           order_record.immediate_amount,
           order_record.remaining_balance_amount,
           order_record.remaining_balance,
           order_record.balance_due_date,
           order_record.settlement_status,
           EXISTS (
             SELECT 1
             FROM order_items AS item
             WHERE item.order_id = order_record.id
               AND item.is_preorder = TRUE
           ) AS has_preorder_items
         FROM orders AS order_record
         WHERE order_record.id = $1
           AND order_record.user_id = $2
         FOR UPDATE`,
        [request.orderId, request.userId],
      );
      const lockedOrder = lockedOrderResult.rows[0];
      if (!lockedOrder) {
        throw new PaymentOrderNotOwnedError();
      }

      const lockedStage = determinePaymentStage(lockedOrder);
      if (lockedStage !== paymentStage) {
        throw new SlipPaymentStateError(
          "สถานะการชำระเงินของคำสั่งซื้อเปลี่ยนระหว่างตรวจสอบสลิป",
        );
      }
      const lockedAmountCents = expectedAmountCents(lockedOrder, lockedStage);
      if (lockedAmountCents !== initialAmountCents) {
        throw new PaymentAmountMismatchError();
      }
      assertSlipMatchesOrder(
        verifiedSlip,
        lockedOrder,
        lockedStage,
        this.merchantRecipientAccount,
        lockedAmountCents,
      );

      const insertSlipResult = await client.query<InsertedSlipRow>(
        `INSERT INTO bank_slips (
           order_id,
           payment_stage,
           transaction_ref,
           slip_hash,
           receiver_account,
           transfer_amount,
           transferred_at,
           verification_provider
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, verified_at`,
        [
          request.orderId,
          lockedStage,
          verifiedSlip.transactionRef,
          slipHash,
          normalizeAccountNumber(verifiedSlip.receiverAccount),
          centsToAmount(lockedAmountCents),
          transferredAt,
          this.mockSlipVerification
            ? "MOCK_STAGING"
            : this.requireProvider().providerName,
        ],
      );
      const insertedSlip = insertSlipResult.rows[0];
      if (!insertedSlip) {
        throw new Error("Database did not return the saved bank slip.");
      }

      let appliedPayment: AppliedPaymentRow;
      if (lockedStage === "BALANCE") {
        await client.query(
          `UPDATE order_items
           SET balance_amount = 0,
               remaining_balance = 0,
               balance_paid_status = 'PAID',
               settlement_status = 'PAID'
           WHERE order_id = $1
             AND payment_type = 'DEPOSIT'
             AND balance_amount > 0`,
          [request.orderId],
        );

        const paymentResult = await client.query<AppliedPaymentRow>(
          `UPDATE orders
           SET payment_status = 'PAID',
               remaining_balance = 0,
               remaining_balance_amount = 0,
               balance_paid_status = 'PAID',
               settlement_status = 'READY_TO_PACK',
               balance_payment_reference = $2,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1
             AND payment_status = 'DEPOSIT_PAID'
             AND settlement_status = 'AWAITING_BALANCE_PAYMENT'
           RETURNING payment_status, settlement_status`,
          [request.orderId, verifiedSlip.transactionRef],
        );
        appliedPayment = paymentResult.rows[0];
      } else {
        const paymentStatus =
          lockedOrder.payment_type === "DEPOSIT" ? "DEPOSIT_PAID" : "PAID";
        const settlementStatus =
          paymentStatus === "DEPOSIT_PAID"
            ? "WAITING_FOR_ARRIVAL"
            : lockedOrder.has_preorder_items
              ? "WAITING_FOR_ARRIVAL"
              : "READY_TO_PACK";
        const paymentResult = await client.query<AppliedPaymentRow>(
          `UPDATE orders
           SET payment_status = $2,
               settlement_status = $3,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1
             AND payment_status = 'UNPAID'
           RETURNING payment_status, settlement_status`,
          [request.orderId, paymentStatus, settlementStatus],
        );
        appliedPayment = paymentResult.rows[0];
      }

      if (!appliedPayment) {
        throw new SlipPaymentStateError(
          "ไม่สามารถอัปเดตสถานะการชำระเงินของคำสั่งซื้อได้",
        );
      }

      await client.query("COMMIT");
      transactionStarted = false;

      return {
        orderId: request.orderId,
        paymentStage: lockedStage,
        paymentStatus: appliedPayment.payment_status,
        transactionRef: verifiedSlip.transactionRef,
        verifiedAmount: centsToAmount(lockedAmountCents),
        verifiedAt: insertedSlip.verified_at.toISOString(),
        settlementStatus: appliedPayment.settlement_status,
      };
    } catch (error) {
      if (transactionStarted) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          console.error("Failed to roll back slip payment transaction.", rollbackError);
        }
      }
      if (assertPostgresUniqueViolation(error)) {
        throw new DuplicateSlipError();
      }
      throw error;
    } finally {
      client.release();
    }
  }

  private requireProvider(): SlipVerificationClient {
    if (!this.provider) {
      throw new SlipProviderError(
        "ไม่ได้กำหนดผู้ให้บริการตรวจสอบสลิปสำหรับระบบจริง",
        503,
      );
    }
    return this.provider;
  }
}

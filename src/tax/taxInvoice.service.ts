import path from "node:path";
import { Pool, PoolClient } from "pg";
import {
  calculateMixedTax,
  TaxCalculationResult,
  TaxOrderLine,
} from "./taxCalculator";
import {
  taxInvoiceRequestSchema,
  TaxInvoiceRequest,
} from "./taxInvoice.schemas";
import {
  renderTaxInvoicePdf,
  TaxInvoicePdfData,
  TaxInvoicePdfLine,
  TaxInvoiceSeller,
} from "./taxInvoicePdf";
import { TaxInvoiceStorage } from "./taxInvoiceStorage";

export interface TaxInvoiceServiceOptions {
  seller: TaxInvoiceSeller;
  thaiFontPath: string;
  storage: TaxInvoiceStorage;
}

export interface TaxInvoiceResponse {
  taxInvoiceId: string;
  orderId: number;
  invoiceNumber: string;
  entityType: "INDIVIDUAL" | "CORPORATION";
  taxId: string;
  companyOrName: string;
  branchType: "HEAD_OFFICE" | "BRANCH" | null;
  branchCode: string | null;
  nonVatAmount: string;
  vatableAmount: string;
  vatAmount: string;
  totalAmount: string;
  pdfFileUrl: string | null;
  status: "ISSUED" | "CANCELLED";
  issuedAt: string;
}

export interface TaxProfileResponse {
  entityType: "INDIVIDUAL" | "CORPORATION";
  taxId: string;
  companyOrName: string;
  branchType: "HEAD_OFFICE" | "BRANCH" | null;
  branchCode: string | null;
  addressLine: string;
  addressVillage: string | null;
  street: string | null;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
  contactEmail: string;
  contactPhone: string;
}

export interface TaxInvoiceDownload {
  fileName: string;
  contents: Buffer;
}

interface LockedOrderRow {
  id: number;
  user_id: number;
  payment_status: string;
  total_amount: string;
  shipping_fee: string;
  within_tax_month: boolean;
}

interface OrderTaxItemRow {
  product_variant_id: number;
  quantity: number;
  unit_price: string;
  category: "BOOK" | "FIGURE";
}

interface InvoiceSequenceRow {
  last_number: number;
}

interface InsertedInvoiceRow {
  id: string;
  order_id: number;
  invoice_number: string;
  entity_type: "INDIVIDUAL" | "CORPORATION";
  tax_id: string;
  company_or_name: string;
  branch_type: "HEAD_OFFICE" | "BRANCH" | null;
  branch_code: string | null;
  non_vat_amount: string;
  vatable_amount: string;
  vat_amount: string;
  total_amount: string;
  pdf_file_url: string | null;
  status: "ISSUED" | "CANCELLED";
  issued_at: Date;
}

interface InvoicePdfRow {
  id: string;
  order_id: number;
  invoice_number: string;
  entity_type: "INDIVIDUAL" | "CORPORATION";
  tax_id: string;
  company_or_name: string;
  branch_type: "HEAD_OFFICE" | "BRANCH" | null;
  branch_code: string | null;
  address_line: string;
  address_village: string | null;
  street: string | null;
  subdistrict: string;
  district: string;
  province: string;
  postal_code: string;
  contact_email: string;
  contact_phone: string;
  non_vat_amount: string;
  vatable_amount: string;
  vat_amount: string;
  total_amount: string;
  pdf_file_url: string | null;
  pdf_storage_key: string | null;
  status: "ISSUED" | "CANCELLED";
  issued_at: Date;
}

interface InvoiceLineRow {
  description: string;
  quantity: number;
  unit_price: string;
  gross_amount: string;
  vat_category: "VAT_EXEMPT" | "VAT_7";
}

interface SavedTaxProfileRow {
  entity_type: "INDIVIDUAL" | "CORPORATION";
  tax_id: string;
  company_or_name: string;
  branch_type: "HEAD_OFFICE" | "BRANCH" | null;
  branch_code: string | null;
  address_line: string;
  address_village: string | null;
  street: string | null;
  subdistrict: string;
  district: string;
  province: string;
  postal_code: string;
  contact_email: string;
  contact_phone: string;
}

interface StoredTaxInvoiceRequestRow {
  entity_type: "INDIVIDUAL" | "CORPORATION";
  tax_id: string;
  company_or_name: string;
  branch_type: "HEAD_OFFICE" | "BRANCH" | null;
  branch_code: string | null;
  address_line: string;
  address_village: string | null;
  street: string | null;
  subdistrict: string;
  district: string;
  province: string;
  postal_code: string;
  contact_email: string;
  contact_phone: string;
  save_for_next_time: boolean;
}

export class TaxInvoiceError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidTaxInvoiceRequestError extends TaxInvoiceError {
  constructor(message: string) {
    super(400, "INVALID_TAX_INVOICE_REQUEST", message);
  }
}

export class TaxInvoiceOrderNotFoundError extends TaxInvoiceError {
  constructor() {
    super(404, "ORDER_NOT_FOUND", "ไม่พบคำสั่งซื้อ");
  }
}

export class TaxInvoicePaymentRequiredError extends TaxInvoiceError {
  constructor() {
    super(409, "ORDER_NOT_PAID", "ออกใบกำกับภาษีได้เมื่อชำระเงินแล้วหรือชำระมัดจำสำเร็จ");
  }
}

export class TaxInvoiceRequestWindowExpiredError extends TaxInvoiceError {
  constructor() {
    super(409, "TAX_INVOICE_REQUEST_WINDOW_EXPIRED", "คำขอใบกำกับภาษีย้อนหลังต้องทำภายในเดือนที่สั่งซื้อ");
  }
}

export class TaxInvoiceAlreadyExistsError extends TaxInvoiceError {
  constructor() {
    super(409, "TAX_INVOICE_ALREADY_EXISTS", "คำสั่งซื้อนี้มีใบกำกับภาษีแล้ว");
  }
}

export class TaxInvoiceNotFoundError extends TaxInvoiceError {
  constructor() {
    super(404, "TAX_INVOICE_NOT_FOUND", "ไม่พบใบกำกับภาษี");
  }
}

export class TaxInvoiceCancelledError extends TaxInvoiceError {
  constructor() {
    super(409, "TAX_INVOICE_CANCELLED", "ใบกำกับภาษีฉบับนี้ถูกยกเลิกแล้ว");
  }
}

export class InvalidTaxInvoiceConfigurationError extends TaxInvoiceError {
  constructor(message: string) {
    super(500, "TAX_INVOICE_CONFIGURATION_INVALID", message);
  }
}

function toTaxInvoiceResponse(row: InsertedInvoiceRow): TaxInvoiceResponse {
  return {
    taxInvoiceId: row.id,
    orderId: row.order_id,
    invoiceNumber: row.invoice_number,
    entityType: row.entity_type,
    taxId: row.tax_id,
    companyOrName: row.company_or_name,
    branchType: row.branch_type,
    branchCode: row.branch_code,
    nonVatAmount: row.non_vat_amount,
    vatableAmount: row.vatable_amount,
    vatAmount: row.vat_amount,
    totalAmount: row.total_amount,
    pdfFileUrl: row.pdf_file_url,
    status: row.status,
    issuedAt: row.issued_at.toISOString(),
  };
}

function mapProfile(row: SavedTaxProfileRow): TaxProfileResponse {
  return {
    entityType: row.entity_type,
    taxId: row.tax_id,
    companyOrName: row.company_or_name,
    branchType: row.branch_type,
    branchCode: row.branch_code,
    addressLine: row.address_line,
    addressVillage: row.address_village,
    street: row.street,
    subdistrict: row.subdistrict,
    district: row.district,
    province: row.province,
    postalCode: row.postal_code,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
  };
}

function addressOptional(value: string | undefined): string | null {
  return value && value.length > 0 ? value : null;
}

async function rollbackTransaction(client: PoolClient, started: boolean): Promise<void> {
  if (!started) {
    return;
  }
  try {
    await client.query("ROLLBACK");
  } catch (rollbackError) {
    console.error("Failed to roll back tax invoice transaction.", rollbackError);
  }
}

export class TaxInvoiceService {
  constructor(
    private readonly pool: Pool,
    private readonly options: TaxInvoiceServiceOptions,
  ) {
    if (!options.seller.name.trim() || !options.seller.address.trim()) {
      throw new InvalidTaxInvoiceConfigurationError("ข้อมูลผู้ขายและที่อยู่ร้านค้าต้องระบุให้ครบ");
    }
    if (!options.thaiFontPath.trim()) {
      throw new InvalidTaxInvoiceConfigurationError("กรุณาตั้งค่าไฟล์ฟอนต์ภาษาไทยสำหรับ PDF");
    }
  }

  async createTaxInvoice(
    orderIdInput: number,
    userIdInput: number,
    rawTaxData?: unknown,
  ): Promise<TaxInvoiceResponse> {
    if (!Number.isSafeInteger(orderIdInput) || orderIdInput <= 0) {
      throw new InvalidTaxInvoiceRequestError("หมายเลขคำสั่งซื้อไม่ถูกต้อง");
    }
    if (!Number.isSafeInteger(userIdInput) || userIdInput <= 0) {
      throw new InvalidTaxInvoiceRequestError("หมายเลขผู้ใช้งานไม่ถูกต้อง");
    }
    let taxData: TaxInvoiceRequest;
    const client = await this.pool.connect();
    let transactionStarted = false;

    try {
      await client.query("BEGIN");
      transactionStarted = true;
      const orderResult = await client.query<LockedOrderRow>(
        `SELECT
           order_record.id,
           order_record.user_id,
           order_record.payment_status,
           order_record.total_amount::text,
           order_record.shipping_fee::text,
           CURRENT_TIMESTAMP < (
             (
               date_trunc(
                 'month',
                 order_record.created_at AT TIME ZONE 'Asia/Bangkok'
               ) + INTERVAL '1 month'
             ) AT TIME ZONE 'Asia/Bangkok'
           ) AS within_tax_month
         FROM orders AS order_record
         WHERE order_record.id = $1
           AND order_record.user_id = $2
         FOR UPDATE`,
        [orderIdInput, userIdInput],
      );
      const order = orderResult.rows[0];
      if (!order) {
        throw new TaxInvoiceOrderNotFoundError();
      }
      if (order.payment_status !== "PAID" && order.payment_status !== "DEPOSIT_PAID") {
        throw new TaxInvoicePaymentRequiredError();
      }
      if (!order.within_tax_month) {
        throw new TaxInvoiceRequestWindowExpiredError();
      }

      const hasExplicitTaxData =
        rawTaxData !== undefined &&
        rawTaxData !== null &&
        (typeof rawTaxData !== "object" ||
          Object.keys(rawTaxData as Record<string, unknown>).length > 0);
      let taxDataInput: unknown = rawTaxData;
      if (!hasExplicitTaxData) {
        const storedRequestResult = await client.query<StoredTaxInvoiceRequestRow>(
          `SELECT
             entity_type,
             tax_id,
             company_or_name,
             branch_type,
             branch_code,
             address_line,
             address_village,
             street,
             subdistrict,
             district,
             province,
             postal_code,
             contact_email,
             contact_phone,
             save_for_next_time
           FROM order_tax_invoice_requests
           WHERE order_id = $1
             AND user_id = $2
           FOR UPDATE`,
          [orderIdInput, userIdInput],
        );
        const storedRequest = storedRequestResult.rows[0];
        if (!storedRequest) {
          throw new InvalidTaxInvoiceRequestError(
            "ไม่พบข้อมูลคำขอใบกำกับภาษีของคำสั่งซื้อนี้",
          );
        }
        taxDataInput = {
          entityType: storedRequest.entity_type,
          taxId: storedRequest.tax_id,
          companyOrName: storedRequest.company_or_name,
          ...(storedRequest.branch_type
            ? { branchType: storedRequest.branch_type }
            : {}),
          ...(storedRequest.branch_code
            ? { branchCode: storedRequest.branch_code }
            : {}),
          addressLine: storedRequest.address_line,
          addressVillage: storedRequest.address_village ?? "",
          street: storedRequest.street ?? "",
          subdistrict: storedRequest.subdistrict,
          district: storedRequest.district,
          province: storedRequest.province,
          postalCode: storedRequest.postal_code,
          contactEmail: storedRequest.contact_email,
          contactPhone: storedRequest.contact_phone,
          saveForNextTime: storedRequest.save_for_next_time,
        };
      }
      const parsedTaxData = taxInvoiceRequestSchema.safeParse(taxDataInput);
      if (!parsedTaxData.success) {
        throw new InvalidTaxInvoiceRequestError(
          parsedTaxData.error.issues
            .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
            .join("; "),
        );
      }
      taxData = parsedTaxData.data;

      const existingInvoice = await client.query<{ id: string }>(
        `SELECT id::text
         FROM tax_invoices
         WHERE order_id = $1
         FOR UPDATE`,
        [orderIdInput],
      );
      if (existingInvoice.rowCount > 0) {
        throw new TaxInvoiceAlreadyExistsError();
      }

      const itemsResult = await client.query<OrderTaxItemRow>(
        `SELECT
           item.product_variant_id,
           item.quantity,
           item.unit_price::text,
           CASE
             WHEN EXISTS (
               SELECT 1
               FROM figures_metadata AS figure
               INNER JOIN product_variants AS figure_variant
                 ON figure_variant.product_id = figure.product_id
               WHERE figure_variant.id = item.product_variant_id
             ) THEN 'FIGURE'
             ELSE 'BOOK'
           END AS category
         FROM order_items AS item
         WHERE item.order_id = $1
         ORDER BY item.id`,
        [orderIdInput],
      );
      if (itemsResult.rows.length === 0) {
        throw new TaxInvoiceError(409, "ORDER_HAS_NO_ITEMS", "ไม่พบรายการสินค้าในคำสั่งซื้อ");
      }
      const taxLines: TaxOrderLine[] = itemsResult.rows.map((item) => ({
        description: `สินค้า ${item.category === "FIGURE" ? "Figure/Collectible" : "หนังสือ"} (Variant #${item.product_variant_id})`,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        category: item.category,
        productVariantId: item.product_variant_id,
      }));
      const calculation = calculateMixedTax({
        items: taxLines,
        shippingFee: order.shipping_fee,
      });

      const monthResult = await client.query<{ tax_month: string }>(
        `SELECT to_char(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok', 'YYYYMM') AS tax_month`,
      );
      const taxMonth = monthResult.rows[0]?.tax_month;
      if (!taxMonth) {
        throw new Error("Database did not return the current tax month.");
      }
      const sequenceResult = await client.query<InvoiceSequenceRow>(
        `INSERT INTO tax_invoice_sequences (tax_month, last_number)
         VALUES ($1, 1)
         ON CONFLICT (tax_month)
         DO UPDATE SET last_number = tax_invoice_sequences.last_number + 1
         RETURNING last_number`,
        [taxMonth],
      );
      const sequence = sequenceResult.rows[0]?.last_number;
      if (!sequence) {
        throw new Error("Database did not return a tax invoice sequence number.");
      }
      const invoiceNumber = `INV-${taxMonth}-${String(sequence).padStart(4, "0")}`;
      const branchType = taxData.entityType === "CORPORATION" ? taxData.branchType ?? null : null;
      const branchCode = taxData.entityType === "CORPORATION" ? taxData.branchCode ?? null : null;
      const invoiceResult = await client.query<InsertedInvoiceRow>(
        `INSERT INTO tax_invoices (
           order_id,
           user_id,
           invoice_number,
           entity_type,
           tax_id,
           company_or_name,
           branch_type,
           branch_code,
           address_line,
           address_village,
           street,
           subdistrict,
           district,
           province,
           postal_code,
           contact_email,
           contact_phone,
           non_vat_amount,
           vatable_amount,
           vat_amount,
           total_amount,
           status
         )
         VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
           $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, 'ISSUED'
         )
         RETURNING
           id::text,
           order_id,
           invoice_number,
           entity_type,
           tax_id,
           company_or_name,
           branch_type,
           branch_code,
           non_vat_amount::text,
           vatable_amount::text,
           vat_amount::text,
           total_amount::text,
           pdf_file_url,
           status,
           issued_at`,
        [
          orderIdInput,
          userIdInput,
          invoiceNumber,
          taxData.entityType,
          taxData.taxId,
          taxData.companyOrName,
          branchType,
          branchCode,
          taxData.addressLine,
          addressOptional(taxData.addressVillage),
          addressOptional(taxData.street),
          taxData.subdistrict,
          taxData.district,
          taxData.province,
          taxData.postalCode,
          taxData.contactEmail,
          taxData.contactPhone,
          calculation.nonVatAmount,
          calculation.vatableAmount,
          calculation.vatAmount,
          calculation.totalAmount,
        ],
      );
      const invoice = invoiceResult.rows[0];
      if (!invoice) {
        throw new Error("Database did not return the created tax invoice.");
      }

      for (const line of calculation.lines) {
        await client.query(
          `INSERT INTO tax_invoice_items (
             tax_invoice_id,
             product_variant_id,
             description,
             quantity,
             unit_price,
             gross_amount,
             vat_category
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            invoice.id,
            line.productVariantId,
            line.description,
            line.quantity,
            line.unitPrice,
            line.grossAmount,
            line.vatCategory,
          ],
        );
      }

      if (taxData.saveForNextTime) {
        await this.saveTaxProfile(client, userIdInput, taxData, branchType, branchCode);
      }

      await client.query("COMMIT");
      transactionStarted = false;
      return toTaxInvoiceResponse(invoice);
    } catch (error) {
      await rollbackTransaction(client, transactionStarted);
      throw error;
    } finally {
      client.release();
    }
  }

  async generateInvoicePdf(taxInvoiceIdInput: number): Promise<string> {
    if (!Number.isSafeInteger(taxInvoiceIdInput) || taxInvoiceIdInput <= 0) {
      throw new InvalidTaxInvoiceRequestError("หมายเลขใบกำกับภาษีไม่ถูกต้อง");
    }
    const invoiceResult = await this.pool.query<InvoicePdfRow>(
      `SELECT
         id::text,
         order_id,
         invoice_number,
         entity_type,
         tax_id,
         company_or_name,
         branch_type,
         branch_code,
         address_line,
         address_village,
         street,
         subdistrict,
         district,
         province,
         postal_code,
         contact_email,
         contact_phone,
         non_vat_amount::text,
         vatable_amount::text,
         vat_amount::text,
         total_amount::text,
         pdf_file_url,
         pdf_storage_key,
         status,
         issued_at
       FROM tax_invoices
       WHERE id = $1`,
      [taxInvoiceIdInput],
    );
    const invoice = invoiceResult.rows[0];
    if (!invoice) {
      throw new TaxInvoiceNotFoundError();
    }
    if (invoice.status !== "ISSUED") {
      throw new TaxInvoiceCancelledError();
    }
    if (invoice.pdf_file_url && invoice.pdf_storage_key) {
      return invoice.pdf_file_url;
    }

    const lineResult = await this.pool.query<InvoiceLineRow>(
      `SELECT description, quantity, unit_price::text, gross_amount::text, vat_category
       FROM tax_invoice_items
       WHERE tax_invoice_id = $1
       ORDER BY id`,
      [taxInvoiceIdInput],
    );
    const calculation = this.calculationFromInvoice(invoice, lineResult.rows);
    const pdfData: TaxInvoicePdfData = {
      invoiceNumber: invoice.invoice_number,
      issuedAt: invoice.issued_at,
      entityType: invoice.entity_type,
      taxId: invoice.tax_id,
      companyOrName: invoice.company_or_name,
      branchType: invoice.branch_type,
      branchCode: invoice.branch_code,
      addressLine: invoice.address_line,
      addressVillage: invoice.address_village,
      street: invoice.street,
      subdistrict: invoice.subdistrict,
      district: invoice.district,
      province: invoice.province,
      postalCode: invoice.postal_code,
      contactEmail: invoice.contact_email,
      contactPhone: invoice.contact_phone,
      lines: lineResult.rows,
      calculation,
    };
    const contents = await renderTaxInvoicePdf(
      pdfData,
      this.options.seller,
      this.options.thaiFontPath,
    );
    const storageKey = path.posix.join("tax-invoices", `${invoice.invoice_number}.pdf`);
    await this.options.storage.save(storageKey, contents);
    const fileUrl = `/api/orders/${invoice.order_id}/tax-invoice/download`;
    const update = await this.pool.query(
      `UPDATE tax_invoices
       SET pdf_file_url = $2,
           pdf_storage_key = $3
       WHERE id = $1
         AND status = 'ISSUED'`,
      [taxInvoiceIdInput, fileUrl, storageKey],
    );
    if (update.rowCount !== 1) {
      throw new TaxInvoiceCancelledError();
    }
    return fileUrl;
  }

  async downloadTaxInvoice(
    orderId: number,
    userId: number,
  ): Promise<TaxInvoiceDownload> {
    const invoiceResult = await this.pool.query<{
      id: string;
      invoice_number: string;
      pdf_storage_key: string | null;
      status: "ISSUED" | "CANCELLED";
    }>(
      `SELECT
         invoice.id::text,
         invoice.invoice_number,
         invoice.pdf_storage_key,
         invoice.status
       FROM tax_invoices AS invoice
       WHERE invoice.order_id = $1
         AND invoice.user_id = $2`,
      [orderId, userId],
    );
    const invoice = invoiceResult.rows[0];
    if (!invoice) {
      throw new TaxInvoiceNotFoundError();
    }
    if (invoice.status !== "ISSUED") {
      throw new TaxInvoiceCancelledError();
    }

    if (!invoice.pdf_storage_key) {
      await this.generateInvoicePdf(Number(invoice.id));
    }
    const currentResult = await this.pool.query<{ pdf_storage_key: string | null }>(
      `SELECT pdf_storage_key
       FROM tax_invoices
       WHERE id = $1
         AND user_id = $2
         AND status = 'ISSUED'`,
      [invoice.id, userId],
    );
    const storageKey = currentResult.rows[0]?.pdf_storage_key;
    if (!storageKey) {
      throw new TaxInvoiceError(500, "TAX_INVOICE_PDF_NOT_READY", "ไม่สามารถเตรียมไฟล์ PDF ได้");
    }
    const contents = await this.options.storage.read(storageKey);
    return {
      fileName: `${invoice.invoice_number}.pdf`,
      contents,
    };
  }

  async getSavedTaxProfile(userId: number): Promise<TaxProfileResponse | null> {
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      throw new InvalidTaxInvoiceRequestError("หมายเลขผู้ใช้งานไม่ถูกต้อง");
    }
    const result = await this.pool.query<SavedTaxProfileRow>(
      `SELECT
         entity_type,
         tax_id,
         company_or_name,
         branch_type,
         branch_code,
         address_line,
         address_village,
         street,
         subdistrict,
         district,
         province,
         postal_code,
         contact_email,
         contact_phone
       FROM user_tax_profiles
       WHERE user_id = $1
       ORDER BY is_default DESC, updated_at DESC, id DESC
       LIMIT 1`,
      [userId],
    );
    const profile = result.rows[0];
    return profile ? mapProfile(profile) : null;
  }

  private async saveTaxProfile(
    client: PoolClient,
    userId: number,
    data: TaxInvoiceRequest,
    branchType: "HEAD_OFFICE" | "BRANCH" | null,
    branchCode: string | null,
  ): Promise<void> {
    const userLock = await client.query<{ id: number }>(
      `SELECT id
       FROM users
       WHERE id = $1
       FOR UPDATE`,
      [userId],
    );
    if (userLock.rowCount !== 1) {
      throw new TaxInvoiceOrderNotFoundError();
    }
    await client.query(
      `UPDATE user_tax_profiles
       SET is_default = FALSE
       WHERE user_id = $1
         AND is_default = TRUE`,
      [userId],
    );
    await client.query(
      `INSERT INTO user_tax_profiles (
         user_id,
         entity_type,
         tax_id,
         company_or_name,
         branch_type,
         branch_code,
         address_line,
         address_village,
         street,
         subdistrict,
         district,
         province,
         postal_code,
         contact_email,
         contact_phone,
         is_default,
         updated_at
       )
       VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9,
         $10, $11, $12, $13, $14, $15, TRUE, CURRENT_TIMESTAMP
       )
       ON CONFLICT (user_id, tax_id, branch_type, branch_code)
       DO UPDATE SET
         entity_type = EXCLUDED.entity_type,
         company_or_name = EXCLUDED.company_or_name,
         address_line = EXCLUDED.address_line,
         address_village = EXCLUDED.address_village,
         street = EXCLUDED.street,
         subdistrict = EXCLUDED.subdistrict,
         district = EXCLUDED.district,
         province = EXCLUDED.province,
         postal_code = EXCLUDED.postal_code,
         contact_email = EXCLUDED.contact_email,
         contact_phone = EXCLUDED.contact_phone,
         is_default = TRUE,
         updated_at = CURRENT_TIMESTAMP`,
      [
        userId,
        data.entityType,
        data.taxId,
        data.companyOrName,
        branchType,
        branchCode,
        data.addressLine,
        addressOptional(data.addressVillage),
        addressOptional(data.street),
        data.subdistrict,
        data.district,
        data.province,
        data.postalCode,
        data.contactEmail,
        data.contactPhone,
      ],
    );
  }

  private calculationFromInvoice(
    invoice: InvoicePdfRow,
    lines: readonly InvoiceLineRow[],
  ): TaxCalculationResult {
    const nonVatCents = this.amountToCents(invoice.non_vat_amount);
    const vatableCents = this.amountToCents(invoice.vatable_amount);
    const vatCents = this.amountToCents(invoice.vat_amount);
    const totalCents = this.amountToCents(invoice.total_amount);
    const vatNetCents = vatableCents - vatCents;
    return {
      lines: lines.map((line) => ({
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unit_price,
        grossAmount: line.gross_amount,
        productVariantId: null,
        vatCategory: line.vat_category,
      })),
      nonVatAmount: this.formatCents(nonVatCents),
      vatableAmount: this.formatCents(vatableCents),
      vatableNetAmount: this.formatCents(vatNetCents),
      vatAmount: this.formatCents(vatCents),
      shippingFee: "0.00",
      totalAmount: this.formatCents(totalCents),
    };
  }

  private amountToCents(value: string): bigint {
    const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value);
    if (!match) {
      throw new TaxInvoiceError(500, "INVALID_TAX_INVOICE_AMOUNT", "ยอดเงินในใบกำกับภาษีไม่ถูกต้อง");
    }
    return BigInt(match[1]) * 100n + BigInt((match[2] ?? "").padEnd(2, "0") || "0");
  }

  private formatCents(value: bigint): string {
    return `${value / 100n}.${String(value % 100n).padStart(2, "0")}`;
  }
}

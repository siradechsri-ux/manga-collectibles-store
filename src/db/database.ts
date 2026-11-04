import fs from "node:fs";
import path from "node:path";
import { EventEmitter } from "node:events";
import bcrypt from "bcryptjs";
import { Pool, PoolClient, QueryResult } from "pg";
import { PGlite, types as pgliteTypes } from "@electric-sql/pglite";
import {
  BOOK_COVER_ADDON_UNIT_PRICE,
  BOOK_COVER_ADDON_VARIANT_ID,
} from "../mocks/products.mock";
import { getAdminProductsCatalog } from "../mocks/admin-products.mock";
import {
  createDemoOrders,
  makeShipments,
  makeTimeline,
  type MockStoredOrder,
} from "../mocks/storage.mock";
import {
  DEFAULT_KUJI_CONFIG,
  DEFAULT_KUJI_PRIZES,
} from "../services/kuji.service";

const BCRYPT_ROUNDS = 10;

class PGlitePoolAdapter extends EventEmitter {
  private lockQueue: Promise<void> = Promise.resolve();

  constructor(private readonly db: PGlite) {
    super();
  }

  private acquireLock(): Promise<() => void> {
    let releaseFn!: () => void;
    const nextLock = new Promise<void>((resolve) => {
      releaseFn = resolve;
    });
    const waitForPrev = this.lockQueue;
    this.lockQueue = this.lockQueue.then(() => nextLock);
    return waitForPrev.then(() => releaseFn);
  }

  private async executeRawQuery<R extends Record<string, any> = any>(
    textOrConfig: string | { text: string; values?: unknown[] },
    values?: unknown[],
  ): Promise<QueryResult<R>> {
    const sql = typeof textOrConfig === "string" ? textOrConfig : textOrConfig.text;
    const params =
      typeof textOrConfig === "string"
        ? values ?? []
        : textOrConfig.values ?? values ?? [];

    const trimmed = sql.trim();
    const isMultiCommand =
      params.length === 0 &&
      trimmed.includes(";") &&
      trimmed.indexOf(";") < trimmed.length - 1;
    const res = isMultiCommand
      ? ((await this.db.exec<R>(trimmed)).at(-1) ?? {
          rows: [] as R[],
          affectedRows: 0,
          fields: [],
        })
      : await this.db.query<R>(trimmed, params as any[]);
    return {
      command: trimmed.split(/\s+/)[0]?.toUpperCase() ?? "SELECT",
      rowCount: res.rows.length > 0 ? res.rows.length : (res.affectedRows ?? 0),
      oid: 0,
      rows: res.rows,
      fields: (res.fields ?? []).map((f) => ({
        name: f.name,
        tableID: 0,
        columnID: 0,
        dataTypeID: f.dataTypeID,
        dataTypeSize: -1,
        dataTypeModifier: -1,
        format: "text",
      })),
    };
  }

  async query<R extends Record<string, any> = any>(
    textOrConfig: string | { text: string; values?: unknown[] },
    values?: unknown[],
  ): Promise<QueryResult<R>> {
    const release = await this.acquireLock();
    try {
      return await this.executeRawQuery<R>(textOrConfig, values);
    } finally {
      release();
    }
  }

  async connect(): Promise<PoolClient> {
    const releaseLock = await this.acquireLock();
    let released = false;

    const client = {
      query: async <R extends Record<string, any> = any>(
        textOrConfig: string | { text: string; values?: unknown[] },
        values?: unknown[],
      ): Promise<QueryResult<R>> => {
        return this.executeRawQuery<R>(textOrConfig, values);
      },
      release: () => {
        if (!released) {
          released = true;
          releaseLock();
        }
      },
    };

    return client as unknown as PoolClient;
  }

  async end(): Promise<void> {
    await this.db.close();
  }
}

const BOOTSTRAP_DDL = `
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('CUSTOMER', 'STAFF', 'FINANCE', 'ADMIN');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PreorderReleaseStatus') THEN
    CREATE TYPE "PreorderReleaseStatus" AS ENUM ('OnSchedule', 'Delayed', 'Arrived');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentType') THEN
    CREATE TYPE "PaymentType" AS ENUM ('FULL', 'DEPOSIT');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BalancePaidStatus') THEN
    CREATE TYPE "BalancePaidStatus" AS ENUM ('PENDING', 'PAID');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ShippingCarrier') THEN
    CREATE TYPE "ShippingCarrier" AS ENUM ('FLASH', 'THAI_POST');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProductWaitlistStatus') THEN
    CREATE TYPE "ProductWaitlistStatus" AS ENUM ('WAITING', 'OFFERED', 'CONVERTED', 'EXPIRED', 'CANCELLED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WaitlistNotificationStatus') THEN
    CREATE TYPE "WaitlistNotificationStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'CANCELLED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TaxEntityType') THEN
    CREATE TYPE "TaxEntityType" AS ENUM ('INDIVIDUAL', 'CORPORATION');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TaxBranchType') THEN
    CREATE TYPE "TaxBranchType" AS ENUM ('HEAD_OFFICE', 'BRANCH');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TaxInvoiceStatus') THEN
    CREATE TYPE "TaxInvoiceStatus" AS ENUM ('ISSUED', 'CANCELLED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TaxInvoiceVatCategory') THEN
    CREATE TYPE "TaxInvoiceVatCategory" AS ENUM ('VAT_EXEMPT', 'VAT_7');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  phone_number VARCHAR(20),
  role user_role NOT NULL DEFAULT 'CUSTOMER',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  line_user_id VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS publishers (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  name VARCHAR(200) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS manga_series (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  title VARCHAR(250) NOT NULL,
  slug VARCHAR(280) NOT NULL UNIQUE,
  publisher_id BIGINT NOT NULL REFERENCES publishers(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS manufacturers (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  name VARCHAR(200) NOT NULL UNIQUE,
  country VARCHAR(100),
  website_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS characters (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  series_name VARCHAR(250) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (name, series_name)
);

CREATE TABLE IF NOT EXISTS products (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  slug VARCHAR(300) NOT NULL UNIQUE,
  name VARCHAR(300) NOT NULL,
  product_type VARCHAR(20) NOT NULL,
  volume_number INTEGER,
  publisher_id BIGINT REFERENCES publishers(id) ON DELETE RESTRICT,
  series_id BIGINT REFERENCES manga_series(id) ON DELETE RESTRICT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_variants (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  option_name VARCHAR(150) NOT NULL,
  sku VARCHAR(100) UNIQUE,
  price NUMERIC(12, 2) NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  weight_grams NUMERIC(10, 2),
  availability_status VARCHAR(24) NOT NULL DEFAULT 'IN_STOCK',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (product_id, option_name)
);

CREATE TABLE IF NOT EXISTS preorders (
  product_variant_id BIGINT PRIMARY KEY REFERENCES product_variants(id) ON DELETE CASCADE,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  quota_limit BIGINT,
  booked_count BIGINT NOT NULL DEFAULT 0,
  status VARCHAR(24) NOT NULL DEFAULT 'PREORDER_OPEN',
  allow_deposit BOOLEAN NOT NULL DEFAULT FALSE,
  deposit_amount NUMERIC(12, 2),
  full_price NUMERIC(12, 2) NOT NULL,
  preorder_deadline TIMESTAMPTZ,
  release_date TIMESTAMPTZ,
  release_month_year VARCHAR(7),
  release_status "PreorderReleaseStatus" NOT NULL DEFAULT 'OnSchedule'
);

CREATE TABLE IF NOT EXISTS figures_metadata (
  product_id BIGINT PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  manufacturer_id BIGINT NOT NULL REFERENCES manufacturers(id) ON DELETE RESTRICT,
  character_id BIGINT REFERENCES characters(id) ON DELETE SET NULL,
  scale VARCHAR(100) NOT NULL,
  height_mm INTEGER,
  material VARCHAR(200),
  sculptor VARCHAR(200),
  jan_code VARCHAR(13),
  box_width_cm NUMERIC(8, 2),
  box_length_cm NUMERIC(8, 2),
  box_height_cm NUMERIC(8, 2),
  actual_weight_kg NUMERIC(9, 3),
  warehouse_status VARCHAR(32) NOT NULL DEFAULT 'NOT_ARRIVED',
  arrived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shipping_rates (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  carrier "ShippingCarrier" NOT NULL,
  service_area_code VARCHAR(50) NOT NULL,
  min_billable_weight_kg NUMERIC(9, 3) NOT NULL DEFAULT 0,
  max_billable_weight_kg NUMERIC(9, 3),
  shipping_fee NUMERIC(12, 2) NOT NULL,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  effective_until TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL,
  order_number VARCHAR(100) NOT NULL UNIQUE,
  total_amount NUMERIC(12, 2) NOT NULL,
  shipping_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
  shipping_policy VARCHAR(100) NOT NULL,
  order_status VARCHAR(32) NOT NULL DEFAULT 'pending',
  payment_status VARCHAR(20) NOT NULL DEFAULT 'UNPAID',
  payment_type "PaymentType" NOT NULL DEFAULT 'FULL',
  amount_due_now NUMERIC(12, 2) NOT NULL DEFAULT 0,
  remaining_balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  balance_paid_status "BalancePaidStatus" NOT NULL DEFAULT 'PAID',
  balance_due_date TIMESTAMPTZ,
  immediate_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  remaining_balance_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  settlement_status VARCHAR(40) NOT NULL DEFAULT 'NOT_REQUIRED',
  balance_payment_reference VARCHAR(200),
  shipping_recipient_name VARCHAR(150),
  shipping_recipient_phone VARCHAR(30),
  shipping_address_line VARCHAR(300),
  shipping_address_village VARCHAR(100),
  shipping_street VARCHAR(150),
  shipping_subdistrict VARCHAR(120),
  shipping_district VARCHAR(120),
  shipping_province VARCHAR(120),
  shipping_postal_code CHAR(5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_variant_id BIGINT NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(12, 2) NOT NULL,
  is_preorder BOOLEAN NOT NULL DEFAULT FALSE,
  payment_type "PaymentType" NOT NULL DEFAULT 'FULL',
  remaining_balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  balance_paid_status "BalancePaidStatus" NOT NULL DEFAULT 'PAID',
  balance_due_date TIMESTAMPTZ,
  balance_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  settlement_status VARCHAR(40) NOT NULL DEFAULT 'NOT_REQUIRED',
  UNIQUE (order_id, product_variant_id)
);

CREATE TABLE IF NOT EXISTS bank_slips (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  payment_stage VARCHAR(16) NOT NULL,
  transaction_ref VARCHAR(200) NOT NULL UNIQUE,
  slip_hash CHAR(64) NOT NULL UNIQUE,
  receiver_account VARCHAR(64) NOT NULL,
  transfer_amount NUMERIC(12, 2) NOT NULL,
  transferred_at TIMESTAMPTZ NOT NULL,
  verification_provider VARCHAR(64) NOT NULL,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_waitlists (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  product_variant_id BIGINT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  queue_position BIGINT NOT NULL,
  status "ProductWaitlistStatus" NOT NULL DEFAULT 'WAITING',
  claim_token UUID,
  offer_expires_at TIMESTAMPTZ,
  offered_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (product_variant_id, user_id),
  UNIQUE (product_variant_id, queue_position)
);

CREATE TABLE IF NOT EXISTS waitlist_notification_outbox (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  waitlist_id BIGINT NOT NULL UNIQUE REFERENCES product_waitlists(id) ON DELETE CASCADE,
  status "WaitlistNotificationStatus" NOT NULL DEFAULT 'PENDING',
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  locked_until TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS tax_invoice_sequences (
  tax_month CHAR(6) PRIMARY KEY,
  last_number INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tax_invoices (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  order_id BIGINT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE RESTRICT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  invoice_number VARCHAR(24) NOT NULL UNIQUE,
  entity_type "TaxEntityType" NOT NULL,
  tax_id CHAR(13) NOT NULL,
  company_or_name VARCHAR(200) NOT NULL,
  branch_type "TaxBranchType",
  branch_code CHAR(5),
  address_line VARCHAR(300) NOT NULL,
  address_village VARCHAR(100),
  street VARCHAR(150),
  subdistrict VARCHAR(120) NOT NULL,
  district VARCHAR(120) NOT NULL,
  province VARCHAR(120) NOT NULL,
  postal_code CHAR(5) NOT NULL,
  contact_email VARCHAR(320) NOT NULL,
  contact_phone VARCHAR(30) NOT NULL,
  non_vat_amount NUMERIC(14, 2) NOT NULL,
  vatable_amount NUMERIC(14, 2) NOT NULL,
  vat_amount NUMERIC(14, 2) NOT NULL,
  total_amount NUMERIC(14, 2) NOT NULL,
  pdf_file_url TEXT,
  pdf_storage_key VARCHAR(500),
  status "TaxInvoiceStatus" NOT NULL DEFAULT 'ISSUED',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tax_invoice_items (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  tax_invoice_id BIGINT NOT NULL REFERENCES tax_invoices(id) ON DELETE RESTRICT,
  product_variant_id BIGINT REFERENCES product_variants(id) ON DELETE SET NULL,
  description VARCHAR(300) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(14, 2) NOT NULL,
  gross_amount NUMERIC(14, 2) NOT NULL,
  vat_category "TaxInvoiceVatCategory" NOT NULL
);

CREATE TABLE IF NOT EXISTS user_tax_profiles (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type "TaxEntityType" NOT NULL,
  tax_id CHAR(13) NOT NULL,
  company_or_name VARCHAR(200) NOT NULL,
  branch_type "TaxBranchType",
  branch_code CHAR(5),
  address_line VARCHAR(300) NOT NULL,
  address_village VARCHAR(100),
  street VARCHAR(150),
  subdistrict VARCHAR(120) NOT NULL,
  district VARCHAR(120) NOT NULL,
  province VARCHAR(120) NOT NULL,
  postal_code CHAR(5) NOT NULL,
  contact_email VARCHAR(320) NOT NULL,
  contact_phone VARCHAR(30) NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE NULLS NOT DISTINCT (user_id, tax_id, branch_type, branch_code)
);

CREATE TABLE IF NOT EXISTS order_tax_invoice_requests (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  order_id BIGINT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type "TaxEntityType" NOT NULL,
  tax_id CHAR(13) NOT NULL,
  company_or_name VARCHAR(200) NOT NULL,
  branch_type "TaxBranchType",
  branch_code CHAR(5),
  address_line VARCHAR(300) NOT NULL,
  address_village VARCHAR(100),
  street VARCHAR(150),
  subdistrict VARCHAR(120) NOT NULL,
  district VARCHAR(120) NOT NULL,
  province VARCHAR(120) NOT NULL,
  postal_code CHAR(5) NOT NULL,
  contact_email VARCHAR(320) NOT NULL,
  contact_phone VARCHAR(30) NOT NULL,
  save_for_next_time BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Extended Database Tables for Rich Order Tracking, Loyalty Points, Wishlist & Kuji
CREATE TABLE IF NOT EXISTS order_snapshots (
  order_id BIGINT PRIMARY KEY,
  owner_user_id INTEGER,
  snapshot_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_points (
  user_id INTEGER PRIMARY KEY,
  points INTEGER NOT NULL DEFAULT 450,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS points_ledger (
  id VARCHAR(100) PRIMARY KEY,
  user_id INTEGER NOT NULL,
  tx_type VARCHAR(50) NOT NULL,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description TEXT NOT NULL,
  reference_id VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_wishlists (
  user_id INTEGER NOT NULL,
  item_id VARCHAR(100) NOT NULL,
  item_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, item_id)
);

CREATE TABLE IF NOT EXISTS kuji_box_state (
  id INTEGER PRIMARY KEY DEFAULT 1,
  config_json JSONB NOT NULL,
  prizes_json JSONB NOT NULL,
  history_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`;

async function seedDatabase(pool: Pool): Promise<void> {
  // 1. Seed Users (both standard example users and test role switcher users)
  const defaultPasswordHash = await bcrypt.hash("password123", BCRYPT_ROUNDS);
  const adminExampleHash = await bcrypt.hash("admin1234", BCRYPT_ROUNDS);
  const userExampleHash = await bcrypt.hash("user1234", BCRYPT_ROUNDS);

  const seedUsers = [
    { id: 1, email: "admin@example.com", hash: adminExampleHash, fullName: "Store Administrator", role: "ADMIN" },
    { id: 2, email: "customer@example.com", hash: userExampleHash, fullName: "Sample Customer", role: "CUSTOMER" },
    { id: 9001, email: "customer@test.com", hash: defaultPasswordHash, fullName: "ลูกค้าทดสอบ", role: "CUSTOMER" },
    { id: 9002, email: "admin@test.com", hash: defaultPasswordHash, fullName: "ผู้ดูแลระบบ", role: "ADMIN" },
    { id: 9003, email: "staff@test.com", hash: defaultPasswordHash, fullName: "พนักงานคลังสินค้า", role: "STAFF" },
    { id: 9004, email: "finance@test.com", hash: defaultPasswordHash, fullName: "เจ้าหน้าที่การเงิน", role: "FINANCE" },
  ];

  for (const u of seedUsers) {
    await pool.query(
      `INSERT INTO users (id, email, password_hash, full_name, role, is_active)
       VALUES ($1, $2, $3, $4, $5::user_role, TRUE)
       ON CONFLICT (id) DO UPDATE SET
         email = EXCLUDED.email,
         full_name = EXCLUDED.full_name,
         role = EXCLUDED.role,
         is_active = TRUE`,
      [u.id, u.email, u.hash, u.fullName, u.role],
    );
  }
  await pool.query(
    `SELECT setval(pg_get_serial_sequence('users', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM users), 9010))`,
  );

  // 2. Seed Shipping Rates (covering 0 up to 999 kg)
  const existingRates = await pool.query(`SELECT COUNT(*)::int AS cnt FROM shipping_rates`);
  if ((existingRates.rows[0]?.cnt ?? 0) === 0) {
    const carriers = ["FLASH", "THAI_POST"] as const;
    const tiers = [
      { min: "0.000", max: "0.501", fee: "40.00" },
      { min: "0.501", max: "1.001", fee: "60.00" },
      { min: "1.001", max: "2.001", fee: "80.00" },
      { min: "2.001", max: "999.000", fee: "120.00" },
    ];
    for (const carrier of carriers) {
      for (const tier of tiers) {
        await pool.query(
          `INSERT INTO shipping_rates (carrier, service_area_code, min_billable_weight_kg, max_billable_weight_kg, shipping_fee, effective_from, is_active)
           VALUES ($1::"ShippingCarrier", '*', $2, $3, $4, '2025-01-01T00:00:00Z', TRUE)`,
          [carrier, tier.min, tier.max, tier.fee],
        );
      }
    }
  }

  // 3. Seed Full Catalog Variants into PostgreSQL
  const variantCountRes = await pool.query(`SELECT COUNT(*)::int AS cnt FROM product_variants`);
  if ((variantCountRes.rows[0]?.cnt ?? 0) < 10) {
    const catalog = getAdminProductsCatalog();
    const preorderStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const preorderEnd = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();
    const preorderDeadline = new Date(Date.now() + 150 * 24 * 60 * 60 * 1000).toISOString();

    // Helper for publisher
    const publisherCache = new Map<string, number>();
    async function ensurePublisher(name: string): Promise<number> {
      const clean = name.trim() || "General Publisher";
      if (publisherCache.has(clean)) return publisherCache.get(clean)!;
      const res = await pool.query<{ id: string }>(
        `INSERT INTO publishers (name) VALUES ($1)
         ON CONFLICT (name) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
         RETURNING id::text`,
        [clean],
      );
      const id = Number(res.rows[0].id);
      publisherCache.set(clean, id);
      return id;
    }

    // Helper for manufacturer
    const manufacturerCache = new Map<string, number>();
    async function ensureManufacturer(name: string): Promise<number> {
      const clean = name.trim() || "Good Smile Company";
      if (manufacturerCache.has(clean)) return manufacturerCache.get(clean)!;
      const res = await pool.query<{ id: string }>(
        `INSERT INTO manufacturers (name, country) VALUES ($1, 'Japan')
         ON CONFLICT (name) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
         RETURNING id::text`,
        [clean],
      );
      const id = Number(res.rows[0].id);
      manufacturerCache.set(clean, id);
      return id;
    }

    // Seed Manga & Light Novel Series + Volumes
    const allBookSeries = [
      ...catalog.mangaSeries,
      ...(catalog.lightNovelSeries ?? []),
    ];
    for (const series of allBookSeries) {
      const pubId = await ensurePublisher(series.publisher);
      const seriesRes = await pool.query<{ id: string }>(
        `INSERT INTO manga_series (title, slug, publisher_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title
         RETURNING id::text`,
        [series.title, series.id, pubId],
      );
      const seriesDbId = Number(seriesRes.rows[0].id);

      for (const vol of series.volumes) {
        const prodSlug = `${series.id}-vol-${vol.volumeNumber}-var-${vol.id}`;
        const prodRes = await pool.query<{ id: string }>(
          `INSERT INTO products (slug, name, product_type, volume_number, publisher_id, series_id, is_active)
           VALUES ($1, $2, 'MANGA', $3, $4, $5, TRUE)
           ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
           RETURNING id::text`,
          [prodSlug, vol.title, vol.volumeNumber, pubId, seriesDbId],
        );
        const prodId = Number(prodRes.rows[0].id);
        const isPreorder = vol.status === "PREORDER";
        const availStatus = isPreorder
          ? "PREORDER_CLOSED"
          : vol.stock > 0
            ? "IN_STOCK"
            : "OUT_OF_STOCK";

        await pool.query(
          `INSERT INTO product_variants (id, product_id, option_name, sku, price, stock_quantity, weight_grams, availability_status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO UPDATE SET
             price = EXCLUDED.price,
             stock_quantity = EXCLUDED.stock_quantity`,
          [
            vol.id,
            prodId,
            vol.variantLabel || vol.title || "ปกติ",
            `SKU-BOOK-${vol.id}`,
            vol.price.toFixed(2),
            isPreorder ? 0 : vol.stock,
            String(vol.weightGrams ?? 250),
            availStatus,
          ],
        );

        if (isPreorder) {
          await pool.query(
            `INSERT INTO preorders (product_variant_id, start_date, end_date, quota_limit, booked_count, status, allow_deposit, full_price, preorder_deadline, release_month_year)
             VALUES ($1, $2, $3, $4, 0, 'PREORDER_OPEN', FALSE, $5, $6, '2026-12')
             ON CONFLICT (product_variant_id) DO NOTHING`,
            [vol.id, preorderStart, preorderEnd, Math.max(vol.stock, 50), vol.price.toFixed(2), preorderDeadline],
          );
        }
      }
    }

    // Seed Figures & Plamo (stored with figures_metadata so is_figure = true)
    const allFigureLike = [
      ...catalog.figures,
      ...(catalog.plamo ?? []),
    ];
    for (const fig of allFigureLike) {
      const variantId = Number(fig.id);
      if (!Number.isSafeInteger(variantId) || variantId <= 0) continue;
      const mfgId = await ensureManufacturer(fig.manufacturer);
      const prodSlug = `${fig.slug}-${variantId}`;
      const prodRes = await pool.query<{ id: string }>(
        `INSERT INTO products (slug, name, product_type, is_active)
         VALUES ($1, $2, 'FIGURE', TRUE)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
         RETURNING id::text`,
        [prodSlug, fig.name],
      );
      const prodId = Number(prodRes.rows[0].id);
      const isPreorder = fig.status === "PREORDER_OPEN";
      const availStatus = isPreorder
        ? "PREORDER_CLOSED"
        : fig.stockOrQuotaRemaining > 0
          ? "IN_STOCK"
          : "OUT_OF_STOCK";

      await pool.query(
        `INSERT INTO product_variants (id, product_id, option_name, sku, price, stock_quantity, weight_grams, availability_status)
         VALUES ($1, $2, 'Standard', $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           price = EXCLUDED.price,
           stock_quantity = EXCLUDED.stock_quantity`,
        [
          variantId,
          prodId,
          `SKU-FIG-${variantId}`,
          fig.fullPrice.toFixed(2),
          isPreorder ? 0 : fig.stockOrQuotaRemaining,
          String(fig.weightGrams ?? 600),
          availStatus,
        ],
      );

      const weightKg = ((fig.weightGrams ?? 600) / 1000).toFixed(3);
      await pool.query(
        `INSERT INTO figures_metadata (product_id, manufacturer_id, scale, height_mm, box_width_cm, box_length_cm, box_height_cm, actual_weight_kg, warehouse_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'NOT_ARRIVED')
         ON CONFLICT (product_id) DO NOTHING`,
        [
          prodId,
          mfgId,
          fig.scale || "1/7",
          Math.max(fig.heightMm || 150, 50),
          String(fig.boxDimensions?.widthCm ?? 20),
          String(fig.boxDimensions?.lengthCm ?? 20),
          String(fig.boxDimensions?.heightCm ?? 25),
          weightKg,
        ],
      );

      if (isPreorder || fig.depositAmount > 0) {
        const allowDep = fig.depositAmount > 0 && fig.depositAmount < fig.fullPrice;
        await pool.query(
          `INSERT INTO preorders (product_variant_id, start_date, end_date, quota_limit, booked_count, status, allow_deposit, deposit_amount, full_price, preorder_deadline, release_month_year)
           VALUES ($1, $2, $3, $4, 0, $5, $6, $7, $8, $9, '2026-12')
           ON CONFLICT (product_variant_id) DO NOTHING`,
          [
            variantId,
            preorderStart,
            preorderEnd,
            Math.max(fig.stockOrQuotaRemaining, 20),
            isPreorder ? "PREORDER_OPEN" : "PREORDER_CLOSED",
            allowDep,
            allowDep ? fig.depositAmount.toFixed(2) : null,
            fig.fullPrice.toFixed(2),
            preorderDeadline,
          ],
        );
      }
    }

    // Seed Goods & Accessories (stored as non-figure products so is_figure = false)
    const defaultPubId = await ensurePublisher("Chansasom Goods & Accessories");
    const miscSeriesRes = await pool.query<{ id: string }>(
      `INSERT INTO manga_series (title, slug, publisher_id)
       VALUES ('Goods & Collectibles Accessories', 'goods-and-accessories-master', $1)
       ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title
       RETURNING id::text`,
      [defaultPubId],
    );
    const miscSeriesId = Number(miscSeriesRes.rows[0].id);

    const allGoodsAndAccessories = [
      ...(catalog.goods ?? []),
      ...(catalog.accessories ?? []),
    ];
    for (const item of allGoodsAndAccessories) {
      const variantId = Number(item.id);
      if (!Number.isSafeInteger(variantId) || variantId <= 0) continue;
      const prodSlug = `${item.slug}-${variantId}`;
      const prodRes = await pool.query<{ id: string }>(
        `INSERT INTO products (slug, name, product_type, volume_number, publisher_id, series_id, is_active)
         VALUES ($1, $2, 'MANGA', 1, $3, $4, TRUE)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
         RETURNING id::text`,
        [prodSlug, item.name, defaultPubId, miscSeriesId],
      );
      const prodId = Number(prodRes.rows[0].id);
      await pool.query(
        `INSERT INTO product_variants (id, product_id, option_name, sku, price, stock_quantity, weight_grams, availability_status)
         VALUES ($1, $2, 'Standard', $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           price = EXCLUDED.price,
           stock_quantity = EXCLUDED.stock_quantity`,
        [
          variantId,
          prodId,
          `SKU-MISC-${variantId}`,
          item.fullPrice.toFixed(2),
          item.stockOrQuotaRemaining,
          String(item.weightGrams ?? 150),
          item.stockOrQuotaRemaining > 0 ? "IN_STOCK" : "OUT_OF_STOCK",
        ],
      );
    }

    // Seed Book Cover Add-on (Variant ID 99999)
    const addonProdRes = await pool.query<{ id: string }>(
      `INSERT INTO products (slug, name, product_type, volume_number, publisher_id, series_id, is_active)
       VALUES ('book-cover-addon-99999', 'ปกพลาสติกสำเร็จรูปถนอมหนังสือ', 'MANGA', 1, $1, $2, TRUE)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id::text`,
      [defaultPubId, miscSeriesId],
    );
    const addonProdId = Number(addonProdRes.rows[0].id);
    await pool.query(
      `INSERT INTO product_variants (id, product_id, option_name, sku, price, stock_quantity, weight_grams, availability_status)
       VALUES ($1, $2, 'Standard', 'SKU-BOOK-COVER-99999', $3, 99999, '10.00', 'IN_STOCK')
       ON CONFLICT (id) DO NOTHING`,
      [BOOK_COVER_ADDON_VARIANT_ID, addonProdId, BOOK_COVER_ADDON_UNIT_PRICE.toFixed(2)],
    );

    await pool.query(
      `SELECT setval(pg_get_serial_sequence('product_variants', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM product_variants), 100000))`,
    );
  }

  // 4. Seed Demo Orders into orders & order_snapshots if empty
  const snapshotCountRes = await pool.query(`SELECT COUNT(*)::int AS cnt FROM order_snapshots`);
  if ((snapshotCountRes.rows[0]?.cnt ?? 0) === 0) {
    const demoOrders = createDemoOrders();
    for (const demo of demoOrders) {
      const orderId = demo.detail.id;
      const ownerId = demo.ownerUserId ?? 9001;
      await pool.query(
        `INSERT INTO orders (
           id, user_id, order_number, total_amount, shipping_fee, shipping_policy,
           order_status, payment_status, payment_type, amount_due_now, remaining_balance,
           balance_paid_status, balance_due_date, immediate_amount, remaining_balance_amount,
           settlement_status, created_at
         )
         VALUES ($1, $2, $3, $4, '40.00', 'SPLIT_SHIPMENT:FLASH:10110', $5, $6, $7::"PaymentType", $8, $9, $10::"BalancePaidStatus", $11, $8, $9, $12, $13)
         ON CONFLICT (id) DO NOTHING`,
        [
          orderId,
          ownerId,
          demo.detail.orderNumber,
          demo.detail.totalAmount.toFixed(2),
          demo.detail.status,
          demo.detail.paymentStatus === "DEPOSIT_FORFEITED"
            ? "DEPOSIT_FORFEITED"
            : demo.detail.paymentStatus,
          demo.detail.remainingBalance > 0 ? "DEPOSIT" : "FULL",
          demo.immediateAmount,
          demo.detail.remainingBalance.toFixed(2),
          demo.detail.remainingBalance > 0 ? "PENDING" : "PAID",
          demo.detail.balanceDueDate,
          demo.detail.status === "AWAITING_BALANCE_PAYMENT"
            ? "AWAITING_BALANCE_PAYMENT"
            : demo.detail.remainingBalance > 0
              ? "WAITING_FOR_ARRIVAL"
              : "NOT_REQUIRED",
          demo.detail.createdAt,
        ],
      );

      await pool.query(
        `INSERT INTO order_snapshots (order_id, owner_user_id, snapshot_json)
         VALUES ($1, $2, $3::jsonb)
         ON CONFLICT (order_id) DO NOTHING`,
        [orderId, ownerId, JSON.stringify(demo)],
      );
    }

    await pool.query(
      `SELECT setval(pg_get_serial_sequence('orders', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM orders), 92000000))`,
    );
  }

  // 5. Seed Initial Kuji Box State if empty
  const kujiCountRes = await pool.query(`SELECT COUNT(*)::int AS cnt FROM kuji_box_state`);
  if ((kujiCountRes.rows[0]?.cnt ?? 0) === 0) {
    await pool.query(
      `INSERT INTO kuji_box_state (id, config_json, prizes_json, history_json)
       VALUES (1, $1::jsonb, $2::jsonb, '[]'::jsonb)
       ON CONFLICT (id) DO NOTHING`,
      [JSON.stringify(DEFAULT_KUJI_CONFIG), JSON.stringify(DEFAULT_KUJI_PRIZES)],
    );
  }
}

export async function createDatabasePool(connectionString: string): Promise<Pool> {
  // 1. Try external PostgreSQL server first
  const externalPool = new Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX ?? 15),
    connectionTimeoutMillis: 1_500,
    idleTimeoutMillis: 30_000,
  });

  try {
    const client = await externalPool.connect();
    await client.query("SELECT 1");
    client.release();
    console.info("Connected to external PostgreSQL server.");
    await externalPool.query(BOOTSTRAP_DDL);
    await seedDatabase(externalPool);
    return externalPool;
  } catch {
    await externalPool.end().catch(() => undefined);
    console.info(
      "External PostgreSQL on port 5432 not detected; starting embedded persistent PostgreSQL (PGlite) in .data/pglite ...",
    );
  }

  // 2. Fallback to embedded persistent PGlite PostgreSQL engine
  const dataDir = path.resolve(process.cwd(), ".data/pglite");
  fs.mkdirSync(dataDir, { recursive: true });

  const pgLite = await PGlite.create({
    dataDir,
    parsers: {
      // Match node-postgres behavior: return BIGINT (INT8, OID 20) and NUMERIC (OID 1700) as strings
      [pgliteTypes.INT8]: (val: string) => String(val),
      [pgliteTypes.NUMERIC]: (val: string) => String(val),
    },
  });

  const adapterPool = new PGlitePoolAdapter(pgLite) as unknown as Pool;
  await adapterPool.query(BOOTSTRAP_DDL);
  await seedDatabase(adapterPool);
  console.info("Embedded PostgreSQL database initialized and seeded.");
  return adapterPool;
}

export async function saveOrderSnapshotToDb(
  pool: Pool,
  order: MockStoredOrder,
): Promise<void> {
  const orderId = order.detail.id;
  const ownerId = order.ownerUserId ?? 9001;
  await pool.query(
    `INSERT INTO order_snapshots (order_id, owner_user_id, snapshot_json, updated_at)
     VALUES ($1, $2, $3::jsonb, CURRENT_TIMESTAMP)
     ON CONFLICT (order_id) DO UPDATE SET
       owner_user_id = EXCLUDED.owner_user_id,
       snapshot_json = EXCLUDED.snapshot_json,
       updated_at = CURRENT_TIMESTAMP`,
    [orderId, ownerId, JSON.stringify(order)],
  );
}

export async function getOrderSnapshotFromDb(
  pool: Pool,
  orderId: number,
): Promise<MockStoredOrder | null> {
  const res = await pool.query<{ snapshot_json: MockStoredOrder }>(
    `SELECT snapshot_json FROM order_snapshots WHERE order_id = $1`,
    [orderId],
  );
  if (res.rows.length > 0 && res.rows[0].snapshot_json) {
    return res.rows[0].snapshot_json;
  }
  return null;
}

export async function listOrderSnapshotsFromDb(
  pool: Pool,
  userId?: number,
): Promise<MockStoredOrder[]> {
  const res = userId
    ? await pool.query<{ snapshot_json: MockStoredOrder }>(
        `SELECT snapshot_json FROM order_snapshots WHERE owner_user_id = $1 ORDER BY order_id DESC`,
        [userId],
      )
    : await pool.query<{ snapshot_json: MockStoredOrder }>(
        `SELECT snapshot_json FROM order_snapshots ORDER BY order_id DESC`,
      );
  return res.rows.map((r) => r.snapshot_json);
}

export { makeShipments, makeTimeline };

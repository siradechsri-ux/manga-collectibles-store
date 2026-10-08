ALTER TABLE product_variants
  ADD COLUMN weight_grams NUMERIC(10, 2),
  ADD CONSTRAINT product_variants_weight_grams_positive
    CHECK (weight_grams IS NULL OR weight_grams > 0);

COMMENT ON COLUMN product_variants.weight_grams IS
  'Actual shipping weight per unit in grams, required for manga products during mixed checkout.';

ALTER TABLE orders
  ALTER COLUMN payment_status DROP DEFAULT,
  ALTER COLUMN payment_status TYPE VARCHAR(20)
    USING payment_status::text,
  ADD COLUMN immediate_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN remaining_balance_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD CONSTRAINT orders_immediate_amount_nonnegative
    CHECK (immediate_amount >= 0),
  ADD CONSTRAINT orders_remaining_balance_amount_nonnegative
    CHECK (remaining_balance_amount >= 0);

UPDATE orders
SET payment_status = CASE lower(payment_status)
  WHEN 'paid' THEN 'PAID'
  WHEN 'deposit_paid' THEN 'DEPOSIT_PAID'
  ELSE 'UNPAID'
END;

ALTER TABLE orders
  ALTER COLUMN payment_status SET DEFAULT 'UNPAID',
  ADD CONSTRAINT orders_payment_status_allowed
    CHECK (payment_status IN ('UNPAID', 'PAID', 'DEPOSIT_PAID'));

ALTER TABLE order_items
  ADD COLUMN balance_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD CONSTRAINT order_items_balance_amount_nonnegative
    CHECK (balance_amount >= 0);

COMMENT ON COLUMN orders.immediate_amount IS
  'Amount charged at initial checkout, including shipping.';
COMMENT ON COLUMN orders.remaining_balance_amount IS
  'Total balance to be collected when preorder products arrive.';
COMMENT ON COLUMN order_items.balance_amount IS
  'Remaining balance for this order line.';

CREATE INDEX orders_payment_status_idx
  ON orders (payment_status);

CREATE INDEX order_items_payment_type_balance_amount_idx
  ON order_items (payment_type, balance_amount)
  WHERE balance_amount > 0;

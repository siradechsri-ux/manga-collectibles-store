ALTER TABLE figures_metadata
  ADD COLUMN warehouse_status VARCHAR(32) NOT NULL DEFAULT 'NOT_ARRIVED',
  ADD COLUMN arrived_at TIMESTAMPTZ,
  ADD CONSTRAINT figures_metadata_warehouse_status_allowed
    CHECK (
      warehouse_status IN (
        'NOT_ARRIVED',
        'ARRIVED_IN_WAREHOUSE'
      )
    ),
  ADD CONSTRAINT figures_metadata_arrived_at_consistent
    CHECK (
      (warehouse_status = 'NOT_ARRIVED' AND arrived_at IS NULL)
      OR (warehouse_status = 'ARRIVED_IN_WAREHOUSE' AND arrived_at IS NOT NULL)
    );

ALTER TABLE orders
  ADD COLUMN settlement_status VARCHAR(40) NOT NULL DEFAULT 'NOT_REQUIRED',
  ADD COLUMN balance_payment_reference VARCHAR(200),
  ADD CONSTRAINT orders_settlement_status_allowed
    CHECK (
      settlement_status IN (
        'NOT_REQUIRED',
        'WAITING_FOR_ARRIVAL',
        'AWAITING_BALANCE_PAYMENT',
        'READY_TO_PACK',
        'DEPOSIT_FORFEITED'
      )
    );

ALTER TABLE order_items
  ADD COLUMN settlement_status VARCHAR(40) NOT NULL DEFAULT 'NOT_REQUIRED',
  ADD CONSTRAINT order_items_settlement_status_allowed
    CHECK (
      settlement_status IN (
        'NOT_REQUIRED',
        'WAITING_FOR_ARRIVAL',
        'AWAITING_BALANCE_PAYMENT',
        'PAID',
        'DEPOSIT_FORFEITED'
      )
    );

ALTER TABLE orders
  DROP CONSTRAINT orders_payment_status_allowed,
  ADD CONSTRAINT orders_payment_status_allowed
    CHECK (
      payment_status IN (
        'UNPAID',
        'PAID',
        'DEPOSIT_PAID',
        'DEPOSIT_FORFEITED'
      )
    );

CREATE UNIQUE INDEX orders_balance_payment_reference_unique
  ON orders (balance_payment_reference)
  WHERE balance_payment_reference IS NOT NULL;

CREATE INDEX orders_balance_settlement_due_idx
  ON orders (balance_due_date, id)
  WHERE settlement_status = 'AWAITING_BALANCE_PAYMENT'
    AND remaining_balance_amount > 0;

CREATE INDEX order_items_variant_settlement_idx
  ON order_items (product_variant_id, settlement_status, payment_type)
  WHERE payment_type = 'DEPOSIT';

COMMENT ON COLUMN orders.balance_payment_reference IS
  'Unique successful payment-provider transaction reference used to settle the order balance idempotently.';
COMMENT ON COLUMN orders.settlement_status IS
  'Fulfillment and deposit-balance lifecycle, independent from the general order status.';

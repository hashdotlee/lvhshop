-- Migration 029: Add discount fields

ALTER TABLE items
  ADD COLUMN IF NOT EXISTS discount_percent INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_end_date TIMESTAMPTZ;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS shipping_discount INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS item_discount INTEGER DEFAULT 0;

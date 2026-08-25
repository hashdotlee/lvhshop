-- Migration 028: Add shipping_fee and is_free_shipping to orders

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS shipping_fee INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_free_shipping BOOLEAN DEFAULT FALSE;

-- Update carriers: we now support 'vnpost' and 'spx'
-- (existing 'viettelpost'/'other' values are kept for backward compatibility)

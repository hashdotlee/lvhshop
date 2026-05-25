-- Add order_code to order_items so staff can see which inventory item code is assigned
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS order_code text;

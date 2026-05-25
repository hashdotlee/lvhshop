-- Ensure order_items table exists with correct columns
CREATE TABLE IF NOT EXISTS order_items (
  id bigserial PRIMARY KEY,
  order_id bigint NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_id bigint REFERENCES items(id) ON DELETE SET NULL,
  item_title text NOT NULL,
  item_price bigint,
  quantity int NOT NULL DEFAULT 1,
  order_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add order_code column if missing (idempotent)
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS order_code text;

-- Re-apply RLS policies so insert/update/delete work with publishable key
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_items select" ON order_items;
DROP POLICY IF EXISTS "order_items insert" ON order_items;
DROP POLICY IF EXISTS "order_items update" ON order_items;
DROP POLICY IF EXISTS "order_items delete" ON order_items;

CREATE POLICY "order_items select" ON order_items FOR SELECT USING (true);
CREATE POLICY "order_items insert" ON order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "order_items update" ON order_items FOR UPDATE USING (true);
CREATE POLICY "order_items delete" ON order_items FOR DELETE USING (true);

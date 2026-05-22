-- Multiple items per order
CREATE TABLE IF NOT EXISTS order_items (
  id bigserial PRIMARY KEY,
  order_id bigint NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_id bigint REFERENCES items(id) ON DELETE SET NULL,
  item_title text NOT NULL,
  item_price bigint,
  quantity int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "order_items select" ON order_items;
DROP POLICY IF EXISTS "order_items insert" ON order_items;
DROP POLICY IF EXISTS "order_items update" ON order_items;
DROP POLICY IF EXISTS "order_items delete" ON order_items;
CREATE POLICY "order_items select" ON order_items FOR SELECT USING (true);
CREATE POLICY "order_items insert" ON order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "order_items update" ON order_items FOR UPDATE USING (true);
CREATE POLICY "order_items delete" ON order_items FOR DELETE USING (true);

-- Facebook URL for customer (for admin to click & message manually)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fb_url text;

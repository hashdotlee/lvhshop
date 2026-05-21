-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id bigserial PRIMARY KEY,
  order_number text UNIQUE,
  item_id bigint REFERENCES items(id) ON DELETE SET NULL,
  item_title text,
  item_price bigint,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_address text NOT NULL,
  customer_note text,
  shipping_carrier text DEFAULT 'spx',
  tracking_number text,
  payment_method text NOT NULL DEFAULT 'cod',
  payment_status text NOT NULL DEFAULT 'pending',
  order_status text NOT NULL DEFAULT 'pending',
  total_amount bigint,
  fb_psid text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check CHECK (payment_method IN ('cod', 'bank_transfer'));
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check CHECK (payment_status IN ('pending', 'verified', 'failed'));
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (order_status IN ('pending', 'confirmed', 'shipping', 'delivered', 'cancelled'));

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE num text; attempts int := 0;
BEGIN
  LOOP
    num := 'DH-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substring(md5(random()::text) from 1 for 4));
    IF NOT EXISTS (SELECT 1 FROM orders WHERE order_number = num) THEN
      NEW.order_number := num; RETURN NEW;
    END IF;
    attempts := attempts + 1;
    IF attempts > 20 THEN RAISE EXCEPTION 'Cannot generate unique order number'; END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_order_number ON orders;
CREATE TRIGGER set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW WHEN (NEW.order_number IS NULL)
  EXECUTE FUNCTION generate_order_number();

CREATE OR REPLACE FUNCTION update_orders_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_updated_at ON orders;
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_orders_timestamp();

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "orders select" ON orders;
DROP POLICY IF EXISTS "orders insert" ON orders;
DROP POLICY IF EXISTS "orders update" ON orders;
DROP POLICY IF EXISTS "orders delete" ON orders;
CREATE POLICY "orders select" ON orders FOR SELECT USING (true);
CREATE POLICY "orders insert" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "orders update" ON orders FOR UPDATE USING (true);
CREATE POLICY "orders delete" ON orders FOR DELETE USING (true);

-- Generate a unique shareable token for each order
ALTER TABLE orders ADD COLUMN IF NOT EXISTS share_token uuid DEFAULT gen_random_uuid();
-- Back-fill existing orders that got NULL (DEFAULT only applies to new rows)
UPDATE orders SET share_token = gen_random_uuid() WHERE share_token IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS orders_share_token_idx ON orders (share_token) WHERE share_token IS NOT NULL;

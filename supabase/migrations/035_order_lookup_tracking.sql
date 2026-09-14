-- Migration 035: Track order lookup count and last lookup timestamp
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS lookup_count int NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_lookup_at timestamptz;

-- Index to support filtering or sorting by lookup_count
CREATE INDEX IF NOT EXISTS idx_orders_lookup_count ON orders(lookup_count);

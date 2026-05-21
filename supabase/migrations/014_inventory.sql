-- ═══════════════════════════════════════════════════════
-- 014_inventory.sql - Quản lý kho hàng
-- ═══════════════════════════════════════════════════════

-- 1. Thêm cột quản lý kho vào bảng items
ALTER TABLE items ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS bin_location TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS cost_price BIGINT;

-- 2. Bảng lô hàng nhập
CREATE TABLE IF NOT EXISTS inventory_batches (
  id          BIGSERIAL PRIMARY KEY,
  batch_code  TEXT UNIQUE NOT NULL DEFAULT '',
  notes       TEXT,
  supplier    TEXT,
  staff_id    BIGINT REFERENCES staff(id) ON DELETE SET NULL,
  created_by  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-generate batch_code: LOT-YYYYMMDD-XXXX
CREATE OR REPLACE FUNCTION generate_batch_code()
RETURNS TRIGGER AS $$
DECLARE code TEXT; attempts INT := 0;
BEGIN
  LOOP
    code := 'LOT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
    IF NOT EXISTS (SELECT 1 FROM inventory_batches WHERE batch_code = code) THEN
      NEW.batch_code := code; RETURN NEW;
    END IF;
    attempts := attempts + 1;
    IF attempts > 20 THEN RAISE EXCEPTION 'Cannot generate unique batch code'; END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_batch_code ON inventory_batches;
CREATE TRIGGER set_batch_code
  BEFORE INSERT ON inventory_batches
  FOR EACH ROW WHEN (NEW.batch_code IS NULL OR NEW.batch_code = '')
  EXECUTE FUNCTION generate_batch_code();

-- 3. Liên kết items với lô hàng
ALTER TABLE items ADD COLUMN IF NOT EXISTS batch_id BIGINT REFERENCES inventory_batches(id) ON DELETE SET NULL;

-- 4. RLS cho inventory_batches
ALTER TABLE inventory_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "batches read"  ON inventory_batches;
DROP POLICY IF EXISTS "batches write" ON inventory_batches;
CREATE POLICY "batches read"  ON inventory_batches FOR SELECT USING (TRUE);
CREATE POLICY "batches write" ON inventory_batches FOR ALL USING (TRUE) WITH CHECK (TRUE);

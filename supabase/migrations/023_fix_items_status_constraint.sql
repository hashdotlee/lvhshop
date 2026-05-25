-- Ensure 'reserved' is a valid item status (idempotent)
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_status_check;
ALTER TABLE items ADD CONSTRAINT items_status_check
  CHECK (status IN ('available', 'sold', 'incoming', 'reserved'));

-- Re-apply permissive RLS for items so service-role-less environments still work
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read"   ON items;
DROP POLICY IF EXISTS "public insert" ON items;
DROP POLICY IF EXISTS "public update" ON items;
DROP POLICY IF EXISTS "public delete" ON items;
CREATE POLICY "public read"   ON items FOR SELECT USING (true);
CREATE POLICY "public insert" ON items FOR INSERT WITH CHECK (true);
CREATE POLICY "public update" ON items FOR UPDATE USING (true);
CREATE POLICY "public delete" ON items FOR DELETE USING (true);

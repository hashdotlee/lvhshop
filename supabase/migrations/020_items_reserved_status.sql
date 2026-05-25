-- Add 'reserved' status for items that are in an active order (temporarily hidden from public)
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_status_check;
ALTER TABLE items ADD CONSTRAINT items_status_check
  CHECK (status IN ('available', 'sold', 'incoming', 'reserved'));

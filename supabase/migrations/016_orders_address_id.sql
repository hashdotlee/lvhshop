ALTER TABLE orders ADD COLUMN address_id bigint REFERENCES customer_addresses(id) ON DELETE SET NULL;

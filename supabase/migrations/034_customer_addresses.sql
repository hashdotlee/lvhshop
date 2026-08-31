create table if not exists crm_customer_addresses (
  id bigserial primary key,
  customer_id bigint references customers(id) on delete cascade,
  address_type text not null default 'new',
  province text not null,
  district text,
  ward text not null,
  detail text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Bật RLS
alter table crm_customer_addresses enable row level security;
create policy "Cho phép tất cả trên crm_customer_addresses" on crm_customer_addresses for all using (true);

-- Chuyển đổi dữ liệu cũ sang bảng mới
DO $$
DECLARE
    c record;
    parts text[];
    plen int;
    prov text;
    dist text;
    war text;
    det text;
    atype text;
BEGIN
    FOR c IN SELECT * FROM customers WHERE address IS NOT NULL AND trim(address) != '' LOOP
        parts := string_to_array(c.address, ',');
        plen := array_length(parts, 1);
        
        -- Trim all parts
        FOR i IN 1..plen LOOP
            parts[i] := trim(parts[i]);
        END LOOP;

        IF plen >= 4 THEN
            prov := parts[plen];
            dist := parts[plen-1];
            war := parts[plen-2];
            -- Lấy tất cả phần còn lại làm chi tiết
            det := array_to_string(parts[1:plen-3], ', ');
            atype := 'old';
        ELSIF plen = 3 THEN
            prov := parts[plen];
            dist := '';
            war := parts[plen-1];
            det := parts[plen-2];
            atype := 'new';
        ELSE
            prov := '';
            dist := '';
            war := '';
            det := c.address;
            atype := 'new';
        END IF;

        -- Nếu rỗng do thiếu phần tử, gán tạm
        IF prov IS NULL OR prov = '' THEN prov := 'N/A'; END IF;
        IF war IS NULL OR war = '' THEN war := 'N/A'; END IF;
        IF det IS NULL OR det = '' THEN det := 'N/A'; END IF;

        INSERT INTO crm_customer_addresses (customer_id, address_type, province, district, ward, detail, is_default)
        VALUES (c.id, atype, prov, dist, war, det, true);
    END LOOP;
END $$;

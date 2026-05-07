-- ═══════════════════════════════════════════════════════
-- Chạy toàn bộ file này trong Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

-- 1. Bảng items
create table if not exists items (
  id          bigserial primary key,
  order_code  text unique,
  title       text        not null,
  description text,
  price       bigint,
  condition   text        not null default 'Cu - Con tot',
  category    text,
  type        text        not null check (type in ('ban','mua')),
  phone       text,
  location    text,
  image_url   text,
  status      text        not null default 'available',
  created_at  timestamptz not null default now()
);

alter table items add column if not exists image_url  text;
alter table items add column if not exists status     text not null default 'available';
alter table items add column if not exists order_code text;

alter table items alter column price drop default;
alter table items alter column price type bigint using (
  case
    when price is null then null
    when price::text ~ '^\d+$' then price::text::bigint
    when price::text ~ '[0-9]' then regexp_replace(price::text, '[^0-9]', '', 'g')::bigint
    else null
  end
);

-- Auto-generate order_code: ORD-YYYYMMDD-XXXX
create or replace function generate_order_code()
returns trigger as $$
declare code text; attempts int := 0;
begin
  loop
    code := 'ORD-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substring(md5(random()::text) from 1 for 4));
    if not exists (select 1 from items where order_code = code) then
      new.order_code := code; return new;
    end if;
    attempts := attempts + 1;
    if attempts > 20 then raise exception 'Cannot generate unique order code'; end if;
  end loop;
end;
$$ language plpgsql;

drop trigger if exists set_order_code on items;
create trigger set_order_code
  before insert on items
  for each row when (new.order_code is null)
  execute function generate_order_code();

alter table items enable row level security;
drop policy if exists "public read"   on items;
drop policy if exists "public insert" on items;
drop policy if exists "public delete" on items;
drop policy if exists "public update" on items;
create policy "public read"   on items for select using (true);
create policy "public insert" on items for insert with check (true);
create policy "public delete" on items for delete using (true);
create policy "public update" on items for update using (true);

-- 2. Bảng customers
create table if not exists customers (
  id         bigserial primary key,
  item_id    bigint references items(id) on delete set null,
  order_code text,
  name       text,
  phone      text,
  address    text,
  note       text,
  created_at timestamptz not null default now()
);

alter table customers enable row level security;
drop policy if exists "customers read"   on customers;
drop policy if exists "customers insert" on customers;
drop policy if exists "customers update" on customers;
drop policy if exists "customers delete" on customers;
create policy "customers read"   on customers for select using (true);
create policy "customers insert" on customers for insert with check (true);
create policy "customers update" on customers for update using (true);
create policy "customers delete" on customers for delete using (true);

-- 3. Storage bucket
insert into storage.buckets (id, name, public)
values ('item-images', 'item-images', true)
on conflict (id) do nothing;

drop policy if exists "public upload"       on storage.objects;
drop policy if exists "public read storage" on storage.objects;
create policy "public upload"
  on storage.objects for insert with check (bucket_id = 'item-images');
create policy "public read storage"
  on storage.objects for select using (bucket_id = 'item-images');

-- Add images array column (run if upgrading from single image_url)
alter table items add column if not exists images text[] default '{}';

-- Migrate existing image_url into images array
update items set images = array[image_url] where image_url is not null and (images is null or array_length(images,1) is null);

-- Add 'incoming' status (run if upgrading)
-- Drop old check constraint and recreate with incoming
alter table items drop constraint if exists items_status_check;
alter table items add constraint items_status_check check (status in ('available','sold','incoming'));

-- Add expected_date column for incoming items
alter table items add column if not exists expected_date date;

-- Add posted_by column for staff tracking
alter table items add column if not exists posted_by text;

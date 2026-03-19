-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- Nếu đã chạy lần trước, chỉ cần chạy phần ALTER TABLE và storage bên dưới

create table if not exists items (
  id          bigserial primary key,
  title       text        not null,
  description text,
  price       bigint,
  condition   text        not null default 'Cũ - Còn tốt',
  category    text,
  type        text        not null check (type in ('ban','mua')),
  phone       text,
  location    text,
  image_url   text,
  created_at  timestamptz not null default now()
);

-- Thêm cột image_url nếu table đã tồn tại
alter table items add column if not exists image_url text;

-- Đổi price sang bigint nếu table đã tồn tại (bỏ default cũ trước)
alter table items alter column price drop default;
alter table items alter column price type bigint using (
  case when price ~ '^\d+$' then price::bigint
       when price ~ '[0-9]' then regexp_replace(price, '[^0-9]', '', 'g')::bigint
       else null end
);

-- Enable Row Level Security
alter table items enable row level security;

-- Drop & recreate policies
drop policy if exists "public read"   on items;
drop policy if exists "public insert" on items;
drop policy if exists "public delete" on items;

create policy "public read"   on items for select using (true);
create policy "public insert" on items for insert with check (true);
create policy "public delete" on items for delete using (true);

-- ─── Storage bucket cho ảnh ───────────────────────────────────
-- Chạy trong Storage > New bucket hoặc qua SQL:
insert into storage.buckets (id, name, public)
values ('item-images', 'item-images', true)
on conflict (id) do nothing;

-- Cho phép upload và đọc công khai
drop policy if exists "public upload" on storage.objects;
drop policy if exists "public read storage" on storage.objects;

create policy "public upload"
  on storage.objects for insert
  with check (bucket_id = 'item-images');

create policy "public read storage"
  on storage.objects for select
  using (bucket_id = 'item-images');

-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New query)

create table if not exists items (
  id          bigserial primary key,
  title       text        not null,
  description text,
  price       text        not null default 'Thương lượng',
  condition   text        not null default 'Cũ - Còn tốt',
  category    text,
  type        text        not null check (type in ('ban','mua')),
  phone       text,
  location    text,
  created_at  timestamptz not null default now()
);

-- Enable Row Level Security
alter table items enable row level security;

-- Anyone can read listings
create policy "public read"
  on items for select
  using (true);

-- Only service_role (server-side) can insert/update/delete
-- Frontend calls go through /api routes which use server env vars

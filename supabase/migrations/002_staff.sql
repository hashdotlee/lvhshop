-- ═══════════════════════════════════════════════════════
-- Chạy file này trong Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

-- 1. Bảng nhân viên
create table if not exists staff (
  id         bigserial primary key,
  name       text        not null,
  created_at timestamptz not null default now()
);

alter table staff enable row level security;
drop policy if exists "staff public read"  on staff;
drop policy if exists "staff public write" on staff;
create policy "staff public read"  on staff for select using (true);
create policy "staff public write" on staff for all    using (true);

-- 2. Seed dữ liệu ban đầu
insert into staff (name) values
  ('Hoàng'),
  ('Kiên'),
  ('Đạt')
on conflict do nothing;

-- 3. Liên kết items → staff
alter table items add column if not exists staff_id bigint references staff(id) on delete set null;

-- Backfill: map posted_by text → staff_id nếu đã có dữ liệu cũ
update items i
set    staff_id = s.id
from   staff s
where  i.posted_by = s.name
  and  i.staff_id is null;

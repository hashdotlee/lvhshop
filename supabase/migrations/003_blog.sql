-- ═══════════════════════════════════════════════════════
-- Blog posts table — chạy trong Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

create table if not exists blog_posts (
  id          bigserial primary key,
  slug        text unique not null,
  title       text not null,
  excerpt     text,
  content     text,
  cover_image text,
  tags        text[] default '{}',
  published   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-update updated_at on row change
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists blog_posts_updated_at on blog_posts;
create trigger blog_posts_updated_at
  before update on blog_posts
  for each row execute function update_updated_at();

alter table blog_posts enable row level security;
drop policy if exists "blog public read"   on blog_posts;
drop policy if exists "blog public write"  on blog_posts;
create policy "blog public read"  on blog_posts for select using (true);
create policy "blog public write" on blog_posts for all   using (true);

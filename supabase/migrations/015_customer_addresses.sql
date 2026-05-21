-- Customer saved addresses (linked to Supabase auth users)
CREATE TABLE customer_addresses (
  id          bigint primary key generated always as identity,
  user_id     uuid references auth.users(id) on delete cascade not null,
  full_name   text not null default '',
  phone       text not null default '',
  address     text not null default '',
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);

ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own addresses"
  ON customer_addresses FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

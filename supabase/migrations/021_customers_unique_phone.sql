-- 1. Normalize: convert empty phone strings to NULL
UPDATE customers SET phone = NULL WHERE trim(phone) = '';

-- 2. Deduplicate: for each phone, keep the oldest record, delete the rest
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY phone
      ORDER BY created_at ASC
    ) AS rn
  FROM customers
  WHERE phone IS NOT NULL
)
DELETE FROM customers WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 3. Add unique constraint on phone (NULL values are allowed multiple times in PostgreSQL)
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_phone_key;
ALTER TABLE customers ADD CONSTRAINT customers_phone_key UNIQUE (phone);

-- 4. Update auth trigger: match on phone when provided so registration links to existing customer
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name  text;
  v_phone text;
BEGIN
  v_name  := COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''), NEW.email);
  v_phone := NULLIF(trim(NEW.raw_user_meta_data->>'phone'), '');

  IF v_phone IS NOT NULL THEN
    -- Phone provided: upsert on phone — links auth account to existing customer record
    INSERT INTO public.customers (user_id, name, email, phone)
    VALUES (NEW.id, v_name, NEW.email, v_phone)
    ON CONFLICT (phone) DO UPDATE SET
      user_id = COALESCE(customers.user_id, EXCLUDED.user_id),
      email   = COALESCE(EXCLUDED.email, customers.email),
      name    = CASE
                  WHEN customers.name IS NULL OR customers.name = ''
                  THEN EXCLUDED.name
                  ELSE customers.name
                END;
  ELSE
    -- No phone: insert by user_id only (no merge possible)
    INSERT INTO public.customers (user_id, name, email)
    VALUES (NEW.id, v_name, NEW.email)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

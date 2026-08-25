-- Migration 027: Operating Expenses table for Accounting & Tax module

CREATE TABLE IF NOT EXISTS operating_expenses (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  category TEXT NOT NULL DEFAULT 'other',
  description TEXT NOT NULL,
  amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for date filtering
CREATE INDEX IF NOT EXISTS idx_operating_expenses_date ON operating_expenses(date);

-- Enable Row Level Security (RLS)
ALTER TABLE operating_expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow public select operating_expenses" ON operating_expenses
  FOR SELECT USING (true);

CREATE POLICY "Allow service_role full access operating_expenses" ON operating_expenses
  FOR ALL USING (true);

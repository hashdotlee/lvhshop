-- Migration: 026_live_streams.sql
-- Table to store Admin-configured Facebook Live streams / Fanpage list

CREATE TABLE IF NOT EXISTS live_streams (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  shop_name TEXT NOT NULL,
  url TEXT NOT NULL,
  note TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE live_streams ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Public read live streams" ON live_streams
  FOR SELECT USING (true);

-- Allow service role / admin full access
CREATE POLICY "Admin write live streams" ON live_streams
  FOR ALL USING (true);

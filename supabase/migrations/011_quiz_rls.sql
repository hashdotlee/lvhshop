-- Allow public read access to quiz tables.
-- Supabase may auto-enable RLS on new tables; without policies all queries
-- using the anon/publishable key return 0 rows silently.

ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_quiz     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read quiz_questions"
  ON quiz_questions FOR SELECT USING (true);

CREATE POLICY "public read daily_quiz"
  ON daily_quiz FOR SELECT USING (true);

-- Admin-only write (INSERT/UPDATE/DELETE) — blocked for anon
CREATE POLICY "no public write quiz_questions"
  ON quiz_questions FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "no public write daily_quiz"
  ON daily_quiz FOR ALL USING (false) WITH CHECK (false);

-- Auto-schedule all existing questions starting 2026-05-10, one per day.
-- Uses ROW_NUMBER so it works regardless of what model names are in the DB.
INSERT INTO daily_quiz (question_id, quiz_date)
SELECT
  id,
  '2026-05-10'::date + ((ROW_NUMBER() OVER (ORDER BY id) - 1) || ' days')::interval
FROM quiz_questions
ON CONFLICT (quiz_date) DO UPDATE SET question_id = EXCLUDED.question_id;

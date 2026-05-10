-- Quiz question bank
CREATE TABLE IF NOT EXISTS quiz_questions (
  id          SERIAL PRIMARY KEY,
  brand       TEXT NOT NULL,
  model_name  TEXT NOT NULL,
  description TEXT NOT NULL,
  year        INTEGER,
  image_url   TEXT,
  difficulty  TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard')),
  options     TEXT[] NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Daily quiz schedule: one question per day
CREATE TABLE IF NOT EXISTS daily_quiz (
  id          SERIAL PRIMARY KEY,
  question_id INTEGER NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  quiz_date   DATE NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast daily lookup
CREATE INDEX IF NOT EXISTS daily_quiz_date_idx ON daily_quiz (quiz_date);

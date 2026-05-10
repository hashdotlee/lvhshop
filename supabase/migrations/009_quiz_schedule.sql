-- Schedule all seed questions starting 2026-05-10, one per day
INSERT INTO daily_quiz (question_id, quiz_date)
SELECT id, '2026-05-10' FROM quiz_questions WHERE model_name = 'ICF-5900W'
ON CONFLICT (quiz_date) DO NOTHING;

INSERT INTO daily_quiz (question_id, quiz_date)
SELECT id, '2026-05-11' FROM quiz_questions WHERE model_name = 'RF-2200'
ON CONFLICT (quiz_date) DO NOTHING;

INSERT INTO daily_quiz (question_id, quiz_date)
SELECT id, '2026-05-12' FROM quiz_questions WHERE model_name = 'Satellit 700'
ON CONFLICT (quiz_date) DO NOTHING;

INSERT INTO daily_quiz (question_id, quiz_date)
SELECT id, '2026-05-13' FROM quiz_questions WHERE model_name = 'D2999'
ON CONFLICT (quiz_date) DO NOTHING;

INSERT INTO daily_quiz (question_id, quiz_date)
SELECT id, '2026-05-14' FROM quiz_questions WHERE model_name = 'RF-4900'
ON CONFLICT (quiz_date) DO NOTHING;

INSERT INTO daily_quiz (question_id, quiz_date)
SELECT id, '2026-05-15' FROM quiz_questions WHERE model_name = 'ICF-SW77'
ON CONFLICT (quiz_date) DO NOTHING;

INSERT INTO daily_quiz (question_id, quiz_date)
SELECT id, '2026-05-16' FROM quiz_questions WHERE model_name = 'Trans-Oceanic Royal 3000-1'
ON CONFLICT (quiz_date) DO NOTHING;

INSERT INTO daily_quiz (question_id, quiz_date)
SELECT id, '2026-05-17' FROM quiz_questions WHERE model_name = 'RF-B65'
ON CONFLICT (quiz_date) DO NOTHING;

INSERT INTO daily_quiz (question_id, quiz_date)
SELECT id, '2026-05-18' FROM quiz_questions WHERE model_name = 'Yacht Boy 400'
ON CONFLICT (quiz_date) DO NOTHING;

INSERT INTO daily_quiz (question_id, quiz_date)
SELECT id, '2026-05-19' FROM quiz_questions WHERE model_name = 'ICF-6800W'
ON CONFLICT (quiz_date) DO NOTHING;

INSERT INTO daily_quiz (question_id, quiz_date)
SELECT id, '2026-05-20' FROM quiz_questions WHERE model_name = 'TFM-110B'
ON CONFLICT (quiz_date) DO NOTHING;

INSERT INTO daily_quiz (question_id, quiz_date)
SELECT id, '2026-05-21' FROM quiz_questions WHERE model_name = 'L4X70T'
ON CONFLICT (quiz_date) DO NOTHING;

INSERT INTO daily_quiz (question_id, quiz_date)
SELECT id, '2026-05-22' FROM quiz_questions WHERE model_name = 'Super 9'
ON CONFLICT (quiz_date) DO NOTHING;

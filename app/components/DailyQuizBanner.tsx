'use client'
import { useEffect, useMemo, useState } from 'react'

interface QuizQuestion {
  id: number
  brand: string
  model_name: string
  description: string
  year: number | null
  difficulty: 'easy' | 'medium' | 'hard'
  options: string[]
}

interface DailyQuiz {
  quiz_date: string
  quiz_questions: QuizQuestion
}

function seededShuffle<T>(arr: T[], seed: string): T[] {
  const a = [...arr]
  let h = 0
  for (let i = 0; i < seed.length; i++) h = Math.imul(31, h) + seed.charCodeAt(i) | 0
  for (let i = a.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) | 0
    h = Math.imul(h ^ (h >>> 11), 0x165667b1) | 0
    const j = Math.abs(h) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function todayVN() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())
}

export default function DailyQuizBanner() {
  const [quiz, setQuiz] = useState<DailyQuiz | null>(null)
  const [dismissed, setDismissed] = useState(true) // start hidden to avoid flash
  const [answered, setAnswered] = useState(false)
  const [correct, setCorrect] = useState<boolean | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)

  const today = todayVN()

  useEffect(() => {
    const savedAnswer = localStorage.getItem(`rq_${today}`)
    if (savedAnswer) { setDismissed(true); return }

    fetch('/api/game/quiz/daily')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data || data.error) return
        setQuiz(data)
        setDismissed(false)
        requestAnimationFrame(() => setVisible(true))
      })
      .catch(() => null)
  }, [today])

  const shuffled = useMemo(() => {
    if (!quiz) return []
    return seededShuffle(quiz.quiz_questions.options, quiz.quiz_date)
  }, [quiz])

  function handleAnswer(opt: string) {
    if (answered || !quiz) return
    const isCorrect = opt === quiz.quiz_questions.model_name
    setSelected(opt)
    setCorrect(isCorrect)
    setAnswered(true)
    localStorage.setItem(`rq_${today}`, opt)
  }

  function handleDismiss() {
    setVisible(false)
    setTimeout(() => setDismissed(true), 300)
  }

  if (dismissed || !quiz) return null

  const q = quiz.quiz_questions

  return (
    <div className={`dqb-wrap${visible ? ' dqb-visible' : ''}`}>
      <div className="dqb-inner">
        <div className="dqb-top">
          <div className="dqb-label">
            <span className="dqb-icon">📻</span>
            <span className="dqb-title">Radio Daily Quiz</span>
            <span className="dqb-brand">{q.brand}</span>
          </div>
          <div className="dqb-actions">
            <a href="/game/radio-quiz" className="dqb-more-link">Xem trang game →</a>
            <button className="dqb-close" onClick={handleDismiss} aria-label="Đóng">✕</button>
          </div>
        </div>

        {!answered ? (
          <>
            <p className="dqb-desc">{q.description}</p>
            <div className="dqb-opts">
              {shuffled.map(opt => (
                <button key={opt} className="dqb-opt" onClick={() => handleAnswer(opt)}>
                  {opt}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className={`dqb-result ${correct ? 'dqb-correct' : 'dqb-wrong'}`}>
            <span className="dqb-result-icon">{correct ? '🎉' : '😅'}</span>
            <span className="dqb-result-text">
              {correct
                ? `Chính xác! ${q.brand} ${q.model_name}${q.year ? ` (${q.year})` : ''}`
                : `Sai rồi — Đáp án: ${q.brand} ${q.model_name}${q.year ? ` (${q.year})` : ''}`}
            </span>
            <a href="/game/radio-quiz" className="dqb-result-link">Chi tiết →</a>
          </div>
        )}
      </div>

      <style>{css}</style>
    </div>
  )
}

const css = `
.dqb-wrap{
  opacity:0;transform:translateY(-6px);
  transition:opacity .3s ease,transform .3s ease;
  margin:0 0 0;
  border-bottom:1px solid var(--border,#e8e6e1);
  background:var(--surface,#fff);
}
.dqb-visible{opacity:1;transform:translateY(0)}
.dqb-inner{max-width:960px;margin:0 auto;padding:12px 24px}
.dqb-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px;flex-wrap:wrap}
.dqb-label{display:flex;align-items:center;gap:8px}
.dqb-icon{font-size:16px}
.dqb-title{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--muted,#8c8982)}
.dqb-brand{font-size:12px;background:var(--tag-bg,#f0efe9);padding:2px 8px;border-radius:20px;color:var(--muted,#8c8982);font-weight:500}
.dqb-actions{display:flex;align-items:center;gap:10px}
.dqb-more-link{font-size:12px;color:var(--muted,#8c8982);text-decoration:none;white-space:nowrap}
.dqb-more-link:hover{color:var(--text,#1a1916)}
.dqb-close{background:none;border:none;cursor:pointer;color:var(--muted,#8c8982);font-size:13px;padding:2px 4px;line-height:1}
.dqb-close:hover{color:var(--text,#1a1916)}
.dqb-desc{font-size:13px;color:var(--text,#1a1916);line-height:1.6;margin-bottom:10px}
.dqb-opts{display:flex;flex-wrap:wrap;gap:6px}
.dqb-opt{padding:6px 14px;border:1.5px solid var(--border,#e8e6e1);border-radius:20px;background:var(--surface,#fff);font-family:inherit;font-size:12px;font-weight:500;cursor:pointer;color:var(--text,#1a1916);transition:border-color .15s,background .15s}
.dqb-opt:hover{border-color:var(--text,#1a1916);background:var(--tag-bg,#f0efe9)}
.dqb-result{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:10px;flex-wrap:wrap}
.dqb-correct{background:#f0fdf4;color:#2a7a4b}
.dqb-wrong{background:#fef2f2;color:#b91c1c}
.dqb-result-icon{font-size:18px}
.dqb-result-text{font-size:13px;font-weight:500;flex:1}
.dqb-result-link{font-size:12px;font-weight:600;color:inherit;text-decoration:underline;white-space:nowrap}
@media(max-width:600px){
  .dqb-inner{padding:10px 16px}
  .dqb-opts{gap:5px}
  .dqb-opt{font-size:11px;padding:5px 10px}
}
`

'use client'
import { useEffect, useMemo, useState } from 'react'

interface QuizQuestion {
  id: number
  brand: string
  model_name: string
  description: string
  year: number | null
  image_url: string | null
  difficulty: 'easy' | 'medium' | 'hard'
  options: string[]
}

interface DailyQuiz {
  quiz_date: string
  quiz_questions: QuizQuestion
}

type GameState = 'loading' | 'playing' | 'answered' | 'no-quiz' | 'error'

const DIFFICULTY_LABEL: Record<string, string> = { easy: 'Dễ', medium: 'Trung bình', hard: 'Khó' }
const DIFFICULTY_COLOR: Record<string, string> = { easy: '#2a7a4b', medium: '#b45309', hard: '#b91c1c' }

function seededShuffle<T>(arr: T[], seed: string): T[] {
  const a = [...arr]
  let h = 0
  for (let i = 0; i < seed.length; i++) { h = Math.imul(31, h) + seed.charCodeAt(i) | 0 }
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

function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function storageKey(date: string) { return `rq_${date}` }

export default function RadioQuizClient() {
  const [state, setState] = useState<GameState>('loading')
  const [quiz, setQuiz] = useState<DailyQuiz | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [correct, setCorrect] = useState<boolean | null>(null)
  const [copied, setCopied] = useState(false)

  const today = todayVN()

  useEffect(() => {
    const saved = localStorage.getItem(storageKey(today))
    fetch('/api/game/quiz/daily')
      .then(r => r.json())
      .then(data => {
        if (data.error) { setState('no-quiz'); return }
        setQuiz(data)
        if (saved) {
          setSelected(saved)
          setCorrect(saved === data.quiz_questions.model_name)
          setState('answered')
        } else {
          setState('playing')
        }
      })
      .catch(() => setState('error'))
  }, [today])

  const shuffledOptions = useMemo(() => {
    if (!quiz) return []
    return seededShuffle(quiz.quiz_questions.options, quiz.quiz_date)
  }, [quiz])

  function handleAnswer(opt: string) {
    if (state !== 'playing' || !quiz) return
    const isCorrect = opt === quiz.quiz_questions.model_name
    setSelected(opt)
    setCorrect(isCorrect)
    setState('answered')
    localStorage.setItem(storageKey(today), opt)
  }

  function buildShareText() {
    if (!quiz) return ''
    const q = quiz.quiz_questions
    const icon = correct ? '✅' : '❌'
    return `📻 Radio Daily Quiz — ${fmtDate(quiz.quiz_date)}\n${icon} ${correct ? 'Trả lời đúng' : 'Trả lời sai'}: ${q.brand} ${q.model_name}\n\nThử sức tại leviethoang.shop/game/radio-quiz`
  }

  async function handleShare() {
    const text = buildShareText()
    if (navigator.share) {
      await navigator.share({ text }).catch(() => null)
    } else {
      await navigator.clipboard.writeText(text).catch(() => null)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (state === 'loading') return (
    <div className="rq-center">
      <div className="rq-spinner" />
      <p className="rq-loading-text">Đang tải câu hỏi...</p>
    </div>
  )

  if (state === 'no-quiz') return (
    <div className="rq-center">
      <div className="rq-empty-icon">📻</div>
      <h2 className="rq-empty-title">Hôm nay chưa có câu hỏi</h2>
      <p className="rq-empty-sub">Admin chưa đăng câu hỏi cho ngày {fmtDate(today)}. Hãy quay lại sau!</p>
    </div>
  )

  if (state === 'error') return (
    <div className="rq-center">
      <div className="rq-empty-icon">⚠️</div>
      <h2 className="rq-empty-title">Lỗi kết nối</h2>
      <p className="rq-empty-sub">Không thể tải câu hỏi. Vui lòng thử lại.</p>
      <button className="rq-retry-btn" onClick={() => window.location.reload()}>Thử lại</button>
    </div>
  )

  if (!quiz) return null
  const q = quiz.quiz_questions

  return (
    <div className="rq-game">
      {/* Header info */}
      <div className="rq-meta">
        <span className="rq-date">{fmtDate(quiz.quiz_date)}</span>
        <span className="rq-difficulty" style={{ color: DIFFICULTY_COLOR[q.difficulty] }}>
          {DIFFICULTY_LABEL[q.difficulty]}
        </span>
      </div>

      {/* Brand tag */}
      <div className="rq-brand-row">
        <span className="rq-brand-label">Hãng</span>
        <span className="rq-brand-name">{q.brand}</span>
        {q.year && <span className="rq-year">· {q.year}</span>}
      </div>

      {/* Question */}
      <div className="rq-question-card">
        <div className="rq-question-icon">📡</div>
        <p className="rq-question-label">Đây là model radio nào?</p>
        <p className="rq-description">{q.description}</p>
      </div>

      {/* Options */}
      <div className="rq-options">
        {shuffledOptions.map(opt => {
          let cls = 'rq-opt'
          if (state === 'answered') {
            if (opt === q.model_name) cls += ' rq-opt-correct'
            else if (opt === selected) cls += ' rq-opt-wrong'
            else cls += ' rq-opt-dim'
          }
          return (
            <button
              key={opt}
              className={cls}
              onClick={() => handleAnswer(opt)}
              disabled={state === 'answered'}
            >
              {opt}
            </button>
          )
        })}
      </div>

      {/* Result */}
      {state === 'answered' && (
        <div className={`rq-result ${correct ? 'rq-result-correct' : 'rq-result-wrong'}`}>
          <div className="rq-result-icon">{correct ? '🎉' : '😅'}</div>
          <div className="rq-result-body">
            <p className="rq-result-title">
              {correct ? 'Chính xác!' : `Đáp án đúng: ${q.brand} ${q.model_name}`}
            </p>
            {!correct && (
              <p className="rq-result-sub">Bạn chọn: <strong>{selected}</strong></p>
            )}
            {correct && q.year && (
              <p className="rq-result-sub">{q.brand} {q.model_name}{q.year ? ` (${q.year})` : ''}</p>
            )}
          </div>

          {q.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={q.image_url} alt={`${q.brand} ${q.model_name}`} className="rq-result-img" />
          )}

          <div className="rq-result-actions">
            <button className="rq-share-btn" onClick={handleShare}>
              {copied ? '✓ Đã sao chép!' : '↗ Chia sẻ kết quả'}
            </button>
          </div>
          <p className="rq-next-hint">Câu hỏi mới sẽ xuất hiện vào ngày mai</p>
        </div>
      )}
    </div>
  )
}

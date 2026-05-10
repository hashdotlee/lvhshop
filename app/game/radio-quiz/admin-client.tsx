'use client'
import { useEffect, useRef, useState } from 'react'

const ADMIN_HASH = process.env.NEXT_PUBLIC_ADMIN_HASH ?? 'admin-lvh2025'

interface Question {
  id: number
  brand: string
  model_name: string
  description: string
  year: number | null
  image_url: string | null
  difficulty: string
  options: string[]
  created_at: string
}

interface ScheduleEntry {
  id: number
  quiz_date: string
  quiz_questions: { id: number; brand: string; model_name: string; difficulty: string }
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

const emptyForm = {
  brand: '', model_name: '', description: '',
  year: '', image_url: '', difficulty: 'medium',
  opt1: '', opt2: '', opt3: '',
}

const BRANDS = ['Sony', 'Panasonic', 'National', 'Philips', 'Grundig', 'Blaupunkt', 'Pioneer', 'Kenwood', 'JVC', 'Sanyo', 'Toshiba', 'Hitachi', 'Sharp', 'Aiwa', 'Realistic', 'Zenith', 'RCA', 'Motorola', 'Other']

export default function RadioQuizAdminClient() {
  const [isAdmin, setIsAdmin] = useState(false)
  const adminKey = useRef('')
  const [tab, setTab] = useState<'questions' | 'schedule'>('questions')

  // Questions
  const [questions, setQuestions] = useState<Question[]>([])
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [qMsg, setQMsg] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)

  // Schedule
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([])
  const [schedDate, setSchedDate] = useState('')
  const [schedQid, setSchedQid] = useState('')
  const [schedSaving, setSchedSaving] = useState(false)
  const [schedMsg, setSchedMsg] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.location.hash === `#${ADMIN_HASH}`) {
      history.replaceState(null, '', window.location.pathname)
      adminKey.current = ADMIN_HASH
      sessionStorage.setItem('cq_admin', '1')
      sessionStorage.setItem('cq_admin_key', ADMIN_HASH)
      setIsAdmin(true)
    } else if (sessionStorage.getItem('cq_admin')) {
      adminKey.current = sessionStorage.getItem('cq_admin_key') ?? ''
      setIsAdmin(true)
    }
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    fetchQuestions()
    fetchSchedule()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin])

  function headers() { return { 'Content-Type': 'application/json', 'x-admin-key': adminKey.current } }

  async function fetchQuestions() {
    const r = await fetch('/api/game/quiz/questions', { headers: headers() })
    const d = await r.json()
    setQuestions(Array.isArray(d) ? d : [])
  }

  async function fetchSchedule() {
    const r = await fetch('/api/game/quiz/schedule', { headers: headers() })
    const d = await r.json()
    setSchedule(Array.isArray(d) ? d : [])
  }

  async function handleSaveQuestion(e: React.FormEvent) {
    e.preventDefault()
    if (!form.brand || !form.model_name || !form.description || !form.opt1 || !form.opt2 || !form.opt3) {
      setQMsg('Vui lòng điền đầy đủ thông tin và 3 đáp án sai.'); return
    }
    const options = [form.model_name, form.opt1, form.opt2, form.opt3]
    setSaving(true); setQMsg('')
    const r = await fetch('/api/game/quiz/questions', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        brand: form.brand,
        model_name: form.model_name,
        description: form.description,
        year: form.year ? parseInt(form.year) : null,
        image_url: form.image_url || null,
        difficulty: form.difficulty,
        options,
      }),
    })
    const d = await r.json()
    setSaving(false)
    if (!r.ok) { setQMsg(d.error ?? 'Lỗi'); return }
    setQMsg('Đã thêm câu hỏi!')
    setForm(emptyForm)
    setShowForm(false)
    fetchQuestions()
  }

  async function handleDeleteQuestion(id: number) {
    if (!confirm('Xoá câu hỏi này?')) return
    setDeleting(id)
    const r = await fetch(`/api/game/quiz/questions/${id}`, { method: 'DELETE', headers: headers() })
    setDeleting(null)
    if (r.ok) { fetchQuestions(); fetchSchedule() }
  }

  async function handleSchedule(e: React.FormEvent) {
    e.preventDefault()
    if (!schedDate || !schedQid) { setSchedMsg('Chọn ngày và câu hỏi'); return }
    setSchedSaving(true); setSchedMsg('')
    const r = await fetch('/api/game/quiz/schedule', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ question_id: parseInt(schedQid), quiz_date: schedDate }),
    })
    const d = await r.json()
    setSchedSaving(false)
    if (!r.ok) { setSchedMsg(d.error ?? 'Lỗi'); return }
    setSchedMsg('Đã lên lịch!')
    setSchedDate(''); setSchedQid('')
    fetchSchedule()
  }

  async function handleDeleteSchedule(id: number) {
    const r = await fetch(`/api/game/quiz/schedule/${id}`, { method: 'DELETE', headers: headers() })
    if (r.ok) fetchSchedule()
  }

  if (!isAdmin) return null

  return (
    <div className="adm-wrap">
      <div className="adm-panel">
        <div className="adm-header">
          <h2 className="adm-title">⚙️ Quản lý Quiz</h2>
          <div className="adm-tabs">
            <button className={`adm-tab${tab === 'questions' ? ' adm-tab-active' : ''}`} onClick={() => setTab('questions')}>
              Kho câu hỏi ({questions.length})
            </button>
            <button className={`adm-tab${tab === 'schedule' ? ' adm-tab-active' : ''}`} onClick={() => setTab('schedule')}>
              Lịch đăng ({schedule.length})
            </button>
          </div>
        </div>

        {/* QUESTIONS TAB */}
        {tab === 'questions' && (
          <div className="adm-section">
            <div className="adm-section-top">
              <button className="adm-btn-primary" onClick={() => { setShowForm(v => !v); setQMsg('') }}>
                {showForm ? '✕ Đóng' : '+ Thêm câu hỏi'}
              </button>
            </div>

            {showForm && (
              <form className="adm-form" onSubmit={handleSaveQuestion}>
                <div className="adm-form-row">
                  <label className="adm-label">Hãng *</label>
                  <select className="adm-input" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} required>
                    <option value="">-- Chọn hãng --</option>
                    {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>

                <div className="adm-form-row">
                  <label className="adm-label">Tên model (đáp án đúng) *</label>
                  <input className="adm-input" placeholder="VD: ICF-5900W" value={form.model_name}
                    onChange={e => setForm(f => ({ ...f, model_name: e.target.value }))} required />
                </div>

                <div className="adm-form-row">
                  <label className="adm-label">Mô tả đặc điểm *</label>
                  <textarea className="adm-input adm-textarea" rows={4}
                    placeholder="Mô tả các đặc điểm nhận dạng đặc trưng của model này..."
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required />
                </div>

                <div className="adm-form-grid2">
                  <div className="adm-form-row">
                    <label className="adm-label">Năm sản xuất</label>
                    <input className="adm-input" type="number" placeholder="VD: 1976" min="1920" max="2010"
                      value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} />
                  </div>
                  <div className="adm-form-row">
                    <label className="adm-label">Độ khó</label>
                    <select className="adm-input" value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}>
                      <option value="easy">Dễ</option>
                      <option value="medium">Trung bình</option>
                      <option value="hard">Khó</option>
                    </select>
                  </div>
                </div>

                <div className="adm-form-row">
                  <label className="adm-label">URL ảnh (tuỳ chọn)</label>
                  <input className="adm-input" placeholder="https://..." value={form.image_url}
                    onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} />
                </div>

                <div className="adm-decoy-section">
                  <label className="adm-label">3 đáp án sai (mồi nhử) *</label>
                  <div className="adm-form-grid3">
                    {(['opt1', 'opt2', 'opt3'] as const).map((k, i) => (
                      <input key={k} className="adm-input" placeholder={`Mồi ${i + 1}`}
                        value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} required />
                    ))}
                  </div>
                </div>

                {qMsg && <p className={`adm-msg${qMsg.includes('Đã') ? ' adm-msg-ok' : ' adm-msg-err'}`}>{qMsg}</p>}

                <div className="adm-form-actions">
                  <button type="submit" className="adm-btn-primary" disabled={saving}>
                    {saving ? 'Đang lưu...' : 'Lưu câu hỏi'}
                  </button>
                  <button type="button" className="adm-btn-ghost" onClick={() => setShowForm(false)}>Huỷ</button>
                </div>
              </form>
            )}

            {!showForm && qMsg && (
              <p className={`adm-msg${qMsg.includes('Đã') ? ' adm-msg-ok' : ' adm-msg-err'}`}>{qMsg}</p>
            )}

            <div className="adm-q-list">
              {questions.length === 0 && <p className="adm-empty">Chưa có câu hỏi nào.</p>}
              {questions.map(q => (
                <div key={q.id} className="adm-q-item">
                  <div className="adm-q-info">
                    <span className="adm-q-brand">{q.brand}</span>
                    <strong className="adm-q-model">{q.model_name}</strong>
                    {q.year && <span className="adm-q-year">{q.year}</span>}
                    <span className={`adm-q-diff adm-diff-${q.difficulty}`}>{q.difficulty}</span>
                  </div>
                  <p className="adm-q-desc">{q.description.slice(0, 100)}{q.description.length > 100 ? '…' : ''}</p>
                  <div className="adm-q-opts">
                    {q.options.map(o => (
                      <span key={o} className={`adm-opt-chip${o === q.model_name ? ' adm-opt-correct' : ''}`}>{o}</span>
                    ))}
                  </div>
                  <button className="adm-del-btn" onClick={() => handleDeleteQuestion(q.id)} disabled={deleting === q.id}>
                    {deleting === q.id ? '...' : 'Xoá'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SCHEDULE TAB */}
        {tab === 'schedule' && (
          <div className="adm-section">
            <form className="adm-form adm-sched-form" onSubmit={handleSchedule}>
              <div className="adm-form-grid2">
                <div className="adm-form-row">
                  <label className="adm-label">Ngày đăng *</label>
                  <input className="adm-input" type="date" value={schedDate}
                    onChange={e => setSchedDate(e.target.value)} required />
                </div>
                <div className="adm-form-row">
                  <label className="adm-label">Câu hỏi *</label>
                  <select className="adm-input" value={schedQid} onChange={e => setSchedQid(e.target.value)} required>
                    <option value="">-- Chọn câu hỏi --</option>
                    {questions.map(q => (
                      <option key={q.id} value={q.id}>
                        [{q.brand}] {q.model_name} ({q.difficulty})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {schedMsg && <p className={`adm-msg${schedMsg.includes('Đã') ? ' adm-msg-ok' : ' adm-msg-err'}`}>{schedMsg}</p>}
              <button type="submit" className="adm-btn-primary" disabled={schedSaving}>
                {schedSaving ? 'Đang lưu...' : '+ Lên lịch'}
              </button>
            </form>

            <div className="adm-sched-list">
              {schedule.length === 0 && <p className="adm-empty">Chưa có lịch nào.</p>}
              {schedule.map(s => {
                const q = s.quiz_questions
                const isPast = s.quiz_date < new Date().toISOString().split('T')[0]
                return (
                  <div key={s.id} className={`adm-sched-item${isPast ? ' adm-sched-past' : ''}`}>
                    <div className="adm-sched-date">
                      <span className="adm-sched-date-label">{fmtDate(s.quiz_date)}</span>
                      {isPast && <span className="adm-sched-past-tag">Đã qua</span>}
                    </div>
                    <div className="adm-sched-q">
                      <span className="adm-q-brand">{q.brand}</span>
                      <strong>{q.model_name}</strong>
                      <span className={`adm-q-diff adm-diff-${q.difficulty}`}>{q.difficulty}</span>
                    </div>
                    <button className="adm-del-btn" onClick={() => handleDeleteSchedule(s.id)}>Xoá</button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <style>{adminStyles}</style>
    </div>
  )
}

const adminStyles = `
.adm-wrap{max-width:720px;margin:48px auto 80px;padding:0 24px}
.adm-panel{background:#fff;border:1px solid #e8e6e1;border-radius:16px;overflow:hidden}
.adm-header{padding:20px 24px 0;border-bottom:1px solid #e8e6e1}
.adm-title{font-size:17px;font-weight:600;margin-bottom:14px}
.adm-tabs{display:flex;gap:2px}
.adm-tab{padding:8px 16px;border:none;background:none;font-family:inherit;font-size:13px;color:#8c8982;cursor:pointer;border-radius:8px 8px 0 0;margin-bottom:-1px;border:1px solid transparent;border-bottom:none}
.adm-tab:hover{background:#f0efe9}
.adm-tab-active{background:#fff;border-color:#e8e6e1;color:#1a1916;font-weight:600}
.adm-section{padding:20px 24px}
.adm-section-top{margin-bottom:16px}
.adm-form{display:flex;flex-direction:column;gap:14px;background:#f9f8f6;border:1px solid #e8e6e1;border-radius:12px;padding:20px;margin-bottom:20px}
.adm-sched-form{margin-bottom:24px}
.adm-form-row{display:flex;flex-direction:column;gap:4px}
.adm-form-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.adm-form-grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
.adm-label{font-size:12px;font-weight:600;color:#8c8982;text-transform:uppercase;letter-spacing:.3px}
.adm-input{padding:8px 12px;border:1px solid #e8e6e1;border-radius:8px;font-family:inherit;font-size:13px;background:#fff;color:#1a1916;transition:border-color .15s}
.adm-input:focus{outline:none;border-color:#1a1916}
.adm-textarea{resize:vertical;min-height:80px}
.adm-decoy-section{display:flex;flex-direction:column;gap:8px}
.adm-form-actions{display:flex;gap:10px}
.adm-btn-primary{padding:9px 18px;background:#1a1916;color:#fff;border:none;border-radius:9px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:opacity .15s}
.adm-btn-primary:hover:not(:disabled){opacity:.85}
.adm-btn-primary:disabled{opacity:.5;cursor:default}
.adm-btn-ghost{padding:9px 18px;background:none;border:1px solid #e8e6e1;border-radius:9px;font-family:inherit;font-size:13px;cursor:pointer}
.adm-btn-ghost:hover{background:#f0efe9}
.adm-msg{font-size:13px;padding:8px 12px;border-radius:8px}
.adm-msg-ok{background:#f0fdf4;color:#2a7a4b}
.adm-msg-err{background:#fef2f2;color:#b91c1c}
.adm-empty{color:#8c8982;font-size:13px;text-align:center;padding:24px 0}

/* Question list */
.adm-q-list{display:flex;flex-direction:column;gap:10px}
.adm-q-item{border:1px solid #e8e6e1;border-radius:12px;padding:14px 16px;display:flex;flex-direction:column;gap:8px;background:#fff;position:relative}
.adm-q-info{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.adm-q-brand{font-size:11px;background:#f0efe9;padding:2px 8px;border-radius:20px;color:#8c8982;font-weight:500}
.adm-q-model{font-size:15px;font-weight:600}
.adm-q-year{font-size:12px;color:#8c8982}
.adm-q-diff{font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;text-transform:uppercase;letter-spacing:.3px}
.adm-diff-easy{background:#f0fdf4;color:#2a7a4b}
.adm-diff-medium{background:#fffbeb;color:#b45309}
.adm-diff-hard{background:#fef2f2;color:#b91c1c}
.adm-q-desc{font-size:12px;color:#8c8982;line-height:1.5}
.adm-q-opts{display:flex;flex-wrap:wrap;gap:6px}
.adm-opt-chip{font-size:11px;padding:3px 10px;border-radius:20px;background:#f0efe9;color:#8c8982}
.adm-opt-correct{background:#f0fdf4;color:#2a7a4b;font-weight:600}
.adm-del-btn{position:absolute;top:12px;right:12px;padding:4px 10px;border:1px solid #e8e6e1;border-radius:7px;background:none;font-size:11px;color:#b91c1c;cursor:pointer;font-family:inherit}
.adm-del-btn:hover{background:#fef2f2}

/* Schedule list */
.adm-sched-list{display:flex;flex-direction:column;gap:8px}
.adm-sched-item{border:1px solid #e8e6e1;border-radius:12px;padding:12px 16px;display:flex;align-items:center;gap:16px;background:#fff;position:relative}
.adm-sched-past{opacity:.55}
.adm-sched-date{display:flex;align-items:center;gap:8px;min-width:90px}
.adm-sched-date-label{font-size:13px;font-weight:600}
.adm-sched-past-tag{font-size:10px;background:#f0efe9;color:#8c8982;padding:2px 6px;border-radius:20px}
.adm-sched-q{display:flex;align-items:center;gap:8px;flex:1;flex-wrap:wrap}

@media(max-width:600px){
  .adm-wrap{padding:0 16px}
  .adm-form-grid2{grid-template-columns:1fr}
  .adm-form-grid3{grid-template-columns:1fr}
}
`

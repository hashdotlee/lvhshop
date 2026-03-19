'use client'
import { useEffect, useRef, useState } from 'react'
import type { Item } from '@/lib/supabase'

const ADMIN_HASH = process.env.NEXT_PUBLIC_ADMIN_HASH ?? 'admin-lvh2025'

// ─── helpers ──────────────────────────────────────────────────
function esc(s: string) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function reltime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'Vừa đăng'
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`
  return `${Math.floor(diff / 86400)} ngày trước`
}

export default function Home() {
  // auth
  const [isAdmin, setIsAdmin] = useState(false)
  const [showAuthGate, setShowAuthGate] = useState(false)
  const [authInput, setAuthInput] = useState('')
  const [authError, setAuthError] = useState(false)
  const adminKey = useRef<string>('')

  // listing
  const [items, setItems] = useState<Item[]>([])
  const [view, setView] = useState<'all' | 'ban' | 'mua'>('all')
  const [filter, setFilter] = useState<'all' | 'Mới' | 'Cũ'>('all')
  const [loading, setLoading] = useState(true)

  // input
  const [nlText, setNlText] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [preview, setPreview] = useState<Partial<Item> | null>(null)
  const [publishing, setPublishing] = useState(false)

  // messenger modal
  const [messengerItem, setMessengerItem] = useState<Item | null>(null)
  const [messengerPhone, setMessengerPhone] = useState('')
  const [messengerMsg, setMessengerMsg] = useState('')

  // toast
  const [toast, setToast] = useState('')
  const toastRef = useRef<ReturnType<typeof setTimeout>>()

  function showToast(msg: string) {
    setToast(msg)
    clearTimeout(toastRef.current)
    toastRef.current = setTimeout(() => setToast(''), 2500)
  }

  // ── fetch items ──────────────────────────────────────────────
  async function fetchItems() {
    setLoading(true)
    try {
      const res = await fetch('/api/items')
      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
    } catch { showToast('Không thể tải danh sách') }
    finally { setLoading(false) }
  }

  // ── auth ─────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.location.hash === `#${ADMIN_HASH}`) {
      history.replaceState(null, '', window.location.pathname + window.location.search)
      setShowAuthGate(true)
    } else if (sessionStorage.getItem('cq_admin')) {
      adminKey.current = sessionStorage.getItem('cq_admin_key') ?? ''
      setIsAdmin(true)
    }
    fetchItems()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function tryLogin() {
    const res = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': authInput },
      body: JSON.stringify({ title: '__ping__', type: 'ban' }),
    })
    if (res.status === 401) {
      setAuthError(true); setAuthInput('')
      setTimeout(() => setAuthError(false), 3000)
    } else {
      adminKey.current = authInput
      sessionStorage.setItem('cq_admin', '1')
      sessionStorage.setItem('cq_admin_key', authInput)
      setIsAdmin(true); setShowAuthGate(false)
      // remove the ping item if it was created
      const data = await res.json()
      if (data?.id) {
        await fetch('/api/items', { method: 'DELETE', headers: { 'Content-Type': 'application/json', 'x-admin-key': authInput }, body: JSON.stringify({ id: data.id }) })
      }
      fetchItems()
    }
  }

  function logout() {
    sessionStorage.removeItem('cq_admin'); sessionStorage.removeItem('cq_admin_key')
    adminKey.current = ''; setIsAdmin(false); showToast('Đã đăng xuất')
  }

  // ── analyze ──────────────────────────────────────────────────
  async function analyzeInput() {
    if (!nlText.trim()) return
    setAnalyzing(true)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: nlText }),
      })
      const data = await res.json()
      setPreview({ title: '', description: '', price: 'Thương lượng', condition: 'Cũ - Còn tốt', category: '', type: 'ban', phone: '', location: '', ...data })
    } catch { showToast('Lỗi kết nối AI') }
    finally { setAnalyzing(false) }
  }

  // ── publish ──────────────────────────────────────────────────
  async function publishItem() {
    if (!preview) return
    setPublishing(true)
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey.current },
        body: JSON.stringify(preview),
      })
      if (!res.ok) { showToast('Lỗi đăng tin'); return }
      setPreview(null); setNlText(''); showToast('Đã đăng tin!')
      fetchItems()
    } finally { setPublishing(false) }
  }

  // ── delete ───────────────────────────────────────────────────
  async function deleteItem(id: number) {
    if (!confirm('Xoá tin này?')) return
    await fetch('/api/items', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey.current },
      body: JSON.stringify({ id }),
    })
    setItems(prev => prev.filter(i => i.id !== id))
    showToast('Đã xoá tin')
  }

  // ── messenger ────────────────────────────────────────────────
  function openMessenger(item: Item) {
    const msg = item.type === 'ban'
      ? `Xin chào! Mình thấy bạn đang bán "${item.title}" với giá ${item.price}. Bạn có thể cho mình hỏi thêm không? Mình đang quan tâm ạ 🙏`
      : `Chào bạn! Mình thấy bạn đang tìm mua "${item.title}". Mình có thể có hàng bạn cần. Bạn muốn trao đổi thêm không? 😊`
    setMessengerItem(item); setMessengerPhone(item.phone ?? ''); setMessengerMsg(msg)
  }
  function sendMessenger() {
    const digits = messengerPhone.replace(/\D/g, '')
    if (!digits) { showToast('Vui lòng nhập SĐT'); return }
    const intl = digits.startsWith('0') ? '84' + digits.slice(1) : digits
    window.open(`https://m.me/${intl}?text=${encodeURIComponent(messengerMsg)}`, '_blank')
    setMessengerItem(null); showToast('Đã mở Messenger!')
  }
  function copyInfo(item: Item) {
    const text = `${item.title}\n${item.description}\nGiá: ${item.price} | ${item.condition}${item.phone ? '\nLH: ' + item.phone : ''}${item.location ? ' | ' + item.location : ''}`
    navigator.clipboard.writeText(text).then(() => showToast('Đã sao chép!'))
  }

  // ── filtered list ────────────────────────────────────────────
  const filtered = items.filter(i => {
    const typeOk = view === 'all' || i.type === view
    const filterOk = filter === 'all' || i.condition.startsWith(filter)
    return typeOk && filterOk
  })

  // ─────────────────────────────────────────────────────────────
  return (
    <>
      <style>{styles}</style>

      {/* AUTH GATE */}
      {showAuthGate && (
        <div className="auth-gate">
          <div className="auth-box">
            <div className="auth-logo">leviethoang<span>.shop / Admin</span></div>
            <label className="auth-label">Mật khẩu quản trị</label>
            <input
              className="auth-input" type="password" placeholder="Nhập mật khẩu..."
              value={authInput} onChange={e => setAuthInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && tryLogin()}
              autoFocus
            />
            <button className="auth-btn" onClick={tryLogin}>Đăng nhập →</button>
            {authError && <div className="auth-error">Mật khẩu không đúng</div>}
            <div className="auth-hint">
              Mật khẩu được đặt qua biến môi trường <code>ADMIN_PASSWORD</code> trên Vercel.
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header>
        <div className="logo">leviethoang<span>.shop</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isAdmin && (
            <div className="admin-badge">
              <span className="admin-dot" /> Admin
              <button className="logout-btn" onClick={logout}>✕</button>
            </div>
          )}
          <nav>
            {(['all', 'ban', 'mua'] as const).map((v, i) => (
              <button key={v} className={view === v ? 'active' : ''} onClick={() => setView(v)}>
                {['Tất cả', 'Bán', 'Tìm mua'][i]}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main>
        {/* INPUT SECTION (admin only) */}
        {isAdmin && (
          <div className="input-section">
            <div className="input-label">Nhập đơn hàng</div>
            <textarea
              id="nlInput" placeholder="VD: Bán Sony WH-1000XM5 màu đen, mua 3 tháng, còn fullbox, giá 4 triệu, LH 0912345678..."
              value={nlText} onChange={e => setNlText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) analyzeInput() }}
              rows={3}
            />

            {analyzing && (
              <div className="processing">
                <div className="spinner" /> AI đang phân tích...
              </div>
            )}

            {preview && !analyzing && (
              <div className="preview-card">
                <div className="preview-grid">
                  <div className="field-group full">
                    <div className="field-label">Tên sản phẩm</div>
                    <input className="field-value" value={preview.title ?? ''} onChange={e => setPreview(p => ({ ...p, title: e.target.value }))} />
                  </div>
                  <div className="field-group full">
                    <div className="field-label">Mô tả</div>
                    <input className="field-value" value={preview.description ?? ''} onChange={e => setPreview(p => ({ ...p, description: e.target.value }))} />
                  </div>
                  <div className="field-group">
                    <div className="field-label">Giá</div>
                    <input className="field-value price-field" value={preview.price ?? ''} onChange={e => setPreview(p => ({ ...p, price: e.target.value }))} />
                  </div>
                  <div className="field-group">
                    <div className="field-label">Tình trạng</div>
                    <select className="field-value" value={preview.condition ?? ''} onChange={e => setPreview(p => ({ ...p, condition: e.target.value }))}>
                      {['Mới','Cũ - Như mới','Cũ - Còn tốt','Cũ - Có lỗi nhỏ'].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="field-group">
                    <div className="field-label">Danh mục</div>
                    <input className="field-value" value={preview.category ?? ''} onChange={e => setPreview(p => ({ ...p, category: e.target.value }))} />
                  </div>
                  <div className="field-group">
                    <div className="field-label">Loại</div>
                    <select className="field-value" value={preview.type ?? 'ban'} onChange={e => setPreview(p => ({ ...p, type: e.target.value as 'ban'|'mua' }))}>
                      <option value="ban">Bán</option>
                      <option value="mua">Tìm mua</option>
                    </select>
                  </div>
                  <div className="field-group">
                    <div className="field-label">SĐT liên hệ</div>
                    <input className="field-value" value={preview.phone ?? ''} onChange={e => setPreview(p => ({ ...p, phone: e.target.value }))} />
                  </div>
                  <div className="field-group">
                    <div className="field-label">Địa điểm</div>
                    <input className="field-value" value={preview.location ?? ''} onChange={e => setPreview(p => ({ ...p, location: e.target.value }))} />
                  </div>
                </div>
                <div className="preview-actions">
                  <button className="btn-ghost" onClick={() => { setPreview(null); setNlText('') }}>Hủy</button>
                  <button className="btn-publish" onClick={publishItem} disabled={publishing}>
                    {publishing ? 'Đang đăng...' : 'Đăng tin →'}
                  </button>
                </div>
              </div>
            )}

            {!preview && !analyzing && (
              <div className="input-actions">
                <span className="input-hint">Nhập tự nhiên · Ctrl+Enter để phân tích</span>
                <button className="btn-primary" onClick={analyzeInput} disabled={!nlText.trim()}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                  Phân tích
                </button>
              </div>
            )}
          </div>
        )}

        {/* LISTING */}
        <div className="section-title">
          {{ all: 'Tất cả tin', ban: 'Đang rao bán', mua: 'Cần tìm mua' }[view]}
        </div>
        <div className="filter-bar">
          <span className="filter-count">{filtered.length} tin</span>
          {(['all','Mới','Cũ'] as const).map(f => (
            <button key={f} className={`filter-chip${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? 'Tất cả' : f === 'Mới' ? 'Mới' : 'Đã qua dùng'}
            </button>
          ))}
        </div>

        <div className="listing">
          {loading ? (
            <div className="empty"><div className="spinner" style={{margin:'0 auto'}} /></div>
          ) : filtered.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">📦</div>
              <p>Chưa có tin nào{isAdmin ? '. Nhập đơn ở trên để bắt đầu.' : '.'}</p>
            </div>
          ) : filtered.map(item => (
            <div key={item.id} className="item">
              <div className="item-body">
                <div className="item-title">{item.title}</div>
                <div className="item-desc">{item.description}</div>
                <div className="item-meta">
                  <span className="tag">{item.type === 'ban' ? '🏷️ Bán' : '🔍 Tìm mua'}</span>
                  <span className={`tag ${item.condition === 'Mới' ? 'condition-moi' : 'condition-cu'}`}>{item.condition}</span>
                  {item.category && <span className="tag">{item.category}</span>}
                  {item.location && <span className="tag">📍 {item.location}</span>}
                  <span className="item-seller"><span className="status-dot" />{reltime(item.created_at)}</span>
                </div>
              </div>
              <div className="item-right">
                <div className="item-price">{item.price}</div>
                <div className="item-actions">
                  {item.phone ? (
                    <button className="btn-messenger" onClick={() => openMessenger(item)}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.918 1.418 5.525 3.641 7.24V22l3.299-1.813A10.7 10.7 0 0012 20.486c5.523 0 10-4.145 10-9.243S17.523 2 12 2z"/></svg>
                      Nhắn tin
                    </button>
                  ) : (
                    <button className="btn-copy" onClick={() => copyInfo(item)}>Sao chép</button>
                  )}
                  <button className="btn-copy" onClick={() => copyInfo(item)}>Copy tin</button>
                  {isAdmin && (
                    <button className="btn-delete" onClick={() => deleteItem(item.id)}>Xoá</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* MESSENGER MODAL */}
      {messengerItem && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setMessengerItem(null)}>
          <div className="modal">
            <h3>Gửi tin nhắn Messenger</h3>
            <p>Tin nhắn được soạn sẵn, bạn có thể chỉnh trước khi gửi.</p>
            <label className="auth-label" style={{display:'block',marginBottom:6}}>SĐT / Messenger ID</label>
            <input className="modal-input" value={messengerPhone} onChange={e => setMessengerPhone(e.target.value)} placeholder="09xxxxxxxx" />
            <textarea className="modal-input" style={{minHeight:80,resize:'vertical'}} value={messengerMsg} onChange={e => setMessengerMsg(e.target.value)} />
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setMessengerItem(null)}>Đóng</button>
              <button className="btn-blue" onClick={sendMessenger}>Mở Messenger →</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && <div className="toast show">{toast}</div>}
    </>
  )
}

// ─── styles ─────────────────────────────────────────────────────────────────
const styles = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --bg: #f9f8f6; --surface: #ffffff; --border: #e8e6e1;
  --text: #1a1916; --muted: #8c8982; --accent: #1a1916;
  --tag-bg: #f0efe9; --green: #2a7a4b; --green-bg: #edf7f2; --red: #c0392b;
}
body { font-family: 'Be Vietnam Pro', sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; font-size: 14px; line-height: 1.6; }

/* AUTH */
.auth-gate { position:fixed; inset:0; background:var(--bg); display:flex; align-items:center; justify-content:center; z-index:999; padding:24px; }
.auth-box { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:36px 32px; width:100%; max-width:360px; animation:fadeIn .25s ease; }
.auth-logo { font-size:15px; font-weight:600; margin-bottom:28px; }
.auth-logo span { color:var(--muted); font-weight:300; }
.auth-label { font-size:11px; font-weight:500; letter-spacing:.7px; text-transform:uppercase; color:var(--muted); margin-bottom:6px; display:block; }
.auth-input { width:100%; border:1px solid var(--border); border-radius:7px; padding:10px 12px; font-family:inherit; font-size:14px; outline:none; margin-bottom:14px; transition:border-color .15s; background:var(--tag-bg); }
.auth-input:focus { border-color:var(--accent); background:white; }
.auth-btn { width:100%; background:var(--accent); color:white; border:none; padding:10px; border-radius:7px; font-family:inherit; font-size:14px; font-weight:500; cursor:pointer; }
.auth-btn:hover { opacity:.82; }
.auth-error { font-size:12px; color:var(--red); margin-top:10px; text-align:center; }
.auth-hint { font-size:11px; color:var(--muted); margin-top:20px; padding-top:16px; border-top:1px solid var(--border); line-height:1.6; }
.auth-hint code { background:var(--tag-bg); padding:2px 6px; border-radius:4px; font-size:11px; }

/* HEADER */
header { display:flex; align-items:center; justify-content:space-between; padding:18px 32px; border-bottom:1px solid var(--border); background:var(--surface); position:sticky; top:0; z-index:100; }
.logo { font-size:16px; font-weight:600; letter-spacing:-.3px; }
.logo span { color:var(--muted); font-weight:300; }
nav { display:flex; gap:4px; }
nav button { background:none; border:none; padding:6px 14px; border-radius:6px; cursor:pointer; font-family:inherit; font-size:13px; color:var(--muted); transition:all .15s; }
nav button.active, nav button:hover { background:var(--tag-bg); color:var(--text); }
.admin-badge { display:flex; align-items:center; gap:6px; font-size:11px; font-weight:500; color:var(--green); background:var(--green-bg); padding:4px 10px; border-radius:20px; }
.admin-dot { width:5px; height:5px; border-radius:50%; background:var(--green); }
.logout-btn { background:none; border:none; cursor:pointer; font-family:inherit; font-size:11px; color:var(--muted); padding:2px 6px; border-radius:4px; }
.logout-btn:hover { color:var(--red); }

/* MAIN */
main { max-width:820px; margin:0 auto; padding:32px 24px; }

/* INPUT */
.input-section { background:var(--surface); border:1px solid var(--border); border-radius:12px; overflow:hidden; margin-bottom:32px; }
.input-label { padding:16px 20px 0; font-size:11px; font-weight:500; letter-spacing:.8px; text-transform:uppercase; color:var(--muted); }
textarea { width:100%; border:none; outline:none; resize:none; font-family:inherit; font-size:15px; color:var(--text); background:transparent; padding:12px 20px 16px; min-height:90px; line-height:1.6; }
textarea::placeholder { color:#c0bdb5; }
.input-actions { display:flex; align-items:center; justify-content:space-between; padding:12px 20px; border-top:1px solid var(--border); background:#fdfcfb; }
.input-hint { font-size:12px; color:var(--muted); }
.btn-primary { background:var(--accent); color:white; border:none; padding:8px 20px; border-radius:7px; font-family:inherit; font-size:13px; font-weight:500; cursor:pointer; display:flex; align-items:center; gap:7px; }
.btn-primary:hover { opacity:.85; }
.btn-primary:disabled { opacity:.4; cursor:not-allowed; }
.processing { display:flex; align-items:center; gap:10px; padding:14px 20px; border-top:1px solid var(--border); font-size:13px; color:var(--muted); }
.spinner { width:14px; height:14px; border:2px solid var(--border); border-top-color:var(--muted); border-radius:50%; animation:spin .7s linear infinite; }
@keyframes spin { to { transform:rotate(360deg); } }
@keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }

/* PREVIEW */
.preview-card { border-top:1px solid var(--border); padding:20px; display:flex; flex-direction:column; gap:16px; }
.preview-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.field-group { display:flex; flex-direction:column; gap:4px; }
.field-group.full { grid-column:1/-1; }
.field-label { font-size:11px; font-weight:500; letter-spacing:.6px; text-transform:uppercase; color:var(--muted); }
.field-value { font-size:14px; color:var(--text); background:var(--tag-bg); border:1px solid var(--border); border-radius:6px; padding:7px 10px; font-family:inherit; width:100%; outline:none; transition:border-color .15s; }
.field-value:focus { border-color:var(--accent); background:white; }
.price-field { font-weight:600; font-size:16px; color:var(--green); }
.preview-actions { display:flex; gap:8px; justify-content:flex-end; padding-top:4px; border-top:1px solid var(--border); }
.btn-ghost { background:none; border:1px solid var(--border); padding:7px 16px; border-radius:7px; font-family:inherit; font-size:13px; cursor:pointer; color:var(--muted); }
.btn-ghost:hover { border-color:var(--accent); color:var(--text); }
.btn-publish { background:var(--green); color:white; border:none; padding:7px 20px; border-radius:7px; font-family:inherit; font-size:13px; font-weight:500; cursor:pointer; }
.btn-publish:hover { opacity:.85; }
.btn-publish:disabled { opacity:.5; cursor:not-allowed; }

/* LISTING */
.section-title { font-size:11px; font-weight:500; letter-spacing:.8px; text-transform:uppercase; color:var(--muted); margin-bottom:16px; display:flex; align-items:center; gap:8px; }
.section-title::after { content:''; flex:1; height:1px; background:var(--border); }
.filter-bar { display:flex; align-items:center; gap:8px; margin-bottom:20px; }
.filter-count { font-size:13px; color:var(--muted); margin-right:auto; }
.filter-chip { background:none; border:1px solid var(--border); padding:5px 12px; border-radius:20px; font-family:inherit; font-size:12px; cursor:pointer; color:var(--muted); }
.filter-chip.active { background:var(--accent); border-color:var(--accent); color:white; }
.listing { display:flex; flex-direction:column; }
.item { background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:18px 20px; display:grid; grid-template-columns:1fr auto; gap:12px; align-items:start; margin-bottom:8px; animation:fadeIn .3s ease; }
.item:hover { border-color:#d0cec8; }
.item-title { font-size:15px; font-weight:500; margin-bottom:4px; }
.item-desc { font-size:13px; color:var(--muted); margin-bottom:10px; line-height:1.5; }
.item-meta { display:flex; align-items:center; flex-wrap:wrap; gap:8px; }
.tag { font-size:11px; background:var(--tag-bg); color:var(--muted); padding:3px 8px; border-radius:4px; font-weight:500; }
.tag.condition-moi { background:var(--green-bg); color:var(--green); }
.tag.condition-cu { background:#fff8ec; color:#c47a1e; }
.item-right { display:flex; flex-direction:column; align-items:flex-end; gap:10px; min-width:120px; }
.item-price { font-size:18px; font-weight:600; white-space:nowrap; }
.item-actions { display:flex; flex-direction:column; gap:6px; align-items:flex-end; }
.btn-messenger { display:flex; align-items:center; gap:6px; background:#0084ff; color:white; border:none; padding:7px 14px; border-radius:7px; font-family:inherit; font-size:12px; font-weight:500; cursor:pointer; white-space:nowrap; }
.btn-messenger:hover { opacity:.85; }
.btn-copy { background:none; border:1px solid var(--border); padding:5px 12px; border-radius:7px; font-family:inherit; font-size:11px; cursor:pointer; color:var(--muted); }
.btn-copy:hover { border-color:var(--accent); color:var(--text); }
.btn-delete { background:none; border:1px solid #fcd0cc; padding:5px 12px; border-radius:7px; font-family:inherit; font-size:11px; cursor:pointer; color:var(--red); }
.btn-delete:hover { background:#fff0ee; }
.item-seller { font-size:11px; color:var(--muted); }
.status-dot { width:6px; height:6px; border-radius:50%; background:var(--green); display:inline-block; margin-right:5px; }

/* EMPTY */
.empty { text-align:center; padding:60px 20px; color:var(--muted); }
.empty-icon { font-size:36px; margin-bottom:12px; }
.empty p { font-size:14px; }

/* MODAL */
.modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.3); z-index:150; display:flex; align-items:center; justify-content:center; padding:20px; }
.modal { background:white; border-radius:12px; padding:28px; width:100%; max-width:440px; animation:fadeIn .2s ease; }
.modal h3 { font-size:15px; font-weight:600; margin-bottom:6px; }
.modal p { font-size:13px; color:var(--muted); margin-bottom:20px; }
.modal-input { width:100%; border:1px solid var(--border); border-radius:7px; padding:10px 12px; font-family:inherit; font-size:14px; outline:none; margin-bottom:12px; }
.modal-input:focus { border-color:var(--accent); }
.modal-actions { display:flex; gap:8px; justify-content:flex-end; }
.btn-blue { background:#0084ff; color:white; border:none; padding:8px 18px; border-radius:7px; font-family:inherit; font-size:13px; font-weight:500; cursor:pointer; }

/* TOAST */
.toast { position:fixed; bottom:24px; right:24px; background:var(--accent); color:white; padding:10px 18px; border-radius:8px; font-size:13px; z-index:200; animation:fadeIn .2s ease; }

@media (max-width:600px) {
  main { padding:20px 16px; }
  .item { grid-template-columns:1fr; }
  .item-right { flex-direction:row; align-items:center; justify-content:space-between; }
  .preview-grid { grid-template-columns:1fr; }
  header { padding:14px 20px; }
}
`

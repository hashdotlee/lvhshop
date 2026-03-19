'use client'
import { useEffect, useRef, useState } from 'react'
import type { Item } from '@/lib/supabase'

const ADMIN_HASH = process.env.NEXT_PUBLIC_ADMIN_HASH ?? 'admin-lvh2025'
const CHOT_TOT_URL = process.env.NEXT_PUBLIC_CHOT_TOT_URL ?? 'https://cho-tot.com'
const FB_PAGE_ID = process.env.NEXT_PUBLIC_FB_PAGE_ID ?? ''

function reltime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'Vừa đăng'
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`
  return `${Math.floor(diff / 86400)} ngày trước`
}

function formatVND(price: number | null | undefined): string {
  if (!price) return 'Thương lượng'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)
}

export default function Home() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [showAuthGate, setShowAuthGate] = useState(false)
  const [authInput, setAuthInput] = useState('')
  const [authError, setAuthError] = useState(false)
  const adminKey = useRef<string>('')

  const [items, setItems] = useState<Item[]>([])
  const [view, setView] = useState<'all' | 'ban' | 'mua'>('all')
  const [filter, setFilter] = useState<'all' | 'Mới' | 'Cũ'>('all')
  const [loading, setLoading] = useState(true)

  const [nlText, setNlText] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [preview, setPreview] = useState<Partial<Item> | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [messengerItem, setMessengerItem] = useState<Item | null>(null)
  const [messengerPhone, setMessengerPhone] = useState('')
  const [messengerMsg, setMessengerMsg] = useState('')

  const [toast, setToast] = useState('')
  const toastTimer = useRef<ReturnType<typeof setTimeout>>()

  function showToast(msg: string) {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2800)
  }

  async function fetchItems() {
    setLoading(true)
    try {
      const res = await fetch('/api/items')
      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
    } catch { showToast('Không thể tải danh sách') }
    finally { setLoading(false) }
  }

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
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: authInput }),
    })
    if (res.status === 401) {
      setAuthError(true); setAuthInput('')
      setTimeout(() => setAuthError(false), 3000)
    } else {
      adminKey.current = authInput
      sessionStorage.setItem('cq_admin', '1')
      sessionStorage.setItem('cq_admin_key', authInput)
      setIsAdmin(true); setShowAuthGate(false)
      fetchItems()
    }
  }

  function logout() {
    sessionStorage.removeItem('cq_admin'); sessionStorage.removeItem('cq_admin_key')
    adminKey.current = ''; setIsAdmin(false); showToast('Đã đăng xuất')
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { showToast('Ảnh tối đa 5MB'); return }
    setImageFile(file)
    setImagePreviewUrl(URL.createObjectURL(file))
  }

  function removeImage() {
    setImageFile(null); setImagePreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

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
      setPreview({ title: '', description: '', price: null, condition: 'Cũ - Còn tốt', category: '', type: 'ban', phone: '', location: '', image_url: '', ...data })
    } catch { showToast('Lỗi kết nối AI') }
    finally { setAnalyzing(false) }
  }

  async function publishItem() {
    if (!preview) return
    setPublishing(true)
    try {
      let image_url = preview.image_url ?? ''
      if (imageFile) {
        setUploadProgress(true)
        const form = new FormData()
        form.append('file', imageFile)
        form.append('adminKey', adminKey.current)
        const upRes = await fetch('/api/upload', { method: 'POST', body: form })
        if (upRes.ok) {
          const upData = await upRes.json()
          image_url = upData.url ?? ''
        } else {
          showToast('Upload ảnh thất bại, đăng tin không có ảnh')
        }
        setUploadProgress(false)
      }
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey.current },
        body: JSON.stringify({ ...preview, image_url }),
      })
      if (!res.ok) { showToast('Lỗi đăng tin'); return }
      setPreview(null); setNlText(''); removeImage(); showToast('Đã đăng tin!')
      fetchItems()
    } finally { setPublishing(false); setUploadProgress(false) }
  }

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

  function openMessenger(item: Item) {
    const msg = item.type === 'ban'
      ? `Xin chào! Mình thấy bạn đang bán "${item.title}" với giá ${formatVND(item.price)}. Cho mình hỏi thêm được không? 🙏`
      : `Chào bạn! Mình thấy bạn đang tìm mua "${item.title}". Mình có thể có hàng bạn cần, trao đổi thêm nhé! 😊`
    setMessengerItem(item); setMessengerPhone(item.phone ?? ''); setMessengerMsg(msg)
  }

  function sendMessenger() {
    const digits = messengerPhone.replace(/\D/g, '')
    if (!digits) { showToast('Vui lòng nhập SĐT'); return }
    const intl = digits.startsWith('0') ? '84' + digits.slice(1) : digits
    window.open(`https://m.me/${intl}?text=${encodeURIComponent(messengerMsg)}`, '_blank')
    setMessengerItem(null); showToast('Đã mở Messenger!')
  }

  function openFacebook(item: Item) {
    const msg = item.type === 'ban'
      ? `Mình quan tâm sản phẩm "${item.title}" giá ${formatVND(item.price)}. Còn hàng không bạn?`
      : `Mình có hàng bạn đang tìm: "${item.title}". Liên hệ mình nhé!`
    const target = FB_PAGE_ID
      ? `https://m.me/${FB_PAGE_ID}?text=${encodeURIComponent(msg)}`
      : `https://www.facebook.com`
    window.open(target, '_blank')
  }

  function copyInfo(item: Item) {
    const text = `${item.title}\n${item.description}\nGiá: ${formatVND(item.price)} | ${item.condition}${item.phone ? '\nLH: ' + item.phone : ''}${item.location ? ' | ' + item.location : ''}`
    navigator.clipboard.writeText(text).then(() => showToast('Đã sao chép!'))
  }

  const filtered = items.filter(i => {
    const typeOk = view === 'all' || i.type === view
    const filterOk = filter === 'all' || i.condition.startsWith(filter)
    return typeOk && filterOk
  })

  return (
    <>
      <style>{styles}</style>

      {showAuthGate && (
        <div className="auth-gate">
          <div className="auth-box">
            <div className="auth-logo">leviethoang<span>.shop / Admin</span></div>
            <label className="auth-label">Mật khẩu quản trị</label>
            <input
              className="auth-input" type="password" placeholder="Nhập mật khẩu..."
              value={authInput} onChange={e => setAuthInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && tryLogin()} autoFocus
            />
            <button className="auth-btn" onClick={tryLogin}>Đăng nhập →</button>
            {authError && <div className="auth-error">Mật khẩu không đúng</div>}
            <div className="auth-hint">Mật khẩu đặt qua env <code>ADMIN_PASSWORD</code> trên Vercel.</div>
          </div>
        </div>
      )}

      <header>
        <div className="logo">leviethoang<span>.shop</span></div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          {isAdmin && (
            <div className="admin-badge">
              <span className="admin-dot" /> Admin
              <button className="logout-btn" onClick={logout}>✕</button>
            </div>
          )}
          <nav>
            {(['all','ban','mua'] as const).map((v,i) => (
              <button key={v} className={view===v?'active':''} onClick={()=>setView(v)}>
                {['Tất cả','Bán','Tìm mua'][i]}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main>
        {isAdmin && (
          <div className="input-section">
            <div className="input-label">Nhập đơn hàng</div>
            <textarea
              placeholder="VD: Bán Sony WH-1000XM5 màu đen, mua 3 tháng, còn fullbox, giá 4 triệu, LH 0912345678..."
              value={nlText} onChange={e=>setNlText(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter'&&(e.metaKey||e.ctrlKey))analyzeInput()}}
              rows={3}
            />
            {analyzing && <div className="processing"><div className="spinner"/>AI đang phân tích...</div>}

            {preview && !analyzing && (
              <div className="preview-card">
                {/* Image */}
                <div style={{display:'flex',flexDirection:'column',gap:4}}>
                  <div className="field-label">Ảnh sản phẩm</div>
                  {imagePreviewUrl ? (
                    <div className="img-preview-wrap">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imagePreviewUrl} alt="preview" className="img-preview"/>
                      <button className="img-remove" onClick={removeImage}>✕</button>
                    </div>
                  ) : (
                    <label className="img-upload-label">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                      Thêm ảnh (tối đa 5MB)
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} style={{display:'none'}}/>
                    </label>
                  )}
                </div>

                <div className="preview-grid">
                  <div className="field-group full">
                    <div className="field-label">Tên sản phẩm</div>
                    <input className="field-value" value={preview.title??''} onChange={e=>setPreview(p=>({...p,title:e.target.value}))}/>
                  </div>
                  <div className="field-group full">
                    <div className="field-label">Mô tả</div>
                    <input className="field-value" value={preview.description??''} onChange={e=>setPreview(p=>({...p,description:e.target.value}))}/>
                  </div>
                  <div className="field-group">
                    <div className="field-label">Giá (VNĐ)</div>
                    <div className="price-input-wrap">
                      <input
                        className="field-value price-field"
                        type="number" min="0" step="1000"
                        placeholder="0"
                        value={preview.price ?? ''}
                        onChange={e => setPreview(p => ({ ...p, price: e.target.value ? Number(e.target.value) : null }))}
                      />
                      <span className="price-preview">
                        {preview.price ? formatVND(preview.price) : 'Thương lượng'}
                      </span>
                    </div>
                  </div>
                  <div className="field-group">
                    <div className="field-label">Tình trạng</div>
                    <select className="field-value" value={preview.condition??''} onChange={e=>setPreview(p=>({...p,condition:e.target.value}))}>
                      {['Mới','Cũ - Như mới','Cũ - Còn tốt','Cũ - Có lỗi nhỏ'].map(c=><option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="field-group">
                    <div className="field-label">Danh mục</div>
                    <input className="field-value" value={preview.category??''} onChange={e=>setPreview(p=>({...p,category:e.target.value}))}/>
                  </div>
                  <div className="field-group">
                    <div className="field-label">Loại</div>
                    <select className="field-value" value={preview.type??'ban'} onChange={e=>setPreview(p=>({...p,type:e.target.value as 'ban'|'mua'}))}>
                      <option value="ban">Bán</option>
                      <option value="mua">Tìm mua</option>
                    </select>
                  </div>
                  <div className="field-group">
                    <div className="field-label">SĐT liên hệ</div>
                    <input className="field-value" value={preview.phone??''} onChange={e=>setPreview(p=>({...p,phone:e.target.value}))}/>
                  </div>
                  <div className="field-group">
                    <div className="field-label">Địa điểm</div>
                    <input className="field-value" value={preview.location??''} onChange={e=>setPreview(p=>({...p,location:e.target.value}))}/>
                  </div>
                </div>
                <div className="preview-actions">
                  <button className="btn-ghost" onClick={()=>{setPreview(null);setNlText('');removeImage()}}>Hủy</button>
                  <button className="btn-publish" onClick={publishItem} disabled={publishing}>
                    {uploadProgress?'Đang upload ảnh...':publishing?'Đang đăng...':'Đăng tin →'}
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

        <div className="section-title">{{ all:'Tất cả tin', ban:'Đang rao bán', mua:'Cần tìm mua' }[view]}</div>
        <div className="filter-bar">
          <span className="filter-count">{filtered.length} tin</span>
          {(['all','Mới','Cũ'] as const).map(f=>(
            <button key={f} className={`filter-chip${filter===f?' active':''}`} onClick={()=>setFilter(f)}>
              {f==='all'?'Tất cả':f==='Mới'?'Mới':'Đã qua dùng'}
            </button>
          ))}
        </div>

        <div className="listing">
          {loading ? (
            <div className="empty"><div className="spinner" style={{margin:'0 auto'}}/></div>
          ) : filtered.length===0 ? (
            <div className="empty">
              <div className="empty-icon">📦</div>
              <p>Chưa có tin nào{isAdmin?'. Nhập đơn ở trên để bắt đầu.':'.'}</p>
            </div>
          ) : filtered.map(item=>(
            <div key={item.id} className="item">
              {item.image_url && (
                <div className="item-image-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image_url} alt={item.title} className="item-image"/>
                </div>
              )}
              <div className="item-body">
                <div className="item-title">{item.title}</div>
                <div className="item-desc">{item.description}</div>
                <div className="item-meta">
                  <span className="tag">{item.type==='ban'?'🏷️ Bán':'🔍 Tìm mua'}</span>
                  <span className={`tag ${item.condition==='Mới'?'condition-moi':'condition-cu'}`}>{item.condition}</span>
                  {item.category&&<span className="tag">{item.category}</span>}
                  {item.location&&<span className="tag">📍 {item.location}</span>}
                  <span className="item-time"><span className="status-dot"/>{reltime(item.created_at)}</span>
                </div>
              </div>
              <div className="item-right">
                <div className="item-price">{formatVND(item.price)}</div>
                <div className="item-actions">
                  {item.phone&&(
                    <button className="btn-messenger" onClick={()=>openMessenger(item)}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.918 1.418 5.525 3.641 7.24V22l3.299-1.813A10.7 10.7 0 0012 20.486c5.523 0 10-4.145 10-9.243S17.523 2 12 2z"/></svg>
                      Messenger
                    </button>
                  )}
                  <button className="btn-facebook" onClick={()=>openFacebook(item)}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="white"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>
                    Facebook
                  </button>
                  <a className="btn-chottot" href={CHOT_TOT_URL} target="_blank" rel="noopener noreferrer">
                    Xem thêm →
                  </a>
                  <button className="btn-copy" onClick={()=>copyInfo(item)}>Copy</button>
                  {isAdmin&&<button className="btn-delete" onClick={()=>deleteItem(item.id)}>Xoá</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {messengerItem&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setMessengerItem(null)}>
          <div className="modal">
            <h3>Gửi tin nhắn Messenger</h3>
            <p>Tin nhắn soạn sẵn, chỉnh nếu cần trước khi gửi.</p>
            <label className="auth-label" style={{display:'block',marginBottom:6}}>SĐT / Messenger ID</label>
            <input className="modal-input" value={messengerPhone} onChange={e=>setMessengerPhone(e.target.value)} placeholder="09xxxxxxxx"/>
            <textarea className="modal-input" style={{minHeight:90,resize:'vertical'}} value={messengerMsg} onChange={e=>setMessengerMsg(e.target.value)}/>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={()=>setMessengerItem(null)}>Đóng</button>
              <button className="btn-blue" onClick={sendMessenger}>Mở Messenger →</button>
            </div>
          </div>
        </div>
      )}

      {toast&&<div className="toast">{toast}</div>}
    </>
  )
}

const styles = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#f9f8f6;--surface:#fff;--border:#e8e6e1;--text:#1a1916;--muted:#8c8982;--accent:#1a1916;--tag-bg:#f0efe9;--green:#2a7a4b;--green-bg:#edf7f2;--red:#c0392b;--fb:#1877f2;--ct:#e65c00}
body{font-family:'Be Vietnam Pro',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;font-size:14px;line-height:1.6}
.auth-gate{position:fixed;inset:0;background:var(--bg);display:flex;align-items:center;justify-content:center;z-index:999;padding:24px}
.auth-box{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:36px 32px;width:100%;max-width:360px;animation:fadeIn .25s ease}
.auth-logo{font-size:15px;font-weight:600;margin-bottom:28px}
.auth-logo span{color:var(--muted);font-weight:300}
.auth-label{font-size:11px;font-weight:500;letter-spacing:.7px;text-transform:uppercase;color:var(--muted);margin-bottom:6px;display:block}
.auth-input{width:100%;border:1px solid var(--border);border-radius:7px;padding:10px 12px;font-family:inherit;font-size:14px;outline:none;margin-bottom:14px;background:var(--tag-bg);transition:border-color .15s}
.auth-input:focus{border-color:var(--accent);background:white}
.auth-btn{width:100%;background:var(--accent);color:white;border:none;padding:10px;border-radius:7px;font-family:inherit;font-size:14px;font-weight:500;cursor:pointer}
.auth-btn:hover{opacity:.82}
.auth-error{font-size:12px;color:var(--red);margin-top:10px;text-align:center}
.auth-hint{font-size:11px;color:var(--muted);margin-top:20px;padding-top:16px;border-top:1px solid var(--border);line-height:1.6}
.auth-hint code{background:var(--tag-bg);padding:2px 6px;border-radius:4px;font-size:11px}
header{display:flex;align-items:center;justify-content:space-between;padding:18px 32px;border-bottom:1px solid var(--border);background:var(--surface);position:sticky;top:0;z-index:100}
.logo{font-size:16px;font-weight:600;letter-spacing:-.3px}
.logo span{color:var(--muted);font-weight:300}
nav{display:flex;gap:4px}
nav button{background:none;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;font-family:inherit;font-size:13px;color:var(--muted);transition:all .15s}
nav button.active,nav button:hover{background:var(--tag-bg);color:var(--text)}
.admin-badge{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:500;color:var(--green);background:var(--green-bg);padding:4px 10px;border-radius:20px}
.admin-dot{width:5px;height:5px;border-radius:50%;background:var(--green)}
.logout-btn{background:none;border:none;cursor:pointer;font-family:inherit;font-size:11px;color:var(--muted);padding:2px 6px;border-radius:4px}
.logout-btn:hover{color:var(--red)}
main{max-width:860px;margin:0 auto;padding:32px 24px}
.input-section{background:var(--surface);border:1px solid var(--border);border-radius:12px;overflow:hidden;margin-bottom:32px}
.input-label{padding:16px 20px 0;font-size:11px;font-weight:500;letter-spacing:.8px;text-transform:uppercase;color:var(--muted)}
textarea{width:100%;border:none;outline:none;resize:none;font-family:inherit;font-size:15px;color:var(--text);background:transparent;padding:12px 20px 16px;min-height:90px;line-height:1.6}
textarea::placeholder{color:#c0bdb5}
.input-actions{display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-top:1px solid var(--border);background:#fdfcfb}
.input-hint{font-size:12px;color:var(--muted)}
.btn-primary{background:var(--accent);color:white;border:none;padding:8px 20px;border-radius:7px;font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;display:flex;align-items:center;gap:7px;transition:opacity .15s}
.btn-primary:hover{opacity:.85}
.btn-primary:disabled{opacity:.4;cursor:not-allowed}
.processing{display:flex;align-items:center;gap:10px;padding:14px 20px;border-top:1px solid var(--border);font-size:13px;color:var(--muted)}
.spinner{width:14px;height:14px;border:2px solid var(--border);border-top-color:var(--muted);border-radius:50%;animation:spin .7s linear infinite;flex-shrink:0}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.price-input-wrap{display:flex;flex-direction:column;gap:4px}
.price-preview{font-size:13px;color:var(--green);font-weight:500;padding:2px 0}
input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{opacity:1}
.img-upload-label{display:flex;align-items:center;gap:8px;padding:10px 14px;border:1px dashed var(--border);border-radius:8px;cursor:pointer;font-size:13px;color:var(--muted);transition:all .15s;margin:0 20px 0}
.img-upload-label:hover{border-color:var(--accent);color:var(--text);background:var(--tag-bg)}
.img-preview-wrap{position:relative;display:block;margin:0 20px 0}
.img-preview{width:100%;max-height:200px;object-fit:cover;border-radius:8px;border:1px solid var(--border);display:block}
.img-remove{position:absolute;top:6px;right:6px;background:rgba(0,0,0,.55);color:white;border:none;border-radius:50%;width:22px;height:22px;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center}
.preview-card{border-top:1px solid var(--border);padding:20px;display:flex;flex-direction:column;gap:14px}
.preview-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.field-group{display:flex;flex-direction:column;gap:4px}
.field-group.full{grid-column:1/-1}
.field-label{font-size:11px;font-weight:500;letter-spacing:.6px;text-transform:uppercase;color:var(--muted)}
.field-value{font-size:14px;color:var(--text);background:var(--tag-bg);border:1px solid var(--border);border-radius:6px;padding:7px 10px;font-family:inherit;width:100%;outline:none;transition:border-color .15s}
.field-value:focus{border-color:var(--accent);background:white}
.price-field{font-weight:600;font-size:16px;color:var(--green)}
.preview-actions{display:flex;gap:8px;justify-content:flex-end;padding-top:4px;border-top:1px solid var(--border)}
.btn-ghost{background:none;border:1px solid var(--border);padding:7px 16px;border-radius:7px;font-family:inherit;font-size:13px;cursor:pointer;color:var(--muted);transition:all .15s}
.btn-ghost:hover{border-color:var(--accent);color:var(--text)}
.btn-publish{background:var(--green);color:white;border:none;padding:7px 20px;border-radius:7px;font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;transition:opacity .15s}
.btn-publish:hover{opacity:.85}
.btn-publish:disabled{opacity:.5;cursor:not-allowed}
.section-title{font-size:11px;font-weight:500;letter-spacing:.8px;text-transform:uppercase;color:var(--muted);margin-bottom:16px;display:flex;align-items:center;gap:8px}
.section-title::after{content:'';flex:1;height:1px;background:var(--border)}
.filter-bar{display:flex;align-items:center;gap:8px;margin-bottom:20px}
.filter-count{font-size:13px;color:var(--muted);margin-right:auto}
.filter-chip{background:none;border:1px solid var(--border);padding:5px 12px;border-radius:20px;font-family:inherit;font-size:12px;cursor:pointer;color:var(--muted);transition:all .15s}
.filter-chip.active{background:var(--accent);border-color:var(--accent);color:white}
.listing{display:flex;flex-direction:column;gap:8px}
.item{background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden;display:grid;grid-template-columns:1fr auto;align-items:start;animation:fadeIn .3s ease;transition:border-color .15s}
.item:hover{border-color:#ccc9c1}
.item-image-wrap{grid-column:1/-1}
.item-image{width:100%;max-height:260px;object-fit:cover;display:block;border-bottom:1px solid var(--border)}
.item-body{padding:16px 18px}
.item-title{font-size:15px;font-weight:500;margin-bottom:4px}
.item-desc{font-size:13px;color:var(--muted);margin-bottom:10px;line-height:1.5}
.item-meta{display:flex;align-items:center;flex-wrap:wrap;gap:7px}
.tag{font-size:11px;background:var(--tag-bg);color:var(--muted);padding:3px 8px;border-radius:4px;font-weight:500}
.tag.condition-moi{background:var(--green-bg);color:var(--green)}
.tag.condition-cu{background:#fff8ec;color:#c47a1e}
.item-time{font-size:11px;color:var(--muted);display:flex;align-items:center}
.status-dot{width:6px;height:6px;border-radius:50%;background:var(--green);display:inline-block;margin-right:5px;flex-shrink:0}
.item-right{padding:16px 18px 16px 0;display:flex;flex-direction:column;align-items:stretch;gap:8px;min-width:130px}
.item-price{font-size:18px;font-weight:600;white-space:nowrap;text-align:right}
.item-actions{display:flex;flex-direction:column;gap:5px}
.btn-messenger{display:flex;align-items:center;justify-content:center;gap:6px;background:#0084ff;color:white;border:none;padding:7px 10px;border-radius:7px;font-family:inherit;font-size:12px;font-weight:500;cursor:pointer;transition:opacity .15s}
.btn-messenger:hover{opacity:.85}
.btn-facebook{display:flex;align-items:center;justify-content:center;gap:6px;background:var(--fb);color:white;border:none;padding:7px 10px;border-radius:7px;font-family:inherit;font-size:12px;font-weight:500;cursor:pointer;transition:opacity .15s}
.btn-facebook:hover{opacity:.85}
.btn-chottot{display:flex;align-items:center;justify-content:center;background:var(--ct);color:white;border:none;padding:7px 10px;border-radius:7px;font-family:inherit;font-size:12px;font-weight:500;cursor:pointer;text-decoration:none;transition:opacity .15s}
.btn-chottot:hover{opacity:.85}
.btn-copy{background:none;border:1px solid var(--border);padding:5px 10px;border-radius:7px;font-family:inherit;font-size:11px;cursor:pointer;color:var(--muted);transition:all .15s;text-align:center}
.btn-copy:hover{border-color:var(--accent);color:var(--text)}
.btn-delete{background:none;border:1px solid #fcd0cc;padding:5px 10px;border-radius:7px;font-family:inherit;font-size:11px;cursor:pointer;color:var(--red);transition:background .15s;text-align:center}
.btn-delete:hover{background:#fff0ee}
.empty{text-align:center;padding:60px 20px;color:var(--muted)}
.empty-icon{font-size:36px;margin-bottom:12px}
.empty p{font-size:14px}
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:150;display:flex;align-items:center;justify-content:center;padding:20px}
.modal{background:white;border-radius:12px;padding:28px;width:100%;max-width:440px;animation:fadeIn .2s ease}
.modal h3{font-size:15px;font-weight:600;margin-bottom:6px}
.modal p{font-size:13px;color:var(--muted);margin-bottom:20px}
.modal-input{width:100%;border:1px solid var(--border);border-radius:7px;padding:10px 12px;font-family:inherit;font-size:14px;outline:none;margin-bottom:12px;transition:border-color .15s}
.modal-input:focus{border-color:var(--accent)}
.modal-actions{display:flex;gap:8px;justify-content:flex-end}
.btn-blue{background:#0084ff;color:white;border:none;padding:8px 18px;border-radius:7px;font-family:inherit;font-size:13px;font-weight:500;cursor:pointer}
.toast{position:fixed;bottom:24px;right:24px;background:var(--accent);color:white;padding:10px 18px;border-radius:8px;font-size:13px;z-index:200;animation:fadeIn .2s ease}
@media(max-width:640px){
  main{padding:20px 16px}
  header{padding:14px 20px}
  .item{grid-template-columns:1fr}
  .item-right{padding:0 16px 16px;flex-direction:row;align-items:center;flex-wrap:wrap;justify-content:space-between;min-width:unset;gap:6px}
  .item-price{font-size:16px}
  .item-actions{flex-direction:row;flex-wrap:wrap;gap:5px}
  .preview-grid{grid-template-columns:1fr}
  .item-image{max-height:200px}
}
`

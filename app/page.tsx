'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Item, Customer } from '@/lib/supabase'

const ADMIN_HASH = process.env.NEXT_PUBLIC_ADMIN_HASH   ?? 'admin-lvh2025'
const CHOT_TOT   = process.env.NEXT_PUBLIC_CHOT_TOT_URL ?? 'https://cho-tot.com'
const FB_PAGE_ID = process.env.NEXT_PUBLIC_FB_PAGE_ID   ?? ''

const POSTERS = ['Hoàng', 'Kiên', 'Đạt']

function reltime(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000
  if (d < 60) return 'Vừa đăng'
  if (d < 3600) return `${Math.floor(d/60)} phút trước`
  if (d < 86400) return `${Math.floor(d/3600)} giờ trước`
  return `${Math.floor(d/86400)} ngày trước`
}
function fmtVND(v: number|null|undefined) {
  if (!v) return 'Thương lượng'
  return new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'}).format(v)
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'})
}
function getImages(item: Item): string[] {
  if (item.images && item.images.length > 0) return item.images
  if (item.image_url) return [item.image_url]
  return []
}

// ─── Carousel component ──────────────────────────────────────────
function Carousel({ images, onOpen, sold }: { images: string[]; onOpen: (i: number) => void; sold: boolean }) {
  const [idx, setIdx] = useState(0)
  if (images.length === 0) return null
  const prev = (e: React.MouseEvent) => { e.stopPropagation(); setIdx(i => (i - 1 + images.length) % images.length) }
  const next = (e: React.MouseEvent) => { e.stopPropagation(); setIdx(i => (i + 1) % images.length) }
  return (
    <div className="carousel" onClick={() => onOpen(idx)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={images[idx]} alt={`photo ${idx+1}`} className="carousel-img" />
      {sold && <div className="sold-overlay">ĐÃ BÁN</div>}
      {images.length > 1 && (
        <>
          <button className="car-btn car-prev" onClick={prev}>‹</button>
          <button className="car-btn car-next" onClick={next}>›</button>
          <div className="car-dots">
            {images.map((_,i) => (
              <button key={i} className={`car-dot${i===idx?' car-dot-active':''}`}
                onClick={e=>{e.stopPropagation();setIdx(i)}} />
            ))}
          </div>
          <div className="car-counter">{idx+1}/{images.length}</div>
        </>
      )}
      <div className="car-zoom-hint">🔍</div>
    </div>
  )
}

// ─── Lightbox component ──────────────────────────────────────────
function Lightbox({ images, startIdx, onClose }: { images: string[]; startIdx: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIdx)
  const prev = useCallback(() => setIdx(i => (i - 1 + images.length) % images.length), [images.length])
  const next = useCallback(() => setIdx(i => (i + 1) % images.length), [images.length])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, prev, next])

  return (
    <div className="lightbox" onClick={onClose}>
      <button className="lb-close" onClick={onClose}>✕</button>
      <button className="lb-btn lb-prev" onClick={e=>{e.stopPropagation();prev()}}>‹</button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={images[idx]} alt={`photo ${idx+1}`} className="lb-img"
        onClick={e => e.stopPropagation()}
      />
      <button className="lb-btn lb-next" onClick={e=>{e.stopPropagation();next()}}>›</button>
      {images.length > 1 && (
        <>
          <div className="lb-counter">{idx+1} / {images.length}</div>
          <div className="lb-thumbs" onClick={e=>e.stopPropagation()}>
            {images.map((src,i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt="" className={`lb-thumb${i===idx?' lb-thumb-active':''}`} onClick={()=>setIdx(i)} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────────
export default function Home() {
  const [isAdmin, setIsAdmin]         = useState(false)
  const [showAuth, setShowAuth]       = useState(false)
  const [authInput, setAuthInput]     = useState('')
  const [authError, setAuthError]     = useState(false)
  const adminKey = useRef('')

  const [adminView, setAdminView]     = useState<'listing'|'customers'>('listing')

  const [items, setItems]             = useState<Item[]>([])
  const [typeFilter, setTypeFilter]   = useState<'all'|'ban'|'mua'>('all')
  const [condFilter, setCondFilter]   = useState<'all'|'Mới'|'Cũ'>('all')
  const [statusFilter, setStatusFilter] = useState<'available'|'sold'|'incoming'|'all'>('available')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [posterFilter, setPosterFilter]   = useState<string>('all')
  const [priceRange, setPriceRange]     = useState<'all'|'under1m'|'1to5m'|'5to10m'|'over10m'>('all')
  const [searchQuery, setSearchQuery]   = useState('')
  const [loadingItems, setLoadingItems] = useState(true)

  const [showBuyForm, setShowBuyForm]   = useState(false)
  const [buyForm, setBuyForm]           = useState({ title:'', description:'', price:'', condition:'Mới', category:'', phone:'', location:'' })
  const [submittingBuy, setSubmittingBuy] = useState(false)

  const [nlText, setNlText]           = useState('')
  const [analyzing, setAnalyzing]     = useState(false)
  const [preview, setPreview]         = useState<Partial<Item>|null>(null)
  const [publishing, setPublishing]   = useState(false)

  // multi-image state
  const [imgFiles, setImgFiles]       = useState<File[]>([])
  const [imgPreviews, setImgPreviews] = useState<string[]>([])
  const [uploading, setUploading]     = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // lightbox
  const [lbImages, setLbImages]       = useState<string[]>([])
  const [lbIdx, setLbIdx]             = useState(0)

  const [soldItem, setSoldItem]       = useState<Item|null>(null)
  const [custForm, setCustForm]       = useState({ name:'', phone:'', address:'', note:'' })
  const [savingSold, setSavingSold]   = useState(false)
  const [soldCustMode, setSoldCustMode] = useState<'search'|'new'>('search')
  const [soldCustSearch, setSoldCustSearch] = useState('')
  const [selectedCust, setSelectedCust] = useState<Customer|null>(null)

  const [customers, setCustomers]     = useState<Customer[]>([])
  const [loadingCust, setLoadingCust] = useState(false)
  const [editCust, setEditCust]       = useState<Customer|null>(null)
  const [custSearch, setCustSearch]   = useState('')

  const [msgItem, setMsgItem]         = useState<Item|null>(null)
  const [msgPhone, setMsgPhone]       = useState('')
  const [msgText, setMsgText]         = useState('')

  const [toast, setToast]             = useState('')
  const toastTimer = useRef<ReturnType<typeof setTimeout>>()
  function showToast(m: string) {
    setToast(m); clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2800)
  }

  // ── fetch ─────────────────────────────────────────────────────
  async function fetchItems(silent = false) {
    if (!silent) setLoadingItems(true)
    try {
      const r = await fetch('/api/items'); const d = await r.json()
      setItems(Array.isArray(d) ? d : [])
      setLastUpdated(new Date())
    } catch { if (!silent) showToast('Không thể tải danh sách') }
    finally { if (!silent) setLoadingItems(false) }
  }
  async function fetchCustomers() {
    setLoadingCust(true)
    try {
      const r = await fetch('/api/customers', { headers: {'x-admin-key': adminKey.current} })
      const d = await r.json(); setCustomers(Array.isArray(d) ? d : [])
    } catch { showToast('Không thể tải khách hàng') }
    finally { setLoadingCust(false) }
  }

  const [lastUpdated, setLastUpdated] = useState<Date|null>(null)
  const autoReloadRef = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.location.hash === `#${ADMIN_HASH}`) {
      history.replaceState(null,'', window.location.pathname + window.location.search)
      setShowAuth(true)
    } else if (sessionStorage.getItem('cq_admin')) {
      adminKey.current = sessionStorage.getItem('cq_admin_key') ?? ''
      setIsAdmin(true)
    }
    fetchItems()

    // Auto-reload every 5s for buyers
    autoReloadRef.current = setInterval(() => {
      fetchItems(true)
    }, 5000)

    return () => clearInterval(autoReloadRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── auth ──────────────────────────────────────────────────────
  async function tryLogin() {
    const r = await fetch('/api/auth', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ password: authInput }) })
    if (r.status === 401) { setAuthError(true); setAuthInput(''); setTimeout(()=>setAuthError(false),3000) }
    else {
      adminKey.current = authInput
      sessionStorage.setItem('cq_admin','1'); sessionStorage.setItem('cq_admin_key', authInput)
      setIsAdmin(true); setShowAuth(false); fetchItems()
    }
  }
  function logout() {
    sessionStorage.removeItem('cq_admin'); sessionStorage.removeItem('cq_admin_key')
    adminKey.current = ''; setIsAdmin(false); setAdminView('listing'); showToast('Đã đăng xuất')
  }

  // ── images ────────────────────────────────────────────────────
  function handleImgs(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter(f => f.size <= 8*1024*1024)
    if (files.length < (e.target.files?.length ?? 0)) showToast('Một số ảnh vượt 8MB, đã bỏ qua')
    const newFiles = [...imgFiles, ...files].slice(0, 8)
    setImgFiles(newFiles)
    setImgPreviews(newFiles.map(f => URL.createObjectURL(f)))
    if (fileRef.current) fileRef.current.value = ''
  }

  function addImageFiles(newFiles: File[]) {
    const valid = newFiles.filter(f => f.type.startsWith('image/') && f.size <= 8*1024*1024)
    if (!valid.length) return
    const merged = [...imgFiles, ...valid].slice(0, 8)
    setImgFiles(merged)
    setImgPreviews(merged.map(f => URL.createObjectURL(f)))
  }

  // Paste from clipboard
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      if (!preview) return
      const items = Array.from(e.clipboardData?.items ?? [])
      const imageItems = items.filter(i => i.type.startsWith('image/'))
      if (!imageItems.length) return
      e.preventDefault()
      const files = imageItems.map(i => i.getAsFile()).filter(Boolean) as File[]
      addImageFiles(files)
      showToast(`Đã dán ${files.length} ảnh từ clipboard`)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview, imgFiles])
  function removeImgAt(i: number) {
    setImgFiles(p => p.filter((_,j) => j!==i))
    setImgPreviews(p => p.filter((_,j) => j!==i))
  }
  function clearImgs() { setImgFiles([]); setImgPreviews([]) }

  // ── analyze ───────────────────────────────────────────────────
  async function analyze() {
    if (!nlText.trim()) return
    setAnalyzing(true)
    try {
      const r = await fetch('/api/analyze', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ text: nlText }),
      })
      const d = await r.json()
      if (!r.ok || d.error) {
        showToast(`Lỗi AI: ${d.error ?? r.status}`)
        return
      }
      if (!d.title && !d.description) {
        showToast('AI không trích xuất được thông tin, thử lại hoặc nhập thủ công')
        return
      }
      setPreview({
        title:'', description:'', price:null, condition:'Cũ - Còn tốt',
        category:'', type:'ban', phone:'', location:'', images:[],
        status:'available', expected_date: null,
        ...d
      })
    } catch (e) {
      console.error(e)
      showToast('Không thể kết nối server')
    } finally { setAnalyzing(false) }
  }

  // ── publish ───────────────────────────────────────────────────
  async function publish() {
    if (!preview) return
    setPublishing(true)
    let images: string[] = []
    try {
      if (imgFiles.length > 0) {
        setUploading(true)
        const form = new FormData()
        imgFiles.forEach(f => form.append('files', f))
        form.append('adminKey', adminKey.current)
        const ur = await fetch('/api/upload', { method:'POST', body: form })
        if (ur.ok) { images = (await ur.json()).urls ?? [] }
        else showToast('Upload ảnh thất bại')
        setUploading(false)
      }
      const r = await fetch('/api/items', {
        method:'POST',
        headers:{'Content-Type':'application/json','x-admin-key': adminKey.current},
        body: JSON.stringify({ ...preview, images }),
      })
      if (!r.ok) { showToast('Lỗi đăng tin'); return }
      setPreview(null); setNlText(''); clearImgs(); showToast('Đã đăng tin!')
      fetchItems()
    } finally { setPublishing(false); setUploading(false) }
  }

  // ── sold ──────────────────────────────────────────────────────
  async function markSold() {
    if (!soldItem) return; setSavingSold(true)
    try {
      await fetch('/api/items', { method:'PATCH', headers:{'Content-Type':'application/json','x-admin-key':adminKey.current}, body: JSON.stringify({ id:soldItem.id, status:'sold' }) })

      if (soldCustMode === 'search' && selectedCust) {
        await fetch('/api/customers', { method:'PATCH', headers:{'Content-Type':'application/json','x-admin-key':adminKey.current},
          body: JSON.stringify({ id: selectedCust.id, item_id: soldItem.id, order_code: soldItem.order_code }) })
      } else if (soldCustMode === 'new' && (custForm.name || custForm.phone)) {
        await fetch('/api/customers', { method:'POST', headers:{'Content-Type':'application/json','x-admin-key':adminKey.current},
          body: JSON.stringify({ item_id:soldItem.id, order_code:soldItem.order_code, ...custForm }) })
      }

      setItems(prev => prev.map(i => i.id===soldItem.id ? {...i,status:'sold'} : i))
      setSoldItem(null); showToast(`Đã bán · ${soldItem.order_code}`)
      fetchCustomers()
    } finally { setSavingSold(false) }
  }
  async function markAvailable(item: Item) {
    await fetch('/api/items', { method:'PATCH', headers:{'Content-Type':'application/json','x-admin-key':adminKey.current}, body: JSON.stringify({ id:item.id, status:'available' }) })
    setItems(prev => prev.map(i => i.id===item.id ? {...i,status:'available'} : i))
    showToast('Đã mở lại tin')
  }
  async function markIncoming(item: Item) {
    await fetch('/api/items', { method:'PATCH', headers:{'Content-Type':'application/json','x-admin-key':adminKey.current}, body: JSON.stringify({ id:item.id, status:'incoming' }) })
    setItems(prev => prev.map(i => i.id===item.id ? {...i,status:'incoming'} : i))
    showToast(`Đánh dấu sắp về · ${item.order_code}`)
  }
  async function deleteItem(id: number) {
    if (!confirm('Xoá tin này?')) return
    await fetch('/api/items', { method:'DELETE', headers:{'Content-Type':'application/json','x-admin-key':adminKey.current}, body: JSON.stringify({ id }) })
    setItems(prev => prev.filter(i => i.id!==id)); showToast('Đã xoá tin')
  }

  // ── customers ─────────────────────────────────────────────────
  async function saveCust(c: Customer) {
    const { items: _, created_at: __, ...fields } = c
    await fetch('/api/customers', { method:'PATCH', headers:{'Content-Type':'application/json','x-admin-key':adminKey.current}, body: JSON.stringify(fields) })
    setCustomers(prev => prev.map(x => x.id===c.id ? c : x)); setEditCust(null); showToast('Đã cập nhật')
  }
  async function deleteCust(id: number) {
    if (!confirm('Xoá khách hàng này?')) return
    await fetch('/api/customers', { method:'DELETE', headers:{'Content-Type':'application/json','x-admin-key':adminKey.current}, body: JSON.stringify({ id }) })
    setCustomers(prev => prev.filter(c => c.id!==id)); showToast('Đã xoá')
  }

  // ── messenger ─────────────────────────────────────────────────
  function openMessenger(item: Item) {
    const m = item.type==='ban' ? `Xin chào! Mình thấy bạn đang bán "${item.title}" (${item.order_code}) giá ${fmtVND(item.price)}. Cho mình hỏi thêm nhé 🙏` : `Chào bạn! Mình tìm "${item.title}" - bạn có hàng không? 😊`
    setMsgItem(item); setMsgPhone(item.phone??''); setMsgText(m)
  }
  function sendMessenger() {
    const d = msgPhone.replace(/\D/g,''); if (!d) { showToast('Nhập SĐT'); return }
    const intl = d.startsWith('0') ? '84'+d.slice(1) : d
    window.open(`https://m.me/${intl}?text=${encodeURIComponent(msgText)}`, '_blank')
    setMsgItem(null); showToast('Đã mở Messenger!')
  }
  function openFB(item: Item) {
    const m = `Mình quan tâm "${item.title}" (${item.order_code}) giá ${fmtVND(item.price)}. Còn hàng không?`
    window.open(FB_PAGE_ID ? `https://m.me/${FB_PAGE_ID}?text=${encodeURIComponent(m)}` : 'https://facebook.com', '_blank')
  }
  function copyInfo(item: Item) {
    const imgs = getImages(item)
    const t = `[${item.order_code}] ${item.title}\n${item.description}\nGiá: ${fmtVND(item.price)} | ${item.condition}${item.phone?'\nLH: '+item.phone:''}${item.location?' | '+item.location:''}${imgs.length?' \n🖼 '+imgs.join(' '):''}`
    navigator.clipboard.writeText(t).then(() => showToast('Đã sao chép!'))
  }

  async function submitBuyRequest() {
    if (!buyForm.title.trim()) { showToast('Nhập tên sản phẩm cần tìm'); return }
    setSubmittingBuy(true)
    try {
      const r = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...buyForm, type: 'mua', price: buyForm.price ? Number(buyForm.price) : null }),
      })
      if (!r.ok) { showToast('Lỗi đăng yêu cầu'); return }
      setShowBuyForm(false)
      setBuyForm({ title:'', description:'', price:'', condition:'Mới', category:'', phone:'', location:'' })
      showToast('Đã đăng yêu cầu tìm mua!')
      fetchItems()
    } catch { showToast('Không thể kết nối server') }
    finally { setSubmittingBuy(false) }
  }

  const categories = Array.from(new Set(items.map(i => i.category).filter(Boolean))) as string[]

  const filtered = items.filter(i => {
    const typeOk = typeFilter==='all' || i.type===typeFilter
    const condOk = condFilter==='all' || i.condition.startsWith(condFilter)
    const statOk = statusFilter==='all' ? true
      : statusFilter==='available' ? (i.status==='available' || i.status==='incoming')
      : i.status===statusFilter
    const catOk = categoryFilter==='all' || i.category===categoryFilter
    const posterOk = posterFilter==='all' || i.posted_by===posterFilter
    const q = searchQuery.trim().toLowerCase()
    const searchOk = !q || i.title.toLowerCase().includes(q) || (i.order_code??'').toLowerCase().includes(q)
    const p = i.price ?? 0
    const priceOk = priceRange==='all' ? true
      : priceRange==='under1m' ? p < 1_000_000
      : priceRange==='1to5m'   ? (p >= 1_000_000 && p <= 5_000_000)
      : priceRange==='5to10m'  ? (p >= 5_000_000 && p <= 10_000_000)
      : p > 10_000_000
    return typeOk && condOk && statOk && catOk && posterOk && searchOk && priceOk
  })

  const featuredItems = items
    .filter(i => (i.status === 'available' || i.status === 'incoming') && getImages(i).length > 0)
    .slice(0, 5)

  const filteredCust = customers.filter(c =>
    !custSearch || [c.name,c.phone,c.order_code,c.address].some(v=>v?.toLowerCase().includes(custSearch.toLowerCase()))
  )

  // ─────────────────────────────────────────────────────────────
  return (
    <>
      <style>{styles}</style>

      {/* AUTH */}
      {showAuth && (
        <div className="auth-gate">
          <div className="auth-box">
            <div className="auth-logo">leviethoang<span>.shop / Admin</span></div>
            <label className="lbl">Mật khẩu quản trị</label>
            <input className="inp" type="password" placeholder="Nhập mật khẩu..."
              value={authInput} onChange={e=>setAuthInput(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&tryLogin()} autoFocus />
            <button className="btn-dark w-full" onClick={tryLogin}>Đăng nhập →</button>
            {authError && <div className="auth-err">Mật khẩu không đúng</div>}
            <div className="auth-hint">Đặt qua env <code>ADMIN_PASSWORD</code> trên Vercel.</div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header>
        <div className="logo">leviethoang<span>.shop</span></div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          {isAdmin ? (
            <>
              <button className={`tab-btn${adminView==='listing'?' tab-active':''}`} onClick={()=>setAdminView('listing')}>Tin đăng</button>
              <button className={`tab-btn${adminView==='customers'?' tab-active':''}`} onClick={()=>{setAdminView('customers');if(!customers.length)fetchCustomers()}}>
                Khách hàng{customers.length>0&&<span className="badge">{customers.length}</span>}
              </button>
              <div className="admin-badge"><span className="admin-dot"/>Admin
                <button className="logout-btn" onClick={logout}>✕</button>
              </div>
            </>
          ) : (
            <nav>
              {(['all','ban','mua'] as const).map((v,i)=>(
                <button key={v} className={typeFilter===v?'active':''} onClick={()=>setTypeFilter(v)}>{['Tất cả','Bán','Tìm mua'][i]}</button>
              ))}
            </nav>
          )}
        </div>
      </header>

      <main>

        {/* CUSTOMER VIEW */}
        {isAdmin && adminView==='customers' && (
          <div>
            <div className="section-title">Quản lý khách hàng</div>
            <div className="filter-bar" style={{marginBottom:20}}>
              <input className="inp" style={{flex:1,maxWidth:320}} placeholder="Tìm tên, SĐT, mã đơn..."
                value={custSearch} onChange={e=>setCustSearch(e.target.value)} />
              <button className="btn-ghost" onClick={fetchCustomers}>↻</button>
            </div>
            {loadingCust ? <div className="empty"><div className="spinner" style={{margin:'0 auto'}}/></div>
            : filteredCust.length===0 ? <div className="empty"><div className="empty-icon">👥</div><p>Chưa có khách hàng nào.</p></div>
            : (
              <div className="cust-table-wrap">
                <table className="cust-table">
                  <thead><tr><th>Mã đơn</th><th>Sản phẩm</th><th>Khách hàng</th><th>SĐT</th><th>Địa chỉ</th><th>Ghi chú</th><th>Ngày</th><th></th></tr></thead>
                  <tbody>
                    {filteredCust.map(c=>(
                      <tr key={c.id}>
                        <td><code className="order-code">{c.order_code||'—'}</code></td>
                        <td style={{maxWidth:160}}>{c.items?.title||'—'}<br/><span style={{color:'var(--green)',fontSize:12}}>{fmtVND(c.items?.price??null)}</span></td>
                        <td style={{fontWeight:500}}>{c.name||'—'}</td>
                        <td>{c.phone||'—'}</td>
                        <td style={{maxWidth:160,wordBreak:'break-word'}}>{c.address||'—'}</td>
                        <td style={{maxWidth:140,color:'var(--muted)',fontSize:12}}>{c.note||'—'}</td>
                        <td style={{whiteSpace:'nowrap',color:'var(--muted)',fontSize:12}}>{fmtDate(c.created_at)}</td>
                        <td><div style={{display:'flex',gap:4}}>
                          <button className="btn-copy" onClick={()=>setEditCust({...c})}>Sửa</button>
                          <button className="btn-delete" onClick={()=>deleteCust(c.id)}>Xoá</button>
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* LISTING VIEW */}
        {(!isAdmin || adminView==='listing') && (
          <>
            {/* Admin input */}
            {isAdmin && (
              <div className="input-section">
                <div className="input-label">Nhập đơn hàng</div>
                <textarea placeholder="VD: Bán Sony WH-1000XM5 màu đen, 3 tháng, fullbox, 4 triệu, LH 0912345678..."
                  value={nlText} onChange={e=>setNlText(e.target.value)}
                  onKeyDown={e=>{if(e.key==='Enter'&&(e.metaKey||e.ctrlKey))analyze()}} rows={3} />
                {analyzing && <div className="processing"><div className="spinner"/>AI đang phân tích...</div>}

                {preview && !analyzing && (
                  <div className="preview-card">
                    {/* Multi-image upload */}
                    <div>
                      <div className="lbl" style={{marginBottom:8}}>
                        Ảnh sản phẩm <span style={{fontWeight:400,color:'var(--muted)'}}>({imgPreviews.length}/8)</span>
                        <span className="paste-hint">· Ctrl+V để dán ảnh</span>
                      </div>
                      <div className="img-grid">
                        {imgPreviews.map((src,i) => (
                          <div key={i} className="img-thumb-wrap">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={src} alt="" className="img-thumb"/>
                            <button className="img-remove" onClick={()=>removeImgAt(i)}>✕</button>
                          </div>
                        ))}
                        {imgPreviews.length < 8 && (
                          <label className="img-add-btn" title="Chọn file hoặc Ctrl+V để paste">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 5v14M5 12h14"/></svg>
                            <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleImgs} style={{display:'none'}}/>
                          </label>
                        )}
                      </div>
                    </div>

                    <div className="preview-grid">
                      <div className="fg full"><div className="lbl">Tên sản phẩm</div>
                        <input className="inp" value={preview.title??''} onChange={e=>setPreview(p=>({...p,title:e.target.value}))}/>
                      </div>
                      <div className="fg full"><div className="lbl">Mô tả</div>
                        <input className="inp" value={preview.description??''} onChange={e=>setPreview(p=>({...p,description:e.target.value}))}/>
                      </div>
                      <div className="fg"><div className="lbl">Giá (VNĐ)</div>
                        <input className="inp" type="number" min="0" step="1000" placeholder="0"
                          value={preview.price??''} onChange={e=>setPreview(p=>({...p,price:e.target.value?Number(e.target.value):null}))}/>
                        <span className="price-preview">{fmtVND(preview.price)}</span>
                      </div>
                      <div className="fg"><div className="lbl">Tình trạng</div>
                        <select className="inp" value={preview.condition??''} onChange={e=>setPreview(p=>({...p,condition:e.target.value}))}>
                          {['Mới','Cũ - Như mới','Cũ - Còn tốt','Cũ - Có lỗi nhỏ'].map(c=><option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="fg"><div className="lbl">Danh mục</div>
                        <input className="inp" value={preview.category??''} onChange={e=>setPreview(p=>({...p,category:e.target.value}))}/>
                      </div>
                      <div className="fg"><div className="lbl">Loại</div>
                        <select className="inp" value={preview.type??'ban'} onChange={e=>setPreview(p=>({...p,type:e.target.value as 'ban'|'mua'}))}>
                          <option value="ban">Bán</option><option value="mua">Tìm mua</option>
                        </select>
                      </div>
                      <div className="fg"><div className="lbl">SĐT liên hệ</div>
                        <input className="inp" value={preview.phone??''} onChange={e=>setPreview(p=>({...p,phone:e.target.value}))}/>
                      </div>
                      <div className="fg"><div className="lbl">Địa điểm</div>
                        <input className="inp" value={preview.location??''} onChange={e=>setPreview(p=>({...p,location:e.target.value}))}/>
                      </div>
                      <div className="fg"><div className="lbl">Người đăng</div>
                        <select className="inp" value={preview.posted_by??''} onChange={e=>setPreview(p=>({...p,posted_by:e.target.value||null}))}>
                          <option value="">— Chọn người đăng —</option>
                          {POSTERS.map(p=><option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>

                      {/* Incoming toggle + expected date */}
                      <div className="fg full">
                        <label className="incoming-toggle">
                          <input type="checkbox"
                            checked={!!preview.expected_date}
                            onChange={e => setPreview(p => ({
                              ...p,
                              expected_date: e.target.checked
                                ? new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0]
                                : null
                            }))}
                          />
                          <span className="incoming-toggle-label">
                            <span className="badge-incoming" style={{fontSize:11}}>Sắp về</span>
                            Hàng chưa có, sắp nhập về
                          </span>
                        </label>
                        {preview.expected_date && (
                          <div style={{marginTop:8,display:'flex',alignItems:'center',gap:8}}>
                            <label className="lbl" style={{margin:0,whiteSpace:'nowrap'}}>Ngày dự kiến về</label>
                            <input className="inp" type="date" style={{flex:1}}
                              value={preview.expected_date??''}
                              min={new Date().toISOString().split('T')[0]}
                              onChange={e=>setPreview(p=>({...p,expected_date:e.target.value||null}))}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="preview-actions">
                      <button className="btn-ghost" onClick={()=>{setPreview(null);setNlText('');clearImgs()}}>Hủy</button>
                      <button className="btn-green" onClick={publish} disabled={publishing}>
                        {uploading?`Upload ${imgFiles.length} ảnh...`:publishing?'Đang đăng...':'Đăng tin →'}
                      </button>
                    </div>
                  </div>
                )}

                {!preview && !analyzing && (
                  <div className="input-actions">
                    <span className="hint">Nhập tự nhiên · Ctrl+Enter phân tích</span>
                    <button className="btn-dark" onClick={analyze} disabled={!nlText.trim()}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                      Phân tích
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 3-column layout: filter | listing | featured ads */}
            <div className="page-layout">

              {/* LEFT SIDEBAR - Filters */}
              <aside className="sidebar-left">
                <div className="sidebar-search">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                  <input placeholder="Tìm tên, mã hàng..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} />
                  {searchQuery && <button className="sidebar-search-clear" onClick={()=>setSearchQuery('')}>✕</button>}
                </div>
                <div className="sidebar-section">
                  <div className="sidebar-section-title">Loại tin</div>
                  {(['all','ban','mua'] as const).map((v,i)=>(
                    <button key={v} className={`sidebar-chip${typeFilter===v?' active':''}`} onClick={()=>setTypeFilter(v)}>
                      {['🏪 Tất cả','🏷️ Bán','🔍 Tìm mua'][i]}
                    </button>
                  ))}
                </div>
                <div className="sidebar-section">
                  <div className="sidebar-section-title">Tình trạng</div>
                  <button className={`sidebar-chip${condFilter==='all'?' active':''}`} onClick={()=>setCondFilter('all')}>Tất cả</button>
                  <button className={`sidebar-chip${condFilter==='Mới'?' active':''}`} onClick={()=>setCondFilter('Mới')}>✨ Mới</button>
                  <button className={`sidebar-chip${condFilter==='Cũ'?' active':''}`} onClick={()=>setCondFilter('Cũ')}>🔄 Đã qua dùng</button>
                </div>
                <div className="sidebar-section">
                  <div className="sidebar-section-title">Trạng thái</div>
                  <button className={`sidebar-chip avail-chip${statusFilter==='available'?' active':''}`} onClick={()=>setStatusFilter('available')}>✅ Còn hàng</button>
                  <button className={`sidebar-chip incoming-chip${statusFilter==='incoming'?' active':''}`} onClick={()=>setStatusFilter('incoming')}>📦 Sắp về</button>
                  <button className={`sidebar-chip sold-chip${statusFilter==='sold'?' active':''}`} onClick={()=>setStatusFilter('sold')}>🏷 Đã bán</button>
                  {isAdmin&&<button className={`sidebar-chip${statusFilter==='all'?' active':''}`} onClick={()=>setStatusFilter('all')}>📋 Tất cả</button>}
                </div>
                <div className="sidebar-section">
                  <div className="sidebar-section-title">Người đăng</div>
                  <button className={`sidebar-chip${posterFilter==='all'?' active':''}`} onClick={()=>setPosterFilter('all')}>Tất cả</button>
                  {POSTERS.map(p=>(
                    <button key={p} className={`sidebar-chip poster-chip${posterFilter===p?' active':''}`} onClick={()=>setPosterFilter(p)}>
                      👤 {p}
                    </button>
                  ))}
                </div>
                <div className="sidebar-section">
                  <div className="sidebar-section-title">Giá</div>
                  <button className={`sidebar-chip${priceRange==='all'?' active':''}`} onClick={()=>setPriceRange('all')}>Tất cả</button>
                  <button className={`sidebar-chip${priceRange==='under1m'?' active':''}`} onClick={()=>setPriceRange('under1m')}>Dưới 1 triệu</button>
                  <button className={`sidebar-chip${priceRange==='1to5m'?' active':''}`} onClick={()=>setPriceRange('1to5m')}>1 – 5 triệu</button>
                  <button className={`sidebar-chip${priceRange==='5to10m'?' active':''}`} onClick={()=>setPriceRange('5to10m')}>5 – 10 triệu</button>
                  <button className={`sidebar-chip${priceRange==='over10m'?' active':''}`} onClick={()=>setPriceRange('over10m')}>Trên 10 triệu</button>
                </div>
                {lastUpdated && (
                  <div className="auto-reload-indicator" style={{marginTop:4}}>
                    <span className="auto-reload-dot"/>
                    {lastUpdated.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
                  </div>
                )}
              </aside>

              {/* CENTER - Listings grid */}
              <div className="content-area">
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,gap:12}}>
                  <div className="section-title" style={{margin:0,flex:1}}>
                    {{ all:'Tất cả tin', ban:'Đang rao bán', mua:'Cần tìm mua' }[typeFilter]}
                    <span style={{fontWeight:400,fontSize:12,textTransform:'none',letterSpacing:0,color:'var(--muted)',marginLeft:6}}>{filtered.length} tin</span>
                  </div>
                  {!isAdmin && (
                    <button className="btn-request-buy" onClick={()=>setShowBuyForm(true)}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                      Đăng tìm mua
                    </button>
                  )}
                </div>

                {categories.length > 0 && (
                  <div className="cat-tag-bar">
                    <button className={`cat-tag${categoryFilter==='all'?' active':''}`} onClick={()=>setCategoryFilter('all')}>Tất cả</button>
                    {categories.map(cat=>(
                      <button key={cat} className={`cat-tag${categoryFilter===cat?' active':''}`} onClick={()=>setCategoryFilter(cat)}>{cat}</button>
                    ))}
                  </div>
                )}

                <div className="listing">
                  {loadingItems ? <div className="empty"><div className="spinner" style={{margin:'0 auto'}}/></div>
                  : filtered.length===0 ? <div className="empty"><div className="empty-icon">📦</div><p>Chưa có tin nào{isAdmin?'. Nhập đơn ở trên.':'.'}</p></div>
                  : filtered.map(item => {
                    const imgs = getImages(item)
                    return (
                      <a key={item.id} href={`/item/${item.id}`} className={`item${item.status==='sold'?' item-sold':''}`}>
                        {imgs.length > 0 && (
                          <div className="item-image-wrap">
                            <Carousel images={imgs} sold={item.status==='sold'} onOpen={()=>{}} />
                          </div>
                        )}
                        <div className="item-body">
                          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8,flexWrap:'wrap'}}>
                            <div className="item-code">
                              <span className="item-code-label">MÃ</span>
                              <span className="item-code-value">{item.order_code}</span>
                            </div>
                            {item.status==='sold' ? <span className="badge-sold">Đã bán</span>
                            : item.status==='incoming' ? (
                              <span className="badge-incoming">
                                📦 Sắp về{item.expected_date ? ` · ${new Date(item.expected_date).toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit'})}` : ''}
                              </span>
                            ) : <span className="badge-avail">Còn hàng</span>}
                            {imgs.length>1 && <span className="badge-imgs">📷 {imgs.length}</span>}
                          </div>
                          <div className="item-title">{item.title}</div>
                          <div className="item-desc">{item.description}</div>
                          <div className="item-meta">
                            <span className="tag">{item.type==='ban'?'🏷️ Bán':'🔍 Tìm mua'}</span>
                            <span className={`tag ${item.condition==='Mới'?'condition-moi':'condition-cu'}`}>{item.condition}</span>
                            {item.category&&<span className="tag">{item.category}</span>}
                            {item.location&&<span className="tag">📍 {item.location}</span>}
                            {item.posted_by&&<span className="tag tag-poster">👤 {item.posted_by}</span>}
                            <span className="item-time"><span className="status-dot"/>{reltime(item.created_at)}</span>
                          </div>
                        </div>
                        <div className="item-footer">
                          <div className="item-price">{fmtVND(item.price)}</div>
                          <span className="item-cta">Xem chi tiết →</span>
                        </div>
                      </a>
                    )
                  })}
                </div>
              </div>

            </div>
          </>
        )}
      </main>

      {/* SOLD MODAL */}
      {soldItem && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setSoldItem(null)}>
          <div className="modal">
            <h3>Đánh dấu đã bán</h3>
            <div className="modal-item-info">
              <code className="order-code">{soldItem.order_code}</code>
              <span style={{marginLeft:8,fontWeight:500}}>{soldItem.title}</span>
              <span style={{marginLeft:8,color:'var(--green)',fontWeight:600}}>{fmtVND(soldItem.price)}</span>
            </div>

            {/* Mode toggle */}
            <div className="sold-mode-tabs">
              <button className={`sold-mode-tab${soldCustMode==='search'?' active':''}`}
                onClick={()=>{setSoldCustMode('search');setSelectedCust(null)}}>
                👤 Chọn khách có sẵn
              </button>
              <button className={`sold-mode-tab${soldCustMode==='new'?' active':''}`}
                onClick={()=>{setSoldCustMode('new');setSelectedCust(null)}}>
                ✏️ Nhập khách mới
              </button>
            </div>

            {/* Search existing */}
            {soldCustMode==='search' && (
              <div className="sold-cust-search">
                <input className="inp" placeholder="Tìm tên, SĐT khách hàng..."
                  value={soldCustSearch} onChange={e=>setSoldCustSearch(e.target.value)} autoFocus />
                <div className="sold-cust-list">
                  {customers.length === 0 && (
                    <div className="sold-cust-empty">Chưa có khách hàng nào. <button className="link-btn" onClick={()=>setSoldCustMode('new')}>Nhập mới →</button></div>
                  )}
                  {customers
                    .filter(c => !soldCustSearch || [c.name,c.phone,c.address].some(v=>v?.toLowerCase().includes(soldCustSearch.toLowerCase())))
                    .slice(0, 6)
                    .map(c => (
                      <div key={c.id}
                        className={`sold-cust-item${selectedCust?.id===c.id?' selected':''}`}
                        onClick={()=>setSelectedCust(selectedCust?.id===c.id ? null : c)}>
                        <div className="sold-cust-avatar">{(c.name||'?')[0].toUpperCase()}</div>
                        <div className="sold-cust-info">
                          <div className="sold-cust-name">{c.name||'—'}</div>
                          <div className="sold-cust-sub">{c.phone}{c.address ? ` · ${c.address}` : ''}</div>
                        </div>
                        {selectedCust?.id===c.id && <span className="sold-cust-check">✓</span>}
                      </div>
                    ))
                  }
                  {customers.filter(c => !soldCustSearch || [c.name,c.phone,c.address].some(v=>v?.toLowerCase().includes(soldCustSearch.toLowerCase()))).length === 0 && soldCustSearch && (
                    <div className="sold-cust-empty">
                      Không tìm thấy. <button className="link-btn" onClick={()=>{setSoldCustMode('new');setCustForm(f=>({...f,name:soldCustSearch}))}}>Tạo mới "{soldCustSearch}" →</button>
                    </div>
                  )}
                </div>
                {selectedCust && (
                  <div className="sold-cust-selected">
                    <span>✓ Đã chọn: <strong>{selectedCust.name}</strong> · {selectedCust.phone}</span>
                  </div>
                )}
              </div>
            )}

            {/* New customer form */}
            {soldCustMode==='new' && (
              <div className="modal-grid" style={{marginTop:4}}>
                <div><label className="lbl">Tên khách</label>
                  <input className="inp" placeholder="Nguyễn Văn A" value={custForm.name} onChange={e=>setCustForm(f=>({...f,name:e.target.value}))} autoFocus />
                </div>
                <div><label className="lbl">SĐT khách</label>
                  <input className="inp" placeholder="09xxxxxxxx" value={custForm.phone} onChange={e=>setCustForm(f=>({...f,phone:e.target.value}))} />
                </div>
                <div style={{gridColumn:'1/-1'}}><label className="lbl">Địa chỉ giao hàng</label>
                  <input className="inp" placeholder="Số nhà, đường, quận..." value={custForm.address} onChange={e=>setCustForm(f=>({...f,address:e.target.value}))} />
                </div>
                <div style={{gridColumn:'1/-1'}}><label className="lbl">Ghi chú</label>
                  <input className="inp" placeholder="Ghi chú thêm..." value={custForm.note} onChange={e=>setCustForm(f=>({...f,note:e.target.value}))} />
                </div>
              </div>
            )}

            <div className="modal-actions" style={{marginTop:16}}>
              <button className="btn-ghost" onClick={()=>setSoldItem(null)}>Hủy</button>
              <button className="btn-sold" onClick={markSold} disabled={savingSold}>
                {savingSold ? 'Đang lưu...' : '✓ Xác nhận đã bán'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT CUSTOMER MODAL */}
      {editCust && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setEditCust(null)}>
          <div className="modal">
            <h3>Chỉnh sửa khách hàng</h3>
            <p><code className="order-code">{editCust.order_code}</code> · {editCust.items?.title}</p>
            <div className="modal-grid" style={{marginTop:16}}>
              <div><label className="lbl">Tên</label><input className="inp" value={editCust.name??''} onChange={e=>setEditCust(c=>c?{...c,name:e.target.value}:c)}/></div>
              <div><label className="lbl">SĐT</label><input className="inp" value={editCust.phone??''} onChange={e=>setEditCust(c=>c?{...c,phone:e.target.value}:c)}/></div>
              <div style={{gridColumn:'1/-1'}}><label className="lbl">Địa chỉ</label><input className="inp" value={editCust.address??''} onChange={e=>setEditCust(c=>c?{...c,address:e.target.value}:c)}/></div>
              <div style={{gridColumn:'1/-1'}}><label className="lbl">Ghi chú</label><input className="inp" value={editCust.note??''} onChange={e=>setEditCust(c=>c?{...c,note:e.target.value}:c)}/></div>
            </div>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={()=>setEditCust(null)}>Hủy</button>
              <button className="btn-dark" onClick={()=>saveCust(editCust)}>Lưu</button>
            </div>
          </div>
        </div>
      )}

      {/* MESSENGER MODAL */}
      {msgItem && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setMsgItem(null)}>
          <div className="modal">
            <h3>Gửi tin nhắn Messenger</h3>
            <p>Tin nhắn soạn sẵn, chỉnh nếu cần.</p>
            <label className="lbl" style={{display:'block',marginBottom:6}}>SĐT / Messenger ID</label>
            <input className="inp" value={msgPhone} onChange={e=>setMsgPhone(e.target.value)} placeholder="09xxxxxxxx" style={{marginBottom:10}}/>
            <textarea className="inp" style={{minHeight:90,resize:'vertical'}} value={msgText} onChange={e=>setMsgText(e.target.value)}/>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={()=>setMsgItem(null)}>Đóng</button>
              <button className="btn-blue" onClick={sendMessenger}>Mở Messenger →</button>
            </div>
          </div>
        </div>
      )}

      {/* BUY REQUEST MODAL */}
      {showBuyForm && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowBuyForm(false)}>
          <div className="modal">
            <h3>Đăng yêu cầu tìm mua</h3>
            <p>Điền thông tin sản phẩm bạn đang cần tìm. Người bán sẽ liên hệ lại.</p>
            <div className="modal-grid">
              <div style={{gridColumn:'1/-1'}}><label className="lbl">Tên sản phẩm cần tìm <span style={{color:'var(--red)'}}>*</span></label>
                <input className="inp" placeholder="VD: iPhone 14 Pro Max 256GB..." autoFocus
                  value={buyForm.title} onChange={e=>setBuyForm(f=>({...f,title:e.target.value}))} />
              </div>
              <div style={{gridColumn:'1/-1'}}><label className="lbl">Mô tả thêm</label>
                <input className="inp" placeholder="Màu sắc, tình trạng, yêu cầu đặc biệt..."
                  value={buyForm.description} onChange={e=>setBuyForm(f=>({...f,description:e.target.value}))} />
              </div>
              <div><label className="lbl">Giá mong muốn (VNĐ)</label>
                <input className="inp" type="number" min="0" step="100000" placeholder="Để trống nếu thương lượng"
                  value={buyForm.price} onChange={e=>setBuyForm(f=>({...f,price:e.target.value}))} />
              </div>
              <div><label className="lbl">Danh mục</label>
                <input className="inp" placeholder="VD: Điện thoại, Laptop..."
                  value={buyForm.category} onChange={e=>setBuyForm(f=>({...f,category:e.target.value}))} />
              </div>
              <div><label className="lbl">SĐT liên hệ</label>
                <input className="inp" placeholder="09xxxxxxxx"
                  value={buyForm.phone} onChange={e=>setBuyForm(f=>({...f,phone:e.target.value}))} />
              </div>
              <div><label className="lbl">Khu vực</label>
                <input className="inp" placeholder="VD: Hà Nội, TP.HCM..."
                  value={buyForm.location} onChange={e=>setBuyForm(f=>({...f,location:e.target.value}))} />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={()=>setShowBuyForm(false)}>Hủy</button>
              <button className="btn-request-buy" onClick={submitBuyRequest} disabled={submittingBuy} style={{padding:'8px 18px'}}>
                {submittingBuy ? 'Đang đăng...' : '🔍 Đăng yêu cầu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  )
}

// ─── styles ──────────────────────────────────────────────────────
const styles = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#f9f8f6;--surface:#fff;--border:#e8e6e1;--text:#1a1916;--muted:#8c8982;--accent:#1a1916;--tag-bg:#f0efe9;--green:#2a7a4b;--green-bg:#edf7f2;--red:#c0392b;--fb:#1877f2;--ct:#e65c00;--sold:#f5f4f2}
body{font-family:'Be Vietnam Pro',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;font-size:14px;line-height:1.6}

/* AUTH */
.auth-gate{position:fixed;inset:0;background:var(--bg);display:flex;align-items:center;justify-content:center;z-index:999;padding:24px}
.auth-box{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:36px 32px;width:100%;max-width:360px;animation:fadeIn .25s ease}
.auth-logo{font-size:15px;font-weight:600;margin-bottom:28px}
.auth-logo span{color:var(--muted);font-weight:300}
.auth-err{font-size:12px;color:var(--red);margin-top:10px;text-align:center}
.auth-hint{font-size:11px;color:var(--muted);margin-top:20px;padding-top:16px;border-top:1px solid var(--border);line-height:1.6}
.auth-hint code,.order-code{background:var(--tag-bg);padding:2px 6px;border-radius:4px;font-size:11px;font-family:monospace;color:var(--muted)}
.item-code{display:inline-flex;align-items:center;gap:5px;background:#f0f4ff;border:1px solid #d4dfff;border-radius:6px;padding:3px 8px;cursor:pointer;transition:all .15s;user-select:none}
.item-code:hover{background:#e4ecff;border-color:#a8bfff}
.item-code:hover .item-code-icon{opacity:1}
.item-code-label{font-size:8px;font-weight:700;letter-spacing:.8px;color:#6b7fd4;text-transform:uppercase}
.item-code-value{font-size:11px;font-weight:600;font-family:monospace;color:#2d3a8c;letter-spacing:.3px}
.item-code-icon{font-size:11px;color:#6b7fd4;opacity:0;transition:opacity .15s}

/* HEADER */
header{display:flex;align-items:center;justify-content:space-between;padding:14px 32px;border-bottom:1px solid var(--border);background:var(--surface);position:sticky;top:0;z-index:100}
.logo{font-size:16px;font-weight:600;letter-spacing:-.3px}
.logo span{color:var(--muted);font-weight:300}
nav{display:flex;gap:4px}
nav button{background:none;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;font-family:inherit;font-size:13px;color:var(--muted);transition:all .15s}
nav button.active,nav button:hover{background:var(--tag-bg);color:var(--text)}
.tab-btn{background:none;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;font-family:inherit;font-size:13px;color:var(--muted);transition:all .15s;display:flex;align-items:center;gap:5px}
.tab-btn:hover,.tab-active{background:var(--tag-bg);color:var(--text)}
.tab-active{font-weight:500}
.badge{background:var(--accent);color:white;font-size:10px;padding:1px 6px;border-radius:10px;font-weight:600}
.admin-badge{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:500;color:var(--green);background:var(--green-bg);padding:4px 10px;border-radius:20px}
.admin-dot{width:5px;height:5px;border-radius:50%;background:var(--green)}
.logout-btn{background:none;border:none;cursor:pointer;font-family:inherit;font-size:11px;color:var(--muted);padding:2px 5px}
.logout-btn:hover{color:var(--red)}

/* LAYOUT - full width */
main{width:100%;padding:24px 28px}

/* PAGE LAYOUT - 2 columns */
.page-layout{display:grid;grid-template-columns:220px 1fr;gap:20px;align-items:start}

/* LEFT SIDEBAR */
.sidebar-left{position:sticky;top:70px;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:0}
.sidebar-search{display:flex;align-items:center;gap:8px;background:var(--tag-bg);border:1px solid var(--border);border-radius:8px;padding:7px 10px;margin-bottom:16px;transition:border-color .15s}
.sidebar-search:focus-within{border-color:var(--accent);background:white}
.sidebar-search svg{flex-shrink:0;color:var(--muted)}
.sidebar-search input{flex:1;border:none;outline:none;background:transparent;font-family:inherit;font-size:13px;color:var(--text);min-width:0}
.sidebar-search input::placeholder{color:var(--muted)}
.sidebar-search-clear{background:none;border:none;cursor:pointer;color:var(--muted);font-size:12px;padding:0;line-height:1;flex-shrink:0}
.sidebar-search-clear:hover{color:var(--text)}
.btn-request-buy{display:inline-flex;align-items:center;gap:6px;background:#2563eb;color:white;border:none;padding:6px 14px;border-radius:7px;font-family:inherit;font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap;transition:opacity .15s;flex-shrink:0}
.btn-request-buy:hover{opacity:.85}
.btn-request-buy:disabled{opacity:.5;cursor:not-allowed}
.sidebar-section{margin-bottom:18px}
.sidebar-section:last-child{margin-bottom:0}
.sidebar-section-title{font-size:10px;font-weight:700;letter-spacing:.9px;text-transform:uppercase;color:var(--muted);margin-bottom:6px;padding-left:4px}
.sidebar-chip{width:100%;text-align:left;background:none;border:none;padding:7px 10px;border-radius:7px;font-family:inherit;font-size:13px;cursor:pointer;color:var(--muted);transition:all .15s;display:block;margin-bottom:2px}
.sidebar-chip:hover{background:var(--tag-bg);color:var(--text)}
.sidebar-chip.active{background:var(--accent);color:white;font-weight:500}
.sidebar-chip.sold-chip.active{background:#c44f00}
.sidebar-chip.incoming-chip.active{background:#2563eb}
.sidebar-chip.avail-chip.active{background:var(--green)}
.sidebar-chip.poster-chip.active{background:#6d28d9}

/* CENTER content */
.content-area{min-width:0}

/* CATEGORY TAG BAR */
.cat-tag-bar{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px}
.cat-tag{background:var(--surface);border:1px solid var(--border);padding:5px 14px;border-radius:20px;font-family:inherit;font-size:12px;font-weight:500;cursor:pointer;color:var(--muted);transition:all .15s;white-space:nowrap}
.cat-tag:hover{border-color:var(--accent);color:var(--text)}
.cat-tag.active{background:var(--accent);border-color:var(--accent);color:white}

/* FORM */
.lbl{font-size:11px;font-weight:500;letter-spacing:.6px;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:4px}
.inp{font-size:14px;color:var(--text);background:var(--tag-bg);border:1px solid var(--border);border-radius:6px;padding:8px 10px;font-family:inherit;width:100%;outline:none;transition:border-color .15s}
.inp:focus{border-color:var(--accent);background:white}
.w-full{width:100%}

/* INPUT SECTION */
.input-section{background:var(--surface);border:1px solid var(--border);border-radius:12px;overflow:hidden;margin-bottom:20px}
.input-label{padding:16px 20px 0;font-size:11px;font-weight:500;letter-spacing:.8px;text-transform:uppercase;color:var(--muted)}
textarea{width:100%;border:none;outline:none;resize:none;font-family:inherit;font-size:15px;color:var(--text);background:transparent;padding:12px 20px 16px;min-height:90px;line-height:1.6}
textarea::placeholder{color:#c0bdb5}
.input-actions{display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-top:1px solid var(--border);background:#fdfcfb}
.hint{font-size:12px;color:var(--muted)}
.processing{display:flex;align-items:center;gap:10px;padding:14px 20px;border-top:1px solid var(--border);font-size:13px;color:var(--muted)}
.spinner{width:14px;height:14px;border:2px solid var(--border);border-top-color:var(--muted);border-radius:50%;animation:spin .7s linear infinite;flex-shrink:0}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}

/* MULTI IMAGE UPLOAD */
.img-grid{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px}
.img-thumb-wrap{position:relative;width:80px;height:80px;flex-shrink:0}
.img-thumb{width:80px;height:80px;object-fit:cover;border-radius:7px;border:1px solid var(--border);display:block}
.img-remove{position:absolute;top:-6px;right:-6px;background:var(--red);color:white;border:none;border-radius:50%;width:18px;height:18px;cursor:pointer;font-size:10px;display:flex;align-items:center;justify-content:center;line-height:1}
.img-add-btn{width:80px;height:80px;border:1.5px dashed var(--border);border-radius:7px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--muted);flex-shrink:0;transition:all .15s}
.img-add-btn:hover{border-color:var(--accent);color:var(--text);background:var(--tag-bg)}
.paste-hint{font-size:10px;font-weight:400;color:var(--muted);margin-left:4px;letter-spacing:0}
.incoming-toggle{display:flex;align-items:center;gap:10px;padding:10px 14px;border:1px solid var(--border);border-radius:8px;cursor:pointer;transition:all .15s;background:var(--tag-bg)}
.incoming-toggle:hover{border-color:#a8bfff;background:#f0f5ff}
.incoming-toggle input[type=checkbox]{width:16px;height:16px;cursor:pointer;accent-color:#2563eb;flex-shrink:0}
.incoming-toggle-label{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text);cursor:pointer}

/* PREVIEW CARD */
.preview-card{border-top:1px solid var(--border);padding:20px;display:flex;flex-direction:column;gap:14px}
.preview-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.fg{display:flex;flex-direction:column;gap:4px}
.fg.full{grid-column:1/-1}
.price-preview{font-size:12px;color:var(--green);font-weight:500;padding:2px 0}
.preview-actions{display:flex;gap:8px;justify-content:flex-end;padding-top:4px;border-top:1px solid var(--border)}

/* CAROUSEL */
.carousel{position:relative;cursor:zoom-in;user-select:none;overflow:hidden;background:#000}
.carousel-img{width:100%;height:200px;object-fit:cover;display:block;transition:opacity .2s}
.car-btn{position:absolute;top:50%;transform:translateY(-50%);background:rgba(0,0,0,.45);color:white;border:none;cursor:pointer;font-size:20px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:50%;transition:background .15s;z-index:2}
.car-btn:hover{background:rgba(0,0,0,.7)}
.car-prev{left:8px}
.car-next{right:8px}
.car-dots{position:absolute;bottom:8px;left:50%;transform:translateX(-50%);display:flex;gap:4px;z-index:2}
.car-dot{width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,.5);border:none;cursor:pointer;padding:0;transition:background .15s}
.car-dot-active{background:white}
.car-counter{position:absolute;top:8px;right:8px;background:rgba(0,0,0,.5);color:white;font-size:10px;padding:2px 6px;border-radius:10px;z-index:2}
.car-zoom-hint{position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,.4);color:white;font-size:11px;padding:2px 7px;border-radius:10px;z-index:2;opacity:0;transition:opacity .2s}
.carousel:hover .car-zoom-hint{opacity:1}
.sold-overlay{position:absolute;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:white;letter-spacing:3px;pointer-events:none}

/* LIGHTBOX */
.lightbox{position:fixed;inset:0;background:rgba(0,0,0,.94);z-index:500;display:flex;align-items:center;justify-content:center;animation:fadeIn .2s ease}
.lb-img{max-width:90vw;max-height:80vh;object-fit:contain;border-radius:4px;cursor:default;box-shadow:0 8px 40px rgba(0,0,0,.6)}
.lb-close{position:fixed;top:20px;right:24px;background:rgba(255,255,255,.15);color:white;border:none;width:36px;height:36px;border-radius:50%;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s;z-index:501}
.lb-close:hover{background:rgba(255,255,255,.3)}
.lb-btn{position:fixed;top:50%;transform:translateY(-50%);background:rgba(255,255,255,.12);color:white;border:none;font-size:28px;width:48px;height:48px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s;z-index:501}
.lb-btn:hover{background:rgba(255,255,255,.25)}
.lb-prev{left:20px}
.lb-next{right:20px}
.lb-counter{position:fixed;top:20px;left:50%;transform:translateX(-50%);color:rgba(255,255,255,.7);font-size:13px;background:rgba(0,0,0,.4);padding:4px 14px;border-radius:20px}
.lb-thumbs{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);display:flex;gap:8px;padding:8px;background:rgba(0,0,0,.5);border-radius:10px;max-width:90vw;overflow-x:auto}
.lb-thumb{width:52px;height:52px;object-fit:cover;border-radius:5px;cursor:pointer;opacity:.55;border:2px solid transparent;transition:all .15s;flex-shrink:0}
.lb-thumb-active{opacity:1;border-color:white}
.lb-thumb:hover{opacity:.85}

/* FILTER (used in customer view) */
.section-title{font-size:11px;font-weight:500;letter-spacing:.8px;text-transform:uppercase;color:var(--muted);margin-bottom:16px;display:flex;align-items:center;gap:8px}
.section-title::after{content:'';flex:1;height:1px;background:var(--border)}
.filter-bar{display:flex;align-items:center;gap:6px;margin-bottom:16px;flex-wrap:wrap}
.filter-count{font-size:13px;color:var(--muted)}
.filter-chip{background:none;border:1px solid var(--border);padding:5px 12px;border-radius:20px;font-family:inherit;font-size:12px;cursor:pointer;color:var(--muted);transition:all .15s}
.filter-chip.active{background:var(--accent);border-color:var(--accent);color:white}
.sold-chip.active{background:#c44f00;border-color:#c44f00}
.incoming-chip.active{background:#2563eb;border-color:#2563eb}
.auto-reload-indicator{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--muted);padding:6px 10px;background:var(--tag-bg);border-radius:8px;white-space:nowrap}
.auto-reload-dot{width:6px;height:6px;border-radius:50%;background:var(--green);flex-shrink:0;animation:pulse 2s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.75)}}

/* LISTING GRID */
.listing{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px}

/* ITEM CARD - vertical layout */
.item{background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden;display:flex;flex-direction:column;animation:fadeIn .3s ease;transition:all .15s;text-decoration:none;color:inherit;cursor:pointer}
.item:hover{border-color:#bbb8b0;transform:translateY(-2px);box-shadow:0 4px 16px rgba(0,0,0,.07)}
.item-sold{background:var(--sold);opacity:.85}
.item-image-wrap{flex-shrink:0}
.item-body{padding:11px 13px;flex:1}
.item-title{font-size:13px;font-weight:600;margin-bottom:3px;line-height:1.4}
.item-desc{font-size:12px;color:var(--muted);margin-bottom:8px;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.item-meta{display:flex;align-items:center;flex-wrap:wrap;gap:5px}
.tag{font-size:10px;background:var(--tag-bg);color:var(--muted);padding:2px 7px;border-radius:4px;font-weight:500}
.tag.condition-moi{background:var(--green-bg);color:var(--green)}
.tag.condition-cu{background:#fff8ec;color:#c47a1e}
.tag-poster{background:#f3f0ff;color:#6d28d9}
.item-time{font-size:10px;color:var(--muted);display:flex;align-items:center}
.status-dot{width:5px;height:5px;border-radius:50%;background:var(--green);display:inline-block;margin-right:4px;flex-shrink:0}
.badge-sold{font-size:10px;font-weight:600;background:#fef0e6;color:#c44f00;padding:2px 7px;border-radius:10px}
.badge-avail{font-size:10px;font-weight:600;background:var(--green-bg);color:var(--green);padding:2px 7px;border-radius:10px}
.badge-incoming{font-size:10px;font-weight:600;background:#eef4ff;color:#2563eb;padding:2px 7px;border-radius:10px}
.badge-imgs{font-size:10px;font-weight:500;background:var(--tag-bg);color:var(--muted);padding:2px 7px;border-radius:10px}
.item-footer{padding:10px 13px;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:8px}
.item-price{font-size:15px;font-weight:700;white-space:nowrap;color:var(--text)}
.item-cta{font-size:11px;color:var(--muted);white-space:nowrap}

/* BUTTONS */
.btn-dark{background:var(--accent);color:white;border:none;padding:8px 18px;border-radius:7px;font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;display:flex;align-items:center;gap:7px;transition:opacity .15s}
.btn-dark:hover{opacity:.85}
.btn-dark:disabled{opacity:.4;cursor:not-allowed}
.btn-green{background:var(--green);color:white;border:none;padding:8px 18px;border-radius:7px;font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;transition:opacity .15s}
.btn-green:hover{opacity:.85}
.btn-green:disabled{opacity:.5;cursor:not-allowed}
.btn-ghost{background:none;border:1px solid var(--border);padding:7px 16px;border-radius:7px;font-family:inherit;font-size:13px;cursor:pointer;color:var(--muted);transition:all .15s}
.btn-ghost:hover{border-color:var(--accent);color:var(--text)}
.btn-ghost-sm{background:none;border:1px solid var(--border);padding:4px 9px;border-radius:6px;font-family:inherit;font-size:11px;cursor:pointer;color:var(--muted);text-align:center}
.btn-ghost-sm:hover{border-color:var(--accent);color:var(--text)}
.btn-messenger{display:flex;align-items:center;justify-content:center;gap:4px;background:#0084ff;color:white;border:none;padding:5px 9px;border-radius:6px;font-family:inherit;font-size:11px;font-weight:500;cursor:pointer;transition:opacity .15s}
.btn-messenger:hover{opacity:.85}
.btn-facebook{display:flex;align-items:center;justify-content:center;gap:4px;background:var(--fb);color:white;border:none;padding:5px 9px;border-radius:6px;font-family:inherit;font-size:11px;font-weight:500;cursor:pointer;transition:opacity .15s}
.btn-facebook:hover{opacity:.85}
.btn-chottot{display:flex;align-items:center;justify-content:center;background:var(--ct);color:white;border:none;padding:5px 9px;border-radius:6px;font-family:inherit;font-size:11px;font-weight:500;cursor:pointer;text-decoration:none;transition:opacity .15s}
.btn-chottot:hover{opacity:.85}
.btn-copy{background:none;border:1px solid var(--border);padding:4px 9px;border-radius:6px;font-family:inherit;font-size:11px;cursor:pointer;color:var(--muted);transition:all .15s;text-align:center}
.btn-copy:hover{border-color:var(--accent);color:var(--text)}
.btn-sold{background:var(--accent);color:white;border:none;padding:5px 10px;border-radius:6px;font-family:inherit;font-size:11px;font-weight:500;cursor:pointer;transition:opacity .15s;text-align:center}
.btn-sold:hover{opacity:.8}
.btn-sold:disabled{opacity:.5;cursor:not-allowed}
.btn-incoming{background:#2563eb;color:white;border:none;padding:5px 10px;border-radius:6px;font-family:inherit;font-size:11px;font-weight:500;cursor:pointer;transition:opacity .15s;text-align:center}
.btn-incoming:hover{opacity:.8}
.btn-delete{background:none;border:1px solid #fcd0cc;padding:4px 9px;border-radius:6px;font-family:inherit;font-size:11px;cursor:pointer;color:var(--red);transition:background .15s;text-align:center}
.btn-delete:hover{background:#fff0ee}
.btn-blue{background:#0084ff;color:white;border:none;padding:8px 18px;border-radius:7px;font-family:inherit;font-size:13px;font-weight:500;cursor:pointer}

/* CUSTOMER TABLE */
.cust-table-wrap{overflow-x:auto;border:1px solid var(--border);border-radius:10px}
.cust-table{width:100%;border-collapse:collapse;font-size:13px}
.cust-table th{background:var(--tag-bg);padding:10px 14px;text-align:left;font-size:11px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--border);white-space:nowrap}
.cust-table td{padding:12px 14px;border-bottom:1px solid var(--border);vertical-align:top}
.cust-table tr:last-child td{border-bottom:none}
.cust-table tr:hover td{background:#fdfcfb}

/* MODAL */
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:150;display:flex;align-items:center;justify-content:center;padding:20px}
.modal{background:white;border-radius:12px;padding:28px;width:100%;max-width:480px;animation:fadeIn .2s ease;max-height:90vh;overflow-y:auto}
.modal h3{font-size:16px;font-weight:600;margin-bottom:8px}
.modal p{font-size:13px;color:var(--muted);margin-bottom:16px}
.modal-item-info{background:var(--tag-bg);border-radius:8px;padding:10px 12px;margin-bottom:16px;font-size:13px}
.sold-mode-tabs{display:flex;gap:4px;background:var(--tag-bg);border-radius:8px;padding:4px;margin-bottom:14px}
.sold-mode-tab{flex:1;background:none;border:none;padding:7px 10px;border-radius:6px;font-family:inherit;font-size:12px;font-weight:500;cursor:pointer;color:var(--muted);transition:all .15s;text-align:center}
.sold-mode-tab.active{background:white;color:var(--text);box-shadow:0 1px 3px rgba(0,0,0,.1)}
.sold-cust-search{display:flex;flex-direction:column;gap:8px}
.sold-cust-list{display:flex;flex-direction:column;gap:4px;max-height:220px;overflow-y:auto}
.sold-cust-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border:1px solid var(--border);border-radius:8px;cursor:pointer;transition:all .15s}
.sold-cust-item:hover{border-color:#a8bfff;background:#f5f8ff}
.sold-cust-item.selected{border-color:#2563eb;background:#eef4ff}
.sold-cust-avatar{width:32px;height:32px;border-radius:50%;background:var(--accent);color:white;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;flex-shrink:0}
.sold-cust-info{flex:1;min-width:0}
.sold-cust-name{font-size:13px;font-weight:500}
.sold-cust-sub{font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sold-cust-check{color:#2563eb;font-weight:700;font-size:15px;flex-shrink:0}
.sold-cust-empty{font-size:13px;color:var(--muted);padding:12px;text-align:center;border:1px dashed var(--border);border-radius:8px}
.sold-cust-selected{background:#eef4ff;border:1px solid #d4dfff;border-radius:7px;padding:8px 12px;font-size:12px;color:#2d3a8c}
.link-btn{background:none;border:none;color:#2563eb;cursor:pointer;font-family:inherit;font-size:13px;text-decoration:underline;padding:0}
.modal-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px}
.modal-actions{display:flex;gap:8px;justify-content:flex-end;padding-top:8px;border-top:1px solid var(--border)}

/* EMPTY / TOAST */
.empty{text-align:center;padding:60px 20px;color:var(--muted)}
.empty-icon{font-size:36px;margin-bottom:12px}
.empty p{font-size:14px}
.toast{position:fixed;bottom:24px;right:24px;background:var(--accent);color:white;padding:10px 18px;border-radius:8px;font-size:13px;z-index:200;animation:fadeIn .2s ease}

/* RESPONSIVE */
@media(max-width:960px){
  .page-layout{grid-template-columns:200px 1fr}
}
@media(max-width:700px){
  main{padding:16px}
  header{padding:12px 16px;flex-wrap:wrap;gap:8px}
  .page-layout{grid-template-columns:1fr}
  .sidebar-left{position:static;flex-direction:row;flex-wrap:wrap;gap:6px;padding:10px 12px}
  .sidebar-search{width:100%;margin-bottom:6px}
  .sidebar-section{margin-bottom:0;display:contents}
  .sidebar-section-title{display:none}
  .sidebar-chip{width:auto;display:inline-block;padding:5px 10px;border:1px solid var(--border)}
  .sidebar-chip.active{border-color:transparent}
  .listing{grid-template-columns:repeat(2,1fr);gap:8px}
  .item-footer{flex-direction:column;align-items:stretch}
  .preview-grid{grid-template-columns:1fr}
  .lb-btn{width:38px;height:38px;font-size:22px}
  .lb-prev{left:8px}
  .lb-next{right:8px}
  .modal-grid{grid-template-columns:1fr}
  .cust-table{font-size:12px}
}
`

'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Item } from '@/lib/supabase'

const CHOT_TOT  = process.env.NEXT_PUBLIC_CHOT_TOT_URL ?? 'https://cho-tot.com'
const FB_PAGE   = process.env.NEXT_PUBLIC_FB_PAGE_ID   ?? ''

function fmtVND(v: number | null | undefined) {
  if (!v) return 'Thương lượng'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v)
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function fmtExpected(d: string) {
  return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function getImages(item: Item) {
  if (item.images?.length) return item.images
  if (item.image_url) return [item.image_url]
  return []
}

// ── Lightbox ──────────────────────────────────────────────────────
function Lightbox({ images, idx: startIdx, onClose }: { images: string[]; idx: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIdx)
  const prev = useCallback(() => setIdx(i => (i - 1 + images.length) % images.length), [images.length])
  const next = useCallback(() => setIdx(i => (i + 1) % images.length), [images.length])

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose, prev, next])

  return (
    <div className="lb" onClick={onClose}>
      <button className="lb-close" onClick={onClose}>✕</button>
      {images.length > 1 && <>
        <button className="lb-nav lb-prev" onClick={e=>{e.stopPropagation();prev()}}>‹</button>
        <button className="lb-nav lb-next" onClick={e=>{e.stopPropagation();next()}}>›</button>
      </>}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={images[idx]} alt="" className="lb-img" onClick={e=>e.stopPropagation()} />
      {images.length > 1 && (
        <>
          <div className="lb-counter">{idx + 1} / {images.length}</div>
          <div className="lb-thumbs" onClick={e=>e.stopPropagation()}>
            {images.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt="" className={`lb-thumb${i===idx?' active':''}`} onClick={()=>setIdx(i)}/>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────
export default function ItemDetailClient({ item }: { item: Item }) {
  const images = getImages(item)
  const [mainIdx, setMainIdx] = useState(0)
  const [lbOpen, setLbOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [infoCopied, setInfoCopied] = useState(false)
  const [msgOpen, setMsgOpen] = useState(false)
  const [msgPhone, setMsgPhone] = useState(item.phone ?? '')
  const [msgText, setMsgText] = useState(
    item.type === 'ban'
      ? `Xin chào! Mình thấy bạn đang bán "${item.title}" (${item.order_code}) giá ${fmtVND(item.price)}. Cho mình hỏi thêm nhé 🙏`
      : `Chào bạn! Mình thấy bạn đang tìm mua "${item.title}". Mình có thể có hàng, trao đổi thêm nhé 😊`
  )

  // Admin state
  const [isAdmin, setIsAdmin]         = useState(false)
  const adminKey                       = useRef('')
  const [currentStatus, setCurrentStatus] = useState(item.status)
  const [toast, setToast]             = useState('')
  const toastTimer                     = useRef<ReturnType<typeof setTimeout>>()

  // Edit state
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState<{
    title: string; description: string; price: string; condition: string
    category: string; type: 'ban' | 'mua'; phone: string; location: string
    staff_id: string; expected_date: string
  }>({
    title: item.title,
    description: item.description ?? '',
    price: item.price?.toString() ?? '',
    condition: item.condition ?? 'Mới',
    category: item.category ?? '',
    type: item.type,
    phone: item.phone ?? '',
    location: item.location ?? '',
    staff_id: item.staff_id?.toString() ?? '',
    expected_date: item.expected_date?.split('T')[0] ?? '',
  })
  const [keptImages, setKeptImages] = useState<string[]>(getImages(item))
  const [newImgFiles, setNewImgFiles] = useState<File[]>([])
  const [newImgPreviews, setNewImgPreviews] = useState<string[]>([])
  const [staffList, setStaffList] = useState<Array<{id: number; name: string}>>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const key = sessionStorage.getItem('cq_admin_key')
    if (key && sessionStorage.getItem('cq_admin')) { adminKey.current = key; setIsAdmin(true) }
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    fetch('/api/staff').then(r => r.json()).then(d => { if (Array.isArray(d)) setStaffList(d) })
  }, [isAdmin])

  function showToast(m: string) {
    setToast(m)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2800)
  }

  const isSold     = currentStatus === 'sold'
  const isIncoming = currentStatus === 'incoming'
  const isAvailable = currentStatus === 'available'

  function copyLink() {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function copyInfo() {
    const imgs = getImages(item)
    const t = `[${item.order_code}] ${item.title}\n${item.description ?? ''}\nGiá: ${fmtVND(item.price)} | ${item.condition}${item.phone ? '\nLH: ' + item.phone : ''}${item.location ? ' | ' + item.location : ''}${imgs.length ? '\n🖼 ' + imgs.join(' ') : ''}`
    navigator.clipboard.writeText(t)
    setInfoCopied(true)
    setTimeout(() => setInfoCopied(false), 2000)
  }

  function sendMessenger() {
    const d = msgPhone.replace(/\D/g, '')
    if (!d) return
    const intl = d.startsWith('0') ? '84' + d.slice(1) : d
    window.open(`https://m.me/${intl}?text=${encodeURIComponent(msgText)}`, '_blank')
    setMsgOpen(false)
  }

  function openFB() {
    const m = `Mình quan tâm "${item.title}" (${item.order_code}) giá ${fmtVND(item.price)}. Còn hàng không?`
    window.open(FB_PAGE ? `https://m.me/${FB_PAGE}?text=${encodeURIComponent(m)}` : 'https://facebook.com', '_blank')
  }

  async function patchStatus(status: string) {
    const r = await fetch('/api/items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey.current },
      body: JSON.stringify({ id: item.id, status }),
    })
    if (r.ok) { setCurrentStatus(status as Item['status']); showToast(`Đã cập nhật: ${status}`) }
    else showToast('Lỗi cập nhật')
  }

  async function deleteItem() {
    if (!confirm('Xoá tin này? Hành động không thể hoàn tác.')) return
    const r = await fetch('/api/items', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey.current },
      body: JSON.stringify({ id: item.id }),
    })
    if (r.ok) window.location.href = '/'
    else showToast('Lỗi xoá tin')
  }

  function openEdit() {
    setEditForm({
      title: item.title,
      description: item.description ?? '',
      price: item.price?.toString() ?? '',
      condition: item.condition ?? 'Mới',
      category: item.category ?? '',
      type: item.type,
      phone: item.phone ?? '',
      location: item.location ?? '',
      staff_id: item.staff_id?.toString() ?? '',
      expected_date: item.expected_date?.split('T')[0] ?? '',
    })
    setKeptImages(getImages(item))
    setNewImgFiles([])
    setNewImgPreviews([])
    setEditOpen(true)
  }

  function addNewImages(files: FileList | null) {
    if (!files) return
    const total = keptImages.length + newImgFiles.length
    const arr = Array.from(files).slice(0, 8 - total)
    setNewImgFiles(prev => [...prev, ...arr])
    setNewImgPreviews(prev => [...prev, ...arr.map(f => URL.createObjectURL(f))])
  }

  function removeKeptImage(idx: number) {
    setKeptImages(prev => prev.filter((_, i) => i !== idx))
  }

  function removeNewImage(idx: number) {
    setNewImgFiles(prev => prev.filter((_, i) => i !== idx))
    setNewImgPreviews(prev => prev.filter((_, i) => i !== idx))
  }

  async function saveEdit() {
    if (!editForm.title.trim()) { showToast('Tiêu đề không được để trống'); return }
    setSaving(true)
    try {
      let uploadedUrls: string[] = []
      if (newImgFiles.length > 0) {
        const form = new FormData()
        newImgFiles.forEach(f => form.append('files', f))
        form.append('adminKey', adminKey.current)
        const ur = await fetch('/api/upload', { method: 'POST', body: form })
        if (!ur.ok) { showToast('Lỗi upload ảnh'); return }
        uploadedUrls = (await ur.json()).urls ?? []
      }
      const images = [...keptImages, ...uploadedUrls]
      const staff = staffList.find(s => s.id === Number(editForm.staff_id))
      const r = await fetch('/api/items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey.current },
        body: JSON.stringify({
          id: item.id,
          title: editForm.title,
          description: editForm.description,
          price: editForm.price ? Number(editForm.price) : null,
          condition: editForm.condition,
          category: editForm.category,
          type: editForm.type,
          phone: editForm.phone,
          location: editForm.location,
          images,
          expected_date: editForm.expected_date || null,
          posted_by: staff?.name ?? null,
          staff_id: editForm.staff_id ? Number(editForm.staff_id) : null,
        }),
      })
      if (r.ok) {
        setEditOpen(false)
        showToast('Đã cập nhật tin đăng')
        setTimeout(() => window.location.reload(), 800)
      } else {
        showToast('Lỗi cập nhật')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <style>{css}</style>

      <header>
        <a href="/" className="back-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          leviethoang<span>.shop</span>
        </a>
        <div className="header-actions">
          <button className="btn-icon-action" onClick={copyInfo} title="Copy thông tin">
            {infoCopied
              ? <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> Đã copy</>
              : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy info</>
            }
          </button>
          <button className="btn-share" onClick={copyLink}>
            {copied ? '✓ Đã copy' : (
              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg> Chia sẻ</>
            )}
          </button>
        </div>
      </header>

      <main>
        <div className="detail-layout">

          {/* ── Images ─────────────────────────────────── */}
          <div className="images-col">
            {images.length > 0 ? (
              <>
                <div className="main-img-wrap" onClick={() => setLbOpen(true)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={images[mainIdx]} alt={item.title} className="main-img"/>
                  {isSold && <div className="sold-overlay">ĐÃ BÁN</div>}
                  <div className="zoom-hint">🔍 Xem phóng to</div>
                </div>
                {images.length > 1 && (
                  <div className="thumb-strip">
                    {images.map((src, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={src} alt="" className={`strip-thumb${i===mainIdx?' active':''}`}
                        onClick={() => setMainIdx(i)} />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="no-img">📦</div>
            )}
          </div>

          {/* ── Info ───────────────────────────────────── */}
          <div className="info-col">
            {/* Code + status */}
            <div className="meta-row">
              <div className="item-code">
                <span className="code-lbl">MÃ</span>
                <span className="code-val">{item.order_code}</span>
              </div>
              {isSold     && <span className="badge badge-sold">Đã bán</span>}
              {isIncoming && (
                <span className="badge badge-incoming">
                  📦 Sắp về{item.expected_date ? ` · ${fmtExpected(item.expected_date)}` : ''}
                </span>
              )}
              {isAvailable && <span className="badge badge-avail">Còn hàng</span>}
            </div>

            <h1 className="item-title">{item.title}</h1>

            <div className="item-price">{fmtVND(item.price)}</div>

            {/* Tags */}
            <div className="tags">
              <span className="tag">{item.type === 'ban' ? '🏷️ Đang bán' : '🔍 Tìm mua'}</span>
              <span className={`tag ${item.condition === 'Mới' ? 'tag-new' : 'tag-used'}`}>{item.condition}</span>
              {item.category && <span className="tag">{item.category}</span>}
              {item.location && <span className="tag">📍 {item.location}</span>}
              {item.posted_by && <span className="tag tag-poster">👤 {item.posted_by}</span>}
            </div>

            {/* Description */}
            {item.description && (
              <div className="description">
                <div className="section-label">Mô tả</div>
                <p>{item.description}</p>
              </div>
            )}

            {/* Expected date callout */}
            {isIncoming && item.expected_date && (
              <div className="incoming-callout">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                <div>
                  <div style={{fontWeight:600}}>Dự kiến về ngày {fmtExpected(item.expected_date)}</div>
                  <div style={{fontSize:12,marginTop:2,opacity:.8}}>Liên hệ để đặt trước</div>
                </div>
              </div>
            )}

            {/* Contact actions */}
            {!isSold && (
              <div className="contact-actions">
                {item.phone && (
                  <>
                    <a href={`tel:${item.phone}`} className="btn-call">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 016 3.18 2 2 0 018.07 3a2 2 0 012 2v3a2 2 0 01-1.72 1.99 16 16 0 00-6.97 2.98 16 16 0 002.73 3.06A2 2 0 0117.07 19l-1.64-1.64"/></svg>
                      Gọi {item.phone}
                    </a>
                    <button className="btn-msg" onClick={() => setMsgOpen(true)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.918 1.418 5.525 3.641 7.24V22l3.299-1.813A10.7 10.7 0 0012 20.486c5.523 0 10-4.145 10-9.243S17.523 2 12 2z"/></svg>
                      Messenger
                    </button>
                  </>
                )}
                <button className="btn-fb" onClick={openFB}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>
                  Facebook
                </button>
                <a href={CHOT_TOT} target="_blank" rel="noopener noreferrer" className="btn-chottot">
                  Xem thêm trên Chợ Tốt →
                </a>
              </div>
            )}

            {isSold && (
              <div className="sold-notice">
                Sản phẩm này đã được bán. Xem các sản phẩm khác tại
                <a href="/" style={{marginLeft:4}}>trang chủ</a>.
              </div>
            )}

            {/* Admin panel */}
            {isAdmin && (
              <div className="admin-panel">
                <div className="admin-panel-label">
                  <span className="admin-dot"/>Quản trị
                </div>
                <div className="admin-actions">
                  {(isAvailable || isIncoming) && (
                    <button className="btn-admin-sold" onClick={()=>patchStatus('sold')}>✓ Đánh dấu đã bán</button>
                  )}
                  {isAvailable && (
                    <button className="btn-admin-incoming" onClick={()=>patchStatus('incoming')}>📦 Đánh dấu sắp về</button>
                  )}
                  {(isSold || isIncoming) && (
                    <button className="btn-admin-ghost" onClick={()=>patchStatus('available')}>↩ Mở lại (còn hàng)</button>
                  )}
                  <button className="btn-admin-edit" onClick={openEdit}>✏️ Chỉnh sửa tin</button>
                  <button className="btn-admin-delete" onClick={deleteItem}>🗑 Xoá tin</button>
                </div>
              </div>
            )}

            {/* Meta footer */}
            <div className="item-meta-footer">
              <span>Đăng lúc {fmtDate(item.created_at)}</span>
              <button className="copy-link-btn" onClick={copyLink}>
                {copied ? '✓ Đã copy link' : '🔗 Copy link chia sẻ'}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Edit modal */}
      {editOpen && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditOpen(false)}>
          <div className="edit-modal">
            <div className="edit-modal-header">
              <h3>Chỉnh sửa tin đăng</h3>
              <button className="edit-modal-close" onClick={() => setEditOpen(false)}>✕</button>
            </div>
            <div className="edit-modal-body">
              <div className="edit-grid">
                <div className="edit-field edit-field-full">
                  <label className="lbl">Tiêu đề *</label>
                  <input className="inp" value={editForm.title} onChange={e => setEditForm(f => ({...f, title: e.target.value}))} />
                </div>
                <div className="edit-field edit-field-full">
                  <label className="lbl">Mô tả</label>
                  <textarea className="inp" rows={3} style={{resize:'vertical'}} value={editForm.description} onChange={e => setEditForm(f => ({...f, description: e.target.value}))} />
                </div>
                <div className="edit-field">
                  <label className="lbl">Giá (VNĐ)</label>
                  <input className="inp" type="number" value={editForm.price} onChange={e => setEditForm(f => ({...f, price: e.target.value}))} placeholder="Để trống = Thương lượng" />
                </div>
                <div className="edit-field">
                  <label className="lbl">Tình trạng</label>
                  <select className="inp" value={editForm.condition} onChange={e => setEditForm(f => ({...f, condition: e.target.value}))}>
                    <option>Mới</option>
                    <option>Cũ - Còn tốt</option>
                    <option>Cũ - Có hao mòn</option>
                  </select>
                </div>
                <div className="edit-field">
                  <label className="lbl">Danh mục</label>
                  <input className="inp" value={editForm.category} onChange={e => setEditForm(f => ({...f, category: e.target.value}))} />
                </div>
                <div className="edit-field">
                  <label className="lbl">Loại</label>
                  <select className="inp" value={editForm.type} onChange={e => setEditForm(f => ({...f, type: e.target.value as 'ban'|'mua'}))}>
                    <option value="ban">Đang bán</option>
                    <option value="mua">Tìm mua</option>
                  </select>
                </div>
                <div className="edit-field">
                  <label className="lbl">Số điện thoại</label>
                  <input className="inp" value={editForm.phone} onChange={e => setEditForm(f => ({...f, phone: e.target.value}))} />
                </div>
                <div className="edit-field">
                  <label className="lbl">Địa điểm</label>
                  <input className="inp" value={editForm.location} onChange={e => setEditForm(f => ({...f, location: e.target.value}))} />
                </div>
                <div className="edit-field">
                  <label className="lbl">Nhân viên đăng</label>
                  <select className="inp" value={editForm.staff_id} onChange={e => setEditForm(f => ({...f, staff_id: e.target.value}))}>
                    <option value="">-- Không chọn --</option>
                    {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="edit-field">
                  <label className="lbl">Ngày về (nếu sắp về)</label>
                  <input className="inp" type="date" value={editForm.expected_date} onChange={e => setEditForm(f => ({...f, expected_date: e.target.value}))} />
                </div>
              </div>

              {/* Image management */}
              <div style={{marginTop:16}}>
                <label className="lbl" style={{marginBottom:8,display:'block'}}>Ảnh ({keptImages.length + newImgFiles.length}/8)</label>
                <div className="edit-img-grid">
                  {keptImages.map((src, i) => (
                    <div key={`kept-${i}`} className="edit-img-item">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" />
                      <button className="edit-img-remove" onClick={() => removeKeptImage(i)}>✕</button>
                    </div>
                  ))}
                  {newImgPreviews.map((src, i) => (
                    <div key={`new-${i}`} className="edit-img-item edit-img-new">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" />
                      <button className="edit-img-remove" onClick={() => removeNewImage(i)}>✕</button>
                    </div>
                  ))}
                  {keptImages.length + newImgFiles.length < 8 && (
                    <label className="edit-img-add">
                      <span>+ Thêm ảnh</span>
                      <input type="file" accept="image/*" multiple style={{display:'none'}}
                        onChange={e => addNewImages(e.target.files)} />
                    </label>
                  )}
                </div>
              </div>
            </div>
            <div className="edit-modal-footer">
              <button className="btn-ghost" onClick={() => setEditOpen(false)} disabled={saving}>Huỷ</button>
              <button className="btn-admin-sold" onClick={saveEdit} disabled={saving} style={{padding:'9px 20px'}}>
                {saving ? 'Đang lưu...' : '✓ Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lbOpen && <Lightbox images={images} idx={mainIdx} onClose={() => setLbOpen(false)} />}

      {/* Messenger modal */}
      {msgOpen && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setMsgOpen(false)}>
          <div className="modal">
            <h3>Gửi tin nhắn Messenger</h3>
            <p>Tin nhắn soạn sẵn, chỉnh nếu cần trước khi gửi.</p>
            <label className="lbl">SĐT / Messenger ID</label>
            <input className="inp" value={msgPhone} onChange={e => setMsgPhone(e.target.value)} placeholder="09xxxxxxxx" style={{marginBottom:10}}/>
            <textarea className="inp" style={{minHeight:90,resize:'vertical'}} value={msgText} onChange={e => setMsgText(e.target.value)}/>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setMsgOpen(false)}>Đóng</button>
              <button className="btn-msg" onClick={sendMessenger}>Mở Messenger →</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="detail-toast">{toast}</div>}
    </>
  )
}

const css = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#f9f8f6;--surface:#fff;--border:#e8e6e1;--text:#1a1916;--muted:#8c8982;--accent:#1a1916;--tag-bg:#f0efe9;--green:#2a7a4b;--green-bg:#edf7f2;--red:#c0392b;--fb:#1877f2;--ct:#e65c00}
body{font-family:'Be Vietnam Pro',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;font-size:14px;line-height:1.6}

header{display:flex;align-items:center;justify-content:space-between;padding:16px 32px;border-bottom:1px solid var(--border);background:var(--surface);position:sticky;top:0;z-index:50}
.back-link{display:flex;align-items:center;gap:8px;text-decoration:none;color:var(--text);font-size:15px;font-weight:600;letter-spacing:-.3px;transition:opacity .15s}
.back-link span{color:var(--muted);font-weight:300}
.back-link:hover{opacity:.7}
.header-actions{display:flex;gap:8px}
.btn-share,.btn-icon-action{display:flex;align-items:center;gap:6px;background:none;border:1px solid var(--border);padding:6px 14px;border-radius:7px;font-family:inherit;font-size:13px;cursor:pointer;color:var(--muted);transition:all .15s}
.btn-share:hover,.btn-icon-action:hover{border-color:var(--accent);color:var(--text)}

main{max-width:1000px;margin:0 auto;padding:40px 24px}
.detail-layout{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:start}

/* Images */
.images-col{position:sticky;top:80px}
.main-img-wrap{position:relative;cursor:zoom-in;border-radius:12px;overflow:hidden;background:#f0f0f0;aspect-ratio:4/3}
.main-img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .3s ease}
.main-img-wrap:hover .main-img{transform:scale(1.02)}
.zoom-hint{position:absolute;bottom:12px;right:12px;background:rgba(0,0,0,.5);color:white;font-size:11px;padding:4px 10px;border-radius:20px;opacity:0;transition:opacity .2s}
.main-img-wrap:hover .zoom-hint{opacity:1}
.sold-overlay{position:absolute;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;color:white;letter-spacing:3px}
.thumb-strip{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
.strip-thumb{width:72px;height:72px;object-fit:cover;border-radius:7px;cursor:pointer;border:2px solid transparent;transition:all .15s;opacity:.65}
.strip-thumb.active{border-color:var(--accent);opacity:1}
.strip-thumb:hover{opacity:.9}
.no-img{background:var(--tag-bg);border-radius:12px;aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;font-size:64px}

/* Info */
.info-col{display:flex;flex-direction:column;gap:20px}
.meta-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.item-code{display:inline-flex;align-items:center;gap:6px;background:#f0f4ff;border:1px solid #d4dfff;border-radius:7px;padding:5px 10px}
.code-lbl{font-size:9px;font-weight:700;letter-spacing:.8px;color:#6b7fd4;text-transform:uppercase}
.code-val{font-size:13px;font-weight:600;font-family:monospace;color:#2d3a8c}
.badge{font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px}
.badge-sold{background:#fef0e6;color:#c44f00}
.badge-avail{background:var(--green-bg);color:var(--green)}
.badge-incoming{background:#eef4ff;color:#2563eb}
.item-title{font-size:24px;font-weight:600;line-height:1.3;letter-spacing:-.3px}
.item-price{font-size:28px;font-weight:700;color:var(--green)}
.tags{display:flex;flex-wrap:wrap;gap:6px}
.tag{font-size:12px;background:var(--tag-bg);color:var(--muted);padding:4px 10px;border-radius:6px;font-weight:500}
.tag-new{background:var(--green-bg);color:var(--green)}
.tag-used{background:#fff8ec;color:#c47a1e}
.tag-poster{background:#f3f0ff;color:#6d28d9}
.description{background:var(--tag-bg);border-radius:10px;padding:14px 16px}
.section-label{font-size:10px;font-weight:600;letter-spacing:.8px;text-transform:uppercase;color:var(--muted);margin-bottom:6px}
.description p{font-size:14px;line-height:1.7;color:var(--text)}
.incoming-callout{display:flex;align-items:flex-start;gap:12px;background:#eef4ff;border:1px solid #c7d9ff;border-radius:10px;padding:14px 16px;color:#1e3a8a}
.contact-actions{display:flex;flex-direction:column;gap:8px}
.btn-call{display:flex;align-items:center;justify-content:center;gap:8px;background:var(--green);color:white;text-decoration:none;padding:12px;border-radius:10px;font-family:inherit;font-size:15px;font-weight:600;transition:opacity .15s}
.btn-call:hover{opacity:.85}
.btn-msg{display:flex;align-items:center;justify-content:center;gap:8px;background:#0084ff;color:white;border:none;padding:11px;border-radius:10px;font-family:inherit;font-size:14px;font-weight:500;cursor:pointer;transition:opacity .15s}
.btn-msg:hover{opacity:.85}
.btn-fb{display:flex;align-items:center;justify-content:center;gap:8px;background:var(--fb);color:white;border:none;padding:11px;border-radius:10px;font-family:inherit;font-size:14px;font-weight:500;cursor:pointer;transition:opacity .15s}
.btn-fb:hover{opacity:.85}
.btn-chottot{display:flex;align-items:center;justify-content:center;background:var(--ct);color:white;border:none;padding:11px;border-radius:10px;font-family:inherit;font-size:14px;font-weight:500;cursor:pointer;text-decoration:none;transition:opacity .15s}
.btn-chottot:hover{opacity:.85}
.sold-notice{background:#fff8ec;border:1px solid #fde68a;border-radius:10px;padding:14px 16px;font-size:13px;color:#92400e;line-height:1.6}
.sold-notice a{color:#92400e;font-weight:600}
.item-meta-footer{display:flex;align-items:center;justify-content:space-between;padding-top:8px;border-top:1px solid var(--border);font-size:12px;color:var(--muted)}
.copy-link-btn{background:none;border:none;font-family:inherit;font-size:12px;color:var(--muted);cursor:pointer;padding:4px 8px;border-radius:5px;transition:all .15s}
.copy-link-btn:hover{background:var(--tag-bg);color:var(--text)}

/* Admin panel */
.admin-panel{background:#fafafa;border:1px solid var(--border);border-radius:10px;padding:14px 16px;display:flex;flex-direction:column;gap:10px}
.admin-panel-label{font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--muted);display:flex;align-items:center;gap:6px}
.admin-dot{width:6px;height:6px;border-radius:50%;background:var(--green);flex-shrink:0}
.admin-actions{display:flex;flex-direction:column;gap:6px}
.btn-admin-sold{background:var(--accent);color:white;border:none;padding:9px 14px;border-radius:7px;font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;text-align:left;transition:opacity .15s}
.btn-admin-sold:hover{opacity:.85}
.btn-admin-incoming{background:#2563eb;color:white;border:none;padding:9px 14px;border-radius:7px;font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;text-align:left;transition:opacity .15s}
.btn-admin-incoming:hover{opacity:.8}
.btn-admin-ghost{background:none;border:1px solid var(--border);padding:9px 14px;border-radius:7px;font-family:inherit;font-size:13px;cursor:pointer;color:var(--muted);text-align:left;transition:all .15s}
.btn-admin-ghost:hover{border-color:var(--accent);color:var(--text)}
.btn-admin-edit{background:none;border:1px solid var(--border);padding:9px 14px;border-radius:7px;font-family:inherit;font-size:13px;cursor:pointer;color:var(--text);text-align:left;transition:all .15s}
.btn-admin-edit:hover{border-color:var(--accent);background:var(--tag-bg)}
.btn-admin-delete{background:none;border:1px solid #fcd0cc;padding:9px 14px;border-radius:7px;font-family:inherit;font-size:13px;cursor:pointer;color:var(--red);text-align:left;transition:background .15s}
.btn-admin-delete:hover{background:#fff0ee}

/* Edit modal */
.edit-modal{background:white;border-radius:14px;width:100%;max-width:600px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden}
.edit-modal-header{display:flex;align-items:center;justify-content:space-between;padding:20px 24px 16px;border-bottom:1px solid var(--border);flex-shrink:0}
.edit-modal-header h3{font-size:15px;font-weight:600;margin:0}
.edit-modal-close{background:none;border:none;font-size:18px;cursor:pointer;color:var(--muted);line-height:1;padding:2px 6px;border-radius:4px}
.edit-modal-close:hover{background:var(--tag-bg);color:var(--text)}
.edit-modal-body{padding:20px 24px;overflow-y:auto;flex:1}
.edit-modal-footer{display:flex;gap:8px;justify-content:flex-end;padding:16px 24px;border-top:1px solid var(--border);flex-shrink:0}
.edit-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.edit-field{display:flex;flex-direction:column;gap:4px}
.edit-field-full{grid-column:1/-1}
.edit-img-grid{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px}
.edit-img-item{position:relative;width:80px;height:80px;border-radius:8px;overflow:hidden;border:1px solid var(--border);flex-shrink:0}
.edit-img-item img{width:100%;height:100%;object-fit:cover;display:block}
.edit-img-new{border-color:#2563eb;border-style:dashed}
.edit-img-remove{position:absolute;top:3px;right:3px;background:rgba(0,0,0,.55);color:white;border:none;border-radius:50%;width:20px;height:20px;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1}
.edit-img-remove:hover{background:rgba(192,57,43,.85)}
.edit-img-add{width:80px;height:80px;border-radius:8px;border:2px dashed var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--muted);font-size:11px;text-align:center;padding:4px;transition:all .15s;flex-shrink:0}
.edit-img-add:hover{border-color:var(--accent);color:var(--accent)}

@media(max-width:500px){.edit-grid{grid-template-columns:1fr}}

/* Toast */
.detail-toast{position:fixed;bottom:24px;right:24px;background:var(--accent);color:white;padding:10px 18px;border-radius:8px;font-size:13px;z-index:200;animation:fadeIn .2s ease}
@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}

/* Lightbox */
.lb{position:fixed;inset:0;background:rgba(0,0,0,.93);z-index:200;display:flex;align-items:center;justify-content:center;animation:fadeIn .2s ease}
.lb-img{max-width:90vw;max-height:80vh;object-fit:contain;border-radius:4px;cursor:default}
.lb-close{position:fixed;top:20px;right:24px;background:rgba(255,255,255,.15);color:white;border:none;width:36px;height:36px;border-radius:50%;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:201}
.lb-close:hover{background:rgba(255,255,255,.3)}
.lb-nav{position:fixed;top:50%;transform:translateY(-50%);background:rgba(255,255,255,.12);color:white;border:none;font-size:28px;width:48px;height:48px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:201}
.lb-nav:hover{background:rgba(255,255,255,.25)}
.lb-prev{left:20px}
.lb-next{right:20px}
.lb-counter{position:fixed;top:20px;left:50%;transform:translateX(-50%);color:rgba(255,255,255,.7);font-size:13px;background:rgba(0,0,0,.4);padding:4px 14px;border-radius:20px}
.lb-thumbs{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);display:flex;gap:8px;padding:8px;background:rgba(0,0,0,.5);border-radius:10px;max-width:90vw;overflow-x:auto}
.lb-thumb{width:52px;height:52px;object-fit:cover;border-radius:5px;cursor:pointer;opacity:.55;border:2px solid transparent;transition:all .15s;flex-shrink:0}
.lb-thumb.active{opacity:1;border-color:white}

/* Modal */
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:150;display:flex;align-items:center;justify-content:center;padding:20px}
.modal{background:white;border-radius:12px;padding:28px;width:100%;max-width:440px}
.modal h3{font-size:15px;font-weight:600;margin-bottom:6px}
.modal p{font-size:13px;color:var(--muted);margin-bottom:16px}
.lbl{font-size:11px;font-weight:500;letter-spacing:.6px;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:5px}
.inp{font-size:14px;color:var(--text);background:var(--tag-bg);border:1px solid var(--border);border-radius:6px;padding:8px 10px;font-family:inherit;width:100%;outline:none;transition:border-color .15s}
.inp:focus{border-color:var(--accent);background:white}
.modal-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:14px}
.btn-ghost{background:none;border:1px solid var(--border);padding:7px 16px;border-radius:7px;font-family:inherit;font-size:13px;cursor:pointer;color:var(--muted)}
.btn-ghost:hover{border-color:var(--accent);color:var(--text)}

@media(max-width:700px){
  main{padding:24px 16px}
  header{padding:14px 16px}
  .detail-layout{grid-template-columns:1fr;gap:24px}
  .images-col{position:static}
  .item-title{font-size:20px}
  .item-price{font-size:22px}
  .lb-nav{width:38px;height:38px;font-size:22px}
  .lb-prev{left:8px}
  .lb-next{right:8px}
}
`

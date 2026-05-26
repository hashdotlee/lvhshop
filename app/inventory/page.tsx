'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { InventoryBatch, Item, Staff } from '@/lib/supabase'
import { compressToWebP } from '@/lib/compress'

function fmtVND(v: number | null | undefined) {
  if (!v) return '—'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v)
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}
function getImages(item: Item): string[] {
  if (item.images && item.images.length > 0) return item.images
  if (item.image_url) return [item.image_url]
  return []
}

function SkuInput({ value, onChange, existingSkus }: { value: string; onChange: (v: string) => void; existingSkus: string[] }) {
  const [open, setOpen] = useState(false)
  const q = value.trim().toUpperCase()
  const suggestions = q.length > 0
    ? existingSkus.filter(s => s.includes(q)).slice(0, 8)
    : []

  function handleBlur() {
    setTimeout(() => setOpen(false), 160)
  }
  function pick(sku: string) {
    onChange(sku)
    setOpen(false)
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        className="inv-inp"
        placeholder="VD: TOMICA-001..."
        value={value}
        onChange={e => { onChange(e.target.value.toUpperCase()); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
      />
      {open && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, marginTop: 2,
          background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 8,
          maxHeight: 200, overflowY: 'auto', boxShadow: '0 4px 20px rgba(0,0,0,.5)',
        }}>
          {suggestions.map(s => (
            <div key={s}
              style={{ padding: '9px 12px', cursor: 'pointer', fontSize: 13, color: '#e5e7eb', fontFamily: 'monospace', borderBottom: '1px solid #1a1d27' }}
              onMouseDown={e => { e.preventDefault(); pick(s) }}
              onMouseEnter={e => (e.currentTarget.style.background = '#2a2d3a')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const INIT_FORM = {
  notes: '', supplier: '', staff_id: '',
  title: '', sku: '', description: '', condition: 'Mới', category: '',
  price: '', cost_price: '', bin_location: '', quantity: '1',
}

export default function InventoryPage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [authInput, setAuthInput] = useState('')
  const [authError, setAuthError] = useState(false)
  const adminKey = useRef('')

  const [view, setView] = useState<'batches' | 'import' | 'batch-items'>('batches')
  const [selectedBatch, setSelectedBatch] = useState<(InventoryBatch & { items?: Item[] }) | null>(null)

  const [batches, setBatches] = useState<InventoryBatch[]>([])
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [existingSkus, setExistingSkus] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState(INIT_FORM)
  const [imgFiles, setImgFiles] = useState<File[]>([])
  const [imgPreviews, setImgPreviews] = useState<string[]>([])
  const [compressing, setCompressing] = useState(false)
  const [compressInfo, setCompressInfo] = useState<{ original: number; compressed: number } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [lastImport, setLastImport] = useState<{ batch: InventoryBatch; items: Item[] } | null>(null)
  const [printItems, setPrintItems] = useState<Item[] | null>(null)
  const [addingItems, setAddingItems] = useState(false)
  const [addItemsResult, setAddItemsResult] = useState<Item[] | null>(null)
  const [addSubmitting, setAddSubmitting] = useState(false)

  const [editingBatch, setEditingBatch] = useState<InventoryBatch | null>(null)
  const [editBatchForm, setEditBatchForm] = useState({ notes: '', supplier: '', staff_id: '' })
  const [editBatchSubmitting, setEditBatchSubmitting] = useState(false)

  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [editItemForm, setEditItemForm] = useState({ title: '', sku: '', description: '', condition: 'Mới', category: '', price: '', cost_price: '', bin_location: '', status: 'available' })
  const [editItemSubmitting, setEditItemSubmitting] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)
  const [toast, setToast] = useState('')
  const toastTimer = useRef<ReturnType<typeof setTimeout>>()

  function showToast(m: string) {
    setToast(m); clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2800)
  }

  const fetchExistingSkus = useCallback(async () => {
    try {
      const r = await fetch('/api/items')
      const d = await r.json()
      if (Array.isArray(d)) {
        const skus = Array.from(new Set(d.map((i: Item) => i.sku).filter(Boolean))) as string[]
        setExistingSkus(skus)
      }
    } catch {}
  }, [])

  const fetchBatches = useCallback(async (key?: string) => {
    setLoading(true)
    try {
      const r = await fetch('/api/inventory', { headers: { 'x-admin-key': key ?? adminKey.current } })
      const d = await r.json()
      setBatches(Array.isArray(d) ? d : [])
    } catch { showToast('Không thể tải lô hàng') }
    finally { setLoading(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchStaff = useCallback(async () => {
    try {
      const r = await fetch('/api/staff')
      setBatches(prev => prev) // no-op, just to satisfy lint
      const d = await r.json()
      setStaffList(Array.isArray(d) ? d : [])
    } catch {}
  }, [])

  useEffect(() => {
    const key = sessionStorage.getItem('cq_admin_key')
    if (key) {
      adminKey.current = key
      setIsAdmin(true)
      fetchBatches(key)
      fetchStaff()
      fetchExistingSkus()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function tryLogin() {
    const r = await fetch('/api/auth', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: authInput }),
    })
    if (r.status === 401) {
      setAuthError(true); setAuthInput('')
      setTimeout(() => setAuthError(false), 3000)
    } else {
      adminKey.current = authInput
      sessionStorage.setItem('cq_admin_key', authInput)
      setIsAdmin(true)
      fetchBatches(authInput)
      fetchStaff()
      fetchExistingSkus()
    }
  }

  async function openBatch(batch: InventoryBatch) {
    setLoading(true)
    try {
      const r = await fetch(`/api/inventory?batch_id=${batch.id}`, { headers: { 'x-admin-key': adminKey.current } })
      const d = await r.json()
      setSelectedBatch({ ...batch, items: Array.isArray(d.items) ? d.items : [] })
      setView('batch-items')
    } catch { showToast('Không thể tải sản phẩm') }
    finally { setLoading(false) }
  }

  async function deleteBatch(id: number) {
    if (!confirm('Xóa lô hàng này? Các sản phẩm sẽ không bị xóa.')) return
    await fetch('/api/inventory', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey.current },
      body: JSON.stringify({ id }),
    })
    setBatches(prev => prev.filter(b => b.id !== id))
    showToast('Đã xóa lô hàng')
  }

  const addImagesFromRaw = useCallback(async (raw: File[]) => {
    if (!raw.length) return
    setCompressing(true)
    setCompressInfo(null)
    try {
      const originalSize = raw.reduce((s, f) => s + f.size, 0)
      const compressed = await Promise.all(raw.map(f => compressToWebP(f)))
      const compressedSize = compressed.reduce((s, f) => s + f.size, 0)
      setCompressInfo({ original: originalSize, compressed: compressedSize })
      setImgFiles(prev => {
        const merged = [...prev, ...compressed].slice(0, 8)
        setImgPreviews(merged.map(f => URL.createObjectURL(f)))
        return merged
      })
    } finally {
      setCompressing(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }, [])

  async function handleImgChange(e: React.ChangeEvent<HTMLInputElement>) {
    await addImagesFromRaw(Array.from(e.target.files ?? []))
  }

  useEffect(() => {
    if (view !== 'import' && !addingItems) return
    function onPaste(e: ClipboardEvent) {
      const imgs = Array.from(e.clipboardData?.items ?? [])
        .filter(it => it.type.startsWith('image/'))
        .map(it => it.getAsFile())
        .filter((f): f is File => f !== null)
      if (!imgs.length) return
      e.preventDefault()
      addImagesFromRaw(imgs)
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [view, addingItems, addImagesFromRaw])

  function removeImg(i: number) {
    setImgFiles(p => p.filter((_, j) => j !== i))
    setImgPreviews(p => p.filter((_, j) => j !== i))
  }

  async function submitImport() {
    if (!form.title.trim()) { showToast('Nhập tên sản phẩm'); return }
    const qty = Math.max(1, Math.min(200, parseInt(form.quantity) || 1))
    setSubmitting(true)
    try {
      let uploadedImages: string[] = []
      if (imgFiles.length > 0) {
        const fd = new FormData()
        imgFiles.forEach(f => fd.append('files', f))
        fd.append('adminKey', adminKey.current)
        const ur = await fetch('/api/upload', { method: 'POST', body: fd })
        if (ur.ok) uploadedImages = (await ur.json()).urls ?? []
        else showToast('Upload ảnh thất bại — tiếp tục không có ảnh')
      }

      const itemPayload = {
        title: form.title,
        sku: form.sku || null,
        description: form.description || null,
        condition: form.condition,
        category: form.category || null,
        price: form.price ? Number(form.price) : null,
        cost_price: form.cost_price ? Number(form.cost_price) : null,
        bin_location: form.bin_location || null,
        images: uploadedImages,
      }

      const staff = staffList.find(s => s.id === Number(form.staff_id))

      const r = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey.current },
        body: JSON.stringify({
          notes: form.notes || null,
          supplier: form.supplier || null,
          created_by: staff?.name ?? null,
          staff_id: form.staff_id ? Number(form.staff_id) : null,
          items: Array.from({ length: qty }, () => ({ ...itemPayload })),
        }),
      })

      if (!r.ok) {
        const err = await r.json()
        showToast(`Lỗi: ${err.error ?? r.status}`)
        return
      }

      const data = await r.json()
      setLastImport(data)
      setForm(prev => ({ ...prev, notes: '', quantity: '1' }))
      setImgFiles([]); setImgPreviews([])
      fetchBatches()
      fetchExistingSkus()
      showToast(`Đã nhập ${qty} sản phẩm · Lô ${data.batch.batch_code}`)
    } catch { showToast('Lỗi kết nối server') }
    finally { setSubmitting(false) }
  }

  function startPrint(items: Item[]) {
    setPrintItems(items)
  }

  function startAddingItems() {
    setForm(INIT_FORM)
    setImgFiles([])
    setImgPreviews([])
    setCompressInfo(null)
    setAddItemsResult(null)
    setAddingItems(true)
  }

  async function submitAddItems() {
    if (!form.title.trim()) { showToast('Nhập tên sản phẩm'); return }
    if (!selectedBatch) return
    const qty = Math.max(1, Math.min(200, parseInt(form.quantity) || 1))
    setAddSubmitting(true)
    try {
      let uploadedImages: string[] = []
      if (imgFiles.length > 0) {
        const fd = new FormData()
        imgFiles.forEach(f => fd.append('files', f))
        fd.append('adminKey', adminKey.current)
        const ur = await fetch('/api/upload', { method: 'POST', body: fd })
        if (ur.ok) uploadedImages = (await ur.json()).urls ?? []
        else showToast('Upload ảnh thất bại — tiếp tục không có ảnh')
      }

      const itemPayload = {
        title: form.title,
        sku: form.sku || null,
        description: form.description || null,
        condition: form.condition,
        category: form.category || null,
        price: form.price ? Number(form.price) : null,
        cost_price: form.cost_price ? Number(form.cost_price) : null,
        bin_location: form.bin_location || null,
        images: uploadedImages,
      }

      const r = await fetch('/api/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey.current },
        body: JSON.stringify({
          batch_id: selectedBatch.id,
          items: Array.from({ length: qty }, () => ({ ...itemPayload })),
        }),
      })

      if (!r.ok) {
        const err = await r.json()
        showToast(`Lỗi: ${err.error ?? r.status}`)
        return
      }

      const data = await r.json()
      setAddItemsResult(data.items)
      setForm(INIT_FORM)
      setImgFiles([]); setImgPreviews([])

      const refreshed = await fetch(`/api/inventory?batch_id=${selectedBatch.id}`, { headers: { 'x-admin-key': adminKey.current } })
      const refreshData = await refreshed.json()
      const newItems = Array.isArray(refreshData.items) ? refreshData.items : []
      setSelectedBatch(prev => prev ? { ...prev, items: newItems, item_count: newItems.length } : prev)
      fetchBatches()
      showToast(`Đã bổ sung ${qty} sản phẩm vào lô ${selectedBatch.batch_code}`)
    } catch { showToast('Lỗi kết nối server') }
    finally { setAddSubmitting(false) }
  }

  function openEditBatch(batch: InventoryBatch) {
    setEditingBatch(batch)
    setEditBatchForm({
      notes: batch.notes ?? '',
      supplier: batch.supplier ?? '',
      staff_id: batch.staff_id ? String(batch.staff_id) : '',
    })
  }

  async function submitEditBatch() {
    if (!editingBatch) return
    setEditBatchSubmitting(true)
    try {
      const staff = staffList.find(s => s.id === Number(editBatchForm.staff_id))
      const r = await fetch('/api/inventory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey.current },
        body: JSON.stringify({
          id: editingBatch.id,
          notes: editBatchForm.notes || null,
          supplier: editBatchForm.supplier || null,
          staff_id: editBatchForm.staff_id ? Number(editBatchForm.staff_id) : null,
          created_by: staff?.name ?? editingBatch.created_by ?? null,
        }),
      })
      if (!r.ok) { const err = await r.json(); showToast(`Lỗi: ${err.error ?? r.status}`); return }
      const updated = await r.json()
      setBatches(prev => prev.map(b => b.id === updated.id ? { ...b, ...updated } : b))
      if (selectedBatch?.id === updated.id) setSelectedBatch(prev => prev ? { ...prev, ...updated } : prev)
      setEditingBatch(null)
      showToast('Đã cập nhật thông tin lô')
    } catch { showToast('Lỗi kết nối server') }
    finally { setEditBatchSubmitting(false) }
  }

  function openEditItem(item: Item) {
    setEditingItem(item)
    setEditItemForm({
      title: item.title,
      sku: item.sku ?? '',
      description: item.description ?? '',
      condition: item.condition ?? 'Mới',
      category: item.category ?? '',
      price: item.price ? String(item.price) : '',
      cost_price: item.cost_price ? String(item.cost_price) : '',
      bin_location: item.bin_location ?? '',
      status: item.status ?? 'available',
    })
  }

  async function submitEditItem() {
    if (!editingItem) return
    if (!editItemForm.title.trim()) { showToast('Nhập tên sản phẩm'); return }
    setEditItemSubmitting(true)
    try {
      const r = await fetch('/api/items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey.current },
        body: JSON.stringify({
          id: editingItem.id,
          title: editItemForm.title,
          description: editItemForm.description || null,
          price: editItemForm.price ? Number(editItemForm.price) : null,
          cost_price: editItemForm.cost_price ? Number(editItemForm.cost_price) : null,
          condition: editItemForm.condition,
          category: editItemForm.category || null,
          type: editingItem.type,
          phone: editingItem.phone ?? '',
          location: editingItem.location ?? '',
          images: editingItem.images ?? [],
          sku: editItemForm.sku || null,
          bin_location: editItemForm.bin_location || null,
          status: editItemForm.status,
        }),
      })
      if (!r.ok) { const err = await r.json(); showToast(`Lỗi: ${err.error ?? r.status}`); return }
      const updated = await r.json()
      setSelectedBatch(prev => prev ? { ...prev, items: (prev.items ?? []).map(i => i.id === updated.id ? updated : i) } : prev)
      setEditingItem(null)
      showToast('Đã cập nhật sản phẩm')
    } catch { showToast('Lỗi kết nối server') }
    finally { setEditItemSubmitting(false) }
  }

  useEffect(() => {
    if (!printItems) return
    const timer = setTimeout(() => { window.print() }, 300)
    const cleanup = () => setPrintItems(null)
    window.addEventListener('afterprint', cleanup)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('afterprint', cleanup)
    }
  }, [printItems])

  function f(key: keyof typeof INIT_FORM, val: string) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  /* ────────── Render ────────── */
  if (!isAdmin) {
    return (
      <div style={S.authWrap}>
        <style>{printCSS}</style>
        <div style={S.authBox}>
          <div style={S.logo}>leviethoang<span style={{ color: '#4ade80' }}>.shop</span></div>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>Quản lý kho hàng — Đăng nhập admin</div>
          <input style={S.inp} type="password" placeholder="Mật khẩu admin..."
            value={authInput} onChange={e => setAuthInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && tryLogin()} autoFocus />
          <button style={S.btnDark} onClick={tryLogin}>Đăng nhập →</button>
          {authError && <div style={{ color: '#f87171', fontSize: 13, marginTop: 8 }}>Mật khẩu không đúng</div>}
          <div style={{ marginTop: 12 }}>
            <a href="/" style={{ color: '#888', fontSize: 12 }}>← Về trang chủ</a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={S.page}>
      <style>{pageCSS + printCSS}</style>

      {/* Print labels overlay */}
      {printItems && (
        <div className="print-labels-container">
          {printItems.map(item => (
            <div key={item.id} className="print-label">
              <div className="pl-barcode">{item.order_code}</div>
              {item.sku && <div className="pl-sku">SKU: {item.sku}</div>}
              <div className="pl-title">{item.title}</div>
              <div className="pl-row">
                <span className="pl-bin">{item.bin_location ?? ''}</span>
                <span className="pl-price">{fmtVND(item.price)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <header className="inv-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="/" style={{ color: '#4ade80', fontWeight: 700, textDecoration: 'none', fontSize: 16 }}>
            leviethoang.shop
          </a>
          <span style={{ color: '#555' }}>/</span>
          <span style={{ fontWeight: 600, color: '#e5e7eb' }}>Kho</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={view === 'batches' ? S.tabActive : S.tab} onClick={() => { setView('batches'); setLastImport(null) }}>
            📋 Lô hàng
          </button>
          <button style={view === 'import' ? S.tabActive : S.tab} onClick={() => { setView('import'); setLastImport(null) }}>
            + Nhập
          </button>
        </div>
      </header>

      <main className="inv-main">

        {/* ── BATCHES VIEW ── */}
        {view === 'batches' && (
          <div>
            <div style={S.sectionTitle}>
              Lô hàng đã nhập
              <button style={{ ...S.btnGhost, marginLeft: 12 }} onClick={() => fetchBatches()}>↻</button>
            </div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Đang tải...</div>
            ) : batches.length === 0 ? (
              <div style={S.empty}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
                <p>Chưa có lô hàng nào.</p>
                <button style={S.btnGreen} onClick={() => setView('import')}>+ Nhập hàng đầu tiên</button>
              </div>
            ) : (
              <div style={S.batchGrid}>
                {batches.map(b => (
                  <div key={b.id} style={S.batchCard}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div>
                        <code style={S.batchCode}>{b.batch_code}</code>
                        <span style={S.batchCount}>{b.item_count ?? 0} sản phẩm</span>
                      </div>
                      <button style={S.btnDel} onClick={() => deleteBatch(b.id)} title="Xóa lô">✕</button>
                    </div>
                    {b.supplier && <div style={S.batchMeta}>Nhà cung cấp: {b.supplier}</div>}
                    {b.notes && <div style={{ ...S.batchMeta, fontStyle: 'italic' }}>{b.notes}</div>}
                    {b.created_by && <div style={S.batchMeta}>Nhập bởi: {b.created_by}</div>}
                    <div style={S.batchDate}>{fmtDate(b.created_at)}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button style={S.btnPrimary} onClick={() => openBatch(b)}>
                        Xem sản phẩm →
                      </button>
                      <button style={S.btnGhost} onClick={() => openEditBatch(b)} title="Sửa thông tin lô">
                        ✎ Sửa
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── IMPORT VIEW ── */}
        {view === 'import' && (
          <div className="inv-import-wrap">
            <div style={S.sectionTitle}>Nhập hàng mới</div>

            <div style={S.card}>
              <div style={S.cardTitle}>📦 Lô hàng</div>
              <div className="inv-fgrid">
                <div style={S.fg}>
                  <div style={S.lbl}>Nguồn hàng</div>
                  <input className="inv-inp" placeholder="VD: Nguồn Nhật, chợ đồ cũ..." value={form.supplier} onChange={e => f('supplier', e.target.value)} />
                </div>
                <div style={S.fg}>
                  <div style={S.lbl}>Người nhập</div>
                  <select className="inv-inp" value={form.staff_id} onChange={e => f('staff_id', e.target.value)}>
                    <option value="">— Chọn —</option>
                    {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="inv-fg-full">
                  <div style={S.lbl}>Ghi chú lô</div>
                  <input className="inv-inp" placeholder="Ghi chú nội bộ..."
                    value={form.notes} onChange={e => f('notes', e.target.value)} />
                </div>
              </div>
            </div>

            <div style={S.card}>
              <div style={S.cardTitle}>🏷️ Sản phẩm</div>

              {/* Image upload */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={S.lbl}>Ảnh ({imgPreviews.length}/8)</div>
                  {compressing && (
                    <span className="inv-compress-badge inv-compress-loading">⏳ Đang nén...</span>
                  )}
                  {!compressing && compressInfo && (
                    <span className="inv-compress-badge inv-compress-done">
                      ↓ {Math.round((1 - compressInfo.compressed / compressInfo.original) * 100)}%
                      ({(compressInfo.original / 1024 / 1024).toFixed(1)}MB → {(compressInfo.compressed / 1024 / 1024).toFixed(1)}MB)
                    </span>
                  )}
                </div>
                <div className="inv-img-grid">
                  {imgPreviews.map((src, i) => (
                    <div key={i} className="inv-img-wrap">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" className="inv-img-thumb" />
                      <button className="inv-img-remove" onClick={() => removeImg(i)}>✕</button>
                    </div>
                  ))}
                  {compressing && (
                    <div className="inv-img-add inv-img-compressing">
                      <div className="inv-compress-spinner" />
                    </div>
                  )}
                  {!compressing && imgPreviews.length < 8 && (
                    <label className="inv-img-add">
                      <span style={{ fontSize: 28, color: '#666' }}>📷</span>
                      <span style={{ fontSize: 11, color: '#666', marginTop: 2 }}>Thêm ảnh</span>
                      <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleImgChange} style={{ display: 'none' }} />
                    </label>
                  )}
                </div>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>· Ctrl+V để dán ảnh từ clipboard</span>
              </div>

              <div className="inv-fgrid">
                <div className="inv-fg-full">
                  <div style={S.lbl}>Tên sản phẩm <span style={{ color: '#f87171' }}>*</span></div>
                  <input className="inv-inp" placeholder="VD: Xe mô hình Tomica Honda Civic..." value={form.title} onChange={e => f('title', e.target.value)} />
                </div>
                <div style={S.fg}>
                  <div style={S.lbl}>SKU</div>
                  <SkuInput value={form.sku} onChange={v => f('sku', v)} existingSkus={existingSkus} />
                </div>
                <div style={S.fg}>
                  <div style={S.lbl}>Danh mục</div>
                  <input className="inv-inp" placeholder="VD: Đồ chơi, Điện tử..." value={form.category} onChange={e => f('category', e.target.value)} />
                </div>
                <div className="inv-fg-full">
                  <div style={S.lbl}>Mô tả</div>
                  <input className="inv-inp" placeholder="Mô tả chi tiết sản phẩm..." value={form.description} onChange={e => f('description', e.target.value)} />
                </div>
                <div style={S.fg}>
                  <div style={S.lbl}>Tình trạng</div>
                  <select className="inv-inp" value={form.condition} onChange={e => f('condition', e.target.value)}>
                    {['Mới', 'Cũ - Như mới', 'Cũ - Còn tốt', 'Cũ - Có lỗi nhỏ'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div style={S.fg}>
                  <div style={S.lbl}>Vị trí thùng</div>
                  <input className="inv-inp" placeholder="VD: A1, Kệ B..." value={form.bin_location} onChange={e => f('bin_location', e.target.value)} />
                </div>
                <div style={S.fg}>
                  <div style={S.lbl}>Giá nhập (VNĐ)</div>
                  <input className="inv-inp" type="number" inputMode="numeric" min="0" step="1000" placeholder="0" value={form.cost_price} onChange={e => f('cost_price', e.target.value)} />
                  {form.cost_price && <div style={S.pricePreview}>{fmtVND(Number(form.cost_price))}</div>}
                </div>
                <div style={S.fg}>
                  <div style={S.lbl}>Giá bán (VNĐ)</div>
                  <input className="inv-inp" type="number" inputMode="numeric" min="0" step="1000" placeholder="0" value={form.price} onChange={e => f('price', e.target.value)} />
                  {form.price && <div style={S.pricePreview}>{fmtVND(Number(form.price))}</div>}
                </div>
                <div className="inv-fg-full">
                  <div style={S.lbl}>Số lượng</div>
                  <div className="inv-qty-row">
                    <button className="inv-qty-btn" onClick={() => f('quantity', String(Math.max(1, (parseInt(form.quantity)||1) - 1)))}>−</button>
                    <input className="inv-inp inv-qty-input" type="number" inputMode="numeric" min="1" max="200" value={form.quantity}
                      onChange={e => f('quantity', e.target.value)} />
                    <button className="inv-qty-btn" onClick={() => f('quantity', String(Math.min(200, (parseInt(form.quantity)||1) + 1)))}>+</button>
                  </div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                    Tạo {Math.max(1, parseInt(form.quantity) || 1)} mã sản phẩm riêng biệt
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky submit */}
            <div className="inv-submit-bar">
              <button style={S.btnGhost} onClick={() => setView('batches')}>← Quay lại</button>
              <button className="inv-submit-btn" onClick={submitImport} disabled={submitting}>
                {submitting ? 'Đang nhập...' : `📥 Nhập ${Math.max(1, parseInt(form.quantity) || 1)} sản phẩm`}
              </button>
            </div>

            {/* Results after successful import */}
            {lastImport && (
              <div style={S.importResult}>
                <div className="inv-result-header">
                  <div>
                    <span style={{ color: '#4ade80', fontWeight: 700, fontSize: 16 }}>✓ Nhập thành công!</span>
                    <code style={{ ...S.batchCode, marginLeft: 12 }}>{lastImport.batch.batch_code}</code>
                  </div>
                  <button style={S.btnPrint} onClick={() => startPrint(lastImport.items)}>
                    🖨️ In tất cả ({lastImport.items.length})
                  </button>
                </div>
                <div className="inv-result-list">
                  {lastImport.items.map(item => (
                    <div key={item.id} className="inv-result-card">
                      <div className="inv-result-main">
                        <code style={S.code}>{item.order_code}</code>
                        {item.sku && <span style={{ color: '#60a5fa', fontSize: 12, fontWeight: 600 }}>{item.sku}</span>}
                      </div>
                      <div className="inv-result-title">{item.title}</div>
                      <div className="inv-result-meta">
                        {item.bin_location && <span>📦 {item.bin_location}</span>}
                        <span style={{ color: '#4ade80' }}>{fmtVND(item.price)}</span>
                        <button style={S.btnPrintSm} onClick={() => startPrint([item])}>🖨️</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── BATCH ITEMS VIEW ── */}
        {view === 'batch-items' && selectedBatch && (
          <div>
            <div className="inv-batch-header">
              <button style={S.btnGhost} onClick={() => { setView('batches'); setSelectedBatch(null); setAddingItems(false); setAddItemsResult(null) }}>← Lô hàng</button>
              <code style={S.batchCode}>{selectedBatch.batch_code}</code>
              <span style={{ color: '#888', fontSize: 13 }}>{selectedBatch.item_count ?? selectedBatch.items?.length ?? 0} sp</span>
              <button
                style={{ ...S.btnGreen, padding: '8px 14px', fontSize: 13, marginLeft: 4 }}
                onClick={() => addingItems ? setAddingItems(false) : startAddingItems()}
              >
                {addingItems ? '✕ Đóng form' : '+ Bổ sung'}
              </button>
              <button style={{ ...S.btnGhost, padding: '8px 14px', fontSize: 13 }} onClick={() => openEditBatch(selectedBatch)}>
                ✎ Sửa lô
              </button>
              {selectedBatch.items && selectedBatch.items.length > 0 && (
                <button style={{ ...S.btnPrint, marginLeft: 'auto' }} onClick={() => startPrint(selectedBatch.items!)}>
                  🖨️ In tất cả
                </button>
              )}
            </div>

            <div className="inv-batch-meta">
              {selectedBatch.supplier && <span>NCC: {selectedBatch.supplier}</span>}
              {selectedBatch.created_by && <span>Nhập bởi: {selectedBatch.created_by}</span>}
              {selectedBatch.notes && <span style={{ fontStyle: 'italic' }}>{selectedBatch.notes}</span>}
            </div>

            {/* ── Add Items Form ── */}
            {addingItems && (
              <div style={{ ...S.card, border: '1px solid #16a34a', marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={S.cardTitle}>🏷️ Bổ sung sản phẩm vào lô này</div>
                </div>

                {/* Image upload */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={S.lbl}>Ảnh ({imgPreviews.length}/8)</div>
                    {compressing && <span className="inv-compress-badge inv-compress-loading">⏳ Đang nén...</span>}
                    {!compressing && compressInfo && (
                      <span className="inv-compress-badge inv-compress-done">
                        ↓ {Math.round((1 - compressInfo.compressed / compressInfo.original) * 100)}%
                        ({(compressInfo.original / 1024 / 1024).toFixed(1)}MB → {(compressInfo.compressed / 1024 / 1024).toFixed(1)}MB)
                      </span>
                    )}
                  </div>
                  <div className="inv-img-grid">
                    {imgPreviews.map((src, i) => (
                      <div key={i} className="inv-img-wrap">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" className="inv-img-thumb" />
                        <button className="inv-img-remove" onClick={() => removeImg(i)}>✕</button>
                      </div>
                    ))}
                    {compressing && (
                      <div className="inv-img-add inv-img-compressing">
                        <div className="inv-compress-spinner" />
                      </div>
                    )}
                    {!compressing && imgPreviews.length < 8 && (
                      <label className="inv-img-add">
                        <span style={{ fontSize: 28, color: '#666' }}>📷</span>
                        <span style={{ fontSize: 11, color: '#666', marginTop: 2 }}>Thêm ảnh</span>
                        <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleImgChange} style={{ display: 'none' }} />
                      </label>
                    )}
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>· Ctrl+V để dán ảnh từ clipboard</span>
                </div>

                <div className="inv-fgrid">
                  <div className="inv-fg-full">
                    <div style={S.lbl}>Tên sản phẩm <span style={{ color: '#f87171' }}>*</span></div>
                    <input className="inv-inp" placeholder="VD: Xe mô hình Tomica Honda Civic..." value={form.title} onChange={e => f('title', e.target.value)} />
                  </div>
                  <div style={S.fg}>
                    <div style={S.lbl}>SKU</div>
                    <SkuInput value={form.sku} onChange={v => f('sku', v)} existingSkus={existingSkus} />
                  </div>
                  <div style={S.fg}>
                    <div style={S.lbl}>Danh mục</div>
                    <input className="inv-inp" placeholder="VD: Đồ chơi, Điện tử..." value={form.category} onChange={e => f('category', e.target.value)} />
                  </div>
                  <div className="inv-fg-full">
                    <div style={S.lbl}>Mô tả</div>
                    <input className="inv-inp" placeholder="Mô tả chi tiết sản phẩm..." value={form.description} onChange={e => f('description', e.target.value)} />
                  </div>
                  <div style={S.fg}>
                    <div style={S.lbl}>Tình trạng</div>
                    <select className="inv-inp" value={form.condition} onChange={e => f('condition', e.target.value)}>
                      {['Mới', 'Cũ - Như mới', 'Cũ - Còn tốt', 'Cũ - Có lỗi nhỏ'].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div style={S.fg}>
                    <div style={S.lbl}>Vị trí thùng</div>
                    <input className="inv-inp" placeholder="VD: A1, Kệ B..." value={form.bin_location} onChange={e => f('bin_location', e.target.value)} />
                  </div>
                  <div style={S.fg}>
                    <div style={S.lbl}>Giá nhập (VNĐ)</div>
                    <input className="inv-inp" type="number" inputMode="numeric" min="0" step="1000" placeholder="0" value={form.cost_price} onChange={e => f('cost_price', e.target.value)} />
                    {form.cost_price && <div style={S.pricePreview}>{fmtVND(Number(form.cost_price))}</div>}
                  </div>
                  <div style={S.fg}>
                    <div style={S.lbl}>Giá bán (VNĐ)</div>
                    <input className="inv-inp" type="number" inputMode="numeric" min="0" step="1000" placeholder="0" value={form.price} onChange={e => f('price', e.target.value)} />
                    {form.price && <div style={S.pricePreview}>{fmtVND(Number(form.price))}</div>}
                  </div>
                  <div className="inv-fg-full">
                    <div style={S.lbl}>Số lượng</div>
                    <div className="inv-qty-row">
                      <button className="inv-qty-btn" onClick={() => f('quantity', String(Math.max(1, (parseInt(form.quantity)||1) - 1)))}>−</button>
                      <input className="inv-inp inv-qty-input" type="number" inputMode="numeric" min="1" max="200" value={form.quantity} onChange={e => f('quantity', e.target.value)} />
                      <button className="inv-qty-btn" onClick={() => f('quantity', String(Math.min(200, (parseInt(form.quantity)||1) + 1)))}>+</button>
                    </div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                      Tạo {Math.max(1, parseInt(form.quantity) || 1)} mã sản phẩm riêng biệt
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button style={S.btnGhost} onClick={() => { setAddingItems(false); setAddItemsResult(null) }}>Hủy</button>
                  <button
                    style={{ flex: 1, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 10, padding: '14px 20px', fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: addSubmitting ? 0.5 : 1 }}
                    onClick={submitAddItems}
                    disabled={addSubmitting}
                  >
                    {addSubmitting ? 'Đang bổ sung...' : `📥 Bổ sung ${Math.max(1, parseInt(form.quantity) || 1)} sản phẩm`}
                  </button>
                </div>

                {/* Result after add */}
                {addItemsResult && addItemsResult.length > 0 && (
                  <div style={{ ...S.importResult, marginTop: 16 }}>
                    <div className="inv-result-header">
                      <div>
                        <span style={{ color: '#4ade80', fontWeight: 700, fontSize: 16 }}>✓ Bổ sung thành công!</span>
                        <span style={{ color: '#9ca3af', fontSize: 13, marginLeft: 8 }}>{addItemsResult.length} sản phẩm</span>
                      </div>
                      <button style={S.btnPrint} onClick={() => startPrint(addItemsResult)}>
                        🖨️ In nhãn ({addItemsResult.length})
                      </button>
                    </div>
                    <div className="inv-result-list">
                      {addItemsResult.map(item => (
                        <div key={item.id} className="inv-result-card">
                          <div className="inv-result-main">
                            <code style={S.code}>{item.order_code}</code>
                            {item.sku && <span style={{ color: '#60a5fa', fontSize: 12, fontWeight: 600 }}>{item.sku}</span>}
                          </div>
                          <div className="inv-result-title">{item.title}</div>
                          <div className="inv-result-meta">
                            {item.bin_location && <span>📦 {item.bin_location}</span>}
                            <span style={{ color: '#4ade80' }}>{fmtVND(item.price)}</span>
                            <button style={S.btnPrintSm} onClick={() => startPrint([item])}>🖨️</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {loading ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Đang tải...</div>
            ) : !selectedBatch.items || selectedBatch.items.length === 0 ? (
              <div style={S.empty}><p>Lô này chưa có sản phẩm nào.</p></div>
            ) : (
              <>
                {/* SKU groups summary */}
                {(() => {
                  const skuMap = new Map<string, Item[]>()
                  selectedBatch.items!.forEach(item => {
                    if (item.sku) {
                      const g = skuMap.get(item.sku) ?? []
                      g.push(item)
                      skuMap.set(item.sku, g)
                    }
                  })
                  if (skuMap.size === 0) return null
                  return (
                    <div style={S.skuSummary}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>SKU trong lô này</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {Array.from(skuMap.entries()).map(([sku, items]) => (
                          <div key={sku} style={S.skuChip}>
                            <span style={{ fontWeight: 700 }}>{sku}</span>
                            <span style={{ color: '#888', marginLeft: 4 }}>× {items.length}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                {/* Desktop: table | Mobile: cards */}
                <div className="inv-items-table-wrap">
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Ảnh</th>
                        <th style={S.th}>Mã SP</th>
                        <th style={S.th}>SKU</th>
                        <th style={S.th}>Tên sản phẩm</th>
                        <th style={S.th}>Thùng</th>
                        <th style={S.th}>Tình trạng</th>
                        <th style={S.th}>Giá bán</th>
                        <th style={S.th}>Trạng thái</th>
                        <th style={S.th}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBatch.items!.map(item => {
                        const imgs = getImages(item)
                        return (
                          <tr key={item.id} style={{ ...S.tr, opacity: item.status === 'sold' ? 0.5 : 1 }}>
                            <td style={S.td}>
                              {imgs.length > 0 ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={imgs[0]} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }} />
                              ) : <span style={{ color: '#555', fontSize: 20 }}>—</span>}
                            </td>
                            <td style={S.td}><code style={S.code}>{item.order_code}</code></td>
                            <td style={S.td}><span style={{ color: '#60a5fa', fontWeight: 600 }}>{item.sku ?? '—'}</span></td>
                            <td style={{ ...S.td, maxWidth: 200 }}>{item.title}</td>
                            <td style={S.td}>{item.bin_location ?? '—'}</td>
                            <td style={S.td}><span style={{ fontSize: 12 }}>{item.condition}</span></td>
                            <td style={S.td}>{fmtVND(item.price)}</td>
                            <td style={S.td}>
                              {item.status === 'available' && <span style={S.badgeAvail}>Còn hàng</span>}
                              {item.status === 'sold' && <span style={S.badgeSold}>Đã bán</span>}
                              {item.status === 'incoming' && <span style={S.badgeIncoming}>Sắp về</span>}
                              {item.status === 'reserved' && <span style={S.badgeReserved}>Đang giữ</span>}
                            </td>
                            <td style={S.td}>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button style={S.btnPrintSm} onClick={() => startPrint([item])} title="In nhãn">🖨️</button>
                                <a href={`/item/${item.id}`} style={{ ...S.btnPrintSm, textDecoration: 'none' }} target="_blank">👁️</a>
                                <button style={{ ...S.btnPrintSm, background: '#374151' }} onClick={() => openEditItem(item)} title="Sửa">✎</button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="inv-items-cards">
                  {selectedBatch.items!.map(item => {
                    const imgs = getImages(item)
                    return (
                      <div key={item.id} className={`inv-item-card${item.status === 'sold' ? ' inv-item-sold' : ''}`}>
                        <div className="inv-item-card-left">
                          {imgs.length > 0 ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={imgs[0]} alt="" className="inv-item-card-img" />
                          ) : <div className="inv-item-card-img inv-item-no-img">📦</div>}
                        </div>
                        <div className="inv-item-card-body">
                          <div className="inv-item-card-codes">
                            <code className="inv-item-card-code">{item.order_code}</code>
                            {item.sku && <span className="inv-item-card-sku">{item.sku}</span>}
                          </div>
                          <div className="inv-item-card-title">{item.title}</div>
                          <div className="inv-item-card-meta">
                            {item.bin_location && <span>📦 {item.bin_location}</span>}
                            <span style={{ color: '#4ade80' }}>{fmtVND(item.price)}</span>
                            {item.status === 'available' && <span style={S.badgeAvail}>Còn</span>}
                            {item.status === 'sold' && <span style={S.badgeSold}>Đã bán</span>}
                            {item.status === 'incoming' && <span style={S.badgeIncoming}>Sắp về</span>}
                            {item.status === 'reserved' && <span style={S.badgeReserved}>Đang giữ</span>}
                          </div>
                        </div>
                        <div className="inv-item-card-actions">
                          <button style={S.btnPrintSm} onClick={() => startPrint([item])}>🖨️</button>
                          <a href={`/item/${item.id}`} style={{ ...S.btnPrintSm, textDecoration: 'none' }} target="_blank">👁️</a>
                          <button style={{ ...S.btnPrintSm, background: '#374151' }} onClick={() => openEditItem(item)}>✎</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* ── Edit Batch Modal ── */}
      {editingBatch && (
        <div className="inv-modal-overlay" onClick={() => setEditingBatch(null)}>
          <div className="inv-modal" onClick={e => e.stopPropagation()}>
            <div className="inv-modal-title">Sửa thông tin lô <code style={S.batchCode}>{editingBatch.batch_code}</code></div>
            <div style={S.fg}>
              <div style={S.lbl}>Nguồn hàng</div>
              <input className="inv-inp" value={editBatchForm.supplier} onChange={e => setEditBatchForm(p => ({ ...p, supplier: e.target.value }))} placeholder="VD: Nguồn Nhật..." />
            </div>
            <div style={{ ...S.fg, marginTop: 12 }}>
              <div style={S.lbl}>Người nhập</div>
              <select className="inv-inp" value={editBatchForm.staff_id} onChange={e => setEditBatchForm(p => ({ ...p, staff_id: e.target.value }))}>
                <option value="">— Chọn —</option>
                {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div style={{ ...S.fg, marginTop: 12 }}>
              <div style={S.lbl}>Ghi chú lô</div>
              <input className="inv-inp" value={editBatchForm.notes} onChange={e => setEditBatchForm(p => ({ ...p, notes: e.target.value }))} placeholder="Ghi chú nội bộ..." />
            </div>
            <div className="inv-modal-actions">
              <button style={S.btnGhost} onClick={() => setEditingBatch(null)}>Hủy</button>
              <button
                style={{ ...S.btnGreen, opacity: editBatchSubmitting ? 0.5 : 1 }}
                onClick={submitEditBatch}
                disabled={editBatchSubmitting}
              >
                {editBatchSubmitting ? 'Đang lưu...' : '✓ Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Item Modal ── */}
      {editingItem && (
        <div className="inv-modal-overlay" onClick={() => setEditingItem(null)}>
          <div className="inv-modal inv-modal-lg" onClick={e => e.stopPropagation()}>
            <div className="inv-modal-title">Sửa sản phẩm <code style={S.code}>{editingItem.order_code}</code></div>
            <div className="inv-fgrid" style={{ gap: 12 }}>
              <div className="inv-fg-full">
                <div style={S.lbl}>Tên sản phẩm <span style={{ color: '#f87171' }}>*</span></div>
                <input className="inv-inp" value={editItemForm.title} onChange={e => setEditItemForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div style={S.fg}>
                <div style={S.lbl}>SKU</div>
                <input className="inv-inp" value={editItemForm.sku} onChange={e => setEditItemForm(p => ({ ...p, sku: e.target.value.toUpperCase() }))} />
              </div>
              <div style={S.fg}>
                <div style={S.lbl}>Danh mục</div>
                <input className="inv-inp" value={editItemForm.category} onChange={e => setEditItemForm(p => ({ ...p, category: e.target.value }))} />
              </div>
              <div className="inv-fg-full">
                <div style={S.lbl}>Mô tả</div>
                <input className="inv-inp" value={editItemForm.description} onChange={e => setEditItemForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div style={S.fg}>
                <div style={S.lbl}>Tình trạng</div>
                <select className="inv-inp" value={editItemForm.condition} onChange={e => setEditItemForm(p => ({ ...p, condition: e.target.value }))}>
                  {['Mới', 'Cũ - Như mới', 'Cũ - Còn tốt', 'Cũ - Có lỗi nhỏ'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={S.fg}>
                <div style={S.lbl}>Vị trí thùng</div>
                <input className="inv-inp" value={editItemForm.bin_location} onChange={e => setEditItemForm(p => ({ ...p, bin_location: e.target.value }))} />
              </div>
              <div className="inv-fg-full">
                <div style={S.lbl}>Trạng thái kho</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {([
                    { value: 'available', label: 'Còn hàng',  style: S.badgeAvail },
                    { value: 'reserved',  label: 'Đang giữ',  style: S.badgeReserved },
                    { value: 'incoming',  label: 'Sắp về',    style: S.badgeIncoming },
                    { value: 'sold',      label: 'Đã bán',    style: S.badgeSold },
                  ] as const).map(opt => (
                    <label key={opt.value} style={{
                      display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                      padding: '8px 14px', borderRadius: 8,
                      border: editItemForm.status === opt.value ? '2px solid #4ade80' : '2px solid #2a2d3a',
                      background: editItemForm.status === opt.value ? '#0f1117' : 'transparent',
                      transition: 'border-color .15s',
                    }}>
                      <input type="radio" name="edit_status" value={opt.value}
                        checked={editItemForm.status === opt.value}
                        onChange={() => setEditItemForm(p => ({ ...p, status: opt.value }))}
                        style={{ accentColor: '#4ade80', cursor: 'pointer' }}
                      />
                      <span style={opt.style}>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div style={S.fg}>
                <div style={S.lbl}>Giá nhập (VNĐ)</div>
                <input className="inv-inp" type="number" inputMode="numeric" min="0" step="1000" value={editItemForm.cost_price} onChange={e => setEditItemForm(p => ({ ...p, cost_price: e.target.value }))} />
                {editItemForm.cost_price && <div style={S.pricePreview}>{fmtVND(Number(editItemForm.cost_price))}</div>}
              </div>
              <div style={S.fg}>
                <div style={S.lbl}>Giá bán (VNĐ)</div>
                <input className="inv-inp" type="number" inputMode="numeric" min="0" step="1000" value={editItemForm.price} onChange={e => setEditItemForm(p => ({ ...p, price: e.target.value }))} />
                {editItemForm.price && <div style={S.pricePreview}>{fmtVND(Number(editItemForm.price))}</div>}
              </div>
            </div>
            <div className="inv-modal-actions" style={{ marginTop: 16 }}>
              <button style={S.btnGhost} onClick={() => setEditingItem(null)}>Hủy</button>
              <button
                style={{ ...S.btnGreen, opacity: editItemSubmitting ? 0.5 : 1 }}
                onClick={submitEditItem}
                disabled={editItemSubmitting}
              >
                {editItemSubmitting ? 'Đang lưu...' : '✓ Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={S.toast}>{toast}</div>
      )}
    </div>
  )
}

/* ─── Styles ──────────────────────────────────────────────── */
const S: Record<string, React.CSSProperties> = {
  page:    { minHeight: '100vh', background: '#0f1117', color: '#e5e7eb', fontFamily: 'system-ui, sans-serif' },
  authWrap:{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f1117' },
  authBox: { background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 12, padding: '32px 28px', width: 340, textAlign: 'center' },
  logo:    { fontSize: 22, fontWeight: 800, color: '#e5e7eb', marginBottom: 4 },
  header:  {},
  main:    {},
  tab:     { background: 'transparent', border: '1px solid #2a2d3a', color: '#9ca3af', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13 },
  tabActive:{ background: '#1e3a2a', border: '1px solid #4ade80', color: '#4ade80', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: '#e5e7eb', marginBottom: 20, display: 'flex', alignItems: 'center' },
  card:    { background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 12, padding: 20, marginBottom: 16 },
  cardTitle: { fontSize: 13, fontWeight: 700, color: '#9ca3af', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
  fgrid:   {},
  fg:      { display: 'flex', flexDirection: 'column' },
  lbl:     { fontSize: 12, fontWeight: 600, color: '#9ca3af', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  inp:     { background: '#0f1117', border: '1px solid #2a2d3a', borderRadius: 8, padding: '9px 12px', color: '#e5e7eb', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' as const },
  pricePreview: { fontSize: 12, color: '#4ade80', marginTop: 4 },
  imgGrid: {},
  imgThumbWrap: {},
  imgThumb: {},
  imgRemove: {},
  imgAdd:  {},
  batchGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 },
  batchCard: { background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 12, padding: 16 },
  batchCode: { background: '#0f1117', border: '1px solid #2a2d3a', borderRadius: 6, padding: '3px 8px', fontSize: 13, fontFamily: 'monospace', color: '#60a5fa', fontWeight: 700 },
  batchCount: { background: '#1e3a2a', color: '#4ade80', borderRadius: 12, padding: '2px 10px', fontSize: 12, fontWeight: 600, marginLeft: 8 },
  batchMeta: { fontSize: 13, color: '#9ca3af', marginTop: 6 },
  batchDate: { fontSize: 12, color: '#555', marginTop: 6 },
  btnDel:  { background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', padding: '2px 6px', fontSize: 14, borderRadius: 6 },
  btnPrimary: { background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  btnGreen: { background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 600 },
  btnDark: { background: '#374151', color: '#e5e7eb', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 600, width: '100%', marginTop: 8 },
  btnGhost: { background: 'transparent', border: '1px solid #2a2d3a', color: '#9ca3af', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13 },
  btnPrint: { background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  btnPrintSm: { background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12 },
  importWrap: {},
  importResult: { background: '#1a1d27', border: '1px solid #16a34a', borderRadius: 12, padding: 20, marginTop: 20 },
  table:   { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th:      { textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #2a2d3a', color: '#9ca3af', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', whiteSpace: 'nowrap' },
  tr:      { borderBottom: '1px solid #1a1d27' },
  td:      { padding: '10px 12px', verticalAlign: 'middle' },
  code:    { fontFamily: 'monospace', background: '#0f1117', border: '1px solid #2a2d3a', borderRadius: 4, padding: '2px 6px', fontSize: 12, color: '#60a5fa' },
  empty:   { textAlign: 'center', padding: '48px 0', color: '#888' },
  toast:   { position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#374151', color: '#e5e7eb', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 500, zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.5)' },
  badgeAvail:   { background: '#14532d', color: '#4ade80', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 },
  badgeSold:    { background: '#450a0a', color: '#f87171', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 },
  badgeIncoming:{ background: '#1e3a5f', color: '#60a5fa', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 },
  badgeReserved:{ background: '#2e1065', color: '#c4b5fd', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 },
  skuSummary:   { background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 8, padding: 12, marginBottom: 16 },
  skuChip:      { background: '#0f1117', border: '1px solid #2a2d3a', borderRadius: 8, padding: '4px 12px', fontSize: 13 },
}

const pageCSS = `
  * { box-sizing: border-box; }
  input:focus, select:focus, textarea:focus { outline: none; border-color: #4ade80 !important; }
  button:disabled { opacity: 0.5; cursor: not-allowed; }

  /* ── Layout ── */
  .inv-header {
    background: #1a1d27;
    border-bottom: 1px solid #2a2d3a;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 10;
    gap: 8px;
  }
  .inv-main {
    max-width: 1100px;
    margin: 0 auto;
    padding: 20px 16px;
    padding-bottom: 100px; /* room for sticky button */
  }
  .inv-import-wrap { max-width: 680px; margin: 0 auto; }

  /* ── Form grid ── */
  .inv-fgrid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  .inv-fg-full { grid-column: 1 / -1; }

  /* ── Inputs ── */
  .inv-inp {
    background: #0f1117;
    border: 1px solid #2a2d3a;
    border-radius: 8px;
    padding: 11px 12px;
    color: #e5e7eb;
    font-size: 16px; /* prevents iOS zoom */
    outline: none;
    width: 100%;
    font-family: inherit;
    -webkit-appearance: none;
    appearance: none;
    min-height: 48px;
  }
  .inv-inp:focus { border-color: #4ade80; }

  /* ── Quantity stepper ── */
  .inv-qty-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .inv-qty-btn {
    background: #1a1d27;
    border: 1px solid #2a2d3a;
    color: #e5e7eb;
    border-radius: 8px;
    width: 48px;
    height: 48px;
    font-size: 22px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    line-height: 1;
    user-select: none;
  }
  .inv-qty-btn:active { background: #2a2d3a; }
  .inv-qty-input { text-align: center; }

  /* ── Image grid ── */
  .inv-img-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .inv-img-wrap {
    position: relative;
    width: 80px;
    height: 80px;
  }
  .inv-img-thumb {
    width: 80px;
    height: 80px;
    object-fit: cover;
    border-radius: 8px;
    border: 1px solid #2a2d3a;
  }
  .inv-img-remove {
    position: absolute;
    top: -6px;
    right: -6px;
    background: #ef4444;
    color: #fff;
    border: none;
    border-radius: 50%;
    width: 22px;
    height: 22px;
    cursor: pointer;
    font-size: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }
  .inv-img-add {
    width: 80px;
    height: 80px;
    border: 2px dashed #2a2d3a;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    gap: 2px;
  }

  /* ── Sticky submit bar ── */
  .inv-submit-bar {
    position: sticky;
    bottom: 0;
    left: 0;
    right: 0;
    background: #0f1117;
    border-top: 1px solid #2a2d3a;
    padding: 12px 16px;
    display: flex;
    gap: 10px;
    align-items: center;
    margin: 16px -16px -100px;
    z-index: 10;
  }
  .inv-submit-btn {
    flex: 1;
    background: #16a34a;
    color: #fff;
    border: none;
    border-radius: 10px;
    padding: 14px 20px;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    min-height: 52px;
    font-family: inherit;
  }
  .inv-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .inv-submit-btn:active { background: #15803d; }

  /* ── Import result ── */
  .inv-result-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    gap: 12px;
    flex-wrap: wrap;
  }
  .inv-result-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .inv-result-card {
    background: #0f1117;
    border: 1px solid #2a2d3a;
    border-radius: 8px;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .inv-result-main {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .inv-result-title {
    font-size: 13px;
    color: #e5e7eb;
    font-weight: 500;
  }
  .inv-result-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
    color: #9ca3af;
    flex-wrap: wrap;
  }

  /* ── Batch header ── */
  .inv-batch-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }
  .inv-batch-meta {
    display: flex;
    gap: 12px;
    font-size: 13px;
    color: #9ca3af;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }

  /* ── Batch items: desktop table / mobile cards ── */
  .inv-items-table-wrap { overflow-x: auto; }
  .inv-items-cards { display: none; }

  .inv-item-card {
    display: flex;
    align-items: center;
    gap: 12px;
    background: #1a1d27;
    border: 1px solid #2a2d3a;
    border-radius: 10px;
    padding: 12px;
    margin-bottom: 8px;
  }
  .inv-item-sold { opacity: 0.5; }
  .inv-item-card-left { flex-shrink: 0; }
  .inv-item-card-img {
    width: 60px;
    height: 60px;
    object-fit: cover;
    border-radius: 8px;
    border: 1px solid #2a2d3a;
  }
  .inv-item-no-img {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    background: #0f1117;
  }
  .inv-item-card-body { flex: 1; min-width: 0; }
  .inv-item-card-codes {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
    flex-wrap: wrap;
  }
  .inv-item-card-code {
    font-family: monospace;
    background: #0f1117;
    border: 1px solid #2a2d3a;
    border-radius: 4px;
    padding: 1px 6px;
    font-size: 12px;
    color: #60a5fa;
    font-weight: 700;
  }
  .inv-item-card-sku {
    color: #60a5fa;
    font-size: 11px;
    font-weight: 600;
  }
  .inv-item-card-title {
    font-size: 13px;
    color: #e5e7eb;
    font-weight: 500;
    margin-bottom: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .inv-item-card-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: #9ca3af;
    flex-wrap: wrap;
  }
  .inv-item-card-actions {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex-shrink: 0;
  }

  /* ── Compression feedback ── */
  .inv-compress-badge {
    font-size: 11px; font-weight: 600; padding: 2px 8px;
    border-radius: 8px; white-space: nowrap;
  }
  .inv-compress-loading { background: #1e3a5f; color: #60a5fa; }
  .inv-compress-done    { background: #14532d; color: #4ade80; }
  .inv-img-compressing {
    border-color: #2a2d3a;
    display: flex; align-items: center; justify-content: center;
    background: #1a1d27;
  }
  .inv-compress-spinner {
    width: 22px; height: 22px;
    border: 2px solid #2a2d3a; border-top-color: #4ade80;
    border-radius: 50%;
    animation: inv-spin 0.7s linear infinite;
  }
  @keyframes inv-spin { to { transform: rotate(360deg); } }

  /* ── Edit modals ── */
  .inv-modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,.7);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000; padding: 16px;
  }
  .inv-modal {
    background: #1a1d27; border: 1px solid #2a2d3a; border-radius: 14px;
    padding: 24px; width: 100%; max-width: 420px;
    max-height: 90vh; overflow-y: auto;
  }
  .inv-modal-lg { max-width: 600px; }
  .inv-modal-title {
    font-size: 15px; font-weight: 700; color: #e5e7eb;
    margin-bottom: 20px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  }
  .inv-modal-actions {
    display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;
  }

  /* ── Mobile breakpoint ── */
  @media (max-width: 640px) {
    .inv-main { padding: 12px 12px; padding-bottom: 100px; }
    .inv-fgrid { grid-template-columns: 1fr; }
    .inv-fg-full { grid-column: 1; }
    .inv-img-wrap { width: 72px; height: 72px; }
    .inv-img-thumb { width: 72px; height: 72px; }
    .inv-img-add { width: 72px; height: 72px; }
    .inv-submit-bar { margin: 16px -12px -100px; }
    .inv-items-table-wrap { display: none; }
    .inv-items-cards { display: block; }
    .inv-batch-header { gap: 8px; }
  }
`

const printCSS = `
  @page {
    size: 58mm auto;
    margin: 0;
  }
  @media print {
    body * { visibility: hidden; }
    .print-labels-container {
      display: block !important;
      visibility: visible !important;
      position: fixed; top: 0; left: 0; width: 100%; background: white;
    }
    .print-labels-container * { visibility: visible !important; }
  }
  .print-labels-container {
    display: none;
    position: fixed; top: 0; left: 0; z-index: 99999;
    background: white; width: 100%;
  }
  .print-label {
    width: 58mm;
    min-height: 32mm;
    padding: 3mm 4mm 3mm;
    font-family: 'Courier New', Courier, monospace;
    color: #000;
    background: white;
    display: flex; flex-direction: column; justify-content: flex-start; gap: 1.5mm;
    page-break-after: always;
    break-after: page;
    page-break-inside: avoid;
    break-inside: avoid;
    border-bottom: 1px dashed #ccc;
  }
  .pl-barcode {
    font-size: 12pt; font-weight: 900; letter-spacing: 1.5px;
    text-align: center;
    border-bottom: 1.5px solid #000;
    padding-bottom: 2mm; margin-bottom: 1mm;
    word-break: break-all;
    line-height: 1.2;
  }
  .pl-sku {
    font-size: 7pt; color: #444; font-weight: 600; letter-spacing: 0.5px;
  }
  .pl-title {
    font-size: 8pt; font-weight: 700; line-height: 1.35;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    overflow: hidden;
    font-family: Arial, sans-serif;
  }
  .pl-row {
    font-size: 7.5pt;
    display: flex; align-items: center; justify-content: space-between;
    margin-top: 1mm;
    border-top: 0.5px solid #ddd; padding-top: 1.5mm;
  }
  .pl-bin { font-weight: 700; font-size: 8pt; }
  .pl-price { font-weight: 800; font-size: 8.5pt; text-align: right; }
`

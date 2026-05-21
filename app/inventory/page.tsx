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
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState(INIT_FORM)
  const [imgFiles, setImgFiles] = useState<File[]>([])
  const [imgPreviews, setImgPreviews] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [lastImport, setLastImport] = useState<{ batch: InventoryBatch; items: Item[] } | null>(null)
  const [printItems, setPrintItems] = useState<Item[] | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)
  const [toast, setToast] = useState('')
  const toastTimer = useRef<ReturnType<typeof setTimeout>>()

  function showToast(m: string) {
    setToast(m); clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2800)
  }

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

  async function handleImgChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = Array.from(e.target.files ?? []).filter(f => f.size <= 8 * 1024 * 1024)
    const compressed = await Promise.all(raw.map(f => compressToWebP(f)))
    const merged = [...imgFiles, ...compressed].slice(0, 8)
    setImgFiles(merged); setImgPreviews(merged.map(f => URL.createObjectURL(f)))
    if (fileRef.current) fileRef.current.value = ''
  }

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
      showToast(`Đã nhập ${qty} sản phẩm · Lô ${data.batch.batch_code}`)
    } catch { showToast('Lỗi kết nối server') }
    finally { setSubmitting(false) }
  }

  function startPrint(items: Item[]) {
    setPrintItems(items)
    setTimeout(() => { window.print(); setPrintItems(null) }, 400)
  }

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
              <div className="pl-sku">{item.sku ? `SKU: ${item.sku}` : ''}</div>
              <div className="pl-title">{item.title}</div>
              <div className="pl-row">
                {item.bin_location && <span>📦 {item.bin_location}</span>}
                <span style={{ marginLeft: 8 }}>{fmtVND(item.price)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <header style={S.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="/" style={{ color: '#4ade80', fontWeight: 700, textDecoration: 'none', fontSize: 16 }}>
            leviethoang.shop
          </a>
          <span style={{ color: '#555' }}>/</span>
          <span style={{ fontWeight: 600, color: '#e5e7eb' }}>Quản lý kho</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={view === 'batches' ? S.tabActive : S.tab} onClick={() => { setView('batches'); setLastImport(null) }}>
            📋 Lô hàng
          </button>
          <button style={view === 'import' ? S.tabActive : S.tab} onClick={() => { setView('import'); setLastImport(null) }}>
            + Nhập hàng
          </button>
        </div>
      </header>

      <main style={S.main}>

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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── IMPORT VIEW ── */}
        {view === 'import' && (
          <div style={S.importWrap}>
            <div style={S.sectionTitle}>Nhập hàng mới</div>

            <div style={S.card}>
              <div style={S.cardTitle}>📦 Thông tin lô hàng</div>
              <div style={S.fgrid}>
                <div style={S.fg}>
                  <div style={S.lbl}>Nhà cung cấp / Nguồn hàng</div>
                  <input style={S.inp} placeholder="VD: Nguồn Nhật, chợ đồ cũ..." value={form.supplier} onChange={e => f('supplier', e.target.value)} />
                </div>
                <div style={S.fg}>
                  <div style={S.lbl}>Người nhập hàng</div>
                  <select style={S.inp} value={form.staff_id} onChange={e => f('staff_id', e.target.value)}>
                    <option value="">— Chọn —</option>
                    {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div style={{ ...S.fg, gridColumn: '1 / -1' }}>
                  <div style={S.lbl}>Ghi chú lô hàng</div>
                  <input style={S.inp} placeholder="Ghi chú nội bộ (không hiển thị cho khách)..."
                    value={form.notes} onChange={e => f('notes', e.target.value)} />
                </div>
              </div>
            </div>

            <div style={S.card}>
              <div style={S.cardTitle}>🏷️ Thông tin sản phẩm</div>

              {/* Image upload */}
              <div style={{ marginBottom: 16 }}>
                <div style={S.lbl}>Ảnh sản phẩm ({imgPreviews.length}/8)</div>
                <div style={S.imgGrid}>
                  {imgPreviews.map((src, i) => (
                    <div key={i} style={S.imgThumbWrap}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" style={S.imgThumb} />
                      <button style={S.imgRemove} onClick={() => removeImg(i)}>✕</button>
                    </div>
                  ))}
                  {imgPreviews.length < 8 && (
                    <label style={S.imgAdd}>
                      <span style={{ fontSize: 24, color: '#666' }}>+</span>
                      <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleImgChange} style={{ display: 'none' }} />
                    </label>
                  )}
                </div>
              </div>

              <div style={S.fgrid}>
                <div style={{ ...S.fg, gridColumn: '1 / -1' }}>
                  <div style={S.lbl}>Tên sản phẩm <span style={{ color: '#f87171' }}>*</span></div>
                  <input style={S.inp} placeholder="VD: Xe mô hình Tomica Honda Civic..." value={form.title} onChange={e => f('title', e.target.value)} />
                </div>
                <div style={S.fg}>
                  <div style={S.lbl}>SKU <span style={{ color: '#888', fontWeight: 400 }}>(mã phân loại chung)</span></div>
                  <input style={S.inp} placeholder="VD: TOMICA-001, LEGO-CITY-42..." value={form.sku} onChange={e => f('sku', e.target.value.toUpperCase())} />
                </div>
                <div style={S.fg}>
                  <div style={S.lbl}>Danh mục</div>
                  <input style={S.inp} placeholder="VD: Đồ chơi, Điện tử, Thời trang..." value={form.category} onChange={e => f('category', e.target.value)} />
                </div>
                <div style={{ ...S.fg, gridColumn: '1 / -1' }}>
                  <div style={S.lbl}>Mô tả</div>
                  <input style={S.inp} placeholder="Mô tả chi tiết sản phẩm..." value={form.description} onChange={e => f('description', e.target.value)} />
                </div>
                <div style={S.fg}>
                  <div style={S.lbl}>Tình trạng</div>
                  <select style={S.inp} value={form.condition} onChange={e => f('condition', e.target.value)}>
                    {['Mới', 'Cũ - Như mới', 'Cũ - Còn tốt', 'Cũ - Có lỗi nhỏ'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div style={S.fg}>
                  <div style={S.lbl}>Giá nhập (VNĐ)</div>
                  <input style={S.inp} type="number" min="0" step="1000" placeholder="0 (giá mua vào, ẩn với khách)" value={form.cost_price} onChange={e => f('cost_price', e.target.value)} />
                  {form.cost_price && <div style={S.pricePreview}>{fmtVND(Number(form.cost_price))}</div>}
                </div>
                <div style={S.fg}>
                  <div style={S.lbl}>Giá bán (VNĐ)</div>
                  <input style={S.inp} type="number" min="0" step="1000" placeholder="0" value={form.price} onChange={e => f('price', e.target.value)} />
                  {form.price && <div style={S.pricePreview}>{fmtVND(Number(form.price))}</div>}
                </div>
                <div style={S.fg}>
                  <div style={S.lbl}>Vị trí lưu kho (thùng)</div>
                  <input style={S.inp} placeholder="VD: A1, Kệ B Hàng 3, Thùng Xanh..." value={form.bin_location} onChange={e => f('bin_location', e.target.value)} />
                </div>
                <div style={S.fg}>
                  <div style={S.lbl}>Số lượng nhập</div>
                  <input style={S.inp} type="number" min="1" max="200" value={form.quantity}
                    onChange={e => f('quantity', e.target.value)} />
                  <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                    Tạo {Math.max(1, parseInt(form.quantity) || 1)} mã sản phẩm riêng biệt
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button style={S.btnGhost} onClick={() => setView('batches')}>← Quay lại</button>
              <button style={{ ...S.btnGreen, flex: 1 }} onClick={submitImport} disabled={submitting}>
                {submitting ? 'Đang nhập...' : `📥 Nhập ${Math.max(1, parseInt(form.quantity) || 1)} sản phẩm →`}
              </button>
            </div>

            {/* Results after successful import */}
            {lastImport && (
              <div style={S.importResult}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <span style={{ color: '#4ade80', fontWeight: 700, fontSize: 16 }}>✓ Nhập thành công!</span>
                    <code style={{ ...S.batchCode, marginLeft: 12 }}>{lastImport.batch.batch_code}</code>
                  </div>
                  <button style={S.btnPrint} onClick={() => startPrint(lastImport.items)}>
                    🖨️ In nhãn tất cả ({lastImport.items.length})
                  </button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Mã sản phẩm</th>
                        <th style={S.th}>SKU</th>
                        <th style={S.th}>Tên sản phẩm</th>
                        <th style={S.th}>Thùng</th>
                        <th style={S.th}>Giá bán</th>
                        <th style={S.th}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lastImport.items.map(item => (
                        <tr key={item.id} style={S.tr}>
                          <td style={S.td}><code style={S.code}>{item.order_code}</code></td>
                          <td style={S.td}>{item.sku ?? '—'}</td>
                          <td style={S.td}>{item.title}</td>
                          <td style={S.td}>{item.bin_location ?? '—'}</td>
                          <td style={S.td}>{fmtVND(item.price)}</td>
                          <td style={S.td}>
                            <button style={S.btnPrintSm} onClick={() => startPrint([item])}>🖨️</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── BATCH ITEMS VIEW ── */}
        {view === 'batch-items' && selectedBatch && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <button style={S.btnGhost} onClick={() => { setView('batches'); setSelectedBatch(null) }}>← Lô hàng</button>
              <code style={S.batchCode}>{selectedBatch.batch_code}</code>
              <span style={{ color: '#888' }}>{selectedBatch.item_count ?? selectedBatch.items?.length ?? 0} sản phẩm</span>
              {selectedBatch.items && selectedBatch.items.length > 0 && (
                <button style={{ ...S.btnPrint, marginLeft: 'auto' }} onClick={() => startPrint(selectedBatch.items!)}>
                  🖨️ In nhãn tất cả
                </button>
              )}
            </div>

            {selectedBatch.supplier && (
              <div style={{ color: '#888', fontSize: 13, marginBottom: 4 }}>NCC: {selectedBatch.supplier}</div>
            )}
            {selectedBatch.notes && (
              <div style={{ color: '#888', fontSize: 13, marginBottom: 4, fontStyle: 'italic' }}>{selectedBatch.notes}</div>
            )}
            {selectedBatch.created_by && (
              <div style={{ color: '#888', fontSize: 13, marginBottom: 12 }}>Nhập bởi: {selectedBatch.created_by} · {fmtDate(selectedBatch.created_at)}</div>
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

                <div style={{ overflowX: 'auto' }}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Ảnh</th>
                        <th style={S.th}>Mã sản phẩm</th>
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
                          <tr key={item.id} style={{
                            ...S.tr,
                            opacity: item.status === 'sold' ? 0.5 : 1,
                          }}>
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
                            </td>
                            <td style={S.td}>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button style={S.btnPrintSm} onClick={() => startPrint([item])} title="In nhãn">🖨️</button>
                                <a href={`/item/${item.id}`} style={{ ...S.btnPrintSm, textDecoration: 'none' }} target="_blank">👁️</a>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </main>

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
  header:  { background: '#1a1d27', borderBottom: '1px solid #2a2d3a', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 },
  main:    { maxWidth: 1100, margin: '0 auto', padding: '24px 20px' },
  tab:     { background: 'transparent', border: '1px solid #2a2d3a', color: '#9ca3af', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13 },
  tabActive:{ background: '#1e3a2a', border: '1px solid #4ade80', color: '#4ade80', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: '#e5e7eb', marginBottom: 20, display: 'flex', alignItems: 'center' },
  card:    { background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 12, padding: 20, marginBottom: 16 },
  cardTitle: { fontSize: 13, fontWeight: 700, color: '#9ca3af', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
  fgrid:   { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 },
  fg:      { display: 'flex', flexDirection: 'column' },
  lbl:     { fontSize: 12, fontWeight: 600, color: '#9ca3af', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  inp:     { background: '#0f1117', border: '1px solid #2a2d3a', borderRadius: 8, padding: '9px 12px', color: '#e5e7eb', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' },
  pricePreview: { fontSize: 12, color: '#4ade80', marginTop: 4 },
  imgGrid: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  imgThumbWrap: { position: 'relative', width: 80, height: 80 },
  imgThumb: { width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid #2a2d3a' },
  imgRemove: { position: 'absolute', top: -6, right: -6, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 },
  imgAdd:  { width: 80, height: 80, border: '2px dashed #2a2d3a', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
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
  importWrap: { maxWidth: 680, margin: '0 auto' },
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
  skuSummary:   { background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 8, padding: 12, marginBottom: 16 },
  skuChip:      { background: '#0f1117', border: '1px solid #2a2d3a', borderRadius: 8, padding: '4px 12px', fontSize: 13 },
}

const pageCSS = `
  * { box-sizing: border-box; }
  input:focus, select:focus, textarea:focus { outline: none; border-color: #4ade80 !important; }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
  @media (max-width: 600px) {
    .inv-fgrid { grid-template-columns: 1fr !important; }
  }
`

const printCSS = `
  @media print {
    body > * { display: none !important; }
    .print-labels-container { display: flex !important; flex-wrap: wrap; gap: 0; }
  }
  .print-labels-container {
    display: none;
    position: fixed; top: 0; left: 0; z-index: 99999;
    background: white; width: 100%;
  }
  .print-label {
    width: 90mm; height: 50mm;
    border: 1.5px dashed #999;
    padding: 8px 10px;
    font-family: monospace;
    color: #000;
    display: flex; flex-direction: column; justify-content: center;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .pl-barcode {
    font-size: 18px; font-weight: 800; letter-spacing: 2px;
    text-align: center; border-bottom: 2px solid #000;
    padding-bottom: 4px; margin-bottom: 4px;
  }
  .pl-sku { font-size: 11px; color: #555; margin-bottom: 2px; }
  .pl-title { font-size: 12px; font-weight: 600; margin-bottom: 4px; line-height: 1.3; }
  .pl-row { font-size: 11px; display: flex; align-items: center; }
`

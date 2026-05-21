'use client'
import { useState, useEffect, useCallback } from 'react'
import type { Item } from '@/lib/supabase'
import { useAuth } from '@/app/components/AuthContext'

const BANK_ID = process.env.NEXT_PUBLIC_BANK_ID ?? 'MB'
const BANK_ACCOUNT = process.env.NEXT_PUBLIC_BANK_ACCOUNT ?? ''
const BANK_ACCOUNT_NAME = process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME ?? ''
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://leviethoang.shop'
const FB_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID ?? ''

function fmtVND(v: number | null | undefined) {
  if (!v) return 'Thương lượng'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v)
}
function getImages(item: Item): string[] {
  if (item.images && item.images.length > 0) return item.images
  if (item.image_url) return [item.image_url]
  return []
}

type Step = 'browse' | 'form' | 'success'

export default function OrderClient() {
  const { user, login, logout } = useAuth()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [step, setStep] = useState<Step>('browse')
  const [submitting, setSubmitting] = useState(false)
  const [orderNumber, setOrderNumber] = useState('')

  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_address: '',
    customer_note: '',
    payment_method: 'cod' as 'cod' | 'bank_transfer',
  })

  // Pre-fill name from Facebook profile
  useEffect(() => {
    if (user && !form.customer_name) {
      setForm(f => ({ ...f, customer_name: user.name }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => {
    fetch('/api/items')
      .then(r => r.json())
      .then(d => setItems(Array.isArray(d) ? d.filter((i: Item) => i.type === 'ban' && i.status === 'available') : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = items.filter(i => {
    const q = search.trim().toLowerCase()
    return !q || i.title.toLowerCase().includes(q) || (i.order_code ?? '').toLowerCase().includes(q)
  })

  function selectItem(item: Item) {
    setSelectedItem(item)
    setStep('form')
    window.scrollTo(0, 0)
  }

  function goBack() {
    setStep('browse')
    setSelectedItem(null)
    setForm({ customer_name: '', customer_phone: '', customer_address: '', customer_note: '', payment_method: 'cod' })
  }

  async function submitOrder() {
    if (!form.customer_name.trim()) { alert('Vui lòng nhập họ tên'); return }
    if (!form.customer_phone.trim()) { alert('Vui lòng nhập số điện thoại'); return }
    if (!form.customer_address.trim()) { alert('Vui lòng nhập địa chỉ'); return }
    setSubmitting(true)
    try {
      const payload = {
        item_id: selectedItem?.id ?? null,
        item_title: selectedItem?.title ?? null,
        item_price: selectedItem?.price ?? null,
        total_amount: selectedItem?.price ?? null,
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        customer_address: form.customer_address,
        customer_note: form.customer_note,
        shipping_carrier: 'spx',
        payment_method: form.payment_method,
        created_by: 'customer',
      }
      const r = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!r.ok) { alert('Đặt hàng thất bại. Vui lòng thử lại.'); return }
      const data = await r.json()
      setOrderNumber(data.order_number)
      setStep('success')
      window.scrollTo(0, 0)
    } catch {
      alert('Không thể kết nối server. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  const qrUrl = useCallback((amount: number | null, info: string) => {
    if (!BANK_ACCOUNT) return ''
    const params = new URLSearchParams()
    if (amount) params.set('amount', String(amount))
    params.set('addInfo', info)
    if (BANK_ACCOUNT_NAME) params.set('accountName', BANK_ACCOUNT_NAME)
    return `https://img.vietqr.io/image/${BANK_ID}-${BANK_ACCOUNT}-compact2.png?${params.toString()}`
  }, [])

  return (
    <>
      <style>{css}</style>
      <div className="ord-page">
        {/* Header */}
        <header className="ord-header">
          <a href="/" className="ord-logo">leviethoang<span>.shop</span></a>
          <div className="ord-header-right">
            {user ? (
              <>
                <a href="/my-orders" className="ord-back-link ord-my-orders-link">📦 Đơn hàng của tôi</a>
                <div className="ord-user-pill">
                  {user.picture && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.picture} alt={user.name} className="ord-avatar" />
                  )}
                  <span className="ord-user-name-sm">{user.name.split(' ').pop()}</span>
                  <button className="ord-logout-sm" onClick={logout}>×</button>
                </div>
              </>
            ) : FB_APP_ID ? (
              <button className="ord-fb-login-btn" onClick={login}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Đăng nhập
              </button>
            ) : null}
            <a href="/" className="ord-back-link">← Trang chủ</a>
          </div>
        </header>

        <main className="ord-main">
          {/* BROWSE STEP */}
          {step === 'browse' && (
            <div>
              <div className="ord-hero">
                <h1 className="ord-title">Đặt hàng</h1>
                <p className="ord-subtitle">Chọn sản phẩm bạn muốn mua và điền thông tin giao hàng.</p>
              </div>

              <div className="ord-search-wrap">
                <input className="ord-search" placeholder="Tìm sản phẩm..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>

              {loading ? (
                <div className="ord-loading"><div className="ord-spinner" /></div>
              ) : filtered.length === 0 ? (
                <div className="ord-empty">Không có sản phẩm nào.</div>
              ) : (
                <div className="ord-grid">
                  {filtered.map(item => {
                    const imgs = getImages(item)
                    return (
                      <div key={item.id} className="ord-card">
                        {imgs.length > 0 && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imgs[0]} alt={item.title} className="ord-card-img" />
                        )}
                        <div className="ord-card-body">
                          <div className="ord-card-title">{item.title}</div>
                          {item.description && <div className="ord-card-desc">{item.description}</div>}
                          <div className="ord-card-price">{fmtVND(item.price)}</div>
                          <button className="ord-btn-primary" onClick={() => selectItem(item)}>
                            Đặt hàng
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* FORM STEP */}
          {step === 'form' && (
            <div className="ord-form-wrap">
              <button className="ord-back-btn" onClick={goBack}>← Quay lại</button>
              <h2 className="ord-form-title">Thông tin đặt hàng</h2>

              {selectedItem && (
                <div className="ord-selected-product">
                  <div className="ord-sp-label">Sản phẩm đặt mua</div>
                  <div className="ord-sp-info">
                    <div className="ord-sp-name">{selectedItem.title}</div>
                    <div className="ord-sp-price">{fmtVND(selectedItem.price)}</div>
                  </div>
                </div>
              )}

              <div className="ord-form">
                <div className="ord-section-title">Thông tin giao hàng</div>

                <div className="ord-field">
                  <label className="ord-label">Họ và tên <span className="ord-required">*</span></label>
                  <input className="ord-input" placeholder="Nguyễn Văn A" value={form.customer_name}
                    onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} />
                </div>
                <div className="ord-field">
                  <label className="ord-label">Số điện thoại <span className="ord-required">*</span></label>
                  <input className="ord-input" placeholder="09xxxxxxxx" type="tel" value={form.customer_phone}
                    onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))} />
                </div>
                <div className="ord-field">
                  <label className="ord-label">Địa chỉ nhận hàng <span className="ord-required">*</span></label>
                  <input className="ord-input" placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" value={form.customer_address}
                    onChange={e => setForm(f => ({ ...f, customer_address: e.target.value }))} />
                </div>
                <div className="ord-field">
                  <label className="ord-label">Ghi chú</label>
                  <textarea className="ord-input ord-textarea" placeholder="Ghi chú thêm (nếu có)..." value={form.customer_note}
                    onChange={e => setForm(f => ({ ...f, customer_note: e.target.value }))} />
                </div>

                <div className="ord-section-title" style={{ marginTop: 24 }}>Phương thức thanh toán</div>
                <div className="ord-payment-options">
                  <label className={`ord-payment-opt${form.payment_method === 'cod' ? ' active' : ''}`}>
                    <input type="radio" name="payment" value="cod" checked={form.payment_method === 'cod'}
                      onChange={() => setForm(f => ({ ...f, payment_method: 'cod' }))} />
                    <div>
                      <div className="ord-popt-title">Thanh toán khi nhận hàng (COD)</div>
                      <div className="ord-popt-desc">Thanh toán bằng tiền mặt khi nhận được hàng</div>
                    </div>
                  </label>
                  <label className={`ord-payment-opt${form.payment_method === 'bank_transfer' ? ' active' : ''}`}>
                    <input type="radio" name="payment" value="bank_transfer" checked={form.payment_method === 'bank_transfer'}
                      onChange={() => setForm(f => ({ ...f, payment_method: 'bank_transfer' }))} />
                    <div>
                      <div className="ord-popt-title">Chuyển khoản ngân hàng</div>
                      <div className="ord-popt-desc">Thanh toán trước qua chuyển khoản</div>
                    </div>
                  </label>
                </div>

                {form.payment_method === 'bank_transfer' && BANK_ACCOUNT && (
                  <div className="ord-qr-wrap">
                    <div className="ord-qr-title">Quét mã QR để thanh toán</div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrUrl(selectedItem?.price ?? null, `Dat hang ${selectedItem?.title ?? ''}`)}
                      alt="QR thanh toán"
                      className="ord-qr-img"
                    />
                    <div className="ord-bank-info">
                      <div><span className="ord-bank-label">Ngân hàng:</span> {BANK_ID}</div>
                      <div><span className="ord-bank-label">Số tài khoản:</span> <strong>{BANK_ACCOUNT}</strong></div>
                      {BANK_ACCOUNT_NAME && <div><span className="ord-bank-label">Chủ tài khoản:</span> {BANK_ACCOUNT_NAME}</div>}
                      {selectedItem?.price && <div><span className="ord-bank-label">Số tiền:</span> <strong className="ord-bank-amount">{fmtVND(selectedItem.price)}</strong></div>}
                    </div>
                    <div className="ord-qr-note">Sau khi chuyển khoản, đơn hàng sẽ được xác nhận thủ công trong vòng 30 phút.</div>
                  </div>
                )}

                <button className="ord-btn-submit" onClick={submitOrder} disabled={submitting}>
                  {submitting ? 'Đang đặt hàng...' : 'Xác nhận đặt hàng →'}
                </button>
              </div>
            </div>
          )}

          {/* SUCCESS STEP */}
          {step === 'success' && (
            <div className="ord-success">
              <div className="ord-success-icon">✓</div>
              <h2 className="ord-success-title">Đặt hàng thành công!</h2>
              <p className="ord-success-sub">Cảm ơn bạn đã đặt hàng tại leviethoang.shop</p>
              <div className="ord-success-order">
                <div className="ord-success-label">Mã đơn hàng của bạn</div>
                <div className="ord-success-number">{orderNumber}</div>
              </div>
              {form.payment_method === 'bank_transfer' && (
                <div className="ord-success-note">
                  Vui lòng chuyển khoản để xác nhận đơn hàng. Chúng tôi sẽ liên hệ lại với bạn sớm nhất.
                </div>
              )}
              {form.payment_method === 'cod' && (
                <div className="ord-success-note">
                  Chúng tôi sẽ liên hệ xác nhận và sắp xếp giao hàng trong thời gian sớm nhất.
                </div>
              )}
              <div className="ord-success-actions">
                <a href="/my-orders" className="ord-btn-secondary" style={{ textDecoration: 'none', display: 'inline-block' }}>
                  Xem đơn hàng của tôi
                </a>
                <a href="/" className="ord-btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
                  Tiếp tục mua sắm
                </a>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  )
}

const css = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Be Vietnam Pro',sans-serif;background:#f9f8f6;color:#1a1916;font-size:14px;line-height:1.6}
.ord-page{min-height:100vh}
.ord-header{display:flex;align-items:center;justify-content:space-between;padding:14px 32px;background:#fff;border-bottom:1px solid #e8e6e1;position:sticky;top:0;z-index:100}
.ord-logo{font-size:16px;font-weight:600;color:#1a1916;text-decoration:none}
.ord-logo span{color:#8c8982;font-weight:300}
.ord-back-link{font-size:13px;color:#8c8982;text-decoration:none}
.ord-back-link:hover{color:#1a1916}
.ord-main{max-width:960px;margin:0 auto;padding:32px 20px}
.ord-hero{text-align:center;margin-bottom:28px}
.ord-title{font-size:28px;font-weight:700;margin-bottom:8px}
.ord-subtitle{font-size:15px;color:#8c8982}
.ord-search-wrap{max-width:440px;margin:0 auto 24px}
.ord-search{width:100%;padding:10px 14px;font-size:14px;font-family:inherit;border:1px solid #e8e6e1;border-radius:8px;outline:none;background:#fff}
.ord-search:focus{border-color:#1a1916}
.ord-loading{display:flex;justify-content:center;padding:60px 0}
.ord-spinner{width:28px;height:28px;border:3px solid #e8e6e1;border-top-color:#1a1916;border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.ord-empty{text-align:center;color:#8c8982;padding:60px 0;font-size:15px}
.ord-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px}
.ord-card{background:#fff;border:1px solid #e8e6e1;border-radius:10px;overflow:hidden;transition:all .15s}
.ord-card:hover{border-color:#bbb8b0;box-shadow:0 4px 16px rgba(0,0,0,.07);transform:translateY(-2px)}
.ord-card-img{width:100%;height:200px;object-fit:cover;display:block}
.ord-card-body{padding:14px}
.ord-card-title{font-size:13px;font-weight:600;margin-bottom:4px;line-height:1.4}
.ord-card-desc{font-size:12px;color:#8c8982;margin-bottom:8px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.ord-card-price{font-size:15px;font-weight:700;color:#2a7a4b;margin-bottom:12px}
.ord-btn-primary{background:#1a1916;color:#fff;border:none;padding:8px 16px;border-radius:7px;font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;width:100%;transition:opacity .15s}
.ord-btn-primary:hover{opacity:.85}
.ord-form-wrap{max-width:540px;margin:0 auto}
.ord-back-btn{background:none;border:none;cursor:pointer;font-family:inherit;font-size:13px;color:#8c8982;padding:0;margin-bottom:20px;display:flex;align-items:center;gap:4px}
.ord-back-btn:hover{color:#1a1916}
.ord-form-title{font-size:22px;font-weight:700;margin-bottom:20px}
.ord-selected-product{background:#f0efe9;border-radius:10px;padding:14px 16px;margin-bottom:24px}
.ord-sp-label{font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#8c8982;margin-bottom:6px}
.ord-sp-info{display:flex;align-items:center;justify-content:space-between;gap:12px}
.ord-sp-name{font-size:14px;font-weight:600;flex:1}
.ord-sp-price{font-size:15px;font-weight:700;color:#2a7a4b;white-space:nowrap}
.ord-form{display:flex;flex-direction:column;gap:14px}
.ord-section-title{font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#8c8982}
.ord-field{display:flex;flex-direction:column;gap:4px}
.ord-label{font-size:12px;font-weight:500;color:#5c5b58}
.ord-required{color:#c0392b}
.ord-input{font-size:14px;font-family:inherit;color:#1a1916;background:#f9f8f6;border:1px solid #e8e6e1;border-radius:7px;padding:9px 12px;outline:none;transition:border-color .15s}
.ord-input:focus{border-color:#1a1916;background:#fff}
.ord-textarea{min-height:72px;resize:vertical}
.ord-payment-options{display:flex;flex-direction:column;gap:8px}
.ord-payment-opt{display:flex;align-items:flex-start;gap:12px;padding:12px 14px;border:1.5px solid #e8e6e1;border-radius:9px;cursor:pointer;transition:all .15s}
.ord-payment-opt:hover{border-color:#bbb8b0}
.ord-payment-opt.active{border-color:#1a1916;background:#f9f8f6}
.ord-payment-opt input[type=radio]{margin-top:3px;accent-color:#1a1916;flex-shrink:0}
.ord-popt-title{font-size:13px;font-weight:600;margin-bottom:2px}
.ord-popt-desc{font-size:12px;color:#8c8982}
.ord-qr-wrap{background:#fff;border:1px solid #e8e6e1;border-radius:10px;padding:20px;text-align:center}
.ord-qr-title{font-size:13px;font-weight:600;margin-bottom:14px}
.ord-qr-img{width:200px;height:200px;margin:0 auto 16px;display:block;border-radius:6px}
.ord-bank-info{text-align:left;background:#f9f8f6;border-radius:8px;padding:12px 14px;font-size:13px;line-height:2;margin-bottom:12px}
.ord-bank-label{color:#8c8982;margin-right:6px}
.ord-bank-amount{color:#2a7a4b}
.ord-qr-note{font-size:12px;color:#8c8982;line-height:1.5}
.ord-btn-submit{background:#1a1916;color:#fff;border:none;padding:12px 24px;border-radius:9px;font-family:inherit;font-size:15px;font-weight:600;cursor:pointer;margin-top:8px;transition:opacity .15s}
.ord-btn-submit:hover{opacity:.85}
.ord-btn-submit:disabled{opacity:.5;cursor:not-allowed}
.ord-success{text-align:center;padding:60px 20px;max-width:480px;margin:0 auto}
.ord-success-icon{width:72px;height:72px;background:#2a7a4b;color:#fff;border-radius:50%;font-size:32px;display:flex;align-items:center;justify-content:center;margin:0 auto 20px}
.ord-success-title{font-size:24px;font-weight:700;margin-bottom:8px}
.ord-success-sub{color:#8c8982;margin-bottom:24px}
.ord-success-order{background:#f0efe9;border-radius:10px;padding:16px 20px;margin-bottom:16px}
.ord-success-label{font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#8c8982;margin-bottom:6px}
.ord-success-number{font-size:22px;font-weight:700;font-family:monospace;color:#1a1916}
.ord-success-note{font-size:13px;color:#8c8982;margin-bottom:24px;line-height:1.6}
.ord-success-actions{display:flex;justify-content:center;gap:12px;flex-wrap:wrap}
.ord-btn-secondary{background:#fff;color:#1a1916;border:1.5px solid #1a1916;padding:8px 18px;border-radius:7px;font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;transition:opacity .15s}
.ord-btn-secondary:hover{opacity:.75}
/* Facebook login in header */
.ord-fb-login-btn{display:inline-flex;align-items:center;gap:7px;background:#1877F2;color:#fff;border:none;padding:6px 14px;border-radius:7px;font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;transition:opacity .15s}
.ord-fb-login-btn:hover{opacity:.9}
.ord-user-pill{display:flex;align-items:center;gap:6px;background:#f0efe9;border-radius:20px;padding:4px 10px 4px 6px}
.ord-avatar{width:24px;height:24px;border-radius:50%;object-fit:cover}
.ord-user-name-sm{font-size:13px;font-weight:500;color:#1a1916}
.ord-logout-sm{background:none;border:none;cursor:pointer;font-size:16px;color:#8c8982;line-height:1;padding:0 0 0 2px}
.ord-logout-sm:hover{color:#1a1916}
.ord-my-orders-link{color:#2563eb !important;font-weight:500}
@media(max-width:600px){
  .ord-header{padding:12px 16px}
  .ord-main{padding:20px 16px}
  .ord-grid{grid-template-columns:repeat(2,1fr)}
}
`

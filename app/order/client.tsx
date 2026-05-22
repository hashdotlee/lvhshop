'use client'
import { useState, useEffect, useCallback } from 'react'
import type { Item, CustomerAddress } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'

const BANK_ID = process.env.NEXT_PUBLIC_BANK_ID ?? 'MB'
const BANK_ACCOUNT = process.env.NEXT_PUBLIC_BANK_ACCOUNT ?? ''
const BANK_ACCOUNT_NAME = process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME ?? ''

function fmtVND(v: number | null | undefined) {
  if (!v) return 'Thương lượng'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v)
}
function getImages(item: Item): string[] {
  if (item.images && item.images.length > 0) return item.images
  if (item.image_url) return [item.image_url]
  return []
}

type Step = 'browse' | 'auth' | 'form' | 'success'

export default function OrderClient() {
  const [supaUser, setSupaUser] = useState<{ email: string; name: string; fb_url: string } | null>(null)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' })
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')

  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<Item[]>([])
  const [step, setStep] = useState<Step>('browse')
  const [submitting, setSubmitting] = useState(false)
  const [orderNumber, setOrderNumber] = useState('')

  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([])
  const [orderAddressId, setOrderAddressId] = useState<number | null>(null)
  const [showNewAddrForm, setShowNewAddrForm] = useState(false)
  const [newAddrForm, setNewAddrForm] = useState({ full_name: '', phone: '', address: '' })
  const [newAddrSaving, setNewAddrSaving] = useState(false)

  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bank_transfer'>('cod')
  const [note, setNote] = useState('')

  const cartTotal = cart.reduce((s, i) => s + (i.price ?? 0), 0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const name = session.user.user_metadata?.full_name ?? session.user.email ?? ''
        setSupaUser({ email: session.user.email ?? '', name, fb_url: session.user.user_metadata?.fb_url ?? '' })
        fetchAddresses(session.access_token)
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const name = session.user.user_metadata?.full_name ?? session.user.email ?? ''
        setSupaUser({ email: session.user.email ?? '', name, fb_url: session.user.user_metadata?.fb_url ?? '' })
        fetchAddresses(session.access_token)
      } else {
        setSupaUser(null)
        setSavedAddresses([])
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function fetchAddresses(jwt?: string) {
    if (!jwt) {
      const { data: { session } } = await supabase.auth.getSession()
      jwt = session?.access_token
    }
    if (!jwt) return
    try {
      const r = await fetch('/api/addresses', { headers: { Authorization: `Bearer ${jwt}` } })
      if (r.ok) {
        const list: CustomerAddress[] = await r.json()
        setSavedAddresses(list)
        const def = list.find(a => a.is_default) ?? list[0]
        if (def) setOrderAddressId(def.id)
      }
    } catch { /* silent */ }
  }

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

  function toggleCart(item: Item) {
    setCart(prev => {
      const exists = prev.find(i => i.id === item.id)
      return exists ? prev.filter(i => i.id !== item.id) : [...prev, item]
    })
  }

  function proceedToCheckout() {
    if (cart.length === 0) return
    if (!supaUser) {
      setStep('auth')
    } else {
      setStep('form')
    }
    window.scrollTo(0, 0)
  }

  function goBackToBrowse() {
    setStep('browse')
    setAuthError('')
    setNote('')
    setPaymentMethod('cod')
    setOrderAddressId(null)
    setShowNewAddrForm(false)
    setNewAddrForm({ full_name: '', phone: '', address: '' })
  }

  async function handleSignIn() {
    setAuthLoading(true); setAuthError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email: authForm.email, password: authForm.password })
    setAuthLoading(false)
    if (error) { setAuthError(error.message); return }
    await fetchAddresses(data.session?.access_token)
    setStep('form')
    window.scrollTo(0, 0)
  }

  async function handleSignUp() {
    if (!authForm.name.trim()) { setAuthError('Vui lòng nhập họ tên'); return }
    setAuthLoading(true); setAuthError('')
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: authForm.email, password: authForm.password,
      options: { data: { full_name: authForm.name } },
    })
    setAuthLoading(false)
    if (error) { setAuthError(error.message); return }
    await fetchAddresses(signUpData.session?.access_token)
    setStep('form')
    window.scrollTo(0, 0)
  }

  async function saveNewAddr() {
    if (!newAddrForm.full_name.trim()) { alert('Nhập họ tên'); return }
    if (!newAddrForm.phone.trim())     { alert('Nhập số điện thoại'); return }
    if (!newAddrForm.address.trim())   { alert('Nhập địa chỉ'); return }
    setNewAddrSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const jwt = session?.access_token
      if (!jwt) { alert('Cần đăng nhập để lưu địa chỉ'); return }
      const r = await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ ...newAddrForm, is_default: savedAddresses.length === 0 }),
      })
      if (!r.ok) { alert('Lưu địa chỉ thất bại'); return }
      const saved = await r.json()
      await fetchAddresses(jwt)
      setOrderAddressId(saved.id)
      setShowNewAddrForm(false)
    } catch { alert('Không thể kết nối server') }
    finally { setNewAddrSaving(false) }
  }

  async function submitOrder() {
    if (!orderAddressId) { alert('Vui lòng chọn địa chỉ giao hàng'); return }
    const addr = savedAddresses.find(a => a.id === orderAddressId)
    if (!addr) { alert('Địa chỉ không hợp lệ'); return }
    if (cart.length === 0) { alert('Giỏ hàng trống'); return }

    const firstItem = cart[0]
    const total = cartTotal || null

    setSubmitting(true)
    try {
      const r = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: firstItem.id,
          item_title: firstItem.title,
          item_price: firstItem.price ?? null,
          total_amount: total,
          customer_name: addr.full_name,
          customer_phone: addr.phone,
          customer_address: addr.address,
          customer_note: note || null,
          shipping_carrier: 'spx',
          payment_method: paymentMethod,
          created_by: 'customer',
          address_id: orderAddressId,
          fb_url: supaUser?.fb_url || null,
        }),
      })
      if (!r.ok) { alert('Đặt hàng thất bại. Vui lòng thử lại.'); return }
      const data = await r.json()
      const orderId = data.id

      // Add all cart items to order_items
      for (const item of cart) {
        await fetch('/api/order-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: orderId, item_id: item.id, item_title: item.title, item_price: item.price ?? null, quantity: 1 }),
        })
      }

      setOrderNumber(data.order_number)
      setCart([])
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
        <header className="ord-header">
          <a href="/" className="ord-logo">leviethoang<span>.shop</span></a>
          <div className="ord-header-right">
            {supaUser ? (
              <div className="ord-user-pill">
                <span className="ord-user-name-sm">{supaUser.name.split(' ').pop()}</span>
                <button className="ord-logout-sm" onClick={() => supabase.auth.signOut()} title="Đăng xuất">×</button>
              </div>
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
                <p className="ord-subtitle">Chọn sản phẩm và đặt hàng — nhanh chóng, tiện lợi.</p>
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
                    const inCart = cart.some(i => i.id === item.id)
                    return (
                      <div key={item.id} className={`ord-card${inCart ? ' ord-card-selected' : ''}`}>
                        {imgs.length > 0 && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imgs[0]} alt={item.title} className="ord-card-img" />
                        )}
                        <div className="ord-card-body">
                          <div className="ord-card-title">{item.title}</div>
                          {item.description && <div className="ord-card-desc">{item.description}</div>}
                          <div className="ord-card-price">{fmtVND(item.price)}</div>
                          <button
                            className={inCart ? 'ord-btn-remove' : 'ord-btn-primary'}
                            onClick={() => toggleCart(item)}>
                            {inCart ? '✓ Đã chọn — Bỏ' : 'Thêm vào giỏ'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Cart summary bar */}
              {cart.length > 0 && (
                <div className="ord-cart-bar">
                  <div className="ord-cart-info">
                    <span className="ord-cart-count">{cart.length} sản phẩm</span>
                    {cartTotal > 0 && <span className="ord-cart-total">{fmtVND(cartTotal)}</span>}
                    <div className="ord-cart-names">{cart.map(i => i.title).join(' · ')}</div>
                  </div>
                  <button className="ord-btn-checkout" onClick={proceedToCheckout}>
                    Tiến hành đặt hàng →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* AUTH STEP */}
          {step === 'auth' && cart.length > 0 && (
            <div className="ord-auth-wrap">
              <button className="ord-back-btn" onClick={goBackToBrowse}>← Quay lại</button>
              <div className="ord-selected-product" style={{ marginBottom: 28 }}>
                <div className="ord-sp-label">{cart.length} sản phẩm đã chọn</div>
                {cart.map(item => {
                  const imgs = getImages(item)
                  return (
                    <div key={item.id} className="ord-sp-info" style={{ marginTop: 8 }}>
                      {imgs.length > 0 && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={imgs[0]} alt={item.title} className="ord-sp-thumb" />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="ord-sp-name">{item.title}</div>
                        <div className="ord-sp-price">{fmtVND(item.price)}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="ord-auth-box">
                <h2 className="ord-auth-title">Đăng nhập để đặt hàng</h2>
                <div className="ord-auth-tabs">
                  <button className={`ord-auth-tab${authMode === 'login' ? ' active' : ''}`} onClick={() => { setAuthMode('login'); setAuthError('') }}>Đăng nhập</button>
                  <button className={`ord-auth-tab${authMode === 'signup' ? ' active' : ''}`} onClick={() => { setAuthMode('signup'); setAuthError('') }}>Đăng ký</button>
                </div>
                {authMode === 'signup' && (
                  <div className="ord-field">
                    <label className="ord-label">Họ và tên</label>
                    <input className="ord-input" placeholder="Nguyễn Văn A" value={authForm.name}
                      onChange={e => setAuthForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                )}
                <div className="ord-field">
                  <label className="ord-label">Email</label>
                  <input className="ord-input" type="email" placeholder="email@example.com" value={authForm.email}
                    onChange={e => setAuthForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="ord-field">
                  <label className="ord-label">Mật khẩu</label>
                  <input className="ord-input" type="password" placeholder="••••••••" value={authForm.password}
                    onChange={e => setAuthForm(f => ({ ...f, password: e.target.value }))} />
                </div>
                {authError && <div className="ord-auth-error">{authError}</div>}
                <button className="ord-btn-submit" style={{ marginTop: 8 }}
                  onClick={authMode === 'login' ? handleSignIn : handleSignUp} disabled={authLoading}>
                  {authLoading ? 'Đang xử lý...' : authMode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
                </button>
              </div>
            </div>
          )}

          {/* FORM STEP */}
          {step === 'form' && (
            <div className="ord-form-wrap">
              <button className="ord-back-btn" onClick={goBackToBrowse}>← Quay lại</button>
              <h2 className="ord-form-title">Thông tin đặt hàng</h2>

              {/* Cart items summary */}
              <div className="ord-selected-product">
                <div className="ord-sp-label">{cart.length} sản phẩm đặt mua</div>
                {cart.map(item => {
                  const imgs = getImages(item)
                  return (
                    <div key={item.id} className="ord-sp-info" style={{ marginTop: 8 }}>
                      {imgs.length > 0 && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={imgs[0]} alt={item.title} className="ord-sp-thumb" />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="ord-sp-name">{item.title}</div>
                        <div className="ord-sp-price">{fmtVND(item.price)}</div>
                      </div>
                    </div>
                  )
                })}
                {cartTotal > 0 && (
                  <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #d8d6cf', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span>Tổng cộng</span>
                    <span style={{ color: '#2a7a4b' }}>{fmtVND(cartTotal)}</span>
                  </div>
                )}
              </div>

              <div className="ord-form">
                {/* Address section */}
                <div>
                  <div className="ord-section-title" style={{ marginBottom: 10 }}>
                    Địa chỉ giao hàng <span className="ord-required">*</span>
                  </div>

                  {showNewAddrForm || savedAddresses.length === 0 ? (
                    <>
                      <div className="ord-addr-grid">
                        <div className="ord-field">
                          <label className="ord-label">Họ tên <span className="ord-required">*</span></label>
                          <input className="ord-input" placeholder="Nguyễn Văn A" autoFocus
                            value={newAddrForm.full_name} onChange={e => setNewAddrForm(f => ({ ...f, full_name: e.target.value }))} />
                        </div>
                        <div className="ord-field">
                          <label className="ord-label">Số điện thoại <span className="ord-required">*</span></label>
                          <input className="ord-input" placeholder="09xxxxxxxx" type="tel"
                            value={newAddrForm.phone} onChange={e => setNewAddrForm(f => ({ ...f, phone: e.target.value }))} />
                        </div>
                        <div className="ord-field" style={{ gridColumn: '1/-1' }}>
                          <label className="ord-label">Địa chỉ nhận hàng <span className="ord-required">*</span></label>
                          <input className="ord-input" placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
                            value={newAddrForm.address} onChange={e => setNewAddrForm(f => ({ ...f, address: e.target.value }))} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        {savedAddresses.length > 0 && (
                          <button type="button" className="ord-btn-ghost" style={{ flex: 1 }}
                            onClick={() => setShowNewAddrForm(false)}>← Quay lại</button>
                        )}
                        <button type="button" className="ord-btn-dark" style={{ flex: 1 }}
                          onClick={saveNewAddr} disabled={newAddrSaving}>
                          {newAddrSaving ? 'Đang lưu...' : 'Lưu địa chỉ →'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Address cards — click to select */}
                      <div className="ord-addr-list">
                        {savedAddresses.map(a => (
                          <button
                            key={a.id}
                            type="button"
                            className={`ord-addr-card${orderAddressId === a.id ? ' selected' : ''}`}
                            onClick={() => setOrderAddressId(a.id)}>
                            <div className="ord-addr-card-check">{orderAddressId === a.id ? '●' : '○'}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="ord-addr-name">{a.full_name} · {a.phone}{a.is_default ? ' ★' : ''}</div>
                              <div className="ord-addr-text">{a.address}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                      <button type="button" className="ord-btn-ghost" style={{ width: '100%', marginTop: 8 }}
                        onClick={() => { setShowNewAddrForm(true); setNewAddrForm({ full_name: supaUser?.name ?? '', phone: '', address: '' }) }}>
                        + Thêm địa chỉ mới
                      </button>
                    </>
                  )}
                </div>

                {/* Note + payment — shown only when address is selected */}
                {orderAddressId && !showNewAddrForm && (
                  <>
                    <div className="ord-field">
                      <label className="ord-label">Ghi chú</label>
                      <textarea className="ord-input ord-textarea" placeholder="Ghi chú thêm (nếu có)..."
                        value={note} onChange={e => setNote(e.target.value)} />
                    </div>

                    <div className="ord-section-title" style={{ marginTop: 8 }}>Phương thức thanh toán</div>
                    <div className="ord-payment-options">
                      <label className={`ord-payment-opt${paymentMethod === 'cod' ? ' active' : ''}`}>
                        <input type="radio" name="payment" value="cod" checked={paymentMethod === 'cod'}
                          onChange={() => setPaymentMethod('cod')} />
                        <div>
                          <div className="ord-popt-title">Thanh toán khi nhận hàng (COD)</div>
                          <div className="ord-popt-desc">Thanh toán bằng tiền mặt khi nhận được hàng</div>
                        </div>
                      </label>
                      <label className={`ord-payment-opt${paymentMethod === 'bank_transfer' ? ' active' : ''}`}>
                        <input type="radio" name="payment" value="bank_transfer" checked={paymentMethod === 'bank_transfer'}
                          onChange={() => setPaymentMethod('bank_transfer')} />
                        <div>
                          <div className="ord-popt-title">Chuyển khoản ngân hàng</div>
                          <div className="ord-popt-desc">Thanh toán trước qua chuyển khoản</div>
                        </div>
                      </label>
                    </div>

                    {paymentMethod === 'bank_transfer' && BANK_ACCOUNT && (
                      <div className="ord-qr-wrap">
                        <div className="ord-qr-title">Quét mã QR để thanh toán</div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={qrUrl(cartTotal || null, `Dat hang ${cart.map(i => i.title).join(', ')}`)}
                          alt="QR thanh toán" className="ord-qr-img" />
                        <div className="ord-bank-info">
                          <div><span className="ord-bank-label">Ngân hàng:</span> {BANK_ID}</div>
                          <div><span className="ord-bank-label">Số tài khoản:</span> <strong>{BANK_ACCOUNT}</strong></div>
                          {BANK_ACCOUNT_NAME && <div><span className="ord-bank-label">Chủ tài khoản:</span> {BANK_ACCOUNT_NAME}</div>}
                          {cartTotal > 0 && <div><span className="ord-bank-label">Số tiền:</span> <strong className="ord-bank-amount">{fmtVND(cartTotal)}</strong></div>}
                        </div>
                        <div className="ord-qr-note">Sau khi chuyển khoản, đơn hàng sẽ được xác nhận thủ công trong vòng 30 phút.</div>
                      </div>
                    )}

                    <button className="ord-btn-submit" onClick={submitOrder} disabled={submitting}>
                      {submitting ? 'Đang đặt hàng...' : 'Xác nhận đặt hàng →'}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* SUCCESS STEP */}
          {step === 'success' && (
            <div className="ord-success">
              <div className="ord-success-icon">✓</div>
              <h2 className="ord-success-title">Đặt hàng thành công!</h2>
              <p className="ord-success-sub">Cảm ơn {supaUser?.name ? supaUser.name.split(' ').pop() : 'bạn'} đã đặt hàng tại leviethoang.shop</p>

              <div className="ord-success-order">
                <div className="ord-success-label">Mã đơn hàng của bạn</div>
                <div className="ord-success-number">{orderNumber}</div>
              </div>
              {paymentMethod === 'bank_transfer' && (
                <div className="ord-success-note">Vui lòng chuyển khoản để xác nhận đơn hàng. Chúng tôi sẽ liên hệ lại sớm nhất.</div>
              )}
              {paymentMethod === 'cod' && (
                <div className="ord-success-note">Chúng tôi sẽ liên hệ xác nhận và sắp xếp giao hàng trong thời gian sớm nhất.</div>
              )}
              <div className="ord-success-actions">
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
.ord-header-right{display:flex;align-items:center;gap:12px}
.ord-back-link{font-size:13px;color:#8c8982;text-decoration:none;white-space:nowrap}
.ord-back-link:hover{color:#1a1916}
.ord-user-pill{display:flex;align-items:center;gap:6px;background:#f0efe9;border-radius:20px;padding:4px 10px}
.ord-user-name-sm{font-size:13px;font-weight:500;color:#1a1916;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ord-logout-sm{background:none;border:none;cursor:pointer;font-size:18px;color:#8c8982;line-height:1;padding:0 0 0 2px;display:flex;align-items:center}
.ord-logout-sm:hover{color:#1a1916}
.ord-main{max-width:960px;margin:0 auto;padding:32px 20px}
.ord-hero{text-align:center;margin-bottom:24px}
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
.ord-card-selected{border-color:#2a7a4b!important;box-shadow:0 0 0 2px rgba(42,122,75,.15)!important}
.ord-card-img{width:100%;height:200px;object-fit:cover;display:block}
.ord-card-body{padding:14px}
.ord-card-title{font-size:13px;font-weight:600;margin-bottom:4px;line-height:1.4}
.ord-card-desc{font-size:12px;color:#8c8982;margin-bottom:8px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.ord-card-price{font-size:15px;font-weight:700;color:#2a7a4b;margin-bottom:12px}
.ord-btn-primary{background:#1a1916;color:#fff;border:none;padding:8px 16px;border-radius:7px;font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;width:100%;transition:opacity .15s}
.ord-btn-primary:hover{opacity:.85}
.ord-btn-remove{background:#f0fdf4;color:#2a7a4b;border:1.5px solid #2a7a4b;padding:8px 16px;border-radius:7px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;width:100%;transition:all .15s}
.ord-btn-remove:hover{background:#dcfce7}
.ord-auth-wrap{max-width:480px;margin:0 auto}
.ord-auth-box{background:#fff;border:1px solid #e8e6e1;border-radius:14px;padding:28px;display:flex;flex-direction:column;gap:14px}
.ord-auth-title{font-size:18px;font-weight:700;margin:0}
.ord-auth-tabs{display:flex;gap:0;border:1px solid #e8e6e1;border-radius:8px;overflow:hidden}
.ord-auth-tab{flex:1;background:none;border:none;padding:8px;font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;color:#8c8982;transition:all .15s}
.ord-auth-tab.active{background:#1a1916;color:#fff}
.ord-auth-error{font-size:13px;color:#c0392b;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:8px 12px}
.ord-back-btn{background:none;border:none;cursor:pointer;font-family:inherit;font-size:13px;color:#8c8982;padding:0;margin-bottom:20px;display:flex;align-items:center;gap:4px}
.ord-back-btn:hover{color:#1a1916}
.ord-selected-product{background:#f0efe9;border-radius:10px;padding:14px 16px;margin-bottom:24px}
.ord-sp-label{font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#8c8982;margin-bottom:8px}
.ord-sp-info{display:flex;align-items:center;gap:12px}
.ord-sp-thumb{width:56px;height:56px;object-fit:cover;border-radius:8px;flex-shrink:0}
.ord-sp-name{font-size:14px;font-weight:600;margin-bottom:3px}
.ord-sp-price{font-size:15px;font-weight:700;color:#2a7a4b}
.ord-form-wrap{max-width:540px;margin:0 auto}
.ord-form-title{font-size:22px;font-weight:700;margin-bottom:20px}
.ord-form{display:flex;flex-direction:column;gap:16px}
.ord-section-title{font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#8c8982}
.ord-addr-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.ord-addr-list{display:flex;flex-direction:column;gap:8px}
.ord-addr-card{display:flex;align-items:flex-start;gap:10px;width:100%;background:#fff;border:1.5px solid #e8e6e1;border-radius:9px;padding:11px 14px;cursor:pointer;text-align:left;font-family:inherit;transition:all .15s}
.ord-addr-card:hover{border-color:#bbb8b0}
.ord-addr-card.selected{border-color:#1a1916;background:#f9f8f6}
.ord-addr-card-check{font-size:16px;color:#8c8982;flex-shrink:0;margin-top:1px}
.ord-addr-card.selected .ord-addr-card-check{color:#1a1916}
.ord-addr-name{font-size:13px;font-weight:600;color:#1a1916;margin-bottom:2px}
.ord-addr-text{font-size:12px;color:#5c5b58}
.ord-field{display:flex;flex-direction:column;gap:4px}
.ord-label{font-size:12px;font-weight:500;color:#5c5b58}
.ord-required{color:#c0392b}
.ord-input{font-size:14px;font-family:inherit;color:#1a1916;background:#f9f8f6;border:1px solid #e8e6e1;border-radius:7px;padding:9px 12px;outline:none;transition:border-color .15s;width:100%}
.ord-input:focus{border-color:#1a1916;background:#fff}
.ord-textarea{min-height:72px;resize:vertical}
.ord-btn-dark{background:#1a1916;color:#fff;border:none;padding:9px 16px;border-radius:7px;font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;transition:opacity .15s}
.ord-btn-dark:hover{opacity:.85}
.ord-btn-dark:disabled{opacity:.5;cursor:not-allowed}
.ord-btn-ghost{background:none;border:1px solid #e8e6e1;padding:9px 16px;border-radius:7px;font-family:inherit;font-size:13px;cursor:pointer;color:#5c5b58;transition:all .15s}
.ord-btn-ghost:hover{border-color:#1a1916;color:#1a1916}
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
.ord-cart-bar{position:sticky;bottom:0;z-index:50;margin-top:24px;background:#1a1916;color:#fff;border-radius:14px;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;gap:12px;box-shadow:0 4px 24px rgba(0,0,0,.2);flex-wrap:wrap}
.ord-cart-info{display:flex;flex-direction:column;gap:2px;min-width:0}
.ord-cart-count{font-size:12px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:rgba(255,255,255,.7)}
.ord-cart-total{font-size:18px;font-weight:800;color:#fff}
.ord-cart-names{font-size:11px;color:rgba(255,255,255,.55);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:300px}
.ord-btn-checkout{background:#fff;color:#1a1916;border:none;padding:10px 20px;border-radius:9px;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;white-space:nowrap;transition:opacity .15s;flex-shrink:0}
.ord-btn-checkout:hover{opacity:.9}
.ord-btn-submit{background:#1a1916;color:#fff;border:none;padding:12px 24px;border-radius:9px;font-family:inherit;font-size:15px;font-weight:600;cursor:pointer;margin-top:8px;transition:opacity .15s;width:100%}
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
@media(max-width:600px){
  .ord-header{padding:12px 16px}
  .ord-main{padding:20px 16px}
  .ord-grid{grid-template-columns:repeat(2,1fr)}
  .ord-auth-box{padding:20px 16px}
  .ord-addr-grid{grid-template-columns:1fr}
}
`

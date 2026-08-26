'use client'
import { useState, useEffect } from 'react'
import type { CustomerAddress } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'

const BANK_ID = process.env.NEXT_PUBLIC_BANK_ID ?? 'MB'
const BANK_ACCOUNT = process.env.NEXT_PUBLIC_BANK_ACCOUNT ?? ''
const BANK_ACCOUNT_NAME = process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME ?? ''

type Step = 'auth' | 'form' | 'success'

export default function OrderClient() {
  const [supaUser, setSupaUser] = useState<{ email: string; name: string; fb_url: string } | null>(null)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' })
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')

  const [step, setStep] = useState<Step>('auth')
  const [submitting, setSubmitting] = useState(false)
  const [orderNumber, setOrderNumber] = useState('')

  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([])
  const [orderAddressId, setOrderAddressId] = useState<number | null>(null)
  const [showNewAddrForm, setShowNewAddrForm] = useState(false)
  const [newAddrForm, setNewAddrForm] = useState({ full_name: '', phone: '', address: '' })
  const [newAddrSaving, setNewAddrSaving] = useState(false)

  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bank_transfer'>('cod')
  const [note, setNote] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        checkUserStatus(session.user, session.access_token)
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        checkUserStatus(session.user, session.access_token)
      } else {
        setSupaUser(null)
        setSavedAddresses([])
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function checkUserStatus(user: any, jwt: string) {
    const { data } = await supabase.from('user_profiles').select('status').eq('id', user.id).single()
    if (data && data.status !== 'approved') {
      await supabase.auth.signOut()
      setAuthError('Tài khoản của bạn đang chờ Admin duyệt.')
      return
    }
    const name = user.user_metadata?.full_name ?? user.email ?? ''
    const email = user.email?.replace('@lvhshop.internal', '') ?? ''
    setSupaUser({ email, name, fb_url: user.user_metadata?.fb_url ?? '' })
    fetchAddresses(jwt)
    setStep('form')
  }

  function parseAuthInput(input: string) {
    const isPhone = /^[0-9\+\s]+$/.test(input)
    if (isPhone) {
      const cleanPhone = input.replace(/\s/g, '')
      return { email: `${cleanPhone}@lvhshop.internal`, phone: cleanPhone }
    }
    return { email: input, phone: null }
  }

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

  async function handleSignIn() {
    if (!authForm.email || !authForm.password) { setAuthError('Nhập email/SĐT và mật khẩu'); return }
    setAuthLoading(true); setAuthError('')
    
    const { email } = parseAuthInput(authForm.email)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: authForm.password })
    
    if (error) {
      setAuthError(error.message === 'Invalid login credentials' ? 'Email/SĐT hoặc mật khẩu không đúng' : error.message)
      setAuthLoading(false)
      return
    }
    
    if (data.session) {
      const { data: profile } = await supabase.from('user_profiles').select('status').eq('id', data.user.id).single()
      if (profile && profile.status !== 'approved') {
        await supabase.auth.signOut()
        setAuthError('Tài khoản của bạn đang chờ Admin duyệt.')
        setAuthLoading(false)
        return
      }
    }
    
    setAuthLoading(false)
    await fetchAddresses(data.session?.access_token)
    setStep('form')
    window.scrollTo(0, 0)
  }

  async function handleSignUp() {
    if (!authForm.name.trim()) { setAuthError('Vui lòng nhập họ tên'); return }
    if (!authForm.email)       { setAuthError('Vui lòng nhập email hoặc SĐT'); return }
    setAuthLoading(true); setAuthError('')
    
    const { email, phone } = parseAuthInput(authForm.email)
    const { data: signUpData, error } = await supabase.auth.signUp({
      email, password: authForm.password,
      options: { data: { full_name: authForm.name, phone } },
    })
    setAuthLoading(false)
    if (error) {
      setAuthError(error.message === 'User already registered' ? 'Email/SĐT này đã được đăng ký' : error.message)
      return
    }
    if (signUpData.user) {
      setAuthError('Đăng ký thành công! Vui lòng chờ Admin duyệt tài khoản.')
      setAuthMode('login')
    }
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

    setSubmitting(true)
    try {
      const r = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: null,
          item_title: null,
          item_price: null,
          total_amount: null,
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
      setOrderNumber(data.order_number)
      setStep('success')
      window.scrollTo(0, 0)
    } catch {
      alert('Không thể kết nối server. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  const qrUrl = BANK_ACCOUNT
    ? `https://img.vietqr.io/image/${BANK_ID}-${BANK_ACCOUNT}-compact2.png?addInfo=Dat+hang&accountName=${encodeURIComponent(BANK_ACCOUNT_NAME)}`
    : ''

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

          {/* AUTH STEP */}
          {step === 'auth' && (
            <div className="ord-auth-wrap">
              <div className="ord-hero">
                <h1 className="ord-title">Đặt hàng</h1>
                <p className="ord-subtitle">Đăng nhập để đặt hàng — nhân viên sẽ liên hệ xác nhận và tư vấn sản phẩm.</p>
              </div>
              <div className="ord-auth-box">
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
                  <label className="ord-label">Email hoặc Số điện thoại</label>
                  <input className="ord-input" placeholder="email@example.com hoặc 09xxxxxxxx" value={authForm.email}
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
              <h2 className="ord-form-title">Đặt hàng</h2>

              <div className="ord-form">
                {/* What they want to buy */}
                <div className="ord-field">
                  <label className="ord-label">Ghi chú đặt hàng</label>
                  <textarea className="ord-input ord-textarea ord-textarea-lg"
                    placeholder="Mô tả sản phẩm, màu sắc, kích thước, số lượng... Nhân viên sẽ liên hệ xác nhận."
                    value={note} onChange={e => setNote(e.target.value)} />
                </div>

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

                {/* Payment — shown only when address is selected */}
                {orderAddressId && !showNewAddrForm && (
                  <>
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
                        <div className="ord-qr-title">Thông tin chuyển khoản</div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={qrUrl} alt="QR thanh toán" className="ord-qr-img" />
                        <div className="ord-bank-info">
                          <div><span className="ord-bank-label">Ngân hàng:</span> {BANK_ID}</div>
                          <div><span className="ord-bank-label">Số tài khoản:</span> <strong>{BANK_ACCOUNT}</strong></div>
                          {BANK_ACCOUNT_NAME && <div><span className="ord-bank-label">Chủ tài khoản:</span> {BANK_ACCOUNT_NAME}</div>}
                        </div>
                        <div className="ord-qr-note">Nhân viên sẽ xác nhận số tiền sau khi tư vấn và xác nhận đơn hàng.</div>
                      </div>
                    )}

                    <button className="ord-btn-submit" onClick={submitOrder} disabled={submitting}>
                      {submitting ? 'Đang đặt hàng...' : 'Gửi yêu cầu đặt hàng →'}
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
              <h2 className="ord-success-title">Đã gửi yêu cầu!</h2>
              <p className="ord-success-sub">Cảm ơn {supaUser?.name ? supaUser.name.split(' ').pop() : 'bạn'} đã đặt hàng tại leviethoang.shop</p>

              <div className="ord-success-order">
                <div className="ord-success-label">Mã đơn hàng của bạn</div>
                <div className="ord-success-number">{orderNumber}</div>
              </div>
              <div className="ord-success-note">
                Nhân viên sẽ liên hệ xác nhận sản phẩm và sắp xếp giao hàng trong thời gian sớm nhất.
              </div>
              <div className="ord-success-actions">
                <a href="/" className="ord-btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
                  Về trang chủ
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
.ord-main{max-width:560px;margin:0 auto;padding:32px 20px}
.ord-hero{text-align:center;margin-bottom:28px}
.ord-title{font-size:28px;font-weight:700;margin-bottom:8px}
.ord-subtitle{font-size:15px;color:#8c8982;line-height:1.6}
.ord-auth-wrap{max-width:480px;margin:0 auto}
.ord-auth-box{background:#fff;border:1px solid #e8e6e1;border-radius:14px;padding:28px;display:flex;flex-direction:column;gap:14px}
.ord-auth-tabs{display:flex;gap:0;border:1px solid #e8e6e1;border-radius:8px;overflow:hidden}
.ord-auth-tab{flex:1;background:none;border:none;padding:8px;font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;color:#8c8982;transition:all .15s}
.ord-auth-tab.active{background:#1a1916;color:#fff}
.ord-auth-error{font-size:13px;color:#c0392b;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:8px 12px}
.ord-form-wrap{max-width:540px;margin:0 auto}
.ord-form-title{font-size:22px;font-weight:700;margin-bottom:24px}
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
.ord-label-prominent{font-size:14px;font-weight:700;color:#1a1916}
.ord-required{color:#c0392b}
.ord-input{font-size:14px;font-family:inherit;color:#1a1916;background:#f9f8f6;border:1px solid #e8e6e1;border-radius:7px;padding:9px 12px;outline:none;transition:border-color .15s;width:100%}
.ord-input:focus{border-color:#1a1916;background:#fff}
.ord-textarea{min-height:80px;resize:vertical}
.ord-textarea-lg{min-height:110px;font-size:14px}
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
.ord-qr-note{font-size:12px;color:#8c8982;line-height:1.5}
.ord-btn-primary{background:#1a1916;color:#fff;border:none;padding:8px 16px;border-radius:7px;font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;transition:opacity .15s}
.ord-btn-primary:hover{opacity:.85}
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
  .ord-auth-box{padding:20px 16px}
  .ord-addr-grid{grid-template-columns:1fr}
}
`

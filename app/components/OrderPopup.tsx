'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { CustomerAddress } from '@/lib/supabase'

const BANK_ID   = process.env.NEXT_PUBLIC_BANK_ID ?? ''
const BANK_ACCT = process.env.NEXT_PUBLIC_BANK_ACCOUNT ?? ''
const BANK_NAME = process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME ?? ''
const FB_APP_ID = process.env.NEXT_PUBLIC_FB_APP_ID ?? ''

function fmtVND(v: number | null | undefined) {
  if (!v) return 'Thương lượng'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v)
}

export interface OrderItem {
  id: number
  title: string
  price: number | null
}

interface Props {
  open: boolean
  onClose: () => void
  item?: OrderItem
  items?: OrderItem[]
  onSuccess?: () => void
}

export default function OrderPopup({ open, onClose, item, items, onSuccess }: Props) {
  const effectiveItems: OrderItem[] = items?.length ? items : (item ? [item] : [])
  const [supaUser, setSupaUser] = useState<{ email: string; name: string } | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([])
  const [orderAddressId, setOrderAddressId] = useState<number | null>(null)
  const [showNewAddrForm, setShowNewAddrForm] = useState(false)
  const [newAddrForm, setNewAddrForm] = useState({ full_name: '', phone: '', address: '' })
  const [newAddrSaving, setNewAddrSaving] = useState(false)

  const [orderForm, setOrderForm] = useState({ note: '', payment_method: 'cod' as 'cod' | 'bank_transfer' })
  const [orderSubmitting, setOrderSubmitting] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<number | null>(null)
  const [orderNotifyData, setOrderNotifyData] = useState<{ order_number: string; customer_name: string; item_title: string | null; payment_method: string } | null>(null)
  const [fbConnected, setFbConnected] = useState(false)
  const [fbConnecting, setFbConnecting] = useState(false)

  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' })
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')

  const [toast, setToast] = useState('')
  const toastTimer = useRef<ReturnType<typeof setTimeout>>()

  function showToast(m: string) {
    setToast(m)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2800)
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setSupaUser({ email: user.email ?? '', name: user.user_metadata?.full_name ?? user.email ?? '' })
      setAuthChecked(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user
      setSupaUser(u ? { email: u.email ?? '', name: u.user_metadata?.full_name ?? u.email ?? '' } : null)
      setAuthChecked(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!open) {
      setOrderSuccess(null)
      setOrderId(null)
      setOrderNotifyData(null)
      setFbConnected(false)
      setFbConnecting(false)
      setOrderAddressId(null)
      setShowNewAddrForm(false)
      setNewAddrForm({ full_name: '', phone: '', address: '' })
      setOrderForm({ note: '', payment_method: 'cod' })
      setAuthForm({ name: '', email: '', password: '' })
      setAuthError('')
      setSavedAddresses([])
      return
    }
    if (supaUser) {
      setNewAddrForm(f => ({ ...f, full_name: supaUser.name }))
      fetchAddresses()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, supaUser?.email])

  async function fetchAddresses() {
    const { data: { session } } = await supabase.auth.getSession()
    const jwt = session?.access_token
    if (!jwt) return
    try {
      const r = await fetch('/api/addresses', { headers: { Authorization: `Bearer ${jwt}` } })
      const d = await r.json()
      const list: CustomerAddress[] = Array.isArray(d) ? d : []
      setSavedAddresses(list)
      const def = list.find(a => a.is_default)
      if (def) setOrderAddressId(def.id)
    } catch { /* silent */ }
  }

  async function saveNewAddr() {
    if (!newAddrForm.full_name.trim()) { showToast('Nhập họ tên'); return }
    if (!newAddrForm.phone.trim())     { showToast('Nhập số điện thoại'); return }
    if (!newAddrForm.address.trim())   { showToast('Nhập địa chỉ'); return }
    setNewAddrSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const jwt = session?.access_token
      if (!jwt) { showToast('Cần đăng nhập để lưu địa chỉ'); return }
      const r = await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ ...newAddrForm, is_default: savedAddresses.length === 0 }),
      })
      if (!r.ok) { showToast('Lưu địa chỉ thất bại'); return }
      const saved = await r.json()
      await fetchAddresses()
      setOrderAddressId(saved.id)
      setShowNewAddrForm(false)
    } catch { showToast('Không thể kết nối server') }
    finally { setNewAddrSaving(false) }
  }

  async function submitOrder() {
    if (!orderAddressId) { showToast('Vui lòng chọn địa chỉ giao hàng'); return }
    const addr = savedAddresses.find(a => a.id === orderAddressId)
    if (!addr) { showToast('Địa chỉ không hợp lệ'); return }
    setOrderSubmitting(true)
    const totalAmt = effectiveItems.reduce((s, i) => s + (i.price ?? 0), 0) || null
    try {
      const r = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart_items: effectiveItems.map(i => ({ id: i.id, title: i.title, price: i.price })),
          total_amount: totalAmt,
          customer_name: addr.full_name,
          customer_phone: addr.phone,
          customer_address: addr.address,
          customer_note: orderForm.note || null,
          shipping_carrier: 'spx',
          payment_method: orderForm.payment_method,
          created_by: 'customer',
          address_id: orderAddressId,
        }),
      })
      if (!r.ok) { showToast('Đặt hàng thất bại, vui lòng thử lại'); return }
      const d = await r.json()
      setOrderSuccess(d.order_number)
      setOrderId(d.id)
      setOrderNotifyData({
        order_number: d.order_number,
        customer_name: addr.full_name,
        item_title: effectiveItems.length === 1 ? effectiveItems[0].title : (effectiveItems.length > 1 ? effectiveItems.map(i => i.title).join(', ') : null),
        payment_method: orderForm.payment_method,
      })
    } catch { showToast('Không thể kết nối server') }
    finally { setOrderSubmitting(false) }
  }

  async function signIn() {
    if (!authForm.email || !authForm.password) { setAuthError('Nhập email và mật khẩu'); return }
    setAuthLoading(true); setAuthError('')
    const { error } = await supabase.auth.signInWithPassword({ email: authForm.email, password: authForm.password })
    setAuthLoading(false)
    if (error) setAuthError(error.message === 'Invalid login credentials' ? 'Email hoặc mật khẩu không đúng' : error.message)
  }

  async function signUp() {
    if (!authForm.name.trim())        { setAuthError('Nhập họ tên'); return }
    if (!authForm.email)              { setAuthError('Nhập email'); return }
    if (authForm.password.length < 6) { setAuthError('Mật khẩu tối thiểu 6 ký tự'); return }
    setAuthLoading(true); setAuthError('')
    const { error } = await supabase.auth.signUp({
      email: authForm.email, password: authForm.password,
      options: { data: { full_name: authForm.name } },
    })
    setAuthLoading(false)
    if (error) setAuthError(error.message)
  }

  function connectFacebook() {
    if (!orderId || !orderNotifyData) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const FB = typeof window !== 'undefined' ? (window as any).FB : null
    if (!FB) { showToast('Facebook chưa sẵn sàng, thử lại sau'); return }
    setFbConnecting(true)
    FB.login(async (response: { authResponse?: { accessToken: string } | null }) => {
      if (!response.authResponse?.accessToken) {
        setFbConnecting(false)
        return
      }
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const r = await fetch('/api/orders/customer-notify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ ...orderNotifyData, order_id: orderId, user_access_token: response.authResponse.accessToken }),
        })
        const d = await r.json()
        if (d.ok && d.notified) {
          setFbConnected(true)
          showToast('Kết nối thành công! Bạn sẽ nhận thông báo qua Messenger.')
        } else {
          showToast('Không thể kết nối Messenger, bỏ qua.')
        }
      } catch {
        showToast('Lỗi kết nối, thử lại sau.')
      } finally {
        setFbConnecting(false)
      }
    }, { scope: 'public_profile' })
  }

  if (!open) return null

  return (
    <>
      <style>{`
        .op-tabs{display:flex;border-bottom:1px solid var(--border);margin-bottom:16px}
        .op-tab{flex:1;padding:8px;border:none;background:none;font-family:inherit;font-size:13px;cursor:pointer;color:var(--muted);border-bottom:2px solid transparent;margin-bottom:-1px;transition:color .15s}
        .op-tab.active{color:var(--text);border-bottom-color:var(--accent);font-weight:600}
        .op-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .op-item-bar{display:flex;justify-content:space-between;align-items:center;gap:8px;background:var(--tag-bg);border-radius:8px;padding:10px 12px;margin-bottom:14px;font-size:13px}
        .btn-op-dark{background:var(--accent);color:white;border:none;padding:9px 16px;border-radius:7px;font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;transition:opacity .15s}
        .btn-op-dark:hover{opacity:.85}.btn-op-dark:disabled{opacity:.6;cursor:not-allowed}
        .btn-op-ghost-sm{background:none;border:1px dashed var(--border);padding:7px 12px;border-radius:7px;font-family:inherit;font-size:12px;cursor:pointer;color:var(--muted);width:100%;transition:border-color .15s}
        .btn-op-ghost-sm:hover{border-color:var(--accent);color:var(--text)}
        .btn-op-green{background:var(--green);color:white;border:none;padding:9px 20px;border-radius:7px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:opacity .15s}
        .btn-op-green:hover{opacity:.85}.btn-op-green:disabled{opacity:.6;cursor:not-allowed}
        .btn-op-fb{background:#1877F2;color:white;border:none;padding:9px 16px;border-radius:7px;font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;width:100%;transition:opacity .15s}
        .btn-op-fb:hover{opacity:.9}.btn-op-fb:disabled{opacity:.6;cursor:not-allowed}
      `}</style>
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal" style={{ maxWidth: 500 }}>

          {orderSuccess ? (
            <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--green)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 14px' }}>✓</div>
              <h3 style={{ marginBottom: 6 }}>Đã gửi yêu cầu!</h3>
              <p style={{ color: 'var(--muted)', marginBottom: 16 }}>Nhân viên sẽ liên hệ xác nhận và sắp xếp giao hàng sớm nhất.</p>
              {effectiveItems.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  {effectiveItems.map((it, idx) => (
                    <div key={idx} className="op-item-bar" style={{ marginBottom: 6 }}>
                      <span style={{ fontWeight: 500 }}>{it.title}</span>
                      <span style={{ color: 'var(--green)', fontWeight: 700, whiteSpace: 'nowrap' }}>{fmtVND(it.price)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ background: 'var(--tag-bg)', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
                <div className="lbl" style={{ marginBottom: 4 }}>Mã đơn hàng</div>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'monospace', color: 'var(--text)' }}>{orderSuccess}</div>
              </div>
              {supaUser && FB_APP_ID && (
                <div style={{ marginBottom: 16 }}>
                  {fbConnected ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--green)', fontSize: 13, padding: '8px 0' }}>
                      <span>✓</span> Đã kết nối — bạn sẽ nhận thông báo qua Messenger
                    </div>
                  ) : (
                    <>
                      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>Kết nối Facebook để nhận thông báo đơn hàng qua Messenger.</p>
                      <button className="btn-op-fb" onClick={connectFacebook} disabled={fbConnecting}>
                        {fbConnecting ? 'Đang kết nối...' : 'f  Kết nối Facebook Messenger'}
                      </button>
                    </>
                  )}
                </div>
              )}
              <button className="btn-ghost" onClick={() => { onSuccess?.(); onClose() }}>Đóng</button>
            </div>

          ) : !authChecked ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>Đang kiểm tra...</div>

          ) : !supaUser ? (
            <>
              <h3 style={{ marginBottom: 12 }}>Đăng nhập để đặt hàng</h3>
              {effectiveItems.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  {effectiveItems.map((it, idx) => (
                    <div key={idx} className="op-item-bar" style={{ marginBottom: 6 }}>
                      <span style={{ fontWeight: 500 }}>{it.title}</span>
                      <span style={{ color: 'var(--green)', fontWeight: 700, whiteSpace: 'nowrap' }}>{fmtVND(it.price)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="op-tabs">
                <button className={`op-tab${authMode === 'login' ? ' active' : ''}`}
                  onClick={() => { setAuthMode('login'); setAuthError('') }}>Đăng nhập</button>
                <button className={`op-tab${authMode === 'signup' ? ' active' : ''}`}
                  onClick={() => { setAuthMode('signup'); setAuthError('') }}>Đăng ký</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {authMode === 'signup' && (
                  <div>
                    <label className="lbl">Họ tên</label>
                    <input className="inp" placeholder="Nguyễn Văn A" autoFocus value={authForm.name}
                      onChange={e => setAuthForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                )}
                <div>
                  <label className="lbl">Email</label>
                  <input className="inp" type="email" placeholder="email@example.com" autoFocus={authMode === 'login'} value={authForm.email}
                    onChange={e => setAuthForm(f => ({ ...f, email: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && (authMode === 'login' ? signIn() : signUp())} />
                </div>
                <div>
                  <label className="lbl">Mật khẩu</label>
                  <input className="inp" type="password" placeholder="••••••" value={authForm.password}
                    onChange={e => setAuthForm(f => ({ ...f, password: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && (authMode === 'login' ? signIn() : signUp())} />
                </div>
                {authError && <div style={{ color: 'var(--red)', fontSize: 13 }}>{authError}</div>}
                <button className="btn-op-dark" onClick={authMode === 'login' ? signIn : signUp} disabled={authLoading}>
                  {authLoading ? 'Đang xử lý...' : authMode === 'login' ? 'Đăng nhập →' : 'Đăng ký →'}
                </button>
              </div>
              <div className="modal-actions" style={{ marginTop: 12 }}>
                <button className="btn-ghost" onClick={onClose}>Hủy</button>
              </div>
            </>

          ) : (
            <>
              <h3>Đặt hàng</h3>
              {effectiveItems.length > 0 && (
                <div style={{ marginBottom: 4 }}>
                  {effectiveItems.map((it, idx) => (
                    <div key={idx} className="op-item-bar" style={{ marginBottom: 6 }}>
                      <span style={{ fontWeight: 500 }}>{it.title}</span>
                      <span style={{ color: 'var(--green)', fontWeight: 700, whiteSpace: 'nowrap' }}>{fmtVND(it.price)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginBottom: 14 }}>
                <div className="lbl" style={{ marginBottom: 5 }}>Địa chỉ giao hàng <span style={{ color: 'var(--red)' }}>*</span></div>
                {showNewAddrForm || savedAddresses.length === 0 ? (
                  <>
                    <div className="op-grid" style={{ marginTop: 4, marginBottom: 8 }}>
                      <div>
                        <label className="lbl">Họ tên <span style={{ color: 'var(--red)' }}>*</span></label>
                        <input className="inp" placeholder="Nguyễn Văn A" autoFocus
                          value={newAddrForm.full_name} onChange={e => setNewAddrForm(f => ({ ...f, full_name: e.target.value }))} />
                      </div>
                      <div>
                        <label className="lbl">Số điện thoại <span style={{ color: 'var(--red)' }}>*</span></label>
                        <input className="inp" placeholder="09xxxxxxxx" type="tel"
                          value={newAddrForm.phone} onChange={e => setNewAddrForm(f => ({ ...f, phone: e.target.value }))} />
                      </div>
                      <div style={{ gridColumn: '1/-1' }}>
                        <label className="lbl">Địa chỉ nhận hàng <span style={{ color: 'var(--red)' }}>*</span></label>
                        <input className="inp" placeholder="Số nhà, đường, phường, quận, tỉnh..."
                          value={newAddrForm.address} onChange={e => setNewAddrForm(f => ({ ...f, address: e.target.value }))} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {savedAddresses.length > 0 && (
                        <button type="button" className="btn-ghost" style={{ flex: 1 }} onClick={() => setShowNewAddrForm(false)}>← Quay lại</button>
                      )}
                      <button type="button" className="btn-op-dark" style={{ flex: 1 }} onClick={saveNewAddr} disabled={newAddrSaving}>
                        {newAddrSaving ? 'Đang lưu...' : 'Lưu địa chỉ →'}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <select className="inp" style={{ cursor: 'pointer', marginBottom: 8 }}
                      value={orderAddressId ?? ''}
                      onChange={e => setOrderAddressId(e.target.value ? Number(e.target.value) : null)}>
                      <option value="">— Chọn địa chỉ —</option>
                      {savedAddresses.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.is_default ? '★ ' : ''}{a.full_name} · {a.phone} · {a.address.substring(0, 45)}{a.address.length > 45 ? '…' : ''}
                        </option>
                      ))}
                    </select>
                    <button type="button" className="btn-op-ghost-sm"
                      onClick={() => { setShowNewAddrForm(true); setNewAddrForm({ full_name: supaUser?.name ?? '', phone: '', address: '' }) }}>
                      + Thêm địa chỉ mới
                    </button>
                  </>
                )}
              </div>

              {orderAddressId && !showNewAddrForm && (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <label className="lbl">Ghi chú</label>
                    <input className="inp" placeholder="Ghi chú thêm nếu có..."
                      value={orderForm.note} onChange={e => setOrderForm(f => ({ ...f, note: e.target.value }))} />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <div className="lbl" style={{ marginBottom: 8 }}>Phương thức thanh toán</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {(['cod', 'bank_transfer'] as const).map(m => (
                        <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', border: `1.5px solid ${orderForm.payment_method === m ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 8, cursor: 'pointer', background: orderForm.payment_method === m ? 'var(--tag-bg)' : 'transparent', transition: 'all .15s' }}>
                          <input type="radio" name="op_pay" value={m} checked={orderForm.payment_method === m}
                            onChange={() => setOrderForm(f => ({ ...f, payment_method: m }))} style={{ accentColor: 'var(--accent)', flexShrink: 0 }} />
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>{m === 'cod' ? 'Thanh toán khi nhận hàng (COD)' : 'Chuyển khoản ngân hàng'}</div>
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{m === 'cod' ? 'Trả tiền mặt khi nhận được hàng' : 'Thanh toán trước, xác nhận thủ công'}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                  {orderForm.payment_method === 'bank_transfer' && BANK_ACCT && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--tag-bg)', borderRadius: 10, padding: 12, marginBottom: 14 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://img.vietqr.io/image/${BANK_ID}-${BANK_ACCT}-compact2.png?addInfo=${encodeURIComponent('Dat hang')}&accountName=${encodeURIComponent(BANK_NAME)}`}
                        alt="QR thanh toán" width={88} height={88} style={{ borderRadius: 6, flexShrink: 0 }} />
                      <div style={{ fontSize: 12, lineHeight: 1.9 }}>
                        <div><span style={{ color: 'var(--muted)' }}>Ngân hàng:</span> <strong>{BANK_ID}</strong></div>
                        <div><span style={{ color: 'var(--muted)' }}>STK:</span> <strong>{BANK_ACCT}</strong></div>
                        {BANK_NAME && <div><span style={{ color: 'var(--muted)' }}>Chủ TK:</span> {BANK_NAME}</div>}
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>Nhân viên sẽ xác nhận số tiền sau.</div>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="modal-actions">
                <button className="btn-ghost" onClick={onClose}>Hủy</button>
                {orderAddressId && !showNewAddrForm && (
                  <button className="btn-op-green" onClick={submitOrder} disabled={orderSubmitting}>
                    {orderSubmitting ? 'Đang đặt hàng...' : 'Xác nhận đặt hàng →'}
                  </button>
                )}
              </div>
            </>
          )}

          {toast && (
            <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: '#222', color: '#fff', padding: '10px 20px', borderRadius: 8, fontSize: 14, zIndex: 9999 }}>
              {toast}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

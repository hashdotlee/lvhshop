'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Order, CustomerAddress } from '@/lib/supabase'

type Tab = 'profile' | 'orders' | 'addresses'

const STATUS_LABEL: Record<string, string> = {
  pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận',
  shipping: 'Đang giao', delivered: 'Đã giao', cancelled: 'Đã huỷ',
}
const STATUS_COLOR: Record<string, string> = {
  pending: '#d97706', confirmed: '#2563eb', shipping: '#7c3aed',
  delivered: '#2a7a4b', cancelled: '#dc2626',
}
const CARRIER_LABEL: Record<string, string> = {
  spx: 'Shopee Express', viettelpost: 'ViettelPost', other: 'Khác',
}

function fmtVND(v: number | null | undefined) {
  if (!v) return 'Thương lượng'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v)
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

type OrderWithItem = Order & {
  items?: { title: string; price: number | null; order_code: string; images: string[] } | null
}

async function getJwt() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

export default function AccountClient() {
  const [supaUser, setSupaUser] = useState<{ id: string; email: string; name: string } | null>(null)
  const [checking, setChecking] = useState(true)
  const [tab, setTab] = useState<Tab>('profile')

  // Auth form
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' })
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSupaUser({
          id: session.user.id,
          email: session.user.email ?? '',
          name: session.user.user_metadata?.full_name ?? session.user.email ?? '',
        })
      }
      setChecking(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        setSupaUser({
          id: session.user.id,
          email: session.user.email ?? '',
          name: session.user.user_metadata?.full_name ?? session.user.email ?? '',
        })
      } else {
        setSupaUser(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSignIn() {
    setAuthLoading(true); setAuthError('')
    const { error } = await supabase.auth.signInWithPassword({ email: authForm.email, password: authForm.password })
    setAuthLoading(false)
    if (error) setAuthError(error.message === 'Invalid login credentials' ? 'Email hoặc mật khẩu không đúng' : error.message)
  }

  async function handleSignUp() {
    if (!authForm.name.trim()) { setAuthError('Vui lòng nhập họ tên'); return }
    setAuthLoading(true); setAuthError('')
    const { error } = await supabase.auth.signUp({
      email: authForm.email, password: authForm.password,
      options: { data: { full_name: authForm.name } },
    })
    setAuthLoading(false)
    if (error) setAuthError(error.message)
  }

  if (checking) return null

  return (
    <>
      <style>{css}</style>
      <div className="ac-page">
        <header className="ac-header">
          <a href="/" className="ac-logo">leviethoang<span>.shop</span></a>
          <div className="ac-header-right">
            <a href="/order" className="ac-nav-link">Đặt hàng</a>
            <a href="/" className="ac-nav-link">← Trang chủ</a>
          </div>
        </header>

        <main className="ac-main">
          {!supaUser ? (
            <AuthBox
              mode={authMode} setMode={setAuthMode}
              form={authForm} setForm={setAuthForm}
              onLogin={handleSignIn} onSignup={handleSignUp}
              loading={authLoading} error={authError}
            />
          ) : (
            <div className="ac-layout">
              {/* Sidebar */}
              <aside className="ac-sidebar">
                <div className="ac-user-card">
                  <div className="ac-avatar">{supaUser.name[0].toUpperCase()}</div>
                  <div className="ac-user-info">
                    <div className="ac-user-name">{supaUser.name}</div>
                    <div className="ac-user-email">{supaUser.email}</div>
                  </div>
                </div>
                <nav className="ac-tabs">
                  {([
                    { id: 'profile', label: 'Hồ sơ', icon: '👤' },
                    { id: 'orders', label: 'Đơn hàng', icon: '📦' },
                    { id: 'addresses', label: 'Địa chỉ', icon: '📍' },
                  ] as { id: Tab; label: string; icon: string }[]).map(t => (
                    <button key={t.id} className={`ac-tab${tab === t.id ? ' active' : ''}`}
                      onClick={() => setTab(t.id)}>
                      <span>{t.icon}</span> {t.label}
                    </button>
                  ))}
                  <div className="ac-tab-divider" />
                  <button className="ac-tab ac-tab-logout"
                    onClick={() => supabase.auth.signOut()}>
                    Đăng xuất
                  </button>
                </nav>
              </aside>

              {/* Content */}
              <div className="ac-content">
                {tab === 'profile' && <ProfileTab user={supaUser} onNameChange={name => setSupaUser(u => u ? { ...u, name } : u)} />}
                {tab === 'orders' && <OrdersTab />}
                {tab === 'addresses' && <AddressesTab />}
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  )
}

// ── Auth Box ──────────────────────────────────────────────────────
function AuthBox({ mode, setMode, form, setForm, onLogin, onSignup, loading, error }: {
  mode: 'login' | 'signup'
  setMode: (m: 'login' | 'signup') => void
  form: { name: string; email: string; password: string }
  setForm: (f: typeof form) => void
  onLogin: () => void
  onSignup: () => void
  loading: boolean
  error: string
}) {
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value })
  const submit = mode === 'login' ? onLogin : onSignup

  return (
    <div className="ac-auth-wrap">
      <div className="ac-auth-box">
        <h1 className="ac-auth-title">Tài khoản khách hàng</h1>
        <p className="ac-auth-desc">Đăng nhập để quản lý đơn hàng và địa chỉ giao hàng.</p>
        <div className="ac-mode-tabs">
          <button className={`ac-mode-tab${mode === 'login' ? ' active' : ''}`} onClick={() => { setMode('login'); }}>Đăng nhập</button>
          <button className={`ac-mode-tab${mode === 'signup' ? ' active' : ''}`} onClick={() => { setMode('signup'); }}>Đăng ký</button>
        </div>
        <div className="ac-form">
          {mode === 'signup' && (
            <div className="ac-field">
              <label className="ac-label">Họ và tên</label>
              <input className="ac-input" placeholder="Nguyễn Văn A" value={form.name} onChange={set('name')} />
            </div>
          )}
          <div className="ac-field">
            <label className="ac-label">Email</label>
            <input className="ac-input" type="email" placeholder="email@example.com" value={form.email} onChange={set('email')}
              onKeyDown={e => e.key === 'Enter' && submit()} />
          </div>
          <div className="ac-field">
            <label className="ac-label">Mật khẩu</label>
            <input className="ac-input" type="password" placeholder={mode === 'signup' ? 'Tối thiểu 6 ký tự' : '••••••••'}
              value={form.password} onChange={set('password')}
              onKeyDown={e => e.key === 'Enter' && submit()} />
          </div>
          {error && <div className="ac-error">{error}</div>}
          <button className="ac-btn-primary" onClick={submit} disabled={loading}>
            {loading ? 'Đang xử lý...' : mode === 'login' ? 'Đăng nhập →' : 'Đăng ký →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Profile Tab ───────────────────────────────────────────────────
function ProfileTab({ user, onNameChange }: { user: { id: string; email: string; name: string }; onNameChange: (name: string) => void }) {
  const [name, setName] = useState(user.name)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState('')

  async function saveName() {
    if (!name.trim()) return
    setSaving(true); setMsg('')
    const { error } = await supabase.auth.updateUser({ data: { full_name: name } })
    setSaving(false)
    if (error) { setMsg('Lỗi: ' + error.message) } else { setMsg('Đã cập nhật tên!'); onNameChange(name) }
  }

  async function changePassword() {
    if (pwForm.next.length < 6) { setPwMsg('Mật khẩu mới tối thiểu 6 ký tự'); return }
    if (pwForm.next !== pwForm.confirm) { setPwMsg('Mật khẩu xác nhận không khớp'); return }
    setPwSaving(true); setPwMsg('')
    const { error } = await supabase.auth.updateUser({ password: pwForm.next })
    setPwSaving(false)
    if (error) { setPwMsg('Lỗi: ' + error.message) } else { setPwMsg('Đã đổi mật khẩu!'); setPwForm({ current: '', next: '', confirm: '' }) }
  }

  return (
    <div>
      <div className="ac-section-title">Hồ sơ cá nhân</div>

      <div className="ac-card">
        <div className="ac-card-title">Thông tin tài khoản</div>
        <div className="ac-field-row">
          <div className="ac-field">
            <label className="ac-label">Email</label>
            <input className="ac-input" value={user.email} disabled style={{ opacity: .6 }} />
          </div>
          <div className="ac-field">
            <label className="ac-label">Họ và tên</label>
            <input className="ac-input" placeholder="Nguyễn Văn A" value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveName()} />
          </div>
        </div>
        {msg && <div className={`ac-msg${msg.startsWith('Lỗi') ? ' err' : ''}`}>{msg}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <button className="ac-btn-primary" onClick={saveName} disabled={saving || name === user.name}>
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>

      <div className="ac-card" style={{ marginTop: 16 }}>
        <div className="ac-card-title">Đổi mật khẩu</div>
        <div className="ac-field">
          <label className="ac-label">Mật khẩu mới</label>
          <input className="ac-input" type="password" placeholder="Tối thiểu 6 ký tự"
            value={pwForm.next} onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))} />
        </div>
        <div className="ac-field" style={{ marginTop: 10 }}>
          <label className="ac-label">Xác nhận mật khẩu mới</label>
          <input className="ac-input" type="password" placeholder="Nhập lại mật khẩu"
            value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} />
        </div>
        {pwMsg && <div className={`ac-msg${pwMsg.startsWith('Lỗi') ? ' err' : ''}`}>{pwMsg}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <button className="ac-btn-primary" onClick={changePassword} disabled={pwSaving}>
            {pwSaving ? 'Đang lưu...' : 'Đổi mật khẩu'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Orders Tab ────────────────────────────────────────────────────
function OrdersTab() {
  const [phone, setPhone] = useState('')
  const [savedPhone, setSavedPhone] = useState('')
  const [orders, setOrders] = useState<OrderWithItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  useEffect(() => {
    try {
      const p = localStorage.getItem('ord_customer_phone') ?? ''
      if (p) { setPhone(p); setSavedPhone(p); fetchOrders(p) }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchOrders(p: string) {
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/my-orders?phone=${encodeURIComponent(p)}`)
      if (!res.ok) { const e = await res.json(); setError(e.error ?? 'Lỗi'); return }
      setOrders(await res.json())
    } catch { setError('Không thể kết nối') } finally { setLoading(false) }
  }

  function submit() {
    const p = phone.trim().replace(/\s/g, '')
    if (p.length < 9) { setError('Số điện thoại không hợp lệ'); return }
    try { localStorage.setItem('ord_customer_phone', p) } catch {}
    setSavedPhone(p); fetchOrders(p)
  }

  return (
    <div>
      <div className="ac-section-title">Đơn hàng của tôi</div>

      {!savedPhone ? (
        <div className="ac-card">
          <div className="ac-card-title">Nhập số điện thoại đặt hàng</div>
          <p className="ac-card-desc">Nhập số điện thoại bạn đã dùng khi đặt hàng để xem trạng thái đơn.</p>
          <div className="ac-phone-row">
            <input className="ac-input" type="tel" placeholder="09xxxxxxxx"
              value={phone} onChange={e => setPhone(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()} autoFocus />
            <button className="ac-btn-primary" onClick={submit}>Tra cứu</button>
          </div>
          {error && <div className="ac-msg err">{error}</div>}
        </div>
      ) : (
        <>
          <div className="ac-orders-header">
            <span className="ac-orders-count">{orders.length} đơn · SĐT: {savedPhone}</span>
            <button className="ac-btn-ghost-sm" onClick={() => { setSavedPhone(''); setOrders([]); setError('') }}>Đổi SĐT</button>
          </div>
          {loading && <div className="ac-loading"><div className="ac-spinner" /></div>}
          {error && <div className="ac-msg err">{error}</div>}
          {!loading && orders.length === 0 && (
            <div className="ac-empty">
              <div style={{ fontSize: 36, marginBottom: 12 }}>📦</div>
              <div>Chưa có đơn hàng nào với SĐT {savedPhone}</div>
            </div>
          )}
          <div className="ac-orders-list">
            {orders.map(order => {
              const isExpanded = expandedId === order.id
              const imgs = order.items?.images ?? []
              const title = order.item_title ?? order.items?.title ?? 'Đơn hàng'
              const statusColor = STATUS_COLOR[order.order_status] ?? '#666'
              return (
                <div key={order.id} className="ac-order-card">
                  <div className="ac-order-top" onClick={() => setExpandedId(isExpanded ? null : order.id)}>
                    <div className="ac-order-left">
                      {imgs.length > 0 ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={imgs[0]} alt={title} className="ac-order-thumb" />
                      ) : (
                        <div className="ac-order-thumb-ph">📦</div>
                      )}
                      <div>
                        <div className="ac-order-num">{order.order_number}</div>
                        <div className="ac-order-title">{title}</div>
                        <div className="ac-order-date">{fmtDate(order.created_at)}</div>
                      </div>
                    </div>
                    <div className="ac-order-right">
                      <span className="ac-status-badge" style={{ background: statusColor + '18', color: statusColor }}>
                        {STATUS_LABEL[order.order_status] ?? order.order_status}
                      </span>
                      <span style={{ fontSize: 10, color: '#8c8982' }}>{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="ac-order-detail">
                      <div className="ac-detail-grid">
                        <div><div className="ac-detail-label">Thanh toán</div>
                          <div className="ac-detail-value">{order.payment_method === 'cod' ? 'COD' : 'Chuyển khoản'} · {order.payment_status === 'verified' ? '✓ Đã thanh toán' : 'Chưa thanh toán'}</div>
                        </div>
                        <div><div className="ac-detail-label">Giá trị</div>
                          <div className="ac-detail-value">{fmtVND(order.total_amount ?? order.item_price)}</div>
                        </div>
                        <div><div className="ac-detail-label">Địa chỉ</div>
                          <div className="ac-detail-value">{order.customer_address}</div>
                        </div>
                        {order.tracking_number && (
                          <div><div className="ac-detail-label">Mã vận đơn</div>
                            <div className="ac-detail-value" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <span>{order.tracking_number}</span>
                              <button className="ac-copy-btn"
                                onClick={() => navigator.clipboard.writeText(order.tracking_number!).catch(() => {})}>
                                Sao chép
                              </button>
                            </div>
                          </div>
                        )}
                        {order.shipping_carrier && order.order_status !== 'pending' && (
                          <div><div className="ac-detail-label">Vận chuyển</div>
                            <div className="ac-detail-value">{CARRIER_LABEL[order.shipping_carrier] ?? order.shipping_carrier}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ── Addresses Tab ─────────────────────────────────────────────────
function AddressesTab() {
  const [addresses, setAddresses] = useState<CustomerAddress[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editAddr, setEditAddr] = useState<CustomerAddress | null>(null)
  const [form, setForm] = useState({ full_name: '', phone: '', address: '', is_default: false })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const fetchAddresses = useCallback(async () => {
    const jwt = await getJwt()
    if (!jwt) return
    setLoading(true)
    try {
      const res = await fetch('/api/addresses', { headers: { Authorization: `Bearer ${jwt}` } })
      if (res.ok) setAddresses(await res.json())
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAddresses() }, [fetchAddresses])

  function openAdd() { setEditAddr(null); setForm({ full_name: '', phone: '', address: '', is_default: false }); setShowForm(true); setError('') }
  function openEdit(a: CustomerAddress) { setEditAddr(a); setForm({ full_name: a.full_name, phone: a.phone, address: a.address, is_default: a.is_default }); setShowForm(true); setError('') }

  async function handleSave() {
    if (!form.full_name.trim()) { setError('Vui lòng nhập họ tên'); return }
    if (!form.phone.trim()) { setError('Vui lòng nhập số điện thoại'); return }
    if (!form.address.trim()) { setError('Vui lòng nhập địa chỉ'); return }
    const jwt = await getJwt()
    if (!jwt) return
    setSubmitting(true); setError('')
    try {
      const res = await fetch('/api/addresses', {
        method: editAddr ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
        body: JSON.stringify(editAddr ? { id: editAddr.id, ...form } : form),
      })
      if (!res.ok) { const e = await res.json(); setError(e.error ?? 'Lỗi'); return }
      setShowForm(false); fetchAddresses()
    } finally { setSubmitting(false) }
  }

  async function handleDelete(id: number) {
    if (!confirm('Xoá địa chỉ này?')) return
    const jwt = await getJwt()
    if (!jwt) return
    await fetch(`/api/addresses?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${jwt}` } })
    fetchAddresses()
  }

  async function setDefault(a: CustomerAddress) {
    const jwt = await getJwt()
    if (!jwt) return
    await fetch('/api/addresses', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ id: a.id, is_default: true }),
    })
    fetchAddresses()
  }

  return (
    <div>
      <div className="ac-section-title">Địa chỉ giao hàng</div>

      {loading ? (
        <div className="ac-loading"><div className="ac-spinner" /></div>
      ) : (
        <>
          {addresses.length === 0 && !showForm && (
            <div className="ac-empty">
              <div style={{ fontSize: 36, marginBottom: 12 }}>📍</div>
              <div>Chưa có địa chỉ nào. Thêm địa chỉ để đặt hàng nhanh hơn!</div>
            </div>
          )}

          <div className="ac-addr-list">
            {addresses.map(a => (
              <div key={a.id} className={`ac-addr-card${a.is_default ? ' default' : ''}`}>
                <div className="ac-addr-body">
                  {a.is_default && <span className="ac-addr-default-badge">Mặc định</span>}
                  <div className="ac-addr-name">{a.full_name}</div>
                  <div className="ac-addr-phone">{a.phone}</div>
                  <div className="ac-addr-address">{a.address}</div>
                </div>
                <div className="ac-addr-actions">
                  {!a.is_default && (
                    <button className="ac-btn-ghost-sm" onClick={() => setDefault(a)}>Đặt mặc định</button>
                  )}
                  <button className="ac-btn-ghost-sm" onClick={() => openEdit(a)}>Sửa</button>
                  <button className="ac-btn-del-sm" onClick={() => handleDelete(a.id)}>Xoá</button>
                </div>
              </div>
            ))}
          </div>

          {showForm ? (
            <div className="ac-card" style={{ marginTop: 16 }}>
              <div className="ac-card-title">{editAddr ? 'Sửa địa chỉ' : 'Thêm địa chỉ mới'}</div>
              <div className="ac-field-row">
                <div className="ac-field">
                  <label className="ac-label">Họ và tên <span style={{ color: '#c0392b' }}>*</span></label>
                  <input className="ac-input" placeholder="Nguyễn Văn A" value={form.full_name}
                    onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
                </div>
                <div className="ac-field">
                  <label className="ac-label">Số điện thoại <span style={{ color: '#c0392b' }}>*</span></label>
                  <input className="ac-input" type="tel" placeholder="09xxxxxxxx" value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>
              <div className="ac-field" style={{ marginTop: 10 }}>
                <label className="ac-label">Địa chỉ <span style={{ color: '#c0392b' }}>*</span></label>
                <input className="ac-input" placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
                  value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              <label className="ac-checkbox-row" style={{ marginTop: 12 }}>
                <input type="checkbox" checked={form.is_default}
                  onChange={e => setForm(f => ({ ...f, is_default: e.target.checked }))} />
                <span>Đặt làm địa chỉ mặc định</span>
              </label>
              {error && <div className="ac-msg err" style={{ marginTop: 10 }}>{error}</div>}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
                <button className="ac-btn-ghost" onClick={() => setShowForm(false)}>Hủy</button>
                <button className="ac-btn-primary" onClick={handleSave} disabled={submitting}>
                  {submitting ? 'Đang lưu...' : editAddr ? 'Lưu thay đổi' : 'Thêm địa chỉ'}
                </button>
              </div>
            </div>
          ) : (
            <button className="ac-btn-add-addr" onClick={openAdd}>
              <span>+</span> Thêm địa chỉ mới
            </button>
          )}
        </>
      )}
    </div>
  )
}

const css = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Be Vietnam Pro',sans-serif;background:#f9f8f6;color:#1a1916;font-size:14px;line-height:1.6}
.ac-page{min-height:100vh}
.ac-header{display:flex;align-items:center;justify-content:space-between;padding:14px 32px;background:#fff;border-bottom:1px solid #e8e6e1;position:sticky;top:0;z-index:100}
.ac-logo{font-size:16px;font-weight:600;color:#1a1916;text-decoration:none}
.ac-logo span{color:#8c8982;font-weight:300}
.ac-header-right{display:flex;align-items:center;gap:16px}
.ac-nav-link{font-size:13px;color:#8c8982;text-decoration:none;white-space:nowrap}
.ac-nav-link:hover{color:#1a1916}
.ac-main{max-width:900px;margin:0 auto;padding:36px 20px}

/* Auth */
.ac-auth-wrap{max-width:440px;margin:0 auto}
.ac-auth-box{background:#fff;border:1px solid #e8e6e1;border-radius:14px;padding:36px 28px}
.ac-auth-title{font-size:22px;font-weight:700;margin-bottom:8px}
.ac-auth-desc{font-size:14px;color:#8c8982;margin-bottom:24px}
.ac-mode-tabs{display:flex;border:1px solid #e8e6e1;border-radius:8px;overflow:hidden;margin-bottom:20px}
.ac-mode-tab{flex:1;background:none;border:none;padding:9px;font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;color:#8c8982;transition:all .15s}
.ac-mode-tab.active{background:#1a1916;color:#fff}

/* Layout */
.ac-layout{display:grid;grid-template-columns:220px 1fr;gap:24px;align-items:start}
.ac-sidebar{background:#fff;border:1px solid #e8e6e1;border-radius:12px;padding:16px;position:sticky;top:80px}
.ac-user-card{display:flex;align-items:center;gap:12px;margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid #e8e6e1}
.ac-avatar{width:40px;height:40px;border-radius:50%;background:#1a1916;color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;flex-shrink:0}
.ac-user-name{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ac-user-email{font-size:11px;color:#8c8982;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ac-tabs{display:flex;flex-direction:column;gap:2px}
.ac-tab{background:none;border:none;padding:9px 12px;border-radius:7px;font-family:inherit;font-size:13px;cursor:pointer;color:#8c8982;text-align:left;display:flex;align-items:center;gap:8px;transition:all .15s;font-weight:500}
.ac-tab:hover{background:#f0efe9;color:#1a1916}
.ac-tab.active{background:#f0efe9;color:#1a1916;font-weight:600}
.ac-tab-divider{height:1px;background:#e8e6e1;margin:8px 0}
.ac-tab-logout{color:#c0392b!important}
.ac-tab-logout:hover{background:#fff0ee!important}
.ac-content{}
.ac-section-title{font-size:20px;font-weight:700;margin-bottom:16px}
.ac-card{background:#fff;border:1px solid #e8e6e1;border-radius:12px;padding:20px}
.ac-card-title{font-size:14px;font-weight:600;margin-bottom:12px}
.ac-card-desc{font-size:13px;color:#8c8982;margin-bottom:14px}
.ac-field-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.ac-field{display:flex;flex-direction:column;gap:4px}
.ac-label{font-size:11px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;color:#8c8982}
.ac-form{display:flex;flex-direction:column;gap:12px}
.ac-input{font-size:14px;font-family:inherit;color:#1a1916;background:#f9f8f6;border:1px solid #e8e6e1;border-radius:7px;padding:9px 12px;outline:none;transition:border-color .15s;width:100%}
.ac-input:focus{border-color:#1a1916;background:#fff}
.ac-input:disabled{opacity:.6;cursor:not-allowed}
.ac-error{font-size:13px;color:#c0392b;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:8px 12px}
.ac-msg{font-size:13px;padding:8px 12px;border-radius:6px;background:#edf7f2;color:#2a7a4b;border:1px solid #b7e4cc}
.ac-msg.err{background:#fef2f2;color:#c0392b;border-color:#fecaca}
.ac-phone-row{display:flex;gap:8px;margin-bottom:0}
.ac-btn-primary{background:#1a1916;color:#fff;border:none;padding:9px 18px;border-radius:7px;font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;transition:opacity .15s;white-space:nowrap}
.ac-btn-primary:hover{opacity:.85}
.ac-btn-primary:disabled{opacity:.5;cursor:not-allowed}
.ac-btn-ghost{background:#fff;border:1px solid #e8e6e1;color:#8c8982;padding:8px 16px;border-radius:7px;font-family:inherit;font-size:13px;cursor:pointer;transition:all .15s}
.ac-btn-ghost:hover{border-color:#1a1916;color:#1a1916}
.ac-btn-ghost-sm{background:none;border:1px solid #e8e6e1;color:#8c8982;padding:4px 10px;border-radius:6px;font-family:inherit;font-size:12px;cursor:pointer;transition:all .15s;white-space:nowrap}
.ac-btn-ghost-sm:hover{border-color:#1a1916;color:#1a1916}
.ac-btn-del-sm{background:none;border:1px solid #fcd0cc;color:#c0392b;padding:4px 10px;border-radius:6px;font-family:inherit;font-size:12px;cursor:pointer;transition:all .15s;white-space:nowrap}
.ac-btn-del-sm:hover{background:#fff0ee}
.ac-btn-add-addr{width:100%;background:#fff;border:1.5px dashed #e8e6e1;border-radius:10px;padding:14px;font-family:inherit;font-size:13px;color:#8c8982;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;margin-top:12px;transition:all .15s}
.ac-btn-add-addr:hover{border-color:#1a1916;color:#1a1916;background:#fafaf8}
.ac-checkbox-row{display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer}
.ac-checkbox-row input{width:15px;height:15px;accent-color:#1a1916;cursor:pointer}
/* Orders */
.ac-orders-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.ac-orders-count{font-size:13px;color:#8c8982}
.ac-orders-list{display:flex;flex-direction:column;gap:8px}
.ac-order-card{background:#fff;border:1px solid #e8e6e1;border-radius:10px;overflow:hidden}
.ac-order-top{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;cursor:pointer;gap:12px}
.ac-order-left{display:flex;align-items:center;gap:12px;flex:1;min-width:0}
.ac-order-thumb{width:52px;height:52px;object-fit:cover;border-radius:7px;flex-shrink:0}
.ac-order-thumb-ph{width:52px;height:52px;background:#f0efe9;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
.ac-order-num{font-size:11px;font-weight:700;color:#8c8982;font-family:monospace;margin-bottom:2px}
.ac-order-title{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ac-order-date{font-size:11px;color:#8c8982}
.ac-order-right{display:flex;align-items:center;gap:8px;flex-shrink:0}
.ac-status-badge{font-size:11px;font-weight:600;padding:3px 9px;border-radius:20px;white-space:nowrap}
.ac-order-detail{border-top:1px solid #f0efe9;padding:14px 16px;background:#fafaf8}
.ac-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.ac-detail-label{font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:#8c8982;margin-bottom:2px}
.ac-detail-value{font-size:13px}
.ac-copy-btn{font-size:11px;padding:2px 8px;border:1px solid #e8e6e1;border-radius:4px;background:#fff;cursor:pointer;font-family:inherit;color:#8c8982;transition:all .15s}
.ac-copy-btn:hover{border-color:#1a1916;color:#1a1916}
/* Addresses */
.ac-addr-list{display:flex;flex-direction:column;gap:10px}
.ac-addr-card{background:#fff;border:1.5px solid #e8e6e1;border-radius:10px;padding:14px 16px;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;transition:border-color .15s}
.ac-addr-card.default{border-color:#1a1916}
.ac-addr-body{flex:1;min-width:0}
.ac-addr-default-badge{display:inline-block;font-size:10px;font-weight:700;background:#1a1916;color:#fff;padding:2px 8px;border-radius:4px;letter-spacing:.4px;margin-bottom:6px}
.ac-addr-name{font-size:13px;font-weight:600;margin-bottom:2px}
.ac-addr-phone{font-size:13px;color:#8c8982;margin-bottom:2px}
.ac-addr-address{font-size:13px;color:#3a3936;line-height:1.5}
.ac-addr-actions{display:flex;flex-direction:column;gap:5px;flex-shrink:0}
/* Shared */
.ac-loading{display:flex;justify-content:center;padding:40px 0}
.ac-spinner{width:26px;height:26px;border:3px solid #e8e6e1;border-top-color:#1a1916;border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.ac-empty{text-align:center;padding:40px 20px;color:#8c8982;font-size:14px}
@media(max-width:700px){
  .ac-header{padding:12px 16px}
  .ac-main{padding:20px 14px}
  .ac-layout{grid-template-columns:1fr}
  .ac-sidebar{position:static}
  .ac-tabs{flex-direction:row;flex-wrap:wrap;gap:4px}
  .ac-tab{flex:1;justify-content:center;min-width:fit-content}
  .ac-tab-divider{display:none}
  .ac-field-row{grid-template-columns:1fr}
  .ac-detail-grid{grid-template-columns:1fr}
  .ac-addr-card{flex-direction:column}
  .ac-addr-actions{flex-direction:row}
}
`

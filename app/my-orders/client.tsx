'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/app/components/AuthContext'
import type { Order } from '@/lib/supabase'

const STATUS_LABEL: Record<string, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  shipping: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã huỷ',
}
const STATUS_COLOR: Record<string, string> = {
  pending: '#d97706',
  confirmed: '#2563eb',
  shipping: '#7c3aed',
  delivered: '#2a7a4b',
  cancelled: '#dc2626',
}
const PAY_LABEL: Record<string, string> = {
  pending: 'Chưa thanh toán',
  verified: 'Đã thanh toán',
  failed: 'Thanh toán lỗi',
}
const PAY_COLOR: Record<string, string> = {
  pending: '#d97706',
  verified: '#2a7a4b',
  failed: '#dc2626',
}
const CARRIER_LABEL: Record<string, string> = {
  spx: 'Shopee Express',
  viettelpost: 'ViettelPost',
  other: 'Khác',
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

export default function MyOrdersClient() {
  const { user, sdkReady, login, logout } = useAuth()
  const [phone, setPhone] = useState('')
  const [savedPhone, setSavedPhone] = useState('')
  const [orders, setOrders] = useState<OrderWithItem[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [fetchError, setFetchError] = useState('')
  const [phoneInput, setPhoneInput] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  // Restore saved phone from localStorage
  useEffect(() => {
    try {
      const p = localStorage.getItem('fb_user_phone') ?? ''
      if (p) {
        setSavedPhone(p)
        setPhone(p)
        setPhoneInput(p)
      }
    } catch {}
  }, [])

  // Auto-fetch orders when user + phone are available
  useEffect(() => {
    if (user && savedPhone) {
      fetchOrders(savedPhone)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, savedPhone])

  async function fetchOrders(p: string) {
    setLoadingOrders(true)
    setFetchError('')
    setOrders([])
    try {
      const res = await fetch(`/api/my-orders?phone=${encodeURIComponent(p)}`)
      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: 'Lỗi không xác định' }))
        setFetchError(e.error ?? 'Không thể tải đơn hàng')
        return
      }
      const data = await res.json()
      setOrders(Array.isArray(data) ? data : [])
    } catch {
      setFetchError('Không thể kết nối. Vui lòng thử lại.')
    } finally {
      setLoadingOrders(false)
    }
  }

  function handlePhoneSubmit() {
    const p = phoneInput.trim().replace(/\s/g, '')
    if (p.length < 9) { setFetchError('Số điện thoại không hợp lệ'); return }
    try { localStorage.setItem('fb_user_phone', p) } catch {}
    setSavedPhone(p)
    setPhone(p)
    fetchOrders(p)
  }

  function handleChangePhone() {
    setSavedPhone('')
    setPhone('')
    setOrders([])
    setFetchError('')
    try { localStorage.removeItem('fb_user_phone') } catch {}
  }

  const fbAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID

  return (
    <>
      <style>{css}</style>
      <div className="mo-page">
        {/* Header */}
        <header className="mo-header">
          <a href="/" className="mo-logo">leviethoang<span>.shop</span></a>
          <div className="mo-header-right">
            <a href="/order" className="mo-nav-link">Đặt hàng</a>
            <a href="/" className="mo-nav-link">← Trang chủ</a>
          </div>
        </header>

        <main className="mo-main">
          <div className="mo-hero">
            <h1 className="mo-title">Đơn hàng của tôi</h1>
            <p className="mo-subtitle">Theo dõi trạng thái đơn hàng và thông tin vận chuyển</p>
          </div>

          {/* Not logged in */}
          {!user && (
            <div className="mo-login-box">
              <div className="mo-login-icon">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <rect width="40" height="40" rx="10" fill="#1877F2" />
                  <path d="M27 20h-4v12h-5V20h-3v-4h3v-2.5C18 10.9 19.9 9 23 9c1.4 0 2.6.1 3 .2V13h-2c-1.6 0-2 .8-2 1.9V16h4l-.5 4H22v12h-4V20h-4v-4h4v-2.5C18 10.9 19.9 9 23 9" fill="white" />
                </svg>
              </div>
              <h2 className="mo-login-title">Đăng nhập để xem đơn hàng</h2>
              <p className="mo-login-desc">
                Đăng nhập bằng Facebook để tra cứu và theo dõi đơn hàng của bạn một cách nhanh chóng.
              </p>
              {fbAppId ? (
                <button className="mo-fb-btn" onClick={login}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  Đăng nhập bằng Facebook
                </button>
              ) : (
                <div className="mo-no-fb">
                  <p>Facebook App chưa được cấu hình.</p>
                  <p style={{ marginTop: 8 }}>Thêm <code>NEXT_PUBLIC_FACEBOOK_APP_ID</code> vào file <code>.env</code></p>
                </div>
              )}
              <div className="mo-login-divider">
                <span>hoặc</span>
              </div>
              <p className="mo-phone-only-desc">Tra cứu đơn hàng bằng số điện thoại</p>
              <div className="mo-phone-row">
                <input
                  className="mo-phone-input"
                  type="tel"
                  placeholder="Nhập số điện thoại đặt hàng..."
                  value={phoneInput}
                  onChange={e => setPhoneInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handlePhoneSubmit()}
                />
                <button className="mo-phone-btn" onClick={handlePhoneSubmit}>Tra cứu</button>
              </div>
              {fetchError && <div className="mo-error">{fetchError}</div>}
              {loadingOrders && <div className="mo-loading"><div className="mo-spinner" /></div>}
              {!loadingOrders && orders.length > 0 && <OrderList orders={orders} expandedId={expandedId} setExpandedId={setExpandedId} phone={phone} onChangePhone={handleChangePhone} />}
            </div>
          )}

          {/* Logged in */}
          {user && (
            <div>
              <div className="mo-user-card">
                {user.picture && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.picture} alt={user.name} className="mo-avatar" />
                )}
                <div className="mo-user-info">
                  <div className="mo-user-name">{user.name}</div>
                  <div className="mo-user-fb">Đăng nhập qua Facebook</div>
                </div>
                <button className="mo-logout-btn" onClick={logout}>Đăng xuất</button>
              </div>

              {/* Phone number entry */}
              {!savedPhone && (
                <div className="mo-phone-box">
                  <div className="mo-phone-title">Nhập số điện thoại để xem đơn hàng</div>
                  <p className="mo-phone-desc">Nhập số điện thoại bạn đã dùng khi đặt hàng.</p>
                  <div className="mo-phone-row">
                    <input
                      className="mo-phone-input"
                      type="tel"
                      placeholder="09xxxxxxxx"
                      value={phoneInput}
                      onChange={e => setPhoneInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handlePhoneSubmit()}
                      autoFocus
                    />
                    <button className="mo-phone-btn" onClick={handlePhoneSubmit}>Xem đơn hàng</button>
                  </div>
                  {fetchError && <div className="mo-error">{fetchError}</div>}
                </div>
              )}

              {/* Orders section */}
              {savedPhone && (
                <>
                  {loadingOrders && <div className="mo-loading"><div className="mo-spinner" /></div>}
                  {fetchError && <div className="mo-error">{fetchError}</div>}
                  {!loadingOrders && (
                    <OrderList
                      orders={orders}
                      expandedId={expandedId}
                      setExpandedId={setExpandedId}
                      phone={savedPhone}
                      onChangePhone={handleChangePhone}
                    />
                  )}
                </>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  )
}

function OrderList({
  orders,
  expandedId,
  setExpandedId,
  phone,
  onChangePhone,
}: {
  orders: OrderWithItem[]
  expandedId: number | null
  setExpandedId: (id: number | null) => void
  phone: string
  onChangePhone: () => void
}) {
  if (orders.length === 0) {
    return (
      <div className="mo-empty-wrap">
        <div className="mo-empty-icon">📦</div>
        <div className="mo-empty-title">Không tìm thấy đơn hàng</div>
        <div className="mo-empty-desc">
          Số điện thoại <strong>{phone}</strong> chưa có đơn hàng nào.<br />
          Hãy kiểm tra lại số điện thoại bạn đã dùng khi đặt hàng.
        </div>
        <button className="mo-change-phone-btn" onClick={onChangePhone}>Đổi số điện thoại</button>
      </div>
    )
  }

  return (
    <div className="mo-orders-wrap">
      <div className="mo-orders-header">
        <div className="mo-orders-count">{orders.length} đơn hàng — SĐT: {phone}</div>
        <button className="mo-change-phone-btn-sm" onClick={onChangePhone}>Đổi SĐT</button>
      </div>
      <div className="mo-orders-list">
        {orders.map(order => {
          const isExpanded = expandedId === order.id
          const imgs = order.items?.images ?? []
          const title = order.item_title ?? order.items?.title ?? 'Đơn hàng'
          const statusColor = STATUS_COLOR[order.order_status] ?? '#666'
          const payColor = PAY_COLOR[order.payment_status] ?? '#666'
          return (
            <div key={order.id} className="mo-order-card">
              <div className="mo-order-top" onClick={() => setExpandedId(isExpanded ? null : order.id)}>
                <div className="mo-order-left">
                  {imgs.length > 0 && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imgs[0]} alt={title} className="mo-order-thumb" />
                  )}
                  {imgs.length === 0 && (
                    <div className="mo-order-thumb-placeholder">📦</div>
                  )}
                  <div className="mo-order-meta">
                    <div className="mo-order-number">{order.order_number}</div>
                    <div className="mo-order-title">{title}</div>
                    <div className="mo-order-date">{fmtDate(order.created_at)}</div>
                  </div>
                </div>
                <div className="mo-order-right">
                  <span className="mo-status-badge" style={{ background: statusColor + '18', color: statusColor }}>
                    {STATUS_LABEL[order.order_status] ?? order.order_status}
                  </span>
                  <span className="mo-expand-icon">{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {isExpanded && (
                <div className="mo-order-detail">
                  <div className="mo-detail-grid">
                    <div className="mo-detail-item">
                      <div className="mo-detail-label">Trạng thái đơn</div>
                      <div className="mo-detail-value" style={{ color: statusColor, fontWeight: 600 }}>
                        {STATUS_LABEL[order.order_status] ?? order.order_status}
                      </div>
                    </div>
                    <div className="mo-detail-item">
                      <div className="mo-detail-label">Thanh toán</div>
                      <div className="mo-detail-value" style={{ color: payColor, fontWeight: 600 }}>
                        {PAY_LABEL[order.payment_status] ?? order.payment_status}
                        {' · '}{order.payment_method === 'cod' ? 'COD' : 'Chuyển khoản'}
                      </div>
                    </div>
                    <div className="mo-detail-item">
                      <div className="mo-detail-label">Giá trị đơn hàng</div>
                      <div className="mo-detail-value">{fmtVND(order.total_amount ?? order.item_price)}</div>
                    </div>
                    <div className="mo-detail-item">
                      <div className="mo-detail-label">Địa chỉ giao hàng</div>
                      <div className="mo-detail-value">{order.customer_address}</div>
                    </div>
                    {order.shipping_carrier && order.order_status !== 'pending' && (
                      <div className="mo-detail-item">
                        <div className="mo-detail-label">Đơn vị vận chuyển</div>
                        <div className="mo-detail-value">{CARRIER_LABEL[order.shipping_carrier] ?? order.shipping_carrier}</div>
                      </div>
                    )}
                    {order.tracking_number && (
                      <div className="mo-detail-item">
                        <div className="mo-detail-label">Mã vận đơn</div>
                        <div className="mo-detail-value mo-tracking">
                          <span>{order.tracking_number}</span>
                          <button
                            className="mo-copy-btn"
                            onClick={() => navigator.clipboard.writeText(order.tracking_number!).catch(() => {})}
                          >
                            Sao chép
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="mo-detail-item">
                      <div className="mo-detail-label">Ngày đặt hàng</div>
                      <div className="mo-detail-value">{fmtDate(order.created_at)}</div>
                    </div>
                    <div className="mo-detail-item">
                      <div className="mo-detail-label">Cập nhật lần cuối</div>
                      <div className="mo-detail-value">{fmtDate(order.updated_at)}</div>
                    </div>
                  </div>

                  {order.order_status === 'shipping' && order.tracking_number && (
                    <div className="mo-track-hint">
                      Đơn hàng đang được giao — mã vận đơn <strong>{order.tracking_number}</strong> qua {CARRIER_LABEL[order.shipping_carrier] ?? order.shipping_carrier}.
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const css = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Be Vietnam Pro',sans-serif;background:#f9f8f6;color:#1a1916;font-size:14px;line-height:1.6}
.mo-page{min-height:100vh}
.mo-header{display:flex;align-items:center;justify-content:space-between;padding:14px 32px;background:#fff;border-bottom:1px solid #e8e6e1;position:sticky;top:0;z-index:100}
.mo-logo{font-size:16px;font-weight:600;color:#1a1916;text-decoration:none}
.mo-logo span{color:#8c8982;font-weight:300}
.mo-header-right{display:flex;align-items:center;gap:16px}
.mo-nav-link{font-size:13px;color:#8c8982;text-decoration:none;white-space:nowrap}
.mo-nav-link:hover{color:#1a1916}
.mo-main{max-width:720px;margin:0 auto;padding:40px 20px}
.mo-hero{text-align:center;margin-bottom:36px}
.mo-title{font-size:28px;font-weight:700;margin-bottom:8px}
.mo-subtitle{font-size:15px;color:#8c8982}
/* Login box */
.mo-login-box{background:#fff;border:1px solid #e8e6e1;border-radius:14px;padding:40px 32px;text-align:center;max-width:480px;margin:0 auto}
.mo-login-icon{margin-bottom:16px;display:flex;justify-content:center}
.mo-login-title{font-size:20px;font-weight:700;margin-bottom:8px}
.mo-login-desc{font-size:14px;color:#8c8982;margin-bottom:24px;line-height:1.6}
.mo-fb-btn{display:inline-flex;align-items:center;gap:10px;background:#1877F2;color:#fff;border:none;padding:12px 24px;border-radius:9px;font-family:inherit;font-size:15px;font-weight:600;cursor:pointer;transition:opacity .15s}
.mo-fb-btn:hover{opacity:.9}
.mo-no-fb{background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:16px;font-size:13px;color:#856404;margin-bottom:16px}
.mo-no-fb code{background:#ffe;padding:2px 6px;border-radius:4px;font-size:12px}
.mo-login-divider{display:flex;align-items:center;gap:12px;margin:20px 0;color:#c8c6c0;font-size:12px}
.mo-login-divider::before,.mo-login-divider::after{content:'';flex:1;height:1px;background:#e8e6e1}
.mo-phone-only-desc{font-size:13px;color:#8c8982;margin-bottom:10px}
/* Phone input */
.mo-phone-row{display:flex;gap:8px}
.mo-phone-input{flex:1;font-size:14px;font-family:inherit;color:#1a1916;background:#f9f8f6;border:1px solid #e8e6e1;border-radius:7px;padding:9px 12px;outline:none;transition:border-color .15s}
.mo-phone-input:focus{border-color:#1a1916;background:#fff}
.mo-phone-btn{background:#1a1916;color:#fff;border:none;padding:9px 18px;border-radius:7px;font-family:inherit;font-size:14px;font-weight:500;cursor:pointer;white-space:nowrap;transition:opacity .15s}
.mo-phone-btn:hover{opacity:.85}
.mo-error{margin-top:12px;padding:10px 14px;background:#fef2f2;border:1px solid #fecaca;border-radius:7px;color:#dc2626;font-size:13px;text-align:left}
.mo-loading{display:flex;justify-content:center;padding:40px 0}
.mo-spinner{width:28px;height:28px;border:3px solid #e8e6e1;border-top-color:#1a1916;border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
/* User card */
.mo-user-card{display:flex;align-items:center;gap:14px;background:#fff;border:1px solid #e8e6e1;border-radius:12px;padding:16px 20px;margin-bottom:24px}
.mo-avatar{width:48px;height:48px;border-radius:50%;object-fit:cover;flex-shrink:0}
.mo-user-info{flex:1;min-width:0}
.mo-user-name{font-size:16px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mo-user-fb{font-size:12px;color:#8c8982}
.mo-logout-btn{background:none;border:1px solid #e8e6e1;color:#8c8982;padding:6px 14px;border-radius:7px;font-family:inherit;font-size:13px;cursor:pointer;white-space:nowrap;transition:all .15s;flex-shrink:0}
.mo-logout-btn:hover{border-color:#1a1916;color:#1a1916}
/* Phone box */
.mo-phone-box{background:#fff;border:1px solid #e8e6e1;border-radius:12px;padding:24px 20px;margin-bottom:24px}
.mo-phone-title{font-size:16px;font-weight:600;margin-bottom:6px}
.mo-phone-desc{font-size:13px;color:#8c8982;margin-bottom:14px}
/* Orders */
.mo-orders-wrap{margin-top:0}
.mo-orders-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.mo-orders-count{font-size:13px;color:#8c8982}
.mo-change-phone-btn-sm{background:none;border:1px solid #e8e6e1;color:#8c8982;padding:5px 12px;border-radius:6px;font-family:inherit;font-size:12px;cursor:pointer;transition:all .15s}
.mo-change-phone-btn-sm:hover{border-color:#1a1916;color:#1a1916}
.mo-orders-list{display:flex;flex-direction:column;gap:10px}
.mo-order-card{background:#fff;border:1px solid #e8e6e1;border-radius:12px;overflow:hidden;transition:border-color .15s}
.mo-order-card:hover{border-color:#bbb8b0}
.mo-order-top{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;cursor:pointer;gap:12px}
.mo-order-left{display:flex;align-items:center;gap:14px;flex:1;min-width:0}
.mo-order-thumb{width:56px;height:56px;object-fit:cover;border-radius:8px;flex-shrink:0}
.mo-order-thumb-placeholder{width:56px;height:56px;background:#f0efe9;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0}
.mo-order-meta{min-width:0}
.mo-order-number{font-size:12px;font-weight:700;color:#8c8982;letter-spacing:.5px;font-family:monospace;margin-bottom:2px}
.mo-order-title{font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px}
.mo-order-date{font-size:12px;color:#8c8982}
.mo-order-right{display:flex;align-items:center;gap:10px;flex-shrink:0}
.mo-status-badge{font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px;white-space:nowrap}
.mo-expand-icon{font-size:10px;color:#8c8982}
/* Detail */
.mo-order-detail{border-top:1px solid #f0efe9;padding:18px 18px 20px;background:#fafaf8}
.mo-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.mo-detail-item{}
.mo-detail-label{font-size:10px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:#8c8982;margin-bottom:3px}
.mo-detail-value{font-size:13px;color:#1a1916}
.mo-tracking{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.mo-copy-btn{font-size:11px;padding:2px 8px;border:1px solid #e8e6e1;border-radius:4px;background:#fff;cursor:pointer;font-family:inherit;color:#8c8982;transition:all .15s}
.mo-copy-btn:hover{border-color:#1a1916;color:#1a1916}
.mo-track-hint{margin-top:14px;padding:10px 14px;background:#f0f7ff;border:1px solid #bfdbfe;border-radius:8px;font-size:13px;color:#1e40af;line-height:1.5}
/* Empty state */
.mo-empty-wrap{text-align:center;padding:48px 20px}
.mo-empty-icon{font-size:48px;margin-bottom:14px}
.mo-empty-title{font-size:18px;font-weight:700;margin-bottom:8px}
.mo-empty-desc{font-size:14px;color:#8c8982;margin-bottom:20px;line-height:1.6}
.mo-change-phone-btn{background:#fff;border:1px solid #e8e6e1;color:#1a1916;padding:9px 20px;border-radius:8px;font-family:inherit;font-size:14px;cursor:pointer;transition:all .15s}
.mo-change-phone-btn:hover{border-color:#1a1916;background:#f9f8f6}
@media(max-width:600px){
  .mo-header{padding:12px 16px}
  .mo-main{padding:24px 14px}
  .mo-login-box{padding:28px 18px}
  .mo-detail-grid{grid-template-columns:1fr}
  .mo-order-thumb,.mo-order-thumb-placeholder{width:48px;height:48px}
}
`

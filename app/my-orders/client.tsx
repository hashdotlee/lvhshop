'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
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
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

type OrderLineItem = {
  id: number
  item_title: string
  item_price: number | null
  quantity: number
  order_code: string | null
}

type OrderWithItem = Order & {
  items?: { title: string; price: number | null; order_code: string; images: string[] } | null
  order_items?: OrderLineItem[]
}

const STORAGE_PHONE = 'ord_customer_phone'

export default function MyOrdersClient() {
  const [supaUser, setSupaUser] = useState<{ email: string; name: string } | null>(null)
  const [phoneInput, setPhoneInput] = useState('')
  const [savedPhone, setSavedPhone] = useState('')
  const [orders, setOrders] = useState<OrderWithItem[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [fetchError, setFetchError] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [printOrder, setPrintOrder] = useState<OrderWithItem | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const name = session.user.user_metadata?.full_name ?? session.user.email ?? ''
        setSupaUser({ email: session.user.email ?? '', name })
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const name = session.user.user_metadata?.full_name ?? session.user.email ?? ''
        setSupaUser({ email: session.user.email ?? '', name })
      } else {
        setSupaUser(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    try {
      const p = localStorage.getItem(STORAGE_PHONE) ?? ''
      if (p) {
        setSavedPhone(p)
        setPhoneInput(p)
        fetchOrders(p)
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    function onAfterPrint() { setPrintOrder(null) }
    window.addEventListener('afterprint', onAfterPrint)
    return () => window.removeEventListener('afterprint', onAfterPrint)
  }, [])

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
    try { localStorage.setItem(STORAGE_PHONE, p) } catch {}
    setSavedPhone(p)
    fetchOrders(p)
  }

  function handleChangePhone() {
    setSavedPhone('')
    setOrders([])
    setFetchError('')
    try { localStorage.removeItem(STORAGE_PHONE) } catch {}
  }

  function handlePrint(order: OrderWithItem) {
    setPrintOrder(order)
    setTimeout(() => window.print(), 80)
  }

  return (
    <>
      <style>{css}</style>
      <div className="mo-page">
        <header className="mo-header">
          <a href="/" className="mo-logo">leviethoang<span>.shop</span></a>
          <div className="mo-header-right">
            <a href="/order" className="mo-nav-link">Đặt hàng</a>
            {supaUser && (
              <div className="mo-user-chip">
                <span>{supaUser.name.split(' ').pop()}</span>
                <button onClick={() => supabase.auth.signOut()} title="Đăng xuất">×</button>
              </div>
            )}
            <a href="/" className="mo-nav-link">← Trang chủ</a>
          </div>
        </header>

        <main className="mo-main">
          <div className="mo-hero">
            <h1 className="mo-title">Đơn hàng của tôi</h1>
            <p className="mo-subtitle">Tra cứu trạng thái đơn hàng theo số điện thoại đặt hàng</p>
          </div>

          {!savedPhone && (
            <div className="mo-lookup-box">
              <div className="mo-lookup-title">Nhập số điện thoại đặt hàng</div>
              <p className="mo-lookup-desc">Nhập số điện thoại bạn đã dùng khi đặt hàng để xem trạng thái đơn.</p>
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
                <button className="mo-phone-btn" onClick={handlePhoneSubmit}>Tra cứu</button>
              </div>
              {fetchError && <div className="mo-error">{fetchError}</div>}
              {loadingOrders && <div className="mo-loading"><div className="mo-spinner" /></div>}
            </div>
          )}

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
                  onPrint={handlePrint}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* ── Printable invoice — hidden on screen, visible only when printing ── */}
      {printOrder && (
        <div ref={printRef} className="inv-print-wrap">
          <InvoiceDocument order={printOrder} />
        </div>
      )}
    </>
  )
}

// ─── Invoice document ─────────────────────────────────────────────
function InvoiceDocument({ order }: { order: OrderWithItem }) {
  const lineItems: OrderLineItem[] =
    order.order_items && order.order_items.length > 0
      ? order.order_items
      : order.item_title
        ? [{ id: 0, item_title: order.item_title, item_price: order.item_price, quantity: 1, order_code: order.items?.order_code ?? null }]
        : []

  const subtotal = lineItems.reduce((s, i) => s + (i.item_price ?? 0) * i.quantity, 0)
  const total = (order.total_amount ?? subtotal) || null

  return (
    <>
      {/* ── Shop header ── */}
      <div className="inv-header">
        <div className="inv-shop-name">leviethoang<span>.shop</span></div>
        <div className="inv-doc-title">PHIẾU XÁC NHẬN ĐƠN HÀNG</div>
      </div>

      <div className="inv-meta-row">
        <div className="inv-meta-left">
          <div className="inv-meta-line"><span>Mã đơn:</span> <strong>{order.order_number}</strong></div>
          <div className="inv-meta-line"><span>Ngày đặt:</span> {fmtDateTime(order.created_at)}</div>
          <div className="inv-meta-line">
            <span>Trạng thái:</span>{' '}
            <strong>{STATUS_LABEL[order.order_status] ?? order.order_status}</strong>
          </div>
        </div>
        <div className="inv-meta-right">
          <div className="inv-meta-line"><span>Thanh toán:</span> <strong>{order.payment_method === 'cod' ? 'COD' : 'Chuyển khoản'}</strong></div>
          <div className="inv-meta-line">
            <span>TT Thanh toán:</span>{' '}
            <strong>{PAY_LABEL[order.payment_status] ?? order.payment_status}</strong>
          </div>
          {order.shipping_carrier && (
            <div className="inv-meta-line"><span>Vận chuyển:</span> {CARRIER_LABEL[order.shipping_carrier] ?? order.shipping_carrier}</div>
          )}
          {order.tracking_number && (
            <div className="inv-meta-line"><span>Mã vận đơn:</span> <strong>{order.tracking_number}</strong></div>
          )}
        </div>
      </div>

      <div className="inv-divider" />

      {/* ── Customer info ── */}
      <div className="inv-section-title">THÔNG TIN NGƯỜI NHẬN</div>
      <div className="inv-customer-grid">
        <div className="inv-cust-row"><span>Họ tên:</span> <strong>{order.customer_name}</strong></div>
        <div className="inv-cust-row"><span>Số điện thoại:</span> <strong>{order.customer_phone}</strong></div>
        <div className="inv-cust-row inv-cust-full"><span>Địa chỉ giao hàng:</span> <strong>{order.customer_address}</strong></div>
        {order.customer_note && (
          <div className="inv-cust-row inv-cust-full"><span>Ghi chú:</span> {order.customer_note}</div>
        )}
      </div>

      <div className="inv-divider" />

      {/* ── Items table ── */}
      <div className="inv-section-title">CHI TIẾT SẢN PHẨM</div>
      <table className="inv-table">
        <thead>
          <tr>
            <th className="inv-th-stt">STT</th>
            <th className="inv-th-name">Tên sản phẩm</th>
            <th className="inv-th-code">Mã SP</th>
            <th className="inv-th-qty">SL</th>
            <th className="inv-th-price">Đơn giá</th>
            <th className="inv-th-total">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((oi, idx) => (
            <tr key={oi.id || idx}>
              <td className="inv-td-center">{idx + 1}</td>
              <td>{oi.item_title}</td>
              <td className="inv-td-code">{oi.order_code ?? '—'}</td>
              <td className="inv-td-center">{oi.quantity}</td>
              <td className="inv-td-right">{fmtVND(oi.item_price)}</td>
              <td className="inv-td-right inv-td-bold">{fmtVND(oi.item_price ? oi.item_price * oi.quantity : null)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Total ── */}
      <div className="inv-total-wrap">
        {subtotal > 0 && lineItems.length > 1 && total !== subtotal && (
          <div className="inv-total-row">
            <span>Tạm tính</span>
            <span>{fmtVND(subtotal)}</span>
          </div>
        )}
        <div className="inv-total-row inv-grand-total">
          <span>TỔNG CỘNG</span>
          <span>{fmtVND(total)}</span>
        </div>
        <div className="inv-pay-method">
          {order.payment_method === 'cod'
            ? 'Thanh toán khi nhận hàng (COD)'
            : 'Chuyển khoản ngân hàng'}
          {order.payment_status === 'verified' && ' · Đã thanh toán'}
        </div>
      </div>

      <div className="inv-divider" />

      {/* ── Footer ── */}
      <div className="inv-footer">
        <div className="inv-footer-note">
          Cảm ơn bạn đã tin tưởng mua hàng tại <strong>leviethoang.shop</strong>!<br />
          Mọi thắc mắc vui lòng liên hệ qua trang web hoặc số điện thoại ghi trên sản phẩm.
        </div>
        <div className="inv-footer-url">leviethoang.shop</div>
      </div>
    </>
  )
}

// ─── Order list component ─────────────────────────────────────────
function OrderList({
  orders,
  expandedId,
  setExpandedId,
  phone,
  onChangePhone,
  onPrint,
}: {
  orders: OrderWithItem[]
  expandedId: number | null
  setExpandedId: (id: number | null) => void
  phone: string
  onChangePhone: () => void
  onPrint: (order: OrderWithItem) => void
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
                  {imgs.length > 0 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imgs[0]} alt={title} className="mo-order-thumb" />
                  ) : (
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
                  {/* Order items list */}
                  {order.order_items && order.order_items.length > 0 && (
                    <div className="mo-items-list">
                      <div className="mo-detail-label" style={{ marginBottom: 6 }}>Sản phẩm đặt hàng</div>
                      {order.order_items.map(oi => (
                        <div key={oi.id} className="mo-item-row">
                          <div className="mo-item-row-left">
                            <span className="mo-item-title">{oi.item_title}{oi.quantity > 1 ? ` ×${oi.quantity}` : ''}</span>
                            {oi.order_code && <code className="mo-item-code">{oi.order_code}</code>}
                          </div>
                          <span className="mo-item-price">{fmtVND(oi.item_price ? oi.item_price * oi.quantity : null)}</span>
                        </div>
                      ))}
                    </div>
                  )}

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

                  {/* Print invoice button */}
                  <div className="mo-invoice-bar">
                    <button className="mo-print-btn" onClick={e => { e.stopPropagation(); onPrint(order) }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
                        <rect x="6" y="14" width="12" height="8"/>
                      </svg>
                      In / Lưu hóa đơn
                    </button>
                    <span className="mo-invoice-hint">Hóa đơn dạng A4 để đối chiếu</span>
                  </div>
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
.mo-user-chip{display:flex;align-items:center;gap:4px;background:#f0efe9;border-radius:20px;padding:3px 10px;font-size:13px;font-weight:500}
.mo-user-chip button{background:none;border:none;cursor:pointer;font-size:16px;color:#8c8982;line-height:1;padding:0 0 0 2px}
.mo-user-chip button:hover{color:#1a1916}
.mo-main{max-width:720px;margin:0 auto;padding:40px 20px}
.mo-hero{text-align:center;margin-bottom:36px}
.mo-title{font-size:28px;font-weight:700;margin-bottom:8px}
.mo-subtitle{font-size:15px;color:#8c8982}
/* Lookup box */
.mo-lookup-box{background:#fff;border:1px solid #e8e6e1;border-radius:14px;padding:32px 28px;max-width:480px;margin:0 auto}
.mo-lookup-title{font-size:16px;font-weight:700;margin-bottom:8px}
.mo-lookup-desc{font-size:13px;color:#8c8982;margin-bottom:20px;line-height:1.6}
/* Phone input */
.mo-phone-row{display:flex;gap:8px}
.mo-phone-input{flex:1;font-size:14px;font-family:inherit;color:#1a1916;background:#f9f8f6;border:1px solid #e8e6e1;border-radius:7px;padding:9px 12px;outline:none;transition:border-color .15s}
.mo-phone-input:focus{border-color:#1a1916;background:#fff}
.mo-phone-btn{background:#1a1916;color:#fff;border:none;padding:9px 18px;border-radius:7px;font-family:inherit;font-size:14px;font-weight:500;cursor:pointer;white-space:nowrap;transition:opacity .15s}
.mo-phone-btn:hover{opacity:.85}
.mo-error{margin-top:12px;padding:10px 14px;background:#fef2f2;border:1px solid #fecaca;border-radius:7px;color:#dc2626;font-size:13px}
.mo-loading{display:flex;justify-content:center;padding:40px 0}
.mo-spinner{width:28px;height:28px;border:3px solid #e8e6e1;border-top-color:#1a1916;border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
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
.mo-detail-label{font-size:10px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:#8c8982;margin-bottom:3px}
.mo-detail-value{font-size:13px;color:#1a1916}
.mo-tracking{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.mo-copy-btn{font-size:11px;padding:2px 8px;border:1px solid #e8e6e1;border-radius:4px;background:#fff;cursor:pointer;font-family:inherit;color:#8c8982;transition:all .15s}
.mo-copy-btn:hover{border-color:#1a1916;color:#1a1916}
.mo-track-hint{margin-top:14px;padding:10px 14px;background:#f0f7ff;border:1px solid #bfdbfe;border-radius:8px;font-size:13px;color:#1e40af;line-height:1.5}
/* items list */
.mo-items-list{margin-bottom:14px;border:1px solid #e8e6e1;border-radius:8px;overflow:hidden}
.mo-item-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 12px;border-bottom:1px dashed #e8e6e1;background:#fff}
.mo-item-row:last-child{border-bottom:none}
.mo-item-row-left{display:flex;flex-direction:column;gap:3px;min-width:0}
.mo-item-title{font-size:13px;font-weight:500;color:#1a1916}
.mo-item-code{font-size:10px;font-family:monospace;color:#8c8982;background:#f0efe9;padding:1px 6px;border-radius:3px;width:fit-content}
.mo-item-price{font-size:13px;font-weight:700;color:#2a7a4b;white-space:nowrap;flex-shrink:0}
/* Invoice action bar */
.mo-invoice-bar{display:flex;align-items:center;gap:12px;margin-top:16px;padding-top:14px;border-top:1px solid #e8e6e1}
.mo-print-btn{display:inline-flex;align-items:center;gap:7px;background:#1a1916;color:#fff;border:none;padding:8px 16px;border-radius:7px;font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;transition:opacity .15s;white-space:nowrap}
.mo-print-btn:hover{opacity:.85}
.mo-invoice-hint{font-size:12px;color:#8c8982}
/* Empty state */
.mo-empty-wrap{text-align:center;padding:48px 20px}
.mo-empty-icon{font-size:48px;margin-bottom:14px}
.mo-empty-title{font-size:18px;font-weight:700;margin-bottom:8px}
.mo-empty-desc{font-size:14px;color:#8c8982;margin-bottom:20px;line-height:1.6}
.mo-change-phone-btn{background:#fff;border:1px solid #e8e6e1;color:#1a1916;padding:9px 20px;border-radius:8px;font-family:inherit;font-size:14px;cursor:pointer;transition:all .15s}
.mo-change-phone-btn:hover{border-color:#1a1916;background:#f9f8f6}

/* ═══════════════════════════════════════════
   INVOICE PRINT — A4, screen preview hidden
   ═══════════════════════════════════════════ */
.inv-print-wrap{display:none}

@page{size:A4;margin:16mm 16mm 14mm}
@media print{
  body *{visibility:hidden}
  .inv-print-wrap{
    display:block!important;visibility:visible;
    position:fixed;inset:0;z-index:9999;
    background:white;padding:0;
    font-family:'Be Vietnam Pro',Arial,sans-serif;font-size:10pt;color:#111;
    line-height:1.5;
  }
  .inv-print-wrap *{visibility:visible}
}

/* Header */
.inv-header{text-align:center;margin-bottom:14pt;padding-bottom:10pt;border-bottom:2px solid #1a1916}
.inv-shop-name{font-size:22pt;font-weight:800;letter-spacing:-.5px;color:#1a1916}
.inv-shop-name span{font-weight:300;color:#666}
.inv-doc-title{font-size:13pt;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#444;margin-top:4pt}

/* Meta row */
.inv-meta-row{display:flex;gap:24pt;margin-bottom:12pt}
.inv-meta-left,.inv-meta-right{flex:1}
.inv-meta-line{font-size:9.5pt;margin-bottom:3pt;display:flex;gap:6pt}
.inv-meta-line span{color:#666;min-width:90pt;flex-shrink:0}
.inv-meta-line strong{color:#111}

/* Divider */
.inv-divider{border:none;border-top:1px solid #ddd;margin:10pt 0}

/* Section title */
.inv-section-title{font-size:8pt;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#888;margin-bottom:7pt}

/* Customer */
.inv-customer-grid{display:grid;grid-template-columns:1fr 1fr;gap:5pt 20pt;margin-bottom:4pt}
.inv-cust-row{font-size:9.5pt;display:flex;gap:6pt}
.inv-cust-row span{color:#666;min-width:80pt;flex-shrink:0}
.inv-cust-row strong{color:#111}
.inv-cust-full{grid-column:1/-1}

/* Items table */
.inv-table{width:100%;border-collapse:collapse;margin-bottom:0;font-size:9.5pt}
.inv-table thead tr{background:#f0efe9;border-bottom:1.5px solid #ccc}
.inv-table th{padding:6pt 8pt;text-align:left;font-size:8pt;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:#666}
.inv-th-stt{width:28pt;text-align:center}
.inv-th-name{min-width:160pt}
.inv-th-code{width:90pt}
.inv-th-qty{width:24pt;text-align:center}
.inv-th-price{width:72pt;text-align:right}
.inv-th-total{width:80pt;text-align:right}
.inv-table tbody tr{border-bottom:1px dashed #e0e0e0}
.inv-table tbody tr:last-child{border-bottom:none}
.inv-table td{padding:7pt 8pt;vertical-align:top}
.inv-td-center{text-align:center;color:#666}
.inv-td-code{font-family:monospace;font-size:8.5pt;color:#555}
.inv-td-right{text-align:right}
.inv-td-bold{font-weight:700;color:#1a1916}

/* Total */
.inv-total-wrap{border-top:1.5px solid #1a1916;margin-top:0;padding-top:8pt}
.inv-total-row{display:flex;justify-content:space-between;align-items:center;font-size:9.5pt;color:#666;padding:2pt 8pt}
.inv-grand-total{font-size:13pt;font-weight:800;color:#1a1916;padding:6pt 8pt;border-top:1px solid #e0e0e0;margin-top:2pt}
.inv-pay-method{font-size:9pt;color:#555;text-align:right;padding:2pt 8pt 6pt}

/* Footer */
.inv-footer{margin-top:12pt;text-align:center;padding-top:8pt;border-top:1px dashed #ccc}
.inv-footer-note{font-size:9pt;color:#666;line-height:1.6;margin-bottom:4pt}
.inv-footer-note strong{color:#1a1916}
.inv-footer-url{font-size:10pt;font-weight:700;color:#1a1916;letter-spacing:-.3px}

@media(max-width:600px){
  .mo-header{padding:12px 16px}
  .mo-main{padding:24px 14px}
  .mo-lookup-box{padding:24px 16px}
  .mo-detail-grid{grid-template-columns:1fr}
  .mo-order-thumb,.mo-order-thumb-placeholder{width:48px;height:48px}
  .mo-invoice-bar{flex-direction:column;align-items:flex-start;gap:6px}
}
`

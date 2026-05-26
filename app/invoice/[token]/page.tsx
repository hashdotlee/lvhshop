import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { unstable_noStore as noStore } from 'next/cache'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type OrderItem = { id: number; item_title: string; item_price: number | null; quantity: number }
type Order = {
  id: number
  order_number: string
  item_title: string | null
  item_price: number | null
  customer_name: string
  customer_phone: string
  customer_address: string
  customer_note: string | null
  tracking_number: string | null
  shipping_carrier: string
  payment_method: string
  payment_status: string
  order_status: string
  total_amount: number | null
  created_at: string
  order_items: OrderItem[]
}

async function getOrder(token: string): Promise<Order | null> {
  noStore()
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
  )
  const { data } = await db
    .from('orders')
    .select('*, order_items(id, item_title, item_price, quantity)')
    .eq('share_token', token)
    .single()
  return data as Order | null
}

export async function generateMetadata({ params }: { params: { token: string } }): Promise<Metadata> {
  const order = await getOrder(params.token)
  if (!order) return { title: 'Hóa đơn · leviethoang.shop' }
  return {
    title: `Hóa đơn ${order.order_number} · leviethoang.shop`,
    robots: { index: false },
  }
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  shipping: 'Đang giao hàng',
  delivered: 'Đã giao hàng',
  cancelled: 'Đã huỷ',
}
const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  pending:   { bg: '#fff7ed', color: '#c2410c' },
  confirmed: { bg: '#eff6ff', color: '#1d4ed8' },
  shipping:  { bg: '#f5f3ff', color: '#6d28d9' },
  delivered: { bg: '#f0fdf4', color: '#15803d' },
  cancelled: { bg: '#fef2f2', color: '#b91c1c' },
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
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function maskPhone(phone: string) {
  if (phone.length < 7) return phone
  return phone.slice(0, 3) + '***' + phone.slice(-3)
}

export default async function InvoicePage({ params }: { params: { token: string } }) {
  const order = await getOrder(params.token)
  if (!order) notFound()

  const items = order.order_items ?? []
  const total = order.total_amount ??
    (items.length > 0 ? items.reduce((s, i) => s + (i.item_price ?? 0) * i.quantity, 0) || null : null)

  const BANK_ID   = process.env.NEXT_PUBLIC_BANK_ID ?? ''
  const BANK_ACCT = process.env.NEXT_PUBLIC_BANK_ACCOUNT ?? ''
  const BANK_NAME = process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME ?? ''
  const isBankTransfer = order.payment_method === 'bank_transfer'
  const qrUrl = isBankTransfer && BANK_ID && BANK_ACCT
    ? `https://img.vietqr.io/image/${BANK_ID}-${BANK_ACCT}-compact2.png` +
      `?${total ? `amount=${total}&` : ''}addInfo=${encodeURIComponent(order.order_number)}&accountName=${encodeURIComponent(BANK_NAME)}`
    : null

  const st = STATUS_STYLE[order.order_status] ?? { bg: '#f4f3f0', color: '#555' }

  const divider = <hr style={{ border: 'none', borderTop: '1px dashed #ddd', margin: '20px 0' }} />

  return (
    <div style={{ minHeight: '100vh', background: '#f2f1ee', padding: '24px 16px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      <div style={{ background: 'white', borderRadius: 16, maxWidth: 480, width: '100%', padding: '32px 28px', boxShadow: '0 2px 32px rgba(0,0,0,.07)' }}>

        {/* Shop header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.5px', color: '#1a1916' }}>
            leviethoang<span style={{ fontWeight: 300, color: '#888' }}>.shop</span>
          </div>
          <div style={{ fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', color: '#aaa', marginTop: 5 }}>Hóa đơn đặt hàng</div>
        </div>

        {divider}

        {/* Order meta */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.8px', color: '#aaa', marginBottom: 5 }}>Mã đơn hàng</div>
            <code style={{ fontSize: 17, fontWeight: 700, background: '#f4f3f0', padding: '4px 10px', borderRadius: 6, color: '#1a1916' }}>{order.order_number}</code>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.8px', color: '#aaa', marginBottom: 5 }}>Ngày đặt</div>
            <div style={{ fontSize: 12, color: '#666' }}>{fmtDate(order.created_at)}</div>
          </div>
        </div>

        <div>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20, background: st.bg, color: st.color }}>
            {STATUS_LABEL[order.order_status] ?? order.order_status}
          </span>
        </div>

        {divider}

        {/* Customer */}
        <div style={{ marginBottom: 0 }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.8px', color: '#aaa', marginBottom: 8 }}>Thông tin giao hàng</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1916' }}>{order.customer_name}</div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 3 }}>{maskPhone(order.customer_phone)}</div>
          <div style={{ fontSize: 13, color: '#555', marginTop: 6, lineHeight: 1.6 }}>{order.customer_address}</div>
          {order.customer_note && (
            <div style={{ fontSize: 12, color: '#999', marginTop: 6, fontStyle: 'italic' }}>Ghi chú: {order.customer_note}</div>
          )}
        </div>

        {divider}

        {/* Items */}
        <div>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.8px', color: '#aaa', marginBottom: 10 }}>Sản phẩm</div>
          {(items.length > 0 ? items : [{ id: 0, item_title: order.item_title ?? '—', item_price: order.item_price, quantity: 1 }]).map((item, idx) => (
            <div key={item.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: '1px dashed #eee' }}>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#1a1916', lineHeight: 1.5 }}>
                {item.item_title}
                {item.quantity > 1 && <span style={{ color: '#aaa', fontSize: 11, marginLeft: 6 }}>×{item.quantity}</span>}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#2a7a4b', whiteSpace: 'nowrap' }}>
                {fmtVND(item.item_price ? item.item_price * item.quantity : null)}
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f4f3f0', borderRadius: 10, padding: '14px 18px', margin: '20px 0 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#555' }}>Tổng cộng</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#2a7a4b' }}>{fmtVND(total)}</div>
        </div>

        {/* Payment method */}
        {isBankTransfer && qrUrl && order.payment_status !== 'verified' ? (
          <>
            {divider}
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '20px 20px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>
                Chuyển khoản ngân hàng
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrUrl} alt="QR thanh toán" style={{ width: 200, height: 200, borderRadius: 12, border: '1px solid #dbeafe', display: 'block', margin: '0 auto 16px' }} />
              <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 6, textAlign: 'left', background: 'white', borderRadius: 10, padding: '12px 18px', fontSize: 13 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <span style={{ color: '#888', minWidth: 80 }}>Ngân hàng</span>
                  <strong>{BANK_ID.toUpperCase()}</strong>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <span style={{ color: '#888', minWidth: 80 }}>Số tài khoản</span>
                  <strong style={{ fontFamily: 'monospace', letterSpacing: '1px' }}>{BANK_ACCT}</strong>
                </div>
                {BANK_NAME && (
                  <div style={{ display: 'flex', gap: 12 }}>
                    <span style={{ color: '#888', minWidth: 80 }}>Chủ TK</span>
                    <strong>{BANK_NAME}</strong>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 12 }}>
                  <span style={{ color: '#888', minWidth: 80 }}>Nội dung</span>
                  <strong style={{ color: '#1d4ed8' }}>{order.order_number}</strong>
                </div>
                {total && (
                  <div style={{ display: 'flex', gap: 12 }}>
                    <span style={{ color: '#888', minWidth: 80 }}>Số tiền</span>
                    <strong style={{ color: '#15803d', fontSize: 15 }}>{fmtVND(total)}</strong>
                  </div>
                )}
              </div>
              <div style={{ fontSize: 11, color: '#93c5fd', marginTop: 12 }}>Quét mã hoặc chuyển khoản thủ công theo thông tin trên</div>
            </div>
          </>
        ) : order.payment_status === 'verified' ? (
          <>
            {divider}
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '20px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#15803d', marginBottom: 6 }}>Đã thanh toán</div>
              <div style={{ fontSize: 13, color: '#4ade80' }}>
                {isBankTransfer ? 'Chuyển khoản ngân hàng đã được xác nhận' : 'Thanh toán COD đã được xác nhận'}
              </div>
            </div>
          </>
        ) : (
          <div style={{ fontSize: 13, color: '#555', marginBottom: 4 }}>
            <span style={{ color: '#aaa' }}>Thanh toán: </span>
            <span style={{ fontWeight: 600, color: '#1a1916' }}>
              {isBankTransfer ? 'Chuyển khoản ngân hàng' : 'COD — Trả tiền khi nhận hàng'}
            </span>
          </div>
        )}

        {/* Tracking */}
        {order.tracking_number && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 16px', marginTop: 16, marginBottom: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 4 }}>
              {CARRIER_LABEL[order.shipping_carrier] ?? order.shipping_carrier}
            </div>
            <div style={{ fontSize: 13, color: '#555' }}>
              Mã vận đơn: <code style={{ fontWeight: 700, color: '#1a1916', background: '#dcfce7', padding: '1px 6px', borderRadius: 4 }}>{order.tracking_number}</code>
            </div>
          </div>
        )}

        {divider}

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: 13, color: '#aaa', lineHeight: 1.8 }}>
          Cảm ơn bạn đã tin tưởng <strong style={{ color: '#1a1916' }}>leviethoang.shop</strong>!<br />
          Nhân viên sẽ liên hệ xác nhận sớm nhất có thể. 🙏
        </div>
      </div>
    </div>
  )
}

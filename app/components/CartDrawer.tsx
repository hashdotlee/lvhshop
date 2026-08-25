'use client'
import { useEffect, useState } from 'react'
import { getCart, removeFromCart, clearCart } from '@/lib/cart'
import type { CartItem } from '@/lib/cart'
import OrderPopup from './OrderPopup'
import type { OrderItem } from './OrderPopup'

function fmtVND(v: number | null) {
  if (v == null) return 'Thương lượng'
  if (v === 0) return '0 ₫'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v)
}

interface Props {
  open: boolean
  onClose: () => void
  onCartChange: () => void
}

export default function CartDrawer({ open, onClose, onCartChange }: Props) {
  const [items, setItems] = useState<CartItem[]>([])
  const [orderOpen, setOrderOpen] = useState(false)

  useEffect(() => {
    if (open) setItems(getCart())
  }, [open])

  function handleRemove(id: number) {
    removeFromCart(id)
    const updated = getCart()
    setItems(updated)
    onCartChange()
  }

  function handleOrderSuccess() {
    clearCart()
    setItems([])
    onCartChange()
    setOrderOpen(false)
    onClose()
  }

  const total = items.reduce((s, i) => s + (i.price ?? 0), 0)
  const orderItems: OrderItem[] = items.map(i => ({ id: i.id, title: i.title, price: i.price }))

  if (!open && !orderOpen) return null

  return (
    <>
      <style>{`
        .cart-overlay{position:fixed;inset:0;background:rgba(0,0,0,.38);z-index:250;display:flex;justify-content:flex-end}
        .cart-drawer{background:var(--surface,#fff);width:100%;max-width:380px;height:100%;display:flex;flex-direction:column;animation:cd-slide .22s ease;overflow:hidden;box-shadow:-4px 0 24px rgba(0,0,0,.12)}
        @keyframes cd-slide{from{transform:translateX(100%)}to{transform:none}}
        .cart-header{display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid var(--border,#e8e6e1);flex-shrink:0}
        .cart-header h3{font-size:15px;font-weight:600;margin:0;display:flex;align-items:center;gap:8px}
        .cart-cnt-badge{background:var(--accent,#1a1916);color:white;font-size:11px;font-weight:700;padding:1px 7px;border-radius:10px;line-height:1.5}
        .cart-close-btn{background:none;border:none;font-size:18px;cursor:pointer;color:var(--muted,#8c8982);padding:4px 7px;border-radius:5px;line-height:1;transition:all .12s}
        .cart-close-btn:hover{background:var(--tag-bg,#f0efe9);color:var(--text,#1a1916)}
        .cart-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:var(--muted,#8c8982);font-size:14px;padding:40px}
        .cart-list{flex:1;overflow-y:auto;padding:12px 16px;display:flex;flex-direction:column;gap:8px}
        .cart-row{display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--tag-bg,#f0efe9);border-radius:8px;border:1px solid var(--border,#e8e6e1)}
        .cart-row-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
        .cart-row-title{font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .cart-row-price{font-size:13px;font-weight:700;color:var(--green,#2a7a4b)}
        .cart-row-rm{background:none;border:none;color:var(--muted,#8c8982);cursor:pointer;font-size:15px;padding:3px 6px;border-radius:5px;flex-shrink:0;line-height:1;transition:all .12s}
        .cart-row-rm:hover{background:#fee2e2;color:var(--red,#c0392b)}
        .cart-foot{padding:16px 20px;border-top:1px solid var(--border,#e8e6e1);flex-shrink:0;background:var(--surface,#fff)}
        .cart-total{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;font-size:14px}
        .cart-total-val{font-size:16px;font-weight:700;color:var(--green,#2a7a4b)}
        .cart-checkout{width:100%;background:var(--green,#2a7a4b);color:white;border:none;padding:12px;border-radius:9px;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;transition:opacity .15s}
        .cart-checkout:hover{opacity:.88}
        @media(max-width:500px){.cart-drawer{max-width:100%}}
      `}</style>

      {open && (
        <div className="cart-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
          <div className="cart-drawer">
            <div className="cart-header">
              <h3>
                Giỏ hàng
                {items.length > 0 && <span className="cart-cnt-badge">{items.length}</span>}
              </h3>
              <button className="cart-close-btn" onClick={onClose}>✕</button>
            </div>

            {items.length === 0 ? (
              <div className="cart-empty">
                <span style={{ fontSize: 36 }}>🛒</span>
                <span>Giỏ hàng trống</span>
              </div>
            ) : (
              <>
                <div className="cart-list">
                  {items.map(item => (
                    <div key={item.id} className="cart-row">
                      <div className="cart-row-info">
                        <span className="cart-row-title">{item.title}</span>
                        <span className="cart-row-price">{fmtVND(item.price)}</span>
                      </div>
                      <button className="cart-row-rm" onClick={() => handleRemove(item.id)} title="Xóa khỏi giỏ">✕</button>
                    </div>
                  ))}
                </div>
                <div className="cart-foot">
                  <div className="cart-total">
                    <span>Tổng cộng ({items.length} SP)</span>
                    <span className="cart-total-val">{total > 0 ? fmtVND(total) : 'Thương lượng'}</span>
                  </div>
                  <button className="cart-checkout" onClick={() => setOrderOpen(true)}>
                    Đặt hàng →
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <OrderPopup
        open={orderOpen}
        onClose={() => setOrderOpen(false)}
        items={orderItems}
        onSuccess={handleOrderSuccess}
      />
    </>
  )
}

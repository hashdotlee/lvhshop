import React from 'react'
import type { SavedItem } from '../../types'
import { formatPrice, conditionColor } from '../utils'

interface Props {
  items: SavedItem[]
  onBack: () => void
}

const FIELDS: { key: keyof SavedItem; label: string }[] = [
  { key: 'priceText', label: '💰 Giá' },
  { key: 'condition', label: '📦 Tình trạng' },
  { key: 'category', label: '🏷️ Danh mục' },
  { key: 'location', label: '📍 Khu vực' },
  { key: 'status', label: '📋 Trạng thái' },
]

const STATUS_LABELS: Record<string, string> = {
  available: 'Còn hàng',
  sold: 'Đã bán',
  unknown: 'Không rõ',
}

export function CompareView({ items, onBack }: Props) {
  if (items.length < 2) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Chưa đủ sản phẩm để so sánh</div>
        <div style={{ color: '#65676b', fontSize: 13, marginBottom: 16 }}>
          Chọn ít nhất 2 sản phẩm bằng cách tick vào ô checkbox trong tab "So sánh".
        </div>
        <button onClick={onBack} style={btnStyle}>← Quay lại</button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 12px', background: '#1877f2', color: '#fff',
      }}>
        <button onClick={onBack} style={backBtnStyle}>← Quay lại</button>
        <span style={{ fontWeight: 700, fontSize: 14 }}>
          So sánh {items.length} sản phẩm
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Image row */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: 1, background: '#e4e6eb' }}>
          {items.map(item => (
            <div key={item.id} style={{ background: '#fff', padding: 10, textAlign: 'center' }}>
              {item.images[0] ? (
                <img
                  src={item.images[0]}
                  alt=""
                  style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 8 }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              ) : (
                <div style={{ height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>📦</div>
              )}
              <div style={{
                fontSize: 12, fontWeight: 600, marginTop: 6, lineHeight: '1.3',
                overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              }}>
                {item.title}
              </div>
            </div>
          ))}
        </div>

        {/* Price row - highlighted */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: 1, background: '#e4e6eb' }}>
          {items.map(item => {
            const prices = items.map(i => i.price).filter(Boolean) as number[]
            const isLowest = prices.length > 1 && item.price !== null && item.price === Math.min(...prices)
            return (
              <div key={item.id} style={{
                background: isLowest ? '#f0fdf4' : '#fff',
                padding: '10px 8px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 11, color: '#65676b', marginBottom: 4 }}>💰 Giá</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: isLowest ? '#16a34a' : '#e53e3e' }}>
                  {item.price ? formatPrice(item.price) : item.priceText || 'Liên hệ'}
                </div>
                {isLowest && <div style={{ fontSize: 10, color: '#16a34a', marginTop: 2 }}>🏆 Rẻ nhất</div>}
              </div>
            )
          })}
        </div>

        {/* Other fields */}
        {FIELDS.slice(1).map(field => (
          <div key={field.key} style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: 1, background: '#e4e6eb' }}>
            {items.map(item => {
              let value = String(item[field.key] ?? '')
              if (field.key === 'status') value = STATUS_LABELS[value] ?? value
              const cc = field.key === 'condition' && value ? conditionColor(value) : null
              return (
                <div key={item.id} style={{ background: '#fff', padding: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#65676b', marginBottom: 3 }}>{field.label}</div>
                  {cc ? (
                    <span style={{
                      fontSize: 12, padding: '1px 8px', borderRadius: 4,
                      background: cc.bg, color: cc.fg, fontWeight: 600,
                    }}>
                      {value || '—'}
                    </span>
                  ) : (
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{value || '—'}</div>
                  )}
                </div>
              )
            })}
          </div>
        ))}

        {/* Description compare */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: 1, background: '#e4e6eb' }}>
          {items.map(item => (
            <div key={item.id} style={{ background: '#fff', padding: '8px' }}>
              <div style={{ fontSize: 11, color: '#65676b', marginBottom: 3 }}>📝 Mô tả</div>
              <div style={{
                fontSize: 11, color: '#1c1e21', lineHeight: '1.4',
                maxHeight: 80, overflowY: 'auto',
              }}>
                {item.description?.slice(0, 200) || '—'}
              </div>
            </div>
          ))}
        </div>

        {/* Links */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: 1, background: '#e4e6eb', paddingBottom: 1 }}>
          {items.map(item => (
            <div key={item.id} style={{ background: '#fff', padding: '8px', textAlign: 'center' }}>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 12, color: '#1877f2', textDecoration: 'none', fontWeight: 600 }}
              >
                🔗 Xem bài
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const backBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
  padding: '4px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 12,
}

const btnStyle: React.CSSProperties = {
  padding: '8px 16px', background: '#1877f2', color: '#fff',
  border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600,
}

import React, { useState } from 'react'
import type { SavedItem } from '../../types'
import { formatPrice, formatRelativeTime, conditionColor } from '../utils'

interface Props {
  item: SavedItem
  onBack: () => void
  onUpdate: (item: SavedItem) => void
  onDelete: (id: string) => void
  onAnalyze: (id: string) => void
  analyzing: boolean
}

export function ItemDetail({ item, onBack, onUpdate, onDelete, onAnalyze, analyzing }: Props) {
  const [notes, setNotes] = useState(item.notes || '')
  const [imgIdx, setImgIdx] = useState(0)

  function saveNotes() {
    onUpdate({ ...item, notes })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 12px', background: '#1877f2', color: '#fff',
      }}>
        <button onClick={onBack} style={backBtnStyle}>← Quay lại</button>
        <span style={{ flex: 1, fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.title}
        </span>
        <button
          onClick={() => onDelete(item.id)}
          title="Xóa"
          style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 18 }}
        >🗑</button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>

        {/* Image gallery */}
        {item.images.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <img
              src={item.images[imgIdx]}
              alt=""
              style={{ width: '100%', maxHeight: 180, objectFit: 'contain', borderRadius: 8, background: '#f0f2f5' }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            {item.images.length > 1 && (
              <div style={{ display: 'flex', gap: 4, marginTop: 6, overflowX: 'auto' }}>
                {item.images.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt=""
                    onClick={() => setImgIdx(i)}
                    style={{
                      width: 48, height: 48, objectFit: 'cover', borderRadius: 6, cursor: 'pointer',
                      border: i === imgIdx ? '2px solid #1877f2' : '2px solid transparent',
                    }}
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Price & condition row */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#e53e3e' }}>
            {item.price ? formatPrice(item.price) : item.priceText || 'Liên hệ'}
          </span>
          {item.condition && (
            <span style={{
              fontSize: 12, padding: '2px 8px', borderRadius: 6,
              background: conditionColor(item.condition).bg,
              color: conditionColor(item.condition).fg, fontWeight: 600,
            }}>
              {item.condition}
            </span>
          )}
          {item.status === 'sold' && (
            <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 6, background: '#fee2e2', color: '#dc2626', fontWeight: 600 }}>
              Đã bán
            </span>
          )}
        </div>

        {/* Meta rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
          {item.category && <MetaRow label="Danh mục" value={item.category} />}
          {item.location && <MetaRow label="Khu vực" value={`📍 ${item.location}`} />}
          {item.seller && <MetaRow label="Người bán" value={item.seller.name} />}
          <MetaRow label="Đã lưu" value={formatRelativeTime(item.savedAt)} />
          <MetaRow label="Phân tích AI" value={item.aiAnalyzed ? '✅ Đã phân tích' : '⚡ Chưa phân tích'} />
        </div>

        {/* Description */}
        {item.description && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 12, color: '#65676b', marginBottom: 4 }}>MÔ TẢ</div>
            <div style={{
              background: '#f0f2f5', borderRadius: 8, padding: '8px 10px',
              fontSize: 13, lineHeight: '1.5', whiteSpace: 'pre-wrap', maxHeight: 120, overflowY: 'auto',
            }}>
              {item.description}
            </div>
          </div>
        )}

        {/* Tags */}
        {item.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {item.tags.map(tag => (
              <span key={tag} style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 12,
                background: '#e7f0fd', color: '#1877f2', fontWeight: 500,
              }}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Notes */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 600, fontSize: 12, color: '#65676b', marginBottom: 4 }}>GHI CHÚ CÁ NHÂN</div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            onBlur={saveNotes}
            placeholder="Thêm ghi chú của bạn..."
            rows={3}
            style={{
              width: '100%', border: '1px solid #ddd', borderRadius: 8,
              padding: '8px 10px', fontSize: 13, resize: 'vertical',
              fontFamily: 'inherit', outline: 'none',
            }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            style={actionLinkStyle}
          >
            🔗 Mở bài gốc
          </a>
          {!item.aiAnalyzed && (
            <button
              onClick={() => onAnalyze(item.id)}
              disabled={analyzing}
              style={{ ...actionBtnStyle, background: analyzing ? '#bcc0c4' : '#1877f2' }}
            >
              {analyzing ? '⏳ Đang phân tích...' : '🤖 Phân tích AI'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 6, fontSize: 12 }}>
      <span style={{ color: '#65676b', minWidth: 80, flexShrink: 0 }}>{label}:</span>
      <span style={{ color: '#1c1e21' }}>{value}</span>
    </div>
  )
}

const backBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
  padding: '4px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 12, flexShrink: 0,
}

const actionLinkStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
  background: '#e7f0fd', color: '#1877f2', textDecoration: 'none',
}

const actionBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
  border: 'none', cursor: 'pointer', color: '#fff',
}

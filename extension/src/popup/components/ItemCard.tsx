import React from 'react'
import type { SavedItem } from '../../types'
import { formatPrice, formatRelativeTime, conditionColor } from '../utils'

interface Props {
  item: SavedItem
  selected: boolean
  onSelect: (id: string, checked: boolean) => void
  onClick: () => void
  onDelete: (id: string) => void
  compareMode: boolean
}

export function ItemCard({ item, selected, onSelect, onClick, onDelete, compareMode }: Props) {
  const thumb = item.images[0]

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        gap: 10,
        padding: '10px 12px',
        background: selected ? '#e7f0fd' : '#fff',
        borderRadius: 10,
        cursor: 'pointer',
        border: selected ? '1.5px solid #1877f2' : '1.5px solid transparent',
        transition: 'background 0.1s',
        position: 'relative',
      }}
    >
      {/* Thumbnail */}
      <div style={{ width: 68, height: 68, flexShrink: 0 }}>
        {thumb ? (
          <img
            src={thumb}
            alt=""
            style={{ width: 68, height: 68, objectFit: 'cover', borderRadius: 8 }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <div style={{
            width: 68, height: 68, borderRadius: 8, background: '#e4e6eb',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24,
          }}>📦</div>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{
          fontWeight: 600, fontSize: 13, lineHeight: '1.3',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          paddingRight: 28,
        }}>
          {item.title || 'Sản phẩm chưa đặt tên'}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: '#e53e3e', fontWeight: 700, fontSize: 13 }}>
            {item.price ? formatPrice(item.price) : item.priceText || 'Liên hệ'}
          </span>
          {item.condition && (
            <span style={{
              fontSize: 11, padding: '1px 6px', borderRadius: 4,
              background: conditionColor(item.condition).bg,
              color: conditionColor(item.condition).fg,
              fontWeight: 600,
            }}>
              {item.condition}
            </span>
          )}
          {item.status === 'sold' && (
            <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 4, background: '#fee2e2', color: '#dc2626', fontWeight: 600 }}>
              Đã bán
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, fontSize: 11, color: '#65676b' }}>
          {item.location && <span>📍 {item.location}</span>}
          <span>{formatRelativeTime(item.savedAt)}</span>
          {!item.aiAnalyzed && (
            <span style={{ color: '#f59e0b' }}>⚡ Thủ công</span>
          )}
        </div>
      </div>

      {/* Compare checkbox */}
      {compareMode && (
        <div
          onClick={e => { e.stopPropagation(); onSelect(item.id, !selected) }}
          style={{ position: 'absolute', top: 10, right: 10 }}
        >
          <input
            type="checkbox"
            checked={selected}
            onChange={() => {}}
            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#1877f2' }}
          />
        </div>
      )}

      {/* Delete button */}
      {!compareMode && (
        <button
          onClick={e => { e.stopPropagation(); onDelete(item.id) }}
          title="Xóa"
          style={{
            position: 'absolute', top: 8, right: 8,
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#bcc0c4', fontSize: 16, padding: 2, lineHeight: 1,
          }}
        >×</button>
      )}
    </div>
  )
}

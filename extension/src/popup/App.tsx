import React, { useCallback, useEffect, useState } from 'react'
import type { Message, MessageResponse, SavedItem, Settings } from '../types'
import { ItemCard } from './components/ItemCard'
import { ItemDetail } from './components/ItemDetail'
import { CompareView } from './components/CompareView'
import { formatPrice, searchFilter } from './utils'

type Tab = 'list' | 'compare'
type View = 'list' | 'detail' | 'compare-result'

function send<T>(msg: Message): Promise<MessageResponse<T>> {
  return chrome.runtime.sendMessage(msg)
}

export default function App() {
  const [items, setItems] = useState<SavedItem[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [tab, setTab] = useState<Tab>('list')
  const [view, setView] = useState<View>('list')
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null)
  const [query, setQuery] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'price'>('date')

  const loadItems = useCallback(async () => {
    const res = await send<SavedItem[]>({ type: 'GET_ITEMS' })
    if (res.success) setItems(res.data)
  }, [])

  useEffect(() => {
    loadItems()
    send<Settings>({ type: 'GET_SETTINGS' }).then(res => {
      if (res.success) setSettings(res.data)
    })
    // Auto-refresh every 3s in case background updated items
    const timer = setInterval(loadItems, 3000)
    return () => clearInterval(timer)
  }, [loadItems])

  // Derived state
  const compareItems = items.filter(i => i.compareSelected)

  const filtered = items
    .filter(item => searchFilter(item, query))
    .sort((a, b) => {
      if (sortBy === 'price') {
        const ap = a.price ?? Infinity
        const bp = b.price ?? Infinity
        return ap - bp
      }
      return b.savedAt - a.savedAt
    })

  async function handleDelete(id: string) {
    await send({ type: 'DELETE_ITEM', id })
    setItems(prev => prev.filter(i => i.id !== id))
    if (selectedItem?.id === id) setView('list')
  }

  async function handleUpdate(item: SavedItem) {
    await send({ type: 'UPDATE_ITEM', item })
    setItems(prev => prev.map(i => i.id === item.id ? item : i))
    setSelectedItem(item)
  }

  async function handleAnalyze(id: string) {
    setAnalyzing(true)
    const res = await send<SavedItem>({ type: 'ANALYZE_ITEM', id })
    setAnalyzing(false)
    if (res.success) {
      setItems(prev => prev.map(i => i.id === id ? res.data : i))
      setSelectedItem(res.data)
    }
  }

  function toggleCompareSelect(id: string, checked: boolean) {
    setItems(prev =>
      prev.map(i => i.id === id ? { ...i, compareSelected: checked } : i),
    )
    // Persist selection
    const item = items.find(i => i.id === id)
    if (item) send({ type: 'UPDATE_ITEM', item: { ...item, compareSelected: checked } })
  }

  function clearCompare() {
    setItems(prev => prev.map(i => ({ ...i, compareSelected: false })))
  }

  async function handleSync() {
    setSyncing(true)
    setSyncMsg('')
    const res = await send<{ synced: number }>({ type: 'SYNC_TO_CLOUD' })
    setSyncing(false)
    if (res.success) {
      setSyncMsg(`✅ Đã sync ${res.data.synced} mục`)
    } else {
      setSyncMsg(`❌ ${res.error}`)
    }
    setTimeout(() => setSyncMsg(''), 4000)
  }

  // Render detail view
  if (view === 'detail' && selectedItem) {
    return (
      <ItemDetail
        item={selectedItem}
        onBack={() => setView('list')}
        onUpdate={handleUpdate}
        onDelete={(id) => { handleDelete(id); setView('list') }}
        onAnalyze={handleAnalyze}
        analyzing={analyzing}
      />
    )
  }

  // Render compare result
  if (view === 'compare-result') {
    return <CompareView items={compareItems} onBack={() => setView('list')} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        background: '#1877f2', color: '#fff',
        padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
      }}>
        <span style={{ fontSize: 18 }}>💾</span>
        <span style={{ fontWeight: 700, fontSize: 15, flex: 1 }}>FB Saver</span>
        <span style={{ fontSize: 12, opacity: 0.85 }}>{items.length} đã lưu</span>
        {settings?.cloudSync && (
          <button
            onClick={handleSync}
            disabled={syncing}
            title="Sync lên cloud"
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12 }}
          >
            {syncing ? '⏳' : '☁️'}
          </button>
        )}
        <button
          onClick={() => chrome.runtime.openOptionsPage()}
          title="Cài đặt"
          style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 14 }}
        >⚙️</button>
      </div>

      {syncMsg && (
        <div style={{
          background: syncMsg.startsWith('✅') ? '#f0fdf4' : '#fef2f2',
          color: syncMsg.startsWith('✅') ? '#16a34a' : '#dc2626',
          fontSize: 12, padding: '6px 12px', borderBottom: '1px solid #e4e6eb',
        }}>
          {syncMsg}
        </div>
      )}

      {/* Search + Sort */}
      <div style={{ padding: '8px 12px', background: '#fff', borderBottom: '1px solid #e4e6eb', display: 'flex', gap: 6, flexShrink: 0 }}>
        <input
          type="search"
          placeholder="🔍 Tìm kiếm sản phẩm..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            flex: 1, border: '1px solid #ddd', borderRadius: 20,
            padding: '6px 14px', fontSize: 13, outline: 'none',
            background: '#f0f2f5',
          }}
        />
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as 'date' | 'price')}
          style={{
            border: '1px solid #ddd', borderRadius: 8, padding: '6px 8px',
            fontSize: 12, background: '#f0f2f5', outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="date">Mới nhất</option>
          <option value="price">Giá thấp</option>
        </select>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', background: '#fff', borderBottom: '1px solid #e4e6eb', flexShrink: 0,
      }}>
        <TabBtn active={tab === 'list'} onClick={() => setTab('list')}>
          Tất cả ({items.length})
        </TabBtn>
        <TabBtn active={tab === 'compare'} onClick={() => setTab('compare')}>
          So sánh {compareItems.length > 0 ? `(${compareItems.length})` : ''}
        </TabBtn>
      </div>

      {/* Compare action bar */}
      {tab === 'compare' && compareItems.length >= 2 && (
        <div style={{
          background: '#e7f0fd', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 13, flex: 1, color: '#1877f2', fontWeight: 600 }}>
            Đã chọn {compareItems.length} sản phẩm
          </span>
          <button
            onClick={() => setView('compare-result')}
            style={{ background: '#1877f2', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
          >
            So sánh →
          </button>
          <button
            onClick={clearCompare}
            style={{ background: 'none', border: 'none', color: '#65676b', cursor: 'pointer', fontSize: 12 }}
          >
            Bỏ chọn
          </button>
        </div>
      )}

      {/* Item list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.length === 0 ? (
          <EmptyState query={query} />
        ) : (
          filtered.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              selected={item.compareSelected}
              compareMode={tab === 'compare'}
              onSelect={toggleCompareSelect}
              onClick={() => { setSelectedItem(item); setView('detail') }}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  )
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: '8px 4px', border: 'none', background: 'none',
        fontWeight: active ? 700 : 400, fontSize: 13, cursor: 'pointer',
        color: active ? '#1877f2' : '#65676b',
        borderBottom: active ? '2px solid #1877f2' : '2px solid transparent',
        transition: 'all 0.15s',
      }}
    >
      {children}
    </button>
  )
}

function EmptyState({ query }: { query: string }) {
  return (
    <div style={{ padding: '40px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{query ? '🔍' : '📦'}</div>
      <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 15 }}>
        {query ? 'Không tìm thấy kết quả' : 'Chưa có sản phẩm nào'}
      </div>
      <div style={{ color: '#65676b', fontSize: 13, lineHeight: '1.5' }}>
        {query
          ? `Không có sản phẩm nào phù hợp với "${query}"`
          : 'Truy cập Facebook và nhấn nút 💾 Lưu trên bất kỳ bài đăng nào để bắt đầu.'}
      </div>
    </div>
  )
}

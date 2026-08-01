'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'

export interface StreamItem {
  id: string
  title: string
  url: string
  shopName?: string
  note?: string
}

const DEFAULT_STREAMS: StreamItem[] = [
  {
    id: 'preset-1',
    title: 'Fanpage nhankieu24 (Tự động cập nhật phiên Live)',
    shopName: 'nhankieu24',
    url: 'https://www.facebook.com/nhankieu24',
    note: 'Theo dõi live tự động',
  },
  {
    id: 'preset-2',
    title: 'Hàng Nhật Bãi Lê Viết Hoàng',
    shopName: 'leviethoang.shop',
    url: 'https://www.facebook.com/leviethoang.shop',
    note: 'Theo dõi live tự động',
  },
]

function getEmbedUrl(rawUrl: string): string {
  if (!rawUrl) return ''
  let trimmed = rawUrl.trim()
  
  // If already an embed plugin URL
  if (trimmed.includes('facebook.com/plugins/')) {
    return trimmed
  }

  // Handle Facebook URLs
  if (trimmed.includes('facebook.com') || trimmed.includes('fb.watch')) {
    // Check if it's a specific video permalink (contains /videos/, /watch, /reel/, /posts/, or fb.watch)
    const isSpecificVideo = (
      trimmed.includes('/videos/') ||
      trimmed.includes('/watch') ||
      trimmed.includes('/reel/') ||
      trimmed.includes('/posts/') ||
      trimmed.includes('fb.watch') ||
      /\d{8,}/.test(trimmed)
    )

    if (isSpecificVideo) {
      // Direct video embed
      const encoded = encodeURIComponent(trimmed)
      return `https://www.facebook.com/plugins/video.php?href=${encoded}&show_text=false&width=auto`
    } else {
      // Fanpage link (e.g. https://www.facebook.com/nhankieu24 or https://www.facebook.com/nhankieu24/live)
      // Extract clean page URL without /live
      let cleanPageUrl = trimmed.replace(/\/live\/?$/, '').replace(/\/+$/, '')
      if (!cleanPageUrl.startsWith('http')) cleanPageUrl = 'https://www.facebook.com/' + cleanPageUrl

      const encodedPage = encodeURIComponent(cleanPageUrl)
      return `https://www.facebook.com/plugins/page.php?href=${encodedPage}&tabs=timeline&width=500&height=700&small_header=true&adapt_container_width=true&hide_cover=false&show_facepile=false`
    }
  }

  // Handle plain username input (e.g. "nhankieu24")
  if (/^[a-zA-Z0-9._-]+$/.test(trimmed) && !trimmed.startsWith('http')) {
    const cleanPageUrl = `https://www.facebook.com/${trimmed}`
    const encodedPage = encodeURIComponent(cleanPageUrl)
    return `https://www.facebook.com/plugins/page.php?href=${encodedPage}&tabs=timeline&width=500&height=700&small_header=true&adapt_container_width=true&hide_cover=false&show_facepile=false`
  }

  // Fallback for YouTube
  if (trimmed.includes('youtube.com/watch') || trimmed.includes('youtu.be/')) {
    let ytId = ''
    if (trimmed.includes('youtu.be/')) {
      ytId = trimmed.split('youtu.be/')[1]?.split('?')[0] || ''
    } else {
      try {
        const u = new URL(trimmed)
        ytId = u.searchParams.get('v') || ''
      } catch {
        ytId = ''
      }
    }
    if (ytId) return `https://www.youtube.com/embed/${ytId}?autoplay=1`
  }

  return trimmed
}

export default function LiveTrackerClient() {
  const [streams, setStreams] = useState<StreamItem[]>(DEFAULT_STREAMS)
  const [columns, setColumns] = useState<number>(2) // 1, 2, 3, 4
  const [aspectRatio, setAspectRatio] = useState<'16-9' | '9-16' | 'auto'>('16-9')
  const [viewMode, setViewMode] = useState<'grid' | 'focus'>('grid')
  const [focusedId, setFocusedId] = useState<string | null>(null)
  
  // Admin & Toast state
  const [isAdmin, setIsAdmin] = useState(false)
  const adminKey = useRef('')
  const [savingServer, setSavingServer] = useState(false)
  const [toast, setToast] = useState('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  // Single Add Stream Modal State
  const [showAddModal, setShowAddModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newShopName, setNewShopName] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [newNote, setNewNote] = useState('')

  // Batch Import / Manager Modal State
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [batchText, setBatchText] = useState('')

  // Edit Stream Modal State
  const [editingStream, setEditingStream] = useState<StreamItem | null>(null)

  // Fullscreen container ref
  const gridContainerRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Restore saved state from localStorage & fetch Admin official list
  useEffect(() => {
    // Check Admin status
    if (typeof window !== 'undefined' && sessionStorage.getItem('cq_admin')) {
      setIsAdmin(true)
      adminKey.current = sessionStorage.getItem('cq_admin_key') ?? ''
    }

    try {
      const savedStreams = localStorage.getItem('lvh_live_streams')
      if (savedStreams) {
        const parsed = JSON.parse(savedStreams)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setStreams(parsed)
        }
      }
      const savedCols = localStorage.getItem('lvh_live_cols')
      if (savedCols) {
        setColumns(Number(savedCols) || 2)
      }
      const savedAspect = localStorage.getItem('lvh_live_aspect')
      if (savedAspect && ['16-9', '9-16', 'auto'].includes(savedAspect)) {
        setAspectRatio(savedAspect as '16-9' | '9-16' | 'auto')
      }
    } catch {
      /* ignore storage errors */
    }

    // Fetch official Admin list from server
    fetch('/api/live-streams')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const hasLocalCustom = localStorage.getItem('lvh_live_streams')
          if (!hasLocalCustom) {
            setStreams(data)
          }
        }
      })
      .catch(() => {})
  }, [])

  // Admin function: Save current streams to server for ALL users
  const saveOfficialStreamsToServer = async (streamsToSave?: StreamItem[]) => {
    const list = streamsToSave || streams
    setSavingServer(true)
    try {
      const res = await fetch('/api/live-streams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey.current,
        },
        body: JSON.stringify({ streams: list }),
      })
      if (res.ok) {
        showToast('✅ Đã lưu danh sách Fanpage chính thức cho tất cả khách hàng!')
      } else {
        const err = await res.json()
        showToast(`❌ Lỗi lưu Server: ${err.error || res.status}`)
      }
    } catch {
      showToast('❌ Không thể kết nối tới Server')
    } finally {
      setSavingServer(false)
    }
  }

  // Save changes to localStorage
  const saveStreams = (newStreams: StreamItem[]) => {
    setStreams(newStreams)
    try {
      localStorage.setItem('lvh_live_streams', JSON.stringify(newStreams))
    } catch {
      /* ignore */
    }
  }

  const changeColumns = (cols: number) => {
    setColumns(cols)
    try {
      localStorage.setItem('lvh_live_cols', String(cols))
    } catch {
      /* ignore */
    }
  }

  const changeAspect = (aspect: '16-9' | '9-16' | 'auto') => {
    setAspectRatio(aspect)
    try {
      localStorage.setItem('lvh_live_aspect', aspect)
    } catch {
      /* ignore */
    }
  }

  const handleAddStream = () => {
    if (!newUrl.trim()) return
    const item: StreamItem = {
      id: 'stream-' + Date.now(),
      title: newTitle.trim() || newShopName.trim() || 'Livestream Shop',
      shopName: newShopName.trim() || 'Facebook Shop',
      url: newUrl.trim(),
      note: newNote.trim(),
    }
    const updated = [...streams, item]
    saveStreams(updated)
    setNewTitle('')
    setNewShopName('')
    setNewUrl('')
    setNewNote('')
    setShowAddModal(false)
  }

  // Batch import parser (Supports JSON format or line-by-line "Shop Name | URL" or just URLs)
  const handleBatchImport = () => {
    if (!batchText.trim()) return
    
    let newItems: StreamItem[] = []
    const trimmed = batchText.trim()

    // Try parsing as JSON first
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) {
          newItems = parsed.map((item, idx) => ({
            id: 'batch-' + Date.now() + '-' + idx,
            title: item.title || item.shopName || `Shop ${idx + 1}`,
            shopName: item.shopName || item.title || `Shop ${idx + 1}`,
            url: item.url || '',
            note: item.note || '',
          })).filter(i => i.url)
        }
      } catch {
        /* fallback to text lines parsing */
      }
    }

    // Line-by-line parsing if not JSON
    if (newItems.length === 0) {
      const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean)
      newItems = lines.map((line, idx) => {
        let name = ''
        let raw = line
        if (line.includes('|')) {
          const parts = line.split('|')
          name = parts[0].trim()
          raw = parts.slice(1).join('|').trim()
        } else if (line.includes(',')) {
          const parts = line.split(',')
          if (parts[0].includes('http')) {
            raw = parts[0].trim()
            name = parts.slice(1).join(',').trim()
          } else {
            name = parts[0].trim()
            raw = parts.slice(1).join(',').trim()
          }
        }

        let finalUrl = raw
        if (!raw.startsWith('http')) {
          const cleanName = raw.replace(/^@/, '')
          finalUrl = `https://www.facebook.com/${cleanName}`
          if (!name) name = cleanName
        } else {
          if (!name) {
            try {
              const u = new URL(raw)
              name = u.pathname.split('/').filter(Boolean)[0] || `Shop ${idx + 1}`
            } catch {
              name = `Shop ${idx + 1}`
            }
          }
        }

        return {
          id: 'batch-' + Date.now() + '-' + idx,
          title: `Shop ${name}`,
          shopName: name,
          url: finalUrl,
          note: 'Theo dõi live tự động',
        }
      }).filter(i => i.url)
    }

    if (newItems.length > 0) {
      const updated = [...streams, ...newItems]
      saveStreams(updated)
      setBatchText('')
      setShowBatchModal(false)
      alert(`Đã thêm thành công ${newItems.length} shop vào danh sách!`)
    } else {
      alert('Không tìm thấy đường dẫn URL hợp lệ trong văn bản đã nhập. Vui lòng kiểm tra lại định dạng!')
    }
  }

  const handleSaveEdit = () => {
    if (!editingStream) return
    const updated = streams.map(s => s.id === editingStream.id ? editingStream : s)
    saveStreams(updated)
    setEditingStream(null)
  }

  const handleDelete = (id: string) => {
    if (streams.length <= 1) {
      if (!confirm('Bạn có chắc muốn xoá khung live duy nhất này?')) return
    }
    const updated = streams.filter(s => s.id !== id)
    saveStreams(updated)
    if (focusedId === id) {
      setFocusedId(updated[0]?.id || null)
    }
  }

  const handleClearAll = () => {
    if (confirm('Xoá tất cả danh sách shop hiện tại?')) {
      saveStreams([])
    }
  }

  const handleMove = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= streams.length) return
    const updated = [...streams]
    const temp = updated[index]
    updated[index] = updated[target]
    updated[target] = temp
    saveStreams(updated)
  }

  const handleRefresh = (id: string) => {
    const iframe = document.getElementById(`iframe-${id}`) as HTMLIFrameElement | null
    if (iframe) {
      const currentSrc = iframe.src
      iframe.src = 'about:blank'
      setTimeout(() => {
        iframe.src = currentSrc
      }, 100)
    }
  }

  const toggleFullscreen = () => {
    if (!gridContainerRef.current) return
    if (!document.fullscreenElement) {
      gridContainerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  const resetToDefaultPresets = () => {
    if (confirm('Khôi phục danh sách khung live mẫu?')) {
      saveStreams(DEFAULT_STREAMS)
      setColumns(2)
      setViewMode('grid')
      setFocusedId(null)
    }
  }

  const activeFocusStream = streams.find(s => s.id === focusedId) || streams[0]

  return (
    <div className="live-page-container">
      <style>{styles}</style>
      
      {/* Top Navigation Bar */}
      <header className="live-header">
        <div className="live-header-left">
          <Link href="/" className="live-logo">
            leviethoang<span>.shop</span>
          </Link>
          <div className="live-badge-live">
            <span className="live-pulse-dot" /> MULTI-LIVE TRACKER
          </div>
        </div>

        <div className="live-header-right">
          <Link href="/" className="live-nav-btn">
            ← Về trang chủ
          </Link>
        </div>
      </header>

      {/* Main Control Panel */}
      <div className="control-bar">
        <div className="control-group">
          <span className="control-label">Số khung hình:</span>
          <div className="btn-segmented">
            {[1, 2, 4, 6, 9].map(num => {
              const colMap: Record<number, number> = { 1: 1, 2: 2, 4: 2, 6: 3, 9: 3 }
              const isSelected = viewMode === 'grid' && streams.length === num && columns === colMap[num]
              return (
                <button
                  key={num}
                  className={`seg-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => {
                    setViewMode('grid')
                    changeColumns(colMap[num])
                  }}
                >
                  {num} Live
                </button>
              )
            })}
          </div>
        </div>

        <div className="control-group">
          <span className="control-label">Số cột:</span>
          <div className="btn-segmented">
            {[1, 2, 3, 4].map(c => (
              <button
                key={c}
                className={`seg-btn ${viewMode === 'grid' && columns === c ? 'active' : ''}`}
                onClick={() => {
                  setViewMode('grid')
                  changeColumns(c)
                }}
              >
                {c} Cột
              </button>
            ))}
          </div>
        </div>

        <div className="control-group">
          <span className="control-label">Tỉ lệ khung:</span>
          <div className="btn-segmented">
            <button
              className={`seg-btn ${aspectRatio === '16-9' ? 'active' : ''}`}
              onClick={() => changeAspect('16-9')}
              title="Ngang chuẩn (16:9)"
            >
              16:9
            </button>
            <button
              className={`seg-btn ${aspectRatio === '9-16' ? 'active' : ''}`}
              onClick={() => changeAspect('9-16')}
              title="Dọc Mobile Live (9:16)"
            >
              📱 9:16
            </button>
            <button
              className={`seg-btn ${aspectRatio === 'auto' ? 'active' : ''}`}
              onClick={() => changeAspect('auto')}
              title="Tự điều chỉnh chiều cao"
            >
              Auto
            </button>
          </div>
        </div>

        <div className="control-group">
          <span className="control-label">Chế độ xem:</span>
          <div className="btn-segmented">
            <button
              className={`seg-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              🔲 Lưới (Grid)
            </button>
            <button
              className={`seg-btn ${viewMode === 'focus' ? 'active' : ''}`}
              onClick={() => {
                setViewMode('focus')
                if (!focusedId && streams[0]) setFocusedId(streams[0].id)
              }}
            >
              🎬 Tiêu điểm (Focus)
            </button>
          </div>
        </div>

        <div className="control-actions">
          {isAdmin && (
            <button
              className="live-btn-primary live-btn-admin-save"
              onClick={() => saveOfficialStreamsToServer()}
              disabled={savingServer}
              title="Lưu danh sách này làm mặc định cho tất cả khách xem trang"
              style={{ background: '#10b981' }}
            >
              {savingServer ? '⏳ Đang lưu...' : '💾 Lưu Danh Sách Cho Tất Cả Khách (Admin)'}
            </button>
          )}
          <button className="live-btn-primary" onClick={() => setShowBatchModal(true)}>
            📋 Nhập danh sách Shop
          </button>
          <button className="live-btn-ghost" onClick={() => setShowAddModal(true)}>
            ➕ Thêm 1 Shop
          </button>
          <button className="live-btn-icon" onClick={toggleFullscreen} title={isFullscreen ? 'Thoát toàn màn hình' : 'Xem toàn màn hình'}>
            {isFullscreen ? '📉 Thu nhỏ' : '🖥️ Toàn màn hình'}
          </button>
          <button className="live-btn-ghost" onClick={resetToDefaultPresets} title="Đặt lại mẫu">
            ↺ Mẫu
          </button>
        </div>
      </div>

      {toast && <div className="live-toast-notification">{toast}</div>}

      {/* Main View Area */}
      <div ref={gridContainerRef} className={`live-container ${isFullscreen ? 'fullscreen-mode' : ''}`}>
        {streams.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📺</div>
            <h2>Chưa có shop livestream nào</h2>
            <p>Bấm nút bên dưới để dán danh sách đường dẫn livestream Facebook các shop của bạn.</p>
            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <button className="live-btn-primary" onClick={() => setShowBatchModal(true)}>
                📋 Dán danh sách Shop (Hàng loạt)
              </button>
              <button className="live-btn-ghost" onClick={() => setShowAddModal(true)}>
                ➕ Thêm 1 Shop mới
              </button>
            </div>
          </div>
        ) : viewMode === 'focus' && activeFocusStream ? (
          /* FOCUS / THEATER MODE */
          <div className="focus-layout">
            <div className="focus-main-window">
              <div className="stream-header">
                <div className="stream-title-info">
                  <span className="live-dot-pulse" />
                  <span className="stream-shop-name">{activeFocusStream.shopName || 'Live Shop'}</span>
                  <span className="stream-title">{activeFocusStream.title}</span>
                </div>
                <div className="stream-controls">
                  <button onClick={() => handleRefresh(activeFocusStream.id)} title="Tải lại stream">↻</button>
                  <a href={activeFocusStream.url} target="_blank" rel="noopener noreferrer" title="Xem trên Facebook">
                    ↗️ FB
                  </a>
                  <button onClick={() => setEditingStream(activeFocusStream)} title="Chỉnh sửa">✏️</button>
                  <button onClick={() => setViewMode('grid')} title="Trở lại xem lưới">✕ Trốn xem lớn</button>
                </div>
              </div>
              <div className="stream-video-wrap focus-video">
                <iframe
                  id={`iframe-${activeFocusStream.id}`}
                  src={getEmbedUrl(activeFocusStream.url)}
                  className="stream-iframe"
                  allowFullScreen
                  allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                />
              </div>
            </div>

            {/* Side Thumbnail List */}
            <div className="focus-sidebar">
              <div className="focus-sidebar-header">
                <h3 className="sidebar-title">Danh sách Shop ({streams.length})</h3>
                <button className="btn-text-sm" onClick={() => setShowBatchModal(true)}>Quản lý danh sách</button>
              </div>
              <div className="sidebar-list">
                {streams.map((s, idx) => (
                  <div
                    key={s.id}
                    className={`sidebar-item ${s.id === activeFocusStream.id ? 'active' : ''}`}
                    onClick={() => setFocusedId(s.id)}
                  >
                    <div className="sidebar-item-header">
                      <span className="sidebar-num">#{idx + 1}</span>
                      <span className="sidebar-name">{s.shopName || s.title}</span>
                      {s.id === activeFocusStream.id && <span className="sidebar-badge">ĐANG XEM</span>}
                    </div>
                    <div className="sidebar-item-sub">{s.title}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* GRID MODE */
          <div
            className={`streams-grid aspect-${aspectRatio}`}
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {streams.map((stream, index) => (
              <div key={stream.id} className="stream-card">
                <div className="stream-header">
                  <div className="stream-title-info">
                    <span className="live-dot-pulse" />
                    <span className="stream-shop-name">{stream.shopName || stream.title}</span>
                    {stream.note && <span className="stream-note-tag">{stream.note}</span>}
                  </div>
                  <div className="stream-controls">
                    <button onClick={() => { setFocusedId(stream.id); setViewMode('focus') }} title="Phóng to tiêu điểm">
                      🔍
                    </button>
                    <button onClick={() => handleRefresh(stream.id)} title="Tải lại stream">
                      ↻
                    </button>
                    <a href={stream.url} target="_blank" rel="noopener noreferrer" title="Mở trên Facebook">
                      ↗️
                    </a>
                    <button onClick={() => setEditingStream(stream)} title="Sửa tên / URL">
                      ✏️
                    </button>
                    <button onClick={() => handleMove(index, -1)} disabled={index === 0} title="Di chuyển sang trái/lên">
                      ‹
                    </button>
                    <button onClick={() => handleMove(index, 1)} disabled={index === streams.length - 1} title="Di chuyển sang phải/xuống">
                      ›
                    </button>
                    <button className="btn-del" onClick={() => handleDelete(stream.id)} title="Xoá khung live này">
                      ✕
                    </button>
                  </div>
                </div>

                <div className="stream-video-wrap">
                  <iframe
                    id={`iframe-${stream.id}`}
                    src={getEmbedUrl(stream.url)}
                    className="stream-iframe"
                    allowFullScreen
                    allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Batch Import / List Manager Modal */}
      {showBatchModal && (
        <div className="modal-overlay" onClick={() => setShowBatchModal(false)}>
          <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📋 Nhập Hàng Loạt / Quản Lý Danh Sách Shop</h3>
              <button className="modal-close" onClick={() => setShowBatchModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <label className="form-label">Dán danh sách shop live của bạn (Mỗi dòng một shop):</label>
              <textarea
                className="form-textarea"
                rows={7}
                placeholder={`Ví dụ 1 (Dán Fanpage hoặc URL Live):\nhttps://www.facebook.com/leviethoang.shop\nhttps://www.facebook.com/shop2/videos/123456\n\nVí dụ 2 (Có tên shop):\nTên Shop A | https://www.facebook.com/ShopA\nTên Shop B | https://www.facebook.com/ShopB/live/`}
                value={batchText}
                onChange={e => setBatchText(e.target.value)}
              />
              <div className="form-hint">
                💡 <b>Hỗ trợ tự động lấy Live mới nhất:</b>
                <br />• Dán link Trang Fanpage (VD: <code>https://facebook.com/TenShop</code>) — Hệ thống tự mở live mới nhất / đang phát của shop đó!
                <br />• Dán link video Facebook Live cụ thể (VD: <code>https://facebook.com/.../videos/...</code>)
                <br />• <code>Tên Shop | URL Fanpage hoặc URL Live</code> (mỗi shop 1 dòng)
              </div>

              {streams.length > 0 && (
                <div className="current-list-summary">
                  <div className="summary-header">
                    <span>Danh sách shop hiện tại ({streams.length})</span>
                    <button className="btn-del-text" onClick={handleClearAll}>Xoá tất cả</button>
                  </div>
                  <div className="summary-tags">
                    {streams.map(s => (
                      <span key={s.id} className="shop-tag">
                        {s.shopName || s.title}
                        <button onClick={() => handleDelete(s.id)}>✕</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="live-btn-ghost" onClick={() => setShowBatchModal(false)}>Đóng</button>
              <button className="live-btn-primary" onClick={handleBatchImport}>Nhập Thêm Vào Danh Sách</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Single Stream Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Thêm 1 Khung Livestream Shop Mới</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <label className="form-label">Tên Shop / Thương hiệu *</label>
              <input
                type="text"
                className="form-input"
                placeholder="VD: Hàng Nhật Bãi Lê Viết Hoàng"
                value={newShopName}
                onChange={e => setNewShopName(e.target.value)}
              />

              <label className="form-label">Tiêu đề Livestream / Ghi chú</label>
              <input
                type="text"
                className="form-input"
                placeholder="VD: Xả kho radio Sony & Amply Nhật"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
              />

              <label className="form-label">Đường dẫn Facebook Live / Video URL *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Paste URL video FB, VD: https://www.facebook.com/.../videos/..."
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
              />
            </div>
            <div className="modal-footer">
              <button className="live-btn-ghost" onClick={() => setShowAddModal(false)}>Hủy</button>
              <button className="live-btn-primary" onClick={handleAddStream}>Thêm Khung Live</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Stream Modal */}
      {editingStream && (
        <div className="modal-overlay" onClick={() => setEditingStream(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Chỉnh Sửa Thông Tin Shop Live</h3>
              <button className="modal-close" onClick={() => setEditingStream(null)}>✕</button>
            </div>
            <div className="modal-body">
              <label className="form-label">Tên Shop</label>
              <input
                type="text"
                className="form-input"
                value={editingStream.shopName || ''}
                onChange={e => setEditingStream({ ...editingStream, shopName: e.target.value })}
              />

              <label className="form-label">Tiêu đề</label>
              <input
                type="text"
                className="form-input"
                value={editingStream.title}
                onChange={e => setEditingStream({ ...editingStream, title: e.target.value })}
              />

              <label className="form-label">Facebook Live URL</label>
              <input
                type="text"
                className="form-input"
                value={editingStream.url}
                onChange={e => setEditingStream({ ...editingStream, url: e.target.value })}
              />
            </div>
            <div className="modal-footer">
              <button className="live-btn-ghost" onClick={() => setEditingStream(null)}>Hủy</button>
              <button className="live-btn-primary" onClick={handleSaveEdit}>Lưu Thay Đổi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --live-bg: #0f1117;
  --live-surface: #181b24;
  --live-surface-hover: #222634;
  --live-border: #2a2e3d;
  --live-text: #f0f2f5;
  --live-muted: #8e95a5;
  --live-red: #ff3b30;
  --live-accent: #3b82f6;
  --live-accent-hover: #2563eb;
}

body {
  font-family: 'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, sans-serif;
  background-color: var(--live-bg);
  color: var(--live-text);
  min-height: 100vh;
}

.live-toast-notification {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: #10b981;
  color: #fff;
  padding: 12px 20px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  z-index: 2000;
  animation: slideUp 0.3s ease;
}
@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.live-page-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--live-bg);
}

/* Header */
.live-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 24px;
  background-color: var(--live-surface);
  border-bottom: 1px solid var(--live-border);
  position: sticky;
  top: 0;
  z-index: 100;
}
.live-header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}
.live-logo {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  text-decoration: none;
  letter-spacing: -0.5px;
}
.live-logo span {
  color: var(--live-muted);
  font-weight: 300;
}
.live-badge-live {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 59, 48, 0.15);
  border: 1px solid rgba(255, 59, 48, 0.3);
  color: #ff5252;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 20px;
  letter-spacing: 0.5px;
}
.live-pulse-dot {
  width: 8px;
  height: 8px;
  background-color: var(--live-red);
  border-radius: 50%;
  box-shadow: 0 0 8px var(--live-red);
  animation: pulse 1.5s infinite;
}
@keyframes pulse {
  0% { transform: scale(0.95); opacity: 0.8; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(0.95); opacity: 0.8; }
}

.live-nav-btn {
  font-size: 13px;
  color: var(--live-muted);
  text-decoration: none;
  padding: 6px 14px;
  border-radius: 8px;
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--live-border);
  transition: all 0.2s;
}
.live-nav-btn:hover {
  background: rgba(255,255,255,0.1);
  color: #fff;
}

/* Controls Bar */
.control-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  padding: 12px 24px;
  background: #141720;
  border-bottom: 1px solid var(--live-border);
}
.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
}
.control-label {
  font-size: 12px;
  color: var(--live-muted);
  font-weight: 500;
}
.btn-segmented {
  display: inline-flex;
  background: var(--live-surface);
  border: 1px solid var(--live-border);
  border-radius: 8px;
  padding: 2px;
  gap: 2px;
}
.seg-btn {
  background: transparent;
  border: none;
  color: var(--live-muted);
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}
.seg-btn:hover {
  color: var(--live-text);
}
.seg-btn.active {
  background: var(--live-accent);
  color: #fff;
  font-weight: 600;
}

.control-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.live-btn-primary {
  background: var(--live-accent);
  color: #fff;
  border: none;
  padding: 7px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.live-btn-primary:hover {
  background: var(--live-accent-hover);
}
.live-btn-icon, .live-btn-ghost {
  background: var(--live-surface);
  border: 1px solid var(--live-border);
  color: var(--live-text);
  padding: 7px 12px;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
.live-btn-icon:hover, .live-btn-ghost:hover {
  background: var(--live-surface-hover);
}

/* View Area */
.live-container {
  flex: 1;
  padding: 16px 24px;
}
.live-container.fullscreen-mode {
  padding: 12px;
  background: #000;
}

/* Streams Grid */
.streams-grid {
  display: grid;
  gap: 16px;
  width: 100%;
}
.stream-card {
  background: var(--live-surface);
  border: 1px solid var(--live-border);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  transition: border-color 0.2s, transform 0.2s;
}
.stream-card:hover {
  border-color: rgba(59, 130, 246, 0.4);
}

.stream-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: #1e222f;
  border-bottom: 1px solid var(--live-border);
  gap: 8px;
}
.stream-title-info {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.live-dot-pulse {
  width: 7px;
  height: 7px;
  background-color: var(--live-red);
  border-radius: 50%;
  flex-shrink: 0;
}
.stream-shop-name {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
}
.stream-title {
  font-size: 12px;
  color: var(--live-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.stream-note-tag {
  font-size: 10px;
  background: rgba(255,255,255,0.08);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--live-muted);
}

.stream-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.stream-controls button, .stream-controls a {
  background: rgba(255, 255, 255, 0.06);
  border: none;
  color: var(--live-muted);
  width: 26px;
  height: 26px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.15s;
}
.stream-controls button:hover, .stream-controls a:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}
.stream-controls button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.stream-controls .btn-del:hover {
  background: rgba(255, 59, 48, 0.2);
  color: #ff5252;
}

/* Video Wrapper & Aspect Ratios */
.stream-video-wrap {
  position: relative;
  width: 100%;
  background: #000;
}
.aspect-16-9 .stream-video-wrap {
  padding-top: 56.25%; /* 16:9 */
}
.aspect-9-16 .stream-video-wrap {
  padding-top: 130%; /* taller for mobile vertical live */
}
.aspect-auto .stream-video-wrap {
  height: 380px;
}
.stream-iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: none;
}

/* Focus / Theater Mode Layout */
.focus-layout {
  display: flex;
  gap: 16px;
  min-height: calc(100vh - 140px);
}
.focus-main-window {
  flex: 1;
  background: var(--live-surface);
  border: 1px solid var(--live-border);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.focus-video {
  flex: 1;
  padding-top: 0 !important;
  min-height: 500px;
}
.focus-sidebar {
  width: 320px;
  background: var(--live-surface);
  border: 1px solid var(--live-border);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.focus-sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--live-border);
  padding-bottom: 8px;
}
.sidebar-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--live-muted);
}
.btn-text-sm {
  background: transparent;
  border: none;
  color: var(--live-accent);
  font-size: 11px;
  cursor: pointer;
}
.sidebar-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
}
.sidebar-item {
  background: #141720;
  border: 1px solid var(--live-border);
  border-radius: 8px;
  padding: 10px 12px;
  cursor: pointer;
  transition: all 0.15s;
}
.sidebar-item:hover {
  background: var(--live-surface-hover);
  border-color: rgba(59, 130, 246, 0.3);
}
.sidebar-item.active {
  border-color: var(--live-accent);
  background: rgba(59, 130, 246, 0.1);
}
.sidebar-item-header {
  display: flex;
  align-items: center;
  gap: 8px;
}
.sidebar-num {
  font-size: 11px;
  color: var(--live-muted);
  font-weight: 600;
}
.sidebar-name {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  flex: 1;
}
.sidebar-badge {
  font-size: 9px;
  background: var(--live-accent);
  color: #fff;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 700;
}
.sidebar-item-sub {
  font-size: 11px;
  color: var(--live-muted);
  margin-top: 4px;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 60px 20px;
  background: var(--live-surface);
  border: 1px dashed var(--live-border);
  border-radius: 16px;
  margin-top: 20px;
}
.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}
.empty-state h2 {
  font-size: 20px;
  margin-bottom: 8px;
  color: #fff;
}
.empty-state p {
  font-size: 14px;
  color: var(--live-muted);
  margin-bottom: 20px;
  max-width: 400px;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}
.modal-content {
  background: var(--live-surface);
  border: 1px solid var(--live-border);
  border-radius: 14px;
  width: 100%;
  max-width: 480px;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
}
.modal-content.modal-lg {
  max-width: 640px;
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--live-border);
}
.modal-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}
.modal-close {
  background: transparent;
  border: none;
  color: var(--live-muted);
  font-size: 18px;
  cursor: pointer;
}
.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.form-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--live-muted);
}
.form-input {
  background: #12141c;
  border: 1px solid var(--live-border);
  border-radius: 8px;
  padding: 10px 14px;
  color: #fff;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
}
.form-textarea {
  background: #12141c;
  border: 1px solid var(--live-border);
  border-radius: 8px;
  padding: 12px 14px;
  color: #fff;
  font-size: 13px;
  font-family: monospace;
  outline: none;
  resize: vertical;
  line-height: 1.5;
}
.form-input:focus, .form-textarea:focus {
  border-color: var(--live-accent);
}
.form-hint {
  font-size: 11px;
  color: var(--live-muted);
  line-height: 1.5;
}

.current-list-summary {
  margin-top: 12px;
  padding: 12px;
  background: #12141c;
  border: 1px solid var(--live-border);
  border-radius: 8px;
}
.summary-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
  color: var(--live-muted);
  margin-bottom: 8px;
}
.btn-del-text {
  background: transparent;
  border: none;
  color: #ff5252;
  font-size: 11px;
  cursor: pointer;
}
.summary-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 120px;
  overflow-y: auto;
}
.shop-tag {
  background: var(--live-surface);
  border: 1px solid var(--live-border);
  color: #fff;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.shop-tag button {
  background: transparent;
  border: none;
  color: var(--live-muted);
  cursor: pointer;
  font-size: 10px;
}
.shop-tag button:hover {
  color: #ff5252;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  background: #141720;
  border-top: 1px solid var(--live-border);
}

@media (max-width: 900px) {
  .streams-grid {
    grid-template-columns: 1fr !important;
  }
  .focus-layout {
    flex-direction: column;
  }
  .focus-sidebar {
    width: 100%;
  }
  .control-bar {
    flex-direction: column;
    align-items: flex-start;
  }
}
`

import React, { useEffect, useState } from 'react'
import type { AiProvider, Settings } from '../types'
import { DEFAULT_SETTINGS } from '../types'

type Message =
  | { type: 'GET_SETTINGS' }
  | { type: 'SAVE_SETTINGS'; settings: Settings }
  | { type: 'SYNC_TO_CLOUD' }

function send<T>(msg: Message): Promise<{ success: boolean; data: T; error?: string }> {
  return chrome.runtime.sendMessage(msg)
}

const AI_PROVIDERS: { value: AiProvider; label: string; desc: string; keyLabel: string; keyPlaceholder: string }[] = [
  { value: 'none', label: 'Không dùng AI', desc: 'Tự trích xuất thủ công từ bài đăng (không cần API key).', keyLabel: '', keyPlaceholder: '' },
  { value: 'openai', label: 'OpenAI (GPT-4o-mini)', desc: 'Nhanh, rẻ. Lấy key tại platform.openai.com', keyLabel: 'OpenAI API Key', keyPlaceholder: 'sk-...' },
  { value: 'anthropic', label: 'Anthropic (Claude Haiku)', desc: 'Chính xác, hỗ trợ tiếng Việt tốt. Lấy key tại console.anthropic.com', keyLabel: 'Anthropic API Key', keyPlaceholder: 'sk-ant-...' },
  { value: 'gemini', label: 'Google Gemini Flash', desc: 'Miễn phí ở mức cơ bản. Lấy key tại aistudio.google.com', keyLabel: 'Gemini API Key', keyPlaceholder: 'AIza...' },
]

export default function App() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState('')
  const [itemCount, setItemCount] = useState(0)

  useEffect(() => {
    send<Settings>({ type: 'GET_SETTINGS' }).then(res => {
      if (res.success) setSettings(res.data)
    })
    chrome.storage.local.get('fbs_items', res => {
      setItemCount((res.fbs_items as unknown[])?.length ?? 0)
    })
  }, [])

  function update(patch: Partial<Settings>) {
    setSettings(prev => ({ ...prev, ...patch }))
    setSaved(false)
  }

  async function handleSave() {
    await send({ type: 'SAVE_SETTINGS', settings })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function handleTestKey() {
    if (!settings.apiKey || settings.aiProvider === 'none') {
      setTestResult('❌ Vui lòng chọn nhà cung cấp AI và nhập API key.')
      return
    }
    setTesting(true)
    setTestResult('')
    try {
      const res = await testApiKey(settings)
      setTestResult(res ? '✅ API key hợp lệ!' : '❌ API key không hợp lệ hoặc đã hết quota.')
    } catch {
      setTestResult('❌ Không kết nối được. Kiểm tra lại key.')
    }
    setTesting(false)
  }

  async function handleSync() {
    setSyncing(true)
    setSyncResult('')
    const res = await send<{ synced: number }>({ type: 'SYNC_TO_CLOUD' })
    setSyncing(false)
    setSyncResult(res.success ? `✅ Đã sync ${res.data?.synced ?? 0} mục lên Supabase.` : `❌ ${res.error}`)
  }

  async function handleExport() {
    const res = await chrome.storage.local.get('fbs_items')
    const data = JSON.stringify(res.fbs_items ?? [], null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fb-saver-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    try {
      const items = JSON.parse(text)
      await chrome.storage.local.set({ fbs_items: items })
      setItemCount(items.length)
      alert(`✅ Đã import ${items.length} mục.`)
    } catch {
      alert('❌ File không hợp lệ.')
    }
  }

  async function handleClearData() {
    if (!confirm('Xóa tất cả dữ liệu đã lưu? Hành động này không thể hoàn tác.')) return
    await chrome.storage.local.remove('fbs_items')
    setItemCount(0)
  }

  const selectedProvider = AI_PROVIDERS.find(p => p.value === settings.aiProvider)!

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1877f2', marginBottom: 4 }}>
          ⚙️ Cài đặt FB Saver
        </h1>
        <p style={{ color: '#65676b', fontSize: 14 }}>
          Cấu hình AI phân tích, lưu trữ đám mây và quản lý dữ liệu.
        </p>
      </div>

      {/* Section: AI */}
      <Section title="🤖 Phân tích AI">
        <p style={{ fontSize: 13, color: '#65676b', marginBottom: 14, lineHeight: '1.5' }}>
          Chọn nhà cung cấp AI để tự động trích xuất tên sản phẩm, giá, tình trạng từ bài đăng.
          Nếu không cấu hình, extension sẽ cố gắng phân tích thủ công.
        </p>

        <Label>Nhà cung cấp AI</Label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {AI_PROVIDERS.map(p => (
            <label key={p.value} style={{
              display: 'flex', gap: 10, padding: '10px 12px',
              border: settings.aiProvider === p.value ? '2px solid #1877f2' : '2px solid #e4e6eb',
              borderRadius: 10, cursor: 'pointer', background: settings.aiProvider === p.value ? '#f0f7ff' : '#fff',
              transition: 'border 0.1s',
            }}>
              <input
                type="radio"
                name="aiProvider"
                value={p.value}
                checked={settings.aiProvider === p.value}
                onChange={() => update({ aiProvider: p.value })}
                style={{ marginTop: 2 }}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{p.label}</div>
                <div style={{ fontSize: 12, color: '#65676b', marginTop: 2 }}>{p.desc}</div>
              </div>
            </label>
          ))}
        </div>

        {settings.aiProvider !== 'none' && (
          <>
            <Label>{selectedProvider.keyLabel}</Label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                type="password"
                value={settings.apiKey}
                onChange={e => update({ apiKey: e.target.value })}
                placeholder={selectedProvider.keyPlaceholder}
                style={inputStyle}
              />
              <button onClick={handleTestKey} disabled={testing} style={secBtnStyle}>
                {testing ? '⏳' : '🧪 Test'}
              </button>
            </div>
            {testResult && (
              <div style={{ fontSize: 13, marginBottom: 8, color: testResult.startsWith('✅') ? '#16a34a' : '#dc2626' }}>
                {testResult}
              </div>
            )}
            <p style={{ fontSize: 12, color: '#65676b' }}>
              ⚠️ API key được lưu cục bộ trên trình duyệt của bạn, không gửi đi nơi nào ngoài nhà cung cấp AI.
            </p>
          </>
        )}
      </Section>

      {/* Section: Cloud sync */}
      <Section title="☁️ Đồng bộ đám mây (Tùy chọn)">
        <p style={{ fontSize: 13, color: '#65676b', marginBottom: 14, lineHeight: '1.5' }}>
          Sync dữ liệu lên Supabase để truy cập trên nhiều thiết bị. Để trống nếu chỉ lưu cục bộ.
        </p>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <input
            type="checkbox"
            checked={settings.cloudSync}
            onChange={e => update({ cloudSync: e.target.checked })}
            style={{ width: 16, height: 16, accentColor: '#1877f2' }}
          />
          <span style={{ fontWeight: 600 }}>Bật đồng bộ Supabase</span>
        </label>

        {settings.cloudSync && (
          <>
            <Label>Supabase URL</Label>
            <input
              type="url"
              value={settings.supabaseUrl}
              onChange={e => update({ supabaseUrl: e.target.value })}
              placeholder="https://xxxx.supabase.co"
              style={{ ...inputStyle, marginBottom: 12 }}
            />

            <Label>Supabase Anon Key</Label>
            <input
              type="password"
              value={settings.supabaseKey}
              onChange={e => update({ supabaseKey: e.target.value })}
              placeholder="eyJhbGci..."
              style={{ ...inputStyle, marginBottom: 12 }}
            />

            <Label>Tên bảng (Table name)</Label>
            <input
              type="text"
              value={settings.supabaseTable}
              onChange={e => update({ supabaseTable: e.target.value })}
              placeholder="fb_saved_items"
              style={{ ...inputStyle, marginBottom: 12 }}
            />

            <button onClick={handleSync} disabled={syncing} style={primaryBtnStyle}>
              {syncing ? '⏳ Đang sync...' : '☁️ Sync ngay'}
            </button>
            {syncResult && (
              <div style={{ fontSize: 13, marginTop: 8, color: syncResult.startsWith('✅') ? '#16a34a' : '#dc2626' }}>
                {syncResult}
              </div>
            )}

            <div style={{ marginTop: 14, padding: 12, background: '#f8f9fa', borderRadius: 8, fontSize: 12, color: '#65676b' }}>
              <strong>SQL để tạo bảng trong Supabase:</strong>
              <pre style={{ marginTop: 6, overflowX: 'auto', fontSize: 11, lineHeight: '1.5' }}>{`CREATE TABLE IF NOT EXISTS ${settings.supabaseTable || 'fb_saved_items'} (
  id TEXT PRIMARY KEY,
  url TEXT,
  saved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  title TEXT,
  price BIGINT,
  price_text TEXT,
  condition TEXT,
  description TEXT,
  category TEXT,
  location TEXT,
  seller_name TEXT,
  seller_url TEXT,
  images TEXT[],
  tags TEXT[],
  status TEXT,
  raw_text TEXT,
  ai_analyzed BOOLEAN,
  notes TEXT
);`}</pre>
            </div>
          </>
        )}
      </Section>

      {/* Section: Data management */}
      <Section title="💾 Quản lý dữ liệu cục bộ">
        <p style={{ fontSize: 13, color: '#65676b', marginBottom: 14 }}>
          Hiện có <strong>{itemCount}</strong> mục được lưu trên trình duyệt này.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={handleExport} style={secBtnStyle}>
            📤 Xuất JSON
          </button>
          <label style={{ ...secBtnStyle, cursor: 'pointer' }}>
            📥 Nhập JSON
            <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
          </label>
          <button
            onClick={handleClearData}
            style={{ ...secBtnStyle, background: '#fee2e2', color: '#dc2626', borderColor: '#fca5a5' }}
          >
            🗑 Xóa tất cả
          </button>
        </div>
      </Section>

      {/* Save button */}
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={handleSave} style={primaryBtnStyle}>
          💾 Lưu cài đặt
        </button>
        {saved && (
          <span style={{ color: '#16a34a', fontSize: 14, fontWeight: 600 }}>✅ Đã lưu!</span>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '18px 20px',
      marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>{title}</h2>
      {children}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 600, color: '#1c1e21', marginBottom: 6 }}>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', border: '1px solid #ddd', borderRadius: 8,
  padding: '9px 12px', fontSize: 13, outline: 'none',
  fontFamily: 'inherit', background: '#f8f9fa',
}

const primaryBtnStyle: React.CSSProperties = {
  padding: '10px 20px', background: '#1877f2', color: '#fff',
  border: 'none', borderRadius: 8, cursor: 'pointer',
  fontWeight: 700, fontSize: 14, fontFamily: 'inherit',
}

const secBtnStyle: React.CSSProperties = {
  padding: '8px 14px', background: '#f0f2f5', color: '#1c1e21',
  border: '1px solid #e4e6eb', borderRadius: 8, cursor: 'pointer',
  fontWeight: 600, fontSize: 13, fontFamily: 'inherit', display: 'inline-flex',
  alignItems: 'center', gap: 4,
}

// Simple API key test (just validates auth endpoint, doesn't consume quota)
async function testApiKey(settings: { aiProvider: string; apiKey: string }): Promise<boolean> {
  try {
    if (settings.aiProvider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${settings.apiKey}` },
      })
      return res.ok
    }
    if (settings.aiProvider === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': settings.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] }),
      })
      return res.status !== 401
    }
    if (settings.aiProvider === 'gemini') {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${settings.apiKey}`)
      return res.ok
    }
    return false
  } catch {
    return false
  }
}

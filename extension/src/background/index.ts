import { analyzePost } from '../lib/ai'
import { deleteItem, generateId, getItems, getSettings, saveSettings, upsertItem } from '../lib/storage'
import { fetchFromSupabase, syncToSupabase } from '../lib/sync'
import type { Message, MessageResponse, PostPayload, SavedItem } from '../types'

chrome.runtime.onMessage.addListener(
  (message: Message, _sender, sendResponse: (r: MessageResponse) => void) => {
    handleMessage(message).then(sendResponse).catch(err => {
      sendResponse({ success: false, error: String(err) })
    })
    return true // keep channel open for async response
  },
)

async function handleMessage(msg: Message): Promise<MessageResponse> {
  switch (msg.type) {
    case 'SAVE_POST':
      return savePost(msg.payload)

    case 'GET_ITEMS': {
      const items = await getItems()
      return { success: true, data: items }
    }

    case 'DELETE_ITEM': {
      await deleteItem(msg.id)
      return { success: true, data: null }
    }

    case 'UPDATE_ITEM': {
      await upsertItem(msg.item)
      return { success: true, data: msg.item }
    }

    case 'GET_SETTINGS': {
      const settings = await getSettings()
      return { success: true, data: settings }
    }

    case 'SAVE_SETTINGS': {
      await saveSettings(msg.settings)
      return { success: true, data: null }
    }

    case 'SYNC_TO_CLOUD': {
      const settings = await getSettings()
      if (!settings.cloudSync) return { success: false, error: 'Cloud sync chưa được bật.' }
      const items = await getItems()
      await syncToSupabase(items, settings)
      return { success: true, data: { synced: items.length } }
    }

    case 'ANALYZE_ITEM': {
      const items = await getItems()
      const item = items.find(i => i.id === msg.id)
      if (!item) return { success: false, error: 'Không tìm thấy mục.' }
      const settings = await getSettings()
      const analyzed = await analyzePost(item.rawText, settings)
      const updated: SavedItem = { ...item, ...analyzed, updatedAt: Date.now() }
      await upsertItem(updated)
      return { success: true, data: updated }
    }

    default:
      return { success: false, error: 'Unknown message type' }
  }
}

async function savePost(payload: PostPayload): Promise<MessageResponse> {
  const settings = await getSettings()

  // Build base item immediately
  const now = Date.now()
  const id = generateId()
  const baseItem: SavedItem = {
    id,
    url: payload.url,
    savedAt: now,
    updatedAt: now,
    title: 'Đang phân tích...',
    price: null,
    priceText: '',
    condition: '',
    description: '',
    category: '',
    location: '',
    seller: payload.seller,
    images: payload.images,
    tags: [],
    status: 'unknown',
    rawText: payload.text,
    aiAnalyzed: false,
    notes: '',
    compareSelected: false,
  }

  // Save immediately so user sees the item right away
  await upsertItem(baseItem)

  // Run AI analysis in the background (don't block save response)
  if (settings.aiProvider !== 'none' && settings.apiKey) {
    analyzePost(payload.text, settings).then(async analyzed => {
      const enriched: SavedItem = {
        ...baseItem,
        ...analyzed,
        images: payload.images, // keep original images
        seller: payload.seller,
        updatedAt: Date.now(),
      }
      await upsertItem(enriched)
    }).catch(err => {
      console.error('[FbSaver] AI analysis error:', err)
    })
  } else {
    // No AI: extract basic info from raw text heuristically
    const heuristic = extractHeuristic(payload.text)
    const enriched: SavedItem = { ...baseItem, ...heuristic, updatedAt: Date.now() }
    await upsertItem(enriched)
  }

  return { success: true, data: { id } }
}

// Simple heuristic extraction when no AI is configured
function extractHeuristic(text: string): Partial<SavedItem> {
  // Price patterns: 1tr, 1.5tr, 1,500,000đ, 1500k, v.v.
  const pricePatterns = [
    /(\d[\d,.]*)(?:\s*)(triệu|tr)\b/i,
    /(\d[\d,.]*)(?:\s*)(?:k|nghìn|ngàn)\b/i,
    /(\d[\d,.]+)\s*đ(?:ồng)?\b/i,
    /giá[:\s]+(\d[\d,.]+)/i,
  ]

  let price: number | null = null
  let priceText = ''

  for (const pat of pricePatterns) {
    const m = text.match(pat)
    if (m) {
      priceText = m[0]
      const num = parseFloat(m[1].replace(/,/g, ''))
      if (/triệu|tr/i.test(m[0])) price = Math.round(num * 1_000_000)
      else if (/k|nghìn|ngàn/i.test(m[0])) price = Math.round(num * 1_000)
      else price = Math.round(num)
      break
    }
  }

  // Condition
  let condition = 'Không rõ'
  if (/\bmới\b/i.test(text) && !/\bnhư mới\b/i.test(text)) condition = 'Mới'
  else if (/\bnhư mới\b/i.test(text)) condition = 'Như mới'
  else if (/\bcũ\b|\bđã dùng\b|\bsecond\b|\b2nd\b/i.test(text)) condition = 'Cũ'

  // Status
  let status: SavedItem['status'] = 'available'
  if (/\bđã bán\b|\bsold\b|\bchốt\b/i.test(text)) status = 'sold'

  // Title: first non-empty line (up to 80 chars)
  const firstLine = text.split('\n').find(l => l.trim().length > 3)?.trim() ?? 'Sản phẩm'
  const title = firstLine.slice(0, 80)

  return { title, price, priceText, condition, status, description: text.slice(0, 600) }
}

// On install: set default badge
chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeBackgroundColor({ color: '#1877f2' })
})

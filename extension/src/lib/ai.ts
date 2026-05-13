import type { SavedItem, Settings } from '../types'

const SYSTEM_PROMPT = `Bạn là trợ lý phân tích bài đăng bán hàng trên Facebook Marketplace và các nhóm mua bán.
Nhiệm vụ: trích xuất thông tin sản phẩm từ bài viết và trả về JSON hợp lệ.`

function buildUserPrompt(text: string): string {
  return `Phân tích bài đăng bán hàng dưới đây. Trả về JSON với đúng định dạng sau (không giải thích thêm):

{
  "title": "tên sản phẩm ngắn gọn (tối đa 80 ký tự)",
  "price": 1500000,
  "priceText": "giá dạng text gốc trong bài, ví dụ: '1,5tr' hoặc 'thương lượng'",
  "condition": "một trong: mới / như mới / cũ / đã qua sử dụng / không rõ",
  "description": "mô tả chi tiết sản phẩm (trích từ bài)",
  "category": "loại hàng, ví dụ: Điện tử / Thời trang / Xe cộ / Đồ gia dụng / Khác",
  "location": "địa điểm hoặc khu vực giao dịch nếu có, nếu không có để chuỗi rỗng",
  "status": "available | sold | unknown",
  "tags": ["tag1", "tag2", "tag3"]
}

Lưu ý:
- "price" là số nguyên VND, null nếu thương lượng hoặc không rõ
- "tags" tối đa 5 tags ngắn liên quan đến sản phẩm
- Nếu bài viết không phải bán hàng, vẫn cố gắng trích xuất thông tin hữu ích

Bài đăng:
${text}`
}

interface AiResult {
  title?: string
  price?: number | null
  priceText?: string
  condition?: string
  description?: string
  category?: string
  location?: string
  status?: 'available' | 'sold' | 'unknown'
  tags?: string[]
}

export async function analyzePost(
  rawText: string,
  settings: Settings,
): Promise<Partial<SavedItem>> {
  if (settings.aiProvider === 'none' || !settings.apiKey) {
    return { rawText, aiAnalyzed: false }
  }

  try {
    let result: AiResult
    if (settings.aiProvider === 'openai') {
      result = await callOpenAI(rawText, settings.apiKey)
    } else if (settings.aiProvider === 'anthropic') {
      result = await callAnthropic(rawText, settings.apiKey)
    } else if (settings.aiProvider === 'gemini') {
      result = await callGemini(rawText, settings.apiKey)
    } else {
      return { rawText, aiAnalyzed: false }
    }

    return {
      title: result.title ?? 'Sản phẩm chưa đặt tên',
      price: result.price ?? null,
      priceText: result.priceText ?? 'Liên hệ',
      condition: result.condition ?? 'Không rõ',
      description: result.description ?? rawText.slice(0, 500),
      category: result.category ?? 'Khác',
      location: result.location ?? '',
      status: result.status ?? 'unknown',
      tags: result.tags ?? [],
      rawText,
      aiAnalyzed: true,
    }
  } catch (err) {
    console.error('[FbSaver] AI analysis failed:', err)
    return { rawText, aiAnalyzed: false }
  }
}

async function callOpenAI(text: string, apiKey: string): Promise<AiResult> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(text) },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 800,
    }),
  })
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return JSON.parse(data.choices[0].message.content)
}

async function callAnthropic(text: string, apiKey: string): Promise<AiResult> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(text) }],
    }),
  })
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return JSON.parse(data.content[0].text)
}

async function callGemini(text: string, apiKey: string): Promise<AiResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildUserPrompt(text) }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: 800,
      },
    }),
  })
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return JSON.parse(data.candidates[0].content.parts[0].text)
}

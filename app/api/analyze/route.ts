import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { text } = await req.json()
  if (!text?.trim()) return NextResponse.json({ error: 'empty' }, { status: 400 })

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL ?? 'https://leviethoang.shop',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL ?? 'google/gemini-flash-1.5',
      messages: [
        {
          role: 'system',
          content: `Bạn là AI phân tích đơn hàng mua bán. Từ văn bản tự nhiên, trích xuất thông tin và trả về JSON duy nhất (không markdown, không giải thích):
{
  "title": "tên sản phẩm ngắn gọn",
  "description": "mô tả chi tiết 1-2 câu, bổ sung thông tin hữu ích nếu cần",
  "price": 1200000,
  "condition": "Mới | Cũ - Như mới | Cũ - Còn tốt | Cũ - Có lỗi nhỏ",
  "category": "danh mục phù hợp",
  "type": "ban | mua",
  "phone": "số điện thoại nếu có, để trống nếu không",
  "location": "địa điểm nếu có, để trống nếu không"
}
Quan trọng: price là số nguyên VNĐ, không có chữ, không có dấu chấm/phẩy. VD: 4 triệu = 4000000, 500k = 500000. Nếu không có giá thì để null.`,
        },
        { role: 'user', content: text },
      ],
    }),
  })

  const data = await res.json()
  const raw = data.choices?.[0]?.message?.content ?? '{}'
  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
    // Normalize price to number
    if (parsed.price !== null && parsed.price !== undefined) {
      const n = typeof parsed.price === 'number'
        ? parsed.price
        : Number(String(parsed.price).replace(/[^0-9]/g, ''))
      parsed.price = isNaN(n) || n === 0 ? null : n
    }
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({}, { status: 422 })
  }
}

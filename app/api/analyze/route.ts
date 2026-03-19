import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { text } = await req.json()
  if (!text?.trim()) return NextResponse.json({ error: 'empty' }, { status: 400 })

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL ?? 'https://cho-nhanh.vercel.app',
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
  "price": "giá có đơn vị đ (ví dụ: 1.200.000đ), nếu không có thì Thương lượng",
  "condition": "Mới | Cũ - Như mới | Cũ - Còn tốt | Cũ - Có lỗi nhỏ",
  "category": "danh mục phù hợp",
  "type": "ban | mua",
  "phone": "số điện thoại nếu có, để trống nếu không",
  "location": "địa điểm nếu có, để trống nếu không"
}`,
        },
        { role: 'user', content: text },
      ],
    }),
  })

  const data = await res.json()
  const raw = data.choices?.[0]?.message?.content ?? '{}'
  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({}, { status: 422 })
  }
}

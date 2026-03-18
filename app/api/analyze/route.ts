import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { text } = await req.json()
  if (!text?.trim()) return NextResponse.json({ error: 'empty' }, { status: 400 })

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: `Bạn là AI phân tích đơn hàng mua bán. Từ văn bản tự nhiên, trích xuất thông tin và trả về JSON duy nhất (không markdown, không giải thích):
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
      messages: [{ role: 'user', content: text }],
    }),
  })

  const data = await res.json()
  const raw = data.content?.[0]?.text || '{}'
  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({}, { status: 422 })
  }
}

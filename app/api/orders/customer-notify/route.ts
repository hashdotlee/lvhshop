import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const PAGE_ID = process.env.NEXT_PUBLIC_FB_PAGE_ID ?? ''
const PAGE_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN ?? ''

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { order_id, order_number, customer_name, item_title, payment_method, user_access_token } = body

  if (!order_id || !order_number || !user_access_token) {
    return NextResponse.json({ ok: false, error: 'missing fields' }, { status: 400 })
  }

  if (!PAGE_TOKEN) {
    return NextResponse.json({ ok: true, notified: false, reason: 'PAGE_TOKEN not configured' })
  }

  // Convert user access token to page-scoped PSID
  let psid: string | null = null
  if (PAGE_ID) {
    try {
      const res = await fetch(
        `https://graph.facebook.com/me/ids_for_pages?page_ids=${PAGE_ID}&access_token=${user_access_token}`
      )
      const data = await res.json()
      if (Array.isArray(data?.data) && data.data.length > 0) {
        psid = data.data[0].id as string
      }
    } catch {
      // PSID lookup failed
    }
  }

  if (!psid) {
    return NextResponse.json({ ok: true, notified: false, reason: 'could not resolve PSID' })
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
  )

  // Save PSID to order record
  try {
    await db.from('orders').update({ fb_psid: psid }).eq('id', order_id)
  } catch {
    // Non-critical
  }

  // Save PSID to customer record if Supabase JWT provided (links FB to app account)
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const jwt = authHeader.slice(7)
    try {
      const { data: { user } } = await db.auth.getUser(jwt)
      if (user?.id) {
        await db.from('customers').update({ fb_psid: psid }).eq('user_id', user.id)
      }
    } catch {
      // Non-critical
    }
  }

  const payLabel = payment_method === 'bank_transfer' ? 'Chuyển khoản ngân hàng' : 'Thanh toán khi nhận hàng (COD)'
  const itemLine = item_title ? `\n📦 Sản phẩm: ${item_title}` : ''
  const message =
    `Xin chào ${customer_name}! 🎉\n` +
    `Đơn hàng ${order_number} đã được đặt thành công.` +
    itemLine +
    `\n💳 Thanh toán: ${payLabel}\n\n` +
    `Chúng tôi sẽ liên hệ xác nhận và sắp xếp giao hàng sớm nhất. Cảm ơn bạn đã tin tưởng leviethoang.shop! 🙏`

  const fbRes = await fetch(
    `https://graph.facebook.com/v21.0/me/messages?access_token=${PAGE_TOKEN}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: { id: psid }, message: { text: message } }),
    }
  )

  if (!fbRes.ok) {
    const err = await fbRes.json().catch(() => ({}))
    return NextResponse.json({ ok: true, notified: false, reason: 'messenger send failed', detail: err })
  }

  return NextResponse.json({ ok: true, notified: true })
}

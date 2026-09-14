import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
  )
}

const SELECT_FIELDS_WITH_LOOKUP = `
  id, order_number, item_id, item_title, item_price,
  customer_name, customer_address,
  shipping_carrier, tracking_number,
  payment_method, payment_status, order_status,
  total_amount, created_at, updated_at,
  lookup_count, last_lookup_at,
  items(title, price, order_code, images),
  order_items(id, item_title, item_price, quantity, order_code)
`

const SELECT_FIELDS_FALLBACK = `
  id, order_number, item_id, item_title, item_price,
  customer_name, customer_address,
  shipping_carrier, tracking_number,
  payment_method, payment_status, order_status,
  total_amount, created_at, updated_at,
  items(title, price, order_code, images),
  order_items(id, item_title, item_price, quantity, order_code)
`

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const rawQuery = (url.searchParams.get('phone') || url.searchParams.get('q') || '').trim()
  const isOrderNumber = rawQuery.toUpperCase().startsWith('DH-')
  const phone = rawQuery.replace(/\s/g, '')

  if (!isOrderNumber && phone.length < 9) {
    return NextResponse.json({ error: 'Số điện thoại hoặc mã đơn không hợp lệ' }, { status: 400 })
  }

  const db = getDb()

  // First try selecting with lookup_count & last_lookup_at
  let query: any = db.from('orders').select(SELECT_FIELDS_WITH_LOOKUP)
  if (isOrderNumber) {
    query = query.eq('order_number', rawQuery.toUpperCase())
  } else {
    query = query.eq('customer_phone', phone)
  }

  let resultData: any[] | null = null
  let resultError: any = null

  const res = await query.order('created_at', { ascending: false }).limit(50)
  resultData = res.data
  resultError = res.error

  // If column does not exist yet (before migration), fallback gracefully
  if (resultError && (resultError.message?.includes('lookup_count') || resultError.message?.includes('last_lookup_at'))) {
    let fallbackQuery: any = db.from('orders').select(SELECT_FIELDS_FALLBACK)
    if (isOrderNumber) {
      fallbackQuery = fallbackQuery.eq('order_number', rawQuery.toUpperCase())
    } else {
      fallbackQuery = fallbackQuery.eq('customer_phone', phone)
    }
    const fallbackRes = await fallbackQuery.order('created_at', { ascending: false }).limit(50)
    resultData = fallbackRes.data
    resultError = fallbackRes.error
  }

  if (resultError) return NextResponse.json({ error: resultError.message }, { status: 500 })

  const orders: any[] = resultData ?? []
  if (orders.length > 0) {
    const now = new Date().toISOString()
    // Record lookup count and timestamp in database asynchronously
    try {
      await Promise.allSettled(
        orders.map((order: any) =>
          db
            .from('orders')
            .update({
              lookup_count: (Number(order.lookup_count) || 0) + 1,
              last_lookup_at: now,
            })
            .eq('id', order.id)
        )
      )
    } catch {}

    // Return updated counts immediately to caller
    const updated = orders.map((order: any) => ({
      ...order,
      lookup_count: (Number(order.lookup_count) || 0) + 1,
      last_lookup_at: now,
    }))
    return NextResponse.json(updated)
  }

  return NextResponse.json([])
}

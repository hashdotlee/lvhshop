import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function publicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
  )
}

export async function GET(req: NextRequest) {
  const phone = new URL(req.url).searchParams.get('phone')?.trim().replace(/\s/g, '')
  if (!phone || phone.length < 9) {
    return NextResponse.json({ error: 'Số điện thoại không hợp lệ' }, { status: 400 })
  }

  const db = publicClient()
  const { data, error } = await db
    .from('orders')
    .select(`
      id, order_number, item_id, item_title, item_price,
      customer_name, customer_address,
      shipping_carrier, tracking_number,
      payment_method, payment_status, order_status,
      total_amount, created_at, updated_at,
      items(title, price, order_code, images)
    `)
    .eq('customer_phone', phone)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

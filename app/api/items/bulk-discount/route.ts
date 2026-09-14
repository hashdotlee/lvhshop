import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
  )
}

function checkAdmin(req: NextRequest) {
  return req.headers.get('x-admin-key') === process.env.ADMIN_PASSWORD
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { discount_percent, discount_amount, discount_end_date, target } = body

  const db = adminClient()
  const updateData: Record<string, unknown> = {
    discount_percent: discount_percent ? Number(discount_percent) : 0,
    discount_amount: discount_amount ? Number(discount_amount) : 0,
    discount_end_date: discount_end_date || null,
  }

  let query: any = db.from('items').update(updateData)
  if (target === 'all_including_sold') {
    query = query.neq('id', 0)
  } else {
    // Mặc định áp dụng cho tất cả mặt hàng đang bán / chưa bán
    query = query.neq('status', 'sold')
  }

  const { data, error } = await query.select()
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    count: data?.length ?? 0,
    items: data ?? [],
  })
}

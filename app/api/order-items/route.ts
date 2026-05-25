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

// Add item to an existing order
export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { order_id, item_id, item_title, item_price, quantity } = await req.json()
  if (!order_id || !item_title) return NextResponse.json({ error: 'missing order_id or item_title' }, { status: 400 })
  const db = adminClient()
  // Look up order_code from items table if item_id provided
  let order_code: string | null = null
  if (item_id) {
    const { data: itemRow } = await db.from('items').select('order_code').eq('id', item_id).single()
    order_code = (itemRow as { order_code: string } | null)?.order_code ?? null
  }
  const { data, error } = await db
    .from('order_items')
    .insert({ order_id, item_id: item_id || null, item_title, item_price: item_price || null, quantity: quantity || 1, order_code })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Recalculate order total from all order_items
  const { data: allItems } = await db.from('order_items').select('item_price, quantity').eq('order_id', order_id)
  if (allItems) {
    const total = allItems.reduce((sum, i) => sum + (i.item_price ?? 0) * (i.quantity ?? 1), 0)
    if (total > 0) await db.from('orders').update({ total_amount: total }).eq('id', order_id)
  }

  return NextResponse.json(data, { status: 201 })
}

// Remove item from order
export async function DELETE(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id, order_id } = await req.json()
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })
  const db = adminClient()
  const { error } = await db.from('order_items').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Recalculate order total
  if (order_id) {
    const { data: allItems } = await db.from('order_items').select('item_price, quantity').eq('order_id', order_id)
    if (allItems) {
      const total = allItems.reduce((sum, i) => sum + (i.item_price ?? 0) * (i.quantity ?? 1), 0)
      await db.from('orders').update({ total_amount: total > 0 ? total : null }).eq('id', order_id)
    }
  }

  return NextResponse.json({ ok: true })
}

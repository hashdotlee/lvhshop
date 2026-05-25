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

const SELECT_FULL = '*, items(title, price, order_code, images), order_items(*)'
const SELECT_BASE = '*, items(title, price, order_code, images)'

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const db = adminClient()
  const url = new URL(req.url)
  const id = url.searchParams.get('id')

  if (id) {
    let { data, error } = await db.from('orders').select(SELECT_FULL).eq('id', id).single()
    if (error?.message?.includes('order_items')) {
      ;({ data, error } = await db.from('orders').select(SELECT_BASE).eq('id', id).single())
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  let { data, error } = await db.from('orders').select(SELECT_FULL).order('created_at', { ascending: false })
  if (error?.message?.includes('order_items')) {
    ;({ data, error } = await db.from('orders').select(SELECT_BASE).order('created_at', { ascending: false }))
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { item_id, item_title, item_price, cart_items, customer_name, customer_phone, customer_address, customer_note, shipping_carrier, payment_method, total_amount, fb_psid, fb_url, created_by, address_id } = body
  if (!customer_name || !customer_phone || !customer_address || !payment_method) {
    return NextResponse.json({ error: 'missing required fields' }, { status: 400 })
  }
  const isAdmin = checkAdmin(req)
  const db = adminClient()

  const cartItems: Array<{ id?: number; title: string; price: number | null }> =
    Array.isArray(cart_items) && cart_items.length > 0 ? cart_items : []
  const computedTotal = cartItems.length > 0
    ? (cartItems.reduce((s, i) => s + (i.price ?? 0), 0) || null)
    : (total_amount ?? null)

  // All items that should become order_items: prefer cart_items, fall back to single item
  const allOrderItems: Array<{ id?: number; title: string; price: number | null }> =
    cartItems.length > 0
      ? cartItems
      : (item_id || item_title)
        ? [{ id: item_id || undefined, title: item_title ?? '', price: item_price ?? null }]
        : []

  const baseRow = {
    item_id: cartItems.length > 0 ? null : (item_id || null),
    item_title: cartItems.length > 0 ? null : (item_title ?? null),
    item_price: cartItems.length > 0 ? null : (item_price ?? null),
    customer_name, customer_phone, customer_address, customer_note,
    shipping_carrier: shipping_carrier || 'spx', payment_method,
    total_amount: computedTotal,
    fb_psid, created_by: created_by || (isAdmin ? 'admin' : 'customer'),
    address_id: address_id || null,
  }
  // New orders have no order_items yet — use base select to avoid schema cache issues
  let { data, error } = await db.from('orders').insert({ ...baseRow, fb_url: fb_url || null }).select(SELECT_BASE).single()
  // Retry without fb_url if the column isn't in the schema cache yet
  if (error?.message?.includes('fb_url')) {
    ;({ data, error } = await db.from('orders').insert(baseRow).select(SELECT_BASE).single())
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Create order_items for all orders (cart and single-item)
  if (allOrderItems.length > 0 && data) {
    // Look up order_code for items that have an item_id
    const idsToLookup = allOrderItems.filter(i => i.id).map(i => i.id as number)
    const orderCodeMap: Record<number, string> = {}
    if (idsToLookup.length > 0) {
      const { data: itemRows } = await db.from('items').select('id, order_code').in('id', idsToLookup)
      if (itemRows) {
        for (const row of itemRows as { id: number; order_code: string }[]) {
          orderCodeMap[row.id] = row.order_code
        }
      }
    }
    await db.from('order_items').insert(
      allOrderItems.map(ci => ({
        order_id: (data as { id: number }).id,
        item_id: ci.id ?? null,
        item_title: ci.title,
        item_price: ci.price ?? null,
        quantity: 1,
        order_code: ci.id ? (orderCodeMap[ci.id] ?? null) : null,
      }))
    )
    // Reserve all linked inventory items so they disappear from public listing
    if (idsToLookup.length > 0) {
      await db.from('items').update({ status: 'reserved' }).in('id', idsToLookup)
    }
  }

  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id, ...fields } = await req.json()
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })
  const db = adminClient()
  let { data, error } = await db.from('orders').update(fields).eq('id', id).select(SELECT_BASE).single()
  // Retry without unknown columns if schema cache is stale
  if (error?.message?.includes('schema cache')) {
    const { fb_url: _fb, ...safeFields } = fields
    ;({ data, error } = await db.from('orders').update(safeFields).eq('id', id).select(SELECT_BASE).single())
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Sync inventory item status when order status changes
  const newOrderStatus = fields.order_status as string | undefined
  if (newOrderStatus === 'cancelled' || newOrderStatus === 'delivered') {
    const { data: orderItems } = await db.from('order_items').select('item_id').eq('order_id', id)
    const linkedItemIds = (orderItems ?? [])
      .map((i: { item_id: number | null }) => i.item_id)
      .filter(Boolean) as number[]
    if (linkedItemIds.length > 0) {
      const newItemStatus = newOrderStatus === 'cancelled' ? 'available' : 'sold'
      await db.from('items').update({ status: newItemStatus }).in('id', linkedItemIds)
    }
  }

  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await req.json()
  const db = adminClient()
  const { error } = await db.from('orders').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

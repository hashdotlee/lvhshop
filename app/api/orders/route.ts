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
  const { item_id, item_title, item_price, customer_name, customer_phone, customer_address, customer_note, shipping_carrier, payment_method, total_amount, fb_psid, fb_url, created_by, address_id } = body
  if (!customer_name || !customer_phone || !customer_address || !payment_method) {
    return NextResponse.json({ error: 'missing required fields' }, { status: 400 })
  }
  const isAdmin = checkAdmin(req)
  const db = adminClient()
  const baseRow = { item_id: item_id || null, item_title, item_price, customer_name, customer_phone, customer_address, customer_note, shipping_carrier: shipping_carrier || 'spx', payment_method, total_amount, fb_psid, created_by: created_by || (isAdmin ? 'admin' : 'customer'), address_id: address_id || null }
  // New orders have no order_items yet — use base select to avoid schema cache issues
  let { data, error } = await db.from('orders').insert({ ...baseRow, fb_url: fb_url || null }).select(SELECT_BASE).single()
  // Retry without fb_url if the column isn't in the schema cache yet
  if (error?.message?.includes('fb_url')) {
    ;({ data, error } = await db.from('orders').insert(baseRow).select(SELECT_BASE).single())
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
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

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

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const db = adminClient()
  const { data, error } = await db
    .from('customers')
    .select('*, items(title, price, order_code)')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const body = await req.json()
  const { item_id, order_code, name, phone, address, note } = body
  const db = adminClient()
  const normalizedPhone = phone?.trim() || null

  if (normalizedPhone) {
    // Check if a customer with this phone already exists → update instead of insert
    const { data: existing } = await db
      .from('customers')
      .select('id')
      .eq('phone', normalizedPhone)
      .maybeSingle()

    if (existing) {
      const { data, error } = await db
        .from('customers')
        .update({
          name: name || undefined,
          address: address ?? undefined,
          note: note ?? undefined,
          item_id: item_id || null,
          order_code: order_code || undefined,
        })
        .eq('id', existing.id)
        .select('*, items(title, price, order_code)')
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json(data)
    }
  }

  // No phone or phone not found → insert new customer
  const { data, error } = await db
    .from('customers')
    .insert({
      item_id: item_id || null,
      order_code: order_code || null,
      name,
      phone: normalizedPhone,
      address: address || null,
      note: note || null,
    })
    .select('*, items(title, price, order_code)')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id, ...fields } = await req.json()
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })
  const db = adminClient()
  const { data, error } = await db
    .from('customers')
    .update(fields)
    .eq('id', id)
    .select('*, items(title, price, order_code)')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await req.json()
  const db = adminClient()
  const { error } = await db.from('customers').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

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
    .select('*, items(title, price, order_code), crm_customer_addresses(*)')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const customers = (data ?? []) as Record<string, unknown>[]
  const phones = customers.map(c => c.phone as string).filter(Boolean)

  let aggs: Record<string, { count: number; spend: number; lastAt: string | null }> = {}
  if (phones.length > 0) {
    const { data: orders } = await db
      .from('orders')
      .select('customer_phone, total_amount, order_status, created_at')
      .in('customer_phone', phones)
    for (const o of (orders ?? []) as { customer_phone: string; total_amount: number | null; order_status: string; created_at: string }[]) {
      if (o.order_status === 'cancelled') continue
      if (!aggs[o.customer_phone]) aggs[o.customer_phone] = { count: 0, spend: 0, lastAt: null }
      aggs[o.customer_phone].count++
      aggs[o.customer_phone].spend += o.total_amount ?? 0
      if (!aggs[o.customer_phone].lastAt || o.created_at > (aggs[o.customer_phone].lastAt as string)) {
        aggs[o.customer_phone].lastAt = o.created_at
      }
    }
  }

  return NextResponse.json(customers.map(c => ({
    ...c,
    order_count: aggs[c.phone as string]?.count ?? 0,
    total_spend: aggs[c.phone as string]?.spend ?? 0,
    last_order_at: aggs[c.phone as string]?.lastAt ?? null,
  })))
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

  const { crm_customer_addresses, ...safeFields } = fields

  const { data, error } = await db
    .from('customers')
    .update(safeFields)
    .eq('id', id)
    .select('*, items(title, price, order_code), crm_customer_addresses(*)')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (crm_customer_addresses !== undefined) {
    await db.from('crm_customer_addresses').delete().eq('customer_id', id)
    if (Array.isArray(crm_customer_addresses) && crm_customer_addresses.length > 0) {
      await db.from('crm_customer_addresses').insert(
        crm_customer_addresses.map(a => ({
          customer_id: id,
          address_type: a.address_type || 'new',
          province: a.province || '',
          district: a.district || '',
          ward: a.ward || '',
          detail: a.detail || '',
          is_default: a.is_default || false
        }))
      )
    }
  }

  // Fetch updated data with addresses
  const { data: updatedData } = await db
    .from('customers')
    .select('*, items(title, price, order_code), crm_customer_addresses(*)')
    .eq('id', id)
    .single()

  return NextResponse.json(updatedData || data)
}

export async function DELETE(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await req.json()
  const db = adminClient()
  const { error } = await db.from('customers').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

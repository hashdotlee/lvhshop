import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function userDb(jwt: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    { global: { headers: { Authorization: `Bearer ${jwt}` } } }
  )
}

function getJwt(req: NextRequest) {
  return req.headers.get('Authorization')?.replace('Bearer ', '') ?? null
}

export async function GET(req: NextRequest) {
  const jwt = getJwt(req)
  if (!jwt) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = userDb(jwt)
  const { data, error } = await db
    .from('customer_addresses')
    .select('*')
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const jwt = getJwt(req)
  if (!jwt) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const db = userDb(jwt)
  const { data: { user }, error: userError } = await db.auth.getUser()
  if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (body.is_default) {
    await db.from('customer_addresses').update({ is_default: false }).eq('is_default', true)
  }
  const { data, error } = await db
    .from('customer_addresses')
    .insert({ user_id: user.id, full_name: body.full_name, phone: body.phone, address: body.address, is_default: body.is_default ?? false })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const jwt = getJwt(req)
  if (!jwt) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, ...updates } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const db = userDb(jwt)
  if (updates.is_default) {
    await db.from('customer_addresses').update({ is_default: false }).eq('is_default', true)
  }
  const { data, error } = await db
    .from('customer_addresses')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const jwt = getJwt(req)
  if (!jwt) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const db = userDb(jwt)
  const { error } = await db.from('customer_addresses').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

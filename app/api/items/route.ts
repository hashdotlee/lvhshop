import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service-role client for writes (never exposed to browser)
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
  )
}

export async function GET() {
  const db = adminClient()
  const { data, error } = await db
    .from('items')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  // Verify admin password sent in header
  const adminPwd = req.headers.get('x-admin-key')
  if (adminPwd !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { title, description, price, condition, category, type, phone, location, image_url } = body

  if (!title || !type) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 })
  }

  const db = adminClient()
  const { data, error } = await db
    .from('items')
    .insert({ title, description, price: price ? Number(price) : null, condition, category, type, phone, location, image_url: image_url || null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const adminPwd = req.headers.get('x-admin-key')
  if (adminPwd !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { id } = await req.json()
  const db = adminClient()
  const { error } = await db.from('items').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

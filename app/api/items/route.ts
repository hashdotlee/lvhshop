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

export async function GET() {
  const db = adminClient()
  const { data, error } = await db.from('items').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { title, description, price, condition, category, type, phone, location, images, image_url, expected_date } = body
  const isAdmin = checkAdmin(req)
  // Public users can only create buy requests; sell listings require admin
  if (type !== 'mua' && !isAdmin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!title || !type) return NextResponse.json({ error: 'missing fields' }, { status: 400 })
  // Public buy requests cannot have images or expected_date
  const imgs: string[] = isAdmin && images && images.length > 0 ? images : isAdmin && image_url ? [image_url] : []
  const db = adminClient()
  const { data, error } = await db
    .from('items')
    .insert({
      title, description,
      price: price ? Number(price) : null,
      condition: condition || 'Mới',
      category, type, phone, location,
      images: imgs,
      image_url: imgs[0] ?? null,
      status: (isAdmin && expected_date) ? 'incoming' : 'available',
      expected_date: (isAdmin && expected_date) || null,
    })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id, status } = await req.json()
  if (!id || !['available','sold','incoming'].includes(status))
    return NextResponse.json({ error: 'invalid' }, { status: 400 })
  const db = adminClient()
  const { data, error } = await db.from('items').update({ status }).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await req.json()
  const db = adminClient()
  const { error } = await db.from('items').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

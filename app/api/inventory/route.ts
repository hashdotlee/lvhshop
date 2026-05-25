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

// GET /api/inventory             → danh sách lô hàng + số lượng sản phẩm
// GET /api/inventory?batch_id=N  → items của lô N
export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const db = adminClient()
  const batchId = req.nextUrl.searchParams.get('batch_id')

  if (batchId) {
    const { data, error } = await db
      .from('items')
      .select('*')
      .eq('batch_id', Number(batchId))
      .order('created_at', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ items: data })
  }

  const { data, error } = await db
    .from('inventory_batches')
    .select('*, items(count)')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const batches = (data ?? []).map((b: Record<string, unknown>) => ({
    ...b,
    item_count: Array.isArray(b.items) && b.items[0] ? (b.items[0] as { count: number }).count : 0,
    items: undefined,
  }))
  return NextResponse.json(batches)
}

// POST /api/inventory → tạo lô + bulk items
export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const body = await req.json()
  const { notes, supplier, created_by, staff_id, items: itemsPayload } = body

  const db = adminClient()

  const { data: batch, error: batchErr } = await db
    .from('inventory_batches')
    .insert({
      notes: notes || null,
      supplier: supplier || null,
      created_by: created_by || null,
      staff_id: staff_id ? Number(staff_id) : null,
    })
    .select()
    .single()
  if (batchErr) return NextResponse.json({ error: batchErr.message }, { status: 500 })

  if (!Array.isArray(itemsPayload) || !itemsPayload.length) {
    return NextResponse.json({ batch, items: [] }, { status: 201 })
  }

  type ItemPayload = {
    title: string
    description?: string
    price?: number | string | null
    cost_price?: number | string | null
    condition?: string
    category?: string
    images?: string[]
    sku?: string | null
    bin_location?: string | null
  }

  const rows = (itemsPayload as ItemPayload[]).map(item => ({
    title: item.title,
    description: item.description || null,
    price: item.price != null && item.price !== '' ? Number(item.price) || null : null,
    cost_price: item.cost_price != null && item.cost_price !== '' ? Number(item.cost_price) || null : null,
    condition: item.condition || 'Mới',
    category: item.category || null,
    type: 'ban' as const,
    images: Array.isArray(item.images) ? item.images : [],
    image_url: Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : null,
    status: 'available' as const,
    sku: item.sku || null,
    bin_location: item.bin_location || null,
    batch_id: batch.id,
    staff_id: staff_id ? Number(staff_id) : null,
    posted_by: created_by || null,
  }))

  const { data: createdItems, error: itemsErr } = await db
    .from('items')
    .insert(rows)
    .select()
  if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 })

  return NextResponse.json({ batch, items: createdItems }, { status: 201 })
}

// PATCH /api/inventory → bổ sung items vào lô đã tồn tại
export async function PATCH(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const body = await req.json()
  const { batch_id, items: itemsPayload } = body

  if (!batch_id) return NextResponse.json({ error: 'batch_id required' }, { status: 400 })

  const db = adminClient()

  const { data: batch, error: batchErr } = await db
    .from('inventory_batches')
    .select('*')
    .eq('id', Number(batch_id))
    .single()
  if (batchErr || !batch) return NextResponse.json({ error: 'Lô hàng không tồn tại' }, { status: 404 })

  if (!Array.isArray(itemsPayload) || !itemsPayload.length) {
    return NextResponse.json({ batch, items: [] }, { status: 200 })
  }

  type ItemPayload = {
    title: string
    description?: string
    price?: number | string | null
    cost_price?: number | string | null
    condition?: string
    category?: string
    images?: string[]
    sku?: string | null
    bin_location?: string | null
  }

  const rows = (itemsPayload as ItemPayload[]).map(item => ({
    title: item.title,
    description: item.description || null,
    price: item.price != null && item.price !== '' ? Number(item.price) || null : null,
    cost_price: item.cost_price != null && item.cost_price !== '' ? Number(item.cost_price) || null : null,
    condition: item.condition || 'Mới',
    category: item.category || null,
    type: 'ban' as const,
    images: Array.isArray(item.images) ? item.images : [],
    image_url: Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : null,
    status: 'available' as const,
    sku: item.sku || null,
    bin_location: item.bin_location || null,
    batch_id: Number(batch_id),
    staff_id: (batch as Record<string, unknown>).staff_id ?? null,
    posted_by: (batch as Record<string, unknown>).created_by ?? null,
  }))

  const { data: createdItems, error: itemsErr } = await db
    .from('items')
    .insert(rows)
    .select()
  if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 })

  return NextResponse.json({ batch, items: createdItems }, { status: 200 })
}

// PUT /api/inventory → cập nhật thông tin lô hàng
export async function PUT(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const body = await req.json()
  const { id, notes, supplier, staff_id, created_by } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const db = adminClient()
  const { data, error } = await db
    .from('inventory_batches')
    .update({
      notes: notes || null,
      supplier: supplier || null,
      staff_id: staff_id ? Number(staff_id) : null,
      created_by: created_by || null,
    })
    .eq('id', Number(id))
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/inventory?batch_id=N → xóa lô hàng
export async function DELETE(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await req.json()
  const db = adminClient()
  const { error } = await db.from('inventory_batches').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

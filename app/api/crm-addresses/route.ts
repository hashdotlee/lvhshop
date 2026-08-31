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
  if (!checkAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const body = await req.json()
  const db = adminClient()

  // If is_default is true, unset other defaults for this customer
  if (body.is_default && body.customer_id) {
    await db.from('crm_customer_addresses')
      .update({ is_default: false })
      .eq('customer_id', body.customer_id)
      .eq('is_default', true)
  }

  const { data, error } = await db
    .from('crm_customer_addresses')
    .insert({
      customer_id: body.customer_id,
      address_type: body.address_type ?? 'new',
      province: body.province ?? '',
      district: body.district ?? '',
      ward: body.ward ?? '',
      detail: body.detail ?? '',
      is_default: body.is_default ?? false,
    })
    .select()
    .single()
    
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id, ...fields } = await req.json()
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })
  
  const db = adminClient()

  if (fields.is_default && fields.customer_id) {
    await db.from('crm_customer_addresses')
      .update({ is_default: false })
      .eq('customer_id', fields.customer_id)
      .eq('is_default', true)
  }

  const { data, error } = await db
    .from('crm_customer_addresses')
    .update(fields)
    .eq('id', id)
    .select()
    .single()
    
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })
  
  const db = adminClient()
  const { error } = await db.from('crm_customer_addresses').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

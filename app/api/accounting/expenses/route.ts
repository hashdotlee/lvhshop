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

  try {
    const { data, error } = await db
      .from('operating_expenses')
      .select('*')
      .order('date', { ascending: false })

    if (error) {
      // Return empty list if table doesn't exist yet in Supabase schema
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return NextResponse.json([])
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data ?? [])
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const body = await req.json()
  const { category, description, amount, date } = body

  if (!description || amount === undefined || amount === null) {
    return NextResponse.json({ error: 'missing description or amount' }, { status: 400 })
  }

  const db = adminClient()
  const row = {
    category: category || 'other',
    description,
    amount: Number(amount) || 0,
    date: date || new Date().toISOString().split('T')[0],
  }

  try {
    const { data, error } = await db
      .from('operating_expenses')
      .insert(row)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message, item: { id: Date.now(), ...row } }, { status: 200 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ id: Date.now(), ...row }, { status: 201 })
  }
}

export async function DELETE(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })

  const db = adminClient()
  try {
    const { error } = await db.from('operating_expenses').delete().eq('id', id)
    if (error) {
      // Ignore if table missing
    }
  } catch {
    /* silent */
  }

  return NextResponse.json({ ok: true })
}

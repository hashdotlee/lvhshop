import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
  )
}

function isAdmin(req: NextRequest) {
  const key = req.headers.get('x-admin-key')
  return key === process.env.ADMIN_PASSWORD || key === process.env.NEXT_PUBLIC_ADMIN_HASH
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await db()
    .from('quiz_questions')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { brand, model_name, description, year, image_url, difficulty, options } = body

  if (!brand || !model_name || !description || !Array.isArray(options) || options.length !== 4) {
    return NextResponse.json({ error: 'Thiếu thông tin bắt buộc (brand, model_name, description, 4 options)' }, { status: 400 })
  }
  if (!options.includes(model_name)) {
    return NextResponse.json({ error: 'options phải chứa model_name (đáp án đúng)' }, { status: 400 })
  }

  const { data, error } = await db()
    .from('quiz_questions')
    .insert({ brand, model_name, description, year: year || null, image_url: image_url || null, difficulty: difficulty || 'medium', options })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

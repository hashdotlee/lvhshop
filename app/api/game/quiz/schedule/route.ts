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
    .from('daily_quiz')
    .select(`
      id,
      quiz_date,
      quiz_questions ( id, brand, model_name, difficulty )
    `)
    .order('quiz_date', { ascending: false })
    .limit(60)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { question_id, quiz_date } = await req.json()
  if (!question_id || !quiz_date) {
    return NextResponse.json({ error: 'Cần question_id và quiz_date' }, { status: 400 })
  }

  const { data, error } = await db()
    .from('daily_quiz')
    .upsert({ question_id, quiz_date }, { onConflict: 'quiz_date' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

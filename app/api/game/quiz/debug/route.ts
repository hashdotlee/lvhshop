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

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())

  const [{ data: questions, error: qErr }, { data: schedule, error: sErr }] = await Promise.all([
    db().from('quiz_questions').select('id, brand, model_name, difficulty').order('id'),
    db().from('daily_quiz').select('id, quiz_date, question_id').order('quiz_date', { ascending: false }).limit(10),
  ])

  return NextResponse.json({
    server_utc: new Date().toISOString(),
    today_vn: today,
    questions_count: questions?.length ?? 0,
    questions_error: qErr?.message ?? null,
    schedule_count: schedule?.length ?? 0,
    schedule_error: sErr?.message ?? null,
    questions: questions ?? [],
    schedule: schedule ?? [],
  })
}

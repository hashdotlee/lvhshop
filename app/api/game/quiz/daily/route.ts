import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
  )
}

export async function GET() {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())

  // Step 1: find today's schedule entry
  const { data: schedule, error: schedErr } = await db()
    .from('daily_quiz')
    .select('id, quiz_date, question_id')
    .eq('quiz_date', today)
    .single()

  if (schedErr || !schedule) {
    return NextResponse.json({ error: 'Hôm nay chưa có câu hỏi', today, detail: schedErr?.message ?? 'no row' }, { status: 404 })
  }

  // Step 2: fetch the question
  const { data: question, error: qErr } = await db()
    .from('quiz_questions')
    .select('id, brand, model_name, description, year, image_url, difficulty, options')
    .eq('id', schedule.question_id)
    .single()

  if (qErr || !question) {
    return NextResponse.json({ error: 'Không tìm thấy câu hỏi', today }, { status: 404 })
  }

  return NextResponse.json(
    { id: schedule.id, quiz_date: schedule.quiz_date, quiz_questions: question },
    { headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' } }
  )
}

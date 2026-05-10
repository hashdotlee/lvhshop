import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
  )
}

export async function GET() {
  // Use Vietnam timezone (UTC+7) for "today"
  const now = new Date()
  const vnOffset = 7 * 60
  const vnNow = new Date(now.getTime() + (vnOffset - now.getTimezoneOffset()) * 60000)
  const today = vnNow.toISOString().split('T')[0]

  const { data, error } = await db()
    .from('daily_quiz')
    .select(`
      id,
      quiz_date,
      quiz_questions (
        id, brand, model_name, description, year, image_url, difficulty, options
      )
    `)
    .eq('quiz_date', today)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Hôm nay chưa có câu hỏi' }, { status: 404 })
  }

  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' },
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BUCKET = 'item-images'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
  )
}

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const adminKey = form.get('adminKey') as string

  if (adminKey !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Support multiple files: files[] or single file
  const files = form.getAll('files') as File[]
  const single = form.get('file') as File | null
  const allFiles = files.length > 0 ? files : single ? [single] : []

  if (allFiles.length === 0) {
    return NextResponse.json({ error: 'no files' }, { status: 400 })
  }

  const db = adminClient()
  const urls: string[] = []

  for (const file of allFiles) {
    if (file.size > 8 * 1024 * 1024) continue // skip >8MB
    const ext = file.name.split('.').pop() ?? 'jpg'
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())
    const { error } = await db.storage.from(BUCKET).upload(filename, buffer, {
      contentType: file.type, upsert: false,
    })
    if (!error) {
      const { data } = db.storage.from(BUCKET).getPublicUrl(filename)
      urls.push(data.publicUrl)
    }
  }

  if (urls.length === 0) return NextResponse.json({ error: 'all uploads failed' }, { status: 500 })
  return NextResponse.json({ urls, url: urls[0] })
}

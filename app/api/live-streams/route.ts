import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
  )
}

const ADMIN_HASH = process.env.ADMIN_PASSWORD ?? process.env.NEXT_PUBLIC_ADMIN_HASH ?? 'admin-lvh2025'

const FALLBACK_FILE = path.join(process.cwd(), 'lib', 'live-streams-store.json')

const INITIAL_STREAMS = [
  {
    id: 'preset-1',
    title: 'Fanpage nhankieu24 (Tự động cập nhật phiên Live)',
    shop_name: 'nhankieu24',
    url: 'https://www.facebook.com/nhankieu24',
    note: 'Đang theo dõi phiên Live',
  },
  {
    id: 'preset-2',
    title: 'Hàng Nhật Bãi - Lê Viết Hoàng Shop',
    shop_name: 'leviethoang.shop',
    url: 'https://www.facebook.com/leviethoang.shop',
    note: 'Fanpage chính chủ - Chuyên hàng Nhật chọn lọc',
  },
]

function readFallback() {
  try {
    if (fs.existsSync(FALLBACK_FILE)) {
      const raw = fs.readFileSync(FALLBACK_FILE, 'utf-8')
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {
    /* fallback to memory */
  }
  return INITIAL_STREAMS
}

function writeFallback(data: any[]) {
  try {
    const dir = path.dirname(FALLBACK_FILE)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(FALLBACK_FILE, JSON.stringify(data, null, 2), 'utf-8')
  } catch {
    /* ignore write errors */
  }
}

// GET: Fetch Admin Fanpage list
export async function GET() {
  try {
    const db = adminDb()
    const { data, error } = await db.from('live_streams').select('*').order('sort_order', { ascending: true })
    
    if (!error && Array.isArray(data) && data.length > 0) {
      const formatted = data.map(d => ({
        id: d.id,
        title: d.title,
        shopName: d.shop_name,
        url: d.url,
        note: d.note,
      }))
      return NextResponse.json(formatted)
    }
  } catch {
    /* ignore DB errors */
  }

  // Fallback to local store
  const localData = readFallback().map((d: any) => ({
    id: d.id,
    title: d.title,
    shopName: d.shop_name || d.shopName,
    url: d.url,
    note: d.note,
  }))
  return NextResponse.json(localData)
}

// POST: Admin update Fanpage list
export async function POST(req: NextRequest) {
  const adminKey = req.headers.get('x-admin-key')
  if (adminKey !== ADMIN_HASH) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const streams = body.streams
    if (!Array.isArray(streams)) {
      return NextResponse.json({ error: 'Invalid streams payload' }, { status: 400 })
    }

    const payload = streams.map((s: any, idx: number) => ({
      id: String(s.id || 'stream-' + Date.now() + '-' + idx),
      title: s.title || s.shopName || 'Live Shop',
      shop_name: s.shopName || s.title || 'Live Shop',
      url: s.url || '',
      note: s.note || '',
      sort_order: idx,
    }))

    // Save fallback file
    writeFallback(payload)

    // Sync to Supabase table if available
    try {
      const db = adminDb()
      await db.from('live_streams').delete().neq('id', 'keep_all')
      await db.from('live_streams').insert(payload)
    } catch {
      /* ignore Supabase sync error */
    }

    return NextResponse.json({ ok: true, count: payload.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

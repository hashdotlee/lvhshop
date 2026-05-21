import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  if (req.headers.get('x-admin-key') !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const { psid, message } = await req.json()
  if (!psid || !message) return NextResponse.json({ error: 'missing psid or message' }, { status: 400 })
  const token = process.env.FB_PAGE_ACCESS_TOKEN
  if (!token) return NextResponse.json({ error: 'FB_PAGE_ACCESS_TOKEN not configured' }, { status: 500 })
  const res = await fetch(`https://graph.facebook.com/v21.0/me/messages?access_token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient: { id: psid }, message: { text: message } }),
  })
  const data = await res.json()
  if (!res.ok) return NextResponse.json({ error: data }, { status: 500 })
  return NextResponse.json({ ok: true, data })
}

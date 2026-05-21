import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const appId = process.env.NEXT_PUBLIC_FB_APP_ID
  if (!appId) return NextResponse.json({ error: 'FB_APP_ID not configured' }, { status: 500 })

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://leviethoang.shop'
  const redirectUri = `${siteUrl}/api/auth/facebook/callback`

  const url = new URL('https://www.facebook.com/v21.0/dialog/oauth')
  url.searchParams.set('client_id', appId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('scope', 'public_profile,email')
  url.searchParams.set('response_type', 'code')

  return NextResponse.redirect(url.toString())
}

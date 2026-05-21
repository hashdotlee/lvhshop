import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://leviethoang.shop'
  const code = req.nextUrl.searchParams.get('code')
  const error = req.nextUrl.searchParams.get('error')

  const closeHtml = (data: object) => `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Đang xử lý...</title></head>
<body><script>
try {
  window.opener && window.opener.postMessage(${JSON.stringify(data)}, '${siteUrl}');
} catch(e) {}
window.close();
</script></body></html>`

  if (error || !code) {
    return new NextResponse(closeHtml({ type: 'fb_login_error', error: error ?? 'cancelled' }), {
      headers: { 'Content-Type': 'text/html' },
    })
  }

  const appId = process.env.NEXT_PUBLIC_FB_APP_ID
  const appSecret = process.env.FB_APP_SECRET
  const redirectUri = `${siteUrl}/api/auth/facebook/callback`

  if (!appId || !appSecret) {
    return new NextResponse(closeHtml({ type: 'fb_login_error', error: 'not_configured' }), {
      headers: { 'Content-Type': 'text/html' },
    })
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`
    )
    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) throw new Error('no_token')

    // Get user profile
    const profileRes = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email&access_token=${tokenData.access_token}`
    )
    const profile = await profileRes.json()
    if (!profile.id) throw new Error('no_profile')

    const user = { id: profile.id, name: profile.name, email: profile.email ?? '' }

    const res = new NextResponse(closeHtml({ type: 'fb_login', user }), {
      headers: { 'Content-Type': 'text/html' },
    })
    res.cookies.set('fb_user', JSON.stringify(user), {
      httpOnly: false,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    return res
  } catch {
    return new NextResponse(closeHtml({ type: 'fb_login_error', error: 'exchange_failed' }), {
      headers: { 'Content-Type': 'text/html' },
    })
  }
}

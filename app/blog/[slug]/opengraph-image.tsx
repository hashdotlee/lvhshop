import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

async function fetchPost(slug: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
  if (!base || !key) return null
  try {
    const res = await fetch(
      `${base}/rest/v1/blog_posts?slug=eq.${encodeURIComponent(slug)}&published=eq.true&select=title,excerpt,cover_image&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    )
    const rows = await res.json()
    return rows?.[0] ?? null
  } catch {
    return null
  }
}

async function toDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    const bytes = new Uint8Array(buf)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    const b64 = btoa(binary)
    const mime = res.headers.get('content-type') ?? 'image/jpeg'
    return `data:${mime};base64,${b64}`
  } catch {
    return null
  }
}

export default async function Image({ params }: { params: { slug: string } }) {
  const post = await fetchPost(params.slug)

  const title: string = post?.title ?? 'Blog'
  const excerpt: string = post?.excerpt ?? 'Kinh nghiệm mua bán, thủ thuật và cập nhật mới nhất'
  const coverData = post?.cover_image ? await toDataUrl(post.cover_image) : null

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: '#1a1916',
          display: 'flex',
          flexDirection: 'row',
          overflow: 'hidden',
        }}
      >
        {coverData ? (
          <div style={{ width: 630, height: 630, flexShrink: 0, display: 'flex', overflow: 'hidden' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverData} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ) : null}

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: coverData ? '48px 52px' : '60px 80px',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', fontSize: 18, color: '#8c8982', fontFamily: 'sans-serif' }}>
            leviethoang.shop · Blog
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: coverData ? 36 : 48,
              fontWeight: 700,
              color: '#f0efe9',
              fontFamily: 'sans-serif',
              letterSpacing: -1,
              lineHeight: 1.3,
            }}
          >
            {title}
          </div>
          {excerpt ? (
            <div style={{ display: 'flex', fontSize: 20, color: '#8c8982', fontFamily: 'sans-serif', lineHeight: 1.5 }}>
              {excerpt.length > 100 ? excerpt.slice(0, 100) + '…' : excerpt}
            </div>
          ) : null}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}

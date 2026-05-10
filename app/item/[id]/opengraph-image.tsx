import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

async function fetchItem(id: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
  if (!base || !key) return null
  try {
    const res = await fetch(
      `${base}/rest/v1/items?id=eq.${encodeURIComponent(id)}&select=title,price,condition,images,image_url,status&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    )
    const rows = await res.json()
    return rows?.[0] ?? null
  } catch {
    return null
  }
}

function fmtVND(v: number | null | undefined) {
  if (!v) return 'Thương lượng'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v)
}

export default async function Image({ params }: { params: { id: string } }) {
  const item = await fetchItem(params.id)

  const rawImgs: string[] = item?.images?.length ? item.images : item?.image_url ? [item.image_url] : []
  const photo: string | null = rawImgs.find((u: unknown) => typeof u === 'string' && /^https?:\/\//i.test(u as string)) ?? null

  const title: string = item?.title ?? 'leviethoang.shop'
  const price: string = fmtVND(item?.price)
  const condition: string = item?.condition ?? ''

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
        {photo ? (
          <div style={{ width: 630, height: 630, flexShrink: 0, display: 'flex', overflow: 'hidden' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ) : null}

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: photo ? '48px 52px' : '60px 80px',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', fontSize: 18, color: '#8c8982', fontFamily: 'sans-serif' }}>
            leviethoang.shop
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: photo ? 36 : 48,
              fontWeight: 700,
              color: '#f0efe9',
              fontFamily: 'sans-serif',
              letterSpacing: -1,
              lineHeight: 1.25,
            }}
          >
            {title}
          </div>
          {condition ? (
            <div style={{ display: 'flex', fontSize: 20, color: '#8c8982', fontFamily: 'sans-serif' }}>
              {condition}
            </div>
          ) : null}
          <div style={{ display: 'flex', fontSize: 28, fontWeight: 600, color: '#f0efe9', fontFamily: 'sans-serif', marginTop: 8 }}>
            {price}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}

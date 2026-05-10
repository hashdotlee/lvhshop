import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'leviethoang.shop · Blog'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: { slug: string } }) {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: '#1a1916',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 28,
            color: '#8c8982',
            fontFamily: 'sans-serif',
          }}
        >
          leviethoang.shop
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 60,
            fontWeight: 700,
            color: '#f0efe9',
            letterSpacing: -2,
            fontFamily: 'sans-serif',
          }}
        >
          Blog
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 24,
            color: '#8c8982',
            fontFamily: 'sans-serif',
          }}
        >
          Kinh nghiệm mua bán, thủ thuật và cập nhật mới nhất
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}

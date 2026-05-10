import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'leviethoang.shop — Săn hàng Nhật độc lạ'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
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
            fontSize: 72,
            fontWeight: 700,
            color: '#f0efe9',
            letterSpacing: -3,
            fontFamily: 'sans-serif',
          }}
        >
          leviethoang
          <span style={{ color: '#8c8982', fontWeight: 300 }}>.shop</span>
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 26,
            color: '#8c8982',
            fontFamily: 'sans-serif',
            letterSpacing: 0.5,
          }}
        >
          Săn hàng Nhật độc lạ — Hàng chọn lọc · Giá chuẩn
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}

import type { Metadata } from 'next'
import LiveTrackerClient from './live-tracker-client'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://leviethoang.shop'

export const metadata: Metadata = {
  title: 'Theo dõi Live Stream (Multi-Live Tracker) · Facebook Shops',
  description: 'Theo dõi nhiều livestream Facebook của nhiều shop cùng lúc trên 1 màn hình. Tự động điều chỉnh số lượng khung hình, tùy chỉnh kích thước, xem chế độ tiêu điểm.',
  openGraph: {
    title: 'Theo dõi Live Stream (Multi-Live Tracker) · leviethoang.shop',
    description: 'Xem nhiều livestream Facebook cùng lúc. Điều chỉnh số lượng live, chia lưới tùy chọn, xem tiêu điểm shop livestream.',
    url: `${siteUrl}/live`,
    siteName: 'leviethoang.shop',
    type: 'website',
    locale: 'vi_VN',
  },
  alternates: { canonical: `${siteUrl}/live` },
}

export default function LivePage() {
  return <LiveTrackerClient />
}

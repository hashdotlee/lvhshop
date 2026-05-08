import type { Metadata } from 'next'
import GoogleAnalytics from './components/GoogleAnalytics'
import FacebookPixel from './components/FacebookPixel'
import CatChaser from './components/CatChaser'
import ConstructionBanner from './components/ConstructionBanner'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://leviethoang.shop'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'leviethoang.shop — Săn hàng Nhật độc lạ — Hàng chọn lọc · Giá chuẩn',
    template: '%s · leviethoang.shop',
  },
  description: 'Chuyên săn hàng Nhật độc lạ — đồ cũ Nhật Bản chất lượng cao, hàng nội địa Nhật hiếm có. Đồng thời có đa dạng hàng hoá đại trà phục vụ nhu cầu mua bán hàng ngày tại Việt Nam.',
  keywords: ['hàng Nhật', 'đồ Nhật', 'hàng nội địa Nhật', 'đồ cũ Nhật', 'săn hàng Nhật', 'hàng độc lạ Nhật Bản', 'mua bán hàng cũ', 'hàng thanh lý', 'chợ online Việt Nam'],
  authors: [{ name: 'leviethoang.shop' }],
  creator: 'leviethoang.shop',
  publisher: 'leviethoang.shop',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    url: siteUrl,
    siteName: 'leviethoang.shop',
    title: 'leviethoang.shop — Săn hàng Nhật độc lạ — Hàng chọn lọc · Giá chuẩn',
    description: 'Chuyên săn hàng Nhật độc lạ — đồ cũ Nhật Bản chất lượng cao, hàng nội địa Nhật hiếm có. Đồng thời có đa dạng hàng hoá đại trà phục vụ nhu cầu mua bán hàng ngày tại Việt Nam.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'leviethoang.shop' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'leviethoang.shop — Săn hàng Nhật độc lạ — Hàng chọn lọc · Giá chuẩn',
    description: 'Chuyên săn hàng Nhật độc lạ — hàng chọn lọc, giá chuẩn tại Việt Nam.',
    images: ['/og-default.png'],
  },
  alternates: { canonical: siteUrl },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ConstructionBanner />
        <GoogleAnalytics />
        <FacebookPixel />
        <CatChaser />
        {children}
      </body>
    </html>
  )
}

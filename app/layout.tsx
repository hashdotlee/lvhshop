import type { Metadata } from 'next'
import GoogleAnalytics from './components/GoogleAnalytics'
import FacebookPixel from './components/FacebookPixel'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://leviethoang.shop'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'leviethoang.shop — Mua bán nhanh bằng AI',
    template: '%s · leviethoang.shop',
  },
  description: 'Mua bán hàng cũ, hàng mới nhanh chóng với sự hỗ trợ của AI. Tìm kiếm, đăng tin và kết nối người mua bán tại Việt Nam.',
  keywords: ['mua bán', 'hàng cũ', 'hàng thanh lý', 'chợ online', 'Việt Nam', 'mua bán nhanh'],
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
    title: 'leviethoang.shop — Mua bán nhanh bằng AI',
    description: 'Mua bán hàng cũ, hàng mới nhanh chóng với sự hỗ trợ của AI. Tìm kiếm, đăng tin và kết nối người mua bán tại Việt Nam.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'leviethoang.shop' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'leviethoang.shop — Mua bán nhanh bằng AI',
    description: 'Mua bán hàng cũ, hàng mới nhanh chóng với sự hỗ trợ của AI.',
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
        <GoogleAnalytics />
        <FacebookPixel />
        {children}
      </body>
    </html>
  )
}

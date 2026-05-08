'use client'
import Script from 'next/script'

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

export default function GoogleAnalytics() {
  if (!GA_ID) return null
  return (
    <>
      {/* Consent Mode v2: phải chạy TRƯỚC gtag.js load */}
      <Script id="ga-consent" strategy="beforeInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('consent','default',{
  analytics_storage:'granted',
  ad_storage:'granted',
  ad_user_data:'granted',
  ad_personalization:'granted',
  wait_for_update:500
});`}
      </Script>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`gtag('js',new Date());gtag('config','${GA_ID}',{page_path:window.location.pathname});`}
      </Script>
    </>
  )
}

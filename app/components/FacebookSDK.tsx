'use client'
import Script from 'next/script'

const FB_APP_ID = process.env.NEXT_PUBLIC_FB_APP_ID ?? ''

export default function FacebookSDK() {
  return (
    <Script
      src="https://connect.facebook.net/vi_VN/sdk.js"
      strategy="lazyOnload"
      onLoad={() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const FB = (window as any).FB
        if (FB) {
          FB.init({
            appId: FB_APP_ID || undefined,
            version: 'v21.0',
            xfbml: true,
            cookie: true,
          })
        }
      }}
    />
  )
}

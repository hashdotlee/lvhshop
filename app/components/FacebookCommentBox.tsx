'use client'
import { useEffect, useRef } from 'react'

interface FacebookCommentBoxProps {
  url: string
}

export default function FacebookCommentBox({ url }: FacebookCommentBoxProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  let cleanUrl = url.trim()
  if (!cleanUrl.startsWith('http')) {
    cleanUrl = `https://www.facebook.com/${cleanUrl.replace(/^@/, '')}`
  }

  useEffect(() => {
    // Trigger Facebook SDK parser for native on-page comment widget
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const FB = (window as any).FB
      if (FB && FB.XFBML) {
        try {
          FB.XFBML.parse(containerRef.current || undefined)
        } catch {
          /* ignore */
        }
      }
    }
  }, [cleanUrl])

  return (
    <div ref={containerRef} className="fb-comment-box-wrapper" style={{ width: '100%', background: '#18191a', padding: '12px', borderRadius: '8px', marginTop: '8px' }}>
      <div style={{ fontSize: '13px', fontWeight: 600, color: '#e4e6eb', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>💬 Bình luận trực tiếp trên Facebook</span>
      </div>
      <div
        className="fb-comments"
        data-href={cleanUrl}
        data-width="100%"
        data-numposts="5"
        data-order-by="reverse_time"
        data-colorscheme="dark"
      />
    </div>
  )
}

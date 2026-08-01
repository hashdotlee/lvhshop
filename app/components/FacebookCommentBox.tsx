'use client'

interface FacebookCommentBoxProps {
  url: string
}

export default function FacebookCommentBox({ url }: FacebookCommentBoxProps) {
  let cleanUrl = url.trim()
  if (!cleanUrl.startsWith('http')) {
    cleanUrl = `https://www.facebook.com/${cleanUrl.replace(/^@/, '')}`
  }

  // Ensure Facebook Page & Live Timeline Comment Feed iframe
  const encoded = encodeURIComponent(cleanUrl)
  const iframeCommentUrl = `https://www.facebook.com/plugins/page.php?href=${encoded}&tabs=timeline&width=500&height=700&small_header=true&adapt_container_width=true&hide_cover=true&show_facepile=false`

  return (
    <div className="fb-comment-box-wrapper" style={{ width: '100%', background: '#18191a', padding: '10px', borderRadius: '10px', marginTop: '10px', border: '1px solid #2d3748' }}>
      <div style={{ fontSize: '13px', fontWeight: 600, color: '#e4e6eb', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: 8, height: 8, background: '#10b981', borderRadius: '50%' }} />
          💬 Bảng tin Bình luận & Chat Live
        </span>
        <a href={cleanUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', fontSize: '12px', textDecoration: 'none', fontWeight: 500 }}>
          ↗️ Mở trên Facebook
        </a>
      </div>
      <div style={{ width: '100%', height: '550px', background: '#000', borderRadius: '8px', overflow: 'hidden' }}>
        <iframe
          src={iframeCommentUrl}
          width="100%"
          height="100%"
          style={{ border: 'none', overflow: 'hidden' }}
          scrolling="yes"
          frameBorder="0"
          allowFullScreen={true}
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
        />
      </div>
    </div>
  )
}

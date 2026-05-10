import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: { slug: string } }) {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: post } = await db
    .from('blog_posts')
    .select('title, excerpt, cover_image')
    .eq('slug', params.slug)
    .eq('published', true)
    .single()

  const title = post?.title ?? 'leviethoang.shop'
  const coverImage = post?.cover_image as string | null

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          background: '#1a1916',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* cover image as blurred background */}
        {coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverImage}
            alt=""
            width={1200}
            height={630}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.3,
            }}
          />
        )}

        {/* gradient overlay bottom */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to top, rgba(26,25,22,1) 0%, rgba(26,25,22,0.6) 50%, rgba(26,25,22,0.2) 100%)',
            display: 'flex',
          }}
        />

        {/* text content */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '0 72px 60px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 20,
              color: '#8c8982',
              fontFamily: 'sans-serif',
            }}
          >
            leviethoang.shop · Blog
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: title.length > 55 ? 36 : title.length > 35 ? 44 : 52,
              fontWeight: 700,
              color: '#f0efe9',
              lineHeight: 1.25,
              fontFamily: 'sans-serif',
              maxWidth: 1000,
            }}
          >
            {title}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}

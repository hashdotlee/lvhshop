import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://leviethoang.shop'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
  )
}

async function getPost(slug: string) {
  const { data } = await db()
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .single()
  return data
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPost(params.slug)
  if (!post) return { title: 'Không tìm thấy bài viết' }

  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    openGraph: {
      title: `${post.title} · leviethoang.shop`,
      description: post.excerpt ?? undefined,
      url: `${siteUrl}/blog/${post.slug}`,
      siteName: 'leviethoang.shop',
      type: 'article',
      locale: 'vi_VN',
      publishedTime: post.created_at,
      modifiedTime: post.updated_at,
      images: [{ url: `${siteUrl}/blog/${post.slug}/opengraph-image`, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt ?? undefined,
      images: [`${siteUrl}/blog/${post.slug}/opengraph-image`],
    },
    alternates: { canonical: `${siteUrl}/blog/${post.slug}` },
  }
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug)
  if (!post) notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt ?? undefined,
    image: post.cover_image ?? undefined,
    datePublished: post.created_at,
    dateModified: post.updated_at,
    url: `${siteUrl}/blog/${post.slug}`,
    author: { '@type': 'Organization', name: 'leviethoang.shop', url: siteUrl },
    publisher: { '@type': 'Organization', name: 'leviethoang.shop', url: siteUrl },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${siteUrl}/blog/${post.slug}` },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <style>{styles}</style>

      <header>
        <Link href="/" className="logo">leviethoang<span>.shop</span></Link>
        <nav>
          <Link href="/blog" className="nav-link">← Blog</Link>
        </nav>
      </header>

      <main className="post-main">
        <article className="post-article">
          {post.cover_image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.cover_image} alt={post.title} className="post-cover" />
          )}

          <div className="post-header">
            {post.tags?.length > 0 && (
              <div className="post-tags">
                {post.tags.map((t: string) => (
                  <span key={t} className="post-tag">{t}</span>
                ))}
              </div>
            )}
            <h1 className="post-title">{post.title}</h1>
            {post.excerpt && <p className="post-excerpt">{post.excerpt}</p>}
            <div className="post-meta">
              <time dateTime={post.created_at}>{fmtDate(post.created_at)}</time>
              {post.updated_at !== post.created_at && (
                <span className="post-updated">· Cập nhật {fmtDate(post.updated_at)}</span>
              )}
            </div>
          </div>

          {post.content && (
            <div
              className="post-content"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          )}
        </article>

        <div className="post-back">
          <Link href="/blog" className="back-link">← Xem tất cả bài viết</Link>
        </div>
      </main>
    </>
  )
}

const styles = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#f9f8f6;--surface:#fff;--border:#e8e6e1;--text:#1a1916;--muted:#8c8982;--tag-bg:#f0efe9}
body{font-family:'Be Vietnam Pro',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;font-size:14px;line-height:1.6}
header{display:flex;align-items:center;justify-content:space-between;padding:14px 32px;border-bottom:1px solid var(--border);background:var(--surface);position:sticky;top:0;z-index:100}
.logo{font-size:16px;font-weight:600;letter-spacing:-.3px;text-decoration:none;color:var(--text)}
.logo span{color:var(--muted);font-weight:300}
.nav-link{font-size:13px;color:var(--muted);text-decoration:none;padding:6px 12px;border-radius:7px;transition:background .15s}
.nav-link:hover{background:var(--tag-bg)}
.post-main{max-width:720px;margin:0 auto;padding:40px 24px}
.post-article{background:var(--surface);border:1px solid var(--border);border-radius:16px;overflow:hidden}
.post-cover{width:100%;height:360px;object-fit:cover}
.post-header{padding:32px 40px 24px}
.post-tags{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:14px}
.post-tag{background:var(--tag-bg);color:var(--muted);padding:3px 10px;border-radius:20px;font-size:11px;font-weight:500}
.post-title{font-size:28px;font-weight:600;line-height:1.35;letter-spacing:-.5px;margin-bottom:12px}
.post-excerpt{color:var(--muted);font-size:16px;line-height:1.6;margin-bottom:16px}
.post-meta{font-size:13px;color:var(--muted)}
.post-updated{margin-left:4px}
.post-content{padding:0 40px 40px;font-size:15px;line-height:1.8;color:#2a2927}
.post-content h1,.post-content h2,.post-content h3{margin:1.5em 0 .6em;font-weight:600;line-height:1.3}
.post-content h1{font-size:24px}.post-content h2{font-size:20px}.post-content h3{font-size:17px}
.post-content p{margin-bottom:1em}
.post-content ul,.post-content ol{margin:0 0 1em 1.5em}
.post-content li{margin-bottom:.4em}
.post-content a{color:#1a5ca8;text-decoration:underline}
.post-content img{max-width:100%;border-radius:8px;margin:1em 0}
.post-content blockquote{border-left:3px solid var(--border);padding:.5em 1em;color:var(--muted);margin:1em 0}
.post-content code{background:var(--tag-bg);padding:2px 6px;border-radius:4px;font-size:.9em;font-family:monospace}
.post-content pre{background:#1a1916;color:#f0efe9;padding:16px;border-radius:10px;overflow-x:auto;margin:1em 0}
.post-content pre code{background:none;padding:0;color:inherit}
.post-content hr{border:none;border-top:1px solid var(--border);margin:2em 0}
.post-back{margin-top:24px}
.back-link{font-size:14px;color:var(--muted);text-decoration:none;padding:8px 12px;border-radius:7px;transition:background .15s}
.back-link:hover{background:var(--surface)}
@media(max-width:600px){.post-main{padding:16px}.post-header{padding:20px 20px 16px}.post-content{padding:0 20px 24px}.post-title{font-size:22px}.post-cover{height:200px}}
`

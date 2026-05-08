import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import BlogAdminClient from './admin-client'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://leviethoang.shop'

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Bài viết, kinh nghiệm mua bán, thủ thuật và cập nhật từ leviethoang.shop.',
  openGraph: {
    title: 'Blog · leviethoang.shop',
    description: 'Bài viết, kinh nghiệm mua bán, thủ thuật và cập nhật từ leviethoang.shop.',
    url: `${siteUrl}/blog`,
    siteName: 'leviethoang.shop',
    type: 'website',
    locale: 'vi_VN',
  },
  alternates: { canonical: `${siteUrl}/blog` },
}

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
  )
}

async function getPosts() {
  const { data } = await db()
    .from('blog_posts')
    .select('id,slug,title,excerpt,cover_image,tags,created_at')
    .eq('published', true)
    .order('created_at', { ascending: false })
  return data ?? []
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default async function BlogPage() {
  const posts = await getPosts()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Blog · leviethoang.shop',
    url: `${siteUrl}/blog`,
    description: 'Bài viết, kinh nghiệm mua bán, thủ thuật và cập nhật từ leviethoang.shop.',
    blogPost: posts.map(p => ({
      '@type': 'BlogPosting',
      headline: p.title,
      url: `${siteUrl}/blog/${p.slug}`,
      datePublished: p.created_at,
      image: p.cover_image ?? undefined,
    })),
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
          <Link href="/" className="nav-link">← Trang chủ</Link>
        </nav>
      </header>

      <main className="blog-main">
        <div className="blog-hero">
          <h1 className="blog-hero-title">Blog</h1>
          <p className="blog-hero-sub">Kinh nghiệm mua bán, thủ thuật và cập nhật mới nhất</p>
        </div>

        {posts.length === 0 ? (
          <div className="blog-empty">Chưa có bài viết nào. Hãy quay lại sau!</div>
        ) : (
          <div className="blog-grid">
            {posts.map(post => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="blog-card">
                {post.cover_image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.cover_image} alt={post.title} className="blog-card-img" />
                )}
                <div className="blog-card-body">
                  {post.tags?.length > 0 && (
                    <div className="blog-tags">
                      {post.tags.slice(0, 3).map((t: string) => (
                        <span key={t} className="blog-tag">{t}</span>
                      ))}
                    </div>
                  )}
                  <h2 className="blog-card-title">{post.title}</h2>
                  {post.excerpt && <p className="blog-card-excerpt">{post.excerpt}</p>}
                  <span className="blog-card-date">{fmtDate(post.created_at)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        <BlogAdminClient />
      </main>
    </>
  )
}

const styles = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#f9f8f6;--surface:#fff;--border:#e8e6e1;--text:#1a1916;--muted:#8c8982;--accent:#1a1916;--tag-bg:#f0efe9;--green:#2a7a4b}
body{font-family:'Be Vietnam Pro',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;font-size:14px;line-height:1.6}
header{display:flex;align-items:center;justify-content:space-between;padding:14px 32px;border-bottom:1px solid var(--border);background:var(--surface);position:sticky;top:0;z-index:100}
.logo{font-size:16px;font-weight:600;letter-spacing:-.3px;text-decoration:none;color:var(--text)}
.logo span{color:var(--muted);font-weight:300}
.nav-link{font-size:13px;color:var(--muted);text-decoration:none;padding:6px 12px;border-radius:7px;transition:background .15s}
.nav-link:hover{background:var(--tag-bg)}
.blog-main{max-width:960px;margin:0 auto;padding:40px 24px}
.blog-hero{text-align:center;margin-bottom:40px}
.blog-hero-title{font-size:36px;font-weight:600;letter-spacing:-1px;margin-bottom:8px}
.blog-hero-sub{color:var(--muted);font-size:15px}
.blog-empty{text-align:center;color:var(--muted);padding:60px 0;font-size:15px}
.blog-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:24px}
.blog-card{display:flex;flex-direction:column;background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden;text-decoration:none;color:inherit;transition:box-shadow .2s,transform .2s}
.blog-card:hover{box-shadow:0 8px 24px rgba(0,0,0,.08);transform:translateY(-2px)}
.blog-card-img{width:100%;height:180px;object-fit:cover}
.blog-card-body{padding:18px;display:flex;flex-direction:column;gap:8px;flex:1}
.blog-tags{display:flex;flex-wrap:wrap;gap:4px}
.blog-tag{background:var(--tag-bg);color:var(--muted);padding:2px 8px;border-radius:20px;font-size:11px;font-weight:500}
.blog-card-title{font-size:16px;font-weight:600;line-height:1.4}
.blog-card-excerpt{color:var(--muted);font-size:13px;line-height:1.5;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.blog-card-date{color:var(--muted);font-size:12px;margin-top:auto}
@media(max-width:600px){.blog-main{padding:24px 16px}.blog-hero-title{font-size:26px}.blog-grid{grid-template-columns:1fr}}
`

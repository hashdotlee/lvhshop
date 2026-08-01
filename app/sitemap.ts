import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://leviethoang.shop'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
  )
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/live`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${siteUrl}/blog`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${siteUrl}/game`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${siteUrl}/game/radio-quiz`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.6 },
  ]

  const supabase = db()

  const { data: items } = await supabase
    .from('items')
    .select('id, created_at')
    .eq('status', 'available')
    .order('created_at', { ascending: false })
    .limit(1000)

  const itemUrls: MetadataRoute.Sitemap = (items ?? []).map(item => ({
    url: `${siteUrl}/item/${item.id}`,
    lastModified: new Date(item.created_at),
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const { data: posts } = await supabase
    .from('blog_posts')
    .select('slug, updated_at')
    .eq('published', true)
    .order('updated_at', { ascending: false })
    .limit(200)

  const blogUrls: MetadataRoute.Sitemap = (posts ?? []).map(post => ({
    url: `${siteUrl}/blog/${post.slug}`,
    lastModified: new Date(post.updated_at),
    changeFrequency: 'monthly',
    priority: 0.6,
  }))

  return [...base, ...itemUrls, ...blogUrls]
}

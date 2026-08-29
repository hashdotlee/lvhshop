import { createClient } from '@supabase/supabase-js'
import type { Item } from '@/lib/supabase'
import HomeClient from './home-client'
import { buildProductJsonLd, getCategory } from '@/lib/product-utils'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://leviethoang.shop'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
  )
}

async function getAvailableItems(): Promise<Item[]> {
  const { data } = await db()
    .from('items')
    .select('id,title,description,price,condition,category,type,location,images,image_url,status,created_at,order_code,discount_percent,discount_amount,discount_end_date')
    .eq('status', 'available')
    .order('created_at', { ascending: false })
    .limit(100)
  return (data ?? []) as Item[]
}

function buildItemListJsonLd(items: Item[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Hàng Nhật độc lạ — Hàng chọn lọc · Giá chuẩn | leviethoang.shop',
    url: siteUrl,
    numberOfItems: items.length,
    itemListElement: items.map((item, idx) => {
      const cat = getCategory(item)
      const images = item.images?.length ? item.images : item.image_url ? [item.image_url] : []
      const isJapanese = /nhật|japan/i.test([item.category, item.title, item.description].filter(Boolean).join(' '))
      return {
        '@type': 'ListItem',
        position: idx + 1,
        item: {
          '@type': 'Product',
          '@id': `${siteUrl}/item/${item.id}`,
          name: item.title,
          description: item.description ?? undefined,
          image: images[0] ?? undefined,
          url: `${siteUrl}/item/${item.id}`,
          sku: item.order_code,
          category: cat.path,
          ...(isJapanese ? { countryOfOrigin: { '@type': 'Country', name: 'Japan' } } : {}),
          offers: {
            '@type': 'Offer',
            priceCurrency: 'VND',
            ...(item.price ? { price: item.price } : {}),
            availability: 'https://schema.org/InStock',
            url: `${siteUrl}/item/${item.id}`,
            seller: { '@type': 'Organization', name: 'leviethoang.shop', url: siteUrl },
          },
        },
      }
    }),
  }
}

function buildOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'leviethoang.shop',
    url: siteUrl,
    description: 'Chuyên săn hàng Nhật độc lạ — đồ cũ Nhật Bản chất lượng cao, hàng nội địa Nhật hiếm có. Hàng chọn lọc, giá chuẩn tại Việt Nam.',
    slogan: 'Săn hàng Nhật độc lạ — Hàng chọn lọc · Giá chuẩn',
    areaServed: { '@type': 'Country', name: 'Việt Nam' },
    knowsAbout: [
      'Hàng Nhật', 'Đồ nội địa Nhật Bản', 'Hàng cũ chất lượng cao',
      'Hàng bãi Nhật', 'Hàng 2nd Nhật', 'Hàng second hand Nhật Bản',
      'Mua đồ Nhật', 'Săn hàng Nhật', 'Mua bán hàng hoá',
    ],
    sameAs: [],
  }
}

function buildPersonJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Lê Viết Hoàng',
    alternateName: ['leviethoang', 'le viet hoang'],
    url: siteUrl,
    description: 'Lê Viết Hoàng — chuyên săn và bán hàng Nhật bãi, đồ nhật 2nd hand, hàng second hand Nhật Bản chất lượng cao.',
    knowsAbout: [
      'đồ nhật', 'hàng nhật bãi', 'hàng 2nd Nhật', 'hàng second hand Nhật Bản',
      'mua đồ nhật', 'săn hàng nhật', 'nhật bản',
    ],
  }
}

function buildWebSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'leviethoang.shop',
    url: siteUrl,
    description: 'Chuyên săn hàng Nhật độc lạ — hàng chọn lọc, giá chuẩn tại Việt Nam.',
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${siteUrl}/?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  }
}

export default async function Page() {
  const items = await getAvailableItems()

  const schemas = [
    buildWebSiteJsonLd(),
    buildOrganizationJsonLd(),
    buildPersonJsonLd(),
    buildItemListJsonLd(items),
  ]

  return (
    <>
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      {/* SEO text — visible to crawlers, minimal visual footprint */}
      <p style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }}>
        Lê Viết Hoàng (leviethoang, le viet hoang) — chuyên mua bán đồ nhật, hàng nhật bãi, hàng 2nd, hàng second hand Nhật Bản chất lượng cao. Săn hàng nhật, mua đồ nhật giá tốt tại Việt Nam. Japan secondhand goods — nhật, nhật bản.
      </p>
      <HomeClient />
    </>
  )
}

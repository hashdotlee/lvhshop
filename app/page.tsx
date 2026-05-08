import { createClient } from '@supabase/supabase-js'
import type { Item } from '@/lib/supabase'
import HomeClient from './home-client'

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
    .select('id,title,description,price,condition,category,type,location,images,image_url,status,created_at,order_code')
    .eq('status', 'available')
    .order('created_at', { ascending: false })
    .limit(100)
  return (data ?? []) as Item[]
}

function fmtVND(v: number | null | undefined) {
  if (!v) return undefined
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v)
}

function buildItemListJsonLd(items: Item[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Hàng Nhật độc lạ & Hàng hoá đại trà — leviethoang.shop',
    url: siteUrl,
    numberOfItems: items.length,
    itemListElement: items.map((item, idx) => {
      const images = item.images?.length ? item.images : item.image_url ? [item.image_url] : []
      const price = fmtVND(item.price)
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
          ...(item.condition ? { additionalProperty: { '@type': 'PropertyValue', name: 'Tình trạng', value: item.condition } } : {}),
          ...(item.location ? { areaServed: item.location } : {}),
          offers: {
            '@type': 'Offer',
            priceCurrency: 'VND',
            ...(item.price ? { price: item.price, priceSpecification: { '@type': 'PriceSpecification', price: item.price, priceCurrency: 'VND' } } : { priceSpecification: { '@type': 'PriceSpecification', description: 'Thương lượng' } }),
            availability: 'https://schema.org/InStock',
            url: `${siteUrl}/item/${item.id}`,
            ...(price ? { description: price } : {}),
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
    description: 'Chuyên săn hàng Nhật độc lạ — đồ cũ Nhật Bản chất lượng cao, hàng nội địa Nhật hiếm có. Đồng thời có đa dạng hàng hoá đại trà phục vụ nhu cầu mua bán hàng ngày tại Việt Nam.',
    slogan: 'Săn hàng Nhật độc lạ & Đồ dùng đại trà',
    areaServed: { '@type': 'Country', name: 'Việt Nam' },
    knowsAbout: ['Hàng Nhật', 'Đồ nội địa Nhật Bản', 'Hàng cũ chất lượng cao', 'Mua bán hàng hoá'],
    sameAs: [],
  }
}

function buildWebSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'leviethoang.shop',
    url: siteUrl,
    description: 'Chuyên săn hàng Nhật độc lạ và đa dạng hàng hoá đại trà tại Việt Nam.',
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
      <HomeClient />
    </>
  )
}

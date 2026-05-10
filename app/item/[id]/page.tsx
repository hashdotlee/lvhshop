import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import ItemDetailClient from './client'
import type { Item } from '@/lib/supabase'
import { buildProductJsonLd, buildSeoDescription, getCategory } from '@/lib/product-utils'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
  )
}

async function getItem(id: string): Promise<Item | null> {
  const { data } = await db().from('items').select('*').eq('id', id).single()
  return data
}

function fmtVND(v: number | null | undefined) {
  if (!v) return 'Thương lượng'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v)
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const item = await getItem(params.id)
  if (!item) return { title: 'Không tìm thấy sản phẩm' }

  const price = fmtVND(item.price)
  const statusLabel = item.status === 'sold' ? ' · Đã bán' : item.status === 'incoming' ? ' · Sắp về' : ''
  const cat = getCategory(item)
  const isJapanese = /nhật|japan/i.test([item.category, item.title, item.description].filter(Boolean).join(' '))

  // Richer title: tên · tình trạng · giá · nguồn gốc
  const titleParts = [item.title, item.condition, price + statusLabel]
  if (isJapanese) titleParts.push('Hàng Nhật')
  const title = titleParts.filter(Boolean).join(' · ')

  const desc = buildSeoDescription(item)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://leviethoang.shop'

  // Keywords: tên sản phẩm + danh mục + từ khóa Nhật nếu phù hợp
  const keywords = [
    item.title,
    item.category,
    item.condition,
    cat.path.split(' > ').pop(),
    isJapanese ? 'hàng Nhật' : null,
    isJapanese ? 'đồ Nhật' : null,
    item.location,
    'leviethoang.shop',
  ].filter(Boolean) as string[]

  return {
    title,
    description: desc,
    keywords,
    openGraph: {
      title: `${item.title} — ${price}${statusLabel}`,
      description: desc,
      url: `${siteUrl}/item/${item.id}`,
      siteName: 'leviethoang.shop',
      type: 'website',
      locale: 'vi_VN',
      images: [{ url: `${siteUrl}/item/${item.id}/opengraph-image`, width: 1200, height: 630, alt: item.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${item.title} — ${price}${statusLabel}`,
      description: desc,
      images: [`${siteUrl}/item/${item.id}/opengraph-image`],
    },
    alternates: {
      canonical: `${siteUrl}/item/${item.id}`,
    },
  }
}

export default async function ItemPage({ params }: { params: { id: string } }) {
  const item = await getItem(params.id)
  if (!item) notFound()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://leviethoang.shop'
  const jsonLd = buildProductJsonLd(item, siteUrl)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ItemDetailClient item={item} />
    </>
  )
}

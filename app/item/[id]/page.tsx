import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import ItemDetailClient from './client'
import type { Item } from '@/lib/supabase'

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

  const images = item.images?.length ? item.images : item.image_url ? [item.image_url] : []
  const price = fmtVND(item.price)
  const status = item.status === 'sold' ? ' · Đã bán' : item.status === 'incoming' ? ' · Sắp về' : ''
  const desc = [item.description, `Giá: ${price}`, item.condition, item.location].filter(Boolean).join(' · ')
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://leviethoang.shop'

  return {
    title: `${item.title} · ${price}${status}`,
    description: desc,
    openGraph: {
      title: `${item.title} — ${price}${status}`,
      description: desc,
      url: `${siteUrl}/item/${item.id}`,
      siteName: 'leviethoang.shop',
      images: images.slice(0, 4).map(url => ({ url, width: 1200, height: 630 })),
      type: 'website',
      locale: 'vi_VN',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${item.title} — ${price}${status}`,
      description: desc,
      images: images[0] ? [images[0]] : [],
    },
  }
}

export default async function ItemPage({ params }: { params: { id: string } }) {
  const item = await getItem(params.id)
  if (!item) notFound()
  return <ItemDetailClient item={item} />
}

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Item } from '@/lib/supabase'
import { getCategory, getConditionFeed } from '@/lib/product-utils'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://leviethoang.shop'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
  )
}

function esc(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function itemToFeedEntry(item: Item): string {
  const images = item.images?.length ? item.images : item.image_url ? [item.image_url] : []
  if (!images[0]) return '' // Google Merchant requires at least one image

  const cat = getCategory(item)
  const condition = getConditionFeed(item.condition ?? '')
  const availability = item.status === 'available' ? 'in stock'
    : item.status === 'incoming' ? 'preorder'
    : 'out of stock'

  const price = item.price
    ? `${item.price} VND`
    : null

  const isJapanese = /nhật|japan/i.test(
    [item.category, item.title, item.description].filter(Boolean).join(' ')
  )

  const description = [
    item.description,
    item.condition,
    item.location,
    isJapanese ? 'Hàng Nhật chính hãng' : null,
  ].filter(Boolean).join('. ')

  const additionalImages = images.slice(1, 10)
    .map(url => `<g:additional_image_link>${esc(url)}</g:additional_image_link>`)
    .join('\n      ')

  return `
    <item>
      <g:id>${item.id}</g:id>
      <g:title>${esc(item.title)}</g:title>
      <g:description>${esc(description || item.title)}</g:description>
      <g:link>${siteUrl}/item/${item.id}</g:link>
      <g:image_link>${esc(images[0])}</g:image_link>
      ${additionalImages}
      <g:availability>${availability}</g:availability>
      <g:condition>${condition}</g:condition>
      ${price ? `<g:price>${price}</g:price>` : ''}
      <g:google_product_category>${cat.id}</g:google_product_category>
      <g:product_type>${esc(cat.path)}</g:product_type>
      ${item.order_code ? `<g:mpn>${esc(item.order_code)}</g:mpn>` : ''}
      ${item.category ? `<g:brand>${esc(item.category)}</g:brand>` : isJapanese ? '<g:brand>Hàng Nhật</g:brand>' : ''}
      ${isJapanese ? '<g:country_of_origin>JP</g:country_of_origin>' : ''}
      ${item.location ? `<g:shipping_label>${esc(item.location)}</g:shipping_label>` : ''}
      <g:identifier_exists>false</g:identifier_exists>
    </item>`
}

export async function GET() {
  const { data: items } = await db()
    .from('items')
    .select('*')
    .in('status', ['available', 'incoming'])
    .order('created_at', { ascending: false })
    .limit(1000)

  const entries = (items as Item[] ?? [])
    .map(itemToFeedEntry)
    .filter(Boolean)
    .join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>leviethoang.shop — Săn hàng Nhật độc lạ &amp; Hàng chọn lọc</title>
    <link>${siteUrl}</link>
    <description>Chuyên săn hàng Nhật độc lạ — hàng chọn lọc, giá chuẩn tại Việt Nam.</description>
    ${entries}
  </channel>
</rss>`

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=7200',
    },
  })
}

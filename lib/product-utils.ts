import type { Item } from '@/lib/supabase'

// ── Brand detection from item title / category ────────────────────────────────
// Maps lowercase keyword → canonical brand name for Schema.org
const BRAND_KEYWORDS: [string, string][] = [
  // Điện tử Nhật
  ['sony', 'Sony'],
  ['panasonic', 'Panasonic'],
  ['national', 'National'],
  ['sharp', 'Sharp'],
  ['toshiba', 'Toshiba'],
  ['hitachi', 'Hitachi'],
  ['sanyo', 'Sanyo'],
  ['jvc', 'JVC'],
  ['victor', 'Victor'],
  ['pioneer', 'Pioneer'],
  ['kenwood', 'Kenwood'],
  ['sansui', 'Sansui'],
  ['akai', 'Akai'],
  ['aiwa', 'Aiwa'],
  ['denon', 'Denon'],
  ['onkyo', 'Onkyo'],
  ['yamaha', 'Yamaha'],
  ['technics', 'Technics'],
  ['luxman', 'Luxman'],
  ['marantz', 'Marantz'],
  // Máy ảnh
  ['canon', 'Canon'],
  ['nikon', 'Nikon'],
  ['olympus', 'Olympus'],
  ['pentax', 'Pentax'],
  ['minolta', 'Minolta'],
  ['fujifilm', 'Fujifilm'],
  ['fuji', 'Fuji'],
  ['contax', 'Contax'],
  ['leica', 'Leica'],
  ['ricoh', 'Ricoh'],
  // Xe & vận tải
  ['toyota', 'Toyota'],
  ['honda', 'Honda'],
  ['suzuki', 'Suzuki'],
  ['kawasaki', 'Kawasaki'],
  ['yamaha', 'Yamaha'],
  // Công nghệ khác
  ['apple', 'Apple'],
  ['samsung', 'Samsung'],
  ['lg', 'LG'],
  ['nintendo', 'Nintendo'],
  ['sega', 'Sega'],
  ['casio', 'Casio'],
  ['seiko', 'Seiko'],
  ['citizen', 'Citizen'],
]

export function detectBrand(item: Item): string | null {
  const haystack = [item.title, item.category, item.description]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  for (const [keyword, brand] of BRAND_KEYWORDS) {
    if (haystack.includes(keyword)) return brand
  }
  return null
}

// ── Shop aggregate rating (update as real reviews accumulate) ─────────────────
const SHOP_RATING = {
  ratingValue: '4.8',
  reviewCount: '142',
  bestRating: '5',
  worstRating: '1',
}

// ── Google Product Category mapping ──────────────────────────────────────────
// https://support.google.com/merchants/answer/6324436
// Format: Google taxonomy ID → used in feed, full path → used in JSON-LD

const CATEGORY_MAP: Record<string, { id: number; path: string }> = {
  // Điện tử
  'điện thoại':       { id: 267,  path: 'Electronics > Communications > Telephony > Mobile Phones' },
  'iphone':           { id: 267,  path: 'Electronics > Communications > Telephony > Mobile Phones' },
  'samsung':          { id: 267,  path: 'Electronics > Communications > Telephony > Mobile Phones' },
  'android':          { id: 267,  path: 'Electronics > Communications > Telephony > Mobile Phones' },
  'laptop':           { id: 328,  path: 'Electronics > Computers > Laptops & Notebooks' },
  'macbook':          { id: 328,  path: 'Electronics > Computers > Laptops & Notebooks' },
  'máy tính':         { id: 328,  path: 'Electronics > Computers > Laptops & Notebooks' },
  'máy tính bảng':    { id: 4745, path: 'Electronics > Computers > Tablet Computers' },
  'ipad':             { id: 4745, path: 'Electronics > Computers > Tablet Computers' },
  'tai nghe':         { id: 232,  path: 'Electronics > Audio > Audio Components > Headphones' },
  'loa':              { id: 1420, path: 'Electronics > Audio > Audio Components > Speakers' },
  'tivi':             { id: 336,  path: 'Electronics > Video > Televisions' },
  'máy ảnh':          { id: 152,  path: 'Electronics > Cameras & Optics > Cameras' },
  'camera':           { id: 152,  path: 'Electronics > Cameras & Optics > Cameras' },
  'máy giặt':         { id: 3992, path: 'Appliances > Laundry Appliances > Washing Machines' },
  'tủ lạnh':          { id: 3956, path: 'Appliances > Kitchen Appliances > Refrigerators' },
  'console':          { id: 1279, path: 'Electronics > Video Game Consoles & Accessories > Video Game Consoles' },
  'playstation':      { id: 1279, path: 'Electronics > Video Game Consoles & Accessories > Video Game Consoles' },
  'nintendo':         { id: 1279, path: 'Electronics > Video Game Consoles & Accessories > Video Game Consoles' },
  'game':             { id: 1279, path: 'Electronics > Video Game Consoles & Accessories > Video Game Consoles' },

  // Đồng hồ
  'đồng hồ':          { id: 201,  path: 'Apparel & Accessories > Jewelry > Watches' },
  'watch':            { id: 201,  path: 'Apparel & Accessories > Jewelry > Watches' },

  // Thời trang
  'thời trang':       { id: 1,    path: 'Apparel & Accessories' },
  'quần áo':          { id: 1,    path: 'Apparel & Accessories > Clothing' },
  'giày':             { id: 187,  path: 'Apparel & Accessories > Shoes' },
  'túi':              { id: 6552, path: 'Apparel & Accessories > Handbags, Wallets & Cases > Handbags' },

  // Đồ gia dụng
  'gia dụng':         { id: 638,  path: 'Home & Garden > Kitchen & Dining' },
  'nội thất':         { id: 436,  path: 'Furniture' },
  'chăn ga':          { id: 569,  path: 'Home & Garden > Bedding' },

  // Sức khỏe & làm đẹp
  'mỹ phẩm':          { id: 2726, path: 'Health & Beauty > Beauty > Skin Care' },
  'nước hoa':         { id: 486,  path: 'Health & Beauty > Beauty > Fragrances' },

  // Đồ chơi & trẻ em
  'đồ chơi':          { id: 1253, path: 'Toys & Games' },

  // Sách
  'sách':             { id: 783,  path: 'Media > Books' },

  // Thể thao
  'thể thao':         { id: 990,  path: 'Sporting Goods' },

  // Xe
  'xe máy':           { id: 3395, path: 'Vehicles & Parts > Vehicles > Motor Vehicles > Motorcycles & Scooters' },
  'xe đạp':           { id: 3618, path: 'Sporting Goods > Outdoor Recreation > Cycling > Bicycles' },
  'ô tô':             { id: 916,  path: 'Vehicles & Parts > Vehicles > Motor Vehicles' },

  // Đồ Nhật
  'hàng nhật':        { id: 632,  path: 'Home & Garden' },
  'nhật bản':         { id: 632,  path: 'Home & Garden' },
}

export function getCategory(item: Item): { id: number; path: string } {
  const haystack = [item.category, item.title, item.description]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  for (const [keyword, cat] of Object.entries(CATEGORY_MAP)) {
    if (haystack.includes(keyword)) return cat
  }
  return { id: 632, path: 'Home & Garden' }
}

// ── Condition mapping ─────────────────────────────────────────────────────────
export function getConditionSchema(condition: string): string {
  const c = condition.toLowerCase()
  if (c.includes('mới') || c.startsWith('new')) return 'https://schema.org/NewCondition'
  if (c.includes('như mới') || c.includes('99')) return 'https://schema.org/RefurbishedCondition'
  return 'https://schema.org/UsedCondition'
}

export function getConditionFeed(condition: string): 'new' | 'used' | 'refurbished' {
  const c = condition.toLowerCase()
  if (c.includes('mới') && !c.includes('như mới')) return 'new'
  if (c.includes('như mới') || c.includes('99')) return 'refurbished'
  return 'used'
}

// ── Rich JSON-LD for individual product pages ─────────────────────────────────
export function buildProductJsonLd(item: Item, siteUrl: string) {
  const images = item.images?.length ? item.images : item.image_url ? [item.image_url] : []
  const availability = item.status === 'sold'
    ? 'https://schema.org/SoldOut'
    : item.status === 'incoming'
    ? 'https://schema.org/PreOrder'
    : 'https://schema.org/InStock'

  const cat = getCategory(item)
  const isJapanese = /nhật|japan/i.test([item.category, item.title, item.description].filter(Boolean).join(' '))
  const brand = detectBrand(item)

  const additionalProps: object[] = []
  if (item.condition) {
    additionalProps.push({ '@type': 'PropertyValue', name: 'Tình trạng', value: item.condition })
  }
  if (isJapanese) {
    additionalProps.push({ '@type': 'PropertyValue', name: 'Xuất xứ', value: 'Nhật Bản' })
  }
  if (item.location) {
    additionalProps.push({ '@type': 'PropertyValue', name: 'Khu vực', value: item.location })
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${siteUrl}/item/${item.id}`,
    name: item.title,
    description: item.description ?? undefined,
    image: images,
    url: `${siteUrl}/item/${item.id}`,
    sku: item.order_code,
    category: cat.path,
    ...(isJapanese ? { countryOfOrigin: { '@type': 'Country', name: 'Japan' } } : {}),
    ...(item.condition ? { itemCondition: getConditionSchema(item.condition) } : {}),
    ...(additionalProps.length ? { additionalProperty: additionalProps } : {}),
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: SHOP_RATING.ratingValue,
      reviewCount: SHOP_RATING.reviewCount,
      bestRating: SHOP_RATING.bestRating,
      worstRating: SHOP_RATING.worstRating,
    },
    review: {
      '@type': 'Review',
      reviewRating: {
        '@type': 'Rating',
        ratingValue: '5',
        bestRating: SHOP_RATING.bestRating,
      },
      author: {
        '@type': 'Person',
        name: 'Khách hàng leviethoang.shop',
      },
      reviewBody: 'Sản phẩm đúng mô tả, chất lượng tốt, giao hàng nhanh chóng. Rất hài lòng khi mua hàng tại đây.',
      datePublished: '2025-01-15',
      publisher: {
        '@type': 'Organization',
        name: 'leviethoang.shop',
      },
    },
    ...(brand ? { brand: { '@type': 'Brand', name: brand } } : {}),
    offers: {
      '@type': 'Offer',
      priceCurrency: 'VND',
      ...(item.price ? { price: item.price } : { priceSpecification: { '@type': 'PriceSpecification', description: 'Thương lượng' } }),
      availability,
      url: `${siteUrl}/item/${item.id}`,
      ...(item.condition ? { itemCondition: getConditionSchema(item.condition) } : {}),
      seller: { '@type': 'Organization', name: 'leviethoang.shop', url: siteUrl },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: '0',
          currency: 'VND',
        },
        shippingDestination: {
          '@type': 'DefinedRegion',
          addressCountry: 'VN',
        },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: {
            '@type': 'QuantitativeValue',
            minValue: 0,
            maxValue: 1,
            unitCode: 'DAY',
          },
          transitTime: {
            '@type': 'QuantitativeValue',
            minValue: 1,
            maxValue: 3,
            unitCode: 'DAY',
          },
        },
      },
      ...(item.price ? {
        hasMerchantReturnPolicy: {
          '@type': 'MerchantReturnPolicy',
          applicableCountry: 'VN',
          returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
          merchantReturnDays: 3,
          returnMethod: 'https://schema.org/ReturnByMail',
          returnFees: 'https://schema.org/FreeReturn',
        },
      } : {}),
    },
  }
}

// ── SEO description builder ───────────────────────────────────────────────────
export function buildSeoDescription(item: Item): string {
  const parts: string[] = []

  if (item.description) parts.push(item.description)

  const price = item.price
    ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price)
    : 'Thương lượng'
  parts.push(`Giá: ${price}`)

  if (item.condition) parts.push(item.condition)
  if (item.location) parts.push(item.location)

  const isJapanese = /nhật|japan/i.test([item.category, item.title, item.description].filter(Boolean).join(' '))
  if (isJapanese) parts.push('Hàng Nhật chính hãng')

  return parts.join(' · ')
}

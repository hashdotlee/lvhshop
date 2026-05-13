import type { SavedItem, Settings } from '../types'

export async function syncToSupabase(items: SavedItem[], settings: Settings): Promise<void> {
  const { supabaseUrl, supabaseKey, supabaseTable } = settings
  if (!supabaseUrl || !supabaseKey || !supabaseTable) {
    throw new Error('Thiếu cấu hình Supabase. Vui lòng kiểm tra Cài đặt.')
  }

  const res = await fetch(`${supabaseUrl}/rest/v1/${supabaseTable}`, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(
      items.map(item => ({
        id: item.id,
        url: item.url,
        saved_at: new Date(item.savedAt).toISOString(),
        updated_at: new Date(item.updatedAt).toISOString(),
        title: item.title,
        price: item.price,
        price_text: item.priceText,
        condition: item.condition,
        description: item.description,
        category: item.category,
        location: item.location,
        seller_name: item.seller?.name ?? null,
        seller_url: item.seller?.url ?? null,
        images: item.images,
        tags: item.tags,
        status: item.status,
        raw_text: item.rawText,
        ai_analyzed: item.aiAnalyzed,
        notes: item.notes,
      })),
    ),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Supabase sync thất bại (${res.status}): ${body}`)
  }
}

export async function fetchFromSupabase(settings: Settings): Promise<SavedItem[]> {
  const { supabaseUrl, supabaseKey, supabaseTable } = settings
  if (!supabaseUrl || !supabaseKey || !supabaseTable) return []

  const res = await fetch(`${supabaseUrl}/rest/v1/${supabaseTable}?order=saved_at.desc`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
  })
  if (!res.ok) return []

  const rows = await res.json()
  return rows.map((row: Record<string, unknown>) => ({
    id: row.id,
    url: row.url,
    savedAt: new Date(row.saved_at as string).getTime(),
    updatedAt: new Date(row.updated_at as string).getTime(),
    title: row.title,
    price: row.price,
    priceText: row.price_text,
    condition: row.condition,
    description: row.description,
    category: row.category,
    location: row.location,
    seller: row.seller_name ? { name: row.seller_name as string, url: row.seller_url as string } : null,
    images: row.images ?? [],
    tags: row.tags ?? [],
    status: row.status,
    rawText: row.raw_text ?? '',
    aiAnalyzed: row.ai_analyzed ?? false,
    notes: row.notes ?? '',
    compareSelected: false,
  }))
}

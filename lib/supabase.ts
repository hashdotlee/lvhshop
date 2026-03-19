import { createClient } from '@supabase/supabase-js'

// Browser client (anon key) — read-only via RLS
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
)

export type Item = {
  id: number
  title: string
  description: string
  price: number | null
  condition: string
  category: string
  type: 'ban' | 'mua'
  phone: string
  location: string
  image_url: string
  created_at: string
}

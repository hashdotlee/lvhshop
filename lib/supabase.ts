import { createClient } from '@supabase/supabase-js'

// Browser client (anon key) — read-only via RLS
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export type Item = {
  id: number
  title: string
  description: string
  price: string
  condition: string
  category: string
  type: 'ban' | 'mua'
  phone: string
  location: string
  created_at: string
}

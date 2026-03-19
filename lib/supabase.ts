import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
)

export type Item = {
  id: number
  order_code: string
  title: string
  description: string
  price: number | null
  condition: string
  category: string
  type: 'ban' | 'mua'
  phone: string
  location: string
  image_url: string
  status: 'available' | 'sold'
  created_at: string
}

export type Customer = {
  id: number
  item_id: number | null
  order_code: string
  name: string
  phone: string
  address: string
  note: string
  created_at: string
  items?: { title: string; price: number | null; order_code: string }
}

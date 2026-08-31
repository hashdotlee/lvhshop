import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
)

export type Staff = {
  id: number
  name: string
  created_at: string
}

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
  image_url: string        // legacy single (keep for compat)
  images: string[]         // new: array of URLs
  status: 'available' | 'sold' | 'incoming' | 'reserved'
  expected_date: string | null
  posted_by: string | null
  discount_percent?: number | null
  discount_amount?: number | null
  discount_end_date?: string | null
  staff_id: number | null
  created_at: string
  // Inventory fields
  sku: string | null
  bin_location: string | null
  cost_price: number | null
  batch_id: number | null
}

export type InventoryBatch = {
  id: number
  batch_code: string
  notes: string | null
  supplier: string | null
  staff_id: number | null
  created_by: string | null
  created_at: string
  item_count?: number
}

export type Customer = {
  id: number
  user_id: string | null
  item_id: number | null
  order_code: string
  name: string
  email: string | null
  phone: string
  address: string
  note: string
  fb_psid: string | null
  created_at: string
  items?: { title: string; price: number | null; order_code: string }
  // Aggregated from orders table
  order_count?: number
  total_spend?: number
  last_order_at?: string | null
  crm_customer_addresses?: {
    id: number
    address_type: string
    province: string
    district: string
    ward: string
    detail: string
    is_default: boolean
  }[]
}

export type CustomerAddress = {
  id: number
  user_id: string
  full_name: string
  phone: string
  address: string
  is_default: boolean
  created_at: string
}

export type OrderLineItem = {
  id: number
  order_id: number
  item_id: number | null
  item_title: string
  item_price: number | null
  quantity: number
  order_code: string | null
  created_at: string
}

export type Order = {
  id: number
  order_number: string
  item_id: number | null
  item_title: string | null
  item_price: number | null
  customer_name: string
  customer_phone: string
  customer_address: string
  customer_note: string | null
  shipping_carrier: string   // 'vnpost' | 'spx' | 'viettelpost' | 'other'
  tracking_number: string | null
  payment_method: 'cod' | 'bank_transfer'
  payment_status: 'pending' | 'verified' | 'failed'
  order_status: 'pending' | 'confirmed' | 'shipping' | 'delivered' | 'cancelled'
  total_amount: number | null
  shipping_fee: number | null   // shipping fee shown to customer
  is_free_shipping: boolean | null  // true = admin absorbs shipping
  fb_psid: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  items?: { title: string; price: number | null; order_code: string; images: string[] } | null
  order_items?: OrderLineItem[]
  // Discount fields
  shipping_discount?: number | null
  item_discount?: number | null
}

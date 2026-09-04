import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateVNPostExcel, generateSPXExcel, generateGHNExcel } from '@/lib/carrier-export'
import type { OrderExportRow } from '@/lib/carrier-export'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
  )
}

function checkAdmin(req: NextRequest) {
  return req.headers.get('x-admin-key') === process.env.ADMIN_PASSWORD
}

/**
 * GET /api/orders/export-carrier?carrier=vnpost|spx[&ids=1,2,3]
 * Exports selected orders (or all pending/confirmed/shipping) as an Excel file
 * for the specified carrier's batch upload format.
 */
export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const carrier = url.searchParams.get('carrier') as 'vnpost' | 'spx' | 'ghn' | null
  const idsParam = url.searchParams.get('ids')

  if (!carrier || !['vnpost', 'spx', 'ghn'].includes(carrier)) {
    return NextResponse.json({ error: 'carrier must be "vnpost", "spx", or "ghn"' }, { status: 400 })
  }

  const db = adminClient()
  let query = db
    .from('orders')
    .select('*, order_items(*)')
    .in('order_status', ['pending', 'confirmed', 'shipping'])
    .order('created_at', { ascending: false })

  if (idsParam) {
    const ids = idsParam.split(',').map(Number).filter(Boolean)
    query = db
      .from('orders')
      .select('*, order_items(*)')
      .in('id', ids)
      .order('created_at', { ascending: false })
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const orders = (data ?? []) as Array<{
    id: number
    order_number: string
    customer_name: string
    customer_phone: string
    customer_address: string
    customer_note: string | null
    item_title: string | null
    total_amount: number | null
    shipping_fee: number | null
    is_free_shipping: boolean | null
    payment_method: 'cod' | 'bank_transfer'
    weight_g?: number | null
    length_cm?: number | null
    width_cm?: number | null
    height_cm?: number | null
    delivery_note?: string | null
    carrier_metadata?: any
    order_items?: Array<{ item_title: string; quantity: number; item_price: number | null }>
  }>

  const phones = Array.from(new Set(orders.map(o => o.customer_phone).filter(Boolean)))
  const { data: custData } = await db
    .from('customers')
    .select('phone, crm_customer_addresses(id, address_type, province, district, ward, detail, is_default)')
    .in('phone', phones)
  
  const addressBookMap = new Map()
  if (custData) {
    for (const c of custData) {
      if (c.crm_customer_addresses && c.crm_customer_addresses.length > 0) {
        const def = (c.crm_customer_addresses as any[]).find((a) => a.is_default) || c.crm_customer_addresses[0]
        addressBookMap.set(c.phone, def)
      }
    }
  }

  const rows: OrderExportRow[] = orders.map((o) => {
    // Build item title from order_items if available
    const itemTitle =
      o.order_items && o.order_items.length > 0
        ? o.order_items.map((i) => i.item_title).join(', ')
        : (o.item_title ?? 'Hàng hóa')

    let customer_address = o.customer_address
    let carrier_metadata = { ...(o.carrier_metadata || {}) }

    const abAddr = addressBookMap.get(o.customer_phone)
    if (abAddr) {
      // Create full address string for VNPost
      const parts = []
      if (abAddr.detail) parts.push(abAddr.detail)
      if (abAddr.ward) parts.push(abAddr.ward)
      if (abAddr.district && abAddr.address_type !== 'new') parts.push(abAddr.district)
      if (abAddr.province) parts.push(abAddr.province)
      customer_address = parts.join(', ')
      
      // Override carrier_metadata for SPX
      carrier_metadata = {
        ...carrier_metadata,
        spx_address_type: abAddr.address_type || 'new',
        spx_province: abAddr.province || '',
        spx_district: abAddr.district || '',
        spx_ward: abAddr.ward || '',
        spx_detail: abAddr.detail || '',
      }
    }

    return {
      order_number: o.order_number,
      customer_name: o.customer_name,
      customer_phone: o.customer_phone,
      customer_address: customer_address,
      item_title: itemTitle,
      total_amount: o.total_amount,
      shipping_fee: o.shipping_fee,
      is_free_shipping: o.is_free_shipping,
      payment_method: o.payment_method,
      customer_note: o.customer_note,
      weight_g: o.weight_g,
      length_cm: o.length_cm,
      width_cm: o.width_cm,
      height_cm: o.height_cm,
      delivery_note: o.delivery_note,
      carrier_metadata: carrier_metadata,
      raw_items: o.order_items?.map(i => ({
        title: i.item_title,
        quantity: i.quantity,
        price: i.item_price,
      })),
    }
  })

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Không có đơn hàng nào để xuất' }, { status: 404 })
  }

  let buffer: Uint8Array
  let filename: string
  try {
    if (carrier === 'vnpost') {
      buffer = await generateVNPostExcel(rows)
      filename = `vnpost_orders_${new Date().toISOString().slice(0, 10)}.xlsx`
    } else if (carrier === 'ghn') {
      buffer = await generateGHNExcel(rows)
      filename = `ghn_orders_${new Date().toISOString().slice(0, 10)}.xlsx`
    } else {
      buffer = await generateSPXExcel(rows)
      filename = `spx_orders_${new Date().toISOString().slice(0, 10)}.xlsx`
    }
  } catch (e) {
    console.error('Excel generation error:', e)
    return NextResponse.json({ error: 'Không thể tạo file Excel' }, { status: 500 })
  }

  // Mark orders as exported
  const orderIds = orders.map(o => o.id)
  if (orderIds.length > 0) {
    await db.from('orders').update({ is_exported: true }).in('id', orderIds)
  }

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

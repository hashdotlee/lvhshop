import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateVNPostExcel, generateSPXExcel } from '@/lib/carrier-export'
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
  const carrier = url.searchParams.get('carrier') as 'vnpost' | 'spx' | null
  const idsParam = url.searchParams.get('ids')

  if (!carrier || !['vnpost', 'spx'].includes(carrier)) {
    return NextResponse.json({ error: 'carrier must be "vnpost" or "spx"' }, { status: 400 })
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
    order_items?: Array<{ item_title: string }>
  }>

  const rows: OrderExportRow[] = orders.map((o) => {
    // Build item title from order_items if available
    const itemTitle =
      o.order_items && o.order_items.length > 0
        ? o.order_items.map((i) => i.item_title).join(', ')
        : (o.item_title ?? 'Hàng hóa')

    return {
      order_number: o.order_number,
      customer_name: o.customer_name,
      customer_phone: o.customer_phone,
      customer_address: o.customer_address,
      item_title: itemTitle,
      total_amount: o.total_amount,
      shipping_fee: o.shipping_fee,
      is_free_shipping: o.is_free_shipping,
      payment_method: o.payment_method,
      customer_note: o.customer_note,
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
    } else {
      buffer = await generateSPXExcel(rows)
      filename = `spx_orders_${new Date().toISOString().slice(0, 10)}.xlsx`
    }
  } catch (e) {
    console.error('Excel generation error:', e)
    return NextResponse.json({ error: 'Không thể tạo file Excel' }, { status: 500 })
  }

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

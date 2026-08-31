/**
 * lib/carrier-export.ts
 * Shipping fee calculation and Excel batch order creation for VNPost & SPX.
 */
import ExcelJS from 'exceljs'
import path from 'path'

// ─── Constants ─────────────────────────────────────────────────────────────

export const CARRIERS = {
  vnpost: { label: 'VNPost', key: 'vnpost' },
  spx: { label: 'Shopee Express', key: 'spx' },
} as const

export type Carrier = keyof typeof CARRIERS

/** Bank-transfer shipping discount thresholds */
export const SHIPPING_DISCOUNTS = [
  { minTotal: 500_000, discount: 50_000 },
  { minTotal: 200_000, discount: 20_000 },
]

// ─── Shipping fee calculation ────────────────────────────────────────────────

export interface ShippingFeeInput {
  /** Base shipping fee manually set by admin (what the customer sees before any discount) */
  shipping_fee: number | null
  /** If true, customer pays 0 shipping regardless of other settings */
  is_free_shipping: boolean | null
  /** Payment method */
  payment_method: 'cod' | 'bank_transfer'
  /** Total item amount of the order */
  total_amount: number | null
}

/**
 * Compute the FINAL shipping fee that the customer will actually pay.
 * - Free shipping: 0
 * - Bank transfer discount applies on the base fee
 */
export function calcCustomerShippingFee(input: ShippingFeeInput): number {
  if (input.is_free_shipping) return 0
  const base = input.shipping_fee ?? 0
  if (base === 0) return 0

  if (input.payment_method === 'bank_transfer') {
    const total = input.total_amount ?? 0
    for (const { minTotal, discount } of SHIPPING_DISCOUNTS) {
      if (total > minTotal) {
        return Math.max(0, base - discount)
      }
    }
  }

  return base
}

/**
 * Compute the COD amount to declare to the carrier.
 * - COD payment: collect items total + customer shipping fee
 * - Bank transfer: COD = 0 (already paid, just ship)
 * - Carrier shipping fee on the excel file is always 0.
 */
export function calcCarrierCOD(input: ShippingFeeInput & { total_amount: number | null }): number {
  if (input.payment_method === 'bank_transfer') return 0
  const customerShipping = calcCustomerShippingFee(input)
  return (input.total_amount ?? 0) + customerShipping
}

// ─── Excel Export ─────────────────────────────────────────────────────────────

export interface OrderExportRow {
  order_number: string
  customer_name: string
  customer_phone: string
  customer_address: string
  item_title: string
  total_amount: number | null
  shipping_fee: number | null
  is_free_shipping: boolean | null
  payment_method: 'cod' | 'bank_transfer'
  customer_note?: string | null
  weight_g?: number | null
  length_cm?: number | null
  width_cm?: number | null
  height_cm?: number | null
  delivery_note?: string | null
  carrier_metadata?: any
  raw_items?: Array<{ title: string; quantity: number; price: number | null }>
}

/** Return text of richText cell or plain string */
function cellText(val: ExcelJS.CellValue): string {
  if (!val) return ''
  if (typeof val === 'string') return val
  if (typeof val === 'number') return String(val)
  if (typeof val === 'object' && 'richText' in (val as object)) {
    return ((val as ExcelJS.CellRichTextValue).richText ?? []).map((r) => r.text).join('')
  }
  return ''
}

/**
 * Generates a VNPost batch-creation Excel file based on Mẫu_TN1.xlsx.
 *
 * Required columns (1-indexed as per inspection):
 *   1: STT
 *   2: Tên người nhận (*)
 *   3: Số điện thoại người nhận (*)
 *   4: Địa chỉ nhận chi tiết (*)
 *   6: Mã đơn hàng
 *   7: Danh sách hàng hóa (*)
 *   8: Tổng khối lượng (gram) (*)  → default 200
 *  13: Loại hàng (*) → LHH01
 *  14: Dịch vụ chuyển phát (*) → CTN009
 *  16: Số tiền thu hộ (VNĐ) → COD amount (0 if bank transfer)
 *  26: Hình thức gửi hàng (*) → 1 - Thu gom tận nơi
 */
export async function generateVNPostExcel(orders: OrderExportRow[]): Promise<Uint8Array> {
  const templatePath = path.join(process.cwd(), 'docs', 'mau_tn1.xlsx')
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(templatePath)

  const ws = wb.getWorksheet('DS Đơn hàng')
  if (!ws) throw new Error('Worksheet "DS Đơn hàng" not found in template')

  // Copy header row style from row 2 (sample) for data rows — row 1 is the header
  const headerRowNum = 1
  const sampleRowNum = 2

  // Clear the sample row before writing
  ws.spliceRows(sampleRowNum, 1) // remove sample row

  orders.forEach((order, idx) => {
    const rowNum = sampleRowNum + idx
    const cod = calcCarrierCOD({
      shipping_fee: order.shipping_fee,
      is_free_shipping: order.is_free_shipping,
      payment_method: order.payment_method,
      total_amount: order.total_amount,
    })

    const gtgt: string[] = []
    if (cod > 0) gtgt.push('GTG021') // Phát hàng thu tiền COD

    let vnpostItemsStr = order.item_title
    if (order.raw_items && order.raw_items.length > 0) {
      vnpostItemsStr = order.raw_items.map(it => {
        const q = it.quantity || 1
        const w = 200 // Khối lượng mặc định 200gr mỗi món
        const p = it.price || 0
        return `${it.title}^${q}^${w}^${p}`
      }).join('|')
    }

    const row = ws.getRow(rowNum)
    row.getCell(1).value = idx + 1           // STT
    row.getCell(2).value = order.customer_name
    row.getCell(3).value = order.customer_phone
    row.getCell(4).value = order.customer_address
    row.getCell(6).value = order.order_number
    row.getCell(7).value = vnpostItemsStr    // Danh sách hàng hóa
    row.getCell(8).value = 200               // Default weight (gram)
    row.getCell(13).value = 'LHH02'          // Loại hàng: Hàng thông thường
    row.getCell(14).value = 'CTN009 - Thương mại điện tử đồng giá: Tiêu chuẩn TMĐT ĐG'
    row.getCell(15).value = gtgt.join(';')   // Dịch vụ cộng thêm (GTGT)
    row.getCell(16).value = cod > 0 ? cod : '' // COD (0 = không thu hộ)
    row.getCell(17).value = ''               // Không dùng cột Số tiền khai giá
    row.getCell(26).value = '1 - Thu gom tận nơi'
    row.getCell(27).value = order.customer_note || ''
    row.commit()
  })

  // suppress unused variable warning
  void headerRowNum
  void cellText

  const buf = await wb.xlsx.writeBuffer()
  return new Uint8Array(buf)
}

/**
 * Generates an SPX batch-creation Excel file based on collect_fee template.
 *
 * Required columns (1-indexed as per inspection):
 *   1: *Mã đơn hàng
 *   2: *Tên người nhận
 *   3: *Số điện thoại
 *   4: *Tỉnh/Thành Phố
 *   5: *Quận/Huyện
 *   6: *Xã/Phường
 *   7: *Địa chỉ chi tiết
 *  10: *Tên sản phẩm
 *  11: Số lượng (khi chọn giao hàng 1 phần)
 *  12: Giá tiền (khi chọn giao hàng 1 phần)
 *  13: *Tổng cân nặng bưu gửi (KG) → default 0.5
 *  18: *Giá trị đơn hàng
 *  19: *Giao hàng một phần (Y/N) → N
 *  20: *Cho phép thử hàng (Y/N) → N
 *  21: *Cho xem hàng, không cho thử (Y/N) → Y
 *  24: *Thu COD (Y/N) → Y if COD, N if bank transfer
 *  25: Số tiền COD
 *  27: *Hình thức thanh Toán → Người gửi trả (carrier fee = 0 charged by sender)
 *  28: Lưu ý giao hàng (note)
 *
 * Address parsing: "Số nhà, Đường, Phường, Quận, Tỉnh" — we store the whole
 * address in customer_address, so we put it all in col 7 (địa chỉ chi tiết)
 * and leave col 4 (Tỉnh) blank. SPX accepts full-text address fallback.
 */
export async function generateSPXExcel(orders: OrderExportRow[]): Promise<Uint8Array> {
  const templatePath = path.join(
    process.cwd(),
    'docs',
    'collect_fee_mass_order_creation_template_vn_2level_addr.xlsx'
  )
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(templatePath)

  // Determine sheet name based on address type
  // Default to "Tạo đơn (địa chỉ cũ)", but if 'new' try "Tạo đơn (địa chỉ mới)"
  let sheetName = 'Tạo đơn (địa chỉ cũ)'
  const addressType = orders.length > 0 && orders[0].carrier_metadata?.spx_address_type === 'new' ? 'new' : 'old'
  if (addressType === 'new') {
    const hasNewSheet = wb.getWorksheet('Tạo đơn (địa chỉ mới)')
    if (hasNewSheet) sheetName = 'Tạo đơn (địa chỉ mới)'
  }

  const ws = wb.getWorksheet(sheetName)
  if (!ws) throw new Error(`Worksheet "${sheetName}" not found in SPX template`)

  // Data starts at row 2 (row 1 is headers)
  const dataStartRow = 2

  orders.forEach((order, idx) => {
    const rowNum = dataStartRow + idx
    const meta = order.carrier_metadata || {}

    // For SPX, shipping fee is calculated and collected directly by SPX ("Người nhận trả").
    // Therefore, we do NOT include our shipping_fee into the COD. The COD is exactly the item subtotal.
    let cod = 0
    if (order.payment_method === 'cod') {
      cod = order.total_amount ?? 0
    }
    const hasCOD = cod > 0

    const row = ws.getRow(rowNum)
    row.getCell(1).value = order.order_number    // Mã đơn hàng
    row.getCell(2).value = order.customer_name   // Tên người nhận
    row.getCell(3).value = order.customer_phone  // Số điện thoại
    
    // Address mapping & columns depend on address type
    if (addressType === 'new') {
      if (meta.spx_province) {
        row.getCell(4).value = meta.spx_province
        row.getCell(5).value = meta.spx_ward || ''
        row.getCell(6).value = meta.spx_detail || ''
      } else {
        row.getCell(4).value = ''
        row.getCell(5).value = ''
        row.getCell(6).value = order.customer_address
      }
      row.getCell(7).value = order.delivery_note || order.customer_note || '' // Lưu ý về địa chỉ
      row.getCell(9).value = order.item_title
      row.getCell(10).value = 1
      row.getCell(11).value = order.total_amount ?? 0
      row.getCell(12).value = order.weight_g ? order.weight_g / 1000 : 0.5
      row.getCell(13).value = order.length_cm || ''
      row.getCell(14).value = order.width_cm || ''
      row.getCell(15).value = order.height_cm || ''
      row.getCell(17).value = order.total_amount ?? 0
      row.getCell(18).value = meta.spx_service_partial ? 'Y' : 'N'
      row.getCell(19).value = 'N'
      row.getCell(20).value = meta.spx_service_view ? 'Y' : 'N'
      row.getCell(23).value = hasCOD ? 'Y' : 'N'
      row.getCell(24).value = hasCOD ? cod : ''
      row.getCell(26).value = 'Người nhận trả'
      row.getCell(27).value = order.delivery_note || order.customer_note || ''
    } else {
      if (meta.spx_province) {
        row.getCell(4).value = meta.spx_province
        row.getCell(5).value = meta.spx_district || ''
        row.getCell(6).value = meta.spx_ward || ''
        row.getCell(7).value = meta.spx_detail || ''
      } else {
        row.getCell(4).value = ''
        row.getCell(5).value = ''
        row.getCell(6).value = ''
        row.getCell(7).value = order.customer_address
      }
      row.getCell(8).value = order.delivery_note || order.customer_note || ''
      row.getCell(10).value = order.item_title
      row.getCell(11).value = 1
      row.getCell(12).value = order.total_amount ?? 0
      row.getCell(13).value = order.weight_g ? order.weight_g / 1000 : 0.5
      row.getCell(14).value = order.length_cm || ''
      row.getCell(15).value = order.width_cm || ''
      row.getCell(16).value = order.height_cm || ''
      row.getCell(18).value = order.total_amount ?? 0
      row.getCell(19).value = meta.spx_service_partial ? 'Y' : 'N'
      row.getCell(20).value = 'N'
      row.getCell(21).value = meta.spx_service_view ? 'Y' : 'N'
      row.getCell(24).value = hasCOD ? 'Y' : 'N'
      row.getCell(25).value = hasCOD ? cod : ''
      row.getCell(27).value = 'Người nhận trả'
      row.getCell(28).value = order.delivery_note || order.customer_note || ''
    }
    
    row.commit()
  })

  const buf = await wb.xlsx.writeBuffer()
  return new Uint8Array(buf)
}

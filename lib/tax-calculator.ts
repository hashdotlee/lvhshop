// ─── Vietnam Tax Regulations Engine (Thông tư 40/2021/TT-BTC) ─────────────────

export interface TaxCategoryConfig {
  key: string
  label: string
  vatRate: number // GTGT (e.g. 0.01 = 1%)
  pitRate: number // TNCN (e.g. 0.005 = 0.5%)
}

export const TAX_CATEGORIES: Record<string, TaxCategoryConfig> = {
  retail: {
    key: 'retail',
    label: 'Bán lẻ, phân phối hàng hóa (TMĐT / Online Shop)',
    vatRate: 0.01,  // 1% GTGT
    pitRate: 0.005, // 0.5% TNCN
  },
  services: {
    key: 'services',
    label: 'Dịch vụ, xây dựng không bao thầu NVL',
    vatRate: 0.05,  // 5% GTGT
    pitRate: 0.02,  // 2% TNCN
  },
  manufacturing: {
    key: 'manufacturing',
    label: 'Sản xuất, vận tải, dịch vụ có gắn với hàng hóa',
    vatRate: 0.03,  // 3% GTGT
    pitRate: 0.015, // 1.5% TNCN
  },
  other: {
    key: 'other',
    label: 'Hoạt động kinh doanh khác',
    vatRate: 0.02,  // 2% GTGT
    pitRate: 0.01,  // 1% TNCN
  },
}

// Ngưỡng doanh thu không phải nộp thuế GTGT & TNCN trong năm (100.000.000 VNĐ)
export const TAX_EXEMPTION_THRESHOLD_ANNUAL = 100_000_000

export interface ExpenseEntry {
  id: string | number
  category: 'packaging' | 'shipping' | 'marketing' | 'utilities' | 'other'
  description: string
  amount: number
  date: string
  created_at?: string
}

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseEntry['category'], string> = {
  packaging: 'Đóng gói & Bao bì',
  shipping: 'Vận chuyển & Phí sàn',
  marketing: 'Quảng cáo & Marketing',
  utilities: 'Điện, Nước & Thuê mặt bằng',
  other: 'Chi phí khác',
}

export type PeriodType = 'today' | 'this_month' | 'last_month' | 'q1' | 'q2' | 'q3' | 'q4' | 'this_year' | 'custom'

export interface TaxCalculationResult {
  periodLabel: string
  totalOrders: number
  deliveredOrdersCount: number
  grossRevenue: number         // Doanh thu phát sinh (tất cả đơn thành công)
  taxableRevenue: number       // Doanh thu tính thuế
  cogs: number                 // Giá vốn hàng bán (Cost of Goods Sold)
  grossProfit: number          // Lợi nhuận gộp (Doanh thu - Giá vốn)
  operatingExpenses: number    // Chi phí vận hành
  netProfitBeforeTax: number   // Lợi nhuận trước thuế
  vatRate: number              // Tỷ lệ Thuế GTGT (ví dụ 0.01)
  pitRate: number              // Tỷ lệ Thuế TNCN (ví dụ 0.005)
  vatAmount: number            // Tiền Thuế GTGT phải nộp
  pitAmount: number            // Tiền Thuế TNCN phải nộp
  totalTax: number             // Tổng nghĩa vụ thuế (GTGT + TNCN)
  netProfitAfterTax: number    // Lợi nhuận ròng thực tế
  annualRevenue: number        // Doanh thu lũy kế cả năm (để kiểm tra ngưỡng)
  isExempt: boolean            // Thuộc diện miễn thuế do doanh thu năm <= 100tr
  thresholdProgressPct: number // % tiến độ đạt ngưỡng 100tr năm
}

export function getPeriodDateRange(period: PeriodType, customStart?: string, customEnd?: string): { start: Date; end: Date; label: string } {
  const now = new Date()
  const year = now.getFullYear()

  if (period === 'today') {
    const start = new Date(year, now.getMonth(), now.getDate(), 0, 0, 0, 0)
    const end = new Date(year, now.getMonth(), now.getDate(), 23, 59, 59, 999)
    return { start, end, label: `Hôm nay (${start.toLocaleDateString('vi-VN')})` }
  }

  if (period === 'this_month') {
    const start = new Date(year, now.getMonth(), 1, 0, 0, 0, 0)
    const end = new Date(year, now.getMonth() + 1, 0, 23, 59, 59, 999)
    return { start, end, label: `Tháng ${now.getMonth() + 1}/${year}` }
  }

  if (period === 'last_month') {
    const prevMonthDate = new Date(year, now.getMonth() - 1, 1)
    const m = prevMonthDate.getMonth()
    const y = prevMonthDate.getFullYear()
    const start = new Date(y, m, 1, 0, 0, 0, 0)
    const end = new Date(y, m + 1, 0, 23, 59, 59, 999)
    return { start, end, label: `Tháng ${m + 1}/${y}` }
  }

  if (period === 'q1') {
    const start = new Date(year, 0, 1, 0, 0, 0, 0)
    const end = new Date(year, 2, 31, 23, 59, 59, 999)
    return { start, end, label: `Quý I/${year}` }
  }

  if (period === 'q2') {
    const start = new Date(year, 3, 1, 0, 0, 0, 0)
    const end = new Date(year, 5, 30, 23, 59, 59, 999)
    return { start, end, label: `Quý II/${year}` }
  }

  if (period === 'q3') {
    const start = new Date(year, 6, 1, 0, 0, 0, 0)
    const end = new Date(year, 8, 30, 23, 59, 59, 999)
    return { start, end, label: `Quý III/${year}` }
  }

  if (period === 'q4') {
    const start = new Date(year, 9, 1, 0, 0, 0, 0)
    const end = new Date(year, 11, 31, 23, 59, 59, 999)
    return { start, end, label: `Quý IV/${year}` }
  }

  if (period === 'this_year') {
    const start = new Date(year, 0, 1, 0, 0, 0, 0)
    const end = new Date(year, 11, 31, 23, 59, 59, 999)
    return { start, end, label: `Cả năm ${year}` }
  }

  // Custom
  const start = customStart ? new Date(customStart) : new Date(year, 0, 1)
  const end = customEnd ? new Date(customEnd + 'T23:59:59') : new Date()
  return {
    start,
    end,
    label: `Từ ${start.toLocaleDateString('vi-VN')} đến ${end.toLocaleDateString('vi-VN')}`,
  }
}

export function computeTaxReport(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  allOrders: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  allItems: any[],
  expenses: ExpenseEntry[],
  period: PeriodType,
  customStart?: string,
  customEnd?: string,
  categoryKey: string = 'retail',
  customVatRate?: number,
  customPitRate?: number
): TaxCalculationResult {
  const { start, end, label } = getPeriodDateRange(period, customStart, customEnd)

  // Selected Category rates
  const cat = TAX_CATEGORIES[categoryKey] || TAX_CATEGORIES.retail
  const vatRate = customVatRate !== undefined ? customVatRate : cat.vatRate
  const pitRate = customPitRate !== undefined ? customPitRate : cat.pitRate

  // Calculate annual revenue to check threshold rule (100M VND / year)
  const currentYear = start.getFullYear()
  const annualStart = new Date(currentYear, 0, 1, 0, 0, 0, 0)
  const annualEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999)

  let annualRevenue = 0
  for (const o of allOrders) {
    if (o.order_status === 'cancelled') continue
    const dt = new Date(o.created_at)
    if (dt >= annualStart && dt <= annualEnd) {
      const orderVal = o.total_amount ?? o.item_price ?? 0
      annualRevenue += orderVal
    }
  }

  // Filter orders in current selected period
  const periodOrders = allOrders.filter(o => {
    const dt = new Date(o.created_at)
    return dt >= start && dt <= end
  })

  // Filter items mapping for COGS
  const itemMap = new Map<number, number>()
  for (const item of allItems) {
    if (item.id && item.cost_price) {
      itemMap.set(item.id, item.cost_price)
    }
  }

  let totalOrders = periodOrders.length
  let deliveredOrdersCount = 0
  let grossRevenue = 0
  let cogs = 0

  for (const o of periodOrders) {
    if (o.order_status === 'cancelled') continue
    deliveredOrdersCount++
    const orderVal = o.total_amount ?? o.item_price ?? 0
    grossRevenue += orderVal

    // Calculate COGS
    if (o.order_items && Array.isArray(o.order_items) && o.order_items.length > 0) {
      for (const oi of o.order_items) {
        if (oi.item_id && itemMap.has(oi.item_id)) {
          cogs += itemMap.get(oi.item_id)! * (oi.quantity || 1)
        }
      }
    } else if (o.item_id && itemMap.has(o.item_id)) {
      cogs += itemMap.get(o.item_id)!
    }
  }

  // Filter operating expenses in period
  let operatingExpenses = 0
  for (const exp of expenses) {
    const dt = new Date(exp.date || exp.created_at || '')
    if (dt >= start && dt <= end) {
      operatingExpenses += exp.amount || 0
    }
  }

  const isExempt = annualRevenue <= TAX_EXEMPTION_THRESHOLD_ANNUAL
  const taxableRevenue = isExempt ? 0 : grossRevenue

  const vatAmount = Math.round(taxableRevenue * vatRate)
  const pitAmount = Math.round(taxableRevenue * pitRate)
  const totalTax = vatAmount + pitAmount

  const grossProfit = grossRevenue - cogs
  const netProfitBeforeTax = grossProfit - operatingExpenses
  const netProfitAfterTax = netProfitBeforeTax - totalTax

  const thresholdProgressPct = Math.min(100, Math.round((annualRevenue / TAX_EXEMPTION_THRESHOLD_ANNUAL) * 100))

  return {
    periodLabel: label,
    totalOrders,
    deliveredOrdersCount,
    grossRevenue,
    taxableRevenue,
    cogs,
    grossProfit,
    operatingExpenses,
    netProfitBeforeTax,
    vatRate,
    pitRate,
    vatAmount,
    pitAmount,
    totalTax,
    netProfitAfterTax,
    annualRevenue,
    isExempt,
    thresholdProgressPct,
  }
}

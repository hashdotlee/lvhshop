'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Order, Item } from '@/lib/supabase'
import {
  computeTaxReport,
  EXPENSE_CATEGORY_LABELS,
  TAX_CATEGORIES,
  TAX_EXEMPTION_THRESHOLD_ANNUAL,
  type ExpenseEntry,
  type PeriodType,
  type TaxCalculationResult,
} from '@/lib/tax-calculator'

const ADMIN_HASH = process.env.NEXT_PUBLIC_ADMIN_HASH ?? 'admin-lvh2025'

function fmtVND(v: number | null | undefined) {
  if (v === null || v === undefined) return '0 ₫'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v)
}

function fmtDate(iso: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function AccountingClient() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [authInput, setAuthInput] = useState('')
  const [authError, setAuthError] = useState(false)
  const adminKey = useRef('')

  const [orders, setOrders] = useState<Order[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [period, setPeriod] = useState<PeriodType>('this_month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [categoryKey, setCategoryKey] = useState('retail')
  const [overrideVat, setOverrideVat] = useState<string>('')
  const [overridePit, setOverridePit] = useState<string>('')

  // View tabs
  const [tab, setTab] = useState<'summary' | 'orders' | 'expenses' | 'declaration'>('summary')

  // Expense form
  const [expCat, setExpCat] = useState<ExpenseEntry['category']>('packaging')
  const [expDesc, setExpDesc] = useState('')
  const [expAmount, setExpAmount] = useState('')
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0])
  const [expAdding, setExpAdding] = useState(false)

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const headers = { 'x-admin-key': adminKey.current }
      const [resOrders, resItems, resExp] = await Promise.all([
        fetch('/api/orders', { headers }),
        fetch('/api/items'),
        fetch('/api/accounting/expenses', { headers }),
      ])

      if (resOrders.ok) {
        const d = await resOrders.json()
        setOrders(Array.isArray(d) ? d : [])
      }
      if (resItems.ok) {
        const d = await resItems.json()
        setItems(Array.isArray(d) ? d : [])
      }
      if (resExp.ok) {
        const d = await resExp.json()
        setExpenses(Array.isArray(d) ? d : [])
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.location.hash === `#${ADMIN_HASH}`) {
      setIsAdmin(false)
    } else if (sessionStorage.getItem('cq_admin')) {
      adminKey.current = sessionStorage.getItem('cq_admin_key') ?? ''
      setIsAdmin(true)
      fetchData()
    } else {
      setLoading(false)
    }
  }, [fetchData])

  function tryLogin() {
    if (!authInput) return
    fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: authInput }),
    }).then(r => {
      if (r.status === 401) {
        setAuthError(true)
        setTimeout(() => setAuthError(false), 3000)
      } else {
        adminKey.current = authInput
        sessionStorage.setItem('cq_admin', '1')
        sessionStorage.setItem('cq_admin_key', authInput)
        setIsAdmin(true)
        fetchData()
      }
    })
  }

  function logout() {
    sessionStorage.removeItem('cq_admin')
    sessionStorage.removeItem('cq_admin_key')
    adminKey.current = ''
    setIsAdmin(false)
  }

  // Expense handlers
  async function addExpense() {
    if (!expDesc.trim() || !expAmount) return
    setExpAdding(true)
    try {
      const res = await fetch('/api/accounting/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey.current },
        body: JSON.stringify({
          category: expCat,
          description: expDesc,
          amount: Number(expAmount),
          date: expDate,
        }),
      })
      if (res.ok) {
        const newExp = await res.json()
        setExpenses(prev => [newExp, ...prev])
        setExpDesc('')
        setExpAmount('')
      }
    } finally {
      setExpAdding(false)
    }
  }

  async function deleteExpense(id: string | number) {
    if (!confirm('Xóa khoản chi phí này?')) return
    await fetch('/api/accounting/expenses', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey.current },
      body: JSON.stringify({ id }),
    })
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  // Tax computation
  const customVat = overrideVat !== '' ? Number(overrideVat) / 100 : undefined
  const customPit = overridePit !== '' ? Number(overridePit) / 100 : undefined

  const report: TaxCalculationResult = computeTaxReport(
    orders,
    items,
    expenses,
    period,
    customStart,
    customEnd,
    categoryKey,
    customVat,
    customPit
  )

  // Export CSV
  function exportCSV() {
    const periodLabelClean = report.periodLabel.replace(/[/:\s]/g, '_')
    const filename = `Bao_Cao_Thue_LVH_${periodLabelClean}.csv`

    let csvContent = '\uFEFF' // UTF-8 BOM for Excel
    csvContent += 'BÁO CÁO DOANH THU VÀ THUẾ (THÔNG TƯ 40/2021/TT-BTC)\n'
    csvContent += `Thời gian,${report.periodLabel}\n`
    csvContent += `Tổng số đơn hàng,${report.totalOrders}\n`
    csvContent += `Số đơn thành công,${report.deliveredOrdersCount}\n`
    csvContent += `Doanh thu phát sinh (VNĐ),${report.grossRevenue}\n`
    csvContent += `Doanh thu tính thuế (VNĐ),${report.taxableRevenue}\n`
    csvContent += `Giá vốn hàng bán (VNĐ),${report.cogs}\n`
    csvContent += `Lợi nhuận gộp (VNĐ),${report.grossProfit}\n`
    csvContent += `Chi phí vận hành (VNĐ),${report.operatingExpenses}\n`
    csvContent += `Thuế GTGT (${(report.vatRate * 100).toFixed(1)}%) (VNĐ),${report.vatAmount}\n`
    csvContent += `Thuế TNCN (${(report.pitRate * 100).toFixed(1)}%) (VNĐ),${report.pitAmount}\n`
    csvContent += `Tổng thuế phải nộp (VNĐ),${report.totalTax}\n`
    csvContent += `Lợi nhuận ròng sau thuế (VNĐ),${report.netProfitAfterTax}\n\n`

    csvContent += 'DANH SÁCH ĐƠN HÀNG TRONG KỲ\n'
    csvContent += 'Mã đơn,Ngày tạo,Khách hàng,SĐT,Trạng thái,Phương thức,Doanh thu\n'
    for (const o of orders) {
      const val = o.total_amount ?? o.item_price ?? 0
      csvContent += `"${o.order_number}","${fmtDate(o.created_at)}","${o.customer_name || ''}","${o.customer_phone || ''}","${o.order_status}","${o.payment_method}",${val}\n`
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
  }

  if (!isAdmin) {
    return (
      <>
        <style>{css}</style>
        <div className="acc-auth-wrap">
          <div className="acc-auth-box">
            <div className="acc-auth-logo">leviethoang<span>.shop / Kế toán</span></div>
            <div className="acc-auth-title">Đăng nhập Quản trị Kế toán & Thuế</div>
            <label className="acc-label">Mật khẩu quản trị</label>
            <input
              className="acc-inp"
              type="password"
              placeholder="Nhập mật khẩu..."
              value={authInput}
              onChange={e => setAuthInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && tryLogin()}
              autoFocus
            />
            <button className="acc-btn-dark w-full" onClick={tryLogin}>
              Xác thực và Vào hệ thống →
            </button>
            {authError && <div className="acc-auth-err">Mật khẩu không đúng</div>}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <style>{css}</style>

      <div className="acc-page">
        {/* Top Header */}
        <header className="acc-header no-print">
          <div className="acc-header-left">
            <a href="/" className="acc-logo">
              leviethoang<span>.shop</span>
            </a>
            <span className="acc-header-tag">📊 Kế toán & Thuế GTGT / TNCN</span>
          </div>
          <div className="acc-header-right">
            <a href="/" className="acc-nav-link">Tin đăng</a>
            <a href="/inventory" className="acc-nav-link">📦 Kho hàng</a>
            <a href="/my-orders" className="acc-nav-link">🛍️ Đơn hàng</a>
            <button className="acc-logout-btn" onClick={logout}>Đăng xuất</button>
          </div>
        </header>

        <main className="acc-main">
          {/* Controls Bar */}
          <div className="acc-card acc-controls-bar no-print">
            <div className="acc-control-group">
              <label className="acc-control-label">Kỳ kê khai / Báo cáo:</label>
              <div className="acc-period-buttons">
                {([
                  { id: 'today', label: 'Hôm nay' },
                  { id: 'this_month', label: 'Tháng này' },
                  { id: 'last_month', label: 'Tháng trước' },
                  { id: 'q1', label: 'Quý I' },
                  { id: 'q2', label: 'Quý II' },
                  { id: 'q3', label: 'Quý III' },
                  { id: 'q4', label: 'Quý IV' },
                  { id: 'this_year', label: 'Cả năm' },
                  { id: 'custom', label: 'Tùy chỉnh' },
                ] as { id: PeriodType; label: string }[]).map(p => (
                  <button
                    key={p.id}
                    className={`acc-period-btn${period === p.id ? ' active' : ''}`}
                    onClick={() => setPeriod(p.id)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {period === 'custom' && (
              <div className="acc-custom-dates">
                <input
                  type="date"
                  className="acc-inp-sm"
                  value={customStart}
                  onChange={e => setCustomStart(e.target.value)}
                />
                <span>đến</span>
                <input
                  type="date"
                  className="acc-inp-sm"
                  value={customEnd}
                  onChange={e => setCustomEnd(e.target.value)}
                />
              </div>
            )}

            <div className="acc-control-row" style={{ marginTop: 14 }}>
              <div className="acc-field" style={{ flex: 1 }}>
                <label className="acc-control-label">Ngành nghề kinh doanh (Thông tư 40/2021/TT-BTC):</label>
                <select
                  className="acc-select"
                  value={categoryKey}
                  onChange={e => setCategoryKey(e.target.value)}
                >
                  {Object.values(TAX_CATEGORIES).map(c => (
                    <option key={c.key} value={c.key}>
                      {c.label} — (GTGT {c.vatRate * 100}% + TNCN {c.pitRate * 100}%)
                    </option>
                  ))}
                </select>
              </div>

              <div className="acc-field" style={{ width: 140 }}>
                <label className="acc-control-label">Tỷ lệ GTGT (%)</label>
                <input
                  className="acc-inp-sm"
                  placeholder={(TAX_CATEGORIES[categoryKey]?.vatRate * 100).toString()}
                  value={overrideVat}
                  onChange={e => setOverrideVat(e.target.value)}
                />
              </div>

              <div className="acc-field" style={{ width: 140 }}>
                <label className="acc-control-label">Tỷ lệ TNCN (%)</label>
                <input
                  className="acc-inp-sm"
                  placeholder={(TAX_CATEGORIES[categoryKey]?.pitRate * 100).toString()}
                  value={overridePit}
                  onChange={e => setOverridePit(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <button className="acc-btn-secondary" onClick={fetchData} title="Tải lại dữ liệu">
                  ↻ Tải lại
                </button>
                <button className="acc-btn-primary" onClick={exportCSV}>
                  📥 Xuất CSV / Excel
                </button>
              </div>
            </div>
          </div>

          {/* Tax Method Explanation Note */}
          <div className="acc-card acc-notice-banner no-print" style={{ background: '#fffbeb', borderColor: '#fde68a' }}>
            <div style={{ fontWeight: 700, color: '#92400e', marginBottom: 4 }}>
              💡 Phương pháp tính thuế trực tiếp trên Doanh thu (Khoản 2 Điều 4 & Phụ lục I Thông tư 40/2021/TT-BTC):
            </div>
            <div style={{ fontSize: 13, color: '#78350f' }}>
              Do nguồn hàng đầu vào không có đầy đủ hóa đơn chứng từ, tiền thuế không tính trên lợi nhuận mà tính <strong>trực tiếp theo tỷ lệ % cố định trên tổng Doanh thu bán hàng</strong> (GTGT {(report.vatRate * 100).toFixed(1)}% + TNCN {(report.pitRate * 100).toFixed(1)}% đối với bán lẻ TMĐT).
            </div>
          </div>

          {/* Threshold Progress Bar Banner */}
          <div className="acc-card acc-threshold-banner no-print">
            <div className="acc-tb-header">
              <div className="acc-tb-title">
                Ngưỡng miễn thuế năm {new Date().getFullYear()}: <strong>100.000.000 VNĐ</strong>
              </div>
              <div className={`acc-tb-badge${report.isExempt ? ' exempt' : ' taxable'}`}>
                {report.isExempt
                  ? '🛡️ Thuộc diện MIỄN THUẾ GTGT & TNCN (Doanh thu năm ≤ 100tr)'
                  : '⚠️ ĐÃ VƯỢT NGƯỠNG MIỄN THUẾ (Phải nộp thuế GTGT & TNCN)'}
              </div>
            </div>
            <div className="acc-tb-progress-wrap">
              <div className="acc-tb-bar" style={{ width: `${report.thresholdProgressPct}%` }} />
            </div>
            <div className="acc-tb-footer">
              <span>Doanh thu lũy kế năm: <strong>{fmtVND(report.annualRevenue)}</strong></span>
              <span>Tiến độ: <strong>{report.thresholdProgressPct}%</strong></span>
            </div>
          </div>

          {/* 6 Key KPI Cards */}
          <div className="acc-kpi-grid no-print">
            <div className="acc-kpi-card">
              <div className="acc-kpi-icon">📦</div>
              <div className="acc-kpi-body">
                <div className="acc-kpi-label">Doanh thu phát sinh ({report.deliveredOrdersCount} đơn)</div>
                <div className="acc-kpi-val">{fmtVND(report.grossRevenue)}</div>
                <div className="acc-kpi-sub">Kỳ: {report.periodLabel}</div>
              </div>
            </div>

            <div className="acc-kpi-card">
              <div className="acc-kpi-icon">🏷️</div>
              <div className="acc-kpi-body">
                <div className="acc-kpi-label">Giá vốn hàng bán (COGS)</div>
                <div className="acc-kpi-val">{fmtVND(report.cogs)}</div>
                <div className="acc-kpi-sub">Tổng giá trị sản phẩm đã bán</div>
              </div>
            </div>

            <div className="acc-kpi-card">
              <div className="acc-kpi-icon">📈</div>
              <div className="acc-kpi-body">
                <div className="acc-kpi-label">Lợi nhuận gộp</div>
                <div className="acc-kpi-val green">{fmtVND(report.grossProfit)}</div>
                <div className="acc-kpi-sub">
                  Tỷ suất: {report.grossRevenue ? Math.round((report.grossProfit / report.grossRevenue) * 100) : 0}%
                </div>
              </div>
            </div>

            <div className="acc-kpi-card">
              <div className="acc-kpi-icon">💸</div>
              <div className="acc-kpi-body">
                <div className="acc-kpi-label">Chi phí vận hành</div>
                <div className="acc-kpi-val orange">{fmtVND(report.operatingExpenses)}</div>
                <div className="acc-kpi-sub">Bao bì, vận chuyển, marketing...</div>
              </div>
            </div>

            <div className="acc-kpi-card">
              <div className="acc-kpi-icon">🏛️</div>
              <div className="acc-kpi-body">
                <div className="acc-kpi-label">Tổng Thuế (GTGT + TNCN)</div>
                <div className="acc-kpi-val red">{fmtVND(report.totalTax)}</div>
                <div className="acc-kpi-sub">
                  GTGT ({(report.vatRate * 100).toFixed(1)}%): {fmtVND(report.vatAmount)} · TNCN ({(report.pitRate * 100).toFixed(1)}%): {fmtVND(report.pitAmount)}
                </div>
              </div>
            </div>

            <div className="acc-kpi-card highlight">
              <div className="acc-kpi-icon">💰</div>
              <div className="acc-kpi-body">
                <div className="acc-kpi-label">Lợi nhuận ròng thực tế</div>
                <div className="acc-kpi-val primary">{fmtVND(report.netProfitAfterTax)}</div>
                <div className="acc-kpi-sub">Đã trừ giá vốn, chi phí & thuế</div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="acc-tabs-wrap no-print">
            <button
              className={`acc-tab-btn${tab === 'summary' ? ' active' : ''}`}
              onClick={() => setTab('summary')}
            >
              📊 Báo cáo Thuế & Tài chính
            </button>
            <button
              className={`acc-tab-btn${tab === 'orders' ? ' active' : ''}`}
              onClick={() => setTab('orders')}
            >
              📦 Bảng kê Đơn hàng ({report.totalOrders})
            </button>
            <button
              className={`acc-tab-btn${tab === 'expenses' ? ' active' : ''}`}
              onClick={() => setTab('expenses')}
            >
              💸 Sổ Chi phí Vận hành ({expenses.length})
            </button>
            <button
              className={`acc-tab-btn${tab === 'declaration' ? ' active' : ''}`}
              onClick={() => setTab('declaration')}
            >
              📄 Tờ khai Thuế Mẫu 01/CNKD
            </button>
          </div>

          {/* TAB 1: SUMMARY */}
          {tab === 'summary' && (
            <div className="acc-card no-print">
              <div className="acc-section-title">Chi tiết Bảng kê Thuế GTGT & TNCN ({report.periodLabel})</div>

              <table className="acc-table">
                <thead>
                  <tr>
                    <th>Chỉ tiêu nghĩa vụ thuế</th>
                    <th>Căn cứ / Doanh thu</th>
                    <th>Tỷ lệ thuế</th>
                    <th style={{ textAlign: 'right' }}>Số tiền thuế phải nộp</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>1. Doanh thu tính thuế GTGT & TNCN</strong></td>
                    <td><strong>{fmtVND(report.taxableRevenue)}</strong></td>
                    <td>—</td>
                    <td style={{ textAlign: 'right' }}>—</td>
                  </tr>
                  <tr>
                    <td>2. Thuế Giá trị gia tăng (GTGT)</td>
                    <td>{fmtVND(report.taxableRevenue)}</td>
                    <td>{(report.vatRate * 100).toFixed(1)}%</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#dc2626' }}>
                      {fmtVND(report.vatAmount)}
                    </td>
                  </tr>
                  <tr>
                    <td>3. Thuế Thu nhập cá nhân (TNCN)</td>
                    <td>{fmtVND(report.taxableRevenue)}</td>
                    <td>{(report.pitRate * 100).toFixed(1)}%</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#dc2626' }}>
                      {fmtVND(report.pitAmount)}
                    </td>
                  </tr>
                  <tr className="acc-tr-total">
                    <td><strong>TỔNG NGHĨA VỤ THUẾ PHẢI NỘP KỲ NÀY</strong></td>
                    <td><strong>{fmtVND(report.taxableRevenue)}</strong></td>
                    <td><strong>{((report.vatRate + report.pitRate) * 100).toFixed(1)}%</strong></td>
                    <td style={{ textAlign: 'right', fontWeight: 800, fontSize: 16, color: '#dc2626' }}>
                      {fmtVND(report.totalTax)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="acc-section-title" style={{ marginTop: 24 }}>
                Cân đối Doanh thu - Giá vốn - Lợi nhuận
              </div>

              <table className="acc-table">
                <tbody>
                  <tr>
                    <td>Doanh thu phát sinh từ bán hàng</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtVND(report.grossRevenue)}</td>
                  </tr>
                  <tr>
                    <td>(-) Giá vốn hàng bán (COGS)</td>
                    <td style={{ textAlign: 'right', color: '#666' }}>- {fmtVND(report.cogs)}</td>
                  </tr>
                  <tr>
                    <td><strong>(=) Lợi nhuận gộp</strong></td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#2a7a4b' }}>
                      {fmtVND(report.grossProfit)}
                    </td>
                  </tr>
                  <tr>
                    <td>(-) Chi phí vận hành (Bao bì, vận chuyển, ads...)</td>
                    <td style={{ textAlign: 'right', color: '#666' }}>- {fmtVND(report.operatingExpenses)}</td>
                  </tr>
                  <tr>
                    <td>(-) Nghĩa vụ Thuế GTGT + TNCN</td>
                    <td style={{ textAlign: 'right', color: '#dc2626' }}>- {fmtVND(report.totalTax)}</td>
                  </tr>
                  <tr className="acc-tr-total">
                    <td><strong>LỢI NHUẬN RÒNG CUỐI CÙNG</strong></td>
                    <td style={{ textAlign: 'right', fontWeight: 800, fontSize: 16, color: '#1a1916' }}>
                      {fmtVND(report.netProfitAfterTax)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: ORDERS */}
          {tab === 'orders' && (
            <div className="acc-card no-print">
              <div className="acc-section-title">Danh sách đơn hàng tính thuế ({report.periodLabel})</div>
              {loading ? (
                <div className="acc-loading"><div className="acc-spinner" /></div>
              ) : (
                <div className="acc-table-responsive">
                  <table className="acc-table">
                    <thead>
                      <tr>
                        <th>STT</th>
                        <th>Mã đơn</th>
                        <th>Ngày tạo</th>
                        <th>Khách hàng</th>
                        <th>Trạng thái</th>
                        <th>Thanh toán</th>
                        <th style={{ textAlign: 'right' }}>Doanh thu</th>
                        <th style={{ textAlign: 'right' }}>Thuế GTGT (1%)</th>
                        <th style={{ textAlign: 'right' }}>Thuế TNCN (0.5%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o, idx) => {
                        const val = o.total_amount ?? o.item_price ?? 0
                        const vat = report.isExempt ? 0 : Math.round(val * report.vatRate)
                        const pit = report.isExempt ? 0 : Math.round(val * report.pitRate)
                        const isCancelled = o.order_status === 'cancelled'

                        return (
                          <tr key={o.id} style={{ opacity: isCancelled ? 0.5 : 1 }}>
                            <td>{idx + 1}</td>
                            <td className="font-mono"><strong>{o.order_number}</strong></td>
                            <td>{fmtDate(o.created_at)}</td>
                            <td>{o.customer_name}<br /><small>{o.customer_phone}</small></td>
                            <td>
                              <span className={`acc-status-tag ${o.order_status}`}>
                                {o.order_status}
                              </span>
                            </td>
                            <td>{o.payment_method === 'cod' ? 'COD' : 'CK'}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtVND(val)}</td>
                            <td style={{ textAlign: 'right', color: '#666' }}>{fmtVND(vat)}</td>
                            <td style={{ textAlign: 'right', color: '#666' }}>{fmtVND(pit)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EXPENSES */}
          {tab === 'expenses' && (
            <div className="acc-card no-print">
              <div className="acc-section-title">Quản lý Chi phí Vận hành</div>

              <div className="acc-exp-form">
                <div className="acc-field">
                  <label className="acc-label">Hạng mục</label>
                  <select
                    className="acc-select"
                    value={expCat}
                    onChange={e => setExpCat(e.target.value as ExpenseEntry['category'])}
                  >
                    {Object.entries(EXPENSE_CATEGORY_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>{label}</option>
                    ))}
                  </select>
                </div>

                <div className="acc-field" style={{ flex: 2 }}>
                  <label className="acc-label">Nội dung chi phí</label>
                  <input
                    className="acc-inp"
                    placeholder="Ví dụ: Mua hộp carton đóng hàng..."
                    value={expDesc}
                    onChange={e => setExpDesc(e.target.value)}
                  />
                </div>

                <div className="acc-field">
                  <label className="acc-label">Số tiền (VNĐ)</label>
                  <input
                    className="acc-inp"
                    type="number"
                    placeholder="150000"
                    value={expAmount}
                    onChange={e => setExpAmount(e.target.value)}
                  />
                </div>

                <div className="acc-field">
                  <label className="acc-label">Ngày chi</label>
                  <input
                    className="acc-inp"
                    type="date"
                    value={expDate}
                    onChange={e => setExpDate(e.target.value)}
                  />
                </div>

                <button
                  className="acc-btn-primary"
                  style={{ alignSelf: 'flex-end', height: 38 }}
                  onClick={addExpense}
                  disabled={expAdding}
                >
                  + Thêm khoản chi
                </button>
              </div>

              <div style={{ marginTop: 20 }}>
                <table className="acc-table">
                  <thead>
                    <tr>
                      <th>Ngày</th>
                      <th>Hạng mục</th>
                      <th>Nội dung chi</th>
                      <th style={{ textAlign: 'right' }}>Số tiền</th>
                      <th style={{ width: 60 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', color: '#888', padding: 20 }}>
                          Chưa có khoản chi phí nào được ghi nhận.
                        </td>
                      </tr>
                    ) : (
                      expenses.map(e => (
                        <tr key={e.id}>
                          <td>{fmtDate(e.date)}</td>
                          <td>
                            <span className="acc-exp-badge">
                              {EXPENSE_CATEGORY_LABELS[e.category] || e.category}
                            </span>
                          </td>
                          <td>{e.description}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: '#dc2626' }}>
                            {fmtVND(e.amount)}
                          </td>
                          <td>
                            <button className="acc-del-btn" onClick={() => deleteExpense(e.id)}>
                              Xóa
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: TAX DECLARATION FORM 01/CNKD */}
          {tab === 'declaration' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }} className="no-print">
                <button className="acc-btn-primary" onClick={() => window.print()}>
                  🖨️ In Tờ kê khai (Layout A4/A7)
                </button>
              </div>

              <div className="acc-card acc-declaration-paper">
                <div className="acc-dec-header">
                  <div className="acc-dec-top">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                  <div className="acc-dec-sub">Độc lập - Tự do - Hạnh phúc</div>
                  <div className="acc-dec-title">TỜ KHAI THUẾ ĐỐI VỚI HỘ KINH DOANH, CÁ NHÂN KINH DOANH</div>
                  <div className="acc-dec-norm">(Ban hành kèm theo Thông tư số 40/2021/TT-BTC ngày 01/6/2021 của Bộ trưởng Bộ Tài chính)</div>
                  <div className="acc-dec-form-no">Mẫu số: 01/CNKD</div>
                </div>

                <div className="acc-dec-section">
                  <div className="acc-dec-sec-title">[01] Kỳ tính thuế: <strong>{report.periodLabel}</strong></div>
                  <div className="acc-dec-grid">
                    <div>[02] Tên hộ kinh doanh / cá nhân: <strong>leviethoang.shop</strong></div>
                    <div>[03] Mã số thuế (MST): <strong>8839201948</strong></div>
                    <div>[04] Địa chỉ kinh doanh: <strong>Hà Nội, Việt Nam</strong></div>
                    <div>[05] Ngành nghề kinh doanh: <strong>{TAX_CATEGORIES[categoryKey]?.label}</strong></div>
                  </div>
                </div>

                <div className="acc-dec-section">
                  <div className="acc-dec-sec-title">BẢNG TÍNH THUẾ GTGT VÀ THUẾ TNCN TRONG KỲ</div>
                  <table className="acc-dec-table">
                    <thead>
                      <tr>
                        <th>STT</th>
                        <th>Chỉ tiêu tính thuế</th>
                        <th>Doanh thu tính thuế (VNĐ)</th>
                        <th>Tỷ lệ thuế</th>
                        <th>Số tiền thuế (VNĐ)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>1</td>
                        <td>Thuế Giá trị gia tăng (GTGT)</td>
                        <td>{fmtVND(report.taxableRevenue)}</td>
                        <td>{(report.vatRate * 100).toFixed(1)}%</td>
                        <td><strong>{fmtVND(report.vatAmount)}</strong></td>
                      </tr>
                      <tr>
                        <td>2</td>
                        <td>Thuế Thu nhập cá nhân (TNCN)</td>
                        <td>{fmtVND(report.taxableRevenue)}</td>
                        <td>{(report.pitRate * 100).toFixed(1)}%</td>
                        <td><strong>{fmtVND(report.pitAmount)}</strong></td>
                      </tr>
                      <tr className="acc-dec-total-row">
                        <td colSpan={2}><strong>TỔNG CỘNG NGHĨA VỤ THUẾ PHẢI NỘP</strong></td>
                        <td><strong>{fmtVND(report.taxableRevenue)}</strong></td>
                        <td><strong>{((report.vatRate + report.pitRate) * 100).toFixed(1)}%</strong></td>
                        <td><strong>{fmtVND(report.totalTax)}</strong></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="acc-dec-footer">
                  <div className="acc-dec-sign">
                    <div>Ngày ...... tháng ...... năm 2026</div>
                    <div style={{ fontWeight: 700, marginTop: 4 }}>NGƯỜI NỘP THUẾ HOẶC ĐẠI DIỆN HỢP PHÁP</div>
                    <div style={{ fontSize: 11, color: '#666' }}>(Ký, ghi rõ họ tên và đóng dấu)</div>
                    <div style={{ height: 60 }} />
                    <div style={{ fontWeight: 600 }}>Lê Việt Hoàng</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  )
}

const css = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Be Vietnam Pro',sans-serif;background:#f9f8f6;color:#1a1916;font-size:14px;line-height:1.5}
.acc-page{min-height:100vh}

.acc-header{display:flex;align-items:center;justify-content:space-between;padding:12px 28px;background:#fff;border-bottom:1px solid #e8e6e1;position:sticky;top:0;z-index:100}
.acc-header-left{display:flex;align-items:center;gap:12px}
.acc-logo{font-size:16px;font-weight:700;color:#1a1916;text-decoration:none}
.acc-logo span{color:#8c8982;font-weight:300}
.acc-header-tag{font-size:12px;font-weight:600;background:#f0efe9;padding:3px 10px;border-radius:20px;color:#1a1916}
.acc-header-right{display:flex;align-items:center;gap:14px}
.acc-nav-link{font-size:13px;color:#8c8982;text-decoration:none}
.acc-nav-link:hover{color:#1a1916}
.acc-logout-btn{background:none;border:1px solid #e8e6e1;color:#dc2626;padding:4px 10px;border-radius:6px;font-size:12px;cursor:pointer}

.acc-main{max-width:1100px;margin:0 auto;padding:24px 20px}
.acc-card{background:#fff;border:1px solid #e8e6e1;border-radius:12px;padding:20px;margin-bottom:16px}

.acc-control-label{font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:#8c8982;margin-bottom:4px;display:block}
.acc-period-buttons{display:flex;gap:6px;flex-wrap:wrap}
.acc-period-btn{background:#f9f8f6;border:1px solid #e8e6e1;padding:6px 12px;border-radius:6px;font-size:12px;font-weight:500;cursor:pointer;transition:all .15s}
.acc-period-btn.active{background:#1a1916;color:#fff;border-color:#1a1916}

.acc-control-row{display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap}
.acc-select,.acc-inp-sm,.acc-inp{font-family:inherit;font-size:13px;padding:8px 10px;border:1px solid #e8e6e1;border-radius:6px;outline:none;background:#fff}
.acc-select:focus,.acc-inp:focus,.acc-inp-sm:focus{border-color:#1a1916}

.acc-btn-primary{background:#1a1916;color:#fff;border:none;padding:8px 16px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer}
.acc-btn-secondary{background:#fff;border:1px solid #e8e6e1;color:#1a1916;padding:8px 14px;border-radius:6px;font-size:13px;cursor:pointer}

/* Threshold Banner */
.acc-threshold-banner{background:#f0fdf4;border-color:#bbf7d0}
.acc-tb-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.acc-tb-title{font-size:14px;color:#166534}
.acc-tb-badge{font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px}
.acc-tb-badge.exempt{background:#dcfce7;color:#15803d}
.acc-tb-badge.taxable{background:#fef2f2;color:#dc2626}
.acc-tb-progress-wrap{height:8px;background:#dcfce7;border-radius:4px;overflow:hidden;margin-bottom:6px}
.acc-tb-bar{height:100%;background:#16a34a;border-radius:4px;transition:width .3s}
.acc-tb-footer{display:flex;justify-content:space-between;font-size:12px;color:#166534}

/* KPI Grid */
.acc-kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:16px}
.acc-kpi-card{background:#fff;border:1px solid #e8e6e1;border-radius:10px;padding:14px;display:flex;gap:10px;align-items:flex-start}
.acc-kpi-card.highlight{background:#fafaf8;border-color:#1a1916}
.acc-kpi-icon{font-size:22px}
.acc-kpi-body{flex:1;min-width:0}
.acc-kpi-label{font-size:11px;color:#8c8982;margin-bottom:2px}
.acc-kpi-val{font-size:15px;font-weight:700;color:#1a1916}
.acc-kpi-val.green{color:#2a7a4b}
.acc-kpi-val.orange{color:#d97706}
.acc-kpi-val.red{color:#dc2626}
.acc-kpi-val.primary{color:#1a1916}
.acc-kpi-sub{font-size:10px;color:#8c8982;margin-top:2px}

/* Tabs */
.acc-tabs-wrap{display:flex;gap:4px;border-bottom:1px solid #e8e6e1;margin-bottom:16px}
.acc-tab-btn{background:none;border:none;padding:10px 16px;font-family:inherit;font-size:13px;font-weight:500;color:#8c8982;cursor:pointer;border-bottom:2px solid transparent}
.acc-tab-btn.active{color:#1a1916;font-weight:700;border-bottom-color:#1a1916}

/* Tables */
.acc-section-title{font-size:15px;font-weight:700;margin-bottom:12px;color:#1a1916}
.acc-table{width:100%;border-collapse:collapse;font-size:13px}
.acc-table th{background:#f9f8f6;padding:8px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;color:#8c8982;border-bottom:1.5px solid #e8e6e1}
.acc-table td{padding:10px 12px;border-bottom:1px solid #f0efe9;vertical-align:middle}
.acc-tr-total td{background:#fafaf8;border-top:1.5px solid #1a1916}
.font-mono{font-family:monospace}
.acc-status-tag{font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;text-transform:uppercase}
.acc-status-tag.delivered{background:#dcfce7;color:#15803d}
.acc-status-tag.cancelled{background:#fef2f2;color:#dc2626}
.acc-status-tag.pending{background:#fef3c7;color:#b45309}

/* Expense Form */
.acc-exp-form{display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;background:#f9f8f6;padding:14px;border-radius:8px}
.acc-exp-badge{font-size:11px;font-weight:600;background:#f0efe9;padding:2px 8px;border-radius:4px}
.acc-del-btn{background:none;border:1px solid #fecaca;color:#dc2626;font-size:11px;padding:2px 8px;border-radius:4px;cursor:pointer}

/* Declaration Paper (Mẫu 01/CNKD) */
.acc-declaration-paper{max-width:800px;margin:0 auto;padding:40px;border:1px solid #ccc;box-shadow:0 4px 20px rgba(0,0,0,.05);background:#fff}
.acc-dec-header{text-align:center;margin-bottom:20px}
.acc-dec-top{font-size:12pt;font-weight:700;letter-spacing:.5px}
.acc-dec-sub{font-size:11pt;font-weight:600;margin-bottom:10px}
.acc-dec-title{font-size:14pt;font-weight:800;margin-top:12px}
.acc-dec-norm{font-size:9pt;font-style:italic;color:#555}
.acc-dec-form-no{font-size:10pt;font-weight:700;text-align:right;margin-top:4px}
.acc-dec-section{margin-top:16px}
.acc-dec-sec-title{font-size:10.5pt;font-weight:700;margin-bottom:8px}
.acc-dec-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:10pt}
.acc-dec-table{width:100%;border-collapse:collapse;margin-top:8px;font-size:9.5pt}
.acc-dec-table th,.acc-dec-table td{border:1px solid #333;padding:6px 8px;text-align:left}
.acc-dec-table th{background:#f0f0f0;font-weight:700;text-align:center}
.acc-dec-total-row td{background:#fafafa}
.acc-dec-footer{margin-top:30px;display:flex;justify-content:flex-end}
.acc-dec-sign{text-align:center;font-size:10pt}

/* Auth */
.acc-auth-wrap{max-width:400px;margin:80px auto;padding:20px}
.acc-auth-box{background:#fff;border:1px solid #e8e6e1;border-radius:12px;padding:28px}
.acc-auth-logo{font-size:16px;font-weight:700;margin-bottom:6px}
.acc-auth-logo span{color:#8c8982;font-weight:300}
.acc-auth-title{font-size:18px;font-weight:700;margin-bottom:16px}
.acc-auth-err{color:#dc2626;font-size:12px;margin-top:8px}

@media print{
  .no-print{display:none!important}
  body{background:#fff}
  .acc-main{padding:0}
  .acc-declaration-paper{box-shadow:none;border:none;padding:0;width:100%}
  @page{size:A4;margin:15mm}
}
`

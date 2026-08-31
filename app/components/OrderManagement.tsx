'use client'
import { useEffect, useRef, useState, useMemo } from 'react'
import type { Item } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────
export type OrderItem = {
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
  shipping_carrier: string  // 'spx' | 'viettelpost' | 'other'
  tracking_number: string | null
  payment_method: 'cod' | 'bank_transfer'
  payment_status: 'pending' | 'verified' | 'failed'
  order_status: 'pending' | 'confirmed' | 'shipping' | 'delivered' | 'cancelled'
  total_amount: number | null
  shipping_fee: number | null
  is_free_shipping: boolean | null
  shipping_discount: number | null
  item_discount: number | null
  fb_psid: string | null
  fb_url: string | null
  share_token: string | null
  is_exported?: boolean | null
  created_by: string | null
  created_at: string
  updated_at: string
  weight_g?: number | null
  length_cm?: number | null
  width_cm?: number | null
  height_cm?: number | null
  delivery_note?: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  carrier_metadata?: any
  items?: { title: string; price: number | null; order_code: string; images: string[] } | null
  order_items?: OrderItem[]
}

type Props = {
  adminKey: string
  onToast: (msg: string) => void
  initialSelectedItems?: { id: number, title: string, price: number | null }[]
  onOrderChange?: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────
function fmtVND(v: number | null | undefined) {
  if (v == null) return 'Thương lượng'
  if (v === 0) return '0 ₫'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v)
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const CARRIER_LABEL: Record<string, string> = {
  vnpost: 'VNPost',
  spx: 'Shopee Express',
  viettelpost: 'ViettelPost',
  other: 'Khác',
}
const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  shipping: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã huỷ',
}
const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: 'Chờ TT',
  verified: 'Đã TT',
  failed: 'Thất bại',
}

const EMPTY_FORM = {
  item_id: '' as string | number,
  item_title: '',
  item_price: '',
  customer_name: '',
  customer_phone: '',
  customer_address: '',
  customer_note: '',
  shipping_carrier: 'spx',
  shipping_fee: '' as string,
  is_free_shipping: false,
  payment_method: 'cod',
  total_amount: '',
  tracking_number: '',
  fb_psid: '',
  created_by: '',
  showNewProduct: false,
  newProductTitle: '',
  newProductPrice: '',
  newProductCondition: 'Cũ - Còn tốt',
  newProductCategory: '',
  item_discount: 0,
  shipping_discount: 0,
  weight_g: '',
  length_cm: '',
  width_cm: '',
  height_cm: '',
  delivery_note: '',
  spx_address_type: 'old',
  spx_province: '',
  spx_district: '',
  spx_ward: '',
  spx_detail: '',
  spx_service_partial: false,
  spx_service_view: true,
}

// ─── Main Component ───────────────────────────────────────────────
export default function OrderManagement({ adminKey, onToast, initialSelectedItems, onOrderChange }: Props) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'shipping' | 'delivered' | 'cancelled'>('all')
  const [statsRange, setStatsRange] = useState<'today' | 'week' | 'month' | 'all'>('month')
  const [showTopCustomers, setShowTopCustomers] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editOrder, setEditOrder] = useState<Order | null>(null)
  const [printOrder, setPrintOrder] = useState<Order | null>(null)
  const [saving, setSaving] = useState(false)
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<number>>(new Set())

  // Create form
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [itemSearch, setItemSearch] = useState('')
  const [searchedItems, setSearchedItems] = useState<Item[]>([])
  const [itemSearchLoading, setItemSearchLoading] = useState(false)
  const itemSearchTimer = useRef<ReturnType<typeof setTimeout>>()

  // Edit form
  const [editForm, setEditForm] = useState<{
    order_status: Order['order_status']
    payment_status: Order['payment_status']
    payment_method: Order['payment_method']
    tracking_number: string
    shipping_carrier: string
    shipping_fee: string
    fb_psid: string
    weight_g: string
    length_cm: string
    width_cm: string
    height_cm: string
    delivery_note: string
    spx_address_type: string
    spx_province: string
    spx_district: string
    spx_ward: string
    spx_detail: string
    spx_service_partial: boolean
    spx_service_view: boolean
  }>({
    order_status: 'pending',
    payment_status: 'pending',
    payment_method: 'cod',
    tracking_number: '',
    shipping_carrier: 'spx',
    shipping_fee: '',
    fb_psid: '',
    weight_g: '',
    length_cm: '',
    width_cm: '',
    height_cm: '',
    delivery_note: '',
    spx_address_type: 'old',
    spx_province: '',
    spx_district: '',
    spx_ward: '',
    spx_detail: '',
    spx_service_partial: false,
    spx_service_view: true,
  })

  // Add-item-to-order state (in edit modal)
  const [addItemSearch, setAddItemSearch] = useState('')
  const [addItemResults, setAddItemResults] = useState<Item[]>([])
  const [addItemLoading, setAddItemLoading] = useState(false)
  const [addItemPrice, setAddItemPrice] = useState('')
  const [selectedAddItem, setSelectedAddItem] = useState<Item | null>(null)
  const addItemTimer = useRef<ReturnType<typeof setTimeout>>()
  const [editOrderItems, setEditOrderItems] = useState<OrderItem[]>([])

  // Create-order cart state
  const [createCartItems, setCreateCartItems] = useState<Array<{id?: number, title: string, price: number | null, original_price?: number | null}>>([])
  const [createStagedItem, setCreateStagedItem] = useState<Item | null>(null)
  const [createStagedPrice, setCreateStagedPrice] = useState('')

  // Customers fetched from DB (bảng customers)
  const [dbCustomers, setDbCustomers] = useState<Array<{ name: string; phone: string; address: string; fb_psid: string; order_count?: number }>>([])

  const allCustomers = useMemo(() => {
    // Start with DB customers as base
    const map = new Map<string, { name: string; phone: string; address: string; fb_psid: string }>()
    for (const c of dbCustomers) {
      if (c.phone) map.set(c.phone, { name: c.name, phone: c.phone, address: c.address ?? '', fb_psid: c.fb_psid ?? '' })
    }
    // Merge from orders (may have fresher fb_psid)
    for (const o of orders) {
      if (!map.has(o.customer_phone)) {
        map.set(o.customer_phone, {
          name: o.customer_name,
          phone: o.customer_phone,
          address: o.customer_address,
          fb_psid: o.fb_psid ?? ''
        })
      } else if (o.fb_psid) {
        // Update fb_psid if order has one
        const existing = map.get(o.customer_phone)!
        if (!existing.fb_psid) map.set(o.customer_phone, { ...existing, fb_psid: o.fb_psid })
      }
    }
    return Array.from(map.values())
  }, [orders, dbCustomers])

  const [showNameDropdown, setShowNameDropdown] = useState(false)
  const [showPhoneDropdown, setShowPhoneDropdown] = useState(false)
  const [custSearchResults, setCustSearchResults] = useState<typeof allCustomers>([])

  function handleCustomerSearch(val: string, type: 'name' | 'phone', isFocus = false) {
    if (!isFocus) {
      if (type === 'name') setForm(f => ({ ...f, customer_name: val }))
      else setForm(f => ({ ...f, customer_phone: val }))
    }

    const q = val.trim().toLowerCase()
    const matches = q ? allCustomers.filter(c => c.phone.includes(q) || c.name.toLowerCase().includes(q)) : allCustomers
    setCustSearchResults(matches.slice(0, 15))
    
    if (type === 'name') {
      setShowNameDropdown(true)
      setShowPhoneDropdown(false)
    } else {
      setShowPhoneDropdown(true)
      setShowNameDropdown(false)
    }
  }

  function selectCustomer(c: typeof allCustomers[0]) {
    let prov = '', dist = '', ward = '', detail = ''
    let addressType = 'new'
    if (c.address) {
      const parts = c.address.split(',').map((s: string) => s.trim())
      if (parts.length >= 4) {
        prov = parts.pop() || ''
        dist = parts.pop() || ''
        ward = parts.pop() || ''
        detail = parts.join(', ')
        addressType = 'old'
      } else if (parts.length === 3) {
        prov = parts.pop() || ''
        ward = parts.pop() || ''
        detail = parts.join(', ')
        addressType = 'new'
      } else {
        detail = c.address
      }
    }

    setForm(f => ({
      ...f,
      customer_name: c.name,
      customer_phone: c.phone,
      customer_address: c.address || f.customer_address,
      fb_psid: c.fb_psid || f.fb_psid,
      spx_province: prov,
      spx_district: dist,
      spx_ward: ward,
      spx_detail: detail,
      spx_address_type: addressType as 'new' | 'old',
    }))
    setShowNameDropdown(false)
    setShowPhoneDropdown(false)
  }

  // ── Fetch orders ───────────────────────────────────────────────
  async function fetchOrders() {
    setLoading(true)
    try {
      const r = await fetch('/api/orders', { headers: { 'x-admin-key': adminKey } })
      const d = await r.json()
      setOrders(Array.isArray(d) ? d : [])
    } catch {
      onToast('Không thể tải đơn hàng')
    } finally {
      setLoading(false)
    }
  }

  // ── Fetch customers from DB ────────────────────────────────────
  async function fetchDbCustomers() {
    try {
      const r = await fetch('/api/customers', { headers: { 'x-admin-key': adminKey } })
      if (r.ok) {
        const d = await r.json()
        if (Array.isArray(d)) setDbCustomers(d)
      }
    } catch { /* silent */ }
  }

  useEffect(() => {
    fetchOrders()
    fetchDbCustomers()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (initialSelectedItems && initialSelectedItems.length > 0) {
      setForm({ ...EMPTY_FORM })
      setCreateCartItems(initialSelectedItems)
      setCreateStagedItem(null)
      setCreateStagedPrice('')
      setItemSearch('')
      setSearchedItems([])
      const total = initialSelectedItems.reduce((s, i) => s + (i.price ?? 0), 0)
      setForm(f => ({ ...f, total_amount: total ? String(total) : '' }))
      setShowCreateModal(true)
    }
  }, [initialSelectedItems])


  // ── Item search ────────────────────────────────────────────────
  async function searchItems(query: string) {
    if (!query.trim()) { setSearchedItems([]); return }
    setItemSearchLoading(true)
    try {
      const r = await fetch('/api/items')
      const d: Item[] = await r.json()
      const q = query.toLowerCase()
      setSearchedItems(
        (Array.isArray(d) ? d : [])
          .filter(i => i.title.toLowerCase().includes(q) || i.order_code.toLowerCase().includes(q))
          .slice(0, 8)
      )
    } catch {
      setSearchedItems([])
    } finally {
      setItemSearchLoading(false)
    }
  }

  function onItemSearchChange(val: string) {
    setItemSearch(val)
    clearTimeout(itemSearchTimer.current)
    itemSearchTimer.current = setTimeout(() => searchItems(val), 300)
  }

  function selectItem(item: Item) {
    setCreateStagedItem(item)
    const isSale = ((item.discount_percent && item.discount_percent > 0) || (item.discount_amount && item.discount_amount > 0)) && item.discount_end_date && new Date(item.discount_end_date) > new Date()
    const finalPrice = isSale && item.price ? (item.discount_amount && item.discount_amount > 0 ? item.price - item.discount_amount : item.price * (1 - item.discount_percent! / 100)) : item.price
    setCreateStagedPrice(finalPrice ? String(finalPrice) : '')
    setItemSearch(item.title)
    setSearchedItems([])
  }

  function addToCreateCart() {
    let title = createStagedItem?.title ?? itemSearch.trim()
    if (!title) return
    if (createStagedItem) {
      const isSale = ((createStagedItem.discount_percent && createStagedItem.discount_percent > 0) || (createStagedItem.discount_amount && createStagedItem.discount_amount > 0)) && createStagedItem.discount_end_date && new Date(createStagedItem.discount_end_date) > new Date()
      if (isSale) title += ' (Đã giảm giá)'
    }
    const price = createStagedPrice ? Number(createStagedPrice) : (createStagedItem?.price ?? null)
    const original_price = createStagedItem?.price ?? null
    const newItem = { id: createStagedItem?.id, title, price, original_price }
    setCreateCartItems(prev => {
      const updated = [...prev, newItem]
      const total = updated.reduce((s, i) => s + (i.price ?? 0), 0)
      setForm(f => ({ ...f, total_amount: total ? String(total) : '' }))
      return updated
    })
    setCreateStagedItem(null)
    setCreateStagedPrice('')
    setItemSearch('')
  }

  function removeFromCreateCart(idx: number) {
    setCreateCartItems(prev => {
      const updated = prev.filter((_, i) => i !== idx)
      const total = updated.reduce((s, i) => s + (i.price ?? 0), 0)
      setForm(f => ({ ...f, total_amount: total ? String(total) : '' }))
      return updated
    })
  }

  function clearCreateCart() {
    setCreateCartItems([])
    setCreateStagedItem(null)
    setCreateStagedPrice('')
    setItemSearch('')
    setSearchedItems([])
  }

  useEffect(() => {
    const idisc = createCartItems.reduce((acc, ci) => {
      if (ci.original_price && ci.price && ci.original_price > ci.price) {
        return acc + (ci.original_price - ci.price)
      }
      return acc
    }, 0)
    if (form.item_discount !== idisc) {
      setForm(f => ({ ...f, item_discount: idisc }))
    }
  }, [createCartItems, form.item_discount])

  useEffect(() => {
    const itemsTotal = form.total_amount ? Number(form.total_amount) : 0
    let sd = 0
    if (form.payment_method === 'bank_transfer') {
      if (itemsTotal >= 500000) sd = 50000
      else if (itemsTotal >= 200000) sd = 20000
    }
    const sf = form.shipping_fee ? Number(form.shipping_fee) : 0
    if (sd > sf) sd = sf

    if (form.shipping_discount !== sd) {
      setForm(f => ({ ...f, shipping_discount: sd }))
    }
  }, [form.payment_method, form.total_amount, form.shipping_fee, form.shipping_discount])

  // ── Create order ───────────────────────────────────────────────
  async function createOrder() {
    let finalCustomerAddress = form.customer_address
    let carrierMetadata = null

    // For ALL carriers, we build the string from the separate fields
    const spxDist = form.spx_address_type === 'new' ? '' : form.spx_district
    const addrParts = [form.spx_detail, form.spx_ward, spxDist, form.spx_province].filter(Boolean)
    if (addrParts.length > 0) {
      finalCustomerAddress = addrParts.join(', ')
    }
    
    // We store the structured data for all orders now, to be carrier agnostic
    carrierMetadata = {
      spx_address_type: form.spx_address_type,
      spx_province: form.spx_province,
      spx_district: spxDist,
      spx_ward: form.spx_ward,
      spx_detail: form.spx_detail,
      spx_service_partial: form.spx_service_partial,
      spx_service_view: form.spx_service_view
    }

    if (!form.customer_name || !form.customer_phone || !finalCustomerAddress) {
      onToast('Vui lòng nhập đầy đủ thông tin khách hàng')
      return
    }
    if (form.shipping_fee === '' || form.shipping_fee == null) {
      onToast('Vui lòng nhập phí vận chuyển (nhập 0 nếu miễn phí)')
      return
    }
    setSaving(true)
    try {
      const cartItems = [...createCartItems]

      // If creating new product inline, create it first then add to cart
      if (form.showNewProduct && form.newProductTitle) {
        const pr = await fetch('/api/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
          body: JSON.stringify({
            title: form.newProductTitle,
            price: form.newProductPrice ? Number(form.newProductPrice) : null,
            condition: form.newProductCondition,
            category: form.newProductCategory,
            type: 'ban',
            description: '',
            phone: '',
            location: '',
            images: [],
            status: 'available',
          }),
        })
        if (!pr.ok) { onToast('Lỗi tạo sản phẩm'); return }
        const pd = await pr.json()
        cartItems.push({ id: pd.id, title: form.newProductTitle, price: form.newProductPrice ? Number(form.newProductPrice) : null })
      }

      const r = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({
          cart_items: cartItems.length > 0 ? cartItems : undefined,
          customer_name: form.customer_name,
          customer_phone: form.customer_phone,
          customer_address: finalCustomerAddress,
          customer_note: form.customer_note || null,
          shipping_carrier: form.shipping_carrier,
          tracking_number: form.tracking_number || null,
          shipping_fee: form.shipping_fee ? Number(form.shipping_fee) : 0,
          is_free_shipping: form.is_free_shipping,
          payment_method: form.payment_method,
          total_amount: form.total_amount ? Number(form.total_amount) : null,
          fb_psid: form.fb_psid || null,
          created_by: form.created_by || 'admin',
          item_discount: form.item_discount,
          shipping_discount: form.shipping_discount,
          weight_g: form.weight_g ? Number(form.weight_g) : null,
          length_cm: form.length_cm ? Number(form.length_cm) : null,
          width_cm: form.width_cm ? Number(form.width_cm) : null,
          height_cm: form.height_cm ? Number(form.height_cm) : null,
          delivery_note: form.delivery_note || null,
          carrier_metadata: carrierMetadata,
        }),
      })
      if (!r.ok) { onToast('Lỗi tạo đơn hàng'); return }
      onToast('Đã tạo đơn hàng!')
      setShowCreateModal(false)
      setForm({ ...EMPTY_FORM })
      clearCreateCart()
      fetchOrders()
      if (onOrderChange) onOrderChange()
    } catch {
      onToast('Không thể kết nối server')
    } finally {
      setSaving(false)
    }
  }

  // ── Update order ───────────────────────────────────────────────
  async function updateOrder(id: number, fields: Partial<Order>) {
    setSaving(true)
    try {
      const prevOrder = orders.find(o => o.id === id)

      const r = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ id, ...fields }),
      })
      if (!r.ok) { onToast('Lỗi cập nhật đơn hàng'); return }
      // PATCH now returns order with fresh order_items from DB
      const updated: Order = await r.json()
      setOrders(prev => prev.map(o => o.id === id ? updated : o))
      setEditOrderItems(updated.order_items ?? [])
      onToast('Đã cập nhật đơn hàng')
      setEditOrder(null)

      // Auto-send notification when status changes
      const newStatus = fields.order_status
      if (newStatus && prevOrder && prevOrder.order_status !== newStatus) {
        const psid = (fields.fb_psid as string | null) ?? prevOrder.fb_psid
        if (psid) {
          const notifType = newStatus === 'shipping' ? 'shipping' : 'created'
          await sendNotification(updated, notifType, psid)
        }
      }
      if (newStatus && prevOrder && prevOrder.order_status !== newStatus) {
        if (onOrderChange) onOrderChange()
      }
    } catch {
      onToast('Không thể kết nối server')
    } finally {
      setSaving(false)
    }
  }

  // ── Delete order ───────────────────────────────────────────────
  async function deleteOrder(id: number) {
    if (!confirm('Xoá đơn hàng này?')) return
    try {
      await fetch('/api/orders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ id }),
      })
      setOrders(prev => prev.filter(o => o.id !== id))
      onToast('Đã xoá đơn hàng')
      if (onOrderChange) onOrderChange()
    } catch {
      onToast('Không thể xoá đơn hàng')
    }
  }

  // ── Export carrier file ────────────────────────────────────────
  async function exportCarrier(carrier: 'vnpost' | 'spx', ids?: number[]) {
    let url = `/api/orders/export-carrier?carrier=${carrier}`
    if (ids && ids.length > 0) url += `&ids=${ids.join(',')}`
    try {
      const r = await fetch(url, { headers: { 'x-admin-key': adminKey } })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        onToast(`Lỗi xuất file: ${d.error ?? r.status}`)
        return
      }
      const blob = await r.blob()
      const objUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objUrl
      const ext = 'xlsx'
      a.download = `${carrier}_orders_${new Date().toISOString().slice(0, 10)}.${ext}`
      a.click()
      URL.revokeObjectURL(objUrl)
    } catch {
      onToast('Không thể xuất file')
    }
  }

  // ── Bulk Export All Carriers ─────────────────────────────────────
  async function exportAllCarriers() {
    const targetOrders = selectedOrderIds.size > 0 
      ? filteredOrders.filter(o => selectedOrderIds.has(o.id))
      : filteredOrders.filter(o => ['pending', 'confirmed', 'shipping'].includes(o.order_status))
      
    if (targetOrders.length === 0) {
      onToast('Không có đơn hàng nào để xuất')
      return
    }

    const vnpostIds = targetOrders.filter(o => o.shipping_carrier === 'vnpost').map(o => o.id)
    const spxIds = targetOrders.filter(o => o.shipping_carrier === 'spx').map(o => o.id)

    let exported = 0
    if (vnpostIds.length > 0) {
      await exportCarrier('vnpost', vnpostIds)
      exported++
    }
    if (spxIds.length > 0) {
      await exportCarrier('spx', spxIds)
      exported++
    }

    if (exported === 0) {
      onToast('Không có đơn hàng VNPost hoặc SPX nào để xuất')
    } else {
      onToast(`Đã xuất ${exported} file giao hàng`)
      setTimeout(fetchOrders, 1000)
    }
  }

  // ── Bulk Actions ────────────────────────────────────────────────
  async function bulkUpdateStatus(newStatus: string) {
    if (!newStatus) return
    const ids = Array.from(selectedOrderIds)
    setSaving(true)
    try {
      await Promise.all(ids.map(id => 
        fetch('/api/orders', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey }, body: JSON.stringify({ id, order_status: newStatus }) })
      ))
      onToast(`Đã chuyển trạng thái ${ids.length} đơn`)
      fetchOrders()
      if (onOrderChange) onOrderChange()
      setSelectedOrderIds(new Set())
    } catch { onToast('Lỗi khi cập nhật') }
    finally { setSaving(false) }
  }

  async function bulkUpdatePayment(newPayment: string) {
    if (!newPayment) return
    const ids = Array.from(selectedOrderIds)
    setSaving(true)
    try {
      await Promise.all(ids.map(id => 
        fetch('/api/orders', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey }, body: JSON.stringify({ id, payment_status: newPayment }) })
      ))
      onToast(`Đã cập nhật thanh toán ${ids.length} đơn`)
      fetchOrders()
      setSelectedOrderIds(new Set())
    } catch { onToast('Lỗi khi cập nhật') }
    finally { setSaving(false) }
  }

  async function bulkUpdateExport(is_exported: boolean) {
    const ids = Array.from(selectedOrderIds)
    setSaving(true)
    try {
      await Promise.all(ids.map(id => 
        fetch('/api/orders', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey }, body: JSON.stringify({ id, is_exported }) })
      ))
      onToast(`Đã ${is_exported ? 'đánh dấu xuất' : 'bỏ đánh dấu'} ${ids.length} đơn`)
      fetchOrders()
      setSelectedOrderIds(new Set())
    } catch { onToast('Lỗi khi cập nhật') }
    finally { setSaving(false) }
  }

  // ── Export CSV ─────────────────────────────────────────────────
  function exportCSV() {
    const headers = ['Mã đơn', 'Sản phẩm', 'Khách hàng', 'SĐT', 'Địa chỉ', 'Ghi chú', 'Vận chuyển', 'Mã vận đơn', 'TT Thanh toán', 'TT Đơn', 'Tổng tiền', 'Ngày tạo']
    const rows = filteredOrders.map(o => [
      o.order_number,
      o.items?.title || o.item_title || '',
      o.customer_name,
      o.customer_phone,
      o.customer_address,
      o.customer_note || '',
      CARRIER_LABEL[o.shipping_carrier] || o.shipping_carrier,
      o.tracking_number || '',
      PAYMENT_STATUS_LABEL[o.payment_status] || o.payment_status,
      ORDER_STATUS_LABEL[o.order_status] || o.order_status,
      o.total_amount != null ? String(o.total_amount) : '',
      fmtDate(o.created_at),
    ])
    const csvContent = [headers, ...rows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `don-hang-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Send notification ──────────────────────────────────────────
  async function sendNotification(order: Order, type: 'created' | 'shipping', overridePsid?: string | null) {
    const psid = overridePsid ?? order.fb_psid
    if (!psid) {
      onToast('Đơn hàng này chưa có FB PSID')
      return
    }
    const name = order.customer_name
    const order_number = order.order_number
    const allItems = order.order_items?.length
      ? order.order_items.map(i => i.item_title).join(', ')
      : (order.items?.title || order.item_title || 'Sản phẩm')
    const total_amount = fmtVND(order.total_amount)
    const carrier = CARRIER_LABEL[order.shipping_carrier] || order.shipping_carrier
    const tracking = order.tracking_number || '(chưa có)'

    const message = type === 'created'
      ? `Xin chào ${name}! Đơn hàng ${order_number} của bạn đã được xác nhận.\nSản phẩm: ${allItems}\nTổng tiền: ${total_amount}\nCảm ơn bạn đã mua hàng! 🙏`
      : `Đơn hàng ${order_number} đang được vận chuyển.\nĐơn vị: ${carrier}\nMã vận đơn: ${tracking}\nThời gian dự kiến: 1-3 ngày làm việc 📦`

    try {
      const r = await fetch('/api/orders/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ psid, message }),
      })
      if (!r.ok) {
        const d = await r.json()
        onToast(`Lỗi gửi thông báo: ${d.error ?? r.status}`)
      } else {
        onToast('Đã gửi thông báo Messenger!')
      }
    } catch {
      onToast('Không thể gửi thông báo')
    }
  }

  // ── Print invoice ──────────────────────────────────────────────
  function printInvoice(order: Order) {
    // Include the current editOrderItems if printing from the edit modal
    const withItems = { ...order, order_items: editOrder?.id === order.id ? editOrderItems : order.order_items }
    setPrintOrder(withItems)
    setTimeout(() => window.print(), 100)
  }

  // ── Share invoice link ─────────────────────────────────────────
  function shareInvoice(order: Order) {
    if (!order.share_token) { onToast('Đơn này chưa có link chia sẻ'); return }
    const url = `${window.location.origin}/invoice/${order.share_token}`
    navigator.clipboard.writeText(url)
      .then(() => onToast('Đã sao chép link hóa đơn!'))
      .catch(() => onToast('Không thể sao chép: ' + url))
  }

  // ── Open edit modal ────────────────────────────────────────────
  function openEdit(order: Order) {
    setEditOrder(order)
    setEditForm({
      order_status: order.order_status,
      payment_status: order.payment_status,
      payment_method: order.payment_method,
      tracking_number: order.tracking_number ?? '',
      shipping_carrier: order.shipping_carrier,
      shipping_fee: order.shipping_fee != null ? String(order.shipping_fee) : '',
      fb_psid: order.fb_psid ?? '',
      weight_g: order.weight_g ? String(order.weight_g) : '',
      length_cm: order.length_cm ? String(order.length_cm) : '',
      width_cm: order.width_cm ? String(order.width_cm) : '',
      height_cm: order.height_cm ? String(order.height_cm) : '',
      delivery_note: order.delivery_note ?? '',
      spx_address_type: order.carrier_metadata?.spx_address_type ?? 'old',
      spx_province: order.carrier_metadata?.spx_province ?? '',
      spx_district: order.carrier_metadata?.spx_district ?? '',
      spx_ward: order.carrier_metadata?.spx_ward ?? '',
      spx_detail: order.carrier_metadata?.spx_detail ?? '',
      spx_service_partial: order.carrier_metadata?.spx_service_partial ?? false,
      spx_service_view: order.carrier_metadata?.spx_service_view ?? true,
    })
    setEditOrderItems(order.order_items ?? [])
    setAddItemSearch('')
    setAddItemResults([])
    setSelectedAddItem(null)
    setAddItemPrice('')
  }

  // ── Search items for add-to-order ──────────────────────────────
  async function searchAddItems(query: string) {
    if (!query.trim()) { setAddItemResults([]); return }
    setAddItemLoading(true)
    try {
      const r = await fetch('/api/items')
      const d: Item[] = await r.json()
      const q = query.toLowerCase()
      setAddItemResults(
        (Array.isArray(d) ? d : [])
          .filter(i => i.title.toLowerCase().includes(q) || i.order_code.toLowerCase().includes(q))
          .slice(0, 6)
      )
    } catch { setAddItemResults([]) }
    finally { setAddItemLoading(false) }
  }

  function onAddItemSearchChange(val: string) {
    setAddItemSearch(val)
    setSelectedAddItem(null)
    clearTimeout(addItemTimer.current)
    addItemTimer.current = setTimeout(() => searchAddItems(val), 300)
  }

  // ── Add item to existing order ─────────────────────────────────
  async function addItemToOrder(orderId: number) {
    if (!selectedAddItem && !addItemSearch.trim()) return
    const itemId = selectedAddItem?.id ?? null
    const title = selectedAddItem?.title ?? addItemSearch.trim()
    const price = addItemPrice ? Number(addItemPrice) : (selectedAddItem?.price ?? null)
    try {
      const r = await fetch('/api/order-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ order_id: orderId, item_id: itemId, item_title: title, item_price: price, quantity: 1 }),
      })
      if (!r.ok) { onToast('Lỗi thêm sản phẩm'); return }
      const newItem: OrderItem = await r.json()
      setEditOrderItems(prev => [...prev, newItem])
      // Keep orders state in sync so table shows the new item immediately
      setOrders(prev => prev.map(o => {
        if (o.id !== orderId) return o
        return { ...o, order_items: [...(o.order_items ?? []), newItem] }
      }))
      // Reserve linked inventory item so it's hidden from public listing
      if (itemId) {
        await fetch('/api/items', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
          body: JSON.stringify({ id: itemId, status: 'reserved' }),
        })
      }
      setAddItemSearch('')
      setAddItemResults([])
      setSelectedAddItem(null)
      setAddItemPrice('')
      onToast('Đã thêm sản phẩm vào đơn!')
    } catch { onToast('Không thể kết nối server') }
  }

  // ── Remove item from order ─────────────────────────────────────
  async function removeItemFromOrder(itemId: number, orderId: number) {
    try {
      const r = await fetch('/api/order-items', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ id: itemId, order_id: orderId }),
      })
      if (!r.ok) { onToast('Lỗi xoá sản phẩm'); return }
      const remaining = editOrderItems.filter(i => i.id !== itemId)
      setEditOrderItems(remaining)
      const newTotal = remaining.reduce((s, i) => s + (i.item_price ?? 0) * i.quantity, 0)
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, order_items: remaining, total_amount: newTotal || null } : o))
      onToast('Đã xoá sản phẩm khỏi đơn')
    } catch { onToast('Không thể kết nối server') }
  }

  // ── Filtered orders ────────────────────────────────────────────
  const filteredOrders = orders.filter(o => {
    const statusOk = statusFilter === 'all' || o.order_status === statusFilter
    const q = search.trim().toLowerCase()
    const searchOk = !q || [
      o.order_number,
      o.customer_name,
      o.customer_phone,
      o.items?.title || o.item_title || '',
    ].some(v => v?.toLowerCase().includes(q))
    return statusOk && searchOk
  })

  // ── Stats ──────────────────────────────────────────────────────
  const stats = (() => {
    const now = new Date()
    const rangeStart = (() => {
      if (statsRange === 'all') return new Date(0)
      if (statsRange === 'today') { const d = new Date(now); d.setHours(0, 0, 0, 0); return d }
      if (statsRange === 'week') { const d = new Date(now); d.setDate(d.getDate() - 7); return d }
      const d = new Date(now); d.setDate(1); d.setHours(0, 0, 0, 0); return d // month
    })()
    const rangeOrders = orders.filter(o => {
      if (statsRange === 'all') return true
      const created = new Date(o.created_at)
      if (statsRange === 'today') return created.toDateString() === now.toDateString()
      return created >= rangeStart
    })

    // ── Order stats ──
    const byStatus = (s: string) => rangeOrders.filter(o => o.order_status === s)
    const deliveredOrders = byStatus('delivered')
    const revenue = deliveredOrders.reduce((s, o) => s + (o.total_amount ?? 0), 0)
    const pendingRevenue = rangeOrders
      .filter(o => ['confirmed', 'shipping', 'delivered'].includes(o.order_status) && o.payment_status === 'pending')
      .reduce((s, o) => s + (o.total_amount ?? 0), 0)
    const nonCancelled = rangeOrders.filter(o => o.order_status !== 'cancelled').length
    const completionRate = nonCancelled > 0 ? Math.round(deliveredOrders.length / nonCancelled * 100) : 0
    const avgOrderValue = deliveredOrders.filter(o => o.total_amount).length > 0
      ? Math.round(revenue / deliveredOrders.filter(o => o.total_amount).length)
      : 0
    const codCount = rangeOrders.filter(o => o.payment_method === 'cod' && o.order_status !== 'cancelled').length
    const bankCount = rangeOrders.filter(o => o.payment_method === 'bank_transfer' && o.order_status !== 'cancelled').length

    // ── Customer stats ──
    const activeOrders = rangeOrders.filter(o => o.order_status !== 'cancelled')
    const rangePhones = Array.from(new Set(activeOrders.map(o => o.customer_phone)))
    const totalCustomers = rangePhones.length
    const newCustomers = statsRange === 'all' ? totalCustomers
      : rangePhones.filter(phone =>
          !orders.some(o => o.customer_phone === phone && new Date(o.created_at) < rangeStart)
        ).length
    const returningCustomers = totalCustomers - newCustomers
    const avgOrdersPerCustomer = totalCustomers > 0
      ? Math.round((activeOrders.length / totalCustomers) * 10) / 10
      : 0

    // Top 5 customers by order count (non-cancelled)
    const custMap = new Map<string, { name: string; phone: string; count: number; spend: number }>()
    for (const o of activeOrders) {
      const cur = custMap.get(o.customer_phone) ?? { name: o.customer_name, phone: o.customer_phone, count: 0, spend: 0 }
      cur.count++
      cur.spend += o.total_amount ?? 0
      custMap.set(o.customer_phone, cur)
    }
    const topCustomers = Array.from(custMap.values()).sort((a, b) => b.count - a.count || b.spend - a.spend).slice(0, 5)

    return {
      total: rangeOrders.length,
      pending: byStatus('pending').length,
      confirmed: byStatus('confirmed').length,
      shipping: byStatus('shipping').length,
      delivered: deliveredOrders.length,
      cancelled: byStatus('cancelled').length,
      needsAction: byStatus('pending').length,
      revenue, pendingRevenue, completionRate, avgOrderValue, codCount, bankCount,
      totalCustomers, newCustomers, returningCustomers, avgOrdersPerCustomer, topCustomers,
    }
  })()

  // ── VietQR URL ─────────────────────────────────────────────────
  function vietQRUrl(amount: string | number) {
    const bankId = process.env.NEXT_PUBLIC_BANK_ID ?? ''
    const bankAccount = process.env.NEXT_PUBLIC_BANK_ACCOUNT ?? ''
    const bankName = process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME ?? ''
    const orderNumber = form.item_title || 'LVH'
    return `https://img.vietqr.io/image/${bankId}-${bankAccount}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(orderNumber)}&accountName=${encodeURIComponent(bankName)}`
  }

  function vietQRUrlForOrder(order: Order) {
    const bankId = process.env.NEXT_PUBLIC_BANK_ID ?? ''
    const bankAccount = process.env.NEXT_PUBLIC_BANK_ACCOUNT ?? ''
    const bankName = process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME ?? ''
    return `https://img.vietqr.io/image/${bankId}-${bankAccount}-compact2.png?amount=${order.total_amount ?? 0}&addInfo=${encodeURIComponent(order.order_number)}&accountName=${encodeURIComponent(bankName)}`
  }

  // ─────────────────────────────────────────────────────────────
  const editItemsTotal = editOrder ? (editOrderItems.reduce((acc, oi) => acc + (oi.item_price ?? 0) * oi.quantity, 0) || (editOrder.item_price ?? 0)) : 0
  const editSf = editForm.shipping_fee ? Number(editForm.shipping_fee) : 0
  let editSd = 0
  if (editForm.payment_method === 'bank_transfer') {
    if (editItemsTotal >= 500000) editSd = 50000
    else if (editItemsTotal >= 200000) editSd = 20000
  }
  if (editSd > editSf) editSd = editSf
  const editFinalTotal = editOrder ? (editItemsTotal + editSf - editSd - (editOrder.item_discount ?? 0)) : 0

  return (
    <>
      <style>{omStyles}</style>

      {/* ── Header row ── */}
      <div className="om-header">
        <div className="om-title">
          Quản lý đơn hàng
          <span className="om-count">{filteredOrders.length} đơn</span>
        </div>
        <div className="om-header-controls">
          <div className="om-search-wrap">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input
              className="om-search"
              placeholder="Tìm mã đơn, tên, SĐT..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && <button className="om-search-clear" onClick={() => setSearch('')}>✕</button>}
          </div>
          <button className="om-btn-ghost" onClick={exportCSV}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            Xuất CSV
          </button>
          <button className="om-btn-ghost" title="Tự động phân loại và xuất file Excel giao hàng (VNPost & SPX)"
            onClick={exportAllCarriers}>
            📦 Tạo file giao hàng{selectedOrderIds.size > 0 ? ` (${selectedOrderIds.size})` : ''}
          </button>
          <a href="/accounting" className="om-btn-ghost" style={{ textDecoration: 'none', color: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            📊 Kế toán & Thuế
          </a>
          <button className="om-btn-primary" onClick={() => { setForm({ ...EMPTY_FORM }); clearCreateCart(); setShowCreateModal(true) }}>
            + Tạo đơn hàng
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="om-stats-wrap">
        <div className="om-stats-header">
          <span className="om-stats-title">Thống kê</span>
          <div className="om-range-tabs">
            {(['today', 'week', 'month', 'all'] as const).map(r => (
              <button
                key={r}
                className={`om-range-tab${statsRange === r ? ' active' : ''}`}
                onClick={() => setStatsRange(r)}
              >
                {r === 'today' ? 'Hôm nay' : r === 'week' ? '7 ngày' : r === 'month' ? 'Tháng này' : 'Tất cả'}
              </button>
            ))}
          </div>
        </div>
        <div className="om-stats-grid">
          <div className="om-stat-card">
            <div className="om-stat-label">Tổng đơn</div>
            <div className="om-stat-value">{stats.total}</div>
          </div>
          <div className={`om-stat-card${stats.needsAction > 0 ? ' om-stat-alert' : ''}`}>
            <div className="om-stat-label">Chờ xác nhận</div>
            <div className="om-stat-value">{stats.pending}</div>
          </div>
          <div className="om-stat-card">
            <div className="om-stat-label">Đã xác nhận</div>
            <div className="om-stat-value">{stats.confirmed}</div>
          </div>
          <div className="om-stat-card">
            <div className="om-stat-label">Đang giao</div>
            <div className="om-stat-value om-stat-shipping">{stats.shipping}</div>
          </div>
          <div className="om-stat-card">
            <div className="om-stat-label">Hoàn thành</div>
            <div className="om-stat-value om-stat-done">{stats.delivered}</div>
          </div>
          <div className="om-stat-card">
            <div className="om-stat-label">Đã hủy</div>
            <div className="om-stat-value om-stat-cancel">{stats.cancelled}</div>
          </div>
          <div className="om-stat-card om-stat-card-wide">
            <div className="om-stat-label">Doanh thu (đã giao)</div>
            <div className="om-stat-value om-stat-revenue">{fmtVND(stats.revenue || null)}</div>
          </div>
          {stats.pendingRevenue > 0 && (
            <div className="om-stat-card om-stat-card-wide om-stat-unpaid">
              <div className="om-stat-label">Chưa thu tiền</div>
              <div className="om-stat-value om-stat-warn">{fmtVND(stats.pendingRevenue)}</div>
            </div>
          )}
          <div className="om-stat-card">
            <div className="om-stat-label">Tỷ lệ XN</div>
            <div className="om-stat-value om-stat-done">{stats.completionRate}%</div>
          </div>
          <div className="om-stat-card">
            <div className="om-stat-label">TB giá trị đơn</div>
            <div className="om-stat-value om-stat-revenue" style={{ fontSize: 13 }}>{fmtVND(stats.avgOrderValue || null)}</div>
          </div>
          <div className="om-stat-card">
            <div className="om-stat-label">COD</div>
            <div className="om-stat-value">{stats.codCount}</div>
          </div>
          <div className="om-stat-card">
            <div className="om-stat-label">Chuyển khoản</div>
            <div className="om-stat-value">{stats.bankCount}</div>
          </div>
        </div>

        {/* ── Customer section ── */}
        <div className="om-stats-divider">
          <span>Khách hàng</span>
        </div>
        <div className="om-stats-grid">
          <div className="om-stat-card">
            <div className="om-stat-label">Tổng khách</div>
            <div className="om-stat-value">{stats.totalCustomers}</div>
          </div>
          {statsRange !== 'all' && (
            <>
              <div className="om-stat-card om-stat-new">
                <div className="om-stat-label">Khách mới</div>
                <div className="om-stat-value om-stat-blue">{stats.newCustomers}</div>
              </div>
              <div className="om-stat-card">
                <div className="om-stat-label">Quay lại</div>
                <div className="om-stat-value om-stat-done">{stats.returningCustomers}</div>
              </div>
            </>
          )}
          <div className="om-stat-card">
            <div className="om-stat-label">TB đơn / khách</div>
            <div className="om-stat-value">{stats.avgOrdersPerCustomer}</div>
          </div>
          <div className="om-stat-card om-stat-card-wide" style={{ gridColumn: statsRange === 'all' ? 'span 4' : 'span 2' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="om-stat-label">Top khách hàng</div>
              {stats.topCustomers.length > 0 && (
                <button className="om-toggle-top" onClick={() => setShowTopCustomers(v => !v)}>
                  {showTopCustomers ? 'Thu gọn ▲' : 'Xem ▼'}
                </button>
              )}
            </div>
            {stats.topCustomers.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Chưa có dữ liệu</div>
            )}
            {showTopCustomers && stats.topCustomers.length > 0 && (
              <table className="om-top-cust-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Khách hàng</th>
                    <th>SĐT</th>
                    <th>Đơn</th>
                    <th>Tổng chi</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topCustomers.map((c, i) => (
                    <tr key={c.phone}>
                      <td>{i + 1}</td>
                      <td style={{ fontWeight: 500 }}>{c.name}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{c.phone}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{c.count}</td>
                      <td style={{ textAlign: 'right', color: 'var(--green)', fontWeight: 600 }}>{fmtVND(c.spend || null)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!showTopCustomers && stats.topCustomers.length > 0 && (
              <div className="om-top-cust-preview">
                {stats.topCustomers.slice(0, 3).map((c, i) => (
                  <span key={c.phone} className="om-top-cust-chip">
                    {i + 1}. {c.name.split(' ').pop()} <strong>{c.count} đơn</strong>
                  </span>
                ))}
                {stats.topCustomers.length > 3 && <span style={{ color: 'var(--muted)', fontSize: 11 }}>+{stats.topCustomers.length - 3} khác</span>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Status filter chips ── */}
      <div className="om-filter-bar">
        {selectedOrderIds.size === 0 ? (
          <>
            {(['all', 'pending', 'confirmed', 'shipping', 'delivered', 'cancelled'] as const).map(s => (
              <button
                key={s}
                className={`om-chip${statusFilter === s ? ' om-chip-active' : ''} om-chip-${s}`}
                onClick={() => setStatusFilter(s)}
              >
                {s === 'all' ? 'Tất cả' : ORDER_STATUS_LABEL[s]}
              </button>
            ))}
            <button className="om-btn-ghost om-btn-refresh" onClick={fetchOrders}>↻</button>
          </>
        ) : (
          <div style={{display:'flex', gap: 8, alignItems:'center', background:'var(--tag-bg, #f0efe9)', padding:'4px 8px', borderRadius: 8}}>
            <span style={{fontWeight:600, fontSize:13, marginRight:8}}>Đã chọn {selectedOrderIds.size} đơn</span>
            <select className="om-inp" style={{width:'auto', padding:'4px 8px'}} onChange={(e) => bulkUpdateStatus(e.target.value)} value="" disabled={saving}>
              <option value="">Chuyển trạng thái...</option>
              <option value="confirmed">Đã xác nhận</option>
              <option value="shipping">Đang giao</option>
              <option value="delivered">Đã giao</option>
              <option value="cancelled">Đã hủy</option>
            </select>
            <select className="om-inp" style={{width:'auto', padding:'4px 8px'}} onChange={(e) => bulkUpdatePayment(e.target.value)} value="" disabled={saving}>
              <option value="">Thanh toán...</option>
              <option value="verified">Đã TT</option>
              <option value="pending">Chờ TT</option>
            </select>
            <button className="om-btn-ghost" style={{padding:'4px 8px'}} onClick={() => bulkUpdateExport(true)} disabled={saving}>Đánh dấu Đã xuất</button>
            <button className="om-btn-ghost" style={{padding:'4px 8px'}} onClick={() => bulkUpdateExport(false)} disabled={saving}>Bỏ dấu xuất</button>
            <button className="om-btn-ghost" style={{ color: 'var(--muted)', fontSize: 12, marginLeft:'auto' }} onClick={() => setSelectedOrderIds(new Set())}>
              Bỏ chọn
            </button>
          </div>
        )}
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="om-empty"><div className="om-spinner" />Đang tải...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="om-empty">
          <div className="om-empty-icon">📋</div>
          <p>Chưa có đơn hàng nào{statusFilter !== 'all' ? ` ở trạng thái "${ORDER_STATUS_LABEL[statusFilter]}"` : ''}.</p>
        </div>
      ) : (
        <div className="om-table-wrap">
          <table className="om-table">
            <thead>
              <tr>
                <th style={{ width: 36, textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    title="Chọn tất cả"
                    checked={filteredOrders.length > 0 && filteredOrders.every(o => selectedOrderIds.has(o.id))}
                    onChange={e => {
                      if (e.target.checked) setSelectedOrderIds(new Set(filteredOrders.map(o => o.id)))
                      else setSelectedOrderIds(new Set())
                    }}
                  />
                </th>
                <th>Mã đơn</th>
                <th>Sản phẩm</th>
                <th>Khách hàng</th>
                <th>SĐT</th>
                <th>TT Thanh toán</th>
                <th>TT Đơn</th>
                <th>Vận chuyển</th>
                <th>Ngày</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => (
                <tr key={order.id} className={selectedOrderIds.has(order.id) ? 'om-row-selected' : ''}>
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selectedOrderIds.has(order.id)}
                      onChange={e => {
                        setSelectedOrderIds(prev => {
                          const next = new Set(prev)
                          if (e.target.checked) next.add(order.id)
                          else next.delete(order.id)
                          return next
                        })
                      }}
                    />
                  </td>
                  <td>
                    <code className="om-order-code">{order.order_number}</code>
                  </td>
                  <td className="om-td-product">
                    {order.order_items && order.order_items.length > 0 ? (
                      <>
                        <div className="om-product-title">{order.order_items[0].item_title}</div>
                        {order.order_items.length > 1 && (
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>+{order.order_items.length - 1} sản phẩm khác</div>
                        )}
                      </>
                    ) : (
                      <div className="om-product-title">{order.items?.title || order.item_title || '—'}</div>
                    )}
                    {(order.total_amount != null) && (
                      <div className="om-product-price">{fmtVND(order.total_amount)}</div>
                    )}
                  </td>
                  <td style={{ fontWeight: 500 }}>{order.customer_name}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{order.customer_phone}</td>
                  <td>
                    <span className={`om-badge om-pay-${order.payment_status}`}>
                      {PAYMENT_STATUS_LABEL[order.payment_status] || order.payment_status}
                    </span>
                  </td>
                  <td>
                    <span className={`om-badge om-status-${order.order_status}`}>
                      {ORDER_STATUS_LABEL[order.order_status] || order.order_status}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: 12 }}>{CARRIER_LABEL[order.shipping_carrier] || order.shipping_carrier}</div>
                    {order.tracking_number && (
                      <code style={{ fontSize: 10, color: 'var(--muted)', display: 'block' }}>{order.tracking_number}</code>
                    )}
                    {order.is_exported && (
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#059669', background: '#d1fae5', display: 'inline-block', padding: '1px 4px', borderRadius: 4, marginTop: 2 }}>Đã xuất file</div>
                    )}
                  </td>
                  <td style={{ whiteSpace: 'nowrap', color: 'var(--muted)', fontSize: 12 }}>{fmtDate(order.created_at)}</td>
                  <td>
                    <div className="om-actions">
                      <button className="om-btn-edit" onClick={() => openEdit(order)}>Sửa</button>
                      <button className="om-btn-print" onClick={() => printInvoice(order)}>In</button>
                      <button className="om-btn-share" onClick={() => shareInvoice(order)} title="Sao chép link hóa đơn">⎘</button>
                      <button className="om-btn-delete" onClick={() => deleteOrder(order.id)}>Xoá</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Create Order Modal ── */}
      {showCreateModal && (
        <div className="om-overlay" onClick={e => e.target === e.currentTarget && setShowCreateModal(false)}>
          <div className="om-modal om-modal-create">
            <div className="om-modal-header">
              <h3>Tạo đơn hàng mới</h3>
              <button className="om-close-btn" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>

            {/* Product section */}
            <div className="om-section">
              <div className="om-section-title">
                Sản phẩm
                {createCartItems.length > 0 && <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 11, marginLeft: 6 }}>{createCartItems.length} sản phẩm</span>}
              </div>

              {/* Cart items */}
              {createCartItems.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  {createCartItems.map((item, idx) => (
                    <div key={idx} className="om-edit-item-row">
                      <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 500, lineHeight: 1.4 }}>{item.title}</div>
                      <span style={{ color: 'var(--green)', fontWeight: 600, fontSize: 12, marginRight: 8, whiteSpace: 'nowrap' }}>{fmtVND(item.price)}</span>
                      <button className="om-remove-item-btn" onClick={() => removeFromCreateCart(idx)}>✕</button>
                    </div>
                  ))}
                  {createCartItems.length > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 12, fontWeight: 700, color: 'var(--green)', paddingTop: 6, marginTop: 4, borderTop: '1px solid var(--border, #e8e6e1)' }}>
                      Tổng: {fmtVND(createCartItems.reduce((s, i) => s + (i.price ?? 0), 0) || null)}
                    </div>
                  )}
                </div>
              )}

              {!form.showNewProduct ? (
                <>
                  <div className="om-item-search-wrap">
                    <input
                      className="om-inp"
                      placeholder={createCartItems.length > 0 ? 'Thêm sản phẩm khác...' : 'Tìm sản phẩm theo tên hoặc mã...'}
                      value={itemSearch}
                      onChange={e => onItemSearchChange(e.target.value)}
                    />
                    {itemSearchLoading && <div className="om-spinner-sm" />}
                  </div>
                  {searchedItems.length > 0 && (
                    <div className="om-item-list">
                      {searchedItems.map(item => (
                        <button key={item.id} className="om-item-option" onClick={() => selectItem(item)}>
                          <div className="om-item-opt-title">{item.title}</div>
                          <div className="om-item-opt-meta">
                            <span className="om-order-code" style={{ fontSize: 10 }}>{item.order_code}</span>
                            <span style={{ color: 'var(--green)', fontWeight: 600, fontSize: 12 }}>{fmtVND(item.price)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {createStagedItem && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap', background: 'var(--tag-bg, #f0efe9)', borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{createStagedItem.title}</div>
                      <input
                        className="om-inp"
                        type="number"
                        placeholder="Giá (VNĐ)"
                        value={createStagedPrice}
                        onChange={e => setCreateStagedPrice(e.target.value)}
                        style={{ width: 120, flexShrink: 0 }}
                      />
                      <button className="om-btn-primary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={addToCreateCart}>+ Thêm</button>
                      <button className="om-close-btn" onClick={() => { setCreateStagedItem(null); setCreateStagedPrice(''); setItemSearch('') }}>✕</button>
                    </div>
                  )}
                  <button
                    className="om-link-btn"
                    onClick={() => setForm(f => ({ ...f, showNewProduct: true }))}
                  >
                    + Tạo sản phẩm mới nếu chưa có
                  </button>
                </>
              ) : (
                <div className="om-new-product-form">
                  <div className="om-new-product-header">
                    <span style={{ fontSize: 12, fontWeight: 600 }}>Thêm sản phẩm mới vào đơn</span>
                    <button className="om-link-btn" onClick={() => setForm(f => ({ ...f, showNewProduct: false }))}>← Chọn có sẵn</button>
                  </div>
                  <div className="om-form-grid">
                    <div className="om-fg om-fg-full">
                      <label className="om-lbl">Tên sản phẩm *</label>
                      <input className="om-inp" placeholder="VD: Sony WH-1000XM5 màu đen" value={form.newProductTitle}
                        onChange={e => setForm(f => ({ ...f, newProductTitle: e.target.value }))} />
                    </div>
                    <div className="om-fg">
                      <label className="om-lbl">Giá (VNĐ)</label>
                      <input className="om-inp" type="number" placeholder="0" value={form.newProductPrice}
                        onChange={e => setForm(f => ({ ...f, newProductPrice: e.target.value }))} />
                    </div>
                    <div className="om-fg">
                      <label className="om-lbl">Danh mục</label>
                      <input className="om-inp" placeholder="VD: Tai nghe" value={form.newProductCategory}
                        onChange={e => setForm(f => ({ ...f, newProductCategory: e.target.value }))} />
                    </div>
                    <div className="om-fg om-fg-full">
                      <label className="om-lbl">Tình trạng</label>
                      <select className="om-inp" value={form.newProductCondition}
                        onChange={e => setForm(f => ({ ...f, newProductCondition: e.target.value }))}>
                        {['Mới', 'Cũ - Như mới', 'Cũ - Còn tốt', 'Cũ - Có lỗi nhỏ'].map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Customer section */}
            <div className="om-section">
              <div className="om-section-title">Thông tin khách hàng</div>
              <div className="om-form-grid">
                <div className="om-fg" style={{ position: 'relative' }}>
                  <label className="om-lbl">Tên khách *</label>
                  <input className="om-inp" placeholder="Nguyễn Văn A" value={form.customer_name}
                    onChange={e => handleCustomerSearch(e.target.value, 'name')}
                    onFocus={() => handleCustomerSearch(form.customer_name, 'name', true)}
                    onBlur={() => setTimeout(() => setShowNameDropdown(false), 200)} />
                  {showNameDropdown && custSearchResults.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid var(--border)', borderRadius: 6, zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: 220, overflowY: 'auto', marginTop: 4 }}>
                      {custSearchResults.map(c => {
                        const dbC = dbCustomers.find(d => d.phone === c.phone)
                        return (
                          <div key={c.phone} style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => selectCustomer(c)}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name} · {c.phone}</div>
                              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.address || 'Chưa có địa chỉ'}</div>
                            </div>
                            {dbC && dbC.order_count != null && dbC.order_count > 0 && (
                              <span style={{ background: '#edf7f2', color: '#2a7a4b', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, flexShrink: 0, marginLeft: 8 }}>{dbC.order_count} đơn</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                <div className="om-fg" style={{ position: 'relative' }}>
                  <label className="om-lbl">SĐT *</label>
                  <input className="om-inp" placeholder="09xxxxxxxx" value={form.customer_phone}
                    onChange={e => handleCustomerSearch(e.target.value, 'phone')}
                    onFocus={() => handleCustomerSearch(form.customer_phone, 'phone', true)}
                    onBlur={() => setTimeout(() => setShowPhoneDropdown(false), 200)} />
                  {showPhoneDropdown && custSearchResults.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid var(--border)', borderRadius: 6, zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: 220, overflowY: 'auto', marginTop: 4 }}>
                      {custSearchResults.map(c => {
                        const dbC = dbCustomers.find(d => d.phone === c.phone)
                        return (
                          <div key={c.phone} style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => selectCustomer(c)}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600 }}>{c.phone} · {c.name}</div>
                              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.address || 'Chưa có địa chỉ'}</div>
                            </div>
                            {dbC && dbC.order_count != null && dbC.order_count > 0 && (
                              <span style={{ background: '#edf7f2', color: '#2a7a4b', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, flexShrink: 0, marginLeft: 8 }}>{dbC.order_count} đơn</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                <div className="om-fg om-fg-full" style={{ background: '#f8f9fa', padding: 12, borderRadius: 8, border: '1px solid #e9ecef' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <label className="om-lbl" style={{ margin: 0 }}>Địa chỉ giao hàng *</label>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                        <input type="radio" checked={form.spx_address_type === 'old'} onChange={() => setForm(f => ({ ...f, spx_address_type: 'old' }))} />
                        Địa chỉ cũ
                      </label>
                      <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                        <input type="radio" checked={form.spx_address_type === 'new'} onChange={() => setForm(f => ({ ...f, spx_address_type: 'new' }))} />
                        Địa chỉ mới
                      </label>
                    </div>
                  </div>
                  <div className="om-form-grid" style={{ gap: 8 }}>
                    <input className="om-inp" placeholder="Tỉnh / Thành phố" value={form.spx_province} onChange={e => setForm(f => ({ ...f, spx_province: e.target.value }))} />
                    {form.spx_address_type !== 'new' && (
                      <input className="om-inp" placeholder="Quận / Huyện" value={form.spx_district} onChange={e => setForm(f => ({ ...f, spx_district: e.target.value }))} />
                    )}
                    <input className="om-inp" placeholder="Phường / Xã" value={form.spx_ward} onChange={e => setForm(f => ({ ...f, spx_ward: e.target.value }))} />
                    <input className="om-inp" placeholder={form.spx_address_type === 'new' ? 'Địa chỉ chi tiết (nhập Quận/Huyện, Số nhà, Đường...)' : 'Số nhà, Tên đường, Thôn/Xóm...'} value={form.spx_detail} onChange={e => setForm(f => ({ ...f, spx_detail: e.target.value }))} />
                  </div>
                </div>
                <div className="om-fg om-fg-full">
                  <label className="om-lbl">Ghi chú</label>
                  <input className="om-inp" placeholder="Ghi chú thêm cho đơn hàng..." value={form.customer_note}
                    onChange={e => setForm(f => ({ ...f, customer_note: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* Shipping + Payment */}
            <div className="om-section">
              <div className="om-form-grid">
                <div className="om-fg">
                  <label className="om-lbl">Đơn vị vận chuyển</label>
                  <select className="om-inp" value={form.shipping_carrier}
                    onChange={e => setForm(f => ({ ...f, shipping_carrier: e.target.value }))}>
                    <option value="spx">Shopee Express (SPX)</option>
                    <option value="vnpost">VNPost</option>
                    <option value="viettelpost">ViettelPost</option>
                    <option value="other">Khác</option>
                  </select>
                </div>
                <div className="om-fg">
                  <label className="om-lbl">Mã vận đơn (nếu có)</label>
                  <input className="om-inp" placeholder="Nhập tracking..." value={form.tracking_number}
                    onChange={e => setForm(f => ({ ...f, tracking_number: e.target.value }))} />
                </div>
                
                {/* Dimensions & Weight */}
                <div className="om-fg om-fg-full" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  <div>
                    <label className="om-lbl">Cân nặng (g)</label>
                    <input className="om-inp" type="number" placeholder="500" value={form.weight_g} onChange={e => setForm(f => ({ ...f, weight_g: e.target.value }))} />
                  </div>
                  <div>
                    <label className="om-lbl">Dài (cm)</label>
                    <input className="om-inp" type="number" placeholder="10" value={form.length_cm} onChange={e => setForm(f => ({ ...f, length_cm: e.target.value }))} />
                  </div>
                  <div>
                    <label className="om-lbl">Rộng (cm)</label>
                    <input className="om-inp" type="number" placeholder="10" value={form.width_cm} onChange={e => setForm(f => ({ ...f, width_cm: e.target.value }))} />
                  </div>
                  <div>
                    <label className="om-lbl">Cao (cm)</label>
                    <input className="om-inp" type="number" placeholder="10" value={form.height_cm} onChange={e => setForm(f => ({ ...f, height_cm: e.target.value }))} />
                  </div>
                </div>

                <div className="om-fg om-fg-full">
                  <label className="om-lbl">Ghi chú giao hàng (In lên Bill)</label>
                  <input className="om-inp" placeholder="Ví dụ: Gọi khách trước khi giao..." value={form.delivery_note} onChange={e => setForm(f => ({ ...f, delivery_note: e.target.value }))} />
                </div>

                {form.shipping_carrier === 'spx' && (
                  <div className="om-fg om-fg-full" style={{ background: '#fff3e0', padding: 12, borderRadius: 8, border: '1px solid #ffd8a8', fontSize: 13 }}>
                    <div style={{ fontWeight: 600, color: '#d97706', marginBottom: 8 }}>Tuỳ chọn Shopee Express</div>
                    <div style={{ display: 'flex', gap: 16 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                        <input type="checkbox" checked={form.spx_service_view} onChange={e => setForm(f => ({ ...f, spx_service_view: e.target.checked }))} />
                        Cho xem hàng, không thử
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                        <input type="checkbox" checked={form.spx_service_partial} onChange={e => setForm(f => ({ ...f, spx_service_partial: e.target.checked }))} />
                        Giao hàng một phần
                      </label>
                    </div>
                    <div style={{ marginTop: 8, fontSize: 12, color: '#92400e' }}>
                      * Phí ship SPX mặc định do <strong>Người nhận thanh toán</strong>, do đó Tiền thu hộ (COD) sẽ không bao gồm cước vận chuyển.
                    </div>
                  </div>
                )}
                <div className="om-fg">
                  <label className="om-lbl">Phí vận chuyển (VNĐ)</label>
                  <input className="om-inp" type="number" placeholder="0"
                    value={form.shipping_fee}
                    disabled={form.is_free_shipping}
                    onChange={e => setForm(f => ({ ...f, shipping_fee: e.target.value }))} />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12, cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.is_free_shipping}
                      onChange={e => setForm(f => ({ ...f, is_free_shipping: e.target.checked, shipping_fee: e.target.checked ? '0' : f.shipping_fee }))} />
                    Miễn phí vận chuyển
                  </label>
                </div>
                <div className="om-fg">
                  <label className="om-lbl">Tổng tiền (VNĐ)</label>
                  <input className="om-inp" type="number" placeholder="0" value={form.total_amount}
                    onChange={e => setForm(f => ({ ...f, total_amount: e.target.value }))} />
                  {form.total_amount && <span className="om-price-preview">{fmtVND(Number(form.total_amount))}</span>}
                  {form.item_discount > 0 && <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>KM Hàng: -{fmtVND(form.item_discount)}</div>}
                  {form.shipping_discount > 0 && <div style={{ fontSize: 11, color: '#dc2626', marginTop: 2 }}>KM Ship: -{fmtVND(form.shipping_discount)}</div>}
                </div>
              </div>

              <div className="om-fg" style={{ marginTop: 10 }}>
                <label className="om-lbl">Thanh toán</label>
                <div className="om-radio-group">
                  <label className="om-radio-label">
                    <input type="radio" value="cod" checked={form.payment_method === 'cod'}
                      onChange={() => setForm(f => ({ ...f, payment_method: 'cod' }))} />
                    COD (Thanh toán khi nhận)
                  </label>
                  <label className="om-radio-label">
                    <input type="radio" value="bank_transfer" checked={form.payment_method === 'bank_transfer'}
                      onChange={() => setForm(f => ({ ...f, payment_method: 'bank_transfer' }))} />
                    Chuyển khoản
                  </label>
                </div>
              </div>

              {form.payment_method === 'bank_transfer' && (
                <div className="om-bank-info">
                  <div className="om-bank-details">
                    <div className="om-bank-row">
                      <span className="om-bank-key">Ngân hàng</span>
                      <span className="om-bank-val">{process.env.NEXT_PUBLIC_BANK_ID?.toUpperCase() ?? '—'}</span>
                    </div>
                    <div className="om-bank-row">
                      <span className="om-bank-key">Số tài khoản</span>
                      <span className="om-bank-val">{process.env.NEXT_PUBLIC_BANK_ACCOUNT ?? '—'}</span>
                    </div>
                    <div className="om-bank-row">
                      <span className="om-bank-key">Tên tài khoản</span>
                      <span className="om-bank-val">{process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME ?? '—'}</span>
                    </div>
                    {form.total_amount && <div className="om-bank-row">
                      <span className="om-bank-key">Số tiền</span>
                      <span className="om-bank-val" style={{ color: 'var(--green)', fontWeight: 700 }}>{fmtVND(Number(form.total_amount))}</span>
                    </div>}
                  </div>
                  {form.total_amount && process.env.NEXT_PUBLIC_BANK_ID && (
                    <div className="om-qr-wrap">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={vietQRUrl(form.total_amount)} alt="QR chuyển khoản" className="om-qr-img" />
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4, textAlign: 'center' }}>Quét để chuyển khoản</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* FB PSID */}
            <div className="om-section">
              <div className="om-form-grid">
                <div className="om-fg">
                  <label className="om-lbl">FB PSID (tuỳ chọn)</label>
                  <input className="om-inp" placeholder="Facebook Page Scoped ID" value={form.fb_psid}
                    onChange={e => setForm(f => ({ ...f, fb_psid: e.target.value }))} />
                </div>
                <div className="om-fg">
                  <label className="om-lbl">Người tạo đơn</label>
                  <input className="om-inp" placeholder="admin" value={form.created_by}
                    onChange={e => setForm(f => ({ ...f, created_by: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="om-modal-actions">
              <button className="om-btn-ghost" onClick={() => setShowCreateModal(false)}>Hủy</button>
              <button className="om-btn-primary" onClick={createOrder} disabled={saving}>
                {saving ? 'Đang tạo...' : 'Tạo đơn →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Order Modal ── */}
      {editOrder && (
        <div className="om-overlay" onClick={e => e.target === e.currentTarget && setEditOrder(null)}>
          <div className="om-modal">
            <div className="om-modal-header">
              <h3>Cập nhật đơn hàng</h3>
              <button className="om-close-btn" onClick={() => setEditOrder(null)}>✕</button>
            </div>

            {/* Order summary */}
            <div className="om-order-summary">
              <code className="om-order-code">{editOrder.order_number}</code>
              <div className="om-summary-detail">
                <span style={{ fontWeight: 500 }}>{editOrder.customer_name}</span>
                <span style={{ color: 'var(--muted)', fontSize: 12 }}> · {editOrder.customer_phone}</span>
              </div>
              {editOrder.customer_address && (
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{editOrder.customer_address}</div>
              )}
              {editOrder.fb_url && (
                <div style={{ marginTop: 4 }}>
                  <a href={editOrder.fb_url.startsWith('http') ? editOrder.fb_url : `https://${editOrder.fb_url}`}
                    target="_blank" rel="noopener noreferrer"
                    className="om-fb-link">
                    Facebook →
                  </a>
                </div>
              )}
            </div>

            {/* Items list */}
            <div className="om-section">
              <div className="om-section-title">Sản phẩm trong đơn</div>
              {editOrderItems.length === 0 && editOrder.item_title && (
                <div className="om-edit-item-row" style={{ color: 'var(--muted)', fontSize: 12 }}>
                  <span>{editOrder.item_title}</span>
                  {editOrder.item_price && <span>{fmtVND(editOrder.item_price)}</span>}
                </div>
              )}
              {editOrderItems.map(oi => (
                <div key={oi.id} className="om-edit-item-row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{oi.item_title}{oi.quantity > 1 ? ` ×${oi.quantity}` : ''}</div>
                    {oi.order_code && <code className="om-order-code" style={{ fontSize: 10, marginTop: 2, display: 'inline-block' }}>{oi.order_code}</code>}
                  </div>
                  <span style={{ color: 'var(--green)', fontWeight: 600, fontSize: 12, marginRight: 8, whiteSpace: 'nowrap' }}>{fmtVND(oi.item_price)}</span>
                  <button className="om-remove-item-btn" onClick={() => removeItemFromOrder(oi.id, editOrder.id)}>✕</button>
                </div>
              ))}

              {/* Add item */}
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.6px', color: 'var(--muted)', marginBottom: 6 }}>Thêm sản phẩm</div>
                <div className="om-item-search-wrap">
                  <input
                    className="om-inp"
                    placeholder="Tìm sản phẩm hoặc nhập tên..."
                    value={addItemSearch}
                    onChange={e => onAddItemSearchChange(e.target.value)}
                  />
                  {addItemLoading && <div className="om-spinner-sm" />}
                </div>
                {addItemResults.length > 0 && (
                  <div className="om-item-list">
                    {addItemResults.map(item => (
                      <button key={item.id} className="om-item-option" onClick={() => {
                        setSelectedAddItem(item)
                        setAddItemSearch(item.title)
                        setAddItemPrice(item.price ? String(item.price) : '')
                        setAddItemResults([])
                      }}>
                        <div className="om-item-opt-title">{item.title}</div>
                        <div className="om-item-opt-meta">
                          <span className="om-order-code" style={{ fontSize: 10 }}>{item.order_code}</span>
                          <span style={{ color: 'var(--green)', fontWeight: 600, fontSize: 12 }}>{fmtVND(item.price)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <input
                    className="om-inp"
                    type="number"
                    placeholder="Giá (VNĐ)"
                    value={addItemPrice}
                    onChange={e => setAddItemPrice(e.target.value)}
                    style={{ maxWidth: 130 }}
                  />
                  <button className="om-btn-primary" style={{ fontSize: 12, padding: '6px 12px' }}
                    onClick={() => addItemToOrder(editOrder.id)}
                    disabled={!addItemSearch.trim()}>
                    + Thêm
                  </button>
                </div>
              </div>
            </div>

            <div className="om-form-grid">
              <div className="om-fg">
                <label className="om-lbl">Trạng thái đơn</label>
                <select className="om-inp" value={editForm.order_status}
                  onChange={e => setEditForm(f => ({ ...f, order_status: e.target.value as Order['order_status'] }))}>
                  <option value="pending">Chờ xác nhận</option>
                  <option value="confirmed">Đã xác nhận</option>
                  <option value="shipping">Đang giao</option>
                  <option value="delivered">Đã giao</option>
                  <option value="cancelled">Đã huỷ</option>
                </select>
              </div>
              <div className="om-fg">
                <label className="om-lbl">TT Thanh toán</label>
                <select className="om-inp" value={editForm.payment_status}
                  onChange={e => setEditForm(f => ({ ...f, payment_status: e.target.value as Order['payment_status'] }))}>
                  <option value="pending">Chờ TT</option>
                  <option value="verified">Đã thanh toán</option>
                  <option value="failed">Thất bại</option>
                </select>
              </div>
              <div className="om-fg">
                <label className="om-lbl">Vận chuyển</label>
                <select className="om-inp" value={editForm.shipping_carrier}
                  onChange={e => setEditForm(f => ({ ...f, shipping_carrier: e.target.value }))}>
                  <option value="spx">Shopee Express (SPX)</option>
                  <option value="vnpost">VNPost</option>
                  <option value="viettelpost">ViettelPost</option>
                  <option value="other">Khác</option>
                </select>
              </div>
              <div className="om-fg">
                <label className="om-lbl">Mã vận đơn</label>
                <input className="om-inp" placeholder="Nhập mã tracking..." value={editForm.tracking_number}
                  onChange={e => setEditForm(f => ({ ...f, tracking_number: e.target.value }))} />
              </div>
              <div className="om-fg">
                <label className="om-lbl">Phí vận chuyển</label>
                <input className="om-inp" type="number" placeholder="0" value={editForm.shipping_fee}
                  onChange={e => setEditForm(f => ({ ...f, shipping_fee: e.target.value }))} />
              </div>
              <div className="om-fg om-fg-full" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                <div>
                  <label className="om-lbl">Cân nặng (g)</label>
                  <input className="om-inp" type="number" value={editForm.weight_g} onChange={e => setEditForm(f => ({ ...f, weight_g: e.target.value }))} />
                </div>
                <div>
                  <label className="om-lbl">Dài (cm)</label>
                  <input className="om-inp" type="number" value={editForm.length_cm} onChange={e => setEditForm(f => ({ ...f, length_cm: e.target.value }))} />
                </div>
                <div>
                  <label className="om-lbl">Rộng (cm)</label>
                  <input className="om-inp" type="number" value={editForm.width_cm} onChange={e => setEditForm(f => ({ ...f, width_cm: e.target.value }))} />
                </div>
                <div>
                  <label className="om-lbl">Cao (cm)</label>
                  <input className="om-inp" type="number" value={editForm.height_cm} onChange={e => setEditForm(f => ({ ...f, height_cm: e.target.value }))} />
                </div>
              </div>
              <div className="om-fg om-fg-full">
                <label className="om-lbl">Ghi chú giao hàng</label>
                <input className="om-inp" value={editForm.delivery_note} onChange={e => setEditForm(f => ({ ...f, delivery_note: e.target.value }))} />
              </div>
              <div className="om-fg om-fg-full" style={{ background: '#f8f9fa', padding: 12, borderRadius: 8, border: '1px solid #e9ecef' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <label className="om-lbl" style={{ margin: 0 }}>Địa chỉ giao hàng *</label>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                      <input type="radio" checked={editForm.spx_address_type === 'old'} onChange={() => setEditForm(f => ({ ...f, spx_address_type: 'old' }))} />
                      Địa chỉ cũ
                    </label>
                    <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                      <input type="radio" checked={editForm.spx_address_type === 'new'} onChange={() => setEditForm(f => ({ ...f, spx_address_type: 'new' }))} />
                      Địa chỉ mới
                    </label>
                  </div>
                </div>
                <div className="om-form-grid" style={{ gap: 8, marginBottom: 8 }}>
                  <input className="om-inp" placeholder="Tỉnh / Thành phố" value={editForm.spx_province} onChange={e => setEditForm(f => ({ ...f, spx_province: e.target.value }))} />
                  {editForm.spx_address_type !== 'new' && (
                    <input className="om-inp" placeholder="Quận / Huyện" value={editForm.spx_district} onChange={e => setEditForm(f => ({ ...f, spx_district: e.target.value }))} />
                  )}
                  <input className="om-inp" placeholder="Phường / Xã" value={editForm.spx_ward} onChange={e => setEditForm(f => ({ ...f, spx_ward: e.target.value }))} />
                  <input className="om-inp" placeholder={editForm.spx_address_type === 'new' ? 'Địa chỉ chi tiết (nhập Quận/Huyện, Số nhà...)' : 'Số nhà, Tên đường...'} value={editForm.spx_detail} onChange={e => setEditForm(f => ({ ...f, spx_detail: e.target.value }))} />
                </div>
              </div>
              {editForm.shipping_carrier === 'spx' && (
                <div className="om-fg om-fg-full" style={{ background: '#fff3e0', padding: 12, borderRadius: 8, border: '1px solid #ffd8a8' }}>
                  <div style={{ fontWeight: 600, color: '#d97706', marginBottom: 8, fontSize: 13 }}>Tùy chọn dịch vụ SPX</div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                      <input type="checkbox" checked={editForm.spx_service_view} onChange={e => setEditForm(f => ({ ...f, spx_service_view: e.target.checked }))} />
                      Cho xem hàng, không thử
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                      <input type="checkbox" checked={editForm.spx_service_partial} onChange={e => setEditForm(f => ({ ...f, spx_service_partial: e.target.checked }))} />
                      Giao hàng một phần
                    </label>
                  </div>
                </div>
              )}
              <div className="om-fg om-fg-full">
                <label className="om-lbl">Phương thức thanh toán</label>
                <div className="om-radio-group">
                  {(['cod', 'bank_transfer'] as const).map(m => (
                    <label key={m} className="om-radio-label">
                      <input type="radio" name="edit_pay_method" value={m}
                        checked={editForm.payment_method === m}
                        onChange={() => setEditForm(f => ({ ...f, payment_method: m }))} />
                      {m === 'cod' ? 'COD' : 'Chuyển khoản'}
                    </label>
                  ))}
                </div>
              </div>
              {editForm.payment_method === 'bank_transfer' && process.env.NEXT_PUBLIC_BANK_ID && (
                <div className="om-fg om-fg-full">
                  <div className="om-bank-info" style={{ marginTop: 0 }}>
                    <div className="om-bank-details">
                      <div className="om-bank-row"><span className="om-bank-key">Ngân hàng</span><span className="om-bank-val">{process.env.NEXT_PUBLIC_BANK_ID?.toUpperCase()}</span></div>
                      <div className="om-bank-row"><span className="om-bank-key">Số TK</span><span className="om-bank-val">{process.env.NEXT_PUBLIC_BANK_ACCOUNT}</span></div>
                      <div className="om-bank-row"><span className="om-bank-key">Số tiền</span><span className="om-bank-val" style={{ color: 'var(--green)', fontWeight: 700 }}>{fmtVND(editFinalTotal)}</span></div>
                      <div className="om-bank-row"><span className="om-bank-key">Nội dung</span><span className="om-bank-val">{editOrder.order_number}</span></div>
                      {editSd > 0 && <div className="om-bank-row"><span className="om-bank-key">Giảm ship</span><span className="om-bank-val" style={{ color: '#dc2626' }}>-{fmtVND(editSd)}</span></div>}
                    </div>
                    <div className="om-qr-wrap">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={vietQRUrlForOrder({ ...editOrder, payment_method: 'bank_transfer', total_amount: editItemsTotal, shipping_fee: editSf, shipping_discount: editSd })} alt="QR" className="om-qr-img" />
                    </div>
                  </div>
                </div>
              )}
              <div className="om-fg om-fg-full">
                <label className="om-lbl">FB PSID</label>
                <input className="om-inp" placeholder="Facebook Page Scoped ID để gửi thông báo" value={editForm.fb_psid}
                  onChange={e => setEditForm(f => ({ ...f, fb_psid: e.target.value }))} />
              </div>
            </div>

            {/* Notification buttons */}
            <div className="om-notif-row">
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.6px', color: 'var(--muted)', marginBottom: 6 }}>Thông báo Messenger</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button className="om-btn-messenger"
                  onClick={() => sendNotification({ ...editOrder, order_items: editOrderItems }, 'created', editForm.fb_psid || editOrder.fb_psid)}>
                  Gửi TB tạo đơn
                </button>
                <button className="om-btn-messenger"
                  onClick={() => sendNotification({ ...editOrder, tracking_number: editForm.tracking_number, shipping_carrier: editForm.shipping_carrier, order_items: editOrderItems }, 'shipping', editForm.fb_psid || editOrder.fb_psid)}>
                  Gửi TB vận chuyển
                </button>
                <button className="om-btn-print-sm"
                  onClick={() => printInvoice(editOrder)}>
                  In hóa đơn
                </button>
                <button className="om-btn-share-sm"
                  onClick={() => shareInvoice(editOrder)}>
                  Chia sẻ link
                </button>
              </div>
            </div>

            <div className="om-modal-actions">
              <button className="om-btn-ghost" onClick={() => setEditOrder(null)}>Hủy</button>
              <button className="om-btn-primary" onClick={() => {
                const editItemsTotal = editOrderItems.reduce((acc, oi) => acc + (oi.item_price ?? 0) * oi.quantity, 0) || (editOrder.item_price ?? 0)
                const editSf = editForm.shipping_fee ? Number(editForm.shipping_fee) : 0
                let editSd = 0
                if (editForm.payment_method === 'bank_transfer') {
                  if (editItemsTotal >= 500000) editSd = 50000
                  else if (editItemsTotal >= 200000) editSd = 20000
                }
                if (editSd > editSf) editSd = editSf

                const payload: Partial<Order> = {
                  order_status: editForm.order_status,
                  payment_status: editForm.payment_status,
                  payment_method: editForm.payment_method,
                  tracking_number: editForm.tracking_number || null,
                  shipping_carrier: editForm.shipping_carrier,
                  shipping_fee: editSf,
                  shipping_discount: editSd,
                  total_amount: editItemsTotal, // ensure total_amount stays accurate
                  fb_psid: editForm.fb_psid || null,
                  weight_g: editForm.weight_g ? Number(editForm.weight_g) : null,
                  length_cm: editForm.length_cm ? Number(editForm.length_cm) : null,
                  width_cm: editForm.width_cm ? Number(editForm.width_cm) : null,
                  height_cm: editForm.height_cm ? Number(editForm.height_cm) : null,
                  delivery_note: editForm.delivery_note || null,
                }

                const spxDist = editForm.spx_address_type === 'new' ? '' : editForm.spx_district
                const spxAddressParts = [editForm.spx_detail, editForm.spx_ward, spxDist, editForm.spx_province].filter(Boolean)
                if (spxAddressParts.length > 0) {
                  // Update the string representation for general UI
                  ;(payload as any).customer_address = spxAddressParts.join(', ')
                }
                payload.carrier_metadata = {
                  spx_address_type: editForm.spx_address_type,
                  spx_province: editForm.spx_province,
                  spx_district: spxDist,
                  spx_ward: editForm.spx_ward,
                  spx_detail: editForm.spx_detail,
                  spx_service_partial: editForm.spx_service_partial,
                  spx_service_view: editForm.spx_service_view
                }

                updateOrder(editOrder.id, payload)
              }} disabled={saving}>
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Print Invoice ── */}
      {printOrder && (
        <>
          <div className="om-overlay" onClick={e => e.target === e.currentTarget && setPrintOrder(null)}>
            <div className="om-modal om-modal-invoice">
              <div className="om-modal-header">
                <h3>Xem hóa đơn</h3>
                <button className="om-close-btn" onClick={() => setPrintOrder(null)}>✕</button>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button className="om-btn-primary" onClick={() => window.print()}>In hóa đơn</button>
                <button className="om-btn-ghost" onClick={() => setPrintOrder(null)}>Đóng</button>
              </div>
            </div>
          </div>

          {/* The actual printable area — Layout size A7 (74mm x 105mm) */}
          <div className="invoice-print-wrap">

            <div className="inv-shop">leviethoang<span>.shop</span></div>
            <div className="inv-doc-title">HÓA ĐƠN BÁN HÀNG</div>
            <div className="inv-divider" />

            {/* Order meta */}
            <div className="inv-inline-row">
              <strong>{printOrder.order_number}</strong>
              <span>{fmtDate(printOrder.created_at)}</span>
            </div>
            <div className="inv-tag">{printOrder.payment_method === 'cod' ? 'Thanh toán COD' : 'Chuyển khoản'}</div>

            <div className="inv-divider" />

            {/* Customer */}
            <div className="inv-customer-name">
              {printOrder.customer_name ? (printOrder.customer_name.split(' ').length > 1 ? printOrder.customer_name.split(' ')[0] + ' *** ' + printOrder.customer_name.split(' ').pop() : printOrder.customer_name.charAt(0) + '***') : ''} 
              {' · '} 
              {printOrder.customer_phone ? printOrder.customer_phone.substring(0, 3) + '****' + printOrder.customer_phone.substring(printOrder.customer_phone.length - 3) : ''}
            </div>
            <div className="inv-customer-addr">
              {printOrder.customer_address ? '***, ' + (printOrder.customer_address.split(',').pop()?.trim() || '') : ''}
            </div>
            {printOrder.customer_note && <div className="inv-customer-note">"{printOrder.customer_note}"</div>}

            <div className="inv-divider" />

            {/* Products */}
            <table className="inv-items-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Sản phẩm</th>
                  <th style={{ textAlign: 'right' }}>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {printOrder.order_items && printOrder.order_items.length > 0 ? (
                  printOrder.order_items.map(oi => (
                    <tr key={oi.id}>
                      <td>{oi.item_title}{oi.quantity > 1 ? ` ×${oi.quantity}` : ''}</td>
                      <td>{fmtVND(oi.item_price ? oi.item_price * oi.quantity : null)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td>{printOrder.items?.title || printOrder.item_title || '—'}</td>
                    <td>{fmtVND(printOrder.item_price)}</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Shipping & Discounts */}
            <div className="inv-divider" />
            <div className="inv-shipping">
              Phí ship ({CARRIER_LABEL[printOrder.shipping_carrier] || printOrder.shipping_carrier}): <strong style={{float:'right'}}>{fmtVND(printOrder.shipping_fee || 0)}</strong>
              {printOrder.tracking_number && <div className="inv-tracking" style={{marginTop:2}}>Mã VĐ: {printOrder.tracking_number}</div>}
            </div>
            {(printOrder.shipping_discount ?? 0) > 0 && (
              <div className="inv-shipping" style={{color:'#444'}}>
                Giảm giá phí ship: <strong style={{float:'right'}}>-{fmtVND(printOrder.shipping_discount)}</strong>
              </div>
            )}
            {(printOrder.item_discount ?? 0) > 0 && (
              <div className="inv-shipping" style={{color:'#444'}}>
                Khuyến mãi hàng: <strong style={{float:'right'}}>-{fmtVND(printOrder.item_discount)}</strong>
              </div>
            )}

            <div className="inv-divider" />
            <div className="inv-total-row">
              <span>TỔNG CỘNG</span>
              <span className="inv-total-val">{fmtVND((printOrder.total_amount ?? printOrder.item_price ?? 0) + (printOrder.shipping_fee ?? 0) - (printOrder.shipping_discount ?? 0))}</span>
            </div>

            {/* Payment Status */}
            <div className="inv-divider" />
            {printOrder.payment_status === 'verified' ? (
              <div style={{ textAlign: 'center', marginTop: '2mm', marginBottom: '1mm' }}>
                <div style={{ fontSize: '10pt', fontWeight: 800 }}>[ Đã thanh toán ]</div>
                <div style={{ fontSize: '8pt', color: '#444', marginTop: '1mm' }}>
                  {printOrder.payment_method === 'bank_transfer' ? 'Chuyển khoản' : 'COD'}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '8pt', color: '#444' }}>
                <span>Thanh toán: </span>
                <strong style={{ color: '#000' }}>
                  {printOrder.payment_method === 'bank_transfer' ? 'Chuyển khoản' : 'COD — Thanh toán khi nhận hàng'}
                </strong>
                {printOrder.payment_method === 'bank_transfer' && (
                  <div style={{ marginTop: '1mm', lineHeight: 1.4 }}>
                    <div>Ngân hàng: <strong>{process.env.NEXT_PUBLIC_BANK_ID?.toUpperCase()} - {process.env.NEXT_PUBLIC_BANK_ACCOUNT}</strong></div>
                    <div>Nội dung CK: <strong>{printOrder.order_number}</strong></div>
                  </div>
                )}
              </div>
            )}

            <div className="inv-footer">Cảm ơn quý khách!</div>
          </div>
        </>
      )}
    </>
  )
}

// ─── Styles ───────────────────────────────────────────────────────
const omStyles = `
/* ── Print invoice — Layout size A7 (74mm x 105mm) ── */
.invoice-print-wrap{display:none}
@page{size:74mm 105mm;margin:0}
@media print{
  html, body { 
    margin: 0 !important; padding: 0 !important; 
    min-height: 0 !important; height: auto !important; 
    background: white !important; 
  }
  header, footer, nav { display: none !important; }
  .om-header, .om-stats, .om-controls, .om-table-wrap, .om-pagination, .om-modal { display: none !important; }
  
  .om-modal-overlay {
    position: static !important;
    background: transparent !important;
    padding: 0 !important;
  }
  
  .invoice-print-wrap {
    display: block !important;
    width: 74mm;
    box-sizing: border-box;
    background: white;
    padding: 4mm 5mm;
    font-family: 'Be Vietnam Pro', Arial, Helvetica, sans-serif;
    font-size: 8.5pt;
    color: #000;
    line-height: 1.3;
    margin: 0;
    page-break-after: auto;
    page-break-inside: avoid;
  }
}
.inv-shop{font-size:13pt;font-weight:800;letter-spacing:-.3px;text-align:center;display:block}
.inv-shop span{font-weight:300;color:#555}
.inv-doc-title{font-size:8pt;font-weight:700;letter-spacing:1px;text-transform:uppercase;text-align:center;color:#444;margin-top:1mm}
.inv-divider{border:none;border-top:1px dashed #bbb;margin:1.5mm 0}
.inv-inline-row{display:flex;justify-content:space-between;align-items:baseline;font-size:8.5pt;gap:2mm}
.inv-inline-row strong{font-size:9pt;font-family:monospace;font-weight:700}
.inv-tag{font-size:8pt;color:#444;margin-top:.5mm;font-weight:600}
.inv-customer-name{font-size:9.5pt;font-weight:700;margin-top:.5mm}
.inv-customer-addr{font-size:8pt;color:#222;line-height:1.25;margin-top:.5mm}
.inv-customer-note{font-size:7.5pt;color:#555;font-style:italic;margin-top:.5mm}
.inv-items-table{width:100%;border-collapse:collapse;margin:1mm 0}
.inv-items-table th{font-size:7.5pt;font-weight:700;color:#555;padding:.5mm 0;border-bottom:1px solid #000;text-transform:uppercase}
.inv-items-table td{padding:1mm 0;font-size:8.5pt;line-height:1.25;vertical-align:top}
.inv-items-table td:last-child{text-align:right;font-weight:700;white-space:nowrap;padding-left:2mm;width:1%}
.inv-items-table tr:not(:last-child) td{border-bottom:1px dashed #ddd}
.inv-total-row{display:flex;justify-content:space-between;align-items:center;border-top:1.5px solid #000;border-bottom:1.5px solid #000;padding:1mm 0;margin:1mm 0;font-weight:800;font-size:9pt}
.inv-total-val{font-size:10.5pt;font-weight:900}
.inv-shipping{font-size:8pt;color:#333;margin-top:.5mm}
.inv-tracking{font-weight:700;color:#000}
.inv-bank-row{display:flex;justify-content:space-between;font-size:7.5pt;line-height:1.3}
.inv-bank-row span{color:#555}
.inv-qr-img{display:block;width:32mm;height:32mm;margin:1.5mm auto 0;border:1px solid #ddd}
.inv-footer{text-align:center;margin-top:1.5mm;padding-top:1mm;border-top:1px dashed #bbb;font-size:8pt;font-weight:700}

/* ── Stats ── */
.om-stats-wrap{border:1px solid var(--border,#e8e6e1);border-radius:10px;padding:14px 16px;margin-bottom:14px;background:var(--tag-bg,#f9f8f6)}
.om-stats-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;gap:8px;flex-wrap:wrap}
.om-stats-title{font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--muted,#8c8982)}
.om-range-tabs{display:flex;gap:2px;background:var(--border,#e8e6e1);border-radius:6px;padding:2px}
.om-range-tab{background:none;border:none;padding:4px 10px;border-radius:4px;font-family:inherit;font-size:11px;cursor:pointer;color:var(--muted,#8c8982);transition:all .15s;white-space:nowrap}
.om-range-tab.active{background:white;color:var(--text,#1a1916);font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.om-stats-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:8px}
.om-stat-card{background:white;border:1px solid var(--border,#e8e6e1);border-radius:8px;padding:10px 12px;min-width:0}
.om-stat-card-wide{grid-column:span 2}
.om-stat-card.om-stat-alert{border-color:#fbbf24;background:#fffbeb}
.om-stat-card.om-stat-unpaid{border-color:#fca5a5;background:#fef2f2}
.om-stat-label{font-size:10px;color:var(--muted,#8c8982);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:4px}
.om-stat-value{font-size:20px;font-weight:700;color:var(--text,#1a1916);line-height:1}
.om-stat-shipping{color:#7c3aed}
.om-stat-done{color:#2a7a4b}
.om-stat-cancel{color:#dc2626}
.om-stat-revenue{font-size:15px;color:#2a7a4b}
.om-stat-warn{font-size:15px;color:#dc2626}
.om-stat-blue{color:#2563eb}
.om-stat-new{border-color:#bfdbfe;background:#eff6ff}
.om-stats-divider{display:flex;align-items:center;gap:8px;margin:10px 0 8px;font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--muted,#8c8982)}
.om-stats-divider::before,.om-stats-divider::after{content:'';flex:1;height:1px;background:var(--border,#e8e6e1)}
.om-toggle-top{background:none;border:none;font-family:inherit;font-size:11px;color:var(--muted,#8c8982);cursor:pointer;padding:0;transition:color .15s}
.om-toggle-top:hover{color:var(--text,#1a1916)}
.om-top-cust-table{width:100%;border-collapse:collapse;margin-top:8px;font-size:12px}
.om-top-cust-table th{font-size:10px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;color:var(--muted,#8c8982);padding:4px 6px;border-bottom:1px solid var(--border,#e8e6e1);text-align:left}
.om-top-cust-table td{padding:6px 6px;border-bottom:1px dashed var(--border,#e8e6e1);color:var(--text,#1a1916)}
.om-top-cust-table tr:last-child td{border-bottom:none}
.om-top-cust-preview{display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;align-items:center}
.om-top-cust-chip{font-size:11px;background:var(--tag-bg,#f0efe9);border-radius:20px;padding:3px 9px;color:var(--text,#1a1916)}
.om-top-cust-chip strong{color:var(--accent,#1a1916)}

/* ── Order management layout ── */
.om-header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;flex-wrap:wrap}
.om-title{font-size:11px;font-weight:600;letter-spacing:.8px;text-transform:uppercase;color:var(--muted,#8c8982);display:flex;align-items:center;gap:8px}
.om-title::after{content:'';flex:1;height:1px;background:var(--border,#e8e6e1)}
.om-count{font-size:11px;font-weight:400;color:var(--muted,#8c8982);background:var(--tag-bg,#f0efe9);padding:1px 8px;border-radius:10px;text-transform:none;letter-spacing:0}
.om-header-controls{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.om-search-wrap{display:flex;align-items:center;gap:6px;background:var(--tag-bg,#f0efe9);border:1px solid var(--border,#e8e6e1);border-radius:7px;padding:6px 10px;transition:border-color .15s}
.om-search-wrap:focus-within{border-color:var(--accent,#1a1916);background:white}
.om-search-wrap svg{flex-shrink:0;color:var(--muted,#8c8982)}
.om-search{border:none;outline:none;background:transparent;font-family:inherit;font-size:13px;color:var(--text,#1a1916);min-width:180px}
.om-search::placeholder{color:var(--muted,#8c8982)}
.om-search-clear{background:none;border:none;cursor:pointer;color:var(--muted,#8c8982);font-size:11px;padding:0;line-height:1}
.om-search-clear:hover{color:var(--text,#1a1916)}

/* filter chips */
.om-filter-bar{display:flex;align-items:center;gap:6px;margin-bottom:16px;flex-wrap:wrap}
.om-chip{background:none;border:1px solid var(--border,#e8e6e1);padding:5px 12px;border-radius:20px;font-family:inherit;font-size:12px;cursor:pointer;color:var(--muted,#8c8982);transition:all .15s;white-space:nowrap}
.om-chip:hover{border-color:var(--accent,#1a1916);color:var(--text,#1a1916)}
.om-chip-active.om-chip-all{background:var(--accent,#1a1916);border-color:var(--accent,#1a1916);color:white}
.om-chip-active.om-chip-pending{background:#f97316;border-color:#f97316;color:white}
.om-chip-active.om-chip-confirmed{background:#3b82f6;border-color:#3b82f6;color:white}
.om-chip-active.om-chip-shipping{background:#8b5cf6;border-color:#8b5cf6;color:white}
.om-chip-active.om-chip-delivered{background:#16a34a;border-color:#16a34a;color:white}
.om-chip-active.om-chip-cancelled{background:#ef4444;border-color:#ef4444;color:white}
.om-btn-refresh{padding:5px 10px;font-size:15px;line-height:1}

/* table */
.om-table-wrap{overflow-x:auto;border:1px solid var(--border,#e8e6e1);border-radius:10px}
.om-table{width:100%;border-collapse:collapse;font-size:13px}
.om-table th{background:var(--tag-bg,#f0efe9);padding:10px 13px;text-align:left;font-size:10px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;color:var(--muted,#8c8982);border-bottom:1px solid var(--border,#e8e6e1);white-space:nowrap}
.om-table td{padding:11px 13px;border-bottom:1px solid var(--border,#e8e6e1);vertical-align:top}
.om-table tr:last-child td{border-bottom:none}
.om-table tr:hover td{background:#fdfcfb}
.om-row-selected td{background:#f0f4ff!important}
.om-row-selected:hover td{background:#e8effe!important}
.om-order-code{background:var(--tag-bg,#f0efe9);padding:2px 6px;border-radius:4px;font-size:11px;font-family:monospace;color:var(--muted,#8c8982)}
.om-td-product{max-width:180px}
.om-product-title{font-weight:500;font-size:13px;line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px}
.om-product-price{font-size:11px;color:var(--green,#2a7a4b);font-weight:600;margin-top:1px}
.om-actions{display:flex;gap:4px}
.om-btn-edit{background:none;border:1px solid var(--border,#e8e6e1);padding:3px 9px;border-radius:5px;font-family:inherit;font-size:11px;cursor:pointer;color:var(--muted,#8c8982);transition:all .15s}
.om-btn-edit:hover{border-color:#3b82f6;color:#3b82f6}
.om-btn-print{background:none;border:1px solid var(--border,#e8e6e1);padding:3px 9px;border-radius:5px;font-family:inherit;font-size:11px;cursor:pointer;color:var(--muted,#8c8982);transition:all .15s}
.om-btn-print:hover{border-color:#8b5cf6;color:#8b5cf6}
.om-btn-delete{background:none;border:1px solid #fcd0cc;padding:3px 9px;border-radius:5px;font-family:inherit;font-size:11px;cursor:pointer;color:var(--red,#c0392b);transition:background .15s}
.om-btn-delete:hover{background:#fff0ee}

/* status badges */
.om-badge{display:inline-block;font-size:10px;font-weight:600;padding:2px 8px;border-radius:10px;white-space:nowrap}
.om-status-pending{background:#fff7ed;color:#c2410c}
.om-status-confirmed{background:#eff6ff;color:#1d4ed8}
.om-status-shipping{background:#f5f3ff;color:#6d28d9}
.om-status-delivered{background:#f0fdf4;color:#15803d}
.om-status-cancelled{background:#fef2f2;color:#b91c1c}
.om-pay-pending{background:#fff7ed;color:#c2410c}
.om-pay-verified{background:#f0fdf4;color:#15803d}
.om-pay-failed{background:#fef2f2;color:#b91c1c}

/* empty */
.om-empty{text-align:center;padding:48px 20px;color:var(--muted,#8c8982);display:flex;align-items:center;justify-content:center;gap:10px;flex-direction:column}
.om-empty-icon{font-size:32px}
.om-empty p{font-size:13px}

/* spinner */
.om-spinner{width:16px;height:16px;border:2px solid var(--border,#e8e6e1);border-top-color:var(--muted,#8c8982);border-radius:50%;animation:om-spin .7s linear infinite;flex-shrink:0}
.om-spinner-sm{width:12px;height:12px;border:1.5px solid var(--border,#e8e6e1);border-top-color:var(--muted,#8c8982);border-radius:50%;animation:om-spin .7s linear infinite;flex-shrink:0}
@keyframes om-spin{to{transform:rotate(360deg)}}

/* overlay / modal */
.om-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px}
.om-modal{background:white;border-radius:12px;padding:24px;width:100%;max-width:480px;animation:om-fadeIn .2s ease;max-height:90vh;overflow-y:auto}
.om-modal-create{max-width:600px}
.om-modal-invoice{max-width:440px}
@keyframes om-fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.om-modal-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
.om-modal-header h3{font-size:16px;font-weight:600}
.om-close-btn{background:none;border:none;cursor:pointer;color:var(--muted,#8c8982);font-size:14px;padding:2px 6px;border-radius:4px;transition:color .15s}
.om-close-btn:hover{color:var(--text,#1a1916)}
.om-modal-actions{display:flex;gap:8px;justify-content:flex-end;padding-top:14px;border-top:1px solid var(--border,#e8e6e1);margin-top:4px}

/* section inside modal */
.om-section{border:1px solid var(--border,#e8e6e1);border-radius:9px;padding:14px;margin-bottom:12px}
.om-section-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--muted,#8c8982);margin-bottom:10px}

/* form elements */
.om-lbl{font-size:10px;font-weight:500;letter-spacing:.6px;text-transform:uppercase;color:var(--muted,#8c8982);display:block;margin-bottom:4px}
.om-inp{font-size:13px;color:var(--text,#1a1916);background:var(--tag-bg,#f0efe9);border:1px solid var(--border,#e8e6e1);border-radius:6px;padding:7px 9px;font-family:inherit;width:100%;outline:none;transition:border-color .15s}
.om-inp:focus{border-color:var(--accent,#1a1916);background:white}
.om-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.om-fg{display:flex;flex-direction:column;gap:3px}
.om-fg-full{grid-column:1/-1}
.om-price-preview{font-size:11px;color:var(--green,#2a7a4b);font-weight:500;padding:1px 0}

/* radio */
.om-radio-group{display:flex;gap:16px;margin-top:2px}
.om-radio-label{display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;color:var(--text,#1a1916)}
.om-radio-label input{accent-color:var(--accent,#1a1916);width:14px;height:14px;cursor:pointer}

/* bank transfer */
.om-bank-info{display:flex;gap:16px;align-items:flex-start;background:var(--tag-bg,#f0efe9);border-radius:8px;padding:12px;margin-top:10px}
.om-bank-details{flex:1;display:flex;flex-direction:column;gap:5px}
.om-bank-row{display:flex;gap:8px;align-items:center;font-size:12px}
.om-bank-key{min-width:90px;color:var(--muted,#8c8982);font-size:11px}
.om-bank-val{font-weight:500;color:var(--text,#1a1916)}
.om-qr-wrap{display:flex;flex-direction:column;align-items:center;flex-shrink:0}
.om-qr-img{width:110px;height:110px;border:1px solid var(--border,#e8e6e1);border-radius:8px;display:block}

/* item search */
.om-item-search-wrap{position:relative;display:flex;align-items:center;gap:8px}
.om-item-search-wrap .om-inp{flex:1}
.om-item-list{border:1px solid var(--border,#e8e6e1);border-radius:8px;overflow:hidden;max-height:220px;overflow-y:auto;margin-top:6px}
.om-item-option{display:block;width:100%;background:none;border:none;border-bottom:1px solid var(--border,#e8e6e1);padding:9px 12px;cursor:pointer;font-family:inherit;text-align:left;transition:background .1s}
.om-item-option:last-child{border-bottom:none}
.om-item-option:hover{background:var(--tag-bg,#f0efe9)}
.om-item-opt-title{font-size:13px;font-weight:500;color:var(--text,#1a1916);margin-bottom:3px}
.om-item-opt-meta{display:flex;align-items:center;gap:8px}
.om-selected-item{display:flex;align-items:center;justify-content:space-between;background:#eef4ff;border:1px solid #d4dfff;border-radius:7px;padding:7px 12px;font-size:12px;color:#2d3a8c;margin-top:6px}
.om-clear-item{background:none;border:none;cursor:pointer;color:#6b7fd4;font-size:12px;padding:0;line-height:1}
.om-link-btn{background:none;border:none;color:#3b82f6;cursor:pointer;font-family:inherit;font-size:12px;text-decoration:underline;padding:0;margin-top:6px;display:inline-block}
.om-link-btn:hover{color:#1d4ed8}

/* new product inline */
.om-new-product-form{border:1px dashed #d4dfff;border-radius:8px;padding:12px;background:#f8f9ff}
.om-new-product-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}

/* edit order summary */
.om-order-summary{background:var(--tag-bg,#f0efe9);border-radius:8px;padding:10px 12px;margin-bottom:14px;font-size:13px}
.om-summary-detail{margin-top:4px;font-size:13px}
.om-fb-link{font-size:12px;color:#1877f2;text-decoration:none;font-weight:500}
.om-fb-link:hover{text-decoration:underline}

/* items in edit modal */
.om-edit-item-row{display:flex;align-items:center;gap:6px;padding:6px 0;border-bottom:1px dashed var(--border,#e8e6e1)}
.om-edit-item-row:last-of-type{border-bottom:none}
.om-remove-item-btn{background:none;border:none;cursor:pointer;color:var(--muted,#8c8982);font-size:11px;padding:2px 4px;border-radius:3px;line-height:1;flex-shrink:0}
.om-remove-item-btn:hover{color:#ef4444;background:#fef2f2}

/* notification */
.om-notif-row{border:1px solid var(--border,#e8e6e1);border-radius:8px;padding:12px;margin-top:12px;margin-bottom:12px}
.om-btn-messenger{display:inline-flex;align-items:center;gap:5px;background:#0084ff;color:white;border:none;padding:6px 12px;border-radius:6px;font-family:inherit;font-size:12px;font-weight:500;cursor:pointer;transition:opacity .15s}
.om-btn-messenger:hover{opacity:.85}
.om-btn-print-sm{display:inline-flex;align-items:center;gap:5px;background:#8b5cf6;color:white;border:none;padding:6px 12px;border-radius:6px;font-family:inherit;font-size:12px;font-weight:500;cursor:pointer;transition:opacity .15s}
.om-btn-print-sm:hover{opacity:.85}
.om-btn-share-sm{display:inline-flex;align-items:center;gap:5px;background:#0ea5e9;color:white;border:none;padding:6px 12px;border-radius:6px;font-family:inherit;font-size:12px;font-weight:500;cursor:pointer;transition:opacity .15s}
.om-btn-share-sm:hover{opacity:.85}
.om-btn-share{background:none;border:1px solid var(--border,#e8e6e1);padding:3px 8px;border-radius:5px;font-family:inherit;font-size:13px;cursor:pointer;color:var(--muted,#8c8982);transition:all .15s;line-height:1}
.om-btn-share:hover{border-color:#0ea5e9;color:#0ea5e9}

/* buttons */
.om-btn-primary{background:var(--accent,#1a1916);color:white;border:none;padding:8px 16px;border-radius:7px;font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:opacity .15s;white-space:nowrap}
.om-btn-primary:hover{opacity:.85}
.om-btn-primary:disabled{opacity:.45;cursor:not-allowed}
.om-btn-ghost{background:none;border:1px solid var(--border,#e8e6e1);padding:7px 14px;border-radius:7px;font-family:inherit;font-size:13px;cursor:pointer;color:var(--muted,#8c8982);display:inline-flex;align-items:center;gap:6px;transition:all .15s;white-space:nowrap}
.om-btn-ghost:hover{border-color:var(--accent,#1a1916);color:var(--text,#1a1916)}
.om-btn-ghost:disabled{opacity:.45;cursor:not-allowed}

@media(max-width:640px){
  .om-header{flex-direction:column;align-items:flex-start}
  .om-header-controls{width:100%}
  .om-search{min-width:120px}
  .om-form-grid{grid-template-columns:1fr}
  .om-bank-info{flex-direction:column}
  .om-qr-wrap{align-items:flex-start}
  .om-table{font-size:12px}
  .om-table th,.om-table td{padding:8px 9px}
  .om-stats-grid{grid-template-columns:repeat(3,1fr)}
  .om-stat-card-wide{grid-column:span 3!important}
  .om-top-cust-table td:nth-child(5),.om-top-cust-table th:nth-child(5){display:none}
  .om-stat-value{font-size:16px}
}
`

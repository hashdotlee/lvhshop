export function formatPrice(price: number): string {
  if (price >= 1_000_000) {
    const m = price / 1_000_000
    return `${m % 1 === 0 ? m : m.toFixed(1)} triệu`
  }
  if (price >= 1_000) {
    return `${(price / 1_000).toFixed(0)}k`
  }
  return price.toLocaleString('vi-VN') + 'đ'
}

export function formatRelativeTime(ms: number): string {
  const diff = Date.now() - ms
  if (diff < 60_000) return 'Vừa xong'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} phút trước`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} giờ trước`
  if (diff < 2_592_000_000) return `${Math.floor(diff / 86_400_000)} ngày trước`
  return new Date(ms).toLocaleDateString('vi-VN')
}

export function conditionColor(condition: string): { bg: string; fg: string } {
  const c = condition.toLowerCase()
  if (c.includes('mới') && !c.includes('như')) return { bg: '#dcfce7', fg: '#16a34a' }
  if (c.includes('như mới')) return { bg: '#d1fae5', fg: '#059669' }
  if (c.includes('cũ') || c.includes('đã dùng') || c.includes('đã qua')) return { bg: '#fef3c7', fg: '#d97706' }
  return { bg: '#f3f4f6', fg: '#6b7280' }
}

export function searchFilter(item: { title: string; description: string; category: string; location: string; tags: string[]; seller: { name: string } | null }, query: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  return (
    item.title.toLowerCase().includes(q) ||
    item.description.toLowerCase().includes(q) ||
    item.category.toLowerCase().includes(q) ||
    item.location.toLowerCase().includes(q) ||
    item.tags.some(t => t.toLowerCase().includes(q)) ||
    (item.seller?.name.toLowerCase().includes(q) ?? false)
  )
}

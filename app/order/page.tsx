import type { Metadata } from 'next'
import OrderClient from './client'

export const metadata: Metadata = {
  title: 'Đặt hàng — leviethoang.shop',
  description: 'Đặt hàng trực tuyến tại leviethoang.shop — Hàng Nhật chọn lọc, giao hàng toàn quốc.',
}

export default function OrderPage() {
  return <OrderClient />
}

import type { Metadata } from 'next'
import MyOrdersClient from './client'

export const metadata: Metadata = {
  title: 'Đơn hàng của tôi — leviethoang.shop',
  description: 'Theo dõi và tra cứu đơn hàng của bạn tại leviethoang.shop',
}

export default function MyOrdersPage() {
  return <MyOrdersClient />
}

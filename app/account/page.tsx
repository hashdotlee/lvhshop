import type { Metadata } from 'next'
import AccountClient from './client'

export const metadata: Metadata = {
  title: 'Tài khoản — leviethoang.shop',
}

export default function AccountPage() {
  return <AccountClient />
}

import UsersClient from './client'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Duyệt Tài Khoản Khách Hàng - Admin',
}

export default function UsersPage() {
  return <UsersClient />
}

import AccountingClient from './client'

export const metadata = {
  title: 'Kế toán & Tính thuế GTGT/TNCN | leviethoang.shop',
  description: 'Module kế toán, báo cáo doanh thu, tính thuế GTGT và thuế TNCN theo Thông tư 40/2021/TT-BTC',
}

export default function AccountingPage() {
  return <AccountingClient />
}

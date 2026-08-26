import Link from 'next/link'

export default function Footer() {
  return (
    <footer style={{ background: '#1a1916', color: '#f9f8f6', padding: '40px 20px', marginTop: 'auto' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '32px' }}>
        
        {/* Brand */}
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>leviethoang<span style={{ color: '#8c8982', fontWeight: 300 }}>.shop</span></div>
          <p style={{ fontSize: 13, color: '#a3a199', lineHeight: 1.6, marginBottom: 12 }}>
            Chuyên hàng Nhật độc lạ, đồ nội địa tuyển chọn và các sản phẩm tiêu dùng thiết yếu với giá tốt nhất.
          </p>
          <div style={{ fontSize: 13, color: '#a3a199' }}>
            <strong>Hotline:</strong> 092.845.3008<br />
            <strong>Email:</strong> hashdotlee@gmail.com<br />
            <strong>Địa chỉ:</strong> Số 55, ngõ 521 đường Cổ Nhuế, Đông Ngạc, Hà Nội
          </div>
        </div>

        {/* Links */}
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16 }}>Về chúng tôi</div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <li><Link href="/" style={{ color: '#a3a199', textDecoration: 'none', fontSize: 14 }}>Trang chủ</Link></li>
            <li><Link href="/account" style={{ color: '#a3a199', textDecoration: 'none', fontSize: 14 }}>Tài khoản của tôi</Link></li>
            <li><Link href="/order" style={{ color: '#a3a199', textDecoration: 'none', fontSize: 14 }}>Đăng nhập / Đăng ký</Link></li>
            <li><a href="https://fb.com/leviethoang.shop" target="_blank" rel="noreferrer" style={{ color: '#a3a199', textDecoration: 'none', fontSize: 14 }}>Fanpage Facebook</a></li>
          </ul>
        </div>

        {/* Policies */}
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16 }}>Chính sách</div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <li><Link href="/policies/terms" style={{ color: '#a3a199', textDecoration: 'none', fontSize: 14 }}>Quy định chung & Điều khoản</Link></li>
            <li><Link href="/policies/privacy" style={{ color: '#a3a199', textDecoration: 'none', fontSize: 14 }}>Chính sách bảo mật</Link></li>
            <li><Link href="/policies/shipping" style={{ color: '#a3a199', textDecoration: 'none', fontSize: 14 }}>Chính sách giao hàng</Link></li>
            <li><Link href="/policies/refund" style={{ color: '#a3a199', textDecoration: 'none', fontSize: 14 }}>Chính sách đổi trả & hoàn tiền</Link></li>
          </ul>
        </div>

      </div>
      
      <div style={{ maxWidth: 1000, margin: '32px auto 0', paddingTop: 20, borderTop: '1px solid #33322d', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ fontSize: 12, color: '#8c8982' }}>
          &copy; {new Date().getFullYear()} leviethoang.shop. Tất cả các quyền được bảo lưu.
        </div>
        {/* Bo Cong Thuong logo */}
        <a href="http://online.gov.vn" target="_blank" rel="noreferrer" style={{ display: 'inline-block' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="http://online.gov.vn/Content/EndUser/LogoCCDVSaleNoti/logoCCDV.png" alt="Đã thông báo Bộ Công Thương" width="130" style={{ opacity: 0.8 }} />
        </a>
      </div>
    </footer>
  )
}

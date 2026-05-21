import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Chính sách bảo mật — leviethoang.shop',
  description: 'Chính sách bảo mật và quyền riêng tư của leviethoang.shop',
}

const SITE = 'https://leviethoang.shop'
const CONTACT_EMAIL = 'contact@leviethoang.shop'
const UPDATED = '21/05/2026'

export default function PrivacyPage() {
  return (
    <>
      <style>{css}</style>
      <div className="pp-page">
        <header className="pp-header">
          <a href="/" className="pp-logo">leviethoang<span>.shop</span></a>
        </header>
        <main className="pp-main">
          <h1 className="pp-title">Chính sách bảo mật</h1>
          <p className="pp-updated">Cập nhật lần cuối: {UPDATED}</p>

          <section className="pp-section">
            <h2>1. Giới thiệu</h2>
            <p>
              leviethoang.shop (&quot;chúng tôi&quot;) cam kết bảo vệ thông tin cá nhân của bạn.
              Chính sách này mô tả cách chúng tôi thu thập, sử dụng và bảo vệ dữ liệu khi bạn
              sử dụng dịch vụ tại <a href={SITE}>{SITE}</a>.
            </p>
          </section>

          <section className="pp-section">
            <h2>2. Thông tin chúng tôi thu thập</h2>
            <p>Khi bạn đặt hàng hoặc liên hệ, chúng tôi có thể thu thập:</p>
            <ul>
              <li>Họ tên, số điện thoại, địa chỉ giao hàng</li>
              <li>Thông tin đơn hàng (sản phẩm, giá trị, phương thức thanh toán)</li>
              <li>Tin nhắn bạn gửi qua Facebook Messenger hoặc form liên hệ</li>
              <li>Dữ liệu truy cập tự động: địa chỉ IP, loại trình duyệt, trang đã xem (qua Google Analytics)</li>
            </ul>
          </section>

          <section className="pp-section">
            <h2>3. Mục đích sử dụng thông tin</h2>
            <ul>
              <li>Xử lý và giao đơn hàng của bạn</li>
              <li>Liên hệ xác nhận đơn hàng qua điện thoại hoặc Messenger</li>
              <li>Thông báo trạng thái vận chuyển</li>
              <li>Cải thiện dịch vụ và trải nghiệm người dùng</li>
              <li>Tuân thủ các yêu cầu pháp lý</li>
            </ul>
          </section>

          <section className="pp-section">
            <h2>4. Chia sẻ thông tin</h2>
            <p>
              Chúng tôi không bán hoặc chia sẻ thông tin cá nhân của bạn với bên thứ ba, ngoại trừ:
            </p>
            <ul>
              <li>Đơn vị vận chuyển (Shopee Express, ViettelPost) để thực hiện giao hàng</li>
              <li>Nhà cung cấp thanh toán khi xử lý giao dịch</li>
              <li>Khi có yêu cầu từ cơ quan pháp luật</li>
            </ul>
          </section>

          <section className="pp-section">
            <h2>5. Facebook & Messenger</h2>
            <p>
              Nếu bạn liên hệ qua Facebook Messenger, chúng tôi có thể nhận được Page-Scoped User ID (PSID)
              của bạn để gửi thông báo đơn hàng. Chúng tôi chỉ sử dụng thông tin này để liên lạc về
              đơn hàng của bạn và không dùng cho mục đích marketing không liên quan.
            </p>
          </section>

          <section className="pp-section">
            <h2>6. Bảo mật dữ liệu</h2>
            <p>
              Dữ liệu được lưu trữ trên Supabase (PostgreSQL) với các biện pháp bảo mật tiêu chuẩn
              ngành. Chúng tôi sử dụng HTTPS cho toàn bộ giao tiếp.
            </p>
          </section>

          <section className="pp-section">
            <h2>7. Quyền của bạn</h2>
            <p>Bạn có quyền:</p>
            <ul>
              <li>Yêu cầu xem thông tin cá nhân chúng tôi đang lưu</li>
              <li>Yêu cầu chỉnh sửa thông tin không chính xác</li>
              <li>Yêu cầu xóa dữ liệu cá nhân (xem <a href="/data-deletion">trang xóa dữ liệu</a>)</li>
            </ul>
          </section>

          <section className="pp-section">
            <h2>8. Cookie</h2>
            <p>
              Chúng tôi sử dụng cookie phiên để duy trì trạng thái đăng nhập admin và Google Analytics
              để phân tích lưu lượng truy cập ẩn danh.
            </p>
          </section>

          <section className="pp-section">
            <h2>9. Liên hệ</h2>
            <p>
              Mọi câu hỏi về chính sách bảo mật, vui lòng liên hệ:{' '}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </p>
          </section>
        </main>

        <footer className="pp-footer">
          <a href="/">&larr; Về trang chủ</a>
          <span>·</span>
          <a href="/data-deletion">Xóa dữ liệu</a>
        </footer>
      </div>
    </>
  )
}

const css = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Be Vietnam Pro',sans-serif;background:#f9f8f6;color:#1a1916;line-height:1.7;font-size:15px}
.pp-page{min-height:100vh;display:flex;flex-direction:column}
.pp-header{padding:16px 32px;background:#fff;border-bottom:1px solid #e8e6e1}
.pp-logo{font-size:16px;font-weight:600;color:#1a1916;text-decoration:none}
.pp-logo span{color:#8c8982;font-weight:300}
.pp-main{max-width:720px;margin:0 auto;padding:48px 24px;flex:1}
.pp-title{font-size:28px;font-weight:700;margin-bottom:6px}
.pp-updated{font-size:13px;color:#8c8982;margin-bottom:36px}
.pp-section{margin-bottom:28px}
.pp-section h2{font-size:16px;font-weight:600;margin-bottom:10px;color:#1a1916}
.pp-section p{margin-bottom:8px;color:#3a3936}
.pp-section ul{padding-left:20px;color:#3a3936}
.pp-section ul li{margin-bottom:5px}
.pp-section a{color:#2563eb;text-decoration:none}
.pp-section a:hover{text-decoration:underline}
.pp-footer{max-width:720px;margin:0 auto;padding:20px 24px 40px;display:flex;gap:12px;align-items:center;font-size:13px;color:#8c8982;border-top:1px solid #e8e6e1}
.pp-footer a{color:#8c8982;text-decoration:none}
.pp-footer a:hover{color:#1a1916}
`

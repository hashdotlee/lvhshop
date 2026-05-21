import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Xóa dữ liệu — leviethoang.shop',
  description: 'Hướng dẫn yêu cầu xóa dữ liệu cá nhân tại leviethoang.shop',
}

const CONTACT_EMAIL = 'contact@leviethoang.shop'
const UPDATED = '21/05/2026'

export default function DataDeletionPage() {
  return (
    <>
      <style>{css}</style>
      <div className="dd-page">
        <header className="dd-header">
          <a href="/" className="dd-logo">leviethoang<span>.shop</span></a>
        </header>

        <main className="dd-main">
          <h1 className="dd-title">Xóa dữ liệu cá nhân</h1>
          <p className="dd-updated">Cập nhật lần cuối: {UPDATED}</p>

          <div className="dd-intro">
            Theo quy định của Meta (Facebook) và các tiêu chuẩn bảo mật, bạn có quyền yêu cầu
            xóa toàn bộ dữ liệu cá nhân mà chúng tôi đang lưu trữ liên quan đến tài khoản Facebook
            hoặc thông tin đơn hàng của bạn.
          </div>

          <section className="dd-section">
            <h2>Dữ liệu chúng tôi có thể lưu trữ</h2>
            <ul>
              <li>Họ tên, số điện thoại, địa chỉ giao hàng từ đơn hàng</li>
              <li>Lịch sử đơn hàng (sản phẩm, giá, trạng thái)</li>
              <li>Facebook Page-Scoped User ID (PSID) nếu bạn liên hệ qua Messenger</li>
            </ul>
          </section>

          <section className="dd-section">
            <h2>Cách yêu cầu xóa dữ liệu</h2>
            <p>Gửi email đến địa chỉ bên dưới với tiêu đề <strong>&quot;Yêu cầu xóa dữ liệu&quot;</strong> và kèm theo:</p>
            <ol>
              <li>Họ tên hoặc số điện thoại đã dùng khi đặt hàng</li>
              <li>Mã đơn hàng (nếu có, định dạng DH-XXXXXXXX-XXXX)</li>
              <li>Facebook ID hoặc tên tài khoản Messenger (nếu muốn xóa dữ liệu liên quan FB)</li>
            </ol>

            <a className="dd-email-btn" href={`mailto:${CONTACT_EMAIL}?subject=Yêu cầu xóa dữ liệu`}>
              Gửi yêu cầu tới {CONTACT_EMAIL}
            </a>
          </section>

          <section className="dd-section">
            <h2>Thời gian xử lý</h2>
            <p>
              Chúng tôi sẽ xử lý yêu cầu và xác nhận xóa dữ liệu trong vòng <strong>7 ngày làm việc</strong>.
              Một số dữ liệu có thể được giữ lại nếu cần thiết để tuân thủ nghĩa vụ pháp lý
              (ví dụ: hóa đơn tài chính theo quy định thuế).
            </p>
          </section>

          <section className="dd-section">
            <h2>Xóa kết nối Facebook</h2>
            <p>
              Để thu hồi quyền truy cập của ứng dụng từ phía Facebook, bạn có thể thực hiện
              trực tiếp trong cài đặt Facebook:
            </p>
            <ol>
              <li>Vào <strong>Facebook → Cài đặt &amp; quyền riêng tư → Cài đặt</strong></li>
              <li>Chọn <strong>Ứng dụng và trang web</strong></li>
              <li>Tìm <strong>leviethoang.shop</strong> và nhấn <strong>Xóa</strong></li>
            </ol>
          </section>

          <section className="dd-section">
            <h2>Liên hệ</h2>
            <p>
              Mọi câu hỏi hoặc thắc mắc, vui lòng liên hệ:{' '}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </p>
          </section>
        </main>

        <footer className="dd-footer">
          <a href="/">&larr; Về trang chủ</a>
          <span>·</span>
          <a href="/privacy">Chính sách bảo mật</a>
        </footer>
      </div>
    </>
  )
}

const css = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Be Vietnam Pro',sans-serif;background:#f9f8f6;color:#1a1916;line-height:1.7;font-size:15px}
.dd-page{min-height:100vh;display:flex;flex-direction:column}
.dd-header{padding:16px 32px;background:#fff;border-bottom:1px solid #e8e6e1}
.dd-logo{font-size:16px;font-weight:600;color:#1a1916;text-decoration:none}
.dd-logo span{color:#8c8982;font-weight:300}
.dd-main{max-width:720px;margin:0 auto;padding:48px 24px;flex:1}
.dd-title{font-size:28px;font-weight:700;margin-bottom:6px}
.dd-updated{font-size:13px;color:#8c8982;margin-bottom:28px}
.dd-intro{background:#fff;border:1px solid #e8e6e1;border-radius:10px;padding:16px 20px;margin-bottom:32px;font-size:14px;color:#3a3936;line-height:1.7}
.dd-section{margin-bottom:28px}
.dd-section h2{font-size:16px;font-weight:600;margin-bottom:10px}
.dd-section p{margin-bottom:10px;color:#3a3936}
.dd-section ul,.dd-section ol{padding-left:20px;color:#3a3936}
.dd-section ul li,.dd-section ol li{margin-bottom:6px}
.dd-section a{color:#2563eb;text-decoration:none}
.dd-section a:hover{text-decoration:underline}
.dd-email-btn{display:inline-block;margin-top:14px;background:#1a1916;color:#fff;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:500;text-decoration:none;transition:opacity .15s}
.dd-email-btn:hover{opacity:.85;text-decoration:none}
.dd-footer{max-width:720px;margin:0 auto;padding:20px 24px 40px;display:flex;gap:12px;align-items:center;font-size:13px;color:#8c8982;border-top:1px solid #e8e6e1}
.dd-footer a{color:#8c8982;text-decoration:none}
.dd-footer a:hover{color:#1a1916}
`

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Chính sách bảo mật',
}

export default function PrivacyPolicy() {
  return (
    <div style={{ background: '#fff', border: '1px solid #e8e6e1', borderRadius: 12, padding: '32px 40px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Chính sách bảo mật</h1>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p>Cám ơn quý khách đã truy cập vào website <strong>leviethoang.shop</strong>. Chúng tôi tôn trọng và cam kết bảo mật những thông tin mang tính riêng tư của bạn. Xin vui lòng đọc bản Chính sách bảo mật dưới đây để hiểu hơn những cam kết mà chúng tôi thực hiện nhằm tôn trọng và bảo vệ quyền lợi của người truy cập.</p>
        
        <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 8 }}>1. Thu thập thông tin cá nhân</h3>
        <p>Để truy cập và sử dụng một số dịch vụ tại website, quý khách có thể được yêu cầu đăng ký thông tin cá nhân (Họ tên, Số điện thoại, Email, Địa chỉ...). Mọi thông tin khai báo phải đảm bảo tính chính xác và hợp pháp.</p>
        <p>Chúng tôi cũng có thể thu thập thông tin về số lần viếng thăm, bao gồm số trang quý khách xem, số links bạn click và những thông tin khác liên quan đến việc kết nối đến leviethoang.shop.</p>
        
        <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 8 }}>2. Sử dụng thông tin cá nhân</h3>
        <p>Chúng tôi thu thập và sử dụng thông tin cá nhân quý khách với mục đích phù hợp và hoàn toàn tuân thủ nội dung của "Chính sách bảo mật" này.</p>
        <p>Khi cần thiết, chúng tôi có thể sử dụng những thông tin này để liên hệ trực tiếp với bạn dưới các hình thức như: xác nhận đơn hàng, gửi thư ngỏ, thư cảm ơn, thông tin về kỹ thuật và bảo mật...</p>
        
        <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 8 }}>3. Chia sẻ thông tin cá nhân</h3>
        <p>Ngoại trừ các trường hợp về sử dụng thông tin cá nhân như đã nêu trong chính sách này, chúng tôi cam kết sẽ không tiết lộ thông tin cá nhân của bạn ra ngoài. Chúng tôi có thể cung cấp thông tin cá nhân của quý khách trong các trường hợp thực sự cần thiết như: khi có yêu cầu của các cơ quan pháp luật, trong trường hợp mà chúng tôi tin rằng điều đó sẽ giúp chúng tôi bảo vệ quyền lợi chính đáng của mình trước pháp luật.</p>
        
        <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 8 }}>4. Bảo mật thông tin cá nhân</h3>
        <p>Khi quý khách gửi thông tin cá nhân cho chúng tôi, quý khách đã đồng ý với các điều khoản mà chúng tôi đã nêu ở trên. Chúng tôi cam kết bảo mật thông tin cá nhân của quý khách bằng mọi cách thức có thể.</p>
        
        <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 8 }}>5. Thông tin liên hệ</h3>
        <p>Chúng tôi luôn hoan nghênh các ý kiến đóng góp, liên hệ và phản hồi thông tin từ quý khách về "Chính sách bảo mật" này. Nếu quý khách có những thắc mắc liên quan xin vui lòng liên hệ theo số điện thoại hoặc email trên website.</p>
      </div>
    </div>
  )
}

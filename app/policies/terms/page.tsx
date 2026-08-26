import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Quy định chung & Điều khoản',
}

export default function TermsPolicy() {
  return (
    <div style={{ background: '#fff', border: '1px solid #e8e6e1', borderRadius: 12, padding: '32px 40px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Quy định chung & Điều khoản</h1>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p>Chào mừng bạn đến với <strong>leviethoang.shop</strong>. Bằng việc sử dụng trang web này, bạn đồng ý tuân thủ và bị ràng buộc bởi các điều khoản và điều kiện sử dụng dưới đây. Vui lòng đọc kỹ các điều khoản này trước khi thực hiện mua hàng.</p>
        
        <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 8 }}>1. Hướng dẫn sử dụng web</h3>
        <p>Khi vào web của chúng tôi, khách hàng phải đảm bảo đủ 18 tuổi, hoặc truy cập dưới sự giám sát của cha mẹ hay người giám hộ hợp pháp. Khách hàng đảm bảo có đầy đủ hành vi dân sự để thực hiện các giao dịch mua bán hàng hóa theo quy định hiện hành của pháp luật Việt Nam.</p>
        <p>Nghiêm cấm sử dụng bất kỳ phần nào của trang web này với mục đích thương mại hoặc nhân danh bất kỳ đối tác thứ ba nào nếu không được chúng tôi cho phép bằng văn bản.</p>

        <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 8 }}>2. Ý kiến khách hàng</h3>
        <p>Tất cả nội dung trang web và ý kiến phê bình của quý khách đều là tài sản của chúng tôi. Nếu chúng tôi phát hiện bất kỳ thông tin giả mạo nào, chúng tôi sẽ khóa tài khoản của quý khách ngay lập tức hoặc áp dụng các biện pháp khác theo quy định của pháp luật Việt Nam.</p>

        <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 8 }}>3. Chấp nhận đơn hàng và giá cả</h3>
        <p>Chúng tôi có quyền từ chối hoặc hủy đơn hàng của quý khách vì bất kỳ lý do gì liên quan đến lỗi kỹ thuật, hệ thống một cách khách quan vào bất kỳ lúc nào.</p>
        <p>Chúng tôi cam kết sẽ cung cấp thông tin giá cả chính xác nhất cho người tiêu dùng. Tuy nhiên, đôi lúc vẫn có sai sót xảy ra, ví dụ như trường hợp giá sản phẩm không hiển thị chính xác trên trang web hoặc sai giá, tùy theo từng trường hợp chúng tôi sẽ liên hệ hướng dẫn hoặc thông báo hủy đơn hàng đó cho quý khách.</p>

        <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 8 }}>4. Thay đổi thông tin</h3>
        <p>Chúng tôi giữ quyền thay đổi, chỉnh sửa, thêm hoặc lược bỏ bất kỳ phần nào trong Quy định và Điều khoản sử dụng này vào bất cứ lúc nào. Các thay đổi có hiệu lực ngay khi được đăng trên trang web mà không cần thông báo trước.</p>

        <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 8 }}>5. Giải quyết tranh chấp</h3>
        <p>Bất kỳ tranh cãi, khiếu nại hoặc tranh chấp phát sinh từ hoặc liên quan đến giao dịch tại <strong>leviethoang.shop</strong> hoặc các Quy định và Điều khoản này đều sẽ được giải quyết bằng hình thức thương lượng, hòa giải, trọng tài và/hoặc Tòa án theo Luật bảo vệ Người tiêu dùng Chương 4 về Giải quyết tranh chấp.</p>
      </div>
    </div>
  )
}

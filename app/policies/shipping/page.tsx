import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Chính sách vận chuyển & giao nhận',
}

export default function ShippingPolicy() {
  return (
    <div style={{ background: '#fff', border: '1px solid #e8e6e1', borderRadius: 12, padding: '32px 40px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Chính sách vận chuyển & giao nhận</h1>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 8 }}>1. Đơn vị vận chuyển</h3>
        <p>Chúng tôi hợp tác với các đơn vị vận chuyển uy tín như VNPost, Shopee Express (SPX), ViettelPost, Giao Hàng Nhanh... để giao hàng đến tận nơi cho quý khách trên toàn quốc.</p>
        
        <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 8 }}>2. Phí vận chuyển</h3>
        <p>Phí vận chuyển sẽ được tính dựa trên:</p>
        <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li>Khối lượng và kích thước đóng gói của đơn hàng.</li>
          <li>Khoảng cách địa lý từ kho hàng của chúng tôi đến địa chỉ nhận hàng của quý khách.</li>
          <li>Chương trình khuyến mãi miễn phí vận chuyển (nếu có) sẽ được thông báo rõ trong quá trình đặt hàng.</li>
        </ul>
        <p>Phí vận chuyển cụ thể sẽ được thông báo cho quý khách khi nhân viên gọi điện xác nhận đơn hàng, hoặc hiển thị trong chi tiết đơn hàng đối với các sản phẩm áp dụng phí ship cố định.</p>

        <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 8 }}>3. Thời gian giao hàng</h3>
        <p>Thời gian giao hàng dự kiến:</p>
        <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li>Khu vực nội thành (Hà Nội, TP.HCM): 1 - 2 ngày làm việc.</li>
          <li>Khu vực ngoại thành và các tỉnh thành khác: 3 - 5 ngày làm việc.</li>
        </ul>
        <p><em>Lưu ý: Thời gian giao hàng có thể bị ảnh hưởng bởi các yếu tố khách quan như thời tiết, thiên tai, dịch bệnh, hoặc các dịp Lễ Tết.</em></p>

        <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 8 }}>4. Kiểm tra hàng hoá khi nhận</h3>
        <p>Quý khách vui lòng kiểm tra kỹ tình trạng hàng hoá, số lượng, tem mác (nếu có) trước khi ký nhận với nhân viên giao hàng. Nếu phát hiện hàng hoá bị hư hỏng, móp méo, hoặc sai sản phẩm, quý khách vui lòng từ chối nhận hàng và liên hệ ngay với chúng tôi để được hỗ trợ xử lý.</p>
      </div>
    </div>
  )
}

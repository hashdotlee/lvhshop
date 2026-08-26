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
        <p>Đơn vị vận chuyển sẽ thay đổi tùy thuộc vào tính chất của mặt hàng (ví dụ: hàng to, nhỏ, dễ vỡ...). Khách hàng hoàn toàn có thể chủ động yêu cầu đơn vị vận chuyển mong muốn để thuận tiện nhất cho việc nhận hàng.</p>
        
        <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 8 }}>2. Phí vận chuyển & Hỗ trợ phí</h3>
        <p>Chúng tôi có chính sách hỗ trợ phí vận chuyển cho các đơn hàng <strong>thanh toán chuyển khoản đầy đủ (100%)</strong> trước khi gửi hàng như sau:</p>
        <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li><strong>Đơn hàng trên 200.000 VNĐ:</strong> Hỗ trợ 20.000 VNĐ phí vận chuyển.</li>
          <li><strong>Đơn hàng trên 500.000 VNĐ:</strong> Hỗ trợ 50.000 VNĐ phí vận chuyển.</li>
        </ul>
        <p>Đối với các đơn hàng gửi COD hoặc không đạt điều kiện trên, phí vận chuyển sẽ được tính theo bảng giá của đơn vị vận chuyển và khách hàng sẽ thanh toán khi nhận hàng.</p>

        <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 8 }}>3. Thời gian giao hàng</h3>
        <p>Thời gian giao hàng dự kiến:</p>
        <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li>Khu vực nội thành (Hà Nội, TP.HCM): 1 - 2 ngày làm việc.</li>
          <li>Khu vực ngoại thành và các tỉnh thành khác: 3 - 5 ngày làm việc.</li>
        </ul>

        <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 8 }}>4. Kiểm tra hàng hoá khi nhận</h3>
        <p>Quý khách vui lòng kiểm tra kỹ tình trạng đóng gói của hàng hoá khi nhận. Nếu có dấu hiệu móp méo, hư hỏng do vận chuyển, quý khách nên quay video mở hộp hoặc từ chối nhận hàng và liên hệ ngay với chúng tôi để được hỗ trợ.</p>
      </div>
    </div>
  )
}

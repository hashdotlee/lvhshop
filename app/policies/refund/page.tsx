import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Chính sách đổi trả & hoàn tiền',
}

export default function RefundPolicy() {
  return (
    <div style={{ background: '#fff', border: '1px solid #e8e6e1', borderRadius: 12, padding: '32px 40px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Chính sách đổi trả & hoàn tiền</h1>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 8 }}>1. Điều kiện áp dụng</h3>
        <p>Theo các điều khoản và điều kiện được quy định trong Chính sách Trả hàng và Hoàn tiền này, người mua có quyền yêu cầu trả hàng và hoàn tiền trong các trường hợp sau:</p>
        <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li>Sản phẩm bị lỗi hoặc bị hư hại trong quá trình vận chuyển.</li>
          <li>Người bán giao sai sản phẩm cho người mua (VD: sai kích cỡ, sai màu sắc...).</li>
          <li>Sản phẩm người mua nhận được khác biệt một cách rõ rệt so với thông tin mà người bán cung cấp trong mục mô tả sản phẩm.</li>
        </ul>
        <p>Lưu ý: Do đặc thù các sản phẩm đồ cũ (hàng 2nd), chúng tôi đã mô tả kỹ tình trạng hiện tại của sản phẩm. Quý khách vui lòng kiểm tra kỹ hình ảnh và mô tả trước khi đặt hàng. Chúng tôi không chấp nhận trả hàng với lý do "không ưng ý" đối với các mặt hàng đồ cũ đã được mô tả đúng hiện trạng.</p>

        <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 8 }}>2. Thời gian đổi trả</h3>
        <p>Quý khách cần thông báo yêu cầu đổi trả và gửi trả sản phẩm trong vòng <strong>3 ngày</strong> kể từ ngày nhận hàng (căn cứ theo thời gian cập nhật trên hệ thống vận chuyển).</p>

        <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 8 }}>3. Trạng thái của hàng trả lại</h3>
        <p>Để hạn chế các rắc rối phát sinh, người mua vui lòng gửi trả sản phẩm bao gồm toàn bộ phụ kiện đi kèm, hóa đơn VAT, tem phiếu bảo hành... nếu có. Sản phẩm phải trong tình trạng nguyên vẹn như khi nhận hàng, chưa qua sử dụng, chưa giặt ủi.</p>

        <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 8 }}>4. Phí vận chuyển hàng trả lại</h3>
        <p>Trong trường hợp lỗi thuộc về phía người bán (giao sai hàng, hàng lỗi kỹ thuật), chúng tôi sẽ chịu toàn bộ chi phí vận chuyển chiều trả hàng.</p>

        <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 8 }}>5. Hoàn tiền</h3>
        <p>Chúng tôi sẽ tiến hành hoàn tiền cho người mua khi chúng tôi xác nhận đã nhận được Hàng trả lại. Quá trình hoàn tiền thường mất từ 1 - 3 ngày làm việc thông qua chuyển khoản ngân hàng.</p>
      </div>
    </div>
  )
}

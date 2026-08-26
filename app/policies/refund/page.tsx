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
        <p>Tất cả các mặt hàng giao cho khách phải đúng với mô tả lúc chốt đơn. Trong trường hợp hàng hoá không đúng mô tả hoặc bị nứt vỡ, hư hỏng trong quá trình vận chuyển, quý khách có 2 lựa chọn xử lý sau đây:</p>
        <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li><strong>Lựa chọn 1:</strong> Trả lại hàng, hoàn tiền. Người bán sẽ chịu toàn bộ chi phí vận chuyển chiều trả hàng.</li>
          <li><strong>Lựa chọn 2:</strong> Giảm giá cho đơn hàng đó tuỳ theo thoả thuận giữa hai bên để khách hàng giữ lại sản phẩm.</li>
        </ul>
        <p>Lưu ý: Do đặc thù các sản phẩm đồ cũ (hàng 2nd), chúng tôi đã mô tả kỹ tình trạng hiện tại của sản phẩm. Quý khách vui lòng kiểm tra kỹ hình ảnh và mô tả trước khi chốt đơn. Chúng tôi không chấp nhận trả hàng với lý do "không ưng ý" đối với các mặt hàng đồ cũ đã được giao đúng hiện trạng và mô tả.</p>

        <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 8 }}>2. Thời gian thông báo</h3>
        <p>Quý khách cần kiểm tra hàng và thông báo yêu cầu khiếu nại (đổi trả / hoàn tiền / giảm giá) cho chúng tôi ngay khi nhận hàng hoặc trong vòng tối đa <strong>3 ngày</strong> kể từ ngày nhận hàng (căn cứ theo thời gian cập nhật trên hệ thống vận chuyển).</p>

        <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 8 }}>3. Trạng thái của hàng trả lại</h3>
        <p>Nếu chọn phương án trả hàng, người mua vui lòng đóng gói kỹ lưỡng và gửi trả sản phẩm bao gồm toàn bộ phụ kiện đi kèm (nếu có). Sản phẩm phải trong tình trạng nguyên vẹn như khi nhận hàng (ngoài các lỗi hư hỏng đã báo cáo), chưa qua sử dụng thêm.</p>

        <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 8 }}>4. Hoàn tiền</h3>
        <p>Chúng tôi sẽ tiến hành hoàn tiền cho người mua ngay khi xác nhận tình trạng lỗi từ hình ảnh/video cung cấp hoặc sau khi chúng tôi nhận lại được Hàng trả lại. Quá trình hoàn tiền thực hiện thông qua chuyển khoản ngân hàng.</p>
      </div>
    </div>
  )
}

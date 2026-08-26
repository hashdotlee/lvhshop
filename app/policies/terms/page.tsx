import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Chính sách mua hàng & Quy định chung',
}

export default function TermsPolicy() {
  return (
    <div style={{ background: '#fff', border: '1px solid #e8e6e1', borderRadius: 12, padding: '32px 40px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Chính sách mua hàng & Quy định chung</h1>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 8 }}>1. Quy định về số lượng và giá cả</h3>
        <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li>Nếu bài đăng không ghi thêm số lượng thì mỗi món hàng chỉ có 1 đơn vị duy nhất.</li>
          <li>Quý khách vui lòng <strong>không trả giá thêm</strong>. Nếu muốn mua được giá rẻ hơn, quý khách có thể đợi vào các đợt giảm giá, xả hàng của shop.</li>
        </ul>

        <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 8 }}>2. Quy định "Chốt đơn"</h3>
        <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li>Khách bình luận hoặc nhắn tin để chốt đơn. Thời gian chốt đơn sẽ tính theo thời điểm bình luận hoặc nhắn tin hiện trên hệ thống.</li>
          <li><strong>Nguyên tắc ưu tiên:</strong> Khách chốt trước sẽ được ưu tiên trước. Nếu khách đó không mua nữa, cơ hội mua hàng sẽ được nhường lại cho khách chốt sau theo đúng thứ tự thời gian.</li>
        </ul>

        <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 8 }}>3. Trách nhiệm giao hàng & Huỷ đơn</h3>
        <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li>Sau khi chốt đơn thành công, người bán cam kết bàn giao đúng hàng cho đơn vị vận chuyển chậm nhất là <strong>3 ngày</strong>.</li>
          <li>Sau thời hạn 3 ngày mà hàng chưa được gửi đi, khách hàng có quyền huỷ đơn bất cứ lúc nào và được hoàn lại toàn bộ tiền cọc (nếu có).</li>
        </ul>

        <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 8 }}>4. Quy định giữ đơn & Thanh toán</h3>
        <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li><strong>Dồn đơn (giữ đơn):</strong> Khách muốn dồn nhiều đơn để gửi 1 lần vui lòng chuyển khoản trước. Trong vòng 2 ngày nếu không chuyển khoản, shop sẽ tự động đi đơn COD hoặc xả đơn (huỷ đơn) tuỳ theo thoả thuận.</li>
          <li>Khách muốn đi đơn COD ngay không cần phải đặt cọc trước.</li>
        </ul>
      </div>
    </div>
  )
}

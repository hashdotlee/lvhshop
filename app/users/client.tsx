'use client'
import { useState, useEffect, useRef } from 'react'

type UserProfile = {
  id: string
  status: 'pending' | 'approved' | 'rejected'
  email: string | null
  phone: string | null
  full_name: string | null
  created_at: string
}

const STATUS_LABEL = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function UsersClient() {
  const [adminKey, setAdminKey] = useState('')
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const k = sessionStorage.getItem('cq_admin_key')
    if (k && sessionStorage.getItem('cq_admin')) {
      setAdminKey(k)
      fetchUsers(k)
    }
  }, [])

  async function fetchUsers(key: string) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/users', { headers: { 'x-admin-key': key } })
      if (!res.ok) {
        const e = await res.json()
        setError(e.error ?? 'Lỗi tải dữ liệu')
        return
      }
      setUsers(await res.json())
    } catch {
      setError('Không thể kết nối')
    } finally {
      setLoading(false)
    }
  }

  async function handleAction(id: string, newStatus: 'approved' | 'rejected') {
    if (!confirm(`Xác nhận ${newStatus === 'approved' ? 'duyệt' : 'từ chối'} tài khoản này?`)) return
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ id, status: newStatus })
      })
      if (!res.ok) {
        alert('Lỗi cập nhật')
        return
      }
      fetchUsers(adminKey)
    } catch {
      alert('Không thể kết nối')
    }
  }

  if (!adminKey) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Vui lòng đăng nhập Admin để xem trang này.</div>
  }

  return (
    <>
      <style>{css}</style>
      <div className="us-page">
        <header className="us-header">
          <a href="/" className="us-logo">leviethoang<span>.shop</span></a>
          <div className="us-header-right">
            <a href="/" className="us-nav-link">Quản lý kho</a>
            <a href="/order" className="us-nav-link">Đơn hàng</a>
            <a href="/accounting" className="us-nav-link">Kế toán</a>
          </div>
        </header>

        <main className="us-main">
          <div className="us-toolbar">
            <h1 style={{ fontSize: 22, fontWeight: 700 }}>Duyệt tài khoản khách hàng</h1>
            <button className="us-btn-ghost" onClick={() => fetchUsers(adminKey)}>↻ Làm mới</button>
          </div>
          
          {error && <div style={{ padding: 12, background: '#fef2f2', color: '#dc2626', borderRadius: 8, marginBottom: 16 }}>{error}</div>}

          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>Đang tải...</div>
          ) : (
            <div className="us-table-wrap">
              <table className="us-table">
                <thead>
                  <tr>
                    <th>Trạng thái</th>
                    <th>Khách hàng</th>
                    <th>Email / Số điện thoại</th>
                    <th>Ngày đăng ký</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20 }}>Không có dữ liệu</td></tr>
                  ) : users.map(user => (
                    <tr key={user.id} className={user.status === 'pending' ? 'us-row-pending' : ''}>
                      <td>
                        <span className={`us-badge us-status-${user.status}`}>{STATUS_LABEL[user.status] || user.status}</span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{user.full_name || '—'}</td>
                      <td>
                        <div>{user.phone || '—'}</div>
                        <div style={{ fontSize: 11, color: '#666' }}>{user.email || '—'}</div>
                      </td>
                      <td style={{ fontSize: 12, color: '#666' }}>{fmtDate(user.created_at)}</td>
                      <td>
                        {user.status === 'pending' && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="us-btn-primary" onClick={() => handleAction(user.id, 'approved')}>Duyệt</button>
                            <button className="us-btn-ghost" style={{ color: '#dc2626' }} onClick={() => handleAction(user.id, 'rejected')}>Từ chối</button>
                          </div>
                        )}
                        {user.status === 'approved' && (
                          <button className="us-btn-ghost" style={{ color: '#dc2626' }} onClick={() => handleAction(user.id, 'rejected')}>Khoá tài khoản</button>
                        )}
                        {user.status === 'rejected' && (
                          <button className="us-btn-ghost" onClick={() => handleAction(user.id, 'approved')}>Mở lại</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </>
  )
}

const css = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Be Vietnam Pro',sans-serif;background:#f9f8f6;color:#1a1916;font-size:14px;line-height:1.6}
.us-page{min-height:100vh}
.us-header{display:flex;align-items:center;justify-content:space-between;padding:14px 32px;background:#fff;border-bottom:1px solid #e8e6e1;position:sticky;top:0;z-index:100}
.us-logo{font-size:16px;font-weight:600;color:#1a1916;text-decoration:none}
.us-logo span{color:#8c8982;font-weight:300}
.us-header-right{display:flex;align-items:center;gap:16px}
.us-nav-link{font-size:13px;color:#8c8982;text-decoration:none;font-weight:500}
.us-nav-link:hover{color:#1a1916}
.us-main{max-width:1100px;margin:0 auto;padding:32px 20px}
.us-toolbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px}
.us-table-wrap{background:#fff;border:1px solid #e8e6e1;border-radius:12px;overflow:hidden}
.us-table{width:100%;border-collapse:collapse;text-align:left}
.us-table th{background:#fafaf8;padding:12px 16px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#8c8982;border-bottom:1px solid #e8e6e1}
.us-table td{padding:12px 16px;border-bottom:1px solid #e8e6e1;vertical-align:middle}
.us-table tr:last-child td{border-bottom:none}
.us-table tr:hover td{background:#fdfcfb}
.us-row-pending td{background:#fffbeb}
.us-badge{font-size:11px;font-weight:700;padding:3px 8px;border-radius:6px;white-space:nowrap}
.us-status-pending{background:#fef3c7;color:#d97706}
.us-status-approved{background:#dcfce7;color:#16a34a}
.us-status-rejected{background:#fee2e2;color:#dc2626}
.us-btn-primary{background:#1a1916;color:#fff;border:none;padding:6px 12px;border-radius:6px;font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s}
.us-btn-primary:hover{opacity:.85}
.us-btn-ghost{background:none;border:1px solid #e8e6e1;color:#666;padding:5px 11px;border-radius:6px;font-family:inherit;font-size:12px;cursor:pointer;transition:all .15s;font-weight:500}
.us-btn-ghost:hover{border-color:#1a1916;color:#1a1916}
`

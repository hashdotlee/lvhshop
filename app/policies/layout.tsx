export default function PoliciesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f9f8f6', fontFamily: "'Be Vietnam Pro', sans-serif", color: '#1a1916', lineHeight: 1.6 }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 32px', background: '#fff', borderBottom: '1px solid #e8e6e1', position: 'sticky', top: 0, zIndex: 100 }}>
        <a href="/" style={{ fontSize: 16, fontWeight: 600, color: '#1a1916', textDecoration: 'none' }}>
          leviethoang<span style={{ color: '#8c8982', fontWeight: 300 }}>.shop</span>
        </a>
        <a href="/" style={{ fontSize: 13, color: '#8c8982', textDecoration: 'none' }}>← Về trang chủ</a>
      </header>
      <main style={{ flex: 1, maxWidth: 800, margin: '0 auto', padding: '40px 20px', width: '100%' }}>
        {children}
      </main>
    </div>
  )
}

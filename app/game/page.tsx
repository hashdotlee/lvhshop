import type { Metadata } from 'next'
import Link from 'next/link'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://leviethoang.shop'

export const metadata: Metadata = {
  title: 'Game',
  description: 'Góc giải trí — thử thách kiến thức về radio và đồ điện tử vintage huyền thoại.',
  openGraph: {
    title: 'Game · leviethoang.shop',
    description: 'Góc giải trí — thử thách kiến thức về radio và đồ điện tử vintage huyền thoại.',
    url: `${siteUrl}/game`,
    siteName: 'leviethoang.shop',
    type: 'website',
    locale: 'vi_VN',
  },
  alternates: { canonical: `${siteUrl}/game` },
}

const games = [
  {
    href: '/game/radio-quiz',
    icon: '📻',
    title: 'Radio Daily Quiz',
    subtitle: 'Đoán model radio huyền thoại',
    desc: 'Mỗi ngày một câu — đọc mô tả đặc điểm, chọn đúng tên model. Bạn có đủ kiến thức về các hãng radio nổi tiếng như Sony, Panasonic, National, Philips...?',
    badge: 'DAILY',
    color: '#2a7a4b',
  },
]

export default function GamePage() {
  return (
    <>
      <style>{styles}</style>
      <header>
        <Link href="/" className="logo">leviethoang<span>.shop</span></Link>
        <nav>
          <Link href="/" className="nav-link">← Trang chủ</Link>
        </nav>
      </header>

      <main className="game-main">
        <div className="game-hero">
          <div className="game-hero-icon">🎮</div>
          <h1 className="game-hero-title">Góc Giải Trí</h1>
          <p className="game-hero-sub">Thử thách kiến thức về radio và đồ điện tử vintage huyền thoại</p>
        </div>

        <div className="game-grid">
          {games.map(g => (
            <Link key={g.href} href={g.href} className="game-card">
              <div className="game-card-icon">{g.icon}</div>
              <div className="game-card-body">
                <div className="game-card-header">
                  <h2 className="game-card-title">{g.title}</h2>
                  <span className="game-badge" style={{ background: g.color }}>{g.badge}</span>
                </div>
                <p className="game-card-sub">{g.subtitle}</p>
                <p className="game-card-desc">{g.desc}</p>
                <span className="game-card-cta">Chơi ngay →</span>
              </div>
            </Link>
          ))}

          <div className="game-card game-card-soon">
            <div className="game-card-icon">🔧</div>
            <div className="game-card-body">
              <div className="game-card-header">
                <h2 className="game-card-title">Sắp ra mắt</h2>
                <span className="game-badge game-badge-soon">COMING SOON</span>
              </div>
              <p className="game-card-desc">Nhiều thử thách mới đang được chuẩn bị. Hãy quay lại sau!</p>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

const styles = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#f9f8f6;--surface:#fff;--border:#e8e6e1;--text:#1a1916;--muted:#8c8982;--tag-bg:#f0efe9}
body{font-family:'Be Vietnam Pro',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;font-size:14px;line-height:1.6}
header{display:flex;align-items:center;justify-content:space-between;padding:14px 32px;border-bottom:1px solid var(--border);background:var(--surface);position:sticky;top:0;z-index:100}
.logo{font-size:16px;font-weight:600;letter-spacing:-.3px;text-decoration:none;color:var(--text)}
.logo span{color:var(--muted);font-weight:300}
.nav-link{font-size:13px;color:var(--muted);text-decoration:none;padding:6px 12px;border-radius:7px;transition:background .15s}
.nav-link:hover{background:var(--tag-bg)}
.game-main{max-width:800px;margin:0 auto;padding:48px 24px}
.game-hero{text-align:center;margin-bottom:48px}
.game-hero-icon{font-size:48px;margin-bottom:16px}
.game-hero-title{font-size:34px;font-weight:600;letter-spacing:-1px;margin-bottom:8px}
.game-hero-sub{color:var(--muted);font-size:15px}
.game-grid{display:flex;flex-direction:column;gap:16px}
.game-card{display:flex;gap:20px;background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:24px;text-decoration:none;color:inherit;transition:box-shadow .2s,transform .2s;cursor:pointer}
.game-card:hover{box-shadow:0 8px 28px rgba(0,0,0,.08);transform:translateY(-2px)}
.game-card-soon{opacity:.6;cursor:default;pointer-events:none}
.game-card-soon:hover{transform:none;box-shadow:none}
.game-card-icon{font-size:40px;flex-shrink:0;width:56px;height:56px;display:flex;align-items:center;justify-content:center;background:var(--tag-bg);border-radius:14px}
.game-card-body{flex:1;display:flex;flex-direction:column;gap:8px}
.game-card-header{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.game-card-title{font-size:18px;font-weight:600}
.game-badge{font-size:10px;font-weight:600;color:#fff;padding:2px 8px;border-radius:20px;letter-spacing:.5px}
.game-badge-soon{background:var(--muted) !important}
.game-card-sub{font-size:13px;font-weight:500;color:var(--muted)}
.game-card-desc{font-size:13px;color:var(--muted);line-height:1.6}
.game-card-cta{font-size:13px;font-weight:600;color:#1a1916;margin-top:4px}
@media(max-width:600px){.game-main{padding:28px 16px}.game-hero-title{font-size:26px}.game-card{flex-direction:column;gap:14px}}
`

import type { Metadata } from 'next'
import Link from 'next/link'
import RadioQuizClient from './client'
import RadioQuizAdminClient from './admin-client'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.leviethoang.shop'

export const metadata: Metadata = {
  title: 'Radio Daily Quiz',
  description: 'Đoán tên model radio huyền thoại mỗi ngày — thử thách kiến thức về các hãng Sony, Panasonic, National, Philips...',
  openGraph: {
    title: 'Radio Daily Quiz · leviethoang.shop',
    description: 'Mỗi ngày một câu — đọc mô tả đặc điểm, chọn đúng tên model radio huyền thoại.',
    url: `${siteUrl}/game/radio-quiz`,
    siteName: 'leviethoang.shop',
    type: 'website',
    locale: 'vi_VN',
  },
  alternates: { canonical: `${siteUrl}/game/radio-quiz` },
}

export default function RadioQuizPage() {
  return (
    <>
      <style>{styles}</style>
      <header>
        <Link href="/" className="logo">leviethoang<span>.shop</span></Link>
        <nav className="nav">
          <Link href="/game" className="nav-link">← Game</Link>
        </nav>
      </header>

      <main className="rq-main">
        <div className="rq-hero">
          <div className="rq-hero-icon">📻</div>
          <h1 className="rq-hero-title">Radio Daily Quiz</h1>
          <p className="rq-hero-sub">Đoán tên model radio huyền thoại — mỗi ngày một câu mới</p>
        </div>

        <RadioQuizClient />
      </main>

      <RadioQuizAdminClient />
    </>
  )
}

const styles = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#f9f8f6;--surface:#fff;--border:#e8e6e1;--text:#1a1916;--muted:#8c8982;
  --tag-bg:#f0efe9;--green:#2a7a4b;--red:#b91c1c;--green-bg:#f0fdf4;--red-bg:#fef2f2
}
body{font-family:'Be Vietnam Pro',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;font-size:14px;line-height:1.6}
header{display:flex;align-items:center;justify-content:space-between;padding:14px 32px;border-bottom:1px solid var(--border);background:var(--surface);position:sticky;top:0;z-index:100}
.logo{font-size:16px;font-weight:600;letter-spacing:-.3px;text-decoration:none;color:var(--text)}
.logo span{color:var(--muted);font-weight:300}
.nav{display:flex;gap:8px}
.nav-link{font-size:13px;color:var(--muted);text-decoration:none;padding:6px 12px;border-radius:7px;transition:background .15s}
.nav-link:hover{background:var(--tag-bg)}

/* Main layout */
.rq-main{max-width:560px;margin:0 auto;padding:40px 24px 80px}

/* Hero */
.rq-hero{text-align:center;margin-bottom:36px}
.rq-hero-icon{font-size:48px;margin-bottom:12px}
.rq-hero-title{font-size:28px;font-weight:600;letter-spacing:-.5px;margin-bottom:6px}
.rq-hero-sub{color:var(--muted);font-size:14px}

/* Loading / empty states */
.rq-center{display:flex;flex-direction:column;align-items:center;gap:12px;padding:60px 0;text-align:center}
.rq-spinner{width:32px;height:32px;border:3px solid var(--border);border-top-color:var(--text);border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.rq-loading-text{color:var(--muted);font-size:14px}
.rq-empty-icon{font-size:48px}
.rq-empty-title{font-size:18px;font-weight:600}
.rq-empty-sub{color:var(--muted);font-size:14px;max-width:300px}
.rq-retry-btn{margin-top:8px;padding:8px 20px;border:1px solid var(--border);border-radius:8px;background:var(--surface);cursor:pointer;font-size:13px;font-family:inherit}

/* Game card */
.rq-game{display:flex;flex-direction:column;gap:20px}
.rq-meta{display:flex;align-items:center;gap:12px;font-size:12px;color:var(--muted)}
.rq-date{font-weight:500}
.rq-difficulty{font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.5px}

.rq-brand-row{display:flex;align-items:center;gap:8px}
.rq-brand-label{font-size:11px;color:var(--muted);font-weight:500;text-transform:uppercase;letter-spacing:.5px}
.rq-brand-name{font-size:20px;font-weight:700;letter-spacing:-.3px}
.rq-year{font-size:14px;color:var(--muted)}

.rq-question-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:24px;display:flex;flex-direction:column;gap:10px}
.rq-question-icon{font-size:28px}
.rq-question-label{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:var(--muted)}
.rq-description{font-size:15px;line-height:1.7;color:var(--text)}

/* Options */
.rq-options{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.rq-opt{padding:14px 16px;border:2px solid var(--border);border-radius:12px;background:var(--surface);font-family:inherit;font-size:14px;font-weight:500;cursor:pointer;text-align:left;transition:border-color .15s,background .15s,opacity .15s;line-height:1.3}
.rq-opt:not(:disabled):hover{border-color:#1a1916;background:var(--tag-bg)}
.rq-opt:disabled{cursor:default}
.rq-opt-correct{border-color:var(--green) !important;background:var(--green-bg) !important;color:var(--green)}
.rq-opt-wrong{border-color:var(--red) !important;background:var(--red-bg) !important;color:var(--red)}
.rq-opt-dim{opacity:.4}

/* Result */
.rq-result{border-radius:16px;padding:20px;display:flex;flex-direction:column;gap:12px;border:2px solid}
.rq-result-correct{background:var(--green-bg);border-color:var(--green)}
.rq-result-wrong{background:var(--red-bg);border-color:var(--red)}
.rq-result-icon{font-size:32px}
.rq-result-body{display:flex;flex-direction:column;gap:4px}
.rq-result-title{font-size:16px;font-weight:600}
.rq-result-sub{font-size:13px;color:var(--muted)}
.rq-result-img{width:100%;max-height:220px;object-fit:contain;border-radius:10px;background:#fff;border:1px solid var(--border)}
.rq-result-actions{display:flex;gap:10px}
.rq-share-btn{padding:10px 20px;background:var(--text);color:#fff;border:none;border-radius:10px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:opacity .15s}
.rq-share-btn:hover{opacity:.85}
.rq-next-hint{font-size:12px;color:var(--muted)}

@media(max-width:480px){
  .rq-main{padding:28px 16px 60px}
  .rq-options{grid-template-columns:1fr}
  .rq-hero-title{font-size:22px}
}
`

'use client'

const MSG = '🚧  Hệ thống đang trong quá trình xây dựng — một số tính năng có thể chưa hoàn chỉnh  🚧'
const REPEATED = Array(8).fill(MSG).join('     ·     ')

export default function ConstructionBanner() {
  return (
    <>
      <style>{css}</style>
      <div className="cb-wrap" role="status" aria-live="polite">
        <div className="cb-track">
          <span>{REPEATED}</span>
          <span aria-hidden="true">{REPEATED}</span>
        </div>
      </div>
    </>
  )
}

const css = `
.cb-wrap {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10000;
  background: #f59e0b;
  color: #1c1917;
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
  padding: 7px 0;
  overflow: hidden;
  white-space: nowrap;
  letter-spacing: .01em;
}
.cb-track {
  display: inline-flex;
  animation: cb-scroll 40s linear infinite;
}
.cb-track span {
  padding-right: 4em;
}
@keyframes cb-scroll {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
`

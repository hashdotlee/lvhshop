'use client'

const MSG = 'Hệ thống đang trong quá trình xây dựng — một số tính năng có thể chưa hoàn chỉnh'
const REPEATED = Array(6).fill(MSG).join('   ·   ')

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
:root { --cb-h: 26px; }
.cb-wrap {
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  z-index: 200;
  height: var(--cb-h);
  background: #2e2d2a;
  color: #9e9c97;
  font-size: 11px;
  font-weight: 400;
  line-height: var(--cb-h);
  overflow: hidden;
  white-space: nowrap;
  letter-spacing: .02em;
}
.cb-track {
  display: inline-flex;
  animation: cb-scroll 50s linear infinite;
}
.cb-track span {
  padding-right: 4em;
}
@keyframes cb-scroll {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
`

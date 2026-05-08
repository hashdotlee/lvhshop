'use client'
import { useEffect, useRef, useState } from 'react'

// ── SVG geometry ──────────────────────────────────────────────────
// viewBox "0 0 160 82"
// Head: circle cx=80 cy=110 r=82 → visible top arc peeks into view
// Ears: triangles whose tips are above the circle, bases merge into it
const EL = { cx: 56,  cy: 56 }   // left eye centre
const ER = { cx: 104, cy: 56 }   // right eye centre
const ER_W = 17                   // white sclera radius
const MAX_OFF = 6                 // max pupil travel (SVG units)

type Expr = 'normal' | 'happy' | 'surprised'

export default function CatChaser() {
  const wrapRef  = useRef<HTMLDivElement>(null)
  const lpRef    = useRef<SVGCircleElement>(null)
  const rpRef    = useRef<SVGCircleElement>(null)
  const ls1Ref   = useRef<SVGCircleElement>(null)
  const rs1Ref   = useRef<SVGCircleElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const [expr, setExpr] = useState<Expr>('normal')

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return

    function onMove(e: MouseEvent) {
      const r  = wrap!.getBoundingClientRect()
      const cx = r.left + r.width  * 0.5
      const cy = r.top  + r.height * 0.62   // approx eye level in display coords

      const angle = Math.atan2(e.clientY - cy, e.clientX - cx)
      const dist  = Math.hypot(e.clientX - cx, e.clientY - cy)
      const t     = Math.min(dist / 200, 1)
      const ox    = Math.cos(angle) * MAX_OFF * t
      const oy    = Math.sin(angle) * MAX_OFF * t

      for (const [ref, base] of [[lpRef, EL], [rpRef, ER]] as const) {
        ref.current?.setAttribute('cx', String(base.cx + ox))
        ref.current?.setAttribute('cy', String(base.cy + oy))
      }
      for (const [ref, base] of [[ls1Ref, EL], [rs1Ref, ER]] as const) {
        ref.current?.setAttribute('cx', String(base.cx + ox + 6))
        ref.current?.setAttribute('cy', String(base.cy + oy - 6))
      }
    }

    const onClick = () => {
      setExpr('happy')
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setExpr('normal'), 950)
    }
    const onScroll = () => {
      setExpr('surprised')
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setExpr('normal'), 700)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('click', onClick)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('click', onClick)
      window.removeEventListener('scroll', onScroll)
      clearTimeout(timerRef.current)
    }
  }, [])

  const pr = expr === 'surprised' ? 13 : expr === 'happy' ? 7 : 10   // pupil radius

  return (
    <>
      <style>{css}</style>
      <div ref={wrapRef} className="cat-wrap">
        {/* viewBox 160×82 rendered at 88×45 px */}
        <svg
          viewBox="0 0 160 82"
          width="88" height="45"
          className={`cat-svg cat-${expr}`}
          style={{ overflow: 'visible', display: 'block' }}
          aria-hidden="true"
        >
          {/* ── Left ear ── triangle: tip above circle, bases merge into head */}
          <polygon points="18,82 40,3 66,66" fill="#111"/>

          {/* ── Right ear ── */}
          <polygon points="94,66 120,3 142,82" fill="#111"/>

          {/* ── Head ── large circle centred below viewBox → peeking arc */}
          <circle cx="80" cy="110" r="82" fill="#111"/>

          {/* ── Whiskers ── extend beyond SVG bounds (overflow:visible) */}
          <line x1="4"   y1="68" x2="-20" y2="63" stroke="#555" strokeWidth="1.2" strokeLinecap="round"/>
          <line x1="4"   y1="76" x2="-22" y2="75" stroke="#555" strokeWidth="1.2" strokeLinecap="round"/>
          <line x1="156" y1="68" x2="180" y2="63" stroke="#555" strokeWidth="1.2" strokeLinecap="round"/>
          <line x1="156" y1="76" x2="182" y2="75" stroke="#555" strokeWidth="1.2" strokeLinecap="round"/>

          {/* ── Left eye ── */}
          <circle cx={EL.cx} cy={EL.cy} r={ER_W} fill="white"/>
          <circle ref={lpRef}  cx={EL.cx} cy={EL.cy} r={pr}            fill="#111"/>
          <circle ref={ls1Ref} cx={EL.cx + 6} cy={EL.cy - 6} r={pr * 0.33} fill="white"/>

          {/* ── Right eye ── */}
          <circle cx={ER.cx} cy={ER.cy} r={ER_W} fill="white"/>
          <circle ref={rpRef}  cx={ER.cx} cy={ER.cy} r={pr}            fill="#111"/>
          <circle ref={rs1Ref} cx={ER.cx + 6} cy={ER.cy - 6} r={pr * 0.33} fill="white"/>

          {/* ── Happy: arc eyes ── */}
          {expr === 'happy' && <>
            <path
              d={`M${EL.cx - ER_W + 1},${EL.cy + 3} Q${EL.cx},${EL.cy - ER_W + 4} ${EL.cx + ER_W - 1},${EL.cy + 3}`}
              stroke="#111" strokeWidth="4" fill="white" strokeLinecap="round"
            />
            <path
              d={`M${ER.cx - ER_W + 1},${ER.cy + 3} Q${ER.cx},${ER.cy - ER_W + 4} ${ER.cx + ER_W - 1},${ER.cy + 3}`}
              stroke="#111" strokeWidth="4" fill="white" strokeLinecap="round"
            />
          </>}
        </svg>
      </div>
    </>
  )
}

const css = `
.cat-wrap {
  position: fixed;
  bottom: 0;
  left: 16px;
  z-index: 9999;
  pointer-events: none;
  user-select: none;
  animation: cat-in .65s cubic-bezier(.34,1.5,.64,1) both;
}
@keyframes cat-in {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}
.cat-svg {
  filter: drop-shadow(0 -3px 6px rgba(0,0,0,.3));
  animation: cat-bob 4s ease-in-out infinite;
}
@keyframes cat-bob {
  0%,100% { transform: translateY(0); }
  50%     { transform: translateY(-4px); }
}
.cat-surprised { animation: cat-pop .3s ease both !important; }
@keyframes cat-pop {
  0%  { transform: translateY(0); }
  40% { transform: translateY(-8px) scale(1.05); }
  100%{ transform: translateY(0); }
}
.cat-happy { animation: cat-wag .5s ease both !important; }
@keyframes cat-wag {
  0%   { transform: translateY(0) rotate(0deg); }
  30%  { transform: translateY(-6px) rotate(-5deg); }
  65%  { transform: translateY(-3px) rotate(4deg); }
  100% { transform: translateY(0) rotate(0deg); }
}
`

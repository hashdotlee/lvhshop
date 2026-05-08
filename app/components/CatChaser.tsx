'use client'
import { useEffect, useRef, useState } from 'react'

// Eye centers in SVG coordinate space
const EL = { cx: 58,  cy: 63 }
const ER = { cx: 112, cy: 63 }
const MAX_OFFSET = 5   // max pupil travel (SVG units)
const EYE_R      = 19  // white eye radius
const PUPIL_R    = 12  // normal pupil radius

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
      const rect = wrap!.getBoundingClientRect()
      // Cat face center in viewport coords
      const cx = rect.left + rect.width  * 0.5
      const cy = rect.top  + rect.height * 0.58

      const angle = Math.atan2(e.clientY - cy, e.clientX - cx)
      const dist  = Math.hypot(e.clientX - cx, e.clientY - cy)
      const t     = Math.min(dist / 180, 1)
      const ox    = Math.cos(angle) * MAX_OFFSET * t
      const oy    = Math.sin(angle) * MAX_OFFSET * t

      for (const [ref, base] of [
        [lpRef, EL], [rpRef, ER],
      ] as const) {
        const el = ref.current
        if (el) {
          el.setAttribute('cx', String(base.cx + ox))
          el.setAttribute('cy', String(base.cy + oy))
        }
      }
      for (const [ref, base] of [
        [ls1Ref, EL], [rs1Ref, ER],
      ] as const) {
        const el = ref.current
        if (el) {
          el.setAttribute('cx', String(base.cx + ox + 6))
          el.setAttribute('cy', String(base.cy + oy - 6))
        }
      }
    }

    function onClick() {
      setExpr('happy')
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setExpr('normal'), 900)
    }

    function onScroll() {
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

  const pr = expr === 'surprised' ? PUPIL_R + 4 : expr === 'happy' ? PUPIL_R - 4 : PUPIL_R

  return (
    <>
      <style>{css}</style>
      <div ref={wrapRef} className="cat-wrap">
        <svg
          viewBox="0 0 170 112"
          width="148"
          height="98"
          className={`cat-svg cat-${expr}`}
          aria-hidden="true"
        >
          {/* ── Main silhouette ───────────────────────────────────────── */}
          <path
            d={[
              // left wall → up left side
              'M0,112 L0,76',
              // left ear: outer slope up, tip, inner slope
              'Q4,44 32,14 L16,0 L44,22',
              // forehead arc
              'Q62,10 85,8 Q108,10 126,22',
              // right ear
              'L154,0 L138,14',
              // right side down
              'Q166,44 170,76 L170,112',
              // fluffy bottom edge (wavy fur)
              'C162,104 154,112 146,106',
              'C138,100 130,110 122,105',
              'C114,100 106,112 98,106',
              'C90,100  82,112  74,106',
              'C66,100  58,112  50,106',
              'C42,100  34,110  26,105',
              'C18,100  10,112   0,112 Z',
            ].join(' ')}
            fill="#111"
          />

          {/* ── Fur texture lines (inner ear, forehead tufts) ─────────── */}
          {/* left ear inner detail */}
          <path d="M18,3 Q28,16 40,22" stroke="#2a2a2a" strokeWidth="2" fill="none" strokeLinecap="round"/>
          {/* right ear inner detail */}
          <path d="M152,3 Q142,16 130,22" stroke="#2a2a2a" strokeWidth="2" fill="none" strokeLinecap="round"/>
          {/* forehead tufts */}
          <path d="M68,20 Q72,14 70,8"  stroke="#1e1e1e" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          <path d="M82,14 Q85,8 86,4"   stroke="#1e1e1e" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          <path d="M98,14 Q98,8 100,4"  stroke="#1e1e1e" strokeWidth="1.5" fill="none" strokeLinecap="round"/>

          {/* ── Whiskers ─────────────────────────────────────────────── */}
          <path d="M0,74  Q-6,70 -10,66" stroke="#555" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
          <path d="M0,82  Q-8,80 -14,78" stroke="#555" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
          <path d="M170,74 Q176,70 180,66" stroke="#555" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
          <path d="M170,82 Q178,80 184,78" stroke="#555" strokeWidth="1.4" fill="none" strokeLinecap="round"/>

          {/* ── Eyes ─────────────────────────────────────────────────── */}
          {/* white sclera */}
          <circle cx={EL.cx} cy={EL.cy} r={EYE_R} fill="white"/>
          <circle cx={ER.cx} cy={ER.cy} r={EYE_R} fill="white"/>

          {/* pupils (moved via ref on mousemove) */}
          <circle ref={lpRef} cx={EL.cx} cy={EL.cy} r={pr} fill="#111"/>
          <circle ref={rpRef} cx={ER.cx} cy={ER.cy} r={pr} fill="#111"/>

          {/* shine */}
          <circle ref={ls1Ref} cx={EL.cx + 6} cy={EL.cy - 6} r={pr * 0.35} fill="white"/>
          <circle ref={rs1Ref} cx={ER.cx + 6} cy={ER.cy - 6} r={pr * 0.35} fill="white"/>

          {/* happy arc eyes overlay */}
          {expr === 'happy' && <>
            <path d={`M${EL.cx-EYE_R+2},${EL.cy+2} Q${EL.cx},${EL.cy-EYE_R+4} ${EL.cx+EYE_R-2},${EL.cy+2}`}
              stroke="#111" strokeWidth="3.5" fill="white" strokeLinecap="round"/>
            <path d={`M${ER.cx-EYE_R+2},${ER.cy+2} Q${ER.cx},${ER.cy-EYE_R+4} ${ER.cx+EYE_R-2},${ER.cy+2}`}
              stroke="#111" strokeWidth="3.5" fill="white" strokeLinecap="round"/>
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
  animation: cat-peek-in .7s cubic-bezier(.34,1.46,.64,1) both;
}
@keyframes cat-peek-in {
  from { transform: translateY(80%); opacity: 0; }
  to   { transform: translateY(0);   opacity: 1; }
}
.cat-svg {
  display: block;
  overflow: visible;
  filter: drop-shadow(0 -2px 8px rgba(0,0,0,.25));
  animation: cat-idle 4s ease-in-out infinite;
}
@keyframes cat-idle {
  0%,100% { transform: translateY(0); }
  50%     { transform: translateY(-5px); }
}
.cat-surprised {
  animation: cat-shock .35s ease both !important;
}
@keyframes cat-shock {
  0%   { transform: translateY(0); }
  30%  { transform: translateY(-10px) scale(1.06); }
  100% { transform: translateY(0); }
}
.cat-happy {
  animation: cat-happy .45s ease both !important;
}
@keyframes cat-happy {
  0%   { transform: translateY(0) rotate(0deg); }
  35%  { transform: translateY(-8px) rotate(-4deg); }
  70%  { transform: translateY(-4px) rotate(3deg); }
  100% { transform: translateY(0) rotate(0deg); }
}
`

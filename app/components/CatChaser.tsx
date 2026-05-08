'use client'
import { useEffect, useRef, useState } from 'react'

type Expression = 'normal' | 'happy' | 'surprised' | 'sleepy'

const MAX_PUPIL = 2.8   // max pupil offset in SVG units
const EYE_L = { cx: 27, cy: 47 }
const EYE_R = { cx: 55, cy: 47 }

export default function CatChaser() {
  const wrapRef  = useRef<HTMLDivElement>(null)
  const lpRef    = useRef<SVGCircleElement>(null)
  const rpRef    = useRef<SVGCircleElement>(null)
  const lsRef    = useRef<SVGCircleElement>(null)  // shine left
  const rsRef    = useRef<SVGCircleElement>(null)  // shine right
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const [expr, setExpr] = useState<Expression>('normal')

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return

    function trackMouse(e: MouseEvent) {
      if (!el) return
      const rect = el.getBoundingClientRect()
      // center of cat face in viewport coords
      const cx = rect.left + rect.width  * 0.5
      const cy = rect.top  + rect.height * 0.42

      const angle = Math.atan2(e.clientY - cy, e.clientX - cx)
      const dist  = Math.hypot(e.clientX - cx, e.clientY - cy)
      const t     = Math.min(dist / 200, 1)  // 0–1 intensity
      const ox    = Math.cos(angle) * MAX_PUPIL * t
      const oy    = Math.sin(angle) * MAX_PUPIL * t

      ;[
        [lpRef, EYE_L],
        [rpRef, EYE_R],
      ].forEach(([ref, eye]) => {
        const el = (ref as typeof lpRef).current
        if (!el) return
        el.setAttribute('cx', String((eye as typeof EYE_L).cx + ox))
        el.setAttribute('cy', String((eye as typeof EYE_L).cy + oy))
      })
      ;[
        [lsRef, EYE_L],
        [rsRef, EYE_R],
      ].forEach(([ref, eye]) => {
        const el = (ref as typeof lsRef).current
        if (!el) return
        el.setAttribute('cx', String((eye as typeof EYE_L).cx + ox + 1.8))
        el.setAttribute('cy', String((eye as typeof EYE_L).cy + oy - 1.8))
      })
    }

    function onClick() {
      setExpr('happy')
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setExpr('normal'), 900)
    }

    function onScroll() {
      setExpr('surprised')
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setExpr('normal'), 600)
    }

    window.addEventListener('mousemove', trackMouse)
    window.addEventListener('click', onClick)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('mousemove', trackMouse)
      window.removeEventListener('click', onClick)
      window.removeEventListener('scroll', onScroll)
      clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <>
      <style>{css}</style>
      <div ref={wrapRef} className="cat-corner">
        <svg viewBox="0 0 82 90" width="82" height="90" className={`cat-svg cat-${expr}`}>
          {/* ── Ears ── */}
          <polygon points="9,36 19,6 32,30"   fill="#F0A040"/>
          <polygon points="50,30 63,6 73,36"   fill="#F0A040"/>
          <polygon points="11,35 19,10 30,30"  fill="#FFCDD2"/>
          <polygon points="52,30 63,10 71,35"  fill="#FFCDD2"/>

          {/* ── Head ── */}
          <ellipse cx="41" cy="49" rx="35" ry="31" fill="#F0A040"/>

          {/* ── Forehead stripe ── */}
          <path d="M31,31 Q41,26 51,31" stroke="#C4621A" strokeWidth="1.6" fill="none" opacity="0.35"/>
          <path d="M36,23 Q41,19 46,23" stroke="#C4621A" strokeWidth="1.4" fill="none" opacity="0.3"/>

          {/* ── Eyes ── */}
          {/* sclera */}
          <ellipse cx={EYE_L.cx} cy={EYE_L.cy} rx="11" ry="10" fill="#FFF8E7"/>
          <ellipse cx={EYE_R.cx} cy={EYE_R.cy} rx="11" ry="10" fill="#FFF8E7"/>
          {/* iris */}
          <circle  cx={EYE_L.cx} cy={EYE_L.cy} r="7.5" fill="#3DAA90"/>
          <circle  cx={EYE_R.cx} cy={EYE_R.cy} r="7.5" fill="#3DAA90"/>
          {/* iris ring */}
          <circle  cx={EYE_L.cx} cy={EYE_L.cy} r="7.5" fill="none" stroke="#2A8870" strokeWidth="0.8"/>
          <circle  cx={EYE_R.cx} cy={EYE_R.cy} r="7.5" fill="none" stroke="#2A8870" strokeWidth="0.8"/>

          {/* pupils — moved via ref */}
          <circle ref={lpRef} cx={EYE_L.cx} cy={EYE_L.cy}
            r={expr === 'surprised' ? 5.5 : expr === 'happy' ? 3 : 4.5}
            fill="#111" className="cat-pupil"/>
          <circle ref={rpRef} cx={EYE_R.cx} cy={EYE_R.cy}
            r={expr === 'surprised' ? 5.5 : expr === 'happy' ? 3 : 4.5}
            fill="#111" className="cat-pupil"/>

          {/* shine — moved via ref */}
          <circle ref={lsRef} cx={EYE_L.cx + 1.8} cy={EYE_L.cy - 1.8} r="1.6" fill="white"/>
          <circle ref={rsRef} cx={EYE_R.cx + 1.8} cy={EYE_R.cy - 1.8} r="1.6" fill="white"/>

          {/* happy arc eyes overlay */}
          {expr === 'happy' && <>
            <path d="M18,47 Q27,40 36,47" stroke="#111" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
            <path d="M46,47 Q55,40 64,47" stroke="#111" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
          </>}

          {/* ── Nose ── */}
          <polygon points="38,60 44,60 41,64" fill="#FF8FAB"/>
          {/* philtrum */}
          <line x1="41" y1="64" x2="41" y2="65.5" stroke="#999" strokeWidth="0.9"/>
          {/* ── Mouth ── */}
          {expr === 'happy'
            ? <path d="M35,66 Q41,72 47,66" stroke="#888" strokeWidth="1.2" fill="none"/>
            : <path d="M36,66 Q41,69.5 46,66" stroke="#888" strokeWidth="1" fill="none"/>
          }

          {/* ── Blush (happy) ── */}
          {expr === 'happy' && <>
            <ellipse cx="20" cy="56" rx="7" ry="4" fill="#FFB3C6" opacity="0.55"/>
            <ellipse cx="62" cy="56" rx="7" ry="4" fill="#FFB3C6" opacity="0.55"/>
          </>}

          {/* ── Whiskers ── */}
          <line x1="1"  y1="56" x2="22" y2="58" stroke="#BBB" strokeWidth="0.9"/>
          <line x1="1"  y1="63" x2="22" y2="62" stroke="#BBB" strokeWidth="0.9"/>
          <line x1="60" y1="58" x2="81" y2="56" stroke="#BBB" strokeWidth="0.9"/>
          <line x1="60" y1="62" x2="81" y2="63" stroke="#BBB" strokeWidth="0.9"/>

          {/* ── Chest / neck ── */}
          <ellipse cx="41" cy="78" rx="24" ry="14" fill="#F4B060"/>
          <ellipse cx="41" cy="84" rx="17" ry="9"  fill="#FFF5E0"/>
        </svg>
      </div>
    </>
  )
}

const css = `
.cat-corner {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 9999;
  pointer-events: none;
  user-select: none;
  animation: cat-peek-in .6s cubic-bezier(.34,1.56,.64,1) both;
}
@keyframes cat-peek-in {
  from { transform: translate(50%, -60%); opacity: 0; }
  to   { transform: translate(0, 0);      opacity: 1; }
}
.cat-svg {
  display: block;
  filter: drop-shadow(0 4px 12px rgba(0,0,0,.18));
  animation: cat-idle 3.5s ease-in-out infinite;
}
@keyframes cat-idle {
  0%,100% { transform: translateY(0); }
  50%     { transform: translateY(3px); }
}
.cat-surprised {
  animation: cat-surprised-shake .3s ease both;
}
@keyframes cat-surprised-shake {
  0%,100% { transform: rotate(0deg); }
  25%     { transform: rotate(-4deg) translateY(-3px); }
  75%     { transform: rotate(4deg)  translateY(-3px); }
}
.cat-happy {
  animation: cat-happy-bounce .4s ease both;
}
@keyframes cat-happy-bounce {
  0%     { transform: translateY(0) scale(1); }
  40%    { transform: translateY(-8px) scale(1.08); }
  100%   { transform: translateY(0) scale(1); }
}
/* ear twitch on right ear every 5s */
.cat-svg polygon:nth-child(2) {
  transform-origin: 63px 6px;
  animation: ear-twitch 5s ease-in-out infinite;
}
@keyframes ear-twitch {
  0%,88%,100% { transform: rotate(0deg); }
  90%         { transform: rotate(-12deg); }
  95%         { transform: rotate(4deg); }
}
`

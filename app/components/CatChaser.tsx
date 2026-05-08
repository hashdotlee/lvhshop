'use client'
import { useEffect, useRef } from 'react'

const S = 52 // cat size px
const SPEED = 2.8
const SPEED_SCROLL = 9
const SPEED_CLICK = 14

// ── Perimeter math ────────────────────────────────────────────────
function perimToXY(p: number, W: number, H: number) {
  const T = 2 * (W + H)
  p = ((p % T) + T) % T
  if (p < W)       return { x: p,        y: 0,   flipX: false, rotate: 0   }
  if (p < W + H)   return { x: W,        y: p-W, flipX: false, rotate: 90  }
  if (p < 2*W + H) return { x: 2*W+H-p, y: H,   flipX: true,  rotate: 180 }
                   return { x: 0,        y: T-p, flipX: true,  rotate: -90 }
}

function mouseToPerim(mx: number, my: number, W: number, H: number) {
  const d = [my, W - mx, H - my, mx]
  const min = Math.min(...d)
  if (d[0] === min) return mx
  if (d[1] === min) return W + my
  if (d[2] === min) return W + H + (W - mx)
  return 2*W + H + (H - my)
}

function moveToward(cur: number, tgt: number, spd: number, T: number) {
  const diff = ((tgt - cur + T / 2) % T) - T / 2
  if (Math.abs(diff) <= spd) return tgt
  return (cur + Math.sign(diff) * spd + T) % T
}

// ── Cat SVG ───────────────────────────────────────────────────────
function catSVG(frame: number, state: string): string {
  const run = state === 'run' || state === 'zoom'
  const pounce = state === 'pounce'
  const zoom = state === 'zoom'

  // Leg offsets by frame (0-3) — front/back pairs alternating
  const lf = [0, 1, 2, 3].map(f => {
    if (!run) return 0
    return f === frame ? -5 : f === ((frame + 2) % 4) ? 5 : 0
  })
  // front pair and back pair
  const fLeg = run ? (frame < 2 ? -4 : 4) : 0
  const bLeg = run ? (frame < 2 ? 4 : -4) : 0

  // Eyes
  const eyeH = pounce ? 1.5 : zoom ? 3 : 2.2
  const eyeW = pounce ? 3   : zoom ? 2 : 2.5

  // Body bob
  const bodyY = run ? (frame % 2 === 0 ? -1 : 1) : pounce ? -4 : 0

  // Tail path
  const tailPath = pounce
    ? 'M5,21 Q-4,10 2,3'
    : zoom
    ? 'M5,21 Q-6,18 -4,10'
    : frame % 2 === 0
    ? 'M5,21 Q-3,14 1,6'
    : 'M5,21 Q-5,16 -1,8'

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-8 -4 60 52" width="${S}" height="${S}">
  <g transform="translate(0,${bodyY})">

    <!-- TAIL -->
    <path d="${tailPath}" stroke="#D4752A" stroke-width="4" fill="none" stroke-linecap="round"/>
    <circle cx="${tailPath.match(/(\S+)$/)?.[0].split(',')[0] ?? 1}" cy="${tailPath.match(/(\S+)$/)?.[0].split(',')[1] ?? 6}" r="3.5" fill="#C4621A"/>

    <!-- BODY -->
    <ellipse cx="22" cy="22" rx="17" ry="10" fill="#E8963C"/>

    <!-- STRIPES on body -->
    <path d="M17,14 Q15,22 17,30" stroke="#C4621A" stroke-width="1.8" fill="none" opacity="0.5"/>
    <path d="M23,13 Q21,22 23,31" stroke="#C4621A" stroke-width="1.8" fill="none" opacity="0.5"/>

    <!-- BACK LEGS -->
    <rect x="10" y="30" width="5" height="${10 + bLeg}" rx="2.5" fill="#D4842A"/>
    <rect x="16" y="30" width="5" height="${10 - bLeg}" rx="2.5" fill="#E8963C"/>

    <!-- FRONT LEGS -->
    <rect x="27" y="30" width="5" height="${10 + fLeg}" rx="2.5" fill="#D4842A"/>
    <rect x="33" y="30" width="5" height="${10 - fLeg}" rx="2.5" fill="#E8963C"/>

    <!-- NECK -->
    <ellipse cx="34" cy="17" rx="7" ry="7" fill="#E8963C"/>

    <!-- HEAD -->
    <circle cx="36" cy="12" r="12" fill="#F0A040"/>

    <!-- EARS -->
    <polygon points="27,7 29,0 34,7" fill="#F0A040"/>
    <polygon points="38,5 43,0 46,6" fill="#F0A040"/>
    <polygon points="28,7 30,2.5 33.5,7" fill="#FFCDD2"/>
    <polygon points="38.5,5.5 42.5,2 45,6" fill="#FFCDD2"/>

    <!-- FOREHEAD STRIPE -->
    <path d="M33,4 Q36,8 39,4" stroke="#C4621A" stroke-width="1.2" fill="none" opacity="0.5"/>

    <!-- EYES -->
    <ellipse cx="32" cy="12" rx="${eyeW}" ry="${eyeH}" fill="#1A1A1A"/>
    <ellipse cx="40" cy="12" rx="${eyeW}" ry="${eyeH}" fill="#1A1A1A"/>
    ${!pounce ? `
    <circle cx="33" cy="11" r="1" fill="white"/>
    <circle cx="41" cy="11" r="1" fill="white"/>
    ` : ''}
    ${pounce ? `
    <!-- happy arc eyes -->
    <path d="M30,13 Q32,10 34,13" stroke="#1A1A1A" stroke-width="1.5" fill="none"/>
    <path d="M38,13 Q40,10 42,13" stroke="#1A1A1A" stroke-width="1.5" fill="none"/>
    ` : ''}

    <!-- NOSE -->
    <ellipse cx="36" cy="16.5" rx="1.8" ry="1.2" fill="#FF8FAB"/>
    <!-- MOUTH -->
    <path d="M34.5,18 Q36,20 37.5,18" stroke="#888" stroke-width="0.8" fill="none"/>
    ${zoom || pounce ? '<path d="M33,19 Q36,22 39,19" stroke="#888" stroke-width="0.8" fill="none"/>' : ''}

    <!-- WHISKERS -->
    <line x1="21" y1="15.5" x2="32" y2="15.5" stroke="#CCC" stroke-width="0.7" opacity="0.8"/>
    <line x1="21" y1="17.5" x2="32" y2="17.5" stroke="#CCC" stroke-width="0.7" opacity="0.8"/>
    <line x1="40" y1="15.5" x2="50" y2="14.5" stroke="#CCC" stroke-width="0.7" opacity="0.8"/>
    <line x1="40" y1="17.5" x2="50" y2="16.5" stroke="#CCC" stroke-width="0.7" opacity="0.8"/>

    <!-- BLUSH (pounce / happy) -->
    ${pounce ? `
    <ellipse cx="29" cy="16" rx="3" ry="1.8" fill="#FFB3C6" opacity="0.6"/>
    <ellipse cx="43" cy="16" rx="3" ry="1.8" fill="#FFB3C6" opacity="0.6"/>
    ` : ''}
    ${zoom ? `
    <!-- speed lines -->
    <line x1="-2" y1="18" x2="6" y2="18" stroke="#FFA030" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
    <line x1="-4" y1="22" x2="5" y2="22" stroke="#FFA030" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>
    <line x1="-1" y1="14" x2="6" y2="14" stroke="#FFA030" stroke-width="1" stroke-linecap="round" opacity="0.4"/>
    ` : ''}

  </g>
</svg>`
}

// ── Main component ─────────────────────────────────────────────────
export default function CatChaser() {
  const wrapRef    = useRef<HTMLDivElement>(null)
  const perimRef   = useRef(300)
  const targetRef  = useRef(300)
  const mouseRef   = useRef({ x: -999, y: -999 })
  const speedRef   = useRef(SPEED)
  const stateRef   = useRef<'run'|'pounce'|'zoom'>('run')
  const frameRef   = useRef(0)
  const tickRef    = useRef(0)
  const rafRef     = useRef<number>()
  const timerRef   = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return

    const onMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }

    const onScroll = () => {
      speedRef.current = SPEED_SCROLL
      stateRef.current = 'zoom'
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        speedRef.current = SPEED
        stateRef.current = 'run'
      }, 500)
    }

    const onClick = () => {
      if (stateRef.current === 'zoom') return
      speedRef.current = SPEED_CLICK
      stateRef.current = 'pounce'
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        speedRef.current = SPEED
        stateRef.current = 'run'
      }, 800)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('click', onClick)

    function animate() {
      const W = window.innerWidth
      const H = window.innerHeight
      const T = 2 * (W + H)
      const { x: mx, y: my } = mouseRef.current

      if (mx > 0) targetRef.current = mouseToPerim(mx, my, W, H)
      perimRef.current = moveToward(perimRef.current, targetRef.current, speedRef.current, T)

      const { x, y, flipX, rotate } = perimToXY(perimRef.current, W, H)

      tickRef.current++
      // frame changes every 6 ticks when running, every 3 when zooming
      const frameRate = stateRef.current === 'zoom' ? 3 : 6
      if (tickRef.current % frameRate === 0) {
        frameRef.current = (frameRef.current + 1) % 4
      }

      if (el) {
        el.style.left = `${x - S / 2}px`
        el.style.top  = `${y - S / 2}px`

        const transforms: string[] = []
        if (rotate) transforms.push(`rotate(${rotate}deg)`)
        if (flipX)  transforms.push('scaleX(-1)')
        if (stateRef.current === 'pounce') transforms.push('scale(1.2)')
        el.style.transform = transforms.join(' ')

        el.innerHTML = catSVG(frameRef.current, stateRef.current)
      }

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(rafRef.current!)
      clearTimeout(timerRef.current)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('click', onClick)
    }
  }, [])

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'fixed',
        width: S,
        height: S,
        zIndex: 9998,
        pointerEvents: 'none',
        userSelect: 'none',
        transformOrigin: 'center center',
        willChange: 'transform, left, top',
      }}
    />
  )
}

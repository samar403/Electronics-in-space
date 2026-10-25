import { useEffect, useRef } from 'react'
import { onStrike, prefersReducedMotion, type StrikeKind } from '../lib/radStore'

interface Track {
  x0: number
  y0: number
  x: number
  y: number
  born: number
  kind: StrikeKind
}

const COLORS: Record<StrikeKind, string> = {
  flip: '255,77,94',
  deflect: '70,217,255',
  correct: '255,181,71',
}

/** Full-screen, click-through canvas that draws particle tracks ending at each strike. */
export function StrikeOverlay() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = ref.current!
    const ctx = cv.getContext('2d')!
    let tracks: Track[] = []
    let raf = 0
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const resize = () => {
      cv.width = innerWidth * dpr
      cv.height = innerHeight * dpr
    }
    resize()
    addEventListener('resize', resize)

    const draw = () => {
      const now = performance.now()
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, innerWidth, innerHeight)
      tracks = tracks.filter((t) => now - t.born < 900)
      for (const t of tracks) {
        const age = (now - t.born) / 900
        const c = COLORS[t.kind]
        const head = Math.min(1, age * 6) // the ion arrives in ~150 ms
        const hx = t.x0 + (t.x - t.x0) * head
        const hy = t.y0 + (t.y - t.y0) * head
        const g = ctx.createLinearGradient(t.x0, t.y0, hx, hy)
        g.addColorStop(0, `rgba(${c},0)`)
        g.addColorStop(1, `rgba(${c},${0.9 * (1 - age)})`)
        ctx.strokeStyle = g
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.moveTo(t.x0, t.y0)
        ctx.lineTo(hx, hy)
        ctx.stroke()
        if (head >= 1) {
          const r = 4 + age * 26
          ctx.strokeStyle = `rgba(${c},${0.8 * (1 - age)})`
          ctx.lineWidth = t.kind === 'deflect' ? 1.5 : 1
          ctx.beginPath()
          ctx.arc(t.x, t.y, r, 0, Math.PI * 2)
          ctx.stroke()
          if (t.kind === 'flip') {
            ctx.fillStyle = `rgba(${c},${0.35 * (1 - age)})`
            ctx.beginPath()
            ctx.arc(t.x, t.y, r * 0.5, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }
      raf = tracks.length ? requestAnimationFrame(draw) : 0
    }

    const off = onStrike((x, y, kind) => {
      if (prefersReducedMotion) return
      // Cosmic rays arrive from every direction; bias toward "from above".
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2
      const len = 180 + Math.random() * 260
      tracks.push({ x, y, x0: x - Math.cos(a) * len, y0: y + Math.sin(a) * len, born: performance.now(), kind })
      if (!raf) raf = requestAnimationFrame(draw)
    })
    return () => {
      off()
      removeEventListener('resize', resize)
      cancelAnimationFrame(raf)
    }
  }, [])

  return <canvas ref={ref} className="strike-overlay" aria-hidden="true" />
}

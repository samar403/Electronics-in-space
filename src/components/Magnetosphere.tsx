import { useEffect, useRef } from 'react'
import { radiusRe } from '../lib/orbit'
import { prefersReducedMotion } from '../lib/radStore'

interface Props {
  /** Altitude of the highlighted spacecraft, km. */
  altitudeKm: number
  /** Horizontal position of Earth's centre, 0–1 of width. */
  cx?: number
  /** Earth radius in px as a fraction of min(width, height). */
  scale?: number
  showLabels?: boolean
  className?: string
  label?: string
}

const INNER = { L: 1.55, w: 0.33 } // trapped protons
const OUTER = { L: 4.6, w: 1.15 } // trapped electrons

function beltIntensity(L: number, lat: number) {
  if (L < 1.12 || L > 10) return [0, 0]
  const c = Math.cos(lat)
  const along = Math.pow(c, 8) // particles mirror before reaching high latitude
  const p = Math.exp(-Math.pow((L - INNER.L) / INNER.w, 2)) * along
  const e = Math.exp(-Math.pow((L - OUTER.L) / OUTER.w, 2)) * Math.pow(c, 5)
  return [p, e]
}

interface Particle {
  L: number
  phase: number
  speed: number
  side: 1 | -1
  kind: 'p' | 'e'
}

/**
 * Meridional cross-section of Earth's magnetosphere in a centred-dipole approximation:
 * field lines r = L·cos²λ, the proton (inner) and electron (outer) Van Allen belts,
 * bouncing trapped particles, reference orbits and a spacecraft at the chosen altitude.
 */
export function Magnetosphere({ altitudeKm, cx = 0.62, scale = 0.085, showLabels = true, className = '', label }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const altRef = useRef(altitudeKm)
  altRef.current = altitudeKm

  useEffect(() => {
    const cv = ref.current!
    const ctx = cv.getContext('2d')!
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let W = 0
    let H = 0
    let R = 0
    let X = 0
    let Y = 0
    let belts: HTMLCanvasElement | null = null
    let raf = 0
    let visible = true
    let shownR = radiusRe(altRef.current)
    let angle = -0.6

    const particles: Particle[] = Array.from({ length: 140 }, (_, i) => {
      const inner = i % 3 !== 0
      const L = inner ? INNER.L + (Math.random() - 0.5) * 0.7 : OUTER.L + (Math.random() - 0.5) * 2.4
      return {
        L: Math.max(1.2, L),
        phase: Math.random() * Math.PI * 2,
        speed: (inner ? 0.9 : 1.6) * (0.6 + Math.random() * 0.8),
        side: Math.random() < 0.5 ? 1 : -1,
        kind: inner ? 'p' : 'e',
      }
    })

    const buildBelts = () => {
      // Render the belt heat-map once per resize at reduced resolution.
      const s = 0.5
      const bw = Math.max(1, Math.floor(W * s))
      const bh = Math.max(1, Math.floor(H * s))
      const off = document.createElement('canvas')
      off.width = bw
      off.height = bh
      const octx = off.getContext('2d')!
      const img = octx.createImageData(bw, bh)
      const d = img.data
      for (let py = 0; py < bh; py++) {
        for (let px = 0; px < bw; px++) {
          const x = (px / s - X) / R
          const y = (Y - py / s) / R
          const r = Math.hypot(x, y)
          if (r < 1.02) continue
          const lat = Math.atan2(y, Math.abs(x))
          const c = Math.cos(lat)
          const L = r / (c * c)
          const [p, e] = beltIntensity(L, lat)
          if (p + e < 0.01) continue
          const i = (py * bw + px) * 4
          // protons: amber, electrons: Cherenkov blue (additive)
          d[i] = Math.min(255, 255 * p * 0.95 + 70 * e * 0.5)
          d[i + 1] = Math.min(255, 150 * p * 0.85 + 217 * e * 0.55)
          d[i + 2] = Math.min(255, 50 * p * 0.6 + 255 * e * 0.6)
          d[i + 3] = Math.min(255, 255 * (p * 0.42 + e * 0.32))
        }
      }
      octx.putImageData(img, 0, 0)
      belts = off
    }

    const resize = () => {
      const rect = cv.getBoundingClientRect()
      W = rect.width
      H = rect.height
      cv.width = Math.floor(W * dpr)
      cv.height = Math.floor(H * dpr)
      R = Math.max(18, Math.min(W, H) * scale)
      X = W * cx
      Y = H * 0.5
      buildBelts()
      if (prefersReducedMotion) frame(0)
    }

    const fieldLine = (L: number, side: 1 | -1) => {
      const lmax = Math.acos(Math.sqrt(1 / L))
      ctx.beginPath()
      for (let k = 0; k <= 64; k++) {
        const lat = -lmax + (2 * lmax * k) / 64
        const c = Math.cos(lat)
        const r = L * c * c
        const x = X + side * r * c * R
        const y = Y - r * Math.sin(lat) * R
        k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
      }
      ctx.stroke()
    }

    const mono = (txt: string, x: number, y: number, color: string, align: CanvasTextAlign = 'left') => {
      ctx.font = '500 10px "JetBrains Mono", ui-monospace, monospace'
      ctx.fillStyle = color
      ctx.textAlign = align
      ctx.fillText(txt, x, y)
    }

    let last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)

      // Field lines
      ctx.lineWidth = 0.7
      for (const L of [1.3, 1.7, 2.2, 3, 4, 5.2, 6.6, 8.5, 11]) {
        ctx.strokeStyle = `rgba(160,190,215,${L > 8 ? 0.06 : 0.11})`
        fieldLine(L, 1)
        fieldLine(L, -1)
      }
      if (belts) ctx.drawImage(belts, 0, 0, W, H)

      // Magnetic axis
      ctx.setLineDash([2, 6])
      ctx.strokeStyle = 'rgba(160,190,215,0.15)'
      ctx.beginPath()
      ctx.moveTo(X, Y - R * 9)
      ctx.lineTo(X, Y + R * 9)
      ctx.stroke()
      ctx.setLineDash([])

      // Reference orbits
      const orbits: [number, string][] = [
        [radiusRe(550), 'LEO 550 km'],
        [radiusRe(20200), 'MEO / GNSS 20,200 km'],
        [radiusRe(35786), 'GEO 35,786 km'],
      ]
      ctx.setLineDash([3, 5])
      for (const [r, name] of orbits) {
        ctx.strokeStyle = 'rgba(232,238,242,0.16)'
        ctx.beginPath()
        ctx.arc(X, Y, r * R, 0, Math.PI * 2)
        ctx.stroke()
        const lx = X + r * R * Math.cos(0.42) + 6
        if (showLabels && r > 2 && lx < W - 190) mono(name, lx, Y + r * R * Math.sin(0.42), 'rgba(232,238,242,0.45)')
      }
      ctx.setLineDash([])

      // Trapped particles bouncing between mirror points while gyrating
      for (const p of particles) {
        if (!prefersReducedMotion) p.phase += dt * p.speed
        const lm = Math.acos(Math.sqrt(1 / p.L)) * (p.kind === 'p' ? 0.45 : 0.6)
        const lat = lm * Math.sin(p.phase)
        const c = Math.cos(lat)
        const r = p.L * c * c
        const x = X + p.side * r * c * R
        const y = Y - r * Math.sin(lat) * R
        ctx.fillStyle = p.kind === 'p' ? 'rgba(255,181,71,0.85)' : 'rgba(70,217,255,0.8)'
        ctx.fillRect(x - 0.8, y - 0.8, 1.6, 1.6)
      }

      // Earth
      const g = ctx.createRadialGradient(X - R * 0.35, Y - R * 0.35, R * 0.1, X, Y, R)
      g.addColorStop(0, '#1c3346')
      g.addColorStop(1, '#070d13')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(X, Y, R, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(124,255,178,0.35)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(X, Y, R * 1.03, 0, Math.PI * 2)
      ctx.stroke()
      ctx.strokeStyle = 'rgba(160,190,215,0.12)'
      for (const lat of [-60, -30, 0, 30, 60]) {
        const yy = Y - Math.sin((lat * Math.PI) / 180) * R
        const hw = Math.cos((lat * Math.PI) / 180) * R
        ctx.beginPath()
        ctx.moveTo(X - hw, yy)
        ctx.lineTo(X + hw, yy)
        ctx.stroke()
      }

      // Spacecraft on the chosen orbit (eases between altitudes)
      const target = radiusRe(altRef.current)
      shownR += (target - shownR) * Math.min(1, dt * 3)
      if (!prefersReducedMotion) angle += dt * (0.5 / Math.pow(shownR, 1.5))
      ctx.strokeStyle = 'rgba(70,217,255,0.55)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(X, Y, shownR * R, 0, Math.PI * 2)
      ctx.stroke()
      const sx = X + Math.cos(angle) * shownR * R
      const sy = Y + Math.sin(angle) * shownR * R
      ctx.fillStyle = '#46d9ff'
      ctx.shadowColor = '#46d9ff'
      ctx.shadowBlur = 12
      ctx.fillRect(sx - 3, sy - 3, 6, 6)
      ctx.shadowBlur = 0
      ctx.fillRect(sx - 10, sy - 1, 5, 2)
      ctx.fillRect(sx + 5, sy - 1, 5, 2)

      if (showLabels) {
        const ix = X + INNER.L * R * 0.95
        const iy = Y - INNER.L * R * 0.62
        ctx.strokeStyle = 'rgba(255,181,71,0.5)'
        ctx.beginPath()
        ctx.moveTo(ix, iy)
        ctx.lineTo(ix + 26, iy - 26)
        ctx.lineTo(ix + 40, iy - 26)
        ctx.stroke()
        mono('INNER BELT · p⁺ 10–400 MeV', ix + 44, iy - 23, 'rgba(255,181,71,0.9)')
        const ox = X + OUTER.L * R * 0.62
        const oy = Y - OUTER.L * R * 0.5
        if (ox < W - 220) {
          ctx.strokeStyle = 'rgba(70,217,255,0.5)'
          ctx.beginPath()
          ctx.moveTo(ox, oy)
          ctx.lineTo(ox + 26, oy - 26)
          ctx.lineTo(ox + 40, oy - 26)
          ctx.stroke()
          mono('OUTER BELT · e⁻ 0.1–10 MeV', ox + 44, oy - 23, 'rgba(70,217,255,0.9)')
        }
        mono('SLOT', X + 2.55 * R, Y + 3, 'rgba(232,238,242,0.45)', 'center')
        if (label) mono(label, sx + 10, sy - 10, '#46d9ff')
      }

      if (!prefersReducedMotion && visible) raf = requestAnimationFrame(frame)
    }

    const ro = new ResizeObserver(resize)
    ro.observe(cv)
    resize()
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      cancelAnimationFrame(raf)
      if (visible && !prefersReducedMotion) {
        last = performance.now()
        raf = requestAnimationFrame(frame)
      }
    })
    io.observe(cv)
    return () => {
      ro.disconnect()
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [cx, scale, showLabels, label, prefersReducedMotion ? altitudeKm : 0])

  return (
    <canvas
      ref={ref}
      className={className}
      role="img"
      aria-label={`Cross-section of Earth's magnetosphere showing the inner proton belt, the outer electron belt and a spacecraft at ${altitudeKm.toLocaleString('en-US')} km.`}
    />
  )
}

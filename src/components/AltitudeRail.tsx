import { useEffect, useRef, useState } from 'react'
import { REGIMES, type RegimeKey } from '../lib/regimes'

export interface RailStop {
  id: string
  regime: RegimeKey
  name: string
}

/** Scroll = ascent. A vertical rail that maps page sections to altitude bands. */
export function AltitudeRail({ stops }: { stops: RailStop[] }) {
  const [pos, setPos] = useState(0)
  const [active, setActive] = useState(0)
  const raf = useRef(0)

  useEffect(() => {
    const update = () => {
      raf.current = 0
      const mid = scrollY + innerHeight / 2
      const tops = stops.map((s) => {
        const el = document.getElementById(s.id)
        return el ? el.getBoundingClientRect().top + scrollY : 0
      })
      let i = 0
      while (i < tops.length - 1 && mid >= tops[i + 1]) i++
      const next = i < tops.length - 1 ? tops[i + 1] : document.documentElement.scrollHeight
      const frac = Math.max(0, Math.min(1, (mid - tops[i]) / Math.max(1, next - tops[i])))
      setActive(i)
      setPos((i + frac) / stops.length)
    }
    const onScroll = () => {
      if (!raf.current) raf.current = requestAnimationFrame(update)
    }
    update()
    addEventListener('scroll', onScroll, { passive: true })
    addEventListener('resize', onScroll)
    return () => {
      removeEventListener('scroll', onScroll)
      removeEventListener('resize', onScroll)
    }
  }, [stops])

  return (
    <nav className="rail" aria-label="Sections by altitude">
      <div className="rail__track">
        <div className="rail__fill" style={{ height: `${pos * 100}%` }} />
        <div className="rail__sat" style={{ top: `${pos * 100}%` }} aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18">
            <rect x="9" y="9" width="6" height="6" fill="currentColor" />
            <rect x="1" y="10" width="7" height="4" fill="none" stroke="currentColor" />
            <rect x="16" y="10" width="7" height="4" fill="none" stroke="currentColor" />
          </svg>
        </div>
      </div>
      <ol className="rail__stops">
        {stops.map((s, i) => (
          <li key={s.id} style={{ top: `${(i / stops.length) * 100}%` }} className={i === active ? 'is-active' : ''}>
            <a href={`#${s.id}`} aria-current={i === active ? 'true' : undefined}>
              <span className="rail__alt">{REGIMES[s.regime].short}</span>
              <span className="rail__name">{s.name}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}

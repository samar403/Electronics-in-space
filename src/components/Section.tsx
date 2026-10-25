import { useEffect, useRef, type ReactNode } from 'react'
import { powerCycle, registerLatchable, setRad, useRad } from '../lib/radStore'
import { REGIMES, type RegimeKey } from '../lib/regimes'
import { F } from './FlipText'

interface Props {
  id: string
  regime: RegimeKey
  index: string
  kicker: string
  title: string
  lede?: string
  children: ReactNode
  className?: string
}

/** A page "altitude band". Reports itself to the radiation engine as you scroll through it. */
export function Section({ id, regime, index, kicker, title, lede, children, className = '' }: Props) {
  const ref = useRef<HTMLElement>(null)
  const latched = useRad((s) => s.latched === id)

  useEffect(() => {
    const el = ref.current!
    let visible = false
    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting
        if (e.isIntersecting) setRad({ scrollRegime: regime })
      },
      { rootMargin: '-45% 0px -45% 0px' },
    )
    io.observe(el)
    const vis = new IntersectionObserver(([e]) => (visible = e.intersectionRatio > 0.35), { threshold: [0, 0.35, 1] })
    vis.observe(el)
    const off = registerLatchable(id, () => visible)
    return () => {
      io.disconnect()
      vis.disconnect()
      off()
    }
  }, [id, regime])

  const r = REGIMES[regime]
  return (
    <section id={id} ref={ref} className={`band ${className} ${latched ? 'band--latched' : ''}`} aria-labelledby={`${id}-title`}>
      <header className="band__head">
        <div className="band__meta">
          <span className="band__index">{index}</span>
          <span className="band__alt">{r.label.includes('km') ? r.label : `${r.altKm.toLocaleString('en-US')} km · ${r.label}`}</span>
        </div>
        <p className="kicker">{kicker}</p>
        <h2 id={`${id}-title`} className="band__title">
          <F>{title}</F>
        </h2>
        {lede && <p className="band__lede">{lede}</p>}
      </header>
      {children}
      {latched && (
        <div className="latch" role="alert">
          <div className="latch__card">
            <p className="latch__code">SEL · VDD_CORE +1.42 A · T_j 118 °C ↑</p>
            <h3>Single-event latch-up</h3>
            <p>
              A heavy ion switched on the parasitic PNPN thyristor inside bulk CMOS. Current is climbing and this
              section has stopped responding. Without a fast power cycle, the part can burn out.
            </p>
            <div className="latch__actions">
              <button className="btn btn--danger" onClick={powerCycle}>
                Power-cycle the rail
              </button>
              <span className="latch__hint">On HALO-7 this cannot happen: FD-SOI's buried oxide has no PNPN path.</span>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

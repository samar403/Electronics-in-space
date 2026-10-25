import { useEffect, useRef } from 'react'
import { effectiveRegime, setMode, setRad, useRad } from '../lib/radStore'
import { REGIMES } from '../lib/regimes'
import { F } from './FlipText'
import { Magnetosphere } from './Magnetosphere'

export function Hero() {
  const mode = useRad((s) => s.mode)
  const regime = REGIMES[useRad((s) => effectiveRegime(s))]
  const halo = mode === 'halo'
  const alt = regime.altKm < 300 ? 550 : regime.altKm > 40000 ? 35786 : regime.altKm
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setRad({ scrollRegime: 'ground' }), {
      rootMargin: '-45% 0px -45% 0px',
    })
    io.observe(ref.current!)
    return () => io.disconnect()
  }, [])

  return (
    <section id="top" ref={ref} className="hero" aria-labelledby="hero-title">
      <Magnetosphere altitudeKm={alt} className="hero__canvas" label={regime.short} />
      <div className="hero__veil" aria-hidden="true" />
      <div className="hero__inner">
        <p className="hero__brand">
          <span className="logo" aria-hidden="true">
            <i />
          </span>
          HALO ORBITAL <span className="muted">/ radiation-hardened AI silicon</span>
        </p>
        <h1 id="hero-title" className="hero__title">
          <F>Silicon that</F>
          <br />
          <em>
            <F>survives the sky.</F>
          </em>
        </h1>
        <p className="hero__lede">
          <F>
            AI is moving into orbit, but space silicon is decades behind. HALO-7 is a 64 TOPS inference chip built on
            latch-up-immune FD-SOI and hardened at every layer, from transistor to compiler, so constellations can run
            modern models through the Van Allen belts.
          </F>
        </p>

        <div className={`hero__status ${halo ? 'is-halo' : ''}`} role="status">
          <span className="pulse" aria-hidden="true" />
          {halo ? (
            <span>
              This page now runs on <b>HALO-7</b>. Strikes are still landing, and they are being corrected.
            </span>
          ) : (
            <span>
              This page runs on <b>unprotected COTS silicon</b>. Real particle-strike statistics are hitting it right
              now. Watch the letters.
            </span>
          )}
        </div>

        <div className="hero__cta">
          <button className={`btn ${halo ? 'btn--ghost' : 'btn--halo'}`} onClick={() => setMode(halo ? 'cots' : 'halo')}>
            {halo ? 'Drop back to COTS' : 'Engage HALO-7 hardening'}
            <kbd>H</kbd>
          </button>
          <a className="btn btn--ghost" href="#planner">
            Plan a mission →
          </a>
        </div>

        <dl className="hero__specs">
          <div>
            <dt>Peak INT8</dt>
            <dd>64 TOPS</dd>
          </div>
          <div>
            <dt>Total dose</dt>
            <dd>300 krad(Si)</dd>
          </div>
          <div>
            <dt>Latch-up</dt>
            <dd>Immune · SOI</dd>
          </div>
          <div>
            <dt>Power</dt>
            <dd>8–25 W</dd>
          </div>
        </dl>
      </div>
      <a className="hero__scroll" href="#thesis">
        <span>Scroll to ascend</span>
        <i aria-hidden="true" />
      </a>
    </section>
  )
}

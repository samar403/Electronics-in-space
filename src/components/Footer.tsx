import { setMode, useRad } from '../lib/radStore'
import { F } from './FlipText'

export function Footer() {
  const stats = useRad((s) => s.stats)
  const mode = useRad((s) => s.mode)
  return (
    <footer className="foot">
      <div className="foot__cta">
        <p className="kicker">End of ascent · 384,400 km</p>
        <h2>
          <F>Build for the sky you actually fly through.</F>
        </h2>
        <p className="foot__recap">
          While you read this page it took <b>{stats.strikes}</b> simulated particle strikes, flipped{' '}
          <b className="t-flip">{stats.upsets}</b> bits and suffered <b className="t-amber">{stats.latchups}</b> latch-ups.{' '}
          {mode === 'halo'
            ? 'Since you engaged HALO-7, every strike has been absorbed or corrected.'
            : 'On HALO-7, every one of those would have been absorbed or corrected.'}
        </p>
        <div className="hero__cta">
          {mode !== 'halo' && (
            <button className="btn btn--halo" onClick={() => setMode('halo')}>
              Engage HALO-7 <kbd>H</kbd>
            </button>
          )}
          <a className="btn btn--ghost" href="https://github.com/samar403/Electronics-in-space" target="_blank" rel="noreferrer">
            Read the thesis on GitHub ↗
          </a>
        </div>
      </div>
      <div className="foot__base">
        <span>HALO Orbital is a concept company. HALO-7 specifications are design targets, not measured results.</span>
        <span>Radiation model: first-order, educational. See docs/RADIATION_MODEL.md.</span>
      </div>
    </footer>
  )
}

import { useEffect, useState } from 'react'
import { effectiveRegime, getRad, setMode, setRad, useRad } from '../lib/radStore'
import { REGIMES, RAIL_ORDER, type RegimeKey } from '../lib/regimes'

const PINNABLE: RegimeKey[] = [...RAIL_ORDER, 'storm']

/** The floating HUD that controls the page-wide radiation simulation. */
export function Dosimeter() {
  const mode = useRad((s) => s.mode)
  const pinned = useRad((s) => s.pinned)
  const paused = useRad((s) => s.paused)
  const sound = useRad((s) => s.sound)
  const stats = useRad((s) => s.stats)
  const pulse = useRad((s) => s.pulse)
  const regime = REGIMES[useRad((s) => effectiveRegime(s))]
  const [open, setOpen] = useState(() => typeof window !== 'undefined' && innerWidth > 1440)
  const [blink, setBlink] = useState(false)

  useEffect(() => {
    if (!pulse) return
    setBlink(true)
    const t = setTimeout(() => setBlink(false), 70)
    return () => clearTimeout(t)
  }, [pulse])

  // Keyboard: H = toggle silicon, P = pause, 0 = auto, 1–9 pin a regime.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (e.metaKey || e.ctrlKey || e.altKey || tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
      const k = e.key.toLowerCase()
      if (k === 'h') setMode(getRad().mode === 'halo' ? 'cots' : 'halo')
      else if (k === 'p') setRad((s) => ({ paused: !s.paused }))
      else if (k === '0') setRad({ pinned: 'auto' })
      else if (/^[1-9]$/.test(k)) setRad({ pinned: PINNABLE[+k - 1] })
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [])

  const halo = mode === 'halo'
  const protectedPct = stats.strikes ? ((stats.deflected + stats.corrected) / stats.strikes) * 100 : 0

  return (
    <aside className={`dosi ${halo ? 'dosi--halo' : 'dosi--cots'} ${open ? '' : 'dosi--min'}`} aria-label="Radiation simulator controls">
      <button className="dosi__bar" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className={`dosi__led ${blink ? 'is-on' : ''}`} aria-hidden="true" />
        <span className="dosi__title">DOSIMETER</span>
        <span className="dosi__regime">{regime.short}</span>
        <span className="dosi__flux">{paused ? 'PAUSED' : `${regime.flux.toFixed(1)} hits/s`}</span>
        <span className="dosi__chev" aria-hidden="true">
          {open ? '–' : '+'}
        </span>
      </button>

      {open && (
        <div className="dosi__body">
          <div className="dosi__switch" role="group" aria-label="Silicon this page runs on">
            <button className={!halo ? 'is-on' : ''} onClick={() => setMode('cots')} aria-pressed={!halo}>
              <b>COTS</b>
              <small>bulk CMOS</small>
            </button>
            <button className={halo ? 'is-on' : ''} onClick={() => setMode('halo')} aria-pressed={halo}>
              <b>HALO-7</b>
              <small>hardened</small>
            </button>
          </div>
          <p className="dosi__status" aria-live="polite">
            {halo
              ? 'ECC, scrubbing and hardened cells are correcting strikes as they land.'
              : 'Unprotected: each strike flips a bit of text. Errors stay until the watchdog reboots.'}
          </p>

          <label className="dosi__label" htmlFor="dosi-env">
            Environment
          </label>
          <select
            id="dosi-env"
            className="dosi__select"
            value={pinned}
            onChange={(e) => setRad({ pinned: e.target.value as RegimeKey | 'auto' })}
          >
            <option value="auto">Auto · follow scroll altitude</option>
            {PINNABLE.map((k, i) => (
              <option key={k} value={k}>
                {i + 1} · {REGIMES[k].label}
              </option>
            ))}
          </select>
          <p className="dosi__note">{regime.note}</p>

          <dl className="dosi__stats">
            <div>
              <dt>Strikes</dt>
              <dd>{stats.strikes}</dd>
            </div>
            <div>
              <dt>Bit flips</dt>
              <dd className="t-flip">{stats.upsets}</dd>
            </div>
            <div>
              <dt>Corrected</dt>
              <dd className="t-halo">{stats.corrected + stats.deflected}</dd>
            </div>
            <div>
              <dt>Latch-ups</dt>
              <dd className="t-amber">{stats.latchups}</dd>
            </div>
          </dl>
          <div className="dosi__meter" aria-label={`${protectedPct.toFixed(0)}% of strikes neutralised`}>
            <span style={{ width: `${protectedPct}%` }} />
          </div>

          <div className="dosi__row">
            <button className="chip" onClick={() => setRad((s) => ({ paused: !s.paused }))} aria-pressed={paused}>
              {paused ? '▶ Resume' : '❚❚ Pause'}
            </button>
            <button className="chip" onClick={() => setRad((s) => ({ sound: !s.sound }))} aria-pressed={sound}>
              {sound ? '◉ Geiger on' : '○ Geiger off'}
            </button>
          </div>
          <p className="dosi__keys">
            <kbd>H</kbd> toggle silicon · <kbd>P</kbd> pause · <kbd>1</kbd>–<kbd>9</kbd> pin orbit · <kbd>0</kbd> auto
          </p>
        </div>
      )}
    </aside>
  )
}

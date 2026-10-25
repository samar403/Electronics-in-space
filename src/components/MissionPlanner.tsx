import { useEffect, useMemo, useState } from 'react'
import { evaluateMission, HALO_TID_KRAD, RHA_LEVELS, sci, type MissionInput } from '../lib/radiation'
import { eclipseFraction, orbitalPeriodMin, orbitalVelocityKms } from '../lib/orbit'
import { Magnetosphere } from './Magnetosphere'
import { Section } from './Section'

const PRESETS: { name: string; v: Partial<MissionInput> }[] = [
  { name: 'ISS-like', v: { altitudeKm: 420, inclinationDeg: 51.6 } },
  { name: 'Broadband LEO', v: { altitudeKm: 550, inclinationDeg: 53 } },
  { name: 'Sun-synchronous EO', v: { altitudeKm: 800, inclinationDeg: 98.6 } },
  { name: 'High LEO polar', v: { altitudeKm: 1200, inclinationDeg: 87.9 } },
  { name: 'GNSS / MEO', v: { altitudeKm: 20200, inclinationDeg: 55 } },
  { name: 'GEO comsat', v: { altitudeKm: 35786, inclinationDeg: 0, years: 15 } },
  { name: 'Cislunar', v: { altitudeKm: 384400, inclinationDeg: 5 } },
]

const DEFAULT: Required<MissionInput> = {
  altitudeKm: 550,
  inclinationDeg: 53,
  years: 5,
  shieldingMm: 2.5,
  solar: 'max',
  rdm: 2,
  memoryGB: 4,
}

const A_MIN = Math.log(200)
const A_MAX = Math.log(400000)
const toSlider = (alt: number) => (Math.log(alt) - A_MIN) / (A_MAX - A_MIN)
const fromSlider = (s: number) => Math.round(Math.exp(A_MIN + s * (A_MAX - A_MIN)))

function every(perDay: number) {
  if (perDay >= 1) return `${sci(perDay)} per day`
  const days = 1 / perDay
  if (days < 1 / 24) return `every ${(days * 1440).toFixed(0)} min`
  if (days < 1) return `every ${(days * 24).toFixed(1)} h`
  if (days < 365) return `every ${days.toFixed(days < 10 ? 1 : 0)} days`
  const y = days / 365
  return y > 1e4 ? 'never in practice' : `every ${sci(y)} years`
}

function readQuery(): Required<MissionInput> {
  if (typeof location === 'undefined') return DEFAULT
  const q = new URLSearchParams(location.search)
  const n = (k: string, d: number) => (q.has(k) && isFinite(+q.get(k)!) ? +q.get(k)! : d)
  return {
    altitudeKm: n('alt', DEFAULT.altitudeKm),
    inclinationDeg: n('inc', DEFAULT.inclinationDeg),
    years: n('yrs', DEFAULT.years),
    shieldingMm: n('al', DEFAULT.shieldingMm),
    solar: q.get('sun') === 'min' ? 'min' : 'max',
    rdm: n('rdm', DEFAULT.rdm),
    memoryGB: n('mem', DEFAULT.memoryGB),
  }
}

export function MissionPlanner() {
  const [m, setM] = useState<Required<MissionInput>>(readQuery)
  const [copied, setCopied] = useState(false)
  const r = useMemo(() => evaluateMission(m), [m])
  const set = (p: Partial<MissionInput>) => setM((x) => ({ ...x, ...p }))

  useEffect(() => {
    const q = new URLSearchParams(location.search)
    q.set('alt', String(m.altitudeKm))
    q.set('inc', String(m.inclinationDeg))
    q.set('yrs', String(m.years))
    q.set('al', String(m.shieldingMm))
    q.set('sun', m.solar)
    q.set('rdm', String(m.rdm))
    q.set('mem', String(m.memoryGB))
    history.replaceState(null, '', `${location.pathname}?${q}${location.hash}`)
  }, [m])

  const period = orbitalPeriodMin(m.altitudeKm)
  const eclipseMin = eclipseFraction(m.altitudeKm) * period
  // Shield mass for a 20 cm-diameter spherical electronics enclosure: 4πr²·t·ρ(Al = 2.70 g/cm³)
  const shieldKg = (4 * Math.PI * 10 * 10 * (m.shieldingMm / 10) * 2.7) / 1000
  const d = r.dose
  const parts = [
    { k: 'Trapped protons', v: d.trappedProton, c: 'var(--amber)' },
    { k: 'Trapped electrons', v: d.trappedElectron, c: 'var(--cherenkov)' },
    { k: 'Solar protons', v: d.solarProton, c: 'var(--flip)' },
  ]
  const errors = [
    { k: 'COTS · no ECC', v: r.cotsErrorsPerDay, cls: 'flip' },
    { k: 'COTS · SECDED, hourly scrub', v: r.cotsEccErrorsPerDay, cls: 'amber' },
    { k: 'HALO-7 · FD-SOI + interleave + 10 s scrub', v: r.haloErrorsPerDay, cls: 'halo' },
  ]
  const maxLog = Math.max(...errors.map((e) => Math.log10(Math.max(e.v, 1e-9)))) + 1
  const minLog = -8

  const summary = () =>
    [
      `HALO Orbital · Mission radiation estimate`,
      `${r.regime}: ${m.altitudeKm.toLocaleString()} km, ${m.inclinationDeg}° · ${m.years} yr · ${m.shieldingMm} mm Al · solar ${m.solar}`,
      `TID: ${sci(d.total)} krad(Si)/yr → ${sci(r.missionDose)} krad mission; with RDM ${m.rdm}: RHA ${r.rha ? `${r.rha.letter} (${r.rha.krad} krad)` : '> 1 Mrad: avoid or add shielding'}`,
      `HALO-7 (${HALO_TID_KRAD} krad): ${r.haloPasses ? 'PASS' : 'FAIL'} · margin ${r.haloMargin.toFixed(1)}×`,
      `SEU (bulk SRAM): ${sci(r.seu.quiet)} /bit/day quiet, ${sci(r.seu.worstDay)} worst day`,
      `Uncorrectable errors in ${m.memoryGB} GB: COTS ${every(r.cotsErrorsPerDay)}, COTS+ECC ${every(r.cotsEccErrorsPerDay)}, HALO ${every(r.haloErrorsPerDay)}`,
      `First-order model. Validate with SPENVIS/OMERE (AE9/AP9, SHIELDOSE-2, CREME96).`,
    ].join('\n')

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summary() + `\n${location.href}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard blocked */
    }
  }
  const download = () => {
    const blob = new Blob([JSON.stringify({ input: m, result: r, generated: new Date().toISOString() }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `halo-mission-${m.altitudeKm}km-${m.inclinationDeg}deg.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <Section
      id="planner"
      regime="slot"
      index="05"
      kicker="Mission planner"
      title="Size the radiation problem for your orbit."
      lede="Choose an orbit, mission length and shielding to get first-order estimates of total dose, the MIL-PRF-38535 hardness level you need with design margin, upset rates, and what each memory protection scheme leaves uncorrected. The URL updates as you go, so you can share the exact case."
    >
      <div className="planner">
        <form className="planner__in" onSubmit={(e) => e.preventDefault()} aria-label="Mission inputs">
          <div className="presets" role="group" aria-label="Orbit presets">
            {PRESETS.map((p) => (
              <button
                type="button"
                key={p.name}
                className={`chip ${p.v.altitudeKm === m.altitudeKm && p.v.inclinationDeg === m.inclinationDeg ? 'is-on' : ''}`}
                onClick={() => set(p.v)}
              >
                {p.name}
              </button>
            ))}
          </div>

          <label className="field">
            <span>
              Altitude <b>{m.altitudeKm.toLocaleString('en-US')} km</b> <em className="muted">· {r.regime}</em>
            </span>
            <input type="range" min={0} max={1} step={0.001} value={toSlider(m.altitudeKm)} onChange={(e) => set({ altitudeKm: fromSlider(+e.target.value) })} />
          </label>
          <label className="field">
            <span>
              Inclination <b>{m.inclinationDeg}°</b>
            </span>
            <input type="range" min={0} max={110} step={0.1} value={m.inclinationDeg} onChange={(e) => set({ inclinationDeg: +e.target.value })} />
          </label>
          <div className="field-row">
            <label className="field">
              <span>
                Mission <b>{m.years} yr</b>
              </span>
              <input type="range" min={0.5} max={20} step={0.5} value={m.years} onChange={(e) => set({ years: +e.target.value })} />
            </label>
            <label className="field">
              <span>
                Shielding <b>{m.shieldingMm} mm Al</b>
              </span>
              <input type="range" min={0.5} max={20} step={0.5} value={m.shieldingMm} onChange={(e) => set({ shieldingMm: +e.target.value })} />
            </label>
          </div>
          <div className="field-row">
            <label className="field">
              <span>
                Memory exposed <b>{m.memoryGB} GB</b>
              </span>
              <input type="range" min={0.5} max={64} step={0.5} value={m.memoryGB} onChange={(e) => set({ memoryGB: +e.target.value })} />
            </label>
            <label className="field">
              <span>
                Design margin <b>RDM {m.rdm}×</b>
              </span>
              <input type="range" min={1} max={4} step={0.5} value={m.rdm} onChange={(e) => set({ rdm: +e.target.value })} />
            </label>
          </div>
          <div className="seg" role="radiogroup" aria-label="Solar cycle">
            {(['min', 'max'] as const).map((s) => (
              <button type="button" key={s} role="radio" aria-checked={m.solar === s} className={m.solar === s ? 'is-on' : ''} onClick={() => set({ solar: s })}>
                Solar {s === 'min' ? 'minimum' : 'maximum'}
              </button>
            ))}
          </div>

          <div className="planner__viz">
            <Magnetosphere altitudeKm={Math.min(m.altitudeKm, 60000)} cx={0.5} scale={0.06} showLabels={false} className="planner__cv" />
            <dl className="facts">
              <div>
                <dt>Period</dt>
                <dd>{period < 600 ? `${period.toFixed(1)} min` : `${(period / 60).toFixed(1)} h`}</dd>
              </div>
              <div>
                <dt>Velocity</dt>
                <dd>{orbitalVelocityKms(m.altitudeKm).toFixed(2)} km/s</dd>
              </div>
              <div>
                <dt>Max eclipse</dt>
                <dd>{eclipseMin < 120 ? `${eclipseMin.toFixed(0)} min` : `${(eclipseMin / 60).toFixed(1)} h`}</dd>
              </div>
              <div>
                <dt>Shield mass*</dt>
                <dd>{shieldKg.toFixed(2)} kg</dd>
              </div>
            </dl>
          </div>
        </form>

        <div className="planner__out" aria-live="polite">
          <article className="card">
            <h3>Total ionising dose</h3>
            <p className="big">
              {sci(d.total)} <small>krad(Si)/yr</small>
            </p>
            <div className="stackbar" role="img" aria-label="Dose breakdown">
              {parts.map((p) => (
                <span key={p.k} style={{ width: `${(p.v / d.total) * 100}%`, background: p.c }} title={`${p.k}: ${sci(p.v)} krad/yr`} />
              ))}
            </div>
            <ul className="stackbar__legend">
              {parts.map((p) => (
                <li key={p.k}>
                  <i style={{ background: p.c }} /> {p.k} <b>{sci(p.v)}</b>
                </li>
              ))}
            </ul>
            <p className="line">
              Mission total <b>{sci(r.missionDose)} krad(Si)</b> → requirement with RDM {m.rdm}: <b>{sci(r.missionDose * m.rdm)} krad</b>
            </p>
          </article>

          <article className="card">
            <h3>Hardness level required</h3>
            <ol className="ladder" aria-label="MIL-PRF-38535 RHA designators">
              {RHA_LEVELS.map((l) => (
                <li key={l.letter} className={`${r.rha?.letter === l.letter ? 'is-need' : ''} ${l.krad === HALO_TID_KRAD ? 'is-halo' : ''} ${l.krad < r.missionDose * m.rdm ? 'is-under' : ''}`}>
                  <b>{l.letter}</b>
                  <span>{l.krad >= 1000 ? '1M' : `${l.krad}k`}</span>
                </li>
              ))}
            </ol>
            <p className={`verdict ${r.haloPasses ? 'is-pass' : 'is-fail'}`}>
              {r.haloPasses
                ? `HALO-7 qualifies, with ${(r.haloMargin / m.rdm).toFixed(1)}× headroom over the margined requirement.`
                : r.rha
                  ? `Beyond HALO-7's 300 krad rating: add shielding or choose an RHA ${r.rha.letter} part.`
                  : 'Over 1 Mrad: no standard part survives. Add shielding, shorten the mission or change the orbit.'}
            </p>
          </article>

          <article className="card">
            <h3>Single-event upsets</h3>
            <div className="duo">
              <p>
                <span className="muted">Quiet</span>
                <b>{sci(r.seu.quiet)}</b>
                <small>upsets/bit/day</small>
              </p>
              <p>
                <span className="muted">Worst day (SPE)</span>
                <b className="t-flip">{sci(r.seu.worstDay)}</b>
                <small>upsets/bit/day</small>
              </p>
            </div>
            <p className="line">
              ≈ <b>{sci(r.upsetsPerDay)}</b> raw upsets/day in {m.memoryGB} GB · GCR {Math.round((r.seu.gcr / r.seu.quiet) * 100)}% / protons{' '}
              {Math.round((r.seu.proton / r.seu.quiet) * 100)}%
            </p>
          </article>

          <article className="card card--wide">
            <h3>Uncorrectable memory errors</h3>
            <ul className="logbars">
              {errors.map((e) => {
                const lv = Math.log10(Math.max(e.v, 1e-9))
                const w = Math.max(2, ((lv - minLog) / (maxLog - minLog)) * 100)
                return (
                  <li key={e.k}>
                    <span className="logbars__k">{e.k}</span>
                    <span className="logbars__bar">
                      <i className={`bg-${e.cls}`} style={{ width: `${w}%` }} />
                    </span>
                    <span className="logbars__v">{every(e.v)}</span>
                  </li>
                )
              })}
            </ul>
            <div className="duo duo--3">
              <p>
                <span className="muted">COTS functional interrupts</span>
                <b className="t-amber">{every(r.cotsSefiPerDay)}</b>
              </p>
              <p>
                <span className="muted">HALO-7 SEFI (auto-recovered)</span>
                <b className="t-halo">{every(r.haloSefiPerDay)}</b>
              </p>
              <p>
                <span className="muted">Latch-up</span>
                <b className="t-halo">SOI: immune</b>
              </p>
            </div>
          </article>

          <div className="planner__actions">
            <button className="btn btn--ghost" onClick={copy}>
              {copied ? '✓ Copied' : 'Copy summary + link'}
            </button>
            <button className="btn btn--ghost" onClick={download}>
              Download JSON
            </button>
          </div>
          <p className="ion__note">
            *Aluminium shell around a 20 cm spherical box. First-order model log-interpolated from reference environments
            (AE8/AP8-class) with simplified depth-dose curves. Use it to scope a design. Flight programmes need
            SPENVIS/OMERE analyses (AE9/AP9-IRENE, SHIELDOSE-2, CREME96) and sector shielding analysis per ECSS-E-ST-10-12C. See
            docs/RADIATION_MODEL.md.
          </p>
        </div>
      </div>
    </Section>
  )
}

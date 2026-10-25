import { useMemo, useState } from 'react'
import { evaluateDownlink, type DownlinkInput } from '../lib/downlink'
import { F } from './FlipText'
import { Section } from './Section'

const DEF: DownlinkInput = {
  altitudeKm: 550,
  sensorGbps: 2,
  imagingMinPerOrbit: 20,
  groundContactsPerDay: 6,
  contactMinutes: 8,
  downlinkMbps: 800,
  cloudFraction: 0.67,
  keepFraction: 0.3,
}

const fmtGB = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)} TB` : `${v.toFixed(v < 10 ? 1 : 0)} GB`)

export function Downlink() {
  const [d, setD] = useState(DEF)
  const r = useMemo(() => evaluateDownlink(d), [d])
  const set = (p: Partial<DownlinkInput>) => setD((x) => ({ ...x, ...p }))
  const max = Math.max(r.generatedGB, 1)

  const sliders: { k: keyof DownlinkInput; label: string; min: number; max: number; step: number; fmt: (v: number) => string }[] = [
    { k: 'sensorGbps', label: 'Sensor rate while imaging', min: 0.2, max: 10, step: 0.1, fmt: (v) => `${v} Gbit/s` },
    { k: 'imagingMinPerOrbit', label: 'Imaging per orbit', min: 2, max: 60, step: 1, fmt: (v) => `${v} min` },
    { k: 'groundContactsPerDay', label: 'Ground passes per day', min: 1, max: 24, step: 1, fmt: (v) => `${v}` },
    { k: 'contactMinutes', label: 'Minutes per pass', min: 2, max: 15, step: 1, fmt: (v) => `${v} min` },
    { k: 'downlinkMbps', label: 'X/Ka-band downlink', min: 50, max: 4000, step: 50, fmt: (v) => `${v} Mbit/s` },
    { k: 'cloudFraction', label: 'Cloud cover', min: 0, max: 0.95, step: 0.01, fmt: (v) => `${Math.round(v * 100)}%` },
    { k: 'keepFraction', label: 'Clear scenes worth sending', min: 0.02, max: 1, step: 0.01, fmt: (v) => `${Math.round(v * 100)}%` },
  ]

  return (
    <Section
      id="downlink"
      regime="outer"
      index="06"
      kicker="Why compute in orbit"
      title="The bottleneck isn't the sensor. It's the downlink."
      lede="An Earth-observation satellite can capture far more than its ground passes can return. Without onboard intelligence it sends a random slice, most of it cloud. With HALO-7 it triages in orbit and sends what matters, and an alert can go out over a relay within minutes instead of waiting hours for the next pass."
    >
      <div className="downlink">
        <div className="downlink__in">
          {sliders.map((s) => (
            <label className="field" key={s.k}>
              <span>
                {s.label} <b>{s.fmt(d[s.k])}</b>
              </span>
              <input type="range" min={s.min} max={s.max} step={s.step} value={d[s.k]} onChange={(e) => set({ [s.k]: +e.target.value })} />
            </label>
          ))}
        </div>
        <div className="downlink__out">
          <div className="flow">
            <div className="flow__row">
              <span className="flow__k">Captured / day</span>
              <span className="flow__bar">
                <i className="bg-muted" style={{ width: '100%' }} />
              </span>
              <span className="flow__v">{fmtGB(r.generatedGB)}</span>
            </div>
            <div className="flow__row">
              <span className="flow__k">Link capacity / day</span>
              <span className="flow__bar">
                <i className="bg-ink" style={{ width: `${Math.min(100, (r.capacityGB / max) * 100)}%` }} />
              </span>
              <span className="flow__v">{fmtGB(r.capacityGB)}</span>
            </div>
            <div className="flow__row">
              <span className="flow__k">Useful delivered · bent pipe</span>
              <span className="flow__bar">
                <i className="bg-flip" style={{ width: `${Math.max(0.5, (r.raw.usefulGB / max) * 100)}%` }} />
              </span>
              <span className="flow__v">{fmtGB(r.raw.usefulGB)}</span>
            </div>
            <div className="flow__row">
              <span className="flow__k">Useful delivered · HALO triage</span>
              <span className="flow__bar">
                <i className="bg-halo" style={{ width: `${Math.max(0.5, (r.ai.usefulGB / max) * 100)}%` }} />
              </span>
              <span className="flow__v">{fmtGB(r.ai.usefulGB)}</span>
            </div>
          </div>

          <div className="bigstats">
            <div>
              <b className="t-halo">{isFinite(r.insightMultiplier) ? `${r.insightMultiplier.toFixed(1)}×` : '—'}</b>
              <span>
                <F>more useful data per day</F>
              </span>
            </div>
            <div>
              <b>
                {Math.round(r.raw.usefulShare * 100)}% → {Math.round(r.ai.usefulShare * 100)}%
              </b>
              <span>of valuable scenes reach the ground</span>
            </div>
            <div>
              <b>
                {r.storeForwardLatencyMin.toFixed(0)} → {r.alertLatencyMin} min
              </b>
              <span>time to first alert (mean wait for a pass vs relay)</span>
            </div>
          </div>
          <p className="ion__note">
            {r.orbitsPerDay.toFixed(1)} orbits/day at {d.altitudeKm} km. The bent pipe sends a representative sample of
            everything captured until the link saturates. HALO drops cloudy and uninteresting scenes before they are
            queued. Backlog without triage: {fmtGB(r.raw.backlogGBPerDay)}/day, which must be discarded or deleted. Global
            mean cloud fraction is ≈ 67% (ISCCP/MODIS climatologies). Relay latency assumes a commercial inter-satellite or
            data-relay service.
          </p>
        </div>
      </div>
    </Section>
  )
}

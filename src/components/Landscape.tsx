import { useState } from 'react'
import { Section } from './Section'

interface Part {
  name: string
  vendor: string
  arch: string
  gops?: number
  tid?: number
  tidText: string
  sel: string
  note: string
  kind: 'hard' | 'tolerant' | 'cots' | 'halo'
  labelLeft?: boolean
}

const PARTS: Part[] = [
  {
    name: 'RAD750',
    vendor: 'BAE Systems',
    arch: 'PowerPC 750 · 110–200 MHz',
    gops: 0.4,
    tid: 200,
    tidText: '200 krad – 1 Mrad',
    sel: 'Immune',
    note: 'Heritage king. Flies Curiosity, Perseverance and JWST. ~0.4 GIPS, no AI acceleration.',
    kind: 'hard',
  },
  {
    name: 'RAD5545',
    vendor: 'BAE Systems',
    arch: '4× e5500 PowerPC',
    gops: 5.6,
    tid: 100,
    tidText: '100 krad',
    sel: 'Immune',
    note: 'Quad-core successor, ~5.6 GOPS. Still several orders of magnitude short of modern AI.',
    kind: 'hard',
  },
  {
    name: 'GR740',
    vendor: 'Frontgrade Gaisler',
    arch: '4× LEON4FT SPARC V8 · 250 MHz',
    gops: 1,
    tid: 100,
    tidText: '≥ 100 krad',
    sel: 'Immune',
    note: 'ESA’s next-generation microprocessor (NGMP). Excellent fault tolerance, GIPS-class.',
    kind: 'hard',
    labelLeft: true,
  },
  {
    name: 'PIC64-HPSC',
    vendor: 'Microchip / NASA',
    arch: '8× SiFive X280 RISC-V + vector',
    tidText: 'Rad-hard (vendor)',
    sel: 'Hardened',
    note: 'NASA’s High-Performance Spaceflight Computing processor. Vendor claims ~100× current rad-hard compute. A strong step, but CPU-centric.',
    kind: 'hard',
  },
  {
    name: 'Versal AI Core XQR',
    vendor: 'AMD',
    arch: 'FPGA + 400 AI Engines',
    gops: 133000,
    tid: 100,
    tidText: '~100 krad class',
    sel: 'Characterised',
    note: 'Rad-tolerant adaptive SoC, ~133 INT8 TOPS peak. Configuration memory needs continuous SEU scrubbing, and FPGA tooling is not ML tooling.',
    kind: 'tolerant',
    labelLeft: true,
  },
  {
    name: 'Jetson AGX Orin',
    vendor: 'NVIDIA (COTS)',
    arch: 'Ampere GPU + Arm',
    gops: 275000,
    tid: 20,
    tidText: 'Not rated (lot-dependent)',
    sel: 'Not guaranteed',
    note: 'Up to 275 INT8 TOPS (sparse) at 15–60 W. Flies in LEO behind shielding and supervisors, but SEFIs, SDC and SEL risk remain.',
    kind: 'cots',
    labelLeft: true,
  },
  {
    name: 'HALO-7',
    vendor: 'HALO Orbital (target)',
    arch: '16-tile NPU + RV64 lockstep',
    gops: 64000,
    tid: 300,
    tidText: '≥ 300 krad (target)',
    sel: 'Immune (SOI)',
    note: 'Built for neural inference in orbit: adaptive hardening, ABFT and a PyTorch-native toolchain.',
    kind: 'halo',
  },
]

// log axes
const X0 = Math.log10(0.1)
const X1 = Math.log10(1e6)
const Y0 = Math.log10(5)
const Y1 = Math.log10(2000)
const W = 560
const H = 320
const P = { l: 56, r: 16, t: 16, b: 44 }
const px = (g: number) => P.l + ((Math.log10(g) - X0) / (X1 - X0)) * (W - P.l - P.r)
const py = (t: number) => H - P.b - ((Math.log10(t) - Y0) / (Y1 - Y0)) * (H - P.t - P.b)

export function Landscape() {
  const [hover, setHover] = useState<string | null>('HALO-7')
  const h = PARTS.find((p) => p.name === hover)

  return (
    <Section
      id="landscape"
      regime="geo"
      index="07"
      kicker="Landscape"
      title="Space silicon makes you choose: survive, or compute."
      lede="Rad-hard processors survive anything but compute at GOPS. Commercial accelerators compute at hundreds of TOPS but were never designed to survive. The upper-right corner of this chart is the market."
    >
      <div className="land">
        <figure className="land__plot">
          <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Peak compute versus total-dose tolerance of space processors">
            <rect x={px(10000)} y={py(2000)} width={px(1e6) - px(10000)} height={py(100) - py(2000)} className="land__gap" />
            <text x={px(12000)} y={py(1500)} className="svg-l svg-l--halo">
              THE GAP
            </text>
            <text x={px(12000)} y={py(1150)} className="svg-l svg-l--halo">
              AI compute × rad-hard
            </text>
            {[0.1, 1, 10, 100, 1000, 1e4, 1e5, 1e6].map((g) => (
              <g key={g}>
                <line x1={px(g)} x2={px(g)} y1={P.t} y2={H - P.b} className="land__grid" />
                <text x={px(g)} y={H - P.b + 16} textAnchor="middle" className="svg-l">
                  {g >= 1e6 ? '1 P' : g >= 1000 ? `${g / 1000} T` : `${g} G`}
                </text>
              </g>
            ))}
            {[10, 30, 100, 300, 1000].map((t) => (
              <g key={t}>
                <line x1={P.l} x2={W - P.r} y1={py(t)} y2={py(t)} className="land__grid" />
                <text x={P.l - 8} y={py(t) + 3} textAnchor="end" className="svg-l">
                  {t >= 1000 ? '1 M' : `${t} k`}
                </text>
              </g>
            ))}
            <text x={(W + P.l) / 2} y={H - 6} textAnchor="middle" className="svg-l">
              Peak compute, ops/s (log) →
            </text>
            <text x={14} y={(H - P.b) / 2} textAnchor="middle" className="svg-l" transform={`rotate(-90 14 ${(H - P.b) / 2})`}>
              TID tolerance, rad(Si) (log) →
            </text>
            {PARTS.filter((p) => p.gops && p.tid).map((p) => (
              <g
                key={p.name}
                className={`pt pt--${p.kind} ${hover === p.name ? 'is-on' : ''}`}
                onMouseEnter={() => setHover(p.name)}
                onFocus={() => setHover(p.name)}
                tabIndex={0}
                role="button"
                aria-label={`${p.name}: ${p.tidText}`}
              >
                <circle cx={px(p.gops!)} cy={py(p.tid!)} r={p.kind === 'halo' ? 9 : 6} />
                <text x={px(p.gops!) + (p.labelLeft ? -10 : 12)} y={py(p.tid!) + 4} textAnchor={p.labelLeft ? 'end' : 'start'}>
                  {p.name}
                </text>
              </g>
            ))}
          </svg>
          {h && (
            <figcaption className="land__cap">
              <b>{h.name}</b> · {h.vendor} — {h.note}
            </figcaption>
          )}
        </figure>

        <div className="table-wrap">
          <table className="cmp">
            <thead>
              <tr>
                <th scope="col">Part</th>
                <th scope="col">Architecture</th>
                <th scope="col">Peak compute</th>
                <th scope="col">TID</th>
                <th scope="col">SEL</th>
              </tr>
            </thead>
            <tbody>
              {PARTS.map((p) => (
                <tr key={p.name} className={p.kind === 'halo' ? 'is-halo' : ''} onMouseEnter={() => setHover(p.name)}>
                  <th scope="row">
                    {p.name}
                    <small>{p.vendor}</small>
                  </th>
                  <td>{p.arch}</td>
                  <td>{p.gops ? (p.gops >= 1000 ? `${Math.round(p.gops / 1000)} TOPS` : `${p.gops} GOPS`) : 'Not published'}</td>
                  <td>{p.tidText}</td>
                  <td>{p.sel}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="ion__note">
            Approximate public figures for orientation only, mixing integer TOPS and MIPS-class CPU numbers. Always use the
            vendor datasheet and radiation report. COTS TID is unrated and plotted at a typical tested level.
          </p>
        </div>
      </div>
    </Section>
  )
}

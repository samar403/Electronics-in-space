import { useEffect, useState } from 'react'
import { prefersReducedMotion } from '../lib/radStore'

type Tech = 'bulk' | 'soi' | 'dice'

/** In silicon, LET of 1 MeV·cm²/mg deposits ≈ 10.3 fC of charge per µm of track. */
const FC_PER_UM_PER_LET = 10.3

const TECH: Record<Tech, { label: string; depthUm: number; qcrit: number; note: string }> = {
  bulk: { label: 'Bulk CMOS 28 nm', depthUm: 1.5, qcrit: 0.8, note: 'Charge funnels and diffuses from microns deep in the substrate.' },
  soi: { label: 'FD-SOI 22 nm', depthUm: 0.025, qcrit: 0.8, note: 'A ~7 nm silicon film on buried oxide: only charge in the film is collected.' },
  dice: { label: 'FD-SOI + DICE cell', depthUm: 0.025, qcrit: 12, note: 'Dual-interlocked storage: two nodes must be struck to flip, raising the effective Q꜀ᵣᵢₜ.' },
}

const MARKS = [
  { let: 1, t: 'protons (indirect)' },
  { let: 28, t: 'iron, GCR peak' },
  { let: 80, t: 'SEL screening' },
]

/** Interactive cross-section: why FD-SOI collects less charge and cannot latch up. */
export function IonStrike() {
  const [tech, setTech] = useState<Tech>('bulk')
  const [let_, setLet] = useState(10)
  const [shot, setShot] = useState(0)
  const t = TECH[tech]
  const q = let_ * FC_PER_UM_PER_LET * t.depthUm
  const upset = q > t.qcrit
  const sel = tech === 'bulk' && let_ > 15

  useEffect(() => {
    if (prefersReducedMotion) return
    const id = setInterval(() => setShot((s) => s + 1), 2600)
    return () => clearInterval(id)
  }, [])

  const isSoi = tech !== 'bulk'
  const trackDepth = isSoi ? 92 : 210

  return (
    <div className="ion">
      <div className="ion__head">
        <h3>Fire an ion through a transistor</h3>
        <div className="seg" role="radiogroup" aria-label="Process technology">
          {(Object.keys(TECH) as Tech[]).map((k) => (
            <button key={k} role="radio" aria-checked={tech === k} className={tech === k ? 'is-on' : ''} onClick={() => setTech(k)}>
              {TECH[k].label}
            </button>
          ))}
        </div>
      </div>

      <div className="ion__body">
        <svg viewBox="0 0 400 240" className="ion__svg" role="img" aria-label={`${t.label} cross-section struck by an ion of LET ${let_}`}>
          <defs>
            <linearGradient id="trk" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ff4d5e" stopOpacity="0" />
              <stop offset="0.3" stopColor="#ff4d5e" />
              <stop offset="1" stopColor="#ffb547" />
            </linearGradient>
            <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(160,190,215,.25)" strokeWidth="1" />
            </pattern>
          </defs>
          {/* gate stack */}
          <rect x="170" y="40" width="60" height="18" fill="#2a3a48" />
          <rect x="170" y="58" width="60" height="4" fill="#46d9ff" opacity=".6" />
          <text x="200" y="35" className="svg-l" textAnchor="middle">
            gate
          </text>
          {isSoi ? (
            <>
              <rect x="40" y="62" width="320" height="10" fill="#334454" />
              <rect x="70" y="62" width="70" height="10" fill="#4b6176" />
              <rect x="260" y="62" width="70" height="10" fill="#4b6176" />
              <text x="105" y="88" className="svg-l" textAnchor="middle">
                source
              </text>
              <text x="295" y="88" className="svg-l" textAnchor="middle">
                drain
              </text>
              <rect x="40" y="72" width="320" height="22" fill="url(#hatch)" stroke="rgba(160,190,215,.35)" />
              <text x="370" y="87" className="svg-l">
                BOX
              </text>
              <rect x="40" y="94" width="320" height="130" fill="#141c24" />
              <text x="200" y="215" className="svg-l" textAnchor="middle">
                handle substrate · charge here never reaches the transistor
              </text>
            </>
          ) : (
            <>
              <rect x="40" y="62" width="320" height="162" fill="#141c24" />
              <rect x="70" y="62" width="70" height="20" fill="#4b6176" />
              <rect x="260" y="62" width="70" height="20" fill="#4b6176" />
              <text x="105" y="98" className="svg-l" textAnchor="middle">
                source
              </text>
              <text x="295" y="98" className="svg-l" textAnchor="middle">
                drain
              </text>
              <path d="M250 62 h110 v90 h-110z" fill="none" stroke="rgba(255,181,71,.45)" strokeDasharray="3 3" />
              <text x="305" y="148" className="svg-l" textAnchor="middle">
                n-well
              </text>
              {sel && (
                <path d="M300 120 C 300 170, 120 170, 120 120" fill="none" stroke="#ffb547" strokeWidth="2" className="ion__sel" />
              )}
              <text x="200" y="215" className="svg-l" textAnchor="middle">
                p-substrate · PNPN path exists
              </text>
            </>
          )}
          <g key={shot + tech + let_} className="ion__shot">
            <line x1="295" y1="0" x2="295" y2={trackDepth} stroke="url(#trk)" strokeWidth={1 + Math.log10(let_ + 1) * 2.2} />
            <ellipse cx="295" cy={isSoi ? 67 : 120} rx={isSoi ? 18 : 10 + let_ / 5} ry={isSoi ? 4 : 50} fill="#ff4d5e" opacity=".22" className="ion__cloud" />
          </g>
        </svg>

        <div className="ion__panel">
          <label className="field">
            <span>
              Ion LET <b>{let_} MeV·cm²/mg</b>
            </span>
            <input type="range" min={0.5} max={100} step={0.5} value={let_} onChange={(e) => setLet(+e.target.value)} />
            <span className="field__marks">
              {MARKS.map((m) => (
                <button key={m.let} className="mark" onClick={() => setLet(m.let)}>
                  {m.let} · {m.t}
                </button>
              ))}
            </span>
          </label>
          <dl className="ion__out">
            <div>
              <dt>Collected charge</dt>
              <dd>{q < 1 ? q.toFixed(2) : q.toFixed(1)} fC</dd>
            </div>
            <div>
              <dt>Critical charge</dt>
              <dd>{t.qcrit} fC</dd>
            </div>
            <div className={upset ? 'is-bad' : 'is-good'}>
              <dt>Bit state</dt>
              <dd>{upset ? 'FLIPPED' : 'held'}</dd>
            </div>
            <div className={sel ? 'is-bad' : 'is-good'}>
              <dt>Latch-up</dt>
              <dd>{tech === 'bulk' ? (sel ? 'RISK' : 'below onset') : 'impossible'}</dd>
            </div>
          </dl>
          <p className="ion__note">
            {t.note} Q = LET × 10.3 fC/µm × collection depth ({t.depthUm} µm). Simplified: real collection also depends
            on angle, layout and parasitic bipolar gain.
          </p>
        </div>
      </div>
    </div>
  )
}

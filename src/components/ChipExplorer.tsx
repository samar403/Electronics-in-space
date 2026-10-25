import { useState } from 'react'
import { radiatorAreaM2 } from '../lib/radiation'
import { effectiveRegime, useRad } from '../lib/radStore'
import { REGIMES } from '../lib/regimes'
import { F } from './FlipText'
import { Section } from './Section'

interface Block {
  id: string
  name: string
  x: number
  y: number
  w: number
  h: number
  tone: 'npu' | 'cpu' | 'mem' | 'io' | 'safe'
  what: string
  hardening: string[]
}

const BLOCKS: Block[] = [
  {
    id: 'npu',
    name: 'NPU · 16 tiles',
    x: 150,
    y: 140,
    w: 300,
    h: 230,
    tone: 'npu',
    what: '16 tiles × 4 TOPS INT8 (systolic 64×64 MAC arrays, 512 KB local SRAM each). BF16 for sensitive layers.',
    hardening: [
      'ABFT row/column checksums on every GEMM: a corrupted product is detected, then recomputed (~2% overhead)',
      'Sequencers and address generators in TMR',
      'Adaptive modes: Performance / Lockstep (DMR) / Storm (TMR across tiles)',
    ],
  },
  {
    id: 'cpu',
    name: 'App cores · 2×2 lockstep',
    x: 470,
    y: 140,
    w: 120,
    h: 110,
    tone: 'cpu',
    what: '4× RV64GCV application cores in dual-core lockstep pairs running Linux/RTEMS, for pre- and post-processing and the control plane.',
    hardening: ['Cycle-by-cycle lockstep comparison with rollback', 'ECC L1/L2 caches with write-through on detect', 'Parity on register files'],
  },
  {
    id: 'warden',
    name: 'Warden · TMR',
    x: 470,
    y: 260,
    w: 120,
    h: 110,
    tone: 'safe',
    what: 'Triple-redundant RV32 safety controller: watchdog, power sequencing, SEFI recovery, the scrub engine and telemetry.',
    hardening: ['Full TMR with voting on every flop, skewed clocks against SETs', 'Checkpoints NPU state; per-domain restart in < 50 ms', 'Logs every corrected event to housekeeping telemetry'],
  },
  {
    id: 'sram',
    name: 'SRAM · 32 MB ECC',
    x: 10,
    y: 140,
    w: 120,
    h: 230,
    tone: 'mem',
    what: 'Shared on-chip scratchpad for weights and activations, so the hot path never leaves the die.',
    hardening: ['SECDED (72,64) on every word', '4-way physical bit interleaving defeats multi-cell upsets', 'Background scrubber: full array every 10 s (1 s in Storm mode)'],
  },
  {
    id: 'ddr',
    name: 'LPDDR4X ctrl',
    x: 10,
    y: 390,
    w: 280,
    h: 70,
    tone: 'mem',
    what: '2 × 32-bit channels for up to 16 GB of external memory.',
    hardening: ['Symbol-based ECC (single-device correct, “chipkill”-style)', 'Patrol scrubbing and refresh-aware rewrite', 'Mode-register shadowing to recover from DRAM SEFIs'],
  },
  {
    id: 'io',
    name: 'SpaceFibre · SpaceWire · PCIe',
    x: 310,
    y: 390,
    w: 280,
    h: 70,
    tone: 'io',
    what: '4× SpaceFibre lanes (ECSS-E-ST-50-11C), 2× SpaceWire (ECSS-E-ST-50-12C), PCIe Gen3 ×4, CAN-FD and Ethernet TSN.',
    hardening: ['Link-level retry and CRC on all serial links', 'Hardened PLLs with lock monitors', 'Cold-sparing IO pads'],
  },
  {
    id: 'sense',
    name: 'Radiation sense ring',
    x: 10,
    y: 70,
    w: 580,
    h: 50,
    tone: 'safe',
    what: 'An on-die SEU monitor (sacrificial SRAM) plus TID sensors and current/temperature telemetry: the chip measures its own environment.',
    hardening: ['Detects SAA entry and solar events within seconds', 'Drives the adaptive hardening mode and scrub rate', 'Feeds TID drift into back-gate bias compensation'],
  },
  {
    id: 'sec',
    name: 'Secure boot · crypto',
    x: 10,
    y: 10,
    w: 280,
    h: 50,
    tone: 'io',
    what: 'Root of trust, authenticated firmware and model updates, AES-GCM and post-quantum (ML-KEM / ML-DSA) for links.',
    hardening: ['TMR key storage', 'Redundant golden boot images in rad-tolerant flash'],
  },
  {
    id: 'pwr',
    name: 'Power & clock',
    x: 310,
    y: 10,
    w: 280,
    h: 50,
    tone: 'io',
    what: 'Per-domain power gating, adaptive body bias, and clocks from 100 MHz to 1.2 GHz.',
    hardening: ['Per-rail current sensing with fast trip for companion parts', 'Back-bias generators for TID compensation'],
  },
]

type HMode = 'perf' | 'dmr' | 'tmr'
const MODES: Record<HMode, { label: string; tops: number; scrub: string; sdc: string; desc: string }> = {
  perf: { label: 'Performance', tops: 64, scrub: '10 s', sdc: '< 10⁻⁶ /day', desc: 'All 16 tiles independent. ABFT checks every GEMM.' },
  dmr: { label: 'Lockstep', tops: 32, scrub: '5 s', sdc: '< 10⁻⁸ /day', desc: 'Tiles paired; mismatches trigger instant recompute.' },
  tmr: { label: 'Storm', tops: 20, scrub: '1 s', sdc: '< 10⁻¹⁰ /day', desc: 'Five triple-voted tile groups plus a hot spare. For the SAA, belt crossings and solar storms.' },
}

const SPECS: [string, string][] = [
  ['Process', '22 nm FD-SOI, 10-metal, radiation-hardened-by-design cell library'],
  ['Peak compute', '64 TOPS INT8 · 16 TFLOPS BF16 (Performance mode)'],
  ['Total ionising dose', '≥ 300 krad(Si), MIL-PRF-38535 RHA level F (target)'],
  ['SEL', 'Immune to LET ≥ 80 MeV·cm²/mg at 125 °C (target)'],
  ['SEU (memory, ECC + scrub)', '< 10⁻¹² errors/bit/day, GEO solar-min (target)'],
  ['SEFI recovery', '< 50 ms autonomous, per domain'],
  ['Power', '8–25 W configurable; ≈ 3.6 TOPS/W at 18 W'],
  ['Temperature', '−55 °C to +125 °C junction'],
  ['Package', 'Hermetic CCGA-1752 (flight) / FCBGA (engineering & New Space)'],
  ['Quality path', 'QML-V class flow · QML-Y (non-hermetic flip-chip) · screened New Space grade'],
]

export function ChipExplorer() {
  const [sel, setSel] = useState('npu')
  const [manual, setManual] = useState<HMode | 'auto'>('auto')
  const [watts, setWatts] = useState(18)
  const regime = useRad((s) => effectiveRegime(s))
  const harsh = REGIMES[regime].flux >= 2.4
  const auto: HMode = harsh ? 'tmr' : REGIMES[regime].flux >= 1.2 ? 'dmr' : 'perf'
  const mode = manual === 'auto' ? auto : manual
  const m = MODES[mode]
  const b = BLOCKS.find((x) => x.id === sel)!
  const tops = (m.tops * Math.min(1, watts / 18)) | 0
  const area = radiatorAreaM2(watts) * 1e4

  return (
    <Section
      id="chip"
      regime="inner"
      index="04"
      kicker="Inside HALO-7"
      title="Hardened at every layer, from transistor to scheduler."
      lede="Select any block on the die to see what it does and how it survives. The chip also reads the environment you are flying through in the dosimeter: push into the inner belt and it moves itself into Storm mode."
    >
      <div className="chipx">
        <div className="die">
          <svg viewBox="0 0 600 470" className="die__svg" role="group" aria-label="HALO-7 die floorplan">
            <defs>
              <pattern id="die-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M10 0H0V10" fill="none" stroke="rgba(160,190,215,.06)" />
              </pattern>
            </defs>
            <rect x="0" y="0" width="600" height="470" fill="url(#die-grid)" />
            {BLOCKS.map((bl) => (
              <g
                key={bl.id}
                className={`blk blk--${bl.tone} ${sel === bl.id ? 'is-sel' : ''}`}
                onClick={() => setSel(bl.id)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setSel(bl.id))}
                tabIndex={0}
                role="button"
                aria-pressed={sel === bl.id}
                aria-label={bl.name}
              >
                <rect x={bl.x} y={bl.y} width={bl.w} height={bl.h} rx="2" />
                <text x={bl.x + 8} y={bl.y + 17}>
                  {bl.name}
                </text>
              </g>
            ))}
            {/* NPU tile grid, coloured by redundancy group */}
            {Array.from({ length: 16 }, (_, i) => {
              const cx = 160 + (i % 4) * 72
              const cy = 168 + Math.floor(i / 4) * 50
              const group = mode === 'tmr' ? i % 3 : mode === 'dmr' ? i % 2 : -1
              const cls = group < 0 ? '' : `tile--g${group}`
              return (
                <rect key={i} x={cx} y={cy} width="64" height="42" rx="1" className={`tile ${cls} ${mode === 'tmr' && i === 15 ? 'tile--spare' : ''}`} pointerEvents="none" />
              )
            })}
          </svg>
          <p className="die__cap">
            Floorplan (illustrative) · 14.2 × 11.0 mm · tiles coloured by redundancy group in the current mode
          </p>
        </div>

        <div className="chip__side">
          <article className="blkinfo" aria-live="polite">
            <p className="kicker">{b.tone.toUpperCase()}</p>
            <h3>
              <F>{b.name}</F>
            </h3>
            <p>{b.what}</p>
            <ul>
              {b.hardening.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </article>

          <div className="adapt">
            <div className="adapt__head">
              <h3>Adaptive hardening</h3>
              <span className={`tag ${manual === 'auto' ? 'tag--live' : ''}`}>{manual === 'auto' ? `auto · ${REGIMES[regime].short}` : 'manual'}</span>
            </div>
            <div className="seg seg--wide" role="radiogroup" aria-label="Hardening mode">
              <button role="radio" aria-checked={manual === 'auto'} className={manual === 'auto' ? 'is-on' : ''} onClick={() => setManual('auto')}>
                Auto
              </button>
              {(Object.keys(MODES) as HMode[]).map((k) => (
                <button key={k} role="radio" aria-checked={manual === k} className={manual === k ? 'is-on' : ''} onClick={() => setManual(k)}>
                  {MODES[k].label}
                </button>
              ))}
            </div>
            <div className="gauge" aria-label={`${tops} TOPS available`}>
              <div className="gauge__bar">
                <span style={{ width: `${(tops / 64) * 100}%` }} />
              </div>
              <div className="gauge__nums">
                <b>{tops}</b> TOPS INT8 <span className="muted">· scrub {m.scrub} · SDC {m.sdc}</span>
              </div>
            </div>
            <p className="adapt__desc">{m.desc}</p>
            <label className="field">
              <span>
                Power budget <b>{watts} W</b> → radiator ≥ <b>{area.toFixed(0)} cm²</b> at 60 °C, ε = 0.85
              </span>
              <input type="range" min={8} max={25} value={watts} onChange={(e) => setWatts(+e.target.value)} />
            </label>
            <p className="ion__note">
              In vacuum there is no convection. Every watt leaves by conduction to a radiator and then by radiation (P = εσAT⁴).
              This is a lower bound that ignores solar and Earth-IR loads.
            </p>
          </div>
        </div>
      </div>

      <table className="specs">
        <caption>HALO-7 target specifications (concept; to be verified in qualification)</caption>
        <tbody>
          {SPECS.map(([k, v]) => (
            <tr key={k}>
              <th scope="row">{k}</th>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  )
}

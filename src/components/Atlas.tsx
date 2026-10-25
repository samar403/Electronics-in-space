import { useState } from 'react'
import { F } from './FlipText'
import { Section } from './Section'
import { IonStrike } from './IonStrike'

type Kind = 'cumulative' | 'soft' | 'destructive'

interface Effect {
  code: string
  name: string
  kind: Kind
  mechanism: string
  metric: string
  breaks: string
  test: string
  halo: string
}

const EFFECTS: Effect[] = [
  {
    code: 'TID',
    name: 'Total ionising dose',
    kind: 'cumulative',
    mechanism:
      'Ionising radiation creates electron–hole pairs in oxides. Holes and interface traps build up over the mission, shifting threshold voltages and opening leakage paths along isolation edges.',
    metric: 'krad(Si) accumulated. 1 rad = 0.01 Gy.',
    breaks: 'Leakage current rises, timing slows and analog circuits drift until the part goes out of spec.',
    test: 'Co-60 gamma per MIL-STD-883 TM1019 / ESCC 22900, with anneal steps.',
    halo: 'Thin 22 nm gate oxides are inherently tolerant. On-die TID monitors drive adaptive back-gate bias to cancel the Vt shift from buried-oxide charge. Target 300 krad(Si) (RHA level F).',
  },
  {
    code: 'DDD',
    name: 'Displacement damage',
    kind: 'cumulative',
    mechanism:
      'Protons and neutrons knock silicon atoms out of the lattice (non-ionising energy loss), creating defects that kill minority-carrier lifetime.',
    metric: 'MeV/g (NIEL dose) or 1 MeV neutron-equivalent fluence, n/cm².',
    breaks: 'Image sensors (dark current, hot pixels), solar cells, optocouplers and bipolar parts. CMOS logic is largely insensitive.',
    test: 'Proton or neutron irradiation, with ASTM E722 equivalence.',
    halo: 'The logic die is insensitive. The on-chip ISP tracks hot pixels and recalibrates dark frames so the camera front-end ages gracefully.',
  },
  {
    code: 'SEU',
    name: 'Single-event upset',
    kind: 'soft',
    mechanism:
      'One ion deposits a column of charge. If the charge collected at a storage node exceeds its critical charge Q꜀ᵣᵢₜ, the bit flips. Nothing is damaged; the data is simply wrong.',
    metric: 'Cross-section σ(LET) in cm²/bit and onset LET; orbit rate in upsets/bit/day (CREME96).',
    breaks: 'Weights, activations, registers and caches. In AI it shows up as silent data corruption: confident and wrong.',
    test: 'Heavy ions per JESD57 / ESCC 25100, protons per JESD234.',
    halo: 'SECDED ECC on every array, background scrubbing every 10 s, DICE flip-flops, and FD-SOI’s tiny collection volume.',
  },
  {
    code: 'MBU',
    name: 'Multiple-bit upset',
    kind: 'soft',
    mechanism:
      'At deep-submicron pitch one ion track spans several adjacent cells. If two of them belong to the same ECC word, SECDED can detect the error but not correct it.',
    metric: 'MCU fraction and cluster-size distribution versus LET and angle.',
    breaks: 'Defeats single-error-correcting codes. The effect grows with every process shrink.',
    test: 'Heavy-ion runs at grazing angles, with physical-to-logical bitmap analysis.',
    halo: 'Bit interleaving puts four or more cells between bits of the same word, so one track lands in four different words and each error stays correctable.',
  },
  {
    code: 'SET',
    name: 'Single-event transient',
    kind: 'soft',
    mechanism:
      'A charge pulse in combinational logic travels like a real signal. If it reaches a latch at a clock edge, it becomes an upset.',
    metric: 'Pulse width distribution (ps) versus LET; error rate scales with clock frequency.',
    breaks: 'Control paths, clock trees, PLLs and high-speed SerDes.',
    test: 'Heavy-ion testing with on-chip pulse-width capture, plus pulsed laser.',
    halo: 'Temporal filtering latches on control paths, TMR with skewed clocks, and hardened PLLs with lock monitors.',
  },
  {
    code: 'SEFI',
    name: 'Functional interrupt',
    kind: 'soft',
    mechanism:
      'An upset lands in control state: a sequencer, configuration register or bus arbiter. The device hangs, resets or enters an undefined mode.',
    metric: 'SEFI cross-section per device and mean time to recover.',
    breaks: 'COTS SoCs and GPUs: the dominant reason flight computers reboot.',
    test: 'Heavy-ion and proton runs with a live workload and automated recovery tracking.',
    halo: 'A TMR “Warden” safety controller watches every domain, checkpoints the NPU and restarts the faulty domain in under 50 ms. No ground intervention.',
  },
  {
    code: 'SEL',
    name: 'Single-event latch-up',
    kind: 'destructive',
    mechanism:
      'In bulk CMOS the n-well / p-substrate structure forms a parasitic PNPN thyristor. An ion can fire it, shorting supply to ground until power is removed.',
    metric: 'Onset LET at maximum temperature (125 °C) and maximum supply voltage.',
    breaks: 'Anything bulk CMOS. Without fast current limiting the part can burn out.',
    test: 'Heavy ions at 125 °C, V_max, per JESD57 / ESCC 25100; screening to LET ≥ 60–80 MeV·cm²/mg.',
    halo: 'Immune by construction: the buried oxide removes the thyristor path. Board-level current limiters protect any companion bulk parts.',
  },
  {
    code: 'SEB',
    name: 'Burnout / gate rupture',
    kind: 'destructive',
    mechanism:
      'In power MOSFETs and other high-voltage devices, an ion can trigger runaway current (SEB) or punch through the gate oxide (SEGR).',
    metric: 'Safe operating area: V_DS / V_GS versus ion LET.',
    breaks: 'Point-of-load regulators and power switches feeding the computer.',
    test: 'MIL-STD-750 TM1080 on power devices.',
    halo: 'The HALO-M power tree uses rad-hard regulators derated to their SEB/SEGR safe operating area.',
  },
]

const KIND_LABEL: Record<Kind, string> = {
  cumulative: 'Cumulative',
  soft: 'Single-event · soft',
  destructive: 'Single-event · destructive',
}

export function Atlas() {
  const [sel, setSel] = useState('SEU')
  const [filter, setFilter] = useState<Kind | 'all'>('all')
  const e = EFFECTS.find((x) => x.code === sel)!
  const list = EFFECTS.filter((x) => filter === 'all' || x.kind === filter)

  return (
    <Section
      id="atlas"
      regime="leo"
      index="02"
      kicker="Atlas of radiation effects"
      title="Eight ways space breaks a chip."
      lede="Space radiation damages electronics in two ways. Cumulative effects wear devices down over years. Single-event effects happen instantly, when one particle hits the wrong node. Each one needs its own test and its own mitigation."
    >
      <div className="atlas">
        <div className="atlas__filters" role="tablist" aria-label="Filter effects">
          {(['all', 'cumulative', 'soft', 'destructive'] as const).map((k) => (
            <button key={k} role="tab" aria-selected={filter === k} className={`chip ${filter === k ? 'is-on' : ''}`} onClick={() => setFilter(k)}>
              {k === 'all' ? 'All effects' : KIND_LABEL[k]}
            </button>
          ))}
        </div>

        <div className="atlas__grid">
          <ul className="periodic" aria-label="Radiation effects">
            {list.map((x) => (
              <li key={x.code}>
                <button className={`element element--${x.kind} ${sel === x.code ? 'is-sel' : ''}`} onClick={() => setSel(x.code)} aria-pressed={sel === x.code}>
                  <span className="element__code">{x.code}</span>
                  <span className="element__name">{x.name}</span>
                </button>
              </li>
            ))}
          </ul>

          <article className={`effect effect--${e.kind}`} aria-live="polite">
            <p className="effect__kind">{KIND_LABEL[e.kind]}</p>
            <h3 className="effect__title">
              <span>{e.code}</span> <F>{e.name}</F>
            </h3>
            <p className="effect__mech">{e.mechanism}</p>
            <dl className="effect__dl">
              <div>
                <dt>Measured as</dt>
                <dd>{e.metric}</dd>
              </div>
              <div>
                <dt>What it breaks</dt>
                <dd>{e.breaks}</dd>
              </div>
              <div>
                <dt>Qualified by</dt>
                <dd>{e.test}</dd>
              </div>
              <div className="effect__halo">
                <dt>HALO mitigation</dt>
                <dd>{e.halo}</dd>
              </div>
            </dl>
          </article>
        </div>

        <IonStrike />
      </div>
    </Section>
  )
}

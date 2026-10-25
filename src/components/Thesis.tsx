import { F } from './FlipText'
import { Section } from './Section'

const PROBLEMS = [
  {
    n: '1998',
    unit: 'design year',
    title: 'Flagship missions still fly a PowerPC 750',
    body: 'The RAD750, a hardened PowerPC 750 running at roughly 110–200 MHz, flies on Perseverance and JWST. Qualified space processors trail commercial silicon by 15–20 years.',
  },
  {
    n: '10k+',
    unit: 'active satellites',
    title: 'Orbit is now a fleet, not a handful',
    body: 'Most active satellites have launched since 2019. Each one is a sensor, router or relay that would be more valuable if it could think for itself.',
  },
  {
    n: '≈⅔',
    unit: 'of Earth is cloudy',
    title: 'Downlink, not sensing, is the bottleneck',
    body: 'Imagers capture far more than ground passes can return, and much of what they send is cloud. Deciding in orbit what is worth sending turns a pipe problem into a product.',
  },
  {
    n: '∑',
    unit: 'SEU · SEL · SEFI · TID',
    title: 'COTS GPUs fail in ways you can’t see',
    body: 'Commercial accelerators flip bits silently, latch up, hang and drift with dose. Flying them means shielding mass, supervisor boards and frequent reboots, and every corrupted inference still goes out.',
  },
]

const INSIGHTS = [
  {
    k: '01',
    t: 'Start on FD-SOI, not bulk',
    d: 'A buried oxide removes the parasitic thyristor behind latch-up and shrinks the volume each ion can collect charge from. On 22 nm FD-SOI, hardness comes from the process.',
  },
  {
    k: '02',
    t: 'Harden the architecture, not every gate',
    d: 'Neural nets are dominated by matrix multiplies, which can be checked with algorithm-based fault tolerance (ABFT checksums) at about 2% overhead. Triple modular redundancy goes only where the control state lives.',
  },
  {
    k: '03',
    t: 'Make hardening adaptive',
    d: 'An on-die SEU monitor senses the environment. In quiet sky the chip runs at full throughput. Through the South Atlantic Anomaly or a solar storm it trades TOPS for triple-voted certainty within milliseconds.',
  },
]

const STACK = [
  { name: 'HALO-7', role: 'SoC', d: '64 TOPS INT8 NPU, 4× lockstep RISC-V application cores, TMR safety controller, 32 MB ECC SRAM.' },
  { name: 'HALO-M', role: 'Module', d: '3U SpaceVPX (VITA 78) and CubeSat-PC/104 cards: conduction-cooled, latch-up protected, rated for 5 years in LEO.' },
  { name: 'HaloStack', role: 'SDK', d: 'PyTorch/ONNX → fault-aware quantisation → compiler with ABFT insertion and a radiation-aware scheduler.' },
  { name: 'HaloSim', role: 'Digital twin', d: 'Fault injection driven by the orbit environment. Before launch, it shows how your model behaves in the SAA.' },
]

export function Thesis() {
  return (
    <Section
      id="thesis"
      regime="leo"
      index="01"
      kicker="The idea"
      title="Orbit is becoming a data center. Its silicon is from 1998."
      lede="AI is reaching orbit as satellite constellations multiply: Earth observation, communications, defense, and soon orbital compute. The chips that can survive there are decades behind. HALO Orbital builds AI silicon that is radiation-hardened by process, by architecture and by software, so models trained on the ground can run in orbit."
    >
      <div className="problems">
        {PROBLEMS.map((p) => (
          <article key={p.title} className="problem">
            <p className="problem__n">
              {p.n}
              <span>{p.unit}</span>
            </p>
            <h3>
              <F>{p.title}</F>
            </h3>
            <p>{p.body}</p>
          </article>
        ))}
      </div>

      <div className="insight">
        <h3 className="insight__h">
          <F>Our insight: radiation hardness is a full-stack problem.</F>
        </h3>
        <ol className="insight__list">
          {INSIGHTS.map((i) => (
            <li key={i.k}>
              <span className="insight__k">{i.k}</span>
              <div>
                <h4>{i.t}</h4>
                <p>{i.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="stack" aria-label="Product stack">
        {STACK.map((s, i) => (
          <div key={s.name} className="stack__layer" style={{ ['--i' as string]: i }}>
            <span className="stack__role">{s.role}</span>
            <strong>{s.name}</strong>
            <p>{s.d}</p>
          </div>
        ))}
      </div>
    </Section>
  )
}

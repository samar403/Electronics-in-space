import { F } from './FlipText'
import { Section } from './Section'

const SEGMENTS = [
  { t: 'Earth observation', d: 'Onboard triage, change detection and tasking. Sell answers instead of pixels.' },
  { t: 'Communications constellations', d: 'Onboard routing, beamforming and interference cancellation at the edge.' },
  { t: 'Defense & space domain awareness', d: 'Tracking and on-orbit autonomy where the latency budget is seconds.' },
  { t: 'Orbital compute', d: 'Hardened control and inference planes for data centers in orbit.' },
  { t: 'Lunar & deep space', d: 'Autonomy beyond the magnetosphere, where every bit of light-time counts.' },
]

const MODEL = [
  { k: 'Silicon', v: 'HALO-7 in three grades: screened New Space, QML-Y, QML-V flight.' },
  { k: 'Modules', v: 'HALO-M SpaceVPX and PC/104 cards. Integration-ready for primes and CubeSat builders.' },
  { k: 'Software', v: 'HaloStack SDK seats and a runtime royalty per spacecraft.' },
  { k: 'Services', v: 'HaloSim fault-injection studies and radiation test campaigns as a service.' },
]

const ROADMAP = [
  { when: 'Phase 0', t: 'HaloSim + HALO-M0', d: 'Fault-injection twin plus a supervised, hardened module around existing rad-tolerant parts. Revenue and flight data from day one.' },
  { when: 'Phase 1', t: 'Test chip on 22 nm FD-SOI', d: 'Multi-project-wafer shuttle: NPU tile, ECC SRAM macros, DICE cells and sense ring. Heavy-ion and proton beam campaigns.' },
  { when: 'Phase 2', t: 'Rideshare demonstration', d: 'Fly the test chip next to a COTS GPU in the same payload. Publish the side-by-side upset log: the Bit Arena, in orbit.' },
  { when: 'Phase 3', t: 'HALO-7 production', d: 'Full SoC tape-out, QML-Y then QML-V qualification, design wins with constellation operators and primes.' },
  { when: 'Phase 4', t: 'HALO-9 for orbital compute', d: 'Chiplet scale-up: hardened control plane and high-bandwidth fabric for orbital data centers.' },
]

const RISKS = [
  { r: 'Tape-out cost and schedule', m: 'Prove the hardest IP on MPW shuttles first, and fund it with Phase 0 module revenue.' },
  { r: 'No flight heritage, so no sales', m: 'Rideshare demo early. Fly as a secondary payload with an existing computer as the safety net.' },
  { r: 'Export control (ITAR/EAR)', m: 'Classify early, keep a US-person design flow, and offer a commercial New Space grade.' },
  { r: 'Incumbent response', m: 'Incumbents optimise for CPUs and heritage. Our edge is AI-native architecture plus the toolchain.' },
]

export function Business() {
  return (
    <Section
      id="business"
      regime="deep"
      index="09"
      kicker="The company"
      title="From a test chip to the compute layer of orbit."
      lede="HALO Orbital sells the full path from model to orbit: silicon, modules, software and qualification. We start where revenue is fastest, then compound flight heritage into the moat."
    >
      <div className="biz">
        <div className="biz__col">
          <h3 className="sub">Who it’s for</h3>
          <ul className="segments">
            {SEGMENTS.map((s) => (
              <li key={s.t}>
                <b>
                  <F>{s.t}</F>
                </b>
                <span>{s.d}</span>
              </li>
            ))}
          </ul>
          <h3 className="sub">How we make money</h3>
          <dl className="model">
            {MODEL.map((m) => (
              <div key={m.k}>
                <dt>{m.k}</dt>
                <dd>{m.v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="biz__col">
          <h3 className="sub">Roadmap</h3>
          <ol className="road">
            {ROADMAP.map((r) => (
              <li key={r.when}>
                <span className="road__when">{r.when}</span>
                <div>
                  <b>{r.t}</b>
                  <p>{r.d}</p>
                </div>
              </li>
            ))}
          </ol>
          <h3 className="sub">Risks we plan around</h3>
          <ul className="risks">
            {RISKS.map((r) => (
              <li key={r.r}>
                <b>{r.r}</b>
                <span>{r.m}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  )
}

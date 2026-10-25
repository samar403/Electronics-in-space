import { useState } from 'react'
import { Section } from './Section'

type Cat = 'radiation' | 'environment' | 'quality' | 'interfaces'

interface Crit {
  cat: Cat
  name: string
  std: string
  target: string
  how: string
}

const CRITERIA: Crit[] = [
  { cat: 'radiation', name: 'Total ionising dose', std: 'MIL-STD-883 TM1019 · ESCC 22900', target: '≥ 300 krad(Si) with RDM 2 for LEO/GEO; biased and unbiased', how: 'Co-60 gamma cell, 50–300 rad(Si)/s, room-temperature anneal and 100 °C accelerated ageing.' },
  { cat: 'radiation', name: 'Heavy-ion SEE (SEU/SET/SEFI/SEL)', std: 'JESD57 · ESCC 25100 · ASTM F1192', target: 'SEL-free to LET 80 MeV·cm²/mg at 125 °C; full σ(LET) Weibull curves', how: 'Cyclotron beam campaigns (e.g. TAMU Cyclotron Institute, LBNL 88-Inch BASE) with live NPU workloads.' },
  { cat: 'radiation', name: 'Proton SEE', std: 'JESD234', target: 'σ(E) from 10–200 MeV; SEFI and SDC characterised in workload', how: 'Proton facilities (e.g. MGH Francis H. Burr, UC Davis Crocker, TRIUMF PIF).' },
  { cat: 'radiation', name: 'Neutron soft-error rate', std: 'JESD89', target: 'Ground and aviation SER for ground segment and test', how: 'Spallation neutron beam (e.g. LANSCE, ChipIr).' },
  { cat: 'radiation', name: 'Hardness assurance flow', std: 'ECSS-Q-ST-60-15C · NASA EEE-INST-002', target: 'Lot acceptance testing per wafer lot; RDM ≥ 2 on TID, rate predictions with CREME96', how: 'Environment from AE9/AP9-IRENE, shielding with sector analysis per ECSS-E-ST-10-12C.' },
  { cat: 'environment', name: 'Thermal vacuum and cycling', std: 'ECSS-E-ST-10-03C · GSFC-STD-7000 (GEVS)', target: '−55 to +125 °C junction; 8+ TVAC cycles at module level', how: 'Conduction-cooled qualification of the HALO-M module in a TVAC chamber.' },
  { cat: 'environment', name: 'Random vibration and shock', std: 'GSFC-STD-7000 (GEVS) · launcher user manuals', target: 'Qualification level ≥ 14.1 Grms random; pyroshock per launcher', how: 'Module-level shaker tests with CCGA column inspection.' },
  { cat: 'environment', name: 'Outgassing', std: 'ASTM E595', target: 'TML < 1.0 %, CVCM < 0.10 % for every material', how: 'Material selection from the NASA outgassing database. Conformal coating and underfill screened.' },
  { cat: 'quality', name: 'Microcircuit quality level', std: 'MIL-PRF-38535 QML-V / QML-Y · ESCC 9000', target: 'Class V flow (hermetic CCGA) and Class Y (flip-chip); New Space screened grade', how: 'Burn-in, PIND, X-ray, CSAM, DPA per MIL-STD-883 test methods.' },
  { cat: 'quality', name: 'Parts, materials and processes', std: 'ECSS-Q-ST-60C · ECSS-Q-ST-70C', target: 'No pure tin (whiskers); approved PCB, solder and staking processes', how: 'Programme PMP control board with derating per ECSS-Q-ST-30-11C.' },
  { cat: 'interfaces', name: 'SpaceWire / SpaceFibre', std: 'ECSS-E-ST-50-12C · ECSS-E-ST-50-11C', target: 'Compliance and interoperability with standard routers', how: 'Conformance test benches and fault-injected link testing.' },
  { cat: 'interfaces', name: 'Module form factor', std: 'ANSI/VITA 78 (SpaceVPX) · CubeSat PC/104', target: '3U SpaceVPX payload card and 1U-stackable PC/104 variant', how: 'Backplane interoperability with prime-contractor chassis.' },
  { cat: 'interfaces', name: 'Flight software', std: 'ECSS-E-ST-40C · NASA NPR 7150.2', target: 'Class B/C software for the SDK runtime; RTEMS and Linux BSPs', how: 'MISRA-checked runtime, deterministic scheduler, independent V&V.' },
]

const CATS: Record<Cat, string> = {
  radiation: 'Radiation',
  environment: 'Environment',
  quality: 'Quality & parts',
  interfaces: 'Interfaces & software',
}

export function Qualification() {
  const [cat, setCat] = useState<Cat>('radiation')
  const [open, setOpen] = useState<string | null>(CRITERIA[0].name)
  const list = CRITERIA.filter((c) => c.cat === cat)

  return (
    <Section
      id="criteria"
      regime="geo"
      index="08"
      kicker="Criteria"
      title="What 'space-grade' has to mean on paper."
      lede="Hardness is earned in a beam, a shaker and a vacuum chamber, and recorded against standards customers already trust. These are the standards HALO-7 and HALO-M are designed and qualified against."
    >
      <div className="crit">
        <div className="seg seg--wide" role="tablist" aria-label="Criteria category">
          {(Object.keys(CATS) as Cat[]).map((k) => (
            <button key={k} role="tab" aria-selected={cat === k} className={cat === k ? 'is-on' : ''} onClick={() => setCat(k)}>
              {CATS[k]} <span className="muted">{CRITERIA.filter((c) => c.cat === k).length}</span>
            </button>
          ))}
        </div>
        <ul className="crit__list">
          {list.map((c) => {
            const isOpen = open === c.name
            return (
              <li key={c.name} className={isOpen ? 'is-open' : ''}>
                <button className="crit__row" onClick={() => setOpen(isOpen ? null : c.name)} aria-expanded={isOpen}>
                  <span className="crit__name">{c.name}</span>
                  <span className="crit__std">{c.std}</span>
                  <span className="crit__chev" aria-hidden="true">
                    {isOpen ? '−' : '+'}
                  </span>
                </button>
                {isOpen && (
                  <div className="crit__body">
                    <p>
                      <span className="kicker">Design target</span>
                      {c.target}
                    </p>
                    <p>
                      <span className="kicker">How we verify</span>
                      {c.how}
                    </p>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </Section>
  )
}

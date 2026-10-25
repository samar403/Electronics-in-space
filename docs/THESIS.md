# HALO Orbital: investment thesis

*Radiation-hardened AI silicon for orbit.* This is a concept company; every HALO-7 figure is a design target.

## One line
We build AI inference chips that survive space, hardened by process, architecture and software, so that
satellites can run modern neural networks through the Van Allen belts.

## Problem
- **Orbit is becoming a compute platform.** More than 10,000 satellites are active, most launched since 2019.
  Earth observation, communications, defense and orbital data centers all want onboard intelligence.
- **The downlink is the bottleneck.** An imager can capture terabytes a day while ground passes return a
  few hundred gigabytes, and about two thirds of what it sees is cloud.
- **Space silicon is decades behind.** Flagship missions fly the RAD750 (a hardened PowerPC 750 at about
  110–200 MHz). Newer rad-hard processors reach GOPS. AI wants hundreds of TOPS.
- **COTS accelerators fail in ways you can't see.** Silent data corruption from SEUs, functional interrupts
  that need reboots, latch-up risk in bulk CMOS, and drift with dose. Teams compensate with shielding mass,
  supervisor boards and conservative duty cycles, and every corrupted inference still goes out.

## Insight
Hardness doesn't have to cost 20 years of performance if it is engineered across the stack:
1. **Process.** 22 nm FD-SOI: the buried oxide removes the latch-up thyristor and shrinks charge collection
   by orders of magnitude versus bulk.
2. **Architecture.** Neural nets are dominated by GEMMs, and GEMMs can be checked cheaply with
   algorithm-based fault tolerance (Huang & Abraham, 1984). TMR goes only where control state lives.
   ECC is interleaved and scrubbed.
3. **Adaptation.** An on-die SEU/TID sensor detects the South Atlantic Anomaly, belt crossings and solar
   events, then trades TOPS for triple-voted reliability (64 → 32 → 20 TOPS) within milliseconds.
4. **Software.** A compiler that inserts ABFT, quantises with fault-awareness and schedules around the
   environment, plus a digital twin (HaloSim) that shows customers how their model behaves before launch.

## Product
| Layer | Offering |
| --- | --- |
| Silicon | **HALO-7** SoC: 64 TOPS INT8, 4× lockstep RV64 cores, TMR safety controller, 32 MB ECC SRAM, SpaceFibre/SpaceWire/PCIe. Target ≥ 300 krad(Si), SEL-immune to LET 80 MeV·cm²/mg. |
| Modules | **HALO-M**: 3U SpaceVPX (VITA 78) and CubeSat PC/104 cards |
| Software | **HaloStack** SDK: PyTorch/ONNX → fault-aware quantisation → compiler + runtime |
| Services | **HaloSim** fault injection, radiation test campaigns |

## Customers
Earth-observation operators, communications constellations, defense and space-domain-awareness programs,
orbital-compute companies, and lunar / deep-space missions.

## Business model
Chip sales in three grades (screened New Space, QML-Y, QML-V), module sales, SDK seats with a per-spacecraft
runtime royalty, and engineering and test services. Phase 0 sells modules and HaloSim for early revenue and
flight data.

## Why now
- Launch cost collapse (rideshare at roughly $6k/kg) means more satellites, more often, with shorter lives.
  That favours fast iteration and commercial-grade economics over bespoke programmes.
- Mature 22 nm FD-SOI with radiation characterisation available from the foundry ecosystem.
- Efficient vision and language models now fit in tens of watts.
- Defense and civil agencies are funding proliferated LEO architectures and next-generation space computing.

## Moat
Flight heritage compounds: every orbit adds data. Add a proprietary radiation test dataset across process
corners, the compiler toolchain (switching cost) and qualification paperwork that takes years to replicate.

## Roadmap
| Phase | Milestone |
| --- | --- |
| 0 | HaloSim + HALO-M0 module around existing rad-tolerant parts: first revenue |
| 1 | Multi-project-wafer test chip on 22 nm FD-SOI; heavy-ion and proton beam campaigns |
| 2 | Rideshare demo: test chip and COTS GPU side by side, with a public upset log |
| 3 | HALO-7 tape-out, QML-Y then QML-V qualification, design wins |
| 4 | HALO-9 chiplet scale-up for orbital compute |

## Risks
| Risk | Mitigation |
| --- | --- |
| Tape-out cost and schedule | MPW shuttles first; Phase 0 revenue |
| Heritage chicken-and-egg | Early rideshare demo as a secondary payload |
| ITAR/EAR export control | Early classification, US-person flow, commercial grade |
| Incumbent response | AI-native architecture and toolchain; incumbents optimise for CPUs and heritage |

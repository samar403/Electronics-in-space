# Radiation model: assumptions and references

The planner, the chip page and the tests use the model in [`src/lib/radiation.ts`](../src/lib/radiation.ts)
and [`src/lib/orbit.ts`](../src/lib/orbit.ts). It is a **first-order, educational estimate**, good for
seeing trade-offs and scoping a design space. It does **not** replace a radiation hardness assurance
analysis.

> For flight: build the environment with AE9/AP9-IRENE (or AE8/AP8) and solar-proton models in
> SPENVIS/OMERE, compute dose-depth with SHIELDOSE-2 and sector analysis of the real spacecraft
> geometry (ECSS-E-ST-10-12C), predict SEE rates with CREME96 from measured σ(LET), and apply
> ECSS-Q-ST-60-15C / NASA EEE-INST-002.

## Orbital mechanics (exact, two-body)
- Period `T = 2π √(a³/μ)` with μ = 398 600.4418 km³/s², a = Rₑ + h, Rₑ = 6371 km.
- Velocity `v = √(μ/a)`.
- Worst-case (β = 0) eclipse fraction `asin(Rₑ/a)/π` (cylindrical shadow).
- Dipole L-shell `L = r / cos²λ`; field lines `r = L cos²λ`. Used for the magnetosphere drawing.

## Total ionising dose
1. **Reference curve.** Trapped-belt dose behind 2.5 mm (≈ 100 mil) Al versus altitude, log-interpolated
   from order-of-magnitude anchors (LEO ≈ 0.1–1, sun-synchronous ≈ 1–3, inner-belt core ≈ hundreds,
   GNSS/MEO ≈ tens to 100, GEO ≈ 5–10 krad(Si)/yr). Each anchor also carries an electron fraction.
2. **Inclination factor** for LEO (SAA crossings, outer-belt horns), faded out across the inner belt.
3. **Solar cycle.** At solar max, LEO trapped protons ×0.7 (atmospheric erosion) and electrons ×1.25.
4. **Depth scaling** from 2.5 mm: protons `(t/2.5)^-0.55`, electrons `(t/2.5)^-2.2` with a 1.5%
   bremsstrahlung floor.
5. **Solar protons.** About 2 krad/yr behind 2.5 mm in free space at solar max (×0.15 at min), scaled by a
   geomagnetic exposure factor (≈ 0 for low-inclination LEO, ≈ 1 beyond the magnetopause), depth `^-1.1`.

**Hardness level.** Smallest MIL-PRF-38535 RHA designator ≥ RDM × mission dose:
M 3k · D 10k · P 30k · L 50k · R 100k · F 300k · G 500k · H 1 Mrad(Si). Default RDM is 2.

## Single-event upsets
- Bulk-CMOS SRAM GCR rate in free space: 5 × 10⁻⁸ upsets/bit/day (solar min), ×0.6 at solar max, times
  a geomagnetic transmission factor (≈ 0.04 equatorial LEO → 0.45 polar → ≈ 1 at GEO).
- Trapped-proton SEU: 4 × 10⁻⁷ upsets/bit/day per krad/yr of trapped-proton dose at 2.5 mm, a proxy
  for > 30 MeV proton flux.
- Worst day (large SPE): quiet × (1 + 300 × solar exposure), which gives the ×100–×1000 seen at GEO.

## Memory protection
For SECDED words of n = 72 bits, scrub interval T and per-bit rate λ:

```
uncorrectable/day = events × f_MBU,same-word + words × C(n,2) × (λT)² × 86400/T
```

| Preset | Bit sensitivity | ECC | Same-word MBU | Scrub |
| --- | --- | --- | --- | --- |
| COTS | 1 | none | – | – |
| COTS + SECDED | 1 | SECDED | 4 % | 1 h |
| HALO-7 | 0.05 (FD-SOI) | SECDED, 4-way interleave | 0.002 % | 10 s |

SEFI rate is modelled as upset rate × 3 × 10⁵ sensitive control bits (COTS). HALO-7 applies FD-SOI ×0.05
and TMR control ×0.01, with autonomous recovery.

## Ion-strike explainer
Charge deposited in silicon: 1 MeV·cm²/mg ≈ 10.3 fC/µm. Collection depth is about 1.5 µm in bulk
(funnel and diffusion) versus about 0.025 µm effective in FD-SOI. Q_crit is about 0.8 fC for a 22–28 nm
SRAM node; a DICE cell is treated as ≈ 12 fC effective because two nodes must flip.

## Thermal
Radiator lower bound `A = P / (ε σ T⁴)` (no environmental loads), with ε = 0.85 and T = 60 °C.

## Downlink
Generated data = sensor rate × imaging minutes × orbits/day. Capacity = link rate × pass minutes × passes.
A bent pipe sends a representative sample; onboard triage queues only clear × worth-sending data. Global
mean cloud fraction is ≈ 0.67.

## What the tests check
`src/lib/radiation.test.ts` checks orbital periods (ISS ≈ 92.6 min, GEO ≈ 1436 min), LEO eclipse
fraction, L-shell identities, regime ordering of dose, shielding monotonicity, RHA selection, SPE
multipliers, the protection ladder, radiator sizing and downlink insight gain.

/**
 * First-order radiation environment & effects model for mission scoping.
 *
 * This is an engineering *estimate* built from log-interpolated reference values
 * (order-of-magnitude, in line with published AE8/AP8-class environment summaries).
 * It is intended to teach trade-offs and size a design space, NOT to replace
 * SPENVIS / OMERE / AE9-AP9-IRENE + SHIELDOSE-2 + CREME96 analyses that a real
 * radiation hardness assurance (RHA) flow per ECSS-Q-ST-60-15C requires.
 * See docs/RADIATION_MODEL.md for assumptions and references.
 */

export type SolarPhase = 'min' | 'max'

export interface MissionInput {
  altitudeKm: number
  inclinationDeg: number
  years: number
  /** Equivalent spherical aluminium shielding thickness, mm. 2.5 mm ≈ 100 mil. */
  shieldingMm: number
  solar: SolarPhase
  /** Radiation design margin applied to TID. NASA/ECSS practice is typically 2. */
  rdm?: number
  /** Memory footprint exposed to upsets, gigabytes. */
  memoryGB?: number
}

/**
 * Reference trapped-belt TID behind 2.5 mm Al (krad(Si)/yr), low-inclination,
 * solar minimum, plus the electron share of that dose.
 * [altitude km, krad/yr, electron fraction]
 */
const TRAPPED_TABLE: ReadonlyArray<readonly [number, number, number]> = [
  [200, 0.01, 0.3],
  [300, 0.03, 0.3],
  [400, 0.08, 0.3],
  [500, 0.25, 0.3],
  [600, 0.5, 0.3],
  [800, 1.5, 0.35],
  [1000, 4, 0.3],
  [1200, 12, 0.25],
  [1500, 50, 0.2],
  [2000, 200, 0.15],
  [3000, 600, 0.15], // inner (proton) belt core, L ≈ 1.5
  [5000, 500, 0.3],
  [8000, 150, 0.6],
  [11000, 60, 0.85], // slot region, L ≈ 2–3
  [15000, 120, 0.95], // outer (electron) belt
  [20000, 90, 0.97], // GNSS / MEO
  [25000, 40, 0.98],
  [30000, 15, 0.98],
  [35786, 7, 0.98], // GEO
  [50000, 1.5, 0.9],
  [65000, 0.05, 0.5], // near/outside the magnetopause (~10 Re)
  [400000, 0.02, 0.5], // cislunar: trapped contribution ~ none
]

function logInterp(x: number, xs: number[], ys: number[]): number {
  if (x <= xs[0]) return ys[0]
  if (x >= xs[xs.length - 1]) return ys[ys.length - 1]
  for (let i = 1; i < xs.length; i++) {
    if (x <= xs[i]) {
      const t = (Math.log(x) - Math.log(xs[i - 1])) / (Math.log(xs[i]) - Math.log(xs[i - 1]))
      return Math.exp(Math.log(ys[i - 1]) + t * (Math.log(ys[i]) - Math.log(ys[i - 1])))
    }
  }
  return ys[ys.length - 1]
}

function linInterp(x: number, xs: number[], ys: number[]): number {
  if (x <= xs[0]) return ys[0]
  if (x >= xs[xs.length - 1]) return ys[ys.length - 1]
  for (let i = 1; i < xs.length; i++) {
    if (x <= xs[i]) {
      const t = (x - xs[i - 1]) / (xs[i] - xs[i - 1])
      return ys[i - 1] + t * (ys[i] - ys[i - 1])
    }
  }
  return ys[ys.length - 1]
}

const ALTS = TRAPPED_TABLE.map((r) => r[0])
const DOSES = TRAPPED_TABLE.map((r) => r[1])
const EFRAC = TRAPPED_TABLE.map((r) => r[2])

/** Clamp helper. */
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/**
 * LEO inclination factor: low-inclination orbits clip the edge of the South Atlantic
 * Anomaly; higher inclinations cross its core and reach the outer-belt "horns".
 */
export function inclinationFactor(altitudeKm: number, inclinationDeg: number): number {
  const i = clamp(Math.abs(inclinationDeg), 0, 180)
  const ie = i > 90 ? 180 - i : i // retrograde orbits see the same latitude band
  const leo = linInterp(ie, [0, 20, 30, 50, 70, 90], [0.5, 0.9, 1.0, 1.1, 1.3, 1.4])
  // Fade the effect out across the inner belt: at high altitude the orbit sits on the
  // same field lines at every latitude in this first-order picture.
  const w = clamp((Math.log(altitudeKm) - Math.log(2000)) / (Math.log(5000) - Math.log(2000)), 0, 1)
  return leo * (1 - w) + 1 * w
}

/**
 * Exposure to solar energetic particles (0–1). Geomagnetic cutoff shields low-inclination
 * LEO almost completely; GEO and beyond are essentially unshielded.
 */
export function solarExposure(altitudeKm: number, inclinationDeg: number): number {
  const i = clamp(Math.abs(inclinationDeg), 0, 180)
  const ie = i > 90 ? 180 - i : i
  const leo = linInterp(ie, [0, 30, 50, 65, 90], [0.005, 0.01, 0.04, 0.12, 0.18])
  const w = clamp((Math.log(altitudeKm) - Math.log(1500)) / (Math.log(30000) - Math.log(1500)), 0, 1)
  const high = altitudeKm > 60000 ? 1 : 0.8
  return leo * (1 - w) + high * w
}

/**
 * Geomagnetic transmission of galactic cosmic rays (0–1), the fraction of the free-space
 * GCR heavy-ion flux that reaches the orbit.
 */
export function gcrTransmission(altitudeKm: number, inclinationDeg: number): number {
  const i = clamp(Math.abs(inclinationDeg), 0, 180)
  const ie = i > 90 ? 180 - i : i
  const leo = linInterp(ie, [0, 30, 51.6, 70, 90], [0.04, 0.08, 0.25, 0.4, 0.45])
  const w = clamp((Math.log(altitudeKm) - Math.log(2000)) / (Math.log(35786) - Math.log(2000)), 0, 1)
  // Earth shadowing removes ~1/3 of the sky in LEO.
  const far = altitudeKm > 60000 ? 1 : 0.95
  return leo * (1 - w) + far * w
}

export interface DoseBreakdown {
  trappedProton: number
  trappedElectron: number
  solarProton: number
  total: number
}

/** Annual ionising dose (krad(Si)/yr) behind the given shielding. */
export function annualDose(input: Omit<MissionInput, 'years'>): DoseBreakdown {
  const alt = clamp(input.altitudeKm, 200, 400000)
  const t = clamp(input.shieldingMm, 0.5, 30)
  const ref = logInterp(alt, ALTS, DOSES) * inclinationFactor(alt, input.inclinationDeg)
  const ef = linInterp(alt, ALTS, EFRAC)

  // Solar cycle: at solar max the upper atmosphere expands and erodes the inner edge of the
  // proton belt in LEO, while outer-belt electron activity tends to rise.
  const pSolar = input.solar === 'max' && alt < 3000 ? 0.7 : 1
  const eSolar = input.solar === 'max' ? 1.25 : 1

  // Depth-dose scaling relative to the 2.5 mm reference. Trapped electrons are stopped
  // quickly (steep curve, with a bremsstrahlung floor); protons penetrate (shallow curve).
  const x = t / 2.5
  const protonRef = ref * (1 - ef) * pSolar
  const electronRef = ref * ef * eSolar
  const trappedProton = protonRef * Math.pow(x, -0.55)
  const trappedElectron = electronRef * (Math.pow(x, -2.2) * 0.985 + 0.015)

  // Solar proton events (cycle-averaged). Reference ~2 krad/yr behind 2.5 mm in free space
  // at solar maximum; strongly reduced at minimum.
  const spRef = 2.0 * solarExposure(alt, input.inclinationDeg) * (input.solar === 'max' ? 1 : 0.15)
  const solarProton = spRef * Math.pow(x, -1.1)

  return {
    trappedProton,
    trappedElectron,
    solarProton,
    total: trappedProton + trappedElectron + solarProton,
  }
}

/** MIL-PRF-38535 RHA designator levels, krad(Si). */
export const RHA_LEVELS: ReadonlyArray<{ letter: string; krad: number }> = [
  { letter: 'M', krad: 3 },
  { letter: 'D', krad: 10 },
  { letter: 'P', krad: 30 },
  { letter: 'L', krad: 50 },
  { letter: 'R', krad: 100 },
  { letter: 'F', krad: 300 },
  { letter: 'G', krad: 500 },
  { letter: 'H', krad: 1000 },
]

export function requiredRHA(missionDoseKrad: number, rdm = 2) {
  const need = missionDoseKrad * rdm
  return RHA_LEVELS.find((l) => l.krad >= need) ?? null
}

/** HALO-7 target TID rating, krad(Si) (RHA level F). */
export const HALO_TID_KRAD = 300

// ---------------------------------------------------------------------------------------
// Single-event upsets
// ---------------------------------------------------------------------------------------

/** GCR-induced SEU rate of an unhardened bulk-CMOS SRAM bit in free space, upsets/bit/day. */
export const GCR_SEU_FREE_SPACE = 5e-8
/** Trapped-proton SEU coefficient: upsets/bit/day per krad/yr of trapped-proton dose @2.5 mm. */
export const PROTON_SEU_COEFF = 4e-7

export interface SeuRates {
  /** Quiet-time upsets/bit/day, unhardened bulk SRAM. */
  quiet: number
  /** Worst-day upsets/bit/day during a large solar particle event. */
  worstDay: number
  gcr: number
  proton: number
}

export function seuRates(input: Omit<MissionInput, 'years'>): SeuRates {
  const alt = clamp(input.altitudeKm, 200, 400000)
  const d = annualDose({ ...input, shieldingMm: 2.5 })
  // Solar modulation: GCR flux is ~40% lower at solar maximum.
  const gcr = GCR_SEU_FREE_SPACE * gcrTransmission(alt, input.inclinationDeg) * (input.solar === 'max' ? 0.6 : 1)
  // Proton SEU is driven by flux of >30 MeV protons, which the reference proton dose tracks.
  const proton = PROTON_SEU_COEFF * d.trappedProton
  const quiet = gcr + proton
  const worstDay = quiet * (1 + 300 * solarExposure(alt, input.inclinationDeg))
  return { quiet, worstDay, gcr, proton }
}

export interface MemoryProtection {
  /** Relative per-bit sensitivity versus bulk CMOS (FD-SOI collects far less charge). */
  bitSensitivity: number
  ecc: boolean
  /** Fraction of upset events that are multi-bit within ONE ECC word. */
  sameWordMbu: number
  /** Scrub interval in seconds (how long latent single errors can accumulate). */
  scrubSeconds: number
  /** ECC word width in bits (64 data + 8 check for SECDED). */
  wordBits: number
}

export const PROTECTION_PRESETS = {
  cots: { bitSensitivity: 1, ecc: false, sameWordMbu: 0, scrubSeconds: 0, wordBits: 72 },
  cotsEcc: { bitSensitivity: 1, ecc: true, sameWordMbu: 0.04, scrubSeconds: 3600, wordBits: 72 },
  halo: { bitSensitivity: 0.05, ecc: true, sameWordMbu: 0.00002, scrubSeconds: 10, wordBits: 72 },
} satisfies Record<string, MemoryProtection>

/**
 * Uncorrectable (data-corrupting) memory errors per day for a memory of `bits` bits.
 *
 * With SECDED, a word fails when (a) a single particle upsets ≥2 bits of the same word, or
 * (b) two independent upsets land in the same word inside one scrub interval:
 *   P_word(T) ≈ C(n,2)·(λT)²   →   failures/day = words · P_word(T) · 86400/T
 */
export function uncorrectablePerDay(ratePerBitDay: number, bits: number, p: MemoryProtection): number {
  const lambda = ratePerBitDay * p.bitSensitivity // upsets/bit/day
  const events = lambda * bits // upsets/day
  if (!p.ecc) return events
  const n = p.wordBits
  const words = bits / n
  const T = p.scrubSeconds
  const lambdaS = lambda / 86400
  const pairs = (n * (n - 1)) / 2
  const accumulation = words * pairs * Math.pow(lambdaS * T, 2) * (86400 / T)
  return events * p.sameWordMbu + accumulation
}

export interface MissionResult {
  dose: DoseBreakdown
  missionDose: number
  rha: ReturnType<typeof requiredRHA>
  haloMargin: number
  haloPasses: boolean
  seu: SeuRates
  memoryBits: number
  upsetsPerDay: number
  cotsErrorsPerDay: number
  cotsEccErrorsPerDay: number
  haloErrorsPerDay: number
  cotsSefiPerDay: number
  haloSefiPerDay: number
  latchup: { cots: string; halo: string }
  regime: string
}

/** Classify an altitude into a human-readable regime. */
export function regimeName(altitudeKm: number): string {
  if (altitudeKm < 1000) return 'Low Earth orbit'
  if (altitudeKm < 2000) return 'High LEO — inner-belt edge'
  if (altitudeKm < 8000) return 'Inner (proton) Van Allen belt'
  if (altitudeKm < 13000) return 'Slot region'
  if (altitudeKm < 30000) return 'Outer (electron) belt / MEO'
  if (altitudeKm < 45000) return 'Geostationary region'
  if (altitudeKm < 70000) return 'High Earth orbit'
  return 'Cislunar / deep space'
}

export function evaluateMission(input: MissionInput): MissionResult {
  const rdm = input.rdm ?? 2
  const memGB = input.memoryGB ?? 4
  const dose = annualDose(input)
  const missionDose = dose.total * input.years
  const rha = requiredRHA(missionDose, rdm)
  const seu = seuRates(input)
  const memoryBits = memGB * 8 * 1024 ** 3
  const upsetsPerDay = seu.quiet * memoryBits
  // Functional interrupts scale with the number of sensitive control/config bits.
  const SEFI_BITS = 3e5
  const cotsSefiPerDay = seu.quiet * SEFI_BITS
  const haloSefiPerDay = cotsSefiPerDay * 0.05 * 0.01 // FD-SOI × TMR'd control
  return {
    dose,
    missionDose,
    rha,
    haloMargin: HALO_TID_KRAD / Math.max(missionDose, 1e-9),
    haloPasses: missionDose * rdm <= HALO_TID_KRAD,
    seu,
    memoryBits,
    upsetsPerDay,
    cotsErrorsPerDay: uncorrectablePerDay(seu.quiet, memoryBits, PROTECTION_PRESETS.cots),
    cotsEccErrorsPerDay: uncorrectablePerDay(seu.quiet, memoryBits, PROTECTION_PRESETS.cotsEcc),
    haloErrorsPerDay: uncorrectablePerDay(seu.quiet, memoryBits, PROTECTION_PRESETS.halo),
    cotsSefiPerDay,
    haloSefiPerDay,
    latchup: {
      cots: 'Possible — bulk CMOS parasitic thyristor; COTS SEL thresholds are often below 40 MeV·cm²/mg',
      halo: 'Immune by construction — buried oxide removes the PNPN path (target: no SEL to LET 80 MeV·cm²/mg @ 125 °C)',
    },
    regime: regimeName(input.altitudeKm),
  }
}

// ---------------------------------------------------------------------------------------
// Thermal
// ---------------------------------------------------------------------------------------

const SIGMA = 5.670374419e-8

/**
 * Radiator area (m²) to reject `watts` at radiator temperature `tC` to deep space, ignoring
 * solar/albedo/Earth-IR loads (a lower bound). In vacuum there is no convection.
 */
export function radiatorAreaM2(watts: number, tC = 60, emissivity = 0.85): number {
  const T = tC + 273.15
  return watts / (emissivity * SIGMA * Math.pow(T, 4))
}

/** Format a number in compact engineering notation (e.g. 3.2e-9 → "3.2×10⁻⁹"). */
export function sci(v: number, digits = 2): string {
  if (!isFinite(v)) return '∞'
  if (v === 0) return '0'
  const abs = Math.abs(v)
  if (abs >= 0.01 && abs < 10000) {
    return v.toLocaleString('en-US', { maximumSignificantDigits: digits + 1 })
  }
  const exp = Math.floor(Math.log10(abs))
  const mant = v / Math.pow(10, exp)
  const sup: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' }
  const e = String(exp).split('').map((c) => sup[c]).join('')
  return `${mant.toFixed(digits - 1)}×10${e}`
}

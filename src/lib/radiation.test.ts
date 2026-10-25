import { describe, expect, it } from 'vitest'
import {
  annualDose,
  evaluateMission,
  requiredRHA,
  seuRates,
  uncorrectablePerDay,
  PROTECTION_PRESETS,
  radiatorAreaM2,
  sci,
} from './radiation'
import { orbitalPeriodMin, eclipseFraction, lShell, equatorialAltitudeKm } from './orbit'
import { evaluateDownlink } from './downlink'

const base = { inclinationDeg: 51.6, shieldingMm: 2.5, solar: 'min' as const }

describe('orbit', () => {
  it('ISS-like orbit period ≈ 92.6 min', () => {
    expect(orbitalPeriodMin(420)).toBeGreaterThan(92)
    expect(orbitalPeriodMin(420)).toBeLessThan(93.5)
  })
  it('GEO period ≈ one sidereal day (1436 min)', () => {
    expect(Math.abs(orbitalPeriodMin(35786) - 1436.1)).toBeLessThan(1.5)
  })
  it('LEO worst-case eclipse ≈ 35–40% of the orbit', () => {
    const f = eclipseFraction(550)
    expect(f).toBeGreaterThan(0.33)
    expect(f).toBeLessThan(0.41)
  })
  it('dipole L-shell round-trips equatorial altitude', () => {
    expect(lShell(2, 0)).toBeCloseTo(2)
    expect(equatorialAltitudeKm(2)).toBeCloseTo(6371)
    expect(lShell(1, Math.PI / 4)).toBeCloseTo(2)
  })
})

describe('total ionising dose', () => {
  it('orders the classic regimes correctly behind 2.5 mm Al', () => {
    const leo = annualDose({ ...base, altitudeKm: 550 }).total
    const sso = annualDose({ ...base, altitudeKm: 800, inclinationDeg: 98 }).total
    const inner = annualDose({ ...base, altitudeKm: 3000 }).total
    const meo = annualDose({ ...base, altitudeKm: 20200, inclinationDeg: 55 }).total
    const geo = annualDose({ ...base, altitudeKm: 35786, inclinationDeg: 0 }).total
    expect(leo).toBeLessThan(sso)
    expect(sso).toBeLessThan(geo)
    expect(geo).toBeLessThan(meo)
    expect(meo).toBeLessThan(inner)
    // Order-of-magnitude anchors
    expect(leo).toBeGreaterThan(0.05)
    expect(leo).toBeLessThan(2)
    expect(geo).toBeGreaterThan(3)
    expect(geo).toBeLessThan(20)
  })
  it('more shielding always lowers dose, electrons fall faster than protons', () => {
    const g1 = annualDose({ ...base, altitudeKm: 35786, shieldingMm: 1 })
    const g2 = annualDose({ ...base, altitudeKm: 35786, shieldingMm: 10 })
    expect(g2.total).toBeLessThan(g1.total)
    expect(g2.trappedElectron / g1.trappedElectron).toBeLessThan(g2.trappedProton / g1.trappedProton)
  })
  it('selects MIL-PRF-38535 RHA designators with margin', () => {
    expect(requiredRHA(1, 2)?.letter).toBe('M')
    expect(requiredRHA(40, 2)?.letter).toBe('R')
    expect(requiredRHA(140, 2)?.letter).toBe('F')
    expect(requiredRHA(800, 2)).toBeNull()
  })
})

describe('single-event effects', () => {
  it('solar particle events raise worst-day GEO rates by >100×', () => {
    const r = seuRates({ ...base, altitudeKm: 35786, inclinationDeg: 0 })
    expect(r.worstDay / r.quiet).toBeGreaterThan(100)
  })
  it('the inner belt is far harsher than LEO', () => {
    expect(seuRates({ ...base, altitudeKm: 3000 }).quiet).toBeGreaterThan(seuRates({ ...base, altitudeKm: 550 }).quiet * 100)
  })
  it('protection ladder: none > SECDED > HALO', () => {
    const rate = 1e-7
    const bits = 32e9
    const a = uncorrectablePerDay(rate, bits, PROTECTION_PRESETS.cots)
    const b = uncorrectablePerDay(rate, bits, PROTECTION_PRESETS.cotsEcc)
    const c = uncorrectablePerDay(rate, bits, PROTECTION_PRESETS.halo)
    expect(a).toBeGreaterThan(b)
    expect(b).toBeGreaterThan(c * 1000)
  })
  it('evaluates a full mission', () => {
    const m = evaluateMission({ ...base, altitudeKm: 550, years: 5 })
    expect(m.haloPasses).toBe(true)
    expect(m.missionDose).toBeGreaterThan(0)
    expect(m.cotsErrorsPerDay).toBeGreaterThan(m.haloErrorsPerDay)
  })
})

describe('thermal & formatting', () => {
  it('18 W at 60 °C needs roughly 0.03 m² of radiator', () => {
    const a = radiatorAreaM2(18, 60, 0.85)
    expect(a).toBeGreaterThan(0.025)
    expect(a).toBeLessThan(0.035)
  })
  it('formats scientific notation', () => {
    expect(sci(3.2e-9)).toBe('3.2×10⁻⁹')
    expect(sci(12.5)).toBe('12.5')
  })
})

describe('downlink', () => {
  it('onboard triage multiplies delivered insight when the link is saturated', () => {
    const r = evaluateDownlink({
      altitudeKm: 550,
      sensorGbps: 2,
      imagingMinPerOrbit: 20,
      groundContactsPerDay: 6,
      contactMinutes: 8,
      downlinkMbps: 800,
      cloudFraction: 0.67,
      keepFraction: 0.3,
    })
    expect(r.generatedGB).toBeGreaterThan(r.capacityGB)
    expect(r.insightMultiplier).toBeGreaterThan(3)
    expect(r.ai.usefulShare).toBeGreaterThan(r.raw.usefulShare)
  })
})

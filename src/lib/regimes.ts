export type RegimeKey = 'ground' | 'leo' | 'saa' | 'inner' | 'slot' | 'outer' | 'geo' | 'deep' | 'storm'

export interface Regime {
  key: RegimeKey
  label: string
  short: string
  altKm: number
  /** Demo strike rate for the page-level simulation (strikes / second, visually scaled). */
  flux: number
  note: string
}

export const REGIMES: Record<RegimeKey, Regime> = {
  ground: { key: 'ground', label: 'Launch pad', short: 'GND', altKm: 0, flux: 0.12, note: 'The atmosphere stops primaries; only secondary neutrons reach the ground.' },
  leo: { key: 'leo', label: 'LEO · 550 km', short: 'LEO', altKm: 550, flux: 0.55, note: 'Galactic cosmic rays, partially screened by the geomagnetic field.' },
  saa: { key: 'saa', label: 'South Atlantic Anomaly', short: 'SAA', altKm: 550, flux: 2.4, note: 'The inner belt dips to LEO altitudes over Brazil: most LEO upsets happen here.' },
  inner: { key: 'inner', label: 'Inner belt · 3,000 km', short: 'P⁺', altKm: 3000, flux: 3.0, note: 'Trapped protons of 10–400 MeV. Satellites avoid parking here.' },
  slot: { key: 'slot', label: 'Slot · 10,000 km', short: 'SLOT', altKm: 10000, flux: 0.9, note: 'A relatively quiet gap between the two belts, L ≈ 2–3.' },
  outer: { key: 'outer', label: 'MEO · 20,200 km', short: 'e⁻', altKm: 20200, flux: 2.2, note: 'Outer-belt electrons: GNSS constellations fly through them every orbit.' },
  geo: { key: 'geo', label: 'GEO · 35,786 km', short: 'GEO', altKm: 35786, flux: 1.3, note: 'Outer edge of the electron belt; almost no geomagnetic shielding from solar protons.' },
  deep: { key: 'deep', label: 'Cislunar · 384,400 km', short: 'MOON', altKm: 384400, flux: 1.6, note: 'Outside the magnetosphere: unscreened cosmic rays and solar storms.' },
  storm: { key: 'storm', label: 'Solar particle event', short: 'SPE', altKm: 35786, flux: 6, note: 'A coronal mass ejection drives proton flux up by orders of magnitude for hours to days.' },
}

export const RAIL_ORDER: RegimeKey[] = ['ground', 'leo', 'saa', 'inner', 'slot', 'outer', 'geo', 'deep']

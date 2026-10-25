// Orbital mechanics helpers (two-body, circular orbits).

export const EARTH_RADIUS_KM = 6371
export const MU_EARTH = 398600.4418 // km^3/s^2
export const GEO_ALT_KM = 35786

/** Orbital period in minutes for a circular orbit at the given altitude. */
export function orbitalPeriodMin(altitudeKm: number): number {
  const a = EARTH_RADIUS_KM + altitudeKm
  return (2 * Math.PI * Math.sqrt((a * a * a) / MU_EARTH)) / 60
}

/** Orbital velocity in km/s for a circular orbit. */
export function orbitalVelocityKms(altitudeKm: number): number {
  return Math.sqrt(MU_EARTH / (EARTH_RADIUS_KM + altitudeKm))
}

/**
 * Worst-case (beta = 0) eclipse fraction for a circular orbit, cylindrical shadow model.
 * f = asin(Re / (Re + h)) / pi
 */
export function eclipseFraction(altitudeKm: number): number {
  return Math.asin(EARTH_RADIUS_KM / (EARTH_RADIUS_KM + altitudeKm)) / Math.PI
}

/** Distance from Earth's centre in Earth radii. */
export function radiusRe(altitudeKm: number): number {
  return (EARTH_RADIUS_KM + altitudeKm) / EARTH_RADIUS_KM
}

/**
 * McIlwain L-shell of a point in a centred dipole field.
 * Field line equation: r = L cos^2(lambda), lambda = magnetic latitude.
 */
export function lShell(rRe: number, magLatRad: number): number {
  const c = Math.cos(magLatRad)
  return rRe / (c * c)
}

/** Altitude (km) where a dipole field line of shell L crosses the magnetic equator. */
export function equatorialAltitudeKm(L: number): number {
  return (L - 1) * EARTH_RADIUS_KM
}

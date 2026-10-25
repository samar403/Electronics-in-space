import { orbitalPeriodMin } from './orbit'

export interface DownlinkInput {
  altitudeKm: number
  /** Sensor output while imaging, Gbit/s. */
  sensorGbps: number
  /** Minutes of imaging per orbit. */
  imagingMinPerOrbit: number
  groundContactsPerDay: number
  contactMinutes: number
  /** Space-to-ground link rate, Mbit/s (X-band is typically hundreds of Mbit/s). */
  downlinkMbps: number
  /** Fraction of scenes that are cloudy, 0–1. Global mean cloud cover is ~0.67. */
  cloudFraction: number
  /** Of the clear scenes, the fraction an onboard model flags as worth sending, 0–1. */
  keepFraction: number
}

export interface DownlinkResult {
  orbitsPerDay: number
  generatedGB: number
  capacityGB: number
  /** Without onboard AI. */
  raw: { sentGB: number; usefulGB: number; backlogGBPerDay: number; usefulShare: number }
  /** With onboard AI triage. */
  ai: { queuedGB: number; sentGB: number; usefulGB: number; backlogGBPerDay: number; usefulShare: number }
  /** Mean wait for the next ground pass, minutes (store-and-forward). */
  storeForwardLatencyMin: number
  /** Assumed latency for an onboard-generated alert over a low-rate relay, minutes. */
  alertLatencyMin: number
  insightMultiplier: number
}

export function evaluateDownlink(d: DownlinkInput): DownlinkResult {
  const period = orbitalPeriodMin(d.altitudeKm)
  const orbitsPerDay = (24 * 60) / period
  const generatedGB = (d.sensorGbps * d.imagingMinPerOrbit * 60 * orbitsPerDay) / 8
  const capacityGB = (d.downlinkMbps * d.contactMinutes * 60 * d.groundContactsPerDay) / 8 / 1000
  const clear = 1 - d.cloudFraction

  const rawSent = Math.min(generatedGB, capacityGB)
  // Without triage the satellite cannot tell clear from cloudy, so what it sends is a
  // representative sample of everything it captured.
  const rawUseful = rawSent * clear * d.keepFraction
  const aiQueued = generatedGB * clear * d.keepFraction
  const aiSent = Math.min(aiQueued, capacityGB)

  const usefulAvailable = generatedGB * clear * d.keepFraction
  return {
    orbitsPerDay,
    generatedGB,
    capacityGB,
    raw: {
      sentGB: rawSent,
      usefulGB: rawUseful,
      backlogGBPerDay: Math.max(0, generatedGB - capacityGB),
      usefulShare: usefulAvailable > 0 ? rawUseful / usefulAvailable : 0,
    },
    ai: {
      queuedGB: aiQueued,
      sentGB: aiSent,
      usefulGB: aiSent,
      backlogGBPerDay: Math.max(0, aiQueued - capacityGB),
      usefulShare: usefulAvailable > 0 ? aiSent / usefulAvailable : 0,
    },
    storeForwardLatencyMin: d.groundContactsPerDay > 0 ? (24 * 60) / d.groundContactsPerDay / 2 : Infinity,
    alertLatencyMin: 5,
    insightMultiplier: rawUseful > 0 ? aiSent / rawUseful : Infinity,
  }
}

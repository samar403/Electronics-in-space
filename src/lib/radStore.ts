import { useSyncExternalStore } from 'react'
import { REGIMES, type RegimeKey } from './regimes'

export type SiliconMode = 'cots' | 'halo'

export interface Stats {
  strikes: number
  upsets: number
  corrected: number
  deflected: number
  latchups: number
}

export interface RadState {
  mode: SiliconMode
  pinned: RegimeKey | 'auto'
  scrollRegime: RegimeKey
  paused: boolean
  sound: boolean
  stats: Stats
  latched: string | null
  /** Incremented on each strike so subscribers can blink LEDs. */
  pulse: number
}

const reducedMotion =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

let state: RadState = {
  mode: 'cots',
  pinned: 'auto',
  scrollRegime: 'ground',
  paused: false,
  sound: false,
  stats: { strikes: 0, upsets: 0, corrected: 0, deflected: 0, latchups: 0 },
  latched: null,
  pulse: 0,
}

const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function setRad(patch: Partial<RadState> | ((s: RadState) => Partial<RadState>)) {
  const p = typeof patch === 'function' ? patch(state) : patch
  state = { ...state, ...p }
  emit()
}

export const getRad = () => state

export function useRad<T>(selector: (s: RadState) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => selector(state),
    () => selector(state),
  )
}

export function effectiveRegime(s: RadState = state): RegimeKey {
  return s.pinned === 'auto' ? s.scrollRegime : s.pinned
}

// ---------------------------------------------------------------------------------------
// Strike targets (text that can bit-flip) and strike visualisation listeners
// ---------------------------------------------------------------------------------------

export interface StrikeTarget {
  visible: boolean
  hit(halo: boolean): void
  scrub(): void
}

const targets = new Map<string, StrikeTarget>()
export function registerTarget(id: string, t: StrikeTarget) {
  targets.set(id, t)
  return () => {
    targets.delete(id)
  }
}

export type StrikeKind = 'flip' | 'deflect' | 'correct'
type StrikeListener = (x: number, y: number, kind: StrikeKind) => void
const strikeListeners = new Set<StrikeListener>()
export function onStrike(l: StrikeListener) {
  strikeListeners.add(l)
  return () => {
    strikeListeners.delete(l)
  }
}
export function emitStrike(x: number, y: number, kind: StrikeKind) {
  strikeListeners.forEach((l) => l(x, y, kind))
}

const latchables = new Map<string, () => boolean>()
export function registerLatchable(id: string, isVisible: () => boolean) {
  latchables.set(id, isVisible)
  return () => {
    latchables.delete(id)
  }
}

export function countStat(key: keyof Stats, n = 1) {
  state = { ...state, stats: { ...state.stats, [key]: state.stats[key] + n } }
  emit()
}

export function setMode(mode: SiliconMode) {
  if (mode === state.mode) return
  setRad({ mode, latched: mode === 'halo' ? null : state.latched })
  if (mode === 'halo') targets.forEach((t) => t.scrub())
}

export function powerCycle() {
  targets.forEach((t) => t.scrub())
  setRad({ latched: null })
}

// ---------------------------------------------------------------------------------------
// Geiger click (WebAudio, opt-in)
// ---------------------------------------------------------------------------------------

let audio: AudioContext | null = null
function click(kind: StrikeKind) {
  if (!state.sound) return
  try {
    audio ??= new AudioContext()
    const t = audio.currentTime
    const len = Math.floor(audio.sampleRate * 0.004)
    const buf = audio.createBuffer(1, len, audio.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3)
    const src = audio.createBufferSource()
    src.buffer = buf
    const g = audio.createGain()
    g.gain.value = kind === 'flip' ? 0.5 : 0.25
    src.connect(g).connect(audio.destination)
    src.start(t)
  } catch {
    /* audio unavailable */
  }
}

// ---------------------------------------------------------------------------------------
// Engine: Poisson strikes at the current regime's flux
// ---------------------------------------------------------------------------------------

let started = false
export function startEngine() {
  if (started || typeof window === 'undefined') return
  started = true
  const dt = 0.1
  window.setInterval(() => {
    if (state.paused || document.hidden) return
    const flux = REGIMES[effectiveRegime()].flux * (reducedMotion ? 0.35 : 1)
    // Poisson: number of strikes in dt
    let k = 0
    const L = Math.exp(-flux * dt)
    let p = Math.random()
    while (p > L && k < 6) {
      k++
      p *= Math.random()
    }
    for (let i = 0; i < k; i++) strike()
  }, dt * 1000)
}

function strike() {
  const visible = [...targets.values()].filter((t) => t.visible)
  state = { ...state, pulse: state.pulse + 1, stats: { ...state.stats, strikes: state.stats.strikes + 1 } }
  emit()
  if (!visible.length) return
  const halo = state.mode === 'halo'
  visible[Math.floor(Math.random() * visible.length)].hit(halo)

  // Single-event latch-up: possible in bulk CMOS, removed by SOI's buried oxide.
  if (!halo && !state.latched && Math.random() < 0.007) {
    const ids = [...latchables.entries()].filter(([, v]) => v()).map(([id]) => id)
    if (ids.length) {
      const id = ids[Math.floor(Math.random() * ids.length)]
      state = { ...state, latched: id, stats: { ...state.stats, latchups: state.stats.latchups + 1 } }
      emit()
    }
  }
}

export function notifyStrike(x: number, y: number, kind: StrikeKind) {
  emitStrike(x, y, kind)
  click(kind)
}

export const prefersReducedMotion = !!reducedMotion

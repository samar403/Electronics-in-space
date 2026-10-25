import { useEffect, useRef, useState } from 'react'
import { prefersReducedMotion } from '../lib/radStore'
import { F } from './FlipText'
import { Section } from './Section'

const COLS = 32
const ROWS = 16
const WORD = 8 // visual stand-in for a 64+8 ECC word
const INTERLEAVE = 4

type Env = 'leo' | 'saa' | 'storm'
const ENV: Record<Env, { label: string; rate: number }> = {
  leo: { label: 'Quiet LEO', rate: 1.2 },
  saa: { label: 'SAA pass', rate: 5 },
  storm: { label: 'Solar storm', rate: 14 },
}

const LABELS = ['vessel', 'aircraft', 'wildfire', 'flood edge', 'cloud', 'clear land']

interface Side {
  cells: Uint8Array // 0 ok, 1 upset (latent/uncorrected), 2 just corrected (flash), 3 hardened deflect (flash), 4 uncorrectable
  flash: Float32Array
  strikes: number
  upsets: number
  corrected: number
  due: number
  sdc: number
  frames: number
  goodFrames: number
  sefiUntil: number
  log: { t: string; bad: boolean }[]
}

const mkSide = (): Side => ({
  cells: new Uint8Array(COLS * ROWS),
  flash: new Float32Array(COLS * ROWS),
  strikes: 0,
  upsets: 0,
  corrected: 0,
  due: 0,
  sdc: 0,
  frames: 0,
  goodFrames: 0,
  sefiUntil: 0,
  log: [],
})

/** Which logical ECC word a physical cell belongs to. */
const wordOf = (halo: boolean, r: number, c: number) =>
  halo ? r * (COLS / WORD) + (c % INTERLEAVE) + Math.floor(c / (WORD * INTERLEAVE)) * INTERLEAVE : r * (COLS / WORD) + Math.floor(c / WORD)

export function BitArena() {
  const [env, setEnv] = useState<Env>('saa')
  const [running, setRunning] = useState(!prefersReducedMotion)
  const [, force] = useState(0)
  const cots = useRef(mkSide())
  const halo = useRef(mkSide())
  const cvC = useRef<HTMLCanvasElement>(null)
  const cvH = useRef<HTMLCanvasElement>(null)
  const scrubRow = useRef(0)
  const envRef = useRef(env)
  envRef.current = env

  const reset = () => {
    cots.current = mkSide()
    halo.current = mkSide()
    force((n) => n + 1)
  }

  useEffect(() => {
    if (!running) return
    let raf = 0
    let last = performance.now()
    let frameClock = 0
    let uiClock = 0

    const strike = (now: number) => {
      const r = Math.floor(Math.random() * ROWS)
      const c = Math.floor(Math.random() * COLS)
      // ~20% of tracks at this node upset 2–3 neighbouring cells in a row.
      const span = Math.random() < 0.2 ? 2 + Math.floor(Math.random() * 2) : 1
      const sefi = Math.random() < 0.012

      // COTS: every hit upsets, no ECC, no scrub.
      const C = cots.current
      C.strikes++
      if (now > C.sefiUntil) {
        for (let k = 0; k < span && c + k < COLS; k++) {
          const i = r * COLS + c + k
          if (C.cells[i] !== 1) {
            C.cells[i] = 1
            C.upsets++
          }
          C.flash[i] = 1
        }
        if (sefi) {
          C.sefiUntil = now + 3200
          C.cells.fill(0) // the reboot reloads memory: errors clear, but so does availability
          C.log.unshift({ t: 'SEFI — controller hung · rebooting (90 s in flight)', bad: true })
        }
      }

      // HALO: hardened cells resist most hits; the rest become latent, correctable errors.
      const H = halo.current
      H.strikes++
      for (let k = 0; k < span && c + k < COLS; k++) {
        const i = r * COLS + c + k
        H.flash[i] = 1
        if (Math.random() < 0.75) {
          if (H.cells[i] === 0) H.cells[i] = 3
          continue
        }
        if (H.cells[i] === 1 || H.cells[i] === 4) continue
        // Uncorrectable only if another latent error already sits in the same word.
        const w = wordOf(true, r, c + k)
        let clash = false
        for (let cc = 0; cc < COLS; cc++) if (cc !== c + k && wordOf(true, r, cc) === w && H.cells[r * COLS + cc] === 1) clash = true
        H.cells[i] = clash ? 4 : 1
        H.upsets++
        if (clash) {
          H.due++
          H.log.unshift({ t: 'DUE detected by SECDED → word reloaded from flash', bad: false })
        }
      }
    }

    const scrub = () => {
      // HALO background scrubber sweeps one row per tick.
      const H = halo.current
      const r = scrubRow.current
      for (let c = 0; c < COLS; c++) {
        const i = r * COLS + c
        if (H.cells[i] === 1 || H.cells[i] === 4) {
          H.cells[i] = 2
          H.flash[i] = 1
          H.corrected++
        }
      }
      scrubRow.current = (r + 1) % ROWS
    }

    const inference = () => {
      const label = LABELS[Math.floor(Math.random() * LABELS.length)]
      const conf = (0.86 + Math.random() * 0.13).toFixed(2)
      const C = cots.current
      const H = halo.current
      const now = performance.now()
      C.frames++
      H.frames++
      if (now < C.sefiUntil) {
        C.log.unshift({ t: `frame ${C.frames} — no output (rebooting)`, bad: true })
      } else {
        let bad = 0
        for (const v of C.cells) if (v === 1) bad++
        const pSdc = 1 - Math.exp(-bad / 40)
        if (Math.random() < pSdc) {
          const wrong = LABELS[(LABELS.indexOf(label) + 1 + Math.floor(Math.random() * 4)) % LABELS.length]
          C.sdc++
          C.log.unshift({ t: `frame ${C.frames} → ${wrong} ${(0.9 + Math.random() * 0.09).toFixed(2)}  ✖ silent corruption`, bad: true })
        } else {
          C.goodFrames++
          C.log.unshift({ t: `frame ${C.frames} → ${label} ${conf}`, bad: false })
        }
      }
      H.goodFrames++
      H.log.unshift({ t: `frame ${H.frames} → ${label} ${conf}  ✓ ABFT ok`, bad: false })
      C.log.length = Math.min(C.log.length, 6)
      H.log.length = Math.min(H.log.length, 6)
    }

    const drawSide = (cv: HTMLCanvasElement | null, s: Side, isHalo: boolean, dt: number, now: number) => {
      if (!cv) return
      const ctx = cv.getContext('2d')!
      const dpr = Math.min(devicePixelRatio || 1, 2)
      const w = cv.clientWidth
      const h = cv.clientHeight
      if (cv.width !== Math.floor(w * dpr)) {
        cv.width = Math.floor(w * dpr)
        cv.height = Math.floor(h * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      const cw = w / COLS
      const ch = h / ROWS
      const frozen = !isHalo && now < s.sefiUntil
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const i = r * COLS + c
          const v = s.cells[i]
          const word = wordOf(isHalo, r, c) % 4
          const base = [0.05, 0.08, 0.11, 0.14][word]
          let fill = `rgba(160,190,215,${base})`
          if (v === 1) fill = isHalo ? 'rgba(255,181,71,.85)' : 'rgba(255,77,94,.9)'
          if (v === 4) fill = 'rgba(255,77,94,.9)'
          if (v === 2) fill = `rgba(70,217,255,${0.25 + s.flash[i] * 0.7})`
          if (v === 3) fill = `rgba(70,217,255,${0.08 + s.flash[i] * 0.4})`
          ctx.fillStyle = fill
          ctx.fillRect(c * cw + 1, r * ch + 1, cw - 2, ch - 2)
          if (s.flash[i] > 0) {
            ctx.strokeStyle = `rgba(255,255,255,${s.flash[i] * 0.8})`
            ctx.strokeRect(c * cw + 0.5, r * ch + 0.5, cw - 1, ch - 1)
            s.flash[i] = Math.max(0, s.flash[i] - dt * 2.2)
            if (s.flash[i] === 0 && (v === 2 || v === 3)) s.cells[i] = 0
          }
        }
      }
      if (isHalo) {
        const y = scrubRow.current * ch
        ctx.fillStyle = 'rgba(70,217,255,.12)'
        ctx.fillRect(0, y, w, ch)
        ctx.fillStyle = 'rgba(70,217,255,.9)'
        ctx.fillRect(0, y, 3, ch)
      }
      if (frozen) {
        ctx.fillStyle = 'rgba(5,7,10,.72)'
        ctx.fillRect(0, 0, w, h)
        ctx.fillStyle = '#ff4d5e'
        ctx.font = '600 13px "JetBrains Mono", monospace'
        ctx.textAlign = 'center'
        ctx.fillText('SEFI · DEVICE HUNG · REBOOTING', w / 2, h / 2)
      }
    }

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const rate = ENV[envRef.current].rate
      let p = rate * dt
      while (p > 0) {
        if (Math.random() < Math.min(1, p)) strike(now)
        p -= 1
      }
      frameClock += dt
      uiClock += dt
      if (frameClock > 0.14) {
        scrub()
        frameClock = 0
      }
      if (uiClock > 0.9) {
        inference()
        uiClock = 0
        force((n) => n + 1)
      }
      drawSide(cvC.current, cots.current, false, dt, now)
      drawSide(cvH.current, halo.current, true, dt, now)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [running])

  const sides = [
    { key: 'cots', name: 'COTS accelerator', sub: 'bulk CMOS · no ECC · no scrub', s: cots.current, ref: cvC },
    { key: 'halo', name: 'HALO-7', sub: 'FD-SOI · SECDED · 4-way interleave · scrub', s: halo.current, ref: cvH },
  ] as const

  return (
    <Section
      id="arena"
      regime="saa"
      index="03"
      kicker="Bit Arena · live fault injection"
      title="Same particles. Two chips."
      lede="Both memories below take the same strikes at the same cells at the same moment. On the left, every upset stays and slowly poisons the model's output. On the right, hardened cells resist, interleaving splits multi-cell hits across ECC words, and a scrubber sweeps the array before errors can pair up."
    >
      <div className="arena">
        <div className="arena__controls">
          <div className="seg" role="radiogroup" aria-label="Radiation environment">
            {(Object.keys(ENV) as Env[]).map((k) => (
              <button key={k} role="radio" aria-checked={env === k} className={env === k ? 'is-on' : ''} onClick={() => setEnv(k)}>
                {ENV[k].label}
              </button>
            ))}
          </div>
          <div className="arena__btns">
            <button className="chip" onClick={() => setRunning((r) => !r)} aria-pressed={!running}>
              {running ? '❚❚ Pause beam' : '▶ Start beam'}
            </button>
            <button className="chip" onClick={reset}>
              ↺ Reset
            </button>
          </div>
        </div>

        <div className="arena__grid">
          {sides.map(({ key, name, sub, s, ref }) => {
            const uptime = s.frames ? (s.goodFrames / s.frames) * 100 : 100
            return (
              <div key={key} className={`arena__side arena__side--${key}`}>
                <div className="arena__title">
                  <h3>
                    <F>{name}</F>
                  </h3>
                  <span>{sub}</span>
                </div>
                <canvas ref={ref} className="arena__cv" role="img" aria-label={`${name} memory array: ${s.upsets} upsets, ${s.corrected} corrected`} />
                <dl className="arena__stats">
                  <div>
                    <dt>Strikes</dt>
                    <dd>{s.strikes}</dd>
                  </div>
                  <div>
                    <dt>Upsets</dt>
                    <dd>{s.upsets}</dd>
                  </div>
                  <div>
                    <dt>Corrected</dt>
                    <dd className="t-halo">{s.corrected}</dd>
                  </div>
                  <div>
                    <dt>Silent errors</dt>
                    <dd className={s.sdc ? 't-flip' : ''}>{s.sdc}</dd>
                  </div>
                  <div>
                    <dt>Correct outputs</dt>
                    <dd>{uptime.toFixed(1)}%</dd>
                  </div>
                </dl>
                <ol className="arena__log" aria-label={`${name} inference log`}>
                  {s.log.map((l, i) => (
                    <li key={s.frames + '-' + i} className={l.bad ? 'is-bad' : ''}>
                      {l.t}
                    </li>
                  ))}
                </ol>
              </div>
            )
          })}
        </div>
        <ul className="legend">
          <li>
            <i style={{ background: 'rgba(255,77,94,.9)' }} /> uncorrected upset
          </li>
          <li>
            <i style={{ background: 'rgba(255,181,71,.85)' }} /> latent, correctable
          </li>
          <li>
            <i style={{ background: 'rgba(70,217,255,.8)' }} /> corrected / hardened
          </li>
          <li>
            <i style={{ background: 'rgba(160,190,215,.2)' }} /> shade = ECC word (note the interleave on HALO)
          </li>
        </ul>
      </div>
    </Section>
  )
}

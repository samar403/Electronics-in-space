import { createElement, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { countStat, notifyStrike, registerTarget } from '../lib/radStore'

type Corruption = { ch: string; bit: number; state: 'bad' | 'fixing' | 'fixed' }

/** Flip one random bit of a printable ASCII character, staying printable. */
export function flipChar(c: string): { ch: string; bit: number } | null {
  const code = c.charCodeAt(0)
  if (code < 33 || code > 126) return null
  const bits = [0, 1, 2, 3, 4, 5].sort(() => Math.random() - 0.5)
  for (const b of bits) {
    const n = code ^ (1 << b)
    if (n >= 33 && n <= 126) return { ch: String.fromCharCode(n), bit: b }
  }
  return null
}

const hex = (c: string) => '0x' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')

interface Props {
  children: string
  as?: keyof JSX.IntrinsicElements
  className?: string
}

/**
 * Text that participates in the page-wide radiation simulation. On COTS silicon a strike
 * flips one bit of one character and it stays wrong; on HALO the error is corrected by ECC.
 * Screen readers always receive the original text.
 */
export function F({ children, as = 'span', className }: Props) {
  const text = children
  const id = useId()
  const ref = useRef<HTMLElement>(null)
  const [errs, setErrs] = useState<Record<number, Corruption>>({})
  const errsRef = useRef(errs)
  errsRef.current = errs
  const visibleRef = useRef(false)
  const timers = useRef<number[]>([])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => (visibleRef.current = e.isIntersecting), { threshold: 0.2 })
    io.observe(el)

    const locate = (idx: number, kind: 'flip' | 'deflect' | 'correct') => {
      requestAnimationFrame(() => {
        const span = el.querySelector<HTMLElement>(`[data-i="${idx}"]`)
        const r = (span ?? el).getBoundingClientRect()
        const x = span ? r.left + r.width / 2 : r.left + Math.random() * r.width
        notifyStrike(x, r.top + r.height / 2, kind)
      })
    }

    const unregister = registerTarget(id, {
      get visible() {
        return visibleRef.current
      },
      hit(halo) {
        const candidates: number[] = []
        for (let i = 0; i < text.length; i++) if (text[i].trim() && !errsRef.current[i]) candidates.push(i)
        // Keep text legible: cap simultaneous corruption at ~12% of characters.
        const cap = Math.max(1, Math.min(8, Math.round(text.replace(/\s/g, '').length * 0.12)))
        if (!candidates.length || Object.keys(errsRef.current).length >= cap) return
        const idx = candidates[Math.floor(Math.random() * candidates.length)]
        // HALO: hardened cells shrug off most strikes outright.
        if (halo && Math.random() < 0.7) {
          countStat('deflected')
          locate(idx, 'deflect')
          return
        }
        const f = flipChar(text[idx])
        if (!f) return
        countStat('upsets')
        setErrs((e) => ({ ...e, [idx]: { ...f, state: 'bad' } }))
        locate(idx, halo ? 'correct' : 'flip')
        if (halo) {
          timers.current.push(
            window.setTimeout(() => {
              setErrs((e) => (e[idx] ? { ...e, [idx]: { ...e[idx], state: 'fixing' } } : e))
              countStat('corrected')
            }, 380 + Math.random() * 300),
            window.setTimeout(() => setErrs(({ [idx]: _, ...rest }) => rest), 1500),
          )
        } else {
          // Watchdog eventually reboots and reloads the text.
          timers.current.push(window.setTimeout(() => setErrs(({ [idx]: _, ...rest }) => rest), 16000))
        }
      },
      scrub() {
        const keys = Object.keys(errsRef.current)
        if (!keys.length) return
        countStat('corrected', keys.filter((k) => errsRef.current[+k].state === 'bad').length)
        setErrs((e) => {
          const n: Record<number, Corruption> = {}
          for (const k of Object.keys(e)) n[+k] = { ...e[+k], state: 'fixing' }
          return n
        })
        timers.current.push(window.setTimeout(() => setErrs({}), 900))
      },
    })
    return () => {
      io.disconnect()
      unregister()
      timers.current.forEach(clearTimeout)
    }
  }, [id, text])

  const keys = Object.keys(errs)
    .map(Number)
    .sort((a, b) => a - b)

  let body: ReactNode = text
  if (keys.length) {
    const parts: ReactNode[] = []
    let last = 0
    for (const i of keys) {
      if (i > last) parts.push(text.slice(last, i))
      const c = errs[i]
      const shown = c.state === 'bad' ? c.ch : text[i]
      parts.push(
        <span
          key={i}
          data-i={i}
          className={`bitflip bitflip--${c.state}`}
          title={`bit ${c.bit} flipped: '${text[i]}' ${hex(text[i])} → '${c.ch}' ${hex(c.ch)}`}
        >
          {shown}
        </span>,
      )
      last = i + 1
    }
    if (last < text.length) parts.push(text.slice(last))
    body = (
      <>
        <span aria-hidden="true">{parts}</span>
        <span className="sr-only">{text}</span>
      </>
    )
  }

  return createElement(as, { ref, className }, body)
}

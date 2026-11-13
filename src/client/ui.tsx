/**
 * Small controls copied from dsh's ui-primitives (Button, StateDot, Tooltip; dsh 0.2.2, MIT) under the plugin's
 * `dco-` prefix, so the plugin depends on theme tokens only and not on a Harness client package.
 */
import { cloneElement, forwardRef, useCallback, useEffect, useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type FocusEvent,
  type PointerEvent, type ReactElement, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export type DotState = 'done' | 'warning' | 'ongoing' | 'error' | 'idle'

/** dsh's StateDot: a 10px slot with a 6px core, or the 14px breathing spinner for ongoing work. Decorative. */
export function StateDot({ state }: { state: DotState }) {
  if (state === 'ongoing') {
    return <svg className="dco-spinner" data-state="ongoing" width={14} height={14} viewBox="0 0 24 24" aria-hidden="true">
      <g className="dco-spinner-motion">
        <circle className="dco-spinner-track" cx="12" cy="12" r="9.5" />
        <circle className="dco-spinner-arc" cx="12" cy="12" r="9.5" />
      </g>
    </svg>
  }
  return <span className="dco-dot" data-state={state} aria-hidden="true" />
}

type ButtonProps = {
  variant?: 'primary' | 'ghost' | 'outline'
  size?: 'md' | 'sm' | 'head'
  icon?: ReactNode
} & ButtonHTMLAttributes<HTMLButtonElement>

/** dsh's Button: 36px (`md`), 28px (`sm`), or the 32px page-heading capsule (`head`). */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({
  variant = 'ghost', size = 'md', icon, className, children, ...rest
}, ref) {
  const classes = ['dco-btn', `dco-btn-${variant}`, size === 'md' ? '' : `dco-btn-${size}`, className ?? ''].filter(Boolean).join(' ')
  return <button ref={ref} type="button" className={classes} {...rest}>
    {icon != null && <span className="dco-btn-icon">{icon}</span>}
    {children}
  </button>
})

type AnchorProps = {
  onPointerEnter?: (event: PointerEvent<HTMLElement>) => void
  onPointerLeave?: (event: PointerEvent<HTMLElement>) => void
  onFocus?: (event: FocusEvent<HTMLElement>) => void
  onBlur?: (event: FocusEvent<HTMLElement>) => void
  onClick?: (event: never) => void
}

/**
 * dsh's Tooltip, reduced: a bubble below the anchor on mouse hover or keyboard focus, portaled to the body so the
 * header's clipping cannot cut it, and kept inside the viewport with a 12px margin. Touch never opens it (an action
 * name is auxiliary on phones); Escape closes it. `delay` (ms) holds a hover-opened bubble back, for dense lists.
 */
export function Tooltip({ label, delay = 0, children }: { label: string; delay?: number; children: ReactElement<AnchorProps> }) {
  const [at, setAt] = useState<{ x: number; y: number; end: boolean } | undefined>(undefined)
  const bubble = useRef<HTMLSpanElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const show = useCallback((anchor: HTMLElement) => {
    const rect = anchor.getBoundingClientRect()
    const end = rect.left + rect.width / 2 > window.innerWidth - 160
    setAt({ x: end ? rect.right : rect.left + rect.width / 2, y: rect.bottom + 8, end })
  }, [])
  const hide = useCallback(() => { clearTimeout(timer.current); setAt(undefined) }, [])
  useEffect(() => () => { clearTimeout(timer.current) }, [])
  useLayoutEffect(() => {
    const node = bubble.current
    if (at === undefined || node === null) return
    const rect = node.getBoundingClientRect()
    const shift = rect.left < 12 ? 12 - rect.left : rect.right > window.innerWidth - 12 ? window.innerWidth - 12 - rect.right : 0
    if (shift !== 0) node.style.marginLeft = `${shift}px`
  }, [at])
  useEffect(() => {
    if (at === undefined) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') hide() }
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', hide, true)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('scroll', hide, true) }
  }, [at, hide])
  const own = children.props
  const anchor = cloneElement(children, {
    onPointerEnter: (event: PointerEvent<HTMLElement>) => {
      own.onPointerEnter?.(event)
      if (event.pointerType === 'touch') return
      const target = event.currentTarget
      clearTimeout(timer.current)
      if (delay > 0) timer.current = setTimeout(() => { show(target) }, delay)
      else show(target)
    },
    onPointerLeave: (event: PointerEvent<HTMLElement>) => { own.onPointerLeave?.(event); hide() },
    onFocus: (event: FocusEvent<HTMLElement>) => { own.onFocus?.(event); if (event.currentTarget.matches(':focus-visible')) show(event.currentTarget) },
    onBlur: (event: FocusEvent<HTMLElement>) => { own.onBlur?.(event); hide() },
    onClick: (event: never) => { hide(); own.onClick?.(event) },
  })
  return <>
    {anchor}
    {at !== undefined && createPortal(<span ref={bubble} className="dco-tooltip" role="tooltip" data-align={at.end ? 'end' : undefined}
      style={{ left: at.x, top: at.y }}>{label}</span>, document.body)}
  </>
}

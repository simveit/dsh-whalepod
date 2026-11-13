/**
 * A coordinator's identity wherever it is shown: a small monogram tile in a calm tone derived from its name (dsh
 * theme tokens only, see styles.ts `.dco-mono`), the name itself, and the inline rename used on the page.
 */
import { useEffect, useId, useRef, useState } from 'react'
import type { CoordinatorInfo } from '../types.ts'
import { IconPencil } from './icons.tsx'
import type { Translate } from './locales.ts'
import { monogramOf, NAME_MAX, nameOf, nameProblem, toneOf } from './store.ts'
import { Tooltip } from './ui.tsx'

/** The monogram tile; decorative (the name is always shown or labelled next to it). */
export function Monogram({ name, size = 'md', muted = false }: { name: string; size?: 'xs' | 'sm' | 'md' | 'lg'; muted?: boolean }) {
  return <span className="dco-mono" data-size={size} data-tone={muted ? 'muted' : toneOf(name)} aria-hidden="true">{monogramOf(name)}</span>
}

/**
 * The coordinator's name as a heading with a pencil button; the pencil turns it into a text field where Enter saves and
 * Escape cancels. The host checks the name; its refusal shows under the field and the field stays open.
 */
export function CoordinatorName({ coordinator, coordinators, t, onRename, headingId, disabled = false }: {
  coordinator: CoordinatorInfo; coordinators: readonly CoordinatorInfo[]; t: Translate
  onRename: (name: string) => Promise<void>; headingId: string; disabled?: boolean
}) {
  const name = nameOf(coordinator)
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(name)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const input = useRef<HTMLInputElement>(null)
  const pencil = useRef<HTMLButtonElement>(null)
  const errorId = useId()
  useEffect(() => { if (editing) { input.current?.focus(); input.current?.select() } }, [editing])
  // A different coordinator selected while editing: start over.
  useEffect(() => { setEditing(false); setError(undefined) }, [coordinator.id])

  const close = () => { setEditing(false); setError(undefined); setTimeout(() => { pencil.current?.focus() }, 0) }
  const save = async () => {
    const next = value.trim()
    if (next === name) { close(); return }
    const problem = nameProblem(next, coordinator.id, coordinators)
    if (problem !== undefined) { setError(t(problem, { max: NAME_MAX })); return }
    setBusy(true); setError(undefined)
    try {
      await onRename(next)
      close()
    } catch (e) {
      setError(t('rename.failed', { reason: e instanceof Error ? e.message : String(e) }))
    } finally {
      setBusy(false)
    }
  }

  if (editing) {
    return <div className="dco-rename" data-testid="dco-rename">
      <input ref={input} className="dco-input dco-rename-input" type="text" value={value} maxLength={NAME_MAX * 2} spellCheck={false} autoComplete="off"
        aria-label={t('rename.label')} aria-invalid={error !== undefined || undefined} aria-describedby={errorId} disabled={busy}
        data-testid="dco-rename-input"
        onChange={(event) => { setValue(event.currentTarget.value); setError(undefined) }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); void save() }
          if (event.key === 'Escape') { event.preventDefault(); close() }
        }} />
      <p className="dco-rename-hint" id={errorId} role={error !== undefined ? 'alert' : undefined} data-tone={error !== undefined ? 'danger' : undefined}>
        {error ?? t('rename.hint')}</p>
    </div>
  }
  return <div className="dco-name-line">
    <h2 className="dco-detail-title" id={headingId} data-testid="dco-detail-name">{name}</h2>
    {!disabled && <Tooltip label={t('rename.action')}>
      <button ref={pencil} type="button" className="dco-icon-btn dco-rename-btn" data-testid="dco-rename-start" aria-label={t('rename.aria', { name })}
        onClick={() => { setValue(name); setError(undefined); setEditing(true) }}>
        <IconPencil size={14} />
      </button>
    </Tooltip>}
  </div>
}

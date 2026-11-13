/**
 * Folder choice, shared by the page head (Choose folder...), the detail's folder row and the side pane's folder line.
 *
 * The native picker stays the primary action, but it can block: dsh web's `pickDirectory()` opens a dialog on the
 * machine that runs dsh and waits until it is answered, so with a browser on another computer it never returns. A
 * pending pick therefore shows a wait line with Cancel and a "Type a path" way out, says so after a few seconds, and
 * gives up by itself after a minute (the late answer is ignored). "Type a path" is also always available next to the
 * picker button, so nobody depends on the dialog.
 */
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { CoordinatorInfo } from '../types.ts'
import { IconFolder, IconTextField } from './icons.tsx'
import type { Translate } from './locales.ts'
import { nameOf } from './store.ts'
import { shortenCwd } from './thread-row.tsx'
import { Button, StateDot, Tooltip } from './ui.tsx'

/** Outcome of the native folder picker: a path, a cancel, or no picker here (the UI then shows a path field). */
export type PickResult = { kind: 'picked'; path: string } | { kind: 'cancelled' } | { kind: 'unavailable'; reason?: string }
/** What a pending pick ends in: the picker's answer, the user's Cancel (`abandoned`), or no answer in time. */
export type PickOutcome = PickResult | { kind: 'abandoned' } | { kind: 'timeout' }

/** After this long without an answer the wait line says the dialog may be elsewhere. */
export const PICK_SLOW_MS = 8_000
/** After this long the pick is given up and the path field opens. */
export const PICK_TIMEOUT_MS = 60_000

/**
 * One pending native pick at a time. `start` resolves exactly once: with the picker's answer, `abandoned` on Cancel
 * or unmount, or `timeout`. A picker that answers after that is ignored.
 */
export function usePendingPick(pickFolder: () => Promise<PickResult>): {
  pending: boolean; slow: boolean; start: () => Promise<PickOutcome>; cancel: () => void
} {
  const [pending, setPending] = useState(false)
  const [slow, setSlow] = useState(false)
  const finish = useRef<((outcome: PickOutcome) => void) | undefined>(undefined)
  useEffect(() => () => { finish.current?.({ kind: 'abandoned' }) }, [])
  const start = useCallback(() => new Promise<PickOutcome>((resolve) => {
    finish.current?.({ kind: 'abandoned' })
    let done = false
    const timers = [
      setTimeout(() => { if (!done) setSlow(true) }, PICK_SLOW_MS),
      setTimeout(() => { end({ kind: 'timeout' }) }, PICK_TIMEOUT_MS),
    ]
    const end = (outcome: PickOutcome) => {
      if (done) return
      done = true
      for (const timer of timers) clearTimeout(timer)
      if (finish.current === end) { finish.current = undefined; setPending(false); setSlow(false) }
      resolve(outcome)
    }
    finish.current = end
    setPending(true); setSlow(false)
    pickFolder().then(end, (error: unknown) => { end({ kind: 'unavailable', reason: error instanceof Error ? error.message : String(error) }) })
  }), [pickFolder])
  const cancel = useCallback(() => { finish.current?.({ kind: 'abandoned' }) }, [])
  return { pending, slow, start, cancel }
}

/** The wait line under a pending pick: what is going on, Type a path, and Cancel. */
export function PickWait({ slow, t, onType, onCancel, compact = false }: {
  slow: boolean; t: Translate; onType: () => void; onCancel: () => void; compact?: boolean
}) {
  return <div className="dco-pickwait" role="status" data-compact={compact || undefined} data-testid="dco-pick-wait">
    <span className="dco-pickwait-icon"><StateDot state="ongoing" /></span>
    <span className="dco-pickwait-text">{t(slow ? 'picker.slow' : 'picker.waiting')}</span>
    <span className="dco-pickwait-actions">
      <Button variant="ghost" size="sm" data-testid="dco-pick-type" onClick={onType}>{t('picker.type')}</Button>
      <Button variant="ghost" size="sm" data-testid="dco-pick-cancel" onClick={onCancel}>{t('picker.cancel')}</Button>
    </span>
  </div>
}

/** Inline path field with Save and Cancel: typed instead of picked. */
export function PathField({ label, hint, initial, submit, busy, onSubmit, onCancel, t }: {
  label: string; hint?: string; initial: string; submit: string; busy: boolean; onSubmit: (path: string) => void; onCancel: () => void; t: Translate
}) {
  const [value, setValue] = useState(initial)
  const inputId = useId()
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => { input.current?.focus(); input.current?.select() }, [])
  const path = value.trim()
  return <form className="dco-path" data-testid="dco-path-field" onSubmit={(event) => { event.preventDefault(); if (path !== '' && !busy) onSubmit(path) }}>
    <label className="dco-path-label" htmlFor={inputId}>{label}</label>
    {hint !== undefined && <p className="dco-path-hint">{hint}</p>}
    <span className="dco-path-row">
      <input ref={input} id={inputId} className="dco-input dco-input-mono" type="text" value={value} spellCheck={false} autoComplete="off" dir="ltr"
        placeholder={t('folder.placeholder')} disabled={busy} onChange={(event) => { setValue(event.currentTarget.value) }}
        onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); onCancel() } }} />
      <span className="dco-path-buttons">
        <Button variant="ghost" size="sm" disabled={busy} onClick={onCancel}>{t('folder.cancel')}</Button>
        <Button variant="primary" size="sm" type="submit" disabled={busy || path === ''} aria-busy={busy} data-testid="dco-path-save">{submit}</Button>
      </span>
    </span>
  </form>
}

/** "Type a path": a small text button on the page, an icon button with a tooltip in the narrow side pane. */
export function TypePathButton({ t, onClick, compact = false, disabled = false, label }: {
  t: Translate; onClick: () => void; compact?: boolean; disabled?: boolean; label?: string
}) {
  if (compact) {
    return <Tooltip label={t('picker.type')}>
      <button type="button" className="dco-icon-btn dco-icon-btn-sm" data-testid="dco-type-path" aria-label={label ?? t('picker.type')} disabled={disabled}
        onClick={onClick}><IconTextField size={14} /></button>
    </Tooltip>
  }
  return <Button variant="ghost" size="sm" className="dco-quiet-btn" data-testid="dco-type-path" aria-label={label} disabled={disabled} onClick={onClick}>
    {t('picker.type')}</Button>
}

/**
 * A coordinator's folder (where its new Executor Sessions start) with Change (the native picker) and Type a path.
 * On the page it is a settings row with the note under the path; in the side pane one muted line.
 */
export function FolderLine({ coordinator, t, pickFolder, setFolder, compact = false }: {
  coordinator: CoordinatorInfo; t: Translate; pickFolder: () => Promise<PickResult>; setFolder: (coordinatorId: string, path: string) => Promise<void>
  /** The side pane: one muted line, no note. */
  compact?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const pick = usePendingPick(pickFolder)
  const archived = coordinator.archived === true
  const name = nameOf(coordinator)
  const save = async (path: string) => {
    setBusy(true); setError(undefined)
    try {
      await setFolder(coordinator.id, path)
      setEditing(false)
    } catch (e) {
      setError(t('error.folder', { reason: e instanceof Error ? e.message : String(e) }))
    } finally {
      setBusy(false)
    }
  }
  const change = async () => {
    setError(undefined)
    const picked = await pick.start()
    if (picked.kind === 'picked') await save(picked.path)
    else if (picked.kind === 'unavailable' || picked.kind === 'timeout') setEditing(true)
  }
  const type = () => { pick.cancel(); setError(undefined); setEditing(true) }
  const canChange = !archived && !editing
  const buttons = canChange && <span className="dco-folder-actions">
    <TypePathButton t={t} compact={compact} disabled={busy} onClick={type} label={t('folder.typeAria', { title: name })} />
    <Button variant={compact ? 'ghost' : 'outline'} size="sm" className="dco-folder-change" disabled={busy || pick.pending} aria-busy={busy || pick.pending}
      aria-label={t('folder.changeAria', { title: name })} data-testid="dco-folder-change"
      onClick={() => { void change() }}>{t('folder.change')}</Button>
  </span>
  const path = <span className="dco-folder-path" title={coordinator.folder}><bdi dir="ltr">{shortenCwd(coordinator.folder)}</bdi></span>
  return <div className="dco-folder" data-compact={compact || undefined} data-testid="dco-folder">
    {compact
      ? <div className="dco-folder-line">
        <span className="dco-folder-icon" aria-hidden="true"><IconFolder size={14} /></span>
        {path}
        {buttons}
      </div>
      : <div className="dco-setting">
        <span className="dco-setting-icon" aria-hidden="true"><IconFolder size={16} /></span>
        <div className="dco-setting-main">
          <span className="dco-setting-title">{t('folder.label')}</span>
          <span className="dco-folder-value">{path}</span>
          <p className="dco-setting-desc">{t('folder.note', { home: shortenCwd(coordinator.home) })}</p>
        </div>
        {buttons}
      </div>}
    {pick.pending && <PickWait slow={pick.slow} t={t} compact={compact} onType={type} onCancel={pick.cancel} />}
    {editing && <PathField label={t('folder.pathLabel')} hint={t('folder.manual')} initial={coordinator.folder} submit={t('folder.save')} busy={busy} t={t}
      onSubmit={(value) => { void save(value) }} onCancel={() => { setEditing(false); setError(undefined) }} />}
    {error !== undefined && <p className="dco-field-error" role="alert">{error}</p>}
  </div>
}

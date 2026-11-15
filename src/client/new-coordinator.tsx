/**
 * The inline form the page shows before a coordinator is created: an optional name, and the folder when the user
 * chose one. New coordinator opens it with the name field alone, Choose folder with the picked folder above it, and
 * Type a path with a path field first. Create with an empty name keeps the automatic name from the host's built-in
 * list, so pressing Enter right away creates a coordinator as before. A typed name gets the quick check of the rename
 * (`newNameProblem` in store.ts); the host decides, and a name or folder it refuses creates nothing: the form stays
 * open and the page shows the reason. Built like the path field (folder.tsx), in place, without a dialog.
 *
 * The typed name lives in the page's draft (`NewCoordinatorDraft` in store.ts) and is reported with `onName`: the
 * form is taken down while the folder picker is open and built again for the picked folder, and a name typed before
 * "Choose folder…" is still in the field then.
 */
import { useEffect, useId, useRef, useState } from 'react'
import type { CoordinatorInfo } from '../types.ts'
import type { Translate } from './locales.ts'
import { NAME_MAX, newNameProblem, type NewCoordinatorDraft } from './store.ts'
import { Button } from './ui.tsx'

export function NewCoordinatorForm({ draft, coordinators, basePath, busy, t, onName, onCreate, onCancel }: {
  draft: NewCoordinatorDraft; coordinators: readonly CoordinatorInfo[]; t: Translate
  /** Where the typed path starts (the base for new coordinators). */
  basePath: string
  busy: boolean
  /** The name field changed: the page keeps it in the draft. */
  onName: (name: string) => void
  onCreate: (options: { home?: string; name?: string }) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(draft.name)
  const [path, setPath] = useState(basePath)
  const [error, setError] = useState<string | undefined>(undefined)
  const ids = { name: useId(), path: useId(), hint: useId() }
  const nameInput = useRef<HTMLInputElement>(null)
  const pathInput = useRef<HTMLInputElement>(null)
  // The one thing the user has to give comes first: the path when they type one, else the (optional) name.
  useEffect(() => {
    const first = draft.kind === 'typed' ? pathInput.current : nameInput.current
    first?.focus()
    first?.select()
  }, [draft.kind])

  const typed = draft.kind === 'typed'
  const home = typed ? path.trim() : draft.kind === 'picked' ? draft.home : undefined
  const submit = () => {
    if (busy || (typed && home === '')) return
    const chosen = name.trim()
    const problem = newNameProblem(chosen, coordinators)
    if (problem !== undefined) { setError(t(problem, { max: NAME_MAX })); nameInput.current?.focus(); return }
    onCreate({ ...(home === undefined ? {} : { home }), ...(chosen === '' ? {} : { name: chosen }) })
  }
  // Escape closes the form. An Enter that only confirms an input method's composition (a Chinese name) must not submit it.
  const keys = (event: { key: string; preventDefault(): void; nativeEvent: { isComposing?: boolean } }) => {
    if (event.key === 'Escape') { event.preventDefault(); onCancel() }
    if (event.key === 'Enter' && event.nativeEvent.isComposing === true) event.preventDefault()
  }

  return <form className="dco-path dco-new" data-testid="dco-new-form" data-kind={draft.kind} onSubmit={(event) => { event.preventDefault(); submit() }}>
    {typed && <>
      <label className="dco-path-label" htmlFor={ids.path}>{t('chooseFolder.label')}</label>
      <p className="dco-path-hint">{t('folder.manual')}</p>
      <input ref={pathInput} id={ids.path} className="dco-input dco-input-mono dco-new-path" type="text" value={path} spellCheck={false} autoComplete="off" dir="ltr"
        placeholder={t('folder.placeholder')} disabled={busy} data-testid="dco-new-path"
        onChange={(event) => { setPath(event.currentTarget.value) }} onKeyDown={keys} />
    </>}
    {draft.kind === 'picked' && <p className="dco-path-label" data-testid="dco-new-folder">{t('newCoordinator.folder')} <span className="dco-new-home" dir="ltr">{draft.home}</span></p>}
    <label className="dco-path-label" htmlFor={ids.name}>{t('newCoordinator.name')}</label>
    <span className="dco-path-row">
      <input ref={nameInput} id={ids.name} className="dco-input" type="text" value={name} maxLength={NAME_MAX * 2} spellCheck={false} autoComplete="off"
        placeholder={t('newCoordinator.name.placeholder')} aria-invalid={error !== undefined || undefined} aria-describedby={ids.hint} disabled={busy}
        data-testid="dco-new-name"
        onChange={(event) => { const value = event.currentTarget.value; setName(value); onName(value); setError(undefined) }} onKeyDown={keys} />
      <span className="dco-path-buttons">
        <Button variant="ghost" size="sm" disabled={busy} onClick={onCancel}>{t('folder.cancel')}</Button>
        <Button variant="primary" size="sm" type="submit" disabled={busy || (typed && home === '')} aria-busy={busy} data-testid="dco-new-create">
          {busy ? t('newCoordinator.busy') : t('chooseFolder.create')}</Button>
      </span>
    </span>
    <p className="dco-rename-hint" id={ids.hint} role={error !== undefined ? 'alert' : undefined} data-tone={error !== undefined ? 'danger' : undefined}>
      {error ?? t('newCoordinator.name.hint')}</p>
  </form>
}

/**
 * The setup step the page shows before a coordinator is created: its name, the model of its chat, the model of its
 * Executor Sessions, and the folder when the user chose one. New coordinator opens it with the name and the two model
 * pickers, Choose folder with the picked folder above them, and Type a path with a path field first. Nothing is
 * created, and no chat opens, until the user confirms with Create. Built like the path field (folder.tsx), in place,
 * without a dialog.
 *
 * The host proposes the starting values (`newCoordinatorSetup`): a free name from its built-in list, shown greyed out
 * as the placeholder of the name field, and a default for each model picker when dsh offers that model. Create with an
 * empty name field uses exactly the suggested name (the host takes another free one only when the suggested one was
 * taken meanwhile). Create waits for that proposal, so the user confirms what the pickers show; when it cannot be
 * loaded the form says so, and Create then sends no model. A typed name gets the quick check of the rename (`newNameProblem` in store.ts). The pickers are
 * the ones of the model rows (`ModelPicker` in models.tsx); here a choice is kept in the form and sent with Create.
 * The host decides: a name, folder or model it refuses creates nothing, the form stays open and shows the reason.
 *
 * What was typed, proposed and chosen lives in the page's draft (`NewCoordinatorDraft` in store.ts) and is reported
 * with `onDraft`: the form is taken down while the folder picker is open and built again for the picked folder, and it
 * shows the same name and models then.
 * Two Matriarc switches (coordinator off, Executor Sessions on) are sent with Create; disabled while Matriarc is not installed.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import type { CoordinatorInfo, CreateCoordinatorRequest, NewCoordinatorSetup } from '../types.ts'
import type { Translate } from './locales.ts'
import { formModel } from './model-view.ts'
import { ModelPicker, type ModelListState } from './models.tsx'
import { dshCopy } from './permission.tsx'
import { NAME_MAX, newCoordinatorRequest, newNameProblem, reloadedSetup, type NewCoordinatorDraft } from './store.ts'
import { Button } from './ui.tsx'

/** What the form may change in the page's draft. */
export type NewCoordinatorPatch = Partial<Pick<NewCoordinatorDraft, 'name' | 'setup' | 'coordinatorModel' | 'executorModel' | 'coordinatorMatriarc' | 'executorMatriarc'>>

export function NewCoordinatorForm({ draft, coordinators, basePath, busy, error, t, dsh, loadSetup, watch, matriarcNotice, onDraft, onCreate, onCancel }: {
  draft: NewCoordinatorDraft; coordinators: readonly CoordinatorInfo[]; t: Translate
  /** Where the typed path starts (the base for new coordinators). */
  basePath: string
  busy: boolean
  /** Why the host refused the last Create, when it did. */
  error?: string | undefined
  /** dsh's own model picker dictionary, when loaded. */
  dsh?: Translate | undefined
  /** The host's proposal: a suggested name, dsh's models and the default choices. */
  loadSetup: () => Promise<NewCoordinatorSetup>
  /** Calls back when dsh's models may have changed; returns the release. */
  watch: (listener: () => void) => () => void
  /** The name field, the proposal or a picker changed: the page keeps it in the draft. */
  onDraft: (patch: NewCoordinatorPatch) => void
  /** Matriarc's "no navigator" notice, shown while Matriarc is installed. */
  matriarcNotice?: ReactNode
  onCreate: (request: CreateCoordinatorRequest) => void
  onCancel: () => void
}) {
  const [path, setPath] = useState(basePath)
  const [nameError, setNameError] = useState<string | undefined>(undefined)
  const [failed, setFailed] = useState(false)
  const [reload, setReload] = useState(0)
  const ids = { name: useId(), path: useId(), hint: useId(), coordinator: useId(), executor: useId() }
  const nameInput = useRef<HTMLInputElement>(null)
  const pathInput = useRef<HTMLInputElement>(null)
  // The one thing the user has to give comes first: the path when they type one, else the (optional) name.
  useEffect(() => {
    const first = draft.kind === 'typed' ? pathInput.current : nameInput.current
    first?.focus()
    first?.select()
  }, [draft.kind])

  const setup = draft.setup
  const latest = useRef({ loadSetup, onDraft, setup, coordinators })
  latest.current = { loadSetup, onDraft, setup, coordinators }
  useEffect(() => {
    // A form that comes back for another place (after the folder picker) keeps the proposal of the first one.
    if (reload === 0 && latest.current.setup !== undefined) return undefined
    let current = true
    latest.current.loadSetup().then(
      (value) => {
        if (!current) return
        setFailed(false)
        // A later load brings dsh's models up to date. The suggested name stays the one shown, unless a coordinator took it meanwhile.
        latest.current.onDraft({ setup: reloadedSetup(latest.current.setup, value, latest.current.coordinators) })
      },
      () => { if (current) setFailed(true) },
    )
    return () => { current = false }
  }, [reload])
  useEffect(() => watch(() => { setReload(n => n + 1) }), [watch])

  // A proposal that was loaded stays in use when a later load fails.
  const list: ModelListState = setup !== undefined ? 'ready' : failed ? 'failed' : 'loading'
  const copy = dshCopy(dsh, t)
  const typed = draft.kind === 'typed'
  // The user sees the host's proposal before anything is created: no Create while it is loading. When it could not be
  // loaded the form says so, and Create then makes a coordinator with an automatic name and no model settings.
  const blocked = busy || list === 'loading' || (typed && path.trim() === '')
  const submit = () => {
    if (blocked) return
    const problem = newNameProblem(draft.name.trim(), coordinators)
    if (problem !== undefined) { setNameError(t(problem, { max: NAME_MAX })); nameInput.current?.focus(); return }
    onCreate(newCoordinatorRequest(draft, path))
  }
  // Escape closes the form. An Enter that only confirms an input method's composition (a Chinese name) must not submit it.
  const keys = (event: { key: string; preventDefault(): void; nativeEvent: { isComposing?: boolean } }) => {
    if (event.key === 'Escape') { event.preventDefault(); onCancel() }
    if (event.key === 'Enter' && event.nativeEvent.isComposing === true) event.preventDefault()
  }
  const suggested = setup !== undefined && setup.name !== '' ? setup.name : undefined
  const coordinatorModel = formModel(draft.coordinatorModel, setup?.coordinatorModel)
  const executorModel = formModel(draft.executorModel, setup?.executorModel)
  const empty = setup !== undefined && setup.groups.length === 0
  const matriarc = setup?.matriarc?.installed === true
  const reloadButton = <button type="button" className="dco-model-reload" onClick={() => { setFailed(false); setReload(n => n + 1) }}>{copy('action.reload', 'models.reload')}</button>

  return <form className="dco-path dco-new" data-testid="dco-new-form" data-kind={draft.kind} onSubmit={(event) => { event.preventDefault(); submit() }} onKeyDown={keys}>
    {typed && <>
      <label className="dco-path-label" htmlFor={ids.path}>{t('chooseFolder.label')}</label>
      <p className="dco-path-hint">{t('folder.manual')}</p>
      <input ref={pathInput} id={ids.path} className="dco-input dco-input-mono dco-new-path" type="text" value={path} spellCheck={false} autoComplete="off" dir="ltr"
        placeholder={t('folder.placeholder')} disabled={busy} data-testid="dco-new-path"
        onChange={(event) => { setPath(event.currentTarget.value) }} />
    </>}
    {draft.kind === 'picked' && <p className="dco-path-label" data-testid="dco-new-folder">{t('newCoordinator.folder')} <span className="dco-new-home" dir="ltr">{draft.home}</span></p>}
    <label className="dco-path-label" htmlFor={ids.name}>{t('newCoordinator.name')}</label>
    <span className="dco-path-row">
      <input ref={nameInput} id={ids.name} className="dco-input" type="text" value={draft.name} maxLength={NAME_MAX * 2} spellCheck={false} autoComplete="off"
        placeholder={suggested ?? (list === 'failed' ? t('newCoordinator.name.placeholder') : '')}
        aria-invalid={nameError !== undefined || undefined} aria-describedby={ids.hint} disabled={busy}
        data-testid="dco-new-name" data-suggested={suggested}
        onChange={(event) => { onDraft({ name: event.currentTarget.value }); setNameError(undefined) }} />
    </span>
    <p className="dco-rename-hint" id={ids.hint} role={nameError !== undefined ? 'alert' : undefined} data-tone={nameError !== undefined ? 'danger' : undefined}>
      {nameError ?? (suggested === undefined ? t('newCoordinator.name.hint') : t('newCoordinator.name.hint.suggested', { name: suggested }))}</p>
    <div className="dco-new-field" data-testid="dco-new-model-coordinator">
      <label className="dco-path-label" htmlFor={ids.coordinator}>{t('models.coordinator.label')}</label>
      <div className="dco-model-controls">
        <ModelPicker kind="coordinator" choices={setup} value={coordinatorModel} list={list} disabled={busy} t={t} dsh={dsh}
          id={ids.coordinator} testId="dco-new-model-coordinator" onChange={(next) => { onDraft({ coordinatorModel: next ?? null }) }} />
      </div>
    </div>
    <div className="dco-new-field" data-testid="dco-new-model-executor">
      <label className="dco-path-label" htmlFor={ids.executor}>{t('models.executor.label')}</label>
      <div className="dco-model-controls">
        <ModelPicker kind="executor" choices={setup} value={executorModel} list={list} disabled={busy} t={t} dsh={dsh}
          id={ids.executor} testId="dco-new-model-executor" onChange={(next) => { onDraft({ executorModel: next ?? null }) }} />
      </div>
    </div>
    {list === 'failed' && <p className="dco-model-note" data-tone="warning" role="status" data-testid="dco-new-setup-failed">
      {t('newCoordinator.models.failed')}{reloadButton}</p>}
    {/* A list that came back empty because dsh could not be asked is a failed list, as in the model rows. */}
    {empty && setup.partial && <p className="dco-model-note" data-tone="warning" role="status" data-testid="dco-new-model-failed">{t('models.loadFailed')}{reloadButton}</p>}
    {setup?.partial === true && !empty && <p className="dco-model-note" data-testid="dco-new-model-partial">{t('models.partial')}</p>}
    {empty && !setup.partial && <p className="dco-model-note" data-testid="dco-new-model-none">{t('models.none')}</p>}
    <p className="dco-path-hint">{t('newCoordinator.models.hint')}</p>
    <div className="dco-new-field" data-testid="dco-new-matriarc">
      <label className="dco-check">
        <input type="checkbox" checked={draft.coordinatorMatriarc ?? false} disabled={busy || !matriarc} data-testid="dco-new-matriarc-coordinator"
          onChange={(event) => { onDraft({ coordinatorMatriarc: event.currentTarget.checked }) }} />
        <span>{t('matriarc.coordinator')}</span>
      </label>
      <label className="dco-check">
        <input type="checkbox" checked={draft.executorMatriarc ?? true} disabled={busy || !matriarc} data-testid="dco-new-matriarc-executor"
          onChange={(event) => { onDraft({ executorMatriarc: event.currentTarget.checked }) }} />
        <span>{t('matriarc.executor')}</span>
      </label>
      {setup !== undefined && !matriarc && <p className="dco-model-note" role="status">{t('matriarc.notInstalled')}</p>}
      {matriarc && matriarcNotice}
    </div>
    {error !== undefined && <p className="dco-field-error" role="alert" data-testid="dco-new-error">{error}</p>}
    <span className="dco-path-buttons dco-new-buttons">
      <Button variant="ghost" size="sm" disabled={busy} onClick={onCancel}>{t('folder.cancel')}</Button>
      <Button variant="primary" size="sm" type="submit" disabled={blocked} aria-busy={busy} data-testid="dco-new-create">
        {busy ? t('newCoordinator.busy') : t('chooseFolder.create')}</Button>
    </span>
  </form>
}

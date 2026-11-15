/**
 * The two model rows of a coordinator's detail: "Coordinator model" (the model its chat runs on; one value with the
 * model picker in the chat) and "Executor model" (the model its new Executor Sessions start on, with "Same as
 * coordinator" first). Each row is a select of dsh's models grouped by provider and, for a model with reasoning
 * efforts, a second select for the effort, as in the composer. A change is saved at once (host:
 * `setCoordinatorModel`, `setExecutorModel`); the lists come from the host (`listModelChoices`), which checks every
 * choice against dsh's own lists again.
 *
 * dsh's own picker (`ModelSelect` in dsh-client-ui-model-selection) is not exported, is bound to one Session's
 * composer, and writes through `session.selectModel`, which also changes the model new Sessions of the whole dsh
 * follow. So the rows use native selects in the look of the page's inputs, with dsh's own words from its `model`
 * dictionary when that is loaded (permission.tsx does the same for the permission picker).
 *
 * The two selects are `ModelPicker`. The New coordinator form (new-coordinator.tsx) shows the same pickers before a
 * coordinator exists; there a choice is kept in the form and sent with Create.
 */
import { useEffect, useId, useRef, useState } from 'react'
import type { CoordinatorInfo, ModelChoice, ModelChoices, ModelSettingState } from '../types.ts'
import { IconCheck, IconModel } from './icons.tsx'
import type { Translate } from './locales.ts'
import { chatRunsOn, effortOptions, listedModel, modelName, optionLabel, optionValue, withEffort, withModel, type ModelList } from './model-view.ts'
import { dshCopy } from './permission.tsx'
import { errorText } from './store.ts'
import { useSavedFlag } from './ui.tsx'

/** The option value of "Not set" and "Same as coordinator". */
const NONE = ''

export type ModelKind = 'coordinator' | 'executor'
export type ModelListState = 'loading' | 'failed' | 'ready'
type Kind = ModelKind
type ListState = ModelListState

/**
 * The selects of one model choice: dsh's models grouped by provider, with "Not set" (coordinator) or "Same as
 * coordinator" (executors) first, and the reasoning efforts of the chosen model when it has any. An option names its
 * provider too, so the closed select shows which provider the chosen model comes from. A chosen model the
 * list does not have (any more) is shown, but cannot be picked again. `onChange` gets the new choice, or undefined
 * for the first option; the caller keeps it. Rendered inside a `.dco-model-controls` box.
 */
export function ModelPicker({ kind, choices, value, list, disabled, busy = false, t, dsh, id, describedBy, testId, onChange }: {
  kind: ModelKind; choices: ModelList | undefined; value: ModelChoice | undefined; list: ModelListState; t: Translate; dsh: Translate | undefined
  /** Whatever else disables the selects; they are disabled anyway until the list is loaded. */
  disabled: boolean
  busy?: boolean
  /** The id of the model select, for its label. */
  id: string
  describedBy?: string | undefined
  /** Prefix of the selects' test ids (`<testId>-select`, `<testId>-effort`). */
  testId: string
  onChange: (next: ModelChoice | undefined) => void
}) {
  const copy = dshCopy(dsh, t)
  const found = listedModel(choices, value)
  const missing = value !== undefined && found === undefined && list === 'ready'
  const efforts = found === undefined ? [] : effortOptions(found.model, copy('effort.providerDefault', 'models.effort.default'))
  const effort = value?.reasoningEffort ?? found?.model.defaultEffort ?? NONE
  const effortGone = efforts.length > 0 && !efforts.some(e => e.value === effort)
  const off = disabled || list !== 'ready'
  const groupName = (group: ModelList['groups'][number]): string => {
    // dsh names the account provider in the user's language.
    const account = group.id === 'deepseek-account' ? dsh?.('provider.account') : undefined
    return account !== undefined && account !== '' && !account.endsWith('provider.account') ? account : group.name
  }
  const pickModel = (option: string) => {
    if (option === NONE) { onChange(undefined); return }
    const next = withModel(choices, option, value)
    if (next !== undefined) onChange(next)
  }
  return <>
    <select id={id} className="dco-input dco-select" data-testid={`${testId}-select`} aria-describedby={describedBy}
      value={value === undefined ? NONE : optionValue(value.provider, value.model)}
      disabled={off} aria-busy={busy || list === 'loading' || undefined}
      onChange={(event) => { pickModel(event.currentTarget.value) }}>
      <option value={NONE}>{list === 'loading' && value === undefined ? copy('trigger.loading', 'models.loading')
        : t(kind === 'coordinator' ? 'models.coordinator.unset' : 'models.executor.same')}</option>
      {value !== undefined && found === undefined && <option value={optionValue(value.provider, value.model)} disabled>
        {missing ? t('models.option.unavailable', { name: `${value.provider}/${value.model}` }) : `${value.provider}/${value.model}`}</option>}
      {(choices?.groups ?? []).map(group => <optgroup key={group.id} label={groupName(group)}>
        {group.models.map(model => <option key={model.id} value={optionValue(group.id, model.id)}>{optionLabel(model.name, groupName(group))}</option>)}
      </optgroup>)}
    </select>
    {value !== undefined && efforts.length > 0 && <select className="dco-input dco-select" data-testid={`${testId}-effort`}
      aria-label={copy('menu.effort', 'models.effort')} value={effort}
      disabled={off} onChange={(event) => { onChange(withEffort(value, event.currentTarget.value)) }}>
      {effortGone && <option value={effort} disabled>{t('models.option.unavailable', { name: effort })}</option>}
      {efforts.map(option => <option key={option.value} value={option.value}>{option.name}</option>)}
    </select>}
  </>
}

export interface ModelSettingsProps {
  coordinator: CoordinatorInfo
  t: Translate
  /** dsh's own model picker dictionary, when loaded. */
  dsh?: Translate | undefined
  /** The models dsh offers and what this coordinator's settings resolve to. */
  load: (coordinatorId: string) => Promise<ModelChoices>
  /** Calls back when dsh's models may have changed (a provider was set up or signed out); returns the release. */
  watch: (listener: () => void) => () => void
  onSetCoordinator: (coordinatorId: string, model: ModelChoice | null) => Promise<void>
  onSetExecutors: (coordinatorId: string, model: ModelChoice | null) => Promise<void>
}

export function ModelSettings({ coordinator, t, dsh, load, watch, onSetCoordinator, onSetExecutors }: ModelSettingsProps) {
  const [choices, setChoices] = useState<ModelChoices | undefined>(undefined)
  const [failed, setFailed] = useState(false)
  const [reload, setReload] = useState(0)
  // What the lists depend on besides dsh's providers: the two settings, and the model the chat runs on.
  const key = JSON.stringify([coordinator.coordinatorModel ?? null, coordinator.executorModel ?? null, coordinator.model?.model ?? null, coordinator.chat ?? null])
  const loader = useRef(load)
  loader.current = load
  useEffect(() => {
    let current = true
    loader.current(coordinator.id).then(
      (value) => { if (current) { setChoices(value); setFailed(false) } },
      () => { if (current) setFailed(true) },
    )
    return () => { current = false }
  }, [coordinator.id, key, reload])
  useEffect(() => watch(() => { setReload(n => n + 1) }), [watch])

  // A list that was loaded stays in use when a later load fails.
  const list: ListState = choices !== undefined ? 'ready' : failed ? 'failed' : 'loading'
  const retry = () => { setFailed(false); setReload(n => n + 1) }
  return <>
    <ModelRow kind="coordinator" coordinator={coordinator} choices={choices} state={choices?.coordinator} list={list} t={t} dsh={dsh}
      onSet={onSetCoordinator} onRetry={retry} />
    <ModelRow kind="executor" coordinator={coordinator} choices={choices} state={choices?.executors} list={list} t={t} dsh={dsh}
      onSet={onSetExecutors} onRetry={retry} />
  </>
}

function ModelRow({ kind, coordinator, choices, state, list, t, dsh, onSet, onRetry }: {
  kind: Kind; coordinator: CoordinatorInfo; choices: ModelChoices | undefined; state: ModelSettingState | undefined; list: ListState
  t: Translate; dsh: Translate | undefined; onSet: (coordinatorId: string, model: ModelChoice | null) => Promise<void>; onRetry: () => void
}) {
  const copy = dshCopy(dsh, t)
  const saved = kind === 'coordinator' ? coordinator.coordinatorModel : coordinator.executorModel
  const savedKey = JSON.stringify(saved ?? null)
  // The choice just made, shown until the host's state has it (or the save failed).
  const [local, setLocal] = useState<{ value: ModelChoice | undefined } | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [justSaved, setJustSaved] = useSavedFlag()
  const ids = { field: useId(), help: useId() }
  useEffect(() => { setLocal(undefined) }, [savedKey])

  const archived = coordinator.archived === true
  const stored = local === undefined ? saved : local.value
  const set = async (next: ModelChoice | undefined) => {
    if (busy) return
    setBusy(true); setError(undefined); setJustSaved(false); setLocal({ value: next })
    try {
      await onSet(coordinator.id, next ?? null)
      setJustSaved(true)
    } catch (e) {
      setLocal(undefined)
      setError(t('error.model', { reason: errorText(e) }))
    } finally {
      setBusy(false)
    }
  }

  // What applies now, when it is not what the select shows: nothing set, a stored model dsh no longer offers or could
  // not be asked about, or a chat that runs on another model than the stored one.
  const current = state !== undefined && JSON.stringify(state.stored ?? null) === JSON.stringify(stored ?? null) ? state : undefined
  const effective = current?.effective === undefined ? undefined : modelName(choices, current.effective)
  const chat = kind === 'coordinator' && !archived ? chatRunsOn(stored, current) : undefined
  let note: { text: string; tone?: 'warning' } | undefined
  if (stored !== undefined && current?.unchecked === true) {
    note = { tone: 'warning', text: t(`models.${kind}.unchecked`, { name: modelName(choices, stored) }) }
  } else if (stored !== undefined && current?.available === false) {
    const name = modelName(choices, stored)
    note = { tone: 'warning', text: kind === 'coordinator' ? t('models.coordinator.unavailable', { name })
      : effective === undefined ? t('models.executor.unavailableNone', { name }) : t('models.executor.unavailable', { name, fallback: effective }) }
  } else if (stored === undefined && effective !== undefined && !archived) {
    note = { text: t(kind === 'coordinator' ? 'models.coordinator.unset.note' : 'models.executor.same.note', { name: effective }) }
  } else if (chat !== undefined) {
    note = { tone: 'warning', text: t('models.coordinator.differs', { name: modelName(choices, chat) }) }
  }
  const empty = choices !== undefined && choices.groups.length === 0
  // The list as a whole is said once, on the first row.
  const listFailed = kind === 'coordinator' && (list === 'failed' || (empty && choices.partial))

  return <div className="dco-setting" data-testid={`dco-model-${kind}`}>
    <span className="dco-setting-icon" aria-hidden="true"><IconModel size={16} /></span>
    <div className="dco-setting-main">
      <label className="dco-setting-title" htmlFor={ids.field}>{t(`models.${kind}.label`)}</label>
      <p className="dco-setting-desc" id={ids.help}>{t(`models.${kind}.hint`)}</p>
      <div className="dco-model-controls">
        <ModelPicker kind={kind} choices={choices} value={stored} list={list} disabled={archived || busy} busy={busy} t={t} dsh={dsh}
          id={ids.field} describedBy={ids.help} testId={`dco-model-${kind}`} onChange={(next) => { void set(next) }} />
        <span role="status">{justSaved && !busy && <span className="dco-saved"><IconCheck size={14} />{t('prompt.saved')}</span>}</span>
      </div>
      {note !== undefined && <p className="dco-model-note" data-tone={note.tone} role={note.tone === 'warning' ? 'status' : undefined}
        data-testid={`dco-model-${kind}-note`}>{note.text}</p>}
      {listFailed && <p className="dco-model-note" data-tone="warning" role="status" data-testid="dco-model-failed">
        {t('models.loadFailed')}
        <button type="button" className="dco-model-reload" onClick={onRetry}>{copy('action.reload', 'models.reload')}</button></p>}
      {kind === 'coordinator' && choices?.partial === true && !empty && <p className="dco-model-note" data-testid="dco-model-partial">{t('models.partial')}</p>}
      {kind === 'coordinator' && empty && !listFailed && <p className="dco-model-note" data-testid="dco-model-none">{t('models.none')}</p>}
      {error !== undefined && <p className="dco-field-error" role="alert">{error}</p>}
    </div>
  </div>
}

/**
 * The "Memory" row of a coordinator's detail: what the coordinator remembers across conversations (host:
 * `setCoordinatorMemory`, max 6000 characters). The coordinator and the Leads of its Executor Sessions rewrite the
 * page themselves with their memory tools, so a poll often brings a new text. Built like the Executor prompt row: a
 * text field that grows with its text, a character count, Revert and Save, and a short "Saved" after a save. A
 * checkbox switches the memory off and on (`setCoordinatorMemoryEnabled`); while it is off the text stays and can
 * still be edited. A quiet line under the field says who changed the page last.
 *
 * The row follows the host's page on its own. The memory has a revision that grows with every change; the row
 * remembers the revision its text is based on, and a newer version from a poll simply replaces the field while the
 * user has no unsaved edits of their own. Nothing is asked of the user then: Save and Revert are for their own
 * edits only. While they do have unsaved edits, their draft stays and a line says that the memory changed
 * meanwhile: Revert loads the new version, Save replaces it with the draft. When the memory changes between the
 * last poll and a save, the host refuses the save: the draft stays, the row says so and is then based on the current
 * version, and the user decides again. A poll from before the row's own save carries a lower revision and is
 * ignored, so the field never falls back to the old text; only after the host service was started again (a new
 * `epoch`) does the row take a lower revision. So neither side's text is lost without the user seeing it. The rules
 * are `memoryRowSync`, `memoryRowMerge` and `memoryRowView` in store.ts.
 *
 * While Executor Sessions changed the page since the owner last saved it, a quiet line names them, as information.
 * Next to it sits one optional small action, "Mark as reviewed": it saves the page as the field shows it (the
 * unchanged text with its revision), which is how the host clears that mark, and only the owner can do it. It is
 * offered while the user has no unsaved edits; with edits, Save clears the mark as well.
 */
import { useEffect, useId, useRef, useState } from 'react'
import type { CoordinatorInfo, SetCoordinatorMemoryResult } from '../types.ts'
import { IconCheck, IconMemory } from './icons.tsx'
import type { Translate } from './locales.ts'
import { MEMORY_MAX, memoryRowMerge, memoryRowSync, memoryRowView, promptLength, type MemoryRow } from './store.ts'
import { relativeTime, useNow } from './thread-row.tsx'
import { Button } from './ui.tsx'

const SAVED_MS = 2_500

export function CoordinatorMemory({ coordinator, epoch, t, onSave, onToggle }: {
  coordinator: CoordinatorInfo; t: Translate
  /** The host service the state came from (`CoordinatorState.epoch`). */
  epoch?: string
  /** Save `text`, based on memory revision `revision`; resolves with whether it was saved and the memory as it is now. */
  onSave: (coordinatorId: string, text: string, revision: number) => Promise<SetCoordinatorMemoryResult>
  onToggle: (coordinatorId: string, enabled: boolean) => Promise<void>
}) {
  const hostText = coordinator.memory ?? ''
  const hostRevision = coordinator.memoryRevision ?? 0
  const [row, setRow] = useState<MemoryRow>({ draft: hostText, base: hostText, baseRevision: hostRevision, changed: false, ...(epoch === undefined ? {} : { epoch }) })
  // The last save was refused because the memory had changed since the row's revision.
  const [refused, setRefused] = useState(false)
  const [busy, setBusy] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [justSaved, setJustSaved] = useState(false)
  const field = useRef<HTMLTextAreaElement>(null)
  const ids = { label: useId(), help: useId(), count: useId() }
  const archived = coordinator.archived === true
  const off = coordinator.memoryOff === true
  const now = useNow()
  const by = coordinator.memoryBy
  // An executor's title is its own text: shown as plain text, with its id.
  const writer = by === undefined ? undefined
    : by.by === 'user' ? t('memory.by.user')
      : by.by === 'coordinator' ? t('memory.by.coordinator')
        : by.executorTitle === undefined || by.executorTitle === '' ? t('memory.by.executorId', { id: by.executorId ?? '' })
          : t('memory.by.executor', { title: by.executorTitle, id: by.executorId ?? '' })
  // The Executor Sessions that changed the page since the owner last saved it; the owner's save clears the mark.
  const executors = (coordinator.memoryExecutors ?? [])
    .map(e => (e.title === undefined || e.title === '' ? t('memory.by.executorId', { id: e.id }) : t('memory.by.executor', { title: e.title, id: e.id })))
  const marked = executors.length > 0

  // Also after the row itself changed: a save result may be older than a poll that arrived while the save ran.
  useEffect(() => {
    setRow(current => memoryRowSync(current, { text: hostText, revision: hostRevision, ...(epoch === undefined ? {} : { epoch }) }) ?? current)
  }, [hostText, hostRevision, epoch, row])
  useEffect(() => {
    if (!justSaved) return
    const timer = setTimeout(() => { setJustSaved(false) }, SAVED_MS)
    return () => { clearTimeout(timer) }
  }, [justSaved])

  const { draft } = row
  const length = promptLength(draft)
  const { dirty, over, conflict, canSave, canRevert, canReview } = memoryRowView(row, { executors: executors.length, busy: busy || reviewing, archived })
  const save = async () => {
    if (!canSave) return
    setBusy(true); setError(undefined)
    try {
      const result = await onSave(coordinator.id, draft, row.baseRevision)
      const host = { text: result.coordinator.memory ?? '', revision: result.coordinator.memoryRevision ?? 0 }
      if (result.saved) {
        // The host's cleaned text is what the field shows as saved.
        setRow(current => ({ draft: host.text, base: host.text, baseRevision: host.revision, changed: false, ...(current.epoch === undefined ? {} : { epoch: current.epoch }) }))
        setRefused(false)
        setJustSaved(true)
      } else {
        // The memory changed after the last poll: nothing was saved. The draft stays, now on top of the current version,
        // and the row says so, also when only the revision moved (a save of the same text elsewhere).
        setRow((current) => {
          const merged = memoryRowMerge(current, host)
          return { ...merged, changed: merged.draft !== merged.base, ...(current.epoch === undefined ? {} : { epoch: current.epoch }) }
        })
        setRefused(true)
      }
    } catch (e) {
      setError(t('memory.failed', { reason: e instanceof Error ? e.message : String(e) }))
    } finally {
      setBusy(false)
    }
  }
  // Optional: the owner has read what the Executor Sessions wrote. The page is saved as the field shows it, with
  // its revision, so the host keeps the text and clears the mark. A page that changed just now is not marked: the
  // field takes the new version and the line stays for it. The field stays editable while the request runs: what
  // the user types meanwhile is an ordinary unsaved edit on top of the reviewed text, not a change underneath
  // (`memoryRowMerge` compares the host's text with the row's base).
  const review = async () => {
    if (!canReview) return
    setReviewing(true); setError(undefined)
    try {
      const result = await onSave(coordinator.id, row.base, row.baseRevision)
      const host = { text: result.coordinator.memory ?? '', revision: result.coordinator.memoryRevision ?? 0 }
      setRow(current => ({ ...memoryRowMerge(current, host), ...(current.epoch === undefined ? {} : { epoch: current.epoch }) }))
    } catch (e) {
      setError(t('memory.reviewFailed', { reason: e instanceof Error ? e.message : String(e) }))
    } finally {
      setReviewing(false)
    }
  }
  const revert = () => { setRow(current => ({ ...current, draft: current.base, changed: false })); setRefused(false); setError(undefined); field.current?.focus() }
  const toggle = async (enabled: boolean) => {
    if (switching) return
    setSwitching(true); setError(undefined)
    try {
      await onToggle(coordinator.id, enabled)
    } catch (e) {
      setError(t('memory.toggleFailed', { reason: e instanceof Error ? e.message : String(e) }))
    } finally {
      setSwitching(false)
    }
  }

  return <div className="dco-setting dco-setting-block" data-testid="dco-memory">
    <span className="dco-setting-icon" aria-hidden="true"><IconMemory size={16} /></span>
    <div className="dco-setting-main">
      <label className="dco-setting-title" id={ids.label} htmlFor={`${ids.label}-field`}>{t('memory.title')}</label>
      <p className="dco-setting-desc" id={ids.help}>{t('memory.help')}</p>
      <label className="dco-check dco-memory-switch">
        <input type="checkbox" checked={!off} disabled={archived || switching} data-testid="dco-memory-enabled"
          onChange={(event) => { void toggle(event.currentTarget.checked) }} />
        <span>{t('memory.enabled')}
          {off && <span className="dco-check-note" data-testid="dco-memory-off">{t('memory.off')}</span>}</span>
      </label>
      <textarea ref={field} id={`${ids.label}-field`} className="dco-input dco-textarea" value={draft} rows={3} spellCheck
        placeholder={t('memory.empty')} aria-describedby={`${ids.help} ${ids.count}`} aria-invalid={over || undefined}
        disabled={archived || busy} data-testid="dco-memory-field"
        onChange={(event) => { const value = event.currentTarget.value; setRow(current => ({ ...current, draft: value })); setError(undefined); setJustSaved(false) }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) { event.preventDefault(); void save() }
          if (event.key === 'Escape' && dirty) { event.preventDefault(); revert() }
        }} />
      {conflict && <p className="dco-memory-changed" role="status" data-testid="dco-memory-changed"
        data-refused={refused || undefined}>{t(refused ? 'memory.stale' : 'memory.changed')}</p>}
      {writer !== undefined && by !== undefined && <p className="dco-setting-desc dco-memory-by" data-testid="dco-memory-by" data-by={by.by}>
        {t('memory.by', { who: writer, when: relativeTime(by.at, now, t) })}</p>}
      {marked && <p className="dco-setting-desc dco-memory-executors" data-testid="dco-memory-executors">
        <span role="status">{t('memory.executors', { who: executors.join(', ') })}</span>
        {!archived && !dirty && <button type="button" className="dco-memory-review" disabled={!canReview} title={t('memory.review.hint')}
          data-testid="dco-memory-review" onClick={() => { void review() }}>{t('memory.review')}</button>}</p>}
      <div className="dco-prompt-foot">
        <span className="dco-prompt-count" id={ids.count} data-tone={over ? 'danger' : undefined} data-testid="dco-memory-count"
          aria-live={over ? 'polite' : undefined}>
          {over ? t('memory.over', { n: length, max: MEMORY_MAX }) : t('memory.count', { n: length, max: MEMORY_MAX })}
        </span>
        <span className="dco-prompt-state" role="status" data-testid="dco-memory-state">
          {justSaved && !dirty && <span className="dco-saved"><IconCheck size={14} />{t('memory.saved')}</span>}
          {dirty && !busy && <span className="dco-unsaved">{t('memory.unsaved')}</span>}
        </span>
        {!archived && <span className="dco-prompt-buttons">
          <Button variant="ghost" size="sm" disabled={!canRevert} data-testid="dco-memory-revert" onClick={revert}>{t('memory.revert')}</Button>
          <Button variant="primary" size="sm" disabled={!canSave} aria-busy={busy} data-testid="dco-memory-save"
            onClick={() => { void save() }}>{busy ? t('memory.saving') : t('memory.save')}</Button>
        </span>}
      </div>
      {error !== undefined && <p className="dco-field-error" role="alert">{error}</p>}
    </div>
  </div>
}

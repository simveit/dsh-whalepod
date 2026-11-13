/**
 * The "Executor prompt" row of a coordinator's detail: the user's standing instructions that every Executor Session
 * this coordinator starts gets (host: `setExecutorPrompt`, max 4000 characters). A text field that grows with its
 * text, a character count, Revert and Save, and a short "Saved" after a save. A poll that brings a new saved text
 * replaces the field only while the user has not changed it.
 */
import { useEffect, useId, useRef, useState } from 'react'
import type { CoordinatorInfo } from '../types.ts'
import { IconCheck, IconInstructions } from './icons.tsx'
import type { Translate } from './locales.ts'
import { PROMPT_MAX, promptLength } from './store.ts'
import { Button } from './ui.tsx'

const SAVED_MS = 2_500

export function ExecutorPrompt({ coordinator, t, onSave }: {
  coordinator: CoordinatorInfo; t: Translate; onSave: (coordinatorId: string, text: string) => Promise<void>
}) {
  const saved = coordinator.executorPrompt ?? ''
  const [draft, setDraft] = useState(saved)
  const [base, setBase] = useState(saved)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [justSaved, setJustSaved] = useState(false)
  // The field grows with its text through CSS (`field-sizing: content`, between 3 and about 12 lines).
  const field = useRef<HTMLTextAreaElement>(null)
  const ids = { label: useId(), help: useId(), count: useId() }
  const archived = coordinator.archived === true

  // A new saved text from the host replaces the field only when the user has no unsaved change.
  useEffect(() => {
    if (saved === base) return
    if (draft === base) setDraft(saved)
    setBase(saved)
  }, [saved, base, draft])
  useEffect(() => {
    if (!justSaved) return
    const timer = setTimeout(() => { setJustSaved(false) }, SAVED_MS)
    return () => { clearTimeout(timer) }
  }, [justSaved])

  const length = promptLength(draft)
  const over = length > PROMPT_MAX
  const dirty = draft !== base
  const save = async () => {
    if (!dirty || over || busy) return
    setBusy(true); setError(undefined)
    try {
      await onSave(coordinator.id, draft)
      setBase(draft)
      setJustSaved(true)
    } catch (e) {
      setError(t('prompt.failed', { reason: e instanceof Error ? e.message : String(e) }))
    } finally {
      setBusy(false)
    }
  }
  const revert = () => { setDraft(base); setError(undefined); field.current?.focus() }

  return <div className="dco-setting dco-setting-block" data-testid="dco-executor-prompt">
    <span className="dco-setting-icon" aria-hidden="true"><IconInstructions size={16} /></span>
    <div className="dco-setting-main">
      <label className="dco-setting-title" id={ids.label} htmlFor={`${ids.label}-field`}>{t('prompt.title')}</label>
      <p className="dco-setting-desc" id={ids.help}>{t('prompt.help')}</p>
      <textarea ref={field} id={`${ids.label}-field`} className="dco-input dco-textarea" value={draft} rows={3} spellCheck
        placeholder={t('prompt.placeholder')} aria-describedby={`${ids.help} ${ids.count}`} aria-invalid={over || undefined}
        disabled={archived || busy} data-testid="dco-executor-prompt-field"
        onChange={(event) => { setDraft(event.currentTarget.value); setError(undefined); setJustSaved(false) }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) { event.preventDefault(); void save() }
          if (event.key === 'Escape' && dirty) { event.preventDefault(); revert() }
        }} />
      <div className="dco-prompt-foot">
        <span className="dco-prompt-count" id={ids.count} data-tone={over ? 'danger' : undefined} data-testid="dco-executor-prompt-count"
          aria-live={over ? 'polite' : undefined}>
          {over ? t('prompt.over', { n: length, max: PROMPT_MAX }) : t('prompt.count', { n: length, max: PROMPT_MAX })}
        </span>
        <span className="dco-prompt-state" role="status" data-testid="dco-executor-prompt-state">
          {justSaved && !dirty && <span className="dco-saved"><IconCheck size={14} />{t('prompt.saved')}</span>}
          {dirty && !busy && <span className="dco-unsaved">{t('prompt.unsaved')}</span>}
        </span>
        {!archived && <span className="dco-prompt-buttons">
          <Button variant="ghost" size="sm" disabled={!dirty || busy} data-testid="dco-executor-prompt-revert" onClick={revert}>{t('prompt.revert')}</Button>
          <Button variant="primary" size="sm" disabled={!dirty || over || busy} aria-busy={busy} data-testid="dco-executor-prompt-save"
            onClick={() => { void save() }}>{busy ? t('prompt.saving') : t('prompt.save')}</Button>
        </span>}
      </div>
      {error !== undefined && <p className="dco-field-error" role="alert">{error}</p>}
    </div>
  </div>
}

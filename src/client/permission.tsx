/**
 * How new threads run: the "Threads run in" control on the Coordinator page and the short note shown at the start
 * (the coordinator chat's welcome and the page's empty state).
 *
 * It mirrors dsh's own permission picker (@deepseek-ai/dsh-client-ui-permission-presets): the same labels, the `EXP`
 * badge on Auto review, one line of description per choice, and the same acknowledgement before Auto review is
 * switched on. dsh's own copy is used when its `permission.access` dictionary is loaded, so the wording is dsh's in
 * every language; the plugin's dictionary covers the rest.
 */
import { useId, useState } from 'react'
import type { ThreadPermission, ThreadPermissionState } from './contract.ts'
import { IconShield } from './icons.tsx'
import type { Translate } from './locales.ts'
import { Button } from './ui.tsx'

/** dsh's dictionary for the composer's permission picker, when loaded; falls back to the plugin's own keys. */
export function dshCopy(dsh: Translate | undefined, t: Translate): (dshKey: string, ownKey: string) => string {
  return (dshKey, ownKey) => {
    const text = dsh?.(dshKey)
    return text !== undefined && text !== '' && text !== dshKey && !text.endsWith(dshKey) ? text : t(ownKey)
  }
}

/** The one-line note under the opening turn and on the empty page: which mode threads start in. */
export function PermissionNote({ state, t, onChange, onPage = false }: {
  state: ThreadPermissionState | undefined; t: Translate; onChange?: () => void
  /** Shown on the Coordinator page itself, under its control: the note points up instead of to the page. */
  onPage?: boolean
}) {
  if (state === undefined) return null
  const auto = state.effective === 'auto'
  return <div className="dco-notice dco-perm-note" role="note" data-testid="dco-permission-note">
    <span className="dco-notice-icon"><IconShield size={14} /></span>
    <p className="dco-notice-text">
      {auto ? t(onPage ? 'perm.note.autoHere' : 'perm.note.auto') : state.mode === 'auto' ? t('perm.note.unavailable') : t(onPage ? 'perm.note.askHere' : 'perm.note.ask')}
    </p>
    {onChange !== undefined && <span className="dco-notice-actions">
      <Button variant="ghost" size="sm" onClick={onChange}>{t('perm.note.change')}</Button>
    </span>}
  </div>
}

/**
 * "Threads run in: Auto review EXP | Ask me", as a two-choice radio group with the selected choice's description.
 * Switching to Auto review asks for the same acknowledgement dsh asks for in the composer.
 */
export function PermissionControl({ state, t, dsh, onSet }: {
  state: ThreadPermissionState | undefined; t: Translate; dsh: Translate | undefined; onSet: (mode: ThreadPermission) => Promise<void>
}) {
  const copy = dshCopy(dsh, t)
  const labelId = useId()
  const [confirming, setConfirming] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  if (state === undefined) return null
  const selected: ThreadPermission = state.autoAvailable ? state.mode : 'ask'
  const set = async (mode: ThreadPermission) => {
    setBusy(true); setError(undefined)
    try {
      await onSet(mode)
      setConfirming(false); setAcknowledged(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }
  const pick = (mode: ThreadPermission) => {
    if (mode === selected || busy) return
    if (mode === 'auto') { setConfirming(true); setAcknowledged(false); return }
    void set('ask')
  }
  const options: { mode: ThreadPermission; label: string; badge?: string; disabled: boolean }[] = [
    { mode: 'auto', label: copy('auto.label', 'perm.auto'), badge: copy('auto.badge', 'perm.badge'), disabled: !state.autoAvailable },
    { mode: 'ask', label: t('perm.ask'), disabled: false },
  ]
  const description = selected === 'auto' ? t('perm.auto.description') : state.autoAvailable ? t('perm.ask.description') : t('perm.ask.forced')
  return <section className="dco-perm" data-testid="dco-permission" aria-labelledby={labelId}>
    <div className="dco-perm-row">
      <span className="dco-perm-label" id={labelId}><IconShield size={14} />{t('perm.title')}</span>
      <div className="dco-seg" role="radiogroup" aria-labelledby={labelId}>
        {options.map(o => <button key={o.mode} type="button" role="radio" aria-checked={selected === o.mode} className="dco-seg-option"
          data-testid={`dco-permission-${o.mode}`} disabled={o.disabled || busy}
          onClick={() => { pick(o.mode) }}>
          <span>{o.label}</span>{o.badge !== undefined && <span className="dco-seg-badge">{o.badge}</span>}
        </button>)}
      </div>
    </div>
    <p className="dco-perm-desc">{description}</p>
    {confirming && <div className="dco-notice dco-perm-confirm" data-tone="warning" role="alertdialog" aria-label={copy('auto.confirm.title', 'perm.confirm.title')}>
      <p className="dco-notice-text"><strong>{copy('auto.confirm.title', 'perm.confirm.title')}</strong>
        <span className="dco-notice-detail">{copy('auto.confirm.description', 'perm.confirm.description')} {t('perm.confirm.threads')}</span>
        <label className="dco-perm-ack">
          <input type="checkbox" checked={acknowledged} onChange={e => { setAcknowledged(e.currentTarget.checked) }} />
          <span>{copy('auto.confirm.acknowledge', 'perm.confirm.acknowledge')}</span>
        </label>
      </p>
      <span className="dco-notice-actions">
        <Button variant="ghost" size="sm" onClick={() => { setConfirming(false) }}>{copy('confirm.cancel', 'perm.confirm.cancel')}</Button>
        <Button variant="primary" size="sm" disabled={!acknowledged || busy} data-testid="dco-permission-enable"
          onClick={() => { void set('auto') }}>{copy('auto.confirm.enable', 'perm.confirm.enable')}</Button>
      </span>
    </div>}
    {error !== undefined && <p className="dco-perm-error" role="alert">{error}</p>}
  </section>
}

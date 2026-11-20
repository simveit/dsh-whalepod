/**
 * The global Matriarc switch: one on/off toggle laid out like the "Executor Sessions run in" control, under it at the
 * top of the Orchestrator page (one setting for every Orchestrator; the New Orchestrator form opens under it and has no
 * copy of its own). Shown only while Matriarc is installed; the caller renders nothing otherwise.
 */
import { useEffect, useId, useState, type ReactNode } from 'react'
import type { MatriarcState } from '../types.ts'
import { IconCoordinator } from './icons.tsx'
import type { Translate } from './locales.ts'
import type { NavigatorNotice } from './navigator.ts'
import { errorText } from './store.ts'

export function MatriarcControl({ state, notice, disabled = false, t, onSet }: {
  state: MatriarcState | undefined; t: Translate
  /** Matriarc's "no navigator" notice, rendered under the description (it shows itself only when wanted). */
  notice?: ReactNode
  disabled?: boolean
  onSet: (enabled: boolean) => Promise<void>
}) {
  const labelId = useId()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  if (state?.installed !== true) return null
  const toggle = () => {
    setBusy(true); setError(undefined)
    onSet(!state.enabled).catch((e: unknown) => { setError(errorText(e)) }).finally(() => { setBusy(false) })
  }
  return <section className="dco-perm dco-matriarc" data-testid="dco-matriarc" aria-labelledby={labelId}>
    <div className="dco-perm-row">
      <span className="dco-perm-label" id={labelId}><IconCoordinator size={14} />{t('matriarc.title')}</span>
      <button type="button" role="switch" aria-checked={state.enabled} aria-label={t('matriarc.title')} className="dco-switch"
        data-testid="dco-matriarc-switch" disabled={busy || disabled} onClick={toggle}>
        <span className="dco-switch-knob" aria-hidden="true" />
      </button>
    </div>
    <p className="dco-perm-desc">{t(state.enabled ? 'matriarc.on.description' : 'matriarc.off.description')}</p>
    {notice}
    {error !== undefined && <p className="dco-perm-error" role="alert">{error}</p>}
  </section>
}

/**
 * Matriarc's own notice when it has no navigator (dsh-matriarc src/client/index.ts, the `missing` notice of its "Enable
 * Matriarc" row): the same text and the same buttons, a candidate bundle each, else Plugins. Shown while `shown` (the
 * host's state says no navigator; `wantsNavigatorNotice`); the buttons follow once the Plugins page's bundles are read.
 */
export function MatriarcNavigatorNotice({ shown, t, load, open }: {
  shown: boolean; t: Translate
  load: () => Promise<NavigatorNotice | undefined>
  open: (packageName?: string) => void
}) {
  const [notice, setNotice] = useState<NavigatorNotice | undefined>(undefined)
  useEffect(() => {
    setNotice(undefined)
    if (!shown) return undefined
    let live = true
    load().then((value) => { if (live) setNotice(value) }, () => {})
    return () => { live = false }
  }, [shown, load])
  if (!shown) return null
  return <div className="dco-matriarc-notice" role="status" data-testid="dco-matriarc-navigator">
    <span>{t('matriarc.navigator.none')}</span>
    {notice?.canOpen === true && <span className="dco-matriarc-actions">{notice.candidates.length === 0
      ? <button type="button" className="dco-matriarc-action" onClick={() => { open() }}>{t('matriarc.navigator.plugins')}</button>
      : notice.candidates.map(c => <button type="button" key={c.name} className="dco-matriarc-action" onClick={() => { open(c.name) }}>
        {t('matriarc.navigator.open', { name: c.title })}</button>)}</span>}
  </div>
}

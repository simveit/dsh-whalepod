/**
 * The "Matriarc" row of a coordinator's detail: two switches like the Memory row's, for the coordinator chat (at once)
 * and for Executor Sessions started afterwards. Disabled, with a note, while Matriarc is not installed.
 */
import { useEffect, useState, type ReactNode } from 'react'
import type { CoordinatorInfo } from '../types.ts'
import { IconCoordinator } from './icons.tsx'
import type { Translate } from './locales.ts'
import type { NavigatorNotice } from './navigator.ts'
import { errorText } from './store.ts'

export function CoordinatorMatriarc({ coordinator, installed, notice, t, onSet }: {
  coordinator: CoordinatorInfo; installed: boolean; t: Translate
  /** Matriarc's "no navigator" notice, shown while Matriarc is installed. */
  notice?: ReactNode
  onSet: (coordinatorId: string, which: 'coordinator' | 'executor', enabled: boolean) => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const disabled = busy || !installed || coordinator.archived === true
  const toggle = (which: 'coordinator' | 'executor', enabled: boolean) => {
    setBusy(true); setError(undefined)
    onSet(coordinator.id, which, enabled).catch((e: unknown) => { setError(errorText(e)) }).finally(() => { setBusy(false) })
  }
  return <div className="dco-setting" data-testid="dco-matriarc">
    <span className="dco-setting-icon" aria-hidden="true"><IconCoordinator size={16} /></span>
    <div className="dco-setting-main">
      <span className="dco-setting-title">Matriarc</span>
      {!installed && <p className="dco-setting-desc" role="status">{t('matriarc.notInstalled')}</p>}
      {installed && notice}
      <label className="dco-check">
        <input type="checkbox" checked={coordinator.coordinatorMatriarc} disabled={disabled} data-testid="dco-matriarc-coordinator"
          onChange={(event) => { toggle('coordinator', event.currentTarget.checked) }} />
        <span>{t('matriarc.coordinator')}</span>
      </label>
      <label className="dco-check">
        <input type="checkbox" checked={coordinator.executorMatriarc} disabled={disabled} data-testid="dco-matriarc-executor"
          onChange={(event) => { toggle('executor', event.currentTarget.checked) }} />
        <span>{t('matriarc.executor')}<span className="dco-check-note">{t('matriarc.executor.hint')}</span></span>
      </label>
      {error !== undefined && <p className="dco-field-error" role="alert">{error}</p>}
    </div>
  </div>
}

/**
 * Matriarc's own notice when it has no navigator (dsh-matriarc src/client/index.ts, the `missing` notice of its "Enable
 * Matriarc" row): the same text and the same buttons, a candidate bundle each, else Plugins. The switches stay usable.
 */
export function MatriarcNavigatorNotice({ sessionId, t, load, open }: {
  sessionId: string | undefined; t: Translate
  load: (sessionId: string) => Promise<NavigatorNotice | undefined>
  open: (packageName?: string) => void
}) {
  const [notice, setNotice] = useState<NavigatorNotice | undefined>(undefined)
  useEffect(() => {
    setNotice(undefined)
    if (sessionId === undefined) return undefined
    let live = true
    load(sessionId).then((value) => { if (live) setNotice(value) }, () => {})
    return () => { live = false }
  }, [sessionId, load])
  if (notice === undefined) return null
  return <div className="dco-matriarc-notice" role="status" data-testid="dco-matriarc-navigator">
    <span>{t('matriarc.navigator.none')}</span>
    {notice.canOpen && <span className="dco-matriarc-actions">{notice.candidates.length === 0
      ? <button type="button" className="dco-matriarc-action" onClick={() => { open() }}>{t('matriarc.navigator.plugins')}</button>
      : notice.candidates.map(c => <button type="button" key={c.name} className="dco-matriarc-action" onClick={() => { open(c.name) }}>
        {t('matriarc.navigator.open', { name: c.title })}</button>)}</span>}
  </div>
}

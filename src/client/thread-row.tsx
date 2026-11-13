/**
 * Thread row pieces shared by the Coordinator page and the threads side pane, so a thread looks the same in both:
 * the status glyph, the status word with its tone, the one-line detail, the relative time and the folder.
 */
import { useEffect, useState } from 'react'
import type { FolderDecision, ThreadInfo, ThreadStatus } from './contract.ts'
import type { Translate } from './locales.ts'
import { FINISHED, needsUser } from './store.ts'
import { Button, StateDot, type DotState } from './ui.tsx'

export const DOT: Record<ThreadStatus, DotState> = {
  'starting': 'ongoing', 'running': 'ongoing', 'idle': 'idle',
  'waiting-approval': 'warning', 'waiting-question': 'warning', 'needs-user': 'warning',
  'done': 'done', 'failed': 'error', 'stopped': 'idle',
}

/** `~` for the home folder. Rows truncate long paths from the left, so the folder name stays visible. */
export function shortenCwd(cwd: string): string {
  return cwd.replace(/^\/(Users|home)\/[^/]+(?=\/|$)/, '~')
}

export function relativeTime(at: number, now: number, t: Translate): string {
  const seconds = Math.max(0, Math.round((now - at) / 1000))
  if (seconds < 45) return t('time.justNow')
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return t('time.minutes', { n: minutes })
  const hours = Math.round(minutes / 60)
  if (hours < 24) return t('time.hours', { n: hours })
  const days = Math.round(hours / 24)
  if (days === 1) return t('time.yesterday')
  if (days < 7) return t('time.days', { n: days })
  return new Date(at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** Re-render relative times every 30 s without touching thread data. */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => { setNow(Date.now()) }, 30_000)
    return () => { clearInterval(timer) }
  }, [])
  return now
}

/**
 * What it waits on or why it failed, what its team does while it runs, else its last report, else the host's
 * one-line detail.
 */
export function threadDetail(thread: ThreadInfo, t: Translate): string | undefined {
  const action = thread.action
  if (action?.kind === 'confirm-folder') return t('action.confirm.detail', { path: shortenCwd(action.path) })
  if (action?.kind === 'resume') return t(action.reason === 'wakes' ? 'action.resume.wakes' : action.reason === 'peers' ? 'action.resume.peers' : 'action.resume.budget', { n: action.count })
  const report = thread.lastReport
  // A finished Lead whose teammates still work: say so, archiving its coordinator stops them.
  const working = thread.team?.working ?? 0
  if (FINISHED.includes(thread.status) && working > 0) return t(working === 1 ? 'row.teamWorking.one' : 'row.teamWorking.other', { n: working })
  if ((needsUser(thread) || thread.status === 'failed') && thread.statusDetail !== undefined) return thread.statusDetail
  if (thread.status === 'running' && (thread.team?.working ?? 0) > 0 && thread.statusDetail !== undefined) return thread.statusDetail
  return report !== undefined ? `${t(`report.${report.kind}`)}: ${report.text}` : thread.statusDetail
}

export function ThreadGlyph({ status }: { status: ThreadStatus }) {
  return <span className="dco-glyph"><StateDot state={DOT[status] ?? 'idle'} /></span>
}

/** The status word, amber while the thread needs the user and red when it failed. */
export function ThreadStatusText({ thread, t }: { thread: ThreadInfo; t: Translate }) {
  return <span className="dco-meta dco-status" data-testid="dco-status" data-attention={needsUser(thread) || undefined}
    data-tone={thread.status === 'failed' ? 'danger' : undefined}>{t(`status.${thread.status}`)}</span>
}

export function ThreadTime({ at, now, t }: { at: number; now: number; t: Translate }) {
  return <time className="dco-row-time" dateTime={new Date(at).toISOString()}>{relativeTime(at, now, t)}</time>
}

/** Row tooltip: title and folder, the permission mode it runs in, and the team line when the lead works with members. */
export function threadTooltip(thread: ThreadInfo, t: Translate): string {
  const base = t('row.tooltip', { title: thread.title || thread.id, folder: shortenCwd(thread.cwd) })
  const team = thread.team
  const lines = [base]
  if (thread.permission !== undefined) lines.push(t(`row.mode.${thread.permission}`))
  if (team !== undefined) lines.push(t('row.team', { n: team.members, working: team.working }))
  return lines.join('\n')
}

/**
 * Open the session the user should look at: the team member's Session when a member waits on the user (its card is
 * there), else the thread lead's. Falls back to the lead when the member's Session cannot be opened.
 */
export async function openThreadSession(open: (sessionId: string) => Promise<void>, thread: ThreadInfo, openCoordinator?: () => Promise<void>): Promise<void> {
  // A thread that waits for its folder confirmation has no Session yet; its card is in the coordinator chat.
  if (thread.sessionId === '') {
    if (openCoordinator !== undefined) await openCoordinator()
    return
  }
  if (thread.attentionSessionId !== undefined && needsUser(thread)) {
    try {
      await open(thread.attentionSessionId)
      return
    } catch {
      // The member's Session is not in the client catalog; the lead's chat shows its activity.
    }
  }
  await open(thread.sessionId)
}

/** What the row's buttons call; each throws with a user-facing message on failure. */
export interface RowActionHandlers {
  confirmFolder(id: string, decision: FolderDecision): Promise<void>
  resumeThread(id: string): Promise<void>
}

/**
 * The buttons of a thread that waits for the user: Reject / Allow once / Always allow for a folder confirmation, in
 * the order and styles of dsh's own approval card, or Resume for a paused thread. `copy` takes dsh's approval
 * dictionary when it is loaded, so the labels read as dsh's own.
 */
export function ThreadActions({ thread, t, copy, handlers, onError, compact = false }: {
  thread: ThreadInfo; t: Translate; copy: (dshKey: string, ownKey: string) => string; handlers: RowActionHandlers
  onError: (thread: ThreadInfo, reason: string) => void; compact?: boolean
}) {
  const [busy, setBusy] = useState(false)
  const action = thread.action
  if (action === undefined) return null
  const run = (job: () => Promise<void>) => {
    setBusy(true)
    job().catch((error: unknown) => { onError(thread, error instanceof Error ? error.message : String(error)) }).finally(() => { setBusy(false) })
  }
  const size = 'sm'
  if (action.kind === 'confirm-folder') {
    return <div className="dco-row-actions" data-compact={compact || undefined} data-testid="dco-confirm" role="group" aria-label={t('action.confirm.detail', { path: action.path })}>
      {!compact && <p className="dco-row-actions-note"><bdi className="dco-row-actions-path">{action.path}</bdi> {t(`action.confirm.why.${action.why}`)}{' '}
        {t('action.confirm.always', { always: copy('allowAlways', 'action.allowAlways') })}</p>}
      <span className="dco-row-actions-buttons">
        <Button variant="outline" size={size} disabled={busy} data-testid="dco-confirm-deny" onClick={() => { run(() => handlers.confirmFolder(thread.id, 'deny')) }}>{copy('reject', 'action.deny')}</Button>
        <Button variant="outline" size={size} disabled={busy} data-testid="dco-confirm-once" onClick={() => { run(() => handlers.confirmFolder(thread.id, 'once')) }}>{copy('allowOnce', 'action.allowOnce')}</Button>
        <Button variant="primary" size={size} disabled={busy} data-testid="dco-confirm-always" onClick={() => { run(() => handlers.confirmFolder(thread.id, 'always')) }}>{copy('allowAlways', 'action.allowAlways')}</Button>
      </span>
    </div>
  }
  return <div className="dco-row-actions" data-compact={compact || undefined} data-testid="dco-paused" role="group">
    {!compact && <p className="dco-row-actions-note">{t('action.resume.why')}</p>}
    <span className="dco-row-actions-buttons">
      <Button variant="primary" size={size} disabled={busy} data-testid="dco-resume" onClick={() => { run(() => handlers.resumeThread(thread.id)) }}>{t('action.resume')}</Button>
    </span>
  </div>
}

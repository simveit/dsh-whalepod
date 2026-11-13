/**
 * Coordinator home (the sidebar's "Coordinator" page): heading with New coordinator, Choose folder and Type a path,
 * the global "Executor Sessions run in" control, page-level notices, the coordinator list and the selected
 * coordinator's detail (name with rename, chat action, archive, folder and executor prompt settings, folder and model
 * notices, its Executor Sessions grouped like the side pane), then rows without a coordinator and the allowed
 * folders. Layout, row pattern and empty state follow dsh's Automation tasks and Plugins pages; see styles.ts.
 */
import { memo, useEffect, useId, useState, type ReactNode } from 'react'
import type { CoordinatorInfo } from '../types.ts'
import type { FolderDecision, HostProblem, ModelHealth, ThreadInfo } from './contract.ts'
import { CoordinatorArt } from './art.tsx'
import { ExecutorPrompt } from './executor-prompt.tsx'
import { FolderLine, PathField, PickWait, TypePathButton, usePendingPick, type PickResult } from './folder.tsx'
import { CoordinatorName, Monogram } from './identity.tsx'
import { IconArchive, IconChat, IconChevron, IconTrash, IconWarning } from './icons.tsx'
import { plural, type Translate } from './locales.ts'
import type { ArchiveResult } from './remote.ts'
import {
  archivedThreadsOf, chatOf, countsOf, FINISHED, GROUPS, sentence, groupOf, isLoading, isWorking, nameOf, needsUser, orphanThreads, pickCoordinator, sortThreads, threadsOf,
  type Snapshot, type ThreadGroup,
} from './store.ts'
import { openThreadSession, threadDetail, threadTooltip, ThreadActions, ThreadGlyph, ThreadStatusText, ThreadTime, shortenCwd, useNow, type RowActionHandlers } from './thread-row.tsx'
import { Button, Tooltip } from './ui.tsx'
import { dshCopy, PermissionControl, PermissionNote } from './permission.tsx'
import type { ThreadPermission } from './contract.ts'

export type { PickResult } from './folder.tsx'
export { FolderLine } from './folder.tsx'

/** Selector hook over the shared coordinator snapshot (bound by the slot renderer from the inject `hooks`). */
export type UseCoordinator = <T>(select: (snapshot: Snapshot) => T) => T

export interface PanelActions {
  /** Open a coordinator's chat (reopening it when archived); without an id the last used one, or a new one. Throws with a user-facing message. */
  openCoordinator(coordinatorId?: string): Promise<void>
  /** Create a coordinator (in `home` when given), select it and open its chat. */
  newCoordinator(home?: string): Promise<void>
  /** Native folder picker: the desktop bridge, else the workspace UI's host picker. */
  pickFolder(): Promise<PickResult>
  /** Change the folder new Executor Sessions of a coordinator start in. */
  setCoordinatorFolder(coordinatorId: string, path: string): Promise<void>
  /** Save a coordinator's executor prompt (empty text clears it). */
  setExecutorPrompt(coordinatorId: string, text: string): Promise<void>
  /** Rename a coordinator; throws with the host's reason when the name is refused. */
  renameCoordinator(coordinatorId: string, name: string): Promise<void>
  /** Archive a coordinator; `force` also stops its working Executor Sessions; `removeWorkspace` removes its sidebar Workspace (files stay). */
  archiveCoordinator(coordinatorId: string, options: { force: boolean; removeWorkspace: boolean }): Promise<ArchiveResult>
  /** Remove an archived coordinator's entry (owner only); its Sessions, folders and files stay. */
  deleteCoordinator(coordinatorId: string): Promise<void>
  /** Show a coordinator on the page (per-browser view state). */
  select(coordinatorId: string): void
  /** Open an Executor Session in the chat UI. Throws with a user-facing message on failure. */
  openSession(sessionId: string): Promise<void>
  archiveThread(id: string): Promise<void>
  /** Set how new Executor Sessions run. Throws with a user-facing message on failure. */
  setThreadPermission(mode: ThreadPermission): Promise<void>
  /** Answer an Executor Session's folder confirmation. */
  confirmFolder(id: string, decision: FolderDecision): Promise<void>
  /** Remove a folder from the allowed folders. */
  removeAllowedFolder(path: string): Promise<void>
  /** Resume a paused Executor Session. */
  resumeThread(id: string): Promise<void>
  refresh(): void
  /** Poll fast while the page is shown; returns the release. */
  holdFast(): () => void
}

export interface PanelProps extends PanelActions {
  useCoordinator: UseCoordinator
  t: Translate
  /** dsh's own permission picker dictionary, when loaded (permission.tsx). */
  dshPermission?: Translate
  /** dsh's own approval card dictionary, when loaded: the confirmation buttons use its labels. */
  dshApproval?: Translate
}

/** A page notice: a short line, optionally under a bold title; `warning` for refusals the user can act on. */
interface Notice { text: string; title?: string; tone: 'danger' | 'warning' }

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}


const ThreadRow = memo(function ThreadRow({ thread, now, t, onOpen, onArchive, copy, handlers, onError, orphan = false }: {
  thread: ThreadInfo; now: number; t: Translate; onOpen: (thread: ThreadInfo) => void; onArchive: (thread: ThreadInfo) => Promise<void>
  copy: (dshKey: string, ownKey: string) => string; handlers: RowActionHandlers; onError: (thread: ThreadInfo, reason: string) => void
  /** A row without a coordinator: only Archive applies (no folder confirmation or resume). */
  orphan?: boolean
}) {
  const [archiving, setArchiving] = useState(false)
  const summaryId = useId()
  const attention = needsUser(thread)
  const finished = FINISHED.includes(thread.status) || orphan
  const detail = threadDetail(thread, t)
  const title = thread.title || thread.id
  return <li className="dco-item" data-testid="dco-thread" data-thread-id={thread.id} data-attention={attention || undefined}
    data-finished={FINISHED.includes(thread.status) || undefined} data-archivable={finished || undefined}>
    <button type="button" className="dco-row" aria-label={t('row.open', { title })} aria-describedby={summaryId}
      title={threadTooltip(thread, t)} onClick={() => { onOpen(thread) }}>
      <ThreadGlyph status={thread.status} />
      <span className="dco-row-content">
        <span className="dco-row-line">
          <span className="dco-row-title">{title}</span>
          <ThreadTime at={thread.updatedAt} now={now} t={t} />
        </span>
        <span className="dco-row-summary" id={summaryId}>
          <ThreadStatusText thread={thread} t={t} />
          {detail !== undefined && <span className="dco-meta">{detail}</span>}
        </span>
        <span className="dco-row-path"><bdi>{shortenCwd(thread.cwd)}</bdi></span>
      </span>
    </button>
    {!orphan && <ThreadActions thread={thread} t={t} copy={copy} handlers={handlers} onError={onError} />}
    {finished && <Tooltip label={t('row.archive')}>
      <button type="button" className="dco-icon-btn dco-archive" data-testid="dco-archive" disabled={archiving} aria-busy={archiving}
        aria-label={archiving ? t('row.archiving') : t('row.archiveAria', { title })}
        onClick={() => { setArchiving(true); void onArchive(thread).finally(() => { setArchiving(false) }) }}>
        <IconArchive size={16} />
      </button>
    </Tooltip>}
  </li>
})

/** The head's one-line count over all coordinators, each with a small tone dot. */
function Summary({ threads, t }: { threads: readonly ThreadInfo[]; t: Translate }) {
  const attention = threads.filter(needsUser).length
  const live = threads.filter(x => x.status === 'running' || x.status === 'starting').length
  const finished = threads.filter(x => FINISHED.includes(x.status)).length
  return <p className="dco-summary" data-testid="dco-summary">
    {threads.length > 0 && <>
      {attention > 0 && <span className="dco-stat" data-tone="warning">{t(plural('summary.attention', attention), { n: attention })}</span>}
      <span className="dco-stat" data-tone="running">{t('summary.running', { n: live })}</span>
      <span className="dco-stat" data-tone="finished">{t('summary.finished', { n: finished })}</span>
    </>}
  </p>
}

/** Placeholder of the coordinator list and detail while the state loads or the host still validates it. */
function PageSkeleton({ t }: { t: Translate }) {
  return <div className="dco-coords" aria-busy="true" aria-label={t('loading')} data-testid="dco-loading">
    <ul className="dco-clist" aria-hidden="true">
      {[0, 1].map(i => <li key={i} className="dco-skeleton dco-skeleton-crow"><span className="dco-skeleton-mono" />
        <span className="dco-skeleton-lines"><span className="dco-skeleton-bar" /><span className="dco-skeleton-bar" /></span></li>)}
    </ul>
    <div className="dco-detail" aria-hidden="true">
      <div className="dco-skeleton dco-skeleton-head"><span className="dco-skeleton-mono dco-skeleton-mono-lg" />
        <span className="dco-skeleton-lines"><span className="dco-skeleton-bar" /><span className="dco-skeleton-bar" /></span></div>
      <div className="dco-skeleton-card" />
      {[0, 1, 2].map(i => <div key={i} className="dco-skeleton"><span className="dco-skeleton-dot" />
        <span className="dco-skeleton-lines"><span className="dco-skeleton-bar" /><span className="dco-skeleton-bar" /><span className="dco-skeleton-bar" /></span></div>)}
    </div>
    <p className="dco-loading-note" role="status">{t('loading')}</p>
  </div>
}

function NoticeBox({ tone, icon = true, title, children, actions, testId, role = 'status' }: {
  tone?: 'warning' | 'danger'; icon?: boolean; title?: string; children?: ReactNode; actions?: ReactNode; testId?: string; role?: 'status' | 'alert' | 'note'
}) {
  return <div className="dco-notice" data-tone={tone} role={role} data-testid={testId}>
    {icon && <span className="dco-notice-icon"><IconWarning size={14} /></span>}
    <p className="dco-notice-text">{title !== undefined && <strong>{title}</strong>}
      {children !== undefined && (title !== undefined ? <span className="dco-notice-detail">{children}</span> : children)}</p>
    {actions !== undefined && <span className="dco-notice-actions">{actions}</span>}
  </div>
}

function ModelNotice({ health, t, onChoose, busy }: { health: ModelHealth; t: Translate; onChoose: () => void; busy: boolean }) {
  // Per coordinator since round 2: the notice sits in that coordinator's detail and opens its chat.
  const reason = health.reason ?? 'no-model'
  return <NoticeBox tone="warning" testId="dco-model" title={t('model.title')}
    actions={reason !== 'no-provider' ? <Button variant="outline" size="sm" disabled={busy} onClick={onChoose}>{t('model.action')}</Button> : undefined}>
    {t(`model.${reason}`, { model: health.model ?? '' })}
  </NoticeBox>
}

/** Folders the user chose "Always allow" for, each removable. Shown only when the list has entries. */
function AllowedFolders({ folders, t, onRemove }: { folders: readonly string[]; t: Translate; onRemove: (path: string) => Promise<void> }) {
  const labelId = useId()
  const [busy, setBusy] = useState<string | undefined>(undefined)
  if (folders.length === 0) return null
  return <section className="dco-section" data-testid="dco-allowed" aria-labelledby={labelId}>
    <h2 className="dco-section-title" id={labelId}>{t('allowed.title')}</h2>
    <p className="dco-section-desc">{t('allowed.description')}</p>
    <ul className="dco-allowed-list">
      {folders.map(path => <li key={path} className="dco-allowed-item">
        <span className="dco-allowed-path" title={path}><bdi dir="ltr">{shortenCwd(path)}</bdi></span>
        <Button variant="ghost" size="sm" disabled={busy === path} aria-label={t('allowed.removeAria', { path })} data-testid="dco-allowed-remove"
          onClick={() => { setBusy(path); void onRemove(path).finally(() => { setBusy(undefined) }) }}>{t('allowed.remove')}</Button>
      </li>)}
    </ul>
  </section>
}

function ProblemNotice({ problem, t }: { problem: HostProblem; t: Translate }) {
  const tone = problem.kind === 'state-reset' || problem.kind === 'state-dropped' || problem.kind === 'auto-unavailable' || problem.kind === 'not-ready' ? 'warning' : 'danger'
  return <div className="dco-notice" data-tone={tone} role="status" data-testid="dco-problem" data-kind={problem.kind}>
    <span className="dco-notice-icon"><IconWarning size={14} /></span>
    <p className="dco-notice-text"><strong>{t(`problem.${problem.kind}`)}</strong><span className="dco-notice-detail">{problem.detail}</span></p>
  </div>
}

/** One line of a coordinator's counts: needs you, running, or "No Executor Sessions". */
function CoordinatorCounts({ counts, t }: { counts: { attention: number; running: number; total: number }; t: Translate }) {
  if (counts.total === 0) return <span className="dco-meta">{t('coordinator.none')}</span>
  return <>
    {counts.attention > 0 && <span className="dco-meta dco-summary-attn">{t(plural('summary.attention', counts.attention), { n: counts.attention })}</span>}
    <span className="dco-meta">{t('summary.running', { n: counts.running })}</span>
  </>
}

function CoordinatorList({ coordinators, selectedId, snapshot, t, onSelect }: {
  coordinators: readonly CoordinatorInfo[]; selectedId: string | undefined; snapshot: Snapshot; t: Translate; onSelect: (id: string) => void
}) {
  return <ul className="dco-clist" data-testid="dco-coordinators" aria-label={t('coordinators.label')}>
    {coordinators.map((c) => {
      const counts = countsOf(snapshot.state, c.id)
      const selected = c.id === selectedId
      const name = nameOf(c)
      const archived = c.archived === true
      const chat = chatOf(c)
      const refused = c.folderProblem !== undefined && !archived
      return <li key={c.id} className="dco-citem" data-coordinator-id={c.id} data-archived={archived || undefined}>
        <button type="button" className="dco-crow" data-testid="dco-coordinator" aria-current={selected ? 'true' : undefined}
          aria-label={t('coordinator.select', { title: name })} title={`${c.title}\n${shortenCwd(c.home)}`} onClick={() => { onSelect(c.id) }}>
          <Monogram name={name} size="sm" muted={archived} />
          <span className="dco-row-content">
            <span className="dco-row-line">
              <span className="dco-row-title">{name}</span>
              {refused && <span className="dco-crow-flag" role="img" aria-label={t('coordinator.tag.folderProblem')} data-testid="dco-coordinator-refused"><IconWarning size={13} /></span>}
              {archived && <span className="dco-tag">{t('coordinator.tag.archived')}</span>}
            </span>
            <span className="dco-crow-meta">
              <CoordinatorCounts counts={counts} t={t} />
              {!archived && chat !== 'open' && <span className="dco-meta" data-testid="dco-coordinator-chat">{t(`coordinator.tag.chat.${chat}`)}</span>}
            </span>
          </span>
        </button>
      </li>
    })}
  </ul>
}

/**
 * Archive coordinator: an inline confirmation naming the Executor Sessions that still work by the host's rule (they
 * are stopped too). When the host still refuses a plain Archive, its reason shows and the button turns into Stop and
 * archive.
 */
function ArchiveConfirm({ coordinator, working, t, onCancel, onConfirm }: {
  coordinator: CoordinatorInfo; working: readonly ThreadInfo[]; t: Translate; onCancel: () => void
  onConfirm: (force: boolean, removeWorkspace: boolean) => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [removeWorkspace, setRemoveWorkspace] = useState(false)
  const [refused, setRefused] = useState<string | undefined>(undefined)
  const force = working.length > 0 || refused !== undefined
  const title = t('archiveCoordinator.title', { title: nameOf(coordinator) })
  const confirm = async () => {
    setBusy(true)
    try {
      await onConfirm(force, removeWorkspace)
    } catch (error) {
      if (!force) setRefused(sentence(errorText(error)))
      else throw error
    } finally {
      setBusy(false)
    }
  }
  return <div className="dco-confirm" role="alertdialog" aria-label={title} data-testid="dco-archive-confirm" data-force={force || undefined}>
    <p className="dco-confirm-title">{title}</p>
    <p className="dco-confirm-body">{t('archiveCoordinator.body')}</p>
    {working.length > 0 && <div className="dco-confirm-working" data-testid="dco-archive-working">
      <p className="dco-confirm-body">{t(plural('archiveCoordinator.stops', working.length), { n: working.length })}</p>
      <ul className="dco-confirm-list">
        {working.map(thread => <li key={thread.id}>
          <ThreadGlyph status={thread.status} />
          <span className="dco-confirm-item">{thread.title || thread.id}</span>
          <span className="dco-confirm-status">{(thread.team?.working ?? 0) > 0 && FINISHED.includes(thread.status)
            ? t(plural('archiveCoordinator.teammates', thread.team!.working), { n: thread.team!.working }) : t(`status.${thread.status}`)}</span>
        </li>)}
      </ul>
    </div>}
    {refused !== undefined && <p className="dco-confirm-refused" role="alert" data-testid="dco-archive-refused">
      <strong>{t('archiveCoordinator.refused')}</strong> {refused}</p>}
    <label className="dco-check">
      <input type="checkbox" checked={removeWorkspace} disabled={busy} data-testid="dco-archive-remove-workspace"
        onChange={(event) => { setRemoveWorkspace(event.currentTarget.checked) }} />
      <span>{t('archiveCoordinator.removeWorkspace')}
        <span className="dco-check-note">{t('archiveCoordinator.removeWorkspace.note')}</span></span>
    </label>
    <div className="dco-confirm-actions">
      <Button variant="ghost" size="sm" disabled={busy} onClick={onCancel}>{t('archiveCoordinator.cancel')}</Button>
      <Button variant="primary" size="sm" disabled={busy} aria-busy={busy} data-testid="dco-archive-coordinator-confirm"
        onClick={() => { void confirm().catch(() => undefined) }}>
        {t(force ? 'archiveCoordinator.force' : 'archiveCoordinator.confirm')}</Button>
    </div>
  </div>
}

/**
 * A coordinator's archived Executor Sessions, collapsed under one heading. The rows only inform: an archived Session
 * is reopened from dsh's sidebar (with its archive shown), not from here.
 */
function ArchivedGroup({ rows, now, t }: { rows: readonly ThreadInfo[]; now: number; t: Translate }) {
  const [open, setOpen] = useState(false)
  const listId = useId()
  return <section className="dco-tgroup dco-archived-group" data-testid="dco-group-archived">
    <button type="button" className="dco-tgroup-head dco-tgroup-toggle" aria-expanded={open} aria-controls={listId} data-testid="dco-archived-toggle"
      onClick={() => { setOpen(!open) }}>
      <span>{t('group.archived')}</span><span className="dco-pgroup-count">{rows.length}</span>
      <span className="dco-pgroup-chevron" data-expanded={open || undefined}><IconChevron size={12} /></span>
    </button>
    {open && <>
      <p className="dco-archived-note">{t('archived.note')}</p>
      <ul className="dco-list" id={listId} aria-label={t('group.archived')}>
        {rows.map((thread) => {
          const detail = threadDetail(thread, t)
          return <li key={thread.id} className="dco-item" data-finished data-archived-row data-testid="dco-archived-thread" title={threadTooltip(thread, t)}>
            <div className="dco-row dco-row-static">
              <ThreadGlyph status={thread.status} />
              <span className="dco-row-content">
                <span className="dco-row-line">
                  <span className="dco-row-title">{thread.title || thread.id}</span>
                  <ThreadTime at={thread.updatedAt} now={now} t={t} />
                </span>
                <span className="dco-row-summary"><ThreadStatusText thread={thread} t={t} />{detail !== undefined && <span className="dco-meta">{detail}</span>}</span>
              </span>
            </div>
          </li>
        })}
      </ul>
    </>}
  </section>
}

/** Delete an archived coordinator: only its entry goes; its Sessions, folders and files stay. */
function DeleteConfirm({ coordinator, archivedCount, t, onCancel, onConfirm }: {
  coordinator: CoordinatorInfo; archivedCount: number; t: Translate; onCancel: () => void; onConfirm: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const title = t('deleteCoordinator.title', { title: nameOf(coordinator) })
  return <div className="dco-confirm" role="alertdialog" aria-label={title} data-testid="dco-delete-confirm">
    <p className="dco-confirm-title">{title}</p>
    <p className="dco-confirm-body">{t('deleteCoordinator.body')}</p>
    {archivedCount > 0 && <p className="dco-confirm-body dco-confirm-quiet">{t(plural('deleteCoordinator.archived', archivedCount), { n: archivedCount })}</p>}
    <div className="dco-confirm-actions">
      <Button variant="ghost" size="sm" disabled={busy} onClick={onCancel}>{t('deleteCoordinator.cancel')}</Button>
      <Button variant="primary" size="sm" disabled={busy} aria-busy={busy} data-testid="dco-delete-coordinator-confirm"
        onClick={() => { setBusy(true); void onConfirm().finally(() => { setBusy(false) }) }}>{t('deleteCoordinator.confirm')}</Button>
    </div>
  </div>
}

export function CoordinatorPanel({ useCoordinator, t, dshPermission, dshApproval, openCoordinator, newCoordinator, pickFolder, setCoordinatorFolder,
  setExecutorPrompt, renameCoordinator, archiveCoordinator, deleteCoordinator, select, openSession, archiveThread, setThreadPermission, confirmFolder, removeAllowedFolder,
  resumeThread, refresh, holdFast }: PanelProps) {
  const snapshot = useCoordinator(s => s)
  const now = useNow()
  // What runs now: 'new', 'choose', or 'open:<coordinator id>'.
  const [busy, setBusy] = useState<string | undefined>(undefined)
  const [notice, setNotice] = useState<Notice | undefined>(undefined)
  const [newPath, setNewPath] = useState(false)
  const [archiving, setArchiving] = useState<string | undefined>(undefined)
  const [deleting, setDeleting] = useState<string | undefined>(undefined)
  // A neutral one-line notice (not an error), e.g. why an archived coordinator's Workspace was kept.
  const [info, setInfo] = useState<string | undefined>(undefined)
  const pick = usePendingPick(pickFolder)
  useEffect(() => holdFast(), [holdFast])

  const state = snapshot.state
  const loading = isLoading(state)
  const coordinators = loading ? [] : state?.coordinators ?? []
  const selected = loading ? undefined : pickCoordinator(state, snapshot.selected)
  const orphans = loading ? [] : sortThreads(orphanThreads(state))
  const fake = snapshot.source === 'fake'
  const problems = state?.problems ?? (state?.problem === undefined ? [] : [state.problem])
  const baseProblem = state?.base?.problem
  // A host that cannot serve (another window owns the data, or dsh services are missing) cannot create either.
  const hostDown = problems.some(p => p.kind === 'locked' || p.kind === 'not-ready') && coordinators.length === 0
  const copy = dshCopy(dshApproval, t)
  const handlers: RowActionHandlers = {
    confirmFolder: async (id, decision) => { await confirmFolder(id, decision); refresh() },
    resumeThread: async (id) => { await resumeThread(id); refresh() },
  }
  const say = (text: string, tone: Notice['tone'] = 'danger', title?: string) => {
    setNotice(title === undefined ? { text, tone } : { text, tone, title })
  }
  const actionError = (thread: ThreadInfo, reason: string) => { say(t('error.action', { title: thread.title, reason })) }

  const run = async (key: string, job: () => Promise<void>, failure: (reason: string) => void) => {
    setBusy(key); setNotice(undefined)
    try {
      await job()
    } catch (error) {
      failure(errorText(error))
    } finally {
      setBusy(undefined)
    }
  }
  const openChat = (coordinator: CoordinatorInfo) => {
    const reopen = coordinator.archived === true || chatOf(coordinator) !== 'open'
    return run(`open:${coordinator.id}`, () => openCoordinator(coordinator.id), (reason) => {
      // A refused Reopen (D5) is a short notice the user can act on, not a raw error.
      if (reopen) say(sentence(reason), 'warning', t('error.reopen', { title: nameOf(coordinator) }))
      else say(t('error.open', { reason }))
    })
  }
  const create = (home?: string) => run(home === undefined ? 'new' : 'choose', async () => { await newCoordinator(home); setNewPath(false) },
    reason => { say(t('error.create', { reason })) })
  const choose = async () => {
    setNotice(undefined)
    const picked = await pick.start()
    if (picked.kind === 'picked') await create(picked.path)
    else if (picked.kind === 'unavailable' || picked.kind === 'timeout') setNewPath(true)
  }
  const typePath = () => { pick.cancel(); setNotice(undefined); setNewPath(true) }
  const openThread = (thread: ThreadInfo) => {
    setNotice(undefined)
    // A row without a coordinator that waits for its folder has nothing to open (L7): say so instead.
    if (thread.sessionId === '' && thread.coordinatorId === '') { say(t('orphans.noSession', { title: thread.title || thread.id }), 'warning'); return }
    openThreadSession(openSession, thread, thread.coordinatorId === '' ? undefined : () => openCoordinator(thread.coordinatorId)).catch((error: unknown) => {
      say(t('error.openThread', { title: thread.title, reason: errorText(error) }))
    })
  }
  const archive = async (thread: ThreadInfo) => {
    try {
      await archiveThread(thread.id)
      refresh()
    } catch (error) {
      say(t('error.archive', { title: thread.title, reason: errorText(error) }))
    }
  }
  const setFolder = async (coordinatorId: string, path: string) => { await setCoordinatorFolder(coordinatorId, path); refresh() }

  const failed = snapshot.error !== undefined
  const errorNotice = failed && <div className="dco-notice" data-tone="danger" role="alert" data-testid="dco-error">
    <span className="dco-notice-icon"><IconWarning size={14} /></span>
    <p className="dco-notice-text">{snapshot.unreachable ? t('error.unreachable') : t('error.failed')}
      {state !== undefined && ` ${t('error.stale')}`}
      <span className="dco-notice-detail">{snapshot.error}</span></p>
    <span className="dco-notice-actions"><Button variant="outline" size="sm" onClick={refresh}>{t('error.retry')}</Button></span>
  </div>

  const threadRows = (rows: readonly ThreadInfo[], orphan: boolean, label: string) => <ul className="dco-list" data-testid={orphan ? 'dco-orphans' : 'dco-threads'} aria-label={label}>
    {rows.map(thread => <ThreadRow key={thread.id} thread={thread} now={now} t={t} onOpen={openThread} onArchive={archive}
      copy={copy} handlers={handlers} onError={actionError} orphan={orphan} />)}
  </ul>

  let detail: ReactNode = null
  if (selected !== undefined) {
    const archived = selected.archived === true
    const chat = chatOf(selected)
    const chatGone = chat !== 'open'
    const archivedRows = archivedThreadsOf(state, selected.id)
    const opening = busy === `open:${selected.id}`
    const own = sortThreads(threadsOf(state, selected.id))
    const working = own.filter(isWorking)
    const health = selected.model
    const name = nameOf(selected)
    const headingId = `dco-detail-${selected.id}`
    const groups = new Map<ThreadGroup, ThreadInfo[]>()
    for (const thread of own) groups.set(groupOf(thread), [...(groups.get(groupOf(thread)) ?? []), thread])
    const chatLabel = opening ? t('opening') : archived ? t('reopenCoordinator') : t(chat === 'none' ? 'startChat' : chatGone ? 'reopenChat' : 'openChat')
    const chatHint = archived ? t('reopenCoordinator.hint') : t(`chatHint.${chat}`)
    const subtitle = archived ? t('coordinator.archivedNote') : chatGone ? t(`coordinator.chatNote.${chat}`)
      : selected.title !== '' && !selected.title.includes(name) ? t('coordinator.chatTitle', { title: selected.title }) : shortenCwd(selected.home)
    detail = <section className="dco-detail" data-testid="dco-detail" data-coordinator-id={selected.id} data-archived={archived || undefined} aria-labelledby={headingId}>
      <div className="dco-detail-head">
        <Monogram name={name} size="lg" muted={archived} />
        <div className="dco-detail-id">
          <CoordinatorName key={selected.id} coordinator={selected} coordinators={coordinators} t={t} headingId={headingId} disabled={archived}
            onRename={async (next) => { await renameCoordinator(selected.id, next); refresh() }} />
          <p className="dco-detail-sub" data-testid="dco-detail-sub">{subtitle}</p>
        </div>
        <span className="dco-detail-actions">
          <Tooltip label={chatHint}>
            <Button variant="outline" size="head" icon={<IconChat size={14} />} data-testid="dco-open-chat" data-reopen={archived || chatGone || undefined}
              disabled={opening} aria-busy={opening} onClick={() => { void openChat(selected) }}>{chatLabel}</Button>
          </Tooltip>
          {archived && <Tooltip label={t('deleteCoordinator')}>
            <button type="button" className="dco-icon-btn" data-testid="dco-delete-coordinator" aria-label={t('deleteCoordinator')}
              aria-expanded={deleting === selected.id} onClick={() => { setDeleting(deleting === selected.id ? undefined : selected.id) }}>
              <IconTrash size={16} />
            </button>
          </Tooltip>}
          {!archived && <Tooltip label={t('archiveCoordinator')}>
            <button type="button" className="dco-icon-btn" data-testid="dco-archive-coordinator" aria-label={t('archiveCoordinator')}
              aria-expanded={archiving === selected.id} onClick={() => { setArchiving(archiving === selected.id ? undefined : selected.id) }}>
              <IconArchive size={16} />
            </button>
          </Tooltip>}
        </span>
      </div>
      {archiving === selected.id && !archived && <ArchiveConfirm key={selected.id} coordinator={selected} working={working} t={t} onCancel={() => { setArchiving(undefined) }}
        onConfirm={async (force, removeWorkspace) => {
          let result: ArchiveResult
          try {
            result = await archiveCoordinator(selected.id, { force, removeWorkspace })
          } catch (error) {
            // Without force the confirmation shows the host's reason itself and offers Stop and archive.
            if (!force) throw error
            say(t('error.archiveCoordinator', { title: name, reason: errorText(error) }))
            setArchiving(undefined)
            return
          }
          setArchiving(undefined)
          refresh()
          // Only a Workspace the user asked to remove and the host kept gets a word; a host without the field says nothing.
          if (removeWorkspace && result.workspace !== undefined && result.workspace !== 'removed' && result.workspace !== 'not-asked') {
            // Removing it failed: the coordinator is archived anyway, the Workspace stays (a warning, not a neutral line).
            if (result.workspace === 'failed') say(t('archiveCoordinator.workspace.failed', { title: name }), 'warning')
            else setInfo(t(`archiveCoordinator.workspace.${result.workspace}`, { title: name }))
          }
        }} />}
      {deleting === selected.id && archived && <DeleteConfirm key={`delete-${selected.id}`} coordinator={selected} archivedCount={archivedRows.length} t={t}
        onCancel={() => { setDeleting(undefined) }}
        onConfirm={async () => {
          try {
            await deleteCoordinator(selected.id)
            setDeleting(undefined)
            refresh()
          } catch (error) {
            setDeleting(undefined)
            say(sentence(errorText(error)), 'warning', t('error.delete', { title: name }))
          }
        }} />}
      {selected.folderProblem !== undefined && !archived && <NoticeBox tone="warning" testId="dco-folder-problem" title={t('folder.problem.title')}>
        {selected.folderProblem}</NoticeBox>}
      {health !== undefined && !health.ok && !archived && <ModelNotice health={health} t={t} busy={opening} onChoose={() => { void openChat(selected) }} />}
      <div className="dco-settings" data-testid="dco-settings">
        <FolderLine key={`folder-${selected.id}`} coordinator={selected} t={t} pickFolder={pickFolder} setFolder={setFolder} />
        <ExecutorPrompt key={`prompt-${selected.id}`} coordinator={selected} t={t}
          onSave={async (id, text) => { await setExecutorPrompt(id, text); refresh() }} />
      </div>
      <div className="dco-threads-head">
        <h3 className="dco-section-title">{t('threads.label')}</h3>
        {own.length > 0 && <span className="dco-section-count">{own.length}</span>}
      </div>
      {own.length === 0
        ? <div className="dco-empty dco-empty-inline" role="status" data-testid="dco-empty">
          <p className="dco-empty-title">{t('empty.title')}</p>
          <p>{t(archived ? 'empty.archived' : 'empty.body')}</p>
        </div>
        : GROUPS.map((group) => {
          const rows = groups.get(group)
          if (rows === undefined) return null
          return <section key={group} className="dco-tgroup" data-testid={`dco-group-${group}`} aria-label={t(`group.${group}`)}>
            <h4 className="dco-tgroup-head"><span>{t(`group.${group}`)}</span>
              <span className="dco-pgroup-count" data-attention={group === 'attention' || undefined}>{rows.length}</span></h4>
            {threadRows(rows, false, t(`group.${group}`))}
          </section>
        })}
      {archivedRows.length > 0 && <ArchivedGroup key={`archived-${selected.id}`} rows={archivedRows} now={now} t={t} />}
    </section>
  }

  let body: ReactNode
  if (state === undefined) {
    body = failed ? <div className="dco-empty" role="alert">{errorNotice}</div> : <PageSkeleton t={t} />
  } else if (loading) {
    body = <PageSkeleton t={t} />
  } else if (coordinators.length === 0) {
    body = <div className="dco-empty dco-empty-page" role="status" data-testid="dco-empty-coordinators">
      <CoordinatorArt />
      <p className="dco-empty-title">{t('empty.coordinators.title')}</p>
      <p>{t('empty.coordinators.body')}</p>
      <div className="dco-empty-actions">
        <Button variant="outline" disabled={busy !== undefined || baseProblem !== undefined || hostDown || pick.pending} aria-busy={busy === 'new'}
          data-testid="dco-empty-new" onClick={() => { void create() }}>{busy === 'new' ? t('newCoordinator.busy') : t('newCoordinator')}</Button>
      </div>
      <PermissionNote state={state?.threadPermission} t={t} onPage />
    </div>
  } else {
    body = <div className="dco-coords">
      <CoordinatorList coordinators={coordinators} selectedId={selected?.id} snapshot={snapshot} t={t} onSelect={(id) => { setNotice(undefined); select(id) }} />
      {detail}
    </div>
  }

  const newDisabled = busy !== undefined || baseProblem !== undefined || loading || hostDown
  return <div className="dco-page" data-testid="dsh-coordinator-panel">
    <div className="dco-scroll">
      <div className="dco-content">
        <div className="dco-head">
          <div className="dco-heading">
            <h1 tabIndex={-1}>{t('title')}</h1>
            <p className="dco-intro">{t('description')}</p>
            {!loading && <Summary threads={state?.threads ?? []} t={t} />}
          </div>
          <div className="dco-actions">
            <TypePathButton t={t} disabled={newDisabled} onClick={typePath} label={t('chooseFolder.typeAria')} />
            <Tooltip label={t('chooseFolder.hint')}>
              <Button variant="outline" size="head" data-testid="dco-choose-folder" disabled={newDisabled || pick.pending} aria-busy={busy === 'choose' || pick.pending}
                onClick={() => { void choose() }}>{t('chooseFolder')}</Button>
            </Tooltip>
            <Button variant="primary" size="head" icon={<IconChat size={14} />} data-testid="dco-new-coordinator" disabled={newDisabled || pick.pending}
              aria-busy={busy === 'new'} onClick={() => { void create() }}>{busy === 'new' ? t('newCoordinator.busy') : t('newCoordinator')}</Button>
          </div>
          <div className="dco-head-perm">
            <PermissionControl state={state?.threadPermission} t={t} dsh={dshPermission}
              onSet={async (mode) => { await setThreadPermission(mode); refresh() }} />
          </div>
        </div>
        {pick.pending && <PickWait slow={pick.slow} t={t} onType={typePath} onCancel={pick.cancel} />}
        {newPath && <PathField label={t('chooseFolder.label')} hint={t('folder.manual')} initial={state?.base?.path ?? ''} submit={t('chooseFolder.create')}
          busy={busy === 'choose'} t={t} onSubmit={(path) => { void create(path) }} onCancel={() => { setNewPath(false) }} />}
        {__DSH_COORDINATOR_DEV__ && fake && <p className="dco-dev-note" data-testid="dco-fake">Fake data source (?coordinatorSource=real to switch back)</p>}
        {problems.map(problem => <ProblemNotice key={problem.kind} problem={problem} t={t} />)}
        {baseProblem !== undefined && !problems.some(p => p.kind === 'bad-root') && <NoticeBox tone="warning" testId="dco-base-problem">
          {t('base.problem', { reason: baseProblem })}</NoticeBox>}
        {notice !== undefined && <NoticeBox tone={notice.tone} role="alert" testId="dco-notice" title={notice.title}
          actions={<Button variant="ghost" size="sm" onClick={() => { setNotice(undefined) }}>{t('notice.dismiss')}</Button>}>{notice.text}</NoticeBox>}
        {info !== undefined && <NoticeBox icon={false} testId="dco-info"
          actions={<Button variant="ghost" size="sm" onClick={() => { setInfo(undefined) }}>{t('notice.dismiss')}</Button>}>{info}</NoticeBox>}
        {state !== undefined && errorNotice}
        {body}
        {orphans.length > 0 && <section className="dco-section" aria-labelledby="dco-orphans-title">
          <h2 className="dco-section-title" id="dco-orphans-title">{t('orphans.title')}</h2>
          <p className="dco-section-desc">{t('orphans.description')}</p>
          {threadRows(orphans, true, t('orphans.title'))}
        </section>}
        <AllowedFolders folders={loading ? [] : state?.allowedFolders ?? []} t={t}
          onRemove={async (path) => {
            try {
              await removeAllowedFolder(path)
              refresh()
            } catch (error) {
              say(errorText(error))
            }
          }} />
      </div>
    </div>
  </div>
}

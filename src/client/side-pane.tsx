/**
 * Threads side pane: a page-type tab in dsh's right Sidebar (`ctx.sidebarRightTabs` + the keyed
 * `sidebar.right.pane.tab` seat), shown beside the coordinator chat and thread sessions.
 *
 * It is scoped to one coordinator: in a coordinator chat it lists that coordinator's Executor Sessions, in an Executor
 * Session its siblings, under a top row that names the coordinator and opens its chat, and the coordinator's folder
 * with Change. Rows are grouped like a project sidebar (needs you, running, idle, finished; newest first in each
 * group). It reads the same `CoordinatorStore` as the page.
 *
 * Opening. The tab type has no guide entry, so dsh's guide page and its default-page rule stay untouched for every
 * other session. Whenever the coordinator chat or a thread comes on screen with its right column collapsed, the pane
 * opens, unless the user closed it before: collapsing the column while the pane is in it, or closing the pane, is
 * remembered per browser until the header button (chrome.tsx) opens it again. A column the user already uses for
 * something else is left alone. Below 768px dsh would open it fullscreen over the conversation, so it never opens by
 * itself there.
 */
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import type { ThreadInfo } from './contract.ts'
import { FolderLine, type PickResult } from './folder.tsx'
import { Monogram } from './identity.tsx'
import { IconChevron, IconCoordinator, IconOverview, IconWarning } from './icons.tsx'
import { NS, type Translate } from './locales.ts'
import type { UseCoordinator } from './panel.tsx'
import {
  coordinatorById, GROUPS, groupOf, isLoading, nameOf, pickCoordinator, roleOf, sortThreads, threadsOf, type CoordinatorStore, type ThreadGroup,
} from './store.ts'
import { dshCopy } from './permission.tsx'
import { openThreadSession, threadDetail, threadTooltip, ThreadActions, ThreadGlyph, ThreadStatusText, ThreadTime, shortenCwd, useNow, type RowActionHandlers } from './thread-row.tsx'
import { Button, Tooltip } from './ui.tsx'

/** Tab kind (what `openTab` names) and implementation id (the key the body registers under). */
export const PANE_KIND = 'dsh-coordinator.threads'
export const PANE_ID = 'dsh-coordinator/threads'

/** dsh opens the right Sidebar fullscreen below this width (ui-sidebar-right "Presentations"). */
const NARROW_PX = 768
const PREF_KEY = 'dsh-coordinator:pane'
const FINISHED_KEY = 'dsh-coordinator:pane-finished'

export type PaneRole = 'coordinator' | 'thread'
/** `roleOf(snapshot, sessionId)` lives in store.ts (pure, tested there); re-exported for older imports. */
export { roleOf } from './store.ts'

// ---- dsh right Sidebar faces (the parts used here; rc.2 `ISidebarRight` / `SidebarRightTabRegistry`) ----

interface Observable<T> { getSnapshot(): T; subscribe(listener: () => void): () => void }
export interface SidebarRight {
  readonly mounted: Observable<string | undefined>
  readonly openTabs?: Observable<readonly { sessionId: string; tabId: string; kind: string }[]>
  openTab(kind: string, options?: Record<string, unknown>): void
  isExpanded(): boolean
  toggleExpanded(): void
  active(): { kind: string } | undefined
  closeIn?(sessionId: string, tabId: string): void
}
export interface SidebarRightTabs {
  register(definition: { id: string; kind: string; priority?: string; title: (address: string) => string }): () => void
}
interface TabInfo {
  sidebar: { expanded: boolean; fullscreen: boolean }
  tab: { visible: boolean }
}

// ---- per-browser memory; every access may throw (private mode, blocked storage) ----

function read(key: string): string | null {
  try { return window.localStorage.getItem(key) } catch { return null }
}
function write(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, value)
  } catch { /* storage unavailable: the choice lasts for this page only */ }
}
// ---- controller ----

export interface PaneController {
  /** Whether the pane shows in the on-screen session's right column. */
  shown(): boolean
  /** Header button: collapse the pane when it shows, else open it (and forget an earlier close). */
  toggle(): void
  /** The pane's column was collapsed or the pane left it; remembers a user close. */
  hidden(sessionId: string): void
  /** Hide the pane before navigating away when dsh shows it fullscreen (narrow windows). */
  leaveFullscreen(): void
  dispose(): void
}

export function createPaneController(sidebar: SidebarRight, store: CoordinatorStore): PaneController {
  let suppressHide = false
  let retry: ReturnType<typeof setTimeout> | undefined
  const narrow = () => window.innerWidth < NARROW_PX
  const shown = () => sidebar.mounted.getSnapshot() !== undefined && sidebar.isExpanded() && sidebar.active()?.kind === PANE_KIND

  // The Session's seat mints its surface store in the commit that mounts it, so a command may run before it is
  // ready and throw; try again a few times on the same Session.
  const open = (sessionId: string, attempt = 0) => {
    clearTimeout(retry)
    if (sidebar.mounted.getSnapshot() !== sessionId) return
    try {
      sidebar.openTab(PANE_KIND)
    } catch {
      if (attempt < 10) retry = setTimeout(() => { open(sessionId, attempt + 1) }, 50)
    }
  }

  // Decide once per arrival of a Session on screen, as soon as the store knows whether it is ours.
  let decided: string | undefined
  const evaluate = () => {
    const sessionId = sidebar.mounted.getSnapshot()
    if (sessionId !== decided) decided = undefined
    if (sessionId === undefined || decided !== undefined) return
    if (roleOf(store.getSnapshot(), sessionId) === undefined) return
    decided = sessionId
    if (read(PREF_KEY) === 'off' || narrow()) return
    // Wait for the commit that mounts the Session's seat, then leave a column the user already uses alone.
    retry = setTimeout(() => {
      if (sidebar.mounted.getSnapshot() !== sessionId) return
      try { if (sidebar.isExpanded()) return } catch { /* store not ready: open() retries */ }
      open(sessionId)
    }, 0)
  }

  const stopMounted = sidebar.mounted.subscribe(evaluate)
  const stopStore = store.subscribe(evaluate)
  evaluate()

  return {
    shown,
    toggle() {
      const sessionId = sidebar.mounted.getSnapshot()
      if (sessionId === undefined) return
      if (shown()) {
        sidebar.toggleExpanded()
        write(PREF_KEY, 'off')
      } else {
        write(PREF_KEY, null)
        open(sessionId)
      }
    },
    hidden(sessionId) {
      if (suppressHide) return
      // Decide after the change settles: a Session switch or a global panel is not a close.
      setTimeout(() => {
        if (suppressHide || sidebar.mounted.getSnapshot() !== sessionId) return
        try { if (!sidebar.isExpanded()) write(PREF_KEY, 'off') } catch { /* no surface */ }
      }, 0)
    },
    leaveFullscreen() {
      if (!narrow() || !shown()) return
      suppressHide = true
      try { sidebar.toggleExpanded() } finally { setTimeout(() => { suppressHide = false }, 0) }
    },
    dispose() {
      suppressHide = true
      clearTimeout(retry)
      stopMounted()
      stopStore()
      // Leave no tab of an unloaded type behind in the open layouts (dsh's guidance for right-Sidebar widgets).
      const tabs = sidebar.openTabs?.getSnapshot() ?? []
      for (const tab of tabs) if (tab.kind === PANE_KIND) sidebar.closeIn?.(tab.sessionId, tab.tabId)
    },
  }
}

// ---- body ----

export interface PaneActions extends RowActionHandlers {
  openThread(thread: ThreadInfo): Promise<void>
  openCoordinator(coordinatorId: string): Promise<void>
  /** Open the Coordinator page with this coordinator selected. */
  goHome(coordinatorId?: string): void
  pickFolder(): Promise<PickResult>
  setCoordinatorFolder(coordinatorId: string, path: string): Promise<void>
  holdFast(): () => void
  refresh(): void
  hidden(sessionId: string): void
}

export interface PaneProps extends PaneActions {
  useTabInfo: () => TabInfo
  sessionId: string
  useCoordinator: UseCoordinator
  t: Translate
  dshApproval?: Translate
}

/**
 * Report a collapse of the column, or the pane leaving it, which may be the user closing it. The chip title stays
 * mounted while the pane sits in an expanded strip, also behind another tab, so the title carries this.
 */
function useHiddenReport(expanded: boolean, sessionId: string, hidden: (sessionId: string) => void): void {
  const wasExpanded = useRef(expanded)
  useEffect(() => {
    if (wasExpanded.current && !expanded) hidden(sessionId)
    wasExpanded.current = expanded
  }, [expanded, hidden, sessionId])
  useEffect(() => () => { hidden(sessionId) }, [hidden, sessionId])
}

/** Chip title: the coordinator glyph before the type's label, as dsh's own page tabs carry a glyph. */
export function PaneTitle({ useTabInfo, sessionId, hidden, t }: {
  useTabInfo: () => TabInfo; sessionId: string; hidden: (sessionId: string) => void; t: Translate
}) {
  useHiddenReport(useTabInfo().sidebar.expanded, sessionId, hidden)
  return <><IconCoordinator size={16} className="dco-pane-title-icon" />{t('pane.title')}</>
}

/** Up/Down move between the pane's buttons, Home/End jump to the first and last (a list's roving keys). */
function onListKey(event: KeyboardEvent<HTMLElement>): void {
  const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End']
  if (!keys.includes(event.key)) return
  const items = [...event.currentTarget.querySelectorAll<HTMLElement>('[data-pane-item]')]
  const index = items.indexOf(document.activeElement as HTMLElement)
  if (index < 0) return
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
    : Math.min(items.length - 1, Math.max(0, index + (event.key === 'ArrowDown' ? 1 : -1)))
  event.preventDefault()
  items[next]?.focus()
}

function PaneRow({ thread, current, now, t, onOpen, copy, handlers, onError }: {
  thread: ThreadInfo; current: boolean; now: number; t: Translate; onOpen: (thread: ThreadInfo) => void
  copy: (dshKey: string, ownKey: string) => string; handlers: RowActionHandlers; onError: (thread: ThreadInfo, reason: string) => void
}) {
  const title = thread.title || thread.id
  const detail = threadDetail(thread, t)
  return <li className="dco-pitem" data-testid="dco-pane-thread" data-thread-id={thread.id}
    data-finished={groupOf(thread) === 'finished' || undefined}>
    <Tooltip label={threadTooltip(thread, t)} delay={500}>
      <button type="button" className="dco-prow" data-pane-item aria-current={current ? 'page' : undefined}
        onClick={() => { onOpen(thread) }}>
        <ThreadGlyph status={thread.status} />
        <span className="dco-prow-content">
          <span className="dco-prow-line">
            <span className="dco-prow-title">{title}</span>
            <ThreadTime at={thread.updatedAt} now={now} t={t} />
          </span>
          <span className="dco-prow-status">
            <ThreadStatusText thread={thread} t={t} />
            {detail !== undefined && <span className="dco-meta">{detail}</span>}
          </span>
        </span>
      </button>
    </Tooltip>
    <ThreadActions thread={thread} t={t} copy={copy} handlers={handlers} onError={onError} compact />
  </li>
}

function readFinishedOpen(): boolean {
  return read(FINISHED_KEY) === 'open'
}

export function ThreadsPane({ useTabInfo, sessionId, useCoordinator, t, dshApproval, openThread, openCoordinator, goHome, pickFolder, setCoordinatorFolder,
  holdFast, refresh, hidden, confirmFolder, resumeThread }: PaneProps) {
  const { sidebar, tab } = useTabInfo()
  const snapshot = useCoordinator(s => s)
  const now = useNow()
  const [finishedOpen, setFinishedOpen] = useState(readFinishedOpen)
  const [notice, setNotice] = useState<string | undefined>(undefined)

  // Poll fast only while the pane is on screen.
  useEffect(() => tab.visible ? holdFast() : undefined, [tab.visible, holdFast])
  useHiddenReport(sidebar.expanded, sessionId, hidden)

  const state = snapshot.state
  const loading = isLoading(state)
  const role = roleOf(snapshot, sessionId)
  // A pane left open in a Session that is not ours (or not yet known) shows the page's selected coordinator.
  const scopeId = role?.coordinatorId ?? pickCoordinator(state, snapshot.selected)?.id
  const coordinator = coordinatorById(state, scopeId)
  const isCoordinator = role?.role === 'coordinator'
  const threads = scopeId === undefined ? [] : sortThreads(threadsOf(state, scopeId))
  const title = coordinator === undefined ? t(loading ? 'loading' : 'pane.noCoordinator') : nameOf(coordinator)
  const archived = coordinator?.archived === true
  const groups = new Map<ThreadGroup, ThreadInfo[]>()
  for (const thread of threads) {
    const group = groupOf(thread)
    groups.set(group, [...(groups.get(group) ?? []), thread])
  }

  const run = (action: () => Promise<void>, failure: (reason: string) => string) => {
    setNotice(undefined)
    action().catch((error: unknown) => { setNotice(failure(error instanceof Error ? error.message : String(error))) })
  }
  const open = (thread: ThreadInfo) => {
    if (thread.sessionId === sessionId) return
    // A row without a coordinator that waits for its folder has nothing to open (L7).
    if (thread.sessionId === '' && thread.coordinatorId === '') { setNotice(t('orphans.noSession', { title: thread.title || thread.id })); return }
    run(() => openThread(thread), reason => t('error.openThread', { title: thread.title, reason }))
  }
  const copy = dshCopy(dshApproval, t)
  const handlers: RowActionHandlers = {
    confirmFolder: async (id, decision) => { await confirmFolder(id, decision); refresh() },
    resumeThread: async (id) => { await resumeThread(id); refresh() },
  }
  const actionError = (thread: ThreadInfo, reason: string) => { setNotice(t('error.action', { title: thread.title, reason })) }

  let body: ReactNode
  if (loading) {
    body = state === undefined && snapshot.error !== undefined
      ? <div className="dco-pane-note" role="alert"><span>{t('error.unreachable')}</span>
        <Button variant="outline" size="sm" onClick={refresh}>{t('error.retry')}</Button></div>
      : <ul className="dco-plist" aria-busy="true" aria-label={t('threads.loading')}>
        {[0, 1, 2].map(i => <li key={i} className="dco-pskeleton" aria-hidden="true"><span className="dco-skeleton-bar" /><span className="dco-skeleton-bar" /></li>)}
      </ul>
  } else if (threads.length === 0) {
    body = <p className="dco-pane-note" data-testid="dco-pane-empty">{t('pane.empty')}</p>
  } else {
    body = GROUPS.map((group) => {
      const rows = groups.get(group)
      if (rows === undefined) return null
      const collapsible = group === 'finished'
      const expanded = !collapsible || finishedOpen
      const label = <>
        <span>{t(`group.${group}`)}</span>
        <span className="dco-pgroup-count" data-attention={group === 'attention' || undefined}>{rows.length}</span>
      </>
      const listId = `dco-pane-${sessionId}-${group}`
      return <section key={group} className="dco-pgroup" data-testid={`dco-pane-group-${group}`}>
        {collapsible
          ? <button type="button" className="dco-pgroup-head dco-pgroup-toggle" data-pane-item aria-expanded={expanded} aria-controls={listId}
            onClick={() => { const next = !finishedOpen; setFinishedOpen(next); write(FINISHED_KEY, next ? 'open' : null) }}>
            {label}<span className="dco-pgroup-chevron" data-expanded={expanded || undefined}><IconChevron size={12} /></span>
          </button>
          : <h3 className="dco-pgroup-head">{label}</h3>}
        {expanded && <ul className="dco-plist" id={listId} aria-label={t(`group.${group}`)}>
          {rows.map(thread => <PaneRow key={thread.id} thread={thread} current={thread.sessionId === sessionId && sessionId !== ''} now={now} t={t} onOpen={open}
            copy={copy} handlers={handlers} onError={actionError} />)}
        </ul>}
      </section>
    })
  }

  return <nav className="dco-pane" data-testid="dco-pane" data-coordinator-id={scopeId} aria-label={t('pane.label', { title })} onKeyDown={onListKey}>
    <div className="dco-pane-top">
      <button type="button" className="dco-prow dco-pane-coord" data-pane-item data-testid="dco-pane-coordinator" data-archived={archived || undefined}
        aria-current={isCoordinator ? 'page' : undefined}
        aria-label={coordinator === undefined ? title : archived ? t('pane.archivedAria', { title }) : t('pane.coordinatorAria', { title })}
        disabled={coordinator === undefined}
        onClick={() => {
          if (isCoordinator || coordinator === undefined) return
          // An archived coordinator is never reopened from here (L6): its page has Reopen, with the wording.
          if (archived) { goHome(coordinator.id); return }
          run(() => openCoordinator(coordinator.id), reason => t('error.open', { reason }))
        }}>
        {coordinator === undefined
          ? <span className="dco-glyph"><IconCoordinator size={16} /></span>
          : <Monogram name={title} size="xs" muted={archived} />}
        <span className="dco-prow-title">{title}</span>
        {archived && <span className="dco-tag">{t('coordinator.tag.archived')}</span>}
      </button>
      <Tooltip label={t('pane.overview')}>
        <button type="button" className="dco-icon-btn" data-pane-item data-testid="dco-pane-overview" aria-label={t('pane.overview')}
          onClick={() => { goHome(coordinator?.id) }}>
          <IconOverview size={16} />
        </button>
      </Tooltip>
    </div>
    {coordinator !== undefined && !loading && <FolderLine key={coordinator.id} coordinator={coordinator} t={t} pickFolder={pickFolder} compact
      setFolder={async (id, path) => { await setCoordinatorFolder(id, path); refresh() }} />}
    {notice !== undefined && <div className="dco-pane-note" role="alert" data-tone="danger">
      <IconWarning size={14} /><span>{notice}</span>
    </div>}
    {snapshot.error !== undefined && state !== undefined && <div className="dco-pane-note" role="alert">
      <span>{t('error.unreachable')} {t('error.stale')}</span>
      <Button variant="outline" size="sm" onClick={refresh}>{t('error.retry')}</Button>
    </div>}
    <div className="dco-pane-groups">{body}</div>
  </nav>
}

// ---- registration ----

interface PaneContext {
  inject(deps: string[], callback: (ctx: PaneContext) => void): void
  effect(execute: () => () => void, label?: string): void
  get(name: string): unknown
  slots: {
    inject(slot: string, register: () => () => void): void
    register(options: Record<string, unknown>, component: (props: never) => unknown): () => void
  }
}

export interface PaneDeps {
  store: CoordinatorStore
  hooks: Record<string, unknown>
  t: Translate
  /** Same actions as the page: they open Sessions through the client catalog and skip fake Session ids. */
  openSession(sessionId: string): Promise<void>
  openCoordinator(coordinatorId?: string): Promise<void>
  goHome(): void
  pickFolder(): Promise<PickResult>
  setCoordinatorFolder(coordinatorId: string, path: string): Promise<void>
  confirmFolder: RowActionHandlers['confirmFolder']
  resumeThread: RowActionHandlers['resumeThread']
  dshApproval: () => Translate | undefined
}

/**
 * Register the pane when dsh's right Sidebar is loaded. Returns the header button's action: toggle the pane while
 * the Sidebar is there, else open the Coordinator page.
 */
export function mountThreadsPane(ctx: PaneContext, deps: PaneDeps): () => void {
  let controller: PaneController | undefined
  ctx.inject(['sidebarRight', 'sidebarRightTabs', 'slots'], (child) => {
    const sidebar = child.get('sidebarRight') as SidebarRight
    const tabs = child.get('sidebarRightTabs') as SidebarRightTabs
    child.effect(() => {
      const pane = createPaneController(sidebar, deps.store)
      controller = pane
      return () => { if (controller === pane) controller = undefined; pane.dispose() }
    }, 'dsh-coordinator: threads pane controller')
    child.effect(() => tabs.register({ id: PANE_ID, kind: PANE_KIND, title: () => deps.t('pane.title') }),
      'dsh-coordinator: threads pane type')
    const actions: PaneActions = {
      openThread: async (thread) => {
        controller?.leaveFullscreen()
        // A thread that waits for its folder has no Session yet: its card is in its own coordinator's chat.
        // A row without a coordinator never opens some other coordinator (L7).
        await openThreadSession(deps.openSession, thread, thread.coordinatorId === '' ? undefined : () => deps.openCoordinator(thread.coordinatorId))
      },
      confirmFolder: deps.confirmFolder,
      resumeThread: deps.resumeThread,
      openCoordinator: async (coordinatorId) => {
        controller?.leaveFullscreen()
        await deps.openCoordinator(coordinatorId)
      },
      goHome: (coordinatorId) => {
        controller?.leaveFullscreen()
        if (coordinatorId !== undefined) deps.store.select(coordinatorId)
        deps.goHome()
      },
      pickFolder: deps.pickFolder,
      setCoordinatorFolder: deps.setCoordinatorFolder,
      holdFast: () => deps.store.holdFast(),
      refresh: () => { deps.store.refresh() },
      hidden: (sessionId) => { controller?.hidden(sessionId) },
    }
    child.slots.inject('sidebar.right.pane.tab', () => child.slots.register({
      name: 'sidebar.right.pane.tab', key: PANE_ID, locale: NS, inject: () => ({ hooks: deps.hooks, ...actions, dshApproval: deps.dshApproval() }),
    }, ThreadsPane as never))
    child.slots.inject('sidebar.right.pane.tab.title', () => child.slots.register({
      name: 'sidebar.right.pane.tab.title', key: PANE_ID, locale: NS, inject: () => ({ hidden: actions.hidden }),
    }, PaneTitle as never))
  })
  return () => { if (controller !== undefined) controller.toggle(); else deps.goHome() }
}

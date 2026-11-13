/**
 * One shared poller for coordinator state, read by the panel, the sidebar badge, the header button, the welcome, the
 * threads pane and the left-sidebar row counts. It also holds the page's selected coordinator (per-browser view
 * state), so the pane's Overview button can open the page on its coordinator.
 * It is a bare observable (`subscribe` + stable `getSnapshot`): each slot registration hands it to the renderer in
 * its inject `hooks`, and components read it through the bound `useCoordinator(selector)`.
 *
 * Polls every 1.5 s while the panel is mounted and every 5 s otherwise (for the badge), pauses while the
 * tab is hidden, and publishes a new snapshot only when `revision` or `epoch` changes or the error state flips, so
 * React re-renders nothing on an unchanged poll.
 */
import type { CoordinatorInfo } from '../types.ts'
import type { CoordinatorState, ThreadInfo, ThreadStatus } from './contract.ts'
import type { ClientState } from './remote.ts'
import { SourceError, type CoordinatorSource } from './source.ts'

export const FAST_POLL_MS = 1_500
export const SLOW_POLL_MS = 5_000

export interface Snapshot {
  /** Last good state; kept while the host is unreachable so the list does not vanish. */
  readonly state: ClientState | undefined
  /** Set while the latest poll failed. */
  readonly error: string | undefined
  readonly unreachable: boolean
  readonly loading: boolean
  readonly source: CoordinatorSource['kind']
  /** The coordinator the user last selected on the page; may name one that no longer exists (see `pickCoordinator`). */
  readonly selected: string | undefined
}

export const ATTENTION: readonly ThreadStatus[] = ['waiting-approval', 'waiting-question', 'needs-user']
export const FINISHED: readonly ThreadStatus[] = ['done', 'failed', 'stopped']

export function needsUser(thread: ThreadInfo): boolean {
  return ATTENTION.includes(thread.status)
}

const SELECTED_KEY = 'dsh-coordinator:selected'

function readSelected(): string | undefined {
  try { return window.localStorage.getItem(SELECTED_KEY) ?? undefined } catch { return undefined }
}

export class CoordinatorStore {
  readonly source: CoordinatorSource
  private snapshot: Snapshot
  private readonly listeners = new Set<() => void>()
  private timer: ReturnType<typeof setTimeout> | undefined
  private inflight: AbortController | undefined
  private fastHolders = 0
  private disposed = false

  constructor(source: CoordinatorSource) {
    this.source = source
    this.snapshot = { state: undefined, error: undefined, unreachable: false, loading: true, source: source.kind, selected: readSelected() }
    document.addEventListener('visibilitychange', this.onVisibility)
    this.schedule(0)
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  readonly getSnapshot = (): Snapshot => this.snapshot

  /** Poll fast while the returned release is not called (the panel holds it while mounted). */
  holdFast(): () => void {
    this.fastHolders += 1
    this.refresh()
    let released = false
    return () => {
      if (released) return
      released = true
      this.fastHolders -= 1
    }
  }

  /** Select a coordinator on the page (remembered per browser). */
  select(coordinatorId: string): void {
    try { window.localStorage.setItem(SELECTED_KEY, coordinatorId) } catch { /* the choice lasts for this page only */ }
    if (this.snapshot.selected !== coordinatorId) this.publish({ ...this.snapshot, selected: coordinatorId })
  }

  /** Poll now, for example after an action changed host state. */
  refresh(): void {
    if (this.disposed) return
    this.schedule(0)
  }

  dispose(): void {
    this.disposed = true
    document.removeEventListener('visibilitychange', this.onVisibility)
    clearTimeout(this.timer)
    this.inflight?.abort()
    this.listeners.clear()
  }

  private readonly onVisibility = (): void => {
    if (document.visibilityState === 'visible') this.schedule(0)
    else clearTimeout(this.timer)
  }

  private schedule(delay: number): void {
    clearTimeout(this.timer)
    if (this.disposed || document.visibilityState === 'hidden') return
    this.timer = setTimeout(() => { void this.poll() }, delay)
  }

  private async poll(): Promise<void> {
    this.inflight?.abort()
    const controller = new AbortController()
    this.inflight = controller
    try {
      const state = await this.source.getState(controller.signal)
      if (controller.signal.aborted) return
      const previous = this.snapshot
      // The epoch changes when the host service is recreated, which can restart or repeat a revision.
      if (previous.state?.revision !== state.revision || previous.state.epoch !== state.epoch || previous.error !== undefined || previous.loading) {
        this.publish({ ...previous, state, error: undefined, unreachable: false, loading: false })
      }
    } catch (error) {
      if (controller.signal.aborted) return
      const message = error instanceof Error ? error.message : String(error)
      const unreachable = !(error instanceof SourceError) || error.unreachable
      const previous = this.snapshot
      if (previous.error !== message || previous.loading) {
        this.publish({ ...previous, error: message, unreachable, loading: false })
      }
    } finally {
      if (this.inflight === controller) {
        this.inflight = undefined
        this.schedule(this.fastHolders > 0 ? FAST_POLL_MS : SLOW_POLL_MS)
      }
    }
  }

  private publish(next: Snapshot): void {
    this.snapshot = next
    for (const listener of this.listeners) listener()
  }
}

/** How the side pane and the page group threads, in display order. */
export type ThreadGroup = 'attention' | 'running' | 'idle' | 'finished'
export const GROUPS: readonly ThreadGroup[] = ['attention', 'running', 'idle', 'finished']

export function groupOf(thread: ThreadInfo): ThreadGroup {
  if (needsUser(thread)) return 'attention'
  if (FINISHED.includes(thread.status)) return 'finished'
  return thread.status === 'idle' ? 'idle' : 'running'
}

/** Threads needing the user first, then running, idle and finished ones; newest update first within each group. */
export function sortThreads(threads: readonly ThreadInfo[]): ThreadInfo[] {
  const rank = (t: ThreadInfo) => GROUPS.indexOf(groupOf(t))
  return [...threads].sort((a, b) => rank(a) - rank(b) || b.updatedAt - a.updatedAt)
}

// ---- coordinator scoping (pure, so tests can run them without a DOM) ----

/** What a Session is to the plugin: a coordinator chat or a thread lead, and which coordinator it belongs to. */
export interface SessionRole {
  role: 'coordinator' | 'thread'
  /** Owner coordinator; `''` for a thread whose coordinator record was dropped ("Without coordinator"). */
  coordinatorId: string
}

export function roleOf(snapshot: Pick<Snapshot, 'state'>, sessionId: string | undefined): SessionRole | undefined {
  const state = snapshot.state
  // Archived chats carry `null` and folder-waiting threads `''`: neither may ever match a lookup.
  if (state === undefined || typeof sessionId !== 'string' || sessionId === '') return undefined
  const coordinator = state.coordinators.find(c => c.sessionId === sessionId)
  if (coordinator !== undefined) return { role: 'coordinator', coordinatorId: coordinator.id }
  const thread = state.threads.find(x => x.sessionId === sessionId)
  return thread === undefined ? undefined : { role: 'thread', coordinatorId: thread.coordinatorId }
}

/** The coordinator a Session chat belongs to (its own record for a coordinator chat, the owner for a thread). */
export function coordinatorById(state: CoordinatorState | undefined, coordinatorId: string | undefined): CoordinatorInfo | undefined {
  if (state === undefined || coordinatorId === undefined || coordinatorId === '') return undefined
  return state.coordinators.find(c => c.id === coordinatorId)
}

/**
 * The coordinator the page shows: the user's selection while it exists, else the last used one, else the newest live
 * one, else any (an archived one); undefined when there is none.
 */
export function pickCoordinator(state: CoordinatorState | undefined, preferred: string | undefined): CoordinatorInfo | undefined {
  if (state === undefined) return undefined
  const list = state.coordinators
  return list.find(c => c.id === preferred)
    ?? list.find(c => c.id === state.lastCoordinatorId && c.archived !== true)
    ?? list.find(c => c.archived !== true)
    ?? list[0]
}

/** The threads of one coordinator. */
export function threadsOf(state: CoordinatorState | undefined, coordinatorId: string): ThreadInfo[] {
  return state?.threads.filter(t => t.coordinatorId === coordinatorId) ?? []
}

/** Threads no listed coordinator owns: their record was dropped by state validation. */
export function orphanThreads(state: CoordinatorState | undefined): ThreadInfo[] {
  if (state === undefined) return []
  const ids = new Set(state.coordinators.map(c => c.id))
  return state.threads.filter(t => !ids.has(t.coordinatorId))
}

export function isRunning(thread: ThreadInfo): boolean {
  return thread.status === 'running' || thread.status === 'starting'
}

/** How many of a coordinator's threads need the user and how many run, for counts on rows and buttons. */
export function countsOf(state: CoordinatorState | undefined, coordinatorId: string): { attention: number; running: number; total: number } {
  const own = threadsOf(state, coordinatorId)
  return { attention: own.filter(needsUser).length, running: own.filter(isRunning).length, total: own.length }
}

/**
 * Whether a thread still works, as the host's archive rule counts it (threads.ts `working`): not idle or finished, or
 * waiting for its folder confirmation, or with teammates that still work (also after the Lead stopped). Archiving its
 * coordinator then needs `force`, which stops them.
 */
export function isWorking(thread: ThreadInfo): boolean {
  if (thread.action?.kind === 'confirm-folder') return true
  if ((thread.team?.working ?? 0) > 0) return true
  return thread.status !== 'idle' && !FINISHED.includes(thread.status)
}

/** Whether the page has no settled coordinator list yet: no state, or the host still validates its stored state. */
export function isLoading(state: ClientState | undefined): boolean {
  return state === undefined || state.loading === true
}

// ---- coordinator identity ----

/** The name a coordinator is shown by; a host that predates names sends none, then the title stands in. */
export function nameOf(coordinator: Pick<CoordinatorInfo, 'name' | 'title'>): string {
  const name = typeof coordinator.name === 'string' ? coordinator.name.trim() : ''
  return name !== '' ? name : coordinator.title
}

/** The monogram of a name: its first character (a whole code point, so CJK and emoji stay intact), upper case. */
export function monogramOf(name: string): string {
  const first = [...name.trim()][0]
  return first === undefined ? '?' : first.toLocaleUpperCase()
}

/** Calm identity tones; each maps to a dsh theme token in styles.ts. Status colours (warning, error) are left out. */
export const TONES = ['blue', 'violet', 'green', 'slate'] as const
export type Tone = typeof TONES[number]

/** A stable tone for a name (the same name always gets the same tone, on every device). */
export function toneOf(name: string): Tone {
  let hash = 0
  for (const ch of name.trim().toLocaleLowerCase()) hash = (hash * 31 + ch.codePointAt(0)!) >>> 0
  return TONES[hash % TONES.length]!
}

/** The host's limit for a coordinator's executor prompt. */
export const PROMPT_MAX = 4000
/** The host's limit for a coordinator name. */
export const NAME_MAX = 40

/**
 * A quick check of a new name before the host sees it, as a locale key, or undefined when it looks fine. The host
 * decides; its refusal is shown as it comes. Unchanged names are not an error (saving them is a no-op).
 */
export function nameProblem(name: string, coordinatorId: string, coordinators: readonly Pick<CoordinatorInfo, 'id' | 'name' | 'archived'>[]): string | undefined {
  const trimmed = name.trim()
  if (trimmed === '') return 'rename.empty'
  if ([...trimmed].length > NAME_MAX) return 'rename.long'
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) return 'rename.control'
  const lower = trimmed.toLocaleLowerCase()
  if (coordinators.some(c => c.id !== coordinatorId && c.archived !== true && typeof c.name === 'string' && c.name.trim().toLocaleLowerCase() === lower)) return 'rename.taken'
  return undefined
}

/** Characters of an executor prompt as the host's limit counts them (UTF-16 units of the text, as `String.length`). */
export function promptLength(text: string): number {
  return text.length
}

/** A host reason as a short sentence for a notice: no "Error:" prefix, first letter upper case, a final full stop. */
export function sentence(reason: string): string {
  const text = reason.trim().replace(/^error:\s*/i, '')
  if (text === '') return text
  const first = text[0]!.toLocaleUpperCase() + text.slice(1)
  return /[.!?。！？]$/.test(first) ? first : `${first}.`
}

/** Where a coordinator's chat stands: the host's `chat` field, else derived from `sessionId` and `chatArchived` (older host). */
export type ChatState = 'open' | 'archived' | 'gone' | 'none'
export function chatOf(coordinator: Pick<CoordinatorInfo, 'chat' | 'sessionId' | 'chatArchived'>): ChatState {
  if (coordinator.chat !== undefined) return coordinator.chat
  return coordinator.sessionId === null || coordinator.chatArchived === true ? 'archived' : 'open'
}

/** A coordinator's archived Executor Sessions, newest first as the host sends them (at most 30). */
export function archivedThreadsOf(state: ClientState | undefined, coordinatorId: string): ThreadInfo[] {
  return state?.archivedThreads?.filter(t => t.coordinatorId === coordinatorId) ?? []
}

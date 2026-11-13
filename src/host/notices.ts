/**
 * Notices from threads to the coordinator: batching and wording. Pure apart from injectable timers.
 *
 * Every thread change that the coordinator should hear about becomes a Notice. Notices are collected for a short
 * debounce window (bounded by a maximum delay) and delivered as one message, so a burst of events (a result report
 * followed by the end of the turn, or several threads finishing together) wakes the coordinator once. A batch wakes
 * the coordinator (followup) when any notice in it wants a wake; a batch of mere progress is injected without
 * waking it.
 *
 * A report sent while the thread is still busy (`hold`) waits until the lead's turn has ended and its team members
 * are quiet, up to a hold limit: a real lead usually writes its final message after `coordinator_report`, sometimes
 * for half a minute, and delivering the report and the end of the turn separately woke the coordinator twice for one
 * result. While team members work the limit is longer, so a result sent before the team finished arrives once, with
 * the end of the whole tree.
 *
 * A status notice that is no longer true when its batch goes out (a member's approval decided within the debounce,
 * a turn end followed at once by the next turn that a member's result started) is dropped (`stale`).
 */
import type { ThreadReport, ThreadStatus } from '../types.ts'
import { clip } from './status.ts'
import { fence, inlineUntrusted, UNTRUSTED_HEADER, type FenceField } from './fence.ts'
import { TOOL } from './names.ts'

export interface Notice {
  threadId: string
  /**
   * The coordinator that owns the thread, set when the notice is added: the row can be gone (a denied folder) by the
   * time the batch goes out. Delivery groups a batch by it; a notice without one goes to the row's current owner.
   */
  coordinatorId?: string
  title: string
  at: number
  /** Deliver with followup (wakes the coordinator) instead of inject. */
  wake: boolean
  /** A coordinator_report from the thread lead. */
  report?: ThreadReport
  /** A status the thread entered. */
  status?: ThreadStatus
  detail?: string
  /** Last assistant text of the thread, for finished turns. */
  lastText?: string
  /** Hold this notice while the thread's turn runs (see the module comment). */
  hold?: boolean
  /** A line the plugin itself writes (rate guards, restarts); never thread text. */
  alert?: string
  /** A message this thread sent to another thread with `thread_send` (A6). */
  peer?: { to: string; text: string }
  /** The lead's team members at the end of a turn: name, task label and how each ended (labels are thread text). */
  team?: { name: string; label?: string; state: string }[]
  /** The waiting approval or question comes from a team member, not the lead (its name). */
  member?: string
}

export interface Timers {
  now(): number
  set(fn: () => void, ms: number): unknown
  clear(handle: unknown): void
}

export const realTimers: Timers = {
  now: () => Date.now(),
  set: (fn, ms) => setTimeout(fn, ms),
  clear: handle => clearTimeout(handle as ReturnType<typeof setTimeout>),
}

export interface BatcherOptions {
  /** Quiet time after the last notice before a batch is delivered. */
  debounceMs: number
  /** Upper bound between the first notice of a batch and its delivery. */
  maxDelayMs: number
  flush(batch: Notice[]): void
  /** Whether a thread is still busy (its lead's turn or any team member); held notices of a busy thread wait. */
  running?(threadId: string): boolean
  /** How long a held notice of this thread may wait; defaults to `maxDelayMs`. */
  holdMs?(threadId: string): number
  /** Whether a status notice no longer holds at delivery time; such notices are dropped. */
  stale?(notice: Notice): boolean
  timers?: Timers
}

export class NoticeBatcher {
  private pending: { notice: Notice; addedAt: number }[] = []
  private firstAt = 0
  private timer: unknown
  private readonly timers: Timers
  private readonly options: BatcherOptions

  constructor(options: BatcherOptions) {
    this.options = options
    this.timers = options.timers ?? realTimers
  }

  get size(): number { return this.pending.length }

  add(notice: Notice): void {
    const now = this.timers.now()
    if (this.pending.length === 0) this.firstAt = now
    this.pending.push({ notice, addedAt: now })
    this.schedule()
  }

  /** Re-check held notices soon, for example when a thread's turn ended without a status notice. */
  kick(): void {
    if (this.pending.length > 0) this.schedule()
  }

  private schedule(): void {
    if (this.timer !== undefined) this.timers.clear(this.timer)
    const elapsed = this.timers.now() - this.firstAt
    const wait = Math.max(0, Math.min(this.options.debounceMs, this.options.maxDelayMs - elapsed))
    this.timer = this.timers.set(() => this.flushNow(), wait)
  }

  /** Deliver what is pending now, except held notices of threads that are still in their turn. */
  flushNow(): void {
    if (this.timer !== undefined) this.timers.clear(this.timer)
    this.timer = undefined
    if (this.pending.length === 0) return
    const now = this.timers.now()
    const withStatus = new Set(this.pending.filter(p => p.notice.status !== undefined).map(p => p.notice.threadId))
    const waits = (p: { notice: Notice; addedAt: number }): boolean => p.notice.hold === true
      && !withStatus.has(p.notice.threadId) && this.options.running?.(p.notice.threadId) === true
      && now - p.addedAt < Math.max(this.options.maxDelayMs, this.options.holdMs?.(p.notice.threadId) ?? 0)
    const ready = this.pending.filter(p => !waits(p) && this.options.stale?.(p.notice) !== true)
    const held = this.pending.filter(waits)
    this.pending = held
    if (held.length > 0) {
      // Re-check held notices every debounce period until their thread is quiet or their limit is reached.
      this.firstAt = now
      this.schedule()
    }
    if (ready.length > 0) this.options.flush(ready.map(p => p.notice))
  }

  /** Drop pending notices and timers (on unload). */
  dispose(): void {
    if (this.timer !== undefined) this.timers.clear(this.timer)
    this.timer = undefined
    this.pending = []
  }
}

const STATUS_TEXT: Partial<Record<ThreadStatus, string>> = {
  'idle': 'finished its turn and is idle',
  'done': 'finished its turn after reporting a result',
  'failed': 'failed',
  'stopped': 'stopped',
  'waiting-approval': 'is waiting for the USER to approve an action',
  'waiting-question': 'is waiting for the USER to answer a question it asked in the Executor Session',
  'needs-user': 'is flagged for the user',
  'running': 'is running',
  'starting': 'is starting',
}

const REPORT_TEXT = {
  progress: 'progress',
  question: 'question for the coordinator',
  result: 'result',
  blocked: 'blocked',
} as const

/** Group a batch per thread, in first-seen order. */
function byThread(batch: readonly Notice[]): Notice[][] {
  const groups = new Map<string, Notice[]>()
  for (const notice of batch) {
    const group = groups.get(notice.threadId)
    if (group === undefined) groups.set(notice.threadId, [notice])
    else group.push(notice)
  }
  return [...groups.values()]
}

/** Caps for untrusted values in a notice. */
const REPORT_MAX = 2000
const LAST_TEXT_MAX = 600
const DETAIL_MAX = 300
const TITLE_MAX = 80
const TEAM_MAX = 400

/**
 * The text block for one thread: a trusted line with the thread id and its latest status, then everything the
 * thread wrote (title, reports, waiting detail, last message) inside one data block.
 */
function threadBlock(notices: readonly Notice[]): string {
  const { threadId, title } = notices.at(-1)!
  const lines: string[] = []
  const last = notices.findLast(n => n.status !== undefined)
  const reports = notices.filter(n => n.report !== undefined).map(n => n.report!)
  const head = `Executor Session ${threadId}`
  if (last?.status !== undefined) {
    lines.push(`${head}: status ${last.status}: ${STATUS_TEXT[last.status] ?? last.status}.`)
    if (last.member !== undefined) lines.push(`A Teammate of this Executor Session asked (${last.member.replace(/[^\w/-]/g, '').slice(0, 40)}), not the Lead; the card is in that Teammate's view of the Executor Session.`)
    if (last.status === 'waiting-approval') {
      lines.push('Only the user can approve or reject this. Tell the user which Executor Session waits and why; they must open it and use its approval card. Never approve anything yourself.')
    } else if (last.status === 'waiting-question') {
      lines.push('This question is addressed to the user inside the Executor Session. Tell the user; they answer it there.')
    }
  } else if (reports.length === 0 && notices.some(n => n.peer !== undefined)) {
    lines.push(`${head}: messaged ${[...new Set(notices.flatMap(n => (n.peer === undefined ? [] : [n.peer.to])))].join(', ')} (for your information; the Executor Sessions coordinate directly).`)
  } else if (reports.length > 0) {
    lines.push(`${head}: ${reports.length === 1 ? 'one report' : `${reports.length} reports`}.`)
  } else {
    lines.push(`${head}:`)
  }
  for (const n of notices) if (n.alert !== undefined) lines.push(n.alert)
  const fields: FenceField[] = [{ name: 'title', value: title, max: TITLE_MAX }]
  for (const report of reports) fields.push({ name: `report (${REPORT_TEXT[report.kind]})`, value: report.text, max: REPORT_MAX })
  // For a finished or running turn the detail only repeats the last report.
  if (last?.detail !== undefined && last.status !== 'idle' && last.status !== 'done' && last.status !== 'running') {
    fields.push({ name: 'status detail', value: last.detail, max: DETAIL_MAX })
  }
  for (const n of notices) if (n.peer !== undefined) fields.push({ name: `message to ${n.peer.to.replace(/[^\w-]/g, '')}`, value: n.peer.text, max: 300 })
  if ((last?.status === 'idle' || last?.status === 'done') && last.lastText !== undefined) {
    fields.push({ name: 'last message of the lead', value: last.lastText, max: LAST_TEXT_MAX })
  }
  const team = notices.findLast(n => n.team !== undefined)?.team
  if (team !== undefined && team.length > 0) {
    fields.push({ name: 'teammates', value: team.map(m => `${m.name}: ${m.state}${m.label === undefined ? '' : ` (${m.label})`}`).join('; '), max: TEAM_MAX })
  }
  lines.push(fence(threadId, fields))
  return lines.join('\n')
}

const WAKE_ACTION = `Act on it if needed (answer questions you can answer from what the user told you with ${TOOL.message}, flag the rest with ${TOOL.flagUser}), then tell the user what changed and which Executor Session waits on what.`
const WAKE_HEADER = `[dsh-coordinator notice] Executor Session updates. ${WAKE_ACTION}`
const QUIET_HEADER = '[dsh-coordinator notice] Executor Session progress, for your information. No action needed.'

/** Upper bound of a notice summary, as dsh bounds `notice` summaries (dsh-llm CONTEXT_SUMMARY_MAX_CHARS). */
export const SUMMARY_MAX_CHARS = 120

/**
 * The one-line account of one thread's notices that the chat shows on the collapsed row, e.g.
 * `Thread "Fix the build" reported a result`. The most pressing fact wins.
 */
export function threadSummary(notices: readonly Notice[]): string {
  const title = inlineUntrusted(notices.at(-1)!.title, 60)
  return clip(`Executor Session "${title}" ${threadWhat(notices)}`, SUMMARY_MAX_CHARS)
}

/** What happened to a thread, most pressing fact first, e.g. `reported a result`. Contains no thread text. */
export function threadWhat(notices: readonly Notice[]): string {
  const status = notices.findLast(n => n.status !== undefined)?.status
  const reports = new Set(notices.flatMap(n => (n.report === undefined ? [] : [n.report.kind])))
  let what: string
  if (notices.some(n => n.alert !== undefined) && status === undefined && reports.size === 0) what = 'needs your attention'
  else if (status === 'waiting-approval') what = 'waits for your approval'
  else if (status === 'waiting-question') what = 'has a question for you'
  else if (reports.has('question')) what = 'asks the coordinator a question'
  else if (reports.has('blocked')) what = 'is blocked'
  else if (status === 'failed') what = 'failed'
  else if (reports.has('result')) what = 'reported a result'
  else if (status === 'stopped') what = 'stopped'
  else if (status === 'needs-user') what = 'needs you'
  else if (status === 'idle' || status === 'done') what = 'finished its turn'
  else if (reports.has('progress')) what = 'reported progress'
  else if (notices.some(n => n.peer !== undefined)) what = 'messaged another Executor Session'
  else what = 'changed'
  return what
}

/** One coordinator message per thread, for a batch that wakes the coordinator. */
export interface NoticeMessage {
  threadId: string
  text: string
  summary: string
}

/** Word a waking batch as one message per thread (each names its thread in the chat). */
export function noticeMessages(batch: readonly Notice[]): NoticeMessage[] {
  return byThread(batch).map(notices => ({
    threadId: notices[0]!.threadId,
    // The summary leads, so the chat's expanded notice starts with what happened.
    text: `[dsh-coordinator notice] Executor Session ${notices[0]!.threadId} ${threadWhat(notices)}. ${WAKE_ACTION}\n\n${UNTRUSTED_HEADER}\n\n${threadBlock(notices)}`,
    summary: threadSummary(notices),
  }))
}

/** Word a batch as one coordinator message. Notices are grouped per thread; only a thread's latest status is kept. */
export function formatNotices(batch: readonly Notice[]): { text: string; wake: boolean; summary: string } {
  const wake = batch.some(n => n.wake)
  const groups = byThread(batch)
  const summary = clip(groups.map(threadSummary).join('; '), SUMMARY_MAX_CHARS)
  return { text: `${wake ? WAKE_HEADER : QUIET_HEADER}\n\n${UNTRUSTED_HEADER}\n\n${groups.map(threadBlock).join('\n\n')}`, wake, summary }
}

/**
 * Thread status derivation. Pure: no dsh or Node imports, so it is unit tested directly.
 *
 * A thread's status is derived from a small set of facts that the thread service folds from three sources:
 * `session/event` log events (turns, approvals, ask_user_question calls), `agent/status` and `agent/error`, and the
 * coordinator's own actions (flag, stop, queueing). Facts marked "live" are not persisted: after a restart dsh ends
 * every open turn, so pending approvals and questions are gone too.
 */
import type { ReportKind, ThreadReport, ThreadStatus } from '../types.ts'

export type ThreadPhase =
  /** Created; the brief waits for a free slot. */
  | 'queued'
  /** The brief was delivered; no turn has started yet. */
  | 'starting'
  /** At least one turn started. */
  | 'active'

export interface TurnEnd {
  /** dsh `turn/end` reason kind: completed, aborted, error, blocked, max-tokens, interrupted, ... */
  kind: string
  at: number
  detail?: string
}

export interface ThreadFacts {
  phase: ThreadPhase
  /** Live: the thread lead's agent is running a turn. */
  running: boolean
  /** Live: open `approval/asked` without a matching `approval/decided`, by approval id. */
  approvals: Record<string, { toolName: string; reason?: string }>
  /** Live: open `ask_user_question` calls without a `tool/result`, by call id. */
  questions: Record<string, { text: string }>
  lastTurnStartAt?: number
  lastTurnEnd?: TurnEnd
  needsUser?: { reason: string; at: number }
  lastReport?: ThreadReport
  /** Last assistant text of the thread lead, clipped. */
  lastAssistantText?: string
  /** The coordinator asked to stop the current turn; the resulting abort is not reported back to it. */
  stopRequestedAt?: number
  /**
   * Live: the lead's subagents and Agent Teams members (separate child Sessions in the lead's tree), by Session id.
   * The thread is busy while any of them works, even when the lead's own turn has ended.
   */
  members?: Record<string, MemberFacts>
  /** Names of the members that were working when the table was last saved (persisted; see restoredFacts). */
  membersAtSave?: string[]
  /**
   * The thread waits for the user to confirm its folder (outside the threads root, behind a symlink, or another
   * thread's folder); it has no Session until then. Persisted.
   */
  confirm?: { path: string; why: 'outside' | 'existing' | 'symlink' | 'thread-folder' | 'coordinator-folder'; at: number }
  /** The spend guards paused the thread until the user resumes it. Persisted. */
  paused?: { reason: 'wakes' | 'budget' | 'peers'; count: number; at: number }
}

/** One subagent or team member of a thread lead's tree. */
export interface MemberFacts {
  /** Model-facing name (`wc-impl`, `reviewer/checker`) or a short id. */
  name: string
  /** The task label the creator gave it. */
  label?: string
  /** Its child Session runs a turn. */
  running: boolean
  /** Its creator got the runtime's settlement notice: it does no further work unless messaged. */
  settled: boolean
  /** When it last went idle without being settled yet (the settlement notice follows within moments). */
  idleSince?: number
  approvals: Record<string, { toolName: string; reason?: string }>
  questions: Record<string, { text: string }>
  /** Its last assistant text, clipped. */
  lastText?: string
  /** How its last activation ended, from the settlement notice (`completed`, `aborted`, `error`, ...). */
  stopReason?: string
}

/** How long an idle, unsettled member still counts as working: the runtime's settlement notice comes right after. */
export const SETTLE_GRACE_MS = 5000

export function initialFacts(phase: ThreadPhase): ThreadFacts {
  return { phase, running: false, approvals: {}, questions: {} }
}

/** The persisted part of the facts. */
export type PersistedFacts = Omit<ThreadFacts, 'running' | 'approvals' | 'questions' | 'members'>

export function persistedFacts(facts: ThreadFacts, now = Date.now()): PersistedFacts {
  const { running: _running, approvals: _approvals, questions: _questions, members: _members, membersAtSave: _saved, ...rest } = facts
  const working = workingMembers(facts, now).map(m => m.name)
  return working.length === 0 ? rest : { ...rest, membersAtSave: working }
}

// --- The lead's tree ------------------------------------------------------------------------------------------------

/** Members that still work: running, or idle for a moment while their settlement notice is on its way. */
export function workingMembers(facts: ThreadFacts, now: number): MemberFacts[] {
  return Object.values(facts.members ?? {}).filter(m => m.running || (!m.settled && m.idleSince !== undefined && now - m.idleSince < SETTLE_GRACE_MS))
}

/** The lead or any member of its tree works: the thread holds a slot and stays `running`. */
export function treeRunning(facts: ThreadFacts, now: number): boolean {
  return facts.running || workingMembers(facts, now).length > 0
}

/** Open approvals of the whole tree, the lead's first; each names the member that asked, if any. */
export function treeApprovals(facts: ThreadFacts): { id: string; toolName: string; reason?: string; member?: string; sessionId?: string }[] {
  const out: { id: string; toolName: string; reason?: string; member?: string; sessionId?: string }[] = Object.entries(facts.approvals).map(([id, a]) => ({ id, ...a }))
  for (const [sessionId, m] of Object.entries(facts.members ?? {})) {
    for (const [id, a] of Object.entries(m.approvals)) out.push({ id, ...a, member: m.name, sessionId })
  }
  return out
}

/** Open user questions of the whole tree, the lead's first. */
export function treeQuestions(facts: ThreadFacts): { id: string; text: string; member?: string; sessionId?: string }[] {
  const out: { id: string; text: string; member?: string; sessionId?: string }[] = Object.entries(facts.questions).map(([id, q]) => ({ id, ...q }))
  for (const [sessionId, m] of Object.entries(facts.members ?? {})) {
    for (const [id, q] of Object.entries(m.questions)) out.push({ id, ...q, member: m.name, sessionId })
  }
  return out
}

/** Whether anyone in the tree waits on the user (such a thread holds no slot). */
export function treeWaiting(facts: ThreadFacts): boolean {
  return treeApprovals(facts).length > 0 || treeQuestions(facts).length > 0
}

/** Names in a short list: `a, b and 2 more`. */
function names(list: readonly string[]): string {
  return list.length <= 3 ? list.join(', ') : `${list.slice(0, 3).join(', ')} and ${list.length - 3} more`
}

/** Register a member the creator just started (`subagent/catalog` in the creator's log). */
export function addMember(facts: ThreadFacts, sessionId: string, name: string, label: string | undefined): ThreadFacts {
  const existing = facts.members?.[sessionId]
  if (existing !== undefined && existing.name === name && existing.label === label) return facts
  const member: MemberFacts = existing === undefined
    ? { name, ...(label === undefined ? {} : { label }), running: false, settled: false, approvals: {}, questions: {} }
    : { ...existing, name, ...(label === undefined ? {} : { label }) }
  return { ...facts, members: { ...facts.members, [sessionId]: member } }
}

/** A member's agent started or stopped running (`agent/status` of its Session). */
export function memberRunning(facts: ThreadFacts, sessionId: string, running: boolean, now: number): ThreadFacts {
  const m = facts.members?.[sessionId]
  if (m === undefined || (m.running === running && (running || m.idleSince !== undefined || m.settled))) return facts
  const { idleSince: _idle, ...rest } = m
  const next: MemberFacts = running ? { ...rest, running: true, settled: false } : { ...rest, running: false, ...(m.settled ? {} : { idleSince: now }) }
  return { ...facts, members: { ...facts.members, [sessionId]: next } }
}

/** The runtime told the creator that a member settled (a `subagent-settled` message in the creator's log or inbox). */
export function memberSettled(facts: ThreadFacts, sessionId: string, stopReason: string | undefined): ThreadFacts {
  const m = facts.members?.[sessionId]
  if (m === undefined || (m.settled && !m.running && m.stopReason === stopReason)) return facts
  const { idleSince: _idle, ...rest } = m
  return { ...facts, members: { ...facts.members, [sessionId]: { ...rest, running: false, settled: true, ...(stopReason === undefined ? {} : { stopReason }) } } }
}

/** Fold one `session/event` of a member's own Session: its turns, approvals, questions and last text. */
export function applyMemberEvent(facts: ThreadFacts, sessionId: string, event: { type: string; data: unknown }, now: number): ThreadFacts {
  const m = facts.members?.[sessionId]
  if (m === undefined) return facts
  // A member's events reuse the lead's folding on a scratch fact set, so approvals and questions behave the same.
  const scratch: ThreadFacts = { phase: 'active', running: m.running, approvals: m.approvals, questions: m.questions, ...(m.lastText === undefined ? {} : { lastAssistantText: m.lastText }) }
  const after = applyEvent(scratch, event, now)
  if (after === scratch) return facts
  let next: MemberFacts = { ...m, approvals: after.approvals, questions: after.questions, ...(after.lastAssistantText === undefined ? {} : { lastText: after.lastAssistantText }) }
  if (event.type === 'turn/start') {
    const { idleSince: _idle, ...rest } = next
    next = { ...rest, running: true, settled: false }
  } else if (event.type === 'turn/end') {
    next = { ...next, running: false, ...(next.settled ? {} : { idleSince: now }) }
  }
  return { ...facts, members: { ...facts.members, [sessionId]: next } }
}

export interface DerivedStatus {
  status: ThreadStatus
  detail?: string
}

const ASSISTANT_TEXT_MAX = 1200

export function clip(text: string, max: number): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length <= max ? flat : `${flat.slice(0, max - 1)}…`
}

/**
 * First line of a report or message, for a one-line status detail. A very short first line ("Done.", "Result:")
 * says nothing on its own, so the next line is joined to it.
 */
export function headline(text: string, max = 140): string {
  const lines = text.trim().split('\n').map(line => line.trim()).filter(line => line !== '')
  const first = lines[0] ?? ''
  const head = first.length < 24 && lines.length > 1 ? `${first} ${lines[1]}` : first
  return clip(head, max)
}

const REPORT_LABEL: Record<ReportKind, string> = {
  progress: 'progress',
  question: 'asked the coordinator',
  result: 'result',
  blocked: 'blocked',
}

/** Derive the status from the facts. Waiting on the user wins over everything else. */
export function deriveStatus(facts: ThreadFacts, now = Date.now()): DerivedStatus {
  const approval = treeApprovals(facts)[0]
  if (approval !== undefined) {
    const who = approval.member === undefined ? '' : `team member ${approval.member}: `
    return { status: 'waiting-approval', detail: clip(`${who}approval for ${approval.toolName}${approval.reason ? `: ${approval.reason}` : ''}`, 200) }
  }
  const question = treeQuestions(facts)[0]
  if (question !== undefined) {
    const who = question.member === undefined ? '' : `team member ${question.member} asks: `
    return { status: 'waiting-question', detail: clip(`${who}question: ${question.text}`, 200) }
  }
  if (facts.confirm !== undefined) return { status: 'needs-user', detail: clip(`confirm folder ${facts.confirm.path}`, 300) }
  if (facts.paused !== undefined) {
    return { status: 'needs-user', detail: facts.paused.reason === 'wakes' ? `paused after ${facts.paused.count} wake-ups` : facts.paused.reason === 'peers' ? `paused after ${facts.paused.count} peer messages` : `paused after ${facts.paused.count} turns today (daily budget)` }
  }
  if (facts.needsUser !== undefined) return { status: 'needs-user', detail: clip(facts.needsUser.reason, 200) }
  if (facts.phase === 'queued') return { status: 'starting', detail: 'queued: waiting for a free slot' }
  const turnStart = facts.lastTurnStartAt ?? 0
  const report = facts.lastReport !== undefined && facts.lastReport.at >= turnStart ? facts.lastReport : undefined
  const reportDetail = report === undefined ? undefined : `${REPORT_LABEL[report.kind]}: ${headline(report.text)}`
  const working = workingMembers(facts, now).map(m => m.name)
  if (facts.running) {
    const team = working.length === 0 ? undefined : `${working.length === 1 ? '1 team member' : `${working.length} team members`} working: ${names(working)}`
    const detail = reportDetail ?? team
    return { status: 'running', ...(detail === undefined ? {} : { detail: clip(detail, 200) }) }
  }
  if (working.length > 0 && facts.phase === 'active') {
    // The lead ended its turn or waits for its members; the thread is busy until the whole tree is quiet.
    const team = `lead waits for ${working.length === 1 ? '1 team member' : `${working.length} team members`}: ${names(working)}`
    return { status: 'running', detail: clip(reportDetail === undefined ? team : `${team}; ${reportDetail}`, 200) }
  }
  if (facts.phase === 'starting') return { status: 'starting' }
  const end = facts.lastTurnEnd
  if (end !== undefined) {
    if (end.kind === 'error') return { status: 'failed', detail: clip(end.detail ?? 'the turn failed', 200) }
    if (end.kind === 'aborted' || end.kind === 'interrupted') {
      return { status: 'stopped', detail: end.detail ?? (end.kind === 'aborted' ? 'the turn was stopped' : 'the turn was interrupted') }
    }
  }
  if (report?.kind === 'result') return { status: 'done', detail: reportDetail }
  return { status: 'idle', ...(reportDetail === undefined ? {} : { detail: reportDetail }) }
}

// --- Folding events ------------------------------------------------------------------------------------------------

type Data = Record<string, unknown>
const asData = (value: unknown): Data => (value !== null && typeof value === 'object' ? value as Data : {})

/** Text of the first question of an ask_user_question call (its arguments are a JSON string). */
export function questionText(args: unknown): string {
  let parsed: unknown = args
  if (typeof args === 'string') {
    try { parsed = JSON.parse(args) } catch { return clip(args, 200) }
  }
  const questions = asData(parsed)['questions']
  if (Array.isArray(questions) && questions.length > 0) {
    const first = asData(questions[0])
    const text = typeof first['question'] === 'string' ? first['question'] : ''
    return clip(text + (questions.length > 1 ? ` (+${questions.length - 1} more)` : ''), 200)
  }
  return 'a question'
}

/** Concatenated text parts of a message content array. */
export function messageText(content: unknown): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content.map(part => {
    const p = asData(part)
    return p['type'] === 'text' && typeof p['text'] === 'string' ? p['text'] : ''
  }).filter(Boolean).join('\n')
}

/**
 * Fold one `session/event` of the thread lead's Session into the facts. Returns the same object when nothing
 * changed, so callers can skip work.
 */
export function applyEvent(facts: ThreadFacts, event: { type: string; data: unknown }, now: number): ThreadFacts {
  const data = asData(event.data)
  switch (event.type) {
    case 'turn/start': {
      const { needsUser: _flag, stopRequestedAt: _stop, ...rest } = facts
      return { ...rest, phase: 'active', running: true, lastTurnStartAt: now }
    }
    case 'turn/end': {
      const reason = asData(data['reason'])
      const kind = typeof reason['kind'] === 'string' ? reason['kind'] : 'completed'
      const error = asData(reason['error'])
      const detail = kind === 'error' ? (typeof error['message'] === 'string' ? error['message'] : 'the turn failed') : undefined
      return { ...facts, phase: 'active', running: false, approvals: {}, questions: {},
        lastTurnEnd: { kind, at: now, ...(detail === undefined ? {} : { detail }) } }
    }
    case 'approval/asked': {
      const id = String(data['id'] ?? '')
      if (id === '') return facts
      const reason = typeof data['reason'] === 'string' ? data['reason'] : undefined
      return { ...facts, approvals: { ...facts.approvals, [id]: { toolName: String(data['toolName'] ?? 'a tool'), ...(reason === undefined ? {} : { reason }) } } }
    }
    case 'approval/decided': {
      const id = String(data['id'] ?? '')
      if (!(id in facts.approvals)) return facts
      const { [id]: _decided, ...approvals } = facts.approvals
      return { ...facts, approvals }
    }
    case 'tool/call': {
      if (data['name'] !== 'ask_user_question') return facts
      const callId = String(data['callId'] ?? '')
      if (callId === '') return facts
      return { ...facts, questions: { ...facts.questions, [callId]: { text: questionText(data['arguments']) } } }
    }
    case 'tool/result': {
      const message = asData(data['message'])
      const callId = String(message['toolCallId'] ?? asData(message['source'])['callId'] ?? '')
      if (!(callId in facts.questions)) return facts
      const { [callId]: _answered, ...questions } = facts.questions
      return { ...facts, questions }
    }
    case 'user/message': {
      // The user typed into the thread: a coordinator flag for the user is settled.
      if (asData(data['source'])['kind'] !== 'user' || facts.needsUser === undefined) return facts
      const { needsUser: _flag, ...rest } = facts
      return rest
    }
    case 'assistant/message': {
      const text = messageText(asData(data['message'])['content'])
      if (text.trim() === '') return facts
      return { ...facts, lastAssistantText: clip(text, ASSISTANT_TEXT_MAX) }
    }
    default:
      return facts
  }
}

/**
 * Facts when the plugin loads its saved table. Live facts start empty; `foldTurn` fills them from the log afterwards.
 * @param live - the thread lead's agent status when it is already loaded (a plugin reload while the app runs), else
 *   undefined (an app start: dsh ended every open turn).
 * @param queued - the brief was never delivered; the thread is submitted again rather than marked stopped.
 */
export function restoredFacts(saved: PersistedFacts, live: 'running' | 'idle' | undefined, queued: boolean, now = Date.now()): ThreadFacts {
  const facts: ThreadFacts = { ...saved, running: live === 'running', approvals: {}, questions: {} }
  if (queued) return { ...facts, phase: 'queued' }
  if (live === 'running') return { ...facts, phase: 'active' }
  if (facts.phase === 'queued' || facts.phase === 'starting') return facts
  // Members do not survive an app restart: a thread whose team still worked is stopped, even if the lead was idle.
  if (live === undefined && (facts.membersAtSave?.length ?? 0) > 0) return { ...facts, lastTurnEnd: teamCutEnd(facts.membersAtSave!, now) }
  const end = facts.lastTurnEnd
  const startedAfterEnd = facts.lastTurnStartAt !== undefined && (end === undefined || end.at < facts.lastTurnStartAt)
  // Corrected by foldTurn when the log shows how the turn really ended.
  if (startedAfterEnd) return { ...facts, lastTurnEnd: { kind: 'interrupted', at: now, detail: 'stopped when the app quit' } }
  return facts
}

/**
 * Re-derive turn facts from the thread lead's log: fold every event from the last `turn/start` on, so open
 * approvals and questions, a turn that ended while the plugin was not loaded, and the last assistant text are right.
 * @param running - whether the agent runs now (the log alone cannot tell a live turn from one cut off by a quit).
 */
export function foldTurn(facts: ThreadFacts, events: readonly { type: string; data: unknown; time?: number }[], running: boolean, now = Date.now()): ThreadFacts {
  // The last turn that did something: a closed turn without a model step (the coordinator's opening turn, a turn
  // the stop gate absorbed) changes nothing.
  let start = -1
  let end = events.length
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i]!.type !== 'turn/start') continue
    const turn = events.slice(i, end)
    const idle = turn.every(e => e.type === 'turn/start' || e.type === 'turn/end' || e.type === 'agent/inbox/spliced')
    if (!idle || !turn.some(e => e.type === 'turn/end')) { start = i; break }
    end = i
  }
  if (start < 0) return { ...facts, running }
  let next: ThreadFacts = { ...facts, approvals: {}, questions: {} }
  const { needsUser } = facts
  for (const event of events.slice(start, end)) next = applyEvent(next, event, event.time ?? now)
  // A stop the coordinator asked for after that turn ended (the lead only waited for its team) stays a stop.
  if (facts.stopRequestedAt !== undefined && facts.lastTurnEnd?.kind === 'aborted' && next.lastTurnEnd !== undefined
    && facts.lastTurnEnd.at >= next.lastTurnEnd.at) next = { ...next, lastTurnEnd: facts.lastTurnEnd, stopRequestedAt: facts.stopRequestedAt }
  // A turn/start would clear a flag the coordinator set after that turn began.
  if (needsUser !== undefined && (next.lastTurnStartAt ?? 0) <= needsUser.at) next = { ...next, needsUser }
  const ended = events.slice(start, end).some(event => event.type === 'turn/end')
  if (!ended && !running) {
    next = { ...next, approvals: {}, questions: {}, lastTurnEnd: { kind: 'interrupted', at: now, detail: 'stopped when the app quit' } }
  }
  // The lead's turn may have ended normally while its members still worked when the app quit.
  if (!running && (facts.membersAtSave?.length ?? 0) > 0 && next.lastTurnEnd?.kind !== 'error') {
    next = { ...next, lastTurnEnd: teamCutEnd(facts.membersAtSave!, now) }
  }
  return { ...next, running }
}

function teamCutEnd(members: readonly string[], now: number): TurnEnd {
  return { kind: 'interrupted', at: now, detail: clip(`stopped when the app quit; team members were still working (${names(members)})`, 200) }
}

/**
 * Readable transcripts of a thread's Session log for `executor_read`. Pure.
 *
 * Tool calls are shown under the name the log recorded, so entries written before the tool rename keep their old
 * `thread_*` names.
 *
 * The raw log (sessionQuery.readSession) is reduced to entries of user messages, assistant text, tool calls with a
 * short argument preview, tool results, approvals and turn ends. `recent` returns the tail; `full` returns pages of
 * at most `maxChars` characters, starting after a cursor (an event seq), so a long history is read in several calls
 * and never floods the coordinator's context.
 */
import { clip, messageText } from './status.ts'

export interface Entry {
  seq: number
  role: 'user' | 'brief' | 'coordinator' | 'peer' | 'member' | 'other' | 'assistant' | 'tool-call' | 'tool-result' | 'approval' | 'turn' | 'summary'
  text: string
}

type Data = Record<string, unknown>
const asData = (value: unknown): Data => (value !== null && typeof value === 'object' ? value as Data : {})

const ENTRY_MAX = 4000

/** Who wrote a message the plugin delivered, from its source; see `messageRole`. */
export interface HistoryContext {
  /**
   * Every Session that is or ever was a coordinator chat (any coordinator, reopened chats included); agent messages
   * from one of them are labelled `coordinator`.
   */
  coordinatorSessionIds?: ReadonlySet<string>
  /** Title of another thread by its session id, for peer messages (A6). */
  peerTitle?(sessionId: string): string | undefined
  /** Name of one of this thread's subagents or team members by its session id. */
  memberName?(sessionId: string): string | undefined
}

/**
 * The role of one user-role message in a thread's log: the user's own typing, the coordinator's brief (recorded as
 * a prompt with a `dsh-coordinator:brief:` request id), a coordinator message, a message from another thread, or
 * something else (runtime context, notices).
 */
export function messageRole(source: Record<string, unknown>, context: HistoryContext = {}): { role: Entry['role']; label?: string } {
  const kind = String(source['kind'] ?? 'unknown')
  const rpcId = typeof source['rpcId'] === 'string' ? source['rpcId'] : undefined
  if (kind === 'user') {
    if (rpcId?.startsWith('dsh-coordinator:brief:') === true) return { role: 'brief' }
    if (rpcId?.startsWith('dsh-coordinator:') === true) return { role: 'coordinator' }
    return { role: 'user' }
  }
  if (kind === 'agent-message') {
    const sender = typeof source['senderSessionId'] === 'string' ? source['senderSessionId'] : undefined
    if (sender !== undefined && isCoordinatorSession(sender, context)) return { role: 'coordinator' }
    const peer = sender === undefined ? undefined : context.peerTitle?.(sender)
    if (peer !== undefined) return { role: 'peer', label: peer }
    const member = sender === undefined ? undefined : context.memberName?.(sender)
    if (member !== undefined) return { role: 'member', label: memberLabel(member) }
    return { role: 'other', label: 'agent message' }
  }
  if (kind === 'subagent-settled') {
    // The runtime's account of a member finishing; its text carries the member's closing message.
    const sender = typeof source['senderSessionId'] === 'string' ? source['senderSessionId'] : undefined
    const member = sender === undefined ? undefined : context.memberName?.(sender)
    const reason = typeof source['stopReason'] === 'string' ? source['stopReason'] : 'finished'
    return { role: 'member', label: `${member === undefined ? 'team member' : memberLabel(member)} ${reason === 'completed' ? 'finished' : reason}` }
  }
  return { role: 'other', label: kind }
}

function isCoordinatorSession(sessionId: string, context: HistoryContext): boolean {
  return context.coordinatorSessionIds?.has(sessionId) === true
}

function memberLabel(name: string): string {
  return `team member ${name.replace(/[^\w/-]/g, '').slice(0, 40)}`
}

export function toEntries(events: readonly { type: string; seq: number; data: unknown }[], context: HistoryContext = {}): Entry[] {
  const out: Entry[] = []
  for (const event of events) {
    const data = asData(event.data)
    switch (event.type) {
      case 'user/message': {
        const source = asData(data['source'])
        const text = messageText(data['content'])
        // Runtime context that dsh adds to every turn is not part of the conversation.
        if (text.trim() === '' || source['kind'] === 'runtime-context' || /^\s*(<system-reminder>|Time sampled while preparing)/.test(text)) break
        const { role, label } = messageRole(source, context)
        out.push({ seq: event.seq, role, text: `${label === undefined ? '' : `(${label}) `}${clip(text, ENTRY_MAX)}` })
        break
      }
      case 'assistant/message': {
        const content = asData(data['message'])['content']
        const text = messageText(content)
        if (text.trim() !== '') out.push({ seq: event.seq, role: 'assistant', text: clip(text, ENTRY_MAX) })
        break
      }
      case 'tool/call': {
        const args = typeof data['arguments'] === 'string' ? data['arguments'] : JSON.stringify(data['arguments'] ?? {})
        out.push({ seq: event.seq, role: 'tool-call', text: `${String(data['name'])} ${clip(args, 300)}` })
        break
      }
      case 'tool/result': {
        const message = asData(data['message'])
        const text = messageText(message['content'])
        out.push({ seq: event.seq, role: 'tool-result', text: `${message['isError'] === true ? 'error: ' : ''}${clip(text, 600)}` })
        break
      }
      case 'approval/asked':
        out.push({ seq: event.seq, role: 'approval', text: `asked the user to approve ${String(data['toolName'])}: ${String(data['reason'] ?? '')}` })
        break
      case 'approval/decided':
        out.push({ seq: event.seq, role: 'approval', text: `user decision: ${String(data['outcome'] ?? 'decided')}` })
        break
      case 'turn/end': {
        const reason = asData(data['reason'])
        const error = asData(reason['error'])
        out.push({ seq: event.seq, role: 'turn', text: `turn ended: ${String(reason['kind'] ?? 'completed')}${typeof error['message'] === 'string' ? ` (${error['message']})` : ''}` })
        break
      }
      case 'compaction/summary': {
        const text = typeof data['summary'] === 'string' ? data['summary'] : messageText(data['content'] ?? data['message'])
        if (text !== '') out.push({ seq: event.seq, role: 'summary', text: clip(text, ENTRY_MAX) })
        break
      }
      default:
        break
    }
  }
  return out
}

export function render(entry: Entry): string {
  return `[${entry.seq}] ${entry.role}: ${entry.text}`
}

/** The last `count` entries, rendered. */
export function recent(entries: readonly Entry[], count: number): string[] {
  return entries.slice(-count).map(render)
}

export interface Page {
  lines: string[]
  /** Pass as `cursor` to read the next page; absent on the last page. */
  nextCursor?: number
  total: number
}

/** Entries after `cursor` (an event seq), up to `maxChars` characters of rendered text (at least one entry). */
export function page(entries: readonly Entry[], cursor: number | undefined, maxChars: number): Page {
  const start = cursor === undefined ? 0 : entries.findIndex(e => e.seq > cursor)
  const lines: string[] = []
  let used = 0
  let index = start < 0 ? entries.length : start
  for (; index < entries.length; index++) {
    const line = render(entries[index]!)
    if (lines.length > 0 && used + line.length > maxChars) break
    lines.push(line.length > maxChars ? `${line.slice(0, maxChars - 1)}…` : line)
    used += line.length + 1
  }
  const next = index < entries.length ? entries[index - 1]!.seq : undefined
  return { lines, total: entries.length, ...(next === undefined ? {} : { nextCursor: next }) }
}

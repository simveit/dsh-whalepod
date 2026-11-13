/**
 * Who is speaking in the coordinator chat. Pure: reads a session log.
 *
 * Two host decisions depend on the user's own words, never on text the coordinator model saw elsewhere:
 * - the working-directory guard accepts a folder outside the coordinator's own folder only when the user typed it
 *   in that coordinator's chat
 *   (`userTypedTexts`);
 * - a thread's first brief is recorded as the user's instruction only when the coordinator turn that started the
 *   thread was opened by a message the user typed (`turnOpenedByUser`); a turn woken by a thread notice gives the
 *   brief notice authority instead.
 *
 * "Typed by the user" means a `user/message` whose source kind is `user`, that carries a prompt request id (`rpcId`),
 * which is how the chat UI and `sessionController.prompt` record a prompt, and that has no `principal`: dsh records a
 * principal only for a caller other than the owner (a shared viewer allowed to prompt), so such a prompt is not the
 * user's. Notices, agent messages, runtime context, tool results and the plugin's own prompts (`dsh-coordinator:`
 * request ids) never count.
 */
import { allSpellings } from './names.ts'
import { messageText } from './status.ts'

interface LogEvent { readonly type: string; readonly data: unknown }

type Data = Record<string, unknown>
const asData = (value: unknown): Data => (value !== null && typeof value === 'object' ? value as Data : {})

/** Whether a `user/message` payload is a prompt the user typed. */
export function isUserTyped(message: unknown): boolean {
  const source = asData(asData(message)['source'])
  const rpcId = source['rpcId']
  return source['kind'] === 'user' && typeof rpcId === 'string' && !rpcId.startsWith('dsh-coordinator:') && source['principal'] === undefined
}

/** Text parts of every message the user typed in a session log, oldest first. */
export function userTypedTexts(events: readonly LogEvent[]): string[] {
  const out: string[] = []
  for (const event of events) {
    if (event.type !== 'user/message' || !isUserTyped(event.data)) continue
    const text = messageText(asData(event.data)['content'])
    if (text.trim() !== '') out.push(text)
  }
  return out
}

/**
 * Whether the current (last) turn of a session was opened by a message the user typed: one of the messages its
 * first step admitted. Steering the user typed later in the turn does not count, so a turn woken by a thread notice
 * stays a notice turn.
 * @returns false when the log has no turn.
 */
export function turnOpenedByUser(events: readonly LogEvent[]): boolean {
  let start = -1
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i]!.type === 'turn/start') { start = i; break }
  }
  if (start < 0) return false
  let inFirstStep = false
  for (let i = start + 1; i < events.length; i++) {
    const event = events[i]!
    if (event.type === 'step/start') {
      if (inFirstStep) return false
      inFirstStep = true
    } else if (event.type === 'step/end' || event.type === 'turn/end') {
      if (inFirstStep) return false
    } else if (inFirstStep && event.type === 'user/message' && isUserTyped(event.data)) {
      return true
    }
  }
  return false
}

/**
 * Tools whose results carry thread text into the coordinator's context, under their current and their earlier names:
 * a log written before the rename, or a turn that spans the upgrade, still counts. `executor_flag_user` and
 * `executor_stop` return the row with its fenced title, detail and last Report too (S3), and `executor_start` may
 * return a row of a folder confirmation.
 */
export const THREAD_DATA_TOOLS: ReadonlySet<string> = new Set(allSpellings(['read', 'list', 'flagUser', 'stop']))

/**
 * The plugin's own marks on a coordinator chat carry no thread text: the role mark of an adopted chat and the opening
 * message. dsh logs an injected mark inside the first turn that admits it, next to the user's first prompt.
 */
function isPluginMark(id: unknown): boolean {
  return typeof id === 'string' && PLUGIN_MARKS.some(prefix => id.startsWith(prefix))
}

/** Ids of the plugin's own marks in a coordinator chat that carry no thread text. */
const PLUGIN_MARKS = ['dsh-coordinator:role:', 'dsh-coordinator:opening:']

/**
 * Whether the current (last) turn has already put thread data in front of the coordinator: a thread notice or any
 * other message that is not the user's (agent messages, plugin notices), or a call of `executor_read` or
 * `executor_list`, `executor_flag_user` or `executor_stop` (or their earlier names). An Assignment written after that is
 * recorded with notice authority even in a turn the user opened, since planted text may have shaped it.
 */
export function turnSawThreadData(events: readonly LogEvent[]): boolean {
  let start = -1
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i]!.type === 'turn/start') { start = i; break }
  }
  if (start < 0) return false
  for (let i = start + 1; i < events.length; i++) {
    const event = events[i]!
    if (event.type === 'user/message') {
      const data = asData(event.data)
      const kind = asData(data['source'])['kind']
      if (kind === 'agent-message') return true
      if (kind === 'dsh-coordinator' && !isPluginMark(data['id'])) return true
    } else if (event.type === 'tool/call') {
      if (THREAD_DATA_TOOLS.has(String(asData(event.data)['name']))) return true
    }
  }
  return false
}

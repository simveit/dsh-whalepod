/**
 * Which threads a caller may see and control. Pure.
 *
 * A coordinator sees only the threads it started, and a thread lead sees only the other threads of its own
 * coordinator. A thread of another coordinator reads exactly like an id that does not exist, so a coordinator cannot
 * probe for the ids, Session ids or titles of other coordinators' threads. A row whose coordinator was dropped
 * (`coordinatorId` is empty) is reachable by no tool.
 */
import type { ThreadInfo } from '../types.ts'
import { inlineUntrusted } from './fence.ts'
import { TOOL } from './names.ts'

/** A thread row as the scope helpers see it; its owner is `info.coordinatorId`. */
export interface ScopedRow {
  info: ThreadInfo
  archived?: boolean
}

/** The error for a reference that names no thread the caller may see. */
export function unknownRefMessage(ref: string, listTool: string = TOOL.list): string {
  return `unknown executor session "${inlineUntrusted(ref, 80)}"; use ${listTool} to see the ids you can use`
}

/** Whether a row is live and belongs to `coordinatorId` (never for an empty id). */
function owned(row: ScopedRow, coordinatorId: string): boolean {
  return coordinatorId !== '' && row.archived !== true && row.info.coordinatorId === coordinatorId
}

/**
 * A live thread of one coordinator by its id, its lead Session id, or a title that exactly one of that coordinator's
 * live threads has (case-insensitive).
 * @param options.listTool - the tool the hint in the error names (the caller's own listing tool).
 * @throws the same error for an unknown reference and for another coordinator's thread; a title shared by several
 * of the caller's threads is an error that lists their ids.
 */
export function findOwned<R extends ScopedRow>(rows: Iterable<R>, coordinatorId: string, ref: string, options: { listTool?: string } = {}): R {
  const key = ref.trim()
  const mine = [...rows].filter(row => owned(row, coordinatorId))
  if (key !== '') {
    const direct = mine.find(row => row.info.id === key) ?? mine.find(row => row.info.sessionId !== '' && row.info.sessionId === key)
    if (direct !== undefined) return direct
    const lower = key.toLowerCase()
    const byTitle = mine.filter(row => row.info.title.toLowerCase() === lower)
    if (byTitle.length === 1) return byTitle[0]!
    if (byTitle.length > 1) {
      throw new Error(`several of your executor sessions are titled "${inlineUntrusted(ref, 80)}" (${byTitle.map(row => row.info.id).join(', ')}); use the id`)
    }
  }
  throw new Error(unknownRefMessage(ref, options.listTool))
}

/** The threads of one coordinator (none for an empty id). The input is expected to hold live threads only. */
export function ownedBy<T extends Pick<ThreadInfo, 'coordinatorId'>>(threads: Iterable<T>, coordinatorId: string): T[] {
  if (coordinatorId === '') return []
  return [...threads].filter(thread => thread.coordinatorId === coordinatorId)
}

/**
 * The peers of one thread: the other threads of the same coordinator that have a lead Session.
 * @param meId - the calling thread's id.
 */
export function peersOf<T extends Pick<ThreadInfo, 'id' | 'sessionId' | 'coordinatorId'>>(threads: Iterable<T>, coordinatorId: string, meId: string): T[] {
  return ownedBy(threads, coordinatorId).filter(thread => thread.id !== meId && thread.sessionId !== '')
}

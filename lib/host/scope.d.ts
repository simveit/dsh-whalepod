/**
 * Which threads a caller may see and control. Pure.
 *
 * A coordinator sees only the threads it started, and a thread lead sees only the other threads of its own
 * coordinator. A thread of another coordinator reads exactly like an id that does not exist, so a coordinator cannot
 * probe for the ids, Session ids or titles of other coordinators' threads. A row whose coordinator was dropped
 * (`coordinatorId` is empty) is reachable by no tool.
 */
import type { ThreadInfo } from '../types.ts';
/** A thread row as the scope helpers see it; its owner is `info.coordinatorId`. */
export interface ScopedRow {
    info: ThreadInfo;
    archived?: boolean;
}
/** The error for a reference that names no thread the caller may see. */
export declare function unknownRefMessage(ref: string, listTool?: string): string;
/**
 * A live thread of one coordinator by its id, its lead Session id, or a title that exactly one of that coordinator's
 * live threads has (case-insensitive).
 * @param options.listTool - the tool the hint in the error names (the caller's own listing tool).
 * @throws the same error for an unknown reference and for another coordinator's thread; a title shared by several
 * of the caller's threads is an error that lists their ids.
 */
export declare function findOwned<R extends ScopedRow>(rows: Iterable<R>, coordinatorId: string, ref: string, options?: {
    listTool?: string;
}): R;
/** The threads of one coordinator (none for an empty id). The input is expected to hold live threads only. */
export declare function ownedBy<T extends Pick<ThreadInfo, 'coordinatorId'>>(threads: Iterable<T>, coordinatorId: string): T[];
/**
 * The peers of one thread: the other threads of the same coordinator that have a lead Session.
 * @param meId - the calling thread's id.
 */
export declare function peersOf<T extends Pick<ThreadInfo, 'id' | 'sessionId' | 'coordinatorId'>>(threads: Iterable<T>, coordinatorId: string, meId: string): T[];

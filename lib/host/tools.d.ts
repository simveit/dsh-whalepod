import type { ReportKind, ThreadInfo } from '../types.ts';
import type { ToolDefinition } from './dsh.ts';
/** A dsh Session id. */
export type SessionId = string;
/**
 * What the tools need from the thread service. Every operation takes the calling Session's id first: coordinator
 * operations work only on the caller's own threads (scope.ts), thread operations only for the calling thread lead.
 */
export interface ThreadOps {
    /** Returns the new row as a tool view (views.ts `threadRowView`): trusted fields, notes, and a data block. */
    startThread(caller: SessionId, input: {
        title: string;
        brief: string;
        cwd?: string;
    }, signal: AbortSignal): Promise<unknown>;
    messageThread(caller: SessionId, ref: string, text: string, requestKey: string, signal: AbortSignal): Promise<{
        thread: string;
        delivery: string;
    }>;
    listThreads(caller: SessionId): ThreadInfo[];
    readThread(caller: SessionId, ref: string, mode: 'summary' | 'recent' | 'full', cursor: number | undefined, signal: AbortSignal): Promise<unknown>;
    /** Returns the row as a tool view (S3). */
    flagUser(caller: SessionId, ref: string, reason: string): unknown;
    /** Returns the row as a tool view with `stopped` (S3). */
    stopThread(caller: SessionId, ref: string): unknown;
    archiveThread(caller: SessionId, ref: string, options?: {
        force?: boolean;
    }): Promise<{
        archived: string;
    }>;
    report(caller: SessionId, kind: ReportKind, text: string): {
        delivered: 'wake' | 'quiet';
        note: string;
    };
    /** Other live threads of the caller's coordinator, for the calling thread lead (A6). */
    peers(caller: SessionId): unknown;
    sendPeer(caller: SessionId, ref: string, text: string, expectsReply: boolean, requestKey: string): Promise<{
        to: string;
        delivery: string;
    }>;
    /**
     * The memory page of the caller's own coordinator (a coordinator's own page, a Lead's coordinator's page): the whole
     * text, fenced as notes, with its revision and who changed it last.
     */
    readMemory(caller: SessionId): unknown;
    /**
     * Replace that whole page (empty clears it); refuses more than the cap after cleaning. `revision` is the revision
     * the text is based on: when it is not the current one, or undefined, nothing is saved and the result carries an
     * `error`, the current revision and the current text.
     */
    updateMemory(caller: SessionId, text: string, revision: number | undefined): unknown;
    /**
     * Schedule (or with 0 minutes cancel) one look-in at one of the caller's own working executors; a new call replaces
     * the pending one. The host clamps the minutes and reports the value it used.
     */
    checkLater(caller: SessionId, ref: string, minutes: number, focus: string | undefined): unknown;
}
export declare function coordinatorTools(ops: ThreadOps): ToolDefinition[];
export declare function threadTools(ops: ThreadOps): ToolDefinition[];
/**
 * The two operations on a coordinator's memory page, for the coordinator and for the Leads of its Executor Sessions
 * alike. Neither takes an argument that names a coordinator: the page is always the caller's own coordinator's.
 */
export declare function memoryTools(ops: ThreadOps): ToolDefinition[];

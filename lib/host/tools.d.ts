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
}
export declare function coordinatorTools(ops: ThreadOps): ToolDefinition[];
export declare function threadTools(ops: ThreadOps): ToolDefinition[];

/**
 * What the coordinator's read tools and `executor_peers` return. Pure.
 *
 * JSON keys (`threads`, `team`, ...) keep their internal names; only the labels inside data blocks use the
 * model-facing words (lead, teammate).
 *
 * Every value a thread can influence goes into data blocks (see fence.ts); fields the plugin derives itself (ids,
 * statuses, folders, times, counts) stay outside. A tool result is rendered as the JSON of its trusted fields
 * followed by the data blocks as plain text (`untrusted`), so the blocks keep their delimiters intact.
 */
import type { ThreadInfo } from '../types.ts';
/** A tool value with an optional untrusted text part that is rendered after the JSON. */
export interface ToolView {
    [key: string]: unknown;
    untrusted?: string;
}
/**
 * One row as `executor_start`, `executor_flag_user` and `executor_stop` return it (S3): the trusted fields, the
 * plugin's own extras (notes, whether it stopped, the user's action on the row), and the title, status detail and last
 * Report in a data block.
 */
export declare function threadRowView(thread: ThreadInfo, extra?: Record<string, unknown>): ToolView;
/** `executor_list`: statuses outside, titles and reports inside one data block per thread. */
export declare function threadListView(threads: readonly ThreadInfo[]): ToolView;
/**
 * `executor_peers`: what one thread may know about its siblings (M4): id, status and folder, and the title in a data
 * block. No reports, status details or question texts, which may carry another thread's private data.
 */
export declare function threadPeersView(threads: readonly ThreadInfo[]): ToolView;
export interface ThreadSummaryFacts {
    pendingInput: unknown;
    approvals: readonly {
        toolName: string;
        reason?: string;
        member?: string;
    }[];
    questions: readonly string[];
    lastAssistantText?: string;
    briefNotYetDelivered: boolean;
    /** The lead's subagents and team members: name, task label (thread text) and state. */
    team?: readonly {
        name: string;
        label?: string;
        state: string;
    }[];
}
/** `executor_read` summary: trusted status facts plus a data block with everything the thread wrote. */
export declare function threadSummaryView(thread: ThreadInfo, facts: ThreadSummaryFacts): ToolView;
/**
 * History lines in one data block, capped in total. Lines are already rendered (`[seq] role: text`); the cap keeps
 * whole lines from the end (recent) or from the start (pages).
 * @param keep - which end to keep when the lines exceed `maxChars`.
 */
export declare function historyBlock(threadId: string, lines: readonly string[], maxChars: number, keep: 'start' | 'end'): {
    text: string;
    omitted: number;
};
/**
 * Render a tool value for the model: JSON of the trusted fields, then the untrusted text as is.
 * @param value - the tool value.
 */
export declare function renderView(value: unknown): string;

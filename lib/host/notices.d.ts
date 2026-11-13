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
import type { ThreadReport, ThreadStatus } from '../types.ts';
export interface Notice {
    threadId: string;
    /**
     * The coordinator that owns the thread, set when the notice is added: the row can be gone (a denied folder) by the
     * time the batch goes out. Delivery groups a batch by it; a notice without one goes to the row's current owner.
     */
    coordinatorId?: string;
    title: string;
    at: number;
    /** Deliver with followup (wakes the coordinator) instead of inject. */
    wake: boolean;
    /** A coordinator_report from the thread lead. */
    report?: ThreadReport;
    /** A status the thread entered. */
    status?: ThreadStatus;
    detail?: string;
    /** Last assistant text of the thread, for finished turns. */
    lastText?: string;
    /** Hold this notice while the thread's turn runs (see the module comment). */
    hold?: boolean;
    /** A line the plugin itself writes (rate guards, restarts); never thread text. */
    alert?: string;
    /** A message this thread sent to another thread with `thread_send` (A6). */
    peer?: {
        to: string;
        text: string;
    };
    /** The lead's team members at the end of a turn: name, task label and how each ended (labels are thread text). */
    team?: {
        name: string;
        label?: string;
        state: string;
    }[];
    /** The waiting approval or question comes from a team member, not the lead (its name). */
    member?: string;
}
export interface Timers {
    now(): number;
    set(fn: () => void, ms: number): unknown;
    clear(handle: unknown): void;
}
export declare const realTimers: Timers;
export interface BatcherOptions {
    /** Quiet time after the last notice before a batch is delivered. */
    debounceMs: number;
    /** Upper bound between the first notice of a batch and its delivery. */
    maxDelayMs: number;
    flush(batch: Notice[]): void;
    /** Whether a thread is still busy (its lead's turn or any team member); held notices of a busy thread wait. */
    running?(threadId: string): boolean;
    /** How long a held notice of this thread may wait; defaults to `maxDelayMs`. */
    holdMs?(threadId: string): number;
    /** Whether a status notice no longer holds at delivery time; such notices are dropped. */
    stale?(notice: Notice): boolean;
    timers?: Timers;
}
export declare class NoticeBatcher {
    private pending;
    private firstAt;
    private timer;
    private readonly timers;
    private readonly options;
    constructor(options: BatcherOptions);
    get size(): number;
    add(notice: Notice): void;
    /** Re-check held notices soon, for example when a thread's turn ended without a status notice. */
    kick(): void;
    private schedule;
    /** Deliver what is pending now, except held notices of threads that are still in their turn. */
    flushNow(): void;
    /** Drop pending notices and timers (on unload). */
    dispose(): void;
}
/** Upper bound of a notice summary, as dsh bounds `notice` summaries (dsh-llm CONTEXT_SUMMARY_MAX_CHARS). */
export declare const SUMMARY_MAX_CHARS = 120;
/**
 * The one-line account of one thread's notices that the chat shows on the collapsed row, e.g.
 * `Thread "Fix the build" reported a result`. The most pressing fact wins.
 */
export declare function threadSummary(notices: readonly Notice[]): string;
/** What happened to a thread, most pressing fact first, e.g. `reported a result`. Contains no thread text. */
export declare function threadWhat(notices: readonly Notice[]): string;
/** One coordinator message per thread, for a batch that wakes the coordinator. */
export interface NoticeMessage {
    threadId: string;
    text: string;
    summary: string;
}
/** Word a waking batch as one message per thread (each names its thread in the chat). */
export declare function noticeMessages(batch: readonly Notice[]): NoticeMessage[];
/** Word a batch as one coordinator message. Notices are grouped per thread; only a thread's latest status is kept. */
export declare function formatNotices(batch: readonly Notice[]): {
    text: string;
    wake: boolean;
    summary: string;
};

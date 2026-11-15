/**
 * Notices from threads to the coordinator: batching and wording. Pure apart from injectable timers.
 *
 * Every thread change that the coordinator should hear about becomes a Notice. Notices are collected for a short
 * debounce window (bounded by a maximum delay) and delivered as one message, so a burst of events (a result report
 * followed by the end of the turn, or several threads finishing together) wakes the coordinator once. A batch wakes
 * the coordinator (it starts a turn of its chat) when any notice in it wants a wake; a batch of mere progress is
 * injected without waking it. A batch that wakes while the chat runs a turn waits in the plugin until that turn has
 * ended (`deliverTo` in threads.ts): nothing is queued in the chat, where dsh would show it as the user's own queued
 * message.
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
import { type FenceField } from './fence.ts';
import { type TodoItem } from './history.ts';
export interface Notice {
    threadId: string;
    /**
     * The coordinator that owns the thread, set when the notice is added: the row can be gone (a denied folder) by the
     * time the batch goes out. Delivery groups a batch by it; a notice without one goes to the row's current owner.
     */
    coordinatorId?: string;
    title: string;
    at: number;
    /** Wake the coordinator (start a turn of its chat, once it is idle) instead of adding the notice quietly. */
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
    /**
     * A look-in the coordinator scheduled with `executor_check_later` (decision 66). It wakes the coordinator but is not
     * counted by the wake guard, is never held, and is dropped when the executor no longer works at delivery.
     */
    lookIn?: LookIn;
    /**
     * Set while the notice is in the batch window and a turn of its coordinator's chat did not end normally
     * (`NoticeBatcher.markTurnBroke`): it is then delivered like a notice that waited through that turn (`blocked` in
     * threads.ts), not as a new one that starts the chat again right after the user stopped it.
     */
    turnBroke?: boolean;
}
/** What a look-in notice carries: the coordinator's own focus, plugin counts, and what the executor wrote (shown in this order: latest message, Reports, todo list). */
export interface LookIn {
    /** The coordinator's own words for what to check, cleaned to one line (`focusLine`); shown back in quotes, cut at `FOCUS_MAX`. */
    focus?: string;
    /** Minutes since the coordinator scheduled it. */
    minutes: number;
    /** Model steps of the Lead since it was scheduled. */
    steps: number;
    /** The Lead's turn has not started yet: the executor is queued for a free slot or starting. */
    notStarted?: boolean;
    /** The executor's last Reports, oldest first (executor text). */
    reports: ThreadReport[];
    /** The Lead's latest assistant message (executor text). */
    lastText?: string;
    /** The Lead's current todo list (executor text); undefined when it never wrote one. */
    todos?: TodoItem[];
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
    add(notice: Notice): void;
    /** Re-check held notices soon, for example when a thread's turn ended without a status notice. */
    kick(): void;
    private schedule;
    /** Deliver what is pending now, except held notices of threads that are still in their turn. */
    flushNow(): void;
    /**
     * A turn of a coordinator's chat ended: its notices that are in the batch window now are marked when the turn did
     * not end normally (`Notice.turnBroke`), and the mark is taken off again when a later turn ended normally.
     */
    markTurnBroke(coordinatorId: string, broke: boolean): void;
    /** Drop pending notices and timers (on unload). */
    dispose(): void;
}
/** Preview length of each Report and of the latest message in a look-in. */
export declare const LOOK_IN_PREVIEW = 200;
/** Reports a look-in shows. */
export declare const LOOK_IN_REPORTS = 4;
/** Longest look-in focus kept, and the longest the tool accepts before cutting it. */
export declare const FOCUS_MAX = 200;
export declare const FOCUS_RAW_MAX = 2000;
/**
 * The coordinator's look-in focus as the plugin writes it back: one line, no controls or invisible characters, data
 * block delimiters neutralised, double quotes replaced (it is shown in quotes) and capped. The coordinator may have
 * copied it from executor text, so it is cleaned like an untrusted label.
 */
export declare function focusLine(text: string, max?: number): string;
/**
 * The look-in part of a thread block: plugin lines (counts, the coordinator's focus, how to read the previews) and the
 * fenced fields with what the executor itself wrote, each a short preview. Only this function decides what a look-in
 * shows, so its content can change in one place.
 */
export declare function lookInParts(lookIn: LookIn, now: number): {
    lines: string[];
    fields: FenceField[];
};
/** Upper bound of a notice summary, as dsh bounds `notice` summaries (dsh-llm CONTEXT_SUMMARY_MAX_CHARS). */
export declare const SUMMARY_MAX_CHARS = 120;
/**
 * The one-line account of one thread's notices that the chat shows on the collapsed row, e.g.
 * `Thread "Fix the build" reported a result`. The most pressing fact wins.
 */
export declare function threadSummary(notices: readonly Notice[]): string;
/**
 * Whether one thread's notices are a look-in and nothing that needs the coordinator: the look-in alone, or with quiet
 * `progress` Reports or peer-message notices of the same executor from the same debounce window. Such a batch keeps
 * the look-in's quiet wording and form. Any waking notice, plugin alert or status makes it an ordinary update.
 */
export declare function isLookIn(notices: readonly Notice[]): boolean;
/** What happened to a thread, most pressing fact first, e.g. `reported a result`. Contains no thread text. */
export declare function threadWhat(notices: readonly Notice[]): string;
/** One coordinator message per thread, for a batch that wakes the coordinator. */
export interface NoticeMessage {
    threadId: string;
    text: string;
    summary: string;
    /** A look-in (`isLookIn`): delivered as a collapsed notice row rather than a message from the executor. */
    lookInOnly: boolean;
}
/** Word a waking batch as one message per thread (each names its thread in the chat). */
export declare function noticeMessages(batch: readonly Notice[]): NoticeMessage[];
/** Word a batch as one coordinator message. Notices are grouped per thread; only a thread's latest status is kept. */
export declare function formatNotices(batch: readonly Notice[]): {
    text: string;
    wake: boolean;
    summary: string;
};

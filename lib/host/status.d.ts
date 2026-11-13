/**
 * Thread status derivation. Pure: no dsh or Node imports, so it is unit tested directly.
 *
 * A thread's status is derived from a small set of facts that the thread service folds from three sources:
 * `session/event` log events (turns, approvals, ask_user_question calls), `agent/status` and `agent/error`, and the
 * coordinator's own actions (flag, stop, queueing). Facts marked "live" are not persisted: after a restart dsh ends
 * every open turn, so pending approvals and questions are gone too.
 */
import type { ThreadReport, ThreadStatus } from '../types.ts';
export type ThreadPhase = 
/** Created; the brief waits for a free slot. */
'queued'
/** The brief was delivered; no turn has started yet. */
 | 'starting'
/** At least one turn started. */
 | 'active';
export interface TurnEnd {
    /** dsh `turn/end` reason kind: completed, aborted, error, blocked, max-tokens, interrupted, ... */
    kind: string;
    at: number;
    detail?: string;
}
export interface ThreadFacts {
    phase: ThreadPhase;
    /** Live: the thread lead's agent is running a turn. */
    running: boolean;
    /** Live: open `approval/asked` without a matching `approval/decided`, by approval id. */
    approvals: Record<string, {
        toolName: string;
        reason?: string;
    }>;
    /** Live: open `ask_user_question` calls without a `tool/result`, by call id. */
    questions: Record<string, {
        text: string;
    }>;
    lastTurnStartAt?: number;
    lastTurnEnd?: TurnEnd;
    needsUser?: {
        reason: string;
        at: number;
    };
    lastReport?: ThreadReport;
    /** Last assistant text of the thread lead, clipped. */
    lastAssistantText?: string;
    /** The coordinator asked to stop the current turn; the resulting abort is not reported back to it. */
    stopRequestedAt?: number;
    /**
     * Live: the lead's subagents and Agent Teams members (separate child Sessions in the lead's tree), by Session id.
     * The thread is busy while any of them works, even when the lead's own turn has ended.
     */
    members?: Record<string, MemberFacts>;
    /** Names of the members that were working when the table was last saved (persisted; see restoredFacts). */
    membersAtSave?: string[];
    /**
     * The thread waits for the user to confirm its folder (outside the threads root, behind a symlink, or another
     * thread's folder); it has no Session until then. Persisted.
     */
    confirm?: {
        path: string;
        why: 'outside' | 'existing' | 'symlink' | 'thread-folder' | 'coordinator-folder';
        at: number;
    };
    /** The spend guards paused the thread until the user resumes it. Persisted. */
    paused?: {
        reason: 'wakes' | 'budget' | 'peers';
        count: number;
        at: number;
    };
}
/** One subagent or team member of a thread lead's tree. */
export interface MemberFacts {
    /** Model-facing name (`wc-impl`, `reviewer/checker`) or a short id. */
    name: string;
    /** The task label the creator gave it. */
    label?: string;
    /** Its child Session runs a turn. */
    running: boolean;
    /** Its creator got the runtime's settlement notice: it does no further work unless messaged. */
    settled: boolean;
    /** When it last went idle without being settled yet (the settlement notice follows within moments). */
    idleSince?: number;
    approvals: Record<string, {
        toolName: string;
        reason?: string;
    }>;
    questions: Record<string, {
        text: string;
    }>;
    /** Its last assistant text, clipped. */
    lastText?: string;
    /** How its last activation ended, from the settlement notice (`completed`, `aborted`, `error`, ...). */
    stopReason?: string;
}
/** How long an idle, unsettled member still counts as working: the runtime's settlement notice comes right after. */
export declare const SETTLE_GRACE_MS = 5000;
export declare function initialFacts(phase: ThreadPhase): ThreadFacts;
/** The persisted part of the facts. */
export type PersistedFacts = Omit<ThreadFacts, 'running' | 'approvals' | 'questions' | 'members'>;
export declare function persistedFacts(facts: ThreadFacts, now?: number): PersistedFacts;
/** Members that still work: running, or idle for a moment while their settlement notice is on its way. */
export declare function workingMembers(facts: ThreadFacts, now: number): MemberFacts[];
/** The lead or any member of its tree works: the thread holds a slot and stays `running`. */
export declare function treeRunning(facts: ThreadFacts, now: number): boolean;
/** Open approvals of the whole tree, the lead's first; each names the member that asked, if any. */
export declare function treeApprovals(facts: ThreadFacts): {
    id: string;
    toolName: string;
    reason?: string;
    member?: string;
    sessionId?: string;
}[];
/** Open user questions of the whole tree, the lead's first. */
export declare function treeQuestions(facts: ThreadFacts): {
    id: string;
    text: string;
    member?: string;
    sessionId?: string;
}[];
/** Whether anyone in the tree waits on the user (such a thread holds no slot). */
export declare function treeWaiting(facts: ThreadFacts): boolean;
/** Register a member the creator just started (`subagent/catalog` in the creator's log). */
export declare function addMember(facts: ThreadFacts, sessionId: string, name: string, label: string | undefined): ThreadFacts;
/** A member's agent started or stopped running (`agent/status` of its Session). */
export declare function memberRunning(facts: ThreadFacts, sessionId: string, running: boolean, now: number): ThreadFacts;
/** The runtime told the creator that a member settled (a `subagent-settled` message in the creator's log or inbox). */
export declare function memberSettled(facts: ThreadFacts, sessionId: string, stopReason: string | undefined): ThreadFacts;
/** Fold one `session/event` of a member's own Session: its turns, approvals, questions and last text. */
export declare function applyMemberEvent(facts: ThreadFacts, sessionId: string, event: {
    type: string;
    data: unknown;
}, now: number): ThreadFacts;
export interface DerivedStatus {
    status: ThreadStatus;
    detail?: string;
}
export declare function clip(text: string, max: number): string;
/**
 * First line of a report or message, for a one-line status detail. A very short first line ("Done.", "Result:")
 * says nothing on its own, so the next line is joined to it.
 */
export declare function headline(text: string, max?: number): string;
/** Derive the status from the facts. Waiting on the user wins over everything else. */
export declare function deriveStatus(facts: ThreadFacts, now?: number): DerivedStatus;
/** Text of the first question of an ask_user_question call (its arguments are a JSON string). */
export declare function questionText(args: unknown): string;
/** Concatenated text parts of a message content array. */
export declare function messageText(content: unknown): string;
/**
 * Fold one `session/event` of the thread lead's Session into the facts. Returns the same object when nothing
 * changed, so callers can skip work.
 */
export declare function applyEvent(facts: ThreadFacts, event: {
    type: string;
    data: unknown;
}, now: number): ThreadFacts;
/**
 * Facts when the plugin loads its saved table. Live facts start empty; `foldTurn` fills them from the log afterwards.
 * @param live - the thread lead's agent status when it is already loaded (a plugin reload while the app runs), else
 *   undefined (an app start: dsh ended every open turn).
 * @param queued - the brief was never delivered; the thread is submitted again rather than marked stopped.
 */
export declare function restoredFacts(saved: PersistedFacts, live: 'running' | 'idle' | undefined, queued: boolean, now?: number): ThreadFacts;
/**
 * Re-derive turn facts from the thread lead's log: fold every event from the last `turn/start` on, so open
 * approvals and questions, a turn that ended while the plugin was not loaded, and the last assistant text are right.
 * @param running - whether the agent runs now (the log alone cannot tell a live turn from one cut off by a quit).
 */
export declare function foldTurn(facts: ThreadFacts, events: readonly {
    type: string;
    data: unknown;
    time?: number;
}[], running: boolean, now?: number): ThreadFacts;

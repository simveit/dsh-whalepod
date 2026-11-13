export interface Entry {
    seq: number;
    role: 'user' | 'brief' | 'coordinator' | 'peer' | 'member' | 'other' | 'assistant' | 'tool-call' | 'tool-result' | 'approval' | 'turn' | 'summary';
    text: string;
}
/** Who wrote a message the plugin delivered, from its source; see `messageRole`. */
export interface HistoryContext {
    /**
     * Every Session that is or ever was a coordinator chat (any coordinator, reopened chats included); agent messages
     * from one of them are labelled `coordinator`.
     */
    coordinatorSessionIds?: ReadonlySet<string>;
    /** Title of another thread by its session id, for peer messages (A6). */
    peerTitle?(sessionId: string): string | undefined;
    /** Name of one of this thread's subagents or team members by its session id. */
    memberName?(sessionId: string): string | undefined;
}
/**
 * The role of one user-role message in a thread's log: the user's own typing, the coordinator's brief (recorded as
 * a prompt with a `dsh-coordinator:brief:` request id), a coordinator message, a message from another thread, or
 * something else (runtime context, notices).
 */
export declare function messageRole(source: Record<string, unknown>, context?: HistoryContext): {
    role: Entry['role'];
    label?: string;
};
export declare function toEntries(events: readonly {
    type: string;
    seq: number;
    data: unknown;
}[], context?: HistoryContext): Entry[];
export declare function render(entry: Entry): string;
/** The last `count` entries, rendered. */
export declare function recent(entries: readonly Entry[], count: number): string[];
export interface Page {
    lines: string[];
    /** Pass as `cursor` to read the next page; absent on the last page. */
    nextCursor?: number;
    total: number;
}
/** Entries after `cursor` (an event seq), up to `maxChars` characters of rendered text (at least one entry). */
export declare function page(entries: readonly Entry[], cursor: number | undefined, maxChars: number): Page;

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
/** One entry of dsh's todo list (`todo/write` in dsh-tool-todo): a short line and a three-state status. */
export interface TodoItem {
    content: string;
    status: 'pending' | 'in_progress' | 'completed';
}
/**
 * The Lead's current todo list: the list of the latest `todo/write` event in its log (each event replaces the whole
 * list), or undefined when it never wrote one. Malformed entries are skipped.
 */
export declare function latestTodos(events: readonly {
    type: string;
    data: unknown;
}[]): TodoItem[] | undefined;
/** Items a compact todo list shows, and the length of each item's text. */
export declare const TODO_ITEMS_MAX = 15;
export declare const TODO_ITEM_MAX = 100;
/** A todo list as compact lines: a status mark and the item clipped, at most 15 items, then "+N more". Executor text. */
export declare function todoLines(items: readonly TodoItem[]): string;

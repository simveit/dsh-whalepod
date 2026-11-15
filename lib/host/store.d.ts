import type { ThreadInfo } from '../types.ts';
import { type ModelChoice } from './model.ts';
import type { PersistedFacts } from './status.ts';
export interface PersistedThread {
    info: ThreadInfo;
    facts: PersistedFacts;
    /** A brief not yet delivered (the thread was queued when the app quit). */
    pendingBrief?: string;
    /** How the brief is recorded: as the user's prompt or as an agent message (see authority.ts). Missing reads as `notice`. */
    briefAs?: 'user' | 'notice';
    /** Coordinator and peer messages waiting for the brief, as rendered text with their request keys. */
    pendingMessages?: {
        key: string;
        text: string;
    }[];
    /** The Workspace the thread's Session sits in: its sidebar group. */
    workspaceId?: string;
    /** The plugin created that Workspace. */
    ownWorkspace?: boolean;
    /** The plugin created the thread's folder (below its coordinator's folder such a folder needs no confirmation). */
    ownFolder?: boolean;
    /** The coordinator's Executor prompt when this Executor Session started (it keeps that one for life). */
    executorPrompt?: string;
    /** Archived threads stay in the file but leave the list and are no longer tracked. */
    archived?: boolean;
}
/** Who changed a coordinator's memory: the owner on the page, the coordinator, or the Lead of one of its Executor Sessions. */
export interface MemoryWriter {
    by: 'user' | 'coordinator' | 'executor';
    /** For `executor`: the Executor Session's id (`t-…`). */
    executor?: string;
    at: number;
}
export interface PersistedCoordinator {
    /** `c-` + 4 hex, unique. */
    id: string;
    /** The chat Session; null while there is none (a version 1 file without one). The record and its threads stay. */
    sessionId: string | null;
    /** Real path; the header cwd of the chat Session, fixed for life, and its sidebar Workspace. */
    home: string;
    /** Real path; the default parent of new thread folders. The user can change it. */
    folder: string;
    /** The coordinator Workspace of `home`. */
    workspaceId?: string;
    /** Last seen Session title, for the page while the Session is cold. */
    title?: string;
    /** Unique name (e.g. "Noether"); absent in files written before names existed (a name is chosen on load). */
    name?: string;
    /** The user's Executor prompt for this coordinator's Executor Sessions (max 4000 chars). */
    executorPrompt?: string;
    /**
     * The coordinator's memory, one markdown page (max 6000 chars) that it shares with the Leads of its Executor
     * Sessions; written with `memory_update` by the coordinator or a Lead, or by the owner on the page.
     */
    memory?: string;
    /** Revision of `memory`: a whole number that grows by one with every change of the text; absent means 0. */
    memoryRevision?: number;
    /** Who changed `memory` last, and when. */
    memoryBy?: MemoryWriter;
    /**
     * The Executor Sessions (row ids, oldest first, at most `MEMORY_EXECUTORS_MAX`) that changed `memory` since the
     * owner last saved it on the Coordinator page. Only the owner's save clears it: a later write by the coordinator
     * changes `memoryBy` but leaves this mark, so executor text in the page stays marked until the owner has seen it.
     */
    memoryExecutors?: string[];
    /** The owner switched this coordinator's memory off: nobody is shown the text or may change it by tool; it is kept. */
    memoryOff?: boolean;
    /**
     * The model the owner set for the chat (ids from dsh's lists); absent = the chat keeps the model it has. A model
     * picked by hand in the chat is stored here too, so the two are one value.
     */
    coordinatorModel?: ModelChoice;
    /** The model new Executor Sessions start on; absent = same as the coordinator. */
    executorModel?: ModelChoice;
    /** Which log mark validation expects: the opening turn (or the legacy title), or the role mark of an adopted chat. */
    marks?: 'opening' | 'role';
    /** Chat Sessions this coordinator had before a Reopen; messages they sent into threads still read as the coordinator's. */
    pastSessionIds?: string[];
    createdAt: number;
    updatedAt: number;
    /** Archived by the user on the Coordinator page. */
    archived?: boolean;
    /**
     * The coordinator a version 1 file became. Its rows may carry briefs of that release (no coordinator id in the mark),
     * which bind only to it, and it is kept for archived rows alone. At most one record carries it.
     */
    migratedV1?: boolean;
}
/** A sidebar Workspace the plugin uses as a home for coordinators. */
export interface PersistedCoordinatorWorkspace {
    /** Workspace id; empty until the registry was asked (a migrated version 1 file). */
    id: string;
    path: string;
    /** The plugin registered it. */
    own: boolean;
}
export interface PersistedState {
    version: 2;
    revision: number;
    coordinators: PersistedCoordinator[];
    coordinatorWorkspaces: PersistedCoordinatorWorkspace[];
    threads: PersistedThread[];
    /** The permission mode the user picked for new threads; absent until they pick one (the config default applies). Global. */
    threadPermission?: 'auto' | 'ask';
    /**
     * Folders outside every coordinator's folder the user chose "Always allow" for (real paths). Loaded entries are
     * hints only: each is checked by the folder guard again, a thread still needs the user to name the folder, and the
     * list never lifts a hard refusal. Global.
     */
    allowedFolders?: string[];
    /** The coordinator "Open coordinator chat" opens. */
    lastCoordinatorId?: string;
    /**
     * Retired: the one-time removal of plugin-made thread Workspaces of an earlier build. Always written as true so an
     * older build never runs that removal on a file whose executors now have their own groups again.
     */
    workspacesMigrated?: boolean;
    /** Every live Executor Session got its own sidebar group once (threads.ts groupExecutors). */
    executorGroups?: boolean;
    /** When the state file was last found unusable (N1): the panel keeps saying so until the owner opens a coordinator. */
    degradedSince?: number;
}
export declare const STATE_VERSION = 2;
export declare function emptyState(): PersistedState;
/** The file was written by a newer plugin version; it is neither read nor overwritten. */
export declare class NewerStateError extends Error {
}
/** What upgrading a version 1 file needs: the legacy threads root (its coordinator's home and folder) and the clock. */
export interface UpgradeContext {
    /** Absolute legacy threads root (`threadsRoot` config). */
    threadsRoot?: string;
    now?: () => number;
    /** Id source, for tests. */
    newId?: (taken: ReadonlySet<string>) => string;
}
/**
 * Parse a stored state, dropping malformed rows instead of failing the whole table. A version 1 file is upgraded:
 * its coordinator becomes one record (home and folder the legacy threads root), every thread row gets that
 * coordinator, and rows strictly below the old root are marked as plugin-made folders.
 */
export declare function parseState(text: string, upgrade?: UpgradeContext): PersistedState;
/** A stored Executor prompt, cleaned and within the cap (S6: treated like every other stored field), or undefined. */
export declare function storedPrompt(value: unknown): string | undefined;
/** A stored coordinator memory, cleaned and within the cap like the Executor prompt, or undefined (dropped). */
export declare function storedMemory(value: unknown): string | undefined;
/**
 * The highest memory revision a state file may carry. A page is far from it in any real use; a higher stored value
 * could reach the top of the safe integers, where the next revision is no number a write can name (`revisionArg`
 * and `setCoordinatorMemory` take safe integers only), and the page could never be written again.
 */
export declare const MEMORY_REVISION_MAX: number;
/** A stored memory revision: a whole number from 0 to `MEMORY_REVISION_MAX`; anything else reads as 0 (absent). */
export declare function storedMemoryRevision(value: unknown): number;
/**
 * A stored last writer of a memory: a known kind, an Executor Session id for an executor, and a time; else undefined
 * (dropped). A writer without a real time is dropped too, so the page never shows a change dated 1970.
 */
export declare function storedMemoryWriter(value: unknown): MemoryWriter | undefined;
/** Most Executor Sessions kept in `memoryExecutors`; past it the oldest ids are dropped. */
export declare const MEMORY_EXECUTORS_MAX = 20;
/**
 * A stored `memoryExecutors`: the entries that look like Executor Session ids, each once, the last
 * `MEMORY_EXECUTORS_MAX`. A repeated id keeps its last position, as a repeated writer does while the plugin runs
 * (`storeMemory` moves it to the end).
 */
export declare function storedMemoryExecutors(value: unknown): string[];
/** What loading found besides the state. */
export interface LoadResult {
    state: PersistedState;
    /** Saving is refused (a newer version wrote the file). */
    readOnly: boolean;
    /** One line for the log and the panel when something was wrong with the file. */
    problem?: string;
    /** The file was a version 1 file, upgraded in memory; it is copied to `state.v1.json` before the first write. */
    upgraded?: boolean;
}
/** Most archived rows kept in the file; older ones are dropped (their sessions and folders stay). */
export declare const ARCHIVED_KEEP = 100;
/** Drop the oldest archived rows beyond `ARCHIVED_KEEP`. */
export declare function pruneArchived(threads: readonly PersistedThread[]): PersistedThread[];
/** Drop the oldest archived coordinators beyond `ARCHIVED_COORDINATORS_KEEP`, never one that still owns a live thread. */
export declare function pruneCoordinators(coordinators: readonly PersistedCoordinator[], threads: readonly PersistedThread[]): PersistedCoordinator[];
export declare class JsonStore {
    readonly file: string;
    /** Set when the file belongs to a newer plugin version: `save` then refuses. */
    readOnly: boolean;
    private readonly now;
    private readonly upgrade;
    /** The version 1 text read on load, copied to `state.v1.json` before the first version 2 write. */
    private v1Text;
    constructor(file: string, now?: () => number, upgrade?: UpgradeContext);
    /** Where the version 1 file is kept after an upgrade. */
    get v1File(): string;
    /**
     * Read the state. A missing file is an empty table. A file that is not valid JSON or has an unknown old version
     * is moved aside (`state.json.corrupt-<time>`) and the table starts empty. A file from a newer version is left
     * untouched and the store becomes read-only, so a downgrade never overwrites it. A version 1 file is upgraded.
     */
    load(): LoadResult;
    /**
     * Write the state atomically: a temporary file with a random name (not derived from the pid, so nothing can block
     * it in advance by creating that name), then a rename. Throws when the write fails; the service shows that as a
     * host problem. The first write after a version 1 load first copies that file to `state.v1.json` (mode 0600,
     * never overwritten); when the copy fails, nothing is written.
     */
    save(state: PersistedState): void;
}

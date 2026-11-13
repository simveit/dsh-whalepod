import type { ThreadInfo } from '../types.ts';
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
    /** Legacy: the thread's own Workspace from releases before threads moved to Ungrouped (removed once, design 4.4). */
    workspaceId?: string;
    /** Legacy: the plugin created the thread's Workspace. */
    ownWorkspace?: boolean;
    /** The plugin created the thread's folder (below its coordinator's folder such a folder needs no confirmation). */
    ownFolder?: boolean;
    /** The coordinator's Executor prompt when this Executor Session started (it keeps that one for life). */
    executorPrompt?: string;
    /** The thread was moved off `auto` while the plugin was removed; restore `auto` on the next load. */
    presetParked?: boolean;
    /** Archived threads stay in the file but leave the list and are no longer tracked. */
    archived?: boolean;
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

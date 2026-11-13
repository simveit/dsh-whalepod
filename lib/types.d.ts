/** Wire types shared by the host service and the web client. */
/** Result of `coordinator/ping`. */
export interface PingResult {
    ok: true;
    /** Version of the running dsh installation. */
    dshVersion: string;
    /** Host time of the call, ISO 8601. */
    time: string;
}
/** Where a thread stands, as the coordinator and the panel see it. */
export type ThreadStatus = 'starting' | 'running' | 'idle'
/** Auto mode escalated an approval to the user. */
 | 'waiting-approval'
/** The thread asked the user a question nobody answered yet. */
 | 'waiting-question'
/** The coordinator flagged the thread for the user. */
 | 'needs-user' | 'done' | 'failed' | 'stopped';
/**
 * How threads run. `auto`: dsh's auto review checks every action and sends the risky ones to the user; there is no
 * file sandbox. `ask`: dsh's `workspace-write` preset: writes stay in the thread's folder, and anything else asks
 * the user.
 */
export type ThreadPermission = 'auto' | 'ask';
/** Kinds of `coordinator_report` a thread lead can send. */
export type ReportKind = 'progress' | 'question' | 'result' | 'blocked';
export interface ThreadReport {
    kind: ReportKind;
    text: string;
    at: number;
}
export interface ThreadInfo {
    /** Short stable thread id, e.g. t-3f9a. */
    id: string;
    /** dsh session id of the thread lead. */
    sessionId: string;
    title: string;
    cwd: string;
    status: ThreadStatus;
    /** One line: what it waits on, or the last report headline. */
    statusDetail?: string;
    lastReport?: ThreadReport;
    /**
     * The thread lead's subagents and Agent Teams members: how many it started and how many still work. While any
     * works the thread is `running`, even when the lead's own turn has ended.
     */
    team?: {
        members: number;
        working: number;
    };
    /**
     * The Session that shows the open approval or question card when a team member, not the lead, waits on the user
     * (the member's child Session). Absent when the lead waits.
     */
    attentionSessionId?: string;
    /** The permission mode the user chose when the thread started (what it runs on may be stricter, never looser). */
    permission?: ThreadPermission;
    /** What the user can do on the thread's row: confirm its folder, or resume it after a pause. */
    action?: ThreadAction;
    /**
     * The coordinator that owns the thread, for life. Empty string for a row whose coordinator record was dropped by
     * state validation ("Without coordinator"): only Archive applies to it.
     */
    coordinatorId: string;
    createdAt: number;
    updatedAt: number;
}
/**
 * An action only the user can take on a thread's row (the panel and the side pane show buttons for it).
 * `confirm-folder`: the thread waits for the user to allow its folder (real path); it has no Session yet.
 * `resume`: the spend guards paused it after too many wake-ups, turns or peer messages.
 */
export type ThreadAction = {
    kind: 'confirm-folder';
    path: string;
    /**
     * `outside`: not below the coordinator's folder. `existing`: an existing folder below the coordinator's folder
     * that the plugin did not create. `symlink`: the path resolves elsewhere. `thread-folder`: another live thread
     * works there. `coordinator-folder`: legacy (v1 `_coordinator`), kept for old rows.
     */
    why: 'outside' | 'existing' | 'symlink' | 'thread-folder' | 'coordinator-folder';
} | {
    kind: 'resume';
    reason: 'wakes' | 'budget' | 'peers';
    count: number;
};
/** The user's answer to a folder confirmation. */
export type FolderDecision = 'once' | 'always' | 'deny';
/** Whether the coordinator and its threads have a model to run on. */
export interface ModelHealth {
    /** False when the model the coordinator would use (its own, else the dsh default) has no usable provider. */
    ok: boolean;
    /** `provider/model` of the model that was checked, when there is one. */
    model?: string;
    /** Why it cannot run, one line, when `ok` is false. */
    reason?: 'no-provider' | 'no-model' | 'model-unavailable';
}
/** Why the host is not working normally, for a notice in the panel. */
export interface HostProblem {
    /**
     * `locked`: another dsh process on the same DSH_HOME owns the coordinator; this one is disabled.
     * `read-only`: the state file is from a newer plugin version; nothing is saved.
     * `state-reset`: the state file could not be read and was moved aside; the plugin started without saved
     * coordinators and Executor Sessions, and Sessions that carry its marks stay narrowed (fail closed).
     * `state-dropped`: entries of the state file did not match their Sessions and were ignored.
     * `save-failed`: the state file could not be written.
     * `auto-unavailable`: threads started in auto mode run stricter, or cannot run, because auto review is not loaded.
     * `bad-root`: the base folder for new coordinators is refused; New coordinator is disabled (a coordinator whose own
     * folder is refused shows that in `CoordinatorInfo.folderProblem` instead).
     * `not-ready`: dsh services the plugin needs are missing.
     */
    kind: 'locked' | 'read-only' | 'state-reset' | 'state-dropped' | 'save-failed' | 'auto-unavailable' | 'bad-root' | 'not-ready';
    /** One line with the details. */
    detail: string;
}
/** One coordinator: a chat Session that delegates, with its home Workspace and the folder its threads go to. */
export interface CoordinatorInfo {
    /** Short stable coordinator id, e.g. c-1a2b. */
    id: string;
    /** Chat Session; null while the chat is archived or gone (Reopen creates one). */
    sessionId: string | null;
    /**
     * The coordinator's unique name (a famous thinker's surname by default, e.g. "Noether"); 1-40 chars, no control
     * characters, unique among live coordinators. The owner changes it with `renameCoordinator`.
     */
    name: string;
    /** Display title of the chat and its sidebar group: the name with the role, e.g. "Coordinator Noether". */
    title: string;
    /**
     * Executor prompt: the user's standing instructions every Executor Session of this coordinator starts with
     * (max 4000 chars; control characters other than newline and tab are stripped). Absent or empty when none is set.
     * Applies to Executor Sessions started after the save. Only the owner sets it, with `setExecutorPrompt`.
     */
    executorPrompt?: string;
    /** Real path of the chat's header cwd and its sidebar Workspace; fixed for life. */
    home: string;
    /** Real path new threads' folders go under; the user can change it. */
    folder: string;
    /** Why this coordinator cannot start threads now (its folder is refused), when it cannot. */
    folderProblem?: string;
    /** Archived by the user on the Coordinator page. */
    archived?: boolean;
    /** The chat Session is archived or gone while the record lives on. */
    chatArchived?: boolean;
    /**
     * Where the chat stands: `open`; `archived` (the user archived the Session, or the coordinator was archived with it);
     * `gone` (the Session no longer exists); `none` (the record never had a chat, e.g. a migrated version 1 file).
     */
    chat?: 'open' | 'archived' | 'gone' | 'none';
    /** Model availability for this coordinator; absent until the host has checked it once. */
    model?: ModelHealth;
    createdAt: number;
    updatedAt: number;
}
export interface CoordinatorState {
    /** Live coordinators first, newest first; archived ones last. */
    coordinators: CoordinatorInfo[];
    /** All live threads, each with its `coordinatorId`. */
    threads: ThreadInfo[];
    /**
     * Archived Executor Sessions, newest first, at most 30 per coordinator (and those without a coordinator under the key
     * `''`), each with its `coordinatorId`, for a collapsed "Archived" group. Their Sessions are archived in dsh.
     */
    archivedThreads?: ThreadInfo[];
    /** Coordinator "Open coordinator chat" opens; absent when none exists. */
    lastCoordinatorId?: string;
    /** Where New coordinator puts the next one, and why it cannot when it cannot. */
    base?: {
        path: string;
        problem?: string;
    };
    /** Increases on every change, for cheap polling. */
    revision: number;
    /** True until the stored state is validated against its Sessions (the lists are incomplete meanwhile, L8). */
    loading?: boolean;
    /** Changes whenever the host service is (re)created; compare it together with `revision`. */
    epoch?: string;
    /** Set while the host is disabled or degraded: the most serious of `problems`. */
    problem?: HostProblem;
    /** Every current host problem, most serious first. */
    problems?: HostProblem[];
    /** Folders outside every coordinator's folder the user chose "Always allow" for (real paths); global. */
    allowedFolders?: string[];
    /** The permission mode new threads start in, as the user chose it; absent before the service is ready. Global. */
    threadPermission?: ThreadPermissionState;
}
export interface ThreadPermissionState {
    /** What the user chose (or the configured default). */
    mode: ThreadPermission;
    /** Whether dsh's auto review is loaded; without it new threads run in `ask` whatever the choice. */
    autoAvailable: boolean;
    /** What a thread started now gets. */
    effective: ThreadPermission;
}
/** Request of `coordinator/ensureCoordinator`: without an id the last used coordinator, with none a new one. */
export interface EnsureCoordinatorRequest {
    coordinatorId?: string;
}
/** Result of `coordinator/ensureCoordinator` and `coordinator/createCoordinator`. */
export interface EnsureCoordinatorResult {
    coordinatorId: string;
    sessionId: string;
}
/** Request of `coordinator/createCoordinator`: `home` from the folder picker, else `<base>/coordinator-N`. */
export interface CreateCoordinatorRequest {
    home?: string;
}
/** Request of `coordinator/setCoordinatorFolder`; returns the updated `CoordinatorInfo`. */
export interface SetCoordinatorFolderRequest {
    coordinatorId: string;
    path: string;
}
/** Request of `coordinator/setExecutorPrompt`; returns the updated `CoordinatorInfo`. Empty `text` clears it. */
export interface SetExecutorPromptRequest {
    coordinatorId: string;
    text: string;
}
/** Request of `coordinator/renameCoordinator`; returns the updated `CoordinatorInfo`. */
export interface RenameCoordinatorRequest {
    coordinatorId: string;
    /** 1-40 chars after trimming, no control characters, unique among live coordinators (case-insensitive). */
    name: string;
}
/** Request of `coordinator/archiveCoordinator`. */
export interface ArchiveCoordinatorRequest {
    coordinatorId: string;
    /** Also stop and archive threads that still work (a second confirmation in the UI). */
    force?: boolean;
    /**
     * Also remove the coordinator's home Workspace from dsh's sidebar (never files on disk), when no other live
     * coordinator shares it and it holds no other unarchived Session.
     */
    removeWorkspace?: boolean;
}
/**
 * Request of `coordinator/deleteCoordinator`: forget an ARCHIVED coordinator. Its record and its archived rows leave the
 * plugin state; its Sessions, folders and files stay. Refused for a live coordinator.
 */
export interface DeleteCoordinatorRequest {
    coordinatorId: string;
}
/** Result of `coordinator/deleteCoordinator`: the coordinator id and the ids of the archived rows removed with it. */
export interface DeleteCoordinatorResult {
    deleted: string;
    threads: string[];
}
/** Result of `coordinator/archiveCoordinator`: the coordinator id and the ids of the threads archived with it. */
export interface ArchiveCoordinatorResult {
    archived: string;
    threads: string[];
    /**
     * What happened to the home Workspace: `removed` from the sidebar; `kept-shared` (another live coordinator lives
     * there); `kept-has-sessions` (it holds another unarchived Session); `kept-not-own` (the plugin did not create that
     * Workspace, so it is never removed); `failed` (removing it failed; the coordinator is archived anyway);
     * `not-asked` (`removeWorkspace` was not set, or there was no Workspace to remove).
     */
    workspace: 'removed' | 'kept-shared' | 'kept-has-sessions' | 'kept-not-own' | 'failed' | 'not-asked';
}

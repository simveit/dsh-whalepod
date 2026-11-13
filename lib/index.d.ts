import type { Context } from '@deepseek-ai/cordis';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import type { ArchiveCoordinatorRequest, ArchiveCoordinatorResult, CoordinatorInfo, CoordinatorState, CreateCoordinatorRequest, EnsureCoordinatorRequest, EnsureCoordinatorResult, DeleteCoordinatorRequest, DeleteCoordinatorResult, PingResult, RenameCoordinatorRequest, SetCoordinatorFolderRequest, SetExecutorPromptRequest, ThreadPermissionState } from './types.ts';
export type * from './types.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        coordinator: CoordinatorService;
    }
}
export default class CoordinatorService extends TypertRemoteService {
    /** The plugin's settings for dsh's Plugins page (config-schema.ts); every field but `threadsRoot` is volatile. */
    static Config: unknown;
    private readonly version;
    private readonly settings;
    private threads;
    /** Set when another process owns the coordinator state; this one stays disabled. */
    private problem;
    constructor(ctx: Context, config?: unknown);
    /** I8: which dsh services the thread service waits for, while it is not running. */
    private missingServices;
    private service;
    /** Report that the host side of the plugin is alive. */
    ping(signal: AbortSignal): Promise<PingResult>;
    /** Read the coordinators and the thread list; `revision` changes on every change. */
    getState(signal: AbortSignal): Promise<CoordinatorState>;
    /**
     * Open a coordinator: the named one (reopening its chat when it is archived or gone), else the last used one, else
     * a new one.
     */
    ensureCoordinator(request: EnsureCoordinatorRequest | undefined, signal: AbortSignal): Promise<EnsureCoordinatorResult>;
    /** New coordinator: its own folder below the base, or `home` from the folder picker. */
    createCoordinator(request: CreateCoordinatorRequest | undefined, signal: AbortSignal): Promise<EnsureCoordinatorResult>;
    /** Change where a coordinator's new threads go; existing threads and the chat stay where they are. */
    setCoordinatorFolder(request: SetCoordinatorFolderRequest, signal: AbortSignal): Promise<CoordinatorInfo>;
    /**
     * Set a coordinator's Executor prompt: the user's standing instructions every Executor Session it starts afterwards
     * gets. Empty text clears it. Only the owner may set it; no model tool can read or change it.
     */
    setExecutorPrompt(request: SetExecutorPromptRequest, signal: AbortSignal): Promise<CoordinatorInfo>;
    /** Rename a coordinator (its chat title and sidebar group follow; folders are never renamed). Owner only. */
    renameCoordinator(request: RenameCoordinatorRequest, signal: AbortSignal): Promise<CoordinatorInfo>;
    /** Archive a coordinator with its finished threads (`force` also stops working ones); optionally its sidebar Workspace. */
    archiveCoordinator(request: ArchiveCoordinatorRequest, signal: AbortSignal): Promise<ArchiveCoordinatorResult>;
    /**
     * Forget an archived coordinator: its record and its archived rows leave the plugin state (Sessions, folders and files
     * stay). Refused while it is live. Owner only.
     */
    deleteCoordinator(request: DeleteCoordinatorRequest, signal: AbortSignal): Promise<DeleteCoordinatorResult>;
    /** Remove a thread from the list and archive its dsh session (restorable from the sidebar). The folder is kept. */
    archiveThread(id: string, signal: AbortSignal): Promise<void>;
    /**
     * Set how new threads run: `auto` (auto review, no file sandbox) or `ask` (workspace-write, approvals to the user).
     * Any other value is refused. Applies to threads started afterwards and their team members.
     */
    setThreadPermission(mode: string, signal: AbortSignal): Promise<ThreadPermissionState>;
    /**
     * The user's answer to a thread's folder confirmation: `once` starts it there, `always` also adds the folder to
     * the allowed folders, `deny` drops the thread. Only the owner may answer; no model tool can.
     */
    confirmFolder(request: {
        id: string;
        decision: string;
    }, signal: AbortSignal): Promise<{
        id: string;
        started: boolean;
    }>;
    /** Remove a folder from the allowed folders. Returns the list. */
    removeAllowedFolder(path: string, signal: AbortSignal): Promise<string[]>;
    /** Resume a thread the spend guards paused. */
    resumeThread(id: string, signal: AbortSignal): Promise<{
        id: string;
    }>;
}

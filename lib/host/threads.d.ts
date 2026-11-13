import type { ArchiveCoordinatorResult, CoordinatorInfo, CoordinatorState, DeleteCoordinatorResult, HostProblem, ModelHealth, ReportKind, ThreadInfo, ThreadPermissionState } from '../types.ts';
import { type GuardFs } from './cwd-guard.ts';
import type { HostContext, SessionId } from './dsh.ts';
import { type CoordinatorConfig } from './ids.ts';
import { type ThreadOps } from './tools.ts';
import { type ToolView } from './views.ts';
/**
 * The stock preset threads and the coordinator run on. Threads get everything the user's Standard sessions get
 * (their customisations, skills, MCP servers, AGENTS.md); the coordinator is narrowed at runtime (coordinator-tools.ts).
 * No plugin preset is recorded on a Session, so the Sessions keep working when the plugin is removed.
 */
export declare const SESSION_PRESET = "standard";
/** Preset names of releases before this one; Sessions carrying them are moved to `standard` once (migrateLegacy). */
export declare const LEGACY_PRESETS: readonly ["thread", "coordinator"];
export interface Prompts {
    coordinator: string;
    thread: string;
}
/** Injected for tests: filesystem resolution for the folder guard, the home folder, the dsh home, and the clock. */
export interface ThreadServiceDeps {
    /** Picks an index below `n` for a new coordinator's name; random by default. */
    pickName?: (n: number) => number;
    /** The random part of a new thread id (4 hex digits); random by default. */
    threadIdRandom?: () => string;
    fs?: GuardFs;
    home?: string;
    /** The active dsh home; the default `~/.dsh` is protected as well. */
    dshHome?: string;
    /** System temp folders for the Ask me write rule. */
    tempDirs?: string[];
    now?: () => number;
    /** A problem found before the service started: shown in the panel. */
    startupProblem?: HostProblem;
}
/**
 * The Executor prompt in a Lead's role prompt: the user's standing instructions for this coordinator's Executor
 * Sessions, between tags whose suffix comes from the text itself (stable across steps, and not guessable by text that
 * does not contain it). Teammates get it only through the Lead.
 */
export declare function executorPromptSection(text: string): string;
export declare class ThreadService implements ThreadOps {
    private readonly records;
    private readonly bySession;
    /** Child Sessions of thread leads (subagents and team members, at any depth) to their thread. */
    private readonly memberOf;
    /** Coordinator records by id, and by their chat Session. */
    private readonly coordinators;
    private readonly coordinatorBySession;
    /** New Sessions in a coordinator Workspace, coordinators from their first step, persisted on their first user message. */
    private readonly candidates;
    /** Workspaces that are homes of coordinators, by real path. */
    private readonly coordinatorWorkspaces;
    private lastCoordinatorId;
    /** The one-time pass that gives every live Executor Session its own sidebar group has run (see groupExecutors). */
    private executorGroups;
    /**
     * Sessions the plugin is creating itself, by target (a Workspace id or a cwd, as real paths): agent/created does not
     * adopt a Session in that place while the creation runs (S12: per creation, not a global counter). Sessions it
     * skipped meanwhile are considered again once the creation is done.
     */
    private readonly creating;
    private readonly skippedWhileCreating;
    /**
     * Sessions that are neither stored coordinators nor tracked rows but are narrowed and guarded anyway (S2, S7, S12):
     * stored Session ids not validated yet, chats that carry a coordinator's marks without a record (a replaced chat, a
     * fork, a dropped record, any chat while the state file is unusable), Sessions in a coordinator home that are no
     * coordinator, and Sessions with an Executor Session's brief but no row.
     */
    private readonly fenced;
    /** Sessions whose log was checked for marks while the state file is unusable and that carry none. */
    private readonly unmarked;
    /**
     * When the state file was last found unusable (corrupt, or from a newer version), persisted in the fresh file so the
     * next start still says so (N1). Classification by log marks runs always; this only keeps the panel notice.
     */
    private degradedSince;
    /**
     * N3: live Sessions in stored coordinator Workspaces, fenced provisionally when the plugin loads (the previous instance
     * may have fenced them in memory) until scanCandidates decides what they are.
     */
    private readonly provisionalHome;
    /** This load upgraded a version 1 file (relocateV1 runs once, after validation). */
    private upgradedV1;
    /** Coordinator chat Sessions found missing (resolve failed); for `CoordinatorInfo.chat`. */
    private readonly chatMissing;
    /** Thread ids handed out but not inserted yet (L3). */
    private readonly reservedIds;
    /** Allowed folders the user confirmed in this process; loaded entries are hints until confirmed again (S6). */
    private readonly allowedConfirmed;
    private readonly pickName;
    private readonly threadIdRandom;
    /** The New coordinator that "Open coordinator chat" started while none existed. */
    private ensuringNew;
    /** Serialises New coordinator, so two calls never pick the same folder. */
    private creatingCoordinator;
    /** Coordinator chats being archived by the plugin itself (their archive event is not the sidebar's). */
    private readonly archivingChats;
    /** Set once validateRestore has rebuilt the coordinators and live rows; nothing is saved before. */
    private loaded;
    /** The permission mode the user picked on the Coordinator page; undefined: the configured default. */
    private permissionChoice;
    private revision;
    /** Changes on every load, so a client can tell a restarted host from an unchanged one with the same revision. */
    private readonly epoch;
    private readonly store;
    private readonly batcher;
    private readonly slots;
    private saveTimer;
    /** Message ids delivered by this process or seen in thread logs (once-per-request delivery). */
    private readonly delivered;
    private readonly timeZone;
    /** Ids of the message that opens the coordinator's first, model-free turn (see seedCoordinator). */
    private readonly openingIds;
    private healthAt;
    private healthCheck;
    private disposed;
    private loadProblem;
    private readonly wakes;
    /** Peer messages per unordered thread pair and per sender (A6). */
    private readonly peerPairs;
    private readonly peerSenders;
    /** Pairs the coordinator was already told about, until their window frees up. */
    /** Threads being archived by the plugin itself (their archive event is not the sidebar's). */
    private readonly archiving;
    /** Thread-owned turns per thread within a day (M5). */
    private readonly turns;
    /** Folders outside the threads root the user chose "Always allow" for (real paths). */
    private allowedFolders;
    /** Host problems by kind, shown in the panel. */
    private readonly problems;
    /** Tool restrictions the plugin applied, by Session: the coordinator's allow list, a thread agent's denials. */
    private readonly restrictions;
    private restricting;
    /** Set as soon as the dispose effect starts, so listeners fired by the cleanup itself do nothing. */
    private disposing;
    /** Member Sessions whose sandbox the plugin narrowed (they are not widened again). */
    private readonly narrowed;
    /** Threads that cannot be resumed while auto review is missing (their log says `auto`). */
    private readonly autoGone;
    private readonly guardEnv;
    /** Settles when the stored coordinator id and thread rows are validated against their Sessions. */
    private validated;
    private readonly ctx;
    private readonly config;
    private readonly prompts;
    private readonly fs;
    private readonly home;
    private readonly now;
    /** Settles when the restore pass (live status, logs, queued briefs) is done; for tests. */
    readonly ready: Promise<void>;
    constructor(ctx: HostContext, config: CoordinatorConfig, stateFile: string, prompts: Prompts, deps?: ThreadServiceDeps);
    /**
     * Read the state file. Only archived rows (history, never tracked) are registered here; the coordinators and the
     * live rows are trusted only after validateRestore checked them against their Sessions (H1).
     */
    private restore;
    /** Register one stored row. A brief re-queued across a restart is always delivered as a notice (H1). */
    private addRecord;
    /**
     * H1, T8 and S6: a state file another process (or a thread's shell) may have written is not trusted as is.
     *
     * 1. Live rows first, each against its own Session only: it exists, is no team member, works in the row's folder
     *    and carries the brief this plugin sent it (or, for a brief still queued, has never run a turn). A forged row
     *    can therefore no longer drop a real coordinator. The brief's mark names the coordinator the Assignment came
     *    from (`dsh-coordinator:brief:<thread>:<coordinator>`), and that, not the stored `coordinatorId`, decides the
     *    owner; the older mark without a coordinator is accepted only for the coordinator migrated from version 1.
     * 2. Coordinators: a record with a chat is kept only when the chat sits in its home, which is a recorded
     *    coordinator Workspace, and carries this record's own mark (the bound opening message or the role mark; the
     *    legacy title and unbound opening only for the migrated record); a chat that never ran a turn is kept and
     *    marked again. A record without a chat is kept only when a validated row with a Session names it through its
     *    brief, and its home passes the same checks as a new home (no folder of an Executor Session, no other
     *    coordinator's home, no Workspace with the user's own Sessions). Earlier chats (`pastSessionIds`) must carry
     *    this record's marks too. Names and Executor prompts are cleaned like every other stored field, and folders
     *    get the same checks as when they are set.
     * 3. Rows whose coordinator was dropped are kept without one ("Without coordinator"): only the owner can archive them.
     *
     * Everything else is dropped and reported in the panel. Stored Sessions stay fenced until this settles; a dropped
     * one stays fenced when its log carries the plugin's marks.
     */
    private validateRestore;
    /**
     * The coordinator a version 1 file became no longer works at the old threads root (`~/dsh-threads`): its folder for
     * new Executor Sessions becomes `<base>/coordinator-<slug of its name>`, like a New coordinator's, and without a chat
     * its home moves there too. A chat of that release keeps its home (a Session's folder cannot change). Nothing is
     * created on disk now: the folder appears when the first Executor Session starts there, the home with its Workspace
     * when Reopen makes the chat (dsh registers a Workspace only for an existing folder). With a refused base the old root
     * stays, and the panel shows the base problem.
     */
    private relocateV1;
    /** A kept coordinator record: real paths, validated earlier chats, cleaned name and Executor prompt. */
    private restoredCoordinator;
    /** Whether an earlier chat of a coordinator really was one (S6): it sits in the home and carries this record's mark. */
    private pastSessionValid;
    /**
     * Names for kept coordinators that have none (a file from before names) or share one with an earlier live
     * coordinator; a stored plugin title of a release before names is replaced by the named title once (afterRestore).
     */
    private assignNames;
    /** After validation: every kept coordinator chat and row lead that is live gets its restriction (before migrateLegacy, S2). */
    private narrowRestored;
    /**
     * Why a stored coordinator record is not trusted (a string), or the Session it keeps: its own, or null when its chat
     * is gone but a validated row still names it (Reopen then creates a new chat for them).
     */
    private coordinatorProblem;
    /**
     * Whether a Session's own log shows it started one of the given Executor Sessions: an `executor_start` (or
     * `thread_start`) call whose result names one of the row ids. Only a coordinator chat lists that tool, and a refused
     * call (a candidate's) returns no row id.
     */
    private delegatedFrom;
    /**
     * Why a kept record without a chat is still refused (S6): its home must pass the checks a new home gets, against the
     * coordinators kept so far: no Executor Session's folder, not inside or around another coordinator's home, and no
     * Workspace there with Sessions of the user's own.
     */
    private sessionlessProblem;
    /**
     * Whether a Session log carries a mark this plugin leaves on this coordinator's chat: the opening message bound to
     * its id, or its role mark. Only the coordinator migrated from version 1 (`legacy`) may also show the old marks: the
     * opening message without an id, the plugin's title, or the old `coordinator` preset (S6: titles are not marks for
     * any other record, so an Executor Session titled "Coordinator" proves nothing).
     */
    private coordinatorMarked;
    /**
     * Why a stored live row is not trusted (a string), or which mark binds it: `bound` with the coordinator its brief
     * names, `legacy` for a brief of a release before the binding, `none` for a row whose brief was not delivered yet.
     */
    private rowProblem;
    /**
     * After loading (the coordinators and rows are already narrowed by validateRestore): move Sessions of an earlier
     * release off the plugin's old presets, pick up blank Sessions in coordinator Workspaces, give migrated coordinators
     * their named titles, apply each thread's permission, re-derive each thread's turn from its log (a turn that ended
     * while the plugin was not loaded, open approvals and questions), report turns that ended unseen, pick up title
     * changes, and submit briefs that were still queued.
     */
    private afterRestore;
    private snapshot;
    private writeState;
    private saveNow;
    /** Record a change: bump the revision and save soon. */
    private bump;
    getState(): CoordinatorState;
    /** Everything the panel should warn about, most serious first. */
    hostProblems(): HostProblem[];
    /** Every coordinator for the page: live ones first, newest first; archived ones last. */
    private coordinatorInfos;
    private coordinatorInfo;
    /** Where a coordinator's chat stands, for the page (open, archived, gone, or never had one). */
    private chatState;
    /** Archived rows for the page: newest first, at most 30 per coordinator. */
    private archivedThreads;
    /** The base for new coordinators (design 3.2): configured, else next to dsh's default workspace. */
    private basePath;
    /** Why the base is refused, as a panel problem, or undefined. */
    private baseRefusal;
    /** Where New coordinator puts the next one, and why it cannot when it cannot (a refused base, or the cap). */
    private baseInfo;
    /**
     * Re-check, at most every few seconds and in the background, whether the model each live coordinator would run on
     * is usable. A change bumps the revision so the page shows or clears that coordinator's "no model" notice.
     */
    private refreshHealth;
    /**
     * Whether a coordinator's model (its own, else the default a new coordinator would follow) can run.
     * @param coordinatorId - the coordinator; without one, the one "Open coordinator chat" opens.
     */
    checkHealth(coordinatorId?: string): Promise<ModelHealth>;
    /** The permission mode new threads start in: the user's choice, else the config; `ask` while auto review is missing. */
    threadPermission(): ThreadPermissionState;
    /**
     * The user picked how new threads run (the Coordinator page's control). Only `auto` and `ask` are accepted; it
     * applies to threads started afterwards and their team members, never to running ones.
     */
    setThreadPermission(mode: unknown): ThreadPermissionState;
    /** Every live thread of every coordinator, newest first (the owner's view: the page, the pane, Remote callers). */
    allThreads(): ThreadInfo[];
    /**
     * The calling coordinator's live threads (`executor_list`). Without a caller, every live thread (the owner's view).
     */
    listThreads(caller?: SessionId): ThreadInfo[];
    /** What the user can do on the thread's row: confirm its folder, or resume it after a pause. */
    private actionOf;
    /** A stored coordinator's chat: the only Sessions whose coordinator tool calls run (S4). */
    isCoordinator(sessionId: string): boolean;
    /**
     * Sessions that see the coordinator tools: stored coordinators and candidates. dsh composes a turn's tool list
     * before it logs the user's first message (seen on rc.2), so a candidate must already list them for the "+" gesture
     * to work in its first turn; a call from a candidate that no typed message promoted is refused (callerCoordinator).
     */
    private listsCoordinatorTools;
    /** A chat that is narrowed and guarded like a coordinator: stored, a candidate, or fenced as one. */
    private coordinatorLike;
    /** Every Session that is or was a coordinator chat, for history roles and the peer refusal. */
    private coordinatorSessionIds;
    /**
     * Fence a Session (see `fenced`): narrowed like a coordinator without the plugin's tools, or guarded like an
     * Executor Session without a row. A coordinator fence is never weakened to an executor one.
     */
    private fence;
    private applyFence;
    /** Lift a fence the plugin no longer needs (a stored Session that turned out not to be one of its own). */
    private unfence;
    /** Lift the plugin's restriction of a Session that is nothing the plugin guards (no coordinator-like chat, no lead). */
    private liftIfUnclassified;
    /**
     * What a Session's log says it is (S7): a coordinator chat (an opening or role mark of this plugin, or the old
     * `coordinator` preset), an Executor Session (a brief of this plugin), or neither. Unreadable reads as neither.
     */
    private logKind;
    /** Coordinators that are not archived. */
    private liveCoordinators;
    /** The coordinator "Open coordinator chat" opens: the last used live one, else the newest live one. */
    private lastCoordinator;
    /** Whether a coordinator's chat can take notices now: it has a Session that is not archived, and it is not archived. */
    private chatLive;
    private addCoordinator;
    /**
     * The coordinator a tool call comes from. Only a stored coordinator: a candidate is promoted by the user's first
     * typed message, never by a tool call (S4), so a candidate whose turn no user opened cannot start anything.
     */
    private callerCoordinator;
    /** A live thread of the calling coordinator (scope.ts); another coordinator's thread reads as unknown. */
    private findFor;
    /**
     * Re-check a coordinator's folder (design 3.5, S6, S9) with the checks it got when it was set, except that it may
     * contain other coordinators' homes and Executor Sessions that came later (that would lock it out); a refused one
     * blocks its executor_start until the user changes it.
     */
    private checkFolder;
    /**
     * Homes of the other coordinators (and candidates), never the coordinator's own home, which others may share (D2):
     * - `executor` (executor folders at start and at confirmation, coordinator folders when set and re-checked): every
     *   other home, archived ones included, except an archived home that contains the coordinator's own home (the dev
     *   setup where the base lies inside an archived legacy root): its own Executor Sessions may sit there.
     * - `new-home` (placing a NEW coordinator home, by New coordinator or a picked folder, and Reopen): live homes only;
     *   an archived coordinator's home does not block a new home inside it.
     */
    private otherHomes;
    isThreadLead(sessionId: string): boolean;
    threadOfSession(sessionId: string): ThreadInfo | undefined;
    /** Threads holding a slot: the lead or a team member runs, and nobody in the tree waits on the user. */
    private activeThreadIds;
    private setTitle;
    /**
     * Apply a change to a thread's facts, re-derive its status, and emit the notice the transition calls for.
     * @param notify - false while the change is the coordinator's own doing.
     * @param force - re-derive even when the facts did not change (time-based: a member's settlement grace ended).
     */
    private update;
    /** Write the derived status onto the thread's info, and arm the re-check of an idle member's settlement grace. */
    private derive;
    /** Whether a notice no longer holds when its batch goes out: drop it rather than wake the coordinator for nothing. */
    private staleNotice;
    /** The lead's team for a notice or `thread_read`: name, task label and state. */
    private teamView;
    /** Queue a notice for the thread's owner; the owner is recorded now, since the row may be gone at delivery. */
    private notice;
    private statusNotice;
    private observe;
    /**
     * An event of a coordinator chat or a candidate. A candidate becomes a stored coordinator on its first message the
     * user typed (design 2.2); a coordinator's title follows its Session title. Returns true when the Session is one.
     */
    private coordinatorEvent;
    /**
     * Team bookkeeping from a lead's or member's own log: a `subagent/catalog` event names a new child, and a
     * `subagent-settled` message (in the inbox or the transcript) says a child finished. Returns true when the event
     * is fully handled here.
     */
    private teamEvent;
    /** An event of a Session that is not a thread lead: fold it when it belongs to a lead's tree. */
    private memberEvent;
    /** Interrupt members of a thread's tree (user authority); their settlements follow. */
    private interruptMembers;
    /** A lead's turn that ended because someone pressed Stop (`aborted` with a `user` cause). */
    private userStop;
    /** Session ids of the members of a thread's tree that still run. */
    private runningMembers;
    private registerPrompt;
    /** What the coordinator knows about the permission mode, so it can tell the user when asked. */
    private permissionLine;
    private registerTools;
    /**
     * The coordinator chat gets one model-free opening turn when it is created. dsh lists a Session as a blank "New
     * Session" (and hides it from the sidebar unless it is selected) until its first turn starts, and only a
     * `turn/start` changes that; a pre-step decision that enters with no messages opens and closes that turn without
     * a model call, so the chat is listed under its title from the start. The listener acts only on step 1 of the
     * coordinator session when every message of the step is the opening message the plugin queued itself (a random id
     * kept here for a few seconds); anything else, including a user message admitted in the same step, passes through.
     */
    private registerOpeningTurn;
    /**
     * The first step of a lead's turn passes this gate, which decides whether the turn runs:
     * - After `thread_stop`, the members it cancelled settle and the runtime hands each result to the lead, which would
     *   start a new turn and undo the stop. While the stop holds (until the user, the coordinator or a peer sends the
     *   thread something), a step whose messages are all such settlement notices is held.
     * - A paused thread (spend guards, M5) runs only turns the user opens by typing in it; that also ends the pause.
     * - Every other turn is thread-owned and counts against the daily turn budget; past it the thread pauses.
     * - A schedule's reminder respects the running-thread cap: with no free slot it is held and woken through the queue.
     * A held step is entered with no messages, so the turn closes without a model call, and its messages are injected
     * again: the lead reads them on its next real turn.
     */
    private registerStepGate;
    /** Whether a message is one the user typed (or retried) in the chat: the owner, not the plugin, not a shared viewer. */
    private userTyped;
    /** Enter a step with no messages (the turn closes without a model call) and inject its messages again. */
    private hold;
    /** Wake a thread whose input was held (an agent message from the coordinator's side; the held input rides along). */
    private wakeHeld;
    /**
     * Pause a thread (M5): it shows as needing the user, its thread-owned turns are held, and input reaches it without
     * waking it, until the user presses Resume or types in the thread. The coordinator is told once.
     */
    private pause;
    /** End a pause. `panel`: the Resume button (wakes the thread when input was held); `user`: the user typed in it. */
    private resume;
    /** The Resume button of a paused thread (a Remote method; only the owner may call it). */
    resumeThread(threadId: unknown): ThreadInfo;
    /**
     * Deny tool calls of the coordinator and of every agent in a thread's tree that target the dsh home (home-guard.ts).
     * Two hooks with the same check: a `tools/pre-execute` listener, appended after auto review's prepended one, so
     * auto review still sees every call and a denial here wins over its "ask" without showing the user a card; and a
     * monotonic `tools.guard`, which runs after every pre-execute listener and approval and cannot be undone by
     * another plugin's listener that allows a call without asking the rest of the chain. Other Sessions are untouched.
     */
    private registerHomeGuard;
    /**
     * Who an agent is for the guard: a coordinator-like chat (with or without the plugin's tools), a lead or member of a
     * live thread at any depth, or a fenced executor-like Session (or a member of one).
     */
    private guardScope;
    /** The top-level Session of an agent's tree (itself, or the creator chain of a subagent). */
    private rootSession;
    /**
     * S7, N1: a top-level Session the plugin does not know is classified by its log before its first call runs (an agent
     * that was already live when the plugin loaded fires no agent/created). The answer is cached per Session.
     */
    private classifyUnknown;
    private guardVerdict;
    /** Count a denial; the coordinator hears once when an Executor Session keeps trying. */
    private countDenial;
    private leadTarget;
    /** Put a live lead on its target preset. */
    private applyLead;
    /** Narrow a live member's sandbox when its thread runs stricter than auto; its `never` approval policy stays. */
    private applyMember;
    /** Apply every thread's target to its live lead and members (catalog change, dispose). */
    private applyPermissions;
    /**
     * On restore: a live lead gets its target now; a cold one when dsh resumes it (agent/created). A cold lead whose
     * log says `auto` cannot be resumed at all while auto review is missing (dsh refuses), so it is marked.
     */
    private restorePermission;
    /** The panel's `auto-unavailable` problem: which threads run stricter than chosen, and which cannot run at all. */
    private refreshAutoProblem;
    /**
     * Agents as dsh creates or resumes them: a coordinator chat is narrowed, a resumed lead gets its target preset, a new
     * member of a thread's tree is narrowed when its thread runs stricter than auto, a fenced Session gets its fence, and
     * any other top-level Session may become a candidate (or be fenced) by where it sits. The permission catalog
     * changing (auto review loaded or removed) re-applies every target.
     *
     * S2: dsh awaits this listener before the Agent's first step, so until the stored state is validated the decision
     * waits for it; a stored Session is already fenced meanwhile (restore()).
     */
    private registerAgentCreated;
    /** The decision of agent/created on validated state (see registerAgentCreated). */
    private agentCreated;
    /**
     * The coordinator home a Session's header cwd belongs to: a recorded coordinator Workspace, or (D6) the legacy
     * `<threadsRoot>/_coordinator` group of the coordinator migrated from version 1, whose home is the threads root.
     */
    private coordinatorHomeOf;
    /** The live Agents of every coordinator-like chat: stored coordinators, candidates and fenced ones. */
    private coordinatorAgents;
    /**
     * dsh awaits `agent/created` before it releases queued work, so a candidate is narrowed from its first step: role
     * prompt, narrowing, the dsh-home guard, and the coordinator tools listed, whose calls run only once the user's first
     * typed message promoted it (S4). A candidate is a Session whose header cwd is a coordinator Workspace, that is no
     * subagent, no thread lead or member, not being created by the plugin in that place, not archived, and in which the
     * model has not acted yet. One the user already typed into (the window while the plugin loaded) is promoted at once.
     * Any other Session there (one with a history, a fork or an unarchived earlier chat of a coordinator, one past the
     * cap) is fenced: narrowed to reading, no plugin tools (S12).
     */
    private considerCandidate;
    /** Fence a Session in a coordinator Workspace that does not become a coordinator (S12). */
    private fenceSession;
    /** After a restart: live Sessions in coordinator Workspaces (agent/created fired before the plugin loaded), all of them (S12). */
    private scanCandidates;
    /** Queue the role mark again when the coordinator's chat log carries none of this coordinator's marks (D9). */
    private ensureMarked;
    /** The role mark of an adopted coordinator, which validation looks for after a restart (design 2.9). */
    private markRole;
    /**
     * A candidate becomes a stored coordinator on the user's first typed message: its home is its Workspace, its folder
     * starts as its home, it gets a name and the coordinator tools. Past the cap it is fenced instead.
     */
    private promote;
    /** Narrow a coordinator-like chat to its allow list (coordinator-tools.ts); the plugin's tools only for a stored one. */
    private restrictCoordinator;
    /**
     * Thread agents run on the user's Standard tools, except the plugin manager and market tools, which would let a
     * thread install code into the user's dsh (the release before this one left them out of its thread preset too).
     */
    private restrictThreadAgent;
    /**
     * Apply one restriction to an Agent with `agent.ctx.tools.restrict`, recomputed against what the registry offers
     * the Agent without the plugin's own restriction (lifted and re-applied synchronously, so no step sees the gap).
     * `restrict` refuses names that are not registered and lists the known ones; the filter is narrowed to those. When
     * the new filter fails, the previous one is put back.
     */
    private narrow;
    /** Lift every restriction (plugin dispose). Lifting emits `tools/change`; the guard keeps that from re-narrowing. */
    private liftRestrictions;
    /**
     * Sessions created by releases that recorded the plugin's own presets (`thread`, `coordinator`) could not be
     * opened once the plugin was removed. On load, each tracked Session still on one of those presets is moved to
     * `standard`: the old name is registered for a moment as an empty alias so dsh can resume the Session, the Agent is
     * recomposed on `standard`, and the selection is logged (`agent-preset/selected`), which is what dsh reads on the
     * next resume. Members of old threads keep the old name (dsh refuses to resume them on their own anyway).
     */
    private migrateLegacy;
    /** The model-free opening turn; its message id carries the coordinator id, the mark validation looks for. */
    private seedCoordinator;
    /** Whether a Session has started a turn (dsh lists Sessions without one as blank). */
    private hasTurn;
    private agent;
    private isArchived;
    /** True or false when the provider registry answers; undefined when asking it failed (unknown). */
    private modelAvailable;
    private defaultModel;
    /**
     * Pick the model of a Session the plugin has just created (see model.ts). A thread takes the coordinator's model;
     * a new coordinator keeps the default it follows when that works. Never called on an existing coordinator, so a
     * model the user picked there is never replaced.
     * @returns the model in use, or undefined when none is available (the user must pick one in the chat).
     */
    private ensureModel;
    /**
     * Open a coordinator's chat: the named one, else the last used one, else a new one (New coordinator). An archived
     * coordinator is reopened; a chat that is archived or gone gets a new Session for the same coordinator.
     */
    ensureCoordinator(request?: {
        coordinatorId?: unknown;
    }): Promise<{
        coordinatorId: string;
        sessionId: string;
    }>;
    /**
     * Open a coordinator's existing chat, or create a new one in its home when it is archived or gone. An archived
     * coordinator is un-archived only once its chat is open (N5); a refused Reopen says why in one short line (D5).
     */
    private reopenChat;
    /**
     * New coordinator (design 2.2, path 1): a free name, its own folder `coordinator-<name>` below the base or the folder
     * the user picked, registered as a Workspace titled like the chat ("Coordinator <name>"), and a chat Session there on
     * `standard`, on `workspace-write`, narrowed, with the model-free opening turn.
     */
    createCoordinator(request?: {
        home?: unknown;
    }): Promise<{
        coordinatorId: string;
        sessionId: string;
    }>;
    private createOnce;
    /** The first `<base>/coordinator-<name>`, `-2`, ... that is no registered Workspace, no non-empty folder, and allowed. */
    private pickHome;
    /**
     * Whether a folder is a Workspace with the user's own Sessions (unarchived, not a coordinator chat of this plugin):
     * every New Session in a coordinator Workspace becomes a coordinator, so such a project must not become one.
     */
    private userSessionsIn;
    /**
     * The Workspace registered at a folder, or undefined. dsh's `resolveByPath` rejects a folder that does not exist (it
     * resolves the real path first); such a folder can still be registered, so the list is searched by path instead.
     */
    private workspaceAt;
    /** The coordinator Workspace at a home, registered (and recorded) when missing. */
    private homeWorkspace;
    /**
     * A new coordinator chat Session in a Workspace: titled, on its model, on `workspace-write`, narrowed. Without a
     * model there is no opening turn, so the role mark is queued instead: the chat's first turn logs a mark bound to the
     * coordinator either way.
     */
    private newChat;
    /** An existing coordinator chat: no model change; the opening turn if it never had one; the legacy group renamed. */
    private reopenExisting;
    /**
     * A coordinator created by a release before the shared group lives in its own `<threadsRoot>/_coordinator`
     * Workspace. A Session's folder cannot change, so the Session stays there; its sidebar group is titled like the
     * coordinator so the user sees one group of that name.
     */
    private renameLegacyGroup;
    /** Rename a Session (its title is the user-owned title dsh pins); a failure is only logged. */
    private renameSession;
    /**
     * Show a coordinator's name: its chat is renamed to "Coordinator <name>" when the chat still carries a plugin title
     * (the old name's title, or a title of a release before names), and so is its home Workspace's group when the group
     * carries such a title too. A title the user gave the chat or the group stays.
     * @param previous - the name before a rename, if any.
     */
    private applyName;
    /**
     * The user's Executor prompt for a coordinator (a Remote method; only the owner may call it; no model tool can read
     * or change it). Empty text clears it. It applies to Executor Sessions started afterwards.
     */
    setExecutorPrompt(request: {
        coordinatorId?: unknown;
        text?: unknown;
    }): CoordinatorInfo;
    /**
     * Rename a coordinator (a Remote method; only the owner may call it): 1 to 40 characters, no control characters,
     * unique among the live coordinators. Its chat and group follow when they carry the plugin's title; folders are
     * never renamed.
     */
    renameCoordinator(request: {
        coordinatorId?: unknown;
        name?: unknown;
    }): Promise<CoordinatorInfo>;
    /**
     * Change where a coordinator's new threads go (a Remote method; only the owner may call it). The folder is created
     * when missing; existing threads keep their folders, and the chat stays in its home.
     */
    setCoordinatorFolder(request: {
        coordinatorId?: unknown;
        path?: unknown;
    }): CoordinatorInfo;
    /**
     * Archive a coordinator (a Remote method; only the owner may call it). Refused while any of its threads works,
     * waits or has a pending brief, unless `force`, which stops and archives those too. Archives its finished threads
     * and its chat Session, and keeps the record. With `removeWorkspace`, its home Workspace leaves the sidebar too when
     * the plugin created it (S8), no other live coordinator lives there and it holds no other unarchived Session; files
     * on disk are never touched.
     */
    archiveCoordinator(request: {
        coordinatorId?: unknown;
        force?: unknown;
        removeWorkspace?: unknown;
    }): Promise<ArchiveCoordinatorResult>;
    /**
     * Forget an archived coordinator (a Remote method; only the owner may call it): its record and its archived rows leave
     * the state; Sessions, folders and files stay. Refused while it is live.
     */
    deleteCoordinator(request: {
        coordinatorId?: unknown;
    }): DeleteCoordinatorResult;
    /**
     * Remove an archived coordinator's home Workspace from the sidebar when the plugin created it and nothing else lives
     * there (never files).
     */
    private removeHomeWorkspace;
    /** Whether a thread still works or waits: running, starting, waiting on the user, or with a pending brief. */
    private working;
    /** A coordinator's chat log, read once per tool call that depends on what the user typed in that chat. */
    private coordinatorLog;
    /** Real paths of live threads' folders (another thread's folder needs the user's confirmation, L7). */
    private takenFolders;
    /** Real paths of folders the plugin created for live threads (below a coordinator's folder they need no confirmation). */
    private pluginFolders;
    /**
     * Whether an executor title equals or imitates a coordinator chat's title: a legacy plugin title, or the title or
     * "Coordinator <name>" of any coordinator, compared by `nameKey` (case, width and invisible characters folded).
     */
    private imitatesCoordinator;
    /**
     * A path as the user reads it in the plugin's own texts (the folder card, Remote errors, panel problems): control and
     * invisible characters masked, the home folder shortened to `~`. Display only; data and guards keep the real path.
     */
    private shown;
    /** The owner opened or created a coordinator after an unusable state file: the panel notice ends (N1). */
    private clearDegraded;
    /** Real paths of every coordinator's folder (where its new Executor Sessions go). */
    private coordinatorFolders;
    /** Real paths of every coordinator home (and the legacy `_coordinator`): never a thread folder. */
    private coordinatorHomes;
    startThread(caller: SessionId, input: {
        title: string;
        brief: string;
        cwd?: string;
    }, _signal: AbortSignal): Promise<ToolView>;
    private startReserved;
    /**
     * A folder that needs the user's confirmation: the thread is recorded without a Session, shows as "Needs you:
     * confirm folder <real path>", and starts only after the user allows it on its row or in the card the plugin raises
     * in the coordinator chat. Nothing the coordinator model does can answer either.
     */
    private pendConfirmation;
    /** The thread row as the tools return it, with the action the user can take. */
    private threadView;
    /**
     * Raise the folder confirmation as a native dsh question card in the coordinator chat (no model tool call): the
     * user-questions service forwards it to the browser that shows the chat. It needs a connected browser and does not
     * survive a restart, so the row buttons in the panel and the pane stay the reliable path; whichever answers first
     * wins and the card is withdrawn.
     */
    private askConfirmation;
    /** Why a folder needs the user's confirmation, for the card, per case. */
    private confirmReason;
    /**
     * Let dsh's own title generation name an Executor Session (the owner's wish). dsh's title service pins a title set by
     * rename (the plugin's working title) and offers `refresh()` as the deliberate unpin, which regenerates the title from
     * the Session's human prompts with the registered provider (the session-titles bundle). Called once the Assignment
     * is logged as the user's prompt (an Assignment with notice authority is no human prompt, so there is nothing to
     * generate from). Without a provider dsh would fall back to the prompt's first words, so the working title is put
     * back. With one, the generated title replaces it, and later human prompts in the Session may refine it.
     */
    private followGeneratedTitle;
    /** Whether the coordinator's last turn called ask_user_question (A: then the plugin raises no card of its own). */
    private turnAskedUser;
    /**
     * The user's answer to a folder confirmation (a Remote method; only the owner may call it). `once` starts the
     * thread there; `always` also adds the folder to the allowed-folders list; `deny` drops the thread.
     */
    confirmFolder(threadId: unknown, decision: unknown): Promise<ThreadInfo | {
        denied: string;
    }>;
    /** Remove a folder from the allowed-folders list (a Remote method). */
    removeAllowedFolder(path: unknown): string[];
    /**
     * Create the thread's Session in its (already checked) folder and deliver or queue its brief. The Session is created
     * the dsh default way, with its folder as cwd and no Workspace (design 4.2, option 1): dsh rc.2 attaches a Session to a
     * Workspace only when it is created with that Workspace's id (and then its cwd is the Workspace path), so the sidebar
     * lists it under Ungrouped, also when its folder happens to be a registered Workspace. Its header cwd is its folder
     * and its write boundary.
     */
    private launch;
    /**
     * The sidebar group of an Executor Session at `cwd`: the user's own Workspace there (attached, never renamed, moved
     * or removed), else a new plugin-made Workspace titled "<coordinator name> · <folder name>". dsh accepts a Session
     * in a Workspace only when its cwd is exactly the Workspace path, so the executor's folder and write root stay its
     * own. Never at a coordinator home or a refused folder (the folder guard refused those already; this is a recheck).
     */
    private executorWorkspace;
    /** Place a plugin-made executor group right after its coordinator's group and the groups of its earlier executors. */
    private placeExecutorGroup;
    /**
     * Once (the state records it): every live Executor Session under Ungrouped gets its group, the same way a new one
     * does; dsh's `attachSession` accepts it because the group's path is exactly its folder. Rows already in a Workspace
     * (the user's, or their own) are left where they are. Only validated rows, only at their own folder.
     */
    private groupExecutors;
    /** A coordinator's name changed: the plugin-made groups of its live Executor Sessions follow (only those at their own folder). */
    private retitleExecutorGroups;
    /**
     * A plugin-created Session on the stock `standard` preset, or dsh's default preset when there is no `standard`: in a
     * Workspace (a coordinator chat) or with a cwd only (a thread). agent/created does not adopt it meanwhile.
     */
    private createSession;
    /** Where a plugin-made Session is created: the Workspace's path or the cwd, as a real path. */
    private creationKey;
    /** Whether the plugin is creating a Session in the place this Agent's Session sits. */
    private creatingIn;
    /** Remove a folder the plugin just created when it is still empty (never recursive). */
    private removeIfEmpty;
    private briefText;
    private deliverBrief;
    /**
     * Deliver text to a thread lead once per request key: steer a running lead, otherwise queue a turn.
     * @param as - `user` records a prompt (only for a brief with user authority); `notice` an agent message.
     * @param sender - session the agent message is attributed to (the coordinator, or a peer thread).
     */
    private deliver;
    messageThread(caller: SessionId, ref: string, text: string, requestKey: string, _signal: AbortSignal): Promise<{
        thread: string;
        delivery: string;
    }>;
    readThread(caller: SessionId, ref: string, mode: 'summary' | 'recent' | 'full', cursor: number | undefined, signal: AbortSignal): Promise<unknown>;
    /** Roles for messages the plugin delivered into a thread (history.ts). */
    private historyContext;
    /** S3: the row comes back with its executor-written fields in a data block, like executor_list. */
    flagUser(caller: SessionId, ref: string, reason: string): ToolView;
    /**
     * Stop a thread: its lead's turn and every subagent or team member of its tree that still runs. The members'
     * results are held back from the lead until someone sends the thread something (see registerStepGate).
     */
    stopThread(caller: SessionId, ref: string): ToolView;
    /**
     * Remove a thread from the list and archive its dsh Session (the sidebar's archive view can restore it). The
     * folder is kept. Only a thread that is not working and not waiting on the user is archived, unless `force` is
     * set; `force` also stops a running turn and is reserved for an explicit user request.
     */
    archiveThread(caller: SessionId, ref: string, options?: {
        force?: boolean;
    }): Promise<{
        archived: string;
    }>;
    /**
     * The owner's Archive on a thread's row (a Remote method): any live thread by its global id, a thread without a
     * coordinator included.
     */
    archiveThreadAsOwner(threadId: unknown, options?: {
        force?: boolean;
    }): Promise<{
        archived: string;
    }>;
    /** @param via - `tool`: the coordinator's executor_archive (its error tells the model what to do); `owner`: the page. */
    private archiveRecord;
    /** Drop a thread that still waits for its folder confirmation (it has no Session). */
    private withdraw;
    /** Stop tracking an archived thread, and remove its Workspace when the plugin made it and nothing else is in it. */
    private untrack;
    report(sessionId: string, kind: ReportKind, text: string): {
        delivered: 'wake' | 'quiet';
        note: string;
    };
    peers(sessionId: string): unknown;
    /**
     * One thread lead messages another. The message is an agent message attributed to the sender's session (auto
     * review reads it as facts, never as the user's instruction), its text is fenced, the coordinator gets a quiet
     * notice, and host limits stop loops: per unordered pair and per sender within `peerWindowMs`. Past a limit the
     * message is refused and the guard latches like the wake guard: past the sender limit the sender is paused, past
     * the pair limit both executors of the pair are, until the user resumes them (a peer turn never wakes the
     * coordinator, so the wake guard alone would not stop a ping-pong).
     */
    sendPeer(sessionId: string, ref: string, text: string, expectsReply: boolean, requestKey: string): Promise<{
        to: string;
        delivery: string;
    }>;
    /**
     * Apply the wake guard (M5): past the limit a thread's notices arrive quietly, and the guard latches: the thread is
     * paused until the user resumes it, and the coordinator is told once (pause()).
     */
    private guardWakes;
    private deliverNotices;
    /** Deliver one coordinator's notices to its chat, or hold them while the chat is archived or gone. */
    private deliverTo;
    /** Hand a coordinator's held notices to its chat, as quiet background, once the chat is open again. */
    private handHeld;
}

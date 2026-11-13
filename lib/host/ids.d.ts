/** A short stable id such as `t-3f9a`, unique among `taken`. */
export declare function newThreadId(taken: ReadonlySet<string>, random?: () => string): string;
/** A short stable coordinator id such as `c-1a2b`, unique among `taken`. */
export declare function newCoordinatorId(taken: ReadonlySet<string>, random?: () => string): string;
/** Whether a stored coordinator id has the shape this plugin mints. */
export declare function isCoordinatorId(value: unknown): value is string;
/** Most live (not archived) coordinators; past it New coordinator and adoption refuse. */
export declare const COORDINATORS_MAX = 20;
/** Most archived coordinator records kept in the state file. */
export declare const ARCHIVED_COORDINATORS_KEEP = 20;
/** Language-neutral folder name of a new coordinator's home below the base, like dsh's `default-workspace`. */
export declare const COORDINATOR_FOLDER = "coordinator";
/** Title of a coordinator chat and of its Workspace. */
export declare const COORDINATOR_TITLE = "Coordinator";
/** The last two segments of dsh's default workspace path; its parent is the base for new coordinators. */
export declare const DEFAULT_WORKSPACE_TAIL: readonly ["deepseek-harness", "default-workspace"];
/**
 * Built-in coordinator names: philosophers, scientists, mathematicians, novelists and poets, about a third each
 * English-speaking, German-speaking and Chinese, and a few from elsewhere; women and men. Chinese names are written in
 * Chinese characters in every locale. Each entry has a lowercase ASCII slug (pinyin with hyphens for Chinese names)
 * for the folder of a new coordinator (`coordinator-li-bai`). A new coordinator gets a random unused one (`freeName`).
 */
export declare const COORDINATOR_NAMES: readonly {
    readonly name: string;
    readonly slug: string;
}[];
/** Longest Executor prompt, in characters. */
export declare const EXECUTOR_PROMPT_MAX = 4000;
/**
 * The Executor prompt as stored and shown: carriage returns become newlines, NUL and every other control character
 * except newline and tab are removed, trailing whitespace is trimmed.
 */
export declare function cleanExecutorPrompt(raw: string): string;
/** Longest coordinator name, in characters. */
export declare const COORDINATOR_NAME_MAX = 40;
/**
 * A coordinator name the user typed, checked: invisible characters removed, trimmed, 1 to 40 characters counted in
 * code points (CJK names included), no control characters or line breaks, not only digits (that would read as a
 * legacy title such as "Coordinator 2").
 * @returns the name, or an error message.
 */
export declare function checkCoordinatorName(raw: unknown): {
    name: string;
} | {
    error: string;
};
/**
 * The key two names are compared by for uniqueness: NFKC (full-width forms fold), invisible characters and soft
 * hyphens removed, white space collapsed, case folded. `Noether`, `ｎｏｅｔｈｅｒ` and `Noe\u00ADther` are the same name.
 */
export declare function nameKey(name: string): string;
/**
 * A random name no live coordinator uses (case-insensitive), from the built-in list; when all are used, a listed name
 * with a number (`Noether 2`).
 * @param used - names of the live coordinators.
 * @param random - picks an index below `n`; injected for tests.
 */
export declare function freeName(used: Iterable<string>, random?: (n: number) => number): string;
/**
 * The folder slug of a name: the list entry's slug (with the number of a numbered name, `li-bai-2`), else the name's
 * own ASCII letters and digits, else empty (a name with no ASCII letters that is not on the list).
 */
export declare function nameSlug(name: string): string;
/**
 * The folder of a new coordinator's home: `coordinator-<slug>` (`coordinator-li-bai`), `-2`, `-3`, ... when that folder
 * is taken (n from 1); plain `coordinator`, `coordinator-2`, ... for a name without a slug.
 */
export declare function coordinatorFolderName(name: string, n?: number): string;
/**
 * Title of a coordinator chat and its sidebar group: the name alone (`Noether`, `鲁迅`), as the owner decided. Cut at
 * dsh's title limit (80 UTF-8 bytes) on a character boundary, so a long CJK name still makes a valid title.
 */
export declare function coordinatorTitle(name: string): string;
/**
 * Title of the sidebar group the plugin makes for one Executor Session: the owning coordinator's name, a middle dot,
 * and the base name of the executor's folder (`Euler · forecast-parser`). Both parts are display text from outside
 * (a name the owner typed, a folder a model may have named): control, invisible and line-break characters are removed
 * and white space collapsed. Cut at dsh's title limit (80 UTF-8 bytes) on a character boundary.
 */
export declare function executorGroupTitle(coordinatorName: string, folder: string): string;
/** The title an earlier build of this release gave a named coordinator (`Coordinator Noether`); renamed to the name once. */
export declare function prefixedCoordinatorTitle(name: string): string;
/**
 * Whether a title is one releases before names gave a coordinator chat (`Coordinator`, `Coordinator 2`, ...). Only the
 * coordinator migrated from version 1 may use it as a mark (S6); any other record needs its bound marks.
 */
export declare function isLegacyCoordinatorTitle(title: unknown): boolean;
/**
 * Where new coordinators live: the configured `coordinatorBase`, else the parent of dsh's registered default
 * workspace (`.../deepseek-harness/default-workspace`), else `~/Documents/deepseek-harness`, which matches dsh on a
 * standard Mac. No osascript call from the plugin.
 * @param workspacePaths - paths of the registered Workspaces.
 */
export declare function discoverBase(workspacePaths: readonly string[], home: string, configured?: string): string;
/** Folder name from a title: lowercase ASCII letters, digits and dashes, at most 40 characters. */
export declare function slugify(title: string, fallback?: string): string;
/** `<root>/<slug>`, or `<root>/<slug>-<id>` when the slug is already used by another thread or exists. */
export declare function threadDir(root: string, title: string, threadId: string, used: (path: string) => boolean): string;
/**
 * The absolute folder a brief names on its "Working directory:" line, when the coordinator wrote one there but did
 * not pass it as `cwd` (a real model did exactly that). Only an absolute or `~/` path counts.
 */
export declare function briefWorkingDirectory(brief: string): string | undefined;
export declare function expandHome(path: string): string;
/** Most UTF-8 bytes in a session title, as dsh's session-title service accepts (`maxTitleBytes`). */
export declare const TITLE_MAX_BYTES = 80;
/**
 * A thread title in the style dsh gives ordinary sessions: one short line without control characters, wrapping
 * quotes or emphasis, a "Thread:" prefix, or a thread id, cut to dsh's title byte limit at a word boundary.
 * @returns the title, or an empty string when nothing is left.
 */
export declare function normalizeTitle(raw: string): string;
export interface CoordinatorConfig {
    /**
     * Legacy: the threads root of releases before multiple coordinators. Its only job now is migration: it names the
     * home and the folder of the coordinator that a version 1 state file had.
     */
    threadsRoot: string;
    /**
     * Where new coordinators get their own folder (`<base>/coordinator`, `coordinator-2`, ...). Undefined: next to
     * dsh's default workspace (see discoverBase).
     */
    coordinatorBase?: string;
    /** Maximum number of threads running at once; more starts queue. */
    maxRunningThreads: number;
    /** Quiet time before a batch of notices is delivered to the coordinator. */
    noticeDebounceMs: number;
    /** Longest a notice waits for its batch. */
    noticeMaxDelayMs: number;
    /**
     * How a thread's first brief is recorded. `user`: as a user prompt (visible as a chat bubble, and auto review
     * treats it as the task), but only when the user opened the coordinator turn that started the thread; otherwise
     * it falls back to `notice`. `notice`: as an agent message, which auto review reads as background facts.
     * Later coordinator messages and peer messages are always recorded as agent messages.
     */
    briefAs: 'user' | 'notice';
    /** Most notices one thread may wake the coordinator with per `wakeWindowMs`; past it the thread pauses until the user resumes it. */
    wakeMaxPerThread: number;
    wakeWindowMs: number;
    /** Most `thread_send` messages from one thread to another per `peerWindowMs`. */
    peerMaxPerPair: number;
    /** Most `thread_send` messages one thread may send in total per `peerWindowMs`. */
    peerMaxPerThread: number;
    peerWindowMs: number;
    /**
     * The permission mode new threads (and their team members) start in until the user picks one on the Coordinator
     * page. `auto`: dsh's auto review decides each action and escalates risky ones to the user; no file sandbox.
     * `ask`: the `workspace-write` preset, sandboxed to the thread's folder, asking the user for anything beyond it.
     */
    threadPermission: 'auto' | 'ask';
    /**
     * Turns per thread per 24 hours that the thread itself, the coordinator, a peer or a schedule starts (the user's
     * own turns do not count). Past it the thread pauses until the user resumes it. 0 (the default) means no daily turn
     * budget; the wake and peer limits remain the loop brakes.
     */
    threadTurnBudget: number;
    /**
     * Extra global tools (other plugins, MCP servers) the coordinator may use besides its own allow list. Tools that
     * execute, write or spawn work are never added.
     */
    coordinatorExtraTools: string[];
}
export declare const DEFAULT_CONFIG: CoordinatorConfig;
/** Read the plugin config with defaults; invalid values fall back to the default. Unknown keys are ignored. */
export declare function parseConfig(raw: unknown, env?: Record<string, string | undefined>): CoordinatorConfig;

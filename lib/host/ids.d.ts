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
export declare const COORDINATOR_FOLDER = "orchestrator";
/** Title of a coordinator chat and of its Workspace. */
export declare const COORDINATOR_TITLE = "Coordinator";
/** The last two segments of dsh's default workspace path; its parent is the base for new coordinators. */
export declare const DEFAULT_WORKSPACE_TAIL: readonly ["deepseek-harness", "default-workspace"];
/**
 * Built-in coordinator names: philosophers, scientists, mathematicians, novelists and poets, about a third each
 * English-speaking, German-speaking and Chinese, and a few from elsewhere; women and men. Chinese names are written in
 * Chinese characters in every locale. Each entry has a lowercase ASCII slug (pinyin with hyphens for Chinese names)
 * for the folder of a new coordinator (`orchestrator-li-bai`). A new coordinator gets a random unused one (`freeName`).
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
/** Longest coordinator memory, in characters. A safety bound on what a snapshot or a read costs; the prompts ask for a short page. */
export declare const MEMORY_MAX = 6000;
/**
 * Longest raw text the memory cleaner is given, in characters. Cleaning can shorten a text (control and invisible
 * characters, trailing white space), so the raw text may be longer than `MEMORY_MAX`; past this bound a write is
 * refused before any cleaning, so the cost of a refused call does not grow with what a caller sends (`updateMemory`, `setCoordinatorMemory`, `storedMemory`).
 */
export declare const MEMORY_RAW_MAX: number;
/**
 * A coordinator's memory as stored and shown: cleaned like the Executor prompt (line breaks folded, control and
 * invisible characters removed, trailing white space trimmed), so neither a model nor a hand-edited state file can
 * hide text in it that the user does not see on the page. Tag look-alikes (`MEMORY_TAG_LIKE`) become `[removed tag]`
 * (`[tag]` where the look-alike is shorter than that), after the invisible characters are gone, so none can hide a
 * tag from the match. The look-alikes are found the way `fence.ts` finds them in Executor Session text: full-width
 * and other compatibility forms, `&lt;` entities, confusable angles, slashes, hyphens and letters all count. Only the
 * look-alikes change; the rest of the text stays as written (it is not normalised). The result is never longer than
 * the text, so cleaning cannot push a text over `MEMORY_MAX`, and cleaning it again changes nothing.
 */
export declare function cleanMemory(raw: string): string;
/** Whether a string has the shape of an Executor Session's row id as this plugin mints it (`newThreadId`). */
export declare function isExecutorId(value: unknown): value is string;
/** Longest gap of a look-in (`executor_check_later`), in minutes; `checkLaterMinMinutes` cannot exceed it. */
export declare const LOOK_IN_MAX_MINUTES = 240;
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
 * The names the automatic naming chooses from: the names of the built-in list no live coordinator uses
 * (case-insensitive); when all are used, the listed names with the lowest number that leaves one free (`Noether 2`).
 * Empty only when every name up to 9999 is used.
 * @param used - names of the live coordinators.
 */
export declare function freeNames(used: Iterable<string>): string[];
/**
 * A random name no live coordinator uses, one of `freeNames`.
 * @param used - names of the live coordinators.
 * @param random - picks an index below `n`; injected for tests.
 */
export declare function freeName(used: Iterable<string>, random?: (n: number) => number): string;
/**
 * Whether `name` is a name the automatic naming could give right now, letter for letter (one of `freeNames`). The New
 * coordinator form sends back the name the host suggested; only such a name is taken as a suggestion. Anything else
 * (a typed name, a taken name, a number the naming would not reach, a long text) is as if nothing had been suggested,
 * so a suggestion is never a way around `checkCoordinatorName`.
 */
export declare function isFreeName(name: string, used: Iterable<string>): boolean;
/**
 * The folder slug of a name: the list entry's slug (with the number of a numbered name, `li-bai-2`), else the name's
 * own ASCII letters and digits, else empty (a name with no ASCII letters that is not on the list).
 */
export declare function nameSlug(name: string): string;
/**
 * The folder of a new coordinator's home: `orchestrator-<slug>` (`orchestrator-li-bai`), `-2`, `-3`, ... when that folder
 * is taken (n from 1); plain `orchestrator`, `orchestrator-2`, ... for a name without a slug.
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
 * not pass it as `cwd` (a real model did exactly that). Only an absolute or `~/` path counts. What may stand before
 * the words on their line (list marks, numbers, emphasis) never includes a line break: with one in it, every line
 * start of a text of many line breaks would be read on to the end of the text.
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
     * Where new coordinators get their own folder (`<base>/orchestrator`, `orchestrator-2`, ...). Undefined: next to
     * dsh's default workspace (see discoverBase).
     */
    coordinatorBase?: string;
    /** Maximum number of threads running at once; more starts queue. */
    maxRunningThreads: number;
    /** Quiet time before a batch of notices is delivered to the coordinator. */
    noticeDebounceMs: number;
    /** Longest a notice waits for its batch. */
    noticeMaxDelayMs: number;
    /** Shortest gap a coordinator may ask for with `executor_check_later`, in minutes (1 to 240); shorter requests are raised to it. */
    checkLaterMinMinutes: number;
    /** Look-ins one executor may get until the user writes again (in the coordinator's chat or in the executor); past it the tool refuses. */
    checkLaterMaxPerExecutor: number;
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

/** Filesystem access the guard needs; injected so tests run against a fake tree. */
export interface GuardFs {
    /** Resolve symlinks of an existing path; throws when the path does not exist. */
    realpath(path: string): string;
}
export interface GuardEnv {
    home: string;
    /** The calling coordinator's folder, absolute: new thread folders go below it. */
    ownFolder?: string;
    /** @deprecated the name of `ownFolder` before multiple coordinators; read when `ownFolder` is absent. */
    threadsRoot?: string;
    fs: GuardFs;
    /** Real paths on the user's allowed-folders list; each covers its subfolders. */
    allowed?: readonly string[];
    /** Real paths of live threads' folders, of every coordinator. */
    taken?: readonly string[];
    /** Real paths of every coordinator home (and a legacy `_coordinator`): never a thread folder, nor a folder above one. */
    coordinator?: readonly string[];
    /** The active dsh home and `~/.dsh`: a folder that contains one or lies in one is refused. */
    protectedRoots?: readonly string[];
    /** Real paths of folders the plugin created for threads; below the coordinator's folder they need no confirmation. */
    pluginFolders?: readonly string[];
    /** Real paths of every coordinator's folder: a thread folder that contains one is refused (L2). */
    coordinatorFolders?: readonly string[];
    /** Real paths of the other coordinators' homes: a thread folder inside one is refused (S9). */
    otherHomes?: readonly string[];
}
/** Whether a path contains a control character or a line break (S10). */
export declare function hasControl(path: string): boolean;
/** Whether `child` is `parent` or below it (both absolute, normalised). */
export declare function isWithin(parent: string, child: string): boolean;
/** `~` and `~/x` to the home folder; other paths unchanged. */
export declare function expandTilde(path: string, home: string): string;
/** Lexically normalised absolute form: `~` expanded, `.`/`..` collapsed, no trailing slash, NFC. */
export declare function lexical(path: string, home: string): string;
/**
 * Resolve symlinks of the longest existing prefix and append the rest, so a folder that does not exist yet is
 * still compared by where it would really be created.
 */
export declare function realResolve(path: string, fs: GuardFs): string;
/**
 * Why a resolved path is refused outright, or undefined when it is not.
 * @param path - absolute path, lexical or real.
 */
export declare function refusal(path: string, env: Pick<GuardEnv, 'home' | 'fs'>): string | undefined;
/**
 * Why a folder is refused because of the dsh home: it contains the active dsh home or `~/.dsh`, or lies in one.
 * @param path - absolute path, lexical or real.
 */
export declare function protectedProblem(path: string, roots: readonly string[], env: Pick<GuardEnv, 'home' | 'fs'>): string | undefined;
/**
 * Why a folder may not be a coordinator's home or folder (design 3.5), or undefined: the hard refusals on the lexical
 * and the real path, the dsh home, and live threads' folders (a coordinator folder inside one would let threads nest).
 * The check that a home is not a Workspace with the user's own Sessions needs the registry and lives in threads.ts.
 */
export declare function coordinatorFolderProblem(path: string, env: Pick<GuardEnv, 'home' | 'fs' | 'protectedRoots' | 'taken'> & {
    /** Homes of the other coordinators (S9): a folder may not lie inside one or contain one; equal only when `sameHomeOk`. */
    otherHomes?: readonly string[];
    /** For a home: another coordinator may share it (adoption with "+" makes such pairs). */
    sameHomeOk?: boolean;
    /** A folder that contains another coordinator's home is accepted (a re-check, where refusing would lock it out). */
    containsOk?: boolean;
    /** Live executor folders of other coordinators (S9): a folder being set may not contain one. */
    othersExecutors?: readonly string[];
}): string | undefined;
/**
 * Absolute paths the user wrote in a message: `~`, `~/...` and `/...` tokens, including ones inside quotes or
 * backticks (which may contain spaces). Trailing punctuation is dropped.
 */
export declare function pathMentions(text: string): string[];
export type GuardResult = 
/** `threads-root`: a new or plugin-made folder below the calling coordinator's folder (the name is historical). */
{
    ok: true;
    path: string;
    reason: 'threads-root' | 'allowed';
}
/** The folder may be used only after the user confirms its real path. */
 | {
    ok: false;
    confirm: true;
    path: string;
    why: 'outside' | 'existing' | 'symlink' | 'thread-folder' | 'coordinator-folder';
} | {
    ok: false;
    confirm?: undefined;
    error: string;
};
/**
 * Check one requested thread folder.
 * @param requested - the folder the coordinator asked for (absolute or `~` form).
 * @param userTexts - texts of messages the user typed in the coordinator chat.
 * @returns the real path to use, a confirmation the user must give for a real path, or an error message that tells
 * the coordinator how to proceed.
 */
export declare function checkThreadFolder(requested: string, userTexts: readonly string[], env: GuardEnv): GuardResult;

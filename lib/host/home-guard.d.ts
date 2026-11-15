import { type GuardFs } from './cwd-guard.ts';
export interface StateGuardEnv {
    /** The user's home folder. */
    home: string;
    /** Protected roots (absolute): the folder of the state file, and `storages/dsh-coordinator` of each dsh home. */
    roots: readonly string[];
    fs: GuardFs;
}
/** One tool call as the guard sees it. */
export interface GuardedCall {
    name: string;
    args: unknown;
    /** Folders relative paths resolve against: the Session's header cwd and its working directory. */
    cwds: readonly string[];
}
export interface GuardDenial {
    /**
     * `not-allowed`: a coordinator-like chat called a tool outside its allow list (threads.ts). `too-large`: the call
     * has more arguments than the state-folder check reads, so it is refused unread. `bad-path`: a path argument of a
     * file or search tool that the check cannot resolve (a NUL character, or too long for any operating system),
     * refused for the same reason.
     */
    kind: 'plugin-state' | 'plugin-tool' | 'not-allowed' | 'too-large' | 'bad-path';
    /** What matched, for the log (never shown to the model). */
    match: string;
    /** `plugin-state` only: a search that starts above the state folder, not a call that names it. */
    above?: true;
    /** `plugin-state` only: the Session's working directory decided it (a search without a path, or a call made inside the folder). */
    cwd?: true;
}
/** The most strings one call may carry. A model's call stays far below it; beyond it the call is refused unread. */
export declare const MAX_STRINGS = 100000;
/** The most path arguments (and patch file lines) of one call: each costs filesystem lookups. */
export declare const MAX_PATHS = 2000;
/**
 * The most readings of the paths of one call. A path is resolved once for every way it can be meant (as written,
 * without the blanks around it, in the other Unicode form, with `~` replaced, as a `file:` URL) and, when it is
 * relative, once from each working directory. An ordinary path has one reading or one per working directory, so
 * this allows `MAX_PATHS` relative paths from two working directories. It bounds the lookups of a call whose paths
 * are written to have many readings each.
 */
export declare const MAX_READINGS: number;
/** The deepest nesting of arrays and objects in the arguments. */
export declare const MAX_DEPTH = 64;
/**
 * No operating system opens a longer path (PATH_MAX is 1024 on macOS and 4096 on Linux). The limit applies to the
 * path after `resolve()`, not to the argument: dsh shortens a path that way before it opens it, so a long spelling
 * (`/././...`, doubled slashes) of a short path is still a path.
 */
export declare const PATH_MAX_CHARS = 4096;
/** Lexical and real forms of each protected root, without duplicates. */
export declare function protectedForms(env: Pick<StateGuardEnv, 'roots' | 'home' | 'fs'>): string[];
/** Spellings of the protected roots in free text, for the agent's folders. */
export declare function textSpellings(env: Pick<StateGuardEnv, 'roots' | 'home' | 'fs'>, cwds: readonly string[]): {
    paths: string[];
    relatives: string[];
};
/**
 * Spellings of the state folder that do not start at a known root (S7): after any prefix (`$DSH_HOME/storages/
 * dsh-coordinator`, a `cd` into the dsh home first) and through a find or glob pattern
 * (`-path '*storages/dsh-coordinator/state.json'`, `dsh-coordinator/owner.lock` behind a `**`). The text is read word
 * by word (a word ends at a blank or a quote) in one pass, so the cost grows with the length of the text and not
 * with its square, as it did when these were two patterns with an open-ended middle.
 * @param text - folded text.
 */
export declare function innerMatch(text: string): string | undefined;
/** A matcher for free text against the protected roots, built once per tool call. */
export declare function textMatcher(env: Pick<StateGuardEnv, 'roots' | 'home' | 'fs'>, cwds: readonly string[]): (text: string) => string | undefined;
/** Whether free text names a protected root; returns the spelling that matched. */
export declare function textMatch(text: string, env: Pick<StateGuardEnv, 'roots' | 'home' | 'fs'>, cwds: readonly string[]): string | undefined;
/**
 * File paths a patch text names, in the form dsh's `apply_patch` reads (`*** Add File: p`, `*** Update File: p`,
 * `*** Delete File: p`, `*** Move to: p`). The match is looser than dsh's parser (leading blanks, any letter case),
 * so a line dsh would reject is still checked.
 */
export declare function patchPaths(text: string): string[];
/** Whether a tool writes files through its path arguments. */
export declare function isWriteTool(name: string): boolean;
/**
 * Check one tool call.
 * @returns the denial, or undefined when the call may run.
 */
export declare function checkCall(call: GuardedCall, env: StateGuardEnv): GuardDenial | undefined;
/** The model-facing error of a denial. */
export declare function denialReason(denial: GuardDenial, role: 'coordinator' | 'thread'): string;

import { type GuardFs } from './cwd-guard.ts';
export interface HomeGuardEnv {
    /** The user's home folder. */
    home: string;
    /** Protected roots: the active dsh home and the default `~/.dsh` (absolute). */
    roots: readonly string[];
    /** System temp folders (absolute): `/tmp`, the per-user temp folder. */
    temp: readonly string[];
    fs: GuardFs;
}
/** One tool call as the guard sees it. */
export interface GuardedCall {
    name: string;
    args: unknown;
    /** Folders relative paths resolve against: the Session's header cwd and its working directory. */
    cwds: readonly string[];
    /** The thread's own folder, when the caller belongs to a thread. */
    ownFolder?: string;
    /** The thread runs in Ask me mode (`workspace-write`). */
    askMode: boolean;
}
export interface GuardDenial {
    /** `not-allowed`: a coordinator-like chat called a tool outside its allow list (threads.ts). */
    kind: 'dsh-home' | 'temp-write' | 'plugin-tool' | 'not-allowed';
    /** What matched, for the log (never shown to the model). */
    match: string;
}
/** Lexical and real forms of each protected root, without duplicates. */
export declare function protectedForms(env: Pick<HomeGuardEnv, 'roots' | 'home' | 'fs'>): string[];
/** Spellings of the protected roots in free text, for the agent's folders. */
export declare function textSpellings(env: Pick<HomeGuardEnv, 'roots' | 'home' | 'fs'>, cwds: readonly string[]): {
    paths: string[];
    relatives: string[];
    segments: string[];
};
/** A matcher for free text against the protected roots, built once per tool call. */
export declare function textMatcher(env: Pick<HomeGuardEnv, 'roots' | 'home' | 'fs'>, cwds: readonly string[]): (text: string) => string | undefined;
/** Whether free text names a protected root; returns the spelling that matched. */
export declare function textMatch(text: string, env: Pick<HomeGuardEnv, 'roots' | 'home' | 'fs'>, cwds: readonly string[]): string | undefined;
/** Whether a tool writes files through its path arguments. */
export declare function isWriteTool(name: string): boolean;
/**
 * Check one tool call.
 * @returns the denial, or undefined when the call may run.
 */
export declare function checkCall(call: GuardedCall, env: HomeGuardEnv): GuardDenial | undefined;
/** The model-facing error of a denial. */
export declare function denialReason(denial: GuardDenial, role: 'coordinator' | 'thread'): string;

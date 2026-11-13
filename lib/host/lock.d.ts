export interface LockOwner {
    pid: number;
    /** Process start time, ms since the epoch (approximate, to the second). */
    startedAt: number;
}
export interface LockDeps {
    pid: number;
    startedAt: number;
    /** Whether a process with this pid runs. */
    alive(pid: number): boolean;
    /** Start time of a running process in ms, or undefined when it cannot be read. */
    startTimeOf(pid: number): number | undefined;
    /** Whether a running process is a DeepSeek Harness process; undefined when that cannot be read. */
    isDsh?(pid: number): boolean | undefined;
}
export type LockResult = {
    ok: true;
    release(): void;
} | {
    ok: false;
    holder: LockOwner;
};
/** Whether the recorded owner still holds the lock: a dsh process with that pid, started at the recorded time. */
export declare function ownerLive(owner: LockOwner, deps: Pick<LockDeps, 'alive' | 'startTimeOf' | 'isDsh'>): boolean;
/**
 * Take the lock, replacing a stale one. The same process (a plugin reload) takes it again.
 * @param file - lock file path.
 */
export declare function acquireLock(file: string, deps: LockDeps): LockResult;
/** Remove the lock file if it is still ours. */
export declare function releaseLock(file: string, me: LockOwner): void;
/** Real process facts for `acquireLock`. */
export declare function processDeps(): LockDeps;

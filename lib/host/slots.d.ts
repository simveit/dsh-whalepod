/**
 * Concurrency cap for thread turns started by the coordinator. Pure.
 *
 * Pattern derived from `WorkerSlots` in dsh-superagent-prototype (src/executor/dsh.ts), Copyright (c) 2026
 * DeepSeek Harness Team, MIT License (see LICENSE). The prototype's SQLite effect queue and health board are left out:
 * here a slot is held by a thread whose lead is running a turn (minus threads waiting on the user, which use no
 * model time) or by a thread whose start is in flight. Work that finds no free slot waits in a FIFO queue and starts
 * when `pump()` finds room. A user typing into a thread directly is never queued; dsh handles that natively.
 */
export interface QueuedStart {
    threadId: string;
    /** Starts the work; the thread's slot is reserved while it runs and released when it settles. */
    start(): Promise<void>;
}
export declare class Slots {
    private readonly starting;
    private readonly queue;
    private readonly active;
    private readonly max;
    private readonly onError;
    /**
     * @param active - thread ids that currently hold a slot because their lead is running.
     * @param max - the configured cap.
     * @param onError - called when a started job rejects.
     */
    constructor(active: () => Iterable<string>, max: () => number, onError?: (threadId: string, error: unknown) => void);
    /** Slots in use: running threads plus starts in flight. */
    used(): number;
    /** Thread ids waiting for a slot, oldest first. */
    waiting(): string[];
    isQueued(threadId: string): boolean;
    /** Run `job` now if a slot is free (or the thread already holds one), otherwise queue it. Returns true if it started. */
    submit(job: QueuedStart): boolean;
    /** Remove queued jobs of a thread (archive, stop). */
    drop(threadId: string): void;
    /** Start queued jobs while slots are free. Call on every change that may free a slot. */
    pump(): void;
    /** Whether a turn of this thread would fit under the cap if the thread did not count itself. */
    roomFor(threadId: string): boolean;
    private free;
    private run;
}

/**
 * Concurrency cap for thread turns started by the coordinator. Pure.
 *
 * Pattern derived from `WorkerSlots` in dsh-superagent-prototype (src/executor/dsh.ts), Copyright (c) 2026
 * DeepSeek Harness Team, MIT License (see LICENSE). The prototype's SQLite effect queue and health board are left out:
 * here a slot is held by a thread whose lead is running a turn (minus threads waiting on the user, which use no
 * model time) or by a thread whose start is in flight. Work that finds no free slot waits in a FIFO queue and starts
 * when `pump()` finds room. A user typing into a thread directly is never queued; dsh handles that natively.
 */
export class Slots {
    starting = new Set();
    queue = [];
    active;
    max;
    onError;
    /**
     * @param active - thread ids that currently hold a slot because their lead is running.
     * @param max - the configured cap.
     * @param onError - called when a started job rejects.
     */
    constructor(active, max, onError = () => { }) {
        this.active = active;
        this.max = max;
        this.onError = onError;
    }
    /** Slots in use: running threads plus starts in flight. */
    used() {
        return new Set([...this.active(), ...this.starting]).size;
    }
    /** Thread ids waiting for a slot, oldest first. */
    waiting() { return this.queue.map(q => q.threadId); }
    isQueued(threadId) { return this.queue.some(q => q.threadId === threadId); }
    /** Run `job` now if a slot is free (or the thread already holds one), otherwise queue it. Returns true if it started. */
    submit(job) {
        if (this.queue.length === 0 && this.free(job.threadId)) {
            this.run(job);
            return true;
        }
        this.queue.push(job);
        return false;
    }
    /** Remove queued jobs of a thread (archive, stop). */
    drop(threadId) {
        for (let i = this.queue.length - 1; i >= 0; i--)
            if (this.queue[i].threadId === threadId)
                this.queue.splice(i, 1);
    }
    /** Start queued jobs while slots are free. Call on every change that may free a slot. */
    pump() {
        while (this.queue.length > 0 && this.free(this.queue[0].threadId))
            this.run(this.queue.shift());
    }
    /** Whether a turn of this thread would fit under the cap if the thread did not count itself. */
    roomFor(threadId) {
        const holders = new Set([...this.active(), ...this.starting]);
        holders.delete(threadId);
        return holders.size < this.max();
    }
    free(threadId) {
        const holders = new Set([...this.active(), ...this.starting]);
        return holders.has(threadId) || holders.size < this.max();
    }
    run(job) {
        this.starting.add(job.threadId);
        void job.start().catch(error => this.onError(job.threadId, error)).finally(() => {
            this.starting.delete(job.threadId);
            this.pump();
        });
    }
}

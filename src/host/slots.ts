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
  threadId: string
  /** Starts the work; the thread's slot is reserved while it runs and released when it settles. */
  start(): Promise<void>
}

export class Slots {
  private readonly starting = new Set<string>()
  private readonly queue: QueuedStart[] = []
  private readonly active: () => Iterable<string>
  private readonly max: () => number
  private readonly onError: (threadId: string, error: unknown) => void

  /**
   * @param active - thread ids that currently hold a slot because their lead is running.
   * @param max - the configured cap.
   * @param onError - called when a started job rejects.
   */
  constructor(active: () => Iterable<string>, max: () => number, onError: (threadId: string, error: unknown) => void = () => {}) {
    this.active = active
    this.max = max
    this.onError = onError
  }

  /** Slots in use: running threads plus starts in flight. */
  used(): number {
    return new Set([...this.active(), ...this.starting]).size
  }

  /** Thread ids waiting for a slot, oldest first. */
  waiting(): string[] { return this.queue.map(q => q.threadId) }

  isQueued(threadId: string): boolean { return this.queue.some(q => q.threadId === threadId) }

  /** Run `job` now if a slot is free (or the thread already holds one), otherwise queue it. Returns true if it started. */
  submit(job: QueuedStart): boolean {
    if (this.queue.length === 0 && this.free(job.threadId)) {
      this.run(job)
      return true
    }
    this.queue.push(job)
    return false
  }

  /** Remove queued jobs of a thread (archive, stop). */
  drop(threadId: string): void {
    for (let i = this.queue.length - 1; i >= 0; i--) if (this.queue[i]!.threadId === threadId) this.queue.splice(i, 1)
  }

  /** Start queued jobs while slots are free. Call on every change that may free a slot. */
  pump(): void {
    while (this.queue.length > 0 && this.free(this.queue[0]!.threadId)) this.run(this.queue.shift()!)
  }

  /** Whether a turn of this thread would fit under the cap if the thread did not count itself. */
  roomFor(threadId: string): boolean {
    const holders = new Set([...this.active(), ...this.starting])
    holders.delete(threadId)
    return holders.size < this.max()
  }

  private free(threadId: string): boolean {
    const holders = new Set([...this.active(), ...this.starting])
    return holders.has(threadId) || holders.size < this.max()
  }

  private run(job: QueuedStart): void {
    this.starting.add(job.threadId)
    void job.start().catch(error => this.onError(job.threadId, error)).finally(() => {
      this.starting.delete(job.threadId)
      this.pump()
    })
  }
}

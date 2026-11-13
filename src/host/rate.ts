/** Sliding-window counters for the wake guard and the peer-message limits. Pure apart from the clock. */

export class RateWindow {
  private readonly hits = new Map<string, number[]>()
  private readonly windowMs: () => number
  private readonly now: () => number

  constructor(windowMs: () => number, now: () => number = Date.now) {
    this.windowMs = windowMs
    this.now = now
  }

  /** Hits of `key` inside the window, after dropping older ones. */
  count(key: string): number {
    const since = this.now() - this.windowMs()
    const list = (this.hits.get(key) ?? []).filter(at => at > since)
    if (list.length === 0) this.hits.delete(key)
    else this.hits.set(key, list)
    return list.length
  }

  /** Record a hit when the key is below `max`; returns whether it was recorded. */
  take(key: string, max: number): boolean {
    if (this.count(key) >= max) return false
    const list = this.hits.get(key) ?? []
    list.push(this.now())
    this.hits.set(key, list)
    return true
  }

  /** Forget the hits of `key` (the user acknowledged a pause). */
  reset(key: string): void {
    this.hits.delete(key)
  }

  /** Forget the hits of every key that matches (the user resumed one side of a pair). */
  resetWhere(match: (key: string) => boolean): void {
    for (const key of [...this.hits.keys()]) if (match(key)) this.hits.delete(key)
  }

  /** When the oldest hit of `key` leaves the window (ms since the epoch), or now when there is none. */
  freeAt(key: string): number {
    const first = this.hits.get(key)?.[0]
    return first === undefined ? this.now() : first + this.windowMs()
  }
}

/** A Set that forgets its oldest entries beyond `max`. */
export class BoundedSet<T> {
  private readonly items = new Set<T>()
  private readonly max: number
  constructor(max: number) { this.max = max }
  has(item: T): boolean { return this.items.has(item) }
  add(item: T): void {
    this.items.delete(item)
    this.items.add(item)
    while (this.items.size > this.max) this.items.delete(this.items.values().next().value as T)
  }
  get size(): number { return this.items.size }
}

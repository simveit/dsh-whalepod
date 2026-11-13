/** Sliding-window counters for the wake guard and the peer-message limits. Pure apart from the clock. */
export class RateWindow {
    hits = new Map();
    windowMs;
    now;
    constructor(windowMs, now = Date.now) {
        this.windowMs = windowMs;
        this.now = now;
    }
    /** Hits of `key` inside the window, after dropping older ones. */
    count(key) {
        const since = this.now() - this.windowMs();
        const list = (this.hits.get(key) ?? []).filter(at => at > since);
        if (list.length === 0)
            this.hits.delete(key);
        else
            this.hits.set(key, list);
        return list.length;
    }
    /** Record a hit when the key is below `max`; returns whether it was recorded. */
    take(key, max) {
        if (this.count(key) >= max)
            return false;
        const list = this.hits.get(key) ?? [];
        list.push(this.now());
        this.hits.set(key, list);
        return true;
    }
    /** Forget the hits of `key` (the user acknowledged a pause). */
    reset(key) {
        this.hits.delete(key);
    }
    /** Forget the hits of every key that matches (the user resumed one side of a pair). */
    resetWhere(match) {
        for (const key of [...this.hits.keys()])
            if (match(key))
                this.hits.delete(key);
    }
    /** When the oldest hit of `key` leaves the window (ms since the epoch), or now when there is none. */
    freeAt(key) {
        const first = this.hits.get(key)?.[0];
        return first === undefined ? this.now() : first + this.windowMs();
    }
}
/** A Set that forgets its oldest entries beyond `max`. */
export class BoundedSet {
    items = new Set();
    max;
    constructor(max) { this.max = max; }
    has(item) { return this.items.has(item); }
    add(item) {
        this.items.delete(item);
        this.items.add(item);
        while (this.items.size > this.max)
            this.items.delete(this.items.values().next().value);
    }
    get size() { return this.items.size; }
}

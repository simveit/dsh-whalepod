/** Sliding-window counters for the wake guard and the peer-message limits. Pure apart from the clock. */
export declare class RateWindow {
    private readonly hits;
    private readonly windowMs;
    private readonly now;
    constructor(windowMs: () => number, now?: () => number);
    /** Hits of `key` inside the window, after dropping older ones. */
    count(key: string): number;
    /** Record a hit when the key is below `max`; returns whether it was recorded. */
    take(key: string, max: number): boolean;
    /** Forget the hits of `key` (the user acknowledged a pause). */
    reset(key: string): void;
    /** Forget the hits of every key that matches (the user resumed one side of a pair). */
    resetWhere(match: (key: string) => boolean): void;
    /** When the oldest hit of `key` leaves the window (ms since the epoch), or now when there is none. */
    freeAt(key: string): number;
}
/** A Set that forgets its oldest entries beyond `max`. */
export declare class BoundedSet<T> {
    private readonly items;
    private readonly max;
    constructor(max: number);
    has(item: T): boolean;
    add(item: T): void;
    get size(): number;
}

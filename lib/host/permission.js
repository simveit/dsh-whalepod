export function targetPermission(input) {
    if (input.disposing)
        return { lead: 'workspace-write', parked: input.chosen === 'auto', autoUnavailable: false };
    if (input.chosen === 'ask')
        return { lead: 'workspace-write', parked: false, autoUnavailable: false };
    if (!input.autoAvailable)
        return { lead: 'workspace-write', parked: true, autoUnavailable: true };
    return { lead: 'auto', parked: false, autoUnavailable: false };
}
/** What to do to a lead, given its current preset name (`current()` of dsh's permission presets). */
export function leadAction(target, current) {
    if (current === target)
        return 'none';
    return target === 'auto' ? 'set-auto' : 'set-workspace-write';
}
/**
 * What to do to a member Session. dsh seeds a member with the lead's preset (`auto`) or the lead's sandbox, and an
 * approval policy of `never`, which makes its derived preset `auto`, `danger-full-access` (auto review gone), or
 * `custom` (a sandbox with `never`). Only the sandbox is narrowed.
 */
export function memberAction(target, current, alreadyNarrowed) {
    if (target === 'auto' || alreadyNarrowed)
        return 'none';
    return current === 'workspace-write' || current === 'read-only' ? 'none' : 'narrow';
}
/** The preset a cold Session's log last recorded (`permission/preset` events), or undefined. */
export function storedPreset(events) {
    for (let i = events.length - 1; i >= 0; i--) {
        const event = events[i];
        if (event.type !== 'permission/preset')
            continue;
        const preset = event.data?.preset;
        if (typeof preset === 'string')
            return preset;
    }
    return undefined;
}

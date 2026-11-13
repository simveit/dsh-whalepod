/**
 * The effective permission of a thread's tree. Pure.
 *
 * A thread records the mode the user chose when it started (`auto` or `ask`). What its Sessions actually run on
 * depends also on whether dsh's auto review is loaded and on whether the plugin is going away:
 *
 * | chosen | auto review loaded | plugin  | lead preset       | members                       |
 * |--------|--------------------|---------|-------------------|-------------------------------|
 * | auto   | yes                | running | `auto`            | as dsh seeds them (`auto`)    |
 * | auto   | no                 | running | `workspace-write` | sandbox `workspace-write`     |
 * | ask    | either             | running | `workspace-write` | sandbox `workspace-write`     |
 * | either | either             | removed | `workspace-write` | sandbox `workspace-write`     |
 *
 * The target is never looser than the chosen mode. Members keep the approval policy dsh pins on them (`never`), so
 * only their sandbox is narrowed; once narrowed they are not widened again (they are short-lived, and staying
 * stricter is safe). The service applies the target to the lead and to every member when the thread starts, when a
 * member is created, when the permission catalog changes, on restore, and when the plugin is disposed.
 */
import type { ThreadPermission } from '../types.ts'

export type LeadPreset = 'auto' | 'workspace-write'

export interface PermissionInput {
  chosen: ThreadPermission
  autoAvailable: boolean
  /** The plugin is being disposed (removed from a running app, or the app quits). */
  disposing: boolean
}

export interface PermissionTarget {
  lead: LeadPreset
  /** The thread runs stricter than chosen because auto review is not loaded or the plugin is going away. */
  parked: boolean
  /** Only when auto review is missing while the user chose auto: shown as a panel problem. */
  autoUnavailable: boolean
}

export function targetPermission(input: PermissionInput): PermissionTarget {
  if (input.disposing) return { lead: 'workspace-write', parked: input.chosen === 'auto', autoUnavailable: false }
  if (input.chosen === 'ask') return { lead: 'workspace-write', parked: false, autoUnavailable: false }
  if (!input.autoAvailable) return { lead: 'workspace-write', parked: true, autoUnavailable: true }
  return { lead: 'auto', parked: false, autoUnavailable: false }
}

/** What to do to a lead, given its current preset name (`current()` of dsh's permission presets). */
export function leadAction(target: LeadPreset, current: string | undefined): 'none' | 'set-auto' | 'set-workspace-write' {
  if (current === target) return 'none'
  return target === 'auto' ? 'set-auto' : 'set-workspace-write'
}

/**
 * What to do to a member Session. dsh seeds a member with the lead's preset (`auto`) or the lead's sandbox, and an
 * approval policy of `never`, which makes its derived preset `auto`, `danger-full-access` (auto review gone), or
 * `custom` (a sandbox with `never`). Only the sandbox is narrowed.
 */
export function memberAction(target: LeadPreset, current: string | undefined, alreadyNarrowed: boolean): 'none' | 'narrow' {
  if (target === 'auto' || alreadyNarrowed) return 'none'
  return current === 'workspace-write' || current === 'read-only' ? 'none' : 'narrow'
}

/** The preset a cold Session's log last recorded (`permission/preset` events), or undefined. */
export function storedPreset(events: readonly { type: string; data: unknown }[]): string | undefined {
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i]!
    if (event.type !== 'permission/preset') continue
    const preset = (event.data as { preset?: unknown } | undefined)?.preset
    if (typeof preset === 'string') return preset
  }
  return undefined
}

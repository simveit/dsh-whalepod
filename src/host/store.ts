/**
 * Persistence of the coordinators and the thread table.
 *
 * Choice: one small JSON file, `<DSH_HOME>/storages/dsh-coordinator/state.json`, written atomically (temp file plus
 * rename). Reasons: the table is tiny and always written whole; JSON keeps it readable and easy to repair by hand;
 * it lives under the same DSH_HOME as the sessions it points to, so separate homes stay separate; and it needs no
 * runtime dependency on dsh's storage-domain API (schemastery schemas, still marked "proposed" upstream), which a
 * linked third-party plugin cannot import reliably. dsh's own `storage-json` backend writes to the same
 * `storages/` root.
 *
 * Version 2 holds several coordinators. A version 1 file (one coordinator Session id) is upgraded in memory on load,
 * and copied once to `state.v1.json` next to it before the first version 2 write, so the original is never lost.
 */
import { randomBytes } from 'node:crypto'
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, sep } from 'node:path'
import type { ThreadInfo } from '../types.ts'
import { ARCHIVED_COORDINATORS_KEEP, checkCoordinatorName, cleanExecutorPrompt, COORDINATOR_TITLE, EXECUTOR_PROMPT_MAX, isCoordinatorId, newCoordinatorId } from './ids.ts'
import type { PersistedFacts } from './status.ts'

export interface PersistedThread {
  info: ThreadInfo
  facts: PersistedFacts
  /** A brief not yet delivered (the thread was queued when the app quit). */
  pendingBrief?: string
  /** How the brief is recorded: as the user's prompt or as an agent message (see authority.ts). Missing reads as `notice`. */
  briefAs?: 'user' | 'notice'
  /** Coordinator and peer messages waiting for the brief, as rendered text with their request keys. */
  pendingMessages?: { key: string; text: string }[]
  /** Legacy: the thread's own Workspace from releases before threads moved to Ungrouped (removed once, design 4.4). */
  workspaceId?: string
  /** Legacy: the plugin created the thread's Workspace. */
  ownWorkspace?: boolean
  /** The plugin created the thread's folder (below its coordinator's folder such a folder needs no confirmation). */
  ownFolder?: boolean
  /** The coordinator's Executor prompt when this Executor Session started (it keeps that one for life). */
  executorPrompt?: string
  /** The thread was moved off `auto` while the plugin was removed; restore `auto` on the next load. */
  presetParked?: boolean
  /** Archived threads stay in the file but leave the list and are no longer tracked. */
  archived?: boolean
}

export interface PersistedCoordinator {
  /** `c-` + 4 hex, unique. */
  id: string
  /** The chat Session; null while there is none (a version 1 file without one). The record and its threads stay. */
  sessionId: string | null
  /** Real path; the header cwd of the chat Session, fixed for life, and its sidebar Workspace. */
  home: string
  /** Real path; the default parent of new thread folders. The user can change it. */
  folder: string
  /** The coordinator Workspace of `home`. */
  workspaceId?: string
  /** Last seen Session title, for the page while the Session is cold. */
  title?: string
  /** Unique name (e.g. "Noether"); absent in files written before names existed (a name is chosen on load). */
  name?: string
  /** The user's Executor prompt for this coordinator's Executor Sessions (max 4000 chars). */
  executorPrompt?: string
  /** Which log mark validation expects: the opening turn (or the legacy title), or the role mark of an adopted chat. */
  marks?: 'opening' | 'role'
  /** Chat Sessions this coordinator had before a Reopen; messages they sent into threads still read as the coordinator's. */
  pastSessionIds?: string[]
  createdAt: number
  updatedAt: number
  /** Archived by the user on the Coordinator page. */
  archived?: boolean
  /**
   * The coordinator a version 1 file became. Its rows may carry briefs of that release (no coordinator id in the mark),
   * which bind only to it, and it is kept for archived rows alone. At most one record carries it.
   */
  migratedV1?: boolean
}

/** A sidebar Workspace the plugin uses as a home for coordinators. */
export interface PersistedCoordinatorWorkspace {
  /** Workspace id; empty until the registry was asked (a migrated version 1 file). */
  id: string
  path: string
  /** The plugin registered it. */
  own: boolean
}

export interface PersistedState {
  version: 2
  revision: number
  coordinators: PersistedCoordinator[]
  coordinatorWorkspaces: PersistedCoordinatorWorkspace[]
  threads: PersistedThread[]
  /** The permission mode the user picked for new threads; absent until they pick one (the config default applies). Global. */
  threadPermission?: 'auto' | 'ask'
  /**
   * Folders outside every coordinator's folder the user chose "Always allow" for (real paths). Loaded entries are
   * hints only: each is checked by the folder guard again, a thread still needs the user to name the folder, and the
   * list never lifts a hard refusal. Global.
   */
  allowedFolders?: string[]
  /** The coordinator "Open coordinator chat" opens. */
  lastCoordinatorId?: string
  /**
   * Retired: the one-time removal of plugin-made thread Workspaces of an earlier build. Always written as true so an
   * older build never runs that removal on a file whose executors now have their own groups again.
   */
  workspacesMigrated?: boolean
  /** Every live Executor Session got its own sidebar group once (threads.ts groupExecutors). */
  executorGroups?: boolean
  /** When the state file was last found unusable (N1): the panel keeps saying so until the owner opens a coordinator. */
  degradedSince?: number
}

export const STATE_VERSION = 2

export function emptyState(): PersistedState {
  return { version: 2, revision: 0, coordinators: [], coordinatorWorkspaces: [], threads: [] }
}

/** The file was written by a newer plugin version; it is neither read nor overwritten. */
export class NewerStateError extends Error {}

/** What upgrading a version 1 file needs: the legacy threads root (its coordinator's home and folder) and the clock. */
export interface UpgradeContext {
  /** Absolute legacy threads root (`threadsRoot` config). */
  threadsRoot?: string
  now?: () => number
  /** Id source, for tests. */
  newId?: (taken: ReadonlySet<string>) => string
}

const isPath = (value: unknown): value is string => typeof value === 'string' && value.startsWith('/') && !value.includes('\0') && value.length < 4096
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

/**
 * Parse a stored state, dropping malformed rows instead of failing the whole table. A version 1 file is upgraded:
 * its coordinator becomes one record (home and folder the legacy threads root), every thread row gets that
 * coordinator, and rows strictly below the old root are marked as plugin-made folders.
 */
export function parseState(text: string, upgrade: UpgradeContext = {}): PersistedState {
  const raw = JSON.parse(text) as Record<string, unknown> | null
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('the state file is not a JSON object')
  const version = raw['version']
  if (typeof version === 'number' && version > STATE_VERSION) throw new NewerStateError(`state file version ${version} is newer than this plugin (${STATE_VERSION})`)
  if (version === 1) return upgradeV1(raw, upgrade)
  if (version !== STATE_VERSION) throw new Error('unsupported state file version')
  const coordinators: PersistedCoordinator[] = []
  const ids = new Set<string>()
  for (const value of Array.isArray(raw['coordinators']) ? raw['coordinators'] : []) {
    const record = coordinatorOf(value)
    if (record === undefined || ids.has(record.id)) continue
    ids.add(record.id)
    coordinators.push(record)
  }
  const workspaces: PersistedCoordinatorWorkspace[] = []
  for (const value of Array.isArray(raw['coordinatorWorkspaces']) ? raw['coordinatorWorkspaces'] : []) {
    const entry = (value ?? {}) as Partial<PersistedCoordinatorWorkspace>
    if (typeof entry.id !== 'string' || !isPath(entry.path) || workspaces.some(w => w.path === entry.path)) continue
    workspaces.push({ id: entry.id, path: entry.path, own: entry.own === true })
  }
  const threads = (Array.isArray(raw['threads']) ? raw['threads'] : []).filter(isThread).map((row) => {
    const owner = (row.info as { coordinatorId?: unknown }).coordinatorId
    const { executorPrompt: rawPrompt, ...rest } = row
    const prompt = storedPrompt(rawPrompt)
    return { ...rest, info: { ...row.info, coordinatorId: typeof owner === 'string' ? owner : '' }, ...(prompt === undefined ? {} : { executorPrompt: prompt }) }
  })
  const last = raw['lastCoordinatorId']
  return {
    version: 2,
    revision: isNumber(raw['revision']) ? raw['revision'] : 0,
    coordinators: coordinators.slice(0, 200),
    coordinatorWorkspaces: workspaces.slice(0, 200),
    threads,
    ...common(raw),
    ...(typeof last === 'string' && ids.has(last) ? { lastCoordinatorId: last } : {}),
    ...(raw['workspacesMigrated'] === true ? { workspacesMigrated: true } : {}),
    ...(isNumber(raw['degradedSince']) ? { degradedSince: raw['degradedSince'] } : {}),
    ...(raw['executorGroups'] === true ? { executorGroups: true } : {}),
  }
}

function coordinatorOf(value: unknown): PersistedCoordinator | undefined {
  if (value === null || typeof value !== 'object') return undefined
  const c = value as Partial<PersistedCoordinator>
  if (!isCoordinatorId(c.id) || !isPath(c.home) || !isPath(c.folder)) return undefined
  if (c.sessionId !== null && typeof c.sessionId !== 'string') return undefined
  return {
    id: c.id,
    sessionId: c.sessionId === '' ? null : c.sessionId,
    home: c.home,
    folder: c.folder,
    ...(typeof c.workspaceId === 'string' ? { workspaceId: c.workspaceId } : {}),
    ...(typeof c.title === 'string' ? { title: c.title.slice(0, 200) } : {}),
    ...(() => { const checked = checkCoordinatorName(c.name); return 'name' in checked ? { name: checked.name } : {} })(),
    ...(() => { const prompt = storedPrompt(c.executorPrompt); return prompt === undefined ? {} : { executorPrompt: prompt } })(),
    ...(c.marks === 'opening' || c.marks === 'role' ? { marks: c.marks } : {}),
    ...(Array.isArray(c.pastSessionIds) ? { pastSessionIds: c.pastSessionIds.filter((s): s is string => typeof s === 'string').slice(-10) } : {}),
    createdAt: isNumber(c.createdAt) ? c.createdAt : 0,
    updatedAt: isNumber(c.updatedAt) ? c.updatedAt : 0,
    ...(c.archived === true ? { archived: true } : {}),
    ...(c.migratedV1 === true ? { migratedV1: true } : {}),
  }
}

/** A stored Executor prompt, cleaned and within the cap (S6: treated like every other stored field), or undefined. */
export function storedPrompt(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const clean = cleanExecutorPrompt(value)
  return clean === '' || clean.length > EXECUTOR_PROMPT_MAX ? undefined : clean
}

/** The fields version 1 and 2 share. */
function common(raw: Record<string, unknown>): Pick<PersistedState, 'threadPermission' | 'allowedFolders'> {
  const permission = raw['threadPermission']
  const allowed = raw['allowedFolders']
  return {
    ...(permission === 'auto' || permission === 'ask' ? { threadPermission: permission } : {}),
    ...(Array.isArray(allowed) ? { allowedFolders: allowed.filter(isPath).slice(0, 200) } : {}),
  }
}

/** Design 2.4: a version 1 file becomes one coordinator that owns every thread row, archived ones included. */
function upgradeV1(raw: Record<string, unknown>, upgrade: UpgradeContext): PersistedState {
  const now = (upgrade.now ?? Date.now)()
  const rows = (Array.isArray(raw['threads']) ? raw['threads'] : []).filter(isThread)
  const sessionId = typeof raw['coordinatorSessionId'] === 'string' && raw['coordinatorSessionId'] !== '' ? raw['coordinatorSessionId'] : null
  const root = upgrade.threadsRoot
  const base: PersistedState = { version: 2, revision: isNumber(raw['revision']) ? raw['revision'] : 0, coordinators: [], coordinatorWorkspaces: [], threads: [], ...common(raw) }
  if ((sessionId === null && rows.length === 0) || root === undefined) {
    // Nothing to own (or no legacy root to place it): the rows keep no owner and show "Without coordinator".
    return { ...base, threads: rows.map(row => ({ ...row, info: { ...row.info, coordinatorId: '' } })) }
  }
  const id = (upgrade.newId ?? newCoordinatorId)(new Set())
  const below = (cwd: string): boolean => cwd !== root && cwd.startsWith(root.endsWith(sep) ? root : root + sep)
  return {
    ...base,
    // Home and folder start at the old root, where a chat of that release lives; after validation the service moves the
    // folder (and, without a chat, the home) to a new plugin folder under the base, like a New coordinator's.
    coordinators: [{ id, sessionId, home: root, folder: root, title: COORDINATOR_TITLE, marks: 'opening', createdAt: now, updatedAt: now, migratedV1: true }],
    coordinatorWorkspaces: [{ id: '', path: root, own: true }],
    threads: rows.map(row => ({
      ...row,
      info: { ...row.info, coordinatorId: id },
      ...(row.ownFolder === true || below(row.info.cwd) ? { ownFolder: true } : {}),
    })),
    lastCoordinatorId: id,
  }
}

/** What loading found besides the state. */
export interface LoadResult {
  state: PersistedState
  /** Saving is refused (a newer version wrote the file). */
  readOnly: boolean
  /** One line for the log and the panel when something was wrong with the file. */
  problem?: string
  /** The file was a version 1 file, upgraded in memory; it is copied to `state.v1.json` before the first write. */
  upgraded?: boolean
}

function isThread(value: unknown): value is PersistedThread {
  if (value === null || typeof value !== 'object') return false
  const row = value as Partial<PersistedThread>
  const info = row.info as Partial<ThreadInfo> | undefined
  return info !== undefined && info !== null && typeof info.id === 'string' && typeof info.sessionId === 'string'
    && typeof info.title === 'string' && typeof info.cwd === 'string' && row.facts !== undefined && row.facts !== null && typeof row.facts === 'object'
}

/** Most archived rows kept in the file; older ones are dropped (their sessions and folders stay). */
export const ARCHIVED_KEEP = 100

/** Drop the oldest archived rows beyond `ARCHIVED_KEEP`. */
export function pruneArchived(threads: readonly PersistedThread[]): PersistedThread[] {
  const archived = threads.filter(t => t.archived === true).sort((a, b) => b.info.updatedAt - a.info.updatedAt)
  const drop = new Set(archived.slice(ARCHIVED_KEEP).map(t => t.info.id))
  return threads.filter(t => !drop.has(t.info.id))
}

/** Drop the oldest archived coordinators beyond `ARCHIVED_COORDINATORS_KEEP`, never one that still owns a live thread. */
export function pruneCoordinators(coordinators: readonly PersistedCoordinator[], threads: readonly PersistedThread[]): PersistedCoordinator[] {
  const owning = new Set(threads.filter(t => t.archived !== true).map(t => t.info.coordinatorId))
  const archived = coordinators.filter(c => c.archived === true && !owning.has(c.id)).sort((a, b) => b.updatedAt - a.updatedAt)
  const drop = new Set(archived.slice(ARCHIVED_COORDINATORS_KEEP).map(c => c.id))
  return coordinators.filter(c => !drop.has(c.id))
}

export class JsonStore {
  readonly file: string
  /** Set when the file belongs to a newer plugin version: `save` then refuses. */
  readOnly = false
  private readonly now: () => number
  private readonly upgrade: UpgradeContext
  /** The version 1 text read on load, copied to `state.v1.json` before the first version 2 write. */
  private v1Text: string | undefined
  constructor(file: string, now: () => number = Date.now, upgrade: UpgradeContext = {}) {
    this.file = file
    this.now = now
    this.upgrade = { now, ...upgrade }
  }

  /** Where the version 1 file is kept after an upgrade. */
  get v1File(): string {
    return join(dirname(this.file), 'state.v1.json')
  }

  /**
   * Read the state. A missing file is an empty table. A file that is not valid JSON or has an unknown old version
   * is moved aside (`state.json.corrupt-<time>`) and the table starts empty. A file from a newer version is left
   * untouched and the store becomes read-only, so a downgrade never overwrites it. A version 1 file is upgraded.
   */
  load(): LoadResult {
    let text: string
    try {
      text = readFileSync(this.file, 'utf8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { state: emptyState(), readOnly: false }
      throw error
    }
    try {
      const state = parseState(text, this.upgrade)
      const upgraded = (JSON.parse(text) as { version?: unknown }).version === 1
      this.v1Text = upgraded ? text : undefined
      return { state, readOnly: false, ...(upgraded ? { upgraded: true } : {}) }
    } catch (error) {
      if (error instanceof NewerStateError) {
        this.readOnly = true
        return { state: emptyState(), readOnly: true, problem: `${error.message}; the plugin runs without saving and leaves the file alone. Chats that carry the plugin's marks stay narrowed` }
      }
      const aside = `${this.file}.corrupt-${new Date(this.now()).toISOString().replace(/[:.]/g, '-')}`
      renameSync(this.file, aside)
      return { state: emptyState(), readOnly: false, problem: `the state file could not be read (${String(error)}); it was moved to ${aside} and the coordinator starts without saved coordinators or Executor Sessions. Chats that carry the plugin's marks stay narrowed until you set them up again` }
    }
  }

  /**
   * Write the state atomically: a temporary file with a random name (not derived from the pid, so nothing can block
   * it in advance by creating that name), then a rename. Throws when the write fails; the service shows that as a
   * host problem. The first write after a version 1 load first copies that file to `state.v1.json` (mode 0600,
   * never overwritten); when the copy fails, nothing is written.
   */
  save(state: PersistedState): void {
    if (this.readOnly) throw new Error('the state file belongs to a newer plugin version; not saving')
    mkdirSync(dirname(this.file), { recursive: true, mode: 0o700 })
    if (this.v1Text !== undefined) {
      try {
        writeFileSync(this.v1File, this.v1Text, { mode: 0o600, flag: 'wx' })
      } catch (error) {
        // An earlier copy is kept as it is: never overwritten.
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw new Error(`could not keep a copy of the version 1 state file (${String(error)}); not upgrading it`)
      }
      this.v1Text = undefined
    }
    const temp = `${this.file}.${randomBytes(8).toString('hex')}.tmp`
    try {
      writeFileSync(temp, JSON.stringify(state, null, 2) + '\n', { mode: 0o600, flag: 'wx' })
      renameSync(temp, this.file)
    } catch (error) {
      try { rmSync(temp, { force: true }) } catch { /* nothing to clean up */ }
      throw error
    }
  }
}

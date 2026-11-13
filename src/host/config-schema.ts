/**
 * The plugin's configuration as dsh sees it: one declarative field list, turned into a Schemastery `Config` for the
 * service class, and a live view of the values for the thread service. Pure apart from `liveConfig`'s getters.
 *
 * dsh's Plugins page edits only fields marked `.volatile()`; a volatile change reaches the running service without a
 * restart (Volatile references), any other change restarts the plugin. All fields are volatile except the legacy
 * `threadsRoot`, which only locates an old chat and is read once at load. The field list here, `DEFAULT_CONFIG` and
 * `parseConfig` (ids.ts) must agree: the test in tests/config-schema.test.ts checks minimums, defaults and choices.
 * Every field is loose: a value it refuses resolves to the field's default, so a bad patch value never fails the load.
 * Whatever the form or a profile patch sends, `parseConfig` still sanitizes it at every read (the never list for extra
 * tools, the minimums, the path refusals of the base where it is used).
 */
import { isAbsolute, relative } from 'node:path'
import { DEFAULT_CONFIG, parseConfig, type CoordinatorConfig } from './ids.ts'

export type ConfigFieldKind = 'count' | 'duration' | 'choice' | 'path' | 'list'

export interface ConfigField {
  key: keyof CoordinatorConfig
  kind: ConfigFieldKind
  /** Smallest accepted value (counts and durations). */
  min?: number
  /** Whole numbers only. */
  integer?: boolean
  /** Accepted values (choices). */
  choices?: readonly string[]
  /** Editable on the Plugins page without a restart. */
  volatile: boolean
  /** One line for the schema (the page shows its own localised copy). */
  description: string
}

/** Every configuration key, in the order the page groups them. */
export const CONFIG_FIELDS: readonly ConfigField[] = [
  { key: 'maxRunningThreads', kind: 'count', min: 1, integer: true, volatile: true, description: 'Executor Sessions running a turn at once, across all coordinators; further starts queue.' },
  { key: 'threadTurnBudget', kind: 'count', min: 0, integer: true, volatile: true, description: 'Turns per Executor Session per 24 hours that the executor, its coordinator, a peer or a schedule starts; 0 means no daily turn budget.' },
  { key: 'wakeMaxPerThread', kind: 'count', min: 1, integer: true, volatile: true, description: 'How often one Executor Session may wake its coordinator within the wake window before it pauses.' },
  { key: 'wakeWindowMs', kind: 'duration', min: 1000, volatile: true, description: 'Window of the wake limit, in milliseconds.' },
  { key: 'peerMaxPerPair', kind: 'count', min: 1, integer: true, volatile: true, description: 'Messages between two Executor Sessions within the peer window, both directions.' },
  { key: 'peerMaxPerThread', kind: 'count', min: 1, integer: true, volatile: true, description: 'Messages one Executor Session may send to others within the peer window.' },
  { key: 'peerWindowMs', kind: 'duration', min: 1000, volatile: true, description: 'Window of the peer message limits, in milliseconds.' },
  { key: 'noticeDebounceMs', kind: 'duration', min: 0, volatile: true, description: 'Quiet time before a batch of notices goes to the coordinator, in milliseconds.' },
  { key: 'noticeMaxDelayMs', kind: 'duration', min: 0, volatile: true, description: 'Longest a notice waits for its batch, in milliseconds.' },
  { key: 'threadPermission', kind: 'choice', choices: ['auto', 'ask'], volatile: true, description: 'How new Executor Sessions run until the user picks on the Coordinator page: auto (Auto review) or ask (Ask me, workspace-write).' },
  { key: 'briefAs', kind: 'choice', choices: ['user', 'notice'], volatile: true, description: 'user: an Assignment counts as the user\'s prompt when the user opened the coordinator\'s turn; notice: always an agent message.' },
  { key: 'coordinatorBase', kind: 'path', volatile: true, description: 'Folder where New coordinator makes each coordinator\'s own folder; empty: next to dsh\'s default workspace.' },
  { key: 'coordinatorExtraTools', kind: 'list', volatile: true, description: 'Extra tools of other plugins or MCP servers the coordinators may use; tools on the plugin\'s never list are never added.' },
  { key: 'threadsRoot', kind: 'path', volatile: false, description: 'Legacy: only locates the chat of a coordinator migrated from a version 1 state file.' },
]

/** The parts of Schemastery the builder uses (dsh's own copy is passed in at runtime). */
export interface SchemaBuilder {
  object(fields: Record<string, unknown>): unknown
  number(): SchemaNode
  string(): SchemaNode
  array(of: unknown): SchemaNode
  union(options: unknown[]): SchemaNode
  const(value: string): SchemaNode
}

export interface SchemaNode {
  min?(value: number): SchemaNode
  step?(value: number): SchemaNode
  default(value: unknown): SchemaNode
  description(text: string): SchemaNode
  loose?(): SchemaNode
  hidden?(): SchemaNode
  volatile?(): SchemaNode
}

/**
 * The service's `static Config` built with dsh's Schemastery.
 * @param z - Schemastery (its default export).
 */
export function buildConfigSchema(z: SchemaBuilder): unknown {
  const fields: Record<string, unknown> = {}
  for (const field of CONFIG_FIELDS) {
    let node: SchemaNode
    switch (field.kind) {
      case 'count':
      case 'duration':
        node = z.number()
        if (field.integer === true) node = node.step!(1)
        if (field.min !== undefined) node = node.min!(field.min)
        break
      case 'choice':
        node = z.union(field.choices!.map(choice => z.const(choice)))
        break
      case 'path':
        node = z.string()
        break
      case 'list':
        node = z.array(z.string())
        break
    }
    const fallback = field.key === 'threadsRoot' ? undefined : DEFAULT_CONFIG[field.key]
    if (fallback !== undefined) node = node.default(fallback)
    node = node.description(field.description)
    // Loose: a value the field refuses resolves to its default instead of failing the plugin's load, as parseConfig
    // has always done (an old patch with `maxRunningThreads: 0` or `threadPermission: full` keeps loading).
    if (node.loose !== undefined) node = node.loose()
    if (field.key === 'threadsRoot' && node.hidden !== undefined) node = node.hidden()
    if (field.volatile && node.volatile !== undefined) node = node.volatile()
    fields[field.key] = node
  }
  return z.object(fields)
}

/** How `schemasteryFromDsh` finds and loads a module; the host passes Node's, tests a fake. */
export interface DshModuleLoader {
  /** Resolve `id` as dsh's entry script would (`createRequire(entry).resolve`). */
  resolve(entry: string, id: string): string
  /** The real path of a file (symlinks resolved). */
  realpath(path: string): string
  /** Load a resolved file. */
  load(entry: string, file: string): unknown
}

/**
 * The installation folder of dsh: the entry script's path before its first `node_modules` segment (the entry is
 * `<root>/node_modules/@deepseek-ai/dsh-desktop-host/lib/cli.js`), else the entry's own folder.
 */
export function dshRoot(entry: string): string {
  const match = /[\\/]node_modules[\\/]/.exec(entry)
  if (match !== null) return entry.slice(0, match.index)
  const cut = Math.max(entry.lastIndexOf('/'), entry.lastIndexOf('\\'))
  return cut <= 0 ? entry : entry.slice(0, cut)
}

/** Whether `file` lies strictly inside `root`. */
function inside(root: string, file: string): boolean {
  const rel = relative(root, file)
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel)
}

/**
 * dsh's own Schemastery, resolved from dsh's entry script only, and accepted only when its real path lies inside
 * dsh's installation. Never from this plugin's folder, and never from a folder Node would also search (ancestor
 * `node_modules` such as `~/node_modules`, or the global folders), where an Executor Session could plant a copy that
 * would then run in the host. Undefined when dsh's copy cannot be found: the plugin then runs without the form.
 * @param entry - dsh's entry script (`process.argv[1]`).
 * @param loader - Node's module functions.
 */
export function schemasteryFromDsh(entry: string | undefined, loader: DshModuleLoader): SchemaBuilder | undefined {
  if (entry === undefined || entry === '') return undefined
  try {
    let root: string
    try { root = loader.realpath(dshRoot(entry)) } catch { root = dshRoot(entry) }
    const file = loader.realpath(loader.resolve(entry, '@deepseek-ai/schemastery'))
    if (!inside(root, file)) return undefined
    const loaded = loader.load(entry, file) as { default?: SchemaBuilder } & SchemaBuilder
    return loaded.default ?? loaded
  } catch {
    return undefined
  }
}

/** A Volatile reference (dsh's live config value) or a plain value. */
function current(value: unknown): unknown {
  if (value !== null && typeof value === 'object' && typeof (value as { get?: unknown }).get === 'function' && !Array.isArray(value)) {
    return (value as { get: () => unknown }).get()
  }
  return value
}

/** The raw config with every Volatile reference read now. */
function snapshot(raw: unknown): Record<string, unknown> {
  const source = raw !== null && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(source)) out[key] = current(value)
  return out
}

/**
 * The thread service's view of the config: every key is a getter that reads the current value (a change made on the
 * Plugins page applies to the next read) and sanitizes it with `parseConfig`, so the form can never widen what a
 * profile patch could not. `threadsRoot` is read once, as it was at load.
 * @param raw - the config dsh passed to the service (with Volatile references for volatile fields).
 * @param env - environment for the dev overrides of parseConfig.
 */
export function liveConfig(raw: unknown, env: Record<string, string | undefined>, onChange?: (key: string, value: unknown) => void): CoordinatorConfig {
  const fixed = parseConfig(snapshot(raw), env)
  const view = {} as CoordinatorConfig
  const last = new Map<string, string>(CONFIG_FIELDS.map(f => [f.key, JSON.stringify(fixed[f.key])]))
  for (const field of CONFIG_FIELDS) {
    const key = field.key
    if (!field.volatile) {
      Object.defineProperty(view, key, { value: fixed[key], enumerable: true })
      continue
    }
    Object.defineProperty(view, key, {
      enumerable: true,
      get: () => {
        const value = parseConfig(snapshot(raw), env)[key]
        const text = JSON.stringify(value)
        if (text !== last.get(key)) { last.set(key, text); onChange?.(key, value) }
        return value
      },
    })
  }
  return view
}

/**
 * Host entry: the `coordinator` service. It owns the thread service (thread sessions, status, notices, tools,
 * persistence) and exposes the Remote methods of the host/client contract.
 */
import { readFileSync, realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import { principalOf, Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import type {
  ArchiveCoordinatorRequest, ArchiveCoordinatorResult, CoordinatorInfo, CoordinatorState, CreateCoordinatorRequest, EnsureCoordinatorRequest, EnsureCoordinatorResult,
  DeleteCoordinatorRequest, DeleteCoordinatorResult, HostProblem, PingResult, RenameCoordinatorRequest, SetCoordinatorFolderRequest, SetExecutorPromptRequest, ThreadInfo, ThreadPermissionState,
} from './types.ts'
import { HOST_INJECT, type HostContext } from './host/dsh.ts'
import { type CoordinatorConfig } from './host/ids.ts'
import { buildConfigSchema, liveConfig, schemasteryFromDsh } from './host/config-schema.ts'
import { acquireLock, processDeps } from './host/lock.ts'
import { fillStatic } from './host/names.ts'
import { ThreadService } from './host/threads.ts'
import { watchAutoMode } from './host/auto-mode.ts'

export type * from './types.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    coordinator: CoordinatorService
  }
}

const packageDir = join(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Version of the running dsh: the launcher's DSH_CLIENT_VERSION, else a peer package resolved from dsh's own entry
 * script (not from this plugin, whose linked development copy has its own devDependency version).
 */
function dshVersion(): string {
  const fromEnv = process.env['DSH_CLIENT_VERSION']?.trim()
  if (fromEnv !== undefined && fromEnv !== '') return fromEnv
  try {
    const entry = process.argv[1]
    if (entry === undefined) return 'unknown'
    const file = createRequire(entry).resolve('@deepseek-ai/dsh-typert-protocol/package.json')
    return (JSON.parse(readFileSync(file, 'utf8')) as { version?: string }).version ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

/**
 * The service's Schemastery `Config`, built with dsh's own Schemastery (the copy dsh's Loader and Settings use, so
 * the `.volatile()` marks are read by the same code). Resolved from dsh's entry script only, as `dshVersion` does, and
 * only from inside dsh's installation (`schemasteryFromDsh`). Without it the plugin works as before, but the Plugins
 * page shows no settings.
 */
function configSchema(): unknown {
  const z = schemasteryFromDsh(process.argv[1], {
    resolve: (entry, id) => createRequire(entry).resolve(id),
    realpath: path => realpathSync(path),
    load: (entry, file) => createRequire(entry)(file),
  })
  return z === undefined ? undefined : buildConfigSchema(z)
}

/** The active dsh home. */
function dshHome(ctx: Context): string {
  const homePath = ctx.get('dshHomePath' as never) as ((...segments: string[]) => string) | undefined
  if (typeof homePath === 'function') return homePath()
  return process.env['DSH_HOME']?.trim() || join(homedir(), '.dsh')
}

function stateFile(ctx: Context): string {
  return join(dshHome(ctx), 'storages', 'dsh-coordinator', 'state.json')
}

/**
 * L5: Remote methods act only for the owner. dsh records a principal only for a caller other than the owner (a shared
 * viewer), and such a caller may read the state but not change it.
 */
function requireOwner(ctx: Context): void {
  const invocation = (ctx as unknown as { invocation?: unknown }).invocation
  if (principalOf(invocation as never) !== undefined) throw new Error('only the owner of this DeepSeek Harness can do this')
}

/** Role prompts with tool names and role nouns filled (names.ts); per-request placeholders stay for threads.ts. */
function loadPrompts(): { coordinator: string; thread: string } {
  return {
    coordinator: fillStatic(readFileSync(join(packageDir, 'prompts', 'coordinator.md'), 'utf8').trim()),
    thread: fillStatic(readFileSync(join(packageDir, 'prompts', 'thread.md'), 'utf8').trim()),
  }
}

/** An optional JSON parameter: a caller that leaves it out may hand the signal over in its place. */
function split<T>(request: T | undefined, signal: AbortSignal | undefined): [T | undefined, AbortSignal] {
  if (request instanceof AbortSignal) return [undefined, request]
  return [request, signal ?? new AbortController().signal]
}

export default class CoordinatorService extends TypertRemoteService {
  /** The plugin's settings for dsh's Plugins page (config-schema.ts); every field but `threadsRoot` is volatile. */
  static Config = configSchema()
  private readonly version = dshVersion()
  private readonly settings: CoordinatorConfig
  private threads: ThreadService | undefined
  /** Set when another process owns the coordinator state; this one stays disabled. */
  private problem: HostProblem | undefined

  constructor(ctx: Context, config?: unknown) {
    super(ctx, 'coordinator', { namespace: 'coordinator' })
    // dsh keeps ctx.logger output in an in-memory buffer only; the console line makes mounts visible in the
    // terminal running `dsh web`.
    const say = (message: string): void => {
      ctx.logger.info(message)
      console.info(`[dsh-coordinator] ${message}`)
    }
    // Live: a change saved on the Plugins page applies to the next read, sanitized like a profile patch (config-schema.ts).
    this.settings = liveConfig(config, process.env, (key, value) => { say(`setting ${key} is now ${JSON.stringify(value)}`) })
    say(`mounted (dsh ${this.version}); Remote namespace "coordinator" ready`)
    ctx.effect(() => () => { say('unmounted') }, 'dsh-coordinator: lifecycle log')
    watchAutoMode(ctx, say)
    const prompts = loadPrompts()
    const file = stateFile(ctx)
    // One dsh process per DSH_HOME drives the threads (lock.ts); another one stays disabled and says why.
    const lock = acquireLock(join(dirname(file), 'owner.lock'), processDeps())
    if (!lock.ok) {
      this.problem = {
        kind: 'locked',
        detail: `another DeepSeek Harness process (pid ${lock.holder.pid}) uses this dsh home and runs the coordinator; quit it to use the coordinator here. `
          + `If no other DeepSeek Harness is running, delete ${join(dirname(file), 'owner.lock')} and restart.`,
      }
      say(`disabled: ${this.problem.detail}`)
      return
    }
    ctx.effect(() => () => { lock.release() }, 'dsh-coordinator: owner lock')
    const home = dshHome(ctx)
    ctx.inject([...HOST_INJECT], (child) => {
      // A refused base for new coordinators (I7) is a `bad-root` problem the service reports itself; a coordinator
      // whose own folder is refused carries that on its record.
      this.threads = new ThreadService(child as HostContext, this.settings, file, prompts, { dshHome: home })
      child.effect(() => () => { this.threads = undefined }, 'dsh-coordinator: thread service handle')
    })
  }

  /** I8: which dsh services the thread service waits for, while it is not running. */
  private missingServices(): HostProblem {
    const missing = HOST_INJECT.filter((name) => {
      try {
        return this.ctx.get(name as never) === undefined
      } catch {
        return true
      }
    })
    return {
      kind: 'not-ready',
      detail: missing.length === 0
        ? 'the coordinator is starting'
        : `dsh services the coordinator needs are not loaded: ${missing.join(', ')}. Check that the profile still has them, then restart.`,
    }
  }

  private service(): ThreadService {
    if (this.problem !== undefined) throw new Error(this.problem.detail)
    if (this.threads === undefined) throw new Error(this.missingServices().detail)
    return this.threads
  }

  /** Report that the host side of the plugin is alive. */
  @Remote
  async ping(signal: AbortSignal): Promise<PingResult> {
    signal.throwIfAborted()
    return { ok: true, dshVersion: this.version, time: new Date().toISOString() }
  }

  /** Read the coordinators and the thread list; `revision` changes on every change. */
  @Remote
  async getState(signal: AbortSignal): Promise<CoordinatorState> {
    signal.throwIfAborted()
    if (this.threads !== undefined) return this.threads.getState()
    const problem = this.problem ?? this.missingServices()
    return { coordinators: [], threads: [], revision: 0, problem, problems: [problem] }
  }

  /**
   * Open a coordinator: the named one (reopening its chat when it is archived or gone), else the last used one, else
   * a new one.
   */
  @Remote
  async ensureCoordinator(request: EnsureCoordinatorRequest | undefined, signal: AbortSignal): Promise<EnsureCoordinatorResult> {
    const [value, abort] = split(request, signal)
    abort.throwIfAborted()
    requireOwner(this.ctx)
    return this.service().ensureCoordinator(value ?? {})
  }

  /** New coordinator: its own folder below the base, or `home` from the folder picker. */
  @Remote
  async createCoordinator(request: CreateCoordinatorRequest | undefined, signal: AbortSignal): Promise<EnsureCoordinatorResult> {
    const [value, abort] = split(request, signal)
    abort.throwIfAborted()
    requireOwner(this.ctx)
    return this.service().createCoordinator(value ?? {})
  }

  /** Change where a coordinator's new threads go; existing threads and the chat stay where they are. */
  @Remote
  async setCoordinatorFolder(request: SetCoordinatorFolderRequest, signal: AbortSignal): Promise<CoordinatorInfo> {
    signal.throwIfAborted()
    requireOwner(this.ctx)
    return this.service().setCoordinatorFolder(request ?? {})
  }

  /**
   * Set a coordinator's Executor prompt: the user's standing instructions every Executor Session it starts afterwards
   * gets. Empty text clears it. Only the owner may set it; no model tool can read or change it.
   */
  @Remote
  async setExecutorPrompt(request: SetExecutorPromptRequest, signal: AbortSignal): Promise<CoordinatorInfo> {
    signal.throwIfAborted()
    requireOwner(this.ctx)
    return this.service().setExecutorPrompt(request ?? {})
  }

  /** Rename a coordinator (its chat title and sidebar group follow; folders are never renamed). Owner only. */
  @Remote
  async renameCoordinator(request: RenameCoordinatorRequest, signal: AbortSignal): Promise<CoordinatorInfo> {
    signal.throwIfAborted()
    requireOwner(this.ctx)
    return this.service().renameCoordinator(request ?? {})
  }

  /** Archive a coordinator with its finished threads (`force` also stops working ones); optionally its sidebar Workspace. */
  @Remote
  async archiveCoordinator(request: ArchiveCoordinatorRequest, signal: AbortSignal): Promise<ArchiveCoordinatorResult> {
    signal.throwIfAborted()
    requireOwner(this.ctx)
    return this.service().archiveCoordinator(request ?? {})
  }

  /**
   * Forget an archived coordinator: its record and its archived rows leave the plugin state (Sessions, folders and files
   * stay). Refused while it is live. Owner only.
   */
  @Remote
  async deleteCoordinator(request: DeleteCoordinatorRequest, signal: AbortSignal): Promise<DeleteCoordinatorResult> {
    signal.throwIfAborted()
    requireOwner(this.ctx)
    return this.service().deleteCoordinator(request ?? {})
  }

  /** Remove a thread from the list and archive its dsh session (restorable from the sidebar). The folder is kept. */
  @Remote
  async archiveThread(id: string, signal: AbortSignal): Promise<void> {
    signal.throwIfAborted()
    requireOwner(this.ctx)
    await this.service().archiveThreadAsOwner(id)
  }

  /**
   * Set how new threads run: `auto` (auto review, no file sandbox) or `ask` (workspace-write, approvals to the user).
   * Any other value is refused. Applies to threads started afterwards and their team members.
   */
  @Remote
  async setThreadPermission(mode: string, signal: AbortSignal): Promise<ThreadPermissionState> {
    signal.throwIfAborted()
    requireOwner(this.ctx)
    return this.service().setThreadPermission(mode)
  }

  /**
   * The user's answer to a thread's folder confirmation: `once` starts it there, `always` also adds the folder to
   * the allowed folders, `deny` drops the thread. Only the owner may answer; no model tool can.
   */
  @Remote
  async confirmFolder(request: { id: string; decision: string }, signal: AbortSignal): Promise<{ id: string; started: boolean }> {
    signal.throwIfAborted()
    requireOwner(this.ctx)
    const value = (request ?? {}) as { id?: unknown; decision?: unknown }
    const result = await this.service().confirmFolder(value.id, value.decision)
    return 'denied' in result ? { id: result.denied, started: false } : { id: (result as ThreadInfo).id, started: true }
  }

  /** Remove a folder from the allowed folders. Returns the list. */
  @Remote
  async removeAllowedFolder(path: string, signal: AbortSignal): Promise<string[]> {
    signal.throwIfAborted()
    requireOwner(this.ctx)
    return this.service().removeAllowedFolder(path)
  }

  /** Resume a thread the spend guards paused. */
  @Remote
  async resumeThread(id: string, signal: AbortSignal): Promise<{ id: string }> {
    signal.throwIfAborted()
    requireOwner(this.ctx)
    return { id: this.service().resumeThread(id).id }
  }
}

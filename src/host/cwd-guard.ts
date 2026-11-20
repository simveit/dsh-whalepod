/**
 * The working-directory guard for `thread_start`, per calling coordinator. Pure apart from the injected filesystem
 * (`nodeGuardFs` is the real one, for the service).
 *
 * A thread's folder decides where it starts and, under `workspace-write`, where it may write. The coordinator
 * agent picks it, and the coordinator reads thread output that may carry planted instructions. So the folder is
 * checked here, in the host:
 *
 * 1. The path is made absolute and resolved through symlinks for the part that exists.
 * 2. Always refused: `/`, the home folder itself and its ancestors, any path with a segment that starts with a
 *    dot (`.ssh`, `.dsh`, `.config`, ...), system folders, `~/Library`, any coordinator home or a folder that contains
 *    one, a folder that contains the active dsh home or `~/.dsh` (or lies in one), and the calling coordinator's
 *    folder itself.
 *    Also refused: a path with a control character or a line break (S10), a folder inside another coordinator's
 *    home (S9), and a folder that contains any coordinator's folder (L2: it would put that coordinator's folder inside
 *    a delegated session's folder).
 * 3. Another live thread's folder (of any coordinator), a folder inside one, or a folder that contains one needs the
 *    user's confirmation (S5: containment, not only the exact folder).
 * 4. A folder strictly below the calling coordinator's folder is allowed only when the plugin created it for a thread
 *    (`pluginFolders`), or when it does not exist yet and its nearest existing ancestor is the coordinator's folder
 *    itself or a plugin-made folder (S5). Anything else below it is treated like an outside folder (step 5), with
 *    `why: 'existing'`: once the user points a coordinator at a folder like `~/dev`, "below the folder" would include
 *    their existing repositories, and a new child of such a repository lands inside it.
 * 5. Any other folder runs only when its real path is on the user's allowed-folders list (an entry covers its
 *    subfolders), or after the user confirms it (`confirm`): dsh's native approval card on the `executor_start` call,
 *    or the row buttons on the Orchestrator page when no chat answers. The real path is what the user confirms, so a
 *    symlink cannot redirect the thread to a folder they did not see. Whether the user typed the path does not matter:
 *    the confirmation is the boundary, the same way dsh asks before any other action that needs approval.
 */
import { readdirSync, realpathSync, statSync } from 'node:fs'
import { isAbsolute, join, resolve, sep } from 'node:path'

/** Filesystem access the guard needs; injected so tests run against a fake tree. */
export interface GuardFs {
  /** Resolve symlinks of an existing path; throws when the path does not exist. */
  realpath(path: string): string
  /**
   * The identity of the file or folder an existing path leads to (device and inode), symlinks followed; throws when
   * the path does not exist. Two spellings of one file give the same value. Without it the real path is the identity.
   */
  identity?(path: string): string
  /** The names in an existing folder; throws when it cannot be read. */
  list?(path: string): string[]
}

export interface GuardEnv {
  home: string
  /** The calling coordinator's folder, absolute: new thread folders go below it. */
  ownFolder?: string
  /** @deprecated the name of `ownFolder` before multiple coordinators; read when `ownFolder` is absent. */
  threadsRoot?: string
  fs: GuardFs
  /** Real paths on the user's allowed-folders list; each covers its subfolders. */
  allowed?: readonly string[]
  /** Real paths of live threads' folders, of every coordinator. */
  taken?: readonly string[]
  /** Real paths of every coordinator home (and a legacy `_coordinator`): never a thread folder, nor a folder above one. */
  coordinator?: readonly string[]
  /** The active dsh home and `~/.dsh`: a folder that contains one or lies in one is refused. */
  protectedRoots?: readonly string[]
  /** Real paths of folders the plugin created for threads; below the coordinator's folder they need no confirmation. */
  pluginFolders?: readonly string[]
  /** Real paths of every coordinator's folder: a thread folder that contains one is refused (L2). */
  coordinatorFolders?: readonly string[]
  /** Real paths of the other coordinators' homes: a thread folder inside one is refused (S9). */
  otherHomes?: readonly string[]
}

/**
 * The real filesystem, as the thread service uses it. The identity is device and inode; a filesystem that reports no
 * inode gets the real path instead.
 */
export const nodeGuardFs: GuardFs = {
  realpath: path => realpathSync.native(path),
  identity: (path) => {
    const stat = statSync(path, { bigint: true })
    return stat.ino === 0n ? `path:${realpathSync.native(path)}` : `${stat.dev}:${stat.ino}`
  },
  list: path => readdirSync(path),
}

/** C0 and C1 control characters, line and paragraph separators: never part of a folder path the plugin accepts (S10). */
const PATH_CONTROL = /[\u0000-\u001F\u007F-\u009F\u2028\u2029]/u

/** Whether a path contains a control character or a line break (S10). */
export function hasControl(path: string): boolean {
  return PATH_CONTROL.test(path)
}

/** Top-level folders that belong to the system on macOS and Linux. */
const SYSTEM_TOP = new Set([
  'Applications', 'Library', 'Network', 'System', 'Volumes', 'bin', 'boot', 'cores', 'dev', 'etc', 'lib', 'lib32',
  'lib64', 'libx32', 'mnt', 'nix', 'opt', 'private', 'proc', 'root', 'run', 'sbin', 'snap', 'srv', 'sys', 'tmp',
  'usr', 'var',
])

/** Folders below the home folder that are refused like system folders. */
const HOME_REFUSED = ['Library']

function segments(path: string): string[] {
  return path.split(sep).filter(s => s !== '')
}

/** Whether `child` is `parent` or below it (both absolute, normalised). */
export function isWithin(parent: string, child: string): boolean {
  return child === parent || child.startsWith(parent.endsWith(sep) ? parent : parent + sep)
}

/**
 * `~` and `~/x` to the home folder; other paths unchanged. The rest of the spelling is kept as written, as dsh's file
 * tools keep it: a `..` behind a symlink (`~/link/../x`) is still there for the caller to resolve the way the OS does.
 */
export function expandTilde(path: string, home: string): string {
  if (path === '~') return home
  if (path.startsWith('~/')) return `${home.endsWith(sep) ? home.slice(0, -1) : home}${path.slice(1)}`
  return path
}

/** Lexically normalised absolute form: `~` expanded, `.`/`..` collapsed, no trailing slash, NFC. */
export function lexical(path: string, home: string): string {
  return resolve(expandTilde(path.normalize('NFC'), home))
}

/** How many trailing segments `deepestExisting` tries one by one before it halves the rest. */
const TAIL_PROBES = 4

/**
 * The longest prefix of a path that exists: the count of its segments and what `probe` returned for it, or undefined
 * when not even the root answers. `probe` returns undefined (or throws) for a path that does not exist. The last few
 * prefixes are tried one by one, the usual case of a new file in a new folder. Above them the search halves the
 * range, because a prefix below a missing one is missing too. So a path with thousands of segments that do not exist
 * costs a few dozen lookups, not one per segment.
 */
export function deepestExisting<T>(parts: readonly string[], probe: (prefix: string) => T | undefined): { depth: number; value: T } | undefined {
  const at = (depth: number): T | undefined => {
    try {
      return probe(sep + parts.slice(0, depth).join(sep))
    } catch {
      return undefined
    }
  }
  const floor = Math.max(0, parts.length - TAIL_PROBES)
  for (let depth = parts.length; depth >= floor; depth--) {
    const value = at(depth)
    if (value !== undefined) return { depth, value }
  }
  if (floor === 0) return undefined
  const root = at(0)
  if (root === undefined) return undefined
  let low = { depth: 0, value: root }
  let high = floor
  while (high - low.depth > 1) {
    const depth = Math.floor((low.depth + high) / 2)
    const value = at(depth)
    if (value === undefined) high = depth
    else low = { depth, value }
  }
  return low
}

/**
 * Resolve symlinks of the longest existing prefix and append the rest, so a folder that does not exist yet is
 * still compared by where it would really be created.
 */
export function realResolve(path: string, fs: GuardFs): string {
  const parts = segments(path)
  const found = deepestExisting(parts, prefix => fs.realpath(prefix))
  if (found === undefined) return path
  const rest = parts.slice(found.depth)
  return rest.length === 0 ? found.value : join(found.value, ...rest)
}

/**
 * Why a resolved path is refused outright, or undefined when it is not.
 * @param path - absolute path, lexical or real.
 */
export function refusal(path: string, env: Pick<GuardEnv, 'home' | 'fs'>): string | undefined {
  const parts = segments(path)
  if (parts.length === 0) return 'the filesystem root is never used for Orchestrators or Executor Sessions'
  const homes = [lexical(env.home, env.home), realResolve(lexical(env.home, env.home), env.fs)]
  for (const home of homes) {
    if (path === home) return 'the home folder itself is never used for Orchestrators or Executor Sessions'
    if (isWithin(path, home)) return 'a folder that contains the home folder is never used for Orchestrators or Executor Sessions'
    for (const name of HOME_REFUSED) {
      if (isWithin(join(home, name), path)) return `${join('~', name)} is a system folder`
    }
  }
  if (parts.some(part => part.startsWith('.'))) return 'folders whose path has a segment starting with "." (such as .ssh or .config) are never used for Orchestrators or Executor Sessions'
  if (SYSTEM_TOP.has(parts[0]!) && !homes.some(home => isWithin(home, path))) return `/${parts[0]} is a system folder`
  return undefined
}

/**
 * Why a folder is refused because of the dsh home: it contains the active dsh home or `~/.dsh`, or lies in one.
 * @param path - absolute path, lexical or real.
 */
export function protectedProblem(path: string, roots: readonly string[], env: Pick<GuardEnv, 'home' | 'fs'>): string | undefined {
  for (const root of roots) {
    const forms = [...new Set([lexical(root, env.home), realResolve(lexical(root, env.home), env.fs)])]
    if (forms.some(form => isWithin(path, form))) return 'it contains the dsh home, which holds credentials and every Session log'
    if (forms.some(form => isWithin(form, path))) return 'it is inside the dsh home'
  }
  return undefined
}

/**
 * Why a folder may not be a coordinator's home or folder (design 3.5), or undefined: the hard refusals on the lexical
 * and the real path, the dsh home, and live threads' folders (a coordinator folder inside one would let threads nest).
 * The check that a home is not a Workspace with the user's own Sessions needs the registry and lives in threads.ts.
 */
export function coordinatorFolderProblem(path: string, env: Pick<GuardEnv, 'home' | 'fs' | 'protectedRoots' | 'taken'> & {
  /** Homes of the other coordinators (S9): a folder may not lie inside one or contain one; equal only when `sameHomeOk`. */
  otherHomes?: readonly string[]
  /** For a home: another coordinator may share it (adoption with "+" makes such pairs). */
  sameHomeOk?: boolean
  /** A folder that contains another coordinator's home is accepted (a re-check, where refusing would lock it out). */
  containsOk?: boolean
  /** Live executor folders of other coordinators (S9): a folder being set may not contain one. */
  othersExecutors?: readonly string[]
}): string | undefined {
  if (hasControl(path)) return 'the path contains a control character or a line break'
  const expanded = expandTilde(path.trim(), env.home)
  if (!isAbsolute(expanded)) return 'it is not an absolute path'
  const lex = lexical(path.trim(), env.home)
  const real = realResolve(lex, env.fs)
  if (hasControl(real)) return 'the folder it resolves to contains a control character or a line break'
  const refused = refusal(lex, env) ?? refusal(real, env)
  if (refused !== undefined) return refused
  const guarded = protectedProblem(lex, env.protectedRoots ?? [], env) ?? protectedProblem(real, env.protectedRoots ?? [], env)
  if (guarded !== undefined) return guarded
  if ((env.taken ?? []).some(folder => isWithin(folder, real))) return 'it is inside the folder of a delegated session'
  for (const other of env.otherHomes ?? []) {
    if (other === real) {
      if (env.sameHomeOk !== true) return 'it is another Orchestrator\'s home'
    } else if (isWithin(other, real)) {
      return 'it is inside another Orchestrator\'s home'
    } else if (isWithin(real, other) && env.containsOk !== true) {
      return 'it contains another Orchestrator\'s home'
    }
  }
  if ((env.othersExecutors ?? []).some(folder => isWithin(real, folder))) return 'it contains the folder of another Orchestrator\'s Executor Session'
  return undefined
}

/** Longest folder path taken for an Executor Session, in characters; the `cwd` argument of `executor_start` has the same bound (tools.ts). */
export const FOLDER_PATH_MAX = 1000

export type GuardResult =
  /** `threads-root`: a new or plugin-made folder below the calling coordinator's folder (the name is historical). */
  | { ok: true; path: string; reason: 'threads-root' | 'allowed' }
  /** The folder may be used only after the user confirms its real path. */
  | { ok: false; confirm: true; path: string; why: 'outside' | 'existing' | 'symlink' | 'thread-folder' | 'coordinator-folder' }
  | { ok: false; confirm?: undefined; error: string }

/**
 * Check one requested thread folder.
 * @param requested - the folder the coordinator asked for (absolute or `~` form).
 * @returns the real path to use, a confirmation the user must give for a real path, or an error message that tells
 * the coordinator how to proceed.
 */
export function checkThreadFolder(requested: string, env: GuardEnv): GuardResult {
  // First, before anything reads the path: the `cwd` argument has this bound in the tool, and a folder taken from the
  // Assignment's "Working directory:" line (up to the length of an Assignment) gets it here.
  if (requested.length > FOLDER_PATH_MAX) {
    return { ok: false, error: `cwd is ${requested.length} characters long, and a folder path may have at most ${FOLDER_PATH_MAX}. Omit cwd to get a new folder under your folder.` }
  }
  const trimmed = requested.trim()
  if (hasControl(trimmed)) return { ok: false, error: 'cwd contains a control character or a line break; ask the user which folder the work should happen in' }
  const expanded = expandTilde(trimmed, env.home)
  if (!isAbsolute(expanded)) return { ok: false, error: `cwd must be an absolute path (got "${trimmed}"). Omit cwd to get a new folder under your folder.` }
  const lex = lexical(trimmed, env.home)
  const real = realResolve(lex, env.fs)
  if (hasControl(real)) return { ok: false, error: `cwd "${trimmed}" is refused: the folder it resolves to contains a control character or a line break. Ask the user which folder the work should happen in.` }
  const refused = refusal(lex, env) ?? refusal(real, env)
    ?? protectedProblem(lex, env.protectedRoots ?? [], env) ?? protectedProblem(real, env.protectedRoots ?? [], env)
  if (refused !== undefined) {
    return { ok: false, error: `cwd "${trimmed}" is refused: ${refused}. Omit cwd to get a new folder under your folder, or ask the user which folder the work should happen in.` }
  }
  const homes = env.coordinator ?? []
  if (homes.some(home => isWithin(real, home) || isWithin(lex, home))) {
    return { ok: false, error: `cwd "${trimmed}" is refused: it is an Orchestrator's own folder or contains one. Omit cwd to get a new folder under your folder.` }
  }
  const folder = env.ownFolder ?? env.threadsRoot
  if (folder === undefined) return { ok: false, error: 'this Orchestrator has no folder; ask the user to set one on the Orchestrator page' }
  const rootLex = lexical(folder, env.home)
  const rootReal = realResolve(rootLex, env.fs)
  if (real === rootReal || lex === rootLex) {
    return { ok: false, error: 'cwd must not be your folder itself; omit cwd to get a new folder below it.' }
  }
  if ((env.otherHomes ?? []).some(other => isWithin(other, real) || isWithin(other, lex))) {
    return { ok: false, error: `cwd "${trimmed}" is refused: it is inside another Orchestrator's home. Omit cwd to get a new folder under your folder.` }
  }
  if ((env.coordinatorFolders ?? []).some(other => isWithin(real, other) || isWithin(lex, other))) {
    return { ok: false, error: `cwd "${trimmed}" is refused: it contains an Orchestrator's folder. Omit cwd to get a new folder under your folder, or ask the user for a folder below it.` }
  }
  if ((env.taken ?? []).some(folder => isWithin(folder, real) || isWithin(real, folder))) return { ok: false, confirm: true, path: real, why: 'thread-folder' }
  let below = false
  if (isWithin(rootReal, real)) {
    const plugin = env.pluginFolders ?? []
    if (plugin.includes(real)) return { ok: true, path: real, reason: 'threads-root' }
    if (!exists(real, env.fs)) {
      const ancestor = nearestExisting(real, env.fs)
      if (ancestor === rootReal || plugin.includes(ancestor)) return { ok: true, path: real, reason: 'threads-root' }
    }
    below = true
  }
  if ((env.allowed ?? []).some(entry => isWithin(entry, real))) return { ok: true, path: real, reason: 'allowed' }
  return { ok: false, confirm: true, path: real, why: lex !== real ? 'symlink' : below ? 'existing' : 'outside' }
}

/**
 * The longest existing ancestor of a path that does not exist (its real path), or `/`. Found with `deepestExisting`,
 * so a path of thousands of segments costs a few dozen lookups.
 */
function nearestExisting(path: string, fs: GuardFs): string {
  return deepestExisting(segments(path).slice(0, -1), prefix => fs.realpath(prefix))?.value ?? sep
}

/** Whether a resolved path exists (its real path resolves). */
function exists(path: string, fs: GuardFs): boolean {
  try {
    fs.realpath(path)
    return true
  } catch {
    return false
  }
}

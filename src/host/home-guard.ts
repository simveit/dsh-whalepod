/**
 * The guard for the plugin's own state folder. Pure apart from the injected filesystem.
 *
 * `<dsh home>/storages/dsh-coordinator` holds the state file (coordinator records with their Executor prompts,
 * memories and model settings, the executor table), its version 1 copy and the owner lock. The plugin gives this data
 * its own access rules (the memory tools, the owner-only Remote methods, scoping per coordinator), which dsh cannot
 * know. So the thread service runs this check for every tool call of a coordinator-like chat and of every agent in
 * an executor's tree (lead, team members, subagents) and denies a call that targets the folder:
 *
 * - Path arguments (`file_path`, `path`, `workdir`, `cd`, ...) and the file lines of a patch text (`apply_patch`) are
 *   resolved against the agent's folders the way the operating system walks them (symlinks, a symlink followed by
 *   `..`, `~` kept as written until then). The result is compared with the state folder twice: as a string, which
 *   also covers a path that does not exist yet, and by file identity (device and inode) of the deepest part that
 *   exists and of every folder above it. The identity does not depend on the spelling, so a second name of the same
 *   folder (the macOS data-volume alias `/System/Volumes/Data/...`, another letter case, a volfs path) is refused too.
 * - A search tool is also refused on a folder above the state folder, since a recursive search there reads into it.
 *   Where a search starts is read from the one argument dsh's search tools take it from (`path`, see `searchRoot`):
 *   a search without it starts in the Session's working directory and is refused when that is such a folder,
 *   whatever else the call carries. Any call is refused while the working directory is inside the state folder.
 * - Every other string argument (a shell command, terminal input, an MCP argument) is searched for the state folder
 *   in its common spellings: absolute, `~/...`, `$HOME/...`, `${HOME}/...`, a relative path from the agent's
 *   folders, and `storages/dsh-coordinator` or one of its files after any prefix, glob forms included, in any letter
 *   case. This text check is best effort: a determined agent can spell a path in ways it does not recognise.
 * - A call with more arguments than the check reads (`MAX_STRINGS`, `MAX_PATHS`, `MAX_READINGS`, `MAX_DEPTH`) is
 *   refused: the check never passes a call it has not read in full. So is a call of one of dsh's file and search
 *   tools (`FILE_TOOLS`) with a path the check cannot resolve: one with a NUL character, or a one-line path that is
 *   still longer than `PATH_MAX_CHARS` after it is shortened the way dsh shortens it. For any other tool the readings
 *   of such a value that no operating system opens are left out, and the value gets the text check.
 *
 * Nothing else under the dsh home is refused here (decision 70). Skills, Session logs, profiles and the credentials
 * file are dsh's, and dsh treats a coordinator or an Executor Session there like any other Session.
 */
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deepestExisting, expandTilde, isWithin, lexical, realResolve, type GuardFs } from './cwd-guard.ts'
import { allSpellings, TOOL, type ToolKey } from './names.ts'

export interface StateGuardEnv {
  /** The user's home folder. */
  home: string
  /** Protected roots (absolute): the folder of the state file, and `storages/dsh-coordinator` of each dsh home. */
  roots: readonly string[]
  fs: GuardFs
}

/** One tool call as the guard sees it. */
export interface GuardedCall {
  name: string
  args: unknown
  /** Folders relative paths resolve against: the Session's header cwd and its working directory. */
  cwds: readonly string[]
}

export interface GuardDenial {
  /**
   * `not-allowed`: a coordinator-like chat called a tool outside its allow list (threads.ts). `too-large`: the call
   * has more arguments than the state-folder check reads, so it is refused unread. `bad-path`: a path argument of a
   * file or search tool that the check cannot resolve (a NUL character, or too long for any operating system),
   * refused for the same reason.
   */
  kind: 'plugin-state' | 'plugin-tool' | 'not-allowed' | 'too-large' | 'bad-path'
  /** What matched, for the log (never shown to the model). */
  match: string
  /** `plugin-state` only: a search that starts above the state folder, not a call that names it. */
  above?: true
  /** `plugin-state` only: the Session's working directory decided it (a search without a path, or a call made inside the folder). */
  cwd?: true
}

/** The most strings one call may carry. A model's call stays far below it; beyond it the call is refused unread. */
export const MAX_STRINGS = 100_000
/** The most path arguments (and patch file lines) of one call: each costs filesystem lookups. */
export const MAX_PATHS = 2_000
/**
 * The most readings of the paths of one call. A path is resolved once for every way it can be meant (as written,
 * without the blanks around it, in the other Unicode form, with `~` replaced, as a `file:` URL) and, when it is
 * relative, once from each working directory. An ordinary path has one reading or one per working directory, so
 * this allows `MAX_PATHS` relative paths from two working directories. It bounds the lookups of a call whose paths
 * are written to have many readings each.
 */
export const MAX_READINGS = 2 * MAX_PATHS
/** The deepest nesting of arrays and objects in the arguments. */
export const MAX_DEPTH = 64
/**
 * No operating system opens a longer path (PATH_MAX is 1024 on macOS and 4096 on Linux). The limit applies to the
 * path after `resolve()`, not to the argument: dsh shortens a path that way before it opens it, so a long spelling
 * (`/././...`, doubled slashes) of a short path is still a path.
 */
export const PATH_MAX_CHARS = 4096

/** Tools that only carry text for people or other agents and never touch files: their text is not searched. */
const TEXT_ONLY = new Set([
  // The plugin's own tools, under their current and their earlier names.
  ...allSpellings(Object.keys(TOOL) as ToolKey[]),
  'ask_user_question', 'todo_write', 'web_search',
  'team_task_create', 'team_task_get', 'team_task_list', 'team_task_update', 'send_message', 'list_agents',
  'create_goal', 'get_goal', 'update_goal',
])

/** Argument keys that hold a path. */
const PATH_KEYS = new Set([
  'file_path', 'filepath', 'filePath', 'path', 'paths', 'file', 'files', 'filename', 'dir', 'directory', 'folder',
  'cwd', 'cd', 'workdir', 'working_directory', 'workingDirectory', 'root', 'target', 'source', 'destination', 'dest',
  'src', 'dst', 'from', 'to', 'notebook_path', 'output', 'output_path', 'input', 'input_path', 'uri',
])

/** Tools whose every string argument is a folder to enter, whatever its key (dsh: `working_directory({ cd })`). */
const PATH_ONLY_TOOLS = new Set(['working_directory'])

/** Arguments that hold the text a write tool puts into a file: data, not an access, so they are not searched. */
const CONTENT_KEYS = new Set(['content', 'contents', 'new_string', 'old_string', 'text', 'body', 'data'])

/** Tools that read a whole tree below their path argument, or below the working directory when they get none. */
const SEARCH_TOOLS = new Set(['glob', 'grep', 'ls', 'list', 'list_directory', 'find', 'tree', 'search'])

/**
 * Other names of the folder that holds a volume's data. On macOS every path of the data volume also answers under
 * `/System/Volumes/Data` (a firmlink, which `realpath` does not resolve), so a search may start in a folder that is
 * above the state folder only through that name.
 */
const VOLUME_ALIASES = ['/System/Volumes/Data']

/** Tools that write files through a path argument. */
const WRITE_TOOLS = new Set(['write', 'edit', 'apply_patch', 'multi_edit', 'str_replace_editor', 'str_replace_based_edit_tool', 'notebook_edit', 'create_file'])
const WRITE_NAME = /(?:^|_)(?:write|edit|patch|create|save|delete|remove|move|copy|rename|mkdir|append)(?:_|$)/i

/** Tools that read files through a path argument. */
const READ_TOOLS = new Set(['read', 'read_image', 'read_file', 'view', 'view_image', 'notebook_read'])

/**
 * dsh's own file and search tools, by name: the tools whose path argument dsh resolves and opens. Only for them is a
 * path the check cannot resolve (a NUL character, or one line still longer than `PATH_MAX_CHARS`) refused with
 * `bad-path`. For every other tool (a shell, an MCP tool) such a value under a path-like key is skipped as a path,
 * since `input`, `source`, `from`, `to` and `output` there often hold ordinary long text. Skipping is safe: no
 * operating system opens a path longer than PATH_MAX or one with a NUL, so the value cannot lead to the state folder
 * as a path, whichever tool gets it, and it still gets the text check like any other string. The name pattern
 * `WRITE_NAME` is left out on purpose: it also matches MCP tools such as `create_issue`.
 */
const FILE_TOOLS = new Set([...READ_TOOLS, ...WRITE_TOOLS, ...SEARCH_TOOLS, ...PATH_ONLY_TOOLS])

/** Characters that may continue a file-name segment; anything else (or a glob character) ends the path there. */
const NAME_CHAR = /[A-Za-z0-9._\-+@~%]/

/** Lexical and real forms of each protected root, without duplicates. */
export function protectedForms(env: Pick<StateGuardEnv, 'roots' | 'home' | 'fs'>): string[] {
  const out = new Set<string>()
  for (const root of env.roots) {
    const lex = lexical(root, env.home)
    out.add(lex)
    out.add(realResolve(lex, env.fs))
  }
  return [...out].filter(form => form !== sep)
}

/** Whether `text` contains `needle` as a whole path: not glued to a longer name on either side. */
function containsPath(text: string, needle: string, needLeadingBoundary: boolean): boolean {
  if (needle === '') return false
  let from = 0
  while (true) {
    const at = text.indexOf(needle, from)
    if (at < 0) return false
    const before = at === 0 ? '' : text[at - 1]!
    const after = text[at + needle.length] ?? ''
    const leadOk = !needLeadingBoundary || before === '' || !NAME_CHAR.test(before) || before === '~'
    // A glob character right after the root (`.../dsh-coordinator*`) may still match it.
    if (leadOk && (after === '' || !NAME_CHAR.test(after))) return true
    from = at + 1
  }
}

/** Spellings of the protected roots in free text, for the agent's folders. */
export function textSpellings(env: Pick<StateGuardEnv, 'roots' | 'home' | 'fs'>, cwds: readonly string[]): { paths: string[]; relatives: string[] } {
  const forms = protectedForms(env)
  const homes = [...new Set([lexical(env.home, env.home), realResolve(lexical(env.home, env.home), env.fs)])]
  const paths = new Set<string>()
  const relatives = new Set<string>()
  for (const form of forms) {
    paths.add(form)
    for (const home of homes) {
      if (form !== home && isWithin(home, form)) {
        const rel = relative(home, form)
        for (const prefix of ['~/', '$HOME/', '${HOME}/', '"$HOME"/', '"${HOME}"/']) paths.add(prefix + rel)
      }
    }
    for (const cwd of cwds) {
      // From the folder as it is named and as it resolves (a working directory may be a symlink).
      for (const base of new Set([lexical(cwd, env.home), realResolve(lexical(cwd, env.home), env.fs)])) {
        const rel = relative(base, form)
        if (rel !== '' && !isAbsolute(rel)) relatives.add(rel)
      }
    }
  }
  return { paths: [...paths], relatives: [...relatives] }
}

const STATE_NAME = 'dsh-coordinator'
const STATE_FILES = ['state.json', 'state.v1.json', 'owner.lock']

/** All positions of `needle` in `text` from `from` on. */
function* positions(text: string, needle: string, from = 0): Generator<number> {
  for (let at = text.indexOf(needle, from); at >= 0; at = text.indexOf(needle, at + 1)) yield at
}

/** The start of the run of characters from `chars` that ends before `end`. */
function runStart(text: string, end: number, chars: string): number {
  let at = end
  while (at > 0 && chars.includes(text[at - 1]!)) at--
  return at
}

/**
 * `storages`, separators or glob characters, optionally more of the same word that ends in a separator or `*`, then
 * the folder's name, not glued to a longer name. As a pattern:
 * `storages[\\/*?[\]{}]+(?:[^\s'"`]*[\\/*])?dsh-coordinator(?![a-z0-9_.-]*[a-z0-9_])`.
 */
function wordNamesFolder(word: string): boolean {
  const SEPS = '\\/*?[]{}'
  let first = -1
  for (const at of positions(word, 'storages')) {
    if (at + 8 < word.length && SEPS.includes(word[at + 8]!)) { first = at; break }
  }
  if (first < 0) return false
  for (const at of positions(word, STATE_NAME, first + 9)) {
    // Not the start of a longer name: only dots and hyphens may follow before the name run ends.
    let end = at + STATE_NAME.length
    while (word[end] === '.' || word[end] === '-') end++
    if (end < word.length && /[a-z0-9_]/.test(word[end]!)) continue
    if ('\\/*'.includes(word[at - 1]!)) return true
    const run = runStart(word, at, SEPS)
    if (run < at && word.startsWith('storages', run - 8) && run >= 8) return true
  }
  return false
}

/**
 * The folder's name, separators or `*` and `?`, optionally one more path segment, then one of its files. As a
 * pattern: `dsh-coordinator[\\/*?]+(?:[^\s'"`/\\]*[\\/])?(?:state(?:\.v1)?\.json|owner\.lock)`.
 */
function wordNamesFile(word: string): boolean {
  if (!word.includes(STATE_NAME)) return false
  const after = (end: number): boolean => {
    const run = runStart(word, end, '\\/*?')
    return run < end && run >= STATE_NAME.length && word.startsWith(STATE_NAME, run - STATE_NAME.length)
  }
  for (const file of STATE_FILES) {
    for (const at of positions(word, file)) {
      if (after(at)) return true
      if (at === 0 || !'\\/'.includes(word[at - 1]!)) continue
      // One segment between the name and the file: the name with a `*` or `?` behind it lies in that segment, or
      // ends right before it.
      let start = at - 1
      while (start > 0 && !'\\/'.includes(word[start - 1]!)) start--
      if (after(start)) return true
      // Only that segment is searched for the name. A search that ran on to the end of the word would cost the
      // square of its length for a word of many files with the name far behind them.
      const segment = word.slice(start, at - 1)
      for (const name of positions(segment, STATE_NAME)) {
        const next = segment[name + STATE_NAME.length]
        if (next === '*' || next === '?') return true
      }
    }
  }
  return false
}

/**
 * Spellings of the state folder that do not start at a known root (S7): after any prefix (`$DSH_HOME/storages/
 * dsh-coordinator`, a `cd` into the dsh home first) and through a find or glob pattern
 * (`-path '*storages/dsh-coordinator/state.json'`, `dsh-coordinator/owner.lock` behind a `**`). The text is read word
 * by word (a word ends at a blank or a quote) in one pass, so the cost grows with the length of the text and not
 * with its square, as it did when these were two patterns with an open-ended middle.
 * @param text - folded text.
 */
export function innerMatch(text: string): string | undefined {
  let file = false
  for (const [word] of text.matchAll(/[^\s'"`]+/g)) {
    if (!word.includes(STATE_NAME)) continue
    if (wordNamesFolder(word)) return 'storages/dsh-coordinator'
    file ||= wordNamesFile(word)
  }
  return file ? 'dsh-coordinator state file' : undefined
}

/**
 * One spelling for every letter case and Unicode form of a name. The usual macOS and Windows volumes open
 * `DSH-Coordinator` as `dsh-coordinator`, so text and file names are compared in this form; on a volume that tells
 * the cases apart this refuses a few more spellings than it must, never fewer.
 */
function fold(text: string): string {
  return text.normalize('NFKC').toUpperCase().toLowerCase()
}

/** A matcher for free text against the protected roots, built once per tool call. */
export function textMatcher(env: Pick<StateGuardEnv, 'roots' | 'home' | 'fs'>, cwds: readonly string[]): (text: string) => string | undefined {
  const spellings = textSpellings(env, cwds)
  const paths = spellings.paths.map(path => ({ shown: path, folded: fold(path) }))
  const relatives = spellings.relatives.map(path => ({ shown: path, folded: fold(path) }))
  const hints = [...new Set(['dsh-coordinator', ...protectedForms(env).map(form => fold(form.split(sep).at(-1) ?? '')).filter(base => base !== '')])]
  return (raw) => {
    const text = fold(raw)
    // Cheap pre-filter: every spelling contains the state folder's name.
    if (!hints.some(hint => text.includes(hint))) return undefined
    // An absolute or home-relative spelling must start a path: `/x/Users/me/.dsh/...` is not `/Users/me/.dsh/...`.
    for (const path of paths) if (containsPath(text, path.folded, true)) return path.shown
    for (const rel of relatives) if (containsPath(text, rel.folded, true)) return rel.shown
    return innerMatch(text)
  }
}

/** Whether free text names a protected root; returns the spelling that matched. */
export function textMatch(text: string, env: Pick<StateGuardEnv, 'roots' | 'home' | 'fs'>, cwds: readonly string[]): string | undefined {
  return textMatcher(env, cwds)(text)
}

/**
 * The path as the operating system walks it: a symlink is followed before the `..` behind it is applied, so
 * `link/../x` is a sibling of the link's target, not of the link.
 */
function physical(absolute: string, fs: GuardFs): string {
  // One lookup per part that exists and one for the first part that does not: the parts behind a missing one are
  // only names, and a `..` there takes the last name away again.
  let real: string = sep
  const missing: string[] = []
  for (const part of absolute.split(sep)) {
    if (part === '' || part === '.') continue
    if (part === '..') {
      if (missing.length > 0) missing.pop()
      else real = dirname(real)
    } else if (missing.length > 0) {
      missing.push(part)
    } else {
      try {
        real = fs.realpath(join(real, part))
      } catch {
        missing.push(part)
      }
    }
  }
  return missing.length === 0 ? real : join(real, ...missing)
}

/** One path argument resolved against the agent's folders. */
interface Candidates {
  /** Absolute forms without `.` or `..`: lexical, real and (with a `..`) physical. Compared as strings and by identity. */
  forms: string[]
  /** Absolute spellings as written, for a path with `..`, `.` or doubled separators: the OS resolves them, so they are compared by identity only. */
  raws: string[]
  /** How many readings were resolved against the filesystem (`MAX_READINGS`). */
  readings: number
  /** Why the argument cannot be resolved at all (the call is then refused), or undefined. */
  unreadable?: string
}

/**
 * The ways one spelling of a path argument is read, by dsh's tools and by others. Each of them is resolved, because
 * the guard cannot know which one the tool that gets the value will open:
 *
 * - As written. ripgrep gets the `path` of `glob` and `grep` this way (dsh-tool-fs-search), so `~/x` is the folder
 *   `~` in the working directory there. dsh's file tools keep everything but a leading `~` (next point), so
 *   `file://link/x` is for them the relative path `file:/link/x`: a folder named `file:` in the working directory.
 * - With a leading `~` or `~/` replaced by the home folder, as dsh's file tools do (`expandHomePrefix` in
 *   dsh-fs-local) and nothing else in dsh does.
 * - As a `file:` URL, for a tool of another plugin or an MCP server that takes one: without `file://`, without
 *   `file:`, and as the path the URL stands for (percent escapes decoded).
 */
function readings(spelling: string, home: string): string[] {
  const out = new Set([spelling, expandTilde(spelling, home)])
  if (/^file:/i.test(spelling)) {
    for (const bare of [spelling.replace(/^file:\/\//i, ''), spelling.replace(/^file:/i, '')]) {
      out.add(bare)
      out.add(expandTilde(bare, home))
    }
    try {
      out.add(fileURLToPath(spelling))
    } catch {
      // Not a URL a path can be read from; the other readings stand.
    }
  }
  return [...out].filter(reading => reading.trim() !== '')
}

/**
 * Resolve one path argument against the agent's folders. dsh's file tools hand a path to the operating system as it
 * is written (no trim, `~` replaced by the home folder, `..` left for the OS), while other tools may trim it or
 * normalise its Unicode form first, so each of these spellings is resolved, in each of its `readings`. A path
 * without `..` dsh shortens with `resolve()` before it opens it, so the length that counts is the resolved one: a
 * reading that is still longer than `PATH_MAX_CHARS` opens nothing. Such a one-line argument is reported as
 * unreadable, and so is one with a NUL character (`checkCall` refuses it for a file tool; for any other tool the
 * readings that are short enough are still checked); text of several lines under a path key (a patch under `input`)
 * is not reported, and its file lines are checked one by one.
 */
function candidates(value: string, cwds: readonly string[], env: Pick<StateGuardEnv, 'home' | 'fs'>): Candidates {
  const forms = new Set<string>()
  const raws = new Set<string>()
  if (value.includes('\0')) return { forms: [], raws: [], readings: 0, unreadable: 'a path with a NUL character' }
  let long = false
  const done = new Set<string>()
  for (const spelling of new Set([value, value.trim(), value.normalize('NFC'), value.trim().normalize('NFC')])) {
    for (const reading of readings(spelling, env.home)) {
      const bases = isAbsolute(reading) ? [''] : cwds.length > 0 ? cwds : [env.home]
      for (const base of bases) {
        const raw = base === '' ? reading : lexical(base, env.home) + sep + reading
        if (done.has(raw)) continue
        done.add(raw)
        const lex = resolve(raw)
        if (lex.length > PATH_MAX_CHARS) {
          long = true
          continue
        }
        forms.add(lex)
        forms.add(realResolve(lex, env.fs))
        if (raw.split(sep).includes('..')) forms.add(physical(raw, env.fs))
        if (raw !== lex) raws.add(raw)
      }
    }
  }
  const unreadable = long && !/[\r\n]/.test(value) ? `a path longer than ${PATH_MAX_CHARS} characters` : undefined
  return { forms: [...forms], raws: [...raws].filter(raw => !forms.has(raw)), readings: done.size, unreadable }
}

/**
 * The folder a search starts in, as the call names it, or undefined when it names none and so starts in the
 * Session's working directory. dsh's search tools, `glob` and `grep`, read it from the argument `path` and from no
 * other (`parseGlobArgs` and `parseGrepArgs` in dsh-tool-fs-search; neither has a second name for it), and both
 * refuse a blank one. No other argument counts, however much it looks like a path: `include`, the pattern, an
 * argument the tool does not declare (dsh ignores those) and a patch file line inside any of them leave the search
 * where it was. A tool of another plugin under one of the other names in `SEARCH_TOOLS` is read the same way. If it
 * takes its root under another key, that path is still checked as a path, and the working directory is checked as
 * well: such a call is refused more often than it must be, never less.
 */
function searchRoot(args: unknown): string | undefined {
  if (args === null || typeof args !== 'object' || Array.isArray(args) || !Object.hasOwn(args, 'path')) return undefined
  const path = (args as Record<string, unknown>)['path']
  return typeof path === 'string' && path.trim() !== '' ? path : undefined
}

/**
 * File paths a patch text names, in the form dsh's `apply_patch` reads (`*** Add File: p`, `*** Update File: p`,
 * `*** Delete File: p`, `*** Move to: p`). The match is looser than dsh's parser (leading blanks, any letter case),
 * so a line dsh would reject is still checked.
 */
export function patchPaths(text: string): string[] {
  if (!text.includes('***')) return []
  const out: string[] = []
  for (const match of text.matchAll(/^[ \t]*\*\*\*[ \t]*(?:Add File|Update File|Delete File|Move to)[ \t]*:[ \t]?([^\r\n]*)/gimu)) {
    if (match[1]!.trim() !== '') out.push(match[1]!)
  }
  return out
}

/**
 * Every string inside a JSON value, with the key it sits under (the nearest object key for array items).
 * @returns false when the value holds more strings or deeper nesting than the check reads; `out` is then incomplete.
 */
function strings(value: unknown, key: string | undefined, out: { key: string | undefined; value: string }[], depth = 0): boolean {
  if (typeof value === 'string') {
    if (out.length >= MAX_STRINGS) return false
    out.push({ key, value })
    return true
  }
  if (value === null || typeof value !== 'object') return true
  if (depth >= MAX_DEPTH) return false
  if (Array.isArray(value)) return value.every(item => strings(item, key, out, depth + 1))
  return Object.entries(value as Record<string, unknown>).every(([k, v]) => strings(v, k, out, depth + 1))
}

/** Whether a tool writes files through its path arguments. */
export function isWriteTool(name: string): boolean {
  return WRITE_TOOLS.has(name) || WRITE_NAME.test(name)
}

// --- File identity ------------------------------------------------------------------------------------------------

/** The identity of what an existing path leads to (GuardFs.identity, else its real path), or undefined when nothing is there. */
function identityOf(path: string, fs: GuardFs): string | undefined {
  try {
    return fs.identity !== undefined ? fs.identity(path) : fs.realpath(path)
  } catch {
    return undefined
  }
}

/** The path of the first `count` segments. */
function prefix(parts: readonly string[], count: number): string {
  return sep + parts.slice(0, count).join(sep)
}

/** What the state folders are on disk, read once per tool call. */
interface StateIdentity {
  /** Identities of the state folders that exist. */
  folders: Set<string>
  /** Identities of the files and folders directly in one: a hard link or a volfs path to one of them is that file. */
  entries: Set<string>
  /** Identities of every folder above a state folder, under each name the folder has. */
  above: Set<string>
  /** A state folder that does not exist yet: the identity of its deepest existing folder and the names below it (folded). */
  pending: { anchor: string; rest: string[] }[]
}

/**
 * Read what the state folders are on disk.
 * @param forms - the lexical and real forms of each protected root.
 */
function stateIdentity(forms: readonly string[], fs: GuardFs): StateIdentity {
  const out: StateIdentity = { folders: new Set(), entries: new Set(), above: new Set(), pending: [] }
  for (const form of forms) {
    const parts = form.split(sep).filter(part => part !== '')
    let depth = parts.length
    let id: string | undefined
    for (; depth >= 0; depth--) {
      id = identityOf(prefix(parts, depth), fs)
      if (id !== undefined) break
    }
    if (id === undefined) continue
    const existing = prefix(parts, depth)
    if (depth === parts.length) {
      out.folders.add(id)
      let names: string[] = []
      try { names = fs.list?.(existing) ?? [] } catch { names = [] }
      for (const name of names.slice(0, 256)) {
        const entry = identityOf(join(existing, name), fs)
        if (entry !== undefined) out.entries.add(entry)
      }
    } else {
      out.pending.push({ anchor: id, rest: parts.slice(depth).map(fold) })
      out.above.add(id)
    }
    for (const spelling of [existing, ...VOLUME_ALIASES.map(alias => alias + existing).filter(alias => identityOf(alias, fs) === id)]) {
      const names = spelling.split(sep).filter(part => part !== '')
      for (let i = names.length - 1; i >= 0; i--) {
        const ancestor = identityOf(prefix(names, i), fs)
        if (ancestor !== undefined) out.above.add(ancestor)
      }
    }
  }
  for (const id of out.folders) out.above.delete(id)
  return out
}

/**
 * The identities of an existing path and of every folder above it, nearest first, each with the names that lead from
 * it down to the path (unknown where the OS gives no real path, as for a macOS volfs path `/.vol/<device>/<inode>`;
 * its parents are then asked for one `..` at a time).
 */
function ancestry(existing: string, id: string, fs: GuardFs): { id: string; below: string[] | undefined }[] {
  let real: string | undefined
  try { real = fs.realpath(existing) } catch { real = undefined }
  const out: { id: string; below: string[] | undefined }[] = [{ id, below: [] }]
  if (real !== undefined && !real.split(sep).includes('..')) {
    const names = real.split(sep).filter(part => part !== '')
    for (let i = names.length - 1; i >= 0; i--) {
      const ancestor = identityOf(prefix(names, i), fs)
      if (ancestor !== undefined) out.push({ id: ancestor, below: names.slice(i) })
    }
    return out
  }
  let current = existing
  let last = id
  for (let step = 0; step < MAX_DEPTH; step++) {
    current += `${sep}..`
    const parent = identityOf(current, fs)
    if (parent === undefined || parent === last) break
    out.push({ id: parent, below: undefined })
    last = parent
  }
  return out
}

/**
 * Compare one absolute path with the state folders by file identity: the deepest part of the path that exists is
 * resolved by the operating system, whatever its spelling, and it and the folders above it are compared with the
 * state folders. A part that does not exist yet is compared by name with a state folder that does not exist yet.
 * @returns `within` (the path is a state folder or in one), `above` (it is a folder that contains one), or undefined.
 */
function identityMatch(path: string, state: StateIdentity, fs: GuardFs): 'within' | 'above' | undefined {
  const parts = path.split(sep).filter(part => part !== '')
  const found = deepestExisting(parts, at => identityOf(at, fs))
  if (found === undefined) return undefined
  const { depth, value: id } = found
  const existing = prefix(parts, depth)
  const rest = parts.slice(depth).filter(part => part !== '.')
  // A `..` behind a part that does not exist: the lexical and physical forms of the path decide.
  if (rest.includes('..')) return undefined
  if (rest.length === 0 && state.entries.has(id)) return 'within'
  for (const { id: ancestor, below } of ancestry(existing, id, fs)) {
    if (state.folders.has(ancestor)) return 'within'
    if (below === undefined) continue
    // The names that lead on from this folder, compared with a state folder that is still to be made below it. Only
    // as many names as that folder has are folded: folding every name of a long path for every folder above it was
    // most of what a path of many parts cost.
    const nameAt = (i: number): string | undefined => (i < below.length ? below[i] : rest[i - below.length])
    if (state.pending.some(p => p.anchor === ancestor && p.rest.every((name, i) => { const at = nameAt(i); return at !== undefined && fold(at) === name }))) return 'within'
  }
  return rest.length === 0 && state.above.has(id) ? 'above' : undefined
}

/**
 * Check one tool call.
 * @returns the denial, or undefined when the call may run.
 */
export function checkCall(call: GuardedCall, env: StateGuardEnv): GuardDenial | undefined {
  const forms = protectedForms(env)
  const found: { key: string | undefined; value: string }[] = []
  if (!strings(call.args, undefined, found)) return { kind: 'too-large', match: `more than ${MAX_STRINGS} strings or nesting deeper than ${MAX_DEPTH}` }
  const textOnly = TEXT_ONLY.has(call.name)
  const search = SEARCH_TOOLS.has(call.name)
  const writer = isWriteTool(call.name)
  const pathOnly = PATH_ONLY_TOOLS.has(call.name)
  const fileTool = FILE_TOOLS.has(call.name)
  const matchText = textOnly ? undefined : textMatcher(env, call.cwds)
  let state: StateIdentity | undefined
  let readings = 0
  const verdicts = new Map<string, GuardDenial | undefined>()
  /**
   * One path against the state folders: by its string forms first, then by file identity.
   * @param argument - a path of the call's arguments, whose readings count towards `MAX_READINGS`; a working
   * directory, which the Session has and the call did not choose, does not.
   */
  const checkPath = (value: string, argument = true): GuardDenial | undefined => {
    if (verdicts.has(value)) return verdicts.get(value)
    const resolved = candidates(value, call.cwds, env)
    if (argument) readings += resolved.readings
    if (readings > MAX_READINGS) return { kind: 'too-large', match: `more than ${MAX_READINGS} readings of its paths` }
    if (resolved.unreadable !== undefined && fileTool) {
      // Refused only for dsh's file and search tools, which would hand the value to the operating system as a
      // path. Any other tool (text-only, a shell, an MCP tool) may hold ordinary long text under a path-like key:
      // there the readings no operating system opens are left out, the others (the value without the blanks around
      // it, say) are checked like any path, and the text check below still reads the whole value.
      const bad: GuardDenial = { kind: 'bad-path', match: resolved.unreadable }
      verdicts.set(value, bad)
      return bad
    }
    let within: GuardDenial | undefined
    let above: GuardDenial | undefined
    for (const path of resolved.forms) {
      for (const form of forms) {
        if (isWithin(form, path)) within ??= { kind: 'plugin-state', match: path }
        else if (search && isWithin(path, form)) above ??= { kind: 'plugin-state', match: `${path} (contains ${form})`, above: true }
      }
    }
    if (within === undefined) {
      state ??= stateIdentity(forms, env.fs)
      for (const path of [...resolved.forms, ...resolved.raws]) {
        const match = identityMatch(path, state, env.fs)
        if (match === 'within') within ??= { kind: 'plugin-state', match: `${path} (the state folder under another name)` }
        else if (match === 'above' && search) above ??= { kind: 'plugin-state', match: `${path} (contains the state folder)`, above: true }
      }
    }
    verdicts.set(value, within ?? above)
    return within ?? above
  }
  let paths = 0
  let above: GuardDenial | undefined
  // Whether this search names its own root. Only that argument decides it: counting any path-like string here would
  // let a harmless one (another path key, a patch file line in a pattern) switch the working-directory check off.
  const rooted = search && searchRoot(call.args) !== undefined
  for (const { key, value } of found) {
    const content = writer && key !== undefined && CONTENT_KEYS.has(key)
    const named = pathOnly || (key !== undefined && PATH_KEYS.has(key)) ? [value] : []
    // Paths inside a text argument: the file lines of a patch. A write tool's content is data, not a patch to apply.
    const embedded = textOnly || content ? [] : patchPaths(value)
    for (const path of [...named, ...embedded]) {
      if (++paths > MAX_PATHS) return { kind: 'too-large', match: `more than ${MAX_PATHS} paths` }
      const verdict = checkPath(path)
      if (verdict !== undefined && verdict.above !== true) return verdict
      above ??= verdict
    }
    if (content) continue
    const match = matchText?.(value)
    if (match !== undefined) return { kind: 'plugin-state', match }
  }
  if (above !== undefined) return above
  if (textOnly) return undefined
  // The working directory: a tool acts there when it gets no path. Above the state folder a search that names no
  // root of its own would read into it (a root it does name was checked above, a relative one from each of these
  // folders); inside it nothing may run but `working_directory`, whose own argument is checked above. A call whose
  // working directory is not known is checked as one made in the home folder, where a relative path is resolved too.
  for (const cwd of call.cwds.length > 0 ? call.cwds : [env.home]) {
    const verdict = checkPath(cwd, false)
    if (verdict === undefined) continue
    if (verdict.above === true) {
      if (!rooted) return { ...verdict, cwd: true }
    } else if (!pathOnly) {
      return { ...verdict, cwd: true }
    }
  }
  return undefined
}

/** How a refusal names the state folder to a model. */
const STATE_FOLDER_WORDS = '`storages/dsh-coordinator` in the dsh home'

/** The model-facing error of a denial. */
export function denialReason(denial: GuardDenial, role: 'coordinator' | 'thread'): string {
  if (denial.kind === 'too-large') {
    return `this call carries more arguments than the host reads when it checks a call for Whalepod's own state folder (${denial.match}), so it is refused unread; split it into smaller calls. The plugin closes nothing else in the dsh home`
  }
  if (denial.kind === 'bad-path') {
    return `this call names ${denial.match}. No file has such a path, and the host cannot check it against Whalepod's own state folder, so the call is refused; pass the plain path of the file or folder. The plugin closes nothing else in the dsh home`
  }
  if (denial.above === true) {
    return denial.cwd === true
      ? `this search has no path, and the Session's working directory is above Whalepod's own state folder (${STATE_FOLDER_WORDS}), so it would read it; pass the path of a narrower folder. The plugin closes nothing else in the dsh home`
      : `this search starts above Whalepod's own state folder (${STATE_FOLDER_WORDS}) and would read it; search a narrower folder. The plugin closes nothing else in the dsh home`
  }
  if (denial.cwd === true) {
    return `the Session's working directory is inside Whalepod's own state folder (${STATE_FOLDER_WORDS}), where no agent may work; change it back to the Session's own folder with working_directory. The plugin closes nothing else in the dsh home`
  }
  return role === 'coordinator'
    ? `the Orchestrator may not access Whalepod's own state folder (${STATE_FOLDER_WORDS}); ask the user. The plugin closes nothing else in the dsh home`
    : `Executor Session agents may not access Whalepod's own state folder (${STATE_FOLDER_WORDS}); ask the Orchestrator or the user. The plugin closes nothing else in the dsh home`
}

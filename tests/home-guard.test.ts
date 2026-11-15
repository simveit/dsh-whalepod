/**
 * The state-folder guard (G1, decision 70): the plugin's own state folder is refused through path arguments after
 * normalisation and symlink resolution, through a search rooted above it and through the conservative text check of
 * commands; the rest of the dsh home (skills, Session logs, profiles, the credentials file) and a project's own
 * `.dsh` folder pass. Paths are checked against an injected home and a fake filesystem only; nothing here touches
 * the real dsh home. `state-guard-fs.test.ts` runs the same guard on a real folder tree.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkCall, denialReason, innerMatch, MAX_DEPTH, MAX_PATHS, MAX_READINGS, MAX_STRINGS, patchPaths, PATH_MAX_CHARS, textMatch, type StateGuardEnv } from '../src/host/home-guard.ts'

const HOME = '/Users/u'
const STATE = '/Users/u/.dsh/storages/dsh-coordinator'
const DEV_STATE = '/Users/u/dev/proj/.dsh-home/storages/dsh-coordinator'
/** Fake filesystem: existing paths, and symlinks (`/Users/u/link-to-dsh` -> `/Users/u/.dsh`). */
const LINKS: Record<string, string> = {
  '/Users/u/link-to-dsh': '/Users/u/.dsh',
  '/Users/u/work/innocent': DEV_STATE,
  '/Users/u/dev/proj/threads/t1/skills-link': '/Users/u/.dsh/skills',
  '/Users/u/dev/proj/threads/t1/other-link': '/Users/u/.dsh/storages/other-plugin',
  '/Users/u/sk': '/Users/u/.dsh/skills',
  '/Users/u/beside': '/Users/u/.dsh/storages/other-plugin',
  '/tmp': '/private/tmp',
}
const EXISTS = new Set(['/', '/Users', '/Users/u', '/Users/u/.dsh', '/Users/u/.dsh/skills', '/Users/u/.dsh/storages', '/Users/u/.dsh/storages/other-plugin', STATE, '/Users/u/dev', '/Users/u/dev/proj',
  '/Users/u/dev/proj/.dsh-home', '/Users/u/dev/proj/.dsh-home/storages', DEV_STATE, '/Users/u/dev/proj/threads', '/Users/u/dev/proj/threads/t1', '/private', '/private/tmp', '/var',
  '/var/folders', '/var/folders/xy', '/Users/u/work'])
const fs = {
  realpath(path: string): string {
    let p = path
    for (let i = 0; i < 10; i++) {
      const hit = Object.keys(LINKS).find(l => p === l || p.startsWith(`${l}/`))
      if (hit === undefined) break
      p = LINKS[hit]! + p.slice(hit.length)
    }
    if (!EXISTS.has(p) && !Object.values(LINKS).includes(p)) throw new Error(`ENOENT ${path}`)
    return p
  },
}

const env: StateGuardEnv = { home: HOME, roots: [DEV_STATE, STATE], fs }
const CWD = '/Users/u/dev/proj/threads/t1'
const call = (name: string, args: unknown) => checkCall({ name, args, cwds: [CWD] }, env)

test('file tools: the state folder is denied after ~ expansion, normalisation and symlink resolution, for reads and writes', () => {
  const denied = [
    ['read', { file_path: `${STATE}/state.json` }],
    ['read', { file_path: '~/.dsh/storages/dsh-coordinator/state.json' }],
    ['read', { file_path: STATE }],
    ['read', { file_path: '/Users/u/.dsh/skills/../storages/dsh-coordinator/state.json' }],
    ['read', { file_path: '/Users/u/dev/../.dsh/storages//dsh-coordinator/owner.lock' }],
    ['read', { file_path: '../../.dsh-home/storages/dsh-coordinator/state.json' }],
    ['read', { file_path: '/Users/u/link-to-dsh/storages/dsh-coordinator/state.v1.json' }],
    ['read', { file_path: '/Users/u/work/innocent/state.json' }],
    ['read', { file_path: 'skills-link/../storages/dsh-coordinator/state.json' }],
    // A symlink to a sibling and `..`: the OS follows the link first, so this is the state folder.
    ['grep', { pattern: 'memory', path: 'other-link/../dsh-coordinator' }],
    ['read', { file_path: `${CWD}/other-link/../dsh-coordinator/state.v1.json` }],
    ['read_image', { file_path: `${STATE}/state.json` }],
    ['write', { file_path: `${DEV_STATE}/state.json`, content: '{}' }],
    ['edit', { file_path: `${STATE}/state.json`, old_string: 'a', new_string: 'b' }],
    // G3: `~` is expanded without collapsing the `..` behind a symlink (dsh hands the spelling to the OS).
    ['read', { file_path: '~/beside/../dsh-coordinator/notes.json' }],
    ['read', { file_path: '~/sk/../storages/dsh-coordinator/state.json' }],
    ['write', { file_path: '~/beside/../dsh-coordinator/new.json', content: '{}' }],
    // L3: dsh does not trim a path; other tools may. Both readings are checked.
    ['read', { file_path: ` ${STATE}/state.json ` }],
    ['read', { file_path: ' /../other-link/../dsh-coordinator/notes.json' }],
    // G5: dsh's `apply_patch` has one argument, `input`, and the paths are lines of the patch text.
    ['apply_patch', { input: '*** Begin Patch\n*** Update File: /Users/u/work/innocent/state.json\n@@\n-a\n+b\n*** End Patch' }],
    ['apply_patch', { input: '*** Begin Patch\n*** Add File: other-link/../dsh-coordinator/new.json\n+{}\n*** End Patch' }],
    ['apply_patch', { input: '*** Begin Patch\n*** Delete File: ~/beside/../dsh-coordinator/notes.json\n*** End Patch' }],
    ['apply_patch', { input: '*** Begin Patch\n*** Update File: notes.md\n*** Move to: /Users/u/link-to-dsh/storages/../storages/other-plugin/../dsh-coordinator/moved.md\n@@\n-a\n+b\n*** End Patch' }],
    ['apply_patch', { input: '*** Begin Patch\r\n  *** update file:/Users/u/work/innocent/owner.lock\r\n*** End Patch' }],
    ['some_mcp_patch', { patch: '*** Begin Patch\n*** Add File: /Users/u/work/innocent/x\n+1\n*** End Patch' }],
    // G4: a tool that enters a folder: dsh's `working_directory({ cd })`, whatever the key, a subagent's start `cwd`,
    // a shell's `workdir`, a terminal's `cwd`.
    ['working_directory', { cd: '/Users/u/work/innocent' }],
    ['working_directory', { cd: 'other-link/../dsh-coordinator' }],
    ['working_directory', { anything: '/Users/u/work/innocent' }],
    ['subagent', { cwd: '/Users/u/work/innocent', description: 'd', name: 'n', prompt: 'p' }],
    ['bash', { command: 'cat state.json', workdir: '/Users/u/work/innocent', description: 'x' }],
    ['terminal_open', { type: 'shell', name: 't', cwd: '/Users/u/work/innocent' }],
    // Other dsh tools that take a file under their own key.
    ['office_convert', { input: '/Users/u/work/innocent/state.json', format: 'pdf' }],
    ['read_mcp_resource', { server: 'files', uri: 'file:///Users/u/work/innocent/state.json' }],
    ['lsp', { operation: 'hover', file_path: '/Users/u/work/innocent/state.json', line: 1, character: 1 }],
    ['glob', { pattern: '*', path: STATE }],
    ['grep', { pattern: 'memory', path: `${STATE}/state.json` }],
    ['read', { file_path: `file://${STATE}/state.json` }],
    ['some_mcp_tool', { paths: ['/ok', `${STATE}/x`] }],
  ] as const
  for (const [name, args] of denied) {
    const denial = call(name, args)
    assert.equal(denial?.kind, 'plugin-state', `${name} ${JSON.stringify(args)}`)
    assert.equal(denial?.above, undefined, `${name} ${JSON.stringify(args)}`)
  }
})

test('search tools: a search rooted above the state folder is denied, with its own reason', () => {
  const above = [
    ['glob', { pattern: '**/*', path: '/Users/u' }],
    ['glob', { pattern: '**/*', path: '~' }],
    ['glob', { pattern: '**/SKILL.md', path: '/Users/u/.dsh' }],
    ['grep', { pattern: 'token', path: '/Users/u/.dsh/storages' }],
    ['grep', { pattern: 'token', path: '/Users/u/dev/proj' }],
    ['grep', { pattern: 'token', path: '/Users/u/link-to-dsh' }],
    ['glob', { pattern: '*', path: '../../.dsh-home' }],
    ['grep', { pattern: 'x', path: 'skills-link/..' }],
  ] as const
  for (const [name, args] of above) {
    const denial = call(name, args)
    assert.equal(denial?.kind, 'plugin-state', `${name} ${JSON.stringify(args)}`)
    assert.equal(denial?.above, true, `${name} ${JSON.stringify(args)}`)
  }
  // A read of a folder above it is no search and reads nothing in it.
  assert.equal(call('read', { file_path: '/Users/u/.dsh/storages' }), undefined)
  // L5: a grep at the home folder is refused although ripgrep skips hidden folders by default: an `include` that
  // names one makes it descend.
  assert.equal(call('grep', { pattern: 'x', path: '/Users/u', include: '{.dsh,*.json}' })?.above, true)
})

test('G4: a search without a path is checked against the working directory; inside the state folder nothing runs', () => {
  const at = (cwds: string[], name: string, args: unknown) => checkCall({ name, args, cwds }, env)
  // dsh's glob and grep search the Session's working directory when they get no path (search-core.ts).
  for (const cwd of ['/Users/u/.dsh/storages', '/Users/u/.dsh', '/Users/u', '/', '/Users/u/link-to-dsh', '/Users/u/dev/proj']) {
    for (const [name, args] of [['grep', { pattern: 'executorPrompt' }], ['glob', { pattern: '**/*' }], ['grep', { pattern: 'x', include: '*.json' }]] as const) {
      const denial = at([CWD, cwd], name, args)
      assert.deepEqual([denial?.kind, denial?.above, denial?.cwd], ['plugin-state', true, true], `${name} in ${cwd}`)
    }
    // With a path the search is where the path says, and other tools do not read a tree.
    assert.equal(at([CWD, cwd], 'grep', { pattern: 'x', path: CWD }), undefined, cwd)
    assert.equal(at([CWD, cwd], 'read', { file_path: `${CWD}/x.txt` }), undefined, cwd)
    assert.equal(at([CWD, cwd], 'bash', { command: 'ls', description: 'x' }), undefined, cwd)
    assert.equal(at([CWD, cwd], 'working_directory', {}), undefined, cwd)
  }
  // A relative path is resolved against the working directory.
  assert.equal(at([CWD, '/Users/u/.dsh/storages'], 'read', { file_path: 'dsh-coordinator/notes.json' })?.kind, 'plugin-state')
  assert.equal(at([CWD, '/Users/u/.dsh/storages'], 'apply_patch', { input: '*** Begin Patch\n*** Add File: dsh-coordinator/x.json\n+{}\n*** End Patch' })?.kind, 'plugin-state')
  assert.equal(at([CWD, '/Users/u/.dsh/storages'], 'grep', { pattern: 'x', path: '.' })?.above, true)
  // Entering a folder above it is not refused (the search there is), and neither is an ordinary folder.
  assert.equal(call('working_directory', { cd: '/Users/u/.dsh/storages' }), undefined)
  assert.equal(call('working_directory', { cd: '/Users/u/.dsh/skills' }), undefined)
  assert.equal(call('subagent', { cwd: '/Users/u/.dsh/storages', description: 'd', name: 'n', prompt: 'p' }), undefined)
  // A working directory inside the state folder (a symlink to it, the folder itself): no call runs there, whatever
  // it names, except the one that leaves.
  for (const cwd of [STATE, '/Users/u/work/innocent', DEV_STATE]) {
    for (const [name, args] of [['grep', { pattern: 'x' }], ['glob', { pattern: '*' }], ['bash', { command: 'cat state.json', description: 'x' }], ['read', { file_path: '/Users/u/dev/proj/README.md' }], ['subagent', { description: 'd', name: 'n', prompt: 'p' }]] as const) {
      const denial = at([CWD, cwd], name, args)
      assert.equal(denial?.kind, 'plugin-state', `${name} in ${cwd}`)
      assert.equal(denial?.above, undefined, `${name} in ${cwd}`)
    }
    assert.equal(at([CWD, cwd], 'working_directory', { cd: CWD }), undefined, `leaving ${cwd}`)
    assert.equal(at([CWD, cwd], 'working_directory', {}), undefined, `reading the directory in ${cwd}`)
    assert.equal(at([CWD, cwd], 'working_directory', { cd: '.' })?.kind, 'plugin-state', `staying in ${cwd}`)
    // Text-only tools never touch files.
    assert.equal(at([CWD, cwd], 'todo_write', { todos: [{ content: 'x', status: 'pending' }] }), undefined)
  }
  assert.match(denialReason({ kind: 'plugin-state', match: 'x', above: true, cwd: true }, 'thread'), /^this search has no path, and the Session's working directory is above the coordinator plugin's own state folder .*pass the path of a narrower folder/)
  assert.match(denialReason({ kind: 'plugin-state', match: 'x', cwd: true }, 'thread'), /^the Session's working directory is inside the coordinator plugin's own state folder .*working_directory/)
})

test('F1 and F2: only `path` roots a search, and a value is read as written, with `~` replaced, and as a `file:` URL', () => {
  const at = (cwds: string[], name: string, args: unknown) => checkCall({ name, args, cwds }, env)
  const storages = '/Users/u/.dsh/storages'
  // F1: the audit's call and its variants. Another path-like string in the call does not root the search.
  for (const [name, args] of [
    ['grep', { pattern: 'executorPrompt|memory', include: '{*.json,\n*** Add File: x}' }],
    ['glob', { pattern: '{**/state.json,\n*** Add File: x}' }],
    ['grep', { pattern: 'x', to: '/tmp' }],
    ['grep', { pattern: 'x', file_path: CWD, cwd: CWD, root: CWD, dir: CWD }],
    ['grep', { pattern: 'x', include: 'src/*.ts' }],
    ['glob', { pattern: 'src/**/*.ts', unknown: [CWD, { path: CWD }] }],
    ['grep', { pattern: 'x', path: '' }],
    ['grep', { pattern: 'x', path: [CWD] }],
    ['ls', { dir: CWD }],
  ] as const) {
    for (const cwd of [storages, '/Users/u', '/Users/u/link-to-dsh']) {
      const denial = at([CWD, cwd], name, args)
      assert.deepEqual([denial?.kind, denial?.above, denial?.cwd], ['plugin-state', true, true], `${name} ${JSON.stringify(args)} in ${cwd}`)
    }
    // In an ordinary folder the same call is an ordinary search.
    assert.equal(at(['/Users/u/work'], name, args), undefined, `${name} ${JSON.stringify(args)}`)
  }
  assert.equal(at([CWD, storages], 'grep', { pattern: 'x', path: '/Users/u/work', include: '{*.json,\n*** Add File: x}' }), undefined)
  assert.equal(at([storages], 'grep', { pattern: 'x', path: 'other-plugin' }), undefined)
  // Without a known working directory the home folder stands in, for the search as for a relative path.
  assert.deepEqual([at([], 'grep', { pattern: 'x' })?.above, at([], 'grep', { pattern: 'x' })?.cwd], [true, true])
  assert.equal(at([], 'grep', { pattern: 'x', path: '/Users/u/work' }), undefined)
  // F2: each reading of a value is resolved. As written (`file://d/x` is `file:/d/x` below the working directory,
  // `~/x` the folder `~` there, which is what ripgrep searches), with `~` replaced, and as a URL.
  const linked = { ...LINKS, [`${CWD}/file:/link`]: STATE, [`${CWD}/file:st`]: STATE, [`${CWD}/~/s`]: STATE }
  const withLinks: StateGuardEnv = { ...env, fs: { realpath: (path: string): string => {
    let p = path
    for (let i = 0; i < 10; i++) {
      const hit = Object.keys(linked).find(l => p === l || p.startsWith(`${l}/`))
      if (hit === undefined) break
      p = linked[hit]! + p.slice(hit.length)
    }
    if (!EXISTS.has(p) && !Object.values(linked).includes(p)) throw new Error(`ENOENT ${path}`)
    return p
  } } }
  const linkedCall = (name: string, args: unknown) => checkCall({ name, args, cwds: [CWD] }, withLinks)
  for (const [name, args] of [
    ['read', { file_path: 'file://link/state.json' }],
    ['write', { file_path: 'file://link/new.json', content: '{}' }],
    ['read', { file_path: 'file:st/state.json' }],
    ['grep', { pattern: 'x', path: 'file://link' }],
    ['apply_patch', { input: '*** Begin Patch\n*** Add File: file://link/x.json\n+{}\n*** End Patch' }],
    ['grep', { pattern: 'x', path: '~/s' }],
    ['glob', { pattern: '*', path: '~/s' }],
    ['read', { file_path: `file://${STATE}/state.json` }],
    ['read', { file_path: `file:${STATE}/state.json` }],
    ['read', { file_path: `File://localhost${STATE}/state.json` }],
    ['mcp__files__read', { uri: 'file:///Users/u/.dsh/storages/dsh%2Dcoordinator/state.json' }],
    ['mcp__files__read', { uri: 'file://~/.dsh/storages/dsh-coordinator/state.json' }],
  ] as const) assert.equal(linkedCall(name, args)?.kind, 'plugin-state', `${name} ${JSON.stringify(args)}`)
  for (const [name, args] of [
    ['read', { file_path: 'file://notes/a.md' }],
    ['read', { file_path: 'file:///Users/u/dev/proj/a.ts' }],
    ['read', { file_path: '~/work/a.md' }],
    ['grep', { pattern: 'x', path: '~/work' }],
    ['mcp__files__read', { uri: 'file:///Users/u/.dsh/storages/other%2Dplugin/data.json' }],
  ] as const) assert.equal(linkedCall(name, args), undefined, `${name} ${JSON.stringify(args)}`)
})

test('G2: a call with more arguments than the check reads is refused, and padding hides nothing below the limit', () => {
  const pad = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`)
  // The review's inputs: 501 strings before the path. They are read now.
  for (const [name, args] of [
    ['read', { pad: pad(501), file_path: `${STATE}/state.json` }],
    ['grep', { pad: pad(501), pattern: 'x', path: STATE }],
    ['bash', { pad: pad(501), command: `cat ${STATE}/state.json` }],
    ['read', { pad: pad(50_000), file_path: '/Users/u/work/innocent/state.json' }],
  ] as const) assert.equal(call(name, args)?.kind, 'plugin-state', name)
  // Past the limits the call is refused unread, wherever the path sits.
  const nest = (depth: number, leaf: unknown): unknown => { let v = leaf; for (let i = 0; i < depth; i++) v = { a: v }; return v }
  const tooLarge: [string, unknown][] = [
    ['read', { pad: pad(MAX_STRINGS), file_path: '/Users/u/dev/proj/README.md' }],
    ['read', { file_path: '/Users/u/dev/proj/README.md', pad: pad(MAX_STRINGS) }],
    ['read', nest(MAX_DEPTH, { file_path: `${STATE}/state.json` })],
    ['read', nest(MAX_DEPTH + 5, 'x')],
    ['some_mcp_tool', { paths: Array.from({ length: MAX_PATHS + 1 }, (_, i) => `/Users/u/dev/proj/f${i}`) }],
    // The plugin's own text-only tools use the same reader.
    ['todo_write', { todos: pad(MAX_STRINGS + 1) }],
  ]
  for (const [name, args] of tooLarge) assert.equal(call(name, args)?.kind, 'too-large', name)
  // Large calls a model really makes stay below the limits.
  const allowed: [string, unknown][] = [
    ['todo_write', { todos: Array.from({ length: 2000 }, (_, i) => ({ content: `step ${i}`, status: 'pending', activeForm: `doing ${i}` })) }],
    ['mcp__sheets__write', { rows: Array.from({ length: 300 }, (_, r) => Array.from({ length: 100 }, (_, c) => `r${r}c${c}`)) }],
    ['read', nest(MAX_DEPTH - 1, { file_path: '/Users/u/dev/proj/README.md' })],
    ['present', { files: Array.from({ length: MAX_PATHS }, (_, i) => `/Users/u/dev/proj/f${i % 7}`) }],
    ['write', { file_path: `${CWD}/big.txt`, content: 'x'.repeat(2_000_000) }],
  ]
  for (const [name, args] of allowed) assert.equal(call(name, args), undefined, name)
  // The readings of the paths are bounded too. A relative path has one per working directory, so the most paths a
  // call may carry pass from two of them. A path written to have many readings (blanks around it, the other Unicode
  // form, a `~`, a `file:` prefix) uses the budget up sooner: the lookups of a call do not grow with such spellings.
  const two = (name: string, args: unknown) => checkCall({ name, args, cwds: [CWD, '/Users/u/work'] }, env)
  assert.equal(MAX_READINGS, 2 * MAX_PATHS)
  assert.equal(two('present', { files: Array.from({ length: MAX_PATHS }, (_, i) => `docs/f${i}.md`) }), undefined)
  assert.equal(two('present', { files: Array.from({ length: MAX_PATHS }, (_, i) => `~/docs/f${i}.md`) })?.kind, 'too-large')
  assert.equal(two('some_mcp_tool', { paths: Array.from({ length: 600 }, (_, i) => ` e\u0301/f${i} `) })?.kind, 'too-large')
  assert.equal(two('some_mcp_tool', { paths: Array.from({ length: 300 }, (_, i) => ` file://e\u0301/f${i} `) })?.kind, 'too-large')
  assert.equal(two('some_mcp_tool', { paths: Array.from({ length: 400 }, (_, i) => ` e\u0301/f${i} `) }), undefined)
  // A path that names the folder is found before the budget is spent, and the same path twice is read once.
  assert.equal(two('some_mcp_tool', { paths: [`${STATE}/state.json`, ...Array.from({ length: 600 }, (_, i) => ` e\u0301/f${i} `)] })?.kind, 'plugin-state')
  assert.equal(two('some_mcp_tool', { paths: Array.from({ length: MAX_PATHS }, () => ' ~/e\u0301/f ') }), undefined)
  assert.match(denialReason(two('present', { files: Array.from({ length: MAX_PATHS }, (_, i) => `~/docs/f${i}.md`) })!, 'thread'), /\(more than 4000 readings of its paths\), so it is refused unread; split it into smaller calls/)
  const reason = denialReason({ kind: 'too-large', match: `more than ${MAX_STRINGS} strings or nesting deeper than ${MAX_DEPTH}` }, 'coordinator')
  assert.match(reason, /^this call carries more arguments than the host reads .*\(more than 100000 strings or nesting deeper than 64\), so it is refused unread; split it into smaller calls/)
})

test('G1: one folder under two names is one folder: the check compares file identity, not spellings', () => {
  // A filesystem like macOS: everything under `/Users` also answers under `/System/Volumes/Data/Users`, `realpath`
  // keeps that prefix (a firmlink is no symlink), and names match in any letter case.
  const ALIAS = '/System/Volumes/Data'
  const exists = new Set([...EXISTS, ...Object.values(LINKS), `${STATE}/state.json`, '/Users/u/.dsh/skills/review', '/Users/u/.dsh/skills/review/SKILL.md', '/System', '/System/Volumes', ALIAS])
  /** The stored spelling of a path: symlinks followed and each name matched in any letter case; throws when nothing is there. */
  const stored = (path: string): string => {
    let out = ''
    for (const part of path.split('/').filter(p => p !== '')) {
      const next = `${out}/${part}`
      const hit = [...exists, ...Object.keys(LINKS)].find(e => e.toLowerCase() === next.toLowerCase())
      if (hit === undefined) throw new Error(`ENOENT ${path}`)
      out = LINKS[hit] ?? hit
    }
    return out === '' ? '/' : out
  }
  const aliasFs = {
    realpath(path: string): string {
      const aliased = path.toLowerCase().startsWith(`${ALIAS}/`.toLowerCase())
      return aliased ? ALIAS + stored(path.slice(ALIAS.length)) : stored(path)
    },
    identity(path: string): string {
      const real = aliasFs.realpath(path)
      return `id:${real.startsWith(`${ALIAS}/`) ? real.slice(ALIAS.length) : real}`
    },
    list: (path: string) => [...exists].filter(e => e.startsWith(`${path}/`) && !e.slice(path.length + 1).includes('/')).map(e => e.slice(path.length + 1)),
  }
  const aliasEnv: StateGuardEnv = { home: HOME, roots: [STATE], fs: aliasFs }
  const check = (name: string, args: unknown, cwds = [CWD]) => checkCall({ name, args, cwds }, aliasEnv)
  // The review's four calls. None contains a spelling the string or text check knows.
  assert.equal(check('grep', { pattern: 'executorPrompt', path: `${ALIAS}/Users/u/.dsh/storages` })?.above, true)
  assert.equal(check('glob', { pattern: '**/*', path: `${ALIAS}/Users/u/.dsh` })?.above, true)
  assert.equal(check('read', { file_path: `${ALIAS}/Users/u/.dsh/Storages/DSH-Coordinator/STATE.JSON` })?.kind, 'plugin-state')
  assert.equal(check('write', { file_path: `${ALIAS}/Users/u/.DSH/storages/DSH-Coordinator/state.json`, content: 'x' })?.kind, 'plugin-state')
  assert.equal(check('edit', { file_path: `${ALIAS}/Users/u/.DSH/storages/DSH-Coordinator/new-file.json`, old_string: 'a', new_string: 'b' })?.kind, 'plugin-state')
  // The folders that are above it only under the alias, and the alias as a working directory.
  for (const path of [ALIAS, '/System/Volumes', '/System', `${ALIAS}/Users`, `${ALIAS}/Users/u`]) assert.equal(check('grep', { pattern: 'x', path })?.above, true, path)
  assert.equal(check('grep', { pattern: 'x' }, [CWD, `${ALIAS}/Users/u/.dsh/storages`])?.above, true)
  assert.equal(check('working_directory', { cd: `${ALIAS}/Users/u/.dsh/storages/DSH-Coordinator` })?.kind, 'plugin-state')
  assert.equal(check('apply_patch', { input: `*** Begin Patch\n*** Add File: ${ALIAS}/Users/u/.dsh/storages/DSH-Coordinator/x\n+1\n*** End Patch` })?.kind, 'plugin-state')
  // A letter case alone, without the alias (the text check does not see a path argument's case; the identity does).
  assert.equal(check('read', { file_path: '/Users/u/.DSH/Storages/DSH-Coordinator/state.json' })?.kind, 'plugin-state')
  assert.equal(check('read', { file_path: '/USERS/U/.dsh/storages/dsh-coordinator' })?.kind, 'plugin-state')
  // Everything else under the alias behaves as under its usual name.
  for (const [name, args] of [
    ['read', { file_path: `${ALIAS}/Users/u/.dsh/skills/review/SKILL.md` }],
    ['grep', { pattern: 'x', path: `${ALIAS}/Users/u/.dsh/skills` }],
    ['glob', { pattern: '*', path: `${ALIAS}/Users/u/.dsh/storages/other-plugin` }],
    ['read', { file_path: `${ALIAS}/Users/u/.dsh/.credentials.yaml` }],
    ['read', { file_path: `${ALIAS}/Users/u/.dsh/storages/dsh-coordinator-notes/a.md` }],
    ['grep', { pattern: 'x', path: `${ALIAS}/Users/u/dev/proj/threads` }],
    ['read', { file_path: '/Users/u/.DSH/Skills/review/SKILL.md' }],
  ] as const) assert.equal(check(name, args), undefined, `${name} ${JSON.stringify(args)}`)
  // A state folder that does not exist yet (the default dsh home while a dev home runs) is compared by name below
  // the deepest folder that exists, in any letter case and under the alias.
  const pending: StateGuardEnv = { home: HOME, roots: ['/Users/u/.dsh/storages/other-plugin/later/dsh-coordinator'], fs: aliasFs }
  for (const file_path of ['/Users/u/.dsh/storages/other-plugin/Later/DSH-Coordinator/state.json', `${ALIAS}/Users/u/.dsh/storages/other-plugin/later/dsh-coordinator`, '/Users/u/.DSH/storages/other-plugin/later/DSH-COORDINATOR/x', 'other-link/Later/DSH-Coordinator/x', '/Users/u/beside/later/dsh-coordinator']) {
    assert.equal(checkCall({ name: 'write', args: { file_path, content: '{}' }, cwds: [CWD] }, pending)?.kind, 'plugin-state', file_path)
  }
  assert.equal(checkCall({ name: 'glob', args: { pattern: '*', path: `${ALIAS}/Users/u/.dsh/storages/other-plugin` }, cwds: [CWD] }, pending)?.above, true)
  assert.equal(checkCall({ name: 'write', args: { file_path: '/Users/u/.dsh/storages/other-plugin/later/notes.md', content: 'x' }, cwds: [CWD] }, pending), undefined)
  assert.equal(checkCall({ name: 'write', args: { file_path: '/Users/u/.dsh/storages/other-plugin/later/dsh-coordinator-2/x', content: 'x' }, cwds: [CWD] }, pending), undefined)
})

test('G5: patchPaths reads the file lines of a patch as dsh writes them, and nothing else', () => {
  assert.deepEqual(patchPaths('*** Begin Patch\n*** Add File: a/b.txt\n+x\n*** Update File: /c d/e.md\n*** Move to: ../f.md\n@@\n-1\n+2\n*** Delete File: ~/g\n*** End of File\n*** End Patch'), ['a/b.txt', '/c d/e.md', '../f.md', '~/g'])
  assert.deepEqual(patchPaths('*** begin patch\r\n \t*** UPDATE FILE:x.txt\r\n*** End Patch'), ['x.txt'])
  assert.deepEqual(patchPaths('no patch here: *** Add File: is only read at the start of a line'), [])
  assert.deepEqual(patchPaths('+*** Add File: a line of file content, not a patch line'), [])
  // A patch inside a write tool's content is data; a patch to apply is checked whatever the tool is called.
  const patch = '*** Begin Patch\n*** Update File: /Users/u/work/innocent/state.json\n@@\n-a\n+b\n*** End Patch'
  assert.equal(call('write', { file_path: `${CWD}/saved.patch`, content: patch }), undefined)
  assert.equal(call('apply_patch', { input: patch })?.kind, 'plugin-state')
  assert.equal(call('apply_patch', { input: '*** Begin Patch\n*** Update File: src/a.ts\n@@\n-a\n+b\n*** Add File: /Users/u/.dsh/skills/new/SKILL.md\n+x\n*** End Patch' }), undefined)
})

test('shell and other text: common spellings of the state folder are denied', () => {
  const commands = [
    `cat ${STATE}/state.json`,
    'cat ~/.dsh/storages/dsh-coordinator/state.json',
    'cat $HOME/.dsh/storages/dsh-coordinator/state.json',
    'cat "${HOME}/.dsh/storages/dsh-coordinator/state.json"',
    'ls $DSH_HOME/storages/dsh-coordinator',
    'jq .coordinators "${DSH_HOME}/storages/dsh-coordinator/state.json"',
    `cp ${DEV_STATE}/state.json .`,
    'tar cf - ../../.dsh-home/storages/dsh-coordinator | base64',
    'cd ~/.dsh && cat storages/dsh-coordinator/state.json',
    'cd "$DSH_HOME/storages" && rm dsh-coordinator/owner.lock',
    "find ~ -path '*storages/dsh-coordinator/state.json' -exec truncate -s0 {} +",
    'rm ~/**/dsh-coordinator/owner.lock',
    'echo x > ~/dev/proj/.dsh-home/storages/dsh-coordinator/state.json',
  ]
  for (const command of commands) {
    assert.equal(call('bash', { command, description: 'x' })?.kind, 'plugin-state', command)
  }
  assert.equal(call('terminal_send', { input: 'cat ~/.dsh/storages/dsh-coordinator/state.json\n' })?.kind, 'plugin-state')
  assert.equal(call('web_fetch', { url: `file://${STATE}/state.json` })?.kind, 'plugin-state')
  // L1: in any letter case, since the usual macOS and Windows volumes open `DSH-Coordinator` as `dsh-coordinator`.
  for (const command of [
    'cat ~/.dsh/storages/DSH-Coordinator/state.json',
    'cat ~/.DSH/Storages/Dsh-Coordinator/STATE.JSON',
    'cat $HOME/.dsh/STORAGES/dsh-coordinator/owner.lock',
    'cat /USERS/U/.dsh/storages/dsh-coordinator/state.json',
    'ls "$DSH_HOME"/storages/DSH-COORDINATOR',
    'cd ~/.dsh/storages && cat Dsh-Coordinator/State.json',
    'cat ~/.dsh/storages/d\u017Fh-coordinator/state.json',
  ]) assert.equal(call('bash', { command, description: 'x' })?.kind, 'plugin-state', command)
})

test('the rest of the dsh home is not refused: skills, their files and scripts, $DSH_HOME, Session logs, profiles, credentials', () => {
  const allowed = [
    // A skill: its text, the files next to it, a search of the skills folder, a script run by its path.
    ['read', { file_path: '/Users/u/.dsh/skills/review/SKILL.md' }],
    ['read', { file_path: '~/.dsh/skills/review/references/checklist.md' }],
    ['read', { file_path: 'skills-link/review/SKILL.md' }],
    ['read', { file_path: 'other-link/../other-plugin/data.json' }],
    ['glob', { pattern: '**/SKILL.md', path: '/Users/u/.dsh/skills' }],
    ['grep', { pattern: 'checklist', path: '~/.dsh/skills/review' }],
    ['bash', { command: 'bash ~/.dsh/skills/review/scripts/run.sh --all', description: 'x' }],
    ['bash', { command: 'python3 /Users/u/.dsh/skills/review/scripts/check.py', description: 'x' }],
    // dsh puts DSH_HOME into every shell call of a Session.
    ['bash', { command: 'ls "$DSH_HOME/skills"', description: 'x' }],
    ['bash', { command: 'echo ${DSH_HOME} && ls $DSH_HOME/office-kit/outputs', description: 'x' }],
    ['read', { file_path: '/Users/u/.dsh/office-kit/outputs/a.pdf' }],
    // A project's own skills are not in the dsh home at all.
    ['read', { file_path: '/Users/u/dev/proj/threads/t1/.dsh/skills/build/SKILL.md' }],
    ['read', { file_path: '.dsh/skills/build/SKILL.md' }],
    ['glob', { pattern: '*/SKILL.md', path: '.dsh/skills' }],
    ['bash', { command: 'bash .dsh/skills/build/scripts/build.sh', description: 'x' }],
    // dsh's own data: an ordinary Session may read it, and dsh's sandbox and reviewer decide about writes.
    ['read', { file_path: '/Users/u/.dsh/.credentials.yaml' }],
    ['read', { file_path: '/Users/u/.dsh/sessions/x.jsonl' }],
    ['read', { file_path: '/Users/u/link-to-dsh/profiles/web/dsh.yml' }],
    ['write', { file_path: '/Users/u/.dsh/profiles/web/dsh.yml', content: 'x' }],
    ['bash', { command: 'ls ~/.dsh && cat ~/.dsh/.credentials.yaml', description: 'x' }],
    ['bash', { command: 'find ~ -name .credentials.yaml', description: 'x' }],
    // Other plugins' storage, and names that only look like the state folder.
    ['read', { file_path: '/Users/u/.dsh/storages/other-plugin/data.json' }],
    ['glob', { pattern: '*', path: '/Users/u/.dsh/storages/other-plugin' }],
    ['read', { file_path: '/Users/u/.dsh/storages/dsh-coordinator-notes/a.md' }],
    ['bash', { command: 'cat ~/.dsh/storages/dsh-coordinator-notes/a.md', description: 'x' }],
    ['bash', { command: 'cat ~/dev/dsh-coordinator-plugin/README.md', description: 'x' }],
    // The system temp folders: dsh's `workspace-write` sandbox lets every Session write there.
    ['write', { file_path: '/tmp/decoded.txt', content: 'x' }],
    ['edit', { file_path: '/var/folders/xy/T/a', old_string: 'a', new_string: 'b' }],
    // Ordinary work.
    ['read', { file_path: '/Users/u/dev/proj/threads/t1/x.txt' }],
    ['glob', { pattern: '**/*.ts', path: CWD }],
    ['grep', { pattern: 'dsh', path: '/Users/u/dev/proj/threads' }],
    ['write', { file_path: `${CWD}/out.txt`, content: 'we never read ~/.dsh/storages/dsh-coordinator/state.json here' }],
  ] as const
  for (const [name, args] of allowed) assert.equal(call(name, args), undefined, `${name} ${JSON.stringify(args)}`)
  // Text-only tools are not searched (an Assignment may mention the folder it must not touch).
  assert.equal(call('thread_start', { title: 'x', brief: 'Never touch ~/.dsh/storages/dsh-coordinator.' }), undefined)
  assert.equal(call('coordinator_report', { kind: 'result', text: 'I did not read ~/.dsh/storages/dsh-coordinator/state.json' }), undefined)
  assert.equal(call('ask_user_question', { questions: [{ question: 'May I read ~/.dsh/storages/dsh-coordinator?' }] }), undefined)
})

test('textMatch: boundaries, and the refusal names only the plugin\'s state', () => {
  assert.equal(textMatch('ls ~/.dsh/storages/dsh-coordinator', env, [CWD]), '~/.dsh/storages/dsh-coordinator')
  assert.equal(textMatch(`ls x${STATE}`, env, [CWD]), 'storages/dsh-coordinator')
  assert.equal(textMatch('ls ~/.dsh/storages/dsh-coordinator-backup', env, [CWD]), undefined)
  assert.equal(textMatch('ls ~/.dsh', env, [CWD]), undefined)
  assert.equal(textMatch('echo $DSH_HOME', env, [CWD]), undefined)
  assert.equal(textMatch('plain text', env, [CWD]), undefined)
  const reasons = [
    denialReason({ kind: 'plugin-state', match: 'x' }, 'thread'),
    denialReason({ kind: 'plugin-state', match: 'x' }, 'coordinator'),
    denialReason({ kind: 'plugin-state', match: 'x', above: true }, 'coordinator'),
  ]
  assert.match(reasons[0]!, /^Executor Session agents may not access the coordinator plugin's own state folder .*ask the coordinator or the user/)
  assert.match(reasons[1]!, /^the coordinator may not access the coordinator plugin's own state folder .*ask the user/)
  assert.match(reasons[2]!, /^this search starts above the coordinator plugin's own state folder .*search a narrower folder/)
  for (const reason of reasons) {
    assert.match(reason, /`storages\/dsh-coordinator` in the dsh home/)
    assert.match(reason, /The plugin closes nothing else in the dsh home$/)
    assert.doesNotMatch(reason, /credentials|sessions|profiles|skills/i)
  }
})

test('H1 and H5: the length that counts is the resolved one, and a path that cannot be resolved is refused', () => {
  const state = `${STATE}/state.json`
  // Long spellings of a short path: dsh shortens them with `resolve()` and opens the short path.
  const long = [`${'/'.repeat(4200)}${state.slice(1)}`, `/${'./'.repeat(2100)}${state.slice(1)}`, `${'./'.repeat(2100)}../../../../.dsh/storages/dsh-coordinator-x/../dsh-coordinator/state.json`]
  for (const file_path of long) {
    assert.ok(file_path.length > PATH_MAX_CHARS)
    assert.equal(call('read', { file_path })?.kind, 'plugin-state', `${file_path.length} characters`)
    assert.equal(call('write', { file_path, content: 'x' })?.kind, 'plugin-state')
    assert.equal(call('apply_patch', { input: `*** Begin Patch\n*** Update File: ${file_path}\n@@\n-a\n+b\n*** End Patch` })?.kind, 'plugin-state')
  }
  // The same spellings of another file pass, at any length.
  assert.equal(call('read', { file_path: `/${'./'.repeat(2100)}Users/u/dev/proj/a.ts` }), undefined)
  assert.equal(call('grep', { pattern: 'x', path: `${'/'.repeat(5000)}Users/u/work` }), undefined)
  // Still too long after `resolve()`: no operating system opens it. On one line it is refused, fail closed.
  const tooLong = `/Users/u/dev/proj/${'n/'.repeat(2100)}a.ts`
  assert.equal(call('read', { file_path: tooLong })?.kind, 'bad-path')
  assert.equal(call('apply_patch', { input: `*** Begin Patch\n*** Add File: ${tooLong}\n+x\n*** End Patch` })?.kind, 'bad-path')
  // Text of several lines under a path key is no path: a large patch passes, and its file lines are still read.
  const body = Array.from({ length: 400 }, (_, i) => `+line ${i} of the new file`).join('\n')
  assert.ok(body.length > PATH_MAX_CHARS)
  assert.equal(call('apply_patch', { input: `*** Begin Patch\n*** Add File: notes.md\n${body}\n*** End Patch` }), undefined)
  assert.equal(call('apply_patch', { input: `*** Begin Patch\n*** Add File: notes.md\n${body}\n*** Update File: ${state}\n@@\n-a\n+b\n*** End Patch` })?.kind, 'plugin-state')
  // H5: NUL. Node refuses to open such a path; the guard does not rely on that.
  for (const file_path of [`${state}\0`, '/Users/u/dev/proj/threads/t1/link\0/state.json', 'notes.md\0']) {
    assert.equal(call('read', { file_path })?.kind, 'bad-path', JSON.stringify(file_path))
  }
  assert.equal(call('apply_patch', { input: '*** Begin Patch\n*** Add File: a\0b\n+x\n*** End Patch' })?.kind, 'bad-path')
  // A text-only tool opens nothing: its text is not refused for a NUL or its length under a path-like key.
  assert.equal(call('send_message', { to: 'a\0b', text: 'x' }), undefined)
  assert.equal(call('send_message', { to: 'x'.repeat(5000), text: 'x' }), undefined)
  // So does any tool that is not one of dsh's file and search tools: an MCP tool or a shell may take ordinary long
  // text on one line under a path-like key. The value is skipped as a path there.
  const text = 'word '.repeat(1200)
  assert.equal(text.length, 6000)
  assert.ok(!/[\r\n]/.test(text))
  assert.equal(call('mcp__notes__summarize', { input: text }), undefined)
  assert.equal(call('mcp__notes__create_page', { input: text, source: text, from: text, to: text, output: text }), undefined)
  assert.equal(call('mcp__notes__summarize', { input: `a\0b ${text}` }), undefined)
  assert.equal(call('bash', { command: 'true', input: text }), undefined)
  // The same value as the path of a file or search tool is refused, as before.
  assert.equal(call('read', { file_path: text })?.kind, 'bad-path')
  assert.equal(call('write', { file_path: text, content: 'x' })?.kind, 'bad-path')
  assert.equal(call('grep', { pattern: 'x', path: text })?.kind, 'bad-path')
  assert.equal(call('ls', { path: text })?.kind, 'bad-path')
  assert.equal(call('working_directory', { cd: text })?.kind, 'bad-path')
  // The text check still reads the long value of the other tool, with or without a NUL in it.
  assert.equal(call('mcp__notes__summarize', { input: `${text}cat ~/.dsh/storages/dsh-coordinator/state.json ${text}` })?.kind, 'plugin-state')
  assert.equal(call('mcp__notes__summarize', { input: `${text}${state}\0 ${text}` })?.kind, 'plugin-state')
  // A short path under the same key of that tool is still checked as a path.
  assert.equal(call('mcp__notes__summarize', { input: '/Users/u/link-to-dsh/storages/dsh-coordinator/state.json' })?.kind, 'plugin-state')
  // So is the reading of a value that is short enough when another reading of it is too long: with the blanks
  // around it this is no path any system opens, and without them it is a link into the state folder.
  const padded = `/Users/u/work/innocent/x.json${' '.repeat(5000)}`
  assert.equal(call('mcp__files__open', { path: padded })?.kind, 'plugin-state')
  assert.equal(call('mcp__files__open', { path: `/Users/u/work/a.md${' '.repeat(5000)}` }), undefined)
  assert.equal(call('read', { file_path: padded })?.kind, 'bad-path')
  const reason = denialReason({ kind: 'bad-path', match: 'a path with a NUL character' }, 'thread')
  assert.match(reason, /^this call names a path with a NUL character\. No file has such a path, .*pass the plain path of the file or folder\. The plugin closes nothing else in the dsh home$/)
})

test('H2: the text check for a spelling behind any prefix reads a text in one pass and matches as before', () => {
  const folder = 'storages/dsh-coordinator'
  const file = 'dsh-coordinator state file'
  const rows: [string, string | undefined][] = [
    ['ls $dsh_home/storages/dsh-coordinator', folder],
    ['find . -path \'*storages/*/../dsh-coordinator/x\'', folder],
    ['ls storages/{dsh-coordinator,a}', folder],
    ['ls storages/{a,dsh-coordinator}', undefined],
    [`cat storages/${'./'.repeat(600)}dsh-coordinator`, folder],
    ['ls storages[dsh-coordinator', folder],
    ['ls storages/dsh-coordinator.-', folder],
    ['cat **/dsh-coordinator/owner.lock', file],
    ['cat dsh-coordinator*/x/state.v1.json', file],
    ['cat dsh-coordinator/sub/state.json', file],
    ['cat dsh-coordinator?state.json', file],
    ['ls storages/dsh-coordinator-notes', undefined],
    ['ls storages/dsh-coordinator.bak', undefined],
    ['ls storages dsh-coordinator', undefined],
    ['ls storages/x "dsh-coordinator"', undefined],
    ['ls storagesx/dsh-coordinator', undefined],
    ['cat dsh-coordinator/a/b/state.json', undefined],
    ['cat dsh-coordinator state.json', undefined],
    ['cat dsh-coordinator-plugin/state.json', undefined],
  ]
  for (const [text, want] of rows) assert.equal(innerMatch(text), want, text)
  // F3: the name with `*` or `?` counts only in the segment before the file, never behind it.
  for (const [text, want] of [
    ['cat dsh-coordinator*x/state.json', file],
    ['cat a/dsh-coordinator?x/owner.lock', file],
    ['cat dsh-coordinatorx/state.json', undefined],
    ['cat x/state.json/dsh-coordinator*', undefined],
    ['cat /state.json/state.json dsh-coordinator*', undefined],
    ['cat dsh-coordinator*/a/state.json', file],
    ['cat dsh-coordinator*/a/b/state.json', undefined],
  ] as const) assert.equal(innerMatch(text), want, text)
  // The review's input took 3.5 s when the middle of the pattern was open-ended. The audit's input (F3, the last
  // two: many files, then one name at the far end) took 3.4 s at 2 MB while each file was searched on to the end.
  for (const text of [`dsh-coordinator ${'storages/'.repeat(30_000)}`, `storages/${'dsh-coordinator*'.repeat(20_000)}x`, 'dsh-coordinator*'.repeat(20_000), 'dsh-coordinator'.repeat(20_000),
    `${'/state.json'.repeat(190_000)}dsh-coordinator`, `${'/owner.lock'.repeat(190_000)}dsh-coordinator*`]) {
    const started = performance.now()
    innerMatch(text)
    textMatch(text, env, [CWD])
    assert.ok(performance.now() - started < 500, `${text.slice(0, 40)}... took ${Math.round(performance.now() - started)} ms`)
  }
})

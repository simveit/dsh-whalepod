/**
 * The state-folder guard on a real folder tree (review of decision 70, G1 to G5 and the lows): every spelling here
 * is first opened through the operating system, to show that it does lead to the state file, and then given to the
 * guard with the real filesystem (`nodeGuardFs`). The tree is a stand-in home under `tests/_scratch/`; the real dsh
 * home is never touched. Cases that need a macOS volume (the data-volume alias, volfs) or a volume that ignores
 * letter case are skipped elsewhere.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, linkSync, mkdirSync, readFileSync, renameSync, statSync, symlinkSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { nodeGuardFs } from '../src/host/cwd-guard.ts'
import { checkCall, type GuardDenial, type StateGuardEnv } from '../src/host/home-guard.ts'
import { scratch } from './harness.ts'

interface Tree { home: string; state: string; project: string; env: StateGuardEnv; check: (name: string, args: unknown, cwds?: string[]) => GuardDenial | undefined }

/** A home folder with a dsh home, the plugin's state folder, a skill, another plugin's storage and a project. */
function tree(name: string): Tree {
  const home = join(scratch(name), 'H')
  const state = join(home, '.dsh', 'storages', 'dsh-coordinator')
  const project = join(home, 'proj')
  for (const dir of [state, join(home, '.dsh', 'skills', 'review'), join(home, '.dsh', 'storages', 'other'), join(project, 'src')]) mkdirSync(dir, { recursive: true })
  writeFileSync(join(state, 'state.json'), '{"executorPrompt":"secret"}\n')
  writeFileSync(join(state, 'owner.lock'), '1\n')
  writeFileSync(join(home, '.dsh', 'skills', 'review', 'SKILL.md'), '---\nname: review\n---\n')
  writeFileSync(join(home, '.dsh', 'storages', 'other', 'data.json'), '{}\n')
  writeFileSync(join(home, '.dsh', '.credentials.yaml'), 'x\n')
  writeFileSync(join(project, 'src', 'a.ts'), 'x\n')
  const env: StateGuardEnv = { home, roots: [state], fs: nodeGuardFs }
  return { home, state, project, env, check: (tool, args, cwds = [project]) => checkCall({ name: tool, args, cwds }, env) }
}

/** Whether the operating system opens this spelling as the state file (`~` as dsh expands it). */
function opensStateFile(path: string, home: string): boolean {
  try {
    return readFileSync(path.startsWith('~') ? home + path.slice(1) : path, 'utf8').includes('executorPrompt')
  } catch {
    return false
  }
}

const ALIAS = '/System/Volumes/Data'

test('G1: the macOS data-volume alias and a different letter case lead to the state folder and are refused', (t) => {
  const { home, state, check } = tree('sg-alias')
  const caseless = existsSync(join(home, '.DSH', 'Storages', 'DSH-Coordinator', 'STATE.JSON'))
  if (caseless) {
    for (const file_path of [join(home, '.dsh', 'storages', 'DSH-Coordinator', 'state.json'), join(home, '.DSH', 'Storages', 'dsh-coordinator', 'STATE.JSON'), join(home, '.dsh', 'storages', 'dſh-coordinator', 'state.json')]) {
      if (!opensStateFile(file_path, home)) continue
      assert.equal(check('read', { file_path })?.kind, 'plugin-state', file_path)
      assert.equal(check('write', { file_path, content: '{}' })?.kind, 'plugin-state', file_path)
    }
    // A file that does not exist yet in the folder under another case.
    assert.equal(check('write', { file_path: join(home, '.dsh', 'Storages', 'DSH-Coordinator', 'new.json'), content: '{}' })?.kind, 'plugin-state')
    assert.equal(check('working_directory', { cd: join(home, '.dsh', 'storages', 'DSH-Coordinator') })?.kind, 'plugin-state')
    assert.equal(check('apply_patch', { input: `*** Begin Patch\n*** Update File: ${home}/.dsh/storages/DSH-Coordinator/state.json\n@@\n-a\n+b\n*** End Patch` })?.kind, 'plugin-state')
    assert.equal(check('read', { file_path: join(home, '.DSH', 'Skills', 'review', 'SKILL.md') }), undefined)
  }
  const aliased = process.platform === 'darwin' && opensStateFile(join(ALIAS + state, 'state.json'), home)
  if (!aliased) { t.diagnostic(`data-volume alias not available here (${process.platform}); only the letter-case rows ran: ${caseless}`); return }
  // The review's calls: no symlink is involved, so `realpath` keeps the alias, and the text holds no known spelling.
  assert.equal(nodeGuardFs.realpath(ALIAS + state), ALIAS + state)
  assert.equal(check('grep', { pattern: 'executorPrompt', path: `${ALIAS}${home}/.dsh/storages` })?.above, true)
  assert.equal(check('glob', { pattern: '**/*', path: `${ALIAS}${home}/.dsh` })?.above, true)
  for (const path of [ALIAS, '/System/Volumes', '/System', `${ALIAS}${home}`]) assert.equal(check('grep', { pattern: 'x', path })?.above, true, path)
  for (const name of ['DSH-Coordinator', 'dsh-coordinator']) {
    const file_path = `${ALIAS}${home}/.dsh/storages/${name}/state.json`
    if (!opensStateFile(file_path, home)) continue
    assert.equal(check('read', { file_path })?.kind, 'plugin-state', file_path)
    assert.equal(check('write', { file_path, content: 'x' })?.kind, 'plugin-state', file_path)
    assert.equal(check('edit', { file_path, old_string: 'a', new_string: 'b' })?.kind, 'plugin-state', file_path)
    assert.equal(check('grep', { pattern: 'x', path: `${ALIAS}${home}/.dsh/storages/${name}` })?.kind, 'plugin-state')
  }
  assert.equal(check('write', { file_path: `${ALIAS}${home}/.dsh/storages/dsh-coordinator/not-there-yet.json`, content: 'x' })?.kind, 'plugin-state')
  assert.equal(check('grep', { pattern: 'x' }, [`${ALIAS}${home}/.dsh/storages`])?.above, true)
  assert.equal(check('subagent', { cwd: `${ALIAS}${state}`, description: 'd', name: 'n', prompt: 'p' })?.kind, 'plugin-state')
  // The rest of the dsh home under the alias is as open as under its usual name.
  for (const [tool, args] of [
    ['read', { file_path: `${ALIAS}${home}/.dsh/skills/review/SKILL.md` }],
    ['grep', { pattern: 'x', path: `${ALIAS}${home}/.dsh/skills` }],
    ['read', { file_path: `${ALIAS}${home}/.dsh/.credentials.yaml` }],
    ['glob', { pattern: '*', path: `${ALIAS}${home}/.dsh/storages/other` }],
    ['grep', { pattern: 'x', path: `${ALIAS}${home}/proj` }],
  ] as const) assert.equal(check(tool, args), undefined, `${tool} ${JSON.stringify(args)}`)
})

test('G3 and L3: `~/link/..`, a leading blank and a Unicode form are resolved the way the operating system opens them', () => {
  const { home, project, check } = tree('sg-tilde')
  symlinkSync(join(home, '.dsh', 'skills'), join(home, 'sk'))
  symlinkSync(join(home, '.dsh', 'storages', 'other'), join(home, 'link'))
  symlinkSync(join(home, '.dsh', 'storages', 'other'), join(project, 'beside'))
  mkdirSync(join(project, ' '))
  // A symlink whose name is stored decomposed (NFD), as a file made on another system may be.
  const nfd = 'café'
  symlinkSync(join(home, '.dsh', 'storages'), join(project, nfd))
  const spellings = [
    // The review's inputs (they need a volume that ignores case) and their plain forms.
    '~/sk/../Storages/dsh-coordinator/STATE.JSON',
    '~/link/../DSH-Coordinator/state.json',
    '~/sk/../storages/dsh-coordinator/state.json',
    '~/link/../dsh-coordinator/state.json',
    `${home}/link/../dsh-coordinator/state.json`,
    'beside/../dsh-coordinator/state.json',
    './beside/.././dsh-coordinator//state.json',
    // L3: dsh does not trim. With a folder named " " this relative path leaves the project and comes back down.
    ' /../../.dsh/storages/DSH-Coordinator/state.json',
    ' /../beside/../dsh-coordinator/state.json',
    // The same name in the other Unicode form.
    `${nfd}/dsh-coordinator/state.json`,
    `${nfd.normalize('NFC')}/dsh-coordinator/state.json`,
  ]
  let opened = 0
  for (const file_path of spellings) {
    const opens = opensStateFile(file_path.startsWith('~') || file_path.startsWith('/') ? file_path : `${project}/${file_path}`, home)
    if (!opens) continue
    opened++
    assert.equal(check('read', { file_path })?.kind, 'plugin-state', JSON.stringify(file_path))
    assert.equal(check('apply_patch', { input: `*** Begin Patch\n*** Delete File: ${file_path}\n*** End Patch` })?.kind, 'plugin-state', JSON.stringify(file_path))
  }
  assert.ok(opened >= 6, `the operating system opened ${opened} of the spellings`)
  // A file that does not exist yet behind the same detours, and the folder as a search root.
  assert.equal(check('write', { file_path: '~/link/../dsh-coordinator/new.json', content: '{}' })?.kind, 'plugin-state')
  assert.equal(check('grep', { pattern: 'x', path: '~/link/../dsh-coordinator' })?.kind, 'plugin-state')
  assert.equal(check('grep', { pattern: 'x', path: '~/link/..' })?.above, true)
  // The same detours to other places stay open: a sibling of the link's target, a file next to the skills folder.
  for (const file_path of ['~/link/../other/data.json', '~/sk/review/SKILL.md', 'beside/data.json', 'beside/../other/data.json', '~/sk/../.credentials.yaml', ' /../src/a.ts']) {
    assert.equal(check('read', { file_path }), undefined, JSON.stringify(file_path))
  }
  // A path that names the state folder and leaves it again is refused by the text check, as before.
  assert.equal(check('read', { file_path: `${home}/.dsh/storages/dsh-coordinator/../other/data.json` })?.kind, 'plugin-state')
})

test('G4: the working directory counts: a search without a path above the state folder, and any call inside it', () => {
  const { home, state, project, check } = tree('sg-cwd')
  const storages = join(home, '.dsh', 'storages')
  // Entering the folder is refused; entering a folder above it is not, but the search there is.
  assert.equal(check('working_directory', { cd: state })?.kind, 'plugin-state')
  assert.equal(check('working_directory', { cd: '../.dsh/storages/dsh-coordinator' })?.kind, 'plugin-state')
  assert.equal(check('subagent', { cwd: state, description: 'd', name: 'n', prompt: 'p' })?.kind, 'plugin-state')
  assert.equal(check('working_directory', { cd: storages }), undefined)
  assert.equal(check('subagent', { cwd: storages, description: 'd', name: 'n', prompt: 'p' }), undefined)
  for (const cwd of [storages, join(home, '.dsh'), home, '/']) {
    for (const [tool, args] of [['grep', { pattern: 'executorPrompt' }], ['glob', { pattern: '**/*.json' }]] as const) {
      const denial = check(tool, args, [project, cwd])
      assert.deepEqual([denial?.above, denial?.cwd], [true, true], `${tool} in ${cwd}`)
    }
    // With a path below, the same Session searches and reads as before.
    assert.equal(check('grep', { pattern: 'x', path: join(home, '.dsh', 'skills') }, [project, cwd]), undefined)
    assert.equal(check('read', { file_path: join(project, 'src', 'a.ts') }, [project, cwd]), undefined)
  }
  // From there a relative name is the state folder, also in a patch.
  assert.equal(check('read', { file_path: 'dsh-coordinator/state.json' }, [project, storages])?.kind, 'plugin-state')
  assert.equal(check('apply_patch', { input: '*** Begin Patch\n*** Add File: dsh-coordinator/x.json\n+{}\n*** End Patch' }, [project, storages])?.kind, 'plugin-state')
  assert.equal(check('bash', { command: 'cat dsh-coordinator/state.json', description: 'x' }, [project, storages])?.kind, 'plugin-state')
  // Ordinary searches are untouched: a project, the skills folder, another plugin's storage, with and without a path.
  for (const cwd of [project, join(home, '.dsh', 'skills'), join(storages, 'other')]) {
    assert.equal(check('grep', { pattern: 'x' }, [cwd]), undefined, cwd)
    assert.equal(check('glob', { pattern: '**/*' }, [project, cwd]), undefined, cwd)
    assert.equal(check('grep', { pattern: 'x', path: cwd }), undefined, cwd)
  }
  // L5: at the home folder ripgrep would skip `.dsh`, but an `include` that names it descends; refused either way.
  assert.equal(check('grep', { pattern: 'x', path: home, include: '{.dsh,*.json}' })?.above, true)
})

test('L2: a hard link and a volfs path to the state file are the same file; a copy the state file was renamed away from is not', (t) => {
  const { home, state, project, check } = tree('sg-links')
  linkSync(join(state, 'state.json'), join(project, 'hard'))
  assert.ok(opensStateFile(join(project, 'hard'), home))
  assert.equal(check('read', { file_path: join(project, 'hard') })?.kind, 'plugin-state')
  assert.equal(check('edit', { file_path: 'hard', old_string: 'a', new_string: 'b' })?.kind, 'plugin-state')
  assert.equal(check('read', { file_path: join(project, 'src', 'a.ts') }), undefined)
  const folder = statSync(state)
  const file = statSync(join(state, 'state.json'))
  const parent = statSync(join(home, '.dsh', 'storages'))
  const skills = statSync(join(home, '.dsh', 'skills'))
  const volfs = [
    `/.vol/${file.dev}/${file.ino}`,
    `/.vol/${folder.dev}/${folder.ino}/state.json`,
    `/.vol/${folder.dev}/${folder.ino}/new.json`,
    `/.vol/${parent.dev}/${parent.ino}/dsh-coordinator/state.json`,
    `/.vol/${skills.dev}/${skills.ino}/../storages/dsh-coordinator/state.json`,
  ]
  if (process.platform === 'darwin' && opensStateFile(volfs[0]!, home)) {
    for (const file_path of volfs) assert.equal(check('read', { file_path })?.kind, 'plugin-state', file_path)
    assert.equal(check('grep', { pattern: 'x', path: `/.vol/${parent.dev}/${parent.ino}` })?.above, true)
    assert.equal(check('read', { file_path: `/.vol/${skills.dev}/${skills.ino}/review/SKILL.md` }), undefined)
  } else {
    t.diagnostic(`volfs paths not available here (${process.platform})`)
  }
  // The plugin saves the state file by writing a new file and renaming it over the old one. A hard link made before
  // that keeps the old content under an identity the folder no longer has: a stale copy, documented as a limit.
  writeFileSync(join(state, 'next.tmp'), '{"executorPrompt":"newer"}\n')
  renameSync(join(state, 'next.tmp'), join(state, 'state.json'))
  assert.equal(check('read', { file_path: join(project, 'hard') }), undefined)
})

test('a state folder that does not exist yet is refused by name below the deepest folder that exists', () => {
  const { home, project, env } = tree('sg-pending')
  const later = join(home, 'dev-home', 'storages', 'dsh-coordinator')
  mkdirSync(join(home, 'dev-home'))
  symlinkSync(join(home, 'dev-home'), join(project, 'dh'))
  const check = (tool: string, args: unknown) => checkCall({ name: tool, args, cwds: [project] }, { ...env, roots: [later] })
  for (const file_path of [join(later, 'state.json'), 'dh/storages/dsh-coordinator/state.json', 'dh/../dev-home/storages/dsh-coordinator/owner.lock', join(home, 'dev-home', 'Storages', 'DSH-Coordinator', 'state.json')]) {
    assert.equal(check('write', { file_path, content: '{}' })?.kind, 'plugin-state', file_path)
  }
  assert.equal(check('glob', { pattern: '**/*', path: 'dh' })?.above, true)
  assert.equal(check('write', { file_path: 'dh/storages/other/x.json', content: '{}' }), undefined)
  assert.equal(check('write', { file_path: 'dh/notes.md', content: 'x' }), undefined)
  // Once `storages` exists, a link to it and another letter case leave no spelling for the string and text checks:
  // the name below the folder that exists decides.
  mkdirSync(join(home, 'dev-home', 'storages'))
  symlinkSync(join(home, 'dev-home', 'storages'), join(project, 'st'))
  for (const file_path of ['st/dsh-coordinator/x.json', 'st/DSH-Coordinator/x.json', 'st/./Dsh-Coordinator']) {
    assert.equal(check('write', { file_path, content: '{}' })?.kind, 'plugin-state', file_path)
  }
  assert.equal(check('grep', { pattern: 'x', path: 'st' })?.above, true)
  assert.equal(check('write', { file_path: 'st/dsh-coordinator-2/x.json', content: '{}' }), undefined)
  assert.equal(check('write', { file_path: 'st/other/x.json', content: '{}' }), undefined)
})

test('H1: a spelling longer than 4096 characters of a symlink or a hard link into the state folder is refused', () => {
  const { home, state, project, check } = tree('sg-long')
  // What an executor's shell can leave behind: names without the folder's text in them.
  symlinkSync(state, join(project, 'direct'))
  linkSync(join(state, 'state.json'), join(project, 'hl'))
  const spellings = [
    // The review's inputs.
    `${'/'.repeat(4200)}${project}/direct/state.json`,
    `/${'./'.repeat(2100)}${project.slice(1)}/hl`,
    `${'./'.repeat(2100)}direct/state.json`,
    // The hard link under a relative spelling.
    `${'./'.repeat(2100)}hl`,
  ]
  for (const file_path of spellings) {
    assert.ok(file_path.length > 4096)
    // dsh opens `resolve(cwd, path)` for a path without `..` (dsh-fs-local `localDisplayPath`).
    assert.ok(opensStateFile(resolve(project, file_path), home), `opens: ${file_path.length} characters`)
    assert.equal(check('read', { file_path })?.kind, 'plugin-state', `read, ${file_path.length} characters`)
    assert.equal(check('write', { file_path, content: 'x' })?.kind, 'plugin-state')
    assert.equal(check('edit', { file_path, old_string: 'a', new_string: 'b' })?.kind, 'plugin-state')
    assert.equal(check('apply_patch', { input: `*** Begin Patch\n*** Update File: ${file_path}\n@@\n-a\n+b\n*** End Patch` })?.kind, 'plugin-state')
  }
  assert.equal(check('grep', { pattern: 'x', path: `${'./'.repeat(2100)}direct` })?.kind, 'plugin-state')
  assert.equal(check('grep', { pattern: 'x', path: `/${'./'.repeat(2100)}${home.slice(1)}` })?.above, true)
  // The same spellings of a project file pass.
  assert.equal(check('read', { file_path: `${'./'.repeat(2100)}src/a.ts` }), undefined)
  assert.equal(check('read', { file_path: `${'/'.repeat(4200)}${project}/src/a.ts` }), undefined)
  // H5: with a NUL the operating system opens nothing; the guard refuses the call on its own.
  assert.equal(check('read', { file_path: `${project}/direct/state.json\0` })?.kind, 'bad-path')
})

test('H2: a call with deep paths that do not exist is checked in well under a second', () => {
  const { project, home, check } = tree('sg-cost')
  const timed = (label: string, limit: number, run: () => unknown): void => {
    const started = performance.now()
    run()
    const took = performance.now() - started
    assert.ok(took < limit, `${label} took ${Math.round(took)} ms`)
  }
  // The review's inputs. Before, the walk went up from the deepest part one lookup at a time: 39 ms for the first,
  // 3.6 s for the second, 3.5 s for the third.
  const deep = `${project}${'/n'.repeat(2000)}`
  timed('one path with 2 000 missing parts', 500, () => assert.equal(check('read', { file_path: deep }), undefined))
  timed('the same, relative, from two working directories', 500, () => assert.equal(check('read', { file_path: 'n/'.repeat(2000) }, [project, home]), undefined))
  timed('100 such paths', 1000, () => assert.equal(check('some_mcp_tool', { paths: Array.from({ length: 100 }, (_, i) => `${project}/m${i}${'/n'.repeat(2000)}`) }), undefined))
  timed('a 270 KB shell command', 500, () => assert.equal(check('bash', { command: `dsh-coordinator ${'storages/'.repeat(30_000)}` }), undefined))
  timed('a 270 KB grep pattern', 500, () => assert.equal(check('grep', { pattern: `dsh-coordinator ${'storages/'.repeat(30_000)}`, path: project }), undefined))
  timed('a path of 1 000 `..` behind missing parts', 500, () => assert.equal(check('read', { file_path: `${project}/${'n/'.repeat(1000)}${'../'.repeat(1000)}src/a.ts` }), undefined))
  // Paths written to have many readings each (blanks around them, the other Unicode form, a `file:` prefix, two
  // working directories). Each reading of a deep path cost 1.3 ms, and nothing bounded their number: 300 such paths
  // took 3 to 4 s. A reading costs less than half now, and the budget of readings ends the check.
  timed('50 paths of eight readings each', 1000, () => assert.equal(check('some_mcp_tool', { paths: Array.from({ length: 50 }, (_, i) => ` e\u0301${i}${'/n'.repeat(1900)} `) }, [project, home]), undefined))
  timed('2 000 paths of many readings each', 1500, () => assert.equal(check('some_mcp_tool', { paths: Array.from({ length: 2000 }, (_, i) => ` file://e\u0301${i}/n `) }, [project, home])?.kind, 'too-large'))
  // The deep path is still resolved: below a symlink into the state folder it is refused.
  symlinkSync(join(home, '.dsh', 'storages'), join(project, 'st'))
  assert.equal(check('write', { file_path: `${project}/st/dsh-coordinator${'/n'.repeat(1500)}`, content: 'x' })?.kind, 'plugin-state')
  assert.equal(check('write', { file_path: `${project}/st/other${'/n'.repeat(1500)}`, content: 'x' }), undefined)
})

test('F1: a search that names no root is checked against the working directory, whatever else the call carries', () => {
  const { home, state, project, check } = tree('sg-root')
  const storages = join(home, '.dsh', 'storages')
  const refused = (tool: string, args: unknown, cwd: string): void => {
    const denial = check(tool, args, [project, cwd])
    assert.deepEqual([denial?.kind, denial?.above, denial?.cwd], ['plugin-state', true, true], `${tool} ${JSON.stringify(args)} in ${cwd}`)
  }
  // The audit's call, after `working_directory({ cd: "~/.dsh/storages" })`: only arguments dsh declares, and dsh's
  // check of `include` accepts the value. ripgrep, started there with `--glob=<include>`, prints the state file's
  // lines. The guard read `x}` as the file line of a patch, counted it as a path of the call, and skipped the
  // working directory.
  assert.ok(existsSync(join(storages, 'dsh-coordinator', 'state.json')))
  refused('grep', { pattern: 'executorPrompt|memory', include: '{*.json,\n*** Add File: x}' }, storages)
  // Its variants: the same line in a glob pattern, and an argument dsh does not declare under a path-like key.
  refused('glob', { pattern: '{**/state.json,\n*** Add File: x}' }, storages)
  refused('grep', { pattern: 'x', to: '/tmp' }, storages)
  for (const cwd of [storages, join(home, '.dsh'), home]) {
    // No path-like key but `path` makes a search rooted: each of these names a harmless place and changes nothing.
    for (const key of ['file_path', 'filePath', 'paths', 'file', 'files', 'filename', 'dir', 'directory', 'folder', 'cwd', 'cd', 'workdir', 'working_directory', 'root',
      'target', 'source', 'destination', 'dest', 'src', 'dst', 'from', 'to', 'notebook_path', 'output', 'output_path', 'input', 'input_path', 'uri']) {
      refused('grep', { pattern: 'x', [key]: project }, cwd)
      refused('glob', { pattern: '*.json', [key]: [join(project, 'src')] }, cwd)
    }
    // A pattern or an `include` with a slash in it, or with a whole path, is a filter and no root.
    refused('grep', { pattern: 'x', include: 'src/*.ts' }, cwd)
    refused('grep', { pattern: 'x', include: `${project}/**/*.ts` }, cwd)
    refused('grep', { pattern: `${project}/src/a.ts` }, cwd)
    refused('glob', { pattern: 'src/**/*.ts' }, cwd)
    refused('glob', { pattern: `${project}/**` }, cwd)
    // Arguments the tools do not declare, at any depth, and patch file lines in them.
    refused('grep', { pattern: 'x', extra: project, more: { path: project }, list: [project, { path: project }] }, cwd)
    refused('glob', { pattern: '*', note: `*** Update File: ${project}/src/a.ts` }, cwd)
    refused('grep', { pattern: `*** Begin Patch\n*** Add File: ${project}/x\n*** Move to: ${project}/y\n*** End Patch` }, cwd)
    // A `path` that is no path: not a string, or blank (dsh refuses a blank one).
    for (const path of [[project], { path: project }, 42, true, null, '', '  ', '\n']) refused('grep', { pattern: 'x', path }, cwd)
    // Search tools under other names are read the same way.
    for (const tool of ['ls', 'list', 'list_directory', 'find', 'tree', 'search']) refused(tool, { dir: project }, cwd)
    // A search that does name its root is where the root says: outside, below, and relative to that folder.
    assert.equal(check('grep', { pattern: 'x', path: project, include: '{*.json,\n*** Add File: x}' }, [project, cwd]), undefined, cwd)
    assert.equal(check('glob', { pattern: '**/*', path: join(storages, 'other') }, [project, cwd]), undefined, cwd)
    assert.equal(check('grep', { pattern: 'x', path: '.' }, [cwd])?.above, true, cwd)
  }
  assert.equal(check('grep', { pattern: 'x', path: 'other' }, [storages]), undefined)
  assert.equal(check('grep', { pattern: 'x', path: './other/' }, [project, storages]), undefined)
  assert.equal(check('grep', { pattern: 'x', path: 'other/..' }, [storages])?.above, true)
  assert.equal(check('grep', { pattern: 'x', path: 'dsh-coordinator' }, [storages])?.kind, 'plugin-state')
  assert.equal(check('glob', { pattern: '*', path: state, to: project })?.kind, 'plugin-state')
  // The same calls in a project are ordinary searches.
  assert.equal(check('grep', { pattern: 'executorPrompt|memory', include: '{*.json,\n*** Add File: x}' }), undefined)
  assert.equal(check('glob', { pattern: '{**/state.json,\n*** Add File: x}' }), undefined)
  assert.equal(check('grep', { pattern: 'x', to: '/tmp' }), undefined)
  assert.equal(check('grep', { pattern: 'x', include: 'src/*.ts' }, [project, join(storages, 'other')]), undefined)
  // A harmless argument never hides one that names the folder.
  assert.equal(check('grep', { pattern: 'x', path: project, to: state })?.kind, 'plugin-state')
  assert.equal(check('grep', { pattern: 'x', path: project, include: `*** Add File: ${state}/x` })?.kind, 'plugin-state')
  // A call whose working directory is not known is checked as one made in the home folder.
  assert.deepEqual([check('grep', { pattern: 'x' }, [])?.above, check('grep', { pattern: 'x' }, [])?.cwd], [true, true])
  assert.equal(check('grep', { pattern: 'x', path: project }, []), undefined)
  assert.equal(check('read', { file_path: join(project, 'src', 'a.ts') }, []), undefined)
})

test('F2: a path is checked as it is opened: `file://link/x` is a relative path, and ripgrep does not expand `~`', () => {
  const { home, state, project, check } = tree('sg-literal')
  // What an executor's shell can leave behind: a folder named `file:` with a link in it, a link named `file:st`, and
  // a folder named `~` with a link in it.
  mkdirSync(join(project, 'file:', 'notes'), { recursive: true })
  writeFileSync(join(project, 'file:', 'notes', 'a.md'), 'x\n')
  symlinkSync(state, join(project, 'file:', 'link'))
  symlinkSync(state, join(project, 'file:st'))
  mkdirSync(join(project, '~', 'plain'), { recursive: true })
  symlinkSync(state, join(project, '~', 's'))
  // dsh's file tools open `resolve(cwd, path)` after replacing a leading `~`; they take nothing off the front.
  for (const file_path of ['file://link/state.json', 'file:/link/state.json', 'file:///link/state.json', './file://link/state.json', 'file:st/state.json']) {
    assert.ok(opensStateFile(resolve(project, file_path), home), `opens: ${file_path}`)
    assert.equal(check('read', { file_path })?.kind, 'plugin-state', file_path)
    assert.equal(check('read_image', { file_path })?.kind, 'plugin-state', file_path)
    assert.equal(check('edit', { file_path, old_string: 'a', new_string: 'b' })?.kind, 'plugin-state', file_path)
    assert.equal(check('apply_patch', { input: `*** Begin Patch\n*** Update File: ${file_path}\n@@\n-a\n+b\n*** End Patch` })?.kind, 'plugin-state', file_path)
  }
  assert.equal(check('write', { file_path: 'file://link/new.json', content: '{}' })?.kind, 'plugin-state')
  assert.equal(check('apply_patch', { input: '*** Begin Patch\n*** Add File: file://link/x.json\n+{}\n*** End Patch' })?.kind, 'plugin-state')
  assert.equal(check('grep', { pattern: 'x', path: 'file://link' })?.kind, 'plugin-state')
  assert.equal(check('glob', { pattern: '*', path: 'file:st' })?.kind, 'plugin-state')
  assert.equal(check('working_directory', { cd: 'file://link' })?.kind, 'plugin-state')
  // ripgrep gets the `path` of `glob` and `grep` as written: `~/s` is the folder `~` of the working directory.
  assert.ok(opensStateFile(join(project, '~', 's', 'state.json'), home))
  assert.equal(check('grep', { pattern: 'executorPrompt', path: '~/s' })?.kind, 'plugin-state')
  assert.equal(check('glob', { pattern: '*.json', path: '~/s' })?.kind, 'plugin-state')
  assert.equal(check('grep', { pattern: 'x', path: '~/s/..' })?.above, true)
  // The reading as a URL still counts, for a tool that takes one.
  for (const uri of [`file://${state}/state.json`, `file:${state}/state.json`, `FILE://${state}/state.json`, `file://localhost${state}/state.json`,
    `file://${home}/.dsh/storages/dsh%2Dcoordinator/state.json`, `file://${home}/.dsh/storages/%64sh-coordinator`]) {
    assert.equal(check('mcp__files__read', { uri })?.kind, 'plugin-state', uri)
    assert.equal(check('read', { file_path: uri })?.kind, 'plugin-state', uri)
  }
  // Ordinary files behind the same spellings stay open.
  for (const file_path of ['file://notes/a.md', 'file:/notes/a.md', `file://${project}/src/a.ts`, '~/plain/a.md', '~/proj/src/a.ts', 'file://link/../other/data.json']) {
    assert.equal(check('read', { file_path }), undefined, file_path)
  }
  assert.equal(check('grep', { pattern: 'x', path: '~/plain' }), undefined)
  assert.equal(check('grep', { pattern: 'x', path: 'file://notes' }), undefined)
  assert.equal(check('mcp__files__read', { uri: `file://${project}/src/a.ts` }), undefined)
})

test('F3: the text check reads 2 MB in well under a second, whatever the text', () => {
  const { home, project, check } = tree('sg-text-cost')
  const storages = join(home, '.dsh', 'storages')
  const size = 2 * 1024 * 1024
  const fill = (unit: string, tail = ''): string => unit.repeat(Math.ceil(size / unit.length)) + tail
  const texts: [string, string][] = [
    // The audit's input: every `/state.json` searched on to the one name at the far end. 2.1 MB took 3.4 s.
    ['many files, then the name', fill('/state.json', 'dsh-coordinator')],
    ['the name, then many files', `dsh-coordinator${fill('/state.json')}`],
    ['many lock files, then the name', fill('/owner.lock', 'dsh-coordinator')],
    ['files in segments, then the name with a star', fill('x/state.json', 'dsh-coordinator*')],
    ['the name with a star, many times', fill('dsh-coordinator*')],
    ['the name with runs of dots and hyphens', fill(`dsh-coordinator${'-.'.repeat(50)}`)],
    ['storages, then the name behind question marks', `storages/${fill('????dsh-coordinator')}`],
    ['storages many times, then the name', fill('storages/', 'dsh-coordinator')],
    ['the name, then stars and files', `dsh-coordinator${fill('*state.json')}`],
    ['the name, then patch-like lines', `dsh-coordinator\n${fill(`*** ${' '.repeat(200)}\n`)}`],
    ['the name glued to a longer one, many times', fill('dsh-coordinatorx ')],
  ]
  for (const [label, text] of texts) {
    assert.ok(text.length >= size)
    for (const [tool, args] of [['bash', { command: text }], ['grep', { pattern: text, path: project }], ['mcp__notes__add', { note: text }], ['grep', { pattern: 'x', include: text }]] as const) {
      const started = performance.now()
      check(tool, args, [project, storages])
      const took = performance.now() - started
      assert.ok(took < 500, `${label}, ${tool}: ${Math.round(took)} ms`)
    }
  }
  // The texts that name the folder are still refused, and the others pass.
  assert.equal(check('bash', { command: fill('/state.json', ' cat dsh-coordinator/state.json') })?.kind, 'plugin-state')
  assert.equal(check('bash', { command: `cat ${fill('x/', 'dsh-coordinator*/state.json')}` })?.kind, 'plugin-state')
  assert.equal(check('bash', { command: fill('/state.json', 'dsh-coordinator') }), undefined)
})

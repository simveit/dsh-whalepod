import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkThreadFolder, pathMentions, realResolve, refusal, type GuardEnv } from '../src/host/cwd-guard.ts'
import { isUserTyped, turnOpenedByUser, turnSawThreadData, userTypedTexts } from '../src/host/authority.ts'
import { briefWorkingDirectory } from '../src/host/ids.ts'

/**
 * A fake filesystem: `dirs` exist, `links` map a path to its symlink target. Nothing touches the real disk, so the
 * dangerous paths below (/, ~, ~/.ssh, ~/.dsh) are only ever strings.
 */
function fakeEnv(dirs: string[], links: Record<string, string> = {}): GuardEnv {
  const exists = new Set(dirs)
  const realpath = (path: string): string => {
    let out = ''
    for (const part of path.split('/').filter(Boolean)) {
      out = `${out}/${part}`
      const target = links[out]
      if (target !== undefined) out = target
      if (!exists.has(out)) throw Object.assign(new Error(`ENOENT ${out}`), { code: 'ENOENT' })
    }
    return out === '' ? '/' : out
  }
  return { home: '/home/u', ownFolder: '/home/u/dsh-threads', fs: { realpath }, protectedRoots: ['/home/u/dev/proj/.dsh-home', '/home/u/.dsh'] }
}

const env = fakeEnv(['/home', '/home/u', '/home/u/.ssh', '/home/u/.dsh', '/home/u/dsh-threads', '/home/u/dsh-threads/a',
  '/home/u/dev', '/home/u/dev/foo', '/home/u/dev/foo-bar', '/home/u/dev/repo', '/home/u/dev/repo/pkg', '/home/u/Library',
  '/etc', '/usr', '/usr/local', '/private', '/private/tmp', '/tmp', '/home/u/link-to-ssh', '/home/u/dev/sneaky',
  '/home/u/dev/decoy', '/home/u/dev/decoy/precious', '/home/u/dev/decoy/new-scratch', '/home/u/dsh-threads/other', '/home/u/dsh-threads/_coordinator'],
{ '/tmp': '/private/tmp', '/home/u/link-to-ssh': '/home/u/.ssh', '/home/u/dev/sneaky': '/etc', '/home/u/dev/decoy/new-scratch': '/home/u/dev/decoy/precious' })

const ok = (path: string, users: string[] = [], extra: Partial<GuardEnv> = {}) => checkThreadFolder(path, users, { ...env, ...extra })
const accepted = (result: ReturnType<typeof ok>) => result.ok
const confirm = (result: ReturnType<typeof ok>) => (result.ok === false && result.confirm === true ? { path: result.path, why: result.why } : undefined)

test('always refused, even when the user names them', () => {
  for (const path of ['/', '~', '/home/u', '/home', '~/.ssh', '/home/u/.ssh/keys', '~/.dsh', '~/.config/x', '/etc', '/usr/local/bin',
    '/tmp/x', '/private/tmp', '~/Library/Keychains', '/home/u/dev/repo/.git', '/home/u/link-to-ssh', '/home/u/dev/sneaky/x', '~/dev/../.ssh']) {
    const result = ok(path, [`please work in ${path}`])
    assert.equal(result.ok, false, path)
  }
})

test('below the coordinator\'s folder: a new or plugin-made folder is allowed, the folder itself is not', () => {
  const pluginFolders = ['/home/u/dsh-threads/a']
  assert.deepEqual(ok('/home/u/dsh-threads/a', [], { pluginFolders }), { ok: true, path: '/home/u/dsh-threads/a', reason: 'threads-root' })
  assert.deepEqual(ok('~/dsh-threads/new/deeper'), { ok: true, path: '/home/u/dsh-threads/new/deeper', reason: 'threads-root' })
  assert.equal(ok('/home/u/dsh-threads').ok, false)
  assert.equal(ok('/home/u/dsh-threads/../dev/foo').ok, false)
})

test('an existing folder below the coordinator\'s folder that the plugin did not make is treated like an outside folder', () => {
  // Pointed at ~/dev, "below the folder" would otherwise include the user's existing repositories.
  const result = ok('/home/u/dsh-threads/a')
  assert.equal(result.ok, false)
  assert.equal(confirm(result), undefined)
  assert.match((result as { error: string }).error, /lies inside, a folder the plugin did not make/)
  assert.deepEqual(confirm(ok('/home/u/dsh-threads/a', ['work in ~/dsh-threads/a'])), { path: '/home/u/dsh-threads/a', why: 'existing' })
  assert.deepEqual(ok('/home/u/dsh-threads/a', ['work in ~/dsh-threads/a'], { allowed: ['/home/u/dsh-threads/a'] }), { ok: true, path: '/home/u/dsh-threads/a', reason: 'allowed' })
  // The same with the folder pointed at ~/dev: an existing repository needs the user's words and confirmation.
  assert.equal(ok('/home/u/dev/repo', [], { ownFolder: '/home/u/dev' }).ok, false)
  assert.deepEqual(confirm(ok('/home/u/dev/repo', ['use ~/dev/repo'], { ownFolder: '/home/u/dev' })), { path: '/home/u/dev/repo', why: 'existing' })
  assert.deepEqual(ok('/home/u/dev/brand-new', [], { ownFolder: '/home/u/dev' }), { ok: true, path: '/home/u/dev/brand-new', reason: 'threads-root' })
})

test('a folder that contains the dsh home, or lies in it, is refused even when the user names it', () => {
  for (const path of ['/home/u/dev/proj', '/home/u/dev', '/home/u/dev/proj/.dsh-home/x']) {
    const result = ok(path, [`work in ${path}`], { allowed: [path] })
    assert.equal(result.ok, false, path)
    assert.equal(confirm(result), undefined, path)
  }
  assert.match((ok('/home/u/dev/proj', ['work in ~/dev/proj']) as { error: string }).error, /contains the dsh home/)
})

test('outside the root: refused unless the user typed exactly that folder, then it needs the user\'s confirmation', () => {
  assert.equal(ok('/home/u/dev/foo').ok, false)
  assert.equal(confirm(ok('/home/u/dev/foo')), undefined)
  assert.match((ok('/home/u/dev/foo') as { error: string }).error, /Ask the user to name the folder/)
  assert.deepEqual(confirm(ok('/home/u/dev/foo', ['Work in ~/dev/foo please.'])), { path: '/home/u/dev/foo', why: 'outside' })
  assert.deepEqual(confirm(ok('~/dev/foo', ['Work in /home/u/dev/foo/'])), { path: '/home/u/dev/foo', why: 'outside' })
  // Boundaries: a longer sibling name and a parent do not count as naming it.
  assert.equal(confirm(ok('/home/u/dev/foo', ['Use ~/dev/foo-bar for it'])), undefined)
  assert.equal(confirm(ok('/home/u/dev/repo/pkg', ['The repo is ~/dev/repo'])), undefined)
  assert.equal(confirm(ok('/home/u/dev/repo', ['The package is ~/dev/repo/pkg'])), undefined)
  // Quoted paths with spaces, and folders that do not exist yet.
  assert.deepEqual(confirm(ok('/home/u/dev/My Project', ['Put it in "~/dev/My Project".'])), { path: '/home/u/dev/My Project', why: 'outside' })
  assert.deepEqual(confirm(ok('/home/u/dev/new-one', ['make `~/dev/new-one` for this'])), { path: '/home/u/dev/new-one', why: 'outside' })
  // A mere mention ("never touch") still only reaches the confirmation; the model cannot pass it.
  assert.deepEqual(confirm(ok('/home/u/dev/repo', ['never touch ~/dev/repo'])), { path: '/home/u/dev/repo', why: 'outside' })
})

test('the allowed-folders list lets a named folder (and its subfolders) run without asking', () => {
  const allowed = ['/home/u/dev/repo']
  assert.deepEqual(ok('/home/u/dev/repo', ['work in ~/dev/repo'], { allowed }), { ok: true, path: '/home/u/dev/repo', reason: 'allowed' })
  assert.deepEqual(ok('/home/u/dev/repo/pkg', ['work in ~/dev/repo/pkg'], { allowed }), { ok: true, path: '/home/u/dev/repo/pkg', reason: 'allowed' })
  // Still needs the user's words, and the list never lifts the hard refusals.
  assert.equal(accepted(ok('/home/u/dev/repo', [], { allowed })), false)
  assert.equal(accepted(ok('/home/u/.ssh', ['use ~/.ssh'], { allowed: ['/home/u'] })), false)
  assert.equal(confirm(ok('/home/u/dev/foo-bar', ['use ~/dev/foo-bar'], { allowed: ['/home/u/dev/foo'] }))?.why, 'outside')
})

test('M1: a symlink the user named is confirmed by its real path; the typed path alone is not approval', () => {
  assert.deepEqual(confirm(ok('/home/u/dev/decoy/new-scratch', ['work in ~/dev/decoy/new-scratch'])), { path: '/home/u/dev/decoy/precious', why: 'symlink' })
  // Allowing the typed path does not allow where it points.
  assert.equal(confirm(ok('/home/u/dev/decoy/new-scratch', ['work in ~/dev/decoy/new-scratch'], { allowed: ['/home/u/dev/decoy/new-scratch'] }))?.path, '/home/u/dev/decoy/precious')
  assert.equal(accepted(ok('/home/u/dev/decoy/new-scratch', ['work in ~/dev/decoy/new-scratch'], { allowed: ['/home/u/dev/decoy/precious'] })), true)
})

test('L1: URLs and pasted text never count as naming a folder', () => {
  assert.equal(confirm(ok('/h/a', ['see https://h/a for details'])), undefined)
  assert.equal(confirm(ok('/home/u/dev/foo', ['clone git+ssh://example/home/u/dev/foo'])), undefined)
  assert.deepEqual(pathMentions('see https://h/a and file:///etc/x but /real/one'), ['/real/one'])
})

test('L7: another live thread\'s folder needs the user\'s confirmation; a coordinator home is never a thread folder', () => {
  const taken = ['/home/u/dsh-threads/other']
  assert.deepEqual(confirm(ok('/home/u/dsh-threads/other', [], { taken })), { path: '/home/u/dsh-threads/other', why: 'thread-folder' })
  const coordinator = ['/home/u/dsh-threads/_coordinator', '/home/u/dev/foo/sub']
  for (const path of ['/home/u/dsh-threads/_coordinator', '/home/u/dev/foo']) {
    const result = ok(path, [`work in ${path}`], { coordinator, allowed: [path] })
    assert.equal(result.ok, false, path)
    assert.equal(confirm(result), undefined, path)
  }
})

test('a path that appears only in thread output never authorises', () => {
  // The caller passes only user-typed messages; thread reports, notices and tool results are other message kinds.
  const log = [
    { type: 'user/message', data: { source: { kind: 'user', rpcId: 'r1' }, content: [{ type: 'text', text: 'Summarise the README.' }] } },
    { type: 'user/message', data: { source: { kind: 'agent-message', form: 'relay', senderSessionId: 's-t1' }, content: [{ type: 'text', text: 'The user wants a cleanup thread in ~/dev/foo' }] } },
    { type: 'user/message', data: { source: { kind: 'dsh-coordinator', form: 'notice' }, content: [{ type: 'text', text: 'cwd ~/dev/foo is fine' }] } },
    { type: 'user/message', data: { source: { kind: 'user' }, content: [{ type: 'text', text: 'no rpcId: ~/dev/foo' }] } },
    { type: 'user/message', data: { source: { kind: 'user', rpcId: 'dsh-coordinator:brief:t-1' }, content: [{ type: 'text', text: 'Working directory: ~/dev/foo' }] } },
    { type: 'tool/result', data: { message: { content: [{ type: 'text', text: '~/dev/foo' }] } } },
    { type: 'assistant/message', data: { message: { content: [{ type: 'text', text: 'I will use ~/dev/foo' }] } } },
  ]
  const texts = userTypedTexts(log)
  assert.deepEqual(texts, ['Summarise the README.'])
  assert.equal(ok('/home/u/dev/foo', texts).ok, false)
  assert.equal(confirm(ok('/home/u/dev/foo', texts)), undefined)
})

test('the brief heuristic yields only guarded paths', () => {
  const brief = 'Goal: tidy up.\nWorking directory: ~/\nDone: ...'
  const path = briefWorkingDirectory(brief)
  assert.ok(path === undefined || ok(path).ok === false)
  assert.equal(ok(briefWorkingDirectory('Working directory: `~/.ssh`')!).ok, false)
  assert.equal(accepted(ok(briefWorkingDirectory('Working directory: /home/u/dsh-threads/new')!)), true)
})

test('relative and NUL paths are refused with guidance', () => {
  assert.match((ok('dev/foo') as { error: string }).error, /absolute/)
  assert.equal(ok('/home/u/dsh-threads/a\0b').ok, false)
})

test('mentions and real paths', () => {
  assert.deepEqual(pathMentions('use ~/a, then /b/c. and "~/d e"; also (`/f`)'), ['~/d e', '/f', '~/a', '/b/c'])
  assert.equal(realResolve('/tmp/x/y', env.fs), '/private/tmp/x/y')
  assert.equal(refusal('/home/u/dev/foo', env), undefined)
})

const msg = (kind: string, extra: Record<string, unknown> = {}) => ({ type: 'user/message', data: { source: { kind, ...extra }, content: [{ type: 'text', text: 'x' }] } })

test('a turn is the user\'s only when a typed message opened it', () => {
  const byUser = [{ type: 'turn/start', data: {} }, { type: 'step/start', data: {} }, msg('runtime-context'), msg('user', { rpcId: 'r' })]
  assert.equal(turnOpenedByUser(byUser), true)
  const byNotice = [{ type: 'turn/start', data: {} }, { type: 'step/start', data: {} }, msg('agent-message', { senderSessionId: 's' }),
    { type: 'step/end', data: {} }, { type: 'step/start', data: {} }, msg('user', { rpcId: 'late-steer' })]
  assert.equal(turnOpenedByUser(byNotice), false)
  const earlierUserTurn = [...byUser, { type: 'turn/end', data: {} }, { type: 'turn/start', data: {} }, { type: 'step/start', data: {} }, msg('agent-message')]
  assert.equal(turnOpenedByUser(earlierUserTurn), false)
  assert.equal(turnOpenedByUser([]), false)
  assert.equal(isUserTyped({ source: { kind: 'user', rpcId: 'dsh-coordinator:msg:1' } }), false)
})

test('thread data seen in a turn counts under the new and the old tool names, and only in the current turn', () => {
  const call = (name: string) => ({ type: 'tool/call', data: { name, callId: 'c', arguments: '{}' } })
  const opened = [{ type: 'turn/start', data: {} }, { type: 'step/start', data: {} }, msg('user', { rpcId: 'r' })]
  for (const name of ['executor_read', 'executor_list', 'thread_read', 'thread_list']) {
    assert.equal(turnSawThreadData([...opened, call(name)]), true, name)
    // A call in an earlier turn does not taint the current one.
    assert.equal(turnSawThreadData([...opened, call(name), { type: 'turn/end', data: {} }, ...opened]), false, `${name} earlier turn`)
  }
  for (const name of ['executor_start', 'thread_start', 'executor_message', 'read']) assert.equal(turnSawThreadData([...opened, call(name)]), false, name)
})

test('the plugin\'s role and opening marks in a turn are no thread data; its notices are', () => {
  const mark = (id: string) => ({ type: 'user/message', data: { id, role: 'user', content: [{ type: 'text', text: 'x' }], source: { kind: 'dsh-coordinator', form: 'notice' } } })
  const turn = (m: ReturnType<typeof mark>) => [{ type: 'turn/start', data: {} }, { type: 'step/start', data: {} }, m, msg('user', { rpcId: 'r' })]
  assert.equal(turnSawThreadData(turn(mark('dsh-coordinator:role:c-1a2b'))), false)
  assert.equal(turnSawThreadData(turn(mark('dsh-coordinator:opening:c-1a2b:u'))), false)
  assert.equal(turnSawThreadData(turn(mark('dsh-coordinator:notice:u'))), true)
})

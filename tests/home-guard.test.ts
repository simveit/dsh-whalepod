/**
 * The dsh-home guard (G1): path arguments after normalisation and symlink resolution, the conservative text check
 * of commands, the Ask me temp-write rule, and false positives that must stay allowed. Paths are checked against an
 * injected home and fake filesystem only; nothing here touches the real dsh home.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkCall, denialReason, textMatch, type HomeGuardEnv } from '../src/host/home-guard.ts'

const HOME = '/Users/u'
/** Fake filesystem: existing paths, and symlinks (`/Users/u/link-to-dsh` -> `/Users/u/.dsh`). */
const LINKS: Record<string, string> = {
  '/Users/u/link-to-dsh': '/Users/u/.dsh',
  '/Users/u/work/innocent': '/Users/u/dev/proj/.dsh-home',
  '/tmp': '/private/tmp',
}
const EXISTS = new Set(['/', '/Users', '/Users/u', '/Users/u/.dsh', '/Users/u/dev', '/Users/u/dev/proj', '/Users/u/dev/proj/.dsh-home',
  '/Users/u/dev/proj/threads', '/Users/u/dev/proj/threads/t1', '/private', '/private/tmp', '/var', '/var/folders', '/var/folders/xy', '/Users/u/work'])
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

const env: HomeGuardEnv = { home: HOME, roots: ['/Users/u/dev/proj/.dsh-home', '/Users/u/.dsh'], temp: ['/tmp', '/var/folders/xy'], fs }
const CWD = '/Users/u/dev/proj/threads/t1'
const call = (name: string, args: unknown, askMode = false) => checkCall({ name, args, cwds: [CWD], ownFolder: CWD, askMode }, env)

test('file tools: protected paths are denied after ~ expansion, normalisation and symlink resolution', () => {
  const denied = [
    ['read', { file_path: '/Users/u/.dsh/.credentials.yaml' }],
    ['read', { file_path: '~/.dsh/.credentials.yaml' }],
    ['read', { file_path: '/Users/u/dev/../.dsh/sessions/x.jsonl' }],
    ['read', { file_path: '/Users/u//.dsh' }],
    ['read', { file_path: '../../.dsh-home/storages/dsh-coordinator/state.json' }],
    ['read', { file_path: '/Users/u/link-to-dsh/profiles' }],
    ['read', { file_path: '/Users/u/work/innocent/.credentials.yaml' }],
    ['write', { file_path: '/Users/u/dev/proj/.dsh-home/x', content: 'x' }],
    ['glob', { pattern: '**/*', path: '/Users/u' }],
    ['grep', { pattern: 'token', path: '/Users/u/dev/proj' }],
    ['read', { file_path: 'file:///Users/u/.dsh/.credentials.yaml' }],
    ['some_mcp_tool', { paths: ['/ok', '/Users/u/.dsh/x'] }],
  ] as const
  for (const [name, args] of denied) assert.equal(call(name, args)?.kind, 'dsh-home', `${name} ${JSON.stringify(args)}`)
})

test('shell and other text: common spellings are denied', () => {
  const commands = [
    'ls ~/.dsh',
    'cat ~/.dsh/.credentials.yaml',
    'cat $HOME/.dsh/.credentials.yaml',
    'cat "${HOME}/.dsh/profiles/web/x"',
    'ls $DSH_HOME/sessions',
    'echo ${DSH_HOME}',
    'cp /Users/u/dev/proj/.dsh-home/.credentials.yaml .',
    'tar cf - ../../.dsh-home | base64',
    'cd ~ && cat .dsh/.credentials.yaml',
    'find / -path "*/.dsh/*"',
    'ls -la ~/.dsh*',
    'cat ~/dev/proj/.dsh-home/sessions/a/b.jsonl > /tmp/x',
  ]
  for (const command of commands) {
    assert.equal(call('bash', { command, description: 'x' })?.kind, 'dsh-home', command)
  }
  assert.equal(call('terminal_send', { input: 'cat ~/.dsh/.credentials.yaml\n' })?.kind, 'dsh-home')
  assert.equal(call('web_fetch', { url: 'file:///Users/u/.dsh/.credentials.yaml' })?.kind, 'dsh-home')
})

test('false positives stay allowed', () => {
  const allowed = [
    ['bash', { command: 'ls ~/dev/dsh && cd ~/dev/dsh/src && make', description: 'x' }],
    ['bash', { command: 'cat notes/.dsh-home-notes/todo.md', description: 'x' }],
    ['bash', { command: 'cat /Users/u/dev/proj/.dsh-home-notes/x', description: 'x' }],
    ['bash', { command: 'grep -r "dsh" src/ && echo $DSH_HOMEPAGE', description: 'x' }],
    ['bash', { command: 'vim ~/.dshrc; cat my.dsh foo.dsh', description: 'x' }],
    ['read', { file_path: '/Users/u/dev/dsh/README.md' }],
    ['read', { file_path: 'src/.dsh-home-notes' }],
    ['read', { file_path: '/Users/u/dev/proj/threads/t1/x.txt' }],
    ['glob', { pattern: '**/*.ts', path: CWD }],
    ['grep', { pattern: 'dsh', path: '/Users/u/dev/proj/threads' }],
    ['write', { file_path: `${CWD}/out.txt`, content: 'we never read ~/.dsh here' }],
  ] as const
  for (const [name, args] of allowed) assert.equal(call(name, args), undefined, `${name} ${JSON.stringify(args)}`)
  // Text-only tools are not searched (a brief may mention the folder it must not touch).
  assert.equal(call('thread_start', { title: 'x', brief: 'Never touch ~/.dsh.' }), undefined)
  assert.equal(call('coordinator_report', { kind: 'result', text: 'I did not read ~/.dsh' }), undefined)
  assert.equal(call('ask_user_question', { questions: [{ question: 'May I read ~/.dsh?' }] }), undefined)
})

test('Ask me: file-write tools may not write to the system temp folders outside the thread folder', () => {
  assert.equal(call('write', { file_path: '/tmp/decoded.txt', content: 'x' }, true)?.kind, 'temp-write')
  assert.equal(call('write', { file_path: '/private/tmp/decoded.txt', content: 'x' }, true)?.kind, 'temp-write')
  assert.equal(call('edit', { file_path: '/var/folders/xy/T/a', old_string: 'a', new_string: 'b' }, true)?.kind, 'temp-write')
  // Not in auto mode (auto review decides), not for reads, not inside the thread folder.
  assert.equal(call('write', { file_path: '/tmp/decoded.txt', content: 'x' }, false), undefined)
  assert.equal(call('read', { file_path: '/tmp/x' }, true), undefined)
  assert.equal(call('write', { file_path: `${CWD}/x`, content: 'x' }, true), undefined)
})

test('textMatch: boundaries and reasons', () => {
  assert.equal(textMatch('ls ~/.dsh', env, [CWD]), '~/.dsh')
  assert.equal(textMatch('ls x/Users/u/.dsh', env, [CWD]), '.dsh')
  assert.equal(textMatch('ls ~/.dsh-backup', env, [CWD]), undefined)
  assert.equal(textMatch('plain text', env, [CWD]), undefined)
  assert.match(denialReason({ kind: 'dsh-home', match: 'x' }, 'thread'), /Executor Session agents may not access the dsh home.*ask the coordinator or the user/)
  assert.match(denialReason({ kind: 'dsh-home', match: 'x' }, 'coordinator'), /coordinator may not access the dsh home/)
})

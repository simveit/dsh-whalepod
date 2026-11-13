import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ReportKind, ThreadInfo } from '../src/types.ts'
import { findOwned, ownedBy, peersOf, unknownRefMessage, type ScopedRow } from '../src/host/scope.ts'
import { allSpellings, fillStatic, isToolName, LEGACY_TOOL, renderCoordinatorPrompt, renderThreadPrompt, ROLE, TOOL, toolKey, type ToolKey } from '../src/host/names.ts'
import { coordinatorTools, threadTools, type SessionId, type ThreadOps } from '../src/host/tools.ts'
import { COORDINATOR_NEVER, COORDINATOR_OWN, coordinatorAllow } from '../src/host/coordinator-tools.ts'
import { THREAD_DATA_TOOLS, turnSawThreadData } from '../src/host/authority.ts'
import { checkCall } from '../src/host/home-guard.ts'
import { messageRole } from '../src/host/history.ts'
import type { ToolDefinition } from '../src/host/dsh.ts'

const info = (id: string, coordinatorId: string, title: string, sessionId = `s-${id}`): ThreadInfo =>
  ({ id, sessionId, title, cwd: `/w/${id}`, status: 'idle', coordinatorId, createdAt: 1, updatedAt: 1 })
const row = (id: string, coordinatorId: string, title: string, extra: Partial<ScopedRow> = {}): ScopedRow => ({ info: info(id, coordinatorId, title), ...extra })

const rows: ScopedRow[] = [
  row('t-a1', 'c-a', 'Fix the upload test'),
  row('t-a2', 'c-a', 'Write docs'),
  row('t-a3', 'c-a', 'Write docs'),
  row('t-a4', 'c-a', 'Old work', { archived: true }),
  row('t-b1', 'c-b', 'Fix the upload test'),
  row('t-b2', 'c-b', 'Secret plan'),
  row('t-x1', '', 'Orphan'),
]

const errorOf = (fn: () => unknown): string => {
  try { fn() } catch (error) { return (error as Error).message }
  assert.fail('expected an error')
}

test('findOwned resolves id, lead session id and a unique title within the caller only', () => {
  assert.equal(findOwned(rows, 'c-a', 't-a1').info.id, 't-a1')
  assert.equal(findOwned(rows, 'c-a', ' s-t-a2 ').info.id, 't-a2')
  assert.equal(findOwned(rows, 'c-a', 'fix the UPLOAD test').info.id, 't-a1')
  // The same title in two coordinators resolves to the caller's.
  assert.equal(findOwned(rows, 'c-b', 'Fix the upload test').info.id, 't-b1')
})

test('an ambiguous title within one coordinator lists only that coordinator\'s ids', () => {
  const message = errorOf(() => findOwned(rows, 'c-a', 'Write docs'))
  assert.match(message, /several of your executor sessions are titled "Write docs" \(t-a2, t-a3\); use the id/)
  assert.doesNotMatch(message, /t-b/)
})

test('another coordinator\'s thread reads exactly like an unknown id, by id, session id or title', () => {
  for (const ref of ['t-b2', 's-t-b2', 'Secret plan']) {
    assert.equal(errorOf(() => findOwned(rows, 'c-a', ref)), unknownRefMessage(ref), ref)
  }
  assert.equal(errorOf(() => findOwned(rows, 'c-a', 't-zzzz')), unknownRefMessage('t-zzzz'))
  // Archived rows and rows without a coordinator are reachable by nobody, not even with an empty caller id.
  assert.equal(errorOf(() => findOwned(rows, 'c-a', 't-a4')), unknownRefMessage('t-a4'))
  assert.equal(errorOf(() => findOwned(rows, '', 't-x1')), unknownRefMessage('t-x1'))
  assert.equal(errorOf(() => findOwned(rows, '', 'Orphan')), unknownRefMessage('Orphan'))
  assert.equal(errorOf(() => findOwned(rows, 'c-a', '')), unknownRefMessage(''))
  assert.match(errorOf(() => findOwned(rows, 'c-a', 'x', { listTool: TOOL.peers })), /use executor_peers/)
})

test('ownedBy and peersOf stay within one coordinator', () => {
  const live = rows.filter(r => r.archived !== true).map(r => r.info)
  assert.deepEqual(ownedBy(live, 'c-a').map(t => t.id), ['t-a1', 't-a2', 't-a3'])
  assert.deepEqual(ownedBy(live, '').map(t => t.id), [])
  const withQueued = [...live, info('t-a5', 'c-a', 'Queued', '')]
  assert.deepEqual(peersOf(withQueued, 'c-a', 't-a1').map(t => t.id), ['t-a2', 't-a3'])
  assert.deepEqual(peersOf(withQueued, 'c-b', 't-b1').map(t => t.id), ['t-b2'])
  assert.deepEqual(peersOf(withQueued, '', 't-x1'), [])
})

// --- Names -------------------------------------------------------------------------------------------------------

test('renamed tool table round trip: every current and legacy name maps back to its key', () => {
  const keys = Object.keys(TOOL) as ToolKey[]
  assert.deepEqual(Object.keys(LEGACY_TOOL).sort(), [...keys].sort())
  for (const key of keys) {
    assert.equal(toolKey(TOOL[key]), key)
    assert.equal(toolKey(LEGACY_TOOL[key]), key)
    assert.ok(isToolName(LEGACY_TOOL[key], key))
  }
  assert.equal(new Set(keys.map(k => TOOL[k])).size, keys.length, 'current names are distinct')
  assert.equal(toolKey('bash'), undefined)
  assert.deepEqual(keys.map(k => TOOL[k]), ['executor_start', 'executor_message', 'executor_list', 'executor_read', 'executor_flag_user',
    'executor_stop', 'executor_archive', 'executor_peers', 'executor_send', 'coordinator_report'])
  // The registered tools carry the current names.
  const ops = fakeOps(new Map()).ops
  assert.deepEqual([...coordinatorTools(ops), ...threadTools(ops)].map(d => d.name).sort(), keys.map(k => TOOL[k]).sort())
})

test('coordinator allow list, authority and the home guard know the new and the old names', () => {
  assert.deepEqual([...COORDINATOR_OWN].sort(), ['executor_archive', 'executor_flag_user', 'executor_list', 'executor_message', 'executor_read', 'executor_start', 'executor_stop'])
  for (const name of allSpellings(['report', 'peers', 'send'])) assert.ok(COORDINATOR_NEVER.has(name), name)
  assert.deepEqual(coordinatorAllow(['executor_list', 'thread_list', 'executor_send', 'read'], ['thread_send']), ['executor_list', 'read'])
  for (const name of ['executor_read', 'executor_list', 'thread_read', 'thread_list']) assert.ok(THREAD_DATA_TOOLS.has(name), name)
  for (const name of ['thread_list', 'executor_list']) {
    const events = [{ type: 'turn/start', data: {} }, { type: 'tool/call', data: { name } }]
    assert.equal(turnSawThreadData(events), true, name)
  }
  // Text-only tools: a brief that mentions ~/.dsh is not a file access, under either name.
  const env = { home: '/home/u', roots: ['/home/u/.dsh'], temp: ['/tmp'], fs: { realpath: (p: string) => p } }
  for (const name of ['executor_start', 'thread_start', 'executor_send', 'thread_send']) {
    assert.equal(checkCall({ name, args: { brief: 'never read ~/.dsh' }, cwds: ['/w'], askMode: false }, env), undefined, name)
  }
  assert.notEqual(checkCall({ name: 'bash', args: { command: 'cat ~/.dsh/x' }, cwds: ['/w'], askMode: false }, env), undefined)
})

test('history labels agent messages from any coordinator session as the coordinator', () => {
  const context = { coordinatorSessionIds: new Set(['s-coord-a', 's-coord-a-old']) }
  for (const sender of ['s-coord-a', 's-coord-a-old']) {
    assert.equal(messageRole({ kind: 'agent-message', senderSessionId: sender }, context).role, 'coordinator')
  }
  assert.equal(messageRole({ kind: 'agent-message', senderSessionId: 's-other' }, context).role, 'other')
})

// --- Prompts -----------------------------------------------------------------------------------------------------

const promptsDir = join(import.meta.dirname, '..', 'prompts')
const raw = (name: string) => readFileSync(join(promptsDir, name), 'utf8').trim()

test('prompts render with no leftover placeholder and only the new tool names', () => {
  const coordinator = renderCoordinatorPrompt(fillStatic(raw('coordinator.md')), { folder: '/Users/u/Documents/deepseek-harness/coordinator-2' })
  const thread = renderThreadPrompt(fillStatic(raw('thread.md')), { threadId: 't-1a2b', threadTitle: 'Fix it', coordinatorTitle: 'Coordinator 2' })
  for (const text of [coordinator, thread]) {
    assert.doesNotMatch(text, /\{\{|\}\}/)
    assert.doesNotMatch(text, /\bthread_(start|message|list|read|flag_user|stop|archive|peers|send)\b/)
    assert.doesNotMatch(text, /threads root/)
    assert.doesNotMatch(text, /\u2014/, 'no em-dashes')
  }
  assert.match(coordinator, /Your own folder is `\/Users\/u\/Documents\/deepseek-harness\/coordinator-2`/)
  for (const key of ['start', 'message', 'list', 'read', 'flagUser', 'stop', 'archive', 'send', 'report'] as const) assert.match(coordinator, new RegExp(`\`${TOOL[key]}\``))
  assert.match(coordinator, new RegExp(ROLE.executorSessions))
  assert.match(coordinator, /under the same coordinator/)
  assert.match(thread, /Executor Session t-1a2b \("Fix it"\)/)
  assert.match(thread, /coordinator "Coordinator 2"/)
  assert.match(thread, /under the same coordinator/)
  for (const key of ['report', 'peers', 'send'] as const) assert.match(thread, new RegExp(`\`${TOOL[key]}\``))
  // loadPrompts leaves exactly the per-request placeholders.
  assert.deepEqual([...fillStatic(raw('coordinator.md')).matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]).sort().filter((v, i, a) => a.indexOf(v) === i), ['coordinatorFolder'])
  assert.deepEqual([...new Set([...fillStatic(raw('thread.md')).matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]))].sort(), ['coordinatorTitle', 'threadId', 'threadTitle'])
})

test('a wrong or missing placeholder fails loudly', () => {
  assert.throws(() => fillStatic('use {{tool.nope}}'), /names no tool/)
  assert.throws(() => fillStatic('the {{role.boss}}'), /names no role/)
  assert.throws(() => fillStatic('{{tool.constructor}}'), /names no tool/)
  assert.throws(() => renderThreadPrompt('{{threadId}} {{other}}', { threadId: 't', threadTitle: 'x', coordinatorTitle: 'c' }), /\{\{other\}\} was not filled/)
  assert.throws(() => renderCoordinatorPrompt('{{threadId}}', { folder: '/f' }), /was not filled/)
})

// --- Cross-coordinator refusal through the tool executor ---------------------------------------------------------

/**
 * A ThreadOps that scopes like the thread service must: the caller's coordinator from its Session, rows through
 * findOwned and peersOf. It records which ops ran, so a refused call is shown to have touched nothing.
 */
function fakeOps(coordinatorBySession: Map<SessionId, string>) {
  const threads: ScopedRow[] = [
    row('t-a1', 'c-a', 'Alpha work'),
    row('t-a2', 'c-a', 'Alpha docs'),
    row('t-b1', 'c-b', 'Beta work'),
  ]
  const leads = new Map(threads.map(r => [r.info.sessionId, r]))
  const effects: string[] = []
  const coordinatorOf = (caller: SessionId): string => {
    const id = coordinatorBySession.get(caller)
    if (id === undefined) throw new Error('this session is not a coordinator')
    return id
  }
  const leadOf = (caller: SessionId): ScopedRow => {
    const me = leads.get(caller)
    if (me === undefined) throw new Error('this session is not an executor session lead')
    return me
  }
  const mine = (caller: SessionId, ref: string) => findOwned(threads, coordinatorOf(caller), ref)
  const ops: ThreadOps = {
    async startThread(caller, input) { const c = coordinatorOf(caller); effects.push(`start ${c}`); return { ...info('t-new', c, input.title) } },
    async messageThread(caller, ref) { const t = mine(caller, ref); effects.push(`message ${t.info.id}`); return { thread: t.info.id, delivery: 'steer' } },
    listThreads(caller) { return ownedBy(threads.map(t => t.info), coordinatorOf(caller)) },
    async readThread(caller, ref) { const t = mine(caller, ref); effects.push(`read ${t.info.id}`); return { id: t.info.id } },
    flagUser(caller, ref) { const t = mine(caller, ref); effects.push(`flag ${t.info.id}`); return t.info },
    stopThread(caller, ref) { const t = mine(caller, ref); effects.push(`stop ${t.info.id}`); return { ...t.info, stopped: true } },
    async archiveThread(caller, ref) { const t = mine(caller, ref); effects.push(`archive ${t.info.id}`); return { archived: t.info.id } },
    report(caller, kind: ReportKind) { const me = leadOf(caller); effects.push(`report ${me.info.id} ${kind}`); return { delivered: 'quiet', note: 'ok' } },
    peers(caller) { const me = leadOf(caller); return { you: me.info.id, threads: peersOf(threads.map(t => t.info), me.info.coordinatorId, me.info.id).map(t => t.id) } },
    async sendPeer(caller, ref) {
      const me = leadOf(caller)
      if (coordinatorBySession.has(ref.trim())) throw new Error(`to reach the coordinator use ${TOOL.report}`)
      const to = findOwned(threads, me.info.coordinatorId, ref, { listTool: TOOL.peers })
      effects.push(`send ${me.info.id}->${to.info.id}`)
      return { to: to.info.id, delivery: 'steer' }
    },
  }
  return { ops, effects }
}

const byName = (defs: ToolDefinition[]) => new Map(defs.map(d => [d.name, d]))
const run = async (def: ToolDefinition, caller: string | undefined, args: Record<string, unknown>) =>
  await def.execute(args, { callId: 'c1', signal: new AbortController().signal, ...(caller === undefined ? {} : { agent: { id: caller } as never }) }) as Record<string, unknown>

test('no coordinator tool can reach another coordinator\'s executor, and the error equals an unknown id', async () => {
  const { ops, effects } = fakeOps(new Map([['s-coord-a', 'c-a'], ['s-coord-b', 'c-b']]))
  const tools = byName(coordinatorTools(ops))
  const refTools: [string, Record<string, unknown>][] = [
    [TOOL.message, { text: 'hi' }], [TOOL.read, {}], [TOOL.flagUser, { reason: 'r' }], [TOOL.stop, {}], [TOOL.archive, { force: true }],
  ]
  for (const [name, extra] of refTools) {
    for (const ref of ['t-a1', 's-t-a1', 'Alpha work']) {
      const foreign = await run(tools.get(name)!, 's-coord-b', { thread: ref, ...extra })
      const unknown = await run(tools.get(name)!, 's-coord-b', { thread: ref === 'Alpha work' ? 'Gamma work' : `${ref}9`, ...extra })
      assert.equal(foreign['error'], unknownRefMessage(ref), `${name} ${ref}`)
      assert.equal(String(foreign['error']).replace(ref, 'X'), String(unknown['error']).replace(ref === 'Alpha work' ? 'Gamma work' : `${ref}9`, 'X'), `${name} ${ref}: same text as unknown`)
    }
    // The owner reaches its own executor.
    const own = await run(tools.get(name)!, 's-coord-a', { thread: 't-a1', ...extra })
    assert.equal(own['error'], undefined, name)
  }
  const listB = await run(tools.get(TOOL.list)!, 's-coord-b', {})
  assert.deepEqual((listB['threads'] as { id: string }[]).map(t => t.id), ['t-b1'])
  assert.doesNotMatch(String(listB['untrusted']), /Alpha/)
  const started = await run(tools.get(TOOL.start)!, 's-coord-b', { title: 'New', brief: 'b' })
  assert.equal(started['coordinatorId'], 'c-b')
  // Only the owner's own calls had an effect; every foreign call was refused before it touched anything.
  assert.deepEqual(effects, ['message t-a1', 'read t-a1', 'flag t-a1', 'stop t-a1', 'archive t-a1', 'start c-b'])
})

test('every tool fails closed without a calling agent, before reaching the thread service', async () => {
  const { ops, effects } = fakeOps(new Map([['s-coord-a', 'c-a']]))
  for (const def of [...coordinatorTools(ops), ...threadTools(ops)]) {
    const result = await run(def, undefined, { thread: 't-a1', title: 't', brief: 'b', text: 'x', reason: 'r', kind: 'result' })
    assert.equal(result['error'], `${def.name} needs a calling agent`)
  }
  assert.deepEqual(effects, [])
})

test('executor tools see only executors under the same coordinator', async () => {
  const { ops, effects } = fakeOps(new Map([['s-coord-a', 'c-a'], ['s-coord-b', 'c-b']]))
  const tools = byName(threadTools(ops))
  const peers = await run(tools.get(TOOL.peers)!, 's-t-a1', {})
  assert.deepEqual(peers, { you: 't-a1', threads: ['t-a2'] })
  assert.deepEqual(await run(tools.get(TOOL.peers)!, 's-t-b1', {}), { you: 't-b1', threads: [] })
  for (const ref of ['t-b1', 's-t-b1', 'Beta work']) {
    const sent = await run(tools.get(TOOL.send)!, 's-t-a1', { thread: ref, text: 'hi' })
    assert.equal(sent['error'], unknownRefMessage(ref, TOOL.peers), ref)
  }
  // Every coordinator Session is refused with the report hint, not only the caller's own coordinator.
  for (const coord of ['s-coord-a', 's-coord-b']) {
    assert.match(String((await run(tools.get(TOOL.send)!, 's-t-a1', { thread: coord, text: 'hi' }))['error']), /coordinator_report/)
  }
  assert.equal((await run(tools.get(TOOL.send)!, 's-t-a1', { thread: 't-a2', text: 'hi' }))['to'], 't-a2')
  // A coordinator is not an executor lead: the executor tools refuse it.
  assert.match(String((await run(tools.get(TOOL.report)!, 's-coord-a', { kind: 'result', text: 'x' }))['error']), /not an executor session lead/)
  assert.deepEqual(effects, ['send t-a1->t-a2'])
})

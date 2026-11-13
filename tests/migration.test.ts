/**
 * State file version 2: the upgrade of a version 1 file (built here from the fixture shape, never read from a real dsh
 * home), the `state.v1.json` copy, validation of tampered coordinator records (T8), and the one-time removal of the
 * plugin-made thread Workspaces.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { TOOL } from '../src/host/names.ts'
import { parseState } from '../src/host/store.ts'
import { FakeHost, rig, tick, type FakeAgent } from './harness.ts'

type Controller = { create: (q: unknown) => Promise<{ sessionId: string }> }
type Registry = { create: (p: string, t?: string) => Promise<{ id: string; sessionIds: string[] }> }

/**
 * What an earlier release left behind: the "Coordinator" group at the threads root with its chat (opening message and
 * title), two threads in their own Workspaces (one live, one archived) and a thread in a folder the user allowed.
 */
async function legacySetup(host: FakeHost, root: string, home: string) {
  const registry = host.ctx['workspaceRegistry'] as Registry
  const controller = host.ctx['sessionController'] as Controller
  const group = await registry.create(root, 'Coordinator')
  const { sessionId: coordId } = await controller.create({ workspaceId: group.id, agentPreset: 'standard' })
  const coordinator = host.agentOf(coordId)
  coordinator.append('session/title', { title: 'Coordinator' })
  coordinator.append('user/message', { id: 'dsh-coordinator:opening:7d1c2b6e-0000-4000-8000-000000000000', role: 'user', content: [{ type: 'text', text: 'Coordinator chat opened.' }], source: { kind: 'dsh-coordinator' } })
  coordinator.append('turn/start', { turn: 1 })
  const thread = async (id: string, cwd: string): Promise<{ agent: FakeAgent; workspaceId: string }> => {
    mkdirSync(cwd, { recursive: true })
    const ws = await registry.create(cwd, id)
    const { sessionId } = await controller.create({ workspaceId: ws.id, agentPreset: 'standard' })
    const agent = host.agentOf(sessionId)
    agent.append('session/title', { title: id })
    agent.append('user/message', { id: `dsh-coordinator:brief:${id}`, role: 'user', content: [{ type: 'text', text: 'brief' }], source: { kind: 'user', rpcId: `dsh-coordinator:brief:${id}` } })
    return { agent, workspaceId: ws.id }
  }
  const live = await thread('t-aaaa', join(root, 'live-work'))
  const old = await thread('t-bbbb', join(root, 'old-work'))
  const allowed = join(home, 'dev', 'proj')
  const outside = await thread('t-cccc', allowed)
  host.archived.push(old.agent.id)
  const row = (id: string, agent: FakeAgent, cwd: string, extra: Record<string, unknown> = {}) => ({
    info: { id, sessionId: agent.id, title: id, cwd, status: 'idle', createdAt: 1, updatedAt: 2 },
    facts: { phase: 'active', lastTurnEnd: { kind: 'completed', at: 2 } }, briefAs: 'user', ...extra,
  })
  const v1 = {
    version: 1, coordinatorSessionId: coordId, revision: 41, threadPermission: 'ask', allowedFolders: [allowed],
    threads: [
      row('t-aaaa', live.agent, join(root, 'live-work'), { workspaceId: live.workspaceId, ownWorkspace: true }),
      row('t-bbbb', old.agent, join(root, 'old-work'), { workspaceId: old.workspaceId, ownWorkspace: true, archived: true }),
      row('t-cccc', outside.agent, allowed, { workspaceId: outside.workspaceId }),
    ],
  }
  return { coordinator, live, old, outside, allowed, v1 }
}

test('a version 1 file upgrades with every row, the allowed folders and the permission choice, and a state.v1.json copy', async () => {
  // A first service only provides the scratch folders; the earlier release's Sessions are set up after it is gone.
  const host = new FakeHost()
  const r = rig('migrate-v1', { host })
  r.host.dispose()
  const setup = await legacySetup(host, r.root, r.home)
  writeFileSync(r.stateFile, JSON.stringify(setup.v1))
  host.tools.length = 0
  host.sections.length = 0
  host.listeners.clear()
  const again = rig('migrate-v1', { dir: r.dir, host })
  await again.service.ready
  await tick(250)
  const state = again.service.getState()
  assert.equal(state.problems?.find(p => p.kind === 'state-dropped'), undefined, JSON.stringify(state.problems))
  assert.equal(state.coordinators.length, 1)
  const coord = state.coordinators[0]!
  assert.equal(coord.sessionId, setup.coordinator.id)
  // A live chat keeps its home (a Session's folder cannot change); new Executor Sessions start in a new plugin folder
  // under the base, made only when the first one starts there.
  assert.equal(coord.home, r.root)
  const base = join(r.home, 'Documents', 'deepseek-harness')
  assert.equal(coord.folder, join(base, 'coordinator-newton'))
  assert.equal(existsSync(coord.folder), false, 'not created on load')
  // Names arrived after version 1: the migrated coordinator gets one, and its plugin title becomes its name.
  assert.equal(coord.name, 'Newton')
  assert.equal(coord.title, 'Newton')
  assert.equal(state.lastCoordinatorId, coord.id)
  assert.deepEqual(state.threads.map(t => [t.id, t.coordinatorId]).sort(), [['t-aaaa', coord.id], ['t-cccc', coord.id]])
  assert.deepEqual(state.allowedFolders, [setup.allowed])
  assert.equal(state.threadPermission?.mode, 'ask')
  // The copy of the original, kept once, owner-only.
  const copy = join(dirname(r.stateFile), 'state.v1.json')
  assert.deepEqual(JSON.parse(readFileSync(copy, 'utf8')), setup.v1)
  assert.equal(statSync(copy).mode & 0o777, 0o600)
  const written = JSON.parse(readFileSync(r.stateFile, 'utf8'))
  assert.equal(written.version, 2)
  assert.equal(written.threads.length, 3, 'the archived row is kept')
  assert.equal(written.threads.find((t: { info: { id: string } }) => t.info.id === 't-bbbb').info.coordinatorId, coord.id)
  assert.equal(written.threads.find((t: { info: { id: string } }) => t.info.id === 't-aaaa').ownFolder, true, 'below the old root: plugin-made')
  assert.equal(written.threads.find((t: { info: { id: string } }) => t.info.id === 't-cccc').ownFolder, undefined)
  // The coordinator's tools still reach its threads.
  assert.ok(again.host.toolsFor(setup.coordinator.id).includes(TOOL.start))
  assert.deepEqual(again.service.listThreads(setup.coordinator.id).map(t => t.id).sort(), ['t-aaaa', 't-cccc'])
  // The live thread keeps its own group, now titled by its coordinator and folder; the user's own Workspace stays
  // untouched; the coordinator group stays. The retired removal pass never runs (its flag is always written).
  const liveGroup = host.workspaces.find(w => w.id === setup.live.workspaceId)!
  assert.equal(liveGroup.title, `${coord.name} · live-work`)
  assert.ok(host.workspaces.some(w => w.id === setup.outside.workspaceId))
  assert.ok(host.workspaces.some(w => w.path === r.root))
  assert.equal(written.workspacesMigrated, true)
  assert.equal(written.executorGroups, true)
  again.host.dispose()

  // A later load never overwrites the copy and does not run the Workspace pass again.
  writeFileSync(copy, '{"kept":true}')
  const ws = liveGroup
  host.tools.length = 0
  host.sections.length = 0
  host.listeners.clear()
  const third = rig('migrate-v1', { dir: r.dir, host })
  await third.service.ready
  await tick(250)
  assert.equal(readFileSync(copy, 'utf8'), '{"kept":true}')
  assert.ok(host.workspaces.some(w => w.id === ws.id), 'idempotent: nothing removed or duplicated')
  assert.equal(host.workspaces.filter(w => w.path === ws.path).length, 1)
  third.host.dispose()
})

test('a version 1 file without a coordinator but with threads keeps them under one coordinator, and Reopen gives it a chat', async () => {
  const host = new FakeHost()
  const r = rig('migrate-null', { host })
  r.host.dispose()
  const setup = await legacySetup(host, r.root, r.home)
  writeFileSync(r.stateFile, JSON.stringify({ ...setup.v1, coordinatorSessionId: null }))
  host.tools.length = 0
  host.sections.length = 0
  host.listeners.clear()
  const again = rig('migrate-null', { dir: r.dir, host })
  await again.service.ready
  const coord = again.service.getState().coordinators[0]!
  assert.equal(coord.sessionId, null)
  assert.equal(coord.chatArchived, true)
  // Without a chat, home and folder are a new plugin folder under the base (not created yet); rows keep their owner.
  const base = join(r.home, 'Documents', 'deepseek-harness')
  assert.equal(coord.home, join(base, 'coordinator-newton'))
  assert.equal(coord.folder, join(base, 'coordinator-newton'))
  assert.equal(existsSync(coord.home), false)
  assert.deepEqual(again.service.getState().threads.map(t => t.coordinatorId), [coord.id, coord.id])
  // A thread's report waits for the chat.
  await again.host.call(setup.live.agent.id, TOOL.report, { kind: 'result', text: 'done meanwhile' })
  await tick(80)
  const opened = await again.service.ensureCoordinator()
  assert.equal(opened.coordinatorId, coord.id)
  await tick(10)
  const chat = again.host.agentOf(opened.sessionId)
  assert.equal(chat.session.header.cwd, join(base, 'coordinator-newton'), 'Reopen makes the chat in the new home')
  assert.match(chat.received.map(m => m.message.content.map(c => c.text).join('')).join('\n'), /done meanwhile/)
  assert.deepEqual(again.service.listThreads(chat.id).map(t => t.id).sort(), ['t-aaaa', 't-cccc'])
  again.host.dispose()
  // A later load keeps it there, with its rows (their briefs of version 1 still bind to it).
  host.tools.length = 0
  host.sections.length = 0
  host.listeners.clear()
  host.guards.length = 0
  const third = rig('migrate-null', { dir: r.dir, host })
  await third.service.ready
  const kept = third.service.getState().coordinators[0]!
  assert.equal(kept.id, coord.id)
  assert.equal(kept.home, join(base, 'coordinator-newton'))
  assert.deepEqual(third.service.getState().threads.map(t => t.coordinatorId), [coord.id, coord.id])
  assert.equal(third.service.getState().problems?.find(p => p.kind === 'state-dropped'), undefined)
  third.host.dispose()
})

test('a version 1 file with a refused base keeps the old root and shows the base problem', async () => {
  const host = new FakeHost()
  const r = rig('migrate-badbase', { host })
  r.host.dispose()
  const setup = await legacySetup(host, r.root, r.home)
  writeFileSync(r.stateFile, JSON.stringify({ ...setup.v1, coordinatorSessionId: null }))
  host.tools.length = 0
  host.sections.length = 0
  host.listeners.clear()
  const again = rig('migrate-badbase', { dir: r.dir, host, config: { coordinatorBase: '~/.hidden' } })
  await again.service.ready
  const coord = again.service.getState().coordinators[0]!
  assert.equal(coord.home, r.root)
  assert.equal(coord.folder, r.root)
  assert.equal(again.service.getState().problems?.[0]?.kind, 'bad-root')
  again.host.dispose()
})

test('parseState: version 1 without a legacy root leaves rows without a coordinator; a newer version is read-only', async () => {
  const state = parseState(JSON.stringify({ version: 1, coordinatorSessionId: 's', revision: 2, threads: [
    { info: { id: 't-1', sessionId: 's2', title: 'x', cwd: '/x', status: 'idle', createdAt: 1, updatedAt: 1 }, facts: {} },
  ] }))
  assert.equal(state.version, 2)
  assert.deepEqual(state.coordinators, [])
  assert.equal(state.threads[0]!.info.coordinatorId, '')
  const upgraded = parseState(JSON.stringify({ version: 1, coordinatorSessionId: null, revision: 2, threads: [] }), { threadsRoot: '/r' })
  assert.deepEqual(upgraded.coordinators, [], 'nothing to own')
  // Version 3: never read, never written.
  const r = rig('migrate-newer', { before: ({ stateFile }) => { mkdirSync(dirname(stateFile), { recursive: true }); writeFileSync(stateFile, '{"version":3,"coordinators":[]}') } })
  await r.service.ready
  assert.equal(r.service.getState().problem?.kind, 'read-only')
  await r.service.createCoordinator({ home: r.root })
  await tick(250)
  r.host.dispose()
  assert.equal(readFileSync(r.stateFile, 'utf8'), '{"version":3,"coordinators":[]}')
  assert.equal(existsSync(join(dirname(r.stateFile), 'state.v1.json')), false)
})

test('T8: a tampered version 2 file cannot make a thread, a Session outside its home, or an unmarked Session a coordinator', async () => {
  const host = new FakeHost()
  const r = rig('tamper-v2', { host })
  await r.service.ready
  const real = await r.service.createCoordinator({ home: r.root })
  r.host.userTurn(r.host.agentOf(real.sessionId), 'start one')
  const started = await r.host.call(real.sessionId, TOOL.start, { title: 'Real work', brief: 'b' })
  // An adopted coordinator whose mark was not logged yet: kept while it has no turn.
  const pending = host.newSession(r.root)
  await tick(5)
  host.userTurn(pending, 'hi')
  pending.log.splice(0, pending.log.length) // its mark and message were not logged before the quit
  await tick(250)
  r.host.dispose()
  // A plain Session of the user's elsewhere, and an unmarked blank in the coordinator's home.
  const elsewhere = join(r.home, 'dev', 'mine')
  mkdirSync(elsewhere, { recursive: true })
  const controller = host.ctx['sessionController'] as Controller
  const mine = (await controller.create({ cwd: elsewhere })).sessionId
  const unmarked = host.agentOf((await controller.create({ cwd: r.root })).sessionId)
  unmarked.append('turn/start', { turn: 1 })
  unmarked.append('user/message', { id: 'u-own', role: 'user', content: [{ type: 'text', text: 'my own chat' }], source: { kind: 'user', rpcId: 'browser-own' } })
  const stored = JSON.parse(readFileSync(r.stateFile, 'utf8'))
  const base = stored.coordinators.find((c: { id: string }) => c.id === real.coordinatorId)
  stored.coordinators.push(
    { ...base, id: 'c-0a01', sessionId: started['sessionId'] },
    { ...base, id: 'c-0a02', sessionId: mine },
    { ...base, id: 'c-0a03', sessionId: unmarked.id },
    { ...base, id: 'c-0a04', sessionId: real.sessionId },
    { ...base, id: 'c-0a05', sessionId: 'session-does-not-exist' },
    { ...base, id: 'c-0a06', home: join(r.home, 'dev'), folder: join(r.home, 'dev'), sessionId: mine },
  )
  writeFileSync(r.stateFile, JSON.stringify(stored))
  host.tools.length = 0
  host.sections.length = 0
  host.listeners.clear()
  const again = rig('tamper-v2', { dir: r.dir, host })
  await again.service.ready
  const ids = again.service.getState().coordinators.map(c => c.id).sort()
  const adopted = stored.coordinators.find((c: { sessionId: string }) => c.sessionId === pending.id)
  assert.deepEqual(ids, [adopted.id, real.coordinatorId].sort())
  const dropped = again.service.getState().problems?.find(p => p.kind === 'state-dropped')?.detail ?? ''
  assert.match(dropped, /c-0a01 \(its Session is a delegated session\)/)
  assert.match(dropped, /c-0a02 \(its Session is not in its home\)/)
  assert.match(dropped, /c-0a03 \(its Session carries no mark of this plugin/)
  assert.match(dropped, /c-0a04 \(its Session belongs to another coordinator\)/)
  assert.match(dropped, /c-0a05 \(its Session does not exist\)/)
  assert.match(dropped, /c-0a06 \(its home is not a coordinator Workspace\)/)
  for (const id of [started['sessionId'] as string, mine, unmarked.id]) assert.ok(!again.host.toolsFor(id).includes(TOOL.start), id)
  assert.ok(again.host.toolsFor(pending.id).includes(TOOL.start))
  assert.ok(pending.received.filter(m => m.message.id === `dsh-coordinator:role:${adopted.id}`).length >= 1, 'the mark is written again')
  again.host.dispose()
})

test('a coordinator whose stored folder is refused keeps its chat, but starts no thread until the user changes the folder', async () => {
  const r = rig('folder-refused')
  await r.service.ready
  const made = await r.service.createCoordinator({ home: r.root })
  await tick(250)
  r.host.dispose()
  const stored = JSON.parse(readFileSync(r.stateFile, 'utf8'))
  stored.coordinators[0].folder = join(r.home, 'Library', 'x')
  writeFileSync(r.stateFile, JSON.stringify(stored))
  r.host.tools.length = 0
  r.host.sections.length = 0
  r.host.listeners.clear()
  const again = rig('folder-refused', { dir: r.dir, host: r.host })
  await again.service.ready
  const info = again.service.getState().coordinators[0]!
  assert.match(info.folderProblem ?? '', /system folder/)
  again.host.userTurn(again.host.agentOf(made.sessionId), 'go')
  const refused = await again.host.call(made.sessionId, TOOL.start, { title: 'Nope', brief: 'b' })
  assert.match(String(refused['error']), /folder is refused .* change it on the Coordinator page/)
  assert.match(again.host.sections[0]!.text({ agent: { id: made.sessionId } }), /is refused/)
  again.service.setCoordinatorFolder({ coordinatorId: made.coordinatorId, path: join(r.home, 'fresh') })
  const ok = await again.host.call(made.sessionId, TOOL.start, { title: 'Now', brief: 'b' })
  assert.equal(ok['cwd'], join(r.home, 'fresh', 'now'))
  again.host.dispose()
})

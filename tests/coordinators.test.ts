/**
 * Several coordinators (design round 2): adoption of a New Session in a coordinator Workspace, New coordinator and
 * its folder below the base, per-coordinator folders, notices routed to the owner, archive and reopen, the cap.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, realpathSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { COORDINATORS_MAX, discoverBase } from '../src/host/ids.ts'
import { TOOL } from '../src/host/names.ts'
import { FakeAgent, FakeHost, rig, tick, withCoordinator, type Rig } from './harness.ts'

const textOf = (m: { content: readonly { text: string }[] }) => m.content.map(c => c.text).join('\n')
/** Notices a coordinator got (woken or quiet), not its opening or role messages. */
const notices = (c: FakeAgent) => c.received.filter(r => r.message.id.includes(':notice:') || r.message.source.kind === 'agent-message')

/** A Session of the user's with a turn already, announced in a Workspace (a plain chat that must stay plain). */
function plainSession(host: FakeHost, path: string): FakeAgent {
  const real = realpathSync.native(path)
  const agent = new FakeAgent(host, `plain-${Math.random().toString(16).slice(2, 8)}`, real, 'standard')
  agent.log.push({ type: 'turn/start', seq: 1, data: { turn: 1 } })
  host.agentsById.set(agent.id, agent)
  host.workspaces.find(w => w.path === real)?.sessionIds.unshift(agent.id)
  host.emit('agent/created', { agent })
  return agent
}

async function startIn(r: Rig, coordinator: FakeAgent, title: string, extra: Record<string, unknown> = {}, said = `Please do: ${title}`) {
  r.host.userTurn(coordinator, said)
  const result = await r.host.call(coordinator.id, TOOL.start, { title, brief: `${title}.`, ...extra })
  coordinator.status = 'idle'
  await tick(1)
  return result
}

async function two(name: string, options: Parameters<typeof rig>[1] = {}) {
  const r = await withCoordinator(name, options)
  const second = await r.service.createCoordinator()
  const b = r.host.agentOf(second.sessionId)
  b.status = 'idle'
  return { ...r, a: r.coordinator, aId: r.coordinatorId, b, bId: second.coordinatorId }
}

test('a New Session in a coordinator Workspace is narrowed from its first step and becomes a coordinator on its first typed message', async () => {
  const r = await withCoordinator('adopt')
  const blank = r.host.newSession(r.root)
  await tick(5)
  // Before any message: role prompt, narrowing and the dsh-home guard; the tools are listed (dsh composes the first
  // turn's list before it logs the typed message) but a call runs only after a typed message promoted it (S4).
  assert.ok(r.host.toolsFor(blank.id).includes(TOOL.start))
  assert.match(String((await r.host.call(blank.id, TOOL.start, { title: 'x', assignment: 'y' }))['error']), /not a coordinator yet/)
  assert.match(r.host.sections[0]!.text({ agent: { id: blank.id } }), /^COORD PROMPT\n\n## Permission mode/)
  assert.ok(blank.restriction !== undefined && !blank.visibleTools().includes('bash'))
  assert.match(await r.host.policy(blank, 'read', { file_path: join(r.dir, 'dsh-home', '.credentials.yaml') }) ?? '', /coordinator may not access the dsh home/)
  const mark = blank.received.find(m => m.message.id.startsWith('dsh-coordinator:role:c-'))
  assert.ok(mark !== undefined, 'role mark injected')
  assert.equal(mark.how, 'inject')
  assert.equal(r.service.getState().coordinators.length, 1, 'a blank is not stored')
  // The first typed message stores it, with the id its mark carries.
  r.host.userTurn(blank, 'Plan the release')
  const state = r.service.getState()
  assert.equal(state.coordinators.length, 2)
  const adopted = state.coordinators.find(c => c.sessionId === blank.id)!
  assert.equal(`dsh-coordinator:role:${adopted.id}`, mark.message.id)
  assert.equal(adopted.home, r.root)
  assert.equal(adopted.folder, r.root)
  assert.equal(state.lastCoordinatorId, adopted.id)
  assert.ok(r.host.toolsFor(blank.id).includes(TOOL.start))
  // It gets a name, and its chat the named title; D1: the same sandbox preset as a chat the plugin makes.
  await tick(5)
  assert.equal(adopted.name, 'Darwin')
  assert.equal(r.service.getState().coordinators.find(c => c.id === adopted.id)!.title, 'Darwin')
  assert.equal(r.host.presets.get(blank.id), 'workspace-write')
  // A rename by the user in the sidebar is followed.
  blank.append('session/title', { title: 'Plan the release' })
  assert.equal(r.service.getState().coordinators.find(c => c.id === adopted.id)!.title, 'Plan the release')
  // It starts its own threads.
  const started = await startIn(r, blank, 'Draft notes')
  assert.equal(started['coordinatorId'], adopted.id)
  r.host.dispose()

  // After a restart it is still a coordinator (its role mark is in its log).
  r.host.tools.length = 0
  r.host.sections.length = 0
  r.host.listeners.clear()
  const again = rig('adopt', { dir: r.dir, host: r.host })
  await again.service.ready
  assert.ok(again.host.toolsFor(blank.id).includes(TOOL.start))
  assert.deepEqual(again.service.listThreads(blank.id).map(t => t.id), [started['id']])
  assert.equal(again.service.getState().problems?.find(p => p.kind === 'state-dropped'), undefined)
  again.host.dispose()
})

test('the first Assignment of an adopted coordinator keeps the user\'s authority although its role mark is logged in that turn', async () => {
  const r = await withCoordinator('adopt-authority')
  const blank = r.host.newSession(r.root)
  await tick(5)
  // dsh logs the injected role mark inside the first turn, next to the user's first prompt.
  const started = await startIn(r, blank, 'First task')
  const turn = blank.log.slice(blank.log.findLastIndex(e => e.type === 'turn/start'))
  assert.ok(turn.some(e => e.type === 'user/message' && (e.data as { id?: string }).id?.startsWith('dsh-coordinator:role:')), 'mark logged in the turn')
  assert.ok(!((started['notes'] as string[] | undefined) ?? []).some(n => /coordinator notice/.test(n)), 'no demotion note')
  await tick(5)
  const lead = r.host.agentOf(started['sessionId'] as string)
  assert.equal(lead.received[0]?.how, 'prompt', 'the Assignment is recorded as the user\'s prompt')
  r.host.dispose()
})

test('a candidate follows its re-created Agent and is dropped when its Agent is unloaded', async () => {
  const r = await withCoordinator('adopt-lifecycle')
  const blank = r.host.newSession(r.root)
  await tick(5)
  const marks = (a: FakeAgent) => a.received.filter(m => m.message.id.startsWith('dsh-coordinator:role:'))
  const first = marks(blank)[0]!.message.id
  // dsh resumes the blank with a new Agent object and an empty inbox: the candidate follows it and marks it again.
  const resumed = new FakeAgent(r.host, blank.id, blank.session.header.cwd!, 'standard')
  r.host.agentsById.set(blank.id, resumed)
  r.host.emit('agent/created', { agent: resumed })
  await tick(5)
  assert.deepEqual(marks(resumed).map(m => m.message.id), [first])
  assert.ok(resumed.restriction !== undefined && !resumed.visibleTools().includes('bash'))
  const isCandidate = (id: string) => r.host.sections[0]!.text({ agent: { id } }).startsWith('COORD PROMPT')
  assert.ok(isCandidate(blank.id))
  // Unloaded: no candidate any more (no role prompt, no cap slot); the next resume considers it again.
  r.host.emit('agent/disposed', { agent: resumed })
  r.host.agentsById.delete(blank.id)
  assert.ok(!isCandidate(blank.id))
  const back = new FakeAgent(r.host, blank.id, blank.session.header.cwd!, 'standard')
  r.host.agentsById.set(blank.id, back)
  r.host.emit('agent/created', { agent: back })
  await tick(5)
  assert.ok(isCandidate(blank.id))
  assert.equal(marks(back).length, 1)
  r.host.userTurn(back, 'Plan it')
  const adopted = r.service.getState().coordinators.find(c => c.sessionId === blank.id)
  assert.ok(adopted !== undefined)
  assert.ok(back.log.some(e => e.type === 'user/message' && (e.data as { id?: string }).id === `dsh-coordinator:role:${adopted.id}`), 'its mark is in its log')
  r.host.dispose()
})

test('adoption skips a Session with turns (fenced instead), a subagent, a thread lead, a Session elsewhere; a tool call alone never promotes a candidate', async () => {
  const r = await withCoordinator('adopt-not')
  const plain = plainSession(r.host, r.root)
  const member = new FakeAgent(r.host, 'member-in-home', r.root, 'standard')
  member.session.header.origin = 'subagent'
  member.session.header.parentSession = r.coordinator.id
  r.host.agentsById.set(member.id, member)
  r.host.emit('agent/created', { agent: member })
  const elsewhere = join(r.home, 'dev', 'project')
  mkdirSync(elsewhere, { recursive: true })
  const other = await (r.host.ctx['sessionController'] as { create: (q: unknown) => Promise<{ sessionId: string }> }).create({ cwd: elsewhere })
  const started = await startIn(r, r.coordinator, 'Lead task')
  await tick(5)
  for (const id of [plain.id, member.id, other.sessionId, started['sessionId'] as string]) {
    assert.ok(!r.host.toolsFor(id).includes(TOOL.start), id)
    assert.equal(r.host.sections[0]!.text({ agent: { id } }).startsWith('COORD PROMPT'), false, id)
  }
  assert.equal(r.service.getState().coordinators.length, 1)
  // S12: the plain Session with a history in the coordinator home is fenced: narrowed to reading, guarded.
  assert.ok(plain.restriction !== undefined && !plain.visibleTools().includes('bash'))
  assert.match(await r.host.policy(plain, 'bash', { command: 'ls' }) ?? '', /is no coordinator, so it may only read and search/)
  assert.match(r.host.sections[0]!.text({ agent: { id: plain.id } }), /^## Not a coordinator/)
  // S4: a tool call never promotes a candidate.
  const blank = r.host.newSession(r.root)
  await tick(5)
  assert.match(String((await r.host.call(blank.id, TOOL.list, {}))['error']), /not a coordinator yet/)
  await assert.rejects(r.service.startThread(blank.id, { title: 'x', brief: 'y' }, new AbortController().signal), /not a coordinator/)
  assert.equal(r.service.getState().coordinators.length, 1)
  r.host.dispose()
})

test('New coordinator gets its own folder below the base, titled in turn; a picked folder with the user\'s own sessions is refused', async () => {
  const r = await withCoordinator('create')
  const base = join(r.home, 'Documents', 'deepseek-harness')
  assert.equal(r.service.getState().base?.path, base)
  const first = await r.service.createCoordinator()
  mkdirSync(join(base, 'coordinator-turing'), { recursive: true })
  writeFileSync(join(base, 'coordinator-turing', 'keep.txt'), 'the user\'s file')
  const second = await r.service.createCoordinator({})
  const third = await r.service.createCoordinator()
  const byId = new Map(r.service.getState().coordinators.map(c => [c.id, c]))
  // Each gets a free name; its home folder is named after it.
  assert.deepEqual([first, second, third].map(c => byId.get(c.coordinatorId)!.name), ['Darwin', 'Austen', 'Turing'])
  assert.equal(byId.get(first.coordinatorId)!.home, join(base, 'coordinator-darwin'))
  assert.equal(byId.get(second.coordinatorId)!.home, join(base, 'coordinator-austen'))
  assert.equal(byId.get(third.coordinatorId)!.home, join(base, 'coordinator-turing-2'), 'a non-empty folder is skipped')
  assert.deepEqual([first, second, third].map(c => byId.get(c.coordinatorId)!.title), ['Darwin', 'Austen', 'Turing'])
  assert.deepEqual(r.host.workspaces.map(w => w.title), ['Newton', 'Darwin', 'Austen', 'Turing'])
  // Each chat sits in its home and is narrowed; its opening message carries its id.
  const chat = r.host.agentOf(first.sessionId)
  assert.equal(chat.session.header.cwd, join(base, 'coordinator-darwin'))
  assert.ok(chat.received.some(m => m.message.id.startsWith(`dsh-coordinator:opening:${first.coordinatorId}:`)))
  assert.ok(!chat.visibleTools().includes('bash'))
  // A picked folder that is a Workspace with the user's own sessions is refused; an empty one is fine.
  const project = join(r.home, 'dev', 'project')
  mkdirSync(project, { recursive: true })
  await (r.host.ctx['workspaceRegistry'] as { create: (p: string) => Promise<unknown> }).create(project)
  plainSession(r.host, project)
  await assert.rejects(r.service.createCoordinator({ home: project }), /workspace with your own sessions/)
  await assert.rejects(r.service.createCoordinator({ home: join(r.home, '.config') }), /cannot be a coordinator's home/)
  // A picked or typed folder that does not exist yet (dsh's resolveByPath rejects a missing path).
  const picked = await r.service.createCoordinator({ home: join(r.home, 'dev', 'empty') })
  assert.equal(r.service.getState().coordinators.find(c => c.id === picked.coordinatorId)!.home, join(r.home, 'dev', 'empty'))
  r.host.dispose()
})

test('base discovery: next to a registered dsh default workspace, else ~/Documents/deepseek-harness; coordinatorBase overrides', async () => {
  assert.equal(discoverBase(['/u/x', '/u/Documents/deepseek-harness/default-workspace'], '/u'), '/u/Documents/deepseek-harness')
  assert.equal(discoverBase(['/u/x'], '/u'), '/u/Documents/deepseek-harness')
  assert.equal(discoverBase(['/u/Documents/deepseek-harness/default-workspace'], '/u', '/elsewhere'), '/elsewhere')
  const r = rig('base', {
    before: ({ host, home }) => {
      const dflt = join(home, 'Docs', 'deepseek-harness', 'default-workspace')
      mkdirSync(dflt, { recursive: true })
      host.workspaces.push({ id: 'ws-default', path: realpathSync.native(dflt), title: 'default-workspace', sessionIds: [], setTitle: async () => {} })
    },
  })
  await r.service.ready
  const base = join(r.home, 'Docs', 'deepseek-harness')
  assert.equal(r.service.getState().base?.path, base)
  const made = await r.service.ensureCoordinator()
  assert.equal(r.host.agentOf(made.sessionId).session.header.cwd, join(base, 'coordinator-newton'))
  r.host.dispose()
  const configured = rig('base-config', { config: { coordinatorBase: '/var/coordinators-xyz' } })
  await configured.service.ready
  assert.equal(configured.service.getState().base?.path, '/var/coordinators-xyz')
  assert.equal(configured.service.getState().problem?.kind, 'bad-root', 'a system folder is refused')
  configured.host.dispose()
})

test('notices of coordinator A never reach B, also when the row is gone before the batch goes out', async () => {
  const r = await two('route')
  const a1 = await startIn(r, r.a, 'Task of A')
  const b1 = await startIn(r, r.b, 'Task of B')
  const before = { a: notices(r.a).length, b: notices(r.b).length }
  await r.host.call(a1['sessionId'] as string, TOOL.report, { kind: 'result', text: 'A is done' })
  await tick(80)
  assert.equal(notices(r.a).length, before.a + 1)
  assert.equal(notices(r.b).length, before.b)
  assert.match(textOf(notices(r.a).at(-1)!.message), /A is done/)
  // A folder confirmation of A, denied: the row is deleted at once, the notice still goes to A.
  const outside = join(r.home, 'dev', 'outside')
  mkdirSync(outside, { recursive: true })
  const pending = await startIn(r, r.a, 'Outside work', { cwd: outside }, `Work in ${outside}`)
  assert.equal(pending['status'], 'needs-user')
  assert.equal(r.host.questions.at(-1)!.request.agent?.id, r.a.id, 'the card is in the owner\'s chat')
  await r.service.confirmFolder(pending['id'], 'deny')
  await tick(80)
  assert.match(textOf(notices(r.a).at(-1)!.message), /denied the folder/)
  assert.equal(notices(r.b).length, before.b)
  // B's report goes to B only.
  await r.host.call(b1['sessionId'] as string, TOOL.report, { kind: 'question', text: 'B asks' })
  await tick(80)
  assert.match(textOf(notices(r.b).at(-1)!.message), /B asks/)
  assert.doesNotMatch(notices(r.a).map(n => textOf(n.message)).join('\n'), /B asks/)
  r.host.dispose()
})

test('a folder change applies to new threads only; an existing folder below the new folder needs confirmation', async () => {
  const r = await two('folder-change')
  const early = await startIn(r, r.b, 'Early work')
  const work = join(r.home, 'work')
  const info = r.service.setCoordinatorFolder({ coordinatorId: r.bId, path: work })
  assert.equal(info.folder, work)
  assert.ok(existsSync(work), 'created when missing')
  const late = await startIn(r, r.b, 'Late work')
  assert.equal(late['cwd'], join(work, 'late-work'))
  assert.equal(r.service.listThreads().find(t => t.id === early['id'])!.cwd, join(r.service.getState().coordinators.find(c => c.id === r.bId)!.home, 'early-work'))
  assert.equal(r.host.agentOf(r.b.id).session.header.cwd, r.service.getState().coordinators.find(c => c.id === r.bId)!.home, 'the chat stays in its home')
  // A's threads still go to A's folder.
  const ofA = await startIn(r, r.a, 'Work of A')
  assert.equal(ofA['cwd'], join(r.root, 'work-of-a'))
  // An existing repository below the new folder: the user must name it, then confirm.
  mkdirSync(join(work, 'repo'), { recursive: true })
  const refused = await startIn(r, r.b, 'Repo work', { cwd: join(work, 'repo') })
  assert.match(String(refused['error']), /lies inside, a folder the plugin did not make/)
  r.host.userTurn(r.b, `Use ${join(work, 'repo')}`)
  const asked = await r.host.call(r.b.id, TOOL.start, { title: 'Repo work', brief: 'b', cwd: join(work, 'repo') })
  assert.deepEqual(asked['action'], { kind: 'confirm-folder', path: join(work, 'repo'), why: 'existing' })
  // A folder the user typed in B's chat does not authorise A.
  mkdirSync(join(work, 'other'), { recursive: true })
  r.host.userTurn(r.b, `Also ${join(work, 'other')}`)
  const crossed = await startIn(r, r.a, 'Other work in A', { cwd: join(work, 'other') })
  assert.match(String(crossed['error']), /not named this folder/)
  // A folder a thread works in, the home folder, or a coordinator home cannot become a folder.
  assert.throws(() => r.service.setCoordinatorFolder({ coordinatorId: r.bId, path: join(work, 'late-work', 'x') }), /inside the folder of a delegated session/)
  assert.throws(() => r.service.setCoordinatorFolder({ coordinatorId: r.bId, path: r.home }), /home folder/)
  assert.throws(() => r.service.setCoordinatorFolder({ coordinatorId: 'c-0000', path: work }), /unknown coordinator/)
  r.host.dispose()
})

test('a thread is never created in a coordinator home, nor in a folder above one', async () => {
  const r = await two('home-guard')
  const bHome = r.service.getState().coordinators.find(c => c.id === r.bId)!.home
  r.host.userTurn(r.a, `Work in ${bHome} or in ${join(r.home, 'Documents')}`)
  for (const cwd of [bHome, join(r.home, 'Documents')]) {
    const result = await r.host.call(r.a.id, TOOL.start, { title: 'Into a home', brief: 'b', cwd })
    assert.match(String(result['error']), /coordinator's own folder or contains one/, cwd)
  }
  // S9: A's folder may not contain B's home, nor lie inside it.
  assert.throws(() => r.service.setCoordinatorFolder({ coordinatorId: r.aId, path: join(r.home, 'Documents', 'deepseek-harness') }), /contains another coordinator's home/)
  assert.throws(() => r.service.setCoordinatorFolder({ coordinatorId: r.aId, path: join(bHome, 'inside') }), /inside another coordinator's home/)
  // S6: an executor may not carry a coordinator's title.
  const named = await startIn(r, r.a, 'Coordinator')
  assert.match(String(named['error']), /not look like a coordinator's title/)
  r.host.dispose()
})

test('archive coordinator: refused while a thread works, force stops and archives it; the Workspace leaves the sidebar only when asked and free', async () => {
  const r = await two('archive-coord')
  const b1 = await startIn(r, r.b, 'Busy work')
  const lead = r.host.agentOf(b1['sessionId'] as string)
  lead.startTurn()
  await assert.rejects(r.service.archiveCoordinator({ coordinatorId: r.bId }), /still work: t-[0-9a-f]+ "Busy work" \(running\)/)
  assert.equal(r.host.archived.includes(r.b.id), false)
  const bHome = r.service.getState().coordinators.find(c => c.id === r.bId)!.home
  const result = await r.service.archiveCoordinator({ coordinatorId: r.bId, force: true, removeWorkspace: true })
  assert.deepEqual(result, { archived: r.bId, threads: [b1['id']], workspace: 'removed' })
  assert.ok(r.host.archived.includes(r.b.id) && r.host.archived.includes(lead.id))
  assert.equal(r.host.workspaces.some(w => w.path === bHome), false)
  assert.ok(existsSync(bHome), 'files on disk are never touched')
  const state = r.service.getState()
  assert.equal(state.coordinators.at(-1)!.id, r.bId)
  assert.equal(state.coordinators.at(-1)!.archived, true)
  assert.equal(state.lastCoordinatorId, r.aId)
  assert.deepEqual(state.threads.map(t => t.id), [], 'its threads are archived')
  // Shared home: another live coordinator lives there.
  const blank = r.host.newSession(r.root)
  await tick(5)
  r.host.userTurn(blank, 'hello')
  assert.equal((await r.service.archiveCoordinator({ coordinatorId: r.aId, removeWorkspace: true })).workspace, 'kept-shared')
  assert.ok(r.host.workspaces.some(w => w.path === r.root))
  // A Workspace with another unarchived Session of the user's stays.
  const third = await r.service.createCoordinator()
  const thirdHome = r.service.getState().coordinators.find(c => c.id === third.coordinatorId)!.home
  plainSession(r.host, thirdHome)
  assert.equal((await r.service.archiveCoordinator({ coordinatorId: third.coordinatorId, removeWorkspace: true })).workspace, 'kept-has-sessions')
  // Not asked: nothing removed.
  const fourth = await r.service.createCoordinator()
  assert.equal((await r.service.archiveCoordinator({ coordinatorId: fourth.coordinatorId })).workspace, 'not-asked')
  assert.ok(r.host.workspaces.some(w => w.path === r.service.getState().coordinators.find(c => c.id === fourth.coordinatorId)!.home))
  // Reopening an archived coordinator gives it a new chat in its home.
  const reopened = await r.service.ensureCoordinator({ coordinatorId: fourth.coordinatorId })
  assert.notEqual(reopened.sessionId, fourth.sessionId)
  assert.equal(r.service.getState().coordinators.find(c => c.id === fourth.coordinatorId)!.archived, undefined)
  r.host.dispose()

  // After a restart the coordinator whose Workspace was removed is still there, archived, without a warning, and its
  // Reopen registers the Workspace again.
  r.host.tools.length = 0
  r.host.sections.length = 0
  r.host.listeners.clear()
  const again = rig('archive-coord', { dir: r.dir, host: r.host })
  await again.service.ready
  const kept = again.service.getState().coordinators.find(c => c.id === r.bId)
  assert.equal(kept?.archived, true)
  assert.equal(again.service.getState().problems?.find(p => p.kind === 'state-dropped'), undefined)
  await again.service.ensureCoordinator({ coordinatorId: r.bId })
  assert.ok(again.host.workspaces.some(w => w.path === bHome))
  again.host.dispose()
})

test('a coordinator chat deleted from the sidebar keeps its threads; its notices wait and Reopen hands them over', async () => {
  const r = await withCoordinator('reopen')
  const started = await startIn(r, r.coordinator, 'Long work')
  await (r.host.ctx['workspaceRegistry'] as { archiveSession: (id: string) => Promise<void> }).archiveSession(r.coordinator.id)
  const info = r.service.getState().coordinators[0]!
  assert.equal(info.chatArchived, true)
  assert.equal(info.sessionId, r.coordinator.id)
  assert.equal(r.service.getState().threads[0]!.coordinatorId, r.coordinatorId)
  const before = r.coordinator.received.length
  await r.host.call(started['sessionId'] as string, TOOL.report, { kind: 'result', text: 'finished while the chat was gone' })
  await tick(80)
  assert.equal(r.coordinator.received.length, before, 'held, not delivered to the archived chat')
  const reopened = await r.service.ensureCoordinator({ coordinatorId: r.coordinatorId })
  assert.notEqual(reopened.sessionId, r.coordinator.id)
  assert.equal(reopened.coordinatorId, r.coordinatorId)
  await tick(10)
  const chat = r.host.agentOf(reopened.sessionId)
  assert.match(chat.received.map(m => textOf(m.message)).join('\n'), /finished while the chat was gone/)
  assert.equal(chat.session.header.cwd, r.root)
  // The new chat owns the threads; messages it sends are the coordinator's.
  const msg = await r.host.call(chat.id, TOOL.message, { thread: started['id'], text: 'thanks' })
  assert.equal(msg['error'], undefined)
  r.host.dispose()
})

test(`at most ${COORDINATORS_MAX} live coordinators: New coordinator and adoption refuse past it`, async () => {
  const r = await withCoordinator('cap')
  for (let i = 1; i < COORDINATORS_MAX; i++) await r.service.createCoordinator()
  assert.equal(r.service.getState().coordinators.length, COORDINATORS_MAX)
  await assert.rejects(r.service.createCoordinator(), /at most 20 coordinators/)
  assert.match(r.service.getState().base?.problem ?? '', /at most 20/)
  const blank = r.host.newSession(r.root)
  await tick(5)
  assert.ok(!r.host.toolsFor(blank.id).includes(TOOL.start))
  // Archiving one frees a place.
  await r.service.archiveCoordinator({ coordinatorId: r.coordinatorId })
  await r.service.createCoordinator()
  r.host.dispose()
})

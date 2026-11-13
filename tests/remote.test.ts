import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TYPERT_REMOTE } from '../src/client/remote.ts'
import type { CoordinatorState } from '../src/types.ts'
import { withCoordinator } from './harness.ts'

type Codec<T> = { parse(v: unknown): T }
const methods = (TYPERT_REMOTE as unknown as { methods: Record<string, { result: { create(): Codec<unknown> }; parameters: { name: string; acceptsUndefined?: true; codec: { create(): Codec<unknown> } }[] }> }).methods
const getState = methods['coordinator/getState']!.result.create() as Codec<CoordinatorState>

/** A state with every optional field filled, two coordinators, a row without coordinator and both row actions. */
function fullState(): CoordinatorState {
  return {
    coordinators: [
      { id: 'c-2', sessionId: 's-c2', name: 'Noether', title: 'Release', executorPrompt: 'Write tests first.\nAsk before adding a dependency.', home: '/h/coordinator-2', folder: '/h/elsewhere', folderProblem: 'refused: inside ~/Library',
        model: { ok: false, reason: 'model-unavailable', model: 'p/m' }, createdAt: 2, updatedAt: 3 },
      { id: 'c-1', sessionId: null, name: 'Feynman', title: 'Coordinator Feynman', home: '/h/dsh-threads', folder: '/h/dsh-threads', archived: true, chatArchived: true,
        model: { ok: true, model: 'p/m' }, createdAt: 1, updatedAt: 1 },
    ],
    threads: [
      { id: 't-1', sessionId: '', title: 'a', cwd: '/x', status: 'needs-user', coordinatorId: 'c-2', statusDetail: 'confirm',
        action: { kind: 'confirm-folder', path: '/h/elsewhere/existing', why: 'existing' }, permission: 'ask', createdAt: 1, updatedAt: 2 },
      { id: 't-2', sessionId: 's-2', title: 'b', cwd: '/y', status: 'running', coordinatorId: 'c-1', team: { members: 2, working: 1 },
        attentionSessionId: 's-2m', lastReport: { kind: 'progress', text: 'half', at: 5 }, action: { kind: 'resume', reason: 'budget', count: 9 },
        createdAt: 1, updatedAt: 2 },
      { id: 't-3', sessionId: 's-3', title: 'c', cwd: '/z', status: 'idle', coordinatorId: '', createdAt: 1, updatedAt: 1 },
    ],
    lastCoordinatorId: 'c-2',
    base: { path: '/h/Documents/deepseek-harness', problem: 'refused' },
    revision: 7,
    epoch: 'e1',
    problem: { kind: 'bad-root', detail: 'x' },
    problems: [{ kind: 'bad-root', detail: 'x' }, { kind: 'state-dropped', detail: 'y' }],
    allowedFolders: ['/h/dev/site'],
    threadPermission: { mode: 'auto', autoAvailable: true, effective: 'auto' },
  }
}

test('the client codec keeps every field of the round-2 state', () => {
  const state = fullState()
  assert.deepEqual(getState.parse(JSON.parse(JSON.stringify(state))), state)
})

test('the client codec degrades unknown values instead of failing the poll', () => {
  const decoded = getState.parse({
    coordinators: [{ id: 'c', sessionId: 's', title: 'C', home: '/h', folder: '/h', model: { ok: false, reason: 'future-reason' }, createdAt: 1, updatedAt: 1, extra: 1 }],
    revision: 3,
    threads: [
      { id: 't', sessionId: 's', title: 'x', cwd: '/', status: 'some-future-status', coordinatorId: 'c', createdAt: 1, updatedAt: 1, extra: true,
        action: { kind: 'confirm-folder', path: '/p', why: 'future-why' } },
      // A host row without an owner reads as "Without coordinator", never as some coordinator's thread.
      { id: 'u', sessionId: 's2', title: 'y', cwd: '/', status: 'idle', createdAt: 1, updatedAt: 1 },
    ],
    base: { nope: true },
    problem: { kind: 'locked', detail: 'another process' },
  })
  assert.equal(decoded.threads[0]!.status, 'idle')
  assert.deepEqual(decoded.threads[0]!.action, { kind: 'confirm-folder', path: '/p', why: 'outside' })
  assert.equal(decoded.threads[1]!.coordinatorId, '')
  assert.equal(decoded.coordinators[0]!.model?.ok, false)
  assert.equal(decoded.coordinators[0]!.model?.reason, undefined)
  assert.equal(decoded.base, undefined)
  assert.deepEqual(decoded.problem, { kind: 'locked', detail: 'another process' })
  // A host that predates names sends none: '' makes the client fall back to the title.
  assert.equal(decoded.coordinators[0]!.name, '')
  assert.equal(decoded.coordinators[0]!.executorPrompt, undefined)
})

test('the client codec reads the startup validation flag and degrades a bad one', () => {
  const base = { coordinators: [], threads: [], revision: 0 }
  assert.equal((getState.parse({ ...base, loading: true }) as { loading?: boolean }).loading, true)
  assert.equal((getState.parse(base) as { loading?: boolean }).loading, undefined)
  assert.equal((getState.parse({ ...base, loading: 'yes' }) as { loading?: boolean }).loading, undefined)
  const decoded = getState.parse({ ...base, coordinators: [{ id: 'c', sessionId: 's', name: 7, title: 'T', home: '/h', folder: '/h', executorPrompt: 3, createdAt: 1, updatedAt: 1 }] })
  assert.equal(decoded.coordinators[0]!.name, '')
  assert.equal(decoded.coordinators[0]!.executorPrompt, undefined)
})

test('the client codec reads the chat state and archived rows (r3)', () => {
  const base = { coordinators: [{ id: 'c', sessionId: null, name: 'N', title: 'N', home: '/h', folder: '/h', chat: 'none', createdAt: 1, updatedAt: 1 }], threads: [], revision: 1 }
  const decoded = getState.parse({ ...base, archivedThreads: [{ id: 't', sessionId: 's', title: 'x', cwd: '/', status: 'done', coordinatorId: 'c', createdAt: 1, updatedAt: 2 }] })
  assert.equal(decoded.coordinators[0]!.chat, 'none')
  assert.equal(decoded.archivedThreads?.[0]?.id, 't')
  const future = getState.parse({ ...base, coordinators: [{ ...base.coordinators[0], chat: 'someday' }], archivedThreads: 'nope' })
  assert.equal(future.coordinators[0]!.chat, undefined, 'an unknown chat state reads as absent')
  assert.equal(future.archivedThreads, undefined)
  const spec = methods['coordinator/deleteCoordinator']!
  assert.ok(spec !== undefined)
  assert.equal(spec.parameters[0]!.name, 'request')
  assert.deepEqual(spec.parameters[0]!.codec.create().parse({ coordinatorId: 'c' }), { coordinatorId: 'c' })
  assert.deepEqual(spec.result.create().parse({ deleted: 'c', threads: ['t'] }), { deleted: 'c', threads: ['t'] })
})

test('the client spec has the executor prompt and rename methods', () => {
  const info = fullState().coordinators[0]!
  for (const [method, request] of [
    ['setExecutorPrompt', { coordinatorId: 'c-2', text: 'Write tests first.' }],
    ['renameCoordinator', { coordinatorId: 'c-2', name: 'Hypatia' }],
  ] as const) {
    const spec = methods[`coordinator/${method}`]!
    assert.ok(spec !== undefined, method)
    assert.equal(spec.parameters.length, 1)
    assert.equal(spec.parameters[0]!.name, 'request')
    assert.equal(spec.parameters[0]!.acceptsUndefined, undefined)
    assert.deepEqual(spec.parameters[0]!.codec.create().parse(request), request)
    assert.throws(() => spec.parameters[0]!.codec.create().parse({ coordinatorId: 'c-2' }))
    assert.deepEqual(spec.result.create().parse(info), info)
  }
})

test('the client spec mirrors the round-2 Remote methods', () => {
  for (const name of ['getState', 'ensureCoordinator', 'createCoordinator', 'setCoordinatorFolder', 'archiveCoordinator', 'archiveThread',
    'confirmFolder', 'removeAllowedFolder', 'resumeThread', 'setThreadPermission', 'ping']) {
    assert.ok(methods[`coordinator/${name}`] !== undefined, name)
  }
  const param = (method: string) => methods[`coordinator/${method}`]!.parameters[0]!
  assert.equal(param('ensureCoordinator').acceptsUndefined, true)
  assert.equal(param('createCoordinator').acceptsUndefined, true)
  assert.equal(param('setCoordinatorFolder').acceptsUndefined, undefined)
  assert.deepEqual(param('archiveCoordinator').codec.create().parse({ coordinatorId: 'c', force: true, removeWorkspace: true }),
    { coordinatorId: 'c', force: true, removeWorkspace: true })
  const ensure = methods['coordinator/ensureCoordinator']!.result.create()
  assert.deepEqual(ensure.parse({ coordinatorId: 'c', sessionId: 's' }), { coordinatorId: 'c', sessionId: 's' })
  const folder = methods['coordinator/setCoordinatorFolder']!.result.create()
  const info = fullState().coordinators[0]!
  assert.deepEqual(folder.parse(info), info)
  const archive = methods['coordinator/archiveCoordinator']!.result.create()
  assert.deepEqual(archive.parse({ archived: 'c', threads: ['t'], workspace: 'kept-shared' }), { archived: 'c', threads: ['t'], workspace: 'kept-shared' })
  for (const workspace of ['kept-not-own', 'failed']) {
    assert.deepEqual(archive.parse({ archived: 'c', threads: [], workspace }), { archived: 'c', threads: [], workspace })
  }
  // An older host without the field, and a future outcome, both read as "nothing to say".
  assert.equal((archive.parse({ archived: 'c', threads: [] }) as { workspace?: string }).workspace, undefined)
  assert.equal((archive.parse({ archived: 'c', threads: [], workspace: 'future' }) as { workspace?: string }).workspace, undefined)
})

test('the client codec keeps what the real host sends for two coordinators and their threads', async () => {
  const r = await withCoordinator('remote-codec')
  const service = r.service as unknown as { createCoordinator(request?: { home?: string }): Promise<{ coordinatorId: string; sessionId: string }> }
  const second = await service.createCoordinator()
  r.host.agentOf(second.sessionId).status = 'idle'
  r.host.userTurn(r.coordinator, 'start one')
  await r.host.call(r.coordinator.id, 'thread_start', { title: 'From A', brief: 'b' })
  const b = r.host.agentOf(second.sessionId)
  r.host.userTurn(b, 'start one')
  await r.host.call(b.id, 'thread_start', { title: 'From B', brief: 'b' })
  const state = JSON.parse(JSON.stringify(r.service.getState())) as CoordinatorState
  assert.equal(state.coordinators.length, 2)
  assert.deepEqual(new Set(state.threads.map(t => t.coordinatorId)), new Set(state.coordinators.map(c => c.id)))
  assert.deepEqual(getState.parse(state), state)
  r.host.dispose()
})

test('the client codec keeps the team fields of a thread', async () => {
  const r = await withCoordinator('remote-team')
  r.host.userTurn(r.coordinator, 'start one')
  const started = await r.host.call(r.coordinator.id, 'thread_start', { title: 'Team work', brief: 'b' })
  const lead = r.host.agentOf(started['sessionId'] as string)
  lead.startTurn()
  const member = r.host.addMember(lead, 'writer')
  member.startTurn()
  member.append('approval/asked', { id: 'a', toolName: 'bash' })
  const decoded = getState.parse(JSON.parse(JSON.stringify(r.service.getState())))
  assert.deepEqual(decoded.threads[0]!.team, { members: 1, working: 1 })
  assert.equal(decoded.threads[0]!.attentionSessionId, member.id)
  r.host.dispose()
})

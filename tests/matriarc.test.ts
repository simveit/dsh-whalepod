/**
 * Matriarc per coordinator: `coordinatorMatriarc` (default off) puts `matriarc` on the coordinator chat's allow list and
 * runs `/matriarc on|off` in the chat; `executorMatriarc` (default on) is run by `executor_start` in each new Lead's
 * Session. Without the Matriarc plugin both are stored and do nothing.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { TOOL } from '../src/host/names.ts'
import { parseState } from '../src/host/store.ts'
import type { CoordinatorInfo } from '../src/types.ts'
import { FakeAgent, rig, tick, withCoordinator, type Rig } from './harness.ts'

const create = (r: Rig, request?: unknown) => (r.service.createCoordinator as (q?: unknown) => Promise<{ coordinatorId: string; sessionId: string }>)(request)
const infoOf = (r: Rig, id: string): CoordinatorInfo => r.service.getState().coordinators.find(c => c.id === id)!
const stored = (r: Rig) => (JSON.parse(readFileSync(r.stateFile, 'utf8')) as { coordinators: (Record<string, unknown> & { id: string })[] }).coordinators
const setChat = (r: Rig, coordinatorId: unknown, enabled: unknown) => r.service.setCoordinatorMatriarcEnabled({ coordinatorId, enabled } as never)
const setExec = (r: Rig, coordinatorId: unknown, enabled: unknown) => r.service.setExecutorMatriarcEnabled({ coordinatorId, enabled } as never)
const withMatriarc = { before: ({ host }: { host: Rig['host'] }) => { host.useMatriarc() } }
const matriarcLines = (r: Rig) => r.host.commandLines.filter(c => c.line.startsWith('/matriarc'))

async function start(r: Rig, coordinator: FakeAgent, title: string): Promise<{ lead: FakeAgent; result: Record<string, unknown> }> {
  r.host.userTurn(coordinator, `Please do: ${title}`)
  const result = await r.host.call(coordinator.id, TOOL.start, { title, assignment: `${title}.` })
  coordinator.endTurn()
  await tick(2)
  return { lead: r.host.agentOf(result['sessionId'] as string), result }
}

/** Whether the chat's allow list lists `matriarc`, and what the guard says to a call of it. */
async function tool(r: Rig, chat: FakeAgent): Promise<{ listed: boolean; guard: string | undefined }> {
  return { listed: chat.visibleTools().includes('matriarc'), guard: await r.host.policy(chat, 'matriarc', {}) }
}

test('defaults: off for the chat, on for executors; old and malformed records read as the defaults', async () => {
  const r = await withCoordinator('matriarc-defaults', withMatriarc)
  const info = infoOf(r, r.coordinatorId)
  assert.deepEqual([info.coordinatorMatriarc, info.executorMatriarc], [false, true])
  assert.deepEqual(r.service.getState().matriarc, { installed: true })
  const record = stored(r).find(c => c.id === r.coordinatorId)!
  assert.ok(!('coordinatorMatriarc' in record) && !('executorMatriarc' in record), 'defaults are not written')
  const t = await tool(r, r.coordinator)
  assert.equal(t.listed, false)
  assert.match(t.guard ?? '', /an Orchestrator may not use matriarc/)
  assert.deepEqual(matriarcLines(r), [], 'the default chat is not switched')
  // A state file with other values than booleans reads as the defaults.
  const file = JSON.parse(readFileSync(r.stateFile, 'utf8')) as { coordinators: Record<string, unknown>[] }
  Object.assign(file.coordinators[0]!, { coordinatorMatriarc: 'yes', executorMatriarc: 0 })
  const parsed = parseState(JSON.stringify(file)).coordinators[0]!
  assert.ok(!('coordinatorMatriarc' in parsed) && !('executorMatriarc' in parsed))
  Object.assign(file.coordinators[0]!, { coordinatorMatriarc: true, executorMatriarc: false })
  const kept = parseState(JSON.stringify(file)).coordinators[0]!
  assert.deepEqual([kept.coordinatorMatriarc, kept.executorMatriarc], [true, false])
  r.host.dispose()
})

test('create: the booleans are stored and the chat is switched; a non-boolean is refused before anything is made', async () => {
  const r = rig('matriarc-create', withMatriarc)
  await r.service.ready
  assert.deepEqual((await r.service.newCoordinatorSetup()).matriarc, { installed: true, coordinator: false, executor: true })
  const before = { coordinators: r.service.getState().coordinators.length, creates: r.host.creates, workspaces: r.host.workspaces.length }
  for (const [field, value] of [['coordinatorMatriarc', 'true'], ['coordinatorMatriarc', null], ['executorMatriarc', 0]] as const) {
    await assert.rejects(create(r, { [field]: value }), new RegExp(`${field} must be true or false`), `${field}=${JSON.stringify(value)}`)
  }
  assert.deepEqual({ coordinators: r.service.getState().coordinators.length, creates: r.host.creates, workspaces: r.host.workspaces.length }, before)

  const on = await create(r, { coordinatorMatriarc: true, executorMatriarc: false })
  const chat = r.host.agentOf(on.sessionId)
  assert.deepEqual([infoOf(r, on.coordinatorId).coordinatorMatriarc, infoOf(r, on.coordinatorId).executorMatriarc], [true, false])
  assert.equal(chat.matriarc, true)
  assert.deepEqual(matriarcLines(r), [{ session: on.sessionId, line: '/matriarc on' }])
  assert.deepEqual(await tool(r, chat), { listed: true, guard: undefined })

  const plain = await create(r, {})
  assert.deepEqual([infoOf(r, plain.coordinatorId).coordinatorMatriarc, infoOf(r, plain.coordinatorId).executorMatriarc], [false, true])
  assert.equal(matriarcLines(r).length, 1, 'the default chat is not switched')
  r.host.dispose()
})

test('coordinator setter: the allow list and the chat follow at once, both ways; bad requests are refused', async () => {
  const r = await withCoordinator('matriarc-chat', withMatriarc)
  assert.equal((await setChat(r, r.coordinatorId, true)).coordinatorMatriarc, true)
  assert.equal(r.coordinator.matriarc, true)
  assert.deepEqual(await tool(r, r.coordinator), { listed: true, guard: undefined })
  assert.equal(stored(r).find(c => c.id === r.coordinatorId)!['coordinatorMatriarc'], true)

  assert.equal((await setChat(r, r.coordinatorId, false)).coordinatorMatriarc, false)
  assert.equal(r.coordinator.matriarc, false)
  const t = await tool(r, r.coordinator)
  assert.equal(t.listed, false)
  assert.match(t.guard ?? '', /an Orchestrator may not use matriarc/)
  assert.deepEqual(matriarcLines(r).map(c => c.line), ['/matriarc on', '/matriarc off'])

  // An error result is logged; the setting is still saved and the allow list follows it.
  r.host.matriarcError = 'no navigator'
  assert.equal((await setChat(r, r.coordinatorId, true)).coordinatorMatriarc, true)
  assert.equal(r.coordinator.matriarc, false)
  assert.equal((await tool(r, r.coordinator)).listed, true)

  await assert.rejects(setChat(r, 'c-none', true), /unknown Orchestrator/)
  for (const enabled of [undefined, 'true', 1, null]) await assert.rejects(setChat(r, r.coordinatorId, enabled), /enabled must be true or false/)
  r.host.dispose()
})

test('executor setter: executor_start applies the value set now; running Executor Sessions keep theirs', async () => {
  const r = await withCoordinator('matriarc-exec', withMatriarc)
  const first = await start(r, r.coordinator, 'First')
  assert.equal(first.lead.matriarc, true)
  assert.deepEqual(matriarcLines(r), [{ session: first.lead.id, line: '/matriarc on' }])

  assert.equal(setExec(r, r.coordinatorId, false).executorMatriarc, false)
  assert.equal(stored(r).find(c => c.id === r.coordinatorId)!['executorMatriarc'], false)
  assert.equal(first.lead.matriarc, true)
  const second = await start(r, r.coordinator, 'Second')
  assert.equal(second.lead.matriarc, false)
  assert.deepEqual(matriarcLines(r).at(-1), { session: second.lead.id, line: '/matriarc off' })

  // An error result is a note and never fails the start.
  assert.equal(setExec(r, r.coordinatorId, true).executorMatriarc, true)
  r.host.matriarcError = 'no navigator'
  const third = await start(r, r.coordinator, 'Third')
  assert.equal(third.result['error'], undefined)
  assert.ok((third.result['notes'] as string[] | undefined)?.some(note => /Matriarc could not be switched on: no navigator/.test(note)), JSON.stringify(third.result))

  assert.throws(() => setExec(r, 'c-none', true), /unknown Orchestrator/)
  for (const enabled of [undefined, 'false', 0, null]) assert.throws(() => setExec(r, r.coordinatorId, enabled), /enabled must be true or false/)
  r.host.dispose()
})

test('no navigator: /matriarc on is not run and nothing is noted; off still runs; with a navigator it runs', async () => {
  const r = await withCoordinator('matriarc-no-navigator', { before: ({ host }) => { host.useMatriarc(); host.matriarcNavigators = [] } })
  const { result } = await start(r, r.coordinator, 'No navigator')
  assert.equal(result['error'], undefined)
  assert.ok(!JSON.stringify(result['notes'] ?? []).includes('Matriarc'), JSON.stringify(result['notes']))
  assert.deepEqual(matriarcLines(r), [])
  await setChat(r, r.coordinatorId, true)
  assert.deepEqual(matriarcLines(r), [])
  await setChat(r, r.coordinatorId, false)
  assert.deepEqual(matriarcLines(r), [{ session: r.coordinator.id, line: '/matriarc off' }])
  r.host.matriarcNavigators = ['codex']
  const next = await start(r, r.coordinator, 'With navigator')
  assert.deepEqual(matriarcLines(r).at(-1), { session: next.lead.id, line: '/matriarc on' })
  assert.equal(next.lead.matriarc, true)
  r.host.dispose()
})

test('without Matriarc: the settings are stored, nothing throws, and the state says it is not installed', async () => {
  const r = await withCoordinator('matriarc-absent')
  assert.deepEqual(r.service.getState().matriarc, { installed: false })
  assert.deepEqual((await r.service.newCoordinatorSetup()).matriarc, { installed: false, coordinator: false, executor: true })
  assert.equal((await setChat(r, r.coordinatorId, true)).coordinatorMatriarc, true)
  assert.equal(setExec(r, r.coordinatorId, false).executorMatriarc, false)
  assert.equal(r.coordinator.matriarc, false)
  const { result } = await start(r, r.coordinator, 'No plugin')
  assert.equal(result['error'], undefined)
  assert.ok(!JSON.stringify(result['notes'] ?? []).includes('Matriarc'))
  assert.equal(infoOf(r, (await create(r, { coordinatorMatriarc: true })).coordinatorId).coordinatorMatriarc, true)
  r.host.dispose()
})

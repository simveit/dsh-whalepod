/**
 * The global Matriarc switch (default on). On and Matriarc installed: `executor_start` runs `/matriarc on` in each new
 * Lead's Session, and an Orchestrator chat never gets Matriarc's tool or its prompt section, even when its own switch
 * is on there. Off, or Matriarc not installed: the plugin does nothing with Matriarc.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { TOOL } from '../src/host/names.ts'
import { parseState } from '../src/host/store.ts'
import { FakeAgent, NAVIGATOR_PROVIDER, rig, tick, withCoordinator, type Rig } from './harness.ts'

const withMatriarc = { before: ({ host }: { host: Rig['host'] }) => { host.useMatriarc() } }
const matriarcLines = (r: Rig) => r.host.commandLines.filter(c => c.line.startsWith('/matriarc'))
const storedState = (r: Rig) => JSON.parse(readFileSync(r.stateFile, 'utf8')) as Record<string, unknown> & { coordinators: Record<string, unknown>[] }

async function start(r: Rig, coordinator: FakeAgent, title: string): Promise<{ lead: FakeAgent; result: Record<string, unknown> }> {
  r.host.userTurn(coordinator, `Please do: ${title}`)
  const result = await r.host.call(coordinator.id, TOOL.start, { title, assignment: `${title}.` })
  coordinator.endTurn()
  await tick(2)
  return { lead: r.host.agentOf(result['sessionId'] as string), result }
}

/** Whether the chat lists `matriarc`, what the guard says to a call of it, and whether its rules are in the prompt. */
async function matriarcIn(r: Rig, chat: FakeAgent): Promise<{ listed: boolean; allowed: boolean; rules: boolean }> {
  return {
    listed: chat.visibleTools().includes('matriarc'),
    allowed: await r.host.policy(chat, 'matriarc', {}) === undefined,
    rules: (await r.host.promptSections(chat)).includes('dsh-matriarc:rules'),
  }
}

test('default on: a new Lead gets /matriarc on; the Orchestrator chat gets neither tool nor rules, even switched on there', async () => {
  const r = await withCoordinator('matriarc-on', withMatriarc)
  assert.deepEqual(r.service.getState().matriarc, { installed: true, enabled: true, navigator: true })
  assert.deepEqual(matriarcLines(r), [], 'the Orchestrator chat is never switched')
  const { lead } = await start(r, r.coordinator, 'First')
  assert.equal(lead.matriarc, true)
  assert.deepEqual(matriarcLines(r), [{ session: lead.id, line: '/matriarc on' }])
  assert.deepEqual(await matriarcIn(r, lead), { listed: true, allowed: true, rules: true })
  assert.deepEqual(await matriarcIn(r, r.coordinator), { listed: false, allowed: false, rules: false })
  // The user turns Matriarc on in the Orchestrator chat itself (its model menu or `/matriarc on`): still neither.
  r.coordinator.matriarc = true
  assert.deepEqual(await matriarcIn(r, r.coordinator), { listed: false, allowed: false, rules: false })
  r.host.dispose()
})

test('on: matriarc in coordinatorExtraTools is still kept from the Orchestrator chat', async () => {
  const r = await withCoordinator('matriarc-extra', { ...withMatriarc, config: { coordinatorExtraTools: ['matriarc'] } })
  r.coordinator.matriarc = true
  assert.deepEqual(await matriarcIn(r, r.coordinator), { listed: false, allowed: false, rules: false })
  // Off: the plugin leaves Matriarc alone, so the user's extra tool and Matriarc's own switch apply again.
  r.service.setMatriarc(false)
  assert.deepEqual(await matriarcIn(r, r.coordinator), { listed: true, allowed: true, rules: true })
  r.host.dispose()
})

test('off: no /matriarc for new Leads, running ones keep theirs; the choice is stored globally and survives a restart', async () => {
  const r = await withCoordinator('matriarc-off', withMatriarc)
  const first = await start(r, r.coordinator, 'First')
  assert.deepEqual(r.service.setMatriarc(false), { installed: true, enabled: false, navigator: true })
  await tick(300)
  assert.equal(storedState(r)['matriarc'], false)
  const second = await start(r, r.coordinator, 'Second')
  assert.equal(first.lead.matriarc, true)
  assert.equal(second.lead.matriarc, false)
  assert.deepEqual(matriarcLines(r).map(c => c.session), [first.lead.id], 'nothing is run with the switch off')
  for (const enabled of [undefined, 'true', 1, null]) assert.throws(() => r.service.setMatriarc(enabled), /enabled must be true or false/)
  r.host.dispose()
  const again = rig('matriarc-off', { dir: r.dir, ...withMatriarc })
  await again.service.ready
  assert.deepEqual(again.service.getState().matriarc, { installed: true, enabled: false, navigator: true })
  again.host.dispose()
})

test('config default off; the user\'s choice wins over it', async () => {
  const r = await withCoordinator('matriarc-config', { ...withMatriarc, config: { matriarc: 'off' } })
  assert.deepEqual(r.service.getState().matriarc, { installed: true, enabled: false, navigator: true })
  assert.equal((await start(r, r.coordinator, 'Off')).lead.matriarc, false)
  r.service.setMatriarc(true)
  assert.equal((await start(r, r.coordinator, 'On')).lead.matriarc, true)
  r.host.dispose()
})

test('no navigator: /matriarc on is not run and nothing is noted; an error result is a note, never a failed start', async () => {
  const r = await withCoordinator('matriarc-no-navigator', { before: ({ host }) => { host.useMatriarc(); host.matriarcNavigators = [] } })
  const { result } = await start(r, r.coordinator, 'No navigator')
  assert.equal(result['error'], undefined)
  assert.ok(!JSON.stringify(result['notes'] ?? []).includes('Matriarc'), JSON.stringify(result['notes']))
  assert.deepEqual(matriarcLines(r), [])
  r.host.matriarcNavigators = ['codex']
  r.host.matriarcError = 'no navigator'
  const failed = await start(r, r.coordinator, 'Error')
  assert.equal(failed.result['error'], undefined)
  assert.ok((failed.result['notes'] as string[] | undefined)?.some(note => /Matriarc could not be switched on: no navigator/.test(note)), JSON.stringify(failed.result))
  r.host.dispose()
})

test('without Matriarc: not installed, nothing is run, the switch can still be stored', async () => {
  const r = await withCoordinator('matriarc-absent')
  assert.deepEqual(r.service.getState().matriarc, { installed: false, enabled: true, navigator: false })
  const { result } = await start(r, r.coordinator, 'No plugin')
  assert.equal(result['error'], undefined)
  assert.ok(!JSON.stringify(result['notes'] ?? []).includes('Matriarc'))
  assert.deepEqual(matriarcLines(r), [])
  assert.deepEqual(r.service.setMatriarc(false), { installed: false, enabled: false, navigator: false })
  r.host.dispose()
})

test('Matriarc loaded or removed while running: installed follows and the state revision moves, so the page updates', async () => {
  const r = await withCoordinator('matriarc-live', withMatriarc)
  r.host.emit('tools/change')
  const before = r.service.getState().revision
  r.host.globalTools = r.host.globalTools.filter(name => name !== 'matriarc')
  r.host.emit('tools/change')
  const removed = r.service.getState()
  assert.equal(removed.matriarc?.installed, false)
  assert.ok(removed.revision > before)
  r.host.globalTools.push('matriarc')
  r.host.emit('tools/change')
  const back = r.service.getState()
  assert.equal(back.matriarc?.installed, true)
  assert.ok(back.revision > removed.revision)
  r.host.dispose()
})

test('navigator: the state says whether one is registered, before any Session exists, and follows provider events', async () => {
  const r = rig('matriarc-navigator', { before: ({ host }) => { host.useMatriarc(); host.subagentProviders.clear() } })
  await r.service.ready
  assert.equal(r.service.getState().matriarc?.navigator, false)
  // An in-process (harness) provider does not count, as in Matriarc.
  r.host.subagentProviders.set('fork', { name: 'fork', inheritsParentContext: true, start: () => undefined, childAgent: 'harness' })
  assert.equal(r.service.getState().matriarc?.navigator, false)
  const before = r.service.getState().revision
  r.host.subagentProviders.set('claude-code', NAVIGATOR_PROVIDER('claude-code'))
  r.host.emit('subagent/provider-added', NAVIGATOR_PROVIDER('claude-code'))
  const added = r.service.getState()
  assert.equal(added.matriarc?.navigator, true)
  assert.ok(added.revision > before, 'the page polls the change')
  r.host.subagentProviders.delete('claude-code')
  r.host.emit('subagent/provider-removed', 'claude-code')
  assert.equal(r.service.getState().matriarc?.navigator, false)
  r.host.dispose()
})

test('a state file with the unreleased per-Orchestrator fields loads; the fields are ignored and dropped on save', async () => {
  const r = await withCoordinator('matriarc-legacy', withMatriarc)
  r.host.dispose()
  const file = storedState(r)
  Object.assign(file.coordinators[0]!, { coordinatorMatriarc: true, executorMatriarc: false })
  writeFileSync(r.stateFile, JSON.stringify(file))
  const parsed = parseState(JSON.stringify(file)).coordinators[0]! as unknown as Record<string, unknown>
  assert.ok(!('coordinatorMatriarc' in parsed) && !('executorMatriarc' in parsed))
  assert.equal(parseState(JSON.stringify({ ...file, matriarc: 'yes' })).matriarc, undefined, 'a non-boolean switch reads as unset')
  const again = rig('matriarc-legacy', { dir: r.dir, ...withMatriarc })
  await again.service.ready
  assert.deepEqual(again.service.getState().matriarc, { installed: true, enabled: true, navigator: true })
  again.service.setMatriarc(false)
  await tick(300)
  const saved = storedState(again)
  assert.equal(saved['matriarc'], false)
  assert.ok(saved.coordinators.every(c => !('coordinatorMatriarc' in c) && !('executorMatriarc' in c)))
  again.host.dispose()
})

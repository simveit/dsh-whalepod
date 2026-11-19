/**
 * A model per coordinator: one for its chat (`setCoordinatorModel`, one value with the chat's own model picker) and
 * one for its new Executor Sessions (`setExecutorModel`), both chosen by the owner from dsh's own lists
 * (`modelChoices`). The fake host's `ctx.llm` stands in for dsh's provider registry (harness.ts `useModels`).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { TYPERT_REMOTE } from '../src/client/remote.ts'
import { chatRunsOn, effortOptions, modelName, optionValue, selectedModel, withEffort, withModel } from '../src/client/model-view.ts'
import { TOOL } from '../src/host/names.ts'
import type { CoordinatorInfo, ModelChoice, ModelChoices } from '../src/types.ts'
import { FakeAgent, rig, tick, withCoordinator, type FakeProvider, type Rig } from './harness.ts'

const FLASH: ModelChoice = { provider: 'deepseek-official', model: 'deepseek-flash', reasoningEffort: 'high' }
const PRO: ModelChoice = { provider: 'deepseek-official', model: 'deepseek-pro', reasoningEffort: 'max' }
const GLM: ModelChoice = { provider: 'opencode-go', model: 'glm-5.3' }
const KIMI: ModelChoice = { provider: 'opencode-go', model: 'kimi-k3', reasoningEffort: 'low' }

/** Two providers; the dsh default is DeepSeek Flash. `glm-5.3` offers no reasoning efforts, `kimi-k3` has no default one. */
const providers = (): FakeProvider[] => [
  { id: 'opencode-go', name: 'OpenCode Go', models: [{ id: 'glm-5.3', name: 'GLM 5.3' }, { id: 'kimi-k3', name: 'Kimi K3', efforts: ['low', 'high'], noDefault: true }] },
  { id: 'deepseek-official', name: 'DeepSeek', models: [
    { id: 'deepseek-flash', name: 'DeepSeek V4.1 Flash', efforts: ['high', 'max'] },
    { id: 'deepseek-pro', name: 'DeepSeek V4.1 Pro', efforts: ['high', 'max'] },
  ] },
]

type WithCoordinator = Rig & { coordinator: FakeAgent; coordinatorId: string }
const setup = (name: string): Promise<WithCoordinator> => withCoordinator(name, { before: ({ host }) => { host.useModels(providers(), FLASH) } })
const infoOf = (r: Rig, coordinatorId: string): CoordinatorInfo => r.service.getState().coordinators.find(c => c.id === coordinatorId)!
const stored = (r: Rig) => (JSON.parse(readFileSync(r.stateFile, 'utf8')) as { coordinators: { id: string; coordinatorModel?: ModelChoice; executorModel?: ModelChoice }[] }).coordinators
const withoutModel = (r: Rig, provider: string, model: string): void => {
  r.host.providers = r.host.providers.map(p => (p.id === provider ? { ...p, models: p.models.filter(m => m.id !== model) } : p))
}

async function start(r: Rig, coordinator: FakeAgent, title: string, extra: Record<string, unknown> = {}): Promise<{ lead: FakeAgent; result: Record<string, unknown> }> {
  r.host.userTurn(coordinator, `Please do: ${title}`)
  const result = await r.host.call(coordinator.id, TOOL.start, { title, assignment: `${title}.`, ...extra })
  coordinator.endTurn()
  await tick(2)
  return { lead: r.host.agentOf(result['sessionId'] as string), result }
}

async function restart(r: Rig, edit?: (state: Record<string, any>) => void): Promise<Rig> {
  r.host.dispose()
  if (edit !== undefined) {
    const state = JSON.parse(readFileSync(r.stateFile, 'utf8')) as Record<string, any>
    edit(state)
    writeFileSync(r.stateFile, JSON.stringify(state))
  }
  r.host.reset()
  const again = rig('unused', { dir: r.dir, host: r.host })
  await again.service.ready
  await tick(5)
  return again
}

// --- Setting -----------------------------------------------------------------------------------------------------

test('setCoordinatorModel stores the model, selects it in the chat and saves; null clears and leaves the chat', async () => {
  const r = await setup('model-set-coordinator')
  assert.equal(infoOf(r, r.coordinatorId).coordinatorModel, undefined, 'nothing is set at first')
  assert.equal(r.coordinator.selected, undefined, 'the new chat follows the dsh default')
  const before = r.service.getState().revision

  const info = await r.service.setCoordinatorModel({ coordinatorId: r.coordinatorId, model: PRO })
  assert.deepEqual(info.coordinatorModel, PRO)
  assert.deepEqual(r.coordinator.selected, PRO, 'selected in the chat')
  assert.deepEqual(r.coordinator.log.at(-1), { type: 'model/selection', seq: r.coordinator.log.length, time: r.host.now, data: PRO })
  assert.ok(r.service.getState().revision > before)
  assert.deepEqual(stored(r).find(c => c.id === r.coordinatorId)!.coordinatorModel, PRO, 'saved at once')

  // A model without reasoning efforts, and one whose effort is left to the provider.
  assert.deepEqual((await r.service.setCoordinatorModel({ coordinatorId: r.coordinatorId, model: GLM })).coordinatorModel, GLM)
  assert.deepEqual(r.coordinator.selected, GLM)
  const plain = { provider: 'deepseek-official', model: 'deepseek-pro' }
  assert.deepEqual((await r.service.setCoordinatorModel({ coordinatorId: r.coordinatorId, model: plain })).coordinatorModel, plain)
  assert.deepEqual(r.coordinator.selected, plain)

  const cleared = await r.service.setCoordinatorModel({ coordinatorId: r.coordinatorId, model: null })
  assert.equal(cleared.coordinatorModel, undefined)
  assert.deepEqual(r.coordinator.selected, plain, 'the chat keeps the model it has')
  assert.equal('coordinatorModel' in stored(r).find(c => c.id === r.coordinatorId)!, false)
  r.host.dispose()
})

test('setExecutorModel stores the model and touches no Session', async () => {
  const r = await setup('model-set-executor')
  const { lead } = await start(r, r.coordinator, 'Running already')
  const selects = [r.coordinator.selects.length, lead.selects.length]
  const info = await r.service.setExecutorModel({ coordinatorId: r.coordinatorId, model: KIMI })
  assert.deepEqual(info.executorModel, KIMI)
  assert.equal(info.coordinatorModel, undefined)
  assert.deepEqual(stored(r).find(c => c.id === r.coordinatorId)!.executorModel, KIMI)
  assert.deepEqual([r.coordinator.selects.length, lead.selects.length], selects, 'neither the chat nor a running Executor Session is changed')
  assert.deepEqual(lead.model.current(), FLASH, 'the running Executor Session keeps its model')

  assert.equal((await r.service.setExecutorModel({ coordinatorId: r.coordinatorId, model: null })).executorModel, undefined)
  assert.equal('executorModel' in stored(r).find(c => c.id === r.coordinatorId)!, false)
  r.host.dispose()
})

test('both setters refuse what dsh does not offer, and store nothing', async () => {
  const r = await setup('model-refusals')
  const bad: [unknown, RegExp][] = [
    [{ provider: 'nobody', model: 'deepseek-flash' }, /its provider is not one dsh offers/],
    [{ provider: 'deepseek-official', model: 'glm-5.3' }, /its provider does not offer this model/],
    [{ provider: 'deepseek-official', model: 'deepseek-flash', reasoningEffort: 'ultra' }, /does not offer this reasoning effort/],
    [{ provider: 'opencode-go', model: 'glm-5.3', reasoningEffort: 'high' }, /does not offer this reasoning effort/],
    [{ provider: 7, model: 'deepseek-flash' }, /model must be null or name a provider and a model/],
    [{ provider: 'deepseek-official' }, /model must be null or name/],
    [{ provider: 'deepseek-official', model: '' }, /model must be null or name/],
    [{ provider: 'deepseek-official', model: 'deepseek-flash', reasoningEffort: 3 }, /model must be null or name/],
    [{ provider: 'deepseek-official', model: 'x'.repeat(201) }, /model must be null or name/],
    [{ provider: 'deepseek-official', model: 'deepseek-flash\n' }, /model must be null or name/],
    ['deepseek-official/deepseek-flash', /model must be null or name/],
    [['deepseek-official', 'deepseek-flash'], /model must be null or name/],
    [undefined, /model must be null or name/],
  ]
  for (const set of ['setCoordinatorModel', 'setExecutorModel'] as const) {
    for (const [model, why] of bad) await assert.rejects(r.service[set]({ coordinatorId: r.coordinatorId, model }), why, `${set} ${JSON.stringify(model)}`)
    await assert.rejects(r.service[set]({ coordinatorId: 'c-0000', model: FLASH }), /unknown Orchestrator/)
    await assert.rejects(r.service[set]({ model: FLASH }), /unknown Orchestrator/)
  }
  // A provider whose list fails: refused, and the provider's own error text (it names an address) is not passed on.
  r.host.providers = r.host.providers.map(p => (p.id === 'opencode-go' ? { ...p, broken: true } : p))
  await assert.rejects(r.service.setExecutorModel({ coordinatorId: r.coordinatorId, model: GLM }), (error: Error) => {
    assert.match(error.message, /dsh could not check it/)
    assert.doesNotMatch(error.message, /provider\.invalid/)
    return true
  })
  // Without dsh's provider registry nothing can be checked, so nothing is accepted.
  r.host.services.delete('llm')
  await assert.rejects(r.service.setCoordinatorModel({ coordinatorId: r.coordinatorId, model: FLASH }), /the model list of dsh is not available/)

  const info = infoOf(r, r.coordinatorId)
  assert.deepEqual([info.coordinatorModel, info.executorModel], [undefined, undefined])
  assert.equal(r.coordinator.selects.length, 0, 'a refused model is never selected')
  r.host.dispose()
})

test('extra fields of a request are dropped, and a setting of one coordinator leaves another alone', async () => {
  const r = await setup('model-two-coordinators')
  const second = await r.service.createCoordinator()
  const b = r.host.agentOf(second.sessionId)
  const info = await r.service.setCoordinatorModel({ coordinatorId: r.coordinatorId, model: { ...PRO, baseUrl: 'https://elsewhere.invalid', apiKey: 'k' } })
  assert.deepEqual(info.coordinatorModel, PRO, 'only the three ids are kept')
  await r.service.setExecutorModel({ coordinatorId: r.coordinatorId, model: KIMI })
  assert.deepEqual([infoOf(r, second.coordinatorId).coordinatorModel, infoOf(r, second.coordinatorId).executorModel], [undefined, undefined])
  assert.equal(b.selects.length, 0)
  const { lead } = await start(r, b, 'For B')
  assert.deepEqual(lead.model.current(), FLASH, 'an Executor Session of the other coordinator starts as before')
  r.host.dispose()
})

// --- Load --------------------------------------------------------------------------------------------------------

test('the state file: both models survive a restart, a file without them loads, malformed ones are dropped', async () => {
  const r = await setup('model-load')
  await r.service.setCoordinatorModel({ coordinatorId: r.coordinatorId, model: PRO })
  await r.service.setExecutorModel({ coordinatorId: r.coordinatorId, model: GLM })
  let again = await restart(r)
  assert.deepEqual([infoOf(again, r.coordinatorId).coordinatorModel, infoOf(again, r.coordinatorId).executorModel], [PRO, GLM])

  // Extra fields of a stored choice are not kept; a choice that is not a model by shape is dropped.
  again = await restart(again, (state) => {
    Object.assign(state['coordinators'][0], { coordinatorModel: { ...PRO, apiKey: 'k' }, executorModel: { provider: 'opencode-go', model: 7 } })
  })
  assert.deepEqual([infoOf(again, r.coordinatorId).coordinatorModel, infoOf(again, r.coordinatorId).executorModel], [PRO, undefined])
  for (const broken of ['deepseek-official/deepseek-flash', null, [], { provider: '', model: 'm' }, { provider: 'p', model: 'x'.repeat(201) }, { provider: 'p', model: 'm', reasoningEffort: '' }]) {
    again = await restart(again, (state) => { Object.assign(state['coordinators'][0], { coordinatorModel: broken, executorModel: broken }) })
    assert.deepEqual([infoOf(again, r.coordinatorId).coordinatorModel, infoOf(again, r.coordinatorId).executorModel], [undefined, undefined], JSON.stringify(broken))
  }
  // A file of an earlier release has neither field.
  again = await restart(again, (state) => { delete state['coordinators'][0].coordinatorModel; delete state['coordinators'][0].executorModel })
  assert.equal(again.service.getState().coordinators.length, 1)
  assert.equal(again.service.getState().problems, undefined)
  again.host.dispose()
})

test('a stored model dsh no longer offers is kept, is not used, and is used again when it is back', async () => {
  const r = await setup('model-load-gone')
  // A well-formed choice that names nothing dsh offers, as after a sign-out or a hand-edited file.
  const again = await restart(r, (state) => {
    Object.assign(state['coordinators'][0], { executorModel: { provider: 'signed-out', model: 'big' }, coordinatorModel: { provider: 'signed-out', model: 'big' } })
  })
  const gone = { provider: 'signed-out', model: 'big' }
  assert.deepEqual(infoOf(again, r.coordinatorId).executorModel, gone, 'kept for the page')
  const choices = await again.service.modelChoices({ coordinatorId: r.coordinatorId })
  assert.deepEqual(choices.executors, { stored: gone, effective: FLASH, available: false })
  assert.equal(choices.coordinator.available, false)
  const { lead, result } = await start(again, r.coordinator, 'With a model that is gone')
  assert.deepEqual(lead.model.current(), FLASH)
  assert.ok(!lead.selects.some(s => s.provider === 'signed-out'), 'a model dsh does not offer is never selected')
  assert.match((result['notes'] as string[]).join('\n'), /the model the user set for this Orchestrator's Executor Sessions is not available any more/)

  again.host.providers = [...again.host.providers, { id: 'signed-out', models: [{ id: 'big' }] }]
  assert.deepEqual((await again.service.modelChoices({ coordinatorId: r.coordinatorId })).executors, { stored: gone, effective: gone, available: true })
  const back = await start(again, r.coordinator, 'With the model back')
  assert.deepEqual(back.lead.selected, gone)
  assert.equal(back.result['notes'], undefined)
  again.host.dispose()
})

// --- New Executor Sessions -----------------------------------------------------------------------------------------

test('a new Executor Session starts on the executors\' model; one that runs already is not changed', async () => {
  const r = await setup('model-executor-start')
  const first = await start(r, r.coordinator, 'Before the setting')
  assert.deepEqual(first.lead.model.current(), FLASH)
  await r.service.setExecutorModel({ coordinatorId: r.coordinatorId, model: KIMI })
  const second = await start(r, r.coordinator, 'After the setting')
  assert.deepEqual(second.lead.selected, KIMI, 'model and effort are recorded in the new Session')
  assert.equal(second.result['notes'], undefined, 'nothing to say when the model is available')
  assert.equal(first.lead.selected, undefined, 'the earlier Executor Session was not touched')
  assert.equal(r.coordinator.selected, undefined, 'and neither was the coordinator chat')

  // The executors' model is recorded even when it equals the dsh default, so a later change of that default leaves the Session alone.
  await r.service.setExecutorModel({ coordinatorId: r.coordinatorId, model: FLASH })
  const third = await start(r, r.coordinator, 'On the default by choice')
  assert.deepEqual(third.lead.selected, FLASH)
  r.host.defaultModel = GLM
  assert.deepEqual(third.lead.model.current(), FLASH)
  assert.deepEqual(first.lead.model.current(), GLM, 'a Session without a selection follows the dsh default, as before')
  r.host.dispose()
})

test('"Same as coordinator": without an executors\' model a new Executor Session takes the coordinator\'s', async () => {
  const r = await setup('model-same-as-coordinator')
  await r.service.setCoordinatorModel({ coordinatorId: r.coordinatorId, model: PRO })
  const first = await start(r, r.coordinator, 'Follows the coordinator')
  assert.deepEqual(first.lead.selected, PRO)
  assert.deepEqual((await r.service.modelChoices({ coordinatorId: r.coordinatorId })).executors, { effective: PRO, available: true })

  // With its own model set, the coordinator's no longer matters; cleared again, it does.
  await r.service.setExecutorModel({ coordinatorId: r.coordinatorId, model: GLM })
  assert.deepEqual((await start(r, r.coordinator, 'Own model')).lead.selected, GLM)
  await r.service.setExecutorModel({ coordinatorId: r.coordinatorId, model: null })
  await r.service.setCoordinatorModel({ coordinatorId: r.coordinatorId, model: KIMI })
  assert.deepEqual((await start(r, r.coordinator, 'Follows again')).lead.selected, KIMI)
  assert.deepEqual(first.lead.selected, PRO, 'Executor Sessions that run keep the model they started on')
  r.host.dispose()
})

test('fallback: an executors\' model that is gone gives way to the coordinator\'s model, then to the dsh default, with a note', async () => {
  const r = await setup('model-fallback')
  await r.service.setCoordinatorModel({ coordinatorId: r.coordinatorId, model: PRO })
  await r.service.setExecutorModel({ coordinatorId: r.coordinatorId, model: KIMI })
  withoutModel(r, 'opencode-go', 'kimi-k3')

  const first = await start(r, r.coordinator, 'Kimi is gone')
  assert.deepEqual(first.lead.selected, PRO, 'the coordinator\'s model')
  const note = (first.result['notes'] as string[]).join('\n')
  assert.match(note, /is not available any more, so this one runs on another model; tell the user/)
  assert.doesNotMatch(note, /kimi|deepseek|opencode/i, 'the note names no model: no tool result tells a model which models are set')
  assert.deepEqual(infoOf(r, r.coordinatorId).executorModel, KIMI, 'the setting is kept')
  assert.deepEqual((await r.service.modelChoices({ coordinatorId: r.coordinatorId })).executors, { stored: KIMI, effective: PRO, available: false })

  // The coordinator's model goes too: the dsh default is what is left.
  withoutModel(r, 'deepseek-official', 'deepseek-pro')
  const second = await start(r, r.coordinator, 'Pro is gone too')
  assert.deepEqual(second.lead.model.current(), FLASH)
  assert.ok(!second.lead.selects.some(s => s.model === 'kimi-k3' || s.model === 'deepseek-pro'))
  assert.match((second.result['notes'] as string[]).join('\n'), /is not available any more/)
  const choices = await r.service.modelChoices({ coordinatorId: r.coordinatorId })
  assert.deepEqual(choices.executors, { stored: KIMI, effective: FLASH, available: false })
  assert.deepEqual(choices.coordinator, { stored: PRO, effective: PRO, available: false }, 'the chat still has the model that is gone, and the page says so')

  // Only the effort is gone: the choice as a whole no longer counts as available.
  r.host.providers = providers().map(p => ({ ...p, models: p.models.map(m => (m.id === 'kimi-k3' ? { ...m, efforts: ['high'] } : m)) }))
  assert.equal((await r.service.modelChoices({ coordinatorId: r.coordinatorId })).executors.available, false)
  // Back in dsh's list: used again, without a note.
  r.host.providers = providers()
  const third = await start(r, r.coordinator, 'Kimi is back')
  assert.deepEqual(third.lead.selected, KIMI)
  assert.equal(third.result['notes'], undefined)
  r.host.dispose()
})

test('R2: an executors\' model that dsh cannot be asked about starts nothing: no fallback takes its place for the life of a Session', async () => {
  const r = await setup('model-unchecked')
  await r.service.setCoordinatorModel({ coordinatorId: r.coordinatorId, model: PRO })
  await r.service.setExecutorModel({ coordinatorId: r.coordinatorId, model: KIMI })
  // The provider's list fails for a moment (a network error), which is not the answer "this model is gone".
  r.host.providers = r.host.providers.map(p => (p.id === 'opencode-go' ? { ...p, broken: true } : p))
  const creates = r.host.creates
  const groups = r.host.workspaces.length
  r.host.userTurn(r.coordinator, 'Please do: While the list fails')
  const refused = await r.host.call(r.coordinator.id, TOOL.start, { title: 'While the list fails', assignment: 'Do it.' })
  r.coordinator.endTurn()
  assert.match(String(refused['error']), /could not start the Executor Session: dsh could not check the model the user set for this Orchestrator's Executor Sessions just now, and no other model is used in its place\. Call executor_start again in a moment/)
  assert.doesNotMatch(JSON.stringify(refused), /kimi|deepseek|opencode|provider\.invalid/i, 'the refusal names no model and no address')
  assert.deepEqual([r.host.creates, r.host.workspaces.length, r.service.listThreads().length], [creates, groups, 0], 'no Session, no group and no row were made')
  // The page says the same: nothing applies, and it is not "gone".
  const choices = await r.service.modelChoices({ coordinatorId: r.coordinatorId })
  assert.deepEqual(choices.executors, { stored: KIMI, available: false, unchecked: true })
  assert.equal(choices.partial, true)
  assert.deepEqual(infoOf(r, r.coordinatorId).executorModel, KIMI, 'the setting is kept')
  // The list answers again: the same call starts on the executors' model.
  r.host.providers = providers()
  const again = await start(r, r.coordinator, 'While the list fails')
  assert.deepEqual(again.lead.selected, KIMI)
  assert.equal(again.result['notes'], undefined)
  assert.deepEqual((await r.service.modelChoices({ coordinatorId: r.coordinatorId })).executors, { stored: KIMI, effective: KIMI, available: true })

  // The coordinator's own model that cannot be asked about is shown as that, too; its chat keeps running on it.
  r.host.providers = r.host.providers.map(p => (p.id === 'deepseek-official' ? { ...p, broken: true } : p))
  assert.deepEqual((await r.service.modelChoices({ coordinatorId: r.coordinatorId })).coordinator, { stored: PRO, effective: PRO, available: false, unchecked: true })
  r.host.dispose()
})

test('R3: the coordinator\'s model as the fallback of a new Executor Session gets the full check, its effort included', async () => {
  const r = await setup('model-fallback-effort')
  await r.service.setCoordinatorModel({ coordinatorId: r.coordinatorId, model: KIMI })
  assert.deepEqual((await start(r, r.coordinator, 'Follows the coordinator')).lead.selected, KIMI)
  // dsh no longer lists the effort the chat's model was chosen with: the model is not selected in a new Session.
  r.host.providers = providers().map(p => ({ ...p, models: p.models.map(m => (m.id === 'kimi-k3' ? { ...m, efforts: ['high'] } : m)) }))
  const second = await start(r, r.coordinator, 'Effort is gone')
  assert.deepEqual(second.lead.model.current(), FLASH, 'the dsh default')
  assert.ok(!second.lead.selects.some(s => s.model === 'kimi-k3'))
  assert.deepEqual((await r.service.modelChoices({ coordinatorId: r.coordinatorId })).executors, { effective: FLASH, available: true })
  // A model whose details dsh cannot give is not selected either (a fallback is skipped, not refused).
  r.host.providers = providers().map(p => ({ ...p, models: p.models.map(m => (m.id === 'kimi-k3' ? { ...m, broken: true } : m)) }))
  const third = await start(r, r.coordinator, 'Details fail')
  assert.equal(third.result['error'], undefined)
  assert.deepEqual(third.lead.model.current(), FLASH)
  r.host.dispose()
})

// --- One value with the chat ---------------------------------------------------------------------------------------

test('a model picked by hand in the coordinator chat becomes the setting', async () => {
  const r = await setup('model-composer')
  const before = r.service.getState().revision
  // dsh's composer: `session.selectModel` checks the choice and calls `agent.model.select`. The plugin checks it too
  // before it stores it, so the setting follows a moment later.
  r.coordinator.model.select(PRO)
  await tick(2)
  assert.deepEqual(infoOf(r, r.coordinatorId).coordinatorModel, PRO)
  assert.ok(r.service.getState().revision > before, 'the page is told')
  await tick(250)
  assert.deepEqual(stored(r).find(c => c.id === r.coordinatorId)!.coordinatorModel, PRO, 'and it is saved')
  // An effort-only change is a change too.
  r.coordinator.model.select({ ...PRO, reasoningEffort: 'high' })
  await tick(2)
  assert.deepEqual(infoOf(r, r.coordinatorId).coordinatorModel, { ...PRO, reasoningEffort: 'high' })
  // New Executor Sessions follow it while the executors' model is "Same as coordinator".
  assert.deepEqual((await start(r, r.coordinator, 'After the hand change')).lead.selected, { ...PRO, reasoningEffort: 'high' })

  // The page's own selection comes back as the same event and changes nothing more.
  const revision = r.service.getState().revision
  await r.service.setCoordinatorModel({ coordinatorId: r.coordinatorId, model: GLM })
  assert.equal(r.coordinator.selects.length, 3)
  assert.deepEqual(infoOf(r, r.coordinatorId).coordinatorModel, GLM)
  assert.equal(r.service.getState().revision, revision + 1, 'one change, not two')
  // A malformed event stores nothing.
  r.coordinator.append('model/selection', { provider: 'deepseek-official' })
  r.coordinator.append('model/selection', null)
  await tick(2)
  assert.deepEqual(infoOf(r, r.coordinatorId).coordinatorModel, GLM)
  r.host.dispose()
})

test('R3: a selection in the chat is stored only when dsh lists its provider, model and effort; of two quick ones the later counts', async () => {
  const r = await setup('model-composer-checked')
  await r.service.setCoordinatorModel({ coordinatorId: r.coordinatorId, model: GLM })
  // Another plugin can call `agent.model.select` with anything: none of these becomes the setting.
  for (const bad of [{ provider: 'nobody', model: 'big' }, { provider: 'opencode-go', model: 'nope' }, { ...FLASH, reasoningEffort: 'ultra' }, { ...GLM, reasoningEffort: 'high' }]) {
    r.coordinator.model.select(bad)
    await tick(2)
    assert.deepEqual(infoOf(r, r.coordinatorId).coordinatorModel, GLM, JSON.stringify(bad))
  }
  await tick(250)
  assert.deepEqual(stored(r).find(c => c.id === r.coordinatorId)!.coordinatorModel, GLM, 'and nothing else was saved')
  // The chat does run on what was selected there, and the page is told so (R1).
  const choices = await r.service.modelChoices({ coordinatorId: r.coordinatorId })
  assert.deepEqual(choices.coordinator, { stored: GLM, effective: { ...GLM, reasoningEffort: 'high' }, available: true })
  assert.deepEqual(chatRunsOn(GLM, choices.coordinator), { ...GLM, reasoningEffort: 'high' })
  // A provider that cannot be asked: not stored either, and its error text stays out of the log line.
  r.host.providers = r.host.providers.map(p => (p.id === 'opencode-go' ? { ...p, broken: true } : p))
  r.coordinator.model.select(KIMI)
  await tick(2)
  assert.deepEqual(infoOf(r, r.coordinatorId).coordinatorModel, GLM)
  r.host.providers = providers()
  // Two selections in a row: the checks of both run, and only the one the chat still has is stored.
  r.coordinator.model.select(PRO)
  r.coordinator.model.select(FLASH)
  await tick(2)
  assert.deepEqual(infoOf(r, r.coordinatorId).coordinatorModel, FLASH)
  assert.equal(chatRunsOn(FLASH, (await r.service.modelChoices({ coordinatorId: r.coordinatorId })).coordinator), undefined)
  r.host.dispose()
})

test('R1: the page is told when an open chat runs on another model than the stored one', async () => {
  const r = await setup('model-differs')
  await r.service.setCoordinatorModel({ coordinatorId: r.coordinatorId, model: FLASH })
  // The chat is archived, the owner sets another model (only stored), and then restores the chat in dsh's own archive
  // view instead of using Reopen: it keeps the model it had.
  await (r.host.ctx['workspaceRegistry'] as { archiveSession: (id: string) => Promise<void> }).archiveSession(r.coordinator.id)
  await r.service.setCoordinatorModel({ coordinatorId: r.coordinatorId, model: PRO })
  assert.deepEqual((await r.service.modelChoices({ coordinatorId: r.coordinatorId })).coordinator, { stored: PRO, effective: PRO, available: true }, 'archived: what a new chat would get')
  r.host.archived.length = 0
  const state = (await r.service.modelChoices({ coordinatorId: r.coordinatorId })).coordinator
  assert.deepEqual(state, { stored: PRO, effective: FLASH, available: true })
  assert.deepEqual(chatRunsOn(PRO, state), FLASH, 'the row says which model the chat runs on')
  // Choosing the model in the chat makes them one again.
  r.coordinator.model.select(PRO)
  await tick(2)
  assert.equal(chatRunsOn(PRO, (await r.service.modelChoices({ coordinatorId: r.coordinatorId })).coordinator), undefined)

  // No hint without a setting, for the same model and effort, or for a stored model that has its own warning.
  assert.equal(chatRunsOn(undefined, { effective: FLASH, available: true }), undefined)
  assert.equal(chatRunsOn(FLASH, { stored: FLASH, effective: { ...FLASH }, available: true }), undefined)
  assert.deepEqual(chatRunsOn(FLASH, { stored: FLASH, effective: { ...FLASH, reasoningEffort: 'max' }, available: true }), { ...FLASH, reasoningEffort: 'max' }, 'another effort is another choice')
  assert.equal(chatRunsOn(KIMI, { stored: KIMI, effective: FLASH, available: false }), undefined)
  assert.equal(chatRunsOn(KIMI, { stored: KIMI, available: true }), undefined)
  assert.equal(chatRunsOn(KIMI, undefined), undefined)
  r.host.dispose()
})

test('R4: a chat that is replaced while setCoordinatorModel waits for its Agent is not selected in; the model is stored', async () => {
  const r = await setup('model-set-race')
  const controller = r.host.ctx['sessionController'] as { resolveAgent: (id: string) => Promise<unknown> }
  const resolve = controller.resolveAgent
  let release!: () => void
  const gate = new Promise<void>((done) => { release = done })
  controller.resolveAgent = async (id: string) => { await gate; return resolve(id) }
  const setting = r.service.setCoordinatorModel({ coordinatorId: r.coordinatorId, model: PRO })
  await tick(2)
  // Meanwhile the chat is archived (as the sidebar's delete does).
  controller.resolveAgent = resolve
  await (r.host.ctx['workspaceRegistry'] as { archiveSession: (id: string) => Promise<void> }).archiveSession(r.coordinator.id)
  release()
  const info = await setting
  assert.deepEqual(info.coordinatorModel, PRO, 'stored')
  assert.equal(r.coordinator.selects.length, 0, 'nothing is selected in the chat that was archived meanwhile')
  // Reopen starts the new chat on it.
  const chat = r.host.agentOf((await r.service.ensureCoordinator({ coordinatorId: r.coordinatorId })).sessionId)
  assert.deepEqual(chat.selected, PRO)

  // A coordinator deleted meanwhile: refused, nothing stored anywhere.
  const second = await r.service.createCoordinator()
  let free!: () => void
  const hold = new Promise<void>((done) => { free = done })
  controller.resolveAgent = async (id: string) => { await hold; return resolve(id) }
  const late = r.service.setCoordinatorModel({ coordinatorId: second.coordinatorId, model: PRO })
  await tick(2)
  controller.resolveAgent = resolve
  await r.service.archiveCoordinator({ coordinatorId: second.coordinatorId })
  r.service.deleteCoordinator({ coordinatorId: second.coordinatorId })
  free()
  await assert.rejects(late, /unknown Orchestrator/)
  assert.equal(r.host.agentOf(second.sessionId).selects.length, 0)
  r.host.dispose()
})

test('a model picked by hand in an Executor Session stays there: no setting follows it, and no setting overrides it', async () => {
  const r = await setup('model-executor-hand')
  await r.service.setExecutorModel({ coordinatorId: r.coordinatorId, model: KIMI })
  const { lead } = await start(r, r.coordinator, 'Hand change')
  const member = r.host.addMember(lead, 'writer')
  const revision = r.service.getState().revision
  lead.model.select(GLM)
  member.model.select(PRO)
  const info = infoOf(r, r.coordinatorId)
  assert.deepEqual([info.coordinatorModel, info.executorModel], [undefined, KIMI], 'neither setting follows the Executor Session')
  assert.equal(r.service.getState().revision, revision)
  assert.equal(r.coordinator.selects.length, 0)

  // Later changes of both settings leave the Executor Session and its Teammate on what was picked there.
  await r.service.setExecutorModel({ coordinatorId: r.coordinatorId, model: PRO })
  await r.service.setCoordinatorModel({ coordinatorId: r.coordinatorId, model: FLASH })
  await r.service.setExecutorModel({ coordinatorId: r.coordinatorId, model: null })
  assert.deepEqual(lead.selected, GLM)
  assert.deepEqual(member.selected, PRO)
  assert.deepEqual(lead.selects, [KIMI, GLM], 'the plugin selected once, when it created the Session')
  r.host.dispose()
})

test('a replacement chat starts on the coordinator\'s model, or on the dsh default when that model is gone', async () => {
  const r = await setup('model-reopen')
  await r.service.setCoordinatorModel({ coordinatorId: r.coordinatorId, model: FLASH })
  const archive = (id: string) => (r.host.ctx['workspaceRegistry'] as { archiveSession: (id: string) => Promise<void> }).archiveSession(id)
  await archive(r.coordinator.id)
  // While the chat is archived the setting is only stored.
  await r.service.setCoordinatorModel({ coordinatorId: r.coordinatorId, model: PRO })
  assert.deepEqual(r.coordinator.selected, FLASH, 'an archived chat is not touched')
  const reopened = await r.service.ensureCoordinator({ coordinatorId: r.coordinatorId })
  const chat = r.host.agentOf(reopened.sessionId)
  assert.notEqual(chat.id, r.coordinator.id)
  assert.deepEqual(chat.selected, PRO)
  assert.deepEqual(infoOf(r, r.coordinatorId).coordinatorModel, PRO)

  // The stored model equals the dsh default: still recorded in the new chat, so the default can change without it.
  await r.service.setCoordinatorModel({ coordinatorId: r.coordinatorId, model: FLASH })
  await archive(chat.id)
  const third = r.host.agentOf((await r.service.ensureCoordinator({ coordinatorId: r.coordinatorId })).sessionId)
  assert.deepEqual(third.selected, FLASH)

  // The stored model is gone: the new chat follows the dsh default, the setting stays for the page.
  await r.service.setCoordinatorModel({ coordinatorId: r.coordinatorId, model: KIMI })
  withoutModel(r, 'opencode-go', 'kimi-k3')
  await archive(third.id)
  const fourth = r.host.agentOf((await r.service.ensureCoordinator({ coordinatorId: r.coordinatorId })).sessionId)
  assert.equal(fourth.selected, undefined)
  assert.deepEqual(fourth.model.current(), FLASH)
  assert.deepEqual(infoOf(r, r.coordinatorId).coordinatorModel, KIMI)
  assert.deepEqual((await r.service.modelChoices({ coordinatorId: r.coordinatorId })).coordinator, { stored: KIMI, effective: FLASH, available: false })
  r.host.dispose()
})

// --- The list for the page -----------------------------------------------------------------------------------------

test('modelChoices lists dsh\'s providers, models and efforts, and what each setting resolves to', async () => {
  const r = await setup('model-choices')
  r.host.providers = [...providers(), { id: 'deepseek-account', name: 'Account', models: [{ id: 'auto' }] }, { id: 'empty', models: [] }]
  const choices = await r.service.modelChoices({ coordinatorId: r.coordinatorId })
  assert.deepEqual(choices.groups.map(g => g.id), ['deepseek-account', 'deepseek-official', 'opencode-go'], 'dsh\'s order; a provider without models is left out')
  assert.deepEqual(choices.groups[1], { id: 'deepseek-official', name: 'DeepSeek', models: [
    { id: 'deepseek-flash', name: 'DeepSeek V4.1 Flash', efforts: [{ id: 'high', name: 'High' }, { id: 'max', name: 'Max' }], defaultEffort: 'high' },
    { id: 'deepseek-pro', name: 'DeepSeek V4.1 Pro', efforts: [{ id: 'high', name: 'High' }, { id: 'max', name: 'Max' }], defaultEffort: 'high' },
  ] })
  assert.deepEqual(choices.groups[2]!.models, [{ id: 'glm-5.3', name: 'GLM 5.3' }, { id: 'kimi-k3', name: 'Kimi K3', efforts: [{ id: 'low', name: 'Low' }, { id: 'high', name: 'High' }] }])
  assert.equal(choices.partial, false)
  // Nothing set: the chat and a new Executor Session both run on the dsh default.
  assert.deepEqual(choices.coordinator, { effective: FLASH, available: true })
  assert.deepEqual(choices.executors, { effective: FLASH, available: true })

  await r.service.setCoordinatorModel({ coordinatorId: r.coordinatorId, model: PRO })
  await r.service.setExecutorModel({ coordinatorId: r.coordinatorId, model: GLM })
  const set = await r.service.modelChoices({ coordinatorId: r.coordinatorId })
  assert.deepEqual(set.coordinator, { stored: PRO, effective: PRO, available: true })
  assert.deepEqual(set.executors, { stored: GLM, effective: GLM, available: true })
  // The codec of the client keeps all of it.
  const codec = (TYPERT_REMOTE as unknown as { methods: Record<string, { result: { create(): { parse(v: unknown): unknown } } }> }).methods['coordinator/listModelChoices']!.result.create()
  assert.deepEqual(codec.parse(JSON.parse(JSON.stringify(set))), set)

  // A provider whose list fails is left out; the page hears that the list is incomplete, not the provider's error text.
  r.host.providers = r.host.providers.map(p => (p.id === 'opencode-go' ? { ...p, broken: true } : p))
  const partial = await r.service.modelChoices({ coordinatorId: r.coordinatorId })
  assert.deepEqual(partial.groups.map(g => g.id), ['deepseek-account', 'deepseek-official'])
  assert.equal(partial.partial, true)
  assert.doesNotMatch(JSON.stringify(partial), /provider\.invalid/)
  // R6: one model whose details fail does not hide its provider: it is listed without efforts, and the list says it is incomplete.
  r.host.providers = [...providers().map(p => ({ ...p, models: p.models.map(m => (m.id === 'deepseek-pro' ? { ...m, broken: true } : m)) }))]
  const oneBroken = await r.service.modelChoices({ coordinatorId: r.coordinatorId })
  assert.deepEqual(oneBroken.groups.map(g => g.id), ['deepseek-official', 'opencode-go'])
  assert.deepEqual(oneBroken.groups[0]!.models.map(m => [m.id, m.efforts?.length]), [['deepseek-flash', 2], ['deepseek-pro', undefined]])
  assert.equal(oneBroken.partial, true)
  assert.doesNotMatch(JSON.stringify(oneBroken), /provider\.invalid/)
  await assert.rejects(r.service.modelChoices({ coordinatorId: 'c-0000' }), /unknown Orchestrator/)
  await assert.rejects(r.service.modelChoices({}), /unknown Orchestrator/)
  r.host.services.delete('llm')
  assert.deepEqual((await r.service.modelChoices({ coordinatorId: r.coordinatorId })).groups, [])
  r.host.dispose()
})

// --- What the plugin must never do ---------------------------------------------------------------------------------

test('the dsh default is never changed: the plugin selects through the Session\'s Agent only', async () => {
  const r = await setup('model-global-default')
  await r.service.setCoordinatorModel({ coordinatorId: r.coordinatorId, model: PRO })
  await r.service.setExecutorModel({ coordinatorId: r.coordinatorId, model: KIMI })
  await start(r, r.coordinator, 'One')
  await r.service.setCoordinatorModel({ coordinatorId: r.coordinatorId, model: null })
  await r.service.setExecutorModel({ coordinatorId: r.coordinatorId, model: null })
  await start(r, r.coordinator, 'Two')
  const second = await r.service.createCoordinator()
  await start(r, r.host.agentOf(second.sessionId), 'Three')
  assert.deepEqual(r.host.globalModelWrites, [], 'neither session.selectModel nor agentDefaultModel.saveSelection was called')
  assert.deepEqual(r.host.defaultModel, FLASH)
  assert.equal(r.host.agentOf(second.sessionId).selected, undefined, 'a new coordinator still follows the dsh default')
  // And the source has no call that could: dsh's `selectModel` also saves the selection as the global default.
  const read = (path: string) => readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), 'utf8')
  for (const file of ['src/host/threads.ts', 'src/host/model.ts', 'src/host/tools.ts', 'src/index.ts']) {
    assert.doesNotMatch(read(file).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''), /\.selectModel\(|saveSelection/, file)
  }
  r.host.dispose()
})

test('owner only: the three Remote methods refuse another caller, and no tool reads or sets a model', async () => {
  const read = (path: string) => readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), 'utf8')
  const index = read('src/index.ts')
  for (const method of ['listModelChoices', 'setCoordinatorModel', 'setExecutorModel']) {
    const at = index.indexOf(`async ${method}(`)
    assert.ok(at > 0, method)
    const body = index.slice(at, index.indexOf('\n  }\n', at))
    assert.match(body, /requireOwner\(this\.ctx\)/, `${method} is owner only`)
    assert.ok(body.indexOf('requireOwner(this.ctx)') < body.indexOf('this.service()'), `${method} checks the caller before it does anything`)
    assert.match(index.slice(index.lastIndexOf('\n\n', at), at), /@Remote\n/, `${method} is a Remote method`)
  }
  const methods = (TYPERT_REMOTE as unknown as { methods: Record<string, { parameters: { name: string; acceptsUndefined?: true; codec: { create(): { parse(v: unknown): unknown } } }[] }> }).methods
  for (const method of ['setCoordinatorModel', 'setExecutorModel']) {
    const param = methods[`coordinator/${method}`]!.parameters[0]!
    assert.equal(param.name, 'request')
    assert.equal(param.acceptsUndefined, undefined)
    assert.deepEqual(param.codec.create().parse({ coordinatorId: 'c-1', model: PRO }), { coordinatorId: 'c-1', model: PRO })
    assert.deepEqual(param.codec.create().parse({ coordinatorId: 'c-1', model: null }), { coordinatorId: 'c-1', model: null })
    assert.throws(() => param.codec.create().parse({ coordinatorId: 'c-1' }), 'a request must say null to clear')
    assert.throws(() => param.codec.create().parse({ coordinatorId: 'c-1', model: 'deepseek-flash' }))
  }
  assert.deepEqual(methods['coordinator/listModelChoices']!.parameters[0]!.codec.create().parse({ coordinatorId: 'c-1' }), { coordinatorId: 'c-1' })

  // No tool of the coordinator or of a Lead takes or returns a model.
  const r = await setup('model-tools')
  await r.service.setCoordinatorModel({ coordinatorId: r.coordinatorId, model: PRO })
  await r.service.setExecutorModel({ coordinatorId: r.coordinatorId, model: KIMI })
  for (const tool of r.host.tools) {
    assert.doesNotMatch(JSON.stringify(tool.def.parameters), /"(model|provider|reasoningEffort|coordinatorModel|executorModel)"/, tool.def.name)
  }
  // A model named in a tool call is ignored: the new Executor Session gets the owner's setting.
  const { lead, result } = await start(r, r.coordinator, 'Asks for a model', { model: GLM, executorModel: GLM, provider: 'opencode-go' })
  assert.deepEqual(lead.selected, KIMI)
  const list = await r.host.call(r.coordinator.id, TOOL.list, {})
  for (const text of [JSON.stringify(result), JSON.stringify(list)]) assert.doesNotMatch(text, /kimi-k3|deepseek-pro|reasoningEffort|executorModel|coordinatorModel/)
  assert.deepEqual([infoOf(r, r.coordinatorId).coordinatorModel, infoOf(r, r.coordinatorId).executorModel], [PRO, KIMI])
  r.host.dispose()
})

// --- The page's own logic ------------------------------------------------------------------------------------------

test('the page: option values, names, and the effort rules of dsh\'s own picker', () => {
  const choices: ModelChoices = {
    groups: [
      { id: 'deepseek-official', name: 'DeepSeek', models: [
        { id: 'deepseek-flash', name: 'DeepSeek V4.1 Flash', efforts: [{ id: 'high', name: 'High' }, { id: 'max', name: 'Max' }], defaultEffort: 'high' },
      ] },
      { id: 'opencode-go', name: 'OpenCode Go', models: [{ id: 'glm-5.3', name: 'GLM 5.3' }, { id: 'kimi-k3', name: 'Kimi K3', efforts: [{ id: 'low', name: 'Low' }, { id: 'high', name: 'High' }] }] },
    ],
    partial: false, coordinator: { available: true }, executors: { available: true },
  }
  // An option value holds both ids without a separator that an id could contain.
  assert.notEqual(optionValue('a/b', 'c'), optionValue('a', 'b/c'))
  assert.equal(selectedModel(choices, optionValue('opencode-go', 'glm-5.3'))?.model.name, 'GLM 5.3')
  assert.equal(selectedModel(choices, optionValue('opencode-go', 'nope')), undefined)

  assert.equal(modelName(choices, FLASH), 'DeepSeek V4.1 Flash · High')
  assert.equal(modelName(choices, { provider: 'deepseek-official', model: 'deepseek-flash' }), 'DeepSeek V4.1 Flash · High', 'no effort chosen: the model\'s default one')
  assert.equal(modelName(choices, GLM), 'GLM 5.3')
  assert.equal(modelName(choices, { provider: 'opencode-go', model: 'kimi-k3' }), 'Kimi K3', 'no effort and no default: the name alone')
  assert.equal(modelName(choices, { provider: 'signed-out', model: 'big', reasoningEffort: 'max' }), 'signed-out/big', 'a model that is not in the list shows its ids')
  assert.equal(modelName(undefined, GLM), 'opencode-go/glm-5.3')

  // Picking a model: its default effort, or the effort already chosen when the model stays the same (as dsh's picker).
  assert.deepEqual(withModel(choices, optionValue('deepseek-official', 'deepseek-flash'), GLM), { provider: 'deepseek-official', model: 'deepseek-flash', reasoningEffort: 'high' })
  assert.deepEqual(withModel(choices, optionValue('deepseek-official', 'deepseek-flash'), { ...FLASH, reasoningEffort: 'max' }), { ...FLASH, reasoningEffort: 'max' })
  assert.deepEqual(withModel(choices, optionValue('opencode-go', 'kimi-k3'), FLASH), { provider: 'opencode-go', model: 'kimi-k3' })
  assert.deepEqual(withModel(choices, optionValue('opencode-go', 'glm-5.3'), FLASH), GLM)
  assert.equal(withModel(choices, 'nope', FLASH), undefined)

  // The effort list: "Default" is offered only for a model without a default effort.
  const flash = choices.groups[0]!.models[0]!
  const kimi = choices.groups[1]!.models[1]!
  assert.deepEqual(effortOptions(flash, 'Default'), [{ value: 'high', name: 'High' }, { value: 'max', name: 'Max' }])
  assert.deepEqual(effortOptions(kimi, 'Default'), [{ value: '', name: 'Default' }, { value: 'low', name: 'Low' }, { value: 'high', name: 'High' }])
  assert.deepEqual(effortOptions(choices.groups[1]!.models[0]!, 'Default'), [])
  assert.deepEqual(withEffort(FLASH, 'max'), { ...FLASH, reasoningEffort: 'max' })
  assert.deepEqual(withEffort(KIMI, ''), { provider: 'opencode-go', model: 'kimi-k3' })
})

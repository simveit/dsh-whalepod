/**
 * The setup step of New coordinator: the host proposes a free name and a default model for the coordinator's chat and
 * for its Executor Sessions (`newCoordinatorSetup`), the form sends back what the user confirmed, and
 * `createCoordinator` checks all of it again before it makes anything. The fake host's `ctx.llm` stands in for dsh's
 * provider registry (harness.ts `useModels`).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { en, zh } from '../src/client/locales.ts'
import { formModel, optionLabel } from '../src/client/model-view.ts'
import { TYPERT_REMOTE } from '../src/client/remote.ts'
import { createThenOpen, nameKeyOf, newCoordinatorRequest, newDraftAt, reloadedSetup, suggestionStillFree, type NewCoordinatorDraft } from '../src/client/store.ts'
import { COORDINATOR_NAME_MAX, COORDINATOR_NAMES, freeName, freeNames, isFreeName, nameKey } from '../src/host/ids.ts'
import { defaultModelIn, NEW_COORDINATOR_MODELS, newCoordinatorModels } from '../src/host/model-defaults.ts'
import { TOOL } from '../src/host/names.ts'
import type { CoordinatorInfo, ModelChoice, ModelChoices, NewCoordinatorSetup } from '../src/types.ts'
import { rig, tick, type FakeAgent, type FakeModel, type FakeProvider, type Rig } from './harness.ts'

/** DeepSeek V4.1 Flash as two kinds of provider list it. */
const GO_LOW: ModelChoice = { provider: 'opencode-go', model: 'deepseek-v4.1-flash', reasoningEffort: 'low' }
const GO_HIGH: ModelChoice = { provider: 'opencode-go', model: 'deepseek-v4.1-flash', reasoningEffort: 'high' }
const OWN_LOW: ModelChoice = { provider: 'deepseek-official', model: 'deepseek-flash', reasoningEffort: 'low' }
const OWN_HIGH: ModelChoice = { provider: 'deepseek-official', model: 'deepseek-flash', reasoningEffort: 'high' }
const GLM: ModelChoice = { provider: 'opencode-go', model: 'glm-5.3' }
const PRO: ModelChoice = { provider: 'deepseek-official', model: 'deepseek-v4-pro', reasoningEffort: 'max' }

/**
 * Two providers that both offer the model: OpenCode Go under `deepseek-v4.1-flash` (efforts low, high and max, no
 * default one, as in the app), DeepSeek's own route under `deepseek-flash` (default effort high). The fake lists
 * `efforts[0]` as the default.
 */
const providers = (): FakeProvider[] => [
  { id: 'opencode-go', name: 'OpenCode Go', models: [
    { id: 'glm-5.3', name: 'GLM 5.3' },
    { id: 'deepseek-v4.1-flash', name: 'DeepSeek V4.1 Flash', efforts: ['low', 'high', 'max'], noDefault: true },
  ] },
  { id: 'deepseek-official', name: 'DeepSeek', models: [
    { id: 'deepseek-flash', name: 'DeepSeek-V4.1-Flash', efforts: ['high', 'off', 'low', 'max'] },
    { id: 'deepseek-v4-pro', name: 'DeepSeek-V4-Pro', efforts: ['high', 'max'] },
  ] },
]

const listed = new Set(COORDINATOR_NAMES.map(e => e.name))
/** A rig without a coordinator; `models` installs the fake provider registry with the user's dsh default model. */
async function fresh(name: string, models?: { providers?: FakeProvider[]; default?: FakeModel }, deps: Parameters<typeof rig>[1] = {}): Promise<Rig> {
  const r = rig(name, { ...deps, before: ({ host }) => { if (models !== undefined) host.useModels(models.providers ?? providers(), models.default ?? GLM) } })
  await r.service.ready
  return r
}
const infoOf = (r: Rig, id: string): CoordinatorInfo => r.service.getState().coordinators.find(c => c.id === id)!
const stored = (r: Rig) => (JSON.parse(readFileSync(r.stateFile, 'utf8')) as { coordinators: { id: string; name?: string; coordinatorModel?: ModelChoice; executorModel?: ModelChoice }[] }).coordinators
const base = (r: Rig) => join(r.home, 'Documents', 'deepseek-harness')
/** What a creation leaves behind: records, Workspaces, Sessions dsh was asked to create, and folders below the base. */
const footprint = (r: Rig) => ({
  coordinators: r.service.getState().coordinators.length, workspaces: r.host.workspaces.length, creates: r.host.creates,
  folders: existsSync(base(r)) ? readdirSync(base(r)).sort() : [],
})
const create = (r: Rig, request?: unknown) => (r.service.createCoordinator as (q?: unknown) => Promise<{ coordinatorId: string; sessionId: string }>)(request)
const methods = (TYPERT_REMOTE as unknown as { methods: Record<string, { parameters: { codec: { create(): { parse(v: unknown): unknown } } }[]; result: { create(): { parse(v: unknown): unknown } } }> }).methods

async function start(r: Rig, coordinator: FakeAgent, title: string): Promise<FakeAgent> {
  r.host.userTurn(coordinator, `Please do: ${title}`)
  const result = await r.host.call(coordinator.id, TOOL.start, { title, assignment: `${title}.` })
  coordinator.endTurn()
  await tick(2)
  return r.host.agentOf(result['sessionId'] as string)
}

// --- What the form starts from -------------------------------------------------------------------------------------

test('T8: the setup proposes a free built-in name, dsh\'s models, and the default model at low and high effort', async () => {
  const r = await fresh('setup-proposal', {})
  const before = { ...footprint(r), revision: r.service.getState().revision }
  const setup = await r.service.newCoordinatorSetup()
  assert.ok(listed.has(setup.name), `${setup.name} is on the built-in list`)
  // The user's dsh default model is on OpenCode Go, so the model is taken from that provider.
  assert.deepEqual([setup.coordinatorModel, setup.executorModel], [GO_LOW, GO_HIGH])
  assert.deepEqual(setup.groups.map(g => g.id), ['deepseek-official', 'opencode-go'], 'the list of the model rows')
  assert.deepEqual(setup.groups[1]!.models[1], { id: 'deepseek-v4.1-flash', name: 'DeepSeek V4.1 Flash', efforts: [{ id: 'low', name: 'Low' }, { id: 'high', name: 'High' }, { id: 'max', name: 'Max' }] })
  assert.equal(setup.partial, false)
  assert.deepEqual({ ...footprint(r), revision: r.service.getState().revision }, before, 'asking reserves and creates nothing')
  // The client's codec keeps all of it.
  assert.deepEqual(methods['coordinator/newCoordinatorSetup']!.result.create().parse(JSON.parse(JSON.stringify(setup))), setup)
  assert.deepEqual(methods['coordinator/newCoordinatorSetup']!.parameters, [])

  // A name a live coordinator has is never proposed; an archived coordinator's name is free again.
  const first = await create(r, { suggestedName: setup.name })
  assert.equal(infoOf(r, first.coordinatorId).name, setup.name)
  const next = await r.service.newCoordinatorSetup()
  assert.ok(listed.has(next.name) && next.name !== setup.name)
  await r.service.archiveCoordinator({ coordinatorId: first.coordinatorId })
  assert.equal((await r.service.newCoordinatorSetup()).name, setup.name)
  r.host.dispose()
})

test('T8: among several providers with the model, the one of the user\'s dsh default model wins, else the first in dsh\'s order', async () => {
  const own = await fresh('setup-provider-own', { default: PRO })
  assert.deepEqual([(await own.service.newCoordinatorSetup()).coordinatorModel, (await own.service.newCoordinatorSetup()).executorModel], [OWN_LOW, OWN_HIGH])
  own.host.dispose()
  // The default model's provider does not offer it (or there is no default): dsh's order decides, DeepSeek's own routes first.
  const other = await fresh('setup-provider-other', { providers: [{ id: 'elsewhere', models: [{ id: 'big' }] }, ...providers()], default: { provider: 'elsewhere', model: 'big' } })
  assert.deepEqual((await other.service.newCoordinatorSetup()).coordinatorModel, OWN_LOW)
  other.host.defaultModel = undefined
  assert.deepEqual((await other.service.newCoordinatorSetup()).coordinatorModel, OWN_LOW)
  // Only one provider has it: that one, whatever the default is.
  other.host.providers = other.host.providers.filter(p => p.id !== 'deepseek-official')
  assert.deepEqual((await other.service.newCoordinatorSetup()).executorModel, GO_HIGH)
  other.host.dispose()
})

test('T8: a picker starts empty when dsh does not offer the model, or the model does not list the effort wanted for that role', async () => {
  const only = (models: FakeProvider['models']): FakeProvider[] => [{ id: 'opencode-go', name: 'OpenCode Go', models: [{ id: 'glm-5.3' }, ...models] }]
  const propose = async (name: string, list: FakeProvider[]): Promise<NewCoordinatorSetup> => {
    const r = await fresh(name, { providers: list })
    const setup = await r.service.newCoordinatorSetup()
    r.host.dispose()
    return setup
  }
  // Not offered: no default at all, the list and the name are still there.
  const missing = await propose('setup-missing', only([]))
  assert.equal('coordinatorModel' in missing || 'executorModel' in missing, false)
  assert.ok(listed.has(missing.name) && missing.groups.length === 1)
  // Another model of the family is not the model.
  const cousins = await propose('setup-cousins', only([{ id: 'deepseek-v4.1-flash-fast', efforts: ['low', 'high'] }, { id: 'deepseek-v4.1-pro', efforts: ['low', 'high'] }, { id: 'deepseek-v4-flash' }]))
  assert.equal('coordinatorModel' in cousins || 'executorModel' in cousins, false)
  // The model without the effort "low": the coordinator picker is empty, never the model's own default effort (here
  // "max", its most expensive one). "high" is listed, so the executors get their default.
  const noLow = await propose('setup-no-low', only([{ id: 'deepseek-v4.1-flash', efforts: ['max', 'high'] }]))
  assert.deepEqual([noLow.coordinatorModel, noLow.executorModel], [undefined, GO_HIGH])
  assert.equal('coordinatorModel' in noLow, false)
  // The other way round: "low" but no "high".
  const noHigh = await propose('setup-no-high', only([{ id: 'deepseek-v4.1-flash', efforts: ['low', 'max'] }]))
  assert.deepEqual([noHigh.coordinatorModel, 'executorModel' in noHigh], [GO_LOW, false])
  // Neither effort, with or without a default effort of the model, and a model without efforts: both pickers empty.
  for (const [name, model] of [
    ['setup-neither', { id: 'deepseek-v4.1-flash', efforts: ['medium', 'max'], noDefault: true }],
    ['setup-neither-default', { id: 'deepseek-v4.1-flash', efforts: ['medium', 'max'] }],
    ['setup-no-efforts', { id: 'deepseek-v4.1-flash' }],
  ] as const) {
    const setup = await propose(name, only([{ ...model, efforts: 'efforts' in model ? [...model.efforts] : undefined } as FakeProvider['models'][number]]))
    assert.equal('coordinatorModel' in setup || 'executorModel' in setup, false, name)
    assert.equal(setup.groups[0]!.models.length, 2, 'the model is still in the list to pick')
  }
  // A model dsh lists but cannot resolve is not proposed, and a provider whose list fails proposes nothing.
  const broken = await propose('setup-broken-model', only([{ id: 'deepseek-v4.1-flash', efforts: ['low', 'high'], broken: true }]))
  assert.equal('coordinatorModel' in broken || 'executorModel' in broken, false)
  assert.equal(broken.partial, true)
  const down = await propose('setup-broken-provider', [{ id: 'opencode-go', broken: true, models: [{ id: 'deepseek-v4.1-flash', efforts: ['low', 'high'] }] }])
  assert.deepEqual([down.groups, down.partial, down.coordinatorModel], [[], true, undefined])
  assert.doesNotMatch(JSON.stringify([broken, down]), /provider\.invalid/)
  // Without dsh's provider registry: a name, no models.
  const bare = await fresh('setup-no-llm')
  const none = await bare.service.newCoordinatorSetup()
  assert.deepEqual([listed.has(none.name), none.groups, 'coordinatorModel' in none], [true, [], false])
  bare.host.dispose()
})

test('T8: the default is one constant, matched by model id; the alias counts only on DeepSeek\'s own providers', () => {
  assert.deepEqual(NEW_COORDINATOR_MODELS, {
    modelId: 'deepseek-v4.1-flash', alias: 'deepseek-flash', aliasProviders: ['deepseek-account', 'deepseek-official'], coordinatorEffort: 'low', executorEffort: 'high',
  })
  const efforts = ['low', 'high'].map(id => ({ id, name: id }))
  const group = (id: string, ...models: string[]): ModelChoices['groups'][number] => ({ id, name: id, models: models.map(model => ({ id: model, name: 'Some display name', efforts })) })
  // The display name plays no part: a model called "DeepSeek V4.1 Flash" under another id is not it.
  assert.equal(defaultModelIn([{ id: 'p', name: 'p', models: [{ id: 'other', name: 'DeepSeek V4.1 Flash' }] }]), undefined)
  // The versioned id counts on any provider; a vendor prefix and the letter case of an id do not matter.
  assert.equal(defaultModelIn([group('router', 'deepseek/deepseek-v4.1-pro', 'deepseek/deepseek-v4.1-flash')])?.model.id, 'deepseek/deepseek-v4.1-flash')
  assert.equal(defaultModelIn([group('p', 'DeepSeek-V4.1-Flash')])?.model.id, 'DeepSeek-V4.1-Flash')
  assert.deepEqual(newCoordinatorModels([group('router', 'deepseek/deepseek-v4.1-flash')]), {
    coordinatorModel: { provider: 'router', model: 'deepseek/deepseek-v4.1-flash', reasoningEffort: 'low' },
    executorModel: { provider: 'router', model: 'deepseek/deepseek-v4.1-flash', reasoningEffort: 'high' },
  })
  // The alias: on DeepSeek's two providers, as the whole id. Not on another provider, and not behind a prefix.
  for (const provider of ['deepseek-account', 'deepseek-official']) {
    assert.equal(defaultModelIn([group(provider, 'deepseek-pro', 'deepseek-flash')])?.model.id, 'deepseek-flash', provider)
    assert.equal(defaultModelIn([group(provider, 'acme/deepseek-flash')]), undefined, `${provider}, behind a prefix`)
  }
  assert.equal(defaultModelIn([group('gateway', 'deepseek-flash')]), undefined)
  assert.equal(defaultModelIn([group('gateway', 'acme/deepseek-flash')]), undefined)
  assert.equal(defaultModelIn([group('opencode-go', 'deepseek-flash')]), undefined)
  // So a third-party provider that lists the alias does not win over a later provider with the model itself.
  assert.deepEqual(defaultModelIn([group('gateway', 'deepseek-flash'), group('opencode-go', 'deepseek-v4.1-flash')])?.provider, 'opencode-go')
  // Within a provider the versioned id wins; between providers the preferred one, else the order of the list.
  assert.equal(defaultModelIn([group('deepseek-official', 'deepseek-flash', 'deepseek-v4.1-flash')])?.model.id, 'deepseek-v4.1-flash')
  const two = [group('deepseek-official', 'deepseek-flash'), group('b', 'deepseek-v4.1-flash')]
  assert.deepEqual([defaultModelIn(two)?.provider, defaultModelIn(two, 'b')?.provider, defaultModelIn(two, 'nobody')?.provider], ['deepseek-official', 'b', 'deepseek-official'])
  assert.deepEqual(newCoordinatorModels([group('p', 'glm-5.3')]), {})
  assert.deepEqual(newCoordinatorModels([]), {})
  // The list of the preferred provider failed: no default from another provider. Another provider's failure does not matter.
  assert.deepEqual(newCoordinatorModels(two, 'b', ['b']), {})
  assert.deepEqual(newCoordinatorModels([two[0]!], 'b', ['b']), {})
  assert.equal(newCoordinatorModels(two, 'b', ['elsewhere']).coordinatorModel?.provider, 'b')
  assert.equal(newCoordinatorModels(two, undefined, ['b']).coordinatorModel?.provider, 'deepseek-official')
})

test('T8: when the list of the dsh default model\'s provider cannot be loaded, the pickers start empty', async () => {
  // The dsh default is on OpenCode Go, whose list fails; DeepSeek's own provider has the model.
  const r = await fresh('setup-preferred-failed', {})
  r.host.providers = r.host.providers.map(p => (p.id === 'opencode-go' ? { ...p, broken: true } : p))
  const setup = await r.service.newCoordinatorSetup()
  assert.deepEqual([setup.partial, setup.groups.map(g => g.id), 'coordinatorModel' in setup, 'executorModel' in setup], [true, ['deepseek-official'], false, false])
  assert.equal('failed' in setup, false, 'the result has the fields of the wire type only')
  // The provider answers again: the default is back, from the provider of the dsh default.
  r.host.providers = providers()
  assert.deepEqual((await r.service.newCoordinatorSetup()).coordinatorModel, GO_LOW)
  // A provider the dsh default is not on fails: the default from the default's provider stays.
  r.host.providers = r.host.providers.map(p => (p.id === 'deepseek-official' ? { ...p, broken: true } : p))
  const other = await r.service.newCoordinatorSetup()
  assert.deepEqual([other.partial, other.coordinatorModel, other.executorModel], [true, GO_LOW, GO_HIGH])
  r.host.dispose()
})

test('T8: setup calls that arrive while one is running share its answer', async () => {
  const r = await fresh('setup-shared', {})
  const [a, b] = [r.service.newCoordinatorSetup(), r.service.newCoordinatorSetup()]
  assert.equal(a, b)
  const first = await a
  const later = r.service.newCoordinatorSetup()
  assert.notEqual(later, a, 'a call after it finished asks again')
  assert.deepEqual((await later).groups, first.groups)
  r.host.dispose()
})

// --- The name ------------------------------------------------------------------------------------------------------

test('T8: Create with an empty name uses the suggested name; taken meanwhile, another free name; a typed name wins', async () => {
  // Each automatic pick takes the next free name, so a suggestion that is honoured differs from a fresh pick.
  let picks = 0
  const r = await fresh('setup-name', undefined, { deps: { pickName: n => picks++ % n } })
  const setup = await r.service.newCoordinatorSetup()
  const fromForm = await create(r, { suggestedName: setup.name })
  const made = infoOf(r, fromForm.coordinatorId)
  const entry = COORDINATOR_NAMES.find(e => e.name === setup.name)!
  assert.deepEqual([made.name, made.title, made.home], [setup.name, setup.name, join(base(r), `coordinator-${entry.slug}`)])
  assert.equal(r.host.agentOf(fromForm.sessionId).title, setup.name)
  assert.equal(stored(r).find(c => c.id === fromForm.coordinatorId)!.name, setup.name)

  // Taken meanwhile (someone typed that very name, or another window created first): no refusal, another built-in name.
  const second = await r.service.newCoordinatorSetup()
  await create(r, { name: second.name })
  const late = infoOf(r, (await create(r, { suggestedName: second.name })).coordinatorId)
  assert.ok(listed.has(late.name!) && late.name !== second.name && late.name !== setup.name, `${late.name} is another free name`)
  // Two forms that were shown the same suggestion: the first Create gets it, the second another name.
  const third = await r.service.newCoordinatorSetup()
  const both = await Promise.all([create(r, { suggestedName: third.name }), create(r, { suggestedName: third.name })])
  const names = both.map(x => infoOf(r, x.coordinatorId).name)
  assert.equal(names[0], third.name)
  assert.ok(listed.has(names[1]!) && names[1] !== third.name)

  // A typed name wins over the suggestion, and keeps the checks of a typed name.
  const fourth = await r.service.newCoordinatorSetup()
  assert.equal(infoOf(r, (await create(r, { name: 'Atlas', suggestedName: fourth.name })).coordinatorId).name, 'Atlas')
  await assert.rejects(create(r, { name: 'atlas', suggestedName: fourth.name }), /another coordinator is already called/)
  await assert.rejects(create(r, { name: '2026', suggestedName: fourth.name }), /only a number/)
  // An empty or blank typed name with a suggestion is the suggestion.
  assert.equal(infoOf(r, (await create(r, { name: '  ', suggestedName: fourth.name })).coordinatorId).name, fourth.name)

  // Only a built-in name counts as a suggestion: anything else is as if none had been sent, never a way around the
  // checks of a typed name.
  const all = () => new Set(r.service.getState().coordinators.map(c => c.name))
  // Nor does a built-in name with a number: the naming gives a number only when every plain name is taken, and never
  // a text past the name limit (a long number once got a 3008-character name into the state file).
  const plain = COORDINATOR_NAMES[0]!.name
  const longNumbered = `${plain} 1${'0'.repeat(3000)}`
  for (const suggestedName of ['Research desk', '2026', 'x'.repeat(41), 'two\nlines', '', 42, null, { name: 'Kant' }, 'atlas', longNumbered, `${plain} 2`]) {
    const info = infoOf(r, (await create(r, { suggestedName })).coordinatorId)
    assert.ok(listed.has(info.name!), `${JSON.stringify(suggestedName).slice(0, 60)} was not used: ${info.name}`)
  }
  assert.ok(stored(r).every(c => [...c.name!].length <= COORDINATOR_NAME_MAX), 'no stored name is past the limit')
  assert.equal(all().size, r.service.getState().coordinators.length, 'every name is used once')
  r.host.dispose()
})

test('T8: a suggestion counts only when it is exactly a name the automatic naming could give now', () => {
  const names = COORDINATOR_NAMES.map(e => e.name)
  const [first, second] = [names[0]!, names[1]!]
  // Nothing taken: every listed name, letter for letter; no number, no other spelling, nothing else.
  assert.deepEqual(freeNames([]), names)
  assert.deepEqual([first, '李白', `${first} 2`, `${first} 12`, first.toLowerCase(), ` ${first}`, 'Atlas', `${first} 2 3`, ''].map(n => isFreeName(n, [])),
    [true, names.includes('李白'), false, false, false, false, false, false, false])
  // A taken name (by the key names are compared with) is not free.
  assert.deepEqual([isFreeName(first, [first.toUpperCase()]), isFreeName(second, [first])], [false, true])
  // Every plain name taken: the names with the number 2, and only that number, without leading zeros.
  assert.deepEqual([`${first} 2`, `${second} 2`, `${first} 3`, `${first} 02`, `${first} 1`, first].map(n => isFreeName(n, names)), [true, true, false, false, false, false])
  const round2 = [...names, ...names.filter(n => n !== second).map(n => `${n} 2`)]
  assert.deepEqual(freeNames(round2), [`${second} 2`])
  assert.deepEqual([isFreeName(`${second} 2`, round2), isFreeName(`${first} 2`, round2), isFreeName(`${first} 3`, round2)], [true, false, false])
  assert.deepEqual(freeNames([...names, ...names.map(n => `${n} 2`)])[0], `${first} 3`)
  // A number of any length after a listed name is not a suggestion, whatever is taken.
  const long = `${first} 1${'0'.repeat(3000)}`
  assert.deepEqual([isFreeName(long, []), isFreeName(long, names), isFreeName(`${first} 10000`, names)], [false, false, false])
  // Every name the naming gives is one it accepts back, and fits the limit.
  for (const used of [[], names, round2]) {
    const given = freeName(used, n => n - 1)
    assert.ok(isFreeName(given, used) && [...given].length <= COORDINATOR_NAME_MAX, given)
  }
})

test('T8: a suggested name whose default folder already exists on disk gets the next free folder, and the old one is left alone', async () => {
  const r = await fresh('setup-folder-left-over')
  const names = COORDINATOR_NAMES.filter(e => e.slug !== '')
  const [withFiles, emptyOne, taken2] = [names[0]!, names[1]!, names[2]!]
  // Left over from an earlier coordinator that is no longer in the state: a folder with files in it.
  const old = join(base(r), `coordinator-${withFiles.slug}`)
  mkdirSync(old, { recursive: true })
  writeFileSync(join(old, 'notes.md'), 'keep me')
  // The name is free in the state, so it is still suggested and accepted.
  assert.ok(isFreeName(withFiles.name, []))
  const made = infoOf(r, (await create(r, { suggestedName: withFiles.name })).coordinatorId)
  assert.deepEqual([made.name, made.home, made.folder], [withFiles.name, `${old}-2`, `${old}-2`], 'the name as suggested, the folder with the usual suffix')
  assert.deepEqual([readdirSync(old), readFileSync(join(old, 'notes.md'), 'utf8'), readdirSync(`${old}-2`)], [['notes.md'], 'keep me', []], 'nothing is written into the old folder')
  assert.equal(r.host.workspaces.some(w => w.path === old), false, 'the old folder is not registered as a Workspace')
  // -2 is in use as well: -3.
  mkdirSync(join(base(r), `coordinator-${taken2.slug}`, 'sub'), { recursive: true })
  mkdirSync(join(base(r), `coordinator-${taken2.slug}-2`, 'sub'), { recursive: true })
  assert.equal(infoOf(r, (await create(r, { suggestedName: taken2.name })).coordinatorId).home, join(base(r), `coordinator-${taken2.slug}-3`))
  // An empty left-over folder has nothing to protect: it is used as it is.
  mkdirSync(join(base(r), `coordinator-${emptyOne.slug}`), { recursive: true })
  assert.equal(infoOf(r, (await create(r, { suggestedName: emptyOne.name })).coordinatorId).home, join(base(r), `coordinator-${emptyOne.slug}`))
  // The same for a typed name and for a creation without the form.
  mkdirSync(join(base(r), 'coordinator-atlas', 'sub'), { recursive: true })
  assert.equal(infoOf(r, (await create(r, { name: 'Atlas' })).coordinatorId).home, join(base(r), 'coordinator-atlas-2'))
  r.host.dispose()
})

// --- The models ----------------------------------------------------------------------------------------------------

test('T8: Create with models stores both, starts the chat on the coordinator model and Executor Sessions on theirs', async () => {
  const r = await fresh('setup-create-models', {})
  const setup = await r.service.newCoordinatorSetup()
  // As the form sends it when the user changed nothing.
  const request = newCoordinatorRequest({ kind: 'default', name: '', setup })
  assert.deepEqual(request, { suggestedName: setup.name, coordinatorModel: GO_LOW, executorModel: GO_HIGH })
  const made = await create(r, methods['coordinator/createCoordinator']!.parameters[0]!.codec.create().parse(request))
  const info = infoOf(r, made.coordinatorId)
  assert.deepEqual([info.name, info.coordinatorModel, info.executorModel], [setup.name, GO_LOW, GO_HIGH])
  const saved = stored(r).find(c => c.id === made.coordinatorId)!
  assert.deepEqual([saved.coordinatorModel, saved.executorModel], [GO_LOW, GO_HIGH], 'saved at once')
  const chat = r.host.agentOf(made.sessionId)
  assert.deepEqual(chat.selected, GO_LOW, 'the chat starts on the coordinator model')
  assert.deepEqual(chat.selects, [GO_LOW], 'selected once, before the opening turn')
  assert.deepEqual(chat.log.find(e => e.type === 'model/selection')?.data, GO_LOW)
  assert.deepEqual((await r.service.modelChoices({ coordinatorId: made.coordinatorId })).coordinator, { stored: GO_LOW, effective: GO_LOW, available: true })
  chat.status = 'idle'
  const lead = await start(r, chat, 'Write the parser')
  assert.deepEqual(lead.selected, GO_HIGH, 'a new Executor Session starts on the executor model')

  // The user changed both pickers: another model for the chat, "Same as coordinator" for the executors.
  const changed = await create(r, newCoordinatorRequest({ kind: 'default', name: 'Atlas', setup, coordinatorModel: PRO, executorModel: null }))
  assert.deepEqual([infoOf(r, changed.coordinatorId).name, infoOf(r, changed.coordinatorId).coordinatorModel, infoOf(r, changed.coordinatorId).executorModel], ['Atlas', PRO, undefined])
  const atlas = r.host.agentOf(changed.sessionId)
  assert.deepEqual(atlas.selected, PRO)
  atlas.status = 'idle'
  assert.deepEqual((await start(r, atlas, 'Follows the chat')).selected, PRO)
  assert.equal('executorModel' in stored(r).find(c => c.id === changed.coordinatorId)!, false)

  // Both pickers emptied ("Not set", "Same as coordinator"): nothing is stored and the chat follows the dsh default.
  const empty = await create(r, { coordinatorModel: null, executorModel: null })
  assert.deepEqual([infoOf(r, empty.coordinatorId).coordinatorModel, infoOf(r, empty.coordinatorId).executorModel], [undefined, undefined])
  assert.equal(r.host.agentOf(empty.sessionId).selected, undefined)
  assert.deepEqual(r.host.agentOf(empty.sessionId).model.current(), GLM)
  // With a folder the user picked.
  const picked = await create(r, { home: join(r.home, 'dev', 'docs'), name: 'Docs', coordinatorModel: OWN_LOW, executorModel: GLM })
  assert.deepEqual([infoOf(r, picked.coordinatorId).home, infoOf(r, picked.coordinatorId).coordinatorModel, infoOf(r, picked.coordinatorId).executorModel], [join(r.home, 'dev', 'docs'), OWN_LOW, GLM])
  assert.deepEqual(r.host.globalModelWrites, [], 'the model new Sessions of dsh follow is never changed')
  r.host.dispose()
})

test('T8: a model the host refuses creates nothing, whatever else the request says', async () => {
  const r = await fresh('setup-refusals', {})
  const before = footprint(r)
  const folder = join(r.home, 'dev', 'refused')
  const bad: [unknown, RegExp][] = [
    [{ provider: 'nobody', model: 'deepseek-flash' }, /cannot be used: its provider is not one dsh offers/],
    [{ provider: 'deepseek-official', model: 'glm-5.3' }, /cannot be used: its provider does not offer this model/],
    [{ ...GO_LOW, reasoningEffort: 'ultra' }, /cannot be used: the model does not offer this reasoning effort/],
    [{ ...GLM, reasoningEffort: 'high' }, /cannot be used: the model does not offer this reasoning effort/],
    [{ provider: 7, model: 'deepseek-flash' }, /must be null or name a provider and a model/],
    [{ provider: 'opencode-go' }, /must be null or name/],
    [{ provider: 'opencode-go', model: 'x'.repeat(201) }, /must be null or name/],
    ['opencode-go/deepseek-v4.1-flash', /must be null or name/],
    [['opencode-go', 'deepseek-v4.1-flash'], /must be null or name/],
    [0, /must be null or name/],
  ]
  for (const [model, why] of bad) {
    await assert.rejects(create(r, { coordinatorModel: model, executorModel: GO_HIGH }), (error: Error) => { assert.match(error.message, why); assert.match(error.message, /coordinator ?[mM]odel/); return true }, JSON.stringify(model))
    await assert.rejects(create(r, { coordinatorModel: GO_LOW, executorModel: model }), (error: Error) => { assert.match(error.message, why); assert.match(error.message, /executor ?[mM]odel/); return true }, JSON.stringify(model))
    // A good name and a good folder do not help.
    await assert.rejects(create(r, { home: folder, name: 'Atlas', suggestedName: 'Kant', coordinatorModel: GO_LOW, executorModel: model }), why)
  }
  // The other way round: good models, a refused name or folder.
  await assert.rejects(create(r, { name: '2026', coordinatorModel: GO_LOW, executorModel: GO_HIGH }), /only a number/)
  await assert.rejects(create(r, { home: r.home, coordinatorModel: GO_LOW, executorModel: GO_HIGH }), /cannot be a coordinator's home/)
  // A provider whose list fails: refused without the provider's own error text.
  r.host.providers = r.host.providers.map(p => (p.id === 'opencode-go' ? { ...p, broken: true } : p))
  await assert.rejects(create(r, { coordinatorModel: OWN_LOW, executorModel: GO_HIGH }), (error: Error) => {
    assert.match(error.message, /the executor model cannot be used: dsh could not check it/)
    assert.doesNotMatch(error.message, /provider\.invalid/)
    return true
  })
  // Without dsh's provider registry nothing can be checked, so no model is accepted; a creation without models still works.
  r.host.services.delete('llm')
  await assert.rejects(create(r, { coordinatorModel: OWN_LOW, executorModel: null }), /the coordinator model cannot be used: the model list of dsh is not available/)
  assert.equal(existsSync(folder), false)
  assert.deepEqual(footprint(r), before, 'no record, no Workspace, no Session and no folder')
  const plain = await create(r, { coordinatorModel: null, executorModel: null })
  assert.deepEqual([infoOf(r, plain.coordinatorId).coordinatorModel, infoOf(r, plain.coordinatorId).executorModel], [undefined, undefined])
  r.host.dispose()
})

// --- Coordinators that come about without the form -----------------------------------------------------------------

test('T8: a coordinator created without the setup step gets no model, also when dsh offers the default', async () => {
  // dsh offers the default model on two providers; the dsh default model is another one.
  const first = await fresh('setup-first-use', {})
  assert.deepEqual((await first.service.newCoordinatorSetup()).coordinatorModel, GO_LOW, 'the form would propose it')
  // `ensureCoordinator` with no coordinator yet (the page does not call it; another caller of the Remote method may).
  const opened = await first.service.ensureCoordinator({})
  const info = infoOf(first, opened.coordinatorId)
  assert.ok(listed.has(info.name!))
  assert.deepEqual([info.coordinatorModel, info.executorModel], [undefined, undefined])
  const chat = first.host.agentOf(opened.sessionId)
  assert.deepEqual([chat.selected, chat.selects, chat.model.current()], [undefined, [], GLM], 'the chat follows the dsh default, nothing is pinned')
  assert.equal('coordinatorModel' in stored(first)[0]! || 'executorModel' in stored(first)[0]!, false)
  // A request that names no model, or only one: nothing is added for what it leaves out.
  for (const request of [undefined, {}, { name: 'Atlas' }, { coordinatorModel: undefined, executorModel: undefined }, { suggestedName: 'Kant' }]) {
    const made = await create(first, request)
    assert.deepEqual([infoOf(first, made.coordinatorId).coordinatorModel, infoOf(first, made.coordinatorId).executorModel, first.host.agentOf(made.sessionId).selected], [undefined, undefined, undefined], JSON.stringify(request))
  }
  const oneEach = [infoOf(first, (await create(first, { coordinatorModel: GLM })).coordinatorId), infoOf(first, (await create(first, { executorModel: GO_HIGH })).coordinatorId)]
  assert.deepEqual(oneEach.map(c => [c.coordinatorModel, c.executorModel]), [[GLM, undefined], [undefined, GO_HIGH]])
  assert.deepEqual(first.host.globalModelWrites, [])
  first.host.dispose()

  // The dsh default on one provider, the model only on another (other billing): first use stays on the dsh default.
  const split = await fresh('setup-first-use-split', {
    providers: [{ id: 'opencode-go', models: [{ id: 'big-pro' }] }, { id: 'deepseek-official', models: [{ id: 'deepseek-flash', efforts: ['high', 'low'] }] }],
    default: { provider: 'opencode-go', model: 'big-pro' },
  })
  const made = await split.service.ensureCoordinator({})
  assert.deepEqual([infoOf(split, made.coordinatorId).coordinatorModel, infoOf(split, made.coordinatorId).executorModel, split.host.agentOf(made.sessionId).selected], [undefined, undefined, undefined])
  assert.deepEqual(split.host.agentOf(made.sessionId).model.current(), { provider: 'opencode-go', model: 'big-pro' })
  split.host.dispose()

  // dsh without a provider registry: first use works as it did.
  const bare = await fresh('setup-first-use-bare')
  const plain = infoOf(bare, (await bare.service.ensureCoordinator({})).coordinatorId)
  assert.deepEqual([listed.has(plain.name!), plain.coordinatorModel, plain.executorModel], [true, undefined, undefined])
  bare.host.dispose()
})

test('T8: an adopted chat, a reopened chat and a coordinator from the state file get no default model', async () => {
  const r = await fresh('setup-other-paths', {})
  const own = await create(r, { home: r.root, coordinatorModel: null, executorModel: null })
  // A New Session in a coordinator's group becomes a coordinator with the user's first message: it keeps the model
  // the user started it on, and its executors follow it.
  const blank = r.host.newSession(r.root)
  await tick(5)
  r.host.userTurn(blank, 'hello')
  await tick(5)
  const adopted = r.service.getState().coordinators.find(c => c.sessionId === blank.id)!
  assert.ok(listed.has(adopted.name!))
  assert.deepEqual([adopted.coordinatorModel, adopted.executorModel, blank.selected], [undefined, undefined, undefined])
  blank.endTurn()

  // Reopen: a replacement chat for a coordinator without a model follows the dsh default; nothing is set.
  await (r.host.ctx['workspaceRegistry'] as { archiveSession: (id: string) => Promise<void> }).archiveSession(own.sessionId)
  const reopened = await r.service.ensureCoordinator({ coordinatorId: own.coordinatorId })
  assert.notEqual(reopened.sessionId, own.sessionId)
  assert.deepEqual([infoOf(r, own.coordinatorId).coordinatorModel, infoOf(r, own.coordinatorId).executorModel, r.host.agentOf(reopened.sessionId).selected], [undefined, undefined, undefined])
  // An archived coordinator that is reopened is not a new one either.
  await r.service.archiveCoordinator({ coordinatorId: own.coordinatorId })
  await r.service.ensureCoordinator({ coordinatorId: own.coordinatorId })
  assert.deepEqual([infoOf(r, own.coordinatorId).coordinatorModel, infoOf(r, own.coordinatorId).executorModel], [undefined, undefined])

  // A restart: coordinators that exist are loaded as they were saved, with or without models.
  const withModels = await create(r, { coordinatorModel: PRO, executorModel: GLM })
  await tick(1)
  r.host.dispose()
  r.host.reset()
  const again = rig('unused', { dir: r.dir, host: r.host })
  await again.service.ready
  await tick(5)
  const after = again.service.getState().coordinators
  assert.deepEqual([after.find(c => c.id === own.coordinatorId)?.coordinatorModel, after.find(c => c.id === own.coordinatorId)?.executorModel], [undefined, undefined])
  assert.deepEqual([after.find(c => c.id === adopted.id)?.coordinatorModel, after.find(c => c.id === adopted.id)?.executorModel], [undefined, undefined])
  assert.deepEqual([after.find(c => c.id === withModels.coordinatorId)?.coordinatorModel, after.find(c => c.id === withModels.coordinatorId)?.executorModel], [PRO, GLM])
  again.host.dispose()
})

// --- Who may call, and the client side -----------------------------------------------------------------------------

test('T8: owner only: both Remote methods check the caller before they reach the service; the client spec carries the new fields', () => {
  const index = readFileSync(fileURLToPath(new URL('../src/index.ts', import.meta.url)), 'utf8')
  for (const method of ['newCoordinatorSetup', 'createCoordinator']) {
    const at = index.indexOf(`async ${method}(`)
    assert.ok(at > 0, method)
    const body = index.slice(at, index.indexOf('\n  }\n', at))
    assert.match(body, /requireOwner\(this\.ctx\)/, `${method} is owner only`)
    assert.ok(body.indexOf('requireOwner(this.ctx)') < body.indexOf('this.service()'), `${method} checks the caller before it does anything`)
    assert.match(index.slice(index.lastIndexOf('\n\n', at), at), /@Remote\n/, `${method} is a Remote method`)
  }
  const codec = methods['coordinator/createCoordinator']!.parameters[0]!.codec.create()
  const full = { home: '/x', name: 'Atlas', suggestedName: 'Kant', coordinatorModel: GO_LOW, executorModel: null }
  assert.deepEqual(codec.parse(full), full)
  assert.deepEqual(codec.parse({ coordinatorModel: null, executorModel: GLM }), { coordinatorModel: null, executorModel: GLM })
  assert.deepEqual(codec.parse({}), {}, 'a request without the new fields is still valid')
  assert.throws(() => codec.parse({ coordinatorModel: 'deepseek-flash' }))
  assert.throws(() => codec.parse({ executorModel: { provider: 'p' } }))
  assert.throws(() => codec.parse({ suggestedName: 42 }))
})

test('T8: the form: what the pickers show, what Create sends, and what stays when the form comes back', () => {
  // A picker shows the user's choice once they made one (null: the empty first option), else the proposed default.
  assert.deepEqual(formModel(undefined, GO_LOW), GO_LOW)
  assert.equal(formModel(undefined, undefined), undefined)
  assert.equal(formModel(null, GO_LOW), undefined)
  assert.deepEqual(formModel(GLM, GO_LOW), GLM)

  const setup: NewCoordinatorSetup = { name: 'Kepler', groups: [], partial: false, coordinatorModel: GO_LOW, executorModel: GO_HIGH }
  const draft = (extra: Partial<NewCoordinatorDraft> = {}): NewCoordinatorDraft => ({ kind: 'default', name: '', setup, ...extra } as NewCoordinatorDraft)
  // Nothing typed: the suggested name, as a suggestion; the defaults as the pickers show them.
  assert.deepEqual(newCoordinatorRequest(draft()), { suggestedName: 'Kepler', coordinatorModel: GO_LOW, executorModel: GO_HIGH })
  assert.deepEqual(newCoordinatorRequest(draft({ name: '   ' })), { suggestedName: 'Kepler', coordinatorModel: GO_LOW, executorModel: GO_HIGH })
  // A typed name goes as the name, without the suggestion.
  assert.deepEqual(newCoordinatorRequest(draft({ name: ' Research desk ' })), { name: 'Research desk', coordinatorModel: GO_LOW, executorModel: GO_HIGH })
  // The pickers as the user left them; an emptied picker is sent as null, not left out.
  assert.deepEqual(newCoordinatorRequest(draft({ coordinatorModel: GLM, executorModel: null })), { suggestedName: 'Kepler', coordinatorModel: GLM, executorModel: null })
  assert.deepEqual(newCoordinatorRequest(draft({ coordinatorModel: null })), { suggestedName: 'Kepler', coordinatorModel: null, executorModel: GO_HIGH })
  // No default was proposed (the model is not offered): the pickers are empty, and that is what is sent.
  assert.deepEqual(newCoordinatorRequest(draft({ setup: { name: 'Kepler', groups: [], partial: false } })), { suggestedName: 'Kepler', coordinatorModel: null, executorModel: null })
  // The folder: the picked one, or the typed path.
  assert.deepEqual(newCoordinatorRequest({ kind: 'picked', home: '/x/docs', name: '', setup }), { home: '/x/docs', suggestedName: 'Kepler', coordinatorModel: GO_LOW, executorModel: GO_HIGH })
  assert.deepEqual(newCoordinatorRequest({ kind: 'typed', name: 'Docs', setup }, ' /x/typed '), { home: '/x/typed', name: 'Docs', coordinatorModel: GO_LOW, executorModel: GO_HIGH })
  // The proposal could not be loaded: nothing is sent for the name and the models; the host picks a name and sets no model.
  assert.deepEqual(newCoordinatorRequest({ kind: 'default', name: '' }), {})
  assert.deepEqual(newCoordinatorRequest({ kind: 'default', name: 'Atlas' }), { name: 'Atlas' })

  // The form that comes back for another place keeps the name, the proposal and the choices.
  const filled = draft({ name: 'Desk', coordinatorModel: GLM, executorModel: null })
  assert.deepEqual(newDraftAt(filled, { kind: 'picked', home: '/x/docs' }), { kind: 'picked', home: '/x/docs', name: 'Desk', setup, coordinatorModel: GLM, executorModel: null })
  assert.deepEqual(newDraftAt(newDraftAt(filled, { kind: 'picked', home: '/x/docs' }), { kind: 'typed' }), { kind: 'typed', name: 'Desk', setup, coordinatorModel: GLM, executorModel: null })
  assert.deepEqual(newDraftAt(undefined, { kind: 'default' }), { kind: 'default', name: '' }, 'a form opened anew starts empty and asks the host again')

  // Every key the form uses exists in both languages, with the same placeholders.
  for (const key of ['newCoordinator.name.hint.suggested', 'newCoordinator.models.hint', 'newCoordinator.models.failed', 'error.createdNotOpened'] as const) {
    assert.ok(en[key] !== '' && zh[key] !== '' && en[key] !== zh[key], key)
    assert.deepEqual(zh[key].match(/\{\w+\}/g), en[key].match(/\{\w+\}/g), key)
  }
})

test('T8: the form keeps a suggestion by the host\'s name comparison, and closes once the coordinator exists', async () => {
  // The client's key is the host's.
  for (const name of ['Noether', 'ｎｏｅｔｈｅｒ', 'Noe\u00ADther', '  Li   Bai ', '李白', 'KANT\u200B', 'Émilie du Châtelet', 'Noether 2']) {
    assert.equal(nameKeyOf(name), nameKey(name), JSON.stringify(name))
  }
  const live = [{ name: 'ｎｏｅｔｈｅｒ' }, { name: 'Kant', archived: true }]
  assert.deepEqual(['Noether', 'noether ', 'Kant', 'Curie', '', undefined].map(shown => suggestionStillFree(shown, live)), [false, false, true, true, false, false])

  // The suggestion is stable while the form is open: a reload brings new lists and defaults (and another random name
  // from the host), and the form keeps the name it shows. Only a name that was taken meanwhile gives way.
  const shown: NewCoordinatorSetup = { name: 'Curie', groups: [], partial: true }
  const loaded: NewCoordinatorSetup = { name: 'Hypatia', groups: [{ id: 'p', name: 'P', models: [{ id: 'm', name: 'M' }] }], partial: false, coordinatorModel: GO_LOW }
  assert.deepEqual(reloadedSetup(shown, loaded, live), { ...loaded, name: 'Curie' })
  assert.deepEqual(reloadedSetup(reloadedSetup(shown, loaded, live), { ...loaded, name: 'Kant' }, live).name, 'Curie')
  assert.deepEqual(reloadedSetup(shown, loaded, [...live, { name: 'curie' }]), loaded)
  assert.deepEqual(reloadedSetup(undefined, loaded, live), loaded, 'the first load is shown as it comes')

  // Create and open succeed; a refused create throws and nothing is opened.
  const opened: string[] = []
  assert.deepEqual(await createThenOpen(async () => 's-1', async (id) => { opened.push(id) }), {})
  await assert.rejects(createThenOpen(async () => { throw new Error('another coordinator is already called Atlas') }, async (id: string) => { opened.push(id) }), /already called Atlas/)
  assert.deepEqual(opened, ['s-1'])
  // The coordinator exists but its chat does not open: no throw (the form closes), the reason comes back for a notice.
  assert.deepEqual(await createThenOpen(async () => 's-2', async () => { throw new Error('the session is not loaded') }), { openError: 'the session is not loaded' })

  // An option names the provider, which the closed select would not show otherwise.
  assert.deepEqual([optionLabel('DeepSeek V4.1 Flash', 'OpenCode Go'), optionLabel('DeepSeek-V4.1-Flash', 'DeepSeek'), optionLabel('big', ''), optionLabel('local', 'local')],
    ['DeepSeek V4.1 Flash (OpenCode Go)', 'DeepSeek-V4.1-Flash (DeepSeek)', 'big', 'local'])
})

test('T8: the fake source of development builds follows the host', async () => {
  const { fakeSource } = await import('../src/client/source.ts')
  const source = fakeSource()
  const setup = await source.newCoordinatorSetup()
  const taken = new Set((await source.getState()).coordinators.map(c => c.name))
  assert.ok(setup.name !== '' && !taken.has(setup.name))
  assert.deepEqual([setup.coordinatorModel?.reasoningEffort, setup.executorModel?.reasoningEffort], ['low', 'high'])
  const made = await source.createCoordinator(newCoordinatorRequest({ kind: 'default', name: '', setup }))
  const info = (await source.getState()).coordinators.find(c => c.id === made.coordinatorId)!
  assert.deepEqual([info.name, info.coordinatorModel, info.executorModel], [setup.name, setup.coordinatorModel, setup.executorModel])
  // The suggestion is taken now: another name, no refusal. Emptied pickers store nothing.
  const second = await source.createCoordinator({ suggestedName: setup.name, coordinatorModel: null, executorModel: null })
  const other = (await source.getState()).coordinators.find(c => c.id === second.coordinatorId)!
  assert.ok(other.name !== setup.name && other.name !== '')
  assert.deepEqual([other.coordinatorModel, other.executorModel], [undefined, undefined])
  // Like the host, a creation that names no model sets none.
  const bare = await source.createCoordinator({})
  const bareInfo = (await source.getState()).coordinators.find(c => c.id === bare.coordinatorId)!
  assert.deepEqual([bareInfo.coordinatorModel, bareInfo.executorModel], [undefined, undefined])
  await assert.rejects(source.createCoordinator({ coordinatorModel: { provider: 'nobody', model: 'big' } }), /the coordinator model cannot be used/)
  await assert.rejects(source.createCoordinator({ executorModel: { provider: 'opencode-go', model: 'glm-5.3', reasoningEffort: 'high' } }), /the executor model cannot be used/)
})

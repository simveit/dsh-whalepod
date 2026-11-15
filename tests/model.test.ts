import { test } from 'node:test'
import assert from 'node:assert/strict'
import { modelChoiceOf, pickModel, sameChoice, type ModelChoice } from '../src/host/model.ts'

const deepseek: ModelChoice = { provider: 'deepseek-official', model: 'deepseek-flash' }
const flash: ModelChoice = { provider: 'opencode-go', model: 'deepseek-v4.1-flash' }
const other: ModelChoice = { provider: 'opencode-go', model: 'glm-5.3' }
const only = (...ok: ModelChoice[]) => async (c: ModelChoice) => ok.some(o => o.provider === c.provider && o.model === c.model)

test('a coordinator keeps its own model when it is available', async () => {
  assert.deepEqual(await pickModel(flash, [undefined, deepseek], only(flash)), { choice: flash, select: false })
})

test('a session following an unusable default gets the first available candidate', async () => {
  assert.deepEqual(await pickModel(deepseek, [flash, deepseek], only(flash)), { choice: flash, select: true })
})

test('no available candidate leaves the session for the user to choose', async () => {
  assert.deepEqual(await pickModel(deepseek, [undefined, deepseek], only(flash)), { choice: undefined, select: false })
  assert.deepEqual(await pickModel(undefined, [], only(flash)), { choice: undefined, select: false })
})

test('a thread switches to the coordinator model even when its default works', async () => {
  assert.deepEqual(await pickModel(other, [flash, other], only(flash, other), true), { choice: flash, select: true })
  // Already on it: nothing to select.
  assert.deepEqual(await pickModel(flash, [flash, other], only(flash, other), true), { choice: flash, select: false })
})

test('a thread falls back to its own working model when the candidates are not available', async () => {
  assert.deepEqual(await pickModel(other, [flash, deepseek], only(other), true), { choice: other, select: false })
})

test('a failed availability check never replaces the current model, and never selects a candidate', async () => {
  const flaky = async (c: ModelChoice) => { if (c.provider === 'deepseek-official') throw new Error('discovery failed'); return true }
  assert.deepEqual(await pickModel(deepseek, [flash], flaky), { choice: deepseek, select: false })
  const unknown = async () => undefined
  assert.deepEqual(await pickModel(flash, [deepseek], unknown), { choice: flash, select: false })
  assert.deepEqual(await pickModel(undefined, [deepseek], unknown), { choice: undefined, select: false })
})

test('three candidates: the executors\' model, the coordinator\'s model, the dsh default, in that order', async () => {
  // The first one is taken while it is available, with its reasoning effort.
  const high = { ...flash, reasoningEffort: 'high' }
  assert.deepEqual(await pickModel(deepseek, [high, other, deepseek], only(flash, other, deepseek), true), { choice: high, select: true })
  // An unavailable first candidate falls through to the next, then to the last.
  assert.deepEqual(await pickModel(deepseek, [flash, other, deepseek], only(other, deepseek), true), { choice: other, select: true })
  assert.deepEqual(await pickModel(deepseek, [flash, other, deepseek], only(deepseek), true), { choice: deepseek, select: false })
  // A candidate that is left out (nothing set) is skipped.
  assert.deepEqual(await pickModel(deepseek, [undefined, other, deepseek], only(flash, other, deepseek), true), { choice: other, select: true })
  // The same model with another effort is a change of the Session.
  assert.deepEqual(await pickModel(flash, [high], only(flash), true), { choice: high, select: true })
})

test('a model choice from outside is three ids, or nothing', () => {
  assert.deepEqual(modelChoiceOf({ provider: 'p', model: 'm' }), { provider: 'p', model: 'm' })
  assert.deepEqual(modelChoiceOf({ provider: 'p', model: 'm', reasoningEffort: 'high', apiKey: 'k' }), { provider: 'p', model: 'm', reasoningEffort: 'high' })
  assert.deepEqual(modelChoiceOf({ provider: 'p', model: 'x'.repeat(200) }), { provider: 'p', model: 'x'.repeat(200) })
  for (const bad of [undefined, null, 'p/m', 7, [], ['p', 'm'], {}, { provider: 'p' }, { model: 'm' }, { provider: '', model: 'm' }, { provider: 'p', model: 7 },
    { provider: 'p', model: 'x'.repeat(201) }, { provider: 'p\u0000', model: 'm' }, { provider: 'p', model: 'm\n' }, { provider: 'p', model: 'm', reasoningEffort: '' },
    { provider: 'p', model: 'm', reasoningEffort: null }, { provider: 'p', model: 'm', reasoningEffort: 'x'.repeat(201) }]) {
    assert.equal(modelChoiceOf(bad), undefined, JSON.stringify(bad))
  }
  assert.equal(sameChoice(undefined, undefined), true)
  assert.equal(sameChoice(flash, { ...flash }), true)
  assert.equal(sameChoice(flash, { ...flash, reasoningEffort: 'high' }), false)
  assert.equal(sameChoice(flash, other), false)
  assert.equal(sameChoice(flash, undefined), false)
})

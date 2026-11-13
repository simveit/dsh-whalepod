import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pickModel, type ModelChoice } from '../src/host/model.ts'

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

// The client codecs read a host without the Matriarc fields as the defaults.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TYPERT_REMOTE } from '../src/client/remote.ts'

type Codec = { parse(value: unknown): unknown }
const methods = (TYPERT_REMOTE as unknown as { methods: Record<string, { result: { create(): Codec } }> }).methods

test('an older host without the Matriarc fields reads as the defaults and as not installed', () => {
  const coordinator = { id: 'c-1', sessionId: 's-1', name: 'Noether', title: 'Noether', home: '/h', folder: '/h', createdAt: 1, updatedAt: 2 }
  const state = methods['coordinator/getState']!.result.create().parse({ coordinators: [coordinator], threads: [], revision: 1 }) as
    { matriarc: unknown; coordinators: { coordinatorMatriarc: boolean; executorMatriarc: boolean }[] }
  assert.deepEqual(state.matriarc, { installed: false })
  assert.deepEqual([state.coordinators[0]!.coordinatorMatriarc, state.coordinators[0]!.executorMatriarc], [false, true])
  const setup = methods['coordinator/newCoordinatorSetup']!.result.create().parse({ name: 'Kepler', groups: [], partial: false }) as { matriarc: unknown }
  assert.deepEqual(setup.matriarc, { installed: false, coordinator: false, executor: true })
})

test('the copied Matriarc navigator hint parse and plugin candidates', async () => {
  const { candidates, navigatorsOf } = await import('../src/client/navigator.ts')
  assert.deepEqual(navigatorsOf('[on|off]'), [])
  assert.deepEqual(navigatorsOf(undefined), [])
  assert.deepEqual(navigatorsOf('[on [claude-code|codex]|off]'), ['claude-code', 'codex'])
  const p = '@deepseek-ai/dsh-subagent-'
  assert.deepEqual(candidates([
    { name: `${p}codex`, enabled: false, meta: { title: 'Codex' } },
    { name: `${p}claude-code`, enabled: false },
    { name: `${p}on`, enabled: true },
    { name: `${p}x-in-process`, enabled: false },
    { name: `${p}broken`, enabled: false, error: 'x' },
    { name: `${p}hidden`, enabled: false, listedByDefault: false },
    { name: 'other', enabled: false },
  ]), [{ name: `${p}codex`, title: 'Codex' }, { name: `${p}claude-code`, title: 'claude-code' }])
})

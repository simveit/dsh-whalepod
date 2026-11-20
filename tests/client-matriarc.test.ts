// The client codecs read a host without the global Matriarc switch as absent (the page then hides it).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TYPERT_REMOTE } from '../src/client/remote.ts'

type Codec = { parse(value: unknown): unknown }
const methods = (TYPERT_REMOTE as unknown as { methods: Record<string, { result: { create(): Codec } }> }).methods

test('an older host without the global switch reads as absent; the per-Orchestrator fields are gone', () => {
  const coordinator = { id: 'c-1', sessionId: 's-1', name: 'Noether', title: 'Noether', home: '/h', folder: '/h', createdAt: 1, updatedAt: 2, coordinatorMatriarc: true }
  const parse = (value: unknown) => methods['coordinator/getState']!.result.create().parse(value) as { matriarc?: unknown; coordinators: Record<string, unknown>[] }
  const old = parse({ coordinators: [coordinator], threads: [], revision: 1, matriarc: { installed: true } })
  assert.equal(old.matriarc, undefined)
  assert.ok(!('coordinatorMatriarc' in old.coordinators[0]!))
  assert.deepEqual(parse({ coordinators: [], threads: [], revision: 1, matriarc: { installed: true, enabled: false, navigator: false } }).matriarc, { installed: true, enabled: false, navigator: false })
  assert.deepEqual(methods['coordinator/setMatriarc']!.result.create().parse({ installed: true, enabled: true }), { installed: true, enabled: true, navigator: true }, 'a host without the field never warns')
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

test('the no-navigator notice shows wherever the switch is on and no navigator is found, with or without a Session', async () => {
  const { wantsNavigatorNotice } = await import('../src/client/navigator.ts')
  assert.equal(wantsNavigatorNotice({ installed: true, enabled: true, navigator: false }), true)
  assert.equal(wantsNavigatorNotice({ installed: true, enabled: true, navigator: true }), false)
  assert.equal(wantsNavigatorNotice({ installed: true, enabled: false, navigator: false }), false, 'off: Whalepod leaves Matriarc alone')
  assert.equal(wantsNavigatorNotice({ installed: false, enabled: true, navigator: false }), false, 'not installed: no switch, no notice')
  assert.equal(wantsNavigatorNotice(undefined), false)
})

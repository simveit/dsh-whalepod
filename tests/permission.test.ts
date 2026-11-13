/**
 * The permission mode new threads start in: `auto` by default, `ask` (workspace-write) by the user's choice on the
 * Coordinator page, never anything looser, persisted, and known to the coordinator's prompt.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseConfig } from '../src/host/ids.ts'
import { parseState } from '../src/host/store.ts'
import { rig, tick, withCoordinator } from './harness.ts'

async function start(r: Awaited<ReturnType<typeof withCoordinator>>, title: string) {
  r.host.userTurn(r.coordinator, `start ${title}`)
  const started = await r.host.call(r.coordinator.id, 'thread_start', { title, brief: 'b' })
  assert.equal(started['error'], undefined, String(started['error']))
  return started
}

test('config: threadPermission is auto unless exactly ask', () => {
  assert.equal(parseConfig({}).threadPermission, 'auto')
  assert.equal(parseConfig({ threadPermission: 'ask' }).threadPermission, 'ask')
  for (const value of ['danger-full-access', 'never', 'ASK', 1, null]) assert.equal(parseConfig({ threadPermission: value }).threadPermission, 'auto')
  assert.equal(parseState(JSON.stringify({ version: 1, threads: [], threadPermission: 'danger-full-access' })).threadPermission, undefined)
  assert.equal(parseState(JSON.stringify({ version: 1, threads: [], threadPermission: 'ask' })).threadPermission, 'ask')
})

test('threads start in auto by default and in workspace-write after the user picks ask; only auto and ask are accepted', async () => {
  const r = await withCoordinator('perm-mode')
  assert.deepEqual(r.service.getState().threadPermission, { mode: 'auto', autoAvailable: true, effective: 'auto' })
  const first = await start(r, 'First')
  assert.equal(r.host.presets.get(first['sessionId'] as string), 'auto')
  assert.equal(first['permission'], 'auto')

  for (const bad of ['danger-full-access', 'workspace-write', 'never', '', undefined, 'AUTO']) {
    assert.throws(() => r.service.setThreadPermission(bad), /must be "auto" or "ask"/)
  }
  assert.deepEqual(r.service.setThreadPermission('ask'), { mode: 'ask', autoAvailable: true, effective: 'ask' })
  const second = await start(r, 'Second')
  assert.equal(r.host.presets.get(second['sessionId'] as string), 'workspace-write')
  assert.equal(second['permission'], 'ask')
  // A running thread keeps its mode.
  assert.equal(r.host.presets.get(first['sessionId'] as string), 'auto')

  // The coordinator's prompt says which mode threads start in.
  const prompt = r.host.sections.map(s => s.text({ agent: r.coordinator })).join('\n')
  assert.match(prompt, /Executor Sessions you start now run in ask mode \(the workspace-write preset\)/)

  // Persisted across a restart.
  await tick(300)
  r.host.dispose()
  assert.equal((JSON.parse(readFileSync(r.stateFile, 'utf8')) as { threadPermission?: string }).threadPermission, 'ask')
  const again = rig('perm-mode', { dir: r.dir })
  await again.service.ready
  assert.equal(again.service.getState().threadPermission?.mode, 'ask')
})

test('without auto review, auto falls back to workspace-write (never looser) and says so', async () => {
  const r = await withCoordinator('perm-noauto')
  const presets = r.host.services.get('permissionPresets') as { names: string[] }
  presets.names = ['default', 'workspace-write', 'danger-full-access']
  assert.deepEqual(r.service.getState().threadPermission, { mode: 'auto', autoAvailable: false, effective: 'ask' })
  const started = await start(r, 'No auto')
  assert.equal(r.host.presets.get(started['sessionId'] as string), 'workspace-write')
  assert.match(String((started['notes'] as string[]).join(' ')), /auto review is not loaded, so the Executor Session runs in ask mode/)
  // A failing auto preset also falls back to the stricter one.
  presets.names = ['default', 'workspace-write', 'auto']
  const svc = r.host.services.get('permissionPresets') as { set: (s: { id: string }, n: string) => void }
  const set = svc.set
  svc.set = (session, name) => { if (name === 'auto') throw new Error('auto refused'); set(session, name) }
  const fallback = await start(r, 'Auto refused')
  assert.equal(r.host.presets.get(fallback['sessionId'] as string), 'workspace-write')
  // The row keeps the mode the user chose; what runs is stricter.
  assert.equal(fallback['permission'], 'auto')
  assert.match(String((fallback['notes'] as string[]).join(' ')), /auto mode could not be set/)
})

test('the config default applies until the user picks', async () => {
  const r = await withCoordinator('perm-config', { config: { threadPermission: 'ask' } })
  assert.equal(r.service.getState().threadPermission?.effective, 'ask')
  const started = await start(r, 'Config ask')
  assert.equal(r.host.presets.get(started['sessionId'] as string), 'workspace-write')
  r.service.setThreadPermission('auto')
  const next = await start(r, 'Now auto')
  assert.equal(r.host.presets.get(next['sessionId'] as string), 'auto')
})

/**
 * The permission state machine of a thread's tree (M2, M3, I2, I3): pure tables, and the live application to leads
 * and members at creation, on a catalog change, on restore and on dispose.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { leadAction, memberAction, storedPreset, targetPermission } from '../src/host/permission.ts'
import { rig, tick, withCoordinator, type FakeHost } from './harness.ts'

test('pure: the target is never looser than the chosen mode', () => {
  const rows: [chosen: 'auto' | 'ask', autoAvailable: boolean, disposing: boolean, lead: string, parked: boolean, problem: boolean][] = [
    ['auto', true, false, 'auto', false, false],
    ['auto', false, false, 'workspace-write', true, true],
    ['ask', true, false, 'workspace-write', false, false],
    ['ask', false, false, 'workspace-write', false, false],
    ['auto', true, true, 'workspace-write', true, false],
    ['auto', false, true, 'workspace-write', true, false],
    ['ask', true, true, 'workspace-write', false, false],
    ['ask', false, true, 'workspace-write', false, false],
  ]
  for (const [chosen, autoAvailable, disposing, lead, parked, problem] of rows) {
    assert.deepEqual(targetPermission({ chosen, autoAvailable, disposing }), { lead, parked, autoUnavailable: problem }, JSON.stringify({ chosen, autoAvailable, disposing }))
  }
  const leads: [target: 'auto' | 'workspace-write', current: string | undefined, action: string][] = [
    ['auto', 'auto', 'none'], ['auto', 'workspace-write', 'set-auto'], ['auto', 'danger-full-access', 'set-auto'],
    ['workspace-write', 'workspace-write', 'none'], ['workspace-write', 'auto', 'set-workspace-write'],
    ['workspace-write', 'danger-full-access', 'set-workspace-write'], ['workspace-write', undefined, 'set-workspace-write'],
  ]
  for (const [target, current, action] of leads) assert.equal(leadAction(target, current), action, `${target} from ${current}`)
  const members: [target: 'auto' | 'workspace-write', current: string | undefined, narrowed: boolean, action: string][] = [
    ['auto', 'auto', false, 'none'], ['workspace-write', 'auto', false, 'narrow'], ['workspace-write', 'danger-full-access', false, 'narrow'],
    ['workspace-write', 'custom', false, 'narrow'], ['workspace-write', 'custom', true, 'none'], ['workspace-write', 'workspace-write', false, 'none'],
  ]
  for (const [target, current, narrowed, action] of members) assert.equal(memberAction(target, current, narrowed), action, `${target} from ${current} ${narrowed}`)
  assert.equal(storedPreset([{ type: 'permission/preset', data: { preset: 'auto' } }, { type: 'x', data: {} }, { type: 'permission/preset', data: { preset: 'workspace-write' } }]), 'workspace-write')
  assert.equal(storedPreset([]), undefined)
})

const presetsOf = (host: FakeHost) => host.services.get('permissionPresets') as { names: string[] }
const dropAuto = (host: FakeHost) => {
  presetsOf(host).names = ['default', 'workspace-write', 'danger-full-access']
  host.emit('permission-presets/catalog-changed')
}
const restoreAuto = (host: FakeHost) => {
  presetsOf(host).names = ['default', 'workspace-write', 'danger-full-access', 'auto']
  host.emit('permission-presets/catalog-changed')
}

test('auto review removed live: leads and members go to workspace-write, the panel names them; back again only for auto threads', async () => {
  const r = await withCoordinator('perm-live')
  r.host.userTurn(r.coordinator, 'two threads')
  const auto = await r.host.call(r.coordinator.id, 'thread_start', { title: 'Auto one', brief: 'b' })
  r.service.setThreadPermission('ask')
  const ask = await r.host.call(r.coordinator.id, 'thread_start', { title: 'Ask one', brief: 'b' })
  const lead = r.host.agentOf(auto['sessionId'] as string)
  assert.equal(r.host.presets.get(lead.id), 'auto')
  // dsh seeds a member with the lead's preset.
  const member = r.host.addMember(lead, 'worker')
  r.host.presets.set(member.id, 'auto')
  dropAuto(r.host)
  assert.equal(r.host.presets.get(lead.id), 'workspace-write')
  assert.ok(member.log.some(e => e.type === 'sandbox/mode' && (e.data as { mode: string }).mode === 'workspace-write'), 'member sandbox narrowed')
  assert.equal(r.host.presets.get(ask['sessionId'] as string), 'workspace-write')
  const problem = r.service.getState().problems?.find(p => p.kind === 'auto-unavailable')
  assert.match(problem?.detail ?? '', new RegExp(`run in Ask me .*${auto['id']}`))
  assert.doesNotMatch(problem?.detail ?? '', new RegExp(String(ask['id'])))
  // A member created while auto review is gone is narrowed at creation.
  const late = r.host.addMember(lead, 'late')
  r.host.presets.set(late.id, 'danger-full-access')
  r.host.emit('agent/created', { agent: late })
  assert.ok(late.log.some(e => e.type === 'sandbox/mode'))
  // Back: the auto thread returns to auto, the ask thread stays, members stay narrowed, the problem clears.
  restoreAuto(r.host)
  assert.equal(r.host.presets.get(lead.id), 'auto')
  assert.equal(r.host.presets.get(ask['sessionId'] as string), 'workspace-write')
  assert.equal(member.log.filter(e => e.type === 'sandbox/mode').length, 1)
  assert.equal(r.service.getState().problems?.some(p => p.kind === 'auto-unavailable') ?? false, false)
  // Dispose (removal or quit) leaves every lead on workspace-write.
  r.host.dispose()
  assert.equal(r.host.presets.get(lead.id), 'workspace-write')
})

test('M3: a thread whose workspace-write preset cannot be set is not started', async () => {
  const r = await withCoordinator('perm-refuse')
  r.service.setThreadPermission('ask')
  const svc = r.host.services.get('permissionPresets') as { set: (s: { id: string }, n: string) => void }
  svc.set = () => { throw new Error('preset refused') }
  r.host.userTurn(r.coordinator, 'start')
  const result = await r.host.call(r.coordinator.id, 'thread_start', { title: 'Strict', brief: 'b' })
  assert.match(String(result['error']), /workspace-write preset could not be set .* not started/)
  assert.equal(r.service.listThreads().length, 0)
  r.host.dispose()
})

test('I3: a cold auto thread while auto review is missing is marked, refuses messages, and recovers when auto returns', async () => {
  const first = await withCoordinator('perm-gone')
  first.host.userTurn(first.coordinator, 'start')
  const started = await first.host.call(first.coordinator.id, 'thread_start', { title: 'Auto cold', brief: 'b' })
  const lead = first.host.agentOf(started['sessionId'] as string)
  lead.append('permission/preset', { preset: 'auto' })
  await tick(250)
  first.host.dispose()
  const again = rig('perm-gone', {
    dir: first.dir,
    before: ({ host }) => {
      host.storeCold(lead)
      host.storeCold(first.coordinator)
      ;(host.services.get('permissionPresets') as { names: string[] }).names = ['default', 'workspace-write']
    },
  })
  await again.service.ready
  const row = again.service.listThreads()[0]!
  assert.equal(row.status, 'needs-user')
  assert.match(row.statusDetail ?? '', /auto review is not loaded/)
  assert.match(again.service.getState().problems?.find(p => p.kind === 'auto-unavailable')?.detail ?? '', /cannot resume/)
  await assert.rejects(again.service.messageThread(first.coordinator.id, row.id, 'hi', 'k', new AbortController().signal), /cannot run/)
  restoreAuto(again.host)
  assert.notEqual(again.service.listThreads()[0]!.status, 'needs-user')
  again.host.dispose()
})

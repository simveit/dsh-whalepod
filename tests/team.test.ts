/**
 * Threads whose lead works with subagents or Agent Teams members: status across the lead's tree, notices, the hold of
 * a result while members work, stop, archive, restart, the cap, tool gating and `thread_read`.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { deriveStatus, foldTurn, initialFacts, restoredFacts, persistedFacts, addMember, memberRunning, applyMemberEvent, memberSettled, SETTLE_GRACE_MS } from '../src/host/status.ts'
import { rig, tick, withCoordinator, type FakeAgent } from './harness.ts'

const textOf = (m: { content: readonly { text: string }[] }) => m.content.map(c => c.text).join('\n')
const wakes = (c: FakeAgent) => c.received.filter(r => r.how === 'followup' && !r.message.id.includes(':opening:'))
const quiet = (c: FakeAgent) => c.received.filter(r => r.how === 'inject' && !r.message.id.startsWith('dsh-coordinator:role:'))

async function startThread(r: Awaited<ReturnType<typeof withCoordinator>>, title = 'Build word count') {
  r.host.userTurn(r.coordinator, 'Please start a thread and use a team')
  const started = await r.host.call(r.coordinator.id, 'thread_start', { title, brief: 'Build it with a team.' })
  assert.equal(started['error'], undefined, String(started['error']))
  await tick(1)
  return { id: started['id'] as string, lead: r.host.agentOf(started['sessionId'] as string) }
}

/** Member running state as dsh reports it: agent/status plus the turn events in its own log. */
function memberTurn(r: { host: { emit(name: string, ...args: unknown[]): unknown } }, member: FakeAgent, run: boolean): void {
  if (run) member.startTurn()
  else member.endTurn('completed', `${member.id} wrote its part`)
}

test('status: the thread stays running while a member works after the lead ended its turn; no early idle notice', async () => {
  const r = await withCoordinator('team-status')
  const { id, lead } = await startThread(r)
  lead.startTurn()
  const impl = r.host.addMember(lead, 'wc-impl', 'Implement wc.py')
  const tests = r.host.addMember(lead, 'wc-tests', 'Write tests')
  memberTurn(r, impl, true)
  memberTurn(r, tests, true)
  // The lead ends its turn and waits for its members.
  lead.endTurn('completed', 'Waiting for my team.')
  await tick(20)
  const row = () => r.service.listThreads().find(t => t.id === id)!
  assert.equal(row().status, 'running')
  assert.match(row().statusDetail ?? '', /lead waits for 2 team members: wc-impl, wc-tests/)
  assert.deepEqual(row().team, { members: 2, working: 2 })
  assert.equal(wakes(r.coordinator).length, 0, 'no idle notice while members work')
  assert.equal(quiet(r.coordinator).length, 0)

  // One member finishes and settles; the lead wakes for it (the runtime's notice starts a turn), the other still works.
  memberTurn(r, impl, false)
  r.host.settle(impl)
  lead.startTurn()
  lead.append('user/message', { id: 'x1', role: 'user', content: [{ type: 'text', text: 'settled' }], source: { kind: 'subagent-settled', senderSessionId: impl.id, stopReason: 'completed' } })
  lead.endTurn('completed', 'One down.')
  await tick(20)
  assert.equal(row().status, 'running')
  assert.equal(wakes(r.coordinator).length, 0)

  // The last member settles, the lead integrates and ends: one wake, attributed like the brief's turn, with the team.
  memberTurn(r, tests, false)
  r.host.settle(tests)
  lead.startTurn()
  await r.host.call(lead.id, 'coordinator_report', { kind: 'result', text: 'wc.py and tests pass' })
  lead.endTurn('completed', 'All done.')
  await tick(30)
  assert.equal(row().status, 'done')
  assert.equal(wakes(r.coordinator).length, 1, 'exactly one wake for the whole team run')
  const text = textOf(wakes(r.coordinator)[0]!.message)
  assert.match(text, /reported a result/)
  assert.match(text, /teammates[^]*wc-impl: finished \(Implement wc.py\); wc-tests: finished/)
})

test('status: an idle member counts as working for a short grace until its settlement arrives, then the thread goes idle', async () => {
  const r = await withCoordinator('team-grace')
  const { id, lead } = await startThread(r)
  lead.startTurn()
  const m = r.host.addMember(lead, 'helper')
  memberTurn(r, m, true)
  lead.endTurn('completed', 'waiting')
  memberTurn(r, m, false)
  await tick(20)
  assert.equal(r.service.listThreads().find(t => t.id === id)!.status, 'running')
  // Pure check of the grace window.
  let f = addMember(initialFacts('active'), 's1', 'helper', undefined)
  f = memberRunning(f, 's1', true, 0)
  f = memberRunning(f, 's1', false, 1000)
  assert.equal(deriveStatus(f, 1000 + SETTLE_GRACE_MS - 1).status, 'running')
  assert.equal(deriveStatus(f, 1000 + SETTLE_GRACE_MS + 1).status, 'idle')
  assert.equal(deriveStatus(memberSettled(f, 's1', 'completed'), 1001).status, 'idle')
})

test('a result sent while members still work is held until the tree is quiet, and the lead is told', async () => {
  const r = await withCoordinator('team-hold')
  const { lead } = await startThread(r)
  lead.startTurn()
  const m = r.host.addMember(lead, 'slow')
  memberTurn(r, m, true)
  const result = await r.host.call(lead.id, 'coordinator_report', { kind: 'result', text: 'Done (I think)' })
  assert.match(String(result['note']), /Teammates are still working \(slow\)/)
  lead.endTurn('completed', 'Reported.')
  await tick(80)
  assert.equal(wakes(r.coordinator).length, 0, 'held past the normal maximum delay while the member works')
  memberTurn(r, m, false)
  r.host.settle(m)
  lead.startTurn()
  lead.endTurn('completed', 'Integrated.')
  await tick(30)
  assert.equal(wakes(r.coordinator).length, 1)
  assert.match(textOf(wakes(r.coordinator)[0]!.message), /Done \(I think\)/)
})

test('a held result goes out labelled when its hold runs out while members still work', async () => {
  const r = await withCoordinator('team-label')
  const { lead } = await startThread(r)
  // Shorten the hold: patch the batcher's limit through the service's notice path (internal).
  const batcher = (r.service as unknown as { batcher: { options: { holdMs: () => number } } }).batcher
  batcher.options.holdMs = () => 60
  lead.startTurn()
  const m = r.host.addMember(lead, 'slow')
  memberTurn(r, m, true)
  await r.host.call(lead.id, 'coordinator_report', { kind: 'result', text: 'Partial result' })
  lead.endTurn('completed', 'Reported.')
  await tick(150)
  assert.equal(wakes(r.coordinator).length, 1)
  assert.match(textOf(wakes(r.coordinator)[0]!.message), /sent while Teammates of the Executor Session were still working \(slow\)/)
})

test('member approvals and questions surface on the thread, name the member, and lead to the member session; nothing answers them', async () => {
  const r = await withCoordinator('team-approval')
  const { id, lead } = await startThread(r)
  lead.startTurn()
  const m = r.host.addMember(lead, 'writer')
  memberTurn(r, m, true)
  m.append('approval/asked', { id: 'ap1', toolName: 'bash', reason: 'writes outside the folder' })
  await tick(20)
  const row = () => r.service.listThreads().find(t => t.id === id)!
  assert.equal(row().status, 'waiting-approval')
  assert.match(row().statusDetail ?? '', /^team member writer: approval for bash/)
  assert.equal(row().attentionSessionId, m.id)
  assert.equal(wakes(r.coordinator).length, 1)
  const text = textOf(wakes(r.coordinator)[0]!.message)
  assert.match(text, /waiting for the USER to approve/)
  assert.match(text, /A Teammate of this Executor Session asked \(writer\)/)
  // A waiting member holds no slot, and the lead's own turn end does not clear the member's open approval.
  lead.endTurn('completed', 'waiting on writer')
  await tick(10)
  assert.equal(row().status, 'waiting-approval')
  m.append('approval/decided', { id: 'ap1', outcome: 'approved' })
  await tick(10)
  assert.equal(row().status, 'running')
  assert.equal(row().attentionSessionId, undefined)
  // A member question.
  m.append('tool/call', { name: 'ask_user_question', callId: 'q1', arguments: JSON.stringify({ questions: [{ question: 'Tabs or spaces?' }] }) })
  await tick(20)
  assert.equal(row().status, 'waiting-question')
  assert.match(row().statusDetail ?? '', /team member writer asks: question: Tabs or spaces\?/)
  // No listener of the plugin answers approvals or questions.
  assert.equal(r.host.listeners.get('approval/request'), undefined)
  assert.equal(r.host.listeners.get('user-questions/request'), undefined)
})

test('a member approval rejected at once (dsh pins members to the never policy) does not wake the coordinator', async () => {
  const r = await withCoordinator('team-never')
  const { lead } = await startThread(r)
  lead.startTurn()
  const m = r.host.addMember(lead, 'writer')
  memberTurn(r, m, true)
  m.append('approval/asked', { id: 'ap1', toolName: 'bash', reason: 'denied by auto review' })
  m.append('approval/decided', { id: 'ap1', outcome: 'rejected' })
  await tick(30)
  assert.equal(wakes(r.coordinator).length, 0, 'a stale waiting notice is dropped')
})

test('tool gating: members and nested members get no thread or coordinator tools and no role prompt', async () => {
  const r = await withCoordinator('team-tools')
  const { lead } = await startThread(r)
  const m = r.host.addMember(lead, 'a')
  const nested = r.host.addMember(m, 'b')
  memberTurn(r, nested, true)
  assert.deepEqual(r.host.toolsFor(lead.id).sort(), ['coordinator_report', 'executor_peers', 'executor_send'])
  assert.deepEqual(r.host.toolsFor(m.id), [])
  assert.deepEqual(r.host.toolsFor(nested.id), [])
  assert.equal(r.host.sections.map(s => s.text({ agent: m })).join(''), '')
  // A peer message cannot be addressed to a member: only thread leads are reachable.
  const other = await startThread(r, 'Other work')
  const sent = await r.host.call(other.lead.id, 'thread_send', { thread: m.id, text: 'hi' })
  assert.match(String(sent['error']), /unknown executor session/)
  // The nested member counts for the thread (it is in the lead's tree).
  await tick(5)
  assert.equal(r.service.listThreads().find(t => t.sessionId === lead.id)!.team?.members, 2)
})

test('thread_stop stops the members too, and their results do not restart the lead until someone writes', async () => {
  const r = await withCoordinator('team-stop')
  const { id, lead } = await startThread(r)
  lead.startTurn()
  const a = r.host.addMember(lead, 'a')
  const b = r.host.addMember(lead, 'b')
  memberTurn(r, a, true)
  memberTurn(r, b, true)
  lead.endTurn('completed', 'waiting for a and b')
  await tick(10)
  const stopped = await r.host.call(r.coordinator.id, 'thread_stop', { thread: id })
  assert.equal(stopped['stopped'], true)
  assert.equal(stopped['membersStopped'], 2)
  assert.deepEqual(r.host.interrupts.sort(), [a.id, b.id].sort())
  // The runtime settles them and offers the results to the idle lead: the gate enters that step without messages.
  const settledA = r.host.settle(a, 'aborted')
  r.host.settle(b, 'aborted')
  lead.startTurn()
  const decision = await r.host.emit('agent/pre-step', { agent: lead, messages: [settledA], turn: 2, step: 1 }) as { kind: string; messages: unknown[] }
  assert.deepEqual({ kind: decision.kind, n: decision.messages.length }, { kind: 'enter', n: 0 })
  assert.ok(lead.received.some(x => x.how === 'inject' && x.message.id === settledA.id), 're-injected for the next real turn')
  lead.endTurn('completed')
  await tick(20)
  const row = r.service.listThreads().find(t => t.id === id)!
  assert.equal(row.status, 'stopped')
  assert.equal(wakes(r.coordinator).length, 0, 'a stop the coordinator asked for is not echoed')
  // A coordinator message lifts the hold: the next settlement passes through.
  r.host.userTurn(r.coordinator, 'continue')
  await r.host.call(r.coordinator.id, 'thread_message', { thread: id, text: 'Continue.' })
  const pass = await r.host.emit('agent/pre-step', { agent: lead, messages: [settledA], turn: 3, step: 1 }) as { fromDefault?: boolean }
  assert.equal(pass.fromDefault, true)
})

test('archive refuses a thread whose members still work, and force archives it', async () => {
  const r = await withCoordinator('team-archive')
  const { id, lead } = await startThread(r)
  lead.startTurn()
  const m = r.host.addMember(lead, 'busy')
  memberTurn(r, m, true)
  lead.endTurn('completed', 'waiting')
  await tick(10)
  await assert.rejects(r.service.archiveThread(r.coordinator.id, id), /a Teammate is still working/)
  await r.service.archiveThread(r.coordinator.id, id, { force: true })
  assert.equal(r.service.listThreads().length, 0)
  // Events of a member of an archived thread are ignored.
  m.endTurn('completed')
})

test('the running-thread cap counts a thread whose lead is idle but whose members work', async () => {
  const r = await withCoordinator('team-cap', { config: { maxRunningThreads: 1 } })
  const first = await startThread(r, 'First')
  first.lead.startTurn()
  const m = r.host.addMember(first.lead, 'worker')
  memberTurn(r, m, true)
  first.lead.endTurn('completed', 'waiting')
  await tick(5)
  r.host.userTurn(r.coordinator, 'another one')
  const second = await r.host.call(r.coordinator.id, 'thread_start', { title: 'Second', brief: 'b' })
  assert.match(String((second['notes'] as string[] | undefined)?.join(' ')), /queued/)
  memberTurn(r, m, false)
  r.host.settle(m)
  await tick(SETTLE_GRACE_MS > 0 ? 20 : 0)
  // Settled: the slot frees and the queued brief goes out.
  assert.equal(r.service.listThreads().find(t => t.id === second['id'])!.statusDetail, undefined)
})

test('restart: a thread whose team still worked comes back stopped with a detail naming the members', async () => {
  const r = await withCoordinator('team-restart')
  const { id, lead } = await startThread(r)
  lead.startTurn()
  const m = r.host.addMember(lead, 'wc-impl')
  memberTurn(r, m, true)
  lead.endTurn('completed', 'waiting')
  await tick(300)
  r.host.dispose()
  const saved = JSON.parse(readFileSync(r.stateFile, 'utf8')) as { threads: { info: { id: string }; facts: { membersAtSave?: string[] } }[] }
  assert.deepEqual(saved.threads.find(t => t.info.id === id)!.facts.membersAtSave, ['wc-impl'])
  // Pure: an app start (no live agent) with the lead's last turn completed.
  const facts = restoredFacts(saved.threads[0]!.facts as never, undefined, false, 5)
  assert.equal(deriveStatus(facts).status, 'stopped')
  const folded = foldTurn(facts, lead.log, false, 6)
  assert.deepEqual(deriveStatus(folded), { status: 'stopped', detail: 'stopped when the app quit; team members were still working (wc-impl)' })
  // A fresh service on the same state file (members gone, lead stored but not loaded).
  const again = rig('team-restart', { dir: r.dir, before: ({ host }) => { host.storeCold(lead); host.storeCold(r.coordinator) } })
  await again.service.ready
  const row = again.service.listThreads().find(t => t.id === id)!
  assert.equal(row.status, 'stopped')
  assert.match(row.statusDetail ?? '', /team members were still working \(wc-impl\)/)
})

test('pure: member events fold separately from the lead; persisted facts carry only working member names', () => {
  let f = addMember(initialFacts('active'), 'm1', 'x', 'task x')
  f = applyMemberEvent(f, 'm1', { type: 'turn/start', data: {} }, 1)
  f = applyMemberEvent(f, 'm1', { type: 'assistant/message', data: { message: { content: [{ type: 'text', text: 'hello' }] } } }, 2)
  assert.equal(f.members!['m1']!.running, true)
  assert.equal(f.members!['m1']!.lastText, 'hello')
  assert.equal(f.lastAssistantText, undefined, 'member text is not the lead\'s last message')
  assert.deepEqual(persistedFacts(f, 3).membersAtSave, ['x'])
  assert.equal('members' in persistedFacts(f, 3), false)
  f = applyMemberEvent(f, 'm1', { type: 'turn/end', data: { reason: { kind: 'completed' } } }, 4)
  f = memberSettled(f, 'm1', 'completed')
  assert.equal(persistedFacts(f, 5).membersAtSave, undefined)
})

test('thread_read summarises the team and labels member messages in the history', async () => {
  const r = await withCoordinator('team-read')
  const { id, lead } = await startThread(r)
  lead.startTurn()
  const m = r.host.addMember(lead, 'wc-tests', 'Write test_wc.py')
  memberTurn(r, m, true)
  lead.append('user/message', { id: 'am1', role: 'user', content: [{ type: 'text', text: 'tests are in' }], source: { kind: 'agent-message', form: 'relay', senderSessionId: m.id } })
  lead.append('user/message', { id: 'st1', role: 'user', content: [{ type: 'text', text: 'Background subagent wc-tests finished.' }], source: { kind: 'subagent-settled', senderSessionId: m.id, stopReason: 'completed' } })
  const read = await r.host.call(r.coordinator.id, 'thread_read', { thread: id, mode: 'recent' })
  const text = JSON.stringify(read)
  assert.match(text, /teammates \(name: state, task\)/)
  assert.match(text, /wc-tests: (working|finished), Write test_wc.py/)
  assert.match(text, /member: \(team member wc-tests\) tests are in/)
  assert.match(text, /member: \(team member wc-tests finished\) Background subagent/)
})

test('restart after a stop with the team: model-free turns the gate absorbed do not turn the stop into idle', () => {
  // The lead's log as dsh wrote it: a real turn that ended while members worked, then two absorbed turns.
  const log = [
    { type: 'turn/start', data: { turn: 1 }, time: 10 },
    { type: 'step/start', data: {}, time: 11 },
    { type: 'assistant/message', data: { message: { content: [{ type: 'text', text: 'waiting for my team' }] } }, time: 12 },
    { type: 'turn/end', data: { reason: { kind: 'completed' } }, time: 13 },
    { type: 'agent/inbox/spliced', data: { target: 'next-turn', inserted: [{ source: { kind: 'subagent-settled' } }] }, time: 21 },
    { type: 'turn/start', data: { turn: 2 }, time: 21 },
    { type: 'agent/inbox/spliced', data: { target: 'next-step', inserted: [] }, time: 21 },
    { type: 'turn/end', data: { reason: { kind: 'completed' } }, time: 22 },
  ]
  const saved = { phase: 'active' as const, lastTurnStartAt: 10, stopRequestedAt: 20, lastTurnEnd: { kind: 'aborted', at: 20, detail: 'stopped by the coordinator with its team members' } }
  const facts = restoredFacts(saved, undefined, false, 30)
  assert.deepEqual(deriveStatus(foldTurn(facts, log, false, 31)), { status: 'stopped', detail: 'stopped by the coordinator with its team members' })
  // Without the stop, the real turn's end counts (the absorbed turn is skipped either way).
  const plain = restoredFacts({ phase: 'active', lastTurnStartAt: 10, lastTurnEnd: { kind: 'completed', at: 13 } }, undefined, false, 30)
  assert.equal(deriveStatus(foldTurn(plain, log, false, 31)).status, 'idle')
})

test('restart: the team is rebuilt from the lead\'s log for thread_read, with members cut by the restart marked stopped', async () => {
  const r = await withCoordinator('team-rebuild')
  const { id, lead } = await startThread(r)
  lead.startTurn()
  const done = r.host.addMember(lead, 'wc-impl', 'Implement wc.py')
  const cut = r.host.addMember(lead, 'wc-tests', 'Write tests')
  const held = r.host.addMember(lead, 'docs', 'Write docs')
  lead.append('user/message', { id: 's1', role: 'user', content: [{ type: 'text', text: 'wc-impl finished' }], source: { kind: 'subagent-settled', senderSessionId: done.id, stopReason: 'completed' } })
  // A settlement the stop gate re-queued sits in the inbox only.
  lead.append('agent/inbox/spliced', { target: 'next-step', start: 0, inserted: [{ id: 's2', source: { kind: 'subagent-settled', senderSessionId: held.id, stopReason: 'aborted' } }] })
  lead.endTurn('completed', 'waiting')
  await tick(300)
  r.host.dispose()
  // A new service on the same table; the members' agents are gone (an app restart), the lead's log remains.
  r.host.agentsById.delete(done.id)
  r.host.agentsById.delete(cut.id)
  r.host.agentsById.delete(held.id)
  const again = rig('team-rebuild', { dir: r.dir, host: r.host })
  await again.service.ready
  const read = await again.service.readThread(r.coordinator.id, id, 'summary', undefined, new AbortController().signal) as { team?: unknown; untrusted: string }
  assert.deepEqual(read.team, { members: 3, working: 0 })
  assert.match(read.untrusted, /wc-impl: finished, Implement wc.py\nwc-tests: stopped by an app restart, Write tests\ndocs: stopped, Write docs/)
})

test('the user pressing Stop in the lead\'s chat stops its running members too', async () => {
  const r = await withCoordinator('team-user-stop')
  const { id, lead } = await startThread(r)
  lead.startTurn()
  const m = r.host.addMember(lead, 'worker')
  memberTurn(r, m, true)
  // dsh's stop button: the lead's turn ends aborted with a user cause; the member keeps running in dsh.
  lead.append('turn/end', { reason: { kind: 'aborted', reason: { kind: 'user' } } })
  lead.status = 'idle'
  r.host.emit('agent/status', { agent: lead, status: 'idle' })
  await tick(5)
  assert.deepEqual(r.host.interrupts, [m.id])
  const settled = r.host.settle(m, 'aborted')
  const decision = await r.host.emit('agent/pre-step', { agent: lead, messages: [settled], turn: 2, step: 1 }) as { messages: unknown[]; fromDefault?: boolean }
  assert.equal(decision.fromDefault, undefined, 'the member\'s result does not restart the stopped lead')
  assert.equal(r.service.listThreads().find(t => t.id === id)!.status, 'stopped')
})

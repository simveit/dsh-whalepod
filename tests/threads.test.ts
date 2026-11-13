import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { TOOL } from '../src/host/names.ts'
import { FakeHost, rig, scratch, tick, withCoordinator, type FakeAgent } from './harness.ts'

const textOf = (m: { content: readonly { text: string }[] }) => m.content.map(c => c.text).join('\n')
/** Coordinator messages that woke it (followup) and quiet ones (inject), after the opening message. */
const wakes = (c: FakeAgent) => c.received.filter(r => r.how === 'followup' && !r.message.id.includes(':opening:'))
const quiet = (c: FakeAgent) => c.received.filter(r => r.how === 'inject' && !r.message.id.startsWith('dsh-coordinator:role:'))

async function startOne(r: Awaited<ReturnType<typeof withCoordinator>>, args: Record<string, unknown> = {}) {
  r.host.userTurn(r.coordinator, 'Please start a thread to write hello.txt')
  const result = await r.host.call(r.coordinator.id, 'thread_start', { title: 'Write hello file', brief: 'Write hello.txt.', ...args })
  await tick(1)
  return result
}

// --- 1. Event sequences -> notices -----------------------------------------------------------------------------------

test('notices: coordinator turns wake, user turns stay quiet, stops are not echoed, approvals wake, report + end = one wake', async () => {
  const r = await withCoordinator('notices')
  const started = await startOne(r)
  assert.equal(started['error'], undefined, String(started['error']))
  const thread = r.host.agentOf(started['sessionId'] as string)

  // A turn the coordinator started (the brief): its end wakes the coordinator.
  thread.startTurn()
  thread.endTurn('completed', 'Done writing.')
  await tick(20)
  assert.equal(wakes(r.coordinator).length, 1)
  assert.match(textOf(wakes(r.coordinator)[0]!.message), /finished its turn/)

  // A turn the user drove in the thread: mentioned quietly.
  thread.startTurn()
  thread.endTurn('completed', 'Answered the user.')
  await tick(20)
  assert.equal(wakes(r.coordinator).length, 1)
  assert.equal(quiet(r.coordinator).length, 1)

  // An approval wakes the coordinator.
  thread.startTurn()
  thread.append('approval/asked', { id: 'a1', toolName: 'bash', reason: 'deletes files' })
  await tick(20)
  assert.equal(wakes(r.coordinator).length, 2)
  assert.match(textOf(wakes(r.coordinator)[1]!.message), /waiting for the USER to approve/)
  thread.append('approval/decided', { id: 'a1', outcome: 'approved' })

  // A stop the coordinator asked for is not reported back.
  await r.host.call(r.coordinator.id, 'thread_stop', { thread: started['id'] })
  await tick(20)
  assert.equal(wakes(r.coordinator).length, 2)

  // A result report followed by the end of the turn: one wake carrying both.
  r.host.userTurn(r.coordinator, 'continue')
  await r.host.call(r.coordinator.id, 'thread_message', { thread: started['id'], text: 'Please continue.' })
  await tick(1)
  thread.startTurn()
  await r.host.call(thread.id, 'coordinator_report', { kind: 'result', text: 'Wrote hello.txt' })
  await tick(20)
  assert.equal(wakes(r.coordinator).length, 2, 'held while the turn runs')
  thread.endTurn('completed', 'All done.')
  await tick(30)
  assert.equal(wakes(r.coordinator).length, 3)
  const last = textOf(wakes(r.coordinator)[2]!.message)
  assert.match(last, /report \(result\): Wrote hello\.txt/)
  assert.match(last, /status done/)
  r.host.dispose()
})

test('the wake guard turns a flood of wakes into quiet updates and one alert', async () => {
  const r = await withCoordinator('wake-guard', { config: { wakeMaxPerThread: 2 } })
  const started = await startOne(r)
  const thread = r.host.agentOf(started['sessionId'] as string)
  for (let i = 0; i < 5; i++) {
    await r.host.call(thread.id, 'coordinator_report', { kind: 'question', text: `Question ${i}?` })
    await tick(20)
  }
  const alerts = wakes(r.coordinator).filter(w => /woke you 2 times/.test(textOf(w.message)))
  assert.equal(alerts.length, 1)
  assert.equal(wakes(r.coordinator).length, 3, 'two wakes, then one alert')
  assert.ok(quiet(r.coordinator).length >= 2)
  r.host.dispose()
})

// --- 2. startThread: rollback, folders, authority --------------------------------------------------------------------

test('a failed start rolls back the session, workspace and folder, and a retry makes exactly one thread', async () => {
  const r = await withCoordinator('rollback')
  r.host.failNext.rename = new Error('title service down')
  const failed = await startOne(r)
  assert.match(String(failed['error']), /could not start the Executor Session: title service down/)
  assert.equal(r.service.listThreads().length, 0)
  assert.equal(r.host.archived.length, 1, 'the half-made session is archived')
  assert.deepEqual(readdirSync(r.root), [], 'the new folder is removed')
  assert.equal(r.host.workspaces.filter(w => w.path.startsWith(r.root + '/')).length, 0)
  const ok = await startOne(r)
  assert.equal(ok['error'], undefined)
  assert.equal(r.service.listThreads().length, 1)
  assert.deepEqual(readdirSync(r.root), ['write-hello-file'])
  r.host.dispose()
})

test('each Executor Session sits in its own sidebar group at its own folder, titled "<coordinator> · <folder>", after its coordinator\'s group', async () => {
  const r = await withCoordinator('workspaces')
  const a = await startOne(r)
  const b = await startOne(r, { title: 'Second task' })
  const agentA = r.host.agentOf(a['sessionId'] as string)
  // The header cwd is the thread folder: that is its sandbox workspace root under workspace-write.
  assert.equal(agentA.session.header.cwd, a['cwd'])
  assert.equal(a['cwd'], join(r.root, 'write-hello-file'))
  assert.deepEqual(r.host.workspaces.map(w => w.title), ['Newton', 'Newton · write-hello-file', 'Newton · second-task'])
  const groupA = r.host.workspaces.find(w => w.path === a['cwd'])!
  assert.deepEqual(groupA.sessionIds, [a['sessionId']])
  assert.ok(r.host.createRequests.slice(-2).every(c => c.workspaceId !== undefined && c.cwd === undefined && c.agentPreset === 'standard'))
  assert.ok(!r.host.ungrouped.includes(a['sessionId'] as string))
  assert.notEqual(a['cwd'], b['cwd'])
  assert.equal(r.host.presets.get(agentA.id), 'auto')
  assert.equal(agentA.title, 'Write hello file')
  r.host.dispose()
})

test('folders outside the threads root need the user\'s own words; thread output and briefs do not count', async () => {
  const r = await withCoordinator('folders')
  const outside = join(r.home, 'dev', 'project')
  mkdirSync(outside, { recursive: true })
  // A thread report naming the folder does not authorise it.
  r.coordinator.append('user/message', { id: 'x', role: 'user', content: [{ type: 'text', text: `the user wants work in ${outside}` }], source: { kind: 'agent-message', senderSessionId: 's' } })
  r.host.userTurn(r.coordinator, 'Start a cleanup thread.')
  let result = await r.host.call(r.coordinator.id, 'thread_start', { title: 'Cleanup', brief: 'x', cwd: outside })
  assert.match(String(result['error']), /Ask the user to name the folder/)
  result = await r.host.call(r.coordinator.id, 'thread_start', { title: 'Cleanup', brief: `Working directory: ${outside}\nDo it.` })
  assert.match(String(result['error']), /the Assignment names the working directory/)
  // Dangerous paths are refused even when typed by the user.
  r.host.userTurn(r.coordinator, `Work in ${r.home} or ${join(r.home, '.ssh')}`)
  for (const cwd of [r.home, join(r.home, '.ssh'), '/']) {
    result = await r.host.call(r.coordinator.id, 'thread_start', { title: 'Bad', brief: 'x', cwd })
    assert.ok(typeof result['error'] === 'string', cwd)
  }
  assert.equal(existsSync(join(r.home, '.ssh')), false, 'nothing was created')
  // The user names it: accepted.
  r.host.userTurn(r.coordinator, `Please work in ${outside}.`)
  result = await r.host.call(r.coordinator.id, 'thread_start', { title: 'Project work', brief: 'x', cwd: outside })
  assert.equal(result['error'], undefined, String(result['error']))
  assert.equal(result['cwd'], outside)
  r.host.dispose()
})

test('the brief is the user\'s instruction only in a turn the user opened', async () => {
  const r = await withCoordinator('authority')
  const byUser = await startOne(r)
  const userThread = r.host.agentOf(byUser['sessionId'] as string)
  const brief = userThread.received[0]!
  assert.equal(brief.how, 'prompt')
  assert.equal(brief.message.source.kind, 'user')
  r.host.noticeTurn(r.coordinator)
  const byNotice = await r.host.call(r.coordinator.id, 'thread_start', { title: 'Follow-up task', brief: 'Do more.' })
  await tick(1)
  assert.match(JSON.stringify(byNotice['notes']), /recorded as a coordinator notice/)
  const noticeThread = r.host.agentOf(byNotice['sessionId'] as string)
  const noticeBrief = noticeThread.received[0]!
  assert.equal(noticeBrief.message.source.kind, 'agent-message')
  assert.equal(noticeBrief.message.source['senderSessionId'], r.coordinator.id)
  assert.match(textOf(noticeBrief.message), /not on a direct user request/)
  r.host.dispose()
})

// --- 3. Coordinator messages never take user authority ---------------------------------------------------------------

test('thread_message is an agent message in every path, delivered once per request id', async () => {
  const r = await withCoordinator('messages', { config: { maxRunningThreads: 1 } })
  const a = await startOne(r)
  const threadA = r.host.agentOf(a['sessionId'] as string)
  threadA.startTurn()
  // Running: steered.
  await r.host.call(r.coordinator.id, 'thread_message', { thread: a['id'], text: 'Also add a newline.' }, 'c1')
  // L3: a provider that reuses a tool-call id does not lose the second message (keys are minted per execution).
  const again = await r.host.call(r.coordinator.id, 'thread_message', { thread: a['id'], text: 'And a title.' }, 'c1')
  assert.equal(again['delivery'], 'steer')
  // Queued behind the cap: kept apart from the brief.
  const b = await startOne(r, { title: 'Queued task' })
  assert.match(JSON.stringify(b['notes']), /queued/)
  const queued = await r.host.call(r.coordinator.id, 'thread_message', { thread: b['id'], text: 'Extra detail.' })
  assert.match(String(queued['delivery']), /after the Assignment/)
  threadA.endTurn('completed', 'ok')
  await tick(5)
  // Idle: a followup.
  await r.host.call(r.coordinator.id, 'thread_message', { thread: a['id'], text: 'One more thing.' })
  await tick(5)
  const threadB = r.host.agentOf(b['sessionId'] as string)
  const toA = threadA.received.slice(1)
  assert.deepEqual(toA.map(m => m.how), ['steer', 'steer', 'followup'])
  const toB = threadB.received
  assert.equal(toB[0]!.how, 'prompt', 'the brief')
  assert.equal(toB[1]!.message.source.kind, 'agent-message')
  for (const m of [...toA, toB[1]!]) {
    assert.notEqual(m.message.source.kind, 'user')
    assert.match(textOf(m.message), /^Message from the coordinator \(not from the user\)/)
  }
  assert.doesNotMatch(textOf(toB[0]!.message), /Extra detail/, 'never merged into the brief')
  r.host.dispose()
})

// --- 4. Restore ------------------------------------------------------------------------------------------------------

test('restore: a corrupt file is moved aside, a newer one is never overwritten', async () => {
  const dir = scratch('restore-files')
  const corrupt = rig('restore-files', { dir, before: ({ stateFile }) => { mkdirSync(dirname(stateFile), { recursive: true }); writeFileSync(stateFile, '{oops') } })
  await corrupt.service.ready
  assert.equal(corrupt.service.getState().problem?.kind, 'state-reset')
  assert.ok(readdirSync(dirname(corrupt.stateFile)).some(f => f.startsWith('state.json.corrupt-')))
  corrupt.host.dispose()
  writeFileSync(corrupt.stateFile, '{"version":9,"keep":"me"}')
  const newer = rig('restore-files', { dir })
  await newer.service.ready
  assert.equal(newer.service.getState().problem?.kind, 'read-only')
  await newer.service.ensureCoordinator()
  newer.host.dispose()
  assert.equal(readFileSync(newer.stateFile, 'utf8'), '{"version":9,"keep":"me"}')
})

test('restore after a plugin reload: a running thread stays running and its end reaches the coordinator; a queued brief is delivered', async () => {
  const first = await withCoordinator('restore-live', { config: { maxRunningThreads: 1 } })
  const a = await startOne(first)
  const threadA = first.host.agentOf(a['sessionId'] as string)
  threadA.startTurn()
  const b = await startOne(first, { title: 'Queued task' })
  await tick(250)
  // Unload the plugin (the app keeps running) and load it again on the same host.
  first.host.dispose()
  first.host.listeners.clear()
  first.host.tools.length = 0
  const second = rig('restore-live', { dir: first.dir, host: first.host, config: { maxRunningThreads: 1 } })
  await second.service.ready
  const restoredA = second.service.listThreads().find(t => t.id === a['id'])!
  assert.equal(restoredA.status, 'running')
  const threadB = second.host.agentOf(b['sessionId'] as string)
  assert.equal(threadB.received.length, 0, 'still queued behind the running thread')
  threadA.endTurn('completed', 'Finished while reloaded.')
  await tick(30)
  assert.ok(wakes(first.coordinator).some(w => /Finished while reloaded/.test(textOf(w.message))))
  // H1: a brief re-queued across a reload is delivered as a coordinator notice, never as the user's prompt.
  assert.equal(threadB.received[0]?.how, 'followup', 'the queued brief went out once a slot was free')
  assert.equal(threadB.received[0]?.message.source.kind, 'agent-message')
  second.host.dispose()
})

test('restore: a turn that ended while the plugin was away is reported, and open approvals are recovered', async () => {
  const first = await withCoordinator('restore-cold')
  const a = await startOne(first)
  const b = await startOne(first, { title: 'Second task' })
  const threadA = first.host.agentOf(a['sessionId'] as string)
  const threadB = first.host.agentOf(b['sessionId'] as string)
  threadA.startTurn()
  threadB.startTurn()
  await tick(250)
  first.host.dispose()
  // While the plugin was away: A finished, B asked for an approval and still runs.
  threadA.endTurn('completed', 'Ended while away.')
  threadB.append('approval/asked', { id: 'ap', toolName: 'bash', reason: 'push' })
  first.host.listeners.clear()
  first.host.tools.length = 0
  first.host.sections.length = 0
  const second = rig('restore-cold', { dir: first.dir, host: first.host })
  await second.service.ready
  const byId = new Map(second.service.listThreads().map(t => [t.id, t]))
  assert.equal(byId.get(a['id'] as string)!.status, 'idle')
  assert.equal(byId.get(b['id'] as string)!.status, 'waiting-approval')
  await tick(30)
  assert.ok(wakes(first.coordinator).some(w => /Ended while away/.test(textOf(w.message))))
  second.host.dispose()
})

// --- 5. Gating and the coordinator session ----------------------------------------------------------------------------

test('tools are gated per session: coordinator tools only in the coordinator, thread tools only in thread leads', async () => {
  const r = await withCoordinator('gating')
  const a = await startOne(r)
  const coordinatorTools = r.host.toolsFor(r.coordinator.id)
  assert.ok(coordinatorTools.includes(TOOL.start))
  assert.ok(!coordinatorTools.includes(TOOL.report))
  const leadTools = r.host.toolsFor(a['sessionId'] as string)
  assert.ok(leadTools.includes(TOOL.report))
  assert.ok(!leadTools.includes(TOOL.start))
  // A subagent or team member of the lead is a different session: nothing.
  assert.deepEqual(r.host.toolsFor('session-subagent-of-lead'), [])
  assert.deepEqual(r.host.toolsFor('some-other-session'), [])
  // Prompt sections follow the same rule.
  const section = r.host.sections[0]!
  assert.match(section.text({ agent: { id: r.coordinator.id } }), /^COORD PROMPT\n\n## Permission mode\n/)
  assert.match(section.text({ agent: { id: a['sessionId'] as string } }), /^THREAD t-/)
  assert.equal(section.text({ agent: { id: 'session-subagent-of-lead' } }), '')
  r.host.dispose()
})

test('ensureCoordinator opens the last coordinator: one session for concurrent calls, and the same one again later', async () => {
  const r = rig('ensure')
  await r.service.ready
  const [x, y, z] = await Promise.all([r.service.ensureCoordinator(), r.service.ensureCoordinator(), r.service.ensureCoordinator()])
  assert.equal(x.sessionId, y.sessionId)
  assert.equal(y.sessionId, z.sessionId)
  assert.equal(x.coordinatorId, z.coordinatorId)
  assert.equal(r.host.creates, 1)
  assert.deepEqual(await r.service.ensureCoordinator(), x)
  assert.deepEqual(await r.service.ensureCoordinator({ coordinatorId: x.coordinatorId }), x)
  await assert.rejects(r.service.ensureCoordinator({ coordinatorId: 'c-ffff' }), /unknown coordinator/)
  assert.equal(r.host.creates, 1)
  r.host.dispose()
})

test('the opening turn listener only swallows its own message in the coordinator', async () => {
  const r = await withCoordinator('opening')
  const opening = r.coordinator.received.find(m => m.message.id.includes(':opening:'))!.message
  // Re-arm: a second seed would add a fresh id; simulate the pre-step for a user message instead.
  const user = { id: 'u1', role: 'user', content: [{ type: 'text', text: 'hi' }], source: { kind: 'user', rpcId: 'b1' } }
  const passed = await r.host.emit('agent/pre-step', { agent: r.coordinator, messages: [user], turn: 1, step: 1 }) as { fromDefault?: boolean }
  assert.equal(passed.fromDefault, true)
  const mixed = await r.host.emit('agent/pre-step', { agent: r.coordinator, messages: [opening, user], turn: 1, step: 1 }) as { fromDefault?: boolean }
  assert.equal(mixed.fromDefault, true, 'a user message in the same step is never swallowed')
  const other = await r.host.emit('agent/pre-step', { agent: { id: 'other' }, messages: [opening], turn: 1, step: 1 }) as { fromDefault?: boolean }
  assert.equal(other.fromDefault, true, 'other sessions are untouched')
  r.host.dispose()
})

test('archive refuses a working thread unless forced, and removes the thread\'s own workspace', async () => {
  const r = await withCoordinator('archive')
  const a = await startOne(r)
  const thread = r.host.agentOf(a['sessionId'] as string)
  thread.startTurn()
  const refused = await r.host.call(r.coordinator.id, 'thread_archive', { thread: a['id'] })
  assert.match(String(refused['error']), /only an idle, done, failed or stopped Executor Session/)
  assert.equal(r.host.archived.includes(thread.id), false)
  thread.endTurn('completed', 'ok')
  const done = await r.host.call(r.coordinator.id, 'thread_archive', { thread: a['id'] })
  assert.equal(done['archived'], a['id'])
  assert.equal(r.host.workspaces.some(w => w.path === a['cwd']), false)
  assert.ok(existsSync(a['cwd'] as string), 'the folder is kept')
  r.host.dispose()
})

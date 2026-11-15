/**
 * Nothing of the plugin's sits in a chat's queue for the next turn. dsh shows every message in an Agent's next-turn
 * list in the queue strip above the composer, whatever its source, with controls to edit, delete and send it, as if
 * the user had queued it. So notices that wake a coordinator wait in the plugin while its chat runs a turn, and
 * everything the plugin hands to a chat goes to the Agent's next-step list (`steer`, `inject`). The fake host keeps
 * `inbox.nextTurn` as dsh does: a `followup` to a running agent lands there.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import type { Notice, Timers } from '../src/host/notices.ts'
import { TOOL } from '../src/host/names.ts'
import { KEPT_NOTICES_MAX, WAITING_RECHECK_MS } from '../src/host/threads.ts'
import { FakeHost, quietOf, tick, wakesOf, withCoordinator, type FakeAgent } from './harness.ts'

const textOf = (m: { content: readonly { text: string }[] }) => m.content.map(c => c.text).join('\n')
type R = Awaited<ReturnType<typeof withCoordinator>>

/** A coordinator turn the user opens that starts one Executor Session and then ends, as a real turn does. */
async function start(r: R, title: string, coordinator: FakeAgent = r.coordinator) {
  r.host.userTurn(coordinator, `Please do: ${title}`)
  const started = await r.host.call(coordinator.id, TOOL.start, { title, assignment: `${title}.` })
  assert.equal(started['error'], undefined, String(started['error']))
  coordinator.endTurn()
  await tick(1)
  return { id: started['id'] as string, lead: r.host.agentOf(started['sessionId'] as string) }
}

/** A Lead's turn that ends with a result Report: one waking notice for its coordinator. */
async function finish(r: R, lead: FakeAgent, text: string) {
  lead.startTurn()
  await r.host.call(lead.id, TOOL.report, { kind: 'result', text })
  lead.endTurn('completed', `closing: ${text}`)
  await tick(40)
}

/** No agent of the host has anything queued for its next turn (what the queue strip would show). */
function nothingQueued(r: R): void {
  for (const agent of r.host.agentsById.values()) assert.deepEqual(agent.inbox.nextTurn.map(m => m.id), [], `nothing in the queue of ${agent.id}`)
}

/** A rig with a coordinator on a clock the test moves: `advance` runs the plugin's timers, `settle` lets a batch of notices go out. */
async function timed(name: string, options: Parameters<typeof withCoordinator>[1] = {}) {
  const host = new FakeHost()
  const list: { fn: () => void; at: number; done: boolean }[] = []
  const timers: Timers = {
    now: () => host.now,
    set: (fn, ms) => { const h = { fn, at: host.now + ms, done: false }; list.push(h); return h },
    clear: (h) => { if (h !== undefined) (h as { done: boolean }).done = true },
  }
  const advance = (ms: number): void => { host.now += ms; for (const h of [...list]) if (!h.done && h.at <= host.now) { h.done = true; h.fn() } }
  const settle = async (): Promise<void> => { for (let i = 0; i < 6; i++) { advance(20); await tick(2) } }
  const r = await withCoordinator(name, { ...options, host, deps: { now: () => host.now, timers } })
  /** A Lead's turn that ends with a result Report, on this clock. */
  const result = async (lead: FakeAgent, text: string): Promise<void> => {
    lead.startTurn()
    await r.host.call(lead.id, TOOL.report, { kind: 'result', text })
    lead.endTurn('completed', `closing: ${text}`)
    await settle()
  }
  return { r, advance, settle, result }
}

/** What the plugin wrote to its log while `run` ran. */
async function logged(run: () => Promise<void>): Promise<string[]> {
  const lines: string[] = []
  const info = console.info
  console.info = (...args: unknown[]) => { lines.push(args.join(' ')) }
  try { await run() } finally { console.info = info }
  return lines
}

test('T1: a notice for a coordinator that runs a turn waits in the plugin and goes out when the turn ends; nothing is queued in the chat', async () => {
  const r = await withCoordinator('queue-busy')
  const a = await start(r, 'Write the parser')
  // The user opens a turn; while it runs, the Executor Session reports its result.
  r.host.userTurn(r.coordinator, 'How is it going?')
  const before = r.coordinator.received.length
  await finish(r, a.lead, 'parser written')
  assert.equal(r.coordinator.received.length, before, 'nothing is handed to the chat while its turn runs')
  nothingQueued(r)
  // Still waiting after another look (the page's poll), as long as the turn runs.
  r.service.getState()
  await tick(5)
  assert.equal(r.coordinator.received.length, before)
  // The turn ends: one message for the executor, as a steer that starts the next turn, never as a queued followup.
  r.coordinator.endTurn('completed', 'It is still working.')
  await tick(5)
  const wakes = wakesOf(r.coordinator)
  assert.equal(wakes.length, 1)
  assert.deepEqual([wakes[0]!.how, wakes[0]!.message.source.kind, wakes[0]!.message.source['senderSessionId']], ['steer', 'agent-message', a.lead.id])
  assert.match(textOf(wakes[0]!.message), new RegExp(`^\\[dsh-coordinator notice\\] Executor Session ${a.id} reported a result\\.`))
  assert.match(textOf(wakes[0]!.message), /report \(result\): parser written/)
  nothingQueued(r)
  // Delivered once: another idle event or poll sends nothing more.
  r.coordinator.startTurn()
  r.coordinator.endTurn()
  r.service.getState()
  await tick(5)
  assert.equal(wakesOf(r.coordinator).length, 1)
  assert.equal(r.service.listThreads()[0]!.action, undefined, 'the wake was counted once; nothing is paused')
  r.host.dispose()
})

test('T1: waiting notices keep their order and go out as one batch that opens one turn; quiet ones wait behind a waking one', async () => {
  const r = await withCoordinator('queue-order')
  const a = await start(r, 'Task A')
  const b = await start(r, 'Task B')
  r.host.userTurn(r.coordinator, 'Anything new?')
  // Quiet progress alone joins the running turn at once, as before (dsh does not show the next-step list).
  a.lead.startTurn()
  await r.host.call(a.lead.id, TOOL.report, { kind: 'progress', text: 'A is halfway' })
  await tick(40)
  assert.equal(quietOf(r.coordinator).length, 1)
  assert.match(textOf(quietOf(r.coordinator)[0]!.message), /A is halfway/)
  const before = r.coordinator.received.length
  // A's result wakes: it waits. B's quiet progress after it waits behind it, and so does B's result.
  await r.host.call(a.lead.id, TOOL.report, { kind: 'result', text: 'A done' })
  a.lead.endTurn('completed', 'A closing')
  await tick(40)
  b.lead.startTurn()
  await r.host.call(b.lead.id, TOOL.report, { kind: 'progress', text: 'B is halfway' })
  await tick(40)
  await r.host.call(b.lead.id, TOOL.report, { kind: 'result', text: 'B done' })
  b.lead.endTurn('completed', 'B closing')
  await tick(40)
  assert.equal(r.coordinator.received.length, before, 'all of it waits')
  nothingQueued(r)
  r.coordinator.endTurn()
  await tick(5)
  // One burst: A's message is added, B's starts the turn, which admits both in this order.
  const sent = r.coordinator.received.slice(before)
  assert.deepEqual(sent.map(m => [m.how, m.wake, m.message.source['senderSessionId']]), [['inject', true, a.lead.id], ['steer', true, b.lead.id]])
  assert.match(textOf(sent[0]!.message), /report \(result\): A done/)
  assert.match(textOf(sent[1]!.message), /report \(progress\): B is halfway[\s\S]*report \(result\): B done/)
  const logged = r.coordinator.log.filter(e => e.type === 'user/message').slice(-2).map(e => (e.data as { id: string }).id)
  assert.deepEqual(logged, sent.map(m => m.message.id), 'logged in the order dsh admits them')
  nothingQueued(r)
  r.host.dispose()
})

test('T1: notices delivered at the start of a turn count as Executor Session data for that turn; the user\'s next turn has their authority again', async () => {
  const r = await withCoordinator('queue-authority')
  const a = await start(r, 'First task')
  assert.equal(a.lead.received[0]!.how, 'prompt', 'started in a turn the user opened: the user\'s prompt')
  r.host.userTurn(r.coordinator, 'Wait for it.')
  await finish(r, a.lead, 'first done')
  r.coordinator.endTurn()
  await tick(5)
  const notice = wakesOf(r.coordinator).at(-1)!
  // The turn the notice opens, as dsh logs it: the claimed message in step 1.
  r.coordinator.status = 'running'
  r.coordinator.append('turn/start', { turn: 2 })
  r.coordinator.append('step/start', { turn: 2, step: 1 })
  r.coordinator.append('user/message', notice.message)
  const second = await r.host.call(r.coordinator.id, TOOL.start, { title: 'Follow-up task', assignment: 'Do the follow-up.' })
  assert.match(JSON.stringify(second['notes']), /recorded as a coordinator notice/)
  const followUp = r.host.agentOf(second['sessionId'] as string).received[0]!
  assert.deepEqual([followUp.how, followUp.message.source.kind], ['steer', 'agent-message'], 'an Assignment written after the notice is a notice, not the user\'s prompt')
  r.coordinator.endTurn()
  // A turn the user opens afterwards is theirs.
  const third = await start(r, 'Third task')
  assert.deepEqual([third.lead.received[0]!.how, third.lead.received[0]!.message.source.kind], ['prompt', 'user'])
  nothingQueued(r)
  r.host.dispose()
})

test('T1: a message the user queues while notices wait runs first and keeps the user\'s authority; the notices follow when the chat is idle', async () => {
  const r = await withCoordinator('queue-user-first')
  const a = await start(r, 'Long task')
  r.host.userTurn(r.coordinator, 'Tell me a joke.')
  await finish(r, a.lead, 'long task done')
  // The user types while the turn runs: dsh queues their message (the queue strip shows it, and only it).
  const typed = r.coordinator.queueUserMessage('Now start the docs task.')
  assert.deepEqual(r.coordinator.inbox.nextTurn.map(m => m.id), [typed.id])
  const before = r.coordinator.received.length
  // dsh opens the user's queued turn without going idle in between: the notices still wait and are not part of it.
  assert.equal(r.coordinator.nextQueuedTurn(), typed)
  await tick(5)
  assert.equal(r.coordinator.received.length, before)
  const docs = await r.host.call(r.coordinator.id, TOOL.start, { title: 'Docs task', assignment: 'Write the docs.' })
  assert.equal(docs['notes'] === undefined || !/coordinator notice/.test(JSON.stringify(docs['notes'])), true, 'the user\'s turn saw no notice')
  assert.deepEqual([r.host.agentOf(docs['sessionId'] as string).received[0]!.how, r.host.agentOf(docs['sessionId'] as string).received[0]!.message.source.kind], ['prompt', 'user'])
  r.coordinator.endTurn()
  await tick(5)
  assert.equal(wakesOf(r.coordinator).length, 1, 'delivered once the chat is idle')
  assert.match(textOf(wakesOf(r.coordinator)[0]!.message), /long task done/)

  // An idle chat with messages the user parked in its queue (after a Stop) counts as running: the plugin neither
  // starts them nor joins them. It looks again after a while, and delivers once they are gone.
  const host2 = new FakeHost()
  const list: { fn: () => void; at: number; done: boolean }[] = []
  const timers: Timers = {
    now: () => host2.now,
    set: (fn, ms) => { const h = { fn, at: host2.now + ms, done: false }; list.push(h); return h },
    clear: (h) => { if (h !== undefined) (h as { done: boolean }).done = true },
  }
  const advance = (ms: number): void => { host2.now += ms; for (const h of [...list]) if (!h.done && h.at <= host2.now) { h.done = true; h.fn() } }
  const p = await withCoordinator('queue-parked', { host: host2, deps: { now: () => host2.now, timers } })
  const b = await start(p, 'Parked case')
  const parked = p.coordinator.queueUserMessage('parked by the user')
  const count = p.coordinator.received.length
  b.lead.startTurn()
  await p.host.call(b.lead.id, TOOL.report, { kind: 'result', text: 'parked case done' })
  b.lead.endTurn('completed', 'closing')
  for (let i = 0; i < 6; i++) { advance(20); await tick(2) }
  assert.deepEqual([p.coordinator.received.length, p.coordinator.inbox.nextTurn.map(m => m.id)], [count, [parked.id]], 'the user\'s queue is untouched and nothing was started')
  // The user deletes the parked message (no event reaches the plugin): the next look delivers.
  p.coordinator.inbox.nextTurn.length = 0
  advance(WAITING_RECHECK_MS)
  await tick(5)
  assert.equal(wakesOf(p.coordinator).length, 1)
  assert.match(textOf(wakesOf(p.coordinator)[0]!.message), /parked case done/)
  nothingQueued(p)
  r.host.dispose()
  p.host.dispose()
})

test('Q1: notices that waited through a turn the user stopped, or one that failed, stay in the plugin; the user\'s next request runs without them, with the user\'s authority, and they open a turn of their own once a turn has ended normally', async () => {
  for (const kind of ['aborted', 'error'] as const) {
    const { r, advance, result } = await timed(`queue-stop-${kind}`)
    const a = await start(r, 'Task A')
    r.host.userTurn(r.coordinator, 'Think about something long.')
    await result(a.lead, 'A done')
    const before = r.coordinator.received.length
    // The user presses Stop (or the turn fails): dsh runs no queued input after such a turn, and the plugin neither
    // starts a turn for the waiting notice nor adds it to the chat.
    if (kind === 'aborted') r.coordinator.cancel({ kind: 'user' })
    else r.coordinator.endTurn('error')
    await tick(5)
    // Not at the page's poll and not when the plugin looks again either, however long the user stays away.
    r.service.getState()
    for (let i = 0; i < 3; i++) { advance(WAITING_RECHECK_MS); await tick(2) }
    assert.equal(r.coordinator.received.length, before, `${kind}: nothing is handed to the chat`)
    assert.equal(r.coordinator.pendingInjects.length, 0, 'and nothing waits in its next-step list for the user\'s next request')
    nothingQueued(r)
    // The page and the pane still show what the executor did: its row does not depend on the notice.
    const row = r.service.getState().threads.find(t => t.id === a.id)!
    assert.deepEqual([row.status, row.lastReport?.kind, row.lastReport?.text], ['done', 'result', 'A done'])
    // The user's correction: its turn holds no notice, so the Assignment written in it is the user's prompt.
    r.host.userTurn(r.coordinator, 'No. Start an executor for the docs instead.')
    const docs = await r.host.call(r.coordinator.id, TOOL.start, { title: 'Docs task', assignment: 'Write the docs.' })
    assert.equal(docs['error'], undefined, String(docs['error']))
    assert.doesNotMatch(JSON.stringify(docs['notes'] ?? ''), /coordinator notice|already in this turn/)
    const docsLead = r.host.agentOf(docs['sessionId'] as string)
    assert.deepEqual([docsLead.received[0]!.how, docsLead.received[0]!.message.source.kind], ['prompt', 'user'], 'the request kept the user\'s authority')
    assert.equal(r.coordinator.received.length, before, 'the notice is not part of the user\'s turn')
    if (kind === 'aborted') {
      // Stopped again: the notice keeps waiting.
      r.coordinator.cancel({ kind: 'user' })
      await tick(5)
      assert.equal(r.coordinator.received.length, before)
      r.host.userTurn(r.coordinator, 'Fine, go on.')
    }
    // A turn of the chat ends normally: now the notice opens a turn of its own.
    r.coordinator.endTurn('completed', 'Started the docs task.')
    await tick(5)
    const sent = r.coordinator.received.slice(before)
    assert.deepEqual(sent.map(m => [m.how, m.wake, m.message.source['senderSessionId']]), [['steer', true, a.lead.id]])
    assert.match(textOf(sent[0]!.message), /reported a result\. Act on it if needed[\s\S]*A done/)
    nothingQueued(r)
    r.host.dispose()
  }
})

test('Q1/Q2: a notice that arrives after a stopped turn wakes the chat as usual and takes the blocked ones along, in order; quiet ones wait behind them', async () => {
  const { r, settle, result } = await timed('queue-stop-new')
  const a = await start(r, 'Task A')
  const b = await start(r, 'Task B')
  r.host.userTurn(r.coordinator, 'Think about something long.')
  await result(a.lead, 'A done')
  r.coordinator.cancel({ kind: 'user' })
  await tick(5)
  const before = r.coordinator.received.length
  // Quiet progress after the stop is not added to the idle chat ahead of the blocked notice: it waits behind it.
  b.lead.startTurn()
  await r.host.call(b.lead.id, TOOL.report, { kind: 'progress', text: 'B is halfway' })
  await settle()
  assert.equal(r.coordinator.received.length, before)
  // B's result is new: it wakes, and everything that waited goes out with it in one turn.
  await r.host.call(b.lead.id, TOOL.report, { kind: 'result', text: 'B done' })
  b.lead.endTurn('completed', 'B closing')
  await settle()
  const sent = r.coordinator.received.slice(before)
  assert.deepEqual(sent.map(m => [m.how, m.wake, m.message.source['senderSessionId']]), [['inject', true, a.lead.id], ['steer', true, b.lead.id]])
  assert.match(textOf(sent[0]!.message), /report \(result\): A done/)
  assert.match(textOf(sent[1]!.message), /report \(progress\): B is halfway[\s\S]*report \(result\): B done/)
  nothingQueued(r)
  r.host.dispose()
})

test('R9: a result still in the batch window when the user stops the turn counts as one that waited through it; a turn that ends normally before the batch goes out makes it new again', async () => {
  const { r, advance, settle } = await timed('queue-stop-window')
  const a = await start(r, 'Task A')
  r.host.userTurn(r.coordinator, 'Think about something long.')
  // The Lead reports and ends its turn; a moment later, before the batch of its notices goes out, the user presses Stop.
  a.lead.startTurn()
  await r.host.call(a.lead.id, TOOL.report, { kind: 'result', text: 'A done' })
  a.lead.endTurn('completed', 'closing')
  const before = r.coordinator.received.length
  r.coordinator.cancel({ kind: 'user' })
  await settle()
  // The batch went out to an idle chat, and still nothing starts it again or is added to it.
  r.service.getState()
  for (let i = 0; i < 3; i++) { advance(WAITING_RECHECK_MS); await tick(2) }
  assert.equal(r.coordinator.received.length, before, 'the chat is not started again right after the Stop')
  assert.equal(r.coordinator.pendingInjects.length, 0)
  nothingQueued(r)
  // The user's next request runs without the notice and keeps the user's authority.
  r.host.userTurn(r.coordinator, 'No. Start an executor for the docs instead.')
  const docs = await r.host.call(r.coordinator.id, TOOL.start, { title: 'Docs task', assignment: 'Write the docs.' })
  assert.doesNotMatch(JSON.stringify(docs['notes'] ?? ''), /coordinator notice|already in this turn/)
  const docsLead = r.host.agentOf(docs['sessionId'] as string)
  assert.deepEqual([docsLead.received[0]!.how, docsLead.received[0]!.message.source.kind], ['prompt', 'user'])
  // That turn ends normally: the notice opens a turn of its own, as a blocked one does.
  r.coordinator.endTurn('completed', 'Started the docs task.')
  await tick(5)
  const sent = r.coordinator.received.slice(before)
  assert.deepEqual(sent.map(m => [m.how, m.wake, m.message.source['senderSessionId']]), [['steer', true, a.lead.id]])
  assert.match(textOf(sent[0]!.message), /report \(result\): A done/)

  // Stopped while B's result is in the batch window, but the user's next turn ends normally before the batch goes
  // out: nothing is blocked any more, so the result wakes the idle chat as a new notice does.
  r.coordinator.endTurn()
  const b = await start(r, 'Task B')
  r.host.userTurn(r.coordinator, 'Think again.')
  b.lead.startTurn()
  await r.host.call(b.lead.id, TOOL.report, { kind: 'result', text: 'B done' })
  b.lead.endTurn('completed', 'closing')
  const count = r.coordinator.received.length
  r.coordinator.cancel({ kind: 'user' })
  r.host.userTurn(r.coordinator, 'Just say hello.')
  r.coordinator.endTurn('completed', 'Hello.')
  await settle()
  const woke = r.coordinator.received.slice(count)
  assert.deepEqual(woke.map(m => [m.how, m.wake, m.message.source['senderSessionId']]), [['steer', true, b.lead.id]])
  assert.match(textOf(woke[0]!.message), /report \(result\): B done/)
  nothingQueued(r)
  r.host.dispose()
})

test('Q1: notices blocked behind a stopped turn survive a chat that is archived and an unload', async () => {
  // Archived: they join the held notices at once (no poll and no new notice comes by) and reach the reopened chat.
  const r = await withCoordinator('queue-stop-archive')
  const a = await start(r, 'Task A')
  r.host.userTurn(r.coordinator, 'Hold on.')
  await finish(r, a.lead, 'done before the stop')
  r.coordinator.cancel({ kind: 'user' })
  await tick(5)
  const before = r.coordinator.received.length
  await (r.host.ctx['workspaceRegistry'] as { archiveSession: (id: string, o?: unknown) => Promise<void> }).archiveSession(r.coordinator.id, { stopActivity: true })
  const reopened = await r.service.ensureCoordinator({ coordinatorId: r.coordinatorId })
  await tick(10)
  assert.equal(r.coordinator.received.length, before, 'nothing goes to the archived chat')
  assert.match(r.host.agentOf(reopened.sessionId).received.map(m => textOf(m.message)).join('\n'), /done before the stop/)
  r.host.dispose()

  // Unload: handed to the chat's next-step list without waking it, as every waiting notice is.
  const u = await withCoordinator('queue-stop-unload')
  const c = await start(u, 'Task C')
  u.host.userTurn(u.coordinator, 'Hold on.')
  await finish(u, c.lead, 'done before the stop and the unload')
  u.coordinator.cancel({ kind: 'user' })
  await tick(5)
  const count = u.coordinator.received.length
  u.host.dispose()
  const handed = u.coordinator.received.slice(count)
  assert.deepEqual(handed.map(x => [x.how, x.wake === true]), [['inject', false]])
  assert.match(textOf(handed[0]!.message), /done before the stop and the unload/)
})

test('Q2: a result that arrives after a stopped turn, while a message the user parked blocks the chat, wakes once that message is gone', async () => {
  const { r, advance, result } = await timed('queue-stop-later')
  const a = await start(r, 'Task A')
  // The user typed during the turn and then pressed Stop: dsh parks their message, and nothing of the plugin's waited.
  r.host.userTurn(r.coordinator, 'Think about something long.')
  const parked = r.coordinator.queueUserMessage('parked by the user')
  r.coordinator.cancel({ kind: 'user' })
  await tick(5)
  const before = r.coordinator.received.length
  // Minutes later the executor reports: the chat counts as running, so the notice waits.
  advance(5 * 60_000)
  await result(a.lead, 'A done')
  assert.deepEqual([r.coordinator.received.length, r.coordinator.inbox.nextTurn.map(m => m.id)], [before, [parked.id]])
  // The user deletes the parked message. The notice did not wait through the stopped turn, so it wakes.
  r.coordinator.inbox.nextTurn.length = 0
  advance(WAITING_RECHECK_MS)
  await tick(5)
  const sent = r.coordinator.received.slice(before)
  assert.deepEqual(sent.map(m => [m.how, m.wake]), [['steer', true]])
  assert.match(textOf(sent[0]!.message), /A done/)
  nothingQueued(r)
  r.host.dispose()
})

test('Q3: steering the user parked in the chat\'s next-step list blocks a waking notice like a parked message: the plugin does not send it for them', async () => {
  const { r, advance, result } = await timed('queue-parked-steer')
  const a = await start(r, 'Task A')
  // The user steered a queued message and stopped the turn before its next step: dsh keeps it as pending steering.
  r.host.userTurn(r.coordinator, 'Think about something long.')
  r.coordinator.cancel({ kind: 'user' })
  const parked = r.coordinator.parkUserSteer('and use pnpm')
  await tick(5)
  const before = r.coordinator.received.length
  await result(a.lead, 'A done')
  r.service.getState()
  for (let i = 0; i < 3; i++) { advance(WAITING_RECHECK_MS); await tick(2) }
  assert.deepEqual([r.coordinator.received.length, r.coordinator.inbox.nextStep.map(m => m.id)], [before, [parked.id]], 'no turn was started on top of the user\'s steering')
  // The user removes it: the next look delivers, with a turn of its own.
  r.coordinator.inbox.nextStep.length = 0
  advance(WAITING_RECHECK_MS)
  await tick(5)
  const sent = r.coordinator.received.slice(before)
  assert.deepEqual(sent.map(m => [m.how, m.wake]), [['steer', true]])
  assert.match(textOf(sent[0]!.message), /A done/)
  nothingQueued(r)
  r.host.dispose()
})

test('Q4: a due look-in waits without reading the Lead\'s log while input the user parked blocks the coordinator\'s chat', async () => {
  const { r, advance, settle } = await timed('queue-lookin-parked')
  const a = await start(r, 'Watched task')
  a.lead.startTurn()
  r.host.userTurn(r.coordinator, 'Look in on it in five minutes.')
  assert.equal((await r.host.call(r.coordinator.id, TOOL.checkLater, { executor: a.id, minutes: 5 }))['error'], undefined)
  const parked = r.coordinator.queueUserMessage('parked by the user')
  r.coordinator.cancel({ kind: 'user' })
  await tick(2)
  const before = r.coordinator.received.length
  let reads = 0
  const query = r.host.ctx['sessionQuery'] as { readSession: (id: string) => Promise<unknown> }
  const read = query.readSession
  query.readSession = async (id: string) => { if (id === a.lead.id) reads++; return read(id) }
  // The look-in comes due and is asked again every 30 seconds: the Lead's log is not read and nothing is sent.
  advance(5 * 60_000)
  await tick(5)
  for (let i = 0; i < 6; i++) { advance(30_000); await tick(5) }
  assert.deepEqual([reads, r.coordinator.received.length, r.coordinator.inbox.nextTurn.map(m => m.id)], [0, before, [parked.id]])
  // The same while steering of the user is parked in the next-step list.
  r.coordinator.inbox.nextTurn.length = 0
  r.coordinator.parkUserSteer('and use pnpm')
  for (let i = 0; i < 6; i++) { advance(30_000); await tick(5) }
  assert.deepEqual([reads, r.coordinator.received.length], [0, before])
  // The chat is free again: the look-in reads the log once and goes out.
  r.coordinator.inbox.nextStep.length = 0
  advance(30_000)
  await tick(5)
  await settle()
  const sent = r.coordinator.received.slice(before)
  assert.equal(reads, 1)
  assert.deepEqual(sent.map(m => [m.how, m.wake, m.message.source['form']]), [['steer', true, 'notice']])
  assert.match(textOf(sent[0]!.message), /Look-in you scheduled/)
  query.readSession = read
  nothingQueued(r)
  r.host.dispose()
})

test('Q6: waiting notices that join the held ones are not cut on the way, and a drop past the bound is logged with its count', async () => {
  const r = await withCoordinator('queue-cap')
  const a = await start(r, 'Task A')
  const deliverTo = (notices: Notice[]) => (r.service as unknown as { deliverTo(id: string, notices: Notice[]): Promise<void> }).deliverTo(r.coordinatorId, notices)
  // Plugin lines (`alert`) as stand-ins: w<i> wakes, q<i> is quiet.
  const notice = (i: number): Notice => ({ threadId: a.id, coordinatorId: r.coordinatorId, title: 'Task A', at: r.host.now + i, wake: i % 2 === 0, alert: `${i % 2 === 0 ? 'w' : 'q'}${i}.` })
  r.host.userTurn(r.coordinator, 'A long turn.')
  const over = 30
  const lines = await logged(async () => {
    for (let i = 0; i < KEPT_NOTICES_MAX + over; i += 10) await deliverTo(Array.from({ length: 10 }, (_, k) => notice(i + k)))
  })
  // Past the bound the oldest quiet ones went, and the log says how many.
  const dropped = lines.filter(line => /dropped \d+ notices of coordinator/.test(line)).map(line => Number(/dropped (\d+) notices/.exec(line)![1]))
  assert.equal(dropped.reduce((sum, n) => sum + n, 0), over, lines.filter(line => line.includes('dropped')).join('\n'))
  // The chat is archived while they wait: all of them are held (the held list has the same bound), none is cut.
  const moved = await logged(async () => {
    await (r.host.ctx['workspaceRegistry'] as { archiveSession: (id: string, o?: unknown) => Promise<void> }).archiveSession(r.coordinator.id, { stopActivity: true })
  })
  assert.equal(moved.some(line => line.includes('dropped')), false)
  const reopened = await r.service.ensureCoordinator({ coordinatorId: r.coordinatorId })
  await tick(10)
  const text = r.host.agentOf(reopened.sessionId).received.map(m => textOf(m.message)).join('\n')
  const kept = (text.match(/\b[wq]\d+\./g) ?? []).map(x => x.slice(0, -1))
  assert.equal(kept.length, KEPT_NOTICES_MAX)
  assert.equal(kept.filter(x => x.startsWith('w')).length, (KEPT_NOTICES_MAX + over) / 2, 'every waking notice is kept')
  assert.deepEqual([kept[0], kept[1], kept.at(-1)], ['w0', 'w2', `q${KEPT_NOTICES_MAX + over - 1}`], 'in order; the oldest quiet ones are the ones that went')
  assert.equal(kept.includes('q1') || kept.includes(`q${2 * over - 1}`), false)
  assert.equal(kept.includes(`q${2 * over + 1}`), true)
  r.host.dispose()
})

test('Q6: a delivery that fails does not lose the notices it took: what did not reach the chat goes back in order and is tried again', async () => {
  const { r, advance, result } = await timed('queue-retry')
  const a = await start(r, 'Task A')
  const b = await start(r, 'Task B')
  r.host.userTurn(r.coordinator, 'A long turn.')
  await result(a.lead, 'A done')
  await result(b.lead, 'B done')
  const before = r.coordinator.received.length
  // The first hand-over fails before anything reached the chat.
  const inject = r.coordinator.inject.bind(r.coordinator)
  let failInject = 1
  r.coordinator.inject = (message) => { if (failInject-- > 0) throw new Error('inbox not writable'); inject(message) }
  const lines = await logged(async () => { r.coordinator.endTurn(); await tick(5) })
  assert.equal(r.coordinator.received.length, before)
  assert.equal(lines.some(line => /could not deliver notices to coordinator .*inbox not writable; \d+ notices wait and are tried again/.test(line)), true, lines.join('\n'))
  // The plugin looks again: both go out, in their order, in one turn.
  advance(WAITING_RECHECK_MS)
  await tick(5)
  let sent = r.coordinator.received.slice(before)
  assert.deepEqual(sent.map(m => [m.how, m.wake, m.message.source['senderSessionId']]), [['inject', true, a.lead.id], ['steer', true, b.lead.id]])
  r.coordinator.inject = inject

  // A hand-over that fails halfway: A's message is in the chat, B's goes back and is the one that is tried again.
  r.host.userTurn(r.coordinator, 'Another long turn.')
  await result(a.lead, 'A again')
  await result(b.lead, 'B again')
  const mark = r.coordinator.received.length
  const steer = r.coordinator.steer.bind(r.coordinator)
  let failSteer = 1
  r.coordinator.steer = (message) => { if (failSteer-- > 0) throw new Error('driver gone'); steer(message) }
  r.coordinator.endTurn()
  await tick(5)
  sent = r.coordinator.received.slice(mark)
  assert.deepEqual(sent.map(m => [m.how, m.message.source['senderSessionId']]), [['inject', a.lead.id]])
  advance(WAITING_RECHECK_MS)
  await tick(5)
  sent = r.coordinator.received.slice(mark)
  assert.deepEqual(sent.map(m => [m.how, m.message.source['senderSessionId']]), [['inject', a.lead.id], ['steer', b.lead.id]], 'A is not sent twice')
  assert.match(textOf(sent[1]!.message), /B again/)

  // A delivery that keeps failing ends after a few tries, with a log line that names the count.
  r.host.userTurn(r.coordinator, 'A third long turn.')
  await result(a.lead, 'A a third time')
  failSteer = Number.MAX_SAFE_INTEGER
  const tries = await logged(async () => {
    r.coordinator.endTurn()
    await tick(5)
    for (let i = 0; i < 8; i++) { advance(WAITING_RECHECK_MS); await tick(5) }
  })
  assert.equal(tries.filter(line => line.includes('could not deliver notices')).length, 6, tries.join('\n'))
  assert.match(tries.filter(line => line.includes('could not deliver notices')).at(-1)!, /driver gone; dropped \d+ notices after 6 failed deliveries/)
  r.coordinator.steer = steer
  nothingQueued(r)
  r.host.dispose()
})

test('T1: a status notice that waited and no longer holds is dropped; one that still holds goes out', async () => {
  const r = await withCoordinator('queue-stale')
  const a = await start(r, 'Task A')
  r.host.userTurn(r.coordinator, 'Check on it.')
  // The executor's turn ends (a waking idle notice waits), then the coordinator messages it in the same turn and it
  // runs again: the idle notice is no longer true when the coordinator's turn ends.
  a.lead.startTurn()
  a.lead.endTurn('completed', 'first part')
  await tick(40)
  await r.host.call(r.coordinator.id, TOOL.message, { executor: a.id, text: 'Also do the second part.' })
  await tick(2)
  a.lead.startTurn()
  const before = r.coordinator.received.length
  r.coordinator.endTurn()
  await tick(5)
  assert.equal(r.coordinator.received.length, before, 'the stale idle notice is not sent')
  // Its next end is reported as usual.
  a.lead.endTurn('completed', 'second part')
  await tick(40)
  assert.equal(wakesOf(r.coordinator).length, 1)
  assert.match(textOf(wakesOf(r.coordinator)[0]!.message), /second part/)
  r.host.dispose()
})

test('T1: waiting notices survive a chat that is archived meanwhile, a missed idle event and an unload', async () => {
  // Archived while notices wait: they join the notices held for the chat and are handed over on Reopen.
  const r = await withCoordinator('queue-archive')
  const a = await start(r, 'Task A')
  r.host.userTurn(r.coordinator, 'Hold on.')
  await finish(r, a.lead, 'done before the chat went away')
  const before = r.coordinator.received.length
  await (r.host.ctx['workspaceRegistry'] as { archiveSession: (id: string, o?: unknown) => Promise<void> }).archiveSession(r.coordinator.id, { stopActivity: true })
  r.service.getState()
  await tick(5)
  assert.equal(r.coordinator.received.length, before, 'nothing goes to the archived chat')
  const reopened = await r.service.ensureCoordinator({ coordinatorId: r.coordinatorId })
  await tick(10)
  const chat = r.host.agentOf(reopened.sessionId)
  assert.match(chat.received.map(m => textOf(m.message)).join('\n'), /done before the chat went away/)
  nothingQueued(r)
  r.host.dispose()

  // The idle event is missed (the Agent was replaced): the plugin looks again after a while.
  const host = new FakeHost()
  const list: { fn: () => void; at: number; done: boolean }[] = []
  const timers: Timers = {
    now: () => host.now,
    set: (fn, ms) => { const h = { fn, at: host.now + ms, done: false }; list.push(h); return h },
    clear: (h) => { if (h !== undefined) (h as { done: boolean }).done = true },
  }
  const advance = (ms: number): void => { host.now += ms; for (const h of [...list]) if (!h.done && h.at <= host.now) { h.done = true; h.fn() } }
  const m = await withCoordinator('queue-missed', { host, deps: { now: () => host.now, timers } })
  const b = await start(m, 'Task B')
  m.host.userTurn(m.coordinator, 'Hold on.')
  b.lead.startTurn()
  await m.host.call(b.lead.id, TOOL.report, { kind: 'result', text: 'done while busy' })
  b.lead.endTurn('completed', 'closing')
  for (let i = 0; i < 6; i++) { advance(20); await tick(2) }
  assert.equal(wakesOf(m.coordinator).length, 0)
  m.coordinator.append('turn/end', { reason: { kind: 'completed' } })
  m.coordinator.status = 'idle'
  advance(WAITING_RECHECK_MS)
  await tick(5)
  assert.equal(wakesOf(m.coordinator).length, 1)
  assert.match(textOf(wakesOf(m.coordinator)[0]!.message), /done while busy/)
  m.host.dispose()

  // Unload while notices wait: they are added to the chat's next-step list, which is in the Session log.
  const u = await withCoordinator('queue-unload')
  const c = await start(u, 'Task C')
  u.host.userTurn(u.coordinator, 'Hold on.')
  await finish(u, c.lead, 'done before the unload')
  const count = u.coordinator.received.length
  u.host.dispose()
  const handed = u.coordinator.received.slice(count)
  assert.deepEqual(handed.map(x => [x.how, x.wake === true]), [['inject', false]])
  assert.match(textOf(handed[0]!.message), /done before the unload/)
  nothingQueued(u)
})

test('T1: a look-in is not held with the waiting notices; it goes back to its timer when the chat started a turn meanwhile', async () => {
  const host = new FakeHost()
  const list: { fn: () => void; at: number; done: boolean }[] = []
  const timers: Timers = {
    now: () => host.now,
    set: (fn, ms) => { const h = { fn, at: host.now + ms, done: false }; list.push(h); return h },
    clear: (h) => { if (h !== undefined) (h as { done: boolean }).done = true },
  }
  const advance = (ms: number): void => { host.now += ms; for (const h of [...list]) if (!h.done && h.at <= host.now) { h.done = true; h.fn() } }
  const r = await withCoordinator('queue-lookin', { host, deps: { now: () => host.now, timers } })
  const a = await start(r, 'Watched task')
  a.lead.startTurn()
  r.host.userTurn(r.coordinator, 'Look in on it in five minutes.')
  assert.equal((await r.host.call(r.coordinator.id, TOOL.checkLater, { executor: a.id, minutes: 5 }))['error'], undefined)
  r.coordinator.endTurn()
  await tick(2)
  const before = r.coordinator.received.length
  // The look-in comes due while the chat is idle and enters the batch; the chat starts a turn before the delivery
  // reaches it (here: while the delivery waits for the chat's Agent).
  const controller = r.host.ctx['sessionController'] as { resolveAgent: (id: string) => Promise<unknown> }
  const resolve = controller.resolveAgent
  controller.resolveAgent = async (id: string) => {
    if (id === r.coordinator.id) r.coordinator.status = 'running'
    return resolve(id)
  }
  advance(5 * 60_000)
  await tick(5)
  for (let i = 0; i < 4; i++) { advance(20); await tick(2) }
  controller.resolveAgent = resolve
  assert.equal(r.coordinator.received.length, before, 'not sent into the running turn')
  nothingQueued(r)
  // It is not among the waiting notices: the end of the turn alone sends nothing.
  r.coordinator.endTurn()
  await tick(5)
  assert.equal(r.coordinator.received.length, before)
  // Its timer brings it back with fresh content.
  advance(30_000)
  await tick(5)
  for (let i = 0; i < 4; i++) { advance(20); await tick(2) }
  const sent = r.coordinator.received.slice(before)
  assert.deepEqual(sent.map(m => [m.how, m.wake, m.message.source.kind, m.message.source['form']]), [['steer', true, 'dsh-coordinator', 'notice']])
  assert.match(textOf(sent[0]!.message), /Look-in you scheduled/)
  nothingQueued(r)
  r.host.dispose()
})

test('T1: what the plugin sends into an Executor Session never sits in its queue either: Assignments, coordinator messages, peer messages, pause and resume', async () => {
  const r = await withCoordinator('queue-executors', { config: { maxRunningThreads: 2 } })
  const a = await start(r, 'Task A')
  const b = await start(r, 'Task B')
  // An Assignment with the user's authority is the user's prompt, to a Lead that never ran: dsh opens its turn with it.
  assert.deepEqual([a.lead.received[0]!.how, a.lead.received[0]!.message.source.kind], ['prompt', 'user'])
  // A coordinator message to an idle Lead starts a turn; to a running Lead it joins the turn at its next step.
  r.host.userTurn(r.coordinator, 'Remind them.')
  const told = await r.host.call(r.coordinator.id, TOOL.message, { executor: a.id, text: 'Use pnpm.' })
  await tick(2)
  assert.deepEqual([a.lead.received.at(-1)!.how, a.lead.received.at(-1)!.wake], ['steer', true])
  // The tool result names what happens, not a dsh queue the message is no longer in.
  assert.equal(told['delivery'], 'started: the Executor Session was idle and starts a turn with the message')
  a.lead.startTurn()
  await r.host.call(r.coordinator.id, TOOL.message, { executor: a.id, text: 'And no npm.' })
  assert.deepEqual([a.lead.received.at(-1)!.how, a.lead.received.at(-1)!.wake === true], ['steer', false])
  r.coordinator.endTurn()
  // A peer message into a busy Executor Session joins its turn; into an idle one it starts a turn.
  b.lead.startTurn()
  await r.host.call(b.lead.id, TOOL.send, { executor: a.id, text: 'from B to busy A' })
  assert.deepEqual([a.lead.received.at(-1)!.how, a.lead.received.at(-1)!.wake === true], ['steer', false])
  await r.host.call(a.lead.id, TOOL.send, { executor: b.id, text: 'from A to busy B' })
  assert.deepEqual([b.lead.received.at(-1)!.how, b.lead.received.at(-1)!.wake === true], ['steer', false])
  b.lead.endTurn('completed', 'B idle')
  await tick(2)
  const peer = await r.host.call(a.lead.id, TOOL.send, { executor: b.id, text: 'from A to idle B' })
  await tick(2)
  assert.deepEqual([b.lead.received.at(-1)!.how, b.lead.received.at(-1)!.wake], ['steer', true])
  assert.equal(peer['delivery'], 'started: the Executor Session was idle and starts a turn to read it')
  nothingQueued(r)
  r.host.dispose()

  // A paused Executor Session gets its input without waking; Resume wakes it with a note, as a steer.
  const p = await withCoordinator('queue-paused', { config: { threadTurnBudget: 1 } })
  const c = await start(p, 'Task C')
  const step = (messages: unknown[]) => p.host.emit('agent/pre-step', { agent: c.lead, step: 1, turn: 1, messages }) as Promise<{ kind: string; messages: unknown[] }>
  const agentMessage = (id: string) => ({ id, role: 'user', content: [{ type: 'text', text: 'x' }], source: { kind: 'agent-message', senderSessionId: p.coordinator.id } })
  await step([agentMessage('one')])
  assert.deepEqual((await step([agentMessage('two')])).messages, [], 'past the budget: held, and the executor is paused')
  assert.equal(c.lead.received.at(-1)!.how, 'inject', 'the held input is added again without waking')
  p.host.userTurn(p.coordinator, 'Nudge it.')
  await p.host.call(p.coordinator.id, TOOL.message, { executor: c.id, text: 'keep going' })
  p.coordinator.endTurn()
  assert.equal(c.lead.received.at(-1)!.how, 'inject')
  p.service.resumeThread(c.id)
  await tick(5)
  const note = c.lead.received.at(-1)!
  assert.deepEqual([note.how, note.wake, note.message.source.kind], ['steer', true, 'agent-message'])
  assert.match(textOf(note.message), /The user resumed this Executor Session after a pause/)
  nothingQueued(p)
  p.host.dispose()
})

test('T1: the folder card waits for the turn that waiting notices open, as it did when dsh ran them from its queue', async () => {
  const r = await withCoordinator('queue-card')
  const a = await start(r, 'Task A')
  const outside = join(r.home, 'dev', 'project')
  mkdirSync(outside, { recursive: true })
  // As dsh: a steer to the idle chat starts a turn at once.
  const steer = r.coordinator.steer.bind(r.coordinator)
  r.coordinator.steer = (message) => { steer(message); r.coordinator.startTurn() }
  // One turn of the user: a folder that needs their confirmation, while Task A reports its result.
  r.host.userTurn(r.coordinator, `Fix the build in ${outside}`)
  const pending = await r.host.call(r.coordinator.id, TOOL.start, { title: 'Fix the build', assignment: 'Make it build.', cwd: outside })
  assert.equal((pending['action'] as { kind: string }).kind, 'confirm-folder')
  await finish(r, a.lead, 'A done')
  assert.deepEqual([wakesOf(r.coordinator).length, r.host.questions.length], [0, 0], 'the notice waits, and so does the card')
  // The turn ends: the notice opens its turn, and the card is not raised into it.
  r.coordinator.endTurn()
  await tick(20)
  assert.deepEqual([wakesOf(r.coordinator).length, r.coordinator.status, r.host.questions.length], [1, 'running', 0])
  // That turn ends: now the card goes up in the coordinator's chat.
  r.coordinator.endTurn('completed', 'Task A is done.')
  await tick(20)
  assert.equal(r.host.questions.length, 1)
  assert.equal(r.host.questions[0]!.request.agent?.id, r.coordinator.id)
  nothingQueued(r)
  r.host.dispose()
})


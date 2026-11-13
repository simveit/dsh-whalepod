import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyEvent, deriveStatus, initialFacts, persistedFacts, questionText, restoredFacts, type ThreadFacts } from '../src/host/status.ts'

const fold = (facts: ThreadFacts, events: { type: string; data?: unknown }[], start = 1000): ThreadFacts =>
  events.reduce((f, e, i) => applyEvent(f, { type: e.type, data: e.data ?? {} }, start + i), facts)

test('a queued thread is starting with a queue detail', () => {
  assert.deepEqual(deriveStatus(initialFacts('queued')), { status: 'starting', detail: 'queued: waiting for a free slot' })
})

test('turn start and end: running, then idle', () => {
  let f = fold(initialFacts('starting'), [{ type: 'turn/start' }])
  assert.equal(deriveStatus({ ...f, running: true }).status, 'running')
  f = fold({ ...f, running: true }, [{ type: 'turn/end', data: { reason: { kind: 'completed' } } }])
  assert.equal(f.running, false)
  assert.equal(deriveStatus(f).status, 'idle')
})

test('a result report in the turn makes the finished thread done', () => {
  let f = fold(initialFacts('starting'), [{ type: 'turn/start' }], 1000)
  f = { ...f, lastReport: { kind: 'result', text: 'Built it.\nDetails...', at: 1500 } }
  assert.deepEqual(deriveStatus(f), { status: 'running', detail: 'result: Built it. Details...' })
  f = fold(f, [{ type: 'turn/end', data: { reason: { kind: 'completed' } } }], 2000)
  assert.deepEqual(deriveStatus(f), { status: 'done', detail: 'result: Built it. Details...' })
  // A later turn without a new result is idle again.
  f = fold(f, [{ type: 'turn/start' }, { type: 'turn/end', data: { reason: { kind: 'completed' } } }], 3000)
  assert.equal(deriveStatus(f).status, 'idle')
})

test('approval asked wins over running and clears on decision', () => {
  let f = fold(initialFacts('starting'), [{ type: 'turn/start' }])
  f = fold(f, [{ type: 'approval/asked', data: { id: 'a1', toolName: 'bash', reason: 'Auto review denied tool "bash"' } }])
  assert.deepEqual(deriveStatus(f), { status: 'waiting-approval', detail: 'approval for bash: Auto review denied tool "bash"' })
  f = fold(f, [{ type: 'approval/decided', data: { id: 'a1', outcome: 'allowed-once' } }])
  assert.equal(deriveStatus(f).status, 'running')
})

test('ask_user_question call is waiting-question until its result', () => {
  let f = fold(initialFacts('starting'), [{ type: 'turn/start' }])
  const args = JSON.stringify({ questions: [{ id: 'q1', question: 'Which colour?' }], timeout: -1 })
  f = fold(f, [{ type: 'tool/call', data: { callId: 'c1', name: 'ask_user_question', arguments: args } }])
  assert.deepEqual(deriveStatus(f), { status: 'waiting-question', detail: 'question: Which colour?' })
  f = fold(f, [{ type: 'tool/result', data: { message: { toolCallId: 'c1', content: [] } } }])
  assert.equal(deriveStatus(f).status, 'running')
})

test('approval precedes question; turn end clears both', () => {
  let f = fold(initialFacts('starting'), [
    { type: 'turn/start' },
    { type: 'tool/call', data: { callId: 'c1', name: 'ask_user_question', arguments: '{"questions":[{"question":"Q"}]}' } },
    { type: 'approval/asked', data: { id: 'a1', toolName: 'ask_user_question' } },
  ])
  assert.equal(deriveStatus(f).status, 'waiting-approval')
  f = fold(f, [{ type: 'turn/end', data: { reason: { kind: 'aborted', reason: { kind: 'user' } } } }])
  assert.deepEqual(f.approvals, {})
  assert.deepEqual(f.questions, {})
  assert.equal(deriveStatus(f).status, 'stopped')
})

test('a failed turn is failed with the error message', () => {
  const f = fold(initialFacts('starting'), [{ type: 'turn/start' }, { type: 'turn/end', data: { reason: { kind: 'error', error: { message: 'rate limited', code: 'X' } } } }])
  assert.deepEqual(deriveStatus(f), { status: 'failed', detail: 'rate limited' })
})

test('needs-user flag shows until the user writes or a new turn starts', () => {
  let f: ThreadFacts = { ...fold(initialFacts('starting'), [{ type: 'turn/start' }, { type: 'turn/end', data: { reason: { kind: 'completed' } } }]), needsUser: { reason: 'pick a licence', at: 5 } }
  assert.deepEqual(deriveStatus(f), { status: 'needs-user', detail: 'pick a licence' })
  assert.equal(deriveStatus(fold(f, [{ type: 'user/message', data: { source: { kind: 'dsh-coordinator' }, content: [] } }])).status, 'needs-user')
  assert.equal(deriveStatus(fold(f, [{ type: 'user/message', data: { source: { kind: 'user' }, content: [] } }])).status, 'idle')
  f = fold(f, [{ type: 'turn/start' }])
  assert.equal(f.needsUser, undefined)
})

test('assistant text is tracked, events without effect keep identity', () => {
  const f = initialFacts('active')
  assert.equal(applyEvent(f, { type: 'step/start', data: {} }, 1), f)
  assert.equal(applyEvent(f, { type: 'tool/call', data: { name: 'bash', callId: 'x' } }, 1), f)
  const g = applyEvent(f, { type: 'assistant/message', data: { message: { content: [{ type: 'text', text: 'Hello   world' }] } } }, 1)
  assert.equal(g.lastAssistantText, 'Hello world')
})

test('questionText handles bad input', () => {
  assert.equal(questionText('not json'), 'not json')
  assert.equal(questionText({}), 'a question')
  assert.equal(questionText({ questions: [{ question: 'A' }, { question: 'B' }] }), 'A (+1 more)')
})

test('restore: an open turn becomes stopped after an app start, a finished one stays', () => {
  const running = fold(initialFacts('starting'), [{ type: 'turn/start' }])
  assert.equal(deriveStatus(restoredFacts(persistedFacts({ ...running, running: true }), undefined, false)).status, 'stopped')
  const done = fold(running, [{ type: 'turn/end', data: { reason: { kind: 'completed' } } }])
  assert.equal(deriveStatus(restoredFacts(persistedFacts(done), undefined, false)).status, 'idle')
  const flagged = restoredFacts(persistedFacts({ ...done, needsUser: { reason: 'r', at: 1 } }), undefined, false)
  assert.equal(deriveStatus(flagged).status, 'needs-user')
})

test('restore: a plugin reload keeps a live turn running and a queued brief queued', () => {
  const running = fold(initialFacts('starting'), [{ type: 'turn/start' }])
  const live = restoredFacts(persistedFacts(running), 'running', false)
  assert.equal(live.running, true)
  assert.equal(deriveStatus(live).status, 'running')
  const queued = restoredFacts(persistedFacts(initialFacts('queued')), undefined, true)
  assert.equal(deriveStatus(queued).detail, 'queued: waiting for a free slot')
})

test('foldTurn recovers open approvals, questions and a turn that ended while unloaded', async () => {
  const { foldTurn } = await import('../src/host/status.ts')
  const base = restoredFacts(persistedFacts(fold(initialFacts('starting'), [{ type: 'turn/start' }])), undefined, false)
  const log = [
    { type: 'turn/start', data: {} },
    { type: 'approval/asked', data: { id: 'a1', toolName: 'bash', reason: 'rm' } },
    { type: 'tool/call', data: { name: 'ask_user_question', callId: 'q1', arguments: '{"questions":[{"question":"Which?"}]}' } },
  ]
  const live = foldTurn(base, log, true)
  assert.equal(deriveStatus(live).status, 'waiting-approval')
  assert.ok('q1' in live.questions)
  const cut = foldTurn(base, log, false)
  assert.equal(deriveStatus(cut).status, 'stopped')
  const ended = foldTurn(base, [...log, { type: 'turn/end', data: { reason: { kind: 'completed' } } }], false)
  assert.equal(deriveStatus(ended).status, 'idle')
  assert.deepEqual(ended.approvals, {})
})

test('headline joins a very short first line with the next one', async () => {
  const { headline } = await import('../src/host/status.ts')
  assert.equal(headline('Done.\nWrote hello.txt in /x.\nMore'), 'Done. Wrote hello.txt in /x.')
  assert.equal(headline('Built the release notes draft in notes/0.4.md.\nDetails'), 'Built the release notes draft in notes/0.4.md.')
  assert.equal(headline('\n\nok'), 'ok')
})

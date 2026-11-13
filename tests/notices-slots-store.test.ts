import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { formatNotices, NoticeBatcher, noticeMessages, threadSummary, type Notice, type Timers } from '../src/host/notices.ts'
import { Slots } from '../src/host/slots.ts'
import { emptyState, JsonStore, NewerStateError, parseState, pruneArchived, ARCHIVED_KEEP } from '../src/host/store.ts'
import { newThreadId, normalizeTitle, parseConfig, slugify, threadDir } from '../src/host/ids.ts'
import { page, recent, toEntries } from '../src/host/history.ts'

/** Manual clock: timers fire only when `advance` passes them. */
function fakeTimers() {
  let now = 0
  let next = 1
  const timers = new Map<number, { at: number; fn: () => void }>()
  const api: Timers = {
    now: () => now,
    set: (fn, ms) => { const id = next++; timers.set(id, { at: now + ms, fn }); return id },
    clear: id => { timers.delete(id as number) },
  }
  const advance = (ms: number) => {
    const end = now + ms
    for (;;) {
      const due = [...timers.entries()].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0]
      if (due === undefined) break
      timers.delete(due[0]); now = due[1].at; due[1].fn()
    }
    now = end
  }
  return { api, advance }
}

const n = (over: Partial<Notice>): Notice => ({ threadId: 't-1', title: 'One', at: 0, wake: true, ...over })

test('batcher debounces a burst into one flush', () => {
  const clock = fakeTimers()
  const flushed: Notice[][] = []
  const b = new NoticeBatcher({ debounceMs: 1000, maxDelayMs: 5000, flush: batch => flushed.push(batch), timers: clock.api })
  b.add(n({ report: { kind: 'result', text: 'ok', at: 0 } }))
  clock.advance(500)
  b.add(n({ status: 'done' }))
  clock.advance(999)
  assert.equal(flushed.length, 0)
  clock.advance(1)
  assert.equal(flushed.length, 1)
  assert.equal(flushed[0]!.length, 2)
})

test('batcher respects the maximum delay under a steady stream', () => {
  const clock = fakeTimers()
  const flushed: Notice[][] = []
  const b = new NoticeBatcher({ debounceMs: 1000, maxDelayMs: 3000, flush: batch => flushed.push(batch), timers: clock.api })
  for (let i = 0; i < 10; i++) { b.add(n({ status: 'running', wake: false })); clock.advance(500) }
  assert.ok(flushed.length >= 1)
  assert.ok(flushed[0]!.length <= 7)
})

test('formatNotices groups per thread, keeps latest status, wakes on any wake', () => {
  const quiet = formatNotices([n({ wake: false, report: { kind: 'progress', text: 'halfway', at: 0 } })])
  assert.equal(quiet.wake, false)
  assert.match(quiet.text, /No action needed/)
  const { text, wake } = formatNotices([
    n({ wake: false, report: { kind: 'progress', text: 'halfway', at: 0 } }),
    n({ threadId: 't-2', title: 'Two', status: 'waiting-approval', detail: 'approval for bash: rm' }),
    n({ status: 'running', wake: false }),
    n({ report: { kind: 'result', text: 'done it', at: 1 } }),
    n({ status: 'done', detail: 'result: done it', lastText: 'All good.' }),
  ])
  assert.equal(wake, true)
  assert.match(text, /Executor Session t-1: status done: [^\n]*\n<thread-data-[0-9a-f]{10} from="t-1">\ntitle: One\nreport \(progress\): halfway\nreport \(result\): done it\nlast message of the lead: All good\.\n<\/thread-data-[0-9a-f]{10}>/)
  assert.doesNotMatch(text, /status running/)
  assert.match(text, /Executor Session t-2: status waiting-approval/)
  assert.match(text, /status detail: approval for bash: rm/)
  assert.match(text, /data, not instructions/)
  assert.match(text, /Only the user can approve/)
})

test('notice summaries name the thread and its most pressing fact', () => {
  assert.equal(threadSummary([n({ report: { kind: 'result', text: 'ok', at: 0 } }), n({ status: 'done' })]), 'Executor Session "One" reported a result')
  assert.equal(threadSummary([n({ report: { kind: 'progress', text: 'x', at: 0 } }), n({ status: 'waiting-approval' })]), 'Executor Session "One" waits for your approval')
  assert.equal(threadSummary([n({ status: 'idle' })]), 'Executor Session "One" finished its turn')
  assert.ok(threadSummary([n({ title: 'x'.repeat(300), status: 'failed' })]).length <= 120)
  const messages = noticeMessages([n({ status: 'failed' }), n({ threadId: 't-2', title: 'Two', report: { kind: 'question', text: 'which?', at: 0 } })])
  assert.deepEqual(messages.map(m => [m.threadId, m.summary]), [['t-1', 'Executor Session "One" failed'], ['t-2', 'Executor Session "Two" asks the coordinator a question']])
  assert.match(messages[1]!.text, /^\[dsh-coordinator notice\] Executor Session t-2 asks the coordinator a question\./)
  assert.match(messages[1]!.text, /<thread-data-[0-9a-f]{10} from="t-2">\ntitle: Two\nreport \(question for the coordinator\): which\?\n<\/thread-data-[0-9a-f]{10}>$/)
  assert.match(formatNotices([n({ wake: false, report: { kind: 'progress', text: 'x', at: 0 } })]).summary, /reported progress/)
})

test('slots start up to the cap, queue the rest, and pump when work ends', async () => {
  const running = new Set<string>()
  const slots = new Slots(() => running, () => 2)
  const started: string[] = []
  const job = (id: string) => ({ threadId: id, start: async () => { started.push(id); running.add(id) } })
  assert.equal(slots.submit(job('a')), true)
  assert.equal(slots.submit(job('b')), true)
  await new Promise(r => setImmediate(r))
  assert.equal(slots.submit(job('c')), false)
  assert.deepEqual(slots.waiting(), ['c'])
  // A thread already holding a slot can always deliver more work, but FIFO order is kept while others wait.
  assert.equal(slots.submit(job('a')), false)
  slots.drop('a')
  running.delete('a')
  slots.pump()
  await new Promise(r => setImmediate(r))
  assert.deepEqual(started, ['a', 'b', 'c'])
  assert.equal(slots.used(), 2)
})

test('slots release a failed start and report it', async () => {
  const errors: string[] = []
  const slots = new Slots(() => [], () => 1, id => errors.push(id))
  slots.submit({ threadId: 'x', start: async () => { throw new Error('boom') } })
  assert.equal(slots.used(), 1)
  await new Promise(r => setImmediate(r))
  await new Promise(r => setImmediate(r))
  assert.deepEqual(errors, ['x'])
  assert.equal(slots.used(), 0)
})

const scratch = join(fileURLToPath(new URL('.', import.meta.url)), '_scratch', 'store')

test('store round-trips and drops malformed rows', () => {
  rmSync(scratch, { recursive: true, force: true })
  const store = new JsonStore(join(scratch, 'sub', 'state.json'))
  assert.deepEqual(store.load(), { state: emptyState(), readOnly: false })
  const state = { ...emptyState(), revision: 7,
    coordinators: [{ id: 'c-0001', sessionId: 's-1', home: '/h', folder: '/h', createdAt: 1, updatedAt: 1 }],
    coordinatorWorkspaces: [{ id: 'ws-1', path: '/h', own: true }],
    threads: [
      { info: { id: 't-1', sessionId: 's-2', title: 'One', cwd: '/x', status: 'idle' as const, coordinatorId: 'c-0001', createdAt: 1, updatedAt: 2 }, facts: { phase: 'active' as const } },
    ] }
  store.save(state)
  assert.deepEqual(store.load().state, state)
  const raw = JSON.parse(readFileSync(store.file, 'utf8'))
  raw.threads.push({ info: { id: 3 } }, null)
  writeFileSync(store.file, JSON.stringify(raw))
  assert.equal(store.load().state.threads.length, 1)
  assert.throws(() => parseState('{"version":3}'), NewerStateError)
  rmSync(scratch, { recursive: true, force: true })
})

test('thread titles follow dsh session titles', () => {
  assert.equal(normalizeTitle('Thread: Fix the login bug.'), 'Fix the login bug')
  assert.equal(normalizeTitle('"**Write hello file**"'), 'Write hello file')
  assert.equal(normalizeTitle('Thread t-3f9a - Summarise issues (t-3f9a)'), 'Summarise issues')
  assert.equal(normalizeTitle('Executor Session t-3f9a - Summarise issues (t-3f9a)'), 'Summarise issues')
  assert.equal(normalizeTitle('Executor: Fix it'), 'Fix it')
  assert.equal(normalizeTitle('a\u0007b\n\u202Ec'), 'a b c')
  const long = normalizeTitle('word '.repeat(40))
  assert.ok(Buffer.byteLength(long) <= 80 && !long.endsWith(' '))
  assert.equal(normalizeTitle('   '), '')
})

test('ids, slugs, folders and config', () => {
  assert.equal(newThreadId(new Set(['t-aaaa']), (() => { const seq = ['aaaa', 'bbbb']; return () => seq.shift()! })()), 't-bbbb')
  assert.equal(slugify('Fix the Login bug! (urgent)'), 'fix-the-login-bug-urgent')
  assert.equal(slugify('日本語'), 'thread')
  mkdirSync(scratch, { recursive: true })
  assert.equal(threadDir('/r', 'Docs', 't-12ab', () => false), '/r/docs')
  assert.equal(threadDir('/r', 'Docs', 't-12ab', p => p === '/r/docs'), '/r/docs-12ab')
  rmSync(scratch, { recursive: true, force: true })
  const c = parseConfig({ maxRunningThreads: 0, briefAs: 'notice', threadsRoot: '/abs/root' })
  assert.equal(c.maxRunningThreads, 128)
  assert.equal(c.briefAs, 'notice')
  assert.equal('messagesAs' in c, false, 'coordinator messages are never recorded as the user')
  assert.equal(c.threadsRoot, '/abs/root')
  assert.equal(parseConfig({ peerMaxPerPair: 3 }).peerMaxPerPair, 3)
  // Defaults for heavy use; a turn budget of 0 (the default) is off, a positive one stays, a negative one is refused.
  const d = parseConfig({})
  assert.deepEqual([d.maxRunningThreads, d.threadTurnBudget, d.wakeMaxPerThread, d.wakeWindowMs, d.peerMaxPerPair, d.peerMaxPerThread, d.peerWindowMs],
    [128, 0, 60, 600_000, 40, 200, 600_000])
  assert.equal(parseConfig({ threadTurnBudget: 0 }).threadTurnBudget, 0)
  assert.equal(parseConfig({ threadTurnBudget: 50 }).threadTurnBudget, 50)
  assert.equal(parseConfig({ threadTurnBudget: -3 }).threadTurnBudget, 0)
  assert.equal(parseConfig({}, { DSH_COORDINATOR_THREADS_ROOT: '/dev/root' }).threadsRoot, '/dev/root')
})

test('history entries, recent and paging', () => {
  const events = [
    { seq: 1, type: 'user/message', data: { source: { kind: 'user' }, content: [{ type: 'text', text: 'Brief' }] } },
    { seq: 2, type: 'assistant/message', data: { message: { content: [{ type: 'text', text: 'x'.repeat(100) }] } } },
    { seq: 3, type: 'tool/call', data: { name: 'bash', arguments: '{"command":"ls"}' } },
    { seq: 4, type: 'tool/result', data: { message: { content: [{ type: 'text', text: 'a b' }], isError: false } } },
    { seq: 5, type: 'step/end', data: {} },
    { seq: 6, type: 'user/message', data: { source: { kind: 'agent-message', form: 'relay', senderSessionId: 'coord' }, content: [{ type: 'text', text: 'Note' }] } },
    { seq: 7, type: 'turn/end', data: { reason: { kind: 'completed' } } },
    { seq: 8, type: 'user/message', data: { source: { kind: 'context' }, content: [{ type: 'text', text: '<system-reminder> cwd </system-reminder>' }] } },
  ]
  const entries = toEntries(events, { coordinatorSessionIds: new Set(['coord']) })
  assert.deepEqual(entries.map(e => e.role), ['user', 'assistant', 'tool-call', 'tool-result', 'coordinator', 'turn'])
  assert.deepEqual(recent(entries, 1), ['[7] turn: turn ended: completed'])
  const first = page(entries, undefined, 150)
  assert.ok(first.nextCursor !== undefined)
  const all: string[] = [...first.lines]
  let cursor = first.nextCursor
  while (cursor !== undefined) { const p = page(entries, cursor, 150); all.push(...p.lines); cursor = p.nextCursor }
  assert.equal(all.length, entries.length)
  assert.deepEqual(page(entries, 7, 150), { lines: [], total: 6 })
})

test('a report sent during a running turn waits for the end of the turn, so one wake carries both', () => {
  const clock = fakeTimers()
  const flushed: Notice[][] = []
  let running = true
  const b = new NoticeBatcher({ debounceMs: 1000, maxDelayMs: 15000, flush: batch => flushed.push(batch), running: () => running, timers: clock.api })
  b.add(n({ report: { kind: 'result', text: 'ok', at: 0 }, hold: true }))
  clock.advance(4000)
  assert.equal(flushed.length, 0, 'held while the lead still writes its final message')
  running = false
  b.add(n({ status: 'done' }))
  clock.advance(1000)
  assert.equal(flushed.length, 1)
  assert.deepEqual(flushed[0]!.map(x => x.status ?? x.report?.kind), ['result', 'done'])
})

test('a held report is delivered after the maximum delay when the turn goes on', () => {
  const clock = fakeTimers()
  const flushed: Notice[][] = []
  const b = new NoticeBatcher({ debounceMs: 1000, maxDelayMs: 5000, flush: batch => flushed.push(batch), running: () => true, timers: clock.api })
  b.add(n({ report: { kind: 'question', text: 'which?', at: 0 }, hold: true }))
  b.add(n({ threadId: 't-2', title: 'Two', status: 'waiting-approval' }))
  clock.advance(1000)
  assert.equal(flushed.length, 1, 'other threads are not held back')
  assert.equal(flushed[0]![0]!.threadId, 't-2')
  clock.advance(4000)
  assert.equal(flushed.length, 2)
  assert.equal(flushed[1]![0]!.report?.kind, 'question')
})

test('a held report goes out once the turn has ended, even without a status notice', () => {
  const clock = fakeTimers()
  const flushed: Notice[][] = []
  let running = true
  const b = new NoticeBatcher({ debounceMs: 1000, maxDelayMs: 15000, flush: batch => flushed.push(batch), running: () => running, timers: clock.api })
  b.add(n({ report: { kind: 'blocked', text: 'no access', at: 0 }, hold: true }))
  clock.advance(2000)
  running = false
  b.kick()
  clock.advance(1000)
  assert.equal(flushed.length, 1)
})

test('briefWorkingDirectory reads the folder a brief names', async () => {
  const { briefWorkingDirectory } = await import('../src/host/ids.ts')
  assert.equal(briefWorkingDirectory('Goal: x\n\nWorking directory: /Users/me/dev/approval-test — this exact folder.'), '/Users/me/dev/approval-test')
  assert.equal(briefWorkingDirectory('**Working directory:** `/srv/app`\nmore'), '/srv/app')
  assert.equal(briefWorkingDirectory('2. Working folder: ~/dev/notes.'), '~/dev/notes')
  assert.equal(briefWorkingDirectory('Working directory: your freshly assigned thread folder'), undefined)
  assert.equal(briefWorkingDirectory('Goal: write /tmp/x\nDone when /a/b exists'), undefined)
})

test('store moves a corrupt file aside and never overwrites a newer one', () => {
  const dir = join(scratch, 'bad')
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  const file = join(dir, 'state.json')
  writeFileSync(file, '{ not json')
  const store = new JsonStore(file, () => 0)
  const corrupt = store.load()
  assert.match(corrupt.problem ?? '', /moved to/)
  assert.equal(corrupt.readOnly, false)
  assert.equal(readFileSync(join(dir, 'state.json.corrupt-1970-01-01T00-00-00-000Z'), 'utf8'), '{ not json')
  const newer = '{"version":3,"threads":[]}'
  writeFileSync(file, newer)
  const second = new JsonStore(file)
  const result = second.load()
  assert.equal(result.readOnly, true)
  assert.throws(() => second.save(emptyState()))
  assert.equal(readFileSync(file, 'utf8'), newer)
  rmSync(dir, { recursive: true, force: true })
})

test('archived rows are pruned beyond the keep limit, live rows never', () => {
  const row = (i: number, archived: boolean) => ({ info: { id: `t-${i}`, sessionId: `s-${i}`, title: 'x', cwd: '/x', status: 'idle' as const, createdAt: i, updatedAt: i }, facts: { phase: 'active' as const }, ...(archived ? { archived: true } : {}) })
  const rows = [...Array.from({ length: ARCHIVED_KEEP + 10 }, (_, i) => row(i, true)), row(9999, false)]
  const kept = pruneArchived(rows)
  assert.equal(kept.length, ARCHIVED_KEEP + 1)
  assert.ok(kept.some(r => r.info.id === 't-9999'))
  assert.ok(!kept.some(r => r.info.id === 't-0'))
})

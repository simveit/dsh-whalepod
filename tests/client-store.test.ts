import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  archivedThreadsOf, chatOf, countsOf, isLoading, isWorking, monogramOf, nameOf, nameProblem, orphanThreads, pickCoordinator, promptLength, roleOf, sentence, threadsOf, toneOf, TONES,
} from '../src/client/store.ts'
import type { CoordinatorInfo, CoordinatorState, ThreadInfo } from '../src/types.ts'

const coord = (id: string, over: Partial<CoordinatorInfo> = {}): CoordinatorInfo =>
  ({ id, sessionId: `s-${id}`, name: id, title: id, home: `/h/${id}`, folder: `/h/${id}`, createdAt: 1, updatedAt: 1, ...over })
const thread = (id: string, coordinatorId: string, over: Partial<ThreadInfo> = {}): ThreadInfo =>
  ({ id, sessionId: `s-${id}`, title: id, cwd: `/w/${id}`, status: 'idle', coordinatorId, createdAt: 1, updatedAt: 1, ...over })
const state = (over: Partial<CoordinatorState> = {}): CoordinatorState => ({
  coordinators: [coord('c-a'), coord('c-b'), coord('c-old', { sessionId: null, archived: true, chatArchived: true })],
  threads: [
    thread('t-1', 'c-a', { status: 'running' }), thread('t-2', 'c-a', { status: 'waiting-approval' }), thread('t-3', 'c-b', { status: 'starting' }),
    thread('t-4', '', { status: 'idle' }), thread('t-5', 'c-gone'),
  ],
  lastCoordinatorId: 'c-b',
  revision: 1,
  ...over,
})

test('roleOf: coordinator chat, Executor Session, other Session', () => {
  const s = { state: state() }
  assert.deepEqual(roleOf(s, 's-c-a'), { role: 'coordinator', coordinatorId: 'c-a' })
  assert.deepEqual(roleOf(s, 's-t-3'), { role: 'thread', coordinatorId: 'c-b' })
  assert.deepEqual(roleOf(s, 's-t-4'), { role: 'thread', coordinatorId: '' })
  assert.equal(roleOf(s, 's-unrelated'), undefined)
  assert.equal(roleOf(s, undefined), undefined)
  assert.equal(roleOf({ state: undefined }, 's-c-a'), undefined)
  // A thread waiting for its folder has no Session (''); '' must never match it.
  assert.equal(roleOf({ state: state({ threads: [thread('t-9', 'c-a', { sessionId: '' })] }) }, ''), undefined)
  // An archived coordinator's chat id is null; null never matches.
  assert.equal(roleOf(s, null as unknown as string), undefined)
})

test('selected coordinator falls back when it disappears', () => {
  const s = state()
  assert.equal(pickCoordinator(s, 'c-a')?.id, 'c-a')
  assert.equal(pickCoordinator(s, 'c-old')?.id, 'c-old', 'an archived coordinator stays selectable')
  assert.equal(pickCoordinator(s, 'c-deleted')?.id, 'c-b', 'gone: the last used one')
  assert.equal(pickCoordinator(s, undefined)?.id, 'c-b')
  assert.equal(pickCoordinator(state({ lastCoordinatorId: 'c-old' }), 'c-deleted')?.id, 'c-a', 'the last used one archived: the first live one')
  assert.equal(pickCoordinator(state({ lastCoordinatorId: undefined }), 'c-deleted')?.id, 'c-a')
  const onlyArchived = state({ coordinators: [coord('c-old', { archived: true })], lastCoordinatorId: undefined })
  assert.equal(pickCoordinator(onlyArchived, 'c-x')?.id, 'c-old')
  assert.equal(pickCoordinator(state({ coordinators: [] }), 'c-a'), undefined)
  assert.equal(pickCoordinator(undefined, 'c-a'), undefined)
})

test('threads, orphans and counts are scoped per coordinator', () => {
  const s = state()
  assert.deepEqual(threadsOf(s, 'c-a').map(t => t.id), ['t-1', 't-2'])
  assert.deepEqual(threadsOf(s, 'c-old'), [])
  assert.deepEqual(orphanThreads(s).map(t => t.id), ['t-4', 't-5'])
  assert.deepEqual(countsOf(s, 'c-a'), { attention: 1, running: 1, total: 2 })
  assert.deepEqual(countsOf(s, 'c-b'), { attention: 0, running: 1, total: 1 })
  assert.deepEqual(countsOf(undefined, 'c-a'), { attention: 0, running: 0, total: 0 })
})

test('isWorking mirrors the host archive rule (L5)', () => {
  assert.equal(isWorking(thread('t', 'c', { status: 'idle' })), false, 'idle is not working')
  assert.equal(isWorking(thread('t', 'c', { status: 'done' })), false)
  assert.equal(isWorking(thread('t', 'c', { status: 'failed' })), false)
  assert.equal(isWorking(thread('t', 'c', { status: 'running' })), true)
  assert.equal(isWorking(thread('t', 'c', { status: 'starting' })), true)
  assert.equal(isWorking(thread('t', 'c', { status: 'waiting-approval' })), true)
  assert.equal(isWorking(thread('t', 'c', { status: 'needs-user', action: { kind: 'resume', reason: 'wakes', count: 3 } })), true)
  // A stopped Lead whose teammates still work, and a row waiting for its folder, count too.
  assert.equal(isWorking(thread('t', 'c', { status: 'stopped', team: { members: 3, working: 2 } })), true)
  assert.equal(isWorking(thread('t', 'c', { status: 'stopped', team: { members: 3, working: 0 } })), false)
  assert.equal(isWorking(thread('t', 'c', { status: 'idle', sessionId: '', action: { kind: 'confirm-folder', path: '/p', why: 'outside' } })), true)
})

test('isLoading: no state, or the host still validates (L8)', () => {
  assert.equal(isLoading(undefined), true)
  assert.equal(isLoading({ ...state(), loading: true }), true)
  assert.equal(isLoading(state()), false)
  assert.equal(isLoading({ ...state(), loading: false }), false)
})

test('names, monograms and tones', () => {
  assert.equal(nameOf(coord('c', { name: 'Noether', title: 'Coordinator Noether' })), 'Noether')
  assert.equal(nameOf(coord('c', { name: '', title: 'Coordinator 2' })), 'Coordinator 2', 'an older host without names')
  assert.equal(nameOf(coord('c', { name: '  ', title: 'T' })), 'T')
  assert.equal(monogramOf('noether'), 'N')
  assert.equal(monogramOf('  émilie'), 'É')
  assert.equal(monogramOf('诺特'), '诺')
  assert.equal(monogramOf('😀 x'), '😀', 'a whole code point')
  assert.equal(monogramOf(''), '?')
  assert.equal(toneOf('Noether'), toneOf(' noether '), 'stable, case and space insensitive')
  assert.ok(TONES.includes(toneOf('Hypatia')))
  assert.ok(new Set(['Noether', 'Feynman', 'Kant', 'Borges', 'Curie', 'Hypatia', 'Turing', 'Lovelace'].map(toneOf)).size > 1, 'names spread over tones')
})

test('nameProblem: a quick check before the host decides', () => {
  const list = [coord('c-a', { name: 'Noether' }), coord('c-b', { name: 'Feynman' }), coord('c-old', { name: 'Kant', archived: true })]
  assert.equal(nameProblem('Hypatia', 'c-a', list), undefined)
  assert.equal(nameProblem('Noether', 'c-a', list), undefined, 'its own name')
  assert.equal(nameProblem('  feynman ', 'c-a', list), 'rename.taken')
  assert.equal(nameProblem('Kant', 'c-a', list), undefined, 'archived coordinators do not hold their name')
  assert.equal(nameProblem('   ', 'c-a', list), 'rename.empty')
  assert.equal(nameProblem('x'.repeat(41), 'c-a', list), 'rename.long')
  assert.equal(nameProblem('诺'.repeat(40), 'c-a', list), undefined, '40 characters, not bytes')
  assert.equal(nameProblem('a\u0007b', 'c-a', list), 'rename.control')
})

test('promptLength counts as the host does; sentence tidies a host reason', () => {
  assert.equal(promptLength(''), 0)
  assert.equal(promptLength('ab\ncd'), 5)
  assert.equal(promptLength('😀😀'), 4, 'the host checks String.length')
  assert.equal(sentence('at most 20 coordinators; archive another one first'), 'At most 20 coordinators; archive another one first.')
  assert.equal(sentence('Error: the home is refused.'), 'The home is refused.')
  assert.equal(sentence('  '), '')
})

test('the idle status reads "Standing by" / 待命, never "Idle"', async () => {
  const { en, zh } = await import('../src/client/locales.ts')
  assert.equal(en['status.idle'], 'Standing by')
  assert.equal(en['group.idle'], 'Standing by')
  assert.equal(zh['status.idle'], '待命')
  assert.equal(zh['group.idle'], '待命')
  assert.ok(!Object.values(en).some(v => /\bIdle\b/.test(v)), 'no "Idle" in the English copy')
  assert.ok(!Object.values(zh).some(v => v.includes('空闲')), 'no 空闲 in the Chinese copy')
})

test('chatOf and archivedThreadsOf (r3)', () => {
  assert.equal(chatOf(coord('c', { chat: 'none', sessionId: null })), 'none')
  assert.equal(chatOf(coord('c', { chat: 'gone', sessionId: null })), 'gone')
  assert.equal(chatOf(coord('c')), 'open', 'an older host: a live session id')
  assert.equal(chatOf(coord('c', { sessionId: null })), 'archived', 'an older host: no session reads as archived')
  assert.equal(chatOf(coord('c', { chatArchived: true })), 'archived')
  const s = { ...state(), archivedThreads: [thread('t-a', 'c-a', { status: 'done' }), thread('t-b', 'c-b'), thread('t-c', 'c-a', { status: 'stopped' })] }
  assert.deepEqual(archivedThreadsOf(s, 'c-a').map(t => t.id), ['t-a', 't-c'])
  assert.deepEqual(archivedThreadsOf(state(), 'c-a'), [])
  assert.deepEqual(archivedThreadsOf(undefined, 'c-a'), [])
})

test('no "Deny" and no "computer that runs" left in the copy', async () => {
  const { en, zh } = await import('../src/client/locales.ts')
  assert.ok(!Object.values(en).some(v => /\bDeny\b/.test(v)))
  assert.ok(!Object.values(en).some(v => v.includes('computer that runs')))
  assert.ok(!Object.values(zh).some(v => v.includes('那台电脑')))
})

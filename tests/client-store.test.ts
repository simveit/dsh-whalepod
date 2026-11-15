import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  archivedThreadsOf, chatOf, countsOf, isLoading, isWorking, memoryRowMerge, memoryRowSync, memoryRowView, monogramOf, nameOf, nameProblem, orphanThreads, pickCoordinator, promptLength, roleOf, sentence, threadsOf,
  toneOf, TONES,
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

test('the client limits match the host: Executor prompt and memory', async () => {
  const { EXECUTOR_PROMPT_MAX, MEMORY_MAX: HOST_MEMORY_MAX } = await import('../src/host/ids.ts')
  const { PROMPT_MAX, MEMORY_MAX } = await import('../src/client/store.ts')
  assert.equal(PROMPT_MAX, EXECUTOR_PROMPT_MAX)
  assert.equal(MEMORY_MAX, HOST_MEMORY_MAX)
})

test('the fake source keeps a memory per coordinator: shown, replaced, cleared, refused when too long or based on a stale revision, switched off', async () => {
  const { fakeSource } = await import('../src/client/source.ts')
  const source = fakeSource()
  const first = (await source.getState()).coordinators.find(c => c.memory !== undefined)
  assert.ok(first, 'a fake coordinator has a memory for the dev build')
  assert.match(first.memory!, /^## /)
  assert.ok(first.memoryRevision! > 0 && first.memoryBy !== undefined, 'with a revision and a last writer')
  const saved = await source.setCoordinatorMemory(first.id, '- One thing.\r\n', first.memoryRevision!)
  assert.deepEqual([saved.saved, saved.coordinator.memory, saved.coordinator.memoryRevision, saved.coordinator.memoryBy?.by], [true, '- One thing.', first.memoryRevision! + 1, 'user'])
  assert.equal((await source.getState()).coordinators.find(c => c.id === first.id)?.memory, '- One thing.')
  // Like the host: a draft based on the earlier revision is not saved, and the current memory comes back.
  const stale = await source.setCoordinatorMemory(first.id, '- Too late.', first.memoryRevision!)
  assert.deepEqual([stale.saved, stale.coordinator.memory, stale.coordinator.memoryRevision], [false, '- One thing.', first.memoryRevision! + 1])
  assert.equal((await source.setCoordinatorMemory(first.id, '', stale.coordinator.memoryRevision!)).coordinator.memory, undefined)
  await assert.rejects(source.setCoordinatorMemory(first.id, 'x'.repeat(6001), first.memoryRevision! + 2), /at most 6000 characters/)
  assert.equal((await source.setCoordinatorMemoryEnabled(first.id, false)).memoryOff, true)
  assert.equal((await source.getState()).coordinators.find(c => c.id === first.id)?.memoryOff, true)
  assert.equal((await source.setCoordinatorMemoryEnabled(first.id, true)).memoryOff, undefined)
})

test('the Memory row has its strings in both languages', async () => {
  const { en, zh } = await import('../src/client/locales.ts')
  for (const key of Object.keys(en).filter(k => k.startsWith('memory.'))) assert.ok(zh[key as keyof typeof zh], key)
})

test('M1: the Memory row follows the memory revision: a newer version merges, an older poll is ignored, a refused save keeps the draft', () => {
  /** A row as the component holds it, driven like its effect and its save. */
  let row = { base: 'A', baseRevision: 1, draft: 'A', changed: false }
  const poll = (text: string, revision: number) => { row = memoryRowSync(row, { text, revision }) ?? row }
  /** A save the host accepted: the row takes the host's cleaned text and the new revision. */
  const saved = (text: string, revision: number) => { row = { draft: text, base: text, baseRevision: revision, changed: false } }
  // The user adds a line and saves; the poll still brings the old version once, then the saved one.
  row.draft = 'B'
  saved('B', 2)
  poll('A', 1)
  assert.deepEqual(row, { base: 'B', baseRevision: 2, draft: 'B', changed: false }, 'the old text does not come back into the field')
  poll('B', 2)
  assert.deepEqual(row, { base: 'B', baseRevision: 2, draft: 'B', changed: false })
  // The coordinator restores exactly the earlier text: it is a new revision, so the row follows it.
  poll('A', 3)
  assert.deepEqual(row, { base: 'A', baseRevision: 3, draft: 'A', changed: false })
  // With unsaved edits the draft stays and the row says the memory changed underneath; it is now based on the new
  // version, so a save replaces that version knowingly.
  row.draft = 'A plus mine'
  poll('C', 4)
  assert.deepEqual(row, { base: 'C', baseRevision: 4, draft: 'A plus mine', changed: true })
  // A draft equal to the new host text is simply in sync.
  row.draft = 'D'
  poll('D', 5)
  assert.deepEqual(row, { base: 'D', baseRevision: 5, draft: 'D', changed: false })
  // The host cleaned the saved text (it differs from the draft): the field takes the host's version from the result.
  row.draft = 'E  '
  saved('E', 6)
  poll('D', 5)
  assert.deepEqual(row, { base: 'E', baseRevision: 6, draft: 'E', changed: false })
  // A refused save: the memory changed between the last poll and the save. The draft stays, the row says so and is
  // based on the current version; the next save goes out with that revision.
  row.draft = 'E and my line'
  row = memoryRowMerge(row, { text: 'F', revision: 7 })
  assert.deepEqual(row, { base: 'F', baseRevision: 7, draft: 'E and my line', changed: true })
  poll('F', 7)
  assert.deepEqual(row, { base: 'F', baseRevision: 7, draft: 'E and my line', changed: true }, 'the poll of the same version changes nothing')
  // A refusal whose current text equals the draft leaves nothing to decide.
  assert.deepEqual(memoryRowMerge({ draft: 'G', base: 'F' }, { text: 'G', revision: 8 }), { base: 'G', baseRevision: 8, draft: 'G', changed: false })
  // A refusal is taken as it comes, also with a lower revision than the row had (a state file put back): the row recovers.
  assert.deepEqual(memoryRowMerge({ draft: 'mine', base: 'F' }, { text: 'old', revision: 2 }), { base: 'old', baseRevision: 2, draft: 'mine', changed: true })
  // Pure: nothing to do for the revision the row is based on, or an older one.
  assert.equal(memoryRowSync({ base: 'x', baseRevision: 3, draft: 'y', changed: false }, { text: 'z', revision: 3 }), undefined)
  assert.equal(memoryRowSync({ base: 'x', baseRevision: 3, draft: 'y', changed: false }, { text: 'z', revision: 2 }), undefined)
})

test('Review L5: after the host service started again the Memory row takes its version, also with a lower or equal revision', () => {
  const row = { base: 'new', baseRevision: 9, draft: 'new', changed: false, epoch: 'a' }
  // The same service: a lower or equal revision is an older poll, as before.
  assert.equal(memoryRowSync(row, { text: 'old', revision: 4, epoch: 'a' }), undefined)
  assert.equal(memoryRowSync(row, { text: 'other', revision: 9, epoch: 'a' }), undefined)
  assert.deepEqual(memoryRowSync(row, { text: 'newer', revision: 10, epoch: 'a' }), { base: 'newer', baseRevision: 10, draft: 'newer', changed: false, epoch: 'a' })
  // Another service (the state file was put back from a backup): the row follows, whatever the revision.
  assert.deepEqual(memoryRowSync(row, { text: 'old', revision: 4, epoch: 'b' }), { base: 'old', baseRevision: 4, draft: 'old', changed: false, epoch: 'b' })
  // An equal revision with another text (a hand edit): followed too, so the next save does not replace it unseen.
  assert.deepEqual(memoryRowSync(row, { text: 'edited', revision: 9, epoch: 'b' }), { base: 'edited', baseRevision: 9, draft: 'edited', changed: false, epoch: 'b' })
  // An unsaved draft stays and the row says that the memory changed underneath.
  assert.deepEqual(memoryRowSync({ ...row, draft: 'new plus mine' }, { text: 'old', revision: 4, epoch: 'b' }), { base: 'old', baseRevision: 4, draft: 'new plus mine', changed: true, epoch: 'b' })
  // The same version from the new service: only the epoch moves, an unsaved draft is not marked.
  assert.deepEqual(memoryRowSync({ ...row, draft: 'new plus mine' }, { text: 'new', revision: 9, epoch: 'b' }), { base: 'new', baseRevision: 9, draft: 'new plus mine', changed: false, epoch: 'b' })
  // Once on the new service, its revisions order the versions again.
  assert.equal(memoryRowSync({ base: 'old', baseRevision: 4, draft: 'old', changed: false, epoch: 'b' }, { text: 'older', revision: 3, epoch: 'b' }), undefined)
  // A host that names no epoch (an older one) behaves as before.
  assert.equal(memoryRowSync(row, { text: 'old', revision: 4 }), undefined)
  assert.deepEqual(memoryRowSync({ base: 'x', baseRevision: 1, draft: 'x', changed: false }, { text: 'y', revision: 2 }), { base: 'y', baseRevision: 2, draft: 'y', changed: false })
})

test('the Memory row follows the page on its own: a change by the coordinator or an Executor Session asks nothing of the user', () => {
  /** A row as the component holds it, with the number of Executor Sessions the host names as having changed the page. */
  let row = { base: 'A', baseRevision: 1, draft: 'A', changed: false }
  const poll = (text: string, revision: number) => { row = memoryRowSync(row, { text, revision }) ?? row }
  const view = (executors = 0, facts: { busy?: boolean; archived?: boolean } = {}) => memoryRowView(row, { executors, ...facts })
  const nothing = { dirty: false, over: false, conflict: false, canSave: false, canRevert: false, canReview: false }
  assert.deepEqual(view(), nothing, 'a page in sync offers nothing')

  // The coordinator rewrites its memory: the field shows the new text, and nothing is to save or to revert.
  poll('A\n- the coordinator added this', 2)
  assert.equal(row.draft, 'A\n- the coordinator added this')
  assert.deepEqual(view(), nothing)

  // An Executor Session changes the page: the text follows the same way. The mark is information, Save stays off, and
  // the one optional action is to mark the page as reviewed.
  poll('A\n- an executor added this', 3)
  assert.equal(row.draft, 'A\n- an executor added this')
  assert.deepEqual(view(1), { ...nothing, canReview: true })
  // Further changes keep following, also while the mark is there.
  poll('B', 4)
  assert.equal(row.draft, 'B')
  assert.deepEqual(view(2), { ...nothing, canReview: true })
  // Not while a save or a review runs, and not on an archived coordinator.
  assert.deepEqual(view(2, { busy: true }), nothing)
  assert.deepEqual(view(2, { archived: true }), nothing)

  // The user's own unsaved edit: Save and Revert are theirs. The review action steps back, since Save clears the mark too.
  row.draft = 'B plus mine'
  assert.deepEqual(view(2), { dirty: true, over: false, conflict: false, canSave: true, canRevert: true, canReview: false })
  // Only now can a change underneath be a conflict: the draft stays and the user decides.
  poll('C', 5)
  assert.equal(row.draft, 'B plus mine')
  assert.deepEqual(view(2), { dirty: true, over: false, conflict: true, canSave: true, canRevert: true, canReview: false })
  // Reverting takes the page's version; the row follows on its own again.
  row = { ...row, draft: row.base, changed: false }
  assert.deepEqual(view(), nothing)
  poll('D', 6)
  assert.equal(row.draft, 'D')

  // Marking as reviewed sends the page the row is based on with its revision. Accepted, the host returns the same
  // text and revision and the row stays as it is; refused (the page changed just now), the row takes the new version.
  assert.deepEqual(memoryRowMerge(row, { text: 'D', revision: 6 }), { base: 'D', baseRevision: 6, draft: 'D', changed: false })
  assert.deepEqual(memoryRowMerge(row, { text: 'E', revision: 7 }), { base: 'E', baseRevision: 7, draft: 'E', changed: false })

  // Q8: the user types while "Mark as reviewed" is under way. The host accepts and returns the text the draft is
  // based on (same or newer revision): the edit is an ordinary unsaved one, with no "changed meanwhile" line.
  for (const revision of [6, 7]) {
    const typed = memoryRowMerge({ ...row, draft: 'D and a line typed meanwhile' }, { text: 'D', revision })
    assert.deepEqual(typed, { base: 'D', baseRevision: revision, draft: 'D and a line typed meanwhile', changed: false })
    assert.deepEqual(memoryRowView(typed, { executors: 0 }), { dirty: true, over: false, conflict: false, canSave: true, canRevert: true, canReview: false })
  }
  // The same through a poll: a new revision of the same text takes nothing from under the draft.
  assert.deepEqual(memoryRowSync({ ...row, draft: 'D plus mine' }, { text: 'D', revision: 9 }), { base: 'D', baseRevision: 9, draft: 'D plus mine', changed: false })
  // A review refused because the page changed just now is a real change underneath the typed text.
  assert.deepEqual(memoryRowMerge({ ...row, draft: 'D and a line typed meanwhile' }, { text: 'E', revision: 7 }), { base: 'E', baseRevision: 7, draft: 'D and a line typed meanwhile', changed: true })
  // A conflict the row already shows stays when only the revision moves afterwards: the user has not decided yet.
  assert.deepEqual(memoryRowMerge({ draft: 'mine', base: 'E', changed: true }, { text: 'E', revision: 8 }), { base: 'E', baseRevision: 8, draft: 'mine', changed: true })

  // A draft above the limit can be reverted but not saved; a stale "changed" flag without an edit is no conflict.
  row.draft = 'x'.repeat(6001)
  assert.deepEqual(view(), { dirty: true, over: true, conflict: false, canSave: false, canRevert: true, canReview: false })
  assert.deepEqual(memoryRowView({ draft: 'D', base: 'D', changed: true }, { executors: 0 }), nothing)
})

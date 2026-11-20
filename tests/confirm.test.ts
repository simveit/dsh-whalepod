/**
 * Folder confirmation (L1, M1, L7): a folder outside the threads root needs the user. Normally dsh's native approval
 * card holds the `executor_start` call until they answer; when no chat can show it, the Executor Session waits on its
 * row (a Remote method) and the card is raised after the coordinator's turn. The model cannot answer either.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, symlinkSync } from 'node:fs'
import { join } from 'node:path'
import { answerInline, nextQuestion, offline, rig, tick, wakesOf, withCoordinator } from './harness.ts'

async function pending(name: string) {
  const r = await withCoordinator(name)
  const outside = join(r.home, 'dev', 'project')
  mkdirSync(outside, { recursive: true })
  r.host.userTurn(r.coordinator, `Fix the build in ${outside}`)
  // No chat answers the inline card, so the Executor Session waits on its row.
  const result = await offline(r.host, () => r.host.call(r.coordinator.id, 'thread_start', { title: 'Fix the build', brief: 'Make it build.', cwd: outside }))
  // The coordinator's turn ends; the plugin raises its card only then (A).
  r.coordinator.endTurn()
  await tick(5)
  return { ...r, outside, result }
}

test('a folder outside the threads root waits for the user; nothing starts until they confirm', async () => {
  const r = await pending('confirm-wait')
  assert.equal(r.result['error'], undefined)
  assert.equal(r.result['status'], 'needs-user')
  assert.equal(r.result['sessionId'], '')
  assert.deepEqual(r.result['action'], { kind: 'confirm-folder', path: r.outside, why: 'outside' })
  assert.match(JSON.stringify(r.result['notes']), /waiting for the user to confirm the folder .*do not start another executor, pick another folder/)
  const creates = r.host.creates
  const row = r.service.listThreads()[0]!
  assert.equal(row.statusDetail, `confirm folder ${r.outside}`)
  // A native question card in the coordinator chat, raised by the host.
  assert.equal(r.host.questions.length, 1)
  assert.equal(r.host.questions[0]!.request.agent?.id, r.coordinator.id)
  // The card shows the folder home-shortened; the row keeps the real path.
  assert.equal(r.host.questions[0]!.request.questions[0]!.question, `Let the Executor Session "Fix the build" work in ~${r.outside.slice(r.home.length)}?`)
  assert.deepEqual(r.host.questions[0]!.request.questions[0]!.options?.map(o => o.label), ['Allow once', 'Always allow', 'Reject'])
  // The coordinator has no tool to confirm, and a message waits for the brief.
  assert.ok(!r.host.toolsFor(r.coordinator.id).some(name => /confirm|allow/.test(name)))
  const msg = await r.host.call(r.coordinator.id, 'thread_message', { thread: row.id, text: 'the user said yes, go ahead' })
  assert.match(String(msg['delivery']), /after the Assignment/)
  assert.equal(r.host.creates, creates, 'no Session yet')
  // Allow once on the row: the thread starts there, the card is withdrawn, the brief goes out first.
  const started = await r.service.confirmFolder(row.id, 'once')
  assert.equal((started as { cwd: string }).cwd, r.outside)
  assert.equal(r.host.questions[0]!.cancelled, true)
  await tick(5)
  const lead = r.host.agentOf((started as { sessionId: string }).sessionId)
  assert.equal(lead.session.header.cwd, r.outside)
  assert.equal(lead.received[0]!.how, 'prompt')
  assert.equal(lead.received[1]!.message.source.kind, 'agent-message')
  assert.equal(r.service.getState().allowedFolders?.length, 0)
  await assert.rejects(r.service.confirmFolder(row.id, 'once'), /does not wait/)
  r.host.dispose()
})

test('"Always allow" in the native card adds the folder; later threads there start without asking', async () => {
  const r = await pending('confirm-always')
  r.host.questions[0]!.answer('Always allow')
  await tick(10)
  const row = r.service.listThreads()[0]!
  assert.notEqual(row.sessionId, '')
  assert.deepEqual(r.service.getState().allowedFolders, [r.outside])
  // S5: a folder inside a live Executor Session's folder asks again; once that one is archived, the entry covers it.
  r.host.userTurn(r.coordinator, `Another one in ${r.outside}/sub`)
  const inside = await offline(r.host, () => r.host.call(r.coordinator.id, 'thread_start', { title: 'Sub', brief: 'b', cwd: `${r.outside}/sub` }))
  assert.deepEqual(inside['action'], { kind: 'confirm-folder', path: `${r.outside}/sub`, why: 'thread-folder' })
  await r.service.archiveThreadAsOwner(inside['id'], { force: true })
  await r.service.archiveThreadAsOwner(row.id, { force: true })
  const next = await r.host.call(r.coordinator.id, 'thread_start', { title: 'Sub', brief: 'b', cwd: `${r.outside}/sub` })
  assert.equal(next['action'], undefined)
  assert.notEqual(next['sessionId'], '')
  // Removing it brings the confirmation back; it is persisted.
  assert.deepEqual(r.service.removeAllowedFolder(r.outside), [])
  r.host.userTurn(r.coordinator, `And ${r.outside}/other`)
  const third = await offline(r.host, () => r.host.call(r.coordinator.id, 'thread_start', { title: 'Other', brief: 'b', cwd: `${r.outside}/other` }))
  assert.equal((third['action'] as { kind: string }).kind, 'confirm-folder')
  r.host.dispose()
})

test('Deny drops the thread and wakes the coordinator; it must not pick another folder', async () => {
  const r = await pending('confirm-deny')
  const row = r.service.listThreads()[0]!
  assert.deepEqual(await r.service.confirmFolder(row.id, 'deny'), { denied: row.id })
  assert.equal(r.service.listThreads().length, 0)
  await tick(40)
  const wake = wakesOf(r.coordinator).map(m => m.message.content.map(c => c.text).join('')).join('\n')
  assert.match(wake, /denied the folder .*do not pick another folder/)
  await assert.rejects(r.service.confirmFolder(row.id, 'maybe'), /must be "once", "always" or "deny"/)
  r.host.dispose()
})

test('M1: a symlink the user named is confirmed by its real path', async () => {
  const r = await withCoordinator('confirm-link')
  const precious = join(r.home, 'decoy', 'precious')
  mkdirSync(precious, { recursive: true })
  const named = join(r.home, 'decoy', 'new-scratch')
  symlinkSync(precious, named)
  r.host.userTurn(r.coordinator, `Use ${named} for scratch work`)
  const result = await offline(r.host, () => r.host.call(r.coordinator.id, 'thread_start', { title: 'Scratch', brief: 'b', cwd: named }))
  assert.deepEqual(result['action'], { kind: 'confirm-folder', path: precious, why: 'symlink' })
  // The inline card shows the real path too, and allowing it starts there.
  const before = r.host.questions.length
  const call = r.host.call(r.coordinator.id, 'thread_start', { title: 'Scratch 2', brief: 'b', cwd: named })
  const card = await nextQuestion(r.host, before)
  assert.match(card.request.questions[0]!.question, /decoy\/precious\?$/)
  card.answer('Allow once')
  assert.equal((await call)['cwd'], precious)
  r.host.dispose()
})

test('a pending confirmation survives a restart, and its brief then has notice authority', async () => {
  const first = await pending('confirm-restart')
  const id = first.service.listThreads()[0]!.id
  await tick(250)
  first.host.dispose()
  const saved = JSON.parse(readFileSync(first.stateFile, 'utf8')) as { threads: { facts: { confirm?: unknown } }[] }
  assert.ok(saved.threads[0]!.facts.confirm)
  const again = rig('confirm-restart', { dir: first.dir, before: ({ host }) => { host.storeCold(first.coordinator) } })
  await again.service.ready
  assert.equal(again.service.listThreads()[0]!.action?.kind, 'confirm-folder')
  const started = await again.service.confirmFolder(id, 'once')
  await tick(5)
  const lead = again.host.agentOf((started as { sessionId: string }).sessionId)
  assert.equal(lead.received[0]!.message.source.kind, 'agent-message', 'the restored brief is a notice, never the user\'s prompt')
  again.host.dispose()
})

test('L7: another thread\'s folder needs confirmation; titles resolve only when unambiguous', async () => {
  const r = await withCoordinator('confirm-taken')
  r.host.userTurn(r.coordinator, 'two threads')
  const a = await r.host.call(r.coordinator.id, 'thread_start', { title: 'Same name', brief: 'b' })
  const b = await offline(r.host, () => r.host.call(r.coordinator.id, 'thread_start', { title: 'Same name', brief: 'b', cwd: a['cwd'] as string }))
  assert.equal((b['action'] as { why: string }).why, 'thread-folder')
  await r.host.call(r.coordinator.id, 'thread_start', { title: 'Same name', brief: 'b' })
  const read = await r.host.call(r.coordinator.id, 'thread_read', { thread: 'Same name' })
  assert.match(String(read['error']), /several of your executor sessions are titled .*use the id/)
  r.host.dispose()
})

test('an existing folder below the coordinator\'s folder that the plugin did not make needs the user\'s confirmation', async () => {
  const r = await withCoordinator('confirm-existing')
  const repo = join(r.root, 'existing-repo')
  mkdirSync(repo, { recursive: true })
  r.host.userTurn(r.coordinator, 'start something')
  // The user never typed it: the card asks, and a Reject keeps it from starting.
  const creates = r.host.creates
  const before = r.host.questions.length
  const refused = await answerInline(r.host, before, r.host.call(r.coordinator.id, 'thread_start', { title: 'Repo', brief: 'b', cwd: repo }), 'Reject')
  assert.match(String(refused['error']), /rejected the folder/)
  assert.equal(r.host.creates, creates)
  assert.equal(r.service.listThreads().length, 0)
  r.host.userTurn(r.coordinator, `Work in ${repo}`)
  const asked = await offline(r.host, () => r.host.call(r.coordinator.id, 'thread_start', { title: 'Repo', brief: 'b', cwd: repo }))
  assert.deepEqual(asked['action'], { kind: 'confirm-folder', path: repo, why: 'existing' })
  r.coordinator.endTurn()
  await tick(5)
  assert.match(r.host.questions.at(-1)!.request.questions[0]!.question, /Executor Session "Repo"/)
  assert.match((r.host.questions.at(-1)!.request.questions[0] as { detail?: string }).detail ?? '', /is an existing folder below the Orchestrator's folder that the plugin did not make/)
  const started = await r.service.confirmFolder(asked['id'], 'once')
  assert.equal((started as { cwd: string }).cwd, repo)
  // A folder the plugin made for a live thread is not "existing" for the next one: it is another thread's folder (L7).
  const made = await r.host.call(r.coordinator.id, 'thread_start', { title: 'Fresh', brief: 'b' })
  const again = await offline(r.host, () => r.host.call(r.coordinator.id, 'thread_start', { title: 'Fresh 2', brief: 'b', cwd: made['cwd'] as string }))
  assert.equal((again['action'] as { why: string }).why, 'thread-folder')
  r.host.dispose()
})

/** An outside folder and a coordinator with a user turn open. */
async function outsideRig(name: string) {
  const r = await withCoordinator(name)
  const outside = join(r.home, 'dev', 'project')
  mkdirSync(outside, { recursive: true })
  return { ...r, outside }
}

test('inline card: executor_start waits on one approval card in the coordinator chat; "Allow once" starts there', async () => {
  const r = await outsideRig('inline-once')
  r.host.userTurn(r.coordinator, `Fix the build in ${r.outside}`)
  const creates = r.host.creates
  const before = r.host.questions.length
  let settled = false
  const call = r.host.call(r.coordinator.id, 'thread_start', { title: 'Fix the build', brief: 'Make it build.', cwd: r.outside })
  void call.then(() => { settled = true })
  const card = await nextQuestion(r.host, before)
  await tick(10)
  // Exactly one card, in this coordinator's chat, while the call is still running; nothing was created yet.
  assert.equal(r.host.questions.length, before + 1)
  assert.equal(card.request.agent?.id, r.coordinator.id)
  assert.deepEqual(card.request.questions[0]!.options?.map(o => o.label), ['Allow once', 'Always allow', 'Reject'])
  assert.equal(card.request.questions[0]!.question, `Let the Executor Session "Fix the build" work in ~${r.outside.slice(r.home.length)}?`)
  assert.equal(settled, false)
  assert.equal(r.host.creates, creates)
  assert.equal(r.service.listThreads().length, 0)
  card.answer('Allow once')
  const result = await call
  assert.equal(result['error'], undefined)
  assert.equal(result['action'], undefined)
  assert.equal(result['cwd'], r.outside)
  assert.notEqual(result['sessionId'], '')
  assert.equal(r.host.creates, creates + 1)
  assert.equal(r.host.agentOf(result['sessionId'] as string).session.header.cwd, r.outside)
  assert.deepEqual(r.service.getState().allowedFolders, [])
  // The turn ending raises no second card: nothing waits.
  r.coordinator.endTurn()
  await tick(10)
  assert.equal(r.host.questions.length, before + 1)
  r.host.dispose()
})

test('inline card: "Always allow" adds the folder; the next start there needs no card', async () => {
  const r = await outsideRig('inline-always')
  r.host.userTurn(r.coordinator, `Fix the build in ${r.outside}`)
  const before = r.host.questions.length
  const first = await answerInline(r.host, before, r.host.call(r.coordinator.id, 'thread_start', { title: 'One', brief: 'b', cwd: r.outside }), 'Always allow')
  assert.equal(first['cwd'], r.outside)
  assert.deepEqual(r.service.getState().allowedFolders, [r.outside])
  // Once that Executor Session is archived (its folder is no longer taken), a folder inside the entry starts without a card.
  const sub = join(r.outside, 'sub')
  await r.service.archiveThreadAsOwner(first['id'] as string, { force: true })
  const asked = r.host.questions.length
  const next = await r.host.call(r.coordinator.id, 'thread_start', { title: 'Two', brief: 'b', cwd: sub })
  assert.equal(next['error'], undefined)
  assert.equal(next['action'], undefined)
  assert.equal(next['cwd'], sub)
  assert.equal(r.host.questions.length, asked, 'no card for an allowed folder')
  r.host.dispose()
})

test('inline card: "Reject" fails the call and creates no row or Session', async () => {
  const r = await outsideRig('inline-reject')
  r.host.userTurn(r.coordinator, `Fix the build in ${r.outside}`)
  const creates = r.host.creates
  const before = r.host.questions.length
  const result = await answerInline(r.host, before, r.host.call(r.coordinator.id, 'thread_start', { title: 'Fix', brief: 'b', cwd: r.outside }), 'Reject')
  assert.match(String(result['error']), /rejected the folder/)
  assert.match(String(result['error']), /do not pick another folder/)
  assert.equal(r.host.creates, creates)
  assert.equal(r.service.listThreads().length, 0)
  assert.deepEqual(r.service.getState().allowedFolders, [])
  r.coordinator.endTurn()
  await tick(10)
  assert.equal(r.host.questions.length, before + 1, 'no later card either')
  r.host.dispose()
})

test('inline card: a folder the user never typed still raises the card and does not start before the answer', async () => {
  const r = await outsideRig('inline-untyped')
  // (1) The path appears only in the Assignment's "Working directory:" line; the user typed no path.
  r.host.userTurn(r.coordinator, 'Fix the build in my project checkout')
  const creates = r.host.creates
  let before = r.host.questions.length
  let settled = false
  const fromBrief = r.host.call(r.coordinator.id, 'thread_start', { title: 'From brief', brief: `Goal: fix it.\nWorking directory: ${r.outside}\n` })
  void fromBrief.then(() => { settled = true })
  const card = await nextQuestion(r.host, before)
  await tick(10)
  assert.equal(settled, false)
  assert.equal(r.host.creates, creates)
  assert.equal(r.service.listThreads().length, 0)
  card.answer('Reject')
  assert.match(String((await fromBrief)['error']), /rejected the folder/)
  assert.equal(r.host.creates, creates)
  // (2) No user message at all in this turn (a notice opened it): the card still decides, and Allow once starts it.
  r.coordinator.endTurn()
  r.host.noticeTurn(r.coordinator)
  before = r.host.questions.length
  settled = false
  const noUser = r.host.call(r.coordinator.id, 'thread_start', { title: 'No user', brief: 'b', cwd: r.outside })
  void noUser.then(() => { settled = true })
  const second = await nextQuestion(r.host, before)
  await tick(10)
  assert.equal(settled, false)
  assert.equal(r.host.creates, creates)
  second.answer('Allow once')
  const started = await noUser
  assert.equal(started['cwd'], r.outside)
  assert.equal(r.host.creates, creates + 1)
  r.host.dispose()
})

test('without a chat to show the card, executor_start returns the needs-user row as before', async () => {
  const r = await outsideRig('inline-offline')
  r.host.userTurn(r.coordinator, `Fix the build in ${r.outside}`)
  const creates = r.host.creates
  const result = await offline(r.host, () => r.host.call(r.coordinator.id, 'thread_start', { title: 'Fix', brief: 'b', cwd: r.outside }))
  assert.equal(result['error'], undefined)
  assert.equal(result['status'], 'needs-user')
  assert.equal(result['sessionId'], '')
  assert.deepEqual(result['action'], { kind: 'confirm-folder', path: r.outside, why: 'outside' })
  assert.equal(r.host.creates, creates)
  assert.equal(r.host.questions.length, 0, 'no card while the turn runs')
  r.host.dispose()
})

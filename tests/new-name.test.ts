/**
 * A name for a new coordinator: the user may choose one on the page before the coordinator is created. The host checks
 * it like a rename; without one the automatic name from the built-in list is used, as before. A refused name creates
 * nothing. Every other way a coordinator comes about keeps the automatic name.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { TYPERT_REMOTE } from '../src/client/remote.ts'
import { COORDINATOR_NAMES } from '../src/host/ids.ts'
import { rig, tick, withCoordinator } from './harness.ts'

type R = Awaited<ReturnType<typeof withCoordinator>>
const methods = (TYPERT_REMOTE as unknown as { methods: Record<string, { parameters: { codec: { create(): { parse(v: unknown): unknown } } }[] }> }).methods
const infoOf = (r: R, id: string) => r.service.getState().coordinators.find(c => c.id === id)!
const base = (r: R) => join(r.home, 'Documents', 'deepseek-harness')
/** What a creation leaves behind: records, Workspaces, Sessions dsh was asked to create, and folders below the base. */
const footprint = (r: R) => ({
  coordinators: r.service.getState().coordinators.length, workspaces: r.host.workspaces.length, creates: r.host.creates,
  folders: existsSync(base(r)) ? readdirSync(base(r)).sort() : [],
})

test('T4: a chosen name is used for the coordinator, its chat, its group and its folder', async () => {
  const r = await withCoordinator('new-name-custom')
  const made = await r.service.createCoordinator({ name: 'Research desk' })
  const info = infoOf(r, made.coordinatorId)
  assert.deepEqual([info.name, info.title, info.home, info.folder], ['Research desk', 'Research desk', join(base(r), 'coordinator-research-desk'), join(base(r), 'coordinator-research-desk')])
  assert.equal(r.host.agentOf(made.sessionId).title, 'Research desk')
  assert.equal(r.host.workspaces.find(w => w.path === info.home)?.title, 'Research desk')
  assert.equal(r.host.agentOf(made.sessionId).session.header.cwd, info.home)
  // Cleaned like a rename: NFC, invisible characters removed, trimmed.
  const cleaned = await r.service.createCoordinator({ name: '  Ope​rations  ' })
  assert.equal(infoOf(r, cleaned.coordinatorId).name, 'Operations')
  // A name without Latin letters gets the plain folder name; a name on the built-in list gets that entry's slug.
  const cjk = await r.service.createCoordinator({ name: '研究组' })
  assert.deepEqual([infoOf(r, cjk.coordinatorId).name, infoOf(r, cjk.coordinatorId).home], ['研究组', join(base(r), 'coordinator')])
  const listed = await r.service.createCoordinator({ name: '李白' })
  assert.equal(infoOf(r, listed.coordinatorId).home, join(base(r), 'coordinator-li-bai'))
  // With a folder the user picked, the name is theirs and the folder stays the picked one.
  const picked = await r.service.createCoordinator({ home: join(r.home, 'dev', 'docs'), name: 'Docs' })
  assert.deepEqual([infoOf(r, picked.coordinatorId).name, infoOf(r, picked.coordinatorId).home], ['Docs', join(r.home, 'dev', 'docs')])
  // It survives a save: the state file holds the chosen name.
  await tick(1)
  r.host.dispose()
})

test('T4: no name, or an empty one, keeps the automatic name from the built-in list', async () => {
  const r = await withCoordinator('new-name-empty')
  const listed = new Set(COORDINATOR_NAMES.map(e => e.name))
  for (const request of [undefined, {}, { name: undefined }, { name: '' }, { name: '   ' }, { name: null }] as const) {
    const made = await (r.service.createCoordinator as (q?: unknown) => Promise<{ coordinatorId: string; sessionId: string }>)(request)
    const info = infoOf(r, made.coordinatorId)
    assert.ok(listed.has(info.name!), `${JSON.stringify(request)} got the automatic name ${info.name}`)
    assert.match(info.home, /coordinator-[a-z-]+$/)
  }
  const names = r.service.getState().coordinators.map(c => c.name)
  assert.equal(new Set(names).size, names.length, 'each automatic name is free')
  r.host.dispose()
})

test('T4: a name another live coordinator has is refused and nothing is created; an archived coordinator\'s name is free', async () => {
  const r = await withCoordinator('new-name-duplicate')
  const first = await r.service.createCoordinator({ name: 'Atlas' })
  const before = footprint(r)
  // Compared like a rename: case, width and invisible characters fold.
  for (const name of ['Atlas', 'atlas', 'ＡＴＬＡＳ', 'At­las', ' Atlas ']) {
    await assert.rejects(r.service.createCoordinator({ name }), /another coordinator is already called/, name)
  }
  // The name of the coordinator the rig made, an automatic one, is taken too.
  await assert.rejects(r.service.createCoordinator({ name: infoOf(r, r.coordinatorId).name! }), /another coordinator is already called/)
  assert.deepEqual(footprint(r), before, 'no record, no Workspace, no Session and no folder')
  // Two creations with the same name at once: they run one after the other, so exactly one passes.
  const both = await Promise.allSettled([r.service.createCoordinator({ name: 'Borealis' }), r.service.createCoordinator({ name: 'borealis' })])
  assert.deepEqual(both.map(x => x.status).sort(), ['fulfilled', 'rejected'])
  assert.equal(r.service.getState().coordinators.filter(c => c.name?.toLowerCase() === 'borealis').length, 1)
  // Archived: its name can be chosen again, as a rename could take it.
  await r.service.archiveCoordinator({ coordinatorId: first.coordinatorId })
  const again = await r.service.createCoordinator({ name: 'Atlas' })
  assert.equal(infoOf(r, again.coordinatorId).name, 'Atlas')
  assert.notEqual(again.coordinatorId, first.coordinatorId)
  r.host.dispose()
})

test('T4: an invalid name is refused with the rename\'s reasons and nothing is created', async () => {
  const r = await withCoordinator('new-name-invalid')
  const before = footprint(r)
  const create = r.service.createCoordinator as (q?: unknown) => Promise<unknown>
  await assert.rejects(create({ name: 'x'.repeat(41) }), /the name may have at most 40 characters/)
  await assert.rejects(create({ name: '2026' }), /the name may not be only a number/)
  await assert.rejects(create({ name: 'two\nlines' }), /may not contain control characters or line breaks/)
  await assert.rejects(create({ name: 'tab\there' }), /may not contain control characters or line breaks/)
  await assert.rejects(create({ name: 'Euler · parser' }), /may not contain a middle dot/)
  await assert.rejects(create({ name: '​​' }), /the name must not be empty/)
  await assert.rejects(create({ name: 42 }), /the name must be text/)
  await assert.rejects(create({ name: { toString: () => 'Object' } }), /the name must be text/)
  // A refused name wins over a good folder: nothing is made there either.
  const folder = join(r.home, 'dev', 'named')
  await assert.rejects(create({ home: folder, name: '2026' }), /only a number/)
  assert.equal(existsSync(folder), false)
  assert.deepEqual(footprint(r), before, 'no record, no Workspace, no Session and no folder')
  // 40 characters are fine, counted in code points.
  const long = await r.service.createCoordinator({ name: '名'.repeat(40) })
  assert.equal([...infoOf(r, long.coordinatorId).name!].length, 40)
  r.host.dispose()
})

test('T4: every other way a coordinator comes about keeps the automatic name', async () => {
  const listed = new Set(COORDINATOR_NAMES.map(e => e.name))
  // Open chat with no coordinator yet (first use).
  const fresh = rig('new-name-first-use')
  await fresh.service.ready
  const opened = await fresh.service.ensureCoordinator({})
  assert.ok(listed.has(fresh.service.getState().coordinators.find(c => c.id === opened.coordinatorId)!.name!))
  fresh.host.dispose()
  // A New Session in a coordinator's group becomes a coordinator with the user's first message: named by the plugin.
  const r = await withCoordinator('new-name-adopted')
  const blank = r.host.newSession(r.root)
  await tick(5)
  r.host.userTurn(blank, 'hello')
  await tick(5)
  const adopted = r.service.getState().coordinators.find(c => c.sessionId === blank.id)
  assert.ok(adopted !== undefined && listed.has(adopted.name!), 'the adopted chat got a name from the list')
  r.host.dispose()
})

test('T4: the client spec carries the optional name; the quick check allows an empty one', async () => {
  const codec = methods['coordinator/createCoordinator']!.parameters[0]!.codec.create()
  assert.deepEqual(codec.parse({ name: 'Atlas' }), { name: 'Atlas' })
  assert.deepEqual(codec.parse({ home: '/x', name: 'Atlas' }), { home: '/x', name: 'Atlas' })
  assert.deepEqual(codec.parse({}), {})
  assert.throws(() => codec.parse({ name: 42 }))
  const { newNameProblem, NAME_MAX } = await import('../src/client/store.ts')
  const coordinators = [{ id: 'c-1', name: 'Noether' }, { id: 'c-2', name: 'Kant', archived: true }]
  assert.equal(newNameProblem('', coordinators), undefined, 'empty: the automatic name')
  assert.equal(newNameProblem('   ', coordinators), undefined)
  assert.equal(newNameProblem('Atlas', coordinators), undefined)
  assert.equal(newNameProblem('noether', coordinators), 'rename.taken')
  assert.equal(newNameProblem('Kant', coordinators), undefined, 'an archived coordinator\'s name is free')
  assert.equal(newNameProblem('x'.repeat(NAME_MAX + 1), coordinators), 'rename.long')
  assert.equal(newNameProblem('a\tb', coordinators), 'rename.control')
  // Q9: the name typed so far belongs to the page's draft, so it is still there when the form comes back for
  // another place (the folder the picker returned, or Type a path). A form opened anew starts empty.
  const { newDraftAt } = await import('../src/client/store.ts')
  assert.deepEqual(newDraftAt(undefined, { kind: 'default' }), { kind: 'default', name: '' })
  const typedName = { ...newDraftAt(undefined, { kind: 'default' }), name: 'Research Desk' }
  assert.deepEqual(newDraftAt(typedName, { kind: 'picked', home: '/x/docs' }), { kind: 'picked', home: '/x/docs', name: 'Research Desk' })
  assert.deepEqual(newDraftAt(newDraftAt(typedName, { kind: 'picked', home: '/x/docs' }), { kind: 'typed' }), { kind: 'typed', name: 'Research Desk' })
  // The fake source of development builds follows the host.
  const { fakeSource } = await import('../src/client/source.ts')
  const source = fakeSource()
  const made = await source.createCoordinator({ name: ' Atlas ' })
  assert.equal((await source.getState()).coordinators.find(c => c.id === made.coordinatorId)?.name, 'Atlas')
  await assert.rejects(source.createCoordinator({ name: 'atlas' }), /another coordinator is already called/)
  const auto = await source.createCoordinator({ name: '  ' })
  assert.notEqual((await source.getState()).coordinators.find(c => c.id === auto.coordinatorId)?.name, '')
})

test('T4: when no folder is free below the base, the refusal names the reason and the way out, and nothing is created', async () => {
  const r = await withCoordinator('new-name-no-folder')
  // A coordinator whose home is the base itself: every new folder below it is inside that home.
  await r.service.createCoordinator({ home: base(r) })
  const before = footprint(r)
  for (const request of [{}, { name: 'Research Desk' }]) {
    await assert.rejects(r.service.createCoordinator(request), (error: Error) => {
      assert.match(error.message, /^no free folder for a new coordinator under ~\/Documents\/deepseek-harness: a new folder there is refused \(it is inside another coordinator's home\)\. Give it a folder yourself with Choose folder or Type a path$/)
      return true
    })
  }
  assert.deepEqual(footprint(r), before)
  // The way out works: a folder the user gives, with the name they typed.
  const made = await r.service.createCoordinator({ home: join(r.home, 'dev', 'desk'), name: 'Research Desk' })
  assert.deepEqual([infoOf(r, made.coordinatorId).name, infoOf(r, made.coordinatorId).home], ['Research Desk', join(r.home, 'dev', 'desk')])
  r.host.dispose()
})

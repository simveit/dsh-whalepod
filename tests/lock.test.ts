import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { acquireLock, type LockDeps } from '../src/host/lock.ts'
import { scratch } from './harness.ts'

const deps = (pid: number, startedAt: number, running: Record<number, number>): LockDeps => ({
  pid, startedAt,
  alive: p => p in running,
  startTimeOf: p => running[p],
})

test('one owner per state directory; a live second process is refused', () => {
  const file = join(scratch('lock-live'), 'owner.lock')
  const running = { 100: 1000, 200: 5000 }
  const first = acquireLock(file, deps(100, 1000, running))
  assert.equal(first.ok, true)
  const second = acquireLock(file, deps(200, 5000, running))
  assert.deepEqual(second, { ok: false, holder: { pid: 100, startedAt: 1000 } })
  // The same process (a plugin reload) takes it again.
  assert.equal(acquireLock(file, deps(100, 1000, running)).ok, true)
  if (first.ok) first.release()
  assert.equal(existsSync(file), false)
  assert.equal(acquireLock(file, deps(200, 5000, running)).ok, true)
})

test('a lock of a dead process, or of a reused pid, is stale and replaced', () => {
  const file = join(scratch('lock-stale'), 'owner.lock')
  writeFileSync(file, JSON.stringify({ pid: 300, startedAt: 1000 }))
  assert.equal(acquireLock(file, deps(400, 9000, { 400: 9000 })).ok, true, 'dead owner')
  writeFileSync(file, JSON.stringify({ pid: 300, startedAt: 1000 }))
  assert.equal(acquireLock(file, deps(400, 9000, { 300: 999_999, 400: 9000 })).ok, true, 'pid 300 now belongs to a later process')
  writeFileSync(file, 'garbage')
  assert.equal(acquireLock(file, deps(400, 9000, { 400: 9000 })).ok, true, 'unreadable lock')
})

test('L4: a forged lock is not honoured: unknown start time, or a process that is not dsh', () => {
  const file = join(scratch('lock-forged'), 'owner.lock')
  // pid 500 runs, but its start time cannot be read: not proven to be the owner.
  writeFileSync(file, JSON.stringify({ pid: 500, startedAt: 1000 }))
  assert.equal(acquireLock(file, { ...deps(400, 9000, { 400: 9000 }), alive: p => p === 400 || p === 500 }).ok, true, 'unknown start time')
  // pid 600 runs and started at the recorded time, but it is not a dsh process.
  writeFileSync(file, JSON.stringify({ pid: 600, startedAt: 2000 }))
  assert.equal(acquireLock(file, { ...deps(400, 9000, { 400: 9000, 600: 2000 }), isDsh: p => p !== 600 }).ok, true, 'not dsh')
  // A real dsh owner is honoured.
  writeFileSync(file, JSON.stringify({ pid: 700, startedAt: 3000 }))
  assert.deepEqual(acquireLock(file, { ...deps(400, 9000, { 400: 9000, 700: 3000 }), isDsh: () => true }), { ok: false, holder: { pid: 700, startedAt: 3000 } })
})

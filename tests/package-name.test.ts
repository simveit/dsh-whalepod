/**
 * The package is dsh-whalepod, while every id that installed data depends on keeps the historical dsh-coordinator
 * (decision 63). This pins both sides, so a later rename of one cannot drift from the others.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { TYPERT_REMOTE } from '../src/client/remote.ts'
import { NS } from '../src/client/locales.ts'

const root = join(import.meta.dirname, '..')
const read = (file: string) => readFileSync(join(root, file), 'utf8')
const pkg = JSON.parse(read('package.json')) as { name: string; files: string[] }

test('everything that names the package says dsh-whalepod', () => {
  assert.equal(pkg.name, 'dsh-whalepod')
  // The bundle row loads the package by name and keeps the entry id.
  assert.match(read('cordis.patch.yml'), /- id: dsh-coordinator\n\s+name: dsh-whalepod\n/)
  // dsh imports `<package>/client` and registers it under the package name.
  assert.match(read('tsdown.config.ts'), /__ModuleLoader__\.load\(\{ id: "dsh-whalepod"/)
  assert.equal((TYPERT_REMOTE as unknown as { package: string }).package, 'dsh-whalepod')
  // The Plugins page slot is keyed by package name.
  assert.match(read('src/client/settings.tsx'), /const PACKAGE_NAME = 'dsh-whalepod'/)
  for (const language of ['en', 'zh', 'de']) {
    assert.equal((JSON.parse(read(`locale/${language}.json`)) as { meta: { title: string } }).meta.title, 'Whalepod', language)
  }
})

test('ids that installed data depends on keep dsh-coordinator', () => {
  assert.match(read('src/client/settings.tsx'), /export const ENTRY_ID = 'dsh-coordinator'/, 'the settings row and namespace')
  assert.equal(NS, 'dsh-coordinator')
  assert.match(read('src/index.ts'), /'storages', 'dsh-coordinator', 'state\.json'/)
  assert.match(read('src/host/threads.ts'), /const MESSAGE_SOURCE = 'dsh-coordinator'/)
  assert.match(read('src/host/authority.ts'), /'dsh-coordinator:role:', 'dsh-coordinator:opening:'/)
  assert.match(read('src/host/history.ts'), /'dsh-coordinator:brief:'/)
})

test('the bundle layer inserts only its own row, never the auto-review row (in-app Uninstall, decision 64)', () => {
  const rows = read('cordis.patch.yml').split('\n').filter(line => /^\s+- id: /.test(line)).map(line => line.trim())
  assert.deepEqual(rows, ['- id: dsh-coordinator'])
  assert.doesNotMatch(read('cordis.patch.yml'), /^\s+name: '?@deepseek-ai\/dsh-experimental-auto-review/m)
})

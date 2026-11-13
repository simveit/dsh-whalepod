/**
 * The settings on dsh's Plugins page: the host's Schemastery fields (config-schema.ts), the page's fields and codecs
 * (src/client/settings-fields.ts) and parseConfig (ids.ts) agree on keys, minimums, defaults and choices; the live
 * config follows Volatile values and still sanitizes them.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildConfigSchema, CONFIG_FIELDS, dshRoot, liveConfig, schemasteryFromDsh, type DshModuleLoader, type SchemaBuilder, type SchemaNode } from '../src/host/config-schema.ts'
import { coordinatorWanted } from '../src/host/coordinator-tools.ts'
import { DEFAULT_CONFIG, parseConfig } from '../src/host/ids.ts'
import { fieldCodec, settingsFields } from '../src/client/settings-fields.ts'

test('every config key has a field; the page shows exactly the volatile ones, with the same rules', () => {
  const keys = new Set([...Object.keys(DEFAULT_CONFIG), 'coordinatorBase'])
  assert.deepEqual(new Set(CONFIG_FIELDS.map(f => f.key)), keys)
  const volatile = CONFIG_FIELDS.filter(f => f.volatile)
  assert.deepEqual(volatile.map(f => f.key).sort(), CONFIG_FIELDS.filter(f => f.key !== 'threadsRoot').map(f => f.key).sort(), 'all but the legacy threadsRoot')
  const page = settingsFields()
  assert.deepEqual(page.map(f => f.key).sort(), volatile.map(f => f.key).sort())
  for (const def of page) {
    const host = CONFIG_FIELDS.find(f => f.key === def.key)!
    assert.deepEqual([def.kind, def.min, def.integer, def.choices], [host.kind, host.min, host.integer, host.choices], def.key)
  }
})

test('minimums agree with parseConfig: the minimum is accepted, below it falls back to the default', () => {
  for (const field of CONFIG_FIELDS.filter(f => f.kind === 'count' || f.kind === 'duration')) {
    const key = field.key as keyof typeof DEFAULT_CONFIG
    const min = field.min!
    assert.equal(parseConfig({ [key]: min })[key], min, `${key} at its minimum`)
    assert.equal(parseConfig({ [key]: min - 1 })[key], DEFAULT_CONFIG[key], `${key} below its minimum`)
    const codec = fieldCodec(settingsFields().find(f => f.key === key)!)
    assert.deepEqual(codec.parse(String(min)), { kind: 'set', value: min }, key)
    assert.equal(codec.parse(String(min - 1)), undefined, key)
    assert.deepEqual(codec.parse(''), { kind: 'clear' }, key)
    if (field.integer === true) assert.equal(codec.parse(`${min}.5`), undefined, `${key} whole numbers only`)
  }
  // 0 is allowed only for the turn budget among the counts.
  assert.equal(parseConfig({ threadTurnBudget: 0 }).threadTurnBudget, 0)
  assert.equal(parseConfig({ maxRunningThreads: 0 }).maxRunningThreads, DEFAULT_CONFIG.maxRunningThreads)
})

test('choices agree with parseConfig; paths and tool lists are checked on the page and filtered on the host', () => {
  for (const field of CONFIG_FIELDS.filter(f => f.kind === 'choice')) {
    const key = field.key as 'threadPermission' | 'briefAs'
    for (const choice of field.choices!) assert.equal(parseConfig({ [key]: choice })[key], choice)
    assert.equal(parseConfig({ [key]: 'other' })[key], DEFAULT_CONFIG[key])
    assert.equal(fieldCodec(settingsFields().find(f => f.key === key)!).parse('other'), undefined)
  }
  const base = fieldCodec(settingsFields().find(f => f.key === 'coordinatorBase')!)
  assert.deepEqual(base.parse(' ~/work '), { kind: 'set', value: '~/work' })
  assert.equal(base.parse('relative/path'), undefined)
  assert.equal(base.parse('/a\nb'), undefined)
  const tools = fieldCodec(settingsFields().find(f => f.key === 'coordinatorExtraTools')!)
  assert.deepEqual(tools.parse('mcp__docs__search, bash'), { kind: 'set', value: ['mcp__docs__search', 'bash'] })
  assert.equal(tools.parse('rm -rf /'), undefined)
  // Whatever arrives, the never list still filters: bash from the form never reaches a coordinator.
  const config = parseConfig({ coordinatorExtraTools: ['mcp__docs__search', 'bash', 'web_fetch', 'bad name'] })
  assert.deepEqual(config.coordinatorExtraTools, ['mcp__docs__search', 'bash', 'web_fetch'])
  assert.deepEqual([...coordinatorWanted(config.coordinatorExtraTools, false)].filter(n => n.startsWith('mcp') || n === 'bash' || n === 'web_fetch'), ['mcp__docs__search'])
})

/** A fake Schemastery that records what the builder asks for. */
function fakeSchemastery(): SchemaBuilder & { fields?: Record<string, Record<string, unknown>> } {
  const node = (type: string, extra: Record<string, unknown> = {}): SchemaNode & Record<string, unknown> => {
    const n: Record<string, unknown> = { type, ...extra }
    n['min'] = (v: number) => { n['minimum'] = v; return n }
    n['step'] = (v: number) => { n['stepSize'] = v; return n }
    n['default'] = (v: unknown) => { n['defaultValue'] = v; return n }
    n['description'] = (v: string) => { n['text'] = v; return n }
    n['loose'] = () => { n['isLoose'] = true; return n }
    n['hidden'] = () => { n['isHidden'] = true; return n }
    n['volatile'] = () => { n['isVolatile'] = true; return n }
    return n as SchemaNode & Record<string, unknown>
  }
  const z: SchemaBuilder & { fields?: Record<string, Record<string, unknown>> } = {
    object: (fields) => { z.fields = fields as Record<string, Record<string, unknown>>; return { type: 'object', fields } },
    number: () => node('number'),
    string: () => node('string'),
    array: of => node('array', { of }),
    union: options => node('union', { options }),
    const: value => node('const', { value }),
  }
  return z
}

test('the Schemastery Config marks every field but threadsRoot volatile and every field loose, with parseConfig\'s minimums and the defaults', () => {
  const z = fakeSchemastery()
  buildConfigSchema(z)
  const fields = z.fields!
  for (const field of CONFIG_FIELDS) {
    const node = fields[field.key]!
    assert.equal(node['isVolatile'] === true, field.volatile, field.key)
    // Loose: a refused value resolves to the default instead of failing the load, as parseConfig falls back.
    assert.equal(node['isLoose'], true, field.key)
    assert.equal(node['isHidden'] === true, field.key === 'threadsRoot', field.key)
    if (field.min !== undefined) assert.equal(node['minimum'], field.min, field.key)
    if (field.integer === true) assert.equal(node['stepSize'], 1, field.key)
    if (field.key !== 'threadsRoot' && field.key !== 'coordinatorBase') {
      assert.deepEqual(node['defaultValue'], DEFAULT_CONFIG[field.key as keyof typeof DEFAULT_CONFIG], field.key)
    }
    assert.equal(typeof node['text'], 'string')
  }
  assert.deepEqual((fields['threadPermission']!['options'] as { value: string }[]).map(o => o.value), ['auto', 'ask'])
})

test('the live config reads Volatile values at every access and sanitizes them; threadsRoot is fixed at load', () => {
  const ref = <T>(value: T) => ({ value, get() { return this.value } })
  const running = ref(128)
  const tools = ref<string[]>(['mcp__x__y'])
  const raw = { maxRunningThreads: running, coordinatorExtraTools: tools, threadsRoot: '/legacy/root' }
  const changes: string[] = []
  const config = liveConfig(raw, {}, (key, value) => { changes.push(`${key}=${JSON.stringify(value)}`) })
  assert.equal(config.maxRunningThreads, 128)
  running.value = 7
  assert.equal(config.maxRunningThreads, 7, 'a change applies to the next read')
  assert.equal(config.maxRunningThreads, 7)
  assert.deepEqual(changes, ['maxRunningThreads=7'], 'reported once per change')
  running.value = -3
  assert.equal(config.maxRunningThreads, DEFAULT_CONFIG.maxRunningThreads, 'an invalid value falls back to the default')
  tools.value = ['mcp__x__y', 'bad name!']
  assert.deepEqual(config.coordinatorExtraTools, ['mcp__x__y'])
  raw.threadsRoot = '/elsewhere'
  assert.equal(config.threadsRoot, '/legacy/root')
  assert.equal(config.threadTurnBudget, 0)
})

test('Schemastery comes only from dsh\'s entry script and only from inside dsh\'s installation', () => {
  const entry = '/Apps/dsh.app/app.asar/dsh/node_modules/@deepseek-ai/dsh-desktop-host/lib/cli.js'
  assert.equal(dshRoot(entry), '/Apps/dsh.app/app.asar/dsh')
  const dshCopy = { number: () => 'dsh' } as unknown as SchemaBuilder
  const planted = { number: () => 'planted' } as unknown as SchemaBuilder
  const fake = (resolved: string, links: Record<string, string> = {}) => {
    const asked: string[] = []
    const loader: DshModuleLoader = {
      resolve: (from, id) => { asked.push(`${from} ${id}`); if (resolved === '') throw new Error('MODULE_NOT_FOUND'); return resolved },
      realpath: path => links[path] ?? path,
      load: (_from, file) => ({ default: file.startsWith('/Apps/') ? dshCopy : planted }),
    }
    return { loader, asked }
  }
  // dsh's own copy, resolved from dsh's entry script (never from this plugin's file).
  const ok = fake('/Apps/dsh.app/app.asar/dsh/node_modules/@deepseek-ai/schemastery/lib/index.cjs')
  assert.equal(schemasteryFromDsh(entry, ok.loader), dshCopy)
  assert.deepEqual(ok.asked, [`${entry} @deepseek-ai/schemastery`])
  // What Node would also find from there, outside dsh's installation, is refused: the user's home, the global folders.
  for (const outside of ['/Users/u/node_modules/@deepseek-ai/schemastery/index.js', '/Users/u/.node_modules/@deepseek-ai/schemastery/index.js', '/Apps/dsh.app/node_modules/@deepseek-ai/schemastery/index.js']) {
    assert.equal(schemasteryFromDsh(entry, fake(outside).loader), undefined, outside)
  }
  // A symlink inside dsh that points outside it is refused too (the real path counts).
  const link = '/Apps/dsh.app/app.asar/dsh/node_modules/@deepseek-ai/schemastery/index.js'
  assert.equal(schemasteryFromDsh(entry, fake(link, { [link]: '/Users/u/evil/index.js' }).loader), undefined)
  // Not found, or no entry: no Config, so the plugin runs without the form.
  assert.equal(schemasteryFromDsh(entry, fake('').loader), undefined)
  assert.equal(schemasteryFromDsh(undefined, ok.loader), undefined)
  assert.equal(schemasteryFromDsh('', ok.loader), undefined)
})

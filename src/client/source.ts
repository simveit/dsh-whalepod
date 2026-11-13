/**
 * Where the panel gets coordinator state from: the host Remote service, or an in-memory fake for UI work.
 *
 * The fake exists only in development builds (`DSH_COORDINATOR_DEV=1` at build time, which scripts/dev.sh sets); a
 * production build drops it, so no link can switch a user's panel to fake data (L6). Toggle (development builds,
 * per browser, survives reloads):
 *   ?coordinatorSource=fake   use the fake and remember it
 *   ?coordinatorSource=real   back to the host Remote and forget the choice
 *   localStorage['dsh-coordinator:source'] = 'fake' | 'real'
 * In fake mode, localStorage['dsh-coordinator:fake-real-session'] = <real Session id> gives the first fake
 * thread that Session, so opening it and the header chip work; other fake Session ids are not opened.
 * localStorage['dsh-coordinator:fake-coordinator-session'] = <real Session id> makes that Session the first fake
 * coordinator's chat, so the header button, the threads side pane and the sidebar row count can be tried there.
 * The fake has two coordinators; the second one's folder is refused until it is changed (folderProblem).
 * localStorage['dsh-coordinator:fake-scenario'] picks a starting state for UI work: `empty` (no coordinator yet),
 * `validating` (the host still validates its state for the first polls), `archived` (the second coordinator is
 * archived, and reopening it is refused once), `slow-pick` is read by index.tsx (the folder picker never answers),
 * `readme` (neutral demo content for the README screenshots: a weather CLI and a docs site, no notices).
 */
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
import type { CoordinatorInfo } from '../types.ts'
import type { EnsureCoordinatorResult, FolderDecision, ThreadInfo, ThreadPermission, ThreadPermissionState, ThreadStatus } from './contract.ts'
import type { ArchiveResult, ClientState, CoordinatorRemote } from './remote.ts'

export interface CoordinatorSource {
  readonly kind: 'remote' | 'fake'
  getState(signal?: AbortSignal): Promise<ClientState>
  /** Open the named coordinator (reopening an archived chat), else the last used one, else a new one. */
  ensureCoordinator(coordinatorId?: string, signal?: AbortSignal): Promise<EnsureCoordinatorResult>
  /** New coordinator; `home` from the folder picker, else the host picks `<base>/coordinator-N`. */
  createCoordinator(home?: string, signal?: AbortSignal): Promise<EnsureCoordinatorResult>
  setCoordinatorFolder(coordinatorId: string, path: string, signal?: AbortSignal): Promise<CoordinatorInfo>
  /** Standing instructions for the coordinator's new Executor Sessions; empty text clears them. */
  setExecutorPrompt(coordinatorId: string, text: string, signal?: AbortSignal): Promise<CoordinatorInfo>
  renameCoordinator(coordinatorId: string, name: string, signal?: AbortSignal): Promise<CoordinatorInfo>
  /** `force` also stops working Executor Sessions; `removeWorkspace` asks the host to remove its sidebar Workspace (files stay). */
  archiveCoordinator(coordinatorId: string, options: { force: boolean; removeWorkspace: boolean }, signal?: AbortSignal): Promise<ArchiveResult>
  archiveThread(id: string, signal?: AbortSignal): Promise<void>
  /** Remove an archived coordinator's entry; its Sessions, folders and files stay. */
  deleteCoordinator(coordinatorId: string, signal?: AbortSignal): Promise<void>
  setThreadPermission(mode: ThreadPermission, signal?: AbortSignal): Promise<ThreadPermissionState>
  confirmFolder(id: string, decision: FolderDecision, signal?: AbortSignal): Promise<void>
  removeAllowedFolder(path: string, signal?: AbortSignal): Promise<void>
  resumeThread(id: string, signal?: AbortSignal): Promise<void>
}


const STORAGE_KEY = 'dsh-coordinator:source'
const QUERY_KEY = 'coordinatorSource'

function readFlag(storageKey: string, queryKey: string): string | undefined {
  try {
    const query = new URLSearchParams(window.location.search).get(queryKey)
    if (query === 'real' || query === '0') { window.localStorage.removeItem(storageKey); return undefined }
    if (query !== null) { window.localStorage.setItem(storageKey, query); return query }
    return window.localStorage.getItem(storageKey) ?? undefined
  } catch {
    return undefined
  }
}

export function wantsFakeSource(): boolean {
  return __DSH_COORDINATOR_DEV__ && readFlag(STORAGE_KEY, QUERY_KEY) === 'fake'
}

/** Error with a message fit for the panel; `unreachable` marks transport or missing-method failures. */
export class SourceError extends Error {
  readonly unreachable: boolean
  constructor(message: string, unreachable: boolean) {
    super(message)
    this.unreachable = unreachable
  }
}

function unwrap<T>(result: RemoteResult<T>): T {
  if (result.ok) return result.value
  const { code, message } = result.error
  throw new SourceError(message || code, code === 'gateway/internal')
}

export function remoteSource(remote: () => CoordinatorRemote | undefined): CoordinatorSource {
  const get = (): CoordinatorRemote => {
    const value = remote()
    if (value === undefined) throw new SourceError('The coordinator service is not connected.', true)
    return value
  }
  // A transport fault rejects instead of resolving to an error envelope.
  const call = async <T>(run: () => Promise<RemoteResult<T>>): Promise<T> => {
    let result: RemoteResult<T>
    try {
      result = await run()
    } catch (error) {
      if (error instanceof SourceError) throw error
      throw new SourceError(error instanceof Error ? error.message : String(error), true)
    }
    return unwrap(result)
  }
  return {
    kind: 'remote',
    getState: signal => call(() => get().getState(signal)),
    // Requests are always sent as objects, so the host never has to accept a missing parameter.
    ensureCoordinator: (coordinatorId, signal) => call(() => get().ensureCoordinator(coordinatorId === undefined ? {} : { coordinatorId }, signal)),
    createCoordinator: (home, signal) => call(() => get().createCoordinator(home === undefined ? {} : { home }, signal)),
    setCoordinatorFolder: (coordinatorId, path, signal) => call(() => get().setCoordinatorFolder({ coordinatorId, path }, signal)),
    setExecutorPrompt: (coordinatorId, text, signal) => call(() => get().setExecutorPrompt({ coordinatorId, text }, signal)),
    renameCoordinator: (coordinatorId, name, signal) => call(() => get().renameCoordinator({ coordinatorId, name }, signal)),
    archiveCoordinator: (coordinatorId, { force, removeWorkspace }, signal) => call(() => get().archiveCoordinator({
      coordinatorId, ...(force ? { force } : {}), ...(removeWorkspace ? { removeWorkspace } : {}),
    }, signal)),
    archiveThread: async (id, signal) => { await call(() => get().archiveThread(id, signal)) },
    deleteCoordinator: async (coordinatorId, signal) => { await call(() => get().deleteCoordinator({ coordinatorId }, signal)) },
    setThreadPermission: (mode, signal) => call(() => get().setThreadPermission(mode, signal)),
    confirmFolder: async (id, decision, signal) => { await call(() => get().confirmFolder({ id, decision }, signal)) },
    removeAllowedFolder: async (path, signal) => { await call(() => get().removeAllowedFolder(path, signal)) },
    resumeThread: async (id, signal) => { await call(() => get().resumeThread(id, signal)) },
  }
}

const HOME = '/Users/dev'
const BASE = `${HOME}/Documents/deepseek-harness`
const FINISHED: readonly ThreadStatus[] = ['done', 'failed', 'stopped']
/** A few of the host's built-in names, enough for the fake's New coordinator. */
const FAKE_NAMES = ['Noether', 'Feynman', 'Hypatia', 'Borges', 'Lovelace', 'Tagore', 'Austen', 'Turing', 'Curie', 'Kant']
const PROMPT_LIMIT = 4000

/** In-memory fake that changes over time, so polling, sorting and transitions are visible without a host (development builds). */
export function fakeSource(): CoordinatorSource {
  const now = Date.now()
  const min = 60_000
  let revision = 1
  let permission: ThreadPermission = 'auto'
  // Optional real Session ids, so opening them, the header chip, the pane and the row count can be tried in fake mode.
  let realSession: string | undefined
  let realCoordinator: string | undefined
  let scenario: string | undefined
  try {
    realSession = window.localStorage.getItem('dsh-coordinator:fake-real-session') ?? undefined
    realCoordinator = window.localStorage.getItem('dsh-coordinator:fake-coordinator-session') ?? undefined
    scenario = window.localStorage.getItem('dsh-coordinator:fake-scenario') ?? undefined
  } catch { /* no storage */ }
  const A = 'c-1a2b'
  const B = 'c-7f3e'
  const coordinators: CoordinatorInfo[] = [
    { id: B, sessionId: 'fake-coordinator-7f3e', name: 'Feynman', title: 'Release 0.4', home: `${BASE}/coordinator-feynman`,
      folder: `${HOME}/Library/Mobile Documents/coordinator-2`, folderProblem: 'the folder is inside ~/Library, which is refused',
      createdAt: now - 70 * min, updatedAt: now - 6 * min },
    { id: A, sessionId: realCoordinator ?? 'fake-coordinator-1a2b', name: 'Noether', title: 'Noether', home: `${BASE}/coordinator-noether`, folder: `${BASE}/coordinator-noether`,
      model: { ok: false, reason: 'model-unavailable', model: 'deepseek-official/deepseek-v4.1-flash' },
      executorPrompt: 'Write tests before you change code.\nKeep commits small and explain each one in a sentence.\nAsk the coordinator before adding a dependency.',
      createdAt: now - 26 * 60 * min, updatedAt: now - 1 * min },
  ]
  let lastCoordinatorId: string | undefined = A
  const threads: ThreadInfo[] = [
    { id: 't-3f9a', coordinatorId: A, sessionId: realSession ?? 'fake-session-3f9a', title: 'Fix flaky upload test in api-gateway', cwd: `${HOME}/dev/api-gateway`,
      status: 'waiting-approval', statusDetail: 'Wants to run: git push origin fix/flaky-upload',
      createdAt: now - 42 * min, updatedAt: now - 2 * min },
    { id: 't-81c2', coordinatorId: A, sessionId: 'fake-session-81c2', title: 'Benchmark the new tokenizer against main', cwd: `${HOME}/dev/tokenizer-bench`,
      status: 'running', lastReport: { kind: 'progress', text: 'Ran 3 of 8 shapes; main is 4% faster on short inputs so far.', at: now - 1 * min },
      createdAt: now - 18 * min, updatedAt: now - 1 * min },
    { id: 't-c07e', coordinatorId: B, sessionId: 'fake-session-c07e', title: 'Draft release notes for 0.4', cwd: `${HOME}/dev/website/content/releases`,
      status: 'waiting-question', statusDetail: 'Should the breaking config rename go first or under "Changes"?',
      createdAt: now - 65 * min, updatedAt: now - 6 * min },
    { id: 't-5d10', coordinatorId: A, sessionId: 'fake-session-5d10', title: 'Upgrade eslint to v10 and fix the new warnings in every package', cwd: `${HOME}/dev/monorepo`,
      status: 'idle', lastReport: { kind: 'progress', text: 'Waiting for the coordinator to confirm the rule set.', at: now - 25 * min },
      createdAt: now - 3 * 60 * min, updatedAt: now - 25 * min },
    { id: 't-a442', coordinatorId: B, sessionId: 'fake-session-a442', title: 'Summarise open issues labelled perf', cwd: `${HOME}/dev/notes`,
      status: 'done', lastReport: { kind: 'result', text: 'Wrote notes/perf-issues.md: 14 issues in 4 groups.', at: now - 50 * min },
      createdAt: now - 2 * 60 * min, updatedAt: now - 50 * min },
    { id: 't-0b77', coordinatorId: A, sessionId: 'fake-session-0b77', title: 'Reproduce the OOM on the nightly build', cwd: `${HOME}/dev/nightly-oom`,
      status: 'failed', statusDetail: 'Build machine unreachable after 3 attempts',
      createdAt: now - 26 * 60 * min, updatedAt: now - 23 * 60 * min },
    // Stopped by the user while two of its teammates still work: archiving the coordinator must stop them too (L5).
    { id: 't-2b40', coordinatorId: A, sessionId: 'fake-session-2b40', title: 'Translate the docs into German', cwd: `${HOME}/dev/docs-de`,
      status: 'stopped', statusDetail: 'stopped by you', team: { members: 3, working: 2 },
      createdAt: now - 5 * 60 * min, updatedAt: now - 40 * min },
    { id: 't-77aa', coordinatorId: A, sessionId: '', title: 'Fix the build script', cwd: `${HOME}/dev/build-tools`,
      status: 'needs-user', statusDetail: `confirm folder ${HOME}/dev/build-tools`, action: { kind: 'confirm-folder', path: `${HOME}/dev/build-tools`, why: 'outside' },
      createdAt: now - 3 * min, updatedAt: now - 3 * min },
    { id: 't-9c01', coordinatorId: B, sessionId: 'fake-session-9c01', title: 'Poll the flaky CI job', cwd: `${BASE}/coordinator-hypatia/poll-ci`,
      status: 'needs-user', statusDetail: 'paused after 12 wake-ups', action: { kind: 'resume', reason: 'wakes', count: 12 },
      createdAt: now - 90 * min, updatedAt: now - 4 * min },
    // A row whose coordinator record was dropped by validation: only Archive applies.
    { id: 't-4e12', coordinatorId: '', sessionId: 'fake-session-4e12', title: 'Old experiment from a removed coordinator', cwd: `${BASE}/coordinator-noether/old-experiment`,
      status: 'idle', createdAt: now - 5 * 24 * 60 * min, updatedAt: now - 4 * 24 * 60 * min },
  ]
  let allowed: string[] = scenario === 'readme' ? [] : [`${HOME}/dev/website`]
  // Scenarios for UI work (see the file comment).
  let validatingPolls = scenario === 'validating' ? 6 : 0
  let refuseReopen = scenario === 'archived'
  if (scenario === 'empty') { coordinators.length = 0; threads.length = 0 }
  if (scenario === 'readme') {
    const docs = `${BASE}/coordinator-noether`
    coordinators.splice(0, coordinators.length,
      { id: B, sessionId: 'fake-coordinator-7f3e', name: '李白', title: '李白', home: `${BASE}/coordinator-li-bai`,
        folder: `${BASE}/coordinator-li-bai`, createdAt: now - 70 * min, updatedAt: now - 6 * min },
      { id: A, sessionId: realCoordinator ?? 'fake-coordinator-1a2b', name: 'Noether', title: 'Noether', home: docs, folder: docs,
        executorPrompt: 'Write tests before you change code.\nKeep commits small and explain each one in a sentence.\nAsk the coordinator before adding a dependency.',
        createdAt: now - 26 * 60 * min, updatedAt: now - 1 * min })
    const row = (id: string, coordinatorId: string, title: string, folder: string, over: Partial<ThreadInfo>): ThreadInfo =>
      ({ id, coordinatorId, sessionId: `fake-session-${id}`, title, cwd: `${docs}/${folder}`, status: 'idle', createdAt: now - 60 * min, updatedAt: now - 10 * min, ...over })
    threads.splice(0, threads.length,
      row('t-3f9a', A, 'Parse the forecast API responses', 'forecast-parser', { sessionId: realSession ?? 'fake-session-3f9a', status: 'waiting-approval',
        statusDetail: 'Wants to run: npm install undici', updatedAt: now - 2 * min, permission: 'auto' }),
      row('t-77aa', A, 'Import the station list', 'stations', { sessionId: '', cwd: '/Volumes/Data/weather-stations', status: 'needs-user', updatedAt: now - 3 * min,
        statusDetail: 'confirm folder /Volumes/Data/weather-stations', action: { kind: 'confirm-folder', path: '/Volumes/Data/weather-stations', why: 'outside' } }),
      row('t-81c2', A, 'Add a --units flag with metric and imperial output', 'units-flag', { status: 'running', updatedAt: now - 1 * min,
        lastReport: { kind: 'progress', text: 'Flag parsing done; converting the hourly table next.', at: now - 1 * min }, team: { members: 2, working: 2 } }),
      row('t-5d10', A, 'Write the usage section of the README', 'readme', { status: 'idle', updatedAt: now - 25 * min,
        lastReport: { kind: 'progress', text: 'Waiting for the final flag names.', at: now - 25 * min } }),
      row('t-a442', A, 'Set up CI for macOS and Linux', 'ci', { status: 'done', updatedAt: now - 50 * min,
        lastReport: { kind: 'result', text: 'Both runners pass; the workflow caches npm.', at: now - 50 * min } }),
      row('t-0b77', A, 'Record a short terminal demo', 'demo', { status: 'failed', updatedAt: now - 3 * 60 * min,
        statusDetail: 'The recorder is not installed on this machine.' }),
      row('t-c07e', B, 'Draft the getting-started page', 'getting-started', { status: 'running', updatedAt: now - 4 * min,
        lastReport: { kind: 'progress', text: 'Outline approved; writing the install steps.', at: now - 4 * min } }),
      row('t-9c01', B, 'Check the docs for broken links', 'links', { status: 'done', updatedAt: now - 30 * min,
        lastReport: { kind: 'result', text: 'Fixed 6 links in 4 pages.', at: now - 30 * min } }),
    )
  }
  // Archived rows, newest first, as the host lists them for the page's Archived group.
  const archivedRows: ThreadInfo[] = [
    { id: 't-61d0', coordinatorId: A, sessionId: 'fake-session-61d0', title: 'Try the old build cache', cwd: `${HOME}/dev/build-cache`, status: 'done',
      lastReport: { kind: 'result', text: 'Cache hit rate 82%; kept the old setup.', at: now - 2 * 24 * 60 * min }, createdAt: now - 3 * 24 * 60 * min, updatedAt: now - 2 * 24 * 60 * min },
    { id: 't-61d1', coordinatorId: A, sessionId: 'fake-session-61d1', title: 'Rename the config keys', cwd: `${HOME}/dev/config-rename`, status: 'stopped',
      statusDetail: 'stopped by you', createdAt: now - 4 * 24 * 60 * min, updatedAt: now - 3 * 24 * 60 * min },
  ]
  if (scenario === 'archived') {
    Object.assign(coordinators[0]!, { archived: true, chatArchived: true, sessionId: null, chat: 'archived', folderProblem: undefined })
    for (let i = threads.length - 1; i >= 0; i--) if (threads[i]!.coordinatorId === B) { archivedRows.unshift({ ...threads[i]!, status: FINISHED.includes(threads[i]!.status) ? threads[i]!.status : 'stopped', action: undefined }); threads.splice(i, 1) }
    // A coordinator that never had a chat (for example adopted from a state file without one).
    coordinators.push({ id: 'c-0n0c', sessionId: null, name: 'Tagore', title: 'Tagore', chat: 'none', home: `${BASE}/coordinator-tagore`, folder: `${BASE}/coordinator-tagore`,
      createdAt: now - 10 * min, updatedAt: now - 10 * min })
  }
  if (scenario === 'readme' || scenario === 'empty') archivedRows.length = 0
  let nextId = 0x9a00
  const hex = () => (nextId++).toString(16)
  // Every few polls one thread moves on, as a real host would report.
  const script: ((at: number) => void)[] = [
    at => { const t = threads.find(x => x.id === 't-81c2'); if (t) Object.assign(t, { lastReport: { kind: 'progress', text: 'Ran 6 of 8 shapes; results are within noise on long inputs.', at }, updatedAt: at }) },
    at => { if (coordinators.some(c => c.id === B && c.archived !== true)) threads.unshift({ id: 't-e9d3', coordinatorId: B, sessionId: 'fake-session-e9d3', title: 'Check licence headers in vendored code', cwd: `${HOME}/dev/monorepo/vendor`, status: 'starting', createdAt: at, updatedAt: at }) },
    at => { const t = threads.find(x => x.id === 't-e9d3'); if (t) Object.assign(t, { status: 'running', statusDetail: 'Scanning 212 files', updatedAt: at }) },
    at => { const t = threads.find(x => x.id === 't-5d10'); if (t) Object.assign(t, { status: 'needs-user', statusDetail: 'Coordinator: two rules conflict with the style guide; pick one.', updatedAt: at }) },
    at => { const t = threads.find(x => x.id === 't-81c2'); if (t) Object.assign(t, { status: 'done', statusDetail: undefined, lastReport: { kind: 'result', text: 'No regression: new tokenizer within 1% of main on all 8 shapes.', at }, updatedAt: at }) },
  ]
  let polls = 0
  const tick = () => {
    polls += 1
    if (polls % 4 === 0 && script.length > 0 && scenario !== 'readme') { script.shift()!(Date.now()); revision += 1 }
  }
  const delay = (signal?: AbortSignal) => new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, 120)
    signal?.addEventListener('abort', () => { clearTimeout(timer); reject(signal.reason) }, { once: true })
  })
  const find = (id: string): CoordinatorInfo => {
    const record = coordinators.find(c => c.id === id)
    if (record === undefined) throw new SourceError(`Unknown coordinator ${id}`, false)
    return record
  }
  // Live first, newest first; archived last, as the host orders them.
  const ordered = () => [...coordinators].sort((a, b) => Number(a.archived ?? false) - Number(b.archived ?? false) || b.createdAt - a.createdAt)
  // Roughly the host's checks (design 3.5), enough to show the refusal path.
  const refusal = (path: string): string | undefined => {
    if (!path.startsWith('/')) return 'the path must be absolute'
    const trimmed = path.replace(/\/+$/, '')
    if (trimmed === '' || trimmed === HOME || HOME.startsWith(`${trimmed}/`)) return 'the home folder and its parents are refused'
    if (trimmed.split('/').some(part => part.startsWith('.'))) return 'folders inside dot folders are refused'
    if (trimmed.startsWith(`${HOME}/Library`)) return 'folders inside ~/Library are refused'
    return undefined
  }
  const create = (home?: string): EnsureCoordinatorResult => {
    if (home !== undefined) {
      const why = refusal(home)
      if (why !== undefined) throw new SourceError(`This folder can't be a coordinator's home: ${why}.`, false)
    }
    const at = Date.now()
    const id = `c-${hex()}`
    const live = new Set(coordinators.filter(c => c.archived !== true).map(c => c.name))
    const free = FAKE_NAMES.filter(n => !live.has(n))
    const name = free.length > 0 ? free[Math.floor(Math.random() * free.length)]! : `Noether ${coordinators.length + 1}`
    const path = home ?? `${BASE}/coordinator-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    coordinators.push({ id, sessionId: `fake-coordinator-${id}`, name, title: name, home: path, folder: path, createdAt: at, updatedAt: at })
    lastCoordinatorId = id
    revision += 1
    return { coordinatorId: id, sessionId: `fake-coordinator-${id}` }
  }
  const clone = (): ClientState => validatingPolls > 0 ? { coordinators: [], threads: [], revision, loading: true } : ({
    coordinators: ordered().map(c => ({ ...c, chat: c.chat ?? (c.sessionId === null ? 'archived' : 'open') })), lastCoordinatorId, base: { path: BASE },
    revision, threads: threads.map(t => ({ ...t })), archivedThreads: archivedRows.map(t => ({ ...t })),
    threadPermission: { mode: permission, autoAvailable: true, effective: permission },
    allowedFolders: [...allowed],
  })
  return {
    kind: 'fake',
    async getState(signal) {
      await delay(signal)
      if (validatingPolls > 0) { validatingPolls -= 1; if (validatingPolls === 0) revision += 1 } else tick()
      return clone()
    },
    async ensureCoordinator(coordinatorId, signal) {
      await delay(signal)
      const id = coordinatorId ?? lastCoordinatorId
      if (id === undefined) return create()
      const record = find(id)
      if (record.archived === true && refuseReopen) {
        // Once, so the refused-Reopen notice can be seen; the host refuses for example at 20 live coordinators.
        refuseReopen = false
        throw new SourceError('at most 20 coordinators; archive another one first', false)
      }
      if (record.sessionId === null || record.chatArchived === true) {
        Object.assign(record, { sessionId: `fake-coordinator-${record.id}-${hex()}`, chatArchived: undefined, archived: undefined, chat: 'open', updatedAt: Date.now() })
      }
      lastCoordinatorId = record.id
      revision += 1
      return { coordinatorId: record.id, sessionId: record.sessionId! }
    },
    async createCoordinator(home, signal) {
      await delay(signal)
      return create(home)
    },
    async setCoordinatorFolder(coordinatorId, path, signal) {
      await delay(signal)
      const record = find(coordinatorId)
      const why = refusal(path)
      if (why !== undefined) throw new SourceError(`This folder is refused: ${why}.`, false)
      Object.assign(record, { folder: path.replace(/\/+$/, ''), folderProblem: undefined, updatedAt: Date.now() })
      revision += 1
      return { ...record }
    },
    async setExecutorPrompt(coordinatorId, text, signal) {
      await delay(signal)
      const record = find(coordinatorId)
      // The host strips NUL and control characters other than newline and tab.
      const clean = text.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '')
      if (clean.length > PROMPT_LIMIT) throw new SourceError(`the executor prompt is longer than ${PROMPT_LIMIT} characters`, false)
      if (clean.trim() === '') delete record.executorPrompt
      else record.executorPrompt = clean
      record.updatedAt = Date.now()
      revision += 1
      return { ...record }
    },
    async renameCoordinator(coordinatorId, name, signal) {
      await delay(signal)
      const record = find(coordinatorId)
      const trimmed = name.trim()
      if (trimmed === '' || trimmed.length > 40) throw new SourceError('a name has 1 to 40 characters', false)
      if (/[\u0000-\u001f\u007f]/.test(trimmed)) throw new SourceError('a name cannot contain control characters', false)
      if (coordinators.some(c => c.id !== coordinatorId && c.archived !== true && c.name.toLowerCase() === trimmed.toLowerCase())) {
        throw new SourceError(`another coordinator is already called ${trimmed}`, false)
      }
      Object.assign(record, { name: trimmed, title: record.title === record.name ? trimmed : record.title, updatedAt: Date.now() })
      revision += 1
      return { ...record }
    },
    async archiveCoordinator(coordinatorId, { force, removeWorkspace }, signal) {
      await delay(signal)
      const record = find(coordinatorId)
      const own = threads.filter(t => t.coordinatorId === coordinatorId)
      // The host's rule: idle and finished rows do not count, a folder confirmation and working teammates do.
      const working = own.filter(t => t.action?.kind === 'confirm-folder' || (t.team?.working ?? 0) > 0 || !['idle', ...FINISHED].includes(t.status))
      if (working.length > 0 && !force) {
        throw new SourceError(`Still working: ${working.map(t => t.title).join(', ')}. Stop them first or archive anyway.`, false)
      }
      for (const thread of own) {
        threads.splice(threads.indexOf(thread), 1)
        archivedRows.unshift({ ...thread, status: FINISHED.includes(thread.status) ? thread.status : 'stopped', action: undefined })
      }
      Object.assign(record, { archived: true, chatArchived: true, sessionId: null, chat: 'archived', updatedAt: Date.now() })
      if (lastCoordinatorId === coordinatorId) lastCoordinatorId = coordinators.find(c => !c.archived)?.id
      revision += 1
      // The host keeps a Workspace another live coordinator shares, or one with the user's own Sessions (the legacy home here).
      const shared = coordinators.some(c => c.id !== coordinatorId && c.archived !== true && c.home === record.home)
      const workspace = !removeWorkspace ? 'not-asked' as const : shared ? 'kept-shared' as const
        : record.home === `${BASE}/coordinator-noether` ? 'kept-has-sessions' as const : 'removed' as const
      return { archived: coordinatorId, threads: own.map(t => t.id), workspace }
    },
    async archiveThread(id, signal) {
      await delay(signal)
      const index = threads.findIndex(t => t.id === id)
      if (index < 0) throw new SourceError(`Unknown Executor Session ${id}`, false)
      const thread = threads[index]!
      if (thread.coordinatorId !== '' && !FINISHED.includes(thread.status)) throw new SourceError('Only finished Executor Sessions can be archived.', false)
      threads.splice(index, 1)
      archivedRows.unshift(thread)
      revision += 1
    },
    async deleteCoordinator(coordinatorId, signal) {
      await delay(signal)
      const record = find(coordinatorId)
      // The host's checks and wording.
      if (record.archived !== true) throw new SourceError('only an archived coordinator can be deleted; archive it first', false)
      if (threads.some(t => t.coordinatorId === coordinatorId)) throw new SourceError('this coordinator still has live Executor Sessions; archive them first', false)
      coordinators.splice(coordinators.indexOf(record), 1)
      for (let i = archivedRows.length - 1; i >= 0; i--) if (archivedRows[i]!.coordinatorId === coordinatorId) archivedRows.splice(i, 1)
      revision += 1
    },
    async setThreadPermission(mode, signal) {
      await delay(signal)
      permission = mode
      revision += 1
      return { mode, autoAvailable: true, effective: mode }
    },
    async confirmFolder(id, decision, signal) {
      await delay(signal)
      const thread = threads.find(t => t.id === id && t.action?.kind === 'confirm-folder')
      if (thread === undefined) throw new SourceError('This Executor Session does not wait for a folder confirmation.', false)
      if (decision === 'deny') threads.splice(threads.indexOf(thread), 1)
      else {
        if (decision === 'always') allowed = [...allowed, thread.cwd]
        Object.assign(thread, { sessionId: `fake-session-${id}`, status: 'running', statusDetail: undefined, action: undefined, updatedAt: Date.now() })
      }
      revision += 1
    },
    async removeAllowedFolder(path, signal) {
      await delay(signal)
      allowed = allowed.filter(f => f !== path)
      revision += 1
    },
    async resumeThread(id, signal) {
      await delay(signal)
      const thread = threads.find(t => t.id === id && t.action?.kind === 'resume')
      if (thread !== undefined) Object.assign(thread, { status: 'running', statusDetail: undefined, action: undefined, updatedAt: Date.now() })
      revision += 1
    },
  }
}

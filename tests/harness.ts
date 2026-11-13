/**
 * A fake dsh host context for ThreadService tests: sessions, agents, workspaces, tools, prompt sections and events,
 * in memory. Only the members the plugin declares in src/host/dsh.ts are implemented. Folders are real, inside
 * tests/_scratch/<name>, so the folder guard and mkdir run against the disk without leaving the workspace.
 */
import { mkdirSync, realpathSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ToolDefinition, UserMessage } from '../src/host/dsh.ts'
import { parseConfig, type CoordinatorConfig } from '../src/host/ids.ts'
import { TOOL, toolKey } from '../src/host/names.ts'
import { ThreadService, type ThreadServiceDeps } from '../src/host/threads.ts'

export interface LogEvent { type: string; seq: number; time?: number; data: unknown }

let counter = 0

export class FakeAgent {
  readonly id: string
  status: 'idle' | 'running' = 'idle'
  readonly session: { id: string; header: { cwd?: string; agentPreset?: string; origin?: string; parentSession?: string }; append: (type: string, data: unknown) => LogEvent }
  /** Global tool names this agent's preset adds (the fake registry's preset layer). */
  presetTools: string[] = ['read', 'glob', 'grep', 'bash', 'write', 'edit', 'subagent', 'web_fetch', 'todo_write', 'ask_user_question', 'plugin_manager']
  /** The allow list applied with `ctx.tools.restrict`, if any. */
  restriction: readonly string[] | undefined
  /** The deny list applied with `ctx.tools.restrict`, if any. */
  denied: readonly string[] | undefined
  readonly ctx: { tools: { restrict: (filter: { allow?: readonly string[]; deny?: readonly string[] }) => () => void } }
  readonly log: LogEvent[] = []
  readonly inbox = { nextTurn: [] as UserMessage[], nextStep: [] as UserMessage[] }
  /** Every message handed to the agent, with how. */
  readonly received: { how: 'followup' | 'steer' | 'inject' | 'prompt'; message: UserMessage }[] = []
  selected: { provider: string; model: string } | undefined
  readonly model = {
    current: () => this.selected ?? { provider: 'p', model: 'm' },
    select: (s: { provider: string; model: string }) => { this.selected = s },
  }
  title = ''
  preset = 'default'
  teams = false
  private readonly host: FakeHost

  constructor(host: FakeHost, id: string, cwd: string, agentPreset: string) {
    this.host = host
    this.id = id
    this.session = { id, header: { cwd, agentPreset }, append: (type, data) => this.append(type, data) }
    this.ctx = {
      tools: {
        restrict: (filter) => {
          // As dsh-tools: unknown global names are refused, listing the known ones.
          const known = [...new Set([...host.tools.map(t => t.def.name), ...host.globalTools, ...this.presetTools])].sort()
          const unknown = [...(filter.allow ?? []), ...(filter.deny ?? [])].filter(name => !known.includes(name))
          if (unknown.length > 0) throw new Error(`tools.restrict() names unknown global tool ${unknown.map(n => `"${n}"`).join(', ')}; known global tools: ${known.join(', ')}`)
          // As dsh, every change of a tool layer emits `tools/change` synchronously.
          if (filter.deny !== undefined) {
            const deny = [...filter.deny]
            this.denied = deny
            host.emit('tools/change')
            return () => { if (this.denied === deny) { this.denied = undefined; host.emit('tools/change') } }
          }
          const allow = [...(filter.allow ?? [])]
          this.restriction = allow
          host.emit('tools/change')
          return () => { if (this.restriction === allow) { this.restriction = undefined; host.emit('tools/change') } }
        },
      },
    }
  }

  /** Tool names this agent sees (registered global and preset tools, after its restriction). */
  visibleTools(): string[] {
    const all = [...new Set([...this.host.tools.map(t => t.def.name), ...this.host.globalTools, ...this.presetTools])]
    return all.filter(name => (this.restriction === undefined || this.restriction.includes(name)) && !(this.denied ?? []).includes(name)).sort()
  }

  append(type: string, data: unknown): LogEvent {
    const event = { type, seq: this.log.length + 1, time: this.host.now, data }
    this.log.push(event)
    this.host.emit('session/event', this.session, event)
    return event
  }

  /** Injected messages dsh has not logged yet: they enter the log inside the next turn's first step, as in dsh. */
  readonly pendingInjects: UserMessage[] = []

  private take(how: 'followup' | 'steer' | 'inject' | 'prompt', message: UserMessage): void {
    this.received.push({ how, message })
    if (how === 'followup' && message.id.startsWith('dsh-coordinator:opening:')) {
      // As rc.2 with the plugin's opening-turn gate: the turn starts and ends, its step enters with no messages, so
      // the opening message itself is never logged.
      this.append('turn/start', { turn: 1 })
      this.append('turn/end', { reason: { kind: 'completed' } })
      return
    }
    if (how === 'inject' && this.status !== 'running') {
      // dsh splices an inject into the inbox at once and logs it as a user/message only when a step admits it.
      this.pendingInjects.push(message)
      this.append('agent/inbox/spliced', { target: 'next-step', start: 0, inserted: [message] })
      return
    }
    this.append('user/message', message)
  }

  /** Log the injects the first step of a turn admits (dsh: the accepted batch follows step/start). */
  admitInjects(): void {
    for (const message of this.pendingInjects.splice(0)) this.append('user/message', message)
  }

  /** Calls of `cancel`, newest last. */
  readonly cancels: { kind: string }[] = []
  cancel(cause: { kind: string }): void {
    this.cancels.push(cause)
    if (this.status === 'running') this.endTurn('aborted')
  }

  followup(message: UserMessage): void { this.take('followup', message) }
  steer(message: UserMessage): void { this.take('steer', message) }
  inject(message: UserMessage): void { this.take('inject', message) }
  prompt(message: UserMessage): void { this.take('prompt', message) }
  /** As dsh: resolves once no turn runs (tests end a turn with endTurn or by setting `status`). */
  whenIdle(): Promise<void> {
    return new Promise((resolve) => {
      const check = (): void => { if (this.status === 'idle') resolve(); else (setTimeout(check, 1) as { unref?: () => void }).unref?.() }
      check()
    })
  }

  /** Simulate a turn: start, optional events, end. */
  startTurn(): void {
    this.status = 'running'
    this.host.emit('agent/status', { agent: this, status: 'running' })
    this.append('turn/start', { turn: 1 })
    this.admitInjects()
  }

  endTurn(kind = 'completed', text?: string): void {
    if (text !== undefined) this.append('assistant/message', { message: { role: 'assistant', content: [{ type: 'text', text }] } })
    this.append('turn/end', { reason: { kind } })
    this.status = 'idle'
    this.host.emit('agent/status', { agent: this, status: 'idle' })
  }
}

interface FakeWorkspace {
  id: string
  path: string
  title: string
  sessionIds: string[]
  setTitle(title: string): Promise<void>
  attachSession?(sessionId: string): Promise<void>
}

export class FakeHost {
  now = 1_000_000
  readonly listeners = new Map<string, { fn: (...args: never[]) => unknown; prepend: boolean }[]>()
  readonly disposers: (() => void)[] = []
  readonly agentsById = new Map<string, FakeAgent>()
  readonly workspaces: FakeWorkspace[] = []
  readonly archived: string[] = []
  readonly tools: { def: ToolDefinition; when: (c: { agent: { id: string } }) => boolean }[] = []
  readonly sections: { text: (c: { agent?: { id: string } }) => string }[] = []
  readonly services = new Map<string, unknown>()
  readonly presets = new Map<string, string>()
  /** Set to make the next call of a controller method throw. */
  failNext: Partial<Record<'rename' | 'create' | 'setEnabled', Error>> = {}
  /** Members interrupted through the subagents service. */
  readonly interrupts: string[] = []
  /** Global tools of other plugins and MCP servers (names only). */
  globalTools: string[] = ['terminal_open', 'terminal_send', 'create_worktree', 'session_search', 'mcp__files__write', 'working_directory']
  /** Monotonic tool guards registered with `ctx.tools.guard`. */
  readonly guards: ((exec: unknown) => string | undefined)[] = []
  /** Questions raised with `ctx.userQuestions.ask`, waiting for an answer. */
  readonly questions: { request: { questions: { id?: string; question: string; options?: { label: string }[] }[]; agent?: { id: string } }; answer: (label: string, id?: string) => void; raw: (answer: unknown) => void; cancelled: boolean }[] = []
  /** Agent presets known to the fake registry, and registrations/recompositions it saw. */
  readonly presetNames = new Set(['standard', 'minimal'])
  readonly presetLog: string[] = []
  /** Sessions stored on disk but not loaded (a cold start): readable, and resumed by resolveAgent. */
  readonly cold = new Map<string, { header: FakeAgent['session']['header']; log: LogEvent[] }>()
  creates = 0
  /** Sessions created with a cwd that is no Workspace (dsh lists them under Ungrouped). */
  readonly ungrouped: string[] = []
  /** Every `sessionController.create` request, in order. */
  readonly createRequests: { workspaceId?: string; cwd?: string; agentPreset?: string }[] = []

  readonly ctx: Record<string, unknown>

  constructor() {
    const host = this
    this.services.set('permissionPresets', {
      names: ['default', 'workspace-write', 'danger-full-access', 'auto'],
      set: (session: { id: string }, name: string) => { host.presets.set(session.id, name) },
      current: (session: { id: string }) => host.presets.get(session.id) ?? 'default',
    })
    this.services.set('agentTeams', {
      setEnabled: async (agent: FakeAgent) => {
        const error = host.failNext.setEnabled
        if (error !== undefined) { delete host.failNext.setEnabled; throw error }
        agent.teams = true
      },
      isEnabled: (agent: FakeAgent) => agent.teams,
    })
    this.services.set('userQuestions', {
      ask: (request: FakeHost['questions'][number]['request'] & { signal?: AbortSignal }) => new Promise((resolve, reject) => {
        // As dsh: the answer names the question it answers by its id.
        const entry = {
          request, cancelled: false,
          answer: (label: string, id: string = (request.questions[0] as { id?: string } | undefined)?.id ?? 'q') => resolve({ answers: [{ id, selected: [label] }] }),
          /** Resolve with any answer object (as a misbehaving answerer could). */
          raw: (answer: unknown) => resolve(answer),
        }
        host.questions.push(entry)
        request.signal?.addEventListener('abort', () => { entry.cancelled = true; reject(new Error('aborted')) }, { once: true })
      }),
    })
    this.services.set('agentPresets', {
      resolve: async (id: string) => {
        if (!host.presetNames.has(id)) throw new Error(`agent-preset/not-found: Unknown agent preset: ${id}`)
        return { id }
      },
      register: async (definition: { id: string }) => {
        host.presetNames.add(definition.id)
        host.presetLog.push(`register ${definition.id}`)
        return async () => { host.presetNames.delete(definition.id); host.presetLog.push(`unregister ${definition.id}`) }
      },
      recompose: async (ctx: unknown, id: string) => {
        const agent = [...host.agentsById.values()].find(a => a.ctx === ctx)
        if (agent !== undefined) agent.preset = id
        host.presetLog.push(`recompose ${agent?.id ?? '?'} ${id}`)
        return { id }
      },
    })
    this.services.set('subagents', {
      interrupt: (id: string, authority: { kind: string }) => {
        host.interrupts.push(id)
        host.agentsById.get(id)?.cancel({ kind: authority.kind === 'user' ? 'user' : 'parent' })
      },
    })
    this.ctx = {
      on: (name: string, fn: (...args: never[]) => unknown, options?: { prepend?: boolean }) => {
        const list = host.listeners.get(name) ?? []
        if (options?.prepend === true) list.unshift({ fn, prepend: true })
        else list.push({ fn, prepend: false })
        host.listeners.set(name, list)
        return () => {}
      },
      effect: (fn: () => (() => void) | void) => {
        const dispose = fn()
        if (typeof dispose === 'function') host.disposers.push(dispose)
        return () => {}
      },
      get: (name: string) => host.services.get(name),
      agents: { get: (id: string) => host.agentsById.get(id) },
      // subagents is read with ctx.get: see services.
      tools: {
        register: (def: ToolDefinition, options?: { when?: (c: { agent: { id: string } }) => boolean }) => {
          host.tools.push({ def, when: options?.when ?? (() => true) })
          return () => {}
        },
        guard: (fn: (exec: unknown) => string | undefined) => { host.guards.push(fn); return () => {} },
        definitions: (scope?: FakeAgent) => (scope === undefined
          ? [...host.tools.map(t => t.def.name), ...host.globalTools]
          : scope.visibleTools()).map(name => ({ name })),
      },
      systemPrompt: { section: (section: { text: (c: { agent?: { id: string } }) => string }) => { host.sections.push(section); return () => {} } },
      workspaceRegistry: {
        create: async (path: string, title?: string) => {
          const real = realpathSync.native(path)
          const found = host.workspaces.find(w => w.path === real)
          if (found !== undefined) return found
          const ws: FakeWorkspace = {
            id: `ws-${++counter}`, path: real, title: title ?? real.split('/').at(-1)!, sessionIds: [],
            setTitle: async (t: string) => { ws.title = t },
            attachSession: async (sessionId: string) => host.attach(ws, sessionId),
          }
          host.workspaces.push(ws)
          return ws
        },
        resolveByPath: async (path: string) => {
          let real: string
          // dsh resolves the real path first and rejects a folder that does not exist.
          real = realpathSync.native(path)
          return host.workspaces.find(w => w.path === real)
        },
        list: () => [...host.workspaces],
        insertBefore: async (id: string, beforeId?: string) => {
          const ws = host.workspaces.find(w => w.id === id)!
          host.workspaces.splice(host.workspaces.indexOf(ws), 1)
          const at = beforeId === undefined ? host.workspaces.length : host.workspaces.findIndex(w => w.id === beforeId)
          host.workspaces.splice(at, 0, ws)
          return host.workspaces.map(w => w.id)
        },
        delete: async (id: string) => {
          const at = host.workspaces.findIndex(w => w.id === id)
          if (at >= 0) host.workspaces.splice(at, 1)
          return at >= 0
        },
        archiveSession: async (sessionId: string, options?: { stopActivity?: boolean }) => {
          const agent = host.agentsById.get(sessionId)
          if (options?.stopActivity !== true && agent?.status === 'running') throw new Error('session is active')
          if (!host.archived.includes(sessionId)) host.archived.push(sessionId)
          if (agent !== undefined) agent.status = 'idle'
          host.emit('workspace/session-archived', { sessionId })
        },
        get archivedSessionIds() { return host.archived },
      },
      sessionController: {
        // As dsh rc.2 (dsh-api-session-controller commands.ts create): `workspaceId` or `cwd` (never both). Only a
        // `workspaceId` attaches the Session to that Workspace (its cwd is then the Workspace path); a cwd-only Session
        // is attached to no Workspace, even when its cwd is a registered Workspace's path, and is listed under
        // Ungrouped. Creating the Agent fires `agent/created`.
        create: async (request: { workspaceId?: string; cwd?: string; agentPreset?: string }) => {
          const error = host.failNext.create
          if (error !== undefined) { delete host.failNext.create; throw error }
          if (request.workspaceId !== undefined && request.cwd !== undefined) throw new Error('workspaceId and cwd are mutually exclusive')
          if (request.agentPreset !== undefined && !host.presetNames.has(request.agentPreset)) throw new Error(`agent-preset/not-found: Unknown agent preset: ${request.agentPreset}`)
          host.creates++
          const cwd = request.cwd === undefined ? undefined : realpathSync.native(request.cwd)
          const ws = request.workspaceId !== undefined ? host.workspaces.find(w => w.id === request.workspaceId)! : undefined
          const id = `session-${++counter}`
          const agent = new FakeAgent(host, id, ws?.path ?? cwd!, request.agentPreset ?? 'default')
          host.agentsById.set(id, agent)
          if (ws !== undefined) ws.sessionIds.unshift(id)
          else host.ungrouped.push(id)
          host.createRequests.push({ ...request })
          host.emit('agent/created', { agent })
          return { sessionId: id, agentPreset: request.agentPreset }
        },
        resolveAgent: async (id: string) => {
          const stored = host.cold.get(id)
          if (host.agentsById.get(id) === undefined && stored !== undefined) {
            const revived = new FakeAgent(host, id, stored.header.cwd ?? '/', stored.header.agentPreset ?? 'default')
            Object.assign(revived.session.header, stored.header)
            revived.log.push(...stored.log)
            host.cold.delete(id)
            host.agentsById.set(id, revived)
            host.emit('agent/created', { agent: revived })
          }
          const agent = host.agentsById.get(id)
          return agent === undefined ? { error: new Error('no session') } : { agent }
        },
        rename: async ({ sessionId, title }: { sessionId: string; title: string }) => {
          const error = host.failNext.rename
          if (error !== undefined) { delete host.failNext.rename; throw error }
          const agent = host.agentsById.get(sessionId)!
          agent.title = title
          agent.append('session/title', { title, source: { kind: 'user' } })
          return { title }
        },
        state: async () => ({ running: false, active: false, pendingInput: [] }),
        prompt: async (request: { requestId: string; sessionId: string; content: { type: 'text'; text: string }[] }) => {
          const agent = host.agentsById.get(request.sessionId)!
          if (agent.received.some(r => r.message.id === request.requestId)) return { accepted: true }
          agent.prompt({ id: request.requestId, role: 'user', content: request.content, source: { kind: 'user', rpcId: request.requestId } })
          return { accepted: true }
        },
        cancel: ({ sessionId }: { sessionId: string }) => {
          const agent = host.agentsById.get(sessionId)
          if (agent?.status === 'running') agent.endTurn('aborted')
          return { accepted: true }
        },
      },
      sessionQuery: {
        readSession: async (id: string) => {
          const agent = host.agentsById.get(id)
          const stored = host.cold.get(id)
          if (agent === undefined && stored !== undefined) return { events: [...stored.log], session: stored.header }
          if (agent === undefined) throw new Error('no session')
          return { events: [...agent.log], session: agent.session.header }
        },
        readTitle: async (id: string) => {
          const agent = host.agentsById.get(id)
          return agent === undefined || agent.title === '' ? undefined : { title: agent.title }
        },
      },
    }
  }

  emit(name: string, ...args: unknown[]): unknown {
    const list = this.listeners.get(name) ?? []
    if (name === 'agent/pre-step') {
      // Waterfall: the first listener gets a next() that calls the rest, ending in the default decision.
      const run = (i: number): unknown => (i >= list.length ? Promise.resolve({ kind: 'enter', messages: (args[0] as { messages: unknown[] }).messages, fromDefault: true })
        : (list[i]!.fn as (...a: unknown[]) => unknown)(args[0], () => run(i + 1)))
      return run(0)
    }
    for (const { fn } of list) (fn as (...a: unknown[]) => unknown)(...args)
    return undefined
  }

  agentOf(id: string): FakeAgent { return this.agentsById.get(id)! }

  /** dsh's membership rule (dsh-workspace attachSession): only a Session whose cwd is exactly the Workspace path. */
  async attach(ws: { path: string; sessionIds: string[] }, sessionId: string): Promise<void> {
    if (ws.sessionIds.includes(sessionId)) return
    const header = this.agentsById.get(sessionId)?.session.header ?? this.cold.get(sessionId)?.header
    if (header?.cwd === undefined) throw new Error(`unknown session ${sessionId}`)
    let real: string
    try { real = realpathSync.native(header.cwd) } catch { throw new Error(`cwd '${header.cwd}' does not resolve`) }
    if (real !== ws.path) throw new Error(`canonical cwd '${real}' differs from workspace path '${ws.path}'`)
    ws.sessionIds.unshift(sessionId)
    this.ungrouped.splice(this.ungrouped.indexOf(sessionId) >>> 0, this.ungrouped.includes(sessionId) ? 1 : 0)
  }

  /** Store a Session of another host as on disk but not loaded here (an app restart). */
  storeCold(agent: FakeAgent): void {
    this.cold.set(agent.id, { header: { ...agent.session.header }, log: [...agent.log] })
  }

  /** A user prompt typed in a session (source kind user with a browser rpcId), opening a turn. */
  userTurn(agent: FakeAgent, text: string): void {
    agent.status = 'running'
    agent.append('turn/start', { turn: 1 })
    agent.append('step/start', { turn: 1, step: 1 })
    agent.admitInjects()
    agent.append('user/message', { id: `u-${++counter}`, role: 'user', content: [{ type: 'text', text }], source: { kind: 'user', rpcId: `browser-${counter}` } })
  }

  /**
   * A team member (subagent) of `parent`: a child Session with a subagent header, announced in the creator's log by a
   * `subagent/catalog` event, as dsh's subagent runtime does.
   */
  addMember(parent: FakeAgent, name: string, label = `task of ${name}`): FakeAgent {
    const id = `member-${++counter}`
    const member = new FakeAgent(this, id, parent.session.header.cwd ?? '/', parent.session.header.agentPreset ?? 'default')
    member.session.header.origin = 'subagent'
    member.session.header.parentSession = parent.id
    this.agentsById.set(id, member)
    parent.append('subagent/catalog', { version: 3, childId: id, childCreatedAt: this.now, mode: 'continuable', label, name })
    return member
  }

  /**
   * The runtime's settlement of a member: its result goes to its creator's inbox (a next-turn splice when the creator
   * is idle) and becomes a `subagent-settled` message; an idle creator then starts a turn.
   */
  settle(member: FakeAgent, stopReason = 'completed'): UserMessage {
    const parent = this.agentsById.get(member.session.header.parentSession!)!
    const message: UserMessage = {
      id: `settled-${++counter}`, role: 'user', content: [{ type: 'text', text: `Background subagent finished. Its closing message: done by ${member.id}` }],
      source: { kind: 'subagent-settled', form: 'notice', summary: 'finished', stopReason, senderSessionId: member.id },
    }
    parent.append('agent/inbox/spliced', { target: parent.status === 'running' ? 'next-step' : 'next-turn', start: 0, inserted: [message] })
    return message
  }

  /** A coordinator turn woken by a thread notice. */
  noticeTurn(agent: FakeAgent): void {
    agent.status = 'running'
    agent.append('turn/start', { turn: 1 })
    agent.append('step/start', { turn: 1, step: 1 })
    agent.append('user/message', { id: `n-${++counter}`, role: 'user', content: [{ type: 'text', text: '[dsh-coordinator notice] …' }], source: { kind: 'agent-message', form: 'relay', senderSessionId: 'x' } })
  }

  /**
   * Run dsh's pre-dispatch policy for one call as the tools pipeline does: the `tools/pre-execute` waterfall, then
   * (when it allows) every guard. Returns the denial reason, or undefined when the call may run.
   */
  async policy(agent: FakeAgent, name: string, args: unknown): Promise<string | undefined> {
    const exec = { name, arguments: args, agent, callId: `c-${++counter}` }
    const list = this.listeners.get('tools/pre-execute') ?? []
    const run = (i: number): Promise<{ kind: string; reason?: string }> => (i >= list.length ? Promise.resolve({ kind: 'allow' })
      : (list[i]!.fn as (...a: unknown[]) => Promise<{ kind: string; reason?: string }>)(exec, () => run(i + 1)))
    const decision = await run(0)
    if (decision.kind !== 'allow') return decision.reason ?? decision.kind
    for (const guard of this.guards) {
      const reason = guard(exec)
      if (reason !== undefined) return reason
    }
    return undefined
  }

  toolsFor(sessionId: string): string[] {
    return this.tools.filter(t => t.when({ agent: { id: sessionId } })).map(t => t.def.name)
  }

  /**
   * A New Session the user makes in a Workspace (the "+" on a sidebar group): created and announced with
   * `agent/created`, with no turn yet.
   */
  newSession(workspacePath: string): FakeAgent {
    const real = realpathSync.native(workspacePath)
    const ws = this.workspaces.find(w => w.path === real)
    const id = `session-${++counter}`
    const agent = new FakeAgent(this, id, real, 'standard')
    this.agentsById.set(id, agent)
    if (ws !== undefined) ws.sessionIds.unshift(id)
    this.emit('agent/created', { agent })
    return agent
  }

  /**
   * Run a plugin tool as `sessionId`. Old `thread_*` names are mapped to the current ones (names.ts), so tests
   * written before the rename keep working.
   */
  async call(sessionId: string, name: string, args: Record<string, unknown>, callId = `call-${++counter}`): Promise<Record<string, unknown>> {
    const key = toolKey(name)
    if (key !== undefined) name = TOOL[key]
    const tool = this.tools.find(t => t.def.name === name && t.when({ agent: { id: sessionId } }))
    if (tool === undefined) throw new Error(`tool ${name} is not available to ${sessionId}`)
    return await tool.def.execute(args, { callId, agent: this.agentsById.get(sessionId) as never, signal: new AbortController().signal }) as Record<string, unknown>
  }

  dispose(): void {
    for (const d of this.disposers.splice(0).reverse()) d()
  }

  /** After dispose: forget the old service's registrations, as a fresh plugin load would see the host. */
  reset(): void {
    this.tools.length = 0
    this.sections.length = 0
    this.listeners.clear()
    this.guards.length = 0
  }
}

export const tick = (ms = 0) => new Promise(r => setTimeout(r, ms))

export interface Rig {
  host: FakeHost
  service: ThreadService
  dir: string
  root: string
  home: string
  stateFile: string
  config: CoordinatorConfig
}

const scratchRoot = join(fileURLToPath(new URL('.', import.meta.url)), '_scratch')

/** A fresh scratch folder for one test, inside the workspace. */
export function scratch(name: string): string {
  const dir = join(scratchRoot, name)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  return realpathSync.native(dir)
}

/** Build a ThreadService on a fake host; `before` may write a state file or add live agents first. */
export function rig(name: string, options: { config?: Record<string, unknown>; host?: FakeHost; dir?: string; deps?: Partial<ThreadServiceDeps>; prompts?: { coordinator: string; thread: string }; before?: (r: { host: FakeHost; stateFile: string; root: string; home: string }) => void } = {}): Rig {
  const dir = options.dir ?? scratch(name)
  const home = join(dir, 'home')
  const root = join(home, 'dsh-threads')
  mkdirSync(root, { recursive: true })
  const stateFile = join(dir, 'state', 'state.json')
  const host = options.host ?? new FakeHost()
  options.before?.({ host, stateFile, root, home })
  const config = parseConfig({ noticeDebounceMs: 5, noticeMaxDelayMs: 50, ...options.config }, { DSH_COORDINATOR_THREADS_ROOT: root })
  const service = new ThreadService(host.ctx as never, config, stateFile, options.prompts ?? { coordinator: 'COORD PROMPT', thread: 'THREAD {{threadId}} {{threadTitle}}' },
    { home, dshHome: join(dir, 'dsh-home'), tempDirs: [join(dir, 'tmp')], pickName: () => 0, ...options.deps })
  return { host, service, dir, root, home, stateFile, config }
}

/**
 * A rig with a coordinator chat already open. Its home and folder are the rig's `root`, as the one coordinator of
 * earlier releases had, so threads land in `<root>/<slug>`.
 */
export async function withCoordinator(name: string, options: Parameters<typeof rig>[1] = {}): Promise<Rig & { coordinator: FakeAgent; coordinatorId: string }> {
  const r = rig(name, options)
  await r.service.ready
  const { sessionId, coordinatorId } = await r.service.createCoordinator({ home: r.root })
  const coordinator = r.host.agentOf(sessionId)
  coordinator.status = 'idle'
  return { ...r, coordinator, coordinatorId }
}

/**
 * Web client entry. Registers, all through slots:
 *   main + sidebar.panellist                the "Coordinator" page and its sidebar entry (with a needs-you count)
 *   conversation.session.header.utilities   an icon button in coordinator chats and Executor Sessions that toggles the pane
 *   sidebar.right.pane.tab (+ .title)       the Executor Sessions side pane in dsh's right Sidebar (side-pane.tsx)
 *   sidebar.session.row.trailing / .hover   a coordinator chat's count of Executor Sessions that need the user or run (row-decor.tsx)
 *   conversation.chat.user.before           "Assignment from the coordinator" above coordinator-written messages
 *   conversation.chat.turnTail              the welcome under the opening turn of a fresh coordinator chat
 *   conversation.composer                   the folder card of executor_start as dsh's approval card (folder-approval.ts)
 * Copy comes from the locale service (namespace `dsh-coordinator`); components read coordinator state through the
 * slot renderer's `use<Name>` hooks bound from each registration's inject `hooks`.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { TypertRemoteContribution } from '@deepseek-ai/dsh-typert-protocol'
import { HeaderAction, originOf, OriginLine, PanelIcon, Welcome } from './chrome.tsx'
import { en, NS, zh, type Translate } from './locales.ts'
import { FolderApproval, selectFolderApproval } from './folder-approval.ts'
import { mountSettingsPage } from './settings.tsx'
import { CoordinatorPanel, type PanelActions, type PickResult } from './panel.tsx'
import { TYPERT_REMOTE, type CoordinatorRemote } from './remote.ts'
import { CoordinatorRowHover, CoordinatorRowTrailing } from './row-decor.tsx'
import { mountThreadsPane } from './side-pane.tsx'
import { fakeSource, remoteSource, wantsFakeSource } from './source.ts'
import { CoordinatorStore, createThenOpen, errorText } from './store.ts'
import { candidates, type BundleSummary, type LocalizedText } from './navigator.ts'
import { CSS, STYLE_ID } from './styles.ts'

/** Same id for the sidebar entry and the main panel key: the sidebar opens the panel whose key matches. */
const PANEL_ID = 'dsh-coordinator'

interface SlotsService {
  inject(slot: string, register: () => () => void): void
  register(options: Record<string, unknown>, component: (props: never) => unknown): () => void
}
interface ClientRemote {
  $mount(contribution: TypertRemoteContribution): Promise<() => Promise<void>>
  /** Host events dsh forwards to the client (dsh's own model picker listens the same way). */
  $on?(event: string, listener: () => void): unknown
  coordinator?: CoordinatorRemote
  /** dsh-plugin-manager/src/index.ts:499-505; present where the Host offers plugin management. */
  pluginManager?: { listBundles(): Promise<{ ok: boolean; value?: readonly BundleSummary[] }> }
}
interface LocaleService {
  register(ns: string, dicts: Record<string, Record<string, string>>): () => void
  bind(ns: string): Translate
  /** dsh-client-locale/src/client/index.ts:215. */
  resolveText?(text: LocalizedText): string
}
/** dsh-client-ui-plugin-manager/src/client/index.ts:49-59, :153-165. */
interface PluginNavigation { openBundle(packageName: string): void; openList(): void }
interface UiWorkspace {
  openSession(target: string): void
  /** Host-native directory chooser (rc.2 ui-workspace); null when cancelled. */
  pickDirectory?(): Promise<string | null>
}
/** The desktop app's local directory chooser bridge, preferred by dsh's own native directory flow. */
interface DesktopDirectoryPicker { pick(): Promise<string | null> }
interface LayoutService {
  selectPanel(panelId: string | null): void
  readonly panelInfo?: { getSnapshot(): { activePanelId: string | null }; subscribe(listener: () => void): () => void }
}
/** The parts of the client Session catalog (`sessions`) the plugin uses. */
interface SessionsCatalog {
  list: { getSnapshot(): { phase: string; byId: Record<string, unknown> } }
  refresh(): Promise<unknown>
  scope?(sessionId: string): Context | undefined
}
/** `ctx.conversation` of a session scope: its composer facade. */
interface ConversationService { input: { for(scope: Context): { setDraft(text: string): void; focus(): void } } }
type ClientContext = Context & { slots: SlotsService; remote: ClientRemote; locale: LocaleService }

function optional<T>(ctx: Context, name: string): T | undefined {
  try {
    return ctx.get(name as never) as T | undefined
  } catch {
    return undefined
  }
}

/**
 * Open a Session in the chat UI, refreshing the client Session catalog first when it does not list the
 * Session yet (the coordinator Session may have been created a moment ago). Pattern from
 * dsh-superagent-prototype src/navigation.ts (`openKnownSession`), MIT License, Copyright (c) 2026
 * DeepSeek Harness Team.
 */
async function openSession(ctx: Context, sessionId: string): Promise<void> {
  const uiWorkspace = optional<UiWorkspace>(ctx, 'uiWorkspace')
  if (uiWorkspace === undefined) throw new Error('the workspace UI is not loaded')
  const sessions = optional<SessionsCatalog>(ctx, 'sessions')
  if (sessions !== undefined) {
    const listed = () => { const s = sessions.list.getSnapshot(); return s.phase === 'ready' && s.byId[sessionId] !== undefined }
    if (!listed()) await sessions.refresh()
    if (!listed()) throw new Error(`session ${sessionId} is not in the session list`)
  }
  uiWorkspace.openSession(sessionId)
}

/** Put text into a session's composer and focus it (the welcome's example asks). */
function fillDraft(ctx: Context, sessionId: string, text: string): void {
  const scope = optional<SessionsCatalog>(ctx, 'sessions')?.scope?.(sessionId)
  const conversation = scope === undefined ? undefined : optional<ConversationService>(scope, 'conversation')
  if (scope === undefined || conversation === undefined) return
  const input = conversation.input.for(scope)
  input.setDraft(text)
  input.focus()
}

/**
 * The native folder picker, as dsh's own native directory flow chooses it: the desktop bridge when present, else the
 * workspace UI's host picker. Anything that cannot pick (no picker, a refused or failed call) reads as `unavailable`,
 * and the UI falls back to a path field.
 */
async function pickFolder(ctx: Context): Promise<PickResult> {
  const desktop = (globalThis as { __DSH_DIRECTORY_PICKER__?: DesktopDirectoryPicker }).__DSH_DIRECTORY_PICKER__
  const uiWorkspace = optional<UiWorkspace>(ctx, 'uiWorkspace')
  const pick = typeof desktop?.pick === 'function' ? () => desktop.pick()
    : typeof uiWorkspace?.pickDirectory === 'function' ? () => uiWorkspace.pickDirectory!() : undefined
  if (pick === undefined) return { kind: 'unavailable' }
  try {
    const path = await pick()
    return typeof path === 'string' && path !== '' ? { kind: 'picked', path } : { kind: 'cancelled' }
  } catch (error) {
    return { kind: 'unavailable', reason: errorText(error) }
  }
}

/** The fake source's scenario flag (development builds only, see source.ts). */
function fakeScenario(): string | undefined {
  try { return window.localStorage.getItem('dsh-coordinator:fake-scenario') ?? undefined } catch { return undefined }
}

function mountStyles(): () => void {
  document.getElementById(STYLE_ID)?.remove()
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = CSS
  document.head.append(style)
  return () => { style.remove() }
}

export const inject = ['slots', 'remote', 'locale']

export async function apply(ctx: ClientContext): Promise<void> {
  ctx.effect(mountStyles, 'dsh-coordinator: styles')
  ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'dsh-coordinator: dictionaries')
  const t = ctx.locale.bind(NS)
  // The disposer is owned by an effect on ctx, so the namespace is withdrawn when this plugin unloads.
  await ctx.remote.$mount(TYPERT_REMOTE)
  // The plugin's settings on dsh's Plugins page (settings.tsx), while dsh's settings forms are loaded.
  mountSettingsPage(ctx)
  // Reading ctx.remote.coordinator requires declaring the namespace service, so the UI lives in a child
  // context that waits for `remote.coordinator` (as dsh's own Remote-backed client plugins do).
  ctx.inject(['remote.coordinator', 'slots'], (child) => {
    const uiCtx = child as ClientContext
    // Release builds drop the fake source entirely (__DSH_COORDINATOR_DEV__ is false there).
    const source = __DSH_COORDINATOR_DEV__ && wantsFakeSource() ? fakeSource() : remoteSource(() => uiCtx.remote.coordinator)
    const store = new CoordinatorStore(source)
    // The Plugins page bundles Matriarc's "no navigator" notice offers, from a scope that injects that Remote namespace
    // (as dsh-matriarc reads it); without it the notice offers no bundle. Whether a navigator exists comes from the host.
    let pluginManager: ClientRemote['pluginManager']
    uiCtx.inject(['remote.pluginManager'], (scope) => {
      pluginManager = (scope as ClientContext).remote.pluginManager
      scope.effect(() => () => { pluginManager = undefined }, 'dsh-coordinator: plugin list')
    })
    const resolveText = (text: LocalizedText) => ctx.locale.resolveText?.(text) ?? (typeof text === 'string' ? text : text.en)
    uiCtx.effect(() => () => { store.dispose() }, 'dsh-coordinator: state poller')
    const hooks = { coordinator: store }
    const goHome = () => { optional<LayoutService>(uiCtx, 'layout')?.selectPanel(PANEL_ID) }
    // dsh's own copy, when the dictionary is registered.
    const dshWords = (namespace: string): Translate | undefined => {
      try {
        return ctx.locale.bind(namespace)
      } catch {
        return undefined
      }
    }
    // The permission picker (labels, badge, acknowledgement).
    const dshPermission = () => dshWords('permission.access')
    // The approval card (Reject / Allow once / Always allow), for the folder confirmation buttons.
    const dshApproval = () => dshWords('approval')
    // The model picker (Effort, Default, the account provider's name), for the model rows.
    const dshModel = () => dshWords('model')
    // When dsh's models may have changed: the events dsh's own model picker reloads its list on, where the client
    // gets them, and the window coming back to the front (a provider set up in another window).
    const modelListeners = new Set<() => void>()
    const modelsChanged = () => { for (const listener of [...modelListeners]) listener() }
    for (const event of ['llm/adapters-updated', 'llm/models-updated', 'settings/document-updated', 'credentials/record-updated', 'credentials/reference-updated']) {
      try {
        const off = uiCtx.remote.$on?.(event, modelsChanged)
        if (typeof off === 'function') uiCtx.effect(() => off as () => void, `dsh-coordinator: ${event}`)
      } catch {
        // Without the event the list is loaded again when a coordinator is shown or its models change.
      }
    }
    uiCtx.effect(() => {
      window.addEventListener('focus', modelsChanged)
      return () => { window.removeEventListener('focus', modelsChanged) }
    }, 'dsh-coordinator: model list on focus')
    // Fake Session ids exist only in the fake source; opening them would fail.
    const openReal = async (sessionId: string) => {
      if (store.source.kind === 'fake' && sessionId.startsWith('fake-')) return
      await openSession(uiCtx, sessionId)
    }
    const actions: PanelActions = {
      openCoordinator: async (coordinatorId) => {
        const { coordinatorId: id, sessionId } = await store.source.ensureCoordinator(coordinatorId)
        store.select(id)
        store.refresh()
        await openReal(sessionId)
      },
      newCoordinatorSetup: () => store.source.newCoordinatorSetup(),
      newCoordinator: options => createThenOpen(async () => {
        const made = await store.source.createCoordinator(options)
        store.select(made.coordinatorId)
        store.refresh()
        return made
      }, made => openReal(made.sessionId)),
      // Development builds with the fake source can simulate a picker that never answers (a browser on another computer).
      pickFolder: () => __DSH_COORDINATOR_DEV__ && store.source.kind === 'fake' && fakeScenario() === 'slow-pick'
        ? new Promise<PickResult>(() => {}) : pickFolder(uiCtx),
      setCoordinatorFolder: async (coordinatorId, path) => { await store.source.setCoordinatorFolder(coordinatorId, path); store.refresh() },
      setExecutorPrompt: async (coordinatorId, text) => { await store.source.setExecutorPrompt(coordinatorId, text); store.refresh() },
      setCoordinatorMemory: async (coordinatorId, text, revision) => {
        const result = await store.source.setCoordinatorMemory(coordinatorId, text, revision)
        store.refresh()
        return result
      },
      setCoordinatorMemoryEnabled: async (coordinatorId, enabled) => { await store.source.setCoordinatorMemoryEnabled(coordinatorId, enabled); store.refresh() },
      listModelChoices: coordinatorId => store.source.listModelChoices(coordinatorId),
      watchModels: (listener) => { modelListeners.add(listener); return () => { modelListeners.delete(listener) } },
      setCoordinatorModel: async (coordinatorId, model) => { await store.source.setCoordinatorModel(coordinatorId, model); store.refresh() },
      setExecutorModel: async (coordinatorId, model) => { await store.source.setExecutorModel(coordinatorId, model); store.refresh() },
      renameCoordinator: async (coordinatorId, name) => { await store.source.renameCoordinator(coordinatorId, name); store.refresh() },
      archiveCoordinator: async (coordinatorId, options) => {
        const result = await store.source.archiveCoordinator(coordinatorId, options)
        store.refresh()
        return result
      },
      deleteCoordinator: async (coordinatorId) => { await store.source.deleteCoordinator(coordinatorId); store.refresh() },
      select: (coordinatorId) => { store.select(coordinatorId) },
      openSession: openReal,
      setThreadPermission: async (mode) => { await store.source.setThreadPermission(mode) },
      setMatriarc: async (enabled) => { await store.source.setMatriarc(enabled) },
      confirmFolder: async (id, decision) => { await store.source.confirmFolder(id, decision) },
      removeAllowedFolder: async (path) => { await store.source.removeAllowedFolder(path) },
      resumeThread: async (id) => { await store.source.resumeThread(id) },
      archiveThread: async (id) => {
        // dsh clears the main view when the Session it shows gets archived, which also leaves this page. Keep the
        // page while the archive settles: undo only that one switch to the conversation view.
        const layout = optional<LayoutService>(uiCtx, 'layout')
        const info = layout?.panelInfo
        let stop = (): void => {}
        if (layout !== undefined && info !== undefined && info.getSnapshot().activePanelId === PANEL_ID) {
          const unsubscribe = info.subscribe(() => {
            if (info.getSnapshot().activePanelId === null) { stop(); layout.selectPanel(PANEL_ID) }
          })
          const timer = setTimeout(() => { stop() }, 2000)
          stop = () => { unsubscribe(); clearTimeout(timer); stop = () => {} }
        }
        try {
          await store.source.archiveThread(id)
        } catch (error) {
          stop()
          throw error
        }
      },
      refresh: () => { store.refresh() },
      holdFast: () => store.holdFast(),
      navigatorNotice: async () => {
        try {
          const bundles = await pluginManager?.listBundles().catch(() => undefined)
          return {
            candidates: candidates(bundles?.ok === true ? bundles.value ?? [] : []).map(c => ({ name: c.name, title: resolveText(c.title) })),
            canOpen: optional<PluginNavigation>(uiCtx, 'pluginNavigation') !== undefined,
          }
        } catch {
          return undefined
        }
      },
      openPlugins: (packageName) => {
        const navigation = optional<PluginNavigation>(uiCtx, 'pluginNavigation')
        if (packageName === undefined) navigation?.openList()
        else navigation?.openBundle(packageName)
      },
    }
    const togglePane = mountThreadsPane(uiCtx as never, {
      store, hooks, t, goHome, openSession: actions.openSession, openCoordinator: actions.openCoordinator,
      pickFolder: actions.pickFolder, setCoordinatorFolder: actions.setCoordinatorFolder,
      confirmFolder: actions.confirmFolder, resumeThread: actions.resumeThread, dshApproval,
    })

    uiCtx.slots.inject('main', () => uiCtx.slots.register({
      name: 'main', key: PANEL_ID, locale: NS, inject: () => ({ hooks, ...actions, dshPermission: dshPermission(), dshApproval: dshApproval(), dshModel: dshModel() }),
    }, CoordinatorPanel as never))
    uiCtx.slots.inject('sidebar.panellist', () => uiCtx.slots.register({
      name: 'sidebar.panellist', id: PANEL_ID, order: 50, locale: NS, label: () => t('panel'), inject: () => ({ hooks }),
    }, PanelIcon as never))
    uiCtx.slots.inject('conversation.session.header.utilities', () => uiCtx.slots.register({
      // Left of the schedule entry (-5) and the overflow menu (0).
      name: 'conversation.session.header.utilities', id: 'dsh-coordinator', order: -6, locale: NS, inject: () => ({ hooks, togglePane }),
    }, HeaderAction as never))
    // Left-sidebar rows of coordinator chats: after the schedule mark, as the forge panel's row icons (order 10, 20).
    uiCtx.slots.inject('sidebar.session.row.trailing', () => uiCtx.slots.register({
      name: 'sidebar.session.row.trailing', id: 'dsh-coordinator.row', order: 30, locale: NS, inject: () => ({ hooks }),
    }, CoordinatorRowTrailing as never))
    uiCtx.slots.inject('sidebar.session.row.hover', () => uiCtx.slots.register({
      name: 'sidebar.session.row.hover', id: 'dsh-coordinator.row', order: 30, locale: NS, inject: () => ({ hooks }),
    }, CoordinatorRowHover as never))
    uiCtx.slots.inject('conversation.chat.user.before', () => uiCtx.slots.register({
      name: 'conversation.chat.user.before', locale: NS, select: originOf,
    }, OriginLine as never))
    // Ahead of the generic question form; dsh's own approval entry sits at priority 1 and computer use's at -1.
    uiCtx.slots.inject('conversation.composer', () => uiCtx.slots.register({
      name: 'conversation.composer', priority: -1, locale: NS, select: selectFolderApproval,
    }, FolderApproval as never))
    uiCtx.slots.inject('conversation.chat.turnTail', () => uiCtx.slots.register({
      name: 'conversation.chat.turnTail', id: 'dsh-coordinator-welcome', order: 0, locale: NS,
      inject: (sessionId: string) => ({ hooks, sessionId, goHome, fillDraft: (text: string) => { fillDraft(uiCtx, sessionId, text) } }),
    }, Welcome as never))
  })
}

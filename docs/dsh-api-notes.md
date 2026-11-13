# dsh API notes

The dsh APIs the plugin relies on, as verified against dsh 0.2.2-rc.2 running `dsh web` with a dedicated `DSH_HOME`, the `web` profile and the shipped auto-review bundle. Facts come from the rc.2 sources shipped inside the app and from running the plugin against a scripted mock model and, for the fixes in "Make the coordinator flow work with a real model", a real provider.

The plugin imports no dsh package at runtime. `src/host/dsh.ts` declares only the members it uses, so that file is the list to re-check on a new dsh version.

Round 2 (several coordinators, one sidebar group per Executor Session) relies on further facts. They were read in the rc.2 package sources and the rc.1 checkout, and are marked **verified in source** below. The round 2 end-to-end run and the fix pass ran most of them in `dsh web` rc.2 with a dedicated dev home and the mock model; those are marked **seen at runtime**. The section [Round 2 runtime checks](#round-2-runtime-checks) lists which are verified and which are still open, in particular in the desktop app.

## Sessions

| API | Shape and notes |
|---|---|
| `ctx.workspaceRegistry.create(path, title?)` | Returns the Workspace entity (`id`, `path`, `title`, `sessionIds`, `setTitle`). Returns the existing one for the same canonical path. A Workspace has one path. |
| `ctx.workspaceRegistry.resolveByPath(path)`, `list()` | Look up by path; all Workspaces in sidebar order. |
| `ctx.workspaceRegistry.insertBefore(id, beforeId?)` | Moves a Workspace in the sidebar order; appends without `beforeId`. |
| `ctx.workspaceRegistry.delete(id)` | Removes the registration; folder and session logs stay. |
| `ctx.workspaceRegistry.archiveSession(id, { stopActivity? })` | Without `stopActivity`, refuses an active session (`WorkspaceActiveSessionError`). With it, stops the work after archiving. Fires `workspace/session-archived`. |
| `ctx.workspaceRegistry.archivedSessionIds` | Ids of sessions the user archived with the sidebar's delete. |
| `ctx.sessionController.create(request)` | Request `{ workspaceId?, cwd?, sessionId?, agentPreset? }`; `workspaceId` and `cwd` are mutually exclusive. Creates the session and its Agent. Returns `{ sessionId, agentPreset? }`. `ctx.agents.create` is not needed. There is no field for `origin` or `parentSession`: only the subagent runtime sets those, so a plugin cannot create a hidden top-level Session (verified in source: rc.2 `dsh-api-session-controller/src/types.ts`). The plugin creates coordinator chats with `workspaceId` and Executor Sessions with `cwd` only. |
| `ctx.sessionController.resolveAgent(sessionId)` | Returns `{ agent }` or `{ error }`. Resumes a cold session. |
| `ctx.sessionController.rename({ sessionId, title })` | Appends `session/title` with source `user`, which pins the title: dsh's automatic title generation stops for the session. Returns `{ title, seq }` with the normalised title (at most `maxTitleBytes`, 80 in the shipped profile). |
| `ctx.sessionController.prompt({ requestId, sessionId, mode, content, clientTimeZone? }, signal)` | The UI's path. Records a `user` message with an `rpcId`; dedupes by `requestId`. `mode` is `queue` or `steer`. |
| `ctx.sessionController.cancel({ sessionId })` | Stops the current turn. |
| `ctx.sessionController.state({ sessionId }, signal)` | Returns `{ cursor, active, running, queue, pendingInput }`. `pendingInput` holds `approval`, `question` or `other`. |
| `ctx.agents.get(sessionId)` | The live Agent, if loaded. |

Gotchas:

- A session joins a Workspace only when its header cwd resolves to exactly the Workspace path (`attachSession`). The header is immutable. `ctx.workingDirectory.set` changes the effective directory, not the header.
- Group membership (traced in the rc.2 sources: dsh-workspace `types.ts` and `index.ts`, dsh-api-session-controller `commands.ts`, dsh-client-ui-workspace `tree.ts`): a Workspace's `sessionIds` list accepts only Sessions whose canonical header cwd is exactly the Workspace path. `attachSession` rejects any other, and the `sessionIds` getter filters out a member whose cwd differs. A folder below the Workspace path does not count.
- `sessionController.create` takes `workspaceId` or `cwd`, never both ("session.create accepts workspaceId or cwd, not both"). Only `workspaceId` and a fork attach a Session to a Workspace. Nothing attaches a `cwd`-only Session later, even when its cwd equals a registered Workspace's path; the one-time history bootstrap that groups old Sessions by cwd runs once per home, not live. `attachSession`, `detachSession` and `insertSessionBefore` are all bound to the same cwd rule, so there is no move to a group with a different folder.
- The plugin relies on this rule for executor groups: it registers a Workspace at the executor's folder and creates the Session with `workspaceId`, or attaches an existing executor with `attachSession`, which dsh accepts because the Workspace path is exactly the Session's cwd (seen at runtime in `dsh web` rc.2, screenshots in `.team/r2/group/`).
- The default "Group by workspace" view is flat. Only the optional "Group by workspace tree" view nests a Workspace whose path lies inside another registered Workspace's path, as a child group.
- A session created with `cwd` only is listed under "Ungrouped" in the sidebar (verified in source: `groupByWorkspace` in rc.2 `dsh-client-ui-workspace/src/client/tree.ts`; seen at runtime in `dsh web` rc.2). Groups, Ungrouped included, start collapsed unless the user expanded them or the current Session is in them; the current Session's group is expanded once, only when no expansion was stored for it (verified in source: rc.2 `WorkspaceBrowser.tsx`). Executor Sessions rely on this.
- Deleting a Workspace keeps its Sessions; they move to Ungrouped, and their header cwd, so their `workspace-write` root, does not change (rc.2 ui-workspace README, "Managing sessions"). The one-time removal of per-executor Workspaces relies on this; seen at runtime in `dsh web` rc.2.
- The sidebar hides exactly two kinds of Session: `origin: 'subagent'` and blanks that are not selected (`sessionVisible`, verified in source: rc.2 `tree.ts`). There is no hidden Workspace and no parent-link filter for top-level Sessions.
- In the "Workspace Tree" view, Workspaces nest under their nearest registered ancestor (ui-workspace README, "Workspace hierarchy"). The view is chosen per browser and defaults to the flat view; a plugin cannot switch it.
- dsh lists a session as a blank "New Session", hidden unless selected, until its first `turn/start` (`sessionListMetadata.blank`). Nothing else clears that.
- Session titles: the shipped profile titles a session from its first user-kind prompt (about 5 words, fallback the first 5 words, at most 80 bytes). Agent messages are not eligible, so a session whose first message is an agent message gets no automatic title.
- dsh's default workspace is `<Documents>/deepseek-harness/default-workspace` (verified in source: rc.2 `dsh-api-workspace-controller/src/default-directory.ts` and `default-workspace.ts`). `defaultWorkspaceDirectory()` asks the OS for the Documents folder (macOS `osascript ... path to documents folder`, Windows `MyDocuments`, Linux `xdg-user-dir DOCUMENTS`), and the Workspace's stored title is the segment `default-workspace`, shown localised. It is created on first use (`workspaces.initializeDefault`). An earlier note here gave `~/Documents/deepseek-harness-default-workspace`, seen on an earlier build; the rc.2 source path is the one the plugin uses. The plugin finds the base for new coordinators as the parent of a registered Workspace whose path ends in `deepseek-harness/default-workspace`, else `~/Documents/deepseek-harness`, and makes no osascript call. Whether the default workspace is registered and listed by `workspaceRegistry.list()` on the desktop profile is a pending runtime check.

## Agent and messages

`Agent` members used: `id`, `status` (`idle` or `running`), `session` (`id`, `header`), `model.current()`, `model.select(selection)`, `inbox.nextTurn`, `inbox.nextStep`, `followup`, `steer`, `inject`.

A message is `{ id, role: 'user', content: [{ type: 'text', text }], source: { kind, ... } }`.

| Call | Idle agent | Running agent |
|---|---|---|
| `followup(message)` | Starts a turn | Queued for the next turn |
| `steer(message)` | Starts a turn | Applied at the next step of the current turn |
| `inject(message)` | Does not wake; delivered with the next request | Same |

Gotchas:

- A plugin source kind such as `dsh-coordinator` is persisted and replayed without complaint. The web transcript shows it as a collapsed "Execution requested" row, not a user bubble.
- Auto review treats only `source.kind: 'user'` in a top-level session as user instruction (`textRole()` in `dsh-experimental-auto-review`). Other kinds count as facts.
- A plugin-built message has no `clientTimeZone`; the runtime context then says the time zone is unavailable. `sessionController.prompt` accepts one.

## Models

| API | Notes |
|---|---|
| `agent.model.current()` | The session's own selection, else its last request, else the dsh default it follows. |
| `agent.model.select({ provider, model, reasoningEffort? })` | Selects a model in the session. |
| `ctx.agentDefaultModel.currentSelection()` | The deployment default a new session follows. |
| `ctx.llm.listProviders()`, `ctx.llm.listModels(provider)` | Used to decide whether a model is available. |

Gotcha: a new session has no model of its own. The shipped default is a DeepSeek route, so a plugin-created session fails on its first turn when the user has no DeepSeek key, unless the plugin selects a model.

For development, `DEEPSEEK_BASE_URL` and `DEEPSEEK_API_KEY` in the launch environment route the DeepSeek API-key provider to any Messages-compatible server. Auto review uses the same provider and model, one extra request per tool call.

## Events

| Event | Payload and notes |
|---|---|
| `session/event` | `(session, event)` for every appended log event of every session. Approvals arrive here too (`approval/asked`, `approval/decided`), as do `turn/start`, `turn/end`, `tool/call`, `tool/result`, `user/message`, `assistant/message`, `session/title`. |
| `agent/status` | `{ agent, status }`, status `running` or `idle`. |
| `agent/error` | `{ agent, error }`. |
| `agent/created` | `{ agent, source }`, serial, when dsh creates or resumes an Agent (members included). The place to apply per-Agent policy before its first step. dsh awaits the listeners before it releases any queued work for the Agent (verified in source: rc.2 `dsh-agent/src/index.ts`), which is what lets the plugin adopt a new Session in a coordinator Workspace before its first step. Seen at runtime in `dsh web` rc.2: a New Session made with a coordinator group's button fires `agent/created` before its first step, with the group's path as header cwd, and dsh awaits the listener (the plugin's listener itself awaits validation). A role mark injected then is logged as a `user/message` inside turn 1, step 1. dsh composes a step's tool list before it logs the admitted messages, so a tool registration that depends on the user's first message would miss turn 1; this is why candidates list the coordinator tools and the host refuses their calls (decision 49). The plugin's own new chats never become candidates. |
| `workspace/session-archived` | `{ sessionId }`, fired by the sidebar's delete. rc.2 has `archivedSessionIds` but no unarchive event among the APIs the plugin uses, so an unarchived coordinator chat is noticed on the next poll or delivery (seen at runtime in `dsh web` rc.2). |

Payload shapes used by `src/host/status.ts` and `src/host/history.ts`:

- `approval/asked`: `{ id, toolName, callId, reason }`; matched by `id` with `approval/decided` (`{ id, outcome }`).
- `tool/call`: `{ name, callId, arguments }`, where `arguments` is a JSON string.
- `tool/result`: `{ message: { toolCallId, content, isError, source } }`.
- `turn/end`: `{ reason: { kind, error? } }`, kind `completed`, `aborted`, `error`, `interrupted` and others.
- `assistant/message`: `{ turn, step, message: { role, content, source } }`. `user/message`: the message itself.

## Reading a session

| API | Notes |
|---|---|
| `ctx.sessionQuery.readSession(sessionId)` | `{ session, inheritedEventCount, events }`, the full raw log, live or cold; `session` is the header. Used by `executor_read`, the restore pass and the authority checks. |
| `ctx.sessionQuery.readTitle(sessionId)` | `{ title, ... }` or undefined. |
| `ctx.sessionQuery.readSurface(sessionId)` | The current model surface. Not used. |
| `ctx.sessionController.events({ address: { kind: 'session', sessionId }, maxMessages }, signal)` | Message-aligned pages. Not used. |
| `ctx.sessionController.wait(...)` | Exists; not exercised. |

Gotchas:

- dsh adds runtime context to user messages (`<system-reminder>`, "Time sampled while preparing"). `history.ts` filters these out.
- `compaction/summary` is a log event type but did not occur in testing, so its payload is handled defensively and untested.

## Waiting on the user

There is no "waiting" status. The plugin derives it from the log: an `approval/asked` with no matching `approval/decided`, and an `ask_user_question` `tool/call` with no `tool/result`. `state().pendingInput` is reported by `executor_read` as a cross-check.

Gotchas:

- The `userQuestions` projection stays empty for the web profile's questions. The web profile registers `ask_user_question` in legacy mode and the projection tracks only timed questions. Do not rely on it.
- `pendingInput` comes from the Gateway's pending Remote events. Whether it is set with no browser connected was not checked.
- Under Auto review, `ask_user_question` itself goes through Auto review, so a user can see an approval card before the question card.
- After a restart, a turn waiting on a question ends as stopped and the pending question is gone.

## Session titles

dsh's title service (dsh-session-title) titles a Session from its human prompts (`user/message` with source kind `user`). A title set with `sessionController.rename` has source `user` and pins the title. `refresh()` is the deliberate unpin: it regenerates the title with the registered provider (the session-titles bundle, "Conversation-following titles"), or falls back to the prompt's first words without one; the fallback event has source kind `fallback`. There is no provisional title. The plugin names an executor with the coordinator's working title, calls `refresh()` once the Assignment is logged as the user's prompt, and puts the working title back when only the fallback came (read in the rc.2 sources).

## Asking the user from the host

`ctx.userQuestions.ask({ agent, questions, signal })` raises a question card in the Session of `agent` without a tool call. The web client's forwarding listener shows it in the composer seat as dsh's generic question flow (options plus a free-text answer). A question with `intent: { kind: 'approval', approve, reject, always }` must offer exactly those labels as options and have a `detail`. A request without a call id always gets a fresh card. Aborting the signal withdraws it. dsh has a single question seat per Session: a host card and a model's `ask_user_question` published at the same time share it, the composer shows the last published card, and the answer may go to the other request (seen in the desktop run). The plugin therefore raises its folder card only after the coordinator's turn has ended and that turn asked no question, withdraws it when the model asks one, gives it a unique question id, and accepts only an answer that names that id and one of its labels. It needs a connected browser to be answered and does not survive a restart; an answer that is not one of the labels (free text, Skip) is just an answer the caller ignores.

`ctx.approval.request({ agent, toolName, reason })` is not usable for this: it throws outside an open turn of the asking Session and its outcomes have no "always".

## Answering questions programmatically (not used by the product)

`ctx.on('user-questions/request', listener, { prepend: true })` can answer a question or call `next()`. The request is `{ questions, agent?, signal?, wait? }`; `request.agent.id` is the session id.

- `prepend: true` is required. Without it the web client's forwarding listener runs first while a browser is connected, claims the request and never calls `next()`.
- The waterfall also carries questions with `intent: { kind: 'approval' }` (computer use) and `intent: { kind: 'plan-review' }`. Skip those.
- Never listen on `approval/request`.

The product does not use it. The development spike that tried it was deleted; see decision 7 in [decisions.md](decisions.md).

## Permissions and Agent Teams

| API | Notes |
|---|---|
| `ctx.permissionPresets.set(session, 'auto')` | Synchronous. `auto` exists only when `@deepseek-ai/dsh-experimental-auto-review` is loaded. It sets `sandbox/mode` to `danger-full-access` and approval policy `ask`. The preset survives a restart. |
| `ctx.permissionPresets.current(session)`, `names` | The session's preset name (`custom` when no preset matches) and the available presets. A member seeded with `auto` and `approval/policy never` reads `auto` while Auto review is loaded and `danger-full-access` after it is gone; with a `workspace-write` sandbox and `never` it reads `custom`. |
| `permission-presets/catalog-changed` | Emitted when Auto review registers or withdraws `auto`. On a live removal the bundle first switches every `auto` Session to `danger-full-access`, then withdraws `auto`, which emits this event. |
| `session.append('sandbox/mode', { mode })` | What dsh's own `setSandboxMode` does. The plugin uses it to narrow a member's sandbox without touching its `never` approval policy (`presets.set` would set `ask`). |

Sandbox facts (dsh-sandbox, dsh-sandbox-policy):

- `workspace-write` may write under the session's header cwd, configured extra roots, `/tmp` and the user temp folder (`writableRoots`). `sessionWorkspaceRoot` uses the header cwd, not the working directory.
- `danger-full-access` (used by `auto`) does not restrict files; Auto review decides each tool call.
- `sandboxPolicy.registerWritableRoot(session, dir)` adds a root; nothing narrows the header cwd.
- When the auto-review bundle is removed from a running app, it switches every `auto` session to `danger-full-access` (approval `never`). At app quit it changes nothing.
- A Session whose log last recorded `permission/preset auto` cannot be resumed while Auto review is not loaded: `pinInitialPermission` throws "cannot restore preset auto without its active integration". Nothing outside the Session can change that log while it is cold.

Auto review roles (dsh-experimental-auto-review `textRole`): user-kind text in a top-level session is `user-instruction`; an agent message counts as `direct-parent-instruction` only when its sender is the session's `parentSession`. Executor Sessions are top-level, so coordinator and peer agent messages are `fact`; a Teammate's Lead is its `parentSession`, so the Lead's instructions are `direct-parent-instruction` for the Teammate.

| API | Notes |
|---|---|
| `await ctx.agentTeams.setEnabled(agent, true)` | On a root Agent. Adds `team_task_create`, `team_task_get`, `team_task_list`, `team_task_update` and a system prompt section. `isEnabled(agent)` reads it back. |

A plugin-created session with teams on offered the same tools as a UI-created Standard session plus the four team task tools. To see what a step really offers, use `ctx.tools.resolve({ agent, modelSelection, signal })` and then `ctx.tools.definitions(agent, set)`; conditional registrations show only in the resolved set.

## Subagents and team members

Team members are ordinary subagents (dsh-subagent); Team mode adds only the shared task board. Verified on rc.2 with a real model:

| Fact | Where |
|---|---|
| A member is a child Session: header `origin: 'subagent'`, `parentSession` = creator, same `cwd` as the lead. Its log starts with `subagent/descriptor` (`agentProvider`, `agentModel`: the lead's route). | member log |
| The creator's log gets `subagent/catalog` `{ childId, name, label, mode }` when the member starts. | lead log |
| The member's policy is seeded at delegation: `permission/preset auto` (lead in `auto`) or the lead's explicit `sandbox/mode` (`workspace-write`), and always `approval/policy never`. | dsh-subagent `captureDelegatedPolicyOverrides` |
| `ask_user_question` rejects a live child (`DELEGATED_CALLER`). | dsh-user-questions |
| When a member finishes (any stop reason), the runtime sends its creator a `subagent-settled` message (`senderSessionId`, `stopReason`): a `next-turn` inbox splice that starts a turn when the creator is idle, or a `next-step` splice when it runs. | dsh-subagent `notifySettlement` |
| `ctx.subagents.interrupt(childId, { kind: 'user' })` cancels one member's turn; its settlement then follows. `drainDescendants([root])` stops a whole tree but turns later settlements into injects until the root Agent is unloaded. | dsh-subagent |
| `sessionController.cancel` stops only the lead (`keepInbox`). `archiveSession` without `stopActivity` refuses while descendants run; with it, it cancels them, and a pre-step gate rejects steps under an archived ancestor. | dsh-workspace, dsh-subagent `archive-admission.ts` |
| `subagent/start` and `subagent/end` are emitted scoped to the tree root, not as global events. | dsh-subagent `lifecycle.ts` |
| A closed turn that only re-injected messages (pre-step `enter` with no messages) has no `step/start`; its log holds only inbox splices. | dsh-agent-loop |

## Tools and system prompt

| API | Notes |
|---|---|
| `ctx.tools.guard(fn)` | A monotonic guard in the caller's scope (global for a plugin's host context). It runs after every `tools/pre-execute` listener and after approval resolves, before the tool body; a returned string denies the call as `Error: <reason>`, and no listener can allow it again. |
| `ctx.on('tools/pre-execute', (exec, next) => decision)` | The reorderable allow/deny/ask waterfall. Auto review registers with `prepend: true`; an appended listener runs after it when it calls `next()`. A `deny` from a later listener wins over Auto review's `ask`, so no approval card shows. `exec` carries `name`, `arguments` (frozen JSON), `agent`. |
| `agent.ctx.tools.restrict({ allow?, deny? })` | Narrows the global and inherited (preset) tools one Agent sees. Must be called on the Agent's own context. Throws on names that are not registered and lists the known ones in its message ("known global tools: …"). Registrations in the Agent's own scope stay visible. The returned disposer lifts it. Each change emits `tools/change` synchronously. |
| `ctx.tools.definitions(scope?)` | Visible definitions for an Agent (the scope key is the Agent object), after restrictions; without a scope, the global ones. Conditional tools are listed regardless of `when`. |
| `tools/change` | Emitted on every change of a tool layer: registrations, restrictions, preset recomposition. Synchronous, so a listener that changes layers must guard against re-entry. |
| `ctx.tools.register(definition, { when })` | Global registration admitted per agent by `when({ agent })`. Returns a disposer. `execute(args, { callId, agent?, signal })`. The output must be lossless JSON: drop `undefined` fields, copy readonly arrays. |
| `ctx.systemPrompt.section({ name, order, text, interpolate })` | `text({ agent })` is called per request; return `''` for sessions the section does not apply to. |

## Client

| API | Notes |
|---|---|
| `ctx.get('uiWorkspace').openSession(sessionId)` | Opens a session in the main view. Needs `@deepseek-ai/dsh-client-ui-workspace` in `dsh.client.inject`. Returns `void`. |
| `ctx.get('sessions')` | Client session catalog: `list.getSnapshot()` (`phase`, `byId`) and `refresh()`. |
| `ctx.get('layout').selectPanel(id)` | Shows a `main` panel by key. |
| `ctx.slots.register(...)` | Slots used: `sidebar.panellist`, `main`, `conversation.session.header.utilities`, `sidebar.right.pane.tab` (with `ctx.sidebarRightTabs`), `sidebar.session.row.trailing`, `sidebar.session.row.hover`, `conversation.chat.user.before`, `conversation.chat.turnTail`. |
| Session row seats | ui-workspace declares `sidebar.session.row.trailing` (non-interactive icons after the row's time), `sidebar.session.row.hover` (a section in the row's hover card) and `sidebar.workspaces.session.menu.item` (the row menu) (verified in source: rc.2 `dsh-client-ui-workspace/src/client/contract/slots.ts`). The hover card has the same dark surface in both themes. The plugin uses the first two on coordinator chat rows; they render and update on poll in `dsh web` rc.2 (seen at runtime). |
| Sidebar session list | One `single` seat, `sidebar.workspaces`, declared by ui-sidebar and filled by ui-workspace's browser (verified in source: rc.1 `ui-sidebar/src/client/contract/slots.ts`). A plugin cannot add a filter or a section to it; replacing the seat replaces the whole browser. |
| Folder picker | The host Remote namespace `directoryPicker` has `pick` (native chooser, capability `native`), `list` and `createDirectory` (in-app browser, capability `browse`) (verified in source: rc.2 `directory-picker.ts`). ui-workspace wraps them as `uiWorkspace.pickDirectory()`, `listDirectory()` and `createDirectory()` (rc.2 `dsh-client-ui-workspace/src/client/navigation.ts`). dsh's own native flow (rc.1 `ui-directory-picker-native`) prefers the desktop bridge `globalThis.__DSH_DIRECTORY_PICKER__.pick()` and falls back to `uiWorkspace.pickDirectory()`; the plugin does the same. Seen at runtime: `dsh web` on macOS has a native picker, and `pickDirectory()` blocks until the dialog is answered; the dialog opens on the machine that runs dsh, so with a remote browser the call would hang. The plugin therefore always offers "Type a path", says after 8 s that the dialog may be elsewhere, and gives up after 60 s. Which of the two the desktop app on rc.2 exposes is still open. |
| Plugin settings (host) | `dsh-settings` lists every plugin entry whose `static Config` (a Schemastery schema) has fields marked `.volatile()` (`settings/describe`: `ns` = entry id, `value`, `base`, `user`, `applies: live`, `revision`, `autoGenerate`). An edit writes only volatile paths into that entry's `config` in the profile patch (refuses any other path, checks the revision) and reaches the running service as a `Volatile` reference with `.get()`; a non-volatile change remounts the plugin. Schemastery throws on a refused value unless the field is `.loose()`, which resolves it to the field's default; `.hidden()` is metadata only. `@deepseek-ai/schemastery` is not installed for this plugin: the host loads dsh's copy with `createRequire(process.argv[1])` and accepts it only when its real path lies inside dsh's installation (the entry path before its first `node_modules`), because Node's lookup from there also reaches ancestor and global folders (verified in source: rc.2 `dsh-settings/src/schema.ts`, `schemastery/src/index.ts`; seen at runtime: a save lands in `cordis.patch.yml` and the host reads it without a restart). |
| Plugin settings (client) | No shipped client renders `autoGenerate`; every official page is its own client plugin. `ctx.configForms` (from `@deepseek-ai/dsh-client-ui-settings`): `get(entryId)` is the shared form scope, `whileServed([ns], register)` runs `register` while the Host serves those namespaces. The shared primitives `SettingsFormModel(scope, specs)` (`bind`, `shell`, `field`, `actions`, `dispose`), `SettingsForm`, `SettingsValueField` and `SegmentedControl` come from `@deepseek-ai/dsh-client-ui-primitives` in the page's module table (keep it external in the bundle). A field spec is `{ field, format(value) → text, parse(text) → { kind: 'set', value } \| { kind: 'clear' } \| undefined }`. The Plugins page offers `plugins.bundle.config` (key = package name, shown below the bundle's README) and `plugins.row.config` (key `<package>#<rowId>`) to third-party plugins; `plugins.item` pages are official. A slot component gets `t`, `view` (`page` or `summary`), the `inject()` actions and one `use<Name>` prop per `inject().hooks` store. `SettingsValueField` rules adjacent fields apart, so wrap each in its own cell as the Subagent page does (verified in source: rc.2 `dsh-client-ui-settings-subagent`; seen at runtime in `dsh web`). |
| Package name and ids | A bundle's browser half registers as `window.__ModuleLoader__.load({ id: <package name> })`: dsh imports `<package>/client` and strips the suffix (`stripClientSuffix`). A profile patch row with `id` and `name` is skipped when `name` differs from the entry's (`patch: name mismatch for <id> ... skipping`, `cordis-plugin-include/src/patch.ts`), and `dsh-config-editor` matches and writes rows with `name`. `dsh plugin remove` drops the bundle from `dsh.profile.bundles` when its dependency goes away (`reconcile` in `dsh-plugin-manager/src/operations.ts`). The plugin's package is `dsh-whalepod`, its entry id `dsh-coordinator` (decision 63) (verified in source: rc.2). |
| Plugins page text | A bundle's page shows its detail document in dsh's `DetailDocument` box (`max-height: 540px`, its own scroll), first among the page's sections and before `plugins.bundle.config`; no slot or option places anything above it. The document is the file `meta.detail` names in `locale/<language>.json` (language chain: the language, its prefixes, then English; a locale file without `meta.detail` passes to the next language), else `README.md`. The plugin names short page documents for en and zh (verified in source: rc.2 `dsh-plugin-detail` and `dsh-client-ui-plugin-manager/src/client/PluginManagerPage.tsx`; seen at runtime in `dsh web`). |
| `ctx.remote.$mount(info)` | Mounts a Remote namespace from `createTypertRemoteInfo`. Read `ctx.remote.coordinator` inside `ctx.inject(['remote.coordinator'], ...)`. |

Typert Remote on the host: extend `TypertRemoteService`, mark methods with `@Remote`, and compile with `tsc` so the standard decorators are lowered. Methods with a JSON parameter work through the Gateway's source fallback plus the hand-written client spec. Calls from the desktop app's `dsh-app://app/` origin work (seen at runtime in dsh-desktop 0.2.2-rc.2).

## Agent presets

| API | Notes |
|---|---|
| Session preset | The `agentPreset` projection: the header's creation value, then each `agent-preset/selected` event. Resume composes from it and fails with "Unknown agent preset" when the name is gone. |
| `ctx.agentPresets.resolve(id)` | Throws `agent-preset/not-found` for an unknown name. |
| `ctx.agentPresets.register({ id, name?, description?, order?, plugins })` | Registers a preset owned by the caller; an empty `plugins` list is valid. Returns an async disposer. There is no hidden flag: a registered preset shows in the picker. |
| `ctx.agentPresets.recompose(agent.ctx, id)` | Rebinds a live Agent to another preset and emits `tools/change`. `select` refuses a Session that has started a turn; `recompose` does not check. Log `agent-preset/selected` afterwards so the next resume uses it. |

## Callers of Remote methods

`principalOf(ctx.invocation)` (`@deepseek-ai/dsh-typert-protocol`) returns the caller's principal, or undefined for the owner. dsh records `principal` on a prompt's source only for a caller other than the owner.

## Other gotchas

- Every request on the DeepSeek route appended a `session-log-deepseek/delivery-accepted` event, even with `DSH_TELEMETRY_MODE=DISABLED` and `DSH_TELEMETRY_DISABLED=1`. With a real DeepSeek key the session log may go along with model requests. Check that package's settings before shipping.
- `ctx.logger` output is kept in memory only. The plugin also writes `[dsh-coordinator]` lines to the console so they show in the terminal running `dsh web`.
- `dshHomePath` is read with `ctx.get` and may be missing; the plugin falls back to `DSH_HOME` or `~/.dsh`.
- `DSH_CLIENT_VERSION` holds the dsh version in launcher environments. In link mode the plugin's own `node_modules` has the devDependency copy of dsh packages, so the version must not be read from there.
- `z.object` in a client codec drops keys it does not list; a host field missing from `remote.ts` never reaches the client.
- Run node tests with type stripping only: no parameter properties or enums in modules the tests import.

## Re-check list for a new dsh version

1. Every member declared in `src/host/dsh.ts` still exists with the same shape.
2. `sessionController.create` still creates the Agent, and `resolveAgent` still resumes cold sessions.
3. `session/event` still carries `approval/asked` and `approval/decided`, and the payload fields listed above are unchanged.
4. `workspace/session-archived` and `workspaceRegistry.archivedSessionIds` still exist.
5. Auto review still reads only `source.kind: 'user'` as user instruction.
6. The `auto` preset still comes from `@deepseek-ai/dsh-experimental-auto-review`, and `agentTeams.setEnabled` still adds the team tools.
7. `standard` still exists, `agentPresets.register`/`recompose` still work for the one-time migration, and `agent.ctx.tools.restrict` still accepts allow and deny lists.
8. `remote.ts` still matches what `@deepseek-ai/dsh-typert-generator` would emit, and the client can still mount it.
9. A plugin-created session still offers the same tools as a UI-created one (compare resolved tool sets).
10. A Workspace still requires header cwd equal to its path, and `workspace-write` still uses the header cwd as its root.
11. Removing the auto-review bundle live still switches `auto` sessions to `danger-full-access`, and `permission-presets/catalog-changed` still follows.
12. `tools.guard` still runs after every `tools/pre-execute` listener and approval, and an appended pre-execute `deny` still wins over Auto review's `ask`.
13. `userQuestions.ask` from the host still shows a card in the agent's Session.
14. `settings/describe` still lists `dsh-coordinator` with `applies: live`; `configForms`, the primitives and the `plugins.bundle.config` slot still exist; Schemastery still has `loose` and `volatile`.
15. `agent/created` is still awaited before queued work runs; a step's tool list is still built before its admitted messages are logged (decision 49); an injected role mark still lands in turn 1; a `cwd`-only Session still shows under Ungrouped; the default workspace path still ends in `deepseek-harness/default-workspace`; the `sidebar.session.row.trailing` and `.hover` seats and `uiWorkspace.pickDirectory` still exist.
16. `pnpm check` passes, and an end-to-end run with the mock model covers a result, an approval, a native question, a question to the coordinator, a peer message, a stop, the cap and a restart, plus two coordinators: adoption of a New Session in a coordinator's group (no coordinator tool call before the first typed message), cross-coordinator refusals, a folder change, a rename, an Executor prompt reaching a new executor, and an archive.

## Round 2 runtime checks

### Verified

Seen in `dsh web` rc.2 with a dedicated dev home and the mock model (the round 2 end-to-end run and the later dev-server runs):

1. A New Session made with a coordinator group's button fires `agent/created` before its first step, with the group's path as header cwd, and dsh awaits the listener before the first step.
2. dsh builds a step's tool list before it logs the user's first message, so the tools a candidate needs in turn 1 must be listed before promotion.
3. The injected role mark is logged as a `user/message` inside turn 1, step 1.
4. `sessionController.create({ cwd })`: the Session shows under Ungrouped.
5. `workspaceRegistry.delete` of an executor's Workspace keeps the Session, which moves to Ungrouped.
6. `dsh web` on macOS has a native folder picker, and `uiWorkspace.pickDirectory()` blocks until the dialog is answered.
7. The `sidebar.session.row.trailing` and `.hover` occupants render on coordinator rows and update on poll.
8. Unarchiving a coordinator chat in the sidebar is visible on the next poll.
9. The plugin's own new chats never become candidates.
10. The model-free opening turn logs no opening message (it enters with no messages); a role mark queued after it is logged with the user's first message, and a New coordinator chat survives a real restart.
11. Executor groups: `create({ workspaceId })` at the executor's folder and `attachSession` of an existing executor work, and "Group by workspace tree" nests an executor's group under the coordinator's when its folder lies below the coordinator's home.

Seen in the desktop app (dsh-desktop 0.2.2-rc.2):

12. The app can be driven through a DevTools port.
13. Client-to-host Remote calls work from the `dsh-app://app/` origin.
14. A host question card and a model's `ask_user_question` share one question seat (the reason for the deferred folder card).

### Pending

1. Items 1 to 11 above in the desktop app rather than `dsh web`.
2. In the desktop app: whether `globalThis.__DSH_DIRECTORY_PICKER__` or `uiWorkspace.pickDirectory()` is exposed, and what a cancel returns.
3. dsh's default workspace is registered and listed by `workspaceRegistry.list()` on the desktop profile.
4. The files tab and open-in-app of a `cwd`-only Session in the desktop app.
5. Which dsh paths (schedules, workflows, the CLI, other plugins) can create a top-level Session in a coordinator Workspace, with which `origin`, and whether any records its opening prompt as `kind: 'user'` with a request id and no principal. Such a prompt would promote the Session (security.md, known limit 4).
6. Whether `session_search` exists in the desktop profile; it is on the never-list either way.
7. The deferred folder card and the title refresh with a real title provider, end to end in the desktop app.

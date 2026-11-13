# Decision log

One entry per decision. Where the reason was never written down, the entry says "reason not recorded" instead of guessing.

Entries 1 to 37 were written before the second design round ("round 2" below), which brought several coordinators, and keep its words: a "thread" is what is now an Executor Session, a "brief" an Assignment, a "thread lead" a Lead and a "team member" a Teammate, and the `thread_*` tools are now `executor_*` (decision 48). Where a round 2 decision changed an earlier one, the earlier entry has a "Round 2" paragraph.

## 1. Threads are ordinary top-level sessions

**Context.** Work needs to run in parallel, in separate folders, with the user able to step in.

**Decision.** Each thread is a normal top-level dsh session with its own lead agent, created by the plugin on the stock `standard` preset (decision 31).

**Why.** The user can open a thread in the normal chat view, see its approval and question cards, and talk to its lead. A plugin-created session gets the same tools as one created in the UI; this was checked on 0.2.2-rc.2. A lead can use subagents and Agent Teams inside its own session tree. How the plugin follows that tree is decision 26.

**Rejected.** Alternatives not recorded. One consequence is noted: dsh's built-in subagent messaging works only inside one session tree, and threads are separate trees, so the plugin routes messages between the coordinator and threads itself.

## 2. Copy from the prototype, do not depend on it

**Context.** The dsh-superagent prototype already solves session creation, once-per-request delivery, report relay and concurrency limits.

**Decision.** Copy files and patterns, keep the MIT notice in `LICENSE` and in the headers of derived files.

**Why.** The prototype package is private, exports only its core module, and pins exact alpha versions of dsh and cordis. Depending on it as a library is not practical.

**Rejected.** A dependency on the prototype package, or a fork of it.

## 3. Remote calls, not HTTP routes

**Context.** The client panel needs data from the host.

**Decision.** Typert `@Remote` methods on a `TypertRemoteService` named `coordinator`.

**Why.** The desktop app may refuse a plugin's HTTP routes. The prototype's panel API also requires a loopback web server. Remote calls go through dsh's own client-to-host channel.

**Rejected.** The prototype's HTTP panel API (`ctx.webServer.register`).

## 4. The coordinator chat is a normal session

**Context.** The user needs a place to talk to the coordinator.

**Decision.** The coordinator is an ordinary dsh session on the stock `standard` preset, narrowed at runtime (decision 32). The client opens it with `uiWorkspace.openSession`. There is no custom chat view.

**Why.** Reason not recorded. The effect is that the coordinator gets the native composer, model picker, transcript and question cards without plugin code.

**Rejected.** A chat view inside the plugin panel.

## 5. The client polls

**Context.** The panel, the badge and the header chip need current thread state.

**Decision.** One poller calls `getState()` every 1.5 s while the panel is open and every 5 s otherwise, and re-renders only when `revision` changes.

**Why.** Reason not recorded. The contract states "no push channel in this version" and adds `revision` to make polling cheap.

**Rejected.** A push channel from host to client.

## 6. Never answer approvals

**Context.** Auto mode escalates risky actions to the user.

**Decision.** Nothing in the plugin answers an approval. The plugin registers no listener on `approval/request`. The coordinator is told which thread waits and why, and its prompt forbids approving, rejecting or working around an approval.

**Why.** Decided behaviour: approvals that auto mode escalates always go to the user.

**Rejected.** Letting the coordinator approve on the user's behalf.

## 7. Native user questions stay with the user; agent questions go through `coordinator_report`

**Context.** A thread may need an answer. dsh allows a host plugin to answer `ask_user_question` programmatically through the `user-questions/request` waterfall; the development spike (since deleted) did this.

**Decision.** The product registers no question answerer. A question the lead asks with `ask_user_question` stays with the user, and the coordinator is notified. A question for the coordinator goes through `coordinator_report` with kind `question`, and the coordinator answers with `thread_message` or flags the thread.

**Why.** The thread prompt tells the lead to use `ask_user_question` only for choices that belong to the user, so such a question is the user's to answer. Questions the coordinator can answer have their own path. Beyond that, reason not recorded.

**Rejected.** A `user-questions/request` listener that lets the coordinator answer native questions.

## 8. Brief as the user's instruction only when the user asked; everything else as agent messages

**Context.** Auto review reads only `source.kind: 'user'` text in a top-level session as the user's instruction; everything else is a fact. Auto mode needs a task: with no instruction at all, the reviewer allows only low-risk project-local work and sends every medium-risk action to the user. The web UI shows a plugin-source message as a collapsed row, which hides the brief.

**Decision.** By default (`briefAs: user`) a thread's first brief goes through `sessionController.prompt` and is recorded as a user prompt, but only when the coordinator turn that called `thread_start` was opened by a prompt the user typed. In a turn a thread notice woke, the brief is recorded as an agent message from the coordinator, and the tool result says so. Later coordinator messages and peer messages are always agent messages (`{ kind: 'agent-message', form: 'relay', senderSessionId }`); the `messagesAs` option is gone. A message for a thread that has not started yet waits apart from the brief.

**Why.** A user-requested thread needs its task to count as the user's for auto review, and the user should see the brief as a bubble. A thread the coordinator starts because of a thread's report is not the user's request, so it gets the stricter review; refusing such starts would block legitimate follow-ups the user can still approve. Coordinator messages were found to reach threads as user prompts through the queued-brief path (review finding S2).

**Trade-off.** User authority is granted to text the coordinator model wrote. A turn the user opened can also carry notices; see security.md, T3. Listed under known limits.

**Presentation.** The prompt's request id starts with `dsh-coordinator:brief:`, and the client puts a "Brief from the coordinator" line above such a bubble. An agent message is shown as a task message. dsh picks the title of a turn-opening message from its source kind only, so the thread name cannot go into that title.

**Rejected.** All coordinator text with the plugin source (the brief was hidden and auto review read it as facts); refusing `thread_start` in notice-woken turns.

## 9. Threads inherit the coordinator's model; an existing coordinator's model is never changed

**Context.** A new session follows the dsh default model until one is selected. The shipped default is a DeepSeek route the user may have no key for. Earlier code also re-picked the coordinator's model on every open and could replace the user's choice after a failed provider lookup (finding S8).

**Decision.** A thread runs on the coordinator's current model. A new coordinator keeps the default it follows when that works. An existing coordinator's model is never changed; when it is not usable, the panel says so. A failed provider lookup never replaces or selects a model.

**Why.** Threads use what the user picked in the coordinator chat. A model the user picked is theirs to change.

**Rejected.** Falling back to the default for an existing coordinator.

## 10. An archived coordinator counts as gone

**Context.** The sidebar's delete archives a session. The chat UI does not open an archived session and dsh runs no model step in it. "Open coordinator chat" landed on an empty screen because the plugin only checked that the stored session still resolved.

**Decision.** An archived coordinator is treated as missing and replaced on the next open. The plugin also listens on `workspace/session-archived`: an archived thread leaves the list, and no notices are sent into an archived coordinator.

**Why.** Found in browser testing with a real model.

**Rejected.** Treating "resolves" as "usable".

**Round 2.** With several coordinators an archived chat no longer means a new coordinator. The coordinator record keeps its Executor Sessions and its Session id, its chat counts as archived, its notices are held (the last 50), and the page offers Reopen chat, which creates a new chat Session for the same coordinator in its home and hands the held notices over (decision 44). Archiving a coordinator on purpose is decision 47.

## 11. JSON file for persistence

**Context.** The plugin must remember the coordinator session id and the thread table across restarts.

**Decision.** One JSON file, `<DSH_HOME>/storages/dsh-coordinator/state.json`, written whole and atomically.

**Why.** From `src/host/store.ts`: the table is tiny and always written whole; JSON is readable and easy to repair by hand; it lives under the same `DSH_HOME` as the sessions it points to; and it avoids a runtime dependency on dsh's storage-domain API, which is still marked proposed and which a linked third-party plugin cannot import reliably.

**Damage.** A file that cannot be parsed is moved aside and the table starts empty; a file from a newer version is never overwritten.

**Rejected.** The prototype's SQLite store and durable effect queue; dsh's storage-domain API.

## 12. A cap on running threads

**Context.** Many threads running at once use model capacity and machine resources.

**Decision.** `maxRunningThreads` (default 6 at the time; 128 since decision 60) limits threads running a turn. Further briefs and coordinator messages wait in a FIFO queue. Threads waiting on the user hold no slot, since they use no model time. A user typing into a thread is never queued.

**Why.** Concurrency limits and queuing were part of the reuse plan from the prototype. Reason for the default of 6 not recorded.

**Rejected.** The prototype's SQLite-backed effect queue with retries, and its extra slot for a person's messages.

## 13. Develop against `dsh web` with a dedicated `DSH_HOME` and a scripted mock model

**Context.** Development must not touch the real desktop app, its sessions or its credentials, and should not need real model credentials for every test.

**Decision.** `scripts/dev.sh` builds the plugin, links it into the `web` profile of a separate `DSH_HOME`, and starts `dsh web` on 127.0.0.1. It refuses `~/.dsh`. `dev/mock-llm.mjs` is a scripted Messages-compatible model reached through `DEEPSEEK_BASE_URL`, with directives such as `MOCK_TOOL` and `MOCK_ESCALATE`. Telemetry is disabled in dev runs.

**Why.** A separate `DSH_HOME` isolates sessions, credentials and plugins. The client hot-reloads under `dsh web`. The mock makes approvals, questions and tool calls reproducible without credentials.

**Rejected.** Developing inside the real desktop profile.

## 14. One Workspace per thread, next to the "Coordinator" group

**Context.** A Session joins a Workspace only when its immutable header cwd equals the Workspace's path. dsh's `workspace-write` sandbox root is the same header cwd. The previous release created every thread in one Workspace at the threads root and moved it into its folder with `workingDirectory.set`, which does not change the header; under `workspace-write` a thread could then write into sibling threads and the coordinator's folder.

**Decision.** Every thread gets its own Workspace at its own folder, titled like the thread and moved right after the "Coordinator" group in the sidebar order. The coordinator keeps the Workspace at the threads root. A folder the user already has as a Workspace keeps it. Archiving a thread removes a Workspace the plugin created once nothing else in it is live; the folder stays. `workspacePerThread` is gone.

**Why.** Each thread's write boundary is its own folder under every preset that has one, and the sidebar still shows the coordinator with its threads right below it.

**Trade-offs.** One sidebar group per thread instead of one group. A thread unarchived from the sidebar after its Workspace was removed shows under "Ungrouped". Threads made by the previous release keep the threads root as their header cwd.

**Rejected.** The shared group with `workingDirectory.set` (unsafe under `workspace-write`); `registerWritableRoot`, which can only add roots, not narrow them.

**Round 2: superseded by decision 39.** Executor Sessions no longer get a Workspace of their own. The write boundary argument still holds: each executor's header cwd is its own folder, now set with `sessionController.create({ cwd })`. Workspaces made under this decision are removed once on upgrade.

## 15. Hand-written client Remote spec

**Context.** dsh generates the client half of a Remote namespace with `@deepseek-ai/dsh-typert-generator`.

**Decision.** `src/client/remote.ts` holds the same spec by hand, in the shape the generator emits. It must be kept in sync with the `@Remote` methods in `src/index.ts`.

**Why.** The generator only runs inside a dsh-style workspace layout, which this repository does not use. The host side needs no generated file: the Gateway dispatches through its source fallback, which reads the decorator markers.

**Rejected.** Adopting the dsh workspace layout only to run the generator.

## 16. Folder guard in the host

**Context.** The coordinator chose any folder for a thread; `/`, `~` and `~/.ssh` were accepted and created, and a brief line `Working directory: ~/` became the home folder (finding B1).

**Decision.** `cwd-guard.ts` resolves the path through symlinks and always refuses `/`, the home folder and its ancestors, any dot-folder segment, system folders and `~/Library`. Strictly below the threads root is allowed. Any other folder needs the user to have typed that exact folder in the coordinator chat, and since round two also the user's confirmation or the allowed-folders list (decision 33). The brief heuristic goes through the same guard. A `threadsRoot` the guard would refuse is a panel problem and blocks thread creation (it used to fall back to the default silently).

**Parent folders.** A parent the user named does not authorise its children. Telling "the parent as the place to work" apart from a mention needs language understanding the host should not guess; the coordinator can pass the parent as `cwd` and name the subfolder in the brief, or ask the user.

**Why.** The folder decides where a thread starts and its write boundary; it must not depend on text a thread can plant.

**Rejected.** A prompt rule only; an allow-list of folders in the config. The allowed-folders list of decision 33 is managed in the panel, not in the config.

**Round 2.** "The threads root" is now the calling coordinator's own folder (decision 40). Every coordinator home, and a folder that contains one, is refused, as are folders that contain the dsh home or lie in it, and the caller's folder itself. Strictly below the caller's folder is allowed only for a folder that does not exist yet or that the plugin made for an executor (decision 41). The user's words count only from the calling coordinator's own chat. A refused base for new coordinators is a `bad-root` problem that disables only New coordinator; a coordinator whose own folder is refused carries `folderProblem` and its `executor_start` refuses until the user changes the folder.

## 17. One fence for thread text

**Context.** Raw report text, history and titles went into the coordinator's context under a header that told it to act on them (B1).

**Decision.** `fence.ts` is the only way thread text reaches the coordinator or another thread: control and invisible characters stripped, length capped, delimiter look-alikes neutralised, inside a `<thread-data>` block under a fixed header. Tool results render trusted JSON first and data blocks after it.

**Why.** One helper is easier to keep correct and to test against breakout attempts than escaping at every call site.

**Rejected.** JSON-encoding thread text only (the model reads JSON strings as text too, and a fixed delimiter with neutralisation is easier to state in the prompt).

## 18. A legacy coordinator stays where it is

**Context.** A coordinator created before the shared group lives in `<threadsRoot>/_coordinator`. A Session's folder cannot change.

**Decision.** Keep using that session and rename its Workspace to "Coordinator". When the plugin lost its table but a coordinator session is still live in the group, adopt it and archive extra ones, so one Coordinator row shows.

**Why.** Creating a new coordinator would lose the chat that holds the user's standing rules and the folders they named.

**Round 2.** The `_coordinator` Session stays the chat of the migrated coordinator, and validation accepts it below the legacy root. The recovery path "adopt the first marked Session and archive the extra ones" is gone: several coordinators may share a group, and new Sessions in a coordinator Workspace become coordinators through adoption (decision 43). A lost state file therefore no longer brings old chats back as coordinators.

## 19. Thread titles are session titles

**Context.** Threads should be named like other dsh sessions, the same everywhere.

**Decision.** The coordinator's `title` is normalised to dsh's session-title style (one short line, no prefix or id, at most 80 bytes) and set with `sessionController.rename` right after creation. The panel follows `session/title` events and reads titles back after a restart. Duplicates are allowed.

**Why.** dsh's own first-prompt generator would title from the brief header, needs a model call, and does not run for a brief recorded as an agent message. An explicit title is dsh's path for a name chosen up front, and it shows in the sidebar, header and tab at once.

**Rejected.** Letting dsh generate titles from the brief.

## 20. The model-free opening turn stays

**Context.** The coordinator's first turn exists only so dsh lists the session with its title. It leaves a "Completed in 1s" row.

**Decision.** Keep it. rc.2 marks a session as blank until a `turn/start`, and no API sets that otherwise. The pre-step listener acts only on the coordinator's step 1 when every message is the plugin's own opening message.

**Rejected.** Replacing the chat's turn-process renderer, which would change every session.

## 21. Threads message each other as colleagues, not as the user

**Context.** Threads that split one task need to share interfaces and findings.

**Decision.** `thread_peers` and `thread_send` for thread leads only. A peer message is an agent message attributed to the sender, fenced, with a header that it is not the user's instruction. It is delivered like a coordinator message: steer, followup through the slots, after the brief for a queued thread, and as an inject read on the next turn for a stopped or failed one, so a peer cannot restart a thread the user or coordinator stopped. Host limits per pair and per sender; the coordinator gets a quiet notice per message and one waking notice per looping pair.

**Why peer messages are notices.** A compromised thread must not gain the user's authority in a sibling. Agent messages are facts for auto review.

**Why no cross-thread history read.** Reading another thread's full history would hand every thread everything any thread saw, including planted text and private data. A peer asks the other lead, or the coordinator reads with `thread_read`.

## 22. One dsh process owns the coordinator

**Context.** The desktop app and `dsh web` on the same `DSH_HOME` both wrote the state file and both drove threads.

**Decision.** A lock file with pid and start time; a stale or reused pid is replaced. The second process mounts disabled and the panel says why.

**Round 2.** One process owns every coordinator of a `DSH_HOME`; nothing about the lock changed.

## 23. Archive only finished threads

**Context.** `thread_archive` archived with `stopActivity`, which cancels live work.

**Decision.** The host refuses unless the thread is idle, done, failed or stopped; `force` (for an explicit user request) archives anyway. Without `force`, dsh's own activity check also refuses.

## 24. The development spike is deleted

**Context.** The development verification spike shipped in the package behind an environment variable.

**Decision.** Removed from the source, the Remote contract and the client. Its findings are in dsh-api-notes.md.

## 25. Threads leave auto mode when the plugin is removed from a running app

**Context.** dsh's auto-review bundle switches every `auto` session to `danger-full-access` (no approvals) when it is removed from a running app. This plugin brings that bundle in.

**Decision.** On a live removal the plugin moves its threads to `workspace-write` and restores `auto` on its next load. Since round two this happens at every unload, quit included, and covers members; see decision 34.


## 26. A thread is busy while any member of its lead's tree works

**Context.** A lead that uses an Agent Team or subagents runs its members as child Sessions. The plugin watched only the lead, so a lead that ended its turn to wait for its members (dsh's own guidance tells it to) showed as idle or done and woke the coordinator before the work was done. Found in real runs.

**Decision.** The plugin tracks the lead's whole tree from `subagent/catalog` events, member `agent/status` and the members' own logs, and the runtime's `subagent-settled` messages. The thread stays `running` while the lead or any member works, and for 5 seconds after a member goes idle until its settlement arrives. Approvals and questions of members count as the thread's. The cap counts a thread with working members.

**Why.** The coordinator should hear once, when the whole team is done; the panel should show work as long as there is work.

**Rejected.** Polling `sessionController.state` of each member; listening to `subagent/start` and `subagent/end`, which dsh emits scoped to the tree root's context, not globally.

## 27. Reports wait for the whole tree; one result per team run

**Context.** A real lead wrote its final message 23 seconds after `coordinator_report`, longer than the 15-second hold, so one result woke the coordinator twice. A lead could also report a result while members still work.

**Decision.** A waking report is held until the lead's turn has ended and its members are quiet, at most 2 minutes (10 minutes while members work). A result that goes out while members still work says so in a plugin line, and the lead's tool result tells it to wait and send one updated result. Status notices that no longer hold at delivery are dropped. A turn that a member's result started inherits the owner of the turn before it.

**Rejected.** Refusing `result` while members work: a lead may rightly report and leave a member to finish an optional extra.

## 28. `thread_stop` stops the members, and holds their results back

**Context.** `sessionController.cancel` stops only the lead's turn. Members kept running, and when each settled, dsh handed its result to the lead, which started a new turn and undid the stop.

**Decision.** `thread_stop` interrupts every running member (`subagents.interrupt`, user authority) and cancels the lead. Until the user, the coordinator or a peer sends the thread something, a pre-step listener enters a lead step whose messages are all settlement notices with no messages, so the turn closes without a model call; the notices are injected again for the lead's next real turn.

**Rejected.** `subagents.drainDescendants`, which closes the tree's admission until the lead's Agent is unloaded, so later team runs of the same lead would no longer wake it when members finish.

## 29. Members get no thread tools; the coordinator gets no children

**Decision.** `coordinator_report`, `thread_peers` and `thread_send` are admitted by the thread table, which holds leads only, so members never get them or the role prompt. Members report to their lead, and the lead reports once. The coordinator's allow list has no subagent, workflow or team tools (decision 32), and its Agent Teams mode is never enabled, so it cannot do thread work through children.

**Why.** One voice per thread towards the coordinator, and the coordinator stays a planner.

## 30. The user picks how threads run: Auto review or Ask me

**Context.** Threads run autonomously in dsh's auto mode, because approving every action by hand does not suit autonomous work. The user must still be able to run threads with manual approval, through a visible control rather than an opaque setting, with a short note at the start that auto is the default.

**Decision.** A "Threads run in: Auto review | Ask me" control on the Coordinator page, persisted in the plugin state; `threadPermission` in the config is only the initial default (`auto`). `ask` maps to dsh's `workspace-write` preset. It applies to threads started afterwards and, through dsh, to their team members. The Remote method accepts only `auto` and `ask`; what a thread actually runs on follows decision 34. The coordinator welcome and the empty Coordinator page carry a one-sentence note. The control mirrors dsh's composer picker: its labels, the `EXP` badge and its acknowledgement before Auto review, in dsh's own words when its dictionary is loaded.

**Rejected.** Switching running threads (a mode change mid-task would surprise the lead and its reviewer); `danger-full-access` or `read-only` as choices (looser than auto review, or useless for work).

## 31. No plugin presets; threads and the coordinator run on `standard`

**Context.** Sessions recorded the plugin's own presets (`thread`, `coordinator`). After the plugin was removed, dsh refused to resume them ("Unknown agent preset"), and the two presets showed in every Session's preset picker (I1). The `thread` preset was a hand-kept copy of `standard`, so the user's Standard customisations did not reach threads (I5).

**Decision.** `cordis.patch.yml` declares no preset. Threads and the coordinator are created on `standard`. Role prompts and role tools stay gated by the thread table. Sessions of earlier releases are moved to `standard` once on load: the old name is registered for a moment as an empty alias so dsh can resume the Session, the Agent is recomposed on `standard`, and `agent-preset/selected` is logged.

**Why.** Removing the plugin must leave working Sessions. dsh allows a preset change on a live Agent through `agentPresets.recompose`, and the logged selection is what dsh reads on the next resume, so a migration is possible and a permanent alias is not needed.

**Trade-offs.** Members of old threads keep the old preset name. State-file validation can no longer use the preset name as the plugin's mark (decision 35).

## 32. The coordinator is narrowed at runtime; threads lose only the plugin tools

**Context.** On `standard`, and before that as a global registration, the coordinator got every third-party tool: terminals, worktrees, MCP tools, working directory (I4).

**Decision.** `agent.ctx.tools.restrict({ allow })` with an explicit list: the thread tools, read-only file and web inspection, past-session search, the user-question tool and todos, plus `coordinatorExtraTools`. Tools that execute, write or spawn work are never added. The list is computed against the registry and recomputed on every `tools/change`. Thread leads get `restrict({ deny: ['plugin_manager', 'plugin_market'] })`, and the dsh-home guard refuses those calls from every thread agent, since members compose their tools from the preset where `restrict` cannot remove them.

**Why.** Default-deny is the only way a coordinator stays "no shell, no write" when other plugins add tools. A thread should not install code into the user's dsh; the earlier thread preset left those tools out too.

**Rejected.** A plugin preset for the coordinator (decision 31).

## 33. Folders outside the threads root need the user's confirmation

**Context.** Any path the user mentioned authorised a folder, including "never touch ~/dev/x", pasted logs and URLs; a symlink the user named could redirect a thread; a new thread could reuse another thread's folder.

**Decision.** The mention stays as a pre-filter. A folder outside the threads root then runs only when its real path is on the user's allowed-folders list, or after the user confirms the real path. The thread is recorded without a Session and shows as "Needs you: confirm folder <real path>". The host raises a dsh question card in the coordinator chat (Allow once, Always allow, Deny) with `userQuestions.ask`, and the thread's row on the Coordinator page and in the pane has the same buttons. The allowed folders are listed on the Coordinator page with Remove. Another live thread's folder and the coordinator's folder need the same confirmation.

**Why.** The user sees the real path and decides; nothing the model does can answer. The native card is dsh's own UI and needs no model tool call. A dsh approval card (`approval.request`) was not usable: it needs an open turn of the asking Session and offers no "always". The question card needs a connected browser and does not survive a restart, so the row buttons are the reliable path; whichever answers first wins.

**Round 2.** "Outside the threads root" now means outside the calling coordinator's folder, and an existing folder below that folder needs the same confirmation (decision 41). The card goes to the owning coordinator's chat. The allowed-folders list stays global (decision 46).

## 34. One table for a thread's permission, applied everywhere

**Context.** Live removal of auto review left members on full access and leads on `danger-full-access` while the log said they ask (I2); without auto review a thread ran on the profile default; at boot without auto review, threads were dead but the panel showed them as idle (I3).

**Decision.** `permission.ts` decides the effective preset from the chosen mode, whether auto review is loaded, and whether the plugin is unloading. The service applies it to leads and members at start, at member creation, on resume, on catalog change, on restore and on unload. A thread whose `workspace-write` cannot be set is not started. Members are only narrowed (sandbox), never widened. A cold lead whose log says `auto` cannot be resumed without auto review; it is marked and listed as a panel problem, and messages to it are refused.

**Why.** One rule that is never looser than the chosen mode, instead of special cases in four places.

**Rejected.** Depending on dsh's internal fiber state to tell a live removal from a quit: parking at every unload is safe, and the next load restores the chosen mode.

## 35. The state file is a hint, checked against the Sessions

**Context.** Any Session id in the state file became a thread or the coordinator, and a queued brief was re-sent as a user prompt.

**Decision.** A stored coordinator id needs its Session in the threads root with the plugin's opening message or "Coordinator" title. A thread row needs its Session to exist, not to be a member, to work in the row's folder, and to carry the plugin's brief (or, while its brief is queued, never to have run a turn). Dropped entries are a panel problem. Restored briefs are always notices. Saves use random temporary names.

**Why.** These marks are written into Session logs by the plugin through dsh, which the state file alone cannot forge. A thread that can rewrite Session logs is beyond this check; the dsh-home guard (decision 37) stands in its way.

**Round 2.** A coordinator record needs its Session's header cwd in the record's home, the home to be a recorded coordinator Workspace that passes the folder checks, and a mark bound to it: the opening message with its coordinator id (or the legacy form), the role mark of an adopted chat, a "Coordinator" title, or the old preset. See decision 45.

**Fix pass.** The title, the unbound opening message and the old preset now count only for the coordinator migrated from version 1. Rows are validated first, a row's owner comes from its Assignment's id, and a corrupt or newer file fails closed. See decisions 50 and 51.

## 36. Spend guards pause a thread until the user resumes it

**Context.** The wake guard was a sliding window, peers could wake each other repeatedly, and schedule reminders counted as user turns and bypassed the cap.

**Decision.** The wake guard latches into a pause; a per-thread daily budget of thread-owned turns (`threadTurnBudget`, 200, off by default since decision 60) pauses too. A paused thread shows "Needs you: paused after N …" with Resume; its thread-owned turns are held at the first step and its input waits. The user resumes it with the button or by typing in the thread. Schedule reminders are thread-owned and wait for a slot.

**Why.** An absolute bound on spend that the user lifts, without removing scheduling from threads.

## 37. A host guard keeps thread agents and the coordinator out of the dsh home

**Context.** A resumed lead listed `~/.dsh`, read Session logs in the dev home and wrote decoded copies to `/tmp`. dsh does not sandbox reads, and the dsh home holds the credentials (G1).

**Decision.** `home-guard.ts` denies tool calls of the coordinator and of every agent in a thread's tree whose path arguments resolve into the active dsh home or `~/.dsh`, or whose other text names one in a common spelling. In Ask me mode it also refuses file writes to temp folders outside the thread folder, which dsh's `workspace-write` allows. It runs as an appended `tools/pre-execute` listener and as a `tools.guard`. Denials are counted and the coordinator hears once.

**Why.** Defence in depth for the most valuable target. The pre-execute listener avoids an approval card for a call that will be denied anyway, and the guard cannot be undone by another plugin.

**Trade-offs.** The text check is best effort; auto review stays the main control in auto mode.


## 38. Several coordinators, each a record the plugin owns

**Context.** The user pressed New Session on the "Coordinator" group in the sidebar. dsh created an ordinary Session there, because every coordinator behaviour was keyed on one stored Session id. That Session had shell and write tools, its cwd was the threads root (the parent of every executor folder), and the dsh-home guard did not cover it.

**Decision.** A coordinator is a record: id, chat Session, home (the chat's fixed header cwd and its Workspace), folder (where new Executor Sessions go), title, timestamps. Any number of coordinators may exist and may share a Workspace; at most 20 are live at once. Every executor belongs to one coordinator for life, and executor ids stay unique across coordinators. New coordinator on the page creates one in its own folder (decision 40); a new Session in a coordinator Workspace becomes one (decision 43). "Coordinator" stays the name of the feature and the role.

**Why.** It gives the user parallel, unrelated pieces of work with one chat each, and it closes the hole: every coordinator and candidate is narrowed and guarded from its first step.

**Rejected.** One coordinator per group with the adoption of decision 18 (the cause of the bug); transferring executors between coordinators.

## 39. Executor Sessions have no Workspace; they show under Ungrouped

**Context.** One sidebar group per executor (decision 14) filled the default sidebar view. A plugin cannot filter or add a section to the sidebar's session list, cannot create a hidden top-level Session, and dsh hides only subagents and unselected blanks.

**Decision.** Executors are created with `sessionController.create({ cwd, agentPreset: 'standard' })` and no Workspace. dsh lists them under Ungrouped, also when the folder is one of the user's Workspaces (corrected in decision 58). Superseded by decision 59: each executor now has its own group again. The coordinator is the entry point: its sidebar row shows a count of its executors that need the user or run, its hover card names the numbers, the side pane lists only its executors, and the Coordinator page shows each coordinator with its executors. The Workspaces made under decision 14 are removed once on upgrade when nothing else lives in them (`workspacesMigrated`).

**Why.** It is the only option that removes the clutter in dsh's default flat view, it uses verified APIs, and it reuses the pane and the page. The header cwd, and so the `workspace-write` root, is the executor's folder as before.

**Trade-offs.** Ungrouped is shared with the user's other loose Sessions, and its expansion is the user's. Runtime behaviour of a `cwd`-only Session in the desktop app is still to be checked (dsh-api-notes.md).

**Rejected.** Nesting each executor's Workspace under its coordinator's (helps only in the Workspace Tree view, which the plugin cannot switch on, and breaks for outside folders); keeping one group per executor; making executors subagent children of the coordinator (not possible through the API, and it would break Agent Teams, `ask_user_question`, approvals and auto review roles, and cascade archiving).

## 40. Each new coordinator gets its own folder next to dsh's default workspace; the folder can change

**Context.** New coordinators should live next to dsh's default workspace, each with a folder of its own that the user can change.

**Decision.** The base is `coordinatorBase`, else the parent of the registered Workspace ending in `deepseek-harness/default-workspace`, else `~/Documents/deepseek-harness`. New coordinator takes the first free `coordinator`, `coordinator-2`, ... below it and registers it as a Workspace titled "Coordinator", "Coordinator 2", ...; Choose folder... uses a folder the user picks, refusing one that is a Workspace with the user's own Sessions. A coordinator's folder starts as its home and is changed with Change (native picker, else a path field) through the owner-only `setCoordinatorFolder`. Only new executors use the new folder; the chat cannot move. `threadsRoot` is legacy and only locates the migrated coordinator's chat (see decision 45).

**Why.** One group per coordinator, like one per dsh project, and a folder the user controls. No model tool can change it.

**Rejected.** One shared folder for all new coordinators; asking macOS for the Documents folder from the plugin (osascript); keeping `threadsRoot` as the default for new coordinators.

**Fix pass.** New folders are named `coordinator-<slug>` after the coordinator's name, and titles carry the name (decisions 53 and 55). A coordinator folder may not lie in or around another coordinator's home.

## 41. An existing folder below a coordinator's folder needs the user's confirmation

**Context.** Below the old threads root meant "made by the plugin", because nothing else lived there. Once a coordinator's folder can be `~/dev`, "below the folder" includes the user's repositories.

**Decision.** Below the caller's folder, a folder runs without confirmation only when it does not exist yet or a live executor row records it as plugin-made (`ownFolder`). Any other existing folder below it is treated like an outside folder: the user must have typed it in that coordinator's chat, then the allowed-folders list or a confirmation with the reason `existing` ("An existing folder inside the coordinator's folder"). Rows from a version 1 file get `ownFolder` when they lie strictly below the old root.

**Why.** It keeps T2 from weakening quietly when the folder moves.

**Fix pass.** A new folder counts as plugin-made only when its nearest existing parent is the coordinator's folder or a plugin-made executor folder, so a new child of the user's repository is treated like an existing folder. A folder inside or around another live executor's folder needs confirmation, not only the same folder.

## 42. Tools are scoped by the caller in the host; no peers across coordinators

**Context.** The tools never learned who called them, and lookups searched every row. With several coordinators that would let one coordinator read, message or stop another's executors.

**Decision.** Every op takes the calling Session id from `exec.agent.id`; a call without one fails. `scope.ts` finds a target only among the caller's live executors (`findOwned`), by id, Lead session id or a title unique among them. Another coordinator's executor, an archived one and a row without a coordinator get exactly the error of an id that never existed. `executor_list` lists the caller's executors; `executor_peers` and `executor_send` see only executors of the same coordinator; `executor_send` refuses every coordinator chat, not only the owner's. Authority and the folder pre-filter read the caller's own chat. Owner-only Remote methods still address any executor by id.

**Why.** A coordinator is the user's unit of a task; two coordinators are unrelated work. If two pieces of work must talk, they belong under one coordinator. Identical errors stop a coordinator from probing for others' ids.

**Rejected.** Peers across coordinators.

## 43. A new Session in a coordinator Workspace becomes a coordinator at `agent/created`

**Context.** The user's gesture (New Session on a coordinator's group) should give a coordinator, not a plain Session.

**Decision.** dsh awaits `agent/created` before releasing queued work, so the listener there makes a Session a candidate when its header cwd is a coordinator Workspace, it is no subagent, Lead, Teammate or plugin-made Session, it is not archived, and it has no turn. A candidate gets a coordinator id, the coordinator's narrowing and an injected role mark (`dsh-coordinator:role:<id>`) at once; tools, role prompt and the dsh-home guard apply from its first step. It is persisted on its first message the user typed (or its first coordinator tool call). Live blanks are picked up again after a restart. Sessions with turns are never adopted. dsh titles it; it has no welcome.

**Fix pass.** Promotion by a tool call is gone, Sessions with turns in a coordinator Workspace are fenced, and an adopted chat is named and runs on `workspace-write`. See decisions 49 and 53.

**Why.** Coordinator behaviour is evaluated per request, so a candidate is a coordinator before its first model step. The role mark is what validation checks later.

**Deviation from the design.** The design injected the role mark on the first user message; the code injects it when the candidate is made. Validation copes with a missing mark while the Session has no turn.

**Rejected.** Adopting Sessions that already have turns; renaming adopted chats.

## 44. Notices route to the owning coordinator and wait for it

**Decision.** A notice carries its coordinator id from the moment it is made, because its row can disappear before the batch flushes. One batcher stays; each ready batch is grouped by coordinator and delivered to that coordinator's chat. While a chat is archived or gone, notices are held on the record (the last 50) and handed over quietly when the chat is reopened or unarchived. A notice whose coordinator record is gone is logged and dropped. The folder confirmation card goes to the owner's chat, Assignments and messages are attributed to the owner's Session, and every Session that has been a coordinator chat counts as "coordinator" in `executor_read`.

**Why.** Coordinator A's executors must never wake or inform B.

## 45. State file version 2, with a one-time copy of version 1

**Context.** An existing version 1 file holds one coordinator Session id, executor rows, archived rows, allowed folders and the user's permission choice. Nothing may be lost.

**Decision.** `parseState` upgrades version 1 in memory: one coordinator record (old Session id, home and folder the legacy `threadsRoot`, title "Coordinator", `migratedV1`), `threadsRoot` as a coordinator Workspace, that coordinator's id on every row, archived ones included. After validation the service moves the record off the old root (owner feedback): its folder becomes `<base>/coordinator-<name>` like a New coordinator's, and without a chat its home moves there too; a chat of that release keeps its home. Folders are created lazily. With a refused base the old root stays. A file with rows but no Session id still gets the record. Before the first version 2 write the store copies the original once to `state.v1.json` (0600, never overwritten); if that copy fails nothing is written. A newer version stays read-only, so a release before version 2 reading the new file runs without saving. Validation then checks each coordinator record against its Session (decision 35, round 2). An executor whose coordinator was dropped is kept under "Without coordinator", reachable by no tool, with only Archive.

**Why.** The original file survives any bug in the upgrade, and a downgrade never overwrites a newer file.

**Rejected.** Re-assigning rows of a dropped coordinator to another one silently.

## 46. The running cap, the run-in mode and the allowed folders stay global

**Decision.** `maxRunningThreads`, the "Executor Sessions run in" choice and the allowed-folders list apply to all coordinators together. The FIFO queue is shared.

**Why.** The cap guards model capacity and the machine, which coordinators share; one mode and one list are easier to understand.

**Fix pass.** The allowed folders are still one list, but loaded entries are no longer approvals (decision 54), and the card says that "Always allow" applies to every coordinator. A round-robin pump per coordinator is a small change if one coordinator starves another.

## 47. Archiving a coordinator, optionally with its sidebar group

**Decision.** Archive coordinator on the page archives the chat and the coordinator's finished executors and keeps the record. It is refused while executors work, wait or have a pending Assignment; the page then names them and its Stop and archive sends `force`, which stops and archives them too. A checkbox also removes the home Workspace from the sidebar, never files, unless another live coordinator or candidate lives there or it holds another unarchived Session; the result says which, and the page explains a kept group. Reopen brings an archived coordinator back with a new chat.

**Why.** A coordinator's sidebar group can go with it when the work is done, without any risk to files or to other Sessions.

## 48. User-facing names from the Super Agent draft and dsh

**Context.** dsh never shows "thread", and the Super Agent draft uses "Thread" for something else.

**Decision.** "Coordinator" stays as the feature and role name. A delegated session is an "Executor Session" (short "executor"; zh 执行器 Session, 执行器), its first message an "Assignment" (派工), its report a "Report" (报告); its root agent is the "Lead", team members are "Teammates" (队友). The run-in labels "Auto review | Ask me" stay; the control is labelled "Executor Sessions run in". Model-facing tools are `executor_start`, `executor_message`, `executor_list`, `executor_read`, `executor_flag_user`, `executor_stop`, `executor_archive`, `executor_peers`, `executor_send`; `coordinator_report` stays. They live in `names.ts`, and the prompts take them through placeholders.

**Not renamed.** Persisted marks (`dsh-coordinator:brief:` and the others), id prefixes, the storage folder, the package name, config keys, the `<thread-data>` fence tag and internal identifiers (`ThreadInfo`, `threads.ts`). `authority.ts`, `history.ts` and the guards still recognise the old `thread_*` names, because existing Session logs carry them.

## 49. A candidate becomes a coordinator only with a message the user typed

**Context.** Decision 43 also promoted a candidate on its first coordinator tool call. Anything that could open a top-level Session in a coordinator Workspace with an opening message that is not the user's (a schedule, a workflow, the dsh CLI run from an executor's shell, another plugin) would then get a persisted coordinator that starts executors with no user involvement (security review S4).

**Decision.** A candidate is promoted only when a message the user typed (source `user`, no principal) starts a step, seen in the first-in-chain `agent/pre-step` listener, or in the logged `user/message`. A tool call never promotes. A candidate still lists the coordinator's own tools, and `callerCoordinator` refuses every call from it ("this session is not a coordinator yet: it becomes one with the user's first message typed in it").

**Why the tools stay listed.** dsh rc.2 composes a turn's tool list before it logs the user's first message (seen in the dev server). If a candidate listed no coordinator tools, the "+" chat could not delegate in its first turn, because promotion happens after the list is built. Listing them and refusing the call in the host keeps the gesture working and still lets only a typed message make a coordinator.

**Trade-offs.** It depends on dsh's order of tool listing and message logging; on a dsh where that changes, either the first turn loses the tools or a check is needed again.

**Rejected.** Not listing the tools for candidates, which breaks the first turn.

**Not done.** Adopting only Sessions with no `origin`, as the security review suggested; reason not recorded.

## 50. Assignment marks carry the coordinator id

**Context.** A row's `coordinatorId` was taken from the state file, so a writer of the file could move rows to another coordinator, which could then read and message them.

**Decision.** New Assignments are delivered with request id `dsh-coordinator:brief:<executor id>:<coordinator id>`. After a restart a row's owner is the coordinator its Assignment names, not the stored `coordinatorId`. An Assignment of an earlier release (no coordinator in the id) binds only to the coordinator migrated from version 1. Rows whose Assignment is not delivered yet (folder confirmation, queued) keep their stored owner. A record without a chat is kept only when a validated live row names it this way. Rows are validated before coordinators, so a forged row that names a real coordinator's chat is dropped without dropping the coordinator.

**Why.** The mark lives in the executor's Session log, which the state file cannot write. The persisted mark prefix stays `dsh-coordinator:brief:` (decision 48).

**Trade-offs.** The owner of an undelivered row is still stored data; it is a residual risk in security.md.

## 51. The state file fails closed, and stored Sessions are fenced from load on

**Context.** A corrupt or newer state file gave an empty table, so every coordinator chat came back as a Standard Session with shell, and every executor ran without the dsh-home guard. Sessions resumed while validation ran were not classified at all.

**Decision.** From the moment the plugin loads, every stored coordinator chat, its earlier chats and every stored live executor Session are narrowed and guarded; `agent/created` waits for validation before it decides. When the file is corrupt (moved aside) or newer (read-only), the service runs degraded: Sessions are classified by their log marks, at `agent/created` or at the first tool call of an Agent that was already live. A chat with the plugin's opening or role mark is fenced as a coordinator-like chat (reading only, no plugin tools); a Session with a plugin Assignment keeps the dsh-home guard and loses the plugin tools. The page problem says so. The guard's text check also catches the state folder in find and glob forms and `.credentials.yaml` by name.

**Why.** Narrowing a Session by mistake is safe; running one unclassified is not.

**Trade-offs.** Nothing re-adopts fenced chats automatically and there is no restore of the last good file; the user sets things up again.

**Not done.** Keeping the last good state as `state.json.bak` and offering to restore it, as the security review suggested; reason not recorded.

## 52. Each executor keeps a snapshot of its coordinator's Executor prompt

**Context.** The owner asked for per-coordinator standing instructions that every executor of that coordinator starts with.

**Decision.** `CoordinatorInfo.executorPrompt` (at most 4000 characters, cleaned of NUL and control characters other than newline and tab) is set only through the owner-only `setExecutorPrompt`; no model tool can read or change it. `executor_start` copies the current text onto the row, and the Lead's role prompt carries that copy for the executor's life, between tags whose suffix is a hash of the text, as the user's standing instructions with authority over the Assignment and coordinator messages. Teammates get it only through the Lead. The coordinator prompt says the Executor prompt exists but not what it says. Stored prompts are cleaned on load like other fields.

**Why a snapshot.** The request says the prompt applies to executors started after the save. Storing the text with the row makes that hold for the executor's whole life, across restarts, and keeps the tag suffix stable across steps.

**Trade-offs.** A writer of the state file can set an Executor prompt, or a row's copy, which then reaches executors as the user's words. It is listed as a residual risk.

**Rejected.** A separate injection for Teammates: the lead decided that the prompt reaches Teammates only through the Lead.

## 53. Coordinators have names, and titles carry them

**Context.** Several coordinators titled "Coordinator", "Coordinator 2", ... were hard to tell apart in the sidebar, and duplicate group titles appeared (N1).

**Decision.** Every coordinator has a unique name (case-insensitive among live coordinators): a random unused one from a built-in list of 98 philosophers, scientists, mathematicians, novelists and poets, women and men (30 English-speaking, 30 German-speaking, 30 Chinese, 8 from elsewhere), with a number added when all are used. Chinese names are written in Chinese characters in every locale. The chat and its sidebar group were titled `Coordinator <name>`, cut at dsh's 80-byte title limit; decision 55 changed this to the bare name. A new home is `<base>/coordinator-<slug>` (pinyin for Chinese names). Existing coordinators get a name on load and a chat or group still titled "Coordinator" or "Coordinator N" is renamed once; folders are never renamed. The owner-only `renameCoordinator` accepts 1 to 40 characters without control or invisible characters; the chat and group follow when they carry a plugin title. An executor may not be titled like a legacy coordinator.

**Why.** The owner asked for names. The role stays in the title so the sidebar stays understandable, and one name per coordinator also ends the duplicate group titles.

**Not done.** Per-locale name variants and renaming existing folders; reason not recorded.

## 54. Allowed folders loaded from the state file ask again

**Context.** Allowed folders were honoured as approvals straight from the state file, so a forged entry skipped the confirmation for every folder under it.

**Decision.** Entries loaded from the file are listed on the page but are not approvals. A folder under one asks for the user's confirmation again until the user picks "Always allow" for it once more in this run of the app (`allowedConfirmed`, kept in memory only). "Always allow" stays global for all coordinators, and the card and the row say so.

**Why.** The security review offered two fixes: drop loaded entries, or keep them as hints that still raise the card. The second keeps the user's list visible while a tampered file cannot widen folders silently.

**Trade-offs.** After every restart the user confirms each allowed folder once more.

## 55. Coordinator titles are the bare name

**Context.** After decision 53, chats and groups read "Coordinator Noether". The security re-review found that names were compared only in lower case, that invisible characters and digit-only names passed, and that an executor could be titled exactly like a coordinator's chat.

**Decision.** Owner decision: a coordinator's chat and sidebar group are titled with the bare name (`Noether`, `鲁迅`). Titles an earlier build gave (`Coordinator <name>`) are renamed once on load. Names lose invisible characters on save and load, a name of only digits is refused, and names are compared by `nameKey` (NFKC, invisible characters and soft hyphens removed, case folded). An executor title that equals or imitates any coordinator's name, chat title or `Coordinator <name>` is refused. Titles stay no mark except for the migrated version 1 coordinator.

**Why.** The owner chose the bare name. The comparison and the executor-title rule close the look-alike gaps the re-review listed.

## 56. Unknown Sessions are always classified by their log marks

**Context.** Mark-based classification ran only while the state file was unusable (decision 51). A valid file with records removed, or the fresh file written after a corrupt one, switched it off again (re-review N1).

**Decision.** Every top-level Session the plugin does not know is classified by its log marks at `agent/created` and before its first tool call, whatever the state file says. After an unusable file the fresh file records `degradedSince`, and the page keeps its `state-reset` notice on later starts until the owner opens or creates a coordinator. On load every live Session in a stored coordinator Workspace is fenced provisionally, and Sessions opened in a coordinator home while the plugin creates a chat there are fenced until the creation ends. A stored row whose Session sits in a coordinator home is refused.

**Why.** Removing records from the state file must not lift restrictions.

**Trade-offs.** A fork of an Executor Session outside a coordinator Workspace is fenced as an executor.

## 57. The Executor prompt snapshot is bound by a hash in the Assignment mark

**Context.** A writer of the state file could rewrite the per-row Executor prompt copy of running Leads (re-review N2).

**Decision.** The Assignment's request id carries a hash of the snapshot (`dsh-coordinator:brief:<executor>:<coordinator>:p<hash>`). On load a snapshot whose hash does not match is dropped and reported; a row whose Assignment is not delivered yet takes its coordinator's current prompt again. Invisible characters are removed from Executor prompts on save and load.

**Why.** The hash lives in the Lead's own log, which the state file cannot write.

**Trade-offs.** The coordinator-level prompt itself still comes from the state file; it stays a known limit.

## 58. Executor Sessions stay under Ungrouped; grouping them under the coordinator is not possible on rc.2

**Context.** The owner asked for Executor Sessions to be listed under their coordinator's name in the left sidebar, else the dsh default.

**Finding.** On dsh rc.2 a Workspace accepts only Sessions whose folder is exactly its folder, `create` takes a Workspace or a folder but never both, and nothing attaches a folder-only Session later (dsh-api-notes.md, Sessions). An executor's folder is its header cwd and its `workspace-write` root, so it cannot join the coordinator's group without moving its work into the coordinator's home. Executors whose folder is one of the user's Workspaces also show under Ungrouped, which corrects decision 39.

**Decision.** The dsh default: executors are created with `cwd` only, as before, and listed under Ungrouped with their own titles. The coordinator's group holds its chats. The Coordinator page and the Executor Sessions pane group executors by coordinator.

**Open.** One plugin-made Workspace per executor folder, titled with the coordinator's name, is left open pending the owner's choice. In the default flat view it gives one top-level group per executor; only "Group by workspace tree" would nest executors whose folder lies below the coordinator's home, and not at all when the coordinator's folder is elsewhere. It would also bring back per-executor Workspace removal on archive (decision 14, removed by decision 39).

**Follow-up.** The owner chose this alternative; see decision 59.

## 59. Each Executor Session gets its own sidebar group next to its coordinator

**Context.** Decision 58 left one plugin-made Workspace per executor open. The owner chose it.

**Decision.** An executor is created inside a plugin-made Workspace at its own folder (`sessionController.create({ workspaceId })`), so its cwd and write root stay its folder. The group is titled "<coordinator name> · <folder base name>" and placed right after the coordinator's group and the groups of that coordinator's earlier executors; dsh keeps it collapsed until the user opens it. In "Group by workspace tree" it nests under the coordinator's group when the folder lies below the coordinator's home. A folder that already is one of the user's Workspaces is joined, never renamed, moved or removed. Archiving removes a plugin-made group once every Session in it is archived. A coordinator rename retitles its executors' groups. Live executors of earlier builds are attached to their groups once on load (`executorGroups`). Coordinator names may not contain a middle dot, so a group title cannot imitate a coordinator's. If no group can be made, the executor is created with `cwd` only (Ungrouped).

**Why.** The owner wanted executors next to their coordinator in the sidebar, and on rc.2 a group can only hold Sessions whose folder is exactly its folder.

**Trade-offs.** In the default flat view there is one top-level group per executor. A New Session the user opens in an executor's group is the user's own plain session, not guarded.

## 60. Defaults raised for heavy use

**Context.** The owner found the defaults too conservative for real work: six Executor Sessions at once, a daily turn budget of 200, and low wake and peer limits paused or queued work that was meant to run.

**Decision.** At the owner's request the defaults are `maxRunningThreads` 128, `threadTurnBudget` 0 (no daily turn budget; a positive number still sets one), `wakeMaxPerThread` 60 per 10 minutes, `peerMaxPerPair` 40 and `peerMaxPerThread` 200 per 10 minutes. Notice batching, the cap of 20 coordinators and the other limits stay.

**Why.** Heavy use needs many Executor Sessions running and long runs without a daily stop. The wake and peer limits stay as loop brakes: a runaway executor or two executors messaging each other in a loop still pause, only later (the peer limits pause since decision 62).

**Trade-offs.** Without a turn budget nothing bounds an executor's total turns per day; an executor that works steadily without waking its coordinator or messaging peers can run until the user stops it. A user who wants that bound sets `threadTurnBudget`.

## 61. Settings on the Plugins page through dsh's shared forms, with a volatile and loose Config

**Context.** The owner asked that clicking dsh-coordinator on the Plugins page offer its settings, as the Subagent plugin does. Until now the config could only be edited by hand in the profile patch.

**Finding.** dsh's settings service (`dsh-settings`) offers a form for every plugin entry whose `static Config` (Schemastery) has fields marked `.volatile()`, keyed by the entry id, and writes edits into that entry's `config` in the profile patch. A volatile field reaches the running service as a `Volatile` reference, so nothing remounts. The service reports `autoGenerate`, but no shipped client generates a form from it: each official page is its own client plugin over `ctx.configForms` and the shared primitives. The Plugins page has open slots for third-party pages: `plugins.bundle.config` (keyed by package name) and `plugins.row.config`.

**Decision.** The host declares `static Config` from one field list (`CONFIG_FIELDS`), with dsh's own Schemastery resolved at runtime. Every key but the legacy `threadsRoot` is volatile, every key is loose, and `threadsRoot` is hidden. The client registers its own form into `plugins.bundle.config`, using dsh's `SettingsFormModel` and field components so it looks and saves like the Subagent page. The thread service reads every value through `liveConfig`, which unwraps the `Volatile` and runs `parseConfig` on each read.

**Why.** It is the same path dsh's own settings pages take, so persistence, conflicts, read-only profiles and save errors behave as there. Volatile fields apply without restarting the plugin, which would otherwise interrupt running coordinators. Sanitizing on every read keeps the security rules in one place: the form cannot widen what a patch could not, and no model tool reaches either. Loose fields keep the old behaviour of `parseConfig`, where a bad value falls back to the default instead of stopping the plugin from loading.

**Trade-offs.** The form is hand-written, so its fields must be kept in step with `CONFIG_FIELDS` and `parseConfig`; a test checks that. Schemastery and the primitives are not declared dependencies: they come from the running dsh, and without Schemastery the plugin works but has no form. The form sits below the bundle's README rather than on a page of its own, because `plugins.item` pages are reserved for official plugins. The form has no German strings, like the rest of the client (`locales.ts` has `en` and `zh`).

## 62. Peer limits pause, not only throttle

**Context.** The final audit found that a peer loop was throttled but never stopped. A turn started by a peer message does not wake the coordinator, so the wake guard never counts it, and the peer limits only refused messages inside a sliding window. With no daily turn budget by default, two Executor Sessions could message each other about 40 times per 10 minutes indefinitely.

**Decision.** The peer limits latch like the wake guard. One message past `peerMaxPerPair` within the window is refused and pauses both executors of the pair; one past `peerMaxPerThread` is refused and pauses the sender. The pause is the existing one (reason `peers`): "Needs you", a notice to the coordinator once per executor, held input, and Resume on the row or typing in the executor. A paused executor cannot send peer messages. Resume resets the executor's sender count and every pair count it is part of.

**Why.** A loop between two executors has two participants, and pausing only the sender would let the other side keep a turn going. The limits stay high, so legitimate collaboration below them is untouched.

**Trade-offs.** An executor that receives many messages from a looping peer is paused although it may only have answered. The user resumes it with one click, and the coordinator is told which pair looped.

## 63. The package is renamed to dsh-whalepod; installed ids keep dsh-coordinator

**Context.** The owner chose the name "Whalepod". The plugin shipped so far as the package `dsh-coordinator`, and the same string is the plugin entry id, the storage folder, the lock, the log marks and the message source kind.

**Decision.** The npm package and repository are `dsh-whalepod`, and the Plugins page shows the title "Whalepod" (`meta.title` in en, zh and de). The feature inside the app stays the Coordinator. Everything that names the package changes: `package.json`, the bundle row's `name` in `cordis.patch.yml`, the client module id (dsh imports `<package>/client`), the Remote spec's `package`, the `plugins.bundle.config` slot key, the pack and release file names, and the install and uninstall commands. Everything installed data depends on keeps `dsh-coordinator`: the entry id (it keys the user's settings row and dsh's settings namespace), `storages/dsh-coordinator` with its state file and lock (still covered by the dsh-home guard), the log marks (`dsh-coordinator:role:`, `:brief:`, `:opening:`, `:msg:`), the notice header, the message source kind, the folder question id, the Remote namespace `coordinator`, the id prefixes, the client's localStorage keys and the host log prefix `[dsh-coordinator]`, which nothing parses but which matches the other ids.

**Why.** Renaming a stored id would orphan the user's coordinators, Executor Sessions and settings, or need a migration for no gain.

**Upgrade.** dsh installs by package name, so the old package is removed and the new one added. Removal drops `dsh-coordinator` from the profile's bundle list (the plugin manager's reconcile removes a bundle whose dependency went away), so no stale entry remains. Both packages insert the row `dsh-coordinator`, so they cannot be installed together. dsh skips a profile patch row whose `name` differs from the entry's (`patch: name mismatch ... skipping`), and dsh's config editor writes rows with `name`, so a settings row saved on the Plugins page under the old package must have its `name` changed to `dsh-whalepod` (or removed); rows with only `id` keep applying.

**Trade-offs.** Two names stay visible to people who read logs or the state folder. AGENTS.md says which strings are which.

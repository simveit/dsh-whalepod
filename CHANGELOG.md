# Changelog

All notable changes to this plugin are listed here. Versions follow [Semantic Versioning](https://semver.org/). The DeepSeek Harness versions a release runs on are in `engines.dsh` in `package.json`.

## 0.2.1 - 2026-11-15

### Fixed

- A notice from an Executor Session that arrived while its coordinator was working showed up in the queue above the coordinator chat's message box, as if you had queued a message yourself, with the buttons to edit, delete and send it. The plugin no longer queues its notices in a coordinator's chat. A notice that would wake a coordinator now waits inside the plugin until the coordinator's turn has ended and then opens the next turn; several waiting notices open one turn together, in the order they arrived. A message you type meanwhile still runs first and keeps your authority. The fault was present since 0.1.0.
- After a turn you stopped, or one that failed, the waiting notices stay in the plugin and start nothing. A notice made just before that moment that had not gone out yet waits with them, so a result reported a moment before you press Stop does not start the coordinator again a moment after. Your next request runs without them and keeps your authority. They open a turn of their own once a turn of the chat has ended normally, or they go out together with the next notice that wakes the coordinator. Two exceptions: when the chat is archived and reopened, and when the plugin is reloaded or the app is restarted, these notices are added to the chat as background, and the first request you type there then counts as one that follows a notice. A reload or restart while the coordinator's chat is not loaded in DeepSeek Harness drops them, with a line in the log. Until then the coordinator has not read them; the Coordinator page and the pane show each Executor Session's state as before. While a message or steering of yours is still parked in the chat after a Stop, the plugin starts no turn there and no look-in is collected.
- Messages the plugin sends into an idle Executor Session (coordinator messages, messages between Executor Sessions, the note after Resume) now start its turn directly instead of going through that session's queue, and the tool results of `executor_message` and `executor_send` say "started" for it. Two known limits remain there. A message that reaches an Executor Session in the moment its turn is being stopped shows in that session's queue until the stop has settled, as before. A message to an idle Executor Session in which you have parked a message of your own starts a turn that takes your first parked message with it.
- Notices kept for a coordinator whose chat is archived are bounded at 200 instead of 50, the same bound as for waiting notices, so none is cut when waiting notices join them. When the bound is passed, the log says how many were dropped. A delivery that fails puts its notices back and is tried again.
- What was checked: the dsh 0.2.2-rc.3 sources, and a run in `dsh web` rc.3 with a scripted model (a result for an idle and for a busy coordinator, two results at once, a message typed meanwhile, messages to idle Executor Sessions). In the desktop app (dsh-desktop 0.2.2-rc.3) with a real model: a Report that arrived while the coordinator was working put nothing in the queue and opened a turn when the running one ended, and a message typed while it was working was the only entry in the queue and ran next. The behaviour after Stop, the parked-input rule, the retry and the bound are covered by the test suite on a fake host only. Not run: the two limits above, a restart while notices wait, and the folder card after a notice turn.

## 0.2.0 - 2026-11-15

### Added

- Each coordinator has a memory: one short page of notes that it shares with its Executor Sessions, with what a fresh coordinator or a new Executor Session would otherwise have to ask you again, such as your standing preferences and rules, decisions, how you like a kind of work done, split and reported, and lasting facts about your projects. The coordinator and the Leads of its Executor Sessions read it with `memory_read` and rewrite it with `memory_update`, by themselves and in the turn they learn something; the coordinator also saves or drops something when you tell it to remember or forget it. The page survives compaction and restarts. The coordinator has it in its context; an Executor Session starts without it, gets the parts that matter in its Assignment and can read the whole page; Teammates have no access. Every write replaces the whole page and names the revision it is based on: when the page changed meanwhile, nothing is saved and the writer merges and sends again. You can read and edit the memory in the Memory row on the Coordinator page, which also shows who changed it last (you, the coordinator or an Executor Session) and which Executor Sessions changed it since you last saved it there (for your information; "Mark as reviewed" or a Save of your own edit clears that list). The row follows the memory on its own: a change by the coordinator or an Executor Session simply shows, with nothing for you to apply or save. It keeps your draft when the memory changes while you have unsaved edits, and has a "Use memory" switch per coordinator: off, the coordinator and its Executor Sessions get no notes and cannot change them, and the text is kept. The page is meant to stay short; 6000 characters are a safety bound. The coordinator also holds its Executor Sessions to the memory: when a Report or a notice shows one working against a rule or preference in it, the coordinator reminds it how you want it done, stops it when needed, and tells you. The memory never counts as your instruction: it cannot allow a folder or answer an approval, and no host check accepts it in place of your own words. What you type in an Executor Session wins there over the memory and the Executor prompt; what you say in the coordinator's chat wins over the memory. When an Executor Session changes the memory while the coordinator works on your request, or the coordinator reads a memory that Executor Sessions changed since you last saved it, the Assignments written in the rest of that turn are recorded as the coordinator's notice and not as your instruction. It is written by models, Executor Sessions included, and can still shape the Assignments the coordinator writes for you, so review it on the Coordinator page from time to time, or switch it off for unattended work on untrusted content (see `docs/security.md`, T3 and T11a). Each writer can change a memory at most 10 times within 10 minutes, and all Executor Sessions of a coordinator together at most 30 times. Text in the memory that looks like one of the plugin's or dsh's block tags is replaced with `[removed tag]`. The memory is stored in the plugin's state file, whose format is unchanged, so 0.1.1 still reads the file and its first save drops the memory without a notice. Keep a copy of `state.json` before you go back to 0.1.1 (README, Upgrading from an earlier release).
- Look-ins: while an Executor Session works, its coordinator can now look in on it at times it picks itself with its new `executor_check_later` tool, when the memory has rules for that work. A look-in shows short previews of what the Executor Session wrote (its latest message, its last Reports and its todo list); when the work goes against a rule, the coordinator reminds it how you want it done and tells you in one line, and otherwise ends quietly and looks again later, further apart each time. Executor Sessions now keep a todo list and send a short progress Report when they make a decision that shapes the work; neither wakes the coordinator. Two new settings in "Notices to coordinators": the shortest gap of a look-in (`checkLaterMinMinutes`, 5 minutes, at most 240) and the look-ins one executor may get until you write again, in the coordinator's chat or in the executor (`checkLaterMaxPerExecutor`, 6). Look-ins do not count toward the wake limit. A pending look-in is not kept across a plugin reload or an app restart. At most 20 progress Reports per executor within 10 minutes reach the coordinator as notices; further ones are recorded and shown at the next look-in.
- What was checked: the test suite on a fake host. In `dsh web` 0.2.2-rc.3 with a scripted model: a memory change by the coordinator and one by an Executor Session showed in the Memory row without Save, and "Mark as reviewed" cleared the list. In the desktop app (dsh-desktop 0.2.2-rc.3) with a real model: a coordinator wrote its memory, and the row showed the new text and "Last changed by the coordinator" without Save. Look-ins are covered by the test suite only; also not run with a real model: a memory change by an Executor Session, your own edit and Save in the row, and the "Use memory" switch.

## 0.1.1 - 2026-11-13

### Fixed

- Uninstall on the plugin's page under Plugins failed with "Other configuration still uses this bundle's components; switch them off first." whenever Auto authorization review was also switched on, and the failed attempt left Whalepod switched off. The same blocked an update in the app. The plugin no longer switches on the component of dsh's Auto authorization review plugin by itself, so the in-app Uninstall and update work in every setup.

### Changed

- Auto review is now your own switch: turn on Auto authorization review under Plugins to use it. Without it, Executor Sessions run in Ask me (`workspace-write`), and the Coordinator page says how to switch Auto review on. Nothing runs looser than before.

### Upgrading from 0.1.0

- If Auto authorization review is on, switch it off before updating or uninstalling Whalepod 0.1.0 in the app, then switch it on again; or use `dsh plugin --profile desktop remove dsh-whalepod` with the app quit, then add 0.1.1.
- If you used Auto review without switching on Auto authorization review yourself, switch it on after the update. Until then Executor Sessions run in Ask me, and those that last ran in Auto review wait until it is back.

## 0.1.0 - 2026-11-13

First public release of Whalepod (package `dsh-whalepod`), for DeepSeek Harness 0.2.2-rc.2 and later 0.2.x releases.

### Coordinators

- A coordinator is a chat whose agent delegates work. It hands each task to its own Executor Session, follows it and reports the results.
- Up to 20 coordinators can be live at once. Each has a name from a built-in list (for example "Noether" or "李白"), its own folder next to dsh's default workspace and its own sidebar Workspace. The name and the folder for new work can be changed on the Coordinator page.
- A new session started in a coordinator's sidebar group becomes another coordinator with the first message the user types in it.
- Each coordinator has an Executor prompt: standing instructions that every Executor Session it starts receives. Only the user can change it.
- Coordinators have the `executor_*` tools plus tools to read and search files, ask the user and keep a todo list. They have no shell, write, web or browser tools, and the host refuses calls outside that list. `coordinatorExtraTools` can add tools of other plugins that do not execute, write or spawn work.
- Archive coordinator archives the chat and its finished Executor Sessions without deleting files, and can also remove the coordinator's sidebar group. Reopen brings an archived coordinator back with a new chat. Delete coordinator removes an archived coordinator's entry from the page; its sessions, folders and files stay.
- When a coordinator chat is deleted from the sidebar, the coordinator keeps its Executor Sessions and the page shows the chat's state. Reopen chat or Start chat creates a new chat that receives what waited.

### Executor Sessions

- Each Executor Session is an ordinary dsh session with its own Lead and folder, on the user's Standard preset, with Agent Teams enabled. The executor shows as running while any Teammate works, and the coordinator hears once when the whole team is done.
- Executor Sessions run in dsh's Auto review by default. The Coordinator page switches new ones to Ask me (`workspace-write`). The plugin never picks a looser preset.
- Executor Sessions of the same coordinator can message each other (`executor_peers`, `executor_send`). Executor Sessions of different coordinators cannot.
- Each Executor Session gets its own sidebar group at its folder, titled "<coordinator name> · <folder name>" and placed after its coordinator's group. An executor in a folder that is already one of the user's Workspaces joins that Workspace.
- An Executor Session starts with the working title its coordinator gave it. With dsh's session-titles generator enabled, dsh retitles it from its Assignment and later from what the user types; a generated title that looks like a coordinator's is not taken over.
- Leads send Reports with `coordinator_report`. Notices reach the coordinator in batches, as fenced data, and a result reaches the coordinator once.
- Up to 128 Executor Sessions run at once across all coordinators (`maxRunningThreads`); further starts queue.
- Loop brakes pause an executor until the user resumes it: one that wakes its coordinator too often (60 times in 10 minutes by default), and executors that message each other past the pair limit (40) or the sender limit (200) in 10 minutes. A daily turn budget (`threadTurnBudget`) is off by default; set one for unattended use.

### Pages and settings

- The Coordinator page lists the coordinators and, for the selected one, its folder, its Executor prompt and its Executor Sessions grouped as Needs you, Running, Standing by and Finished. Archived Executor Sessions are listed read-only in a collapsed Archived group.
- The Executor Sessions pane in the right sidebar lists a coordinator's executors next to its chat, and the sibling executors next to an executor.
- Approvals, questions and folder confirmations of executors appear on their rows and in the coordinator chat.
- Plugins > Whalepod shows a short introduction and a settings form for the running cap, the daily turn budget, the loop brakes, notice timing and the defaults for new coordinators. Changes apply without restarting the plugin and are saved in the profile's patch. A value a setting refuses reads as its default and never stops the plugin from loading.
- The interface is available in English and Chinese. The README is available in English, Chinese and German.

### Security

- Folders outside a coordinator's own folder, and existing folders below it, need the path typed by the user in that coordinator's chat and then the user's confirmation. The home folder, dot folders, system folders and the dsh home are always refused.
- Executor Sessions, their Teammates and the coordinators cannot read or write the dsh home (credentials, session logs, plugin state). The host enforces this.
- An Assignment counts as the user's instruction only when the user asked for the work.
- The state file is checked against the Session logs it names before it is used, and fails closed.
- [docs/security.md](https://github.com/simveit/dsh-whalepod/blob/main/docs/security.md) has the threat model and the known limits.

### Upgrading from pre-release builds

- The package was called `dsh-coordinator`. Remove it and add `dsh-whalepod` (README, Upgrading from an earlier release). Coordinators, Executor Sessions, the plugin state and settings are kept, because the plugin id, the state folder and the log marks keep the old name. A settings row in the profile patch whose `name` is `dsh-coordinator` must be changed to `dsh-whalepod`, or dsh skips it.
- A version 1 state file is migrated to version 2, and a copy is kept once as `state.v1.json`. The migrated coordinator gets a name and starts new Executor Sessions in its folder next to dsh's default workspace; existing Executor Sessions keep their folders.
- Sessions on the old `thread` and `coordinator` presets are moved to Standard.
- The tools were renamed from `thread_*` to `executor_*`. The old parameter names `thread` and `brief` still work.

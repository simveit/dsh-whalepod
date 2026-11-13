# Changelog

All notable changes to this plugin are listed here. Versions follow [Semantic Versioning](https://semver.org/). The DeepSeek Harness versions a release runs on are in `engines.dsh` in `package.json`.

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

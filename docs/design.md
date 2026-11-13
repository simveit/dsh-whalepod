# Design

## Goal

Whalepod (package `dsh-whalepod`, plugin id `dsh-coordinator`) is a plugin for the DeepSeek Harness (dsh). It adds coordinators. A coordinator is the main session that delegates: the user talks to it, and its agent hands work to separate sessions, called Executor Sessions, and follows them.

The aim is to let one person run several independent pieces of work at once. Each piece of work has its own coordinator chat, and each coordinator can run several executors. The user can still look into any executor and take over when it needs them.

The plugin targets dsh 0.2.2-rc.2 and later 0.2.x releases (`engines.dsh` in `package.json` is `>=0.2.2-rc.2 <0.3.0-0`; dsh matches it with prereleases included, so the `-0` keeps 0.3.0 prereleases out).

## The user-facing model

There are four things the user sees.

**Coordinator chats.** Each coordinator is a dsh session on the stock Standard preset, narrowed by the plugin. It opens in the normal dsh chat view, so it has the usual composer, model picker and transcript. Its agent plans the work, decides what becomes an Executor Session, writes each executor's Assignment, and reports back. It does not do the work itself: it has read-only file tools and no shell, write, subagent, web or browser tools. Each coordinator has a name, such as "Noether" or "李白", and its chat and sidebar group are titled with the bare name. A coordinator lives in a folder of its own, which is also a group in dsh's left sidebar. A new session the user starts in that group becomes another coordinator in the same folder with the user's first message.

**Executor Sessions.** Each executor is an ordinary top-level dsh session with its own Lead agent and its own folder, below its coordinator's folder unless the user names another one. Executors do not share a repository unless a coordinator points two of them at the same folder. They can do any kind of task. A Lead has the same tools as a session of the shipped Standard preset, including subagents, workflows and agent teams, plus one tool to report back to its coordinator. An executor belongs to one coordinator for life.

**The Coordinator page.** A sidebar entry named "Coordinator" opens a page with the coordinators and, for the selected one, its executors (see [The Coordinator page](#the-coordinator-page)). The sidebar icon carries a count of executors that need the user, over all coordinators.

**The Executor Sessions pane.** Beside every coordinator chat and every executor, an "Executor Sessions" tab in dsh's right sidebar lists the executors of that one coordinator. A header button in those sessions toggles it.

## The Coordinator page

The page follows dsh's own pages: dsh palette, radius and motion tokens, hairline cards in the style of dsh's settings rows, and transitions that stop under reduced motion.

**Head.** The title, a one-line intro ("A coordinator is a chat that plans the work, hands each task to its own Executor Session and follows it."), and a summary as three counts with tone dots: how many executors need the user, run and have finished. Three buttons: **New coordinator** (primary), **Choose folder...** and **Type a path**. New coordinator creates a coordinator with a new name in a fresh folder next to dsh's default workspace and opens its chat. Choose folder... opens the native folder picker and creates the coordinator in the picked folder; Type a path, and Choose folder... where no picker is available, opens an inline path field with Create. When new coordinators cannot be made (a refused base folder, or 20 live coordinators), the buttons are disabled and a notice says why. The "Executor Sessions run in: Auto review | Ask me" control sits on its own row under the head.

**Type a path.** The native picker can block: in `dsh web` the dialog opens on the computer that runs dsh, which may not be the one in front of the user. So Type a path is always next to Choose folder... and next to Change. While the picker is pending, a wait line says "Choose a folder in the folder dialog..." with Type a path and Cancel; after 8 seconds it adds that the dialog may be behind this window and the path can be typed instead, and after 60 seconds the page gives up and opens the path field. The path field says "Type the full path of the folder."

**Loading.** Until the host has validated its stored state, the page shows a skeleton of the list and the detail in place of real rows, and the folder and New coordinator buttons are disabled. The side pane shows its own skeleton.

**Coordinator list and detail.** From 900px of page width the list is on the left and the selected coordinator's detail on the right; below that they stack.

- A list row shows a monogram tile, the name and one meta line: how many of its executors need the user and how many run, or "No Executor Sessions". The monogram is the name's first character (also a Chinese character) on one of four calm tones derived from the name (blue, violet, green, slate); an archived coordinator's tile is grey. "Archived" and the chat's state ("Chat archived", "Chat deleted", "No chat yet") are small tags; the meta line wraps rather than being cut, and a refused folder is a labelled warning icon instead of truncated text. The home path is in the row's tooltip.
- The detail heading shows the monogram at 40 px, the name with a pencil button, and a subtitle: the chat title when it does not contain the name ("Chat: Release 0.4"), else the home folder. The subtitle also explains a chat that is archived, deleted or not there yet. On the right, **Open chat** (or **Reopen chat** when the chat is archived or deleted, **Start chat** when there never was one, or **Reopen** for an archived coordinator) and an archive button.
- **Rename.** The pencil turns the name into a text field with the hint "Enter saves, Esc cancels." The page checks for an empty name, more than 40 characters, control characters and a name another live coordinator has; a refusal from the host shows under the field ("Couldn't rename: <reason>") and the field stays open.
- **Settings card.** A hairline card holds two rows in dsh's settings-row style. **Folder** shows the coordinator's folder with **Type a path** and **Change**, and the note "New Executor Sessions start here. This chat stays in <home>."; a warning shows when the folder is refused ("This coordinator can't start Executor Sessions"). **Executor prompt** has the help line "Every Executor Session this coordinator starts gets this text as your standing instructions. Applies to sessions started after you save.", a text field that grows from 3 to about 12 lines, a count "n / 4000" that turns red with "too long" past the limit, "Not saved" while changed, Revert and Save, and a short "Saved" with a check after a save. Cmd/Ctrl+Enter saves and Escape reverts. A newer saved text from the host replaces the field only while the user has no unsaved change.
- Below the card, a model notice when the coordinator's model is not usable, then the coordinator's executors under an "Executor Sessions n" heading, grouped like the side pane: Needs you, Running, Standing by and Finished, each with its count. Under them, a collapsed **Archived n** group lists the coordinator's archived Executor Sessions (at most 30), read-only, with the note "Archived Executor Sessions stay in the sidebar archive. Show archived conversations there to open one."
- An archived coordinator's name, folder and Executor prompt are read-only. Its subtitle says "Archived. Reopen brings it back with a new chat." and Reopen's tooltip adds that its archived Executor Sessions stay archived. A refused Reopen shows as a warning notice "Couldn't reopen <name>" with the host's reason as one sentence. An archived coordinator has a bin button, **Delete coordinator**. Its confirmation reads "Delete "<name>"? Only the coordinator entry is removed from this page. Its sessions, folders and files stay.", adds that its archived Executor Sessions leave the list too when it has any, and offers Cancel and Delete. A refusal shows as "Couldn't delete <name>".
- The selected coordinator is remembered per browser. It defaults to the coordinator "Open coordinator chat" would open.

**Executor rows.** Each row shows the executor's status, a one-line detail, its folder and when it last changed. On hover the archive button takes the place of the time, so times stay in one column. A row that needs a decision shows buttons: Reject, Allow once and Always allow for a folder confirmation (in the order, style and labels of dsh's approval card), with a line saying that Always allow applies to every coordinator, or Resume for a paused executor. The row buttons always work; the matching card in the coordinator chat appears only after the coordinator's turn has ended, never together with a question the coordinator asks. A finished row whose Teammates still work says "N teammates still work". A row's tooltip names its mode and its team.

**Archive card.** The archive button opens an inline hairline card: "Archive "<title>"?", then "Its chat and its finished Executor Sessions are archived. Nothing is deleted." When executors still work, they are listed as rows with their status glyph, title and status ("2 Executor Sessions still work. Archiving stops them:"), and the button reads **Stop and archive** instead of **Archive**. An executor still works when it runs, waits for the user or for its folder confirmation, or has finished while its Teammates still work. A checkbox, "Also remove its workspace from the sidebar", with the note "Files on disk are kept.", removes the coordinator's sidebar group too. The buttons sit on the right. When the group stays because another coordinator uses it, it has other sessions or the plugin did not create it, the page says so in one line; when removing it failed, a warning says the coordinator is archived and the group can be removed in the sidebar.

**Without coordinator.** Executors whose coordinator could not be restored are listed in their own section, which shows only when there are any. They can be opened or archived; one without a session says there is nothing to open.

**Page-level sections.** The allowed folders (with Remove) and host problems are shown once for the page, not per coordinator. The allowed-folders text says the list applies to every coordinator and that each folder asks once more after a restart.

**Empty states.** With no coordinator: an empty-state picture in the manner of dsh's own (Automation tasks), painted with dsh illustration tokens, "No coordinator yet", a short explanation, the permission note and a New coordinator button. The app shows no mascot. A coordinator with no executors: "No Executor Sessions yet" in its detail.

## The Executor Sessions pane

The pane is scoped to one coordinator.

- Beside a coordinator chat it lists that coordinator's executors.
- Beside an executor it lists the other executors of the same coordinator, with a top row that shows the coordinator's monogram and name and opens its chat. The current executor is highlighted ("You are here"). For an archived coordinator the top row carries an "Archived" tag and opens the Coordinator page with it selected.
- Under the top row, the coordinator's folder as one muted line with Change and a Type a path icon button.
- Rows are grouped as Needs you, Running, Standing by and Finished, newest first in each group, with the same action buttons as on the page.
- An Overview button opens the Coordinator page with this coordinator selected.

The pane opens by itself when a coordinator chat or an executor comes on screen with the right column collapsed, unless the user closed it before; that choice is remembered per browser until the header button opens it again. It never opens by itself below 768px, where dsh would show it fullscreen. The header button's dot counts only that coordinator's executors that need the user.

## Left sidebar

Each coordinator has a group titled with its name, holding its chats. Each Executor Session has its own group at its folder, titled "<coordinator name> · <folder name>" (for example "Orwell · write-the-parser"), placed right after its coordinator's group and the groups of that coordinator's earlier executors. The groups are collapsed until the user opens one; the Session inside keeps its own title. In dsh's "Group by workspace tree" view an executor's group nests under the coordinator's group when its folder lies below the coordinator's folder. An executor that works in a folder that already is one of the user's Workspaces joins that Workspace, which the plugin never renames or removes. Archiving removes the plugin's groups once nothing else is left in them. A New Session the user opens inside an executor's group is the user's own plain session.

**Executor titles.** A new executor starts with the coordinator's working title. With dsh's session-titles generator enabled ("Conversation-following titles"), dsh retitles it from its Assignment and, later, from what the user types in it; otherwise the working title stays. The page, the pane, notices and the coordinator's tools show the current title.

A coordinator chat's row carries a small decoration after the time: the coordinator glyph and one number, the executors that need the user (in the warning tone), else the running ones. Nothing shows when both are zero. The row's hover card adds the coordinator's name and a line such as "6 Executor Sessions · 2 need you · 1 running", or "No Executor Sessions yet", in dsh's hover card colours. Rows of other sessions are not touched.

## Decided behaviour

**Several coordinators.** Coordinators are independent. Each sees and controls only its own executors, its executors message only each other, and its notices go only to its chat. If two pieces of work must talk, they belong under one coordinator.

**Names.** Every coordinator gets a unique name, chosen at random from a built-in list of famous philosophers, scientists, mathematicians, novelists and poets, women and men, with English, German and Chinese names and a few from elsewhere. Chinese names are written in Chinese characters in every locale. When all names are used, a number is added. The user can rename a coordinator on the page; folders are never renamed. Names that differ only in case, width or invisible characters count as the same, a name of only digits is refused, and an Executor Session may not be titled like a coordinator.

**Executor prompt.** Each coordinator has standing instructions that every executor it starts receives. The user writes them on the page; the coordinator knows they exist but cannot read or change them. They apply to executors started after the save, and the Lead passes what matters to its Teammates.

**Folders.** A new coordinator gets its own folder next to dsh's default workspace (`coordinator-noether`, `coordinator-li-bai`, ...), registered as a sidebar group titled "Noether". A coordinator's chat stays in that folder for life. Its folder for new executors starts as the same folder and can be changed on the page; only executors started afterwards use the new folder.

**New Session in a coordinator's group.** A new session the user starts there becomes a coordinator with the first message the user types in it; until then it lists the coordinator tools but cannot use them. It then gets a name, which becomes its title. It shows no welcome. A session there that does not become a coordinator (one that already had turns, a fork, one past the limit of 20) is limited to reading and searching.

**Auto review by default, Ask me on request.** Executors run under dsh's `auto` permission preset by default, because approving every action by hand does not suit autonomous work. Auto review decides each tool call and escalates risky ones to the user; there is no file sandbox in this mode. The preset comes from the shipped optional bundle `@deepseek-ai/dsh-experimental-auto-review`. The Coordinator page has a visible control, "Executor Sessions run in: Auto review | Ask me", that looks and reads like dsh's own permission picker; Ask me runs new executors under `workspace-write`, sandboxed to the executor's folder with approvals to the user. Switching to Auto review asks for the same acknowledgement dsh asks for. The choice applies to every coordinator. The coordinator welcome and the empty Coordinator page say in one sentence that executors run in Auto review by default and where to change it. When Auto review is missing, executors run in Ask me and the control says why.

**Agent teams in executors.** A Lead can split its task across Teammates that work in parallel in the executor's folder, on the Lead's model and in the Lead's permission mode. Teammates report only to their Lead; they cannot ask the user, and approvals they would need are refused (dsh's rule for delegated agents). The executor shows as running while any Teammate works, the coordinator gets one notice when the whole team is done, `executor_read` lists the Teammates and what each did, and `executor_stop` stops the Teammates too. A coordinator may ask for a team in an Assignment but never talks to Teammates.

**Questions.** A Lead can ask in two ways:

- A question for the coordinator goes through `coordinator_report` with kind `question`. It wakes the coordinator. The coordinator answers with `executor_message` when it knows the answer. Otherwise it flags the executor with `executor_flag_user`, and the user handles it in the executor.
- A question for the user goes through dsh's own `ask_user_question`. It stays with the user, who answers it in the executor. The coordinator is told that the executor waits and on what.

**Approvals always go to the user.** When Auto review escalates an action, the executor waits for the user's decision on the executor's approval card. The coordinator is told which executor waits and why, and passes that on. Nothing in the plugin answers an approval, and the coordinator's prompt forbids approving, rejecting or working around one.

**Executors talking to each other.** When one task is split across executors of one coordinator, the coordinator tells each Assignment who its siblings are. A Lead can list the other executors of its coordinator and message another Lead. Such messages are information from a colleague, never the user's instruction, and the coordinator hears about each one.

**Safety.** Executor output reaches the coordinator only as fenced data. A folder outside the coordinator's folder, or a folder below it that the plugin did not make, needs the user's own words in that coordinator's chat and the user's confirmation. A folder that overlaps another executor's folder needs the user's confirmation too. An Assignment counts as the user's instruction only when the user asked for the work. See [security.md](security.md).

**Visibility.** Status changes, questions and results are pushed to the owning coordinator as notices; each result reaches it once. The full history of an executor is read on demand with `executor_read`, so the user can ask the coordinator about any of its executors at any time.

**Direct access.** The user can open any executor and talk to its Lead directly. Their messages take precedence over the Assignment. A turn the user drove in the executor is mentioned to the coordinator without waking it.

**Archiving.** Archiving a coordinator archives its chat and its finished executors and keeps it on the page, read-only, where it can be reopened or deleted. Deleting removes only the coordinator's entry; its sessions, folders and files stay. Deleting a coordinator chat from the sidebar keeps the coordinator and its executors; their notices wait until the user reopens the chat from the page.

**App quit.** Executors stop when the app quits, as every dsh session does. The coordinators and the executor table are persisted. After a restart, executors show as Standing by; an executor whose turn was cut off shows as stopped with the detail "stopped when the app quit", and its coordinator can message it to continue.

**Project memory is deferred.** A shared project memory that the coordinator enforces is wanted but not part of this version. Until then, standing rules live in the coordinator chat and reach executors through their Assignments, and the user can put rules for all of a coordinator's executors in its Executor prompt. The coordinator prompt requires every Assignment to repeat the rules that apply, because executors do not inherit the coordinator chat.

**Distribution as a single plugin.** The end result is one installable package that other people can add with dsh's plugin manager.

The package ships built code and brings in dsh's shipped auto-review bundle through its own bundle layer; the README has the install steps.

## Out of scope

These are deliberately not part of this version:

- Project memory and rules enforced from it (see above).
- Any automatic answer to an approval, and any automatic answer to a question the Lead addressed to the user.
- Reading another executor's history from an executor. Executors of one coordinator can message each other (`executor_send`), but only the coordinator reads executor histories.
- Messages or any other link between coordinators, and moving an executor to another coordinator.
- A welcome for coordinators made with New Session in a coordinator's group.
- Intake from outside the chat, such as GitHub issues, chat channels or schedules. The superagent prototype has these; see [superagent-prototype.md](superagent-prototype.md).
- Keeping executors running after the app quits.
- A custom chat view for the coordinator. It is a normal dsh session.
- A push channel from host to client. The page polls.

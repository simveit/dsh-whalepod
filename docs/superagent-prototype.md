# Relation to the dsh-superagent prototype

## What the prototype is

[deepseek-ai/dsh-superagent-prototype](https://github.com/deepseek-ai/dsh-superagent-prototype), read at commit `8c32a9d`, is a research prototype published by the DeepSeek Harness Team under the MIT License. Its README marks it as reference code, not an official product.

It is a proactive coding agent for one GitHub repository, packaged as a dsh bundle. It listens to GitHub and, optionally, Feishu. When an allowed person asks for work, it evaluates the request under a policy, opens a ticket, runs the ticket in its own worker session and directory, and answers in the original conversation, for example with a pull request. A web panel shows what needs a person. Its stated principle is to take as little human attention as possible.

Whalepod (`dsh-whalepod`, formerly `dsh-coordinator`) borrows parts of its machinery for a different purpose: user-facing coordinator chats that start free-form Executor Sessions.

## What was reused

Only reuse visible in the code is listed. Files that carry an attribution header are marked "(attributed)".

| Prototype | Here | What changed |
|---|---|---|
| `Sessions.ensure` in `src/app/sessions.ts`: resolve or create a session in a new Workspace with a bundle preset, set the permission preset, rename | `ThreadService.startThread`, `launch` and `createCoordinator` in `src/host/threads.ts` (attributed) | Permission preset `auto` instead of `danger-full-access`. Agent Teams enabled. dsh assigns the session id. No role model, decorate step or skill binding. The model is picked from the owning coordinator's model. A coordinator chat is created in its home Workspace; an Executor Session is created in its own plugin-made Workspace at its folder (or in the user's Workspace when its folder already is one), so its folder stays its `cwd`. |
| `AgentDelivery` in `src/app/delivery.ts`: deliver at most once per request id, check history and pending inbox, plugin source kind, steer or followup | `ThreadService.deliver` in `src/host/threads.ts` (attributed) | Source kind `dsh-coordinator`. The seen set comes from live `user/message` events only; the persisted log is not re-read. `Object.freeze` instead of `freezeMessage`, since no dsh package is imported at runtime. No inject mode for Executor Sessions. A second path records the Assignment as a user prompt through `sessionController.prompt`. |
| `orchestrator_report` in `src/app/tools/executor.ts` and `reportRelay` in `src/app/notices.ts` | `coordinator_report` in `src/host/tools.ts`, `ThreadService.report`, and `NoticeBatcher` in `src/host/notices.ts` (attributed in `threads.ts`) | Kinds `progress`, `question`, `result`, `blocked`. No pull request fields, no GitHub reads. No atomic SQLite transaction or durable relay queue. Notices are batched with a debounce, and a report sent mid-turn is held until the turn ends. Progress is injected without waking the coordinator. |
| `DshExecutor.resume` in `src/executor/dsh.ts`: reconcile a durable table with sessions after a restart | `ThreadService.restore` and `restoredFacts` in `src/host/status.ts` (attributed in `threads.ts`) | No re-queuing of pending launches. An Executor Session that was queued or running comes back as stopped and starts again when messaged. Nothing to cancel, because dsh ends open turns on quit. |
| `WorkerSlots` in `src/executor/dsh.ts` | `Slots` in `src/host/slots.ts` (attributed) | An in-memory FIFO queue replaces the `Later` exception and the effect queue's retries. Executor Sessions waiting on the user hold no slot. No extra slot for a person; a user typing into an Executor Session is not queued at all. The cap is shared by all coordinators. |
| `registerTool` in `src/app/sessions.ts` | `tool()` in `src/host/tools.ts` (attributed) | Hand-written JSON schemas instead of zod. Results round-trip through JSON; failures return `{ error }`. Registered globally with a `when` filter instead of per agent. |
| `openKnownSession` in `src/navigation.ts` | `openSession` in `src/client/index.tsx` (attributed) | No abort signal, no localized errors, plain `Error` messages. |
| Panel styles in `src/client/client.css` | `src/client/styles.ts` (attributed) | Reduced to this panel's needs and inlined as a string, on dsh's `--dsw-alias-*` tokens. |
| Client bundle wrapper in `tsdown.config.ts` | `tsdown.config.ts` | Same module-loader banner, intro and footer, with id `dsh-whalepod` (the package name). The comment here describes it as dsh's own convention. |
| Agent presets as `@deepseek-ai/dsh-agent-preset` rows in `cordis.patch.yml` | none now | Earlier releases declared `thread` and `coordinator` presets this way. They are gone (decision 31): everything runs on `standard`, and Sessions on the old presets are moved once. |

The original plan also listed the prototype's `ticketStage` (in `src/core/stage.ts`) as a pattern for executor status. `src/host/status.ts` is written independently and carries no attribution, so it is not counted as reuse.

## What was left out, and why

**Sources, Triggers, Evals, Mandates and Policies.** They exist for a team working through GitHub and Feishu: intake, admission, evaluation of who may ask for what, and per-ticket instructions. Here the user asks in the coordinator chat, and coordinator tools call a small service (`ThreadService`) directly.

**`src/infra/environment.ts` and the setup that drives it.** It changes PATH and git settings for the whole process. In the desktop app that would leak into every session of the single profile.

**The HTTP panel API** (`src/app/http.ts`, `src/app/api.ts`, `src/client/api.ts`). The desktop app may refuse plugin HTTP routes, and the prototype's handler requires a loopback web server. Typert Remote calls replace it.

**The router prompt and the `noWait` guard.** They are written for a route-only main session that must not sleep or wait. The coordinator is a conversational agent; its prompt instead tells it not to poll Executor Sessions after starting them.

**The SQLite store, effect queue and HealthBoard.** `src/app/effects.ts` depends on the store's database and writes health entries through `src/infra/health.ts`, which reaches into the Sources layer. The coordinator's state is small enough for one JSON file, and its queue is in memory.

**Per-agent tool sets.** The prototype narrows each worker's tools to `WORK_TOOLS`. Here Leads keep the full Standard set minus the plugin manager tools, and the plugin's own tools are admitted with a `when` filter on the coordinator records and the executor table. Coordinators are narrowed with `restrict({ allow })`, like the prototype's router (decision 32).

## Where the models differ

| | Prototype | Whalepod |
|---|---|---|
| Who starts work | Requests from GitHub or Feishu, filtered by a policy | The user, in one of several coordinator chats |
| Main session | A router that only routes; restricted tools and a no-wait guard | Coordinators that plan with the user, write Assignments and report back; each sees only its own Executor Sessions |
| Units of work | Tickets, usually ending in a pull request | Free-form Executor Sessions with any goal and any folder |
| Worker session | Worker preset, tools restricted to `WORK_TOOLS` | A Lead with the full Standard tool set |
| Permissions | `danger-full-access` | `auto`, with escalations going to the user |
| Agent Teams | Not available to workers: `WORK_TOOLS` has no team tools | Enabled in every Executor Session |
| Reporting | `orchestrator_report` relayed durably to the router and on to GitHub | `coordinator_report` and status notices to the coordinator |
| Panel | Web panel over HTTP | Coordinator page and Executor Sessions pane over Typert Remote |
| Attention model | Speak only when a person must act | The user follows Executor Sessions through their coordinator and can open any of them |

## Terms adopted from the draft

In its second design round, which brought several coordinators, the plugin took its user-facing words from the Super Agent domain draft (`docs/001-domain.md` in a newer checkout of the prototype than commit `8c32a9d`) and from dsh (decision 48). The draft's Executor Session (执行器 Session) is what the plugin called a thread, its Assignment (派工) is the plugin's brief, and its Report (报告) keeps that name. The draft's Main Session is the plugin's coordinator; "Coordinator" stayed as the feature name. Lead and Teammate (队友) come from dsh's agent teams. The plugin's tools moved from `thread_*` to `executor_*`, a naming pattern like the draft's `orchestrator_*` tools; `coordinator_report` kept its name. The plugin did not adopt Tickets or the draft's "Thread", which means a Source group of Triggers there and so collided with the plugin's old word.

## Version differences

The prototype pins dsh `^0.2.1-alpha.2` in `engines`, and its lock file resolves every dsh package to exactly `0.2.1-alpha.2` with cordis `4.0.5-alpha.1`. Its install recipe uses the CLI `0.2.1-rc.3`.

Whalepod targets `>=0.2.2-rc.2 <0.3.0-0` with cordis `^4.1.0`. Some APIs behave differently from what the prototype assumes; see [dsh-api-notes.md](dsh-api-notes.md). For example, `sessionController.create` now creates the Agent, so `ctx.agents.create` is not needed, and team tools come from `ctx.agentTeams.setEnabled`.

## Licence and attribution

The prototype is MIT licensed, Copyright (c) 2026 DeepSeek Harness Team. The plugin's `LICENSE` carries both copyright lines and states that portions are derived from the prototype.

Derived files name their source in a header comment: `src/host/threads.ts`, `src/host/tools.ts`, `src/host/slots.ts`, `src/client/index.tsx` (in the `openSession` comment) and `src/client/styles.ts`. Keep these headers when editing those files, and add one to any new file that copies prototype code.

/**
 * What the coordinator may call. Pure.
 *
 * The coordinator runs on a stock preset (`standard`), so every tool a Standard session has, and every global tool of
 * other plugins and MCP servers, would reach it. Its role is to plan and delegate: it gets the thread tools, read-only
 * inspection to plan with, the user-question tool and its todo list, and nothing that executes, writes, opens
 * terminals, changes the working directory or creates worktrees. Third-party and MCP tools are denied unless the user
 * lists them in `coordinatorExtraTools`. The list is applied with `agent.ctx.tools.restrict({ allow })`, which accepts
 * only names that are currently registered, so it is computed against the registry and re-applied when tools change.
 */

import { allSpellings, TOOL } from './names.ts'

/** The plugin's own coordinator tools. */
export const COORDINATOR_OWN = [
  TOOL.start, TOOL.message, TOOL.list, TOOL.read, TOOL.flagUser, TOOL.stop, TOOL.archive, TOOL.memory, TOOL.memoryRead, TOOL.checkLater,
] as const

/**
 * Stock tools the coordinator keeps: read and search local files, load a skill, ask the user, its todos. No network
 * tool. `skill` returns a skill's text and runs nothing; dsh lists the skills only to an agent that has the tool, so
 * without it a coordinator could not name a skill in an Assignment (decision 70). `session_search` is not one of
 * them (S1): it searches every Session log, other coordinators' chats and Executor Session output included, and its
 * results carry no data fence. That keeps the tool away, not the logs: they are files in the dsh home, which a
 * coordinator can read like any Session (security.md, Known limits).
 */
export const COORDINATOR_STOCK = ['read', 'read_image', 'glob', 'grep', 'skill', 'ask_user_question', 'todo_write'] as const

/**
 * Names that never go on the list, even through `coordinatorExtraTools`. The rule: a coordinator gets no tool that
 * writes files, executes code, spawns or steers other agents, drives a terminal, a browser or office documents,
 * reaches the network, reads Session logs or traces, manages plugins, or changes where its chat works. The set holds
 * dsh's own tools of these kinds, by the tool catalog of dsh 0.2.2-rc.3 (`docs/tool-catalog.md` in the dsh package),
 * and common names of such tools elsewhere. `tests/fixpass.test.ts` sorts every name of that catalog into "never",
 * "stock" or "the user may add it", so a dsh tool that is new there has to be placed on purpose.
 */
export const COORDINATOR_NEVER = new Set([
  // Shells and code: `run_code` runs a program (and is the one tool a model has under dsh's PTC executor), and
  // `load_workspace_dependencies` only serves to run one.
  'bash', 'pwsh', 'run_code', 'load_workspace_dependencies',
  // File writes.
  'write', 'edit', 'apply_patch', 'multi_edit', 'notebook_edit', 'str_replace_editor',
  // Other agents and scheduled or background work.
  'subagent', 'subagent_fork', 'subagent_oar', 'workflow', 'ralph',
  'send_message', 'wait_agent', 'interrupt_agent', 'list_agents', 'team_task_create', 'team_task_update', 'job_kill',
  'job_output', 'job_list', 'schedule_create', 'schedule_edit', 'schedule_delete', 'working_directory', 'create_worktree',
  'terminal_open', 'terminal_send', 'plugin_manager', 'plugin_market',
  // Session logs and traces: these tools read every Session, other coordinators' chats and Executor Session output
  // included, and their results carry no data fence.
  'session_search', 'session_trace', 'session_event_read', 'session_event_search', 'session_event_trace',
  // Network tools: a coordinator delegates and inspects locally; its context holds Executor Session output, so a
  // fetch could carry data out (rereview N5).
  'web_fetch', 'web_search', 'http_request', 'fetch', 'browser', 'browser_navigate',
  // Thread lead tools, under their current and their earlier names.
  ...allSpellings(['report', 'peers', 'send']),
])

/**
 * Name prefixes that are never on the list either: families of tools that drive terminals, office documents or
 * browsers (`stagehand_` is dsh's own browser tools), reach the web, or read Session logs.
 */
export const COORDINATOR_NEVER_PREFIXES = ['office_', 'user_terminal_', 'terminal_', 'browser_', 'stagehand_', 'web_', 'session_'] as const

/** Whether a tool name may never reach a coordinator chat. */
export function neverForCoordinator(name: string): boolean {
  return COORDINATOR_NEVER.has(name) || COORDINATOR_NEVER_PREFIXES.some(prefix => name.startsWith(prefix))
}

/**
 * Every name a coordinator chat may call: its own tools, the stock tools, and the extra names the user configured that
 * are not refused. The guard enforces this set on every call (I5), so a failed `restrict` does not fail open.
 * @param own - whether the plugin's own coordinator tools are included: for stored coordinators and candidates (a
 * candidate lists them, but the host refuses its calls until the user's first typed message promotes it); a fenced
 * Session gets none.
 */
export function coordinatorWanted(extra: readonly string[], own = true): Set<string> {
  return new Set<string>([...(own ? COORDINATOR_OWN : []), ...COORDINATOR_STOCK, ...extra.filter(name => !neverForCoordinator(name))])
}

/**
 * The allow list for the coordinator: the wanted names that are registered now.
 * @param registered - global tool names the coordinator's scope can see (before this restriction).
 * @param extra - names from `coordinatorExtraTools`.
 * @param own - include the plugin's own coordinator tools.
 */
export function coordinatorAllow(registered: Iterable<string>, extra: readonly string[], own = true): string[] {
  const wanted = coordinatorWanted(extra, own)
  return [...new Set(registered)].filter(name => wanted.has(name)).sort()
}

/** The names `tools.restrict()` reports as known when it refuses an unknown one (its error text), or undefined. */
export function knownFromRestrictError(message: string): string[] | undefined {
  const match = /known global tools: (.*)$/s.exec(message)
  if (match === null) return undefined
  const list = match[1]!.trim()
  return list === '(none)' ? [] : list.split(',').map(name => name.trim()).filter(name => name !== '')
}

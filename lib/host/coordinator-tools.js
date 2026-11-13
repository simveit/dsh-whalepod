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
import { allSpellings, TOOL } from "./names.js";
/** The plugin's own coordinator tools. */
export const COORDINATOR_OWN = [TOOL.start, TOOL.message, TOOL.list, TOOL.read, TOOL.flagUser, TOOL.stop, TOOL.archive];
/**
 * Stock tools the coordinator keeps: read and search local files, ask the user, its todos. No network tool. `session_search` is not
 * one of them (S1): it reads every Session log, other coordinators' chats and Executor Session output included, and
 * its results carry no data fence.
 */
export const COORDINATOR_STOCK = ['read', 'read_image', 'glob', 'grep', 'ask_user_question', 'todo_write'];
/**
 * Names that never go on the list, even through `coordinatorExtraTools`: they execute, write, spawn work, read other
 * Sessions, manage plugins or skills, or drive terminals and office documents.
 */
export const COORDINATOR_NEVER = new Set([
    'bash', 'pwsh', 'write', 'edit', 'apply_patch', 'multi_edit', 'notebook_edit', 'subagent', 'subagent_fork', 'workflow',
    'send_message', 'wait_agent', 'interrupt_agent', 'list_agents', 'team_task_create', 'team_task_update', 'job_kill',
    'job_output', 'job_list', 'schedule_create', 'schedule_edit', 'schedule_delete', 'working_directory', 'create_worktree',
    'terminal_open', 'terminal_send', 'session_search', 'plugin_manager', 'plugin_market', 'skill',
    // Network tools: a coordinator delegates and inspects locally; its context holds Executor Session output, so a
    // fetch could carry data out (rereview N5).
    'web_fetch', 'web_search', 'http_request', 'fetch', 'browser', 'browser_navigate',
    // Thread lead tools, under their current and their earlier names.
    ...allSpellings(['report', 'peers', 'send']),
]);
/** Name prefixes that are never on the list either: families of tools that drive terminals, office documents or browsers. */
export const COORDINATOR_NEVER_PREFIXES = ['office_', 'user_terminal_', 'terminal_', 'browser_', 'web_'];
/** Whether a tool name may never reach a coordinator chat. */
export function neverForCoordinator(name) {
    return COORDINATOR_NEVER.has(name) || COORDINATOR_NEVER_PREFIXES.some(prefix => name.startsWith(prefix));
}
/**
 * Every name a coordinator chat may call: its own tools, the stock tools, and the extra names the user configured that
 * are not refused. The guard enforces this set on every call (I5), so a failed `restrict` does not fail open.
 * @param own - whether the plugin's own coordinator tools are included: for stored coordinators and candidates (a
 * candidate lists them, but the host refuses its calls until the user's first typed message promotes it); a fenced
 * Session gets none.
 */
export function coordinatorWanted(extra, own = true) {
    return new Set([...(own ? COORDINATOR_OWN : []), ...COORDINATOR_STOCK, ...extra.filter(name => !neverForCoordinator(name))]);
}
/**
 * The allow list for the coordinator: the wanted names that are registered now.
 * @param registered - global tool names the coordinator's scope can see (before this restriction).
 * @param extra - names from `coordinatorExtraTools`.
 * @param own - include the plugin's own coordinator tools.
 */
export function coordinatorAllow(registered, extra, own = true) {
    const wanted = coordinatorWanted(extra, own);
    return [...new Set(registered)].filter(name => wanted.has(name)).sort();
}
/** The names `tools.restrict()` reports as known when it refuses an unknown one (its error text), or undefined. */
export function knownFromRestrictError(message) {
    const match = /known global tools: (.*)$/s.exec(message);
    if (match === null)
        return undefined;
    const list = match[1].trim();
    return list === '(none)' ? [] : list.split(',').map(name => name.trim()).filter(name => name !== '');
}

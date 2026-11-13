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
/** The plugin's own coordinator tools. */
export declare const COORDINATOR_OWN: readonly ["executor_start", "executor_message", "executor_list", "executor_read", "executor_flag_user", "executor_stop", "executor_archive"];
/**
 * Stock tools the coordinator keeps: read and search local files, ask the user, its todos. No network tool. `session_search` is not
 * one of them (S1): it reads every Session log, other coordinators' chats and Executor Session output included, and
 * its results carry no data fence.
 */
export declare const COORDINATOR_STOCK: readonly ["read", "read_image", "glob", "grep", "ask_user_question", "todo_write"];
/**
 * Names that never go on the list, even through `coordinatorExtraTools`: they execute, write, spawn work, read other
 * Sessions, manage plugins or skills, or drive terminals and office documents.
 */
export declare const COORDINATOR_NEVER: Set<string>;
/** Name prefixes that are never on the list either: families of tools that drive terminals, office documents or browsers. */
export declare const COORDINATOR_NEVER_PREFIXES: readonly ["office_", "user_terminal_", "terminal_", "browser_", "web_"];
/** Whether a tool name may never reach a coordinator chat. */
export declare function neverForCoordinator(name: string): boolean;
/**
 * Every name a coordinator chat may call: its own tools, the stock tools, and the extra names the user configured that
 * are not refused. The guard enforces this set on every call (I5), so a failed `restrict` does not fail open.
 * @param own - whether the plugin's own coordinator tools are included: for stored coordinators and candidates (a
 * candidate lists them, but the host refuses its calls until the user's first typed message promotes it); a fenced
 * Session gets none.
 */
export declare function coordinatorWanted(extra: readonly string[], own?: boolean): Set<string>;
/**
 * The allow list for the coordinator: the wanted names that are registered now.
 * @param registered - global tool names the coordinator's scope can see (before this restriction).
 * @param extra - names from `coordinatorExtraTools`.
 * @param own - include the plugin's own coordinator tools.
 */
export declare function coordinatorAllow(registered: Iterable<string>, extra: readonly string[], own?: boolean): string[];
/** The names `tools.restrict()` reports as known when it refuses an unknown one (its error text), or undefined. */
export declare function knownFromRestrictError(message: string): string[] | undefined;

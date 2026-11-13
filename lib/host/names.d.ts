/**
 * Model-facing names in one place. Pure.
 *
 * The tools the models call and the role nouns the prompts use are defined here, so a rename is one file plus the
 * prompt wording. Prompts refer to them as `{{tool.<key>}}` and `{{role.<key>}}`; `fillStatic` fills those once when
 * the prompts are loaded. The per-request values (a thread's id and title, its coordinator's title, the coordinator's
 * folder) stay as placeholders and are filled with `renderThreadPrompt` and `renderCoordinatorPrompt`.
 *
 * Persisted marks (`dsh-coordinator:brief:` and the others), id prefixes and internal identifiers are not renamed.
 * The tool names of earlier releases stay recognisable through `LEGACY_TOOL` and `toolKey`, because existing Session
 * logs carry them.
 */
/** Current model-facing tool names. */
export declare const TOOL: {
    readonly start: "executor_start";
    readonly message: "executor_message";
    readonly list: "executor_list";
    readonly read: "executor_read";
    readonly flagUser: "executor_flag_user";
    readonly stop: "executor_stop";
    readonly archive: "executor_archive";
    readonly peers: "executor_peers";
    readonly send: "executor_send";
    readonly report: "coordinator_report";
};
export type ToolKey = keyof typeof TOOL;
/** Tool names of releases before the rename; they still appear in existing Session logs. */
export declare const LEGACY_TOOL: {
    readonly [K in ToolKey]: string;
};
/** The key of a plugin tool by its current or its legacy name, or undefined for any other name. */
export declare function toolKey(name: string): ToolKey | undefined;
/** Whether `name` is the tool `key` under its current or its legacy name. */
export declare function isToolName(name: string, key: ToolKey): boolean;
/** Both spellings of the given tools, for sets that read logs written before the rename. */
export declare function allSpellings(keys: readonly ToolKey[]): string[];
/** Role nouns used in the prompts. */
export declare const ROLE: {
    readonly coordinator: "coordinator";
    readonly Coordinator: "Coordinator";
    readonly executor: "executor";
    readonly executorSession: "Executor Session";
    readonly executorSessions: "Executor Sessions";
    readonly assignment: "Assignment";
    readonly report: "Report";
    readonly lead: "Lead";
    readonly teammate: "Teammate";
    readonly teammates: "Teammates";
};
export type RoleKey = keyof typeof ROLE;
/**
 * Fill `{{tool.<key>}}` and `{{role.<key>}}` in a prompt template.
 * @throws when a `{{tool.x}}` or `{{role.x}}` names an unknown key.
 */
export declare function fillStatic(template: string): string;
/**
 * The coordinator prompt for one coordinator.
 * @param values.folder - the coordinator's current folder (real path), where new delegated sessions start.
 */
export declare function renderCoordinatorPrompt(template: string, values: {
    folder: string;
}): string;
/**
 * The Lead prompt for one Executor Session. Titles come from text a model or the user wrote: pass them through
 * `inlineUntrusted` first.
 */
export declare function renderThreadPrompt(template: string, values: {
    threadId: string;
    threadTitle: string;
    coordinatorTitle: string;
}): string;
/** What a coordinator chat gets when its prompt cannot be rendered: never nothing (S11). */
export declare const COORDINATOR_FALLBACK_PROMPT: string;
/** What a Lead gets when its prompt cannot be rendered: never nothing (S11). */
export declare const LEAD_FALLBACK_PROMPT: string;

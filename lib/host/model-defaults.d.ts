/**
 * The models the New coordinator form proposes: one model for the coordinator's chat and the same model at a higher
 * reasoning effort for its Executor Sessions. Pure: no dsh or Node imports, so it is unit tested directly.
 *
 * `NEW_COORDINATOR_MODELS` is the one place that says which model and which efforts. The model is found in dsh's own
 * lists by its id, never by its display name. A default is only a starting value of a picker: the user can change it
 * there, the host checks it like any other choice before it is stored, and a coordinator that is created without the
 * form gets no model from here.
 */
import type { ModelChoice, ModelChoices, ModelOption } from '../types.ts';
/**
 * DeepSeek V4.1 Flash: reasoning effort low for the coordinator's chat, high for its Executor Sessions.
 *
 * The model is known under two ids in dsh 0.2.2-rc.3:
 * - `modelId`, `deepseek-v4.1-flash`: the id that names this version. It counts on any provider. A provider that puts
 *   the vendor in front (`deepseek/deepseek-v4.1-flash`) matches by the last part.
 * - `alias`, `deepseek-flash`: the id on DeepSeek's own providers (`aliasProviders`: `deepseek-account` and
 *   `deepseek-official`), which this dsh names "DeepSeek-V4.1-Flash" (`DEFAULT_MODELS` in dsh-llm-deepseek). It is
 *   DeepSeek's name for its current Flash model and says nothing about the version anywhere else, so it counts only on
 *   those two providers and only as the whole id. Look at this entry again when dsh moves it to a later model.
 */
export declare const NEW_COORDINATOR_MODELS: {
    readonly modelId: "deepseek-v4.1-flash";
    readonly alias: "deepseek-flash";
    readonly aliasProviders: readonly ["deepseek-account", "deepseek-official"];
    readonly coordinatorEffort: "low";
    readonly executorEffort: "high";
};
type Groups = ModelChoices['groups'];
/**
 * The default model in dsh's lists, or undefined when no provider offers it. When several providers offer it, the
 * provider of the user's dsh default model wins (`preferredProvider`), else the first one in dsh's order.
 */
export declare function defaultModelIn(groups: Groups, preferredProvider?: string): {
    provider: string;
    model: ModelOption;
} | undefined;
/**
 * The two default choices for a new coordinator, resolved against dsh's lists. Each one is absent, and its picker
 * starts empty ("Not set", "Same as coordinator"), when the model is not offered or does not list the effort wanted
 * for that role. Both are absent when the list of the preferred provider could not be loaded (`failedProviders`):
 * the default does not move to another provider without the user choosing it.
 */
export declare function newCoordinatorModels(groups: Groups, preferredProvider?: string, failedProviders?: readonly string[]): {
    coordinatorModel?: ModelChoice;
    executorModel?: ModelChoice;
};
export {};

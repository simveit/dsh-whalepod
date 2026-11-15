/**
 * Model choice for sessions the plugin creates. Pure: no dsh or Node imports, so it is unit tested directly.
 *
 * dsh gives a new Session no model of its own: it follows the deployment default (`agentDefaultModel`) until a
 * model is selected in it. That default can name a provider the user has no credentials for (the shipped default
 * is a DeepSeek route), and a Session created by a plugin then fails on its first turn. So the plugin checks the
 * model of every Session it creates or reuses and, when that model is not available, selects the first available
 * candidate: for a thread, the coordinator's own model first; then the dsh default.
 *
 * The owner can also set a model per coordinator, for its chat and for its new Executor Sessions (`modelChoiceOf`,
 * `sameChoice`; the rules are in threads.ts and docs/architecture.md, "Model selection").
 */
import type { ModelChoice } from '../types.ts';
export type { ModelChoice };
export declare function sameModel(a: ModelChoice | undefined, b: ModelChoice | undefined): boolean;
/** Whether two choices name the same model with the same reasoning effort; two absent choices are the same. */
export declare function sameChoice(a: ModelChoice | undefined, b: ModelChoice | undefined): boolean;
/** Longest provider, model or effort id the plugin stores or passes on. */
export declare const MODEL_ID_MAX = 200;
/** A provider, model or effort id the plugin accepts: a non-empty string of at most `MODEL_ID_MAX` characters without control characters. */
export declare const isModelId: (value: unknown) => value is string;
/**
 * A model choice read from a place the plugin does not trust (a Remote request, the state file, a Session event): an
 * object with a provider id, a model id and optionally a reasoning effort id, each a non-empty string of at most
 * `MODEL_ID_MAX` characters without control characters. Anything else is undefined. Only the three fields are kept.
 * This checks the shape alone; whether dsh offers the model is asked of dsh where the choice is set and where it is used.
 */
export declare function modelChoiceOf(value: unknown): ModelChoice | undefined;
export declare function modelLabel(choice: ModelChoice | undefined): string;
export interface ModelPick {
    /** The model the Session should use, or undefined when no candidate is available. */
    readonly choice: ModelChoice | undefined;
    /** True when `choice` differs from the Session's current model and must be selected. */
    readonly select: boolean;
}
/**
 * Decide which model a Session should run on.
 * @param current - the Session's current model (its own selection, last request, or the default it follows).
 * @param candidates - preferred models in order; undefined entries are skipped.
 * @param available - whether a provider/model pair can be used right now.
 * @param preferFirst - for threads: switch to the first available candidate even when `current` works, so a thread
 *   runs on the coordinator's model rather than on a default the user never picked.
 */
export declare function pickModel(current: ModelChoice | undefined, candidates: readonly (ModelChoice | undefined)[], available: (choice: ModelChoice) => Promise<boolean | undefined>, preferFirst?: boolean): Promise<ModelPick>;

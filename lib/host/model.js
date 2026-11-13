/**
 * Model choice for sessions the plugin creates. Pure: no dsh or Node imports, so it is unit tested directly.
 *
 * dsh gives a new Session no model of its own: it follows the deployment default (`agentDefaultModel`) until a
 * model is selected in it. That default can name a provider the user has no credentials for (the shipped default
 * is a DeepSeek route), and a Session created by a plugin then fails on its first turn. So the plugin checks the
 * model of every Session it creates or reuses and, when that model is not available, selects the first available
 * candidate: for a thread, the coordinator's own model first; then the dsh default.
 */
export function sameModel(a, b) {
    return a !== undefined && b !== undefined && a.provider === b.provider && a.model === b.model;
}
export function modelLabel(choice) {
    return choice === undefined ? 'none' : `${choice.provider}/${choice.model}`;
}
/**
 * Decide which model a Session should run on.
 * @param current - the Session's current model (its own selection, last request, or the default it follows).
 * @param candidates - preferred models in order; undefined entries are skipped.
 * @param available - whether a provider/model pair can be used right now.
 * @param preferFirst - for threads: switch to the first available candidate even when `current` works, so a thread
 *   runs on the coordinator's model rather than on a default the user never picked.
 */
export async function pickModel(current, candidates, available, preferFirst = false) {
    // Unknown (the provider registry could not be asked) counts as unavailable for a candidate, but never makes the
    // Session's current model look broken.
    const check = async (choice) => {
        try {
            return await available(choice) === true;
        }
        catch {
            return false;
        }
    };
    const usable = async (choice) => {
        try {
            return await available(choice) !== false;
        }
        catch {
            return true;
        }
    };
    if (!preferFirst && current !== undefined && await usable(current))
        return { choice: current, select: false };
    const seen = [];
    for (const candidate of candidates) {
        if (candidate === undefined || seen.some(s => sameModel(s, candidate)))
            continue;
        seen.push(candidate);
        if (await check(candidate)) {
            return { choice: candidate, select: !sameModel(candidate, current) || candidate.reasoningEffort !== current?.reasoningEffort };
        }
    }
    if (preferFirst && current !== undefined && await check(current))
        return { choice: current, select: false };
    return { choice: undefined, select: false };
}

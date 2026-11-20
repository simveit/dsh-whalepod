/**
 * Whether Matriarc has a navigator: a registered subagent provider that runs another coding agent out of process.
 * Copied from dsh-matriarc (src/host/providers.ts `rank`, `isExternal`, `eligibleProviders`), so the page's notice
 * matches Matriarc's own "Enable Matriarc" row even before any Session exists; not imported, since one plugin does not
 * depend on another. Matriarc lists the same providers in its `/matriarc` command hint.
 */
/** One that runs a DSH child (marked `harness`, or shaped like DSH's SDK provider) is never a navigator. */
function eligible(provider) {
    if (provider.childAgent === 'harness' || provider.capabilities?.agentOptions === true || provider.agentRouteDefaults !== undefined)
        return false;
    return typeof provider.start === 'function' && provider.prepareContinuable === undefined && provider.inheritsParentContext === false;
}
/**
 * Whether any registered provider is a navigator. Reads a public list when dsh has one, else the registry's internal
 * map (`dsh-subagent/src/index.ts:200`, read only if it is a Map), else the providers announced since load.
 * @param subagents - `ctx.get('subagents')`, or undefined when it is not loaded.
 * @param announced - providers seen through `subagent/provider-added` and not removed since.
 */
export function hasNavigator(subagents, announced = new Map()) {
    if (subagents === undefined || subagents === null)
        return false;
    const runtime = subagents;
    const get = (name) => (typeof runtime.getProvider === 'function' ? runtime.getProvider(name) : undefined);
    let providers;
    const list = typeof runtime.listProviders === 'function' ? runtime.listProviders()
        : typeof runtime.providerNames === 'function' ? runtime.providerNames() : undefined;
    if (Array.isArray(list))
        providers = list.flatMap((entry) => { const p = typeof entry === 'string' ? get(entry) : entry; return p === undefined ? [] : [p]; });
    else if (runtime.providers instanceof Map)
        providers = runtime.providers.values();
    else
        providers = announced.values();
    for (const provider of providers)
        if (eligible(provider) && get(provider.name) !== undefined)
            return true;
    return false;
}

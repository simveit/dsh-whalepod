/**
 * Whether Matriarc has a navigator: a registered subagent provider that runs another coding agent out of process.
 * Copied from dsh-matriarc (src/host/providers.ts `rank`, `isExternal`, `eligibleProviders`), so the page's notice
 * matches Matriarc's own "Enable Matriarc" row even before any Session exists; not imported, since one plugin does not
 * depend on another. Matriarc lists the same providers in its `/matriarc` command hint.
 */
/** The fields of a dsh-subagent provider the check reads (dsh-subagent `SubagentProvider`). */
export interface NavigatorProvider {
    readonly name: string;
    readonly inheritsParentContext?: boolean;
    readonly capabilities?: {
        readonly agentOptions?: boolean;
    };
    readonly agentRouteDefaults?: unknown;
    readonly childAgent?: 'harness' | 'foreign';
    readonly start?: unknown;
    readonly prepareContinuable?: unknown;
}
/**
 * Whether any registered provider is a navigator. Reads a public list when dsh has one, else the registry's internal
 * map (`dsh-subagent/src/index.ts:200`, read only if it is a Map), else the providers announced since load.
 * @param subagents - `ctx.get('subagents')`, or undefined when it is not loaded.
 * @param announced - providers seen through `subagent/provider-added` and not removed since.
 */
export declare function hasNavigator(subagents: unknown, announced?: ReadonlyMap<string, NavigatorProvider>): boolean;

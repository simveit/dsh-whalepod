/** The command runtime when `ctx.get('commands')` has an `execute` function, else undefined. */
export function commandsOf(ctx) {
    const commands = ctx.get('commands');
    return typeof commands?.execute === 'function' ? commands : undefined;
}
/** Matriarc's tool and command name, and the name of its prompt section (dsh-matriarc src/index.ts). */
export const MATRIARC_TOOL = 'matriarc';
export const MATRIARC_RULES = 'dsh-matriarc:rules';
/** Services the thread service requires. Optional ones (permission presets, teams, subagents, llm, agentDefaultModel, dshHomePath) are read with ctx.get. */
export const HOST_INJECT = ['workspaceRegistry', 'sessionController', 'sessionQuery', 'agents', 'tools', 'systemPrompt'];

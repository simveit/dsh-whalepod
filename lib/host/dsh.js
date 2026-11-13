/** Services the thread service requires. Optional ones (permission presets, teams, subagents, llm, agentDefaultModel, dshHomePath) are read with ctx.get. */
export const HOST_INJECT = ['workspaceRegistry', 'sessionController', 'sessionQuery', 'agents', 'tools', 'systemPrompt'];

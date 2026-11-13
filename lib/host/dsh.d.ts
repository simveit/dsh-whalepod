/**
 * Local views of the dsh 0.2.2-rc.2 host services and objects the coordinator calls.
 *
 * The plugin does not import dsh packages at runtime (they are not dependencies of a linked plugin), so this file
 * declares only the members it uses. Every name here was checked against the rc.2 sources and a runtime spike
 * (see docs/dsh-api-notes.md).
 */
import type { Context } from '@deepseek-ai/cordis';
export type SessionId = string;
export interface TextPart {
    readonly type: 'text';
    readonly text: string;
}
export interface UserMessage {
    readonly id: string;
    readonly role: 'user';
    readonly content: readonly TextPart[];
    readonly source: {
        readonly kind: string;
        readonly [key: string]: unknown;
    };
}
export interface SessionEvent {
    readonly type: string;
    readonly seq: number;
    readonly time?: number;
    readonly data: unknown;
}
export interface Session {
    readonly id: SessionId;
    /** Immutable. `cwd` is the Session's project: its Workspace membership and its `workspace-write` boundary. */
    readonly header: {
        readonly cwd?: string;
        readonly parentSession?: string;
        readonly agentPreset?: string;
        readonly origin?: string;
    };
    /**
     * Append one event of a known type (dsh-session). Used only for `sandbox/mode` (narrowing a member, as dsh's own
     * `setSandboxMode` does) and `agent-preset/selected` (moving a Session off a removed preset).
     */
    append?(type: string, data: unknown): unknown;
}
export interface ModelSelection {
    readonly provider: string;
    readonly model: string;
    readonly reasoningEffort?: string;
}
export interface Agent {
    readonly id: SessionId;
    readonly status: 'idle' | 'running';
    readonly session: Session;
    /** The Session's model: its own selection, else its last request, else the dsh default it follows. */
    readonly model: {
        current(): ModelSelection | undefined;
        select(selection: ModelSelection): void;
    };
    readonly inbox: {
        readonly nextTurn: readonly UserMessage[];
        readonly nextStep: readonly UserMessage[];
    };
    followup(message: UserMessage): void;
    steer(message: UserMessage): void;
    inject(message: UserMessage): void;
    /** Resolves when no driver is active. */
    whenIdle(): Promise<void>;
    /** Abort the active turn; `keepInbox` keeps queued input. */
    cancel?(cause: {
        kind: 'user' | 'parent';
    }, options?: {
        keepInbox?: boolean;
    }): void;
    /** The Agent's own scoped context: `tools.restrict` narrows the global tools this Agent sees (dsh-tools). */
    readonly ctx?: {
        readonly tools?: {
            restrict?(filter: {
                allow?: readonly string[];
                deny?: readonly string[];
            }): () => void;
        };
    };
}
/** `ctx.agentPresets` (dsh-agent-preset-registry): only what moving old Sessions off a removed preset needs. */
export interface AgentPresets {
    resolve(id?: string): Promise<{
        id: string;
    }>;
    register?(definition: {
        id: string;
        name?: string;
        description?: string;
        order?: number;
        plugins: unknown[];
    }): Promise<() => Promise<void>>;
    recompose?(ctx: unknown, id: string): Promise<{
        id: string;
    }>;
}
/** `ctx.userQuestions` (dsh-user-questions): a structured question to the user, answered in the client. */
export interface UserQuestions {
    ask(request: {
        agent?: Agent;
        signal?: AbortSignal;
        questions: {
            id: string;
            question: string;
            header?: string;
            detail?: string;
            options?: {
                label: string;
                description?: string;
            }[];
            intent?: {
                kind: 'approval';
                approve: string;
                reject: string;
                always?: string;
            };
        }[];
    }): Promise<{
        answers: {
            id: string;
            selected: string[];
            custom?: string;
        }[];
    }>;
}
/** `ctx.workingDirectory` (dsh-working-directory): a Session's effective working directory. */
export interface WorkingDirectory {
    get(session: Session): string;
}
/** One tool call in dsh's pipeline (`tools/pre-execute`, guards): only the members the dsh-home guard reads. */
export interface ToolExecution {
    readonly name: string;
    readonly arguments: unknown;
    readonly agent?: Agent;
}
/**
 * `ctx.subagents` (dsh-subagent): the runtime that owns a lead's subagents and Agent Teams members. Members are child
 * Sessions (`header.origin: 'subagent'`, `header.parentSession` = creator) in the lead's tree.
 */
export interface Subagents {
    /** Interrupt one live child's current turn; `user` is a trusted host operation. Pending inbox work is kept. */
    interrupt(targetSessionId: SessionId, authority: {
        kind: 'user';
    }): void;
}
/** Payload and decision of the `agent/pre-step` waterfall (dsh-agent `PreStepDecision`). */
export interface PreStepPayload {
    readonly agent: Agent;
    readonly messages: readonly UserMessage[];
    readonly turn: number;
    readonly step: number;
}
export type PreStepDecision = {
    kind: 'reject';
} | {
    kind: 'enter';
    messages: UserMessage[];
};
/**
 * A sidebar Workspace. A Session belongs to it only when the Session's header cwd resolves to exactly its path
 * (dsh-workspace `attachSession`).
 */
export interface Workspace {
    readonly id: string;
    readonly path: string;
    readonly title: string;
    /** Member Sessions in display order (archived ones keep their slot). */
    readonly sessionIds: readonly SessionId[];
    setTitle(title: string): Promise<void>;
    /**
     * Prepend a Session to this Workspace (dsh-workspace `attachSession`): its header cwd must be exactly the Workspace
     * path, otherwise dsh rejects it without writing.
     */
    attachSession?(sessionId: SessionId): Promise<void>;
}
export interface WorkspaceRegistry {
    /** Returns the existing Workspace when one is registered for the same canonical path. */
    create(path: string, title?: string): Promise<Workspace>;
    resolveByPath(path: string): Promise<Workspace | undefined>;
    /** Workspaces in sidebar order. */
    list(): Workspace[];
    /** Move a Workspace before another one in the sidebar order (append when `beforeId` is undefined). */
    insertBefore(id: string, beforeId?: string): Promise<readonly string[]>;
    /** Remove a Workspace registration; its folder and Session logs are kept. */
    delete(id: string): Promise<boolean>;
    /**
     * Archive a Session (the sidebar's delete); reversible from the sidebar's archive view. Without `stopActivity`
     * dsh refuses to archive a Session that is still active.
     */
    archiveSession(sessionId: SessionId, options?: {
        stopActivity?: boolean;
    }): Promise<void>;
    /** Sessions the user archived (the sidebar's delete). An archived Session runs no model step. */
    readonly archivedSessionIds: readonly SessionId[];
}
/** `ctx.llm` (dsh-llm): the live provider registry. */
export interface Llm {
    /** Providers that are set up (credentials present). */
    listProviders(): readonly {
        readonly id: string;
    }[];
    listModels(provider: string): Promise<readonly {
        readonly id: string;
    }[]>;
}
/** `ctx.agentDefaultModel`: the model a Session follows until one is selected in it. */
export interface AgentDefaultModel {
    currentSelection(): ModelSelection;
}
export interface SessionState {
    readonly running: boolean;
    readonly active: boolean;
    readonly pendingInput: readonly string[];
}
export interface SessionController {
    create(request: {
        workspaceId?: string;
        cwd?: string;
        sessionId?: SessionId;
        agentPreset?: string;
    }): Promise<{
        sessionId: SessionId;
        agentPreset?: string;
    }>;
    resolveAgent(sessionId: SessionId): Promise<{
        agent: Agent;
    } | {
        error: Error;
    }>;
    /** A user-owned title (`session/title` with source `user`): it pins the title, as a rename in the UI does. */
    rename(request: {
        sessionId: SessionId;
        title: string;
    }): Promise<{
        title?: string;
        seq?: number;
    } | undefined>;
    state(request: {
        sessionId: SessionId;
    }, signal: AbortSignal): Promise<SessionState>;
    prompt(request: {
        requestId: string;
        sessionId: SessionId;
        mode: 'queue' | 'steer';
        content: readonly TextPart[];
        clientTimeZone?: string;
    }, signal: AbortSignal): Promise<{
        accepted: true;
    }>;
    cancel(request: {
        sessionId: SessionId;
    }): {
        accepted: true;
    };
}
export interface SessionQuery {
    readTitle(sessionId: SessionId, signal?: AbortSignal): Promise<{
        title: string;
    } | undefined>;
    readSession(sessionId: SessionId): Promise<{
        events: readonly SessionEvent[];
        session?: Session['header'];
    }>;
}
export interface PermissionPresets {
    set(session: Session, name: string): void;
    /** The Session's current preset name (`custom` when its knobs match none). */
    current?(session: Session): string;
    readonly names?: readonly string[];
}
export interface AgentTeams {
    setEnabled(agent: Agent, enabled: boolean, signal?: AbortSignal): Promise<void>;
    isEnabled(agent: Agent): boolean;
}
/** Raw tool definition accepted by `ctx.tools.register` (dsh-tools `ToolDefinition`). */
export interface ToolDefinition {
    readonly name: string;
    readonly description: string;
    readonly parameters: Record<string, unknown>;
    readonly output: {
        readonly schema: Record<string, unknown>;
        render(args: unknown, value: unknown): TextPart[];
    };
    execute(args: unknown, exec: ToolRunContext): Promise<unknown>;
}
export interface ToolRunContext {
    readonly callId: string;
    readonly agent?: Agent;
    readonly signal: AbortSignal;
}
export interface Tools {
    register(definition: ToolDefinition, options?: {
        when?: (context: {
            agent: Agent;
        }) => boolean;
    }): () => void;
    /**
     * A monotonic guard, run after every `tools/pre-execute` listener and approval and before the tool body; a returned
     * reason denies the call and nothing later can allow it again.
     */
    guard?(guard: (execution: ToolExecution) => string | undefined): () => void;
    /** Visible definitions for a scope (an Agent) or, without one, the global ones. */
    definitions?(scope?: unknown): readonly {
        readonly name: string;
    }[];
}
export interface SystemPrompt {
    section(section: {
        name: string;
        order: number;
        text: (context: {
            agent?: Agent;
        }) => string;
        interpolate?: boolean;
    }): () => void;
}
/** The context the thread service runs in, after its services are injected. */
export type HostContext = Context & {
    workspaceRegistry: WorkspaceRegistry;
    sessionController: SessionController;
    sessionQuery: SessionQuery;
    agents: {
        get(id: SessionId): Agent | undefined;
    };
    tools: Tools;
    systemPrompt: SystemPrompt;
};
/** Services the thread service requires. Optional ones (permission presets, teams, subagents, llm, agentDefaultModel, dshHomePath) are read with ctx.get. */
export declare const HOST_INJECT: readonly ["workspaceRegistry", "sessionController", "sessionQuery", "agents", "tools", "systemPrompt"];

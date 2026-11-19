/**
 * Client contribution for the host `coordinator` Remote namespace.
 *
 * dsh normally generates this file with @deepseek-ai/dsh-typert-generator, which only runs inside a
 * dsh-style workspace (tsconfig.host.json + packages/). Until the plugin adopts that layout, the spec is
 * written by hand in the same shape the generator emits. Keep it in sync with the `@Remote` methods
 * in ../index.ts: the host dispatches through the Gateway's source fallback, the client needs these
 * strict codecs to mount the methods on `ctx.remote.coordinator`.
 */
import { z } from 'zod'
import { createTypertRemoteInfo } from '@deepseek-ai/dsh-typert-protocol/remote-info'
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
import type {
  ArchiveCoordinatorRequest, ArchiveCoordinatorResult, CoordinatorInfo, CoordinatorState, CreateCoordinatorRequest, EnsureCoordinatorRequest, EnsureCoordinatorResult, PingResult,
  DeleteCoordinatorRequest, DeleteCoordinatorResult, ListModelChoicesRequest, ModelChoices, NewCoordinatorSetup, RenameCoordinatorRequest, SetCoordinatorFolderRequest, SetCoordinatorMatriarcEnabledRequest, SetCoordinatorMemoryEnabledRequest, SetCoordinatorMemoryRequest, SetCoordinatorMemoryResult,
  SetExecutorMatriarcEnabledRequest, SetExecutorPromptRequest, SetModelRequest, ThreadInfo, ThreadPermissionState,
} from '../types.ts'

/** The package name, as the dsh generator writes it into a Remote spec (the plugin id stays `dsh-coordinator`). */
const PACKAGE = 'dsh-whalepod'

/** What happened to the coordinator's sidebar Workspace on archive (added after section 5; WP-A owns the host side). */
export type ArchiveWorkspaceOutcome = 'removed' | 'kept-shared' | 'kept-has-sessions' | 'kept-not-own' | 'failed' | 'not-asked'
/** `archiveCoordinator` request with the optional Workspace removal; compatible with `ArchiveCoordinatorRequest` once it gains the field. */
export type ArchiveRequest = ArchiveCoordinatorRequest & { removeWorkspace?: boolean }
/** `archiveCoordinator` result; `workspace` is absent from a host that predates the field. */
export type ArchiveResult = ArchiveCoordinatorResult & { workspace?: ArchiveWorkspaceOutcome }
/**
 * State as the client reads it: `loading` is true while the host still validates the stored coordinators and rows
 * at startup (asked of the host in the round-2 fix pass; absent from a host without it, which then reads as loaded).
 */
export type ClientState = CoordinatorState & { loading?: boolean }

// Coordinator state codecs. Objects are not strict, so fields the host adds later do not break older clients.
// Every field the host sends must be listed: z.object drops unknown keys, so a missing entry silently hides it.
const THREAD_STATUSES = ['starting', 'running', 'idle', 'waiting-approval', 'waiting-question', 'needs-user',
  'done', 'failed', 'stopped'] as const
const FOLDER_WHY = ['outside', 'existing', 'symlink', 'thread-folder', 'coordinator-folder'] as const
const modelSchema = () => z.object({
  ok: z.boolean(),
  model: z.string().optional(),
  reason: z.enum(['no-provider', 'no-model', 'model-unavailable']).optional().catch(undefined),
})
// A model by dsh's ids; the host checks every id against dsh's lists, so the codec only checks the shape.
const modelChoiceSchema = () => z.object({ provider: z.string(), model: z.string(), reasoningEffort: z.string().optional() })
let coordinatorInfo: z.ZodType<CoordinatorInfo> | undefined
const coordinatorInfoSchema = (): z.ZodType<CoordinatorInfo> => (coordinatorInfo ??= z.object({
  id: z.string(),
  sessionId: z.string().nullable(),
  // A host that predates names sends none: '' makes the client fall back to the title.
  name: z.string().catch(''),
  title: z.string(),
  executorPrompt: z.string().optional().catch(undefined),
  memory: z.string().optional().catch(undefined),
  // A host without revisions sends none; a bad value reads as absent (the client then counts from 0).
  memoryRevision: z.number().int().nonnegative().optional().catch(undefined),
  memoryBy: z.object({ by: z.enum(['user', 'coordinator', 'executor']), executorId: z.string().optional(), executorTitle: z.string().optional(), at: z.number() }).optional().catch(undefined),
  memoryExecutors: z.array(z.object({ id: z.string(), title: z.string().optional() })).optional().catch(undefined),
  memoryOff: z.boolean().optional().catch(undefined),
  home: z.string(),
  folder: z.string(),
  folderProblem: z.string().optional().catch(undefined),
  archived: z.boolean().optional().catch(undefined),
  chatArchived: z.boolean().optional().catch(undefined),
  // An unknown future chat state reads as absent; the client then falls back to sessionId and chatArchived.
  chat: z.enum(['open', 'archived', 'gone', 'none']).optional().catch(undefined),
  model: modelSchema().optional().catch(undefined),
  // A host without the model settings sends none; a malformed one reads as not set.
  coordinatorModel: modelChoiceSchema().optional().catch(undefined),
  executorModel: modelChoiceSchema().optional().catch(undefined),
  // A host without the Matriarc settings sends none: the defaults apply (coordinator chat off, Executor Sessions on).
  coordinatorMatriarc: z.boolean().catch(false),
  executorMatriarc: z.boolean().catch(true),
  createdAt: z.number(),
  updatedAt: z.number(),
}) as z.ZodType<CoordinatorInfo>)
let threadInfo: z.ZodType<ThreadInfo> | undefined
const threadSchema = (): z.ZodType<ThreadInfo> => (threadInfo ??= z.object({
  id: z.string(),
  sessionId: z.string(),
  title: z.string(),
  cwd: z.string(),
  // An unknown future status degrades to `idle` instead of failing the whole poll.
  status: z.enum(THREAD_STATUSES).catch('idle'),
  statusDetail: z.string().optional(),
  lastReport: z.object({
    kind: z.enum(['progress', 'question', 'result', 'blocked']).catch('progress'),
    text: z.string(),
    at: z.number(),
  }).optional(),
  team: z.object({ members: z.number(), working: z.number() }).optional().catch(undefined),
  attentionSessionId: z.string().optional(),
  permission: z.enum(['auto', 'ask']).optional().catch(undefined),
  action: z.union([
    z.object({ kind: z.literal('confirm-folder'), path: z.string(), why: z.enum(FOLDER_WHY).catch('outside') }),
    z.object({ kind: z.literal('resume'), reason: z.enum(['wakes', 'budget', 'peers']).catch('wakes'), count: z.number() }),
  ]).optional().catch(undefined),
  // A row without an owner reads as "Without coordinator" (only Archive applies), never as another's thread.
  coordinatorId: z.string().catch(''),
  createdAt: z.number(),
  updatedAt: z.number(),
}) as z.ZodType<ThreadInfo>)
let stateResult: z.ZodType<ClientState> | undefined
const stateResultSchema = (): z.ZodType<ClientState> => (stateResult ??= z.object({
  coordinators: z.array(coordinatorInfoSchema()),
  revision: z.number(),
  loading: z.boolean().optional().catch(undefined),
  epoch: z.string().optional(),
  lastCoordinatorId: z.string().optional().catch(undefined),
  base: z.object({ path: z.string(), problem: z.string().optional() }).optional().catch(undefined),
  problem: problemSchema().optional().catch(undefined),
  problems: z.array(problemSchema()).optional().catch(undefined),
  allowedFolders: z.array(z.string()).optional().catch(undefined),
  threadPermission: permissionStateSchema().optional().catch(undefined),
  // A host without Matriarc support sends none: read as not installed.
  matriarc: z.object({ installed: z.boolean().catch(false) }).catch({ installed: false }),
  threads: z.array(threadSchema()),
  // Archived rows are listed for the page's Archived group; a host without the field sends none.
  archivedThreads: z.array(threadSchema()).optional().catch(undefined),
}) as z.ZodType<ClientState>)
// An unknown problem kind degrades to a generic one instead of failing the poll.
const PROBLEM_KINDS = ['locked', 'read-only', 'state-reset', 'state-dropped', 'save-failed', 'auto-unavailable', 'bad-root', 'not-ready'] as const
const problemSchema = () => z.object({ kind: z.enum(PROBLEM_KINDS).catch('not-ready'), detail: z.string() })
let permissionState: z.ZodType<ThreadPermissionState> | undefined
// An unknown mode reads as `ask`, the stricter one.
const permissionStateSchema = (): z.ZodType<ThreadPermissionState> => (permissionState ??= z.object({
  mode: z.enum(['auto', 'ask']).catch('ask'),
  autoAvailable: z.boolean(),
  effective: z.enum(['auto', 'ask']).catch('ask'),
}) as z.ZodType<ThreadPermissionState>)
let permissionMode: z.ZodType<string> | undefined
const permissionModeSchema = (): z.ZodType<string> => (permissionMode ??= z.enum(['auto', 'ask']))
let ensureRequest: z.ZodType<EnsureCoordinatorRequest> | undefined
const ensureRequestSchema = (): z.ZodType<EnsureCoordinatorRequest> => (ensureRequest ??= z.object({ coordinatorId: z.string().optional() }))
let createRequest: z.ZodType<CreateCoordinatorRequest> | undefined
// A model the form leaves out gets the host's default; null says "none".
const createRequestSchema = (): z.ZodType<CreateCoordinatorRequest> => (createRequest ??= z.object({
  home: z.string().optional(), name: z.string().optional(), suggestedName: z.string().optional(),
  coordinatorModel: modelChoiceSchema().nullable().optional(), executorModel: modelChoiceSchema().nullable().optional(),
  coordinatorMatriarc: z.boolean().optional(), executorMatriarc: z.boolean().optional(),
}) as z.ZodType<CreateCoordinatorRequest>)
let ensureResult: z.ZodType<EnsureCoordinatorResult> | undefined
const ensureResultSchema = (): z.ZodType<EnsureCoordinatorResult> => (ensureResult ??= z.object({ coordinatorId: z.string(), sessionId: z.string() }))
let folderRequest: z.ZodType<SetCoordinatorFolderRequest> | undefined
const folderRequestSchema = (): z.ZodType<SetCoordinatorFolderRequest> => (folderRequest ??= z.object({ coordinatorId: z.string(), path: z.string() }))
let promptRequest: z.ZodType<SetExecutorPromptRequest> | undefined
const promptRequestSchema = (): z.ZodType<SetExecutorPromptRequest> => (promptRequest ??= z.object({ coordinatorId: z.string(), text: z.string() }))
let memoryRequest: z.ZodType<SetCoordinatorMemoryRequest> | undefined
const memoryRequestSchema = (): z.ZodType<SetCoordinatorMemoryRequest> => (memoryRequest ??= z.object({ coordinatorId: z.string(), text: z.string(), revision: z.number().int().nonnegative() }))
let memoryResult: z.ZodType<SetCoordinatorMemoryResult> | undefined
const memoryResultSchema = (): z.ZodType<SetCoordinatorMemoryResult> => (memoryResult ??= z.object({ saved: z.boolean(), coordinator: coordinatorInfoSchema() }) as z.ZodType<SetCoordinatorMemoryResult>)
let memoryEnabledRequest: z.ZodType<SetCoordinatorMemoryEnabledRequest> | undefined
const memoryEnabledRequestSchema = (): z.ZodType<SetCoordinatorMemoryEnabledRequest> => (memoryEnabledRequest ??= z.object({ coordinatorId: z.string(), enabled: z.boolean() }))
let coordinatorMatriarcRequest: z.ZodType<SetCoordinatorMatriarcEnabledRequest> | undefined
const coordinatorMatriarcRequestSchema = (): z.ZodType<SetCoordinatorMatriarcEnabledRequest> => (coordinatorMatriarcRequest ??= z.object({ coordinatorId: z.string(), enabled: z.boolean() }))
let executorMatriarcRequest: z.ZodType<SetExecutorMatriarcEnabledRequest> | undefined
const executorMatriarcRequestSchema = (): z.ZodType<SetExecutorMatriarcEnabledRequest> => (executorMatriarcRequest ??= z.object({ coordinatorId: z.string(), enabled: z.boolean() }))
let modelChoicesRequest: z.ZodType<ListModelChoicesRequest> | undefined
const modelChoicesRequestSchema = (): z.ZodType<ListModelChoicesRequest> => (modelChoicesRequest ??= z.object({ coordinatorId: z.string() }))
const modelSettingSchema = () => z.object({ stored: modelChoiceSchema().optional(), effective: modelChoiceSchema().optional(), available: z.boolean(), unchecked: z.boolean().optional() })
const modelGroupsSchema = () => z.array(z.object({
  id: z.string(),
  name: z.string(),
  models: z.array(z.object({
    id: z.string(),
    name: z.string(),
    efforts: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
    defaultEffort: z.string().optional(),
  })),
}))
let modelChoices: z.ZodType<ModelChoices> | undefined
const modelChoicesSchema = (): z.ZodType<ModelChoices> => (modelChoices ??= z.object({
  groups: modelGroupsSchema(),
  partial: z.boolean(),
  coordinator: modelSettingSchema(),
  executors: modelSettingSchema(),
}) as z.ZodType<ModelChoices>)
let newSetup: z.ZodType<NewCoordinatorSetup> | undefined
const newSetupSchema = (): z.ZodType<NewCoordinatorSetup> => (newSetup ??= z.object({
  name: z.string(),
  groups: modelGroupsSchema(),
  partial: z.boolean(),
  coordinatorModel: modelChoiceSchema().optional(),
  executorModel: modelChoiceSchema().optional(),
  // A host without Matriarc support sends none: not installed, so the form sends no Matriarc choice.
  matriarc: z.object({ installed: z.boolean().catch(false), coordinator: z.literal(false).catch(false), executor: z.literal(true).catch(true) })
    .catch({ installed: false, coordinator: false, executor: true }),
}) as z.ZodType<NewCoordinatorSetup>)
let setModelRequest: z.ZodType<SetModelRequest> | undefined
const setModelRequestSchema = (): z.ZodType<SetModelRequest> => (setModelRequest ??= z.object({ coordinatorId: z.string(), model: modelChoiceSchema().nullable() }) as z.ZodType<SetModelRequest>)
let renameRequest: z.ZodType<RenameCoordinatorRequest> | undefined
const renameRequestSchema = (): z.ZodType<RenameCoordinatorRequest> => (renameRequest ??= z.object({ coordinatorId: z.string(), name: z.string() }))
let deleteRequest: z.ZodType<DeleteCoordinatorRequest> | undefined
const deleteRequestSchema = (): z.ZodType<DeleteCoordinatorRequest> => (deleteRequest ??= z.object({ coordinatorId: z.string() }))
let deleteResult: z.ZodType<DeleteCoordinatorResult> | undefined
const deleteResultSchema = (): z.ZodType<DeleteCoordinatorResult> => (deleteResult ??= z.object({ deleted: z.string(), threads: z.array(z.string()) }))
let archiveRequest: z.ZodType<ArchiveRequest> | undefined
const archiveRequestSchema = (): z.ZodType<ArchiveRequest> => (archiveRequest ??= z.object({
  coordinatorId: z.string(), force: z.boolean().optional(), removeWorkspace: z.boolean().optional(),
}))
let archiveResult: z.ZodType<ArchiveResult> | undefined
const archiveResultSchema = (): z.ZodType<ArchiveResult> => (archiveResult ??= z.object({
  archived: z.string(),
  threads: z.array(z.string()),
  workspace: z.enum(['removed', 'kept-shared', 'kept-has-sessions', 'kept-not-own', 'failed', 'not-asked']).optional().catch(undefined),
}) as z.ZodType<ArchiveResult>)
let threadId: z.ZodType<string> | undefined
const threadIdSchema = (): z.ZodType<string> => (threadId ??= z.string())
let voidResult: z.ZodType<unknown> | undefined
// `Promise<void>` on the host; accept whatever the carrier turns undefined into.
const voidResultSchema = (): z.ZodType<unknown> => (voidResult ??= z.unknown())

let confirmRequest: z.ZodType<{ id: string; decision: 'once' | 'always' | 'deny' }> | undefined
const confirmRequestSchema = () => (confirmRequest ??= z.object({ id: z.string(), decision: z.enum(['once', 'always', 'deny']) }))
let confirmResult: z.ZodType<{ id: string; started: boolean }> | undefined
const confirmResultSchema = () => (confirmResult ??= z.object({ id: z.string(), started: z.boolean() }))
let folderList: z.ZodType<string[]> | undefined
const folderListSchema = () => (folderList ??= z.array(z.string()))
let folderPath: z.ZodType<string> | undefined
const folderPathSchema = () => (folderPath ??= z.string())
let resumeResult: z.ZodType<{ id: string }> | undefined
const resumeResultSchema = () => (resumeResult ??= z.object({ id: z.string() }))

let pingResult: z.ZodType<PingResult> | undefined
const pingResultSchema = (): z.ZodType<PingResult> => (pingResult ??= z.object({
  ok: z.literal(true),
  dshVersion: z.string(),
  time: z.string(),
}))

/** One JSON request parameter named `request`; `optional` mirrors a host `request?: T` (the client always sends an object). */
function requestParameter(typeName: string, create: () => z.ZodType<unknown>, optional = false) {
  const codec = { mode: 'strict' as const, typeSymbol: `${PACKAGE}#${typeName}`, create }
  return { name: 'request', source: 'json' as const, codec, strictCodec: codec, ...(optional ? { acceptsUndefined: true as const } : {}) }
}

export const TYPERT_REMOTE = createTypertRemoteInfo({
  package: PACKAGE,
  methods: {
    'coordinator/ping': {
      service: 'coordinator',
      description: 'Report that the host side of the plugin is alive.',
      invocation: { kind: 'direct' },
      parameters: [],
      cancellation: { parameter: 'signal' },
      result: {
        mode: 'strict',
        typeSymbol: `${PACKAGE}#PingResult`,
        create: pingResultSchema,
      },
    },
    'coordinator/getState': {
      service: 'coordinator',
      description: 'Return the coordinators, the thread list and a revision counter.',
      invocation: { kind: 'direct' },
      parameters: [],
      cancellation: { parameter: 'signal' },
      result: { mode: 'strict', typeSymbol: `${PACKAGE}#CoordinatorState`, create: stateResultSchema },
    },
    'coordinator/ensureCoordinator': {
      service: 'coordinator',
      description: 'Open a coordinator: the named one (reopening its chat when archived), else the last used one, else a new one.',
      invocation: { kind: 'direct' },
      parameters: [requestParameter('EnsureCoordinatorRequest', ensureRequestSchema, true)],
      cancellation: { parameter: 'signal' },
      result: { mode: 'strict', typeSymbol: `${PACKAGE}#EnsureCoordinatorResult`, create: ensureResultSchema },
    },
    'coordinator/newCoordinatorSetup': {
      service: 'coordinator',
      description: 'What the New coordinator form starts from: a suggested name, the models dsh offers, and the default model choices.',
      invocation: { kind: 'direct' },
      parameters: [],
      cancellation: { parameter: 'signal' },
      result: { mode: 'strict', typeSymbol: `${PACKAGE}#NewCoordinatorSetup`, create: newSetupSchema },
    },
    'coordinator/createCoordinator': {
      service: 'coordinator',
      description: 'Create a new coordinator with its own home folder and chat Session, under the name and on the models the form chose.',
      invocation: { kind: 'direct' },
      parameters: [requestParameter('CreateCoordinatorRequest', createRequestSchema, true)],
      cancellation: { parameter: 'signal' },
      result: { mode: 'strict', typeSymbol: `${PACKAGE}#EnsureCoordinatorResult`, create: ensureResultSchema },
    },
    'coordinator/setCoordinatorFolder': {
      service: 'coordinator',
      description: 'Change the folder new threads of a coordinator start in.',
      invocation: { kind: 'direct' },
      parameters: [requestParameter('SetCoordinatorFolderRequest', folderRequestSchema)],
      cancellation: { parameter: 'signal' },
      result: { mode: 'strict', typeSymbol: `${PACKAGE}#CoordinatorInfo`, create: coordinatorInfoSchema },
    },
    'coordinator/setExecutorPrompt': {
      service: 'coordinator',
      description: 'Set the standing instructions every new Executor Session of a coordinator starts with; empty text clears them.',
      invocation: { kind: 'direct' },
      parameters: [requestParameter('SetExecutorPromptRequest', promptRequestSchema)],
      cancellation: { parameter: 'signal' },
      result: { mode: 'strict', typeSymbol: `${PACKAGE}#CoordinatorInfo`, create: coordinatorInfoSchema },
    },
    'coordinator/listModelChoices': {
      service: 'coordinator',
      description: 'List the models and reasoning efforts dsh offers, with a coordinator\'s two model settings and what each resolves to now.',
      invocation: { kind: 'direct' },
      parameters: [requestParameter('ListModelChoicesRequest', modelChoicesRequestSchema)],
      cancellation: { parameter: 'signal' },
      result: { mode: 'strict', typeSymbol: `${PACKAGE}#ModelChoices`, create: modelChoicesSchema },
    },
    'coordinator/setCoordinatorModel': {
      service: 'coordinator',
      description: 'Set the model a coordinator\'s chat runs on; null clears the setting.',
      invocation: { kind: 'direct' },
      parameters: [requestParameter('SetModelRequest', setModelRequestSchema)],
      cancellation: { parameter: 'signal' },
      result: { mode: 'strict', typeSymbol: `${PACKAGE}#CoordinatorInfo`, create: coordinatorInfoSchema },
    },
    'coordinator/setExecutorModel': {
      service: 'coordinator',
      description: 'Set the model new Executor Sessions of a coordinator start on; null means the same as the coordinator.',
      invocation: { kind: 'direct' },
      parameters: [requestParameter('SetModelRequest', setModelRequestSchema)],
      cancellation: { parameter: 'signal' },
      result: { mode: 'strict', typeSymbol: `${PACKAGE}#CoordinatorInfo`, create: coordinatorInfoSchema },
    },
    'coordinator/setCoordinatorMemory': {
      service: 'coordinator',
      description: 'Replace a coordinator\'s memory, one page of markdown notes, based on a revision; empty text clears it; a stale revision saves nothing.',
      invocation: { kind: 'direct' },
      parameters: [requestParameter('SetCoordinatorMemoryRequest', memoryRequestSchema)],
      cancellation: { parameter: 'signal' },
      result: { mode: 'strict', typeSymbol: `${PACKAGE}#SetCoordinatorMemoryResult`, create: memoryResultSchema },
    },
    'coordinator/setCoordinatorMemoryEnabled': {
      service: 'coordinator',
      description: 'Switch a coordinator\'s memory on or off; off keeps the text.',
      invocation: { kind: 'direct' },
      parameters: [requestParameter('SetCoordinatorMemoryEnabledRequest', memoryEnabledRequestSchema)],
      cancellation: { parameter: 'signal' },
      result: { mode: 'strict', typeSymbol: `${PACKAGE}#CoordinatorInfo`, create: coordinatorInfoSchema },
    },
    'coordinator/setCoordinatorMatriarcEnabled': {
      service: 'coordinator',
      description: 'Switch Matriarc on or off for a coordinator\'s chat; applies at once.',
      invocation: { kind: 'direct' },
      parameters: [requestParameter('SetCoordinatorMatriarcEnabledRequest', coordinatorMatriarcRequestSchema)],
      cancellation: { parameter: 'signal' },
      result: { mode: 'strict', typeSymbol: `${PACKAGE}#CoordinatorInfo`, create: coordinatorInfoSchema },
    },
    'coordinator/setExecutorMatriarcEnabled': {
      service: 'coordinator',
      description: 'Switch Matriarc on or off for the Executor Sessions a coordinator starts afterwards.',
      invocation: { kind: 'direct' },
      parameters: [requestParameter('SetExecutorMatriarcEnabledRequest', executorMatriarcRequestSchema)],
      cancellation: { parameter: 'signal' },
      result: { mode: 'strict', typeSymbol: `${PACKAGE}#CoordinatorInfo`, create: coordinatorInfoSchema },
    },
    'coordinator/renameCoordinator': {
      service: 'coordinator',
      description: 'Rename a coordinator; its chat title and sidebar group follow.',
      invocation: { kind: 'direct' },
      parameters: [requestParameter('RenameCoordinatorRequest', renameRequestSchema)],
      cancellation: { parameter: 'signal' },
      result: { mode: 'strict', typeSymbol: `${PACKAGE}#CoordinatorInfo`, create: coordinatorInfoSchema },
    },
    'coordinator/archiveCoordinator': {
      service: 'coordinator',
      description: 'Archive a coordinator, its chat and its finished threads; with force also its working threads; optionally remove its Workspace.',
      invocation: { kind: 'direct' },
      parameters: [requestParameter('ArchiveCoordinatorRequest', archiveRequestSchema)],
      cancellation: { parameter: 'signal' },
      result: { mode: 'strict', typeSymbol: `${PACKAGE}#ArchiveCoordinatorResult`, create: archiveResultSchema },
    },
    'coordinator/deleteCoordinator': {
      service: 'coordinator',
      description: 'Delete an archived coordinator entry; its Sessions, folders and files stay.',
      invocation: { kind: 'direct' },
      parameters: [requestParameter('DeleteCoordinatorRequest', deleteRequestSchema)],
      cancellation: { parameter: 'signal' },
      result: { mode: 'strict', typeSymbol: `${PACKAGE}#DeleteCoordinatorResult`, create: deleteResultSchema },
    },
    'coordinator/archiveThread': {
      service: 'coordinator',
      description: 'Remove a finished thread from the list without deleting its Session.',
      invocation: { kind: 'direct' },
      parameters: [
        {
          name: 'id',
          source: 'json',
          codec: { mode: 'strict', typeSymbol: `${PACKAGE}#ThreadId`, create: threadIdSchema },
          strictCodec: { mode: 'strict', typeSymbol: `${PACKAGE}#ThreadId`, create: threadIdSchema },
        },
      ],
      cancellation: { parameter: 'signal' },
      result: { mode: 'strict', typeSymbol: `${PACKAGE}#Void`, create: voidResultSchema },
    },
    'coordinator/setThreadPermission': {
      service: 'coordinator',
      description: 'Set how new threads run: auto (auto review) or ask (workspace-write).',
      invocation: { kind: 'direct' },
      parameters: [
        {
          name: 'mode',
          source: 'json',
          codec: { mode: 'strict', typeSymbol: `${PACKAGE}#ThreadPermission`, create: permissionModeSchema },
          strictCodec: { mode: 'strict', typeSymbol: `${PACKAGE}#ThreadPermission`, create: permissionModeSchema },
        },
      ],
      cancellation: { parameter: 'signal' },
      result: { mode: 'strict', typeSymbol: `${PACKAGE}#ThreadPermissionState`, create: permissionStateSchema },
    },
    'coordinator/confirmFolder': {
      service: 'coordinator',
      description: 'Answer a thread\'s folder confirmation: once, always or deny.',
      invocation: { kind: 'direct' },
      parameters: [
        {
          name: 'request',
          source: 'json',
          codec: { mode: 'strict', typeSymbol: `${PACKAGE}#FolderConfirmation`, create: confirmRequestSchema },
          strictCodec: { mode: 'strict', typeSymbol: `${PACKAGE}#FolderConfirmation`, create: confirmRequestSchema },
        },
      ],
      cancellation: { parameter: 'signal' },
      result: { mode: 'strict', typeSymbol: `${PACKAGE}#FolderConfirmationResult`, create: confirmResultSchema },
    },
    'coordinator/removeAllowedFolder': {
      service: 'coordinator',
      description: 'Remove a folder from the allowed folders.',
      invocation: { kind: 'direct' },
      parameters: [
        {
          name: 'path',
          source: 'json',
          codec: { mode: 'strict', typeSymbol: `${PACKAGE}#FolderPath`, create: folderPathSchema },
          strictCodec: { mode: 'strict', typeSymbol: `${PACKAGE}#FolderPath`, create: folderPathSchema },
        },
      ],
      cancellation: { parameter: 'signal' },
      result: { mode: 'strict', typeSymbol: `${PACKAGE}#FolderList`, create: folderListSchema },
    },
    'coordinator/resumeThread': {
      service: 'coordinator',
      description: 'Resume a thread the spend guards paused.',
      invocation: { kind: 'direct' },
      parameters: [
        {
          name: 'id',
          source: 'json',
          codec: { mode: 'strict', typeSymbol: `${PACKAGE}#ThreadId`, create: threadIdSchema },
          strictCodec: { mode: 'strict', typeSymbol: `${PACKAGE}#ThreadId`, create: threadIdSchema },
        },
      ],
      cancellation: { parameter: 'signal' },
      result: { mode: 'strict', typeSymbol: `${PACKAGE}#ResumeResult`, create: resumeResultSchema },
    },
  },
}, z)

/** Typed view of the mounted namespace, for client code. Calls resolve to a result envelope, not a throw. */
export interface CoordinatorRemote {
  ping(signal?: AbortSignal): Promise<RemoteResult<PingResult>>
  getState(signal?: AbortSignal): Promise<RemoteResult<ClientState>>
  ensureCoordinator(request: EnsureCoordinatorRequest | undefined, signal?: AbortSignal): Promise<RemoteResult<EnsureCoordinatorResult>>
  newCoordinatorSetup(signal?: AbortSignal): Promise<RemoteResult<NewCoordinatorSetup>>
  createCoordinator(request: CreateCoordinatorRequest | undefined, signal?: AbortSignal): Promise<RemoteResult<EnsureCoordinatorResult>>
  setCoordinatorFolder(request: SetCoordinatorFolderRequest, signal?: AbortSignal): Promise<RemoteResult<CoordinatorInfo>>
  setExecutorPrompt(request: SetExecutorPromptRequest, signal?: AbortSignal): Promise<RemoteResult<CoordinatorInfo>>
  listModelChoices(request: ListModelChoicesRequest, signal?: AbortSignal): Promise<RemoteResult<ModelChoices>>
  setCoordinatorModel(request: SetModelRequest, signal?: AbortSignal): Promise<RemoteResult<CoordinatorInfo>>
  setExecutorModel(request: SetModelRequest, signal?: AbortSignal): Promise<RemoteResult<CoordinatorInfo>>
  setCoordinatorMemory(request: SetCoordinatorMemoryRequest, signal?: AbortSignal): Promise<RemoteResult<SetCoordinatorMemoryResult>>
  setCoordinatorMemoryEnabled(request: SetCoordinatorMemoryEnabledRequest, signal?: AbortSignal): Promise<RemoteResult<CoordinatorInfo>>
  setCoordinatorMatriarcEnabled(request: SetCoordinatorMatriarcEnabledRequest, signal?: AbortSignal): Promise<RemoteResult<CoordinatorInfo>>
  setExecutorMatriarcEnabled(request: SetExecutorMatriarcEnabledRequest, signal?: AbortSignal): Promise<RemoteResult<CoordinatorInfo>>
  renameCoordinator(request: RenameCoordinatorRequest, signal?: AbortSignal): Promise<RemoteResult<CoordinatorInfo>>
  archiveCoordinator(request: ArchiveRequest, signal?: AbortSignal): Promise<RemoteResult<ArchiveResult>>
  deleteCoordinator(request: DeleteCoordinatorRequest, signal?: AbortSignal): Promise<RemoteResult<DeleteCoordinatorResult>>
  archiveThread(id: string, signal?: AbortSignal): Promise<RemoteResult<unknown>>
  setThreadPermission(mode: string, signal?: AbortSignal): Promise<RemoteResult<ThreadPermissionState>>
  confirmFolder(request: { id: string; decision: 'once' | 'always' | 'deny' }, signal?: AbortSignal): Promise<RemoteResult<{ id: string; started: boolean }>>
  removeAllowedFolder(path: string, signal?: AbortSignal): Promise<RemoteResult<string[]>>
  resumeThread(id: string, signal?: AbortSignal): Promise<RemoteResult<{ id: string }>>
}

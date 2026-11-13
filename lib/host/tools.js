/**
 * Model-facing tools (names from names.ts). Coordinator tools are admitted only in coordinator sessions;
 * `coordinator_report` and the peer tools only in thread lead sessions (not in their subagents or team members, which
 * are separate sessions). Both are global conditional registrations (`ctx.tools.register(def, { when })`), so admission follows the thread table rather than
 * the preset, and a session that merely selects one of the presets in the UI gets no tools it cannot use.
 *
 * Tool registration pattern (zod-free here) follows `registerTool` in dsh-superagent-prototype
 * (src/app/sessions.ts), Copyright (c) 2026 DeepSeek Harness Team, MIT License (see LICENSE).
 */
import { randomUUID } from 'node:crypto';
import { TOOL } from "./names.js";
import { renderView, threadListView } from "./views.js";
class ArgError extends Error {
}
function obj(args) {
    if (args === null || typeof args !== 'object' || Array.isArray(args))
        throw new ArgError('arguments must be an object');
    return args;
}
function str(args, key, opts) {
    const value = args[key];
    if (value === undefined || value === null || value === '') {
        if (opts.optional === true)
            return undefined;
        throw new ArgError(`"${key}" is required`);
    }
    if (typeof value !== 'string')
        throw new ArgError(`"${key}" must be a string`);
    const trimmed = value.trim();
    if (trimmed === '' && opts.optional !== true)
        throw new ArgError(`"${key}" must not be empty`);
    if (trimmed.length > opts.max)
        throw new ArgError(`"${key}" is longer than ${opts.max} characters`);
    return trimmed === '' ? undefined : trimmed;
}
/**
 * A required string under its current name or the name of an earlier release (`thread` became `executor`, `brief`
 * became `assignment`). The current name wins when both are given.
 */
function renamed(args, key, legacy, opts) {
    const current = str(args, key, { max: opts.max, optional: true });
    if (current !== undefined)
        return current;
    const old = str(args, legacy, { max: opts.max, optional: true });
    if (old !== undefined)
        return old;
    throw new ArgError(`"${key}" is required`);
}
function oneOf(args, key, values, fallback) {
    const value = args[key] ?? fallback;
    if (typeof value !== 'string' || !values.includes(value))
        throw new ArgError(`"${key}" must be one of ${values.join(', ')}`);
    return value;
}
/** JSON of the trusted fields, then any untrusted data blocks as plain text (views.ts). */
const render = (_args, value) => [{ type: 'text', text: renderView(value) }];
/**
 * One tool. `execute` gets the calling Session's id; a call without a calling agent fails before it reaches the
 * thread service, so no operation runs without knowing whose threads it may touch.
 */
function tool(name, description, properties, required, execute) {
    return {
        name,
        description,
        // No `additionalProperties: false`: calls that use a parameter name of an earlier release (`thread`, `brief`)
        // must still reach `execute`, which maps them.
        parameters: { type: 'object', properties, required },
        output: { schema: { type: 'object' }, render },
        async execute(args, exec) {
            try {
                const caller = exec.agent?.id;
                if (typeof caller !== 'string' || caller === '')
                    throw new Error(`${name} needs a calling agent`);
                // dsh requires lossless JSON output: drop undefined fields and copy readonly arrays.
                return JSON.parse(JSON.stringify(await execute(obj(args), caller, exec) ?? {}));
            }
            catch (error) {
                // Ordinary failures go back to the model as a result it can act on.
                return { error: error instanceof Error ? error.message : String(error) };
            }
        },
    };
}
const EXECUTOR_REF = { type: 'string', description: `Required. Executor Session id (for example t-3f9a), as returned by ${TOOL.start} or ${TOOL.list}.` };
export function coordinatorTools(ops) {
    return [
        tool(TOOL.start, 'Start a new Executor Session: a separate top-level session with its own lead agent and working directory, running '
            + 'in the permission mode the user chose, with Agent Teams enabled. The Assignment is its first message and must be '
            + 'self-contained: goal, working directory, done criteria, standing rules, and how to report. Returns the '
            + 'executor\'s id. If the running cap is reached the executor is created and queued. A folder that is not a new '
            + 'folder under your own folder waits for the user to confirm it; the result says so.', {
            title: { type: 'string', description: 'The executor\'s name, shown as its session title: about five words in sentence case, like "Fix the flaky upload test". No prefix, no id. Also names the folder when cwd is omitted.' },
            assignment: { type: 'string', description: 'Required. The complete, self-contained Assignment for the executor\'s Lead.' },
            cwd: { type: 'string', description: 'Omit to get a new folder under your own folder (the usual choice). Pass an absolute path only when the user named the folder for this work in this chat; a folder the user did not type is refused, and then you ask the user. A folder the user typed still waits for their confirmation unless it is on their allowed-folders list.' },
        }, ['title'], (args, caller, exec) => ops.startThread(caller, {
            title: str(args, 'title', { max: 80 }),
            brief: renamed(args, 'assignment', 'brief', { max: 40000 }),
            ...(() => { const cwd = str(args, 'cwd', { max: 1000, optional: true }); return cwd === undefined ? {} : { cwd }; })(),
        }, exec.signal)),
        tool(TOOL.message, 'Send a message to the lead of one of your Executor Sessions: an answer to its question, a correction, or a '
            + 'follow-up task. Wakes an idle executor; a running one sees it at its next step. Never use it to approve a '
            + 'pending approval: only the user can approve.', { executor: EXECUTOR_REF, text: { type: 'string', description: 'The message.' } }, ['text'], 
        // The delivery key is minted per execution (L3): some providers reuse tool-call ids.
        (args, caller, exec) => ops.messageThread(caller, renamed(args, 'executor', 'thread', { max: 200 }), str(args, 'text', { max: 20000 }), randomUUID(), exec.signal)),
        tool(TOOL.list, 'List your Executor Sessions with their status (starting, running, idle, waiting-approval, waiting-question, '
            + 'needs-user, done, failed, stopped), a one-line detail, and the last Report.', {}, [], (_args, caller) => threadListView(ops.listThreads(caller))),
        tool(TOOL.read, 'Read one of your Executor Sessions. mode "summary": status, what it waits on, last Report and last message. '
            + '"recent": summary plus the last entries of its history. "full": the whole history in pages; pass the returned '
            + 'nextCursor as cursor to read the next page.', {
            executor: EXECUTOR_REF,
            mode: { type: 'string', enum: ['summary', 'recent', 'full'], description: 'How much to read. Default summary.' },
            cursor: { type: 'integer', description: 'For mode full: the nextCursor of the previous page.' },
        }, [], (args, caller, exec) => {
            const cursor = args['cursor'];
            if (cursor !== undefined && cursor !== null && (typeof cursor !== 'number' || !Number.isInteger(cursor)))
                throw new ArgError('"cursor" must be an integer');
            return ops.readThread(caller, renamed(args, 'executor', 'thread', { max: 200 }), oneOf(args, 'mode', ['summary', 'recent', 'full'], 'summary'), typeof cursor === 'number' ? cursor : undefined, exec.signal);
        }),
        tool(TOOL.flagUser, 'Flag one of your Executor Sessions for the user (status needs-user) when it needs something only the user can '
            + 'give, such as a question you cannot answer. The flag clears when the user writes in the executor or it starts '
            + 'a new turn.', { executor: EXECUTOR_REF, reason: { type: 'string', description: 'One line for the user: what the executor needs from them.' } }, ['reason'], (args, caller) => ops.flagUser(caller, renamed(args, 'executor', 'thread', { max: 200 }), str(args, 'reason', { max: 500 }))),
        tool(TOOL.stop, 'Stop the current turn of one of your Executor Sessions, with its Teammates. Its history and pending messages are '
            + `kept; message it with ${TOOL.message} to continue.`, { executor: EXECUTOR_REF }, [], (args, caller) => ops.stopThread(caller, renamed(args, 'executor', 'thread', { max: 200 }))),
        tool(TOOL.archive, 'Remove a finished Executor Session (idle, done, failed or stopped) from your list and archive its session; the '
            + 'user can restore it from the sidebar\'s archive. Its folder is kept. A running or waiting executor is refused.', {
            executor: EXECUTOR_REF,
            force: { type: 'boolean', description: 'Archive even a running or waiting executor, stopping its work. Only when the user explicitly asked for it.' },
        }, [], (args, caller) => ops.archiveThread(caller, renamed(args, 'executor', 'thread', { max: 200 }), { force: args['force'] === true })),
    ];
}
export function threadTools(ops) {
    return [
        tool(TOOL.report, 'Send a Report to the coordinator that started this Executor Session. kind "result": the task is finished (say '
            + 'what was done and where). "question": you need an answer to continue; end your turn after asking unless you '
            + 'can work on something else meanwhile. "blocked": you cannot continue (say why and what would unblock you). '
            + '"progress": a short milestone update; use it sparingly, it does not wake the coordinator.', {
            kind: { type: 'string', enum: ['progress', 'question', 'result', 'blocked'] },
            text: { type: 'string', description: 'The Report, self-contained and concise.' },
        }, ['kind', 'text'], (args, caller) => ops.report(caller, oneOf(args, 'kind', ['progress', 'question', 'result', 'blocked']), str(args, 'text', { max: 20000 }))),
        tool(TOOL.peers, 'List the other Executor Sessions under the same coordinator: id, status, folder, and their title as data. '
            + 'Use it to find the executor that owns a piece of work you depend on.', {}, [], (_args, caller) => ops.peers(caller)),
        tool(TOOL.send, 'Send a short message to the lead of another Executor Session under the same coordinator, when your work depends '
            + 'on theirs or theirs on yours: an interface, a finding, a file location, or a question only they can answer. Not '
            + 'for status or chatter. The other lead gets it as information from a colleague, not as an instruction from the '
            + `user. The number of messages is limited; conflicts and scope changes go to the coordinator with ${TOOL.report}.`, {
            executor: { type: 'string', description: `Required. Id of the other executor (from ${TOOL.peers} or your Assignment).` },
            text: { type: 'string', description: 'The message, self-contained and short.' },
            expects_reply: { type: 'boolean', description: `Ask the other Lead to answer with ${TOOL.send}.` },
        }, ['text'], (args, caller) => ops.sendPeer(caller, renamed(args, 'executor', 'thread', { max: 200 }), str(args, 'text', { max: 8000 }), args['expects_reply'] === true, randomUUID())),
    ];
}

/** How long an idle, unsettled member still counts as working: the runtime's settlement notice comes right after. */
export const SETTLE_GRACE_MS = 5000;
export function initialFacts(phase) {
    return { phase, running: false, approvals: {}, questions: {} };
}
export function persistedFacts(facts, now = Date.now()) {
    const { running: _running, approvals: _approvals, questions: _questions, members: _members, membersAtSave: _saved, ...rest } = facts;
    const working = workingMembers(facts, now).map(m => m.name);
    return working.length === 0 ? rest : { ...rest, membersAtSave: working };
}
// --- The lead's tree ------------------------------------------------------------------------------------------------
/** Members that still work: running, or idle for a moment while their settlement notice is on its way. */
export function workingMembers(facts, now) {
    return Object.values(facts.members ?? {}).filter(m => m.running || (!m.settled && m.idleSince !== undefined && now - m.idleSince < SETTLE_GRACE_MS));
}
/** The lead or any member of its tree works: the thread holds a slot and stays `running`. */
export function treeRunning(facts, now) {
    return facts.running || workingMembers(facts, now).length > 0;
}
/** Open approvals of the whole tree, the lead's first; each names the member that asked, if any. */
export function treeApprovals(facts) {
    const out = Object.entries(facts.approvals).map(([id, a]) => ({ id, ...a }));
    for (const [sessionId, m] of Object.entries(facts.members ?? {})) {
        for (const [id, a] of Object.entries(m.approvals))
            out.push({ id, ...a, member: m.name, sessionId });
    }
    return out;
}
/** Open user questions of the whole tree, the lead's first. */
export function treeQuestions(facts) {
    const out = Object.entries(facts.questions).map(([id, q]) => ({ id, ...q }));
    for (const [sessionId, m] of Object.entries(facts.members ?? {})) {
        for (const [id, q] of Object.entries(m.questions))
            out.push({ id, ...q, member: m.name, sessionId });
    }
    return out;
}
/** Whether anyone in the tree waits on the user (such a thread holds no slot). */
export function treeWaiting(facts) {
    return treeApprovals(facts).length > 0 || treeQuestions(facts).length > 0;
}
/** Names in a short list: `a, b and 2 more`. */
function names(list) {
    return list.length <= 3 ? list.join(', ') : `${list.slice(0, 3).join(', ')} and ${list.length - 3} more`;
}
/** Register a member the creator just started (`subagent/catalog` in the creator's log). */
export function addMember(facts, sessionId, name, label) {
    const existing = facts.members?.[sessionId];
    if (existing !== undefined && existing.name === name && existing.label === label)
        return facts;
    const member = existing === undefined
        ? { name, ...(label === undefined ? {} : { label }), running: false, settled: false, approvals: {}, questions: {} }
        : { ...existing, name, ...(label === undefined ? {} : { label }) };
    return { ...facts, members: { ...facts.members, [sessionId]: member } };
}
/** A member's agent started or stopped running (`agent/status` of its Session). */
export function memberRunning(facts, sessionId, running, now) {
    const m = facts.members?.[sessionId];
    if (m === undefined || (m.running === running && (running || m.idleSince !== undefined || m.settled)))
        return facts;
    const { idleSince: _idle, ...rest } = m;
    const next = running ? { ...rest, running: true, settled: false } : { ...rest, running: false, ...(m.settled ? {} : { idleSince: now }) };
    return { ...facts, members: { ...facts.members, [sessionId]: next } };
}
/** The runtime told the creator that a member settled (a `subagent-settled` message in the creator's log or inbox). */
export function memberSettled(facts, sessionId, stopReason) {
    const m = facts.members?.[sessionId];
    if (m === undefined || (m.settled && !m.running && m.stopReason === stopReason))
        return facts;
    const { idleSince: _idle, ...rest } = m;
    return { ...facts, members: { ...facts.members, [sessionId]: { ...rest, running: false, settled: true, ...(stopReason === undefined ? {} : { stopReason }) } } };
}
/** Fold one `session/event` of a member's own Session: its turns, approvals, questions and last text. */
export function applyMemberEvent(facts, sessionId, event, now) {
    const m = facts.members?.[sessionId];
    if (m === undefined)
        return facts;
    // A member's events reuse the lead's folding on a scratch fact set, so approvals and questions behave the same.
    const scratch = { phase: 'active', running: m.running, approvals: m.approvals, questions: m.questions, ...(m.lastText === undefined ? {} : { lastAssistantText: m.lastText }) };
    const after = applyEvent(scratch, event, now);
    if (after === scratch)
        return facts;
    let next = { ...m, approvals: after.approvals, questions: after.questions, ...(after.lastAssistantText === undefined ? {} : { lastText: after.lastAssistantText }) };
    if (event.type === 'turn/start') {
        const { idleSince: _idle, ...rest } = next;
        next = { ...rest, running: true, settled: false };
    }
    else if (event.type === 'turn/end') {
        next = { ...next, running: false, ...(next.settled ? {} : { idleSince: now }) };
    }
    return { ...facts, members: { ...facts.members, [sessionId]: next } };
}
const ASSISTANT_TEXT_MAX = 1200;
export function clip(text, max) {
    const flat = text.replace(/\s+/g, ' ').trim();
    return flat.length <= max ? flat : `${flat.slice(0, max - 1)}…`;
}
/**
 * First line of a report or message, for a one-line status detail. A very short first line ("Done.", "Result:")
 * says nothing on its own, so the next line is joined to it.
 */
export function headline(text, max = 140) {
    const lines = text.trim().split('\n').map(line => line.trim()).filter(line => line !== '');
    const first = lines[0] ?? '';
    const head = first.length < 24 && lines.length > 1 ? `${first} ${lines[1]}` : first;
    return clip(head, max);
}
const REPORT_LABEL = {
    progress: 'progress',
    question: 'asked the coordinator',
    result: 'result',
    blocked: 'blocked',
};
/** Derive the status from the facts. Waiting on the user wins over everything else. */
export function deriveStatus(facts, now = Date.now()) {
    const approval = treeApprovals(facts)[0];
    if (approval !== undefined) {
        const who = approval.member === undefined ? '' : `team member ${approval.member}: `;
        return { status: 'waiting-approval', detail: clip(`${who}approval for ${approval.toolName}${approval.reason ? `: ${approval.reason}` : ''}`, 200) };
    }
    const question = treeQuestions(facts)[0];
    if (question !== undefined) {
        const who = question.member === undefined ? '' : `team member ${question.member} asks: `;
        return { status: 'waiting-question', detail: clip(`${who}question: ${question.text}`, 200) };
    }
    if (facts.confirm !== undefined)
        return { status: 'needs-user', detail: clip(`confirm folder ${facts.confirm.path}`, 300) };
    if (facts.paused !== undefined) {
        return { status: 'needs-user', detail: facts.paused.reason === 'wakes' ? `paused after ${facts.paused.count} wake-ups` : facts.paused.reason === 'peers' ? `paused after ${facts.paused.count} peer messages` : `paused after ${facts.paused.count} turns today (daily budget)` };
    }
    if (facts.needsUser !== undefined)
        return { status: 'needs-user', detail: clip(facts.needsUser.reason, 200) };
    if (facts.phase === 'queued')
        return { status: 'starting', detail: 'queued: waiting for a free slot' };
    const turnStart = facts.lastTurnStartAt ?? 0;
    const report = facts.lastReport !== undefined && facts.lastReport.at >= turnStart ? facts.lastReport : undefined;
    const reportDetail = report === undefined ? undefined : `${REPORT_LABEL[report.kind]}: ${headline(report.text)}`;
    const working = workingMembers(facts, now).map(m => m.name);
    if (facts.running) {
        const team = working.length === 0 ? undefined : `${working.length === 1 ? '1 team member' : `${working.length} team members`} working: ${names(working)}`;
        const detail = reportDetail ?? team;
        return { status: 'running', ...(detail === undefined ? {} : { detail: clip(detail, 200) }) };
    }
    if (working.length > 0 && facts.phase === 'active') {
        // The lead ended its turn or waits for its members; the thread is busy until the whole tree is quiet.
        const team = `lead waits for ${working.length === 1 ? '1 team member' : `${working.length} team members`}: ${names(working)}`;
        return { status: 'running', detail: clip(reportDetail === undefined ? team : `${team}; ${reportDetail}`, 200) };
    }
    if (facts.phase === 'starting')
        return { status: 'starting' };
    const end = facts.lastTurnEnd;
    if (end !== undefined) {
        if (end.kind === 'error')
            return { status: 'failed', detail: clip(end.detail ?? 'the turn failed', 200) };
        if (end.kind === 'aborted' || end.kind === 'interrupted') {
            return { status: 'stopped', detail: end.detail ?? (end.kind === 'aborted' ? 'the turn was stopped' : 'the turn was interrupted') };
        }
    }
    if (report?.kind === 'result')
        return { status: 'done', detail: reportDetail };
    return { status: 'idle', ...(reportDetail === undefined ? {} : { detail: reportDetail }) };
}
const asData = (value) => (value !== null && typeof value === 'object' ? value : {});
/** Text of the first question of an ask_user_question call (its arguments are a JSON string). */
export function questionText(args) {
    let parsed = args;
    if (typeof args === 'string') {
        try {
            parsed = JSON.parse(args);
        }
        catch {
            return clip(args, 200);
        }
    }
    const questions = asData(parsed)['questions'];
    if (Array.isArray(questions) && questions.length > 0) {
        const first = asData(questions[0]);
        const text = typeof first['question'] === 'string' ? first['question'] : '';
        return clip(text + (questions.length > 1 ? ` (+${questions.length - 1} more)` : ''), 200);
    }
    return 'a question';
}
/** Concatenated text parts of a message content array. */
export function messageText(content) {
    if (typeof content === 'string')
        return content;
    if (!Array.isArray(content))
        return '';
    return content.map(part => {
        const p = asData(part);
        return p['type'] === 'text' && typeof p['text'] === 'string' ? p['text'] : '';
    }).filter(Boolean).join('\n');
}
/**
 * Fold one `session/event` of the thread lead's Session into the facts. Returns the same object when nothing
 * changed, so callers can skip work.
 */
export function applyEvent(facts, event, now) {
    const data = asData(event.data);
    switch (event.type) {
        case 'turn/start': {
            const { needsUser: _flag, stopRequestedAt: _stop, ...rest } = facts;
            return { ...rest, phase: 'active', running: true, lastTurnStartAt: now };
        }
        case 'turn/end': {
            const reason = asData(data['reason']);
            const kind = typeof reason['kind'] === 'string' ? reason['kind'] : 'completed';
            const error = asData(reason['error']);
            const detail = kind === 'error' ? (typeof error['message'] === 'string' ? error['message'] : 'the turn failed') : undefined;
            return { ...facts, phase: 'active', running: false, approvals: {}, questions: {},
                lastTurnEnd: { kind, at: now, ...(detail === undefined ? {} : { detail }) } };
        }
        case 'approval/asked': {
            const id = String(data['id'] ?? '');
            if (id === '')
                return facts;
            const reason = typeof data['reason'] === 'string' ? data['reason'] : undefined;
            return { ...facts, approvals: { ...facts.approvals, [id]: { toolName: String(data['toolName'] ?? 'a tool'), ...(reason === undefined ? {} : { reason }) } } };
        }
        case 'approval/decided': {
            const id = String(data['id'] ?? '');
            if (!(id in facts.approvals))
                return facts;
            const { [id]: _decided, ...approvals } = facts.approvals;
            return { ...facts, approvals };
        }
        case 'tool/call': {
            if (data['name'] !== 'ask_user_question')
                return facts;
            const callId = String(data['callId'] ?? '');
            if (callId === '')
                return facts;
            return { ...facts, questions: { ...facts.questions, [callId]: { text: questionText(data['arguments']) } } };
        }
        case 'tool/result': {
            const message = asData(data['message']);
            const callId = String(message['toolCallId'] ?? asData(message['source'])['callId'] ?? '');
            if (!(callId in facts.questions))
                return facts;
            const { [callId]: _answered, ...questions } = facts.questions;
            return { ...facts, questions };
        }
        case 'user/message': {
            // The user typed into the thread: a coordinator flag for the user is settled.
            if (asData(data['source'])['kind'] !== 'user' || facts.needsUser === undefined)
                return facts;
            const { needsUser: _flag, ...rest } = facts;
            return rest;
        }
        case 'assistant/message': {
            const text = messageText(asData(data['message'])['content']);
            if (text.trim() === '')
                return facts;
            return { ...facts, lastAssistantText: clip(text, ASSISTANT_TEXT_MAX) };
        }
        default:
            return facts;
    }
}
/**
 * Facts when the plugin loads its saved table. Live facts start empty; `foldTurn` fills them from the log afterwards.
 * @param live - the thread lead's agent status when it is already loaded (a plugin reload while the app runs), else
 *   undefined (an app start: dsh ended every open turn).
 * @param queued - the brief was never delivered; the thread is submitted again rather than marked stopped.
 */
export function restoredFacts(saved, live, queued, now = Date.now()) {
    const facts = { ...saved, running: live === 'running', approvals: {}, questions: {} };
    if (queued)
        return { ...facts, phase: 'queued' };
    if (live === 'running')
        return { ...facts, phase: 'active' };
    if (facts.phase === 'queued' || facts.phase === 'starting')
        return facts;
    // Members do not survive an app restart: a thread whose team still worked is stopped, even if the lead was idle.
    if (live === undefined && (facts.membersAtSave?.length ?? 0) > 0)
        return { ...facts, lastTurnEnd: teamCutEnd(facts.membersAtSave, now) };
    const end = facts.lastTurnEnd;
    const startedAfterEnd = facts.lastTurnStartAt !== undefined && (end === undefined || end.at < facts.lastTurnStartAt);
    // Corrected by foldTurn when the log shows how the turn really ended.
    if (startedAfterEnd)
        return { ...facts, lastTurnEnd: { kind: 'interrupted', at: now, detail: 'stopped when the app quit' } };
    return facts;
}
/**
 * Re-derive turn facts from the thread lead's log: fold every event from the last `turn/start` on, so open
 * approvals and questions, a turn that ended while the plugin was not loaded, and the last assistant text are right.
 * @param running - whether the agent runs now (the log alone cannot tell a live turn from one cut off by a quit).
 */
export function foldTurn(facts, events, running, now = Date.now()) {
    // The last turn that did something: a closed turn without a model step (the coordinator's opening turn, a turn
    // the stop gate absorbed) changes nothing.
    let start = -1;
    let end = events.length;
    for (let i = events.length - 1; i >= 0; i--) {
        if (events[i].type !== 'turn/start')
            continue;
        const turn = events.slice(i, end);
        const idle = turn.every(e => e.type === 'turn/start' || e.type === 'turn/end' || e.type === 'agent/inbox/spliced');
        if (!idle || !turn.some(e => e.type === 'turn/end')) {
            start = i;
            break;
        }
        end = i;
    }
    if (start < 0)
        return { ...facts, running };
    let next = { ...facts, approvals: {}, questions: {} };
    const { needsUser } = facts;
    for (const event of events.slice(start, end))
        next = applyEvent(next, event, event.time ?? now);
    // A stop the coordinator asked for after that turn ended (the lead only waited for its team) stays a stop.
    if (facts.stopRequestedAt !== undefined && facts.lastTurnEnd?.kind === 'aborted' && next.lastTurnEnd !== undefined
        && facts.lastTurnEnd.at >= next.lastTurnEnd.at)
        next = { ...next, lastTurnEnd: facts.lastTurnEnd, stopRequestedAt: facts.stopRequestedAt };
    // A turn/start would clear a flag the coordinator set after that turn began.
    if (needsUser !== undefined && (next.lastTurnStartAt ?? 0) <= needsUser.at)
        next = { ...next, needsUser };
    const ended = events.slice(start, end).some(event => event.type === 'turn/end');
    if (!ended && !running) {
        next = { ...next, approvals: {}, questions: {}, lastTurnEnd: { kind: 'interrupted', at: now, detail: 'stopped when the app quit' } };
    }
    // The lead's turn may have ended normally while its members still worked when the app quit.
    if (!running && (facts.membersAtSave?.length ?? 0) > 0 && next.lastTurnEnd?.kind !== 'error') {
        next = { ...next, lastTurnEnd: teamCutEnd(facts.membersAtSave, now) };
    }
    return { ...next, running };
}
function teamCutEnd(members, now) {
    return { kind: 'interrupted', at: now, detail: clip(`stopped when the app quit; team members were still working (${names(members)})`, 200) };
}

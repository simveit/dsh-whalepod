import { capLength, fence, pathText, UNTRUSTED_HEADER } from "./fence.js";
const TITLE_MAX = 80;
const DETAIL_MAX = 300;
const REPORT_MAX = 2000;
const LAST_TEXT_MAX = 1200;
/** Trusted part of a thread row. */
function trustedRow(thread) {
    return {
        id: thread.id, status: thread.status, cwd: pathText(thread.cwd),
        createdAt: new Date(thread.createdAt).toISOString(), updatedAt: new Date(thread.updatedAt).toISOString(),
    };
}
/** Untrusted part of a thread row: its title, status detail and last report. */
function threadFence(thread) {
    return fence(thread.id, [
        { name: 'title', value: thread.title, max: TITLE_MAX },
        { name: 'status detail', value: thread.statusDetail ?? '', max: DETAIL_MAX },
        { name: thread.lastReport === undefined ? 'last report' : `last report (${thread.lastReport.kind})`, value: thread.lastReport?.text ?? '', max: REPORT_MAX },
    ]);
}
/**
 * One row as `executor_start`, `executor_flag_user` and `executor_stop` return it (S3): the trusted fields, the
 * plugin's own extras (notes, whether it stopped, the user's action on the row), and the title, status detail and last
 * Report in a data block.
 */
export function threadRowView(thread, extra = {}) {
    const block = threadFence(thread);
    return {
        ...trustedRow(thread),
        sessionId: thread.sessionId,
        coordinatorId: thread.coordinatorId,
        ...(thread.permission === undefined ? {} : { permission: thread.permission }),
        ...(thread.action === undefined ? {} : { action: thread.action.kind === 'confirm-folder' ? { ...thread.action, path: pathText(thread.action.path) } : thread.action }),
        ...extra,
        ...(block === '' ? {} : { untrusted: `${UNTRUSTED_HEADER}\n\n${block}` }),
    };
}
/** `executor_list`: statuses outside, titles and reports inside one data block per thread. */
export function threadListView(threads) {
    if (threads.length === 0)
        return { threads: [] };
    return {
        threads: threads.map(trustedRow),
        untrusted: [UNTRUSTED_HEADER, ...threads.map(threadFence)].join('\n\n'),
    };
}
/**
 * `executor_peers`: what one thread may know about its siblings (M4): id, status and folder, and the title in a data
 * block. No reports, status details or question texts, which may carry another thread's private data.
 */
export function threadPeersView(threads) {
    if (threads.length === 0)
        return { threads: [] };
    return {
        threads: threads.map(thread => ({ id: thread.id, status: thread.status, cwd: pathText(thread.cwd) })),
        untrusted: [UNTRUSTED_HEADER, ...threads.map(thread => fence(thread.id, [{ name: 'title', value: thread.title, max: TITLE_MAX }]))].join('\n\n'),
    };
}
const TEAM_MAX = 1200;
/** `executor_read` summary: trusted status facts plus a data block with everything the thread wrote. */
export function threadSummaryView(thread, facts) {
    const block = fence(thread.id, [
        { name: 'title', value: thread.title, max: TITLE_MAX },
        { name: 'status detail', value: thread.statusDetail ?? '', max: DETAIL_MAX },
        { name: thread.lastReport === undefined ? 'last report' : `last report (${thread.lastReport.kind})`, value: thread.lastReport?.text ?? '', max: REPORT_MAX },
        ...facts.approvals.map(a => ({ name: `pending approval for ${a.toolName.replace(/[^\w.-]/g, '')}${a.member === undefined ? '' : ` (teammate ${a.member.replace(/[^\w/-]/g, '').slice(0, 40)})`}`, value: a.reason ?? '(no reason given)', max: DETAIL_MAX })),
        ...facts.questions.map(q => ({ name: 'pending question to the user', value: q, max: DETAIL_MAX })),
        { name: 'last message of the lead', value: facts.lastAssistantText ?? '', max: LAST_TEXT_MAX },
        ...(facts.team === undefined || facts.team.length === 0 ? [] : [{
                name: 'teammates (name: state, task)', value: facts.team.map(m => `${m.name}: ${m.state}${m.label === undefined ? '' : `, ${m.label}`}`).join('\n'), max: TEAM_MAX,
            }]),
    ]);
    const team = facts.team === undefined || facts.team.length === 0 ? undefined
        : { members: facts.team.length, working: facts.team.filter(m => m.state === 'working').length };
    return {
        ...trustedRow(thread),
        ...(team === undefined ? {} : { team }),
        pendingInput: facts.pendingInput,
        pendingApprovals: facts.approvals.length,
        pendingQuestions: facts.questions.length,
        ...(facts.briefNotYetDelivered ? { briefNotYetDelivered: true } : {}),
        untrusted: `${UNTRUSTED_HEADER}\n\n${block}`,
    };
}
/**
 * History lines in one data block, capped in total. Lines are already rendered (`[seq] role: text`); the cap keeps
 * whole lines from the end (recent) or from the start (pages).
 * @param keep - which end to keep when the lines exceed `maxChars`.
 */
export function historyBlock(threadId, lines, maxChars, keep) {
    const kept = [];
    let used = 0;
    const ordered = keep === 'end' ? [...lines].reverse() : [...lines];
    for (const line of ordered) {
        if (kept.length > 0 && used + line.length + 1 > maxChars)
            break;
        const capped = capLength(line, maxChars);
        kept.push(capped);
        used += capped.length + 1;
    }
    if (keep === 'end')
        kept.reverse();
    const block = fence(threadId, [{ name: 'history', value: `\n${kept.join('\n')}`, max: maxChars + 200 }]);
    return { text: block, omitted: lines.length - kept.length };
}
/**
 * Render a tool value for the model: JSON of the trusted fields, then the untrusted text as is.
 * @param value - the tool value.
 */
export function renderView(value) {
    if (value === null || typeof value !== 'object' || Array.isArray(value))
        return JSON.stringify(value, null, 2);
    const { untrusted, ...rest } = value;
    const json = JSON.stringify(rest, null, 2);
    return typeof untrusted === 'string' && untrusted !== '' ? `${json}\n\n${untrusted}` : json;
}

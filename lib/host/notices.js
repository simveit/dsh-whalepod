import { clip } from "./status.js";
import { fence, inlineUntrusted, UNTRUSTED_HEADER } from "./fence.js";
import { TOOL } from "./names.js";
export const realTimers = {
    now: () => Date.now(),
    set: (fn, ms) => setTimeout(fn, ms),
    clear: handle => clearTimeout(handle),
};
export class NoticeBatcher {
    pending = [];
    firstAt = 0;
    timer;
    timers;
    options;
    constructor(options) {
        this.options = options;
        this.timers = options.timers ?? realTimers;
    }
    get size() { return this.pending.length; }
    add(notice) {
        const now = this.timers.now();
        if (this.pending.length === 0)
            this.firstAt = now;
        this.pending.push({ notice, addedAt: now });
        this.schedule();
    }
    /** Re-check held notices soon, for example when a thread's turn ended without a status notice. */
    kick() {
        if (this.pending.length > 0)
            this.schedule();
    }
    schedule() {
        if (this.timer !== undefined)
            this.timers.clear(this.timer);
        const elapsed = this.timers.now() - this.firstAt;
        const wait = Math.max(0, Math.min(this.options.debounceMs, this.options.maxDelayMs - elapsed));
        this.timer = this.timers.set(() => this.flushNow(), wait);
    }
    /** Deliver what is pending now, except held notices of threads that are still in their turn. */
    flushNow() {
        if (this.timer !== undefined)
            this.timers.clear(this.timer);
        this.timer = undefined;
        if (this.pending.length === 0)
            return;
        const now = this.timers.now();
        const withStatus = new Set(this.pending.filter(p => p.notice.status !== undefined).map(p => p.notice.threadId));
        const waits = (p) => p.notice.hold === true
            && !withStatus.has(p.notice.threadId) && this.options.running?.(p.notice.threadId) === true
            && now - p.addedAt < Math.max(this.options.maxDelayMs, this.options.holdMs?.(p.notice.threadId) ?? 0);
        const ready = this.pending.filter(p => !waits(p) && this.options.stale?.(p.notice) !== true);
        const held = this.pending.filter(waits);
        this.pending = held;
        if (held.length > 0) {
            // Re-check held notices every debounce period until their thread is quiet or their limit is reached.
            this.firstAt = now;
            this.schedule();
        }
        if (ready.length > 0)
            this.options.flush(ready.map(p => p.notice));
    }
    /** Drop pending notices and timers (on unload). */
    dispose() {
        if (this.timer !== undefined)
            this.timers.clear(this.timer);
        this.timer = undefined;
        this.pending = [];
    }
}
const STATUS_TEXT = {
    'idle': 'finished its turn and is idle',
    'done': 'finished its turn after reporting a result',
    'failed': 'failed',
    'stopped': 'stopped',
    'waiting-approval': 'is waiting for the USER to approve an action',
    'waiting-question': 'is waiting for the USER to answer a question it asked in the Executor Session',
    'needs-user': 'is flagged for the user',
    'running': 'is running',
    'starting': 'is starting',
};
const REPORT_TEXT = {
    progress: 'progress',
    question: 'question for the coordinator',
    result: 'result',
    blocked: 'blocked',
};
/** Group a batch per thread, in first-seen order. */
function byThread(batch) {
    const groups = new Map();
    for (const notice of batch) {
        const group = groups.get(notice.threadId);
        if (group === undefined)
            groups.set(notice.threadId, [notice]);
        else
            group.push(notice);
    }
    return [...groups.values()];
}
/** Caps for untrusted values in a notice. */
const REPORT_MAX = 2000;
const LAST_TEXT_MAX = 600;
const DETAIL_MAX = 300;
const TITLE_MAX = 80;
const TEAM_MAX = 400;
/**
 * The text block for one thread: a trusted line with the thread id and its latest status, then everything the
 * thread wrote (title, reports, waiting detail, last message) inside one data block.
 */
function threadBlock(notices) {
    const { threadId, title } = notices.at(-1);
    const lines = [];
    const last = notices.findLast(n => n.status !== undefined);
    const reports = notices.filter(n => n.report !== undefined).map(n => n.report);
    const head = `Executor Session ${threadId}`;
    if (last?.status !== undefined) {
        lines.push(`${head}: status ${last.status}: ${STATUS_TEXT[last.status] ?? last.status}.`);
        if (last.member !== undefined)
            lines.push(`A Teammate of this Executor Session asked (${last.member.replace(/[^\w/-]/g, '').slice(0, 40)}), not the Lead; the card is in that Teammate's view of the Executor Session.`);
        if (last.status === 'waiting-approval') {
            lines.push('Only the user can approve or reject this. Tell the user which Executor Session waits and why; they must open it and use its approval card. Never approve anything yourself.');
        }
        else if (last.status === 'waiting-question') {
            lines.push('This question is addressed to the user inside the Executor Session. Tell the user; they answer it there.');
        }
    }
    else if (reports.length === 0 && notices.some(n => n.peer !== undefined)) {
        lines.push(`${head}: messaged ${[...new Set(notices.flatMap(n => (n.peer === undefined ? [] : [n.peer.to])))].join(', ')} (for your information; the Executor Sessions coordinate directly).`);
    }
    else if (reports.length > 0) {
        lines.push(`${head}: ${reports.length === 1 ? 'one report' : `${reports.length} reports`}.`);
    }
    else {
        lines.push(`${head}:`);
    }
    for (const n of notices)
        if (n.alert !== undefined)
            lines.push(n.alert);
    const fields = [{ name: 'title', value: title, max: TITLE_MAX }];
    for (const report of reports)
        fields.push({ name: `report (${REPORT_TEXT[report.kind]})`, value: report.text, max: REPORT_MAX });
    // For a finished or running turn the detail only repeats the last report.
    if (last?.detail !== undefined && last.status !== 'idle' && last.status !== 'done' && last.status !== 'running') {
        fields.push({ name: 'status detail', value: last.detail, max: DETAIL_MAX });
    }
    for (const n of notices)
        if (n.peer !== undefined)
            fields.push({ name: `message to ${n.peer.to.replace(/[^\w-]/g, '')}`, value: n.peer.text, max: 300 });
    if ((last?.status === 'idle' || last?.status === 'done') && last.lastText !== undefined) {
        fields.push({ name: 'last message of the lead', value: last.lastText, max: LAST_TEXT_MAX });
    }
    const team = notices.findLast(n => n.team !== undefined)?.team;
    if (team !== undefined && team.length > 0) {
        fields.push({ name: 'teammates', value: team.map(m => `${m.name}: ${m.state}${m.label === undefined ? '' : ` (${m.label})`}`).join('; '), max: TEAM_MAX });
    }
    lines.push(fence(threadId, fields));
    return lines.join('\n');
}
const WAKE_ACTION = `Act on it if needed (answer questions you can answer from what the user told you with ${TOOL.message}, flag the rest with ${TOOL.flagUser}), then tell the user what changed and which Executor Session waits on what.`;
const WAKE_HEADER = `[dsh-coordinator notice] Executor Session updates. ${WAKE_ACTION}`;
const QUIET_HEADER = '[dsh-coordinator notice] Executor Session progress, for your information. No action needed.';
/** Upper bound of a notice summary, as dsh bounds `notice` summaries (dsh-llm CONTEXT_SUMMARY_MAX_CHARS). */
export const SUMMARY_MAX_CHARS = 120;
/**
 * The one-line account of one thread's notices that the chat shows on the collapsed row, e.g.
 * `Thread "Fix the build" reported a result`. The most pressing fact wins.
 */
export function threadSummary(notices) {
    const title = inlineUntrusted(notices.at(-1).title, 60);
    return clip(`Executor Session "${title}" ${threadWhat(notices)}`, SUMMARY_MAX_CHARS);
}
/** What happened to a thread, most pressing fact first, e.g. `reported a result`. Contains no thread text. */
export function threadWhat(notices) {
    const status = notices.findLast(n => n.status !== undefined)?.status;
    const reports = new Set(notices.flatMap(n => (n.report === undefined ? [] : [n.report.kind])));
    let what;
    if (notices.some(n => n.alert !== undefined) && status === undefined && reports.size === 0)
        what = 'needs your attention';
    else if (status === 'waiting-approval')
        what = 'waits for your approval';
    else if (status === 'waiting-question')
        what = 'has a question for you';
    else if (reports.has('question'))
        what = 'asks the coordinator a question';
    else if (reports.has('blocked'))
        what = 'is blocked';
    else if (status === 'failed')
        what = 'failed';
    else if (reports.has('result'))
        what = 'reported a result';
    else if (status === 'stopped')
        what = 'stopped';
    else if (status === 'needs-user')
        what = 'needs you';
    else if (status === 'idle' || status === 'done')
        what = 'finished its turn';
    else if (reports.has('progress'))
        what = 'reported progress';
    else if (notices.some(n => n.peer !== undefined))
        what = 'messaged another Executor Session';
    else
        what = 'changed';
    return what;
}
/** Word a waking batch as one message per thread (each names its thread in the chat). */
export function noticeMessages(batch) {
    return byThread(batch).map(notices => ({
        threadId: notices[0].threadId,
        // The summary leads, so the chat's expanded notice starts with what happened.
        text: `[dsh-coordinator notice] Executor Session ${notices[0].threadId} ${threadWhat(notices)}. ${WAKE_ACTION}\n\n${UNTRUSTED_HEADER}\n\n${threadBlock(notices)}`,
        summary: threadSummary(notices),
    }));
}
/** Word a batch as one coordinator message. Notices are grouped per thread; only a thread's latest status is kept. */
export function formatNotices(batch) {
    const wake = batch.some(n => n.wake);
    const groups = byThread(batch);
    const summary = clip(groups.map(threadSummary).join('; '), SUMMARY_MAX_CHARS);
    return { text: `${wake ? WAKE_HEADER : QUIET_HEADER}\n\n${UNTRUSTED_HEADER}\n\n${groups.map(threadBlock).join('\n\n')}`, wake, summary };
}

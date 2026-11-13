/**
 * Persistence of the coordinators and the thread table.
 *
 * Choice: one small JSON file, `<DSH_HOME>/storages/dsh-coordinator/state.json`, written atomically (temp file plus
 * rename). Reasons: the table is tiny and always written whole; JSON keeps it readable and easy to repair by hand;
 * it lives under the same DSH_HOME as the sessions it points to, so separate homes stay separate; and it needs no
 * runtime dependency on dsh's storage-domain API (schemastery schemas, still marked "proposed" upstream), which a
 * linked third-party plugin cannot import reliably. dsh's own `storage-json` backend writes to the same
 * `storages/` root.
 *
 * Version 2 holds several coordinators. A version 1 file (one coordinator Session id) is upgraded in memory on load,
 * and copied once to `state.v1.json` next to it before the first version 2 write, so the original is never lost.
 */
import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, sep } from 'node:path';
import { ARCHIVED_COORDINATORS_KEEP, checkCoordinatorName, cleanExecutorPrompt, COORDINATOR_TITLE, EXECUTOR_PROMPT_MAX, isCoordinatorId, newCoordinatorId } from "./ids.js";
export const STATE_VERSION = 2;
export function emptyState() {
    return { version: 2, revision: 0, coordinators: [], coordinatorWorkspaces: [], threads: [] };
}
/** The file was written by a newer plugin version; it is neither read nor overwritten. */
export class NewerStateError extends Error {
}
const isPath = (value) => typeof value === 'string' && value.startsWith('/') && !value.includes('\0') && value.length < 4096;
const isNumber = (value) => typeof value === 'number' && Number.isFinite(value);
/**
 * Parse a stored state, dropping malformed rows instead of failing the whole table. A version 1 file is upgraded:
 * its coordinator becomes one record (home and folder the legacy threads root), every thread row gets that
 * coordinator, and rows strictly below the old root are marked as plugin-made folders.
 */
export function parseState(text, upgrade = {}) {
    const raw = JSON.parse(text);
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw))
        throw new Error('the state file is not a JSON object');
    const version = raw['version'];
    if (typeof version === 'number' && version > STATE_VERSION)
        throw new NewerStateError(`state file version ${version} is newer than this plugin (${STATE_VERSION})`);
    if (version === 1)
        return upgradeV1(raw, upgrade);
    if (version !== STATE_VERSION)
        throw new Error('unsupported state file version');
    const coordinators = [];
    const ids = new Set();
    for (const value of Array.isArray(raw['coordinators']) ? raw['coordinators'] : []) {
        const record = coordinatorOf(value);
        if (record === undefined || ids.has(record.id))
            continue;
        ids.add(record.id);
        coordinators.push(record);
    }
    const workspaces = [];
    for (const value of Array.isArray(raw['coordinatorWorkspaces']) ? raw['coordinatorWorkspaces'] : []) {
        const entry = (value ?? {});
        if (typeof entry.id !== 'string' || !isPath(entry.path) || workspaces.some(w => w.path === entry.path))
            continue;
        workspaces.push({ id: entry.id, path: entry.path, own: entry.own === true });
    }
    const threads = (Array.isArray(raw['threads']) ? raw['threads'] : []).filter(isThread).map((row) => {
        const owner = row.info.coordinatorId;
        const { executorPrompt: rawPrompt, ...rest } = row;
        const prompt = storedPrompt(rawPrompt);
        return { ...rest, info: { ...row.info, coordinatorId: typeof owner === 'string' ? owner : '' }, ...(prompt === undefined ? {} : { executorPrompt: prompt }) };
    });
    const last = raw['lastCoordinatorId'];
    return {
        version: 2,
        revision: isNumber(raw['revision']) ? raw['revision'] : 0,
        coordinators: coordinators.slice(0, 200),
        coordinatorWorkspaces: workspaces.slice(0, 200),
        threads,
        ...common(raw),
        ...(typeof last === 'string' && ids.has(last) ? { lastCoordinatorId: last } : {}),
        ...(raw['workspacesMigrated'] === true ? { workspacesMigrated: true } : {}),
        ...(isNumber(raw['degradedSince']) ? { degradedSince: raw['degradedSince'] } : {}),
        ...(raw['executorGroups'] === true ? { executorGroups: true } : {}),
    };
}
function coordinatorOf(value) {
    if (value === null || typeof value !== 'object')
        return undefined;
    const c = value;
    if (!isCoordinatorId(c.id) || !isPath(c.home) || !isPath(c.folder))
        return undefined;
    if (c.sessionId !== null && typeof c.sessionId !== 'string')
        return undefined;
    return {
        id: c.id,
        sessionId: c.sessionId === '' ? null : c.sessionId,
        home: c.home,
        folder: c.folder,
        ...(typeof c.workspaceId === 'string' ? { workspaceId: c.workspaceId } : {}),
        ...(typeof c.title === 'string' ? { title: c.title.slice(0, 200) } : {}),
        ...(() => { const checked = checkCoordinatorName(c.name); return 'name' in checked ? { name: checked.name } : {}; })(),
        ...(() => { const prompt = storedPrompt(c.executorPrompt); return prompt === undefined ? {} : { executorPrompt: prompt }; })(),
        ...(c.marks === 'opening' || c.marks === 'role' ? { marks: c.marks } : {}),
        ...(Array.isArray(c.pastSessionIds) ? { pastSessionIds: c.pastSessionIds.filter((s) => typeof s === 'string').slice(-10) } : {}),
        createdAt: isNumber(c.createdAt) ? c.createdAt : 0,
        updatedAt: isNumber(c.updatedAt) ? c.updatedAt : 0,
        ...(c.archived === true ? { archived: true } : {}),
        ...(c.migratedV1 === true ? { migratedV1: true } : {}),
    };
}
/** A stored Executor prompt, cleaned and within the cap (S6: treated like every other stored field), or undefined. */
export function storedPrompt(value) {
    if (typeof value !== 'string')
        return undefined;
    const clean = cleanExecutorPrompt(value);
    return clean === '' || clean.length > EXECUTOR_PROMPT_MAX ? undefined : clean;
}
/** The fields version 1 and 2 share. */
function common(raw) {
    const permission = raw['threadPermission'];
    const allowed = raw['allowedFolders'];
    return {
        ...(permission === 'auto' || permission === 'ask' ? { threadPermission: permission } : {}),
        ...(Array.isArray(allowed) ? { allowedFolders: allowed.filter(isPath).slice(0, 200) } : {}),
    };
}
/** Design 2.4: a version 1 file becomes one coordinator that owns every thread row, archived ones included. */
function upgradeV1(raw, upgrade) {
    const now = (upgrade.now ?? Date.now)();
    const rows = (Array.isArray(raw['threads']) ? raw['threads'] : []).filter(isThread);
    const sessionId = typeof raw['coordinatorSessionId'] === 'string' && raw['coordinatorSessionId'] !== '' ? raw['coordinatorSessionId'] : null;
    const root = upgrade.threadsRoot;
    const base = { version: 2, revision: isNumber(raw['revision']) ? raw['revision'] : 0, coordinators: [], coordinatorWorkspaces: [], threads: [], ...common(raw) };
    if ((sessionId === null && rows.length === 0) || root === undefined) {
        // Nothing to own (or no legacy root to place it): the rows keep no owner and show "Without coordinator".
        return { ...base, threads: rows.map(row => ({ ...row, info: { ...row.info, coordinatorId: '' } })) };
    }
    const id = (upgrade.newId ?? newCoordinatorId)(new Set());
    const below = (cwd) => cwd !== root && cwd.startsWith(root.endsWith(sep) ? root : root + sep);
    return {
        ...base,
        // Home and folder start at the old root, where a chat of that release lives; after validation the service moves the
        // folder (and, without a chat, the home) to a new plugin folder under the base, like a New coordinator's.
        coordinators: [{ id, sessionId, home: root, folder: root, title: COORDINATOR_TITLE, marks: 'opening', createdAt: now, updatedAt: now, migratedV1: true }],
        coordinatorWorkspaces: [{ id: '', path: root, own: true }],
        threads: rows.map(row => ({
            ...row,
            info: { ...row.info, coordinatorId: id },
            ...(row.ownFolder === true || below(row.info.cwd) ? { ownFolder: true } : {}),
        })),
        lastCoordinatorId: id,
    };
}
function isThread(value) {
    if (value === null || typeof value !== 'object')
        return false;
    const row = value;
    const info = row.info;
    return info !== undefined && info !== null && typeof info.id === 'string' && typeof info.sessionId === 'string'
        && typeof info.title === 'string' && typeof info.cwd === 'string' && row.facts !== undefined && row.facts !== null && typeof row.facts === 'object';
}
/** Most archived rows kept in the file; older ones are dropped (their sessions and folders stay). */
export const ARCHIVED_KEEP = 100;
/** Drop the oldest archived rows beyond `ARCHIVED_KEEP`. */
export function pruneArchived(threads) {
    const archived = threads.filter(t => t.archived === true).sort((a, b) => b.info.updatedAt - a.info.updatedAt);
    const drop = new Set(archived.slice(ARCHIVED_KEEP).map(t => t.info.id));
    return threads.filter(t => !drop.has(t.info.id));
}
/** Drop the oldest archived coordinators beyond `ARCHIVED_COORDINATORS_KEEP`, never one that still owns a live thread. */
export function pruneCoordinators(coordinators, threads) {
    const owning = new Set(threads.filter(t => t.archived !== true).map(t => t.info.coordinatorId));
    const archived = coordinators.filter(c => c.archived === true && !owning.has(c.id)).sort((a, b) => b.updatedAt - a.updatedAt);
    const drop = new Set(archived.slice(ARCHIVED_COORDINATORS_KEEP).map(c => c.id));
    return coordinators.filter(c => !drop.has(c.id));
}
export class JsonStore {
    file;
    /** Set when the file belongs to a newer plugin version: `save` then refuses. */
    readOnly = false;
    now;
    upgrade;
    /** The version 1 text read on load, copied to `state.v1.json` before the first version 2 write. */
    v1Text;
    constructor(file, now = Date.now, upgrade = {}) {
        this.file = file;
        this.now = now;
        this.upgrade = { now, ...upgrade };
    }
    /** Where the version 1 file is kept after an upgrade. */
    get v1File() {
        return join(dirname(this.file), 'state.v1.json');
    }
    /**
     * Read the state. A missing file is an empty table. A file that is not valid JSON or has an unknown old version
     * is moved aside (`state.json.corrupt-<time>`) and the table starts empty. A file from a newer version is left
     * untouched and the store becomes read-only, so a downgrade never overwrites it. A version 1 file is upgraded.
     */
    load() {
        let text;
        try {
            text = readFileSync(this.file, 'utf8');
        }
        catch (error) {
            if (error.code === 'ENOENT')
                return { state: emptyState(), readOnly: false };
            throw error;
        }
        try {
            const state = parseState(text, this.upgrade);
            const upgraded = JSON.parse(text).version === 1;
            this.v1Text = upgraded ? text : undefined;
            return { state, readOnly: false, ...(upgraded ? { upgraded: true } : {}) };
        }
        catch (error) {
            if (error instanceof NewerStateError) {
                this.readOnly = true;
                return { state: emptyState(), readOnly: true, problem: `${error.message}; the plugin runs without saving and leaves the file alone. Chats that carry the plugin's marks stay narrowed` };
            }
            const aside = `${this.file}.corrupt-${new Date(this.now()).toISOString().replace(/[:.]/g, '-')}`;
            renameSync(this.file, aside);
            return { state: emptyState(), readOnly: false, problem: `the state file could not be read (${String(error)}); it was moved to ${aside} and the coordinator starts without saved coordinators or Executor Sessions. Chats that carry the plugin's marks stay narrowed until you set them up again` };
        }
    }
    /**
     * Write the state atomically: a temporary file with a random name (not derived from the pid, so nothing can block
     * it in advance by creating that name), then a rename. Throws when the write fails; the service shows that as a
     * host problem. The first write after a version 1 load first copies that file to `state.v1.json` (mode 0600,
     * never overwritten); when the copy fails, nothing is written.
     */
    save(state) {
        if (this.readOnly)
            throw new Error('the state file belongs to a newer plugin version; not saving');
        mkdirSync(dirname(this.file), { recursive: true, mode: 0o700 });
        if (this.v1Text !== undefined) {
            try {
                writeFileSync(this.v1File, this.v1Text, { mode: 0o600, flag: 'wx' });
            }
            catch (error) {
                // An earlier copy is kept as it is: never overwritten.
                if (error.code !== 'EEXIST')
                    throw new Error(`could not keep a copy of the version 1 state file (${String(error)}); not upgrading it`);
            }
            this.v1Text = undefined;
        }
        const temp = `${this.file}.${randomBytes(8).toString('hex')}.tmp`;
        try {
            writeFileSync(temp, JSON.stringify(state, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
            renameSync(temp, this.file);
        }
        catch (error) {
            try {
                rmSync(temp, { force: true });
            }
            catch { /* nothing to clean up */ }
            throw error;
        }
    }
}

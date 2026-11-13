/**
 * Single-owner lock on the plugin's state directory, so two dsh processes on one DSH_HOME (for example the desktop
 * app and `dsh web`) do not both drive threads and overwrite each other's state file.
 *
 * The lock file holds the owner's pid and process start time. A lock is honoured only while a DeepSeek Harness
 * process with that pid runs and started at the recorded time; a dead pid, a reused pid, a start time that cannot be
 * read, or a process that is not dsh makes it stale, so a forged lock file cannot keep the plugin disabled. A stale
 * lock is moved aside under a random name before it is removed, so two processes replacing it at once cannot remove
 * each other's fresh lock. A process that finds a live lock of another process runs disabled: it registers no tools,
 * starts nothing, and the panel says why and how to recover.
 */
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { closeSync, linkSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeSync } from 'node:fs';
import { dirname } from 'node:path';
/** How far a recorded start time may differ from the observed one and still be the same process. */
const START_TOLERANCE_MS = 5000;
function readOwner(file) {
    try {
        const raw = JSON.parse(readFileSync(file, 'utf8'));
        if (typeof raw.pid === 'number' && Number.isSafeInteger(raw.pid) && raw.pid > 0 && typeof raw.startedAt === 'number')
            return { pid: raw.pid, startedAt: raw.startedAt };
    }
    catch {
        // Missing or unreadable: treated as stale.
    }
    return undefined;
}
/** Whether the recorded owner still holds the lock: a dsh process with that pid, started at the recorded time. */
export function ownerLive(owner, deps) {
    if (!deps.alive(owner.pid))
        return false;
    if (deps.isDsh !== undefined && deps.isDsh(owner.pid) === false)
        return false;
    const started = deps.startTimeOf(owner.pid);
    return started !== undefined && Math.abs(started - owner.startedAt) <= START_TOLERANCE_MS;
}
/**
 * Remove a stale lock without racing another process that replaces it at the same moment: move it aside under a
 * random name, and put it back if what was moved is no longer the stale owner that was judged.
 */
function removeStale(file, stale) {
    const aside = `${file}.${randomBytes(6).toString('hex')}.stale`;
    try {
        renameSync(file, aside);
    }
    catch {
        return;
    }
    const moved = readOwner(aside);
    if (moved !== undefined && (stale === undefined || moved.pid !== stale.pid || moved.startedAt !== stale.startedAt)) {
        // Someone else's fresh lock: restore it unless a newer one already took its place.
        try {
            linkSync(aside, file);
        }
        catch { /* a newer lock is in place */ }
    }
    try {
        unlinkSync(aside);
    }
    catch { /* gone */ }
}
/**
 * Take the lock, replacing a stale one. The same process (a plugin reload) takes it again.
 * @param file - lock file path.
 */
export function acquireLock(file, deps) {
    mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
    const me = { pid: deps.pid, startedAt: deps.startedAt };
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const fd = openSync(file, 'wx', 0o600);
            try {
                writeSync(fd, JSON.stringify(me) + '\n');
            }
            finally {
                closeSync(fd);
            }
            return { ok: true, release: () => releaseLock(file, me) };
        }
        catch (error) {
            if (error.code !== 'EEXIST')
                throw error;
        }
        const owner = readOwner(file);
        if (owner !== undefined && owner.pid === me.pid)
            return { ok: true, release: () => releaseLock(file, me) };
        if (owner !== undefined && ownerLive(owner, deps))
            return { ok: false, holder: owner };
        removeStale(file, owner);
    }
    const owner = readOwner(file);
    return owner === undefined ? { ok: false, holder: { pid: 0, startedAt: 0 } } : { ok: false, holder: owner };
}
/** Remove the lock file if it is still ours. */
export function releaseLock(file, me) {
    const owner = readOwner(file);
    if (owner?.pid !== me.pid)
        return;
    try {
        unlinkSync(file);
    }
    catch {
        // Already gone.
    }
}
/** Real process facts for `acquireLock`. */
export function processDeps() {
    return {
        pid: process.pid,
        startedAt: Date.now() - process.uptime() * 1000,
        alive: (pid) => {
            try {
                process.kill(pid, 0);
                return true;
            }
            catch (error) {
                return error.code === 'EPERM';
            }
        },
        startTimeOf: (pid) => {
            if (process.platform === 'win32')
                return undefined;
            try {
                const seconds = Number(execFileSync('ps', ['-o', 'etime=', '-p', String(pid)], { encoding: 'utf8', timeout: 2000 }).trim().split(/[-:]/).reduce((acc, part, i, all) => {
                    // etime is [[dd-]hh:]mm:ss
                    const n = Number(part);
                    const fromEnd = all.length - 1 - i;
                    return acc + n * [1, 60, 3600, 86400][fromEnd];
                }, 0));
                return Number.isFinite(seconds) ? Date.now() - seconds * 1000 : undefined;
            }
            catch {
                return undefined;
            }
        },
        isDsh: (pid) => {
            if (process.platform === 'win32')
                return undefined;
            try {
                const args = execFileSync('ps', ['-o', 'args=', '-p', String(pid)], { encoding: 'utf8', timeout: 2000 });
                return /DeepSeek Harness|dsh/i.test(args);
            }
            catch {
                return undefined;
            }
        },
    };
}

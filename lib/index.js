var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
/**
 * Host entry: the `coordinator` service. It owns the thread service (thread sessions, status, notices, tools,
 * persistence) and exposes the Remote methods of the host/client contract.
 */
import { readFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { principalOf, Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import { HOST_INJECT } from "./host/dsh.js";
import {} from "./host/ids.js";
import { buildConfigSchema, liveConfig, schemasteryFromDsh } from "./host/config-schema.js";
import { acquireLock, processDeps } from "./host/lock.js";
import { fillStatic } from "./host/names.js";
import { ThreadService } from "./host/threads.js";
import { watchAutoMode } from "./host/auto-mode.js";
const packageDir = join(dirname(fileURLToPath(import.meta.url)), '..');
/**
 * Version of the running dsh: the launcher's DSH_CLIENT_VERSION, else a peer package resolved from dsh's own entry
 * script (not from this plugin, whose linked development copy has its own devDependency version).
 */
function dshVersion() {
    const fromEnv = process.env['DSH_CLIENT_VERSION']?.trim();
    if (fromEnv !== undefined && fromEnv !== '')
        return fromEnv;
    try {
        const entry = process.argv[1];
        if (entry === undefined)
            return 'unknown';
        const file = createRequire(entry).resolve('@deepseek-ai/dsh-typert-protocol/package.json');
        return JSON.parse(readFileSync(file, 'utf8')).version ?? 'unknown';
    }
    catch {
        return 'unknown';
    }
}
/**
 * The service's Schemastery `Config`, built with dsh's own Schemastery (the copy dsh's Loader and Settings use, so
 * the `.volatile()` marks are read by the same code). Resolved from dsh's entry script only, as `dshVersion` does, and
 * only from inside dsh's installation (`schemasteryFromDsh`). Without it the plugin works as before, but the Plugins
 * page shows no settings.
 */
function configSchema() {
    const z = schemasteryFromDsh(process.argv[1], {
        resolve: (entry, id) => createRequire(entry).resolve(id),
        realpath: path => realpathSync(path),
        load: (entry, file) => createRequire(entry)(file),
    });
    return z === undefined ? undefined : buildConfigSchema(z);
}
/** The active dsh home. */
function dshHome(ctx) {
    const homePath = ctx.get('dshHomePath');
    if (typeof homePath === 'function')
        return homePath();
    return process.env['DSH_HOME']?.trim() || join(homedir(), '.dsh');
}
function stateFile(ctx) {
    return join(dshHome(ctx), 'storages', 'dsh-coordinator', 'state.json');
}
/**
 * L5: Remote methods act only for the owner. dsh records a principal only for a caller other than the owner (a shared
 * viewer), and such a caller may read the state but not change it.
 */
function requireOwner(ctx) {
    const invocation = ctx.invocation;
    if (principalOf(invocation) !== undefined)
        throw new Error('only the owner of this DeepSeek Harness can do this');
}
/** Role prompts with tool names and role nouns filled (names.ts); per-request placeholders stay for threads.ts. */
function loadPrompts() {
    return {
        coordinator: fillStatic(readFileSync(join(packageDir, 'prompts', 'coordinator.md'), 'utf8').trim()),
        thread: fillStatic(readFileSync(join(packageDir, 'prompts', 'thread.md'), 'utf8').trim()),
    };
}
/** An optional JSON parameter: a caller that leaves it out may hand the signal over in its place. */
function split(request, signal) {
    if (request instanceof AbortSignal)
        return [undefined, request];
    return [request, signal ?? new AbortController().signal];
}
let CoordinatorService = (() => {
    let _classSuper = TypertRemoteService;
    let _instanceExtraInitializers = [];
    let _ping_decorators;
    let _getState_decorators;
    let _ensureCoordinator_decorators;
    let _createCoordinator_decorators;
    let _setCoordinatorFolder_decorators;
    let _setExecutorPrompt_decorators;
    let _renameCoordinator_decorators;
    let _archiveCoordinator_decorators;
    let _deleteCoordinator_decorators;
    let _archiveThread_decorators;
    let _setThreadPermission_decorators;
    let _confirmFolder_decorators;
    let _removeAllowedFolder_decorators;
    let _resumeThread_decorators;
    return class CoordinatorService extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _ping_decorators = [Remote];
            _getState_decorators = [Remote];
            _ensureCoordinator_decorators = [Remote];
            _createCoordinator_decorators = [Remote];
            _setCoordinatorFolder_decorators = [Remote];
            _setExecutorPrompt_decorators = [Remote];
            _renameCoordinator_decorators = [Remote];
            _archiveCoordinator_decorators = [Remote];
            _deleteCoordinator_decorators = [Remote];
            _archiveThread_decorators = [Remote];
            _setThreadPermission_decorators = [Remote];
            _confirmFolder_decorators = [Remote];
            _removeAllowedFolder_decorators = [Remote];
            _resumeThread_decorators = [Remote];
            __esDecorate(this, null, _ping_decorators, { kind: "method", name: "ping", static: false, private: false, access: { has: obj => "ping" in obj, get: obj => obj.ping }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getState_decorators, { kind: "method", name: "getState", static: false, private: false, access: { has: obj => "getState" in obj, get: obj => obj.getState }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _ensureCoordinator_decorators, { kind: "method", name: "ensureCoordinator", static: false, private: false, access: { has: obj => "ensureCoordinator" in obj, get: obj => obj.ensureCoordinator }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _createCoordinator_decorators, { kind: "method", name: "createCoordinator", static: false, private: false, access: { has: obj => "createCoordinator" in obj, get: obj => obj.createCoordinator }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _setCoordinatorFolder_decorators, { kind: "method", name: "setCoordinatorFolder", static: false, private: false, access: { has: obj => "setCoordinatorFolder" in obj, get: obj => obj.setCoordinatorFolder }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _setExecutorPrompt_decorators, { kind: "method", name: "setExecutorPrompt", static: false, private: false, access: { has: obj => "setExecutorPrompt" in obj, get: obj => obj.setExecutorPrompt }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _renameCoordinator_decorators, { kind: "method", name: "renameCoordinator", static: false, private: false, access: { has: obj => "renameCoordinator" in obj, get: obj => obj.renameCoordinator }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _archiveCoordinator_decorators, { kind: "method", name: "archiveCoordinator", static: false, private: false, access: { has: obj => "archiveCoordinator" in obj, get: obj => obj.archiveCoordinator }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _deleteCoordinator_decorators, { kind: "method", name: "deleteCoordinator", static: false, private: false, access: { has: obj => "deleteCoordinator" in obj, get: obj => obj.deleteCoordinator }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _archiveThread_decorators, { kind: "method", name: "archiveThread", static: false, private: false, access: { has: obj => "archiveThread" in obj, get: obj => obj.archiveThread }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _setThreadPermission_decorators, { kind: "method", name: "setThreadPermission", static: false, private: false, access: { has: obj => "setThreadPermission" in obj, get: obj => obj.setThreadPermission }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _confirmFolder_decorators, { kind: "method", name: "confirmFolder", static: false, private: false, access: { has: obj => "confirmFolder" in obj, get: obj => obj.confirmFolder }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _removeAllowedFolder_decorators, { kind: "method", name: "removeAllowedFolder", static: false, private: false, access: { has: obj => "removeAllowedFolder" in obj, get: obj => obj.removeAllowedFolder }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _resumeThread_decorators, { kind: "method", name: "resumeThread", static: false, private: false, access: { has: obj => "resumeThread" in obj, get: obj => obj.resumeThread }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        /** The plugin's settings for dsh's Plugins page (config-schema.ts); every field but `threadsRoot` is volatile. */
        static Config = configSchema();
        version = (__runInitializers(this, _instanceExtraInitializers), dshVersion());
        settings;
        threads;
        /** Set when another process owns the coordinator state; this one stays disabled. */
        problem;
        constructor(ctx, config) {
            super(ctx, 'coordinator', { namespace: 'coordinator' });
            // dsh keeps ctx.logger output in an in-memory buffer only; the console line makes mounts visible in the
            // terminal running `dsh web`.
            const say = (message) => {
                ctx.logger.info(message);
                console.info(`[dsh-coordinator] ${message}`);
            };
            // Live: a change saved on the Plugins page applies to the next read, sanitized like a profile patch (config-schema.ts).
            this.settings = liveConfig(config, process.env, (key, value) => { say(`setting ${key} is now ${JSON.stringify(value)}`); });
            say(`mounted (dsh ${this.version}); Remote namespace "coordinator" ready`);
            ctx.effect(() => () => { say('unmounted'); }, 'dsh-coordinator: lifecycle log');
            watchAutoMode(ctx, say);
            const prompts = loadPrompts();
            const file = stateFile(ctx);
            // One dsh process per DSH_HOME drives the threads (lock.ts); another one stays disabled and says why.
            const lock = acquireLock(join(dirname(file), 'owner.lock'), processDeps());
            if (!lock.ok) {
                this.problem = {
                    kind: 'locked',
                    detail: `another DeepSeek Harness process (pid ${lock.holder.pid}) uses this dsh home and runs the coordinator; quit it to use the coordinator here. `
                        + `If no other DeepSeek Harness is running, delete ${join(dirname(file), 'owner.lock')} and restart.`,
                };
                say(`disabled: ${this.problem.detail}`);
                return;
            }
            ctx.effect(() => () => { lock.release(); }, 'dsh-coordinator: owner lock');
            const home = dshHome(ctx);
            ctx.inject([...HOST_INJECT], (child) => {
                // A refused base for new coordinators (I7) is a `bad-root` problem the service reports itself; a coordinator
                // whose own folder is refused carries that on its record.
                this.threads = new ThreadService(child, this.settings, file, prompts, { dshHome: home });
                child.effect(() => () => { this.threads = undefined; }, 'dsh-coordinator: thread service handle');
            });
        }
        /** I8: which dsh services the thread service waits for, while it is not running. */
        missingServices() {
            const missing = HOST_INJECT.filter((name) => {
                try {
                    return this.ctx.get(name) === undefined;
                }
                catch {
                    return true;
                }
            });
            return {
                kind: 'not-ready',
                detail: missing.length === 0
                    ? 'the coordinator is starting'
                    : `dsh services the coordinator needs are not loaded: ${missing.join(', ')}. Check that the profile still has them, then restart.`,
            };
        }
        service() {
            if (this.problem !== undefined)
                throw new Error(this.problem.detail);
            if (this.threads === undefined)
                throw new Error(this.missingServices().detail);
            return this.threads;
        }
        /** Report that the host side of the plugin is alive. */
        async ping(signal) {
            signal.throwIfAborted();
            return { ok: true, dshVersion: this.version, time: new Date().toISOString() };
        }
        /** Read the coordinators and the thread list; `revision` changes on every change. */
        async getState(signal) {
            signal.throwIfAborted();
            if (this.threads !== undefined)
                return this.threads.getState();
            const problem = this.problem ?? this.missingServices();
            return { coordinators: [], threads: [], revision: 0, problem, problems: [problem] };
        }
        /**
         * Open a coordinator: the named one (reopening its chat when it is archived or gone), else the last used one, else
         * a new one.
         */
        async ensureCoordinator(request, signal) {
            const [value, abort] = split(request, signal);
            abort.throwIfAborted();
            requireOwner(this.ctx);
            return this.service().ensureCoordinator(value ?? {});
        }
        /** New coordinator: its own folder below the base, or `home` from the folder picker. */
        async createCoordinator(request, signal) {
            const [value, abort] = split(request, signal);
            abort.throwIfAborted();
            requireOwner(this.ctx);
            return this.service().createCoordinator(value ?? {});
        }
        /** Change where a coordinator's new threads go; existing threads and the chat stay where they are. */
        async setCoordinatorFolder(request, signal) {
            signal.throwIfAborted();
            requireOwner(this.ctx);
            return this.service().setCoordinatorFolder(request ?? {});
        }
        /**
         * Set a coordinator's Executor prompt: the user's standing instructions every Executor Session it starts afterwards
         * gets. Empty text clears it. Only the owner may set it; no model tool can read or change it.
         */
        async setExecutorPrompt(request, signal) {
            signal.throwIfAborted();
            requireOwner(this.ctx);
            return this.service().setExecutorPrompt(request ?? {});
        }
        /** Rename a coordinator (its chat title and sidebar group follow; folders are never renamed). Owner only. */
        async renameCoordinator(request, signal) {
            signal.throwIfAborted();
            requireOwner(this.ctx);
            return this.service().renameCoordinator(request ?? {});
        }
        /** Archive a coordinator with its finished threads (`force` also stops working ones); optionally its sidebar Workspace. */
        async archiveCoordinator(request, signal) {
            signal.throwIfAborted();
            requireOwner(this.ctx);
            return this.service().archiveCoordinator(request ?? {});
        }
        /**
         * Forget an archived coordinator: its record and its archived rows leave the plugin state (Sessions, folders and files
         * stay). Refused while it is live. Owner only.
         */
        async deleteCoordinator(request, signal) {
            signal.throwIfAborted();
            requireOwner(this.ctx);
            return this.service().deleteCoordinator(request ?? {});
        }
        /** Remove a thread from the list and archive its dsh session (restorable from the sidebar). The folder is kept. */
        async archiveThread(id, signal) {
            signal.throwIfAborted();
            requireOwner(this.ctx);
            await this.service().archiveThreadAsOwner(id);
        }
        /**
         * Set how new threads run: `auto` (auto review, no file sandbox) or `ask` (workspace-write, approvals to the user).
         * Any other value is refused. Applies to threads started afterwards and their team members.
         */
        async setThreadPermission(mode, signal) {
            signal.throwIfAborted();
            requireOwner(this.ctx);
            return this.service().setThreadPermission(mode);
        }
        /**
         * The user's answer to a thread's folder confirmation: `once` starts it there, `always` also adds the folder to
         * the allowed folders, `deny` drops the thread. Only the owner may answer; no model tool can.
         */
        async confirmFolder(request, signal) {
            signal.throwIfAborted();
            requireOwner(this.ctx);
            const value = (request ?? {});
            const result = await this.service().confirmFolder(value.id, value.decision);
            return 'denied' in result ? { id: result.denied, started: false } : { id: result.id, started: true };
        }
        /** Remove a folder from the allowed folders. Returns the list. */
        async removeAllowedFolder(path, signal) {
            signal.throwIfAborted();
            requireOwner(this.ctx);
            return this.service().removeAllowedFolder(path);
        }
        /** Resume a thread the spend guards paused. */
        async resumeThread(id, signal) {
            signal.throwIfAborted();
            requireOwner(this.ctx);
            return { id: this.service().resumeThread(id).id };
        }
    };
})();
export default CoordinatorService;

/**
 * The dsh-home guard for agents of the coordinator's world. Pure apart from the injected filesystem.
 *
 * The dsh home (`$DSH_HOME`, and the default `~/.dsh`) holds `.credentials.yaml` (whoever reads it can act as the
 * user), every Session's log, the profiles and this plugin's state file. dsh sandboxes writes, not reads, so a thread
 * lead that goes looking for lost work can read and copy all of it. The thread service runs this check for every
 * tool call of the coordinator and of every agent in a thread's tree (lead, team members, subagents) and denies a
 * call that targets the dsh home:
 *
 * - Path arguments (`file_path`, `path`, `workdir`, ...) are resolved against the agent's folders, normalised and
 *   resolved through symlinks, then compared with the protected roots. Search tools are also refused on an ancestor
 *   of a protected root, since a recursive search there reads into it.
 * - Every other string argument (a shell command, terminal input, an MCP argument) is searched for the protected
 *   roots in their common spellings: absolute, `~/...`, `$HOME/...`, `${HOME}/...`, `$DSH_HOME`, a relative path
 *   from the agent's folders, and a path segment equal to `.dsh` or to the dot-named folder of the active home.
 *   This text check is best effort: a determined agent can spell a path in ways it does not recognise.
 *
 * In Ask me mode a file-write tool is also refused outside the thread's folder in the system temp folders, which
 * dsh's `workspace-write` sandbox lets every session write.
 */
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { expandTilde, isWithin, lexical, realResolve } from "./cwd-guard.js";
import { allSpellings, TOOL } from "./names.js";
/** Tools that only carry text for people or other agents and never touch files: their text is not searched. */
const TEXT_ONLY = new Set([
    // The plugin's own tools, under their current and their earlier names.
    ...allSpellings(Object.keys(TOOL)),
    'ask_user_question', 'todo_write', 'web_search',
    'team_task_create', 'team_task_get', 'team_task_list', 'team_task_update', 'send_message', 'list_agents',
    'create_goal', 'get_goal', 'update_goal',
]);
/** Argument keys that hold a path. */
const PATH_KEYS = new Set([
    'file_path', 'filepath', 'filePath', 'path', 'paths', 'file', 'files', 'filename', 'dir', 'directory', 'folder',
    'cwd', 'workdir', 'working_directory', 'workingDirectory', 'root', 'target', 'source', 'destination', 'dest', 'src',
    'dst', 'from', 'to', 'notebook_path', 'output', 'output_path', 'input_path',
]);
/** Arguments that hold the text a write tool puts into a file: data, not an access, so they are not searched. */
const CONTENT_KEYS = new Set(['content', 'contents', 'new_string', 'old_string', 'text', 'body', 'data']);
/** Tools that read a whole tree below their path argument. */
const SEARCH_TOOLS = new Set(['glob', 'grep', 'ls', 'list', 'list_directory', 'find', 'tree', 'search']);
/** Tools that write files through a path argument. */
const WRITE_TOOLS = new Set(['write', 'edit', 'apply_patch', 'multi_edit', 'str_replace_editor', 'str_replace_based_edit_tool', 'notebook_edit', 'create_file']);
const WRITE_NAME = /(?:^|_)(?:write|edit|patch|create|save|delete|remove|move|copy|rename|mkdir|append)(?:_|$)/i;
/** Characters that may continue a file-name segment; anything else (or a glob character) ends the path there. */
const NAME_CHAR = /[A-Za-z0-9._\-+@~%]/;
function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
/** Lexical and real forms of each protected root, without duplicates. */
export function protectedForms(env) {
    const out = new Set();
    for (const root of env.roots) {
        const lex = lexical(root, env.home);
        out.add(lex);
        out.add(realResolve(lex, env.fs));
    }
    return [...out].filter(form => form !== sep);
}
/** Whether `text` contains `needle` as a whole path: not glued to a longer name on either side. */
function containsPath(text, needle, needLeadingBoundary) {
    if (needle === '')
        return false;
    let from = 0;
    while (true) {
        const at = text.indexOf(needle, from);
        if (at < 0)
            return false;
        const before = at === 0 ? '' : text[at - 1];
        const after = text[at + needle.length] ?? '';
        const leadOk = !needLeadingBoundary || before === '' || !NAME_CHAR.test(before) || before === '~';
        // A glob character right after the root (`~/.dsh*`) may still match it.
        if (leadOk && (after === '' || !NAME_CHAR.test(after)))
            return true;
        from = at + 1;
    }
}
/** Spellings of the protected roots in free text, for the agent's folders. */
export function textSpellings(env, cwds) {
    const forms = protectedForms(env);
    const homes = [...new Set([lexical(env.home, env.home), realResolve(lexical(env.home, env.home), env.fs)])];
    const paths = new Set();
    const relatives = new Set();
    const segments = new Set(['.dsh']);
    for (const form of forms) {
        paths.add(form);
        for (const home of homes) {
            if (form !== home && isWithin(home, form)) {
                const rel = relative(home, form);
                for (const prefix of ['~/', '$HOME/', '${HOME}/', '"$HOME"/', '"${HOME}"/'])
                    paths.add(prefix + rel);
            }
        }
        const base = form.split(sep).at(-1) ?? '';
        if (base.startsWith('.') && base.length > 1)
            segments.add(base);
        for (const cwd of cwds) {
            const rel = relative(lexical(cwd, env.home), form);
            if (rel !== '' && !isAbsolute(rel))
                relatives.add(rel);
        }
    }
    return { paths: [...paths], relatives: [...relatives], segments: [...segments] };
}
/**
 * Spellings of files inside the dsh home that a search can reach without naming the home itself (S7): the plugin's
 * state folder through a find or glob pattern (`-path '*storages/dsh-coordinator/state.json'`), and the credentials file
 * by its name (`find ~ -name .credentials.yaml`).
 */
const INNER_FILES = [
    { re: /storages[\\/*?[\]{}]+(?:[^\s'"`]*[\\/*])?dsh-coordinator(?![A-Za-z0-9_.-]*[A-Za-z0-9_])/, label: 'storages/dsh-coordinator' },
    { re: /dsh-coordinator[\\/*?]+(?:[^\s'"`/\\]*[\\/])?(?:state(?:\.v1)?\.json|owner\.lock)/, label: 'dsh-coordinator state file' },
    // N8: only the dot-file as a bare name (`find ~ -name .credentials.yaml`); under a protected root the path spellings
    // catch it, and `config/credentials.yaml` or `proj/.credentials.yaml` in a project are not the dsh home's.
    { re: /(?:^|[\s'"`=(,;|&])\.credentials\.yaml(?![A-Za-z0-9_.-])/, label: '.credentials.yaml' },
];
/** A matcher for free text against the protected roots, built once per tool call. */
export function textMatcher(env, cwds) {
    const { paths, relatives, segments } = textSpellings(env, cwds);
    const hints = [...new Set(['dsh', 'DSH', '.credentials.yaml', ...protectedForms(env).map(form => form.split(sep).at(-1) ?? '').filter(base => base !== '')])];
    const segmentRes = segments.map(segment => ({
        segment,
        re: new RegExp(`(?:^|[\\s'"\`=:(\\[{,;|&<>/\\\\])${escapeRegExp(segment)}(?=$|[\\s'"\`/\\\\;|&)<>*?\\[\\]{},:$])`),
    }));
    return (text) => {
        // Cheap pre-filter: every spelling contains "dsh" or a protected folder's name.
        if (!hints.some(hint => text.includes(hint)))
            return undefined;
        if (/\$\{?DSH_HOME(?![A-Za-z0-9_])/.test(text))
            return '$DSH_HOME';
        // An absolute or home-relative spelling must start a path: `/x/Users/me/.dsh` is not `/Users/me/.dsh`.
        for (const path of paths)
            if (containsPath(text, path, true))
                return path;
        for (const rel of relatives)
            if (containsPath(text, rel, true))
                return rel;
        for (const { segment, re } of segmentRes)
            if (re.test(text))
                return segment;
        for (const { re, label } of INNER_FILES)
            if (re.test(text))
                return label;
        return undefined;
    };
}
/** Whether free text names a protected root; returns the spelling that matched. */
export function textMatch(text, env, cwds) {
    return textMatcher(env, cwds)(text);
}
/** Resolve one path argument against the agent's folders: lexical and real forms of each candidate. */
function candidates(value, cwds, env) {
    const trimmed = value.trim();
    if (trimmed === '' || trimmed.includes('\0'))
        return [];
    const stripped = trimmed.replace(/^file:\/\//, '');
    const expanded = expandTilde(stripped, env.home);
    const bases = isAbsolute(expanded) ? [''] : cwds.length > 0 ? cwds : [env.home];
    const out = new Set();
    for (const base of bases) {
        const lex = (base === '' ? resolve(expanded) : resolve(lexical(base, env.home), expanded)).normalize('NFC');
        out.add(lex);
        out.add(realResolve(lex, env.fs));
    }
    return [...out];
}
/** Every string inside a JSON value, with the key it sits under (the nearest object key for array items). */
function strings(value, key, out, depth = 0) {
    if (depth > 8 || out.length > 500)
        return;
    if (typeof value === 'string') {
        out.push({ key, value });
        return;
    }
    if (Array.isArray(value)) {
        for (const item of value)
            strings(item, key, out, depth + 1);
        return;
    }
    if (value !== null && typeof value === 'object') {
        for (const [k, v] of Object.entries(value))
            strings(v, k, out, depth + 1);
    }
}
/** Whether a tool writes files through its path arguments. */
export function isWriteTool(name) {
    return WRITE_TOOLS.has(name) || WRITE_NAME.test(name);
}
/**
 * Check one tool call.
 * @returns the denial, or undefined when the call may run.
 */
export function checkCall(call, env) {
    const forms = protectedForms(env);
    const found = [];
    strings(call.args, undefined, found);
    const textOnly = TEXT_ONLY.has(call.name);
    const search = SEARCH_TOOLS.has(call.name);
    const writer = isWriteTool(call.name);
    const write = call.askMode && writer;
    const temp = write ? [...new Set(env.temp.flatMap(t => [lexical(t, env.home), realResolve(lexical(t, env.home), env.fs)]))] : [];
    const own = call.ownFolder === undefined ? undefined : realResolve(lexical(call.ownFolder, env.home), env.fs);
    const matchText = textOnly ? undefined : textMatcher(env, call.cwds);
    for (const { key, value } of found) {
        if (key !== undefined && PATH_KEYS.has(key)) {
            for (const path of candidates(value, call.cwds, env)) {
                for (const form of forms) {
                    if (isWithin(form, path))
                        return { kind: 'dsh-home', match: path };
                    if (search && isWithin(path, form))
                        return { kind: 'dsh-home', match: `${path} (contains ${form})` };
                }
                if (write && temp.some(t => isWithin(t, path)) && (own === undefined || !isWithin(own, path)))
                    return { kind: 'temp-write', match: path };
            }
        }
        if (writer && key !== undefined && CONTENT_KEYS.has(key))
            continue;
        const match = matchText?.(value);
        if (match !== undefined)
            return { kind: 'dsh-home', match };
    }
    return undefined;
}
/** The model-facing error of a denial. */
export function denialReason(denial, role) {
    if (denial.kind === 'temp-write') {
        return 'Executor Sessions in Ask me mode may not write files to the system temp folders; write inside the Executor Session\'s own folder instead';
    }
    return role === 'coordinator'
        ? 'the coordinator may not access the dsh home (its credentials, sessions, storages or profiles); ask the user'
        : 'Executor Session agents may not access the dsh home (its credentials, sessions, storages or profiles); ask the coordinator or the user';
}

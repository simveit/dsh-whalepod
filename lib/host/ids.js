/** Thread and coordinator ids, folder names and plugin config. Pure apart from the random source. */
import { randomBytes, randomInt } from 'node:crypto';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, resolve, sep } from 'node:path';
import { INVISIBLE } from "./fence.js";
/** A short stable id such as `t-3f9a`, unique among `taken`. */
export function newThreadId(taken, random = () => randomBytes(2).toString('hex')) {
    for (let i = 0; i < 64; i++) {
        const id = `t-${random()}`;
        if (!taken.has(id))
            return id;
    }
    return `t-${randomBytes(4).toString('hex')}`;
}
/** A short stable coordinator id such as `c-1a2b`, unique among `taken`. */
export function newCoordinatorId(taken, random = () => randomBytes(2).toString('hex')) {
    for (let i = 0; i < 64; i++) {
        const id = `c-${random()}`;
        if (!taken.has(id))
            return id;
    }
    return `c-${randomBytes(4).toString('hex')}`;
}
/** Whether a stored coordinator id has the shape this plugin mints. */
export function isCoordinatorId(value) {
    return typeof value === 'string' && /^c-[0-9a-f]{4,8}$/.test(value);
}
/** Most live (not archived) coordinators; past it New coordinator and adoption refuse. */
export const COORDINATORS_MAX = 20;
/** Most archived coordinator records kept in the state file. */
export const ARCHIVED_COORDINATORS_KEEP = 20;
/** Language-neutral folder name of a new coordinator's home below the base, like dsh's `default-workspace`. */
export const COORDINATOR_FOLDER = 'coordinator';
/** Title of a coordinator chat and of its Workspace. */
export const COORDINATOR_TITLE = 'Coordinator';
/** The last two segments of dsh's default workspace path; its parent is the base for new coordinators. */
export const DEFAULT_WORKSPACE_TAIL = ['deepseek-harness', 'default-workspace'];
/**
 * Built-in coordinator names: philosophers, scientists, mathematicians, novelists and poets, about a third each
 * English-speaking, German-speaking and Chinese, and a few from elsewhere; women and men. Chinese names are written in
 * Chinese characters in every locale. Each entry has a lowercase ASCII slug (pinyin with hyphens for Chinese names)
 * for the folder of a new coordinator (`coordinator-li-bai`). A new coordinator gets a random unused one (`freeName`).
 */
export const COORDINATOR_NAMES = [
    // English-speaking
    ...['Newton', 'Darwin', 'Austen', 'Turing', 'Lovelace', 'Faraday', 'Maxwell', 'Russell', 'Woolf', 'Dickinson',
        'Feynman', 'Hume', 'Locke', 'Dickens', 'Orwell', 'Eliot', 'Shelley', 'Joyce', 'Shakespeare', 'Byron',
        'Keats', 'Hawking', 'Franklin', 'Babbage', 'Boole', 'Dirac', 'Hardy', 'Wordsworth', 'Twain'].map(name => ({ name, slug: name.toLowerCase() })),
    { name: 'Brontë', slug: 'bronte' },
    // German-speaking
    ...['Kant', 'Hegel', 'Goethe', 'Schiller', 'Gauss', 'Noether', 'Planck', 'Heisenberg', 'Leibniz', 'Arendt',
        'Humboldt', 'Hesse', 'Mann', 'Riemann', 'Hilbert', 'Meitner', 'Kafka', 'Rilke', 'Fontane', 'Heine',
        'Kepler', 'Euler', 'Einstein', 'Brecht', 'Lessing', 'Zweig', 'Musil', 'Wittgenstein', 'Mendel'].map(name => ({ name, slug: name.toLowerCase() })),
    { name: 'Hölderlin', slug: 'hoelderlin' },
    // Chinese
    { name: '老子', slug: 'laozi' }, { name: '孔子', slug: 'kongzi' }, { name: '庄子', slug: 'zhuangzi' }, { name: '墨子', slug: 'mozi' },
    { name: '孟子', slug: 'mengzi' }, { name: '李白', slug: 'li-bai' }, { name: '杜甫', slug: 'du-fu' }, { name: '苏轼', slug: 'su-shi' },
    { name: '鲁迅', slug: 'lu-xun' }, { name: '曹雪芹', slug: 'cao-xueqin' }, { name: '祖冲之', slug: 'zu-chongzhi' }, { name: '张衡', slug: 'zhang-heng' },
    { name: '沈括', slug: 'shen-kuo' }, { name: '华罗庚', slug: 'hua-luogeng' }, { name: '陈景润', slug: 'chen-jingrun' }, { name: '屠呦呦', slug: 'tu-youyou' },
    { name: '吴健雄', slug: 'wu-jianxiong' }, { name: '李清照', slug: 'li-qingzhao' }, { name: '巴金', slug: 'ba-jin' }, { name: '老舍', slug: 'lao-she' },
    { name: '王维', slug: 'wang-wei' }, { name: '白居易', slug: 'bai-juyi' }, { name: '陶渊明', slug: 'tao-yuanming' }, { name: '刘徽', slug: 'liu-hui' },
    { name: '蔡伦', slug: 'cai-lun' }, { name: '毕昇', slug: 'bi-sheng' }, { name: '郭守敬', slug: 'guo-shoujing' }, { name: '徐光启', slug: 'xu-guangqi' },
    { name: '司马迁', slug: 'sima-qian' }, { name: '冰心', slug: 'bing-xin' },
    // Elsewhere
    ...['Curie', 'Hypatia', 'Borges', 'Tagore', 'Ramanujan', 'Murasaki', 'Cervantes', 'Descartes'].map(name => ({ name, slug: name.toLowerCase() })),
];
/** Longest Executor prompt, in characters. */
export const EXECUTOR_PROMPT_MAX = 4000;
/**
 * The Executor prompt as stored and shown: carriage returns become newlines, NUL and every other control character
 * except newline and tab are removed, trailing whitespace is trimmed.
 */
export function cleanExecutorPrompt(raw) {
    // N2: invisible characters (zero-width, bidi controls, Unicode tag characters, Hangul fillers) are removed too, so
    // pasted text cannot carry instructions the user does not see on the page.
    return raw.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/gu, '').replace(INVISIBLE, '').trimEnd();
}
/** Longest coordinator name, in characters. */
export const COORDINATOR_NAME_MAX = 40;
/**
 * A coordinator name the user typed, checked: invisible characters removed, trimmed, 1 to 40 characters counted in
 * code points (CJK names included), no control characters or line breaks, not only digits (that would read as a
 * legacy title such as "Coordinator 2").
 * @returns the name, or an error message.
 */
export function checkCoordinatorName(raw) {
    if (typeof raw !== 'string')
        return { error: 'the name must be text' };
    if (/[\u0000-\u001F\u007F-\u009F\u2028\u2029]/u.test(raw))
        return { error: 'the name may not contain control characters or line breaks' };
    // N2: invisible characters are removed; a name of nothing else is empty.
    const name = raw.normalize('NFC').replace(INVISIBLE, '').trim();
    if (name === '')
        return { error: 'the name must not be empty' };
    if ([...name].length > COORDINATOR_NAME_MAX)
        return { error: `the name may have at most ${COORDINATOR_NAME_MAX} characters` };
    if (/^\d+$/.test(name))
        return { error: 'the name may not be only a number' };
    // The middle dot separates a coordinator's name from an executor folder in executor group titles ("Euler · parser").
    if (/[\u00B7\u0387\u2022\u2219\u22C5\u30FB\uFF65\u2027]/u.test(name))
        return { error: 'the name may not contain a middle dot (·)' };
    return { name };
}
/**
 * The key two names are compared by for uniqueness: NFKC (full-width forms fold), invisible characters and soft
 * hyphens removed, white space collapsed, case folded. `Noether`, `ｎｏｅｔｈｅｒ` and `Noe\u00ADther` are the same name.
 */
export function nameKey(name) {
    return name.normalize('NFKC').replace(INVISIBLE, '').replace(/\s+/g, ' ').trim().toLowerCase();
}
/**
 * A random name no live coordinator uses (case-insensitive), from the built-in list; when all are used, a listed name
 * with a number (`Noether 2`).
 * @param used - names of the live coordinators.
 * @param random - picks an index below `n`; injected for tests.
 */
export function freeName(used, random = n => randomInt(n)) {
    const taken = new Set([...used].map(nameKey));
    const free = COORDINATOR_NAMES.map(entry => entry.name).filter(name => !taken.has(nameKey(name)));
    if (free.length > 0)
        return free[random(free.length)];
    for (let n = 2; n < 10_000; n++) {
        const numbered = COORDINATOR_NAMES.map(entry => `${entry.name} ${n}`).filter(name => !taken.has(nameKey(name)));
        if (numbered.length > 0)
            return numbered[random(numbered.length)];
    }
    return `${COORDINATOR_NAMES[0].name} ${Date.now()}`;
}
/**
 * The folder slug of a name: the list entry's slug (with the number of a numbered name, `li-bai-2`), else the name's
 * own ASCII letters and digits, else empty (a name with no ASCII letters that is not on the list).
 */
export function nameSlug(name) {
    const numbered = /^(.*\S) ([2-9]|[1-9]\d+)$/u.exec(name);
    const base = numbered?.[1] ?? name;
    const entry = COORDINATOR_NAMES.find(e => e.name === base);
    if (entry !== undefined)
        return numbered === null ? entry.slug : `${entry.slug}-${numbered[2]}`;
    return slugify(name, '');
}
/**
 * The folder of a new coordinator's home: `coordinator-<slug>` (`coordinator-li-bai`), `-2`, `-3`, ... when that folder
 * is taken (n from 1); plain `coordinator`, `coordinator-2`, ... for a name without a slug.
 */
export function coordinatorFolderName(name, n = 1) {
    const slug = nameSlug(name);
    const base = slug === '' ? COORDINATOR_FOLDER : `${COORDINATOR_FOLDER}-${slug}`;
    return n <= 1 ? base : `${base}-${n}`;
}
/**
 * Title of a coordinator chat and its sidebar group: the name alone (`Noether`, `鲁迅`), as the owner decided. Cut at
 * dsh's title limit (80 UTF-8 bytes) on a character boundary, so a long CJK name still makes a valid title.
 */
export function coordinatorTitle(name) {
    const full = name;
    if (Buffer.byteLength(full, 'utf8') <= TITLE_MAX_BYTES)
        return full;
    let out = '';
    for (const ch of full) {
        if (Buffer.byteLength(out + ch, 'utf8') > TITLE_MAX_BYTES)
            break;
        out += ch;
    }
    return out.trimEnd();
}
/**
 * Title of the sidebar group the plugin makes for one Executor Session: the owning coordinator's name, a middle dot,
 * and the base name of the executor's folder (`Euler · forecast-parser`). Both parts are display text from outside
 * (a name the owner typed, a folder a model may have named): control, invisible and line-break characters are removed
 * and white space collapsed. Cut at dsh's title limit (80 UTF-8 bytes) on a character boundary.
 */
export function executorGroupTitle(coordinatorName, folder) {
    const clean = (text) => text.normalize('NFC').replace(/[\u0000-\u001F\u007F-\u009F\u2028\u2029]/gu, ' ')
        .replace(INVISIBLE, '').replace(/\s+/g, ' ').trim();
    const base = clean(folder.split(sep).filter(part => part !== '').at(-1) ?? '');
    const full = `${clean(coordinatorName) || COORDINATOR_TITLE} · ${base || 'executor'}`;
    if (Buffer.byteLength(full, 'utf8') <= TITLE_MAX_BYTES)
        return full;
    let out = '';
    for (const ch of full) {
        if (Buffer.byteLength(out + ch, 'utf8') > TITLE_MAX_BYTES)
            break;
        out += ch;
    }
    return out.trimEnd();
}
/** The title an earlier build of this release gave a named coordinator (`Coordinator Noether`); renamed to the name once. */
export function prefixedCoordinatorTitle(name) {
    return `${COORDINATOR_TITLE} ${name}`;
}
/**
 * Whether a title is one releases before names gave a coordinator chat (`Coordinator`, `Coordinator 2`, ...). Only the
 * coordinator migrated from version 1 may use it as a mark (S6); any other record needs its bound marks.
 */
export function isLegacyCoordinatorTitle(title) {
    return typeof title === 'string' && /^Coordinator(?: [1-9]\d{0,2})?$/.test(title);
}
/**
 * Where new coordinators live: the configured `coordinatorBase`, else the parent of dsh's registered default
 * workspace (`.../deepseek-harness/default-workspace`), else `~/Documents/deepseek-harness`, which matches dsh on a
 * standard Mac. No osascript call from the plugin.
 * @param workspacePaths - paths of the registered Workspaces.
 */
export function discoverBase(workspacePaths, home, configured) {
    if (configured !== undefined)
        return configured;
    const tail = sep + DEFAULT_WORKSPACE_TAIL.join(sep);
    const found = workspacePaths.find(path => path.endsWith(tail));
    return found === undefined ? join(home, 'Documents', DEFAULT_WORKSPACE_TAIL[0]) : dirname(found);
}
/** Folder name from a title: lowercase ASCII letters, digits and dashes, at most 40 characters. */
export function slugify(title, fallback = 'thread') {
    const slug = title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/g, '');
    return slug === '' ? fallback : slug;
}
/** `<root>/<slug>`, or `<root>/<slug>-<id>` when the slug is already used by another thread or exists. */
export function threadDir(root, title, threadId, used) {
    const base = join(root, slugify(title));
    return used(base) ? `${base}-${threadId.replace(/^t-/, '')}` : base;
}
/**
 * The absolute folder a brief names on its "Working directory:" line, when the coordinator wrote one there but did
 * not pass it as `cwd` (a real model did exactly that). Only an absolute or `~/` path counts.
 */
export function briefWorkingDirectory(brief) {
    const match = /^[\W\d]*(?:working directory|working folder|cwd)[\s*_]*:[\s*_]*(`?)((?:~\/|\/)[^\s`'"]*)\1/im.exec(brief);
    if (match === null)
        return undefined;
    const path = match[2].replace(/[.,;:)]+$/, '');
    return path === '' || path === '/' ? undefined : path;
}
export function expandHome(path) {
    if (path === '~')
        return homedir();
    if (path.startsWith('~/'))
        return join(homedir(), path.slice(2));
    return path;
}
/** Most UTF-8 bytes in a session title, as dsh's session-title service accepts (`maxTitleBytes`). */
export const TITLE_MAX_BYTES = 80;
/**
 * A thread title in the style dsh gives ordinary sessions: one short line without control characters, wrapping
 * quotes or emphasis, a "Thread:" prefix, or a thread id, cut to dsh's title byte limit at a word boundary.
 * @returns the title, or an empty string when nothing is left.
 */
export function normalizeTitle(raw) {
    let title = raw
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ')
        .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    for (let i = 0; i < 3; i++) {
        const before = title;
        title = title
            .replace(/^(\*{1,3}|_{1,2}|["'`\u201C\u2018])(.*)\1$/u, '$2')
            .replace(/^\u201C(.*)\u201D$/u, '$1')
            .replace(/^(?:thread|task|executor(?: session)?)\b\s*(?:t-[0-9a-f]{4,8}\b)?\s*[:\-–—]\s*/iu, '')
            .replace(/\s*[([]?\bt-[0-9a-f]{4,8}\b[)\]]?\s*/giu, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        if (title === before)
            break;
    }
    title = title.replace(/[.。]+$/u, '').trim();
    if (Buffer.byteLength(title, 'utf8') <= TITLE_MAX_BYTES)
        return title;
    let out = '';
    for (const ch of title) {
        if (Buffer.byteLength(out + ch, 'utf8') > TITLE_MAX_BYTES)
            break;
        out += ch;
    }
    const cut = out.lastIndexOf(' ');
    return (cut > TITLE_MAX_BYTES / 2 ? out.slice(0, cut) : out).trim();
}
export const DEFAULT_CONFIG = {
    threadsRoot: '~/dsh-threads',
    maxRunningThreads: 128,
    noticeDebounceMs: 3000,
    noticeMaxDelayMs: 15000,
    briefAs: 'user',
    wakeMaxPerThread: 60,
    wakeWindowMs: 10 * 60_000,
    peerMaxPerPair: 40,
    peerMaxPerThread: 200,
    peerWindowMs: 10 * 60_000,
    threadPermission: 'auto',
    threadTurnBudget: 0,
    coordinatorExtraTools: [],
};
/** Read the plugin config with defaults; invalid values fall back to the default. Unknown keys are ignored. */
export function parseConfig(raw, env = {}) {
    const value = (raw !== null && typeof raw === 'object' ? raw : {});
    const num = (key, min) => {
        const v = value[key];
        return typeof v === 'number' && Number.isFinite(v) && v >= min ? v : DEFAULT_CONFIG[key];
    };
    // DEV: DSH_COORDINATOR_THREADS_ROOT overrides the configured root, so a dev server never writes to the default.
    const rootRaw = env['DSH_COORDINATOR_THREADS_ROOT'] ?? (typeof value['threadsRoot'] === 'string' && value['threadsRoot'].trim() !== '' ? value['threadsRoot'] : DEFAULT_CONFIG.threadsRoot);
    const root = expandHome(rootRaw);
    // DEV: DSH_COORDINATOR_BASE overrides the base, so a dev server never writes into ~/Documents.
    const baseRaw = env['DSH_COORDINATOR_BASE'] ?? (typeof value['coordinatorBase'] === 'string' && value['coordinatorBase'].trim() !== '' ? value['coordinatorBase'] : undefined);
    const base = baseRaw === undefined || baseRaw.trim() === '' || baseRaw.includes('\0') ? undefined : expandHome(baseRaw.trim());
    return {
        threadsRoot: isAbsolute(root) ? resolve(root) : resolve(homedir(), root),
        ...(base === undefined ? {} : { coordinatorBase: isAbsolute(base) ? resolve(base) : resolve(homedir(), base) }),
        maxRunningThreads: Math.floor(num('maxRunningThreads', 1)),
        noticeDebounceMs: num('noticeDebounceMs', 0),
        noticeMaxDelayMs: num('noticeMaxDelayMs', 0),
        briefAs: value['briefAs'] === 'notice' ? 'notice' : 'user',
        wakeMaxPerThread: Math.floor(num('wakeMaxPerThread', 1)),
        wakeWindowMs: num('wakeWindowMs', 1000),
        peerMaxPerPair: Math.floor(num('peerMaxPerPair', 1)),
        peerMaxPerThread: Math.floor(num('peerMaxPerThread', 1)),
        peerWindowMs: num('peerWindowMs', 1000),
        threadPermission: value['threadPermission'] === 'ask' ? 'ask' : 'auto',
        // 0 turns the daily turn budget off; a negative or non-number value falls back to the default.
        threadTurnBudget: Math.floor(num('threadTurnBudget', 0)),
        coordinatorExtraTools: Array.isArray(value['coordinatorExtraTools'])
            ? value['coordinatorExtraTools'].filter((name) => typeof name === 'string' && /^[\w.:-]{1,100}$/.test(name)).slice(0, 50)
            : [],
    };
}

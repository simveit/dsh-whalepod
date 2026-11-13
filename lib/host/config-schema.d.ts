import { type CoordinatorConfig } from './ids.ts';
export type ConfigFieldKind = 'count' | 'duration' | 'choice' | 'path' | 'list';
export interface ConfigField {
    key: keyof CoordinatorConfig;
    kind: ConfigFieldKind;
    /** Smallest accepted value (counts and durations). */
    min?: number;
    /** Whole numbers only. */
    integer?: boolean;
    /** Accepted values (choices). */
    choices?: readonly string[];
    /** Editable on the Plugins page without a restart. */
    volatile: boolean;
    /** One line for the schema (the page shows its own localised copy). */
    description: string;
}
/** Every configuration key, in the order the page groups them. */
export declare const CONFIG_FIELDS: readonly ConfigField[];
/** The parts of Schemastery the builder uses (dsh's own copy is passed in at runtime). */
export interface SchemaBuilder {
    object(fields: Record<string, unknown>): unknown;
    number(): SchemaNode;
    string(): SchemaNode;
    array(of: unknown): SchemaNode;
    union(options: unknown[]): SchemaNode;
    const(value: string): SchemaNode;
}
export interface SchemaNode {
    min?(value: number): SchemaNode;
    step?(value: number): SchemaNode;
    default(value: unknown): SchemaNode;
    description(text: string): SchemaNode;
    loose?(): SchemaNode;
    hidden?(): SchemaNode;
    volatile?(): SchemaNode;
}
/**
 * The service's `static Config` built with dsh's Schemastery.
 * @param z - Schemastery (its default export).
 */
export declare function buildConfigSchema(z: SchemaBuilder): unknown;
/** How `schemasteryFromDsh` finds and loads a module; the host passes Node's, tests a fake. */
export interface DshModuleLoader {
    /** Resolve `id` as dsh's entry script would (`createRequire(entry).resolve`). */
    resolve(entry: string, id: string): string;
    /** The real path of a file (symlinks resolved). */
    realpath(path: string): string;
    /** Load a resolved file. */
    load(entry: string, file: string): unknown;
}
/**
 * The installation folder of dsh: the entry script's path before its first `node_modules` segment (the entry is
 * `<root>/node_modules/@deepseek-ai/dsh-desktop-host/lib/cli.js`), else the entry's own folder.
 */
export declare function dshRoot(entry: string): string;
/**
 * dsh's own Schemastery, resolved from dsh's entry script only, and accepted only when its real path lies inside
 * dsh's installation. Never from this plugin's folder, and never from a folder Node would also search (ancestor
 * `node_modules` such as `~/node_modules`, or the global folders), where an Executor Session could plant a copy that
 * would then run in the host. Undefined when dsh's copy cannot be found: the plugin then runs without the form.
 * @param entry - dsh's entry script (`process.argv[1]`).
 * @param loader - Node's module functions.
 */
export declare function schemasteryFromDsh(entry: string | undefined, loader: DshModuleLoader): SchemaBuilder | undefined;
/**
 * The thread service's view of the config: every key is a getter that reads the current value (a change made on the
 * Plugins page applies to the next read) and sanitizes it with `parseConfig`, so the form can never widen what a
 * profile patch could not. `threadsRoot` is read once, as it was at load.
 * @param raw - the config dsh passed to the service (with Volatile references for volatile fields).
 * @param env - environment for the dev overrides of parseConfig.
 */
export declare function liveConfig(raw: unknown, env: Record<string, string | undefined>, onChange?: (key: string, value: unknown) => void): CoordinatorConfig;

/**
 * Report whether the `auto` permission preset is live. The plugin's bundle layer inserts the shipped
 * @deepseek-ai/dsh-experimental-auto-review row (cordis.patch.yml), so `auto` is normally present. When the user
 * disabled that row, threads run on `workspace-write` (Ask me); this module makes that visible in the host log. The
 * thread service applies the presets themselves (permission.ts).
 */
import type { Context } from '@deepseek-ai/cordis';
export declare function watchAutoMode(ctx: Context, say: (message: string) => void): void;

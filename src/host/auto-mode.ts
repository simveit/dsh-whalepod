/**
 * Report whether the `auto` permission preset is live. The plugin's bundle layer inserts the shipped
 * @deepseek-ai/dsh-experimental-auto-review row (cordis.patch.yml), so `auto` is normally present. When the user
 * disabled that row, threads run on `workspace-write` (Ask me); this module makes that visible in the host log. The
 * thread service applies the presets themselves (permission.ts).
 */
import type { Context } from '@deepseek-ai/cordis'

/** `ctx.permissionPresets` (dsh-permission-presets): only the members read here. */
interface PresetCatalog { readonly names: readonly string[] }

/** Quiet time after mount before the first report, so a sibling row that mounts a moment later is not reported missing. */
const SETTLE_MS = 2000

export function watchAutoMode(ctx: Context, say: (message: string) => void): void {
  ctx.inject(['permissionPresets' as never], (child) => {
    const presets = child.get('permissionPresets' as never) as PresetCatalog | undefined
    let last: boolean | undefined
    const report = (): void => {
      const live = presets?.names.includes('auto') === true
      if (live === last) return
      last = live
      say(live
        ? 'auto permission preset available; threads run in auto mode'
        : 'auto permission preset NOT available: threads run in Ask me (workspace-write) and ask the user before writing outside their folder. '
          + 'Re-enable the `auto-review` row (@deepseek-ai/dsh-experimental-auto-review) in the profile and restart.')
    }
    const timer = setTimeout(report, SETTLE_MS)
    child.effect(() => () => clearTimeout(timer), 'dsh-coordinator: auto mode first report')
    child.on('permission-presets/catalog-changed' as never, (() => { if (last !== undefined) report() }) as never)
  })
}

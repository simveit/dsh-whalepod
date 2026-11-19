/**
 * Whether Matriarc has a navigator, and which plugins to suggest when it has none. Copied from dsh-matriarc
 * (src/host/hint.ts `navigatorsOf`, src/client/candidates.ts `candidates`), so the notice matches Matriarc's own
 * "Enable Matriarc" row; not imported, since one plugin does not depend on another.
 */

/** dsh-package-manifest/src/types.ts:44. */
export type LocalizedText = string | { readonly en: string; readonly [locale: string]: string }

/** The fields of one Plugins page bundle the notice reads (dsh-plugin-manager/src/types.ts:73-119). */
export interface BundleSummary {
  readonly name: string
  readonly enabled: boolean
  readonly listedByDefault?: boolean
  readonly error?: unknown
  readonly meta?: { readonly title?: LocalizedText }
}

const NAVIGATOR_ID = /^[A-Za-z0-9][\w.:@/-]{0,63}$/
const PREFIX = '@deepseek-ai/dsh-subagent-'

/** The navigators from the `/matriarc` command's input hint: `[on [a|b]|off]`, or `[on|off]` with none. */
export function navigatorsOf(hint: string | undefined): string[] {
  const match = /^\[on \[([^\]]+)\]\|off\]$/.exec(hint ?? '')
  return match === null ? [] : match[1]!.split('|').filter(id => NAVIGATOR_ID.test(id))
}

/** Subagent provider bundles that are not switched on, excluding in-process ones, in the Plugins page's order. */
export function candidates(bundles: readonly BundleSummary[]): { name: string; title: LocalizedText }[] {
  return bundles
    .filter(bundle => bundle.name.startsWith(PREFIX) && !bundle.name.endsWith('-in-process') && !bundle.enabled && bundle.error === undefined && bundle.listedByDefault !== false)
    .map(bundle => ({ name: bundle.name, title: bundle.meta?.title ?? bundle.name.slice(PREFIX.length) }))
}

/** The notice to show: no navigator is listed. `candidates` resolved to titles; `canOpen` when the Plugins page can be opened. */
export interface NavigatorNotice { candidates: { name: string; title: string }[]; canOpen: boolean }

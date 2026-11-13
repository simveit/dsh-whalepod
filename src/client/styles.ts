/**
 * Plugin styles. dsh's plugin guidance: style only with the host's `--dsw-*` theme tokens, copy the markup and CSS
 * of host primitives under the plugin's own prefix instead of importing Harness client packages, and take spacing,
 * type and row patterns from a host page of the same kind. Sources (dsh 0.2.2, MIT):
 *   page, heading, rows, empty state, notice  ui-schedule TaskManagerPage.module.css (Automation tasks page)
 *   heading intro                             ui-plugin-manager PluginManagerPage.module.css (Plugins page)
 *   button, state dot, tooltip bubble, pill   ui-primitives Button / StateDot / Tooltip / Pill .module.css
 *   header icon button                        ui-schedule ScheduleCatalogAction.module.css
 *   message origin line                       experimental liveshare user-origin.module.css
 *   sidebar row icon, hover card section      experimental forge SessionList.module.css, ui-schedule SessionScheduleMark
 *   text field                                ui-primitives Input .module.css (28px, radius-sm, hairline border)
 *   settings rows (folder, executor prompt)   settings dialog PreferenceRow (title 14, description 12 tertiary, hairlines)
 *   coordinator monogram tile                 Plugins page icon tiles (radius, hairline), toned with dsh palette tokens
 *   empty-state picture                       Automation tasks empty state, painted with --dsw-alias-illustration-*
 * Motion uses dsh's --ds-ease-in-out and --ds-transition-duration-fast; every animation stops under reduced motion.
 * Hover feedback is enabled only under `(hover: hover)`; focus rings come from dsh's global `:focus-visible` rule.
 * Feature CSS keeps font weight at or below 500.
 *
 * Inlined as a string because the client bundle has no CSS pipeline; `apply` mounts it as one <style> element and
 * removes it on unload.
 */
export const STYLE_ID = 'dsh-coordinator-styles'

export const CSS = `
.dco-page { display: flex; width: 100%; height: 100%; min-width: 0; min-height: 0; overflow: hidden; color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-base); font-size: 14px; line-height: 1.6; }
.dco-scroll { container-type: inline-size; flex: 1; min-width: 0; min-height: 0; overflow: auto; scrollbar-gutter: stable; --dsh-scrollbar-width: 9px; --dsh-scrollbar-thumb-border: 2px; }
.dco-content { max-width: 960px; margin: 0 auto; padding: 0 clamp(24px, 4vw, 48px) 48px; }
@media (max-width: 767px) { .dco-content { padding-inline: 20px; } }

/* Page head: title and intro left, actions right, the permission control on its own row below. */
.dco-head { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 12px 16px; padding-top: 28px; margin-bottom: 24px; }
[data-platform='darwin'] .dco-head { padding-top: calc(28px + var(--dsh-frame-top-clearance, 0px)); }
.dco-heading { flex: 1 1 280px; min-width: 0; max-width: 100%; }
.dco-heading h1 { margin: 0; font-size: 20px; line-height: 28px; font-weight: 500; }
.dco-heading h1:focus { outline: none; }
.dco-intro { margin: 4px 0 0; max-width: 640px; font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-secondary); }
.dco-head-perm { flex: 1 0 100%; min-width: 0; }
.dco-head-perm .dco-perm { margin-top: 0; }
.dco-actions { display: flex; flex: none; align-items: center; gap: 8px; white-space: nowrap; }
.dco-summary { display: flex; flex-wrap: wrap; gap: 2px 14px; margin: 6px 0 0; min-height: 20px; font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-tertiary); font-variant-numeric: tabular-nums; }
.dco-stat { display: inline-flex; align-items: center; gap: 6px; }
.dco-stat::before { content: ''; flex: none; width: 6px; height: 6px; border-radius: 50%; background: var(--dsw-alias-label-caption); }
.dco-stat[data-tone='warning'] { color: var(--dsw-alias-state-warn-label, var(--dsw-alias-state-warn-primary)); }
.dco-stat[data-tone='warning']::before { background: var(--dsw-alias-state-warn-primary); }
.dco-stat[data-tone='running']::before { box-sizing: border-box; background: transparent; box-shadow: inset 0 0 0 1.5px var(--dsw-alias-label-tertiary); }
.dco-summary-attn { color: var(--dsw-alias-state-warn-label, var(--dsw-alias-state-warn-primary)); }
.dco-meta + .dco-meta::before { content: ' · '; padding: 0 2px; color: var(--dsw-alias-label-caption); }
.dco-dev-note { margin: -8px 0 16px; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-caption); }

.dco-btn { box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; gap: 4px; border: none; border-radius: var(--dsw-radius-md); cursor: pointer; font: inherit; font-size: 14px; line-height: 22px; color: var(--dsw-alias-label-primary); background: transparent; padding: 0 14px; height: 36px; white-space: nowrap; transition: background-color var(--ds-transition-duration-fast, 0.1s) var(--ds-ease-in-out, ease-in-out); }
.dco-btn:disabled { cursor: not-allowed; opacity: 0.4; }
.dco-btn[aria-busy='true'] { cursor: progress; }
.dco-btn-sm { height: 28px; font-size: 12px; line-height: 18px; padding: 0 10px; border-radius: var(--dsw-radius-sm); }
.dco-btn-head { height: 32px; font-size: 13px; line-height: 20px; padding: 0 12px; border-radius: 16px; }
.dco-btn-primary { background: var(--dsw-alias-button-primary-fill); color: var(--dsw-alias-label-primary-foreground); }
.dco-btn-outline { border: 0.5px solid transparent; box-shadow: inset 0 0 0 var(--dsh-hairline-width, 0.5px) var(--dsh-button-outline-color, var(--dsw-alias-border-l3)); }
.dco-btn-ghost:active:not(:disabled) { background: var(--dsw-alias-interactive-bg-active); }
.dco-btn-icon { display: inline-flex; width: 16px; height: 16px; align-items: center; justify-content: center; flex: none; }
.dco-quiet-btn { color: var(--dsw-alias-label-secondary); }
.dco-head .dco-quiet-btn { height: 32px; font-size: 13px; border-radius: 16px; }
@media (hover: hover) {
  .dco-btn-primary:hover:not(:disabled) { background: var(--dsw-alias-button-primary-hover); }
  .dco-btn-ghost:hover:not(:disabled), .dco-btn-outline:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }
  .dco-quiet-btn:hover:not(:disabled) { color: var(--dsw-alias-label-primary); }
}

/* Notices: a quiet fill, a toned icon, the text in two inks. */
.dco-notice { display: flex; align-items: flex-start; flex-wrap: wrap; gap: 9px; margin: 0 0 16px; padding: 12px 14px; border-radius: var(--dsw-radius-md); background: var(--dsw-specific-sidebar-fill); color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 20px; overflow-wrap: anywhere; animation: dco-rise var(--ds-transition-duration, 0.2s) var(--ds-ease-in-out, ease-in-out); }
.dco-notice-icon { flex: none; display: inline-flex; height: 20px; align-items: center; color: var(--dsw-alias-label-tertiary); }
.dco-notice[data-tone='warning'] .dco-notice-icon { color: var(--dsw-alias-state-warn-primary); }
.dco-notice[data-tone='danger'] .dco-notice-icon { color: var(--dsw-alias-state-error-primary); }
.dco-notice-text { flex: 1 1 12em; min-width: 0; margin: 0; }
.dco-notice-text strong { font-weight: 500; color: var(--dsw-alias-label-primary); }
.dco-notice-detail { display: block; color: var(--dsw-alias-label-tertiary); }
.dco-notice-actions { display: flex; gap: 8px; margin-left: auto; align-self: center; }
@keyframes dco-rise { from { opacity: 0; transform: translateY(-2px); } }

/* Executor rows (page): glyph, title and time, status and detail, folder. */
.dco-list { display: flex; flex-direction: column; gap: 2px; margin: 0; padding: 0; list-style: none; }
.dco-item { position: relative; }
.dco-row { display: flex; align-items: flex-start; gap: 12px; width: 100%; box-sizing: border-box; padding: 8px; border: 0; border-radius: var(--dsw-radius-md); background: transparent; color: inherit; font: inherit; text-align: left; white-space: normal; cursor: pointer; transition: background-color var(--ds-transition-duration-fast, 0.1s) var(--ds-ease-in-out, ease-in-out); }
.dco-row:focus-visible { outline-offset: -2px; }
.dco-row:active { background: var(--dsw-alias-interactive-bg-active); }
.dco-item[data-archivable] .dco-row { padding-right: 44px; }
/* With a mouse the archive button takes the time's place on hover, so every row keeps its time in one column. */
@media (hover: hover) {
  .dco-item[data-archivable] .dco-row { padding-right: 8px; }
  .dco-item[data-archivable]:hover .dco-row-time, .dco-item[data-archivable]:focus-within .dco-row-time { visibility: hidden; }
}
@media (hover: hover) { .dco-row:hover { background: var(--dsw-alias-interactive-bg-hover); } }
.dco-glyph { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 22px; color: var(--dsw-alias-label-tertiary); }
.dco-row-content { display: flex; flex: 1; flex-direction: column; min-width: 0; }
.dco-row-line { display: flex; align-items: center; gap: 8px; min-width: 0; }
.dco-row-title { flex: 0 1 auto; min-width: 0; overflow: hidden; font-weight: 500; line-height: 22px; text-overflow: ellipsis; white-space: nowrap; }
.dco-row .dco-row-title { flex: 1 1 auto; }
.dco-row-time { flex: none; margin-left: auto; font-size: 12px; line-height: 22px; color: var(--dsw-alias-label-caption); font-variant-numeric: tabular-nums; white-space: nowrap; }
.dco-row-summary { display: -webkit-box; margin-top: 1px; overflow: hidden; color: var(--dsw-alias-label-tertiary); font-size: 13px; line-height: 20px; overflow-wrap: anywhere; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.dco-status[data-attention] { color: var(--dsw-alias-state-warn-label, var(--dsw-alias-state-warn-primary)); }
.dco-status[data-tone='danger'] { color: var(--dsw-alias-state-error-primary); }
.dco-row-path { display: block; overflow: hidden; color: var(--dsw-alias-label-caption); font-size: 12px; line-height: 18px; text-overflow: ellipsis; white-space: nowrap; direction: rtl; text-align: left; }
.dco-row-path > bdi { direction: ltr; unicode-bidi: isolate; }
.dco-item[data-finished] .dco-row-title { color: var(--dsw-alias-label-tertiary); }
.dco-item[data-finished] .dco-row-summary { color: var(--dsw-alias-label-caption); }
@media (hover: hover) {
  .dco-item[data-finished]:hover .dco-row-title { color: inherit; }
  .dco-item[data-finished]:hover .dco-row-summary { color: var(--dsw-alias-label-tertiary); }
}
.dco-item[data-finished] .dco-row:focus-visible .dco-row-title { color: inherit; }

.dco-icon-btn { display: inline-flex; flex: none; align-items: center; justify-content: center; width: 28px; height: 28px; padding: 0; border: 0; border-radius: 28px; background: transparent; color: var(--dsw-alias-label-tertiary); cursor: pointer; transition: background-color var(--ds-transition-duration-fast, 0.1s) var(--ds-ease-in-out, ease-in-out), color var(--ds-transition-duration-fast, 0.1s) var(--ds-ease-in-out, ease-in-out); }
.dco-icon-btn-sm { width: 24px; height: 24px; border-radius: var(--dsw-radius-sm); }
.dco-icon-btn:focus-visible { color: var(--dsw-alias-label-secondary); background: var(--dsw-alias-interactive-bg-hover); }
.dco-icon-btn:disabled { cursor: progress; opacity: 0.4; }
@media (hover: hover) { .dco-icon-btn:hover:not(:disabled) { color: var(--dsw-alias-label-secondary); background: var(--dsw-alias-interactive-bg-hover); } }
.dco-archive { position: absolute; top: 5px; right: 4px; }
.dco-row-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; margin: -2px 0 6px; padding: 0 8px 0 36px; }
.dco-row-actions[data-compact] { margin: -2px 0 6px; padding: 0 8px 0 30px; }
.dco-row-actions-note { flex: 1 1 18em; min-width: 0; margin: 0; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); overflow-wrap: anywhere; }
.dco-row-actions-path { color: var(--dsw-alias-label-secondary); font-family: var(--ds-font-family-code, ui-monospace, monospace); }
.dco-row-actions-buttons { display: inline-flex; flex-wrap: wrap; gap: 8px; margin-left: auto; }
.dco-row-actions[data-compact] .dco-row-actions-buttons { margin-left: 0; }
@media (hover: hover) {
  .dco-item .dco-archive { opacity: 0; }
  .dco-item:hover .dco-archive, .dco-item:focus-within .dco-archive, .dco-archive:disabled { opacity: 1; }
}

/* Page sections (Without coordinator, Allowed folders) and the executor list heading. */
.dco-section { margin-top: 32px; }
.dco-section-title { margin: 0; font-size: 14px; line-height: 22px; font-weight: 500; color: var(--dsw-alias-label-primary); }
.dco-section-desc { margin: 2px 0 8px; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
.dco-section-count { font-size: 13px; line-height: 22px; color: var(--dsw-alias-label-caption); font-variant-numeric: tabular-nums; }
.dco-allowed-list { margin: 0; padding: 0; list-style: none; }
.dco-allowed-item { display: flex; align-items: center; gap: 8px; min-height: 36px; padding: 0 0 0 8px; border-radius: var(--dsw-radius-sm); }
.dco-allowed-path { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; direction: rtl; text-align: left; font-size: 13px; color: var(--dsw-alias-label-secondary); }
.dco-allowed-path > bdi { direction: ltr; unicode-bidi: isolate; }
.dco-threads-head { display: flex; align-items: baseline; gap: 8px; margin: 0 0 2px; padding: 0 8px; }
.dco-tgroup { margin-top: 4px; }
.dco-tgroup-toggle { box-sizing: border-box; width: 100%; height: 28px; margin-top: 8px; border: 0; border-radius: var(--dsw-radius-md); background: transparent; font: inherit; font-size: 12px; text-align: left; cursor: pointer; }
.dco-tgroup-toggle:focus-visible { outline-offset: -2px; }
@media (hover: hover) { .dco-tgroup-toggle:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-secondary); } }
.dco-archived-note { margin: 2px 8px 4px; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-caption); }
.dco-row-static { cursor: default; }
@media (hover: hover) { .dco-row-static:hover { background: transparent; } .dco-item[data-archived-row]:hover .dco-row-title { color: var(--dsw-alias-label-tertiary); } }
.dco-confirm-quiet { color: var(--dsw-alias-label-tertiary); }
.dco-tgroup-head { display: flex; align-items: center; gap: 6px; margin: 8px 0 2px; padding: 0 8px; font-size: 12px; line-height: 18px; font-weight: 400; color: var(--dsw-alias-label-tertiary); }

.dco-dot { position: relative; display: inline-block; flex: none; width: 10px; height: 10px; }
.dco-dot::after { content: ''; position: absolute; inset: 20%; border-radius: 50%; background: currentColor; }
.dco-dot[data-state='done'] { color: var(--dsw-alias-state-success-primary); }
.dco-dot[data-state='warning'] { color: var(--dsw-alias-state-warn-primary); }
.dco-dot[data-state='error'] { color: var(--dsw-alias-state-error-primary); }
.dco-dot[data-state='idle'] { color: var(--dsw-alias-state-idle-primary); }
.dco-spinner { flex: none; color: var(--dsw-alias-label-tertiary); }
.dco-spinner-motion { transform-origin: center; animation: dco-spin 1.5s linear infinite; }
.dco-spinner-track, .dco-spinner-arc { fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; }
.dco-spinner-track { opacity: 0.25; }
.dco-spinner-arc { stroke-dasharray: 12 150; animation: dco-dash 1.5s ease-in-out infinite; }
@keyframes dco-spin { to { transform: rotate(360deg); } }
@keyframes dco-dash { 0% { stroke-dasharray: 12 150; stroke-dashoffset: 0; } 50% { stroke-dasharray: 24 150; stroke-dashoffset: -6; } 100% { stroke-dasharray: 12 150; stroke-dashoffset: 0; } }

/* Empty states: dsh's empty-state art, a quiet title, one line of help, one action. */
.dco-empty { display: flex; align-items: center; flex-direction: column; padding: 48px 20px; text-align: center; color: var(--dsw-alias-label-tertiary); font-size: 14px; }
.dco-empty p { margin: 0; max-width: 420px; font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-caption); }
.dco-empty .dco-empty-title { margin-bottom: 4px; color: var(--dsw-alias-label-tertiary); font-size: 14px; line-height: 22px; }
.dco-empty-page { padding: 40px 20px 32px; }
.dco-empty-page .dco-art { margin-bottom: 16px; }
.dco-empty-actions { display: flex; gap: 8px; margin-top: 20px; }
.dco-empty-inline { padding: 28px 16px 32px; }
.dco-art-bg { fill: var(--dsw-alias-illustration-background); }
.dco-art-backing { fill: var(--dsw-alias-illustration-backing); }
.dco-art-surface { fill: var(--dsw-alias-illustration-surface); stroke: var(--dsw-alias-illustration-backing); stroke-width: 1; }
.dco-art-detail { fill: var(--dsw-alias-illustration-detail); }
.dco-art-shadow { fill: var(--dsw-alias-illustration-shadow); }
.dco-art-badge { fill: var(--dsw-alias-bg-base); stroke: var(--dsw-alias-illustration-detail); stroke-width: 1.5; }
.dco-art-node { fill: var(--dsw-alias-illustration-detail); }
.dco-art-line { stroke: var(--dsw-alias-illustration-detail); stroke-width: 1.5; stroke-linecap: round; fill: none; }

/* Loading placeholders. */
.dco-skeleton { display: flex; gap: 12px; padding: 8px; }
.dco-skeleton-lines { display: flex; flex: 1; flex-direction: column; gap: 6px; padding-top: 5px; }
.dco-skeleton-bar, .dco-skeleton-mono, .dco-skeleton-card { background: var(--dsw-alias-bg-skeleton, var(--dsw-alias-bg-module-platform)); animation: dco-pulse 1.4s ease-in-out infinite; }
.dco-skeleton-bar { height: 12px; border-radius: 6px; }
.dco-skeleton-bar:nth-child(1) { width: 40%; height: 14px; }
.dco-skeleton-bar:nth-child(2) { width: 75%; }
.dco-skeleton-bar:nth-child(3) { width: 30%; height: 10px; }
.dco-skeleton-dot { flex: none; width: 16px; height: 22px; }
.dco-skeleton-mono { flex: none; width: 28px; height: 28px; border-radius: var(--dsw-radius-sm); }
.dco-skeleton-mono-lg { width: 40px; height: 40px; border-radius: var(--dsw-radius-md); }
.dco-skeleton-crow { align-items: center; padding: 10px; }
.dco-skeleton-crow .dco-skeleton-lines { padding-top: 0; }
.dco-skeleton-crow .dco-skeleton-bar:nth-child(1) { width: 55%; }
.dco-skeleton-crow .dco-skeleton-bar:nth-child(2) { width: 40%; }
.dco-skeleton-head { align-items: center; padding: 0 0 16px; }
.dco-skeleton-head .dco-skeleton-lines { padding-top: 0; }
.dco-skeleton-head .dco-skeleton-bar:nth-child(1) { width: 30%; height: 16px; }
.dco-skeleton-head .dco-skeleton-bar:nth-child(2) { width: 45%; }
.dco-skeleton-card { height: 128px; margin: 0 0 24px; border-radius: var(--dsw-radius-md); opacity: 0.6; }
.dco-loading-note { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
@keyframes dco-pulse { 50% { opacity: 0.45; } }

.dco-tooltip { position: fixed; z-index: 1100; display: inline-flex; align-items: center; box-sizing: border-box; width: max-content; max-width: min(50vw, calc(100vw - 24px)); padding: 3px 7px; border-radius: var(--dsw-radius-sm); background: var(--dsw-alias-tooltip-bg); color: var(--dsw-alias-tooltip-label, var(--dsw-static-neutral-bluish-00)); font-size: 13px; line-height: 20px; white-space: pre-line; overflow-wrap: break-word; pointer-events: none; transform: translateX(-50%); animation: dco-fade 150ms var(--ds-ease-in-out, ease-in-out); }
.dco-tooltip[data-align='end'] { transform: translateX(-100%); }
@keyframes dco-fade { from { opacity: 0; } }

.dco-panel-icon { position: relative; display: inline-flex; }
.dco-badge { position: absolute; top: -5px; right: -7px; min-width: 14px; height: 14px; box-sizing: border-box; padding: 0 3px; border-radius: 7px; font-size: 9px; line-height: 14px; font-weight: 500; text-align: center; font-variant-numeric: tabular-nums; background: var(--dsw-alias-state-warn-primary); color: var(--dsw-static-neutral-bluish-00); box-shadow: 0 0 0 1.5px var(--dsw-specific-sidebar-fill, var(--dsw-alias-bg-base)); }

.dco-header { position: relative; }
.dco-header-dot { position: absolute; top: 4px; right: 4px; width: 6px; height: 6px; border-radius: 50%; background: var(--dsw-alias-state-warn-primary); box-shadow: 0 0 0 1.5px var(--dsw-alias-bg-base); pointer-events: none; }

.dco-origin { align-self: flex-end; display: inline-flex; align-items: center; gap: 4px; max-width: 100%; overflow: hidden; color: var(--dsw-alias-label-tertiary); font-size: var(--dsh-content-font-size-secondary, 13px); line-height: calc(18px + var(--dsh-content-font-delta-secondary, 0px)); white-space: nowrap; }
.dco-origin > span { overflow: hidden; text-overflow: ellipsis; }
.dco-origin svg { flex: none; }

.dco-welcome { display: flex; flex-direction: column; gap: 8px; padding: 4px 0 8px; }
.dco-welcome-title { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 14px; line-height: 22px; font-weight: 500; color: var(--dsw-alias-label-primary); }
.dco-welcome-title svg { color: var(--dsw-alias-label-secondary); }
.dco-welcome p { margin: 0; font-size: var(--dsh-content-font-size, 14px); line-height: 1.6; color: var(--dsw-alias-label-secondary); }
.dco-welcome-label { margin-top: 4px; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
.dco-welcome-examples { display: flex; flex-wrap: wrap; gap: 8px; margin: 0; padding: 0; list-style: none; }
.dco-pill { display: inline-flex; align-items: center; max-width: 100%; min-height: 28px; box-sizing: border-box; padding: 4px 10px; border: none; border-radius: var(--dsw-radius-sm); font: inherit; font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-secondary); background: transparent; box-shadow: inset 0 0 0 var(--dsh-hairline-width, 0.5px) var(--dsw-alias-border-l3); text-align: left; cursor: pointer; }
@media (hover: hover) { .dco-pill:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); } }
.dco-welcome-hint { font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-caption); }
.dco-welcome .dco-perm-note { margin: 4px 0 0; }
.dco-empty .dco-perm-note { max-width: 460px; margin: 28px 0 0; text-align: left; }
.dco-perm { margin-top: 10px; }
.dco-perm-row { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 12px; }
.dco-perm-label { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-secondary); }
.dco-perm-label svg { color: var(--dsw-alias-label-tertiary); }
.dco-seg { display: inline-flex; gap: 2px; padding: 2px; border-radius: var(--dsw-radius-md); background: var(--dsw-specific-sidebar-fill); }
.dco-seg-option { display: inline-flex; align-items: center; gap: 4px; height: 28px; padding: 0 10px; border: none; border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-tertiary); font: inherit; font-size: 13px; line-height: 20px; font-weight: 500; cursor: pointer; white-space: nowrap; transition: color var(--ds-transition-duration-fast, 0.1s) var(--ds-ease-in-out, ease-in-out); }
.dco-seg-option[aria-checked='true'] { background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); box-shadow: inset 0 0 0 var(--dsh-hairline-width, 0.5px) var(--dsw-alias-border-l3); }
.dco-seg-option:disabled { cursor: default; color: var(--dsw-alias-label-dimmed, var(--dsw-alias-label-caption)); }
.dco-seg-option:focus-visible { box-shadow: 0 0 0 2px var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); outline: none; }
@media (hover: hover) { .dco-seg-option:hover:not(:disabled):not([aria-checked='true']) { color: var(--dsw-alias-label-secondary); } }
.dco-seg-badge { color: var(--dsw-alias-label-tertiary); font-size: 8px; line-height: 10px; font-weight: 500; letter-spacing: 0.2px; }
.dco-perm-desc { max-width: 640px; margin: 6px 0 0; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
.dco-perm-confirm { margin: 10px 0 0; max-width: 640px; }
.dco-perm-ack { display: flex; align-items: flex-start; gap: 6px; margin-top: 6px; color: var(--dsw-alias-label-secondary); cursor: pointer; }
.dco-perm-ack input { margin: 4px 0 0; }
.dco-perm-error { margin: 6px 0 0; font-size: 12px; color: var(--dsw-alias-state-error-primary); }

@container (max-width: 520px) {
  .dco-head > .dco-actions { width: 100%; flex-wrap: wrap; }
  .dco-row .dco-row-title { display: -webkit-box; white-space: normal; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow-wrap: anywhere; }
}

/* Coordinator identity: a monogram tile toned from the name (dsh palette tokens only). */
.dco-mono { --dco-tone: var(--dsw-static-blue-500); display: inline-flex; flex: none; align-items: center; justify-content: center; box-sizing: border-box; width: 28px; height: 28px; border-radius: var(--dsw-radius-sm); background: color-mix(in srgb, var(--dco-tone) 12%, transparent); box-shadow: inset 0 0 0 var(--dsh-hairline-width, 0.5px) color-mix(in srgb, var(--dco-tone) 26%, transparent); color: color-mix(in srgb, var(--dco-tone) 76%, var(--dsw-alias-label-primary)); font-size: 13px; line-height: 1; font-weight: 500; user-select: none; }
.dco-mono[data-tone='blue'] { --dco-tone: var(--dsw-static-blue-500); }
.dco-mono[data-tone='violet'] { --dco-tone: var(--dsw-alias-chart-tools); }
.dco-mono[data-tone='green'] { --dco-tone: var(--dsw-static-green-500); }
.dco-mono[data-tone='slate'] { --dco-tone: var(--dsw-static-neutral-bluish-600); }
.dco-mono[data-tone='muted'] { --dco-tone: var(--dsw-alias-label-caption); color: var(--dsw-alias-label-tertiary); }
.dco-mono[data-size='xs'] { width: 18px; height: 18px; border-radius: 5px; font-size: 10px; }
.dco-mono[data-size='md'] { width: 32px; height: 32px; font-size: 14px; }
.dco-mono[data-size='lg'] { width: 40px; height: 40px; border-radius: var(--dsw-radius-md); font-size: 17px; }
.dco-tag { flex: none; padding: 0 6px; border-radius: var(--dsw-radius-xs); background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 18px; font-weight: 400; white-space: nowrap; }

/* Threads side pane (a right-Sidebar tab). Row geometry follows the left sidebar's session rows (radius-md, hover
   fill, selected = hover fill); group headers follow its section labels. */
.dco-pane { box-sizing: border-box; display: flex; flex-direction: column; gap: 4px; height: 100%; min-width: 0; min-height: 0; overflow: auto; padding: 8px 8px 16px; color: var(--dsw-alias-label-primary); font-size: 13px; line-height: 20px; scrollbar-gutter: stable; --dsh-scrollbar-width: 9px; --dsh-scrollbar-thumb-border: 2px; }
.dco-pane-top { display: flex; align-items: center; gap: 4px; }
.dco-pane-top .dco-pane-coord { flex: 1; min-width: 0; }
.dco-pane-title-icon { flex: none; }
.dco-pane-groups { display: flex; flex-direction: column; gap: 8px; }
.dco-pgroup { display: flex; flex-direction: column; }
.dco-pgroup-head { display: flex; align-items: center; gap: 6px; box-sizing: border-box; width: 100%; height: 28px; margin: 0; padding: 0 8px; border: 0; border-radius: var(--dsw-radius-md); background: transparent; color: var(--dsw-alias-label-tertiary); font: inherit; font-size: 12px; line-height: 18px; font-weight: 400; text-align: left; }
.dco-pgroup-toggle { cursor: pointer; }
.dco-pgroup-toggle:focus-visible { outline-offset: -2px; }
@media (hover: hover) { .dco-pgroup-toggle:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-secondary); } }
.dco-pgroup-count { color: var(--dsw-alias-label-caption); font-variant-numeric: tabular-nums; }
.dco-pgroup-count[data-attention] { color: var(--dsw-alias-state-warn-primary); }
.dco-pgroup-chevron { display: inline-flex; margin-left: auto; transform: rotate(-90deg); transition: transform 150ms var(--ds-ease-in-out, ease-in-out); }
.dco-pgroup-chevron[data-expanded] { transform: none; }
.dco-plist { display: flex; flex-direction: column; gap: 1px; margin: 0; padding: 0; list-style: none; }
.dco-prow { display: flex; align-items: flex-start; gap: 8px; box-sizing: border-box; width: 100%; min-height: 32px; padding: 6px 8px; border: 0; border-radius: var(--dsw-radius-md); background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; transition: background-color var(--ds-transition-duration-fast, 0.1s) var(--ds-ease-in-out, ease-in-out); }
.dco-prow:focus-visible { outline-offset: -2px; }
.dco-prow:active { background: var(--dsw-alias-interactive-bg-active); }
.dco-prow[aria-current] { background: var(--dsw-alias-interactive-bg-hover); cursor: default; }
@media (hover: hover) { .dco-prow:hover { background: var(--dsw-alias-interactive-bg-hover); } }
.dco-prow .dco-glyph { height: 20px; }
.dco-pane-coord { align-items: center; min-height: 36px; }
.dco-pane-coord .dco-glyph { color: var(--dsw-alias-label-secondary); }
.dco-pane-coord .dco-prow-title { font-weight: 500; }
.dco-pane-coord[data-archived] .dco-prow-title { color: var(--dsw-alias-label-tertiary); }
.dco-prow-content { display: flex; flex: 1; flex-direction: column; min-width: 0; }
.dco-prow-line { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
.dco-prow-title { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dco-prow .dco-row-time { line-height: 20px; }
.dco-prow-status { display: block; overflow: hidden; color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; text-overflow: ellipsis; white-space: nowrap; }
.dco-pitem[data-finished] .dco-prow-title { color: var(--dsw-alias-label-tertiary); }
@media (hover: hover) { .dco-pitem[data-finished]:hover .dco-prow-title { color: inherit; } }
.dco-pane-note { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 4px 0; padding: 0 8px; color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; overflow-wrap: anywhere; }
.dco-pane-note[data-tone='danger'] svg { flex: none; color: var(--dsw-alias-state-error-primary); }
.dco-pskeleton { display: flex; flex-direction: column; gap: 6px; padding: 8px 8px 8px 32px; }
.dco-pskeleton .dco-skeleton-bar:nth-child(1) { width: 60%; height: 12px; }
.dco-pskeleton .dco-skeleton-bar:nth-child(2) { width: 40%; height: 10px; }

/* Coordinators: list and the selected coordinator's detail; two columns from 900px of page width, stacked below. */
.dco-coords { display: flex; flex-direction: column; gap: 20px; }
@container (min-width: 900px) {
  .dco-coords { display: grid; grid-template-columns: 240px minmax(0, 1fr); gap: 32px; align-items: start; }
  .dco-coords > .dco-clist { position: sticky; top: 16px; }
}
.dco-clist { display: flex; flex-direction: column; gap: 2px; margin: 0; padding: 0; list-style: none; }
.dco-crow { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 52px; box-sizing: border-box; padding: 8px 10px 8px 8px; border: 0; border-radius: var(--dsw-radius-md); background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; transition: background-color var(--ds-transition-duration-fast, 0.1s) var(--ds-ease-in-out, ease-in-out); }
.dco-crow:focus-visible { outline-offset: -2px; }
.dco-crow:active { background: var(--dsw-alias-interactive-bg-active); }
.dco-crow[aria-current='true'] { background: var(--dsw-alias-interactive-bg-hover); }
@media (hover: hover) { .dco-crow:hover { background: var(--dsw-alias-interactive-bg-hover); } }
.dco-crow .dco-row-title { line-height: 20px; }
.dco-crow-meta { display: block; color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; overflow-wrap: anywhere; font-variant-numeric: tabular-nums; }
.dco-crow-flag { display: inline-flex; flex: none; color: var(--dsw-alias-state-warn-primary); }
.dco-citem[data-archived] .dco-row-title { color: var(--dsw-alias-label-tertiary); }
.dco-detail { min-width: 0; }
.dco-detail-head { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; margin-bottom: 16px; }
.dco-detail-id { display: flex; flex: 1 1 14em; flex-direction: column; min-width: 0; }
.dco-name-line { display: flex; align-items: center; gap: 6px; min-width: 0; }
.dco-detail-title { flex: 0 1 auto; min-width: 0; margin: 0; overflow: hidden; font-size: 16px; line-height: 24px; font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
.dco-detail[data-archived] .dco-detail-title { color: var(--dsw-alias-label-secondary); }
.dco-detail-sub { margin: 0; overflow: hidden; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); text-overflow: ellipsis; white-space: nowrap; }
.dco-detail-actions { display: inline-flex; align-items: center; gap: 4px; margin-left: auto; }
.dco-rename-btn { width: 24px; height: 24px; color: var(--dsw-alias-label-caption); }
.dco-rename { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.dco-input.dco-rename-input { flex: none; width: min(100%, 320px); height: 30px; font-size: 15px; font-weight: 500; }
.dco-rename ~ .dco-detail-sub { display: none; }
.dco-rename-hint { margin: 0; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
.dco-rename-hint[data-tone='danger'] { color: var(--dsw-alias-state-error-primary); }
.dco-detail .dco-notice { margin-bottom: 12px; }

/* The detail's settings: rows in a hairline card, as dsh's settings rows (title, description, control). */
.dco-settings { margin: 0 0 24px; border-radius: var(--dsw-radius-md); box-shadow: inset 0 0 0 var(--dsh-hairline-width, 0.5px) var(--dsw-alias-border-l3); }
.dco-settings > * + * { border-top: var(--dsh-hairline-width, 0.5px) solid var(--dsw-alias-border-l2); }
.dco-setting { display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px; }
.dco-setting-icon { flex: none; display: inline-flex; align-items: center; height: 22px; color: var(--dsw-alias-label-tertiary); }
.dco-setting-main { display: flex; flex: 1; flex-direction: column; min-width: 0; }
.dco-setting-title { font-size: 14px; line-height: 22px; font-weight: 500; color: var(--dsw-alias-label-primary); }
.dco-setting-desc { margin: 2px 0 0; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
.dco-folder-value { display: flex; min-width: 0; font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-secondary); }
.dco-folder-actions { display: inline-flex; flex: none; align-items: center; gap: 4px; }
.dco-setting > .dco-folder-actions { margin-top: -3px; }
.dco-folder:not([data-compact]) > .dco-pickwait, .dco-folder:not([data-compact]) > .dco-path, .dco-folder:not([data-compact]) > .dco-field-error { margin: -4px 16px 14px 44px; }
.dco-input.dco-textarea { flex: none; display: block; width: 100%; height: auto; min-height: 80px; max-height: 280px; field-sizing: content; margin-top: 10px; padding: 8px 10px; resize: vertical; font-size: 13px; line-height: 20px; white-space: pre-wrap; }
.dco-prompt-foot { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; margin-top: 8px; }
.dco-prompt-count { font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-caption); font-variant-numeric: tabular-nums; }
.dco-prompt-count[data-tone='danger'] { color: var(--dsw-alias-state-error-primary); }
.dco-prompt-state { font-size: 12px; line-height: 18px; }
.dco-saved { display: inline-flex; align-items: center; gap: 4px; color: var(--dsw-alias-state-success-primary); animation: dco-fade var(--ds-transition-duration, 0.2s) var(--ds-ease-in-out, ease-in-out); }
.dco-unsaved { color: var(--dsw-alias-label-tertiary); }
.dco-prompt-buttons { display: inline-flex; gap: 8px; margin-left: auto; }

/* Archive confirmation: a hairline card with the Executor Sessions it stops. */
.dco-confirm { margin: 0 0 16px; padding: 14px 16px; border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-base); box-shadow: inset 0 0 0 var(--dsh-hairline-width, 0.5px) var(--dsw-alias-border-l4, var(--dsw-alias-border-l3)); font-size: 13px; line-height: 20px; animation: dco-rise var(--ds-transition-duration, 0.2s) var(--ds-ease-in-out, ease-in-out); }
.dco-confirm-title { margin: 0; font-size: 14px; line-height: 22px; font-weight: 500; color: var(--dsw-alias-label-primary); }
.dco-confirm-body { margin: 2px 0 0; color: var(--dsw-alias-label-secondary); }
.dco-confirm-working { margin-top: 10px; }
.dco-confirm-list { display: flex; flex-direction: column; gap: 2px; margin: 6px 0 0; padding: 4px 0; list-style: none; border-radius: var(--dsw-radius-sm); background: var(--dsw-specific-sidebar-fill); }
.dco-confirm-list li { display: flex; align-items: center; gap: 8px; min-height: 28px; padding: 0 10px; }
.dco-confirm-list .dco-glyph { height: 20px; }
.dco-confirm-item { flex: 1; min-width: 0; overflow: hidden; color: var(--dsw-alias-label-primary); text-overflow: ellipsis; white-space: nowrap; }
.dco-confirm-status { flex: none; font-size: 12px; color: var(--dsw-alias-label-tertiary); }
.dco-confirm-refused { margin: 10px 0 0; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); overflow-wrap: anywhere; }
.dco-confirm-refused strong { font-weight: 500; color: var(--dsw-alias-state-warn-label, var(--dsw-alias-state-warn-primary)); }
.dco-check { display: flex; align-items: flex-start; gap: 8px; margin-top: 12px; color: var(--dsw-alias-label-secondary); cursor: pointer; }
.dco-check input { flex: none; margin: 3px 0 0; accent-color: var(--dsw-alias-button-primary-fill); }
.dco-check-note { display: block; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
.dco-confirm-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }

/* Folder choice: the side pane's folder line, the wait line of a pending pick, and the inline path field. */
.dco-folder-line { display: flex; align-items: center; gap: 6px; min-width: 0; min-height: 28px; font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-secondary); }
.dco-folder-icon { flex: none; display: inline-flex; color: var(--dsw-alias-label-tertiary); }
.dco-folder-path { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; direction: rtl; text-align: left; }
.dco-folder-path > bdi { direction: ltr; unicode-bidi: isolate; }
.dco-folder-change { flex: none; }
.dco-folder[data-compact] { margin: 0; padding: 0 0 0 8px; }
.dco-folder[data-compact] .dco-folder-line { font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
.dco-folder[data-compact] .dco-folder-actions { gap: 0; margin-left: auto; }
.dco-folder[data-compact] .dco-folder-change { padding: 0 8px; }
.dco-folder[data-compact] .dco-path { margin: 4px 0 8px; }
.dco-pickwait { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; margin: 0 0 16px; padding: 4px 4px 4px 12px; border-radius: var(--dsw-radius-md); background: var(--dsw-specific-sidebar-fill); color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; animation: dco-rise var(--ds-transition-duration, 0.2s) var(--ds-ease-in-out, ease-in-out); }
.dco-pickwait-icon { display: inline-flex; flex: none; }
.dco-pickwait-text { flex: 1 1 16em; min-width: 0; padding: 5px 0; }
.dco-pickwait-actions { display: inline-flex; flex: none; gap: 2px; margin-left: auto; }
.dco-pickwait[data-compact] { margin: 4px 0; padding-left: 8px; }
.dco-path { display: flex; flex-direction: column; gap: 4px; margin: 0 0 16px; max-width: 640px; animation: dco-rise var(--ds-transition-duration, 0.2s) var(--ds-ease-in-out, ease-in-out); }
.dco-path-label { font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-secondary); }
.dco-path-hint { margin: 0; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
.dco-path-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.dco-path-buttons { display: inline-flex; gap: 8px; margin-left: auto; }
.dco-input { box-sizing: border-box; flex: 1 1 16em; min-width: 0; height: 28px; padding: 0 8px; border: none; border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; line-height: 20px; box-shadow: inset 0 0 0 var(--dsh-hairline-width, 0.5px) var(--dsw-alias-border-l3); transition: box-shadow var(--ds-transition-duration-fast, 0.1s) var(--ds-ease-in-out, ease-in-out); }
.dco-input-mono { font-family: var(--ds-font-family-code, ui-monospace, monospace); font-size: 12px; }
.dco-input::placeholder { color: var(--dsw-alias-label-caption); }
.dco-input:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); }
.dco-input[aria-invalid='true'] { box-shadow: inset 0 0 0 1px var(--dsw-alias-state-error-primary); }
.dco-input:disabled { opacity: 0.6; }
@media (hover: hover) { .dco-input:hover:not(:disabled):not(:focus-visible) { box-shadow: inset 0 0 0 var(--dsh-hairline-width, 0.5px) var(--dsw-alias-border-l4, var(--dsw-alias-border-l3)); } }
.dco-field-error { margin: 4px 0 0; font-size: 12px; line-height: 18px; color: var(--dsw-alias-state-error-primary); overflow-wrap: anywhere; }
.dco-folder[data-compact] .dco-field-error { padding-left: 0; }
.dco-prow:disabled { cursor: default; }
.dco-prow:disabled .dco-prow-title { color: var(--dsw-alias-label-tertiary); }

/* Left-sidebar coordinator row: icon + count in the row's 20px line, warning ink while one needs the user. */
.dco-decor { display: inline-flex; flex: none; align-items: center; gap: 2px; height: 20px; color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 20px; font-variant-numeric: tabular-nums; }
.dco-decor[data-tone='warning'] { color: var(--dsw-alias-state-warn-primary); }
/* Its hover card section; the card surface is dark in both themes, so the hover card's own label tokens apply. */
.dco-hover { display: flex; align-items: flex-start; gap: 8px; min-width: 0; }
.dco-hover .dco-mono { color: color-mix(in srgb, var(--dco-tone) 55%, var(--dsw-alias-hovercard-label-primary, #fff)); background: color-mix(in srgb, var(--dco-tone) 30%, transparent); box-shadow: none; }
.dco-hover-body { display: flex; flex-direction: column; min-width: 0; }
.dco-hover-title { overflow: hidden; color: var(--dsw-alias-hovercard-label-primary, #fff); font-size: 12px; line-height: 18px; text-overflow: ellipsis; white-space: nowrap; }
.dco-hover-note { color: var(--dsw-alias-hovercard-label-tertiary, #adb2b8); font-size: 12px; line-height: 16px; }
.dco-hover-note [data-tone='warning'] { color: var(--dsw-static-orange-400, var(--dsw-alias-state-warn-secondary)); }
.dco-hover-sep { margin: 0 4px; }

@media (prefers-reduced-motion: reduce) {
  .dco-spinner-motion, .dco-spinner-arc, .dco-skeleton-bar, .dco-skeleton-mono, .dco-skeleton-card, .dco-tooltip, .dco-notice, .dco-confirm, .dco-pickwait, .dco-path, .dco-saved { animation: none; }
  .dco-pgroup-chevron, .dco-btn, .dco-row, .dco-crow, .dco-prow, .dco-icon-btn, .dco-input, .dco-seg-option { transition: none; }
  .dco-spinner-arc { stroke-dasharray: 18 150; stroke-dashoffset: -3; }
}

/* Settings on dsh's Plugins page (settings.tsx), laid out like dsh's own Subagent page. */
.dco-settings-section { min-width: 0; padding: 16px 0; }
.dco-settings-heading { margin: 0 0 12px; font-size: 13px; font-weight: 600; line-height: 1.5; color: var(--dsw-alias-label-primary); }
.dco-settings-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr)); gap: 16px; }
.dco-settings-grid > * { min-width: 0; }
.dco-settings-grid input { min-width: 0; font-variant-numeric: tabular-nums; }
.dco-settings-cell { min-width: 0; }
.dco-settings-choice { display: flex; flex-direction: column; gap: 6px; min-width: 0; padding-top: 12px; }
.dco-settings-choice-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 20px; }
.dco-settings-label { font-size: 13px; font-weight: 500; line-height: 20px; color: var(--dsw-alias-label-primary); }
.dco-settings-reset { border: 0; padding: 0; background: none; font: inherit; font-size: 12px; color: var(--dsw-alias-label-secondary); cursor: pointer; }
.dco-settings-reset:disabled { cursor: default; opacity: 0.5; }
.dco-settings-hint, .dco-settings-note { margin: 0; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
.dco-settings-note { padding-top: 4px; }
`

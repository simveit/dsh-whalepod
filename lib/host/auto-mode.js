/** Quiet time after mount before the first report, so a sibling row that mounts a moment later is not reported missing. */
const SETTLE_MS = 2000;
export function watchAutoMode(ctx, say) {
    ctx.inject(['permissionPresets'], (child) => {
        const presets = child.get('permissionPresets');
        let last;
        const report = () => {
            const live = presets?.names.includes('auto') === true;
            if (live === last)
                return;
            last = live;
            say(live
                ? 'auto permission preset available; threads run in auto mode'
                : 'auto permission preset NOT available: threads run in Ask me (workspace-write) and ask the user before writing outside their folder. '
                    + 'For Auto review, switch on "Auto authorization review" (@deepseek-ai/dsh-experimental-auto-review) in Plugins.');
        };
        const timer = setTimeout(report, SETTLE_MS);
        child.effect(() => () => clearTimeout(timer), 'dsh-coordinator: auto mode first report');
        child.on('permission-presets/catalog-changed', (() => { if (last !== undefined)
            report(); }));
    });
}

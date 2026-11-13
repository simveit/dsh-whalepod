/**
 * The empty-state picture of the Coordinator page, drawn in the manner of dsh's own empty-state art (the Automation
 * tasks page: a soft backdrop, stacked cards, a round badge, two sparkles) and painted only with dsh's illustration
 * tokens, so it follows the theme. The plugin's mascot is deliberately not used inside the app.
 */
export function CoordinatorArt({ small = false }: { small?: boolean }) {
  const w = small ? 84 : 112
  return <svg className="dco-art" width={w} height={w * 100 / 112} viewBox="0 0 112 100" fill="none" aria-hidden="true" focusable="false">
    <ellipse cx="57" cy="93" rx="27" ry="3" className="dco-art-shadow" />
    <rect x="12" y="20" width="88" height="64" rx="26" className="dco-art-bg" />
    <rect x="28" y="16" width="44" height="56" rx="8" transform="rotate(-9 50 44)" className="dco-art-backing" />
    <rect x="38" y="14" width="44" height="58" rx="8" className="dco-art-surface" />
    <rect x="46" y="25" width="5" height="3" rx="1.5" className="dco-art-detail" />
    <rect x="54" y="25" width="20" height="3" rx="1.5" className="dco-art-detail" />
    <rect x="46" y="34" width="5" height="3" rx="1.5" className="dco-art-detail" />
    <rect x="54" y="34" width="16" height="3" rx="1.5" className="dco-art-detail" />
    <rect x="46" y="43" width="5" height="3" rx="1.5" className="dco-art-detail" />
    <rect x="54" y="43" width="12" height="3" rx="1.5" className="dco-art-detail" />
    <circle cx="80" cy="64" r="14" className="dco-art-badge" />
    <path d="M80 56.5V61M80 61L74.5 68M80 61L85.5 68" className="dco-art-line" />
    <circle cx="80" cy="56.5" r="2.6" className="dco-art-node" />
    <circle cx="74.5" cy="68" r="2.6" className="dco-art-node" />
    <circle cx="85.5" cy="68" r="2.6" className="dco-art-node" />
    <path d="M94 12V18M91 15H97" className="dco-art-line" />
    <path d="M18 70V74M16 72H20" className="dco-art-line" />
  </svg>
}

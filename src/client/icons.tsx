/**
 * Product glyphs used by the panel, copied from the dsh 0.2.2 icon artwork (ui-primitives `icons/artwork.ts`,
 * regular weight, 1px stroke) instead of importing the Harness client package, as dsh's plugin guidance asks.
 * They paint with `currentColor`, so the surrounding ink sets their colour in both themes.
 */
import type { ReactNode } from 'react'

export interface IconProps {
  size?: number
  className?: string
}

function glyph(paths: ReactNode, defaultSize = 16) {
  return function Icon({ size = defaultSize, className }: IconProps) {
    return <svg width={size} height={size} viewBox="0 0 16 16" fill="none" strokeWidth={1} className={className} aria-hidden="true"
      focusable="false">{paths}</svg>
  }
}

/** `agent-preset-outline`: three agents around one plan; dsh uses it for team-driven turns. */
export const IconCoordinator = glyph(<>
  <path fill="currentColor" d="M6.51867 12.3282C7.29816 12.6011 8.16475 12.6514 9.02269 12.4216C9.57879 12.2726 10.0784 12.0185 10.5087 11.6888C10.7819 12.0555 11.1606 12.3304 11.5913 12.4805C10.9688 13.029 10.2149 13.4478 9.35911 13.6771C8.13946 14.0038 6.90632 13.8971 5.82126 13.4533C6.15821 13.1562 6.4021 12.7652 6.51867 12.3282ZM9.17629 2.89409C11.1101 3.34433 12.739 4.81872 13.2889 6.87043C13.4219 7.3665 13.4811 7.8649 13.4774 8.35466C13.0924 8.13213 12.6422 8.01837 12.1741 8.05276L12.1711 8.05257C12.1539 7.77199 12.109 7.48889 12.0334 7.20684C11.6363 5.72533 10.5048 4.6372 9.13549 4.22844C9.25559 3.87667 9.29214 3.49087 9.22309 3.09892C9.2108 3.02922 9.19451 2.96108 9.17629 2.89409ZM4.7311 3.89107L4.78302 4.11879C4.87648 4.4488 5.04146 4.74263 5.25579 4.98896C3.98078 6.01355 3.35848 7.72904 3.8089 9.41059C3.81828 9.44559 3.82866 9.48025 3.83885 9.51479C3.38217 9.61268 2.98548 9.84137 2.68107 10.1556C2.63414 10.022 2.5897 9.88632 2.55244 9.74726C1.93301 7.43489 2.86717 5.07173 4.71504 3.76697L4.7311 3.89107Z" />
  <path stroke="currentColor" d="M7.99136 5.28105C8.87501 5.28105 9.59136 4.56471 9.59136 3.68105C9.59136 2.7974 8.87501 2.08105 7.99136 2.08105C7.1077 2.08105 6.39136 2.7974 6.39136 3.68105C6.39136 4.56471 7.1077 5.28105 7.99136 5.28105Z" />
  <path stroke="currentColor" d="M3.94009 12.9417C4.82374 12.9417 5.54009 12.2254 5.54009 11.3417C5.54009 10.458 4.82374 9.7417 3.94009 9.7417C3.05643 9.7417 2.34009 10.458 2.34009 11.3417C2.34009 12.2254 3.05643 12.9417 3.94009 12.9417Z" />
  <path stroke="currentColor" d="M12.0851 12.9417C12.9688 12.9417 13.6851 12.2254 13.6851 11.3417C13.6851 10.458 12.9688 9.7417 12.0851 9.7417C11.2015 9.7417 10.4851 10.458 10.4851 11.3417C10.4851 12.2254 11.2015 12.9417 12.0851 12.9417Z" />
</>)

/** `archive-outline`. */
export const IconArchive = glyph(<>
  <path stroke="currentColor" d="M13.5 2.5H2.5C1.94772 2.5 1.5 2.94772 1.5 3.5V4.5C1.5 5.05228 1.94772 5.5 2.5 5.5H13.5C14.0523 5.5 14.5 5.05228 14.5 4.5V3.5C14.5 2.94772 14.0523 2.5 13.5 2.5Z" />
  <path stroke="currentColor" d="M2.5 5.5V13.5C2.5 13.7652 2.60536 14.0196 2.79289 14.2071C2.98043 14.3946 3.23478 14.5 3.5 14.5H12.5C12.7652 14.5 13.0196 14.3946 13.2071 14.2071C13.3946 14.0196 13.5 13.7652 13.5 13.5V5.5" />
  <path stroke="currentColor" d="M6.5 9.5H9.5" />
</>)

/** `new-chat-outline`. */
export const IconChat = glyph(<>
  <path stroke="currentColor" d="M2.37091 11.2501C1.58745 9.89288 1.32067 8.29835 1.61969 6.76006C1.91872 5.22177 2.76342 3.8433 3.99826 2.87846C5.2331 1.91362 6.77494 1.42737 8.33988 1.50925C9.90482 1.59113 11.3875 2.23562 12.5149 3.32406C13.6425 4.41269 14.3387 5.87206 14.4754 7.4334C14.612 8.99474 14.18 10.5529 13.2587 11.8209C12.3375 13.0888 10.9891 13.9813 9.46194 14.3337C8.18691 14.628 6.85895 14.5294 5.64989 14.0605C5.1712 13.8748 4.76962 13.4932 4.26534 13.3967C3.67413 13.2835 2.95257 13.5598 2.03794 14.3337" />
  <path stroke="currentColor" d="M8 5V11" />
  <path stroke="currentColor" d="M5 8H11" />
</>)

/** `warning-triangle-outline`. */
export const IconWarning = glyph(<>
  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" d="M6.87 2.6a1.33 1.33 0 0 1 2.26 0l5.34 9.33A1.33 1.33 0 0 1 13.33 14H2.67a1.33 1.33 0 0 1-1.14-2.07Z" />
  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" d="M8 6v3m0 2.33h.01" />
</>)

/** Chevron pointing down (rotated by CSS when collapsed); drawn in the same 1px stroke. */
export const IconChevron = glyph(<path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" d="M4 6L8 10L12 6" />)

/** Rows in a frame: opens the full Coordinator page. Drawn in the same 1px stroke. */
export const IconOverview = glyph(<>
  <rect x="1.5" y="2.5" width="13" height="11" rx="2" stroke="currentColor" />
  <path stroke="currentColor" strokeLinecap="round" d="M4.5 6H11.5M4.5 8.5H11.5M4.5 11H8.5" />
</>)

/** `shield-outline`: the permission mode glyph, as dsh's permission picker shows it. */
export const IconShield = glyph(<>
  <path stroke="currentColor" strokeLinejoin="round" d="M8 1.75L13 3.6V7.4C13 10.35 10.95 12.95 8 14.25C5.05 12.95 3 10.35 3 7.4V3.6L8 1.75Z" />
  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" d="M5.9 8.1L7.35 9.55L10.2 6.7" />
</>)

/** `folder-open-outline`: a coordinator's folder (where its new Executor Sessions start). */
export const IconFolder = glyph(<>
  <path stroke="currentColor" d="M12.3994 13.5986H2.04956C1.49728 13.5986 1.04956 13.1509 1.04956 12.5986V3.40137C1.04956 2.84908 1.49728 2.40137 2.04956 2.40137H4.76632C5.01016 2.40137 5.24561 2.49046 5.42836 2.6519L6.94088 3.98799C7.12364 4.14943 7.35908 4.23852 7.60293 4.23852H12.3994C12.9517 4.23852 13.3994 4.68624 13.3994 5.23852V7.16991" />
  <path stroke="currentColor" d="M2.55911 7.93683C2.67584 7.49906 3.07229 7.19446 3.52536 7.19446H13.6491C14.3061 7.19446 14.7846 7.81725 14.6153 8.45209L13.4411 12.856C13.3244 13.2938 12.9279 13.5984 12.4748 13.5984H2.35113C1.69411 13.5984 1.21562 12.9756 1.38489 12.3407L2.55911 7.93683Z" />
</>)

/** `edit-outline`: a pencil, for renaming. Drawn in the same 1px stroke. */
export const IconPencil = glyph(<>
  <path stroke="currentColor" strokeLinejoin="round" d="M10.6 2.9L13.1 5.4L5.6 12.9L2.5 13.5L3.1 10.4L10.6 2.9Z" />
  <path stroke="currentColor" d="M9.2 4.3L11.7 6.8" />
</>)

/** A check mark, for saved feedback. Drawn in the same 1px stroke. */
export const IconCheck = glyph(<path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" d="M3.5 8.5L6.5 11.5L12.5 4.5" />)

/** A text cursor in a field: type a path instead of picking a folder. Drawn in the same 1px stroke. */
export const IconTextField = glyph(<>
  <rect x="1.5" y="4.5" width="13" height="7" rx="2" stroke="currentColor" />
  <path stroke="currentColor" strokeLinecap="round" d="M5 6.5V9.5M4 6.5H6M4 9.5H6" />
</>)

/** A page with lines: standing instructions (the executor prompt). Drawn in the same 1px stroke. */
export const IconInstructions = glyph(<>
  <path stroke="currentColor" strokeLinejoin="round" d="M3.5 2.5C3.5 1.95 3.95 1.5 4.5 1.5H9.3L12.5 4.7V13.5C12.5 14.05 12.05 14.5 11.5 14.5H4.5C3.95 14.5 3.5 14.05 3.5 13.5V2.5Z" />
  <path stroke="currentColor" strokeLinejoin="round" d="M9.3 1.5V4.7H12.5" />
  <path stroke="currentColor" strokeLinecap="round" d="M5.75 7.5H10.25M5.75 9.75H10.25M5.75 12H8.5" />
</>)

/** `delete-outline`: a bin, for deleting an archived coordinator's entry. Drawn in the same 1px stroke. */
export const IconTrash = glyph(<>
  <path stroke="currentColor" strokeLinecap="round" d="M2.5 4H13.5" />
  <path stroke="currentColor" strokeLinejoin="round" d="M6 4V2.5H10V4" />
  <path stroke="currentColor" strokeLinejoin="round" d="M3.75 4L4.5 13.5C4.54 14.06 5 14.5 5.57 14.5H10.43C11 14.5 11.46 14.06 11.5 13.5L12.25 4" />
  <path stroke="currentColor" strokeLinecap="round" d="M6.75 7V11.5M9.25 7V11.5" />
</>)

/**
 * The one react-dom export the client uses. react-dom comes from the page's shared module table at runtime (it is
 * external in tsdown.config.ts), and the package's own types are not installed for this plugin.
 */
declare module 'react-dom' {
  import type { ReactNode, ReactPortal } from 'react'
  export function createPortal(children: ReactNode, container: Element | DocumentFragment): ReactPortal
}

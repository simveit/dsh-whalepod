/**
 * Left-sidebar Session row decorations for coordinator chats (ui-workspace's `sidebar.session.row.trailing` and
 * `sidebar.session.row.hover` seats). Executor Sessions are not grouped under their coordinator in the sidebar, so the
 * coordinator's row carries a small count of its Executor Sessions that need the user (warning tone) or run, and its
 * hover card names them. Both render nothing for any other Session. They read the shared store through the `hooks`
 * compartment, as every other registration does, and never bind the row's Session.
 *
 * Look: the forge panel's row icons (13px glyph in the row's 20px line, tertiary ink) and the schedule hover section
 * (the card is #2C2C2E in both themes, so its literal label colours are used; dsh 0.2.2, MIT).
 */
import { IconCoordinator } from './icons.tsx'
import { Monogram } from './identity.tsx'
import { plural, type Translate } from './locales.ts'
import type { UseCoordinator } from './panel.tsx'
import { coordinatorById, countsOf, nameOf, roleOf } from './store.ts'

interface DecorProps { sessionId: string; useCoordinator: UseCoordinator; t: Translate }

/** The coordinator id when `sessionId` is a coordinator chat, else undefined (a stable string for the selector). */
function useCoordinatorOf(useCoordinator: UseCoordinator, sessionId: string): string | undefined {
  return useCoordinator((s) => {
    const role = roleOf(s, sessionId)
    return role?.role === 'coordinator' ? role.coordinatorId : undefined
  })
}

/** Trailing row icon: the coordinator glyph with the count that matters most (needs you first, else running). */
export function CoordinatorRowTrailing({ sessionId, useCoordinator, t }: DecorProps) {
  const coordinatorId = useCoordinatorOf(useCoordinator, sessionId)
  const attention = useCoordinator(s => coordinatorId === undefined ? 0 : countsOf(s.state, coordinatorId).attention)
  const running = useCoordinator(s => coordinatorId === undefined ? 0 : countsOf(s.state, coordinatorId).running)
  if (coordinatorId === undefined || (attention === 0 && running === 0)) return null
  const n = attention > 0 ? attention : running
  const label = attention > 0 ? t(plural('decor.attention', attention), { n: attention }) : t(plural('decor.running', running), { n: running })
  return <span className="dco-decor" role="img" aria-label={label} data-testid="dco-row-decor" data-tone={attention > 0 ? 'warning' : undefined}>
    <IconCoordinator size={13} />
    <span className="dco-decor-count">{n > 99 ? '99+' : n}</span>
  </span>
}

/** Hover card section: the coordinator's name, then "3 Executor Sessions · 1 needs you · 2 running". */
export function CoordinatorRowHover({ sessionId, useCoordinator, t }: DecorProps) {
  const coordinatorId = useCoordinatorOf(useCoordinator, sessionId)
  const name = useCoordinator(s => { const c = coordinatorById(s.state, coordinatorId); return c === undefined ? undefined : nameOf(c) })
  const total = useCoordinator(s => coordinatorId === undefined ? 0 : countsOf(s.state, coordinatorId).total)
  const attention = useCoordinator(s => coordinatorId === undefined ? 0 : countsOf(s.state, coordinatorId).attention)
  const running = useCoordinator(s => coordinatorId === undefined ? 0 : countsOf(s.state, coordinatorId).running)
  if (coordinatorId === undefined || name === undefined) return null
  const parts: { text: string; tone?: 'warning' }[] = [{ text: total === 0 ? t('decor.none') : t(plural('decor.total', total), { n: total }) }]
  if (attention > 0) parts.push({ text: t(plural('summary.attention', attention), { n: attention }), tone: 'warning' })
  if (running > 0) parts.push({ text: t('summary.running', { n: running }) })
  return <div className="dco-hover" data-testid="dco-row-hover">
    <Monogram name={name} size="xs" />
    <span className="dco-hover-body">
      <span className="dco-hover-title">{name}</span>
      <span className="dco-hover-note">
        {parts.map((part, i) => <span key={i} data-tone={part.tone}>{i > 0 && <span className="dco-hover-sep">·</span>}{part.text}</span>)}
      </span>
    </span>
  </div>
}

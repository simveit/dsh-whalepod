/**
 * The plugin's pieces outside its own page: the sidebar entry icon, the session header button, the origin line
 * above coordinator-written messages in an Executor Session, and the welcome shown in a fresh coordinator chat.
 */
import { IconCoordinator } from './icons.tsx'
import { plural, type Translate } from './locales.ts'
import type { UseCoordinator } from './panel.tsx'
import { countsOf, needsUser, roleOf } from './store.ts'
import { Tooltip } from './ui.tsx'
import { PermissionNote } from './permission.tsx'

/**
 * Sidebar entry glyph; the sidebar owns the row, its label and selection. The count badge is decorative and counts
 * every coordinator's Executor Sessions that need the user.
 */
export function PanelIcon({ size, useCoordinator, t }: { size: number; useCoordinator: UseCoordinator; t: Translate }) {
  const count = useCoordinator(s => s.state?.threads.filter(needsUser).length ?? 0)
  return <span className="dco-panel-icon" data-testid="dco-sidebar-icon">
    <IconCoordinator size={size} />
    {count > 0 && <span className="dco-badge" data-testid="dco-badge" aria-hidden="true" title={t(plural('badge', count), { n: count })}>
      {count > 9 ? '9+' : count}</span>}
  </span>
}

/**
 * Session header utility, the 28px round icon button dsh's header utilities use, in every coordinator chat and
 * Executor Session (with a dot when one of that coordinator's Executor Sessions needs the user). It shows or hides
 * the side pane (side-pane.tsx), or opens the Coordinator page where dsh's right Sidebar is not loaded.
 */
export function HeaderAction({ sessionId, useCoordinator, togglePane, t }: {
  sessionId: string; useCoordinator: UseCoordinator; togglePane: () => void; t: Translate
}) {
  const role = useCoordinator(s => roleOf(s, sessionId)?.role)
  const coordinatorId = useCoordinator(s => roleOf(s, sessionId)?.coordinatorId)
  const attention = useCoordinator(s => coordinatorId === undefined ? 0 : countsOf(s.state, coordinatorId).attention)
  if (role === undefined) return null
  const label = attention > 0 ? t(plural('pane.toggle.attention', attention), { n: attention }) : t('pane.toggle')
  return <Tooltip label={label}>
    <button type="button" className="dco-icon-btn dco-header" data-testid="dco-back" aria-label={label} onClick={togglePane}>
      <IconCoordinator size={16} />
      {attention > 0 && <span className="dco-header-dot" aria-hidden="true" />}
    </button>
  </Tooltip>
}

/** What a coordinator-written user message is (an Assignment or a message): the request id the plugin minted names it. */
export type Origin = 'brief' | 'message'

/** Election for the chat's `conversation.chat.user.before` chain: a user row whose prompt id the plugin minted. */
export function originOf(owner: { source: unknown; kind: 'user' | 'steering' }): Origin | null {
  if (owner.kind !== 'user' || typeof owner.source !== 'object' || owner.source === null) return null
  const { kind, rpcId } = owner.source as { kind?: unknown; rpcId?: unknown }
  if (kind !== 'user' || typeof rpcId !== 'string') return null
  if (rpcId.startsWith('dsh-coordinator:brief:')) return 'brief'
  if (rpcId.startsWith('dsh-coordinator:msg:')) return 'message'
  return null
}

/** One quiet line above the bubble, as dsh's shared-session origin line. */
export function OriginLine({ matched, t }: { matched: Origin; t: Translate }) {
  const label = t(matched === 'brief' ? 'origin.brief' : 'origin.message')
  return <span className="dco-origin" data-testid="dco-origin" title={label}><IconCoordinator size={14} /><span>{label}</span></span>
}

/** The opening turn of a coordinator chat: turn 1 with no step (the plugin opens it without a model call). */
interface TurnLike { readonly turn: number; readonly steps: readonly unknown[] }

const EXAMPLES = ['welcome.example1', 'welcome.example2', 'welcome.example3'] as const

/**
 * Welcome in a fresh coordinator chat, rendered as the tail of its opening turn: what the coordinator does and three
 * example asks that fill the composer (they do not send).
 */
export function Welcome({ turn, sessionId, useCoordinator, fillDraft, goHome, t }: {
  turn: TurnLike; sessionId: string; useCoordinator: UseCoordinator; fillDraft: (text: string) => void; goHome: () => void; t: Translate
}) {
  const isCoordinator = useCoordinator(s => roleOf(s, sessionId)?.role === 'coordinator')
  const permission = useCoordinator(s => s.state?.threadPermission)
  if (!isCoordinator || turn.turn !== 1 || turn.steps.length !== 0) return null
  return <section className="dco-welcome" data-testid="dco-welcome" aria-labelledby={`dco-welcome-${sessionId}`}>
    <h2 className="dco-welcome-title" id={`dco-welcome-${sessionId}`}><IconCoordinator size={16} />{t('welcome.title')}</h2>
    <p>{t('welcome.body')}</p>
    <span className="dco-welcome-label">{t('welcome.examples')}</span>
    <ul className="dco-welcome-examples">
      {EXAMPLES.map(key => <li key={key}>
        <button type="button" className="dco-pill" onClick={() => { fillDraft(t(key)) }}>{t(key)}</button>
      </li>)}
    </ul>
    <span className="dco-welcome-hint">{t('welcome.panel')}</span>
    <PermissionNote state={permission} t={t} onChange={goHome} />
  </section>
}

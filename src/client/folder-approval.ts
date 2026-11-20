/**
 * The folder card of `executor_start` as dsh's compact approval card (Allow once, Always allow, Reject) instead of the
 * generic question form. The host asks through dsh's user-questions service with an approval intent; this entry in the
 * `conversation.composer` chain elects only that question (its id prefix and its three labels) and renders the shared
 * `conversation.approval.card` factory over the same pending question, so the answer still goes back through the
 * question's own channel and the host checks it as before. Every other interaction keeps its renderer.
 *
 * The pattern follows dsh's computer use (`ApplicationApproval` in dsh-cua `src/client/ApplicationApproval.tsx`),
 * Copyright (c) 2026 DeepSeek Harness Team, MIT License (see LICENSE).
 */

/** The prefix of the host's folder question ids (`dsh-coordinator-confirm-folder:...`, threads.ts). */
export const FOLDER_QUESTION_PREFIX = 'dsh-coordinator-confirm-folder:'

interface ApprovalIntent { kind: 'approval'; approve: string; reject: string; always?: string }
interface QuestionItem { id: string; question: string; detail?: string; intent?: { kind: string } }
interface PendingQuestion {
  kind: string
  key: string
  questions: readonly QuestionItem[]
  answer(reply: { answers: { id: string; selected: string[] }[] }): Promise<void>
  snapshot(): { channel: string; closed: boolean }
}

export interface FolderApprovalMatch { pending: PendingQuestion; item: QuestionItem; intent: ApprovalIntent }

/**
 * Election: the session's pending interaction when it is the host's folder question, else null.
 * @param props - the composer chain's props; only `pendingInteraction` is read.
 */
export function selectFolderApproval({ pendingInteraction }: { pendingInteraction?: unknown }): FolderApprovalMatch | null {
  const pending = pendingInteraction as PendingQuestion | null | undefined
  if (pending?.kind !== 'question' || pending.questions.length !== 1) return null
  const item = pending.questions[0]!
  if (!item.id.startsWith(FOLDER_QUESTION_PREFIX) || item.intent?.kind !== 'approval') return null
  const intent = item.intent as ApprovalIntent
  if (typeof intent.approve !== 'string' || typeof intent.reject !== 'string') return null
  return { pending, item, intent }
}

/** The shared approval card over the pending folder question, answering with the card's own labels. */
export function FolderApproval({ matched: { pending, item, intent }, renderFactorySlot }: {
  matched: FolderApprovalMatch
  renderFactorySlot: (name: string, input: Record<string, unknown>) => unknown
}) {
  const answer = (label: string) => pending.answer({ answers: [{ id: item.id, selected: [label] }] })
  const always = intent.always
  return renderFactorySlot('conversation.approval.card', {
    requestKey: pending.key,
    title: item.question,
    ...(item.detail === undefined ? {} : { description: item.detail }),
    allowLabel: intent.approve,
    canAnswer: () => pending.snapshot().channel !== 'none' && !pending.snapshot().closed,
    onAllow: () => answer(intent.approve),
    onReject: () => answer(intent.reject),
    ...(always === undefined ? {} : { onAlways: () => answer(always) }),
  }) as never
}

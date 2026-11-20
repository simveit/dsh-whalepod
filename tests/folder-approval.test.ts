/** The client's election of the host's folder question for dsh's approval card (folder-approval.ts). */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FolderApproval, FOLDER_QUESTION_PREFIX, selectFolderApproval } from '../src/client/folder-approval.ts'

const intent = { kind: 'approval', approve: 'Allow once', reject: 'Reject', always: 'Always allow' }
function pending(questions: unknown[], kind = 'question') {
  const answers: unknown[] = []
  return { kind, key: 'k1', questions, answers, answer: async (reply: unknown) => { answers.push(reply) }, snapshot: () => ({ channel: 'live', closed: false }) }
}

test('only the host\'s single folder question with an approval intent is elected', () => {
  const folder = { id: `${FOLDER_QUESTION_PREFIX}t-1:ab12`, question: 'Let it work in ~/dev/x?', intent }
  assert.notEqual(selectFolderApproval({ pendingInteraction: pending([folder]) }), null)
  assert.equal(selectFolderApproval({ pendingInteraction: pending([{ ...folder, id: 'cua-app-access' }]) }), null)
  assert.equal(selectFolderApproval({ pendingInteraction: pending([{ ...folder, intent: undefined }]) }), null)
  assert.equal(selectFolderApproval({ pendingInteraction: pending([folder, folder]) }), null)
  assert.equal(selectFolderApproval({ pendingInteraction: pending([folder], 'approval') }), null)
  assert.equal(selectFolderApproval({ pendingInteraction: null }), null)
})

test('the card answers the pending question with the card\'s own labels', async () => {
  const folder = { id: `${FOLDER_QUESTION_PREFIX}ab12`, question: 'Let it work in ~/dev/x?', detail: 'outside', intent }
  const p = pending([folder])
  let input: Record<string, () => Promise<void>> & Record<string, unknown> = {} as never
  FolderApproval({ matched: selectFolderApproval({ pendingInteraction: p })!, renderFactorySlot: (name, given) => { assert.equal(name, 'conversation.approval.card'); input = given as never; return null } })
  assert.equal(input['title'], 'Let it work in ~/dev/x?')
  assert.equal(input['description'], 'outside')
  await input['onAlways']!()
  await input['onReject']!()
  await input['onAllow']!()
  assert.deepEqual(p.answers.map(a => (a as { answers: { selected: string[] }[] }).answers[0]!.selected[0]), ['Always allow', 'Reject', 'Allow once'])
})

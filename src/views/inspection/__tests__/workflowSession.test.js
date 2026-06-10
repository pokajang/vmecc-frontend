import { describe, expect, it } from 'vitest'
import {
  WORKFLOW_SESSION_KEY,
  attachWorkflowSessionToDraftPayload,
  deriveWorkflowSessionFromDraftPayload,
  normalizeWorkflowSession,
  pickInspectionInitializationSource,
} from '../workflowSession'

describe('workflowSession helpers', () => {
  it('normalizes legacy edit metadata from draft payload', () => {
    const session = deriveWorkflowSessionFromDraftPayload({
      __draftMode: 'edit',
      __editReportId: 'report-123',
    })
    expect(session).toEqual({
      mode: 'edit',
      editReportId: 'report-123',
      returnFromReview: false,
      skipDraftLoad: false,
      source: '',
    })
  })

  it('attaches both new and legacy workflow metadata to draft payload', () => {
    const payload = attachWorkflowSessionToDraftPayload(
      { foo: 'bar' },
      { mode: 'edit', editReportId: 'report-abc', skipDraftLoad: true, source: 'test-case' },
    )

    expect(payload.__draftMode).toBe('edit')
    expect(payload.__editReportId).toBe('report-abc')
    expect(payload[WORKFLOW_SESSION_KEY]).toEqual({
      mode: 'edit',
      editReportId: 'report-abc',
      returnFromReview: false,
      skipDraftLoad: true,
      source: 'test-case',
    })
  })

  it('picks initialization source with deterministic precedence', () => {
    const editSession = normalizeWorkflowSession({ mode: 'edit', editReportId: 'report-1' })
    const newSession = normalizeWorkflowSession({ mode: 'new' })

    expect(
      pickInspectionInitializationSource({
        workflowSession: { ...editSession, returnFromReview: true },
        reviewReturnRecord: { id: 'review-record' },
        editingRecord: { id: 'edit-record' },
        prefillDraft: { id: 'prefill' },
        loadedDraft: { id: 'draft' },
      }).kind,
    ).toBe('review-return')

    expect(
      pickInspectionInitializationSource({
        workflowSession: editSession,
        reviewReturnRecord: null,
        editingRecord: { id: 'edit-record' },
        prefillDraft: { id: 'prefill' },
        loadedDraft: { id: 'draft' },
      }).kind,
    ).toBe('edit-record')

    expect(
      pickInspectionInitializationSource({
        workflowSession: newSession,
        reviewReturnRecord: null,
        editingRecord: null,
        prefillDraft: { id: 'prefill' },
        loadedDraft: { id: 'draft' },
      }).kind,
    ).toBe('prefill')

    expect(
      pickInspectionInitializationSource({
        workflowSession: newSession,
        reviewReturnRecord: null,
        editingRecord: null,
        prefillDraft: null,
        loadedDraft: { id: 'draft' },
      }).kind,
    ).toBe('saved-draft')
  })

  it('does not load saved draft source in edit mode', () => {
    const source = pickInspectionInitializationSource({
      workflowSession: normalizeWorkflowSession({ mode: 'edit', editReportId: 'r-1' }),
      reviewReturnRecord: null,
      editingRecord: null,
      prefillDraft: null,
      loadedDraft: { id: 'draft' },
    })

    expect(source.kind).toBe('empty')
  })

  it('reopens an explicit edit draft snapshot instead of the original record', () => {
    const source = pickInspectionInitializationSource({
      workflowSession: normalizeWorkflowSession({
        mode: 'edit',
        editReportId: 'r-1',
        source: 'draft-row-edit',
      }),
      reviewReturnRecord: null,
      editingRecord: { id: 'r-1', selectedLocation: 'Original' },
      prefillDraft: { id: 'draft-r-1', selectedLocation: 'Draft changes' },
      loadedDraft: null,
    })

    expect(source.kind).toBe('prefill')
    expect(source.payload.selectedLocation).toBe('Draft changes')
  })
})

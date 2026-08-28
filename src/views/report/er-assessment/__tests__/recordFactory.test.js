import { describe, expect, it } from 'vitest'
import { buildErAssessmentRecord } from '../recordFactory'

const form = {
  workflowStep: 'signoff',
  company: 'VMECC',
  assessmentDate: '2026-08-28',
  location: 'Area A',
  scopeOfWork: 'Work at height',
  assessmentType: 'working-at-height',
  responses: [],
  rescuePlan: 'Raise alarm and recover casualty.',
  rescueAccessLayout: null,
  rescueEquipment: ['Harness'],
  inspectedBy: { name: 'Inspector', company: 'VMECC', signature: 'Inspector' },
  jobLeader: { name: 'Leader', company: 'VMECC', signature: 'Leader' },
}

describe('buildErAssessmentRecord', () => {
  it('creates a review-confirmed assessment as Submitted', () => {
    const record = buildErAssessmentRecord({
      form,
      user: { id: 9, name: 'Field User' },
      idPrefix: 'ERA',
      sequence: 1,
    })

    expect(record.status).toBe('Submitted')
    expect(record.submissionKey).toMatch(/^er-assessment-/)
  })

  it('resubmits a rejected assessment while preserving server identity and concurrency fields', () => {
    const record = buildErAssessmentRecord({
      form,
      user: { id: 9, name: 'Field User' },
      editingRecord: {
        id: 'report-uid-1',
        displayId: 'ERA-001',
        status: 'Rejected',
        submissionKey: 'stable-submission-key',
        version: 4,
        revision: 3,
      },
    })

    expect(record).toEqual(
      expect.objectContaining({
        id: 'report-uid-1',
        displayId: 'ERA-001',
        status: 'Submitted',
        submissionKey: 'stable-submission-key',
        version: 4,
        revision: 3,
      }),
    )
  })
})

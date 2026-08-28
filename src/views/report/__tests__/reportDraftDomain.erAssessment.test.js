import { describe, expect, it } from 'vitest'
import { buildDraftRow } from '../reportDraftDomain'

describe('ER Assessment draft record metadata', () => {
  it('keeps assessment identity, date, and scope visible when a draft is resumed', () => {
    const row = buildDraftRow({
      reportTypeSlug: 'er-assessment',
      reportTypeLabel: 'ER Assessment',
      actorName: 'Field User',
      draft: {
        draftId: 'era-draft-1',
        version: 2,
        savedAt: '2026-08-27T08:00:00.000Z',
        payload: {
          assessmentType: 'working-at-height',
          assessmentDate: '2026-08-27',
          location: 'Process Area A',
          scopeOfWork: 'Replace elevated lighting.',
        },
      },
    })

    expect(row.incidentType).toBe('Working at Height')
    expect(row.assessmentTypeLabel).toBe('Working at Height')
    expect(row.reportDate).toBe('2026-08-27')
    expect(row.description).toBe('Replace elevated lighting.')
  })
})

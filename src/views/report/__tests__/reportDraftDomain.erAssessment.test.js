import { describe, expect, it } from 'vitest'
import { buildDraftRow, recordToDraft } from '../reportDraftDomain'

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

describe('ERCO draft photo metadata', () => {
  it('preserves managed media identity when a saved draft is reopened', () => {
    const draft = recordToDraft(
      {
        reportType: 'erco',
        postIncidentAnalysis: {
          photos: [
            {
              id: 'photo-1',
              mediaId: 'rpm_erco_1',
              url: '/api/report-media/rpm_erco_1',
              thumbnailUrl: '/api/report-media/rpm_erco_1?variant=thumbnail',
              fileName: 'response.jpg',
              description: 'Command position',
            },
          ],
        },
      },
      'erco',
    )

    expect(draft.postIncidentAnalysis.photos).toEqual([
      expect.objectContaining({
        mediaId: 'rpm_erco_1',
        url: '/api/report-media/rpm_erco_1',
        thumbnailUrl: '/api/report-media/rpm_erco_1?variant=thumbnail',
        description: 'Command position',
      }),
    ])
  })
})

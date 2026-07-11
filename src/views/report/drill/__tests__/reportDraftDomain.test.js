import { describe, expect, it } from 'vitest'
import { buildChangeSummary, recordToDraft } from '../../reportDraftDomain'

describe('Drill report draft domain integration', () => {
  it('normalizes Drill records through recordToDraft and preserves media metadata', () => {
    const result = recordToDraft(
      {
        reportType: 'drill',
        reportDate: '2026-07-11',
        incidentType: 'Fire Drill',
        respondingTeam: {
          name: 'A Team',
          attendance: [{ name: 'Member', present: false }],
        },
        postIncidentAnalysis: {
          photos: [
            {
              mediaId: 'm1',
              url: '/report-media/m1',
              leaseId: 'l1',
              leaseExpiresAt: '2026-07-12T00:00:00Z',
            },
          ],
        },
      },
      'drill',
    )

    expect(result.schemaVersion).toBe(2)
    expect(result.respondingAttendance[0].present).toBe(false)
    expect(result.postIncidentAnalysis.photos[0]).toMatchObject({
      mediaId: 'm1',
      leaseId: 'l1',
    })
  })

  it('reports Drill-specific V2 changes', () => {
    const changes = buildChangeSummary(
      { reportType: 'drill', incidentType: 'Fire Drill', exerciseCategories: ['Fire'] },
      {
        reportType: 'drill',
        incidentType: 'Fire Drill',
        exerciseCategories: ['Fire', 'Rescue'],
        exerciseObjectives: [{ text: 'Test evacuation' }],
      },
    )

    expect(changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Exercise Categories' }),
        expect.objectContaining({ label: 'Exercise Objectives' }),
      ]),
    )
  })
})

import { describe, expect, it } from 'vitest'
import { buildErcoRecord } from '../recordFactory'
import { defaultErcoForm } from '../utils'

describe('buildErcoRecord', () => {
  it('preserves the complete ERCO payload contract and stable submission key', () => {
    const form = {
      ...defaultErcoForm(),
      submissionKey: 'erco-submit-stable',
      incidentDate: '2026-07-13',
      incidentTime: '09:00',
      weather: 'Clear',
      incidentType: 'Fire',
      location: ['Zone 1', 'Workshop'],
      details: 'Emergency response details.',
      summary: 'Emergency response summary.',
      respondingTeamName: 'Alpha',
      respondingTeamShift: 'Day',
      respondingAttendance: [
        { memberId: 'member-1', name: 'Responder One', role: 'TRT', present: true },
        { memberId: 'member-2', name: 'Responder Two', role: 'TRT', present: false },
      ],
      chronology: [{ id: 'row-1', time: '09:00', action: 'Response started.' }],
      postIncidentAnalysis: {
        strengths: ['Prompt mobilisation'],
        resourcesMobilised: ['Fire appliance'],
        improvementOpportunities: ['Improve radio checks'],
        photos: [
          {
            id: 'photo-1',
            mediaId: 'rpm-erco-1',
            fileName: 'response.jpg',
            url: '/api/report-media/rpm-erco-1',
            description: 'Initial response',
          },
        ],
      },
    }

    const record = buildErcoRecord({
      form,
      reportTypeSlug: 'erco',
      reportTypeIdPrefix: 'ERCO',
      user: { id: 'user-1', name: 'Alex Tan' },
      nowIso: '2026-07-13T09:30:00.000Z',
      sequence: 1,
    })

    expect(record).toEqual(
      expect.objectContaining({
        schemaVersion: 1,
        submissionKey: 'erco-submit-stable',
        location: 'Zone 1 | Workshop',
        incidentDate: '2026-07-13',
        incidentTime: '09:00',
      }),
    )
    expect(record.respondingTeam.attendance).toHaveLength(1)
    expect(record.chronology).toEqual([{ time: '09:00', action: 'Response started.' }])
    expect(record.postIncidentAnalysis.photos[0]).toEqual(
      expect.objectContaining({ mediaId: 'rpm-erco-1', description: 'Initial response' }),
    )
  })
})

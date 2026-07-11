import { describe, expect, it } from 'vitest'
import { buildDrillRecord } from '../recordFactory'
import { createDefaultDrillForm } from '../drillFormDomain'

describe('buildDrillRecord', () => {
  it('serializes Drill V2 data and preserves managed photo metadata', () => {
    const form = {
      ...createDefaultDrillForm(),
      reportDate: '2026-07-11',
      reportTime: '10:00',
      incidentType: 'Fire Drill',
      exerciseCategories: ['Fire', 'Rescue'],
      location: 'Plant',
      exerciseTitle: 'Major fire exercise',
      details: 'Scenario',
      summary: 'Outcome',
      exerciseObjectives: [
        { id: 'o1', text: 'Test evacuation' },
        { id: 'o2', text: '' },
      ],
      erpReferences: [
        { id: 'e1', annexNumber: 'ERP-01', title: 'Major Fire' },
        { id: 'e2', annexNumber: '', title: '' },
      ],
      respondingTeamName: 'A Team',
      respondingAttendance: [
        {
          memberId: '1',
          name: 'Alex',
          role: 'Responder',
          exerciseRole: 'SC',
          present: true,
        },
        { memberId: '2', name: 'Sam', present: false },
      ],
      chronology: [{ id: 'c1', time: '10:00', action: 'Started' }],
      postIncidentAnalysis: {
        strengths: ['Clear command'],
        resourcesMobilised: ['Ambulance'],
        improvementOpportunities: ['Improve radio checks'],
        photos: [
          {
            id: 'p1',
            mediaId: 'media-1',
            url: '/report-media/media-1',
            thumbnailUrl: '/report-media/media-1?variant=thumbnail',
            leaseId: 'lease-1',
            checksumSha256: 'abc',
            description: 'Team response',
          },
        ],
      },
    }

    const record = buildDrillRecord({
      form,
      reportTypeSlug: 'drill',
      reportTypeIdPrefix: 'DR',
      sequence: 1,
      user: { id: 7, name: 'Reporter' },
      nowIso: '2026-07-11T10:30:00.000Z',
    })

    expect(record.exerciseCategories).toEqual(['Fire', 'Rescue'])
    expect(record.exerciseObjectives).toEqual([{ text: 'Test evacuation' }])
    expect(record.erpReferences).toEqual([{ annexNumber: 'ERP-01', title: 'Major Fire' }])
    expect(record.respondingTeam.attendance).toEqual([
      expect.objectContaining({ name: 'Alex', exerciseRole: 'SC' }),
    ])
    expect(record.postIncidentAnalysis.photos[0]).toMatchObject({
      mediaId: 'media-1',
      leaseId: 'lease-1',
      checksumSha256: 'abc',
    })
  })
})

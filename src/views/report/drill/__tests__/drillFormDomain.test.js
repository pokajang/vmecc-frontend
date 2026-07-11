import { describe, expect, it } from 'vitest'
import {
  DRILL_FORM_SCHEMA_VERSION,
  createDefaultDrillForm,
  hasMeaningfulDrillChanges,
  normalizeDrillForm,
  normalizeDrillPhoto,
} from '../drillFormDomain'

describe('drillFormDomain', () => {
  it('normalizes legacy Drill records without losing shared envelope values', () => {
    const result = normalizeDrillForm({
      reportDate: '2025-01-10',
      reportTime: '09:15',
      weather: 'Rain',
      incidentType: 'Rescue Drill',
      location: 'Workshop',
      details: 'Legacy scenario',
      summary: 'Legacy outcome',
      sc: 'Commander One',
      asc: 'Assistant Two',
      chronology: [{ time: '09:15', action: 'Exercise started' }],
    })

    expect(result.schemaVersion).toBe(DRILL_FORM_SCHEMA_VERSION)
    expect(result).toMatchObject({
      reportDate: '2025-01-10',
      reportTime: '09:15',
      weather: 'Rain',
      incidentType: 'Rescue Drill',
      location: 'Workshop',
      details: 'Legacy scenario',
      summary: 'Legacy outcome',
    })
    expect(result.respondingAttendance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Commander One', exerciseRole: 'SC' }),
        expect.objectContaining({ name: 'Assistant Two', exerciseRole: 'ASC' }),
      ]),
    )
    expect(result.chronology[0].id).toBeTruthy()
  })

  it('preserves false attendance and managed media lease metadata', () => {
    const result = normalizeDrillForm({
      respondingTeam: {
        name: 'A Team',
        attendance: [{ memberId: '7', name: 'Member', present: false }],
      },
      postIncidentAnalysis: {
        photos: [
          {
            media_id: 'media-1',
            url: '/report-media/media-1',
            thumbnail_url: '/report-media/media-1?variant=thumbnail',
            leaseId: 'lease-1',
            leaseExpiresAt: '2026-07-12T00:00:00Z',
            checksumSha256: 'abc',
            size_bytes: 1234,
          },
        ],
      },
    })

    expect(result.respondingAttendance[0].present).toBe(false)
    expect(result.postIncidentAnalysis.photos[0]).toMatchObject({
      mediaId: 'media-1',
      thumbnailUrl: '/report-media/media-1?variant=thumbnail',
      leaseId: 'lease-1',
      leaseExpiresAt: '2026-07-12T00:00:00Z',
      checksumSha256: 'abc',
      sizeBytes: 1234,
    })
  })

  it('keeps one discoverability row for repeatable optional sections', () => {
    const result = normalizeDrillForm({ exerciseObjectives: [], erpReferences: [] })
    expect(result.exerciseObjectives).toHaveLength(1)
    expect(result.erpReferences).toHaveLength(1)
  })

  it('normalizes a legacy photo string', () => {
    expect(normalizeDrillPhoto('data:image/jpeg;base64,abc')).toMatchObject({
      url: 'data:image/jpeg;base64,abc',
      description: '',
    })
  })

  it('detects meaningful V2 changes', () => {
    expect(hasMeaningfulDrillChanges(createDefaultDrillForm())).toBe(false)
    expect(
      hasMeaningfulDrillChanges({
        ...createDefaultDrillForm(),
        exerciseCategories: ['Fire'],
      }),
    ).toBe(true)
  })
})

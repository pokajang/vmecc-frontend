import { describe, expect, it } from 'vitest'
import {
  FITNESS_TEST_FORM_SCHEMA_VERSION,
  buildFitnessTestRecord,
  createDefaultFitnessTestForm,
  normalizeFitnessTestForm,
  normalizeFitnessTestRecordToForm,
} from '../fitnessTestFormDomain'

describe('fitnessTestFormDomain', () => {
  it('normalizes legacy payloads into canonical-aware form values', () => {
    const result = normalizeFitnessTestForm({
      reportDate: '2026-07-11',
      reportTime: '09:00',
      weather: 'Cloudy',
      incidentType: 'Endurance Test',
      location: 'Training yard',
      details: 'Legacy details',
      summary: 'Legacy summary',
      sc: 'Commander One',
      asc: 'Commander Two',
      chronology: [{ time: '09:00', action: 'Started' }],
    })

    expect(result.schemaVersion).toBe(FITNESS_TEST_FORM_SCHEMA_VERSION)
    expect(result).toMatchObject({
      reportDate: '2026-07-11',
      reportTime: '09:00',
      weather: 'Cloudy',
      incidentType: 'Endurance Test',
      location: 'Training yard',
      details: 'Legacy details',
      summary: 'Legacy summary',
      reportingMonth: '2026-07',
      sc: 'Commander One',
      asc: 'Commander Two',
    })
    expect(result.chronology[0].id).toBeTruthy()
    expect(result.shiftGroups).toEqual([])
  })

  it('normalizes canonical payloads with shift groups back into form state', () => {
    const result = normalizeFitnessTestRecordToForm({
      reportDate: '2026-07-13',
      reportTime: '10:00',
      incidentType: 'Heat Stress Test',
      reportingMonth: '2026-07',
      documentReference: 'DOC-FIT-001',
      protocolRevision: 'v1',
      shiftGroups: [
        {
          id: 'group-1',
          shiftName: 'Day Shift',
          assessor: { userId: '99', name: 'Trainer One' },
          participants: [
            {
              id: 'participant-1',
              userId: '100',
              name: 'Trainee One',
              role: 'SC',
            },
          ],
        },
      ],
      details: 'Canonical details',
      summary: 'Canonical summary',
      photos: [
        {
          id: 'photo-1',
          mediaId: 'rpm_fitness_1',
          url: '/api/report-media/rpm_fitness_1',
          fileName: 'fitness.jpg',
          description: 'Team completing the endurance test.',
        },
      ],
      chronology: [{ time: '10:00', action: 'Ready' }],
    })

    expect(result.reportingMonth).toBe('2026-07')
    expect(result.shiftGroups).toHaveLength(1)
    expect(result.shiftGroups[0]).toMatchObject({ id: 'group-1', shiftName: 'Day Shift' })
    expect(result.chronology[0]).toMatchObject({
      time: '10:00',
      action: 'Ready',
      id: expect.any(String),
    })
    expect(result.photos).toEqual([
      expect.objectContaining({
        mediaId: 'rpm_fitness_1',
        url: '/api/report-media/rpm_fitness_1',
        description: 'Team completing the endurance test.',
      }),
    ])
  })

  it('builds payloads with reporting month and shift groups for API submit', () => {
    const record = buildFitnessTestRecord({
      form: {
        ...createDefaultFitnessTestForm(),
        submissionKey: 'fitness-submit-stable',
        reportDate: '2026-07-15',
        reportTime: '08:30',
        weather: 'Clear',
        incidentType: 'Endurance Test',
        location: 'Main Yard',
        details: 'Fitness test session details.',
        summary: 'Fitness test completed safely.',
        photos: [
          {
            id: 'photo-1',
            mediaId: 'rpm_fitness_1',
            url: '/api/report-media/rpm_fitness_1',
            fileName: 'fitness.jpg',
            description: 'Fitness test in progress.',
          },
        ],
        chronology: [{ id: 'row-1', time: '08:30', action: 'Fitness test started.' }],
      },
      reportTypeSlug: 'fitness-test',
      reportTypeIdPrefix: 'FIT',
      user: { id: 'user-1', name: 'Fitness User' },
      nowIso: '2026-07-15T08:30:00.000Z',
      sequence: 1,
    })

    expect(record).toMatchObject({
      schemaVersion: FITNESS_TEST_FORM_SCHEMA_VERSION,
      submissionKey: 'fitness-submit-stable',
      reportDate: '2026-07-15',
      reportTime: '08:30',
      reportingMonth: '2026-07',
      documentReference: '',
      protocolRevision: '',
      incidentType: 'Endurance Test',
      details: 'Fitness test session details.',
      summary: 'Fitness test completed safely.',
      shiftGroups: [
        expect.objectContaining({
          id: expect.stringMatching(/^shift-group-default-/),
          shiftName: 'Main Yard',
        }),
      ],
      photos: [
        expect.objectContaining({
          mediaId: 'rpm_fitness_1',
          url: '/api/report-media/rpm_fitness_1',
          description: 'Fitness test in progress.',
        }),
      ],
    })
  })
})

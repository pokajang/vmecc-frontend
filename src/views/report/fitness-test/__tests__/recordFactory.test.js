import { describe, expect, it } from 'vitest'
import { buildFitnessTestRecord } from '../recordFactory'
import { createDefaultFitnessTestForm } from '../fitnessFormDomain'

describe('buildFitnessTestRecord', () => {
  it('serializes the v3 fitness payload and v1 compatibility fields', () => {
    const form = {
      ...createDefaultFitnessTestForm(),
      submissionKey: 'fitness-submit-stable',
      reportingMonth: '2026-06',
      photos: [
        {
          id: 'photo-1',
          mediaId: 'rpm_fitness_1',
          url: '/api/report-media/rpm_fitness_1',
          thumbnailUrl: '/api/report-media/rpm_fitness_1?variant=thumbnail',
          fileName: 'fitness.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 1234,
          width: 1200,
          height: 800,
          description: 'Participant completing the test.',
        },
      ],
      shiftGroups: [
        {
          id: 'alpha',
          shift: 'Alpha',
          assessor: { name: 'Assessor One' },
          participants: [
            {
              id: 'member-1',
              name: 'Member One',
              ageSnapshot: 30,
              fitness: { sitUps: 21, jumpingJacks: 52, pushUps: 20, testedOn: '2026-06-10' },
              proficiency: { durationSeconds: 250, testedOn: '2026-06-10' },
            },
          ],
        },
      ],
    }
    const record = buildFitnessTestRecord({
      form,
      reportTypeSlug: 'fitness-test',
      reportTypeIdPrefix: 'FIT',
      user: { id: 'user-1', name: 'Fitness User' },
      nowIso: '2026-07-13T09:30:00.000Z',
      sequence: 1,
    })
    expect(record).toEqual(
      expect.objectContaining({
        schemaVersion: 1,
        fitnessSchemaVersion: 3,
        submissionKey: 'fitness-submit-stable',
        reportingMonth: '2026-06',
        reportDate: '2026-06-01',
        incidentType: 'Physical Test Report',
        photos: [
          expect.objectContaining({
            mediaId: 'rpm_fitness_1',
            fileName: 'fitness.jpg',
            description: 'Participant completing the test.',
          }),
        ],
      }),
    )
    expect(record.shiftGroups[0].participants[0].fitness.result).toBe('pass')
    expect(record.shiftGroups[0].participants[0].proficiency.checkpointCompletion).toEqual({
      cp1: true,
      cp2: true,
      cp3: true,
      cp4: true,
      cp5: true,
      cp6: true,
    })
    expect(record.chronology).toHaveLength(1)
  })
})

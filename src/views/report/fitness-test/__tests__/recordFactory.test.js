import { describe, expect, it } from 'vitest'
import { buildFitnessTestRecord } from '../recordFactory'
import { defaultFitnessTestForm } from '../utils'

describe('buildFitnessTestRecord', () => {
  it('serializes the complete Fitness Test payload with a stable submission key', () => {
    const form = {
      ...defaultFitnessTestForm(),
      submissionKey: 'fitness-submit-stable',
      reportDate: '2026-07-13',
      reportTime: '09:00',
      weather: 'Routine',
      incidentType: 'Endurance Test',
      location: 'Training yard',
      details: 'Fitness test session details.',
      summary: 'Fitness test completed safely.',
      chronology: [
        { id: 'row-1', time: '09:00', action: 'Fitness test started.' },
        { id: 'row-2', time: '', action: '' },
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

    expect(record).toMatchObject({
      schemaVersion: 1,
      submissionKey: 'fitness-submit-stable',
      reportDate: '2026-07-13',
      reportTime: '09:00',
      location: 'Training yard',
      reportingMonth: '2026-07',
      shiftGroups: [{ id: expect.any(String), shiftName: 'Training yard' }],
    })
    expect(record.chronology).toEqual([{ time: '09:00', action: 'Fitness test started.' }])
    expect(record).toMatchObject({
      incidentType: 'Endurance Test',
      details: 'Fitness test session details.',
      summary: 'Fitness test completed safely.',
      documentReference: '',
      protocolRevision: '',
    })
  })
})

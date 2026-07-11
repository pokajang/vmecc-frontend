import { describe, expect, it } from 'vitest'
import { DRILL_FIELD_LIMITS } from '../constants'
import {
  validateDrillAnalysis,
  validateDrillChronology,
  validateDrillDetails,
  validateDrillPersonnel,
} from '../validation'

describe('Drill validation', () => {
  it('rejects duplicate exclusive exercise-role assignments', () => {
    const result = validateDrillPersonnel({
      respondingAttendance: [
        { memberKey: '1', name: 'One', present: true, exerciseRole: 'SC' },
        { memberKey: '2', name: 'Two', present: true, exerciseRole: 'SC' },
      ],
    })

    expect(result.isValid).toBe(false)
    expect(result.errors.respondingAttendance).toContain('SC')
  })

  it('allows repeated non-exclusive participant roles', () => {
    const result = validateDrillPersonnel({
      respondingAttendance: [
        { memberKey: '1', name: 'One', present: true, exerciseRole: 'Participant' },
        { memberKey: '2', name: 'Two', present: true, exerciseRole: 'Participant' },
      ],
    })

    expect(result.isValid).toBe(true)
  })

  it('rejects a partially completed ERP reference without dropping it', () => {
    const result = validateDrillDetails({
      details: 'Scenario',
      summary: 'Outcome',
      erpReferences: [{ id: 'erp-1', annexNumber: 'ERP-01', title: '' }],
    })

    expect(result.isValid).toBe(false)
    expect(result.errors['erpReferences.erp-1']).toContain('both')
  })

  it('matches the backend bounds for repeatable Drill sections', () => {
    const personnel = validateDrillPersonnel({
      respondingAttendance: Array.from(
        { length: DRILL_FIELD_LIMITS.personnel + 1 },
        (_, index) => ({ memberKey: String(index), name: `Person ${index}`, present: true }),
      ),
    })
    const chronology = validateDrillChronology({
      chronology: Array.from({ length: DRILL_FIELD_LIMITS.chronology + 1 }, (_, index) => ({
        id: String(index),
        time: '09:00',
        action: `Event ${index}`,
      })),
    })
    const analysis = validateDrillAnalysis({
      postIncidentAnalysis: {
        strengths: Array.from({ length: DRILL_FIELD_LIMITS.analysisRows + 1 }, () => 'Strength'),
      },
    })

    expect(personnel.errors.respondingAttendance).toContain(String(DRILL_FIELD_LIMITS.personnel))
    expect(chronology.errors.chronology).toContain(String(DRILL_FIELD_LIMITS.chronology))
    expect(analysis.errors.postIncidentAnalysis).toContain(String(DRILL_FIELD_LIMITS.analysisRows))
  })
})

import { describe, expect, it } from 'vitest'
import {
  buildInspectionValidationStatusMessage,
  getInspectionValidationReasons,
} from '../form/inspectionValidationFeedback'

describe('inspection validation feedback', () => {
  it('explains shared form blockers in one inline message', () => {
    expect(
      buildInspectionValidationStatusMessage({
        errorCount: 3,
        missing: {
          inspectionType: false,
          inspectedAt: true,
          selectedLocation: true,
          inspectionIssues: true,
        },
      }),
    ).toBe(
      'Cannot continue to review: set the inspection date and time; complete the inspection location; add and complete at least one finding.',
    )
  })

  it('provides type-specific reasons for structured inspection forms', () => {
    expect(
      getInspectionValidationReasons({
        missing: {
          fireExtinguisherChecks: true,
          fireExtinguisherRemarks: true,
          hydraulicChecks: true,
          frtDailyRemarks: true,
          highAngleChecks: true,
          scbaRemarks: true,
          hseDetails: true,
        },
      }),
    ).toEqual([
      'complete every fire extinguisher status',
      'add remarks for every failed fire extinguisher status',
      'complete every hydraulic equipment status',
      'add remarks for every FRT daily issue',
      'complete every High Angle equipment condition',
      'add remarks for every SCBA issue',
      'complete the required HSE observation details',
    ])
  })

  it('uses a clear fallback when row validation has no field-level reason', () => {
    expect(buildInspectionValidationStatusMessage({ errorCount: 1, missing: {} })).toBe(
      'Cannot continue to review: complete the highlighted inspection items.',
    )
  })
})

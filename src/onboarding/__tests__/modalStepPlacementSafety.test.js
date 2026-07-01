import { describe, expect, it } from 'vitest'

import { LEAVE_MANAGEMENT_TOUR_STEPS } from '../leaveManagementTourDefinition'
import { PAYROLL_CLAIMS_TOUR_STEPS } from '../payrollClaimsTourDefinition'
import { ROSTER_MANAGEMENT_TOUR_STEPS } from '../rosterManagementTourDefinition'
import { STAFF_DIRECTORY_TOUR_STEPS } from '../staffDirectoryTourDefinition'
import { TEAM_DIRECTORY_TOUR_STEPS } from '../teamDirectoryTourDefinition'

const expectSafePlacement = (steps, stepKeys) => {
  stepKeys.forEach((stepKey) => {
    const step = steps.find((entry) => entry.key === stepKey)
    expect(step, `missing step ${stepKey}`).toBeTruthy()
    expect(step.placement).toBe('auto')
    expect(step.mobilePlacement).toBe('bottom')
  })
}

describe('modal step placement safety', () => {
  it('keeps team directory modal teaching steps viewport-safe', () => {
    expectSafePlacement(TEAM_DIRECTORY_TOUR_STEPS, [
      'createModal',
      'createDefaults',
      'createCustom',
      'editModal',
      'membersEditor',
      'imagePicker',
      'deleteAction',
      'deleteModal',
    ])
  })

  it('keeps staff directory modal teaching steps viewport-safe', () => {
    expectSafePlacement(STAFF_DIRECTORY_TOUR_STEPS, [
      'messageModal',
      'messageComposer',
      'terminateModal',
      'rehireModal',
    ])
  })

  it('keeps leave management assignment modal teaching steps viewport-safe', () => {
    expectSafePlacement(LEAVE_MANAGEMENT_TOUR_STEPS, [
      'assignmentForm',
      'assignmentActivity',
      'assignmentFormClose',
      'assignmentDetail',
    ])
  })

  it('keeps replay-first modal shells viewport-safe across shared workflows', () => {
    expectSafePlacement(PAYROLL_CLAIMS_TOUR_STEPS, ['cancelModal', 'deleteModal'])
    expectSafePlacement(ROSTER_MANAGEMENT_TOUR_STEPS, ['cancelModal', 'publishModal'])
  })
})

import { describe, expect, it } from 'vitest'
import { parseWorkflowTransitionError } from '../workflowTransitionErrors'

describe('parseWorkflowTransitionError', () => {
  it('prioritizes validation field messages', () => {
    const parsed = parseWorkflowTransitionError({
      status: 422,
      payload: {
        message: 'Validation failed',
        errors: {
          remarks: ['Remarks are required for rejection.'],
        },
      },
    })

    expect(parsed.isValidation).toBe(true)
    expect(parsed.fieldErrors.remarks).toBe('Remarks are required for rejection.')
    expect(parsed.message).toBe('Remarks are required for rejection.')
  })

  it('falls back to generic message when payload has no details', () => {
    const parsed = parseWorkflowTransitionError(new Error(''), 'Unable to process workflow action.')
    expect(parsed.message).toBe('Unable to process workflow action.')
  })
})

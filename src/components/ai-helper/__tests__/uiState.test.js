import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearAiHelperUiState,
  getAiHelperUiState,
  publishAiHelperUiState,
  sanitizeAiHelperUiState,
} from '../uiState'

describe('Ask AI ephemeral UI state', () => {
  beforeEach(() => clearAiHelperUiState())

  it('keeps only bounded canonical tokens', () => {
    expect(
      sanitizeAiHelperUiState({
        record_status: 'draft',
        current_step: 'complete_checklist',
        missing_fields: ['odometer_reading', '<script>', 'odometer_reading'],
        available_actions: ['continue_review', 'Delete everything now'],
        raw_record: { secret: 'not allowed' },
      }),
    ).toEqual({
      record_status: 'draft',
      current_step: 'complete_checklist',
      missing_fields: ['odometer_reading'],
      available_actions: ['continue_review'],
    })
  })

  it('is ephemeral and scoped to the current route', () => {
    publishAiHelperUiState({ record_status: 'draft' }, '/inspection/1')

    expect(getAiHelperUiState('/inspection/1')).toEqual({ record_status: 'draft' })
    expect(getAiHelperUiState('/leave')).toBeNull()
    clearAiHelperUiState()
    expect(getAiHelperUiState('/inspection/1')).toBeNull()
  })
})

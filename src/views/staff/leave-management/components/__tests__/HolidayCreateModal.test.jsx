// @vitest-environment jsdom
import {
  createInitialWizardState,
  holidayWizardReducer,
  validateNationalDefaults,
} from '../holidayWizardHelpers'
import { describe, expect, it } from 'vitest'

describe('HolidayCreateModal wizard helpers', () => {
  it('validates required and duplicate national dates', () => {
    const state = createInitialWizardState(2026)
    expect(validateNationalDefaults(state.defaultNationalDraft)).toBeNull()

    const withMissing = state.defaultNationalDraft.map((row, index) =>
      index === 0 ? { ...row, date: '' } : row,
    )
    expect(validateNationalDefaults(withMissing)).toBe(
      'All default national holiday dates are required.',
    )

    const firstDate = state.defaultNationalDraft[0].date
    const withDuplicate = state.defaultNationalDraft.map((row, index) =>
      index === 1 ? { ...row, date: firstDate } : row,
    )
    expect(validateNationalDefaults(withDuplicate)).toBe(
      'Default national holiday dates cannot be duplicated.',
    )
  })

  it('handles wizard state transitions for proceed/back and staged rows', () => {
    let state = createInitialWizardState(2026)
    expect(state.step).toBe('default-national')

    state = holidayWizardReducer(state, { type: 'PROCEED_STEP' })
    expect(state.step).toBe('additional')

    state = holidayWizardReducer(state, {
      type: 'UPDATE_ADDITIONAL_FIELD',
      field: 'name',
      value: 'Hari Raya',
    })
    state = holidayWizardReducer(state, {
      type: 'UPDATE_ADDITIONAL_FIELD',
      field: 'date',
      value: '2026-03-21',
    })
    state = holidayWizardReducer(state, {
      type: 'STAGE_ADDITIONAL',
      row: { name: 'Hari Raya', date: '2026-03-21', scope: 'National', state: 'All States' },
    })
    expect(state.pendingAdditionalRows).toHaveLength(1)

    state = holidayWizardReducer(state, { type: 'BACK_STEP' })
    expect(state.step).toBe('default-national')
  })
})

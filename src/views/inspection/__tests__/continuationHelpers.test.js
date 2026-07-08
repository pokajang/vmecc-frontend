import { describe, expect, it } from 'vitest'
import {
  buildMainLocationContinuationOptions,
  isSummaryComplete,
} from '../types/continuationHelpers'

describe('inspection continuation helpers', () => {
  it('requires rows, checked rows, and clear missing fields before marking a scope complete', () => {
    expect(
      isSummaryComplete({
        summary: { totalCount: 2, checkedCount: 2 },
        missingFields: { hydraulicChecks: false, hydraulicRemarks: false },
      }),
    ).toBe(true)

    expect(
      isSummaryComplete({
        summary: { totalCount: 2, checkedCount: 2 },
        missingFields: { hydraulicChecks: false, hydraulicRemarks: true },
      }),
    ).toBe(false)

    expect(
      isSummaryComplete({
        summary: { totalCount: 0, checkedCount: 0 },
        missingFields: {},
      }),
    ).toBe(false)
  })

  it('builds main-location continuation options with progress from patched forms', () => {
    const continuation = buildMainLocationContinuationOptions({
      form: { mainLocation: 'Store', checksByLocation: { Store: 2, Office: 0 } },
      options: [
        { value: 'Store', title: 'Store' },
        { value: 'Office', title: 'Office' },
      ],
      getSummary: (form) => ({
        totalCount: 2,
        checkedCount: form.checksByLocation[form.mainLocation] || 0,
      }),
      getMissingFields: (form) => ({
        checks: (form.checksByLocation[form.mainLocation] || 0) < 2,
      }),
      label: 'location',
    })

    expect(continuation).toEqual(
      expect.objectContaining({
        scope: 'mainLocation',
        label: 'location',
        currentValue: 'Store',
      }),
    )
    expect(continuation.options[0]).toEqual(
      expect.objectContaining({
        value: 'Store',
        metaLabel: 'Completed',
        progress: expect.objectContaining({ isDone: true }),
      }),
    )
    expect(continuation.options[1]).toEqual(
      expect.objectContaining({
        value: 'Office',
        metaLabel: '0/2 checks',
        progress: expect.objectContaining({ isDone: false }),
      }),
    )
  })
})

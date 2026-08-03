// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import useOvertimeRateSettingsController from '../useOvertimeRateSettingsController'

describe('useOvertimeRateSettingsController', () => {
  it('exposes the base validation error setter to the settings view', () => {
    const { result } = renderHook(() =>
      useOvertimeRateSettingsController({
        otRateSettings: { baseHourCalculation: {} },
        otRateDirty: false,
        reloadOvertimeRates: vi.fn(),
        persistOvertimeRates: vi.fn(),
        updateOvertimeBaseHourField: vi.fn(),
      }),
    )

    act(() => result.current.setBaseError('Monthly divisor is required.'))

    expect(result.current.baseError).toBe('Monthly divisor is required.')
  })
})

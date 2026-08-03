// @vitest-environment jsdom
import React from 'react'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import OvertimeRateSettingsTab from '../OvertimeRateSettingsTab'

const mocks = vi.hoisted(() => ({
  useController: vi.fn(),
}))

vi.mock('../../hooks/useOvertimeRateSettingsController', () => ({
  default: (...args) => mocks.useController(...args),
}))

const buildController = (overrides = {}) => ({
  isApplicabilityEditing: false,
  setIsApplicabilityEditing: vi.fn(),
  isRateEditing: false,
  setIsRateEditing: vi.fn(),
  isBaseEditing: false,
  setIsBaseEditing: vi.fn(),
  baseError: 'Previous validation error',
  setBaseError: vi.fn(),
  sampleBasicSalaryInput: '3000',
  setSampleBasicSalaryInput: vi.fn(),
  isSampleBasicSalaryEditing: false,
  setIsSampleBasicSalaryEditing: vi.fn(),
  rateHistory: [],
  baseHourCalculation: {
    mode: 'auto_statutory',
    monthlyDivisor: '26',
    globalNormalHoursPerDay: '8',
  },
  normalHoursStrategy: 'statutory_8h',
  roleNormalHoursPerDay: {},
  defaultRoleHoursPerDay: '8',
  roleNormalHourOverrideCount: 0,
  hasRoleNormalHourOverrides: false,
  roleNormalHourOverrideEntries: [],
  selectedRoleOverrides: [],
  otApplicabilityRoles: ['Staff'],
  formatValue: (value, { suffix = '' } = {}) => `${value ?? '-'}${suffix}`,
  sampleOvertimeBreakdown: { available: false, message: 'Sample unavailable' },
  handleRateSave: vi.fn(),
  handleRateCancel: vi.fn(),
  handleBaseSave: vi.fn(),
  handleBaseCancel: vi.fn(),
  handleBaseResetDefaults: vi.fn(),
  handleApplicabilitySave: vi.fn(),
  handleApplicabilityCancel: vi.fn(),
  discardUnsavedOtEdits: vi.fn(() => true),
  pendingDiscardUnsavedOtEdits: false,
  cancelDiscardUnsavedOtEdits: vi.fn(),
  confirmDiscardUnsavedOtEdits: vi.fn(),
  ...overrides,
})

const renderTab = () =>
  render(
    <OvertimeRateSettingsTab
      vm={{
        otRateSettings: {
          weekdayMultiplier: '1.5',
          weekendMultiplier: '2',
          publicHolidayMultiplier: '3',
        },
        otRateDirty: false,
        formatDateTime: (value) => value,
      }}
      handlers={{
        resetOvertimeRates: vi.fn(),
        reloadOvertimeRates: vi.fn(),
        persistOvertimeRates: vi.fn(),
        updateOvertimeApplicabilityField: vi.fn(),
        updateOvertimeRateField: vi.fn(),
        updateOvertimeBaseHourField: vi.fn(),
      }}
    />,
  )

describe('OvertimeRateSettingsTab', () => {
  beforeEach(() => mocks.useController.mockReset())

  afterEach(() => cleanup())

  it('clears a stale base-hour error after confirming a switch from another editor', () => {
    let continueEditingBase = null
    const setBaseError = vi.fn()
    const setIsBaseEditing = vi.fn()
    const setIsApplicabilityEditing = vi.fn()
    const discardUnsavedOtEdits = vi.fn((continuation) => {
      continueEditingBase = continuation
      return false
    })
    mocks.useController.mockReturnValue(
      buildController({
        isRateEditing: true,
        setBaseError,
        setIsBaseEditing,
        setIsApplicabilityEditing,
        discardUnsavedOtEdits,
      }),
    )

    renderTab()

    const baseHeader = screen.getByText('Base Hour Calculation').closest('.card-header')
    fireEvent.click(within(baseHeader).getByRole('button', { name: 'Edit' }))

    expect(discardUnsavedOtEdits).toHaveBeenCalledOnce()
    expect(setBaseError).not.toHaveBeenCalled()

    act(() => continueEditingBase())

    expect(setIsApplicabilityEditing).toHaveBeenCalledWith(false)
    expect(setBaseError).toHaveBeenCalledWith(null)
    expect(setIsBaseEditing).toHaveBeenCalledWith(true)
  })
})

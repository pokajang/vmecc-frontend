// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import useOvertimeForm from '../useOvertimeForm'

describe('useOvertimeForm type progression', () => {
  it('selects and confirms a direct type choice atomically', () => {
    const { result } = renderHook(() => useOvertimeForm())

    act(() => result.current.handleContinueOvertimeType(vi.fn(), 'publicHoliday'))

    expect(result.current.overtimeType).toBe('publicHoliday')
    expect(result.current.overtimeTypeConfirmed).toBe(true)
  })

  it('keeps the existing validation when no direct choice is supplied', () => {
    const pushToast = vi.fn()
    const { result } = renderHook(() => useOvertimeForm())

    act(() => result.current.handleContinueOvertimeType(pushToast))

    expect(result.current.overtimeTypeConfirmed).toBe(false)
    expect(result.current.fieldErrors.overtimeType).toBe('Please select overtime type.')
    expect(pushToast).toHaveBeenCalledWith(
      'Please select overtime type before continuing.',
      expect.objectContaining({ title: 'Type required' }),
    )
  })
})

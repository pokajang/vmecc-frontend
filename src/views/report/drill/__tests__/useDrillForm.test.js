// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import useDrillForm from '../useDrillForm'

describe('useDrillForm chronology', () => {
  it('reorders chronology rows without changing their identity or content', () => {
    const { result } = renderHook(() => useDrillForm())
    act(() => {
      result.current.addChronology({ time: '09:05', action: 'Second' })
    })
    const secondId = result.current.form.chronology[1].id
    act(() => result.current.moveChronology(secondId, -1))

    expect(result.current.form.chronology[0]).toMatchObject({
      id: secondId,
      time: '09:05',
      action: 'Second',
    })
  })
})

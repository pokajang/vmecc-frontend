// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import LeaveTypeSelection from 'src/views/leave/components/LeaveTypeSelection'

afterEach(() => {
  cleanup()
  window.innerWidth = 1024
})

describe('LeaveTypeSelection', () => {
  it('presents leave types as direct actions without a separate Continue step', () => {
    render(<LeaveTypeSelection selectedType="" onSelect={() => {}} onContinue={() => {}} />)

    expect(screen.getByRole('button', { name: 'Annual Leave' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull()
    expect(screen.queryByRole('radio')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull()
  })

  it('selects and continues from one leave type action', () => {
    const onSelect = vi.fn()
    const onContinue = vi.fn()
    render(<LeaveTypeSelection selectedType="" onSelect={onSelect} onContinue={onContinue} />)

    fireEvent.click(screen.getByRole('button', { name: 'Medical Leave' }))

    expect(onSelect).toHaveBeenCalledWith('Medical Leave', expect.any(Object))
    expect(onContinue).toHaveBeenCalledWith('Medical Leave', expect.any(Object))
  })

  it('hides supporting descriptions in the mobile action list', () => {
    window.innerWidth = 390

    render(<LeaveTypeSelection selectedType="" onSelect={() => {}} onContinue={() => {}} />)

    expect(screen.getByRole('button', { name: 'Compassionate Leave' })).toBeTruthy()
    expect(screen.queryByText('Leave related to bereavement or critical family events.')).toBeNull()
    expect(screen.queryByText('Extended leave that is outside paid entitlement.')).toBeNull()
    expect(
      screen.queryByText('Non-statutory leave that requires clear written justification.'),
    ).toBeNull()
  })
})

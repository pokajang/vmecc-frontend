// @vitest-environment jsdom
import React, { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import LeaveTypeSelection from 'src/views/leave/components/LeaveTypeSelection'

afterEach(() => {
  cleanup()
})

describe('LeaveTypeSelection', () => {
  it('disables Continue until a leave type is selected', () => {
    render(<LeaveTypeSelection selectedType="" onSelect={() => {}} onContinue={() => {}} />)

    const continueButton = screen.getByRole('button', { name: 'Continue' })
    expect(continueButton.disabled).toBe(true)
  })

  it('allows selecting leave type and continuing', () => {
    const onContinue = vi.fn()
    const Wrapper = () => {
      const [selectedType, setSelectedType] = useState('Annual Leave')
      return (
        <LeaveTypeSelection
          selectedType={selectedType}
          onSelect={setSelectedType}
          onContinue={onContinue}
        />
      )
    }

    render(<Wrapper />)

    const medicalCard = screen.getByText('Medical Leave').closest('[role="button"]')
    fireEvent.click(medicalCard)
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(onContinue).toHaveBeenCalledWith('Medical Leave')
  })
})

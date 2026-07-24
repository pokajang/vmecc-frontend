import React from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import MobileSetupSummaryRow from '../MobileSetupSummaryRow'

describe('MobileSetupSummaryRow', () => {
  it('renders a two-line value and keeps reset before edit', () => {
    const onReset = vi.fn()
    const onEdit = vi.fn()

    render(
      <MobileSetupSummaryRow
        label="Date & Time"
        value="2026-07-24"
        secondaryValue="09:30 AM"
        onReset={onReset}
        onEdit={onEdit}
      />,
    )

    const group = screen.getByRole('group', { name: 'Date & Time' })
    expect(within(group).getByText('2026-07-24')).toBeTruthy()
    expect(within(group).getByText('09:30 AM')).toBeTruthy()
    expect(group.querySelector('.mobile-setup-summary__value--split')).toBeTruthy()
    expect(group.querySelector('.mobile-setup-summary__actions--paired')).toBeTruthy()

    const buttons = within(group).getAllByRole('button')
    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Reset Date & Time',
      'Edit Date & Time',
    ])

    fireEvent.click(buttons[0])
    fireEvent.click(buttons[1])
    expect(onReset).toHaveBeenCalledTimes(1)
    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  it('omits unavailable actions and exposes the full string value', () => {
    const longValue = 'Emergency Response Auxiliary Equipment Inspection'
    render(<MobileSetupSummaryRow label="Type" value={longValue} />)

    const group = screen.getByRole('group', { name: 'Type' })
    expect(within(group).queryByRole('button')).toBeNull()
    expect(within(group).getByTitle(longValue)).toBeTruthy()
  })
})

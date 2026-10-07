// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import FeedbackReportModal from '../FeedbackReportModal'

afterEach(cleanup)

describe('FeedbackReportModal', () => {
  it('shows counter, validation state, and submit loading state', () => {
    const props = {
      visible: true,
      message: 'Too short',
      error: '',
      submitting: false,
      onClose: vi.fn(),
      onMessageChange: vi.fn(),
      onSubmit: vi.fn(),
    }

    const { rerender } = render(<FeedbackReportModal {...props} />)

    expect(screen.getByRole('dialog', { name: 'Report issue' })).toBeTruthy()
    expect(screen.getByText('Minimum 10 characters.')).toBeTruthy()
    expect(screen.getByText('9/2000')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Submit report' }).hasAttribute('disabled')).toBe(
      true,
    )

    fireEvent.change(screen.getByLabelText('What happened?'), {
      target: { value: 'A longer description' },
    })
    expect(props.onMessageChange).toHaveBeenCalledWith('A longer description')

    rerender(<FeedbackReportModal {...props} message="A longer description" submitting />)
    expect(screen.getByRole('button', { name: 'Submitting...' }).hasAttribute('disabled')).toBe(
      true,
    )
  })

  it('keeps submission feedback inside the modal and replaces form actions with Close', () => {
    const onClose = vi.fn()

    render(
      <FeedbackReportModal
        visible
        message="A useful issue description"
        error=""
        success="Your report has been submitted to system administrators."
        submitting={false}
        onClose={onClose}
        onMessageChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByText('Report submitted')).toBeTruthy()
    expect(
      screen.getByText('Your report has been submitted to system administrators.'),
    ).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Submit report' })).toBeNull()

    fireEvent.click(screen.getByText('Close'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

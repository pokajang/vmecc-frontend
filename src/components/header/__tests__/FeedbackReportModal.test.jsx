// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import FeedbackReportModal from '../FeedbackReportModal'

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
})

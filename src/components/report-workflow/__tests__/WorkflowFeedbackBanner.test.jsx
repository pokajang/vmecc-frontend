// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import WorkflowFeedbackBanner from '../WorkflowFeedbackBanner'

describe('WorkflowFeedbackBanner', () => {
  it('renders feedback in flow and supports explicit dismissal', () => {
    const onDismiss = vi.fn()

    const { container } = render(
      <WorkflowFeedbackBanner
        feedback={{ title: 'Unable to save', message: 'Try again.', color: 'danger' }}
        onDismiss={onDismiss}
      />,
    )

    expect(container.querySelector('.toast')).toBeNull()
    expect(screen.getByText('Unable to save')).toBeTruthy()
    expect(screen.getByText('Try again.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('renders nothing without feedback', () => {
    const { container } = render(<WorkflowFeedbackBanner feedback={null} />)
    expect(container.innerHTML).toBe('')
  })
})

// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import WorkflowInlineFeedback from '../WorkflowInlineFeedback'

afterEach(cleanup)

describe('WorkflowInlineFeedback', () => {
  it('renders durable error feedback with a recovery action', () => {
    const onRetry = vi.fn()
    render(
      <WorkflowInlineFeedback
        kind="error"
        title="Draft not saved"
        message="Your changes remain in this form."
        action={{ label: 'Retry save', onAction: onRetry }}
      />,
    )

    expect(screen.getByRole('alert').textContent).toContain('Draft not saved')
    fireEvent.click(screen.getByRole('button', { name: 'Retry save' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('uses a polite status for non-urgent progress', () => {
    render(<WorkflowInlineFeedback kind="loading" message="Uploading photograph…" />)

    expect(screen.getByRole('status').getAttribute('aria-live')).toBe('polite')
  })
})

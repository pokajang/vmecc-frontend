// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import WorkflowEditStateBanner from '../WorkflowEditStateBanner'

afterEach(cleanup)

describe('WorkflowEditStateBanner', () => {
  it('renders a notice-only editing state without source controls', () => {
    render(
      <WorkflowEditStateBanner displayId="FIT-001">
        Changes are applied only after review and update.
      </WorkflowEditStateBanner>,
    )

    expect(screen.getByText(/Editing/).textContent).toContain('FIT-001')
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('preserves original and draft source actions as feature-owned callbacks', () => {
    const onLoadOriginal = vi.fn()
    const onLoadDraft = vi.fn()
    const { rerender } = render(
      <WorkflowEditStateBanner
        displayId="ERCO-001"
        sourceMode="original"
        hasDraftSource={false}
        onLoadOriginal={onLoadOriginal}
        onLoadDraft={onLoadDraft}
      >
        Original data stays unchanged until update.
      </WorkflowEditStateBanner>,
    )

    expect(screen.getByRole('button', { name: 'Load Original' }).classList).toContain('btn-primary')
    expect(screen.getByRole('button', { name: 'Load Draft' }).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Load Original' }))
    expect(onLoadOriginal).toHaveBeenCalledTimes(1)

    rerender(
      <WorkflowEditStateBanner
        displayId="ERCO-001"
        sourceMode="draft"
        hasDraftSource
        onLoadOriginal={onLoadOriginal}
        onLoadDraft={onLoadDraft}
      >
        Original data stays unchanged until update.
      </WorkflowEditStateBanner>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Load Draft' }))
    expect(onLoadDraft).toHaveBeenCalledTimes(1)
  })
})

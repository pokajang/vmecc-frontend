// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import WorkflowStageActions from '../WorkflowStageActions'

afterEach(cleanup)

describe('WorkflowStageActions', () => {
  it('keeps action hierarchy and handlers consistent', () => {
    const onBack = vi.fn()
    const onSave = vi.fn()
    const onPrimary = vi.fn()
    render(
      <WorkflowStageActions
        onBack={onBack}
        onSaveDraft={onSave}
        onPrimary={onPrimary}
        primaryLabel="Review report"
        statusMessage="Unsaved changes"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }))
    fireEvent.click(screen.getByRole('button', { name: 'Review report' }))

    expect(onBack).toHaveBeenCalledOnce()
    expect(onSave).toHaveBeenCalledOnce()
    expect(onPrimary).toHaveBeenCalledOnce()
    expect(screen.getByRole('status').textContent).toContain('Unsaved changes')
  })

  it('disables only the affected actions during an operational blocker', () => {
    render(<WorkflowStageActions onSaveDraft={() => {}} onPrimary={() => {}} isSaving />)

    expect(screen.getByRole('button', { name: 'Saving…' }).disabled).toBe(true)
    expect(screen.getByRole('button', { name: 'Continue' }).disabled).toBe(true)
  })

  it('announces sticky status once while preserving the compact action layout', () => {
    render(
      <WorkflowStageActions
        onPrimary={() => {}}
        statusMessage="Draft saved"
        mobileBehavior="compact-sticky"
      />,
    )

    expect(screen.getAllByText('Draft saved')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Continue' }).classList).toContain(
      'workflow-stage-actions__primary',
    )
  })

  it('places the primary action first when the mobile workflow requests it', () => {
    render(
      <WorkflowStageActions
        primaryFirst
        auxiliaryActions={<button type="button">Save Draft</button>}
        onPrimary={() => {}}
        primaryLabel="Continue to Review"
      />,
    )

    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Continue to Review',
      'Save Draft',
    ])
  })
})

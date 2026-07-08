// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import ReportingWorkflowRulesEditor from '../ReportingWorkflowRulesEditor'

afterEach(() => {
  cleanup()
})

const rules = {
  fallback: {
    reviewRole: 'Incident Commander',
    fallbackReviewRole: 'Incident Commander',
    approveRole: 'Incident Commander',
  },
  options: {
    useTeamScopedAic: true,
    allowSubmitWithoutTeam: true,
    allowIcFallbackReview: true,
    preventSelfReview: true,
    preventSelfApprove: true,
  },
}

describe('ReportingWorkflowRulesEditor', () => {
  it('renders editable workflow controls for non-inspection modules and saves module rules', async () => {
    const onSave = vi.fn().mockResolvedValue({
      ...rules,
      fallback: {
        ...rules.fallback,
        reviewRole: 'Assistant Incident Commander',
      },
    })

    render(
      <ReportingWorkflowRulesEditor
        moduleKey="erco"
        moduleLabel="ERCO"
        description="Configure ERCO workflow."
        rules={rules}
        onSave={onSave}
      />,
    )

    expect(screen.getByText('ERCO Workflow Rules')).toBeTruthy()
    expect(screen.getByText('Configure ERCO workflow.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /edit/i }))
    fireEvent.change(screen.getByLabelText('Team Review Role'), {
      target: { value: 'Assistant Incident Commander' },
    })
    fireEvent.click(screen.getByLabelText('Prevent submitter self-approval'))
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(onSave).toHaveBeenCalledWith(
      'erco',
      expect.objectContaining({
        fallback: expect.objectContaining({
          reviewRole: 'Assistant Incident Commander',
        }),
        options: expect.objectContaining({
          preventSelfApprove: false,
        }),
      }),
    )
    expect(await screen.findByText('ERCO workflow rules saved.')).toBeTruthy()
  })
})

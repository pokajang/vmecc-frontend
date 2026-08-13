// @vitest-environment jsdom
import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { InspectionFormActions } from '../form/components/InspectionFormActions'

afterEach(cleanup)

describe('InspectionFormActions', () => {
  it.each(['Saved locally. Backend sync pending', 'Saved locally. Syncing...', 'Draft synced'])(
    'hides routine technical draft status from the persistent CTA: %s',
    (draftStatus) => {
      render(
        <InspectionFormActions
          draftStatus={draftStatus}
          isMobileSticky
          onRequestReview={vi.fn()}
        />,
      )

      expect(screen.queryByText(draftStatus)).toBeNull()
      expect(screen.queryByRole('status')).toBeNull()
      expect(screen.getByRole('button', { name: 'Continue to Review' })).toBeTruthy()
    },
  )

  it('retains actionable validation guidance above the persistent CTA', () => {
    const message = 'Complete the current equipment check before continuing.'
    render(
      <InspectionFormActions
        draftStatus="Draft synced"
        isMobileSticky
        onRequestReview={vi.fn()}
        validationStatusMessage={message}
      />,
    )

    expect(screen.getByRole('status').textContent).toContain(message)
  })

  it('retains sync failure recovery with a Retry sync action', () => {
    render(
      <InspectionFormActions
        draftStatus="Draft sync failed. Retry required"
        draftSyncState={{ status: 'failed', message: 'Could not sync your changes.' }}
        isMobileSticky
        onRequestReview={vi.fn()}
        onRetryDraftSync={vi.fn()}
      />,
    )

    expect(screen.getByText('Could not sync your changes.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Retry sync' })).toBeTruthy()
  })
})

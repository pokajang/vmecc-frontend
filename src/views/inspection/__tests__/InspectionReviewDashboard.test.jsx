// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import InspectionReviewDashboard from '../records/InspectionReviewDashboard'

const pendingGeneralItem = {
  key: 'general-inspection',
  inspectionType: 'General Inspection',
  title: 'General Inspection',
  status: 'ready',
  blockers: [
    {
      key: 'draft-sync-failed',
      message: 'Unable to connect to server.',
      nonBlocking: true,
      retryCount: 1,
    },
  ],
  readiness: { isReadyToSubmit: true },
  metrics: { count: 1, checkedCount: 1, issueCount: 0, defectCount: 0 },
  groups: [{ label: 'Smoke finding', status: 'OK' }],
  form: { inspectedAt: '2026-07-15T09:00', description: 'Offline smoke finding' },
}

describe('InspectionReviewDashboard', () => {
  afterEach(cleanup)

  it('clearly labels an offline submission as queued before confirmation', () => {
    render(
      <InspectionReviewDashboard
        items={[pendingGeneralItem]}
        mayQueue
        queueWarning="This report will be queued on this device until sync succeeds."
        onRetrySync={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByText(/queued on this device until sync succeeds/i)).toBeTruthy()
    const queueButton = screen.getByRole('button', { name: 'Queue for sync' })
    expect(queueButton).toBeTruthy()

    fireEvent.click(queueButton)

    expect(screen.getByText('Queue General Inspection?')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Confirm Queue' })).toBeTruthy()
  })
})

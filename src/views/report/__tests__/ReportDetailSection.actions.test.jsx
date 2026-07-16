// @vitest-environment jsdom
import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ReportDetailSection from '../components/ReportDetailSection'

afterEach(cleanup)

describe('ReportDetailSection record actions', () => {
  it('uses the action contract instead of inferring controls from status', () => {
    render(
      <ReportDetailSection
        selectedRecord={{
          id: 'fitness-1',
          displayId: 'FIT-001',
          reportType: 'fitness-test',
          status: 'Submitted',
          recordActionsVersion: 1,
          recordActions: {
            download: { applicable: true, allowed: true, format: 'json' },
            edit: { applicable: true, allowed: false },
            review: { applicable: true, allowed: false },
            delete: { applicable: true, allowed: false },
          },
        }}
        onBack={vi.fn()}
        formatDateTime={() => '--'}
        onDownloadRecord={vi.fn()}
        onEditRecord={vi.fn()}
        onReviewRecord={vi.fn()}
        onDeleteRecord={vi.fn()}
        canEditRecord={() => true}
        canReviewRecord={() => true}
        canDeleteRecord={() => true}
      />,
    )

    expect(screen.getByRole('button', { name: 'Export data (.json)' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Review' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull()
    expect(screen.getAllByRole('button', { name: 'Back to records' })).toHaveLength(1)
  })
})

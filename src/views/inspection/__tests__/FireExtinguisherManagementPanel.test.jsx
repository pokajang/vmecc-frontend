// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import FireExtinguisherManagementPanel from '../records/FireExtinguisherManagementPanel'
import { fetchFireExtinguisherIssues } from '../inspectionFireExtinguisherIssueApi'

vi.mock('../inspectionFireExtinguisherApi', () => ({
  markFireExtinguisherOutOfService: vi.fn(),
  restoreFireExtinguisher: vi.fn(),
  retireFireExtinguisher: vi.fn(),
  returnFireExtinguisherToService: vi.fn(),
  updateFireExtinguisherOption: vi.fn(),
}))

vi.mock('../inspectionFireExtinguisherIssueApi', () => ({
  assignFireExtinguisherIssue: vi.fn(),
  cancelFireExtinguisherIssue: vi.fn(),
  fetchFireExtinguisherIssues: vi.fn(),
  reopenFireExtinguisherIssue: vi.fn(),
  resolveFireExtinguisherIssue: vi.fn(),
  startFireExtinguisherIssue: vi.fn(),
  updateFireExtinguisherIssue: vi.fn(),
  verifyFireExtinguisherIssue: vi.fn(),
}))

vi.mock('src/views/report/shared/emergency-report/ReportPhotoSection', () => ({
  default: () => <div>Resolution evidence uploader</div>,
}))

const cancelledIssue = {
  id: 41,
  status: 'cancelled',
  severity: 'medium',
  title: 'Operational condition defect',
  occurrenceCount: 1,
  resolutionEvidence: [],
  events: [],
  lockVersion: 3,
}

const renderPanel = (lifecycleStatus) =>
  render(
    <FireExtinguisherManagementPanel
      detail={{
        catalogId: 7,
        idLocNo: 'LIFE-007',
        lifecycleStatus,
        lockVersion: 2,
      }}
      currentUser={{ id: 9, name: 'Inspector' }}
      canManageCatalog
      canManageIssues
      canVerifyIssues
    />,
  )

beforeEach(() => {
  vi.mocked(fetchFireExtinguisherIssues).mockResolvedValue({
    data: [cancelledIssue],
    meta: { total: 1 },
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('FireExtinguisherManagementPanel', () => {
  it('does not offer issue reopening while the extinguisher is retired', async () => {
    renderPanel('retired')

    expect(await screen.findByText('Operational condition defect')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Restore' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Reopen' })).toBeNull()
  })

  it('offers issue reopening after the extinguisher is active again', async () => {
    renderPanel('active')

    expect(await screen.findByText('Operational condition defect')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Reopen' })).toBeTruthy()
  })
})

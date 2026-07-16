// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

import { triggerBlobDownload } from 'src/utils/downloadFile'
import {
  downloadFireExtinguisherExceptionExport,
  previewFireExtinguisherExceptionExport,
} from '../inspectionFireExtinguisherApi'
import FireExtinguisherExceptionExportDialog from '../records/fire-extinguisher-export/FireExtinguisherExceptionExportDialog'
import {
  buildFireExtinguisherExportFilters,
  getInitialFireExtinguisherExportCategories,
} from '../records/fire-extinguisher-export/fireExtinguisherExportFilters'

vi.mock('../inspectionFireExtinguisherApi', () => ({
  previewFireExtinguisherExceptionExport: vi.fn(),
  downloadFireExtinguisherExceptionExport: vi.fn(),
}))

vi.mock('src/utils/downloadFile', () => ({
  triggerBlobDownload: vi.fn(),
}))

const FILTER_SNAPSHOT = {
  search: 'VEE',
  period: 'last30',
  periodFrom: '',
  periodTo: '',
  sort: 'issues',
  duplicateScope: 'all',
  zoneFilter: 'Zone 2',
  locationFilter: 'Workshop',
  inspectedByFilter: 'all',
  statusFilter: 'all',
  issueFilter: 'with-issues',
  certificationFilter: 'expired',
  rowsToShow: 10,
  currentPage: 3,
}

describe('fire extinguisher exception export', () => {
  beforeEach(() => {
    vi.mocked(previewFireExtinguisherExceptionExport).mockResolvedValue({
      total: 7,
      issues: 5,
      expired: 4,
      overlap: 2,
      appliedFilters: [
        { key: 'search', label: 'Search: VEE' },
        { key: 'zone', label: 'Zone: Zone 2' },
      ],
      scope: 'current_filters',
    })
    vi.mocked(downloadFireExtinguisherExceptionExport).mockResolvedValue({
      blob: new Blob(['docx'], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
      filename: 'fire-extinguisher-issues-and-expired.docx',
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('maps table classifications into categories and excludes pagination and sorting', () => {
    expect(getInitialFireExtinguisherExportCategories(FILTER_SNAPSHOT)).toEqual([
      'issues',
      'expired',
    ])
    expect(buildFireExtinguisherExportFilters(FILTER_SNAPSHOT)).toEqual({
      search: 'VEE',
      period: 'last30',
      periodFrom: '',
      periodTo: '',
      zone: 'Zone 2',
      location: 'Workshop',
      inspectedBy: 'all',
      status: 'all',
      duplicateScope: 'all',
    })
  })

  it('preselects active exception filters and downloads the selected Word export once', async () => {
    render(
      <FireExtinguisherExceptionExportDialog
        visible
        filterSnapshot={FILTER_SNAPSHOT}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByRole('checkbox', { name: /Issues/ }).checked).toBe(true)
    expect(screen.getByRole('checkbox', { name: /Expired/ }).checked).toBe(true)
    await waitFor(() => expect(previewFireExtinguisherExceptionExport).toHaveBeenCalled())
    expect(await screen.findByText(/7 unique extinguishers will be exported/)).toBeTruthy()
    expect(screen.getByText('Search: VEE')).toBeTruthy()

    fireEvent.click(screen.getByRole('radio', { name: 'Word (.docx)' }))
    fireEvent.click(screen.getByRole('button', { name: /Export Word · 7 records/ }))

    await waitFor(() => expect(downloadFireExtinguisherExceptionExport).toHaveBeenCalledOnce())
    expect(downloadFireExtinguisherExceptionExport).toHaveBeenCalledWith(
      expect.objectContaining({
        categories: ['issues', 'expired'],
        format: 'docx',
        scope: 'current_filters',
        filters: expect.objectContaining({ zone: 'Zone 2', location: 'Workshop' }),
      }),
    )
    await waitFor(() =>
      expect(triggerBlobDownload).toHaveBeenCalledWith(
        expect.any(Blob),
        'fire-extinguisher-issues-and-expired.docx',
      ),
    )
    expect(screen.getByText('Download complete. Check your Downloads folder.')).toBeTruthy()
  })

  it('requires an explicit category when the table has no exception filter', async () => {
    render(
      <FireExtinguisherExceptionExportDialog
        visible
        filterSnapshot={{ ...FILTER_SNAPSHOT, issueFilter: 'all', certificationFilter: 'all' }}
        onClose={vi.fn()}
      />,
    )

    await waitFor(() => expect(previewFireExtinguisherExceptionExport).toHaveBeenCalled())
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.getByRole('button', { name: 'Export PDF' }).disabled).toBe(true)
  })
})

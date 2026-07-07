// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import InspectionMobileHome from '../app/InspectionMobileHome'

afterEach(() => {
  cleanup()
})

const baseProps = {
  draftRow: null,
  typeOptions: [],
  recentRecords: [],
  recordsCount: 0,
  queueSummary: null,
  recordScope: 'mine',
  onRecordScopeChange: vi.fn(),
  onSelectType: vi.fn(),
  onToggleTypes: vi.fn(),
  onAddType: vi.fn(),
  onContinueDraft: vi.fn(),
  onDeleteDraft: vi.fn(),
  onOpenRecord: vi.fn(),
  onViewRecords: vi.fn(),
  onRetryQueue: vi.fn(),
}

const recentRows = [
  {
    id: 'inspection-1',
    displayId: 'INS-001',
    incidentType: 'Hydraulic Rescue Tools Inspection',
    location: 'FRT',
    status: 'Submitted',
    createdAt: '2026-06-28T08:00:00.000Z',
  },
  {
    id: 'inspection-2',
    displayId: 'INS-002',
    incidentType: 'Hydraulic Rescue Tools Inspection',
    location: 'Store',
    status: 'Submitted',
    createdAt: '2026-06-28T08:05:00.000Z',
  },
  {
    id: 'inspection-3',
    displayId: 'INS-003',
    incidentType: 'Hydraulic Rescue Tools Inspection',
    location: 'Hydraulic Training Yard',
    status: 'Reviewed',
    createdAt: '2026-06-28T08:10:00.000Z',
  },
]

describe('InspectionMobileHome', () => {
  it('uses constrained mobile-home layout hooks for type and records controls', () => {
    const { container } = render(
      <InspectionMobileHome
        {...baseProps}
        typeOptions={[
          {
            value: 'Emergency Response Auxiliary Equipment',
            title: 'Emergency Response Auxiliary Equipment',
          },
        ]}
        recordsCount={12}
      />,
    )

    expect(container.querySelector('.inspection-mobile-home')).toBeTruthy()
    expect(container.querySelector('.inspection-mobile-home__type-grid')).toBeTruthy()
    expect(container.querySelector('.inspection-mobile-home__records-toolbar')).toBeTruthy()
    expect(container.querySelector('.inspection-view-all-btn')).toBeTruthy()
  })

  it('renders recent records as a grouped mobile list and opens selected rows', () => {
    const onOpenRecord = vi.fn()
    const onViewRecords = vi.fn()

    render(
      <InspectionMobileHome
        {...baseProps}
        recentRecords={recentRows}
        recordsCount={6}
        onOpenRecord={onOpenRecord}
        onViewRecords={onViewRecords}
      />,
    )

    expect(document.querySelector('.list-group')).toBeTruthy()
    expect(document.querySelectorAll('.list-group-item')).toHaveLength(3)
    expect(screen.getAllByText('Hydraulic Rescue Tools')).toHaveLength(3)
    expect(screen.getByText('FRT')).toBeTruthy()
    expect(screen.getByText('Store')).toBeTruthy()
    expect(screen.getByText('Hydraulic Training Yard')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Open inspection record INS-002 summary' }))
    expect(onOpenRecord).toHaveBeenCalledWith(recentRows[1])

    fireEvent.click(screen.getByRole('button', { name: 'View all (6)' }))
    expect(onViewRecords).toHaveBeenCalled()
  })

  it('keeps loading and empty states', () => {
    const { rerender } = render(<InspectionMobileHome {...baseProps} isRecordsLoading />)
    expect(screen.getByText('Loading records...')).toBeTruthy()

    rerender(<InspectionMobileHome {...baseProps} />)
    expect(screen.getByText('No records yet.')).toBeTruthy()
  })

  it('surfaces fire extinguisher draft progress and pending sync state', () => {
    const onContinueDraft = vi.fn()
    const onDeleteDraft = vi.fn()

    render(
      <InspectionMobileHome
        {...baseProps}
        onContinueDraft={onContinueDraft}
        onDeleteDraft={onDeleteDraft}
        draftRow={{
          id: 'draft-inspection-new',
          incidentType: 'Fire Extinguisher Inspection',
          location: 'Reception',
          savedAt: '2026-07-05T13:52:00.000Z',
          draftProgressSummary: '19/20 checked',
          draftDefectSummary: '2 defects',
          syncStatus: 'failed',
        }}
      />,
    )

    expect(
      screen.getByText('Fire Extinguisher - Reception - 19/20 checked - 2 defects'),
    ).toBeTruthy()
    expect(screen.getByText('Sync pending')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Continue inspection draft' }))
    expect(onContinueDraft).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Delete draft' }))
    expect(onDeleteDraft).toHaveBeenCalledTimes(1)
    expect(onContinueDraft).toHaveBeenCalledTimes(1)
  })
})

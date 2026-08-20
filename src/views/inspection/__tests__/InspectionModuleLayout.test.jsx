// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import InspectionModuleLayout from '../app/InspectionModuleLayout'

vi.mock('../app/InspectionModuleModalStack', () => ({
  default: () => null,
}))

vi.mock('../app/InspectionModuleSections', () => ({
  AllExtinguishersView: () => null,
  InspectionDetailView: () => <div>Inspection detail content</div>,
  InspectionFormView: () => null,
  InspectionRecordsView: () => null,
  InspectionReviewView: () => null,
}))

afterEach(() => {
  cleanup()
})

describe('InspectionModuleLayout', () => {
  it('renders inspection details inside the visible drawer', () => {
    render(
      <InspectionModuleLayout
        activeSection="detail"
        clearContinuationState={vi.fn()}
        detailViewProps={{}}
        formViewProps={{}}
        headerActions={null}
        isDeleting={false}
        isSubmitting={false}
        modalProps={{}}
        navigate={vi.fn()}
        pageTitle="Inspection"
        recordsSectionActive={false}
        recordsViewProps={{}}
        reportBasePath="/inspection"
        reviewViewProps={{}}
        runGuardedAction={vi.fn()}
        startNew={vi.fn()}
      />,
    )

    const detail = screen.getByText('Inspection detail content')
    expect(detail.closest('.inspection-detail-drawer')).toBeTruthy()
  })

  it('closes a detail drawer to its durable record-list context', () => {
    const navigate = vi.fn()
    render(
      <InspectionModuleLayout
        activeSection="detail"
        clearContinuationState={vi.fn()}
        detailViewProps={{}}
        formViewProps={{}}
        headerActions={null}
        isDeleting={false}
        isSubmitting={false}
        modalProps={{}}
        navigate={navigate}
        pageTitle="Inspection"
        recordsSectionActive
        recordsReturnPath="/inspection?scope=all"
        recordsViewProps={{}}
        reportBasePath="/inspection"
        reviewViewProps={{}}
        runGuardedAction={vi.fn()}
        startNew={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Close inspection details' }))
    expect(navigate).toHaveBeenCalledWith('/inspection?scope=all')
  })
})

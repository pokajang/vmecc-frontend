// @vitest-environment jsdom
import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
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
  it('renders async feedback inside the visible inspection detail drawer', () => {
    render(
      <InspectionModuleLayout
        activeSection="detail"
        clearContinuationState={vi.fn()}
        detailViewProps={{}}
        feedback={{
          id: 1,
          title: 'Downloading report',
          message: 'Preparing your PDF for download...',
          color: 'info',
          delay: 0,
        }}
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

    const status = screen.getByRole('status')
    expect(status.textContent).toContain('Downloading report')
    expect(status.closest('.inspection-detail-drawer__feedback')).toBeTruthy()
    expect(screen.getAllByRole('status')).toHaveLength(1)
  })
})

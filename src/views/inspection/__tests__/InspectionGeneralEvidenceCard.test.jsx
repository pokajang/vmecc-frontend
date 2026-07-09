// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { InspectionGeneralEvidenceCard } from '../form/components/InspectionFormDisplaySections'
import { INSPECTION_REPORT_EVIDENCE_COPY } from '../inspectionReportEvidenceCopy'

const setMobileViewport = () => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn((query) => ({
      matches: query === '(max-width: 575.98px)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

afterEach(() => {
  cleanup()
  document.body.style.removeProperty('overflow')
  document.body.style.removeProperty('padding-right')
  delete window.matchMedia
})

describe('InspectionGeneralEvidenceCard', () => {
  it('shows structured general evidence behind a compact mobile drawer action', () => {
    setMobileViewport()

    render(
      <InspectionGeneralEvidenceCard
        title={INSPECTION_REPORT_EVIDENCE_COPY.sectionTitle}
        photos={[]}
        compactOnMobile
        compactActionLabel={INSPECTION_REPORT_EVIDENCE_COPY.mobileActionLabel}
        drawerDescription={INSPECTION_REPORT_EVIDENCE_COPY.helperText}
        emptyMessage={INSPECTION_REPORT_EVIDENCE_COPY.emptyPhotosMessage}
      />,
    )

    expect(screen.getByText(INSPECTION_REPORT_EVIDENCE_COPY.mobileActionLabel)).toBeTruthy()
    expect(screen.queryByText(INSPECTION_REPORT_EVIDENCE_COPY.emptyPhotosMessage)).toBeNull()

    fireEvent.click(screen.getByText(INSPECTION_REPORT_EVIDENCE_COPY.mobileActionLabel))

    const drawerBody = document.querySelector('.inspection-general-evidence-drawer-body')
    expect(drawerBody).toBeTruthy()
    expect(within(drawerBody).getByRole('button', { name: 'Take photo' })).toBeTruthy()
    expect(within(drawerBody).getByRole('button', { name: 'Upload photo' })).toBeTruthy()
    expect(
      document
        .querySelector('.mobile-bottom-drawer__actions')
        ?.querySelector('[aria-label="Take photo"]'),
    ).toBeNull()
    expect(
      screen.getByText(
        INSPECTION_REPORT_EVIDENCE_COPY.helperText,
      ),
    ).toBeTruthy()
    expect(screen.getByText(INSPECTION_REPORT_EVIDENCE_COPY.emptyPhotosMessage)).toBeTruthy()
  })

  it('keeps the existing card presentation outside compact mobile mode', () => {
    render(
      <InspectionGeneralEvidenceCard
        title={INSPECTION_REPORT_EVIDENCE_COPY.sectionTitle}
        photos={[]}
        emptyMessage={INSPECTION_REPORT_EVIDENCE_COPY.emptyPhotosMessage}
      />,
    )

    expect(screen.getByText(INSPECTION_REPORT_EVIDENCE_COPY.sectionTitle)).toBeTruthy()
    expect(screen.getByText(INSPECTION_REPORT_EVIDENCE_COPY.emptyPhotosMessage)).toBeTruthy()
    expect(screen.queryByText('Add photos (optional)')).toBeNull()
  })

  it('edits optional report remarks and shows saved remarks read-only', () => {
    const onChangeRemarks = vi.fn()
    const { rerender } = render(
      <InspectionGeneralEvidenceCard
        title={INSPECTION_REPORT_EVIDENCE_COPY.sectionTitle}
        photos={[]}
        remarks=""
        remarksLabel={INSPECTION_REPORT_EVIDENCE_COPY.remarksLabel}
        remarksPlaceholder={INSPECTION_REPORT_EVIDENCE_COPY.remarksPlaceholder}
        onChangeRemarks={onChangeRemarks}
      />,
    )

    const remarksInput = screen.getByLabelText(INSPECTION_REPORT_EVIDENCE_COPY.remarksLabel)
    expect(remarksInput.getAttribute('maxlength')).toBe('2000')

    fireEvent.change(remarksInput, {
      target: { value: 'Access limited during night shift.' },
    })

    expect(onChangeRemarks).toHaveBeenCalledWith('Access limited during night shift.')

    rerender(
      <InspectionGeneralEvidenceCard
        title={INSPECTION_REPORT_EVIDENCE_COPY.sectionTitle}
        photos={[]}
        remarks="Access limited during night shift."
        remarksLabel={INSPECTION_REPORT_EVIDENCE_COPY.remarksLabel}
        readOnly
      />,
    )

    expect(screen.getByText(INSPECTION_REPORT_EVIDENCE_COPY.remarksLabel)).toBeTruthy()
    expect(screen.getByText('Access limited during night shift.')).toBeTruthy()
  })
})

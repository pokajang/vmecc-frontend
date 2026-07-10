// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
        stageDrawerPhotos
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
    expect(screen.getByText(INSPECTION_REPORT_EVIDENCE_COPY.helperText)).toBeTruthy()
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

  it('stages compact mobile drawer photos until saved and supports reset', async () => {
    setMobileViewport()
    const stagedPhoto = {
      id: 'photo-1',
      fileName: 'evidence.jpg',
      url: 'data:image/jpeg;base64,abc',
    }

    const Harness = () => {
      const [photos, setPhotos] = React.useState([])

      return (
        <InspectionGeneralEvidenceCard
          title={INSPECTION_REPORT_EVIDENCE_COPY.sectionTitle}
          photos={photos}
          compactOnMobile
          stageDrawerPhotos
          compactActionLabel={INSPECTION_REPORT_EVIDENCE_COPY.mobileActionLabel}
          drawerDescription={INSPECTION_REPORT_EVIDENCE_COPY.helperText}
          emptyMessage={INSPECTION_REPORT_EVIDENCE_COPY.emptyPhotosMessage}
          onUploadPhoto={(options) => options?.onAddPhotos?.([stagedPhoto])}
          onSavePhotos={setPhotos}
        />
      )
    }

    render(<Harness />)

    fireEvent.click(screen.getByText(INSPECTION_REPORT_EVIDENCE_COPY.mobileActionLabel))
    fireEvent.click(screen.getByRole('button', { name: 'Upload photo' }))

    expect(screen.getByText('evidence.jpg')).toBeTruthy()
    expect(screen.getByText('1 photo ready to save')).toBeTruthy()
    expect(
      screen.queryByText(`${INSPECTION_REPORT_EVIDENCE_COPY.mobileActionLabel} (1)`),
    ).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(screen.queryByText('evidence.jpg')).toBeNull()
    expect(screen.getByText('0 photos attached to this report')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Upload photo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save photos' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(
      screen.getByText(`${INSPECTION_REPORT_EVIDENCE_COPY.mobileActionLabel} (1)`),
    ).toBeTruthy()
  })

  it('confirms before discarding staged compact mobile drawer photos when closed without saving', async () => {
    setMobileViewport()
    const stagedPhoto = {
      id: 'photo-1',
      fileName: 'evidence.jpg',
      url: 'data:image/jpeg;base64,abc',
    }

    render(
      <InspectionGeneralEvidenceCard
        title={INSPECTION_REPORT_EVIDENCE_COPY.sectionTitle}
        photos={[]}
        compactOnMobile
        stageDrawerPhotos
        compactActionLabel={INSPECTION_REPORT_EVIDENCE_COPY.mobileActionLabel}
        emptyMessage={INSPECTION_REPORT_EVIDENCE_COPY.emptyPhotosMessage}
        onUploadPhoto={(options) => options?.onAddPhotos?.([stagedPhoto])}
        onSavePhotos={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByText(INSPECTION_REPORT_EVIDENCE_COPY.mobileActionLabel))
    fireEvent.click(screen.getByRole('button', { name: 'Upload photo' }))

    expect(screen.getByText('evidence.jpg')).toBeTruthy()
    expect(screen.getByText('1 photo ready to save')).toBeTruthy()

    fireEvent.click(
      screen.getByRole('button', {
        name: `Close ${INSPECTION_REPORT_EVIDENCE_COPY.sectionTitle}`,
      }),
    )

    expect(screen.getByText('Save photos first?')).toBeTruthy()
    expect(
      screen.getByText(
        'You have photo changes ready to save. Save them before closing, or discard the changes.',
      ),
    ).toBeTruthy()
    expect(screen.getByText('evidence.jpg')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }))
    expect(screen.getByText('evidence.jpg')).toBeTruthy()

    fireEvent.click(
      screen.getByRole('button', {
        name: `Close ${INSPECTION_REPORT_EVIDENCE_COPY.sectionTitle}`,
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByText(INSPECTION_REPORT_EVIDENCE_COPY.mobileActionLabel)).toBeTruthy()
    expect(
      screen.queryByText(`${INSPECTION_REPORT_EVIDENCE_COPY.mobileActionLabel} (1)`),
    ).toBeNull()

    fireEvent.click(screen.getByText(INSPECTION_REPORT_EVIDENCE_COPY.mobileActionLabel))

    expect(screen.queryByText('evidence.jpg')).toBeNull()
    expect(screen.getByText('0 photos attached to this report')).toBeTruthy()
  })

  it('resets compact mobile drawer photos and descriptions to the drawer-open baseline', () => {
    setMobileViewport()
    const savedPhoto = {
      id: 'saved-photo',
      fileName: 'saved.jpg',
      url: 'data:image/jpeg;base64,saved',
      description: 'Saved description',
    }
    const stagedPhoto = {
      id: 'staged-photo',
      fileName: 'staged.jpg',
      url: 'data:image/jpeg;base64,staged',
      description: 'Staged description',
    }

    render(
      <InspectionGeneralEvidenceCard
        title={INSPECTION_REPORT_EVIDENCE_COPY.sectionTitle}
        photos={[savedPhoto]}
        compactOnMobile
        stageDrawerPhotos
        compactActionLabel={INSPECTION_REPORT_EVIDENCE_COPY.mobileActionLabel}
        emptyMessage={INSPECTION_REPORT_EVIDENCE_COPY.emptyPhotosMessage}
        onUploadPhoto={(options) => options?.onAddPhotos?.([stagedPhoto])}
        onSavePhotos={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByText(`${INSPECTION_REPORT_EVIDENCE_COPY.mobileActionLabel} (1)`))
    fireEvent.change(screen.getByDisplayValue('Saved description'), {
      target: { value: 'Edited unsaved description' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Upload photo' }))

    expect(screen.getByText('staged.jpg')).toBeTruthy()
    expect(screen.getByDisplayValue('Edited unsaved description')).toBeTruthy()
    expect(screen.getByDisplayValue('Staged description')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))

    expect(screen.queryByText('staged.jpg')).toBeNull()
    expect(screen.queryByDisplayValue('Staged description')).toBeNull()
    expect(screen.queryByDisplayValue('Edited unsaved description')).toBeNull()
    expect(screen.getByDisplayValue('Saved description')).toBeTruthy()
    expect(screen.getByText('1 photo attached to this report')).toBeTruthy()
  })
})

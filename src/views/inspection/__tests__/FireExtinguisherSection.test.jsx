// @vitest-environment jsdom
import React, { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { FireExtinguisherEditSection } from '../types/fire-extinguisher/section'
import { FIRE_EXTINGUISHER_CHECK_FIELDS } from '../types/fire-extinguisher/helpers'

afterEach(() => {
  cleanup()
  delete window.matchMedia
})

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

const renderSection = (props = {}) =>
  render(
    <FireExtinguisherEditSection
      mainLocation="Manjung Hub"
      mainLocationLabel="Zone 1 > Manjung Hub"
      form={{ zone: '1', subLocation: 'Operation LAB' }}
      summary={{
        visibleChecks: [],
        completedCount: 0,
        totalCount: 0,
        defectCount: 0,
      }}
      fieldErrors={{}}
      validationState={null}
      handlers={{}}
      {...props}
    />,
  )

const buildCompleteOkRow = (overrides = {}) => ({
  id: 'fe:ok',
  idLocNo: 'ADO-001',
  barcodeNo: 'EE042021Y544896',
  feType: 'DP 6KG',
  mainLocation: 'Reception',
  subLocation: 'Reception',
  certificationValidity: '2025-07-01',
  ...FIRE_EXTINGUISHER_CHECK_FIELDS.reduce((next, field) => {
    next[field.key] = field.options[0]
    next[field.remarksKey] = ''
    next[field.photosKey] = []
    return next
  }, {}),
  ...overrides,
})

const FireExtinguisherStatefulHarness = () => {
  const [row, setRow] = useState(
    buildCompleteOkRow({
      operationalCondition: 'Not Good',
      operationalConditionRemarks: '',
      operationalConditionPhotos: [{ id: 'photo-1', url: '/photo-1.jpg' }],
    }),
  )

  return (
    <FireExtinguisherEditSection
      mainLocation="Manjung Hub"
      mainLocationLabel="Zone 1 > Manjung Hub"
      form={{ zone: '1', subLocation: 'Operation LAB' }}
      summary={{
        visibleChecks: [row],
        completedCount: 0,
        totalCount: 1,
        defectCount: 1,
      }}
      fieldErrors={{}}
      validationState={null}
      handlers={{
        onUpdateCheck: (_row, patch) => setRow((current) => ({ ...current, ...patch })),
      }}
    />
  )
}

describe('FireExtinguisherEditSection', () => {
  it('shows a loading skeleton instead of an empty message while unit rows load', () => {
    renderSection({ isLoadingRows: true })

    expect(screen.getByLabelText('Loading extinguisher units')).toBeTruthy()
    expect(screen.getByLabelText('Search fire extinguisher rows').disabled).toBe(true)
    expect(screen.queryByText('Loading units...')).toBeNull()
    expect(screen.getByText('Add extinguisher (Loading...)')).toBeTruthy()
    expect(screen.queryByText('No fire extinguishers registered for this location.')).toBeNull()
    expect(screen.queryByText('0 of 0 complete')).toBeNull()
  })

  it('shows a registered-units empty state when a selected location has no extinguishers', () => {
    renderSection({
      summary: {
        visibleChecks: [],
        completedCount: 0,
        totalCount: 0,
        defectCount: 0,
      },
    })

    expect(screen.getByText('No fire extinguishers registered for this location.')).toBeTruthy()
    expect(screen.getByText('Add extinguisher')).toBeTruthy()
  })

  it('shows a search-specific empty state when no extinguisher matches the query', () => {
    const row = buildCompleteOkRow()

    renderSection({
      summary: {
        visibleChecks: [row],
        completedCount: 1,
        totalCount: 1,
        defectCount: 0,
      },
    })

    fireEvent.change(screen.getByLabelText('Search fire extinguisher rows'), {
      target: { value: 'not-found' },
    })

    expect(screen.getByText('No fire extinguishers match this search.')).toBeTruthy()
    expect(screen.queryByText('No fire extinguishers registered for this location.')).toBeNull()
  })

  it('surfaces desktop draft status near the extinguisher list', () => {
    const row = buildCompleteOkRow()

    renderSection({
      draftStatus: 'Unsaved changes',
      summary: {
        visibleChecks: [row],
        completedCount: 1,
        totalCount: 1,
        defectCount: 0,
      },
    })

    expect(screen.getByText('Unsaved draft changes')).toBeTruthy()
  })

  it('edits extinguisher metadata inside the mobile detail drawer', () => {
    setMobileViewport()
    const onUpdateExtinguisher = vi.fn()
    const row = {
      id: 'fe:1',
      catalogId: 'cat-1',
      canEdit: true,
      idLocNo: 'CAN-001',
      barcodeNo: 'SR072024Y171594',
      feType: 'DP 9KG',
      mainLocation: 'Canteen',
      subLocation: 'Operation LAB',
      certificationValidity: '2025-09-13',
    }

    renderSection({
      summary: {
        visibleChecks: [row],
        completedCount: 0,
        totalCount: 1,
        defectCount: 0,
      },
      handlers: {
        onUpdateExtinguisher,
      },
    })

    fireEvent.click(screen.getByText('CAN-001'))
    fireEvent.click(screen.getByLabelText('Edit CAN-001'))

    const idInput = screen.getByLabelText('ID Loc. No.')
    expect(idInput.value).toBe('CAN-001')

    fireEvent.change(idInput, { target: { value: 'CAN-002' } })
    fireEvent.click(screen.getByText('Save extinguisher'))

    expect(onUpdateExtinguisher).toHaveBeenCalledWith(
      row,
      expect.objectContaining({ idLocNo: 'CAN-002' }),
    )
    expect(screen.queryByText('FE Physical Condition')).toBeNull()
  })

  it('shows a neutral right-side status label for incomplete extinguisher rows', () => {
    const row = buildCompleteOkRow({
      id: 'fe:incomplete',
      physicalCondition: '',
    })

    renderSection({
      summary: {
        visibleChecks: [row],
        completedCount: 0,
        totalCount: 1,
        defectCount: 0,
      },
    })

    expect(screen.getByTestId('fire-extinguisher-status-not-inspected')).toBeTruthy()
    expect(screen.getByLabelText('Not checked')).toBeTruthy()
  })

  it('shows a checked right-side status label for complete rows without defects', () => {
    const row = buildCompleteOkRow()

    renderSection({
      summary: {
        visibleChecks: [row],
        completedCount: 1,
        totalCount: 1,
        defectCount: 0,
      },
    })

    expect(screen.getByTestId('fire-extinguisher-status-inspected')).toBeTruthy()
    expect(screen.getByLabelText('Checked in current report')).toBeTruthy()
    expect(screen.queryByTestId('fire-extinguisher-status-defect')).toBeNull()
  })

  it('shows the latest submitted inspection context on each extinguisher row', () => {
    const row = buildCompleteOkRow({
      physicalCondition: '',
      lastInspection: {
        inspectedAt: '2026-06-05T10:30:00+08:00',
        inspectedBy: 'Jang',
      },
    })

    renderSection({
      summary: {
        visibleChecks: [row],
        completedCount: 0,
        totalCount: 1,
        defectCount: 0,
      },
    })

    expect(screen.getByText(/Last submitted inspection: .* by Jang/)).toBeTruthy()
  })

  it('shows when an extinguisher has no previous submitted inspection', () => {
    const row = buildCompleteOkRow({ physicalCondition: '' })

    renderSection({
      summary: {
        visibleChecks: [row],
        completedCount: 0,
        totalCount: 1,
        defectCount: 0,
      },
    })

    expect(screen.getByText('No previous submitted inspection')).toBeTruthy()
  })

  it('shows checked and defect count labels for complete rows with defects', () => {
    const row = buildCompleteOkRow({
      operationalCondition: 'Not Good',
      operationalConditionRemarks: 'Handle jammed',
      operationalConditionPhotos: [{ id: 'photo-1', url: '/photo-1.jpg' }],
    })

    renderSection({
      summary: {
        visibleChecks: [row],
        completedCount: 1,
        totalCount: 1,
        defectCount: 1,
      },
    })

    expect(screen.getByTestId('fire-extinguisher-status-inspected')).toBeTruthy()
    expect(screen.getByTestId('fire-extinguisher-status-defect')).toBeTruthy()
    expect(screen.getByLabelText('Checked in current report')).toBeTruthy()
    expect(screen.getByLabelText('Defect (1)')).toBeTruthy()
    expect(screen.getByText('Defect (1)')).toBeTruthy()
  })

  it("opens and resets another inspector's checked card through the standard mobile flow", () => {
    setMobileViewport()
    const onResetCheck = vi.fn()
    const row = buildCompleteOkRow({
      sessionStatus: 'completed',
      sessionCheckedBy: 'Inspector A',
      sessionCheckedAt: '2026-07-10T21:56:00+08:00',
      sessionResult: {
        status: 'completed',
        checkedBy: 'Inspector A',
        checkedAt: '2026-07-10T21:56:00+08:00',
      },
    })

    renderSection({
      summary: {
        visibleChecks: [row],
        completedCount: 1,
        totalCount: 1,
        defectCount: 0,
      },
      handlers: { onResetCheck },
    })

    expect(screen.queryByText('FE Physical Condition')).toBeNull()
    fireEvent.click(screen.getByText('ADO-001'))

    expect(screen.getByText('FE Physical Condition')).toBeTruthy()
    expect(screen.getByText(/Checked by Inspector A/)).toBeTruthy()
    fireEvent.click(screen.getAllByLabelText('Extinguisher actions for ADO-001').at(-1))
    fireEvent.click(screen.getAllByText('Reset check').at(-1))
    expect(screen.getAllByText('Reset check').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(onResetCheck).toHaveBeenCalledWith(expect.objectContaining({ id: 'fe:ok' }))
  })

  it('keeps rows checked when defect remarks are complete and photos are omitted', () => {
    const row = buildCompleteOkRow({
      operationalCondition: 'Not Good',
      operationalConditionRemarks: 'Motor issue',
      operationalConditionPhotos: [],
    })

    renderSection({
      summary: {
        visibleChecks: [row],
        completedCount: 0,
        totalCount: 1,
        defectCount: 1,
      },
    })

    expect(screen.getByTestId('fire-extinguisher-status-inspected')).toBeTruthy()
    expect(screen.getByTestId('fire-extinguisher-status-defect')).toBeTruthy()
    expect(screen.getByLabelText('Defect (1)')).toBeTruthy()
  })

  it('keeps Reset check available when an extinguisher row is already empty', () => {
    const onResetCheck = vi.fn()
    const row = buildCompleteOkRow({
      ...FIRE_EXTINGUISHER_CHECK_FIELDS.reduce((patch, field) => {
        patch[field.key] = ''
        patch[field.remarksKey] = ''
        patch[field.photosKey] = []
        return patch
      }, {}),
      remarks: '',
      photos: [],
    })

    renderSection({
      summary: {
        visibleChecks: [row],
        completedCount: 0,
        totalCount: 1,
        defectCount: 0,
      },
      handlers: { onResetCheck },
    })

    fireEvent.click(screen.getByLabelText('Extinguisher actions for ADO-001'))
    fireEvent.click(screen.getByText('Reset check'))
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))

    expect(onResetCheck).toHaveBeenCalledWith(expect.objectContaining({ id: 'fe:ok' }))
  })

  it('preserves trailing spaces in defect remarks while typing', () => {
    render(<FireExtinguisherStatefulHarness />)

    const remarks = screen.getByPlaceholderText('Operational Condition defect remarks')
    fireEvent.change(remarks, { target: { value: 'makan ' } })

    expect(screen.getByPlaceholderText('Operational Condition defect remarks').value).toBe('makan ')
  })

  it('keeps mobile drawer edits local until the extinguisher row is saved as draft', async () => {
    setMobileViewport()
    const onUpdateCheck = vi.fn()
    const onSaveFireExtinguisherRowDraft = vi.fn(() => new Promise(() => {}))
    const row = buildCompleteOkRow({
      id: 'fe:mobile-save',
      physicalCondition: '',
    })

    renderSection({
      summary: {
        visibleChecks: [row],
        completedCount: 0,
        totalCount: 1,
        defectCount: 0,
      },
      handlers: {
        onUpdateCheck,
        onSaveFireExtinguisherRowDraft,
      },
    })

    fireEvent.click(screen.getByText('ADO-001'))
    fireEvent.click(screen.getAllByText('Good')[0])

    expect(onUpdateCheck).not.toHaveBeenCalled()
    expect(screen.getByText('Unsaved changes')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.queryByText('Unsaved changes')).toBeNull()
    await waitFor(() => {
      expect(onSaveFireExtinguisherRowDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'fe:mobile-save',
          physicalCondition: 'Good',
        }),
      )
    })
  })

  it('preserves the photo-viewer callback through the mobile draft upload handler', () => {
    setMobileViewport()
    const onRequestDefectPhotoUpload = vi.fn()
    const onSaveFireExtinguisherRowDraft = vi.fn()
    const row = buildCompleteOkRow({
      id: 'fe:mobile-photo',
      physicalCondition: 'Not Good',
      physicalConditionRemarks: 'Damaged body',
      physicalConditionPhotos: [],
    })

    renderSection({
      summary: {
        visibleChecks: [row],
        completedCount: 1,
        totalCount: 1,
        defectCount: 1,
      },
      handlers: { onRequestDefectPhotoUpload, onSaveFireExtinguisherRowDraft },
    })

    fireEvent.click(screen.getByText('ADO-001'))
    fireEvent.click(screen.getByRole('button', { name: 'Add photo (optional)' }))

    expect(onRequestDefectPhotoUpload).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'fe:mobile-photo' }),
      expect.objectContaining({ key: 'physicalCondition' }),
      expect.objectContaining({
        onAddPhotos: expect.any(Function),
        onAfterAddPhotos: expect.any(Function),
      }),
    )

    const uploadOptions = onRequestDefectPhotoUpload.mock.calls[0][2]
    const photo = {
      id: 'captured-photo',
      fileName: 'captured-photo.jpg',
      url: '/captured-photo.jpg',
    }
    act(() => {
      uploadOptions.onAddPhotos(row, 'physicalConditionPhotos', [photo])
      uploadOptions.onAfterAddPhotos({
        photosKey: 'physicalConditionPhotos',
        photos: [photo],
        addedPhotos: [photo],
        row,
      })
    })

    const photoDrawerTitle = screen.getByText('ADO-001 - FE Physical Condition defect photos')
    const photoDrawer = photoDrawerTitle.closest('[role="dialog"]')
    expect(photoDrawer).toBeTruthy()
    expect(screen.getAllByRole('dialog')).toHaveLength(2)

    fireEvent.click(
      within(photoDrawer).getByRole('button', { name: 'Edit description for Photo 1' }),
    )
    fireEvent.change(within(photoDrawer).getByLabelText('Description for Photo 1'), {
      target: { value: 'Damage beside the pressure gauge.' },
    })
    fireEvent.click(within(photoDrawer).getByRole('button', { name: 'Save' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSaveFireExtinguisherRowDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'fe:mobile-photo',
        physicalConditionPhotos: [
          expect.objectContaining({
            id: 'captured-photo',
            description: 'Damage beside the pressure gauge.',
          }),
        ],
      }),
    )
  })

  it('discards unsaved mobile drawer edits when Cancel is selected', () => {
    setMobileViewport()
    const onSaveFireExtinguisherRowDraft = vi.fn()
    const row = buildCompleteOkRow({
      id: 'fe:mobile-cancel',
      physicalCondition: '',
    })

    renderSection({
      summary: {
        visibleChecks: [row],
        completedCount: 0,
        totalCount: 1,
        defectCount: 0,
      },
      handlers: {
        onSaveFireExtinguisherRowDraft,
      },
    })

    fireEvent.click(screen.getByText('ADO-001'))
    fireEvent.click(screen.getAllByText('Good')[0])
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onSaveFireExtinguisherRowDraft).not.toHaveBeenCalled()
    expect(screen.queryByText('FE Physical Condition')).toBeNull()
  })

  it('confirms before closing a dirty mobile extinguisher drawer', () => {
    setMobileViewport()
    const row = buildCompleteOkRow({
      id: 'fe:mobile-confirm',
      physicalCondition: '',
    })

    renderSection({
      summary: {
        visibleChecks: [row],
        completedCount: 0,
        totalCount: 1,
        defectCount: 0,
      },
    })

    fireEvent.click(screen.getByText('ADO-001'))
    fireEvent.click(screen.getAllByText('Good')[0])
    fireEvent.click(screen.getByLabelText('Close ADO-001'))

    expect(screen.getByText('Discard changes?')).toBeTruthy()
    expect(screen.getByText('Your extinguisher changes have not been saved.')).toBeTruthy()
    expect(screen.getByText('FE Physical Condition')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }))
    expect(screen.getByText('FE Physical Condition')).toBeTruthy()

    fireEvent.click(screen.getByLabelText('Close ADO-001'))
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }))
    expect(screen.queryByText('FE Physical Condition')).toBeNull()
  })
})

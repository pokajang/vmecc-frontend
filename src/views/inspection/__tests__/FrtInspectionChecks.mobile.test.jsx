// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { FrtDailyInspectionChecks } from '../form/components/InspectionFormDisplaySections'
import { getFrtCheckSummary, getFrtValidationDetails } from '../types/frt-daily/helpers'

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

describe('FrtDailyInspectionChecks mobile detail drawer', () => {
  const buildSummary = (row) => ({
    visibleDailySections: [
      {
        key: 'locker-a',
        title: 'Locker A',
        checkedCount: row.status || row.readingValue ? 1 : 0,
        issueCount: row.status === 'Issue' ? 1 : 0,
        visibleRows: [row],
      },
    ],
    visibleOneOffSections: [],
    truckReference: {
      plateNo: 'AJG9555',
    },
    dailyCheckedCount: row.status || row.readingValue ? 1 : 0,
    dailyRows: [row],
    dailyIssueCount: row.status === 'Issue' ? 1 : 0,
    dailyIncompleteRemarksCount: 0,
    dailyIncompletePhotoCount: 0,
    oneOffCheckedCount: 0,
    oneOffRows: [],
    oneOffIssueCount: 0,
    oneOffIncompleteRemarksCount: 0,
    oneOffIncompletePhotoCount: 0,
  })

  it('renders optional additional info in read-only report rows', () => {
    const row = {
      id: 'frt:daily:readonly',
      checklistKind: 'daily',
      rowNumber: '91',
      rowKind: 'reading',
      equipment: 'MILEAGE (ODOMETER)',
      readingValue: '123456',
      additionalNotes: 'Reading verified with driver.',
      additionalPhotos: [
        {
          id: 'frt-reading-additional-photo',
          description: 'Reading confirmation photo.',
          url: 'data:image/png;base64,AAA',
        },
      ],
    }

    render(
      <FrtDailyInspectionChecks
        readOnly
        mainLocation="FRT"
        mainLocationLabel="AJG9555"
        summary={buildSummary(row)}
        form={{ frtDailyChecks: [row], frtOneOffChecks: [] }}
      />,
    )

    expect(screen.getByText('Additional Info (optional)')).toBeTruthy()
    expect(screen.getByText('General equipment remarks')).toBeTruthy()
    expect(screen.getByText('Reading verified with driver.')).toBeTruthy()
    expect(screen.getByText('View photos')).toBeTruthy()
  })

  it('keeps row edits local until the mobile drawer is saved', async () => {
    setMobileViewport()
    const onUpdateCheck = vi.fn()
    const onSaveFrtRowDraft = vi.fn(() => new Promise(() => {}))
    const row = {
      id: 'frt:daily:1',
      checklistKind: 'daily',
      rowNumber: '1',
      rowKind: 'status',
      equipment: 'Pump Panel',
      quantity: '1',
    }

    render(
      <FrtDailyInspectionChecks
        mainLocation="FRT"
        mainLocationLabel="AJG9555"
        summary={buildSummary(row)}
        onUpdateCheck={onUpdateCheck}
        onSaveFrtRowDraft={onSaveFrtRowDraft}
      />,
    )

    expect(screen.queryByText('Status')).toBeNull()

    fireEvent.click(screen.getByText('Pump Panel'))

    expect(screen.getByText('Status')).toBeTruthy()

    fireEvent.click(screen.getByText('Checked'))

    expect(onUpdateCheck).not.toHaveBeenCalled()
    expect(screen.getByText('Unsaved changes')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.queryByText('Unsaved changes')).toBeNull()
    await waitFor(() => {
      expect(onSaveFrtRowDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'frt:daily:1',
          status: 'Checked',
        }),
      )
    })
  })

  it('supports optional additional info on a daily status row', () => {
    setMobileViewport()
    const onSaveFrtRowDraft = vi.fn()
    const onRequestIssuePhotoUpload = vi.fn()
    const row = {
      id: 'frt:daily:additional',
      checklistKind: 'daily',
      rowNumber: '1',
      rowKind: 'status',
      equipment: 'Pump Panel',
      quantity: '1',
      status: 'Checked',
    }

    render(
      <FrtDailyInspectionChecks
        mainLocation="FRT"
        mainLocationLabel="AJG9555"
        summary={buildSummary(row)}
        onSaveFrtRowDraft={onSaveFrtRowDraft}
        onRequestIssuePhotoUpload={onRequestIssuePhotoUpload}
      />,
    )

    fireEvent.click(screen.getByText('Pump Panel'))
    fireEvent.click(screen.getByRole('button', { name: 'Remark' }))
    fireEvent.change(screen.getByPlaceholderText('General equipment remarks'), {
      target: { value: 'Checked after washdown.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Photo' }))

    expect(onRequestIssuePhotoUpload).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'frt:daily:additional' }),
      expect.objectContaining({
        photosKey: 'additionalPhotos',
        onAddPhotos: expect.any(Function),
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSaveFrtRowDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'frt:daily:additional',
        status: 'Checked',
        additionalNotes: 'Checked after washdown.',
      }),
    )
  })

  it('supports optional additional info on a daily reading row', () => {
    setMobileViewport()
    const onSaveFrtRowDraft = vi.fn()
    const row = {
      id: 'frt:daily:reading',
      checklistKind: 'daily',
      rowNumber: '91',
      rowKind: 'reading',
      equipment: 'MILEAGE (ODOMETER)',
      readingValue: '123456',
    }

    render(
      <FrtDailyInspectionChecks
        mainLocation="FRT"
        mainLocationLabel="AJG9555"
        summary={buildSummary(row)}
        onSaveFrtRowDraft={onSaveFrtRowDraft}
      />,
    )

    fireEvent.click(screen.getByText('MILEAGE (ODOMETER)'))
    fireEvent.click(screen.getByRole('button', { name: 'Remark' }))
    fireEvent.change(screen.getByPlaceholderText('General equipment remarks'), {
      target: { value: 'Reading verified with driver.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSaveFrtRowDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'frt:daily:reading',
        readingValue: '123456',
        additionalNotes: 'Reading verified with driver.',
      }),
    )
  })

  it('supports optional additional info on a one-off row', () => {
    setMobileViewport()
    const onSaveFrtRowDraft = vi.fn()
    const row = {
      id: 'frt:one-off:additional',
      checklistKind: 'oneOff',
      rowNumber: '16',
      equipment: 'Electronic Siren',
      condition: 'Good',
    }

    render(
      <FrtDailyInspectionChecks
        mainLocation="FRT"
        mainLocationLabel="AJG9555"
        summary={{
          ...buildSummary({ ...row, status: '' }),
          visibleDailySections: [],
          dailyRows: [],
          visibleOneOffSections: [
            {
              key: 'one-off',
              title: 'TRUCK CHECKLIST',
              checkedCount: 1,
              issueCount: 0,
              visibleRows: [row],
            },
          ],
          oneOffCheckedCount: 1,
          oneOffRows: [row],
        }}
        onSaveFrtRowDraft={onSaveFrtRowDraft}
      />,
    )

    fireEvent.click(screen.getByText('Electronic Siren'))
    fireEvent.click(screen.getByRole('button', { name: 'Remark' }))
    fireEvent.change(screen.getByPlaceholderText('General equipment remarks'), {
      target: { value: 'Siren tested quietly.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSaveFrtRowDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'frt:one-off:additional',
        condition: 'Good',
        additionalNotes: 'Siren tested quietly.',
      }),
    )
  })

  it('discards unsaved mobile row edits when cancel is selected', () => {
    setMobileViewport()
    const onSaveFrtRowDraft = vi.fn()
    const row = {
      id: 'frt:daily:cancel',
      checklistKind: 'daily',
      rowNumber: '1',
      rowKind: 'status',
      equipment: 'Pump Panel',
      quantity: '1',
    }

    render(
      <FrtDailyInspectionChecks
        mainLocation="FRT"
        mainLocationLabel="AJG9555"
        summary={buildSummary(row)}
        onSaveFrtRowDraft={onSaveFrtRowDraft}
      />,
    )

    fireEvent.click(screen.getByText('Pump Panel'))
    fireEvent.click(screen.getByText('Checked'))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onSaveFrtRowDraft).not.toHaveBeenCalled()
    expect(screen.queryByText('Status')).toBeNull()
  })

  it('confirms before closing a dirty mobile row drawer', () => {
    setMobileViewport()
    const row = {
      id: 'frt:daily:confirm',
      checklistKind: 'daily',
      rowNumber: '1',
      rowKind: 'status',
      equipment: 'Pump Panel',
      quantity: '1',
    }

    render(
      <FrtDailyInspectionChecks
        mainLocation="FRT"
        mainLocationLabel="AJG9555"
        summary={buildSummary(row)}
      />,
    )

    fireEvent.click(screen.getByText('Pump Panel'))
    fireEvent.click(screen.getByText('Checked'))
    fireEvent.click(screen.getByLabelText('Close Pump Panel'))

    expect(screen.getByText('Discard changes?')).toBeTruthy()
    expect(screen.getByText('Your fire truck row changes have not been saved.')).toBeTruthy()
    expect(screen.getByText('Status')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }))
    expect(screen.getByText('Status')).toBeTruthy()

    fireEvent.click(screen.getByLabelText('Close Pump Panel'))
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }))
    expect(screen.queryByText('Status')).toBeNull()
  })

  it('does not report missing FRT issue photos by row', () => {
    const row = {
      id: 'daily:fire-truck:1',
      checklistKind: 'daily',
      rowNumber: '1',
      rowKind: 'status',
      equipment: 'Pump Panel',
      location: 'LOCKER 01',
      status: 'Issue',
      remarks: 'Pump noisy',
      photos: [],
    }

    const validation = getFrtValidationDetails({
      frtTruckPlateNo: 'AJG9555',
      frtTruckReference: { plateNo: 'AJG9555' },
      frtDailyChecks: [row],
      frtOneOffChecks: [],
    })

    expect(validation.missingPhotosByRow['daily:fire-truck:1']).toBeUndefined()
    expect(validation.firstTarget).not.toEqual(
      expect.objectContaining({
        rowId: 'daily:fire-truck:1',
        detailKey: 'photos',
      }),
    )
  })

  it('surfaces only the selected fire truck compartment item list', () => {
    const form = {
      mainLocation: 'AJG9555',
      selectedLocation: 'AJG9555',
      subLocation: 'LOCKER 01',
      frtTruckPlateNo: 'AJG9555',
      frtTruckReference: { plateNo: 'AJG9555' },
    }

    render(
      <FrtDailyInspectionChecks
        mainLocation="AJG9555"
        mainLocationLabel="AJG9555"
        form={form}
        summary={getFrtCheckSummary(form)}
      />,
    )

    expect(screen.queryByText('LOCKER 01')).toBeNull()
    expect(screen.getByText('FIRE HOSE 2.5"')).toBeTruthy()
    expect(screen.getByText('2.5 INCH FIRE HOSE : 1')).toBeTruthy()
    expect(screen.queryByText('HYDRAULIC MOTOR PUMP')).toBeNull()
    expect(screen.queryByText('OVERALL BODY')).toBeNull()
  })

  it('shows desktop draft status like the fire extinguisher list', () => {
    const row = {
      id: 'frt:daily:draft-status',
      checklistKind: 'daily',
      rowNumber: '1',
      rowKind: 'status',
      equipment: 'Pump Panel',
      quantity: '1',
    }

    render(
      <FrtDailyInspectionChecks
        mainLocation="FRT"
        mainLocationLabel="AJG9555"
        summary={buildSummary(row)}
        draftStatus="Unsaved changes"
      />,
    )

    expect(screen.getByText('Unsaved draft changes')).toBeTruthy()
  })

  it('shows a registered-row empty state when a compartment has no checklist rows', () => {
    render(
      <FrtDailyInspectionChecks
        mainLocation="FRT"
        mainLocationLabel="AJG9555"
        summary={{
          visibleDailySections: [],
          visibleOneOffSections: [],
          truckReference: { plateNo: 'AJG9555' },
          dailyCheckedCount: 0,
          dailyRows: [],
          dailyIssueCount: 0,
          dailyIncompleteRemarksCount: 0,
          dailyIncompletePhotoCount: 0,
          oneOffCheckedCount: 0,
          oneOffRows: [],
          oneOffIssueCount: 0,
          oneOffIncompleteRemarksCount: 0,
          oneOffIncompletePhotoCount: 0,
        }}
      />,
    )

    expect(
      screen.getByText('No truck readiness rows registered for this compartment.'),
    ).toBeTruthy()
  })

  it('opens add item in the mobile drawer', () => {
    setMobileViewport()
    const onAddItem = vi.fn(() => true)
    const row = {
      id: 'frt:daily:add-item',
      checklistKind: 'daily',
      rowNumber: '1',
      rowKind: 'status',
      equipment: 'Pump Panel',
      quantity: '1',
    }

    render(
      <FrtDailyInspectionChecks
        mainLocation="FRT"
        mainLocationLabel="AJG9555"
        form={{ subLocation: 'LOCKER 01' }}
        summary={{
          ...buildSummary(row),
          selectedCompartment: 'LOCKER 01',
        }}
        onAddItem={onAddItem}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add item' }))

    const drawer = document.querySelector('.offcanvas')
    expect(drawer).toBeTruthy()
    expect(document.querySelector('.modal.show')).toBeNull()
    expect(within(drawer).getByText('Add item to LOCKER 01')).toBeTruthy()

    fireEvent.change(within(drawer).getByPlaceholderText('e.g. SPARE NOZZLE'), {
      target: { value: 'SPARE NOZZLE' },
    })
    fireEvent.change(within(drawer).getByPlaceholderText('Optional'), {
      target: { value: '2' },
    })
    fireEvent.click(within(drawer).getByRole('button', { name: 'Add' }))

    expect(onAddItem).toHaveBeenCalledWith({
      checklistKind: 'daily',
      equipment: 'SPARE NOZZLE',
      quantity: '2',
      compartment: 'LOCKER 01',
    })
  })

  it('clears search and surfaces a validation-focused row', async () => {
    const form = {
      mainLocation: 'AJG9555',
      selectedLocation: 'AJG9555',
      subLocation: 'LOCKER 01',
      frtTruckPlateNo: 'AJG9555',
      frtTruckReference: { plateNo: 'AJG9555' },
    }

    render(
      <FrtDailyInspectionChecks
        mainLocation="AJG9555"
        mainLocationLabel="AJG9555"
        form={form}
        summary={getFrtCheckSummary(form)}
      />,
    )

    fireEvent.change(screen.getByLabelText('Search truck readiness rows'), {
      target: { value: 'zzzz' },
    })

    expect(screen.queryByText('FIRE HOSE 2.5"')).toBeNull()

    window.dispatchEvent(
      new CustomEvent('inspection:focus-frt-row', {
        detail: {
          rowId: 'daily:fire-truck:1',
          detailKey: 'status',
          checklistKind: 'daily',
        },
      }),
    )

    await waitFor(() => {
      expect(screen.getByText('FIRE HOSE 2.5"')).toBeTruthy()
    })
  })

  it('filters immediately and restores truck readiness rows from the clear action', () => {
    const row = {
      id: 'frt:daily:search',
      checklistKind: 'daily',
      rowNumber: '1',
      rowKind: 'status',
      equipment: 'Pump Panel',
      quantity: '1',
    }

    render(
      <FrtDailyInspectionChecks
        mainLocation="FRT"
        mainLocationLabel="AJG9555"
        summary={buildSummary(row)}
      />,
    )

    const search = screen.getByLabelText('Search truck readiness rows')
    fireEvent.change(search, { target: { value: 'not-found' } })

    expect(search.value).toBe('not-found')
    expect(screen.queryByText('Pump Panel')).toBeNull()
    expect(screen.getByText('Showing 0 of 1')).toBeTruthy()
    expect(screen.getByText('No truck readiness rows match this search.')).toBeTruthy()

    const clearSearch = screen.getByRole('button', {
      name: 'Clear truck readiness row search',
    })
    expect(clearSearch.getAttribute('type')).toBe('button')
    fireEvent.click(clearSearch)

    expect(search.value).toBe('')
    expect(screen.getByText('Pump Panel')).toBeTruthy()
    expect(screen.queryByText('Showing 0 of 1')).toBeNull()
    expect(screen.queryByText('No truck readiness rows match this search.')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Clear truck readiness row search' })).toBeNull()
  })
})

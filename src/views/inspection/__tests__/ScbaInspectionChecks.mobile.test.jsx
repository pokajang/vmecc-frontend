// @vitest-environment jsdom
import React, { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ScbaInspectionChecks } from '../form/components/InspectionFormDisplaySections'
import { SCBA_SECTION_DEFINITIONS } from '../types/scba/helpers'

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

const selectBackPlateGroup = () => {
  fireEvent.click(screen.getByRole('button', { name: /Back Plate\s+1 item/i }))
}

describe('ScbaInspectionChecks mobile detail drawer', () => {
  it('announces a refresh before a section is selected', () => {
    const section = SCBA_SECTION_DEFINITIONS.find((entry) => entry.key === 'backPlate')

    render(
      <ScbaInspectionChecks
        mainLocation="FRT"
        form={{ scbaCustomSections: [] }}
        isLoadingRows
        summary={{
          visibleSections: [
            {
              ...section,
              visibleRows: [],
              checkedCount: 0,
              issueCount: 0,
              incompleteRemarksCount: 0,
              incompletePhotoCount: 0,
              retainedEvidenceCount: 0,
            },
          ],
          totalCount: 0,
          checkedCount: 0,
          issueCount: 0,
          incompleteRemarksCount: 0,
          incompletePhotoCount: 0,
          retainedEvidenceCount: 0,
        }}
      />,
    )

    expect(screen.getByText('Refreshing SCBA equipment...')).toBeTruthy()
  })

  it('marks all desktop row status fields Good and deactivates All Good when one is Not Good', () => {
    const onUpdateGroupedCheck = vi.fn()
    const section = SCBA_SECTION_DEFINITIONS.find((entry) => entry.key === 'backPlate')
    const row = {
      id: 'backPlate:frt:msa:06',
      sectionKey: 'backPlate',
      mainLocation: 'FRT',
      brand: 'MSA',
      serialNo: '06',
      backPlateHarnessCondition: 'Good',
      highPressureHose: 'Good',
      pressureGauge: 'Good',
      alarmDevice: 'Good',
      demandValve: 'Good',
      sealing: 'Good',
      cleanliness: 'Good',
    }

    const { rerender } = render(
      <ScbaInspectionChecks
        mainLocation="FRT"
        form={{ scbaCustomSections: [] }}
        summary={{
          visibleSections: [
            {
              ...section,
              visibleRows: [row],
              checkedCount: 1,
              issueCount: 0,
              incompleteRemarksCount: 0,
            },
          ],
          totalCount: 1,
          checkedCount: 1,
          issueCount: 0,
          incompleteRemarksCount: 0,
          incompletePhotoCount: 0,
          retainedEvidenceCount: 0,
        }}
        onUpdateGroupedCheck={onUpdateGroupedCheck}
        onMarkRowOk={(_sectionKey, targetRow) =>
          onUpdateGroupedCheck(_sectionKey, targetRow, {
            backPlateHarnessCondition: 'Good',
            highPressureHose: 'Good',
            pressureGauge: 'Good',
            alarmDevice: 'Good',
            demandValve: 'Good',
            sealing: 'Good',
            cleanliness: 'Good',
          })
        }
      />,
    )

    selectBackPlateGroup()

    expect(screen.getByRole('button', { name: 'All Good' }).getAttribute('aria-pressed')).toBe(
      'true',
    )

    const notGoodButtons = screen.getAllByRole('button', { name: 'Not Good' })
    fireEvent.click(notGoodButtons[0])

    expect(onUpdateGroupedCheck).toHaveBeenCalledWith(
      'backPlate',
      row,
      expect.objectContaining({
        backPlateHarnessCondition: 'Not Good',
      }),
    )

    const rowWithIssue = { ...row, backPlateHarnessCondition: 'Not Good' }
    rerender(
      <ScbaInspectionChecks
        mainLocation="FRT"
        form={{ scbaCustomSections: [] }}
        summary={{
          visibleSections: [
            {
              ...section,
              visibleRows: [rowWithIssue],
              checkedCount: 1,
              issueCount: 1,
              incompleteRemarksCount: 1,
            },
          ],
          totalCount: 1,
          checkedCount: 1,
          issueCount: 1,
          incompleteRemarksCount: 1,
          incompletePhotoCount: 1,
          retainedEvidenceCount: 0,
        }}
        onUpdateGroupedCheck={onUpdateGroupedCheck}
        onMarkRowOk={(_sectionKey, targetRow) =>
          onUpdateGroupedCheck(_sectionKey, targetRow, {
            backPlateHarnessCondition: 'Good',
            highPressureHose: 'Good',
            pressureGauge: 'Good',
            alarmDevice: 'Good',
            demandValve: 'Good',
            sealing: 'Good',
            cleanliness: 'Good',
          })
        }
      />,
    )

    expect(screen.getByRole('button', { name: 'All Good' }).getAttribute('aria-pressed')).toBe(
      'false',
    )

    fireEvent.click(screen.getByRole('button', { name: 'All Good' }))

    expect(onUpdateGroupedCheck).toHaveBeenLastCalledWith(
      'backPlate',
      rowWithIssue,
      expect.objectContaining({
        backPlateHarnessCondition: 'Good',
        highPressureHose: 'Good',
        cleanliness: 'Good',
      }),
    )
  })

  it('opens SCBA item checks in a mobile drawer', () => {
    setMobileViewport()
    const onUpdateGroupedCheck = vi.fn()
    const section = SCBA_SECTION_DEFINITIONS.find((entry) => entry.key === 'backPlate')
    const row = {
      id: 'backPlate:frt:msa:06',
      sectionKey: 'backPlate',
      mainLocation: 'FRT',
      brand: 'MSA',
      serialNo: '06',
    }

    render(
      <ScbaInspectionChecks
        mainLocation="FRT"
        form={{ scbaCustomSections: [] }}
        summary={{
          visibleSections: [
            {
              ...section,
              visibleRows: [row],
              checkedCount: 0,
              issueCount: 0,
              incompleteRemarksCount: 0,
            },
          ],
          totalCount: 1,
          checkedCount: 0,
          issueCount: 0,
          incompleteRemarksCount: 0,
          incompletePhotoCount: 0,
          retainedEvidenceCount: 0,
        }}
        onUpdateGroupedCheck={onUpdateGroupedCheck}
      />,
    )

    expect(screen.queryByText('Back Plate & Harness')).toBeNull()

    selectBackPlateGroup()
    fireEvent.click(screen.getByText('MSA 06'))

    expect(screen.getAllByText('Back Plate').length).toBeGreaterThan(1)
    expect(screen.getByText('Back Plate & Harness')).toBeTruthy()

    fireEvent.click(screen.getAllByText('Good')[0])

    expect(onUpdateGroupedCheck).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText('Save'))

    expect(onUpdateGroupedCheck).toHaveBeenCalledWith(
      'backPlate',
      row,
      expect.objectContaining({
        backPlateHarnessCondition: 'Good',
      }),
    )
  })

  it('navigates to the next incomplete group from the active group', () => {
    const backPlateSection = SCBA_SECTION_DEFINITIONS.find((entry) => entry.key === 'backPlate')
    const cylinderSection = SCBA_SECTION_DEFINITIONS.find((entry) => entry.key === 'cylinder')
    const completeBackPlateRow = {
      id: 'backPlate:frt:msa:06',
      sectionKey: 'backPlate',
      mainLocation: 'FRT',
      brand: 'MSA',
      serialNo: '06',
      backPlateHarnessCondition: 'Good',
      highPressureHose: 'Good',
      pressureGauge: 'Good',
      alarmDevice: 'Good',
      demandValve: 'Good',
      sealing: 'Good',
      cleanliness: 'Good',
    }
    const incompleteCylinderRow = {
      id: 'cylinder:frt:msa:6.8l',
      sectionKey: 'cylinder',
      mainLocation: 'FRT',
      brand: 'MSA',
      serialNo: '6.8L',
      servicePressure: '',
      containedPressure: '190',
      physicalCondition: 'Good',
      handwheelCondition: 'Good',
      valveBodyCondition: 'Good',
      screwPlugCondition: 'Good',
      cleanliness: 'Good',
    }

    render(
      <ScbaInspectionChecks
        mainLocation="FRT"
        form={{ scbaCustomSections: [] }}
        summary={{
          visibleSections: [
            {
              ...backPlateSection,
              visibleRows: [completeBackPlateRow],
              checkedCount: 1,
              issueCount: 0,
              incompleteRemarksCount: 0,
            },
            {
              ...cylinderSection,
              visibleRows: [incompleteCylinderRow],
              checkedCount: 0,
              issueCount: 0,
              incompleteRemarksCount: 0,
            },
          ],
          totalCount: 2,
          checkedCount: 1,
          issueCount: 0,
          incompleteRemarksCount: 0,
          incompletePhotoCount: 0,
          retainedEvidenceCount: 0,
        }}
      />,
    )

    selectBackPlateGroup()
    expect(
      screen.getByRole('button', { name: /Back Plate\s+1 item/i }).getAttribute('aria-pressed'),
    ).toBe('true')

    fireEvent.click(screen.getByRole('button', { name: 'Next incomplete' }))

    expect(
      screen.getByRole('button', { name: /Cylinder\s+1 item/i }).getAttribute('aria-pressed'),
    ).toBe('true')
  })

  it('auto-expands a selected compact group so items are loaded', () => {
    setMobileViewport()
    const section = SCBA_SECTION_DEFINITIONS.find((entry) => entry.key === 'backPlate')
    const cylinderSection = SCBA_SECTION_DEFINITIONS.find((entry) => entry.key === 'cylinder')
    const row1 = {
      id: 'cylinder:frt:msa:6.8l-08',
      sectionKey: 'cylinder',
      mainLocation: 'FRT',
      brand: 'MSA',
      serialNo: '6.8L/08',
      servicePressure: '',
      containedPressure: '',
      physicalCondition: '',
      handwheelCondition: '',
      valveBodyCondition: '',
      screwPlugCondition: '',
      cleanliness: '',
    }
    const row2 = {
      id: 'cylinder:frt:drager:9l-03',
      sectionKey: 'cylinder',
      mainLocation: 'FRT',
      brand: 'Drager',
      serialNo: '9L/03',
      servicePressure: '',
      containedPressure: '',
      physicalCondition: '',
      handwheelCondition: '',
      valveBodyCondition: '',
      screwPlugCondition: '',
      cleanliness: '',
    }
    const row3 = {
      id: 'cylinder:frt:drager:9l-05',
      sectionKey: 'cylinder',
      mainLocation: 'FRT',
      brand: 'Drager',
      serialNo: '9L/05',
      servicePressure: '',
      containedPressure: '',
      physicalCondition: '',
      handwheelCondition: '',
      valveBodyCondition: '',
      screwPlugCondition: '',
      cleanliness: '',
    }
    const row4 = {
      id: 'cylinder:frt:drager:9l-08',
      sectionKey: 'cylinder',
      mainLocation: 'FRT',
      brand: 'Drager',
      serialNo: '9L/08',
      servicePressure: '',
      containedPressure: '',
      physicalCondition: '',
      handwheelCondition: '',
      valveBodyCondition: '',
      screwPlugCondition: '',
      cleanliness: '',
    }

    render(
      <ScbaInspectionChecks
        mainLocation="FRT"
        form={{ scbaCustomSections: [] }}
        summary={{
          visibleSections: [
            {
              ...section,
              visibleRows: [
                {
                  id: 'backPlate:frt:msa:06',
                  sectionKey: 'backPlate',
                  mainLocation: 'FRT',
                  brand: 'MSA',
                  serialNo: '06',
                  backPlateHarnessCondition: 'Good',
                  highPressureHose: 'Good',
                  pressureGauge: 'Good',
                  alarmDevice: 'Good',
                  demandValve: 'Good',
                  sealing: 'Good',
                  cleanliness: 'Good',
                },
              ],
              checkedCount: 1,
              issueCount: 0,
              incompleteRemarksCount: 0,
            },
            {
              ...cylinderSection,
              visibleRows: [row1, row2, row3, row4],
              checkedCount: 0,
              issueCount: 0,
              incompleteRemarksCount: 0,
            },
          ],
          totalCount: 5,
          checkedCount: 1,
          issueCount: 0,
          incompleteRemarksCount: 0,
          incompletePhotoCount: 0,
          retainedEvidenceCount: 0,
        }}
      />,
    )

    selectBackPlateGroup()
    fireEvent.click(screen.getByRole('button', { name: 'Change group' }))
    fireEvent.click(screen.getByRole('button', { name: /Cylinder\s+4 items/i }))
    expect(document.querySelectorAll('[data-inspection-scba-section-id="cylinder"]').length).toBe(1)
    expect(document.querySelectorAll('[data-inspection-scba-section-id]').length).toBe(1)

    expect(screen.getByText('MSA 6.8L/08')).toBeTruthy()
    expect(screen.getByText('Drager 9L/03')).toBeTruthy()
    expect(screen.getByText('Drager 9L/05')).toBeTruthy()
    expect(screen.getByText('Drager 9L/08')).toBeTruthy()
  })

  it('preserves trailing spaces in issue remarks while typing', () => {
    setMobileViewport()
    const section = SCBA_SECTION_DEFINITIONS.find((entry) => entry.key === 'backPlate')

    const ScbaHarness = () => {
      const [row, setRow] = useState({
        id: 'backPlate:frt:msa:06',
        sectionKey: 'backPlate',
        mainLocation: 'FRT',
        brand: 'MSA',
        serialNo: '06',
        backPlateHarnessCondition: 'Not Good',
        backPlateHarnessConditionRemarks: '',
      })

      return (
        <ScbaInspectionChecks
          mainLocation="FRT"
          form={{ scbaCustomSections: [] }}
          summary={{
            visibleSections: [
              {
                ...section,
                visibleRows: [row],
                checkedCount: 0,
                issueCount: 1,
                incompleteRemarksCount: 1,
              },
            ],
            totalCount: 1,
            checkedCount: 0,
            issueCount: 1,
            incompleteRemarksCount: 1,
            incompletePhotoCount: 0,
            retainedEvidenceCount: 0,
          }}
          onUpdateGroupedCheck={(_sectionKey, _row, patch) =>
            setRow((current) => ({ ...current, ...patch }))
          }
        />
      )
    }

    render(<ScbaHarness />)

    selectBackPlateGroup()
    fireEvent.click(screen.getByText('MSA 06'))
    const remarks = screen.getByPlaceholderText('Back Plate & Harness issue remarks')
    fireEvent.change(remarks, { target: { value: 'strap worn ' } })

    expect(screen.getByPlaceholderText('Back Plate & Harness issue remarks').value).toBe(
      'strap worn ',
    )
  })

  it('marks all drawer status fields Good and deactivates All Good when one is Not Good', () => {
    setMobileViewport()
    const onUpdateGroupedCheck = vi.fn()
    const section = SCBA_SECTION_DEFINITIONS.find((entry) => entry.key === 'backPlate')
    const row = {
      id: 'backPlate:frt:msa:06',
      sectionKey: 'backPlate',
      mainLocation: 'FRT',
      brand: 'MSA',
      serialNo: '06',
    }

    render(
      <ScbaInspectionChecks
        mainLocation="FRT"
        form={{ scbaCustomSections: [] }}
        summary={{
          visibleSections: [
            {
              ...section,
              visibleRows: [row],
              checkedCount: 0,
              issueCount: 0,
              incompleteRemarksCount: 0,
            },
          ],
          totalCount: 1,
          checkedCount: 0,
          issueCount: 0,
          incompleteRemarksCount: 0,
          incompletePhotoCount: 0,
          retainedEvidenceCount: 0,
        }}
        onUpdateGroupedCheck={onUpdateGroupedCheck}
      />,
    )

    selectBackPlateGroup()
    fireEvent.click(screen.getByText('MSA 06'))
    fireEvent.click(screen.getByRole('button', { name: 'All Good' }))

    expect(screen.getByRole('button', { name: 'All Good' }).getAttribute('aria-pressed')).toBe(
      'true',
    )
    expect(
      screen
        .getAllByRole('button', { name: 'Good' })
        .every((button) => button.className.includes('btn-primary')),
    ).toBe(true)
    expect(onUpdateGroupedCheck).not.toHaveBeenCalled()

    fireEvent.click(screen.getAllByRole('button', { name: 'Not Good' })[0])

    expect(screen.getByRole('button', { name: 'All Good' }).getAttribute('aria-pressed')).toBe(
      'false',
    )
    expect(
      screen.getAllByRole('button', { name: 'Not Good' })[0].className.includes('btn-primary'),
    ).toBe(true)

    fireEvent.click(screen.getByText('Save'))

    expect(onUpdateGroupedCheck).toHaveBeenCalledWith(
      'backPlate',
      row,
      expect.objectContaining({
        backPlateHarnessCondition: 'Not Good',
        highPressureHose: 'Good',
        cleanliness: 'Good',
      }),
    )
  })
})

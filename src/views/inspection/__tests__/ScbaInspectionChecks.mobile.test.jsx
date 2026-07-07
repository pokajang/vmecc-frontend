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

describe('ScbaInspectionChecks mobile detail drawer', () => {
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

    fireEvent.click(screen.getByText('MSA 06'))
    const remarks = screen.getByPlaceholderText('Back Plate & Harness issue remarks')
    fireEvent.change(remarks, { target: { value: 'strap worn ' } })

    expect(screen.getByPlaceholderText('Back Plate & Harness issue remarks').value).toBe(
      'strap worn ',
    )
  })
})

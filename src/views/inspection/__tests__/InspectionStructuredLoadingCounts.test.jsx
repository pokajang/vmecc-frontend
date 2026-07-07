// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import {
  ErAuxEquipmentChecks,
  HighAngleInspectionChecks,
  HydraulicEquipmentChecks,
  ScbaInspectionChecks,
} from '../form/components/InspectionFormDisplaySections'
import { getContextCountLabel, getScopedProgressLabel } from '../form/inspectionCountLabels'
import { getFrtCompartmentOptions } from '../types/frt-daily/helpers'

afterEach(() => {
  cleanup()
})

describe('structured inspection loading counts', () => {
  it('formats contextual progress and count labels with real nouns', () => {
    expect(
      getScopedProgressLabel({
        completedCount: 2,
        totalCount: 5,
        singular: 'check',
        plural: 'checks',
      }),
    ).toBe('2/5 checks')
    expect(getContextCountLabel({ count: 1, singular: 'finding', plural: 'findings' })).toBe(
      '1 finding',
    )
    expect(getContextCountLabel({ count: 2, singular: 'finding', plural: 'findings' })).toBe(
      '2 findings',
    )
  })

  it('shows FRT compartment progress as checks instead of generic done', () => {
    const options = getFrtCompartmentOptions({
      frtTruckPlateNo: 'AJG9555',
      frtDailyChecks: [
        {
          id: 'daily-1',
          location: 'CUSTOM BAY',
          equipment: 'FIRE HOSE',
          status: 'Checked',
        },
      ],
      frtOneOffChecks: [
        {
          id: 'one-off-1',
          location: 'CUSTOM BAY',
          equipment: 'BEACON LIGHT',
          condition: 'Good',
        },
      ],
    })

    expect(options.find((option) => option.value === 'CUSTOM BAY')?.metaLabel).toBe('2/2 checks')
  })

  it('renders hydraulic equipment rows without header progress chips', () => {
    render(
      <HydraulicEquipmentChecks
        mainLocation="Store"
        checks={[]}
        summary={{
          visibleChecks: [{ id: 'hydraulic-1', equipment: 'Hydraulic Pump' }],
          checkedCount: 1,
          totalCount: 1,
          defectCount: 0,
        }}
      />,
    )

    expect(screen.getByText('Hydraulic Pump')).toBeTruthy()
    expect(screen.queryByText('1/1 tool')).toBeNull()
  })

  it('renders ER Aux equipment rows without header progress chips', () => {
    render(
      <ErAuxEquipmentChecks
        mainLocation="Office"
        checks={[]}
        summary={{
          visibleChecks: [{ id: 'er-aux-1', equipment: 'Radio Tetra' }],
          checkedCount: 0,
          totalCount: 1,
          issueCount: 0,
        }}
      />,
    )

    expect(screen.getByText('Radio Tetra')).toBeTruthy()
    expect(screen.queryByText('0/1 item')).toBeNull()
  })

  it('renders High Angle active compartment rows without header progress chips', () => {
    render(
      <HighAngleInspectionChecks
        mainLocation="Response Kit #1"
        summary={{
          visibleGroups: [
            {
              key: 'general-kit',
              title: 'General Kit Items',
              checkedCount: 0,
              issueCount: 0,
              rows: [
                { id: 'bag-1', equipment: 'Heavy Duty Organizer Bag' },
                { id: 'pack-1', equipment: 'Pallisade Pack' },
              ],
            },
          ],
        }}
      />,
    )

    fireEvent.click(screen.getByText('General Kit Items'))

    expect(screen.getByText('Heavy Duty Organizer Bag')).toBeTruthy()
    expect(screen.queryByText('0/2 items')).toBeNull()
  })

  it('shows loading instead of a false zero add-equipment count for ER Aux', () => {
    render(
      <ErAuxEquipmentChecks
        mainLocation="Office"
        checks={[]}
        summary={{ visibleChecks: [], totalCount: 0 }}
        isLoadingRows
      />,
    )

    expect(screen.getByText('Add equipment (Loading...)')).toBeTruthy()
    expect(screen.getByText('Loading equipment...')).toBeTruthy()
    expect(screen.queryByText('Add equipment (0)')).toBeNull()
  })

  it('shows loading instead of a false zero add-equipment count for hydraulic equipment', () => {
    render(
      <HydraulicEquipmentChecks
        mainLocation="Store"
        checks={[]}
        summary={{ visibleChecks: [], totalCount: 0 }}
        isLoadingRows
      />,
    )

    expect(screen.getByText('Add equipment (Loading...)')).toBeTruthy()
    expect(screen.getByText('Loading equipment...')).toBeTruthy()
    expect(screen.queryByText('Add equipment (0)')).toBeNull()
  })

  it('omits SCBA header stats while rows load', () => {
    render(
      <ScbaInspectionChecks
        mainLocation="Office"
        form={{ scbaCustomSections: [] }}
        summary={{
          visibleSections: [],
          checkedCount: 0,
          totalCount: 0,
          issueCount: 0,
          incompleteRemarksCount: 0,
          incompletePhotoCount: 0,
          retainedEvidenceCount: 0,
        }}
        isLoadingRows
      />,
    )

    expect(screen.getByText('SCBA Items')).toBeTruthy()
    expect(screen.queryByText('Loading items...')).toBeNull()
    expect(screen.queryByText('0 of 0 checked')).toBeNull()
    expect(screen.queryByText('0/0 SCBA items')).toBeNull()
  })
})

// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { HydraulicEquipmentChecks } from '../form/components/InspectionFormDisplaySections'

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

describe('HydraulicEquipmentChecks mobile detail drawer', () => {
  it('preserves hydraulic search, count, empty and clear behavior', () => {
    render(
      <HydraulicEquipmentChecks
        mainLocation="FRT"
        checks={[]}
        summary={{
          visibleChecks: [
            {
              id: 'hydraulic:pump',
              equipment: 'Hydraulic Pump Motor 1',
              equipmentDescription: 'FRT bay',
            },
            {
              id: 'hydraulic:ram',
              equipment: 'Telescopic Ram',
              equipmentDescription: 'Rear compartment',
            },
          ],
          totalCount: 2,
        }}
      />,
    )

    const search = screen.getByRole('textbox', { name: 'Search hydraulic equipment rows' })
    expect(search.getAttribute('placeholder')).toBe('Search hydraulic equipment...')

    fireEvent.change(search, { target: { value: 'Rear compartment' } })
    expect(screen.getByText('Telescopic Ram')).toBeTruthy()
    expect(screen.queryByText('Hydraulic Pump Motor 1')).toBeNull()
    expect(screen.getByText('Showing 1 of 2')).toBeTruthy()

    fireEvent.change(search, { target: { value: 'missing equipment' } })
    expect(screen.getByText('Showing 0 of 2')).toBeTruthy()
    expect(screen.getByText('No hydraulic equipment rows match this search.')).toBeTruthy()

    const clear = screen.getByRole('button', { name: 'Clear hydraulic equipment row search' })
    expect(clear.getAttribute('type')).toBe('button')
    fireEvent.click(clear)

    expect(search.value).toBe('')
    expect(screen.queryByText(/^Showing /)).toBeNull()
    expect(
      screen.queryByRole('button', { name: 'Clear hydraulic equipment row search' }),
    ).toBeNull()
    expect(screen.getByText('Hydraulic Pump Motor 1')).toBeTruthy()
    expect(screen.getByText('Telescopic Ram')).toBeTruthy()
  })

  it('keeps zero-row, loading and read-only toolbar visibility unchanged', () => {
    const { rerender } = render(
      <HydraulicEquipmentChecks
        mainLocation="FRT"
        checks={[]}
        summary={{ visibleChecks: [], totalCount: 0 }}
        isLoadingRows
      />,
    )

    expect(screen.getByText('Loading equipment...')).toBeTruthy()
    expect(screen.queryByRole('textbox', { name: 'Search hydraulic equipment rows' })).toBeNull()

    rerender(
      <HydraulicEquipmentChecks
        mainLocation="FRT"
        checks={[]}
        summary={{ visibleChecks: [], totalCount: 0 }}
      />,
    )
    expect(
      screen.getByText('No hydraulic equipment has been added for this location.'),
    ).toBeTruthy()
    expect(screen.queryByRole('textbox', { name: 'Search hydraulic equipment rows' })).toBeNull()

    rerender(
      <HydraulicEquipmentChecks
        readOnly
        mainLocation="FRT"
        checks={[]}
        summary={{
          visibleChecks: [{ id: 'hydraulic:readonly', equipment: 'Read-only Pump' }],
          totalCount: 1,
        }}
      />,
    )
    expect(screen.getByText('Read-only Pump')).toBeTruthy()
    expect(screen.queryByRole('textbox', { name: 'Search hydraulic equipment rows' })).toBeNull()
  })

  it('announces a refresh without hiding visible equipment rows', () => {
    render(
      <HydraulicEquipmentChecks
        mainLocation="FRT"
        checks={[]}
        isLoadingRows
        summary={{
          visibleChecks: [
            {
              id: 'hydraulic:refresh',
              equipment: 'Hydraulic Pump Motor 1',
            },
          ],
          totalCount: 1,
        }}
      />,
    )

    expect(screen.getByText('Refreshing equipment...')).toBeTruthy()
    expect(screen.getByText('Hydraulic Pump Motor 1')).toBeTruthy()
  })

  it('opens hydraulic equipment checks in a mobile drawer', () => {
    setMobileViewport()
    const onUpdateCheck = vi.fn()
    const row = {
      id: 'hydraulic:1',
      equipment: 'Hydraulic Pump Motor 1',
      equipmentDescription: 'FRT bay',
    }

    render(
      <HydraulicEquipmentChecks
        mainLocation="FRT"
        checks={[]}
        summary={{
          visibleChecks: [row],
          totalCount: 1,
        }}
        onUpdateCheck={onUpdateCheck}
      />,
    )

    expect(screen.queryByText('Physical Condition')).toBeNull()

    fireEvent.click(screen.getByText('Hydraulic Pump Motor 1'))

    expect(screen.getAllByText('FRT bay').length).toBeGreaterThan(1)
    expect(screen.getByText('Physical Condition')).toBeTruthy()

    fireEvent.click(screen.getAllByText('OK')[0])

    expect(onUpdateCheck).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText('Save'))

    expect(onUpdateCheck).toHaveBeenCalledWith(
      row,
      expect.objectContaining({ physicalCondition: 'OK' }),
    )
  })

  it('closes the drawer immediately when the durable row save starts in the background', () => {
    setMobileViewport()
    const onUpdateCheck = vi.fn()
    const onSaveRowDraft = vi.fn(() => new Promise(() => {}))
    const row = {
      id: 'hydraulic:1',
      equipment: 'Hydraulic Pump Motor 1',
      equipmentDescription: 'FRT bay',
    }

    render(
      <HydraulicEquipmentChecks
        mainLocation="FRT"
        checks={[]}
        summary={{
          visibleChecks: [row],
          totalCount: 1,
        }}
        onUpdateCheck={onUpdateCheck}
        onSaveRowDraft={onSaveRowDraft}
      />,
    )

    fireEvent.click(screen.getByText('Hydraulic Pump Motor 1'))
    fireEvent.click(screen.getAllByText('OK')[0])
    fireEvent.click(screen.getByText('Save'))

    expect(onSaveRowDraft).toHaveBeenCalledWith(
      row,
      expect.objectContaining({ physicalCondition: 'OK' }),
    )
    expect(onUpdateCheck).not.toHaveBeenCalled()
    expect(screen.queryByText('Physical Condition')).toBeNull()
  })
})

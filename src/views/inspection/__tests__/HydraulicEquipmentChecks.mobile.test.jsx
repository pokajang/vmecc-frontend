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

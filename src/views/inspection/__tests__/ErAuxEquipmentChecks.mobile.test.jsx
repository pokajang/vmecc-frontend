// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { ErAuxEquipmentChecks } from '../form/components/InspectionFormDisplaySections'

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

describe('ErAuxEquipmentChecks mobile detail drawer', () => {
  it('opens ER Aux equipment checks in a mobile drawer', () => {
    setMobileViewport()
    const onUpdateCheck = vi.fn()
    const row = {
      id: 'er-aux:1',
      equipment: 'Radio Tetra',
      equipmentDescription: 'Office set',
      defaultQuantity: '7',
    }

    render(
      <ErAuxEquipmentChecks
        mainLocation="Office"
        checks={[]}
        summary={{
          visibleChecks: [row],
          totalCount: 1,
        }}
        onUpdateCheck={onUpdateCheck}
      />,
    )

    expect(screen.queryByText('Quantity')).toBeNull()

    fireEvent.click(screen.getByText('Radio Tetra'))

    expect(screen.getAllByText('Office set').length).toBeGreaterThan(1)
    expect(screen.getByText('Quantity')).toBeTruthy()
    expect(screen.getByText('Condition')).toBeTruthy()
    expect(screen.getByText('Additional Info (optional)')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Remark' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Photo' })).toBeTruthy()

    fireEvent.click(screen.getByText('OK'))

    expect(onUpdateCheck).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText('Save'))

    expect(onUpdateCheck).toHaveBeenCalledWith(row, expect.objectContaining({ condition: 'OK' }))
  })

  it('opens header row actions from the mobile drawer', () => {
    setMobileViewport()
    const onEditEquipment = vi.fn()
    const row = {
      id: 'office:radio-tetra',
      equipment: 'Radio Tetra',
      equipmentDescription: 'Office set',
      defaultQuantity: '7',
      canEdit: true,
      canDelete: true,
      isLocalSeedEquipment: true,
    }

    render(
      <ErAuxEquipmentChecks
        mainLocation="Office"
        checks={[]}
        summary={{
          visibleChecks: [row],
          totalCount: 1,
        }}
        onEditEquipment={onEditEquipment}
      />,
    )

    fireEvent.click(screen.getByText('Radio Tetra'))
    const drawer = document.querySelector('.offcanvas')
    expect(drawer).toBeTruthy()
    fireEvent.click(
      within(drawer).getByRole('button', { name: 'Equipment actions for Radio Tetra' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))

    expect(onEditEquipment).toHaveBeenCalledWith(row)
  })
})

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
  it('preserves ER Aux search, count, empty and clear behavior', () => {
    render(
      <ErAuxEquipmentChecks
        mainLocation="Office"
        checks={[]}
        summary={{
          visibleChecks: [
            {
              id: 'er-aux:radio',
              equipment: 'Radio Tetra',
              equipmentDescription: 'Office set',
              defaultQuantity: '7',
            },
            {
              id: 'er-aux:torch',
              equipment: 'Emergency Torch',
              equipmentDescription: 'Control room cabinet',
              defaultQuantity: '2',
            },
          ],
          totalCount: 2,
        }}
      />,
    )

    const search = screen.getByRole('textbox', { name: 'Search ER Aux equipment rows' })
    expect(search.getAttribute('placeholder')).toBe('Search ER Aux equipment...')

    fireEvent.change(search, { target: { value: 'Control room' } })
    expect(screen.getByText('Emergency Torch')).toBeTruthy()
    expect(screen.queryByText('Radio Tetra')).toBeNull()
    expect(screen.getByText('Showing 1 of 2')).toBeTruthy()

    fireEvent.change(search, { target: { value: 'missing equipment' } })
    expect(screen.getByText('Showing 0 of 2')).toBeTruthy()
    expect(
      screen.getByText('No Emergency Response Auxiliary Equipment rows match this search.'),
    ).toBeTruthy()

    const clear = screen.getByRole('button', { name: 'Clear ER Aux equipment row search' })
    expect(clear.getAttribute('type')).toBe('button')
    fireEvent.click(clear)

    expect(search.value).toBe('')
    expect(screen.queryByText(/^Showing /)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Clear ER Aux equipment row search' })).toBeNull()
    expect(screen.getByText('Radio Tetra')).toBeTruthy()
    expect(screen.getByText('Emergency Torch')).toBeTruthy()
  })

  it('keeps loading, registered-empty and read-only toolbar visibility unchanged', () => {
    const { rerender } = render(
      <ErAuxEquipmentChecks
        mainLocation="Office"
        checks={[]}
        summary={{ visibleChecks: [], totalCount: 0 }}
        isLoadingRows
      />,
    )

    expect(screen.getByText('Loading equipment...')).toBeTruthy()
    expect(screen.queryByRole('textbox', { name: 'Search ER Aux equipment rows' })).toBeNull()

    rerender(
      <ErAuxEquipmentChecks
        mainLocation="Office"
        checks={[]}
        summary={{ visibleChecks: [], totalCount: 0 }}
      />,
    )
    expect(
      screen.getByText(
        'No Emergency Response Auxiliary Equipment has been added for this location.',
      ),
    ).toBeTruthy()
    expect(screen.queryByRole('textbox', { name: 'Search ER Aux equipment rows' })).toBeNull()

    rerender(
      <ErAuxEquipmentChecks
        readOnly
        mainLocation="Office"
        checks={[]}
        summary={{
          visibleChecks: [
            {
              id: 'er-aux:readonly',
              equipment: 'Read-only Radio',
              defaultQuantity: '1',
            },
          ],
          totalCount: 1,
        }}
      />,
    )
    expect(screen.getByText('Read-only Radio')).toBeTruthy()
    expect(screen.queryByRole('textbox', { name: 'Search ER Aux equipment rows' })).toBeNull()
  })

  it('announces a refresh without hiding visible equipment rows', () => {
    render(
      <ErAuxEquipmentChecks
        mainLocation="Office"
        checks={[]}
        isLoadingRows
        summary={{
          visibleChecks: [
            {
              id: 'er-aux:refresh',
              equipment: 'Radio Tetra',
              defaultQuantity: '7',
            },
          ],
          totalCount: 1,
        }}
      />,
    )

    expect(screen.getByText('Refreshing equipment...')).toBeTruthy()
    expect(screen.getByText('Radio Tetra')).toBeTruthy()
  })

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

    const cardTrigger = screen.getByRole('button', {
      name: 'Open Radio Tetra inspection details',
    })
    expect(cardTrigger.getAttribute('aria-haspopup')).toBe('dialog')
    expect(cardTrigger.hasAttribute('aria-expanded')).toBe(false)
    expect(document.querySelector('.inspection-entity-card__chevron')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Equipment actions for Radio Tetra' })).toBeNull()
    expect(screen.queryByText(/^\d+ missing$/)).toBeNull()
    expect(screen.queryByText('Quantity')).toBeNull()

    fireEvent.click(cardTrigger)

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

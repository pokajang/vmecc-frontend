// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import AllExtinguishersSection, {
  ALL_EXTINGUISHERS_DEMO_ROWS,
} from '../records/AllExtinguishersSection'
import { createFireExtinguisherBatch } from '../inspectionFireExtinguisherApi'
import {
  createSiteLocationNode,
  fetchSiteLocationHierarchy,
} from '../domain/api/inspectionSiteLocationApi'
import { resetSiteLocationCatalogStoreForTests } from '../state/siteLocationCatalogStore'

vi.mock('../inspectionFireExtinguisherApi', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    createFireExtinguisherBatch: vi.fn(),
  }
})

vi.mock('../domain/api/inspectionSiteLocationApi', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    fetchSiteLocationHierarchy: vi.fn(),
    createSiteLocationNode: vi.fn(),
  }
})

vi.mock('src/components/RowActions', () => ({
  default: ({ items = [], toggleAriaLabel = 'Row actions' }) => (
    <div>
      <button type="button" aria-label={toggleAriaLabel}>
        Actions
      </button>
      {items.map((item) => (
        <button
          key={item.key || item.label}
          type="button"
          aria-label={`${item.label} ${toggleAriaLabel}`}
          onClick={(event) => item.onClick?.(event)}
        >
          {item.label}
        </button>
      ))}
    </div>
  ),
}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

beforeEach(() => {
  const storage = new Map()
  vi.stubGlobal('localStorage', {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
    clear: () => storage.clear(),
  })
  vi.mocked(createFireExtinguisherBatch).mockReset()
  vi.mocked(fetchSiteLocationHierarchy).mockReset()
  vi.mocked(createSiteLocationNode).mockReset()
  resetSiteLocationCatalogStoreForTests()
  window.localStorage?.removeItem('inspection_site_location_catalog_cache_v1')
  vi.mocked(fetchSiteLocationHierarchy).mockResolvedValue({
    data: [
      {
        id: '1',
        parentId: null,
        level: 'zone',
        name: '1',
        displayName: 'Zone 1',
        children: [
          {
            id: '2',
            parentId: '1',
            level: 'area',
            name: 'Canteen',
            displayName: 'Canteen',
            children: [
              {
                id: '3',
                parentId: '2',
                level: 'location',
                name: 'Dry Store',
                displayName: 'Dry Store',
                children: [],
              },
            ],
          },
        ],
      },
    ],
    meta: {},
  })
  vi.mocked(createSiteLocationNode).mockImplementation(async (payload) => ({
    data: {
      id: `new-${payload.level}-${payload.name}`,
      parentId: payload.parentId == null ? null : String(payload.parentId),
      level: payload.level,
      name: payload.name,
      displayName: payload.name,
      children: [],
    },
    created: true,
  }))
})

const setCreatableValue = (container, label, value) => {
  const input = within(container).getByLabelText(label)
  fireEvent.change(input, { target: { value } })
  fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13 })
}

const chooseCreatableOption = async (container, label, value, optionName = value) => {
  const input = within(container).getByLabelText(label)
  fireEvent.change(input, { target: { value } })
  const options = await screen.findAllByRole('option', { name: optionName })
  const reactSelectOption = options.find((option) => option.tagName !== 'OPTION')
  expect(reactSelectOption).toBeDefined()
  fireEvent.click(reactSelectOption)
}

const selectStandardLocation = async (container) => {
  await waitFor(() => expect(fetchSiteLocationHierarchy).toHaveBeenCalled())
  await chooseCreatableOption(container, 'Zone', '1', 'Zone 1')
  await waitFor(() =>
    expect(within(container).getByLabelText('Main Location').disabled).toBe(false),
  )
  await chooseCreatableOption(container, 'Main Location', 'Canteen')
  await waitFor(() => expect(within(container).getByLabelText('Sub-location').disabled).toBe(false))
  await chooseCreatableOption(container, 'Sub-location', 'Dry Store')
}

describe('AllExtinguishersSection', () => {
  it('keeps the explicit add action inside the catalogue container and opens the drawer', () => {
    const onRequestCreate = vi.fn()

    const { rerender } = render(
      <AllExtinguishersSection
        rows={ALL_EXTINGUISHERS_DEMO_ROWS}
        onRequestCreate={onRequestCreate}
      />,
    )

    const desktopContainer = screen.getByTestId('all-extinguishers-section')
    fireEvent.click(within(desktopContainer).getByRole('button', { name: 'Add Extinguisher' }))
    expect(onRequestCreate).toHaveBeenCalledOnce()

    rerender(
      <AllExtinguishersSection
        rows={ALL_EXTINGUISHERS_DEMO_ROWS}
        isCreateOpen
        onRequestCreate={onRequestCreate}
        onRequestCloseCreate={vi.fn()}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Add Fire Extinguisher' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Close Add Fire Extinguisher' }).className).toContain(
      'ms-auto',
    )
  })

  it('uses the mobile bottom drawer throughout the catalogue mobile breakpoint', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query) => ({
        matches: query === '(max-width: 767.98px)',
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    )

    render(
      <AllExtinguishersSection
        rows={ALL_EXTINGUISHERS_DEMO_ROWS}
        isCreateOpen
        onRequestCreate={vi.fn()}
        onRequestCloseCreate={vi.fn()}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Add Fire Extinguisher' }).className).toContain(
      'mobile-bottom-drawer',
    )
  })

  it('creates an extinguisher batch, keeps the drawer open, and closes through Done', async () => {
    const onRequestCloseCreate = vi.fn()
    createFireExtinguisherBatch.mockResolvedValue({
      data: [
        {
          id: 'catalog:901',
          catalogId: 901,
          mainLocation: 'Canteen',
          idLocNo: 'CAN-010',
          barcodeNo: 'SR-NEW-010',
        },
      ],
      meta: { count: 1 },
    })

    const { rerender } = render(
      <AllExtinguishersSection
        rows={ALL_EXTINGUISHERS_DEMO_ROWS}
        isCreateOpen
        onRequestCreate={vi.fn()}
        onRequestCloseCreate={onRequestCloseCreate}
      />,
    )

    const drawer = screen.getByRole('dialog', { name: 'Add Fire Extinguisher' })
    await selectStandardLocation(drawer)
    fireEvent.change(within(drawer).getByLabelText('ID Loc. No.'), {
      target: { value: 'CAN-010' },
    })
    fireEvent.change(within(drawer).getByLabelText('Barcode / S/N'), {
      target: { value: 'SR-NEW-010' },
    })
    fireEvent.click(within(drawer).getByRole('button', { name: 'Save to batch' }))

    expect(createFireExtinguisherBatch).not.toHaveBeenCalled()
    expect(within(drawer).getAllByText('CAN-010').length).toBeGreaterThan(0)
    fireEvent.click(within(drawer).getByRole('button', { name: 'Review & Submit All (1)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Submit All' }))

    await waitFor(() => {
      expect(createFireExtinguisherBatch).toHaveBeenCalledWith(
        expect.objectContaining({
          mainLocation: 'Canteen',
          items: [
            expect.objectContaining({
              idLocNo: 'CAN-010',
              barcodeNo: 'SR-NEW-010',
              confirmDuplicate: false,
            }),
          ],
        }),
      )
    })
    expect(onRequestCloseCreate).not.toHaveBeenCalled()
    expect(
      screen.getAllByText('Fire extinguisher CAN-010 was added to the catalogue.').length,
    ).toBeGreaterThan(0)
    expect(within(drawer).getByRole('button', { name: 'Add more extinguishers' })).toBeTruthy()

    fireEvent.click(within(drawer).getByRole('button', { name: 'Done' }))
    expect(onRequestCloseCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        replace: true,
        viewState: expect.objectContaining({ currentPage: 1 }),
      }),
    )

    rerender(
      <AllExtinguishersSection
        rows={ALL_EXTINGUISHERS_DEMO_ROWS}
        onRequestCreate={vi.fn()}
        onRequestCloseCreate={onRequestCloseCreate}
      />,
    )
    rerender(
      <AllExtinguishersSection
        rows={ALL_EXTINGUISHERS_DEMO_ROWS}
        isCreateOpen
        onRequestCreate={vi.fn()}
        onRequestCloseCreate={onRequestCloseCreate}
      />,
    )
    expect(
      within(screen.getByRole('dialog', { name: 'Add Fire Extinguisher' })).getByLabelText(
        'Main Location',
      ).disabled,
    ).toBe(true)
  })

  it('adds multiple lines and retains the shared location for another batch', async () => {
    createFireExtinguisherBatch.mockResolvedValue({
      data: [
        { catalogId: 911, idLocNo: 'CAN-011', mainLocation: 'Canteen' },
        { catalogId: 912, idLocNo: 'CAN-012', mainLocation: 'Canteen' },
      ],
      meta: { count: 2 },
    })

    render(
      <AllExtinguishersSection
        rows={ALL_EXTINGUISHERS_DEMO_ROWS}
        isCreateOpen
        onRequestCreate={vi.fn()}
        onRequestCloseCreate={vi.fn()}
      />,
    )

    const drawer = screen.getByRole('dialog', { name: 'Add Fire Extinguisher' })
    await selectStandardLocation(drawer)
    fireEvent.change(within(drawer).getByLabelText('ID Loc. No.'), {
      target: { value: 'CAN-011' },
    })
    fireEvent.click(within(drawer).getByRole('button', { name: 'Save to batch' }))
    fireEvent.click(within(drawer).getByRole('button', { name: 'Add Extinguisher' }))
    expect(within(drawer).getByLabelText('ID Loc. No.').value).toBe('')
    fireEvent.change(within(drawer).getByLabelText('ID Loc. No.'), {
      target: { value: 'CAN-012' },
    })
    fireEvent.click(within(drawer).getByRole('button', { name: 'Save to batch' }))

    expect(createFireExtinguisherBatch).not.toHaveBeenCalled()
    fireEvent.click(within(drawer).getByRole('button', { name: 'Review & Submit All (2)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Submit All' }))

    await waitFor(() => expect(createFireExtinguisherBatch).toHaveBeenCalledOnce())
    expect(createFireExtinguisherBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        mainLocation: 'Canteen',
        items: [
          expect.objectContaining({ idLocNo: 'CAN-011' }),
          expect.objectContaining({ idLocNo: 'CAN-012' }),
        ],
      }),
    )

    fireEvent.click(within(drawer).getByRole('button', { name: 'Add more extinguishers' }))
    expect(within(drawer).getAllByText('Canteen').length).toBeGreaterThan(0)
    expect(within(drawer).getByLabelText('ID Loc. No.').value).toBe('')
  })

  it('edits and deletes staged rows while keeping shared location editable', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(
      <AllExtinguishersSection
        rows={ALL_EXTINGUISHERS_DEMO_ROWS}
        isCreateOpen
        onRequestCreate={vi.fn()}
        onRequestCloseCreate={vi.fn()}
      />,
    )

    const drawer = screen.getByRole('dialog', { name: 'Add Fire Extinguisher' })
    await selectStandardLocation(drawer)
    fireEvent.change(within(drawer).getByLabelText('ID Loc. No.'), {
      target: { value: 'CAN-EDIT-001' },
    })
    fireEvent.click(within(drawer).getByRole('button', { name: 'Save to batch' }))

    fireEvent.click(within(drawer).getAllByRole('button', { name: 'Edit extinguisher 1' })[0])
    expect(within(drawer).getByLabelText('Main Location').disabled).toBe(false)
    setCreatableValue(drawer, 'Main Location', 'Canteen Annex')
    await waitFor(() => expect(within(drawer).getByLabelText('Sub-location').disabled).toBe(false))
    setCreatableValue(drawer, 'Sub-location', 'Pump Bay')
    fireEvent.change(within(drawer).getByLabelText('ID Loc. No.'), {
      target: { value: 'CAN-EDIT-002' },
    })
    await waitFor(() =>
      expect(within(drawer).getByRole('button', { name: 'Update batch entry' }).disabled).toBe(
        false,
      ),
    )
    fireEvent.click(within(drawer).getByRole('button', { name: 'Update batch entry' }))

    expect(within(drawer).getAllByText('CAN-EDIT-002').length).toBeGreaterThan(0)
    expect(within(drawer).getByText(/Changing this location will update all 1 staged/)).toBeTruthy()
    fireEvent.click(within(drawer).getAllByRole('button', { name: 'Delete extinguisher 1' })[0])
    expect(confirm).toHaveBeenCalledWith('Remove CAN-EDIT-002 from this batch?')
    expect(within(drawer).queryByText('CAN-EDIT-002')).toBeNull()
  })

  it('loads registered locations into cascading searchable selectors', async () => {
    render(
      <AllExtinguishersSection
        rows={ALL_EXTINGUISHERS_DEMO_ROWS}
        isCreateOpen
        onRequestCreate={vi.fn()}
        onRequestCloseCreate={vi.fn()}
      />,
    )

    const drawer = screen.getByRole('dialog', { name: 'Add Fire Extinguisher' })
    await waitFor(() => expect(fetchSiteLocationHierarchy).toHaveBeenCalledOnce())
    expect(within(drawer).getByLabelText('Main Location').disabled).toBe(true)
    expect(within(drawer).getByLabelText('Sub-location').disabled).toBe(true)
    expect(
      within(drawer).getByText('Select in order: Zone, then Main Location, then Sub-location.'),
    ).toBeTruthy()

    await chooseCreatableOption(drawer, 'Zone', '1', 'Zone 1')
    await waitFor(() => expect(within(drawer).getByLabelText('Main Location').disabled).toBe(false))
    expect(within(drawer).getByLabelText('Main Location').disabled).toBe(false)
    expect(within(drawer).getByLabelText('Sub-location').disabled).toBe(true)

    await chooseCreatableOption(drawer, 'Main Location', 'Canteen')
    await waitFor(() => expect(within(drawer).getByLabelText('Sub-location').disabled).toBe(false))

    await chooseCreatableOption(drawer, 'Sub-location', 'Dry Store')

    expect(within(drawer).getAllByText('Zone 1').length).toBeGreaterThan(0)
    expect(within(drawer).getAllByText('Canteen').length).toBeGreaterThan(0)
    expect(within(drawer).getAllByText('Dry Store').length).toBeGreaterThan(0)
  })

  it('requires explicit confirmation before creating a duplicate locator', async () => {
    const duplicateError = Object.assign(
      new Error('One or more active fire extinguishers use this locator.'),
      {
        status: 409,
        payload: {
          code: 'FIRE_EXTINGUISHER_DUPLICATE_LOCATOR',
          message: 'One or more active fire extinguishers use this locator.',
          data: {
            conflicts: [
              {
                index: 0,
                matches: [
                  {
                    id: 41,
                    zone: '1',
                    mainLocation: 'Canteen',
                    subLocation: 'Dry Store',
                    idLocNo: 'CAN-001',
                    barcodeNo: 'SR-DUP-001',
                    feType: 'DP 6KG',
                  },
                ],
                batchMatches: [],
              },
            ],
          },
          meta: { count: 1 },
        },
      },
    )
    createFireExtinguisherBatch.mockRejectedValueOnce(duplicateError).mockResolvedValueOnce({
      data: [{ catalogId: 902, idLocNo: 'CAN-011', barcodeNo: 'SR-DUP-001' }],
      meta: { count: 1 },
    })

    render(
      <AllExtinguishersSection
        rows={ALL_EXTINGUISHERS_DEMO_ROWS}
        isCreateOpen
        onRequestCreate={vi.fn()}
        onRequestCloseCreate={vi.fn()}
      />,
    )

    const drawer = screen.getByRole('dialog', { name: 'Add Fire Extinguisher' })
    await waitFor(() => expect(fetchSiteLocationHierarchy).toHaveBeenCalled())
    await chooseCreatableOption(drawer, 'Zone', '1', 'Zone 1')
    await waitFor(() => expect(within(drawer).getByLabelText('Main Location').disabled).toBe(false))
    setCreatableValue(drawer, 'Main Location', 'Canteen Annex')
    await waitFor(() => expect(within(drawer).getByLabelText('Sub-location').disabled).toBe(false))
    setCreatableValue(drawer, 'Sub-location', 'Pump Bay')
    fireEvent.change(within(drawer).getByLabelText('ID Loc. No.'), {
      target: { value: 'CAN-011' },
    })
    fireEvent.change(within(drawer).getByLabelText('Barcode / S/N'), {
      target: { value: 'SR-DUP-001' },
    })
    await waitFor(() =>
      expect(within(drawer).getByRole('button', { name: 'Save to batch' }).disabled).toBe(false),
    )
    fireEvent.click(within(drawer).getByRole('button', { name: 'Save to batch' }))
    fireEvent.click(within(drawer).getByRole('button', { name: 'Review & Submit All (1)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Submit All' }))

    await waitFor(() =>
      expect(within(drawer).getAllByText('Duplicate locator found').length).toBeGreaterThan(0),
    )
    expect(within(drawer).getAllByText(/Barcode \/ S\/N: SR-DUP-001/).length).toBeGreaterThan(0)

    fireEvent.click(within(drawer).getByRole('button', { name: 'Review & Submit All (1)' }))
    expect(
      within(drawer).getByText(
        'Confirm every duplicate warning before submitting the batch again.',
      ),
    ).toBeTruthy()
    expect(createFireExtinguisherBatch).toHaveBeenCalledTimes(1)

    fireEvent.click(
      within(drawer).getAllByLabelText('I confirm this is a separate physical extinguisher.')[0],
    )
    fireEvent.click(within(drawer).getByRole('button', { name: 'Review & Submit All (1)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Submit All' }))

    await waitFor(() => {
      expect(createFireExtinguisherBatch).toHaveBeenLastCalledWith(
        expect.objectContaining({
          items: [expect.objectContaining({ barcodeNo: 'SR-DUP-001', confirmDuplicate: true })],
        }),
      )
    })
  })

  it('asks before closing a dirty add drawer', () => {
    const onRequestCloseCreate = vi.fn()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)

    render(
      <AllExtinguishersSection
        rows={ALL_EXTINGUISHERS_DEMO_ROWS}
        isCreateOpen
        onRequestCreate={vi.fn()}
        onRequestCloseCreate={onRequestCloseCreate}
      />,
    )

    const drawer = screen.getByRole('dialog', { name: 'Add Fire Extinguisher' })
    fireEvent.change(within(drawer).getByLabelText('ID Loc. No.'), {
      target: { value: 'CAN-DRAFT' },
    })
    fireEvent.click(within(drawer).getByRole('button', { name: 'Close Add Fire Extinguisher' }))

    expect(confirm).toHaveBeenCalledWith('Discard the unsaved fire extinguisher details?')
    expect(onRequestCloseCreate).not.toHaveBeenCalled()
  })

  it('renders the Excel-style extinguisher table headers and summary counts', () => {
    render(<AllExtinguishersSection rows={ALL_EXTINGUISHERS_DEMO_ROWS} />)

    expect(screen.getByText('ID Loc. No.')).toBeTruthy()
    expect(screen.getByText('Certification Validity')).toBeTruthy()
    expect(screen.getByText('Last Inspected Date')).toBeTruthy()
    expect(screen.getByText('Remarks')).toBeTruthy()
    expect(screen.getByText('Operational')).toBeTruthy()
    const actionHeader = screen.getByRole('columnheader', { name: 'Actions' })
    expect(actionHeader.className).toContain('all-extinguishers-table__sticky-action-cell')
    expect(actionHeader.textContent).toBe('')

    const summary = screen.getByTestId('all-extinguishers-summary')
    expect(within(summary).getByText('Total')).toBeTruthy()
    expect(within(summary).getByText('6')).toBeTruthy()
    expect(within(summary).getByText('Inspected')).toBeTruthy()
    expect(within(summary).getByText('4')).toBeTruthy()
    expect(within(summary).getByText('Not inspected')).toBeTruthy()
    expect(within(summary).getByText('2')).toBeTruthy()
    expect(within(summary).getByText('Issues')).toBeTruthy()
    expect(within(summary).getAllByText('1').length).toBeGreaterThan(0)
  })

  it('filters fixture rows by search text', async () => {
    render(<AllExtinguishersSection rows={ALL_EXTINGUISHERS_DEMO_ROWS} />)

    expect(screen.getAllByText('ADO-001').length).toBeGreaterThan(0)
    expect(screen.getAllByText('PW-001').length).toBeGreaterThan(0)

    fireEvent.change(screen.getAllByPlaceholderText('Search extinguishers')[1], {
      target: { value: 'PW-001' },
    })

    await waitFor(() => {
      expect(screen.getAllByText('PW-001').length).toBeGreaterThan(0)
      expect(screen.queryAllByText('ADO-001')).toHaveLength(0)
      expect(screen.getAllByText('Showing 1 of 1').length).toBeGreaterThan(0)
    })
  })

  it('filters fixture rows by last inspected by', async () => {
    render(<AllExtinguishersSection rows={ALL_EXTINGUISHERS_DEMO_ROWS} />)

    fireEvent.change(screen.getAllByDisplayValue('All inspectors')[0], {
      target: { value: 'Jang' },
    })

    await waitFor(() => {
      expect(screen.getAllByText('ADO-001').length).toBeGreaterThan(0)
      expect(screen.getAllByText('PW-001').length).toBeGreaterThan(0)
      expect(screen.queryAllByText('ADO-002')).toHaveLength(0)
      expect(screen.queryAllByText('SW-001')).toHaveLength(0)
      expect(screen.getAllByText('Showing 2 of 2').length).toBeGreaterThan(0)
    })
  })

  it('shows custom period date controls when custom range is selected', () => {
    render(<AllExtinguishersSection rows={ALL_EXTINGUISHERS_DEMO_ROWS} />)

    const periodSelect = screen.getAllByDisplayValue('All time')[0]
    expect(within(periodSelect).getByText('This month')).toBeTruthy()
    expect(within(periodSelect).getByText('Last 90 days')).toBeTruthy()
    expect(within(periodSelect).getByText('Custom range')).toBeTruthy()

    fireEvent.change(periodSelect, { target: { value: 'custom' } })

    expect(screen.getAllByLabelText('Custom period from date').length).toBeGreaterThan(0)
    expect(screen.getAllByLabelText('Custom period to date').length).toBeGreaterThan(0)
  })

  it('renders condensed mobile card data from the same rows', () => {
    render(<AllExtinguishersSection rows={ALL_EXTINGUISHERS_DEMO_ROWS} />)

    expect(
      screen.getByText('Zone 2 > Potable Water Pump House > Potable Water Pump House'),
    ).toBeTruthy()
    expect(screen.getAllByText('Last inspected date').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Certification').length).toBeGreaterThan(0)
  })

  it('shows an empty state when no extinguisher rows match', async () => {
    render(<AllExtinguishersSection rows={ALL_EXTINGUISHERS_DEMO_ROWS} />)

    fireEvent.change(screen.getAllByPlaceholderText('Search extinguishers')[1], {
      target: { value: 'not-a-real-extinguisher' },
    })

    await waitFor(() => {
      expect(screen.getAllByText('No extinguishers match the current filters.').length).toBe(2)
    })
  })

  it('opens the extinguisher detail panel with historical records', () => {
    render(<AllExtinguishersSection rows={ALL_EXTINGUISHERS_DEMO_ROWS} />)

    fireEvent.click(
      screen.getAllByRole('button', {
        name: 'View details Extinguisher actions for ADO-002',
      })[0],
    )

    const panel = screen.getByRole('dialog', { name: 'ADO-002' })
    expect(panel).toBeTruthy()
    expect(within(panel).getByText('Showing records: All time')).toBeTruthy()
    expect(within(panel).getByText('1 historical issue')).toBeTruthy()
    expect(within(panel).getByText('Historical Issues')).toBeTruthy()
    expect(within(panel).getByText('Historical Inspection Records')).toBeTruthy()
    expect(within(panel).getByText('Physical')).toBeTruthy()
    expect(within(panel).getByText('Signage')).toBeTruthy()
    expect(within(panel).getByText('Box Key')).toBeTruthy()
    expect(within(panel).getByText('Box Glass')).toBeTruthy()
    expect(within(panel).getByText('Operational')).toBeTruthy()
    expect(within(panel).getAllByText('Operational Condition').length).toBeGreaterThan(0)
    expect(within(panel).getAllByText('INS-02-772026').length).toBeGreaterThan(0)
    expect(within(panel).getByText('INS-02-762026')).toBeTruthy()
    expect(within(panel).getAllByText('Ali').length).toBeGreaterThan(0)
    expect(within(panel).getByText('Jang')).toBeTruthy()
    expect(within(panel).getAllByText('Repeat check').length).toBeGreaterThan(0)
  })

  it('opens the extinguisher detail panel when a desktop table row is clicked', () => {
    render(<AllExtinguishersSection rows={ALL_EXTINGUISHERS_DEMO_ROWS} />)

    fireEvent.click(screen.getByRole('button', { name: 'View details for ADO-001' }))

    expect(screen.getByRole('dialog', { name: 'ADO-001' })).toBeTruthy()
  })

  it('opens the extinguisher detail panel when a desktop table row is activated by keyboard', () => {
    render(<AllExtinguishersSection rows={ALL_EXTINGUISHERS_DEMO_ROWS} />)

    fireEvent.keyDown(screen.getByRole('button', { name: 'View details for ADO-001' }), {
      key: 'Enter',
    })

    expect(screen.getByRole('dialog', { name: 'ADO-001' })).toBeTruthy()
  })

  it('switches from history list to a historical record detail and back', () => {
    render(<AllExtinguishersSection rows={ALL_EXTINGUISHERS_DEMO_ROWS} />)

    fireEvent.click(
      screen.getAllByRole('button', {
        name: 'View details Extinguisher actions for ADO-002',
      })[0],
    )
    fireEvent.click(screen.getByRole('button', { name: 'View INS-02-772026' }))

    const detailPanel = screen.getByRole('dialog', { name: 'INS-02-772026' })
    expect(detailPanel).toBeTruthy()
    expect(within(detailPanel).getByText('Operational Condition')).toBeTruthy()
    expect(within(detailPanel).getByText('Operational condition reported not good.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Back to historical records' }))

    expect(screen.getByRole('dialog', { name: 'ADO-002' })).toBeTruthy()
    expect(screen.getByText('Historical Inspection Records')).toBeTruthy()
  })

  it('opens the historical record detail from a historical issue row', () => {
    render(<AllExtinguishersSection rows={ALL_EXTINGUISHERS_DEMO_ROWS} />)

    fireEvent.click(
      screen.getAllByRole('button', {
        name: 'View details Extinguisher actions for ADO-002',
      })[0],
    )
    fireEvent.click(
      screen.getByRole('button', {
        name: 'View INS-02-772026 details for Operational Condition',
      }),
    )

    const detailPanel = screen.getByRole('dialog', { name: 'INS-02-772026' })
    expect(detailPanel).toBeTruthy()
    expect(within(detailPanel).getByText('Operational condition reported not good.')).toBeTruthy()
  })

  it('opens criterion photos from a historical record detail', () => {
    render(<AllExtinguishersSection rows={ALL_EXTINGUISHERS_DEMO_ROWS} />)

    fireEvent.click(
      screen.getAllByRole('button', {
        name: 'View details Extinguisher actions for ADO-002',
      })[0],
    )
    fireEvent.click(screen.getByRole('button', { name: 'View INS-02-772026' }))
    fireEvent.click(screen.getByRole('button', { name: 'View photos' }))

    expect(screen.getByText('ADO-002 - Operational Condition photos')).toBeTruthy()
    expect(screen.getByText('1 photo')).toBeTruthy()
  })

  it('opens criterion photos directly from the historical records table', () => {
    render(<AllExtinguishersSection rows={ALL_EXTINGUISHERS_DEMO_ROWS} />)

    fireEvent.click(
      screen.getAllByRole('button', {
        name: 'View details Extinguisher actions for ADO-002',
      })[0],
    )
    fireEvent.click(
      screen.getByRole('button', {
        name: 'View Operational Condition photos from INS-02-772026',
      }),
    )

    expect(screen.getByText('ADO-002 - INS-02-772026 - Operational Condition photos')).toBeTruthy()
    expect(screen.getAllByText('1 photo').length).toBeGreaterThan(0)
  })

  it('closes the detail panel without clearing active table filters', async () => {
    render(<AllExtinguishersSection rows={ALL_EXTINGUISHERS_DEMO_ROWS} />)

    fireEvent.change(screen.getAllByPlaceholderText('Search extinguishers')[1], {
      target: { value: 'ADO-002' },
    })

    await waitFor(() => {
      expect(screen.getAllByText('Showing 1 of 1').length).toBeGreaterThan(0)
    })

    fireEvent.click(
      screen.getAllByRole('button', {
        name: 'View details Extinguisher actions for ADO-002',
      })[0],
    )
    fireEvent.click(screen.getByRole('button', { name: 'Close ADO-002' }))

    expect(screen.queryByRole('dialog', { name: 'ADO-002' })).toBeNull()
    expect(screen.getAllByText('Showing 1 of 1').length).toBeGreaterThan(0)
    expect(screen.getAllByDisplayValue('ADO-002').length).toBeGreaterThan(0)
  })

  it('infers historical issue and evidence counts from criterion values and photos', () => {
    const rows = [
      {
        ...ALL_EXTINGUISHERS_DEMO_ROWS[0],
        id: 'fe-inferred-issue',
        idLocNo: 'INF-001',
        latestReportId: 'INS-INF-001',
        latestInspectionAt: '2026-07-07T10:00:00+08:00',
        issueCount: 0,
        historyRecords: [
          {
            reportId: 'INS-INF-001',
            submittedAt: '2026-07-07T10:00:00+08:00',
            submittedBy: 'Jang',
            checks: [
              {
                key: 'boxKey',
                label: 'FE Box Key Availability',
                value: 'No',
                photos: [
                  {
                    id: 'inferred-photo',
                    fileName: 'box-key.jpg',
                    url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=',
                  },
                ],
              },
            ],
          },
        ],
      },
    ]

    render(<AllExtinguishersSection rows={rows} />)

    fireEvent.click(
      screen.getAllByRole('button', {
        name: 'View details Extinguisher actions for INF-001',
      })[0],
    )

    const panel = screen.getByRole('dialog', { name: 'INF-001' })
    expect(within(panel).getByText('Issues recorded (1)')).toBeTruthy()
    expect(within(panel).getByText('1 evidence item')).toBeTruthy()
    expect(within(panel).getAllByText('FE Box Key Availability').length).toBeGreaterThan(0)
  })

  it('keeps asset identity in the header and shows compact metadata for not-inspected rows', () => {
    render(<AllExtinguishersSection rows={ALL_EXTINGUISHERS_DEMO_ROWS} />)

    fireEvent.click(
      screen.getAllByRole('button', {
        name: 'View details Extinguisher actions for SW-001',
      })[0],
    )

    const panel = screen.getByRole('dialog', { name: 'SW-001' })
    expect(within(panel).getAllByText('SW-001')).toHaveLength(1)
    expect(within(panel).getByText('FE Type')).toBeTruthy()
    expect(within(panel).getByText('Barcode')).toBeTruthy()
    expect(within(panel).getByText('Certification')).toBeTruthy()
    expect(within(panel).getByText('Last inspected')).toBeTruthy()
    expect(within(panel).getByText('Historical Issues')).toBeTruthy()
    expect(within(panel).getAllByText('Report ID').length).toBeGreaterThanOrEqual(2)
    expect(
      within(panel).getByText('No historical issues found for the selected period.'),
    ).toBeTruthy()
    expect(
      within(panel).getByText('No inspection records found for the selected period.'),
    ).toBeTruthy()
    expect(within(panel).queryByText('Latest Inspection')).toBeNull()
    expect(within(panel).queryByText('Issues recorded (0)')).toBeNull()
    expect(within(panel).queryByText('Latest inspection criteria')).toBeNull()
  })
})

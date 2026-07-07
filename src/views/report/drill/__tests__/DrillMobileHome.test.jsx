// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import DrillMobileHome from '../DrillMobileHome'

const createStorageMock = () => {
  let store = {}
  return {
    getItem: vi.fn((key) => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null)),
    setItem: vi.fn((key, value) => {
      store[key] = String(value)
    }),
    removeItem: vi.fn((key) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', createStorageMock())
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const buildProps = (overrides = {}) => ({
  user: { id: 'user-1', name: 'Drill User' },
  draftRows: [
    {
      id: 'draft-1',
      recordKind: 'draft',
      incidentType: 'Fire Drill',
      location: 'Workshop',
      savedAt: '2026-04-28T10:00:00.000Z',
    },
  ],
  recentRecords: [
    {
      id: 'DRL-001',
      incidentType: 'Rescue Drill',
      location: 'Main plant',
      status: 'Submitted',
      reportDate: '2026-04-29',
    },
  ],
  recordsCount: 1,
  recordScope: 'mine',
  onRecordScopeChange: vi.fn(),
  isRecordsLoading: false,
  onSelectType: vi.fn(),
  onContinueDraft: vi.fn(),
  onDeleteDraft: vi.fn(),
  onOpenRecord: vi.fn(),
  onViewRecords: vi.fn(),
  pushToast: vi.fn(),
  ...overrides,
})

describe('DrillMobileHome', () => {
  it('renders work-first drill type selection before draft and recent records', () => {
    render(<DrillMobileHome {...buildProps()} />)

    const typeHeading = screen.getByText('Choose Type')
    const draftHeading = screen.getByText('Continue Draft')
    const recentHeading = screen.getByText('Recent Records')

    expect(typeHeading.compareDocumentPosition(draftHeading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(draftHeading.compareDocumentPosition(recentHeading)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(screen.getByRole('button', { name: /View all/i }).textContent).toContain('View all (1)')
    expect(screen.getByRole('button', { name: 'Mine' }).getAttribute('data-active')).toBe('true')
  })

  it('uses the shared inspection-style mobile landing hooks', () => {
    const { container } = render(<DrillMobileHome {...buildProps()} />)

    expect(container.querySelector('.inspection-mobile-home')).toBeTruthy()
    expect(container.querySelector('.inspection-mobile-home__type-grid')).toBeTruthy()
    expect(container.querySelector('.inspection-mobile-home__records-toolbar')).toBeTruthy()
  })

  it('shows only the first draft and caps recent records on the landing page', () => {
    render(
      <DrillMobileHome
        {...buildProps({
          draftRows: [
            {
              id: 'draft-1',
              recordKind: 'draft',
              incidentType: 'Fire Drill',
              location: 'Workshop',
              savedAt: '2026-04-28T10:00:00.000Z',
            },
            {
              id: 'draft-2',
              recordKind: 'draft',
              incidentType: 'Rescue Drill',
              location: 'Yard',
              savedAt: '2026-04-28T11:00:00.000Z',
            },
          ],
          recentRecords: [
            {
              id: 'DRL-001',
              incidentType: 'Rescue Drill',
              location: 'Main plant',
              status: 'Submitted',
              reportDate: '2026-04-29',
            },
            {
              id: 'DRL-002',
              incidentType: 'Fire Drill',
              location: 'Workshop',
              status: 'Approved',
              reportDate: '2026-04-30',
            },
            {
              id: 'DRL-003',
              incidentType: 'Evacuation Drill',
              location: 'Office',
              status: 'Submitted',
              reportDate: '2026-05-01',
            },
            {
              id: 'DRL-004',
              incidentType: 'Confined Space Drill',
              location: 'Plant 2',
              status: 'Submitted',
              reportDate: '2026-05-02',
            },
          ],
          recordsCount: 4,
        })}
      />,
    )

    expect(screen.getAllByText('Continue Draft')).toHaveLength(1)
    expect(
      screen.getByRole('button', { name: /Open drill record Rescue Drill Main plant/i }),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: /Open drill record Fire Drill Workshop/i }),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: /Open drill record Evacuation Drill Office/i }),
    ).toBeTruthy()
    expect(
      screen.queryByRole('button', { name: /Open drill record Confined Space Drill Plant 2/i }),
    ).toBeNull()
    expect(screen.getByRole('button', { name: 'View all (4)' })).toBeTruthy()
  })

  it('starts a new drill with the selected type', () => {
    const props = buildProps()
    render(<DrillMobileHome {...props} />)

    fireEvent.click(screen.getByText('Fire Drill'))

    expect(props.onSelectType).toHaveBeenCalledWith('Fire Drill')
  })

  it('opens draft and recent record rows without mixing actions', () => {
    const props = buildProps()
    render(<DrillMobileHome {...props} />)

    fireEvent.click(screen.getByText('Continue Draft'))
    expect(props.onContinueDraft).toHaveBeenCalledWith(props.draftRows[0])

    const recentCard = screen.getByRole('button', { name: /Rescue Drill/i })
    fireEvent.click(recentCard)
    expect(props.onOpenRecord).toHaveBeenCalledWith(props.recentRecords[0])

    const draftCard = screen.getByText('Continue Draft').closest('.border')
    fireEvent.click(within(draftCard).getByRole('button', { name: 'Delete draft' }))
    expect(props.onDeleteDraft).toHaveBeenCalledWith(props.draftRows[0])
  })
})

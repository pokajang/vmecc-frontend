// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import FitnessTestMobileHome from '../FitnessTestMobileHome'

afterEach(() => {
  cleanup()
})

const buildProps = (overrides = {}) => ({
  draftRows: [
    {
      id: 'draft-1',
      recordKind: 'draft',
      incidentType: 'Strength Test',
      location: 'Gym / Indoor hall',
      savedAt: '2026-04-28T10:00:00.000Z',
    },
  ],
  recentRecords: [
    {
      id: 'FIT-001',
      incidentType: 'Endurance Test',
      location: 'Training yard',
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
  ...overrides,
})

describe('FitnessTestMobileHome', () => {
  it('renders work-first fitness test type selection before draft and recent records', () => {
    render(<FitnessTestMobileHome {...buildProps()} />)

    const typeHeading = screen.getByText('Choose Type')
    const draftHeading = screen.getByText('Continue Draft')
    const recentHeading = screen.getByText('Recent Records')

    expect(typeHeading.compareDocumentPosition(draftHeading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(draftHeading.compareDocumentPosition(recentHeading)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(screen.getByRole('button', { name: 'View all (1)' }).textContent).toBe('View all (1)')
    expect(screen.getByRole('button', { name: 'Mine' }).getAttribute('data-active')).toBe('true')
  })

  it('uses the shared inspection-style mobile landing hooks', () => {
    const { container } = render(<FitnessTestMobileHome {...buildProps()} />)

    expect(container.querySelector('.inspection-mobile-home')).toBeTruthy()
    expect(container.querySelector('.inspection-mobile-home__type-grid')).toBeTruthy()
    expect(container.querySelector('.inspection-mobile-home__records-toolbar')).toBeTruthy()
  })

  it('shows only the first draft and caps recent records on the landing page', () => {
    render(
      <FitnessTestMobileHome
        {...buildProps({
          draftRows: [
            {
              id: 'draft-1',
              recordKind: 'draft',
              incidentType: 'Strength Test',
              location: 'Gym / Indoor hall',
              savedAt: '2026-04-28T10:00:00.000Z',
            },
            {
              id: 'draft-2',
              recordKind: 'draft',
              incidentType: 'Endurance Test',
              location: 'Training yard',
              savedAt: '2026-04-28T11:00:00.000Z',
            },
          ],
          recentRecords: [
            {
              id: 'FIT-001',
              incidentType: 'Endurance Test',
              location: 'Training yard',
              status: 'Submitted',
              reportDate: '2026-04-29',
            },
            {
              id: 'FIT-002',
              incidentType: 'Strength Test',
              location: 'Gym / Indoor hall',
              status: 'Approved',
              reportDate: '2026-04-30',
            },
            {
              id: 'FIT-003',
              incidentType: 'Heat Stress Test',
              location: 'Medical bay',
              status: 'Submitted',
              reportDate: '2026-05-01',
            },
            {
              id: 'FIT-004',
              incidentType: 'Team Readiness Test',
              location: 'Field track',
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
      screen.getByRole('button', {
        name: /Open fitness test record Endurance Test Training yard/i,
      }),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', {
        name: /Open fitness test record Strength Test Gym \/ Indoor hall/i,
      }),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', {
        name: /Open fitness test record Heat Stress Test Medical bay/i,
      }),
    ).toBeTruthy()
    expect(
      screen.queryByRole('button', {
        name: /Open fitness test record Team Readiness Test Field track/i,
      }),
    ).toBeNull()
    expect(screen.getByRole('button', { name: 'View all (4)' })).toBeTruthy()
  })

  it('starts a new fitness test with the selected type', () => {
    const props = buildProps()
    render(<FitnessTestMobileHome {...props} />)

    fireEvent.click(screen.getByText('Heat Stress Test'))

    expect(props.onSelectType).toHaveBeenCalledWith('Heat Stress Test')
  })

  it('opens draft and recent record rows without mixing actions', () => {
    const props = buildProps()
    render(<FitnessTestMobileHome {...props} />)

    fireEvent.click(screen.getByText('Continue Draft'))
    expect(props.onContinueDraft).toHaveBeenCalledWith(props.draftRows[0])

    const recentCard = screen.getByRole('button', { name: /Endurance Test/i })
    fireEvent.click(recentCard)
    expect(props.onOpenRecord).toHaveBeenCalledWith(props.recentRecords[0])

    const draftCard = screen.getByText('Continue Draft').closest('.border')
    fireEvent.click(within(draftCard).getByRole('button', { name: 'Delete draft' }))
    expect(props.onDeleteDraft).toHaveBeenCalledWith(props.draftRows[0])
  })
})

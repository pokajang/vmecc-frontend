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
      reportingMonth: '2026-04',
      savedAt: '2026-04-28T10:00:00.000Z',
    },
  ],
  recentRecords: [
    {
      id: 'FIT-001',
      reportingMonth: '2026-04',
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

    const typeHeading = screen.getByText('Start monthly report')
    const draftHeading = screen.getByText('Continue Draft')
    const recentHeading = screen.getByText('Recent records')

    expect(typeHeading.compareDocumentPosition(draftHeading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(draftHeading.compareDocumentPosition(recentHeading)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(screen.getByRole('button', { name: 'View all (1)' }).textContent).toBe('View all (1)')
    expect(screen.getByRole('button', { name: 'Mine' }).getAttribute('data-active')).toBe('true')
  })

  it('uses the shared inspection-style mobile landing hooks', () => {
    const { container } = render(<FitnessTestMobileHome {...buildProps()} />)

    expect(container.querySelector('.mobile-workflow-home')).toBeTruthy()
    expect(container.querySelector('.mobile-workflow-home__type-list')).toBeTruthy()
    expect(container.querySelector('.mobile-workflow-home__records-toolbar')).toBeTruthy()
  })

  it('shows only the first draft and caps recent records on the landing page', () => {
    render(
      <FitnessTestMobileHome
        {...buildProps({
          draftRows: [
            {
              id: 'draft-1',
              recordKind: 'draft',
              reportingMonth: '2026-04',
              savedAt: '2026-04-28T10:00:00.000Z',
            },
            {
              id: 'draft-2',
              recordKind: 'draft',
              reportingMonth: '2026-05',
              savedAt: '2026-04-28T11:00:00.000Z',
            },
          ],
          recentRecords: [
            {
              id: 'FIT-001',
              reportingMonth: '2026-04',
              status: 'Submitted',
              reportDate: '2026-04-29',
            },
            {
              id: 'FIT-002',
              reportingMonth: '2026-05',
              status: 'Approved',
              reportDate: '2026-04-30',
            },
            {
              id: 'FIT-003',
              reportingMonth: '2026-06',
              status: 'Submitted',
              reportDate: '2026-05-01',
            },
            {
              id: 'FIT-004',
              reportingMonth: '2026-07',
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
        name: /Open physical test report 2026-04/i,
      }),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', {
        name: /Open physical test report 2026-05/i,
      }),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', {
        name: /Open physical test report 2026-06/i,
      }),
    ).toBeTruthy()
    expect(
      screen.queryByRole('button', {
        name: /Open physical test report 2026-07/i,
      }),
    ).toBeNull()
    expect(screen.getByRole('button', { name: 'View all (4)' })).toBeTruthy()
  })

  it('starts a new monthly physical test report', () => {
    const props = buildProps()
    render(<FitnessTestMobileHome {...props} />)

    fireEvent.click(screen.getByText('Monthly Physical Test'))

    expect(props.onSelectType).toHaveBeenCalledWith('Physical Test Report')
  })

  it('opens draft and recent record rows without mixing actions', () => {
    const props = buildProps()
    render(<FitnessTestMobileHome {...props} />)

    fireEvent.click(screen.getByText('Continue Draft'))
    expect(props.onContinueDraft).toHaveBeenCalledWith(props.draftRows[0])

    const recentCard = screen.getByRole('button', { name: /Open physical test report 2026-04/i })
    fireEvent.click(recentCard)
    expect(props.onOpenRecord).toHaveBeenCalledWith(props.recentRecords[0])

    const draftCard = screen.getByText('Continue Draft').closest('.border')
    fireEvent.click(within(draftCard).getByRole('button', { name: 'Delete draft' }))
    expect(props.onDeleteDraft).toHaveBeenCalledWith(props.draftRows[0])
  })
})

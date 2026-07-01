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

    const typeHeading = screen.getByText('Choose Fitness Test Type')
    const draftHeading = screen.getByText('Continue Draft')
    const recentHeading = screen.getByText('Recent Records')

    expect(typeHeading.compareDocumentPosition(draftHeading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(draftHeading.compareDocumentPosition(recentHeading)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(screen.getByRole('button', { name: 'View all' }).textContent).toBe('View all')
    expect(screen.getByRole('button', { name: 'Mine' }).getAttribute('data-active')).toBe('true')
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

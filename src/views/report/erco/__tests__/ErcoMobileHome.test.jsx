// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ErcoMobileHome from '../ErcoMobileHome'

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

describe('ErcoMobileHome', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorageMock())
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('starts a type-selected ERCO report and exposes draft/recent actions', () => {
    const onSelectType = vi.fn()
    const onContinueDraft = vi.fn()
    const onDeleteDraft = vi.fn()
    const onOpenRecord = vi.fn()
    const onViewRecords = vi.fn()
    const onRecordScopeChange = vi.fn()

    const draftRows = [
      {
        id: 'draft-1',
        draftId: 'draft-1',
        reportType: 'erco',
        recordKind: 'draft',
        incidentType: 'Fire',
        location: 'Zone 1',
        savedAt: '2026-04-20T09:00:00.000Z',
      },
      {
        id: 'draft-2',
        draftId: 'draft-2',
        reportType: 'erco',
        recordKind: 'draft',
        incidentType: 'Medical Emergency',
        location: 'Clinic',
        savedAt: '2026-04-19T09:00:00.000Z',
      },
      {
        id: 'draft-3',
        draftId: 'draft-3',
        reportType: 'erco',
        recordKind: 'draft',
        incidentType: 'Spill',
        location: 'Deck',
        savedAt: '2026-04-18T09:00:00.000Z',
      },
    ]
    const recentRecords = [
      {
        id: 'record-1',
        reportType: 'erco',
        incidentType: 'Fire',
        location: 'Zone 1',
        status: 'Submitted',
        incidentDate: '2026-04-17',
      },
    ]

    render(
      <ErcoMobileHome
        user={{ id: 'u-1', name: 'Alex Tan' }}
        draftRows={draftRows}
        recentRecords={recentRecords}
        recordsCount={5}
        recordScope="mine"
        onRecordScopeChange={onRecordScopeChange}
        onSelectType={onSelectType}
        onContinueDraft={onContinueDraft}
        onDeleteDraft={onDeleteDraft}
        onOpenRecord={onOpenRecord}
        onViewRecords={onViewRecords}
      />,
    )

    fireEvent.click(screen.getByRole('radio', { name: /Fire/i }))
    expect(onSelectType).toHaveBeenCalledWith('Fire')

    expect(screen.getAllByText('Continue Draft')).toHaveLength(1)
    expect(screen.getByText('Fire - Zone 1')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Continue ERCO draft' }))
    expect(onContinueDraft).toHaveBeenCalledWith(draftRows[0])

    fireEvent.click(screen.getByLabelText('Delete draft'))
    expect(onDeleteDraft).toHaveBeenCalledWith(draftRows[0])

    fireEvent.click(screen.getByRole('button', { name: /View all/i }))
    expect(onViewRecords).toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(onRecordScopeChange).toHaveBeenCalledWith('all')

    fireEvent.click(screen.getByRole('button', { name: /Fire Zone 1/i }))
    expect(onOpenRecord).toHaveBeenCalledWith(recentRecords[0])
  })

  it('uses the inspection landing layout hooks for mobile spacing and controls', () => {
    const { container } = render(
      <ErcoMobileHome
        user={{ id: 'u-1', name: 'Alex Tan' }}
        draftRows={[]}
        recentRecords={[]}
        recordsCount={0}
        recordScope="mine"
        onRecordScopeChange={vi.fn()}
        onSelectType={vi.fn()}
        onContinueDraft={vi.fn()}
        onDeleteDraft={vi.fn()}
        onOpenRecord={vi.fn()}
        onViewRecords={vi.fn()}
      />,
    )

    expect(screen.getByText('Choose Type')).toBeTruthy()
    expect(container.querySelector('.inspection-mobile-home')).toBeTruthy()
    expect(container.querySelector('.inspection-mobile-home__type-grid')).toBeTruthy()
    expect(container.querySelector('.inspection-mobile-home__records-toolbar')).toBeTruthy()
    expect(container.querySelector('.inspection-view-all-btn')).toBeTruthy()
    expect(screen.getByText('No records yet.')).toBeTruthy()
  })

  it('limits recent records to the inspection landing count', () => {
    render(
      <ErcoMobileHome
        user={{ id: 'u-1', name: 'Alex Tan' }}
        draftRows={[]}
        recentRecords={[
          { id: 'record-1', incidentType: 'Oil Spill', location: 'Zone 1', status: 'Approved' },
          {
            id: 'record-2',
            incidentType: 'Special Assistance',
            location: 'Zone 1',
            status: 'Submitted',
          },
          { id: 'record-3', incidentType: 'Hazmat', location: 'Zone 898', status: 'Submitted' },
          { id: 'record-4', incidentType: 'Fire', location: 'Zone 2', status: 'Submitted' },
        ]}
        recordsCount={4}
        recordScope="mine"
        onRecordScopeChange={vi.fn()}
        onSelectType={vi.fn()}
        onContinueDraft={vi.fn()}
        onDeleteDraft={vi.fn()}
        onOpenRecord={vi.fn()}
        onViewRecords={vi.fn()}
      />,
    )

    expect(screen.getAllByRole('button', { name: /Open ERCO record/i })).toHaveLength(3)
    expect(screen.queryByRole('button', { name: /Open ERCO record Fire Zone 2/i })).toBeNull()
    expect(screen.getByRole('button', { name: 'View all (4)' })).toBeTruthy()
  })
})

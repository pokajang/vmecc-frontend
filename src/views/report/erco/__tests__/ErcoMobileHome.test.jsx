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

    expect(screen.getAllByText('Continue Draft')).toHaveLength(3)
    fireEvent.click(screen.getAllByText('Continue Draft')[0])
    expect(onContinueDraft).toHaveBeenCalledWith(draftRows[0])

    fireEvent.click(screen.getAllByLabelText('Delete draft')[0])
    expect(onDeleteDraft).toHaveBeenCalledWith(draftRows[0])

    fireEvent.click(screen.getByRole('button', { name: /View all/i }))
    expect(onViewRecords).toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(onRecordScopeChange).toHaveBeenCalledWith('all')

    fireEvent.click(screen.getByRole('button', { name: /Fire Zone 1/i }))
    expect(onOpenRecord).toHaveBeenCalledWith(recentRecords[0])
  })
})

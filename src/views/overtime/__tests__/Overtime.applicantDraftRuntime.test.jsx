// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import Overtime from '../Overtime'
import { DEFAULT_OVERTIME_APPROVAL_RULES } from '../overtimePolicy'

const overtimeApiMocks = vi.hoisted(() => ({
  cancelMyOvertimeApiFirst: vi.fn(),
  classifyMyOvertimeDateApiFirst: vi.fn(),
  clearMyOvertimeDraftApiFirst: vi.fn(),
  deleteMyOvertimeApiFirst: vi.fn(),
  loadMyOvertimeDraftApiFirst: vi.fn(),
  loadMyOvertimeEligibilityApiFirst: vi.fn(),
  loadMyOvertimePolicyApiFirst: vi.fn(),
  loadMyOvertimeRecordsApiFirst: vi.fn(),
  saveMyOvertimeDraftApiFirst: vi.fn(),
  submitMyOvertimeApiFirst: vi.fn(),
}))

vi.mock('react-redux', () => ({
  useSelector: (selector) =>
    selector({
      authUser: {
        id: 'u-1',
        name: 'Applicant User',
        email: 'applicant@example.com',
        roles: ['Incident Commander'],
        permissions: ['self.overtime'],
      },
    }),
}))

vi.mock('src/services/overtimeApi', () => overtimeApiMocks)

vi.mock('../components/OvertimeRecordsSection', () => ({
  default: ({
    filteredRecords = [],
    setStatusFilter,
    openRecord,
    openOvertimeForEdit,
    startNewOvertime,
    isLoading = false,
  }) => (
    <div data-testid="mock-records-section">
      <div data-testid="records-loading">{String(Boolean(isLoading))}</div>
      <div data-testid="records-ids">{filteredRecords.map((row) => row.id).join('|')}</div>
      <button type="button" onClick={() => setStatusFilter('Draft')}>
        filter-draft
      </button>
      <button type="button" onClick={() => setStatusFilter('Pending')}>
        filter-pending
      </button>
      <button type="button" onClick={() => setStatusFilter('All')}>
        filter-all
      </button>
      <button
        type="button"
        onClick={() => {
          if (filteredRecords[0]) openRecord(filteredRecords[0])
        }}
      >
        open-first-record
      </button>
      <button
        type="button"
        onClick={() => {
          if (filteredRecords[0]) openOvertimeForEdit(filteredRecords[0])
        }}
      >
        edit-first-record
      </button>
      <button type="button" onClick={startNewOvertime}>
        start-new-overtime
      </button>
    </div>
  ),
}))

vi.mock('../components/OvertimeApplySection', () => ({
  default: ({ onDraft, onClearForm, onSubmit, onBack, editingRecordId, clearButtonLabel }) => (
    <div data-testid="mock-apply-section">
      <div data-testid="editing-record-id">{String(editingRecordId || '')}</div>
      <div data-testid="clear-button-label">{String(clearButtonLabel || '')}</div>
      <button type="button" onClick={onDraft}>
        save-draft
      </button>
      <button type="button" onClick={onClearForm}>
        clear-form
      </button>
      <button type="button" onClick={() => onSubmit({ preventDefault: () => {} })}>
        submit-claim
      </button>
      <button type="button" onClick={onBack}>
        back-to-records
      </button>
    </div>
  ),
}))

vi.mock('../components/OvertimeSubmitConfirmModal', () => ({
  default: ({ visible, onConfirm }) =>
    visible ? (
      <button type="button" onClick={onConfirm}>
        confirm-submit
      </button>
    ) : null,
}))

vi.mock('../components/OvertimeDiscardConfirmModal', () => ({
  default: () => null,
}))

vi.mock('../components/OvertimeDetailSection', () => ({
  default: () => null,
}))

vi.mock('src/views/shared/ActionConfirmModal', () => ({
  default: ({ visible, title = '', onConfirm, onClose }) =>
    visible ? (
      <div
        data-testid={`action-confirm-${String(title || '')
          .toLowerCase()
          .replace(/\s+/g, '-')}`}
      >
        <button type="button" onClick={onConfirm}>
          confirm-action
        </button>
        <button type="button" onClick={onClose}>
          close-action
        </button>
      </div>
    ) : null,
}))

const baseRecords = [
  {
    id: 'OT-2026-001',
    serverId: 101,
    ownerUserId: 'u-1',
    recordKey: 'u-1::101',
    overtimeType: 'weekday',
    claimDate: '2026-04-10',
    startTime: '09:00',
    endTime: '11:00',
    isOvernight: false,
    durationMinutes: 120,
    durationLabel: '2h 0m',
    reason: 'Pending overtime item',
    status: 'Pending',
    appliedAt: '2026-04-10T09:00:00.000Z',
    submittedBy: 'Applicant User',
    workflowSnapshot: {
      reviewRole: 'Contract Manager',
      recommendRole: 'Human Resource',
      approveRole: 'Client Contract Manager',
      requireRecommendation: true,
    },
    workflowStage: 'review',
    nextActionRole: 'Contract Manager',
    applicantRoles: ['Incident Commander'],
    approvalHistory: [],
  },
]

const validDraftPayload = {
  overtimeType: 'weekday',
  overtimeTypeConfirmed: true,
  claimDate: '2026-04-12',
  startTime: '09:00',
  endTime: '11:00',
  reason: 'Draft overtime reason for submit.',
  savedAt: '2026-04-12T11:00:00.000Z',
}

const lockedPendingRecord = {
  ...baseRecords[0],
  id: 'OT-2026-002',
  serverId: 102,
  recordKey: 'u-1::102',
  workflowStage: 'recommend',
  approvalHistory: [{ action: 'Reviewed', by: 'Contract Manager' }],
}

const linkedEditDraftPayload = {
  overtimeType: 'weekend',
  overtimeTypeConfirmed: true,
  claimDate: '2026-04-11',
  startTime: '10:00',
  endTime: '12:00',
  reason: 'Linked draft changes for pending OT.',
  sourceRecordId: 'OT-2026-001',
  savedAt: '2026-04-12T11:00:00.000Z',
}

const PathProbe = () => {
  const location = useLocation()
  return <div data-testid="pathname">{location.pathname}</div>
}

const renderOvertime = (initialPath = '/overtime') =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <PathProbe />
              <Overtime />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  )

describe('Overtime applicant draft runtime', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    overtimeApiMocks.loadMyOvertimePolicyApiFirst.mockResolvedValue({
      ok: true,
      data: DEFAULT_OVERTIME_APPROVAL_RULES,
      source: 'api',
    })
    overtimeApiMocks.loadMyOvertimeRecordsApiFirst.mockResolvedValue({
      ok: true,
      data: baseRecords,
      source: 'api',
    })
    overtimeApiMocks.loadMyOvertimeEligibilityApiFirst.mockResolvedValue({
      ok: true,
      data: {
        eligible: true,
        applicableRoles: ['Incident Commander'],
        userRoles: ['Incident Commander'],
      },
      source: 'api',
    })
    overtimeApiMocks.classifyMyOvertimeDateApiFirst.mockResolvedValue({
      ok: true,
      data: { overtime_type: 'weekday' },
      source: 'api',
    })
    overtimeApiMocks.cancelMyOvertimeApiFirst.mockResolvedValue({ ok: true, data: null })
    overtimeApiMocks.deleteMyOvertimeApiFirst.mockResolvedValue({ ok: true })
    overtimeApiMocks.saveMyOvertimeDraftApiFirst.mockResolvedValue({ ok: true, source: 'api' })
    overtimeApiMocks.clearMyOvertimeDraftApiFirst.mockResolvedValue({ ok: true, source: 'api' })
    overtimeApiMocks.submitMyOvertimeApiFirst.mockResolvedValue({
      ok: true,
      source: 'api',
      data: {
        ...baseRecords[0],
        id: 'OT-2026-099',
        serverId: 199,
        recordKey: 'u-1::199',
      },
    })
  })

  it('synthesizes draft row from API, pins it on top, and filters Draft correctly', async () => {
    overtimeApiMocks.loadMyOvertimeDraftApiFirst.mockResolvedValue({
      ok: true,
      data: validDraftPayload,
      source: 'api',
    })

    renderOvertime('/overtime')

    await waitFor(() => {
      const ids = screen.getByTestId('records-ids').textContent || ''
      expect(ids.startsWith('DRAFT')).toBe(true)
      expect(ids.includes('OT-2026-001')).toBe(true)
    })

    fireEvent.click(screen.getByText('filter-pending'))
    await waitFor(() => {
      expect(screen.getByTestId('records-ids').textContent).toBe('OT-2026-001')
    })

    fireEvent.click(screen.getByText('filter-draft'))
    await waitFor(() => {
      expect(screen.getByTestId('records-ids').textContent).toBe('DRAFT')
    })
  })

  it('clicking the draft row resumes edit flow at /overtime/new', async () => {
    overtimeApiMocks.loadMyOvertimeDraftApiFirst.mockResolvedValue({
      ok: true,
      data: validDraftPayload,
      source: 'api',
    })

    renderOvertime('/overtime')

    await waitFor(() => {
      expect(screen.getByTestId('records-ids').textContent || '').toContain('DRAFT')
    })

    fireEvent.click(screen.getByText('edit-first-record'))

    await waitFor(() => {
      expect(screen.getByTestId('pathname').textContent).toBe('/overtime/new')
      expect(screen.getByTestId('editing-record-id').textContent).toBe('DRAFT')
    })
  })

  it('does not block navigation with discard modal when no form fields were edited', async () => {
    overtimeApiMocks.loadMyOvertimeDraftApiFirst.mockResolvedValue({
      ok: true,
      data: validDraftPayload,
      source: 'api',
    })

    renderOvertime('/overtime')

    await waitFor(() => {
      expect(screen.getByTestId('records-ids').textContent || '').toContain('DRAFT')
    })

    fireEvent.click(screen.getByText('edit-first-record'))
    await waitFor(() => {
      expect(screen.getByTestId('pathname').textContent).toBe('/overtime/new')
    })

    fireEvent.click(screen.getByText('back-to-records'))
    await waitFor(() => {
      expect(screen.getByTestId('pathname').textContent).toBe('/overtime')
    })
  })

  it('save draft creates the synthetic draft row and clear removes it', async () => {
    overtimeApiMocks.loadMyOvertimeDraftApiFirst.mockResolvedValue({
      ok: true,
      data: null,
      source: 'api',
    })

    renderOvertime('/overtime/new')

    await waitFor(() => {
      expect(screen.getByTestId('pathname').textContent).toBe('/overtime/new')
    })

    fireEvent.click(screen.getByText('save-draft'))
    await waitFor(() => {
      expect(overtimeApiMocks.saveMyOvertimeDraftApiFirst).toHaveBeenCalledTimes(1)
      expect(screen.getByTestId('pathname').textContent).toBe('/overtime')
      const callPayload = overtimeApiMocks.saveMyOvertimeDraftApiFirst.mock.calls[0]?.[1] || {}
      expect(callPayload.sourceRecordId || '').toBe('')
    })
    await waitFor(() => {
      const ids = screen.getByTestId('records-ids').textContent || ''
      expect(ids.startsWith('DRAFT')).toBe(true)
    })

    fireEvent.click(screen.getByText('start-new-overtime'))
    await waitFor(() => {
      expect(screen.getByTestId('pathname').textContent).toBe('/overtime/new')
    })

    fireEvent.click(screen.getByText('clear-form'))
    await waitFor(() => {
      expect(overtimeApiMocks.clearMyOvertimeDraftApiFirst).toHaveBeenCalled()
    })

    fireEvent.click(screen.getByText('back-to-records'))
    await waitFor(() => {
      const ids = screen.getByTestId('records-ids').textContent || ''
      expect(ids.includes('DRAFT')).toBe(false)
      expect(ids).toBe('OT-2026-001')
    })
  })

  it('save draft while editing pending record links draft to record and does not create standalone DRAFT row', async () => {
    overtimeApiMocks.loadMyOvertimeDraftApiFirst.mockResolvedValue({
      ok: true,
      data: null,
      source: 'api',
    })

    renderOvertime('/overtime')

    await waitFor(() => {
      expect(screen.getByTestId('records-ids').textContent || '').toContain('OT-2026-001')
    })

    fireEvent.click(screen.getByText('edit-first-record'))
    await waitFor(() => {
      expect(screen.getByTestId('pathname').textContent).toBe('/overtime/new')
      expect(screen.getByTestId('editing-record-id').textContent).toBe('OT-2026-001')
    })

    fireEvent.click(screen.getByText('save-draft'))
    await waitFor(() => {
      expect(overtimeApiMocks.saveMyOvertimeDraftApiFirst).toHaveBeenCalledTimes(1)
      const callPayload = overtimeApiMocks.saveMyOvertimeDraftApiFirst.mock.calls[0]?.[1] || {}
      expect(callPayload.sourceRecordId).toBe('OT-2026-001')
      expect(screen.getByTestId('pathname').textContent).toBe('/overtime')
      expect(screen.getByTestId('records-ids').textContent).toBe('OT-2026-001')
    })
  })

  it('edit mode without linked draft uses reset-to-submitted behavior without draft delete API call', async () => {
    overtimeApiMocks.loadMyOvertimeDraftApiFirst.mockResolvedValue({
      ok: true,
      data: null,
      source: 'api',
    })

    renderOvertime('/overtime')

    await waitFor(() => {
      expect(screen.getByTestId('records-ids').textContent || '').toContain('OT-2026-001')
    })

    fireEvent.click(screen.getByText('edit-first-record'))
    await waitFor(() => {
      expect(screen.getByTestId('pathname').textContent).toBe('/overtime/new')
      expect(screen.getByTestId('clear-button-label').textContent).toBe('Reset to submitted')
    })

    fireEvent.click(screen.getByText('clear-form'))
    await waitFor(() => {
      expect(overtimeApiMocks.clearMyOvertimeDraftApiFirst).not.toHaveBeenCalled()
      expect(screen.getByTestId('pathname').textContent).toBe('/overtime/new')
    })
  })

  it('edit mode with linked draft confirms discard, clears draft API, and stays on edit page', async () => {
    overtimeApiMocks.loadMyOvertimeDraftApiFirst.mockResolvedValue({
      ok: true,
      data: linkedEditDraftPayload,
      source: 'api',
    })

    renderOvertime('/overtime')

    await waitFor(() => {
      expect(screen.getByTestId('records-ids').textContent || '').toContain('OT-2026-001')
    })

    fireEvent.click(screen.getByText('edit-first-record'))
    await waitFor(() => {
      expect(screen.getByTestId('pathname').textContent).toBe('/overtime/new')
      expect(screen.getByTestId('clear-button-label').textContent).toBe('Discard draft changes')
    })

    fireEvent.click(screen.getByText('clear-form'))
    await waitFor(() => {
      expect(screen.getByTestId('action-confirm-discard-draft-changes')).toBeTruthy()
    })

    fireEvent.click(screen.getByText('confirm-action'))
    await waitFor(() => {
      expect(overtimeApiMocks.clearMyOvertimeDraftApiFirst).toHaveBeenCalledTimes(1)
      expect(screen.getByTestId('pathname').textContent).toBe('/overtime/new')
    })
  })

  it('blocks edit navigation for pending overtime after first approval step', async () => {
    overtimeApiMocks.loadMyOvertimeDraftApiFirst.mockResolvedValue({
      ok: true,
      data: null,
      source: 'api',
    })
    overtimeApiMocks.loadMyOvertimeRecordsApiFirst.mockResolvedValue({
      ok: true,
      data: [lockedPendingRecord],
      source: 'api',
    })

    renderOvertime('/overtime')

    await waitFor(() => {
      expect(screen.getByTestId('records-ids').textContent || '').toContain('OT-2026-002')
    })

    fireEvent.click(screen.getByText('edit-first-record'))

    await waitFor(() => {
      expect(screen.getByTestId('pathname').textContent).toBe('/overtime')
    })
  })

  it('successful submit clears draft row from records list', async () => {
    overtimeApiMocks.loadMyOvertimeDraftApiFirst.mockResolvedValue({
      ok: true,
      data: validDraftPayload,
      source: 'api',
    })

    renderOvertime('/overtime')

    await waitFor(() => {
      expect(screen.getByTestId('records-ids').textContent || '').toContain('DRAFT')
    })

    fireEvent.click(screen.getByText('open-first-record'))
    await waitFor(() => {
      expect(screen.getByTestId('pathname').textContent).toBe('/overtime/new')
    })

    fireEvent.click(screen.getByText('submit-claim'))
    await waitFor(() => {
      expect(screen.getByText('confirm-submit')).toBeTruthy()
    })

    fireEvent.click(screen.getByText('confirm-submit'))
    await waitFor(() => {
      expect(overtimeApiMocks.submitMyOvertimeApiFirst).toHaveBeenCalledTimes(1)
      expect(overtimeApiMocks.clearMyOvertimeDraftApiFirst).toHaveBeenCalled()
      expect(screen.getByTestId('pathname').textContent).toBe('/overtime')
      const ids = screen.getByTestId('records-ids').textContent || ''
      expect(ids.includes('DRAFT')).toBe(false)
    })
  })
})

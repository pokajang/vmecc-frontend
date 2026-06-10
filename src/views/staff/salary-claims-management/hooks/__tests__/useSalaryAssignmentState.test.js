// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import useSalaryAssignmentState from '../useSalaryAssignmentState'

const deleteSalaryAssignmentApiFirst = vi.fn()
const deleteSalaryAssignmentDraftApiFirst = vi.fn()
const loadSalaryAssignmentDraftsApiFirst = vi.fn()
const loadSalaryAssignmentHistoryApiFirst = vi.fn()
const loadSalaryAssignmentsApiFirst = vi.fn()
const renameSalaryAssignmentDraftApiFirst = vi.fn()
const upsertSalaryAssignmentApiFirst = vi.fn()
const upsertSalaryAssignmentDraftApiFirst = vi.fn()

vi.mock('src/services/salaryAssignmentsApi', () => ({
  deleteSalaryAssignmentApiFirst: (...args) => deleteSalaryAssignmentApiFirst(...args),
  deleteSalaryAssignmentDraftApiFirst: (...args) => deleteSalaryAssignmentDraftApiFirst(...args),
  loadSalaryAssignmentDraftsApiFirst: (...args) => loadSalaryAssignmentDraftsApiFirst(...args),
  loadSalaryAssignmentHistoryApiFirst: (...args) => loadSalaryAssignmentHistoryApiFirst(...args),
  loadSalaryAssignmentsApiFirst: (...args) => loadSalaryAssignmentsApiFirst(...args),
  renameSalaryAssignmentDraftApiFirst: (...args) => renameSalaryAssignmentDraftApiFirst(...args),
  upsertSalaryAssignmentApiFirst: (...args) => upsertSalaryAssignmentApiFirst(...args),
  upsertSalaryAssignmentDraftApiFirst: (...args) => upsertSalaryAssignmentDraftApiFirst(...args),
}))

vi.mock('src/services/apiClient', () => ({
  fetchSalaryStatutoryRates: vi.fn().mockResolvedValue({ data: null }),
  saveOvertimeRateSettings: vi.fn().mockResolvedValue({}),
  saveSalaryStatutoryRates: vi.fn().mockResolvedValue({}),
}))

describe('useSalaryAssignmentState facade', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loadSalaryAssignmentsApiFirst.mockResolvedValue({ ok: true, data: [] })
    loadSalaryAssignmentDraftsApiFirst.mockResolvedValue({ ok: true, data: [] })
    loadSalaryAssignmentHistoryApiFirst.mockResolvedValue({ ok: true, data: [] })
  })

  it('opens create and edit flows with expected draft state', () => {
    const { result } = renderHook(() =>
      useSalaryAssignmentState({ user: { id: '1' }, pushToast: vi.fn() }),
    )

    act(() => result.current.openCreateAssignment())
    expect(result.current.assignmentModalVisible).toBe(true)
    expect(result.current.editingAssignmentId).toBeNull()

    act(() =>
      result.current.openEditAssignment({
        id: 'SCA-1',
        employeeId: '7',
        employee: 'Asha',
        email: 'asha@example.com',
        team: 'Ops',
        effectiveFrom: '2026-06',
        basicSalary: 3000,
        allowances: [{ id: 'a1', name: 'Transport', amount: 100 }],
        employeeContributions: { epf: 330, perkeso: 15, sip: 6 },
        notesHistory: [{ id: 'n1', text: 'Existing remark', createdAt: '2026-06-01' }],
      }),
    )

    expect(result.current.editingAssignmentId).toBe('SCA-1')
    expect(result.current.assignmentDraft).toMatchObject({
      employee: 'Asha',
      basicSalary: '3000',
    })
    expect(result.current.assignmentDraft.notesHistory[0]).toMatchObject({
      text: 'Existing remark',
    })
  })

  it('rejects invalid pay component edits without updating the draft', () => {
    const pushToast = vi.fn()
    const { result } = renderHook(() => useSalaryAssignmentState({ user: { id: '1' }, pushToast }))

    act(() => result.current.openCreateAssignment())
    act(() => result.current.editPayComponents())
    act(() => result.current.updatePayComponentRow('basic', 'basic', 'amount', '-1'))
    let saved = true
    act(() => {
      saved = result.current.savePayComponentsEdit()
    })

    expect(saved).toBe(false)
    expect(pushToast).toHaveBeenCalledWith('Basic salary cannot be negative.', {
      title: 'Invalid salary',
      color: 'danger',
    })
    expect(result.current.assignmentDraft.basicSalary).toBe('')
  })

  it('rejects allowance amounts that have no name', () => {
    const pushToast = vi.fn()
    const { result } = renderHook(() => useSalaryAssignmentState({ user: { id: '1' }, pushToast }))

    act(() => result.current.openCreateAssignment())
    act(() => result.current.editPayComponents())
    act(() => result.current.addAllowanceRow())
    const blankAllowance = result.current.payComponentsDraft.allowances.find(
      (row) => !String(row.name || '').trim(),
    )
    act(() => result.current.updatePayComponentRow('allowance', blankAllowance.id, 'amount', '50'))
    let saved = true
    act(() => {
      saved = result.current.savePayComponentsEdit()
    })

    expect(saved).toBe(false)
    expect(pushToast).toHaveBeenCalledWith('Allowance name is required when amount is provided.', {
      title: 'Invalid allowance',
      color: 'danger',
    })
  })

  it('saves pay component edits with statutory deduction fallbacks', async () => {
    const { result } = renderHook(() =>
      useSalaryAssignmentState({ user: { id: '1' }, pushToast: vi.fn() }),
    )

    act(() => result.current.openCreateAssignment())
    act(() => result.current.editPayComponents())
    act(() => result.current.updatePayComponentRow('basic', 'basic', 'amount', '2000'))
    await act(async () => {})
    let saved = false
    act(() => {
      saved = result.current.savePayComponentsEdit()
    })

    expect(saved).toBe(true)
    expect(result.current.assignmentDraft).toMatchObject({
      basicSalary: '2000',
      employeeContributions: {
        epf: '220',
        perkeso: '10',
        sip: '4',
      },
    })
  })

  it('saves assignment drafts and updates active draft metadata', async () => {
    upsertSalaryAssignmentDraftApiFirst.mockResolvedValue({
      ok: true,
      row: { id: 'draft-1', name: 'Draft one' },
      rows: [{ id: 'draft-1', name: 'Draft one' }],
    })
    const { result } = renderHook(() =>
      useSalaryAssignmentState({ user: { id: '1' }, pushToast: vi.fn() }),
    )

    act(() => result.current.openCreateAssignment())
    await act(async () => {
      const response = await result.current.saveAssignmentAsDraft({ actorName: 'Manager' })
      expect(response).toMatchObject({ ok: true, draftId: 'draft-1', draftName: 'Draft one' })
    })

    expect(upsertSalaryAssignmentDraftApiFirst).toHaveBeenCalled()
    expect(result.current.activeAssignmentDraftId).toBe('draft-1')
    expect(result.current.assignmentDraftRows).toEqual([{ id: 'draft-1', name: 'Draft one' }])
  })

  it('submits assignments, updates rows, and clears active saved drafts', async () => {
    upsertSalaryAssignmentDraftApiFirst.mockResolvedValue({
      ok: true,
      row: { id: '10', name: 'Draft one', backendId: 10 },
      rows: [{ id: '10', name: 'Draft one', backendId: 10 }],
    })
    upsertSalaryAssignmentApiFirst.mockResolvedValue({
      ok: true,
      data: { serverId: 99, status: 'Active' },
      history: { id: 'h1', at: '2026-06-10T08:00:00.000Z' },
    })
    deleteSalaryAssignmentDraftApiFirst.mockResolvedValue({ ok: true, rows: [] })
    const { result } = renderHook(() =>
      useSalaryAssignmentState({ user: { id: '1' }, pushToast: vi.fn() }),
    )

    act(() => result.current.openCreateAssignment())
    act(() =>
      result.current.setAssignmentDraft((prev) => ({
        ...prev,
        selectedStaffKey: 'id:7',
        employeeId: '7',
        employee: 'Asha',
        email: 'asha@example.com',
        team: 'Ops',
        effectiveFrom: '2026-06',
        basicSalary: '3000',
      })),
    )
    await act(async () => {
      await result.current.saveAssignmentAsDraft({ actorName: 'Manager' })
    })
    await act(async () => {
      const response = await result.current.setSalaryAssignment({
        actorName: 'Manager',
        staffOptions: [{ key: 'id:7', id: '7', employee: 'Asha', team: 'Ops' }],
      })
      expect(response.ok).toBe(true)
    })

    expect(result.current.assignmentRows).toHaveLength(1)
    expect(result.current.activeAssignmentDraftId).toBe('')
    expect(deleteSalaryAssignmentDraftApiFirst).toHaveBeenCalledWith('1', '10', 10)
  })

  it('deletes assignment rows and merges returned history', async () => {
    deleteSalaryAssignmentApiFirst.mockResolvedValue({
      ok: true,
      history: { id: 'h-delete', at: '2026-06-10T08:00:00.000Z' },
    })
    const { result } = renderHook(() =>
      useSalaryAssignmentState({ user: { id: '1' }, pushToast: vi.fn() }),
    )

    act(() =>
      result.current.setAssignmentRows([
        { id: 'SCA-1', serverId: 20, employee: 'Asha', effectiveFrom: '2026-06' },
      ]),
    )
    await act(async () => {
      const deleted = await result.current.removeAssignmentRow('SCA-1')
      expect(deleted).toBe(true)
    })

    expect(deleteSalaryAssignmentApiFirst).toHaveBeenCalledWith(20)
    expect(result.current.assignmentRows).toEqual([])
    expect(result.current.assignmentHistory).toEqual([
      { id: 'h-delete', at: '2026-06-10T08:00:00.000Z' },
    ])
  })
})

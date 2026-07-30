// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import useAssignmentRowActions from '../useAssignmentRowActions'

const createProps = (overrides = {}) => ({
  actorName: 'Payroll Manager',
  navigate: vi.fn(),
  navigateRaw: null,
  buildTabPath: vi.fn(() => '/staff/set-salary/assignments'),
  setAssignmentDraft: vi.fn(),
  saveAssignmentAsDraft: vi.fn(),
  setSalaryAssignment: vi.fn(),
  staffOptions: [],
  closeAssignmentModal: vi.fn(),
  removeAssignmentDraft: vi.fn(),
  removeAssignmentRow: vi.fn(),
  pushToast: vi.fn(),
  ...overrides,
})

describe('useAssignmentRowActions route identity', () => {
  it('uses the opaque public assignment id for edit and view routes', () => {
    const props = createProps()
    const { result } = renderHook(() => useAssignmentRowActions(props))
    const assignment = {
      id: 'SCA-2026-001',
      publicId: '01K1B2C3D4E5F6G7H8J9K0MNPQ',
      status: 'Active',
    }

    act(() => result.current.openEditAssignmentPage(assignment))
    act(() => result.current.openAssignmentDetailPage(assignment))

    expect(props.navigate).toHaveBeenNthCalledWith(
      1,
      '/staff/set-salary/assignment/01K1B2C3D4E5F6G7H8J9K0MNPQ/edit',
    )
    expect(props.navigate).toHaveBeenNthCalledWith(
      2,
      '/staff/set-salary/assignment/01K1B2C3D4E5F6G7H8J9K0MNPQ/view',
    )
  })

  it('deletes a persisted assignment through its public identity', async () => {
    const removeAssignmentRow = vi.fn().mockResolvedValue(true)
    const props = createProps({ removeAssignmentRow })
    const { result } = renderHook(() => useAssignmentRowActions(props))
    const assignment = {
      id: 'SCA-2026-001',
      publicId: '01K1B2C3D4E5F6G7H8J9K0MNPQ',
      status: 'Active',
    }

    act(() => result.current.deleteAssignmentRow(assignment))
    await act(async () => {
      await result.current.confirmDeleteAssignmentRow()
    })

    expect(removeAssignmentRow).toHaveBeenCalledWith('01K1B2C3D4E5F6G7H8J9K0MNPQ', {
      actorName: 'Payroll Manager',
    })
  })
})

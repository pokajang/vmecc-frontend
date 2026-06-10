import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('src/config/featureFlags', () => ({
  default: {
    salaryAssignmentsApiReadsPrimary: true,
    salaryAssignmentsApiWritesPrimary: true,
  },
}))

const fetchSalaryAssignments = vi.fn()
const createSalaryAssignment = vi.fn()

vi.mock('../apiClient', () => ({
  fetchSalaryAssignments: (...args) => fetchSalaryAssignments(...args),
  createSalaryAssignment: (...args) => createSalaryAssignment(...args),
  updateSalaryAssignmentApi: vi.fn(),
  deleteSalaryAssignmentApi: vi.fn(),
  fetchSalaryAssignmentDraftsApi: vi.fn(),
  createSalaryAssignmentDraftApi: vi.fn(),
  updateSalaryAssignmentDraftApi: vi.fn(),
  deleteSalaryAssignmentDraftApi: vi.fn(),
}))

vi.mock('src/views/payroll/components/salaryClaimAssignmentStorage', () => ({
  loadSalaryAssignments: vi.fn(() => []),
  saveSalaryAssignments: vi.fn(),
  loadSalaryAssignmentDrafts: vi.fn(() => []),
  saveSalaryAssignmentDrafts: vi.fn(),
  upsertSalaryAssignmentDraft: vi.fn(),
  renameSalaryAssignmentDraft: vi.fn(),
  deleteSalaryAssignmentDraft: vi.fn(),
}))

describe('salaryAssignmentsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps salary assignment list response into UI row shape', async () => {
    fetchSalaryAssignments.mockResolvedValue({
      data: [
        {
          id: 91,
          employee_user_id: 44,
          employee: 'A Staff',
          email: 'STAFF@EXAMPLE.COM',
          team: 'Ops',
          status: 'Active',
          effective_from: '2026-04-01',
          basic_salary: 5000,
          allowance_total: 250,
          allowances: [{ id: 'a1', name: 'Mobile', amount: 250 }],
          employee_contributions: { epf: 10 },
          employer_contributions: { epf: 13 },
          notes_history: [{ id: 'n1', text: 'note' }],
        },
      ],
    })

    const { loadSalaryAssignmentsApiFirst } = await import('../salaryAssignmentsApi')
    const result = await loadSalaryAssignmentsApiFirst('7')

    expect(result.ok).toBe(true)
    expect(result.source).toBe('api')
    expect(result.data[0]).toMatchObject({
      id: '91',
      serverId: 91,
      employeeId: '44',
      email: 'staff@example.com',
      basicSalary: 5000,
      allowanceTotal: 250,
      employeeContributions: { epf: 10 },
      employerContributions: { epf: 13 },
    })
  })

  it('sends camelCase UI payload as snake_case API payload on create', async () => {
    createSalaryAssignment.mockResolvedValue({
      data: { id: 99, employee_user_id: 12, basic_salary: 3000, allowance_total: 0 },
    })
    const { upsertSalaryAssignmentApiFirst } = await import('../salaryAssignmentsApi')
    const response = await upsertSalaryAssignmentApiFirst('1', {
      employeeId: '12',
      effectiveFrom: '2026-05-01',
      basicSalary: 3000,
      allowances: [],
      employeeContributions: { epf: 11 },
      employerContributions: { epf: 13 },
      notesHistory: [],
    })

    expect(response.ok).toBe(true)
    expect(createSalaryAssignment).toHaveBeenCalledWith(
      expect.objectContaining({
        employee_user_id: 12,
        effective_from: '2026-05-01',
        basic_salary: 3000,
        employee_contributions: { epf: 11 },
      }),
    )
  })
})

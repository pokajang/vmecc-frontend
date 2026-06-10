import { describe, expect, it, vi } from 'vitest'
import {
  buildSalaryAssignmentRow,
  buildStaffChangePatch,
  calculateSalaryDetailTotals,
  calculateStatutoryDeductions,
  ensureDefaultAllowanceRows,
  findLatestAssignmentForStaff,
  normalizeAllowanceDraftRows,
} from '../assignmentStateDomain'

describe('assignmentStateDomain', () => {
  it('normalizes allowances and injects missing default rows', () => {
    const rows = ensureDefaultAllowanceRows([
      { id: 'a1', name: 'Performance Allowance', amount: 25 },
    ])

    expect(rows).toEqual([
      { id: 'a1', name: 'Performance Allowance', amount: '25' },
      expect.objectContaining({ name: 'Mobile Allowance', amount: '0' }),
    ])
    expect(normalizeAllowanceDraftRows(null)).toEqual([])
  })

  it('selects the latest assignment for a staff identity', () => {
    const latest = findLatestAssignmentForStaff(
      [
        { id: 'old', employeeId: '7', effectiveFrom: '2026-01', updatedAt: '2026-01-02' },
        { id: 'new', employeeId: '7', effectiveFrom: '2026-03', updatedAt: '2026-03-02' },
        { id: 'other', employeeId: '8', effectiveFrom: '2026-04', updatedAt: '2026-04-02' },
      ],
      { id: '7' },
    )

    expect(latest.id).toBe('new')
  })

  it('builds staff change patches with latest pay and remark values', () => {
    const patch = buildStaffChangePatch({
      key: 'id:7',
      selected: { id: '7', employee: 'Asha', email: 'asha@example.com', team: 'Ops' },
      latestForStaff: {
        basicSalary: 3000,
        fixedAllowances: 100,
        employeeContributions: { epf: 330, perkeso: 15, sip: 6 },
        notesHistory: [{ id: 'n1', text: 'Existing remark', createdAt: '2026-01-01' }],
      },
    })

    expect(patch.employee).toBe('Asha')
    expect(patch.basicSalary).toBe('3000')
    expect(patch.notes).toBe('Existing remark')
    expect(patch.allowances).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'Allowance', amount: '100' })]),
    )
  })

  it('calculates salary totals and statutory deduction rows', () => {
    const salaryDetailTotals = calculateSalaryDetailTotals({
      basicSalary: '1000',
      allowances: [{ id: 'a1', name: 'Allowance', amount: '250' }],
    })
    const deductions = calculateStatutoryDeductions({
      salaryDetailTotals,
      statutoryRates: {
        epf: { employeeRate: 0.11, employerRate: 0.13 },
        perkeso: { employeeRate: 0.005, employerRate: 0.0175 },
        sip: { employeeRate: 0.002, employerRate: 0.002 },
      },
      statutoryRatesFeatureEnabled: true,
    })

    expect(salaryDetailTotals).toMatchObject({
      basicSalary: 1000,
      allowanceTotal: 250,
      gross: 1250,
    })
    expect(deductions.rows.find((row) => row.key === 'epf')).toMatchObject({
      employeeAmount: 110,
      employerAmount: 130,
    })
  })

  it('builds assignment payloads with contributions and notes history preserved', () => {
    vi.setSystemTime(new Date('2026-06-10T08:00:00.000Z'))
    const { row, targetRow } = buildSalaryAssignmentRow({
      actorName: 'Manager',
      assignmentDraft: {
        selectedStaffKey: 'id:7',
        employeeId: '7',
        employee: 'Asha',
        email: 'asha@example.com',
        team: 'Ops',
        effectiveFrom: '2026-06',
        basicSalary: '1000',
        employeeContributions: { epf: '', perkeso: '', sip: '' },
        notesHistory: [{ id: 'n1', text: 'Ready', createdAt: '2026-06-09', createdBy: 'Manager' }],
      },
      assignmentRows: [],
      editingAssignmentId: null,
      salaryDetailTotals: {
        basicSalary: 1000,
        allowanceTotal: 0,
        allowances: [],
      },
      selectedOption: { id: '7', team: 'Ops' },
      statutoryRates: {
        epf: { employeeRate: 0.11, employerRate: 0.13 },
        perkeso: { employeeRate: 0.005, employerRate: 0.0175 },
        sip: { employeeRate: 0.002, employerRate: 0.002 },
      },
      statutoryRatesFeatureEnabled: true,
    })

    expect(targetRow).toBeNull()
    expect(row).toMatchObject({
      employee: 'Asha',
      employeeContributions: { epf: 110, perkeso: 5, sip: 2 },
      employerContributions: { epf: 130, perkeso: 17.5, sip: 2 },
      notes: 'Ready',
      notesUpdatedAt: '2026-06-09',
    })
    vi.useRealTimers()
  })
})

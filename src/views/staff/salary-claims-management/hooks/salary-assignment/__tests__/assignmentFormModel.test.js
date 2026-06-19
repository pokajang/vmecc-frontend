import { describe, expect, it, vi } from 'vitest'
import {
  addAssignmentAllowanceRow,
  buildAssignmentPatchReviewSummary,
  buildAssignmentPayComponentRows,
  buildAssignmentReviewSummary,
  buildAssignmentStepState,
  deleteAssignmentAllowanceRow,
  deriveAssignmentChangedRows,
  deriveAssignmentUnchangedRows,
  normalizeAssignmentRemarks,
  updateAssignmentPayDraft,
  validateAssignmentPayDraft,
} from '../assignmentFormModel'

const calculatedDeductions = {
  rows: [
    { key: 'epf', label: 'EPF', employeeAmount: 110 },
    { key: 'perkeso', label: 'PERKESO', employeeAmount: 5 },
    { key: 'sip', label: 'SIP', employeeAmount: 2 },
  ],
}

describe('assignmentFormModel', () => {
  it('builds pay component rows with summary totals and deduction overrides', () => {
    const result = buildAssignmentPayComponentRows({
      draft: {
        basicSalary: '1000',
        allowances: [{ id: 'a1', name: 'Transport', amount: '250' }],
        employeeContributions: { epf: '100', perkeso: '', sip: '' },
      },
      salaryDetailTotals: { gross: 1250 },
      calculatedDeductions,
    })

    expect(result.totalEmployeeDeductions).toBe(107)
    expect(result.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'component-basic', amount: '1000' }),
        expect.objectContaining({ id: 'a1', rowType: 'allowance', name: 'Transport' }),
        expect.objectContaining({ id: 'deduction-epf', amount: 100 }),
        expect.objectContaining({ id: 'summary-net-payable', amount: 1143 }),
      ]),
    )
  })

  it('updates direct pay draft fields without a nested edit draft', () => {
    const base = {
      basicSalary: '1000',
      allowances: [{ id: 'a1', name: 'Transport', amount: '250' }],
      employeeContributions: { epf: '', perkeso: '', sip: '' },
    }

    expect(
      updateAssignmentPayDraft(base, {
        rowType: 'basic',
        rowId: 'component-basic',
        field: 'amount',
        value: '1200',
      }).basicSalary,
    ).toBe('1200')
    expect(
      updateAssignmentPayDraft(base, {
        rowType: 'allowance',
        rowId: 'a1',
        field: 'name',
        value: 'Mobile',
      }).allowances[0].name,
    ).toBe('Mobile')
    expect(
      updateAssignmentPayDraft(base, {
        rowType: 'deduction',
        rowId: 'epf',
        field: 'amount',
        value: '88',
      }).employeeContributions.epf,
    ).toBe('88')
  })

  it('adds and deletes allowance rows directly on the draft', () => {
    const added = addAssignmentAllowanceRow({ allowances: [] })
    expect(added.allowances).toHaveLength(1)
    const removed = deleteAssignmentAllowanceRow(added, added.allowances[0].id)
    expect(removed.allowances).toEqual([])
  })

  it('validates step readiness and pay errors', () => {
    expect(buildAssignmentStepState({ draft: {} }).review.available).toBe(false)
    expect(
      buildAssignmentStepState({
        draft: { employee: 'Asha', effectiveFrom: '2026-06', basicSalary: '1000' },
      }).review.available,
    ).toBe(true)
    expect(validateAssignmentPayDraft({ basicSalary: '-1' })).toMatchObject({
      ok: false,
      message: 'Basic salary cannot be negative.',
    })
    expect(
      validateAssignmentPayDraft({
        basicSalary: '1000',
        allowances: [{ id: 'a1', name: '', amount: '10' }],
      }),
    ).toMatchObject({ ok: false, message: 'Allowance name is required when amount is provided.' })
  })

  it('normalizes direct remarks and review summaries', () => {
    vi.setSystemTime(new Date('2026-06-12T08:00:00.000Z'))
    const remarks = normalizeAssignmentRemarks({
      currentHistory: [{ id: 'n1', text: 'Old', createdAt: '2026-06-01', createdBy: 'HR' }],
      value: 'Updated',
      actorName: 'Manager',
    })

    expect(remarks).toMatchObject({
      notes: 'Updated',
      notesUpdatedAt: '2026-06-12T08:00:00.000Z',
      notesUpdatedBy: 'Manager',
    })
    expect(remarks.notesHistory[0].text).toBe('Updated')

    const summary = buildAssignmentReviewSummary({
      draft: {
        employee: 'Asha',
        team: 'Ops',
        effectiveFrom: '2026-06',
        basicSalary: '1000',
        notesHistory: remarks.notesHistory,
      },
      salaryDetailTotals: { gross: 1000 },
      calculatedDeductions,
    })
    expect(summary).toMatchObject({
      staffName: 'Asha',
      effectiveFrom: '2026-06',
      netPayable: 883,
    })
    vi.useRealTimers()
  })

  it('clears remarks when the direct remark value is blank', () => {
    const remarks = normalizeAssignmentRemarks({
      currentHistory: [{ id: 'n1', text: 'Old', createdAt: '2026-06-01', createdBy: 'HR' }],
      value: '   ',
      actorName: 'Manager',
    })

    expect(remarks).toEqual({
      notesHistory: [],
      notes: '',
      notesUpdatedAt: '',
      notesUpdatedBy: '',
    })
  })

  it('derives assignment patch rows without changing review totals', () => {
    const baselineDraft = {
      employee: 'Asha',
      team: 'Ops',
      effectiveFrom: '2026-06',
      basicSalary: '1000',
      allowances: [{ id: 'a1', name: 'Transport', amount: '100' }],
      employeeContributions: { epf: '90', perkeso: '', sip: '' },
      notesHistory: [{ id: 'n1', text: 'Old remark', createdAt: '2026-06-01' }],
    }
    const draft = {
      ...baselineDraft,
      basicSalary: '1200',
      allowances: [
        { id: 'a1', name: 'Transport', amount: '100' },
        { id: 'a2', name: 'Mobile', amount: '50' },
      ],
      employeeContributions: { epf: '90', perkeso: '', sip: '' },
      notesHistory: [{ id: 'n1', text: 'New remark', createdAt: '2026-06-01' }],
    }

    const changedRows = deriveAssignmentChangedRows({
      baselineDraft,
      draft,
      calculatedDeductions,
    })
    const unchangedRows = deriveAssignmentUnchangedRows({
      baselineDraft,
      draft,
      calculatedDeductions,
    })
    const summary = buildAssignmentPatchReviewSummary({
      baselineDraft,
      draft,
      salaryDetailTotals: { gross: 1350 },
      calculatedDeductions,
    })

    expect(changedRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'basic', changeType: 'updated', afterAmount: 1200 }),
        expect.objectContaining({ key: 'allowance:a2', changeType: 'added', afterAmount: 50 }),
        expect.objectContaining({ key: 'remarks', changeType: 'updated' }),
      ]),
    )
    expect(unchangedRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'allowance:a1', label: 'Transport', amount: 100 }),
      ]),
    )
    expect(summary).toMatchObject({
      staffName: 'Asha',
      grossSalary: 1350,
      netPayable: 1253,
    })
    expect(summary.changedRows).toHaveLength(changedRows.length)
  })
})

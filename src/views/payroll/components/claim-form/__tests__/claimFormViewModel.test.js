import { describe, expect, it } from 'vitest'
import {
  buildClaimDefaultPathValidity,
  buildExpenseClaimEditorSchema,
  buildSalaryClaimSummary,
  groupClaimAttachments,
} from '../claimFormViewModel'

describe('claimFormViewModel', () => {
  it('builds a salary summary from existing calculated values', () => {
    const summary = buildSalaryClaimSummary({
      hasAssignedSalaryBaseline: true,
      assignedSalarySnapshot: { net: 2500 },
      totalAmount: -50,
      overtimeTotals: { totalPayoutApproved: 120 },
      projectedNetPayout: 2570,
      payrollBaselineConfirmed: true,
    })

    expect(summary.statusLabel).toBe('Ready to submit')
    expect(summary.metrics.map((metric) => [metric.label, metric.value])).toEqual([
      ['Final Payable', 'RM\u00a02,570.00'],
      ['Baseline Net', 'RM\u00a02,500.00'],
      ['Adjustments', '-RM\u00a050.00'],
      ['Approved OT', 'RM\u00a0120.00'],
    ])
  })

  it('describes category-specific expense fields without owning persistence', () => {
    const schema = buildExpenseClaimEditorSchema({
      draftItem: { category: 'Mileage' },
      categoryGuidance: {
        helperText: 'Mileage helper',
        attachmentHint: 'Attach route',
        notesPlaceholder: 'Mileage note',
      },
    })

    expect(schema.amountDisabled).toBe(true)
    expect(schema.fieldSections).toEqual([
      {
        key: 'mileage',
        title: 'Mileage Details',
        fields: ['fromLocation', 'toLocation', 'distanceKm', 'ratePerKm'],
      },
    ])
    expect(schema.attachmentHint).toBe('Attach route')
  })

  it('groups only claim items with attachment context', () => {
    expect(
      groupClaimAttachments([
        { category: 'Fuel', attachmentId: 10, attachmentName: 'fuel.pdf' },
        { category: 'Meals' },
        { claimType: 'Addition', attachmentName: 'bonus.pdf', needsReattach: true },
      ]),
    ).toEqual([
      {
        index: 0,
        category: 'Fuel',
        attachmentId: 10,
        attachmentName: 'fuel.pdf',
        needsReattach: false,
        uploadState: 'idle',
      },
      {
        index: 2,
        category: 'Addition',
        attachmentId: null,
        attachmentName: 'bonus.pdf',
        needsReattach: true,
        uploadState: 'idle',
      },
    ])
  })

  it('keeps default path validity separate for salary and expense flows', () => {
    expect(
      buildClaimDefaultPathValidity({
        claimType: 'salary',
        periodConfirmed: true,
        hasAssignedSalaryBaseline: true,
        payrollBaselineConfirmed: true,
      }),
    ).toBe(true)
    expect(
      buildClaimDefaultPathValidity({
        claimType: 'expense',
        periodConfirmed: true,
        savedItems: [{ amount: '10' }],
      }),
    ).toBe(true)
    expect(
      buildClaimDefaultPathValidity({
        claimType: 'expense',
        periodConfirmed: true,
        savedItems: [],
      }),
    ).toBe(false)
    expect(
      buildClaimDefaultPathValidity({
        claimType: 'salary',
        periodConfirmed: true,
        hasAssignedSalaryBaseline: false,
        payrollBaselineConfirmed: true,
      }),
    ).toBe(false)
  })
})

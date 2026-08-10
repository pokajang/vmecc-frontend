// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ClaimDetailView from '../ClaimDetailView'

describe('ClaimDetailView salary contract warning', () => {
  it('keeps Back available and presents a missing record as a terminal alert', () => {
    render(
      <MemoryRouter>
        <ClaimDetailView
          vm={{
            selectedClaim: null,
            selectedClaimTypeMeta: { label: 'Claim', icon: () => null },
            statusColorMap: {},
          }}
          handlers={{ onBack: vi.fn() }}
        />
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: 'Back to claims' })).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toContain('Claim record not found.')
  })

  it('shows contract warning and suppresses readonly salary breakdown when incomplete', () => {
    render(
      <MemoryRouter>
        <ClaimDetailView
          vm={{
            selectedClaim: {
              id: 'CLM-500',
              type: 'salary',
              status: 'Pending',
              period: 'April 2026',
              salaryContractIncomplete: true,
              salaryContractMissingFields: ['projectedNetPayout', 'adjustmentsTotal'],
              approvalHistory: [],
            },
            selectedClaimTypeMeta: { label: 'Salary Claim', icon: () => null },
            statusColorMap: {},
            submittedClaimItems: [],
            selectedClaimItem: null,
            isItemDetailsVisible: false,
            selectedClaimItemDetails: [],
            submittedTotalLabel: 'Total Salary Claim Amount',
            submittedDisplayTotal: 'RM 0.00',
            claimHistoryEntries: [],
            claimWorkflowState: {
              nextRole: 'Checker',
              stageLabel: 'Check',
              pending: true,
              canRespond: false,
              approveActionLabel: 'Check',
            },
            selectedClaimActions: {
              download: { key: 'download', label: 'Download', disabled: false },
              reject: { key: 'reject', label: 'Reject', disabled: false },
              primaryWorkflowAction: {
                key: 'primary-workflow',
                label: 'Check',
                disabled: false,
              },
            },
            truncateAttachmentLabel: (value) => value,
            formatDate: () => '20 Apr 2026',
            formatDateTime: () => '20 Apr 2026 10:00',
            formatCurrency: (value) => `RM ${Number(value || 0).toFixed(2)}`,
          }}
          handlers={{
            onBack: vi.fn(),
            onSelectClaimItem: vi.fn(),
            onCloseItemDetails: vi.fn(),
            onOpenAttachmentPreview: vi.fn(),
            onTriggerClaimAction: vi.fn(),
            renderItemDetailsField: () => null,
          }}
        />
      </MemoryRouter>,
    )

    expect(
      screen.getByText(/Salary breakdown is unavailable because required details are missing/i),
    ).toBeTruthy()
    expect(screen.queryByText('Salary Claim (View Only)')).toBeNull()
  })

  it('keeps claim-item detail and attachment actions as separate accessible controls', () => {
    render(
      <MemoryRouter>
        <ClaimDetailView
          vm={{
            selectedClaim: {
              id: 'CLM-501',
              type: 'expense',
              status: 'Pending',
              period: 'April 2026',
              approvalHistory: [],
            },
            selectedClaimTypeMeta: { label: 'Expense Claim', icon: () => null },
            statusColorMap: {},
            submittedClaimItems: [
              {
                id: 'item-1',
                title: 'Travel expense',
                note: 'Site visit',
                amount: 25,
                attachmentName: 'private-receipt.pdf',
              },
            ],
            selectedClaimItem: null,
            isItemDetailsVisible: false,
            selectedClaimItemDetails: [],
            submittedTotalLabel: 'Total',
            submittedDisplayTotal: 'RM 25.00',
            claimHistoryEntries: [],
            claimWorkflowState: {
              nextRole: 'Checker',
              stageLabel: 'Check',
              pending: true,
              canRespond: false,
              approveActionLabel: 'Check',
            },
            selectedClaimActions: {
              download: { key: 'download', label: 'Download', disabled: false },
              reject: { key: 'reject', label: 'Reject', disabled: true },
              primaryWorkflowAction: {
                key: 'primary-workflow',
                label: 'Check',
                disabled: true,
              },
            },
            truncateAttachmentLabel: (value) => value,
            formatDate: (value) => value || '-',
            formatDateTime: (value) => value || '-',
            formatCurrency: (value) => `RM ${Number(value || 0).toFixed(2)}`,
          }}
          handlers={{
            onBack: vi.fn(),
            onSelectClaimItem: vi.fn(),
            onCloseItemDetails: vi.fn(),
            onOpenAttachmentPreview: vi.fn(),
            onTriggerClaimAction: vi.fn(),
            renderItemDetailsField: () => null,
          }}
        />
      </MemoryRouter>,
    )

    const openAction = screen.getByRole('button', { name: 'Open claim item Travel expense' })
    const attachmentAction = screen.getByRole('button', {
      name: 'Preview private-receipt.pdf',
    })
    expect(openAction.contains(attachmentAction)).toBe(false)
    expect(document.querySelector('[role="button"] button')).toBeNull()
  })
})

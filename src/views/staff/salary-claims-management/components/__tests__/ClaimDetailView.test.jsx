// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ClaimDetailView from '../ClaimDetailView'

describe('ClaimDetailView salary contract warning', () => {
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
      screen.getByText(/Salary financial breakdown is unavailable because backend returned/i),
    ).toBeTruthy()
    expect(screen.queryByText('Salary Claim (View Only)')).toBeNull()
  })
})

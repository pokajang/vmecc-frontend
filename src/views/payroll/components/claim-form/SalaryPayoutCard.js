import React from 'react'
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CTooltip,
} from '@coreui/react'
import { Pencil, Trash2 } from 'lucide-react'
import CreateActionButton from 'src/components/CreateActionButton'
import TableLoader from 'src/components/TableLoader'
import ResponsiveFinancialBreakdown from 'src/components/workflow/ResponsiveFinancialBreakdown'
import { formatCurrency, formatDate } from './utils/claimFormUtils'
import { getSignedAdjustmentAmount } from './utils/salaryClaimUtils'

const SalaryPayoutCard = ({
  isSalaryAssignmentsLoading,
  hasAssignedSalaryBaseline,
  onAddItem,
  assignedSalarySnapshot,
  allowanceItems,
  statutoryDeductionItems,
  additionAdjustmentRows,
  deductionAdjustmentRows,
  adjustedGrossSalary,
  adjustedTotalDeductions,
  adjustedNetBeforeOvertime,
  totalAmount,
  overtimeTotalPayoutApproved,
  projectedNetPayout,
  editingIndex,
  onEditItem,
  onRemoveItem,
  onPreviewAttachment,
  showAddAction = true,
}) => {
  const adjustmentActions = (item, savedIndex) => (
    <>
      <CButton
        color="light"
        size="sm"
        className="workflow-attachment-action d-inline-flex align-items-center gap-2"
        onClick={() => onEditItem(savedIndex)}
        aria-label={`Edit ${item.lineNotes?.trim() || 'salary adjustment'}`}
      >
        <Pencil size={14} aria-hidden="true" />
        Edit
      </CButton>
      <CButton
        color="danger"
        variant="outline"
        size="sm"
        className="workflow-attachment-action d-inline-flex align-items-center gap-2"
        onClick={() => onRemoveItem(savedIndex)}
        aria-label={`Remove ${item.lineNotes?.trim() || 'salary adjustment'}`}
      >
        <Trash2 size={14} aria-hidden="true" />
        Remove
      </CButton>
      {item.attachmentName ? (
        <CButton
          color="light"
          size="sm"
          className="workflow-attachment-action"
          onClick={() => onPreviewAttachment(item)}
          aria-label={`Preview ${item.attachmentName}`}
        >
          Preview attachment
        </CButton>
      ) : null}
    </>
  )

  const mobileSections = [
    {
      key: 'earnings',
      title: 'Earnings',
      items: [
        {
          key: 'basic-salary',
          label: 'Basic Salary',
          value: formatCurrency(assignedSalarySnapshot.basic),
        },
        ...allowanceItems.map((item, index) => ({
          key: item.key || `allowance-${index}`,
          label: item.label || 'Allowance',
          value: formatCurrency(item.amount),
        })),
        ...additionAdjustmentRows.map(({ item, index: savedIndex }) => ({
          key: `addition-adjustment-${savedIndex}`,
          label: item.lineNotes?.trim() || 'Salary adjustment',
          value: formatCurrency(getSignedAdjustmentAmount(item)),
          detail: [item.claimType, item.claimDate ? formatDate(item.claimDate) : null]
            .filter(Boolean)
            .join(' · '),
          actions: adjustmentActions(item, savedIndex),
          tone: 'positive',
        })),
        {
          key: 'gross-baseline',
          label: 'Gross Salary (Baseline)',
          value: formatCurrency(assignedSalarySnapshot.gross),
        },
        {
          key: 'adjusted-gross',
          label: 'Adjusted Gross Salary',
          value: formatCurrency(adjustedGrossSalary),
          emphasis: true,
          tone: 'positive',
        },
      ],
    },
    {
      key: 'deductions',
      title: 'Deductions',
      items: [
        ...statutoryDeductionItems.map((item, index) => ({
          key: item.key || `deduction-${index}`,
          label: item.label || 'Deduction',
          value: formatCurrency(-item.amount),
          tone: 'negative',
        })),
        ...deductionAdjustmentRows.map(({ item, index: savedIndex }) => ({
          key: `deduction-adjustment-${savedIndex}`,
          label: item.lineNotes?.trim() || 'Deduction adjustment',
          value: formatCurrency(getSignedAdjustmentAmount(item)),
          detail: [item.claimType, item.claimDate ? formatDate(item.claimDate) : null]
            .filter(Boolean)
            .join(' · '),
          actions: adjustmentActions(item, savedIndex),
          tone: 'negative',
        })),
        {
          key: 'deductions-baseline',
          label: 'Total Deductions (Baseline)',
          value: formatCurrency(-assignedSalarySnapshot.totalDeductions),
          tone: 'negative',
        },
        {
          key: 'adjusted-deductions',
          label: 'Adjusted Total Deductions',
          value: formatCurrency(-adjustedTotalDeductions),
          emphasis: true,
          tone: 'negative',
        },
      ],
    },
    {
      key: 'payable-summary',
      title: 'Payable Summary',
      items: [
        {
          key: 'salary-payable-baseline',
          label: 'Salary Payable (Baseline)',
          value: formatCurrency(assignedSalarySnapshot.net),
        },
        {
          key: 'adjusted-net',
          label: 'Net Salary (Adjusted, before OT)',
          value: formatCurrency(adjustedNetBeforeOvertime),
        },
        {
          key: 'total-adjustments',
          label: 'Total Adjustments',
          value: formatCurrency(totalAmount),
        },
        {
          key: 'approved-overtime',
          label: 'Approved Overtime Payout',
          value: formatCurrency(overtimeTotalPayoutApproved),
        },
        {
          key: 'final-payable',
          label: 'Final Payable',
          value: formatCurrency(projectedNetPayout),
          emphasis: true,
        },
      ],
    },
  ]

  return (
    <CCard>
      <CCardHeader className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2">
        <span>Salary Payout</span>
        {showAddAction && (
          <CreateActionButton
            label="Add Adjustment"
            onClick={onAddItem}
            disabled={!hasAssignedSalaryBaseline}
          />
        )}
      </CCardHeader>
      <CCardBody className="d-grid gap-3">
        {isSalaryAssignmentsLoading ? (
          <TableLoader />
        ) : !hasAssignedSalaryBaseline ? (
          <div className="text-muted">
            Your salary and allowances haven&apos;t been set yet for the selected payroll month.
            Please contact HR/Admin before submitting a salary payout claim.
          </div>
        ) : (
          <>
            <ResponsiveFinancialBreakdown
              sections={mobileSections}
              ariaLabel="Salary payout breakdown"
            />
            <div className="d-none d-md-block rounded-3 shadow-sm overflow-hidden bg-body">
              <CTable align="middle" className="mb-0" responsive>
                <CTableHead color="light">
                  <CTableRow>
                    <CTableHeaderCell className="text-center" style={{ width: '56px' }}>
                      #
                    </CTableHeaderCell>
                    <CTableHeaderCell>Item</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Amount</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  <CTableRow>
                    <CTableDataCell className="text-center text-body-secondary">1</CTableDataCell>
                    <CTableDataCell>Basic Salary</CTableDataCell>
                    <CTableDataCell className="text-end">
                      {formatCurrency(assignedSalarySnapshot.basic)}
                    </CTableDataCell>
                  </CTableRow>
                  {allowanceItems.map((allowanceItem, index) => (
                    <CTableRow key={allowanceItem.key || `allowance-${index}`}>
                      <CTableDataCell className="text-center text-body-secondary">
                        {2 + index}
                      </CTableDataCell>
                      <CTableDataCell>{allowanceItem.label || 'Allowance'}</CTableDataCell>
                      <CTableDataCell className="text-end">
                        {formatCurrency(allowanceItem.amount)}
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                  {additionAdjustmentRows.map(({ item, index: savedIndex }, index) => (
                    <CTableRow key={`addition-adjustment-${savedIndex}`}>
                      <CTableDataCell className="text-center text-body-secondary">
                        {2 + allowanceItems.length + index}
                      </CTableDataCell>
                      <CTableDataCell>
                        <div className="d-flex align-items-center gap-2">
                          <div className="d-flex align-items-center gap-2 flex-shrink-0">
                            <CButton
                              color="link"
                              size="sm"
                              className="d-inline-flex align-items-center justify-content-center p-0 text-body-secondary"
                              onClick={() => onEditItem(savedIndex)}
                              title="Edit adjustment"
                            >
                              <Pencil size={14} />
                            </CButton>
                            <CButton
                              color="link"
                              size="sm"
                              className="d-inline-flex align-items-center justify-content-center p-0 text-danger"
                              onClick={() => onRemoveItem(savedIndex)}
                              title="Remove adjustment"
                            >
                              <Trash2 size={14} />
                            </CButton>
                          </div>
                          <div className="d-flex align-items-center gap-2 flex-grow-1 min-w-0">
                            <span
                              className="rounded-circle flex-shrink-0 bg-success"
                              style={{ width: 8, height: 8 }}
                              title={item.claimType || 'Adjustment'}
                            />
                            <span className="fw-semibold text-success text-truncate">
                              {item.lineNotes?.trim() || 'No description'}
                            </span>
                            {item.claimDate && (
                              <span className="small text-body-secondary flex-shrink-0">
                                {formatDate(item.claimDate)}
                              </span>
                            )}
                            {item.attachmentName && (
                              <CTooltip content={item.attachmentName} placement="top">
                                <CBadge
                                  as="button"
                                  type="button"
                                  color="light"
                                  className="text-body-secondary flex-shrink-0"
                                  style={{ cursor: 'pointer' }}
                                  aria-label={`Preview ${item.attachmentName}`}
                                  onClick={() => onPreviewAttachment(item)}
                                >
                                  {item.attachmentName.length > 18
                                    ? `${item.attachmentName.slice(0, 12)}...${item.attachmentName.slice(-4)}`
                                    : item.attachmentName}
                                </CBadge>
                              </CTooltip>
                            )}
                            {editingIndex === savedIndex && (
                              <CBadge color="info" className="flex-shrink-0">
                                Editing
                              </CBadge>
                            )}
                          </div>
                        </div>
                      </CTableDataCell>
                      <CTableDataCell className="text-end fw-semibold text-success">
                        {formatCurrency(getSignedAdjustmentAmount(item))}
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                  <CTableRow>
                    <CTableDataCell className="text-center text-body-secondary">
                      {2 + allowanceItems.length + additionAdjustmentRows.length}
                    </CTableDataCell>
                    <CTableDataCell>Gross Salary (Baseline)</CTableDataCell>
                    <CTableDataCell className="text-end">
                      {formatCurrency(assignedSalarySnapshot.gross)}
                    </CTableDataCell>
                  </CTableRow>
                  <CTableRow className="table-light">
                    <CTableDataCell></CTableDataCell>
                    <CTableDataCell className="fw-semibold">Adjusted Gross Salary</CTableDataCell>
                    <CTableDataCell className="text-end fw-semibold text-success">
                      {formatCurrency(adjustedGrossSalary)}
                    </CTableDataCell>
                  </CTableRow>
                  <CTableRow className="table-light">
                    <CTableDataCell></CTableDataCell>
                    <CTableDataCell className="fw-semibold">Deductions</CTableDataCell>
                    <CTableDataCell></CTableDataCell>
                  </CTableRow>
                  {statutoryDeductionItems.map((deductionItem, index) => (
                    <CTableRow
                      key={deductionItem.key || `deduction-${index}`}
                      className="table-danger"
                    >
                      <CTableDataCell className="text-center text-body-secondary">
                        {3 + allowanceItems.length + additionAdjustmentRows.length + index}
                      </CTableDataCell>
                      <CTableDataCell>{deductionItem.label || 'Deduction'}</CTableDataCell>
                      <CTableDataCell className="text-end text-danger-emphasis">
                        {formatCurrency(-deductionItem.amount)}
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                  {deductionAdjustmentRows.map(({ item, index: savedIndex }, index) => (
                    <CTableRow key={`deduction-adjustment-${savedIndex}`} className="table-danger">
                      <CTableDataCell className="text-center text-body-secondary">
                        {3 +
                          allowanceItems.length +
                          additionAdjustmentRows.length +
                          statutoryDeductionItems.length +
                          index}
                      </CTableDataCell>
                      <CTableDataCell>
                        <div className="d-flex align-items-center gap-2">
                          <div className="d-flex align-items-center gap-2 flex-shrink-0">
                            <CButton
                              color="link"
                              size="sm"
                              className="d-inline-flex align-items-center justify-content-center p-0 text-body-secondary"
                              onClick={() => onEditItem(savedIndex)}
                              title="Edit adjustment"
                            >
                              <Pencil size={14} />
                            </CButton>
                            <CButton
                              color="link"
                              size="sm"
                              className="d-inline-flex align-items-center justify-content-center p-0 text-danger"
                              onClick={() => onRemoveItem(savedIndex)}
                              title="Remove adjustment"
                            >
                              <Trash2 size={14} />
                            </CButton>
                          </div>
                          <div className="d-flex align-items-center gap-2 flex-grow-1 min-w-0">
                            <span
                              className="rounded-circle flex-shrink-0 bg-danger"
                              style={{ width: 8, height: 8 }}
                              title={item.claimType || 'Adjustment'}
                            />
                            <span className="fw-semibold text-danger text-truncate">
                              {item.lineNotes?.trim() || 'No description'}
                            </span>
                            {item.claimDate && (
                              <span className="small text-body-secondary flex-shrink-0">
                                {formatDate(item.claimDate)}
                              </span>
                            )}
                            {item.attachmentName && (
                              <CTooltip content={item.attachmentName} placement="top">
                                <CBadge
                                  as="button"
                                  type="button"
                                  color="light"
                                  className="text-body-secondary flex-shrink-0"
                                  style={{ cursor: 'pointer' }}
                                  aria-label={`Preview ${item.attachmentName}`}
                                  onClick={() => onPreviewAttachment(item)}
                                >
                                  {item.attachmentName.length > 18
                                    ? `${item.attachmentName.slice(0, 12)}...${item.attachmentName.slice(-4)}`
                                    : item.attachmentName}
                                </CBadge>
                              </CTooltip>
                            )}
                            {editingIndex === savedIndex && (
                              <CBadge color="info" className="flex-shrink-0">
                                Editing
                              </CBadge>
                            )}
                          </div>
                        </div>
                      </CTableDataCell>
                      <CTableDataCell className="text-end fw-semibold text-danger">
                        {formatCurrency(getSignedAdjustmentAmount(item))}
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                  <CTableRow className="table-danger">
                    <CTableDataCell className="text-center text-body-secondary">
                      {3 +
                        allowanceItems.length +
                        additionAdjustmentRows.length +
                        statutoryDeductionItems.length +
                        deductionAdjustmentRows.length}
                    </CTableDataCell>
                    <CTableDataCell className="fw-semibold">
                      Total Deductions (Baseline)
                    </CTableDataCell>
                    <CTableDataCell className="text-end fw-semibold text-danger-emphasis">
                      {formatCurrency(-assignedSalarySnapshot.totalDeductions)}
                    </CTableDataCell>
                  </CTableRow>
                  <CTableRow className="table-light">
                    <CTableDataCell></CTableDataCell>
                    <CTableDataCell className="fw-semibold">
                      Adjusted Total Deductions
                    </CTableDataCell>
                    <CTableDataCell className="text-end fw-semibold text-danger-emphasis">
                      {formatCurrency(-adjustedTotalDeductions)}
                    </CTableDataCell>
                  </CTableRow>
                  <CTableRow className="table-light">
                    <CTableDataCell></CTableDataCell>
                    <CTableDataCell className="fw-semibold">
                      Salary Payable (Baseline)
                    </CTableDataCell>
                    <CTableDataCell className="text-end fw-semibold">
                      {formatCurrency(assignedSalarySnapshot.net)}
                    </CTableDataCell>
                  </CTableRow>
                  <CTableRow className="table-light">
                    <CTableDataCell></CTableDataCell>
                    <CTableDataCell className="fw-semibold">
                      Net Salary (Adjusted, before OT)
                    </CTableDataCell>
                    <CTableDataCell className="text-end fw-semibold">
                      {formatCurrency(adjustedNetBeforeOvertime)}
                    </CTableDataCell>
                  </CTableRow>
                  <CTableRow className="table-light">
                    <CTableDataCell></CTableDataCell>
                    <CTableDataCell className="fw-semibold">Total Adjustments</CTableDataCell>
                    <CTableDataCell className="text-end fw-semibold">
                      {formatCurrency(totalAmount)}
                    </CTableDataCell>
                  </CTableRow>
                  <CTableRow className="table-light">
                    <CTableDataCell></CTableDataCell>
                    <CTableDataCell className="fw-semibold">
                      Approved Overtime Payout
                    </CTableDataCell>
                    <CTableDataCell className="text-end fw-semibold">
                      {formatCurrency(overtimeTotalPayoutApproved)}
                    </CTableDataCell>
                  </CTableRow>
                  <CTableRow className="table-light">
                    <CTableDataCell></CTableDataCell>
                    <CTableDataCell className="fw-semibold">Final Payable</CTableDataCell>
                    <CTableDataCell className="text-end fw-semibold">
                      {formatCurrency(projectedNetPayout)}
                    </CTableDataCell>
                  </CTableRow>
                </CTableBody>
              </CTable>
            </div>
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

export default SalaryPayoutCard

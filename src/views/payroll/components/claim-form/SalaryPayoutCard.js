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
} from '@coreui/react'
import { Pencil, Trash2 } from 'lucide-react'
import CreateActionButton from 'src/components/CreateActionButton'
import TableLoader from 'src/components/TableLoader'
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
}) => (
  <CCard>
    <CCardHeader className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2">
      <span>Salary Payout</span>
      <CreateActionButton
        label="Add Adjustment"
        onClick={onAddItem}
        disabled={!hasAssignedSalaryBaseline}
      />
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
          <div className="rounded-3 shadow-sm overflow-hidden bg-white">
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
                            <CBadge
                              color="light"
                              className="text-body-secondary flex-shrink-0"
                              role="button"
                              style={{ cursor: 'pointer' }}
                              title="Preview attachment"
                              onClick={() => onPreviewAttachment(item)}
                            >
                              {item.attachmentName.length > 18
                                ? `${item.attachmentName.slice(0, 12)}...${item.attachmentName.slice(-4)}`
                                : item.attachmentName}
                            </CBadge>
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
                            <CBadge
                              color="light"
                              className="text-body-secondary flex-shrink-0"
                              role="button"
                              style={{ cursor: 'pointer' }}
                              title="Preview attachment"
                              onClick={() => onPreviewAttachment(item)}
                            >
                              {item.attachmentName.length > 18
                                ? `${item.attachmentName.slice(0, 12)}...${item.attachmentName.slice(-4)}`
                                : item.attachmentName}
                            </CBadge>
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
                  <CTableDataCell className="fw-semibold">Adjusted Total Deductions</CTableDataCell>
                  <CTableDataCell className="text-end fw-semibold text-danger-emphasis">
                    {formatCurrency(-adjustedTotalDeductions)}
                  </CTableDataCell>
                </CTableRow>
                <CTableRow className="table-light">
                  <CTableDataCell></CTableDataCell>
                  <CTableDataCell className="fw-semibold">Salary Payable (Baseline)</CTableDataCell>
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
                  <CTableDataCell className="fw-semibold">Approved Overtime Payout</CTableDataCell>
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

export default SalaryPayoutCard

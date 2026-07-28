import React from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import { Trash2 } from 'lucide-react'
import CreateActionButton from 'src/components/CreateActionButton'
import StaffSelect from 'src/components/staff/StaffSelect'

export const selectControlStyles = {
  control: (base) => ({
    ...base,
    minHeight: 38,
    height: 38,
  }),
  valueContainer: (base) => ({
    ...base,
    height: 38,
    paddingTop: 0,
    paddingBottom: 0,
  }),
  indicatorsContainer: (base) => ({
    ...base,
    height: 38,
  }),
  input: (base) => ({
    ...base,
    margin: 0,
    padding: 0,
  }),
}

const SummaryField = ({ label, value }) => (
  <div className="d-flex justify-content-between align-items-start gap-3 py-2">
    <span className="text-body-secondary">{label}</span>
    <span className="fw-semibold text-end text-break">{value || '-'}</span>
  </div>
)

const formatPatchAmount = (formatCurrency, value) =>
  typeof value === 'number' ? formatCurrency(value) : formatCurrency(Number(value || 0))

const PayChangeRow = ({ change, formatCurrency }) => {
  const isRemark = change.type === 'remarks'
  return (
    <div className="border rounded-3 bg-body p-3">
      <div className="d-flex justify-content-between align-items-start gap-3">
        <div>
          <div className="fw-semibold">{change.label}</div>
          <div className="small text-body-secondary text-capitalize">{change.changeType}</div>
        </div>
        {!isRemark ? (
          <div className="text-end">
            <div className="small text-body-secondary">
              {formatPatchAmount(formatCurrency, change.beforeAmount)}
            </div>
            <div className="fw-semibold">
              {formatPatchAmount(formatCurrency, change.afterAmount)}
            </div>
          </div>
        ) : null}
      </div>
      {isRemark ? (
        <div className="small mt-2">
          <div className="text-body-secondary">Before</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{change.beforeText || '-'}</div>
          <div className="text-body-secondary mt-2">After</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{change.afterText || '-'}</div>
        </div>
      ) : change.beforeLabel !== change.afterLabel ? (
        <div className="small text-body-secondary mt-2">
          Renamed from {change.beforeLabel || '-'} to {change.afterLabel || '-'}.
        </div>
      ) : null}
    </div>
  )
}

const UnchangedPayRows = ({ formatCurrency, rows = [] }) => {
  if (!rows.length) return null
  return (
    <details className="border rounded-3 bg-body p-3 mt-3">
      <summary className="fw-semibold">Show unchanged pay components</summary>
      <div className="d-grid gap-2 mt-3">
        {rows.map((row) => (
          <SummaryField
            key={row.key}
            label={row.label}
            value={
              row.type === 'deduction'
                ? `-${formatCurrency(Math.abs(row.amount))}`
                : formatCurrency(row.amount)
            }
          />
        ))}
      </div>
    </details>
  )
}

export const SalaryAssignmentStaffFields = ({
  draft,
  handleDraftFieldChange,
  handleStaffSelectChange,
  includeInactiveStaff,
  isReadOnly,
  setIncludeInactiveStaff,
  staffDirectoryLoading,
  visibleStaffOptions,
}) => (
  <CCard>
    <CCardHeader>Staff and Month</CCardHeader>
    <CCardBody className="d-grid gap-3">
      <CRow className="g-3">
        <CCol md={8}>
          <CFormLabel htmlFor="assignment-staff">Staff</CFormLabel>
          <StaffSelect
            inputId="assignment-staff"
            value={draft.selectedStaffKey}
            options={visibleStaffOptions}
            onChange={handleStaffSelectChange}
            isLoading={staffDirectoryLoading}
            placeholder={staffDirectoryLoading ? 'Loading staff...' : 'Search and select staff'}
            includeInactive={includeInactiveStaff}
            disabled={isReadOnly}
            styles={selectControlStyles}
          />
          <CFormCheck
            id="assignment-include-inactive"
            className="mt-2"
            label="Include inactive staff"
            checked={includeInactiveStaff}
            disabled={isReadOnly}
            onChange={(event) => setIncludeInactiveStaff(event.target.checked)}
          />
        </CCol>
        <CCol md={4}>
          <CFormLabel htmlFor="assignment-effective">Effective month</CFormLabel>
          <CFormInput
            id="assignment-effective"
            type="month"
            style={{ minHeight: 38 }}
            value={String(draft.effectiveFrom || '').slice(0, 7)}
            disabled={isReadOnly}
            onChange={(event) => handleDraftFieldChange('effectiveFrom', event.target.value)}
          />
        </CCol>
      </CRow>

      {(draft.selectedStaffKey || draft.employee) && (
        <div className="rounded-3 border border-primary bg-primary bg-opacity-10 p-3">
          <div className="d-flex align-items-start gap-3">
            <div
              className="d-inline-flex align-items-center justify-content-center rounded-circle border bg-body text-body-secondary fw-semibold"
              style={{ flex: '0 0 auto', width: 56, height: 56, lineHeight: 1 }}
            >
              {draft?.avatarUrl ? (
                <img
                  src={draft.avatarUrl}
                  alt={draft.employee || 'Staff avatar'}
                  className="rounded-circle"
                  style={{ width: 56, height: 56, objectFit: 'cover' }}
                />
              ) : (
                String(draft.employee || '?')
                  .trim()
                  .charAt(0)
                  .toUpperCase()
              )}
            </div>
            <div className="flex-grow-1" style={{ minWidth: 0 }}>
              <div className="small text-body-secondary mb-1">Staff Details</div>
              <div className="fw-semibold">{draft.employee || '-'}</div>
              <div className="mt-1 d-grid gap-1">
                {[
                  ['Email', draft.email],
                  ['IC Number', draft.icNumber],
                  ['Mobile Number', draft.phone],
                  ['Team', draft.team],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="d-flex justify-content-between align-items-start gap-3"
                  >
                    <span className="text-body-secondary">{label}</span>
                    <span className="text-end text-break">{value || '-'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </CCardBody>
  </CCard>
)

export const SalaryAssignmentPayComponentsCard = ({
  componentRows,
  formatCurrency,
  handleAddAllowanceRow,
  handleDeleteAllowanceRow,
  handlePayComponentUpdate,
  isReadOnly,
  statutoryRatesFeatureEnabled,
}) => (
  <CCard>
    <CCardHeader className="d-flex justify-content-between align-items-center gap-2">
      <span>Pay Package</span>
      {!isReadOnly ? (
        <CreateActionButton label="Add Allowance" onClick={handleAddAllowanceRow} />
      ) : null}
    </CCardHeader>
    <CCardBody>
      <div className="d-md-none d-grid gap-2">
        {componentRows.map((row) => (
          <div key={row.id} className="border rounded-3 bg-body p-3">
            <div className="d-flex justify-content-between align-items-start gap-3">
              <div className="fw-semibold">{row.label}</div>
              {row.deletable && !isReadOnly ? (
                <CButton
                  color="secondary"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteAllowanceRow('allowance', row.id)}
                  title="Delete row"
                  aria-label="Delete row"
                >
                  <Trash2 size={14} />
                </CButton>
              ) : null}
            </div>
            {row.editable && !isReadOnly ? (
              <div className="row g-2 mt-2">
                {row.rowType === 'allowance' ? (
                  <div className="col-12">
                    <CFormLabel htmlFor={`assignment-${row.id}-name`}>Component</CFormLabel>
                    <CFormInput
                      aria-label={`Allowance name for ${row.label || row.id}`}
                      id={`assignment-${row.id}-name`}
                      value={row.name}
                      onChange={(event) =>
                        handlePayComponentUpdate('allowance', row.id, 'name', event.target.value)
                      }
                      placeholder="Allowance name"
                    />
                  </div>
                ) : null}
                <div className="col-12">
                  <CFormLabel htmlFor={`assignment-${row.id}-amount`}>Amount</CFormLabel>
                  <CFormInput
                    id={`assignment-${row.id}-amount`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.amount}
                    onChange={(event) =>
                      handlePayComponentUpdate(
                        row.rowType,
                        row.rowType === 'deduction' ? row.componentKey : row.id,
                        'amount',
                        event.target.value,
                      )
                    }
                  />
                </div>
              </div>
            ) : (
              <div className="mt-2 text-end fw-semibold">
                {row.rowType === 'deduction' || row.id === 'summary-total-deductions'
                  ? `-${formatCurrency(Math.abs(row.amount))}`
                  : formatCurrency(row.amount)}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="d-none d-md-block rounded-3 shadow-sm overflow-hidden bg-body">
        <CTable align="middle" className="mb-0" responsive>
          <CTableHead color="light">
            <CTableRow>
              <CTableHeaderCell className="text-center" style={{ width: 56 }}>
                #
              </CTableHeaderCell>
              <CTableHeaderCell>Component</CTableHeaderCell>
              <CTableHeaderCell className="text-end">Amount</CTableHeaderCell>
              {!isReadOnly && (
                <CTableHeaderCell className="text-end" style={{ width: 120 }}>
                  Actions
                </CTableHeaderCell>
              )}
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {componentRows.map((row, index) => (
              <CTableRow
                key={row.id}
                className={row.rowType === 'summary-net' ? 'table-success' : undefined}
              >
                <CTableDataCell className="text-center text-body-secondary">
                  {index + 1}
                </CTableDataCell>
                <CTableDataCell>
                  {!isReadOnly && row.rowType === 'allowance' ? (
                    <CFormInput
                      aria-label={`Allowance name row ${index + 1}`}
                      value={row.name}
                      onChange={(event) =>
                        handlePayComponentUpdate('allowance', row.id, 'name', event.target.value)
                      }
                      placeholder="Allowance name"
                    />
                  ) : (
                    row.label
                  )}
                </CTableDataCell>
                <CTableDataCell className="text-end">
                  {!isReadOnly && row.editable ? (
                    <div className="d-flex justify-content-end">
                      <div style={{ width: 160 }}>
                        <CFormInput
                          aria-label={`${row.label || row.name || 'Pay component'} amount`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.amount}
                          onChange={(event) =>
                            handlePayComponentUpdate(
                              row.rowType,
                              row.rowType === 'deduction' ? row.componentKey : row.id,
                              'amount',
                              event.target.value,
                            )
                          }
                        />
                      </div>
                    </div>
                  ) : row.rowType === 'deduction' || row.id === 'summary-total-deductions' ? (
                    `-${formatCurrency(Math.abs(row.amount))}`
                  ) : (
                    formatCurrency(row.amount)
                  )}
                </CTableDataCell>
                {!isReadOnly && (
                  <CTableDataCell className="text-end">
                    {row.deletable ? (
                      <CButton
                        color="light"
                        size="sm"
                        onClick={() => handleDeleteAllowanceRow('allowance', row.id)}
                        title="Delete row"
                        aria-label="Delete row"
                      >
                        <Trash2 size={14} />
                      </CButton>
                    ) : null}
                  </CTableDataCell>
                )}
              </CTableRow>
            ))}
          </CTableBody>
        </CTable>
      </div>
      {!statutoryRatesFeatureEnabled && (
        <div className="small text-body-secondary mt-2">
          Statutory rates are unavailable. EPF, PERKESO, and SIP currently use 0.00.
        </div>
      )}
    </CCardBody>
  </CCard>
)

export const SalaryAssignmentRemarksCard = ({
  activeRemarksValue,
  handleRemarksChange,
  isReadOnly,
  remarksHistory,
}) => (
  <CCard>
    <CCardHeader>Remarks</CCardHeader>
    <CCardBody className="d-grid gap-3">
      <CFormTextarea
        id="assignment-notes"
        rows={4}
        value={activeRemarksValue}
        disabled={isReadOnly}
        onChange={(event) => handleRemarksChange(event.target.value)}
        placeholder="Add assignment notes for HR/admin context"
      />
      {remarksHistory.length > 0 ? (
        <div className="d-grid gap-2">
          {remarksHistory.map((remark) => (
            <div key={remark.id} className="small text-body-secondary">
              {remark.updatedAt || remark.createdAt || '-'} by{' '}
              {remark.updatedBy || remark.createdBy || '-'}
            </div>
          ))}
        </div>
      ) : (
        <div className="small text-body-secondary">No remarks added yet.</div>
      )}
    </CCardBody>
  </CCard>
)

export const SalaryAssignmentReviewCard = ({ formatCurrency, formatMonth, reviewSummary }) => (
  <CCard>
    <CCardHeader>Review</CCardHeader>
    <CCardBody>
      <div className="row g-3">
        <div className="col-md-6">
          <div className="border rounded-3 bg-body p-3 h-100">
            <div className="fw-semibold mb-2">Assignment</div>
            <SummaryField label="Staff" value={reviewSummary.staffName} />
            <SummaryField label="Team" value={reviewSummary.team} />
            <SummaryField
              label="Effective month"
              value={formatMonth?.(reviewSummary.effectiveFrom) || reviewSummary.effectiveFrom}
            />
          </div>
        </div>
        <div className="col-md-6">
          <div className="border rounded-3 bg-body p-3 h-100">
            <div className="fw-semibold mb-2">Pay Summary</div>
            <SummaryField label="Basic salary" value={formatCurrency(reviewSummary.basicSalary)} />
            <SummaryField label="Gross salary" value={formatCurrency(reviewSummary.grossSalary)} />
            <SummaryField
              label="Employee deductions"
              value={`-${formatCurrency(Math.abs(reviewSummary.totalEmployeeDeductions))}`}
            />
            <SummaryField label="Net payable" value={formatCurrency(reviewSummary.netPayable)} />
          </div>
        </div>
      </div>
      <div className="border rounded-3 bg-body p-3 mt-3">
        <div className="fw-semibold mb-2">Changed Items</div>
        {reviewSummary.changedRows?.length > 0 ? (
          <div className="d-grid gap-2">
            {reviewSummary.changedRows.map((change) => (
              <PayChangeRow key={change.key} change={change} formatCurrency={formatCurrency} />
            ))}
          </div>
        ) : (
          <div className="small text-body-secondary">No pay component changes from baseline.</div>
        )}
      </div>
      <UnchangedPayRows formatCurrency={formatCurrency} rows={reviewSummary.unchangedRows || []} />
      <div className="border rounded-3 bg-body p-3 mt-3">
        <div className="fw-semibold mb-2">Remarks</div>
        {reviewSummary.remarks.length > 0 ? (
          <div className="d-grid gap-2">
            {reviewSummary.remarks.map((remark) => (
              <div key={remark.id} style={{ whiteSpace: 'pre-wrap' }}>
                {remark.text}
              </div>
            ))}
          </div>
        ) : (
          <div className="small text-body-secondary">No remarks added.</div>
        )}
      </div>
    </CCardBody>
  </CCard>
)

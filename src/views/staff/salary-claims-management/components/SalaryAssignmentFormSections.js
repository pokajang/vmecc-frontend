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
import { Pencil, Trash2 } from 'lucide-react'
import CreateActionButton from 'src/components/CreateActionButton'
import EditControls from 'src/components/EditControls'
import FormActionGroup from 'src/components/FormActionGroup'
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
  <>
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
        <CFormLabel htmlFor="assignment-effective">Effective Month</CFormLabel>
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
            className="d-inline-flex align-items-center justify-content-center rounded-circle border bg-white text-body-secondary fw-semibold"
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
                <div key={label} className="d-flex justify-content-between align-items-start gap-3">
                  <span className="text-body-secondary">{label}</span>
                  <span className="text-end">{value || '-'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )}
  </>
)

export const SalaryAssignmentPayComponentsCard = ({
  componentRows,
  formatCurrency,
  handleAddAllowanceRow,
  handleDeleteAllowanceRow,
  handlePayComponentUpdate,
  isReadOnly,
  onCancelPayComponents,
  onEditPayComponents,
  onOpenEdit,
  onSavePayComponents,
  payComponentsEditMode,
  statutoryRatesFeatureEnabled,
}) => (
  <CCard>
    <CCardHeader className="d-flex justify-content-between align-items-center gap-2">
      <span>Pay Components</span>
      {isReadOnly ? (
        <CButton
          size="sm"
          className="text-primary px-2 py-1 border-0 bg-transparent shadow-none"
          onClick={onOpenEdit}
        >
          <Pencil size={13} className="me-1 align-text-bottom" />
          Edit
        </CButton>
      ) : (
        <div className="d-flex align-items-center gap-2">
          {payComponentsEditMode && (
            <CreateActionButton label="Add Allowance" onClick={handleAddAllowanceRow} />
          )}
          <EditControls
            editMode={false}
            loading={false}
            onEdit={onEditPayComponents}
            onSave={onSavePayComponents}
            onCancel={onCancelPayComponents}
            className={payComponentsEditMode ? 'd-none' : ''}
          />
        </div>
      )}
    </CCardHeader>
    <CCardBody>
      <div className="rounded-3 shadow-sm overflow-hidden bg-white">
        <CTable align="middle" className="mb-0" responsive>
          <CTableHead color="light">
            <CTableRow>
              <CTableHeaderCell className="text-center" style={{ width: 56 }}>
                #
              </CTableHeaderCell>
              <CTableHeaderCell>Component</CTableHeaderCell>
              <CTableHeaderCell className="text-end">Amount</CTableHeaderCell>
              {payComponentsEditMode && (
                <CTableHeaderCell className="text-end" style={{ width: 120 }}>
                  Action
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
                  {payComponentsEditMode && !isReadOnly && row.rowType === 'allowance' ? (
                    <CFormInput
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
                  {payComponentsEditMode && !isReadOnly && row.editable ? (
                    <div className="d-flex justify-content-end">
                      <div style={{ width: 160 }}>
                        <CFormInput
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
                {payComponentsEditMode && !isReadOnly && (
                  <CTableDataCell className="text-end">
                    {row.deletable ? (
                      <div className="d-flex justify-content-end gap-2">
                        <CButton
                          color="light"
                          size="sm"
                          onClick={() => handleDeleteAllowanceRow('allowance', row.id)}
                          title="Delete row"
                          aria-label="Delete row"
                        >
                          <Trash2 size={14} />
                        </CButton>
                      </div>
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
          Statutory rate feature is disabled in this environment. EPF, PERKESO, and SIP are set to
          0.00 until the backend feature is enabled.
        </div>
      )}
      {payComponentsEditMode && !isReadOnly && (
        <FormActionGroup mobileThumb={false} className="mt-3">
          <CButton color="light" onClick={onCancelPayComponents}>
            Cancel
          </CButton>
          <CButton color="primary" onClick={onSavePayComponents}>
            Save
          </CButton>
        </FormActionGroup>
      )}
    </CCardBody>
  </CCard>
)

export const SalaryAssignmentRemarksCard = ({
  activeRemarksValue,
  actorName,
  editingRemarkId,
  formatDateTime,
  handleDraftFieldChange,
  isReadOnly,
  remarksDirty,
  remarksEditMode,
  remarksHistory,
  setEditingRemarkId,
  setRemarksDirty,
  setRemarksDraft,
  setRemarksEditMode,
}) => {
  const resetRemarks = () => {
    setEditingRemarkId('')
    setRemarksDirty(false)
    setRemarksDraft('')
    setRemarksEditMode(false)
  }

  const syncLatestRemark = (nextHistory) => {
    const latest = nextHistory[0] || null
    handleDraftFieldChange('notesHistory', nextHistory)
    handleDraftFieldChange('notes', latest?.text || '')
    handleDraftFieldChange('notesUpdatedAt', latest?.updatedAt || latest?.createdAt || '')
    handleDraftFieldChange('notesUpdatedBy', latest?.updatedBy || latest?.createdBy || '')
  }

  return (
    <CCard>
      <CCardHeader className="d-flex justify-content-between align-items-center gap-2">
        <span>Notes (Optional)</span>
        {!isReadOnly && (
          <CreateActionButton
            label="Add Remarks"
            onClick={() => {
              setEditingRemarkId('')
              setRemarksEditMode(true)
              setRemarksDirty(false)
              setRemarksDraft('')
            }}
          />
        )}
      </CCardHeader>
      <CCardBody>
        {remarksHistory.length > 0 ? (
          <div className="d-grid gap-3">
            {remarksHistory.map((remark) => {
              const remarkDate = remark.updatedAt || remark.createdAt
              const remarkBy = remark.updatedBy || remark.createdBy
              const isEdited = Boolean(remark.updatedAt)
              return (
                <div key={remark.id} className="d-grid gap-1">
                  <div className="d-flex align-items-center justify-content-between gap-2">
                    <div className="small text-body-secondary">
                      {remarkDate ? formatDateTime?.(remarkDate) || remarkDate : '-'} by{' '}
                      {remarkBy || '-'}
                      {isEdited ? ' (edited)' : ''}
                    </div>
                    {!isReadOnly && (
                      <div className="d-flex align-items-center gap-2">
                        <CButton
                          color="light"
                          size="sm"
                          onClick={() => {
                            setEditingRemarkId(remark.id)
                            setRemarksEditMode(true)
                            setRemarksDirty(false)
                            setRemarksDraft(remark.text)
                          }}
                          title="Edit remark"
                          aria-label="Edit remark"
                        >
                          <Pencil size={14} />
                        </CButton>
                        <CButton
                          color="light"
                          size="sm"
                          onClick={() => {
                            syncLatestRemark(
                              remarksHistory.filter((entry) => entry.id !== remark.id),
                            )
                            if (editingRemarkId === remark.id) resetRemarks()
                          }}
                          title="Delete remark"
                          aria-label="Delete remark"
                        >
                          <Trash2 size={14} />
                        </CButton>
                      </div>
                    )}
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{remark.text}</div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="small text-body-secondary">No remarks added yet.</div>
        )}

        {!isReadOnly && (remarksEditMode || remarksDirty) ? (
          <>
            <CFormTextarea
              id="assignment-notes"
              rows={3}
              value={activeRemarksValue}
              onChange={(event) => {
                setRemarksDirty(true)
                setRemarksDraft(event.target.value)
              }}
              placeholder="Add assignment notes for HR/admin context"
            />
            <div className="d-flex justify-content-end gap-2 mt-2">
              <CButton color="light" size="sm" onClick={resetRemarks}>
                Cancel Remarks
              </CButton>
              <CButton
                color="primary"
                size="sm"
                onClick={() => {
                  const nextText = String(activeRemarksValue || '').trim()
                  if (!nextText) return
                  const nowIso = new Date().toISOString()
                  const actor = actorName || 'System user'
                  const nextHistory = editingRemarkId
                    ? remarksHistory.map((entry) =>
                        entry.id === editingRemarkId
                          ? { ...entry, text: nextText, updatedAt: nowIso, updatedBy: actor }
                          : entry,
                      )
                    : [
                        {
                          id: `remark-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                          text: nextText,
                          createdAt: nowIso,
                          createdBy: actor,
                          updatedAt: '',
                          updatedBy: '',
                        },
                        ...remarksHistory,
                      ]
                  syncLatestRemark(nextHistory)
                  resetRemarks()
                }}
                disabled={!String(activeRemarksValue || '').trim()}
              >
                Save Remarks
              </CButton>
            </div>
          </>
        ) : null}
      </CCardBody>
    </CCard>
  )
}

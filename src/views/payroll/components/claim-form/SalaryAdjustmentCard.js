import React from 'react'
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CRow,
} from '@coreui/react'
import { ADJUSTMENT_DIRECTION_OPTIONS } from './utils/salaryClaimUtils'
import { PAYROLL_ATTACHMENT_ACCEPT, PAYROLL_ATTACHMENT_MAX_SIZE_MB } from './utils/claimFormUtils'

const SalaryAdjustmentCard = ({
  draftItem,
  editingIndex,
  adjustmentFormRef,
  adjustmentDateInputRef,
  onUpdateDraftItem,
  onAttachmentChange,
  onClearAttachment,
  onSave,
  onCancelEdit,
  onCancelAdd,
}) => (
  <CCard ref={adjustmentFormRef}>
    <CCardHeader className="d-flex justify-content-between align-items-center gap-2">
      <div className="d-flex align-items-center gap-2">
        <span>Adjustment Form</span>
        {editingIndex !== null && <CBadge color="info">Edit Mode</CBadge>}
      </div>
      {editingIndex !== null && (
        <CButton color="light" size="sm" onClick={onCancelEdit}>
          Cancel edit
        </CButton>
      )}
    </CCardHeader>
    <CCardBody>
      <CRow className="g-3">
        <CCol xs={12}>
          <CFormLabel className="mb-2">Choose Adjustment Type</CFormLabel>
          <CRow className="g-3">
            {ADJUSTMENT_DIRECTION_OPTIONS.map((direction) => {
              const isSelected = draftItem.claimType === direction
              return (
                <CCol xs={12} md={6} key={direction}>
                  <CCard
                    className={`h-100 border ${
                      isSelected ? 'border-primary bg-primary bg-opacity-10' : 'border-light-subtle'
                    }`}
                    role="button"
                    onClick={() => onUpdateDraftItem({ claimType: direction })}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        onUpdateDraftItem({ claimType: direction })
                      }
                    }}
                    tabIndex={0}
                    style={{ cursor: 'pointer' }}
                  >
                    <CCardBody className="py-3 px-3 d-flex align-items-center">
                      <span className="fw-semibold">{direction}</span>
                    </CCardBody>
                  </CCard>
                </CCol>
              )
            })}
          </CRow>
        </CCol>

        <CCol md={6}>
          <CFormLabel htmlFor="salary-claim-date">Adjustment Date</CFormLabel>
          <CFormInput
            id="salary-claim-date"
            type="date"
            value={draftItem.claimDate}
            ref={adjustmentDateInputRef}
            onChange={(e) => onUpdateDraftItem({ claimDate: e.target.value })}
          />
        </CCol>
        <CCol md={6}>
          <CFormLabel htmlFor="salary-amount">Amount (MYR)</CFormLabel>
          <CFormInput
            id="salary-amount"
            type="number"
            min="0"
            step="0.01"
            value={draftItem.amount}
            onChange={(e) => onUpdateDraftItem({ amount: e.target.value })}
          />
        </CCol>

        <CCol md={6}>
          <CFormLabel htmlFor="salary-line-notes">Remarks</CFormLabel>
          <CFormTextarea
            id="salary-line-notes"
            rows={2}
            placeholder="Describe why this is an addition or deduction"
            value={draftItem.lineNotes}
            onChange={(e) => onUpdateDraftItem({ lineNotes: e.target.value })}
          />
        </CCol>
        <CCol md={6}>
          <CFormLabel htmlFor="salary-attachment">Supporting Attachment (Optional)</CFormLabel>
          <CFormInput
            id="salary-attachment"
            type="file"
            accept={PAYROLL_ATTACHMENT_ACCEPT}
            onChange={(e) => onAttachmentChange(e.target.files?.[0] || null)}
          />
          <div className="small text-body-secondary mt-1">
            {draftItem.attachmentName
              ? `Attached: ${draftItem.attachmentName}${
                  draftItem.attachmentUploadState === 'uploading'
                    ? ' (Uploading...)'
                    : draftItem.attachmentUploadState === 'failed' || draftItem.needsReattach
                      ? ' (Reattach required)'
                      : ''
                }`
              : `Attach memo, statement, or other supporting document if available. Accepted: PDF, JPG, JPEG, PNG up to ${PAYROLL_ATTACHMENT_MAX_SIZE_MB} MB.`}
          </div>
          {draftItem.attachmentError ? (
            <div className="small text-danger mt-1">{draftItem.attachmentError}</div>
          ) : null}
          {draftItem.attachmentName && (
            <div className="mt-2">
              <CButton color="light" size="sm" type="button" onClick={onClearAttachment}>
                Remove attachment
              </CButton>
            </div>
          )}
        </CCol>
      </CRow>

      <div className="d-flex flex-column flex-md-row justify-content-end gap-2 mt-4">
        {editingIndex !== null && (
          <CButton color="light" onClick={onCancelEdit}>
            Cancel edit
          </CButton>
        )}
        {editingIndex === null && (
          <CButton color="light" onClick={onCancelAdd}>
            Cancel add item
          </CButton>
        )}
        <CButton color="primary" onClick={onSave}>
          {editingIndex !== null ? 'Update Item' : 'Save Item'}
        </CButton>
      </div>
    </CCardBody>
  </CCard>
)

export default SalaryAdjustmentCard

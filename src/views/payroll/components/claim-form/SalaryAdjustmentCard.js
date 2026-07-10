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
        <span>Adjustment form</span>
        {editingIndex !== null && <CBadge color="info">Edit mode</CBadge>}
      </div>
      {editingIndex !== null && (
        <CButton color="secondary" variant="outline" size="sm" onClick={onCancelEdit}>
          Cancel edit
        </CButton>
      )}
    </CCardHeader>
    <CCardBody>
      <CRow className="g-3">
        <CCol xs={12} as="fieldset" className="border-0 m-0 p-0">
          <legend className="form-label mb-2">Choose adjustment type</legend>
          <CRow className="g-3">
            {ADJUSTMENT_DIRECTION_OPTIONS.map((direction) => {
              const isSelected = draftItem.claimType === direction
              return (
                <CCol xs={12} md={6} key={direction}>
                  <CCard
                    className={`h-100 border ${
                      isSelected ? 'border-primary bg-primary bg-opacity-10' : 'border-light-subtle'
                    }`}
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={direction}
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
          <CFormLabel htmlFor="salary-claim-date">Adjustment date</CFormLabel>
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
        <CCol md={6} data-testid="payroll-claim-attachments">
          <CFormLabel htmlFor="salary-attachment">Supporting attachment (optional)</CFormLabel>
          <CFormInput
            id="salary-attachment"
            type="file"
            invalid={Boolean(draftItem.attachmentError)}
            aria-describedby={
              draftItem.attachmentError ? 'salary-attachment-error' : 'salary-attachment-help'
            }
            accept={PAYROLL_ATTACHMENT_ACCEPT}
            onChange={(e) => onAttachmentChange(e.target.files?.[0] || null)}
          />
          <div id="salary-attachment-help" className="small text-body-secondary mt-1">
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
            <div id="salary-attachment-error" className="small text-danger mt-1">
              {draftItem.attachmentError}
            </div>
          ) : null}
          {draftItem.attachmentName && (
            <div className="mt-2">
              <CButton
                color="secondary"
                variant="outline"
                size="sm"
                type="button"
                onClick={onClearAttachment}
              >
                Remove attachment
              </CButton>
            </div>
          )}
        </CCol>
      </CRow>

      <div className="d-flex flex-column flex-md-row justify-content-end gap-2 mt-4">
        {editingIndex !== null && (
          <CButton color="secondary" variant="outline" onClick={onCancelEdit}>
            Cancel edit
          </CButton>
        )}
        {editingIndex === null && (
          <CButton color="secondary" variant="outline" onClick={onCancelAdd}>
            Cancel add item
          </CButton>
        )}
        <CButton color="primary" onClick={onSave}>
          {editingIndex !== null ? 'Update item' : 'Save item'}
        </CButton>
      </div>
    </CCardBody>
  </CCard>
)

export default SalaryAdjustmentCard

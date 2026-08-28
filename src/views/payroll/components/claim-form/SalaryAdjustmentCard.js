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
import MobileChoiceList from 'src/components/report-workflow/MobileChoiceList'
import WorkflowAttachmentField from 'src/components/report-workflow/WorkflowAttachmentField'

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
  <CCard ref={adjustmentFormRef} className="salary-adjustment-editor">
    <CCardHeader className="d-flex align-items-center gap-2 border-bottom-0 bg-transparent pb-0">
      <div className="d-flex align-items-center gap-2">
        <span>Adjustment form</span>
        {editingIndex !== null && <CBadge color="info">Edit mode</CBadge>}
      </div>
    </CCardHeader>
    <CCardBody>
      <CRow className="g-3">
        <CCol xs={12} as="fieldset" className="border-0 m-0 p-0">
          <legend className="form-label mb-2">Choose adjustment type</legend>
          <MobileChoiceList
            className="salary-adjustment-direction"
            options={ADJUSTMENT_DIRECTION_OPTIONS.map((direction) => ({
              value: direction,
              title: direction,
            }))}
            value={draftItem.claimType}
            onChange={(direction) => onUpdateDraftItem({ claimType: direction })}
            ariaLabel="Choose adjustment type"
            testIdPrefix="salary-adjustment-type"
            showDescriptions={false}
          />
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
          <WorkflowAttachmentField
            id="salary-attachment"
            label="Supporting attachment"
            accept={PAYROLL_ATTACHMENT_ACCEPT}
            onFileSelect={onAttachmentChange}
            error={draftItem.attachmentError}
            guidance={`Attach a memo, statement, or supporting document if available. PDF, JPG, JPEG, or PNG up to ${PAYROLL_ATTACHMENT_MAX_SIZE_MB} MB.`}
            statusLabel={
              draftItem.attachmentUploadState === 'uploading'
                ? 'Uploading'
                : draftItem.attachmentUploadState === 'failed' || draftItem.needsReattach
                  ? 'Reattach required'
                  : draftItem.attachmentName
                    ? 'Attachment ready'
                    : ''
            }
            statusDetail={
              draftItem.attachmentName ? 'The document is linked to this adjustment.' : ''
            }
            statusTone={
              draftItem.attachmentUploadState === 'failed' || draftItem.needsReattach
                ? 'danger'
                : draftItem.attachmentUploadState === 'uploading'
                  ? 'warning'
                  : draftItem.attachmentName
                    ? 'success'
                    : 'muted'
            }
            hasAttachment={Boolean(draftItem.attachmentName)}
            onRemove={onClearAttachment}
          />
        </CCol>
      </CRow>

      <div className="salary-adjustment-editor__actions d-flex flex-column flex-md-row justify-content-end gap-2 mt-4">
        <CButton
          color="primary"
          className="salary-adjustment-editor__primary-action"
          onClick={onSave}
        >
          {editingIndex !== null ? 'Update item' : 'Save item'}
        </CButton>
        {editingIndex !== null && (
          <CButton
            color="secondary"
            variant="outline"
            className="salary-adjustment-editor__secondary-action"
            onClick={onCancelEdit}
          >
            Cancel edit
          </CButton>
        )}
        {editingIndex === null && (
          <CButton
            color="secondary"
            variant="outline"
            className="salary-adjustment-editor__secondary-action"
            onClick={onCancelAdd}
          >
            Cancel add item
          </CButton>
        )}
      </div>
    </CCardBody>
  </CCard>
)

export default SalaryAdjustmentCard
